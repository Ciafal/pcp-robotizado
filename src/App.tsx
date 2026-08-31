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
const MasterPlanningPage = lazy(() =>
  import('@/components/control-tower/MasterPlanningPage').then((m) => ({
    default: m.MasterPlanningPage,
  })),
)

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
const ScheduleChangesCenterPage = lazy(() => import('@/pages/ScheduleChangesCenterPage'))
const PCPIntegrationsPage = lazy(() => import('@/pages/PCPIntegrationsPage'))
const PCPIntegrationMonitorPage = lazy(() => import('@/pages/PCPIntegrationMonitorPage'))
const ProductQualityHubPage = lazy(() => import('@/pages/ProductQualityHubPage'))
const WeeklyScheduleOperationalPage = lazy(() => import('@/pages/WeeklyScheduleOperationalPage'))

// Otimização Dimensional de Matéria-Prima (14 Subpáginas)
const MPOverviewConsolidatedPage = lazy(() =>
  import('@/pages/mp-optimization/MPOverviewConsolidatedPage').then((m) => ({
    default: m.MPOverviewConsolidatedPage,
  })),
)
const MPOrdersAndReceiptPage = lazy(() =>
  import('@/pages/mp-optimization/MPOrdersAndReceiptPage').then((m) => ({
    default: m.MPOrdersAndReceiptPage,
  })),
)
const MPCuttingPlansUnifiedPage = lazy(() =>
  import('@/pages/mp-optimization/MPCuttingPlansUnifiedPage').then((m) => ({
    default: m.MPCuttingPlansUnifiedPage,
  })),
)
const MPOptimizeApplicationsUnifiedPage = lazy(() =>
  import('@/pages/mp-optimization/MPOptimizeApplicationsUnifiedPage').then((m) => ({
    default: m.MPOptimizeApplicationsUnifiedPage,
  })),
)

