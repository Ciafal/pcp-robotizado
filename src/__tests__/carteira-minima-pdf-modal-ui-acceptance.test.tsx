import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CarteiraMinimaPdfModal } from '@/components/carteira-views/CarteiraMinimaPdfModal'
import { EnviarEmailCarteiraMinimaModal } from '@/components/carteira-views/EnviarEmailCarteiraMinimaModal'
import { CriarPendenciaCarteiraMinimaModal } from '@/components/carteira-views/CriarPendenciaCarteiraMinimaModal'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import { carteiraMinimaAcoesService } from '@/services/carteira-minima-acoes-service'

const mockItens: CarteiraMinimaItem[] = [
  {
    id: 'item_1',
    material: 'C352DIN30470C',
    descricao_material: 'BARRA CHATA 35X2 DIN 304',
    pedido_venda: '251967',
    item_pedido: '10',
    pedido_formatado: '251967 / 10',
    carteira_tons: 15.5,
    estoque_livre_tons: 5.683,
    saldo_produzir_tons: 9.817,
    producao_minima_tons: 30.0,
    diferenca_minimo_tons: 20.183,
    percentual_atingido: 32.7,
    data_desejada: '2026-09-30',
    centro: '1100',
    linha: 'L1',
    criticidade: 'Crítico',
    empresa: 'CIAFAL',
  },
]

const mockFiltros: CarteiraMinimaFilterParams = {
  empresa: 'CIAFAL',
  centro: '1100',
  linha: 'L1',
}

const mockTotalizadores: CarteiraMinimaTotalizadores = {
  total_itens_abaixo_minimo: 1,
  carteira_total_tons: 15.5,
  estoque_livre_total_tons: 5.683,
  saldo_total_produzir_tons: 9.817,
  pedidos_afetados_count: 1,
}

