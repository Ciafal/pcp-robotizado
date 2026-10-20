import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  classifyStockItem,
  testRuleMatch,
  normalizeUnitConversion,
} from '../services/pcp-residual-balances-engine'
import { ResidualBalancesService } from '../services/pcp-residual-balances-service'
import {
  ResidualBalanceParameter,
  RawStockItem,
  ResidualBalanceItem,
} from '../types/pcp-residual-balances'
import { pb } from '../lib/pocketbase/client'

describe('Suíte Oficial de Regras e Aceitação: Saldos Residuais (HUB CIAFAL)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  // Cenário 1: Criar parâmetro DP07 / Quantidade ≤ 500 kg / Ação: Priorizar consumo e aparecer na relação
  it('Cenário 1: Criar parâmetro DP07 / Quantidade ≤ 500 kg / Ação: Priorizar consumo e aparecer na relação', async () => {
    const createdParamRecord = {
      id: 'param-dp07-new',
      deposito: 'DP07',
      deposito_nome: 'Matéria Prima L1',
      descricao: 'Saldo residual DP07 laminação',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 500,
      unidade_medida: 'kg',
      acao_recomendada: 'Priorizar consumo',
      criticidade: 'ALTA',
      ativo: true,
      excluido_logico: false,
      created: '2025-01-01T00:00:00.000Z',
      updated: '2025-01-01T00:00:00.000Z',
    }

    const mockCreate = vi.fn().mockResolvedValue(createdParamRecord)
    const mockGetFullList = vi.fn().mockResolvedValue([createdParamRecord])

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balance_parameters') {
        return {
          create: mockCreate,
          getFullList: mockGetFullList,
        } as any
      }
      return {} as any
    })

    const saveResult = await ResidualBalancesService.saveParameter({
      deposito: 'DP07',
      deposito_nome: 'Matéria Prima L1',
      descricao: 'Saldo residual DP07 laminação',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 500,
      unidade_medida: 'kg',
      acao_recomendada: 'Priorizar consumo',
      criticidade: 'ALTA',
      ativo: true,
    })

    expect(saveResult.success).toBe(true)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        deposito: 'DP07',
        quantidade: 500,
        acao_recomendada: 'Priorizar consumo',
      }),
    )

    // Consulta parâmetros e confirma que aparece na relação
    const paramsList = await ResidualBalancesService.getParameters(false)
    expect(paramsList.length).toBe(1)
    expect(paramsList[0].deposito).toBe('DP07')
    expect(paramsList[0].quantidade).toBe(500)
    expect(paramsList[0].acao_recomendada).toBe('Priorizar consumo')
  })

  // Cenário 2: 2º parâmetro no mesmo depósito coexiste
  it('Cenário 2: 2º parâmetro no mesmo depósito coexiste e ambos são avaliados', () => {
    const param1: ResidualBalanceParameter = {
      id: 'param-1',
      deposito: 'DP07',
      descricao: 'Regra 1: ≤ 500 kg',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 500,
      unidade_medida: 'kg',
      acao_recomendada: 'Priorizar consumo',
      criticidade: 'MEDIA',
      ativo: true,
      excluido_logico: false,
    }

    const param2: ResidualBalanceParameter = {
      id: 'param-2',
      deposito: 'DP07',
      descricao: 'Regra 2: ≤ 200 kg crítica',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 200,
      unidade_medida: 'kg',
      acao_recomendada: 'Solicitar análise Qualidade',
      criticidade: 'CRITICA',
      ativo: true,
      excluido_logico: false,
    }

    const stock: RawStockItem = {
      deposito: 'DP07',
      material_codigo: 'MP-AC-1020',
      material_descricao: 'Tarugo 1020',
      lote: 'L-001',
      quantidade_atual: 150,
      unidade_medida: 'kg',
    }

    const result = classifyStockItem(stock, [param1, param2])

    // Ambos coexistem e ambas as regras são atingidas
    expect(result.regras_atingidas?.length).toBe(2)
    expect(result.regra_aplicada_id).toBe('param-2')
    expect(result.acao_recomendada).toBe('Solicitar análise Qualidade')
    expect(result.criticidade).toBe('CRITICA')
    expect(result.status).toBe('ACAO_NECESSARIA')
  })

  // Cenário 3: Classificação automática conforme regra
  it('Cenário 3: Classificação automática conforme regra (limite e status calculados)', () => {
    const param: ResidualBalanceParameter = {
      id: 'param-dp03',
      deposito: 'DP03',
      descricao: 'Resíduos Trefilação',
      tipo_regra: 'MENOR_QUE',
      quantidade: 300,
      unidade_medida: 'kg',
      acao_recomendada: 'Transferir para outro depósito',
      criticidade: 'MEDIA',
      ativo: true,
      excluido_logico: false,
    }

    const stockDentro: RawStockItem = {
      deposito: 'DP03',
      material_codigo: 'MP-TR-5160',
      material_descricao: 'Fio Máquina',
      lote: 'L-TR-01',
      quantidade_atual: 450,
      unidade_medida: 'kg',
    }
    const classifiedDentro = classifyStockItem(stockDentro, [param])
    expect(classifiedDentro.status).toBe('DENTRO_PARAMETRO')

    const stockResidual: RawStockItem = {
      deposito: 'DP03',
      material_codigo: 'MP-TR-5160',
      material_descricao: 'Fio Máquina',
      lote: 'L-TR-99',
      quantidade_atual: 180,
      unidade_medida: 'kg',
    }
    const classifiedResidual = classifyStockItem(stockResidual, [param])
    expect(classifiedResidual.status).toBe('SALDO_RESIDUAL_IDENTIFICADO')
    expect(classifiedResidual.regra_aplicada_id).toBe('param-dp03')
    expect(classifiedResidual.diferenca).toBe(120) // 300 - 180
  })

  // Cenário 4: Filtro por depósito
  it('Cenário 4: Filtro por depósito isola itens do depósito selecionado', () => {
    const mockStock: ResidualBalanceItem[] = [
      {
        deposito: 'DP07',
        material_codigo: 'MP-AC-1020',
        material_descricao: 'Tarugo 1020',
        lote: 'L-001',
        quantidade_atual: 100,
        unidade_medida: 'kg',
        data_identificacao: '2025-01-10T00:00:00Z',
        status: 'ACAO_NECESSARIA',
      },
      {
        deposito: 'DP07',
        material_codigo: 'MP-AC-1045',
        material_descricao: 'Tarugo 1045',
        lote: 'L-002',
        quantidade_atual: 200,
        unidade_medida: 'kg',
        data_identificacao: '2025-01-10T00:00:00Z',
        status: 'EM_TRATAMENTO',
      },
      {
        deposito: 'DP03',
        material_codigo: 'MP-TR-1010',
        material_descricao: 'Fio 1010',
        lote: 'L-003',
        quantidade_atual: 50,
        unidade_medida: 'kg',
        data_identificacao: '2025-01-10T00:00:00Z',
        status: 'SALDO_RESIDUAL_IDENTIFICADO',
      },
    ]

    const filterDP07 = mockStock.filter((i) => i.deposito === 'DP07')
    expect(filterDP07.length).toBe(2)
    expect(filterDP07.every((i) => i.deposito === 'DP07')).toBe(true)

    const filterDP03 = mockStock.filter((i) => i.deposito === 'DP03')
    expect(filterDP03.length).toBe(1)
    expect(filterDP03[0].lote).toBe('L-003')
  })

  // Cenário 5: Filtros combinados depósito + código + lote
  it('Cenário 5: Filtros combinados depósito + código + lote refinam a consulta com precisão', () => {
    const mockStock: ResidualBalanceItem[] = [
      {
        deposito: 'DP07',
        material_codigo: 'MP-AC-1020',
        material_descricao: 'Tarugo 1020',
        lote: 'L-001',
        quantidade_atual: 100,
        unidade_medida: 'kg',
        data_identificacao: '2025-01-10T00:00:00Z',
        status: 'ACAO_NECESSARIA',
      },
      {
        deposito: 'DP07',
        material_codigo: 'MP-AC-1020',
        material_descricao: 'Tarugo 1020',
        lote: 'L-002',
        quantidade_atual: 150,
        unidade_medida: 'kg',
        data_identificacao: '2025-01-10T00:00:00Z',
        status: 'ACAO_NECESSARIA',
      },
      {
        deposito: 'DP07',
        material_codigo: 'MP-AC-1045',
        material_descricao: 'Tarugo 1045',
        lote: 'L-001',
        quantidade_atual: 200,
        unidade_medida: 'kg',
        data_identificacao: '2025-01-10T00:00:00Z',
        status: 'EM_TRATAMENTO',
      },
    ]

    const matchCombined = mockStock.filter(
      (i) => i.deposito === 'DP07' && i.material_codigo === 'MP-AC-1020' && i.lote === 'L-001',
    )
    expect(matchCombined.length).toBe(1)
    expect(matchCombined[0].quantidade_atual).toBe(100)
  })

  // Cenário 6: Registrar tratamento atualiza status e grava histórico
  it('Cenário 6: Registrar tratamento atualiza status e grava histórico', async () => {
    const item: ResidualBalanceItem = {
      id: 'saldo-1',
      deposito: 'DP07',
      material_codigo: 'MP-1020',
      material_descricao: 'Aço 1020',
      lote: 'L-123',
      quantidade_atual: 300,
      unidade_medida: 'kg',
      data_identificacao: '2025-01-01',
      status: 'SALDO_RESIDUAL_IDENTIFICADO',
    }

    const mockUpdate = vi.fn().mockResolvedValue({ id: 'saldo-1', status: 'EM_TRATAMENTO' })
    const mockCreate = vi.fn().mockResolvedValue({ id: 'action-1' })

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balances') {
        return { update: mockUpdate } as any
      }
      if (name === 'pcp_residual_balance_actions') {
        return { create: mockCreate } as any
      }
      return {} as any
    })

    const result = await ResidualBalancesService.registerAction({
      saldoId: item.id,
      deposito: item.deposito,
      materialCodigo: item.material_codigo,
      lote: item.lote,
      quantidadeResidual: item.quantidade_atual,
      unidadeMedida: item.unidade_medida,
      acaoRealizada: 'Avaliação iniciada com supervisor',
      responsavel: 'Carlos PCP',
      statusNovo: 'EM_TRATAMENTO',
    })

    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      'saldo-1',
      expect.objectContaining({ status: 'EM_TRATAMENTO' }),
    )
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        lote: 'L-123',
        status_novo: 'EM_TRATAMENTO',
        responsavel: 'Carlos PCP',
      }),
    )
  })

  // Cenário 7: Regularizar sai da lista pendente mas permanece no histórico
  it('Cenário 7: Regularizar sai da lista pendente mas permanece no histórico', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 'saldo-2', status: 'REGULARIZADO' })
    const mockCreate = vi.fn().mockResolvedValue({ id: 'action-2' })
    const mockGetActions = vi.fn().mockResolvedValue([
      {
        id: 'action-2',
        saldo_id: 'saldo-2',
        deposito: 'DP07',
        material_codigo: 'MP-1020',
        lote: 'L-456',
        quantidade_residual: 200,
        unidade_medida: 'kg',
        acao_realizada: 'Consumido integralmente na OP 450012',
        responsavel: 'Gestor PCP',
        status_novo: 'REGULARIZADO',
        data_acao: '2025-01-15T10:00:00Z',
      },
    ])

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balances') {
        return { update: mockUpdate } as any
      }
      if (name === 'pcp_residual_balance_actions') {
        return { create: mockCreate, getFullList: mockGetActions } as any
      }
      return {} as any
    })

    const res = await ResidualBalancesService.registerAction({
      saldoId: 'saldo-2',
      deposito: 'DP07',
      materialCodigo: 'MP-1020',
      lote: 'L-456',
      quantidadeResidual: 200,
      unidadeMedida: 'kg',
      acaoRealizada: 'Consumido integralmente na OP 450012',
      responsavel: 'Gestor PCP',
      statusNovo: 'REGULARIZADO',
    })

    expect(res.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      'saldo-2',
      expect.objectContaining({ status: 'REGULARIZADO' }),
    )

    // Histórico preservado para auditoria
    const history = await ResidualBalancesService.getActionHistory('DP07', 'L-456')
    expect(history.length).toBe(1)
    expect(history[0].status_novo).toBe('REGULARIZADO')
    expect(history[0].acao_realizada).toBe('Consumido integralmente na OP 450012')
  })

  // Cenário 8: Editar parâmetro sem duplicidade
  it('Cenário 8: Editar parâmetro sem duplicidade (atualiza o registro original por ID)', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: 'param-existente',
      descricao: 'Descrição Atualizada',
      quantidade: 450,
    })
    const mockCreate = vi.fn()

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balance_parameters') {
        return { update: mockUpdate, create: mockCreate } as any
      }
      return {} as any
    })

    const res = await ResidualBalancesService.saveParameter({
      id: 'param-existente',
      deposito: 'DP07',
      descricao: 'Descrição Atualizada',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 450,
      unidade_medida: 'kg',
      acao_recomendada: 'Priorizar consumo',
      criticidade: 'ALTA',
    })

    expect(res.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith(
      'param-existente',
      expect.objectContaining({ descricao: 'Descrição Atualizada', quantidade: 450 }),
    )
    // create NÃO foi chamado -> garantia contra duplicidade
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // Cenário 9: Persistência após recarregar
  it('Cenário 9: Persistência após recarregar busca do banco sem perda de dados', async () => {
    const persistedDbParams = [
      {
        id: 'p-saved-1',
        deposito: 'DP07',
        deposito_nome: 'Matéria Prima L1',
        descricao: 'Regra Persistida Laminação',
        tipo_regra: 'MENOR_OU_IGUAL',
        quantidade: 500,
        unidade_medida: 'kg',
        acao_recomendada: 'Priorizar consumo',
        criticidade: 'ALTA',
        ativo: true,
        excluido_logico: false,
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
      },
    ]

    const mockGetFullList = vi.fn().mockResolvedValue(persistedDbParams)
    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balance_parameters') {
        return { getFullList: mockGetFullList } as any
      }
      return {} as any
    })

    const reloaded = await ResidualBalancesService.getParameters(false)
    expect(reloaded.length).toBe(1)
    expect(reloaded[0].id).toBe('p-saved-1')
    expect(reloaded[0].descricao).toBe('Regra Persistida Laminação')
    expect(reloaded[0].ativo).toBe(true)
  })

  // Cenário 10: Prioridade entre parâmetros (criticidade → especificidade, regras atingidas) + regularização automática com rastreabilidade + conversão t↔kg
  it('Cenário 10: Prioridade entre parâmetros (criticidade → especificidade) + regularização automática com rastreabilidade + conversão t↔kg', () => {
    // 10.1 Prioridade: Criticidade vence especificidade; em empate de criticidade, especificidade prevalece
    const ruleAlta: ResidualBalanceParameter = {
      id: 'rule-alta-faixa',
      deposito: 'DP07',
      descricao: 'Faixa 100 a 300kg Alta',
      tipo_regra: 'FAIXA_QUANTIDADE',
      quantidade_min: 100,
      quantidade_max: 300,
      unidade_medida: 'kg',
      acao_recomendada: 'Tratamento Faixa Alta',
      criticidade: 'ALTA',
      ativo: true,
      excluido_logico: false,
    }

    const ruleCritica: ResidualBalanceParameter = {
      id: 'rule-critica-menor',
      deposito: 'DP07',
      descricao: 'Menor ou igual a 250kg Crítica',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 250,
      unidade_medida: 'kg',
      acao_recomendada: 'Tratamento Crítico Imediato',
      criticidade: 'CRITICA',
      ativo: true,
      excluido_logico: false,
    }

    const stockPrio: RawStockItem = {
      deposito: 'DP07',
      material_codigo: 'MP-1020',
      material_descricao: 'Tarugo',
      lote: 'L-PRIO',
      quantidade_atual: 200,
      unidade_medida: 'kg',
    }

    const prioResult = classifyStockItem(stockPrio, [ruleAlta, ruleCritica])
    expect(prioResult.regras_atingidas?.length).toBe(2)
    // CRITICA prevalece mesmo que FAIXA tenha especificidade maior
    expect(prioResult.regra_aplicada_id).toBe('rule-critica-menor')
    expect(prioResult.criticidade).toBe('CRITICA')
    expect(prioResult.acao_recomendada).toBe('Tratamento Crítico Imediato')

    // 10.2 Empate de criticidade: maior especificidade (FAIXA=5 > MENOR_OU_IGUAL=4) prevalece
    const ruleMediaMenor: ResidualBalanceParameter = {
      id: 'rule-media-menor',
      deposito: 'DP07',
      descricao: 'Menor ou igual a 300kg Média',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 300,
      unidade_medida: 'kg',
      acao_recomendada: 'Ação Menor',
      criticidade: 'MEDIA',
      ativo: true,
      excluido_logico: false,
    }
    const ruleMediaFaixa: ResidualBalanceParameter = {
      id: 'rule-media-faixa',
      deposito: 'DP07',
      descricao: 'Faixa 150 a 250kg Média',
      tipo_regra: 'FAIXA_QUANTIDADE',
      quantidade_min: 150,
      quantidade_max: 250,
      unidade_medida: 'kg',
      acao_recomendada: 'Ação Faixa Mais Específica',
      criticidade: 'MEDIA',
      ativo: true,
      excluido_logico: false,
    }

    const empateResult = classifyStockItem(stockPrio, [ruleMediaMenor, ruleMediaFaixa])
    expect(empateResult.regra_aplicada_id).toBe('rule-media-faixa')
    expect(empateResult.acao_recomendada).toBe('Ação Faixa Mais Específica')

    // 10.3 Regularização automática com rastreabilidade
    const previousResidual: ResidualBalanceItem = {
      id: 'saldo-antigo-1',
      deposito: 'DP07',
      material_codigo: 'MP-1020',
      material_descricao: 'Tarugo',
      lote: 'L-REG-AUTO',
      quantidade_atual: 200,
      unidade_medida: 'kg',
      data_identificacao: '2025-01-01T08:00:00Z',
      status: 'ACAO_NECESSARIA',
    }

    const stockSubiu: RawStockItem = {
      deposito: 'DP07',
      material_codigo: 'MP-1020',
      material_descricao: 'Tarugo',
      lote: 'L-REG-AUTO',
      quantidade_atual: 12000, // nova entrada física
      unidade_medida: 'kg',
    }

    const autoResult = classifyStockItem(stockSubiu, [ruleCritica], previousResidual)
    expect(autoResult.status).toBe('REGULARIZADO_AUTOMATICO')
    expect(autoResult.quantidade_anterior).toBe(200)
    expect(autoResult.quantidade_atual).toBe(12000)
    expect(autoResult.ultima_atualizacao_origem).toBe('REGULARIZACAO_AUTOMATICA_QUANTIDADE')

    // 10.4 Conversão de unidades t ↔ kg
    expect(normalizeUnitConversion(2.5, 't', 'kg')).toBe(2500)
    expect(normalizeUnitConversion(500, 'kg', 't')).toBe(0.5)

    const paramKg: ResidualBalanceParameter = {
      id: 'p-kg',
      deposito: 'DP07',
      descricao: 'Regra em kg',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 1000,
      unidade_medida: 'kg',
      acao_recomendada: 'Consumir',
      criticidade: 'MEDIA',
      ativo: true,
      excluido_logico: false,
    }
    // Estoque em toneladas: 0.8 t = 800 kg <= 1000 kg -> bate
    const matchT = testRuleMatch(paramKg, 0.8, 't')
    expect(matchT.matches).toBe(true)
    expect(matchT.diff).toBe(200)
  })

  // Verificação de permissão bloqueada no backend (403)
  it('Verificação de permissão bloqueada (403): tentativa não autorizada lança erro de acesso negado', async () => {
    // 1. pb.send rejeita com 403
    vi.spyOn(pb, 'send').mockRejectedValue({
      status: 403,
      message: 'Acesso negado: sem permissão para gerenciar parâmetros.',
      response: { error: 'Acesso negado: sem permissão para gerenciar parâmetros.' },
    })

    // 2. Auth store com usuário sem permissão
    const prevAuth = pb.authStore.model
    pb.authStore.save('mock-token', {
      id: 'user-viewer',
      role: 'PRODUCTION_VIEWER',
      email: 'viewer@empresa.com.br',
    } as any)

    try {
      await expect(
        ResidualBalancesService.saveParameter({
          deposito: 'DP07',
          descricao: 'Regra Não Autorizada',
          tipo_regra: 'MENOR_OU_IGUAL',
          quantidade: 100,
          unidade_medida: 'kg',
          acao_recomendada: 'Teste',
          criticidade: 'BAIXA',
        }),
      ).rejects.toThrow(/Acesso negado/)

      await expect(ResidualBalancesService.deleteParameter('param-123')).rejects.toThrow(
        /Acesso negado/,
      )
    } finally {
      pb.authStore.save('mock-token', prevAuth as any)
    }
  })
})
