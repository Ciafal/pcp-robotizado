/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import Layout from './components/Layout'

import Index from './pages/Index'
import AccessAdminPage from './pages/AccessAdminPage'
import AuditPage from './pages/AuditPage'
import LineResponsiblesPage from './pages/LineResponsiblesPage'
import SchedulesPage from './pages/SchedulesPage'
import { ModulePreparationPage } from './pages/ModulePreparationPage'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route element={<Layout />}>
            {/* Redirecionamento de raiz para /pcp-robotizado */}
            <Route path="/" element={<Index />} />
            <Route path="/pcp-robotizado" element={<Index />} />

            {/* Programações e Sequenciamento */}
            <Route
              path="/pcp-robotizado/programacoes"
              element={
                <PermissionGuard permission="pcp.schedule.view">
                  <SchedulesPage />
                </PermissionGuard>
              }
            />

            {/* Administração de Perfis, Escopos e RBAC */}
            <Route
              path="/pcp-robotizado/admin/acessos"
              element={
                <PermissionGuard permission="pcp.admin.access">
                  <AccessAdminPage />
                </PermissionGuard>
              }
            />

            {/* Trilha de Auditoria de Segurança */}
            <Route
              path="/pcp-robotizado/auditoria"
              element={
                <PermissionGuard permission="pcp.audit.view">
                  <AuditPage />
                </PermissionGuard>
              }
            />

            {/* Gestão de Gestores de Linha & Delegações */}
            <Route
              path="/pcp-robotizado/linhas-responsaveis"
              element={
                <PermissionGuard permission="pcp.masterdata.view">
                  <LineResponsiblesPage />
                </PermissionGuard>
              }
            />

            {/* Módulos em Preparação Estrutural para os próximos Prompts */}
            <Route
              path="/pcp-robotizado/planejamento-mestre"
              element={
                <PermissionGuard permission="pcp.masterplan.view">
                  <ModulePreparationPage
                    title="Planejamento Mestre de Produção"
                    subtitle="Visão agregada de horizonte de produção, carteira e restrições fabris."
                    targetPrompt="Visão Geral do Planejamento Mestre"
                    requiredPerm="pcp.masterplan.view"
                    features={[
                      'Horizonte de planejamento integrado por linha e centro',
                      'Restrição por escopo operacional de unidade/planta',
                      'Controle de publicação e simulações com Least Privilege',
                    ]}
                  />
                </PermissionGuard>
              }
            />

            <Route
              path="/pcp-robotizado/ficha-mestre"
              element={
                <PermissionGuard permission="pcp.masterdata.view">
                  <ModulePreparationPage
                    title="Ficha Mestre das Linhas de Produção"
                    subtitle="Matriz de parâmetros técnicos, capacidades nominais, tempos de setup e restrições térmicas."
                    targetPrompt="PROMPT 03 — Ficha Mestre das Linhas"
                    requiredPerm="pcp.masterdata.view"
                    features={[
                      'Parâmetros técnicos protegidos por permissão específica (pcp.masterdata.edit)',
                      'Controle de versionamento com justificativa obrigatória',
                      'Object-level authorization garantindo isolamento por linha',
                      'Preparado para receber extrações de normas e manuais CIAFAL',
                    ]}
                  />
                </PermissionGuard>
              }
            />

            <Route
              path="/pcp-robotizado/regras"
              element={
                <PermissionGuard permission="pcp.rules.view">
                  <ModulePreparationPage
                    title="Matriz Mestre de Regras & Rule Packs"
                    subtitle="Repositório versionado de regras industriais, pesos de sequenciamento e restrições SAP."
                    targetPrompt="PROMPT 04 — Rule Packs & Motor de Regras"
                    requiredPerm="pcp.rules.view"
                    features={[
                      'Programador PCP pode visualizar regras (pcp.rules.view)',
                      'Alteração de regras exige aprovação e permissão crítica (pcp.rules.edit / pcp.rules.approve)',
                      'Histórico auditável de modificações e versionamento de regras',
                    ]}
                  />
                </PermissionGuard>
              }
            />

            <Route
              path="/pcp-robotizado/aprovacoes"
              element={
                <PermissionGuard permission="pcp.approval.view">
                  <ModulePreparationPage
                    title="Central de Aprovações e Homologações"
                    subtitle="Esteira de aprovação formal de programações em 2 fases (PCP e Gestor da Linha)."
                    targetPrompt="Esteira de Aprovações em Duas Fases"
                    requiredPerm="pcp.approval.view"
                    features={[
                      'Fase 1: Liberação técnica por Programador PCP (pcp.schedule.approve.pcp)',
                      'Fase 2: Homologação operacional pelo Gestor Titular da Linha (pcp.schedule.approve.manager)',
                      'Segregação de funções (SoD) nativa no modelo RBAC',
                    ]}
                  />
                </PermissionGuard>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
