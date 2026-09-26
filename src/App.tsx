import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import { OeeDrilldownProvider } from '@/contexts/OeeDrilldownContext'
import { OeeDrilldownModal } from '@/components/common/OeeDrilldownModal'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { lazyWithRetry } from '@/lib/lazyWithRetry'

// Loading Fallback visual discreto
const ModuleFallback = () => (
  <div className="p-12 flex flex-col items-center justify-center space-y-3 min-h-[300px]">
    <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-mono text-slate-400">Carregando módulo...</p>
  </div>
)

// Componente de compatibilidade para testes e importações legadas:
// A rota raiz "/" agora renderiza DIRETAMENTE o Cockpit (<Index />) sem intermediários,
// evitando instabilidade de cold start e erros no ErrorBoundary.
export const RootRedirect: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const target = `/pcp/cockpit${location.search}${location.hash}`

  React.useEffect(() => {
    try {
      navigate(target, { replace: true })
    } catch (e) {
      console.warn('RootRedirect fallback notice:', e)
    }
  }, [navigate, target])

  return <Navigate to={target} replace />
}

// Lazy load dos componentes e layouts com retry resiliente
const Index = lazyWithRetry(
  () => import('@/pages/Index').then((m) => ({ default: m.default ?? m.Index })),
  'Index',
)
const CentralSequenciamentoLayout = lazyWithRetry(
  () =>
    import('@/pages/CentralSequenciamentoLayout').then((m) => ({
      default: m.CentralSequenciamentoLayout,
    })),
  'CentralSequenciamentoLayout',
)
const CentralSequenciamentoLandingPage = lazyWithRetry(
  () =>
    import('@/pages/CentralSequenciamentoLandingPage').then((m) => ({
      default: m.default ?? m.CentralSequenciamentoLandingPage,
    })),
  'CentralSequenciamentoLandingPage',
)
const ControlTowerPage = lazyWithRetry(
  () =>
    import('@/pages/ControlTowerPage').then((m) => ({ default: m.ControlTowerPage || m.default })),
  'ControlTowerPage',
)
const OperationalPage = lazyWithRetry(
  () =>
    import('@/pages/OperationalPage').then((m) => ({ default: m.OperationalPage || m.default })),
  'OperationalPage',
)
const SequencingPage = lazyWithRetry(
  () => import('@/pages/SequencingPage').then((m) => ({ default: m.SequencingPage || m.default })),
  'SequencingPage',
)
const EfficiencyPage = lazyWithRetry(
  () =>
    import('@/pages/EfficiencyPage').then((m) => ({
      default: m.default ?? m.EfficiencyPage,
    })),
  'EfficiencyPage',
)
const EfficiencyProductsSubpage = lazyWithRetry(
  () =>
    import('@/pages/EfficiencyProductsSubpage').then((m) => ({
      default: m.default ?? m.EfficiencyProductsSubpage,
    })),
  'EfficiencyProductsSubpage',
)
const EfficiencyLinesSubpage = lazyWithRetry(
  () =>
    import('@/pages/EfficiencyLinesSubpage').then((m) => ({
      default: m.default ?? m.EfficiencyLinesSubpage,
    })),
  'EfficiencyLinesSubpage',
)
const EfficiencyPlantsSubpage = lazyWithRetry(
  () =>
    import('@/pages/EfficiencyPlantsSubpage').then((m) => ({
      default: m.default ?? m.EfficiencyPlantsSubpage,
    })),
  'EfficiencyPlantsSubpage',
)
const EfficiencyAssertivenessSubpage = lazyWithRetry(
  () =>
    import('@/pages/EfficiencyAssertivenessSubpage').then((m) => ({
      default: m.default ?? m.EfficiencyAssertivenessSubpage,
    })),
  'EfficiencyAssertivenessSubpage',
)
const BacklogPage = lazyWithRetry(
  () =>
    import('@/pages/BacklogPage').then((m) => ({
      default: m.default ?? m.BacklogPage,
    })),
  'BacklogPage',
)
const AnaliseCarteiraPage = lazyWithRetry(
  () =>
    import('@/pages/AnaliseCarteiraPage').then((m) => ({
      default: m.default ?? m.AnaliseCarteiraPage,
    })),
  'AnaliseCarteiraPage',
)
const PedidosCanceladosPage = lazyWithRetry(
  () =>
    import('@/pages/PedidosCanceladosPage').then((m) => ({
      default: m.default ?? m.PedidosCanceladosPage,
    })),
  'PedidosCanceladosPage',
)
const KpisCarteiraPage = lazyWithRetry(
  () =>
    import('@/pages/KpisCarteiraPage').then((m) => ({
      default: m.default ?? m.KpisCarteiraPage,
    })),
  'KpisCarteiraPage',
)
const ScenariosPage = lazyWithRetry(
  () => import('@/pages/ScenariosPage').then((m) => ({ default: m.ScenariosPage || m.default })),
  'ScenariosPage',
)
const HistoryPage = lazyWithRetry(
  () =>
    import('@/pages/HistoryPage').then((m) => ({
      default: m.default ?? m.HistoryPage,
    })),
  'HistoryPage',
)
const InventoryManagementPage = lazyWithRetry(
  () =>
    import('@/pages/InventoryManagementPage').then((m) => ({
      default: m.default ?? m.InventoryManagementPage,
    })),
  'InventoryManagementPage',
)
const ExecutiveCockpitPage = lazyWithRetry(
  () =>
    import('@/pages/ExecutiveCockpitPage').then((m) => ({
      default: m.default ?? m.ExecutiveCockpitPage,
    })),
  'ExecutiveCockpitPage',
)
const PCPMeetingsPage = lazyWithRetry(
  () =>
    import('@/pages/PCPMeetingsPage').then((m) => ({
      default: m.default ?? m.PCPMeetingsPage,
    })),
  'PCPMeetingsPage',
)
const PCPCommunicationsPage = lazyWithRetry(
  () =>
    import('@/pages/PCPCommunicationsPage').then((m) => ({
      default: m.default ?? m.PCPCommunicationsPage,
    })),
  'PCPCommunicationsPage',
)
const PCPInboxPage = lazyWithRetry(
  () =>
    import('@/pages/PCPInboxPage').then((m) => ({
      default: m.default ?? m.PCPInboxPage,
    })),
  'PCPInboxPage',
)
const LiveMeetingRoom = lazyWithRetry(
  () =>
    import('@/components/meetings/LiveMeetingRoom').then((m) => ({ default: m.LiveMeetingRoom })),
  'LiveMeetingRoom',
)
const MeetingMinutesView = lazyWithRetry(
  () =>
    import('@/components/meetings/MeetingMinutesView').then((m) => ({
      default: m.MeetingMinutesView,
    })),
  'MeetingMinutesView',
)
const MeetingPendenciesView = lazyWithRetry(
  () =>
    import('@/components/meetings/MeetingPendenciesView').then((m) => ({
      default: m.MeetingPendenciesView,
    })),
  'MeetingPendenciesView',
)

