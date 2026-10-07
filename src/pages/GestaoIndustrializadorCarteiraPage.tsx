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

export const GestaoIndustrializadorCarteiraPage: React.FC = () => {
  const [items, setItems] = useState<CarteiraIndustrializadorItem[]>([])
  const [industrializadores, setIndustrializadores] = useState<IndustrializadorEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<IndustrializerFilterParams>({
    industrializerCode: 'ALL',
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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [inds, carteiraList] = await Promise.all([
        gestaoIndustrializadorService.getIndustrializadores(),
        gestaoIndustrializadorService.getCarteiraIndustrializador(filters),
      ])
      setIndustrializadores(inds)
      setItems(carteiraList)
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
    if (!dStr) return 'N/D'
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
        title="Análise de Carteira"
        subtitle="Pedidos e riscos"
        activeSubtopic="carteira"
        industrializadores={industrializadores}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={loadData}
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
          <table className="w-full min-w-[1400px] text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap sticky left-0 bg-slate-100 z-20">
                  Pedido SAP
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap">Item</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Cliente</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Material</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Descrição</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Produto</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Aço</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. Pedido</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Qtd. Atendida</th>
                <th className="py-2.5 px-3 whitespace-nowrap text-right">Saldo Carteira</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data Solicitada</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Data Prevista</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Industrializador</th>
                <th className="py-2.5 px-3 whitespace-nowrap">MP Necessária</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Disp. da MP</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Programação Assoc.</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Prev. Industrialização</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Risco</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Motivo do Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={20} className="py-12 text-center text-slate-500">
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
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap font-mono sticky left-0 bg-white group-hover:bg-blue-50/40 z-10">
                        {row.sap_order}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">{row.item}</td>
                      <td
                        className="py-2 px-3 min-w-[140px] max-w-[200px] truncate"
                        title={row.client_name}
                      >
                        {row.client_name}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-800">
                        {row.material_code}
                      </td>
                      <td
                        className="py-2 px-3 min-w-[160px] max-w-[240px] truncate"
                        title={row.material_description}
                      >
                        {row.material_description}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{row.product_family}</td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">{row.steel_grade}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono">
                        {formatNumberPtBr(row.ordered_quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono text-emerald-700">
                        {formatNumberPtBr(row.served_quantity_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatNumberPtBr(row.balance_tons, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.requested_date)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.predicted_delivery_date)}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap text-slate-700 font-medium">
                        {row.industrializer_name}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {row.required_mp_code} ({row.required_mp_tons} t)
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.mp_availability_status === 'DISPONIVEL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.mp_availability_status === 'PARCIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {row.mp_availability_status}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono">
                        {row.associated_schedule_code || (
                          <span className="text-slate-400">Pendente</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                        {formatDateBr(row.predicted_industrialization_date)}
                      </td>
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
    </div>
  )
}
export default GestaoIndustrializadorCarteiraPage
