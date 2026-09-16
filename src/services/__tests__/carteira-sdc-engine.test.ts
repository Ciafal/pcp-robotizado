import { describe, it, expect } from 'vitest'
import { CarteiraSDCEngine } from '../carteira-sdc-engine'

describe('CarteiraSDCEngine — Regras de Negócio e Cálculos Oficiais SDC', () => {
  it('TESTE FUNCIONAL OBRIGATÓRIO: Carteira 26,00 t / Estoque 6,84 t -> Saldo = -19,16 t e status DÉFICIT/CRÍTICO', () => {
    // Cenário inicial: Carteira 26,00 t, Estoque 6,84 t, sem programação
    const itemInicial = CarteiraSDCEngine.calcularItem({
      material: 'C1000A360600',
      descricao: 'Cantoneira Abas Iguais 1" x 1/8" ASTM A36',
      carteira_t: 26.0,
      estoque_total_t: 6.84,
      programado_t: 0,
      em_producao_t: 0,
    })

    // 1. Saldo = Estoque Total - Carteira = 6.84 - 26.00 = -19.16
    expect(itemInicial.saldo_t).toBe(-19.16)

    // 2. Sem programação, saldo negativo -> status CRÍTICO / DÉFICIT
    // O requisito diz: "Carteira 26,00 t / Estoque 6,84 t → Saldo = −19,16 t e status DÉFICIT; com programação ≥ 19,16 t → status muda para COBERTURA PROGRAMADA sem alterar o saldo atual."
    expect(itemInicial.status === 'CRÍTICO' || itemInicial.status === 'DÉFICIT').toBe(true)

    // 3. Com programação ≥ 19,16 t (ex: 20 t)
    const itemComProgramacao = CarteiraSDCEngine.calcularItem({
      material: 'C1000A360600',
      descricao: 'Cantoneira Abas Iguais 1" x 1/8" ASTM A36',
      carteira_t: 26.0,
      estoque_total_t: 6.84,
      programado_t: 20.0,
      em_producao_t: 0,
    })

    // Saldo atual NÃO deve ser alterado (permanece 6.84 - 26.00 = -19.16 t)
    expect(itemComProgramacao.saldo_t).toBe(-19.16)

    // Saldo Projetado = 6.84 + 20.00 - 26.00 = +0.84 t (>= 0)
    expect(itemComProgramacao.saldo_projetado_t).toBe(0.84)

    // Status deve mudar para COBERTURA PROGRAMADA
    expect(itemComProgramacao.status).toBe('COBERTURA PROGRAMADA')
  })

  it('FÓRMULA SALDO PROJETADO: 10 + 35 - 40 = +5 t e status COBERTURA PROGRAMADA', () => {
    const item = CarteiraSDCEngine.calcularItem({
      material: 'BAR-CH-01',
      descricao: 'Barra Chata 2" x 1/4"',
      carteira_t: 40.0,
      estoque_total_t: 10.0,
      programado_t: 35.0,
      em_producao_t: 0,
    })

    expect(item.saldo_t).toBe(-30.0)
    expect(item.saldo_projetado_t).toBe(5.0)
    expect(item.status).toBe('COBERTURA PROGRAMADA')
  })

  it('COBERTURA PARCIAL: saldo < 0, há programação, mas saldo projetado continua negativo', () => {
    const item = CarteiraSDCEngine.calcularItem({
      material: 'BAR-RED-02',
      descricao: 'Barra Redonda 1" SAE 1020',
      carteira_t: 50.0,
      estoque_total_t: 10.0,
      programado_t: 20.0,
      em_producao_t: 0,
    })

    expect(item.saldo_t).toBe(-40.0)
    expect(item.saldo_projetado_t).toBe(-20.0)
    expect(item.status).toBe('COBERTURA PARCIAL')
    expect(item.alertas_lista).toContain(
      'Produção programada reduz o déficit, porém ainda permanecem 20,00 t sem cobertura.',
    )
  })

  it('STATUS COBERTO: saldo >= 0', () => {
    const item = CarteiraSDCEngine.calcularItem({
      material: 'BAR-QUAD-03',
      descricao: 'Barra Quadrada 5/8" SAE 1045',
      carteira_t: 15.0,
      estoque_total_t: 20.0,
      programado_t: 0,
    })

    expect(item.saldo_t).toBe(5.0)
    expect(item.status).toBe('COBERTO')
  })

  it('STATUS SEM CARTEIRA: carteira = 0', () => {
    const item = CarteiraSDCEngine.calcularItem({
      material: 'BAR-QUAD-04',
      descricao: 'Barra Quadrada 1/2"',
      carteira_t: 0,
      estoque_total_t: 10.0,
    })

    expect(item.status).toBe('SEM CARTEIRA')
  })

  it('ORDENAÇÃO POR PRIORIZAR NECESSIDADE coloca Críticos e Maiores Déficits no topo', () => {
    const itens = [
      CarteiraSDCEngine.calcularItem({
        material: 'ITEM-COBERTO',
        descricao: 'Item 1',
        carteira_t: 10,
        estoque_total_t: 20,
      }),
      CarteiraSDCEngine.calcularItem({
        material: 'ITEM-CRITICO',
        descricao: 'Item 2',
        carteira_t: 50,
        estoque_total_t: 0,
      }),
      CarteiraSDCEngine.calcularItem({
        material: 'ITEM-COBERTURA-PROG',
        descricao: 'Item 3',
        carteira_t: 30,
        estoque_total_t: 5,
        programado_t: 30,
      }),
    ]

    const ordenados = CarteiraSDCEngine.ordenarItens(itens, 'PRIORIZAR_NECESSIDADE')
    expect(ordenados[0].material).toBe('ITEM-CRITICO')
    expect(ordenados[1].material).toBe('ITEM-COBERTURA-PROG')
    expect(ordenados[2].material).toBe('ITEM-COBERTO')
  })
})
