/**
 * MOTOR CENTRAL DO LOTE MÍNIMO DE PRODUÇÃO - PCP ROBOTIZADO
 *
 * REGRA DEFINITIVA:
 * "O LOTE MÍNIMO NÃO SERÁ CADASTRADO MANUALMENTE NO HUB.
 * O valor do lote mínimo será recebido diretamente do SAP via RFC,
 * associado individualmente a cada Código de material SAP.
 * Código do material → RFC SAP → Lote mínimo.
 * O PCP Robotizado apenas deverá CONSULTAR e UTILIZAR essa informação."
 *
 * REGRAS CRÍTICAS:
 * 1. FONTE ÚNICA: SAP ECC → RFC → Código do Material → Lote Mínimo.
 *    NÃO procurar mínimo por descrição, bitola, família, similaridade, centro ou linha.
 * 2. Ausência total de fallback por bitola, linha, centro, família, produtividade, Ficha Mestra
 *    ou parâmetro genérico.
 * 3. Se um código existe na carteira mas a RFC não retornou lote mínimo:
 *    Status oficial = "⚠ Lote mínimo não recebido".
 *    NÃO assumir zero, NÃO valor default, NÃO emprestar mínimo de outro item.
 *    Tratar como inconsistência de dados para avaliação do PCP/TI.
 *    NÃO classificá-lo como atingido nem não atingido.
 * 4. Consolidação por CÓDIGO OFICIAL:
 *    Pedidos 4 + 5 + 3 t do mesmo código = 1 material com 12,00 t.
 *    Se mínimo SAP 15,00 t ⇒ 1 ocorrência abaixo do mínimo, faltam 3,00 t (nunca 3 ocorrências).
 * 5. Card "Mínimo não atingido":
 *    - Quantidade consolidada < lote mínimo SAP ⇒ "Mínimo não atingido", faltam = lote_minimo - consolidado
 *    - Quantidade consolidada >= lote mínimo SAP ⇒ Atingido, NÃO aparece no card
 *    - Sem lote mínimo SAP ⇒ Card separado / Seção específica "Lote mínimo não recebido"
 */

import {
  SapMaterialLoteMinimoRecord,
  sapMaterialLoteMinimoService,
} from './sap-material-lote-minimo-service'

export type StatusLoteMinimo =
  | 'MINIMO_NAO_ATINGIDO' // Existe lote mínimo SAP e quantidade abaixo dele
  | 'MINIMO_ATINGIDO' // Existe lote mínimo SAP e quantidade >= lote mínimo
  | 'SEM_PARAMETRIZACAO_SAP' // Código existe na carteira mas RFC SAP não retornou lote mínimo

export interface MinimoNaoAtingidoItem {
  codigo_material: string
  descricao_material: string
  carteira: string // 'L1' | 'L2' | 'MTO' | 'SDC' | 'Geral' | etc.
  clientes: string[]
  linha: string
  centro: string
  quantidade_carteira_tons: number // soma total de pedidos
  quantidade_consolidada_tons: number // elegível para bater lote mínimo
  lote_minimo_tons: number | null // null se não recebido do SAP
  falta_para_minimo_tons: number // Math.max(0, lote_minimo - consolidada) ou 0 se sem mínimo
  unidade_medida: string
  curva_abc: string
  data_necessidade_mais_antiga: string
  pedidos_consolidados_count: number
  origem_lote_minimo: string // "SAP / RFC" ou "Não sincronizado"
  ultima_atualizacao_sap: string // data/hora ou "Pendente de integração"
  status_lote: StatusLoteMinimo
  inconsistencia_dados: boolean
}

export interface MinimoNaoAtingidoSummary {
  // Itens com lote mínimo SAP conhecido onde consolidado < mínimo
  total_materiais_abaixo_minimo: number
  total_toneladas_carteira_afetada: number
  total_toneladas_faltantes: number
  materiais_abaixo: MinimoNaoAtingidoItem[]

  // Itens críticos sem lote mínimo recebido da RFC SAP (inconsistência PCP/TI)
  total_materiais_sem_minimo_sap: number
  total_toneladas_sem_minimo_sap: number
  materiais_sem_minimo_sap: MinimoNaoAtingidoItem[]

