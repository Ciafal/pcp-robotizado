import { describe, it, expect, vi } from 'vitest'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import { parsePtBrNumber, formatNumberPtBr } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'
import type {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
} from '@/types/mp-cutting-weight-standards'

describe('Testes Obrigatórios T1 a T7 — Ciclo de Padrões de Peso para Corte', () => {
  // Padrão base correspondente ao print do usuário (1.250 kg ideal, 1.200 kg mín, 1.300 kg máx)
  const baseStandard: Partial<MPCuttingWeightStandard> = {
    description: '[TESTE QA] Tarugo 130x130 Bloco 1.250 kg',
    cutting_type: 'BLOCOS',
    company_code: 'CIAFAL',
    center_codes: ['SEML1'],
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

  it('T1: "+ Novo Padrão de Peso" validação matemática com formato pt-BR e parsing consistente', () => {
    // Usuário digitou "1.250", "1.200", "1.300", "50"
    const parsedTarget = parsePtBrNumber('1.250')
    const parsedMin = parsePtBrNumber('1.200')
    const parsedMax = parsePtBrNumber('1.300')
    const parsedTol = parsePtBrNumber('50')

    expect(parsedTarget).toBe(1250)
    expect(parsedMin).toBe(1200)
    expect(parsedMax).toBe(1300)
    expect(parsedTol).toBe(50)

    // Também aceita "1250,00"
    expect(parsePtBrNumber('1250,00')).toBe(1250)
    expect(parsePtBrNumber('1.250,00')).toBe(1250)

    const val = mpCuttingWeightStandardsService.validateStandard({
      ...baseStandard,
      target_weight_kg: parsedTarget,
      min_weight_kg: parsedMin,
      max_weight_kg: parsedMax,
    })
    expect(val.isValid).toBe(true)
  })

  it('T2: Salvar vazio destaca campos obrigatórios com motivos específicos (description, pesos, centros)', () => {
    const valVazio = mpCuttingWeightStandardsService.validateStandard({
      description: '',
      center_codes: [],
      material_codes: [],
      target_weight_kg: 0,
      min_weight_kg: 0,
      max_weight_kg: 0,
    })

    expect(valVazio.isValid).toBe(false)
    expect(valVazio.errors.description).toContain('obrigatória')
    expect(valVazio.errors.center_codes).toContain('ao menos um centro')
    expect(valVazio.errors.material_codes).toContain('ao menos um material')
    expect(valVazio.errors.target_weight_kg).toContain('maior que zero')
  })

  it('T3: Salvar padrão de teste válido com auditoria não-bloqueante SCHEDULE_ACTION', async () => {
    // Mock do pb.collection('mp_cutting_weight_standards') para garantir isolamento e verificação
    const createSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'create')
    const fakeRecord = {
      id: 'test_rec_' + Date.now(),
      code: 'PAD-TEST-01',
      description: baseStandard.description,
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
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
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    createSpy.mockResolvedValueOnce(fakeRecord as any)

    const res = await mpCuttingWeightStandardsService.saveStandard(baseStandard, 'QA Engenheiro')
    expect(res.success).toBe(true)
    expect(res.standard).toBeDefined()
    expect(res.standard?.code).toBe('PAD-TEST-01')
    expect(res.standard?.target_weight_kg).toBe(1250)

    createSpy.mockRestore()
  })

  it('T4: Listar padrões ativos preserva registros e formata visualmente pt-BR', async () => {
    const listSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'getFullList')
    listSpy.mockResolvedValueOnce([
      {
        id: 'rec_01',
        code: 'PAD-001',
        description: 'Tarugo 130x130 Bloco 1.250 kg',
        cutting_type: 'BLOCOS',
        company_code: 'CIAFAL',
        center_codes: ['SEML1'],
        material_codes: ['TARUGO-130-1020'],
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
        created: '2026-01-01T00:00:00Z',
        updated: '2026-01-01T00:00:00Z',
      } as any,
    ])

    const list = await mpCuttingWeightStandardsService.listStandards(false)
    expect(list.length).toBe(1)
    expect(list[0].code).toBe('PAD-001')
    expect(
      formatNumberPtBr(list[0].target_weight_kg, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ).toBe('1.250,00')

    listSpy.mockRestore()
  })

  it('T5: Editar registro atualiza o MESMO ID sem duplicar', async () => {
    const updateSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'update')
    const existingId = 'rec_to_edit_123'
    updateSpy.mockResolvedValueOnce({
      id: existingId,
      code: 'PAD-001',
      description: '[TESTE QA] Tarugo 130x130 Bloco 1.250 kg ATUALIZADO',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 1260,
      min_weight_kg: 1210,
      max_weight_kg: 1310,
      tolerance_lower_val: 50,
      tolerance_lower_type: 'KG',
      tolerance_upper_val: 50,
      tolerance_upper_type: 'KG',
      priority: 'ALTA',
      start_date: '2026-01-01',
      status: 'ATIVO',
    } as any)

    const res = await mpCuttingWeightStandardsService.saveStandard(
      {
        ...baseStandard,
        id: existingId,
        description: '[TESTE QA] Tarugo 130x130 Bloco 1.250 kg ATUALIZADO',
        target_weight_kg: 1260,
      },
      'QA Engenheiro',
    )

    expect(res.success).toBe(true)
    expect(res.standard?.id).toBe(existingId)
    expect(updateSpy).toHaveBeenCalledWith(
      existingId,
      expect.objectContaining({
        target_weight_kg: 1260,
      }),
    )

    updateSpy.mockRestore()
  })

  it('T6: Falha controlada (ex: erro de rede) retorna erro específico sem travar estado', async () => {
    const createSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'create')
    createSpy.mockRejectedValueOnce(new Error('PocketBase timeout / connection lost'))

    const res = await mpCuttingWeightStandardsService.saveStandard(baseStandard)
    expect(res.success).toBe(false)
    expect(res.error).toContain('PocketBase timeout')

    createSpy.mockRestore()
  })

  it('T7: Padrão ativo aparece selecionável nos filtros dos 6 Cenários Comparativos', async () => {
    const standardActive: MPCuttingWeightStandard = {
      code: 'PAD-001',
      description: 'Tarugo 130x130 Bloco 1.250 kg',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
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

    const filters: MPCuttingOptimizationFilters = {
      company_code: 'CIAFAL',
      center_code: 'SEML1',
      cutting_type: 'BLOCOS',
      material_code: 'TARUGO-130-1020',
      selected_standard_codes: ['PAD-001'],
      target_weight_kg: standardActive.target_weight_kg,
      min_weight_kg: standardActive.min_weight_kg,
      max_weight_kg: standardActive.max_weight_kg,
      required_weight_tons: 30,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
    }

    const simulation = await mpCuttingOptimizationEngineService.generateComparativeScenarios(
      filters,
      [standardActive],
    )

    expect(simulation.scenarios.length).toBe(6)
    expect(simulation.selected_standard_codes).toContain('PAD-001')
    expect(simulation.best_scenario_id).toBeDefined()
  })
})
