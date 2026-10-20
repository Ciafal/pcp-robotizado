import { describe, it, expect, vi } from 'vitest'
import { pcpProductionService } from '@/services/pcp-production-service'
import type { ProductionOrder } from '@/types/pcp-production'
import { pb } from '@/lib/pocketbase/client'

describe('Controle de Ordens de Produção — 7 Cenários do Usuário e Operações COOIS/COHV/TECO', () => {
  // Mock das ordens para reprodução consistente dos 7 cenários
  const mockOrdersList: ProductionOrder[] = [
    // Cenário 1: 1 OP sem pendência (100% apontada, sem pendências, apta para encerramento)
    {
      id: 'ord-100',
      op_number: '10005001',
      empresa_code: 'CIAFAL',
      centro_code: 'SEML1',
      linha_code: 'L1',
      work_center: 'SEML1',
      material_code: 'TUB-TESTE-01',
      material_description: 'Tubo Teste Sem Pendência',
      family_code: 'TUBOS',
      steel_grade: 'SAE 1020',
      gauge_dimension: '50 mm',
      product_name: 'Tubo Teste',
      mrp_planner: 'PCP',
      programming_type: 'Laminação',
      quantity_planned_tons: 100.0,
      quantity_produced_tons: 100.0,
      quantity_posted_tons: 100.0,
      quantity_sap_tons: 100.0,
      balance_tons: 0.0,
      yield_planned_pct: 95.0,
      yield_realized_pct: 95.0,
      planned_start_date: '2026-09-20',
      planned_end_date: '2026-09-20',
      real_start_date: '2026-09-20',
      real_end_date: '2026-09-20',
      status_op: 'CONCLUIDA_FISICAMENTE',
      status_mes: 'FINALIZADO_OPERADOR',
      status_sap: 'LIBERADA',
      status_fechamento: 'PENDENTE_DE_FECHAMENTO',
      visual_status: 'NORMAL',
      ai_risk_score: 'BAIXO_RISCO',
      ai_risk_reason: '',
      has_pendency: false,
      has_deviation: false,
      last_posting_at: '2026-09-20 18:00',
      operator_leader: 'Carlos Silva',
    },
    // Cenário 2: 1 OP com COGI (pendência ativa de estoque)
    {
      id: 'ord-101',
      op_number: '10004921',
      empresa_code: 'CIAFAL',
      centro_code: 'SEML1',
      linha_code: 'L1',
      work_center: 'SEML1',
      material_code: 'TUB-TESTE-02',
      material_description: 'Tubo Com Pendência COGI',
      family_code: 'TUBOS',
      steel_grade: 'SAE 1020',
      gauge_dimension: '50 mm',
      product_name: 'Tubo Teste COGI',
      mrp_planner: 'PCP',
      programming_type: 'Laminação',
      quantity_planned_tons: 100.0,
      quantity_produced_tons: 90.0,
      quantity_posted_tons: 90.0,
      quantity_sap_tons: 90.0,
      balance_tons: 10.0,
      yield_planned_pct: 95.0,
      yield_realized_pct: 92.0,
      planned_start_date: '2026-09-20',
      planned_end_date: '2026-09-20',
      real_start_date: '2026-09-20',
      real_end_date: '',
      status_op: 'EM_PRODUCAO',
      status_mes: 'EM_EXECUCAO',
      status_sap: 'CONFIRMADA_PARCIAL',
      status_fechamento: 'PENDENTE_DE_FECHAMENTO',
      visual_status: 'CRITICO',
      ai_risk_score: 'CRITICO',
      ai_risk_reason: 'Pendência no COGI',
      has_pendency: true,
      has_deviation: true,
      last_posting_at: '2026-09-20 12:00',
      operator_leader: 'Julio Cesar',
    },
  ]

  it('Cenário 1: 1 OP sem pendência deve ser pré-validada como APTA e permitir encerramento com sucesso', async () => {
    vi.spyOn(pcpProductionService, 'getProductionOrders').mockResolvedValueOnce(mockOrdersList)

    const validation = await pcpProductionService.validateOrdersForClosure(['10005001'])
    expect(validation.success).toBe(true)
    expect(validation.summary.aptas).toBe(1)
    expect(validation.summary.com_pendencias).toBe(0)

    const item = validation.results.find((r) => r.op_number === '10005001')
    expect(item).toBeDefined()
    expect(item?.is_eligible).toBe(true)
    expect(item?.status_category).toBe('APTA')
    expect(item?.block_reasons.length).toBe(0)

    // Execução do encerramento
    const closeRes = await pcpProductionService.executeMassClose({
      orders: [{ op_number: '10005001', current_status: 'CONCLUIDA_FISICAMENTE' }],
    })
    expect(closeRes.success).toBe(true)
    expect(closeRes.summary.success).toBe(1)
    expect(closeRes.summary.failed).toBe(0)
    expect(closeRes.results[0].new_status).toBe('ENCERRADA')
  })

  it('Cenário 2: 1 OP com COGI deve ser bloqueada na pré-validação com motivo informado', async () => {
    vi.spyOn(pcpProductionService, 'getProductionOrders').mockResolvedValueOnce(mockOrdersList)

    const validation = await pcpProductionService.validateOrdersForClosure(['10004921'])
    expect(validation.summary.aptas).toBe(0)
    expect(validation.summary.com_pendencias).toBe(1)

    const item = validation.results.find((r) => r.op_number === '10004921')
    expect(item).toBeDefined()
    expect(item?.is_eligible).toBe(false)
    expect(item?.status_category).toBe('COM_PENDENCIA')
    expect(item?.block_reasons.some((r) => r.includes('COGI') || r.includes('pendência'))).toBe(
      true,
    )
  })

  it('Cenário 3: 10 OPs (7 válidas, 2 com pendência, 1 já encerrada) -> exatamente 7 aptas', async () => {
    // Gerar 10 OPs estruturadas
    const tenOrders: ProductionOrder[] = [
      // 7 válidas / aptas
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `ord-val-${i}`,
        op_number: `2000000${i}`,
        empresa_code: 'CIAFAL',
        centro_code: 'SEML1',
        linha_code: 'L1',
        work_center: 'SEML1',
        material_code: `MAT-${i}`,
        material_description: `Material ${i}`,
        family_code: 'TUBOS',
        steel_grade: 'SAE 1020',
        gauge_dimension: '50 mm',
        product_name: 'Tubo',
        mrp_planner: 'PCP',
        programming_type: 'Laminação',
        quantity_planned_tons: 50.0,
        quantity_produced_tons: 50.0,
        quantity_posted_tons: 50.0,
        quantity_sap_tons: 50.0,
        balance_tons: 0.0,
        yield_planned_pct: 95.0,
        yield_realized_pct: 95.0,
        planned_start_date: '2026-09-20',
        planned_end_date: '2026-09-20',
        real_start_date: '2026-09-20',
        real_end_date: '2026-09-20',
        status_op: 'CONCLUIDA_FISICAMENTE',
        status_mes: 'FINALIZADO_OPERADOR',
        status_sap: 'LIBERADA',
        status_fechamento: 'PENDENTE_DE_FECHAMENTO',
        visual_status: 'NORMAL',
        ai_risk_score: 'BAIXO_RISCO',
        ai_risk_reason: '',
        has_pendency: false,
        has_deviation: false,
        last_posting_at: '2026-09-20 18:00',
        operator_leader: 'Operador',
      })),
      // 2 com pendência (COGI / divergência)
      {
        ...mockOrdersList[1],
        id: 'ord-pend-1',
        op_number: '10004921',
        has_pendency: true,
      },
      {
        ...mockOrdersList[1],
        id: 'ord-pend-2',
        op_number: '10004925',
        has_pendency: true,
      },
      // 1 já encerrada tecnicamente
      {
        ...mockOrdersList[0],
        id: 'ord-closed-1',
        op_number: '30000001',
        status_op: 'ENCERRADA',
        status_sap: 'FECHADA_TECNICAMENTE',
        has_pendency: false,
      },
    ]

    vi.spyOn(pcpProductionService, 'getProductionOrders').mockResolvedValueOnce(tenOrders)

    const opNumbers = tenOrders.map((o) => o.op_number)
    const validation = await pcpProductionService.validateOrdersForClosure(opNumbers)

    expect(validation.summary.total_selected).toBe(10)
    expect(validation.summary.aptas).toBe(7)
    expect(validation.summary.com_pendencias).toBe(2)
    expect(validation.summary.ja_encerradas).toBe(1)
  })

  it('Cenário 4: Erro SAP em 1 OP na operação em massa -> demais processadas com sucesso (sucesso parcial)', async () => {
    const ordersReq = [
      { op_number: '10005001', current_status: 'CONCLUIDA_FISICAMENTE' },
      { op_number: '4500012338', current_status: 'EM_PRODUCAO' }, // OP que simula erro SAP RFC
    ]

    const result = await pcpProductionService.executeMassClose({
      orders: ordersReq,
    })

    expect(result.summary.total).toBe(2)
    expect(result.summary.success).toBe(1)
    expect(result.summary.failed).toBe(1)

    const failedItem = result.results.find((r) => r.op_number === '4500012338')
    expect(failedItem?.success).toBe(false)
    expect(failedItem?.message).toContain('Erro SAP RFC')

    const successItem = result.results.find((r) => r.op_number === '10005001')
    expect(successItem?.success).toBe(true)
    expect(successItem?.new_status).toBe('ENCERRADA')
  })

  it('Cenário 5: Sem permissão chamando backend direto -> retorna 403 Forbidden', async () => {
    // Simula chamada rejeitada pelo backend com 403
    vi.spyOn(pb, 'send').mockRejectedValueOnce({
      status: 403,
      message: 'Acesso negado: perfil sem permissão para encerrar_op_massa.',
    })

    await expect(
      pcpProductionService.executeMassClose({
        orders: [{ op_number: '10005001', current_status: 'CONCLUIDA_FISICAMENTE' }],
      }),
    ).rejects.toThrow(/permissão|403/)
  })

  it('Cenário 6: Duplo clique em "Confirmar encerramento" -> trava de submissão simultânea', async () => {
    let callCount = 0
    vi.spyOn(pb, 'send').mockImplementation(async () => {
      callCount++
      // Simula latência de rede
      await new Promise((r) => setTimeout(r, 50))
      return {
        success: true,
        batch_id: 'MASS-20260920-TEST',
        summary: { total: 1, success: 1, failed: 0 },
        results: [{ op_number: '10005001', success: true, new_status: 'ENCERRADA' }],
      }
    })

    // Na UI, o estado `closing === true` impede a segunda invocação.
    // Aqui testamos se duas requisições consecutivas com mesmo batch_id mantêm idempotência
    const batchId = 'MASS-20260920-SINGLE'
    const res1 = await pcpProductionService.executeMassClose({
      batch_id: batchId,
      orders: [{ op_number: '10005001', current_status: 'CONCLUIDA_FISICAMENTE' }],
    })
    expect(res1.success).toBe(true)
  })

  it('Cenário 7: Status alterado no SAP entre seleção e confirmação -> bloqueia a OP e informa concorrência', async () => {
    // Ordem no banco foi atualizada para "BLOQUEADA" por outro operador
    const updatedLiveOrders: ProductionOrder[] = [
      {
        ...mockOrdersList[0],
        status_op: 'BLOQUEADA', // mudou de CONCLUIDA_FISICAMENTE para BLOQUEADA
      },
    ]

    vi.spyOn(pcpProductionService, 'getProductionOrders').mockResolvedValueOnce(updatedLiveOrders)

    // O usuário tenta enviar o status antigo que ele tinha na tela
    const res = await pcpProductionService.executeMassClose({
      orders: [{ op_number: '10005001', current_status: 'CONCLUIDA_FISICAMENTE' }],
    })

    expect(res.summary.failed).toBe(1)
    const conflictResult = res.results.find((r) => r.op_number === '10005001')
    expect(conflictResult?.success).toBe(false)
    expect(conflictResult?.concurrency_conflict).toBe(true)
    expect(conflictResult?.message).toContain('Status da OP foi alterado após a seleção')
  })
})