  // Itens que atingiram o lote mínimo SAP
  total_materiais_atingidos: number
  materiais_atingidos: MinimoNaoAtingidoItem[]

  // Consolidação por Curva ABC (dos itens com déficit de mínimo)
  porCurvaAbc: {
    A: { count: number; faltam_tons: number }
    B: { count: number; faltam_tons: number }
    C: { count: number; faltam_tons: number }
  }

  // Lista consolidada de todos os materiais avaliados
  todos_materiais: MinimoNaoAtingidoItem[]

  // Timestamp de apuração
  apurado_em: string
}

export interface CalcularMinimoNaoAtingidoInput {
  itens: any[] // CarteiraItem | CarteiraSDCItem | etc
  tipoVisao?: string // 'Geral' | 'L1' | 'L2' | 'MTO' | 'SDC' | string
  // Réplica/cache SAP por código de material (Map ou Record)
  replicaSapPorCodigo?:
    | Map<string, SapMaterialLoteMinimoRecord>
    | Record<string, SapMaterialLoteMinimoRecord>
}

/**
 * Normaliza o código do material SAP (ex: "C1250A360600").
 * Associação é EXCLUSIVAMENTE pelo código oficial do material.
 */
export function normalizarCodigoMaterialSap(raw: any): string {
  if (!raw) return ''
  return String(raw).trim().toUpperCase()
}

/**
 * Consulta o lote mínimo oficial SAP para o código específico.
 * NÃO aplica nenhum fallback de bitola, linha, centro, família ou default.
 */
export function consultarLoteMinimoOficialSap(
  codigoMaterial: string,
  replicaSap?:
    | Map<string, SapMaterialLoteMinimoRecord>
    | Record<string, SapMaterialLoteMinimoRecord>,
): {
  lote_minimo: number | null
  origem: string
  ultima_atualizacao: string
  unidade_medida: string
} {
  const codNorm = normalizarCodigoMaterialSap(codigoMaterial)
  if (!codNorm) {
    return {
      lote_minimo: null,
      origem: 'Não informado',
      ultima_atualizacao: 'N/D',
      unidade_medida: 't',
    }
  }

  const record = sapMaterialLoteMinimoService.getLoteMinimoByCodigo(codNorm, replicaSap)

  if (record && typeof record.lote_minimo === 'number' && record.lote_minimo > 0) {
    return {
      lote_minimo: record.lote_minimo,
      origem: record.origem || 'SAP / RFC',
      ultima_atualizacao: record.last_sync
        ? formatarDataHoraPtBr(record.last_sync)
        : 'SAP RFC (Última sinc.)',
      unidade_medida: record.unidade_medida || 't',
    }
  }

  // Se não foi retornado pela RFC SAP: retorna null
  return {
    lote_minimo: null,
    origem: 'SAP / RFC (Pendente)',
    ultima_atualizacao: 'Pendente de integração RFC',
    unidade_medida: 't',
  }
}

/**
 * Função utilitária de formatação de data/hora no padrão estrito pt-BR (dd/mm/aaaa HH:mm)
 */
