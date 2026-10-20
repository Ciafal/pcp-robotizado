import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  RefreshCw,
  ExternalLink,
  Activity,
  History,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductionFilterBar } from '@/components/production-control/ProductionFilterBar'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import { ProductionOrderCooisDetailModal } from '@/components/production-control/ProductionOrderCooisDetailModal'
import { MassStatusChangeModal } from '@/components/production-control/MassStatusChangeModal'
import { MassCloseModal } from '@/components/production-control/MassCloseModal'
import { MassOperationResultModal } from '@/components/production-control/MassOperationResultModal'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Columns,
  Lock,
  ChevronDown,
  ChevronRight,
  Eye,
  CheckSquare,
  Square,
} from 'lucide-react'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type { ProductionOrder, ProductionFiltersState } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

type CardFilterType =
  | 'ALL'
  | 'PROGRAMADA'
  | 'LIBERADA'
  | 'EM_PRODUCAO'
  | 'CONCLUIDA'
  | 'AGUARDANDO_FECHAMENTO'
  | 'PENDENCIA'
  | 'DESVIO'
  | 'CRITICA'

export const ProductionOrdersPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [isHomologation, setIsHomologation] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [filters, setFilters] = useState<ProductionFiltersState>(() => {
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    return {
      ...defaultProductionFilters,
      op_number: search || '',
      status: status || 'TODOS',
    }
  })
  const [activeCardFilter, setActiveCardFilter] = useState<CardFilterType>('ALL')

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [cooisModalOpen, setCooisModalOpen] = useState(false)

  // Seleção múltipla para ações em massa
  const [selectedOpNumbers, setSelectedOpNumbers] = useState<Set<string>>(new Set())

  // Modais de ações coletivas
  const [massStatusModalOpen, setMassStatusModalOpen] = useState(false)
  const [massCloseModalOpen, setMassCloseModalOpen] = useState(false)
  const [massResultModalOpen, setMassResultModalOpen] = useState(false)
  const [massResultData, setMassResultData] = useState<{
    title: string
    batchId: string
    summary: { total: number; success: number; failed: number }
    results: any[]
  }>({
    title: '',
    batchId: '',
    summary: { total: 0, success: 0, failed: 0 },
    results: [],
  })

  // Visibilidade de colunas
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    op: true,
    confirmacao_coois: true,
    contador: true,
    empresa: true,
    linha: true,
    centro: true,
    material: true,
    descricao: true,
    programado: true,
    produzido: true,
    apontado: true,
    saldo: true,
    data_apontamento: true,
    turma: true,
    turno: true,
    hora_apontamento: true,
    conf_final: true,
    causa_desvio: true,
    data_prevista: true,
    status_op: true,
    status_mes: true,
    status_sap: true,
    rendimento: true,
    produtividade: true,
    pendencias: true,
    criticidade: true,
  })

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [mes, ordersRes] = await Promise.all([
        pcpProductionService.checkMESConnection().catch(
          (): MESConnectionStatus => ({
            available: false,
            lastChecked: new Date().toISOString(),
            message: 'MES 4.0 indisponível temporariamente',
            source: 'OFFLINE',
            activeLinesWithRealtime: [],
          }),
        ),
        pcpProductionService.getOrders(filters).catch((err: any) => ({
          success: false,
          data: pcpProductionService.getStandardSeedOrders(),
          error: err?.message || 'Erro ao carregar ordens',
          isFallback: true,
          source: 'HOMOLOGATION_SEED' as const,
        })),
      ])
      setMesStatus(mes)
      const data = ordersRes?.data || []
      setOrders(Array.isArray(data) ? data : [])
      setIsHomologation(Boolean(ordersRes?.isFallback))
      if (ordersRes && !ordersRes.success && ordersRes.error) {
        setLoadError(ordersRes.error)
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Não foi possível carregar os dados.')
      setOrders(pcpProductionService.getStandardSeedOrders())
      setIsHomologation(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenDetail = (order: ProductionOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  // Contagens para os cards do topo
  const totalCount = orders.length
  const programadasCount = orders.filter((o) => o.status_op === 'PROGRAMADA').length
  const liberadasCount = orders.filter(
    (o) => o.status_sap === 'CRIADA_LIBERADA' || (o.status_op as string) === 'LIBERADA',
  ).length
  const emProducaoCount = orders.filter((o) => o.status_op === 'EM_PRODUCAO').length
  const concluidasCount = orders.filter(
    (o) =>
      o.status_op === 'CONCLUIDA_FISICAMENTE' ||
      o.quantity_produced_tons >= o.quantity_planned_tons,
  ).length
  const aguardandoFechamentoCount = orders.filter(
    (o) =>
      o.status_fechamento === 'PENDENTE_DE_FECHAMENTO' || o.status_op === 'AGUARDANDO_FECHAMENTO',
  ).length
  const pendenciasCount = orders.filter((o) => o.has_pendency).length
  const desvioCount = orders.filter((o) => o.has_deviation || o.visual_status === 'DESVIO').length
  const criticasCount = orders.filter(
    (o) =>
      o.criticality === 'CRITICA' ||
      o.visual_status === 'CRITICO' ||
      o.status_sap === 'REJEITADA_SAP' ||
      o.status_sap === 'ERRO_INTEGRACAO',
  ).length

  // Filtragem combinada (filtros da barra + card clicado)
  const displayedOrders = useMemo(() => {
    if (activeCardFilter === 'ALL') return orders
    if (activeCardFilter === 'PROGRAMADA') return orders.filter((o) => o.status_op === 'PROGRAMADA')
    if (activeCardFilter === 'LIBERADA')
      return orders.filter(
        (o) => o.status_sap === 'CRIADA_LIBERADA' || (o.status_op as string) === 'LIBERADA',
      )
    if (activeCardFilter === 'EM_PRODUCAO')
      return orders.filter((o) => o.status_op === 'EM_PRODUCAO')
    if (activeCardFilter === 'CONCLUIDA')
      return orders.filter(
        (o) =>
          o.status_op === 'CONCLUIDA_FISICAMENTE' ||
          o.quantity_produced_tons >= o.quantity_planned_tons,
      )
    if (activeCardFilter === 'AGUARDANDO_FECHAMENTO')
      return orders.filter(
        (o) =>
          o.status_fechamento === 'PENDENTE_DE_FECHAMENTO' ||
          o.status_op === 'AGUARDANDO_FECHAMENTO',
      )
    if (activeCardFilter === 'PENDENCIA') return orders.filter((o) => o.has_pendency)
    if (activeCardFilter === 'DESVIO')
      return orders.filter((o) => o.has_deviation || o.visual_status === 'DESVIO')
    if (activeCardFilter === 'CRITICA')
      return orders.filter(
        (o) =>
          o.criticality === 'CRITICA' ||
          o.visual_status === 'CRITICO' ||
          o.status_sap === 'REJEITADA_SAP' ||
          o.status_sap === 'ERRO_INTEGRACAO',
      )
    return orders
  }, [orders, activeCardFilter])

  // Seleção coletiva de OPs
  const handleToggleSelectOp = (opNumber: string) => {
    const next = new Set(selectedOpNumbers)
    if (next.has(opNumber)) {
      next.delete(opNumber)
    } else {
      next.add(opNumber)
    }
    setSelectedOpNumbers(next)
  }

  const handleSelectAllFiltered = () => {
    const allFilteredOps = displayedOrders.map((o) => o.op_number)
    const allSelected =
      allFilteredOps.length > 0 && allFilteredOps.every((op) => selectedOpNumbers.has(op))
    if (allSelected) {
      setSelectedOpNumbers(new Set())
    } else {
      setSelectedOpNumbers(new Set(allFilteredOps))
    }
  }

  const handleClearSelection = () => {
    setSelectedOpNumbers(new Set())
  }

  // Abrir detalhes COOIS
  const handleOpenCooisDetail = (order: ProductionOrder) => {
    setSelectedOrder(order)
    setCooisModalOpen(true)
  }

  // Obter ordens selecionadas para envio aos modais
  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedOpNumbers.has(o.op_number))
  }, [orders, selectedOpNumbers])

  const handleExportSelectedCSV = () => {
    const list = selectedOrdersList.length > 0 ? selectedOrdersList : displayedOrders
    if (list.length === 0) return
    const headers = [
      'OP',
      'Empresa',
      'Linha',
      'Centro',
      'Material',
      'Descricao',
      'Qtde_Programada_t',
      'Qtde_Produzida_t',
      'Qtde_Apontada_t',
      'Saldo_t',
      'Status_OP',
      'Status_MES',
      'Status_SAP',
      'Rendimento_Real_pct',
      'Criticidade',
    ]
    const rows = list.map((o) => [
      o.op_number,
      o.empresa_code,
      o.linha_code,
      o.centro_code,
      o.material_code,
      `"${(o.material_description || '').replace(/"/g, '""')}"`,
      String(o.quantity_planned_tons).replace('.', ','),
      String(o.quantity_produced_tons).replace('.', ','),
      String(o.quantity_posted_tons).replace('.', ','),
      String(o.balance_tons).replace('.', ','),
      o.status_op,
      o.status_mes,
      o.status_sap,
      String(o.yield_realized_pct).replace('.', ','),
      o.criticality,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `ordens-selecionadas-ciafal-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleExportCSV = () => {
    if (displayedOrders.length === 0) return
    const headers = [
      'OP',
      'Empresa',
      'Linha',
      'Centro',
      'Material',
      'Descricao',
      'Qtde_Programada_t',
      'Qtde_Produzida_t',
      'Qtde_Apontada_t',
      'Saldo_t',
      'Status_OP',
      'Status_MES',
      'Status_SAP',
      'Rendimento_Real_pct',
      'Criticidade',
    ]
    const rows = displayedOrders.map((o) => [
      o.op_number,
      o.empresa_code,
      o.linha_code,
      o.centro_code,
      o.material_code,
      `"${(o.material_description || '').replace(/"/g, '""')}"`,
      String(o.quantity_planned_tons).replace('.', ','),
      String(o.quantity_produced_tons).replace('.', ','),
      String(o.quantity_posted_tons).replace('.', ','),
      String(o.balance_tons).replace('.', ','),
      o.status_op,
      o.status_mes,
      o.status_sap,
      String(o.yield_realized_pct).replace('.', ','),
      o.criticality,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `ordens-producao-ciafal-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Controle de Ordens de Produção (MES x SAP ECC)
            </h1>
            <Badge className="bg-[#004C97] hover:bg-[#003d7a] text-white text-[11px] font-semibold">
              CONTROLE DE PRODUÇÃO
            </Badge>
            {isHomologation && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-900 border-amber-300 text-[11px] font-medium"
              >
                Dados de homologação
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Acompanhamento completo das ordens: volumes programados, apuração no MES, integração SAP
            e conciliação de saldos.
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
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Ordens
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs bg-white text-[#004C97] border-slate-200 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar Visão
          </Button>

          {/* Selecionar Colunas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white text-slate-700 border-slate-200"
              >
                <Columns className="w-3.5 h-3.5 mr-1.5" />
                Selecionar colunas
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-xs">Colunas da Tabela</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.confirmacao_coois}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, confirmacao_coois: Boolean(c) }))
                }
              >
                Confirmação (COOIS)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.contador}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, contador: Boolean(c) }))
                }
              >
                Contador (COOIS)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.conf_final}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, conf_final: Boolean(c) }))
                }
              >
                Confirmação Final
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.causa_desvio}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, causa_desvio: Boolean(c) }))
                }
              >
                Causa de Desvio
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.turma}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, turma: Boolean(c) }))
                }
              >
                Turma
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.turno}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, turno: Boolean(c) }))
                }
              >
                Turno
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.hora_apontamento}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, hora_apontamento: Boolean(c) }))
                }
              >
                Hora de Apontamento
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.data_apontamento}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, data_apontamento: Boolean(c) }))
                }
              >
                Data Apontamento (DD/MM)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.empresa}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, empresa: Boolean(c) }))
                }
              >
                Empresa
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.linha}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, linha: Boolean(c) }))
                }
              >
                Linha
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.centro}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, centro: Boolean(c) }))
                }
              >
                Centro
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.rendimento}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, rendimento: Boolean(c) }))
                }
              >
                Rendimento (%)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.produtividade}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, produtividade: Boolean(c) }))
                }
              >
                Produtividade (t/h)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status_mes}
                onCheckedChange={(c) =>
                  setVisibleColumns((prev) => ({ ...prev, status_mes: Boolean(c) }))
                }
              >
                Status MES
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* CARDS CLICÁVEIS NO TOPO (FILTRAM A TABELA) */}
      <ErrorBoundary moduleName="Cards de Filtragem de OPs" variant="compact">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
          {/* Total */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('ALL')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'ALL'
                ? 'bg-blue-50/80 border-[#004C97] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase block truncate">
              Total OPs
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-0.5">
              {totalCount}
            </span>
          </button>

          {/* Programadas */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('PROGRAMADA')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'PROGRAMADA'
                ? 'bg-blue-50/80 border-[#004C97] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase block truncate">
              Programadas
            </span>
            <span className="text-xl font-bold font-mono text-slate-800 block mt-0.5">
              {programadasCount}
            </span>
          </button>

          {/* Liberadas */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('LIBERADA')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'LIBERADA'
                ? 'bg-blue-50/80 border-[#004C97] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase block truncate">
              Liberadas
            </span>
            <span className="text-xl font-bold font-mono text-slate-800 block mt-0.5">
              {liberadasCount}
            </span>
          </button>

          {/* Em Produção */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('EM_PRODUCAO')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'EM_PRODUCAO'
                ? 'bg-blue-50/80 border-[#004C97] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-blue-700 uppercase block truncate">
              Em Produção
            </span>
            <span className="text-xl font-bold font-mono text-blue-900 block mt-0.5">
              {emProducaoCount}
            </span>
          </button>

          {/* Concluídas */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('CONCLUIDA')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'CONCLUIDA'
                ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-emerald-700 uppercase block truncate">
              Concluídas
            </span>
            <span className="text-xl font-bold font-mono text-emerald-800 block mt-0.5">
              {concluidasCount}
            </span>
          </button>

          {/* Aguardando Fechamento */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('AGUARDANDO_FECHAMENTO')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'AGUARDANDO_FECHAMENTO'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-amber-700 uppercase block truncate">
              Aguard. Fech.
            </span>
            <span className="text-xl font-bold font-mono text-amber-800 block mt-0.5">
              {aguardandoFechamentoCount}
            </span>
          </button>

          {/* Com Pendência */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('PENDENCIA')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'PENDENCIA'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-amber-700 uppercase block truncate">
              Com Pendência
            </span>
            <span className="text-xl font-bold font-mono text-amber-800 block mt-0.5">
              {pendenciasCount}
            </span>
          </button>

          {/* Com Desvio */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('DESVIO')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'DESVIO'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-amber-800 uppercase block truncate">
              Com Desvio
            </span>
            <span className="text-xl font-bold font-mono text-amber-900 block mt-0.5">
              {desvioCount}
            </span>
          </button>

          {/* Críticas */}
          <button
            type="button"
            onClick={() => setActiveCardFilter('CRITICA')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'CRITICA'
                ? 'bg-rose-50 border-rose-500 shadow-xs'
                : 'bg-white border-rose-200 hover:border-rose-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-rose-700 uppercase block truncate">
              Críticas
            </span>
            <span className="text-xl font-bold font-mono text-rose-700 block mt-0.5">
              {criticasCount}
            </span>
          </button>
        </div>
      </ErrorBoundary>

      {/* FILTROS PADRONIZADOS */}
      <ErrorBoundary moduleName="Filtros de Ordens" variant="compact">
        <ProductionFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={loadData}
          onRefresh={loadData}
          loading={loading}
        />
      </ErrorBoundary>

      {/* BARRA DE AÇÕES COLETIVAS (AO SELECIONAR OPS) */}
      {selectedOpNumbers.size > 0 && (
        <div className="bg-[#004C97] text-white rounded-xl p-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-md">
              <CheckSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm block">
                {selectedOpNumbers.size}{' '}
                {selectedOpNumbers.size === 1 ? 'ordem selecionada' : 'ordens selecionadas'}
              </span>
              <span className="text-[11px] text-blue-100">
                Ações coletivas sincronizadas com auditoria corporativa e SAP ECC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMassStatusModalOpen(true)}
              className="h-8 text-xs bg-white text-[#004C97] hover:bg-blue-50 border-transparent font-medium"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Alterar status
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMassCloseModalOpen(true)}
              className="h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white hover:text-white border-transparent font-medium"
            >
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Encerrar ordens
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSelectedCSV}
              className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar selecionadas
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="h-8 text-xs text-white hover:bg-white/20 hover:text-white"
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* TABELA DE ORDENS COM TODAS AS COLUNAS, CAMPOS COOIS E AÇÕES DIRECIONADAS */}
      <ErrorBoundary moduleName="Tabela de Ordens de Produção" variant="compact">
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-3 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Mostrando <strong>{displayedOrders.length}</strong> ordens de produção
              </span>
              {activeCardFilter !== 'ALL' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveCardFilter('ALL')}
                  className="h-6 text-[11px] text-blue-700 hover:text-blue-900 p-0 underline"
                >
                  Limpar filtro de card
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="h-6 text-[11px] text-slate-700 hover:text-slate-900"
              >
                {displayedOrders.length > 0 &&
                displayedOrders.every((o) => selectedOpNumbers.has(o.op_number))
                  ? 'Desmarcar todas filtradas'
                  : 'Selecionar todos os resultados filtrados'}
              </Button>
              <span className="text-slate-500 hidden sm:inline">
                Valores em pt-BR (toneladas em <strong>t</strong>; percentuais com vírgula)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b sticky top-0 z-10">
                <tr>
                  {/* Checkbox de Seleção Coletiva */}
                  <th className="py-2.5 px-3 w-10 text-center">
                    <Checkbox
                      checked={
                        displayedOrders.length > 0 &&
                        displayedOrders.every((o) => selectedOpNumbers.has(o.op_number))
                      }
                      onCheckedChange={handleSelectAllFiltered}
                      aria-label="Selecionar todas as ordens visíveis"
                    />
                  </th>
                  <th className="py-2.5 px-3">OP</th>
                  {visibleColumns.confirmacao_coois && <th className="py-2.5 px-3">Confirmação</th>}
                  {visibleColumns.contador && <th className="py-2.5 px-3 text-center">Contador</th>}
                  {visibleColumns.conf_final && (
                    <th className="py-2.5 px-3 text-center">Conf. Final</th>
                  )}
                  {visibleColumns.causa_desvio && <th className="py-2.5 px-3">Causa de Desvio</th>}
                  {visibleColumns.data_apontamento && (
                    <th className="py-2.5 px-3 text-center">Data Apont.</th>
                  )}
                  {visibleColumns.turma && <th className="py-2.5 px-3 text-center">Turma</th>}
                  {visibleColumns.turno && <th className="py-2.5 px-3 text-center">Turno</th>}
                  {visibleColumns.hora_apontamento && (
                    <th className="py-2.5 px-3 text-center">Hora Apont.</th>
                  )}
                  {visibleColumns.empresa && <th className="py-2.5 px-3">Empresa</th>}
                  {visibleColumns.linha && <th className="py-2.5 px-3">Linha</th>}
                  {visibleColumns.centro && <th className="py-2.5 px-3">Centro</th>}
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3 text-right">Prog. (t)</th>
                  <th className="py-2.5 px-3 text-right">Prod. (t)</th>
                  <th className="py-2.5 px-3 text-right">Apont. (t)</th>
                  <th className="py-2.5 px-3 text-right">Saldo (t)</th>
                  <th className="py-2.5 px-3 text-center">Data Prev.</th>
                  <th className="py-2.5 px-3 text-center">Início Real</th>
                  <th className="py-2.5 px-3 text-center">Fim Real</th>
                  <th className="py-2.5 px-3 text-center">Status OP</th>
                  {visibleColumns.status_mes && (
                    <th className="py-2.5 px-3 text-center">Status MES</th>
                  )}
                  <th className="py-2.5 px-3 text-center">Status SAP</th>
                  {visibleColumns.rendimento && (
                    <th className="py-2.5 px-3 text-center">Rendimento</th>
                  )}
                  {visibleColumns.produtividade && (
                    <th className="py-2.5 px-3 text-center">Produtiv.</th>
                  )}
                  <th className="py-2.5 px-3 text-center">Pendências</th>
                  <th className="py-2.5 px-3 text-center">Criticidade</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={28} className="py-12 text-center text-slate-500 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[#004C97] animate-spin" />
                        <span>Carregando ordens...</span>
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td
                      colSpan={28}
                      className="py-8 text-center text-rose-700 text-xs bg-rose-50/50"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span>Não foi possível carregar os dados. Tentar novamente.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={loadData}
                          className="h-7 text-xs border-rose-300 text-rose-800 bg-white hover:bg-rose-50"
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : displayedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={28} className="py-10 text-center text-slate-500 text-xs">
                      Nenhuma Ordem de Produção encontrada.
                    </td>
                  </tr>
                ) : (
                  displayedOrders.map((o) => {
                    const dataPrevista = o.due_date ? formatDatePTBR(o.due_date) : '-'
                    const inicioReal = o.started_at
                      ? formatDatePTBR(o.started_at.slice(0, 10))
                      : '-'
                    const fimReal = o.ended_at ? formatDatePTBR(o.ended_at.slice(0, 10)) : '-'
                    const isSelected = selectedOpNumbers.has(o.op_number)

                    // Obter apontamentos / confirmações da OP (COOIS)
                    const confirmations = pcpProductionService.getOrderConfirmations(o.op_number)
                    const lastConf = confirmations[0] // mais recente
                    const hasConfirmations = confirmations.length > 0

                    return (
                      <tr
                        key={o.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/80 hover:bg-blue-100/60' : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => handleOpenCooisDetail(o)}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectOp(o.op_number)}
                            aria-label={`Selecionar OP ${o.op_number}`}
                          />
                        </td>

                        {/* OP (clicável para abrir COOIS) */}
                        <td className="py-2.5 px-3 font-bold text-[#004C97] font-mono whitespace-nowrap hover:underline">
                          <span title="Clique para abrir detalhes COOIS">{o.op_number}</span>
                        </td>

                        {/* Confirmação COOIS (com suporte a múltiplas sem concatenação ilegível) */}
                        {visibleColumns.confirmacao_coois && (
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                            {hasConfirmations ? (
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-800">
                                  {lastConf.confirmation_number}
                                </span>
                                {confirmations.length > 1 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1 py-0 bg-slate-100 text-slate-600 font-sans"
                                    title={`Total de ${confirmations.length} apontamentos registrados nesta OP`}
                                  >
                                    +{confirmations.length - 1}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )}

                        {/* Contador COOIS */}
                        {visibleColumns.contador && (
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                            {hasConfirmations ? (
                              <span className="text-slate-700">{lastConf.counter}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )}

                        {/* Confirmação Final */}
                        {visibleColumns.conf_final && (
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {hasConfirmations ? (
                              lastConf.is_final ? (
                                <Badge className="bg-emerald-600 text-white font-medium text-[9px] px-1.5 py-0.5">
                                  🟢 Final
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-white font-medium text-[9px] px-1.5 py-0.5">
                                  🟡 Parcial
                                </Badge>
                              )
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                        )}

                        {/* Causa de Desvio ("Sem causa de desvio" quando vazio — nunca undefined/null) */}
                        {visibleColumns.causa_desvio && (
                          <td className="py-2.5 px-3 max-w-[170px]">
                            <span
                              className={`text-[11px] truncate block ${
                                o.deviation_reason || lastConf?.deviation_reason
                                  ? 'text-amber-800 font-medium'
                                  : 'text-slate-500'
                              }`}
                              title={
                                o.deviation_reason ||
                                lastConf?.deviation_reason ||
                                'Sem causa de desvio'
                              }
                            >
                              {o.deviation_reason ||
                                lastConf?.deviation_reason ||
                                'Sem causa de desvio'}
                            </span>
                          </td>
                        )}

                        {/* Data do Apontamento DD/MM/AAAA */}
                        {visibleColumns.data_apontamento && (
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                            {lastConf?.posting_date ? (
                              <span>{formatDatePTBR(lastConf.posting_date)}</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        )}

                        {/* Turma */}
                        {visibleColumns.turma && (
                          <td className="py-2.5 px-3 text-center text-[11px] whitespace-nowrap text-slate-700">
                            {lastConf?.turma || '-'}
                          </td>
                        )}

                        {/* Turno */}
                        {visibleColumns.turno && (
                          <td className="py-2.5 px-3 text-center text-[11px] whitespace-nowrap text-slate-700">
                            {lastConf?.turno || '-'}
                          </td>
                        )}

                        {/* Hora de Apontamento (24h) */}
                        {visibleColumns.hora_apontamento && (
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                            {lastConf?.posting_time || '-'}
                          </td>
                        )}

                        {/* Empresa */}
                        {visibleColumns.empresa && (
                          <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                            {o.empresa_code}
                          </td>
                        )}

                        {/* Linha */}
                        {visibleColumns.linha && (
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                            {o.linha_code}
                          </td>
                        )}

                        {/* Centro */}
                        {visibleColumns.centro && (
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {o.centro_code}
                          </td>
                        )}

                        {/* Material */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {o.material_code}
                        </td>

                        {/* Descrição */}
                        <td className="py-2.5 px-3 max-w-[200px]">
                          <div
                            className="font-medium text-slate-900 truncate"
                            title={o.material_description}
                          >
                            {o.material_description}
                          </div>
                        </td>

                        {/* Quantidades e Saldo */}
                        <td className="py-2.5 px-3 text-right font-mono font-medium whitespace-nowrap">
                          {formatQuantity(o.quantity_planned_tons, 't')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                          {formatQuantity(o.quantity_produced_tons, 't')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatQuantity(o.quantity_posted_tons, 't')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          <span
                            className={o.balance_tons > 0 ? 'text-amber-700' : 'text-slate-600'}
                          >
                            {formatQuantity(o.balance_tons, 't')}
                          </span>
                        </td>

                        {/* Datas previstas e reais */}
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {dataPrevista}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {inicioReal}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {fimReal}
                        </td>

                        {/* Status OP */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              o.status_op === 'EM_PRODUCAO'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : o.status_op === 'CONCLUIDA_FISICAMENTE'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {o.status_op.replace(/_/g, ' ')}
                          </Badge>
                        </td>

                        {/* Status MES */}
                        {visibleColumns.status_mes && (
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                              {o.status_mes}
                            </Badge>
                          </td>
                        )}

                        {/* Status SAP */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {o.status_sap?.includes('ERRO') ||
                          o.status_sap?.includes('REJEITADA') ||
                          (o.status_sap as string) === 'INDISPONIVEL' ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-rose-50 text-rose-800 border-rose-300 cursor-help"
                              title="Não foi possível consultar o SAP."
                            >
                              Indisponível
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono bg-slate-50 text-slate-700"
                            >
                              {o.status_sap || '-'}
                            </Badge>
                          )}
                        </td>

                        {/* Rendimento */}
                        {visibleColumns.rendimento && (
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                            <span
                              className={
                                o.yield_realized_pct < o.yield_planned_pct
                                  ? 'font-bold text-rose-700'
                                  : 'text-emerald-700'
                              }
                            >
                              {formatPercentagePTBR(o.yield_realized_pct)}
                            </span>
                          </td>
                        )}

                        {/* Produtividade */}
                        {visibleColumns.produtividade && (
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                            {formatQuantity(o.productivity_realized_ton_h || 0, 't/h')}
                          </td>
                        )}

                        {/* Pendências */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {o.has_pendency ||
                          o.op_number === '10004921' ||
                          o.op_number === '10004925' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/pcp/controle-producao/cogi?search=${o.op_number}`)
                              }}
                              className="inline-flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer"
                              title="Clique para abrir Central de Pendências SAP (COGI/CO1P)"
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>⚠ Pendência SAP</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Criticidade */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-mono ${
                              o.criticality === 'CRITICA' || o.visual_status === 'CRITICO'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : o.criticality === 'ALTA' || o.visual_status === 'ATENCAO'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {o.criticality === 'CRITICA' || o.visual_status === 'CRITICO'
                              ? '🔴 Crítica'
                              : o.criticality === 'ALTA' || o.visual_status === 'ATENCAO'
                                ? '🟡 Atenção'
                                : '🟢 Normal'}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td
                          className="py-2.5 px-3 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCooisDetail(o)}
                              className="h-7 px-2 text-xs font-semibold text-[#004C97] hover:bg-blue-50"
                              title="Abrir Visão COOIS (Cabeçalho + Confirmações + Pendências + Histórico)"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver detalhes
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(o)}
                              className="h-7 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              title="Ficha Operacional & Conciliação"
                            >
                              Ficha OP
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/pcp/controle-producao/analise?search=${o.op_number}`)
                              }
                              className="h-7 px-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                              title="Análise IA com Fato, Histórico, Hipótese e Ação Sugerida"
                            >
                              <Sparkles className="w-3 h-3 mr-1 text-blue-600" />
                              IA
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ErrorBoundary>

      {/* Modal COOIS de Detalhes da Ordem (Cabeçalho, Confirmações, Pendências, Histórico) */}
      <ProductionOrderCooisDetailModal
        order={selectedOrder}
        isOpen={cooisModalOpen}
        onClose={() => setCooisModalOpen(false)}
      />

      {/* Modal Clássico de Detalhe Operacional */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />

      {/* POPUP: Alteração de Status em Massa (COHV SAP ECC) */}
      <MassStatusChangeModal
        isOpen={massStatusModalOpen}
        onClose={() => setMassStatusModalOpen(false)}
        selectedOrders={selectedOrdersList}
        onSuccess={(res) => {
          setMassResultData({
            title: 'Alteração de Status em Massa (COHV)',
            batchId: res.batch_id,
            summary: res.summary,
            results: res.results,
          })
          setMassResultModalOpen(true)
          setSelectedOpNumbers(new Set())
        }}
      />

      {/* POPUP: Encerramento de Ordens com Pré-Validação (TECO SAP ECC) */}
      <MassCloseModal
        isOpen={massCloseModalOpen}
        onClose={() => setMassCloseModalOpen(false)}
        selectedOrders={selectedOrdersList}
        onSuccess={(res) => {
          setMassResultData({
            title: 'Encerramento Técnico de Ordens (TECO)',
            batchId: res.batch_id,
            summary: res.summary,
            results: res.results,
          })
          setMassResultModalOpen(true)
          setSelectedOpNumbers(new Set())
        }}
      />

      {/* POPUP: Resultado da Operação com Exportação e Resumo */}
      <MassOperationResultModal
        isOpen={massResultModalOpen}
        onClose={() => setMassResultModalOpen(false)}
        operationTitle={massResultData.title}
        batchId={massResultData.batchId}
        summary={massResultData.summary}
        results={massResultData.results}
        onRefreshData={loadData}
      />
    </div>
  )
}

export default ProductionOrdersPage
