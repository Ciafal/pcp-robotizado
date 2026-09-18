import pb from '@/lib/pocketbase/client'
import {
  getMasterSheetCompleteness,
  calculateCompletenessFromOverview,
  invalidateCompletenessCache,
} from '@/services/master-sheet-completeness'

// Cache em memória com TTL de 60s por lineId para evitar getOne quando o registro já está em mãos
const LINE_CACHE_TTL_MS = 60_000
const lineMemoryCache = new Map<string, { record: ProductionLine; timestamp: number }>()

export function invalidateLineMemoryCache(lineId?: string) {
  if (lineId) {
    lineMemoryCache.delete(lineId)
  } else {
    lineMemoryCache.clear()
  }
}
import {
  LineAdjustmentTimeRule,
  LineApproverMatrix,
  LineAuditVersion,
  LineBlockedProduct,
  LineCapability,
  LineConfigurationAlert,
  LineManagerAssignment,
  LineMaster,
  LineOrgHierarchy,
  LineOverviewData,
  LineProductivityRate,
  LineRawMaterialPriority,
  LineRulePackRef,
  LineSequencingDependency,
  LineSetup,
  LineSetupMatrix,
  LineStructuralConstraint,
  ProductionCalendar,
  ProductionCrew,
  ProductionLine,
  ProductionShift,
  ProductionShiftCrew,
  ProductFamily,
  StandardScheduledStop,
} from '@/types/line-master'

