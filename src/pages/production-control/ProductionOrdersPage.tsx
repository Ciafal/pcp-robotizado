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
            Exportar
          </Button>
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

      {/* TABELA DE ORDENS COM TODAS AS COLUNAS E AÇÕES DIRECIONADAS */}
      <ErrorBoundary moduleName="Tabela de Ordens de Produção" variant="compact">
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-3 border-b bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
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
            <span className="text-slate-500">
              Valores em pt-BR (toneladas em <strong>t</strong>; percentuais com vírgula)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">OP</th>
                  <th className="py-2.5 px-3">Empresa</th>
                  <th className="py-2.5 px-3">Linha</th>
                  <th className="py-2.5 px-3">Centro</th>
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
                  <th className="py-2.5 px-3 text-center">Status MES</th>
                  <th className="py-2.5 px-3 text-center">Status SAP</th>
                  <th className="py-2.5 px-3 text-center">Rendimento</th>
                  <th className="py-2.5 px-3 text-center">Produtiv.</th>
                  <th className="py-2.5 px-3 text-center">Pendências</th>
                  <th className="py-2.5 px-3 text-center">Criticidade</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={21} className="py-12 text-center text-slate-500 text-xs">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 text-[#004C97] animate-spin" />
                        <span>Carregando ordens...</span>
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td
                      colSpan={21}
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
                    <td colSpan={21} className="py-10 text-center text-slate-500 text-xs">
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

                    return (
                      <tr
                        key={o.id}
                        onClick={() => handleOpenDetail(o)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold text-[#004C97] font-mono whitespace-nowrap">
                          {o.op_number}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {o.empresa_code}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                          {o.linha_code}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {o.centro_code}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {o.material_code}
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <div
                            className="font-medium text-slate-900 truncate"
                            title={o.material_description}
                          >
                            {o.material_description}
                          </div>
                        </td>
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
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {dataPrevista}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {inicioReal}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {fimReal}
                        </td>
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
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                            {o.status_mes}
                          </Badge>
                        </td>
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
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] whitespace-nowrap">
                          {formatQuantity(o.productivity_realized_ton_h || 0, 't/h')}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {o.has_pendency ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-mono">
                              {o.pendencies_count || 1} pendência(s)
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
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
                        <td
                          className="py-2.5 px-3 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(o)}
                              className="h-7 px-2 text-xs font-medium text-[#004C97] hover:bg-blue-50"
                              title="Detalhar OP completa"
                            >
                              Detalhar OP
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/pcp/controle-producao/apontamentos?search=${o.op_number}`,
                                )
                              }
                              className="h-7 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              title="Ver Apontamentos desta OP"
                            >
                              Ver Apontamentos
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/pcp/controle-producao/historico?search=${o.op_number}`)
                              }
                              className="h-7 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                              title="Ver Histórico e timeline desta OP"
                            >
                              Ver Histórico
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
                              Análise IA
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

      {/* Modal Amplo de Detalhe Completo da OP */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}

export default ProductionOrdersPage
