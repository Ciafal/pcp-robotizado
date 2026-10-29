/**
 * Suíte Oficial de Testes A–F para Otimização de Aplicações por Peça
 * HUB CIAFAL - PCP Robotizado - Gestão de MP - Cenário "Máximo Rendimento de MP"
 *
 * Testes Obrigatórios:
 * A — Uma aplicação única
 * B — Múltiplas aplicações (2+ comprimentos diferentes na mesma peça)
 * C — Perdas de corte (combinação que seria viável sem kerf, mas é inviável com kerf)
 * D — Prioridades (atendimento de maior prioridade comercial/PCP conforme regras)
 * E — Persistência (salvar, fechar, reabrir, dados permanecem em mp_cutting_piece_applications)
 * F — Integridade (otimização de aplicações não altera pesos dos blocos nem indicadores originais de laminação)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mpPieceApplicationOptimizationService,
  MPPieceApplicationOptimizationService,
} from '@/services/mp-piece-application-optimization-service'
import { IndustrialApplicationCandidate } from '@/types/mp-piece-application-optimization'
import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

describe('Otimização de Aplicações por Peça — Suíte de Testes A–F', () => {
  let service: MPPieceApplicationOptimizationService

  beforeEach(() => {
    service = new MPPieceApplicationOptimizationService()
    vi.clearAllMocks()
  })

  // TESTE A: Uma aplicação única
  it('TESTE A: Deve otimizar adequadamente uma aplicação única respeitando perdas e limites', () => {
    // Peça de 1325 kg com massa linear de 132.5 kg/m -> 10.000 mm de comprimento laminado
    const pieceWeightKg = 1325
    const linearMassKgM = 132.5
    const expectedRolledMm = service.calculateRolledLengthMm(pieceWeightKg, linearMassKgM)
    expect(expectedRolledMm).toBe(10000)

    const candidates: IndustrialApplicationCandidate[] = [
      {
        id: 'app-unica',
        application_code: 'BARRA-3000',
        application_name: 'Barra Estrutural 3000mm',
        product_code: 'PROD-3000',
        product_description: 'Barra SAE 1020 3m',
        steel_grade: 'SAE 1020',
        target_length_mm: 3000,
        available_demand_qty: 10,
        priority_order: 1,
        is_active: true,
      },
    ]

    // Com squaring: 10mm, endCrop: 15mm, kerf: 5mm
    // 3 peças * 3000 = 9000 mm + 3 cortes * 5mm = 15mm + 10mm + 15mm = 9040 mm <= 10000 mm
    // 4 peças * 3000 = 12000 mm > 10000 mm (inviável)
    const result = service.optimize({
      pieceIdentifier: 'PECA-01',
      scenarioId: 'SCENARIO-01',
      materialCode: 'SAE 1020',
      pieceWeightKg,
      linearMassKgM,
      sawKerfMm: 5,
      squaringLossMm: 10,
      endCropLossMm: 15,
      candidates,
    })

    expect(result.is_viable).toBe(true)
    expect(result.generated_pieces_count).toBe(3)
    expect(result.fulfilled_applications_count).toBe(1)
    expect(result.used_length_mm).toBe(9000)
    expect(result.cutting_yield_pct).toBe(90) // 9000 / 10000 * 100
    expect(result.cutting_yield_pct).toBeLessThanOrEqual(100)
    expect(result.allocated_items.length).toBe(1)
    expect(result.allocated_items[0].quantity).toBe(3)
    expect(result.allocated_items[0].used_length_mm).toBe(9000)
    // Indicadores e gráfico consistentes
    expect(result.total_rolled_length_mm).toBe(10000)
    expect(
      result.used_length_mm +
        result.cut_losses_length_mm +
        result.usable_leftover_mm +
        result.scrap_mm,
    ).toBe(10000)
  })

  // TESTE B: Múltiplas aplicações (2+ comprimentos diferentes na mesma peça)
  it('TESTE B: Deve permitir múltiplas aplicações com comprimentos diferentes na mesma peça laminada', () => {
    // Peça de 1590 kg com massa linear de 132.5 kg/m -> 12.000 mm
    const pieceWeightKg = 1590
    const linearMassKgM = 132.5
    expect(service.calculateRolledLengthMm(pieceWeightKg, linearMassKgM)).toBe(12000)

    const candidates: IndustrialApplicationCandidate[] = [
      {
        id: 'app-6000',
        application_code: 'BARRA-6000',
        application_name: 'Barra Estrutural 6000mm',
        product_code: 'PROD-6M',
        product_description: 'Barra SAE 1020 6m',
        steel_grade: 'SAE 1020',
        target_length_mm: 6000,
        available_demand_qty: 1, // apenas 1 necessária
        priority_order: 1,
        is_active: true,
      },
      {
        id: 'app-2500',
        application_code: 'BARRA-2500',
        application_name: 'Tubo Cortado 2500mm',
        product_code: 'PROD-2.5M',
        product_description: 'Tubo 2.5m',
        steel_grade: 'SAE 1020',
        target_length_mm: 2500,
        available_demand_qty: 5,
        priority_order: 2,
        is_active: true,
      },
    ]

    const result = service.optimize({
      pieceIdentifier: 'PECA-MULTI',
      scenarioId: 'SCENARIO-01',
      materialCode: 'SAE 1020',
      pieceWeightKg,
      linearMassKgM,
      sawKerfMm: 5,
      squaringLossMm: 10,
      endCropLossMm: 15,
      candidates,
    })

    expect(result.is_viable).toBe(true)
    // Combinação esperada: 1x 6000mm + 2x 2500mm = 11000mm (+ cortes de serra)
    expect(result.fulfilled_applications_count).toBeGreaterThanOrEqual(2)
    const appsMap = new Map(result.allocated_items.map((i) => [i.application_id, i.quantity]))
    expect(appsMap.get('app-6000')).toBe(1)
    expect(appsMap.get('app-2500')).toBe(2)
    expect(result.used_length_mm).toBe(11000)
    expect(result.cutting_yield_pct).toBeLessThanOrEqual(100)
    // Tabela e gráfico com a mesma contagem
    const piecesInVisual = result.visual_segments.filter((s) => s.type === 'PIECE').length
    expect(piecesInVisual).toBe(result.generated_pieces_count)
  })

  // TESTE C: Perdas de corte (combinação que seria viável sem kerf, mas é inviável com kerf)
  it('TESTE C: Deve rejeitar combinação que só fecharia sem kerf da serra (ex: 6000 + 3000 + 3000 em 12000 mm com perda)', () => {
    // 12.000 mm disponíveis
    const pieceWeightKg = 1590
    const linearMassKgM = 132.5 // 1590 / 132.5 * 1000 = 12000 mm

    const candidates: IndustrialApplicationCandidate[] = [
      {
        id: 'app-6000',
        application_code: 'APP-6000',
        application_name: 'Perfil 6000mm',
        product_code: 'P6000',
        product_description: 'Perfil 6m',
        steel_grade: 'SAE 1020',
        target_length_mm: 6000,
        available_demand_qty: 1,
        priority_order: 1,
        is_active: true,
      },
      {
        id: 'app-3000',
        application_code: 'APP-3000',
        application_name: 'Perfil 3000mm',
        product_code: 'P3000',
        product_description: 'Perfil 3m',
        steel_grade: 'SAE 1020',
        target_length_mm: 3000,
        available_demand_qty: 2,
        priority_order: 1,
        is_active: true,
      },
    ]

    // Com serra de 5mm, esquadrejamento 10mm e ponta 15mm:
    // 6000 + 3000 + 3000 = 12000 mm (sem kerf seria exatamente 12000 mm)
    // Com perdas: 12000 + 3 cortes * 5mm (15mm) + 10mm + 15mm = 12040 mm > 12000 mm!
    // Logo, o motor DEVE rejeitar 6000 + 3000 + 3000 e gerar apenas o que couber com as perdas reais.
    const result = service.optimize({
      pieceIdentifier: 'PECA-KERF',
      scenarioId: 'SCENARIO-01',
      materialCode: 'SAE 1020',
      pieceWeightKg,
      linearMassKgM,
      sawKerfMm: 5,
      squaringLossMm: 10,
      endCropLossMm: 15,
      candidates,
    })

    expect(result.is_viable).toBe(true)
    // Não pode ter 6000 + 3000 + 3000 (12000 mm em peças)
    expect(result.used_length_mm).toBeLessThan(12000)
    // Deve garantir que comprimento total ocupado nunca passe de 12000
    const totalOcupado =
      result.used_length_mm +
      result.cut_losses_length_mm +
      result.usable_leftover_mm +
      result.scrap_mm
    expect(totalOcupado).toBe(12000)
    expect(result.used_length_mm + result.cut_losses_length_mm).toBeLessThanOrEqual(12000)
  })

  // TESTE D: Prioridades (maior rendimento vs maior prioridade comercial conforme regras)
  it('TESTE D: Deve priorizar atendimento de aplicação prioritária do PCP antes de maior rendimento neutro', () => {
    // 10.000 mm disponíveis
    const pieceWeightKg = 1325
    const linearMassKgM = 132.5

    const candidates: IndustrialApplicationCandidate[] = [
      {
        id: 'app-prio-1',
        application_code: 'URGENTE-PCP',
        application_name: 'Aplicação Crítica Cliente Prioritário (4000mm)',
        product_code: 'PROD-URGENTE',
        product_description: 'Pedido com SLA estrito',
        steel_grade: 'SAE 1020',
        target_length_mm: 4000,
        available_demand_qty: 2,
        priority_order: 1, // Prioridade mais alta
        is_active: true,
      },
      {
        id: 'app-prio-5',
        application_code: 'ESTOQUE-COMUM',
        application_name: 'Estoque Comum (3000mm)',
        product_code: 'PROD-ESTOQUE',
        product_description: 'Produção para armazém',
        steel_grade: 'SAE 1020',
        target_length_mm: 3000,
        available_demand_qty: 3,
        priority_order: 5, // Prioridade baixa
        is_active: true,
      },
    ]

    const result = service.optimize({
      pieceIdentifier: 'PECA-PRIO',
      scenarioId: 'SCENARIO-01',
      materialCode: 'SAE 1020',
      pieceWeightKg,
      linearMassKgM,
      sawKerfMm: 5,
      squaringLossMm: 10,
      endCropLossMm: 15,
      candidates,
    })

    expect(result.is_viable).toBe(true)
    // O motor deve alocar as peças de prioridade 1 (2x 4000mm = 8000mm)
    const prio1Alloc = result.allocated_items.find((i) => i.application_id === 'app-prio-1')
    expect(prio1Alloc).toBeDefined()
    expect(prio1Alloc!.quantity).toBe(2)
  })

  // TESTE E: Persistência (salvar, fechar, reabrir, dados permanecem em mp_cutting_piece_applications)
  it('TESTE E: Deve persistir em mp_cutting_piece_applications e carregar os mesmos dados salvos com auditoria', async () => {
    const pieceWeightKg = 1325
    const linearMassKgM = 132.5

    const candidates: IndustrialApplicationCandidate[] = [
      {
        id: 'app-persistencia',
        application_code: 'BARRA-3000',
        application_name: 'Barra Homologada 3000mm',
        product_code: 'PROD-3M',
        product_description: 'Barra 3m',
        steel_grade: 'SAE 1020',
        target_length_mm: 3000,
        available_demand_qty: 3,
        priority_order: 1,
        is_active: true,
      },
    ]

    const result = service.optimize({
      pieceIdentifier: 'PECA-PERSIST-1',
      scenarioId: 'SCENARIO-PERSIST',
      materialCode: 'SAE 1020',
      pieceWeightKg,
      linearMassKgM,
      candidates,
    })

    // Mock das chamadas do PocketBase para persistência idempotente
    const mockCreatedRecord = {
      id: 'saved-cpa-123',
      piece_identifier: result.piece_identifier,
      scenario_id: result.scenario_id,
      cutting_yield_pct: result.cutting_yield_pct,
      used_length_mm: result.used_length_mm,
      allocated_items_json: result.allocated_items,
      visual_segments_json: result.visual_segments,
    }

    const getFullListSpy = vi
      .spyOn(pb.collection('mp_cutting_piece_applications'), 'getFullList')
      .mockResolvedValueOnce([]) // sem existente
      .mockResolvedValueOnce([mockCreatedRecord as any]) // para reload

    const createSpy = vi
      .spyOn(pb.collection('mp_cutting_piece_applications'), 'create')
      .mockResolvedValueOnce(mockCreatedRecord as any)

    const auditSpy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValueOnce({} as any)

    // 1. Salvar
    const saved = await service.savePieceApplicationPlan(result, 'Programador Teste')
    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(auditSpy).toHaveBeenCalledTimes(1)
    expect(saved.id).toBe('saved-cpa-123')

    // 2. Reabrir / Carregar
    const loaded = await service.loadSavedPlan('PECA-PERSIST-1', 'SCENARIO-PERSIST')
    expect(loaded).toBeDefined()
    expect(loaded?.piece_identifier).toBe('PECA-PERSIST-1')
    expect(loaded?.allocated_items_json.length).toBe(result.allocated_items.length)
  })

  // TESTE F: Integridade (otimização de aplicações não altera pesos dos blocos nem indicadores originais de laminação)
  it('TESTE F: Não deve modificar os parâmetros originais do bloco/cenário de corte nem violar rendimento > 100%', () => {
    const originalPieceWeightKg = 1325
    const originalLinearMass = 132.5
    const originalTargetWeightKg = 1300
    const originalGauge = '130 × 130 mm'

    const candidates: IndustrialApplicationCandidate[] = [
      {
        id: 'app-integ',
        application_code: 'BARRA-3000',
        application_name: 'Barra 3000mm',
        product_code: 'P3M',
        product_description: 'Barra',
        steel_grade: 'SAE 1020',
        target_length_mm: 3000,
        available_demand_qty: 3,
        priority_order: 1,
        is_active: true,
      },
    ]

    const result = service.optimize({
      pieceIdentifier: 'PECA-INTEG-01',
      scenarioId: 'SCENARIO-01',
      gaugeDimension: originalGauge,
      materialCode: 'SAE 1020',
      pieceWeightKg: originalPieceWeightKg,
      linearMassKgM: originalLinearMass,
      candidates,
    })

    // Garante que os valores de entrada permanecem imutáveis
    expect(result.piece_weight_kg).toBe(originalPieceWeightKg)
    expect(result.linear_mass_kg_m).toBe(originalLinearMass)
    expect(result.gauge_dimension).toBe(originalGauge)

    // Rendimento do corte nunca acima de 100%
    expect(result.cutting_yield_pct).toBeLessThanOrEqual(100)
    expect(result.cutting_yield_pct).toBeGreaterThan(0)

    // Sem candidatos válidos, mensagem exata e sem geração fictícia
    const emptyResult = service.optimize({
      pieceIdentifier: 'PECA-SEM-APP',
      scenarioId: 'SCENARIO-01',
      materialCode: 'SAE 1020',
      pieceWeightKg: originalPieceWeightKg,
      linearMassKgM: originalLinearMass,
      candidates: [],
    })

    expect(emptyResult.is_viable).toBe(false)
    expect(emptyResult.generated_pieces_count).toBe(0)
    expect(emptyResult.allocated_items.length).toBe(0)
    expect(emptyResult.inviability_reason).toBe(
      'Nenhuma aplicação compatível encontrada para esta peça. Verifique os cadastros e parâmetros técnicos.',
    )
  })
})
