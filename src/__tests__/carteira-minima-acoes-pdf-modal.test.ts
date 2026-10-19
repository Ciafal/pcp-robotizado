import { describe, it, expect, vi, beforeEach } from 'vitest'
import { carteiraMinimaAcoesService } from '@/services/carteira-minima-acoes-service'
import {
  CarteiraMinimaItem,
  CarteiraMinimaFilterParams,
  CarteiraMinimaTotalizadores,
} from '@/types/carteira-minima'
import { pb } from '@/lib/pocketbase/client'

const mockItem: CarteiraMinimaItem = {
  id: 'cm_teste_01',
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
}

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

describe('Ações do CarteiraMinimaPdfModal: Envio por E-mail, Pendência no HUB e Auditoria', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Teste 1: Envio para 1 destinatário
  it('deve realizar fluxo de envio por e-mail para 1 destinatário com agendamento real sem SMTP', async () => {
    const res = await carteiraMinimaAcoesService.enviarRelatorioPorEmail({
      recipients: [{ id: 'usr_01', name: 'Paula Comercial', email: 'paula@ciafal.com.br' }],
      subject: 'PCP Robotizado | Carteira Mínima Não Atingida | 19/10/2026',
      message: 'Mensagem de teste',
      pdfFileName: 'PCP_Carteira_Minima_Nao_Atingida_19102026_1430.pdf',
      summaryImageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...',
      filtersSnapshot: mockFiltros,
      itemsCount: 1,
      totalizersSnapshot: mockTotalizadores,
      itens: [mockItem],
    })

    expect(res.success).toBe(true)
    expect(res.recipientsCount).toBe(1)
    expect(res.smtpConfigured).toBe(false)
    expect(res.status).toBe('AGENDADO_DESPACHO_PENDENTE_SMTP')
    expect(res.message).toContain('SMTP')
  })

  // Teste 2: Envio para múltiplos destinatários
  it('deve permitir envio por e-mail para múltiplos destinatários', async () => {
    const res = await carteiraMinimaAcoesService.enviarRelatorioPorEmail({
      recipients: [
        { id: 'usr_01', name: 'Paula Comercial', email: 'paula@ciafal.com.br' },
        { id: 'usr_02', name: 'Carlos Vendas', email: 'carlos@ciafal.com.br' },
        { id: 'usr_03', name: 'Eduardo Diretoria', email: 'eduardo@ciafal.com.br' },
      ],
      subject: 'PCP Robotizado | Carteira Mínima Não Atingida | Multi',
      message: 'Mensagem multi',
      pdfFileName: 'PCP_Carteira_Minima_Nao_Atingida_19102026_1435.pdf',
      filtersSnapshot: mockFiltros,
      itemsCount: 1,
      totalizersSnapshot: mockTotalizadores,
      itens: [mockItem],
    })

    expect(res.success).toBe(true)
    expect(res.recipientsCount).toBe(3)
  })

  // Teste 3: Tentativa sem destinatário (erro amigável)
  it('deve rejeitar envio sem destinatário com mensagem amigável', async () => {
    await expect(
      carteiraMinimaAcoesService.enviarRelatorioPorEmail({
        recipients: [],
        subject: 'Assunto teste',
        message: 'Mensagem',
        pdfFileName: 'relatorio.pdf',
        filtersSnapshot: mockFiltros,
        itemsCount: 1,
        totalizersSnapshot: mockTotalizadores,
        itens: [mockItem],
      }),
    ).rejects.toThrow('Selecione pelo menos um destinatário corporativo.')
  })

  // Teste 4: Tentativa sem assunto
  it('deve rejeitar envio sem assunto', async () => {
    await expect(
      carteiraMinimaAcoesService.enviarRelatorioPorEmail({
        recipients: [{ id: 'usr_01', name: 'Paula', email: 'paula@ciafal.com.br' }],
        subject: '   ',
        message: 'Mensagem',
        pdfFileName: 'relatorio.pdf',
        filtersSnapshot: mockFiltros,
        itemsCount: 1,
        totalizersSnapshot: mockTotalizadores,
        itens: [mockItem],
      }),
    ).rejects.toThrow('O assunto do e-mail é obrigatório.')
  })

  // Teste 5: Criação de pendência para 1 responsável no Meu Dia
  it('deve criar pendência para 1 responsável no Meu Dia com snapshot e vínculo', async () => {
    const res = await carteiraMinimaAcoesService.criarPendenciaNoMeuDia({
      responsaveis: [{ id: 'usr_resp_01', name: 'Gestor L1', email: 'gestor.l1@ciafal.com.br' }],
      titulo: 'Analisar Carteira Mínima Não Atingida',
      descricao:
        'Avaliar os materiais relacionados, estoque disponível e necessidade de programação.',
      prioridade: 'Alta',
      prazo: '2026-10-25',
      origem: 'PCP Robotizado',
      modulo: 'Análise de Carteira',
      tipo: 'Carteira Mínima Não Atingida',
      origemRelatorio: 'PCP Robotizado → Análise de Carteira → Carteira mínima não atingida',
      filtersSnapshot: mockFiltros,
      itemsCount: 1,
      totalizersSnapshot: mockTotalizadores,
      pdfFileName: 'PCP_Carteira_Minima_Nao_Atingida_19102026_1440.pdf',
      itens: [mockItem],
    })

    expect(res.success).toBe(true)
    expect(res.createdCount).toBe(1)
    expect(res.meuDiaIds.length).toBe(1)
    expect(res.message).toContain('Pendência PCP criada com sucesso')
  })

  // Teste 6: Criação de pendência para múltiplos responsáveis (1 card por responsável)
  it('deve criar cards individuais para múltiplos responsáveis no Meu Dia', async () => {
    const res = await carteiraMinimaAcoesService.criarPendenciaNoMeuDia({
      responsaveis: [
        { id: 'usr_resp_01', name: 'Gestor L1', email: 'gestor.l1@ciafal.com.br' },
        { id: 'usr_resp_02', name: 'Analista PCP', email: 'analista.pcp@ciafal.com.br' },
      ],
      titulo: 'Analisar Carteira Mínima Não Atingida',
      descricao: 'Avaliar itens',
      prioridade: 'Crítica',
      prazo: '2026-10-22',
      origem: 'PCP Robotizado',
      modulo: 'Análise de Carteira',
      tipo: 'Carteira Mínima Não Atingida',
      origemRelatorio: 'PCP Robotizado → Análise de Carteira → Carteira mínima não atingida',
      filtersSnapshot: mockFiltros,
      itemsCount: 1,
      totalizersSnapshot: mockTotalizadores,
      itens: [mockItem],
    })

    expect(res.success).toBe(true)
    expect(res.createdCount).toBe(2)
    expect(res.meuDiaIds.length).toBe(2)
  })

  // Teste 7: Tentativa sem responsável na pendência
  it('deve rejeitar criação de pendência sem responsável', async () => {
    await expect(
      carteiraMinimaAcoesService.criarPendenciaNoMeuDia({
        responsaveis: [],
        titulo: 'Analisar',
        descricao: 'Desc',
        prioridade: 'Alta',
        prazo: '2026-10-25',
        origem: 'PCP Robotizado',
        modulo: 'Análise de Carteira',
        tipo: 'Carteira Mínima Não Atingida',
        origemRelatorio: 'PCP Robotizado',
        filtersSnapshot: mockFiltros,
        itemsCount: 1,
        totalizersSnapshot: mockTotalizadores,
        itens: [mockItem],
      }),
    ).rejects.toThrow('Selecione pelo menos um responsável pela análise.')
  })

  // Teste 8: Atualização de status e conclusão no Meu Dia
  it('deve atualizar status e registrar conclusão da pendência com auditoria', async () => {
    const atualizado = await carteiraMinimaAcoesService.atualizarStatusMeuDia({
      pendenciaId: 'pendencia_teste_123',
      novoStatus: 'Concluída',
      usuarioNome: 'Gestor de Produção',
      usuarioId: 'usr_gestor',
      observacao: 'Programação de lote alinhada com Comercial.',
    })

    expect(atualizado).toBe(true)
  })

  // Teste 9: Listagem do histórico unificado
  it('deve listar registros de histórico com tipagem e auditoria', async () => {
    const hist = await carteiraMinimaAcoesService.listarHistoricoEnvios()
    expect(Array.isArray(hist)).toBe(true)
  })
})
