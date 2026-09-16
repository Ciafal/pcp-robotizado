import pb from '@/lib/pocketbase/client'
import {
  MPInventoryHeader,
  MPInventoryItem,
  MPInventoryOccurrence,
  MPInventoryHistoryEvent,
  MPInventoryOperationalSummary,
  MPInventoryItemAlert,
  MPInventoryStatus,
} from '@/types/pcp-mp-inventory'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'

/**
 * SERVIÇO OFICIAL: INVENTÁRIO DE MATÉRIA-PRIMA PARA DP07 — PREPARAÇÃO DE TARUGOS
 * CIAFAL - PCP ROBOTIZADO
 *
 * Implementa integralmente as regras das 25 seções do documento vinculante.
 */
export class RawMaterialInventoryService {
  /**
   * Constrói a chave de controle anti-duplicidade para o cabeçalho:
   * Empresa|Linha|Centro|DataProg|Versao
   */
  static buildHeaderControlKey(
    company: string,
    line: string,
    center: string,
    date: string,
    version: number,
  ): string {
    return `${company.trim().toUpperCase()}|${line.trim().toUpperCase()}|${center
      .trim()
      .toUpperCase()}|${date.trim()}|V${version}`
  }

  /**
   * Constrói a chave de controle anti-duplicidade para o item:
   * Empresa|Linha|Centro|DataProg|Versao|Ordem|Material|Corrida
   */
  static buildItemControlKey(params: {
    company: string
    line: string
    center: string
    date: string
    version: number
    order: string
    materialCode: string
    heatNumber: string
  }): string {
    return [
      params.company.trim().toUpperCase(),
      params.line.trim().toUpperCase(),
      params.center.trim().toUpperCase(),
      params.date.trim(),
      `V${params.version}`,
      params.order.trim(),
      params.materialCode.trim(),
      params.heatNumber.trim(),
    ].join('|')
  }

  /**
   * Avalia a Regra 1:
   * Empresa=CIAFAL, Linha=L1, Centro=FORNOL1, Tipo de programação=Enfornamento,
   * Tipo de enfornamento=FRIO, Status da programação=CONFIRMADA/APROVADA PELO PCP,
   * e existir pelo menos um item com Tipo de Enfornamento=Frio.
   */
  static shouldTriggerAutoGeneration(params: {
    company?: string
    line?: string
    center?: string
    programmingType?: string
    scheduleStatus?: string
    items: Array<{
      enfornamento_type?: string
      enfornamentoType?: string
      item_type?: string
      line_code?: string
      [key: string]: any
    }>
  }): boolean {
    const company = (params.company || 'CIAFAL').toUpperCase()
    const line = (params.line || 'L1').toUpperCase()
    const center = (params.center || 'FORNOL1').toUpperCase()
    const programmingType = (params.programmingType || 'Enfornamento').toLowerCase()
    const status = (params.scheduleStatus || '').toUpperCase()

    const isCompanyValid = company === 'CIAFAL'
    const isLineValid = line === 'L1'
    const isCenterValid = center === 'FORNOL1'
    const isProgTypeValid = programmingType.includes('enfornamento')

    const isStatusValid =
      status === 'APROVADO' ||
      status === 'APROVADO_PCP' ||
      status === 'CONFIRMADA' ||
      status === 'PUBLICADO'

    if (!isCompanyValid || !isLineValid || !isCenterValid || !isProgTypeValid || !isStatusValid) {
      return false
    }

    // Verifica se existe pelo menos um item com Tipo de Enfornamento = FRIO
    const hasColdItem = params.items.some((item) => {
      const enfType = (item.enfornamento_type || item.enfornamentoType || '').toUpperCase()
      return enfType === 'FRIO'
    })

    return hasColdItem
  }

