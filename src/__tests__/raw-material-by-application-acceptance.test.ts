import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseBrNumber,
  formatBrNumber,
  formatBrWithUnit,
  calculateReductionFromRatioX,
  calculateReductionFromPercentage,
} from '@/utils/number-br-formatters'
import { rawMaterialApplicationService } from '@/services/raw-material-application-service'
import { RawMaterialApplicationFormData } from '@/types/raw-material-application'
import pb from '@/lib/pocketbase/client'

describe('Fase 1: Matéria-Prima por Aplicação — Formatação BR & Sincronização de Redução', () => {
  it('deve converter números pt-BR com vírgula e ponto de milhar corretamente', () => {
    expect(parseBrNumber('1.250,50')).toBe(1250.5)
    expect(parseBrNumber('6,00')).toBe(6.0)
    expect(parseBrNumber('1250,50')).toBe(1250.5)
    expect(parseBrNumber('0,85')).toBe(0.85)
    expect(parseBrNumber('')).toBeNull()
    expect(parseBrNumber(null)).toBeNull()
    expect(parseBrNumber(1500)).toBe(1500)
  })

  it('deve formatar número no padrão pt-BR com vírgula e milhar', () => {
    expect(formatBrNumber(1250.5, 2)).toBe('1.250,50')
    expect(formatBrNumber(6, 2)).toBe('6,00')
    expect(formatBrWithUnit(1250.5, 'kg')).toBe('1.250,50 kg')
    expect(formatBrWithUnit(6, 'm')).toBe('6,00 m')
  })

  it('deve calcular redução com razão 1:5 gerando exatamente 80,00%', () => {
    // Fórmula: Redução (%) = (1 - 1/X) * 100
    // 1:5 -> (1 - 1/5) * 100 = 80,00%
    const res = calculateReductionFromRatioX(5)
    expect(res.isValid).toBe(true)
    expect(res.ratioX).toBe(5)
    expect(res.ratioText).toBe('1:5')
    expect(res.percentage).toBe(80)
    expect(res.percentageText).toBe('80,00%')
  })

  it('deve calcular redução com razão 1:5 via string formatada "5" ou "5,00"', () => {
    const res = calculateReductionFromRatioX('5,00')
    expect(res.isValid).toBe(true)
    expect(res.percentage).toBe(80)
  })

  it('deve calcular redução com razão 1:4 gerando exatamente 75,00%', () => {
    // 1:4 -> (1 - 1/4) * 100 = 75,00%
    const res = calculateReductionFromRatioX(4)
    expect(res.isValid).toBe(true)
    expect(res.percentage).toBe(75)
    expect(res.percentageText).toBe('75,00%')
  })

  it('deve converter percentual para razão 1:X (inverso: 80% -> 1:5)', () => {
    const res = calculateReductionFromPercentage(80)
    expect(res.isValid).toBe(true)
    expect(res.ratioX).toBe(5)
    expect(res.ratioText).toBe('1:5')
  })

  it('deve rejeitar razão com divisão por zero ou X <= 0', () => {
    const resZero = calculateReductionFromRatioX(0)
    expect(resZero.isValid).toBe(false)
    expect(resZero.error).toContain('maior que zero')

    const resNeg = calculateReductionFromRatioX(-2)
    expect(resNeg.isValid).toBe(false)
  })
})

