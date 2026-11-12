import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Send,
  Activity,
  BarChart3,
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
  const { can } = useAuth()

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

  const scenarioBadge = (sc: OptimizationScenarioEntity) => {
    if (sc.is_baseline) return 'ciafal-badge ciafal-badge--warning'
    if (sc.status === 'DRAFT' || sc.status === 'SIMULADO') return 'ciafal-badge ciafal-badge--info'
    return 'ciafal-badge ciafal-badge--neutral'
  }

  const allocBadge = (status?: string) => {
    if (status === 'ALLOCATED') return 'ciafal-badge ciafal-badge--success'
    return 'ciafal-badge ciafal-badge--danger'
  }

  return (
    <div className="ciafal-page space-y-4">
      {/* Header com Ações Globais */}
      <div className="ciafal-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="hidden sm:flex w-10 h-10 rounded-lg items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--ciafal-primary-lighter)' }}
            >
              <Cpu className="w-5 h-5" style={{ color: 'var(--ciafal-primary)' }} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-base lg:text-lg font-bold tracking-tight"
                  style={{ color: 'var(--ciafal-navy)' }}
                >
                  Motor de Otimização CP-SAT & Simulador de Cenários Industriais
                </h2>
                <span className="ciafal-badge ciafal-badge--info text-[10px] font-mono">
                  Prompt 05 Homologado
                </span>
              </div>
              <p className="text-xs mt-1 max-w-3xl" style={{ color: 'var(--ciafal-text-muted)' }}>
                Arquitetura determinística: DADOS &rarr; REGRAS &rarr; HARD CONSTRAINTS &rarr;
                SOLVER CP-SAT &rarr; PROPOSTA DRAFT. Decisão 100% humana.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsTestSuiteOpen(true)}
              className="bg-white border-[var(--ciafal-border)] text-xs font-semibold hover:bg-[var(--ciafal-primary-lighter)] hover:text-[var(--ciafal-primary)]"
            >
              <ShieldCheck
                className="w-3.5 h-3.5 mr-1.5"
                style={{ color: 'var(--ciafal-primary)' }}
              />
              Suíte de Homologação (18 Testes)
            </Button>

            {canCompare && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCompareOpen(true)}
                className="bg-white border-[var(--ciafal-border)] text-xs font-semibold hover:bg-[var(--ciafal-primary-lighter)] hover:text-[var(--ciafal-primary)]"
              >
                <Columns3
                  className="w-3.5 h-3.5 mr-1.5"
                  style={{ color: 'var(--ciafal-primary)' }}
                />
                Comparar Cenários (Até 4)
              </Button>
            )}

            {canCreate && (
              <Button
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="text-white font-bold text-xs shadow-sm hover:opacity-90"
                style={{ backgroundColor: 'var(--ciafal-primary)' }}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Novo Cenário CP-SAT
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs de Navegação do Módulo */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="ciafal-tabs-list w-full grid grid-cols-2 lg:grid-cols-4 h-auto p-0 gap-0">
          <TabsTrigger value="SIMULATOR" className="ciafal-tab">
            <Cpu className="w-3.5 h-3.5" /> Cenários & Alocações
          </TabsTrigger>
          <TabsTrigger value="BOTTLENECKS" className="ciafal-tab">
            <Flame className="w-3.5 h-3.5" /> Gargalos & Pulmões
          </TabsTrigger>
          <TabsTrigger value="HEATMAP" className="ciafal-tab">
            <Activity className="w-3.5 h-3.5" /> Mapa de Calor (%)
          </TabsTrigger>
          <TabsTrigger value="CAPACITIES" className="ciafal-tab">
            <BarChart3 className="w-3.5 h-3.5" /> Decomposição 4 Capacidades
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA SIMULADOR & CENÁRIOS */}
        <TabsContent value="SIMULATOR" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna Esquerda: Lista de Cenários Cadastrados */}
            <div className="space-y-2">
              <span
                className="text-xs font-semibold block px-1"
                style={{ color: 'var(--ciafal-text-muted)' }}
              >
                Cenários Disponíveis no Hub ({scenarios.length}):
              </span>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1" aria-busy={loadingList}>
                {loadingList && scenarios.length === 0 && (
                  <div
                    className="p-6 text-center text-xs rounded-xl border border-dashed"
                    style={{
                      borderColor: 'var(--ciafal-border)',
                      color: 'var(--ciafal-text-muted)',
                    }}
                  >
                    Carregando cenários do Hub…
                  </div>
                )}
                {!loadingList && scenarios.length === 0 && (
                  <div
                    className="p-6 text-center text-xs rounded-xl border border-dashed"
                    style={{
                      borderColor: 'var(--ciafal-border)',
                      color: 'var(--ciafal-text-muted)',
                    }}
                  >
                    Nenhum cenário cadastrado. Clique em “Novo Cenário CP-SAT” para criar o
                    primeiro.
                  </div>
                )}
                {scenarios.map((sc) => {
                  const isSel = selectedScenario?.id === sc.id
                  return (
                    <div
                      key={sc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedScenario(sc)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedScenario(sc)
                        }
                      }}
                      aria-pressed={isSel}
                      className={`ciafal-card ciafal-card--scenario p-3 cursor-pointer transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--ciafal-primary)] ${
                        isSel ? 'ciafal-card--selected' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-mono text-xs font-bold"
                          style={{ color: 'var(--ciafal-navy)' }}
                        >
                          {sc.code}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <span className={scenarioBadge(sc)}>{sc.profile}</span>
                          {sc.is_baseline && (
                            <span className="ciafal-badge ciafal-badge--warning">BASELINE</span>
                          )}
                        </div>
                      </div>

                      <div
                        className="font-semibold text-xs mt-1 truncate"
                        style={{ color: 'var(--ciafal-text)' }}
                      >
                        {sc.name}
                      </div>

                      {sc.summary_kpis && (
                        <div
                          className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t font-mono text-[10px]"
                          style={{ borderColor: 'var(--ciafal-border)' }}
                        >
                          <div>
                            <span className="block" style={{ color: 'var(--ciafal-text-muted)' }}>
                              Atendimento
                            </span>
                            <span className="font-bold" style={{ color: 'var(--status-success)' }}>
                              {sc.summary_kpis.demandServicePct.toLocaleString('pt-BR')}%
                            </span>
                          </div>
                          <div>
                            <span className="block" style={{ color: 'var(--ciafal-text-muted)' }}>
                              Volume
                            </span>
                            <span style={{ color: 'var(--ciafal-text)' }}>
                              {sc.summary_kpis.totalPlannedTons.toLocaleString('pt-BR')}t
                            </span>
                          </div>
                          <div>
                            <span className="block" style={{ color: 'var(--ciafal-text-muted)' }}>
                              Setups
                            </span>
                            <span style={{ color: 'var(--ciafal-primary)' }}>
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
                <Card className="ciafal-card">
                  <CardHeader
                    className="pb-3 border-b"
                    style={{ borderColor: 'var(--ciafal-border)' }}
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle
                            className="text-sm font-bold"
                            style={{ color: 'var(--ciafal-navy)' }}
                          >
                            {selectedScenario.name}
                          </CardTitle>
                          <span className="ciafal-badge ciafal-badge--info font-mono text-[10px]">
                            {selectedScenario.code}
                          </span>
                        </div>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: 'var(--ciafal-text-muted)' }}
                        >
                          {selectedScenario.assumptions ||
                            'Sem premissas adicionais cadastradas para este cenário.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => handleRunScenario(selectedScenario)}
                          disabled={isRunning || !canRun}
                          className="text-white font-bold text-xs h-8 shadow-sm hover:opacity-90"
                          style={{ backgroundColor: 'var(--ciafal-primary)' }}
                        >
                          <Play className="w-3.5 h-3.5 mr-1" />
                          {isRunning ? 'Solver Otimizando...' : 'Executar Solver CP-SAT'}
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleConvertToProposal(selectedScenario)}
                          disabled={isConverting || !canConvert}
                          className="bg-white border font-bold text-xs h-8 shadow-sm hover:bg-[var(--ciafal-primary-lighter)] hover:text-[var(--ciafal-primary)]"
                          style={{
                            borderColor: 'var(--ciafal-primary)',
                            color: 'var(--ciafal-primary)',
                          }}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          {isConverting ? 'Convertendo...' : 'Propor Programação'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-xs">
                    {/* KPIs do Cenário */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="ciafal-kpi">
                        <span
                          className="ciafal-kpi__label"
                          style={{ color: 'var(--ciafal-text-muted)' }}
                        >
                          Atendimento
                        </span>
                        <strong
                          className="ciafal-kpi__value"
                          style={{ color: 'var(--status-success)' }}
                        >
                          {(selectedScenario.summary_kpis?.demandServicePct ?? 94).toLocaleString(
                            'pt-BR',
                            { maximumFractionDigits: 1 },
                          )}
                          %
                        </strong>
                      </div>
                      <div className="ciafal-kpi">
                        <span
                          className="ciafal-kpi__label"
                          style={{ color: 'var(--ciafal-text-muted)' }}
                        >
                          Volume Total
                        </span>
                        <strong
                          className="ciafal-kpi__value"
                          style={{ color: 'var(--ciafal-navy)' }}
                        >
                          {(selectedScenario.summary_kpis?.totalPlannedTons ?? 4500).toLocaleString(
                            'pt-BR',
                          )}{' '}
                          t
                        </strong>
                      </div>
                      <div className="ciafal-kpi">
                        <span
                          className="ciafal-kpi__label"
                          style={{ color: 'var(--ciafal-text-muted)' }}
                        >
                          Não Alocadas
                        </span>
                        <strong
                          className="ciafal-kpi__value"
                          style={{
                            color:
                              (selectedScenario.summary_kpis?.unallocatedCount ?? 0) > 0
                                ? 'var(--status-danger)'
                                : 'var(--status-success)',
                          }}
                        >
                          {selectedScenario.summary_kpis?.unallocatedCount ?? 0} OPs
                        </strong>
                      </div>
                      <div className="ciafal-kpi">
                        <span
                          className="ciafal-kpi__label"
                          style={{ color: 'var(--ciafal-text-muted)' }}
                        >
                          Tempo de Setup
                        </span>
                        <strong
                          className="ciafal-kpi__value"
                          style={{ color: 'var(--ciafal-primary)' }}
                        >
                          {selectedScenario.summary_kpis?.setupTimeMinutes ?? 280} min
                        </strong>
                      </div>
                    </div>

                    {/* Alocações e Explicações Determinísticas */}
                    <div className="space-y-2">
                      <span
                        className="font-semibold block text-xs"
                        style={{ color: 'var(--ciafal-text)' }}
                      >
                        Tabela de Ordens e Explicação Estrutural Determinística (Sem LLM):
                      </span>

                      <div
                        className="ciafal-table-wrap border rounded-lg"
                        style={{ borderColor: 'var(--ciafal-border)' }}
                      >
                        <table className="ciafal-table">
                          <thead>
                            <tr>
                              <th className="px-3 py-2">Ordem / Produto</th>
                              <th className="px-3 py-2">Linha / Rota</th>
                              <th className="px-3 py-2">Status Alocação</th>
                              <th className="px-3 py-2">Justificativa do Solver</th>
                            </tr>
                          </thead>
                          <tbody>
                            {latestRunResult ? (
                              latestRunResult.allocations.map((alloc) => (
                                <tr key={alloc.id}>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                                    <div
                                      className="font-bold"
                                      style={{ color: 'var(--ciafal-navy)' }}
                                    >
                                      {alloc.orderNumber}
                                    </div>
                                    <div
                                      className="text-[10px]"
                                      style={{ color: 'var(--ciafal-text-muted)' }}
                                    >
                                      {alloc.productCode} ({alloc.demandedQuantityTons}t)
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                                    <span className="ciafal-badge ciafal-badge--info">
                                      {alloc.assignedLineCode || 'SEM LINHA'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className={allocBadge(alloc.allocationStatus)}>
                                      {alloc.allocationStatus}
                                    </span>
                                  </td>
                                  <td
                                    className="px-3 py-2 text-[11px] leading-snug"
                                    style={{ color: 'var(--ciafal-text)' }}
                                  >
                                    {alloc.deterministicExplanation}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <>
                                <tr>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                                    <div
                                      className="font-bold"
                                      style={{ color: 'var(--ciafal-navy)' }}
                                    >
                                      OP-2025-8812
                                    </div>
                                    <div
                                      className="text-[10px]"
                                      style={{ color: 'var(--ciafal-text-muted)' }}
                                    >
                                      TUBO_5580 (850t)
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                                    <span className="ciafal-badge ciafal-badge--info">
                                      L1 / ROTA_PADRAO_L1
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="ciafal-badge ciafal-badge--success">
                                      ALLOCATED
                                    </span>
                                  </td>
                                  <td
                                    className="px-3 py-2 text-[11px] leading-snug"
                                    style={{ color: 'var(--ciafal-text)' }}
                                  >
                                    Alocado na Linha L1 porque: rota aprovada, capability
                                    dimensional válida, capacidade programável disponível e menor
                                    setup entre alternativas.
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                                    <div
                                      className="font-bold"
                                      style={{ color: 'var(--ciafal-navy)' }}
                                    >
                                      OP-2025-8818
                                    </div>
                                    <div
                                      className="text-[10px]"
                                      style={{ color: 'var(--ciafal-text-muted)' }}
                                    >
                                      PROD_BLOQUEADO_TEST (120t)
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                                    <span
                                      className="ciafal-badge"
                                      style={{
                                        color: 'var(--status-danger)',
                                        backgroundColor: 'var(--status-danger-bg)',
                                      }}
                                    >
                                      NENHUMA
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="ciafal-badge ciafal-badge--danger">
                                      UNALLOCATED
                                    </span>
                                  </td>
                                  <td
                                    className="px-3 py-2 text-[11px] leading-snug"
                                    style={{ color: 'var(--status-danger)' }}
                                  >
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
                <div
                  className="p-8 text-center text-xs border border-dashed rounded-xl"
                  style={{ borderColor: 'var(--ciafal-border)', color: 'var(--ciafal-text-muted)' }}
                >
                  Selecione um cenário à esquerda para visualizar métricas e alocações.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 2. ABA GARGALOS */}
        <TabsContent value="BOTTLENECKS" className="space-y-4 pt-4">
          <BottleneckBoard />
        </TabsContent>

        {/* 3. ABA MAPA DE CALOR */}
        <TabsContent value="HEATMAP" className="space-y-4 pt-4">
          <AdvancedCapacityHeatmap />
        </TabsContent>

        {/* 4. ABA DECOMPOSIÇÃO DE CAPACIDADE */}
        <TabsContent value="CAPACITIES" className="space-y-4 pt-4">
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
