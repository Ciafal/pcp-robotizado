import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  Layers,
  TrendingUp,
  AlertOctagon,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Activity,
  Zap,
  HardHat,
  Eye,
  Sliders,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProductionProcessNode } from '@/types/control-tower'

export const ProductionOverview: React.FC = () => {
  const { kpis, filteredNodes, setSelectedProcess, setActiveTab } = useControlTower()

  return (
    <div className="p-4 space-y-6">
      {/* Primeira Faixa de KPIs Executivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Programado */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Programado Total
            </CardDescription>
            <CardTitle className="text-xl font-black text-white">
              {kpis.plannedTons.toLocaleString('pt-BR')} t
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[10px] text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#004C97]" /> Meta Diária SAP
          </CardContent>
        </Card>

        {/* Realizado */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Realizado Hoje
            </CardDescription>
            <CardTitle className="text-xl font-black text-emerald-400">
              {kpis.producedTons.toLocaleString('pt-BR')} t
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[10px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Gap: -
            {(kpis.plannedTons - kpis.producedTons).toLocaleString('pt-BR')} t
          </CardContent>
        </Card>

        {/* Aderência */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Aderência do Plano
            </CardDescription>
            <CardTitle className="text-xl font-black text-[#004C97]">
              {kpis.adherencePct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[10px] text-slate-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" /> Meta CIAFAL: 90%
          </CardContent>
        </Card>

        {/* Ocupação & Capacidade */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Ocupação Fabril
            </CardDescription>
            <CardTitle className="text-xl font-black text-cyan-400">{kpis.occupancyPct}%</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[10px] text-slate-400 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> Disponível: {kpis.availableCapacityPct}%
          </CardContent>
        </Card>

        {/* Gargalos Ativos */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Gargalos Ativos
            </CardDescription>
            <CardTitle className="text-xl font-black text-rose-400">
              {kpis.activeBottlenecks}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[10px] text-slate-400 flex items-center gap-1">
            <AlertOctagon className="w-3 h-3 text-rose-400" /> 1 crítico, 2 médios
          </CardContent>
        </Card>

        {/* Pedidos em Risco */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px] text-slate-400 font-medium">
              Pedidos em Risco
            </CardDescription>
            <CardTitle className="text-xl font-black text-amber-400">{kpis.ordersAtRisk}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Impacto carteira
          </CardContent>
        </Card>
      </div>

      {/* Tabela Principal: Situação das Linhas e Recursos */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Situação Operacional das Linhas e Processos
            </h3>
            <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
              {filteredNodes.length} monitorados
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('MAP')}
              className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-7"
            >
              Ver no Mapa de Integração
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('GANTT')}
              className="border-slate-800 bg-slate-900 text-cyan-400 hover:text-cyan-300 text-xs h-7"
            >
              Abrir Gantt Operacional
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Linha / Processo</th>
                <th className="px-4 py-3">Campanha / Produto Atual</th>
                <th className="px-3 py-3">Próximo Processo</th>
                <th className="px-3 py-3 text-right">Programado</th>
                <th className="px-3 py-3 text-right">Realizado</th>
                <th className="px-3 py-3 text-center">Aderência</th>
                <th className="px-3 py-3 text-center">Ocupação</th>
                <th className="px-3 py-3">Buffer Downstream</th>
                <th className="px-4 py-3 text-center">Situação</th>
                <th className="px-3 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium">
              {filteredNodes.map((node) => {
                const isRunning = node.currentStatus === 'running'
                const isIdle = node.currentStatus === 'idle'
                const isMaintenance = node.currentStatus === 'maintenance'

                return (
                  <tr
                    key={node.id}
                    className="hover:bg-slate-900/50 transition-all cursor-pointer"
                    onClick={() => setSelectedProcess(node)}
                  >
                    {/* Linha */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="font-mono text-cyan-400 text-xs">{node.code}</span>
                        <span className="text-slate-300 text-[11px] truncate max-w-[140px]">
                          {node.name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">{node.sector}</div>
                    </td>

                    {/* Atual */}
                    <td className="px-4 py-3">
                      <div className="text-white font-semibold truncate max-w-[200px]">
                        {node.activeMaterial || 'Nenhuma ordem ativa'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {node.activeCampaign}
                      </div>
                    </td>

                    {/* Próximo */}
                    <td className="px-3 py-3">
                      {node.nextProcessCode ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          ➔ {node.nextProcessCode}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Expedição Final</span>
                      )}
                    </td>

                    {/* Programado */}
                    <td className="px-3 py-3 text-right font-mono text-slate-300">
                      {node.plannedTonsToday} t
                    </td>

                    {/* Realizado */}
                    <td className="px-3 py-3 text-right font-mono font-bold text-white">
                      {node.producedTonsToday} t
                    </td>

                    {/* Aderência */}
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`font-mono text-xs font-bold ${
                          node.adherencePct >= 90
                            ? 'text-emerald-400'
                            : node.adherencePct >= 75
                              ? 'text-amber-400'
                              : 'text-rose-400'
                        }`}
                      >
                        {node.adherencePct}%
                      </span>
                    </td>

                    {/* Ocupação */}
                    <td className="px-3 py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              node.occupancyPct > 95
                                ? 'bg-rose-500'
                                : node.occupancyPct > 80
                                  ? 'bg-[#004C97]'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, node.occupancyPct)}%` }}
                          ></div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-300">
                          {node.occupancyPct}%
                        </span>
                      </div>
                    </td>

                    {/* Buffer Downstream */}
                    <td className="px-3 py-3">
                      <div className="font-mono text-[11px] text-slate-200">
                        {node.downstreamBufferTons} t
                        <span className="text-[10px] text-slate-500 ml-1">
                          ({node.downstreamBufferHours}h)
                        </span>
                      </div>
                      {node.isBottleneck && node.bottleneckSeverity === 'CRITICAL' && (
                        <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                          ⚠ saturação iminente
                        </span>
                      )}
                    </td>

                    {/* Situação */}
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={`text-[10px] font-semibold uppercase ${
                          isRunning
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                            : isMaintenance
                              ? 'bg-rose-950 text-rose-400 border-rose-700'
                              : isIdle
                                ? 'bg-amber-950 text-amber-400 border-amber-700'
                                : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {node.currentStatus}
                      </Badge>
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProcess(node)}
                        className="h-6 px-2 text-[10px] text-[#004C97] hover:text-cyan-300 hover:bg-slate-900"
                      >
                        <Eye className="w-3 h-3 mr-1" /> Detalhar
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