export const lineMasterService = {
  // ==========================================
  // 1. LINHAS PRODUTIVAS (production_lines)
  // ==========================================
  async listLines(filterOptions?: {
    activeOnly?: boolean
    includeInactive?: boolean
  }): Promise<(ProductionLine & { shifts_summary?: string[]; crews_summary?: string[] })[]> {
    try {
      let filterStr = ''
      if (filterOptions?.activeOnly) {
        filterStr = 'is_active = true'
      } else if (filterOptions?.includeInactive === false) {
        filterStr = 'is_active = true'
      }

      const [lines, allShifts, allCrews, allMasters] = await Promise.all([
        pb.collection('production_lines').getFullList<ProductionLine>({
          sort: 'code',
          filter: filterStr || undefined,
        }),
        pb
          .collection('production_shifts')
          .getFullList<ProductionShift>({
            filter: 'active = true || active = null',
            sort: 'sequence_order,code',
          })
          .catch(() => []),
        pb
          .collection('production_crews')
          .getFullList<ProductionCrew>({
            filter: 'active = true || active = null',
            sort: 'code',
          })
          .catch(() => []),
        pb
          .collection('line_masters')
          .getFullList<LineMaster>({
            filter: "status = 'ACTIVE'",
            sort: '-version',
          })
          .catch(() => []),
      ])

      return lines.map((l) => {
        // Alimenta o cache em memória com o registro da listagem para evitar getOne posterior
        lineMemoryCache.set(l.id, { record: l, timestamp: Date.now() })
        const lineShifts = allShifts.filter((s) => s.line_id === l.id).map((s) => s.code)
        const lineCrews = allCrews.filter((c) => c.line_id === l.id).map((c) => c.code)
        const activeMaster = allMasters.find((m) => m.line_id === l.id)
        // Fonte única de verdade: line_masters.programming_type com fallback para lines.programming_type
        const resolvedProgrammingType = activeMaster?.programming_type || l.programming_type
        return {
          ...l,
          programming_type: resolvedProgrammingType,
          shifts_summary: lineShifts,
          crews_summary: lineCrews,
          sap_plant_code: activeMaster?.sap_plant_code ?? (l as any).sap_plant_code,
          nominal_hourly_capacity:
            activeMaster?.nominal_hourly_capacity ?? (l as any).nominal_hourly_capacity,
          planned_efficiency_pct:
            activeMaster?.planned_efficiency_pct ?? (l as any).planned_efficiency_pct,
        }
      })
    } catch (err) {
      console.error('Erro ao listar linhas:', err)
      return []
    }
  },

  async toggleLineActive(lineId: string, isActive: boolean): Promise<ProductionLine> {
    const line = await this.getLineById(lineId)
    if (!isActive) {
      const count = await this.checkFutureSchedulesCount(line.code)
      if (count > 0) {
        throw new Error(
          `Esta linha possui ${count} itens programados em datas futuras. Revise/cancele essas programações antes de inativar a linha.`,
        )
      }
    }

    // 1. Atualizar is_active no PocketBase
    await pb.collection('production_lines').update(lineId, {
      is_active: Boolean(isActive),
    })

    // 2. Leitura de confirmação imediata (getOne) para garantir persistência real antes de retornar
    const confirmedRecord = await pb.collection('production_lines').getOne<ProductionLine>(lineId)
    if (Boolean(confirmedRecord.is_active) !== Boolean(isActive)) {
      throw new Error(
        `Falha na confirmação de persistência: is_active esperado ${isActive}, retornado ${confirmedRecord.is_active}.`,
      )
    }

    // Invalida cache de completude da linha para recomposição imediata
    invalidateCompletenessCache(lineId)

    // Registrar auditoria expressa de forma isolada em try/catch silencioso
    const currentUser = pb.authStore.record || pb.authStore.model
    const authId = currentUser?.id || null
    if (authId) {
      try {
        await pb.collection('pcp_audit_logs').create({
          user_id: authId,
          user_email: (currentUser as any)?.email || '',
          user_name: (currentUser as any)?.name || (currentUser as any)?.email || 'Usuário PCP',
          user_role: (currentUser as any)?.role || 'PCP_ADMIN',
          event_type: 'PERMISSION_CHANGED',
          action: isActive ? 'ACTIVATE_LINE' : 'DEACTIVATE_LINE',
          resource: 'production_lines',
          resource_id: lineId,
          permission_required: 'pcp.masterdata.edit',
          scope: line.code,
          outcome: 'SUCCESS',
          details: {
            line_code: line.code,
            line_name: line.name,
            status_anterior: line.is_active !== false ? 'Ativa' : 'Inativa',
            status_novo: isActive ? 'Ativa' : 'Inativa',
            data_hora: new Date().toISOString(),
          },
        })
      } catch (auditErr) {
        // Falha de log nunca interrompe nem falseia o salvamento
        console.warn(
          'Erro ao gravar log de auditoria ao alternar status da linha (ignorado):',
          auditErr,
        )
      }
    }

    return confirmedRecord
  },

  async checkFutureSchedulesCount(lineCode: string): Promise<number> {
    try {
      // Verifica programações futuras na tabela weekly_schedules
      const records = await pb.collection('weekly_schedules').getFullList({
        filter: `line_code = '${lineCode}' && status != 'REALIZADO' && status != 'ANALISADO'`,
      })
      return records.length
    } catch {
      return 0
    }
  },

  async getLineById(lineId: string, lineOverride?: ProductionLine): Promise<ProductionLine> {
    if (lineOverride && lineOverride.id === lineId) {
      lineMemoryCache.set(lineId, { record: lineOverride, timestamp: Date.now() })
      return lineOverride
    }
    const cached = lineMemoryCache.get(lineId)
    if (cached && Date.now() - cached.timestamp < LINE_CACHE_TTL_MS) {
      return cached.record
    }
    const record = await pb.collection('production_lines').getOne<ProductionLine>(lineId)
    lineMemoryCache.set(lineId, { record, timestamp: Date.now() })
    return record
  },

  async createLine(data: Partial<ProductionLine>): Promise<ProductionLine> {
    const created = await pb.collection('production_lines').create<ProductionLine>(data)
    try {
      const { pcpAuditService } = await import('@/services/pcp-audit-service')
      await pcpAuditService.recordLog({
        action: `Criação de Linha / Centro Produtivo: ${created.name} (${created.code})`,
        event_type: 'Criação',
        module: 'Centros e Ficha Mestra',
        screen: 'Hierarquia das Linhas',
        line: created.code,
        record_id: created.id,
        entity: 'production_lines',
        source: 'Usuário',
        status: 'Concluída',
        reason: 'Estruturação cadastral de linha de produção',
        justification: `Cadastro de nova linha produtiva ${created.name}`,
        changes: Object.entries(data).map(([field, val]) => ({
          field,
          fieldNamePt: field,
          before: null,
          after: val,
        })),
      })
    } catch (audErr) {
      console.warn('Erro na auditoria de criação de linha:', audErr)
    }
    return created
  },

  async updateLine(lineId: string, data: Partial<ProductionLine>): Promise<ProductionLine> {
    // Sanitização rigorosa: enviar para a coleção production_lines apenas os campos válidos existentes no schema
    const allowedKeys: (keyof ProductionLine)[] = [
      'name',
      'code',
      'status',
      'target_rate',
      'current_rate',
      'efficiency',
      'plant_id',
      'sap_work_center',
      'nominal_capacity',
      'capacity_unit',
      'shifts_count',
      'manager_user_id',
      'pcp_programmer_user_id',
      'is_active',
      'programming_type',
      'programming_stages',
      'process',
    ]

    const numericFields = new Set<keyof ProductionLine>([
      'target_rate',
      'current_rate',
      'efficiency',
      'nominal_capacity',
      'shifts_count',
    ])

    const relationFields = new Set<keyof ProductionLine>([
      'plant_id',
      'manager_user_id',
      'pcp_programmer_user_id',
    ])

    const sanitizeNumber = (val: unknown): number | null => {
      if (val === '' || val === null || val === undefined) return null
      const n = Number(val)
      return isNaN(n) ? null : n
    }

    const sanitizedPayload: Record<string, unknown> = {}
    for (const key of allowedKeys) {
      if (key in data && (data as Record<string, unknown>)[key] !== undefined) {
        const rawVal = (data as Record<string, unknown>)[key]

        if (numericFields.has(key)) {
          const numVal = sanitizeNumber(rawVal)
          if (numVal !== null) {
            sanitizedPayload[key] = numVal
          }
          // Quando nulo, OMITIR a chave do payload (nunca enviar "" e nunca enviar string)
        } else if (relationFields.has(key)) {
          // Campos relacionais do PocketBase: nunca enviar "" (string vazia causa erro 400).
          // Se string vazia ou nulo/indefinido, enviar null se a intenção for desvincular ou omitir se indefinido.
          if (rawVal === '' || rawVal === null) {
            sanitizedPayload[key] = null
          } else if (typeof rawVal === 'string' && rawVal.trim()) {
            sanitizedPayload[key] = rawVal.trim()
          }
        } else if (key === 'is_active') {
          sanitizedPayload[key] = Boolean(rawVal)
        } else if (
          key === 'name' ||
          key === 'code' ||
          key === 'sap_work_center' ||
          key === 'process'
        ) {
          if (typeof rawVal === 'string') {
            const trimmed = rawVal.trim()
            if (trimmed !== '') {
              sanitizedPayload[key] = trimmed
            } else if (key === 'sap_work_center' || key === 'process') {
              sanitizedPayload[key] = ''
            } else {
              sanitizedPayload[key] = trimmed
            }
          } else if (rawVal !== null && rawVal !== undefined) {
            sanitizedPayload[key] = rawVal
          }
        } else if (rawVal !== null && rawVal !== undefined && rawVal !== '') {
          sanitizedPayload[key] = rawVal
        }
      }
    }

    // 1. Executar o update
    await pb.collection('production_lines').update(lineId, sanitizedPayload)

    // 2. Leitura de confirmação (getOne) antes de prosseguir
    const confirmedRecord = await pb.collection('production_lines').getOne<ProductionLine>(lineId)

    // Validar se is_active foi persistido corretamente quando fornecido
    if (
      'is_active' in sanitizedPayload &&
      Boolean(confirmedRecord.is_active) !== Boolean(sanitizedPayload.is_active)
    ) {
      throw new Error(
        `Falha na confirmação de persistência da linha: is_active esperado ${sanitizedPayload.is_active}, retornado ${confirmedRecord.is_active}.`,
      )
    }

    // Invalida cache de completude da linha para recomposição imediata
    invalidateCompletenessCache(lineId)
    lineMemoryCache.set(lineId, { record: confirmedRecord, timestamp: Date.now() })

    // Registro na Trilha Oficial de Auditoria Transacional
    try {
      const { pcpAuditService } = await import('@/services/pcp-audit-service')
      const changesList = Object.entries(sanitizedPayload).map(([field, val]) => ({
        field,
        fieldNamePt: field,
        before: undefined,
        after: val,
      }))
      await pcpAuditService.recordLog({
        action: `Alteração de Linha / Ficha Mestra: ${confirmedRecord.name} (${confirmedRecord.code})`,
        event_type: 'Alteração',
        module: 'Centros e Ficha Mestra',
        screen: 'Ficha Mestra',
        line: confirmedRecord.code,
        record_id: lineId,
        entity: 'production_lines',
        source: 'Usuário',
        status: 'Concluída',
        reason: 'Atualização de parâmetros cadastrais da linha',
        justification: `Modificação de parâmetros estruturais da Linha ${confirmedRecord.code}`,
        changes: changesList,
      })
    } catch (audErr) {
      console.warn('Erro ao auditar updateLine:', audErr)
    }

    return confirmedRecord
  },

  async deleteLine(lineId: string): Promise<boolean> {
    return await pb.collection('production_lines').delete(lineId)
  },

  // ==========================================
  // 2. CONTEXTO COMPLETO DA LINHA (Visão 360)
  // ==========================================
  async getLineOverview(lineId: string, lineOverride?: ProductionLine): Promise<LineOverviewData> {
    const line = await this.getLineById(lineId, lineOverride)

    // Consultas paralelas para performance industrial
    const [
      masters,
      hierarchy,
      managers,
      approvers,
      sequencing,
      shifts,
      crews,
      shiftCrews,
      calendars,
      capabilities,
      productivity,
      rawMaterials,
      blockedProducts,
      setups,
      setupMatrix,
      adjustmentRules,
      scheduledStops,
      constraints,
      rulePacks,
      auditLogs,
    ] = await Promise.all([
      pb
        .collection('line_masters')
        .getFullList<LineMaster>({
          filter: `line_id = '${lineId}' && status = 'ACTIVE'`,
          sort: '-version',
        })
        .catch(() => []),
      pb
        .collection('line_org_hierarchy')
        .getFullList<LineOrgHierarchy>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: 'org_level_order',
          expand: 'user_id,substitute_user_id',
        })
        .catch(() => []),
      pb
        .collection('line_managers_assignment')
        .getFullList<LineManagerAssignment>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: 'responsibility_type',
          expand: 'user_id',
        })
        .catch(() => []),
      pb
        .collection('line_approvers_matrix')
        .getFullList<LineApproverMatrix>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: 'sequence_order',
          expand: 'user_id,substitute_user_id',
        })
        .catch(() => []),
      pb
        .collection('line_sequencing_dependencies')
        .getFullList<LineSequencingDependency>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: 'sequence_order',
          expand: 'previous_line_id,next_line_id',
        })
        .catch(() => []),
      pb
        .collection('production_shifts')
        .getFullList<ProductionShift>({
          filter: `line_id = '${lineId}'`,
          sort: 'sequence_order,start_time',
        })
        .catch(() => []),
      pb
        .collection('production_crews')
        .getFullList<ProductionCrew>({
          filter: `line_id = '${lineId}'`,
          sort: 'code',
        })
        .catch(() => []),
      pb
        .collection('production_shift_crews')
        .getFullList<ProductionShiftCrew>({
          filter: `line_id = '${lineId}'`,
          expand: 'shift_id,crew_id',
        })
        .catch(() => []),
      pb
        .collection('production_calendars')
        .getFullList<ProductionCalendar>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: '-year',
        })
        .catch(() => []),
      pb
        .collection('line_capabilities')
        .getFullList<LineCapability>({
          filter: `line_id = '${lineId}' && active = true`,
          expand: 'product_family_id',
        })
        .catch(() => []),
      pb
        .collection('line_productivity_rates')
        .getFullList<LineProductivityRate>({
          filter: `line_id = '${lineId}'`,
          sort: 'material_product_code',
          expand: 'product_family_id,sap_integration_id',
        })
        .catch(() => []),
      pb
        .collection('line_raw_material_priorities')
        .getFullList<LineRawMaterialPriority>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: 'priority_order',
          expand: 'product_family_id,sap_integration_id',
        })
        .catch(() => []),
      pb
        .collection('line_blocked_products')
        .getFullList<LineBlockedProduct>({
          filter: `line_id = '${lineId}' && active = true`,
          sort: '-created',
          expand: 'product_family_id,responsible_user_id,sap_integration_id',
        })
        .catch(() => []),
      pb
        .collection('line_setups')
        .getFullList<LineSetup>({
          filter: `line_id = '${lineId}' && active = true`,
        })
        .catch(() => []),
      pb
        .collection('line_setup_matrix')
        .getFullList<LineSetupMatrix>({
          filter: `line_id = '${lineId}' && (active = true || active = null)`,
          sort: 'setup_code',
          expand: 'from_family_id,to_family_id,sap_integration_id',
        })
        .catch(() => []),
      pb
        .collection('adjustment_time_rules')
        .getFullList<LineAdjustmentTimeRule>({
          filter: `line_id = '${lineId}' && (active = true || active = null)`,
          sort: 'material_code,sample_type',
        })
        .catch(() => []),
      pb
        .collection('standard_scheduled_stops')
        .getFullList<StandardScheduledStop>({
          filter: `line_id = '${lineId}'`,
          sort: '-created',
        })
        .catch(() => []),
      pb
        .collection('line_structural_constraints')
        .getFullList<LineStructuralConstraint>({
          filter: `line_id = '${lineId}' && active = true`,
        })
        .catch(() => []),
      pb
        .collection('line_rule_pack_refs')
        .getFullList<LineRulePackRef>({
          filter: `line_id = '${lineId}'`,
        })
        .catch(() => []),
      pb
        .collection('pcp_audit_logs')
        .getFullList({
          filter: `resource = 'production_lines' && resource_id = '${lineId}'`,
          sort: '-created',
          expand: 'user_id',
        })
        .catch(() => []),
    ])

    // Adaptar os logs de pcp_audit_logs para a interface LineAuditVersion mantendo retrocompatibilidade visual
    const history: LineAuditVersion[] = (auditLogs as any[]).map((log) => ({
      id: log.id,
      line_id: log.resource_id || lineId,
      line_master_id: log.details?.line_master_id || '',
      version: log.details?.version || 1,
      action: (log.details?.action || 'UPDATE') as any,
      changed_fields: log.details?.changed_fields || [],
      changed_by: log.user_id || '',
      change_reason: log.details?.change_reason || log.action || 'Atualização cadastral da linha',
      snapshot_data: log.details?.snapshot_data || log.details || {},
      created: log.created,
      expand: {
        changed_by: log.expand?.user_id
          ? {
              id: log.expand.user_id.id,
              name: log.expand.user_id.name || log.user_name,
              email: log.expand.user_id.email || log.user_email || '',
            }
          : undefined,
      },
    }))

    const activeMaster = masters.length > 0 ? masters[0] : null

    // Geração dinâmica de alertas de governança e configuração
    const alerts: LineConfigurationAlert[] = []

    if (managers.length === 0) {
      alerts.push({
        id: 'alt_no_mgr',
        level: 'CRITICAL',
        category: 'ORGANIZATION',
        title: 'Linha sem Gestor Titular',
        description:
          'Não há gestor operacional principal associado à linha para liberação de programação.',
        resolutionAction: 'Associar Gestor na aba Organização',
      })
    }

    const mandatoryApprovers = approvers.filter((a) => a.requirement_type === 'MANDATORY')
    if (mandatoryApprovers.length === 0 && approvers.length === 0) {
      alerts.push({
        id: 'alt_no_app',
        level: 'WARNING',
        category: 'GOVERNANCE',
        title: 'Nenhum Aprovador Configurado',
        description:
          'A linha não possui aprovadores definidos. Se a aprovação for mandatória, os planos não poderão ser homologados.',
        resolutionAction: 'Configurar Matriz de Aprovadores',
      })
    }

    if (sequencing.length === 0) {
      alerts.push({
        id: 'alt_no_seq',
        level: 'INFO',
        category: 'PROCESS',
        title: 'Sequenciamento Produtivo Não Definido',
        description:
          'A linha não possui predecessores ou sucessores declarados no fluxo de fábrica.',
        resolutionAction: 'Configurar Sequenciamento na aba Processo',
      })
    }

    const activeProductivity = productivity.filter((p) => p.active !== false)
    if (activeProductivity.length === 0) {
      alerts.push({
        id: 'alt_no_prod',
        level: 'WARNING',
        category: 'CAPACITY',
        title: 'Produtividade Não Cadastrada',
        description:
          'Sem taxas de cadência (t/h, peça/h) ativas, o cálculo de capacidade horária é apenas estimativo.',
        resolutionAction: 'Cadastrar Produtividade Manual ou SAP',
      })
    }

    // Alerta para itens SAP sem teste ou com erro
    const unverifiedSap = [
      ...productivity.filter(
        (p) =>
          p.source_mode === 'SAP' &&
          (!p.sap_integration_id || p.expand?.sap_integration_id?.last_status !== 'CONECTADO'),
      ),
      ...rawMaterials.filter(
        (r) =>
          r.source_mode === 'SAP' &&
          (!r.sap_integration_id || r.expand?.sap_integration_id?.last_status !== 'CONECTADO'),
      ),
    ]
    if (unverifiedSap.length > 0) {
      alerts.push({
        id: 'alt_sap_untested',
        level: 'WARNING',
        category: 'INTEGRATION',
        title: 'Integração SAP com Fonte Pendente ou Não Testada',
        description: `${unverifiedSap.length} parâmetro(s) estão com origem SAP sem confirmação de RFC/BAPI ativa.`,
        resolutionAction: 'Acessar Governança de Fontes e validar BAPIs',
      })
    }

    // Alerta de produto bloqueado
    if (blockedProducts.length > 0) {
      alerts.push({
        id: 'alt_blocked_prod',
        level: 'INFO',
        category: 'PROCESS',
        title: `${blockedProducts.length} Produto(s) com Bloqueio Ativo`,
        description: 'O motor de programação ignorará itens bloqueados nesta linha.',
      })
    }

    // Cálculo dinâmico de completude via motor determinístico de Ficha Mestre
    const partialOverview: LineOverviewData = {
      line,
      master: activeMaster,
      hierarchy,
      managers,
      approvers,
      sequencing,
      shifts,
      crews,
      shiftCrews,
      calendar: calendars.length > 0 ? calendars[0] : null,
      capabilities,
      productivity,
      rawMaterials,
      blockedProducts,
      setups,
      setupMatrix,
      adjustmentRules,
      scheduledStops,
      constraints,
      rulePacks,
      history,
      alerts,
      completeness: 0,
      readyForScheduling: false,
    }

    const completenessRes = calculateCompletenessFromOverview(partialOverview)
    const score = completenessRes.percentage

    // Ready for scheduling: requer linha ativa (is_active), gestor, capacidade, turnos e ao menos capacidades/produtividade
    // NOTA: Aprovador NÃO bloqueia se a aprovação for opcional/não aplicável; completude ≠ homologação
    const isLineActive = line.is_active !== false
    const readyForScheduling =
      isLineActive &&
      managers.length > 0 &&
      shifts.length > 0 &&
      (activeMaster ? activeMaster.nominal_hourly_capacity > 0 : true) &&
      capabilities.length > 0 &&
      score >= 70

    return {
      ...partialOverview,
      completeness: score,
      readyForScheduling,
    }
  },

  // ==========================================
  // 3. GESTORES DA LINHA (CRUD)
  // ==========================================
  // Service exportado para acesso externo padronizado
  getMasterSheetCompleteness,

  async saveManagerAssignment(
    data: Partial<LineManagerAssignment>,
  ): Promise<LineManagerAssignment> {
    invalidateCompletenessCache(data.line_id)

    // Sanitização de campos relacionais e vazios
    const cleanPayload: Record<string, unknown> = { ...data }
    if (cleanPayload.user_id === '') cleanPayload.user_id = null
    if (cleanPayload.line_id === '') cleanPayload.line_id = null

    // Remover chaves com valor undefined
    Object.keys(cleanPayload).forEach((k) => {
      if (cleanPayload[k] === undefined) delete cleanPayload[k]
    })

    if (data.id) {
      return await pb
        .collection('line_managers_assignment')
        .update<LineManagerAssignment>(data.id, cleanPayload)
    }
    return await pb
      .collection('line_managers_assignment')
      .create<LineManagerAssignment>(cleanPayload)
  },

  async deleteManagerAssignment(id: string): Promise<boolean> {
    return await pb.collection('line_managers_assignment').delete(id)
  },

  // ==========================================
  // 4. APROVADORES DA LINHA (CRUD)
  // ==========================================
  async saveApprover(data: Partial<LineApproverMatrix>): Promise<LineApproverMatrix> {
    invalidateCompletenessCache(data.line_id)

    // Sanitização de campos relacionais e vazios
    const cleanPayload: Record<string, unknown> = { ...data }
    if (cleanPayload.user_id === '') cleanPayload.user_id = null
    if (cleanPayload.substitute_user_id === '') cleanPayload.substitute_user_id = null
    if (cleanPayload.line_id === '') cleanPayload.line_id = null

    Object.keys(cleanPayload).forEach((k) => {
      if (cleanPayload[k] === undefined) delete cleanPayload[k]
    })

    if (data.id) {
      return await pb
        .collection('line_approvers_matrix')
        .update<LineApproverMatrix>(data.id, cleanPayload)
    }
    return await pb.collection('line_approvers_matrix').create<LineApproverMatrix>(cleanPayload)
  },

  async deleteApprover(id: string): Promise<boolean> {
    return await pb.collection('line_approvers_matrix').delete(id)
  },

  // ==========================================
  // 5. SEQUENCIAMENTO & DEPENDÊNCIAS (CRUD sincronizado com Mapa de Integração)
  // ==========================================
  async saveSequencing(data: Partial<LineSequencingDependency>): Promise<LineSequencingDependency> {
    invalidateCompletenessCache(data.line_id)
    if (data.id) {
      return await pb
        .collection('line_sequencing_dependencies')
        .update<LineSequencingDependency>(data.id, data)
    }
    return await pb
      .collection('line_sequencing_dependencies')
      .create<LineSequencingDependency>(data)
  },

  async deleteSequencing(id: string): Promise<boolean> {
    return await pb.collection('line_sequencing_dependencies').delete(id)
  },

  async getAllSequencingDependencies(): Promise<LineSequencingDependency[]> {
    return pb.collection('line_sequencing_dependencies').getFullList<LineSequencingDependency>({
      sort: 'sequence_order',
      expand: 'line_id,previous_line_id,next_line_id',
    })
  },

  async updateSequencingDependencyOrder(
    dependencyId: string,
    sequenceOrder: number,
  ): Promise<void> {
    await pb.collection('line_sequencing_dependencies').update(dependencyId, {
      sequence_order: sequenceOrder,
    })
  },

  async addCenterToLineSequence(params: {
    lineId: string
    centerId: string
    sequenceOrder: number
    notes?: string
  }): Promise<LineSequencingDependency> {
    const created = await pb
      .collection('line_sequencing_dependencies')
      .create<LineSequencingDependency>({
        line_id: params.lineId,
        next_line_id: params.centerId,
        sequence_order: params.sequenceOrder,
        dependency_type: 'TRANSFER_BATCH',
        relation_nature: 'MANDATORY',
        active: true,
        notes: params.notes || 'Vínculo operacional de hierarquia e sequência industrial',
      })

    const currentUser = pb.authStore.record || pb.authStore.model
    if (currentUser?.id) {
      try {
        await pb.collection('pcp_audit_logs').create({
          user_id: currentUser.id,
          user_email: (currentUser as any)?.email || '',
          user_name: (currentUser as any)?.name || 'Usuário PCP',
          user_role: (currentUser as any)?.role || 'PCP_ADMIN',
          event_type: 'RULE_ACTION',
          action: 'ADD_CENTER_TO_LINE_SEQUENCE',
          resource: 'line_sequencing_dependencies',
          resource_id: created.id,
          permission_required: 'pcp.masterdata.edit',
          scope: params.lineId,
          outcome: 'SUCCESS',
          details: params,
        })
      } catch (err) {
        console.warn('Erro ao registrar auditoria de hierarquia (ignorado):', err)
      }
    }

    return created
  },

  async removeCenterFromLineSequence(dependencyId: string): Promise<void> {
    await pb.collection('line_sequencing_dependencies').delete(dependencyId)

    const currentUser = pb.authStore.record || pb.authStore.model
    if (currentUser?.id) {
      try {
        await pb.collection('pcp_audit_logs').create({
          user_id: currentUser.id,
          user_email: (currentUser as any)?.email || '',
          user_name: (currentUser as any)?.name || 'Usuário PCP',
          user_role: (currentUser as any)?.role || 'PCP_ADMIN',
          event_type: 'RULE_ACTION',
          action: 'REMOVE_CENTER_FROM_LINE_SEQUENCE',
          resource: 'line_sequencing_dependencies',
          resource_id: dependencyId,
          permission_required: 'pcp.masterdata.edit',
          scope: dependencyId,
          outcome: 'SUCCESS',
        })
      } catch (err) {
        console.warn('Erro ao registrar auditoria de remoção de vínculo (ignorado):', err)
      }
    }
  },

  async getNetworkRelationshipsForLine(lineCode: string) {
    try {
      const records = await pb.collection('production_line_relationships').getFullList({
        filter: `origin_line_code = '${lineCode}' || target_line_code = '${lineCode}'`,
        sort: 'priority_order',
      })
      return records
    } catch {
      return []
    }
  },

  // ==========================================
  // 6. PRODUTIVIDADE (CRUD)
  // ==========================================
  /**
   * Validador puro em memória para bloqueio de sobreposição de vigência de Produtividade.
   * Utiliza a mesma lógica de intervalos fechados de checkAdjustmentRuleOverlap.
   */
  checkProductivityOverlap(
    newRule: {
      id?: string
      valid_from?: string
      valid_until?: string | null
    },
    existingRules: Array<{
      id?: string
      valid_from?: string
      valid_until?: string | null
      active?: boolean
    }>,
  ): boolean {
    const newFrom = newRule.valid_from ? String(newRule.valid_from).slice(0, 10) : '1970-01-01'
    const newUntil = newRule.valid_until ? String(newRule.valid_until).slice(0, 10) : '9999-12-31'

    return existingRules.some((item) => {
      if (item.active === false) return false
      if (newRule.id && item.id === newRule.id) return false

      const itemFrom = item.valid_from ? String(item.valid_from).slice(0, 10) : '1970-01-01'
      const itemUntil = item.valid_until ? String(item.valid_until).slice(0, 10) : '9999-12-31'

      // Sobreposição de intervalos fechados [start, end]: startA <= endB && endA >= startB
      return newFrom <= itemUntil && newUntil >= itemFrom
    })
  },

  async checkProductivityDuplicate(params: {
    lineId: string
    materialProductCode: string
    productFamilyId?: string
    rawMaterialType?: string
    enfornamentoType?: string
    validFrom?: string
    validUntil?: string | null
    valid_from?: string
    valid_until?: string | null
    excludeId?: string
  }): Promise<boolean> {
    const {
      lineId,
      materialProductCode,
      productFamilyId,
      rawMaterialType,
      enfornamentoType,
      validFrom,
      validUntil,
      valid_from,
      valid_until,
      excludeId,
    } = params

    const effValidFrom = validFrom || valid_from
    const effValidUntil = validUntil !== undefined ? validUntil : valid_until

    try {
      const records = await pb
        .collection('line_productivity_rates')
        .getFullList<LineProductivityRate>({
          filter: `line_id = '${lineId}' && active = true`,
        })

      const cleanCode = (materialProductCode || '').trim().toUpperCase()
      const cleanFam = (productFamilyId || '').trim()
      const cleanMp = (rawMaterialType || '').trim().toUpperCase()
      const cleanEnf = (enfornamentoType || '').trim().toUpperCase()

      // Filtra registros com a mesma chave composta: production_line_id + material_id/code + raw_material_type + furnace_type
      const matchingKeyRecords = records.filter((r) => {
        if (excludeId && r.id === excludeId) return false
        const rCode = (r.material_product_code || '').trim().toUpperCase()
        const rFam = (r.product_family_id || '').trim()
        const rMp = (r.raw_material_type || '').trim().toUpperCase()
        const rEnf = (r.enfornamento_type || '').trim().toUpperCase()

        const sameProduct = rCode === cleanCode || (cleanFam && rFam === cleanFam)
        const sameMp = rMp === cleanMp
        const sameEnf = rEnf === cleanEnf
        return sameProduct && sameMp && sameEnf
      })

      if (matchingKeyRecords.length === 0) {
        return false
      }

      // Aplica a validação de sobreposição de intervalos de vigência
      return this.checkProductivityOverlap(
        {
          id: excludeId,
          valid_from: effValidFrom,
          valid_until: effValidUntil,
        },
        matchingKeyRecords,
      )
    } catch (err) {
      console.warn('Erro ao verificar duplicidade de produtividade:', err)
      return false
    }
  },

  async saveProductivity(data: Partial<LineProductivityRate>): Promise<LineProductivityRate> {
    invalidateCompletenessCache(data.line_id)
    const isActive = data.active !== undefined ? Boolean(data.active) : true
    const payload: Partial<LineProductivityRate> = {
      ...data,
      active: isActive,
      source_mode: data.source_mode || 'MANUAL', // Gravado sempre como MANUAL transparentemente
    }
    if (data.id) {
      return await pb
        .collection('line_productivity_rates')
        .update<LineProductivityRate>(data.id, payload)
    }
    return await pb.collection('line_productivity_rates').create<LineProductivityRate>(payload)
  },

  async deleteProductivity(id: string): Promise<boolean> {
    return await pb.collection('line_productivity_rates').delete(id)
  },

  // ==========================================
  // 7. PRIORIDADES DE MATÉRIA-PRIMA (CRUD)
  // ==========================================
  async saveRawMaterialPriority(
    data: Partial<LineRawMaterialPriority>,
  ): Promise<LineRawMaterialPriority> {
    invalidateCompletenessCache(data.line_id)
    if (data.id) {
      return await pb
        .collection('line_raw_material_priorities')
        .update<LineRawMaterialPriority>(data.id, data)
    }
    return await pb.collection('line_raw_material_priorities').create<LineRawMaterialPriority>(data)
  },

  async deleteRawMaterialPriority(id: string): Promise<boolean> {
    return await pb.collection('line_raw_material_priorities').delete(id)
  },

  // ==========================================
  // 8. PRODUTOS BLOQUEADOS (CRUD)
  // ==========================================
  /**
   * Validador de sobreposição de vigência para bloqueio de produto.
   * Regra C: bloquear criação/edição se existir bloqueio com mesma linha + product_code + block_type + ativo
   * com intervalos sobrepostos (startA <= endB && endA >= startB; valid_until null = vigente sem término).
   */
  checkBlockedProductOverlap(
    newRule: {
      id?: string
      valid_from?: string | null
      valid_until?: string | null
    },
    existingRules: Array<{
      id?: string
      valid_from?: string | null
      valid_until?: string | null
      active?: boolean
    }>,
  ): boolean {
    const newFrom = newRule.valid_from ? String(newRule.valid_from).slice(0, 10) : '1970-01-01'
    const newUntil = newRule.valid_until ? String(newRule.valid_until).slice(0, 10) : '9999-12-31'

    return existingRules.some((item) => {
      if (item.active === false) return false
      if (newRule.id && item.id === newRule.id) return false

      const itemFrom = item.valid_from ? String(item.valid_from).slice(0, 10) : '1970-01-01'
      const itemUntil = item.valid_until ? String(item.valid_until).slice(0, 10) : '9999-12-31'

      // startA <= endB && endA >= startB
      return newFrom <= itemUntil && newUntil >= itemFrom
    })
  },

  async saveBlockedProduct(data: Partial<LineBlockedProduct>): Promise<LineBlockedProduct> {
    if (data.line_id) {
      invalidateCompletenessCache(data.line_id)
    }

    const cleanCode = (data.product_code || '').trim().toUpperCase()
    const blockType = data.block_type || 'MANUAL'
    const isActive = data.active !== false

    const validFromStr = data.valid_from
      ? String(data.valid_from).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    const validUntilStr = data.valid_until ? String(data.valid_until).slice(0, 10) : ''

    // Idempotência / checagem de sobreposição pré-create e pré-update quando ativo
    if (data.line_id && cleanCode && isActive) {
      try {
        const existing = await pb
          .collection('line_blocked_products')
          .getFullList<LineBlockedProduct>({
            filter: `line_id = '${data.line_id}' && active = true && product_code = '${cleanCode}' && block_type = '${blockType}'`,
          })

        const hasOverlap = this.checkBlockedProductOverlap(
          {
            id: data.id,
            valid_from: validFromStr,
            valid_until: validUntilStr,
          },
          existing,
        )

        if (hasOverlap) {
          throw new Error('Já existe um bloqueio ativo para este material no período informado.')
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('Já existe um bloqueio ativo')) {
          throw checkErr
        }
        console.warn('Erro ao verificar sobreposição de bloqueio:', checkErr)
      }
    }

    const payload: Partial<LineBlockedProduct> = {
      ...data,
      product_code: cleanCode,
      active: isActive,
      valid_from: validFromStr,
      valid_until: validUntilStr || undefined,
    }

    let previousRecord: LineBlockedProduct | null = null
    if (data.id) {
      try {
        previousRecord = await pb
          .collection('line_blocked_products')
          .getOne<LineBlockedProduct>(data.id)
      } catch {
        previousRecord = null
      }
    }

    let saved: LineBlockedProduct
    if (data.id) {
      saved = await pb
        .collection('line_blocked_products')
        .update<LineBlockedProduct>(data.id, payload)
    } else {
      saved = await pb.collection('line_blocked_products').create<LineBlockedProduct>(payload)
    }

    // Auditoria oficial
    const currentUser = pb.authStore.record
    const auditAction = data.id ? 'UPDATE_BLOCKED_PRODUCT' : 'CREATE_BLOCKED_PRODUCT'
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: auditAction,
        resource: 'line_blocked_products',
        resource_id: saved.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: saved.line_id,
          product_code: saved.product_code,
          product_description: saved.product_description,
          block_type: saved.block_type,
          block_reason: saved.block_reason,
          valid_from: saved.valid_from,
          valid_until: saved.valid_until || null,
          active: saved.active,
          previous_value: previousRecord
            ? {
                valid_from: previousRecord.valid_from,
                valid_until: previousRecord.valid_until,
                active: previousRecord.active,
                block_reason: previousRecord.block_reason,
              }
            : null,
          new_value: {
            valid_from: saved.valid_from,
            valid_until: saved.valid_until,
            active: saved.active,
            block_reason: saved.block_reason,
          },
          action: auditAction,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria em pcp_audit_logs:', auditErr)
    }

    return saved
  },

  async setProductivityActive(id: string, active: boolean): Promise<LineProductivityRate> {
    const previousRecord = await pb
      .collection('line_productivity_rates')
      .getOne<LineProductivityRate>(id)
    if (previousRecord?.line_id) {
      invalidateCompletenessCache(previousRecord.line_id)
    }

    const updated = await pb
      .collection('line_productivity_rates')
      .update<LineProductivityRate>(id, { active })

    if (updated.line_id) {
      invalidateCompletenessCache(updated.line_id)
    }

    return updated
  },

  async setBlockedProductActive(
    id: string,
    active: boolean,
    validUntil?: string,
  ): Promise<LineBlockedProduct> {
    let previousRecord: LineBlockedProduct | null = null
    try {
      previousRecord = await pb.collection('line_blocked_products').getOne<LineBlockedProduct>(id)
      if (previousRecord?.line_id) {
        invalidateCompletenessCache(previousRecord.line_id)
      }
    } catch {
      previousRecord = null
    }

    if (active && previousRecord) {
      const lineId = previousRecord.line_id
      const prodCode = previousRecord.product_code
      const blockType = previousRecord.block_type
      const validFromStr = previousRecord.valid_from
        ? String(previousRecord.valid_from).slice(0, 10)
        : '1970-01-01'
      const validUntilStr =
        validUntil !== undefined
          ? validUntil
            ? String(validUntil).slice(0, 10)
            : ''
          : previousRecord.valid_until
            ? String(previousRecord.valid_until).slice(0, 10)
            : ''

      const existing = await pb
        .collection('line_blocked_products')
        .getFullList<LineBlockedProduct>({
          filter: `line_id = '${lineId}' && active = true && product_code = '${prodCode}' && block_type = '${blockType}'`,
        })

      const hasOverlap = this.checkBlockedProductOverlap(
        {
          id,
          valid_from: validFromStr,
          valid_until: validUntilStr,
        },
        existing,
      )

      if (hasOverlap) {
        throw new Error('Já existe um bloqueio ativo para este material no período informado.')
      }
    }

    const payload: Partial<LineBlockedProduct> = { active }
    if (validUntil !== undefined) {
      payload.valid_until = validUntil || null
    }
    const updated = await pb
      .collection('line_blocked_products')
      .update<LineBlockedProduct>(id, payload)

    if (updated.line_id) {
      invalidateCompletenessCache(updated.line_id)
    }

    const currentUser = pb.authStore.record
    const auditAction = active ? 'ACTIVATE_BLOCKED_PRODUCT' : 'DEACTIVATE_BLOCKED_PRODUCT'
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: auditAction,
        resource: 'line_blocked_products',
        resource_id: updated.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: updated.line_id,
          product_code: updated.product_code,
          product_description: updated.product_description,
          valid_from: updated.valid_from,
          valid_until: updated.valid_until || null,
          active: updated.active,
          action: auditAction,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria em pcp_audit_logs:', auditErr)
    }

    return updated
  },

  async deleteBlockedProduct(id: string): Promise<boolean> {
    return await pb.collection('line_blocked_products').delete(id)
  },

  // ==========================================
  // 9. MATRIZ DE SETUP (CRUD)
  // ==========================================
  async listSetupMatrix(lineId: string): Promise<LineSetupMatrix[]> {
    try {
      return await pb.collection('line_setup_matrix').getFullList<LineSetupMatrix>({
        filter: `line_id = '${lineId}'`,
        sort: '-valid_from,-created',
        expand: 'from_family_id,to_family_id,sap_integration_id',
      })
    } catch (err) {
      console.error('Erro ao listar matriz de setup:', err)
      return []
    }
  },

  async saveSetupMatrix(data: Partial<LineSetupMatrix>): Promise<LineSetupMatrix> {
    invalidateCompletenessCache(data.line_id)
    // 1. Validação de obrigatoriedade e duração
    if (data.from_product_code && data.to_product_code) {
      if (
        data.from_product_code.trim().toUpperCase() === data.to_product_code.trim().toUpperCase()
      ) {
        throw new Error('Material de origem e material de destino devem ser diferentes.')
      }
    }

    if (
      data.setup_duration_minutes === undefined ||
      data.setup_duration_minutes === null ||
      data.setup_duration_minutes <= 0
    ) {
      throw new Error('A duração padrão deve ser maior que 0 minutos.')
    }

    // 2. Validação de sobreposição de vigência para o mesmo par DE -> PARA
    if (data.line_id && data.from_product_code && data.to_product_code) {
      const fromCode = data.from_product_code.trim().toUpperCase()
      const toCode = data.to_product_code.trim().toUpperCase()
      const validFromStr = data.valid_from
        ? new Date(data.valid_from).toISOString().slice(0, 10)
        : ''
      const validUntilStr = data.valid_until
        ? new Date(data.valid_until).toISOString().slice(0, 10)
        : ''

      try {
        const existing = await pb.collection('line_setup_matrix').getFullList<LineSetupMatrix>({
          filter: `line_id = '${data.line_id}' && active = true && from_product_code = '${fromCode}' && to_product_code = '${toCode}'`,
        })

        const hasOverlap = existing.some((item) => {
          if (data.id && item.id === data.id) return false

          const itemFrom = item.valid_from ? item.valid_from.slice(0, 10) : '1970-01-01'
          const itemUntil = item.valid_until ? item.valid_until.slice(0, 10) : '9999-12-31'
          const newFrom = validFromStr || '1970-01-01'
          const newUntil = validUntilStr || '9999-12-31'

          // Verifica se dois intervalos se sobrepõem: startA <= endB && endA >= startB
          return newFrom <= itemUntil && newUntil >= itemFrom
        })

        if (hasOverlap) {
          throw new Error(
            'Já existe uma regra de setup vigente para esta combinação no período informado.',
          )
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('Já existe uma regra de setup vigente')) {
          throw checkErr
        }
        console.warn('Não foi possível verificar duplicidade de setup:', checkErr)
      }
    }

    let previousRecord: LineSetupMatrix | null = null
    if (data.id) {
      try {
        previousRecord = await pb.collection('line_setup_matrix').getOne<LineSetupMatrix>(data.id)
      } catch {
        previousRecord = null
      }
    }

    let savedRecord: LineSetupMatrix
    if (data.id) {
      savedRecord = await pb.collection('line_setup_matrix').update<LineSetupMatrix>(data.id, data)
    } else {
      savedRecord = await pb.collection('line_setup_matrix').create<LineSetupMatrix>(data)
    }

    // Auditoria oficial em pcp_audit_logs para Setup
    const currentUser = pb.authStore.record
    const auditAction = data.id ? 'UPDATE_SETUP_MATRIX' : 'CREATE_SETUP_MATRIX'
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: auditAction,
        resource: 'line_setup_matrix',
        resource_id: savedRecord.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: savedRecord.line_id,
          setup_code: savedRecord.setup_code,
          setup_description: savedRecord.setup_description || '',
          from_product_code: savedRecord.from_product_code,
          to_product_code: savedRecord.to_product_code,
          setup_duration_minutes: savedRecord.setup_duration_minutes,
          active: savedRecord.active,
          valid_from: savedRecord.valid_from,
          valid_until: savedRecord.valid_until,
          previous_value: previousRecord
            ? {
                setup_code: previousRecord.setup_code,
                setup_duration_minutes: previousRecord.setup_duration_minutes,
                active: previousRecord.active,
                from_product_code: previousRecord.from_product_code,
                to_product_code: previousRecord.to_product_code,
              }
            : null,
          new_value: {
            setup_code: savedRecord.setup_code,
            setup_duration_minutes: savedRecord.setup_duration_minutes,
            active: savedRecord.active,
            from_product_code: savedRecord.from_product_code,
            to_product_code: savedRecord.to_product_code,
          },
          action: auditAction,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria de setup em pcp_audit_logs:', auditErr)
    }

    return savedRecord
  },

  async setSetupMatrixActive(
    id: string,
    active: boolean,
    validUntil?: string,
  ): Promise<LineSetupMatrix> {
    let previousRecord: LineSetupMatrix | null = null
    try {
      previousRecord = await pb.collection('line_setup_matrix').getOne<LineSetupMatrix>(id)
      if (previousRecord?.line_id) {
        invalidateCompletenessCache(previousRecord.line_id)
      }
    } catch {
      previousRecord = null
    }

    const payload: Partial<LineSetupMatrix> = { active }
    if (validUntil !== undefined) {
      payload.valid_until = validUntil
    }
    const updated = await pb.collection('line_setup_matrix').update<LineSetupMatrix>(id, payload)

    if (updated.line_id) {
      invalidateCompletenessCache(updated.line_id)
    }

    // Auditoria oficial de ativação/inativação de Setup
    const currentUser = pb.authStore.record
    const auditAction = active ? 'ACTIVATE_SETUP_MATRIX' : 'DEACTIVATE_SETUP_MATRIX'
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: auditAction,
        resource: 'line_setup_matrix',
        resource_id: updated.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: updated.line_id,
          setup_code: updated.setup_code,
          setup_description: updated.setup_description,
          active: updated.active,
          previous_value: previousRecord ? { active: previousRecord.active } : null,
          new_value: { active: updated.active },
          action: auditAction,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria de ativação de setup em pcp_audit_logs:', auditErr)
    }

    return updated
  },

  async deleteSetupMatrix(id: string): Promise<boolean> {
    return await pb.collection('line_setup_matrix').delete(id)
  },

  // ==========================================
  // 9.1. MATRIZ DE ACERTO (adjustment_time_rules) (CRUD)
  // ==========================================
  async listAdjustmentRules(lineId: string): Promise<LineAdjustmentTimeRule[]> {
    try {
      return await pb.collection('adjustment_time_rules').getFullList<LineAdjustmentTimeRule>({
        filter: `line_id = '${lineId}'`,
        sort: '-valid_from,-created',
        expand: 'line_id',
      })
    } catch (err) {
      console.error('Erro ao listar regras de tempo de acerto:', err)
      return []
    }
  },

  /**
   * Validador puro em memória para bloqueio de sobreposição de vigência de Acertos.
   * Utilizado internamente no saveAdjustmentRule/setAdjustmentRuleActive e exposto para testes unitários/QA.
   */
  checkAdjustmentRuleOverlap(
    newRule: {
      id?: string
      valid_from?: string
      valid_until?: string | null
    },
    existingRules: Array<{
      id?: string
      valid_from?: string
      valid_until?: string | null
      active?: boolean
    }>,
  ): boolean {
    const newFrom = newRule.valid_from ? String(newRule.valid_from).slice(0, 10) : '1970-01-01'
    const newUntil = newRule.valid_until ? String(newRule.valid_until).slice(0, 10) : '9999-12-31'

    return existingRules.some((item) => {
      if (item.active === false) return false
      if (newRule.id && item.id === newRule.id) return false

      const itemFrom = item.valid_from ? String(item.valid_from).slice(0, 10) : '1970-01-01'
      const itemUntil = item.valid_until ? String(item.valid_until).slice(0, 10) : '9999-12-31'

      // Sobreposição de intervalos fechados [start, end]: startA <= endB && endA >= startB
      return newFrom <= itemUntil && newUntil >= itemFrom
    })
  },

  async saveAdjustmentRule(data: Partial<LineAdjustmentTimeRule>): Promise<LineAdjustmentTimeRule> {
    if (data.line_id) {
      invalidateCompletenessCache(data.line_id)
    }
    // 1. Validação de duração
    if (
      data.duration_minutes === undefined ||
      data.duration_minutes === null ||
      data.duration_minutes <= 0
    ) {
      throw new Error('O tempo de acerto deve ser maior que 0 minutos.')
    }

    if (!data.material_code || !data.material_code.trim()) {
      throw new Error('O código do material SAP é obrigatório.')
    }

    if (!data.sample_type) {
      throw new Error('O tipo de amostra é obrigatório.')
    }

    // 2. Validação de duplicidade ativa e sobreposição de vigência: (Linha + Material + Tipo de Amostra + período sobreposto)
    const lineId = data.line_id
    const matCode = data.material_code.trim().toUpperCase()
    const sampleType = data.sample_type
    const isActive = data.active !== false

    const validFromStr = data.valid_from
      ? String(data.valid_from).slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    const validUntilStr = data.valid_until ? String(data.valid_until).slice(0, 10) : ''

    if (lineId && isActive) {
      try {
        const existing = await pb
          .collection('adjustment_time_rules')
          .getFullList<LineAdjustmentTimeRule>({
            filter: `line_id = '${lineId}' && active = true && material_code = '${matCode}' && sample_type = '${sampleType}'`,
          })

        const hasOverlap = this.checkAdjustmentRuleOverlap(
          {
            id: data.id,
            valid_from: validFromStr,
            valid_until: validUntilStr,
          },
          existing,
        )

        if (hasOverlap) {
          throw new Error(
            'Já existe uma regra de Acerto ativa para esta bitola e tipo de amostra no período informado.',
          )
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('Já existe uma regra de Acerto ativa')) {
          throw checkErr
        }
        console.warn('Erro ao verificar duplicidade de acerto:', checkErr)
      }
    }

    const payload: Partial<LineAdjustmentTimeRule> = {
      ...data,
      material_code: matCode,
      active: data.active !== undefined ? data.active : true,
      valid_from: validFromStr,
      valid_until: validUntilStr || undefined,
    }

    let previousRecord: LineAdjustmentTimeRule | null = null
    if (data.id) {
      try {
        previousRecord = await pb
          .collection('adjustment_time_rules')
          .getOne<LineAdjustmentTimeRule>(data.id)
      } catch {
        previousRecord = null
      }
    }

    let savedRecord: LineAdjustmentTimeRule
    if (data.id) {
      savedRecord = await pb
        .collection('adjustment_time_rules')
        .update<LineAdjustmentTimeRule>(data.id, payload)
    } else {
      savedRecord = await pb
        .collection('adjustment_time_rules')
        .create<LineAdjustmentTimeRule>(payload)
    }

    // Auditoria oficial em pcp_audit_logs
    const currentUser = pb.authStore.record
    const auditAction = data.id ? 'UPDATE_ADJUSTMENT_RULE' : 'CREATE_ADJUSTMENT_RULE'
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: auditAction,
        resource: 'adjustment_time_rules',
        resource_id: savedRecord.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: lineId || savedRecord.line_id,
          material_code: savedRecord.material_code,
          material_description: savedRecord.material_description || '',
          sample_type: savedRecord.sample_type,
          duration_minutes: savedRecord.duration_minutes,
          valid_from: savedRecord.valid_from,
          valid_until: savedRecord.valid_until || null,
          active: savedRecord.active,
          previous_value: previousRecord
            ? {
                duration_minutes: previousRecord.duration_minutes,
                valid_from: previousRecord.valid_from,
                valid_until: previousRecord.valid_until,
                active: previousRecord.active,
              }
            : null,
          new_value: {
            duration_minutes: savedRecord.duration_minutes,
            valid_from: savedRecord.valid_from,
            valid_until: savedRecord.valid_until,
            active: savedRecord.active,
          },
          action: auditAction,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria em pcp_audit_logs:', auditErr)
    }

    return savedRecord
  },

  async setAdjustmentRuleActive(
    id: string,
    active: boolean,
    validUntil?: string,
  ): Promise<LineAdjustmentTimeRule> {
    let previousRecord: LineAdjustmentTimeRule | null = null
    try {
      previousRecord = await pb
        .collection('adjustment_time_rules')
        .getOne<LineAdjustmentTimeRule>(id)
      if (previousRecord?.line_id) {
        invalidateCompletenessCache(previousRecord.line_id)
      }
    } catch {
      previousRecord = null
    }

    // Se estiver reativando, verificar se não gerará conflito de período sobreposto com outra regra ativa
    if (active && previousRecord) {
      const lineId = previousRecord.line_id
      const matCode = previousRecord.material_code
      const sampleType = previousRecord.sample_type
      const validFromStr = previousRecord.valid_from
        ? String(previousRecord.valid_from).slice(0, 10)
        : '1970-01-01'
      const validUntilStr =
        validUntil !== undefined
          ? validUntil
            ? String(validUntil).slice(0, 10)
            : ''
          : previousRecord.valid_until
            ? String(previousRecord.valid_until).slice(0, 10)
            : ''

      const existing = await pb
        .collection('adjustment_time_rules')
        .getFullList<LineAdjustmentTimeRule>({
          filter: `line_id = '${lineId}' && active = true && material_code = '${matCode}' && sample_type = '${sampleType}'`,
        })

      const hasOverlap = this.checkAdjustmentRuleOverlap(
        {
          id,
          valid_from: validFromStr,
          valid_until: validUntilStr,
        },
        existing,
      )

      if (hasOverlap) {
        throw new Error(
          'Já existe uma regra de Acerto ativa para esta bitola e tipo de amostra no período informado.',
        )
      }
    }

    const payload: Partial<LineAdjustmentTimeRule> = { active }
    if (validUntil !== undefined) {
      payload.valid_until = validUntil || null
    }
    const updated = await pb
      .collection('adjustment_time_rules')
      .update<LineAdjustmentTimeRule>(id, payload)

    if (updated.line_id) {
      invalidateCompletenessCache(updated.line_id)
    }

    // Auditoria oficial em pcp_audit_logs
    const currentUser = pb.authStore.record
    const auditAction = active ? 'ACTIVATE_ADJUSTMENT_RULE' : 'DEACTIVATE_ADJUSTMENT_RULE'
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: currentUser?.id || null,
        user_email: currentUser?.email || '',
        user_name: currentUser?.name || currentUser?.email || 'Usuário PCP',
        user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: auditAction,
        resource: 'adjustment_time_rules',
        resource_id: updated.id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: updated.line_id,
          material_code: updated.material_code,
          material_description: updated.material_description || '',
          sample_type: updated.sample_type,
          duration_minutes: updated.duration_minutes,
          valid_from: updated.valid_from,
          valid_until: updated.valid_until || null,
          active: updated.active,
          previous_value: previousRecord
            ? { active: previousRecord.active, valid_until: previousRecord.valid_until }
            : null,
          new_value: { active: updated.active, valid_until: updated.valid_until },
          action: auditAction,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria em pcp_audit_logs:', auditErr)
    }

    return updated
  },

  // ==========================================
  // 10. HIERARQUIA ORGANIZACIONAL (CRUD)
  // ==========================================
  async saveOrgHierarchy(data: Partial<LineOrgHierarchy>): Promise<LineOrgHierarchy> {
    if (data.id) {
      return await pb.collection('line_org_hierarchy').update<LineOrgHierarchy>(data.id, data)
    }
    return await pb.collection('line_org_hierarchy').create<LineOrgHierarchy>(data)
  },

  // ==========================================
  // 11. PARADAS PROGRAMADAS (Dentro de Capacidade)
  // ==========================================
  async listScheduledStopsByLine(lineId: string): Promise<StandardScheduledStop[]> {
    try {
      return await pb.collection('standard_scheduled_stops').getFullList<StandardScheduledStop>({
        filter: `line_id = '${lineId}'`,
        sort: '-created',
      })
    } catch (err) {
      console.error('Erro ao listar paradas programadas da linha:', err)
      return []
    }
  },

  async saveScheduledStop(data: Partial<StandardScheduledStop>): Promise<StandardScheduledStop> {
    invalidateCompletenessCache(data.line_id)

    // Higienização e mapeamento rigoroso conforme schema PocketBase:
    // valid categories: ['PREVENTIVE_MAINTENANCE', 'CLEANING', 'CALIBRATION', 'TOOL_CHANGE', 'INSPECTION', 'OPERATIONAL_BREAK', 'OTHER']
    const VALID_CATEGORIES = [
      'PREVENTIVE_MAINTENANCE',
      'CLEANING',
      'CALIBRATION',
      'TOOL_CHANGE',
      'INSPECTION',
      'OPERATIONAL_BREAK',
      'OTHER',
    ] as const

    const CATEGORY_MAP: Record<string, string> = {
      PREVENTIVE: 'PREVENTIVE_MAINTENANCE',
      TOOLING_CHANGE: 'TOOL_CHANGE',
      MEETING: 'OPERATIONAL_BREAK',
    }

    let category = data.category || 'PREVENTIVE_MAINTENANCE'
    if (CATEGORY_MAP[category]) {
      category = CATEGORY_MAP[category]
    }
    if (!VALID_CATEGORIES.includes(category as any)) {
      category = 'PREVENTIVE_MAINTENANCE'
    }

    // valid recurrences: ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'PER_SHIFT', 'PER_BATCH', 'CUSTOM']
    let recurrence = data.recurrence || 'DAILY'
    let recurrence_day_of_week = data.recurrence_day_of_week || ''

    if (recurrence === 'WEEKEND') {
      recurrence = 'WEEKLY'
      if (!recurrence_day_of_week) {
        recurrence_day_of_week = 'Sábado e domingo'
      }
    }

    // Higienização de horários e cálculo de duração:
    const isTimeApplicable = data.time_applicable === true
    let startTime: string | null = null
    let endTime: string | null = null
    let durationMinutes = Number(data.expected_duration_minutes) || 0

    if (
      isTimeApplicable &&
      data.start_time &&
      data.end_time &&
      data.start_time !== 'N/A' &&
      data.end_time !== 'N/A'
    ) {
      startTime = data.start_time.trim()
      endTime = data.end_time.trim()

      const [h1, m1] = startTime.split(':').map(Number)
      const [h2, m2] = endTime.split(':').map(Number)
      if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
        let diff = h2 * 60 + m2 - (h1 * 60 + m1)
        if (diff <= 0) diff += 24 * 60 // Atravessou meia-noite
        // Se divergir ou se não houver duração informada, prefere a duração calculada
        durationMinutes = diff
      }
    } else {
      // Quando não aplicável: persistir start_time: null, end_time: null (nunca string vazia ou 'N/A')
      startTime = null
      endTime = null
    }

    // Permitir apenas campos que pertencem à coleção standard_scheduled_stops
    const allowedFields = [
      'line_id',
      'line_master_id',
      'code',
      'description',
      'category',
      'recurrence',
      'expected_duration_minutes',
      'scheduled_time',
      'applicable_shift',
      'applicable_days',
      'expected_impact',
      'active',
      'valid_from',
      'valid_until',
      'relation_type',
      'gauge_material_code',
      'gauge_dimension',
      'start_time',
      'end_time',
      'time_applicable',
      'reason',
      'raw_material_type',
      'enfornamento_type',
      'recurrence_day_of_week',
    ]

    const rawPayload: Record<string, any> = {
      ...data,
      category,
      recurrence,
      recurrence_day_of_week: recurrence_day_of_week || null,
      start_time: startTime,
      end_time: endTime,
      time_applicable: isTimeApplicable,
      expected_duration_minutes: durationMinutes,
      scheduled_time: startTime || 'N/A',
      active: data.active !== false,
    }

    const payload: Record<string, any> = {}
    for (const key of allowedFields) {
      if (rawPayload[key] !== undefined) {
        payload[key] = rawPayload[key]
      }
    }

    // Limpeza de campos de relação caso vazios
    if (!payload.line_master_id) {
      delete payload.line_master_id
    }

    if (data.id) {
      return await pb
        .collection('standard_scheduled_stops')
        .update<StandardScheduledStop>(data.id, payload)
    }
    return await pb.collection('standard_scheduled_stops').create<StandardScheduledStop>(payload)
  },

  async toggleScheduledStopStatus(id: string, active: boolean): Promise<StandardScheduledStop> {
    return await pb
      .collection('standard_scheduled_stops')
      .update<StandardScheduledStop>(id, { active })
  },

  async deleteScheduledStop(id: string): Promise<boolean> {
    return await pb.collection('standard_scheduled_stops').delete(id)
  },

  // ==========================================
  // 12. FAMÍLIAS DE PRODUTOS & CAPABILITIES
  // ==========================================
  async listProductFamilies(): Promise<ProductFamily[]> {
    try {
      return await pb.collection('product_families').getFullList<ProductFamily>({
        sort: 'code',
      })
    } catch {
      return []
    }
  },

  async saveCapability(data: Partial<LineCapability>): Promise<LineCapability> {
    if (data.id) {
      return await pb.collection('line_capabilities').update<LineCapability>(data.id, data)
    }
    return await pb.collection('line_capabilities').create<LineCapability>(data)
  },

  async deleteCapability(id: string): Promise<boolean> {
    return await pb.collection('line_capabilities').delete(id)
  },

  // ==========================================
  // 13. TURNOS & JORNADA
  // ==========================================
  async listShiftsByLine(lineId: string): Promise<ProductionShift[]> {
    try {
      return await pb.collection('production_shifts').getFullList<ProductionShift>({
        filter: `line_id = '${lineId}'`,
        sort: 'sequence_order,start_time',
      })
    } catch {
      return []
    }
  },

  async saveShift(data: Partial<ProductionShift>): Promise<ProductionShift> {
    if (data.id) {
      return await pb.collection('production_shifts').update<ProductionShift>(data.id, data)
    }
    return await pb.collection('production_shifts').create<ProductionShift>(data)
  },

  async toggleShiftStatus(shiftId: string, active: boolean): Promise<ProductionShift> {
    return await pb.collection('production_shifts').update<ProductionShift>(shiftId, { active })
  },

  async deleteShift(id: string): Promise<boolean> {
    return await pb.collection('production_shifts').delete(id)
  },

  // ==========================================
  // 13.1. TURMAS POR LINHA (CRUD)
  // ==========================================
  async listCrewsByLine(lineId: string): Promise<ProductionCrew[]> {
    try {
      return await pb.collection('production_crews').getFullList<ProductionCrew>({
        filter: `line_id = '${lineId}'`,
        sort: 'code',
      })
    } catch {
      return []
    }
  },

  async saveCrew(data: Partial<ProductionCrew>): Promise<ProductionCrew> {
    if (data.id) {
      return await pb.collection('production_crews').update<ProductionCrew>(data.id, data)
    }
    return await pb.collection('production_crews').create<ProductionCrew>(data)
  },

  async toggleCrewStatus(crewId: string, active: boolean): Promise<ProductionCrew> {
    return await pb.collection('production_crews').update<ProductionCrew>(crewId, { active })
  },

  async deleteCrew(id: string): Promise<boolean> {
    return await pb.collection('production_crews').delete(id)
  },

  // ==========================================
  // 13.2. ASSOCIAÇÃO TURNO × TURMA POR LINHA (CRUD)
  // ==========================================
  async listShiftCrewsByLine(lineId: string): Promise<ProductionShiftCrew[]> {
    try {
      return await pb.collection('production_shift_crews').getFullList<ProductionShiftCrew>({
        filter: `line_id = '${lineId}'`,
        expand: 'shift_id,crew_id',
      })
    } catch {
      return []
    }
  },

  async saveShiftCrew(data: Partial<ProductionShiftCrew>): Promise<ProductionShiftCrew> {
    if (data.id) {
      return await pb
        .collection('production_shift_crews')
        .update<ProductionShiftCrew>(data.id, data)
    }
    return await pb.collection('production_shift_crews').create<ProductionShiftCrew>(data)
  },

  async deleteShiftCrew(id: string): Promise<boolean> {
    return await pb.collection('production_shift_crews').delete(id)
  },

  // ==========================================
  // 14. FICHA MESTRE (Criação de versão / Atualização - UPSERT)
  // ==========================================
  async saveLineMaster(data: Partial<LineMaster>): Promise<LineMaster> {
    if (data.line_id) {
      invalidateCompletenessCache(data.line_id)
    }

    // Sanitização de números
    const sanitizeNumber = (val: unknown): number | null => {
      if (val === '' || val === null || val === undefined) return null
      const n = Number(val)
      return isNaN(n) ? null : n
    }

    // Sanitiza e garante campos obrigatórios e válidos da Ficha Mestre
    const sanitizedData: Record<string, unknown> = {
      ...data,
      change_reason: (
        data.change_reason || 'Atualização de parâmetros cadastrais via HUB CIAFAL'
      ).trim(),
    }

    // Sanitização de campos relacionais: nunca enviar string vazia para relacionamentos do PocketBase
    const relationalKeys = [
      'line_id',
      'primary_responsible_id',
      'substitute_responsible_id',
      'upstream_line_id',
      'downstream_line_id',
      'author_id',
    ]
    for (const rKey of relationalKeys) {
      if (rKey in sanitizedData) {
        const val = sanitizedData[rKey]
        if (val === '' || val === null) {
          sanitizedData[rKey] = null
        }
      }
    }

    // Validação de tipos numéricos
    if ('nominal_hourly_capacity' in sanitizedData) {
      const parsed = sanitizeNumber(sanitizedData.nominal_hourly_capacity)
      if (parsed !== null) sanitizedData.nominal_hourly_capacity = parsed
      else delete sanitizedData.nominal_hourly_capacity
    }
    if ('planned_efficiency_pct' in sanitizedData) {
      const parsed = sanitizeNumber(sanitizedData.planned_efficiency_pct)
      if (parsed !== null) sanitizedData.planned_efficiency_pct = parsed
      else delete sanitizedData.planned_efficiency_pct
    }
    if ('nominal_shift_capacity' in sanitizedData) {
      const parsed = sanitizeNumber(sanitizedData.nominal_shift_capacity)
      if (parsed !== null) sanitizedData.nominal_shift_capacity = parsed
      else delete sanitizedData.nominal_shift_capacity
    }
    if ('nominal_daily_capacity' in sanitizedData) {
      const parsed = sanitizeNumber(sanitizedData.nominal_daily_capacity)
      if (parsed !== null) sanitizedData.nominal_daily_capacity = parsed
      else delete sanitizedData.nominal_daily_capacity
    }
    if ('nominal_monthly_capacity' in sanitizedData) {
      const parsed = sanitizeNumber(sanitizedData.nominal_monthly_capacity)
      if (parsed !== null) sanitizedData.nominal_monthly_capacity = parsed
      else delete sanitizedData.nominal_monthly_capacity
    }

    // Limpar campos undefined
    Object.keys(sanitizedData).forEach((k) => {
      if (sanitizedData[k] === undefined) delete sanitizedData[k]
    })

    if (data.id) {
      return await pb.collection('line_masters').update<LineMaster>(data.id, sanitizedData)
    }

    // Upsert: se não passou id, busca se já existe Ficha Mestre para line_id (priorizando ACTIVE)
    if (data.line_id) {
      try {
        const existingMasters = await pb.collection('line_masters').getFullList<LineMaster>({
          filter: `line_id = '${data.line_id}'`,
          sort: '-version',
        })
        const activeExisting =
          existingMasters.find((m) => m.status === 'ACTIVE') || existingMasters[0]
        if (activeExisting) {
          return await pb
            .collection('line_masters')
            .update<LineMaster>(activeExisting.id, sanitizedData)
        }
      } catch (findErr) {
        console.warn('Erro ao verificar existência de line_masters para upsert:', findErr)
      }
    }

    // Criar novo registro com status ACTIVE e versão inicial se ausente
    const payloadToCreate: Partial<LineMaster> = {
      status: 'ACTIVE',
      version: 1,
      unit: 't',
      capacity_unit: (data.capacity_unit as any) || 't/h',
      resource_type: 'PRODUCTION_LINE',
      ...sanitizedData,
      line_id: data.line_id!,
    }
    return await pb.collection('line_masters').create<LineMaster>(payloadToCreate)
  },

  // ==========================================
  // 15. AUDITORIA E VERSIONAMENTO DA LINHA
  // ==========================================
  async recordAuditVersion(data: {
    line_id: string
    line_master_id?: string
    version: number
    action: 'CREATE' | 'UPDATE' | 'ACTIVATE' | 'DEACTIVATE' | 'READY_CHECK' | 'SOURCE_CHANGE'
    changed_fields: string[]
    change_reason: string
    snapshot_data: Record<string, unknown>
  }): Promise<void> {
    const authId = pb.authStore.model?.id || pb.authStore.record?.id
    if (!authId) {
      // Se não há usuário autenticado, a regra da coleção rejeitará (@request.auth.id != '' && user_id = @request.auth.id)
      return
    }

    const user = pb.authStore.record || pb.authStore.model
    try {
      // Gravação na coleção oficial de auditoria pcp_audit_logs (best-effort)
      await pb.collection('pcp_audit_logs').create({
        user_id: authId,
        user_email: (user as any)?.email || '',
        user_name: (user as any)?.name || (user as any)?.email || 'Usuário PCP',
        user_role: (user as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: `LINE_${data.action}`,
        resource: 'production_lines',
        resource_id: data.line_id,
        permission_required: 'pcp.lines.manage',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          line_id: data.line_id,
          line_master_id: data.line_master_id || '',
          version: data.version,
          action: data.action,
          changed_fields: data.changed_fields,
          change_reason: data.change_reason || 'Alteração técnica homologada',
          snapshot_data: data.snapshot_data,
        },
      })
    } catch (auditErr) {
      // Auditoria é best-effort para não bloquear a persistência cadastral da linha
      console.warn('Falha na gravação de auditoria da linha (pcp_audit_logs):', auditErr)
    }
  },
}
