import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CarteiraSDCView } from '@/components/carteira-views/CarteiraSDCView'
import { CarteiraSDCService } from '@/services/carteira-sdc-service'
import { CarteiraSDCEngine } from '@/services/carteira-sdc-engine'
import { CarteiraSDCItem, CarteiraSDCKpis } from '@/types/carteira-sdc'

// Mock dos hooks de lote mínimo
vi.mock('@/hooks/use-sap-material-lote-minimo', () => ({
  useSapMaterialLoteMinimo: () => ({
    replicaMap: new Map(),
    isLoading: false,
    sincronizarLoteMinimoSap: vi.fn(),
  }),
}))

describe('Carteira SDC — Indicadores Estoque Remessa e Estoque Armazenado Ciafal (Cenários 1 a 5)', () => {
  const mockItens: CarteiraSDCItem[] = [
    {
      material: 'C1000A360600',
      descricao: 'Cantoneira Abas Iguais 1" x 1/8" ASTM A36',
      carteira_t: 26.0,
      estoque_total_t: 6.84,
      saldo_t: -19.16,
      programado_t: 0,
      em_producao_t: 0,
      saldo_projetado_t: -19.16,
      cobertura_pct: 26.3,
      status: 'DÉFICIT',
      situacao_producao: 'Sem programação',
      origem_producao: 'Sidercentro',
      centro_sap: 'SDPL',
      empresa: 'Sidercentro',
    },
  ]

  const mockKpisBase: CarteiraSDCKpis = {
    carteira_total_t: 26.0,
    estoque_total_t: 6.84,
    deficit_atual_t: 19.16,
    itens_com_deficit_count: 1,
    em_producao_total_t: 0,
    itens_cobertura_programada_count: 0,
    itens_criticos_count: 0,
    total_itens: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Cenário 1: SAP retorna estoque -> card mostra valor (ex.: 25,40 t e 38,75 t)
  it('Cenário 1: SAP retorna estoque com sucesso -> card exibe valor formatado em toneladas no padrão pt-BR', () => {
    const kpisComEstoque: CarteiraSDCKpis = {
      ...mockKpisBase,
      estoque_remessa_cfpl: {
        quantidade_t: 25.4,
        unidade_original: 't',
        centro: 'CFPL',
        status: 'SUCESSO',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
      estoque_armazenado_ciafal: {
        quantidade_t: 38.75,
        unidade_original: 't',
        centro: '1100',
        status: 'SUCESSO',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
    }

    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={kpisComEstoque}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    // Verifica card ESTOQUE REMESSA
    const cardRemessa = screen.getByTestId('card-estoque-remessa')
    expect(cardRemessa).toBeInTheDocument()
    expect(cardRemessa).toHaveTextContent('ESTOQUE REMESSA')
    expect(cardRemessa).toHaveTextContent('25,400')
    expect(cardRemessa).toHaveTextContent('Centro SAP: CFPL')

    // Verifica card ESTOQUE ARMAZENADO CIAFAL
    const cardArmazenado = screen.getByTestId('card-estoque-armazenado-ciafal')
    expect(cardArmazenado).toBeInTheDocument()
    expect(cardArmazenado).toHaveTextContent('ESTOQUE ARMAZENADO CIAFAL')
    expect(cardArmazenado).toHaveTextContent('38,750')
    expect(cardArmazenado).toHaveTextContent('Fonte: SAP ECC • RFC')
  })

  // Cenário 2: estoque zero -> 0,00 t sem alerta de erro
  it('Cenário 2: estoque zero retornado pela RFC -> exibe 0,00 t sem alerta de erro de indisponibilidade', () => {
    const kpisZero: CarteiraSDCKpis = {
      ...mockKpisBase,
      estoque_remessa_cfpl: {
        quantidade_t: 0,
        unidade_original: 't',
        centro: 'CFPL',
        status: 'SUCESSO',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
      estoque_armazenado_ciafal: {
        quantidade_t: 0,
        unidade_original: 't',
        centro: '1100',
        status: 'SUCESSO',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
    }

    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={kpisZero}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const cardRemessa = screen.getByTestId('card-estoque-remessa')
    expect(cardRemessa).toHaveTextContent('0,000')
    expect(cardRemessa).not.toHaveTextContent('Dados SAP indisponíveis')

    const cardArmazenado = screen.getByTestId('card-estoque-armazenado-ciafal')
    expect(cardArmazenado).toHaveTextContent('0,000')
    expect(cardArmazenado).not.toHaveTextContent('Dados SAP indisponíveis')
  })

  // Cenário 3: SAP/RFC indisponível -> 'Dados SAP indisponíveis' e NUNCA 0,00 t
  it('Cenário 3: SAP/RFC indisponível -> exibe "Dados SAP indisponíveis" e nunca 0,00 t', () => {
    const kpisIndisponivel: CarteiraSDCKpis = {
      ...mockKpisBase,
      estoque_remessa_cfpl: {
        quantidade_t: null,
        unidade_original: 't',
        centro: 'CFPL',
        status: 'INDISPONIVEL',
        mensagem_erro: 'Não foi possível atualizar este indicador através da integração SAP/RFC.',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
      estoque_armazenado_ciafal: {
        quantidade_t: null,
        unidade_original: 't',
        centro: '1100',
        status: 'INDISPONIVEL',
        mensagem_erro: 'Não foi possível atualizar este indicador através da integração SAP/RFC.',
        timestamp: new Date().toISOString(),
        origem: 'SAP ECC',
        fonte_rfc: 'SAP ECC • RFC',
      },
    }

    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={kpisIndisponivel}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
      />,
    )

    const cardRemessa = screen.getByTestId('card-estoque-remessa')
    expect(cardRemessa).toHaveTextContent('Dados SAP indisponíveis')
    expect(cardRemessa).not.toHaveTextContent('0,000')

    const cardArmazenado = screen.getByTestId('card-estoque-armazenado-ciafal')
    expect(cardArmazenado).toHaveTextContent('Dados SAP indisponíveis')
    expect(cardArmazenado).not.toHaveTextContent('0,000')
  })

  // Cenário 4: Atualizar SAP dispara callback de sincronização
  it('Cenário 4: clicar "Atualizar SAP" aciona o callback que atualiza ambos os indicadores', async () => {
    const onAtualizarSapSpy = vi.fn()
    render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpisBase}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
        onAtualizarSap={onAtualizarSapSpy}
      />,
    )

    const botaoAtualizar = screen.getByText('Atualizar SAP')
    fireEvent.click(botaoAtualizar)

    expect(onAtualizarSapSpy).toHaveBeenCalledTimes(1)
  })

  // Cenário 5: Verificação de isolamento de cálculos e grid
  it('Cenário 5: não altera o cálculo do Estoque Total SDPL nem de déficit, e suporta loading/skeleton', () => {
    // 1. Testa que o cálculo base do CarteiraSDCEngine permanece idêntico
    const kpis = CarteiraSDCEngine.calcularKpis(mockItens)
    expect(kpis.estoque_total_t).toBe(6.84)
    expect(kpis.deficit_atual_t).toBe(19.16)
    expect(kpis.itens_com_deficit_count).toBe(1)

    // 2. Testa renderização de loading
    const { container } = render(
      <CarteiraSDCView
        itens={mockItens}
        kpis={mockKpisBase}
        dataAtualizacao={new Date().toISOString()}
        analisesIA={[]}
        isLoading={true}
      />,
    )

    // Deve exibir skeletons nos cards
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // Verificação de conversão de unidades e IA
  it('Normalização de unidades: converte kg para t e mantém t direto sem alteração', () => {
    expect(CarteiraSDCService.normalizarQuantidadeToneladas(25400, 'kg')).toBe(25.4)
    expect(CarteiraSDCService.normalizarQuantidadeToneladas(25.4, 't')).toBe(25.4)
    expect(CarteiraSDCService.normalizarQuantidadeToneladas(null, 't')).toBeNull()
  })

  it('Análises IA: inclui contextualização dos estoques sem recalcular déficit', () => {
    const analises = CarteiraSDCEngine.gerarAnalisesIA(mockItens, {
      estoqueRemessaCfpl: { quantidade_t: 25.4, status: 'SUCESSO' },
      estoqueArmazenadoCiafal: { quantidade_t: 38.75, status: 'SUCESSO' },
    })

    const achouRemessa = analises.some((a) =>
      a.includes(
        'Existem 25,40 t em remessa no centro CFPL. Este volume não está sendo considerado como estoque disponível no cálculo atual de déficit.',
      ),
    )
    expect(achouRemessa).toBe(true)

    const achouArmazenado = analises.some((a) =>
      a.includes('Estoque Armazenado Ciafal: 38,75 t registradas na operação SDC via SAP RFC.'),
    )
    expect(achouArmazenado).toBe(true)
  })
})