describe('UI: CarteiraMinimaPdfModal e Novos Modais de Ação', () => {
  it('deve renderizar os botões Enviar por e-mail, Enviar pendência no HUB, Histórico de envios e Imprimir no topo do modal', () => {
    render(
      <CarteiraMinimaPdfModal
        isOpen={true}
        onClose={vi.fn()}
        itens={mockItens}
        filtros={mockFiltros}
        totalizadores={mockTotalizadores}
      />,
    )

    expect(screen.getByRole('button', { name: /Enviar por e-mail/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar pendência no HUB/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Histórico de envios/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Imprimir \/ Salvar PDF/i })).toBeInTheDocument()
  })

  it('deve abrir modal secundário de e-mail ao clicar em Enviar por e-mail com assunto e mensagem padrão', async () => {
    vi.spyOn(carteiraMinimaAcoesService, 'listarUsuariosHub').mockResolvedValue([
      {
        id: 'usr_mock_1',
        name: 'Paula Guimarães',
        email: 'paula@ciafal.com.br',
        role: 'Comercial',
        sector: 'Comercial',
        grupo: 'Usuários HUB',
      },
    ])

    render(
      <CarteiraMinimaPdfModal
        isOpen={true}
        onClose={vi.fn()}
        itens={mockItens}
        filtros={mockFiltros}
        totalizadores={mockTotalizadores}
      />,
    )

    const btnEmail = screen.getByRole('button', { name: /Enviar por e-mail/i })
    fireEvent.click(btnEmail)

    await waitFor(() => {
      expect(screen.getByText('Enviar Relatório por E-mail')).toBeInTheDocument()
      expect(
        screen.getByText(/PCP Robotizado \| Carteira Mínima Não Atingida/i),
      ).toBeInTheDocument()
    })
  })

  it('deve abrir modal secundário de pendência ao clicar em Enviar pendência no HUB', async () => {
    vi.spyOn(carteiraMinimaAcoesService, 'listarUsuariosHub').mockResolvedValue([
      {
        id: 'usr_mock_2',
        name: 'Carlos PCP',
        email: 'carlos@ciafal.com.br',
        role: 'PCP',
        sector: 'PCP',
        grupo: 'Usuários HUB',
      },
    ])

    render(
      <CarteiraMinimaPdfModal
        isOpen={true}
        onClose={vi.fn()}
        itens={mockItens}
        filtros={mockFiltros}
        totalizadores={mockTotalizadores}
      />,
    )

    const btnPendencia = screen.getByRole('button', { name: /Enviar pendência no HUB/i })
    fireEvent.click(btnPendencia)

    await waitFor(() => {
      expect(screen.getByText(/Criar Pendência PCP • Meu Dia/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue('Analisar Carteira Mínima Não Atingida')).toBeInTheDocument()
    })
  })

  it('deve exibir confirmação de agendamento honesto sem SMTP ao enviar e-mail', async () => {
    vi.spyOn(carteiraMinimaAcoesService, 'listarUsuariosHub').mockResolvedValue([
      {
        id: 'usr_mock_1',
        name: 'Paula Guimarães',
        email: 'paula@ciafal.com.br',
        role: 'Comercial',
        sector: 'Comercial',
        grupo: 'Usuários HUB',
      },
    ])

    vi.spyOn(carteiraMinimaAcoesService, 'enviarRelatorioPorEmail').mockResolvedValue({
      success: true,
      status: 'AGENDADO_DESPACHO_PENDENTE_SMTP',
      message: 'Agendado para despacho — SMTP corporativo não configurado no servidor.',
      smtpConfigured: false,
      recipientsCount: 1,
    })

    render(
      <EnviarEmailCarteiraMinimaModal
        isOpen={true}
        onClose={vi.fn()}
        itens={mockItens}
        filtros={mockFiltros}
        totalizadores={mockTotalizadores}
        nomeArquivoPdf="PCP_Carteira_Minima_Nao_Atingida_19102026_1200.pdf"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Paula Guimarães')).toBeInTheDocument()
    })

    const btnRevisar = screen.getByRole('button', { name: /Revisar e Enviar/i })
    fireEvent.click(btnRevisar)

    await waitFor(() => {
      expect(screen.getByText('Confirmar Envio do Relatório')).toBeInTheDocument()
    })

    const btnConfirmar = screen.getByRole('button', { name: /Confirmar e Enviar e-mail/i })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(screen.getByText(/Agendado para despacho — SMTP não configurado/i)).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de sucesso ao criar pendência no Meu Dia', async () => {
    vi.spyOn(carteiraMinimaAcoesService, 'listarUsuariosHub').mockResolvedValue([
      {
        id: 'usr_mock_1',
        name: 'Paula Guimarães',
        email: 'paula@ciafal.com.br',
        role: 'Comercial',
        sector: 'Comercial',
        grupo: 'Usuários HUB',
      },
    ])

    vi.spyOn(carteiraMinimaAcoesService, 'criarPendenciaNoMeuDia').mockResolvedValue({
      success: true,
      message: 'Pendência PCP criada com sucesso e enviada para 1 usuários no Meu Dia.',
      createdCount: 1,
      meuDiaIds: ['id_123'],
    })

    render(
      <CriarPendenciaCarteiraMinimaModal
        isOpen={true}
        onClose={vi.fn()}
        itens={mockItens}
        filtros={mockFiltros}
        totalizadores={mockTotalizadores}
        nomeArquivoPdf="PCP_Carteira_Minima_Nao_Atingida_19102026_1200.pdf"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Paula Guimarães')).toBeInTheDocument()
    })

    const btnSalvar = screen.getByRole('button', { name: /Criar Pendência/i })
    fireEvent.click(btnSalvar)

    await waitFor(() => {
      expect(
        screen.getByText(/Pendência PCP criada com sucesso e enviada para 1 usuários no Meu Dia./i),
      ).toBeInTheDocument()
    })
  })
})