// Planejamento Mestre
const MasterPlanningLayout = lazyWithRetry(
  () => import('@/pages/MasterPlanningLayout').then((m) => ({ default: m.MasterPlanningLayout })),
  'MasterPlanningLayout',
)
const MasterPlanningPage = lazyWithRetry(
  () =>
    import('@/components/control-tower/MasterPlanningPage').then((m) => ({
      default: m.MasterPlanningPage,
    })),
  'MasterPlanningPage',
)

// Gestão de Linhas & Mapa de Integração
const LineManagementLayout = lazyWithRetry(
  () => import('@/pages/LineManagementLayout').then((m) => ({ default: m.LineManagementLayout })),
  'LineManagementLayout',
)
const ProductionIntegrationMapPage = lazyWithRetry(
  () =>
    import('@/pages/ProductionIntegrationMapPage').then((m) => ({
      default: m.default ?? m.ProductionIntegrationMapPage,
    })),
  'ProductionIntegrationMapPage',
)
const LineCapacitiesSubpage = lazyWithRetry(
  () =>
    import('@/pages/LineCapacitiesSubpage').then((m: any) => ({
      default: m.default ?? m.LineCapacitiesSubpage,
    })),
  'LineCapacitiesSubpage',
)
const LineDependenciesSubpage = lazyWithRetry(
  () =>
    import('@/pages/LineDependenciesSubpage').then((m: any) => ({
      default: m.default ?? m.LineDependenciesSubpage,
    })),
  'LineDependenciesSubpage',
)
const LineHistorySubpage = lazyWithRetry(
  () =>
    import('@/pages/LineHistorySubpage').then((m: any) => ({
      default: m.default ?? m.LineHistorySubpage,
    })),
  'LineHistorySubpage',
)

