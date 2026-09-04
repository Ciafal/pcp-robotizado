import pb from '@/lib/pocketbase/client'
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
        filterStr = 'is_active = true || is_active = null'
      } else if (filterOptions?.includeInactive === false) {
        filterStr = 'is_active = true || is_active = null'
      }

      const [lines, allShifts, allCrews] = await Promise.all([
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
      ])

      return lines.map((l) => {
        const lineShifts = allShifts.filter((s) => s.line_id === l.id).map((s) => s.code)
        const lineCrews = allCrews.filter((c) => c.line_id === l.id).map((c) => c.code)
        return {
          ...l,
          shifts_summary: lineShifts,
          crews_summary: lineCrews,
        }
      })
    } catch (err) {
      console.error('Erro ao listar linhas:', err)
      return []
    }
  },

  async toggleLineActive(lineId: string, isActive: boolean): Promise<ProductionLine> {
    const updated = await pb.collection('production_lines').update<ProductionLine>(lineId, {
      is_active: isActive,
    })
    return updated
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

  async getLineById(lineId: string): Promise<ProductionLine> {
    return await pb.collection('production_lines').getOne<ProductionLine>(lineId)
  },

  async createLine(data: Partial<ProductionLine>): Promise<ProductionLine> {
    return await pb.collection('production_lines').create<ProductionLine>(data)
  },

  async updateLine(lineId: string, data: Partial<ProductionLine>): Promise<ProductionLine> {
    return await pb.collection('production_lines').update<ProductionLine>(lineId, data)
  },

  // ==========================================
  // 2. CONTEXTO COMPLETO DA LINHA (Visão 360)
  // ==========================================
  async getLineOverview(lineId: string): Promise<LineOverviewData> {
    const line = await this.getLineById(lineId)

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
          filter: `line_id = '${lineId}' && active = true`,
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

    if (productivity.length === 0) {
      alerts.push({
        id: 'alt_no_prod',
        level: 'WARNING',
        category: 'CAPACITY',
        title: 'Produtividade Não Cadastrada',
        description:
          'Sem taxas de cadência (t/h, peça/h), o cálculo de capacidade horária é apenas estimativo.',
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

    // Cálculo dinâmico de completude e ready_for_scheduling revisado (Regra 42 e 43)
    // Prontidão cadastral validada pelo campo booleano `is_active` da linha
    const isLineActive = line.is_active !== false

    let score = 0
    if (isLineActive) score += 15
    if (managers.length > 0) score += 15
    if (activeMaster && activeMaster.nominal_hourly_capacity > 0) score += 15
    if (shifts.length > 0) score += 15
    if (calendars.length > 0) score += 10
    if (capabilities.length > 0) score += 10
    if (productivity.length > 0) score += 10
    if (sequencing.length > 0) score += 10

    // Ready for scheduling: requer linha ativa (is_active), gestor, capacidade, turnos e ao menos capacidades/produtividade
    // NOTA (Regra 43): Aprovador NÃO bloqueia se a aprovação for opcional/não aplicável
    const readyForScheduling =
      isLineActive &&
      managers.length > 0 &&
      shifts.length > 0 &&
      (activeMaster ? activeMaster.nominal_hourly_capacity > 0 : true) &&
      capabilities.length > 0 &&
      score >= 70

    return {
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
      completeness: Math.min(100, score),
      readyForScheduling,
    }
  },

  // ==========================================
  // 3. GESTORES DA LINHA (CRUD)
  // ==========================================
  async saveManagerAssignment(
    data: Partial<LineManagerAssignment>,
  ): Promise<LineManagerAssignment> {
    if (data.id) {
      return await pb
        .collection('line_managers_assignment')
        .update<LineManagerAssignment>(data.id, data)
    }
    return await pb.collection('line_managers_assignment').create<LineManagerAssignment>(data)
  },

  async deleteManagerAssignment(id: string): Promise<boolean> {
    return await pb.collection('line_managers_assignment').delete(id)
  },

  // ==========================================
  // 4. APROVADORES DA LINHA (CRUD)
  // ==========================================
  async saveApprover(data: Partial<LineApproverMatrix>): Promise<LineApproverMatrix> {
    if (data.id) {
      return await pb.collection('line_approvers_matrix').update<LineApproverMatrix>(data.id, data)
    }
    return await pb.collection('line_approvers_matrix').create<LineApproverMatrix>(data)
  },

  async deleteApprover(id: string): Promise<boolean> {
    return await pb.collection('line_approvers_matrix').delete(id)
  },

  // ==========================================
  // 5. SEQUENCIAMENTO & DEPENDÊNCIAS (CRUD sincronizado com Mapa de Integração)
  // ==========================================
  async saveSequencing(data: Partial<LineSequencingDependency>): Promise<LineSequencingDependency> {
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
  async saveProductivity(data: Partial<LineProductivityRate>): Promise<LineProductivityRate> {
    if (data.id) {
      return await pb
        .collection('line_productivity_rates')
        .update<LineProductivityRate>(data.id, data)
    }
    return await pb.collection('line_productivity_rates').create<LineProductivityRate>(data)
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
  async saveBlockedProduct(data: Partial<LineBlockedProduct>): Promise<LineBlockedProduct> {
    if (data.id) {
      return await pb.collection('line_blocked_products').update<LineBlockedProduct>(data.id, data)
    }
    return await pb.collection('line_blocked_products').create<LineBlockedProduct>(data)
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

    if (data.id) {
      return await pb.collection('line_setup_matrix').update<LineSetupMatrix>(data.id, data)
    }
    return await pb.collection('line_setup_matrix').create<LineSetupMatrix>(data)
  },

  async setSetupMatrixActive(
    id: string,
    active: boolean,
    validUntil?: string,
  ): Promise<LineSetupMatrix> {
    const payload: Partial<LineSetupMatrix> = { active }
    if (validUntil !== undefined) {
      payload.valid_until = validUntil
    }
    return await pb.collection('line_setup_matrix').update<LineSetupMatrix>(id, payload)
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

  async saveAdjustmentRule(data: Partial<LineAdjustmentTimeRule>): Promise<LineAdjustmentTimeRule> {
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

    // 2. Validação de duplicidade ativa: (Linha + Material + Tipo de Amostra)
    const lineId = data.line_id
    const matCode = data.material_code.trim().toUpperCase()
    const sampleType = data.sample_type
    const isActive = data.active !== false

    if (lineId && isActive) {
      try {
        const existing = await pb
          .collection('adjustment_time_rules')
          .getFullList<LineAdjustmentTimeRule>({
            filter: `line_id = '${lineId}' && active = true && material_code = '${matCode}' && sample_type = '${sampleType}'`,
          })

        const duplicate = existing.find((item) => !data.id || item.id !== data.id)
        if (duplicate) {
          throw new Error('Já existe um tempo de acerto vigente para esta combinação.')
        }
      } catch (checkErr: any) {
        if (checkErr.message?.includes('Já existe um tempo de acerto')) {
          throw checkErr
        }
        console.warn('Erro ao verificar duplicidade de acerto:', checkErr)
      }
    }

    const payload: Partial<LineAdjustmentTimeRule> = {
      ...data,
      material_code: matCode,
      active: data.active !== undefined ? data.active : true,
      valid_from: data.valid_from || new Date().toISOString().slice(0, 10),
    }

    if (data.id) {
      return await pb
        .collection('adjustment_time_rules')
        .update<LineAdjustmentTimeRule>(data.id, payload)
    }
    return await pb.collection('adjustment_time_rules').create<LineAdjustmentTimeRule>(payload)
  },

  async setAdjustmentRuleActive(
    id: string,
    active: boolean,
    validUntil?: string,
  ): Promise<LineAdjustmentTimeRule> {
    const payload: Partial<LineAdjustmentTimeRule> = { active }
    if (validUntil !== undefined) {
      payload.valid_until = validUntil
    }
    return await pb.collection('adjustment_time_rules').update<LineAdjustmentTimeRule>(id, payload)
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
    const payload: Record<string, any> = { ...data }
    if (payload.start_time === undefined) payload.start_time = null
    if (payload.end_time === undefined) payload.end_time = null

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
  // 14. FICHA MESTRE (Criação de versão / Atualização)
  // ==========================================
  async saveLineMaster(data: Partial<LineMaster>): Promise<LineMaster> {
    if (data.id) {
      return await pb.collection('line_masters').update<LineMaster>(data.id, data)
    }
    return await pb.collection('line_masters').create<LineMaster>(data)
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
    const user = pb.authStore.record
    try {
      // Gravação na coleção oficial de auditoria pcp_audit_logs (best-effort)
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || null,
        user_email: user?.email || '',
        user_name: user?.name || user?.email || 'Usuário PCP',
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