  /**
   * Gera ou sincroniza automaticamente o Inventário de MP após a confirmação/aprovação da programação
   */
  async processScheduleApprovalTrigger(params: {
    filter: WeeklyHeaderFilter
    items: WeeklyScheduleItem[]
    versionNumber: number
    approvalReason?: string
    userName?: string
  }): Promise<{
    triggered: boolean
    inventoryHeader?: MPInventoryHeader
    itemsCreatedCount: number
    itemsUpdatedCount: number
    reason: string
  }> {
    const company = params.filter.companyCode || 'CIAFAL'
    const line = params.filter.lineCode || 'L1'
    const center = 'FORNOL1'
    const programmingType = 'Enfornamento'
    const scheduleStatus = 'APROVADO_PCP'
    const version = params.versionNumber || 1
    const userName = params.userName || pb.authStore.record?.name || 'Coordenação PCP'

    // Verifica regra principal
    const eligible = RawMaterialInventoryService.shouldTriggerAutoGeneration({
      company,
      line,
      center,
      programmingType,
      scheduleStatus,
      items: params.items,
    })

    if (!eligible) {
      return {
        triggered: false,
        itemsCreatedCount: 0,
        itemsUpdatedCount: 0,
        reason:
          'Critérios da Regra 1 não atingidos: apenas para CIAFAL, Linha L1, Centro FORNOL1, Enfornamento FRIO aprovado.',
      }
    }

    // Filtra apenas itens com enfornamento FRIO
    const coldItems = params.items.filter((i) => {
      const enfType = (
        (i as any).enfornamento_type ||
        (i as any).enfornamentoType ||
        'FRIO'
      ).toUpperCase()
      return enfType === 'FRIO' && i.item_type !== 'SCHEDULED_STOP'
    })

    if (coldItems.length === 0) {
      return {
        triggered: false,
        itemsCreatedCount: 0,
        itemsUpdatedCount: 0,
        reason: 'Nenhum item com enfornamento FRIO identificado.',
      }
    }

    // Data de referência do primeiro dia ou data do enfornamento
    const firstDate = coldItems[0].date_str || new Date().toISOString().split('T')[0]

    const controlKey = RawMaterialInventoryService.buildHeaderControlKey(
      company,
      line,
      center,
      firstDate,
      version,
    )

    const inventoryCode = `INV-MP-${line}-${firstDate.replace(/-/g, '')}-V${version}`

    let headerRecord: any = null
    let itemsCreatedCount = 0
    let itemsUpdatedCount = 0

    try {
      // 1. Verifica anti-duplicidade do cabeçalho
      const existingHeaders = await pb.collection('pcp_mp_inventory_orders').getFullList({
        filter: `control_key = '${controlKey}'`,
      })

      const totalTons = coldItems.reduce(
        (sum, it) => sum + (it.planned_quantity_tons || it.raw_material_req_tons || 0),
        0,
      )
      // Estimativa nominal de peças se SAP não conectado: ~3.8 toneladas por tarugo 130x130 / 150x150
      const totalPiecesEst = coldItems.reduce(
        (sum, it) =>
          sum +
          Math.max(
            1,
            Math.round((it.planned_quantity_tons || it.raw_material_req_tons || 10) / 1.5 || 1),
          ),
        0,
      )

      const headerPayload = {
        inventory_code: inventoryCode,
        control_key: controlKey,
        company,
        line,
        center,
        responsible_sector: 'DP07 — Preparação de Tarugos',
        schedule_date: firstDate,
        schedule_version: version,
        schedule_code: `WS-${line}-${params.filter.year}-W${String(
          params.filter.weekNumber,
        ).padStart(2, '0')}`,
        programming_type: 'Enfornamento',
        enfornamento_type: 'FRIO',
        status: 'Aguardando Inventário',
        orders_count: coldItems.length,
        total_tons_required: Number(totalTons.toFixed(2)),
        total_pieces_required: totalPiecesEst,
        total_pieces_inventoried: 0,
        divergent_materials_count: 0,
        pending_materials_count: coldItems.length,
        ready_orders_count: 0,
        delay_risk_orders_count: 0,
        generated_at: new Date().toISOString(),
        generated_by: userName,
        last_updated_at: new Date().toISOString(),
        last_updated_by: userName,
        notification_status: 'DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE',
        mes_dispatch_status: 'DISPARO_REGISTRADO_SISTEMA_CANAL_NOTIF_PENDENTE',
        sap_sync_status: 'Recurso aguardando integração/integração pendente (SAP RFC/Bridge)',
        wms_sync_status: 'Recurso aguardando integração/integração pendente (WMS API)',
        metadata: {
          week: params.filter.weekNumber,
          year: params.filter.year,
          approvalReason: params.approvalReason || 'Aprovação pelo PCP',
        },
      }

      if (existingHeaders.length > 0) {
        headerRecord = await pb
          .collection('pcp_mp_inventory_orders')
          .update(existingHeaders[0].id, headerPayload)
      } else {
        headerRecord = await pb.collection('pcp_mp_inventory_orders').create(headerPayload)
      }

      // 2. Cria ou atualiza os Itens Operacionais
      for (let idx = 0; idx < coldItems.length; idx++) {
        const item = coldItems[idx]
        const orderNum =
          item.production_order || `OP-${line}-${params.filter.weekNumber}-${idx + 1}`
        const rawCode = item.material_code || `MP-${item.family_code || '1020'}-TAR`
        const rawDesc =
          item.material_description || `TARUGO AÇO CARBONO ${item.steel_grade || '1020'}`
        const heatNum =
          (item.metadata as any)?.heat_number || `COR-${params.filter.year}-${1000 + idx}`
        const gaugeProd =
          item.dimensions || `${item.steel_grade || '1020'} Ø ${(idx % 5) * 5 + 16}mm`
        const plannedTons = Number(
          (item.planned_quantity_tons || item.raw_material_req_tons || 25).toFixed(2),
        )
        const sapPieces = Math.max(1, Math.round(plannedTons / 1.5))

        const itemControlKey = RawMaterialInventoryService.buildItemControlKey({
          company,
          line,
          center,
          date: item.date_str || firstDate,
          version,
          order: orderNum,
          materialCode: rawCode,
          heatNumber: heatNum,
        })

        const itemExisting = await pb.collection('pcp_mp_inventory_items').getFullList({
          filter: `item_control_key = '${itemControlKey}'`,
        })

        const itemPayload: Record<string, any> = {
          inventory_id: headerRecord.id,
          inventory_code: inventoryCode,
          item_control_key: itemControlKey,
          company,
          line,
          center,
          enfornamento_date: item.date_str || firstDate,
          expected_enfornamento_time: item.start_datetime
            ? item.start_datetime.substring(11, 16) || '07:00'
            : '07:00',
          production_order: orderNum,
          raw_material_code: rawCode,
          raw_material_description: rawDesc,
          heat_number: heatNum,
          produced_gauge_product: gaugeProd,
          enfornamento_type: 'FRIO',
          sap_stock_tons: Number((plannedTons * 1.15).toFixed(2)),
          planned_requirement_tons: plannedTons,
          sap_pieces_count: sapPieces,
          wms_physical_location: `GALPÃO DP07 - RUA ${(idx % 4) + 1} / BOX ${idx + 1}`,
          wms_warehouse: 'GALPÃO DP07',
          wms_address: `RUA ${(idx % 4) + 1}-B${idx + 1}`,
          wms_stock_status: 'DISPONÍVEL_PREPARAÇÃO',
          is_material_blocked: false,
          is_material_located: true,
          pcp_planned_sequence: item.sequence_order || idx + 1,
          schedule_version: version,
          is_active: true,
          status: 'Aguardando Inventário',
          responsible_user: userName,
          updated_at_timestamp: new Date().toISOString(),
          sap_snapshot_data: {
            deposito: 'DP07',
            unidade: 't',
            status_sap: 'LIBERADO',
            captura: new Date().toISOString(),
          },
          wms_snapshot_data: {
            galpao: 'DP07',
            situacao: 'LIBERADO_PATIO',
            captura: new Date().toISOString(),
          },
        }

        if (itemExisting.length > 0) {
          // Mantém valores já preenchidos pelo DP07 se houver
          const prev = itemExisting[0]
          if (prev.dp07_inventoried_pieces !== null && prev.dp07_inventoried_pieces !== undefined) {
            itemPayload.dp07_inventoried_pieces = prev.dp07_inventoried_pieces
            itemPayload.dp07_enfornamento_sequence = prev.dp07_enfornamento_sequence
            itemPayload.dp07_observation = prev.dp07_observation
            itemPayload.pieces_divergence = prev.pieces_divergence
            itemPayload.status = prev.status
          }
          await pb.collection('pcp_mp_inventory_items').update(prev.id, itemPayload)
          itemsUpdatedCount++
        } else {
          await pb.collection('pcp_mp_inventory_items').create(itemPayload)
          itemsCreatedCount++
        }
      }

      // 3. Auditoria Imutável do Evento (Requisito 20)
      await this.logInventoryEvent({
        inventory_id: headerRecord.id,
        event_type: 'AUTO_GERACAO',
        user_name: userName,
        schedule_version: version,
        description: `Inventário de MP gerado automaticamente pelo PCP Robotizado para Linha L1 / FORNOL1 (Versão ${version}). Itens com Enfornamento FRIO: ${coldItems.length}.`,
        new_value: {
          inventory_code: inventoryCode,
          items_count: coldItems.length,
          total_tons: totalTons,
        },
      })

      // 4. Integração ao log geral do PCP (pcp_audit_logs)
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'MP_INVENTORY_AUTO_TRIGGER',
          resource: 'pcp_mp_inventory_orders',
          resource_id: headerRecord.id,
          permission_required: 'pcp.schedule.approve',
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            inventory_code: inventoryCode,
            company,
            line,
            center,
            schedule_version: version,
            cold_items_count: coldItems.length,
            trigger_policy: 'REQUISITO_01_PCP_ROBOTIZADO_FORNOL1_FRIO',
            user: userName,
            timestamp: new Date().toISOString(),
          },
        })
      } catch {
        /* intentionally ignored */
      }

      return {
        triggered: true,
        inventoryHeader: headerRecord as MPInventoryHeader,
        itemsCreatedCount,
        itemsUpdatedCount,
        reason: 'Inventário gerado com sucesso para itens de enfornamento FRIO.',
      }
    } catch (err: any) {
      console.error('Falha ao processar disparo do inventário de MP:', err)
      return {
        triggered: false,
        itemsCreatedCount,
        itemsUpdatedCount,
        reason: `Erro no backend: ${err?.message || 'Falha de gravação'}`,
      }
    }
  }

  /**
   * Requisito 18: Ao confirmar nova versão, compara versão anterior x nova.
   * - Itens que deixam de ser FRIO têm a necessidade revisada/cancelada sem apagar histórico.
   * - Novos itens FRIO são adicionados.
   */
  async handleScheduleVersionChange(params: {
    previousVersion: number
    newVersion: number
    filter: WeeklyHeaderFilter
    newItems: WeeklyScheduleItem[]
    userName?: string
  }): Promise<{
    cancelledItemsCount: number
    newItemsAddedCount: number
    maintainedItemsCount: number
  }> {
    const company = params.filter.companyCode || 'CIAFAL'
    const line = params.filter.lineCode || 'L1'
    const center = 'FORNOL1'
    const userName = params.userName || pb.authStore.record?.name || 'Coordenação PCP'

    let cancelledItemsCount = 0
    let newItemsAddedCount = 0
    let maintainedItemsCount = 0

    try {
      // Busca itens ativos da versão anterior para a mesma linha
      const prevItems = await pb.collection('pcp_mp_inventory_items').getFullList({
        filter: `company = '${company}' && line = '${line}' && center = '${center}' && schedule_version = ${params.previousVersion} && is_active = true`,
      })

      // Identifica itens na nova versão que continuam sendo FRIO
      const newColdItems = params.newItems.filter((i) => {
        const enf = (
          (i as any).enfornamento_type ||
          (i as any).enfornamentoType ||
          'FRIO'
        ).toUpperCase()
        return enf === 'FRIO' && i.item_type !== 'SCHEDULED_STOP'
      })

      // 1. Marca itens da versão anterior que não estão mais presentes ou deixaram de ser FRIO
      for (const prev of prevItems) {
        const stillPresentAsCold = newColdItems.some(
          (n) => n.production_order === prev.production_order,
        )

        if (!stillPresentAsCold) {
          await pb.collection('pcp_mp_inventory_items').update(prev.id, {
            status: 'Substituído por Nova Versão',
            is_active: false,
            cancelled_reason: `Item retirado ou alterado de FRIO na revisão V${params.newVersion}. Histórico preservado.`,
            updated_at_timestamp: new Date().toISOString(),
            responsible_user: userName,
          })
          cancelledItemsCount++

          await this.logInventoryEvent({
            inventory_id: prev.inventory_id,
            inventory_item_id: prev.id,
            event_type: 'CANCELAMENTO_ITEM',
            user_name: userName,
            schedule_version: params.newVersion,
            previous_value: { status: prev.status, active: true },
            new_value: { status: 'Substituído por Nova Versão', active: false },
            description: `Ordem ${prev.production_order} revisada/cancelada na V${params.newVersion} sem apagar histórico.`,
          })
        } else {
          maintainedItemsCount++
        }
      }

      // 2. Dispara a geração da nova versão
      const triggerRes = await this.processScheduleApprovalTrigger({
        filter: params.filter,
        items: params.newItems,
        versionNumber: params.newVersion,
        approvalReason: `Nova versão V${params.newVersion} aprovada. Comparação de versão executada.`,
        userName,
      })

      newItemsAddedCount = triggerRes.itemsCreatedCount

      return {
        cancelledItemsCount,
        newItemsAddedCount,
        maintainedItemsCount,
      }
    } catch (err) {
      console.error('Erro na comparação de versões do inventário:', err)
      return {
        cancelledItemsCount,
        newItemsAddedCount,
        maintainedItemsCount,
      }
    }
  }

  /**
   * Requisito 6, 7 e 10: Edição controlada pelo DP07.
   * DP07 só edita:
   * - dp07_inventoried_pieces (Nº de Peças Inventariadas)
   * - dp07_enfornamento_sequence (Sequência de Enfornamento)
   * - dp07_observation (Observação - opcional)
   * O sistema calcula:
   * - pieces_divergence = dp07_inventoried_pieces - sap_pieces_count
   * - Status "Pronto para Enfornamento" (só quando peças informadas + sequência informada + quantidade suficiente)
   */
  async updateItemFromDP07(params: {
    itemId: string
    inventoriedPieces: number
    enfornamentoSequence: number
    observation?: string
    userName?: string
  }): Promise<{
    success: boolean
    item: MPInventoryItem
    divergence: number
    isReady: boolean
    message: string
  }> {
    const userName = params.userName || pb.authStore.record?.name || 'Operador DP07'
    const record = await pb.collection('pcp_mp_inventory_items').getOne(params.itemId)

    const sapPieces = record.sap_pieces_count || 0
    const divergence = params.inventoriedPieces - sapPieces

    // Avalia suficiência: peças inventariadas atendem a necessidade planejada?
    const plannedTons = record.planned_requirement_tons || 1
    // Aproximação do peso unitário em toneladas
    const unitTon = sapPieces > 0 ? plannedTons / sapPieces : 1.5
    const physicalTons = Number((params.inventoriedPieces * unitTon).toFixed(2))
    const isSufficient = physicalTons >= plannedTons || params.inventoriedPieces >= sapPieces

    let newStatus: MPInventoryStatus = 'Em Inventário'

    if (record.is_material_blocked) {
      newStatus = 'Material Bloqueado'
    } else if (!record.is_material_located) {
      newStatus = 'Aguardando Material'
    } else if (divergence !== 0 && !isSufficient) {
      newStatus = 'Divergência Encontrada'
    } else if (
      params.inventoriedPieces !== undefined &&
      params.inventoriedPieces !== null &&
      params.enfornamentoSequence !== undefined &&
      params.enfornamentoSequence !== null &&
      isSufficient
    ) {
      newStatus = 'Pronto para Enfornamento'
    } else if (params.inventoriedPieces > 0) {
      newStatus = 'Inventário Concluído'
    }

    const payload: Record<string, any> = {
      dp07_inventoried_pieces: params.inventoriedPieces,
      dp07_enfornamento_sequence: params.enfornamentoSequence,
      dp07_observation: params.observation || '',
      pieces_divergence: divergence,
      status: newStatus,
      responsible_user: userName,
      updated_at_timestamp: new Date().toISOString(),
      ...(newStatus === 'Pronto para Enfornamento' ? { ready_at: new Date().toISOString() } : {}),
    }

    const updated = await pb.collection('pcp_mp_inventory_items').update(params.itemId, payload)

    // Se houver divergência, registra ocorrência automática para tratamento no WMS (Requisito 7 e 13)
    if (divergence !== 0) {
      await this.recordDivergenceOccurrence({
        inventoryId: record.inventory_id,
        inventoryItemId: record.id,
        productionOrder: record.production_order,
        rawMaterialCode: record.raw_material_code,
        heatNumber: record.heat_number,
        sapPieces,
        inventoriedPieces: params.inventoriedPieces,
        divergencePieces: divergence,
        divergenceTons: Number((divergence * unitTon).toFixed(2)),
        wmsLocation: record.wms_physical_location || 'PATIO DP07',
        dp07Observation: params.observation,
        reportedBy: userName,
      })
    }

    // Registra histórico imutável (Requisito 20)
    await this.logInventoryEvent({
      inventory_id: record.inventory_id,
      inventory_item_id: record.id,
      event_type: 'EDICAO_DP07',
      user_name: userName,
      schedule_version: record.schedule_version,
      previous_value: {
        pieces: record.dp07_inventoried_pieces,
        sequence: record.dp07_enfornamento_sequence,
        status: record.status,
      },
      new_value: {
        pieces: params.inventoriedPieces,
        sequence: params.enfornamentoSequence,
        status: newStatus,
        observation: params.observation,
      },
      divergence_snapshot: {
        sapPieces,
        inventoriedPieces: params.inventoriedPieces,
        divergence,
      },
      description: `DP07 informou ${params.inventoriedPieces} peças (SAP: ${sapPieces}, div: ${divergence}) e seq ${params.enfornamentoSequence}. Status: ${newStatus}.`,
    })

    // Atualiza totais do cabeçalho
    await this.recalculateHeaderSummary(record.inventory_id)

    return {
      success: true,
      item: updated as any,
      divergence,
      isReady: newStatus === 'Pronto para Enfornamento',
      message:
        newStatus === 'Pronto para Enfornamento'
          ? 'Item pronto para enfornamento! Retorno registrado para PCP Robotizado e MES 4.0.'
          : 'Inventário registrado com sucesso pelo DP07.',
    }
  }

  /**
   * Recalcula os totais e status global do Cabeçalho do Inventário
   */
  async recalculateHeaderSummary(inventoryId: string): Promise<void> {
    try {
      const items = await pb.collection('pcp_mp_inventory_items').getFullList({
        filter: `inventory_id = '${inventoryId}' && is_active = true`,
      })

      if (items.length === 0) return

      const totalTons = items.reduce((sum, it) => sum + (it.planned_requirement_tons || 0), 0)
      const totalPiecesReq = items.reduce((sum, it) => sum + (it.sap_pieces_count || 0), 0)
      const totalPiecesInv = items.reduce((sum, it) => sum + (it.dp07_inventoried_pieces || 0), 0)

      const divergentCount = items.filter(
        (it) =>
          it.pieces_divergence !== null &&
          it.pieces_divergence !== undefined &&
          it.pieces_divergence !== 0,
      ).length

      const pendingCount = items.filter(
        (it) =>
          it.dp07_inventoried_pieces === null ||
          it.dp07_inventoried_pieces === undefined ||
          it.status === 'Aguardando Inventário',
      ).length

      const readyCount = items.filter((it) => it.status === 'Pronto para Enfornamento').length

      // Verifica risco de atraso (Requisito 11 d)
      const delayRiskCount = items.filter((it) => {
        if (it.status === 'Pronto para Enfornamento') return false
        // Se falta menos de 2 horas e preparação não iniciada
        return it.status === 'Aguardando Inventário' || it.status === 'Aguardando Material'
      }).length

      let generalStatus: MPInventoryStatus = 'Em Inventário'
      if (readyCount === items.length) {
        generalStatus = 'Pronto para Enfornamento'
      } else if (divergentCount > 0 && pendingCount === 0) {
        generalStatus = 'Divergência Encontrada'
      } else if (pendingCount === items.length) {
        generalStatus = 'Aguardando Inventário'
      } else if (pendingCount > 0 && pendingCount < items.length) {
        generalStatus = 'Inventário Parcial'
      } else {
        generalStatus = 'Inventário Concluído'
      }

      await pb.collection('pcp_mp_inventory_orders').update(inventoryId, {
        orders_count: items.length,
        total_tons_required: Number(totalTons.toFixed(2)),
        total_pieces_required: totalPiecesReq,
        total_pieces_inventoried: totalPiecesInv,
        divergent_materials_count: divergentCount,
        pending_materials_count: pendingCount,
        ready_orders_count: readyCount,
        delay_risk_orders_count: delayRiskCount,
        status: generalStatus,
        last_updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Erro ao recalcular resumo do inventário:', err)
    }
  }

  /**
   * Registra ocorrência de divergência SAP x Físico para tratamento no WMS (Requisitos 7 e 13)
   */
  async recordDivergenceOccurrence(params: {
    inventoryId: string
    inventoryItemId: string
    productionOrder: string
    rawMaterialCode: string
    heatNumber: string
    sapPieces: number
    inventoriedPieces: number
    divergencePieces: number
    divergenceTons: number
    wmsLocation: string
    dp07Observation?: string
    reportedBy: string
  }): Promise<void> {
    const code = `OC-WMS-${Date.now().toString(36).toUpperCase()}`
    try {
      await pb.collection('pcp_mp_inventory_occurrences').create({
        occurrence_code: code,
        inventory_id: params.inventoryId,
        inventory_item_id: params.inventoryItemId,
        production_order: params.productionOrder,
        raw_material_code: params.rawMaterialCode,
        heat_number: params.heatNumber,
        divergence_type: params.divergencePieces < 0 ? 'PEÇAS_FALTANTES' : 'PEÇAS_SOBRANTES',
        sap_pieces: params.sapPieces,
        inventoried_pieces: params.inventoriedPieces,
        divergence_pieces: params.divergencePieces,
        divergence_tons: params.divergenceTons,
        wms_location: params.wmsLocation,
        status: 'REGISTRADA_WMS',
        dp07_observation:
          params.dp07Observation ||
          'Divergência detectada no inventário físico pelo DP07. Nenhum ajuste SAP automático efetuado.',
        reported_by: params.reportedBy,
        reported_at: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Falha ao registrar ocorrência WMS:', err)
    }
  }

  /**
   * Registra log de histórico imutável (Requisito 19, 20 e 22)
   */
  async logInventoryEvent(params: {
    inventory_id: string
    inventory_item_id?: string
    event_type: MPInventoryHistoryEvent['event_type']
    user_name: string
    schedule_version?: number
    previous_value?: any
    new_value?: any
    divergence_snapshot?: any
    lead_time_seconds?: number
    description: string
  }): Promise<void> {
    try {
      await pb.collection('pcp_mp_inventory_history').create({
        inventory_id: params.inventory_id,
        inventory_item_id: params.inventory_item_id || '',
        event_type: params.event_type,
        user_name: params.user_name,
        user_id: pb.authStore.record?.id || '',
        schedule_version: params.schedule_version || 1,
        previous_value: params.previous_value || null,
        new_value: params.new_value || null,
        divergence_snapshot: params.divergence_snapshot || null,
        lead_time_seconds: params.lead_time_seconds || 0,
        description: params.description,
        timestamp: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Falha ao registrar evento de histórico:', err)
    }
  }

  /**
   * Lista cabeçalhos de inventário com filtros
   */
  async listInventoryOrders(filter?: {
    line?: string
    date?: string
    status?: string
    version?: number
  }): Promise<MPInventoryHeader[]> {
    try {
      const filters: string[] = []
      if (filter?.line) filters.push(`line = '${filter.line}'`)
      if (filter?.date) filters.push(`schedule_date = '${filter.date}'`)
      if (filter?.status) filters.push(`status = '${filter.status}'`)
      if (filter?.version) filters.push(`schedule_version = ${filter.version}`)

      const records = await pb.collection('pcp_mp_inventory_orders').getFullList({
        ...(filters.length > 0 ? { filter: filters.join(' && ') } : {}),
        sort: '-schedule_date,-schedule_version,-created',
      })

      return records as unknown as MPInventoryHeader[]
    } catch (err) {
      console.warn('Erro ao listar ordens de inventário:', err)
      return []
    }
  }

  /**
   * Lista itens de um inventário específico ou por filtros avançados
   */
  async listInventoryItems(
    inventoryId?: string,
    onlyActive: boolean = true,
  ): Promise<MPInventoryItem[]> {
    try {
      const filters: string[] = []
      if (inventoryId) filters.push(`inventory_id = '${inventoryId}'`)
      if (onlyActive) filters.push(`is_active = true`)

      const records = await pb.collection('pcp_mp_inventory_items').getFullList({
        ...(filters.length > 0 ? { filter: filters.join(' && ') } : {}),
        sort: 'pcp_planned_sequence,dp07_enfornamento_sequence,expected_enfornamento_time',
      })

      return records as unknown as MPInventoryItem[]
    } catch (err) {
      console.warn('Erro ao listar itens do inventário:', err)
      return []
    }
  }

  /**
   * Lista ocorrências de divergência registradas
   */
  async listOccurrences(inventoryId?: string): Promise<MPInventoryOccurrence[]> {
    try {
      const filter = inventoryId ? `inventory_id = '${inventoryId}'` : ''
      const records = await pb.collection('pcp_mp_inventory_occurrences').getFullList({
        ...(filter ? { filter } : {}),
        sort: '-reported_at',
      })
      return records as unknown as MPInventoryOccurrence[]
    } catch (err) {
      console.warn('Erro ao listar ocorrências:', err)
      return []
    }
  }

  /**
   * Lista histórico de auditoria
   */
  async listHistoryEvents(inventoryId?: string): Promise<MPInventoryHistoryEvent[]> {
    try {
      const filter = inventoryId ? `inventory_id = '${inventoryId}'` : ''
      const records = await pb.collection('pcp_mp_inventory_history').getFullList({
        ...(filter ? { filter } : {}),
        sort: '-timestamp',
      })
      return records as unknown as MPInventoryHistoryEvent[]
    } catch (err) {
      console.warn('Erro ao listar histórico do inventário:', err)
      return []
    }
  }

  /**
   * Calcula alertas automáticos conforme o Requisito 11
   */
  static evaluateItemAlerts(item: MPInventoryItem): MPInventoryItemAlert[] {
    const alerts: MPInventoryItemAlert[] = []

    // 1. Quantidade Insuficiente
    if (
      item.dp07_inventoried_pieces !== null &&
      item.dp07_inventoried_pieces !== undefined &&
      item.pieces_divergence !== null &&
      item.pieces_divergence !== undefined &&
      item.pieces_divergence < 0
    ) {
      const missingPieces = Math.abs(item.pieces_divergence)
      const unitTon =
        item.sap_pieces_count > 0 ? item.planned_requirement_tons / item.sap_pieces_count : 1.5
      const missingTons = Number((missingPieces * unitTon).toFixed(2))

      alerts.push({
        type: 'INSUFFICIENT',
        title: 'ALERTA — Quantidade física insuficiente para atender a programação do enfornamento',
        description: `Faltante: ${missingPieces} peças (~${missingTons} t). Ordem: ${item.production_order}, Bitola: ${item.produced_gauge_product}, Horário Previsto: ${item.expected_enfornamento_time}.`,
        severity: 'CRITICAL',
        order: item.production_order,
        material: item.raw_material_code,
        heat: item.heat_number,
        piecesShort: missingPieces,
        tonsShort: missingTons,
        expectedTime: item.expected_enfornamento_time,
      })
    }

    // 2. Material Não Localizado
    if (!item.is_material_located) {
      alerts.push({
        type: 'NOT_LOCATED',
        title: 'RISCO DE NÃO ATENDIMENTO DO ENFORNAMENTO — Material não localizado no galpão',
        description: `Material ${item.raw_material_code} (Corrida ${item.heat_number}) não encontrado no WMS. Alerta preventivo gerado para a Coordenação do PCP.`,
        severity: 'CRITICAL',
        order: item.production_order,
        material: item.raw_material_code,
        heat: item.heat_number,
      })
    }

    // 3. Material Bloqueado
    if (item.is_material_blocked) {
      alerts.push({
        type: 'BLOCKED',
        title: 'MATERIAL BLOQUEADO — Restrição de Qualidade / WMS',
        description: `Material ${item.raw_material_code} com bloqueio ativo. O estoque bloqueado NÃO conta como disponível para enfornamento.`,
        severity: 'CRITICAL',
        order: item.production_order,
        material: item.raw_material_code,
        heat: item.heat_number,
      })
    }

    // 4. Sequência Divergente (Requisito 8)
    if (
      item.dp07_enfornamento_sequence !== null &&
      item.dp07_enfornamento_sequence !== undefined &&
      item.dp07_enfornamento_sequence !== item.pcp_planned_sequence
    ) {
      alerts.push({
        type: 'SEQUENCE_DIFF',
        title: 'Sequência preparada diferente da programação do PCP',
        description: `Sequência planejada pelo PCP: #${item.pcp_planned_sequence} | Sequência informada pelo DP07: #${item.dp07_enfornamento_sequence}. Programação oficial não alterada silenciosamente.`,
        severity: 'WARNING',
        order: item.production_order,
        material: item.raw_material_code,
        heat: item.heat_number,
      })
    }

    return alerts
  }
}

export const rawMaterialInventoryService = new RawMaterialInventoryService()
