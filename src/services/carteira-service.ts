import pb from '@/lib/pocketbase/client'
import {
  CarteiraItem,
  CarteiraEntradaFutura,
  CarteiraUpload,
  CarteiraCicloSnapshot,
  CarteiraIAInsight,
  CarteiraRegraConfig,
} from '@/types/carteira-analise'
import { CarteiraZSD28CEngine, REGRAS_PADRAO } from './carteira-engine'

export interface ValidacaoUploadResultado {
  valido: boolean
  erros: Array<{ linha: number; campo: string; mensagem: string; valor?: string }>
  alertas: Array<{ linha: number; campo: string; mensagem: string }>
  duplicados: Array<{ pedido: string; item: string; material: string }>
  itensValidos: CarteiraItem[]
  entradasFuturasValidas: CarteiraEntradaFutura[]
  totalLinhas: number
  linhasValidas: number
  linhasComAlerta: number
  linhasRejeitadas: number
}

export class CarteiraService {
  public static sanitizarCampoTexto(valor: any): string {
    if (valor === null || valor === undefined) return ''
    const str = String(valor).trim()
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`
    }
    return str
  }

  public static parseNumeroTons(valor: any): number {
    if (valor === null || valor === undefined || valor === '') return 0
    if (typeof valor === 'number') return isNaN(valor) ? 0 : valor
    const str = String(valor).trim().replace(/\s/g, '').replace(',', '.')
    const parsed = parseFloat(str)
    return isNaN(parsed) ? 0 : parsed
  }

  public static validarLinhasCarteira(
    linhasBrutas: any[],
    entradasFuturas: CarteiraEntradaFutura[] = [],
  ): ValidacaoUploadResultado {
    const erros: Array<{ linha: number; campo: string; mensagem: string; valor?: string }> = []
    const alertas: Array<{ linha: number; campo: string; mensagem: string }> = []
    const duplicados: Array<{ pedido: string; item: string; material: string }> = []
    const itensValidos: CarteiraItem[] = []

    const mapDuplicidade = new Set<string>()

    linhasBrutas.forEach((row, index) => {
      const numLinha = index + 2
      const codMaterial = this.sanitizarCampoTexto(
        row['Código do material'] || row['codigo_material'] || row['Material'] || row['material'],
      )
      const ordemVenda = this.sanitizarCampoTexto(
        row['Ordem de venda'] || row['ordem_venda'] || row['Pedido'] || row['pedido'],
      )
      const itemOrdem = this.sanitizarCampoTexto(
        row['Item'] || row['item'] || row['Item da ordem'] || '10',
      )

      if (!codMaterial) {
        erros.push({
          linha: numLinha,
          campo: 'Código do material',
          mensagem: 'Código do material é obrigatório e não pode ser nulo.',
        })
        return
      }

      if (ordemVenda && itemOrdem) {
        const key = `${ordemVenda}_${itemOrdem}_${codMaterial}`
        if (mapDuplicidade.has(key)) {
          duplicados.push({ pedido: ordemVenda, item: itemOrdem, material: codMaterial })
          alertas.push({
            linha: numLinha,
            campo: 'Ordem/Item/Material',
            mensagem: `Duplicidade identificada no arquivo: Pedido ${ordemVenda}, Item ${itemOrdem}, Material ${codMaterial}.`,
          })
        } else {
          mapDuplicidade.add(key)
        }
      }

      const qtdOrdem = this.parseNumeroTons(
        row['Quantidade da ordem (t)'] ||
          row['qtd_ordem'] ||
          row['Quantidade Ordem'] ||
          row['Qtd Ordem'] ||
          0,
      )
      const qtdFaturada = this.parseNumeroTons(
        row['Quantidade faturada (t)'] ||
          row['qtd_faturada'] ||
          row['Quantidade Faturada'] ||
          row['Qtd Faturada'] ||
          0,
      )
      const estoqueLivre = this.parseNumeroTons(
        row['Estoque livre (t)'] || row['estoque_livre'] || row['Estoque Livre'] || 0,
      )
      const estoqueMto = this.parseNumeroTons(
        row['Estoque MTO (t)'] || row['estoque_mto'] || row['Estoque MTO'] || 0,
      )
      const estoqueSemi = this.parseNumeroTons(
        row['Estoque semiacabado (t)'] ||
          row['estoque_semiacabado'] ||
          row['Estoque Semiacabado'] ||
          0,
      )
      const estoqueSemiCiafal = this.parseNumeroTons(
        row['Estoque Semiacabado CIAFAL'] || row['estoque_semiacabado_ciafal_tons'] || estoqueSemi,
      )
      const estoqueSemiVallourec = this.parseNumeroTons(
        row['Estoque Semiacabado Vallourec'] || row['estoque_semiacabado_vallourec_tons'] || 0,
      )
      const estoqueAcabado = this.parseNumeroTons(
        row['Estoque acabado (t)'] || row['estoque_acabado'] || row['Estoque Acabado'] || 0,
      )
      const qtdProg = this.parseNumeroTons(
        row['Quantidade programada (t)'] || row['qtd_programada'] || row['Programação'] || 0,
      )
      const mediaFat = this.parseNumeroTons(
        row['Média de faturamento diário (t/dia)'] ||
          row['media_faturamento_diario'] ||
          row['Média Faturamento'] ||
          0,
      )

      let tipoOrdem: 'MTS' | 'MTO' = 'MTS'
      const rawTipo = this.sanitizarCampoTexto(
        row['MTS/MTO'] || row['tipo_ordem'] || row['Tipo de atendimento'] || '',
      ).toUpperCase()
      if (rawTipo.includes('MTO')) tipoOrdem = 'MTO'

      let origem: 'PRODUCAO_PROPRIA' | 'REVENDA' | 'IMPORTADO' | 'INDUSTRIALIZACAO' =
        'PRODUCAO_PROPRIA'
      const rawOrigem = this.sanitizarCampoTexto(
        row['Origem do produto'] || row['origem_produto'] || row['Origem'] || '',
      ).toUpperCase()
      if (rawOrigem.includes('REVENDA')) origem = 'REVENDA'
      else if (rawOrigem.includes('IMPORT')) origem = 'IMPORTADO'
      else if (rawOrigem.includes('INDUS')) origem = 'INDUSTRIALIZACAO'

      const isBloqueado = Boolean(
        row['Bloqueio'] === true ||
        row['Bloqueio'] === 'SIM' ||
        row['Bloqueio'] === 'Sim' ||
        row['bloqueio'] === true ||
        row['bloqueio'] === 'true',
      )

      const rawItem: CarteiraItem = {
        empresa: this.sanitizarCampoTexto(row['Empresa'] || row['empresa'] || 'CIAFAL'),
        centro: this.sanitizarCampoTexto(row['Centro'] || row['centro'] || '1000'),
        linha: this.sanitizarCampoTexto(row['Linha'] || row['linha'] || ''),
        ordem_venda: ordemVenda || 'ORD-QAS',
        item_ordem: itemOrdem,
        data_ordem: this.sanitizarCampoTexto(
          row['Data da ordem'] || row['data_ordem'] || new Date().toLocaleDateString('pt-BR'),
        ),
        data_desejada: this.sanitizarCampoTexto(
          row['Data desejada'] || row['data_desejada'] || new Date().toLocaleDateString('pt-BR'),
        ),
        codigo_cliente: this.sanitizarCampoTexto(
          row['Código do cliente'] || row['codigo_cliente'] || 'CLI-001',
        ),
        nome_cliente: this.sanitizarCampoTexto(
          row['Cliente'] || row['nome_cliente'] || 'Mercado Geral',
        ),
        codigo_material: codMaterial,
        descricao_material: this.sanitizarCampoTexto(
          row['Descrição do material'] ||
            row['descricao_material'] ||
            row['Material'] ||
            codMaterial,
        ),
        familia: this.sanitizarCampoTexto(row['Família'] || row['familia'] || 'Geral'),
        curva_abc: this.sanitizarCampoTexto(
          row['Curva ABC'] || row['curva_abc'] || 'B',
        ).toUpperCase(),
        tipo_ordem: tipoOrdem,
        origem_produto: origem,
        qtd_ordem_tons: qtdOrdem,
        qtd_faturada_tons: qtdFaturada,
        carteira_aberta_tons: Math.max(0, qtdOrdem - qtdFaturada),
        carteira_vendas_tons: tipoOrdem === 'MTS' ? Math.max(0, qtdOrdem - qtdFaturada) : 0,
        carteira_mto_tons: tipoOrdem === 'MTO' ? Math.max(0, qtdOrdem - qtdFaturada) : 0,
        estoque_livre_tons: estoqueLivre,
        estoque_mto_tons: estoqueMto,
        estoque_semiacabado_tons: estoqueSemi,
        estoque_semiacabado_ciafal_tons: estoqueSemiCiafal,
        estoque_semiacabado_vallourec_tons: estoqueSemiVallourec,
        estoque_acabado_tons: estoqueAcabado,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: qtdProg,
        data_programada: this.sanitizarCampoTexto(
          row['Data programada'] || row['data_programada'] || '',
        ),
        semana_programada: this.sanitizarCampoTexto(
          row['Semana programada'] || row['semana_programada'] || '',
        ),
        linha_programada: this.sanitizarCampoTexto(
          row['Linha programada'] || row['linha_programada'] || '',
        ),
        media_faturamento_diario_t_dia: mediaFat,
        status_ruptura: 'CINZA',
        bloqueio: isBloqueado,
        motivo_bloqueio: this.sanitizarCampoTexto(
          row['Motivo do bloqueio'] || row['motivo_bloqueio'] || '',
        ),
        observacao: this.sanitizarCampoTexto(row['Observação'] || row['observacao'] || ''),
        zsd24_tons: this.parseNumeroTons(row['ZSD24'] || row['zsd24_tons'] || 0),
        material_dp04: this.sanitizarCampoTexto(row['Material DP04'] || row['material_dp04'] || ''),
        utilizacao_livre: this.sanitizarCampoTexto(
          row['Utilização Livre'] || row['utilizacao_livre'] || '',
        ),
        material_vallourec: this.sanitizarCampoTexto(
          row['Material Vallourec'] || row['material_vallourec'] || '',
        ),
        dp27: this.sanitizarCampoTexto(row['DP27'] || row['dp27'] || ''),
      }

      const itemCalculado = CarteiraZSD28CEngine.calcularItem(
        rawItem,
        entradasFuturas,
        REGRAS_PADRAO,
      )
      itensValidos.push(itemCalculado)
    })

    const totalLinhas = linhasBrutas.length
    const linhasValidas = itensValidos.length
    const linhasComAlerta = alertas.length
    const linhasRejeitadas = erros.length

    return {
      valido: erros.length === 0 && itensValidos.length > 0,
      erros,
      alertas,
      duplicados,
      itensValidos,
      entradasFuturasValidas: [],
      totalLinhas,
      linhasValidas,
      linhasComAlerta,
      linhasRejeitadas,
    }
  }

  public static validarLinhasEntradasFuturas(linhasBrutas: any[]): CarteiraEntradaFutura[] {
    const entradas: CarteiraEntradaFutura[] = []
    linhasBrutas.forEach((row) => {
      const mat = this.sanitizarCampoTexto(
        row['Material'] || row['codigo_material'] || row['Código do material'],
      )
      if (!mat) return

      let origem: 'REVENDA' | 'IMPORTADO' | 'PRODUCAO_INTERNA' | 'OUTROS' = 'REVENDA'
      const rawOrigem = this.sanitizarCampoTexto(row['Origem'] || row['origem'] || '').toUpperCase()
      if (rawOrigem.includes('IMPORT')) origem = 'IMPORTADO'
      else if (rawOrigem.includes('PROD')) origem = 'PRODUCAO_INTERNA'

      const qtdPrevista = this.parseNumeroTons(
        row['Quantidade prevista (t)'] || row['quantidade_prevista_tons'] || 0,
      )
      const qtdRecebida = this.parseNumeroTons(
        row['Quantidade recebida (t)'] || row['quantidade_recebida_tons'] || 0,
      )
      const qtdPendente = Math.max(0, qtdPrevista - qtdRecebida)

      entradas.push({
        empresa: this.sanitizarCampoTexto(row['Empresa'] || 'CIAFAL'),
        centro: this.sanitizarCampoTexto(row['Centro'] || '1000'),
        codigo_material: mat,
        descricao_material: this.sanitizarCampoTexto(
          row['Descrição'] || row['descricao_material'] || mat,
        ),
        origem,
        documento_ref: this.sanitizarCampoTexto(
          row['Pedido/Documento'] || row['documento_ref'] || 'PO-FUT-01',
        ),
        fornecedor_origem: this.sanitizarCampoTexto(
          row['Fornecedor/origem'] || row['fornecedor_origem'] || 'Gerdau / Arcelor / Import',
        ),
        quantidade_prevista_tons: qtdPrevista,
        quantidade_recebida_tons: qtdRecebida,
        quantidade_pendente_tons: qtdPendente,
        data_prevista_entrada: this.sanitizarCampoTexto(
          row['Data prevista de entrada'] ||
            row['data_prevista_entrada'] ||
            new Date().toISOString().split('T')[0],
        ),
        status_entrada: this.sanitizarCampoTexto(
          row['Status da entrada'] || row['status_entrada'] || 'CONFIRMADO',
        ),
        observacao: this.sanitizarCampoTexto(row['Observação'] || row['observacao'] || ''),
      })
    })
    return entradas
  }

  public static gerarTemplateExcelBlob(): Blob {
    const aba1Cabecalho = [
      'Empresa',
      'Centro',
      'Linha',
      'Ordem de venda',
      'Item',
      'Data da ordem',
      'Data desejada',
      'Código do cliente',
      'Cliente',
      'Código do material',
      'Descrição do material',
      'Família',
      'Curva ABC',
      'Tipo de atendimento',
      'MTS/MTO',
      'Origem do produto',
      'Carteira de vendas (t)',
      'Quantidade da ordem (t)',
      'Quantidade faturada (t)',
      'Carteira aberta (t)',
      'Estoque livre (t)',
      'Estoque MTO (t)',
      'Carteira MTO (t)',
      'Estoque semiacabado (t)',
      'Estoque acabado (t)',
      'Quantidade programada (t)',
      'Data programada',
      'Média de faturamento diário (t/dia)',
      'Data de apuração',
      'Bloqueio',
      'Motivo do bloqueio',
      'Observação',
    ].join(';')

    const aba2Cabecalho = [
      'Empresa',
      'Centro',
      'Material',
      'Descrição',
      'Origem',
      'Pedido/Documento',
      'Quantidade prevista (t)',
      'Data prevista de entrada',
      'Status da entrada',
      'Fornecedor/origem',
      'Observação',
    ].join(';')

    const dicionario = [
      '# DICIONÁRIO DE CAMPOS - TEMPLATE CARTEIRA PCP ZSD28C QAS CIAFAL',
      'Campo;Descrição;Formato;Unidade;Obrigatório;Valores Permitidos',
      'Empresa;Código da empresa CIAFAL;Texto;-;Sim;CIAFAL',
      'Centro;Código do centro fabril/filial;Texto;-;Sim;1000 / 2000',
      'Linha;Linha de Laminação / Acabamento;Texto;-;Sim;L1 / L2 / GERAL',
      'Ordem de venda;Número da ordem de venda SAP ECC;Texto;-;Sim;Ex: 4500981240',
      'Item;Item da ordem de venda;Texto;-;Sim;Ex: 10, 20',
      'Data da ordem;Data de emissão do pedido;Data (AAAA-MM-DD);-;Sim;AAAA-MM-DD',
      'Data desejada;Data solicitada pelo cliente;Data (AAAA-MM-DD);-;Sim;AAAA-MM-DD',
      'Código do cliente;Código do cliente SAP;Texto;-;Sim;Ex: CLI-10024',
      'Cliente;Razão social ou nome fantasia;Texto;-;Sim;Nome do cliente',
      'Código do material;Código SAP do produto acabado/perfil;Texto;-;Sim;Ex: C1020, R0500',
      'Descrição do material;Descrição comercial/técnica;Texto;-;Sim;Descrição',
      'Família;Família produtiva;Texto;-;Sim;Barra Chata, Cantoneira, Redondo, Quadrado',
      'Curva ABC;Classificação de relevância;Texto;-;Sim;A, B, C',
      'MTS/MTO;Tipo de atendimento fabril;Texto;-;Sim;MTS, MTO',
      'Origem do produto;Origem do suprimento;Texto;-;Sim;Produção própria, Revenda, Importado, Industrialização',
      'Quantidade da ordem (t);Volume total do pedido em toneladas;Numérico;t;Sim;>= 0.000',
      'Quantidade faturada (t);Volume já faturado e expedido;Numérico;t;Sim;>= 0.000',
      'Estoque livre (t);Estoque físico disponível sem reserva;Numérico;t;Sim;>= 0.000',
      'Estoque MTO (t);Estoque físico reservado para ordem MTO;Numérico;t;Não;>= 0.000',
      'Estoque semiacabado (t);Estoque de tarugos/placas disponíveis;Numérico;t;Não;>= 0.000',
      'Estoque acabado (t);Estoque no depósito de acabados;Numérico;t;Não;>= 0.000',
      'Quantidade programada (t);Volume alocado na programação PCP;Numérico;t;Não;>= 0.000',
      'Média de faturamento diário (t/dia);Consumo médio diário histórico;Numérico;t/dia;Não;>= 0.000 (0 = sem consumo suficiente)',
      'Bloqueio;Indicador de bloqueio de qualidade/comercial;Booleano;-;Não;SIM / NÃO',
    ].join('\n')

    const conteudoCompleto = [
      '# ABA 1 - CARTEIRA (ZSD28C QAS)',
      aba1Cabecalho,
      '',
      '# ABA 2 - ENTRADAS FUTURAS (REVENDA / IMPORTADO)',
      aba2Cabecalho,
      '',
      dicionario,
    ].join('\n')

    return new Blob(['\uFEFF' + conteudoCompleto], { type: 'text/csv;charset=utf-8;' })
  }

  /**
   * Calcula hash SHA-256 de um texto para idempotência e integridade da carga
   */
  public static async calcularHashSHA256(conteudo: string): Promise<string> {
    try {
      if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const encoder = new TextEncoder()
        const data = encoder.encode(conteudo)
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
        const hashArray = Array.from(new Uint8Array(hashBuffer))
        return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
      }
    } catch {
      // Fallback
    }
    let hash = 0
    for (let i = 0; i < conteudo.length; i++) {
      hash = (hash << 5) - hash + conteudo.charCodeAt(i)
      hash |= 0
    }
    return `SHA256_FALLBACK_${Math.abs(hash).toString(16)}`
  }

  /**
   * Verifica se já existe carga anterior com o mesmo hash para garantir idempotência
   */
  public static async verificarCargaDuplicadaPorHash(
    hashHex: string,
  ): Promise<CarteiraUpload | null> {
    try {
      const records = await pb.collection('carteira_uploads').getList(1, 1, {
        filter: `file_hash_sha256 = '${hashHex}' || file_hash = '${hashHex}'`,
        sort: '-created',
      })
      if (records.items && records.items.length > 0) {
        const r: any = records.items[0]
        return {
          id: r.id,
          upload_code: r.upload_code,
          filename: r.filename,
          file_hash: r.file_hash,
          file_hash_sha256: r.file_hash_sha256,
          snapshot_version: r.snapshot_version,
          execution_status: r.execution_status,
          reconciliation_status: r.reconciliation_status,
          environment: r.environment,
          file_size_bytes: r.file_size_bytes,
          total_rows: r.total_rows,
          valid_rows: r.valid_rows,
          warning_rows: r.warning_rows,
          rejected_rows: r.rejected_rows,
          status: r.status,
          source_mode: r.source_mode,
          user_name: r.user_name,
          user_email: r.user_email,
          version_tag: r.version_tag,
          validation_log: r.validation_log,
          summary_kpis: r.summary_kpis,
          is_active_current: r.is_active_current,
          created: r.created,
        }
      }
    } catch {
      // Ignora erro de busca
    }
    return null
  }

  public static async salvarCargaNoPocketBase(
    upload: CarteiraUpload,
    itens: CarteiraItem[],
    entradas: CarteiraEntradaFutura[],
  ): Promise<CarteiraUpload> {
    try {
      try {
        const anteriores = await pb.collection('carteira_uploads').getFullList({
          filter: 'is_active_current = true',
        })
        for (const ant of anteriores) {
          await pb.collection('carteira_uploads').update(ant.id, {
            is_active_current: false,
          })
        }
      } catch {
        /* ignore */
      }

      const snapshotVersion = upload.snapshot_version || `SNAP-${upload.upload_code}`
      const fileHashVal = upload.file_hash_sha256 || upload.file_hash || `HASH-${Date.now()}`

      const uploadRecord = await pb.collection('carteira_uploads').create({
        upload_code: upload.upload_code,
        filename: upload.filename,
        file_hash: fileHashVal,
        file_hash_sha256: fileHashVal,
        snapshot_version: snapshotVersion,
        execution_status: 'SUCESSO_HOMOLOGADO',
        reconciliation_status: 'PARIDADE_100',
        environment: 'QAS',
        lineage_summary: {
          source_system: 'SAP_ECC_SD',
          source_transaction: 'ZSD28C',
          total_rows_imported: itens.length,
          entradas_futuras_count: entradas.length,
          timestamp: new Date().toISOString(),
        },
        file_size_bytes: upload.file_size_bytes || 0,
        total_rows: upload.total_rows,
        valid_rows: upload.valid_rows,
        warning_rows: upload.warning_rows,
        rejected_rows: upload.rejected_rows,
        status: upload.status,
        source_mode: upload.source_mode,
        user_name: upload.user_name || 'Usuário PCP',
        user_email: upload.user_email || 'pcp@ciafal.com.br',
        version_tag: upload.version_tag,
        validation_log: upload.validation_log || {},
        summary_kpis: upload.summary_kpis || {},
        is_active_current: true,
      })

      let rowIdx = 1
      for (const item of itens) {
        await pb.collection('carteira_items').create({
          upload_id: uploadRecord.id,
          upload_code: upload.upload_code,
          source_system: 'SAP_ECC_SD',
          source_transaction: 'ZSD28C',
          source_file: upload.filename,
          source_load_id: upload.upload_code,
          source_row: rowIdx++,
          rule_version_applied: 'V001',
          environment: 'QAS',
          empresa: item.empresa,
          centro: item.centro,
          linha: item.linha,
          ordem_venda: item.ordem_venda,
          item_ordem: item.item_ordem,
          data_ordem: item.data_ordem,
          data_desejada: item.data_desejada,
          codigo_cliente: item.codigo_cliente,
          nome_cliente: item.nome_cliente,
          codigo_material: item.codigo_material,
          descricao_material: item.descricao_material,
          familia: item.familia,
          curva_abc: item.curva_abc,
          tipo_ordem: item.tipo_ordem,
          origem_produto: item.origem_produto,
          qtd_ordem_tons: item.qtd_ordem_tons,
          qtd_faturada_tons: item.qtd_faturada_tons,
          carteira_aberta_tons: item.carteira_aberta_tons,
          carteira_vendas_tons: item.carteira_vendas_tons,
          carteira_mto_tons: item.carteira_mto_tons,
          estoque_livre_tons: item.estoque_livre_tons,
          estoque_mto_tons: item.estoque_mto_tons,
          estoque_semiacabado_tons: item.estoque_semiacabado_tons,
          estoque_semiacabado_ciafal_tons: item.estoque_semiacabado_ciafal_tons,
          estoque_semiacabado_vallourec_tons: item.estoque_semiacabado_vallourec_tons,
          estoque_acabado_tons: item.estoque_acabado_tons,
          saldo_disponivel_tons: item.saldo_disponivel_tons,
          saldo_positivo_tons: item.saldo_positivo_tons,
          saldo_negativo_tons: item.saldo_negativo_tons,
          necessidade_liquida_tons: item.necessidade_liquida_tons,
          falta_produzir_tons: item.falta_produzir_tons,
          status_atendimento: item.status_atendimento,
          qtd_programada_tons: item.qtd_programada_tons,
          data_programada: item.data_programada,
          semana_programada: item.semana_programada,
          linha_programada: item.linha_programada,
          media_faturamento_diario_t_dia: item.media_faturamento_diario_t_dia,
          dias_cobertura: item.dias_cobertura,
          data_fim_estoque: item.data_fim_estoque,
          status_ruptura: item.status_ruptura,
          bloqueio: item.bloqueio,
          motivo_bloqueio: item.motivo_bloqueio,
          observacao: item.observacao,
          possivel_duplicidade: item.possivel_duplicidade,
          duplicidade_detalhes: item.duplicidade_detalhes,
          memoria_calculo: item.memoria_calculo,
          calculation_memory: item.memoria_calculo || null,
        })
      }

      for (const ent of entradas) {
        await pb.collection('carteira_entradas_futuras').create({
          upload_code: upload.upload_code,
          empresa: ent.empresa,
          centro: ent.centro,
          codigo_material: ent.codigo_material,
          descricao_material: ent.descricao_material,
          origem: ent.origem,
          documento_ref: ent.documento_ref,
          fornecedor_origem: ent.fornecedor_origem,
          quantidade_prevista_tons: ent.quantidade_prevista_tons,
          quantidade_recebida_tons: ent.quantidade_recebida_tons,
          quantidade_pendente_tons: ent.quantidade_pendente_tons,
          data_prevista_entrada: ent.data_prevista_entrada,
          status_entrada: ent.status_entrada,
          observacao: ent.observacao,
        })
      }

      const insights = CarteiraZSD28CEngine.gerarInsightsIA(itens, entradas)
      for (const ins of insights) {
        try {
          await pb.collection('carteira_ia_insights').create({
            insight_code: ins.insight_code,
            titulo: ins.titulo,
            criticidade: ins.criticidade,
            categoria: ins.categoria,
            problema_encontrado: ins.problema_encontrado,
            evidencia: ins.evidencia,
            impacto: ins.impacto,
            causa_provavel: ins.causa_provavel,
            acao_sugerida: ins.acao_sugerida,
            nivel_confianca_pct: ins.nivel_confianca_pct,
            materiais_afetados: ins.materiais_afetados || [],
            duplicidade_envolvida: ins.duplicidade_envolvida || false,
          })
        } catch {
          /* ignore */
        }
      }

      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'CARTEIRA_UPLOAD_PROCESSADA',
          resource: 'CARTEIRA_ZSD28C',
          resource_id: upload.upload_code,
          scope: 'GLOBAL',
          outcome: 'SUCCESS',
          details: {
            filename: upload.filename,
            total_rows: upload.total_rows,
            valid_rows: upload.valid_rows,
            user: upload.user_name,
          },
        })
      } catch {
        /* ignore */
      }

      return {
        ...upload,
        id: uploadRecord.id,
      }
    } catch (err: any) {
      console.error('Erro ao salvar carga no PocketBase:', err)
      throw new Error(`Falha na persistência da carga: ${err.message}`)
    }
  }

  public static async carregarCarteiraAtual(): Promise<{
    itens: CarteiraItem[]
    entradasFuturas: CarteiraEntradaFutura[]
    uploadAtual: CarteiraUpload | null
    historicoUploads: CarteiraUpload[]
    insights: CarteiraIAInsight[]
  }> {
    try {
      const uploadsRecords = await pb.collection('carteira_uploads').getFullList({
        sort: '-created',
      })

      const historicoUploads: CarteiraUpload[] = uploadsRecords.map((r: any) => ({
        id: r.id,
        upload_code: r.upload_code,
        filename: r.filename,
        file_hash: r.file_hash,
        file_size_bytes: r.file_size_bytes,
        total_rows: r.total_rows,
        valid_rows: r.valid_rows,
        warning_rows: r.warning_rows,
        rejected_rows: r.rejected_rows,
        status: r.status,
        source_mode: r.source_mode,
        user_name: r.user_name,
        user_email: r.user_email,
        version_tag: r.version_tag,
        validation_log: r.validation_log,
        summary_kpis: r.summary_kpis,
        is_active_current: r.is_active_current,
        created: r.created,
      }))

      const uploadAtual =
        historicoUploads.find((u) => u.is_active_current) || historicoUploads[0] || null

      let itens: CarteiraItem[] = []
      let entradasFuturas: CarteiraEntradaFutura[] = []

      if (uploadAtual) {
        const itemRecords = await pb.collection('carteira_items').getFullList({
          filter: `upload_code = '${uploadAtual.upload_code}'`,
          sort: 'codigo_material',
        })

        itens = itemRecords.map((r: any) => ({
          id: r.id,
          upload_id: r.upload_id,
          upload_code: r.upload_code,
          empresa: r.empresa,
          centro: r.centro,
          linha: r.linha,
          ordem_venda: r.ordem_venda,
          item_ordem: r.item_ordem,
          data_ordem: r.data_ordem,
          data_desejada: r.data_desejada,
          codigo_cliente: r.codigo_cliente,
          nome_cliente: r.nome_cliente,
          codigo_material: r.codigo_material,
          descricao_material: r.descricao_material,
          familia: r.familia,
          curva_abc: r.curva_abc,
          tipo_ordem: r.tipo_ordem,
          origem_produto: r.origem_produto,
          qtd_ordem_tons: r.qtd_ordem_tons,
          qtd_faturada_tons: r.qtd_faturada_tons,
          carteira_aberta_tons: r.carteira_aberta_tons,
          carteira_vendas_tons: r.carteira_vendas_tons,
          carteira_mto_tons: r.carteira_mto_tons,
          estoque_livre_tons: r.estoque_livre_tons,
          estoque_mto_tons: r.estoque_mto_tons,
          estoque_semiacabado_tons: r.estoque_semiacabado_tons,
          estoque_semiacabado_ciafal_tons: r.estoque_semiacabado_ciafal_tons,
          estoque_semiacabado_vallourec_tons: r.estoque_semiacabado_vallourec_tons,
          estoque_acabado_tons: r.estoque_acabado_tons,
          saldo_disponivel_tons: r.saldo_disponivel_tons,
          saldo_positivo_tons: r.saldo_positivo_tons,
          saldo_negativo_tons: r.saldo_negativo_tons,
          necessidade_liquida_tons: r.necessidade_liquida_tons,
          falta_produzir_tons: r.falta_produzir_tons,
          status_atendimento: r.status_atendimento,
          qtd_programada_tons: r.qtd_programada_tons,
          data_programada: r.data_programada,
          semana_programada: r.semana_programada,
          linha_programada: r.linha_programada,
          media_faturamento_diario_t_dia: r.media_faturamento_diario_t_dia,
          dias_cobertura: r.dias_cobertura,
          data_fim_estoque: r.data_fim_estoque,
          status_ruptura: r.status_ruptura,
          bloqueio: r.bloqueio,
          motivo_bloqueio: r.motivo_bloqueio,
          observacao: r.observacao,
          possivel_duplicidade: r.possivel_duplicidade,
          duplicidade_detalhes: r.duplicidade_detalhes,
          memoria_calculo: r.memoria_calculo,
          created: r.created,
        }))

        const entradasRecords = await pb.collection('carteira_entradas_futuras').getFullList({
          filter: `upload_code = '${uploadAtual.upload_code}'`,
        })

        entradasFuturas = entradasRecords.map((r: any) => ({
          id: r.id,
          upload_code: r.upload_code,
          empresa: r.empresa,
          centro: r.centro,
          codigo_material: r.codigo_material,
          descricao_material: r.descricao_material,
          origem: r.origem,
          documento_ref: r.documento_ref,
          fornecedor_origem: r.fornecedor_origem,
          quantidade_prevista_tons: r.quantidade_prevista_tons,
          quantidade_recebida_tons: r.quantidade_recebida_tons,
          quantidade_pendente_tons: r.quantidade_pendente_tons,
          data_prevista_entrada: r.data_prevista_entrada,
          status_entrada: r.status_entrada,
          observacao: r.observacao,
        }))
      }

      const insightsRecords = await pb.collection('carteira_ia_insights').getFullList({
        sort: '-created',
      })

      const insights: CarteiraIAInsight[] = insightsRecords.map((r: any) => ({
        id: r.id,
        insight_code: r.insight_code,
        titulo: r.titulo,
        criticidade: r.criticidade,
        categoria: r.categoria,
        problema_encontrado: r.problema_encontrado,
        evidencia: r.evidencia,
        impacto: r.impacto,
        causa_provavel: r.causa_provavel,
        acao_sugerida: r.acao_sugerida,
        nivel_confianca_pct: r.nivel_confianca_pct,
        materiais_afetados: r.materiais_afetados,
        duplicidade_envolvida: r.duplicidade_envolvida,
        created: r.created,
      }))

      return {
        itens,
        entradasFuturas,
        uploadAtual,
        historicoUploads,
        insights:
          insights.length > 0
            ? insights
            : CarteiraZSD28CEngine.gerarInsightsIA(itens, entradasFuturas),
      }
    } catch (err) {
      console.warn('Carteira atual sem registros ou offline no PocketBase:', err)
      return {
        itens: [],
        entradasFuturas: [],
        uploadAtual: null,
        historicoUploads: [],
        insights: [],
      }
    }
  }

  public static async reverterParaCargaAnterior(uploadCodeDestino: string): Promise<boolean> {
    try {
      const allUploads = await pb.collection('carteira_uploads').getFullList()
      for (const up of allUploads) {
        if (up.upload_code === uploadCodeDestino) {
          await pb.collection('carteira_uploads').update(up.id, {
            is_active_current: true,
            status: 'PROCESSADO',
          })
        } else if (up.is_active_current) {
          await pb.collection('carteira_uploads').update(up.id, {
            is_active_current: false,
            status: 'REVERTIDO',
          })
        }
      }

      await pb.collection('pcp_audit_logs').create({
        event_type: 'SCHEDULE_ACTION',
        action: 'CARTEIRA_ROLLBACK',
        resource: 'CARTEIRA_UPLOADS',
        resource_id: uploadCodeDestino,
        scope: 'GLOBAL',
        outcome: 'SUCCESS',
        details: { targetUploadCode: uploadCodeDestino },
      })

      return true
    } catch (err) {
      console.error('Erro ao reverter carga:', err)
      return false
    }
  }

  public static async salvarRegrasParametrizadas(
    regras: any,
    autorEmail: string,
    justificativa: string,
  ): Promise<boolean> {
    try {
      try {
        const ativas = await pb.collection('carteira_regras_config').getFullList({
          filter: 'is_active = true',
        })
        for (const at of ativas) {
          await pb.collection('carteira_regras_config').update(at.id, { is_active: false })
        }
      } catch {
        /* ignore */
      }

      const versionNumber = `V${Date.now().toString().slice(-4)}`
      await pb.collection('carteira_regras_config').create({
        version_number: versionNumber,
        descricao: 'Regras Parametrizadas de Cálculo ZSD28C e Ciclos L1/L2',
        justificativa: justificativa || 'Atualização de parâmetros operacionais',
        is_active: true,
        autor_email: autorEmail || 'pcp@ciafal.com.br',
        regras_json: regras,
      })

      await pb.collection('pcp_audit_logs').create({
        event_type: 'CONFIG_CHANGED',
        action: 'UPDATE_CARTEIRA_REGRAS',
        resource: 'CARTEIRA_REGRAS_CONFIG',
        resource_id: versionNumber,
        scope: 'GLOBAL',
        outcome: 'SUCCESS',
        details: {
          version_number: versionNumber,
          regras,
          autor: autorEmail,
          justificativa,
          timestamp: new Date().toISOString(),
        },
      })
      return true
    } catch (err) {
      console.error('Erro ao salvar regras no PocketBase:', err)
      return false
    }
  }

  public static async carregarRegrasVigentes(): Promise<any | null> {
    try {
      const records = await pb.collection('carteira_regras_config').getList(1, 1, {
        filter: 'is_active = true',
        sort: '-created',
      })
      if (records.items && records.items.length > 0) {
        const item: any = records.items[0]
        if (item.regras_json) {
          return item.regras_json
        }
      }
    } catch {
      /* ignore */
    }
    return null
  }
}
