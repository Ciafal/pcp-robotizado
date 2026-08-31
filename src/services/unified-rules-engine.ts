/**
 * MOTOR CENTRAL DE REGRAS PCP CIAFAL
 * Camada única e parametrizável consumida por:
 * - Programação Semanal
 * - Programação Mensal
 * - Análise de Carteira
 * - Gestão de MP
 * - Plano de Corte
 * - Matriz de Gargalo
 * - Enfornamento L1/L2
 * - Previsto x Realizado
 * - Torre de Controle
 * - IA Programadora
 *
 * Regras auditadas, versionadas e com alçadas flexíveis de aprovação.
 */

export interface PCPIndustrialRule {
  id: string
  company: string // ex: "CIAFAL"
  center: string // ex: "1000", "2000"
  line: string // ex: "L1", "L2", "SDC", "ENDL1", "ACABL2", "KS", "GLOBAL"
  family?: string // ex: "REDONDOS", "QUADRADOS", "CANTONEIRAS", "FACAS", "BLOCOS", "TARUGOS", "ESPECIAIS", "ARGOLEIRAS"
  materialCode?: string // SKU específico ou "*"
  gaugeMinMm?: number
  gaugeMaxMm?: number
  steelGrade?: string // ex: "1020", "1045", "5160", "A36", "4140", "DIN", "*"
  productType?: 'MTS' | 'MTO' | 'INDUSTRIALIZACAO' | 'REVENDA' | 'IMPORTADO' | 'TODOS'
  rawMaterialType?: string // ex: "TARUGO_130", "TARUGO_150", "BLOCO", "SUCATA", "*"
  application?: string // ex: "MOLA", "AUTOMOTIVO", "ESTRUTURAL", "AGRO", "GERAL"
  ruleCode: string // ex: "LOTE_MINIMO_TEMPO", "TROCA_DESBASTE_LIMITE", "COVERAGE_TOLERANCE", etc.
  ruleName: string
  ruleCategory:
    | 'LOTE_MINIMO'
    | 'ABC_PRIORIDADE'
    | 'EQUILIBRIO_ESTOQUE'
    | 'SETUP'
    | 'PARADA'
    | 'ENFORNAMENTO'
    | 'DESBASTE'
    | 'QUALIDADE'
    | 'RETRABALHO'
    | 'INTEGRIDADE_SAP'
    | 'REVENDA_IMPORTADO'
    | 'SEGURANCA'
  minValue?: number
  maxValue?: number
  targetValue?: number
  unit: string // 'HORAS', 'TONELADAS', 'DIAS', 'MINUTOS', 'PERCENTUAL', 'SCORE_PTS'
  priority: number // 1 (crítico) a 10 (baixo)
  source:
    | 'MANUAL_PCP'
    | 'SAP_MASTER'
    | 'MES_APONTAMENTO'
    | 'OFICINA_CILINDROS'
    | 'SGQ_QUALIDADE'
    | 'POLITICA_DIRETORIA'
  effectiveDate: string // YYYY-MM-DD
  expirationDate?: string
  status: 'ATIVO' | 'INATIVO' | 'PENDENTE_APROVACAO' | 'REVOGADO'
  isBlocking: boolean // SIM/NAO
  allowException: boolean // SIM/NAO
  requiredApprovalRole: string // Parametrizável (ex: 'GESTOR_PCP', 'DIRETORIA_OPERACIONAL', 'GERENCIA_INDUSTRIAL', 'ENGENHARIA_QUALIDADE')
  mandatoryJustification: boolean
  responsibleName: string
  revisionNumber: number
  description: string
  aiEvaluationRationale?: string
  createdAt: string
  updatedAt: string
}

