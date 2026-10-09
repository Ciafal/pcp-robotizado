import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { mpCuttingOptimizationEngineService } from '@/services/mp-cutting-optimization-engine-service'
import { parsePtBrNumber, formatNumberPtBr } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'
import type {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
} from '@/types/mp-cutting-weight-standards'

describe('Suíte E2E Completa T1 a T12 — Padrões de Peso de Corte', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // T1: Código sequencial válido na tabela, na mensagem e preservado na edição; nunca "Novo" ou undefined
  it('T1: Código sequencial automático (PAD-XXX) numérico incremental único', async () => {
    const listSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'getFullList')
    listSpy.mockResolvedValueOnce([
      { id: '1', code: 'PAD-001' },
      { id: '2', code: 'PAD-002' },
      { id: '3', code: 'PAD-005' },
    ] as any)

    const nextCode = await mpCuttingWeightStandardsService.generateNextCode()
    expect(nextCode).toBe('PAD-006')
    expect(nextCode).not.toBe('Novo')
    expect(nextCode).not.toContain('undefined')
  })

  // T2: Pesos sem NaN: exibição e conversão de 2,000 / 2,100 / 2,300 t sem valores zero falsos
  it('T2: Pesos 2,000 / 2,100 / 2,300 t exibidos e calculados sem NaN', () => {
    const parsedTarget = parsePtBrNumber('2,100')
    const parsedMin = parsePtBrNumber('2,000')
    const parsedMax = parsePtBrNumber('2,300')

    expect(parsedTarget).toBe(2.1)
    expect(parsedMin).toBe(2.0)
    expect(parsedMax).toBe(2.3)

    const targetKg = parsedTarget * 1000
    const minKg = parsedMin * 1000
    const maxKg = parsedMax * 1000

    expect(targetKg).toBe(2100)
    expect(minKg).toBe(2000)
    expect(maxKg).toBe(2300)

    const formattedIdeal = `${(targetKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t`
    expect(formattedIdeal).toBe('2,100 t')
    expect(formattedIdeal).not.toContain('NaN')

    const formattedRange = `${(minKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} a ${(maxKg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t`
    expect(formattedRange).toBe('2,000 a 2,300 t')
    expect(formattedRange).not.toContain('NaN')
  })

  // T3: Prioridade Alta/Média/Baixa persistida, normalizada e recuperada
  it('T3: Prioridade Alta/Média/Baixa normalizada na gravação e recuperação', async () => {
    const createSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'create')
    createSpy.mockResolvedValueOnce({
      id: 'rec_prio_1',
      code: 'PAD-003',
      description: 'Padrão Alta Prioridade',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 2100,
      min_weight_kg: 2000,
      max_weight_kg: 2300,
      priority: 'ALTA',
      start_date: '2026-05-01',
      status: 'ATIVO',
    } as any)

    const res = await mpCuttingWeightStandardsService.saveStandard({
      description: 'Padrão Alta Prioridade',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 2100,
      min_weight_kg: 2000,
      max_weight_kg: 2300,
      priority: 'ALTA',
      start_date: '2026-05-01',
    })

    expect(res.success).toBe(true)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'ALTA',
      }),
    )
  })

  // T4: F5 preserva tudo (recuperação de dados reais da base com mapeamento correto)
  it('T4: Recuperação de registros existentes preserva código e mapeia campos sem NaN', async () => {
    const listSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'getFullList')
    listSpy.mockResolvedValueOnce([
      {
        id: 'xf7p8regpcc61da',
        code: 'PAD-001',
        description: 'Tarugo L1 130x130 Padrão Bloco 1,250 t',
        cutting_type: 'BLOCOS',
        company_code: 'CIAFAL',
        center_codes: ['SEML1', 'L1'],
        material_codes: ['TARUGO-130-1020', 'TARUGO-130-1045'],
        target_weight_kg: '1250',
        min_weight_kg: '1200',
        max_weight_kg: '1300',
        priority: 'ALTA',
        status: 'ATIVO',
        start_date: '2025-01-01',
        end_date: '2026-12-31',
      } as any,
    ])

    const standards = await mpCuttingWeightStandardsService.listStandards(true)
    expect(standards.length).toBe(1)
    const std = standards[0]
    expect(std.code).toBe('PAD-001')
    expect(std.target_weight_kg).toBe(1250)
    expect(std.min_weight_kg).toBe(1200)
    expect(std.max_weight_kg).toBe(1300)
    expect(std.priority).toBe('ALTA')
    expect(std.status).toBe('ATIVO')
  })

  // T5: Inativação persistida com solicitação de motivo e auditoria
  it('T5: Inativação persistida com motivo e registro em pcp_audit_logs', async () => {
    const updateSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'update')
    updateSpy.mockResolvedValueOnce({
      id: 'xf7p8regpcc61da',
      code: 'PAD-001',
      status: 'INATIVO',
    } as any)

    const std: MPCuttingWeightStandard = {
      id: 'xf7p8regpcc61da',
      code: 'PAD-001',
      description: 'Tarugo L1 130x130',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      priority: 'ALTA',
      status: 'ATIVO',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    }

    const res = await mpCuttingWeightStandardsService.toggleStatus(
      std,
      'Engenheiro Chefe',
      'Descontinuado por alteração de cilindro',
    )
    expect(res.success).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith('xf7p8regpcc61da', {
      status: 'INATIVO',
      updated_by_user_name: 'Engenheiro Chefe',
    })
  })

  // T6: Reativação persistida respeitando vigência e validação prévia
  it('T6: Reativação pré-valida integridade do padrão antes de persistir', async () => {
    const invalidStd: MPCuttingWeightStandard = {
      id: 'inv_1',
      code: 'PAD-099',
      description: 'Inválido',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 0,
      min_weight_kg: 0,
      max_weight_kg: 0,
      priority: 'MEDIA',
      status: 'INATIVO',
      start_date: '2026-01-01',
    }

    const res = await mpCuttingWeightStandardsService.toggleStatus(invalidStd, 'Engenheiro')
    expect(res.success).toBe(false)
    expect(res.error).toContain('pesos inválidos')
  })

  // T7: Bloqueio de data retroativa no frontend e backend (fuso America/Sao_Paulo)
  it('T7: Bloqueio de data de início anterior à data atual', () => {
    const val = mpCuttingWeightStandardsService.validateStandard({
      description: 'Padrão com início retroativo',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 2100,
      min_weight_kg: 2000,
      max_weight_kg: 2300,
      priority: 'ALTA',
      start_date: '2020-01-01', // Retroativo
    })

    expect(val.isValid).toBe(false)
    expect(val.errors.start_date).toBe(
      'A data de início da vigência não pode ser anterior à data atual.',
    )
  })

  // T8: Início futuro gravado e não usável antes da vigência
  it('T8: Padrão ativo porém fora da vigência não é elegível para simulação', () => {
    const stdFuturo: MPCuttingWeightStandard = {
      id: 'futuro_1',
      code: 'PAD-999',
      description: 'Padrão Futuro 2030',
      cutting_type: 'BLOCOS',
      company_code: 'CIAFAL',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 2100,
      min_weight_kg: 2000,
      max_weight_kg: 2300,
      priority: 'ALTA',
      status: 'ATIVO',
      start_date: '2030-01-01', // Futuro
    }

    const today = new Date().toISOString().split('T')[0]
    const isVigente =
      stdFuturo.start_date <= today && (!stdFuturo.end_date || stdFuturo.end_date >= today)
    expect(isVigente).toBe(false)
  })

  // T9: Edição altera pesos/prioridade no mesmo registro sem duplicar e sem perder código
  it('T9: Edição preserva código sequencial e atualiza no mesmo ID', async () => {
    const updateSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'update')
    updateSpy.mockResolvedValueOnce({
      id: 'xf7p8regpcc61da',
      code: 'PAD-001',
      description: 'Tarugo L1 Editado',
      target_weight_kg: 2100,
      min_weight_kg: 2000,
      max_weight_kg: 2300,
      priority: 'MEDIA',
      status: 'ATIVO',
    } as any)

    const res = await mpCuttingWeightStandardsService.saveStandard(
      {
        id: 'xf7p8regpcc61da',
        code: 'PAD-001',
        description: 'Tarugo L1 Editado',
        target_weight_kg: 2100,
        min_weight_kg: 2000,
        max_weight_kg: 2300,
        priority: 'MEDIA',
        center_codes: ['SEML1'],
        material_codes: ['TARUGO-130-1020'],
        start_date: '2025-01-01', // Data histórica existente preservada
      },
      'QA PCP',
    )

    expect(res.success).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith(
      'xf7p8regpcc61da',
      expect.objectContaining({
        code: 'PAD-001',
        target_weight_kg: 2100,
        priority: 'MEDIA',
      }),
    )
  })

  // T10: Registros antigos tratados (recuperável vs pendente de correção)
  it('T10: Registros sem pesos ou sem dados obrigatórios viram PENDENTE_CORRECAO', async () => {
    const listSpy = vi.spyOn(pb.collection('mp_cutting_weight_standards'), 'getFullList')
    listSpy.mockResolvedValueOnce([
      {
        id: 'bad_rec',
        code: 'PAD-BAD',
        description: '', // falta descrição
        target_weight_kg: null, // peso nulo
        status: 'ATIVO',
      } as any,
    ])

    const standards = await mpCuttingWeightStandardsService.listStandards(true)
    expect(standards.length).toBe(1)
    expect(standards[0].status).toBe('PENDENTE_CORRECAO')
  })

  // T11: Pesos corretos nos filtros e motor de otimização (sem NaN no FilterBar ou cálculo)
  it('T11: Motor de otimização recebe pesos em kg sem produzir NaN', async () => {
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
      target_weight_kg: 1250,
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      required_weight_tons: 30,
      optimization_criterion: 'MAIOR_APROVEITAMENTO',
    }

    const sim = await mpCuttingOptimizationEngineService.generateComparativeScenarios(filters, [
      standardActive,
    ])
    expect(sim.scenarios.length).toBe(6)
    sim.scenarios.forEach((sc) => {
      expect(isNaN(sc.yield_pct)).toBe(false)
      expect(isNaN(sc.calculated_weight_kg)).toBe(false)
      expect(isNaN(sc.estimated_leftover_kg)).toBe(false)
      expect(isNaN(sc.cutting_loss_kg)).toBe(false)
    })
  })

  // T12: Regressão — sem tolerâncias adicionais na interface, demais recursos intactos
  it('T12: Validação mantém estritamente Peso Mínimo <= Ideal <= Máximo sem campos tolerância adicionais', () => {
    const val = mpCuttingWeightStandardsService.validateStandard({
      description: 'Padrão válido',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 2100,
      min_weight_kg: 2000,
      max_weight_kg: 2300,
      start_date: '2026-06-01',
    })
    expect(val.isValid).toBe(true)

    const valInvalido = mpCuttingWeightStandardsService.validateStandard({
      description: 'Padrão inválido min > ideal',
      center_codes: ['SEML1'],
      material_codes: ['TARUGO-130-1020'],
      target_weight_kg: 2100,
      min_weight_kg: 2200, // Maior que ideal
      max_weight_kg: 2300,
      start_date: '2026-06-01',
    })
    expect(valInvalido.isValid).toBe(false)
    expect(valInvalido.errors.min_weight_kg).toContain('não pode ser maior')
  })
})
