/**
 * Catálogo Oficial de Motivos de Restrições Mínimas de Produção
 * PCP Robotizado HUB Ciafal
 *
 * 10 Categorias estruturadas com seus respectivos motivos e priorizações por Tipo da Restrição.
 */

import { RestrictionType } from './line-gauge-restriction'

export interface RestrictionReasonItem {
  id: string
  label: string
  category: string
}

export interface RestrictionReasonCategory {
  category: string
  items: string[]
}

/**
 * Categorias oficiais e lista completa de motivos (verbatim dos requisitos)
 */
export const RESTRICTION_REASON_CATEGORIES: RestrictionReasonCategory[] = [
  {
    category: 'Aço e composição',
    items: [
      'Tipo de aço',
      'Família de aço',
      'Grau do aço',
      'Composição química',
      'Incompatibilidade química entre sequências',
      'Restrição metalúrgica',
      'Mudança de qualidade do aço',
    ],
  },
  {
    category: 'Matéria-prima',
    items: [
      'Dimensões da matéria-prima',
      'Bitola da matéria-prima',
      'Comprimento da matéria-prima',
      'Seção da matéria-prima',
      'Peso da matéria-prima',
      'Tipo de matéria-prima',
      'Fornecedor da matéria-prima',
      'Lote da matéria-prima',
      'Disponibilidade de matéria-prima',
      'Necessidade de preparação da matéria-prima',
      'Mistura de lotes não permitida',
    ],
  },
  {
    category: 'Forno / reaquecimento',
    items: [
      'Forno de reaquecimento',
      'Temperatura de enfornamento',
      'Temperatura mínima de processo',
      'Temperatura máxima de processo',
      'Tempo mínimo de permanência no forno',
      'Tempo máximo de permanência no forno',
      'Capacidade do forno',
      'Ocupação do forno',
      'Zona do forno',
      'Sequência de carregamento do forno',
    ],
  },
  {
    category: 'Enfornamento',
    items: [
      'Enfornamento intercalado',
      'Enfornamento quente',
      'Enfornamento frio',
      'Enfornamento frente',
      'Enfornamento normal',
      'Enfornamento em tapete',
      'Carga mínima de enfornamento',
      'Carga máxima de enfornamento',
      'Quantidade mínima por carga',
      'Quantidade máxima por carga',
      'Sequência de enfornamento',
      'Compatibilidade de materiais na mesma carga',
      'Restrição de mistura de materiais na carga',
    ],
  },
  {
    category: 'Bitola / dimensão',
    items: [
      'Bitola DE/PARA',
      'Bitola mínima',
      'Bitola máxima',
      'Salto máximo de bitola',
      'Salto mínimo de bitola',
      'Sequência crescente de bitola',
      'Sequência decrescente de bitola',
      'Dimensão do produto',
      'Família dimensional',
      'Perfil do produto',
    ],
  },
  {
    category: 'Qualidade',
    items: [
      'Qualidade superficial',
      'Defeito superficial',
      'Qualidade dimensional',
      'Tolerância dimensional',
      'Requisito especial do cliente',
      'Requisito de inspeção',
      'Necessidade de ensaio',
      'Necessidade de amostragem',
      'Produto bloqueado pela Qualidade',
      'Material em análise pela Qualidade',
      'Restrição por lote',
      'Restrição por corrida',
      'Rastreabilidade obrigatória',
    ],
  },
  {
    category: 'Montagem / preparação de linha',
    items: [
      'Montagem específica',
      'Montagem incompatível',
      'Troca de montagem',
      'Tempo mínimo de montagem',
      'Tempo mínimo entre montagens',
      'Ferramental específico',
      'Disponibilidade de ferramental',
      'Canal / guia específica',
      'Gaiola específica',
      'Cilindro específico',
      'Preparação de equipamento',
      'Regulagem específica',
      'Setup obrigatório',
      'Acerto obrigatório',
    ],
  },
  {
    category: 'Sequenciamento',
    items: [
      'Sequência ideal de bitolas',
      'Sequência obrigatória de produtos',
      'Sequência proibida de produtos',
      'Produto predecessor obrigatório',
      'Produto sucessor obrigatório',
      'Família predecessor obrigatória',
      'Família sucessora obrigatória',
      'Incompatibilidade de sequência',
      'Campanha mínima',
      'Campanha máxima',
      'Permanência mínima na mesma bitola',
      'Permanência mínima na mesma família',
      'Permanência mínima no mesmo aço',
      'Quantidade mínima antes da troca',
      'Intervalo mínimo entre produtos',
      'Intervalo mínimo entre famílias',
      'Restrição de troca de perfil',
    ],
  },
  {
    category: 'Processo / produção',
    items: [
      'Capacidade produtiva',
      'Limitação operacional',
      'Limitação de equipamento',
      'Disponibilidade de equipamento',
      'Condição operacional da linha',
      'Parada programada',
      'Manutenção programada',
      'Necessidade de limpeza',
      'Necessidade de inspeção do equipamento',
      'Restrição de produtividade',
      'Restrição de velocidade',
      'Restrição térmica',
    ],
  },
  {
    category: 'PCP / planejamento',
    items: [
      'Campanha de produção',
      'Atendimento de carteira',
      'Prioridade comercial',
      'Prioridade de matéria-prima',
      'MTO',
      'Estoque mínimo',
      'Estoque máximo',
      'Formação de estoque',
      'Necessidade de sincronismo com outro centro',
      'Programação derivada',
      'Dependência de outro centro produtivo',
    ],
  },
]

