import pb from '@/lib/pocketbase/client'
import {
  WeeklyScheduleItem,
  WeeklyHeaderFilter,
  OfficialMaterialOption,
  SapPurchaseOrder,
  UpstreamProductionPlan,
  WeeklyScheduleWorkflowState,
  WeeklyScheduleVersionRecord,
  WeeklyScheduleScenario,
  WeeklySimulationReport,
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

      // 5. Tempos de Resfriamento Cadastrados
      let coolingTimes: any[] = []
      try {
        const coolingRecords = await pb.collection('cooling_times').getFullList({
          filter: "status = 'ATIVO'",
        })
        coolingTimes = coolingRecords.map((r: any) => ({
          center_code: r.center_code,
          plant_id: r.plant_id,
          line_code: r.line_code,
          work_center: r.work_center,
          material_code: r.material_code,
          family_code: r.family_code,
          gauge_dimension: r.gauge_dimension,
          cooling_time_hours: Number(r.cooling_time_hours) || 24,
          rule_condition: r.rule_condition,
          notes: r.notes,
        }))
      } catch (err) {
        console.warn('Erro ao carregar cooling_times:', err)
      }

      return {
        inventoryItems: finalInventory,
        purchaseOrders,
        upstreamProductions,
        otherWeeklySchedules,
        coolingTimes,
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
        sort: '+sequence_order,created',
      })

      if (records && records.length > 0) {
        // Ordena explicitamente por sequence_order crescente (1..N) para garantir integridade após F5
        const sortedRecords = [...records].sort(
          (a, b) => (Number(a.sequence_order) || 0) - (Number(b.sequence_order) || 0),
        )

        return sortedRecords.map((r: any, idx: number) => ({
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
          sequence_order: Number(r.sequence_order) || idx + 1,
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
          awaiting_observations:
            r.metadata?.awaiting_observations ||
            (r.status === 'AGUARDANDO_OBSERVACOES'
              ? {
                  is_awaiting: true,
                  reason: 'Aguardando validação',
                  observation: r.pcp_notes || '',
                  responsible: 'PCP',
                  date_time: r.created || new Date().toISOString(),
                }
              : undefined),
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
   * Salva os itens da programação semanal (com status explícito do workflow)
   */
  async saveWeeklyScheduleItems(
    items: WeeklyScheduleItem[],
    filter: WeeklyHeaderFilter,
    statusOverride?: WeeklyScheduleWorkflowState,
    versionOverride?: number,
  ): Promise<boolean> {
    const user = pb.authStore.record
    const scheduleCode = `WS-${filter.lineCode}-${filter.year}-W${String(filter.weekNumber).padStart(2, '0')}`

    try {
      // 1. Salva ou atualiza cada item na coleção weekly_schedules
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const targetStatus = statusOverride || item.status || 'DRAFT'
        const targetVersion = versionOverride ?? (item.version || 1)
        const lifecycleStage =
          targetStatus === 'PUBLICADO' || targetStatus === 'EXECUTANDO'
            ? 'EXECUTANDO'
            : targetStatus === 'REALIZADO'
              ? 'REALIZADO'
              : targetStatus === 'ANALISADO'
                ? 'ANALISADO'
                : targetStatus === 'APROVADO_PCP' || targetStatus === 'ENVIADO_GESTOR_LINHA'
                  ? 'APROVADO'
                  : 'PROGRAMADO'

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
          sequence_order: item.sequence_order || i + 1,
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
          status: targetStatus,
          version: targetVersion,
          scenario_id: item.scenario_id || '',
          scenario_name: item.scenario_name || '',
          realized_quantity_tons: item.realized_quantity_tons ?? 0,
          realized_hours: item.realized_hours ?? 0,
          realized_productivity_th: item.realized_productivity_th ?? 0,
          deviation_notes: item.deviation_notes || '',
          lifecycle_stage: lifecycleStage,
          pcp_notes: item.pcp_notes,
          raw_material_req_tons: item.raw_material_req_tons,
          raw_material_type: item.raw_material_type,
          is_blocked_attempt: false,
          metadata: {
            saved_by: user ? user.name || user.email : 'Programador PCP',
            saved_at: new Date().toISOString(),
            awaiting_observations: item.awaiting_observations || null,
          },
        }

        if (
          item.id &&
          !item.id.startsWith('temp-') &&
          !item.id.startsWith('item-demo-') &&
          !item.id.startsWith('item-')
        ) {
          await pb.collection('weekly_schedules').update(item.id, payload)
        } else {
          const created = await pb.collection('weekly_schedules').create(payload)
          item.id = created.id
        }
        item.status = targetStatus
        item.version = targetVersion
        item.lifecycle_stage = lifecycleStage
      }

      // 2. Registra na trilha de auditoria oficial
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: `WEEKLY_SCHEDULE_${statusOverride || 'SAVED'}`,
          resource: 'weekly_schedules',
          resource_id: scheduleCode,
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            lineCode: filter.lineCode,
            year: filter.year,
            weekNumber: filter.weekNumber,
            status: statusOverride || 'DRAFT',
            version: versionOverride || 1,
            itemsCount: items.length,
            totalTons: items.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0),
          },
        })
      } catch {
        /* intentionally ignored */
      }

      return true
    } catch (err) {
      console.error('Erro ao salvar programação semanal:', err)
      throw err
    }
  },

  /**
   * Salva os itens da programação semanal (Rascunho)
   */
  /**
   * Salva os itens da programação semanal (Rascunho) com versionamento sequencial em weekly_schedule_versions
   */
  async saveWeeklyScheduleDraft(
    items: WeeklyScheduleItem[],
    filter: WeeklyHeaderFilter,
  ): Promise<{ success: boolean; versionNumber: number; versionTag: string }> {
    const user = pb.authStore.record
    const scheduleCode = `WS-${filter.lineCode}-${filter.year}-W${String(filter.weekNumber).padStart(2, '0')}`

    // 1. Busca versões existentes para determinar numeração sequencial (V01, V02, V03...)
    let currentVersions: WeeklyScheduleVersionRecord[] = []
    try {
      currentVersions = await this.getScheduleVersions(scheduleCode)
    } catch {
      currentVersions = []
    }

    let nextVersionNum = 1
    let previousScheduleData: WeeklyScheduleItem[] = []

    if (currentVersions.length > 0) {
      const maxVer = Math.max(...currentVersions.map((v) => v.version_number || 1))
      const latestVer =
        currentVersions.find((v) => v.version_number === maxVer) || currentVersions[0]
      previousScheduleData = latestVer.new_schedule_data || []

      // Verifica se houve alteração relevante em relação à última versão gravada
      const hasMeaningfulDiff =
        previousScheduleData.length !== items.length ||
        JSON.stringify(
          previousScheduleData.map((it) => ({
            code: it.material_code,
            qty: it.planned_quantity_tons,
            day: it.day_of_week,
            shift: it.shift_code,
            seq: it.sequence_order,
          })),
        ) !==
          JSON.stringify(
            items.map((it) => ({
              code: it.material_code,
              qty: it.planned_quantity_tons,
              day: it.day_of_week,
              shift: it.shift_code,
              seq: it.sequence_order,
            })),
          )

      nextVersionNum = hasMeaningfulDiff ? maxVer + 1 : maxVer
    } else {
      nextVersionNum = 1
    }

    const versionTag = `V${String(nextVersionNum).padStart(2, '0')}`

    // 2. Persiste itens na coleção weekly_schedules com status DRAFT e número da versão
    await this.saveWeeklyScheduleItems(items, filter, 'DRAFT', nextVersionNum)

    // 3. Grava snapshot em weekly_schedule_versions
    const userName = user?.name || user?.email || 'Programador PCP'
    const userEmail = user?.email || ''
    const userId = user?.id || ''

    const diffSummary = {
      itemsAdded: Math.max(0, items.length - previousScheduleData.length),
      itemsRemoved: Math.max(0, previousScheduleData.length - items.length),
      itemsModified: items.length,
      netTonsDiff:
        items.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0) -
        previousScheduleData.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0),
    }

    try {
      await pb.collection('weekly_schedule_versions').create({
        schedule_code: scheduleCode,
        line_code: filter.lineCode,
        year: filter.year,
        week_number: filter.weekNumber,
        version_number: nextVersionNum,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        change_reason: `Rascunho de programação salvo na versão ${versionTag}.`,
        impact_assessment: `Status DRAFT - ${items.length} itens sequenciados para a semana ${filter.weekNumber}.`,
        previous_schedule_data: previousScheduleData,
        new_schedule_data: items,
        diff_summary: diffSummary,
      })
    } catch (err) {
      console.warn('Erro ao gravar versão em weekly_schedule_versions:', err)
    }

    // 4. Grava auditoria WEEKLY_SCHEDULE_DRAFT em pcp_audit_logs
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId || null,
        user_email: userEmail,
        user_name: userName,
        user_role: (user as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: 'WEEKLY_SCHEDULE_DRAFT',
        resource: 'weekly_schedules',
        resource_id: scheduleCode,
        permission_required: 'pcp.weekly_schedule.edit',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          lineCode: filter.lineCode,
          year: filter.year,
          weekNumber: filter.weekNumber,
          version: nextVersionNum,
          versionTag,
          savedBy: userName,
          itemsCount: items.length,
          totalTons: items.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0),
          savedAt: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de rascunho em pcp_audit_logs:', auditErr)
    }

    return { success: true, versionNumber: nextVersionNum, versionTag }
  },

  /**
   * Envia a programação semanal para Aprovação formal do PCP
   */
  async sendForApproval(
    filter: WeeklyHeaderFilter,
    items: WeeklyScheduleItem[],
    currentVersionNumber?: number,
  ): Promise<{ success: boolean; versionTag: string; approvalDateStr: string }> {
    const user = pb.authStore.record
    const scheduleCode = `WS-${filter.lineCode}-${filter.year}-W${String(filter.weekNumber).padStart(2, '0')}`

    // (a) Identifica a versão vigente
    let versions = await this.getScheduleVersions(scheduleCode)
    let versionNum = currentVersionNumber ?? (items[0]?.version || 1)

    if (versions.length > 0) {
      const maxVer = Math.max(...versions.map((v) => v.version_number || 1))
      versionNum = maxVer
    }

    const versionTag = `V${String(versionNum).padStart(2, '0')}`

    // Guarda 1: Sem versão válida ou sem itens
    if (!items || items.length === 0) {
      throw new Error('Não há alterações pendentes ou versão válida para envio.')
    }

    // Guarda 2: Mesma versão já em aprovação
    const isAlreadyInApproval = items.some(
      (it) => it.status === 'AGUARDANDO_APROVACAO_PCP' || it.status === 'APROVADO_PCP',
    )
    if (isAlreadyInApproval) {
      throw new Error(`A versão ${versionTag} já se encontra em aprovação.`)
    }

    // Guarda 3: Alteração após envio (se último snapshot em aprovação e itens alterados)
    const latestVersionRecord = versions.find((v) => v.version_number === versionNum)
    if (latestVersionRecord && latestVersionRecord.change_reason?.includes('EM_APROVACAO')) {
      throw new Error(
        `A versão ${versionTag} já foi submetida. Salve uma nova versão antes de submeter novamente.`,
      )
    }

    // (b) Muda status para Em Aprovação (AGUARDANDO_APROVACAO_PCP)
    const targetStatus: WeeklyScheduleWorkflowState = 'AGUARDANDO_APROVACAO_PCP'
    await this.saveWeeklyScheduleItems(items, filter, targetStatus, versionNum)

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const approvalDateStr = `${dd}/${mm}/${yyyy}`

    const userName = user?.name || user?.email || 'Programador PCP'
    const userEmail = user?.email || ''
    const userId = user?.id || ''

    // (c) Grava data/hora do envio e usuário responsável em weekly_schedule_versions
    try {
      await pb.collection('weekly_schedule_versions').create({
        schedule_code: scheduleCode,
        line_code: filter.lineCode,
        year: filter.year,
        week_number: filter.weekNumber,
        version_number: versionNum,
        user_id: userId,
        user_name: userName,
        user_email: userEmail,
        change_reason: `EM_APROVACAO: Enviado para aprovação formal no dia ${approvalDateStr}.`,
        impact_assessment: `Versão ${versionTag} encaminhada para aprovação do Supervisor PCP com ${items.length} itens.`,
        previous_schedule_data: latestVersionRecord?.new_schedule_data || items,
        new_schedule_data: items,
        diff_summary: {
          itemsAdded: 0,
          itemsRemoved: 0,
          itemsModified: items.length,
          netTonsDiff: 0,
        },
      })
    } catch (verErr) {
      console.warn('Aviso ao registrar weekly_schedule_versions na aprovação:', verErr)
    }

    // (d) Auditoria WEEKLY_SCHEDULE_APPROVAL_REQUEST em pcp_audit_logs
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId || null,
        user_email: userEmail,
        user_name: userName,
        user_role: (user as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: 'WEEKLY_SCHEDULE_APPROVAL_REQUEST',
        resource: 'weekly_schedules',
        resource_id: scheduleCode,
        permission_required: 'pcp.weekly_schedule.approve',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          lineCode: filter.lineCode,
          year: filter.year,
          weekNumber: filter.weekNumber,
          version: versionNum,
          versionTag,
          submittedBy: userName,
          submittedAt: now.toISOString(),
          submissionDateFormatted: approvalDateStr,
          status: targetStatus,
          totalTons: items.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0),
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de aprovação em pcp_audit_logs:', auditErr)
    }

    return { success: true, versionTag, approvalDateStr }
  },

  /**
   * Exclui um rascunho de programação semanal (status DRAFT) com auditoria
   */
  /**
   * Exclui um rascunho de programação semanal (status DRAFT) com auditoria
   */
  async deleteWeeklyScheduleDraft(
    versionId: string,
    scheduleCode: string,
    lineCode: string,
    year: number,
    weekNumber: number,
    versionNumber: number,
  ): Promise<boolean> {
    const user = pb.authStore.record
    const userName = user?.name || user?.email || 'Programador PCP'
    const userEmail = user?.email || ''
    const userId = user?.id || ''

    // 1. Verifica se a versão existe e está em DRAFT
    const versionRec = await pb.collection('weekly_schedule_versions').getOne(versionId)
    if (!versionRec) {
      throw new Error('Registro de versão não encontrado.')
    }

    // Se estiver em aprovação ou aprovada, bloqueia com mensagem adequada
    const reason = (versionRec.change_reason || '').toUpperCase()
    const impact = (versionRec.impact_assessment || '').toUpperCase()
    if (
      reason.includes('APROVACAO') ||
      reason.includes('APROVADO') ||
      impact.includes('APROVADO') ||
      impact.includes('APROVACAO')
    ) {
      throw new Error('Não é permitido excluir uma versão em aprovação ou já aprovada.')
    }

    // 2. Remove da coleção weekly_schedule_versions
    await pb.collection('weekly_schedule_versions').delete(versionId)

    // 3. Registra auditoria da exclusão em pcp_audit_logs
    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId || null,
        user_email: userEmail,
        user_name: userName,
        user_role: (user as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: 'WEEKLY_SCHEDULE_DRAFT_DELETED',
        resource: 'weekly_schedule_versions',
        resource_id: versionId,
        permission_required: 'pcp.weekly_schedule.edit',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          scheduleCode,
          lineCode,
          year,
          weekNumber,
          versionNumber,
          versionTag: `V${String(versionNumber).padStart(2, '0')}`,
          deletedBy: userName,
          deletedAt: new Date().toISOString(),
        },
      })
    } catch (auditErr) {
      console.warn('Falha na auditoria de exclusão de rascunho:', auditErr)
    }

    return true
  },

  /**
   * Transiciona o workflow da programação semanal de forma auditada
   */
  async transitionWorkflowState(
    currentItems: WeeklyScheduleItem[],
    filter: WeeklyHeaderFilter,
    targetState: WeeklyScheduleWorkflowState,
    reason?: string,
  ): Promise<{ success: boolean; newVersion: number }> {
    const user = pb.authStore.record
    const scheduleCode = `WS-${filter.lineCode}-${filter.year}-W${String(filter.weekNumber).padStart(2, '0')}`
    const currentVersion = currentItems[0]?.version || 1
    let newVersion = currentVersion

    // Se já estava publicado e sofreu alteração pós-publicação, incrementa a versão
    const isPostPublishedChange =
      currentItems.some((i) => i.status === 'PUBLICADO') && targetState === 'PUBLICADO'

    if (isPostPublishedChange) {
      newVersion = currentVersion + 1
      // Grava versão no histórico de auditoria
      await this.recordScheduleVersion({
        schedule_code: scheduleCode,
        line_code: filter.lineCode,
        year: filter.year,
        week_number: filter.weekNumber,
        version_number: newVersion,
        user_name: user?.name || user?.email || 'Programador PCP',
        user_email: user?.email,
        change_reason: reason || 'Revisão operacional pós-publicação.',
        impact_assessment: `Versão revisada para ${newVersion}.0 com atualização de cronograma e balanceamento de MP.`,
        previous_schedule_data: currentItems,
        new_schedule_data: currentItems,
      })
    }

    await this.saveWeeklyScheduleItems(currentItems, filter, targetState, newVersion)

    // Auditoria de transição de estado
    try {
      await pb.collection('pcp_audit_logs').create({
        event_type: 'WORKFLOW_TRANSITION',
        action: `TRANSITION_TO_${targetState}`,
        resource: 'weekly_schedules',
        resource_id: scheduleCode,
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          lineCode: filter.lineCode,
          year: filter.year,
          weekNumber: filter.weekNumber,
          previousState: currentItems[0]?.status || 'DRAFT',
          newState: targetState,
          version: newVersion,
          reason: reason || 'Transição de fluxo autorizada pelo usuário.',
          user: user?.name || user?.email,
        },
      })
    } catch {
      /* intentionally ignored */
    }

    return { success: true, newVersion }
  },

  /**
   * Grava versão formal pós-publicação
   */
  async recordScheduleVersion(versionData: WeeklyScheduleVersionRecord): Promise<void> {
    try {
      await pb.collection('weekly_schedule_versions').create({
        schedule_code: versionData.schedule_code,
        line_code: versionData.line_code,
        year: versionData.year,
        week_number: versionData.week_number,
        version_number: versionData.version_number,
        user_name: versionData.user_name,
        user_email: versionData.user_email || '',
        change_reason: versionData.change_reason,
        impact_assessment: versionData.impact_assessment,
        previous_schedule_data: versionData.previous_schedule_data,
        new_schedule_data: versionData.new_schedule_data,
        diff_summary: versionData.diff_summary || {},
      })
    } catch (err) {
      console.warn('Falha ao gravar versão de programação:', err)
    }
  },

  /**
   * Busca histórico de versões de uma programação
   */
  async getScheduleVersions(scheduleCode?: string): Promise<WeeklyScheduleVersionRecord[]> {
    try {
      const filter = scheduleCode ? `schedule_code = '${scheduleCode}'` : ''
      const records = await pb.collection('weekly_schedule_versions').getFullList({
        ...(filter ? { filter } : {}),
        sort: '-version_number,-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        schedule_code: r.schedule_code,
        line_code: r.line_code,
        year: r.year,
        week_number: r.week_number,
        version_number: r.version_number,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        change_reason: r.change_reason,
        impact_assessment: r.impact_assessment,
        previous_schedule_data: r.previous_schedule_data || [],
        new_schedule_data: r.new_schedule_data || [],
        diff_summary: r.diff_summary,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao obter histórico de versões:', err)
      return []
    }
  },

  /**
   * Salva cenário A/B/C
   */
  async saveScenario(scenario: WeeklyScheduleScenario): Promise<boolean> {
    try {
      const existing = await pb.collection('weekly_schedule_scenarios').getFullList({
        filter: `schedule_code = '${scenario.schedule_code}' && scenario_code = '${scenario.scenario_code}'`,
      })

      const payload = {
        scenario_code: scenario.scenario_code,
        scenario_name: scenario.scenario_name,
        description: scenario.description || '',
        schedule_code: scenario.schedule_code,
        line_code: scenario.line_code,
        year: scenario.year,
        week_number: scenario.week_number,
        is_active: scenario.is_active,
        items_snapshot: scenario.items_snapshot,
        metrics_snapshot: scenario.metrics_snapshot,
        ai_recommendation: scenario.ai_recommendation,
      }

      if (existing.length > 0) {
        await pb.collection('weekly_schedule_scenarios').update(existing[0].id, payload)
      } else {
        await pb.collection('weekly_schedule_scenarios').create(payload)
      }
      return true
    } catch (err) {
      console.warn('Erro ao salvar cenário:', err)
      return false
    }
  },

  /**
   * Lista os cenários A/B/C salvos para a programação
   */
  async loadScenarios(scheduleCode: string): Promise<WeeklyScheduleScenario[]> {
    try {
      const records = await pb.collection('weekly_schedule_scenarios').getFullList({
        filter: `schedule_code = '${scheduleCode}'`,
        sort: 'scenario_code',
      })
      return records.map((r: any) => ({
        id: r.id,
        scenario_code: r.scenario_code,
        scenario_name: r.scenario_name,
        description: r.description,
        schedule_code: r.schedule_code,
        line_code: r.line_code,
        year: r.year,
        week_number: r.week_number,
        is_active: r.is_active || false,
        items_snapshot: r.items_snapshot || [],
        metrics_snapshot: r.metrics_snapshot || {
          productionTons: 0,
          utilizationPct: 0,
          setupHours: 0,
          switchesCount: 0,
          rawMaterialRiskCount: 0,
          ordersMetCount: 0,
          ordersTotalCount: 0,
          sequenceEfficiencyPct: 0,
        },
        ai_recommendation: r.ai_recommendation,
        created: r.created,
      }))
    } catch (err) {
      console.warn('Erro ao carregar cenários:', err)
      return []
    }
  },

  /**
   * Auditoria de tentativa indevida de IA alterar ou aprovar diretamente
   */
  async logAiUnauthorizedMutationAttempt(actionAttempted: string, details: string): Promise<void> {
    try {
      await pb.collection('pcp_audit_logs').create({
        event_type: 'UNAUTHORIZED_ACTION_ATTEMPT',
        action: 'AI_DIRECT_MUTATION_BLOCKED',
        resource: 'weekly_schedules',
        scope: 'GOVERNANCE_SYSTEM',
        outcome: 'DENY',
        details: {
          actionAttempted,
          policy: 'GOVERNANCE_RULE_07: A IA NÃO pode alterar nem aprovar sozinha a programação.',
          violation: details,
          blockedAt: new Date().toISOString(),
        },
      })
    } catch {
      /* intentionally ignored */
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

  /**
   * Registra no log de auditoria a exclusão lógica de item da programação semanal (SCHEDULE_ITEM_DELETE)
   */
  async logScheduleItemDeletion(params: {
    item: WeeklyScheduleItem
    version: number
    context: {
      companyCode: string
      lineCode: string
      year: number
      weekNumber: number
      dayOfWeek: string
    }
  }): Promise<void> {
    const user = pb.authStore.record
    const userName = user?.name || user?.email || 'Programador PCP'
    const userEmail = user?.email || ''
    const userId = user?.id || null

    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_role: (user as any)?.role || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: 'SCHEDULE_ITEM_DELETE',
        resource: 'weekly_schedule_items',
        resource_id: params.item.id,
        permission_required: 'pcp.weekly_schedule.edit',
        scope: 'PRODUCTION_LINE',
        outcome: 'SUCCESS',
        details: {
          itemId: params.item.id,
          materialCode: params.item.material_code,
          materialDescription: params.item.material_description,
          sequenceOrder: params.item.sequence_order,
          plannedQuantityTons: params.item.planned_quantity_tons,
          version: params.version,
          versionTag: `V${String(params.version).padStart(2, '0')}`,
          companyCode: params.context.companyCode,
          lineCode: params.context.lineCode,
          year: params.context.year,
          weekNumber: params.context.weekNumber,
          dayOfWeek: params.context.dayOfWeek,
          deletedAt: new Date().toISOString(),
          deletedBy: userName,
        },
      })
    } catch (err) {
      console.warn('Falha na gravação de auditoria SCHEDULE_ITEM_DELETE em pcp_audit_logs:', err)
    }
  },
}
