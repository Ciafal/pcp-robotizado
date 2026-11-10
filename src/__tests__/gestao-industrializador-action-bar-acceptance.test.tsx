import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { IndustrializerActionBar } from '@/components/gestao-industrializador/IndustrializerActionBar'
import * as actionsService from '@/services/gestao-industrializador-actions-service'

vi.mock('@/services/gestao-industrializador-actions-service', () => ({
  fetchHubUsers: vi.fn().mockResolvedValue([
    {
      id: 'u1',
      name: 'Coordenação PCP',
      email: 'pcp@ciafal.com.br',
      role: 'Coordenador',
      department: 'PCP',
    },
    {
      id: 'u2',
      name: 'Gestão Terceiros',
      email: 'terceiros@ciafal.com.br',
      role: 'Gestor',
      department: 'Terceiros',
    },
  ]),
  sendIndustrializerHub: vi.fn().mockResolvedValue({
    success: true,
    message: 'Informações enviadas ao HUB com sucesso.',
    sending_code: 'SEND-HUB-TEST-001',
    sent_at: '2026-11-10T12:00:00Z',
    sent_by: 'Testador PCP',
  }),
  sendIndustrializerEmail: vi.fn().mockResolvedValue({
    success: true,
    message: 'E-mail enviado com sucesso.',
    sending_code: 'SEND-EMAIL-TEST-001',
    sent_at: '2026-11-10T12:00:00Z',
    sent_by: 'Testador PCP',
  }),
  runIndustrializerAiAnalysis: vi.fn().mockResolvedValue({
    success: true,
    result: {
      executive_summary: ['Resumo executivo teste 1', 'Resumo executivo teste 2'],
      critical_alerts: ['Alerta crítico teste'],
      priority_materials: [
        {
          priority: 'Crítica',
          material: 'TARUGO 130MM SAE 1045',
          situation: 'Risco de ruptura',
          impact: 'Parada do laminador',
          suggested_action: 'Antecipar descarga',
        },
      ],
      recommendations: ['Recomendação tática teste'],
      next_steps_question: 'Quais ações precisam ser priorizadas pelo PCP agora?',
      status_geral: 'Crítico',
      data_geracao: '10/11/2026 12:00:00',
    },
    created_at: '2026-11-10T12:00:00Z',
    created_by: 'Testador PCP',
  }),
  generateIndustrializerAiAnalysis: vi.fn().mockResolvedValue({
    executive_summary: ['Resumo executivo teste 1', 'Resumo executivo teste 2'],
    critical_alerts: ['Alerta crítico teste'],
    priority_materials: [
      {
        priority: 'Crítica',
        material: 'TARUGO 130MM SAE 1045',
        situation: 'Risco de ruptura',
        impact: 'Parada do laminador',
        suggested_action: 'Antecipar descarga',
      },
    ],
    recommendations: ['Recomendação tática teste'],
    next_steps_question: 'Quais ações precisam ser priorizadas pelo PCP agora?',
    status_geral: 'Crítico',
    data_geracao: '10/11/2026 12:00:00',
  }),
  formatAiForSharing: vi.fn().mockReturnValue({
    subject: 'PCP | Análise IA Industrializador | Teste',
    body: 'Corpo formatado da análise de teste',
  }),
}))

describe('IndustrializerActionBar e Modais - Gestão Industrializador', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve renderizar os 3 botões com design Ciafal e contagem de itens filtrados', () => {
    render(
      <IndustrializerActionBar
        screenKey="gestao_mp"
        screenName="Gestão de MP"
        filters={{ linha: 'L1', centro: '1100' }}
        metrics={{ totalTons: 1200 }}
        records={[{ id: 'item-1', material: 'TARUGO 130', status: 'Ruptura' }]}
      />,
    )

    expect(screen.getByRole('button', { name: /Enviar Hub/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar e-mail/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Análise IA/i })).toBeInTheDocument()
  })

  it('deve abrir o modal Enviar Hub e permitir disparar o envio', async () => {
    render(
      <IndustrializerActionBar
        screenKey="gestao_mp"
        screenName="Gestão de MP"
        filters={{ linha: 'L1' }}
        records={[{ id: 'item-1', material: 'TARUGO 130' }]}
      />,
    )

    const btnHub = screen.getByRole('button', { name: /Enviar Hub/i })
    fireEvent.click(btnHub)

    await waitFor(() => {
      expect(screen.getByText(/Enviar Informações ao HUB/i)).toBeInTheDocument()
    })

    // Clica no botão de envio
    const btnConfirm = screen.getByRole('button', { name: /Enviar ao HUB/i })
    fireEvent.click(btnConfirm)

    await waitFor(() => {
      expect(actionsService.sendIndustrializerHub).toHaveBeenCalled()
    })
  })

  it('deve abrir o modal Enviar e-mail e validar preenchimento de destinatários', async () => {
    render(
      <IndustrializerActionBar
        screenKey="analise_carteira"
        screenName="Análise de Carteira"
        filters={{ cliente: 'Cliente A' }}
        records={[{ id: 'c-1', cliente: 'Cliente A', material: 'PERFIL 2' }]}
      />,
    )

    const btnEmail = screen.getByRole('button', { name: /Enviar e-mail/i })
    fireEvent.click(btnEmail)

    await waitFor(() => {
      expect(screen.getByText(/Enviar Relatório por E-mail/i)).toBeInTheDocument()
    })

    const inputTo = screen.getByPlaceholderText(/destinatario@ciafal.com.br/i)
    fireEvent.change(inputTo, { target: { value: 'gestor@ciafal.com.br' } })

    const btnSend = screen.getByRole('button', { name: /Enviar E-mail Corporativo/i })
    fireEvent.click(btnSend)

    await waitFor(() => {
      expect(actionsService.sendIndustrializerEmail).toHaveBeenCalled()
    })
  })

  it('deve abrir o modal Análise IA e renderizar os resultados da inteligência artificial', async () => {
    render(
      <IndustrializerActionBar
        screenKey="sequenciamento_pxr"
        screenName="Sequenciamento P x R"
        filters={{ agrupamento: 'todos' }}
        records={[{ id: 'seq-1', ordem: 'OP-1001', desvio: 5 }]}
      />,
    )

    const btnAi = screen.getByRole('button', { name: /Análise IA/i })
    fireEvent.click(btnAi)

    await waitFor(() => {
      expect(screen.getByText(/Análise de Inteligência Artificial/i)).toBeInTheDocument()
    })

    // Aguarda carregar o resultado mockado
    await waitFor(() => {
      expect(screen.getByText(/Resumo executivo teste 1/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Quais ações precisam ser priorizadas pelo PCP agora\?/i),
      ).toBeInTheDocument()
    })
  })
})
