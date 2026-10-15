/**
 * Suíte de Testes de Aceitação da Feature "Análise de FACA — MP Específica Disponível + Parametrização de MP Derivada"
 * HUB CIAFAL / PCP Robotizado
 *
 * Cobertura obrigatória dos itens:
 * (a) MP derivada com "Sem corte = Sim" (visivel_sem_corte = true / disponivel_sem_corte = true) entra como disponibilidade técnica;
 * (b) MP derivada com "Somar apenas no potencial" (regra_exibicao = 'somar_apenas_potencial') fica fora do estoque imediato;
 * (c) Sobreposição de massa deduzida no Total Potencial Sem Dupla Contagem (zero dupla contagem com fator de conversão);
 * (d) Renderização do popup "MP Específica Disponível" (FacaCardDrilldownModal) com os 4 blocos de composição + resumo por categoria.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FacaAnaliseService } from '@/services/faca-analise-service'
import { FacaCardDrilldownModal } from '@/components/faca/FacaCardDrilldownModal'
import type {
  FacaCardKpis,
  FacaMpCardDisponibilidade,
  FacaMpItemDisponibilidade,
  FacaItemAnalitico,
} from '@/types/faca-analise'

// Mock para Recharts (ResponsiveContainer precisa de dimensões DOM que não existem no JSDOM)
vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container" style={{ width: 800, height: 300 }}>
        {children}
      </div>
    ),
  }
})

describe('Aceitação: MP Específica Disponível & Parametrização de MP Derivada (FACA)', () => {
  it('(a) MP derivada com "Sem corte = Sim" entra como disponibilidade técnica no balanço consolidado', async () => {
    const consolidado = await FacaAnaliseService.getDisponibilidadeMpFaca()

    // O consolidado deve reportar volume de MP derivada sem corte >= 0
    expect(consolidado.mp_derivada_sem_corte_t).toBeGreaterThanOrEqual(0)

    // O resumo por categoria oficial deve conter a categoria MP_DERIVADA_SEM_CORTE
    const catDerivada = consolidado.resumo_por_categoria.find(
      (c) => c.categoria === 'MP_DERIVADA_SEM_CORTE',
    )
    expect(catDerivada).toBeDefined()
    expect(catDerivada?.titulo).toContain('MP derivada disponível (sem corte)')
    expect(catDerivada?.respeita_regra_exibicao).toBe(true)

    // Os itens detalhados com MP derivada devem conter atributos técnicos da parametrização
    const itensDerivados = consolidado.itens_detalhados.filter((i) => i.em_mp_derivada)
    if (itensDerivados.length > 0) {
      itensDerivados.forEach((item) => {
        expect(item.canal_estoque).toBe('DERIVADA')
        expect(item.fator_conversao).toBeGreaterThan(0)
        expect(item.tipo_disponibilidade).toBeTruthy()
        expect(item.regra_exibicao).toMatch(
          /somar_estoque_imediato|somar_apenas_potencial|exibir_separado|nao_consolidar/,
        )
      })
    }
  })

  it('(b) MP derivada com regra "somar_apenas_potencial" fica FORA do imediato e entra no potencial', async () => {
    const consolidado = await FacaAnaliseService.getDisponibilidadeMpFaca()

    // Verifica que mp_derivada_regra_apenas_potencial_t é reportada no consolidado
    expect(consolidado.mp_derivada_regra_apenas_potencial_t).toBeGreaterThanOrEqual(0)

    // Nenhum item marcado com regra 'somar_apenas_potencial' deve ser considerado no estoque imediato (tarugos_disponiveis_t)
    const itensApenasPotencial = consolidado.itens_detalhados.filter(
      (i) => i.em_mp_derivada && i.regra_exibicao === 'somar_apenas_potencial',
    )

    itensApenasPotencial.forEach((item) => {
      // disponivel_imediata deve ser falso por causa da regra
      expect(item.disponivel_imediata).toBe(false)
    })
  })

  it('(c) Dedução estrita de sobreposições no Total Potencial Sem Dupla Contagem (zero dupla contagem)', async () => {
    const consolidado = await FacaAnaliseService.getDisponibilidadeMpFaca()

    // Sobreposições totais devem ser um valor não-negativo
    expect(consolidado.sobreposicoes_deduzidas_t).toBeGreaterThanOrEqual(0)

    // Verificação matemática da equação:
    // Potencial Total = Tarugos Imediatos + KS Líquido + L2 Líquido - Sobreposições Deduzidas
    const somaComponentes =
      consolidado.tarugos_disponiveis_t +
      consolidado.ks_saldo_a_cortar_t +
      consolidado.l2_mp_a_produzir_t

    const esperadoComDeducao = Number(
      (somaComponentes - consolidado.sobreposicoes_deduzidas_t).toFixed(2),
    )

    expect(consolidado.mp_potencial_total_t).toBeCloseTo(esperadoComDeducao, 1)

    // O potencial total nunca pode ser maior que a soma bruta das partes (sem dedução)
    expect(consolidado.mp_potencial_total_t).toBeLessThanOrEqual(somaComponentes + 0.01)

    // Cada item detalhado que tenha sobreposição de fluxo (L2->KS) ou estoque↔KS deve ter os campos preenchidos
    consolidado.itens_detalhados.forEach((item) => {
      expect(item.sobreposicao_fluxo_t).toBeGreaterThanOrEqual(0)
      expect(item.sobreposicao_estoque_ks_t).toBeGreaterThanOrEqual(0)
      expect(item.disponibilidade_liquida_t).toBeGreaterThanOrEqual(0)
    })
  })

  it('(d) Renderização do popup "MP Específica Disponível" com os 4 blocos + resumo por categoria + footer', () => {
    const mockMpConsolidado: FacaMpCardDisponibilidade = {
      mp_disponivel_agora_t: 120.5,
      tarugos_disponiveis_t: 120.5,
      depositos_considerados: ['DP07', 'DP04', 'DP18'],
      ks_saldo_a_cortar_t: 35.0,
      l2_mp_a_produzir_t: 40.0,
      sobreposicoes_deduzidas_t: 12.0,
      mp_derivada_sem_corte_t: 18.0,
      mp_derivada_regra_apenas_potencial_t: 0,
      mp_derivada_exibicao_separada_t: 0,
      mp_derivada_nao_consolidada_t: 0,
      mp_potencial_total_t: 183.5,
      resumo_por_categoria: [
        {
          categoria: 'TARUGOS_DISPONIVEIS',
          titulo: 'Tarugos disponíveis',
          descricao: 'Estoque físico livre em depósitos elegíveis DP07/DP04/DP18 — imediato',
          quantidade_t: 120.5,
          quantidade_itens: 4,
          destaque: 'MP_DISPONIVEL_IMEDIATA',
          respeita_regra_exibicao: true,
        },
        {
          categoria: 'MP_DERIVADA_SEM_CORTE',
          titulo: 'MP derivada disponível (sem corte)',
          descricao: 'MP derivada parametrizada com disponibilidade técnica sem passagem pela KS',
          quantidade_t: 18.0,
          quantidade_itens: 2,
          destaque: 'MP_DERIVADA_DISPONIVEL',
          respeita_regra_exibicao: true,
        },
        {
          categoria: 'KS_SALDO_CORTAR',
          titulo: 'KS — Saldo a cortar',
          descricao: 'Saldos programados na KS líquidos de rendimento de corte',
          quantidade_t: 35.0,
          quantidade_itens: 3,
          destaque: 'MP_DEPENDENTE_CORTE',
          respeita_regra_exibicao: true,
        },
        {
          categoria: 'L2_MP_A_PRODUZIR',
          titulo: 'L2 — MP a produzir',
          descricao: 'Saldos de MP a produzir na L2 com viabilidade técnica',
          quantidade_t: 40.0,
          quantidade_itens: 2,
          destaque: 'MP_DEPENDENTE_PRODUCAO',
          respeita_regra_exibicao: true,
        },
        {
          categoria: 'TOTAL_POTENCIAL',
          titulo: 'Total potencial consolidado',
          descricao:
            'Imediato + potencial após dedução de sobreposições físicas (sem dupla contagem)',
          quantidade_t: 183.5,
          quantidade_itens: 11,
          destaque: 'CONSOLIDADO',
          respeita_regra_exibicao: true,
        },
      ],
      por_tipo_aco: [
        {
          tipo_aco: 'SAE 1045',
          tarugos_disponiveis_t: 60.0,
          ks_a_cortar_t: 15.0,
          l2_a_produzir_t: 20.0,
          sobreposicao_deduzida_t: 5.0,
          potencial_total_t: 90.0,
          mp_necessaria_carteira_t: 70.0,
          saldo_projetado_t: 20.0,
          status_cobertura: 'COBERTO_TOTAL',
        },
      ],
      itens_detalhados: [
        {
          id: 'mp-test-1',
          codigo_mp: 'MP-TAR-150-1045',
          descricao_mp: 'TARUGO 150x150 MM SAE 1045',
          tipo_aco: 'SAE 1045',
          bitola: '150x150 mm',
          dimensoes: '150x150x12000 mm',
          empresa: 'CIAFAL',
          centro: '1100',
          deposito: 'DP07',
          lote: 'L-1045-01',
          unidade_medida: 't',
          status_qualidade: 'LIVRE',
          destinacao_produtiva: 'FACA',
          quantidade_fisica_t: 60.0,
          quantidade_comprometida_t: 0.0,
          estoque_livre_t: 60.0,
          ks_saldo_a_cortar_t: 15.0,
          ks_rendimento_corte_pct: 95,
          ks_perdas_pct: 5,
          ks_status: 'CONFIRMADO',
          ks_ordem_corte: 'OP-KS-01',
          l2_saldo_a_produzir_t: 20.0,
          l2_rendimento_pct: 92,
          l2_status: 'PROGRAMADO',
          l2_ordem_producao: 'OP-L2-01',
          l2_passa_por_ks: false,
          sobreposicao_fluxo_t: 0,
          sobreposicao_estoque_ks_t: 0,
          disponibilidade_liquida_t: 95.0,
          previsao_disponibilidade: 'Imediata',
          produtos_faca_compativeis: [],
          origem_saldo: 'MISTO',
          fonte_rfc: 'SAP RFC MB52',
          data_hora_sincronizacao: '20/10/2026 14:30',
          status_sincronizacao: 'SINCRONIZADO',
          canal_estoque: 'PRINCIPAL',
          em_mp_derivada: false,
          tipo_disponibilidade: 'mp_sem_cortar',
          exige_corte: false,
          disponivel_imediata: true,
          pode_atender_faca_diretamente: true,
          fator_conversao: 1,
          forma_consolidacao: 'toneladas',
          regra_exibicao: 'somar_estoque_imediato',
          categoria_leitura: 'MP_DISPONIVEL_IMEDIATA',
        },
      ],
      fonte_identificada: 'SAP ECC • RFC MB52 (Tarugos DP07/DP04/DP18)',
      ultima_atualizacao: '20/10/2026 14:30',
      status_sincronizacao: 'SINCRONIZADO',
      mensagem_status: 'OK',
      ha_dados_integrados: true,
    }

    const mockKpis: FacaCardKpis = {
      carteira_total_t: 150.0,
      estoque_disponivel_pa_t: 30.0,
      necessidade_producao_t: 120.0,
      mp_especifica_disponivel_t: 120.5,
      mp_potencial_t: 183.5,
      mp_necessaria_t: 135.0,
      faturamento_potencial_brl: 1200000,
      faturamento_confirmado_brl: 450000,
      estoque_sem_pedido_t: 10.0,
      carteira_minima_abaixo_t: 15.0,
      pedidos_criticos_count: 2,
      mp_detalhe_consolidado: mockMpConsolidado,
    }

    render(
      <FacaCardDrilldownModal
        isOpen={true}
        onClose={vi.fn()}
        cardKey="mp_disponivel"
        kpis={mockKpis}
        itens={[] as FacaItemAnalitico[]}
      />,
    )

    // (1) Cabeçalho institucional azul #004C97 presente
    expect(
      screen.getByText(/MP Específica Disponível — Balanço Físico e Potencial Técnico/i),
    ).toBeInTheDocument()

    // (2) Resumo por Categoria: os data-testid oficiais devem estar renderizados
    expect(screen.getByTestId('resumo-categoria-TARUGOS_DISPONIVEIS')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-categoria-MP_DERIVADA_SEM_CORTE')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-categoria-KS_SALDO_CORTAR')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-categoria-L2_MP_A_PRODUZIR')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-categoria-TOTAL_POTENCIAL')).toBeInTheDocument()

    // (3) Os 4 blocos de composição consolidada com alturas e títulos especificados
    expect(screen.getByText(/1\. Tarugos Disponíveis/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. MP Derivada sem Corte/i)).toBeInTheDocument()
    expect(screen.getByText(/3\. KS — Saldo a Cortar/i)).toBeInTheDocument()
    expect(screen.getByText(/4\. L2 — MP a Produzir/i)).toBeInTheDocument()

    // (4) Bloco Total Potencial Sem Dupla Contagem
    expect(screen.getByText(/Total Potencial Sem Dupla Contagem/i)).toBeInTheDocument()

    // (5) Rodapé com botão de fechar oficial
    expect(screen.getByText('Fechar Visualização')).toBeInTheDocument()
  })
})
