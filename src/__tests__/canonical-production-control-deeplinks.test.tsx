import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '@/App'

// Mock dos serviços de backend para isolar testes de roteamento
vi.mock('@/services/pcp-production-service', async () => {
  const actual = await vi.importActual<any>('@/services/pcp-production-service')
  return {
    ...actual,
    pcpProductionService: {
      ...actual.pcpProductionService,
      checkMESConnection: vi.fn().mockResolvedValue({
        available: true,
        lastChecked: new Date().toISOString(),
        message: 'Conectado ao MES 4.0',
        source: 'MES_40_INTEGRATED',
        activeLinesWithRealtime: ['L1', 'L2'],
      }),
      listOrders: vi.fn().mockResolvedValue([]),
      listPostings: vi.fn().mockResolvedValue([]),
      listPendencies: vi.fn().mockResolvedValue([]),
      listStops: vi.fn().mockResolvedValue([]),
      getOrderEvents: vi.fn().mockResolvedValue([]),
      requestAIAnalysis: vi.fn().mockResolvedValue({ content: 'Parecer gerado com sucesso.' }),
    },
  }
})

describe('Deep Link e Navegação Canônica — Controle de Produção (/pcp/controle-producao/*)', () => {
  // Teste 1: Rota principal Torre de Controle
  it('1. Deep link direto em /pcp/controle-producao abre Torre de Controle da Produção', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Torre de Controle da Produção')).toBeInTheDocument()
    })

    // Garante que o 404 NÃO foi renderizado
    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()
    expect(screen.queryByText('Retornar à Central de Sequenciamento')).toBeNull()

    // Sidebar: submenu CONTROLE DE PRODUÇÃO deve estar visível
    expect(screen.getByText('Controle de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Apontamentos')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    expect(screen.getByText('Análise de Ordens')).toBeInTheDocument()
  })

  // Teste 2: Rota de Ordens de Produção
  it('2. Deep link direto em /pcp/controle-producao/ordens abre tela de Ordens e destaca item ativo', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/ordens')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Controle de Ordens de Produção (MES x SAP ECC)')).toBeInTheDocument()
    })

    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()

    // O item ativo no menu deve ter classe de destaque
    const linkOrdens = screen.getByText('Controle de Ordens de Produção').closest('a')
    expect(linkOrdens).toHaveAttribute('href', '/pcp/controle-producao/ordens')
    expect(linkOrdens).toHaveClass('text-[#004C97]')
    expect(linkOrdens).toHaveClass('border-[#004C97]')
  })

  // Teste 3: Rota com parâmetro :opId
  it('3. Deep link direto em /pcp/controle-producao/ordens/4500012345 abre tela de Ordens com opId sem 404', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/ordens/4500012345')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Controle de Ordens de Produção (MES x SAP ECC)')).toBeInTheDocument()
    })

    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()
  })

  // Teste 4: Rota de Apontamentos
  it('4. Deep link direto em /pcp/controle-producao/apontamentos abre tela de Apontamentos e destaca item ativo', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/apontamentos')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Apontamentos de Produção')).toBeInTheDocument()
    })

    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()

    const linkApontamentos = screen.getByText('Apontamentos').closest('a')
    expect(linkApontamentos).toHaveAttribute('href', '/pcp/controle-producao/apontamentos')
    expect(linkApontamentos).toHaveClass('text-[#004C97]')
  })

  // Teste 5: Rota de Histórico
  it('5. Deep link direto em /pcp/controle-producao/historico abre tela de Histórico e destaca item ativo', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/historico')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Histórico de Ordens de Produção')).toBeInTheDocument()
    })

    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()

    const linkHistorico = screen.getByText('Histórico de Ordens de Produção').closest('a')
    expect(linkHistorico).toHaveAttribute('href', '/pcp/controle-producao/historico')
    expect(linkHistorico).toHaveClass('text-[#004C97]')
  })

  // Teste 6: Rota de Análise
  it('6. Deep link direto em /pcp/controle-producao/analise abre tela de Análise IA e destaca item ativo', async () => {
    window.history.pushState({}, 'Test', '/pcp/controle-producao/analise')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Análise de Ordens com Inteligência Artificial')).toBeInTheDocument()
    })

    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()

    const linkAnalise = screen.getByText('Análise de Ordens').closest('a')
    expect(linkAnalise).toHaveAttribute('href', '/pcp/controle-producao/analise')
    expect(linkAnalise).toHaveClass('text-[#004C97]')
  })

  // Teste 7: Redirects legados funcionam e redirecionam para /pcp/controle-producao/*
  it('7. Acesso à rota legada /pcp/producao/ordens é redirecionado para /pcp/controle-producao/ordens', async () => {
    window.history.pushState({}, 'Test', '/pcp/producao/ordens')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Controle de Ordens de Produção (MES x SAP ECC)')).toBeInTheDocument()
    })

    expect(window.location.pathname).toBe('/pcp/controle-producao/ordens')
    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()
  })

  // Teste 8: Redirect legado de /pcp/producao/ia-analises -> /pcp/controle-producao/analise
  it('8. Acesso à rota legada /pcp/producao/ia-analises é redirecionado para /pcp/controle-producao/analise', async () => {
    window.history.pushState({}, 'Test', '/pcp/producao/ia-analises')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Análise de Ordens com Inteligência Artificial')).toBeInTheDocument()
    })

    expect(window.location.pathname).toBe('/pcp/controle-producao/analise')
    expect(screen.queryByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeNull()
  })

  // Teste 9: Tela 404 agora contém os botões atualizados para Controle de Produção e Cockpit
  it('9. Rota inexistente exibe tela 404 com links para Controle de Produção e Cockpit', async () => {
    window.history.pushState({}, 'Test', '/rota-totalmente-inexistente-12345')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Módulo ou Recurso não localizado no HUB CIAFAL')).toBeInTheDocument()
    })

    const linkControle = screen.getByRole('link', { name: /Voltar ao Controle de Produção/i })
    expect(linkControle).toHaveAttribute('href', '/pcp/controle-producao')

    const linkCockpit = screen.getByRole('link', { name: /Voltar ao PCP Robotizado/i })
    expect(linkCockpit).toHaveAttribute('href', '/pcp/cockpit')

    expect(screen.queryByText('Retornar à Central de Sequenciamento')).toBeNull()
  })
})