// Módulos Auxiliares / Legado
const LineMasterPage = lazyWithRetry(
  () =>
    import('@/pages/LineMasterPage').then((m: any) => ({
      default: m.default ?? m.LineMasterPage,
    })),
  'LineMasterPage',
)
const LineResponsiblesPage = lazyWithRetry(
  () =>
    import('@/pages/LineResponsiblesPage').then((m: any) => ({
      default: m.default ?? m.LineResponsiblesPage,
    })),
  'LineResponsiblesPage',
)
const SchedulesPage = lazyWithRetry(
  () =>
    import('@/pages/SchedulesPage').then((m: any) => ({
      default: m.default ?? m.SchedulesPage,
    })),
  'SchedulesPage',
)
const AuditPage = lazyWithRetry(
  () =>
    import('@/pages/AuditPage').then((m: any) => ({
      default: m.default ?? m.AuditPage,
    })),
  'AuditPage',
)
const ReasonsAndGovernancePage = lazyWithRetry(
  () =>
    import('@/pages/ReasonsAndGovernancePage').then((m: any) => ({
      default: m.default ?? m.ReasonsAndGovernancePage,
    })),
  'ReasonsAndGovernancePage',
)
const AccessAdminPage = lazyWithRetry(
  () =>
    import('@/pages/AccessAdminPage').then((m: any) => ({
      default: m.default ?? m.AccessAdminPage,
    })),
  'AccessAdminPage',
)
const ScheduleChangesCenterPage = lazyWithRetry(
  () =>
    import('@/pages/ScheduleChangesCenterPage').then((m) => ({
      default: m.default ?? m.ScheduleChangesCenterPage,
    })),
  'ScheduleChangesCenterPage',
)
const PCPIntegrationsPage = lazyWithRetry(
  () =>
    import('@/pages/PCPIntegrationsPage').then((m) => ({
      default: m.default ?? m.PCPIntegrationsPage,
    })),
  'PCPIntegrationsPage',
)
const PCPIntegrationMonitorPage = lazyWithRetry(
  () =>
    import('@/pages/PCPIntegrationMonitorPage').then((m) => ({
      default: m.default ?? m.PCPIntegrationMonitorPage,
    })),
  'PCPIntegrationMonitorPage',
)
const PCPDataQualityPage = lazyWithRetry(
  () =>
    import('@/pages/PCPDataQualityPage').then((m) => ({
      default: m.default ?? m.PCPDataQualityPage,
    })),
  'PCPDataQualityPage',
)
const PCPHomologationStatusPage = lazyWithRetry(
  () =>
    import('@/pages/PCPHomologationStatusPage').then((m) => ({
      default: m.default ?? m.PCPHomologationStatusPage,
    })),
  'PCPHomologationStatusPage',
)
const ProductQualityHubPage = lazyWithRetry(
  () =>
    import('@/pages/ProductQualityHubPage').then((m) => ({
      default: m.default ?? m.ProductQualityHubPage,
    })),
  'ProductQualityHubPage',
)
const WeeklyScheduleOperationalPage = lazyWithRetry(
  () =>
    import('@/pages/WeeklyScheduleOperationalPage').then((m) => ({
      default: m.default ?? m.WeeklyScheduleOperationalPage,
    })),
  'WeeklyScheduleOperationalPage',
)
const TestProgrammingPage = lazyWithRetry(
  () =>
    import('@/pages/TestProgrammingPage').then((m) => ({
      default: m.default ?? m.TestProgrammingPage,
    })),
  'TestProgrammingPage',
)
const RawMaterialInventoryPage = lazyWithRetry(
  () =>
    import('@/pages/pcp/RawMaterialInventoryPage').then((m) => ({
      default: m.default ?? m.RawMaterialInventoryPage,
    })),
  'RawMaterialInventoryPage',
)
const EntregasPcpPage = lazyWithRetry(
  () =>
    import('@/pages/EntregasPcpPage').then((m) => ({
      default: m.default ?? m.EntregasPcpPage,
    })),
  'EntregasPcpPage',
)
const ResumoMensalPage = lazyWithRetry(
  () =>
    import('@/pages/ResumoMensalPage').then((m) => ({
      default: m.default ?? m.ResumoMensalPage,
    })),
  'ResumoMensalPage',
)
const EntregasHistoricoPage = lazyWithRetry(
  () =>
    import('@/pages/EntregasHistoricoPage').then((m) => ({
      default: m.default ?? m.EntregasHistoricoPage,
    })),
  'EntregasHistoricoPage',
)
const EntregasRevisoesPage = lazyWithRetry(
  () =>
    import('@/pages/EntregasRevisoesPage').then((m) => ({
      default: m.default ?? m.EntregasRevisoesPage,
    })),
  'EntregasRevisoesPage',
)
const EntregasIndicadoresPage = lazyWithRetry(
  () =>
    import('@/pages/EntregasIndicadoresPage').then((m) => ({
      default: m.default ?? m.EntregasIndicadoresPage,
    })),
  'EntregasIndicadoresPage',
)

// Otimização Dimensional de Matéria-Prima (14 Subpáginas)
const MPOverviewConsolidatedPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPOverviewConsolidatedPage').then((m) => ({
      default: m.MPOverviewConsolidatedPage,
    })),
  'MPOverviewConsolidatedPage',
)
const MPOrdersAndReceiptPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPOrdersAndReceiptPage').then((m) => ({
      default: m.MPOrdersAndReceiptPage,
    })),
  'MPOrdersAndReceiptPage',
)
const MPCuttingPlansUnifiedPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPCuttingPlansUnifiedPage').then((m) => ({
      default: m.MPCuttingPlansUnifiedPage,
    })),
  'MPCuttingPlansUnifiedPage',
)
const MPOptimizeApplicationsUnifiedPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPOptimizeApplicationsUnifiedPage').then((m) => ({
      default: m.MPOptimizeApplicationsUnifiedPage,
    })),
  'MPOptimizeApplicationsUnifiedPage',
)

