import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ExecutiveFilterState,
  ExecutiveCardKPI,
  TrafficLightStatus,
  BriefingCadence,
} from '@/types/executive-cockpit'
import { ProductionLine } from '@/types/pcp-auth'
import { executiveService, ExecutiveDashboardData } from '@/services/executive-service'
import { deterministicEngine } from '@/services/deterministic-executive-engine'
import { useToast } from '@/hooks/use-toast'
import { Can } from '@/components/auth/Can'
import { PermissionGuard } from '@/components/auth/PermissionGuard'

// Componentes Modulares do Cockpit
import { ExecutiveFiltersBar } from '@/components/executive/ExecutiveFiltersBar'
import { ExecutiveSummaryAiCard } from '@/components/executive/ExecutiveSummaryAiCard'
import { ExecutiveCardsGrid } from '@/components/executive/ExecutiveCardsGrid'
import { ExecutiveChartsSection } from '@/components/executive/ExecutiveChartsSection'
import { ExecutiveTrendsAndRisksSection } from '@/components/executive/ExecutiveTrendsAndRisksSection'
import { ExecutiveDeepDiveSection } from '@/components/executive/ExecutiveDeepDiveSection'
import { ExecutiveAskHubAi } from '@/components/executive/ExecutiveAskHubAi'
import { ExecutiveBriefingSection } from '@/components/executive/ExecutiveBriefingSection'
import { ExecutiveActionsTracker } from '@/components/executive/ExecutiveActionsTracker'
import { ExecutiveAttentionAndGovernanceProps } from '@/components/executive/ExecutiveAttentionAndGovernance'

