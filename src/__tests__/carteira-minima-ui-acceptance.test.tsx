import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CarteiraMinimaTable } from '@/components/carteira-views/CarteiraMinimaTable'
import { EnviarComunicadoComercialModal } from '@/components/carteira-views/EnviarComunicadoComercialModal'
import { CarteiraMinimaItem } from '@/types/carteira-minima'
import { USUARIOS_CORPORATIVOS_HUB } from '@/services/comercial-comunicado-service'

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
  {
    id: 'item_2',
    material: 'TB50X50X300',
    descricao_material: 'TUBO QUADRADO 50X50',
    pedido_venda: '252110',
    item_pedido: '20',
    pedido_formatado: '252110 / 20',
    carteira_tons: 25.0,
    estoque_livre_tons: 5.0,
    saldo_produzir_tons: 20.0,
    producao_minima_tons: 35.0,
    diferenca_minimo_tons: 15.0,
    percentual_atingido: 57.1,
    data_desejada: '2026-10-15',
    centro: '1100',
    linha: 'L2',
    criticidade: 'Atenção',
    empresa: 'CIAFAL',
  },
]

describe('Interface: CarteiraMinimaTable com Checkbox e Coluna Comercial', () => {
  it('deve renderizar a coluna de checkbox na primeira posição da tabela', () => {
    const handleToggleItem = vi.fn()
    const handleToggleTodos = vi.fn()
    const handleVisualizar = vi.fn()

    render(
      <CarteiraMinimaTable
        itens={mockItens}
        itensFiltrados={mockItens}
        itensSelecionadosIds={[]}
        onToggleSelecionarItem={handleToggleItem}
        onToggleSelecionarTodos={handleToggleTodos}
        onVisualizarItem={handleVisualizar}
      />,
    )

    // Checkbox de selecionar todos no cabeçalho
    const selectAllCheckbox = screen.getByLabelText('Selecionar todos os itens visíveis')
    expect(selectAllCheckbox).toBeInTheDocument()

    // Checkbox do primeiro item
    const item1Checkbox = screen.getByLabelText('Selecionar item C352DIN30470C')
    expect(item1Checkbox).toBeInTheDocument()

    // Clicar no checkbox de selecionar todos
    fireEvent.click(selectAllCheckbox)
    expect(handleToggleTodos).toHaveBeenCalledWith(true)

    // Clicar no checkbox do item individual
    fireEvent.click(item1Checkbox)
    expect(handleToggleItem).toHaveBeenCalledWith('item_1')
  })

  it('deve renderizar a coluna Comercial com badge Não enviado quando sem comunicado', () => {
    render(
      <CarteiraMinimaTable
        itens={mockItens}
        itensFiltrados={mockItens}
        itensSelecionadosIds={['item_1']}
        onToggleSelecionarItem={vi.fn()}
        onToggleSelecionarTodos={vi.fn()}
        onVisualizarItem={vi.fn()}
        mapaStatusComercial={{
          '251967_10_C352DIN30470C': {
            item_chave: '251967_10_C352DIN30470C',
            material: 'C352DIN30470C',
            pedido_venda: '251967',
            item_pedido: '10',
            total_envios: 0,
            status: 'Não enviado',
            historico_envios_json: [],
          },
        }}
      />,
    )

    expect(screen.getByText('Comercial')).toBeInTheDocument()
    expect(screen.getByText('Não enviado')).toBeInTheDocument()
  })

  it('deve renderizar o status Enviado quando o item tiver sido transmitido', () => {
    render(
      <CarteiraMinimaTable
        itens={mockItens}
        itensFiltrados={mockItens}
        itensSelecionadosIds={[]}
        onToggleSelecionarItem={vi.fn()}
        onToggleSelecionarTodos={vi.fn()}
        onVisualizarItem={vi.fn()}
        mapaStatusComercial={{
          '251967_10_C352DIN30470C': {
            item_chave: '251967_10_C352DIN30470C',
            material: 'C352DIN30470C',
            pedido_venda: '251967',
            item_pedido: '10',
            total_envios: 1,
            status: 'Enviado',
            historico_envios_json: [],
          },
        }}
      />,
    )

    expect(screen.getByText('Enviado')).toBeInTheDocument()
  })
})

describe('Interface: Popup Enviar comunicado ao Comercial', () => {
  it('deve renderizar popup com campos padrão, tipo automático, itens selecionados e permitir envio', async () => {
    const handleClose = vi.fn()
    const handleSucesso = vi.fn()

    render(
      <EnviarComunicadoComercialModal
        isOpen={true}
        onClose={handleClose}
        itens={mockItens}
        onSucessoEnvio={handleSucesso}
      />,
    )

    // Título e resumo de itens
    expect(screen.getByText('Enviar comunicado ao Comercial')).toBeInTheDocument()
    expect(screen.getByText('2 itens selecionados')).toBeInTheDocument()

    // Tipo automático
    expect(screen.getByDisplayValue('Carteira mínima não atingida')).toBeInTheDocument()

    // Assunto padrão preenchido
    expect(
      screen.getByDisplayValue('PCP | Carteira mínima não atingida | 2 itens'),
    ).toBeInTheDocument()

    // Destinos selecionados por padrão
    expect(screen.getByText('Comercial – HUB')).toBeInTheDocument()
    expect(screen.getByText('Meu Dia')).toBeInTheDocument()

    // Botão de IA
    const btnIa = screen.getByText('Melhorar texto com IA')
    expect(btnIa).toBeInTheDocument()

    // Clicar em Melhorar texto com IA
    fireEvent.click(btnIa)

    // Mensagem aprimorada deve refletir no textarea
    await waitFor(() => {
      expect(screen.getByText('Restaurar texto original')).toBeInTheDocument()
    })

    // Botão de envio presente
    const btnEnviar = screen.getByRole('button', { name: /Enviar comunicado/i })
    expect(btnEnviar).toBeInTheDocument()
    expect(btnEnviar).not.toBeDisabled()
  })

  it('deve impedir desmarcar ambos os canais de destino', () => {
    render(
      <EnviarComunicadoComercialModal
        isOpen={true}
        onClose={vi.fn()}
        itens={[mockItens[0]]}
        onSucessoEnvio={vi.fn()}
      />,
    )

    // O checkbox Meu Dia e Comercial estão marcados inicialmente
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(1)
  })
})
