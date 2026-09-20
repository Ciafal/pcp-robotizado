import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers,
  AlertTriangle,
  Clock,
  Activity,
  AlertOctagon,
  RefreshCw,
  TrendingUp,
  Percent,
  CheckCircle2,
  FileText,
  Search,
  ExternalLink,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
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
import { formatQuantity, formatPercentagePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

export const ProductionOverviewPage: React.FC = () => {
  const navigate = useNavigate()
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
        pcpProductionService.checkMESConnection().catch(
          (): MESConnectionStatus => ({
            available: false,
            lastChecked: new Date().toISOString(),
            message: 'Falha na checagem do MES 4.0',
            source: 'OFFLINE',
            activeLinesWithRealtime: [],
          }),
        ),
        pcpProductionService.listOrders(filters).catch(() => []),
      ])
      setMesStatus(mes)
      setOrders(Array.isArray(list) ? list : [])
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
  const totalPlannedTons = useMemo(
    () => orders.reduce((acc, o) => acc + (o.quantity_planned_tons || 0), 0),
    [orders],
  )
  const totalProducedTons = useMemo(
    () => orders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0),
    [orders],
  )
  const totalPostedTons = useMemo(
    () => orders.reduce((acc, o) => acc + (o.quantity_posted_tons || 0), 0),
    [orders],
  )
  const adherenceVolumePct = totalPlannedTons > 0 ? (totalProducedTons / totalPlannedTons) * 100 : 0

  // Rendimento médio ponderado (realizado)
  const avgYieldRealized = useMemo(() => {
    if (orders.length === 0) return 0
    const sum = orders.reduce((acc, o) => acc + (o.yield_realized_pct || 0), 0)
    return sum / orders.length
  }, [orders])

  // Subgrupos de OPs
  const opEmProducao = useMemo(() => orders.filter((o) => o.status_op === 'EM_PRODUCAO'), [orders])
  const opComPendencias = useMemo(() => orders.filter((o) => o.has_pendency), [orders])
  const opApontamentosPendentes = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.has_pendency ||
          o.status_op === 'PARCIALMENTE_APONTADA' ||
          (o.quantity_produced_tons > 0 &&
            o.quantity_posted_tons < o.quantity_produced_tons * 0.98),
      ),
    [orders],
  )
  const opCriticas = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.visual_status === 'CRITICO' ||
          o.criticality === 'CRITICA' ||
          o.status_sap === 'REJEITADA_SAP' ||
          o.status_sap === 'ERRO_INTEGRACAO',
      ),
    [orders],
  )

  // Alertas / Exceções
  const alertList = useMemo(() => {
    const list: Array<{
      id: string
      tipo: 'danger' | 'warning' | 'info'
      titulo: string
      descricao: string
      opNumber?: string
      link: string
      order?: ProductionOrder
    }> = []

    opCriticas.slice(0, 4).forEach((op) => {
      list.push({
        id: `crit-${op.id}`,
        tipo: 'danger',
        titulo: `OP ${op.op_number} em estado crítico (${op.linha_code} - ${op.centro_code})`,
        descricao:
          op.deviation_reason ||
          `Risco IA: ${op.ai_risk_score}. Saldo: ${formatQuantity(op.balance_tons, 't')}.`,
        opNumber: op.op_number,
        link: `/pcp/producao/ordens?search=${op.op_number}`,
        order: op,
      })
    })

    const opDesvioYield = orders.filter((o) => o.yield_realized_pct < o.yield_planned_pct - 1.0)
    if (opDesvioYield.length > 0) {
      list.push({
        id: 'desvio-rendimento',
        tipo: 'warning',
        titulo: `${opDesvioYield.length} OP(s) com rendimento metálico abaixo da meta`,
        descricao: `Exemplo: OP ${opDesvioYield[0].op_number} (${opDesvioYield[0].material_description}) com ${formatPercentagePTBR(opDesvioYield[0].yield_realized_pct)} vs meta ${formatPercentagePTBR(opDesvioYield[0].yield_planned_pct)}.`,
        link: '/pcp/producao/ordens?status=DESVIO',
      })
    }

    const opRejeitadasSap = orders.filter((o) => o.status_sap === 'REJEITADA_SAP')
    if (opRejeitadasSap.length > 0) {
      list.push({
        id: 'rejeitadas-sap',
        tipo: 'danger',
        titulo: `${opRejeitadasSap.length} apontamento(s) rejeitado(s) pelo SAP ECC (ZPPT010)`,
        descricao: `Bloqueio de conciliação fiscal e estoque em ${opRejeitadasSap.map((o) => o.op_number).join(', ')}.`,
        link: '/pcp/producao/apontamentos?tab=pendentes',
      })
    }

    return list
  }, [opCriticas, orders])

  const handleCardClick = (
    title: string,
    subtitle: string,
    val: string | number,
    subset: ProductionOrder[],
  ) => {
    setIndicatorModalTitle(title)
    setIndicatorModalSubtitle(subtitle)
    setIndicatorModalValue(val)
    setIndicatorFilteredOrders(subset)
    setIndicatorModalOpen(true)
  }

  const handleOpenDetail = (order: ProductionOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-4">
      {/* CABEÇALHO DA TORRE DE CONTROLE: Título + subtítulo à esquerda, card MES compacto ao lado/direita */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Torre de Controle da Produção
            </h1>
            <Badge className="bg-[#004C97] hover:bg-[#003d7a] text-white text-[11px] font-semibold">
              CONTROLE DE PRODUÇÃO
            </Badge>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl">
            Acompanhamento das ordens, apontamentos, desvios e pendências da produção.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
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
            className="h-8 text-xs bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Torre
          </Button>
        </div>
      </div>

      {/* FILTROS PADRONIZADOS */}
      <ErrorBoundary moduleName="Filtros da Torre de Produção" variant="compact">
        <ProductionFilterBar
          filters={filters}
          onChange={setFilters}
          onApply={handleApplyFilters}
          onRefresh={loadData}
          loading={loading}
        />
      </ErrorBoundary>

      {/* LINHA 1 — INDICADORES DA PRODUÇÃO (6 CARDS COMPACTOS E CLICÁVEIS) */}
      <ErrorBoundary moduleName="Linha 1 - Indicadores Principais" variant="compact">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. OPs em Produção */}
          <button
            type="button"
            onClick={() =>
              handleCardClick(
                'OPs em Produção',
                'Ordens com processo ativo em máquina/linha',
                opEmProducao.length,
                opEmProducao,
              )
            }
            className="bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                OPs em Produção
              </span>
              <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {opEmProducao.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">Ativas na linha fabril</div>
          </button>

          {/* 2. Pendências */}
          <button
            type="button"
            onClick={() =>
              handleCardClick(
                'Ordens com Pendência',
                'OPs com checklist de encerramento travado',
                opComPendencias.length,
                opComPendencias,
              )
            }
            className="bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-amber-400 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                Pendências
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-800 mt-0.5">
              {opComPendencias.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">Travam encerramento</div>
          </button>

          {/* 3. Apontamentos Pendentes */}
          <button
            type="button"
            onClick={() =>
              handleCardClick(
                'Apontamentos Pendentes',
                'Produção apontada divergente ou incompleta',
                opApontamentosPendentes.length,
                opApontamentosPendentes,
              )
            }
            className="bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                Apont. Pendentes
              </span>
              <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {opApontamentosPendentes.length}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">Aguardam envio/ZPPT</div>
          </button>

          {/* 4. OPs Críticas */}
          <button
            type="button"
            onClick={() =>
              handleCardClick(
                'OPs Críticas',
                'Bloqueios severos, rejeições SAP ou desvios graves',
                opCriticas.length,
                opCriticas,
              )
            }
            className="bg-white border border-rose-200 rounded-lg p-3 text-left hover:border-rose-400 hover:shadow-xs transition-all flex flex-col justify-between bg-rose-50/20"
          >
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                OPs Críticas
              </span>
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-0.5">
              {opCriticas.length}
            </div>
            <div className="text-[10px] text-rose-600 mt-1 truncate">Intervenção imediata</div>
          </button>

          {/* 5. Aderência */}
          <button
            type="button"
            onClick={() =>
              handleCardClick(
                'Aderência Volume (%)',
                'Relação Produzido MES / Programado PCP',
                formatPercentagePTBR(adherenceVolumePct),
                orders,
              )
            }
            className="bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-emerald-400 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                Aderência
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {formatPercentagePTBR(adherenceVolumePct)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">Realizado ÷ Prog.</div>
          </button>

          {/* 6. Rendimento */}
          <button
            type="button"
            onClick={() =>
              handleCardClick(
                'Rendimento Metálico Médio',
                'Média ponderada do rendimento realizado das ordens',
                formatPercentagePTBR(avgYieldRealized),
                orders,
              )
            }
            className="bg-white border border-slate-200 rounded-lg p-3 text-left hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-600 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider truncate">
                Rendimento
              </span>
              <Percent className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-0.5">
              {formatPercentagePTBR(avgYieldRealized)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 truncate">Rendimento metálico</div>
          </button>
        </div>
      </ErrorBoundary>

      {/* LINHA 2 — EXCEÇÕES / ALERTAS */}
      <ErrorBoundary moduleName="Linha 2 - Exceções e Alertas" variant="compact">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Exceções e Alertas Operacionais da Produção
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              {alertList.length} ocorrência(s) detectada(s)
            </span>
          </div>

          {alertList.length === 0 ? (
            <div className="p-3 text-xs text-slate-500 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Nenhuma exceção ou anomalia operacional registrada no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {alertList.map((al) => (
                <div
                  key={al.id}
                  className={`p-3 rounded-lg border flex flex-col justify-between gap-2 text-xs transition-colors ${
                    al.tipo === 'danger'
                      ? 'border-rose-200 bg-rose-50/50 text-rose-950'
                      : 'border-amber-200 bg-amber-50/50 text-amber-950'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-semibold flex items-center justify-between gap-1">
                      <span className="truncate">{al.titulo}</span>
                      {al.tipo === 'danger' ? (
                        <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0 shrink-0 font-mono">
                          Crítico
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 shrink-0 font-mono">
                          Atenção
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{al.descricao}</p>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-slate-200/60 text-[11px]">
                    {al.order ? (
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(al.order!)}
                        className="text-[#004C97] hover:underline font-medium flex items-center gap-1"
                      >
                        Abrir detalhes da OP &rarr;
                      </button>
                    ) : (
                      <Link
                        to={al.link}
                        className="text-[#004C97] hover:underline font-medium flex items-center gap-1"
                      >
                        Ver detalhes &rarr;
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* LINHA 3 — PROGRAMADO X REALIZADO (CONSOLIDAÇÃO TOTAL E PROGRESSO) */}
      <ErrorBoundary moduleName="Linha 3 - Programado x Realizado" variant="compact">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#004C97]" />
                Programado x Realizado (Consolidação de Volume e Apontamento)
              </h2>
              <p className="text-[11px] text-slate-500">
                Acompanhamento comparativo entre a carteira PCP aprovada, a produção física MES e os
                apontamentos ZPPT010.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600 self-start sm:self-auto">
              Período: <strong>Atual selecionado</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                Programado (PCP)
              </span>
              <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                {formatQuantity(totalPlannedTons, 't')}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Meta total das ordens</p>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200">
              <span className="text-[10px] font-semibold text-blue-800 uppercase">
                Produzido (MES 4.0)
              </span>
              <div className="text-xl font-bold font-mono text-blue-900 mt-1">
                {formatQuantity(totalProducedTons, 't')}
              </div>
              <p className="text-[10px] text-blue-700 mt-0.5">
                Aderência: {formatPercentagePTBR(adherenceVolumePct)}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-600 uppercase">
                Apontado (SAP / ZPPT010)
              </span>
              <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                {formatQuantity(totalPostedTons, 't')}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Saldo a apontar:{' '}
                {formatQuantity(Math.max(0, totalProducedTons - totalPostedTons), 't')}
              </p>
            </div>
          </div>

          {/* Barra de progresso visual */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[11px] text-slate-600">
              <span>Progresso Físico Global</span>
              <span className="font-mono font-semibold">
                {formatQuantity(totalProducedTons, 't')} / {formatQuantity(totalPlannedTons, 't')} (
                {formatPercentagePTBR(adherenceVolumePct)})
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  adherenceVolumePct >= 95 ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(100, adherenceVolumePct)}%` }}
              />
            </div>
          </div>
        </div>
      </ErrorBoundary>

      {/* LINHA 4 — ÚLTIMAS OPs / OPs CRÍTICAS */}
      <ErrorBoundary moduleName="Linha 4 - Tabela de OPs" variant="compact">
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Últimas Ordens de Produção & OPs Críticas ({orders.length} OPs)
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento operacional por linha e centro com atalhos para apontamento e
                histórico.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/pcp/producao/ordens">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-white text-[#004C97] hover:bg-slate-50 border-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Ver Todas as Ordens
                </Button>
              </Link>
            </div>
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
                  <th className="py-2.5 px-3 text-center">Status OP</th>
                  <th className="py-2.5 px-3 text-center">Criticidade</th>
                  <th className="py-2.5 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-500 text-xs">
                      Nenhum dado encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  orders.slice(0, 15).map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => handleOpenDetail(o)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2 px-3 font-semibold text-[#004C97] font-mono whitespace-nowrap">
                        {o.op_number}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {o.centro_code}
                      </td>
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{o.linha_code}</td>
                      <td className="py-2 px-3 max-w-[280px]">
                        <div className="font-medium text-slate-900 truncate">
                          {o.material_description}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {o.material_code}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium whitespace-nowrap">
                        {formatQuantity(o.quantity_planned_tons, 't')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                        {formatQuantity(o.quantity_produced_tons, 't')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatQuantity(o.quantity_posted_tons, 't')}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold whitespace-nowrap">
                        <span className={o.balance_tons > 0 ? 'text-amber-700' : 'text-slate-600'}>
                          {formatQuantity(o.balance_tons, 't')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
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
                      <td className="py-2 px-3 text-center whitespace-nowrap">
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
                        className="py-2 px-3 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDetail(o)}
                            className="h-7 px-2 text-xs text-[#004C97] hover:text-[#003870]"
                          >
                            Ver OP
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/pcp/producao/apontamentos?search=${o.op_number}`)
                            }
                            className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            title="Ver apontamentos desta OP"
                          >
                            Apontamentos
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </ErrorBoundary>

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

export default ProductionOverviewPage
