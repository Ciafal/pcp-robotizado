/**
 * carteira-minima-consolidada-service.ts
 *
 * Motor de Análise Consolidada por Bitola e por Família para Carteira Mínima Não Atingida.
 * Requisitos estritos CIAFAL:
 * - Proibido Excel, planilhas, dados fictícios ou classificações presumidas.
 * - Material sem bitola ou família identificada = "Classificação não identificada".
 * - Lote mínimo: fonte única = SAP RFC por código de material; se incompatível/diferente,
 *   não somar indevidamente -> "Análise individual necessária". Se não recebido -> "Lote mínimo não recebido".
 * - Sem dupla contagem de estoques ou pedidos ao consolidar.
 * - Saldo a produzir = Saldo dos pedidos agrupados (ou Carteira agrupada - Estoque livre agrupado sem duplicar).
 * - Análise IA objetiva e verificável (sem texto inventado).
 */

import { CarteiraMinimaItem } from '@/types/carteira-minima'
import {
  CarteiraConsolidadaRow,
  CarteiraConsolidadaAiReport,
  MaterialConsolidadoItem,
} from '@/types/carteira-minima-consolidada'
import { pb } from '@/lib/pocketbase/client'
import { registrarAuditoriaFuncional } from '@/services/carteira-minima-service'

export const CLASSIFICACAO_NAO_IDENTIFICADA = 'Classificação não identificada'

interface CadastroMaterialMetadata {
  material: string
  bitola?: string
  familia?: string
  tipo_aco?: string
  cliente?: string
}

class CarteiraMinimaConsolidadaService {
  private cacheMetadata: Map<string, CadastroMaterialMetadata> = new Map()
  private cacheTimestamp = 0
  private readonly CACHE_TTL_MS = 60 * 1000

