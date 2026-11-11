import { describe, it, expect, beforeEach, vi } from 'vitest'
import { furnaceChargingService } from '@/services/furnace-charging-service'
import { TIPOS_ENFORNAMENTO_OPCOES, FurnaceChargingTypeFormData } from '@/types/furnace-charging'
import { pb } from '@/lib/pocketbase/client'

/**
 * Aceitação — Novas proporções de Tipo de Enfornamento (1,3:1 e 1,5:1)
 * Ficha Mestre Expandida > Tipos de Enfornamento — HUB CIAFAL / PCP Robotizado
 */

const OPCOES_ANTIGAS = [
  'Frio',
  'Quente',
  'Tapete (1:1)',
  'Tapete (2:1)',
  'Tapete (1:2)',
  'Normal',
  'Intercalado (1:1)',
  'Intercalado (2:1)',
  'Intercalado (3:1)',
  'Frente forno',
]

const NOVAS_OPCOES = [
  'Tapete (1,3:1)',
  'Tapete (1,5:1)',
  'Intercalado (1,3:1)',
  'Intercalado (1,5:1)',
]

describe('Tipos de Enfornamento — novas proporções 1,3:1 e 1,5:1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Critério 1 — dropdown contém as 4 novas opções com vírgula decimal junto das anteriores', () => {
    // Fonte única centralizada que alimenta o Select do popup
    const lista: readonly string[] = TIPOS_ENFORNAMENTO_OPCOES

    for (const nova of NOVAS_OPCOES) {
      expect(lista).toContain(nova)
      // Padrão brasileiro: vírgula decimal, nunca ponto
      expect(nova).not.toContain('1.3')
      expect(nova).not.toContain('1.5')
    }

    for (const antiga of OPCOES_ANTIGAS) {
      expect(lista).toContain(antiga)
    }
    expect(lista).toHaveLength(14)
  })

  it('Critério 1b — nenhum rótulo usa ponto decimal no padrão 1.3:1 / 1.5:1', () => {
    for (const tipo of TIPOS_ENFORNAMENTO_OPCOES) {
      expect(tipo).not.toMatch(/\d\.\d:/)
    }
  })

  it('Critério 2 — valida novas proporções (persistência aceita o valor gravado em banco)', () => {
    for (const nova of NOVAS_OPCOES) {
      const data: FurnaceChargingTypeFormData = {
        center_code: 'LAM1',
        charging_type: nova,
        raw_material_code: 'MPPA',
      }
      const errors = furnaceChargingService.validateChargingTypeFormData(data)
      expect(errors.charging_type).toBeUndefined()
    }
  })

  it('Critério 3 — rejeita valor fora da lista central (round-trip de edição protegido)', () => {
    const data: FurnaceChargingTypeFormData = {
      center_code: 'LAM1',
      charging_type: 'Intercalado (9,9:1)',
      raw_material_code: 'MPPA',
    }
    const errors = furnaceChargingService.validateChargingTypeFormData(data)
    expect(errors.charging_type).toBe('Tipo de enfornamento inválido.')
  })

  it('Critério 2b — saveChargingType persiste nova proporção (create) e registra auditoria', async () => {
    const createMock = vi.fn().mockResolvedValue({
      id: 'rec_novo',
      center_code: 'LAM1',
      charging_type: 'Intercalado (1,5:1)',
      raw_material_code: 'MPPA',
      active: true,
      deleted: false,
    })
    const getListMock = vi.fn().mockResolvedValue({ items: [], totalItems: 0 })
    const auditCreateMock = vi.fn().mockResolvedValue({ id: 'aud_1' })
    const getOneMock = vi.fn().mockResolvedValue({ id: 'rec_novo' })

    const collectionSpy = vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'line_furnace_charging_types') {
        return {
          getList: getListMock,
          create: createMock,
          getOne: getOneMock,
        } as any
      }
      if (name === 'pcp_audit_logs') {
        return { create: auditCreateMock } as any
      }
      return {} as any
    })

    const data: FurnaceChargingTypeFormData = {
      center_code: 'LAM1',
      charging_type: 'Intercalado (1,5:1)',
      raw_material_code: 'MPPA',
      min_weight_t: 1.3,
    }

    const saved = await furnaceChargingService.saveChargingType(data)

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(createMock.mock.calls[0][0].charging_type).toBe('Intercalado (1,5:1)')
    expect(saved.charging_type).toBe('Intercalado (1,5:1)')
    expect(auditCreateMock).toHaveBeenCalledTimes(1)
    expect(auditCreateMock.mock.calls[0][0].action).toBe('CREATE_FURNACE_CHARGING_TYPE')

    collectionSpy.mockRestore()
  })

  it('Critério 3b — edição carrega valor salvo (getOne) e update mantém a nova proporção', async () => {
    const updateMock = vi.fn().mockResolvedValue({
      id: 'rec_novo',
      center_code: 'LAM1',
      charging_type: 'Tapete (1,3:1)',
      raw_material_code: 'MPTA',
      active: true,
      deleted: false,
    })
    const getOneMock = vi.fn().mockResolvedValue({
      id: 'rec_novo',
      center_code: 'LAM1',
      charging_type: 'Tapete (1,3:1)',
      raw_material_code: 'MPTA',
      active: true,
      deleted: false,
    })
    const getListMock = vi.fn().mockResolvedValue({ items: [], totalItems: 0 })
    const auditCreateMock = vi.fn().mockResolvedValue({ id: 'aud_2' })

    const collectionSpy = vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'line_furnace_charging_types') {
        return {
          getList: getListMock,
          update: updateMock,
          getOne: getOneMock,
        } as any
      }
      if (name === 'pcp_audit_logs') {
        return { create: auditCreateMock } as any
      }
      return {} as any
    })

    const data: FurnaceChargingTypeFormData = {
      id: 'rec_novo',
      center_code: 'LAM1',
      charging_type: 'Tapete (1,3:1)',
      raw_material_code: 'MPTA',
    }

    const saved = await furnaceChargingService.saveChargingType(data)

    // Round-trip: o valor gravado é o mesmo rótulo com vírgula, então reabrir em
    // edição reinicializa o Select com exatamente esse valor (initialData.charging_type)
    expect(getOneMock).toHaveBeenCalledWith('rec_novo')
    expect(updateMock).toHaveBeenCalledTimes(1)
    expect(updateMock.mock.calls[0][0].charging_type).toBe('Tapete (1,3:1)') // id
    expect(saved.charging_type).toBe('Tapete (1,3:1)')

    collectionSpy.mockRestore()
  })

  it('Critério 4 — todas as 10 opções antigas permanecem, sem renomear nem remover', () => {
    for (const antiga of OPCOES_ANTIGAS) {
      expect(TIPOS_ENFORNAMENTO_OPCOES).toContain(antiga)
    }
    // Novas inseridas entre as antigas (ordem exigida pelo usuário)
    const lista = [...TIPOS_ENFORNAMENTO_OPCOES]
    expect(lista.indexOf('Tapete (1,3:1)')).toBeGreaterThan(lista.indexOf('Tapete (1:1)'))
    expect(lista.indexOf('Tapete (1,5:1)')).toBeGreaterThan(lista.indexOf('Tapete (1,3:1)'))
    expect(lista.indexOf('Tapete (2:1)')).toBeGreaterThan(lista.indexOf('Tapete (1,5:1)'))
    expect(lista.indexOf('Intercalado (1,3:1)')).toBeGreaterThan(lista.indexOf('Intercalado (1:1)'))
    expect(lista.indexOf('Intercalado (1,5:1)')).toBeGreaterThan(
      lista.indexOf('Intercalado (1,3:1)'),
    )
    expect(lista.indexOf('Intercalado (2:1)')).toBeGreaterThan(lista.indexOf('Intercalado (1,5:1)'))
  })
})
