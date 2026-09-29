import { test, expect } from 'vitest'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { sapMaterialService } from '@/services/sap-material-service'
import { parsePtBrNumber, calculatePiecesFromTons } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'

test('Criação Real de Demanda INV-2026-000003 via pcpInventoryDemandsService', async () => {
  // 1. Obter dados reais de ST930
  const matInfo = await sapMaterialService.getMaterialWeight('ST930')
  expect(matInfo.is_available).toBe(true)
  expect(matInfo.unit_weight_t).toBe(0.12)

  const tons = parsePtBrNumber('24,00')
  const pieces = calculatePiecesFromTons(tons, matInfo.unit_weight_t)

  // 2. Criar demanda exatamente como solicitado:
  // Empresa=CIAFAL, Linha=L1, Centro=FORNO1, Depósito=DP07, Ordem=OP-TESTE-QA, MP ST930 com quantidade, sem corrida
  const created = await pcpInventoryDemandsService.createDemand({
    company: 'CIAFAL',
    line: 'L1',
    center: 'FORNO1',
    storage_deposit: 'DP07',
    production_order: 'OP-TESTE-QA',
    priority: 'Normal',
    gauge: '130 mm',
    application: 'Laminação Tarugo',
    materials: [
      {
        material_code: 'ST930',
        material_description: matInfo.material_description,
        heat_number: '', // Sem corrida
        quantity_tons: tons,
        calculated_pieces: pieces,
        unit_weight_t: matInfo.unit_weight_t,
        weight_origin: matInfo.source,
      },
    ],
    observation: 'Demanda de validação obrigatória QA',
  })

  expect(created).toBeDefined()
  expect(created.id).toBeTruthy()
  expect(created.control_number).toMatch(/^INV-\d{4}-\d{6}$/)
  expect(created.company).toBe('CIAFAL')
  expect(created.line).toBe('L1')
  expect(created.center).toBe('FORNO1')
  expect(created.storage_deposit).toBe('DP07')
  expect(created.production_order).toBe('OP-TESTE-QA')
  expect(created.total_pieces_required).toBe(pieces)

  console.log('DEMANDA_CRIADA_SUCESSO:', created.control_number, created.id)
})
