import pb from '@/lib/pocketbase/client'
import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  OfficialMaterialOption,
} from '@/types/weekly-schedule'
import { lineMasterService } from '@/services/line-master'
import { LineOverviewData } from '@/types/line-master'

export const weeklyScheduleService = {
  /**
   * Busca os materiais cadastrados oficialmente no SAP / Ficha Mestre da Linha
   */
  async getOfficialMaterialsForLine(
    lineId: string,
    lineOverview?: LineOverviewData | null,
  ): Promise<OfficialMaterialOption[]> {
    const overview = lineOverview || (await lineMasterService.getLineOverview(lineId))
    const list: OfficialMaterialOption[] = []

    // 1. Materiais cadastrados na Ficha Mestre com taxas de produtividade
    if (overview.productivity && overview.productivity.length > 0) {
      overview.productivity.forEach((p) => {
        list.push({
          material_code: p.material_product_code,
          material_name: p.material_product_name || p.material_product_code,
          family_code: p.expand?.product_family_id?.code || 'GERAL',
          family_name: p.expand?.product_family_id?.name || 'Geral',
          dimension_spec: p.dimension_spec || '50x50 mm #2.00',
          steel_grade: 'SAE 1020',
          productivity_th: p.planned_productivity || p.nominal_productivity || 12.0,
          default_order_type: 'MTS',
        })
      })
    }

    // 2. Materiais cadastrados em prioridades de matéria-prima ou produtos da linha
    if (overview.rawMaterials && overview.rawMaterials.length > 0) {
      overview.rawMaterials.forEach((rm) => {
        if (
          !list.some((item) => item.material_code.toUpperCase() === rm.material_code.toUpperCase())
        ) {
          list.push({
            material_code: rm.material_code,
            material_name: rm.material_description || rm.material_code,
            family_code: rm.expand?.product_family_id?.code || 'MP_GERAL',
            family_name: rm.expand?.product_family_id?.name || 'Matéria Prima',
            steel_grade: 'ASTM A36',
            productivity_th: 12.0,
            default_order_type: 'MTS',
          })
        }
      })
    }

    // 3. Materiais com bloqueio cadastrado (para garantir que o sistema conheça e possa bloquear com HARD BLOCK)
    if (overview.blockedProducts && overview.blockedProducts.length > 0) {
      overview.blockedProducts.forEach((b) => {
        if (
          !list.some((item) => item.material_code.toUpperCase() === b.product_code.toUpperCase())
        ) {
          list.push({
            material_code: b.product_code,
            material_name: b.product_description || b.product_code,
            family_code: b.expand?.product_family_id?.code || 'BLOQUEADO',
            family_name: 'Bloqueado na Linha',
            steel_grade: 'SAE 1045',
            productivity_th: 10.0,
            default_order_type: 'MTO',
          })
        }
      })
    }

    // Fallback de catálogo oficial homologado CIAFAL se a linha tiver poucos dados cadastrados
    const officialCatalog: OfficialMaterialOption[] = [
      {
        material_code: 'TQ-50x50x2.0',
        material_name: 'Tubo Quadrado 50x50x2.0mm',
        family_code: '10x1ou865v4sv8q',
        family_name: 'Tubo Quadrado',
        dimension_spec: '50x50 mm #2.00',
        steel_grade: 'SAE 1020',
        productivity_th: 11.8,
        default_order_type: 'MTS',
      },
      {
        material_code: 'TR-80x40x2.5',
        material_name: 'Tubo Retangular 80x40x2.5mm',
        family_code: 'f1w4lkse2qlf3xz',
        family_name: 'Tubo Retangular',
        dimension_spec: '80x40 mm #2.50',
        steel_grade: 'SAE 1020',
        productivity_th: 10.2,
        default_order_type: 'MTS',
      },
      {
        material_code: 'TQ-100x100x8.0',
        material_name: 'Tubo Quadrado 100x100x8.0mm Parede Extrapesada',
        family_code: '10x1ou865v4sv8q',
        family_name: 'Tubo Quadrado',
        dimension_spec: '100x100 mm #8.00',
        steel_grade: 'ASTM A36',
        productivity_th: 8.5,
        default_order_type: 'MTO',
      },
      {
        material_code: 'TQ-GALV-40x40',
        material_name: 'Tubo Pré-Galvanizado 40x40mm',
        family_code: '10x1ou865v4sv8q',
        family_name: 'Tubo Quadrado',
        dimension_spec: '40x40 mm #1.50',
        steel_grade: 'Galvanizado Z275',
        productivity_th: 13.0,
        default_order_type: 'MTS',
      },
      {
        material_code: 'PU-150x50x4.75',
        material_name: 'Perfil U Enrijecido 150x50x4.75mm',
        family_code: 'azlmlkd68l59f0c',
        family_name: 'Perfil U',
        dimension_spec: '150x50 mm #4.75',
        steel_grade: 'ASTM A36',
        productivity_th: 16.5,
        default_order_type: 'MTS',
      },
      {
        material_code: 'PU-FINO-1.20',
        material_name: 'Perfil U Chapa Fina #1.20mm',
        family_code: 'azlmlkd68l59f0c',
        family_name: 'Perfil U',
        dimension_spec: '100x40 mm #1.20',
        steel_grade: 'SAE 1010',
        productivity_th: 15.0,
        default_order_type: 'MTO',
      },
    ]

    officialCatalog.forEach((cat) => {
      if (!list.some((l) => l.material_code.toUpperCase() === cat.material_code.toUpperCase())) {
        list.push(cat)
      }
    })

    return list
  },

  /**
   * Carrega os itens da programação semanal para uma linha e semana específica
   */
  async loadWeeklySchedule(filter: WeeklyHeaderFilter): Promise<WeeklyScheduleItem[]> {
    try {
      const records = await pb.collection('weekly_schedules').getFullList({
        filter: `line_code = '${filter.lineCode}' && year = ${filter.year} && week_number = ${filter.weekNumber}`,
        sort: 'sequence_order',
      })

      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          schedule_code: r.schedule_code,
          company_code: r.company_code,
          plant_code: r.plant_code,
          line_code: r.line_code,
          line_id: r.line_id,
          year: r.year,
          week_number: r.week_number,
          period_display: r.period_display,
          day_of_week: r.day_of_week,
          date_str: r.date_str,
          shift_code: r.shift_code,
          shift_name: r.shift_name,
          crew_name: r.crew_name,
          sequence_order: r.sequence_order,
          item_type: r.item_type || 'PRODUCTION',
          material_code: r.material_code,
          material_description: r.material_description,
          family_code: r.family_code,
          steel_grade: r.steel_grade,
          dimensions: r.dimensions,
          production_order: r.production_order,
          sales_order_mto: r.sales_order_mto,
          customer_name: r.customer_name,
          order_type: r.order_type || 'MTS',
          planned_quantity_tons: Number(r.planned_quantity_tons) || 0,
          productivity_rate_th: Number(r.productivity_rate_th) || 12.0,
          production_hours: Number(r.production_hours) || 0,
          setup_duration_minutes: Number(r.setup_duration_minutes) || 0,
          setup_reason: r.setup_reason,
          stop_code: r.stop_code,
          stop_description: r.stop_description,
          stop_duration_minutes: Number(r.stop_duration_minutes) || 0,
          start_datetime: r.start_datetime,
          end_datetime: r.end_datetime,
          status: r.status || 'DRAFT',
          version: r.version || 1,
          pcp_notes: r.pcp_notes,
          raw_material_req_tons: Number(r.raw_material_req_tons) || 0,
          raw_material_type: r.raw_material_type,
          is_blocked_attempt: r.is_blocked_attempt || false,
          metadata: r.metadata || {},
          created: r.created,
          updated: r.updated,
        }))
      }
    } catch (err) {
      console.warn(
        'Nenhuma programação semanal gravada para os filtros informados, iniciando rascunho limpo:',
        err,
      )
    }

    return []
  },

  /**
   * Salva os itens da programação semanal (Rascunho)
   */
  async saveWeeklyScheduleDraft(
    items: WeeklyScheduleItem[],
    filter: WeeklyHeaderFilter,
  ): Promise<boolean> {
    const user = pb.authStore.record
    const scheduleCode = `WS-${filter.lineCode}-${filter.year}-W${String(filter.weekNumber).padStart(2, '0')}`

    try {
      // 1. Salva ou atualiza cada item na coleção weekly_schedules
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const payload = {
          schedule_code: scheduleCode,
          company_code: filter.companyCode,
          plant_code: filter.plantCode,
          line_code: filter.lineCode,
          year: filter.year,
          week_number: filter.weekNumber,
          period_display: filter.periodDisplay,
          day_of_week: item.day_of_week,
          date_str: item.date_str,
          shift_code: item.shift_code,
          shift_name: item.shift_name,
          crew_name: item.crew_name,
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
          status: 'DRAFT',
          version: item.version || 1,
          pcp_notes: item.pcp_notes,
          raw_material_req_tons: item.raw_material_req_tons,
          raw_material_type: item.raw_material_type,
          is_blocked_attempt: false,
          metadata: {
            saved_by: user ? user.name || user.email : 'Programador PCP',
            saved_at: new Date().toISOString(),
          },
        }

        if (item.id && !item.id.startsWith('temp-')) {
          await pb.collection('weekly_schedules').update(item.id, payload)
        } else {
          const created = await pb.collection('weekly_schedules').create(payload)
          item.id = created.id
        }
      }

      // 2. Registra na trilha de auditoria oficial
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'WEEKLY_SCHEDULE_DRAFT_SAVED',
          resource: 'weekly_schedules',
          resource_id: scheduleCode,
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            lineCode: filter.lineCode,
            year: filter.year,
            weekNumber: filter.weekNumber,
            itemsCount: items.length,
            totalTons: items.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0),
          },
        })
      } catch {
        /* intentionally ignored */
      }

      return true
    } catch (err) {
      console.error('Erro ao salvar rascunho da programação semanal:', err)
      throw err
    }
  },

  /**
   * Registra no log de auditoria uma tentativa de inclusão de material bloqueado (HARD BLOCK)
   */
  async logBlockedProductAttempt(data: {
    materialCode: string
    materialDescription: string
    lineCode: string
    reason: string
    notes?: string
  }): Promise<void> {
    const user = pb.authStore.record
    try {
      await pb.collection('pcp_audit_logs').create({
        event_type: 'UNAUTHORIZED_ACTION_ATTEMPT',
        action: 'BLOCKED_PRODUCT_INCLUSION_ATTEMPT',
        resource: 'line_blocked_products',
        resource_id: data.materialCode,
        permission_required: 'pcp.weekly_schedule.edit',
        scope: 'PRODUCTION_LINE',
        outcome: 'DENY',
        details: {
          user_id: user?.id,
          user_name: user?.name || user?.email,
          materialCode: data.materialCode,
          materialDescription: data.materialDescription,
          lineCode: data.lineCode,
          blockReason: data.reason,
          notes:
            data.notes ||
            'Tentativa de inclusão de material com restrição técnica/bloqueio na linha.',
          attemptedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error('Falha ao gravar auditoria de bloqueio:', err)
    }
  },
}
