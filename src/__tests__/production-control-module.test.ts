import { describe, it, expect } from 'vitest'
import { pcpProductionService, defaultProductionFilters } from '@/services/pcp-production-service'
import type { ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR } from '@/lib/formatters-ptbr'

describe('Módulo de Controle de Produção (HUB CIAFAL)', () => {
  it('deve fornecer filtros padrão corretos e estado neutro', () => {
    expect(defaultProductionFilters.empresa).toBe('TODAS')
    expect(defaultProductionFilters.centro).toBe('TODOS')
    expect(defaultProductionFilters.comSemPendencia).toBe('TODOS')
    expect(defaultProductionFilters.buscaTexto).toBe('')
  })

  it('deve listar ordens com os campos de conciliação obrigatórios', async () => {
    const orders = await pcpProductionService.listOrders()
    expect(orders.length).toBeGreaterThan(0)

    const op = orders[0]
    expect(op).toHaveProperty('op_number')
    expect(op).toHaveProperty('quantity_planned_tons')
    expect(op).toHaveProperty('quantity_produced_tons')
    expect(op).toHaveProperty('quantity_posted_tons')
    expect(op).toHaveProperty('quantity_sap_tons')
    expect(op).toHaveProperty('balance_tons')
    expect(op).toHaveProperty('status_mes')
    expect(op).toHaveProperty('status_sap')
    expect(op).toHaveProperty('status_fechamento')
    expect(op).toHaveProperty('ai_risk_score')
  })

  it('status MES e status SAP devem ser rigorosamente separados', async () => {
    const orders = await pcpProductionService.listOrders()
    const opCritical = orders.find((o) => o.op_number === 'OP-2025-0891')
    expect(opCritical).toBeDefined()

    // No MES está finalizado pelo operador, mas no SAP há erro de integração
    expect(opCritical?.status_mes).toBe('FINALIZADO_OPERADOR')
    expect(opCritical?.status_sap).toBe('ERRO_INTEGRACAO')
    expect(opCritical?.status_fechamento).toBe('PENDENTE_DE_FECHAMENTO')
    expect(opCritical?.balance_tons).toBeGreaterThan(0)
  })

  it('deve validar regra estrita: OP não encerra apenas por atingir quantidade se houver pendências', async () => {
    const orders = await pcpProductionService.listOrders()
    const opOver = orders.find((o) => o.op_number === 'OP-2025-0925')
    expect(opOver).toBeDefined()
    expect(opOver!.quantity_produced_tons).toBeGreaterThan(opOver!.quantity_planned_tons)
    // Mesmo tendo atingido ou superado 100%, continua PENDENTE DE FECHAMENTO
    expect(opOver!.status_fechamento).toBe('PENDENTE_DE_FECHAMENTO')
  })

  it('deve gerar desvios de produção respeitando a tolerância e os 3 blocos da IA', () => {
    const mockOrder: ProductionOrder = {
      id: 'mock-1',
      op_number: 'OP-TEST-001',
      empresa_code: 'CIAFAL',
      centro_code: 'SEML1',
      linha_code: 'L1',
      work_center: 'SEML1',
      material_code: 'MAT-01',
      material_description: 'Tubo de Aço Teste',
      family_code: 'TUBOS',
      steel_grade: 'SAE 1020',
      gauge_dimension: '50 mm',
      product_name: 'Tubo',
      mrp_planner: 'PCP',
      programming_type: 'Laminação',
      quantity_planned_tons: 100.0,
      quantity_produced_tons: 90.0, // 10% a menos (fora da tolerância de 2%)
      quantity_posted_tons: 90.0,
      quantity_sap_tons: 90.0,
      balance_tons: 10.0,
      yield_planned_pct: 95.0,
      yield_realized_pct: 92.0, // 3 p.p. abaixo
      planned_start_date: '',
      planned_end_date: '',
      real_start_date: '',
      real_end_date: '',
      status_op: 'CONCLUIDA_FISICAMENTE',
      status_mes: 'FINALIZADO_OPERADOR',
      status_sap: 'CONFIRMADA_PARCIAL',
      status_fechamento: 'PENDENTE_DE_FECHAMENTO',
      visual_status: 'DESVIO',
      ai_risk_score: 'ALTO_RISCO',
      ai_risk_reason: 'Desvio de quantidade e rendimento',
      has_pendency: true,
      has_deviation: true,
      deviation_reason: 'Quantidade e Rendimento',
      last_posting_at: '',
      operator_leader: 'Operador Teste',
    }

    const devs = pcpProductionService.getDeviationsForOrder(mockOrder)
    expect(devs.length).toBe(2)

    const qtyDev = devs.find((d) => d.deviation_type === 'QUANTIDADE')
    expect(qtyDev).toBeDefined()
    expect(qtyDev?.ai_recommendation).toHaveProperty('fact')
    expect(qtyDev?.ai_recommendation).toHaveProperty('hypothesis')
    expect(qtyDev?.ai_recommendation).toHaveProperty('suggested_action')
  })

  it('deve carregar configuração parametrizada ZPP_01 do backend com os blocos homologados', async () => {
    const configs = await pcpProductionService.listZPP01Configs()
    expect(configs.length).toBeGreaterThan(0)

    const groups = Array.from(new Set(configs.map((c) => c.group_code)))
    expect(groups).toContain('TOTAL')
    expect(groups).toContain('ARCELOR')
    expect(groups).toContain('VALLOUREC')
    expect(groups).toContain('KS')
    expect(groups).toContain('SIDERCENTRO')
    expect(groups).toContain('CISAM')
  })

  it('formatação deve seguir padrão pt-BR obrigatório (nunca ponto decimal em exibição)', () => {
    const formattedQty = formatQuantity(1234.567, 't')
    expect(formattedQty).toBe('1.234,567 t')

    const formattedPct = formatPercentagePTBR(91.0)
    expect(formattedPct).toBe('91,0%')
  })
})
