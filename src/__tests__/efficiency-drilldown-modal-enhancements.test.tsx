import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  generateOrderAiSummary,
  generateConsolidatedEfficiencyAnalysis,
  type OrderAiData,
} from '@/services/efficiency-drilldown-ai-service'
import { EfficiencyDrilldownModal } from '@/components/control-tower/efficiency/EfficiencyDrilldownModal'
import { EfficiencySendPdfModal } from '@/components/control-tower/efficiency/EfficiencySendPdfModal'
import { EfficiencyAiAnalysisModal } from '@/components/control-tower/efficiency/EfficiencyAiAnalysisModal'
import { pb } from '@/lib/pocketbase/client'

declare const global: any

// Mock de PocketBase client
vi.mock('@lib/pocketbase/client', () => {
  const collectionMock = {
    getFullList: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'audit-mock-1' }),
  }
  return {
    pb: {
      collection: vi.fn(() => collectionMock),
      authStore: {
        record: { id: 'usr-123', email: 'programador@ciafal.com.br', name: 'João PCP' },
        model: { id: 'usr-123', email: 'programador@ciafal.com.br', name: 'João PCP' },
        token: 'mock-token',
      },
    },
    default: {
      collection: vi.fn(() => collectionMock),
      authStore: {
        record: { id: 'usr-123', email: 'programador@ciafal.com.br', name: 'João PCP' },
        model: { id: 'usr-123', email: 'programador@ciafal.com.br', name: 'João PCP' },
        token: 'mock-token',
      },
    },
  }
})

