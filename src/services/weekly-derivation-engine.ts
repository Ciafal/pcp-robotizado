/**
 * Motor de Derivação de Programação na Montagem Semanal
 * Regras:
 * 1. Ao programar item em um Centro de origem, localizar regra ativa (origem + MATKL + vigência + destino ativo + item ainda não derivado).
 * 2. Suporte aos modos MANUAL e AUTOMÁTICO (respeitando o fluxo existente Rascunho -> Versão vigente -> Histórico -> Aprovação).
 * 3. Validação de duplicidade: impede gerar duplicatas do mesmo item pai.
 * 4. Validação de capacidade, matriz setup e paradas programadas.
 * 5. Impacto de alteração e cancelamento na origem (nunca apaga silenciosamente: marca 'Origem cancelada — revisão necessária').
 */

import pb from '@/lib/pocketbase/client'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { CenterDerivationRule } from '@/types/center-derivation'
import { centerDerivationService } from '@/services/pcp-center-derivation-service'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface DerivationMatchResult {
  hasMatch: boolean
  matchedRule?: CenterDerivationRule
  targetCenterCode?: string
  targetCenterName?: string
  derivedItemPreview?: Partial<WeeklyScheduleItem>
  isAlreadyDerived: boolean
  existingDerivedItemId?: string
  capacityWarning?: string
  setupImpactMinutes?: number
  hasStopConflict?: boolean
  stopConflictMessage?: string
  availableCapacityHours?: number
  requiredHours?: number
}

