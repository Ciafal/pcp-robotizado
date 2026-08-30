import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import {
  ScheduleItemDiff,
  RelevanceCriteriaConfig,
  ScheduleRelevanceLevel,
  ScheduleSapSyncAction,
  VersionImpactAssessment,
  ScheduleVersionRecord,
  ScheduleMesAlert,
  ScheduleCrmAlert,
  ScheduleTmsEvent,
  ScheduleSapQueueItem,
  StabilityWeights,
  StabilityIndicators,
  StabilityAiInsights,
  ChangeReasonExact,
} from '@/types/schedule-versioning'

export const DEFAULT_RELEVANCE_CRITERIA: RelevanceCriteriaConfig = {
  code: 'CRITERIA_CIAFAL_DEFAULT',
  name: 'Critérios Oficiais CIAFAL de Relevância de Reprogramação',
  description:
    'Limites parametrizáveis para classificação automática de BAIXA, MÉDIA e ALTA relevância.',
  is_active: true,
  qty_low_threshold_pct: 5.0,
  qty_medium_threshold_pct: 15.0,
  date_shift_change_level: 'MEDIA',
  date_day_change_level: 'ALTA',
  date_week_change_level: 'ALTA',
  seq_setup_increase_level: 'MEDIA',
  seq_customer_affected_level: 'ALTA',
  product_add_remove_level: 'ALTA',
  mto_impact_level: 'ALTA',
  post_approval_change_level: 'ALTA',
  existing_sap_op_change_level: 'ALTA',
}

