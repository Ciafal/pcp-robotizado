import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  furnaceChargingService,
  DUPLICATE_SEPARATION_MSG,
} from '@/services/furnace-charging-service'
import { ChargeSeparationFormData, LineChargeSeparation } from '@/types/furnace-charging'
import { pb } from '@/lib/pocketbase/client'
import { parsePtBrNumber, formatNumberPtBr } from '@/lib/number-format'

describe('Charge Separation Acceptance — Peso, Dimensões e Validações Industriais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Critério 1: Campos de peso (t) e dimensões (mm) - Validação síncrona (min <= max)', () => {
    it('aceita formulário válido com os 8 campos de peso e dimensões preenchidos corretamente', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 4,
        blocks_arrangement: '4 em pé + 4 deitados',
        min_weight_t: 1.5,
        max_weight_t: 5.0,
        min_thickness_mm: 50.0,
        max_thickness_mm: 150.0,
        min_length_mm: 3000.0,
        max_length_mm: 6000.0,
        min_width_mm: 100.0,
        max_width_mm: 300.0,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('aceita campos de peso e dimensões como opcionais (valores undefined ou null)', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 2,
        min_weight_t: null,
        max_weight_t: null,
        min_thickness_mm: undefined,
        max_thickness_mm: undefined,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('rejeita quando Peso Mínimo for estritamente maior que Peso Máximo', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 2,
        min_weight_t: 8.5,
        max_weight_t: 3.2,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(errors.min_weight_t).toBe('Peso mín. não pode ser maior que o Peso máx.')
      expect(errors.max_weight_t).toBe('Peso máx. deve ser maior ou igual ao Peso mín.')
    })

    it('rejeita quando Espessura Mínima for maior que Espessura Máxima', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: '1020',
        charged_load_type: '1045',
        separator_blocks_qty: 1,
        min_thickness_mm: 200.0,
        max_thickness_mm: 120.0,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(errors.min_thickness_mm).toBe('Espessura mín. não pode ser maior que a Espessura máx.')
      expect(errors.max_thickness_mm).toBe(
        'Espessura máx. deve ser maior ou igual à Espessura mín.',
      )
    })

    it('rejeita quando Comprimento Mínimo for maior que Comprimento Máximo', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'Palanquilha',
        charged_load_type: 'Placa / Bloco',
        separator_blocks_qty: 0,
        min_length_mm: 7000.0,
        max_length_mm: 4000.0,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(errors.min_length_mm).toBe(
        'Comprimento mín. não pode ser maior que o Comprimento máx.',
      )
      expect(errors.max_length_mm).toBe(
        'Comprimento máx. deve ser maior ou igual ao Comprimento mín.',
      )
    })

    it('rejeita quando Largura Mínima for maior que Largura Máxima', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: '402 a 406',
        charged_load_type: '407 a 412',
        separator_blocks_qty: 3,
        min_width_mm: 350.0,
        max_width_mm: 180.0,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(errors.min_width_mm).toBe('Largura mín. não pode ser maior que a Largura máx.')
      expect(errors.max_width_mm).toBe('Largura máx. deve ser maior ou igual à Largura mín.')
    })
  })

  describe('Critério 2: Rejeição de valores negativos nos 8 campos e na quantidade de blocos', () => {
    it('rejeita valores negativos em peso mín./máx.', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 1,
        min_weight_t: -0.5,
        max_weight_t: 2.0,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(errors.min_weight_t).toBe('Peso mínimo não pode ser negativo.')
    })

    it('rejeita valores negativos em espessura, comprimento ou largura', () => {
      const data: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 1,
        min_thickness_mm: -10,
        max_length_mm: -100,
        min_width_mm: -5,
      }

      const errors = furnaceChargingService.validateChargeSeparationFormData(data)
      expect(errors.min_thickness_mm).toBe('Espessura mínima não pode ser negativo.')
      expect(errors.max_length_mm).toBe('Comprimento máximo não pode ser negativo.')
      expect(errors.min_width_mm).toBe('Largura mínima não pode ser negativo.')
    })

    it('rejeita quantidade de blocos negativa ou não inteira', () => {
      const dataNeg: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: -2,
      }
      const errorsNeg = furnaceChargingService.validateChargeSeparationFormData(dataNeg)
      expect(errorsNeg.separator_blocks_qty).toBe('A quantidade de blocos não pode ser negativa.')

      const dataFloat: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 2.5,
      }
      const errorsFloat = furnaceChargingService.validateChargeSeparationFormData(dataFloat)
      expect(errorsFloat.separator_blocks_qty).toBe(
        'A quantidade de blocos deve ser um número inteiro.',
      )
    })

    it('aceita quantidade de blocos igual a zero (sem separação necessária)', () => {
      const dataZero: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 0,
      }
      const errorsZero = furnaceChargingService.validateChargeSeparationFormData(dataZero)
      expect(errorsZero.separator_blocks_qty).toBeUndefined()
    })
  })

  describe('Critério 3: Suporte a formato pt-BR com vírgula decimal para peso e medidas', () => {
    it('converte corretamente strings pt-BR para números em ponto flutuante', () => {
      expect(parsePtBrNumber('1,500')).toBe(1.5)
      expect(parsePtBrNumber('5,25')).toBe(5.25)
      expect(parsePtBrNumber('3.500,75')).toBe(3500.75)
      expect(parsePtBrNumber('150,00')).toBe(150.0)
    })

    it('formata números para padrão pt-BR de exibição', () => {
      expect(formatNumberPtBr(2.5, { minimumFractionDigits: 2, maximumFractionDigits: 3 })).toBe(
        '2,50',
      )
      expect(formatNumberPtBr(120.75, { minimumFractionDigits: 2, maximumFractionDigits: 2 })).toBe(
        '120,75',
      )
    })
  })

  describe('Critério 4: Persistência no PocketBase com os 8 novos campos opcionais', () => {
    it('saveChargeSeparation envia os 8 campos de peso e dimensões no payload do PocketBase', async () => {
      const createMock = vi.fn().mockResolvedValue({
        id: 'sep_nova_1',
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 4,
        min_weight_t: 1.8,
        max_weight_t: 4.5,
        min_thickness_mm: 60.0,
        max_thickness_mm: 120.0,
        min_length_mm: 3500.0,
        max_length_mm: 5500.0,
        min_width_mm: 120.0,
        max_width_mm: 220.0,
        active: true,
        deleted: false,
      })

      const getListMock = vi.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
      })

      vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
        if (collName === 'line_charge_separations') {
          return {
            getList: getListMock,
            create: createMock,
          } as any
        }
        if (collName === 'pcp_audit_logs') {
          return {
            create: vi.fn().mockResolvedValue({}),
          } as any
        }
        return {} as any
      })

      const payload: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 4,
        min_weight_t: 1.8,
        max_weight_t: 4.5,
        min_thickness_mm: 60.0,
        max_thickness_mm: 120.0,
        min_length_mm: 3500.0,
        max_length_mm: 5500.0,
        min_width_mm: 120.0,
        max_width_mm: 220.0,
      }

      const result = await furnaceChargingService.saveChargeSeparation(payload)
      expect(result.id).toBe('sep_nova_1')
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          center_code: 'LAM1',
          charging_load_type: 'MPPA — Palanquilha',
          charged_load_type: 'MPPL — Placa',
          separator_blocks_qty: 4,
          min_weight_t: 1.8,
          max_weight_t: 4.5,
          min_thickness_mm: 60.0,
          max_thickness_mm: 120.0,
          min_length_mm: 3500.0,
          max_length_mm: 5500.0,
          min_width_mm: 120.0,
          max_width_mm: 220.0,
        }),
      )
    })

    it('impede criação e dispara erro quando validação falha no saveChargeSeparation', async () => {
      const invalidPayload: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 2,
        min_weight_t: 10.0,
        max_weight_t: 2.0, // Erro: min > max
      }

      await expect(furnaceChargingService.saveChargeSeparation(invalidPayload)).rejects.toThrow(
        'Peso mín. não pode ser maior que o Peso máx.',
      )
    })

    it('bloqueia duplicidade de Separação de Carga para a combinação Centro + Carga enfornar + Carga enfornada', async () => {
      vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
        if (collName === 'line_charge_separations') {
          return {
            getList: vi.fn().mockResolvedValue({
              items: [{ id: 'dup_existente' }],
              totalItems: 1,
            }),
          } as any
        }
        return {} as any
      })

      const dupPayload: ChargeSeparationFormData = {
        center_code: 'LAM1',
        charging_load_type: 'MPPA — Palanquilha',
        charged_load_type: 'MPPL — Placa',
        separator_blocks_qty: 2,
      }

      await expect(furnaceChargingService.saveChargeSeparation(dupPayload)).rejects.toThrow(
        DUPLICATE_SEPARATION_MSG,
      )
    })
  })
})