describe('Fase 1: Matéria-Prima por Aplicação — Validações dos 8 Casos Obrigatórios', () => {
  const baseValidForm: RawMaterialApplicationFormData = {
    line_id: 'line_test_01',
    center_code: 'LAM-01',
    product_code: 'PROD-1045-30',
    product_description: 'Barra Redonda 1045 30mm',
    raw_material_code: 'MP-TAR-130-1045',
    raw_material_description: 'Tarugo 130x130 SAE 1045',
    supplier: 'Gerdau Aços Especiais',
    application: 'Laminação Direta',
    average_weight_kg: '1.250,50',
    max_weight_kg: '1.300,00',
    min_weight_kg: '1.200,00',
    rolled_length_m: '6,00',
    multiple_length_m: '12,00',
    max_mp_length_m: '6,50',
    min_mp_length_m: '5,50',
    reduction_ratio_x: '5',
    reduction_percentage: '80,00',
    first_run: true,
    allow_out_of_standard_mp: false,
    status: 'Ativo',
  }

  it('caso base válido não deve produzir erros', () => {
    const errors = rawMaterialApplicationService.validateFormData(baseValidForm)
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('Caso 1: peso mínimo maior que peso máximo -> erro sob o campo', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      min_weight_kg: '1.400,00',
      max_weight_kg: '1.300,00',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.min_weight_kg).toBe('Peso mínimo não pode ser maior que o peso máximo.')
  })

  it('Caso 2: peso médio menor que o mínimo -> erro sob o campo', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      min_weight_kg: '1.200,00',
      average_weight_kg: '1.150,00',
      max_weight_kg: '1.300,00',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.average_weight_kg).toBe('Peso médio não pode ser menor que o peso mínimo.')
  })

  it('Caso 3: peso médio maior que o máximo -> erro sob o campo', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      min_weight_kg: '1.200,00',
      max_weight_kg: '1.300,00',
      average_weight_kg: '1.350,00',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.average_weight_kg).toBe('Peso médio não pode ser maior que o peso máximo.')
  })

  it('Caso 4: comprimento mínimo da MP maior que comprimento máximo da MP -> erro sob o campo', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      min_mp_length_m: '7,00',
      max_mp_length_m: '6,00',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.min_mp_length_m).toBe(
      'Comprimento mínimo da MP não pode ser maior que o comprimento máximo.',
    )
  })

  it('Caso 5: valores negativos -> erro sob os respectivos campos', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      average_weight_kg: '-10,00',
      min_weight_kg: '-5,00',
      max_weight_kg: '-2,00',
      rolled_length_m: '-6,00',
      multiple_length_m: '-12,00',
      min_mp_length_m: '-1,00',
      max_mp_length_m: '-1,00',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.average_weight_kg).toBe('Peso médio não pode ser negativo.')
    expect(errors.min_weight_kg).toBe('Peso mínimo não pode ser negativo.')
    expect(errors.rolled_length_m).toBe('Comprimento laminado não pode ser negativo.')
    expect(errors.multiple_length_m).toBe('Comprimento múltiplo não pode ser negativo.')
    expect(errors.min_mp_length_m).toBe('Comprimento mínimo MP não pode ser negativo.')
  })

  it('Caso 6: redução inválida (divisão por zero ou razão <= 0) -> erro sob o campo', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      reduction_ratio_x: '0',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.reduction).toBeDefined()
    expect(errors.reduction).toContain('divisão por zero')
  })

  it('Caso 7: Código MP vazio -> erro bloqueado sob o campo', () => {
    const data: RawMaterialApplicationFormData = {
      ...baseValidForm,
      raw_material_code: '   ',
    }
    const errors = rawMaterialApplicationService.validateFormData(data)
    expect(errors.raw_material_code).toBe('Código MP é obrigatório.')
  })

  it('Caso 8: bloqueio de duplicidade exata Centro + Produto + Aplicação + Código MP', async () => {
    // Mock do pb.collection('line_raw_material_applications').getFullList
    const mockExisting = [
      {
        id: 'rec_existing_01',
        line_id: 'line_test_01',
        center_code: 'LAM-01',
        product_code: 'PROD-1045-30',
        application: 'Laminação Direta',
        raw_material_code: 'MP-TAR-130-1045',
        status: 'Ativo',
      },
    ]

    const spy = vi
      .spyOn(pb.collection('line_raw_material_applications'), 'getFullList')
      .mockResolvedValueOnce(mockExisting as any)

    const isDup = await rawMaterialApplicationService.checkDuplicate({
      lineId: 'line_test_01',
      centerCode: 'LAM-01',
      productCode: 'PROD-1045-30',
      application: 'Laminação Direta',
      rawMaterialCode: 'MP-TAR-130-1045',
    })

    expect(isDup).toBe(true)

    // Permite mesma MP para outra aplicação diferente
    spy.mockResolvedValueOnce(mockExisting as any)
    const isDifferentApp = await rawMaterialApplicationService.checkDuplicate({
      lineId: 'line_test_01',
      centerCode: 'LAM-01',
      productCode: 'PROD-1045-30',
      application: 'Trefilação Especial',
      rawMaterialCode: 'MP-TAR-130-1045',
    })
    expect(isDifferentApp).toBe(false)

    // Permite outra MP para a mesma aplicação
    spy.mockResolvedValueOnce(mockExisting as any)
    const isDifferentMp = await rawMaterialApplicationService.checkDuplicate({
      lineId: 'line_test_01',
      centerCode: 'LAM-01',
      productCode: 'PROD-1045-30',
      application: 'Laminação Direta',
      rawMaterialCode: 'MP-TAR-150-1045',
    })
    expect(isDifferentMp).toBe(false)
  })
})