export interface RuleValidationContext {
  materialCode?: string
  materialDescription?: string
  family?: string
  gaugeMm?: number
  steelGrade?: string
  line: string
  productType?: 'MTS' | 'MTO' | 'INDUSTRIALIZACAO' | 'REVENDA' | 'IMPORTADO'
  quantityTons?: number
  plannedHours?: number
  plannedDate?: string
  sequencePosition?: number
  rawMaterialAvailableTons?: number
  rawMaterialCode?: string
  isHotCharging?: boolean
  upstreamLineReady?: boolean
  coverageDays?: number
  abcClass?: 'A' | 'B' | 'C'
  lastDesbasteProductionTons?: number
  stockOwnTons?: number
  stockResaleTons?: number
  stockImportedTons?: number
  hasDuplicateOrder?: boolean
  userRole?: string
  exceptionAuthorized?: boolean
  exceptionJustification?: string
}

export interface RuleEvaluationResult {
  canProgram: boolean
  ruleCode: string
  ruleName: string
  ruleCategory: string
  severity: 'BLOQUEANTE' | 'ALERTA' | 'INFO' | 'OK'
  message: string
  remediation?: string
  exceptionAllowed: boolean
  requiredApprovalRole?: string
  details?: Record<string, any>
}

export interface OverallPCPValidation {
  canProgram: boolean
  totalEvaluated: number
  blockingIssuesCount: number
  warningsCount: number
  evaluations: RuleEvaluationResult[]
  primaryReasonIfBlocked?: string
  aiSummary: string
  confidenceScore: number
}

