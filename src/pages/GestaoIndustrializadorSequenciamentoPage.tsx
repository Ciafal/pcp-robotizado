import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CalendarDays,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Layers,
  Activity,
  ArrowUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  gestaoIndustrializadorService,
  SequenciamentoPrevistoRealizadoItem,
  IndustrializadorEntity,
  IndustrializerFilterParams,
  ThresholdParameters,
  DEFAULT_THRESHOLDS,
  MaterialTimelineStep,
} from '@/services/gestao-industrializador-service'
import { IndustrializerHeaderFilter } from '@/components/gestao-industrializador/IndustrializerHeaderFilter'
import { MaterialTimelineModal } from '@/components/gestao-industrializador/MaterialTimelineModal'
import { IndustrializerParametersModal } from '@/components/gestao-industrializador/IndustrializerParametersModal'

export const GestaoIndustrializadorSequenciamentoPage: React.FC = () => {
  const [items, setItems] = useState<SequenciamentoPrevistoRealizadoItem[]>([])
  const [industrializadores, setIndustrializadores] = useState<IndustrializadorEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<IndustrializerFilterParams>({
    industrializerCode: 'ALL',
  })
  const [thresholds, setThresholds] = useState<ThresholdParameters>(
    gestaoIndustrializadorService.getThresholds() || DEFAULT_THRESHOLDS,
  )

  // Visualização por dia/semana/mês/material/família/aço/industrializador
  const [viewGrouping, setViewGrouping] = useState<
    'todos' | 'dia' | 'semana' | 'mes' | 'material' | 'aco' | 'industrializador'
  >('todos')

  // Timeline Modal
  const [selectedTimeline, setSelectedTimeline] = useState<{
    isOpen: boolean
    materialCode: string
    materialDescription: string
    productionOrder: string
    steps: MaterialTimelineStep[]
  }>({
    isOpen: false,
    materialCode: '',
    materialDescription: '',
    productionOrder: '',
    steps: [],
  })

  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false)
  const officialInfo = gestaoIndustrializadorService.getOfficialSourceInfo()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inds, seqList] = await Promise.all([
        gestaoIndustrializadorService.getIndustrializadores(),
        gestaoIndustrializadorService.getSequenciamentoPrevistoRealizado(filters),
      ])
      setIndustrializadores(inds)
      setItems(seqList)
    } catch (err: any) {
      console.error('Erro ao carregar Sequenciamento Previsto x Realizado:', err)
      setError('Não foi possível atualizar os dados do industrializador.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Indicadores dos 8 Cards do Sequenciamento
  const summary = useMemo(() => {
    const volProgrammed = items.reduce((acc, r) => acc + r.planned_volume_tons, 0)
    const volRealized = items.reduce((acc, r) => acc + r.realized_quantity_tons, 0)
    const saldoRealizar = Math.max(0, volProgrammed - volRealized)
    const adherence = volProgrammed > 0 ? Math.min(100, (volRealized / volProgrammed) * 100) : 100
    const totalMaterials = items.length
    const completedMaterials = items.filter(
      (r) => r.realized_quantity_tons >= r.planned_volume_tons && r.planned_volume_tons > 0,
    ).length
    const delayedMaterials = items.filter((r) => r.status === 'VERMELHO').length
    const avgDaysDeviation =
      items.length > 0
        ? Math.round(
            (items.reduce((acc, r) => acc + (r.days_deviation || 0), 0) / items.length) * 10,
          ) / 10
        : 0

    return {
      volProgrammed,
      volRealized,
      saldoRealizar,
      adherence,
      totalMaterials,
      completedMaterials,
      delayedMaterials,
      avgDaysDeviation,
    }
  }, [items])

  const formatDateBr = (dStr: string | null) => {
    if (!dStr) return 'Pendente'
    try {
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return dStr
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dStr
    }
  }

  const openTimeline = (row: SequenciamentoPrevistoRealizadoItem) => {
    setSelectedTimeline({
      isOpen: true,
      materialCode: row.material_code,
      materialDescription: row.material_description,
      productionOrder: row.production_order,
      steps: row.timeline_steps,
    })
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-3 sm:p-5 lg:p-6 space-y-4">
      {/* 1. FILTRO GERAL COMPARTILHADO */}
      <IndustrializerHeaderFilter
        title="Sequenciamento — Previsto x Realizado"
        subtitle="Aderência da programação por industrializador &bull; Sem duplicação de colunas &bull; Timeline ponta a ponta"
        activeSubtopic="sequenciamento"
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

      {/* 2. CABEÇALHO OPERACIONAL DE PROGRAMAÇÃO */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Industrializador Ativo
            </span>
            <span className="font-semibold text-slate-800">
              {filters.industrializerCode && filters.industrializerCode !== 'ALL'
                ? filters.industrializerCode
                : 'Todos os Industrializadores'}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Mês / Período
            </span>
            <span className="font-semibold text-slate-800">
              {filters.programmingMonth || 'Competência Corrente (Março/2026)'}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Centro / Linha
            </span>
            <span className="font-semibold text-slate-800">
              {filters.centerLine || 'Linhas L1 / L2 (CFPL)'}
            </span>
          </div>

          <div className="border-l border-slate-200 pl-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">
              Status Programação
            </span>
            <Badge className="bg-emerald-600 text-white text-[10px]">Oficial Aprovada</Badge>
          </div>
        </div>

        {/* Agrupamento da Visualização */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md p-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Visão:</span>
          <select
            value={viewGrouping}
            onChange={(e) => setViewGrouping(e.target.value as any)}
            className="h-6 text-xs bg-white border border-slate-300 rounded px-2 text-slate-700 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="todos">Padrão Sequência</option>
            <option value="dia">Por Dia</option>
            <option value="semana">Por Semana</option>
            <option value="mes">Por Mês</option>
            <option value="material">Por Material</option>
            <option value="aco">Por Aço</option>
            <option value="industrializador">Por Industrializador</option>
          </select>
        </div>
      </div>

      {/* 3. OS 8 CARDS DE SEQUENCIAMENTO */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg bg-slate-200/80" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {/* Card 1: Volume Programado */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Volume Programado
            </div>
            <div className="text-base font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(summary.volProgrammed, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Meta da carga</div>
          </div>

          {/* Card 2: Volume Realizado */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Volume Realizado
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(summary.volRealized, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Apontado MES</div>
          </div>

          {/* Card 3: Saldo a Realizar */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Saldo a Realizar
            </div>
            <div className="text-base font-black text-slate-800 mt-1 font-mono">
              {formatNumberPtBr(summary.saldoRealizar, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Pendente produção</div>
          </div>

          {/* Card 4: Aderência % */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Aderência Total
            </div>
            <div
              className={`text-base font-black mt-1 font-mono ${
                summary.adherence >= thresholds.adherence_green_pct
                  ? 'text-emerald-700'
                  : summary.adherence >= thresholds.adherence_yellow_pct
                    ? 'text-amber-700'
                    : 'text-rose-700'
              }`}
            >
              {formatNumberPtBr(summary.adherence, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              %
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Real / Prog</div>
          </div>

          {/* Card 5: Materiais Programados */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Mat. Programados
            </div>
            <div className="text-base font-black text-slate-900 mt-1 font-mono">
              {summary.totalMaterials}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Itens sequenciados</div>
          </div>

          {/* Card 6: Materiais Concluídos */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Mat. Concluídos
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {summary.completedMaterials}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">100% apontados</div>
          </div>

          {/* Card 7: Materiais Atrasados */}
          <div
            className={`border rounded-lg p-3 shadow-2xs ${
              summary.delayedMaterials > 0
                ? 'bg-rose-50/50 border-rose-300'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Mat. Atrasados
            </div>
            <div className="text-base font-black text-rose-700 mt-1 font-mono">
              {summary.delayedMaterials}
            </div>
            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Desvio crítico</div>
          </div>

          {/* Card 8: Desvio Médio de Prazo */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Desvio Médio
            </div>
            <div className="text-base font-black text-slate-800 mt-1 font-mono">
              {summary.avgDaysDeviation} <span className="text-xs font-normal">dias</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Atraso temporal</div>
          </div>
        </div>
      )}

      {/* 4. TABELA COM AS COLUNAS EXATAS EXIGIDAS (SEM DUPLICIDADE DE FATURAMENTO) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#004C97]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Grade de Sequenciamento &bull; Clique no material para abrir a Linha do Tempo
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> No Prazo
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Parcial
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Atrasado
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-sky-700">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Futura
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[70vh]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Seq.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Material</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Descrição</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Vol. previsto (t)</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tarugo padrão</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data prevista de industrialização</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data prevista de faturamento</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Estoque DP09</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Estoque DP24</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Estoque DP30</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. prevista total</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. realizada</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data real de industrialização</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data real de faturamento</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Desvio qtd. (t)</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Desvio prazo (dias)</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Aderência %</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-12 text-center text-slate-500">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Nenhum sequenciamento encontrado para os filtros selecionados.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      onClick={() => openTimeline(row)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      title="Clique para abrir a Timeline Rastreável do Material"
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-500">
                        {row.sequence_order}
                      </td>
                      <td className="py-2 px-3 font-semibold text-blue-700 hover:underline whitespace-nowrap font-mono">
                        {row.material_code}
                      </td>
                      <td
                        className="py-2 px-3 min-w-[160px] max-w-[220px] truncate"
                        title={row.material_description}
                      >
                        {row.material_description}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatNumberPtBr(row.planned_volume_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {row.standard_billet}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-700">
                        {formatDateBr(row.predicted_industrialization_date)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-700">
                        {formatDateBr(row.predicted_billing_date)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-amber-700">
                        {formatNumberPtBr(row.stock_dp09_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-emerald-700">
                        {formatNumberPtBr(row.stock_dp24_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-emerald-700">
                        {formatNumberPtBr(row.stock_dp30_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono">
                        {formatNumberPtBr(row.total_planned_quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-emerald-700">
                        {formatNumberPtBr(row.realized_quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.real_industrialization_date)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.real_billing_date)}
                      </td>
                      <td
                        className={`py-2 px-3 whitespace-nowrap text-right font-mono ${
                          row.quantity_deviation_tons < 0
                            ? 'text-rose-700 font-bold'
                            : 'text-slate-600'
                        }`}
                      >
                        {formatNumberPtBr(row.quantity_deviation_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono">
                        {row.days_deviation}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold">
                        {formatNumberPtBr(row.adherence_pct, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
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
                                : row.status === 'AZUL'
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {row.status_label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {/* RODAPÉ COM TOTALIZAÇÃO OFICIAL */}
            {items.length > 0 && (
              <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                <tr>
                  <td colSpan={3} className="py-3 px-3 uppercase tracking-wider">
                    Total Geral do Sequenciamento
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sm">
                    {formatNumberPtBr(summary.volProgrammed, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </td>
                  <td colSpan={7}></td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700">
                    {formatNumberPtBr(summary.volRealized, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </td>
                  <td colSpan={2}></td>
                  <td className="py-3 px-3 text-right font-mono text-sm text-rose-700">
                    {formatNumberPtBr(summary.volRealized - summary.volProgrammed, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </td>
                  <td></td>
                  <td className="py-3 px-3 text-right font-mono text-sm">
                    {formatNumberPtBr(summary.adherence, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    %
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* TIMELINE MODAL */}
      <MaterialTimelineModal
        isOpen={selectedTimeline.isOpen}
        onClose={() => setSelectedTimeline({ ...selectedTimeline, isOpen: false })}
        materialCode={selectedTimeline.materialCode}
        materialDescription={selectedTimeline.materialDescription}
        productionOrder={selectedTimeline.productionOrder}
        steps={selectedTimeline.steps}
      />

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
export default GestaoIndustrializadorSequenciamentoPage
