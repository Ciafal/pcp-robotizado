import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  furnaceChargingService,
  DUPLICATE_CHARGING_TYPE_MSG,
  DUPLICATE_SEPARATION_MSG,
} from '@/services/furnace-charging-service'
import {
  FurnaceChargingTypeFormData,
  RAW_MATERIAL_TYPE_CATALOG,
  TIPOS_ENFORNAMENTO_OPCOES,
} from '@/types/furnace-charging'
import { pb } from '@/lib/pocketbase/client'

describe('Furnace Charging Acceptance — Validação de Tipo de MP e Duplicidade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validação síncrona de formulário (validateChargingTypeFormData)', () => {
    it('bloqueia quando o tipo de matéria-prima estiver vazio ou em branco', () => {
      const data: FurnaceChargingTypeFormData = {
        center_code: 'LAM1',
        charging_type: 'Frio',
        raw_material_code: '',
      }

      const errors = furnaceChargingService.validateChargingTypeFormData(data)
      expect(errors.raw_material_code).toBe('O Tipo de Matéria-Prima é obrigatório.')
    })

    it('bloqueia quando o tipo de matéria-prima não pertencer ao catálogo fechado homologado', () => {
      const data: FurnaceChargingTypeFormData = {
        center_code: 'LAM1',
        charging_type: 'Frio',
        raw_material_code: 'CODIGO_INVENTADO_X',
      }

      const errors = furnaceChargingService.validateChargingTypeFormData(data)
      expect(errors.raw_material_code).toContain(
        'Tipo de matéria-prima inválido. Selecione uma opção válida do catálogo',
      )
    })

    it('aceita todos os tipos de matéria-prima do catálogo fechado (MPPA, MPPL, MPRE, MPBL, MPTA, MPLI)', () => {
      for (const item of RAW_MATERIAL_TYPE_CATALOG) {
        const data: FurnaceChargingTypeFormData = {
          center_code: 'LAM1',
          charging_type: 'Frio',
          raw_material_code: item.code,
        }

        const errors = furnaceChargingService.validateChargingTypeFormData(data)
        expect(errors.raw_material_code).toBeUndefined()
      }
    })

    it('valida tipo de enfornamento e valores numéricos mínimos e máximos', () => {
      const invalidData: FurnaceChargingTypeFormData = {
        center_code: 'LAM1',
        charging_type: 'Tipo Invalido Que Nao Existe',
        raw_material_code: 'MPPA',
        min_weight_t: 10,
        max_weight_t: 5, // min > max
      }

      const errors = furnaceChargingService.validateChargingTypeFormData(invalidData)
      expect(errors.charging_type).toBe('Tipo de enfornamento inválido.')
      expect(errors.min_weight_t).toBe('Peso mín. não pode ser maior que o Peso máx.')
      expect(errors.max_weight_t).toBe('Peso máx. deve ser maior ou igual ao Peso mín.')
    })
  })

  describe('Bloqueio de Duplicidade (checkDuplicateChargingType e saveChargingType)', () => {
    it('detecta duplicidade da combinação (centro + tipo enfornamento + MP) ativa no banco', async () => {
      // Mock do PocketBase getList para simular registro existente
      const getListMock = vi.fn().mockResolvedValue({
        items: [
          {
            id: 'rec_123',
            center_code: 'LAM1',
            charging_type: 'Frio',
            raw_material_code: 'MPPA',
          },
        ],
        totalItems: 1,
      })

      const collectionSpy = vi.spyOn(pb, 'collection').mockReturnValue({
        getList: getListMock,
      } as any)

      const isDup = await furnaceChargingService.checkDuplicateChargingType({
        centerCode: 'LAM1',
        chargingType: 'Frio',
        rawMaterialCode: 'MPPA',
      })

      expect(isDup).toBe(true)
      expect(collectionSpy).toHaveBeenCalledWith('line_furnace_charging_types')
      expect(getListMock).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          filter: expect.stringContaining("center_code = 'LAM1'"),
        }),
      )
    })

    it('impede criação no saveChargingType disparando a mensagem padronizada em pt-BR', async () => {
      vi.spyOn(pb, 'collection').mockReturnValue({
        getList: vi.fn().mockResolvedValue({
          items: [{ id: 'rec_existente' }],
          totalItems: 1,
        }),
      } as any)

      const payload: FurnaceChargingTypeFormData = {
        center_code: 'LAM1',
        charging_type: 'Frio',
        raw_material_code: 'MPPA',
      }

      await expect(furnaceChargingService.saveChargingType(payload)).rejects.toThrow(
        DUPLICATE_CHARGING_TYPE_MSG,
      )
    })

    it('permite salvar quando estiver editando o próprio registro (ignora o próprio ID)', async () => {
      const getListMock = vi.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
      })
      const updateMock = vi.fn().mockResolvedValue({
        id: 'rec_proprio',
        center_code: 'LAM1',
        charging_type: 'Enfornamento Frio Direto',
        raw_material_code: 'MPPA',
        active: true,
        deleted: false,
      })
      const getOneMock = vi.fn().mockResolvedValue({
        id: 'rec_proprio',
        center_code: 'LAM1',
        charging_type: 'Enfornamento Frio Direto',
        raw_material_code: 'MPPA',
      })
      const createAuditMock = vi.fn().mockResolvedValue({})

      vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
        if (collName === 'line_furnace_charging_types') {
          return {
            getList: getListMock,
            update: updateMock,
            getOne: getOneMock,
          } as any
        }
        if (collName === 'pcp_audit_logs') {
          return {
            create: createAuditMock,
          } as any
        }
        return {} as any
      })

      const payload: FurnaceChargingTypeFormData = {
        id: 'rec_proprio',
        center_code: 'LAM1',
        charging_type: 'Frio',
        raw_material_code: 'MPPA',
      }

      const result = await furnaceChargingService.saveChargingType(payload)
      expect(result.id).toBe('rec_proprio')
      expect(updateMock).toHaveBeenCalled()
      // Filtro deve conter exclusão do próprio ID
      expect(getListMock).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          filter: expect.stringContaining("id != 'rec_proprio'"),
        }),
      )
    })

    it('permite a mesma combinação se o registro anterior estiver excluído logicamente (deleted = true)', async () => {
      // Quando deleted=true no banco, a consulta com deleted=false||deleted=null não deve retornar o registro
      const getListMock = vi.fn().mockResolvedValue({
        items: [],
        totalItems: 0,
      })

      vi.spyOn(pb, 'collection').mockReturnValue({
        getList: getListMock,
      } as any)

      const isDup = await furnaceChargingService.checkDuplicateChargingType({
        centerCode: 'LAM1',
        chargingType: 'Frio',
        rawMaterialCode: 'MPPA',
      })

      expect(isDup).toBe(false)
      expect(getListMock).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          filter: expect.stringContaining('(deleted = false || deleted = null)'),
        }),
      )
    })

    it('permite a mesma combinação em centros operacionais diferentes', async () => {
      const getListMock = vi.fn().mockImplementation((page, perPage, options) => {
        // Se for LAM2, não há duplicata
        if (options.filter.includes("center_code = 'LAM2'")) {
          return Promise.resolve({ items: [], totalItems: 0 })
        }
        return Promise.resolve({ items: [{ id: 'rec_lam1' }], totalItems: 1 })
      })

      vi.spyOn(pb, 'collection').mockReturnValue({
        getList: getListMock,
      } as any)

      const isDupLam2 = await furnaceChargingService.checkDuplicateChargingType({
        centerCode: 'LAM2',
        chargingType: 'Frio',
        rawMaterialCode: 'MPPA',
      })

      expect(isDupLam2).toBe(false)
    })
  })
})