export function formatarDataHoraPtBr(dateIsoOrStr?: string | Date | null): string {
  if (!dateIsoOrStr) return 'N/D'
  try {
    const d = new Date(dateIsoOrStr)
    if (isNaN(d.getTime())) return String(dateIsoOrStr)
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    const horas = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${ano} ${horas}:${min}`
  } catch (_) {
    return String(dateIsoOrStr)
  }
}

/**
 * Formatação estrita pt-BR para tonelada: ex "15,00 t"
 */
export function formatarToneladasPtBr(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) return 'N/D'
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`
}

/**
 * Extrai quantidade em toneladas de um item genérico da carteira
 */
function extrairQuantidadeTons(item: any): number {
  if (!item) return 0
  const q =
    item.carteira_aberta_tons ??
    item.carteira_vendas_tons ??
    item.carteira_t ??
    item.qtd_ordem_tons ??
    item.falta_produzir_tons ??
    0
  const n = Number(q)
  return isNaN(n) ? 0 : n
}

/**
 * Extrai cliente(s) de um item
 */
function extrairCliente(item: any): string {
  return item.nome_cliente || item.cliente || item.cliente_nome || item.codigo_cliente || 'Diversos'
}

/**
 * Extrai data de necessidade de um item
 */
function extrairDataNecessidade(item: any): string {
  return item.data_desejada || item.data_prevista || item.data_ordem || item.data_entrega || ''
}

/**
 * MOTOR CENTRAL: Consolida e calcula o Mínimo Não Atingido para qualquer carteira
 */
export function calcularMinimoNaoAtingido(
  input: CalcularMinimoNaoAtingidoInput,
): MinimoNaoAtingidoSummary {
  const { itens = [], tipoVisao = 'Geral', replicaSapPorCodigo } = input

  // 1. Agrupar por CÓDIGO OFICIAL DO MATERIAL (associação estrita)
  const gruposPorCodigo = new Map<
    string,
    {
      codigo: string
      descricao: string
      clientes: Set<string>
      linha: string
      centro: string
      curva_abc: string
      qtdConsolidada: number
      qtdCarteiraTotal: number
      pedidosCount: number
      datas: string[]
    }
  >()

  for (const it of itens) {
    const rawCod = it.codigo_material || it.material || it.material_codigo || it.codigo
    const cod = normalizarCodigoMaterialSap(rawCod)
    if (!cod) continue

    const qtd = extrairQuantidadeTons(it)
    const desc = it.descricao_material || it.descricao || it.material_descricao || cod
    const cliente = extrairCliente(it)
    const linha = it.linha || it.linha_codigo || tipoVisao || 'GERAL'
    const centro = it.centro || it.werks || '1001'
    const curvaAbc = (it.curva_abc || it.curva || 'C').toUpperCase()
    const dt = extrairDataNecessidade(it)

    let grupo = gruposPorCodigo.get(cod)
    if (!grupo) {
      grupo = {
        codigo: cod,
        descricao: desc,
        clientes: new Set<string>(),
        linha,
        centro,
        curva_abc: curvaAbc,
        qtdConsolidada: 0,
        qtdCarteiraTotal: 0,
        pedidosCount: 0,
        datas: [],
      }
      gruposPorCodigo.set(cod, grupo)
    }

    grupo.qtdConsolidada += qtd
    grupo.qtdCarteiraTotal += qtd
    grupo.pedidosCount += 1
    if (cliente) grupo.clientes.add(cliente)
    if (dt) grupo.datas.push(dt)
    if (desc && desc !== cod && grupo.descricao === cod) {
      grupo.descricao = desc
    }
  }

  const materiaisAbaixo: MinimoNaoAtingidoItem[] = []
  const materiaisSemMinimoSap: MinimoNaoAtingidoItem[] = []
  const materiaisAtingidos: MinimoNaoAtingidoItem[] = []
  const todosMateriais: MinimoNaoAtingidoItem[] = []

  const porCurvaAbc = {
    A: { count: 0, faltam_tons: 0 },
    B: { count: 0, faltam_tons: 0 },
    C: { count: 0, faltam_tons: 0 },
  }

  // 2. Avaliar cada código contra a réplica oficial SAP RFC
  gruposPorCodigo.forEach((grupo) => {
    const infoSap = consultarLoteMinimoOficialSap(grupo.codigo, replicaSapPorCodigo)
    const loteMinimoSap = infoSap.lote_minimo
    const consolidado = Number(grupo.qtdConsolidada.toFixed(2))

    // Ordenar datas para pegar a mais antiga
    const datasOrdenadas = grupo.datas.filter(Boolean).sort()
    const dataMaisAntiga = datasOrdenadas[0] || 'N/D'

    let statusLote: StatusLoteMinimo
    let faltaParaMinimo = 0
    let inconsistencia = false

    if (loteMinimoSap === null) {
      // CASO CRÍTICO: Código existe na carteira mas RFC SAP não retornou lote mínimo
      // NÃO assumir zero, NÃO valor default, NÃO classificar como atingido nem não atingido
      statusLote = 'SEM_PARAMETRIZACAO_SAP'
      inconsistencia = true
      faltaParaMinimo = 0
    } else if (consolidado < loteMinimoSap) {
      // Mínimo NÃO atingido
      statusLote = 'MINIMO_NAO_ATINGIDO'
      faltaParaMinimo = Number((loteMinimoSap - consolidado).toFixed(2))
    } else {
      // Mínimo atingido (consolidado >= loteMinimoSap)
      statusLote = 'MINIMO_ATINGIDO'
      faltaParaMinimo = 0
    }

    const itemConsolidado: MinimoNaoAtingidoItem = {
      codigo_material: grupo.codigo,
      descricao_material: grupo.descricao,
      carteira: tipoVisao,
      clientes: Array.from(grupo.clientes),
      linha: grupo.linha,
      centro: grupo.centro,
      quantidade_carteira_tons: consolidado,
      quantidade_consolidada_tons: consolidado,
      lote_minimo_tons: loteMinimoSap,
      falta_para_minimo_tons: faltaParaMinimo,
      unidade_medida: infoSap.unidade_medida || 't',
      curva_abc: grupo.curva_abc,
      data_necessidade_mais_antiga: dataMaisAntiga,
      pedidos_consolidados_count: grupo.pedidosCount,
      origem_lote_minimo: infoSap.origem,
      ultima_atualizacao_sap: infoSap.ultima_atualizacao,
      status_lote: statusLote,
      inconsistencia_dados: inconsistencia,
    }

    todosMateriais.push(itemConsolidado)

    if (statusLote === 'MINIMO_NAO_ATINGIDO') {
      materiaisAbaixo.push(itemConsolidado)
      const curvaKey = (['A', 'B', 'C'].includes(grupo.curva_abc) ? grupo.curva_abc : 'C') as
        | 'A'
        | 'B'
        | 'C'
      porCurvaAbc[curvaKey].count += 1
      porCurvaAbc[curvaKey].faltam_tons += faltaParaMinimo
    } else if (statusLote === 'SEM_PARAMETRIZACAO_SAP') {
      materiaisSemMinimoSap.push(itemConsolidado)
    } else {
      materiaisAtingidos.push(itemConsolidado)
    }
  })

  // Ordenar materiais abaixo por maior déficit faltante
  materiaisAbaixo.sort((a, b) => b.falta_para_minimo_tons - a.falta_para_minimo_tons)
  materiaisSemMinimoSap.sort(
    (a, b) => b.quantidade_consolidada_tons - a.quantidade_consolidada_tons,
  )

  const totalAbaixoCount = materiaisAbaixo.length
  const totalCarteiraAfetadaT = materiaisAbaixo.reduce(
    (acc, m) => acc + m.quantidade_consolidada_tons,
    0,
  )
  const totalFaltantesT = materiaisAbaixo.reduce((acc, m) => acc + m.falta_para_minimo_tons, 0)

  const totalSemMinimoCount = materiaisSemMinimoSap.length
  const totalCarteiraSemMinimoT = materiaisSemMinimoSap.reduce(
    (acc, m) => acc + m.quantidade_consolidada_tons,
    0,
  )

  return {
    total_materiais_abaixo_minimo: totalAbaixoCount,
    total_toneladas_carteira_afetada: Number(totalCarteiraAfetadaT.toFixed(2)),
    total_toneladas_faltantes: Number(totalFaltantesT.toFixed(2)),
    materiais_abaixo: materiaisAbaixo,

    total_materiais_sem_minimo_sap: totalSemMinimoCount,
    total_toneladas_sem_minimo_sap: Number(totalCarteiraSemMinimoT.toFixed(2)),
    materiais_sem_minimo_sap: materiaisSemMinimoSap,

    total_materiais_atingidos: materiaisAtingidos.length,
    materiais_atingidos: materiaisAtingidos,

    porCurvaAbc,
    todos_materiais: todosMateriais,
    apurado_em: new Date().toISOString(),
  }
}
