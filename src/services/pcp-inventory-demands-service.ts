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
  control_number?: string
  production_order_code?: string
  material_code?: string
  material_description?: string
  steel_type?: string
  gauge_mm?: number
  application?: string
  quantity_pieces?: number
  weight_tons: number
  quantity_tons?: number
  calculated_pieces?: number
  unit_weight_t?: number | null
  unit_weight_kg?: number | null
  weight_origin?: string
  heat_number?: string
  unit_of_measure?: string
  storage_location?: string
  location_wms?: string
  batch_number?: string
  notes?: string
  status?: string
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
      if (res && (res.control_number || res.nextNumber)) {
        return res.control_number || res.nextNumber
      }
    } catch (err) {
      console.warn('Falha ao obter número via hook, consultando base:', err)
    }

    const currentYear = new Date().getFullYear()
    const prefix = `INV-${currentYear}-`
    try {
      const records = await pb.collection('pcp_mp_inventory_demands').getFullList<InventoryDemand>({
        filter: `control_number ~ '${prefix}'`,
        sort: '-control_number',
      })
      let maxSeq = 0
      for (const rec of records) {
        const parts = (rec.control_number || '').split('-')
        if (parts.length >= 3) {
          const parsed = parseInt(parts[2], 10)
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed
          }
        }
      }
      return `${prefix}${String(maxSeq + 1).padStart(6, '0')}`
    } catch {
      // fallback
    }

    return `${prefix}000003`
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
   * Usa tanto demand_id quanto control_number para máxima rastreabilidade
   */
  async listItemsByDemand(demandId: string, controlNumber?: string): Promise<DemandMaterialItem[]> {
    try {
      // Prioriza demand_id quando fornecido para evitar colisão com itens de control_number compartilhado/legado
      let filter = `demand_id = '${demandId}'`
      let records = await pb.collection('pcp_mp_inventory_items').getFullList({
        filter,
        sort: 'created',
      })
      if (records.length === 0 && controlNumber) {
        records = await pb.collection('pcp_mp_inventory_items').getFullList({
          filter: `control_number = '${controlNumber}' || inventory_code = '${controlNumber}'`,
          sort: 'created',
        })
      }
      return records.map((r: any) => ({
        id: r.id,
        weight_tons: Number(r.quantity_tons || r.weight_tons || 0),
        demand_id: r.demand_id || demandId,
        control_number: r.control_number || r.inventory_code || controlNumber || '',
        material_code: r.raw_material_code || r.material_code || '',
        material_description: r.raw_material_description || r.material_description || '',
        heat_number: r.heat_number || '',
        quantity_tons: Number(r.quantity_tons || r.planned_requirement_tons) || 0,
        calculated_pieces: Number(r.calculated_pieces || r.sap_pieces_count) || 0,
        unit_weight_kg: r.unit_weight_kg != null ? Number(r.unit_weight_kg) : null,
        unit_weight_t:
          r.unit_weight_t != null
            ? Number(r.unit_weight_t)
            : r.unit_weight_kg
              ? Number(r.unit_weight_kg) / 1000
              : null,
        weight_origin: r.weight_origin || '',
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
   * Obtém os gauges vinculados a uma demanda (mantido para compatibilidade, sem coleções inexistentes)
   */
  async listGaugesByDemand(demandId: string): Promise<InventoryGauge[]> {
    return []
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
   * Obtém as corridas vinculadas a uma demanda (a partir dos itens em pcp_mp_inventory_items)
   */
  async listRunsByDemand(demandId: string): Promise<InventoryRun[]> {
    try {
      const items = await this.listItemsByDemand(demandId)
      return items.map((it, idx) => ({
        id: it.id || `run-${idx}`,
        demand_id: demandId,
        control_number: it.control_number || '',
        run_number: it.heat_number || 'AVULSO',
        batch_number: it.heat_number ? `LOT-${it.heat_number}` : 'SEM-CORRIDA',
        gauge: 'Tarugo',
        application: 'Laminação',
        sap_stock_pieces: it.calculated_pieces || 0,
        suggested_pieces: it.calculated_pieces || 0,
        selected_pieces: it.calculated_pieces || 0,
        is_ai_suggested: false,
        is_manual_override: false,
        inventoried_pieces: 0,
      }))
    } catch {
      return []
    }
  }

  /**
   * Obtém a timeline cronológica append-only de auditoria a partir de pcp_mp_inventory_history
   */
  async listAuditEventsByDemand(demandId: string, controlNumber?: string): Promise<any[]> {
    try {
      let filter = `demand_id = '${demandId}' || inventory_order_id = '${demandId}'`
      if (controlNumber) {
        filter += ` || control_number = '${controlNumber}'`
      }
      const records = await pb.collection('pcp_mp_inventory_history').getFullList({
        filter,
        sort: '-created',
      })
      return records
    } catch {
      return []
    }
  }

  /**
   * Lista todos os eventos de auditoria para visualização global de Histórico & Rastreabilidade
   */
  async listAllAuditEvents(): Promise<any[]> {
    try {
      const records = await pb.collection('pcp_mp_inventory_history').getFullList({
        sort: '-created',
      })
      return records
    } catch {
      return []
    }
  }

  /**
   * Cria uma nova demanda de inventário de matéria-prima de modo ATÔMICO
   * com rollback completo se qualquer etapa mandatória falhar.
   */
  async createDemand(payload: CreateDemandPayload): Promise<InventoryDemand> {
    // 1. Validação estrita de entrada antes de qualquer escrita
    const company = (payload.company || '').trim()
    const line = (payload.line || '').trim()
    const center = (payload.center || '').trim()
    const storageDeposit = (payload.storage_deposit || '').trim()
    const productionOrder = (payload.production_order || '').trim()
    const priority = (payload.priority || '').trim()

    if (!company) {
      throw new Error('Não foi possível gerar a demanda: Empresa não foi informada.')
    }
    if (!line) {
      throw new Error('Não foi possível gerar a demanda: Linha não foi informada.')
    }
    if (!center) {
      throw new Error('Não foi possível gerar a demanda: Centro não foi informado.')
    }
    if (!storageDeposit) {
      throw new Error('Não foi possível gerar a demanda: Depósito não foi informado.')
    }
    if (!productionOrder) {
      throw new Error('Não foi possível gerar a demanda: Ordem de Produção não foi informada.')
    }
    if (!priority) {
      throw new Error('Não foi possível gerar a demanda: Prioridade não foi informada.')
    }

    // Preparar lista de materiais (1..N)
    const rawMaterials =
      payload.materials && payload.materials.length > 0
        ? payload.materials
        : payload.material_code
          ? [
              {
                material_code: payload.material_code,
                material_description: payload.material_description || '',
                heat_number: payload.run_number || '',
                quantity_tons: 0,
                calculated_pieces: Number(payload.quantity_required) || 0,
                unit_weight_t: null,
                unit_weight_kg: null,
                weight_origin: 'LOCAL_CADASTRO',
              },
            ]
          : []

    if (rawMaterials.length === 0) {
      throw new Error('Não foi possível gerar a demanda: nenhum material foi vinculado.')
    }

    const materialsStructured = rawMaterials.map((m) => {
      const code = (m.material_code || '').trim()
      if (!code) {
        throw new Error('Não foi possível gerar a demanda: Código de Matéria-Prima inválido.')
      }
      const heat = (m.heat_number || '').trim()
      const qTons = Number(m.quantity_tons) || 0
      const calcPieces = Number(m.calculated_pieces) || 0
      const uWeightT = m.unit_weight_t != null ? Number(m.unit_weight_t) : null
      const uWeightKg =
        m.unit_weight_kg != null
          ? Number(m.unit_weight_kg)
          : uWeightT != null
            ? Math.round(uWeightT * 1000)
            : null

      return {
        material_code: code,
        material_description: (m.material_description || '').trim(),
        heat_number: heat, // Corrida opcional: preserva string vazia se ausente
        quantity_tons: qTons,
        calculated_pieces: calcPieces,
        unit_weight_t: uWeightT,
        unit_weight_kg: uWeightKg,
        weight_origin: m.weight_origin || 'LOCAL_CADASTRO',
      }
    })

    const totalPiecesReq = materialsStructured.reduce(
      (acc, m) => acc + (Number(m.calculated_pieces) || 0),
      0,
    )

    const primaryMaterial = materialsStructured[0]
    const nextCtrl = await this.fetchNextControlNumber()
    const nowStr = formatPtBrDateTime()

    const authUser = pb.authStore.record || pb.authStore.model
    const requesterId = authUser?.id || 'usr-pcp'
    const requesterName = payload.requester_name || authUser?.name || 'Programador PCP'
    const requesterRole = (authUser as any)?.role || 'PCP_PROGRAMMER'

    // Monta o payload do cabeçalho da demanda
    const demandPayload: any = {
      control_number: nextCtrl,
      company,
      line,
      center,
      storage_deposit: storageDeposit,
      production_order: productionOrder,
      material_code: primaryMaterial.material_code,
      material_description: primaryMaterial.material_description,
      unit_of_measure: payload.unit_of_measure || 'pçs',
      sap_stock: totalPiecesReq,
      sap_last_sync: nowStr,
      sap_query_status: 'SINCRONIZADO',
      priority,
      status: 'Gerada',
      observation: (payload.observation || '').trim(),
      requester_id: requesterId,
      requester_name: requesterName,
      requester_role: requesterRole,
      generation_date_formatted: nowStr,
      total_pieces_required: totalPiecesReq,
      total_pieces_inventoried: 0,
      divergence_pieces: -totalPiecesReq,
      divergence_pct: -100,
      // materials_summary NUNCA null, sempre array estruturado
      materials_summary: materialsStructured,
    }

    if (payload.gauge) demandPayload.gauge = payload.gauge
    if (payload.application) demandPayload.application = payload.application

    let createdDemandRecord: InventoryDemand | null = null
    const createdItemIds: string[] = []

    try {
      // ETAPA A: Criação da demanda principal
      createdDemandRecord = await pb
        .collection('pcp_mp_inventory_demands')
        .create<InventoryDemand>(demandPayload)

      if (!createdDemandRecord || !createdDemandRecord.id) {
        throw new Error('Falha ao persistir cabeçalho da Demanda no banco.')
      }

      // ETAPA B: Criação de cada item em pcp_mp_inventory_items com vínculo estrito
      for (const m of materialsStructured) {
        const heatVal = m.heat_number
        const itemKey = `${nextCtrl}-${m.material_code}-${heatVal || 'AVULSO'}-${Math.floor(Math.random() * 10000)}`

        const itemRecord = await pb.collection('pcp_mp_inventory_items').create({
          demand_id: createdDemandRecord.id,
          control_number: nextCtrl,
          inventory_id: createdDemandRecord.id,
          inventory_code: nextCtrl,
          item_control_key: itemKey,
          company,
          line,
          center,
          storage_deposit: storageDeposit,
          production_order: productionOrder,
          raw_material_code: m.material_code,
          raw_material_description: m.material_description,
          heat_number: heatVal, // Corrida salva fielmente
          produced_gauge_product: payload.gauge || '',
          enfornamento_type: 'NORMAL',
          quantity_tons: m.quantity_tons,
          unit_weight_t: m.unit_weight_t,
          unit_weight_kg: m.unit_weight_kg,
          weight_origin: m.weight_origin,
          calculated_pieces: m.calculated_pieces,
          planned_requirement_tons: m.quantity_tons,
          sap_pieces_count: m.calculated_pieces,
          wms_physical_location: storageDeposit,
          pcp_planned_sequence: 1,
          schedule_version: 1,
          status: 'Aguardando Inventário',
        })
        createdItemIds.push(itemRecord.id)
      }

      // ETAPA C: Timeline em pcp_mp_inventory_history (falha secundária NUNCA aborta o fluxo de sucesso)
      try {
        const matSummaryText = materialsStructured
          .map(
            (m) =>
              `${m.material_code} (Corrida: ${m.heat_number || 'Sem corrida'}, ${m.quantity_tons} t / ${m.calculated_pieces} pçs | Peso un: ${m.unit_weight_t != null ? m.unit_weight_t + ' t' : 'Aguardando SAP'})`,
          )
          .join('; ')

        await pb.collection('pcp_mp_inventory_history').create({
          inventory_id: createdDemandRecord.id,
          event_type: 'DEMANDA_GERADA',
          user_name: requesterName,
          user_id: requesterId,
          description: `Demanda de Inventário ${nextCtrl} gerada para WERKS ${company}, Linha ${line}, Centro ${center}, Depósito LGORT ${storageDeposit}. OP: ${productionOrder}. Materiais: [${matSummaryText}]. Total: ${totalPiecesReq} peças.`,
          new_value: {
            control_number: nextCtrl,
            company,
            line,
            center,
            storage_deposit: storageDeposit,
            production_order: productionOrder,
            priority,
            materials: materialsStructured,
            total_pieces_required: totalPiecesReq,
          },
          timestamp: new Date().toISOString(),
        })
      } catch (histErr) {
        console.warn('Registro em pcp_mp_inventory_history ignorado:', histErr)
      }

      // ETAPA D: Auditoria oficial em pcp_audit_logs (falha secundária NUNCA aborta o fluxo de sucesso)
      try {
        await pb.collection('pcp_audit_logs').create({
          module: 'INVENTARIO_MP',
          action: 'CREATE_DEMAND',
          event_type: 'SCHEDULE_ACTION',
          user_id: requesterId,
          user_name: requesterName,
          user_role: requesterRole,
          record_id: createdDemandRecord.id,
          resource: 'pcp_mp_inventory_demands',
          resource_id: createdDemandRecord.id,
          company,
          line,
          center,
          outcome: 'SUCCESS',
          details: {
            control_number: nextCtrl,
            company,
            line,
            center,
            storage_deposit: storageDeposit,
            production_order: productionOrder,
            priority,
            total_pieces_required: totalPiecesReq,
            materials_count: materialsStructured.length,
            operation_result: 'DEMANDA_GERADA_SUCESSO',
            timestamp: new Date().toISOString(),
          },
        })
      } catch (auditErr) {
        console.warn('Registro secundário em pcp_audit_logs ignorado:', auditErr)
      }

      // Retorna a demanda criada com todos os campos populados
      return {
        ...createdDemandRecord,
        materials_summary: materialsStructured,
      }
    } catch (err: any) {
      console.error('Falha atômica ao criar demanda de inventário. Iniciando rollback...', err)

      // ROLLBACK: se os itens falharem ou houver erro, remove os itens criados e a demanda
      for (const itemId of createdItemIds) {
        try {
          await pb.collection('pcp_mp_inventory_items').delete(itemId)
        } catch {
          /* intentionally ignored */
        }
      }

      if (createdDemandRecord && createdDemandRecord.id) {
        try {
          await pb.collection('pcp_mp_inventory_demands').delete(createdDemandRecord.id)
        } catch {
          /* intentionally ignored */
        }
      }

      const errMsg = err?.message || 'Falha desconhecida ao persistir demanda e materiais.'
      throw new Error(`Não foi possível gerar a demanda: ${errMsg}`)
    }
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

    // Cria a entrada de contagem física (se coleção pcp_mp_inventory_entries existir)
    let entry: any = {
      id: `entry-${Date.now()}`,
      demand_id: demand.id,
      control_number: demand.control_number,
      run_number: payload.run_number,
      pieces_count: Number(payload.pieces_count),
      entry_date_formatted: nowStr,
    }

    try {
      entry = await pb.collection('pcp_mp_inventory_entries').create<InventoryEntry>({
        demand_id: demand.id,
        run_id: '',
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
    } catch (e) {
      // tolerante caso não exista collection
    }

    // Registra evento de histórico/auditoria em pcp_mp_inventory_history e pcp_audit_logs
    try {
      await pb.collection('pcp_mp_inventory_history').create({
        demand_id: demand.id,
        inventory_order_id: demand.id,
        control_number: demand.control_number,
        event_type: 'LANCAMENTO_ADICIONADO',
        user_name: userName,
        user_role: userRole,
        summary: `Contagem física de ${payload.pieces_count} peças na localização ${payload.location_wms} (Corrida: ${payload.run_number}).`,
        details: {
          pieces_count: payload.pieces_count,
          location_wms: payload.location_wms,
          run_number: payload.run_number,
        },
        timestamp: new Date().toISOString(),
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

    try {
      await pb.collection('pcp_mp_inventory_history').create({
        demand_id: demand.id,
        inventory_order_id: demand.id,
        control_number: demand.control_number,
        event_type: 'SALVAMENTO_PARCIAL',
        user_name: userName,
        user_role: (authUser as any)?.role || '',
        summary: `Inventário salvo parcialmente com ${updated.total_pieces_inventoried || 0} peças apuradas. Retomada permitida.`,
        details: { total_pieces_inventoried: updated.total_pieces_inventoried },
        timestamp: new Date().toISOString(),
      })
    } catch {
      /* intentionally ignored */
    }

    return updated
  }

  /**
   * Consulta Saldo de Estoque no SAP ECC via Hook RFC
   */
  async getSapStockBalance(params: {
    werks: string
    lgort: string
    matnr: string
    charg?: string
    run_number?: string
  }): Promise<{
    success: boolean
    saldo: number | null
    code?: string
    message?: string
    timestamp?: string
  }> {
    try {
      const res = await pb.send<{
        success: boolean
        saldo: number
        code?: string
        message?: string
        timestamp?: string
      }>('/backend/v1/pcp/sap/stock-balance', {
        method: 'POST',
        body: params,
      })
      return {
        success: Boolean(res.success),
        saldo: res.saldo !== undefined && res.saldo !== null ? Number(res.saldo) : null,
        code: res.code,
        message: res.message,
        timestamp: res.timestamp,
      }
    } catch (err: any) {
      console.warn('[PCP-INVENTORY] Falha ao consultar saldo SAP via RFC:', err)
      return {
        success: false,
        saldo: null,
        code: err?.status === 503 ? err?.data?.code || 'SAP_RFC_NOT_CONFIGURED' : 'SAP_RFC_ERROR',
        message: err?.data?.message || 'Não foi possível consultar o saldo no SAP.',
      }
    }
  }

  /**
   * Conclui o inventário da demanda com snapshot imutável de saldo SAP e 6 indicadores
   */
  async concludeDemand(
    demandId: string,
    conclusionData?: {
      sap_balance?: number | null
      sap_status?: 'SINCRONIZADO' | 'INDISPONIVEL' | 'CONCILIADO'
      divergence_demand?: number
      divergence_sap?: number | null
      divergence_pct?: number
    },
  ): Promise<InventoryDemand> {
    const demand = await this.getDemandById(demandId)
    if (!demand) throw new Error('Demanda não encontrada.')

    const authUser = pb.authStore.record || pb.authStore.model
    const userName = authUser?.name || 'Programador PCP'
    const userRole = (authUser as any)?.role || 'PCP_PROGRAMMER'
    const nowIso = new Date().toISOString()
    const nowStr = formatPtBrDateTime()

    await this.recalculateDemandTotals(demandId)
    const refreshed = (await this.getDemandById(demandId)) || demand

    const totalInventoried = refreshed.total_pieces_inventoried || 0
    const demandQty = refreshed.total_pieces_required || 0
    const divergenceDemand =
      conclusionData?.divergence_demand !== undefined
        ? conclusionData.divergence_demand
        : totalInventoried - demandQty

    const divPct =
      conclusionData?.divergence_pct !== undefined
        ? conclusionData.divergence_pct
        : demandQty > 0
          ? ((totalInventoried - demandQty) / demandQty) * 100
          : 0

    const sapBalance = conclusionData?.sap_balance !== undefined ? conclusionData.sap_balance : null
    const divergenceSap =
      conclusionData?.divergence_sap !== undefined
        ? conclusionData.divergence_sap
        : sapBalance !== null
          ? totalInventoried - sapBalance
          : null

    const sapStatus =
      conclusionData?.sap_status || (sapBalance !== null ? 'CONCILIADO' : 'INDISPONIVEL')

    const updatePayload: Record<string, any> = {
      status: 'Inventário concluído',
      concluded_at: nowIso,
      concluded_by: userName,
      divergence_pieces: divergenceDemand,
      divergence_pct: Number(divPct.toFixed(2)),
      sap_snapshot_balance: sapBalance !== null ? sapBalance : undefined,
      sap_snapshot_at: nowIso,
      sap_snapshot_status: sapStatus,
      sap_snapshot_divergence: divergenceSap !== null ? divergenceSap : undefined,
    }

    const updated = await pb
      .collection('pcp_mp_inventory_demands')
      .update<InventoryDemand>(demandId, updatePayload)

    // Grava snapshot imutável no Histórico e Rastreabilidade
    try {
      await pb.collection('pcp_mp_inventory_history').create({
        demand_id: demand.id,
        inventory_order_id: demand.id,
        control_number: demand.control_number,
        event_type: 'INVENTARIO_CONCLUIDO',
        user_name: userName,
        user_role: userRole,
        summary: `Inventário concluído. Indicadores: Demanda: ${demandQty} | Saldo SAP: ${sapBalance !== null ? sapBalance : 'Indisponível'} | Inventariado: ${totalInventoried} | Div. Demanda: ${divergenceDemand} | Div. SAP: ${divergenceSap !== null ? divergenceSap : '—'} | Div. %: ${divPct.toFixed(2)}%.`,
        details: {
          indicadores: {
            demanda: demandQty,
            saldo_sap: sapBalance,
            inventariado: totalInventoried,
            divergencia_demanda: divergenceDemand,
            divergencia_sap: divergenceSap,
            divergencia_pct: Number(divPct.toFixed(2)),
          },
          snapshot_sap: {
            saldo: sapBalance,
            status: sapStatus,
            data_hora: nowIso,
          },
          usuario_conclusao: userName,
          data_hora_conclusao: nowIso,
        },
        timestamp: nowIso,
      })
    } catch (e) {
      console.warn('[PCP-INVENTORY] Erro ao gravar histórico de conclusão:', e)
    }

    // Grava trilha em pcp_audit_logs
    try {
      await pb.collection('pcp_audit_logs').create({
        module: 'INVENTARIO_MP',
        action: 'CONCLUDE_INVENTORY_DEMAND',
        event_type: 'SCHEDULE_ACTION',
        user_id: authUser?.id || '',
        user_name: userName,
        user_role: userRole,
        record_id: demand.id,
        resource: 'pcp_mp_inventory_demands',
        resource_id: demand.id,
        outcome: 'SUCCESS',
        company: demand.company,
        details: {
          control_number: demand.control_number,
          demanda: demandQty,
          saldo_sap: sapBalance,
          inventariado: totalInventoried,
          divergencia_demanda: divergenceDemand,
          divergencia_sap: divergenceSap,
          divergencia_pct: Number(divPct.toFixed(2)),
          sap_snapshot_status: sapStatus,
          concluded_at: nowIso,
          concluded_by: userName,
        },
      })
    } catch (auditErr) {
      console.warn('[PCP-INVENTORY] Erro ao gravar pcp_audit_logs:', auditErr)
    }

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

    try {
      await pb.collection('pcp_mp_inventory_history').create({
        demand_id: demand.id,
        inventory_order_id: demand.id,
        control_number: demand.control_number,
        event_type: 'DEMANDA_CANCELADA',
        user_name: userName,
        user_role: (authUser as any)?.role || '',
        summary: `Demanda cancelada por ${userName}. Motivo: ${reason}`,
        details: { reason, previous_status: demand.status },
        timestamp: new Date().toISOString(),
      })
      await pb.collection('pcp_audit_logs').create({
        module: 'INVENTARIO_MP',
        action: 'CANCEL_DEMAND',
        user_id: authUser?.id || '',
        user_name: userName,
        user_role: (authUser as any)?.role || '',
        record_id: demand.id,
        resource: 'pcp_mp_inventory_demands',
        resource_id: demand.id,
        outcome: 'SUCCESS',
        reason,
        details: { control_number: demand.control_number, reason },
      })
    } catch {
      /* intentionally ignored */
    }

    return updated
  }
}

export const pcpInventoryDemandsService = new PcpInventoryDemandsService()