/**
 * Lista plana de todos os motivos com categoria associada
 */
export const ALL_RESTRICTION_REASONS: RestrictionReasonItem[] =
  RESTRICTION_REASON_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({ id: item, label: item, category: cat.category })),
  )

/**
 * Mapa de categoria para cada motivo (lookup O(1))
 */
export const REASON_TO_CATEGORY_MAP: Record<string, string> = ALL_RESTRICTION_REASONS.reduce(
  (acc, item) => {
    acc[item.label] = item.category
    return acc
  },
  {} as Record<string, string>,
)

/**
 * Regras de priorização especificada no Requisito 3:
 * Ao selecionar o Tipo, os motivos mais relacionados aparecem PRIMEIRO na lista,
 * sem bloquear os demais — todos continuam selecionáveis.
 */
export const TYPE_PRIORITY_REASONS: Record<string, string[]> = {
  Horas: [
    'Permanência mínima na mesma bitola',
    'Permanência mínima na mesma família',
    'Permanência mínima no mesmo aço',
    'Tempo mínimo de montagem',
    'Tempo mínimo entre montagens',
    'Intervalo mínimo entre produtos',
    'Tempo mínimo de permanência no forno',
    'Setup obrigatório',
    'Acerto obrigatório',
  ],
  Dias: [
    'Campanha de produção',
    'Permanência mínima na mesma família',
    'Permanência mínima no mesmo aço',
    'Formação de estoque',
    'Parada programada',
    'Manutenção programada',
    'Atendimento de carteira',
  ],
  Quantidade: [
    'Quantidade mínima antes da troca',
    'Carga mínima de enfornamento',
    'Carga máxima de enfornamento',
    'Quantidade mínima por carga',
    'Quantidade máxima por carga',
    'Campanha mínima',
    'Campanha máxima',
    'Estoque mínimo',
    'Formação de estoque',
  ],
  'Carga de Enfornamento': [
    // todos os motivos de matéria-prima, forno, carga e enfornamento, e compatibilidade de materiais
    ...(RESTRICTION_REASON_CATEGORIES.find((c) => c.category === 'Enfornamento')?.items || []),
    ...(RESTRICTION_REASON_CATEGORIES.find((c) => c.category === 'Forno / reaquecimento')?.items ||
      []),
    ...(RESTRICTION_REASON_CATEGORIES.find((c) => c.category === 'Matéria-prima')?.items || []),
    'Compatibilidade de materiais na mesma carga',
    'Restrição de mistura de materiais na carga',
  ],
  Qualidade: [
    'Qualidade superficial',
    'Qualidade dimensional',
    'Composição química',
    'Tolerância dimensional',
    'Requisito especial do cliente',
    'Requisito de inspeção',
    'Necessidade de ensaio',
    'Necessidade de amostragem',
    'Lote da matéria-prima',
    'Restrição por lote',
    'Restrição por corrida',
    'Produto bloqueado pela Qualidade',
    'Material em análise pela Qualidade',
    'Rastreabilidade obrigatória',
  ],
  Montagem: [
    'Montagem específica',
    'Montagem incompatível',
    'Troca de montagem',
    'Ferramental específico',
    'Disponibilidade de ferramental',
    'Canal / guia específica',
    'Gaiola específica',
    'Cilindro específico',
    'Preparação de equipamento',
    'Regulagem específica',
    'Setup obrigatório',
    'Acerto obrigatório',
  ],
  Sequenciamento: [
    'Bitola DE/PARA',
    'Sequência ideal de bitolas',
    'Sequência obrigatória de produtos',
    'Sequência proibida de produtos',
    'Produto predecessor obrigatório',
    'Produto sucessor obrigatório',
    'Família predecessor obrigatória',
    'Família sucessora obrigatória',
    'Incompatibilidade de sequência',
    'Permanência mínima no mesmo aço',
    'Permanência mínima na mesma família',
    'Permanência mínima na mesma bitola',
    'Campanha mínima',
    'Campanha máxima',
  ],
}