// Subpáginas legadas / rotas de detalhe compatíveis
const MPOptimizationOverviewPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPOptimizationOverviewPage').then((m) => ({
      default: m.MPOptimizationOverviewPage,
    })),
  'MPOptimizationOverviewPage',
)
const MPNeedsPage = lazyWithRetry(
  () => import('@/pages/mp-optimization/MPNeedsPage').then((m) => ({ default: m.MPNeedsPage })),
  'MPNeedsPage',
)
const MPByApplicationPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPByApplicationPage').then((m) => ({
      default: m.MPByApplicationPage,
    })),
  'MPByApplicationPage',
)
const MPCuttingPlanPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPCuttingPlanPage').then((m) => ({
      default: m.MPCuttingPlanPage,
    })),
  'MPCuttingPlanPage',
)
const MPDimensionalInventoryPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPDimensionalInventoryPage').then((m) => ({
      default: m.MPDimensionalInventoryPage,
    })),
  'MPDimensionalInventoryPage',
)
const MPExistingCutsPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPExistingCutsPage').then((m) => ({
      default: m.MPExistingCutsPage,
    })),
  'MPExistingCutsPage',
)
const MPReapplicationsPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPReapplicationsPage').then((m) => ({
      default: m.MPReapplicationsPage,
    })),
  'MPReapplicationsPage',
)
const MPOutOfIdealPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPOutOfIdealPage').then((m) => ({
      default: m.MPOutOfIdealPage,
    })),
  'MPOutOfIdealPage',
)
const MPDimensionalAnalysisPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPDimensionalAnalysisPage').then((m) => ({
      default: m.MPDimensionalAnalysisPage,
    })),
  'MPDimensionalAnalysisPage',
)
const MPProjection3DPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPProjection3DPage').then((m) => ({
      default: m.MPProjection3DPage,
    })),
  'MPProjection3DPage',
)
const MPApprovalsPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPApprovalsPage').then((m) => ({
      default: m.MPApprovalsPage,
    })),
  'MPApprovalsPage',
)
const MPAuditHistoryPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPAuditHistoryPage').then((m) => ({
      default: m.MPAuditHistoryPage,
    })),
  'MPAuditHistoryPage',
)
const MPPlannedVsRealizedPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPPlannedVsRealizedPage').then((m) => ({
      default: m.MPPlannedVsRealizedPage,
    })),
  'MPPlannedVsRealizedPage',
)
const MPIndicatorsPage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPIndicatorsPage').then((m) => ({
      default: m.MPIndicatorsPage,
    })),
  'MPIndicatorsPage',
)
const MPProjectionsSubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPProjectionsSubpage').then((m) => ({
      default: m.MPProjectionsSubpage,
    })),
  'MPProjectionsSubpage',
)
const MPDestinationAndAvailabilitySubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPDestinationAndAvailabilitySubpage').then((m) => ({
      default: m.MPDestinationAndAvailabilitySubpage,
    })),
  'MPDestinationAndAvailabilitySubpage',
)
const MPSpecialSteelsSubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPSpecialSteelsSubpage').then((m) => ({
      default: m.MPSpecialSteelsSubpage,
    })),
  'MPSpecialSteelsSubpage',
)
const MPL1BalanceAndConsumptionSubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPL1BalanceAndConsumptionSubpage').then((m) => ({
      default: m.MPL1BalanceAndConsumptionSubpage,
    })),
  'MPL1BalanceAndConsumptionSubpage',
)
const MPUtilizationAndSubstitutionSubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPUtilizationAndSubstitutionSubpage').then((m) => ({
      default: m.MPUtilizationAndSubstitutionSubpage,
    })),
  'MPUtilizationAndSubstitutionSubpage',
)
const MPIndustrializerSubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPIndustrializerSubpage').then((m) => ({
      default: m.MPIndustrializerSubpage,
    })),
  'MPIndustrializerSubpage',
)
const MPSidercentroSubpage = lazyWithRetry(
  () =>
    import('@/pages/mp-optimization/MPSidercentroSubpage').then((m) => ({
      default: m.MPSidercentroSubpage,
    })),
  'MPSidercentroSubpage',
)
const RulesEnginePage = lazyWithRetry(
  () =>
    import('@/pages/RulesEnginePage').then((m) => ({
      default: m.RulesEnginePage || m.default,
    })),
  'RulesEnginePage',
)
const SapValidationPage = lazyWithRetry(
  () =>
    import('@/pages/SapValidationPage').then((m) => ({
      default: m.default ?? m.SapValidationPage,
    })),
  'SapValidationPage',
)

