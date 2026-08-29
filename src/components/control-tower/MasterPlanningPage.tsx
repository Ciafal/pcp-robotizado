import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  BarChart2,
  AlertTriangle,
  History,
  Sliders,
  CheckCircle2,
  Users,
  Target,
  FileSpreadsheet,
  Zap,
  ArrowRight,
  Filter,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { masterPlanningService } from '@/services/master-planning-service'
import {
  MasterPlanHeader,
  MasterPlanItem,
  CRMForecastRecord,
  MasterPlanVersion,
  MasterPlanningKPIs,
  WhatIfSimulationParams,
  WhatIfSimulationResult,
} from '@/types/master-planning-inventory'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface MasterPlanningPageProps {
  initialHorizon?: 'ANUAL' | 'MENSAL' | 'SEMANAL'
}

export const MasterPlanningPage: React.FC<MasterPlanningPageProps> = ({ initialHorizon }) => {
  const { toast } = useToast()

  // 1. Navegação de Subtópicos Oficiais (Regra 18)
  const [activeTab, setActiveTab] = useState<string>('visao-geral')
  const [loading, setLoading] = useState(true)

  // 2. Dados Oficiais (SAP / CRM / PCP)
  const [plans, setPlans] = useState<MasterPlanHeader[]>([])
  const [activePlan, setActivePlan] = useState<MasterPlanHeader | null>(null)
  const [items, setItems] = useState<MasterPlanItem[]>([])
  const [crmForecasts, setCrmForecasts] = useState<CRMForecastRecord[]>([])
  const [versions, setVersions] = useState<MasterPlanVersion[]>([])
  const [kpis, setKpis] = useState<MasterPlanningKPIs | null>(null)

  // 3. Filtros Gerais Globais (Regra 10 e 19)
  const [selectedPlant, setSelectedPlant] = useState('ALL')
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [selectedNature, setSelectedNature] = useState('TODAS')
  const [selectedPeriod, setSelectedPeriod] = useState('2025-03')
  const [searchTerm, setSearchTerm] = useState('')

  // 4. Drill-Down da Aderência (Regra 21)
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<MasterPlanItem | null>(null)
  const [itemDetailModalOpen, setItemDetailModalOpen] = useState(false)
  const [deviationCause, setDeviationCause] = useState('')
  const [deviationJustification, setDeviationJustification] = useState('')
  const [actionPlan, setActionPlan] = useState('')

  // 5. Simulação "E Se?" (What-If) (Regra 32)
  const [simParams, setSimParams] = useState<WhatIfSimulationParams>({
    crmOpportunitiesConversionChangePct: 0,
    salesVolumeChangePct: 0,
    keyCustomerPostponed: false,
    mpArrivalDelayDays: 0,
    lineCapacityLossPct: 0,
    forecastShiftPct: 0,
  })
  const [simResult, setSimResult] = useState<WhatIfSimulationResult | null>(null)

  // 6. IA do Planejamento (Regras 30, 34)
  const [aiPlanningRunning, setAiPlanningRunning] = useState(false)
  const [aiReport, setAiReport] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const fetchedPlans = await masterPlanningService.getMasterPlans({
        plantCode: selectedPlant,
        periodRef: selectedPeriod,
      })
      const fetchedItems = await masterPlanningService.getPlanItems({
        plantCode: selectedPlant,
        lineCode: selectedLine,
      })
      const fetchedCRM = await masterPlanningService.getCRMForecast({
        periodRef: selectedPeriod,
      })
      const fetchedVersions = await masterPlanningService.getPlanVersions()

      setPlans(fetchedPlans)
      const currentPlan = fetchedPlans[0] || null
      setActivePlan(currentPlan)
      setItems(fetchedItems)
      setCrmForecasts(fetchedCRM)
      setVersions(fetchedVersions)

      const calculatedKpis = masterPlanningService.getKPIs(fetchedItems, currentPlan || undefined)
      setKpis(calculatedKpis)

      // Executar simulação inicial
      const initialSim = masterPlanningService.simulateWhatIf(fetchedItems, simParams)
      setSimResult(initialSim)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar Planejamento Mestre',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedPlant, selectedLine, selectedPeriod])

  const handleRunAiPlanningAnalysis = () => {
    setAiPlanningRunning(true)
    setTimeout(() => {
      setAiPlanningRunning(false)
      setAiReport(
        `DIAGNÓSTICO PREDITIVO DE IA — PLANEJAMENTO MESTRE CIAFAL\n\n` +
          `1. SEPARAÇÃO ESTRITA DE RESPONSABILIDADES (Regra 30):\n` +
          `• Problema de Planejamento: Família Tubos Estruturais apresenta Bias Positivo (+8.4%). CRM superestimou vendas na região Sudeste gerando 180 t em excesso no pátio.\n` +
          `• Problema de Programação: Linha 1 sofreu perda de mix no sequenciamento devido à restrição de tarugo SAE 1045 no Centro 1000.\n` +
          `• Problema de Execução: Linha 2 operou com OEE 4.2% abaixo da meta por parada não programada em redutor mecânico.\n\n` +
          `2. GOVERNANÇA DO PLANO (Regra 34):\n` +
          `• A IA identifica oportunidade de redução de 12% no lote mensal de Perfis Leves. Nenhuma alteração automática foi efetuada no S&OP.`,
      )
      toast({
        title: 'Análise de IA Concluída',
        description: 'Diagnóstico multidimensional de planejamento gerado.',
      })
    }, 800)
  }

  const handleSaveItemDeviation = async () => {
    if (!selectedItemForDetail) return
    const ok = await masterPlanningService.updateItemDeviation(selectedItemForDetail.id, {
      deviation_cause: deviationCause,
      deviation_justification: deviationJustification,
      action_plan: actionPlan,
    })
    if (ok) {
      toast({
        title: 'Desvio Registrado',
        description: 'Justificativa e plano de ação gravados na rastreabilidade oficial.',
      })
      setItemDetailModalOpen(false)
      loadData()
    }
  }

  const handleRunSimulation = () => {
    const res = masterPlanningService.simulateWhatIf(items, simParams)
    setSimResult(res)
    toast({
      title: 'Simulação "E Se?" Calculada',
      description: `Índice de Viabilidade Industrial: ${res.feasibilityScorePct}%`,
    })
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Oficial CIAFAL Pantone 2945 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Planejamento Mestre de Produção (PMP / S&OP)
              </h1>
              <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-[10px] font-bold">
                Versão Vigente Oficial &bull; CRM 360º &bull; SAP ECC
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Governança corporativa de aderência (Volume, Mix e Temporal), acuracidade de forecast
              e simulações industriais.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={loadData}
            variant="outline"
            className="text-xs text-slate-700 h-8 gap-1 border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Plano
          </Button>
        </div>
      </div>

      {/* 2. Filtros Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todos os Centros SAP</option>
            <option value="1000">1000 - Divinópolis</option>
            <option value="2000">2000 - Contagem</option>
          </select>
        </div>

        <div>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todas as Linhas PCP</option>
            <option value="L1">L1 - Laminação</option>
            <option value="L2">L2 - Perfis & Trefila</option>
            <option value="SDC">SDC - Corte e Dobra</option>
          </select>
        </div>

        <div>
          <select
            value={selectedNature}
            onChange={(e) => setSelectedNature(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="TODAS">Natureza: Todas</option>
            <option value="PRODUCAO_PROPRIA">Produção Própria</option>
            <option value="INDUSTRIALIZACAO">Industrialização</option>
          </select>
        </div>

        <div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="2025-03">Ciclo Março / 2025</option>
            <option value="2025-04">Ciclo Abril / 2025</option>
            <option value="2025-Q1">1º Trimestre / 2025</option>
            <option value="2025-YEAR">Plano Anual 2025</option>
          </select>
        </div>

        <div>
          <Input
            placeholder="Filtrar produto / aço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-50 border-slate-300 text-xs h-8"
          />
        </div>
      </div>

      {/* 3. Subtópicos Oficiais (Regra 18) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 border border-slate-200 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="visao-geral"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="plano-mensal"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Plano Mensal / Anual
          </TabsTrigger>
          <TabsTrigger
            value="demanda-crm"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Demanda & Previsibilidade CRM 360º ({crmForecasts.length})
          </TabsTrigger>
          <TabsTrigger
            value="aderencia"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Aderência Programado × Realizado
          </TabsTrigger>
          <TabsTrigger
            value="desvios-causas"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Desvios & Causas
          </TabsTrigger>
          <TabsTrigger
            value="forecast-ia"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Forecast IA & Simulações
          </TabsTrigger>
          <TabsTrigger
            value="historico-versoes"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Histórico & Versões ({versions.length})
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: VISÃO GERAL — KPIS MULTIDIMENSIONAIS (Regras 19, 20, 26, 28)
           ========================================================================= */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="bg-white border-slate-200 shadow-sm p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Aderência Geral (PMP)
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-[#004C97] font-mono">
                  {kpis ? kpis.adherenceOverallPct : 0}%
                </span>
              </div>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Ponderada (Vol+Mix+Temp)
              </span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Aderência de Mix
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-amber-700 font-mono">
                  {kpis ? kpis.adherenceMixPct : 0}%
                </span>
              </div>
              <span className="text-[9px] text-amber-700 font-semibold block mt-0.5">
                Sem falsa aderência
              </span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Aderência de Volume
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-800 font-mono">
                  {kpis ? kpis.adherenceVolumePct : 0}%
                </span>
              </div>
              <span className="text-[9px] text-slate-500 block mt-0.5">Realizado vs Planejado</span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Forecast Accuracy
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {kpis ? kpis.forecastAccuracyPct : 0}%
                </span>
              </div>
              <span className="text-[9px] text-emerald-700 font-semibold block mt-0.5">
                Acuracidade CRM
              </span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Forecast Bias
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={`text-xl font-black font-mono ${(kpis?.forecastBiasPct ?? 0) > 0 ? 'text-rose-600' : 'text-blue-700'}`}
                >
                  {kpis
                    ? kpis.forecastBiasPct > 0
                      ? `+${kpis.forecastBiasPct}%`
                      : `${kpis.forecastBiasPct}%`
                    : '0%'}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                {kpis?.forecastBiasType === 'POSITIVE_BIAS_OVERPLANNING'
                  ? 'Bias Positivo (Risco Excesso)'
                  : 'Bias Equilibrado'}
              </span>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Volume Total Planejado
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-black text-slate-900 font-mono">
                  {kpis ? kpis.totalPlannedTons.toLocaleString('pt-BR') : '0'}
                </span>
                <span className="text-xs font-bold text-slate-400">t</span>
              </div>
              <span className="text-[9px] text-slate-500 block mt-0.5">
                Capacidade 100% alocada
              </span>
            </Card>
          </div>

          {/* Matriz Integrada de Demanda e Produção (Regra 25, 36) */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Balanço Integrado: Demanda &times; Planejamento &times; Execução
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Comparação por produto: Previsto CRM &bull; Planejado PCP &bull; Programado
                    &bull; Produzido &bull; Venda Real.
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-700 text-xs">
                  Padrão em Toneladas (t)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Produto / SKU</th>
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3 text-right">Previsto CRM (t)</th>
                    <th className="py-2.5 px-3 text-right">Planejado PCP (t)</th>
                    <th className="py-2.5 px-3 text-right">Programado (t)</th>
                    <th className="py-2.5 px-3 text-right">Produzido (t)</th>
                    <th className="py-2.5 px-3 text-right">Venda Real (t)</th>
                    <th className="py-2.5 px-3 text-center">Aderência Mix</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {item.product_code} &bull; {item.steel_grade}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{item.line_code}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {item.crm_forecast_tons.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#004C97]">
                        {item.planned_tons.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {item.programmed_tons.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {item.produced_tons.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {item.firm_sales_tons.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        <Badge
                          className={
                            item.adherence_mix_pct >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {item.adherence_mix_pct}%
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedItemForDetail(item)
                            setDeviationCause(item.deviation_cause || '')
                            setDeviationJustification(item.deviation_justification || '')
                            setActionPlan(item.action_plan || '')
                            setItemDetailModalOpen(true)
                          }}
                          className="h-7 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold"
                        >
                          Drill-down &rarr;
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: PLANO MENSAL / ANUAL (Regra 18)
           ========================================================================= */}
        <TabsContent value="plano-mensal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <Card key={p.id} className="bg-white border-slate-200 shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <Badge className="bg-blue-100 text-[#004C97] text-[10px] font-bold">
                      {p.horizon_type}
                    </Badge>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{p.title}</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Ref: {p.period_ref} &bull; v{p.version}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">{p.status}</Badge>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">Volume Planejado</span>
                    <span className="font-mono font-bold text-slate-800">
                      {p.total_planned_tons.toLocaleString('pt-BR')} t
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Aderência Geral</span>
                    <span className="font-mono font-bold text-[#004C97]">
                      {p.adherence_overall_pct}%
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 3: DEMANDA & PREVISIBILIDADE CRM 360º (Regras 23, 24)
           ========================================================================= */}
        <TabsContent value="demanda-crm" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Camadas de Demanda Comercial Integradas (CRM 360º)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Separação estrita: Demanda Firme (Carteira), Demanda Planejada (PMP), Comercial
                    Provável e Oportunidades Ponderadas.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-xs">
                  Integração CRM Ativa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Cliente / Razão Social</th>
                    <th className="py-2.5 px-3">Vendedor / Região</th>
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3 text-center">Camada de Demanda</th>
                    <th className="py-2.5 px-3 text-center">Probabilidade</th>
                    <th className="py-2.5 px-3 text-right">Volume Provável (t)</th>
                    <th className="py-2.5 px-3 text-right">Demanda Ponderada (t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crmForecasts.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{rec.customer_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {rec.sales_rep_name} ({rec.region})
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{rec.product_name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge className="bg-slate-100 text-slate-800 text-[10px]">
                          {rec.demand_layer.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-[#004C97]">
                        {rec.probability_pct}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {rec.quantity_tons.toFixed(1)} t
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {rec.weighted_tons.toFixed(1)} t
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 4: ADERÊNCIA MULTIDIMENSIONAL (Regras 19, 20)
           ========================================================================= */}
        <TabsContent value="aderencia" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                Aderência de Volume
              </CardTitle>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                {kpis?.adherenceVolumePct}%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Capacidade total executada versus plano consolidado em toneladas.
              </p>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                Aderência de Mix (SKU a SKU)
              </CardTitle>
              <div className="text-2xl font-black text-amber-700 font-mono mt-1">
                {kpis?.adherenceMixPct}%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Inibe falsa aderência por compensação indevida entre bitolas/aços.
              </p>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm p-4">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase">
                Aderência Temporal (No Prazo)
              </CardTitle>
              <div className="text-2xl font-black text-[#004C97] font-mono mt-1">
                {kpis?.adherenceTemporalPct}%
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Cumprimento das janelas de produção acordadas no S&OP.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* =========================================================================
            TAB 5: DESVIOS & CAUSAS (Regra 22)
           ========================================================================= */}
        <TabsContent value="desvios-causas" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Taxonomia Oficial de Desvios do Planejamento Mestre
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Causas padronizadas: Planejamento (S&OP/Forecast), Programação (Sequenciamento) e
                Execução (Fábrica).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Produto</th>
                    <th className="py-2.5 px-3">Linha</th>
                    <th className="py-2.5 px-3 text-right">Gap de Produção (t)</th>
                    <th className="py-2.5 px-3">Causa Raiz Classificada</th>
                    <th className="py-2.5 px-3">Justificativa / Parecer</th>
                    <th className="py-2.5 px-3">Plano de Ação Corretivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.product_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{item.line_code}</td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${item.gap_tons > 0 ? 'text-rose-600' : 'text-slate-500'}`}
                      >
                        {item.gap_tons > 0 ? `-${item.gap_tons.toFixed(1)} t` : '0.0 t'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.deviation_cause || 'Sem Desvio Crítico'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {item.deviation_justification || '--'}
                      </td>
                      <td className="py-2.5 px-3 text-[#004C97] font-semibold">
                        {item.action_plan || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 6: FORECAST IA & SIMULAÇÕES "E SE?" (Regras 27, 30, 32)
           ========================================================================= */}
        <TabsContent value="forecast-ia" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Simulador "E Se?" (What-If) & Análise Preditiva de Cenários
              </h2>
              <p className="text-xs text-slate-500">
                Teste impactos na cadeia (MP, Semiacabados, Capacidade e S&OP) antes de validar
                alterações.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleRunAiPlanningAnalysis}
              disabled={aiPlanningRunning}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5 h-8"
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiPlanningRunning ? 'animate-spin' : ''}`} />
              {aiPlanningRunning ? 'Analisando...' : 'Analisar Planejamento com IA'}
            </Button>
          </div>

          {aiReport && (
            <Card className="bg-blue-50/50 border-blue-200 shadow-sm p-4">
              <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-blue-100">
                {aiReport}
              </pre>
            </Card>
          )}

          {/* Painel de Parâmetros do Simulador */}
          <Card className="bg-white border-slate-200 shadow-sm p-4">
            <CardTitle className="text-sm font-bold text-slate-900 mb-3">
              Parâmetros da Simulação Industrial
            </CardTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Variação de Demanda Comercial (%)
                </Label>
                <Input
                  type="number"
                  value={simParams.salesVolumeChangePct}
                  onChange={(e) =>
                    setSimParams({ ...simParams, salesVolumeChangePct: Number(e.target.value) })
                  }
                  className="mt-1 h-8 bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Conversão de Oportunidades CRM (%)
                </Label>
                <Input
                  type="number"
                  value={simParams.crmOpportunitiesConversionChangePct}
                  onChange={(e) =>
                    setSimParams({
                      ...simParams,
                      crmOpportunitiesConversionChangePct: Number(e.target.value),
                    })
                  }
                  className="mt-1 h-8 bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Atraso na Chegada de MP (Dias)
                </Label>
                <Input
                  type="number"
                  value={simParams.mpArrivalDelayDays}
                  onChange={(e) =>
                    setSimParams({ ...simParams, mpArrivalDelayDays: Number(e.target.value) })
                  }
                  className="mt-1 h-8 bg-slate-50 border-slate-300"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Perda de Capacidade em Linha (%)
                </Label>
                <Input
                  type="number"
                  value={simParams.lineCapacityLossPct}
                  onChange={(e) =>
                    setSimParams({ ...simParams, lineCapacityLossPct: Number(e.target.value) })
                  }
                  className="mt-1 h-8 bg-slate-50 border-slate-300"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                size="sm"
                onClick={handleRunSimulation}
                className="bg-[#004C97] text-white text-xs font-semibold"
              >
                Executar Simulação
              </Button>
            </div>
          </Card>

          {/* Resultado da Simulação */}
          {simResult && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Card className="bg-white border-slate-200 shadow-sm p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Demanda Total Simulada
                </span>
                <div className="text-xl font-black text-slate-900 font-mono mt-1">
                  {simResult.simulatedDemandTons.toLocaleString('pt-BR')} t
                </div>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Necessidade de MP
                </span>
                <div className="text-xl font-black text-amber-800 font-mono mt-1">
                  {simResult.requiredMpTons.toLocaleString('pt-BR')} t
                </div>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Ocupação de Linhas
                </span>
                <div
                  className={`text-xl font-black font-mono mt-1 ${simResult.lineCapacityUtilizationPct > 100 ? 'text-rose-600' : 'text-emerald-700'}`}
                >
                  {simResult.lineCapacityUtilizationPct}%
                </div>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Viabilidade Industrial
                </span>
                <div className="text-xl font-black text-[#004C97] font-mono mt-1">
                  {simResult.feasibilityScorePct}%
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 7: HISTÓRICO & VERSIONAMENTO (Regra 33)
           ========================================================================= */}
        <TabsContent value="historico-versoes" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Snapshots & Versionamento do Plano Mestre
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Preservação histórica da versão vigente no momento exato da execução para
                conferência justa de aderência.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Versão</th>
                    <th className="py-2.5 px-3">Ciclo</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3">Vigência De</th>
                    <th className="py-2.5 px-3 text-right">Volume Planejado (t)</th>
                    <th className="py-2.5 px-3">Motivo da Alteração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {versions.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#004C97]">
                        v{v.version_number}.0
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">{v.period_ref}</td>
                      <td className="py-2.5 px-3 text-slate-800">{v.author_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{v.valid_from}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {v.total_planned_tons.toLocaleString('pt-BR')} t
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{v.change_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DRILL-DOWN E JUSTIFICATIVA DE DESVIO DO PLANO MESTRE */}
      <Dialog open={itemDetailModalOpen} onOpenChange={setItemDetailModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Drill-down: {selectedItemForDetail?.product_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs py-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
              <div>
                <strong className="text-slate-700">Planejado:</strong>{' '}
                {selectedItemForDetail?.planned_tons} t
              </div>
              <div>
                <strong className="text-slate-700">Produzido:</strong>{' '}
                {selectedItemForDetail?.produced_tons} t
              </div>
              <div>
                <strong className="text-slate-700">Venda Real:</strong>{' '}
                {selectedItemForDetail?.firm_sales_tons} t
              </div>
              <div>
                <strong className="text-slate-700">Gap:</strong> {selectedItemForDetail?.gap_tons} t
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Causa Raiz Padronizada
              </Label>
              <select
                value={deviationCause}
                onChange={(e) => setDeviationCause(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
              >
                <option value="">Selecione a Causa Raiz...</option>
                <option value="ALTERACAO_DEMANDA">Alteração de Demanda / Vendas</option>
                <option value="INDISPONIBILIDADE_MP">Indisponibilidade de Matéria-Prima</option>
                <option value="INDISPONIBILIDADE_SEMI">Indisponibilidade de Semiacabado</option>
                <option value="PARADA_EQUIPAMENTO">Parada de Equipamento / Manutenção</option>
                <option value="QUALIDADE_RETENCAO">Qualidade / Retenção de Lote</option>
                <option value="DECISAO_COMERCIAL">Decisão Comercial / Priorização</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Justificativa Técnica
              </Label>
              <Input
                placeholder="Ex: Atraso na entrega de tarugos pela usina parceira..."
                value={deviationJustification}
                onChange={(e) => setDeviationJustification(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Plano de Ação</Label>
              <Input
                placeholder="Ex: Compensar volume na semana 3 com abertura de 3º turno..."
                value={actionPlan}
                onChange={(e) => setActionPlan(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setItemDetailModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveItemDeviation}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Gravar Desvio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MasterPlanningPage
