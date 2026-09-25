import { describe, it, expect } from 'vitest'
import {
  calculateNegativeItemsCount,
  calculateNegativePortfolioBalance,
  calculateItemDaysTotal,
  formatCancelledOrdersPcpKpi,
  aggregateCancelledOrdersAndItems,
  calculateAbcDistribution,
  isPcpReason,
} from '@/services/kpis-carteira-service'

describe("Testes Obrigatórios da Tela KPI's - Carteira (T1 - T6)", () => {
  it('T1: A=-10, B=+5, C=-8 -> 2 itens negativos', () => {
    const saldos = [-10, 5, -8]
    const resultado = calculateNegativeItemsCount(saldos)
    expect(resultado).toBe(2)
  })

  it('T2: mesmos (A=-10, B=+5 ou +20, C=-8) -> -18,00 t (saldo positivo não compensa)', () => {
    const saldos = [-10, 20, -8]
    const resultado = calculateNegativePortfolioBalance(saldos)
    expect(resultado).toBe(-18)
  })

  it('T3: 10 + 5 + 20 dias -> 35 item-dias', () => {
    const diasPorMaterial = [10, 5, 20]
    const resultado = calculateItemDaysTotal(diasPorMaterial)
    expect(resultado).toBe(35)
  })

  it('T4: 50 cancelados, 10 pedidos PCP -> "10 pedidos | 20,0%"', () => {
    const resultado = formatCancelledOrdersPcpKpi(10, 50)
    expect(resultado.pedidos).toBe(10)
    expect(resultado.percentual).toBe(20)
    expect(resultado.formattedText).toBe('10 pedidos | 20,0%')
  })

  it('T5: OV 4500001000 com 3 itens PCP -> Pedidos: 1, Itens: 3', () => {
    const itensOrdem = [
      { ordem_venda: '4500001000', item_ordem: '000010' },
      { ordem_venda: '4500001000', item_ordem: '000020' },
      { ordem_venda: '4500001000', item_ordem: '000030' },
    ]
    const resultado = aggregateCancelledOrdersAndItems(itensOrdem)
    expect(resultado.pedidosQtd).toBe(1)
    expect(resultado.itensQtd).toBe(3)
  })

  it('T6: A=5, B=8, C=12 -> Total=25 e A+B+C=Total', () => {
    const itensPorCurva = { A: 5, B: 8, C: 12 }
    const resultado = calculateAbcDistribution(itensPorCurva)
    expect(resultado.total).toBe(25)
    expect(resultado.a).toBe(5)
    expect(resultado.b).toBe(8)
    expect(resultado.c).toBe(12)
    expect(resultado.somaValidada).toBe(true)
    expect(resultado.a + resultado.b + resultado.c).toBe(resultado.total)
  })

  it('Validação de Motivos PCP: categorização correta sem duplicar catálogo', () => {
    expect(isPcpReason('Sem estoque em pronta entrega')).toBe(true)
    expect(isPcpReason('Falta de data de programação')).toBe(true)
    expect(isPcpReason('Preço fora do mercado')).toBe(false)
  })
})
