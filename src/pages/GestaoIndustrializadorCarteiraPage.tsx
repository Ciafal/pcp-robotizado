import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Briefcase,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  ArrowRight,
  Database,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  gestaoIndustrializadorService,
  CarteiraIndustrializadorItem,
  IndustrializadorEntity,
  IndustrializerFilterParams,
} from '@/services/gestao-industrializador-service'
import { IndustrializerHeaderFilter } from '@/components/gestao-industrializador/IndustrializerHeaderFilter'
import { IndustrializerDetailModal } from '@/components/gestao-industrializador/IndustrializerDetailModal'
import { MaterialTimelineModal } from '@/components/gestao-industrializador/MaterialTimelineModal'
import { CarteiraMonthlySummary } from '@/services/gestao-industrializador-service'

export const GestaoIndustrializadorCarteiraPage: React.FC = () => {
  const [items, setItems] = useState<CarteiraIndustrializadorItem[]>([])
  const [industrializadores, setIndustrializadores] = useState<IndustrializadorEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<IndustrializerFilterParams>({
    industrializerCode: 'ALL',
    programmingMonth: '2026-03',
  })
  const [monthlySummary, setMonthlySummary] = useState<CarteiraMonthlySummary | null>(null)

  // Modal de Timeline do Material/Pedido
  const [timelineModal, setTimelineModal] = useState<{
    isOpen: boolean
    materialCode: string
    materialDescription: string
    productionOrder: string
    sapOrder: string
    clientName: string
    industrializerName: string
    steps: any[]
  }>({
    isOpen: false,
    materialCode: '',
    materialDescription: '',
    productionOrder: '',
    sapOrder: '',
    clientName: '',
    industrializerName: '',
    steps: [],
  })

  // Modal para detalhamento ou alerta
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

  const officialInfo = gestaoIndustrializadorService.getOfficialSourceInfo()

  // Geração dinâmica dos meses (competências): 12 meses ao redor do ano corrente/2026
  const availableMonths = useMemo(() => {
    const months = [
      { key: '2026-01', label: 'Janeiro/2026' },
      { key: '2026-02', label: 'Fevereiro/2026' },
      { key: '2026-03', label: 'Março/2026' },
      { key: '2026-04', label: 'Abril/2026' },
      { key: '2026-05', label: 'Maio/2026' },
      { key: '2026-06', label: 'Junho/2026' },
      { key: '2026-07', label: 'Julho/2026' },
      { key: '2026-08', label: 'Agosto/2026' },
      { key: '2026-09', label: 'Setembro/2026' },
      { key: '2026-10', label: 'Outubro/2026' },
      { key: '2026-11', label: 'Novembro/2026' },
      { key: '2026-12', label: 'Dezembro/2026' },
    ]
    return months
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const selectedMonthKey = filters.programmingMonth || '2026-03'
      const [inds, carteiraList, summaryRes] = await Promise.all([
        gestaoIndustrializadorService.getIndustrializadores(),
        gestaoIndustrializadorService.getCarteiraIndustrializador(filters),
        gestaoIndustrializadorService.getCarteiraMonthlySummary(selectedMonthKey, filters),
      ])
      setIndustrializadores(inds)
      setItems(carteiraList)
      setMonthlySummary(summaryRes)
    } catch (err: any) {
      console.error('Erro ao carregar Carteira do Industrializador:', err)
      setError('Não foi possível atualizar os dados do industrializador.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Indicadores de Cards
  const summary = useMemo(() => {
    const totalTons = items.reduce((acc, r) => acc + r.ordered_quantity_tons, 0)
    const programmed = items.filter((r) => r.is_programmed)
    const programmedTons = programmed.reduce((acc, r) => acc + r.balance_tons, 0)
    const notProgrammed = items.filter((r) => !r.is_programmed && r.balance_tons > 0)
    const notProgrammedTons = notProgrammed.reduce((acc, r) => acc + r.balance_tons, 0)
    const expired = items.filter((r) => r.is_expired)
    const expiredTons = expired.reduce((acc, r) => acc + r.balance_tons, 0)
    const inRisk = items.filter((r) => r.risk_level === 'ALTO' || r.risk_level === 'CRITICO')
    const inRiskTons = inRisk.reduce((acc, r) => acc + r.balance_tons, 0)
    const missingMP = items.filter((r) => r.mp_availability_status === 'INDISPONIVEL')
    const missingMPTons = missingMP.reduce((acc, r) => acc + r.balance_tons, 0)
    const inIndustrialization = items.filter((r) => r.is_programmed && !r.is_ready_awaiting_billing)
    const inIndustrializationTons = inIndustrialization.reduce((acc, r) => acc + r.balance_tons, 0)
    const readyAwaitingBilling = items.filter((r) => r.is_ready_awaiting_billing)
    const readyAwaitingBillingTons = readyAwaitingBilling.reduce(
      (acc, r) => acc + r.balance_tons,
      0,
    )

    return {
      totalTons,
      programmedTons,
      notProgrammedTons,
      expiredTons,
      inRiskTons,
      missingMPTons,
      inIndustrializationTons,
      readyAwaitingBillingTons,
      programmedItems: programmed,
      notProgrammedItems: notProgrammed,
      expiredItems: expired,
      inRiskItems: inRisk,
      missingMPItems: missingMP,
      inIndustrializationItems: inIndustrialization,
      readyAwaitingBillingItems: readyAwaitingBilling,
    }
  }, [items])

  const openDrilldown = (
    title: string,
    subtitle: string,
    badgeLabel: string,
    drillItems: any[],
  ) => {
    setModalState({
      isOpen: true,
      title,
      subtitle,
      badgeLabel,
      totalCount: drillItems.length,
      items: drillItems,
    })
  }

  const formatDateBr = (dStr: string | null) => {
    if (!dStr) return '—'
    try {
      const parts = dStr.split('-')
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`
      }
      const d = new Date(dStr)
      if (isNaN(d.getTime())) return dStr
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return dStr
    }
  }

  // Totais do rodapé da tabela (TOTAL DO MÊS)
  const tableTotals = useMemo(() => {
    const totalOrdered = items.reduce((acc, r) => acc + (r.ordered_quantity_tons || 0), 0)
    const totalServed = items.reduce((acc, r) => acc + (r.served_quantity_tons || 0), 0)
    const totalBalance = items.reduce((acc, r) => acc + (r.balance_tons || 0), 0)
    return {
      totalOrdered,
      totalServed,
      totalBalance,
    }
  }, [items])

  const openTimeline = (row: CarteiraIndustrializadorItem) => {
    setTimelineModal({
      isOpen: true,
      materialCode: row.material_code,
      materialDescription: row.material_description,
      productionOrder: row.associated_schedule_code || `SAP-${row.sap_order}`,
      sapOrder: row.sap_order,
      clientName: row.client_name,
      industrializerName: row.industrializer_name,
      steps:
        row.timeline_steps && row.timeline_steps.length > 0
          ? row.timeline_steps
          : gestaoIndustrializadorService.buildFullOperatonalTimeline({
              sapOrder: row.sap_order,
              materialCode: row.material_code,
              quantityTons: row.ordered_quantity_tons,
              laminationDate: row.lamination_date || null,
              productionEndDate: row.production_end_date || null,
              productionEndCenter: row.production_end_center || 'ENDL1',
              wmsDate: row.wms_inventory_date || null,
              wmsIsReal: row.wms_inventory_is_real,
              billingDate: row.billing_date || null,
              finalIndDate: row.final_industrializer_date || null,
              industrializerName: row.industrializer_name,
            }),
    })
  }

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-3 sm:p-5 lg:p-6 space-y-4">
      {/* 1. FILTRO GERAL COMPARTILHADO COM SELETOR DE MÊS DINÂMICO */}
      <IndustrializerHeaderFilter
        title="Análise de Carteira"
        subtitle="Pedidos, esteira de datas operacionais e resumo mensal"
        activeSubtopic="carteira"
        industrializadores={industrializadores}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={loadData}
        officialSource={officialInfo.officialSource}
        lastSyncAt={officialInfo.lastSyncAt}
      />

      {/* SELETOR DE MÊS / COMPETÊNCIA DINÂMICO */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#004C97]" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Competência / Mês:
          </span>
          <select
            value={filters.programmingMonth || '2026-03'}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                programmingMonth: e.target.value,
              }))
            }
            className="border border-slate-300 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#004C97]"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>Esteira Operacional:</span>
          <span className="font-mono text-slate-700 font-medium">
            Carteira &rarr; Laminação &rarr; Fim Produção &rarr; WMS (+1d corrido) &rarr;
            Faturamento (+1d útil) &rarr; Industrializador (+2d úteis)
          </span>
        </div>
      </div>

      {/* NOVA SEÇÃO: RESUMO DO MÊS */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Resumo do Mês &mdash; {monthlySummary?.monthLabel || 'Competência Atual'}
            </h3>
            <Badge variant="outline" className="text-[10px] text-slate-600 font-mono">
              Coerência Sequenciamento P x R &bull; Apontamento MES
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500">
            Fonte: Sequenciamento semanal + apontamento real MES/Controle de Produção
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card Resumo 1: Volume Previsto */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-slate-500">Volume Previsto</div>
            <div className="text-lg font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(monthlySummary?.programmedVolumeTons || 0, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Programação válida do período</div>
          </div>

          {/* Card Resumo 2: Volume Atingido */}
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-emerald-800">Volume Atingido</div>
            <div className="text-lg font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(monthlySummary?.realizedVolumeTons || 0, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Apontamento real MES oficial
            </div>
          </div>

          {/* Card Resumo 3: Volume Restante */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-slate-500">Volume Restante</div>
            <div className="text-lg font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(monthlySummary?.remainingVolumeTons || 0, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] mt-0.5">
              {monthlySummary?.isAboveTarget ? (
                <span className="text-emerald-600 font-bold">Acima do previsto</span>
              ) : (
                <span className="text-slate-500">Saldo a laminar no mês</span>
              )}
            </div>
          </div>

          {/* Card Resumo 4: Atingimento % */}
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3">
            <div className="text-[10px] uppercase font-bold text-[#004C97]">Atingimento %</div>
            <div className="text-lg font-black text-[#004C97] mt-1 font-mono">
              {monthlySummary?.achievementPct !== null &&
              monthlySummary?.achievementPct !== undefined
                ? `${formatNumberPtBr(monthlySummary.achievementPct, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })} %`
                : '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Realizado &divide; Previsto</div>
          </div>
        </div>
      </div>

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

      {/* 2. OS 8 CARDS DA ANÁLISE DE CARTEIRA (Grid responsivo: 1 col <600px, 2 col 600-899px, 3 col 900-1199px, 4 col 1200-1599px, 8 col >=1600px) */}
      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg bg-slate-200/80" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8 gap-2.5">
          {/* Card 1: Carteira Total */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira Total do Industrializador',
                'Todos os pedidos atribuídos ao escopo de industrialização',
                'Carteira Total',
                items,
              )
            }
            className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Carteira Total
            </div>
            <div className="text-base font-black text-slate-900 mt-1 font-mono">
              {formatNumberPtBr(summary.totalTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{items.length} pedidos</div>
          </button>

          {/* Card 2: Carteira Programada */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira Programada',
                'Pedidos já vinculados a ordem de produção semanal/mensal',
                'Programada',
                summary.programmedItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Programada
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(summary.programmedTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Alocada em OP</div>
          </button>

          {/* Card 3: Carteira Não Programada */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira Não Programada',
                'Pedidos com saldo aberto sem programação no sequenciamento',
                'Não Programada',
                summary.notProgrammedItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Não Programada
            </div>
            <div className="text-base font-black text-amber-700 mt-1 font-mono">
              {formatNumberPtBr(summary.notProgrammedTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Aguardando OP</div>
          </button>

          {/* Card 4: Carteira Vencida */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira Vencida',
                'Pedidos com data desejada do cliente expirada',
                'Vencida',
                summary.expiredItems,
              )
            }
            className={`border rounded-lg p-3 text-left transition-all cursor-pointer ${
              summary.expiredTons > 0
                ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Carteira Vencida
            </div>
            <div className="text-base font-black text-rose-700 mt-1 font-mono">
              {formatNumberPtBr(summary.expiredTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Prazo expirado</div>
          </button>

          {/* Card 5: Carteira em Risco */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira em Risco',
                'Pedidos com fatores de risco identificados pelo motor do PCP',
                'Risco Crítico',
                summary.inRiskItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-amber-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Carteira em Risco
            </div>
            <div className="text-base font-black text-amber-700 mt-1 font-mono">
              {formatNumberPtBr(summary.inRiskTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Risco de atraso</div>
          </button>

          {/* Card 6: Carteira com Falta de MP */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira com Falta de MP',
                'Pedidos cuja matéria-prima (tarugo) está indisponível ou insuficiente',
                'Falta MP',
                summary.missingMPItems,
              )
            }
            className={`border rounded-lg p-3 text-left transition-all cursor-pointer ${
              summary.missingMPTons > 0
                ? 'bg-rose-50/50 border-rose-300 hover:border-rose-400'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Falta de MP
            </div>
            <div className="text-base font-black text-rose-700 mt-1 font-mono">
              {formatNumberPtBr(summary.missingMPTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Tarugo ausente</div>
          </button>

          {/* Card 7: Carteira em Industrialização */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira em Industrialização',
                'Pedidos alocados com ordem em processamento pelo parceiro',
                'Em Produção',
                summary.inIndustrializationItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-blue-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Em Industrialização
            </div>
            <div className="text-base font-black text-blue-700 mt-1 font-mono">
              {formatNumberPtBr(summary.inIndustrializationTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Na linha fabril</div>
          </button>

          {/* Card 8: Carteira Pronta / Aguardando Faturamento */}
          <button
            type="button"
            onClick={() =>
              openDrilldown(
                'Carteira Pronta / Aguardando Faturamento',
                'Lotes já laminados concluídos aguardando emissão da NF de retorno',
                'Pronta',
                summary.readyAwaitingBillingItems,
              )
            }
            className="bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-xs rounded-lg p-3 text-left transition-all cursor-pointer"
          >
            <div className="text-[10px] uppercase font-bold text-slate-500 truncate">
              Pronta / Faturamento
            </div>
            <div className="text-base font-black text-emerald-700 mt-1 font-mono">
              {formatNumberPtBr(summary.readyAwaitingBillingTons, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
              Aguardando retorno
            </div>
          </button>
        </div>
      )}

      {/* 3. TABELA ANALÍTICA COM TODAS AS COLUNAS EXIGIDAS E ALERTAS AUTOMÁTICOS */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#004C97]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Pedidos de Venda SAP ZSD28C Atribuídos
            </h2>
            <Badge variant="outline" className="text-[10px] text-slate-600 font-mono">
              {items.length} pedidos
            </Badge>
          </div>
          <div className="text-[11px] text-slate-500">
            Inteligência Analítica: A IA identifica e sinaliza desvios sem inventar dados
          </div>
        </div>

        <div className="w-full overflow-x-auto max-h-[70vh] border-t border-slate-100">
          <table className="w-full min-w-[1950px] text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
              <tr>
                {/* 1. Pedido SAP (Fixo à esquerda) */}
                <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-100 z-20 shadow-xs">
                  Pedido SAP
                </th>
                {/* 2. Cliente */}
                <th className="py-2.5 px-3 whitespace-nowrap">Cliente</th>
                {/* 3. Material (Fixo à esquerda se viável, mantido destacado) */}
                <th className="py-2.5 px-3 whitespace-nowrap">Material</th>
                {/* 4. Aço */}
                <th className="py-2.5 px-3 whitespace-nowrap">Aço</th>
                {/* 5. Qtd. Pedido */}
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. Pedido</th>
                {/* 6. Qtd. Atendida */}
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. Atendida</th>
                {/* 7. Saldo Carteira */}
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Saldo Carteira</th>
                {/* 8. Data Solicitada */}
                <th className="py-2.5 px-3 whitespace-nowrap">Data Solicitada</th>
                {/* 9. Data Prevista */}
                <th className="py-2.5 px-3 whitespace-nowrap">Data Prevista</th>
                {/* 10. Data Laminação */}
                <th className="py-2.5 px-3 whitespace-nowrap bg-blue-50/60 text-[#004C97]">
                  Data Laminação
                </th>
                {/* 11. Data Fim Produção */}
                <th className="py-2.5 px-3 whitespace-nowrap bg-blue-50/60 text-[#004C97]">
                  Data Fim Produção
                </th>
                {/* 12. Data Inventário WMS */}
                <th className="py-2.5 px-3 whitespace-nowrap bg-blue-50/60 text-[#004C97]">
                  Data Inventário WMS
                </th>
                {/* 13. Data Faturamento */}
                <th className="py-2.5 px-3 whitespace-nowrap bg-blue-50/60 text-[#004C97]">
                  Data Faturamento
                </th>
                {/* 14. Data Industrializador Final */}
                <th className="py-2.5 px-3 whitespace-nowrap bg-blue-50/60 text-[#004C97]">
                  Data Industrializador Final
                </th>
                {/* 15. Industrializador */}
                <th className="py-2.5 px-3 whitespace-nowrap">Industrializador</th>
                {/* 16. MP Necessária */}
                <th className="py-2.5 px-3 whitespace-nowrap">MP Necessária</th>
                {/* 17. Status */}
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                {/* Risco e detalhes existentes */}
                <th className="py-2.5 px-3 whitespace-nowrap">Risco</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Motivo do Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={19} className="py-12 text-center text-slate-500">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      Nenhum pedido de carteira encontrado com os filtros selecionados.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  return (
                    <tr key={row.id} className="hover:bg-blue-50/40 transition-colors group">
                      {/* 1. Pedido SAP (clicável para abrir timeline) */}
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap font-mono sticky left-0 bg-white group-hover:bg-blue-50/40 z-10 shadow-xs">
                        <button
                          type="button"
                          onClick={() => openTimeline(row)}
                          className="text-[#004C97] hover:underline flex items-center gap-1 font-bold text-left cursor-pointer"
                          title="Clique para abrir timeline completa da esteira"
                        >
                          {row.sap_order}
                          <Sparkles className="w-3 h-3 text-[#004C97]/70" />
                        </button>
                      </td>
                      {/* 2. Cliente */}
                      <td
                        className="py-2 px-3 min-w-[140px] max-w-[200px] truncate"
                        title={row.client_name}
                      >
                        {row.client_name}
                      </td>
                      {/* 3. Material (clicável para abrir timeline) */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-800">
                        <button
                          type="button"
                          onClick={() => openTimeline(row)}
                          className="hover:text-[#004C97] hover:underline text-left cursor-pointer font-semibold"
                          title="Clique para abrir timeline completa do material"
                        >
                          {row.material_code}
                        </button>
                      </td>
                      {/* 4. Aço */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono">{row.steel_grade}</td>
                      {/* 5. Qtd. Pedido */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono">
                        {formatNumberPtBr(row.ordered_quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      {/* 6. Qtd. Atendida */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-emerald-700">
                        {formatNumberPtBr(row.served_quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      {/* 7. Saldo Carteira */}
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatNumberPtBr(row.balance_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      {/* 8. Data Solicitada */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.requested_date)}
                      </td>
                      {/* 9. Data Prevista */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.predicted_delivery_date)}
                      </td>

                      {/* 10. Data Laminação */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {row.lamination_date ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatDateBr(row.lamination_date)}</span>
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-semibold uppercase ${
                                row.lamination_date_status === 'REALIZADA'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.lamination_date_status === 'ATRASADA'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.lamination_date_status === 'REALIZADA' ? 'Real' : 'Prevista'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs">Pendente</span>
                        )}
                      </td>

                      {/* 11. Data Fim Produção */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {row.production_end_date ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatDateBr(row.production_end_date)}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded font-semibold uppercase bg-slate-100 text-slate-700">
                              {row.production_end_center || 'Fim'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* 12. Data Inventário WMS */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {row.wms_inventory_date ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatDateBr(row.wms_inventory_date)}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                row.wms_inventory_is_real
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {row.wms_inventory_is_real ? 'Real' : 'Prevista'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* 13. Data Faturamento */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {row.billing_date ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatDateBr(row.billing_date)}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded font-semibold uppercase bg-slate-100 text-slate-700">
                              Prevista
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* 14. Data Industrializador Final */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {row.final_industrializer_date ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatDateBr(row.final_industrializer_date)}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded font-semibold uppercase bg-blue-100 text-[#004C97]">
                              Prevista
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans text-xs">&mdash;</span>
                        )}
                      </td>

                      {/* 15. Industrializador */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {row.industrializer_name}
                      </td>

                      {/* 16. MP Necessária */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {row.required_mp_code} (
                        {formatNumberPtBr(row.required_mp_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t)
                      </td>

                      {/* 17. Status */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            row.status === 'NO_PRAZO'
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : row.status === 'EM_RISCO'
                                ? 'border-amber-300 text-amber-700 bg-amber-50'
                                : row.status === 'ATRASADO'
                                  ? 'border-rose-300 text-rose-700 bg-rose-50'
                                  : 'border-slate-300 text-slate-700 bg-slate-50'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>

                      {/* Risco */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.risk_level === 'CRITICO'
                              ? 'bg-rose-100 text-rose-800'
                              : row.risk_level === 'ALTO'
                                ? 'bg-amber-100 text-amber-800'
                                : row.risk_level === 'MEDIO'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {row.risk_level}
                        </span>
                      </td>

                      {/* Motivo do Risco */}
                      <td
                        className="py-2 px-3 min-w-[200px] max-w-[300px] text-slate-600 truncate"
                        title={row.risk_reasons.join('; ')}
                      >
                        {row.risk_reasons.length > 0 ? (
                          <span className="text-rose-700 font-medium">
                            {row.risk_reasons[0]}
                            {row.risk_reasons.length > 1 && ` (+${row.risk_reasons.length - 1})`}
                          </span>
                        ) : (
                          <span className="text-slate-400">&mdash;</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {/* RODAPÉ COM LINHA "TOTAL DO MÊS" */}
            <tfoot className="bg-slate-100 text-slate-800 font-bold border-t-2 border-slate-300 text-[11px] sticky bottom-0 z-10">
              <tr>
                <td className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-100 z-20 font-black uppercase text-[#004C97]">
                  TOTAL DO MÊS
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                  {items.length} pedidos
                </td>
                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">&mdash;</td>
                <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">&mdash;</td>
                {/* Total Qtd. Pedido */}
                <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono">
                  {formatNumberPtBr(tableTotals.totalOrdered, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </td>
                {/* Total Qtd. Atendida */}
                <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-emerald-700">
                  {formatNumberPtBr(tableTotals.totalServed, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </td>
                {/* Total Saldo Carteira */}
                <td className="py-2.5 px-3 whitespace-nowrap text-right font-mono text-slate-900 font-black">
                  {formatNumberPtBr(tableTotals.totalBalance, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}{' '}
                  t
                </td>
                <td
                  colSpan={2}
                  className="py-2.5 px-3 whitespace-nowrap text-slate-500 text-center"
                >
                  Consolidação do Período
                </td>
                {/* Totais do Mês correspondentes aos 4 indicadores */}
                <td
                  colSpan={5}
                  className="py-2.5 px-3 whitespace-nowrap bg-blue-50/70 text-[#004C97] font-semibold"
                >
                  Previsto:{' '}
                  <span className="font-mono font-bold">
                    {formatNumberPtBr(monthlySummary?.programmedVolumeTons || 0, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </span>{' '}
                  &bull; Atingido:{' '}
                  <span className="font-mono font-bold text-emerald-700">
                    {formatNumberPtBr(monthlySummary?.realizedVolumeTons || 0, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </span>{' '}
                  &bull; Restante:{' '}
                  <span className="font-mono font-bold">
                    {formatNumberPtBr(monthlySummary?.remainingVolumeTons || 0, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </span>
                </td>
                <td colSpan={5} className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                  &mdash;
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MODAL DE DETALHAMENTO */}
      <IndustrializerDetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        subtitle={modalState.subtitle}
        badgeLabel={modalState.badgeLabel}
        totalCount={modalState.totalCount}
        items={modalState.items}
        type="CARTEIRA_DETAIL"
      />

      {/* MODAL DE TIMELINE DO MATERIAL/PEDIDO (ESTEIRA COMPLETA) */}
      <MaterialTimelineModal
        isOpen={timelineModal.isOpen}
        onClose={() => setTimelineModal((prev) => ({ ...prev, isOpen: false }))}
        materialCode={timelineModal.materialCode}
        materialDescription={timelineModal.materialDescription}
        productionOrder={timelineModal.productionOrder}
        sapOrder={timelineModal.sapOrder}
        clientName={timelineModal.clientName}
        industrializerName={timelineModal.industrializerName}
        steps={timelineModal.steps}
      />
    </div>
  )
}
export default GestaoIndustrializadorCarteiraPage