// Módulo CONTROLE DE PRODUÇÃO (9 Telas Reais Homologadas)
const ProductionOverviewPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionOverviewPage').then((m) => ({
      default: m.default ?? m.ProductionOverviewPage,
    })),
  'ProductionOverviewPage',
)
const ProductionOrdersPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionOrdersPage').then((m) => ({
      default: m.default ?? m.ProductionOrdersPage,
    })),
  'ProductionOrdersPage',
)
const ProductionPostingsPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionPostingsPage').then((m) => ({
      default: m.default ?? m.ProductionPostingsPage,
    })),
  'ProductionPostingsPage',
)
const ProductionPendenciesPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionPendenciesPage').then((m) => ({
      default: m.default ?? m.ProductionPendenciesPage,
    })),
  'ProductionPendenciesPage',
)
const ProductionDeviationsPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionDeviationsPage').then((m) => ({
      default: m.default ?? m.ProductionDeviationsPage,
    })),
  'ProductionDeviationsPage',
)
const ProductionComparativePage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionComparativePage').then((m) => ({
      default: m.default ?? m.ProductionComparativePage,
    })),
  'ProductionComparativePage',
)
const ProductionZPP01Page = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionZPP01Page').then((m) => ({
      default: m.default ?? m.ProductionZPP01Page,
    })),
  'ProductionZPP01Page',
)
const ProductionAIAnalysisPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionAIAnalysisPage').then((m) => ({
      default: m.default ?? m.ProductionAIAnalysisPage,
    })),
  'ProductionAIAnalysisPage',
)
const ProductionReferenceDocumentsPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionReferenceDocumentsPage').then((m) => ({
      default: m.default ?? m.ProductionReferenceDocumentsPage,
    })),
  'ProductionReferenceDocumentsPage',
)
const CogiPendenciesPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/CogiPendenciesPage').then((m) => ({
      default: m.default ?? m.CogiPendenciesPage,
    })),
  'CogiPendenciesPage',
)
const Co1pPendenciesPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/Co1pPendenciesPage').then((m) => ({
      default: m.default ?? m.Co1pPendenciesPage,
    })),
  'Co1pPendenciesPage',
)
const ProductionHistoryPage = lazyWithRetry(
  () =>
    import('@/pages/production-control/ProductionHistoryPage').then((m) => ({
      default: m.default ?? m.ProductionHistoryPage,
    })),
  'ProductionHistoryPage',
)
const ModulePreparationPage = lazyWithRetry(
  () =>
    import('@/pages/ModulePreparationPage').then((m) => ({
      default: m.default ?? m.ModulePreparationPage,
    })),
  'ModulePreparationPage',
)
const NotFound = lazyWithRetry(
  () =>
    import('@/pages/NotFound').then((m: any) => ({
      default: m.default ?? m.NotFound,
    })),
  'NotFound',
)

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ControlTowerProvider>
          <OeeDrilldownProvider>
            <Suspense fallback={<ModuleFallback />}>
              <Routes>
                <Route element={<Layout />}>
                  {/* Rotas Oficiais de Gestão de Entregas PCP com Submenu Completo */}
                  <Route
                    path="/pcp/entregas"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <EntregasPcpPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/entregas/visao-geral"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <EntregasPcpPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/entregas/resumo-mensal"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <ResumoMensalPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/entregas/historico"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <EntregasHistoricoPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/entregas/revisoes"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <EntregasRevisoesPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/entregas/indicadores"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <EntregasIndicadoresPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/entregas-pcp"
                    element={<Navigate to="/pcp/entregas" replace />}
                  />
                  <Route
                    path="/pcp/entregas-pcp/*"
                    element={<Navigate to="/pcp/entregas" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/entregas"
                    element={<Navigate to="/pcp/entregas" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/entregas/*"
                    element={<Navigate to="/pcp/entregas" replace />}
                  />
                  <Route
                    path="/pcp/resumo-mensal"
                    element={<Navigate to="/pcp/entregas/resumo-mensal" replace />}
                  />
                  <Route path="/entregas-pcp" element={<Navigate to="/pcp/entregas" replace />} />
                  <Route path="/entregas-pcp/*" element={<Navigate to="/pcp/entregas" replace />} />
                  <Route path="/entregas" element={<Navigate to="/pcp/entregas" replace />} />
                  <Route path="/entregas/*" element={<Navigate to="/pcp/entregas" replace />} />
                  {/* Aliases de redirecionamento canônicos para Programação de Testes e Inventário MP */}
                  <Route
                    path="/pcp/inventario-mp"
                    element={<Navigate to="/pcp/sequenciamento/inventario-mp" replace />}
                  />
                  <Route
                    path="/inventario-mp"
                    element={<Navigate to="/pcp/sequenciamento/inventario-mp" replace />}
                  />
                  <Route
                    path="/pcp/programacao-testes"
                    element={<Navigate to="/pcp/sequenciamento/programacao-testes" replace />}
                  />
                  <Route
                    path="/pcp/test-programming"
                    element={<Navigate to="/pcp/sequenciamento/programacao-testes" replace />}
                  />
                  <Route
                    path="/programacao-testes"
                    element={<Navigate to="/pcp/sequenciamento/programacao-testes" replace />}
                  />
                  {/* Rota Direta de Montagem Semanal (Renderiza a tela diretamente em todos os aliases com correção de typo) */}
                  <Route
                    path="/pcp/montagem-sewanal"
                    element={
                      <PermissionGuard permission="pcp.schedule.view">
                        <WeeklyScheduleOperationalPage />
                      </PermissionGuard>
                    }
                  />
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
                  {/* SUBMÓDULO OFICIAL: ANÁLISE DE CARTEIRA (ZSD28C / CICLOS L1 & L2 / MTO / REVENDA / IMPORTADO) */}
                  <Route
                    path="/pcp/analise-carteira"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/geral"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/l1"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/l2"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/mto"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/revenda"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/importado"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/sdc"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <AnaliseCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/kpis"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <KpisCarteiraPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/analise-carteira/cancelados"
                    element={
                      <PermissionGuard permission="pcp.carteira.view">
                        <PedidosCanceladosPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/pedidos-cancelados"
                    element={<Navigate to="/pcp/analise-carteira/cancelados" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/analise-carteira"
                    element={<Navigate to="/pcp/analise-carteira" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/analise-carteira/*"
                    element={<Navigate to="/pcp/analise-carteira" replace />}
                  />
                  <Route
                    path="/analise-carteira"
                    element={<Navigate to="/pcp/analise-carteira" replace />}
                  />
                  <Route
                    path="/analise-carteira/*"
                    element={<Navigate to="/pcp/analise-carteira" replace />}
                  />
                  <Route
                    path="/carteira-analise"
                    element={<Navigate to="/pcp/analise-carteira" replace />}
                  />
                  <Route
                    path="/carteira-analise/*"
                    element={<Navigate to="/pcp/analise-carteira" replace />}
                  />
                  {/* 1. Cockpit Executivo CIAFAL com IA & DWP / Meu Hub */}{' '}
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
                  {/* Landing Raiz: Renderização direta da Página PRINCIPAL (Cockpit) sem redirect intermediário */}
                  <Route path="/" element={<Index />} />
                  <Route path="/pcp" element={<Navigate to="/pcp/cockpit" replace />} />
                  <Route path="/pcp/principal" element={<Navigate to="/pcp/cockpit" replace />} />
                  <Route path="/pcp/cockpit" element={<Index />} />
                  <Route
                    path="/pcp-robotizado"
                    element={
                      <PermissionGuard permission="pcp.cockpit.view">
                        <Index />
                      </PermissionGuard>
                    }
                  />
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
                    {/* Rotas filhas protegidas pelo PermissionGuard de nível superior em /pcp/sequenciamento */}
                    <Route path="montagem-semanal" element={<WeeklyScheduleOperationalPage />} />
                    <Route path="programacao-testes" element={<TestProgrammingPage />} />
                    <Route path="inventario-mp" element={<RawMaterialInventoryPage />} />
                    <Route path="programacao-mensal" element={<WeeklyScheduleOperationalPage />} />
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

                    {/* Análise de Carteira Integrada */}
                    <Route path="analise-carteira" element={<AnaliseCarteiraPage />} />
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
                    <Route path="anual" element={<MasterPlanningPage initialHorizon="ANUAL" />} />
                    <Route path="mensal" element={<MasterPlanningPage initialHorizon="MENSAL" />} />
                    <Route
                      path="semanal"
                      element={<MasterPlanningPage initialHorizon="SEMANAL" />}
                    />
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
                    <Route index element={<Navigate to="/pcp/linhas/capacidades" replace />} />
                    <Route path="cadastro" element={<Navigate to="/pcp/ficha-mestre" replace />} />
                    <Route path="sequenciamento" element={<SequencingPage />} />
                    <Route path="mapa-integracao" element={<ProductionIntegrationMapPage />} />
                    <Route path="capacidades" element={<LineCapacitiesSubpage />} />
                    <Route path="dependencias" element={<LineDependenciesSubpage />} />
                    <Route path="historico" element={<LineHistorySubpage />} />
                  </Route>
                  {/* 5. Módulo Oficial REUNIÃO PCP (8 Subtópicos) */}
                  <Route
                    path="/pcp/reunioes"
                    element={<Navigate to="/pcp/reunioes/visao-geral" replace />}
                  />
                  <Route
                    path="/pcp/reunioes/visao-geral"
                    element={
                      <PermissionGuard permission="pcp.meeting.view">
                        <PCPMeetingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/reunioes/preparacao"
                    element={
                      <PermissionGuard permission="pcp.meeting.view">
                        <PCPMeetingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/reunioes/agenda"
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
                        <PCPMeetingsPage />
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
                    path="/pcp/reunioes/historico"
                    element={
                      <PermissionGuard permission="pcp.meeting.view">
                        <PCPMeetingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/reunioes/configuracoes"
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
                  {/* 10. NOVO TÓPICO: Matéria-prima – Sidercentro */}
                  <Route
                    path="/pcp/gestao-materia-prima/sidercentro"
                    element={
                      <PermissionGuard permission="pcp.mp_opt.view">
                        <MPSidercentroSubpage />
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
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/pedidos-recebimento" replace />
                    }
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
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
                  />
                  <Route
                    path="/pcp/otimizacao-mp/reaplicacoes"
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
                  />
                  <Route
                    path="/pcp/otimizacao-mp/fora-padrao-ideal"
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
                  />
                  <Route
                    path="/pcp/otimizacao-mp/analise-dimensional"
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
                  />
                  <Route
                    path="/pcp/otimizacao-mp/projecao-3d"
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
                  />
                  <Route
                    path="/pcp/otimizacao-mp/aprovacoes"
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
                  />
                  <Route
                    path="/pcp/otimizacao-mp/historico"
                    element={
                      <Navigate to="/pcp/gestao-materia-prima/otimizar-aplicacoes" replace />
                    }
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
                  {/* 6. Módulos Auxiliares & Governança - Centros e Ficha Mestra */}
                  {/* ROTAS CANÔNICAS: CADASTROS */}
                  <Route
                    path="/pcp/cadastros/ficha-mestre"
                    element={
                      <PermissionGuard permission="pcp.masterdata.view">
                        <ErrorBoundary moduleName="Centros e Ficha Mestra">
                          <LineMasterPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/hierarquia"
                    element={
                      <PermissionGuard permission="pcp.masterdata.view">
                        <ErrorBoundary moduleName="Hierarquia das Linhas">
                          <LineCapacitiesSubpage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/rotas"
                    element={
                      <PermissionGuard permission="pcp.masterdata.view">
                        <ErrorBoundary moduleName="Rotas de Produção">
                          <LineDependenciesSubpage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/matriz-setup"
                    element={
                      <PermissionGuard permission="pcp.rules.view">
                        <ErrorBoundary moduleName="Matriz de Setup">
                          <RulesEnginePage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/produtividade"
                    element={
                      <PermissionGuard permission="pcp.masterdata.view">
                        <ErrorBoundary moduleName="Produtividade Padrão">
                          <LineCapacitiesSubpage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/paradas-programadas"
                    element={
                      <PermissionGuard permission="pcp.rules.view">
                        <ErrorBoundary moduleName="Paradas Programadas">
                          <RulesEnginePage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/parametros-programacao"
                    element={
                      <PermissionGuard permission="pcp.masterdata.view">
                        <ErrorBoundary moduleName="Parâmetros de Programação">
                          <LineMasterPage initialTab="PROGRAMMING_PARAMETERS" />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/cadastros/validacao-sap"
                    element={
                      <PermissionGuard permission="pcp.masterdata.view">
                        <ErrorBoundary moduleName="Validação de Cadastro SAP">
                          <SapValidationPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/validacao-sap"
                    element={<Navigate to="/pcp/cadastros/validacao-sap" replace />}
                  />
                  {/* REDIRECTS DE COMPATIBILIDADE PARA ROTAS ANTIGAS DE CADASTROS */}
                  <Route
                    path="/pcp/linhas/paradas-programadas"
                    element={<Navigate to="/pcp/cadastros/paradas-programadas" replace />}
                  />
                  <Route
                    path="/pcp/ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/pcp/centros-ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/pcp/linhas-ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/centros-ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/linhas-ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/centros-ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/linhas-ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/pcp/linhas/capacidades"
                    element={<Navigate to="/pcp/cadastros/hierarquia" replace />}
                  />
                  <Route
                    path="/pcp/linhas/dependencias"
                    element={<Navigate to="/pcp/cadastros/rotas" replace />}
                  />
                  <Route
                    path="/pcp/linhas/sequenciamento"
                    element={<Navigate to="/pcp/cadastros/rotas" replace />}
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
                    path="/pcp/qualidade-dados"
                    element={
                      <PermissionGuard permission="pcp.audit.view">
                        <PCPDataQualityPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/status-homologacao"
                    element={
                      <PermissionGuard permission="pcp.audit.view">
                        <PCPHomologationStatusPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/motivos-justificativas"
                    element={
                      <PermissionGuard permission="pcp.audit.view">
                        <ReasonsAndGovernancePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/motivos"
                    element={<Navigate to="/pcp/motivos-justificativas" replace />}
                  />
                  <Route
                    path="/pcp/justificativas"
                    element={<Navigate to="/pcp/motivos-justificativas" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/motivos-justificativas"
                    element={<Navigate to="/pcp/motivos-justificativas" replace />}
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
                  {/* ROTAS CANÔNICAS: CONTROLE DE PRODUÇÃO */}
                  <Route
                    path="/pcp/controle-producao"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Torre de Controle da Produção">
                          <ProductionOverviewPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/ordens"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Controle de Ordens de Produção">
                          <ProductionOrdersPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/ordens/:opId"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Detalhe da Ordem de Produção">
                          <ProductionOrdersPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/apontamentos"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Apontamentos de Produção">
                          <ProductionPostingsPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/historico"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Histórico de Produção">
                          <ProductionHistoryPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/analise"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Análise de Ordens">
                          <ProductionAIAnalysisPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/cogi"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Pendências - COGI">
                          <CogiPendenciesPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/co1p"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Pendências - CO1P">
                          <Co1pPendenciesPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/documentos-referencia"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Documentos de Referência — Controle de Produção">
                          <ProductionReferenceDocumentsPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  {/* Subrotas operacionais adicionais do Controle de Produção */}
                  <Route
                    path="/pcp/controle-producao/pendencias"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Pendências de Produção">
                          <ProductionPendenciesPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/desvios"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Desvios de Produção">
                          <ProductionDeviationsPage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/comparativo"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Comparativo MES x SAP">
                          <ProductionComparativePage />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="/pcp/controle-producao/zpp-01"
                    element={
                      <PermissionGuard permission="pcp.production.view">
                        <ErrorBoundary moduleName="Demonstrativo ZPP_01">
                          <ProductionZPP01Page />
                        </ErrorBoundary>
                      </PermissionGuard>
                    }
                  />
                  {/* REDIRECTS DE COMPATIBILIDADE / ROTAS LEGADAS (Navigate replace) */}
                  <Route
                    path="/pcp/producao"
                    element={<Navigate to="/pcp/controle-producao" replace />}
                  />
                  <Route
                    path="/pcp/producao/visao-geral"
                    element={<Navigate to="/pcp/controle-producao" replace />}
                  />
                  <Route
                    path="/pcp/producao/ordens"
                    element={<Navigate to="/pcp/controle-producao/ordens" replace />}
                  />
                  <Route
                    path="/pcp/producao/ordens/:opId"
                    element={<Navigate to="/pcp/controle-producao/ordens/:opId" replace />}
                  />
                  <Route
                    path="/pcp/producao/apontamentos"
                    element={<Navigate to="/pcp/controle-producao/apontamentos" replace />}
                  />
                  <Route
                    path="/pcp/producao/historico"
                    element={<Navigate to="/pcp/controle-producao/historico" replace />}
                  />
                  <Route
                    path="/pcp/producao/ia-analises"
                    element={<Navigate to="/pcp/controle-producao/analise" replace />}
                  />
                  <Route
                    path="/pcp/producao/analise"
                    element={<Navigate to="/pcp/controle-producao/analise" replace />}
                  />
                  <Route
                    path="/pcp/producao/pendencias"
                    element={<Navigate to="/pcp/controle-producao/pendencias" replace />}
                  />
                  <Route
                    path="/pcp/producao/desvios"
                    element={<Navigate to="/pcp/controle-producao/desvios" replace />}
                  />
                  <Route
                    path="/pcp/producao/comparativo"
                    element={<Navigate to="/pcp/controle-producao/comparativo" replace />}
                  />
                  <Route
                    path="/pcp/producao/zpp-01"
                    element={<Navigate to="/pcp/controle-producao/zpp-01" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/producao"
                    element={<Navigate to="/pcp/controle-producao" replace />}
                  />
                  <Route
                    path="/controle-producao"
                    element={<Navigate to="/pcp/controle-producao" replace />}
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
                  <Route
                    path="/pcp/configuracoes"
                    element={<Navigate to="/pcp/admin/acessos" replace />}
                  />
                  <Route
                    path="/pcp/configuracoes-acessos"
                    element={<Navigate to="/pcp/admin/acessos" replace />}
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
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
                  />
                  <Route
                    path="/pcp-robotizado/administracao/ficha-mestre"
                    element={<Navigate to="/pcp/cadastros/ficha-mestre" replace />}
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
            <OeeDrilldownModal />
          </OeeDrilldownProvider>
        </ControlTowerProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
export default App
