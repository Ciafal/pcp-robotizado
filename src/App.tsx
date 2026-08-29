import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

// Loading Fallback visual discreto
const ModuleFallback = () => (
  <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
    <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-slate-400">Carregando módulo...</p>
  </div>
)

// Lazy load dos componentes e layouts
const Index = lazy(() => import('@/pages/Index'))
const CentralSequenciamentoLayout = lazy(() =>
  import('@/pages/CentralSequenciamentoLayout').then((m) => ({
    default: m.CentralSequenciamentoLayout,
  })),
)
const CentralSequenciamentoLandingPage = lazy(
  () => import('@/pages/CentralSequenciamentoLandingPage'),
)
const ControlTowerPage = lazy(() =>
  import('@/pages/ControlTowerPage').then((m) => ({ default: m.ControlTowerPage || m.default })),
)
const OperationalPage = lazy(() =>
  import('@/pages/OperationalPage').then((m) => ({ default: m.OperationalPage || m.default })),
)
const SequencingPage = lazy(() =>
  import('@/pages/SequencingPage').then((m) => ({ default: m.SequencingPage || m.default })),
)
const EfficiencyPage = lazy(() => import('@/pages/EfficiencyPage'))
const EfficiencyProductsSubpage = lazy(() => import('@/pages/EfficiencyProductsSubpage'))
const EfficiencyLinesSubpage = lazy(() => import('@/pages/EfficiencyLinesSubpage'))
const EfficiencyPlantsSubpage = lazy(() => import('@/pages/EfficiencyPlantsSubpage'))
const EfficiencyAssertivenessSubpage = lazy(() => import('@/pages/EfficiencyAssertivenessSubpage'))
const BacklogPage = lazy(() => import('@/pages/BacklogPage'))
const ScenariosPage = lazy(() =>
  import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage || m.default })),
)
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const InventoryManagementPage = lazy(() => import('@/pages/InventoryManagementPage'))
const ExecutiveCockpitPage = lazy(() => import('@/pages/ExecutiveCockpitPage'))
const PCPMeetingsPage = lazy(() => import('@/pages/PCPMeetingsPage'))
const PCPCommunicationsPage = lazy(() => import('@/pages/PCPCommunicationsPage'))
const PCPInboxPage = lazy(() => import('@/pages/PCPInboxPage'))
const LiveMeetingRoom = lazy(() =>
  import('@/components/meetings/LiveMeetingRoom').then((m) => ({ default: m.LiveMeetingRoom })),
)
const MeetingMinutesView = lazy(() =>
  import('@/components/meetings/MeetingMinutesView').then((m) => ({
    default: m.MeetingMinutesView,
  })),
)
const MeetingPendenciesView = lazy(() =>
  import('@/components/meetings/MeetingPendenciesView').then((m) => ({
    default: m.MeetingPendenciesView,
  })),
)

// Planejamento Mestre
const MasterPlanningLayout = lazy(() =>
  import('@/pages/MasterPlanningLayout').then((m) => ({ default: m.MasterPlanningLayout })),
)
const MasterPlanningSubpage = lazy(() => import('@/pages/MasterPlanningSubpage'))

// Gestão de Linhas & Mapa de Integração
const LineManagementLayout = lazy(() =>
  import('@/pages/LineManagementLayout').then((m) => ({ default: m.LineManagementLayout })),
)
const ProductionIntegrationMapPage = lazy(() => import('@/pages/ProductionIntegrationMapPage'))
const LineCapacitiesSubpage = lazy(() => import('@/pages/LineCapacitiesSubpage'))
const LineDependenciesSubpage = lazy(() => import('@/pages/LineDependenciesSubpage'))
const LineHistorySubpage = lazy(() => import('@/pages/LineHistorySubpage'))

// Módulos Auxiliares / Legado
const LineMasterPage = lazy(() => import('@/pages/LineMasterPage'))
const LineResponsiblesPage = lazy(() => import('@/pages/LineResponsiblesPage'))
const SchedulesPage = lazy(() => import('@/pages/SchedulesPage'))
const AuditPage = lazy(() => import('@/pages/AuditPage'))
const AccessAdminPage = lazy(() => import('@/pages/AccessAdminPage'))
const ProductQualityHubPage = lazy(() => import('@/pages/ProductQualityHubPage'))
const ModulePreparationPage = lazy(() =>
  import('@/pages/ModulePreparationPage').then((m) => ({
    default: m.ModulePreparationPage || m.default,
  })),
)
const NotFound = lazy(() => import('@/pages/NotFound'))