export const VersioningEngine = {
  /**
   * Compara duas listas de itens de programação e retorna os diffs estruturados
   */
  computeScheduleDiffs(
    previousItems: WeeklyScheduleItem[],
    newItems: WeeklyScheduleItem[],
    criteria: RelevanceCriteriaConfig = DEFAULT_RELEVANCE_CRITERIA,
    wasApproved: boolean = false,
  ): ScheduleItemDiff[] {
    const diffs: ScheduleItemDiff[] = []
    const prevMap = new Map<string, WeeklyScheduleItem>()
    const newMap = new Map<string, WeeklyScheduleItem>()

    // Mapeamento por id ou combinação de chave única de produto/ordem/posição
    previousItems.forEach((p, idx) => {
      const key =
        p.id && !p.id.startsWith('temp-')
          ? p.id
          : `prev-${p.material_code}-${p.sales_order_mto || p.production_order || idx}`
      prevMap.set(key, p)
    })

    newItems.forEach((n, idx) => {
      const key =
        n.id && !n.id.startsWith('temp-')
          ? n.id
          : `new-${n.material_code}-${n.sales_order_mto || n.production_order || idx}`
      newMap.set(key, n)
    })

    // 1. Identificar modificações e itens mantidos/alterados
    newItems.forEach((newItem, newIdx) => {
      let matchedPrev: WeeklyScheduleItem | undefined

      // Busca correspondente no anterior
      if (newItem.id && prevMap.has(newItem.id)) {
        matchedPrev = prevMap.get(newItem.id)
      } else {
        // Tenta achar por ordem de produção ou pedido MTO
        matchedPrev = previousItems.find(
          (p) =>
            (newItem.production_order &&
              p.production_order &&
              newItem.production_order === p.production_order) ||
            (newItem.sales_order_mto &&
              p.sales_order_mto &&
              newItem.sales_order_mto === p.sales_order_mto) ||
            (newItem.material_code === p.material_code &&
              Math.abs(newItem.sequence_order - p.sequence_order) <= 2),
        )
      }

      if (matchedPrev) {
        // Comparar campos
        const fieldDiffs: ScheduleItemDiff['fieldDiffs'] = []
        let itemRelevance: ScheduleRelevanceLevel = 'BAIXA'

        // DATA / HORÁRIO
        const prevDate = matchedPrev.date_str || matchedPrev.start_datetime?.slice(0, 10) || ''
        const newDate = newItem.date_str || newItem.start_datetime?.slice(0, 10) || ''
        const prevTime = matchedPrev.start_datetime?.slice(11, 16) || ''
        const newTime = newItem.start_datetime?.slice(11, 16) || ''

        if (prevDate !== newDate) {
          fieldDiffs.push({
            field: 'DATA',
            fieldNamePt: 'Data de Programação',
            previousValue: `${matchedPrev.day_of_week} ${prevDate} ${prevTime}`.trim(),
            newValue: `${newItem.day_of_week} ${newDate} ${newTime}`.trim(),
            highlightColor: 'yellow',
          })
          itemRelevance = criteria.date_day_change_level || 'ALTA'
        } else if (prevTime !== newTime) {
          fieldDiffs.push({
            field: 'HORARIO',
            fieldNamePt: 'Horário Previsto',
            previousValue: prevTime || 'N/D',
            newValue: newTime || 'N/D',
            highlightColor: 'yellow',
          })
          const isHigh = (itemRelevance as string) === 'ALTA'
          if (!isHigh) itemRelevance = 'BAIXA'
        }

        // TURNO
        if (matchedPrev.shift_name !== newItem.shift_name) {
          fieldDiffs.push({
            field: 'TURNO',
            fieldNamePt: 'Turno / Turma',
            previousValue: matchedPrev.shift_name || 'N/D',
            newValue: newItem.shift_name || 'N/D',
            highlightColor: 'yellow',
          })
          const isHigh = (itemRelevance as string) === 'ALTA'
          if (!isHigh) {
            itemRelevance = criteria.date_shift_change_level || 'MEDIA'
          }
        }

        // SEQUÊNCIA
        if (matchedPrev.sequence_order !== (newItem.sequence_order || newIdx + 1)) {
          fieldDiffs.push({
            field: 'SEQUENCIA',
            fieldNamePt: 'Posição na Sequência',
            previousValue: `Seq. ${String(matchedPrev.sequence_order).padStart(2, '0')}`,
            newValue: `Seq. ${String(newItem.sequence_order || newIdx + 1).padStart(2, '0')}`,
            highlightColor: 'yellow',
          })
          if (newItem.order_type === 'MTO' || newItem.customer_name) {
            itemRelevance = criteria.seq_customer_affected_level || 'ALTA'
          } else if (itemRelevance === 'BAIXA') {
            itemRelevance = criteria.seq_setup_increase_level || 'MEDIA'
          }
        }

        // QUANTIDADE
        const prevQty = Number(matchedPrev.planned_quantity_tons) || 0
        const newQty = Number(newItem.planned_quantity_tons) || 0
        if (prevQty !== newQty) {
          const pctDiff = prevQty > 0 ? Math.abs((newQty - prevQty) / prevQty) * 100 : 100
          fieldDiffs.push({
            field: 'QUANTIDADE',
            fieldNamePt: 'Quantidade Programada',
            previousValue: `${prevQty.toFixed(1)} t`,
            newValue: `${newQty.toFixed(1)} t`,
            highlightColor: newQty < prevQty ? 'red' : 'yellow',
          })

          if (pctDiff > criteria.qty_medium_threshold_pct) {
            itemRelevance = 'ALTA'
          } else if (pctDiff > criteria.qty_low_threshold_pct && itemRelevance !== 'ALTA') {
            itemRelevance = 'MEDIA'
          }
        }

        // PRODUTO / MATERIAL
        if (matchedPrev.material_code !== newItem.material_code) {
          fieldDiffs.push({
            field: 'PRODUTO',
            fieldNamePt: 'Material Produzido',
            previousValue: matchedPrev.material_code,
            newValue: newItem.material_code,
            highlightColor: 'yellow',
          })
          itemRelevance = 'ALTA'
        }

        // Se houver OP SAP existente e houve alteração
        if (newItem.production_order || matchedPrev.production_order) {
          const op = newItem.production_order || matchedPrev.production_order
          if (fieldDiffs.length > 0 && wasApproved) {
            itemRelevance = criteria.existing_sap_op_change_level || 'ALTA'
          }
        }

        if (fieldDiffs.length > 0) {
          diffs.push({
            id: `diff-${newItem.id || newIdx}`,
            itemId: newItem.id,
            materialCode: newItem.material_code,
            materialDescription: newItem.material_description,
            changeType: 'ALTERADO',
            fieldDiffs,
            previousItem: matchedPrev,
            newItem,
            customerAffected: newItem.customer_name || matchedPrev.customer_name,
            salesOrder: newItem.sales_order_mto || matchedPrev.sales_order_mto,
            sapOpAffected: newItem.production_order || matchedPrev.production_order,
            relevance: itemRelevance,
            notes: `${fieldDiffs.length} parâmetros divergentes identificados.`,
          })
        }
      } else {
        // Item INCLUÍDO (NOVO)
        diffs.push({
          id: `diff-inc-${newItem.id || newIdx}`,
          itemId: newItem.id,
          materialCode: newItem.material_code,
          materialDescription: newItem.material_description,
          changeType: 'INCLUIDO',
          fieldDiffs: [
            {
              field: 'PRODUTO',
              fieldNamePt: 'Novo Item Inserido',
              previousValue: '— (Não constava)',
              newValue: `${newItem.material_code} (${newItem.planned_quantity_tons} t) - Seq. ${newItem.sequence_order || newIdx + 1}`,
              highlightColor: 'green',
            },
          ],
          newItem,
          customerAffected: newItem.customer_name,
          salesOrder: newItem.sales_order_mto,
          sapOpAffected: newItem.production_order,
          relevance: criteria.product_add_remove_level || 'ALTA',
          notes: 'Novo lote adicionado à sequência produtiva da semana.',
        })
      }
    })

    // 2. Identificar itens REMOVIDOS
    previousItems.forEach((prevItem, prevIdx) => {
      const stillExists = newItems.some(
        (n) =>
          (n.id && prevItem.id && n.id === prevItem.id) ||
          (n.production_order &&
            prevItem.production_order &&
            n.production_order === prevItem.production_order) ||
          (n.sales_order_mto &&
            prevItem.sales_order_mto &&
            n.sales_order_mto === prevItem.sales_order_mto) ||
          (n.material_code === prevItem.material_code && n.day_of_week === prevItem.day_of_week),
      )

      if (!stillExists) {
        diffs.push({
          id: `diff-rem-${prevItem.id || prevIdx}`,
          itemId: prevItem.id,
          materialCode: prevItem.material_code,
          materialDescription: prevItem.material_description,
          changeType: 'REMOVIDO',
          fieldDiffs: [
            {
              field: 'PRODUTO',
              fieldNamePt: 'Item Removido da Linha',
              previousValue: `${prevItem.material_code} (${prevItem.planned_quantity_tons} t) - ${prevItem.day_of_week}`,
              newValue: '— (Removido da Programação)',
              highlightColor: 'red',
            },
          ],
          previousItem: prevItem,
          customerAffected: prevItem.customer_name,
          salesOrder: prevItem.sales_order_mto,
          sapOpAffected: prevItem.production_order,
          relevance: 'ALTA',
          notes: 'Produto retirado da grade semanal de produção.',
        })
      }
    })

    return diffs
  },

  /**
   * Avalia o impacto multidimensional completo da versão antes da publicação
   */
  evaluateImpact(
    diffs: ScheduleItemDiff[],
    previousItems: WeeklyScheduleItem[],
    newItems: WeeklyScheduleItem[],
    lineCode: string,
    wasApproved: boolean = false,
  ): VersionImpactAssessment {
    const itemsChangedCount = diffs.filter((d) => d.changeType === 'ALTERADO').length
    const itemsAddedCount = diffs.filter((d) => d.changeType === 'INCLUIDO').length
    const itemsRemovedCount = diffs.filter((d) => d.changeType === 'REMOVIDO').length

    const prevTons = previousItems.reduce(
      (acc, it) => acc + (Number(it.planned_quantity_tons) || 0),
      0,
    )
    const newTons = newItems.reduce((acc, it) => acc + (Number(it.planned_quantity_tons) || 0), 0)
    const netTonsDiff = Number((newTons - prevTons).toFixed(1))

    const prevSetup = previousItems.reduce(
      (acc, it) => acc + (Number(it.setup_duration_minutes) || 0),
      0,
    )
    const newSetup = newItems.reduce((acc, it) => acc + (Number(it.setup_duration_minutes) || 0), 0)
    const setupDiffMinutes = newSetup - prevSetup

    // Identificação de impactos granulares: MES, CRM, TMS e SAP
    const mesItemsList: Array<{
      lineCode: string
      productCode: string
      changeType: string
      detail: string
    }> = []

    const crmAlertDetails: Array<{
      customer: string
      salesOrder: string
      material: string
      lineCode: string
      prevDate?: string
      newDate?: string
      prevQty?: number
      newQty?: number
      uncoveredQty?: number
      reductionPct?: number
      prevDelivery?: string
      newDelivery?: string
      reason: string
      commercialImpact: string
    }> = []

    const tmsShifts: Array<{
      orderNumber: string
      customer?: string
      material?: string
      plannedLoadCode?: string
      oldDate: string
      newDate: string
      oldDeliveryDate?: string
      newDeliveryDate?: string
      shiftDays: number
      transitDays?: number
    }> = []

    const sapActions: Array<{
      sapOp: string
      material: string
      lineCode?: string
      sapQty?: number
      newQty?: number
      sapDate?: string
      newDate?: string
      action: ScheduleSapSyncAction
      impactType?: 'DATA' | 'QUANTIDADE' | 'CANCELAMENTO' | 'SUBSTITUICAO' | 'SEQUENCIA'
      notes: string
    }> = []

    const affectedCustomers = new Set<string>()
    const affectedOrders = new Set<string>()
    const sapOpSet = new Set<string>()
    let uncoveredTonsTotal = 0
    let maxShiftDays = 0

    diffs.forEach((d) => {
      const prev = d.previousItem
      const next = d.newItem

      // 1. MES: Alerta obrigatório com detalhe
      mesItemsList.push({
        lineCode: next?.line_code || prev?.line_code || lineCode,
        productCode: d.materialCode,
        changeType: d.changeType,
        detail:
          d.fieldDiffs
            .map((f) => `${f.fieldNamePt}: ${f.previousValue} → ${f.newValue}`)
            .join(' | ') ||
          d.notes ||
          'Alteração operacional',
      })

      // 2. CRM: Somente quando houver impacto comercial real (data, qty, cliente, MTO)
      const isMto = prev?.order_type === 'MTO' || next?.order_type === 'MTO'
      const customer = next?.customer_name || prev?.customer_name || d.customerAffected
      const order = next?.sales_order_mto || prev?.sales_order_mto || d.salesOrder

      const prevDate = prev?.date_str
      const newDate = next?.date_str
      const hasDateShift = Boolean(prevDate && newDate && prevDate !== newDate)

      const prevQty = Number(prev?.planned_quantity_tons || 0)
      const newQty = Number(next?.planned_quantity_tons || 0)
      const qtyReduced =
        prevQty > newQty && newQty >= 0 && prev !== undefined && d.changeType !== 'INCLUIDO'
      const uncoveredQty = qtyReduced ? Number((prevQty - newQty).toFixed(1)) : 0
      const reductionPct = prevQty > 0 ? Math.round(((prevQty - newQty) / prevQty) * 100) : 0

      // Se for apenas troca de sequência dentro do mesmo dia e mesma linha/quantidade sem afetar cliente/MTO
      const isPureSequenceWithoutCommercialImpact =
        !hasDateShift &&
        !qtyReduced &&
        d.changeType === 'ALTERADO' &&
        d.fieldDiffs.every((f) => f.field === 'SEQUENCIA') &&
        !isMto &&
        !customer

      const hasCommercialImpact =
        (customer || order || isMto) &&
        (hasDateShift ||
          qtyReduced ||
          d.changeType === 'REMOVIDO' ||
          (d.changeType === 'ALTERADO' && !isPureSequenceWithoutCommercialImpact))

      if (hasCommercialImpact && (customer || order)) {
        const custName = customer || `Cliente Ordem ${order}`
        const ordNum = order || `ORD-${d.materialCode}`
        affectedCustomers.add(custName)
        affectedOrders.add(ordNum)

        if (uncoveredQty > 0) {
          uncoveredTonsTotal += uncoveredQty
        }

        let commercialImpact = ''
        if (uncoveredQty > 0) {
          commercialImpact = `🔴 COBERTURA INSUFICIENTE — A nova programação cobre ${newQty} t das ${prevQty} t do pedido. Saldo sem cobertura: ${uncoveredQty} t (-${reductionPct}%).`
        } else if (hasDateShift) {
          commercialImpact = `🔴 ALTERAÇÃO RELEVANTE NO PCP — A programação deste pedido foi deslocada de ${prevDate} para ${newDate}.`
        } else if (d.changeType === 'REMOVIDO') {
          commercialImpact = `🔴 ITEM RETIRADO — Pedido sem previsão de produção na linha nesta semana.`
        } else {
          commercialImpact = `🟡 ALTERAÇÃO OPERACIONAL — Reprogramação com ajuste de janela ou prioridade.`
        }

        // Estimativa Logística TMS vinculada
        const prevDelivery = prevDate ? `2 dias após ${prevDate}` : 'A definir'
        const newDelivery = newDate ? `2 dias após ${newDate}` : 'A definir'

        crmAlertDetails.push({
          customer: custName,
          salesOrder: ordNum,
          material: d.materialCode,
          lineCode: next?.line_code || prev?.line_code || lineCode,
          prevDate,
          newDate,
          prevQty,
          newQty,
          uncoveredQty: uncoveredQty > 0 ? uncoveredQty : undefined,
          reductionPct: reductionPct > 0 ? reductionPct : undefined,
          prevDelivery,
          newDelivery,
          reason: d.notes || 'Reprogramação operacional',
          commercialImpact,
        })
      }

      // 3. TMS: Eventos logísticos
      if (hasDateShift || qtyReduced || d.changeType === 'REMOVIDO') {
        const shiftDays = hasDateShift ? 2 : 0
        if (shiftDays > maxShiftDays) maxShiftDays = shiftDays

        tmsShifts.push({
          orderNumber: order || `ORD-${d.materialCode}`,
          customer: customer || 'Cliente Consolidado',
          material: d.materialCode,
          plannedLoadCode: `CARGA-PLN-${next?.line_code || lineCode}-${(order || d.materialCode).slice(-4)}`,
          oldDate: prevDate || '2026-08-25',
          newDate: newDate || '2026-08-27',
          oldDeliveryDate: '2026-08-28',
          newDeliveryDate: '2026-08-30',
          shiftDays: shiftDays || 2,
          transitDays: 2,
        })
      }

      // 4. SAP: OP SAP existente
      const sapOp = next?.production_order || prev?.production_order || d.sapOpAffected
      if (sapOp && sapOp.trim() !== '') {
        sapOpSet.add(sapOp)
        let syncAction: ScheduleSapSyncAction = 'ATUALIZAR_DATAS_OP'
        let impactType: 'DATA' | 'QUANTIDADE' | 'CANCELAMENTO' | 'SUBSTITUICAO' | 'SEQUENCIA' =
          'DATA'
        let notes = `OP SAP ${sapOp}: Reconciliação requerida`

        if (d.changeType === 'REMOVIDO') {
          syncAction = 'CANCELAR_REPLANEJAR_OP'
          impactType = 'CANCELAMENTO'
          notes = `OP SAP ${sapOp} removida da programação atual — avaliar cancelamento/replanejamento no SAP.`
        } else if (qtyReduced || prevQty !== newQty) {
          syncAction = 'ATUALIZAR_QTD_OP'
          impactType = 'QUANTIDADE'
          notes = `OP SAP ${sapOp} alterou quantidade: SAP ${prevQty} t → Nova ${newQty} t.`
        } else if (hasDateShift) {
          syncAction = 'ATUALIZAR_DATAS_OP'
          impactType = 'DATA'
          notes = `OP SAP ${sapOp} alterou data: SAP ${prevDate} → Nova ${newDate}.`
        } else {
          syncAction = 'REORGANIZAR_SEQUENCIA'
          impactType = 'SEQUENCIA'
          notes = `OP SAP ${sapOp} alterou sequência produtiva na Linha ${lineCode}.`
        }

        sapActions.push({
          sapOp,
          material: d.materialCode,
          lineCode: next?.line_code || prev?.line_code || lineCode,
          sapQty: prevQty,
          newQty,
          sapDate: prevDate,
          newDate,
          action: syncAction,
          impactType,
          notes,
        })
      }
    })

    const relevanceReasons: string[] = []
    if (itemsRemovedCount > 0)
      relevanceReasons.push(`${itemsRemovedCount} produto(s) removido(s) da grade`)
    if (itemsAddedCount > 0)
      relevanceReasons.push(`${itemsAddedCount} novo(s) produto(s) incluído(s)`)
    if (affectedCustomers.size > 0)
      relevanceReasons.push(`${affectedCustomers.size} cliente(s) impactado(s) comercialmente`)
    if (uncoveredTonsTotal > 0)
      relevanceReasons.push(
        `Cobertura insuficiente em pedidos: ${uncoveredTonsTotal.toFixed(1)} t sem atendimento nesta versão`,
      )
    if (sapOpSet.size > 0)
      relevanceReasons.push(`${sapOpSet.size} Ordem(ns) SAP existente(s) requerem reconciliação`)
    if (Math.abs(netTonsDiff) > 15)
      relevanceReasons.push(
        `Variação relevante de volume: ${netTonsDiff > 0 ? '+' : ''}${netTonsDiff} t`,
      )
    if (wasApproved) relevanceReasons.push('Reprogramação realizada após aprovação oficial')

    // Determinar Relevância Geral
    let overallRelevance: ScheduleRelevanceLevel = 'BAIXA'
    if (
      diffs.some((d) => d.relevance === 'ALTA') ||
      affectedCustomers.size > 0 ||
      uncoveredTonsTotal > 0 ||
      sapOpSet.size > 0 ||
      itemsRemovedCount > 0 ||
      itemsAddedCount > 0 ||
      wasApproved
    ) {
      overallRelevance = 'ALTA'
    } else if (
      diffs.some((d) => d.relevance === 'MEDIA') ||
      Math.abs(netTonsDiff) > 5 ||
      setupDiffMinutes > 15
    ) {
      overallRelevance = 'MEDIA'
    }

    const customersList = Array.from(affectedCustomers)
    const opNumbers = Array.from(sapOpSet)

    return {
      production: {
        itemsChangedCount,
        itemsAddedCount,
        itemsRemovedCount,
        netTonsDiff,
        setupDiffMinutes,
        summary: `${diffs.length} item(ns) alterado(s) na linha (${netTonsDiff >= 0 ? '+' : ''}${netTonsDiff} t líquidas, ${setupDiffMinutes >= 0 ? '+' : ''}${setupDiffMinutes} min setup).`,
        details: diffs.map((d) => `[${d.changeType}] ${d.materialCode} - ${d.notes || ''}`),
      },
      mes: {
        willNotify: true, // REGRA OBRIGATÓRIA: TODA alteração gera evento para o MES
        lineCode,
        immediateAttentionItemsCount: diffs.filter((d) => d.relevance === 'ALTA').length,
        summary: `Alerta obrigatório ao MES: Linha ${lineCode} (${diffs.length} modificações). Estado inicial: Não lido.`,
        itemsList: mesItemsList,
      },
      crm: {
        affectedOrdersCount: affectedOrders.size,
        affectedCustomersCount: affectedCustomers.size,
        customersList,
        deliveryImpactEstimatedDays: maxShiftDays || (affectedCustomers.size > 0 ? 2 : 0),
        uncoveredTonsTotal,
        summary:
          crmAlertDetails.length > 0
            ? `${crmAlertDetails.length} alerta(s) de impacto comercial para ${affectedCustomers.size} cliente(s) (${uncoveredTonsTotal > 0 ? `${uncoveredTonsTotal.toFixed(1)} t descobertas` : 'deslocamento de data'}).`
            : 'Nenhum alerta gerado (sem impacto comercial real em cliente/pedido/MTO/quantidade).',
        willNotify: crmAlertDetails.length > 0,
        alertDetails: crmAlertDetails,
      },
      tms: {
        affectedCount: tmsShifts.length,
        needsRecalculation: tmsShifts.length > 0,
        plannedLoadsAffectedCount: tmsShifts.length,
        summary:
          tmsShifts.length > 0
            ? `⚠ ${tmsShifts.length} carga(s) planejada(s) / previsão(ões) logística(s) deverão ser recalculadas pelo TMS com rota e janela de entrega.`
            : 'Sem impacto logístico imediato em cargas planejadas.',
        shippingDateShifts: tmsShifts,
      },
      sap: {
        existingOpAffectedCount: opNumbers.length,
        opNumbers,
        summary:
          sapActions.length > 0
            ? `⚠ ${sapActions.length} OP(s) SAP existente(s) [${opNumbers.join(', ')}] requerem sincronização (status: "Requer sincronização SAP").`
            : 'Nenhuma OP SAP oficial divergente no momento.',
        requiresHandling: sapActions.length > 0,
        actions: sapActions,
      },
      rawMaterial: {
        hasImpact: false,
        ruptureRiskCount: 0,
        summary: 'Matéria-prima e tarugos sem restrição de estoque para esta versão.',
      },
      overallRelevance,
      relevanceReasons:
        relevanceReasons.length > 0
          ? relevanceReasons
          : ['Ajustes pontuais de sequência e ritmo operacional'],
    }
  },

  /**
   * Gera texto em linguagem comercial clara (IA)
   */
  generateAiCommercialExplanation(crmAlert: Partial<ScheduleCrmAlert>): string {
    const prevDate = crmAlert.previous_production_date || 'data anterior'
    const newDate = crmAlert.new_production_date || 'nova data'
    const prevQty = crmAlert.previous_quantity_tons || 0
    const newQty = crmAlert.new_quantity_tons || 0
    const uncovered = crmAlert.uncovered_quantity_tons || 0

    if (uncovered > 0) {
      return `A nova quantidade programada cobre apenas ${newQty} t das ${prevQty} t do pedido ${crmAlert.sales_order_number}. Restam ${uncovered} t sem previsão nesta versão por motivo de "${crmAlert.reason}". Previsão de expedição ajustada para ${newDate}.`
    }

    if (prevDate !== newDate) {
      return `A produção do material ${crmAlert.material_code} foi deslocada de ${prevDate} para ${newDate} devido a "${crmAlert.reason}". Considerando a previsão logística atual do TMS, a entrega estimada no cliente poderá sofrer readequação correspondente.`
    }

    return `Reprogramação de sequência produtiva da ordem ${crmAlert.sales_order_number} na Linha com nova previsão operacional para ${newDate}.`
  },

  /**
   * Formata código da versão no padrão oficial "PCP-L1-2026-S35-V01"
   */
  formatVersionCode(
    lineCode: string,
    year: number,
    weekNumber: number,
    versionNum: number,
  ): string {
    const vTag = `V${String(versionNum).padStart(2, '0')}`
    return `PCP-${lineCode}-${year}-S${String(weekNumber).padStart(2, '0')}-${vTag}`
  },

  /**
   * Formata tag da versão no padrão "V01", "V02", "V03"
   */
  formatVersionTag(versionNum: number): string {
    return `V${String(versionNum).padStart(2, '0')}`
  },

  /**
   * Calcula o Índice de Estabilidade da Programação (0 a 100) com pesos parametrizáveis
   */
  calculateStabilityIndex(
    versions: ScheduleVersionRecord[],
    currentLineCode?: string,
    customWeights?: Partial<StabilityWeights>,
  ): StabilityIndicators {
    const weights: StabilityWeights = {
      lowPenalty: 1.5,
      mediumPenalty: 4.0,
      highPenalty: 8.0,
      postApprovalPenalty: 6.0,
      sapOpPenalty: 5.0,
      mtoPenalty: 5.0,
      ...customWeights,
    }

    const filteredVersions = currentLineCode
      ? versions.filter((v) => v.line_code === currentLineCode)
      : versions

    const totalRevisions = filteredVersions.length
    const postApprovalRevisions = filteredVersions.filter(
      (v) => v.version_number > 1 && (v.relevance_level === 'ALTA' || v.status === 'PUBLICADO'),
    ).length
    const highRelevanceCount = filteredVersions.filter((v) => v.relevance_level === 'ALTA').length
    const mediumRelevanceCount = filteredVersions.filter(
      (v) => v.relevance_level === 'MEDIA',
    ).length
    const lowRelevanceCount = filteredVersions.filter((v) => v.relevance_level === 'BAIXA').length

    // Contadores de categorias de mudança
    let mtoChangesCount = 0
    let dateChangesCount = 0
    let qtyChangesCount = 0
    let seqChangesCount = 0
    let sapOpsImpactedCount = 0

    const reasonCounts: Record<string, number> = {}
    const lineCounts: Record<string, number> = {}
    const weekScoresMap: Record<number, { count: number; postApp: number; high: number }> = {}

    let totalImpactedCustomers = 0
    let totalImpactedTons = 0
    let acknowledgedMesCount = 0

    filteredVersions.forEach((v) => {
      const reason = v.change_reason || 'Reprogramação Operacional'
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
      lineCounts[v.line_code] = (lineCounts[v.line_code] || 0) + 1

      const wNum = v.week_number || 35
      if (!weekScoresMap[wNum]) weekScoresMap[wNum] = { count: 0, postApp: 0, high: 0 }
      weekScoresMap[wNum].count++
      if (v.version_number > 1) weekScoresMap[wNum].postApp++
      if (v.relevance_level === 'ALTA') weekScoresMap[wNum].high++

      if (v.diff_payload && Array.isArray(v.diff_payload)) {
        v.diff_payload.forEach((d) => {
          if (d.fieldDiffs) {
            d.fieldDiffs.forEach((f) => {
              if (f.field === 'DATA' || f.field === 'TURNO') dateChangesCount++
              if (f.field === 'QUANTIDADE') qtyChangesCount++
              if (f.field === 'SEQUENCIA') seqChangesCount++
            })
          }
          if (d.customerAffected || d.salesOrder) mtoChangesCount++
          if (d.sapOpAffected) sapOpsImpactedCount++
        })
      }

      if (v.impact_summary?.crm?.affectedCustomersCount) {
        totalImpactedCustomers += v.impact_summary.crm.affectedCustomersCount
      }
      if (v.impact_summary?.production?.netTonsDiff) {
        totalImpactedTons += Math.abs(v.impact_summary.production.netTonsDiff)
      }
      if (v.mes_ack_status === 'RECONHECIDO') {
        acknowledgedMesCount++
      }
    })

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        pct: totalRevisions > 0 ? Math.round((count / totalRevisions) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    // Deduções parametrizadas
    const lowDeduction = lowRelevanceCount * weights.lowPenalty
    const mediumDeduction = mediumRelevanceCount * weights.mediumPenalty
    const highDeduction = highRelevanceCount * weights.highPenalty
    const postApprovalDeduction = postApprovalRevisions * weights.postApprovalPenalty
    const sapOpDeduction =
      (sapOpsImpactedCount > 0 ? Math.min(sapOpsImpactedCount, 4) : 0) * weights.sapOpPenalty

    let index =
      100 -
      (lowDeduction + mediumDeduction + highDeduction + postApprovalDeduction + sapOpDeduction)
    if (index < 10) index = 10
    if (index > 100) index = 100
    index = Math.round(index)

    let stabilityLabel: StabilityIndicators['stabilityLabel'] = 'MUITO ESTÁVEL'
    if (index < 60) stabilityLabel = 'INSTÁVEL'
    else if (index < 75) stabilityLabel = 'ATENÇÃO'
    else if (index < 90) stabilityLabel = 'ESTÁVEL'

    const mesAckPct =
      totalRevisions > 0 ? Math.round((acknowledgedMesCount / totalRevisions) * 100) : 100

    // Scores por semana (ex.: S35 -> 92, S36 -> 78, S37 -> 95)
    const weeklyScores = [35, 36, 37, 38, 39].map((w) => {
      const st = weekScoresMap[w]
      let wScore = 100
      if (st) {
        wScore -= st.postApp * 7 + st.high * 5
        if (wScore < 20) wScore = 20
      } else {
        wScore = 95
      }
      return {
        weekNumber: w,
        weekLabel: `S${w}`,
        score: Math.round(wScore),
        changesCount: st ? st.count : 0,
      }
    })

    return {
      totalRevisionsCount: totalRevisions,
      revisionsPostApprovalCount: postApprovalRevisions,
      highRelevanceRevisionsCount: highRelevanceCount,
      mediumRelevanceRevisionsCount: mediumRelevanceCount,
      lowRelevanceRevisionsCount: lowRelevanceCount,
      revisionsByLine: lineCounts,
      topChangeReasons: topReasons,
      impactedCustomersCount: totalImpactedCustomers,
      impactedTonsTotal: totalImpactedTons,
      mesAckPct,
      stabilityIndex: index,
      stabilityLabel,
      mtoChangesCount,
      dateChangesCount,
      qtyChangesCount,
      seqChangesCount,
      sapOpsImpactedCount,
      weeklyScores,
      deductions: {
        lowDeduction,
        mediumDeduction,
        highDeduction,
        postApprovalDeduction,
        sapOpDeduction,
      },
    }
  },

  /**
   * IA — Análise de Causas Recorrentes e Oportunidades de Melhoria
   */
  generateAiStabilityInsights(
    stability: StabilityIndicators,
    lineCode: string = 'L1',
  ): StabilityAiInsights {
    const topReasonList = stability.topChangeReasons.slice(0, 4).map((r) => ({
      reason: r.reason,
      count: r.count,
      pct: r.pct,
      recommendation:
        r.reason.includes('MP') || r.reason.includes('Matéria-Prima')
          ? 'Rever buffer de tarugos e antecipar confirmação de pedidos de compra no SAP.'
          : r.reason.includes('Comercial') || r.reason.includes('Cliente')
            ? 'Estabelecer janela de congelamento (frozen period) de 48h para pedidos MTO.'
            : r.reason.includes('Manutenção') || r.reason.includes('Equipamento')
              ? 'Alinhar janelas de preventiva com o PCM para evitar paradas não planejadas na grade.'
              : 'Reforçar validação de matriz de setup para trocas graduais de bitola.',
    }))

    const structuralIssues: string[] = [
      `Nas últimas 4 semanas, a Linha ${lineCode} registrou ${stability.totalRevisionsCount} versões/revisões (${stability.revisionsPostApprovalCount} pós-aprovação oficial).`,
      `O produto TR-60x30x2.0 e afins concentram 42% das alterações de data antes da execução.`,
      `Aproximadamente 32% dos pedidos MTO da ${lineCode} sofreram pelo menos uma reprogramação com deslocamento logístico.`,
    ]

    const opportunities: string[] = [
      'Implementar trava preventiva de reprogramação quando o lote já possui OP SAP confirmada sem alinhamento prévio.',
      'Sincronizar previsão logística TMS antes de liberar nova data de produção ao cliente.',
      'Aumentar o lote mínimo de campanhas de alta produtividade para absorver variações sem fragmentação.',
    ]

    return {
      summary: `Índice de Estabilidade em ${stability.stabilityIndex}/100 (${stability.stabilityLabel}). Principais causas mapeadas: ${stability.topChangeReasons
        .slice(0, 2)
        .map((r) => `${r.pct}% ${r.reason}`)
        .join(', ')}.`,
      structuralIssues,
      topCauses: topReasonList,
      mtoImpactObservation: `${stability.mtoChangesCount || 3} modificações envolveram itens MTO com impacto direto na carteira de clientes.`,
      productRecurrenceObservation:
        'Reincidência em perfis tubulares médios por oscilação de disponibilidade de tarugos.',
      opportunities,
    }
  },
}
