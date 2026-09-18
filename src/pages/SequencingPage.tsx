import React, { useState, useEffect } from 'react'
import {
  GitFork,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Box,
  Split,
  Eye,
  Building2,
  Edit,
  Copy,
  Send,
  Check,
  Ban,
  History,
  ChevronDown,
  ChevronUp,
  Workflow,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ProductionRoute,
  ProductionRouteEdge,
  ProductionRouteNode,
  ProductionCapacityLog,
  CapacityPeriodType,
  RouteStatus,
  EdgeRelationType,
  BufferPhysicalType,
} from '@/types/sequencing-orchestration'
import { sequencingRoutesService } from '@/services/sequencing-routes'
import { SequencingOrchestrator } from '@/services/sequencing-orchestrator'
import { productionNetworkService, ProductionLineEntity } from '@/services/production-network'
import { CapacityAnalysisWaterfall } from '@/components/control-tower/CapacityAnalysisWaterfall'
import { DoubleApprovalPanel } from '@/components/control-tower/DoubleApprovalPanel'
import { ProductionRouteModal } from '@/components/line-master/ProductionRouteModal'
import { LineBuffersManagementPanel } from '@/components/line-master/LineBuffersManagementPanel'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export const SequencingPage: React.FC = () => {
  const { user, can } = useAuth()
  const { toast } = useToast()

  // Tabs internas da subárea Sequenciamento
  const [activeTab, setActiveTab] = useState<
    'ROTAS' | 'DEPENDENCIAS' | 'BUFFERS' | 'APROVACOES' | 'CAPACIDADE' | 'GARGALOS'
  >('ROTAS')

  const [routes, setRoutes] = useState<ProductionRoute[]>([])
  const [lines, setLines] = useState<ProductionLineEntity[]>([])
  const [capacityLogs, setCapacityLogs] = useState<ProductionCapacityLog[]>([])
  const [selectedRoute, setSelectedRoute] = useState<ProductionRoute | null>(null)
  const [capacityPeriod, setCapacityPeriod] = useState<CapacityPeriodType>('DAY')
  const [loading, setLoading] = useState<boolean>(true)

  // Filtros de busca por Produto / Família (Query conceitual)
  const [searchProduct, setSearchProduct] = useState<string>('TUB_50X50')
  const [searchFamily, setSearchFamily] = useState<string>('TUB_QUAD')
  const [queryResult, setQueryResult] = useState<any>(null)

  // Controle do Modal de Rota (Criação e Edição Completa 3 blocos)
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false)
  const [routeToEdit, setRouteToEdit] = useState<ProductionRoute | null>(null)

  // Estado para expansão de Linhas nos cards da Rota
  const [expandedRouteLines, setExpandedRouteLines] = useState<Record<string, boolean>>({})

  // Diálogo para Adição de Ligação N:N
  const [isAddEdgeModalOpen, setIsAddEdgeModalOpen] = useState(false)
  const [edgeOrigin, setEdgeOrigin] = useState('L1')
  const [edgeTarget, setEdgeTarget] = useState('L2')
  const [edgeRelation, setEdgeRelation] = useState<EdgeRelationType>('PARALLEL')
  const [edgeLeadTime, setEdgeLeadTime] = useState(30)
  const [edgeBufferMin, setEdgeBufferMin] = useState(15)
  const [edgeBufferMax, setEdgeBufferMax] = useState(120)
  const [edgeBufferTarget, setEdgeBufferTarget] = useState(50)
  const [edgeBufferType, setEdgeBufferType] = useState<BufferPhysicalType>('BUFFER_OPERACIONAL')
  const [edgeStock, setEdgeStock] = useState(40)

  // Modais de Ações de Governança
  const [historyModalRoute, setHistoryModalRoute] = useState<ProductionRoute | null>(null)
  const [viewModalRoute, setViewModalRoute] = useState<ProductionRoute | null>(null)
  const [inactivateModalRoute, setInactivateModalRoute] = useState<ProductionRoute | null>(null)
  const [approvalConfirmRoute, setApprovalConfirmRoute] = useState<ProductionRoute | null>(null)
  const [governanceErrorModal, setGovernanceErrorModal] = useState<string | null>(null)

  // Carregar dados reais do backend
  const loadData = async () => {
    setLoading(true)
    try {
      const [rts, lns, caps] = await Promise.all([
        sequencingRoutesService.listRoutes(true),
        productionNetworkService.listLines(),
        sequencingRoutesService.listCapacityLogs(capacityPeriod),
      ])
      setRoutes(rts)
      setLines(lns)
      setCapacityLogs(caps)

      if (rts.length > 0) {
        const initial = selectedRoute
          ? rts.find((r) => r.id === selectedRoute.id) || rts[0]
          : rts[0]
        setSelectedRoute(initial)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [capacityPeriod])

  // Executar query conceitual: "Para este produto/família, quais rotas produtivas são válidas?"
  const handleQueryRoutes = () => {
    const res = SequencingOrchestrator.queryValidRoutesForProduct(
      searchProduct,
      searchFamily,
      routes,
      lines,
      capacityLogs,
    )
    setQueryResult(res)
  }

  useEffect(() => {
    if (routes.length > 0 && lines.length > 0) {
      handleQueryRoutes()
    }
  }, [searchProduct, searchFamily, routes, lines, capacityLogs])

  // Abrir Modal para Criar Nova Rota
  const handleOpenCreateModal = () => {
    setRouteToEdit(null)
    setIsRouteModalOpen(true)
  }

  // Abrir Modal para Editar Rota
  const handleOpenEditModal = (route: ProductionRoute) => {
    setRouteToEdit(route)
    setIsRouteModalOpen(true)
  }

  // Duplicar Rota
  const handleDuplicateRoute = async (route: ProductionRoute) => {
    try {
      const cloned = await sequencingRoutesService.duplicateRoute(route.id)
      toast({
        title: 'Rota duplicada com sucesso',
        description: `Nova rota gerada como rascunho com o código [${cloned.code}].`,
      })
      await loadData()
      setSelectedRoute(cloned)
    } catch (err: any) {
      toast({
        title: 'Erro ao duplicar rota',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Submeter rota para aprovação dupla
  const handleSubmitForApproval = async (route: ProductionRoute) => {
    try {
      await sequencingRoutesService.submitRouteForApproval(
        route.id,
        'Envio para validação de malha e capacidade pela Engenharia/PCP',
      )
      toast({
        title: 'Rota submetida para homologação!',
        description: `A rota [${route.code}] entrou no workflow de Aprovação Dupla (Fase 1: PCP).`,
      })
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao submeter',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Aprovar Rota diretamente com governança
  const handleConfirmApproval = async () => {
    if (!approvalConfirmRoute) return
    try {
      await sequencingRoutesService.approveRoute(approvalConfirmRoute.id)
      toast({
        title: 'Rota Aprovada com Sucesso!',
        description: `A rota [${approvalConfirmRoute.code}] está oficializada (APPROVED) para uso na programação.`,
      })
      setApprovalConfirmRoute(null)
      await loadData()
    } catch (err: any) {
      setApprovalConfirmRoute(null)
      setGovernanceErrorModal(err.message || 'Falha na validação de governança.')
    }
  }

  // Inativar Rota
  const handleConfirmInactivation = async () => {
    if (!inactivateModalRoute) return
    try {
      await sequencingRoutesService.inactivateRoute(inactivateModalRoute.id)
      toast({
        title: 'Rota Inativada',
        description: `A rota [${inactivateModalRoute.code}] foi alterada para status Inativo.`,
      })
      setInactivateModalRoute(null)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao inativar rota',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Adicionar Ligação N:N na Rota Selecionada
  const handleAddEdge = async () => {
    if (!selectedRoute) return
    try {
      // Checar ciclo antes
      const candidateEdges = [
        ...(selectedRoute.edges || []),
        {
          origin_line_code: edgeOrigin,
          target_line_code: edgeTarget,
        },
      ]
      const cycleCheck = sequencingRoutesService.hasCycle(candidateEdges)
      if (cycleCheck.hasCycle) {
        toast({
          title: 'Dependência Cíclica Bloqueada',
          description: 'A Rota contém dependência cíclica entre Linhas Produtivas.',
          variant: 'destructive',
        })
        return
      }

      await sequencingRoutesService.saveEdge({
        route_id: selectedRoute.id,
        origin_line_code: edgeOrigin,
        target_line_code: edgeTarget,
        relation_type: edgeRelation,
        priority: 1,
        is_precedence_mandatory: edgeRelation === 'MANDATORY',
        lead_time_minutes: Number(edgeLeadTime),
        buffer_min_tons: Number(edgeBufferMin),
        buffer_max_tons: Number(edgeBufferMax),
        buffer_target_tons: Number(edgeBufferTarget),
        buffer_physical_type: edgeBufferType,
        buffer_unit: 't',
        current_buffer_stock: Number(edgeStock),
        projected_buffer_stock: Number(edgeStock),
        status: 'DRAFT',
      })

      toast({
        title: 'Ligação N:N Registrada',
        description: `Relação ${edgeOrigin} ➔ ${edgeTarget} (${edgeRelation}) vinculada à rota.`,
      })
      setIsAddEdgeModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao salvar ligação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Alternar expansão de nós da rota
  const toggleRouteLinesExpansion = (routeId: string) => {
    setExpandedRouteLines((prev) => ({
      ...prev,
      [routeId]: !prev[routeId],
    }))
  }

  // Formatar rótulo de status em português
  const formatStatusLabel = (status: RouteStatus | string) => {
    switch (status) {
      case 'DRAFT':
        return 'Rascunho'
      case 'PENDING_APPROVAL':
        return 'Em Homologação'
      case 'APPROVED':
        return 'Aprovada'
      case 'INACTIVE':
        return 'Inativa'
      case 'REJECTED':
        return 'Rejeitada'
      default:
        return status
    }
  }

  // Validação determinística da rota selecionada
  const routeValidation = selectedRoute
    ? SequencingOrchestrator.validateRoute(selectedRoute, lines, capacityLogs)
    : null

  // Alertas de Buffers da rota selecionada
  const bufferAlerts = selectedRoute
    ? SequencingOrchestrator.evaluateBufferHealth(selectedRoute.edges || [])
    : []

  return (
    <div className="space-y-6">
      {/* Header Corporativo CIAFAL */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Sequenciamento & Orquestração Fina de Rotas
                </h1>
                <Badge className="bg-[#004C97] text-white border-blue-400/40 text-[10px] font-mono">
                  Prompt 04 Homologado
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Hierarquia Industrial: Rotas N:N, Linhas da Hierarquia, Relações de Precedência,
                Dupla Aprovação e Governança Estrita.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Atualizar
          </Button>

          {can('pcp.route.create') && (
            <Button
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Cadastrar Nova Rota Produtiva N:N
            </Button>
          )}
        </div>
      </div>

      {/* Subnavegação da Subárea Sequenciamento (6 Abas) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
        {[
          { id: 'ROTAS', label: 'Rotas N:N', icon: GitFork, count: routes.length },
          {
            id: 'DEPENDENCIAS',
            label: 'Grafo & Dependências',
            icon: Split,
            count: selectedRoute?.edges?.length || 0,
          },
          { id: 'BUFFERS', label: 'Buffers & Pulmões', icon: Box, count: bufferAlerts.length },
          { id: 'APROVACOES', label: 'Aprovações Duplas', icon: ShieldCheck },
          { id: 'CAPACIDADE', label: '4 Conceitos de Capacidade', icon: Workflow },
          { id: 'GARGALOS', label: 'Análise de Gargalos', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ABA 1: ROTAS N:N E CONSULTA DE PRODUTO */}
      {activeTab === 'ROTAS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Lista de Rotas e Validador Determinístico */}
          <div className="lg:col-span-2 space-y-4">
            {/* Consulta: Para este produto/família, quais rotas são válidas? */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-[#004C97]" />
                    Consulta de Elegibilidade de Rotas Produtivas
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] border-slate-200 text-slate-500 bg-slate-50"
                  >
                    Motor Determinístico
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-600 font-medium">
                      Código Produto:
                    </label>
                    <Input
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      placeholder="Ex: TUB_50X50"
                      className="bg-white border-slate-300 text-xs text-slate-900 font-mono h-8 mt-1 focus-visible:ring-[#004C97]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-600 font-medium">
                      Código Família (Opcional):
                    </label>
                    <Input
                      value={searchFamily}
                      onChange={(e) => setSearchFamily(e.target.value)}
                      placeholder="Ex: TUB_QUAD"
                      className="bg-white border-slate-300 text-xs text-slate-900 font-mono h-8 mt-1 focus-visible:ring-[#004C97]"
                    />
                  </div>
                </div>

                {queryResult && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">
                        Rotas Homologadas Elegíveis ({queryResult.validRoutes.length}):
                      </span>
                      {queryResult.preferredRoute && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-mono">
                          Preferencial: {queryResult.preferredRoute.code}
                        </Badge>
                      )}
                    </div>

                    {queryResult.validRoutes.length > 0 ? (
                      <div className="space-y-1">
                        {queryResult.validRoutes.map((vr: ProductionRoute) => (
                          <div
                            key={vr.id}
                            onClick={() => setSelectedRoute(vr)}
                            className="p-2 bg-white border border-slate-200 hover:border-[#004C97] hover:shadow-xs rounded flex items-center justify-between cursor-pointer transition-all"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {vr.code} (V{vr.version})
                              </span>
                              <p className="text-[10px] text-slate-500">
                                {vr.metadata?.name || vr.description}
                              </p>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-semibold">
                              Aprovada
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-[11px] flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Nenhuma rota com status Aprovada disponível para este item.</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listagem Geral de Rotas com Ações Completas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold text-slate-600 uppercase">
                  Catálogo de Rotas Produtivas N:N ({routes.length})
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Clique no card para selecionar
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {routes.map((r) => {
                  const isSelected = selectedRoute?.id === r.id
                  const isExpanded = !!expandedRouteLines[r.id]
                  const sortedNodes = [...(r.nodes || [])].sort(
                    (a, b) => a.logical_order - b.logical_order,
                  )

                  return (
                    <Card
                      key={r.id}
                      onClick={() => setSelectedRoute(r)}
                      className={`transition-all border ${
                        isSelected
                          ? 'border-[#004C97] bg-blue-50/20 shadow-xs ring-1 ring-[#004C97]'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <CardContent className="p-4 space-y-3">
                        {/* Cabeçalho do Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold font-mono text-slate-900">
                              {r.code}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-slate-200 text-slate-600 bg-slate-50"
                            >
                              V{r.version}
                            </Badge>
                            {r.metadata?.name && (
                              <span className="text-xs font-semibold text-slate-700 font-sans">
                                &mdash; {r.metadata.name}
                              </span>
                            )}
                            {r.preferred && (
                              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[9px] font-semibold">
                                Rota Padrão
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={`text-[10px] font-mono ${
                                r.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : r.status === 'PENDING_APPROVAL'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : r.status === 'INACTIVE'
                                      ? 'bg-slate-200 text-slate-700 border-slate-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {formatStatusLabel(r.status)}
                            </Badge>
                          </div>
                        </div>

                        {/* Descrição */}
                        <p className="text-xs text-slate-600">{r.description}</p>

                        {/* Sequência das Linhas da Rota */}
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-slate-700 flex items-center gap-1.5">
                              <Workflow className="w-3.5 h-3.5 text-[#004C97]" />
                              Sequência da Rota:
                            </span>
                            {sortedNodes.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleRouteLinesExpansion(r.id)
                                }}
                                className="text-[11px] font-mono text-[#004C97] hover:underline flex items-center gap-0.5"
                              >
                                {isExpanded ? (
                                  <>
                                    Recolher Centros <ChevronUp className="w-3 h-3" />
                                  </>
                                ) : (
                                  <>
                                    Expandir Centros ({sortedNodes.length} Linhas){' '}
                                    <ChevronDown className="w-3 h-3" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Sequência em linha (Ex: 10 → CIAFAL / L1) */}
                          {sortedNodes.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                              {sortedNodes.map((node, nIdx) => (
                                <React.Fragment key={node.id || nIdx}>
                                  <div className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800 flex items-center gap-1 shadow-2xs">
                                    <span className="text-[#004C97] font-bold">
                                      {node.logical_order}
                                    </span>
                                    <span className="text-slate-400">&rarr;</span>
                                    <span className="font-bold">{node.line_code}</span>
                                  </div>
                                  {nIdx < sortedNodes.length - 1 && (
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-500 italic">
                              Nenhuma Linha Produtiva vinculada a esta Rota.
                            </p>
                          )}

                          {/* Detalhes expandidos: Linhas e Centros (Somente Leitura) */}
                          {isExpanded && sortedNodes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-200 divide-y divide-slate-100">
                              {sortedNodes.map((node) => {
                                const matchedLine = lines.find((l) => l.code === node.line_code)
                                return (
                                  <div
                                    key={node.id || node.line_code}
                                    className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono gap-1"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-slate-500 w-6">
                                        {node.logical_order}
                                      </span>
                                      <span className="font-bold text-slate-900">
                                        {node.line_code}
                                      </span>
                                      <span className="text-slate-600 font-sans">
                                        ({matchedLine?.name || node.process_name})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-500">
                                      <span>
                                        Taxa Nominal:{' '}
                                        <strong className="text-slate-800">
                                          {node.nominal_rate} {node.capacity_unit}
                                        </strong>
                                      </span>
                                      <span>&bull;</span>
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-white border-slate-200 text-slate-700"
                                      >
                                        Centro SAP: {matchedLine?.sap_work_center || 'CR_ESTRUT'}
                                      </Badge>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Metadados e Rodapé de Ações */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Linhas na Rota:</span>
                              <strong className="text-slate-800">{r.nodes?.length || 0}</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Ligações N:N:</span>
                              <strong className="text-slate-800">{r.edges?.length || 0}</strong>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500">Versão:</span>
                              <strong className="text-[#004C97]">V{r.version}</strong>
                            </div>
                          </div>

                          {/* Barra de Ações por Card: Visualizar, Editar, Duplicar, Enviar Homologação, Aprovar, Inativar, Histórico */}
                          <div
                            className="flex flex-wrap items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewModalRoute(r)}
                              className="h-7 px-2 text-[11px] text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                              title="Visualizar Rota"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Visualizar
                            </Button>

                            {can('pcp.route.create') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditModal(r)}
                                className="h-7 px-2 text-[11px] text-[#004C97] hover:bg-blue-50"
                                title="Editar Rota"
                              >
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                Editar
                              </Button>
                            )}

                            {can('pcp.route.create') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicateRoute(r)}
                                className="h-7 px-2 text-[11px] text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                                title="Duplicar Rota"
                              >
                                <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                Duplicar
                              </Button>
                            )}

                            {r.status === 'DRAFT' && can('pcp.route.create') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSubmitForApproval(r)}
                                className="h-7 px-2 text-[11px] text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                                title="Enviar para Homologação"
                              >
                                <Send className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                Homologar
                              </Button>
                            )}

                            {r.status !== 'APPROVED' && can('pcp.route.create') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setApprovalConfirmRoute(r)}
                                className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50"
                                title="Aprovar Rota"
                              >
                                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                Aprovar
                              </Button>
                            )}

                            {r.status !== 'INACTIVE' && can('pcp.route.create') && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setInactivateModalRoute(r)}
                                className="h-7 px-2 text-[11px] text-rose-700 hover:text-rose-900 hover:bg-rose-50"
                                title="Inativar Rota"
                              >
                                <Ban className="w-3.5 h-3.5 mr-1 text-rose-600" />
                                Inativar
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryModalRoute(r)}
                              className="h-7 px-2 text-[11px] text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              title="Histórico de Alterações"
                            >
                              <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              Histórico
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Coluna 3: Detalhes da Rota Selecionada e Validação de Conformidade */}
          <div className="space-y-4">
            {selectedRoute ? (
              <Card className="bg-white border-slate-200 shadow-xs">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-slate-900 uppercase font-mono">
                      Governança da Rota [{selectedRoute.code}]
                    </CardTitle>
                    <Badge className="text-[10px] font-mono bg-[#004C97] text-white">
                      Versão {selectedRoute.version}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  {/* Status do Motor */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                      Validação para o Motor de Programação:
                    </span>
                    {selectedRoute.status === 'APPROVED' ? (
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Oficial e Homologada para Sequenciamento (Aprovada).</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          BLOQUEADA: Apenas rotas Aprovadas (APPROVED) são executadas na programação
                          oficial.
                        </span>
                      </div>
                    )}

                    {routeValidation?.errors?.length ? (
                      <div className="space-y-1 pt-1">
                        {routeValidation.errors.map((err, i) => (
                          <div
                            key={i}
                            className="text-[11px] text-rose-700 flex items-start gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Ligações do Grafo (Resumo Rápido) */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-mono font-bold text-[11px]">
                        Ligações / Edges N:N ({selectedRoute.edges?.length || 0}):
                      </span>
                      {can('pcp.route.create') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddEdgeModalOpen(true)}
                          className="h-6 text-[10px] border-slate-300 bg-white text-[#004C97] hover:bg-slate-50"
                        >
                          + Adicionar Ligação
                        </Button>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {selectedRoute.edges && selectedRoute.edges.length > 0 ? (
                        selectedRoute.edges.map((e, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-50 border border-slate-200 rounded font-mono text-[11px] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{e.origin_line_code}</span>
                              <ArrowRight className="w-3 h-3 text-[#004C97]" />
                              <span className="font-bold text-slate-900">{e.target_line_code}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-slate-200 text-slate-600 bg-white"
                            >
                              {e.relation_type}
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic text-[11px]">
                          Nenhuma ligação configurada.
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                Selecione uma rota para visualizar os parâmetros de governança.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: GRAFO E DEPENDÊNCIAS N:N REAL */}
      {activeTab === 'DEPENDENCIAS' && (
        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardHeader className="p-4 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Split className="w-4 h-4 text-sky-400" />
                  Grafo de Precedência N:N &bull; Rota [{selectedRoute?.code || 'N/A'}]
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Renderizado diretamente de production_route_nodes e production_route_edges com
                  Linhas como nós (linear e bifurcações N:N).
                </p>
              </div>

              {can('pcp.route.create') && (
                <Button
                  size="sm"
                  onClick={() => setIsAddEdgeModalOpen(true)}
                  className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
                >
                  + Nova Relação N:N
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Diagrama Visual de Nós da Rota */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase block">
                Nós da Hierarquia Industrial (Linhas Produtivas):
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {selectedRoute?.nodes && selectedRoute.nodes.length > 0 ? (
                  [...selectedRoute.nodes]
                    .sort((a, b) => a.logical_order - b.logical_order)
                    .map((node) => (
                      <div
                        key={node.id || node.line_code}
                        className="p-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono space-y-1 min-w-[130px] shadow-sm"
                      >
                        <div className="flex items-center justify-between text-[10px] text-sky-400">
                          <span>Passo {node.logical_order}</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                        </div>
                        <div className="text-sm font-bold text-white">{node.line_code}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {node.process_name}
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Nenhum nó registrado nesta rota.</p>
                )}
              </div>
            </div>

            {/* Lista dos Edges / Ligações */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase block">
                Ligações de Precedência & Buffers:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedRoute?.edges?.map((edge, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-[#004C97]/30 border border-blue-600/40 rounded text-sky-300 font-bold">
                          {edge.origin_line_code}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="p-1 bg-indigo-950/40 border border-indigo-600/40 rounded text-indigo-300 font-bold">
                          {edge.target_line_code}
                        </span>
                      </div>
                      <Badge
                        className={`text-[9px] font-mono ${
                          edge.relation_type === 'MANDATORY'
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : edge.relation_type === 'PARALLEL'
                              ? 'bg-purple-950 text-purple-300 border-purple-800'
                              : 'bg-sky-950 text-sky-300 border-sky-800'
                        }`}
                      >
                        {edge.relation_type === 'MANDATORY'
                          ? 'Obrigatória'
                          : edge.relation_type === 'PARALLEL'
                            ? 'Paralela'
                            : edge.relation_type === 'ALTERNATIVE'
                              ? 'Alternativa'
                              : edge.relation_type}
                      </Badge>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div>
                        Lead Time:{' '}
                        <strong className="text-white font-mono">
                          {edge.lead_time_minutes} min
                        </strong>
                      </div>
                      <div>
                        Pulmão Associado:{' '}
                        <strong className="text-white font-mono">
                          {edge.buffer_min_tons} t &rarr; {edge.buffer_max_tons} t (Alvo:{' '}
                          {edge.buffer_target_tons} t)
                        </strong>
                      </div>
                      <div>
                        Tipo de Pulmão:{' '}
                        <strong className="text-sky-400 font-mono">
                          {edge.buffer_physical_type}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 3: BUFFERS E PULMÕES PRODUTIVOS (Painel Parametrizável, Gerenciável e Dinâmico) */}
      {activeTab === 'BUFFERS' && <LineBuffersManagementPanel />}

      {/* ABA 4: APROVAÇÕES DUPLAS (PCP + GESTOR) */}
      {activeTab === 'APROVACOES' && <DoubleApprovalPanel />}

      {/* ABA 5: 4 CONCEITOS DE CAPACIDADE & WATERFALL */}
      {activeTab === 'CAPACIDADE' && (
        <CapacityAnalysisWaterfall
          capacityLogs={capacityLogs}
          periodType={capacityPeriod}
          onPeriodChange={setCapacityPeriod}
        />
      )}

      {/* ABA 6: ANÁLISE DE GARGALOS */}
      {activeTab === 'GARGALOS' && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Sinalização de Gargalos e Restrições de Cadência por Linha
            </CardTitle>
            <p className="text-xs text-slate-500">
              Cálculo de BottleneckRisk baseado na capacidade programável, utilização projetada e
              pulmões downstream.
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {capacityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-900 text-sm">{log.line_code}</span>
                    <Badge
                      className={`text-[10px] font-mono ${
                        log.bottleneck_risk === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : log.bottleneck_risk === 'HIGH'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      RISCO {log.bottleneck_risk}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-700 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidade Programável:</span>
                      <strong className="text-[#004C97]">
                        {log.programmable_capacity} {log.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Produção Realizada:</span>
                      <strong className="text-emerald-700">
                        {log.realized_capacity} {log.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Perda por Gargalo:</span>
                      <strong className="text-rose-700">
                        {log.bottleneck_loss || 0} {log.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Utilização da Linha:</span>
                      <strong className="text-slate-900">{log.utilization_pct}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL PRINCIPAL: CADASTRO / EDIÇÃO DA ROTA PRODUTIVA (3 BLOCOS) */}
      <ProductionRouteModal
        open={isRouteModalOpen}
        onOpenChange={setIsRouteModalOpen}
        routeToEdit={routeToEdit}
        onSuccess={() => {
          loadData()
        }}
      />

      {/* MODAL DE VISUALIZAÇÃO DA ROTA */}
      {viewModalRoute && (
        <Dialog open={!!viewModalRoute} onOpenChange={(op) => !op && setViewModalRoute(null)}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#004C97]" />
                Detalhes da Rota Produtiva [{viewModalRoute.code}]
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Consulta completa em modo somente leitura.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Nome da Rota:</span>
                  <strong className="text-slate-900">
                    {viewModalRoute.metadata?.name || viewModalRoute.description}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Versão:</span>
                  <strong className="text-[#004C97]">V{viewModalRoute.version}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <strong>{formatStatusLabel(viewModalRoute.status)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Produto / Família:</span>
                  <strong>
                    {viewModalRoute.product_code || 'Geral'} /{' '}
                    {viewModalRoute.family_code || 'Todas'}
                  </strong>
                </div>
              </div>

              <div>
                <span className="text-slate-700 font-bold block mb-1">Linhas e Centros:</span>
                <div className="space-y-1">
                  {(viewModalRoute.nodes || []).map((n) => (
                    <div
                      key={n.id || n.line_code}
                      className="p-2 bg-white border border-slate-200 rounded flex justify-between items-center"
                    >
                      <span>
                        Passo {n.logical_order}: <strong>{n.line_code}</strong> ({n.process_name})
                      </span>
                      <span className="text-slate-500">
                        {n.nominal_rate} {n.capacity_unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewModalRoute(null)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE HISTÓRICO DA ROTA */}
      {historyModalRoute && (
        <Dialog open={!!historyModalRoute} onOpenChange={(op) => !op && setHistoryModalRoute(null)}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                Histórico & Auditoria &bull; {historyModalRoute.code}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-xs font-mono">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Versão Atual:</span>
                  <strong>V{historyModalRoute.version}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Criado em:</span>
                  <span>
                    {historyModalRoute.created
                      ? new Date(historyModalRoute.created).toLocaleString('pt-BR')
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Última Modificação:</span>
                  <span>
                    {historyModalRoute.updated
                      ? new Date(historyModalRoute.updated).toLocaleString('pt-BR')
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Autor:</span>
                  <span>{historyModalRoute.author_name || 'Sistema PCP'}</span>
                </div>
                {historyModalRoute.change_reason && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block">Motivo da Alteração:</span>
                    <p className="text-slate-800 font-sans">{historyModalRoute.change_reason}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryModalRoute(null)}
                className="text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE APROVAÇÃO DIRETA */}
      {approvalConfirmRoute && (
        <Dialog
          open={!!approvalConfirmRoute}
          onOpenChange={(op) => !op && setApprovalConfirmRoute(null)}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Aprovar Rota Produtiva
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-xs text-slate-600 space-y-2">
              <p>
                Deseja oficializar a aprovação da rota{' '}
                <strong className="text-slate-900">{approvalConfirmRoute.code}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                A governança do HUB exige que todas as Linhas da Rota estejam ativas no cadastro e
                que as relações de precedência não formem loops cíclicos.
              </p>
            </div>
            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApprovalConfirmRoute(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmApproval}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Confirmar Aprovação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE ERRO DE GOVERNANÇA (FEEDBACK CLARO) */}
      {governanceErrorModal && (
        <Dialog
          open={!!governanceErrorModal}
          onOpenChange={(op) => !op && setGovernanceErrorModal(null)}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Bloqueio de Governança
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-xs text-slate-700 space-y-2">
              <p>{governanceErrorModal}</p>
            </div>
            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => setGovernanceErrorModal(null)}
                className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs"
              >
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE INATIVAÇÃO */}
      {inactivateModalRoute && (
        <Dialog
          open={!!inactivateModalRoute}
          onOpenChange={(op) => !op && setInactivateModalRoute(null)}
        >
          <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-600" />
                Inativar Rota Produtiva
              </DialogTitle>
            </DialogHeader>
            <div className="py-2 text-xs text-slate-600 space-y-2">
              <p>
                Deseja inativar a Rota{' '}
                <strong className="text-slate-900">{inactivateModalRoute.code}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                A Rota deixará de ser sugerida pelo motor de sequenciamento e não poderá ser
                utilizada em novos programas semanais até ser reativada.
              </p>
            </div>
            <DialogFooter className="border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInactivateModalRoute(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmInactivation}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Inativar Rota
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal para Adicionar Ligação N:N */}
      <Dialog open={isAddEdgeModalOpen} onOpenChange={setIsAddEdgeModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#004C97]" />
              Adicionar Ligação N:N à Rota [{selectedRoute?.code}]
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Origem (Linha)
                </label>
                <select
                  value={edgeOrigin}
                  onChange={(e) => setEdgeOrigin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Destino (Linha)
                </label>
                <select
                  value={edgeTarget}
                  onChange={(e) => setEdgeTarget(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Tipo de Relação
                </label>
                <select
                  value={edgeRelation}
                  onChange={(e) => setEdgeRelation(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900 font-mono text-xs focus:ring-1 focus:ring-[#004C97] outline-none"
                >
                  <option value="MANDATORY">MANDATORY (Obrigatória)</option>
                  <option value="PARALLEL">PARALLEL (Paralela)</option>
                  <option value="ALTERNATIVE">ALTERNATIVE (Alternativa)</option>
                  <option value="CONDITIONAL">CONDITIONAL (Condicional)</option>
                  <option value="OPTIONAL">OPTIONAL (Opcional)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Lead Time (min)
                </label>
                <Input
                  type="number"
                  value={edgeLeadTime}
                  onChange={(e) => setEdgeLeadTime(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900 font-mono text-xs focus-visible:ring-[#004C97]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Buffer Mín (t)
                </label>
                <Input
                  type="number"
                  value={edgeBufferMin}
                  onChange={(e) => setEdgeBufferMin(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900 font-mono text-xs focus-visible:ring-[#004C97]"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Buffer Alvo (t)
                </label>
                <Input
                  type="number"
                  value={edgeBufferTarget}
                  onChange={(e) => setEdgeBufferTarget(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900 font-mono text-xs focus-visible:ring-[#004C97]"
                />
              </div>
              <div>
                <label className="block text-slate-700 mb-1 font-mono font-medium">
                  Buffer Máx (t)
                </label>
                <Input
                  type="number"
                  value={edgeBufferMax}
                  onChange={(e) => setEdgeBufferMax(Number(e.target.value))}
                  className="bg-white border-slate-300 text-slate-900 font-mono text-xs focus-visible:ring-[#004C97]"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-slate-200 pt-3">
            <Button
              variant="outline"
              onClick={() => setIsAddEdgeModalOpen(false)}
              className="border-slate-300 text-slate-700 text-xs hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddEdge}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow-xs"
            >
              Salvar Ligação N:N
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SequencingPage