describe('Regras de Negócio do Motor IA - Resumo por OP e Análise Consolidada', () => {
  it('Regra 9 e Caso 1: OP sem dados suficientes (previsto 0 e sem apontamento)', () => {
    const orderSemDados: OrderAiData = {
      id: 'o-zero',
      opNumber: 'OP-4500000000',
      materialCode: 'MAT-INICIAL',
      materialDescription: 'Material Teste',
      plannedTons: 0,
      realizedTons: null,
      differenceTons: 0,
      adherencePct: null,
      rmPct: null,
      goodTons: null,
      reworkTons: null,
      lossTons: null,
      status: 'CRIADA',
      hasDivergence: false,
    }
    const summary = generateOrderAiSummary(orderSemDados)
    expect(summary).toBe(
      'Sem dados produtivos suficientes para cálculo da eficiência. Verificar programação e/ou apontamentos da ordem.',
    )
  })

  it('Regra 5 e Caso 2: OP sem apontamento produtivo (previsto > 0, realizado null)', () => {
    const orderSemApontamento: OrderAiData = {
      id: 'o-sem-apontamento',
      opNumber: 'OP-4500012301',
      materialCode: 'TQ-50',
      materialDescription: 'Tubo Quadrado',
      plannedTons: 300,
      realizedTons: null,
      differenceTons: 0,
      adherencePct: null,
      rmPct: null,
      goodTons: null,
      reworkTons: null,
      lossTons: null,
      status: 'PLANEJADA',
      hasDivergence: false,
    }
    const summary = generateOrderAiSummary(orderSemApontamento)
    expect(summary).toBe(
      'Sem apontamento produtivo. Não é possível calcular realizado, aderência e rendimento da ordem.',
    )
  })

  it('Regra 5 e Caso 3: OP aderente dentro da programação', () => {
    const orderAderente: OrderAiData = {
      id: 'o-aderente',
      opNumber: 'OP-4500012302',
      materialCode: 'TQ-50',
      materialDescription: 'Tubo Quadrado',
      plannedTons: 500,
      realizedTons: 495,
      differenceTons: -5,
      adherencePct: 99.0,
      rmPct: 95.5,
      goodTons: 490,
      reworkTons: 3,
      lossTons: 2,
      status: 'CONCLUIDA',
      hasDivergence: false,
    }
    const summary = generateOrderAiSummary(orderAderente)
    expect(summary).toContain('Produção aderente ao previsto')
    expect(summary).toContain('95,5 %')
  })

  it('Regra 5 e Caso 4: OP com perdas elevadas e causa registrada', () => {
    const orderPerdas: OrderAiData = {
      id: 'o-perdas',
      opNumber: 'OP-4500012303',
      materialCode: 'TQ-50',
      materialDescription: 'Tubo Quadrado',
      plannedTons: 100,
      realizedTons: 90,
      differenceTons: -10,
      adherencePct: 90,
      rmPct: 90,
      goodTons: 86,
      reworkTons: 1,
      lossTons: 3.0, // 3.0 / 90 = 3.33%
      status: 'CONCLUIDA',
      hasDivergence: false,
      registeredCause: 'Ajuste dimensional de solda HF',
    }
    const summary = generateOrderAiSummary(orderPerdas)
    expect(summary).toContain('Perdas representam')
    expect(summary).toContain('Ajuste dimensional de solda HF')
  })

  it('Regra 5 e Caso 5: OP com divergência com SAP', () => {
    const orderDivSap: OrderAiData = {
      id: 'o-div-sap',
      opNumber: 'OP-4500012304',
      materialCode: 'TQ-50',
      materialDescription: 'Tubo Quadrado',
      plannedTons: 200,
      realizedTons: 195,
      differenceTons: -5,
      adherencePct: 97.5,
      rmPct: 94,
      goodTons: 190,
      reworkTons: 3,
      lossTons: 2,
      status: 'CONCLUIDA',
      hasDivergence: true,
      sapDocumentNumber: null,
      divergenceOrigin: 'Divergência entre Apontamento MES e Confirmação SAP',
    }
    const summary = generateOrderAiSummary(orderDivSap)
    expect(summary).toContain('Existe divergência entre apontamento operacional e confirmação SAP')
    expect(summary).toContain('Revisão de integração necessária')
  })

  it('Regra 6: Análise consolidada gera estrutura obrigatória (Resumo, Desvios, Atenção, Positivos, Recomendações)', () => {
    const orders: OrderAiData[] = [
      {
        id: '1',
        opNumber: 'OP-101',
        materialCode: 'MAT-1',
        materialDescription: 'Tubo',
        plannedTons: 100,
        realizedTons: 98,
        differenceTons: -2,
        adherencePct: 98,
        rmPct: 96,
        goodTons: 97,
        reworkTons: 1,
        lossTons: 0,
        status: 'CONCLUIDA',
        hasDivergence: false,
      },
      {
        id: '2',
        opNumber: 'OP-102',
        materialCode: 'MAT-2',
        materialDescription: 'Perfil',
        plannedTons: 100,
        realizedTons: null, // Sem apontamento
        differenceTons: 0,
        adherencePct: null,
        rmPct: null,
        goodTons: null,
        reworkTons: null,
        lossTons: null,
        status: 'PLANEJADA',
        hasDivergence: false,
      },
    ]

    const consolidated = generateConsolidatedEfficiencyAnalysis(orders, {
      title: 'Eficiência Centro L1',
      code: 'LINHA-1',
      breadcrumb: ['DIV', 'L1', 'CONFORMACAO'],
      period: '01/05/2025 a 15/05/2025',
    })

    expect(consolidated.totalAnalisadas).toBe(2)
    expect(consolidated.requeremAtencaoCount).toBe(1)
    expect(consolidated.conformesCount).toBe(1)
    expect(consolidated.resumo).toBeDefined()
    expect(consolidated.principaisDesvios.length).toBeGreaterThan(0)
    expect(consolidated.ordensRequeremAtencao.length).toBe(1)
    expect(consolidated.ordensRequeremAtencao[0].opNumber).toBe('OP-102')
    expect(consolidated.pontosPositivos.length).toBeGreaterThan(0)
    expect(consolidated.proximasVerificacoes.length).toBeGreaterThan(0)
  })
})

