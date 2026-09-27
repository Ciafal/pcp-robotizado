import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parsePtBrNumber, formatPtBrNumber, calculatePiecesFromTons } from '@/lib/number-format'
import { sapMaterialService } from '@/services/sap-material-service'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { pb } from '@/lib/pocketbase/client'

describe('Regras do Inventário de Matéria-Prima (ST930, pt-BR, Fórmula e Corrida)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // ITEM 1: CAMPO CORRIDA OPCIONAL
  it('permite criar demanda com corrida (heat_number) vazia ou com múltiplas MPs onde uma tem e outra não', async () => {
    const demandRecordMock = {
      id: 'dem-corrida-opcional',
      control_number: 'INV-2026-000099',
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      production_order: '4500012342',
      status: 'Gerada',
      total_pieces_required: 200,
    }

    const itemCreateSpy = vi.fn().mockResolvedValue({ id: 'item-1' })
    const auditCreateSpy = vi.fn().mockResolvedValue({ id: 'aud-1' })

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'pcp_mp_inventory_demands') {
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          create: vi.fn().mockResolvedValue(demandRecordMock),
        } as any
      }
      if (col === 'pcp_mp_inventory_items') {
        return { create: itemCreateSpy } as any
      }
      if (col === 'pcp_mp_inventory_runs') {
        return { create: vi.fn().mockResolvedValue({ id: 'run-1' }) } as any
      }
      if (col === 'pcp_mp_inventory_gauges') {
        return { create: vi.fn().mockResolvedValue({ id: 'gauge-1' }) } as any
      }
      if (col === 'pcp_mp_inventory_audit_events') {
        return { create: auditCreateSpy } as any
      }
      return {} as any
    })

    const payload = {
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNOL1',
      storage_deposit: 'DP07',
      production_order: '4500012342',
      priority: 'Normal' as const,
      materials: [
        {
          material_code: 'ST930',
          material_description: 'Tarugo Laminado ST930',
          heat_number: '', // CORRIDA EM BRANCO (VÁLIDO)
          quantity_tons: 24.0,
          calculated_pieces: 200,
          unit_weight_t: 0.12,
          weight_origin: 'LOCAL_CADASTRO',
        },
        {
          material_code: 'TAR-130-1020',
          material_description: 'Tarugo 130mm',
          heat_number: 'CORR-9921', // Outra MP com corrida
          quantity_tons: 15.9,
          calculated_pieces: 10,
          unit_weight_t: 1.59,
          weight_origin: 'LOCAL_CADASTRO',
        },
      ],
    }

    const res = await pcpInventoryDemandsService.createDemand(payload)
    expect(res).toBeDefined()
    expect(res.control_number).toBe('INV-2026-000099')

    // Verifica que o primeiro item foi persistido com heat_number vazio
    expect(itemCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        raw_material_code: 'ST930',
        heat_number: '',
        unit_weight_t: 0.12,
      }),
    )

    // Verifica que o segundo item foi persistido com a corrida informada
    expect(itemCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        raw_material_code: 'TAR-130-1020',
        heat_number: 'CORR-9921',
        unit_weight_t: 1.59,
      }),
    )
  })

  // ITEM 2: PARSER NUMÉRICO PT-BR
  it('parser pt-BR aceita "24,00", "1,00", "5,50", "24,500", "1.250,750" sem disparar erro indevido', () => {
    expect(parsePtBrNumber('24,00')).toBe(24.0)
    expect(parsePtBrNumber('1,00')).toBe(1.0)
    expect(parsePtBrNumber('5,50')).toBe(5.5)
    expect(parsePtBrNumber('24,500')).toBe(24.5)
    expect(parsePtBrNumber('1.250,750')).toBe(1250.75)
    expect(parsePtBrNumber('24.00')).toBe(24.0)

    // Erros válidos: vazio, string não numérica, <= 0
    expect(isNaN(parsePtBrNumber(''))).toBe(true)
    expect(isNaN(parsePtBrNumber('abc'))).toBe(true)
    expect(parsePtBrNumber('0')).toBe(0)
    expect(parsePtBrNumber('-5,00')).toBe(-5.0)
  })

  // ITEM 3: NOVA FÓRMULA DE PEÇAS: peças = Quantidade (t) ÷ Peso Unitário (t)
  it('calcula peças corretamente: 24,00 ÷ 0,120 = 200 peças sem conversão intermediária x1000', () => {
    const pieces = calculatePiecesFromTons(24.0, 0.12)
    expect(pieces).toBe(200)

    // Caso de arredondamento para cima e número inteiro (sem decimais)
    // 24,50 t ÷ 0,120 t = 204.166... -> 205 peças
    const piecesCeil = calculatePiecesFromTons(24.5, 0.12)
    expect(piecesCeil).toBe(205)
    expect(Number.isInteger(piecesCeil)).toBe(true)
  })

  // ITEM 4: PESO UNITÁRIO VIA sapMaterialService
  it('sapMaterialService retorna peso de ST930 como 0,120 t (fonte local) e estado SAP_RFC_PENDING para material não cadastrado', async () => {
    const resST930 = await sapMaterialService.getMaterialWeight('ST930')
    expect(resST930.is_available).toBe(true)
    expect(resST930.unit_weight_t).toBe(0.12)
    expect(resST930.source).toBe('LOCAL_CADASTRO')

    // Material inexistente: não inventa valor, retorna is_available = false
    vi.spyOn(pb, 'collection').mockImplementation(() => {
      return { getFullList: vi.fn().mockResolvedValue([]) } as any
    })
    const resDesconhecido = await sapMaterialService.getMaterialWeight('COD_INEXISTENTE_XYZ')
    expect(resDesconhecido.is_available).toBe(false)
    expect(resDesconhecido.unit_weight_t).toBeNull()
    expect(resDesconhecido.source).toBe('SAP_RFC_PENDING')
  })

  // ITEM 5: FORMATO PT-BR SEM DECIMAIS NA QTD CALCULADA
  it('formatPtBrNumber formata corretamente inteiros e decimais no padrão brasileiro', () => {
    expect(formatPtBrNumber(200, 0, 0)).toBe('200')
    expect(formatPtBrNumber(0.12, 3, 3)).toBe('0,120')
  })
})
