import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sapModelTypesService,
  DUPLICATE_COMBINATION_ERROR_MSG,
} from '@/services/sap-model-types-service'
import { pb } from '@/lib/pocketbase/client'

describe('sapModelTypesService — Evolução Códigos Modelos Padrão (WERKS + ARBPL + MARA-MTART)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Verifica regra de duplicidade de combinação ativa (Centro + Centro de Trabalho + Tipo de Material)', async () => {
    const mockList = vi.fn().mockResolvedValue([
      {
        id: 'rec_existing_123',
        tipo_codigo_modelo: 'Produto acabado L1',
        centro: '1001',
        centro_trabalho: 'WC-DIV-L1',
        tipo_material: 'ZFER',
        status: 'Ativo',
      },
    ])

    vi.spyOn(pb, 'collection').mockReturnValue({
      getFullList: mockList,
    } as any)

    const duplicate = await sapModelTypesService.checkDuplicateActive('1001', 'WC-DIV-L1', 'ZFER')

    expect(duplicate).not.toBeNull()
    expect(duplicate?.id).toBe('rec_existing_123')
    expect(duplicate?.tipo_codigo_modelo).toBe('Produto acabado L1')
  })

  it('Bloqueia criação com a mensagem de erro exata quando já existe combinação ativa', async () => {
    vi.spyOn(sapModelTypesService, 'checkDuplicateActive').mockResolvedValue({
      id: 'rec_existing_123',
      tipo_codigo_modelo: 'Produto acabado L1',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo',
    })

    await expect(
      sapModelTypesService.createModelType({
        tipo_codigo_modelo: 'Outro nome com mesma chave',
        centro: '1001',
        centro_trabalho: 'WC-DIV-L1',
        tipo_material: 'ZFER',
        status: 'Ativo',
      }),
    ).rejects.toThrow('Já existe um Tipo de Código Modelo Padrão cadastrado para esta combinação.')
  })

  it('Permite cadastrar e vincular múltiplos códigos SAP ao mesmo Tipo de Código Modelo', async () => {
    const mockCreatedType = {
      id: 'type_new_456',
      tipo_codigo_modelo: 'Matéria-Prima Sucata',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ROH',
      status: 'Ativo',
    }

    const mockCreateType = vi.fn().mockResolvedValue(mockCreatedType)
    const mockCreateItem = vi
      .fn()
      .mockImplementation((data) => Promise.resolve({ id: `item_${Math.random()}`, ...data }))

    vi.spyOn(sapModelTypesService, 'checkDuplicateActive').mockResolvedValue(null)
    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'sap_model_types') {
        return {
          create: mockCreateType,
        } as any
      }
      if (name === 'sap_model_type_items') {
        return {
          create: mockCreateItem,
        } as any
      }
      if (name === 'pcp_audit_logs' || name === 'sap_validation_audit_logs') {
        return {
          create: vi.fn().mockResolvedValue({ id: 'audit_ok' }),
        } as any
      }
      return {
        create: vi.fn().mockResolvedValue({ id: 'ok' }),
        getFullList: vi.fn().mockResolvedValue([]),
      } as any
    })

    const result = await sapModelTypesService.createModelType({
      tipo_codigo_modelo: 'Matéria-Prima Sucata',
      descricao: 'Lote de sucatas e tarugos',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ROH',
      status: 'Ativo',
      usuario: 'PCP Engenharia',
      codigos_vinculados: [
        { codigo_material: '10008891', descricao: 'SUCATA DE ACO PESADA' },
        { codigo_material: '10008892', descricao: 'SUCATA DE ACO OXI-CORTE' },
      ],
    })

    expect(result.id).toBe('type_new_456')
    expect(result.tipo_codigo_modelo).toBe('Matéria-Prima Sucata')
    expect(result.modelos_count).toBe(2)
    expect(mockCreateItem).toHaveBeenCalledTimes(2)
  })

  it('Edição atualiza o registro sem duplicar e mantém integridade da chave', async () => {
    const existingType = {
      id: 'type_to_edit',
      tipo_codigo_modelo: 'Produto acabado L1',
      descricao: 'Descrição original',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo' as const,
      modelos_vinculados: [],
    }

    vi.spyOn(sapModelTypesService, 'getModelTypeById').mockResolvedValue(existingType as any)
    vi.spyOn(sapModelTypesService, 'checkDuplicateActive').mockResolvedValue(null)

    const mockUpdate = vi.fn().mockResolvedValue({
      ...existingType,
      descricao: 'Descrição atualizada com sucesso',
    })

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'sap_model_types') {
        return {
          update: mockUpdate,
        } as any
      }
      return {
        create: vi.fn().mockResolvedValue({ id: 'mock' }),
        getFullList: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true),
      } as any
    })

    const updated = await sapModelTypesService.updateModelType('type_to_edit', {
      descricao: 'Descrição atualizada com sucesso',
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      'type_to_edit',
      expect.objectContaining({ descricao: 'Descrição atualizada com sucesso' }),
    )
    expect(updated.id).toBe('type_to_edit')
  })

  it('Inativação lógica preserva dados e inativo NÃO é utilizado como referência futura', async () => {
    const activeItem = {
      id: 'type_active_99',
      tipo_codigo_modelo: 'Modelo Provisório',
      centro: '1002',
      centro_trabalho: 'LAML2',
      tipo_material: 'HALB',
      status: 'Ativo' as const,
      modelos_vinculados: [],
    }

    vi.spyOn(sapModelTypesService, 'getModelTypeById').mockResolvedValue(activeItem as any)

    const mockUpdate = vi.fn().mockResolvedValue({
      ...activeItem,
      status: 'Inativo',
    })

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'sap_model_types') {
        return {
          update: mockUpdate,
        } as any
      }
      return {
        create: vi.fn().mockResolvedValue({ id: 'audit_ok' }),
        getFullList: vi.fn().mockResolvedValue([]),
      } as any
    })

    const toggled = await sapModelTypesService.toggleStatus(
      'type_active_99',
      'Inativação para reforma de linha',
    )
    expect(toggled.status).toBe('Inativo')

    // Consulta de referência para combinação com registro inativo: deve retornar matched: false
    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'sap_model_types') {
        return {
          // Simulando que a query de ativos retorna vazio
          getFullList: vi.fn().mockResolvedValue([]),
        } as any
      }
      return { getFullList: vi.fn().mockResolvedValue([]) } as any
    })

    const refCheck = await sapModelTypesService.findReferenceModelByCombination(
      '1002',
      'LAML2',
      'HALB',
    )
    expect(refCheck.matched).toBe(false)
    expect(refCheck.message).toBe(
      'Nenhum Código Modelo Padrão foi configurado para esta combinação.',
    )
  })

  it('Preparação futura: findReferenceModelByCombination localiza o tipo ativo e retorna os códigos vinculados', async () => {
    const activeRecord = {
      id: 'type_active_ref',
      tipo_codigo_modelo: 'Perfis e Tubos L1',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo',
    }

    const linkedItems = [
      { id: 'item1', codigo_material: '10004521', status: 'Ativo' },
      { id: 'item2', codigo_material: '10004522', status: 'Ativo' },
    ]

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'sap_model_types') {
        return {
          getFullList: vi.fn().mockResolvedValue([activeRecord]),
        } as any
      }
      if (name === 'sap_model_type_items') {
        return {
          getFullList: vi.fn().mockResolvedValue(linkedItems),
        } as any
      }
      return { getFullList: vi.fn().mockResolvedValue([]) } as any
    })

    const ref = await sapModelTypesService.findReferenceModelByCombination(
      '1001',
      'WC-DIV-L1',
      'ZFER',
    )
    expect(ref.matched).toBe(true)
    expect(ref.tipo_codigo_modelo?.tipo_codigo_modelo).toBe('Perfis e Tubos L1')
    expect(ref.codigos_referencia).toEqual(['10004521', '10004522'])
  })
})