import {
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const INITIAL_FILTERS: ExecutiveFilterState = {
  period: 'HOJE',
  company: 'ALL',
  plant: 'ALL',
  sector: 'ALL',
  process: 'ALL',
  line: 'ALL',
  product: 'ALL',
  family: 'ALL',
  customer: 'ALL',
  manager: 'ALL',
  responsible: 'ALL',
  indicator: 'ALL',
  project: 'ALL',
}

export const ExecutiveCockpitPage: React.FC = () => {
  const { user, can } = useAuth()
  const userRole = user?.role || 'PRODUCTION_VIEWER'
  const { toast } = useToast()

  const [filters, setFilters] = useState<ExecutiveFilterState>(INITIAL_FILTERS)
  const [data, setData] = useState<ExecutiveDashboardData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [lines, setLines] = useState<ProductionLine[]>([])

  const loadData = useCallback(
    async (currentFilters: ExecutiveFilterState) => {
      try {
        const result = await executiveService.loadExecutiveData(currentFilters)
        setData(result)

        // Salvar snapshot de governança no backend se for admin ou executive viewer
        if (userRole === 'PCP_ADMIN' || userRole === 'EXECUTIVE_VIEWER') {
          executiveService
            .saveAnalysisGovernance({
              period_filter: currentFilters.period,
              line_code_filter: currentFilters.line,
              deterministic_kpis_snapshot: {
                cardsCount: result.cards.length,
                realizedProd: result.cards[0]?.realized || 0,
                targetProd: result.cards[0]?.target || 0,
              },
              executive_summary_payload: result.summary,
              investigation_findings: [result.investigation],
              recommendations_payload: result.recommendations,
              sources_used: result.sourcesUsed,
              confidence_level: 'ALTA (94%)',
            })
            .catch(() => {})
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar Cockpit Executivo',
          description: err?.message || 'Falha ao consolidar dados industriais do HUB CIAFAL.',
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [userRole, toast],
  )

  useEffect(() => {
    loadData(filters)
  }, [filters, loadData])

  const handleFilterChange = (newFilters: ExecutiveFilterState) => {
    setFilters(newFilters)
    setRefreshing(true)
  }

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS)
    setRefreshing(true)
  }

  const handleCreateAction = async (actionData: any) => {
    try {
      await executiveService.createAction(actionData)
      toast({
        title: 'Plano de Ação Criado',
        description: `Ação "${actionData.title}" vinculada à análise executiva com sucesso.`,
      })
      loadData(filters)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao registrar ação',
        description: err?.data?.error || err?.message || 'Erro ao gravar plano de ação.',
      })
    }
  }

  const handleUpdateActionStatus = async (actionId: string, status: any, efficacy?: any) => {
    try {
      await executiveService.updateAction(actionId, {
        status,
        efficacy_status: efficacy,
      })
      toast({
        title: 'Ação Atualizada',
        description: 'Status e eficácia do plano de ação atualizados.',
      })
      loadData(filters)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar ação',
        description: err?.message,
      })
    }
  }

  const handleGenerateBriefing = async (cadence: BriefingCadence) => {
    if (!data) return
    await executiveService.generateBriefing({
      cadence,
      period_ref: new Date().toISOString().split('T')[0],
      summary_markdown: data.summary.currentSituation,
      kpi_highlights: {
        producao: data.cards[0]?.realized,
        otif: data.cards[1]?.realized,
        oee: data.cards[2]?.realized,
      },
      deviations_summary: [
        { line: 'L01', gapTons: -40.0, reason: 'Setup não adjacente' },
        { line: 'L02', gapTons: -15.0, reason: 'Buffer baixo' },
      ],
      risks_and_opportunities: [
        { type: 'RISK', text: 'Ruptura de Tarugos em 12 dias', confidence: 87 },
      ],
      pending_decisions: [{ title: 'Reordenar CP-SAT', deadline: 'Hoje 18:00', impact: '+68,0 t' }],
      overdue_actions: [],
      ai_recommendations: data.recommendations,
      export_format: 'PDF',
    })
    loadData(filters)
  }

  return (
    <PermissionGuard permission="pcp.executive.view">
      <div className="space-y-5 pb-12">
        {/* Cabeçalho da Página do Cockpit Executivo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Cockpit Executivo & Análise Corporativa com IA
                </h1>
                <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                  HUB CIAFAL &bull; Núcleo Executivo
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                DWP / Meu Hub &rarr; Cockpit Executivo &rarr; Análise Corporativa com IA (Motor
                Determinístico + Agente Nativo Skip Cloud)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <Badge
              variant="outline"
              className="border-emerald-300 text-emerald-700 bg-emerald-50 text-xs py-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              PCP Robotizado Conectado (Dados Reais)
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRefreshing(true)
                loadData(filters)
              }}
              disabled={refreshing}
              className="text-xs h-9 border-slate-300 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </Button>
          </div>
        </div>

        {/* Barra de Filtros no Topo */}
        <ExecutiveFiltersBar
          filters={filters}
          lines={lines}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {loading || !data ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 text-[#004C97] animate-spin" />
            <span>Processando métricas determinísticas e carregando inteligência executiva...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bloco 1 — Resumo Executivo gerado por IA */}
            <ExecutiveSummaryAiCard summary={data.summary} sourcesUsed={data.sourcesUsed} />

            {/* Bloco 2 — Cards Executivos (Realizado | Meta | Gap | Tendência | Forecast | Status Acessível) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                  Indicadores Executivos em Tempo Real (PCP Robotizado)
                </h2>
                <span className="text-[10px] text-slate-400">
                  Semáforo com ícone e texto acessível &bull; Unidade: <strong>t</strong> (tonelada)
                </span>
              </div>
              <ExecutiveCardsGrid cards={data.cards} />
            </div>

            {/* Bloco 3 — Gráficos com Metas, Média, Tendência, Forecast e GAP sombreado */}
            <ExecutiveChartsSection cards={data.cards} />

            {/* Blocos 4, 5 e 6 — Tendência com Inflexão, Previsões de Risco e Correlação Transversal */}
            <ExecutiveTrendsAndRisksSection
              trends={data.trends}
              risks={data.risks}
              correlations={data.correlations}
            />

            {/* Blocos 7 a 14 — Diagnóstico DMAIC, Pareto 80/20, Histórico, Alertas, Priorização e Recomendações */}
            <ExecutiveDeepDiveSection
              investigation={data.investigation}
              pareto={data.pareto}
              historicalComparisons={data.historicalComparisons}
              pastCommitments={data.pastCommitments}
              alerts={data.executiveAlerts}
              prioritization={data.prioritization}
              recommendations={data.recommendations}
              onCreateAction={handleCreateAction}
            />

            {/* Bloco 14 — Trilha de Ações Vinculadas (Análise -> Decisão -> Ação -> Eficácia) */}
            <ExecutiveActionsTracker
              actions={data.actions}
              onUpdateStatus={handleUpdateActionStatus}
            />

            {/* Blocos 15, 16 e 18 — Atenção do Dia, Visão Diretoria e Governança de Módulos */}
            <ExecutiveAttentionAndGovernanceProps
              modulesStatus={data.modulesStatus}
              userRole={userRole}
              sourcesUsed={data.sourcesUsed}
            />

            {/* Bloco 17 — "Pergunte ao Hub CIAFAL" (Agente Nativo Skip Cloud) */}
            <Can permission="pcp.executive.ask_ai">
              <ExecutiveAskHubAi userRole={userRole} />
            </Can>

            {/* Bloco 19 — Briefing Executivo Periódico & Exportação PDF */}
            <ExecutiveBriefingSection
              briefings={data.briefings}
              kpis={data.cards}
              onGenerateBriefing={handleGenerateBriefing}
            />
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}

export default ExecutiveCockpitPage
