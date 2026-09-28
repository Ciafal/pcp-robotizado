/**
 * Tipos Oficiais da Visão Diária de Análise de Desvios
 * CIAFAL PCP Robotizado
 *
 * Hierarquia: DIA -> TURNO -> ORDEM DE PRODUÇÃO -> MATERIAL
 */

export interface DailyDeviationFilterParams {
  plantCode?: string // Centro SAP / Planta (ex: 1000, 2000, ALL)
  lineCode?: string // Linha PCP (L1, L2, ALL)
  date?: string // Formato YYYY-MM-DD
  datePreset?: 'yesterday' | 'today' | 'tomorrow' | 'custom'
  shift?: string // '1º Turno' | '2º Turno' | '3º Turno' | 'ALL'
  productionOrder?: string // Filtro por OP
  material?: string // Filtro por código ou descrição do material
  nature?: string // 'PRODUCAO_PROPRIA' | 'INDUSTRIALIZACAO' | 'TODAS'
  status?: string // 'ALL' | 'DENTRO' | 'ABAIXO' | 'ACIMA' | 'NAO_INICIADO' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'PARADA'
}

export type DeviationSituation =
  | 'DENTRO' // Dentro da programação (|desvio %| <= 5% ou dentro da tolerância)
  | 'ABAIXO' // Abaixo da programação
  | 'ACIMA' // Acima da programação
  | 'NAO_INICIADO' // Não iniciado
  | 'EM_ANDAMENTO' // Em andamento
  | 'CONCLUIDO' // Concluído
  | 'PARADA' // Parada operacional/programada

export interface DailyDeviationItem {
  id: string
  sequence: number
  dateIso: string // YYYY-MM-DD
  dateDisplay: string // dd/mm/aaaa
  dayOfWeek: string // Segunda-feira, Terça-feira, etc.
  dayOfWeekShort: string // Seg, Ter, Qua...
  shiftCode: string // T1_L1, TURNO_1, etc.
  shiftDisplay: string // 1º Turno, 2º Turno, 3º Turno
  crewName: string // Turma A, Turma B, Manutenção
  plantCode: string // 1000, 2000, PLANTA_1
  plantName: string
  lineCode: string // L1, L2
  lineName: string
  // Coluna OBRIGATÓRIA Ordem de Produção
  productionOrder: string // Real ou "OP não disponível" / "Aguardando integração"
  hasRealProductionOrder: boolean
  materialCode: string
  materialDescription: string
  steelGrade?: string
  dimensions?: string
  orderType?: 'MTS' | 'MTO' | 'INDUSTRIALIZACAO'
  productionNature: 'PRODUCAO_PROPRIA' | 'INDUSTRIALIZACAO'
  // Planejado
  plannedVolumeTons: number
  plannedRateTh: number
  plannedHours: number
  plannedStart: string | null // ISO ou HH:mm
  plannedEnd: string | null
  // Realizado
  realizedVolumeTons: number | null
  realizedRateTh: number | null
  realizedHours: number | null
  realStart: string | null
  realEnd: string | null
  hasMesData: boolean
  // Desvio
  deviationTons: number | null // Realizado - Programado
  deviationPct: number | null // ((Realizado - Programado) / Programado) * 100 com blindagem
  situation: DeviationSituation
  situationLabel: string
  statusDisplay: string
  // Detalhes adicionais para o drawer
  rawMaterialType?: string
  stopsCount?: number
  stopsDurationMinutes?: number
  notes?: string
  sourceOrigin: 'WEEKLY_SCHEDULE' | 'MES_ORDER' | 'HYBRID'
}

export interface DailyShiftConsolidation {
  shiftCode: string
  shiftDisplay: string // 1º Turno, 2º Turno, 3º Turno
  plannedTons: number
  realizedTons: number | null
  deviationTons: number | null
  deviationPct: number | null
  ordersCount: number
  materialsCount: number
  itemsCount: number
}

export interface DailySummaryCardsData {
  totalPlannedTons: number
  totalRealizedTons: number | null
  deviationTons: number | null
  deviationPct: number | null
  totalPlannedHours: number
  totalRealizedHours: number | null
  ordersCount: number
  materialsCount: number
  producingShiftsCount: number // Quantidade de turnos com produção
  mainDeviations: Array<{
    material: string
    op: string
    deviationTons: number
    deviationPct: number
    situation: DeviationSituation
  }>
}

export interface DailyDeviationDataResult {
  items: DailyDeviationItem[]
  shifts: DailyShiftConsolidation[]
  summary: DailySummaryCardsData
  availableDates: string[] // Lista de datas com dados cadastrados (YYYY-MM-DD)
  selectedDateIso: string
  fetchedAt: string
}