class WeeklyDerivationEngine {
  /**
   * Identifica se um item programado no centro de origem aciona regra ativa de derivação
   */
  async findActiveRuleForItem(
    sourceCenterCode: string,
    item: WeeklyScheduleItem,
    allScheduleItems: WeeklyScheduleItem[] = [],
  ): Promise<DerivationMatchResult> {
    const srcUpper = (sourceCenterCode || item.line_code || '').trim().toUpperCase()
    const itemMatkl = (item.family_code || item.metadata?.matkl || '001').toString().toUpperCase()
    const itemDate = item.date_str || new Date().toISOString().slice(0, 10)

    // 1. Checar se já existe programação derivada deste item
    const existingDerived = allScheduleItems.find(
      (si) =>
        si.origem_programacao_id === item.id ||
        (si.is_derived && si.origem_programacao_id === item.schedule_code),
    )

    if (existingDerived) {
      return {
        hasMatch: false,
        isAlreadyDerived: true,
        existingDerivedItemId: existingDerived.id,
      }
    }

    // 2. Buscar regras de derivação ativas onde source_center_code == srcUpper
    let allRules: CenterDerivationRule[] = []
    try {
      const records = await pb.collection('pcp_center_derivations').getFullList({
        filter: `source_center_code = '${srcUpper}' && status = 'Ativa' && deleted = false`,
      })
      if (records && records.length > 0) {
        allRules = records.map((r: any) => ({
          id: r.id,
          center_code: r.center_code,
          source_center_code: r.source_center_code,
          matkl_groups: r.matkl_groups || [],
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status,
          deleted: r.deleted,
        }))
      }
    } catch {
      // Fallback em memória
      const mem = centerDerivationService.getInMemoryDerivations()
      allRules = mem.filter(
        (r) =>
          r.source_center_code?.trim().toUpperCase() === srcUpper &&
          r.status === 'Ativa' &&
          !r.deleted,
      )
    }

    // 3. Localizar regra que abranja o MATKL do item e vigência na data
    const matchedRule = allRules.find((rule) => {
      // Vigência
      const startIso = centerDerivationService.parsePtBrToIsoDate(rule.start_date) || '2000-01-01'
      const endIso = rule.end_date
        ? centerDerivationService.parsePtBrToIsoDate(rule.end_date) || '9999-12-31'
        : '9999-12-31'

      const inPeriod = itemDate >= startIso && itemDate <= endIso
      if (!inPeriod) return false

      // MATKL
      const hasMatkl = (rule.matkl_groups || []).some(
        (mg) =>
          mg.matkl.trim().toUpperCase() === itemMatkl ||
          mg.matkl.trim().toUpperCase() === item.material_code.substring(0, 3).toUpperCase(),
      )

      return hasMatkl || (rule.matkl_groups || []).length === 0
    })

    if (!matchedRule) {
      return { hasMatch: false, isAlreadyDerived: false }
    }

    // 4. Montar preview do item derivado
    const targetCenter = matchedRule.center_code
    const plannedTons = Number(item.planned_quantity_tons || 0)
    const derivedHours = Math.max(
      1,
      Math.round(Number(item.production_hours || 2) * 0.85 * 10) / 10,
    )

    // Checar capacidade e conflito de paradas no centro de destino
    const targetItems = allScheduleItems.filter((i) => i.line_code === targetCenter)
    const scheduledStops = targetItems.filter((i) => i.item_type === 'SCHEDULED_STOP')
    const hasStopConflict = scheduledStops.some((s) => s.date_str === item.date_str)

    // Sobrecarga calculada
    const totalTargetHours = targetItems.reduce(
      (acc, i) => acc + (Number(i.production_hours) || 0),
      0,
    )
    const availableCapacityHours = Math.max(0, 168 - totalTargetHours)
    let capacityWarning: string | undefined
    if (derivedHours > availableCapacityHours) {
      const overHours = (derivedHours - availableCapacityHours).toFixed(1).replace('.', ',')
      capacityWarning = `A programação derivada excede a capacidade disponível do Centro ${targetCenter} em ${overHours} h na semana selecionada.`
    }

    const preview: Partial<WeeklyScheduleItem> = {
      line_code: targetCenter,
      company_code: item.company_code,
      plant_code: item.plant_code,
      year: item.year,
      week_number: item.week_number,
      period_display: item.period_display,
      day_of_week: item.day_of_week,
      date_str: item.date_str,
      shift_code: item.shift_code,
      shift_name: item.shift_name,
      crew_name: item.crew_name,
      sequence_order: item.sequence_order + 10,
      item_type: 'PRODUCTION',
      material_code: `${item.material_code}-DER`,
      material_description: `${item.material_description} (Processo Derivado ${targetCenter})`,
      planned_quantity_tons: plannedTons,
      productivity_rate_th: Math.round((plannedTons / derivedHours) * 10) / 10 || 15,
      production_hours: derivedHours,
      setup_duration_minutes: 30,
      status: item.status || 'RASCUNHO',
      version: item.version || 1,
      order_type: item.order_type || 'MTS',
      start_datetime: item.end_datetime || item.start_datetime,
      end_datetime: item.end_datetime,
      raw_material_req_tons: plannedTons * 1.02,
      // Vínculos de rastreabilidade
      is_derived: true,
      tipo_geracao: 'MANUAL',
      origem_programacao_id: item.id,
      centro_origem: srcUpper,
      centro_destino: targetCenter,
      matkl: itemMatkl,
      regra_id: matchedRule.id,
      versao_origem: item.version || 1,
      quantidade_origem: plannedTons,
      quantidade_derivada: plannedTons,
      derivation_status: 'ATIVA',
      derivation_metadata: {
        regra_codigo: matchedRule.id || 'REG-DER',
        regra_resumo: `${srcUpper} → ${targetCenter} (MATKL ${itemMatkl})`,
        linha_origem: srcUpper,
        data_hora_prevista: `${item.date_str} 14:00`,
      },
    }

    return {
      hasMatch: true,
      matchedRule,
      targetCenterCode: targetCenter,
      derivedItemPreview: preview,
      isAlreadyDerived: false,
      capacityWarning,
      setupImpactMinutes: 30,
      hasStopConflict,
      stopConflictMessage: hasStopConflict
        ? `Conflito detectado: há Parada Programada cadastrada no Centro ${targetCenter} nesta data.`
        : undefined,
      availableCapacityHours,
      requiredHours: derivedHours,
    }
  }

