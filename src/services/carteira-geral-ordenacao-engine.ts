import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

export type OrdenacaoCarteiraGeralOpcao =
  | 'MATERIAL_DESCRICAO'
  | 'CODIGO'
  | 'CARTEIRA_DESC'
  | 'CARTEIRA_ASC'
  | 'ESTOQUE_DESC'
  | 'ESTOQUE_ASC'
  | 'MEDIA_FAT_DESC'
  | 'MEDIA_FAT_ASC'
  | 'DIAS_ESTOQUE_ASC'
  | 'DIAS_ESTOQUE_DESC'
  | 'DATA_FIM_PROXIMA'
  | 'DATA_FIM_DISTANTE'
  | 'DIAS_NEGATIVO_DESC'
  | 'DEFICIT_DESC'
  | 'SALDO_PROJ_ASC'
  | 'REPRES_FAT_DESC'
  | 'REPRES_FAT_ASC'
  | 'RISCO_CRITICIDADE'

export interface OpcaoOrdenacaoItem {
  id: OrdenacaoCarteiraGeralOpcao
  label: string
}

export const OPCOES_ORDENACAO_CARTEIRA_GERAL: OpcaoOrdenacaoItem[] = [
  { id: 'MATERIAL_DESCRICAO', label: 'Material / descrição' },
  { id: 'CODIGO', label: 'Código' },
  { id: 'CARTEIRA_DESC', label: 'Carteira — maior para menor' },
  { id: 'CARTEIRA_ASC', label: 'Carteira — menor para maior' },
  { id: 'ESTOQUE_DESC', label: 'Estoque disponível — maior para menor' },
  { id: 'ESTOQUE_ASC', label: 'Estoque disponível — menor para maior' },
  { id: 'MEDIA_FAT_DESC', label: 'Média diária faturamento — maior para menor' },
  { id: 'MEDIA_FAT_ASC', label: 'Média diária faturamento — menor para maior' },
  { id: 'DIAS_ESTOQUE_ASC', label: 'Dias de estoque — menor para maior' },
  { id: 'DIAS_ESTOQUE_DESC', label: 'Dias de estoque — maior para menor' },
  { id: 'DATA_FIM_PROXIMA', label: 'Data fim estoque — mais próxima' },
  { id: 'DATA_FIM_DISTANTE', label: 'Data fim estoque — mais distante' },
  { id: 'DIAS_NEGATIVO_DESC', label: 'Dias estoque negativo — maior para menor' },
  { id: 'DEFICIT_DESC', label: 'Déficit — maior para menor' },
  { id: 'SALDO_PROJ_ASC', label: 'Saldo projetado — menor para maior' },
  { id: 'REPRES_FAT_DESC', label: 'Representatividade faturamento % — maior para menor' },
  { id: 'REPRES_FAT_ASC', label: 'Representatividade faturamento % — menor para maior' },
  { id: 'RISCO_CRITICIDADE', label: 'Risco — maior criticidade primeiro' },
]

export interface ItemCarteiraGeralEnriquecido {
  item: ItemCurvaAbcCalculado
  mediaDiariaTons: number | null
  mediaDiariaTexto: string
  diasEstoque: number | null
  diasEstoqueTexto: string
  diasEstoqueNivel: 'CRITICO' | 'ATENCAO' | 'CONFORTAVEL' | 'INFORMATIVO'
  dataFimEstoqueDate: Date | null
  dataFimEstoqueTexto: string
  diasEstoqueNegativo: number | null
  diasEstoqueNegativoTexto: string
  isEstoqueNegativo: boolean
  faturamentoTons: number
  representatividadeFatPct: number
  representatividadeFatTexto: string
  ordemRisco: number
}

export function classificarDiasEstoqueNivel(
  dias: number | null,
  limiteCritico = 5,
  limiteAtencao = 15,
): 'CRITICO' | 'ATENCAO' | 'CONFORTAVEL' | 'INFORMATIVO' {
  if (dias === null || isNaN(dias)) return 'INFORMATIVO'
  if (dias <= limiteCritico) return 'CRITICO'
  if (dias <= limiteAtencao) return 'ATENCAO'
  return 'CONFORTAVEL'
}

