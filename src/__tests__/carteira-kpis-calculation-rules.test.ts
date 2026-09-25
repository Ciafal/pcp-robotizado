// Testes automatizados obrigatórios de cálculo para os KPIs de Carteira
// Conforme especificação da tarefa:
// TESTE 1: A=-10,00; B=+5,00; C=-8,00 -> 2 itens negativos (não 3).
// TESTE 2: mesmos valores -> saldo negativo -18,00 t (positivo NÃO compensa).
// TESTE 3: A 10 dias + B 5 dias + C 20 dias -> 35 item-dias.
// TESTE 4: 50 cancelados totais, 10 pedidos distintos PCP -> "10 pedidos | 20,0%".
// TESTE 5: OV 4500001000 com 3 itens cancelados PCP -> Pedidos: 1, Itens: 3.
// TESTE 6: A=5, B=8, C=12 -> Total=25 e A+B+C=Total.

import { describe, it, expect } from 'vitest'
import {
  calculateNegativeItemsAndBalance,
  calculateItemDays,
  calculatePcpCancellationRate,
  countDistinctOrdersAndItems,
  validateAbcDistribution,
  computePortfolioKpis,
  generateDemoSnapshots,
} from '@/services/carteira-kpis-engine'

describe('Validações Obrigatórias de Cálculo - KPI Carteira PCP', () => {
  it('TESTE 1: A=-10,00; B=+5,00; C=-8,00 -> 2 itens negativos (não 3)', () => {
    const balances = [-10.0, 5.0, -8.0]
    const result = calculateNegativeItemsAndBalance(balances)
    expect(result.negativeCount).toBe(2)
  })

  it('TESTE 2: mesmos valores -> saldo negativo -18,00 t (positivo NÃO compensa)', () => {
    const balances = [-10.0, 5.0, -8.0]
    const result = calculateNegativeItemsAndBalance(balances)
    // Se o positivo compensasse, daria -13,00 t. Mas positivo NÃO compensa, deve dar -18,00 t.
    expect(result.negativeBalanceSum).toBe(-18.0)
  })

  it('TESTE 3: A 10 dias + B 5 dias + C 20 dias -> 35 item-dias', () => {
    const days = [10, 5, 20]
    const totalItemDays = calculateItemDays(days)
    expect(totalItemDays).toBe(35)
  })

  it('TESTE 4: 50 cancelados totais, 10 pedidos distintos PCP -> "10 pedidos | 20,0%"', () => {
    const result = calculatePcpCancellationRate(50, 10)
    expect(result.rate).toBe(20.0)
    // Label formatada no padrão brasileiro
    expect(result.label).toBe('10 pedidos | 20,0%')
  })

  it('TESTE 5: OV 4500001000 com 3 itens cancelados PCP -> Pedidos: 1, Itens: 3', () => {
    const items = [
      { orderId: '4500001000', item: '10', isPcpReason: true },
      { orderId: '4500001000', item: '20', isPcpReason: true },
      { orderId: '4500001000', item: '30', isPcpReason: true },
      { orderId: '4500001001', item: '10', isPcpReason: false }, // não PCP
    ]
    const result = countDistinctOrdersAndItems(items)
    expect(result.distinctOrders).toBe(1)
    expect(result.totalItems).toBe(3)
  })

  it('TESTE 6: A=5, B=8, C=12 -> Total=25 e A+B+C=Total', () => {
    const result = validateAbcDistribution(5, 8, 12)
    expect(result.total).toBe(25)
    expect(result.isValid).toBe(true)
  })

  it('Integração: computePortfolioKpis calcula os indicadores preservando as regras', () => {
    const snapshots = generateDemoSnapshots('2026-09')
    const kpis = computePortfolioKpis(
      snapshots,
      { exercicio: '2026', periodo: '09', centro: 'TODOS' },
      [
        { orderId: 'OV-001', item: '10', material: 'TUB-IND-001', tons: 10, isPcpReason: true },
        { orderId: 'OV-001', item: '20', material: 'TUB-IND-001', tons: 5, isPcpReason: true },
        { orderId: 'OV-002', item: '10', material: 'TUB-EST-004', tons: 8, isPcpReason: true },
      ],
      10,
    )

    // A soma de A+B+C nos itens negativos do fechamento deve ser igual ao total
    expect(kpis.itensNegativosA + kpis.itensNegativosB + kpis.itensNegativosC).toBe(
      kpis.totalItensNegativos,
    )

    // Saldo negativo deve ser puramente a soma dos negativos
    expect(kpis.saldoNegativoFechamento).toBeLessThan(0)

    // Pedidos cancelados PCP
    expect(kpis.pedidosCanceladosPcp).toBe(2)
    expect(kpis.itensCanceladosPcp).toBe(3)
  })
})