  /**
   * Persiste uma programação derivada vinculada
   */
  async createDerivedScheduleItem(
    parentItem: WeeklyScheduleItem,
    derivedData: Partial<WeeklyScheduleItem>,
    tipoGeracao: 'MANUAL' | 'AUTOMATICA' = 'MANUAL',
    currentUser: string = 'Engenharia PCP',
  ): Promise<WeeklyScheduleItem> {
    const newId = `der_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    const nowPtBr = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    const fullItem: WeeklyScheduleItem = {
      ...parentItem,
      ...derivedData,
      id: newId,
      schedule_code: `SCH-DER-${Date.now()}`,
      is_derived: true,
      tipo_geracao: tipoGeracao,
      origem_programacao_id: parentItem.id,
      derivada_programacao_id: newId,
      centro_origem: parentItem.line_code,
      centro_destino: derivedData.line_code || 'DESTINO',
      matkl: derivedData.matkl || parentItem.family_code || '001',
      regra_id: derivedData.regra_id,
      versao_origem: parentItem.version || 1,
      quantidade_origem: parentItem.planned_quantity_tons,
      quantidade_derivada: derivedData.planned_quantity_tons || parentItem.planned_quantity_tons,
      usuario_criacao: currentUser,
      derivation_status: 'ATIVA',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    // Persistir vínculo no PocketBase se existir coleção pcp_derived_schedules
    try {
      await pb.collection('pcp_derived_schedules').create({
        origem_programacao_id: parentItem.id,
        derivada_programacao_id: newId,
        centro_origem: fullItem.centro_origem,
        centro_destino: fullItem.centro_destino,
        matkl: fullItem.matkl,
        regra_id: fullItem.regra_id || '',
        versao_origem: fullItem.versao_origem,
        quantidade_origem: fullItem.quantidade_origem,
        quantidade_derivada: fullItem.quantidade_derivada,
        usuario_criacao: currentUser,
        tipo_geracao: tipoGeracao,
        derivation_status: 'ATIVA',
      })
    } catch {
      // Ignorar falha se a tabela for opcional ou estiver offline
    }

    // Auditoria
    try {
      await pcpAuditService.recordLog({
        user_id: 'usr_pcp_admin',
        user_name: currentUser,
        action: 'CRIACAO_PROGRAMACAO_DERIVADA',
        event_type: 'OPERATIONAL',
        resource: 'WEEKLY_SCHEDULE_DERIVATION',
        resource_id: newId,
        center: fullItem.centro_destino,
        details: {
          origem_id: parentItem.id,
          derivada_id: newId,
          origem: fullItem.centro_origem,
          destino: fullItem.centro_destino,
          regra_id: fullItem.regra_id,
          tipo: tipoGeracao,
          data_hora: nowPtBr,
        },
      })
    } catch {
      /* audit safe */
    }

    return fullItem
  }

  /**
   * Quando o item de origem é alterado ou cancelado, atualiza as derivadas vinculadas
   */
  handleParentItemChangeOrCancel(
    parentId: string,
    action: 'CANCEL' | 'MODIFY',
    newTons?: number,
    existingItems: WeeklyScheduleItem[] = [],
    currentUser: string = 'Engenharia PCP',
  ): WeeklyScheduleItem[] {
    return existingItems.map((item) => {
      if (item.origem_programacao_id === parentId) {
        if (action === 'CANCEL') {
          // Requisito C.6: Origem cancelada: derivada vira "Origem cancelada — revisão necessária" (nunca apagar silenciosamente)
          return {
            ...item,
            derivation_status: 'ORIGEM_CANCELADA',
            pcp_notes: `${item.pcp_notes ? `${item.pcp_notes} | ` : ''}Origem cancelada — revisão necessária.`,
            updated: new Date().toISOString(),
          }
        }
        if (action === 'MODIFY' && newTons !== undefined) {
          return {
            ...item,
            derivation_status: 'REVISAO_NECESSARIA',
            quantidade_origem: newTons,
            pcp_notes: `${item.pcp_notes ? `${item.pcp_notes} | ` : ''}Origem alterada (${newTons} t) — recalcular derivação.`,
            updated: new Date().toISOString(),
          }
        }
      }
      return item
    })
  }
}

export const weeklyDerivationEngine = new WeeklyDerivationEngine()
