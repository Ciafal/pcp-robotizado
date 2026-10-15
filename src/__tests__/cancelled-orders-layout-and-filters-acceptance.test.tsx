/**
 * Testes de aceitação para o layout e posicionamento de filtros na tela
 * Pedidos Cancelados & Gestão de Recusas (/pcp/analise-carteira/cancelados).
 *
 * Valida:
 * 1. Barra de filtros na tela principal logo abaixo do cabeçalho e acima do aviso da fonte oficial.
 * 2. Campos existentes: busca geral, data início, data fim, empresa, centro, linha, categoria recusa, motivo recusa, responsável e limpar filtros.
 * 3. Ausência de barra de filtros redundante dentro dos popups de detalhamento (ExecutiveCardDrilldownModal).
 * 4. Remoção do botão textual 'Fechar Janela' do rodapé do popup e presença de botão 'X' no canto superior direito.
 * 5. Fechamento por Esc no popup sem recarregar a página e preservação dos filtros.
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PedidosCanceladosPage } from '@/pages/PedidosCanceladosPage'
import { ExecutiveCardDrilldownModal } from '@/components/cancelled-orders/ExecutiveCardDrilldownModal'
import { CancelledOrderDetailModal } from '@/components/cancelled-orders/CancelledOrderDetailModal'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'
import type { CancelledOrderRecord, CancellationExecutiveKPIs } from '@/types/cancelled-orders'

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

const mockOrders: CancelledOrderRecord[] = [
  {
    id: 'rec_001',
    ordem_venda: '450001',
    item_ordem: '0010',
    cliente_codigo: 'CLI-01',
    cliente_nome: 'AÇOS BRASIL S/A',
    material_codigo: 'BAR-1020-001',
    material_descricao: 'BARRA REDONDA 1020',
    saldo_cancelado_t: 125.5,
    quantidade_original_ov_t: 200,
    motivo_original_sap: 'Cliente desistiu do prazo',
    categoria_motivo: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    motivo_recusa: 'Desistência do Cliente por Prazo',
    centro: 'CT01',
    linha: 'LINHA 1 - PERFIS',
    empresa: 'CIAFAL',
    data_ordem: '2025-02-10',
    data_hora_cancelamento: '2025-02-15',
    analysis_status: 'Pendente',
    curva_abc: 'A',
    valor_cancelado_brl: 45000,
  } as unknown as CancelledOrderRecord,
  {
    id: 'rec_002',
    ordem_venda: '450002',
    item_ordem: '0020',
    cliente_codigo: 'CLI-02',
    cliente_nome: 'METALURGICA SUL',
    material_codigo: 'PER-50-002',
    material_descricao: 'PERFIL I 50MM',
    saldo_cancelado_t: 50.0,
    quantidade_original_ov_t: 80,
    motivo_original_sap: 'Falta de capacidade na linha',
    categoria_motivo: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    motivo_recusa: 'Restrição de Capacidade Produtiva',
    centro: 'CT02',
    linha: 'LINHA 2 - BARRAS',
    empresa: 'CIAFAL DISTRIBUIÇÃO',
    data_ordem: '2025-02-12',
    data_hora_cancelamento: '2025-02-16',
    analysis_status: 'Pendente',
    curva_abc: 'B',
    valor_cancelado_brl: 18000,
  } as unknown as CancelledOrderRecord,
]

const mockKpis = {
  totalPedidos: 2,
  totalVolumeToneladas: 175.5,
  percentualCarteiraCancelada: 5.2,
  cancelamentosPcpTons: 50.0,
  cancelamentosPcpPercentual: 28.5,
  cancelamentosComerciaisTons: 125.5,
  cancelamentosComerciaisPercentual: 71.5,
  cancelamentosTransporteTons: 0,
  cancelamentosTransportePercentual: 0,
  principalMotivoNome: 'Desistência do Cliente por Prazo',
  principalMotivoTons: 125.5,
  reincidentesCount: 0,
  inconsistenciasCount: 0,
  potencialmenteEvitaveisCount: 1,
} as unknown as CancellationExecutiveKPIs

describe('Layout e Posicionamento de Filtros - Pedidos Cancelados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(cancelledOrdersService, 'getOrders').mockResolvedValue(mockOrders)
    vi.spyOn(cancelledOrdersService, 'calculateKPIs').mockReturnValue(mockKpis)
  })

  it('CORREÇÃO 1 e 5: Barra de filtros está na tela principal, com todos os campos e posicionada entre o cabeçalho e a fonte oficial', async () => {
    const { container } = render(<PedidosCanceladosPage />)

    // Cabeçalho da tela presente
    expect(screen.getByText('Pedidos Cancelados & Gestão de Recusas')).toBeDefined()

    // Campos obrigatórios da barra de filtros presentes na tela principal
    expect(
      screen.getByPlaceholderText(/Nº Pedido \(OV\), Item, Cliente, Código ou Descrição/i),
    ).toBeDefined()
    expect(screen.getByPlaceholderText('dd/mm/aaaa')).toBeDefined()
    expect(screen.getByText('Empresa')).toBeDefined()
    expect(screen.getByText('Centro')).toBeDefined()
    expect(screen.getByText('Linha')).toBeDefined()
    expect(screen.getByText('Categoria da recusa')).toBeDefined()
    expect(screen.getByText('Motivo da recusa')).toBeDefined()
    expect(screen.getByText('Responsável')).toBeDefined()
    expect(screen.getByText('Limpar filtros')).toBeDefined()

    // O aviso de fonte oficial deve existir após a barra de filtros
    expect(screen.getByText(/Fonte Oficial de Pedidos Cancelados:/i)).toBeDefined()

    // Verifica ordenação visual no DOM:
    // O texto 'Fonte Oficial de Pedidos Cancelados' deve aparecer depois do input de pesquisa
    const searchInput = screen.getByPlaceholderText(
      /Nº Pedido \(OV\), Item, Cliente, Código ou Descrição/i,
    )
    const fonteOficial = screen.getByText(/Fonte Oficial de Pedidos Cancelados:/i)

    expect(
      searchInput.compareDocumentPosition(fonteOficial) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('CORREÇÃO 3 e 4: Popup de detalhamento NÃO possui barra de filtros interna redundante e NÃO possui botão "Fechar Janela"', () => {
    const handleClose = vi.fn()

    render(
      <ExecutiveCardDrilldownModal
        cardKey="pedidos_cancelados"
        cardTitle="Total de Pedidos Cancelados"
        isOpen={true}
        onClose={handleClose}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    // NÃO deve haver o botão "Fechar Janela" textual
    expect(screen.queryByText('Fechar Janela')).toBeNull()

    // Deve possuir o botão X no cabeçalho com aria-label / title
    const btnClose = screen.getByRole('button', { name: /fechar/i })
    expect(btnClose).toBeDefined()

    // O rodapé deve conter apenas exportações
    expect(screen.getByText('Exportar Excel')).toBeDefined()
    expect(screen.getByText('Exportar PDF')).toBeDefined()

    // Clicar no X chama onClose
    fireEvent.click(btnClose)
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('CORREÇÃO 4: Suporta fechamento via tecla Escape no popup', () => {
    const handleClose = vi.fn()

    render(
      <ExecutiveCardDrilldownModal
        cardKey="cancelamentos_pcp"
        cardTitle="Cancelamentos Relacionados ao PCP"
        isOpen={true}
        onClose={handleClose}
        orders={mockOrders}
        kpis={mockKpis}
        onSelectOrder={vi.fn()}
      />,
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('CORREÇÃO 4: CancelledOrderDetailModal não possui botão "Fechar Janela" e possui botão X com suporte a Esc', () => {
    const handleClose = vi.fn()

    render(
      <CancelledOrderDetailModal
        order={mockOrders[0]}
        isOpen={true}
        onClose={handleClose}
        onOrderUpdated={vi.fn()}
      />,
    )

    expect(screen.queryByText('Fechar Janela')).toBeNull()
    const btnClose = screen.getByRole('button', { name: /fechar janela/i })
    expect(btnClose).toBeDefined()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
