import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  rawMaterialRestrictionsService,
  normalizeGaugeString,
  areGaugesEqual,
  LineRawMaterialRestriction,
} from '@/services/line-raw-material-restrictions-service'
import { pb } from '@/lib/pocketbase/client'

describe('Restrições de Matéria-Prima (HUB Ciafal) - Regras e Precedência', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve normalizar e comparar bitolas com precisão pt-BR (ex: 12,70 mm == 12.70 == 12,70)', () => {
    expect(normalizeGaugeString('12,70 mm')).toBe('12.70')
    expect(normalizeGaugeString('12.70')).toBe('12.70')
    expect(areGaugesEqual('12,70 mm', '12.70 mm')).toBe(true)
    expect(areGaugesEqual('6,35 mm', '6,35')).toBe(true)
    expect(areGaugesEqual('9,53 mm', '12,70 mm')).toBe(false)
  })

  it('deve validar vigência de restrição corretamente', () => {
    const activeValidRule: LineRawMaterialRestriction = {
      id: 'res_1',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_CSN_BQ_1012',
      material_description: 'Bobina Laminada a Quente',
      restricted_product_gauges: ['6,35 mm', '7,94 mm'],
      valid_from: '2026-01-01',
      valid_until: '2026-12-31',
      reason: 'Risco de perda de rendimento',
      active: true,
      deleted: false,
    }

    // Data dentro da vigência
    expect(
      rawMaterialRestrictionsService.isRestrictionCurrentlyValid(
        activeValidRule,
        new Date('2026-06-15T12:00:00Z'),
      ),
    ).toBe(true)

    // Data fora da vigência (anterior)
    expect(
      rawMaterialRestrictionsService.isRestrictionCurrentlyValid(
        activeValidRule,
        new Date('2025-12-31T12:00:00Z'),
      ),
    ).toBe(false)

    // Data fora da vigência (posterior)
    expect(
      rawMaterialRestrictionsService.isRestrictionCurrentlyValid(
        activeValidRule,
        new Date('2027-01-01T12:00:00Z'),
      ),
    ).toBe(false)

    // Regra inativa
    expect(
      rawMaterialRestrictionsService.isRestrictionCurrentlyValid(
        { ...activeValidRule, active: false },
        new Date('2026-06-15T12:00:00Z'),
      ),
    ).toBe(false)

    // Regra deletada logicamente
    expect(
      rawMaterialRestrictionsService.isRestrictionCurrentlyValid(
        { ...activeValidRule, deleted: true },
        new Date('2026-06-15T12:00:00Z'),
      ),
    ).toBe(false)

    // Regra sem valid_until (prazo indeterminado)
    expect(
      rawMaterialRestrictionsService.isRestrictionCurrentlyValid(
        { ...activeValidRule, valid_until: undefined },
        new Date('2030-01-01T12:00:00Z'),
      ),
    ).toBe(true)
  })

  it('deve identificar duplicidade exata de Centro + MP + Bitola Restrita com a mensagem exata', async () => {
    const existingRules: LineRawMaterialRestriction[] = [
      {
        id: 'rule_1',
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina Laminada a Quente',
        restricted_product_gauges: ['6,35 mm', '7,94 mm'],
        valid_from: '2026-01-01',
        reason: 'Restrição dimensional',
        active: true,
        deleted: false,
      },
    ]

    // Tentativa com mesma MP e mesma bitola 6,35 mm
    const duplicityCheck = await rawMaterialRestrictionsService.validateGaugeDuplicity(
      {
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina Laminada',
        restricted_product_gauges: ['6,35 mm', '12,70 mm'],
        valid_from: '2026-01-01',
        reason: 'Novo teste',
        active: true,
      },
      existingRules,
    )

    expect(duplicityCheck.hasDuplicity).toBe(true)
    expect(duplicityCheck.message).toBe(
      'Já existe uma restrição cadastrada para esta matéria-prima e esta bitola neste Centro.',
    )

    // Outra bitola não existente (ex: 15,88 mm) não deve acusar duplicidade
    const noDuplicityCheck = await rawMaterialRestrictionsService.validateGaugeDuplicity(
      {
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina Laminada',
        restricted_product_gauges: ['15,88 mm'],
        valid_from: '2026-01-01',
        reason: 'Novo teste',
        active: true,
      },
      existingRules,
    )

    expect(noDuplicityCheck.hasDuplicity).toBe(false)
  })

  it('Precedência: RESTRIÇÃO PREVALECE SOBRE PRIORIDADE no motor de programação do PCP', async () => {
    const mockRules: LineRawMaterialRestriction[] = [
      {
        id: 'r_ks',
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina CSN BQ 1012',
        restricted_product_gauges: ['6,35 mm', '7,94 mm'],
        valid_from: '2026-01-01',
        reason: 'Não utilizar para bitolas finas devido à condição dimensional e risco de perda.',
        active: true,
        deleted: false,
      },
    ]

    vi.spyOn(rawMaterialRestrictionsService, 'getRestrictionsByCenter').mockResolvedValue(mockRules)

    // Caso A: Produto com bitola restrita 6,35 mm -> deve classificar como restrita
    const checkA = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode: 'BLOCOSKS',
      materialCode: 'BOB_CSN_BQ_1012',
      productGauge: '6,35 mm',
      referenceDate: new Date('2026-05-01T10:00:00Z'),
    })

    expect(checkA.isRestricted).toBe(true)
    expect(checkA.precedenceApplied).toBe('RESTRICTION_OVER_PRIORITY')
    expect(checkA.reason).toContain('Não utilizar para bitolas finas')

    // Caso B: Produto com bitola permitida 12,70 mm -> compatível
    const checkB = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode: 'BLOCOSKS',
      materialCode: 'BOB_CSN_BQ_1012',
      productGauge: '12,70 mm',
      referenceDate: new Date('2026-05-01T10:00:00Z'),
    })

    expect(checkB.isRestricted).toBe(false)
    expect(checkB.precedenceApplied).toBe('NONE')

    // Caso C: Avaliação de candidatos onde a MP prioritária #1 é restrita para 7,94 mm
    const candidates = [
      { material_code: 'BOB_CSN_BQ_1012', priority_order: 1 }, // Prioridade máxima mas restrita
      { material_code: 'BOB_USI_BQ_1020', priority_order: 2 }, // Prioridade #2 compatível
    ]

    const result = await rawMaterialRestrictionsService.filterCompatibleRawMaterials(
      'BLOCOSKS',
      '7,94 mm',
      candidates,
      new Date('2026-05-01T10:00:00Z'),
    )

    // A MP com prioridade #1 foi bloqueada pela restrição
    expect(result.restricted.length).toBe(1)
    expect(result.restricted[0].candidate.material_code).toBe('BOB_CSN_BQ_1012')
    expect(result.compatible.length).toBe(1)
    expect(result.compatible[0].material_code).toBe('BOB_USI_BQ_1020')
  })

  it('deve registrar auditoria oficial em pcp_audit_logs ao cadastrar, editar, inativar e excluir logicamente', async () => {
    const auditCreateMock = vi.fn().mockResolvedValue({ id: 'audit_123' })
    const pbCollectionSpy = vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      if (colName === 'pcp_audit_logs') {
        return { create: auditCreateMock } as any
      }
      if (colName === 'line_raw_material_restrictions') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'res_new', ...data })),
          update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
          getOne: vi.fn().mockResolvedValue({
            id: 'res_existing',
            center_code: 'BLOCOSKS',
            material_code: 'BOB_CSN',
            material_description: 'Bobina',
            restricted_product_gauges: ['12,70 mm'],
            valid_from: '2026-01-01',
            reason: 'Motivo existente',
            active: true,
            deleted: false,
          }),
        } as any
      }
      return {} as any
    })

    // 1. Cadastrar
    const saved = await rawMaterialRestrictionsService.saveRestriction({
      center_code: 'BLOCOSKS',
      material_code: 'BOB_TESTE',
      material_description: 'Bobina Teste',
      restricted_product_gauges: ['9,53 mm'],
      valid_from: '2026-01-01',
      reason: 'Motivo obrigatório de teste',
      active: true,
    })

    expect(saved.id).toBe('res_new')
    expect(auditCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE_RAW_MATERIAL_RESTRICTION',
        resource: 'line_raw_material_restrictions',
        center: 'BLOCOSKS',
      }),
    )

    // 2. Inativar
    await rawMaterialRestrictionsService.setRestrictionActive('res_existing', false)
    expect(auditCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DEACTIVATE_RAW_MATERIAL_RESTRICTION',
        resource: 'line_raw_material_restrictions',
      }),
    )

    // 3. Excluir logicamente
    await rawMaterialRestrictionsService.softDeleteRestriction('res_existing')
    expect(auditCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SOFT_DELETE_RAW_MATERIAL_RESTRICTION',
        resource: 'line_raw_material_restrictions',
      }),
    )

    pbCollectionSpy.mockRestore()
  })
})
