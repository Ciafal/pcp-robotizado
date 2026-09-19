import { describe, it, expect } from 'vitest'
import {
  formatNumberPTBR,
  formatQuantity,
  formatPercentagePTBR,
  formatDatePTBR,
  formatDateTimePTBR,
  formatDateExtensoPTBR,
  formatCurrencyPTBR,
  parseNumberPTBR,
  parseDateSafe,
} from '@/lib/formatters-ptbr'
import { CarteiraAnaliseEngine } from '@/services/carteira-analise-engine-unified'
import { CarteiraItem } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'

describe('Formatadores Centralizados pt-BR', () => {
  it('formata números com vírgula para decimal e ponto para milhar', () => {
    expect(formatNumberPTBR(6.84)).toBe('6,84')
    expect(formatNumberPTBR(18)).toBe('18,00')
    expect(formatNumberPTBR(1250)).toBe('1.250,00')
    expect(formatNumberPTBR(180.5)).toBe('180,50')
    expect(formatNumberPTBR(66.3)).toBe('66,30')
    expect(formatNumberPTBR(12540.75)).toBe('12.540,75')
    expect(formatNumberPTBR(1250.5)).toBe('1.250,50')
    expect(formatNumberPTBR(15350.75)).toBe('15.350,75')
  })

  it('formata quantidades com unidade "t" ou "kg" correta conforme Casos Obrigatórios', () => {
    expect(formatQuantity(6.84, 't')).toBe('6,84 t')
    expect(formatQuantity(1250.5, 't')).toBe('1.250,50 t')
    expect(formatQuantity(15350.75, 'kg')).toBe('15.350,75 kg')
    expect(formatQuantity(12540.75, 'kg')).toBe('12.540,75 kg')
    expect(formatQuantity('180.5', 'Ton')).toBe('180,50 t')
    expect(formatQuantity(66.3, 'tons')).toBe('66,30 t')
  })

  it('formata percentuais no padrão brasileiro com 2 casas obrigatórias e suporte a frações', () => {
    expect(formatPercentagePTBR(91)).toBe('91,00 %')
    expect(formatPercentagePTBR(85.5)).toBe('85,50 %')
    expect(formatPercentagePTBR(0.91)).toBe('91,00 %')
    expect(formatPercentagePTBR(2)).toBe('2,00 %')
    expect(formatPercentagePTBR(5.5)).toBe('5,50 %')
    expect(formatPercentagePTBR(90)).toBe('90,00 %')
  })

  it('formata datas em DD/MM/AAAA e previne retrocesso de fuso', () => {
    expect(formatDatePTBR('2026-09-19')).toBe('19/09/2026')
    expect(formatDatePTBR('2026-12-31')).toBe('31/12/2026')
    const dt = new Date(2026, 8, 19)
    expect(formatDatePTBR(dt)).toBe('19/09/2026')
  })

  it('formata data e hora no padrão brasileiro de 24h sem AM/PM', () => {
    const dt = new Date(2026, 8, 19, 10, 27, 26)
    expect(formatDateTimePTBR(dt, true)).toBe('19/09/2026 10:27:26')
    expect(formatDateTimePTBR(dt, false)).toBe('19/09/2026 10:27')
    expect(formatDateTimePTBR('2026-09-19T15:03:00')).toBe('19/09/2026 15:03')
  })

  it('formata datas por extenso em português', () => {
    expect(formatDateExtensoPTBR('2026-09-19')).toBe('19 de setembro de 2026')
  })

  it('valida casos monetários obrigatórios e parsing de input com vírgula', () => {
    // 15250.5 -> R$ 15.250,50
    const currencyStr = formatCurrencyPTBR(15250.5)
    // normalizar espaços não separáveis que o Intl pode usar
    expect(currencyStr.replace(/\u00a0/g, ' ')).toBe('R$ 15.250,50')

    // Input "10,50" aceito, interpretado como 10.5 e formatado de volta
    const parsed = parseNumberPTBR('10,50')
    expect(parsed).toBe(10.5)
    expect(formatNumberPTBR(parsed)).toBe('10,50')
  })
})

