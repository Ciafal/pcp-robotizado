import { describe, it, expect } from 'vitest'
import { pcpReasonsService } from '@/services/pcp-reasons-service'
import { VersioningEngine } from '@/services/versioning-engine'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

describe('Suíte de Testes Obrigatórios: Motivos, Justificativas e Governança de Reprogramação (Seção 25)', () => {
  const baseItems: WeeklyScheduleItem[] = [
    {
      id: 'item-1',
      schedule_code: 'sch-1',
      company_code: 'CIAFAL',
      plant_code: 'DIV',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: 'Semana 35',
      day_of_week: 'QUI',
      date_str: '2026-08-27',
      shift_code: 'T1',
      shift_name: 'Turno 1',
      crew_name: 'Equipe Alpha',
      sequence_order: 2,
      item_type: 'PRODUCTION',
      production_order: 'OP-1001',
      sales_order_mto: 'PV-98801',
      customer_name: 'AÇOS CONTINENTAL',
      material_code: 'TR-60x30x2.0',
      material_description: 'Tubo Retangular 60x30x2.0',
      order_type: 'MTO',
      planned_quantity_tons: 150.0,
      productivity_rate_th: 25.0,
      production_hours: 6.0,
      setup_duration_minutes: 30,
      start_datetime: '2026-08-27T06:00:00Z',
      end_datetime: '2026-08-27T12:00:00Z',
      status: 'DRAFT',
      version: 18,
      raw_material_req_tons: 155.0,
    },
    {
      id: 'item-2',
      schedule_code: 'sch-1',
      company_code: 'CIAFAL',
      plant_code: 'DIV',
      line_code: 'L1',
      year: 2026,
      week_number: 35,
      period_display: 'Semana 35',
      day_of_week: 'QUI',
      date_str: '2026-08-27',
      shift_code: 'T1',
      shift_name: 'Turno 1',
      crew_name: 'Equipe Alpha',
      sequence_order: 3,
      item_type: 'PRODUCTION',
      production_order: 'OP-1002',
      sales_order_mto: 'PV-98802',
      customer_name: 'ESTOQUE MTS',
      material_code: 'CT-2x3/16',
      material_description: 'Cantoneira 2x3/16',
      order_type: 'MTS',
      planned_quantity_tons: 100.0,
      productivity_rate_th: 20.0,
      production_hours: 5.0,
      setup_duration_minutes: 20,
      start_datetime: '2026-08-27T12:00:00Z',
      end_datetime: '2026-08-27T17:00:00Z',
      status: 'DRAFT',
      version: 18,
      raw_material_req_tons: 104.0,
    },
  ]

  // 1. TESTE DE CADASTRO E TAXONOMIA
  it('TESTE 1: Deve listar famílias e motivos padrão homologados com severidade e flags de notificação', async () => {
    const families = await pcpReasonsService.listFamilies()
    expect(families.length).toBeGreaterThanOrEqual(10)
    expect(families.some((f) => f.code === 'MP')).toBe(true)
    expect(families.some((f) => f.code === 'SET')).toBe(true)
    expect(families.some((f) => f.code === 'CIL')).toBe(true)

    const reasons = await pcpReasonsService.listReasons()
    expect(reasons.length).toBeGreaterThanOrEqual(15)
    const mpReason = reasons.find((r) => r.code === 'MP-001')
    expect(mpReason).toBeDefined()
    expect(mpReason?.name).toBe('Saldo insuficiente de MP')
    expect(mpReason?.severity).toBe('ALTA')
    expect(mpReason?.notify_mes).toBe(true)
  })

  // 2. TESTE DE DIFFS E ALTERAÇÕES NA PROGRAMAÇÃO
  it('TESTE 2: Comparação de versões deve gerar version_diff com campos antigos e novos', () => {
    const modifiedItems: WeeklyScheduleItem[] = [
      {
        ...baseItems[0],
        date_str: '2026-08-28', // +1 dia
        sequence_order: 4, // +2 posições
        planned_quantity_tons: 120.0, // -30 t
        version: 19,
      },
      baseItems[1],
    ]

    const diffs = VersioningEngine.computeScheduleDiffs(baseItems, modifiedItems)
    expect(diffs.length).toBe(1)
    expect(diffs[0].changeType).toBe('ALTERADO')
    expect(diffs[0].fieldDiffs.length).toBeGreaterThanOrEqual(1)

    const dateDiff = diffs[0].fieldDiffs.find((f) => f.field === 'DATA')
    expect(dateDiff?.previousValue).toBe('27/08/2026')
    expect(dateDiff?.newValue).toBe('28/08/2026')

    const qtyDiff = diffs[0].fieldDiffs.find((f) => f.field === 'QUANTIDADE')
    expect(qtyDiff?.previousValue).toBe('150 t')
    expect(qtyDiff?.newValue).toBe('120 t')
  })

  // 3. TESTE DE MOTOR IA: CORRELAÇÃO DE EVIDÊNCIAS & SUGESTÃO
  it('TESTE 3: Motor IA deve gerar justificativa estruturada baseada nas diferenças reais', async () => {
    const modifiedItems: WeeklyScheduleItem[] = [
      {
        ...baseItems[0],
        planned_quantity_tons: 120.0,
        version: 19,
      },
    ]

    const diffs = VersioningEngine.computeScheduleDiffs(baseItems, modifiedItems)
    const aiText = pcpReasonsService.generateStructuredAIJustification({
      lineCode: 'L1',
      previousVersionTag: 'V18',
      nextVersionTag: 'V19',
      diffs,
      reasonName: 'Saldo insuficiente de MP',
      specificCause: 'Lote com ruptura no pátio',
      evidences: [
        {
          source_system: 'WMS',
          source_entity: 'mp_inventory',
          source_reference: 'Tarugo 1020',
          evidence_type: 'SALDO_INSUFICIENTE',
          description: 'Saldo restrito no pátio KS',
          confidence_score: 95,
        },
      ],
    })

    expect(aiText).toContain('Transição oficial da Linha L1')
    expect(aiText).toContain('V18 → V19')
    expect(aiText).toContain('Saldo insuficiente de MP')
    expect(aiText).toContain('[WMS] Saldo restrito no pátio KS')
  })

  // 4. TESTE DE FALLBACK IA QUANDO NÃO HÁ EVIDÊNCIA SISTÊMICA
  it('TESTE 4: Quando não houver evidência sistêmica suficiente, IA deve indicar HUMAN_ONLY', async () => {
    const suggestion = await pcpReasonsService.correlateEvidenceAndSuggest({
      lineCode: 'L2',
      diffs: [],
      previousItems: [],
      newItems: [],
      currentVersionTag: 'V01',
      nextVersionTag: 'V02',
    })

    expect(suggestion).toBeNull()
  })

  // 5. TESTE DO DASHBOARD DE ANÁLISE DE CAUSAS & PARETO REAL
  it('TESTE 5: Métricas de causa e Índice de Estabilidade (IEP) devem ser calculados com dados reais', async () => {
    const metrics = await pcpReasonsService.computeCauseAnalysisMetrics({ lineCode: 'L1' })
    expect(metrics).toBeDefined()
    expect(metrics.stabilityIndex).toBeGreaterThanOrEqual(0)
    expect(metrics.stabilityIndex).toBeLessThanOrEqual(100)
    expect(Array.isArray(metrics.paretoByFamily)).toBe(true)
    expect(Array.isArray(metrics.paretoByReason)).toBe(true)
  })
})