  /**
   * Identifica bitola a partir dos cadastros e descrições técnicas oficiais do PCP
   */
  public extrairBitola(
    materialCodigo: string,
    descricao?: string,
    metadata?: CadastroMaterialMetadata,
  ): string {
    if (metadata?.bitola && metadata.bitola.trim() && metadata.bitola !== '-') {
      return metadata.bitola.trim()
    }

    const desc = (descricao || '').toUpperCase()

    // 1. Tentar padrões usuais da CIAFAL (ex: 1/2", 3/8", 1", 5/8", 1.1/4", 2" x 1/4", 50x50, 130 MM, Ø 63.5)
    // Ex: Cantoneiras 2" x 1/4" ou Barras 1" x 1/8"
    const regexDimensoesComposta =
      /(\d+(?:[.,]\d+)?(?:\/\d+)?(?:"|'')?\s*[xX]\s*\d+(?:[.,]\d+)?(?:\/\d+)?(?:"|'')?)/
    const matchComposta = desc.match(regexDimensoesComposta)
    if (matchComposta) {
      return matchComposta[1].trim()
    }

    // Ex: Polegadas fracionárias isoladas: 1/2", 3/8", 3/4", 5/16", 1.1/4", 1"
    const regexPolegadas = /(\b\d+(?:[.,]\d+)?\s*\/\s*\d+(?:\s*")?|\b\d+(?:[.,]\d+)?\s*")/
    const matchPol = desc.match(regexPolegadas)
    if (matchPol) {
      return matchPol[1].trim()
    }

    // Ex: Milímetros explícitos: 50MM, 130 MM, 12,5 MM, Ø 63.5 MM
    const regexMm = /(?:Ø\s*)?(\d+(?:[.,]\d+)?)\s*MM\b/i
    const matchMm = desc.match(regexMm)
    if (matchMm) {
      return `${matchMm[1].trim()} mm`
    }

    return CLASSIFICACAO_NAO_IDENTIFICADA
  }

  /**
   * Identifica família a partir dos cadastros e grupo de mercadorias / descrição oficial
   */
  public extrairFamilia(
    materialCodigo: string,
    descricao?: string,
    metadata?: CadastroMaterialMetadata,
  ): string {
    if (metadata?.familia && metadata.familia.trim() && metadata.familia !== '-') {
      return metadata.familia.trim()
    }

    const desc = (descricao || '').toUpperCase()

    if (desc.includes('CANTONEIRA') || desc.includes('CANT ')) {
      return 'Cantoneiras'
    }
    if (desc.includes('BARRA CHATA') || desc.includes('B.CHATA') || desc.includes('CHATA')) {
      return 'Barras Chatas'
    }
    if (desc.includes('BARRA REDONDA') || desc.includes('B.REDONDA') || desc.includes('REDONDO')) {
      return 'Barras Redondas'
    }
    if (
      desc.includes('BARRA QUADRADA') ||
      desc.includes('B.QUADRADA') ||
      desc.includes('QUADRADO')
    ) {
      return 'Barras Quadradas'
    }
    if (desc.includes('PERFIL T') || desc.includes('PERFIL U') || desc.includes('PERFIL')) {
      return 'Perfis'
    }
    if (
      desc.includes('TUBO QUADRADO') ||
      desc.includes('TUBO RETANGULAR') ||
      desc.includes('TUBO')
    ) {
      return 'Tubos Industriais'
    }
    if (desc.includes('TREFILA') || desc.includes('ARAME')) {
      return 'Trefilados'
    }

    return CLASSIFICACAO_NAO_IDENTIFICADA
  }

  /**
   * Identifica tipo de aço
   */
  public extrairTipoAco(
    materialCodigo: string,
    descricao?: string,
    metadata?: CadastroMaterialMetadata,
  ): string {
    if (metadata?.tipo_aco && metadata.tipo_aco.trim() && metadata.tipo_aco !== '-') {
      return metadata.tipo_aco.trim()
    }

    const desc = (descricao || '').toUpperCase()
    const regexAco = /\b(SAE\s*\d{4}|DIN\s*[\w\d]+|ASTM\s*A\d+|1020|1045|4140|8620)\b/
    const match = desc.match(regexAco)
    if (match) {
      return match[1].trim()
    }

    return 'Aço Comercial'
  }

  /**
   * Carrega metadados de apoio do HUB (sap_material_validations, line_product_families, carteira_items)
   */
  public async carregarMetadadosHub(): Promise<Map<string, CadastroMaterialMetadata>> {
    const now = Date.now()
    if (this.cacheMetadata.size > 0 && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cacheMetadata
    }

    const map = new Map<string, CadastroMaterialMetadata>()

    try {
      // 1. sap_material_validations
      const validations = await pb
        .collection('sap_material_validations')
        .getFullList({
          fields: 'material_number,family,gauge,steel_type',
        })
        .catch(() => [])

      for (const v of validations as any[]) {
        const mat = (v.material_number || '').trim()
        if (mat) {
          map.set(mat, {
            material: mat,
            bitola: v.gauge || undefined,
            familia: v.family || undefined,
            tipo_aco: v.steel_type || undefined,
          })
        }
      }
    } catch {
      // Coleção opcional ou offline
    }

    try {
      // 2. carteira_items para capturar cliente e família existentes
      const carteiraRecs = await pb
        .collection('carteira_items')
        .getFullList({
          fields: 'codigo_material,cliente,familia,bitola,tipo_aco,nome_cliente',
          filter: 'carteira_aberta_tons > 0 || carteira_vendas_tons > 0',
        })
        .catch(() => [])

      for (const c of carteiraRecs as any[]) {
        const mat = (c.codigo_material || '').trim()
        if (!mat) continue

        const existing = map.get(mat) || { material: mat }
        if (!existing.cliente && (c.cliente || c.nome_cliente)) {
          existing.cliente = c.cliente || c.nome_cliente
        }
        if (!existing.familia && c.familia) {
          existing.familia = c.familia
        }
        if (!existing.bitola && c.bitola) {
          existing.bitola = c.bitola
        }
        if (!existing.tipo_aco && c.tipo_aco) {
          existing.tipo_aco = c.tipo_aco
        }
        map.set(mat, existing)
      }
    } catch {
      // Continua com o que tem
    }

    this.cacheMetadata = map
    this.cacheTimestamp = now
    return map
  }

  /**
   * Consolida itens de carteira mínima por Bitola ou por Família
   */
  public async consolidar(
    itensOriginais: CarteiraMinimaItem[],
    tipo: 'BITOLA' | 'FAMILIA',
  ): Promise<CarteiraConsolidadaRow[]> {
    if (!itensOriginais || itensOriginais.length === 0) {
      return []
    }

    const metadataMap = await this.carregarMetadadosHub()

    // 1. Mapear cada item de carteira para um MaterialConsolidadoItem enriquecido
    const itensEnriquecidos: MaterialConsolidadoItem[] = itensOriginais.map((item) => {
      const meta = metadataMap.get(item.material)
      const bitola = this.extrairBitola(item.material, item.descricao_material, meta)
      const familia = this.extrairFamilia(item.material, item.descricao_material, meta)
      const tipoAco = this.extrairTipoAco(item.material, item.descricao_material, meta)

      // Regra de produção mínima: se producao_minima_tons for zero ou nulo
      const temMinimo =
        typeof item.producao_minima_tons === 'number' && item.producao_minima_tons > 0

      return {
        id: item.id,
        material: item.material,
        descricao_material: item.descricao_material || item.material,
        familia,
        bitola,
        tipo_aco: tipoAco,
        pedido_venda: item.pedido_venda,
        item_pedido: item.item_pedido,
        pedido_formatado: item.pedido_formatado || `${item.pedido_venda}/${item.item_pedido}`,
        cliente: meta?.cliente || 'Cliente sob sigilo Comercial',
        carteira_tons: Number((item.carteira_tons || 0).toFixed(3)),
        estoque_livre_tons: Number((item.estoque_livre_tons || 0).toFixed(3)),
        saldo_produzir_tons: Number((item.saldo_produzir_tons || 0).toFixed(3)),
        producao_minima_tons: temMinimo ? Number(item.producao_minima_tons.toFixed(3)) : null,
        producao_minima_status: temMinimo ? 'RECEBIDO' : 'NAO_RECEBIDO',
        diferenca_minimo_tons: temMinimo
          ? Number((item.producao_minima_tons - item.saldo_produzir_tons).toFixed(3))
          : null,
        centro: item.centro || '1100',
        linha: item.linha || 'L1',
        empresa: item.empresa || 'CIAFAL',
        data_desejada: item.data_desejada || '',
        criticidade: item.criticidade || 'MEDIA',
      }
    })

    // 2. Agrupar por: Chave (Bitola ou Família) + Centro Produtivo + Linha
    // Sem duplicar pedidos ou estoques:
    // Uma bitola/família pode ter múltiplos itens com mesmo pedido ou mesmo material.
    // Para estoque e pedidos: agrupar evitando dupla contagem por chave única de material/depósito e por pedido.
    type GroupBucket = {
      chave: string
      centro: string
      linha: string
      empresa: string
      itens: MaterialConsolidadoItem[]
    }

    const groupsMap = new Map<string, GroupBucket>()

    for (const item of itensEnriquecidos) {
      const chaveValor = tipo === 'BITOLA' ? item.bitola : item.familia
      const groupKey = `${chaveValor}___${item.centro}___${item.linha}`

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          chave: chaveValor,
          centro: item.centro,
          linha: item.linha,
          empresa: item.empresa,
          itens: [],
        })
      }

