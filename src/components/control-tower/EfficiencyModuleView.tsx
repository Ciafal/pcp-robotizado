import React, { useState } from 'react'
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle,
  Clock,
  Zap,
  ArrowRight,
  Filter,
  BarChart3,
  Building2,
  Factory,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface EfficiencyViewProps {
  initialTab?: 'produtos' | 'linhas' | 'plantas' | 'assertividade'
}

export const EfficiencyModuleView: React.FC<EfficiencyViewProps> = ({
  initialTab = 'produtos',
}) => {
  const {
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    productPerformances,
    scheduleAssertiveness,
    productionDeviations,
    addDeviationAction,
    proposeParamRevision,
    lines,
    plants,
  } = useControlTower()

  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'DENTRO_ESPERADO' | 'ATENCAO' | 'CRITICO'
  >('ALL')

  // Modal IA de Eficiência
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiAnalysisProduct, setAiAnalysisProduct] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Modal de Tratamento de Desvio
  const [selectedDeviation, setSelectedDeviation] = useState<any>(null)
  const [actionPlanInput, setActionPlanInput] = useState('')
  const [justificationInput, setJustificationInput] = useState('')
  const [responsibleInput, setResponsibleInput] = useState('')
  const [deadlineInput, setDeadlineInput] = useState('')

  // Filtragem de Produtos
  const filteredProducts = productPerformances.filter((p) => {
    if (filters.plantCode !== 'ALL' && p.plantCode !== filters.plantCode) return false
    if (filters.lineCode !== 'ALL' && p.lineCode !== filters.lineCode) return false
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        p.productCode.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.familyCode.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Disparar Análise com IA
  const handleRunAiAnalysis = (prod: any) => {
    setAiAnalysisProduct(prod)
    setAiLoading(true)
    setIsAiModalOpen(true)
    setTimeout(() => {
      setAiLoading(false)
    }, 600)
  }

  // Submeter Ação de Desvio
  const handleSaveAction = () => {
    if (!selectedDeviation) return
    addDeviationAction(
      selectedDeviation.id,
      actionPlanInput || selectedDeviation.actionPlan,
      justificationInput || selectedDeviation.justification,
      responsibleInput || selectedDeviation.responsibleName,
      deadlineInput || selectedDeviation.deadline,
    )
    setSelectedDeviation(null)
  }

  return (
    <div className="space-y-6">
      {/* Header com Contexto CIAFAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/20 border border-[#004C97]/40 flex items-center justify-center text-[#3b82f6]">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Eficiência Operacional & Assertividade do PCP
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] border-sky-500/30 text-sky-400 bg-sky-950/20 font-mono"
              >
                {filters.plantCode === 'ALL' ? 'Todas as Plantas' : `Planta ${filters.plantCode}`}{' '}
                &bull;{' '}
                {filters.lineCode === 'ALL' ? 'Todas as Linhas' : `Linha ${filters.lineCode}`}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Controle preventivo de ritmo, perdas industriais, assertividade de premissas e ciclo
              contínuo de aprendizado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleRunAiAnalysis(productPerformances[0])}
            className="gap-2 bg-gradient-to-r from-[#004C97] to-indigo-700 hover:from-[#003d7a] hover:to-indigo-800 text-white text-xs font-semibold shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            Analisar Eficiência com IA
          </Button>
        </div>
      </div>

      {/* Tabs Principais da Eficiência */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <TabsTrigger
            value="produtos"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            Eficiência por Produto
          </TabsTrigger>
          <TabsTrigger
            value="linhas"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            <Factory className="w-3.5 h-3.5 mr-1.5" />
            Eficiência por Linha
          </TabsTrigger>
          <TabsTrigger
            value="plantas"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5" />
            Eficiência por Planta
          </TabsTrigger>
          <TabsTrigger
            value="assertividade"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Assertividade da Programação
          </TabsTrigger>
          <TabsTrigger
            value="aprendizado"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Ciclo de Aprendizado ({productionDeviations.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Eficiência por Produto */}
        <TabsContent value="produtos" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <Input
                placeholder="Buscar por código, nome ou família..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[11px] text-slate-400">Status:</span>
              <div className="flex gap-1">
                {(['ALL', 'DENTRO_ESPERADO', 'ATENCAO', 'CRITICO'] as const).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatusFilter(st)}
                    className={cn(
                      'text-[10px] h-7 px-2.5 border',
                      statusFilter === st
                        ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                        : 'border-transparent text-slate-400 hover:text-white',
                    )}
                  >
                    {st === 'ALL' && 'Todos'}
                    {st === 'DENTRO_ESPERADO' && 'Excelente'}
                    {st === 'ATENCAO' && 'Atenção (Preventivo)'}
                    {st === 'CRITICO' && 'Crítico'}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => {
              const isBelowExpected = prod.currentEfficiencyPct < prod.expectedEfficiencyPct
              const isCritical = prod.currentEfficiencyPct < prod.minEfficiencyPct

              return (
                <Card
                  key={prod.id}
                  className={cn(
                    'bg-slate-900 border transition-all hover:shadow-md',
                    isCritical
                      ? 'border-rose-900/80 bg-rose-950/10'
                      : isBelowExpected
                        ? 'border-amber-900/60 bg-amber-950/10'
                        : 'border-slate-800',
                  )}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-sky-400 font-semibold">
                          <span>{prod.productCode}</span>
                          <span className="text-slate-500">&bull;</span>
                          <span className="text-slate-400">Linha {prod.lineCode}</span>
                          <span className="text-slate-500">&bull;</span>
                          <span className="text-slate-500">v{prod.version}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white leading-tight mt-0.5">
                          {prod.productName}
                        </h4>
                      </div>

                      {isCritical ? (
                        <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                          CRÍTICO
                        </Badge>
                      ) : isBelowExpected ? (
                        <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px]">
                          ATENÇÃO PREVENTIVA
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px]">
                          DENTRO DO ESPERADO
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-2 space-y-3">
                    {/* Barra de Eficiência */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">Eficiência Realizada (OEE):</span>
                        <OeeInteractiveValue
                          value={prod.currentEfficiencyPct}
                          context={{
                            lineCode: prod.lineCode,
                            productCode: prod.productCode,
                            productName: prod.productName,
                            period: 'SHIFT',
                          }}
                          className={cn(
                            'font-bold cursor-pointer',
                            isCritical
                              ? 'text-rose-400'
                              : isBelowExpected
                                ? 'text-amber-400'
                                : 'text-emerald-400',
                          )}
                        />
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 relative">
                        {/* Linha de Referência Minima */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                          style={{ left: `${prod.minEfficiencyPct}%` }}
                          title={`Mínimo: ${prod.minEfficiencyPct}%`}
                        />
                        {/* Linha de Referência Esperada */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-sky-400 z-10"
                          style={{ left: `${prod.expectedEfficiencyPct}%` }}
                          title={`Esperado: ${prod.expectedEfficiencyPct}%`}
                        />
                        <div
                          className={cn(
                            'h-full transition-all',
                            isCritical
                              ? 'bg-rose-500'
                              : isBelowExpected
                                ? 'bg-amber-500'
                                : 'bg-emerald-500',
                          )}
                          style={{ width: `${prod.currentEfficiencyPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>Mín: {prod.minEfficiencyPct}%</span>
                        <span>Esperado: {prod.expectedEfficiencyPct}%</span>
                      </div>
                    </div>

                    {/* Cadência e Setup */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded border border-slate-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 block text-[9px]">
                          Capacidade Planejada
                        </span>
                        <span className="text-slate-200 font-semibold">
                          {prod.plannedCapacityRatePerHour} t/h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Faixa Esperada</span>
                        <span className="text-slate-300">
                          {prod.minCapacityRatePerHour}–{prod.maxCapacityRatePerHour} t/h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Setup Padrão</span>
                        <span className="text-slate-300">{prod.standardSetupMinutes} min</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">Rendimento Metálico</span>
                        <span className="text-slate-300">{prod.expectedYieldPct}%</span>
                      </div>
                    </div>

                    {/* Alerta Preventivo */}
                    {isBelowExpected && (
                      <div className="bg-amber-950/30 border border-amber-900/50 p-2 rounded text-[11px] text-amber-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Alerta Preventivo:</strong> Eficiência atual (
                          {prod.currentEfficiencyPct}%) está abaixo da meta esperada (
                          {prod.expectedEfficiencyPct}%).
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunAiAnalysis(prod)}
                        className="w-full text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-sky-300 gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-sky-400" /> Analisar Causa IA
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* 2. Eficiência por Linha */}
        <TabsContent value="linhas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lines.map((l) => (
              <Card key={l.code} className="bg-slate-900 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-mono text-sky-400">
                        Planta {l.plantCode} &bull; Linha {l.code}
                      </span>
                      <h3 className="text-base font-bold text-white">{l.name}</h3>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-slate-700 text-slate-300"
                    >
                      Cap. Nominal: 120 t/h
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">OEE Linha</div>
                      <OeeInteractiveValue
                        value={89.4}
                        context={{ lineCode: l.code, lineName: l.name, period: 'DAY' }}
                        className="text-emerald-400 hover:text-sky-300 font-bold text-sm justify-center"
                      />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Disponibilidade</div>
                      <div className="text-sky-400 font-bold text-sm">94.1%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Performance</div>
                      <div className="text-amber-400 font-bold text-sm">88.2%</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    A Linha {l.code} opera com mix diversificado. A restrição primária de ritmo
                    decorre de produtos pesados com setup elevado.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 3. Eficiência por Planta */}
        <TabsContent value="plantas" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plants.map((p) => (
              <Card key={p.code} className="bg-slate-900 border-slate-800">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-mono text-sky-400">
                        Empresa {p.companyCode}
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {p.name} ({p.code})
                      </h3>
                    </div>
                    <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[10px]">
                      {p.code === 'DIV' ? 'Divinópolis - MG' : 'Contagem - MG'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 text-center font-mono text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500">Aderência Global</div>
                      <div className="text-emerald-400 font-bold text-sm">97.4%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Ocupação Fabril</div>
                      <div className="text-sky-400 font-bold text-sm">91.0%</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Capacidade Perdida</div>
                      <div className="text-rose-400 font-bold text-sm">850 t</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 4. Assertividade da Programação PCP */}
        <TabsContent value="assertividade" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* KPI Card */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="p-4 pb-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Métrica Central de Confiabilidade
                </span>
                <CardTitle className="text-lg text-white">Assertividade do PCP</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                <div className="text-center py-4 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-4xl font-black text-sky-400 font-mono tracking-tight">
                    {scheduleAssertiveness.assertivenessScorePct}%
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Meta Operacional: &ge; 90.0% (Atingida)
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Qtd Planejada x Real:</span>
                    <span className="text-slate-200 font-semibold">
                      {scheduleAssertiveness.plannedVsRealQuantityPct}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Aderência Início Previsto:</span>
                    <span className="text-slate-200 font-semibold">
                      {scheduleAssertiveness.startAdherencePct}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Aderência Fim Previsto:</span>
                    <span className="text-slate-200 font-semibold">
                      {scheduleAssertiveness.endAdherencePct}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Aderência de Ritmo (t/h):</span>
                    <span className="text-slate-200 font-semibold">
                      {scheduleAssertiveness.rhythmAdherencePct}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Aderência de Setup (min):</span>
                    <span className="text-slate-200 font-semibold">
                      {scheduleAssertiveness.setupAdherencePct}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Sequência Prevista x Executada:</span>
                    <span className="text-slate-200 font-semibold">
                      {scheduleAssertiveness.sequenceAdherencePct}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Alterações Pós-Publicação:</span>
                    <span className="text-amber-400 font-semibold">
                      {scheduleAssertiveness.changesAfterPublishCount} eventos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Decomposição de Causas de Desvio da Programação */}
            <Card className="bg-slate-900 border-slate-800 lg:col-span-2">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                      Taxonomia das Causas & Decomposição IA
                    </span>
                    <CardTitle className="text-lg text-white">
                      Decomposição das Inconsistências
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="border-sky-500/40 text-sky-400 text-[10px]">
                    Motor de Aprendizado PCP
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                <p className="text-xs text-slate-400">
                  O sistema classifica automaticamente as divergências entre o que foi programado e
                  executado, separando premissas do PCP de eventos operacionais, sem culpar pessoas.
                </p>

                <div className="space-y-3">
                  {scheduleAssertiveness.causesBreakdown.map((cause, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-slate-200">
                          {cause.category === 'ERRO_PREMISSA_PCP' && '📌 ERRO DE PREMISSA DO PCP'}
                          {cause.category === 'EVENTO_OPERACIONAL' &&
                            '⚙️ EVENTO OPERACIONAL EM LINHA'}
                          {cause.category === 'EVENTO_IMPREVISIVEL' && '⚡ EVENTO IMPREVISÍVEL'}
                          {cause.category === 'RESTRICAO_EXTERNA' &&
                            '🚚 RESTRIÇÃO EXTERNA / FORNECEDOR'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sky-400 font-bold">{cause.percentage}%</span>
                          <span className="text-slate-500">({cause.impactHours}h impacto)</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400">{cause.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Ciclo de Aprendizado e Desvios */}
        <TabsContent value="aprendizado" className="space-y-4">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
              <Zap className="w-4 h-4" />
              <span>Princípio Obrigatório CIAFAL: Desvio como Oportunidade de Aprendizado</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ciclo Contínuo:{' '}
              <strong className="text-slate-200">
                PREVISÃO &rarr; EXECUÇÃO &rarr; DESVIO &rarr; ANÁLISE &rarr; CAUSA &rarr; AÇÃO
                &rarr; EFICÁCIA &rarr; APRENDIZADO &rarr; AJUSTE DE PARÂMETRO
              </strong>
              . Se um desvio ocorrer, justificativa e ação são mandatórias.
            </p>
          </div>

          <div className="space-y-3">
            {productionDeviations.map((dev) => (
              <Card
                key={dev.id}
                className={cn(
                  'bg-slate-900 border',
                  dev.isRecurrent ? 'border-amber-900/80 bg-amber-950/10' : 'border-slate-800',
                )}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px] font-mono">
                        {dev.orderNumber}
                      </Badge>
                      <span className="text-xs font-mono text-sky-400 font-semibold">
                        Linha {dev.lineCode} &bull; {dev.productCode} &bull; {dev.shift}
                      </span>
                      {dev.isRecurrent && (
                        <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[10px] font-bold animate-pulse">
                          ⚠️ REINCIDÊNCIA DETECTADA ({dev.recurrenceCount}x)
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-slate-700 text-slate-300"
                    >
                      Status: {dev.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Gap numérico */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px]">Planejado</span>
                      <span className="text-slate-200 font-semibold">{dev.plannedQty} t</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Realizado</span>
                      <span className="text-slate-200 font-semibold">{dev.realizedQty} t</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Gap de Produção</span>
                      <span className="text-rose-400 font-bold">{dev.gapQty} t</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">
                        Aderência / Eficiência
                      </span>
                      <span className="text-amber-400 font-semibold">
                        {dev.adherencePct}% / {dev.efficiencyPct}%
                      </span>
                    </div>
                  </div>

                  {/* Causa e Justificativa */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                      <span className="text-sky-400 font-mono">Causa Raiz:</span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300">
                        {dev.causeTaxonomy}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      &quot;{dev.justification}&quot;
                    </p>
                  </div>

                  {/* Ação e Responsável */}
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400 font-semibold">Plano de Ação Corretivo:</span>
                      <span className="text-slate-400">
                        Resp: <strong className="text-slate-200">{dev.responsibleName}</strong> |
                        Prazo: <strong className="text-slate-200">{dev.deadline}</strong>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{dev.actionPlan}</p>
                  </div>

                  {/* Histórico de Reincidência */}
                  {dev.isRecurrent && dev.previousActionHistory && (
                    <div className="bg-amber-950/40 border border-amber-900/60 p-2.5 rounded text-[11px] text-amber-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Histórico de Tentativas Anteriores:</span>
                      </div>
                      <p className="text-[10px] text-amber-300/90">{dev.previousActionHistory}</p>
                      <div className="text-[10px] text-rose-400 font-semibold">
                        Eficácia Anterior: {dev.previousActionEfficacy || 'Não eficaz'} &bull;
                        Proibido repetir a mesma ação ineficaz.
                      </div>
                    </div>
                  )}

                  {/* Proposta de Revisão de Parâmetro da Ficha Mestre */}
                  {dev.paramRevisionProposed && dev.proposedParamRevision && (
                    <div className="bg-sky-950/40 border border-sky-900/60 p-3 rounded text-[11px] space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                          <span>IA Propõe Revisão de Parâmetro da Ficha Mestre</span>
                        </div>
                        <Badge className="bg-sky-900 text-sky-200 text-[10px]">
                          Confiança {dev.proposedParamRevision.confidencePct}%
                        </Badge>
                      </div>
                      <p className="text-[10px] text-slate-300">
                        {dev.proposedParamRevision.reason}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[10px] font-mono text-slate-400">
                          Alterar{' '}
                          <span className="text-slate-200 font-semibold">
                            {dev.proposedParamRevision.field}
                          </span>{' '}
                          de{' '}
                          <span className="text-rose-400 line-through">
                            {dev.proposedParamRevision.currentValue} t/h
                          </span>{' '}
                          para{' '}
                          <span className="text-emerald-400 font-bold">
                            {dev.proposedParamRevision.suggestedValue} t/h
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => proposeParamRevision(dev.id)}
                          className="h-7 text-[10px] bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1 shadow"
                        >
                          Abrir Proposta de Ficha Mestre
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDeviation(dev)
                        setActionPlanInput(dev.actionPlan)
                        setJustificationInput(dev.justification)
                        setResponsibleInput(dev.responsibleName)
                        setDeadlineInput(dev.deadline)
                      }}
                      className="text-xs border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                    >
                      Editar / Atualizar Ação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal IA de Análise de Eficiência */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Diagnóstico Avançado de Eficiência Industrial &bull; IA CIAFAL</span>
            </div>
            <DialogTitle className="text-lg font-bold text-white">
              Análise Multidimensional de Perdas & Gargalos
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cruzamento de histórico, telemetria térmica, paradas registradas e Ficha Mestre do
              produto.
            </DialogDescription>
          </DialogHeader>

          {aiLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-400">
                Cruzando 12 variáveis industriais do SAP e chão de fábrica...
              </p>
            </div>
          ) : (
            aiAnalysisProduct && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-mono text-sky-400 text-[11px] font-semibold">
                      {aiAnalysisProduct.productCode}
                    </div>
                    <div className="font-bold text-white text-sm">
                      {aiAnalysisProduct.productName}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Gap de Eficiência:
                    </span>
                    <span className="text-rose-400 font-bold font-mono text-sm">
                      -
                      {(
                        aiAnalysisProduct.expectedEfficiencyPct -
                        aiAnalysisProduct.currentEfficiencyPct
                      ).toFixed(1)}{' '}
                      p.p.
                    </span>
                  </div>
                </div>

                {/* Decomposição do Gap por Fator */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
                    Impacto Estimado por Causa Raiz (Confiança do Modelo: 86%):
                  </span>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-300 text-[11px]">
                        🔧 Paradas Corretivas e Troca de Guias
                      </span>
                      <span className="text-rose-400 font-bold">-3.2 p.p.</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-300 text-[11px]">
                        ⚙️ Ritmo de Laminação Abaixo da Premissa
                      </span>
                      <span className="text-amber-400 font-bold">-2.1 p.p.</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-300 text-[11px]">
                        ⏱️ Setup Excessivo de Alinhamento de Rolos
                      </span>
                      <span className="text-amber-400 font-bold">-1.0 p.p.</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded border border-slate-800">
                      <span className="text-slate-300 text-[11px]">
                        📦 Outros (Microparadas e Espera de Ponte)
                      </span>
                      <span className="text-slate-400">-0.7 p.p.</span>
                    </div>
                  </div>
                </div>

                {/* Recomendação Proativa */}
                <div className="bg-sky-950/30 border border-sky-900/60 p-3 rounded-lg text-sky-200 space-y-1 text-[11px]">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Recomendação de Otimização Prescritiva:</span>
                  </div>
                  <p className="text-slate-300">
                    O ritmo cadastrado na Ficha Mestre (70 t/h) está 4 t/h acima da média térmica
                    sustentada para a bitola 50x50. Sugere-se manter a cadência em 68 t/h para
                    eliminar microparadas por superaquecimento de guias.
                  </p>
                </div>
              </div>
            )
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
            >
              Fechar Diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Ação de Desvio Obrigatório */}
      <Dialog
        open={!!selectedDeviation}
        onOpenChange={(open) => !open && setSelectedDeviation(null)}
      >
        <DialogContent className="max-w-md bg-slate-950 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Tratamento Obrigatório do Desvio
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Preenchimento mandatório de causa, justificativa, ação e responsável conforme
              governança CIAFAL.
            </DialogDescription>
          </DialogHeader>

          {selectedDeviation && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Justificativa Operacional:
                </label>
                <Textarea
                  value={justificationInput}
                  onChange={(e) => setJustificationInput(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs h-16"
                  placeholder="Descreva o motivo que gerou o gap..."
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Plano de Ação Corretiva:
                </label>
                <Textarea
                  value={actionPlanInput}
                  onChange={(e) => setActionPlanInput(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100 text-xs h-16"
                  placeholder="Qual contramedida será aplicada para evitar reincidência?"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Responsável:
                  </label>
                  <Input
                    value={responsibleInput}
                    onChange={(e) => setResponsibleInput(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Prazo Conclusão:
                  </label>
                  <Input
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDeviation(null)}
              className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAction}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
            >
              Salvar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
