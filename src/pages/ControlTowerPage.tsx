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
        <Card className="bg-white border-slate-200 p-3 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Programado</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {kpis.plannedTons.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Meta diária consolidada</div>
        </Card>

        {/* Produção Realizada */}
        <Card className="bg-white border-slate-200 p-3 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Realizado</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {kpis.producedTons.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <div className="text-[10px] text-emerald-600 mt-1">
            {((kpis.producedTons / (kpis.plannedTons || 1)) * 100).toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            % do plano
          </div>
        </Card>

        {/* Produção Projetada */}
        <Card className="bg-white border-slate-200 p-3 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Projetado (IA)</div>
          <div className="text-xl font-bold text-[#004C97] mt-1">
            {kpis.projectedTons.toLocaleString('pt-BR')}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <div className="text-[10px] text-blue-600 mt-1">Fechamento estimado</div>
        </Card>

        {/* Aderência Global */}
        <Card className="bg-white border-slate-200 p-3 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Aderência ao Plano</div>
          <div className="text-xl font-bold text-[#004C97] mt-1">{kpis.adherencePct} %</div>
          <div className="text-[10px] text-slate-500 mt-1">Meta &gt; 95 %</div>
        </Card>

        {/* Ocupação de Capacidade */}
        <Card className="bg-white border-slate-200 p-3 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Capacidade Ocupada</div>
          <div className="text-xl font-bold text-slate-800 mt-1">{kpis.occupancyPct} %</div>
          <div className="text-[10px] text-slate-600 mt-1">
            {kpis.totalRatePerHour} t/h de vazão
          </div>
        </Card>

        {/* Gargalos & Riscos */}
        <Card className="bg-white border-slate-200 p-3 shadow-2xs border-l-2 border-l-rose-500">
          <div className="text-[11px] font-medium text-slate-500">Gargalos & Riscos</div>
          <div className="text-xl font-bold text-rose-700 mt-1 flex items-center gap-1.5">
            <span>{kpis.activeBottlenecks}</span>
            <span className="text-xs font-normal text-amber-700">
              ({kpis.ordersAtRisk} em risco)
            </span>
          </div>
          <div className="text-[10px] text-rose-600 mt-1">
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
          <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="w-4 h-4 text-[#004C97]" />
              <span className="font-semibold text-slate-900">
                Visão Corporativa Consolidada: CIAFAL ({companies[0]?.name})
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600">2 Plantas Ativas &bull; 6 Linhas Produtivas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsComparePlantsModalOpen(true)}
                className="h-7 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
                [Comparar Plantas]
              </Button>
            </div>
          </div>

          {/* Cards das Plantas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plantComparisonData.map((pl) => (
              <Card
                key={pl.plantCode}
                className="bg-white border-slate-200 hover:border-[#004C97]/60 transition-all cursor-pointer group shadow-2xs"
                onClick={() => setPlantScope(pl.plantCode)}
              >
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-[#004C97]" />
                    <CardTitle className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                      {pl.plantName} ({pl.plantCode})
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-xs text-[#004C97] border-blue-200 font-bold"
                  >
                    Aderência {pl.adherencePct} %
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 text-xs space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-slate-800 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Programado:</span>
                      <strong>{pl.plannedTons.toLocaleString('pt-BR')} t</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Realizado:</span>
                      <strong className="text-emerald-700">
                        {pl.producedTons.toLocaleString('pt-BR')} t
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Ocupação:</span>
                      <strong className="text-slate-800">{pl.occupancyPct} %</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-3">
                      <span className="text-rose-700 font-medium">
                        {pl.bottlenecksCount} Gargalos
                      </span>
                      <span className="text-amber-700 font-medium">
                        {pl.ordersAtRiskCount} OPs em risco
                      </span>
                    </div>
                    <span className="text-[#004C97] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
          <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
            <div className="flex items-center gap-2 text-xs">
              <Factory className="w-4 h-4 text-[#004C97]" />
              <span className="font-semibold text-slate-900">
                Planta:{' '}
                {availablePlants.find((p) => p.code === filters.plantCode)?.name ||
                  filters.plantCode}
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600">{availableLines.length} Linhas Monitoradas</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPlantScope('ALL')}
                className="h-7 text-xs text-slate-600 hover:text-slate-900"
              >
                Voltar para Empresa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompareLinesModalOpen(true)}
                className="h-7 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <BarChart3 className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
                [Comparar Linhas]
              </Button>
            </div>
          </div>

          {/* Tabela de Linhas da Planta */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-600 text-xs font-mono">Linha</TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono">OP Atual</TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono">Próxima OP</TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-right">
                    Programado
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-right">
                    Realizado
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-right">
                    Aderência
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-center">
                    Ocupação
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-center">
                    Buffer
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs font-mono text-center">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineComparisonData.map((l) => (
                  <TableRow
                    key={l.lineCode}
                    className="border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setLineScope(l.lineCode)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-slate-900">
                      {l.lineCode} - {l.lineName}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-mono">
                      {l.currentOrder}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {l.nextOrder}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-slate-800">
                      {l.plannedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-emerald-700 font-bold">
                      {l.producedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-xs font-mono text-right text-[#004C97] font-bold">
                      {l.adherencePct} %
                    </TableCell>
                    <TableCell className="text-xs font-mono text-center text-slate-800">
                      {l.occupancyPct} %
                    </TableCell>
                    <TableCell className="text-xs font-mono text-center text-amber-700">
                      {l.bufferCoverageHours} h
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          l.status === 'running'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold'
                            : l.status === 'maintenance'
                              ? 'bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-bold'
                              : 'bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold'
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
                        className="h-6 text-[11px] text-[#004C97] hover:text-[#003870] hover:bg-blue-50 px-2 font-semibold"
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
                className="h-7 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
              >
                Abrir no Sequenciamento (Gantt) <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          {/* Grid de 3 Colunas: Programação Atual, Próxima Campanha, Gargalos/Buffers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Programação Atual */}
            <Card className="bg-white border-slate-200 shadow-2xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Activity className="w-4 h-4 text-emerald-600" /> Operação Atual na Linha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 font-mono">
                {filteredOrders[0] ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ordem:</span>
                      <strong className="text-[#004C97] font-bold">
                        {filteredOrders[0].orderNumber}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Família / Material:</span>
                      <strong className="text-slate-900 text-right">
                        {filteredOrders[0].familyName}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Cliente:</span>
                      <strong className="text-slate-700">{filteredOrders[0].customerName}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Ritmo (Real / Meta):</span>
                      <strong className="text-emerald-700">
                        {filteredOrders[0].currentRatePerHour} t/h /{' '}
                        {filteredOrders[0].targetRatePerHour} t/h
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Conclusão Projetada:</span>
                      <strong className="text-amber-700">{filteredOrders[0].projectedEnd}</strong>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(filteredOrders[0])}
                        className="w-full h-7 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      >
                        Ver Detalhes da OP (Drawer)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 py-4 text-center">
                    Nenhuma ordem ativa no momento
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coluna 2: Ritmos, Gaps e Capacidade */}
            <Card className="bg-white border-slate-200 shadow-2xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-[#004C97]" /> Ritmo e Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Capacidade Nominal:</span>
                  <strong className="text-slate-900">120 t/h</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ritmo Real Instantâneo:</span>
                  <strong className="text-emerald-700">118 t/h</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ritmo Necessário p/ Turno:</span>
                  <strong className="text-[#004C97]">115 t/h</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Gap de Produção:</span>
                  <strong className="text-emerald-700">+3 t/h (Superavitário)</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Buffer Cobertura:</span>
                  <strong className="text-amber-700">6,3 horas</strong>
                </div>
              </CardContent>
            </Card>

            {/* Coluna 3: Gargalos e Alertas Específicos */}
            <Card className="bg-white border-slate-200 shadow-2xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Alertas da Linha
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-2 font-mono">
                {filteredAlerts.length > 0 ? (
                  filteredAlerts.map((al) => (
                    <div
                      key={al.id}
                      className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] space-y-1"
                    >
                      <div className="font-bold text-amber-900">{al.title}</div>
                      <div className="text-slate-600 text-[10px]">{al.cause}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-700 py-4 text-center">
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
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Gargalos de Processo (Ranqueados
              por Impacto)
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-bold"
            >
              {filteredBottlenecks.length} Identificados
            </Badge>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            {filteredBottlenecks.map((bot) => (
              <div
                key={bot.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-1.5 cursor-pointer"
                onClick={() => {
                  const node = filteredNodes.find((n) => n.code === bot.processCode)
                  if (node) setSelectedProcess(node)
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    #{bot.rank} {bot.companyCode} &gt; {bot.plantCode} &gt; {bot.processName}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      bot.criticality === 'ALTA'
                        ? 'bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold'
                        : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold'
                    }
                  >
                    Impacto: -{bot.impactTons} t
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-700">{bot.description}</p>
                <div className="flex items-center justify-between text-[10px] text-[#004C97] font-mono pt-1 border-t border-slate-200">
                  <span className="font-semibold">Recomendação IA: {bot.aiRecommendation}</span>
                  <span className="text-slate-500 underline">Ver Processo (Drawer)</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alertas Operacionais Ricos com Navegação Cruzada */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <Zap className="w-4 h-4 text-amber-600" /> Alertas Operacionais & Propagação de Risco
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAlertCenterOpen(true)}
              className="h-6 text-[11px] text-[#004C97] hover:text-[#003870] font-semibold"
            >
              Abrir Central de Alertas
            </Button>
          </CardHeader>
          <CardContent className="p-4 text-xs space-y-2">
            {filteredAlerts.slice(0, 4).map((al) => (
              <div
                key={al.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 text-xs font-mono">{al.title}</span>
                  <span className="text-[10px] text-slate-500">{al.timestamp}</span>
                </div>
                <p className="text-[11px] text-slate-700">{al.cause}</p>
                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200">
                  <span className="text-slate-600">Impacto: {al.impact}</span>
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
                    className="h-5 text-[10px] text-[#004C97] hover:text-[#003870] font-semibold px-1.5"
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
        <DialogContent className="max-w-4xl bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Factory className="w-5 h-5 text-[#004C97]" /> Comparativo de Plantas Produtivas
              (CIAFAL)
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Métricas consolidadas de desempenho, produção e gargalos por planta fabril.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded border border-slate-200 overflow-hidden mt-2">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600 text-xs">Planta</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Programado</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Projetado</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Aderência</TableHead>
                  <TableHead className="text-slate-600 text-xs text-center">Ocupação</TableHead>
                  <TableHead className="text-slate-600 text-xs text-center">Gargalos</TableHead>
                  <TableHead className="text-slate-600 text-xs text-center">OPs em Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantComparisonData.map((p) => (
                  <TableRow key={p.plantCode} className="border-slate-100 font-mono text-xs">
                    <TableCell className="font-bold text-slate-900">{p.plantName}</TableCell>
                    <TableCell className="text-right text-slate-700">
                      {p.plannedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-emerald-700 font-bold">
                      {p.producedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-[#004C97]">
                      {p.projectedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-[#004C97] font-bold">
                      {p.adherencePct} %
                    </TableCell>
                    <TableCell className="text-center text-slate-800">{p.occupancyPct} %</TableCell>
                    <TableCell className="text-center text-rose-700 font-bold">
                      {p.bottlenecksCount}
                    </TableCell>
                    <TableCell className="text-center text-amber-700 font-bold">
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
        <DialogContent className="max-w-5xl bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Cpu className="w-5 h-5 text-[#004C97]" /> Comparativo de Linhas de Produção
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Métricas detalhadas de vazão, ritmos, aderência e buffers por linha produtiva.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded border border-slate-200 overflow-hidden mt-2 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600 text-xs">Linha</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">
                    Ritmo Real / Meta
                  </TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Programado</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Realizado</TableHead>
                  <TableHead className="text-slate-600 text-xs text-right">Aderência</TableHead>
                  <TableHead className="text-slate-600 text-xs text-center">Ocupação</TableHead>
                  <TableHead className="text-slate-600 text-xs text-center">Buffer</TableHead>
                  <TableHead className="text-slate-600 text-xs text-center">Gargalos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineComparisonData.map((l) => (
                  <TableRow key={l.lineCode} className="border-slate-100 font-mono text-xs">
                    <TableCell className="font-bold text-slate-900">
                      {l.lineCode} - {l.lineName}
                    </TableCell>
                    <TableCell className="text-right text-emerald-700">
                      {l.currentRate} / {l.targetRate} t/h
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      {l.plannedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-emerald-700 font-bold">
                      {l.producedTons.toLocaleString('pt-BR')} t
                    </TableCell>
                    <TableCell className="text-right text-[#004C97] font-bold">
                      {l.adherencePct} %
                    </TableCell>
                    <TableCell className="text-center text-slate-800">{l.occupancyPct} %</TableCell>
                    <TableCell className="text-center text-amber-700 font-semibold">
                      {l.bufferCoverageHours} h
                    </TableCell>
                    <TableCell className="text-center text-rose-700 font-bold">
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
