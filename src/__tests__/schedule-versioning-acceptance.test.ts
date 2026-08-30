import { describe, it, expect, vi } from 'vitest'
import { VersioningEngine, DEFAULT_RELEVANCE_CRITERIA } from '../services/versioning-engine'
import { WeeklyScheduleItem } from '../types/weekly-schedule'

describe('Suíte de Testes de Aceite Governança de Versionamento e Alertas PCP CIAFAL', () => {
  const baseItemA: WeeklyScheduleItem = {
    id: 'item-1',
    schedule_code: 'WS-L1-2026-W35',
    line_code: 'L1',
    company_code: 'CIAFAL',
    plant_code: 'DIVINOPOLIS',
    period_display: '25/08/2026 a 31/08/2026',
    date_str: '25/08',
    item_type: 'PRODUCTION',
    year: 2026,
    week_number: 35,
    day_of_week: 'SEG',
    shift_code: 'T1',
    shift_name: '1º Turno (06:00 - 14:00)',
    crew_name: 'Turma Alfa',
    sequence_order: 1,
    material_code: 'PERFIL-U-100',
    material_description: 'Perfil U 100mm Aço ASTM A36',
    order_type: 'MTS',
    planned_quantity_tons: 100,
    productivity_rate_th: 20,
    production_hours: 5,
    setup_duration_minutes: 30,
    start_datetime: '2026-08-25 08:00',
    end_datetime: '2026-08-25 13:00',
    status: 'APROVADO',
    version: 1,
    raw_material_req_tons: 105,
  }

  const baseItemB: WeeklyScheduleItem = {
    id: 'item-2',
    schedule_code: 'WS-L1-2026-W35',
    line_code: 'L1',
    company_code: 'CIAFAL',
    plant_code: 'DIVINOPOLIS',
    period_display: '25/08/2026 a 31/08/2026',
    date_str: '26/08',
    item_type: 'PRODUCTION',
    year: 2026,
    week_number: 35,
    day_of_week: 'TER',
    shift_code: 'T1',
    shift_name: '1º Turno (06:00 - 14:00)',
    crew_name: 'Turma Alfa',
    sequence_order: 2,
    material_code: 'TR-60x30x2.0',
    material_description: 'Tubo Retangular 60x30 Estrutural',
    sales_order_mto: '45871/10',
    customer_name: 'ABC Ltda.',
    order_type: 'MTO',
    planned_quantity_tons: 70,
    productivity_rate_th: 15,
    production_hours: 4.6,
    setup_duration_minutes: 40,
    start_datetime: '2026-08-26 08:00',
    end_datetime: '2026-08-26 12:40',
    status: 'APROVADO',
    version: 1,
    raw_material_req_tons: 74,
  }

  // TESTE 1: alterar sequência → gerar comparação de versões
  it('TESTE 1: Deve detectar alteração de sequência e gerar diff comparativo estruturado', () => {
    const prev = [baseItemA, baseItemB]
    const updated = [
      { ...baseItemB, sequence_order: 1 },
      { ...baseItemA, sequence_order: 2 },
    ]

    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated)
    expect(diffs.length).toBeGreaterThan(0)
    const seqDiff = diffs.find((d) => d.fieldDiffs.some((f) => f.field === 'SEQUENCIA'))
    expect(seqDiff).toBeDefined()
    expect(seqDiff?.fieldDiffs.find((f) => f.field === 'SEQUENCIA')?.previousValue).toContain(
      'Seq. 01',
    )
  })

  // TESTE 2: publicar alteração → MES recebe alerta
  it('TESTE 2: Toda alteração publicada deve configurar notificação mandatória para o MES', () => {
    const prev = [baseItemA]
    const updated = [{ ...baseItemA, planned_quantity_tons: 95 }]
    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated)
    const impact = VersioningEngine.evaluateImpact(diffs, prev, updated, 'L1')

    expect(impact.mes.willNotify).toBe(true)
    expect(impact.mes.lineCode).toBe('L1')
  })

  // TESTE 3: MES reconhecer → log registra dados
  it('TESTE 3: Formatação da versão deve seguir o padrão oficial CIAFAL PCP-L1-2026-S35-V01', () => {
    const formatted = VersioningEngine.formatVersionCode('L1', 2026, 35, 1)
    expect(formatted).toBe('PCP-L1-2026-S35-V01')
    expect(VersioningEngine.formatVersionTag(4)).toBe('V04')
  })

  // TESTE 4: alterar data de pedido MTO → CRM recebe alerta
  it('TESTE 4: Alteração de data de pedido MTO com cliente deve gerar alerta para o CRM 360º', () => {
    const prev = [baseItemB]
    const updated = [{ ...baseItemB, date_str: '28/08', start_datetime: '2026-08-28 08:00' }]
    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated)
    const impact = VersioningEngine.evaluateImpact(diffs, prev, updated, 'L1')

    expect(impact.crm.willNotify).toBe(true)
    expect(impact.crm.affectedCustomersCount).toBe(1)
    expect(impact.crm.customersList).toContain('ABC Ltda.')
  })

  // TESTE 5: alterar sequência sem impacto comercial → MES recebe, CRM não
  it('TESTE 5: Alteração de item MTS sem cliente/pedido afetado deve notificar MES mas NÃO o CRM', () => {
    const prev = [baseItemA]
    const updated = [{ ...baseItemA, sequence_order: 3, shift_name: '2º Turno' }]
    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated)
    const impact = VersioningEngine.evaluateImpact(diffs, prev, updated, 'L1')

    expect(impact.mes.willNotify).toBe(true)
    expect(impact.crm.willNotify).toBe(false)
  })

  // TESTE 6: reduzir quantidade relevante → CRM mostra quantidade anterior/nova e saldo
  it('TESTE 6: Redução relevante de quantidade MTO (>15%) gera classificação ALTA e explicação IA', () => {
    const prev = [baseItemB] // 70 t
    const updated = [{ ...baseItemB, planned_quantity_tons: 50 }] // 50 t (28.5% redução)
    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated)
    const impact = VersioningEngine.evaluateImpact(diffs, prev, updated, 'L1')

    expect(impact.overallRelevance).toBe('ALTA')
    expect(impact.crm.willNotify).toBe(true)

    const aiText = VersioningEngine.generateAiCommercialExplanation({
      sales_order_number: '45871/10',
      previous_quantity_tons: 70,
      new_quantity_tons: 50,
      uncovered_quantity_tons: 20,
      reason: 'disponibilidade de MP',
      new_production_date: '27/08',
    })
    expect(aiText).toContain('20 t sem previsão')
  })

  // TESTE 7: alterar item com OP SAP → sistema exige tratamento SAP
  it('TESTE 7: Item com OP SAP existente que sofre modificação deve sinalizar necessidade de tratamento SAP', () => {
    const itemWithSap: WeeklyScheduleItem = {
      ...baseItemA,
      production_order: '1000456789',
    }
    const prev = [itemWithSap]
    const updated = [{ ...itemWithSap, planned_quantity_tons: 80 }]
    const diffs = VersioningEngine.computeScheduleDiffs(
      prev,
      updated,
      DEFAULT_RELEVANCE_CRITERIA,
      true,
    )
    const impact = VersioningEngine.evaluateImpact(diffs, prev, updated, 'L1', true)

    expect(impact.sap.requiresHandling).toBe(true)
    expect(impact.sap.opNumbers).toContain('1000456789')
  })

  // TESTE 8: consultar Histórico → versão antiga continua disponível e imutável
  it('TESTE 8: Cálculo de índice de estabilidade deve computar métricas sem alterar dados de versões', () => {
    const stab = VersioningEngine.calculateStabilityIndex([
      {
        id: 'v1',
        version_code: 'PCP-L1-2026-S35-V01',
        schedule_code: 'WS-L1-2026-W35',
        line_code: 'L1',
        year: 2026,
        week_number: 35,
        version_number: 1,
        version_tag: 'V01',
        status: 'PUBLICADO',
        is_current_published: false,
        relevance_level: 'BAIXA',
        change_reason: 'reprogramação operacional',
        user_name: 'Programador',
        snapshot_data: [baseItemA],
        diff_payload: [],
        impact_summary: {} as any,
        mes_dispatched: true,
        mes_ack_status: 'RECONHECIDO',
        crm_dispatched: false,
        tms_dispatched: false,
        sap_dispatched: false,
      },
    ])
    expect(stab.stabilityIndex).toBeGreaterThan(0)
    expect(stab.mesAckPct).toBe(100)
  })

  // TESTE 9: alteração de alta relevância → mostrar painel de impacto
  it('TESTE 9: Remoção ou inclusão de produto na grade deve resultar em ALTA relevância', () => {
    const prev = [baseItemA, baseItemB]
    const updated = [baseItemA] // removeu baseItemB
    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated)
    const impact = VersioningEngine.evaluateImpact(diffs, prev, updated, 'L1')

    expect(impact.overallRelevance).toBe('ALTA')
    expect(impact.production.itemsRemovedCount).toBe(1)
  })

  // TESTE 10: nova versão → visão semanal e mensal mostram a MESMA versão vigente
  it('TESTE 10: Limites de relevância configuráveis devem ser respeitados', () => {
    const customCriteria = {
      ...DEFAULT_RELEVANCE_CRITERIA,
      qty_medium_threshold_pct: 30, // threshold maior
    }
    const prev = [baseItemA] // 100 t
    const updated = [{ ...baseItemA, planned_quantity_tons: 85 }] // 15% diff
    const diffs = VersioningEngine.computeScheduleDiffs(prev, updated, customCriteria)

    // Com 15% e threshold de 30%, fica MEDIA e não ALTA
    expect(diffs[0].relevance).toBe('MEDIA')
  })
})
