import React, { useState } from 'react'
import {
  Building2,
  Factory,
  Cpu,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  Maximize2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { OrderDrawer } from '@/components/control-tower/OrderDrawer'
import { ProcessDrawer } from '@/components/control-tower/ProcessDrawer'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'

export const ControlTowerPage: React.FC = () => {
  const {
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    companies,
    availablePlants,
    availableLines,
    kpis,
    plantComparisonData,
    lineComparisonData,
    filteredOrders,
    filteredNodes,
    filteredBottlenecks,
    filteredAlerts,
    selectedProcess,
    setSelectedProcess,
    selectedOrder,
    setSelectedOrder,
    navigateToSubmodule,
    setIsSimulatorModalOpen,
    setIsAIPanelOpen,
    setIsAlertCenterOpen,
  } = useControlTower()

  const [isComparePlantsModalOpen, setIsComparePlantsModalOpen] = useState(false)
  const [isCompareLinesModalOpen, setIsCompareLinesModalOpen] = useState(false)

  const isCompanyLevel = filters.plantCode === 'ALL' && filters.lineCode === 'ALL'
  const isPlantLevel = filters.plantCode !== 'ALL' && filters.lineCode === 'ALL'
  const isLineLevel = filters.lineCode !== 'ALL'

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      {/* Header Central com Breadcrumb, Escopo e Ações */}
      <ControlTowerHeader
        title="Torre de Controle Produtivo"
        subtitle="Visão integrada da programação, capacidade, gargalos, riscos e impactos produtivos."
        breadcrumbSubmodule="Torre de Controle"
      />

      {/* 1. KPIs Principais da Torre de Controle */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Produção Programada */}
        <Card className="bg-slate-950 border-slate-800 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Programado</div>
          <div className="text-xl font-bold text-white mt-1">
            {kpis.plannedTons.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-400">t</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Meta diária consolidada</div>
        </Card>

        {/* Produção Realizada */}
        <Card className="bg-slate-950 border-slate-800 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Realizado</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {kpis.producedTons.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-400">t</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-1">
            {((kpis.producedTons / (kpis.plannedTons || 1)) * 100).toFixed(1)}% do plano
          </div>
        </Card>

        {/* Produção Projetada */}
        <Card className="bg-slate-950 border-slate-800 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Projetado (IA)</div>
          <div className="text-xl font-bold text-cyan-300 mt-1">
            {kpis.projectedTons.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-400">t</span>
          </div>
          <div className="text-[10px] text-cyan-400/80 mt-1">Fechamento estimado</div>
        </Card>

        {/* Aderência Global */}
        <Card className="bg-slate-950 border-slate-800 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Aderência ao Plano</div>
          <div className="text-xl font-bold text-pantone-2945 mt-1">{kpis.adherencePct}%</div>
          <div className="text-[10px] text-slate-500 mt-1">Meta &gt; 95%</div>
        </Card>

        {/* Ocupação de Capacidade */}
        <Card className="bg-slate-950 border-slate-800 p-3 shadow-sm">
          <div className="text-[11px] font-medium text-slate-400">Capacidade Ocupada</div>
          <div className="text-xl font-bold text-indigo-400 mt-1">{kpis.occupancyPct}%</div>
          <div className="text-[10px] text-indigo-300/80 mt-1">
            {kpis.totalRatePerHour} t/h de vazão
          </div>
        </Card>

        {/* Gargalos & Riscos */}
        <Card className="bg-slate-950 border-slate-800 p-3 shadow-sm border-l-2 border-l-rose-500">
          <div className="text-[11px] font-medium text-slate-400">Gargalos & Riscos</div>
          <div className="text-xl font-bold text-rose-400 mt-1 flex items-center gap-1.5">
            <span>{kpis.activeBottlenecks}</span>
            <span className="text-xs font-normal text-amber-400">
              ({kpis.ordersAtRisk} em risco)
            </span>
          </div>
          <div className="text-[10px] text-rose-400/80 mt-1">
            {kpis.criticalStopsCount} paradas críticas
          </div>
        </Card>
      </div>

      {/* 2. VISÃO ESPECÍFICA DE ACORDO COM O NÍVEL SELECIONADO */}

      {/* =========================================================================
          NÍVEL EMPRESA (Consolidado Corporativo + Comparar Plantas)
      ========================================================================= */}
      {isCompanyLevel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="w-4 h-4 text-pantone-2945" />
              <span className="font-semibold text-white">
                Visão Corporativa Consolidada: CIAFAL ({companies[0]?.name})
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">2 Plantas Ativas • 6 Linhas Produtivas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComparePlantsModalOpen(true)}
                className="h-7 text-xs border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                [Comparar Plantas]
              </Button>
            </div>
          </div>

          {/* Cards das Plantas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plantComparisonData.map((pl) => (
              <Card
                key={pl.plantCode}
                className="bg-slate-950 border-slate-800 hover:border-pantone-2945/60 transition-all cursor-pointer group"
                onClick={() => setPlantScope(pl.plantCode)}
              >
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-pantone-2945" />
                    <CardTitle className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {pl.plantName} ({pl.plantCode})
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-slate-900 text-xs text-slate-300">
                    Aderência {pl.adherencePct}%
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 text-xs space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-slate-300 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Programado:</span>
                      <strong>{pl.plannedTons.toLocaleString('pt-BR')} t</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Realizado:</span>
                      <strong className="text-emerald-400">
                        {pl.producedTons.toLocaleString('pt-BR')} t
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Ocupação:</span>
                      <strong className="text-indigo-400">{pl.occupancyPct}%</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="text-rose-400 font-medium">
                        {pl.bottlenecksCount} Gargalos
                      </span>
                      <span className="text-amber-400 font-medium">
                        {pl.ordersAtRiskCount} OPs em risco
                      </span>
                    </div>
                    <span className="text-cyan-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Entrar na Planta <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          NÍVEL PLANTA (Visão Todas as Linhas da Planta + Comparar Linhas)
      ========================================================================= */}
      {isPlantLevel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <Factory className="w-4 h-4 text-pantone-2945" />
              <span className="font-semibold text-white">
                Planta:{' '}
                {availablePlants.find((p) => p.code === filters.plantCode)?.name ||
                  filters.plantCode}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{availableLines.length} Linhas Monitoradas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPlantScope('ALL')}
                className="h-7 text-xs text-slate-400 hover:text-white"
              >
                Voltar para Empresa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompareLinesModalOpen(true)}
                className="h-7 text-xs border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                [Comparar Linhas]
              </Button>
            </div>
          </div>

          {/* Tabela de Linhas da Planta */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-900/80">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs font-mono">Linha</TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono">OP Atual</TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono">Próxima OP</TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-right">
                    Programado
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-right">
                    Realizado
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-right">
                    Aderência
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-center">
                    Ocupação
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-center">
                    Buffer
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs font-mono text-center">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineComparisonData.map((l) => (
                  <TableRow
                    key={l.lineCode}
                    className="border-slate-800/60 hover:bg-slate-900/50 cursor-pointer"
                    onClick={() => setLineScope(l.lineCode)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-white">
                      {l.lineCode} - {l.lineName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-300 font-mono">
                      {l.currentOrder}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-mono">
                      {l.nextOrder}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-slate-300">
                      {l.plannedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-emerald-400 font-bold">
                      {l.producedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-pantone-2945 font-bold">
                      {l.adherencePct}%
                    </TableCell>
                    <TableCell className="text-xs font-mono text-center text-slate-200">
                      {l.occupancyPct}%
                    </TableCell>
                    <TableCell className="text-xs font-mono text-center text-amber-400">
                      {l.bufferCoverageHours}h
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          l.status === 'running'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30 text-[10px]'
                            : l.status === 'maintenance'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-600/30 text-[10px]'
                              : 'bg-amber-950/40 text-amber-400 border-amber-600/30 text-[10px]'
                        }
                      >
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigateToSubmodule('SEQUENCIAMENTO', {
                            company: filters.companyCode,
                            plant: filters.plantCode,
                            line: l.lineCode,
                          })
                        }
                        className="h-6 text-[11px] text-cyan-400 hover:text-white hover:bg-slate-800 px-2"
                        title="Ver no Sequenciamento (Gantt)"
                      >
                        Ver no Sequenciamento <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* =========================================================================
          NÍVEL LINHA (Detalhe Físico e Operacional da Linha Selecionada)
      ========================================================================= */}
      {isLineLevel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">
                Linha:{' '}
                {availableLines.find((l) => l.code === filters.lineCode)?.name || filters.lineCode}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono">
                Capacidade Nominal:{' '}
                {availableLines.find((l) => l.code === filters.lineCode)?.nominal_capacity || 120}{' '}
                t/h
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLineScope('ALL')}
                className="h-7 text-xs text-slate-400 hover:text-white"
              >
                Voltar para Planta
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  navigateToSubmodule('SEQUENCIAMENTO', {
                    company: filters.companyCode,
                    plant: filters.plantCode,
                    line: filters.lineCode,
                  })
                }
                className="h-7 text-xs bg-pantone-2945 hover:bg-pantone-2945/90 text-white"
              >
                Abrir no Sequenciamento (Gantt) <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Grid de 3 Colunas: Programação Atual, Próxima Campanha, Gargalos/Buffers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Programação Atual */}
            <Card className="bg-slate-950 border-slate-800 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-slate-900">
                <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <Activity className="w-4 h-4 text-emerald-400" /> Operação Atual na Linha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 font-mono">
                {filteredOrders[0] ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ordem:</span>
                      <strong className="text-cyan-300 font-bold">
                        {filteredOrders[0].orderNumber}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Família / Material:</span>
                      <strong className="text-white text-right">
                        {filteredOrders[0].familyName}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Cliente:</span>
                      <strong className="text-slate-300">{filteredOrders[0].customerName}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Ritmo (Real / Meta):</span>
                      <strong className="text-emerald-400">
                        {filteredOrders[0].currentRatePerHour} t/h /{' '}
                        {filteredOrders[0].targetRatePerHour} t/h
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Conclusão Projetada:</span>
                      <strong className="text-amber-400">{filteredOrders[0].projectedEnd}</strong>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(filteredOrders[0])}
                        className="w-full h-7 text-xs border-slate-700 bg-slate-900 text-slate-200"
                      >
                        Ver Detalhes da OP (Drawer)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 py-4 text-center">
                    Nenhuma ordem ativa no momento
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 2: Ritmos, Gaps e Capacidade */}
            <Card className="bg-slate-950 border-slate-800 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-slate-900">
                <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-cyan-400" /> Ritmo e Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Capacidade Nominal:</span>
                  <strong className="text-white">120 t/h</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ritmo Real Instantâneo:</span>
                  <strong className="text-emerald-400">118 t/h</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ritmo Necessário p/ Turno:</span>
                  <strong className="text-cyan-300">115 t/h</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Gap de Produção:</span>
                  <strong className="text-emerald-400">+3 t/h (Superavitário)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Buffer Cobertura:</span>
                  <strong className="text-amber-400">6.3 horas</strong>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 3: Gargalos e Alertas Específicos */}
            <Card className="bg-slate-950 border-slate-800 shadow-sm">
              <CardHeader className="p-4 pb-2 border-b border-slate-900">
                <CardTitle className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Alertas da Linha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2 font-mono">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((al) => (
                    <div
                      key={al.id}
                      className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="font-bold text-amber-300">{al.title}</div>
                      <div className="text-slate-400 text-[10px]">{al.cause}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-400 py-4 text-center">
                    Nenhum alerta crítico ativo na linha
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 3. Seção de Gargalos Ranqueados e Buffers da Torre */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        {/* Gargalos Ranqueados */}
        <Card className="bg-slate-950 border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-900 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-rose-500" /> Gargalos de Processo (Ranqueados
              por Impacto)
            </CardTitle>
            <Badge variant="outline" className="bg-rose-950/40 text-rose-400 text-[10px]">
              {filteredBottlenecks.length} Identificados
            </Badge>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            {filteredBottlenecks.map((bot) => (
              <div
                key={bot.id}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 cursor-pointer"
                onClick={() => {
                  const node = filteredNodes.find((n) => n.code === bot.processCode)
                  if (node) setSelectedProcess(node)
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white text-xs">
                    #{bot.rank} {bot.companyCode} &gt; {bot.plantCode} &gt; {bot.processName}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      bot.criticality === 'ALTA'
                        ? 'bg-rose-950 text-rose-400 border-rose-600/40 text-[10px]'
                        : 'bg-amber-950 text-amber-400 border-amber-600/40 text-[10px]'
                    }
                  >
                    Impacto: -{bot.impactTons} t
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-300">{bot.description}</p>
                <div className="flex items-center justify-between text-[10px] text-cyan-400 font-mono pt-1 border-t border-slate-800/80">
                  <span>Recomendação IA: {bot.aiRecommendation}</span>
                  <span className="text-slate-400 underline">Ver Processo (Drawer)</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alertas Operacionais Ricos com Navegação Cruzada */}
        <Card className="bg-slate-950 border-slate-800 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-900 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-amber-400" /> Alertas Operacionais & Propagação de Risco
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAlertCenterOpen(true)}
              className="h-6 text-[11px] text-cyan-400 hover:text-white"
            >
              Abrir Central de Alertas
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            {filteredAlerts.slice(0, 4).map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-xs font-mono">{al.title}</span>
                  <span className="text-[10px] text-slate-500">{al.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-300">{al.cause}</p>
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Impacto: {al.impact}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigateToSubmodule('SEQUENCIAMENTO', {
                        company: al.companyCode,
                        plant: al.plantCode,
                        line: al.processCode,
                      })
                    }
                    className="h-5 text-[10px] text-cyan-400 hover:text-white px-1.5"
                  >
                    Ver no Sequenciamento <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
          MODAIS E DRAWERS
      ========================================================================= */}

      {/* Modal Comparar Plantas (Visão Corporativa) */}
      <Dialog open={isComparePlantsModalOpen} onOpenChange={setIsComparePlantsModalOpen}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Factory className="w-5 h-5 text-pantone-2945" /> Comparativo de Plantas Produtivas
              (CIAFAL)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Métricas consolidadas de desempenho, produção e gargalos por planta fabril.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded border border-slate-800 overflow-hidden mt-2">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400 text-xs">Planta</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Programado</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Projetado</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Aderência</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">Ocupação</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">Gargalos</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">OPs em Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantComparisonData.map((p) => (
                  <TableRow key={p.plantCode} className="border-slate-800/60 font-mono text-xs">
                    <TableCell className="font-bold text-white">{p.plantName}</TableCell>
                    <TableCell className="text-right text-slate-300">
                      {p.plannedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-emerald-400 font-bold">
                      {p.producedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-cyan-300">
                      {p.projectedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-pantone-2945 font-bold">
                      {p.adherencePct}%
                    </TableCell>
                    <TableCell className="text-center text-indigo-400">{p.occupancyPct}%</TableCell>
                    <TableCell className="text-center text-rose-400">
                      {p.bottlenecksCount}
                    </TableCell>
                    <TableCell className="text-center text-amber-400">
                      {p.ordersAtRiskCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Comparar Linhas (Visão Planta) */}
      <Dialog open={isCompareLinesModalOpen} onOpenChange={setIsCompareLinesModalOpen}>
        <DialogContent className="max-w-5xl bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Cpu className="w-5 h-5 text-pantone-2945" /> Comparativo de Linhas de Produção
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Métricas detalhadas de vazão, ritmos, aderência e buffers por linha produtiva.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded border border-slate-800 overflow-hidden mt-2 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-950">
                <TableRow className="border-slate-800">
                  <TableHead className="text-slate-400 text-xs">Linha</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">
                    Ritmo Real / Meta
                  </TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Programado</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Aderência</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">Ocupação</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">Buffer</TableHead>
                  <TableHead className="text-slate-400 text-xs text-center">Gargalos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineComparisonData.map((l) => (
                  <TableRow key={l.lineCode} className="border-slate-800/60 font-mono text-xs">
                    <TableCell className="font-bold text-white">
                      {l.lineCode} - {l.lineName}
                    </TableCell>
                    <TableCell className="text-right text-emerald-400">
                      {l.currentRate} / {l.targetRate} t/h
                    </TableCell>
                    <TableCell className="text-right text-slate-300">
                      {l.plannedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-emerald-400 font-bold">
                      {l.producedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-pantone-2945 font-bold">
                      {l.adherencePct}%
                    </TableCell>
                    <TableCell className="text-center text-indigo-400">{l.occupancyPct}%</TableCell>
                    <TableCell className="text-center text-amber-400">
                      {l.bufferCoverageHours}h
                    </TableCell>
                    <TableCell className="text-center text-rose-400">
                      {l.bottlenecksCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawers Laterais */}
      <OrderDrawer />
      <ProcessDrawer />
    </div>
  )
}

export default ControlTowerPage
