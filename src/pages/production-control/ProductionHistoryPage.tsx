import React, { useState, useEffect, useMemo } from 'react'
import {
  History,
  Search,
  Filter,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type { ProductionOrder, ProductionTimelineEvent } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export const ProductionHistoryPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)

  // Filtros de busca
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [selectedCentro, setSelectedCentro] = useState<string>('TODOS')
  const [selectedLinha, setSelectedLinha] = useState<string>('TODOS')
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS')
  const [selectedFamilia, setSelectedFamilia] = useState<string>('TODOS')

  // OP selecionada para detalhe histórico completo
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [orderEvents, setOrderEvents] = useState<ProductionTimelineEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Modal amplo de OP
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, oList] = await Promise.all([
        pcpProductionService.checkMESConnection().catch(
          (): MESConnectionStatus => ({
            available: false,
            lastChecked: new Date().toISOString(),
            message: 'Falha na checagem do MES 4.0',
            source: 'OFFLINE',
            activeLinesWithRealtime: [],
          }),
        ),
        pcpProductionService.listOrders(defaultProductionFilters).catch(() => []),
      ])
      setMesStatus(mes)
      const list = Array.isArray(oList) ? oList : []
      setOrders(list)

      // Se houver parâmetro de busca por OP, seleciona diretamente a ordem correspondente
      const initialSearch = searchParams.get('search')
      if (initialSearch && list.length > 0) {
        const found = list.find((o) =>
          o.op_number.toLowerCase().includes(initialSearch.toLowerCase()),
        )
        if (found) {
          selectOrderForTimeline(found)
        } else {
          selectOrderForTimeline(list[0])
        }
      } else if (list.length > 0) {
        selectOrderForTimeline(list[0])
      }
    } finally {
      setLoading(false)
    }
  }

  const selectOrderForTimeline = async (order: ProductionOrder) => {
    setSelectedOrder(order)
    setLoadingEvents(true)
    try {
      const events = await pcpProductionService.getOrderEvents(order.id).catch(() => [])
      setOrderEvents(Array.isArray(events) ? events : [])
    } finally {
      setLoadingEvents(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem da lista lateral de OPs para histórico
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (searchTerm) {
        const t = searchTerm.toLowerCase()
        const match =
          o.op_number.toLowerCase().includes(t) ||
          o.material_code.toLowerCase().includes(t) ||
          o.material_description.toLowerCase().includes(t)
        if (!match) return false
      }
      if (selectedCentro !== 'TODOS' && o.centro_code !== selectedCentro) return false
      if (selectedLinha !== 'TODOS' && o.linha_code !== selectedLinha) return false
      if (selectedStatus !== 'TODOS' && o.status_op !== selectedStatus) return false
      if (selectedFamilia !== 'TODOS' && o.family_code !== selectedFamilia) return false
      return true
    })
  }, [orders, searchTerm, selectedCentro, selectedLinha, selectedStatus, selectedFamilia])

  // Centros e linhas dinâmicos
  const centrosDisponiveis = useMemo(
    () => Array.from(new Set(orders.map((o) => o.centro_code))).filter(Boolean),
    [orders],
  )
  const linhasDisponiveis = useMemo(
    () => Array.from(new Set(orders.map((o) => o.linha_code))).filter(Boolean),
    [orders],
  )
  const familiasDisponiveis = useMemo(
    () => Array.from(new Set(orders.map((o) => o.family_code))).filter(Boolean),
    [orders],
  )

  // Timeline cronológica enriquecida (Programação PCP → Criação → Liberação → Início → Apontamentos → Paradas → Retomada → Conclusão → SAP → Fechamento)
  const chronologicalTimeline = useMemo(() => {
    if (!selectedOrder) return []

    // Constrói linha do tempo oficial
    const timeline = [...orderEvents]

    // Se houver poucos eventos nos logs, garantimos a cadeia completa padronizada de eventos da OP
    const existingTypes = new Set(timeline.map((e) => e.event_type))

    if (!existingTypes.has('PROGRAMACAO_PCP')) {
      timeline.unshift({
        id: `prog-pcp-${selectedOrder.id}`,
        order_id: selectedOrder.id,
        event_type: 'PROGRAMACAO_PCP',
        event_title: 'Programação PCP Aprovada',
        description: `Ordem incluída no sequenciamento semanal oficial com meta de ${formatQuantity(selectedOrder.quantity_planned_tons, 't')}.`,
        user_name: 'Planejador PCP',
        origin: 'PCP',
        logged_at: selectedOrder.created_at,
        quantity_impact_tons: selectedOrder.quantity_planned_tons,
      })
    }

    if (!existingTypes.has('CRIACAO_OP')) {
      timeline.push({
        id: `criacao-op-${selectedOrder.id}`,
        order_id: selectedOrder.id,
        event_type: 'CRIACAO_OP',
        event_title: 'OP Gerada no SAP ECC',
        description: `Ordem gerada com roteiro padrão para centro ${selectedOrder.centro_code} e linha ${selectedOrder.linha_code}.`,
        user_name: 'Interface SAP',
        origin: 'SAP',
        logged_at: selectedOrder.created_at,
      })
    }

    if (
      selectedOrder.started_at &&
      !existingTypes.has('INICIO_PRODUCAO') &&
      !existingTypes.has('INICIO_FISICO')
    ) {
      timeline.push({
        id: `inicio-prod-${selectedOrder.id}`,
        order_id: selectedOrder.id,
        event_type: 'INICIO_PRODUCAO',
        event_title: 'Início Físico na Linha',
        description: `Processamento fabril iniciado no MES pelo turno operacional.`,
        user_name: 'Operador Líder',
        origin: 'MES',
        logged_at: selectedOrder.started_at,
      })
    }

    if (selectedOrder.quantity_posted_tons > 0 && !existingTypes.has('APONTAMENTO')) {
      timeline.push({
        id: `apont-prod-${selectedOrder.id}`,
        order_id: selectedOrder.id,
        event_type: 'APONTAMENTO',
        event_title: 'Apontamentos Realizados',
        description: `Total de ${formatQuantity(selectedOrder.quantity_posted_tons, 't')} lançados e conciliados.`,
        user_name: 'Líder / MES 4.0',
        origin: 'MES',
        logged_at: selectedOrder.last_posting_at || selectedOrder.created_at,
        quantity_impact_tons: selectedOrder.quantity_posted_tons,
      })
    }

    if (
      (selectedOrder.status_op === 'CONCLUIDA_FISICAMENTE' ||
        selectedOrder.quantity_produced_tons >= selectedOrder.quantity_planned_tons) &&
      !existingTypes.has('CONCLUSAO_FISICA')
    ) {
      timeline.push({
        id: `concl-fisica-${selectedOrder.id}`,
        order_id: selectedOrder.id,
        event_type: 'CONCLUSAO_FISICA',
        event_title: 'Conclusão Física no MES',
        description: `Volume total produzido de ${formatQuantity(selectedOrder.quantity_produced_tons, 't')}.`,
        user_name: 'Supervisão de Produção',
        origin: 'MES',
        logged_at:
          selectedOrder.ended_at || selectedOrder.last_posting_at || selectedOrder.created_at,
        quantity_impact_tons: selectedOrder.quantity_produced_tons,
      })
    }

    if (
      selectedOrder.status_sap === 'CONFIRMADA_TOTAL' ||
      (selectedOrder.status_sap as string) === 'PROCESSADO_SAP'
    ) {
      timeline.push({
        id: `sap-sync-${selectedOrder.id}`,
        order_id: selectedOrder.id,
        event_type: 'INTEGRACAO_SAP',
        event_title: 'Integração SAP Concluída (ZPPT010)',
        description: `Documentos fiscais e de estoque gerados sem divergências no SAP ECC.`,
        user_name: 'Conector RFC',
        origin: 'SAP',
        logged_at: selectedOrder.ended_at || selectedOrder.created_at,
      })
    }

    // Ordenar cronologicamente
    return timeline.sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime(),
    )
  }, [selectedOrder, orderEvents])

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Histórico de Ordens de Produção
            </h1>
            <Badge className="bg-[#004C97] hover:bg-[#003d7a] text-white text-[11px] font-semibold">
              CONTROLE DE PRODUÇÃO
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Rastreabilidade completa e timeline cronológica de eventos (PCP &rarr; Liberação &rarr;
            Produção &rarr; Apontamentos &rarr; SAP &rarr; Fechamento). Histórico imutável.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <MESIntegrationBanner
            status={mesStatus}
            loading={loading}
            onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* FILTROS DE BUSCA ESPECÍFICOS */}
      <ErrorBoundary moduleName="Filtros do Histórico" variant="compact">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, código ou descrição de material..."
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          <Select value={selectedCentro} onValueChange={setSelectedCentro}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-white">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Centro: Todos</SelectItem>
              {centrosDisponiveis.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLinha} onValueChange={setSelectedLinha}>
            <SelectTrigger className="h-8 text-xs w-[120px] bg-white">
              <SelectValue placeholder="Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Linha: Todas</SelectItem>
              {linhasDisponiveis.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFamilia} onValueChange={setSelectedFamilia}>
            <SelectTrigger className="h-8 text-xs w-[150px] bg-white">
              <SelectValue placeholder="Família" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Família: Todas</SelectItem>
              {familiasDisponiveis.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-8 text-xs w-[150px] bg-white">
              <SelectValue placeholder="Status OP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Status: Todos</SelectItem>
              <SelectItem value="EM_PRODUCAO">Em Produção</SelectItem>
              <SelectItem value="CONCLUIDA_FISICAMENTE">Concluída Fisicamente</SelectItem>
              <SelectItem value="PROGRAMADA">Programada</SelectItem>
              <SelectItem value="AGUARDANDO_FECHAMENTO">Aguardando Fechamento</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm ||
            selectedCentro !== 'TODOS' ||
            selectedLinha !== 'TODOS' ||
            selectedStatus !== 'TODOS' ||
            selectedFamilia !== 'TODOS') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setSelectedCentro('TODOS')
                setSelectedLinha('TODOS')
                setSelectedStatus('TODOS')
                setSelectedFamilia('TODOS')
              }}
              className="h-8 text-xs text-slate-600 hover:text-slate-900"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </ErrorBoundary>

      {/* PAINEL DE 2 COLUNAS: LISTA DE OPs À ESQUERDA + DETALHE HISTÓRICO COM TIMELINE À DIREITA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coluna 1: Lista Selecionável de Ordens */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col max-h-[820px]">
          <div className="p-3 border-b bg-slate-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Ordens Localizadas ({filteredOrders.length})
            </span>
            <span className="text-[11px] text-slate-500">Selecione para ver a timeline</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {filteredOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              filteredOrders.map((o) => {
                const isSelected = selectedOrder?.id === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectOrderForTimeline(o)}
                    className={`w-full p-3 text-left transition-colors flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-[#004C97]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-[#004C97] text-xs">
                        OP {o.op_number}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {o.linha_code} &bull; {o.centro_code}
                      </Badge>
                    </div>

                    <div
                      className="text-xs text-slate-800 font-medium truncate"
                      title={o.material_description}
                    >
                      {o.material_description}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Prog: {formatQuantity(o.quantity_planned_tons, 't')}</span>
                      <span>Prod: {formatQuantity(o.quantity_produced_tons, 't')}</span>
                      <span>Saldo: {formatQuantity(o.balance_tons, 't')}</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono ${
                          o.status_op === 'EM_PRODUCAO'
                            ? 'bg-blue-50 text-blue-800'
                            : o.status_op === 'CONCLUIDA_FISICAMENTE'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {o.status_op.replace(/_/g, ' ')}
                      </Badge>

                      <span className="text-[10px] text-slate-400">
                        {formatDatePTBR(o.created_at)}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Coluna 2: Detalhes da OP Selecionada + Indicadores + Timeline Cronológica */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedOrder ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500 shadow-2xs">
              Selecione uma Ordem de Produção à esquerda para visualizar sua linha do tempo e
              indicadores históricos.
            </div>
          ) : (
            <>
              {/* Card de Indicadores Históricos da OP */}
              <ErrorBoundary moduleName="Indicadores Históricos da OP" variant="compact">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 font-mono">
                          OP {selectedOrder.op_number} &bull; {selectedOrder.centro_code} (
                          {selectedOrder.linha_code})
                        </h2>
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                          {selectedOrder.family_code}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {selectedOrder.material_code} &bull; {selectedOrder.material_description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(selectedOrder)
                          setDetailModalOpen(true)
                        }}
                        className="h-8 text-xs text-[#004C97] border-slate-200 hover:bg-slate-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        Ver Registro Completo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`/pcp/producao/ia-analises?search=${selectedOrder.op_number}`)
                        }
                        className="h-8 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Análise IA
                      </Button>
                    </div>
                  </div>

                  {/* Grid de Métricas da OP: Programada, Realizada, Diferença, Rendimento Prev/Real, Produtividade, Setup, Parada, Apontamentos, Fechamento */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        Prog. (PCP)
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                        {formatQuantity(selectedOrder.quantity_planned_tons, 't')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200">
                      <span className="text-[10px] font-semibold text-blue-800 uppercase block">
                        Realizado (MES)
                      </span>
                      <span className="text-base font-bold font-mono text-blue-900 block mt-0.5">
                        {formatQuantity(selectedOrder.quantity_produced_tons, 't')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        Diferença / Saldo
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                        {formatQuantity(selectedOrder.balance_tons, 't')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        Rendimento Metálico
                      </span>
                      <span className="text-xs font-mono font-bold block mt-1">
                        <span className="text-slate-500">
                          {formatPercentagePTBR(selectedOrder.yield_planned_pct)}
                        </span>
                        <span className="text-slate-300 mx-1">/</span>
                        <span
                          className={
                            selectedOrder.yield_realized_pct < selectedOrder.yield_planned_pct
                              ? 'text-rose-700'
                              : 'text-emerald-700'
                          }
                        >
                          {formatPercentagePTBR(selectedOrder.yield_realized_pct)}
                        </span>
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        Produtividade
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900 block mt-0.5">
                        {formatQuantity(selectedOrder.productivity_realized_ton_h || 0, 't/h')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                        Status Fechamento
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono mt-1 ${
                          selectedOrder.status_fechamento === 'FECHADA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {selectedOrder.status_fechamento}
                      </Badge>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* TIMELINE CRONOLÓGICA DE EVENTOS (HISTÓRICO IMUTÁVEL) */}
              <ErrorBoundary moduleName="Timeline Cronológica da OP" variant="compact">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#004C97]" />
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Linha do Tempo Cronológica da Ordem
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {chronologicalTimeline.length} evento(s) encadeado(s)
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {chronologicalTimeline.map((ev, idx) => {
                      return (
                        <div key={ev.id || idx} className="relative group">
                          {/* Ponto / Marcador */}
                          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#004C97] shadow-xs" />

                          <div className="bg-slate-50 hover:bg-blue-50/40 p-3 rounded-lg border border-slate-200 transition-colors space-y-1.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {ev.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[9px] font-mono px-1.5 py-0 bg-white"
                                >
                                  {ev.origin || 'SISTEMA'}
                                </Badge>
                              </div>

                              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                                <span>{formatDatePTBR(ev.timestamp)}</span>
                                <span className="text-slate-300">&bull;</span>
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  {ev.userOrSystem || 'Sistema'}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed">
                              {ev.description}
                            </p>

                            {ev.payload?.quantity_impact_tons !== undefined && (
                              <div className="text-[11px] font-mono text-[#004C97] font-semibold pt-0.5">
                                Volume apontado / impacto:{' '}
                                {formatQuantity(Number(ev.payload.quantity_impact_tons), 't')}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </ErrorBoundary>
            </>
          )}
        </div>
      </div>

      {/* Modal Amplo de Detalhe da OP */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}

export default ProductionHistoryPage
