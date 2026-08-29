import React, { useState } from 'react'
import {
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  Boxes,
  Database,
  Layers,
  PieChart,
  ShieldCheck,
  ShoppingCart,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WeeklyScheduleSummary } from '@/types/weekly-schedule'

interface WeeklyScheduleSummaryPanelProps {
  summary: WeeklyScheduleSummary
  lineCode: string
  periodDisplay: string
  onRefresh?: () => void
}

export function WeeklyScheduleSummaryPanel({
  summary,
  lineCode,
  periodDisplay,
}: WeeklyScheduleSummaryPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'TARUGOS' | 'COMPRAS_SAP' | 'CAPACIDADE' | 'PRODUCAO' | 'CARTEIRA'
  >('TARUGOS')

  const tabs = [
    {
      id: 'TARUGOS',
      label: `Tarugos & MP (${summary.billetRequirements?.length || 0})`,
      icon: Boxes,
    },
    {
      id: 'COMPRAS_SAP',
      label: `Pedidos SAP / PO (${summary.sapPurchaseOrders?.length || 0})`,
      icon: ShoppingCart,
    },
    { id: 'CAPACIDADE', label: 'Balanço de Capacidade Semanal', icon: Clock },
    { id: 'PRODUCAO', label: 'Produção & Famílias', icon: Layers },
    { id: 'CARTEIRA', label: 'Carteira & Atendimento', icon: PieChart },
  ] as const

  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3 px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              Painel Consolidado da Programação Semanal
            </CardTitle>
            <Badge variant="outline" className="bg-white font-mono text-[10px] text-slate-600">
              Linha: {lineCode}
            </Badge>
            <Badge variant="outline" className="bg-white font-mono text-[10px] text-slate-600">
              Período: {periodDisplay}
            </Badge>
          </div>

          {/* Abas Superiores */}
          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    isActive
                      ? 'bg-white text-blue-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/40'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 text-xs">
        {/* ABA 1: TARUGOS (VISÃO AGRUPADA POR AÇO E SEÇÃO) */}
        {activeTab === 'TARUGOS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  Necessidade de Tarugos (Agrupada por Aço e Seção/Dimensão)
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Cálculo determinístico com base no rendimento da Ficha Mestre e disponibilidade
                  projetada na Linha {lineCode}.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  🟢 MP Garantida
                </Badge>
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                  🟡 MP c/ Risco
                </Badge>
                <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px]">
                  🔴 MP Insuficiente
                </Badge>
              </div>
            </div>

            {/* Alertas de Duplo Comprometimento se existirem */}
            {summary.dualCommitments && summary.dualCommitments.length > 0 && (
              <div className="space-y-2">
                {summary.dualCommitments.map((dc, i) => (
                  <div
                    key={i}
                    className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-xs text-rose-900 flex items-start gap-2 shadow-sm"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-rose-950 flex items-center gap-1">
                        Conflito de Duplo Comprometimento: Aço {dc.steelGrade} (
                        {dc.sectionDimension})
                        <Badge className="bg-rose-600 text-white text-[9px] ml-2">
                          Déficit: {dc.deficitTons} t
                        </Badge>
                      </p>
                      <p className="mt-1 text-[11px] text-rose-800">
                        Demanda consolidada de <strong>{dc.totalRequiredTons} t</strong> contra
                        saldo disponível de <strong>{dc.projectedAvailableTons} t</strong>.
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono">
                        {dc.consumerSchedules.map((cs, idx) => (
                          <span
                            key={idx}
                            className="bg-rose-100 border border-rose-200 px-2 py-0.5 rounded text-rose-900"
                          >
                            {cs.lineCode}: {cs.quantityTons} t ({cs.consumptionDateStr})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {summary.billetRequirements && summary.billetRequirements.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <TooltipProvider>
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Aço</th>
                        <th className="py-2.5 px-3">Seção / Dimensão</th>
                        <th className="py-2.5 px-3 text-right">Peso Tarugo</th>
                        <th className="py-2.5 px-3 text-right">Qtd Necessária (t)</th>
                        <th className="py-2.5 px-3 text-right">Qtd Disponível (t)</th>
                        <th className="py-2.5 px-3 text-right">Saldo Projetado</th>
                        <th className="py-2.5 px-3 text-center">Status MP</th>
                        <th className="py-2.5 px-3 text-center w-10">Regra</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.billetRequirements.map((billet, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {billet.steelGrade}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px]">
                            {billet.sectionDimension}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {billet.billetWeightKg.toLocaleString('pt-BR')} kg
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-950">
                            {billet.requiredTons.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                            })}{' '}
                            t
                            <span className="block text-[10px] text-slate-500 font-sans font-normal">
                              ~{billet.estimatedBilletsCount} tarugos
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {billet.availableTons.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                            })}{' '}
                            t
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            <span
                              className={
                                billet.projectedBalanceTons >= 0
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                              }
                            >
                              {billet.projectedBalanceTons.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                              })}{' '}
                              t
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {billet.status === 'GREEN' && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                🟢 MP GARANTIDA
                              </Badge>
                            )}
                            {billet.status === 'YELLOW' && (
                              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                                🟡 MP COM RISCO
                              </Badge>
                            )}
                            {billet.status === 'RED' && (
                              <div className="flex flex-col items-center gap-0.5">
                                <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold animate-pulse">
                                  🔴 MP INSUFICIENTE
                                </Badge>
                                <span className="text-[9px] font-mono font-bold text-rose-700 bg-rose-50 px-1 rounded border border-rose-200">
                                  Déficit:{' '}
                                  {Math.abs(billet.projectedBalanceTons).toLocaleString('pt-BR')} t
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100">
                                  <HelpCircle className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                className="bg-slate-900 text-white text-xs max-w-sm p-3 shadow-xl"
                              >
                                <p className="font-bold text-blue-300">Regra de Cálculo de MP:</p>
                                <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                                  {billet.ruleTooltip}
                                </p>
                                <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-300 font-mono space-y-0.5">
                                  <div>Estoque SAP: {billet.currentStockTons} t</div>
                                  <div>Pedidos Compra: {billet.sapPurchaseOrdersTons} t</div>
                                  <div>Produção Upstream: {billet.upstreamProductionTons} t</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TooltipProvider>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg">
                Nenhum material programado na semana
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <p className="font-bold text-slate-700">Regra de Disponibilidade Projetada de MP:</p>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Fórmula:{' '}
                <code>
                  Estoque SAP + Pedidos Compra anteriores + Produção Upstream anterior + Outras
                  entradas − Reservas − Consumos Concorrentes − Consumo Próprio Anterior
                </code>
                .
              </p>
            </div>
          </div>
        )}

        {/* ABA 2: PEDIDOS DE COMPRA SAP */}
        {activeTab === 'COMPRAS_SAP' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  Pedidos de Compra SAP (S/4HANA MM-PUR)
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Pedidos com data de entrega posterior à data de consumo NÃO entram na
                  disponibilidade e geram alerta crítico.
                </p>
              </div>
            </div>

            {summary.sapPurchaseOrders && summary.sapPurchaseOrders.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Pedido</th>
                      <th className="py-2.5 px-3">Fornecedor</th>
                      <th className="py-2.5 px-3">Material / Aço</th>
                      <th className="py-2.5 px-3 text-right">Qtd Total</th>
                      <th className="py-2.5 px-3 text-right">Saldo Aberto</th>
                      <th className="py-2.5 px-3 text-center">Data Prevista</th>
                      <th className="py-2.5 px-3 text-center">Disponibilidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.sapPurchaseOrders.map((po, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{po.orderNumber}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-sans text-[11px]">
                          {po.supplierName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-900">
                            {po.materialDescription}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {po.steelGrade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {po.totalQuantityTons} t
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-950">
                          {po.openBalanceTons} t
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-800">
                          {po.estimatedDeliveryDate}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {po.consideredAvailable ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                              Válido ({po.availableQuantityTons} t)
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold">
                              Posterior ao Consumo
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded-lg">
                Aguardando dados do SAP/WMS
              </div>
            )}
          </div>
        )}

        {/* ABA 3: BALANÇO DE CAPACIDADE */}
        {activeTab === 'CAPACIDADE' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 font-medium">Horas Calendário</span>
                <p className="text-base font-bold text-slate-800 font-mono mt-0.5">
                  {summary.capacity.calendarHours} h
                </p>
                <span className="text-[10px] text-slate-400">7 dias × 24 horas</span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[11px] text-blue-700 font-medium">Capacidade Nominal</span>
                <p className="text-base font-bold text-blue-950 font-mono mt-0.5">
                  {summary.capacity.availableHours} h
                </p>
                <span className="text-[10px] text-blue-600">Turnos ativos na semana</span>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[11px] text-emerald-700 font-medium">Produção + Setup</span>
                <p className="text-base font-bold text-emerald-950 font-mono mt-0.5">
                  {(summary.capacity.productionHours + summary.capacity.setupHours).toFixed(1)} h
                </p>
                <span className="text-[10px] text-emerald-600">
                  Prod: {summary.capacity.productionHours}h | Setup: {summary.capacity.setupHours}h
                </span>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="text-[11px] text-indigo-700 font-medium">Ocupação da Linha</span>
                <p className="text-base font-bold text-indigo-950 font-mono mt-0.5">
                  {summary.capacity.utilizationPct}%
                </p>
                <span className="text-[10px] text-indigo-600">
                  Folga livre: {summary.capacity.freeHours} h
                </span>
              </div>
            </div>

            {/* Barra Visual de Carga de Horas */}
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span className="font-semibold">Distribuição da Carga Semanal de Horas</span>
                <span className="font-mono text-[11px]">
                  Total Alocado:{' '}
                  {(
                    summary.capacity.productionHours +
                    summary.capacity.setupHours +
                    summary.capacity.stoppedHours
                  ).toFixed(1)}
                  h de {summary.capacity.availableHours}h
                </span>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{
                    width: `${Math.min(100, (summary.capacity.productionHours / (summary.capacity.availableHours || 1)) * 100)}%`,
                  }}
                  className="bg-blue-600 h-full"
                  title={`Produção: ${summary.capacity.productionHours}h`}
                />
                <div
                  style={{
                    width: `${Math.min(100, (summary.capacity.setupHours / (summary.capacity.availableHours || 1)) * 100)}%`,
                  }}
                  className="bg-amber-500 h-full"
                  title={`Setup: ${summary.capacity.setupHours}h`}
                />
                <div
                  style={{
                    width: `${Math.min(100, (summary.capacity.stoppedHours / (summary.capacity.availableHours || 1)) * 100)}%`,
                  }}
                  className="bg-rose-500 h-full"
                  title={`Paradas: ${summary.capacity.stoppedHours}h`}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  Produção Líquida ({summary.capacity.productionHours}h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Setup / Trocas ({summary.capacity.setupHours}h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  Paradas Programadas ({summary.capacity.stoppedHours}h)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                  Capacidade Livre ({summary.capacity.freeHours}h)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ABA 4: PRODUÇÃO & FAMÍLIAS */}
        {activeTab === 'PRODUCAO' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toneladas por Família */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <h5 className="font-bold text-slate-800 text-xs mb-2 flex items-center justify-between">
                  <span>Mix por Família de Produtos</span>
                  <span className="font-mono text-blue-900 font-bold">
                    {summary.production.totalTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                    })}{' '}
                    t
                  </span>
                </h5>
                <div className="space-y-2">
                  {Object.entries(summary.production.byFamily).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Nenhum produto programado</p>
                  ) : (
                    Object.entries(summary.production.byFamily).map(([family, tons]) => {
                      const pct =
                        summary.production.totalTons > 0
                          ? (tons / summary.production.totalTons) * 100
                          : 0
                      return (
                        <div key={family} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-slate-700">{family}</span>
                            <span className="font-mono text-slate-900 font-bold">
                              {tons.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t (
                              {pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-blue-600 rounded-full"
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Toneladas por Dia da Semana */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                <h5 className="font-bold text-slate-800 text-xs mb-2">
                  Ritmo de Produção Diário (t/dia)
                </h5>
                <div className="space-y-2">
                  {Object.entries(summary.production.byDay).length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Nenhum produto programado</p>
                  ) : (
                    Object.entries(summary.production.byDay).map(([day, tons]) => {
                      const maxDay = Math.max(...Object.values(summary.production.byDay), 100)
                      const pct = (tons / maxDay) * 100
                      return (
                        <div key={day} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-slate-700">{day}</span>
                            <span className="font-mono text-slate-900 font-bold">
                              {tons.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-emerald-600 rounded-full"
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: CARTEIRA & ATENDIMENTO */}
        {activeTab === 'CARTEIRA' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 font-medium">
                  Carteira Backlog Alvo
                </span>
                <div className="mt-1">
                  {summary.backlog.totalTons !== null ? (
                    <p className="text-base font-bold text-slate-900 font-mono">
                      {summary.backlog.totalTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                      })}{' '}
                      t
                    </p>
                  ) : (
                    <span className="text-amber-700 font-medium text-xs">
                      Aguardando dados do SAP / CRM
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-[11px] text-emerald-700 font-medium">Atendido na Grade</span>
                <p className="text-base font-bold text-emerald-950 font-mono mt-1">
                  {summary.backlog.scheduledTons.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                  })}{' '}
                  t
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[11px] text-slate-500 font-medium">Saldo Remanescente</span>
                <div className="mt-1">
                  {summary.backlog.remainingTons !== null ? (
                    <p className="text-base font-bold text-slate-900 font-mono">
                      {summary.backlog.remainingTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                      })}{' '}
                      t
                    </p>
                  ) : (
                    <span className="text-slate-400 text-xs">--</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
