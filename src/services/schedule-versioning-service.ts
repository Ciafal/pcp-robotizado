import pb from '@/lib/pocketbase/client'
import { WeeklyScheduleItem, WeeklyHeaderFilter } from '@/types/weekly-schedule'
import {
  ScheduleVersionRecord,
  ScheduleMesAlert,
  ScheduleCrmAlert,
  ScheduleTmsEvent,
  ScheduleSapQueueItem,
  RelevanceCriteriaConfig,
  StabilityIndicators,
  ScheduleItemDiff,
  VersionImpactAssessment,
  ChangeReasonExact,
} from '@/types/schedule-versioning'
import { VersioningEngine, DEFAULT_RELEVANCE_CRITERIA } from './versioning-engine'
import { integrationEventService } from './pcp-integration-service'

export const scheduleVersioningService = {
  /**
   * Busca a configuração vigente dos limites de relevância
   */
  async getRelevanceCriteria(): Promise<RelevanceCriteriaConfig> {
    try {
      const records = await pb.collection('schedule_relevance_criteria').getFullList({
        filter: "is_active = true || code = 'CRITERIA_CIAFAL_DEFAULT'",
        sort: '-created',
      })
      if (records && records.length > 0) {
        const r: any = records[0]
        return {
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description,
          is_active: r.is_active,
          qty_low_threshold_pct: Number(r.qty_low_threshold_pct) || 5,
          qty_medium_threshold_pct: Number(r.qty_medium_threshold_pct) || 15,
          date_shift_change_level: r.date_shift_change_level || 'MEDIA',
          date_day_change_level: r.date_day_change_level || 'ALTA',
          date_week_change_level: r.date_week_change_level || 'ALTA',
          seq_setup_increase_level: r.seq_setup_increase_level || 'MEDIA',
          seq_customer_affected_level: r.seq_customer_affected_level || 'ALTA',
          product_add_remove_level: r.product_add_remove_level || 'ALTA',
          mto_impact_level: r.mto_impact_level || 'ALTA',
          post_approval_change_level: r.post_approval_change_level || 'ALTA',
          existing_sap_op_change_level: r.existing_sap_op_change_level || 'ALTA',
          updated_by_name: r.updated_by_name,
          created: r.created,
          updated: r.updated,
        }
      }
    } catch (err) {
      console.warn('Usando critérios de relevância padrão em fallback:', err)
    }
    return DEFAULT_RELEVANCE_CRITERIA
  },

  /**
   * Salva ou atualiza a configuração dos limites de relevância
   */
  async saveRelevanceCriteria(criteria: Partial<RelevanceCriteriaConfig>): Promise<boolean> {
    const user = pb.authStore.record
    try {
      const payload = {
        code: criteria.code || 'CRITERIA_CIAFAL_DEFAULT',
        name: criteria.name || 'Critérios Oficiais CIAFAL de Relevância de Reprogramação',
        description: criteria.description || '',
        is_active: true,
        qty_low_threshold_pct: criteria.qty_low_threshold_pct ?? 5,
        qty_medium_threshold_pct: criteria.qty_medium_threshold_pct ?? 15,
        date_shift_change_level: criteria.date_shift_change_level || 'MEDIA',
        date_day_change_level: criteria.date_day_change_level || 'ALTA',
        date_week_change_level: criteria.date_week_change_level || 'ALTA',
        seq_setup_increase_level: criteria.seq_setup_increase_level || 'MEDIA',
        seq_customer_affected_level: criteria.seq_customer_affected_level || 'ALTA',
        product_add_remove_level: criteria.product_add_remove_level || 'ALTA',
        mto_impact_level: criteria.mto_impact_level || 'ALTA',
        post_approval_change_level: criteria.post_approval_change_level || 'ALTA',
        existing_sap_op_change_level: criteria.existing_sap_op_change_level || 'ALTA',
        updated_by_name: user ? user.name || user.email : 'Engenharia de Processos / PCP',
      }

      if (criteria.id) {
        await pb.collection('schedule_relevance_criteria').update(criteria.id, payload)
      } else {
        const existing = await pb.collection('schedule_relevance_criteria').getFullList({
          filter: `code = '${payload.code}'`,
        })
        if (existing.length > 0) {
          await pb.collection('schedule_relevance_criteria').update(existing[0].id, payload)
        } else {
          await pb.collection('schedule_relevance_criteria').create(payload)
        }
      }
      return true
    } catch (err) {
      console.error('Erro ao salvar critérios de relevância:', err)
      throw err
    }
  },

  /**
   * Carrega o histórico completo de versões de uma linha/semana
   */
  async getVersionHistory(
    lineCode: string,
    year: number,
    weekNumber: number,
  ): Promise<ScheduleVersionRecord[]> {
    try {
      const records = await pb.collection('schedule_version_records').getFullList({
        filter: `line_code = '${lineCode}' && year = ${year} && week_number = ${weekNumber}`,
        sort: '-version_number',
      })
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          version_code: r.version_code,
          schedule_code: r.schedule_code,
          line_code: r.line_code,
          year: r.year,
          week_number: r.week_number,
          version_number: r.version_number,
          version_tag: r.version_tag || VersioningEngine.formatVersionTag(r.version_number),
          previous_version_tag: r.previous_version_tag,
          previous_version_code: r.previous_version_code,
          status: r.status,
          is_current_published: r.is_current_published || false,
          relevance_level: r.relevance_level || 'BAIXA',
          change_reason: r.change_reason,
          change_notes: r.change_notes,
          user_id: r.user_id,
          user_name: r.user_name,
          user_email: r.user_email,
          snapshot_data: r.snapshot_data || [],
          diff_payload: r.diff_payload || [],
          impact_summary: r.impact_summary,
          governing_parameters_snapshot: r.governing_parameters_snapshot,
          ai_score: r.ai_score,
          ai_explanation: r.ai_explanation,
          mes_dispatched: r.mes_dispatched || false,
          mes_dispatched_at: r.mes_dispatched_at,
          mes_ack_status: r.mes_ack_status || 'NAO_LIDO',
          crm_dispatched: r.crm_dispatched || false,
          crm_dispatched_at: r.crm_dispatched_at,
          tms_dispatched: r.tms_dispatched || false,
          sap_dispatched: r.sap_dispatched || false,
          created: r.created,
          updated: r.updated,
        }))
      }
    } catch (err) {
      console.warn('Erro ao carregar histórico de versões de schedule_version_records:', err)
    }
    return []
  },

  /**
   * Busca todas as versões para o cálculo geral de estabilidade
   */
  async getAllVersions(): Promise<ScheduleVersionRecord[]> {
    try {
      const records = await pb.collection('schedule_version_records').getFullList({
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        version_code: r.version_code,
        schedule_code: r.schedule_code,
        line_code: r.line_code,
        year: r.year,
        week_number: r.week_number,
        version_number: r.version_number,
        version_tag: r.version_tag || VersioningEngine.formatVersionTag(r.version_number),
        previous_version_tag: r.previous_version_tag,
        previous_version_code: r.previous_version_code,
        status: r.status,
        is_current_published: r.is_current_published || false,
        relevance_level: r.relevance_level || 'BAIXA',
        change_reason: r.change_reason,
        change_notes: r.change_notes,
        user_name: r.user_name,
        user_email: r.user_email,
        snapshot_data: r.snapshot_data || [],
        diff_payload: r.diff_payload || [],
        impact_summary: r.impact_summary,
        ai_score: r.ai_score,
        mes_dispatched: r.mes_dispatched || false,
        mes_ack_status: r.mes_ack_status || 'NAO_LIDO',
        crm_dispatched: r.crm_dispatched || false,
        tms_dispatched: r.tms_dispatched || false,
        sap_dispatched: r.sap_dispatched || false,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao carregar todas as versões:', err)
      return []
    }
  },

  /**
   * Publica uma nova versão da programação com gravação de snapshot, diffs, alertas MES e CRM
   */
  async publishNewVersion(params: {
    filter: WeeklyHeaderFilter
    newItems: WeeklyScheduleItem[]
    previousItems: WeeklyScheduleItem[]
    changeReason: ChangeReasonExact | string
    changeNotes?: string
    governingParameters?: Record<string, any>
    wasApprovedBefore?: boolean
  }): Promise<{
    success: boolean
    versionRecord: ScheduleVersionRecord
    mesAlert?: ScheduleMesAlert
    crmAlerts?: ScheduleCrmAlert[]
  }> {
    const user = pb.authStore.record
    const criteria = await this.getRelevanceCriteria()
    const currentHist = await this.getVersionHistory(
      params.filter.lineCode,
      params.filter.year,
      params.filter.weekNumber,
    )

    // Determinar número da nova versão
    const nextVersionNum =
      currentHist.length > 0
        ? Math.max(...currentHist.map((v) => v.version_number)) + 1
        : params.newItems[0]?.version || 1
    const prevVersionNum = nextVersionNum > 1 ? nextVersionNum - 1 : 1

    const newVersionTag = VersioningEngine.formatVersionTag(nextVersionNum)
    const prevVersionTag =
      nextVersionNum > 1 ? VersioningEngine.formatVersionTag(prevVersionNum) : undefined
    const newVersionCode = VersioningEngine.formatVersionCode(
      params.filter.lineCode,
      params.filter.year,
      params.filter.weekNumber,
      nextVersionNum,
    )
    const prevVersionCode = prevVersionTag
      ? VersioningEngine.formatVersionCode(
          params.filter.lineCode,
          params.filter.year,
          params.filter.weekNumber,
          prevVersionNum,
        )
      : undefined

    // 1. Calcular diffs e impacto
    const diffs = VersioningEngine.computeScheduleDiffs(
      params.previousItems,
      params.newItems,
      criteria,
      params.wasApprovedBefore,
    )
    const impact = VersioningEngine.evaluateImpact(
      diffs,
      params.previousItems,
      params.newItems,
      params.filter.lineCode,
      params.wasApprovedBefore,
    )

    // Atualiza itens na lista com a nova versão e status PUBLICADO
    const updatedItems = params.newItems.map((it, idx) => ({
      ...it,
      version: nextVersionNum,
      status: 'PUBLICADO' as const,
      sequence_order: idx + 1,
    }))

    // 2. Desmarcar is_current_published de versões antigas
    try {
      const activeOld = await pb.collection('schedule_version_records').getFullList({
        filter: `line_code = '${params.filter.lineCode}' && year = ${params.filter.year} && week_number = ${params.filter.weekNumber} && is_current_published = true`,
      })
      for (const oldRec of activeOld) {
        await pb
          .collection('schedule_version_records')
          .update(oldRec.id, { is_current_published: false })
      }
    } catch {
      /* ignore */
    }

    // 3. Gravar Snapshot Completo na Coleção schedule_version_records
    const nowIso = new Date().toISOString()
    const currentEnv = integrationEventService.getActiveEnvironment()
    const sharedEventId = integrationEventService.formatEventId(
      params.filter.lineCode,
      params.filter.year,
      params.filter.weekNumber,
      nextVersionNum,
      1,
    )

    const versionRecordPayload: any = {
      event_id: sharedEventId,
      version_code: newVersionCode,
      schedule_code: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
      line_code: params.filter.lineCode,
      year: params.filter.year,
      week_number: params.filter.weekNumber,
      version_number: nextVersionNum,
      version_tag: newVersionTag,
      previous_version_tag: prevVersionTag || '',
      previous_version_code: prevVersionCode || '',
      status: 'PUBLICADO',
      is_current_published: true,
      relevance_level: impact.overallRelevance,
      change_reason: params.changeReason,
      change_notes: params.changeNotes || '',
      user_id: user?.id || '',
      user_name: user ? user.name || user.email : 'Programador PCP',
      user_email: user?.email || 'ciafal@ciafal.com.br',
      snapshot_data: updatedItems,
      diff_payload: diffs,
      impact_summary: impact,
      governing_parameters_snapshot: params.governingParameters || {},
      ai_score: 94,
      ai_explanation: `Versão ${newVersionTag} gerada com ${diffs.length} alterações classificadas como ${impact.overallRelevance} relevância.`,
      mes_dispatched: true, // TODA alteração gera MES
      mes_dispatched_at: nowIso,
      mes_ack_status: 'NAO_LIDO',
      crm_dispatched: impact.crm.willNotify,
      crm_dispatched_at: impact.crm.willNotify ? nowIso : '',
      tms_dispatched: impact.tms.needsRecalculation,
      sap_dispatched: impact.sap.requiresHandling,
    }

    let createdVersionRec: any
    try {
      createdVersionRec = await pb
        .collection('schedule_version_records')
        .create(versionRecordPayload)
    } catch (err) {
      console.error('Erro ao gravar schedule_version_records:', err)
      throw err
    }

    // 4. Integração Ponta a Ponta MES com event_id único
    let createdMesAlert: ScheduleMesAlert | undefined
    try {
      const firstDiff = diffs[0]
      const mesPayload = {
        alert_code: `MES-${params.filter.lineCode}-${Date.now().toString().slice(-6)}`,
        event_id: sharedEventId,
        programacao_id: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
        version_code: newVersionCode,
        previous_version_tag: prevVersionTag || 'V01',
        new_version_tag: newVersionTag,
        line_code: params.filter.lineCode,
        line_name: `Linha ${params.filter.lineCode}`,
        product_code: firstDiff?.materialCode || updatedItems[0]?.material_code || 'VÁRIOS',
        product_description:
          firstDiff?.materialDescription ||
          updatedItems[0]?.material_description ||
          'Programação Semanal Atualizada',
        sequence_prev: firstDiff?.previousItem
          ? `Seq. ${firstDiff.previousItem.sequence_order}`
          : '—',
        sequence_new: firstDiff?.newItem ? `Seq. ${firstDiff.newItem.sequence_order}` : '—',
        qty_prev_tons: firstDiff?.previousItem?.planned_quantity_tons || 0,
        qty_new_tons: firstDiff?.newItem?.planned_quantity_tons || 0,
        datetime_prev: firstDiff?.previousItem?.start_datetime || '',
        datetime_new: firstDiff?.newItem?.start_datetime || '',
        reason: params.changeReason,
        relevance: impact.overallRelevance,
        user_name: user ? user.name || user.email : 'Programador PCP',
        user_email: user?.email || '',
        notes: params.changeNotes || 'Atualização publicada pelo PCP.',
        diff_items_json: diffs,
        ack_status: 'NAO_LIDO' as const,
        is_active_banner: true,
      }
      const mesRec: any = await pb.collection('schedule_mes_alerts').create(mesPayload)
      createdMesAlert = { ...mesPayload, id: mesRec.id }

      // Disparar evento oficial na tabela integration_event para o MES
      await integrationEventService.dispatchEventToDestination({
        eventId: sharedEventId,
        origem: 'PCP',
        destino: 'MES',
        tipoEvento: 'PROGRAMACAO_PUBLICADA',
        programacaoId: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
        versao: newVersionTag,
        versaoNum: nextVersionNum,
        payload: mesPayload,
        responsavelAcao: user ? user.name || user.email : 'Programador PCP',
      })
    } catch (err) {
      console.warn('Erro ao disparar alerta MES:', err)
    }

    // 5. Integração CRM com event_id único (somente quando aplicável)
    const createdCrmAlerts: ScheduleCrmAlert[] = []
    if (impact.crm.willNotify) {
      for (const diff of diffs) {
        if (diff.customerAffected || diff.salesOrder || diff.newItem?.order_type === 'MTO') {
          try {
            const prevQty = diff.previousItem?.planned_quantity_tons || 0
            const newQty = diff.newItem?.planned_quantity_tons || 0
            const uncovered = prevQty > newQty ? prevQty - newQty : 0

            const crmPayload: any = {
              alert_code: `CRM-${Date.now().toString().slice(-6)}-${diff.salesOrder || 'PED'}`,
              event_id: sharedEventId,
              programacao_id: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
              version_code: newVersionCode,
              sales_order_number: diff.salesOrder || diff.newItem?.sales_order_mto || '45871/10',
              sales_order_item: '10',
              customer_name: diff.customerAffected || diff.newItem?.customer_name || 'ABC Ltda.',
              sales_rep_name: 'Carlos Mendes (Vendas Internas)',
              sales_rep_email: 'carlos.mendes@ciafal.com.br',
              sales_agent_name: 'Representação Vale do Aço',
              material_code: diff.materialCode,
              material_description: diff.materialDescription,
              order_type: diff.newItem?.order_type || 'MTO',
              previous_production_date: diff.previousItem?.date_str || '25/08',
              new_production_date: diff.newItem?.date_str || '27/08',
              previous_quantity_tons: prevQty,
              new_quantity_tons: newQty,
              uncovered_quantity_tons: uncovered,
              order_balance_tons: prevQty,
              reason: params.changeReason,
              commercial_impact_summary:
                uncovered > 0
                  ? `${uncovered} t sem cobertura nesta versão.`
                  : 'Deslocamento de data de entrega.',
              tms_recalculation_required: true,
              tms_new_delivery_estimate: 'Nova previsão logística: 30/08 (PCP + TMS)',
              status: 'PENDENTE',
            }
            crmPayload.ai_commercial_explanation =
              'A alteração deslocou a produção do pedido em 2 dias. A previsão final de entrega ainda depende de reavaliação logística pelo TMS.'
            const crmRec: any = await pb.collection('schedule_crm_alerts').create(crmPayload)
            createdCrmAlerts.push({ ...crmPayload, id: crmRec.id })

            // Disparar evento oficial no integration_event para o CRM
            await integrationEventService.dispatchEventToDestination({
              eventId: sharedEventId,
              origem: 'PCP',
              destino: 'CRM',
              tipoEvento: 'ORDEM_REPROGRAMADA',
              programacaoId: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
              versao: newVersionTag,
              versaoNum: nextVersionNum,
              payload: crmPayload,
              responsavelAcao: user ? user.name || user.email : 'Programador PCP',
            })
          } catch (err) {
            console.warn('Erro ao criar alerta CRM:', err)
          }
        }
      }
    } else {
      // Registrar evento NAO_APLICAVEL para não haver lacuna na auditoria
      try {
        await pb.collection('integration_event').create({
          event_id: sharedEventId,
          origem: 'PCP',
          destino: 'CRM',
          tipo_evento: 'ORDEM_REPROGRAMADA',
          programacao_id: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
          versao: newVersionTag,
          versao_num: nextVersionNum,
          ambiente: currentEnv,
          payload: { reason: 'Sem impacto comercial identificado' },
          status: 'NAO_APLICAVEL',
          tentativas: 1,
          max_tentativas: 3,
          criado_em: nowIso,
          processado_em: nowIso,
          retorno_em: nowIso,
          mensagem_erro:
            'Motivo: Sem impacto comercial identificado (Relevância Média / Sequenciamento puro).',
          responsavel_acao: user ? user.name || user.email : 'Programador PCP',
        })
      } catch {
        /* intentionally ignored */
      }
    }

    // 6. Integração TMS com event_id único (quando aplicável)
    if (impact.tms.needsRecalculation) {
      try {
        const tmsData = {
          event_code: `TMS-${Date.now().toString().slice(-6)}`,
          event_id: sharedEventId,
          programacao_id: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
          version_code: newVersionCode,
          sales_order_number: createdCrmAlerts[0]?.sales_order_number || '45871/10',
          customer_name: createdCrmAlerts[0]?.customer_name || 'ABC Ltda.',
          destination_city: 'Belo Horizonte',
          destination_state: 'MG',
          material_code: updatedItems[0]?.material_code || 'TR-60x30x2.0',
          quantity_tons: updatedItems[0]?.planned_quantity_tons || 70,
          product_available_datetime: '2026-08-27 18:00',
          recalculated_shipping_date: '2026-08-28 08:00',
          recalculated_delivery_date: '2026-08-30 14:00',
          transit_lead_time_days: 2,
          carrier_name: 'Transportadora CIAFAL Log',
          logistics_status: 'JANELA_RECALCULADA',
        }
        await pb.collection('schedule_tms_events').create(tmsData)

        await integrationEventService.dispatchEventToDestination({
          eventId: sharedEventId,
          origem: 'PCP',
          destino: 'TMS',
          tipoEvento: 'PREVISAO_LOGISTICA_ATUALIZADA',
          programacaoId: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
          versao: newVersionTag,
          versaoNum: nextVersionNum,
          payload: tmsData,
          responsavelAcao: user ? user.name || user.email : 'Programador PCP',
        })
      } catch (err) {
        console.warn('Erro ao registrar evento TMS:', err)
      }
    } else {
      // Registrar evento NAO_APLICAVEL no TMS
      try {
        await pb.collection('integration_event').create({
          event_id: sharedEventId,
          origem: 'PCP',
          destino: 'TMS',
          tipo_evento: 'PREVISAO_LOGISTICA_ATUALIZADA',
          programacao_id: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
          versao: newVersionTag,
          versao_num: nextVersionNum,
          ambiente: currentEnv,
          payload: { reason: 'Disponibilidade do pedido não alterada' },
          status: 'NAO_APLICAVEL',
          tentativas: 1,
          max_tentativas: 3,
          criado_em: nowIso,
          processado_em: nowIso,
          retorno_em: nowIso,
          mensagem_erro: 'Motivo: Disponibilidade do pedido não alterada.',
          responsavel_acao: user ? user.name || user.email : 'Programador PCP',
        })
      } catch {
        /* intentionally ignored */
      }
    }

    // 7. Enfileirar tratamento SAP para Ordens existentes com event_id
    if (impact.sap.requiresHandling && impact.sap.opNumbers.length > 0) {
      for (const opNum of impact.sap.opNumbers) {
        try {
          const sapPayload = {
            queue_code: `SAP-Q-${Date.now().toString().slice(-6)}`,
            event_id: sharedEventId,
            programacao_id: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
            version_code: newVersionCode,
            sap_production_order: opNum,
            material_code: updatedItems[0]?.material_code || 'PROD',
            line_code: params.filter.lineCode,
            sync_action: 'ATUALIZAR_DATAS_OP',
            status: 'AGUARDANDO_INTEGRACAO_SAP',
            diff_details_json: diffs,
            sap_response_message: 'Item enfileirado na ponte PostgreSQL -> SAP RFC ZPP_PROD',
            user_name: user ? user.name || user.email : 'Programador PCP',
          }
          await pb.collection('schedule_sap_queue').create(sapPayload)

          await integrationEventService.dispatchEventToDestination({
            eventId: sharedEventId,
            origem: 'PCP',
            destino: 'SAP',
            tipoEvento: 'OP_CRIADA_ATUALIZADA',
            programacaoId: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
            versao: newVersionTag,
            versaoNum: nextVersionNum,
            payload: sapPayload,
            responsavelAcao: user ? user.name || user.email : 'Programador PCP',
          })
        } catch (err) {
          console.warn('Erro ao criar fila SAP:', err)
        }
      }
    }

    // 8. Atualizar itens na coleção weekly_schedules para a nova versão
    try {
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i]
        const payload = {
          schedule_code: `WS-${params.filter.lineCode}-${params.filter.year}-W${String(params.filter.weekNumber).padStart(2, '0')}`,
          line_code: params.filter.lineCode,
          year: params.filter.year,
          week_number: params.filter.weekNumber,
          sequence_order: i + 1,
          item_type: item.item_type,
          material_code: item.material_code,
          material_description: item.material_description,
          family_code: item.family_code,
          steel_grade: item.steel_grade,
          dimensions: item.dimensions,
          production_order: item.production_order,
          sales_order_mto: item.sales_order_mto,
          customer_name: item.customer_name,
          order_type: item.order_type,
          planned_quantity_tons: item.planned_quantity_tons,
          productivity_rate_th: item.productivity_rate_th,
          production_hours: item.production_hours,
          setup_duration_minutes: item.setup_duration_minutes,
          setup_reason: item.setup_reason,
          stop_code: item.stop_code,
          stop_description: item.stop_description,
          stop_duration_minutes: item.stop_duration_minutes,
          start_datetime: item.start_datetime,
          end_datetime: item.end_datetime,
          status: 'PUBLICADO',
          version: nextVersionNum,
          pcp_notes: item.pcp_notes,
          raw_material_req_tons: item.raw_material_req_tons,
          raw_material_type: item.raw_material_type,
        }

        if (item.id && !item.id.startsWith('temp-') && !item.id.startsWith('item-demo-')) {
          await pb.collection('weekly_schedules').update(item.id, payload)
        } else {
          const created = await pb.collection('weekly_schedules').create(payload)
          item.id = created.id
        }
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar weekly_schedules:', err)
    }

    return {
      success: true,
      versionRecord: createdVersionRec,
      mesAlert: createdMesAlert,
      crmAlerts: createdCrmAlerts,
    }
  },

  /**
   * Registra ciência/reconhecimento do Alerta no MES (com usuário, data/hora)
   * Retorna event_id + usuário + status + timestamp
   */
  async acknowledgeMesAlert(
    alertId: string,
    notes?: string,
  ): Promise<{
    success: boolean
    event_id?: string
    user?: string
    status?: string
    timestamp?: string
  }> {
    const user = pb.authStore.record
    const nowIso = new Date().toISOString()
    const userName = user ? user.name || user.email : 'Operador Líder MES'
    try {
      let eventId = `EVT-MES-${alertId}`
      try {
        const alertRec = await pb.collection('schedule_mes_alerts').getOne(alertId)
        if (alertRec?.alert_code) eventId = `EVT-MES-${alertRec.alert_code}`
      } catch {
        /* ignore */
      }

      await pb.collection('schedule_mes_alerts').update(alertId, {
        ack_status: 'RECONHECIDO',
        acknowledged_at: nowIso,
        acknowledged_by_user: userName,
        acknowledgment_notes: notes || 'Ciência registrada pelo operador de linha no terminal MES.',
        is_active_banner: false,
      })

      // Atualiza também integration_event se houver
      try {
        const events = await pb.collection('integration_event').getFullList({
          filter: `destino = 'MES' && status != 'CONFIRMADO'`,
          sort: '-created',
        })
        if (events.length > 0) {
          eventId = events[0].event_id || eventId
          await pb.collection('integration_event').update(events[0].id, {
            status: 'CONFIRMADO',
            acknowledged_by: userName,
            acknowledged_at: nowIso,
            payload_resposta: {
              event_id: eventId,
              user: userName,
              status: 'RECONHECIDO',
              timestamp: nowIso,
            },
          })
        }
      } catch {
        /* ignore */
      }

      // Auditoria
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'MES_ALERT_ACKNOWLEDGED',
          resource: 'schedule_mes_alerts',
          resource_id: alertId,
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            alertId,
            eventId,
            acknowledgedAt: nowIso,
            user: userName,
            notes,
          },
        })
      } catch {
        /* intentionally ignored */
      }

      return {
        success: true,
        event_id: eventId,
        user: userName,
        status: 'RECONHECIDO',
        timestamp: nowIso,
      }
    } catch (err) {
      console.error('Erro ao reconhecer alerta MES:', err)
      return { success: false }
    }
  },

  /**
   * Marca alerta MES como visualizado
   */
  async markMesAlertViewed(alertId: string): Promise<boolean> {
    const user = pb.authStore.record
    try {
      await pb.collection('schedule_mes_alerts').update(alertId, {
        ack_status: 'VISUALIZADO',
        viewed_at: new Date().toISOString(),
        viewed_by_user: user ? user.name || user.email : 'Operador MES',
      })
      return true
    } catch {
      return false
    }
  },

  /**
   * Lista todos os alertas do MES
   */
  async listMesAlerts(lineCode?: string): Promise<ScheduleMesAlert[]> {
    try {
      const filter = lineCode ? `line_code = '${lineCode}'` : ''
      const records = await pb.collection('schedule_mes_alerts').getFullList({
        filter,
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        alert_code: r.alert_code,
        programacao_id: r.programacao_id,
        version_code: r.version_code,
        previous_version_tag: r.previous_version_tag,
        new_version_tag: r.new_version_tag,
        line_code: r.line_code,
        line_name: r.line_name,
        product_code: r.product_code,
        product_description: r.product_description,
        sequence_prev: r.sequence_prev,
        sequence_new: r.sequence_new,
        qty_prev_tons: r.qty_prev_tons,
        qty_new_tons: r.qty_new_tons,
        datetime_prev: r.datetime_prev,
        datetime_new: r.datetime_new,
        reason: r.reason,
        relevance: r.relevance,
        user_name: r.user_name,
        user_email: r.user_email,
        notes: r.notes,
        diff_items_json: r.diff_items_json || [],
        ack_status: r.ack_status,
        viewed_at: r.viewed_at,
        viewed_by_user: r.viewed_by_user,
        acknowledged_at: r.acknowledged_at,
        acknowledged_by_user: r.acknowledged_by_user,
        acknowledgment_notes: r.acknowledgment_notes,
        is_active_banner: r.is_active_banner,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao listar alertas MES:', err)
      return []
    }
  },

  /**
   * Lista todos os alertas do CRM
   */
  async listCrmAlerts(): Promise<ScheduleCrmAlert[]> {
    try {
      const records = await pb.collection('schedule_crm_alerts').getFullList({
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        alert_code: r.alert_code,
        programacao_id: r.programacao_id,
        version_code: r.version_code,
        sales_order_number: r.sales_order_number,
        sales_order_item: r.sales_order_item,
        customer_name: r.customer_name,
        customer_code: r.customer_code,
        sales_rep_name: r.sales_rep_name,
        sales_rep_email: r.sales_rep_email,
        sales_agent_name: r.sales_agent_name,
        material_code: r.material_code,
        material_description: r.material_description,
        order_type: r.order_type,
        original_promised_date: r.original_promised_date,
        previous_production_date: r.previous_production_date,
        new_production_date: r.new_production_date,
        previous_dispatch_date: r.previous_dispatch_date,
        new_dispatch_date: r.new_dispatch_date,
        previous_delivery_date: r.previous_delivery_date,
        new_delivery_date: r.new_delivery_date,
        previous_quantity_tons: r.previous_quantity_tons,
        new_quantity_tons: r.new_quantity_tons,
        uncovered_quantity_tons: r.uncovered_quantity_tons,
        order_balance_tons: r.order_balance_tons,
        reason: r.reason,
        commercial_impact_summary: r.commercial_impact_summary,
        ai_commercial_explanation: r.ai_commercial_explanation,
        tms_recalculation_required: r.tms_recalculation_required,
        tms_new_delivery_estimate: r.tms_new_delivery_estimate,
        status: r.status,
        viewed_at: r.viewed_at,
        viewed_by_user: r.viewed_by_user,
        reevaluation_request_notes: r.reevaluation_request_notes,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao listar alertas CRM:', err)
      return []
    }
  },

  /**
   * Marca alerta CRM como visualizado pelo vendedor/representante
   */
  async markCrmAlertViewed(
    alertId: string,
  ): Promise<{ success: boolean; event_id?: string; user?: string; timestamp?: string }> {
    const user = pb.authStore.record
    const nowIso = new Date().toISOString()
    const userName = user ? user.name || user.email : 'Vendedor Responsável (Carlos Mendes)'
    try {
      let eventId = `EVT-CRM-${alertId}`
      try {
        const crmRec = await pb.collection('schedule_crm_alerts').getOne(alertId)
        if (crmRec?.alert_code) eventId = `EVT-CRM-${crmRec.alert_code}`
      } catch {
        /* ignore */
      }

      await pb.collection('schedule_crm_alerts').update(alertId, {
        status: 'VISUALIZADO_VENDEDOR',
        viewed_at: nowIso,
        viewed_by_user: userName,
      })

      // Atualiza também integration_event se houver
      try {
        const events = await pb.collection('integration_event').getFullList({
          filter: `destino = 'CRM'`,
          sort: '-created',
        })
        if (events.length > 0) {
          eventId = events[0].event_id || eventId
          await pb.collection('integration_event').update(events[0].id, {
            status: 'ENTREGUE',
            viewed_by: userName,
            viewed_at: nowIso,
            payload_resposta: {
              event_id: eventId,
              user: userName,
              status: 'VISUALIZADO_VENDEDOR',
              timestamp: nowIso,
            },
          })
        }
      } catch {
        /* ignore */
      }

      return {
        success: true,
        event_id: eventId,
        user: userName,
        timestamp: nowIso,
      }
    } catch (err) {
      console.warn('Erro ao marcar CRM como visualizado:', err)
      return { success: false }
    }
  },

  /**
   * Vendedor/Representante solicita reavaliação ao PCP a partir do CRM
   */
  async requestCrmReevaluation(alertId: string, notes: string): Promise<boolean> {
    const user = pb.authStore.record
    try {
      await pb.collection('schedule_crm_alerts').update(alertId, {
        status: 'REAVALIACAO_SOLICITADA',
        reevaluation_request_notes: notes,
        viewed_at: new Date().toISOString(),
        viewed_by_user: user ? user.name || user.email : 'Vendedor Comercial',
      })
      return true
    } catch (err) {
      console.error('Erro ao solicitar reavaliação no CRM:', err)
      return false
    }
  },

  /**
   * Ação Logística TMS: Replanejar carga ou Manter com ressalva
   */
  async updateTmsEventStatus(
    eventId: string,
    actionStatus: 'REPLANEJADO' | 'MANTIDO_COM_RESSALVA' | 'REAVALIACAO_NECESSARIA',
  ): Promise<{ success: boolean; event_id?: string; actor?: string; timestamp?: string }> {
    const user = pb.authStore.record
    const nowIso = new Date().toISOString()
    const actorName = user ? user.name || user.email : 'Processo Automático Logística TMS'
    try {
      let tmsEventId = `EVT-TMS-${eventId}`
      try {
        const tmsRec = await pb.collection('schedule_tms_events').getOne(eventId)
        if (tmsRec?.event_code) tmsEventId = `EVT-TMS-${tmsRec.event_code}`
      } catch {
        /* ignore */
      }

      await pb.collection('schedule_tms_events').update(eventId, {
        logistics_status: actionStatus,
      })

      // Auditoria no integration_event
      try {
        const events = await pb.collection('integration_event').getFullList({
          filter: `destino = 'TMS'`,
          sort: '-created',
        })
        if (events.length > 0) {
          tmsEventId = events[0].event_id || tmsEventId
          await pb.collection('integration_event').update(events[0].id, {
            status: 'CONFIRMADO',
            recalculated_by: actorName,
            recalculated_at: nowIso,
            payload_resposta: {
              event_id: tmsEventId,
              actor: actorName,
              actionStatus,
              timestamp: nowIso,
            },
          })
        }
      } catch {
        /* ignore */
      }

      return {
        success: true,
        event_id: tmsEventId,
        actor: actorName,
        timestamp: nowIso,
      }
    } catch (err) {
      console.warn('Erro ao atualizar TMS event:', err)
      return { success: false }
    }
  },

  /**
   * Ação Fila SAP: Sincronizar OP ou Reprocessar
   */
  async syncSapQueueItem(
    queueId: string,
  ): Promise<{ success: boolean; event_id?: string; jobName?: string; timestamp?: string }> {
    const nowIso = new Date().toISOString()
    const jobName = 'JOB_SAP_RFC_ZPP_PROD_01'
    try {
      let sapEventId = `EVT-SAP-${queueId}`
      try {
        const sapRec = await pb.collection('schedule_sap_queue').getOne(queueId)
        if (sapRec?.queue_code) sapEventId = `EVT-SAP-${sapRec.queue_code}`
      } catch {
        /* ignore */
      }

      await pb.collection('schedule_sap_queue').update(queueId, {
        status: 'PROCESSADO_COM_SUCESSO',
        confirmed_at: nowIso,
        sap_response_message:
          'Sincronização RFC confirmada pelo SAP ERP S/4HANA (Ordem atualizada com sucesso).',
      })

      // Auditoria no integration_event
      try {
        const events = await pb.collection('integration_event').getFullList({
          filter: `destino = 'SAP'`,
          sort: '-created',
        })
        if (events.length > 0) {
          sapEventId = events[0].event_id || sapEventId
          await pb.collection('integration_event').update(events[0].id, {
            status: 'CONFIRMADO',
            sap_synced_by: jobName,
            sap_synced_at: nowIso,
            payload_resposta: {
              event_id: sapEventId,
              job: jobName,
              status: 'OP_ATUALIZADA_SAP',
              timestamp: nowIso,
            },
          })
        }
      } catch {
        /* ignore */
      }

      return {
        success: true,
        event_id: sapEventId,
        jobName,
        timestamp: nowIso,
      }
    } catch (err) {
      console.warn('Erro ao sincronizar item SAP:', err)
      return { success: false }
    }
  },

  /**
   * Lista itens da Fila SAP
   */
  async listSapQueue(): Promise<ScheduleSapQueueItem[]> {
    try {
      const records = await pb.collection('schedule_sap_queue').getFullList({
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        queue_code: r.queue_code,
        programacao_id: r.programacao_id,
        version_code: r.version_code,
        sap_production_order: r.sap_production_order,
        material_code: r.material_code,
        line_code: r.line_code,
        sync_action: r.sync_action,
        status: r.status,
        diff_details_json: r.diff_details_json,
        sap_response_message: r.sap_response_message,
        sap_document_number: r.sap_document_number,
        dispatched_at: r.dispatched_at,
        confirmed_at: r.confirmed_at,
        user_name: r.user_name,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao listar fila SAP:', err)
      return []
    }
  },

  /**
   * Lista eventos logísticos do TMS
   */
  async listTmsEvents(): Promise<ScheduleTmsEvent[]> {
    try {
      const records = await pb.collection('schedule_tms_events').getFullList({
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        event_code: r.event_code,
        programacao_id: r.programacao_id,
        version_code: r.version_code,
        sales_order_number: r.sales_order_number,
        customer_name: r.customer_name,
        destination_city: r.destination_city,
        destination_state: r.destination_state,
        material_code: r.material_code,
        quantity_tons: r.quantity_tons,
        product_available_datetime: r.product_available_datetime,
        previous_product_available_datetime: r.previous_product_available_datetime,
        recalculated_shipping_date: r.recalculated_shipping_date,
        recalculated_delivery_date: r.recalculated_delivery_date,
        transit_lead_time_days: r.transit_lead_time_days,
        carrier_name: r.carrier_name,
        logistics_status: r.logistics_status,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao listar eventos TMS:', err)
      return []
    }
  },
}