// Subpáginas legadas / rotas de detalhe compatíveis
const MPOptimizationOverviewPage = lazy(() =>
  import('@/pages/mp-optimization/MPOptimizationOverviewPage').then((m) => ({
    default: m.MPOptimizationOverviewPage,
  })),
)
const MPNeedsPage = lazy(() =>
  import('@/pages/mp-optimization/MPNeedsPage').then((m) => ({ default: m.MPNeedsPage })),
)
const MPByApplicationPage = lazy(() =>
  import('@/pages/mp-optimization/MPByApplicationPage').then((m) => ({
    default: m.MPByApplicationPage,
  })),
)
const MPCuttingPlanPage = lazy(() =>
  import('@/pages/mp-optimization/MPCuttingPlanPage').then((m) => ({
    default: m.MPCuttingPlanPage,
  })),
)
const MPDimensionalInventoryPage = lazy(() =>
  import('@/pages/mp-optimization/MPDimensionalInventoryPage').then((m) => ({
    default: m.MPDimensionalInventoryPage,
  })),
)
const MPExistingCutsPage = lazy(() =>
  import('@/pages/mp-optimization/MPExistingCutsPage').then((m) => ({
    default: m.MPExistingCutsPage,
  })),
)
const MPReapplicationsPage = lazy(() =>
  import('@/pages/mp-optimization/MPReapplicationsPage').then((m) => ({
    default: m.MPReapplicationsPage,
  })),
)
const MPOutOfIdealPage = lazy(() =>
  import('@/pages/mp-optimization/MPOutOfIdealPage').then((m) => ({ default: m.MPOutOfIdealPage })),
)
const MPDimensionalAnalysisPage = lazy(() =>
  import('@/pages/mp-optimization/MPDimensionalAnalysisPage').then((m) => ({
    default: m.MPDimensionalAnalysisPage,
  })),
)
const MPProjection3DPage = lazy(() =>
  import('@/pages/mp-optimization/MPProjection3DPage').then((m) => ({
    default: m.MPProjection3DPage,
  })),
)
const MPApprovalsPage = lazy(() =>
  import('@/pages/mp-optimization/MPApprovalsPage').then((m) => ({ default: m.MPApprovalsPage })),
)
const MPAuditHistoryPage = lazy(() =>
  import('@/pages/mp-optimization/MPAuditHistoryPage').then((m) => ({
    default: m.MPAuditHistoryPage,
  })),
)
const MPPlannedVsRealizedPage = lazy(() =>
  import('@/pages/mp-optimization/MPPlannedVsRealizedPage').then((m) => ({
    default: m.MPPlannedVsRealizedPage,
  })),
)
const MPIndicatorsPage = lazy(() =>
  import('@/pages/mp-optimization/MPIndicatorsPage').then((m) => ({ default: m.MPIndicatorsPage })),
)
const MPProjectionsSubpage = lazy(() =>
  import('@/pages/mp-optimization/MPProjectionsSubpage').then((m) => ({
    default: m.MPProjectionsSubpage,
  })),
)
const MPDestinationAndAvailabilitySubpage = lazy(() =>
  import('@/pages/mp-optimization/MPDestinationAndAvailabilitySubpage').then((m) => ({
    default: m.MPDestinationAndAvailabilitySubpage,
  })),
)
const MPSpecialSteelsSubpage = lazy(() =>
  import('@/pages/mp-optimization/MPSpecialSteelsSubpage').then((m) => ({
    default: m.MPSpecialSteelsSubpage,
  })),
)
const MPL1BalanceAndConsumptionSubpage = lazy(() =>
  import('@/pages/mp-optimization/MPL1BalanceAndConsumptionSubpage').then((m) => ({
    default: m.MPL1BalanceAndConsumptionSubpage,
  })),
)
const MPUtilizationAndSubstitutionSubpage = lazy(() =>
  import('@/pages/mp-optimization/MPUtilizationAndSubstitutionSubpage').then((m) => ({
    default: m.MPUtilizationAndSubstitutionSubpage,
  })),
)
const MPIndustrializerSubpage = lazy(() =>
  import('@/pages/mp-optimization/MPIndustrializerSubpage').then((m) => ({
    default: m.MPIndustrializerSubpage,
  })),
)
const RulesEnginePage = lazy(() =>
  import('@/pages/RulesEnginePage').then((m) => ({
    default: m.RulesEnginePage || m.default,
  })),
)
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
                {/* Rota Direta de Montagem Semanal (Renderiza a tela diretamente em todos os aliases) */}
                <Route
                  path="/pcp/montagem-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/programacao-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/programacao-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/programacao/montagem-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/programacao/montagem-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp-robotizado/programacao/montagem-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp-robotizado/montagem-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/montagem-semanal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/programacao-mensal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/oficina-cilindros"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/oficina-cilindros"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/programacao-mensal"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <WeeklyScheduleOperationalPage />
                    </PermissionGuard>
                  }
                />

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
                    <PermissionGuard permission="pcp.inventory.overview">
                      <InventoryManagementPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp-robotizado/estoques"
                  element={<Navigate to="/pcp/estoques" replace />}
                />
                <Route path="/estoque" element={<Navigate to="/pcp/estoques" replace />} />

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
                  <Route
                    path="montagem-semanal"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <WeeklyScheduleOperationalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="programacao-mensal"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <WeeklyScheduleOperationalPage />
                      </PermissionGuard>
                    }
                  />
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
                    <PermissionGuard permission="pcp.masterplan.overview">
                      <MasterPlanningLayout />
                    </PermissionGuard>
                  }
                >
                  <Route index element={<MasterPlanningPage />} />
                  <Route path="anual" element={<MasterPlanningPage />} />
                  <Route path="mensal" element={<MasterPlanningPage />} />
                  <Route path="semanal" element={<MasterPlanningPage />} />
                </Route>
                <Route
                  path="/planejamento-mestre"
                  element={<Navigate to="/pcp/planejamento" replace />}
                />

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

                {/* SUBMÓDULO PRINCIPAL: GESTÃO DE MATÉRIA-PRIMA (Estrutura Obrigatória Oficial CIAFAL) */}
                <Route
                  path="/pcp/gestao-materia-prima"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPOverviewConsolidatedPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/pedidos-recebimento"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPOrdersAndReceiptPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/planos-corte"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.simulate">
                      <MPCuttingPlansUnifiedPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/otimizar-aplicacoes"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.simulate">
                      <MPOptimizeApplicationsUnifiedPage />
                    </PermissionGuard>
                  }
                />
                {/* 5 Novos Subtópicos Oficiais da Gestão de Matéria-Prima */}
                <Route
                  path="/pcp/gestao-materia-prima/projecoes-mp"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPProjectionsSubpage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/saldo-disponibilidade-destino"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPDestinationAndAvailabilitySubpage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/niveis-estoque-acos-especiais"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPSpecialSteelsSubpage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/saldo-mp-l1-previsao-consumo"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPL1BalanceAndConsumptionSubpage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/utilizacao-substituicao-mp"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPUtilizationAndSubstitutionSubpage />
                    </PermissionGuard>
                  }
                />
                {/* 9. NOVO TÓPICO: Matéria-prima – Industrializador */}
                <Route
                  path="/pcp/gestao-materia-prima/industrializador"
                  element={
                    <PermissionGuard permission="pcp.mp_opt.view">
                      <MPIndustrializerSubpage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/gestao-materia-prima/materia-prima-industrializador"
                  element={<Navigate to="/pcp/gestao-materia-prima/industrializador" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/industrializador"
                  element={<Navigate to="/pcp/gestao-materia-prima/industrializador" replace />}
                />

                {/* Rotas de Compatibilidade e Detalhes Específicos do Módulo MP */}
                <Route
                  path="/pcp/otimizacao-mp"
                  element={<Navigate to="/pcp/gestao-materia-prima" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/visao-geral"
                  element={<Navigate to="/pcp/gestao-materia-prima" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/necessidade"
                  element={<Navigate to="/pcp/gestao-materia-prima/pedidos-recebimento" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/por-aplicacao"
                  element={<Navigate to="/pcp/gestao-materia-prima/planos-corte" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/plano-corte"
                  element={<Navigate to="/pcp/gestao-materia-prima/planos-corte" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/estoque-dimensional"
                  element={<Navigate to="/pcp/gestao-materia-prima/planos-corte" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/cortes-existentes"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/reaplicacoes"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/fora-padrao-ideal"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/analise-dimensional"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/projecao-3d"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/aprovacoes"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/historico"
                  element={<Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/plano-x-real"
                  element={<Navigate to="/pcp/gestao-materia-prima/planos-corte" replace />}
                />
                <Route
                  path="/pcp/otimizacao-mp/indicadores"
                  element={<Navigate to="/pcp/gestao-materia-prima" replace />}
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
                    <PermissionGuard permission="pcp.rules.view">
                      <RulesEnginePage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/aprovacoes"
                  element={
                    <PermissionGuard permission="pcp.approval.view">
                      <SchedulesPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/linhas-responsaveis"
                  element={
                    <PermissionGuard permission="pcp.masterdata.view">
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
                  path="/pcp/alteracoes"
                  element={
                    <PermissionGuard permission="pcp.schedule.view">
                      <ScheduleChangesCenterPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/integracoes"
                  element={
                    <PermissionGuard permission="pcp.integrations.view">
                      <PCPIntegrationsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/pcp/integracoes/monitor"
                  element={
                    <PermissionGuard permission="pcp.integrations.view">
                      <PCPIntegrationMonitorPage />
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

                {/* Aliases e Redirecionamentos de Compatibilidade */}
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
                  path="/pcp/sequenciamento/regras"
                  element={<Navigate to="/pcp/regras" replace />}
                />
                <Route
                  path="/pcp-robotizado/motor-regras"
                  element={<Navigate to="/pcp/regras" replace />}
                />
                <Route path="/regras" element={<Navigate to="/pcp/regras" replace />} />
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
