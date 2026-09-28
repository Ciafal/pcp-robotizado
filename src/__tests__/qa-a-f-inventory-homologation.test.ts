import { describe, it, expect, beforeAll } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { sapMaterialService } from '@/services/sap-material-service'
import { CreateDemandPayload, InventoryDemand } from '@/types/pcp-inventory-demands'

/**
 * TESTES A–F DE HOMOLOGAÇÃO REAL — INVENTÁRIO DE MATÉRIA-PRIMA
 * Executa o fluxo real completo contra o backend PocketBase:
 * Empresa: CIAFAL | Linha: L1 | Centro: FORNO1 | Depósito: DP07
 * Ordem de Produção: OP-2025-0891 | Prioridade: Normal
 * Matéria-Prima: ST930 (Tarugo Laminado ST930 130mm), Corrida: COR-8821, Quantidade: 24,00 t
 */
describe('TESTES A–F DE HOMOLOGAÇÃO REAL: PCP INVENTÁRIO MP', () => {
  let createdDemand: InventoryDemand
  let controlNumber: string

  beforeAll(async () => {
    // 0. Garante que o client PocketBase está configurado
    expect(pb).toBeDefined()
    expect(typeof pb.collection).toBe('function')
  })

  it('6. Criar NOVA DEMANDA REAL DE HOMOLOGAÇÃO com CIAFAL, L1, FORNO1, DP07, OP-2025-0891, ST930', async () => {
    // Busca informações de peso do material ST930
    const matWeight = await sapMaterialService.getMaterialWeight('ST930')
    expect(matWeight.is_available).toBe(true)
    expect(matWeight.unit_weight_t).toBe(0.12) // 120 kg = 0.12 t

    // 24.00 t / 0.12 t = 200 peças
    const tons = 24.0
    const pieces = Math.ceil(tons / matWeight.unit_weight_t!)
    expect(pieces).toBe(200)

    const payload: CreateDemandPayload = {
      company: 'CIAFAL',
      line: 'L1',
      center: 'FORNO1',
      storage_deposit: 'DP07',
      production_order: 'OP-2025-0891',
      priority: 'Normal',
      gauge: '50x50 mm',
      application: 'Tubo Industrial Quadrado',
      observation: 'Homologação oficial A-F CIAFAL L1 FORNO1 DP07',
      materials: [
        {
          material_code: 'ST930',
          material_description: matWeight.material_description || 'Tarugo Laminado ST930 130mm',
          heat_number: 'COR-8821',
          quantity_tons: tons,
          calculated_pieces: pieces,
          unit_weight_t: matWeight.unit_weight_t,
          unit_weight_kg: matWeight.unit_weight_kg,
          weight_origin: matWeight.source,
        },
      ],
    }

    createdDemand = await pcpInventoryDemandsService.createDemand(payload)
    expect(createdDemand).toBeDefined()
    expect(createdDemand.id).toBeDefined()
    controlNumber = createdDemand.control_number
    expect(controlNumber).toMatch(/^INV-\d{4}-\d{6}$/)
  })

  // Teste A: Popup "DEMANDA GERADA COM SUCESSO"
  it('TESTE A — Popup "DEMANDA GERADA COM SUCESSO": valida campos obrigatórios e não-vazios', () => {
    expect(controlNumber).toBeDefined()
    expect(controlNumber).toMatch(/^INV-\d{4}-\d{6}$/)
    expect(controlNumber).not.toBe('')
    expect(controlNumber).not.toBe('-')

    expect(createdDemand.company).toBe('CIAFAL')
    expect(createdDemand.line).toBe('L1')
    expect(createdDemand.center).toBe('FORNO1')
    expect(createdDemand.storage_deposit).toBe('DP07')
    expect(createdDemand.production_order).toBe('OP-2025-0891')

    const matCount = createdDemand.materials_summary?.length || 0
    expect(matCount).toBeGreaterThan(0)
    expect(matCount).toBe(1)

    // Data/hora real
    const dt = createdDemand.generation_date_formatted || createdDemand.created
    expect(dt).toBeDefined()
    expect(dt).not.toBe('-')
    expect(dt).not.toBe('')
  })

  // Teste B: Listagem — aparece automaticamente em "DEMANDAS DE INVENTÁRIO"
  it('TESTE B — Listagem: demanda aparece em "DEMANDAS DE INVENTÁRIO" no backend', async () => {
    const list = await pcpInventoryDemandsService.listDemands()
    expect(list.length).toBeGreaterThan(0)

    const found = list.find((d) => d.id === createdDemand.id || d.control_number === controlNumber)
    expect(found).toBeDefined()
    expect(found!.control_number).toBe(controlNumber)
    expect(found!.production_order).toBe('OP-2025-0891')
    expect(found!.center).toBe('FORNO1')
    expect(found!.storage_deposit).toBe('DP07')
    expect(found!.priority).toBe('Normal')
    expect(found!.status).toBe('Gerada')
  })

  // Teste C: Visualizar Demanda — busca demanda PERSISTIDA no backend (não só state de form)
  it('TESTE C — Visualizar Demanda: busca demanda PERSISTIDA no backend sem campos com "-"', async () => {
    const persisted = await pcpInventoryDemandsService.getDemandById(createdDemand.id)
    expect(persisted).not.toBeNull()
    expect(persisted!.id).toBe(createdDemand.id)
    expect(persisted!.control_number).toBe(controlNumber)
    expect(persisted!.production_order).toBe('OP-2025-0891')
    expect(persisted!.company).toBe('CIAFAL')
    expect(persisted!.line).toBe('L1')
    expect(persisted!.center).toBe('FORNO1')
    expect(persisted!.storage_deposit).toBe('DP07')
    expect(persisted!.priority).toBe('Normal')

    // Nenhum campo mandatório com "-"
    expect(persisted!.production_order).not.toBe('-')
    expect(persisted!.company).not.toBe('-')
    expect(persisted!.line).not.toBe('-')
    expect(persisted!.center).not.toBe('-')
    expect(persisted!.storage_deposit).not.toBe('-')
    expect(persisted!.priority).not.toBe('-')
  })

  // Teste D: Matérias-Primas Vinculadas
  it('TESTE D — Matérias-Primas Vinculadas: itens persistidos com Código, Descrição, Corrida, Qtd e Peças', async () => {
    const items = await pcpInventoryDemandsService.listItemsByDemand(
      createdDemand.id,
      controlNumber,
    )
    expect(items.length).toBeGreaterThanOrEqual(1)

    const item = items[0]
    expect(item.material_code).toBe('ST930')
    expect(item.material_description).toContain('ST930')
    expect(item.heat_number).toBe('COR-8821')
    expect(item.quantity_tons).toBe(24.0)
    expect(item.calculated_pieces).toBe(200)

    // Não pode haver linha vazia contendo apenas "-"
    expect(item.material_code).not.toBe('—')
    expect(item.material_code).not.toBe('-')
    expect(item.material_description).not.toBe('—')
    expect(item.material_description).not.toBe('-')

    // Qtd Prevista Total calculada dos materiais persistidos
    const totalCalc = items.reduce((acc, it) => acc + (it.calculated_pieces || 0), 0)
    expect(totalCalc).toBe(200)
  })

  // Teste E: F5 — recarregar e consultar pelo Nº Controle
  it('TESTE E — F5 (Recarregar): consultar pelo Nº Controle recupera todos os dados intactos', async () => {
    // Nova consulta isolada simulando reabertura após F5
    const reloadedDemands = await pcpInventoryDemandsService.listDemands(
      `control_number = '${controlNumber}'`,
    )
    expect(reloadedDemands.length).toBe(1)
    const demand = reloadedDemands[0]

    expect(demand.control_number).toBe(controlNumber)
    expect(demand.company).toBe('CIAFAL')
    expect(demand.line).toBe('L1')
    expect(demand.center).toBe('FORNO1')
    expect(demand.storage_deposit).toBe('DP07')
    expect(demand.production_order).toBe('OP-2025-0891')
    expect(demand.priority).toBe('Normal')

    // Consulta itens
    const reloadedItems = await pcpInventoryDemandsService.listItemsByDemand(
      demand.id,
      controlNumber,
    )
    expect(reloadedItems.length).toBe(1)
    expect(reloadedItems[0].material_code).toBe('ST930')
    expect(reloadedItems[0].heat_number).toBe('COR-8821')
    expect(reloadedItems[0].quantity_tons).toBe(24.0)
  })

  // Teste F: Nova navegação — sair da tela, voltar, pesquisar e reabrir
  it('TESTE F — Nova Navegação: pesquisa por Nº Controle e reabertura preserva valores idênticos', async () => {
    // Simula sair da tela e retornar consultando pelo backend getDemandById
    const freshDemand = await pcpInventoryDemandsService.getDemandById(createdDemand.id)
    expect(freshDemand).not.toBeNull()
    expect(freshDemand!.control_number).toBe(controlNumber)
    expect(freshDemand!.company).toBe('CIAFAL')
    expect(freshDemand!.line).toBe('L1')
    expect(freshDemand!.center).toBe('FORNO1')
    expect(freshDemand!.storage_deposit).toBe('DP07')
    expect(freshDemand!.production_order).toBe('OP-2025-0891')
    expect(freshDemand!.priority).toBe('Normal')

    const freshItems = await pcpInventoryDemandsService.listItemsByDemand(
      freshDemand!.id,
      controlNumber,
    )
    expect(freshItems.length).toBe(1)
    expect(freshItems[0].material_code).toBe('ST930')
    expect(freshItems[0].heat_number).toBe('COR-8821')
    expect(freshItems[0].quantity_tons).toBe(24.0)
    expect(freshItems[0].calculated_pieces).toBe(200)
  })
})
