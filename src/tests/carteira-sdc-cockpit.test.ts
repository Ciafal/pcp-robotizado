import { describe, it, expect } from 'vitest'
import { CarteiraSDCEngine } from '@/services/carteira-sdc-engine'
import { CarteiraSDCService } from '@/services/carteira-sdc-service'
import { DeterministicExecutiveEngine } from '@/services/deterministic-executive-engine'
import { CarteiraSDCItem, AlertaCarteiraSDC } from '@/types/carteira-sdc'

describe('Carteira SDC -> Cockpit Operacional & Executivo (Testes Contratuais A, B, C)', () => {
  // Dados de teste canônicos obrigatórios:
  // Carteira: 26,00 t, Estoque: 6,84 t
  // Saldo = 6,84 - 26,00 = -19,16 t
  const baseItem = {
    material: 'C1000A360600',
    descricao: 'Cantoneira Abas Iguais 1" x 1/8" ASTM A36',
    carteira_t: 26.0,
    estoque_total_t: 6.84,
    centro_sap: 'SDPL',
    empresa: 'Sidercentro',
  }

  /**
   * TESTE OBRIGATÓRIO A:
   * Programado 0 -> saldo -19,16 t, projetado -19,16 t, alerta CRÍTICO no Cockpit
   */
  it('TESTE A: Programado 0 -> saldo -19,16 t, projetado -19,16 t, alerta CRÍTICO no Cockpit', () => {
    const itemA = CarteiraSDCEngine.calcularItem({
      ...baseItem,
      programado_t: 0,
      em_producao_t: 0,
    })

    expect(itemA.saldo_t).toBe(-19.16)
    expect(itemA.saldo_projetado_t).toBe(-19.16)
    expect(itemA.status).toBe('CRÍTICO')

    // Gerar alertas pelo motor SDC
    const alertas = CarteiraSDCEngine.reconciliarAlertasSDC([itemA])
    const alertaCritico = alertas.find(
      (a) => a.material === 'C1000A360600' && a.tipo_alerta === 'DEFICIT_SEM_PROGRAMACAO',
    )

    expect(alertaCritico).toBeDefined()
    expect(alertaCritico?.severidade).toBe('CRÍTICO')
    expect(alertaCritico?.origem).toBe('Carteira SDC')
    expect(alertaCritico?.empresa_centro).toBe('SDPL')
    expect(alertaCritico?.saldo_atual).toBe(-19.16)
    expect(alertaCritico?.saldo_projetado).toBe(-19.16)
    expect(alertaCritico?.quantidade_programada).toBe(0)
    expect(alertaCritico?.descricao).toContain(
      'Material C1000A360600 possui déficit de 19,16 t e não possui programação para cobertura.',
    )
    expect(alertaCritico?.link_detalhamento).toBe(
      '/pcp/analise-carteira/sdc?material=C1000A360600',
    )
  })

  /**
   * TESTE OBRIGATÓRIO B:
   * Programado 20 -> saldo -19,16 t, projetado +0,84 t, status COBERTURA PROGRAMADA,
   * NÃO crítico no Cockpit (Cobertura programada NÃO aumenta o contador de críticos)
   */
  it('TESTE B: Programado 20 -> saldo -19,16 t, projetado +0,84 t, status COBERTURA PROGRAMADA, NÃO crítico no Cockpit', () => {
    const itemB = CarteiraSDCEngine.calcularItem({
      ...baseItem,
      programado_t: 20.0,
      em_producao_t: 0,
    })

    expect(itemB.saldo_t).toBe(-19.16)
    expect(itemB.saldo_projetado_t).toBe(0.84)
    expect(itemB.status).toBe('COBERTURA PROGRAMADA')

    // Gerar alertas pelo motor SDC
    const alertas = CarteiraSDCEngine.reconciliarAlertasSDC([itemB])
    const alertaCob = alertas.find((a) => a.material === 'C1000A360600')

    expect(alertaCob).toBeDefined()
    expect(alertaCob?.tipo_alerta).toBe('COBERTURA_PROGRAMADA')
    expect(alertaCob?.severidade).toBe('INFORMATIVO') // Severidade informativa, NÃO é crítico!
    expect(alertaCob?.severidade).not.toBe('CRÍTICO')
    expect(alertaCob?.descricao).toContain('cobre integralmente a necessidade')

    // Verificar que na agregação o contador de críticos não é incrementado por cobertura programada
    const kpis = CarteiraSDCEngine.calcularKpis([itemB])
    expect(kpis.itens_cobertura_programada_count).toBe(1)
    expect(kpis.itens_criticos_count).toBe(0)
  })

  /**
   * TESTE OBRIGATÓRIO C:
   * Programado 10 -> saldo -19,16 t, projetado -9,16 t, alerta ALTO com déficit residual 9,16 t
   */
  it('TESTE C: Programado 10 -> saldo -19,16 t, projetado -9,16 t, alerta ALTO com déficit residual 9,16 t', () => {
    const itemC = CarteiraSDCEngine.calcularItem({
      ...baseItem,
      programado_t: 10.0,
      em_producao_t: 0,
    })

    expect(itemC.saldo_t).toBe(-19.16)
    expect(itemC.saldo_projetado_t).toBe(-9.16)
    expect(itemC.status).toBe('COBERTURA PARCIAL')

    // Gerar alertas pelo motor SDC
    const alertas = CarteiraSDCEngine.reconciliarAlertasSDC([itemC])
    const alertaAlto = alertas.find((a) => a.material === 'C1000A360600')

    expect(alertaAlto).toBeDefined()
    expect(alertaAlto?.tipo_alerta).toBe('COBERTURA_PARCIAL')
    expect(alertaAlto?.severidade).toBe('ALTO')
    expect(alertaAlto?.saldo_atual).toBe(-19.16)
    expect(alertaAlto?.quantidade_programada).toBe(10.0)
    expect(alertaAlto?.saldo_projetado).toBe(-9.16)
    expect(alertaAlto?.descricao).toContain('déficit projetado de 9,16 t')
    expect(alertaAlto?.descricao).toContain('déficit atual: 19,16 t')
  })

  /**
   * TESTE: Chave lógica anti-duplicação e ciclo de vida / upsert
   */
  it('Deduplicação de alertas por chave lógica e ciclo de vida', async () => {
    const chave = CarteiraSDCEngine.gerarChaveLogicaAlerta(
      'SDPL',
      'C1000A360600',
      'DEFICIT_SEM_PROGRAMACAO',
      'CARTEIRA_SDC',
    )
    expect(chave).toBe('SDPL:C1000A360600:DEFICIT_SEM_PROGRAMACAO:CARTEIRA_SDC')

    // Ciclo 1: Sem programação -> Alerta gerado como Novo
    const itemA = CarteiraSDCEngine.calcularItem({
      ...baseItem,
      programado_t: 0,
    })
    const alertasCiclo1 = CarteiraSDCEngine.reconciliarAlertasSDC([itemA], [])
    expect(alertasCiclo1.length).toBe(1)
    expect(alertasCiclo1[0].status).toBe('Novo')

    // Usuário assume o tratamento
    alertasCiclo1[0].status = 'Em tratamento'
    alertasCiclo1[0].responsavel = 'Carlos PCP'

    // Ciclo 2: Mesma condição reprocessada não duplica, mantém 'Em tratamento'
    const alertasCiclo2 = CarteiraSDCEngine.reconciliarAlertasSDC([itemA], alertasCiclo1)
    expect(alertasCiclo2.length).toBe(1)
    expect(alertasCiclo2[0].id).toBe(alertasCiclo1[0].id)
    expect(alertasCiclo2[0].status).toBe('Em tratamento')
    expect(alertasCiclo2[0].responsavel).toBe('Carlos PCP')

    // Ciclo 3: Programação cobre integralmente -> Alerta anterior é resolvido automaticamente com histórico
    const itemCoberto = CarteiraSDCEngine.calcularItem({
      ...baseItem,
      programado_t: 26.0,
    })
    const alertasCiclo3 = CarteiraSDCEngine.reconciliarAlertasSDC([itemCoberto], alertasCiclo2)

    const alertaAntigoResolvido = alertasCiclo3.find(
      (a) => a.id === 'SDPL:C1000A360600:DEFICIT_SEM_PROGRAMACAO:CARTEIRA_SDC',
    )
    expect(alertaAntigoResolvido).toBeDefined()
    expect(alertaAntigoResolvido?.status).toBe('Resolvido')
    expect(alertaAntigoResolvido?.ativo).toBe(false)
    const ultimoHist = alertaAntigoResolvido?.historico.slice(-1)[0]
    expect(ultimoHist?.mensagem).toBe(
      'Resolvido automaticamente após atualização da programação.',
    )
  })

  /**
   * TESTE: Resumo IA no Cockpit no formato exato solicitado pelo usuário
   */
  it('Geração do Resumo IA no formato exato no DeterministicExecutiveEngine', () => {
    const engine = new DeterministicExecutiveEngine()
    const cards = engine.calculateCards({
      lines: [],
      alerts: [],
      capacityLogs: [],
      inventoryItems: [],
      deviations: [],
      schedules: [],
      scenarioItems: [],
      routes: [],
    })

    const itensSDC: CarteiraSDCItem[] = [
      CarteiraSDCEngine.calcularItem({
        material: 'C1000A360600',
        descricao: 'Cantoneira 1" x 1/8"',
        carteira_t: 26.0,
        estoque_total_t: 6.84,
        programado_t: 0,
      }),
      CarteiraSDCEngine.calcularItem({
        material: 'BAR-RED-25.4-1020',
        descricao: 'Barra Redonda 1"',
        carteira_t: 50.0,
        estoque_total_t: 10.0,
        programado_t: 20.0,
      }),
      CarteiraSDCEngine.calcularItem({
        material: 'BAR-CH-50x6.35-A36',
        descricao: 'Barra Chata 2"',
        carteira_t: 40.0,
        estoque_total_t: 10.0,
        programado_t: 35.0,
      }),
    ]

    const summary = engine.generateExecutiveSummary(cards, 'ALL', {
      itens: itensSDC,
    })

    expect(summary.resumoSDCFormatado).toBeDefined()
    expect(summary.resumoSDCFormatado).toContain('### Carteira SDC — Situação Atual')
    expect(summary.resumoSDCFormatado).toContain('**3 itens exigem atenção**')
    expect(summary.resumoSDCFormatado).toContain('🔴 1 crítico sem programação')
    expect(summary.resumoSDCFormatado).toContain('🟠 1 cobertura parcial')
    expect(summary.resumoSDCFormatado).toContain('🔵 1 déficit com cobertura programada')
    expect(summary.resumoSDCFormatado).toContain('**Maior risco**: Material C1000A360600')
    expect(summary.resumoSDCFormatado).toContain('Carteira: 26,00 t, Estoque: 6,84 t, Saldo atual: -19,16 t, Programado: 0,00 t')
    expect(summary.resumoSDCFormatado).toContain('**Ação necessária**: Avaliar programação/industrialização para cobertura de 19,16 t.')
  })
})