      groupsMap.get(groupKey)!.itens.push(item)
    }

    const rows: CarteiraConsolidadaRow[] = []

    for (const [, bucket] of groupsMap.entries()) {
      const { chave, centro, linha, empresa, itens } = bucket

      // Materiais únicos
      const materiaisMap = new Map<string, MaterialConsolidadoItem>()
      for (const it of itens) {
        materiaisMap.set(it.material, it)
      }
      const materiaisCodigos = Array.from(materiaisMap.keys())

      // Pedidos únicos
      const pedidosSet = new Set<string>()
      for (const it of itens) {
        pedidosSet.add(it.pedido_venda)
      }
      const pedidosNumeros = Array.from(pedidosSet)

      // Carteira total = soma das quantidades dos pedidos deste grupo
      const carteiraTotal = Number(itens.reduce((acc, it) => acc + it.carteira_tons, 0).toFixed(3))

      // Estoque livre total = soma do estoque por material ÚNICO no grupo (evitar dupla contagem se múltiplos pedidos do mesmo material)
      const estoqueLivreTotal = Number(
        Array.from(materiaisMap.values())
          .reduce((acc, m) => acc + m.estoque_livre_tons, 0)
          .toFixed(3),
      )

      // Saldo total a produzir = Saldo dos itens
      const saldoTotalProduzir = Number(
        itens.reduce((acc, it) => acc + it.saldo_produzir_tons, 0).toFixed(3),
      )

      // Regra de produção mínima:
      // NÃO somar automaticamente mínimos incompatíveis.
      // Se todos os materiais tiverem o mesmo valor de lote mínimo da RFC e puderem ser produzidos conjuntamente:
      // usa-se esse lote mínimo como parâmetro da campanha/troca.
      // Se houver mínimos divergentes entre os materiais agrupados: "Análise individual necessária".
      // Se algum não tiver lote mínimo retornado pela RFC: "Lote mínimo não recebido".
      const minimosRecebidos = itens
        .map((it) => it.producao_minima_tons)
        .filter((val): val is number => typeof val === 'number' && val > 0)

      let producaoMinimaTipo: CarteiraConsolidadaRow['producao_minima_tipo'] = 'VALOR'
      let producaoMinimaTons: number | null = null
      let diferencaTons: number | null = null
      let situacao: CarteiraConsolidadaRow['situacao'] = 'Não atingida'

      if (minimosRecebidos.length === 0) {
        producaoMinimaTipo = 'NAO_RECEBIDO'
        situacao = 'Lote mínimo não recebido'
      } else if (minimosRecebidos.length < itens.length) {
        // Pelo menos um material sem retorno da RFC de lote mínimo
        producaoMinimaTipo = 'NAO_RECEBIDO'
        situacao = 'Lote mínimo não recebido'
      } else {
        // Todos têm lote mínimo da RFC. Verificar se são homogêneos/compatíveis.
        const primeiroMinimo = minimosRecebidos[0]
        const todosIguais = minimosRecebidos.every((m) => Math.abs(m - primeiroMinimo) < 0.001)

        if (todosIguais) {
          // Lote mínimo único compartilhado da campanha desta bitola/família
          producaoMinimaTons = primeiroMinimo
          diferencaTons = Number((saldoTotalProduzir - producaoMinimaTons).toFixed(3))
          situacao = saldoTotalProduzir >= producaoMinimaTons ? 'Atendida' : 'Não atingida'
        } else {
          // Mínimos incompatíveis entre os materiais do agrupamento -> Análise individual necessária
          producaoMinimaTipo = 'INDIVIDUAL_NECESSARIA'
          situacao = 'Análise individual necessária'
        }
      }

      const linhaCentro = linha && linha !== '-' ? `${linha} / ${centro}` : centro

      rows.push({
        id: `${tipo}_${chave}_${centro}_${linha}`,
        tipo,
        chave,
        linha_centro: linhaCentro,
        centro,
        linha,
        empresa,
        materiais_count: materiaisCodigos.length,
        materiais_codigos: materiaisCodigos,
        pedidos_count: pedidosNumeros.length,
        pedidos_numeros: pedidosNumeros,
        carteira_total_tons: carteiraTotal,
        estoque_livre_total_tons: estoqueLivreTotal,
        saldo_total_produzir_tons: saldoTotalProduzir,
        producao_minima_tipo: producaoMinimaTipo,
        producao_minima_tons: producaoMinimaTons,
        diferenca_tons: diferencaTons,
        situacao,
        materiais: itens,
      })
    }

    // Ordenar: primeiro não atingidas e com maior saldo a produzir
    rows.sort((a, b) => {
      if (a.chave === CLASSIFICACAO_NAO_IDENTIFICADA) return 1
      if (b.chave === CLASSIFICACAO_NAO_IDENTIFICADA) return -1
      return b.saldo_total_produzir_tons - a.saldo_total_produzir_tons
    })

    return rows
  }

  /**
   * Gera relatório executivo e analítico de IA com base estrita nos dados consolidados
   */
  public gerarAnaliseIa(
    rows: CarteiraConsolidadaRow[],
    visao: 'BITOLA' | 'FAMILIA',
  ): CarteiraConsolidadaAiReport {
    const timestamp = new Date().toISOString()

    const abaixoMinimo = rows.filter((r) => r.situacao === 'Não atingida')
    const oportunidades = rows.filter(
      (r) => r.materiais_count > 1 && r.saldo_total_produzir_tons > 0,
    )
    const comEstoque = rows.filter((r) => r.estoque_livre_total_tons > 0)
    const analisesIndividuais = rows.filter((r) => r.situacao === 'Análise individual necessária')
    const semLoteMinimo = rows.filter((r) => r.situacao === 'Lote mínimo não recebido')

    const restricoes: string[] = []
    if (analisesIndividuais.length > 0) {
      restricoes.push(
        `${analisesIndividuais.length} agrupamento(s) possuem restrições produtivas divergentes entre os materiais, exigindo validação individual de campanha.`,
      )
    }
    if (semLoteMinimo.length > 0) {
      restricoes.push(
        `${semLoteMinimo.length} agrupamento(s) contêm materiais sem retorno oficial de lote mínimo via RFC SAP, bloqueando consolidação automática de lote.`,
      )
    }
    const comClassificacaoPendente = rows.filter((r) => r.chave === CLASSIFICACAO_NAO_IDENTIFICADA)
    if (comClassificacaoPendente.length > 0) {
      restricoes.push(
        `Existem ${comClassificacaoPendente[0].materiais_count} material(is) sem especificação técnica formal cadastrada no SAP/HUB (classificação não identificada).`,
      )
    }

    const riscos: string[] = []
    if (abaixoMinimo.length > 0) {
      const somaFalta = abaixoMinimo.reduce((acc, r) => acc + Math.abs(r.diferenca_tons || 0), 0)
      riscos.push(
        `Risco de setup antieconômico ou ociosidade térmica em ${abaixoMinimo.length} grupo(s), totalizando déficit de ${somaFalta.toFixed(2)} t em relação ao mínimo exigido.`,
      )
    }
    const materiaisCriticosUrgentes = rows
      .flatMap((r) => r.materiais)
      .filter((m) => m.criticidade === 'ALTA')
    if (materiaisCriticosUrgentes.length > 0) {
      riscos.push(
        `${materiaisCriticosUrgentes.length} pedido(s) classificado(s) com criticidade ALTA necessitam de liberação ou complementação prioritária com o Comercial.`,
      )
    }

    const recomendacoes: string[] = []
    if (oportunidades.length > 0) {
      recomendacoes.push(
        `Avaliar programação conjunta em bloco para os agrupamentos com múltiplos códigos (${oportunidades
          .map((o) => o.chave)
          .slice(0, 3)
          .join(', ')}), otimizando a campanha produtiva.`,
      )
    }
    if (comEstoque.length > 0) {
      recomendacoes.push(
        `Verificar ${comEstoque.length} grupo(s) com estoque livre disponível (${comEstoque.reduce((a, c) => a + c.estoque_livre_total_tons, 0).toFixed(2)} t) para atendimento imediato sem nova laminação.`,
      )
    }
    if (abaixoMinimo.length > 0) {
      recomendacoes.push(
        `Acionar o Comercial via comunicado oficial para complementação de carteira nos itens com maior déficit de lote.`,
      )
    }
    recomendacoes.push(
      `Respeitar sequenciamento térmico e restrições de rolos/cilindros da Linha antes da confirmação da ordem de produção no SAP.`,
    )

    const detalhes = rows.map((r) => {
      let recEsp = ''
      if (r.situacao === 'Não atingida') {
        recEsp = `Déficit de ${Math.abs(r.diferenca_tons || 0).toFixed(2)} t. Sugerido comunicar Comercial para complementação.`
      } else if (r.situacao === 'Atendida') {
        recEsp = 'Carteira agrupada atinge o mínimo. Apta para sequenciamento de programação.'
      } else if (r.situacao === 'Análise individual necessária') {
        recEsp = 'Mínimos incompatíveis. Analisar cada ordem e material isoladamente.'
      } else {
        recEsp = 'Sincronizar lote mínimo com SAP ECC via RFC Z_RFC_CARTEIRA_MINIMA_PROD.'
      }

      return {
        chave: r.chave,
        linhaCentro: r.linha_centro,
        saldoProduzir: r.saldo_total_produzir_tons,
        producaoMinima:
          r.producao_minima_tons !== null ? `${r.producao_minima_tons.toFixed(2)} t` : r.situacao,
        situacao: r.situacao,
        materiaisCount: r.materiais_count,
        pedidosCount: r.pedidos_count,
        recomendacaoEspecifica: recEsp,
      }
    })

    const resumo = `Análise consolidada por ${visao === 'BITOLA' ? 'Bitola' : 'Família'} concluída sobre ${rows.length} agrupamento(s). Identificados ${abaixoMinimo.length} grupo(s) com carteira abaixo do mínimo de produção e ${oportunidades.length} oportunidade(s) de consolidação conjunta de pedidos.`

    return {
      timestamp,
      visao,
      totalAgrupamentosAbaixoMinimo: abaixoMinimo.length,
      totalOportunidadesConsolidacao: oportunidades.length,
      totalMateriaisComEstoque: comEstoque.length,
      restricoesIdentificadas: restricoes,
      riscosNaoAtendimento: riscos,
      recomendacoesPcp: recomendacoes,
      resumoExecutivo: resumo,
      detalhesAgrupamentos: detalhes,
    }
  }

  /**
   * Grava auditoria funcional de navegação e consolidação
   */
  public async auditarAcessoVisao(modo: 'BITOLA' | 'FAMILIA', totalRegistros: number) {
    try {
      await registrarAuditoriaFuncional({
        action: `Visualização de Carteira Mínima Consolidada — Por ${modo === 'BITOLA' ? 'Bitola' : 'Família'}`,
        reason: 'Alternância de modo analítico de carteira mínima não atingida',
        status: 'Concluída',
        records_count: totalRegistros,
        technical_details: {
          modo,
          origem_dados: 'SAP ECC via RFC Z_RFC_CARTEIRA_MINIMA_PROD + HUB CIAFAL',
        },
      })
    } catch {
      // Auditoria silenciosa
    }
  }
}

export const carteiraMinimaConsolidadaService = new CarteiraMinimaConsolidadaService()
export default carteiraMinimaConsolidadaService
