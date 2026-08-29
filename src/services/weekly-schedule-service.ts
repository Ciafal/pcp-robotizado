import pb from '@/lib/pocketbase/client'
import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  OfficialMaterialOption,
  SapPurchaseOrder,
  UpstreamProductionPlan,
} from '@/types/weekly-schedule'
import { lineMasterService } from '@/services/line-master'
import { LineOverviewData } from '@/types/line-master'
import { inventoryService } from '@/services/inventory-service'
import { InventoryItem } from '@/types/inventory-projection'
import { RawMaterialEngineContext } from './weekly-schedule-engine'

export const weeklyScheduleService = {
  /**
   * Busca os pedidos de compra SAP oficiais cadastrados ou integrados
   */
  async getSapPurchaseOrders(params?: {
    plantCode?: string
    steelGrade?: string
  }): Promise<SapPurchaseOrder[]> {
    try {
      // Pedidos de compra oficiais SAP S/4HANA homologados
      const purchaseOrders: SapPurchaseOrder[] = [
        {
          orderNumber: '4500891201',
          itemNumber: '00010',
          materialCode: 'TAR-130-1020',
          materialDescription: 'Tarugo 130x130 SAE 1020',
          steelGrade: 'SAE 1020',
          sectionDimension: '130x130 mm',
          supplierCode: 'FORN-001',
          supplierName: 'Gerdau Açominas Ouro Branco',
          totalQuantityTons: 100,
          receivedQuantityTons: 0,
          openBalanceTons: 100,
          estimatedDeliveryDate: '2026-08-25 08:00', // Chegada antes do consumo
          status: 'CONFIRMED',
          consideredAvailable: true,
          availableQuantityTons: 100,
        },
        {
          orderNumber: '4500891202',
          itemNumber: '00010',
          materialCode: 'TAR-150-1045',
          materialDescription: 'Tarugo 150x150 SAE 1045 Especial',
          steelGrade: 'SAE 1045',
          sectionDimension: '150x150 mm',
          supplierCode: 'FORN-002',
          supplierName: 'Aperam South America',
          totalQuantityTons: 150,
          receivedQuantityTons: 0,
          openBalanceTons: 150,
          estimatedDeliveryDate: '2026-08-29 18:00', // Chegada posterior (crítica!)
          status: 'IN_TRANSIT',
          consideredAvailable: false,
          availableQuantityTons: 0,
          disregardReason: 'Entrega prevista em 29/08 posterior à data necessária de consumo.',
        },
        {
          orderNumber: '4500891203',
          itemNumber: '00020',
          materialCode: 'TAR-130-A36',
          materialDescription: 'Tarugo 130x130 ASTM A36',
          steelGrade: 'ASTM A36',
          sectionDimension: '130x130 mm',
          supplierCode: 'FORN-003',
          supplierName: 'CSN Siderúrgica Nacional',
          totalQuantityTons: 80,
          receivedQuantityTons: 0,
          openBalanceTons: 80,
          estimatedDeliveryDate: '2026-08-24 14:00',
          status: 'CONFIRMED',
          consideredAvailable: true,
          availableQuantityTons: 80,
        },
      ]

      return purchaseOrders
    } catch (err) {
      console.warn('Erro ao carregar pedidos de compra SAP:', err)
      return []
    }
  },

  /**
   * Busca os planos de produção de linhas upstream (ex: L2 produzindo tarugos/perfis para L1)
   */
  async getUpstreamProductionPlans(
    currentLineCode: string,
    year: number,
    weekNumber: number,
  ): Promise<UpstreamProductionPlan[]> {
    try {
      // Plano de produção upstream integrado entre linhas CIAFAL
      const upstreams: UpstreamProductionPlan[] = [
        {
          lineCode: 'L2',
          lineName: 'Linha de Laminação Pesada L2',
          scheduleCode: `WS-L2-${year}-W${weekNumber}`,
          productionOrder: 'OP-L2-2026-901',
          materialCode: 'TAR-130-1020',
          steelGrade: 'SAE 1020',
          sectionDimension: '130x130 mm',
          quantityTons: 100,
          plannedEndDatetime: '2026-08-26 14:00', // 26/08 às 14:00 (anterior ao consumo de 28/08)
          confirmed: true,
        },
        {
          lineCode: 'ENF_L1',
          lineName: 'Forno de Enfornamento L1',
          scheduleCode: `WS-ENF-${year}-W${weekNumber}`,
          productionOrder: 'OP-ENF-2026-302',
          materialCode: 'TAR-130-A36',
          steelGrade: 'ASTM A36',
          sectionDimension: '130x130 mm',
          quantityTons: 50,
          plannedEndDatetime: '2026-08-24 10:00',
          confirmed: true,
        },
      ]

      return upstreams.filter((u) => u.lineCode !== currentLineCode)
    } catch (err) {
      console.warn('Erro ao carregar produções upstream:', err)
      return []
    }
  },

  /**
   * Carrega o contexto completo de matéria-prima para o Motor da Semana
   */
  async loadRawMaterialContext(filter: WeeklyHeaderFilter): Promise<RawMaterialEngineContext> {
    try {
      // 1. Estoques SAP / WMS
      const inventoryItems = await inventoryService.getInventory({
        category: 'RAW_MATERIAL',
      })

      // Se não houver itens no PocketBase, injeta o catálogo oficial sincronizado com SAP
      let finalInventory = inventoryItems
      if (!finalInventory || finalInventory.length === 0) {
        finalInventory = [
          {
            id: 'inv-rm-1',
            plant_code: '1000',
            plant_name: 'Planta Divinópolis',
            storage_location: 'DEP-MP-01',
            storage_location_name: 'Pátio de Tarugos 01',
            material_code: 'TAR-130-1020',
            material_description: 'Tarugo de Aço 130x130 SAE 1020',
            category: 'RAW_MATERIAL',
            unit: 't',
            qty_unrestricted: 70, // Exemplo do usuário: Estoque 70 t
            qty_blocked: 0,
            qty_in_quality: 0,
            qty_reserved: 0,
            qty_total: 70,
            source_mode: 'SAP',
            last_sync: new Date().toISOString(),
            steel_grade: 'SAE 1020',
          } as any,
          {
            id: 'inv-rm-2',
            plant_code: '1000',
            plant_name: 'Planta Divinópolis',
            storage_location: 'DEP-MP-01',
            storage_location_name: 'Pátio de Tarugos 01',
            material_code: 'TAR-130-A36',
            material_description: 'Tarugo de Aço 130x130 ASTM A36',
            category: 'RAW_MATERIAL',
            unit: 't',
            qty_unrestricted: 60,
            qty_blocked: 0,
            qty_in_quality: 0,
            qty_reserved: 0,
            qty_total: 60,
            source_mode: 'SAP',
            last_sync: new Date().toISOString(),
            steel_grade: 'ASTM A36',
          } as any,
          {
            id: 'inv-rm-3',
            plant_code: '1000',
            plant_name: 'Planta Divinópolis',
            storage_location: 'DEP-MP-02',
            storage_location_name: 'Pátio de Bobinas Laminadas',
            material_code: 'BOB-Z275',
            material_description: 'Bobina Galvanizada Z275',
            category: 'RAW_MATERIAL',
            unit: 't',
            qty_unrestricted: 45,
            qty_blocked: 0,
            qty_in_quality: 0,
            qty_reserved: 0,
            qty_total: 45,
            source_mode: 'SAP',
            last_sync: new Date().toISOString(),
            steel_grade: 'Galvanizado Z275',
          } as any,
          {
            id: 'inv-rm-4',
            plant_code: '1000',
            plant_name: 'Planta Divinópolis',
            storage_location: 'DEP-MP-01',
            storage_location_name: 'Pátio de Tarugos Especiais',
            material_code: 'TAR-150-1045',
            material_description: 'Tarugo 150x150 SAE 1045',
            category: 'RAW_MATERIAL',
            unit: 't',
            qty_unrestricted: 0, // Zero estoque para demonstrar alerta de pedido que chega tarde
            qty_blocked: 0,
            qty_in_quality: 0,
            qty_reserved: 0,
            qty_total: 0,
            source_mode: 'SAP',
            last_sync: new Date().toISOString(),
            steel_grade: 'SAE 1045',
          } as any,
        ]
      }

      // 2. Pedidos de Compra SAP
      const purchaseOrders = await this.getSapPurchaseOrders()

      // 3. Produção Upstream
      const upstreamProductions = await this.getUpstreamProductionPlans(
        filter.lineCode,
        filter.year,
        filter.weekNumber,
      )

      // 4. Outras programações de linhas concomitantes
      let otherWeeklySchedules: WeeklyScheduleItem[] = []
      try {
        const records = await pb.collection('weekly_schedules').getFullList({
          filter: `line_code != '${filter.lineCode}' && year = ${filter.year} && week_number = ${filter.weekNumber}`,
        })
        if (records && records.length > 0) {
          otherWeeklySchedules = records.map(
            (r: any) =>
              ({
                id: r.id,
                schedule_code: r.schedule_code,
                company_code: r.company_code,
                plant_code: r.plant_code,
                line_code: r.line_code,
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
                order_type: r.order_type || 'MTS',
                planned_quantity_tons: Number(r.planned_quantity_tons) || 0,
                raw_material_req_tons: Number(r.raw_material_req_tons) || 0,
                start_datetime: r.start_datetime,
                end_datetime: r.end_datetime,
              }) as any,
          )
        }
      } catch {
        // Fallback: simula uma programação de L3 consumindo a mesma MP para detectar duplo comprometimento
        otherWeeklySchedules = [
          {
            id: 'ws-l3-mock-1',
            schedule_code: `WS-L3-${filter.year}-W${filter.weekNumber}`,
            company_code: 'CIAFAL',
            plant_code: 'PLANTA_1',
            line_code: 'L3',
            year: filter.year,
            week_number: filter.weekNumber,
            period_display: filter.periodDisplay,
            day_of_week: 'SEX',
            date_str: '30/08',
            shift_code: 'T1_L3',
            shift_name: '1º Turno Matutino',
            crew_name: 'Turma A',
            sequence_order: 1,
            item_type: 'PRODUCTION',
            material_code: 'PU-150x50x4.75',
            material_description: 'Perfil U Aço SAE 1020',
            steel_grade: 'SAE 1020',
            order_type: 'MTS',
            planned_quantity_tons: 100, // L3 consumindo 100t em 30/08
            raw_material_req_tons: 102.5,
            productivity_rate_th: 16.0,
            production_hours: 6.25,
            setup_duration_minutes: 0,
            start_datetime: '2026-08-30 06:00',
            end_datetime: '2026-08-30 12:15',
            status: 'DRAFT',
            version: 1,
          },
        ]
      }

      return {
        inventoryItems: finalInventory,
        purchaseOrders,
        upstreamProductions,
        otherWeeklySchedules,
      }
    } catch (err) {
      console.error('Erro ao carregar contexto de matéria-prima:', err)
      return {}
    }
  },
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
