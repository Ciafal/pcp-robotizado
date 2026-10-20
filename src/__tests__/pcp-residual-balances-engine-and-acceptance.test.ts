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
    vi.clearAllMocks()
  })

  // Cenário 1: Criar parâmetro DP07 / Quantidade ≤ 500 kg / Ação: Priorizar consumo
  it('Cenário 1: Parâmetro DP07 / Quantidade ≤ 500 kg / Ação: Priorizar consumo classifica corretamente', () => {
    const paramDP07: ResidualBalanceParameter = {
      id: 'param-1',
      deposito: 'DP07',
      descricao: 'Saldo residual mínimo DP07',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 500,
      unidade_medida: 'kg',
      acao_recomendada: 'Priorizar consumo',
      criticidade: 'ALTA',
      ativo: true,
      excluido_logico: false,
    }

    const matchCheck = testRuleMatch(paramDP07, 420, 'kg')
    expect(matchCheck.matches).toBe(true)
    expect(matchCheck.limit).toBe(500)
    expect(matchCheck.diff).toBe(80)

    const matchFail = testRuleMatch(paramDP07, 600, 'kg')
    expect(matchFail.matches).toBe(false)
  })

  // Cenário 2: Segundo parâmetro no mesmo depósito -> ambos coexistem
  it('Cenário 2: Múltiplos parâmetros no mesmo depósito coexistem e ambos são avaliados', () => {
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

    // Ambas as regras atingidas
    expect(result.regras_atingidas?.length).toBe(2)
    // A regra de maior criticidade prevalece (CRITICA vence MEDIA)
    expect(result.regra_aplicada_id).toBe('param-2')
    expect(result.acao_recomendada).toBe('Solicitar análise Qualidade')
    expect(result.criticidade).toBe('CRITICA')
    expect(result.status).toBe('ACAO_NECESSARIA')
  })

  // Cenário 3: Saldo que atende a uma regra -> classificação automática correta
  it('Cenário 3: Saldo que atende a uma regra recebe status de classificação automática correta', () => {
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

    const stock: RawStockItem = {
      deposito: 'DP03',
      material_codigo: 'MP-TR-5160',
      material_descricao: 'Fio Máquina',
      lote: 'L-TR-99',
      quantidade_atual: 180,
      unidade_medida: 'kg',
    }

    const classified = classifyStockItem(stock, [param])
    expect(classified.status).toBe('SALDO_RESIDUAL_IDENTIFICADO')
    expect(classified.regra_aplicada_id).toBe('param-dp03')
    expect(classified.diferenca).toBe(120) // 300 - 180
  })

  // Cenário 4 & 5: Filtragem por depósito e filtros combinados
  it('Cenário 4 e 5: Filtros combinados de depósito, material e lote filtram corretamente', async () => {
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

    // Filtro por depósito DP07
    const depFiltered = mockStock.filter((i) => i.deposito === 'DP07')
    expect(depFiltered.length).toBe(2)

    // Filtros combinados: DP07 + MP-AC-1020 + L-001
    const combinedFiltered = mockStock.filter(
      (i) =>
        i.deposito === 'DP07' && i.material_codigo.includes('1020') && i.lote.includes('L-001'),
    )
    expect(combinedFiltered.length).toBe(1)
    expect(combinedFiltered[0].material_codigo).toBe('MP-AC-1020')
  })

  // Cenário 6: Registrar tratamento -> status atualiza e grava histórico
  it('Cenário 6: Registrar tratamento atualiza status e preserva dados', async () => {
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

    // Mock das collections do PocketBase
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

  // Cenário 7: Regularizar -> sai da pendência mas continua no histórico
  it('Cenário 7: Regularizar exige responsável e ação e atualiza para REGULARIZADO', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ id: 'saldo-2', status: 'REGULARIZADO' })
    const mockCreate = vi.fn().mockResolvedValue({ id: 'action-2' })

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balances') {
        return { update: mockUpdate } as any
      }
      if (name === 'pcp_residual_balance_actions') {
        return { create: mockCreate } as any
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
  })

  // Cenário 8: Editar parâmetro atualiza o original sem duplicidade
  it('Cenário 8: Editar parâmetro atualiza o registro existente por ID', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({
      id: 'param-existente',
      descricao: 'Descrição Atualizada',
    })

    vi.spyOn(pb, 'collection').mockImplementation((name: string) => {
      if (name === 'pcp_residual_balance_parameters') {
        return { update: mockUpdate } as any
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
      expect.objectContaining({ descricao: 'Descrição Atualizada' }),
    )
  })

  // Cenário Adicional: Regularização Automática preservando rastreabilidade
  it('Cenário Adicional: Saldo que deixa de ser residual é classificado como REGULARIZADO_AUTOMATICO com rastreabilidade', () => {
    const param: ResidualBalanceParameter = {
      id: 'param-dp07',
      deposito: 'DP07',
      descricao: 'Saldo ≤ 500 kg',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 500,
      unidade_medida: 'kg',
      acao_recomendada: 'Priorizar consumo',
      criticidade: 'ALTA',
      ativo: true,
      excluido_logico: false,
    }

    const previousResidual: ResidualBalanceItem = {
      id: 'saldo-db-1',
      deposito: 'DP07',
      material_codigo: 'MP-AC-1020',
      material_descricao: 'Tarugo',
      lote: 'L-099',
      quantidade_atual: 400,
      unidade_medida: 'kg',
      data_identificacao: '2025-01-01T10:00:00Z',
      status: 'ACAO_NECESSARIA',
    }

    // O estoque recebeu novo recebimento e a quantidade subiu para 15.000 kg (deixou de atender à regra ≤ 500 kg)
    const updatedStock: RawStockItem = {
      deposito: 'DP07',
      material_codigo: 'MP-AC-1020',
      material_descricao: 'Tarugo',
      lote: 'L-099',
      quantidade_atual: 15000,
      unidade_medida: 'kg',
    }

    const reclassified = classifyStockItem(updatedStock, [param], previousResidual)

    expect(reclassified.status).toBe('REGULARIZADO_AUTOMATICO')
    expect(reclassified.quantidade_anterior).toBe(400)
    expect(reclassified.quantidade_atual).toBe(15000)
    expect(reclassified.ultima_atualizacao_origem).toBe('REGULARIZACAO_AUTOMATICA_QUANTIDADE')
  })

  // Conversão de unidades (t para kg)
  it('Conversão de unidades: t para kg converte corretamente para a regra', () => {
    expect(normalizeUnitConversion(2, 't', 'kg')).toBe(2000)
    expect(normalizeUnitConversion(500, 'kg', 't')).toBe(0.5)

    const paramKg: ResidualBalanceParameter = {
      id: 'p-1',
      deposito: 'DP07',
      descricao: 'Regra em kg',
      tipo_regra: 'MENOR_OU_IGUAL',
      quantidade: 1000,
      unidade_medida: 'kg',
      acao_recomendada: 'Ação',
      criticidade: 'MEDIA',
      ativo: true,
      excluido_logico: false,
    }

    // 0.8 toneladas = 800 kg <= 1000 kg -> deve bater
    const match = testRuleMatch(paramKg, 0.8, 't')
    expect(match.matches).toBe(true)
    expect(match.diff).toBe(200)
  })
})
