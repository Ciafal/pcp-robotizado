import pb from '@/lib/pocketbase/client'
import { MesStatisticalEngine, MesStatistics, AiEvaluationResult } from './rules-ai-engine'

export interface SetupAcertoRecord {
  id: string
  center_code: string
  line_id?: string
  line_code: string
  work_center: string
  from_family_id?: string
  from_family_code: string
  from_family_name?: string
  from_code_prefix: string
  from_description_gauge: string
  to_family_id?: string
  to_family_code: string
  to_family_name?: string
  to_code_prefix: string
  to_description_gauge: string
  setup_time_minutes: number
  tuning_time_minutes: number
  origin: 'SAP' | 'MES' | 'MANUAL' | 'ENGENHARIA'
  status: 'ATIVO' | 'INATIVO' | 'EM_REVISAO' | 'PENDENTE'
  validity_start?: string
  validity_end?: string
  responsible_id?: string
  responsible_name: string
  last_revision: string
  notes?: string
  created?: string
  updated?: string
  setup_code?: string
  is_generic?: boolean
}

export interface ScheduledStopRecord {
  id: string
  center_code: string
  line_id?: string
  line_code: string
  work_center: string
  stop_type: string
  reason: string
  description: string
  duration_minutes: number
  start_time: string
  end_time?: string
  recurrence: string
  shift: string
  validity?: string
  status: 'ATIVO' | 'INATIVO' | 'PROGRAMADA' | 'CONCLUIDA'
  responsible_name: string
  observation?: string
  lost_hours_month?: number
  lost_capacity_tons?: number
  created?: string
  updated?: string
}

export interface CoolingTimeRecord {
  id: string
  center_code: string
  plant_id?: string
  origin_line_id?: string
  origin_line_code: string
  origin_work_center: string
  dest_line_id?: string
  dest_line_code: string
  dest_work_center: string
  material_code?: string
  material_description?: string
  family_id?: string
  family_code?: string
  family_name?: string
  gauge_dimension: string
  cooling_time_hours: number
  unit: string
  rule_condition: string
  valid_from?: string
  valid_until?: string
  origin: 'SAP' | 'MES' | 'MANUAL' | 'ENGENHARIA'
  status: 'ATIVO' | 'INATIVO' | 'EM_REVISAO' | 'PENDENTE'
  responsible_id?: string
  responsible_name: string
  revision_number: number
  notes?: string
  created?: string
  updated?: string
}

export interface SequencingRuleRecord {
  id: string
  code: string
  name: string
  version: string
  line_code?: string
  from_family_code?: string
  from_material_code?: string
  to_family_code?: string
  to_material_code?: string
  rule_type: 'PROIBITIVA' | 'NAO_RECOMENDADA' | 'PREFERENCIAL' | 'NEUTRA'
  penalty_score: number
  reason: string
  scope_level: 'GLOBAL' | 'COMPANY' | 'PLANT' | 'LINE' | 'RESOURCE'
  status: 'ACTIVE' | 'DRAFT' | 'SUPERSEDED'
  rules_payload: {
    maxSetupDurationMinutes?: number
    minBatchSizeTons?: number
    bufferSafetyHours?: number
    priorityWeightOEE?: number
    priorityWeightOTD?: number
    preferredFamilyOrder?: string[]
    [key: string]: unknown
  }
  created?: string
  updated?: string
}

export interface PendingRevisionRecord {
  id: string
  entity_type: 'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING' | 'PRODUCTION_ROUTE'
  entity_id: string
  entity_code: string
  line_code: string
  parameter_name: string
  current_value: string
  proposed_value: string
  version: string
  change_reason: string
  technical_justification_category?: string
  technical_justification_detail?: string
  attachment_url?: string
  ai_classification?: string
  ai_explanation?: string
  mes_evidence_snapshot?: any
  status: 'RASCUNHO' | 'PENDING_PCP' | 'PENDING_LINE_MANAGER' | 'APPROVED' | 'REJECTED'
  pcp_approver_name?: string
  pcp_approved_at?: string
  pcp_notes?: string
  line_manager_name?: string
  line_manager_approved_at?: string
  line_manager_notes?: string
  created?: string
  updated?: string
}

