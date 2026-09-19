import React, { useState, useEffect } from 'react'
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sparkles,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  HelpCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductionFilterBar } from '@/components/production-control/ProductionFilterBar'
import { ProductionIndicatorModal } from '@/components/production-control/ProductionIndicatorModal'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type {
  ProductionOrder,
  ProductionFiltersState,
  ProductionOverviewCardIndicator,
} from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatNumberPTBR } from '@/lib/formatters-ptbr'

export const ProductionOverviewPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [filters, setFilters] = useState<ProductionFiltersState>(defaultProductionFilters)

  // Modais
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false)
  const [indicatorModalTitle, setIndicatorModalTitle] = useState('')
  const [indicatorModalSubtitle, setIndicatorModalSubtitle] = useState('')
  const [indicatorModalValue, setIndicatorModalValue] = useState<string | number>('')
  const [indicatorFilteredOrders, setIndicatorFilteredOrders] = useState<ProductionOrder[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listOrders(filters),
      ])
      setMesStatus(mes)
      setOrders(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApplyFilters = () => {
    loadData()
  }

  // Cálculos consolidados da Torre de Controle de Produção
  const totalPlannedTons = orders.reduce((acc, o) => acc + (o.quantity_planned_tons || 0), 0)
  const totalProducedTons = orders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0)
  const globalAdherencePct = totalPlannedTons > 0 ? (totalProducedTons / totalPlannedTons) * 100 : 0

  const opProgramadas = orders.filter((o) => o.status_op === 'PROGRAMADA')
  const opEmProducao = orders.filter((o) => o.status_op === 'EM_PRODUCAO')
  const opParcialmenteApontadas = orders.filter((o) => o.status_op === 'PARCIALMENTE_APONTADA')
  const opConcluidasFisicamente = orders.filter(
    (o) =>
      o.status_op === 'CONCLUIDA_FISICAMENTE' ||
      o.quantity_produced_tons >= o.quantity_planned_tons,
  )
  const opAguardandoFechamento = orders.filter(
    (o) =>
      o.status_fechamento === 'PENDENTE_DE_FECHAMENTO' || o.status_op === 'AGUARDANDO_FECHAMENTO',
  )
  const opComPendencias = orders.filter((o) => o.has_pendency)
  const opErroApontamento = orders.filter(
    (o) => o.status_sap === 'ERRO_INTEGRACAO' || o.status_sap === 'REJEITADA_SAP',
  )
  const opDesvioQuantidade = orders.filter(
    (o) => o.has_deviation && o.deviation_reason.toLowerCase().includes('quantidade'),
  )
  const opDesvioRendimento = orders.filter((o) => o.yield_realized_pct < o.yield_planned_pct - 1.0)
  const opProducaoAcima = orders.filter((o) => o.quantity_produced_tons > o.quantity_planned_tons)
  const opProducaoAbaixo = orders.filter(
    (o) => o.quantity_produced_tons < o.quantity_planned_tons && o.status_op !== 'PROGRAMADA',
  )
  const opSemMovimentacao = orders.filter(
    (o) => !o.last_posting_at && o.status_op === 'EM_PRODUCAO',
  )
  const opSapRejeitado = orders.filter((o) => o.status_sap === 'REJEITADA_SAP')

  // Definição dos cards executivos clicáveis que abrem modal amplo
  const executiveCards: ProductionOverviewCardIndicator[] = [
    {
      id: 'card-1',
      label: 'OPs Programadas',
      value: opProgramadas.length,
      unit: 'OPs',
      subtext: 'Aguardando início físico no MES',
      tone: 'info',
      recordsCount: opProgramadas.length,
    },
    {
      id: 'card-2',
      label: 'Em Produção',
      value: opEmProducao.length,
      unit: 'OPs',
      subtext: 'Com processo ativo na linha',
      tone: 'primary',
      recordsCount: opEmProducao.length,
    },
    {
      id: 'card-3',
      label: 'Parcialmente Apontadas',
      value: opParcialmenteApontadas.length,
      unit: 'OPs',
      subtext: 'Lotes intermediários lançados',
      tone: 'info',
      recordsCount: opParcialmenteApontadas.length,
    },
    {
      id: 'card-4',
      label: 'Concluídas Fisicamente',
      value: opConcluidasFisicamente.length,
      unit: 'OPs',
      subtext: 'Produção encerrada no MES',
      tone: 'success',
      recordsCount: opConcluidasFisicamente.length,
    },
    {
      id: 'card-5',
      label: 'Aguardando Fechamento',
      value: opAguardandoFechamento.length,
      unit: 'OPs',
      subtext: 'Requer validação do checklist',
      tone: 'warning',
      badge: 'Atenção',
      recordsCount: opAguardandoFechamento.length,
    },
    {
      id: 'card-6',
      label: 'Com Pendências Ativas',
      value: opComPendencias.length,
      unit: 'OPs',
      subtext: 'Checklist com itens pendentes',
      tone: 'danger',
      badge: 'Crítico',
      recordsCount: opComPendencias.length,
    },
    {
      id: 'card-7',
      label: 'Erro de Apontamento',
      value: opErroApontamento.length,
      unit: 'OPs',
      subtext: 'Falha ou trava no ZPPT010',
      tone: 'danger',
      recordsCount: opErroApontamento.length,
    },
    {
      id: 'card-8',
      label: 'Apontamento Rejeitado SAP',
      value: opSapRejeitado.length,
      unit: 'OPs',
      subtext: 'Rejeição formal do SAP ECC',
      tone: 'danger',
      badge: 'SAP RFC',
      recordsCount: opSapRejeitado.length,
    },
    {
      id: 'card-9',
      label: 'Desvio de Quantidade',
      value: opDesvioQuantidade.length,
      unit: 'OPs',
      subtext: 'Delta > tolerância de programação',
      tone: 'warning',
      recordsCount: opDesvioQuantidade.length,
    },
    {
      id: 'card-10',
      label: 'Desvio de Rendimento',
      value: opDesvioRendimento.length,
      unit: 'OPs',
      subtext: 'Rendimento metálico abaixo da meta',
      tone: 'warning',
      recordsCount: opDesvioRendimento.length,
    },
    {
      id: 'card-11',
      label: 'Produção Acima da OP',
      value: opProducaoAcima.length,
      unit: 'OPs',
      subtext: 'Sobreprodução física detectada',
      tone: 'info',
      recordsCount: opProducaoAcima.length,
    },
    {
      id: 'card-12',
      label: 'Produção Abaixo da OP',
      value: opProducaoAbaixo.length,
      unit: 'OPs',
      subtext: 'Falta saldo para atingir OP',
      tone: 'warning',
      recordsCount: opProducaoAbaixo.length,
    },
    {
      id: 'card-13',
      label: 'Sem Movimentação Recente',
      value: opSemMovimentacao.length,
      unit: 'OPs',
      subtext: 'Em produção sem apontamento recente',
      tone: 'warning',
      recordsCount: opSemMovimentacao.length,
    },
    {
      id: 'card-14',
      label: 'Tempo Médio p/ Fechamento',
      value: '4,8',
      unit: 'h',
      subtext: 'Média histórica após fim físico',
      tone: 'neutral',
      recordsCount: orders.length,
    },
  ]

  const handleCardClick = (card: ProductionOverviewCardIndicator) => {
    let subset: ProductionOrder[] = orders
    if (card.id === 'card-1') subset = opProgramadas
    else if (card.id === 'card-2') subset = opEmProducao
    else if (card.id === 'card-3') subset = opParcialmenteApontadas
    else if (card.id === 'card-4') subset = opConcluidasFisicamente
    else if (card.id === 'card-5') subset = opAguardandoFechamento
    else if (card.id === 'card-6') subset = opComPendencias
    else if (card.id === 'card-7') subset = opErroApontamento
    else if (card.id === 'card-8') subset = opSapRejeitado
    else if (card.id === 'card-9') subset = opDesvioQuantidade
    else if (card.id === 'card-10') subset = opDesvioRendimento
    else if (card.id === 'card-11') subset = opProducaoAcima
    else if (card.id === 'card-12') subset = opProducaoAbaixo
    else if (card.id === 'card-13') subset = opSemMovimentacao

    setIndicatorModalTitle(card.label)
    setIndicatorModalSubtitle(card.subtext || 'Detalhamento do indicador')
    setIndicatorModalValue(`${card.value} ${card.unit || ''}`)
    setIndicatorFilteredOrders(subset)
    setIndicatorModalOpen(true)
  }

  const handleOpenDetail = (order: ProductionOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho da Torre de Controle de Produção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Torre de Controle da Produção
            </h1>
            <Badge className="bg-blue-700 text-white font-mono text-xs">
              MÓDULO CONTROLE DE PRODUÇÃO
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Camada gerencial, analítica e de exceção sobre a produção realizada, consumindo dados do
            MES 4.0.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Torre
          </Button>
        </div>
      </div>

      {/* Banner de Conexão com MES 4.0 (Transparência Operacional) */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Filtros Combináveis */}
      <ProductionFilterBar
        filters={filters}
        onChange={setFilters}
        onApply={handleApplyFilters}
        onRefresh={loadData}
        loading={loading}
      />

      {/* Faixa Executiva dos 4 Grandes Totais Industriais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Programado */}
        <div className="bg-white border rounded-lg p-4 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Produção Programada Total
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
              PCP
            </Badge>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {formatQuantity(totalPlannedTons, 't')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Meta aprovada da carteira semanal</p>
        </div>

        {/* Total Realizado */}
        <div className="bg-white border rounded-lg p-4 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Produção Realizada Total
            </span>
            <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 text-blue-800">
              MES 4.0
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono mt-2">
            {formatQuantity(totalProducedTons, 't')}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Apuração física consolidada nas linhas</p>
        </div>

        {/* Aderência */}
        <div className="bg-white border rounded-lg p-4 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Aderência Volume (%)
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-mono ${
                globalAdherencePct >= 95
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {globalAdherencePct >= 95 ? 'Meta Superada' : 'Atenção'}
            </Badge>
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-slate-900">
            {formatPercentagePTBR(globalAdherencePct)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Realizado ÷ Programado no período</p>
        </div>

        {/* Pendências Críticas */}
        <div className="bg-white border rounded-lg p-4 shadow-2xs border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-rose-900 uppercase tracking-wider">
              Pendências Críticas
            </span>
            <Badge className="bg-rose-600 text-white text-[10px] font-mono">Bloqueios</Badge>
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono mt-2">
            {opComPendencias.length} <span className="text-sm font-normal text-slate-600">OPs</span>
          </div>
          <p className="text-[11px] text-rose-700 mt-1">Impedem fechamento e integração SAP</p>
        </div>
      </div>

      {/* Grid de Cards Executivos Clicáveis (Modal Amplo Responsivo) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-700" />
            Indicadores Executivos de Produção & Exceções (Clique no card para abrir popup amplo)
          </h2>
          <span className="text-xs text-slate-500">
            Popups responsivos em tela cheia com registros completos
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {executiveCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card)}
              className="bg-white border rounded-lg p-3 text-left transition-all hover:shadow-md hover:border-blue-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-600 leading-tight group-hover:text-blue-900">
                    {card.label}
                  </span>
                  {card.badge && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 font-mono ${
                        card.tone === 'danger'
                          ? 'border-rose-400 text-rose-800 bg-rose-50'
                          : card.tone === 'warning'
                            ? 'border-amber-400 text-amber-800 bg-amber-50'
                            : 'border-blue-400 text-blue-800'
                      }`}
                    >
                      {card.badge}
                    </Badge>
                  )}
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 group-hover:text-blue-700">
                  {card.value}{' '}
                  {card.unit && (
                    <span className="text-xs font-normal text-slate-500">{card.unit}</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 truncate" title={card.subtext}>
                {card.subtext}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Resumo das OPs em Destaque */}
      <div className="bg-white border rounded-lg shadow-2xs overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Ordens de Produção em Acompanhamento Ativo ({orders.length} OPs)
            </h3>
            <p className="text-xs text-slate-500">
              Clique em qualquer linha ou no botão Detalhar para abrir a visualização completa
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
            Ordenado por Criticidade e Data
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b">
              <tr>
                <th className="py-2.5 px-3">OP</th>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3">Linha</th>
                <th className="py-2.5 px-3">Material & Produto</th>
                <th className="py-2.5 px-3 text-right">Prog. (t)</th>
                <th className="py-2.5 px-3 text-right">Prod. MES (t)</th>
                <th className="py-2.5 px-3 text-right">Apont. (t)</th>
                <th className="py-2.5 px-3 text-right">Saldo (t)</th>
                <th className="py-2.5 px-3 text-center">Status Visual</th>
                <th className="py-2.5 px-3 text-center">Risco IA</th>
                <th className="py-2.5 px-3 text-center">Fechamento</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => handleOpenDetail(o)}
                  className="hover:bg-blue-50/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3 font-semibold text-blue-900 font-mono">
                    {o.op_number}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">{o.centro_code}</td>
                  <td className="py-2.5 px-3 text-slate-700">{o.linha_code}</td>
                  <td className="py-2.5 px-3 max-w-[260px]">
                    <div className="font-medium text-slate-900 truncate">
                      {o.material_description}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{o.material_code}</div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium">
                    {formatQuantity(o.quantity_planned_tons, 't')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                    {formatQuantity(o.quantity_produced_tons, 't')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                    {formatQuantity(o.quantity_posted_tons, 't')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">
                    <span className={o.balance_tons > 0 ? 'text-amber-700' : 'text-slate-600'}>
                      {formatQuantity(o.balance_tons, 't')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        o.visual_status === 'CRITICO'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : o.visual_status === 'ATENCAO'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {o.visual_status === 'CRITICO'
                        ? '🔴 Crítico'
                        : o.visual_status === 'ATENCAO'
                          ? '🟡 Atenção'
                          : '🟢 Normal'}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {o.ai_risk_score}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${
                        o.status_fechamento === 'FECHADA'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {o.status_fechamento}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDetail(o)}
                      className="h-7 text-xs text-blue-700 hover:text-blue-900"
                    >
                      Detalhar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Amplo de Detalhamento do Indicador */}
      <ProductionIndicatorModal
        open={indicatorModalOpen}
        onOpenChange={setIndicatorModalOpen}
        title={indicatorModalTitle}
        subtitle={indicatorModalSubtitle}
        indicatorValue={indicatorModalValue}
        orders={indicatorFilteredOrders}
        onSelectOrder={(order) => {
          setSelectedOrder(order)
          setDetailModalOpen(true)
        }}
      />

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