// Repositório de Regras Parametrizáveis Padrão da CIAFAL
export const DEFAULT_CIAFAL_RULES: PCPIndustrialRule[] = [
  // 1. LOTE MÍNIMO
  {
    id: 'RULE_LM_L1',
    company: 'CIAFAL',
    center: '1000',
    line: 'L1',
    family: '*',
    ruleCode: 'LOTE_MINIMO_L1_HORAS',
    ruleName: 'Lote Mínimo de Laminação L1 (3 horas)',
    ruleCategory: 'LOTE_MINIMO',
    minValue: 3.0,
    unit: 'HORAS',
    priority: 1,
    source: 'POLITICA_DIRETORIA',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: true,
    requiredApprovalRole: 'GESTOR_PCP',
    mandatoryJustification: true,
    responsibleName: 'Engenharia de Processo CIAFAL',
    revisionNumber: 2,
    description: 'Linha L1 exige no mínimo 3 horas de produção para qualquer bitola laminada.',
    aiEvaluationRationale: 'Evita paradas excessivas e perda de rendimento térmico do forno L1.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'RULE_LM_L2_ROUND',
    company: 'CIAFAL',
    center: '1000',
    line: 'L2',
    family: 'REDONDOS',
    ruleCode: 'LOTE_MINIMO_L2_REDONDOS',
    ruleName: 'Lote Mínimo L2 Redondos (6h normal / 4h baixa carteira)',
    ruleCategory: 'LOTE_MINIMO',
    minValue: 6.0,
    unit: 'HORAS',
    priority: 1,
    source: 'POLITICA_DIRETORIA',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: true,
    requiredApprovalRole: 'GERENCIA_INDUSTRIAL',
    mandatoryJustification: true,
    responsibleName: 'PCP Central',
    revisionNumber: 3,
    description:
      'L2 Redondos exige mínimo de 6 horas padrão. Em cenário formal de baixa carteira, pode-se aprovar redução para 4 horas.',
    aiEvaluationRationale: 'Troca de cilindros e guias em L2 redondos possui alto custo de setup.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'RULE_LM_L2_BLOCKS',
    company: 'CIAFAL',
    center: '1000',
    line: 'L2',
    family: 'BLOCOS',
    ruleCode: 'LOTE_MINIMO_L2_BLOCOS',
    ruleName: 'Lote Mínimo L2 Blocos/Quadrados/Tarugos (Flexível)',
    ruleCategory: 'LOTE_MINIMO',
    minValue: 0.0,
    unit: 'HORAS',
    priority: 3,
    source: 'POLITICA_DIRETORIA',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: false,
    allowException: true,
    requiredApprovalRole: 'PROGRAMADOR_PCP',
    mandatoryJustification: false,
    responsibleName: 'PCP Central',
    revisionNumber: 1,
    description: 'Blocos, quadrados e tarugos em L2 não possuem exigência de tempo mínimo rígido.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'RULE_LM_SDC',
    company: 'CIAFAL',
    center: '1000',
    line: 'SDC',
    family: '*',
    ruleCode: 'LOTE_MINIMO_SDC_DIA',
    ruleName: 'Lote Mínimo Sidercentro (1 dia de produção)',
    ruleCategory: 'LOTE_MINIMO',
    minValue: 24.0, // 1 dia = 24h ou 3 turnos
    unit: 'HORAS',
    priority: 1,
    source: 'POLITICA_DIRETORIA',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: true,
    requiredApprovalRole: 'GESTOR_PCP',
    mandatoryJustification: true,
    responsibleName: 'Coordenação SDC',
    revisionNumber: 2,
    description:
      'SDC exige campanha contínua de no mínimo 1 dia completo de produção (3 turnos / 24 horas).',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // 2. CURVA ABC & COBERTURA CRÍTICA
  {
    id: 'RULE_ABC_STOCK_A',
    company: 'CIAFAL',
    center: '1000',
    line: 'GLOBAL',
    ruleCode: 'ABC_CLASSE_A_ESTOQUE_NEGATIVO',
    ruleName: 'Item Classe A com Estoque Projetado Negativo Bloqueado',
    ruleCategory: 'ABC_PRIORIDADE',
    minValue: 0,
    unit: 'DIAS',
    priority: 1,
    source: 'POLITICA_DIRETORIA',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: false,
    requiredApprovalRole: 'GESTOR_PCP',
    mandatoryJustification: true,
    responsibleName: 'Planejamento Estratégico',
    revisionNumber: 1,
    description:
      'Itens Classe A (80% faturamento) não podem ter projeção negativa antes do próximo ciclo sem acionamento imediato de programação.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // 3. EQUILÍBRIO DE ESTOQUE ENTRE BITOLAS DA MESMA FAMÍLIA (TOLERÂNCIA +- 5 DIAS)
  {
    id: 'RULE_STOCK_FAMILY_BALANCE',
    company: 'CIAFAL',
    center: '1000',
    line: 'GLOBAL',
    ruleCode: 'EQUILIBRIO_COBERTURA_FAMILIA',
    ruleName: 'Equilíbrio de Cobertura por Família (+-5 dias)',
    ruleCategory: 'EQUILIBRIO_ESTOQUE',
    minValue: -5.0,
    maxValue: 5.0,
    unit: 'DIAS',
    priority: 2,
    source: 'POLITICA_DIRETORIA',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: false,
    allowException: true,
    requiredApprovalRole: 'GESTOR_PCP',
    mandatoryJustification: true,
    responsibleName: 'PCP Central',
    revisionNumber: 2,
    description:
      'Desvios de cobertura acima de +-5 dias entre bitolas da mesma família exigem justificativa e rebalanceamento de campanha.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // 4. TROCA DE DESBASTE L1
  {
    id: 'RULE_DESBASTE_L1',
    company: 'CIAFAL',
    center: '1000',
    line: 'L1',
    ruleCode: 'TROCA_DESBASTE_L1_LIMITE',
    ruleName: 'Limite de Vida Útil Desbaste L1 (12.000t +- 1.000t)',
    ruleCategory: 'DESBASTE',
    targetValue: 12000,
    minValue: 11000,
    maxValue: 13000,
    unit: 'TONELADAS',
    priority: 1,
    source: 'OFICINA_CILINDROS',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: true,
    requiredApprovalRole: 'GERENCIA_INDUSTRIAL',
    mandatoryJustification: true,
    responsibleName: 'Oficina de Cilindros & PCM',
    revisionNumber: 4,
    description:
      'Troca de cilindros desbastadores em L1 deve ocorrer em 12.000 t (tolerância 11.000t - 13.000t), sincronizada preferencialmente com paradas programadas de 8h/10h.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // 5. ENFORNAMENTO A QUENTE & DEPENDÊNCIAS DE LINHAS
  {
    id: 'RULE_ENFORNAMENTO_DEPENDENCY',
    company: 'CIAFAL',
    center: '1000',
    line: 'L1',
    ruleCode: 'ENFORNAMENTO_HOT_DEPENDENCY',
    ruleName: 'Validação de Dependência de Linha Fornecedora (KS -> L2 -> L1)',
    ruleCategory: 'ENFORNAMENTO',
    priority: 1,
    unit: 'SCORE_PTS',
    source: 'MES_APONTAMENTO',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: false,
    requiredApprovalRole: 'GERENCIA_INDUSTRIAL',
    mandatoryJustification: true,
    responsibleName: 'PCP Central',
    revisionNumber: 2,
    description:
      'Nenhuma linha consumidora pode ser programada antes de validar liberação física e resfriamento/temperatura da linha fornecedora.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // 6. REVENDA E IMPORTADOS - PREVENÇÃO DE DUPLICIDADE
  {
    id: 'RULE_REVENDA_DUPLICIDADE',
    company: 'CIAFAL',
    center: '1000',
    line: 'GLOBAL',
    ruleCode: 'REVENDA_IMPORTADOS_DUPLICIDADE',
    ruleName: 'Detecção de Duplicidade Produção Própria x Revenda/Importado',
    ruleCategory: 'REVENDA_IMPORTADO',
    priority: 1,
    unit: 'TONELADAS',
    source: 'SAP_MASTER',
    effectiveDate: '2025-01-01',
    status: 'ATIVO',
    isBlocking: true,
    allowException: true,
    requiredApprovalRole: 'GESTOR_PCP',
    mandatoryJustification: true,
    responsibleName: 'PCP & Comercial',
    revisionNumber: 2,
    description:
      'Impede programar produção própria se a carteira já estiver coberta por pedido de revenda ou importado confirmado disponível.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
]

export class PCPUnifiedRulesEngine {
  private static instance: PCPUnifiedRulesEngine
  private rules: PCPIndustrialRule[] = [...DEFAULT_CIAFAL_RULES]
  private ruleAuditTrail: Array<{
    ruleId: string
    action: 'CREATE' | 'UPDATE' | 'DISABLE' | 'ENABLE' | 'VERSION'
    userId: string
    userName: string
    timestamp: string
    details: string
  }> = []

  private constructor() {
    this.loadFromStorage()
  }

  public static getInstance(): PCPUnifiedRulesEngine {
    if (!PCPUnifiedRulesEngine.instance) {
      PCPUnifiedRulesEngine.instance = new PCPUnifiedRulesEngine()
    }
    return PCPUnifiedRulesEngine.instance
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('ciafal_pcp_master_rules_v2')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge com as regras padrão para garantir que nenhuma regra nova seja perdida
          const existingIds = new Set(parsed.map((r) => r.id))
          const missingDefaults = DEFAULT_CIAFAL_RULES.filter((r) => !existingIds.has(r.id))
          this.rules = [...parsed, ...missingDefaults]
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar regras do storage:', e)
      this.rules = [...DEFAULT_CIAFAL_RULES]
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('ciafal_pcp_master_rules_v2', JSON.stringify(this.rules))
      localStorage.setItem('ciafal_pcp_rules_audit_trail', JSON.stringify(this.ruleAuditTrail))
    } catch (e) {
      console.error('Erro ao persistir regras no storage:', e)
    }
  }

  public getAllRules(): PCPIndustrialRule[] {
    return [...this.rules]
  }

  public getActiveRules(line?: string, category?: string): PCPIndustrialRule[] {
    return this.rules.filter((r) => {
      if (r.status !== 'ATIVO') return false
      if (line && r.line !== 'GLOBAL' && r.line !== line) return false
      if (category && r.ruleCategory !== category) return false
      return true
    })
  }

  public getRuleByCode(ruleCode: string): PCPIndustrialRule | undefined {
    return this.rules.find((r) => r.ruleCode === ruleCode && r.status === 'ATIVO')
  }

  public updateRule(
    ruleId: string,
    updates: Partial<PCPIndustrialRule>,
    user: { id: string; name: string },
  ): PCPIndustrialRule {
    const idx = this.rules.findIndex((r) => r.id === ruleId)
    if (idx === -1) throw new Error(`Regra com ID ${ruleId} não encontrada.`)

    const current = this.rules[idx]
    const updated: PCPIndustrialRule = {
      ...current,
      ...updates,
      revisionNumber: current.revisionNumber + 1,
      updatedAt: new Date().toISOString(),
    }

    this.rules[idx] = updated
    this.ruleAuditTrail.push({
      ruleId,
      action: 'UPDATE',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      details: `Regra ${current.ruleCode} atualizada para rev v${updated.revisionNumber}. Alterações: ${Object.keys(updates).join(', ')}`,
    })

    this.saveToStorage()
    return updated
  }

  public addRule(
    rule: Omit<PCPIndustrialRule, 'id' | 'revisionNumber' | 'createdAt' | 'updatedAt'>,
    user: { id: string; name: string },
  ): PCPIndustrialRule {
    const newRule: PCPIndustrialRule = {
      ...rule,
      id: `RULE_${Date.now()}_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      revisionNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.rules.push(newRule)
    this.ruleAuditTrail.push({
      ruleId: newRule.id,
      action: 'CREATE',
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      details: `Nova regra criada: ${newRule.ruleCode} - ${newRule.ruleName}`,
    })

    this.saveToStorage()
    return newRule
  }

  /**
   * Responde ao princípio central do PCP:
   * "Este material pode ser programado nesta linha, nesta data, nesta sequência, nesta quantidade
   * e com esta matéria-prima, considerando todas as restrições industriais, comerciais, logísticas e de capacidade?"
   */
  public evaluateCanProgram(ctx: RuleValidationContext): OverallPCPValidation {
    const evaluations: RuleEvaluationResult[] = []

    // 1. Validação de Lote Mínimo
    const batchRule = this.getBatchRuleForContext(ctx.line, ctx.family)
    if (batchRule) {
      const minHours = batchRule.minValue || 0
      const plannedHours =
        ctx.plannedHours ||
        (ctx.quantityTons
          ? ctx.quantityTons / this.getExpectedProductivity(ctx.line, ctx.gaugeMm)
          : 0)

      if (plannedHours < minHours) {
        const isException =
          ctx.exceptionAuthorized &&
          ctx.exceptionJustification &&
          ctx.exceptionJustification.trim().length > 15

        evaluations.push({
          canProgram: !!isException,
          ruleCode: batchRule.ruleCode,
          ruleName: batchRule.ruleName,
          ruleCategory: 'LOTE_MINIMO',
          severity: isException ? 'ALERTA' : 'BLOQUEANTE',
          message: isException
            ? `Lote mínimo (${minHours}h) flexibilizado por exceção aprovada: "${ctx.exceptionJustification}"`
            : `Lote programado de ${plannedHours.toFixed(1)}h é inferior ao mínimo obrigatório de ${minHours.toFixed(1)}h na linha ${ctx.line}. Quantidade faltante: ${(minHours - plannedHours).toFixed(1)}h.`,
          remediation: `Aumentar lote para pelo menos ${(minHours * this.getExpectedProductivity(ctx.line, ctx.gaugeMm)).toFixed(1)} t ou registrar aprovação de exceção da ${batchRule.requiredApprovalRole}.`,
          exceptionAllowed: batchRule.allowException,
          requiredApprovalRole: batchRule.requiredApprovalRole,
          details: { plannedHours, minHours, diffHours: minHours - plannedHours },
        })
      } else {
        evaluations.push({
          canProgram: true,
          ruleCode: batchRule.ruleCode,
          ruleName: batchRule.ruleName,
          ruleCategory: 'LOTE_MINIMO',
          severity: 'OK',
          message: `Lote de ${plannedHours.toFixed(1)}h atende ao mínimo de ${minHours.toFixed(1)}h na linha ${ctx.line}.`,
          exceptionAllowed: true,
        })
      }
    }

    // 2. Validação de Curva ABC & Ruptura
    if (ctx.abcClass === 'A' && ctx.coverageDays !== undefined && ctx.coverageDays < 0) {
      evaluations.push({
        canProgram: false,
        ruleCode: 'ABC_CLASSE_A_ESTOQUE_NEGATIVO',
        ruleName: 'Prioridade Absoluta Classe A',
        ruleCategory: 'ABC_PRIORIDADE',
        severity: 'BLOQUEANTE',
        message: `Material classe A com estoque projetado negativo (${ctx.coverageDays} dias). Risco iminente de ruptura de fornecimento.`,
        remediation:
          'Programar imediatamente e alocar matéria-prima prioritária antes dos itens Classe B e C.',
        exceptionAllowed: false,
      })
    }

    // 3. Validação de Troca de Desbaste L1
    if (ctx.line === 'L1' && ctx.lastDesbasteProductionTons !== undefined) {
      const desbasteRule = this.getRuleByCode('TROCA_DESBASTE_L1_LIMITE')
      const targetLimit = desbasteRule?.targetValue || 12000
      const maxLimit = desbasteRule?.maxValue || 13000

      if (ctx.lastDesbasteProductionTons >= maxLimit) {
        const isException = ctx.exceptionAuthorized
        evaluations.push({
          canProgram: !!isException,
          ruleCode: 'TROCA_DESBASTE_L1_LIMITE',
          ruleName: 'Vida Útil de Desbaste L1 Excedida',
          ruleCategory: 'DESBASTE',
          severity: isException ? 'ALERTA' : 'BLOQUEANTE',
          message: `Desbaste L1 atingiu ${ctx.lastDesbasteProductionTons.toLocaleString('pt-BR')} t (limite máximo ${maxLimit.toLocaleString('pt-BR')} t). Risco de quebra de cilindro.`,
          remediation:
            'Parar linha para troca de desbaste (8h/10h) antes de iniciar nova campanha pesada.',
          exceptionAllowed: true,
          requiredApprovalRole: 'GERENCIA_INDUSTRIAL',
        })
      } else if (ctx.lastDesbasteProductionTons >= 11000) {
        evaluations.push({
          canProgram: true,
          ruleCode: 'TROCA_DESBASTE_L1_LIMITE',
          ruleName: 'Alerta de Proximidade de Troca de Desbaste L1',
          ruleCategory: 'DESBASTE',
          severity: 'ALERTA',
          message: `Desbaste L1 acumulou ${ctx.lastDesbasteProductionTons.toLocaleString('pt-BR')} t de ${targetLimit.toLocaleString('pt-BR')} t. Troca recomendada na próxima parada programada.`,
          exceptionAllowed: true,
        })
      }
    }

    // 4. Validação de Matéria-Prima & Dependência
    if (ctx.rawMaterialAvailableTons !== undefined && ctx.quantityTons !== undefined) {
      if (ctx.rawMaterialAvailableTons < ctx.quantityTons) {
        evaluations.push({
          canProgram: false,
          ruleCode: 'MP_INSUFICIENTE',
          ruleName: 'Disponibilidade de Matéria-Prima no WMS/SAP',
          ruleCategory: 'QUALIDADE',
          severity: 'BLOQUEANTE',
          message: `Saldo físico/SAP de MP (${ctx.rawMaterialAvailableTons.toFixed(1)} t) é insuficiente para a quantidade programada de ${ctx.quantityTons.toFixed(1)} t.`,
          remediation:
            'Validar recebimento de tarugos ou realocar aplicação no módulo Gestão de MP.',
          exceptionAllowed: false,
        })
      }
    }

    // 5. Dependência entre Linhas (Enfornamento a Quente / Fluxo Montante)
    if (ctx.isHotCharging && ctx.upstreamLineReady === false) {
      evaluations.push({
        canProgram: false,
        ruleCode: 'ENFORNAMENTO_HOT_DEPENDENCY',
        ruleName: 'Dependência de Linha Fornecedora Não Pronta',
        ruleCategory: 'ENFORNAMENTO',
        severity: 'BLOQUEANTE',
        message: `Linha consumidora (${ctx.line}) não pode iniciar enfornamento a quente pois a linha fornecedora ainda não liberou o lote ou não atingiu temperatura/janela operacional.`,
        remediation:
          'Aguardar liberação do lote pela linha anterior ou reprogramar como enfornamento a frio.',
        exceptionAllowed: false,
      })
    }

    // 6. Prevenção de Duplicidade com Revenda e Importados
    if (ctx.hasDuplicateOrder) {
      evaluations.push({
        canProgram: false,
        ruleCode: 'REVENDA_IMPORTADOS_DUPLICIDADE',
        ruleName: 'Duplicidade com Pedido de Revenda/Importado Detectada',
        ruleCategory: 'REVENDA_IMPORTADO',
        severity: 'BLOQUEANTE',
        message:
          'Existe pedido de revenda ou importado já alocado para esta mesma carteira. Programar produção própria gerará excesso de estoque.',
        remediation:
          'Atender pedido utilizando o estoque de revenda/importado disponível ou cancelar a ordem duplicada.',
        exceptionAllowed: true,
        requiredApprovalRole: 'GESTOR_PCP',
      })
    }

    const blockingIssues = evaluations.filter((e) => e.severity === 'BLOQUEANTE')
    const warnings = evaluations.filter((e) => e.severity === 'ALERTA')
    const canProgramOverall = blockingIssues.length === 0

    let primaryReason = undefined
    if (!canProgramOverall) {
      primaryReason = blockingIssues[0].message
    }

    const aiSummary = canProgramOverall
      ? `Aprovação técnica recomendada. Todas as ${evaluations.length} restrições industriais, de lote mínimo e capacidade foram satisfeitas.`
      : `Bloqueio de Programação: ${blockingIssues.length} restrição(ões) bloqueante(s) encontrada(s). Principal motivo: ${blockingIssues[0].message}`

    return {
      canProgram: canProgramOverall,
      totalEvaluated: evaluations.length,
      blockingIssuesCount: blockingIssues.length,
      warningsCount: warnings.length,
      evaluations,
      primaryReasonIfBlocked: primaryReason,
      aiSummary,
      confidenceScore: canProgramOverall ? 98 : 35,
    }
  }

  private getBatchRuleForContext(line: string, family?: string): PCPIndustrialRule | undefined {
    if (line === 'L1') {
      return this.getRuleByCode('LOTE_MINIMO_L1_HORAS')
    }
    if (line === 'L2') {
      if (family === 'REDONDOS') {
        return this.getRuleByCode('LOTE_MINIMO_L2_REDONDOS')
      }
      return this.getRuleByCode('LOTE_MINIMO_L2_BLOCOS')
    }
    if (line === 'SDC') {
      return this.getRuleByCode('LOTE_MINIMO_SDC_DIA')
    }
    return undefined
  }

  public getExpectedProductivity(line: string, gaugeMm?: number): number {
    // Produtividade média t/h por linha
    switch (line) {
      case 'L1':
        return 22.5 // 22.5 t/h
      case 'L2':
        return gaugeMm && gaugeMm > 50 ? 30.0 : 25.0
      case 'SDC':
        return 18.0
      case 'ENDL1':
      case 'ACABL2':
        return 15.0
      case 'KS':
        return 28.0
      default:
        return 20.0
    }
  }
}

export const unifiedRulesEngine = PCPUnifiedRulesEngine.getInstance()