export function enriquecerItensCarteiraGeral(
  itensFiltrados: ItemCurvaAbcCalculado[],
  entradasFuturas: any[] = [],
): ItemCarteiraGeralEnriquecido[] {
  const dadosBase = itensFiltrados.map((it) => {
    let faturamentoTons = 0
    try {
      const orig = it.origemItemOriginal as CarteiraItem | CarteiraSDCItem | undefined
      if (orig) {
        if (
          'qtd_faturada_tons' in orig &&
          typeof orig.qtd_faturada_tons === 'number' &&
          !isNaN(orig.qtd_faturada_tons)
        ) {
          faturamentoTons = Math.max(0, orig.qtd_faturada_tons)
        } else if (
          'faturamento_mensal_estimado_t' in orig &&
          typeof (orig as any).faturamento_mensal_estimado_t === 'number'
        ) {
          faturamentoTons = Math.max(0, Number((orig as any).faturamento_mensal_estimado_t))
        }
      }
    } catch {
      faturamentoTons = 0
    }
    return { it, faturamentoTons }
  })

  const totalFaturamentoFiltradoT = dadosBase.reduce((sum, d) => sum + d.faturamentoTons, 0)

  return dadosBase.map(({ it, faturamentoTons }) => {
    const orig = it.origemItemOriginal
    let resultadoCobertura: any = null

    try {
      if (orig) {
        if ('carteira_t' in orig && 'material' in orig) {
          const input = CoberturaTemporalEngine.converterCarteiraSDCParaInput(orig, entradasFuturas)
          resultadoCobertura = CoberturaTemporalEngine.calcular(input)
        } else {
          const input = CoberturaTemporalEngine.converterCarteiraItemParaInput(
            orig,
            'GERAL',
            entradasFuturas,
          )
          resultadoCobertura = CoberturaTemporalEngine.calcular(input)
        }
      }
    } catch {
      resultadoCobertura = null
    }

    let mediaDiariaTons: number | null = null
    let mediaDiariaTexto = 'Sem consumo histórico'

    if (
      resultadoCobertura?.temHistorico &&
      typeof resultadoCobertura.mediaDiariaFaturamentoT === 'number' &&
      resultadoCobertura.mediaDiariaFaturamentoT > 0
    ) {
      mediaDiariaTons = resultadoCobertura.mediaDiariaFaturamentoT
      mediaDiariaTexto = `${formatNumberPTBR(mediaDiariaTons, 2)} t/dia`
    } else if (faturamentoTons > 0) {
      const calcMedia = Number((faturamentoTons / 90).toFixed(2))
      if (calcMedia > 0) {
        mediaDiariaTons = calcMedia
        mediaDiariaTexto = `${formatNumberPTBR(mediaDiariaTons, 2)} t/dia`
      }
    }

    let diasEstoque: number | null = null
    let diasEstoqueTexto = 'Sem consumo histórico'
    let diasEstoqueNivel: 'CRITICO' | 'ATENCAO' | 'CONFORTAVEL' | 'INFORMATIVO' = 'INFORMATIVO'

    if (mediaDiariaTons !== null && mediaDiariaTons > 0) {
      const estoqueDisp = Math.max(0, it.estoque_disponivel_tons || 0)
      diasEstoque = Number((estoqueDisp / mediaDiariaTons).toFixed(1))
      diasEstoqueTexto = `${formatNumberPTBR(diasEstoque, 1)} dias`
      diasEstoqueNivel = classificarDiasEstoqueNivel(diasEstoque)
    }

    let dataFimEstoqueDate: Date | null = null
    let dataFimEstoqueTexto = 'Sem previsão'

    if (resultadoCobertura?.dataFimEstoqueDate) {
      dataFimEstoqueDate = resultadoCobertura.dataFimEstoqueDate
      dataFimEstoqueTexto = CoberturaTemporalEngine.formatarDataBR(dataFimEstoqueDate)
    } else if (diasEstoque !== null && mediaDiariaTons !== null) {
      const base = new Date()
      dataFimEstoqueDate = CoberturaTemporalEngine.somarDiasData(base, diasEstoque, 'DIAS_CORRIDOS')
      dataFimEstoqueTexto = CoberturaTemporalEngine.formatarDataBR(dataFimEstoqueDate)
    }

    let diasEstoqueNegativo: number | null = null
    let diasEstoqueNegativoTexto = '0 dias'
    let isEstoqueNegativo = (it.saldo_projetado_tons || 0) < 0 || (it.deficit_tons || 0) > 0

    if (
      resultadoCobertura?.diasEstoqueNegativo !== null &&
      resultadoCobertura?.diasEstoqueNegativo !== undefined
    ) {
      diasEstoqueNegativo = resultadoCobertura.diasEstoqueNegativo
      diasEstoqueNegativoTexto = `${diasEstoqueNegativo} dias`
      if (diasEstoqueNegativo > 0) isEstoqueNegativo = true
    } else if (isEstoqueNegativo) {
      diasEstoqueNegativoTexto = '5 dias'
      diasEstoqueNegativo = 5
    }

    let representatividadeFatPct = 0
    let representatividadeFatTexto = '0,00 %'

    if (totalFaturamentoFiltradoT > 0 && faturamentoTons > 0) {
      representatividadeFatPct = Number(
        ((faturamentoTons / totalFaturamentoFiltradoT) * 100).toFixed(2),
      )
      representatividadeFatTexto = `${formatNumberPTBR(representatividadeFatPct, 2)} %`
    }

    const ordemRisco = it.risco === 'CRITICO' ? 3 : it.risco === 'ATENCAO' ? 2 : 1

    return {
      item: it,
      mediaDiariaTons,
      mediaDiariaTexto,
      diasEstoque,
      diasEstoqueTexto,
      diasEstoqueNivel,
      dataFimEstoqueDate,
      dataFimEstoqueTexto,
      diasEstoqueNegativo,
      diasEstoqueNegativoTexto,
      isEstoqueNegativo,
      faturamentoTons,
      representatividadeFatPct,
      representatividadeFatTexto,
      ordemRisco,
    }
  })
}

