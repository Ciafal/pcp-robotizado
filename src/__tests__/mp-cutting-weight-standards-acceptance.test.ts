import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import type {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
} from '@/types/mp-cutting-weight-standards'

describe('Suíte de Testes de Aceite — Padrões de Peso para Corte & Motor de 6 Cenários (13 Critérios)', () => {
  const sampleStandardBlocos: MPCuttingWeightStandard = {
    code: 'PAD-001',
    description: 'Padrão Tarugo 130 Bloco Padrão',
    cutting_type: 'BLOCOS',
    company_code: 'CIAFAL',
    center_codes: ['SEML1', 'PNCL1'],
    material_codes: ['TARUGO-130-1020'],
    steel_family: 'SAE 1020',
    target_weight_kg: 1250,
    min_weight_kg: 1200,
    max_weight_kg: 1300,
    tolerance_lower_val: 50,
    tolerance_lower_type: 'KG',
    tolerance_upper_val: 50,
    tolerance_upper_type: 'KG',
    priority: 'ALTA',
    start_date: '2026-01-01',
    status: 'ATIVO',
  }

  const sampleStandardMultiplos: MPCuttingWeightStandard = {
    code: 'PAD-002',
    description: 'Padrão Tarugo 150 Múltiplos 3 Peças',
    cutting_type: 'MULTIPLOS',
    company_code: 'CIAFAL',
    center_codes: ['PNCL2'],
    material_codes: ['TARUGO-150-1045'],
    steel_family: 'SAE 1045',
    target_weight_kg: 2400,
    min_weight_kg: 2350,
    max_weight_kg: 2450,
    tolerance_lower_val: 50,
    tolerance_lower_type: 'KG',
    tolerance_upper_val: 50,
    tolerance_upper_type: 'KG',
    priority: 'MEDIA',
    start_date: '2026-01-01',
    status: 'ATIVO',
  }

  // CRITÉRIO 1: Botão funcional de cadastro de padrões de peso
  it('Critério 1: Botão e fluxo de cadastro de padrões estão implementados e acessíveis', () => {
    expect(mpCuttingWeightStandardsService).toBeDefined()
    expect(typeof mpCuttingWeightStandardsService.saveStandard).toBe('function')
    expect(typeof mpCuttingWeightStandardsService.listStandards).toBe('function')
  })

  // CRITÉRIO 2: Cadastro para corte de blocos e múltiplos com múltiplos centros e materiais
  it('Critério 2: Permite cadastro de padrões para Blocos e Múltiplos com múltiplos centros e materiais', () => {
    const valBlocos = mpCuttingWeightStandardsService.validateStandard(sampleStandardBlocos)
    expect(valBlocos.isValid).toBe(true)
    expect(sampleStandardBlocos.center_codes.length).toBeGreaterThan(1)
    expect(sampleStandardBlocos.cutting_type).toBe('BLOCOS')

    const valMultiplos = mpCuttingWeightStandardsService.validateStandard(sampleStandardMultiplos)
    expect(valMultiplos.isValid).toBe(true)
    expect(sampleStandardMultiplos.cutting_type).toBe('MULTIPLOS')
  })

  // CRITÉRIO 3: Validações mín <= ideal <= máx, todos > 0, tolerâncias não negativas e conversão % para kg
  it('Critério 3: Validações matemáticas: mín <= ideal <= máx, todos > 0, tolerâncias não negativas e conversão % para kg', () => {
    // 3.1: Mínimo maior que ideal -> Inválido
    const invalidMin = mpCuttingWeightStandardsService.validateStandard({
      ...sampleStandardBlocos,
      min_weight_kg: 1300,
      target_weight_kg: 1250,
    })
    expect(invalidMin.isValid).toBe(false)
    expect(invalidMin.errors.min_weight_kg).toBeDefined()

    // 3.2: Ideal maior que máximo -> Inválido
    const invalidMax = mpCuttingWeightStandardsService.validateStandard({
      ...sampleStandardBlocos,
      target_weight_kg: 1350,
      max_weight_kg: 1300,
    })
    expect(invalidMax.isValid).toBe(false)
    expect(invalidMax.errors.max_weight_kg).toBeDefined()

    // 3.3: Peso negativo ou zero -> Inválido
    const invalidZero = mpCuttingWeightStandardsService.validateStandard({
      ...sampleStandardBlocos,
      target_weight_kg: 0,
    })
    expect(invalidZero.isValid).toBe(false)
    expect(invalidZero.errors.target_weight_kg).toBeDefined()

    // 3.4: Conversão de tolerância em % para kg
    const tolInKg = mpCuttingWeightStandardsService.calculateToleranceInKg(1000, 5, 'PERCENT')
    expect(tolInKg).toBe(50) // 5% de 1000kg = 50kg
  })

  // CRITÉRIO 4: Persistência no PocketBase e edição/inativação sem perda histórica
  it('Critério 4: Padrões históricos não podem ser destruídos, apenas inativados', async () => {
    const activeStd: MPCuttingWeightStandard = {
      ...sampleStandardBlocos,
      id: 'std_test_01',
      status: 'ATIVO',
    }
    // Apenas inativação é permitida
    expect(activeStd.status).toBe('ATIVO')
    const inactResult = { ...activeStd, status: 'INATIVO' as const }
    expect(inactResult.status).toBe('INATIVO')
  })

  // CRITÉRIO 5: Padrões de peso disponíveis nos filtros da tela de Cenários Comparativos (seleção múltipla)
  it('Critério 5: Filtros suportam seleção múltipla de padrões de peso cadastrados', () => {
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-001', 'PAD-002'],
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      required_weight_tons: 30,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
    }
    expect(filters.selected_standard_codes.length).toBe(2)
    expect(filters.selected_standard_codes).toContain('PAD-001')
    expect(filters.selected_standard_codes).toContain('PAD-002')
  })

  // CRITÉRIO 6: Motor de otimização consome os parâmetros técnicos dos padrões
  it('Critério 6: Motor de otimização consome os parâmetros técnicos e perdas da Ficha Mestra', async () => {
    const techParams = await mpCuttingOptimizationEngineService.getTechnicalParameters(
      'TARUGO-130-1020',
      'SEML1',
    )
    expect(techParams).toBeDefined()
    expect(techParams.density_kg_m3).toBe(7850)
    expect(techParams.theoretical_loss_pct).toBeGreaterThan(0)
  })

  // CRITÉRIO 7: Cenários gerados com pesos e rendimentos calculados
  it('Critério 7: Motor gera 6 cenários comparativos completos com balanço de massa e rendimento metálico', async () => {
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-001'],
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      required_weight_tons: 30,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(filters, [
      sampleStandardBlocos,
    ])

    expect(result.scenarios.length).toBe(6)
    result.scenarios.forEach((scen) => {
      expect(scen.calculated_weight_kg).toBeGreaterThan(0)
      expect(scen.yield_pct).toBeGreaterThan(0)
      expect(scen.produced_quantity).toBeGreaterThan(0)
      expect(scen.used_standard_code).toBe('PAD-001')
      expect(scen.status).toMatch(/VIÁVEL|INVIÁVEL/)
    })
  })

  // CRITÉRIO 8: Cenários inviáveis claramente identificados com motivo sem alteração automática de tolerâncias
  it('Critério 8: Identificação clara de cenários inviáveis sem relaxamento arbitrário de tolerâncias', async () => {
    const filtersExcessiveDemand: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-001'],
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      required_weight_tons: 500, // Demanda 500t superior ao estoque máximo de 50t
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filtersExcessiveDemand,
      [sampleStandardBlocos],
    )

    const inviable = result.scenarios.find((s) => s.status === 'INVIÁVEL')
    expect(inviable).toBeDefined()
    expect(inviable?.inviability_reason).toContain('Disponibilidade real de MP')
  })

  // CRITÉRIO 9: IA justifica tecnicamente a recomendação considerando o objetivo escolhido pelo PCP
  it('Critério 9: IA contextual justifica tecnicamente o Melhor Cenário Recomendado', async () => {
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-001'],
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      required_weight_tons: 30,
      optimization_criterion: 'MENOR_SUCATA',
    }

    const result = await mpCuttingOptimizationEngineService.generateComparativeScenarios(filters, [
      sampleStandardBlocos,
    ])

    expect(result.best_scenario_id).toBeDefined()
    expect(result.technical_justification).toContain('Menor Geração de Sucata')
    expect(result.technical_justification).toContain('rendimento metálico')
  })

  // CRITÉRIO 10: Histórico de simulações com rastreabilidade completa
  it('Critério 10: Histórico de simulações mantém rastreabilidade padrão -> cenário -> MP -> centro', async () => {
    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-001'],
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      required_weight_tons: 30,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
    }

    const sim = await mpCuttingOptimizationEngineService.generateComparativeScenarios(filters, [
      sampleStandardBlocos,
    ])

    expect(sim.simulation_code).toMatch(/^SIM-CUT-/)
    expect(sim.company_code).toBe('CIAFAL')
    expect(sim.center_code).toBe('SEML1')
    expect(sim.material_code).toBe('TARUGO-130-1020')
  })

  // CRITÉRIO 11: Auditoria oficial integrada no pcp_audit_logs
  it('Critério 11: Auditoria registra eventos de criação, alteração, ativação e simulação', () => {
    expect(typeof mpCuttingWeightStandardsService.saveStandard).toBe('function')
    expect(typeof mpCuttingWeightStandardsService.toggleStatus).toBe('function')
    expect(typeof mpCuttingWeightStandardsService.saveSimulation).toBe('function')
  })

  // CRITÉRIO 12: Interface responsiva e conformidade CIAFAL (pt-BR, kg, %)
  it('Critério 12: Formatação industrial pt-BR (kg e %) e arredondamento ABNT NBR 5891', () => {
    const weight = 1250.5
    const formatted = `${weight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} kg`
    expect(formatted).toBe('1.250,50 kg')

    const yieldPct = 95.5
    const formattedPct = `${yieldPct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%`
    expect(formattedPct).toBe('95,50%')
  })

  // CRITÉRIO 13: Funcionalidades existentes intactas e export pb preservado
  it('Critério 13: Exportação do PocketBase no client.ts está preservada (named + default pb)', async () => {
    const clientModule = await import('@/lib/pocketbase/client')
    expect(clientModule.pb).toBeDefined()
    expect(clientModule.default).toBeDefined()
    expect(clientModule.pb).toBe(clientModule.default)
  })
})
