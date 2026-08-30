import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import {
  ScheduleItemDiff,
  RelevanceCriteriaConfig,
  ScheduleRelevanceLevel,
  VersionImpactAssessment,
  ScheduleVersionRecord,
  ScheduleMesAlert,
  ScheduleCrmAlert,
  ScheduleTmsEvent,
  ScheduleSapQueueItem,
  StabilityIndicators,
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

    // Clientes e Pedidos Afetados
    const affectedCustomers = new Set<string>()
    const affectedOrders = new Set<string>()
    const sapOpSet = new Set<string>()

    diffs.forEach((d) => {
      if (d.customerAffected) affectedCustomers.add(d.customerAffected)
      if (d.salesOrder) affectedOrders.add(d.salesOrder)
      if (d.sapOpAffected) sapOpSet.add(d.sapOpAffected)
    })

    const relevanceReasons: string[] = []

    if (itemsRemovedCount > 0)
      relevanceReasons.push(`${itemsRemovedCount} produto(s) removido(s) da grade`)
    if (itemsAddedCount > 0)
      relevanceReasons.push(`${itemsAddedCount} novo(s) produto(s) incluído(s)`)
    if (affectedCustomers.size > 0)
      relevanceReasons.push(
        `${affectedCustomers.size} cliente(s) impactado(s) com alteração de entrega/ordem`,
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
        summary: `${diffs.length} modificações na linha (${netTonsDiff >= 0 ? '+' : ''}${netTonsDiff} t líquidas, ${setupDiffMinutes >= 0 ? '+' : ''}${setupDiffMinutes} min de setup).`,
      },
      mes: {
        willNotify: true, // REGRA OBRIGATÓRIA: TODA alteração gera evento para o MES
        lineCode,
        summary: `Linha ${lineCode} será notificada em tempo real no terminal de chão de fábrica.`,
      },
      crm: {
        affectedOrdersCount: affectedOrders.size,
        affectedCustomersCount: affectedCustomers.size,
        customersList,
        summary:
          affectedCustomers.size > 0
            ? `${affectedCustomers.size} cliente(s) e ${affectedOrders.size} pedido(s) afetados comercialmente.`
            : 'Nenhum pedido ou cliente comercial impactado.',
        willNotify: overallRelevance === 'ALTA' && affectedCustomers.size > 0,
      },
      tms: {
        affectedCount: affectedOrders.size,
        needsRecalculation: affectedOrders.size > 0 || Math.abs(netTonsDiff) > 10,
        summary:
          affectedOrders.size > 0
            ? `${affectedOrders.size} previsão(ões) logística(s) deverão ser recalculadas pelo TMS.`
            : 'Sem impacto imediato de janela de expedição.',
      },
      sap: {
        existingOpAffectedCount: opNumbers.length,
        opNumbers,
        summary:
          opNumbers.length > 0
            ? `⚠ ${opNumbers.length} OP SAP existente(s) [${opNumbers.join(', ')}] requerem tratamento de integração.`
            : 'Nenhuma OP SAP oficial divergente no momento.',
        requiresHandling: opNumbers.length > 0,
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
   * Calcula o Índice de Estabilidade da Programação (0 a 100)
   */
  calculateStabilityIndex(
    versions: ScheduleVersionRecord[],
    currentLineCode?: string,
  ): StabilityIndicators {
    const filteredVersions = currentLineCode
      ? versions.filter((v) => v.line_code === currentLineCode)
      : versions

    const totalRevisions = filteredVersions.length
    const postApprovalRevisions = filteredVersions.filter(
      (v) => v.version_number > 1 && (v.relevance_level === 'ALTA' || v.status === 'PUBLICADO'),
    ).length
    const highRelevanceCount = filteredVersions.filter((v) => v.relevance_level === 'ALTA').length

    // Contagem de motivos
    const reasonCounts: Record<string, number> = {}
    const lineCounts: Record<string, number> = {}
    let totalImpactedCustomers = 0
    let totalImpactedTons = 0
    let acknowledgedMesCount = 0

    filteredVersions.forEach((v) => {
      const reason = v.change_reason || 'reprogramação operacional'
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
      lineCounts[v.line_code] = (lineCounts[v.line_code] || 0) + 1

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

    // Cálculo da Estabilidade: Começa em 100 e desconta por alterações pós-aprovação
    let index = 100
    index -= postApprovalRevisions * 6
    index -= highRelevanceCount * 4
    if (totalRevisions > 5) index -= (totalRevisions - 5) * 2
    if (index < 20) index = 20
    if (index > 100) index = 100

    let stabilityLabel: StabilityIndicators['stabilityLabel'] = 'MUITO ESTÁVEL'
    if (index < 60) stabilityLabel = 'INSTÁVEL'
    else if (index < 75) stabilityLabel = 'ATENÇÃO'
    else if (index < 90) stabilityLabel = 'ESTÁVEL'

    const mesAckPct =
      totalRevisions > 0 ? Math.round((acknowledgedMesCount / totalRevisions) * 100) : 100

    return {
      totalRevisionsCount: totalRevisions,
      revisionsPostApprovalCount: postApprovalRevisions,
      highRelevanceRevisionsCount: highRelevanceCount,
      revisionsByLine: lineCounts,
      topChangeReasons: topReasons,
      impactedCustomersCount: totalImpactedCustomers,
      impactedTonsTotal: totalImpactedTons,
      mesAckPct,
      stabilityIndex: index,
      stabilityLabel,
    }
  },
}