function compareNullable<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  comparator: (x: T, y: T) => number,
): number {
  const hasA = a !== null && a !== undefined && !Number.isNaN(a as any)
  const hasB = b !== null && b !== undefined && !Number.isNaN(b as any)
  if (!hasA && !hasB) return 0
  if (!hasA) return 1
  if (!hasB) return -1
  return comparator(a as T, b as T)
}

export function ordenarItensCarteiraGeral(
  itens: ItemCarteiraGeralEnriquecido[],
  criterio: OrdenacaoCarteiraGeralOpcao,
): ItemCarteiraGeralEnriquecido[] {
  const lista = [...itens]

  return lista.sort((a, b) => {
    switch (criterio) {
      case 'MATERIAL_DESCRICAO': {
        const descA = (a.item.descricao_material || '').trim().toLowerCase()
        const descB = (b.item.descricao_material || '').trim().toLowerCase()
        return compareNullable(descA || null, descB || null, (x, y) => x.localeCompare(y, 'pt-BR'))
      }
      case 'CODIGO': {
        const codA = (a.item.codigo_material || '').trim()
        const codB = (b.item.codigo_material || '').trim()
        return compareNullable(codA || null, codB || null, (x, y) => x.localeCompare(y, 'pt-BR'))
      }
      case 'CARTEIRA_DESC':
        return compareNullable(a.item.carteira_tons, b.item.carteira_tons, (x, y) => y - x)
      case 'CARTEIRA_ASC':
        return compareNullable(a.item.carteira_tons, b.item.carteira_tons, (x, y) => x - y)
      case 'ESTOQUE_DESC':
        return compareNullable(
          a.item.estoque_disponivel_tons,
          b.item.estoque_disponivel_tons,
          (x, y) => y - x,
        )
      case 'ESTOQUE_ASC':
        return compareNullable(
          a.item.estoque_disponivel_tons,
          b.item.estoque_disponivel_tons,
          (x, y) => x - y,
        )
      case 'MEDIA_FAT_DESC':
        return compareNullable(a.mediaDiariaTons, b.mediaDiariaTons, (x, y) => y - x)
      case 'MEDIA_FAT_ASC':
        return compareNullable(a.mediaDiariaTons, b.mediaDiariaTons, (x, y) => x - y)
      case 'DIAS_ESTOQUE_ASC':
        return compareNullable(a.diasEstoque, b.diasEstoque, (x, y) => x - y)
      case 'DIAS_ESTOQUE_DESC':
        return compareNullable(a.diasEstoque, b.diasEstoque, (x, y) => y - x)
      case 'DATA_FIM_PROXIMA':
        return compareNullable(
          a.dataFimEstoqueDate?.getTime(),
          b.dataFimEstoqueDate?.getTime(),
          (x, y) => x - y,
        )
      case 'DATA_FIM_DISTANTE':
        return compareNullable(
          a.dataFimEstoqueDate?.getTime(),
          b.dataFimEstoqueDate?.getTime(),
          (x, y) => y - x,
        )
      case 'DIAS_NEGATIVO_DESC':
        return compareNullable(a.diasEstoqueNegativo, b.diasEstoqueNegativo, (x, y) => y - x)
      case 'DEFICIT_DESC':
        return compareNullable(a.item.deficit_tons, b.item.deficit_tons, (x, y) => y - x)
      case 'SALDO_PROJ_ASC':
        return compareNullable(
          a.item.saldo_projetado_tons,
          b.item.saldo_projetado_tons,
          (x, y) => x - y,
        )
      case 'REPRES_FAT_DESC':
        return compareNullable(
          a.representatividadeFatPct || null,
          b.representatividadeFatPct || null,
          (x, y) => y - x,
        )
      case 'REPRES_FAT_ASC':
        return compareNullable(
          a.representatividadeFatPct || null,
          b.representatividadeFatPct || null,
          (x, y) => x - y,
        )
      case 'RISCO_CRITICIDADE':
        return b.ordemRisco - a.ordemRisco
      default:
        return 0
    }
  })
}
