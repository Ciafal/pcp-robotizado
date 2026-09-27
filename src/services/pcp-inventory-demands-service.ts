import pb from '@/lib/pocketbase/client'
import {
  InventoryDemand,
  InventoryGauge,
  InventoryRun,
  InventoryEntry,
  InventoryAuditEvent,
  CreateDemandPayload,
  CreateEntryPayload,
} from '@/types/pcp-inventory-demands'

function formatPtBrDateTime(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${hours}:${minutes}`
}

export interface DemandMaterialItem {
  id?: string
  demand_id?: string
  production_order_code?: string
  material_code?: string
  material_description?: string
  steel_type?: string
  gauge_mm?: number
  application?: string
  quantity_pieces?: number
  weight_tons: number
  unit_of_measure?: string
  storage_location?: string
  batch_number?: string
  notes?: string
  created?: string
  updated?: string
}

class PcpInventoryDemandsService {
  /**
   * Obtém o próximo número de controle atômico via hook do PocketBase
   * Fallback local INV-AAAA-###### caso offline
   */
  async fetchNextControlNumber(): Promise<string> {
    try {
      const res = await pb.send('/backend/v1/pcp-inventory-demands-next-number', {
        method: 'GET',
      })
      if (res && res.nextNumber) {
        return res.nextNumber
      }
    } catch (err) {
      console.warn('Falha ao obter número via hook, usando fallback:', err)
    }

    const currentYear = new Date().getFullYear()
    const prefix = `INV-${currentYear}-`
    try {
      const records = await pb
        .collection('pcp_mp_inventory_demands')
        .getList<InventoryDemand>(1, 1, {
          filter: `control_number ~ '${prefix}'`,
          sort: '-created',
        })
      if (records && records.items.length > 0) {
        const lastNum = records.items[0].control_number
        const parts = lastNum.split('-')
        if (parts.length === 3) {
          const parsed = parseInt(parts[2], 10)
          if (!isNaN(parsed)) {
            return `${prefix}${String(parsed + 1).padStart(6, '0')}`
          }
        }
      }
    } catch {
      // continua para fallback
    }

    const randomSeq = String(Math.floor(100000 + Math.random() * 900000))
    return `${prefix}${randomSeq}`
  }

  /**
   * Lista todas as demandas cadastradas
   */
  async listDemands(filterExp?: string): Promise<InventoryDemand[]> {
    try {
      const queryParams: any = {
        sort: '-created',
      }
      if (filterExp) {
        queryParams.filter = filterExp
      }
      const records = await pb
        .collection('pcp_mp_inventory_demands')
        .getFullList<InventoryDemand>(queryParams)
      return records
    } catch (err) {
      console.warn('Erro ao listar demandas de inventário:', err)
      return []
    }
  }

  /**
   * Busca itens de MP vinculados a uma demanda (pcp_mp_inventory_items)
   */
  async listItemsByDemand(demandId: string, controlNumber?: string): Promise<DemandMaterialItem[]> {
    try {
      let filter = `demand_id = '${demandId}'`
      if (controlNumber) {
        filter += ` || control_number = '${controlNumber}'`
      }
      const records = await pb.collection('pcp_mp_inventory_items').getFullList({
        filter,
        sort: 'created',
      })
      return records.map((r: any) => ({
        id: r.id,
        weight_tons: Number(r.quantity_tons || r.weight_tons || 0),
        demand_id: r.demand_id || demandId,
        control_number: r.control_number || r.inventory_code || '',
        material_code: r.raw_material_code || r.material_code || '',
        material_description: r.raw_material_description || r.material_description || '',
        heat_number: r.heat_number || '',
        quantity_tons: Number(r.quantity_tons || r.planned_requirement_tons) || 0,
        calculated_pieces: Number(r.calculated_pieces || r.sap_pieces_count) || 0,
        unit_weight_kg: r.unit_weight_kg != null ? Number(r.unit_weight_kg) : null,
        location_wms: r.wms_physical_location || '',
        status: r.status,
      }))
    } catch (err) {
      console.warn('Erro ao listar itens da demanda:', err)
      return []
    }
  }
  /**
   * Obtém uma demanda por ID
   */
  async getDemandById(id: string): Promise<InventoryDemand | null> {
    try {
      const record = await pb.collection('pcp_mp_inventory_demands').getOne<InventoryDemand>(id)
      return record
    } catch (err) {
      console.error('Erro ao buscar demanda:', err)
      return null
    }
  }

  /**
   * Obtém os gauges vinculados a uma demanda
   */
  async listGaugesByDemand(demandId: string): Promise<InventoryGauge[]> {
    try {
      const records = await pb.collection('pcp_mp_inventory_gauges').getFullList<InventoryGauge>({
        filter: `demand_id = '${demandId}'`,
        sort: 'created',
      })
      return records
    } catch {
      return []
    }
  }

  /**
   * Obtém as corridas vinculadas a uma demanda
   */
  async listRunsByDemand(demandId: string): Promise<InventoryRun[]> {
    try {
      const records = await pb.collection('pcp_mp_inventory_runs').getFullList<InventoryRun>({
        filter: `demand_id = '${demandId}'`,
        sort: 'created',
      })
      return records
    } catch {
      return []
    }
  }

  /**
   * Obtém os lançamentos (contagens físicas) de uma demanda
   */
  async listEntriesByDemand(
    demandId: string,
    onlyActive: boolean = true,
  ): Promise<InventoryEntry[]> {
    try {
      const filter = onlyActive
        ? `demand_id = '${demandId}' && is_active = true`
        : `demand_id = '${demandId}'`
      const records = await pb.collection('pcp_mp_inventory_entries').getFullList<InventoryEntry>({
        filter,
        sort: '-created',
      })
      return records
    } catch {
      return []
    }
  }

  /**
   * Obtém a timeline cronológica append-only de auditoria
   */
  async listAuditEventsByDemand(demandId: string): Promise<InventoryAuditEvent[]> {
    try {
      const records = await pb
        .collection('pcp_mp_inventory_audit_events')
        .getFullList<InventoryAuditEvent>({
          filter: `demand_id = '${demandId}'`,
          sort: 'created',
        })
      return records
    } catch {
      return []
    }
  }

  /**
   * Lista todos os eventos de auditoria para visualização global de Histórico & Rastreabilidade
   */
  async listAllAuditEvents(): Promise<InventoryAuditEvent[]> {
    try {
      const records = await pb
        .collection('pcp_mp_inventory_audit_events')
        .getFullList<InventoryAuditEvent>({
          sort: '-created',
        })
      return records
    } catch {
      return []
    }
  }

  /**
   * Cria uma nova demanda de inventário de matéria-prima
   */
  async createDemand(payload: CreateDemandPayload): Promise<InventoryDemand> {
    const nextCtrl = await this.fetchNextControlNumber()
    const nowStr = formatPtBrDateTime()

    const authUser = pb.authStore.record || pb.authStore.model
    const requesterId = authUser?.id || 'usr-pcp'
    const requesterName = payload.requester_name || authUser?.name || 'Programador PCP'
    const requesterRole = (authUser as any)?.role || 'PCP_PROGRAMMER'

    // Suporte a multi-MP e legado mono-MP
    const materialsInput =
      payload.materials && payload.materials.length > 0
        ? payload.materials
        : [
            {
              material_code: payload.material_code || '',
              material_description: payload.material_description || '',
              heat_number: payload.run_number || 'LOTE-INICIAL',
              quantity_tons: 0,
              calculated_pieces: Number(payload.quantity_required) || 0,
              unit_weight_kg: null,
            },
          ]

    const totalReq =
      payload.materials && payload.materials.length > 0
        ? payload.materials.reduce((acc, m) => acc + (Number(m.calculated_pieces) || 0), 0)
        : Number(payload.quantity_required) || 0

    const primaryMaterial = materialsInput[0] || {
      material_code: payload.material_code || '',
      material_description: payload.material_description || '',
      heat_number: payload.run_number || 'LOTE-INICIAL',
    }

    // 1. Persiste a demanda
    const demandPayload: any = {
      control_number: nextCtrl,
      company: payload.company || '',
      line: payload.line || '',
      center: payload.center || '',
      storage_deposit: payload.storage_deposit || '',
      production_order: payload.production_order || '',
      material_code: primaryMaterial.material_code || payload.material_code || '',
      material_description:
        primaryMaterial.material_description || payload.material_description || '',
      unit_of_measure: payload.unit_of_measure || 'pçs',
      sap_stock: totalReq,
      sap_last_sync: nowStr,
      sap_query_status: 'SINCRONIZADO',
      priority: payload.priority || 'Normal',
      status: 'Gerada',
      observation: payload.observation || '',
      requester_id: requesterId,
      requester_name: requesterName,
      requester_role: requesterRole,
      generation_date_formatted: nowStr,
      total_pieces_required: totalReq,
      total_pieces_inventoried: 0,
      divergence_pieces: -totalReq,
      divergence_pct: -100,
      materials_summary: materialsInput,
    }

    if (payload.gauge) demandPayload.gauge = payload.gauge
    if (payload.application) demandPayload.application = payload.application

    const demandRecord = await pb
      .collection('pcp_mp_inventory_demands')
      .create<InventoryDemand>(demandPayload)

    // 2. Persiste itens em pcp_mp_inventory_items (1 Demanda -> N MPs)
    try {
      for (const m of materialsInput) {
        if (!m.material_code) continue
        await pb.collection('pcp_mp_inventory_items').create({
          demand_id: demandRecord.id,
          control_number: nextCtrl,
          inventory_id: demandRecord.id,
          inventory_code: nextCtrl,
          item_control_key: `${nextCtrl}-${m.material_code}-${m.heat_number}`,
          company: payload.company || '',
          line: payload.line || '',
          center: payload.center || '',
          storage_deposit: payload.storage_deposit || '',
          production_order: payload.production_order || '',
          raw_material_code: m.material_code,
          raw_material_description: m.material_description || '',
          heat_number: m.heat_number || '',
          produced_gauge_product: payload.gauge || '',
          enfornamento_type: 'NORMAL',
          quantity_tons: m.quantity_tons || 0,
          calculated_pieces: m.calculated_pieces || 0,
          unit_weight_kg: m.unit_weight_kg ?? null,
          planned_requirement_tons: m.quantity_tons || 0,
          sap_pieces_count: m.calculated_pieces || 0,
          wms_physical_location: payload.storage_deposit || '',
          pcp_planned_sequence: 1,
          schedule_version: 1,
          status: 'Aguardando Inventário',
        })
      }
    } catch (itErr) {
      console.warn('Erro ao salvar pcp_mp_inventory_items:', itErr)
    }

    // 3. Persiste o item correspondente em pcp_mp_inventory_gauges
    try {
      await pb.collection('pcp_mp_inventory_gauges').create<InventoryGauge>({
        demand_id: demandRecord.id,
        control_number: nextCtrl,
        gauge: payload.gauge || 'Tarugo 130mm',
        application: payload.application || 'Laminação L1',
        quantity_required: totalReq,
        unit_of_measure: payload.unit_of_measure || 'pçs',
        suggested_run: primaryMaterial.heat_number || payload.run_number || '',
        run_stock: totalReq,
      })
    } catch (gErr) {
      console.warn('Erro ao criar gauge vinculado:', gErr)
    }

    // 4. Persiste as corridas vinculadas
    try {
      for (const m of materialsInput) {
        const runNum = m.heat_number || payload.run_number || 'LOTE-INICIAL'
        await pb.collection('pcp_mp_inventory_runs').create<InventoryRun>({
          demand_id: demandRecord.id,
          control_number: nextCtrl,
          run_number: runNum,
          batch_number: `LOT-${runNum}`,
          gauge: payload.gauge || 'Tarugo 130mm',
          application: payload.application || 'Laminação L1',
          sap_stock_pieces: m.calculated_pieces || totalReq,
          suggested_pieces: m.calculated_pieces || totalReq,
          selected_pieces: m.calculated_pieces || totalReq,
          is_ai_suggested: false,
          is_manual_override: false,
          inventoried_pieces: 0,
        })
      }
    } catch (rErr) {
      console.warn('Erro ao criar corridas vinculadas:', rErr)
    }

    // 5. Registra evento append-only de auditoria com detalhes completos
    try {
      const matSummaryText = materialsInput
        .map(
          (m) =>
            `${m.material_code} (Corrida: ${m.heat_number}, ${m.quantity_tons} t / ${m.calculated_pieces} pçs)`,
        )
        .join('; ')

      await pb.collection('pcp_mp_inventory_audit_events').create<InventoryAuditEvent>({
        demand_id: demandRecord.id,
        control_number: nextCtrl,
        event_type: 'DEMANDA_GERADA',
        event_description: `Demanda de inventário ${nextCtrl} gerada com sucesso para OP ${payload.production_order || '—'}. Matérias-Primas: [${matSummaryText}]. Total: ${totalReq} peças.`,
        run_number: primaryMaterial.heat_number || payload.run_number || '',
        location_wms: payload.storage_deposit || '',
        pieces_count: totalReq,
        previous_value: '—',
        new_value: `${totalReq} pçs`,
        origin: 'USUARIO',
        result: 'SUCESSO',
        user_id: requesterId,
        user_name: requesterName,
        user_role: requesterRole,
        event_timestamp_formatted: nowStr,
        details_json: {
          company: payload.company,
          line: payload.line,
          center: payload.center,
          storage_deposit: payload.storage_deposit,
          production_order: payload.production_order,
          priority: payload.priority,
          gauge: payload.gauge,
          application: payload.application,
          materials: materialsInput,
        },
        after_data: {
          demand: demandPayload,
          materials: materialsInput,
        },
      })
    } catch (aErr) {
      console.warn('Erro ao gravar evento de auditoria:', aErr)
    }

    return demandRecord
  }

  /**
   * Adiciona um lançamento (contagem física)
   */
  async addEntry(payload: CreateEntryPayload): Promise<InventoryEntry> {
    const demand = await this.getDemandById(payload.demand_id)
    if (!demand) {
      throw new Error('Demanda não encontrada.')
    }

    const nowStr = formatPtBrDateTime()
    const authUser = pb.authStore.record || pb.authStore.model
    const userId = authUser?.id || 'usr-pcp'
    const userName = authUser?.name || 'Operador DP07'
    const userRole = (authUser as any)?.role || 'OPERADOR_DP07'

    // Localiza ou cria a corrida
    let runId = ''
    try {
      const runs = await this.listRunsByDemand(demand.id)
      const existingRun = runs.find((r) => r.run_number === payload.run_number)
      if (existingRun) {
        runId = existingRun.id
      } else {
        const newRun = await pb.collection('pcp_mp_inventory_runs').create<InventoryRun>({
          demand_id: demand.id,
          control_number: demand.control_number,
          run_number: payload.run_number,
          batch_number: `LOT-${payload.run_number}`,
          gauge: payload.gauge || 'Tarugo 130mm',
          sap_stock_pieces: payload.pieces_count,
          suggested_pieces: payload.pieces_count,
          selected_pieces: payload.pieces_count,
          inventoried_pieces: payload.pieces_count,
        })
        runId = newRun.id
      }
    } catch {
      // caso não consiga criar a corrida, cria lançamento sem relation se aceito ou usa relation dummy
    }

    // Cria a entrada de contagem física
    const entry = await pb.collection('pcp_mp_inventory_entries').create<InventoryEntry>({
      demand_id: demand.id,
      run_id: runId,
      control_number: demand.control_number,
      run_number: payload.run_number,
      gauge: payload.gauge || 'Tarugo 130mm',
      location_wms: payload.location_wms,
      pieces_count: Number(payload.pieces_count),
      entry_date_formatted: nowStr,
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      notes: payload.notes || '',
      is_active: true,
    })

    // Registra evento de auditoria
    try {
      await pb.collection('pcp_mp_inventory_audit_events').create<InventoryAuditEvent>({
        demand_id: demand.id,
        control_number: demand.control_number,
        event_type: 'LANCAMENTO_ADICIONADO',
        event_description: `Contagem física de ${payload.pieces_count} peças na localização ${payload.location_wms} (Corrida: ${payload.run_number}).`,
        run_number: payload.run_number,
        location_wms: payload.location_wms,
        pieces_count: Number(payload.pieces_count),
        previous_value: '—',
        new_value: `${payload.pieces_count} pçs`,
        origin: 'USUARIO',
        result: 'SUCESSO',
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        event_timestamp_formatted: nowStr,
      })
    } catch {
      // ok
    }

    // Se o status da demanda era 'Gerada', transiciona para 'Em inventário'
    if (demand.status === 'Gerada') {
      try {
        await pb.collection('pcp_mp_inventory_demands').update(demand.id, {
          status: 'Em inventário',
        })
        await pb.collection('pcp_mp_inventory_audit_events').create<InventoryAuditEvent>({
          demand_id: demand.id,
          control_number: demand.control_number,
          event_type: 'INVENTARIO_INICIADO',
          event_description: `Inventário da demanda ${demand.control_number} iniciado pelo operador ${userName}.`,
          user_id: userId,
          user_name: userName,
          user_role: userRole,
          event_timestamp_formatted: nowStr,
        })
      } catch {
        // ok
      }
    }

    // Recalcula totais da demanda
    await this.recalculateDemandTotals(demand.id)

    return entry
  }

  /**
   * Recalcula totais da demanda e atualiza no banco
   */
  async recalculateDemandTotals(demandId: string): Promise<void> {
    const demand = await this.getDemandById(demandId)
    if (!demand) return

    const entries = await this.listEntriesByDemand(demandId, true)
    const totalInventoried = entries.reduce((acc, curr) => acc + (curr.pieces_count || 0), 0)
    const required = demand.total_pieces_required || 0
    const divergence = totalInventoried - required
    const divergencePct = required > 0 ? (divergence / required) * 100 : 0

    await pb.collection('pcp_mp_inventory_demands').update(demandId, {
      total_pieces_inventoried: totalInventoried,
      divergence_pieces: divergence,
      divergence_pct: Number(divergencePct.toFixed(2)),
    })
  }

  /**
   * Salva parcialmente a demanda (permanece em inventário ou inventário parcial para retomar depois)
   */
  async savePartialDemand(demandId: string): Promise<InventoryDemand> {
    const demand = await this.getDemandById(demandId)
    if (!demand) throw new Error('Demanda não encontrada.')

    const authUser = pb.authStore.record || pb.authStore.model
    const userName = authUser?.name || 'Operador DP07'
    const nowStr = formatPtBrDateTime()

    await this.recalculateDemandTotals(demandId)

    const updated = await pb
      .collection('pcp_mp_inventory_demands')
      .update<InventoryDemand>(demandId, {
        status: 'Inventário parcial',
      })

    await pb.collection('pcp_mp_inventory_audit_events').create<InventoryAuditEvent>({
      demand_id: demand.id,
      control_number: demand.control_number,
      event_type: 'SALVAMENTO_PARCIAL',
      event_description: `Inventário salvo parcialmente com ${updated.total_pieces_inventoried || 0} peças apuradas. Retomada permitida.`,
      user_id: authUser?.id || '',
      user_name: userName,
      user_role: (authUser as any)?.role || '',
      event_timestamp_formatted: nowStr,
    })

    return updated
  }

  /**
   * Conclui o inventário da demanda
   */
  async concludeDemand(demandId: string): Promise<InventoryDemand> {
    const demand = await this.getDemandById(demandId)
    if (!demand) throw new Error('Demanda não encontrada.')

    const authUser = pb.authStore.record || pb.authStore.model
    const userName = authUser?.name || 'Operador DP07'
    const nowStr = formatPtBrDateTime()

    await this.recalculateDemandTotals(demandId)

    const updated = await pb
      .collection('pcp_mp_inventory_demands')
      .update<InventoryDemand>(demandId, {
        status: 'Inventário concluído',
        concluded_at: nowStr,
        concluded_by: userName,
      })

    await pb.collection('pcp_mp_inventory_audit_events').create<InventoryAuditEvent>({
      demand_id: demand.id,
      control_number: demand.control_number,
      event_type: 'INVENTARIO_CONCLUIDO',
      event_description: `Inventário concluído com sucesso. Total apurado: ${updated.total_pieces_inventoried || 0} peças. Divergência: ${updated.divergence_pieces || 0} peças.`,
      user_id: authUser?.id || '',
      user_name: userName,
      user_role: (authUser as any)?.role || '',
      event_timestamp_formatted: nowStr,
      result: (updated.divergence_pieces || 0) === 0 ? 'SUCESSO' : 'DIVERGENCIA',
    })

    return updated
  }

  /**
   * Cancela uma demanda
   */
  async cancelDemand(demandId: string, reason: string): Promise<InventoryDemand> {
    const demand = await this.getDemandById(demandId)
    if (!demand) throw new Error('Demanda não encontrada.')

    const authUser = pb.authStore.record || pb.authStore.model
    const userName = authUser?.name || 'Programador PCP'
    const nowStr = formatPtBrDateTime()

    const updated = await pb
      .collection('pcp_mp_inventory_demands')
      .update<InventoryDemand>(demandId, {
        status: 'Cancelada',
        cancellation_reason: reason,
        cancelled_at: nowStr,
        cancelled_by: userName,
      })

    await pb.collection('pcp_mp_inventory_audit_events').create<InventoryAuditEvent>({
      demand_id: demand.id,
      control_number: demand.control_number,
      event_type: 'DEMANDA_CANCELADA',
      event_description: `Demanda cancelada por ${userName}. Motivo: ${reason}`,
      previous_value: demand.status,
      new_value: 'Cancelada',
      user_id: authUser?.id || '',
      user_name: userName,
      user_role: (authUser as any)?.role || '',
      event_timestamp_formatted: nowStr,
      result: 'SUCESSO',
    })

    return updated
  }
}

export const pcpInventoryDemandsService = new PcpInventoryDemandsService()
