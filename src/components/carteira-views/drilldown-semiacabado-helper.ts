import { CarteiraItem } from '@/types/carteira-analise'
import { DrilldownCardConfig, ColunaDrill } from './DrilldownCardModal'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import { saldoSemiacabadoItemTons } from './SaldoSemiacabadoCard'

export interface LinhaDrillGenerica {
  material: string
  descricao: string
  familia: string
  origem: string
  curva: string
  valor_tons: number
  itemOriginal: CarteiraItem
}

const fmtT = (v: number) => formatNumberPTBR(v, 2)

const colunasNivel2: ColunaDrill<LinhaDrillGenerica>[] = [
  { key: 'material', label: 'Material' },
  { key: 'descricao', label: 'Descrição' },
  { key: 'familia', label: 'Família' },
  { key: 'origem', label: 'Origem' },
  { key: 'curva', label: 'Curva' },
  {
    key: 'valor_tons',
    label: 'Semiacabado (t)',
    align: 'right',
    render: (l) => fmtT(l.valor_tons),
  },
]

const colunasNivel3: ColunaDrill<Record<string, any>>[] = [
  { key: 'componente', label: 'Componente' },
  {
    key: 'valor_tons',
    label: 'Valor (t)',
    align: 'right',
    render: (l) => fmtT(l.valor_tons),
  },
]

function buildNivel3Semiacabado(l: LinhaDrillGenerica): Record<string, any>[] {
  const it = l.itemOriginal
  const ciafal = it.estoque_semiacabado_ciafal_tons ?? it.estoque_semiacabado_tons ?? 0
  const vallourec = it.estoque_semiacabado_vallourec_tons ?? 0
  return [
    { componente: 'Semiacabado CIAFAL (ou consolidado)', valor_tons: ciafal },
    { componente: 'Semiacabado Vallourec', valor_tons: vallourec },
    { componente: 'Total Semiacabado', valor_tons: ciafal + vallourec },
  ]
}

export interface CtxDrilldownSemiacabadoGenerico {
  nomeVisao: string
  centroLinha: string
  itens: CarteiraItem[]
  mapaCurva?: Map<string, string>
  filtrosHerdados?: Record<string, string>
}

/**
 * Construtor padrão e matematicamente exato para o drill-down de Saldo Semiacabado
 * nas visões Carteira MTO, Carteira Revenda e Carteira Importado.
 */
export function buildConfigSemiacabadoGenerico(
  ctx: CtxDrilldownSemiacabadoGenerico,
): DrilldownCardConfig<LinhaDrillGenerica> {
  const { nomeVisao, centroLinha, itens, mapaCurva, filtrosHerdados } = ctx

  const linhas: LinhaDrillGenerica[] = itens
    .map((it) => {
      const v = saldoSemiacabadoItemTons(it)
      return {
        material: it.codigo_material,
        descricao: it.descricao_material || '',
        familia: it.familia || 'DIVERSOS',
        origem: it.origem_produto || '',
        curva: mapaCurva?.get(it.codigo_material) || 'C',
        valor_tons: v,
        itemOriginal: it,
      }
    })
    .filter((l) => l.valor_tons > 0)
    .sort((a, b) => b.valor_tons - a.valor_tons)

  const valorNumerico = linhas.reduce((s, l) => s + l.valor_tons, 0)

  return {
    tituloCard: 'Saldo Semiacabado',
    nomeVisao,
    valorConsolidado: `${fmtT(valorNumerico)} t`,
    composicao: [
      {
        rotulo: 'Σ Saldo Semiacabado (CIAFAL + Vallourec)',
        valor: `${fmtT(valorNumerico)} t`,
        operador: '=',
        destaque: true,
      },
    ],
    fonteDados: 'SAP RFC ZSD28C via carteira-engine',
    centroLinha,
    filtrosHerdados,
    linhas,
    colunas: colunasNivel2,
    colunasNivel3,
    buildNivel3: buildNivel3Semiacabado,
    filtrosLocais: ['familia', 'origem', 'curva'],
    valorNumerico,
    extrairValorLinha: (l) => l.valor_tons,
  }
}