describe('Motor Unificado de Carteira (CarteiraAnaliseEngine)', () => {
  const itemMockDeficit: CarteiraItem = {
    id: 'rec-1',
    empresa: 'CIAFAL',
    centro: '1100',
    codigo_material: 'C1000A360600',
    descricao_material: 'CANTONEIRA 1/2 X 1/8',
    familia: 'CANTONEIRA',
    linha: 'L1',
    tipo_ordem: 'MTS',
    origem_produto: 'PRODUCAO_PROPRIA',
    curva_abc: 'A',
    qtd_ordem_tons: 26.0,
    qtd_faturada_tons: 0,
    carteira_aberta_tons: 26.0,
    carteira_vendas_tons: 26.0,
    carteira_mto_tons: 0,
    estoque_livre_tons: 6.84,
    estoque_mto_tons: 0,
    estoque_semiacabado_tons: 0,
    estoque_acabado_tons: 6.84,
    saldo_disponivel_tons: 6.84,
    qtd_programada_tons: 0,
    falta_produzir_tons: 19.16,
    saldo_positivo_tons: 0,
    saldo_negativo_tons: -19.16,
    necessidade_liquida_tons: 19.16,
    status_atendimento: 'A_PRODUZIR',
    status_ruptura: 'VERMELHO',
    media_faturamento_diario_t_dia: 1.0,
    bloqueio: false,
    data_ordem: '2026-09-01',
    data_desejada: '2026-09-25',
    ordem_venda: '45001234',
    item_ordem: '000010',
    codigo_cliente: 'CLI001',
    nome_cliente: 'CLIENTE TESTE',
  }

  it('analisa Carteira L1 e gera alerta de déficit correto em pt-BR', () => {
    const res = CarteiraAnaliseEngine.analisarCarteiraGenerica('L1', [itemMockDeficit])
    expect(res.indicadores.carteiraTotal_t).toBe(26)
    expect(res.indicadores.estoqueTotal_t).toBe(6.84)
    expect(res.indicadores.deficitAtual_t).toBe(19.16)
    expect(res.indicadores.itensComDeficit_count).toBe(1)
    expect(res.indicadores.itensSemProgramacao_count).toBe(1)

    expect(res.alertas.length).toBeGreaterThan(0)
    const alertaDeficit = res.alertas[0]
    expect(alertaDeficit.classificacao).toBe('CRITICO')
    expect(alertaDeficit.mensagem).toContain('19,16 t')
    expect(res.analisesIA[0]).toContain('carteira de 26,00 t e estoque disponível de 6,84 t')
  })

  it('analisa Carteira MTO com requisitos ou pendências específicas', () => {
    const itemMtoBloqueado: CarteiraItem = {
      ...itemMockDeficit,
      tipo_ordem: 'MTO',
      bloqueio: true,
      falta_produzir_tons: 26,
    }
    const res = CarteiraAnaliseEngine.analisarCarteiraGenerica('MTO', [itemMtoBloqueado])
    expect(res.alertas.some((a) => a.mensagem.includes('requisito necessário não atendido'))).toBe(
      true,
    )
  })

  it('analisa Carteira SDC e calcula indicadores e alertas determinísticos', () => {
    const itemSDC: CarteiraSDCItem = {
      material: 'SDC100',
      descricao: 'BARRA SDC',
      familia: 'BARRA',
      bitola: '1/2',
      qualidade_aco: '1020',
      curva_abc: 'A',
      origem_producao: 'Sidercentro',
      carteira_t: 50,
      centro_sap: 'SDPL',
      empresa: 'Sidercentro',
      estoque_total_t: 10,
      estoque_disponivel_t: 10,
      estoque_bloqueado_t: 0,
      saldo_t: -40,
      programado_t: 0,
      em_producao_t: 0,
      saldo_projetado_t: -40,
      cobertura_pct: 20,
      status: 'CRÍTICO',
      situacao_producao: 'Sem programação',
      data_desejada: '2026-09-30',
    }

    const res = CarteiraAnaliseEngine.analisarCarteiraSDC([itemSDC])
    expect(res.indicadores.carteiraTotal_t).toBe(50)
    expect(res.indicadores.estoqueTotal_t).toBe(10)
    expect(res.indicadores.deficitAtual_t).toBe(40)
    expect(res.indicadores.itensCriticos_count).toBe(1)
    expect(res.alertas[0].classificacao).toBe('CRITICO')
    expect(res.alertas[0].mensagem).toContain('déficit atual de 40,00 t')
  })
})