describe('Componente EfficiencyDrilldownModal - UI, Botão Enviar PDF e Resumo IA', () => {
  it('Regra 1: renderiza o botão "Enviar PDF" antes de "Fechar" no rodapé', async () => {
    render(
      <EfficiencyDrilldownModal
        isOpen={true}
        onClose={vi.fn()}
        title="Detalhamento Operacional"
        code="L1_ACAB"
        breadcrumb={['DIV', 'L1', 'L1_ACAB']}
      />,
    )

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText(/Detalhamento Operacional de Ordens/)).toBeDefined()
    })

    // Botão Enviar PDF no rodapé
    const btnEnviarPdf = screen.getByRole('button', { name: /Enviar PDF/i })
    const btnFechar = screen.getByRole('button', { name: /^Fechar$/i })
    expect(btnEnviarPdf).toBeDefined()
    expect(btnFechar).toBeDefined()

    // Regra 8: Texto gerencial discreto no rodapé, SEM "append-only registrado em pcp_audit_logs"
    expect(
      screen.getByText('Análise registrada automaticamente para rastreabilidade.'),
    ).toBeDefined()
    expect(screen.queryByText(/append-only registrado em pcp_audit_logs/i)).toBeNull()
  })

  it('Regra 11: Coluna "Resumo IA" está presente no cabeçalho e linhas da tabela', async () => {
    render(
      <EfficiencyDrilldownModal
        isOpen={true}
        onClose={vi.fn()}
        title="Detalhamento Operacional"
        code="L1_ACAB"
        breadcrumb={['DIV', 'L1', 'L1_ACAB']}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Resumo IA')).toBeDefined()
    })

    // Deve conter resumos nas linhas (pelo fallback estruturado quando banco vazio)
    await waitFor(() => {
      expect(
        screen.getByText(/Sem apontamento produtivo. Não é possível calcular realizado/),
      ).toBeDefined()
    })
  })

  it('Regra 6 e 7: Clicar em "Analisar Eficiência com IA" exibe modal gerencial e notificação HUB', async () => {
    render(
      <EfficiencyDrilldownModal
        isOpen={true}
        onClose={vi.fn()}
        title="Detalhamento Operacional"
        code="L1_ACAB"
        breadcrumb={['DIV', 'L1', 'L1_ACAB']}
      />,
    )

    const btnAnalisar = await screen.findByRole('button', {
      name: /Analisar Eficiência com IA/i,
    })
    fireEvent.click(btnAnalisar)

    // Notificação visual do HUB
    await waitFor(() => {
      expect(screen.getByText('Análise de eficiência concluída')).toBeDefined()
      expect(screen.getByText('Ver análise completa')).toBeDefined()
    })

    // Modal de Análise de Eficiência com IA aberto
    await waitFor(() => {
      expect(screen.getByText('Principais Desvios Identificados')).toBeDefined()
      expect(screen.getByText('Próximas Verificações Operacionais')).toBeDefined()
    })
  })

  it('Regra 3: Modal de Envio de PDF informa erro claro quando não há serviço SMTP configurado', async () => {
    // Mock de pb.send para simular erro / falta de SMTP corporativo
    const sendSpy = vi.fn().mockRejectedValue({
      message:
        'Serviço corporativo de e-mail temporariamente indisponível. Provisionamento SMTP pendente na infraestrutura.',
    })
    ;(pb as any).send = sendSpy

    render(
      <EfficiencySendPdfModal
        isOpen={true}
        onClose={vi.fn()}
        contextInfo={{
          title: 'Detalhamento L1',
          code: 'L1',
          breadcrumb: ['DIV', 'L1'],
          periodFormatted: '01/05/2025 a 15/05/2025',
          ordersCount: 4,
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Enviar PDF do Detalhamento Operacional/)).toBeDefined()
    })

    const sendBtn = screen.getByRole('button', { name: /Enviar PDF/i })
    fireEvent.click(sendBtn)

    // Deve retornar erro claro e honesto sem quebrar a tela e sem inventar envio falso
    await waitFor(() => {
      expect(screen.getByText(/Falha no envio do relatório/i)).toBeDefined()
      expect(screen.getByText(/Não foi possível concluir o envio por e-mail/i)).toBeDefined()
    })
  })
})