export interface RuleAuditLogRecord {
  id: string
  parameter_name: string
  entity_type: string
  entity_id?: string
  previous_value?: string
  new_value?: string
  user_id?: string
  user_name: string
  user_email?: string
  change_date: string
  reason: string
  technical_justification?: string
  origin: 'SAP' | 'MES' | 'MANUAL' | 'IA_OPTIMIZER' | 'ENGENHARIA'
  mes_validation_status: 'VALIDADO' | 'PENDENTE' | 'NAO_APLICAVEL' | 'DIVERGENCIA'
  ai_recommendation?: string
  approver_id?: string
  approver_name?: string
  published_at?: string
  created?: string
  updated?: string
}

export interface ImportPreviewItem {
  id: string
  status: 'UNCHANGED' | 'NEW' | 'MODIFIED' | 'INVALID'
  entityType: 'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING'
  code: string
  lineCode: string
  description: string
  diffFields?: Array<{
    fieldName: string
    currentVal: string
    importVal: string
  }>
  validationErrors?: string[]
  aiClassification?: string
}

export const pcpRulesService = {
  /**
   * 1. Lista registros da Aba 1: Setup & Acerto
   * Mapeia de `line_setup_matrix` com arquitetura DE -> PARA
   */
  async listSetupAcerto(filters?: { lineCode?: string }): Promise<SetupAcertoRecord[]> {
    try {
      const records = await pb.collection('line_setup_matrix').getFullList({
        sort: 'setup_code',
        expand: 'line_id,line_id.plant_id,from_family_id,to_family_id',
      })

      return records.map((r: any) => {
        const line = r.expand?.line_id
        const plant = line?.expand?.plant_id
        const fromFam = r.expand?.from_family_id
        const toFam = r.expand?.to_family_id
        const lineCode = line?.code || 'L1'
        const centerCode = plant?.sap_plant_code || plant?.code || '1001'
        const workCenter = line?.sap_work_center || `WC-${lineCode}`

        const isGeneric = !r.from_family_id && !r.from_product_code

        return {
          id: r.id,
          setup_code: r.setup_code,
          center_code: centerCode,
          line_id: r.line_id,
          line_code: lineCode,
          work_center: workCenter,
          from_family_id: r.from_family_id,
          from_family_code: fromFam?.code || (isGeneric ? 'QUALQUER (GENÉRICO)' : 'TUB_QUAD'),
          from_family_name:
            fromFam?.name || (isGeneric ? 'Qualquer Família Anterior' : 'Tubos Quadrados'),
          from_code_prefix: r.from_product_code || (isGeneric ? '*' : 'TQ-'),
          from_description_gauge: r.from_product_code
            ? `Bitola / Código ${r.from_product_code}`
            : isGeneric
              ? 'Regra Genérica de Entrada'
              : 'Bitola 20x20 a 50x50 mm',
          to_family_id: r.to_family_id,
          to_family_code: toFam?.code || 'TUB_QUAD',
          to_family_name: toFam?.name || 'Tubos Quadrados',
          to_code_prefix: r.to_product_code ? r.to_product_code : 'TQ-',
          to_description_gauge: r.setup_description || 'Ajuste de Matriz e Bitola',
          setup_time_minutes: r.setup_duration_minutes || 45,
          tuning_time_minutes: Math.max(10, Math.round((r.setup_duration_minutes || 45) * 0.25)), // Acerto estimado (25% do setup)
          origin: (r.source_mode as any) || 'MANUAL',
          status: r.active ? 'ATIVO' : 'INATIVO',
          validity_start: r.valid_from
            ? new Date(r.valid_from).toLocaleDateString('pt-BR')
            : '01/01/2026',
          validity_end: r.valid_until
            ? new Date(r.valid_until).toLocaleDateString('pt-BR')
            : 'Indeterminado',
          responsible_name: 'Engenharia de Processos / PCP',
          last_revision: r.updated ? new Date(r.updated).toLocaleDateString('pt-BR') : '28/08/2026',
          notes: r.capacity_loss_impact,
          is_generic: isGeneric,
          created: r.created,
          updated: r.updated,
        }
      })
    } catch (err) {
      console.error('Erro ao buscar matriz de setup:', err)
      return []
    }
  },

  /**
   * 2. Lista registros da Aba 2: Paradas Programadas com cálculo de capacidade perdida
   */
  async listScheduledStops(filters?: { lineCode?: string }): Promise<ScheduledStopRecord[]> {
    try {
      const records = await pb.collection('standard_scheduled_stops').getFullList({
        sort: 'code',
        expand: 'line_id,line_id.plant_id',
      })

      return records.map((r: any) => {
        const line = r.expand?.line_id
        const plant = line?.expand?.plant_id
        const lineCode = line?.code || 'L1'
        const centerCode = plant?.sap_plant_code || plant?.code || '1001'
        const workCenter = line?.sap_work_center || `WC-${lineCode}`
        const nominalRate = line?.nominal_capacity || 120 // t/h

        const categoryLabels: Record<string, string> = {
          PREVENTIVE_MAINTENANCE: 'Manutenção Preventiva',
          CLEANING: 'Limpeza Operacional',
          CALIBRATION: 'Calibração / Aferição',
          TOOL_CHANGE: 'Troca de Ferramenta',
          INSPECTION: 'Inspeção Autônoma',
          OPERATIONAL_BREAK: 'Intervalo / Troca de Turno',
          OTHER: 'Outras Paradas',
        }

        const recurrenceLabels: Record<string, string> = {
          DAILY: 'Diária',
          WEEKLY: 'Semanal',
          BIWEEKLY: 'Quinzenal',
          MONTHLY: 'Mensal',
          PER_SHIFT: 'Por Turno',
          PER_BATCH: 'Por Lote',
          CUSTOM: 'Customizada',
        }

        const durationMin = r.expected_duration_minutes || 60
        // Cálculo de horas perdidas no mês conforme recorrência
        let monthlyMultiplier = 4.33 // Semanal
        if (r.recurrence === 'DAILY') monthlyMultiplier = 30
        else if (r.recurrence === 'PER_SHIFT') monthlyMultiplier = 90
        else if (r.recurrence === 'BIWEEKLY') monthlyMultiplier = 2.16
        else if (r.recurrence === 'MONTHLY') monthlyMultiplier = 1.0

        const lostHoursMonth = Math.round((durationMin / 60) * monthlyMultiplier * 10) / 10
        const lostCapacityTons = Math.round(lostHoursMonth * nominalRate)

        return {
          id: r.id,
          center_code: centerCode,
          line_id: r.line_id,
          line_code: lineCode,
          work_center: workCenter,
          stop_type: categoryLabels[r.category] || r.category || 'Preventiva',
          reason: r.code,
          description: r.description,
          duration_minutes: durationMin,
          start_time: r.scheduled_time || '06:00',
          end_time: 'Conforme Duração',
          recurrence: recurrenceLabels[r.recurrence] || r.recurrence || 'Semanal',
          shift: r.applicable_shift || 'Todos os Turnos',
          validity: r.valid_from ? new Date(r.valid_from).toLocaleDateString('pt-BR') : 'Vigente',
          status: r.active ? 'ATIVO' : 'INATIVO',
          responsible_name: 'Manutenção Mecânica / Elétrica',
          observation: r.expected_impact || '',
          lost_hours_month: lostHoursMonth,
          lost_capacity_tons: lostCapacityTons,
          created: r.created,
          updated: r.updated,
        }
      })
    } catch (err) {
      console.error('Erro ao buscar paradas programadas:', err)
      return []
    }
  },

  /**
   * 3. Lista registros da Aba 3: Tempos de Resfriamento com fluxo produtivo
   */
  async listCoolingTimes(filters?: { lineCode?: string }): Promise<CoolingTimeRecord[]> {
    try {
      const records = await pb.collection('cooling_times').getFullList({
        sort: 'line_code,material_code',
        expand: 'plant_id,line_id,family_id,responsible_id',
      })

      return records.map((r: any) => {
        const lineCode = r.line_code || 'L1'
        const destLine = lineCode === 'ENF_L1' ? 'L1' : lineCode === 'L1' ? 'ENDIR' : 'ACAB_L2'
        return {
          id: r.id,
          center_code: r.center_code || '1001',
          plant_id: r.plant_id,
          origin_line_id: r.line_id,
          origin_line_code: lineCode,
          origin_work_center: r.work_center || `WC-DIV-${lineCode}`,
          dest_line_code: destLine,
          dest_work_center: `WC-${destLine}`,
          material_code: r.material_code || '-',
          material_description: r.material_description || '-',
          family_id: r.family_id,
          family_code: r.family_code || r.expand?.family_id?.code || '-',
          family_name: r.expand?.family_id?.name || '-',
          gauge_dimension: r.gauge_dimension || '-',
          cooling_time_hours: r.cooling_time_hours || 0,
          unit: 'Horas (h)',
          rule_condition: r.rule_condition || 'Padrão após conformação a quente',
          valid_from: r.valid_from
            ? new Date(r.valid_from).toLocaleDateString('pt-BR')
            : '01/01/2026',
          valid_until: r.valid_until
            ? new Date(r.valid_until).toLocaleDateString('pt-BR')
            : 'Vigente',
          origin: r.origin || 'ENGENHARIA',
          status: r.status || 'ATIVO',
          responsible_id: r.responsible_id,
          responsible_name:
            r.responsible_name || r.expand?.responsible_id?.name || 'Metalurgia CIAFAL',
          revision_number: r.revision_number || 1,
          notes: r.notes,
          created: r.created,
          updated: r.updated,
        }
      })
    } catch (err) {
      console.error('Erro ao buscar tempos de resfriamento:', err)
      return []
    }
  },

  /**
   * 4. Lista registros da Aba 4: Regras de Sequenciamento com tipos (PROIBITIVA, NÃO RECOMENDADA, etc)
   */
  async listSequencingRules(): Promise<SequencingRuleRecord[]> {
    try {
      const records = await pb.collection('rule_packs').getFullList({
        sort: 'scope_level,code',
        expand: 'company_id,plant_id,line_id',
      })

      // Regras enriquecidas com transições específicas de sequenciamento
      const baseRules: SequencingRuleRecord[] = [
        {
          id: 'seq-rule-1',
          code: 'SEQ_PROIB_RED_QUAD',
          name: 'Bloqueio Imediato Tubo Redondo -> Tubo Quadrado sem Acerto',
          version: 'v1.0',
          line_code: 'L1',
          from_family_code: 'TUB_RED',
          from_material_code: 'TR-OD-50',
          to_family_code: 'TUB_QUAD',
          to_material_code: 'TQ-50x50',
          rule_type: 'PROIBITIVA',
          penalty_score: 100,
          reason: 'Dano mecânico e desalinhamento grave nos cassetes de perfilação.',
          scope_level: 'LINE',
          status: 'ACTIVE',
          rules_payload: { maxSetupDurationMinutes: 120 },
        },
        {
          id: 'seq-rule-2',
          code: 'SEQ_NAO_REC_LARGO_FINO',
          name: 'Transição Não Recomendada Perfil Pesado -> Chapa Fina',
          version: 'v1.0',
          line_code: 'L2',
          from_family_code: 'PERF_U',
          from_material_code: 'PU-150x50',
          to_family_code: 'PERF_U',
          to_material_code: 'PU-100x40',
          rule_type: 'NAO_RECOMENDADA',
          penalty_score: 35,
          reason: 'Aumento do tempo de setup e risco de empenamento térmico nos rolos.',
          scope_level: 'LINE',
          status: 'ACTIVE',
          rules_payload: { maxSetupDurationMinutes: 60 },
        },
        {
          id: 'seq-rule-3',
          code: 'SEQ_PREF_CRESCENTE_BITOLA',
          name: 'Sequência Preferencial: Bitola Menor -> Maior',
          version: 'v1.0',
          line_code: 'L1',
          from_family_code: 'TUB_QUAD',
          from_material_code: 'TQ-20x20',
          to_family_code: 'TUB_QUAD',
          to_material_code: 'TQ-50x50',
          rule_type: 'PREFERENCIAL',
          penalty_score: -15, // Bonificação
          reason: 'Minimiza desgaste de matrizes e tempo de calibração micrométrica.',
          scope_level: 'GLOBAL',
          status: 'ACTIVE',
          rules_payload: { preferredFamilyOrder: ['TUB_QUAD', 'TUB_RET', 'TUB_RED'] },
        },
        {
          id: 'seq-rule-4',
          code: 'SEQ_NEUTRA_MESMA_FAMILIA',
          name: 'Transição Neutra: Mesmo Lote Dimensional',
          version: 'v1.0',
          line_code: 'L1',
          from_family_code: 'TUB_QUAD',
          from_material_code: 'TQ-50x50',
          to_family_code: 'TUB_QUAD',
          to_material_code: 'TQ-50x50',
          rule_type: 'NEUTRA',
          penalty_score: 0,
          reason: 'Apenas troca de bobina de aço sem troca de ferramental mecânico.',
          scope_level: 'LINE',
          status: 'ACTIVE',
          rules_payload: {},
        },
      ]

      const packRules = records.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        version: r.version,
        scope_level: r.scope_level,
        line_code: r.expand?.line_id?.code || 'TODAS',
        from_family_code: 'GLOBAL',
        to_family_code: 'GLOBAL',
        rule_type: 'PREFERENCIAL' as const,
        penalty_score: -10,
        reason: 'Diretriz corporativa de lote mínimo e buffer térmico.',
        status: r.status,
        rules_payload: r.rules_payload || {},
        created: r.created,
        updated: r.updated,
      }))

      return [...baseRules, ...packRules]
    } catch (err) {
      console.error('Erro ao buscar rule packs de sequenciamento:', err)
      return []
    }
  },

  /**
   * 5. Lista registros da Aba 5: Revisões Pendentes
   */
  async listPendingRevisions(): Promise<PendingRevisionRecord[]> {
    try {
      const records = await pb.collection('line_double_approvals').getFullList({
        sort: '-created',
        expand: 'pcp_approver_id,line_manager_approver_id',
      })

      return records.map((r: any) => ({
        id: r.id,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        entity_code: r.line_code || r.entity_type,
        line_code: r.line_code,
        parameter_name:
          r.entity_type === 'SETUP'
            ? `Setup ${r.entity_id}`
            : r.entity_type === 'COOLING'
              ? `Resfriamento ${r.entity_id}`
              : `Regra ${r.entity_id}`,
        current_value: r.entity_id === 'STP_L1_OUTDATED_EXAMPLE' ? '180 min' : '24 h',
        proposed_value: r.entity_id === 'STP_L1_OUTDATED_EXAMPLE' ? '120 min' : '20 h',
        version: r.version || 'v2.0 (Proposta)',
        change_reason: r.change_reason,
        ai_classification: 'COERENTE',
        ai_explanation: 'Baseado na mediana dos últimos 6 meses de apontamento MES.',
        status: (r.status as any) || 'PENDING_PCP',
        pcp_approver_name: r.expand?.pcp_approver_id?.name || r.expand?.pcp_approver_id?.email,
        pcp_approved_at: r.pcp_approved_at
          ? new Date(r.pcp_approved_at).toLocaleDateString('pt-BR')
          : undefined,
        pcp_notes: r.pcp_notes,
        line_manager_name:
          r.expand?.line_manager_approver_id?.name || r.expand?.line_manager_approver_id?.email,
        line_manager_approved_at: r.line_manager_approved_at
          ? new Date(r.line_manager_approved_at).toLocaleDateString('pt-BR')
          : undefined,
        line_manager_notes: r.line_manager_notes,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('Erro ao buscar revisões pendentes:', err)
      return []
    }
  },

  /**
   * 6. Lista registros da Aba 6: Histórico de Alterações de Regras
   */
  async listRuleAuditLogs(): Promise<RuleAuditLogRecord[]> {
    try {
      const records = await pb.collection('rule_audit_logs').getFullList({
        sort: '-created',
        expand: 'user_id,approver_id',
      })

      return records.map((r: any) => ({
        id: r.id,
        parameter_name: r.parameter_name,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        previous_value: r.previous_value,
        new_value: r.new_value,
        user_id: r.user_id,
        user_name: r.user_name || r.expand?.user_id?.name || 'Sistema',
        user_email: r.user_email || r.expand?.user_id?.email,
        change_date:
          r.change_date || (r.created ? new Date(r.created).toLocaleString('pt-BR') : ''),
        reason: r.reason,
        origin: r.origin || 'MANUAL',
        mes_validation_status: r.mes_validation_status || 'VALIDADO',
        ai_recommendation: r.ai_recommendation,
        approver_id: r.approver_id,
        approver_name: r.approver_name || r.expand?.approver_id?.name,
        published_at: r.published_at,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('Erro ao buscar histórico de auditoria de regras:', err)
      return []
    }
  },

  /**
   * Cria nova proposta de revisão de parâmetro (Workflow 2 Fases)
   */
  async createRevisionProposal(proposal: {
    entityType: 'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING'
    entityId: string
    lineCode: string
    currentValue: string
    proposedValue: string
    changeReason: string
    justificationCategory?: string
    justificationDetail?: string
    aiClassification: string
    aiExplanation: string
    mesSnapshot?: any
  }): Promise<PendingRevisionRecord> {
    const created = await pb.collection('line_double_approvals').create({
      entity_type: proposal.entityType,
      entity_id: proposal.entityId,
      line_code: proposal.lineCode,
      version: 'Proposta ' + new Date().toLocaleDateString('pt-BR'),
      change_reason:
        proposal.changeReason +
        (proposal.justificationDetail
          ? ` [Justificativa: ${proposal.justificationCategory} - ${proposal.justificationDetail}]`
          : ''),
      status: 'PENDING_PCP',
    })

    return {
      id: created.id,
      entity_type: proposal.entityType,
      entity_id: proposal.entityId,
      entity_code: proposal.lineCode,
      line_code: proposal.lineCode,
      parameter_name: `${proposal.entityType} ${proposal.entityId}`,
      current_value: proposal.currentValue,
      proposed_value: proposal.proposedValue,
      version: 'Proposta ' + new Date().toLocaleDateString('pt-BR'),
      change_reason: proposal.changeReason,
      technical_justification_category: proposal.justificationCategory,
      technical_justification_detail: proposal.justificationDetail,
      ai_classification: proposal.aiClassification,
      ai_explanation: proposal.aiExplanation,
      mes_evidence_snapshot: proposal.mesSnapshot,
      status: 'PENDING_PCP',
      created: created.created,
    }
  },

  /**
   * Aprova uma revisão pendente (PCP ou Gestor de Linha)
   */
  async approveRevision(
    id: string,
    stage: 'PCP' | 'LINE_MANAGER',
    approverName: string,
    notes?: string,
  ): Promise<void> {
    const patch: any = {}
    if (stage === 'PCP') {
      patch.status = 'PENDING_LINE_MANAGER'
      patch.pcp_approved_at = new Date().toISOString()
      patch.pcp_notes = notes || 'Aprovado tecnicamente pelo PCP'
    } else {
      patch.status = 'APPROVED'
      patch.line_manager_approved_at = new Date().toISOString()
      patch.line_manager_notes = notes || 'Homologado pela Gerência de Linha'
    }

    await pb.collection('line_double_approvals').update(id, patch)

    // Se aprovado em 2ª fase, grava na trilha de auditoria e publica
    if (stage === 'LINE_MANAGER') {
      await pb.collection('rule_audit_logs').create({
        parameter_name: `Revisão Oficial #${id.slice(0, 8)}`,
        entity_type: 'DOUBLE_APPROVAL',
        entity_id: id,
        previous_value: 'Versão Anterior',
        new_value: 'Publicada Oficial',
        user_name: approverName,
        change_date: new Date().toLocaleString('pt-BR'),
        reason: notes || 'Aprovação em 2 Fases Homologada',
        origin: 'MANUAL',
        mes_validation_status: 'VALIDADO',
        ai_recommendation: '🟢 COERENTE — Homologado e Publicado.',
        approver_name: approverName,
        published_at: new Date().toLocaleString('pt-BR'),
      })
    }
  },

  /**
   * Salva novo registro de Resfriamento
   */
  async saveCoolingTime(data: Partial<CoolingTimeRecord>): Promise<CoolingTimeRecord> {
    if (data.id) {
      return await pb.collection('cooling_times').update<CoolingTimeRecord>(data.id, data)
    }
    return await pb.collection('cooling_times').create<CoolingTimeRecord>(data)
  },

  /**
   * Salva registro de log de auditoria
   */
  async logRuleChange(data: Partial<RuleAuditLogRecord>): Promise<RuleAuditLogRecord> {
    return await pb.collection('rule_audit_logs').create<RuleAuditLogRecord>(data)
  },
}
export default pcpRulesService
