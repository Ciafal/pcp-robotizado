import { test, expect } from 'vitest'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { sapMaterialService } from '@/services/sap-material-service'
import { parsePtBrNumber, calculatePiecesFromTons } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'

test('Validação Real no Banco: Empresa CIAFAL, Linha ENF_L1, Centro FORNO1, Depósito DP07, OP 4500012338, 2 MPs', async () => {
  // Cenário exato do usuário:
  // Empresa CIAFAL, linha ENF_L1, centro FORNO1, depósito DP07, OP 4500012338, 2 matérias-primas
  const tons1 = 24.0
  const unitWeight1 = 0.12
  const pieces1 = calculatePiecesFromTons(tons1, unitWeight1) // 200

  const tons2 = 12.0
  const unitWeight2 = 0.15
  const pieces2 = calculatePiecesFromTons(tons2, unitWeight2) // 80

  const totalPieces = pieces1 + pieces2

  // 1. Criar demanda via o serviço
  const created = await pcpInventoryDemandsService.createDemand({
    company: 'CIAFAL',
    line: 'ENF_L1',
    center: 'FORNO1',
    storage_deposit: 'DP07',
    production_order: '4500012338',
    priority: 'Normal',
    gauge: '130 mm',
    application: 'Laminação',
    materials: [
      {
        material_code: 'ST930',
        material_description: 'Tarugo Laminado ST930 130mm',
        heat_number: 'COR-9901',
        quantity_tons: tons1,
        calculated_pieces: pieces1,
        unit_weight_t: unitWeight1,
        weight_origin: 'SAP_RFC',
      },
      {
        material_code: 'ST940',
        material_description: 'Tarugo Laminado ST940 150mm',
        heat_number: '',
        quantity_tons: tons2,
        calculated_pieces: pieces2,
        unit_weight_t: unitWeight2,
        weight_origin: 'SAP_RFC',
      },
    ],
    observation: 'Validação Passo 3 Cenário Real Usuário',
  })

  expect(created).toBeDefined()
  expect(created.id).toBeTruthy()
  expect(created.control_number).toMatch(/^INV-\d{4}-\d{6}$/)
  expect(created.company).toBe('CIAFAL')
  expect(created.line).toBe('ENF_L1')
  expect(created.center).toBe('FORNO1')
  expect(created.storage_deposit).toBe('DP07')
  expect(created.production_order).toBe('4500012338')
  expect(created.total_pieces_required).toBe(totalPieces)
  expect(created.status).toBe('Aberto')

  const demandId = created.id
  const controlNumber = created.control_number

  console.log(`[VALIDACAO_PASSO_3] Demanda criada: ${controlNumber} (ID: ${demandId})`)

  // 2. Confirmar consultando diretamente o banco que o cabeçalho e os itens persistem
  const fetchedDemand = await pb.collection('pcp_mp_inventory_demands').getOne(demandId)
  expect(fetchedDemand.control_number).toBe(controlNumber)
  expect(fetchedDemand.company).toBe('CIAFAL')
  expect(fetchedDemand.line).toBe('ENF_L1')
  expect(fetchedDemand.center).toBe('FORNO1')
  expect(fetchedDemand.storage_deposit).toBe('DP07')
  expect(fetchedDemand.production_order).toBe('4500012338')
  expect(fetchedDemand.total_pieces_required).toBe(totalPieces)

  const items = await pb.collection('pcp_mp_inventory_items').getFullList({
    filter: `demand_id = '${demandId}'`,
  })

  expect(items).toHaveLength(2)
  expect(items[0].control_number).toBe(controlNumber)
  expect(items[0].production_order).toBe('4500012338')
  expect(items[1].control_number).toBe(controlNumber)
  expect(items[1].production_order).toBe('4500012338')

  console.log(
    `[VALIDACAO_PASSO_3] Confirmado no banco: Demanda ${controlNumber} com ${items.length} itens.`,
  )

  // 3. REMOVER esses registros de teste do banco (cabeçalho + itens) para não poluir dados reais
  for (const item of items) {
    await pb.collection('pcp_mp_inventory_items').delete(item.id)
  }
  await pb.collection('pcp_mp_inventory_demands').delete(demandId)

  // Opcional: remover eventos de histórico criados para este teste
  try {
    const histEvents = await pb.collection('pcp_mp_inventory_history').getFullList({
      filter: `inventory_id = '${demandId}'`,
    })
    for (const h of histEvents) {
      await pb.collection('pcp_mp_inventory_history').delete(h.id)
    }
  } catch {
    /* intentionally ignored */
  }

  console.log(`[VALIDACAO_PASSO_3] Limpeza concluída com sucesso para ${controlNumber}.`)
})
