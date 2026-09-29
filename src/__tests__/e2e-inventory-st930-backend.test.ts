import { test, expect } from 'vitest'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { sapMaterialService } from '@/services/sap-material-service'
import { parsePtBrNumber, calculatePiecesFromTons } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'

test('E2E Real Backend: Gerar Demanda com ST930, Corrida em Branco e 24,00 t', async () => {
  // 1. Validar busca de peso do ST930
  const matInfo = await sapMaterialService.getMaterialWeight('ST930')
  expect(matInfo.is_available).toBe(true)
  expect(matInfo.unit_weight_t).toBe(0.12)

  // 2. Validar parser e fórmula: 24,00 ÷ 0,120 = 200 peças
  const tons = parsePtBrNumber('24,00')
  expect(tons).toBe(24.0)
  const pieces = calculatePiecesFromTons(tons, matInfo.unit_weight_t)
  expect(pieces).toBe(200)

  // 3. Gerar Demanda real no backend
  const created = await pcpInventoryDemandsService.createDemand({
    company: 'CIAFAL',
    line: 'L1',
    center: 'SEML1',
    storage_deposit: 'DP07',
    production_order: '4500012342',
    priority: 'Normal',
    gauge: '50x50 mm',
    application: 'Tubo Industrial Quadrado',
    materials: [
      {
        material_code: 'ST930',
        material_description: matInfo.material_description,
        heat_number: '', // CORRIDA EM BRANCO (Opcional)
        quantity_tons: tons,
        calculated_pieces: pieces,
        unit_weight_t: matInfo.unit_weight_t,
        weight_origin: matInfo.source,
      },
    ],
    observation: 'Teste E2E automatizado de ponta a ponta ST930 corrida vazia',
  })

  expect(created).toBeDefined()
  expect(created.id).toBeTruthy()
  expect(created.control_number).toMatch(/^INV-\d{4}-\d{6}$/)
  expect(created.total_pieces_required).toBe(200)
  expect(created.status).toBe('Gerada')

  console.log('DEMANDA_GERADA_E2E_NUMERO:', created.control_number)
  console.log('DEMANDA_GERADA_E2E_ID:', created.id)

  // 4. Teste F5 / persistência: recupera a demanda pelo id no banco real
  const fetched = await pb.collection('pcp_mp_inventory_demands').getOne(created.id)
  expect(fetched.id).toBe(created.id)
  expect(fetched.control_number).toBe(created.control_number)
  expect(fetched.total_pieces_required).toBe(200)

  // 5. Verifica os itens em pcp_mp_inventory_items
  const items = await pb.collection('pcp_mp_inventory_items').getFullList({
    filter: `demand_id = '${created.id}'`,
  })
  expect(items.length).toBeGreaterThan(0)
  expect(items[0].raw_material_code).toBe('ST930')
  expect(items[0].heat_number).toBe('')
  expect(items[0].unit_weight_t).toBe(0.12)
  expect(items[0].calculated_pieces).toBe(200)

  // 6. Verifica timeline em pcp_mp_inventory_history
  const historyRecords = await pb.collection('pcp_mp_inventory_history').getFullList({
    filter: `demand_id = '${created.id}' || control_number = '${created.control_number}'`,
  })
  expect(historyRecords.length).toBeGreaterThan(0)
  expect(historyRecords[0].event_type).toBe('DEMANDA_GERADA')
  expect(historyRecords[0].summary).toContain('ST930')

  // 7. Verifica log em pcp_audit_logs
  const auditLogs = await pb.collection('pcp_audit_logs').getFullList({
    filter: `module = 'INVENTARIO_MP' && action = 'CREATE_DEMAND' && record_id = '${created.id}'`,
  })
  expect(auditLogs.length).toBeGreaterThan(0)
  expect(auditLogs[0].action).toBe('CREATE_DEMAND')
})
