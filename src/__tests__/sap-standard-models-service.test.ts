import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sapStandardModelsService } from '@/services/sap-standard-models-service'
import { pb } from '@/lib/pocketbase/client'

describe('sapStandardModelsService — Regras de Negócio, Duplicidade e Auditoria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Verifica regra de duplicidade exata (Código + Tipo + Linha + Empresa + Centro)', async () => {
    const mockList = vi.fn().mockResolvedValue([
      {
        id: 'rec_existing',
        material_code: '2001987E',
        material_type: 'ZHAL',
        line_id: 'line_l1',
        company_id: 'comp_ciafal',
        center: '1001',
        status: 'ATIVO',
      },
    ])

    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: mockList,
    } as any)

    const duplicate = await sapStandardModelsService.checkDuplicate({
      material_code: '2001987E',
      material_type: 'ZHAL',
      line_id: 'line_l1',
      company_id: 'comp_ciafal',
      center: '1001',
    })

    expect(duplicate).not.toBeNull()
    expect(duplicate?.id).toBe('rec_existing')
  })

  it('Impede criação se houver duplicidade exata e retorna mensagem de erro amigável', async () => {
    vi.spyOn(sapStandardModelsService, 'checkDuplicate').mockResolvedValue({
      id: 'rec_existing',
      material_code: '2001987E',
      material_type: 'ZHAL',
      line_id: 'line_l1',
      company_id: 'comp_ciafal',
      center: '1001',
      status: 'ATIVO',
      created: '',
      updated: '',
    })

    const res = await sapStandardModelsService.createModel({
      material_code: '2001987E',
      material_type: 'ZHAL',
      line_id: 'line_l1',
      company_id: 'comp_ciafal',
      center: '1001',
      status: 'ATIVO',
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe(
      'Este Código Modelo já está cadastrado para esta combinação de Tipo de Material, Linha, Empresa e Centro.',
    )
  })

  it('Algoritmo de Sugestão Automática prioriza Tipo de Material > Empresa > Centro > Linha', async () => {
    const mockRecords = [
      {
        id: '1',
        material_code: 'MOD_LINHA_ONLY',
        material_type: 'ROH',
        company_id: 'comp_other',
        center: '2001',
        line_id: 'L1',
        status: 'ATIVO',
      },
      {
        id: '2',
        material_code: 'MOD_PERFECT_MATCH',
        material_type: 'ZHAL',
        company_id: 'comp_ciafal',
        center: '1001',
        line_id: 'L1',
        status: 'ATIVO',
      },
      {
        id: '3',
        material_code: 'MOD_TYPE_MATCH',
        material_type: 'ZHAL',
        company_id: 'comp_other',
        center: '9999',
        line_id: 'L2',
        status: 'ATIVO',
      },
    ]

    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: vi.fn().mockResolvedValue(mockRecords),
    } as any)

    const suggestions = await sapStandardModelsService.findSuggestedModels({
      material_type: 'ZHAL',
      company_id: 'comp_ciafal',
      center: '1001',
      line_id: 'L1',
    })

    expect(suggestions.length).toBeGreaterThan(0)
    // Primeiro deve ser o PERFECT MATCH (score mais alto)
    expect(suggestions[0].material_code).toBe('MOD_PERFECT_MATCH')
  })
})
