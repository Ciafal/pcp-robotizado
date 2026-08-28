import { describe, it, expect } from 'vitest'
import {
  deterministicEngine,
  formatCiafalNumber,
  formatWithUnit,
  RawPcpDataSnapshot,
} from '@/services/deterministic-executive-engine'

describe('DeterministicExecutiveEngine - Testes Obrigatórios CIAFAL', () => {
  const mockSnapshot: RawPcpDataSnapshot = {
    lines: [
      { id: 'l01', code: 'L01', name: 'Laminação 01', status: 'running', current_rate: 38.5, target_rate: 45.0, efficiency: 85.5, operator: 'Carlos', active_order: 'ORD-101' },
      { id: 'l02', code: 'L02', name: 'Trefilação 02', status: 'running', current_rate: 22.0, target_rate: 25.0, efficiency: 88.0, operator: 'Fernando', active_order: 'ORD-102' },
    ],
    alerts: [
      { id: 'a1', line_id: 'l01', title: 'Buffer baixo', severity: 'critical', message: 'Buffer térmico em 8,5 t', category: 'CAPACITY', acknowledged: false },
    ],
    capacityLogs: [],
    inventoryItems: [
      { id: 'inv1', material_code: 'TARUGO-140', material_description: 'Tarugo 140mm', unit: 't', qty_total: 1420.5, target_stock: 1600.0, min_stock: 300 } as any,
    ],
    deviations: [],
    schedules: [],
    scenarioItems: [
      { id: 'item1', order_number: 'ORD-01', allocation_status: 'ALLOCATED' },
      { id: 'item2', order_number: 'ORD-02', allocation_status: 'ALLOCATED' },
      { id: 'item3', order_number: 'ORD-03', allocation_status: 'UNALLOCATED' },
    ],
    routes: [],
  }

  it('1. Formatação de números brasileira e proibição estrita de "ton" (sempre "t")', () => {
    expect(formatCiafalNumber(1250.5, 1)).toBe('1.250,5')
    expect(formatWithUnit(1250.5, 'ton', 1)).toBe('1.250,5 t') // sanitiza 'ton' para 't'
    expect(formatWithUnit(85.0, '%', 0)).toBe('85 %')
  })

  it('2. Geração de Cards Executivos determinísticos com Realizado, Meta, Gap, Tendência e Semáforo textual', () => {
    const cards = deterministicEngine.calculateCards(mockSnapshot, 'ALL')
    expect(cards.length).toBeGreaterThanOrEqual(5)

    const prodCard = cards.find((c) => c.id === 'kpi_production')
    expect(prodCard).toBeDefined()
    expect(prodCard?.realized).toBe((38.5 + 22.0) * 24)
    expect(prodCard?.target).toBe((45.0 + 25.0) * 24)
    expect(prodCard?.gap).toBeLessThan(0)
    expect(prodCard?.status).toBe('RED')
    expect(prodCard?.statusText).toContain('Desvio Crítico')
    expect(prodCard?.unit).toBe('t')
  })

  it('3. Filtro por Linha calcula métricas isoladas sem contaminação global', () => {
    const cardL01 = deterministicEngine.calculateCards(mockSnapshot, 'L01')
    const prodL01 = cardL01.find((c) => c.id === 'kpi_production')
    expect(prodL01?.realized).toBe(38.5 * 24)
    expect(prodL01?.target).toBe(45.0 * 24)
  })

  it('4. Pareto calcula quantidade, impacto, percentual e percentual acumulado corretamente (80/20)', () => {
    const pareto = deterministicEngine.calculatePareto([])
    expect(pareto.length).toBeGreaterThan(0)
    expect(pareto[0].cumulativePct).toBeLessThanOrEqual(100)
    expect(pareto[pareto.length - 1].cumulativePct).toBe(100)
    expect(pareto[0].isTopVital).toBe(true)
  })

  it('5. Priorização calcula Impacto x Urgência x Probabilidade x Alcance determinístico', () => {
    const prios = deterministicEngine.calculatePrioritization()
    expect(prios.length).toBeGreaterThan(0)
    for (const p of prios) {
      const expectedScore = p.impactScore * p.urgencyScore * p.probabilityScore * p.reachScore
      expect(p.totalPriorityScore).toBe(expectedScore)
      if (expectedScore >= 300) {
        expect(p.priorityCategory).toBe('CRITICA')
      }
    }
  })

  it('6. Módulos futuros não conectados são marcados como NOT_CONNECTED_STUB sem dados inventados', () => {
    const modules = deterministicEngine.getHubModulesStatus()
    const pcpMod = modules.find((m) => m.moduleId === 'pcp_robotizado')
    const crmMod = modules.find((m) => m.moduleId === 'crm_360')
    const hcmMod = modules.find((m) => m.moduleId === 'hcm_pessoas')

    expect(pcpMod?.status).toBe('ACTIVE_REAL_DATA')
    expect(crmMod?.status).toBe('NOT_CONNECTED_STUB')
    expect(crmMod?.recordsCount).toBe(0)
    expect(hcmMod?.status).toBe('NOT_CONNECTED_STUB')
    expect(hcmMod?.recordsCount).toBe(0)
  })

  it('7. Correlações e Tendências exibem aviso explícito de não causalidade', () => {
    const corrs = deterministicEngine.calculateCorrelations()
    for (const c of corrs) {
      expect(c.isCausalityProven).toBe(false)
      expect(c.warningNote).toBe('Correlação identificada — causalidade ainda não comprovada.')
    }
  })

  it('8. Resumo executivo estruturado contém as 5 seções obrigatórias', () => {
    const cards = deterministicEngine.calculateCards(mockSnapshot, 'ALL')
    const summary = deterministicEngine.generateExecutiveSummary(cards, 'ALL')
    expect(summary.currentSituation).toBeDefined()
    expect(summary.evidences.length).toBeGreaterThan(0)
    expect(summary.trend).toBeDefined()
    expect(summary.impact).toBeDefined()
    expect(summary.recommendation).toBeDefined()
  })
})
