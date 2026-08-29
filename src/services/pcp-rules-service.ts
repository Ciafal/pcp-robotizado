import pb from '@/lib/pocketbase/client'
import { ProductionLine, ProductFamily } from '@/types/line-master'

export interface SetupAcertoRecord {
  id: string
  center_code: string
  line_id?: string
  line_code: string
  work_center: string
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
  created?: string
  updated?: string
}

export interface CoolingTimeRecord {
  id: string
  center_code: string
  plant_id?: string
  line_id?: string
  line_code: string
  work_center: string
  material_code?: string
  material_description?: string
  family_id?: string
  family_code?: string
  family_name?: string
  gauge_dimension: string
  cooling_time_hours: number
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
  scope_level: 'GLOBAL' | 'COMPANY' | 'PLANT' | 'LINE' | 'RESOURCE'
  company_code?: string
  plant_code?: string
  line_code?: string
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
  version: string
  change_reason: string
  status: 'PENDING_PCP' | 'PENDING_LINE_MANAGER' | 'APPROVED' | 'REJECTED'
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
  origin: 'SAP' | 'MES' | 'MANUAL' | 'IA_OPTIMIZER' | 'ENGENHARIA'
  mes_validation_status: 'VALIDADO' | 'PENDENTE' | 'NAO_APLICAVEL' | 'DIVERGENCIA'
  ai_recommendation?: string
  approver_id?: string
  approver_name?: string
  published_at?: string
  created?: string
  updated?: string
}

export const pcpRulesService = {
  /**
   * 1. Lista registros da Aba 1: Setup & Acerto
   * Mapeia de `line_setup_matrix` e `line_setups`
   */
  async listSetupAcerto(filters?: {
    lineCode?: string
    plantCode?: string
  }): Promise<SetupAcertoRecord[]> {
    try {
      const records = await pb.collection('line_setup_matrix').getFullList({
        sort: 'setup_code',
        expand: 'line_id,line_id.plant_id,from_family_id,to_family_id',
      })

      return records.map((r: any) => {
        const line = r.expand?.line_id
        const plant = line?.expand?.plant_id
        const toFam = r.expand?.to_family_id
        const lineCode = line?.code || 'L1'
        const centerCode = plant?.sap_plant_code || plant?.code || '1001'
        const workCenter = line?.sap_work_center || `WC-${lineCode}`

        return {
          id: r.id,
          center_code: centerCode,
          line_id: r.line_id,
          line_code: lineCode,
          work_center: workCenter,
          to_family_id: r.to_family_id,
          to_family_code: toFam?.code || 'TUB_QUAD',
          to_family_name: toFam?.name || 'Tubos Quadrados',
          to_code_prefix: r.to_product_code ? r.to_product_code.slice(0, 4) : 'TQ-',
          to_description_gauge: r.setup_description || 'Ajuste de Matriz e Bitola',
          setup_time_minutes: r.setup_duration_minutes || 45,
          tuning_time_minutes: Math.max(10, Math.round((r.setup_duration_minutes || 45) * 0.25)), // Acerto estimado
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
   * 2. Lista registros da Aba 2: Paradas Programadas
   * Mapeia de `standard_scheduled_stops`
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

        return {
          id: r.id,
          center_code: centerCode,
          line_id: r.line_id,
          line_code: lineCode,
          work_center: workCenter,
          stop_type: categoryLabels[r.category] || r.category || 'Preventiva',
          reason: r.code,
          description: r.description,
          duration_minutes: r.expected_duration_minutes || 60,
          start_time: r.scheduled_time || '06:00',
          end_time: 'Conforme Duração',
          recurrence: recurrenceLabels[r.recurrence] || r.recurrence || 'Semanal',
          shift: r.applicable_shift || 'Todos os Turnos',
          validity: r.valid_from ? new Date(r.valid_from).toLocaleDateString('pt-BR') : 'Vigente',
          status: r.active ? 'ATIVO' : 'INATIVO',
          responsible_name: 'Manutenção Mecânica / Elétrica',
          observation: r.expected_impact || '',
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
   * 3. Lista registros da Aba 3: Tempos de Resfriamento
   * Mapeia de `cooling_times`
   */
  async listCoolingTimes(filters?: { lineCode?: string }): Promise<CoolingTimeRecord[]> {
    try {
      const records = await pb.collection('cooling_times').getFullList({
        sort: 'line_code,material_code',
        expand: 'plant_id,line_id,family_id,responsible_id',
      })

      return records.map((r: any) => ({
        id: r.id,
        center_code: r.center_code || '1001',
        plant_id: r.plant_id,
        line_id: r.line_id,
        line_code: r.line_code,
        work_center: r.work_center || `WC-${r.line_code}`,
        material_code: r.material_code || '-',
        material_description: r.material_description || '-',
        family_id: r.family_id,
        family_code: r.family_code || r.expand?.family_id?.code || '-',
        family_name: r.expand?.family_id?.name || '-',
        gauge_dimension: r.gauge_dimension || '-',
        cooling_time_hours: r.cooling_time_hours || 0,
        rule_condition: r.rule_condition || 'Padrão após conformação a quente',
        valid_from: r.valid_from ? new Date(r.valid_from).toLocaleDateString('pt-BR') : undefined,
        valid_until: r.valid_until
          ? new Date(r.valid_until).toLocaleDateString('pt-BR')
          : undefined,
        origin: r.origin || 'MANUAL',
        status: r.status || 'ATIVO',
        responsible_id: r.responsible_id,
        responsible_name:
          r.responsible_name || r.expand?.responsible_id?.name || 'Metalurgia CIAFAL',
        revision_number: r.revision_number || 1,
        notes: r.notes,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('Erro ao buscar tempos de resfriamento:', err)
      return []
    }
  },

  /**
   * 4. Lista registros da Aba 4: Regras de Sequenciamento
   * Mapeia de `rule_packs`
   */
  async listSequencingRules(): Promise<SequencingRuleRecord[]> {
    try {
      const records = await pb.collection('rule_packs').getFullList({
        sort: 'scope_level,code',
        expand: 'company_id,plant_id,line_id',
      })

      return records.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        version: r.version,
        scope_level: r.scope_level,
        company_code: r.expand?.company_id?.code,
        plant_code: r.expand?.plant_id?.code,
        line_code: r.expand?.line_id?.code,
        status: r.status,
        rules_payload: r.rules_payload || {},
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.error('Erro ao buscar rule packs de sequenciamento:', err)
      return []
    }
  },

  /**
   * 5. Lista registros da Aba 5: Revisões Pendentes
   * Mapeia de `line_double_approvals`
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
        version: r.version,
        change_reason: r.change_reason,
        status: r.status,
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
   * Mapeia de `rule_audit_logs`
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
