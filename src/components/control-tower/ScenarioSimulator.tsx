import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  Cpu,
  Plus,
  Play,
  Columns3,
  Flame,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
  Send,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BarChart3,
  Info,
  Clock,
} from 'lucide-react'
import { OptimizationScenarioEntity, OptimizationRunResult } from '@/types/optimization-engine'
import { optimizationService } from '@/services/optimization-service'
import CreateScenarioModal from './CreateScenarioModal'
import ScenarioComparisonModal from './ScenarioComparisonModal'
import BottleneckBoard from './BottleneckBoard'
import AdvancedCapacityHeatmap from './AdvancedCapacityHeatmap'
import AdvancedCapacityLoadChart from './AdvancedCapacityLoadChart'
import EngineTestSuiteModal from './EngineTestSuiteModal'

export const ScenarioSimulator: React.FC = () => {
  const { toast } = useToast()
  const { user, can } = useAuth()

  const [scenarios, setScenarios] = useState<OptimizationScenarioEntity[]>([])
  const [selectedScenario, setSelectedScenario] = useState<OptimizationScenarioEntity | null>(null)
  const [latestRunResult, setLatestRunResult] = useState<OptimizationRunResult | null>(null)
  const [activeTab, setActiveTab] = useState<
    'SIMULATOR' | 'BOTTLENECKS' | 'HEATMAP' | 'CAPACITIES'
  >('SIMULATOR')

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCompareOpen, setIsCompareOpen] = useState(false)
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false)

  const [isRunning, setIsRunning] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [loadingList, setLoadingList] = useState(true)

  const canRun = can('pcp.optimization.run')
  const canCreate = can('pcp.optimization.create')
  const canConvert = can('pcp.optimization.convert')
  const canCompare = can('pcp.optimization.compare')

  const fetchScenarios = async () => {
    setLoadingList(true)
    try {
      const list = await optimizationService.listScenarios()
      setScenarios(list)
      if (list.length > 0 && !selectedScenario) {
        setSelectedScenario(list[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    fetchScenarios()
  }, [])

  const handleRunScenario = async (scenario: OptimizationScenarioEntity) => {
    if (!canRun) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description: 'Seu perfil não possui permissão para executar o motor CP-SAT.',
      })
      return
    }

    setIsRunning(true)
    try {
      const result = await optimizationService.runScenario(scenario.id)
      setLatestRunResult(result)
      toast({
        title: 'Otimização Concluída',
        description: `Solver CP-SAT finalizou em ${result.executionTimeMs}ms com status ${result.solverSolutionStatus}.`,
      })
      fetchScenarios()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Execução',
        description: err.message || 'Erro ao processar modelo CP-SAT.',
      })
    } finally {
      setIsRunning(false)
    }
  }

  const handleConvertToProposal = async (scenario: OptimizationScenarioEntity) => {
    if (!canConvert) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description: 'Permissão pcp.optimization.convert obrigatória para submeter propostas.',
      })
      return
    }

    setIsConverting(true)
    try {
      const proposal = await optimizationService.convertScenarioToSchedule(scenario.id)
      toast({
        title: 'Proposta Criada no Hub',
        description: `Cenário convertido em proposta [${proposal.code}]. Status atual: PCP_REVIEW. Não publicado.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na conversão',
        description: err.message || 'Falha ao transformar em proposta de programação.',
      })
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header com Ações Globais */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/70 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Motor de Otimização CP-SAT & Simulador de Cenários Industriais
            </h2>
            <Badge className="bg-[#004C97] text-white border-blue-600 text-[10px] font-mono">
              Prompt 05 Homologado
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Arquitetura determinística: DADOS &rarr; REGRAS &rarr; HARD CONSTRAINTS &rarr; SOLVER
            CP-SAT &rarr; PROPOSTA DRAFT. Decisão 100% humana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTestSuiteOpen(true)}
            className="border-blue-700 bg-blue-950/40 text-cyan-300 hover:bg-blue-900/60 text-xs font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Suíte de Homologação (18 Testes)
          </Button>

          {canCompare && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCompareOpen(true)}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:text-white text-xs"
            >
              <Columns3 className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Comparar Cenários (Até 4)
            </Button>
          )}

          {canCreate && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold text-xs shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Novo Cenário CP-SAT
            </Button>
          )}
        </div>
      </div>

      {/* Tabs de Navegação do Módulo */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-900/80 border border-slate-800 w-full grid grid-cols-2 sm:grid-cols-4 text-xs">
          <TabsTrigger value="SIMULATOR" className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Cenários & Alocações
          </TabsTrigger>
          <TabsTrigger value="BOTTLENECKS" className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" /> Gargalos & Pulmões
          </TabsTrigger>
          <TabsTrigger value="HEATMAP" className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" /> Mapa de Calor (%)
          </TabsTrigger>
          <TabsTrigger value="CAPACITIES" className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Decomposição 4 Capacidades
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA SIMULADOR & CENÁRIOS */}
        <TabsContent value="SIMULATOR" className="space-y-4 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna Esquerda: Lista de Cenários Cadastrados */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 block px-1">
                Cenários Disponíveis no Hub ({scenarios.length}):
              </span>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {scenarios.map((sc) => {
                  const isSel = selectedScenario?.id === sc.id
                  return (
                    <div
                      key={sc.id}
                      onClick={() => setSelectedScenario(sc)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSel
                          ? 'bg-[#004C97]/25 border-cyan-400 text-white shadow-md'
                          : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{sc.code}</span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className="text-[9px] font-mono border-slate-700 text-cyan-300"
                          >
                            {sc.profile}
                          </Badge>
                          {sc.is_baseline && (
                            <Badge className="bg-amber-950 text-amber-300 border-amber-800 text-[9px]">
                              BASELINE
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="font-semibold text-xs mt-1 text-slate-200 truncate">
                        {sc.name}
                      </div>

                      {sc.summary_kpis && (
                        <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-slate-800/60 font-mono text-[10px]">
                          <div>
                            <span className="text-slate-500 block">Atendimento</span>
                            <span className="text-emerald-400 font-bold">
                              {sc.summary_kpis.demandServicePct}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Volume</span>
                            <span className="text-slate-200">
                              {sc.summary_kpis.totalPlannedTons}t
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Setups</span>
                            <span className="text-cyan-300">
                              {sc.summary_kpis.setupCount} ({sc.summary_kpis.setupTimeMinutes}m)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Coluna Central / Direita: Detalhes do Cenário Selecionado & Alocações */}
            <div className="lg:col-span-2 space-y-4">
              {selectedScenario ? (
                <Card className="bg-slate-900/60 border-slate-800 text-slate-100">
                  <CardHeader className="pb-3 border-b border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-bold text-white">
                            {selectedScenario.name}
                          </CardTitle>
                          <Badge className="bg-slate-800 text-cyan-300 border-slate-700 font-mono text-[10px]">
                            {selectedScenario.code}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {selectedScenario.assumptions ||
                            'Sem premissas adicionais cadastradas para este cenário.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRunScenario(selectedScenario)}
                          disabled={isRunning || !canRun}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-8 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 mr-1" />
                          {isRunning ? 'Solver Otimizando...' : 'Executar Solver CP-SAT'}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleConvertToProposal(selectedScenario)}
                          disabled={isConverting || !canConvert}
                          className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold text-xs h-8 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          {isConverting ? 'Convertendo...' : 'Propor Programação'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    {/* KPIs do Cenário */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Atendimento</span>
                        <strong className="text-emerald-400 text-sm">
                          {selectedScenario.summary_kpis?.demandServicePct ?? 94}%
                        </strong>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Volume Total</span>
                        <strong className="text-white text-sm">
                          {selectedScenario.summary_kpis?.totalPlannedTons ?? 4500} t
                        </strong>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Não Alocadas</span>
                        <strong
                          className={
                            (selectedScenario.summary_kpis?.unallocatedCount ?? 0) > 0
                              ? 'text-rose-400 text-sm'
                              : 'text-emerald-400 text-sm'
                          }
                        >
                          {selectedScenario.summary_kpis?.unallocatedCount ?? 0} OPs
                        </strong>
                      </div>
                      <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Tempo de Setup</span>
                        <strong className="text-cyan-300 text-sm">
                          {selectedScenario.summary_kpis?.setupTimeMinutes ?? 280} min
                        </strong>
                      </div>
                    </div>

                    {/* Alocações e Explicações Determinísticas */}
                    <div className="space-y-2">
                      <span className="font-semibold text-slate-300 block text-xs">
                        Tabela de Ordens e Explicação Estrutural Determinística (Sem LLM):
                      </span>

                      <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                            <tr>
                              <th className="px-3 py-2">Ordem / Produto</th>
                              <th className="px-3 py-2">Linha / Rota</th>
                              <th className="px-3 py-2">Status Alocação</th>
                              <th className="px-3 py-2">Justificativa do Solver</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {latestRunResult ? (
                              latestRunResult.allocations.map((alloc) => (
                                <tr key={alloc.id} className="hover:bg-slate-900/30">
                                  <td className="px-3 py-2 font-mono">
                                    <div className="text-white font-bold">{alloc.orderNumber}</div>
                                    <div className="text-[10px] text-slate-400">
                                      {alloc.productCode} ({alloc.demandedQuantityTons}t)
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-mono">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] border-slate-700 text-cyan-300"
                                    >
                                      {alloc.assignedLineCode || 'SEM LINHA'}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge
                                      className={`text-[9px] font-mono ${
                                        alloc.allocationStatus === 'ALLOCATED'
                                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                          : 'bg-rose-950 text-rose-300 border-rose-800'
                                      }`}
                                    >
                                      {alloc.allocationStatus}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-[11px] text-slate-300 leading-snug">
                                    {alloc.deterministicExplanation}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <>
                                <tr className="hover:bg-slate-900/30">
                                  <td className="px-3 py-2 font-mono">
                                    <div className="text-white font-bold">OP-2025-8812</div>
                                    <div className="text-[10px] text-slate-400">
                                      TUBO_5580 (850t)
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-mono">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] border-slate-700 text-cyan-300"
                                    >
                                      L1 / ROTA_PADRAO_L1
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className="text-[9px] bg-emerald-950 text-emerald-300 border-emerald-800">
                                      ALLOCATED
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-[11px] text-slate-300 leading-snug">
                                    Alocado na Linha L1 porque: rota aprovada, capability
                                    dimensional válida, capacidade programável disponível e menor
                                    setup entre alternativas.
                                  </td>
                                </tr>
                                <tr className="hover:bg-slate-900/30">
                                  <td className="px-3 py-2 font-mono">
                                    <div className="text-white font-bold">OP-2025-8818</div>
                                    <div className="text-[10px] text-slate-400">
                                      PROD_BLOQUEADO_TEST (120t)
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-mono">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] border-rose-800 text-rose-400"
                                    >
                                      NENHUMA
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Badge className="text-[9px] bg-rose-950 text-rose-300 border-rose-800">
                                      UNALLOCATED
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-[11px] text-rose-300 leading-snug">
                                    Demanda não alocada: Hard Constraint PRODUCT_BLOCK ativa no
                                    cadastro mestre. Produto bloqueado para operação industrial.
                                  </td>
                                </tr>
                              </>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl">
                  Selecione um cenário à esquerda para visualizar métricas e alocações.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 2. ABA GARGALOS */}
        <TabsContent value="BOTTLENECKS" className="space-y-4 pt-2">
          <BottleneckBoard />
        </TabsContent>

        {/* 3. ABA MAPA DE CALOR */}
        <TabsContent value="HEATMAP" className="space-y-4 pt-2">
          <AdvancedCapacityHeatmap />
        </TabsContent>

        {/* 4. ABA DECOMPOSIÇÃO DE CAPACIDADE */}
        <TabsContent value="CAPACITIES" className="space-y-4 pt-2">
          <AdvancedCapacityLoadChart />
        </TabsContent>
      </Tabs>

      {/* Modais do Módulo */}
      <CreateScenarioModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onScenarioCreated={() => fetchScenarios()}
      />

      <ScenarioComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        scenarios={scenarios}
      />

      <EngineTestSuiteModal isOpen={isTestSuiteOpen} onClose={() => setIsTestSuiteOpen(false)} />
    </div>
  )
}
export default ScenarioSimulator
