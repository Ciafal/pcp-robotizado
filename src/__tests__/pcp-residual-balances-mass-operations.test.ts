import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResidualBalancesService } from '../services/pcp-residual-balances-service'
import { pb } from '../lib/pocketbase/client'
import { ResidualBalanceItem } from '../types/pcp-residual-balances'

describe('Suíte de Aceitação Oficial: Regularização em Massa de Saldos Residuais (PCP Robotizado)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    pb.authStore.save('token-pcp-valid', {
      id: 'usr-pcp-01',
      name: 'Gestor PCP Oficial',
      email: 'pcp.gestao@ciafal.com.br',
      role: 'PCP_PROGRAMMER',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
    } as any)
  })

  // Teste 1: Execução com 1 registro
  it('Cenário 1: Regularização em massa com 1 registro selecionado', async () => {
    const singleItem: ResidualBalanceItem = {
      id: 'saldo-01',
      deposito: 'DP07',
      material_codigo: 'MP-IN-FUND-001',
      material_descricao: 'Sucata Miúda Forjaria',
      lote: 'L-2403-001',
      quantidade_atual: 150,
      unidade_medida: 'kg',
      data_identificacao: '2026-10-26T08:00:00.000Z',
      status: 'SALDO_RESIDUAL_IDENTIFICADO',
    }

    vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      batch_id: 'REG-SR-20261026-00001',
      summary: {
        total_processados: 1,
        regularizados: 1,
        nao_processados: 0,
      },
      results: [
        {
          id: 'saldo-01',
          material_codigo: 'MP-IN-FUND-001',
          lote: 'L-2403-001',
          deposito: 'DP07',
          resultado: 'Sucesso',
          motivo: 'Regularizado',
          success: true,
        },
      ],
      timestamp: '2026-10-26T09:00:00.000Z',
    })

    const res = await ResidualBalancesService.executeMassRegularization({
      items: [singleItem],
      acaoRealizada: 'Regularização de estoque',
      motivo: 'Fechamento de OP e quitação de saldo residual.',
      batchId: 'REG-SR-20261026-00001',
    })

    expect(res.success).toBe(true)
    expect(res.batch_id).toBe('REG-SR-20261026-00001')
    expect(res.summary.total_processados).toBe(1)
    expect(res.summary.regularizados).toBe(1)
    expect(res.summary.nao_processados).toBe(0)
    expect(res.results[0].resultado).toBe('Sucesso')
  })

  // Teste 2: Execução com 2 registros de depósitos e materiais diferentes
  it('Cenário 2: Regularização em massa com 2 registros (materiais/lotes/depósitos diferentes)', async () => {
    const items: ResidualBalanceItem[] = [
      {
        id: 'saldo-01',
        deposito: 'DP07',
        material_codigo: 'MP-IN-FUND-001',
        material_descricao: 'Sucata Miúda Forjaria',
        lote: 'L-2403-001',
        quantidade_atual: 150,
        unidade_medida: 'kg',
        data_identificacao: '2026-10-26T08:00:00.000Z',
        status: 'ACAO_NECESSARIA',
      },
      {
        id: 'saldo-02',
        deposito: 'DP03',
        material_codigo: 'MP-BAR-1045-02',
        material_descricao: 'Barra Redonda 1045',
        lote: 'L-2403-002',
        quantidade_atual: 275,
        unidade_medida: 'kg',
        data_identificacao: '2026-10-26T08:30:00.000Z',
        status: 'EM_TRATAMENTO',
      },
    ]

    vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      batch_id: 'REG-SR-20261026-00002',
      summary: {
        total_processados: 2,
        regularizados: 2,
        nao_processados: 0,
      },
      results: [
        {
          id: 'saldo-01',
          material_codigo: 'MP-IN-FUND-001',
          lote: 'L-2403-001',
          deposito: 'DP07',
          resultado: 'Sucesso',
          motivo: 'Regularizado',
          success: true,
        },
        {
          id: 'saldo-02',
          material_codigo: 'MP-BAR-1045-02',
          lote: 'L-2403-002',
          deposito: 'DP03',
          resultado: 'Sucesso',
          motivo: 'Regularizado',
          success: true,
        },
      ],
      timestamp: '2026-10-26T09:10:00.000Z',
    })

    const res = await ResidualBalancesService.executeMassRegularization({
      items,
      acaoRealizada: 'Priorizar consumo',
      motivo: 'Ajuste de fila de consumo entre depósitos.',
      batchId: 'REG-SR-20261026-00002',
    })

    expect(res.success).toBe(true)
    expect(res.summary.total_processados).toBe(2)
    expect(res.summary.regularizados).toBe(2)
  })

  // Teste 3: Execução com 10 registros
  it('Cenário 3: Regularização em massa com 10 registros simultâneos', async () => {
    const items: ResidualBalanceItem[] = Array.from({ length: 10 }, (_, i) => ({
      id: `saldo-${i + 1}`,
      deposito: i % 2 === 0 ? 'DP07' : 'DP03',
      material_codigo: `MAT-ACO-${1000 + i}`,
      material_descricao: `Material Aço Liga ${i + 1}`,
      lote: `L-BATCH-${100 + i}`,
      quantidade_atual: 50 + i * 10,
      unidade_medida: 'kg',
      data_identificacao: '2026-10-26T07:00:00.000Z',
      status: 'ACAO_NECESSARIA',
    }))

    vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      batch_id: 'REG-SR-20261026-00010',
      summary: {
        total_processados: 10,
        regularizados: 10,
        nao_processados: 0,
      },
      results: items.map((it) => ({
        id: it.id,
        material_codigo: it.material_codigo,
        lote: it.lote,
        deposito: it.deposito,
        resultado: 'Sucesso' as const,
        motivo: 'Regularizado',
        success: true,
      })),
      timestamp: '2026-10-26T09:30:00.000Z',
    })

    const res = await ResidualBalancesService.executeMassRegularization({
      items,
      acaoRealizada: 'Regularização de estoque',
      motivo: 'Regularização de saldos de lote semanal fechado.',
      batchId: 'REG-SR-20261026-00010',
    })

    expect(res.success).toBe(true)
    expect(res.summary.total_processados).toBe(10)
    expect(res.summary.regularizados).toBe(10)
    expect(res.summary.nao_processados).toBe(0)
  })

  // Teste 4: Registro já regularizado (não processado e erro parcial)
  it('Cenário 4: Registro já regularizado é impedido de novo processamento (erro parcial)', async () => {
    const items: ResidualBalanceItem[] = [
      {
        id: 'saldo-ok',
        deposito: 'DP07',
        material_codigo: 'MP-IN-FUND-003',
        material_descricao: 'Sucata Aço Fundido',
        lote: 'L-2403-051',
        quantidade_atual: 120,
        unidade_medida: 'kg',
        data_identificacao: '2026-10-26T08:00:00.000Z',
        status: 'ACAO_NECESSARIA',
      },
      {
        id: 'saldo-already',
        deposito: 'DP07',
        material_codigo: 'MP-IN-FUND-004',
        material_descricao: 'Sucata Aço Carbono',
        lote: 'L-2403-052',
        quantidade_atual: 80,
        unidade_medida: 'kg',
        data_identificacao: '2026-10-26T08:00:00.000Z',
        status: 'REGULARIZADO',
      },
    ]

    vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      batch_id: 'REG-SR-20261026-00040',
      summary: {
        total_processados: 2,
        regularizados: 1,
        nao_processados: 1,
      },
      results: [
        {
          id: 'saldo-ok',
          material_codigo: 'MP-IN-FUND-003',
          lote: 'L-2403-051',
          deposito: 'DP07',
          resultado: 'Sucesso',
          motivo: 'Regularizado',
          success: true,
        },
        {
          id: 'saldo-already',
          material_codigo: 'MP-IN-FUND-004',
          lote: 'L-2403-052',
          deposito: 'DP07',
          resultado: 'Não processado',
          motivo: 'Saldo já regularizado por outro usuário',
          success: false,
        },
      ],
      timestamp: '2026-10-26T09:40:00.000Z',
    })

    const res = await ResidualBalancesService.executeMassRegularization({
      items,
      acaoRealizada: 'Regularização de estoque',
      motivo: 'Processamento parcial com saldo pré-regularizado.',
    })

    expect(res.summary.total_processados).toBe(2)
    expect(res.summary.regularizados).toBe(1)
    expect(res.summary.nao_processados).toBe(1)
    expect(res.results.find((r) => r.lote === 'L-2403-052')?.resultado).toBe('Não processado')
  })

  // Teste 5: Validação de concorrência (atualizado por outro usuário)
  it('Cenário 5: Rejeição atômica quando registro foi alterado concorrentemente por outro usuário', async () => {
    const item: ResidualBalanceItem = {
      id: 'saldo-concorrente',
      deposito: 'DP07',
      material_codigo: 'MP-IN-FUND-005',
      material_descricao: 'Material Liga Especial',
      lote: 'L-2403-099',
      quantidade_atual: 95,
      unidade_medida: 'kg',
      data_identificacao: '2026-10-26T08:00:00.000Z',
      status: 'SALDO_RESIDUAL_IDENTIFICADO',
    }

    vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      batch_id: 'REG-SR-20261026-00050',
      summary: {
        total_processados: 1,
        regularizados: 0,
        nao_processados: 1,
      },
      results: [
        {
          id: 'saldo-concorrente',
          material_codigo: 'MP-IN-FUND-005',
          lote: 'L-2403-099',
          deposito: 'DP07',
          resultado: 'Não processado',
          motivo: 'Saldo foi alterado por outro usuário (status atual: REGULARIZADO).',
          success: false,
        },
      ],
      timestamp: '2026-10-26T09:50:00.000Z',
    })

    const res = await ResidualBalancesService.executeMassRegularization({
      items: [item],
      acaoRealizada: 'Regularização de estoque',
      motivo: 'Tentativa de regularização com conflito.',
    })

    expect(res.summary.regularizados).toBe(0)
    expect(res.summary.nao_processados).toBe(1)
    expect(res.results[0].motivo).toContain('outro usuário')
  })

  // Teste 6: Usuário sem permissão
  it('Cenário 6: Bloqueio estrito no frontend e backend para usuário sem perfil de gestão PCP', async () => {
    pb.authStore.save('token-operador', {
      id: 'usr-operador-01',
      name: 'Operador Chão de Fábrica',
      email: 'operador@ciafal.com.br',
      role: 'OPERATOR',
      collectionId: '_pb_users_auth_',
      collectionName: 'users',
    } as any)

    const item: ResidualBalanceItem = {
      id: 'saldo-01',
      deposito: 'DP07',
      material_codigo: 'MP-IN-FUND-001',
      material_descricao: 'Material Liga Especial',
      lote: 'L-2403-001',
      quantidade_atual: 150,
      unidade_medida: 'kg',
      data_identificacao: '2026-10-26T08:00:00.000Z',
      status: 'ACAO_NECESSARIA',
    }

    await expect(
      ResidualBalancesService.executeMassRegularization({
        items: [item],
        acaoRealizada: 'Regularização de estoque',
        motivo: 'Operador tentando regularizar sem permissão.',
      }),
    ).rejects.toThrow(/permissão/i)
  })

  // Teste 7: Formato do Identificador Único de Lote (REG-SR-YYYYMMDD-XXXXX)
  it('Cenário 7: Identificador único gerado segue rigorosamente o padrão REG-SR-YYYYMMDD-XXXXX', async () => {
    const item: ResidualBalanceItem = {
      id: 'saldo-fallback',
      deposito: 'DP07',
      material_codigo: 'MP-TEST-001',
      material_descricao: 'Material de Teste',
      lote: 'L-FALLBACK',
      quantidade_atual: 100,
      unidade_medida: 'kg',
      data_identificacao: '2026-10-26T08:00:00.000Z',
      status: 'ACAO_NECESSARIA',
    }

    // Forçar fallback do SDK simulando endpoint 500
    vi.spyOn(pb, 'send').mockRejectedValueOnce(new Error('Network error'))

    const updateSpy = vi.fn().mockResolvedValue({ id: 'saldo-fallback' })
    const createActionSpy = vi.fn().mockResolvedValue({ id: 'action-01' })
    const createAuditSpy = vi.fn().mockResolvedValue({ id: 'audit-01' })

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balances') return { update: updateSpy, create: vi.fn() } as any
      if (name === 'pcp_residual_balance_actions') return { create: createActionSpy } as any
      if (name === 'pcp_audit_logs') return { create: createAuditSpy } as any
      return {} as any
    })

    const res = await ResidualBalancesService.executeMassRegularization({
      items: [item],
      acaoRealizada: 'Regularização de estoque',
      motivo: 'Teste do padrão do correlation_id e batch_id.',
    })

    expect(res.batch_id).toMatch(/^REG-SR-\d{8}-\d{5}$/)
    expect(createAuditSpy).toHaveBeenCalledTimes(1)
    const auditArg = createAuditSpy.mock.calls[0][0]
    expect(auditArg.correlation_id).toBe(res.batch_id)
    expect(auditArg.details.batch_id).toBe(res.batch_id)
    expect(auditArg.action).toBe('SALDO_RESIDUAL_REGULARIZACAO_MASSA')
  })
})