export const App: React.FC = () => {
  return (
    <ErrorBoundary moduleName="Aplicação Principal">
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<ModuleFallback />}>
            <Routes>
              <Route element={<Layout />}>
                {/* 1. Cockpit Executivo CIAFAL com IA & DWP / Meu Hub */}
                <Route
                  path="/pcp/cockpit-executivo"
                  element={
                    <PermissionGuard permission="pcp.executive.view">
                      <ExecutiveCockpitPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/dwp/meu-hub/cockpit-executivo"
                  element={<Navigate to="/pcp/cockpit-executivo" replace />}
                />
                <Route
                  path="/dwp/cockpit-executivo"
                  element={<Navigate to="/pcp/cockpit-executivo" replace />}
                />

                {/* Cockpit de Chão de Fábrica & Landing Raiz */}
                <Route path="/" element={<Index />} />
                <Route path="/pcp" element={<Navigate to="/pcp/sequenciamento" replace />} />
                <Route path="/pcp/cockpit" element={<Index />} />
                <Route path="/pcp-robotizado" element={<Navigate to="/" replace />} />
                <Route
                  path="/pcp-robotizado/cockpit"
                  element={<Navigate to="/pcp/cockpit" replace />}
                />

                {/* Gestão de Estoques SAP / PCP */}
                <Route
                  path="/pcp/estoques"
                  element={
                    <PermissionGuard permission="pcp.inventory.view">
                      <InventoryManagementPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp-robotizado/estoques"
                  element={<Navigate to="/pcp/estoques" replace />}
                />

                {/* 2. Central de Sequenciamento como Rota Pai com Nested Routes */}
                <Route
                  path="/pcp/sequenciamento"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <CentralSequenciamentoLayout />
                    </PermissionGuard>
                  }
                >
                  {/* Landing da Central */}
                  <Route index element={<CentralSequenciamentoLandingPage />} />
                  <Route path="torre-controle" element={<ControlTowerPage />} />
                  <Route path="operacional" element={<OperationalPage />} />
                  <Route
                    path="programacao"
                    element={
                      <PermissionGuard permission="pcp.schedule.edit">
                        <SequencingPage />
                      </PermissionGuard>
                    }
                  />

                  {/* Eficiência & Subrotas especializadas */}
                  <Route path="eficiencia" element={<EfficiencyPage />} />
                  <Route path="eficiencia/produtos" element={<EfficiencyProductsSubpage />} />
                  <Route path="eficiencia/linhas" element={<EfficiencyLinesSubpage />} />
                  <Route path="eficiencia/plantas" element={<EfficiencyPlantsSubpage />} />
                  <Route
                    path="eficiencia/assertividade"
                    element={<EfficiencyAssertivenessSubpage />}
                  />

                  {/* Carteira CRM / WMS */}
                  <Route path="carteira" element={<BacklogPage />} />

                  {/* Cenários & Simulações */}
                  <Route
                    path="cenarios"
                    element={
                      <PermissionGuard permission="pcp.schedule.simulate">
                        <ScenariosPage />
                      </PermissionGuard>
                    }
                  />

                  {/* Histórico & Trilha de Versões */}
                  <Route path="historico" element={<HistoryPage />} />
                </Route>

                {/* 3. Planejamento Mestre (S&OP / PMP) */}
                <Route
                  path="/pcp/planejamento"
                  element={
                    <PermissionGuard permission="pcp.masterdata.view">
                      <MasterPlanningLayout />
                    </PermissionGuard>
                  }
                >
                  <Route
                    index
                    element={
                      <MasterPlanningSubpage
                        initialHorizon="MENSAL"
                        title="Planejamento Mestre de Produção (S&OP)"
                        subtitle="Visão estratégica de médio e longo prazo, balanceamento e conversão para o sequenciamento fino."
                      />
                    }
                  />
                  <Route
                    path="anual"
                    element={
                      <MasterPlanningSubpage
                        initialHorizon="ANUAL"
                        title="Plano Mestre Anual"
                        subtitle="Capacidade instalada anual, demanda projetada e budget fabril por planta."
                      />
                    }
                  />
                  <Route
                    path="mensal"
                    element={
                      <MasterPlanningSubpage
                        initialHorizon="MENSAL"
                        title="Plano Mestre Mensal"
                        subtitle="Orçamentação operacional e metas de entrega mensal por linha de produção."
                      />
                    }
                  />
                  <Route
                    path="semanal"
                    element={
                      <MasterPlanningSubpage
                        initialHorizon="SEMANAL"
                        title="Plano Mestre Semanal"
                        subtitle="Grade tática semanal conectada diretamente à fila de ordens do sequenciamento."
                      />
                    }
                  />
                </Route>

                {/* 4. Gestão de Linhas (Estrutura da Malha Produtiva e Mapa de Integração) */}
                <Route
                  path="/pcp/linhas"
                  element={
                    <PermissionGuard permission="pcp.masterdata.view">
                      <LineManagementLayout />
                    </PermissionGuard>
                  }
                >
                  <Route index element={<LineMasterPage />} />
                  <Route path="cadastro" element={<LineMasterPage />} />
                  <Route path="sequenciamento" element={<SequencingPage />} />
                  <Route path="mapa-integracao" element={<ProductionIntegrationMapPage />} />
                  <Route path="capacidades" element={<LineCapacitiesSubpage />} />
                  <Route path="dependencias" element={<LineDependenciesSubpage />} />
                  <Route path="historico" element={<LineHistorySubpage />} />
                </Route>
                {/* 5. Módulos de Reuniões PCP, Central de Comunicados e Inbox */}
                <Route
                  path="/pcp/reunioes"
                  element={
                    <PermissionGuard permission="pcp.meeting.view">
                      <PCPMeetingsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/reunioes/andamento"
                  element={
                    <PermissionGuard permission="pcp.meeting.conduct">
                      <LiveMeetingRoom />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/reunioes/atas"
                  element={
                    <PermissionGuard permission="pcp.meeting.view">
                      <PCPMeetingsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/reunioes/pendencias"
                  element={
                    <PermissionGuard permission="pcp.meeting.view">
                      <PCPMeetingsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/comunicados"
                  element={
                    <PermissionGuard permission="pcp.communication.view">
                      <PCPCommunicationsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/inbox"
                  element={
                    <PermissionGuard permission="pcp.communication.view">
                      <PCPInboxPage />
                    </PermissionGuard>
                  }
                />

                {/* 5.1 Módulo de Qualidade do Produto, Ultrassom e Ensaios */}
                <Route
                  path="/pcp/qualidade"
                  element={
                    <PermissionGuard permission="pcp.quality.view">
                      <ProductQualityHubPage />
                    </PermissionGuard>
                  }
                />

                {/* 6. Módulos Auxiliares & Governança */}
                <Route
                  path="/pcp/ficha-mestre"
                  element={
                    <PermissionGuard permission="pcp.masterdata.view">
                      <LineMasterPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/regras"
                  element={
                    <PermissionGuard permission="pcp.rules.manage">
                      <ModulePreparationPage
                        title="Motor de Regras & Setup"
                        subtitle="Gerenciamento de restrições, matrizes de setup e matriz de compatibilidade de produtos."
                        targetPrompt="Fase 2"
                        requiredPerm="pcp.rules.manage"
                        features={[
                          'Matriz de Troca de Dimensão / Cor / Perfil',
                          'Herança Hierárquica de Regras (Rule Packs)',
                          'Prioridades de Matéria-Prima e Famílias',
                          'Restrições Físicas e Bloqueios Operacionais',
                        ]}
                      />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/aprovacoes"
                  element={
                    <PermissionGuard permission="pcp.schedule.approve">
                      <SchedulesPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/linhas-responsaveis"
                  element={
                    <PermissionGuard permission="pcp.masterdata.edit">
                      <LineResponsiblesPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/auditoria"
                  element={
                    <PermissionGuard permission="pcp.audit.view">
                      <AuditPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/admin/acessos"
                  element={
                    <PermissionGuard permission="pcp.admin.manage">
                      <AccessAdminPage />
                    </PermissionGuard>
                  }
                />

                {/* 5. Aliases e Redirecionamentos de Compatibilidade */}
                <Route
                  path="/pcp-robotizado/programacoes"
                  element={<Navigate to="/pcp/sequenciamento/programacao" replace />}
                />
                <Route
                  path="/pcp-robotizado/torre-controle"
                  element={<Navigate to="/pcp/sequenciamento/torre-controle" replace />}
                />
                <Route
                  path="/pcp-robotizado/planejamento-mestre"
                  element={<Navigate to="/pcp/planejamento" replace />}
                />
                <Route
                  path="/pcp-robotizado/ficha-mestre"
                  element={<Navigate to="/pcp/ficha-mestre" replace />}
                />
                <Route
                  path="/pcp-robotizado/administracao/ficha-mestre"
                  element={<Navigate to="/pcp/ficha-mestre" replace />}
                />
                <Route
                  path="/pcp-robotizado/regras"
                  element={<Navigate to="/pcp/regras" replace />}
                />
                <Route
                  path="/pcp-robotizado/aprovacoes"
                  element={<Navigate to="/pcp/aprovacoes" replace />}
                />
                <Route
                  path="/pcp-robotizado/linhas-responsaveis"
                  element={<Navigate to="/pcp/linhas-responsaveis" replace />}
                />
                <Route
                  path="/pcp-robotizado/auditoria"
                  element={<Navigate to="/pcp/auditoria" replace />}
                />
                <Route
                  path="/pcp-robotizado/admin/acessos"
                  element={<Navigate to="/pcp/admin/acessos" replace />}
                />
              </Route>

              {/* Rota 404 controlada */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
export default App