describe('Fase 1 & Preparação Fase 2: Regras de Negócio e Rastreabilidade Técnica', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve permitir múltiplas MPs e múltiplas aplicações para o mesmo centro/produto sem sobrescrever', async () => {
    const listMock = [
      {
        id: '1',
        line_id: 'L1',
        center_code: 'LAM-01',
        product_code: 'BARRA-1045',
        raw_material_code: 'MP-01',
        application: 'Aplicação A',
        status: 'Ativo',
      },
      {
        id: '2',
        line_id: 'L1',
        center_code: 'LAM-01',
        product_code: 'BARRA-1045',
        raw_material_code: 'MP-02',
        application: 'Aplicação A',
        status: 'Ativo',
      },
      {
        id: '3',
        line_id: 'L1',
        center_code: 'LAM-01',
        product_code: 'BARRA-1045',
        raw_material_code: 'MP-01',
        application: 'Aplicação B',
        status: 'Ativo',
      },
    ]

    vi.spyOn(pb.collection('line_raw_material_applications'), 'getFullList').mockResolvedValue(
      listMock as any,
    )

    const result = await rawMaterialApplicationService.listByLine('L1')
    expect(result).toHaveLength(3)

    // Filtro por aplicação
    const filteredAppA = await rawMaterialApplicationService.listByLine('L1', {
      application: 'Aplicação A',
    })
    expect(filteredAppA).toHaveLength(2)

    // Filtro por Código MP
    const filteredMp1 = await rawMaterialApplicationService.listByLine('L1', {
      raw_material_code: 'MP-01',
    })
    expect(filteredMp1).toHaveLength(2)
  })

  it('Regra 5: Quando Permitir fora padrão MP = NÃO -> bloqueia fora de limites técnicos', async () => {
    const mockApp = {
      id: 'app_strict_01',
      center_code: 'LAM-01',
      product_code: 'BARRA-1045',
      raw_material_code: 'MP-TAR-130',
      application: 'Laminação Padrão',
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      min_mp_length_m: 5.5,
      max_mp_length_m: 6.5,
      allow_out_of_standard_mp: false, // NÃO autoriza exceção
      status: 'Ativo',
    }

    vi.spyOn(pb.collection('line_raw_material_applications'), 'getFullList').mockResolvedValue([
      mockApp,
    ] as any)
    const recordValidationSpy = vi
      .spyOn(rawMaterialApplicationService, 'recordMonthlyValidation')
      .mockResolvedValue()

    // Teste com peso fora do limite (1.350 kg > 1.300 kg)
    const valResult = await rawMaterialApplicationService.validateMpForMonthlySchedule({
      monthlyPeriod: '2026-10',
      centerCode: 'LAM-01',
      productCode: 'BARRA-1045',
      rawMaterialCode: 'MP-TAR-130',
      application: 'Laminação Padrão',
      weightKg: 1350,
      lengthM: 6.0,
    })

    expect(valResult.allowed).toBe(false)
    expect(valResult.validationResult).toBe('REJECTED_OUT_OF_STANDARD')
    expect(valResult.message).toContain('Bloqueio: Matéria-prima fora dos limites técnicos')
    expect(recordValidationSpy).toHaveBeenCalled()
  })

  it('Regra 5: Quando Permitir fora padrão MP = SIM -> autoriza com alerta oficial de exceção e auditoria', async () => {
    const mockApp = {
      id: 'app_exception_01',
      center_code: 'LAM-01',
      product_code: 'BARRA-1045',
      raw_material_code: 'MP-TAR-130',
      application: 'Laminação Padrão',
      min_weight_kg: 1200,
      max_weight_kg: 1300,
      allow_out_of_standard_mp: true, // SIM: autorização técnica previamente cadastrada na Ficha Mestra
      status: 'Ativo',
    }

    vi.spyOn(pb.collection('line_raw_material_applications'), 'getFullList').mockResolvedValue([
      mockApp,
    ] as any)
    const recordValidationSpy = vi
      .spyOn(rawMaterialApplicationService, 'recordMonthlyValidation')
      .mockResolvedValue()

    const valResult = await rawMaterialApplicationService.validateMpForMonthlySchedule({
      monthlyPeriod: '2026-10',
      centerCode: 'LAM-01',
      productCode: 'BARRA-1045',
      rawMaterialCode: 'MP-TAR-130',
      application: 'Laminação Padrão',
      weightKg: 1350, // fora do limite
    })

    expect(valResult.allowed).toBe(true)
    expect(valResult.validationResult).toBe('APPROVED_WITH_EXCEPTION')
    expect(valResult.message).toBe(
      'Matéria-prima fora do padrão técnico — exceção autorizada pela Ficha Mestra.',
    )
    expect(recordValidationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        validationResult: 'APPROVED_WITH_EXCEPTION',
        exceptionUsed: true,
      }),
    )
  })

  it('Regra 9: Não permitir MP inativa na Programação Mensal', async () => {
    const mockApp = {
      id: 'app_inactive_01',
      center_code: 'LAM-01',
      product_code: 'BARRA-1045',
      raw_material_code: 'MP-TAR-130',
      application: 'Laminação Padrão',
      status: 'Inativo',
      allow_out_of_standard_mp: true,
    }

    vi.spyOn(pb.collection('line_raw_material_applications'), 'getFullList').mockResolvedValue([
      mockApp,
    ] as any)
    vi.spyOn(rawMaterialApplicationService, 'recordMonthlyValidation').mockResolvedValue()

    const valResult = await rawMaterialApplicationService.validateMpForMonthlySchedule({
      monthlyPeriod: '2026-10',
      centerCode: 'LAM-01',
      productCode: 'BARRA-1045',
      rawMaterialCode: 'MP-TAR-130',
      application: 'Laminação Padrão',
    })

    expect(valResult.allowed).toBe(false)
    expect(valResult.validationResult).toBe('REJECTED_INACTIVE')
    expect(valResult.message).toContain('status INATIVO na Ficha Mestra')
  })

  it('Regra 6: Produtividade com novos campos (Comprimento Mín/Máx e kg/m)', async () => {
    const createSpy = vi
      .spyOn(pb.collection('line_productivity_rates'), 'create')
      .mockResolvedValue({ id: 'prod_new_01' } as any)
    vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({} as any)

    // Validação kg/m <= 0 deve lançar erro
    await expect(
      rawMaterialApplicationService.saveProductivityWithDimensions({
        line_id: 'L1',
        material_product_code: 'BARRA-1045',
        material_product_name: 'Barra Redonda 1045',
        productivity_unit: 't/h',
        kg_per_meter: 0,
      }),
    ).rejects.toThrow('kg/metro (kg/m) deve ser maior que zero.')

    // Validação comp min > max deve lançar erro
    await expect(
      rawMaterialApplicationService.saveProductivityWithDimensions({
        line_id: 'L1',
        material_product_code: 'BARRA-1045',
        material_product_name: 'Barra Redonda 1045',
        productivity_unit: 't/h',
        min_length_m: 7,
        max_length_m: 6,
      }),
    ).rejects.toThrow('Comprimento mínimo não pode ser maior que o comprimento máximo.')

    // Salvamento com dados válidos
    await rawMaterialApplicationService.saveProductivityWithDimensions({
      line_id: 'L1',
      material_product_code: 'BARRA-1045',
      material_product_name: 'Barra Redonda 1045',
      productivity_unit: 't/h',
      min_length_m: 5.5,
      max_length_m: 6.5,
      kg_per_meter: 12.5,
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        min_length_m: 5.5,
        max_length_m: 6.5,
        kg_per_meter: 12.5,
      }),
    )
  })
})
