/**
 * MOTOR DE EXECUÇÃO, DIVERGÊNCIAS SAP, RETRABALHO E INTEGRIDADE BLOCO K CIAFAL
 * Requisitos:
 * 14. Divergência SAP x Físico: Aberta, Em investigação, Ajuste necessário, Aguardando SAP/WMS, Validada, Encerrada.
 * 15. Cadastro de Materiais Governança SAP Master
 * 16. Tipos de Programação Parametrizáveis
 * 17. Retrabalho Kanban Completo
 * 18. MTO Gestão Integral de Sobras
 * 19. Previsto x Realizado Inteligente com Aprendizado e Reprogramação
 * 20. Sazonalidade / Calendário Anual de Premissas
 * 21. Inventário Arcelor e Eventos Especiais de PCP
 * 22. Argolas / Sidercentro Geração e Consumo
 * 23. Integridade SAP / Cockpit Bloco K (COGI, CO1P, BOM, Erros)
 * 24. Versionamento e Validação Semântica de Justificativas
 * 25. Alertas Intermodulares (MES, CRM, WMS, PCM, Qualidade)
 */

// 14. DIVERGÊNCIA SAP X ESTOQUE FÍSICO
export type DivergenceStatus =
  | 'ABERTA'
  | 'EM_INVESTIGACAO'
  | 'AJUSTE_NECESSARIO'
  | 'AGUARDANDO_SAP_WMS'
  | 'VALIDADA'
  | 'ENCERRADA'

export interface SapPhysicalDivergence {
  id: string
  materialCode: string
  materialDescription: string
  batchNumber: string
  warehouseCode: string
  sapStockTons: number
  physicalStockTons: number
  differenceTons: number
  responsibleName: string
  investigationCause?: string
  correctionAction?: string
  status: DivergenceStatus
  blockProgramming: boolean
  createdAt: string
  resolvedAt?: string
}

// 16. TIPOS DE PROGRAMAÇÃO
export interface ProgrammingTypeDefinition {
  id: string
  code:
    | 'LAMINACAO'
    | 'ACABAMENTO'
    | 'RETRABALHO'
    | 'ENVIO'
    | 'MULTIPLO'
    | 'INSPECAO'
    | 'ENFORNAMENTO'
    | 'PREPARACAO'
    | 'ARGOLA'
  name: string
  colorHex: string
  allowedLines: string[]
  requiresSpecialSetup: boolean
  capacityWeightFactor: number // ex: 1.0 = 100%, 0.7 = 70%
  description: string
}

export const DEFAULT_PROGRAMMING_TYPES: ProgrammingTypeDefinition[] = [
  {
    id: 'PT_LAM',
    code: 'LAMINACAO',
    name: 'Laminação Padrão',
    colorHex: '#004C97',
    allowedLines: ['L1', 'L2', 'SDC'],
    requiresSpecialSetup: true,
    capacityWeightFactor: 1.0,
    description: 'Laminação primária a quente de tarugos e blocos',
  },
  {
    id: 'PT_ACAB',
    code: 'ACABAMENTO',
    name: 'Acabamento & Tratamento',
    colorHex: '#0D9488',
    allowedLines: ['ENDL1', 'ACABL2'],
    requiresSpecialSetup: false,
    capacityWeightFactor: 1.0,
    description: 'Desempeno, corte a frio, chanfro e embalagem',
  },
  {
    id: 'PT_RETRAB',
    code: 'RETRABALHO',
    name: 'Retrabalho Dimensional/Superficial',
    colorHex: '#D97706',
    allowedLines: ['L1', 'L2', 'ENDL1', 'ACABL2'],
    requiresSpecialSetup: true,
    capacityWeightFactor: 0.8,
    description: 'Reconformação de lote reprovado por qualidade',
  },
  {
    id: 'PT_ARGOLA',
    code: 'ARGOLA',
    name: 'Laminação / Conformação de Argola',
    colorHex: '#7C3AED',
    allowedLines: ['SDC', 'L2'],
    requiresSpecialSetup: true,
    capacityWeightFactor: 0.9,
    description: 'Processamento de pontas e LD para anéis/argolas SDC',
  },
  {
    id: 'PT_INSP',
    code: 'INSPECAO',
    name: 'Inspeção & Teste Metalúrgico',
    colorHex: '#4F46E5',
    allowedLines: ['L1', 'L2', 'ENDL1', 'ACABL2', 'KS'],
    requiresSpecialSetup: false,
    capacityWeightFactor: 0.5,
    description: 'Acompanhamento SGQ, ensaios não destrutivos e ultrassom',
  },
  {
    id: 'PT_ENF',
    code: 'ENFORNAMENTO',
    name: 'Enfornamento / Aquecimento',
    colorHex: '#EA580C',
    allowedLines: ['L1', 'L2', 'SDC'],
    requiresSpecialSetup: true,
    capacityWeightFactor: 1.0,
    description: 'Preparação e carga do forno contínuo',
  },
]

// 17. RETRABALHO KANBAN
export type RetrabalhoStatus =
  | 'IDENTIFICADO'
  | 'AGUARDANDO_AVALIACAO'
  | 'APROVADO'
  | 'PROGRAMADO'
  | 'EM_EXECUCAO'
  | 'AGUARDANDO_INSPECAO'
  | 'LIBERADO'
  | 'ENCERRADO'

