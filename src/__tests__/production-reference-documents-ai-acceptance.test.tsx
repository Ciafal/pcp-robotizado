import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { PCPSidebar } from '@/components/layout/PCPNavigation'
import { AuthContext, AuthContextType } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import ProductionReferenceDocumentsPage from '@/pages/production-control/ProductionReferenceDocumentsPage'
import ProductionPostingsPage from '@/pages/production-control/ProductionPostingsPage'
import ProductionAIAnalysisPage from '@/pages/production-control/ProductionAIAnalysisPage'
import CogiPendenciesPage from '@/pages/production-control/CogiPendenciesPage'
import Co1pPendenciesPage from '@/pages/production-control/Co1pPendenciesPage'
import { ProposedAiActionSection } from '@/components/production-control/ProposedAiActionSection'
import { productionControlReferenceDocsService } from '@/services/production-control-reference-docs-service'
import { pb as namedPb, default as defaultPb } from '@/lib/pocketbase/client'

// Mocks dos serviços para estabilidade dos testes
vi.mock('@/services/pcp-production-service', async () => {
  const actual = await vi.importActual<any>('@/services/pcp-production-service')
  return {
    ...actual,
    pcpProductionService: {
      ...actual.pcpProductionService,
      checkMESConnection: vi.fn().mockResolvedValue({
        status: 'ONLINE',
        lastHeartbeat: new Date().toISOString(),
        pendingBufferCount: 0,
        syncLatencyMs: 38,
      }),
      listOrders: vi.fn().mockResolvedValue([
        {
          id: 'ord-101',
          op_number: '10008891',
          material_code: 'MAT-101',
          material_description: 'Barra Redonda 1045 Laminada',
          centro_code: '1100',
          linha_code: 'L01',
          status_sap: 'ERRO_INTEGRACAO',
          status_mes: 'EM_PROCESSO',
          criticality: 'CRITICA',
          quantity_produced_tons: 25.5,
          quantity_posted_tons: 10.0,
          ai_risk_reason: 'Divergência de apontamento apontada pelo sistema',
        },
      ]),
      listPostings: vi.fn().mockResolvedValue([
        {
          id: 'post-101',
          op_number: '10008891',
          posting_code: 'APT-001',
          material_code: 'MAT-101',
          material_description: 'Barra Redonda 1045 Laminada',
          centro_code: '1100',
          linha_code: 'L01',
          operation_code: 'LAM-01',
          quantity_tons: 15.5,
          operator_name: 'Carlos Operador',
          data_origin: 'MES',
          status_mes: 'CONCLUIDO',
          status_sap: 'REJEITADO_SAP',
          sap_message: 'M7 021 - Saldo insuficiente para baixa do componente',
          posting_date: new Date().toISOString(),
          posting_time: '14:30',
        },
      ]),
      getOrderEvents: vi.fn().mockResolvedValue([]),
      requestAIAnalysis: vi.fn().mockResolvedValue({ content: 'Parecer gerado com sucesso.' }),
    },
  }
})

