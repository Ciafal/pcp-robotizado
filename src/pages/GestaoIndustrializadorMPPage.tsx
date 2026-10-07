import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Boxes,
  Truck,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronRight,
  Database,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  gestaoIndustrializadorService,
  MPIndustrializerProjectionRow,
  IndustrializadorEntity,
  IndustrializerFilterParams,
  ThresholdParameters,
  DEFAULT_THRESHOLDS,
} from '@/services/gestao-industrializador-service'
import { IndustrializerHeaderFilter } from '@/components/gestao-industrializador/IndustrializerHeaderFilter'
import { IndustrializerDetailModal } from '@/components/gestao-industrializador/IndustrializerDetailModal'
import { IndustrializerParametersModal } from '@/components/gestao-industrializador/IndustrializerParametersModal'

export const GestaoIndustrializadorMPPage: React.FC = () => {
  const [rows, setRows] = useState<MPIndustrializerProjectionRow[]>([])
  const [industrializadores, setIndustrializadores] = useState<IndustrializadorEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<IndustrializerFilterParams>({
    industrializerCode: 'ALL',
  })
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [thresholds, setThresholds] = useState<ThresholdParameters>(
    gestaoIndustrializadorService.getThresholds() || DEFAULT_THRESHOLDS,
  )

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    subtitle: string
    badgeLabel: string
    totalCount: number
    items: any[]
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    badgeLabel: '',
    totalCount: 0,
    items: [],
  })

  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false)
  const officialInfo = gestaoIndustrializadorService.getOfficialSourceInfo()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inds, mpList] = await Promise.all([
        gestaoIndustrializadorService.getIndustrializadores(),
        gestaoIndustrializadorService.getMPProjectionMatrix(filters),
      ])
      setIndustrializadores(inds)
      setRows(mpList)
    } catch (err: any) {
      console.error('Erro ao carregar Matriz de Projeção de MP:', err)
      setError('Não foi possível atualizar os dados do industrializador.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Cards Superiores
  const summary = useMemo(() => {
    const totalAvailable = rows.reduce((acc, r) => acc + r.released_stock_tons, 0)
    const releasedStock = rows.reduce((acc, r) => acc + r.released_stock_tons, 0)
    const qualityControl = rows.reduce((acc, r) => acc + r.quality_control_tons, 0)
    const inTransit = rows.reduce((acc, r) => acc + r.in_transit_tons, 0)
    const programmedCons = rows.reduce((acc, r) => acc + r.programmed_consumption_tons, 0)
    const projectedBalance = totalAvailable + inTransit - programmedCons
    const avgAutonomy =
      rows.length > 0
        ? Math.round(rows.reduce((acc, r) => acc + r.autonomy_days, 0) / rows.length)
        : 0
    const ruptureCount30d = rows.filter(
      (r) => r.autonomy_days < 30 || r.status === 'VERMELHO',
    ).length
    const sortedRuptures = rows
      .filter((r) => r.projected_rupture_date)
      .sort(
        (a, b) =>
          new Date(a.projected_rupture_date!).getTime() -
          new Date(b.projected_rupture_date!).getTime(),
      )
    const firstRuptureDate =
      sortedRuptures.length > 0 ? sortedRuptures[0].projected_rupture_date : 'Nenhuma'

    return {
      totalAvailable,
      releasedStock,
      qualityControl,
      inTransit,
      programmedCons,
      projectedBalance,
      avgAutonomy,
      ruptureCount30d,
      firstRuptureDate,
    }
  }, [rows])

  const formatDateBr = (dStr: string | null) => {
    if (!dStr || dStr === 'Nenhuma') return dStr || 'N/D'
    try {
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return dStr
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dStr
    }
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-3 sm:p-5 lg:p-6 space-y-4">
      {/* 1. FILTRO GERAL COMPARTILHADO */}
      <IndustrializerHeaderFilter
        title="Gestão de MP"
        subtitle="Estoque, trânsito, consumo e projeção de ruptura"
        activeSubtopic="mp"
        industrializadores={industrializadores}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={loadData}
        onOpenSettings={() => setIsParamsModalOpen(true)}
        officialSource={officialInfo.officialSource}
        lastSyncAt={officialInfo.lastSyncAt}
      />

      {/* ERRO */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="text-xs border-rose-300 hover:bg-rose-100 text-rose-800 bg-white gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* 2. CARDS ESPECÍFICOS DE GESTÃO DE MP */}
      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-9 gap-2.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg bg-slate-200/80" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-9 gap-2.5">
          {/* Card 1: MP Total Disponível */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              MP Total Disp.
            </div>
            <div className="text-base font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(summary.totalAvailable, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">DP18 + DP07</div>
          </div>

          {/* Card 2: Estoque Liberado */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Estoque Liberado
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(summary.releasedStock, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Apto à carga</div>
          </div>

          {/* Card 3: Controle de Qualidade */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Controle Qualidade
            </div>
            <div className="text-base font-black text-amber-700 mt-1 font-mono">
              {formatNumberPtBr(summary.qualityControl, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Em inspeção CQ</div>
          </div>

          {/* Card 4: MP em Trânsito */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              MP em Trânsito
            </div>
            <div className="text-base font-black text-blue-700 mt-1 font-mono">
              {formatNumberPtBr(summary.inTransit, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Carretas / TMS</div>
          </div>

          {/* Card 5: Consumo Programado */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Consumo Programado
            </div>
            <div className="text-base font-black text-purple-700 mt-1 font-mono">
              {formatNumberPtBr(summary.programmedCons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sequenciamento</div>
          </div>

          {/* Card 6: Saldo Projetado */}
          <div
            className={`border rounded-lg p-3 shadow-2xs ${
              summary.projectedBalance < 0
                ? 'bg-rose-50/50 border-rose-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Saldo Projetado
            </div>
            <div
              className={`text-base font-black mt-1 font-mono ${
                summary.projectedBalance < 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              {formatNumberPtBr(summary.projectedBalance, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Atual + Trn − Cons</div>
          </div>

          {/* Card 7: Autonomia */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">Autonomia</div>
            <div
              className={`text-base font-black mt-1 font-mono ${
                summary.avgAutonomy < thresholds.autonomy_yellow_days
                  ? 'text-rose-700'
                  : summary.avgAutonomy < thresholds.autonomy_green_days
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {summary.avgAutonomy} <span className="text-xs font-normal">dias</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Média da cadeia</div>
          </div>

          {/* Card 8: Ruptura < 30 dias */}
          <div
            className={`border rounded-lg p-3 shadow-2xs ${
              summary.ruptureCount30d > 0
                ? 'bg-rose-50/50 border-rose-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Ruptura &lt; 30d
            </div>
            <div className="text-base font-black text-rose-700 mt-1 font-mono">
              {summary.ruptureCount30d} <span className="text-xs font-normal">itens</span>
            </div>
            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Ação imediata</div>
          </div>

          {/* Card 9: Primeira Ruptura Prevista */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              1ª Ruptura Prevista
            </div>
            <div className="text-xs sm:text-sm font-black text-slate-800 mt-1 font-mono truncate">
              {formatDateBr(summary.firstRuptureDate)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Projeção diária</div>
          </div>
        </div>
      )}

      {/* 3. MATRIZ DE PROJEÇÃO DE MP COM COLUNAS OBRIGATÓRIAS E EXPANSÃO DA CADEIA */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Matriz de Projeção & Cadeia Completa por MP
            </h2>
            <Badge variant="outline" className="text-[10px] text-slate-600 font-mono">
              {rows.length} materiais
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span>Legenda:</span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Verde (&ge; {thresholds.autonomy_green_days}d)
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Amarelo (&ge; {thresholds.autonomy_yellow_days}d)
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Vermelho (&lt; {thresholds.autonomy_yellow_days}d)
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto max-h-[70vh] border-t border-slate-100">
          <table className="w-full min-w-[1200px] text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-8 sticky left-0 bg-slate-100 z-20"></th>
                <th className="py-2.5 px-3 whitespace-nowrap sticky left-8 bg-slate-100 z-20">
                  MP
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Descrição</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Forma</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Dimensão</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Aço</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Industrializador</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Estoque atual</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Estoque liberado</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">CQ</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Em trânsito</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Consumo prog.</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Saldo projetado</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Autonomia</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Ruptura prev.</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Cobertura cadeia</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Fonte</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-500">
                    <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Nenhuma MP localizada com os filtros aplicados.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isExpanded = Boolean(expandedRows[row.id])
                  const totalChainPhysical =
                    row.current_stock_tons +
                    row.in_transit_tons +
                    row.dp09_tons +
                    row.dp08_tons +
                    row.dp24_tons +
                    row.dp30_tons +
                    row.scrap_scale_tons

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        }`}
                        onClick={() => toggleRow(row.id)}
                      >
                        <td className="py-2 px-3 text-slate-400 sticky left-0 bg-white group-hover:bg-blue-50/40 z-10">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#004C97]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap font-mono sticky left-8 bg-white group-hover:bg-blue-50/40 z-10">
                          {row.mp_code}
                        </td>
                        <td
                          className="py-2 px-3 min-w-[180px] max-w-[260px] truncate"
                          title={row.description}
                        >
                          {row.description}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">{row.shape}</td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono">{row.dimension}</td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono">{row.steel_grade}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                          {row.industrializer_name}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-medium">
                          {formatNumberPtBr(row.current_stock_tons, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-emerald-700 font-semibold">
                          {formatNumberPtBr(row.released_stock_tons, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-amber-700">
                          {formatNumberPtBr(row.quality_control_tons, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-blue-700">
                          {formatNumberPtBr(row.in_transit_tons, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-purple-700">
                          {formatNumberPtBr(row.programmed_consumption_tons, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td
                          className={`py-2 px-3 whitespace-nowrap text-right font-mono font-bold ${
                            row.projected_balance_tons < 0 ? 'text-rose-700' : 'text-slate-900'
                          }`}
                        >
                          {formatNumberPtBr(row.projected_balance_tons, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold">
                          {row.autonomy_days} d
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                          {formatDateBr(row.projected_rupture_date)}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-slate-700">
                          {formatNumberPtBr(row.total_chain_coverage_pct, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}{' '}
                          %
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'VERMELHO'
                                ? 'bg-rose-100 text-rose-800'
                                : row.status === 'AMARELO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          {row.data_source}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          {formatDateBr(row.last_sync_at)}
                        </td>
                      </tr>

                      {/* Expansão da Cadeia Completa (Semiacabado, Acabado, DP07/18, Sucata, Trânsito e Resumo Físico) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={19} className="p-4 border-y border-slate-200">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3.5 shadow-2xs">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-[#004C97]" />
                                  <span className="font-bold text-xs text-slate-900">
                                    Detalhamento da Cadeia Física &bull; {row.mp_code} &mdash;{' '}
                                    {row.description}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-500 font-mono">
                                  Industrializador:{' '}
                                  <span className="font-semibold text-slate-800">
                                    {row.industrializer_name}
                                  </span>
                                </div>
                              </div>

                              {/* Grade de Etapas Físicas */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                                  <div className="text-[10px] uppercase font-bold text-slate-500">
                                    Tarugo Pátio (DP18)
                                  </div>
                                  <div className="text-sm font-black text-slate-800 font-mono mt-1">
                                    {formatNumberPtBr(row.dp18_tons, {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    t
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Inteiro</div>
                                </div>

                                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                                  <div className="text-[10px] uppercase font-bold text-slate-500">
                                    Tarugo Preparado (DP07)
                                  </div>
                                  <div className="text-sm font-black text-slate-800 font-mono mt-1">
                                    {formatNumberPtBr(row.dp07_tons, {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    t
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Cortado</div>
                                </div>

                                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                                  <div className="text-[10px] uppercase font-bold text-slate-500">
                                    Semiacabado (DP09/DP08)
                                  </div>
                                  <div className="text-sm font-black text-amber-700 font-mono mt-1">
                                    {formatNumberPtBr(row.dp09_tons + row.dp08_tons, {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    t
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    DP09: {row.dp09_tons}t | DP08: {row.dp08_tons}t
                                  </div>
                                </div>

                                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                                  <div className="text-[10px] uppercase font-bold text-slate-500">
                                    Acabado Relacionado (DP24/30)
                                  </div>
                                  <div className="text-sm font-black text-emerald-700 font-mono mt-1">
                                    {formatNumberPtBr(row.dp24_tons + row.dp30_tons, {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    t
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    DP24: {row.dp24_tons}t | DP30: {row.dp30_tons}t
                                  </div>
                                </div>

                                <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                                  <div className="text-[10px] uppercase font-bold text-slate-500">
                                    Sucata e Carepa
                                  </div>
                                  <div className="text-sm font-black text-slate-700 font-mono mt-1">
                                    {formatNumberPtBr(row.scrap_scale_tons, {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    t
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    Resíduo fabril
                                  </div>
                                </div>

                                <div className="p-2.5 rounded border border-blue-200 bg-blue-50/60">
                                  <div className="text-[10px] uppercase font-bold text-blue-900">
                                    Total Físico da Cadeia
                                  </div>
                                  <div className="text-sm font-black text-blue-950 font-mono mt-1">
                                    {formatNumberPtBr(totalChainPhysical, {
                                      minimumFractionDigits: 1,
                                      maximumFractionDigits: 1,
                                    })}{' '}
                                    t
                                  </div>
                                  <div className="text-[10px] text-blue-700 mt-0.5">
                                    Sem dupla contagem
                                  </div>
                                </div>
                              </div>

                              {/* Detalhamento de Trânsito */}
                              {row.transits_detail.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                                    Remessas em Trânsito Associadas
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {row.transits_detail.map((t) => (
                                      <div
                                        key={t.id}
                                        className="p-2 rounded border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                                      >
                                        <div>
                                          <div className="font-semibold text-slate-800">
                                            {t.invoice_number} &bull; Placa: {t.vehicle_plate}
                                          </div>
                                          <div className="text-[11px] text-slate-500">
                                            Origem: {t.origin} &bull; Prev. Chegada:{' '}
                                            {formatDateBr(t.expected_arrival)}
                                          </div>
                                        </div>
                                        <Badge className="bg-blue-100 text-blue-800 font-mono text-[11px]">
                                          {formatNumberPtBr(t.quantity_tons, {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                          })}{' '}
                                          t
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE PARÂMETROS */}
      <IndustrializerParametersModal
        isOpen={isParamsModalOpen}
        onClose={() => setIsParamsModalOpen(false)}
        currentThresholds={thresholds}
        onSave={(newParams) => {
          gestaoIndustrializadorService.setThresholds(newParams)
          setThresholds(newParams)
          loadData()
        }}
      />
    </div>
  )
}
export default GestaoIndustrializadorMPPage