export interface RetrabalhoItem {
  id: string
  origin: 'PROCESSO' | 'ESTOQUE' | 'QUALIDADE' | 'DEVOLUCAO_CLIENTE' | 'LOTE_PERDIDO' | 'INSPECAO'
  materialCode: string
  materialDescription: string
  batchNumber: string
  orderNumber: string
  lineOrigin: string
  quantityTons: number
  defectCause: string
  currentLocation: string
  correctiveAction: string
  responsibleName: string
  deadline: string
  status: RetrabalhoStatus
  targetLine: string
  inspectionApprovedAt?: string
  closedAt?: string
}

// 20. SAZONALIDADE & CALENDÁRIO DE PREMISSAS
export interface SeasonalPremise {
  id: string
  year: number
  startDate: string
  endDate: string
  name: string
  eventType:
    | 'PARADA_ANUAL'
    | 'RETORNO_FERIAS'
    | 'CURVA_RETOMADA'
    | 'INVENTARIO'
    | 'FERIADO'
    | 'CAMPANHA_ESPECIAL'
    | 'EVENTO_OBRIGATORIO'
  productivityFactorPercent: number // ex: 50%, 70%, 100%
  applicableLines: string[]
  notes: string
  isMandatory: boolean
}

// 21. EVENTOS ESPECIAIS / INVENTÁRIO ARCELOR
export interface SpecialEventPCP {
  id: string
  eventName: string
  targetDate: string
  planningCutoffDate: string
  receivingCutoffDate: string
  applicableLines: string[]
  reversePlanningChecklist: Array<{
    step: string
    category:
      | 'MP_CORTADA'
      | 'ANTECIPACAO_PRODUCAO'
      | 'CORTE_RECEBIMENTO'
      | 'FECHAMENTO_OPS'
      | 'ACABAMENTO'
    isCompleted: boolean
    responsible: string
    deadline: string
  }>
  status: 'PLANEJADO' | 'EM_EXECUCAO' | 'CONCLUIDO'
}

// 23. INTEGRIDADE SAP / COCKPIT BLOCO K
export interface SapIntegrityPendingItem {
  id: string
  category:
    | 'COGI'
    | 'CO1P'
    | 'ORDEM_NAO_ENCERRADA'
    | 'ERRO_APONTAMENTO'
    | 'CONSUMO_INCORRETO'
    | 'DIVERGENCIA_BOM'
    | 'ESTORNO_PENDENTE'
    | 'BLOCO_K'
  orderNumber?: string
  materialCode: string
  description: string
  line: string
  criticality: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA'
  impactArea: 'ESTOQUE' | 'PCP' | 'CUSTOS' | 'FISCAL' | 'BLOCO_K' | 'PRODUCAO'
  errorDetails: string
  suggestedCorrection: string
  responsibleDepartment: string
  status: 'PENDENTE' | 'EM_ANALISE' | 'CORRIGIDO_SAP'
  detectedAt: string
}

// 24. VALIDAÇÃO SEMÂNTICA DE JUSTIFICATIVAS
export class JustificationValidator {
  private static readonly VAGUE_TERMS = [
    'revisão',
    'revisao',
    'ajuste',
    'alteração',
    'alteracao',
    'reprogramação',
    'reprogramacao',
    'mudança',
    'mudanca',
    'solicitação',
    'teste',
    'ok',
    'conforme alinhado',
  ]

  public static evaluate(justification: string): {
    isValid: boolean
    isVague: boolean
    rejectionReason?: string
    aiAnalysis: string
    wordCount: number
  } {
    const trimmed = (justification || '').trim()
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0)

    if (words.length < 5) {
      return {
        isValid: false,
        isVague: true,
        wordCount: words.length,
        rejectionReason:
          'Justificativa muito curta. Informe detalhadamente o motivo técnico, cliente, máquina ou restrição de MP.',
        aiAnalysis: 'Rejeitado por insuficiência de dados para trilha de auditoria.',
      }
    }

    const lower = trimmed.toLowerCase()
    const isOnlyVague = this.VAGUE_TERMS.some(
      (t) => lower === t || lower === `apenas ${t}` || lower === `solicitado ${t}`,
    )

    if (isOnlyVague) {
      return {
        isValid: false,
        isVague: true,
        wordCount: words.length,
        rejectionReason: `Termo vago detectado ("${trimmed}"). É proibido usar termos genéricos como justificativa de alteração de programação.`,
        aiAnalysis:
          'Bloqueio de governança: o PCP exige explicação objetiva da causa raiz (ex: atraso de MP, quebra mecânica, pedido prioritário com anuência da diretoria).',
      }
    }

    return {
      isValid: true,
      isVague: false,
      wordCount: words.length,
      aiAnalysis:
        'Justificativa estruturada e compatível com as regras de governança e auditoria da CIAFAL.',
    }
  }
}

// 25. ALERTAS INTERMODULARES
export interface CrossModuleAlert {
  id: string
  originModule:
    | 'PCP_PROGRAMACAO'
    | 'OFICINA_CILINDROS'
    | 'GESTAO_MP'
    | 'MATRIZ_GARGALO'
    | 'QUALIDADE'
    | 'MES'
    | 'WMS'
  targetModules: Array<
    'MES' | 'CRM' | 'WMS' | 'PCM' | 'OFICINA_CILINDROS' | 'QUALIDADE' | 'SGQ' | 'DIRETORIA'
  >
  eventTitle: string
  eventDescription: string
  severity: 'CRITICA' | 'ALERTA' | 'INFO'
  materialCode?: string
  lineCode?: string
  affectedClient?: string
  deliveryDateImpact?: string
  acknowledgedBy: string[]
  createdAt: string
}