function renderWithAuth(ui: React.ReactElement, initialRoute = '/pcp/cockpit') {
  const perms = authService.getPermissionsForRole('PCP_PROGRAMMER')
  const permSet = new Set(perms)

  const authValue: AuthContextType = {
    user: {
      id: 'test-user-id',
      name: 'Usuário Teste Qualidade PCP',
      email: 'programador@ciafal.com.br',
      role: 'PCP_PROGRAMMER' as any,
    },
    isAuthenticated: true,
    isLoading: false,
    authError: null,
    isGlobal: false,
    scopes: [],
    delegations: [],
    permissions: perms.map((key) => ({
      key,
      name: key,
      category: 'TEST',
      is_critical: false,
      source: 'ROLE' as const,
    })),
    permissionKeys: permSet,
    activeScopeFilter: 'ALL',
    setActiveScopeFilter: vi.fn(),
    can: (perm: string) => permSet.has(perm),
    canAny: (permsArr: string[]) => permsArr.some((p) => permSet.has(p)),
    canAll: (permsArr: string[]) => permsArr.every((p) => permSet.has(p)),
    hasLineScope: () => true,
    loginWithCorporateAD: vi.fn(),
    switchUserSimulated: vi.fn(),
    logout: vi.fn(),
    refreshPermissions: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Documentos de Referência + Ação Proposta por IA — Full Acceptance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Contrato da exportação PB
  it('1. Contrato PocketBase: exportação nomeada pb e default existem e são idênticas', () => {
    expect(namedPb).toBeDefined()
    expect(defaultPb).toBeDefined()
    expect(namedPb).toBe(defaultPb)
  })

  // 2. Navegação pelo menu oficial
  it('2. Menu oficial: item "Documentos de Referência" aparece em CONTROLE DE PRODUÇÃO e navega para /pcp/controle-producao/documentos-referencia', async () => {
    renderWithAuth(
      <div className="flex">
        <PCPSidebar />
        <div data-testid="route-content">
          <Routes>
            <Route
              path="/pcp/controle-producao/documentos-referencia"
              element={<ProductionReferenceDocumentsPage />}
            />
          </Routes>
        </div>
      </div>,
      '/pcp/cockpit',
    )

    const groupHeader = screen.getByTestId('nav-group-header-CONTROLE DE PRODUÇÃO')
    expect(groupHeader).toBeInTheDocument()
    fireEvent.click(groupHeader)

    const docMenuItem = screen.getByText('Documentos de Referência')
    expect(docMenuItem).toBeInTheDocument()
    const link = docMenuItem.closest('a')
    expect(link).toHaveAttribute('href', '/pcp/controle-producao/documentos-referencia')

    fireEvent.click(docMenuItem)
    await waitFor(() => {
      expect(
        screen.getByText('Documentos de Referência — Controle de Produção'),
      ).toBeInTheDocument()
    })
  })

  // 3. Acesso direto via URL / F5
  it('3. URL Direta / F5: carregar /pcp/controle-producao/documentos-referencia renderiza cabeçalho oficial e botões de ação', async () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/pcp/controle-producao/documentos-referencia"
          element={<ProductionReferenceDocumentsPage />}
        />
      </Routes>,
      '/pcp/controle-producao/documentos-referencia',
    )

    await waitFor(() => {
      expect(
        screen.getByText('Documentos de Referência — Controle de Produção'),
      ).toBeInTheDocument()
    })

    // Botões principais
    expect(screen.getByRole('button', { name: /Atualizar SGQ/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Adicionar Documento de Referência/i }),
    ).toBeInTheDocument()

    // Regra inegociável de rastreabilidade
    expect(
      screen.getByText(/Remover uma associação NUNCA exclui o documento original do SGQ/i),
    ).toBeInTheDocument()
  })

  // 4. Modal de Associação em 4 etapas
  it('4. Modal de Associação: abre ao clicar em [ + Adicionar Documento de Referência ] e valida estrutura', async () => {
    renderWithAuth(
      <Routes>
        <Route
          path="/pcp/controle-producao/documentos-referencia"
          element={<ProductionReferenceDocumentsPage />}
        />
      </Routes>,
      '/pcp/controle-producao/documentos-referencia',
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Adicionar Documento de Referência/i }),
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Documento de Referência/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Associar Documento Oficial do SGQ ao Controle de Produção'),
      ).toBeInTheDocument()
      expect(screen.getByText(/1. Documento SGQ/i)).toBeInTheDocument()
      expect(screen.getByText(/2. Aplicação/i)).toBeInTheDocument()
      expect(screen.getByText(/3. Critérios/i)).toBeInTheDocument()
      expect(screen.getByText(/4. Governança/i)).toBeInTheDocument()
    })
  })

  // 5. Motor de consulta getDocumentsForOrder e filtro de status vigentes
  it('5. Motor getDocumentsForOrder: retorna apenas documentos ativos e VIGENTES, nunca obsoletos', async () => {
    const docs = await productionControlReferenceDocsService.getDocumentsForOrder({
      op_number: '10008891',
      centro_code: '1100',
    })

    expect(Array.isArray(docs)).toBe(true)
    for (const d of docs) {
      expect(d.status).toBe('VIGENTE')
      expect(d.active).toBe(true)
    }
  })

  // 6. Componente ProposedAiActionSection com as 6 seções e badges obrigatórios
  it('6. ProposedAiActionSection: renderiza as 6 seções e badges obrigatórios (FATO IDENTIFICADO / HIPÓTESE IA / ORIENTAÇÃO DOCUMENTADA)', async () => {
    renderWithAuth(
      <ProposedAiActionSection
        context={{
          occurrence_id: 'test-cogi-001',
          occurrence_type: 'COGI',
          op_number: '10008891',
          material_code: 'MAT-101',
          centro_code: '1100',
          sap_msg_code: 'M7 021',
          sap_message: 'Saldo insuficiente para a retirada no depósito 0001.',
          categoria_ia: 'Estoque',
          criticality: 'CRITICA',
        }}
        onOpenReferenceDocuments={vi.fn()}
      />,
    )

    // Badges conceituais obrigatórios
    await waitFor(() => {
      expect(screen.getByText('FATO IDENTIFICADO')).toBeInTheDocument()
      expect(screen.getByText('HIPÓTESE IA')).toBeInTheDocument()
      expect(screen.getByText('ORIENTAÇÃO DOCUMENTADA')).toBeInTheDocument()
    })

    // 6 Seções estruturais
    expect(screen.getByText(/1\. Problema Identificado/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. Classificação & Criticidade/i)).toBeInTheDocument()
    expect(screen.getByText(/3\. Evidências do MES & SAP/i)).toBeInTheDocument()
    expect(screen.getByText(/4\. Ação Operacional Proposta/i)).toBeInTheDocument()
    expect(screen.getByText(/5\. Área Sugerida para Atuação/i)).toBeInTheDocument()
    expect(screen.getByText(/6\. Documento Oficial SGQ Utilizado/i)).toBeInTheDocument()

    // Botão de abrir documento
    expect(screen.getByRole('button', { name: /Abrir Documento/i })).toBeInTheDocument()
  })

  // 7. Cenário SEM documento SGQ associado: aviso e botão de solicitação
  it('7. ProposedAiActionSection (cenário sem documento SGQ): exibe alerta padrão e botão [ Solicitar associação de Documento ]', async () => {
    // Força serviço a retornar lista vazia de documentos de referência
    vi.spyOn(productionControlReferenceDocsService, 'listReferenceDocuments').mockResolvedValue([])

    renderWithAuth(
      <ProposedAiActionSection
        context={{
          occurrence_id: 'test-empty-001',
          occurrence_type: 'ORDEM',
          op_number: '99999999',
          material_code: 'MAT-SEM-DOC',
          sap_message: 'Mensagem sem procedimento associado cadastrado no SGQ.',
        }}
        onOpenReferenceDocuments={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Referência oficial não localizada/i)).toBeInTheDocument()
      expect(
        screen.getByText(/Esta análise não substitui procedimento oficial da CIAFAL\./i),
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Solicitar associação de Documento/i }),
      ).toBeInTheDocument()
    })
  })

  // 8. Integração na tela Apontamentos (/pcp/controle-producao/apontamentos)
  it('8. Tela Apontamentos: exibe botão "Analisar com IA" quando houver inconsistência/rejeição e abre modal', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/pcp/controle-producao/apontamentos" element={<ProductionPostingsPage />} />
      </Routes>,
      '/pcp/controle-producao/apontamentos',
    )

    await waitFor(() => {
      const aiButtons = screen.getAllByRole('button', { name: /Analisar com IA/i })
      expect(aiButtons.length).toBeGreaterThan(0)
    })

    // Clica no primeiro botão Analisar com IA
    const aiButton = screen.getAllByRole('button', { name: /Analisar com IA/i })[0]
    fireEvent.click(aiButton)

    await waitFor(() => {
      expect(screen.getByText('Ação Proposta por IA — Apontamento de Produção')).toBeInTheDocument()
    })
  })

  // 9. Integração na tela Análise de Ordens (/pcp/controle-producao/analise)
  it('9. Tela Análise de Ordens: exibe seções "Documentos Aplicáveis (SGQ Oficial)" e "Ação Proposta por IA & Governança da Ordem"', async () => {
    renderWithAuth(
      <Routes>
        <Route path="/pcp/controle-producao/analise" element={<ProductionAIAnalysisPage />} />
      </Routes>,
      '/pcp/controle-producao/analise',
    )

    await waitFor(() => {
      expect(screen.getByText('Documentos Aplicáveis (SGQ Oficial)')).toBeInTheDocument()
      expect(screen.getByText('Ação Proposta por IA & Governança da Ordem')).toBeInTheDocument()
    })
  })

  // 10. Integração nas telas de Pendências COGI e CO1P com coluna de ações
  it('10. Telas COGI e CO1P: exibem ações "Ação IA", "Similares" e "Detalhar"', async () => {
    // 10.1 COGI
    const { unmount: u1 } = renderWithAuth(
      <Routes>
        <Route path="/pcp/controle-producao/cogi" element={<CogiPendenciesPage />} />
      </Routes>,
      '/pcp/controle-producao/cogi',
    )

    await waitFor(() => {
      expect(screen.getByText('Pendências no SAP — Transação COGI')).toBeInTheDocument()
      const acaoIaBtns = screen.getAllByRole('button', { name: /Ação IA/i })
      expect(acaoIaBtns.length).toBeGreaterThan(0)
      const similaresBtns = screen.getAllByRole('button', { name: /Similares/i })
      expect(similaresBtns.length).toBeGreaterThan(0)
      const detalharBtns = screen.getAllByRole('button', { name: /Detalhar/i })
      expect(detalharBtns.length).toBeGreaterThan(0)
    })
    u1()

    // 10.2 CO1P
    const { unmount: u2 } = renderWithAuth(
      <Routes>
        <Route path="/pcp/controle-producao/co1p" element={<Co1pPendenciesPage />} />
      </Routes>,
      '/pcp/controle-producao/co1p',
    )

    await waitFor(() => {
      expect(screen.getByText('Confirmações Pré-Gravadas — Transação CO1P')).toBeInTheDocument()
      const acaoIaBtnsCo1p = screen.getAllByRole('button', { name: /Ação IA/i })
      expect(acaoIaBtnsCo1p.length).toBeGreaterThan(0)
    })
    u2()
  })
})
