import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Boxes,
  Truck,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  PackageCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Database,
  Calendar,
  Sparkles,
  BarChart3,
  Scale,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  gestaoIndustrializadorService,
  ConsolidatedIndustrializerMetrics,
  IndustrializadorEntity,
  IndustrializerFilterParams,
  ThresholdParameters,
  DEFAULT_THRESHOLDS,
} from '@/services/gestao-industrializador-service'
import { IndustrializerHeaderFilter } from '@/components/gestao-industrializador/IndustrializerHeaderFilter'
import { IndustrializerDetailModal } from '@/components/gestao-industrializador/IndustrializerDetailModal'
import { IndustrializerParametersModal } from '@/components/gestao-industrializador/IndustrializerParametersModal'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export const GestaoIndustrializadorConsolidadaPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ConsolidatedIndustrializerMetrics | null>(null)
  const [industrializadores, setIndustrializadores] = useState<IndustrializadorEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<IndustrializerFilterParams>({
    industrializerCode: 'ALL',
  })
  const [thresholds, setThresholds] = useState<ThresholdParameters>(
    gestaoIndustrializadorService.getThresholds() || DEFAULT_THRESHOLDS,
  )

  // Modais de Detalhamento
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    title: string
    subtitle: string
    badgeLabel: string
    totalCount: number
    items: any[]
    type:
      | 'MP_DETAIL'
      | 'CARTEIRA_DETAIL'
      | 'SEQUENCING_DETAIL'
      | 'ESTOQUE_DETAIL'
      | 'AI_RECOMMENDATION'
      | 'CHAIN_SUMMARY'
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    badgeLabel: '',
    totalCount: 0,
    items: [],
    type: 'MP_DETAIL',
  })

  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false)

  const officialInfo = gestaoIndustrializadorService.getOfficialSourceInfo()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inds, cons] = await Promise.all([
        gestaoIndustrializadorService.getIndustrializadores(),
        gestaoIndustrializadorService.getConsolidatedMetrics(filters),
      ])
      setIndustrializadores(inds)
      setMetrics(cons)
    } catch (err: any) {
      console.error('Erro ao carregar dados consolidados do industrializador:', err)
      setError('Não foi possível atualizar os dados do industrializador.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openDrilldown = (
    key: string,
    title: string,
    subtitle: string,
    badgeLabel: string,
    type: any,
  ) => {
    if (!metrics) return
    const items = metrics.materials_detail[key] || []
    setModalState({
      isOpen: true,
      title,
      subtitle,
      badgeLabel,
      totalCount: items.length,
      items,
      type,
    })
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-3 sm:p-5 lg:p-6 space-y-4">
      {/* 1. FILTRO GERAL COMPARTILHADO COM INDUSTRIALIZADOR DINÂMICO */}
      <IndustrializerHeaderFilter
        title="Gestão Industrializador — Visão Consolidada"
        subtitle="Painel executivo com 14 indicadores estratégicos, segregação de estoques sem dupla contagem e rastreabilidade SAP"
        activeSubtopic="mp"
        industrializadores={industrializadores}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={loadData}
        onOpenSettings={() => setIsParamsModalOpen(true)}
        officialSource={officialInfo.officialSource}
        lastSyncAt={officialInfo.lastSyncAt}
      />

      {/* 2. ESTADOS: ERRO OU CARREGAMENTO */}
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

      {loading && !metrics ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 14 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg bg-slate-200/80" />
          ))}
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          {/* Navegação Rápida entre Subtópicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              to="/pcp/gestao-industrializador/mp"
              className="bg-white border border-slate-200 hover:border-[#004C97] hover:shadow-sm rounded-lg p-3 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-[#004C97] flex items-center justify-center font-bold text-xs">
                  MP
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#004C97]">
                    1. Gestão de MP
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Projeção, DP07/18, trânsito e rupturas
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#004C97] group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/pcp/gestao-industrializador/carteira"
              className="bg-white border border-slate-200 hover:border-[#004C97] hover:shadow-sm rounded-lg p-3 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs">
                  CR
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-purple-700">
                    2. Análise de Carteira
                  </h3>
                  <p className="text-[10px] text-slate-500">Base SAP ZSD28C, riscos e alertas</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/pcp/gestao-industrializador/sequenciamento"
              className="bg-white border border-slate-200 hover:border-[#004C97] hover:shadow-sm rounded-lg p-3 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  SQ
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                    3. Sequenciamento P x R
                  </h3>
                  <p className="text-[10px] text-slate-500">Aderência %, datas reais e timeline</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/pcp/gestao-industrializador/estoque"
              className="bg-white border border-slate-200 hover:border-[#004C97] hover:shadow-sm rounded-lg p-3 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                  ES
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-amber-700">
                    4. Estoque Industrializados
                  </h3>
                  <p className="text-[10px] text-slate-500">Semiacabados, acabados e faturados</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* 3. OS 14 CARDS CLICÁVEIS COM DRILLDOWN EM MODAL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#004C97]" />
                14 Indicadores Consolidados da Cadeia (Clique em cada card para abrir detalhamento)
              </h2>
              <span className="text-[11px] text-slate-500">
                Fórmula oficial sem dupla contagem &bull; SI (t)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {/* 1. MP Total Disponível */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'mp_available',
                    'MP Total Disponível',
                    'Tarugos liberados nos depósitos DP18 (inteiro) e DP07 (cortado)',
                    'Estoque Liberado',
                    'MP_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  MP Disponível
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                  {formatNumberPtBr(metrics.mp_total_available_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <span>DP18 + DP07</span>
                </div>
              </button>

              {/* 2. MP em CQ */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'mp_quality',
                    'MP em Controle de Qualidade',
                    'Lotes aguardando laudo mecânico/químico ou inspeção ultrassom',
                    'Inspeção CQ',
                    'MP_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  MP em Qualidade
                </div>
                <div className="text-base sm:text-lg font-black text-amber-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.mp_quality_control_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Aguardando laudo</div>
              </button>

              {/* 3. MP em Trânsito */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'mp_transit',
                    'MP em Trânsito',
                    'Remessas com NF emitida a caminho da laminação ou do industrializador',
                    'Em Transporte',
                    'MP_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  MP em Trânsito
                </div>
                <div className="text-base sm:text-lg font-black text-blue-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.mp_in_transit_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Com NF rastreada</div>
              </button>

              {/* 4. Necessidade Programada de MP */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'mp_consumption',
                    'Necessidade Programada de MP',
                    'Consumo total previsto pelas ordens de produção sequenciadas',
                    'Consumo Previsto',
                    'MP_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Necessidade MP
                </div>
                <div className="text-base sm:text-lg font-black text-purple-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.mp_programmed_requirement_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Sequenciamento L1/L2</div>
              </button>

              {/* 5. Saldo Projetado de MP */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'mp_balance',
                    'Saldo Projetado de MP',
                    'Fórmula: Estoque Atual + Trânsito - Consumo Programado',
                    'Saldo Projetado',
                    'MP_DETAIL',
                  )
                }
                className={`bg-white border hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group ${
                  metrics.mp_projected_balance_tons < 0
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-slate-200 hover:border-emerald-400'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Saldo Projetado
                </div>
                <div
                  className={`text-base sm:text-lg font-black mt-1 font-mono ${
                    metrics.mp_projected_balance_tons < 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {formatNumberPtBr(metrics.mp_projected_balance_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Estoque + Trânsito − Consumo</div>
              </button>

              {/* 6. Materiais com Risco de Ruptura */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'mp_rupture',
                    'Materiais com Risco de Ruptura',
                    'Itens com autonomia inferior ao limite parametrizado ou saldo negativo',
                    'Ruptura Crítica',
                    'MP_DETAIL',
                  )
                }
                className={`bg-white border hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group ${
                  metrics.materials_with_rupture_risk_count > 0
                    ? 'border-rose-400 bg-rose-50/40'
                    : 'border-slate-200 hover:border-emerald-400'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Risco Ruptura
                </div>
                <div className="text-base sm:text-lg font-black text-rose-700 mt-1 font-mono">
                  {metrics.materials_with_rupture_risk_count}{' '}
                  <span className="text-xs font-normal">itens</span>
                </div>
                <div className="text-[10px] text-rose-600 font-semibold mt-1">
                  Autonomia crítica
                </div>
              </button>

              {/* 7. Carteira Total */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'carteira_total',
                    'Carteira Total',
                    'Volume total de ordens ativas atribuídas ao recorte de industrialização',
                    'SAP ZSD28C',
                    'CARTEIRA_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Carteira Total
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                  {formatNumberPtBr(metrics.carteira_total_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Recorte industrializador</div>
              </button>

              {/* 8. Carteira em Risco */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'carteira_risk',
                    'Carteira em Risco',
                    'Pedidos com prazo vencido, sem programação ou com falta de tarugo',
                    'Risco Carteira',
                    'CARTEIRA_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Carteira em Risco
                </div>
                <div className="text-base sm:text-lg font-black text-amber-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.carteira_in_risk_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-amber-600 font-semibold mt-1">
                  Saldo vulnerável
                </div>
              </button>

              {/* 9. Volume Programado */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'sequencing_programmed',
                    'Volume Programado',
                    'Carga oficial alocada na programação de laminação semanal/mensal',
                    'Sequenciamento',
                    'SEQUENCING_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Vol. Programado
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 mt-1 font-mono">
                  {formatNumberPtBr(metrics.volume_programmed_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Meta operacional</div>
              </button>

              {/* 10. Volume Realizado */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'sequencing_realized',
                    'Volume Realizado',
                    'Apontamentos reais de produção concluídos pelo industrializador',
                    'Apontamentos MES',
                    'SEQUENCING_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Vol. Realizado
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.volume_realized_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                  Apontado oficial
                </div>
              </button>

              {/* 11. Aderência ao Sequenciamento */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'sequencing_adherence',
                    'Aderência ao Sequenciamento',
                    'Relação percentual entre realizado e programado vs limiares configurados',
                    'Aderência %',
                    'SEQUENCING_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Aderência Geral
                </div>
                <div
                  className={`text-base sm:text-lg font-black mt-1 font-mono ${
                    metrics.adherence_pct >= thresholds.adherence_green_pct
                      ? 'text-emerald-700'
                      : metrics.adherence_pct >= thresholds.adherence_yellow_pct
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                >
                  {formatNumberPtBr(metrics.adherence_pct, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  %
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Previsto x Realizado</div>
              </button>

              {/* 12. Estoque Semiacabado */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'stock_semi',
                    'Estoque Semiacabado',
                    'Material em estágio intermediário nos depósitos DP09 e DP08',
                    'DP09 / DP08',
                    'ESTOQUE_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Semiacabado
                </div>
                <div className="text-base sm:text-lg font-black text-amber-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.stock_semi_finished_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">DP09 + DP08</div>
              </button>

              {/* 13. Estoque Acabado */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'stock_finished',
                    'Estoque Acabado',
                    'Produto laminado amarrado pronto nos depósitos DP24 e DP30',
                    'DP24 / DP30',
                    'ESTOQUE_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Estoque Acabado
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.stock_finished_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">DP24 + DP30</div>
              </button>

              {/* 14. Faturado aguardando entrada */}
              <button
                type="button"
                onClick={() =>
                  openDrilldown(
                    'billed_awaiting',
                    'Faturado Aguardando Entrada',
                    'Lotes faturados pelo industrializador com NF emitida sem entrada física no WMS',
                    'Pendente Entrada',
                    'ESTOQUE_DETAIL',
                  )
                }
                className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg p-3 text-left transition-all cursor-pointer group"
              >
                <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
                  Faturado Pendente
                </div>
                <div className="text-base sm:text-lg font-black text-blue-700 mt-1 font-mono">
                  {formatNumberPtBr(metrics.billed_awaiting_receipt_tons, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </div>
                <div className="text-[10px] text-slate-500 mt-1">NF 5902 / Trânsito</div>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 4. MODAIS RESPONSIVOS */}
      <IndustrializerDetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        subtitle={modalState.subtitle}
        badgeLabel={modalState.badgeLabel}
        totalCount={modalState.totalCount}
        items={modalState.items}
        type={modalState.type}
      />

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
export default GestaoIndustrializadorConsolidadaPage