/**
 * Placeholders dinâmicos por Tipo da Restrição (Requisito 4)
 */
export const TYPE_PLACEHOLDERS: Record<string, string> = {
  Horas:
    'Ex.: Manter no mínimo 8 horas consecutivas de produção da mesma bitola antes de permitir troca.',
  Dias: 'Ex.: Permanecer no mínimo 2 dias na mesma família de produtos antes da mudança de campanha.',
  Quantidade: 'Ex.: Produzir no mínimo 150 t da mesma família antes de autorizar nova sequência.',
  'Carga de Enfornamento':
    'Ex.: Permitir no máximo duas bitolas diferentes na mesma carga de enfornamento.',
  Qualidade:
    'Ex.: Não programar imediatamente após produto com requisito de qualidade superficial crítica.',
  Montagem:
    'Ex.: Após montagem X, priorizar produtos compatíveis antes de realizar nova troca de montagem.',
  Sequenciamento: 'Ex.: A bitola 12,70 mm somente poderá ser programada após 15,88 mm ou 14,29 mm.',
}

/**
 * Retorna os motivos ordenados conforme o Tipo selecionado e agrupados com seção priorizada.
 * Se houver termo de busca, filtra ignorando maiúsculas e acentos.
 */
export function getOrderedRestrictionReasons(
  restrictionType: RestrictionType,
  searchTerm: string = '',
): { prioritized: RestrictionReasonItem[]; others: RestrictionReasonItem[] } {
  const normSearch = searchTerm
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  const priorityLabels = TYPE_PRIORITY_REASONS[restrictionType] || []
  const prioritySet = new Set(
    priorityLabels.map((l) =>
      l
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim(),
    ),
  )

  const matchesSearch = (item: RestrictionReasonItem) => {
    if (!normSearch) return true
    const normLabel = item.label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    const normCategory = item.category
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return normLabel.includes(normSearch) || normCategory.includes(normSearch)
  }

  const prioritized: RestrictionReasonItem[] = []
  const others: RestrictionReasonItem[] = []

  // Preservar itens deduplicados
  const addedLabels = new Set<string>()

  // 1. Priorizados primeiro na ordem especificada
  for (const prioLabel of priorityLabels) {
    const found = ALL_RESTRICTION_REASONS.find(
      (it) =>
        it.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim() ===
        prioLabel
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim(),
    )
    if (found && !addedLabels.has(found.label)) {
      addedLabels.add(found.label)
      if (matchesSearch(found)) {
        prioritized.push(found)
      }
    }
  }

  // 2. Demais motivos ordenados por categoria e nome
  for (const item of ALL_RESTRICTION_REASONS) {
    if (!addedLabels.has(item.label)) {
      addedLabels.add(item.label)
      if (matchesSearch(item)) {
        others.push(item)
      }
    }
  }

  return { prioritized, others }
}

export {
  RESTRICTION_TYPES,
  RESTRICTION_TYPE_LABELS,
  ORDERED_RESTRICTION_TYPES,
  RESTRICTION_TYPE_OPTIONS,
  QUANTITY_UNITS,
  DEFAULT_UNITS_BY_TYPE,
  RESTRICTION_RULE_PLACEHOLDERS,
  type RestrictionType,
  type RestrictionUnit,
  type LineGaugeMinRestriction,
  type GaugeMinRestrictionEvaluation as GaugeRestrictionEvaluationResult,
} from './line-gauge-restriction'
export type ReasonItem = RestrictionReasonItem
export const RESTRICTION_REASONS_CATALOG = ALL_RESTRICTION_REASONS.map((item) => ({
  ...item,
  reason: item.label,
}))

export function getReasonCategory(reason: string): string {
  return REASON_TO_CATEGORY_MAP[reason] || 'Outros'
}

export type PrioritizedReasonItem = RestrictionReasonItem & {
  reason: string
}

export function getPrioritizedReasonsForType(
  type: RestrictionType,
): Array<PrioritizedReasonItem> & {
  prioritized: PrioritizedReasonItem[]
  others: PrioritizedReasonItem[]
  prioritizedCount: number
} {
  const result = getOrderedRestrictionReasons(type)
  const mapItem = (item: RestrictionReasonItem): PrioritizedReasonItem => ({
    ...item,
    reason: item.label,
  })

  const prioritizedMapped = result.prioritized.map(mapItem)
  const othersMapped = result.others.map(mapItem)
  const combined = [...prioritizedMapped, ...othersMapped]

  const output = combined as Array<PrioritizedReasonItem> & {
    prioritized: PrioritizedReasonItem[]
    others: PrioritizedReasonItem[]
    prioritizedCount: number
  }

  output.prioritized = prioritizedMapped
  output.others = othersMapped
  output.prioritizedCount = prioritizedMapped.length

  return output
}
