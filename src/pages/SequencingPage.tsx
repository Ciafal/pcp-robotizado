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
  SlidersHorizontal,
  Info,
  Clock,
  BarChart2,
  Box,
  Settings2,
  Check,
  ChevronRight,
  Split,
  Eye,
  Building2,
  Activity,
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
  DialogTrigger,
  DialogFooter,
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
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export const SequencingPage: React.FC = () => {
  const { user, can } = useAuth()
  const { toast } = useToast()

  // Tabs internas da subárea Sequenciamento (Prompt 04)
  const [activeTab, setActiveTab] = useState<
    'ROTAS' | 'DEPENDENCIAS' | 'BUFFERS' | 'APROVACOES' | 'CAPACIDADE' | 'GARGALOS'
  >('ROTAS')

  const [routes, setRoutes] = useState<ProductionRoute[]>([])
  const [lines, setLines] = useState<ProductionLineEntity[]>([])
  const [capacityLogs, setCapacityLogs] = useState<ProductionCapacityLog[]>([])
  const [selectedRoute, setSelectedRoute] = useState<ProductionRoute | null>(null)
  const [capacityPeriod, setCapacityPeriod] = useState<CapacityPeriodType>('DAY')
  const [loading, setLoading] = useState<boolean>(true)

  // Filtros de busca por Produto / Família (Query conceitual do Prompt 04)
  const [searchProduct, setSearchProduct] = useState<string>('TUB_50X50')
  const [searchFamily, setSearchFamily] = useState<string>('TUB_QUAD')
  const [queryResult, setQueryResult] = useState<any>(null)

  // Diálogo para criação de nova Rota N:N
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newRouteCode, setNewRouteCode] = useState('')
  const [newRouteDesc, setNewRouteDesc] = useState('')
  const [newRouteProduct, setNewRouteProduct] = useState('')
  const [newRouteFamily, setNewRouteFamily] = useState('')

  // Diálogo para Adição de Ligação N:N
  const [isAddEdgeModalOpen, setIsAddEdgeModalOpen] = useState(false)
  const [edgeOrigin, setEdgeOrigin] = useState('L1')
  const [edgeTarget, setEdgeTarget] = useState('ENDIR')
  const [edgeRelation, setEdgeRelation] = useState<EdgeRelationType>('PARALLEL')
  const [edgeLeadTime, setEdgeLeadTime] = useState(30)
  const [edgeBufferMin, setEdgeBufferMin] = useState(15)
  const [edgeBufferMax, setEdgeBufferMax] = useState(120)
  const [edgeBufferTarget, setEdgeBufferTarget] = useState(50)
  const [edgeBufferType, setEdgeBufferType] = useState<BufferPhysicalType>('BUFFER_OPERACIONAL')
  const [edgeStock, setEdgeStock] = useState(40)

  // Carregar dados
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

  // Submeter rota atual para aprovação
  const handleSubmitForApproval = async () => {
    if (!selectedRoute) return
    try {
      await sequencingRoutesService.submitRouteForApproval(
        selectedRoute.id,
        'Envio para validação de malha e capacidade pela Engenharia/PCP',
      )
      toast({
        title: 'Rota submetida!',
        description: `A rota [${selectedRoute.code}] entrou no workflow de Aprovação Dupla (Fase 1: PCP).`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao submeter',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Criar nova Rota
  const handleCreateRoute = async () => {
    if (!newRouteCode || !newRouteDesc) {
      toast({ title: 'Preencha código e descrição', variant: 'destructive' })
      return
    }

    try {
      const created = await sequencingRoutesService.saveRoute({
        code: newRouteCode.toUpperCase(),
        description: newRouteDesc,
        product_code: newRouteProduct.toUpperCase() || undefined,
        family_code: newRouteFamily.toUpperCase() || undefined,
        version: 1,
        status: 'DRAFT',
        active: false,
        preferred: false,
      })

      toast({
        title: 'Rota criada com sucesso',
        description: `Rota ${created.code} iniciada como DRAFT V1.`,
      })
      setIsCreateModalOpen(false)
      setNewRouteCode('')
      setNewRouteDesc('')
      loadData()
    } catch (err: any) {
      toast({
        title: 'Falha na criação da rota',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Adicionar Ligação N:N na Rota Selecionada
  const handleAddEdge = async () => {
    if (!selectedRoute) return
    try {
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
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-md">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">
                  Sequenciamento & Orquestração Fina de Rotas
                </h1>
                <Badge className="bg-[#004C97] text-white border-blue-400/40 text-[10px] font-mono">
                  Prompt 04 Homologado
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Hub Operacional: Rotas N:N, Predecessores/Sucessores, Buffers Físicos/Operacionais,
                Dupla Aprovação e 4 Conceitos de Capacidade.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-slate-700 bg-slate-950 text-slate-300 hover:text-white text-xs font-mono"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Atualizar
          </Button>

          {can('pcp.route.create') && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold shadow"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nova Rota N:N
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                    <GitFork className="w-4 h-4 text-sky-400" />
                    Cadastrar Nova Rota Produtiva N:N
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono">Código da Rota *</label>
                    <Input
                      placeholder="Ex: ROUT_CANTON_STD_V1"
                      value={newRouteCode}
                      onChange={(e) => setNewRouteCode(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white uppercase font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-mono">
                      Descrição Técnica *
                    </label>
                    <Input
                      placeholder="Ex: Rota contínua com tratamento térmico e calibração fina"
                      value={newRouteDesc}
                      onChange={(e) => setNewRouteDesc(e.target.value)}
                      className="bg-slate-950 border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">
                        Produto Vinculado
                      </label>
                      <Input
                        placeholder="Ex: TUB_50X50"
                        value={newRouteProduct}
                        onChange={(e) => setNewRouteProduct(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white uppercase font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-mono">Família</label>
                      <Input
                        placeholder="Ex: TUB_QUAD"
                        value={newRouteFamily}
                        onChange={(e) => setNewRouteFamily(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="border-slate-700 text-slate-300 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateRoute}
                    className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
                  >
                    Criar em DRAFT &rarr;
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Subnavegação da Subárea Sequenciamento (6 Abas Homologadas) */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
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
          { id: 'CAPACIDADE', label: '4 Conceitos de Capacidade', icon: BarChart2 },
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
                  ? 'bg-[#004C97] text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
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
            <Card className="bg-slate-900 border-slate-800 shadow">
              <CardHeader className="p-4 pb-2 border-b border-slate-800">
                <CardTitle className="text-xs font-bold text-white uppercase font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-sky-400" />
                    Consulta de Elegibilidade de Rotas (Prompt 04 Requisito)
                  </span>
                  <Badge variant="outline" className="text-[9px] border-slate-700 text-slate-400">
                    Motor Determinístico
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400">Código Produto:</label>
                    <Input
                      value={searchProduct}
                      onChange={(e) => setSearchProduct(e.target.value)}
                      placeholder="Ex: TUB_50X50"
                      className="bg-slate-950 border-slate-800 text-xs text-white font-mono h-8 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400">
                      Código Família (Opcional):
                    </label>
                    <Input
                      value={searchFamily}
                      onChange={(e) => setSearchFamily(e.target.value)}
                      placeholder="Ex: TUB_QUAD"
                      className="bg-slate-950 border-slate-800 text-xs text-white font-mono h-8 mt-1"
                    />
                  </div>
                </div>

                {queryResult && (
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">
                        Rotas Homologadas Elegíveis ({queryResult.validRoutes.length}):
                      </span>
                      {queryResult.preferredRoute && (
                        <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 text-[10px] font-mono">
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
                            className="p-2 bg-slate-900 border border-slate-800 hover:border-[#004C97] rounded flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <span className="font-mono font-bold text-white text-xs">
                                {vr.code} (V{vr.version})
                              </span>
                              <p className="text-[10px] text-slate-400">{vr.description}</p>
                            </div>
                            <Badge className="bg-emerald-900 text-emerald-200 text-[9px]">
                              APPROVED
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-950/20 border border-rose-900/40 rounded text-rose-300 text-[11px] flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>Nenhuma rota com status APPROVED disponível para este item.</span>
                      </div>
                    )}

                    {queryResult.warnings.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {queryResult.warnings.map((w: string, idx: number) => (
                          <div
                            key={idx}
                            className="text-[10px] text-amber-400 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listagem Geral de Rotas */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">
                Catálogo de Rotas Produtivas N:N ({routes.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {routes.map((r) => {
                  const isSelected = selectedRoute?.id === r.id
                  const isApproved = r.status === 'APPROVED'

                  return (
                    <Card
                      key={r.id}
                      onClick={() => setSelectedRoute(r)}
                      className={`cursor-pointer transition-all border ${
                        isSelected
                          ? 'border-[#004C97] bg-slate-900 shadow-md ring-1 ring-[#004C97]'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-mono text-white">{r.code}</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono border-slate-700 text-slate-300"
                            >
                              V{r.version}
                            </Badge>
                            {r.preferred && (
                              <Badge className="bg-sky-950 text-sky-300 border-sky-800 text-[9px]">
                                Rota Padrão
                              </Badge>
                            )}
                          </div>

                          <Badge
                            className={`text-[10px] font-mono ${
                              isApproved
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : r.status === 'PENDING_APPROVAL'
                                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </div>

                        <p className="text-xs text-slate-300">{r.description}</p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80">
                          <div>
                            Produto:{' '}
                            <strong className="text-slate-200">{r.product_code || 'Geral'}</strong>
                          </div>
                          <div>
                            Família:{' '}
                            <strong className="text-slate-200">{r.family_code || 'Todas'}</strong>
                          </div>
                          <div>
                            Nós:{' '}
                            <strong className="text-sky-400">{r.nodes?.length || 0} Linhas</strong>
                          </div>
                          <div>
                            Ligações:{' '}
                            <strong className="text-sky-400">{r.edges?.length || 0} Ramos</strong>
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
              <Card className="bg-slate-900 border-slate-800 shadow">
                <CardHeader className="p-4 pb-2 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-white uppercase font-mono">
                      Governança da Rota [{selectedRoute.code}]
                    </CardTitle>
                    <Badge className="text-[10px] font-mono bg-[#004C97] text-white">
                      Versão {selectedRoute.version}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  {/* Status do Motor */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block font-bold">
                      Validação para o Motor de Programação:
                    </span>
                    {routeValidation?.canBeUsedOfficially ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Oficial e Homologada para Sequenciamento (APPROVED).</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          BLOQUEADA: Apenas rotas APPROVED podem ser operadas oficialmente.
                        </span>
                      </div>
                    )}

                    {routeValidation?.errors.length ? (
                      <div className="space-y-1 pt-1">
                        {routeValidation.errors.map((err, i) => (
                          <div
                            key={i}
                            className="text-[11px] text-rose-400 flex items-start gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Ações de Workflow */}
                  <div className="space-y-2">
                    {selectedRoute.status === 'DRAFT' && (
                      <Button
                        size="sm"
                        onClick={handleSubmitForApproval}
                        className="w-full bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold text-xs"
                      >
                        Submeter para Dupla Aprovação &rarr;
                      </Button>
                    )}

                    {selectedRoute.status === 'PENDING_APPROVAL' && (
                      <Button
                        size="sm"
                        onClick={() => setActiveTab('APROVACOES')}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                      >
                        Ver no Painel de Aprovações &rarr;
                      </Button>
                    )}
                  </div>

                  {/* Ligações do Grafo (Resumo Rápido) */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-mono font-bold text-[11px]">
                        Ligações / Edges N:N:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddEdgeModalOpen(true)}
                        className="h-6 text-[10px] border-slate-700 bg-slate-950 text-sky-400"
                      >
                        + Adicionar Ligação
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      {selectedRoute.edges && selectedRoute.edges.length > 0 ? (
                        selectedRoute.edges.map((e, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white">{e.origin_line_code}</span>
                              <ArrowRight className="w-3 h-3 text-sky-400" />
                              <span className="font-bold text-white">{e.target_line_code}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] border-slate-700 text-slate-300"
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
              <div className="p-8 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                Selecione uma rota para visualizar os parâmetros de governança.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: GRAFO E DEPENDÊNCIAS N:N */}
      {activeTab === 'DEPENDENCIAS' && (
        <Card className="bg-slate-900 border-slate-800 shadow-md">
          <CardHeader className="p-4 border-b border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Split className="w-4 h-4 text-sky-400" />
                  Estrutura de Precedência N:N &bull; Rota [{selectedRoute?.code || 'N/A'}]
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Relações 1:N, N:1, N:N, caminhos paralelos e alternativos. Alterações visuais NÃO
                  modificam precedência sem gravação explícita.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddEdgeModalOpen(true)}
                className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
              >
                + Nova Relação N:N
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
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
                      {edge.relation_type}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-1">
                    <div>
                      Lead Time:{' '}
                      <strong className="text-white font-mono">{edge.lead_time_minutes} min</strong>
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
                    {edge.condition_expression && (
                      <div className="text-slate-400 italic text-[10px]">
                        Condição: {edge.condition_expression}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 3: BUFFERS E PULMÕES PRODUTIVOS */}
      {activeTab === 'BUFFERS' && (
        <div className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="p-4 border-b border-slate-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-sky-400" />
                Monitoramento Fino de Buffers Físicos, Operacionais e de Segurança
              </CardTitle>
              <p className="text-xs text-slate-400">
                Detecção determinística de risco de saturação upstream e esvaziamento downstream.
              </p>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {bufferAlerts.map((b, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border space-y-2 text-xs ${
                      b.severity === 'CRITICAL'
                        ? 'bg-rose-950/20 border-rose-900/50'
                        : b.severity === 'WARNING'
                          ? 'bg-amber-950/20 border-amber-900/50'
                          : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-white">
                        {b.origin_line_code} ➔ {b.target_line_code}
                      </span>
                      <Badge
                        className={`text-[9px] font-mono ${
                          b.severity === 'CRITICAL'
                            ? 'bg-rose-900 text-rose-200'
                            : b.severity === 'WARNING'
                              ? 'bg-amber-900 text-amber-200'
                              : 'bg-emerald-900 text-emerald-200'
                        }`}
                      >
                        {b.alert_type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px] p-2 bg-slate-900/80 rounded border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Mínimo</span>
                        <span className="text-white font-bold">{b.min_stock} t</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Atual</span>
                        <span
                          className={`font-bold ${
                            b.severity === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {b.current_stock} t
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Máximo</span>
                        <span className="text-white font-bold">{b.max_stock} t</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300">{b.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="p-4 border-b border-slate-800">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Sinalização de Gargalos e Restrições de Cadência por Linha
            </CardTitle>
            <p className="text-xs text-slate-400">
              Cálculo de BottleneckRisk baseado na capacidade programável, utilização projetada e
              pulmões downstream.
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {capacityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-white text-sm">{log.line_code}</span>
                    <Badge
                      className={`text-[10px] font-mono ${
                        log.bottleneck_risk === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-700'
                          : log.bottleneck_risk === 'HIGH'
                            ? 'bg-amber-950 text-amber-300 border-amber-700'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      }`}
                    >
                      RISCO {log.bottleneck_risk}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-slate-300 text-[11px] font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Capacidade Programável:</span>
                      <strong className="text-sky-400">
                        {log.programmable_capacity} {log.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Produção Realizada:</span>
                      <strong className="text-emerald-400">
                        {log.realized_capacity} {log.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Perda por Gargalo:</span>
                      <strong className="text-rose-400">
                        {log.bottleneck_loss || 0} {log.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Utilização da Linha:</span>
                      <strong className="text-white">{log.utilization_pct}%</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para Adicionar Ligação N:N */}
      <Dialog open={isAddEdgeModalOpen} onOpenChange={setIsAddEdgeModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              Adicionar Ligação N:N à Rota [{selectedRoute?.code}]
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Origem (Linha)</label>
                <select
                  value={edgeOrigin}
                  onChange={(e) => setEdgeOrigin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono text-xs"
                >
                  {lines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Destino (Linha)</label>
                <select
                  value={edgeTarget}
                  onChange={(e) => setEdgeTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono text-xs"
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
                <label className="block text-slate-400 mb-1 font-mono">Tipo de Relação</label>
                <select
                  value={edgeRelation}
                  onChange={(e) => setEdgeRelation(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono text-xs"
                >
                  <option value="MANDATORY">MANDATORY (Obrigatória)</option>
                  <option value="PARALLEL">PARALLEL (Paralela)</option>
                  <option value="ALTERNATIVE">ALTERNATIVE (Alternativa)</option>
                  <option value="CONDITIONAL">CONDITIONAL (Condicional)</option>
                  <option value="OPTIONAL">OPTIONAL (Opcional)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Lead Time (min)</label>
                <Input
                  type="number"
                  value={edgeLeadTime}
                  onChange={(e) => setEdgeLeadTime(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Buffer Mín (t)</label>
                <Input
                  type="number"
                  value={edgeBufferMin}
                  onChange={(e) => setEdgeBufferMin(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Buffer Alvo (t)</label>
                <Input
                  type="number"
                  value={edgeBufferTarget}
                  onChange={(e) => setEdgeBufferTarget(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-mono">Buffer Máx (t)</label>
                <Input
                  type="number"
                  value={edgeBufferMax}
                  onChange={(e) => setEdgeBufferMax(Number(e.target.value))}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddEdgeModalOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddEdge}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
            >
              Salvar Relação &rarr;
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SequencingPage
