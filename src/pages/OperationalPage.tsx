import React, { useState, useEffect } from 'react'
import {
  Activity,
  ArrowRight,
  Clock,
  PlayCircle,
  FastForward,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Package,
  Cpu,
  TrendingUp,
  Megaphone,
  ShieldAlert,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { OrderDrawer } from '@/components/control-tower/OrderDrawer'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import { PCPMinuteItem, PCPCommunication } from '@/types/pcp-meetings-comms'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export const OperationalPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    availablePlants,
    availableLines,
    filteredOrders,
    selectedOrder,
    setSelectedOrder,
    navigateToSubmodule,
  } = useControlTower()

  const [selectedShift, setSelectedShift] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Estados integrados de Reuniões PCP e Comunicados PCP
  const [minuteItems, setMinuteItems] = useState<PCPMinuteItem[]>([])
  const [communications, setCommunications] = useState<PCPCommunication[]>([])

  const loadPcpOperationalAlerts = async () => {
    try {
      const items = await pcpMeetingService.listMinuteItems({ isOperationalOnly: true })
      setMinuteItems(items)
      const comms = await pcpCommunicationService.listCommunications({ onlyActive: true })
      setCommunications(comms)
    } catch (e) {
      console.warn('Aviso ao sincronizar alertas e comunicados do PCP:', e)
    }
  }

  useEffect(() => {
    loadPcpOperationalAlerts()
  }, [])

  const handleAcknowledgeComm = async (commId: string) => {
    try {
      await pcpCommunicationService.acknowledgeCommunication(commId)
      toast({
        title: 'Ciência Registrada pelo Operador',
        description: 'Assinatura eletrônica de leitura gravada no HUB.',
      })
      loadPcpOperationalAlerts()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao registrar ciência', description: e.message })
    }
  }

  // Linhas a exibir
  const linesToDisplay = availableLines.filter((l) => {
    if (filters.lineCode !== 'ALL' && l.code !== filters.lineCode) return false
    return true
  })

  // Montar visão AGORA / PRÓXIMO / DEPOIS para uma linha
  const getLineOperationalFlow = (lineCode: string) => {
    const lineOrders = filteredOrders.filter((o) => o.lineCode === lineCode)

    const nowOrder =
      lineOrders.find((o) => o.status === 'IN_PRODUCTION') ||
      lineOrders.find((o) => o.status === 'SETUP') ||
      lineOrders[0]

    const nextOrder = lineOrders.find(
      (o) => o.id !== nowOrder?.id && (o.status === 'RELEASED' || o.status === 'PLANNED'),
    )

    const laterOrder = lineOrders.find(
      (o) => o.id !== nowOrder?.id && o.id !== nextOrder?.id && o.status === 'PLANNED',
    )

    return { nowOrder, nextOrder, laterOrder, totalOrdersCount: lineOrders.length }
  }

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      {/* Header Central com Breadcrumb, Escopo e Sincronização */}
      <ControlTowerHeader
        title="Cockpit Operacional de Chão de Fábrica"
        subtitle="Acompanhamento da execução fabril em tempo real: Agora, Próximo e Fila por linha."
        breadcrumbSubmodule="Operacional"
      />

      {/* Barra de Filtros Operacionais Clean */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Busca Rápida */}
          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <Input
              placeholder="Buscar OP, Material, Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 bg-slate-900 border-slate-800 text-xs text-slate-200"
            />
          </div>

          {/* Filtro de Turno */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-800 rounded px-2 text-slate-300 text-xs outline-none"
          >
            <option value="ALL">Todos os Turnos</option>
            <option value="T1">Turno 1 (06h - 14h)</option>
            <option value="T2">Turno 2 (14h - 22h)</option>
            <option value="T3">Turno 3 (22h - 06h)</option>
          </select>

          {/* Filtro de Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 bg-slate-900 border border-slate-800 rounded px-2 text-slate-300 text-xs outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="IN_PRODUCTION">Em Produção</option>
            <option value="SETUP">Em Setup</option>
            <option value="RELEASED">Liberada / Aguardando</option>
            <option value="BLOCKED">Bloqueada / Parada</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
          <span>{linesToDisplay.length} linhas em acompanhamento</span>
        </div>
      </div>

      {/* 1. VISÃO EM CARDS: AGORA / PRÓXIMO / DEPOIS POR LINHA */}
      <div className="space-y-4">
        {linesToDisplay.map((line) => {
          const { nowOrder, nextOrder, laterOrder, totalOrdersCount } = getLineOperationalFlow(
            line.code,
          )

          return (
            <Card
              key={line.code}
              className="bg-slate-950 border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Cabeçalho da Linha */}
              <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-pantone-2945" />
                  <span className="font-bold text-white text-sm font-mono">
                    {line.code} — {line.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]"
                  >
                    Planta: {line.plantCode}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      line.status === 'running'
                        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-600/40 text-[10px]'
                        : line.status === 'maintenance'
                          ? 'bg-rose-950/50 text-rose-400 border-rose-600/40 text-[10px]'
                          : 'bg-amber-950/50 text-amber-400 border-amber-600/40 text-[10px]'
                    }
                  >
                    {line.status === 'running' ? '● Em Operação' : line.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    Gestor:{' '}
                    <strong className="text-slate-200">
                      {line.manager_name || 'Carlos Mendes'}
                    </strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigateToSubmodule('TORRE_CONTROLE', {
                        company: line.companyCode,
                        plant: line.plantCode,
                        line: line.code,
                      })
                    }
                    className="h-6 text-[11px] text-cyan-400 hover:text-white hover:bg-slate-800 px-2"
                  >
                    Analisar Impacto (Torre) <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>

              {/* SEÇÃO INTEGRADA: COMUNICADOS & ALERTAS DE REUNIÃO VIGENTES NA LINHA (REGRA PRINCIPAL) */}
              {(() => {
                const lineItems = minuteItems.filter(
                  (it) => it.line_codes?.includes(line.code) || it.line_codes?.length === 0,
                )
                const lineComms = communications.filter(
                  (c) =>
                    c.target_line_codes?.includes(line.code) ||
                    c.target_audience_type === 'TODOS' ||
                    c.target_audience_type === 'OPERACAO',
                )

                if (lineItems.length === 0 && lineComms.length === 0) return null

                return (
                  <div className="bg-slate-900/60 p-3 border-b border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                        <Megaphone className="w-3.5 h-3.5" /> COMUNICADOS & ALERTAS VIGENTES (PCP &
                        REUNIÕES)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lineItems.length + lineComms.length} diretrizes ativas
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Comunicados Oficiais PCP */}
                      {lineComms.map((comm) => {
                        const isBlocking = comm.criticality === 'BLOQUEANTE' || comm.is_blocking
                        const isAcked = comm.user_read_state?.is_acknowledged

                        return (
                          <div
                            key={comm.id}
                            className={`p-2.5 rounded border text-xs space-y-1.5 ${
                              isBlocking
                                ? 'bg-purple-950/40 border-purple-600/60 text-purple-200'
                                : comm.criticality === 'CRITICA'
                                  ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                                  : 'bg-amber-950/30 border-amber-600/40 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  className={`text-[9px] font-bold ${
                                    isBlocking
                                      ? 'bg-purple-900 text-white'
                                      : comm.criticality === 'CRITICA'
                                        ? 'bg-rose-700 text-white'
                                        : 'bg-amber-600 text-white'
                                  }`}
                                >
                                  {comm.criticality}
                                </Badge>
                                <span className="font-bold text-white truncate max-w-[220px]">
                                  {comm.title}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono opacity-70">
                                Val: {comm.valid_until || comm.valid_from}
                              </span>
                            </div>

                            <p className="text-[11px] opacity-90 leading-snug line-clamp-2">
                              {comm.summary || comm.content}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px]">
                              <span>
                                Origem: <strong className="text-white">{comm.origin_type}</strong>
                              </span>

                              <div className="flex items-center gap-1.5">
                                {comm.requires_acknowledgement && !isAcked && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcknowledgeComm(comm.id)}
                                    className="h-5 text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white px-2 font-bold"
                                  >
                                    ✓ LI E ESTOU CIENTE
                                  </Button>
                                )}
                                {isAcked && (
                                  <span className="text-emerald-400 font-bold">✓ Ciente</span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate('/pcp/comunicados')}
                                  className="h-5 text-[9px] text-cyan-300 hover:text-white px-1.5"
                                >
                                  Ver Detalhes
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {/* Alertas & Pendências de Reunião PCP (Regra ATA ➔ Linha) */}
                      {lineItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-2.5 rounded border border-blue-500/40 bg-blue-950/30 text-blue-200 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-[#004C97] text-white text-[9px] font-bold">
                                ⚠ ALERTA – REUNIÃO PCP
                              </Badge>
                              <span className="font-bold text-white truncate max-w-[200px]">
                                {item.title}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-amber-300">
                              Prazo: {item.deadline}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-200 leading-snug line-clamp-2">
                            {item.description}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[10px]">
                            <span>
                              Origem:{' '}
                              <strong className="text-white">
                                ATA PCP [{item.item_code}] &bull; Resp: {item.responsible_name}
                              </strong>
                            </span>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/pcp/reunioes/atas?meetingId=${item.meeting_id}`)
                              }
                              className="h-5 text-[9px] text-cyan-300 hover:text-white px-1.5"
                            >
                              [ABRIR ITEM NA ATA] <ExternalLink className="w-2.5 h-2.5 ml-1" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Grid de 3 Colunas: AGORA / PRÓXIMO / DEPOIS */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 p-0 text-xs">
                {/* 1. AGORA (O que está produzindo agora) */}
                <div className="p-4 space-y-2.5 bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      AGORA (Produzindo)
                    </span>
                    {nowOrder && (
                      <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700/50 text-[10px]">
                        {nowOrder.orderNumber}
                      </Badge>
                    )}
                  </div>

                  {nowOrder ? (
                    <div className="space-y-2 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          Família / Material:
                        </span>
                        <strong className="text-white text-xs font-sans block">
                          {nowOrder.familyName}
                        </strong>
                        <span className="text-slate-400 text-[11px]">{nowOrder.materialName}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px]">Programado:</span>
                          <strong className="text-slate-300">{nowOrder.plannedTons} t</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">Realizado:</span>
                          <strong className="text-emerald-400">{nowOrder.producedTons} t</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">Saldo:</span>
                          <strong className="text-cyan-300">{nowOrder.remainingTons} t</strong>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ritmo (Real / Meta):</span>
                          <strong className="text-emerald-400">
                            {nowOrder.currentRatePerHour} t/h / {nowOrder.targetRatePerHour} t/h
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ritmo Necessário:</span>
                          <strong className="text-cyan-300">74 t/h</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Conclusão Prevista:</span>
                          <strong className="text-amber-300">{nowOrder.projectedEnd}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Status Operacional:</span>
                          <span className="text-emerald-400 font-bold">● Ritmo Estável</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(nowOrder)}
                        className="w-full h-6 text-[11px] border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                      >
                        Abrir Ficha da OP
                      </Button>
                    </div>
                  ) : (
                    <div className="text-slate-500 py-6 text-center">Nenhuma ordem em execução</div>
                  )}
                </div>

                {/* 2. PRÓXIMO (O que vem logo em seguida) */}
                <div className="p-4 space-y-2.5 bg-slate-950/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                      PRÓXIMO (Na Fila Imediata)
                    </span>
                    {nextOrder && (
                      <Badge className="bg-slate-900 text-slate-300 border-slate-700 text-[10px]">
                        {nextOrder.orderNumber}
                      </Badge>
                    )}
                  </div>

                  {nextOrder ? (
                    <div className="space-y-2 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          Família / Material:
                        </span>
                        <strong className="text-white text-xs font-sans block">
                          {nextOrder.familyName}
                        </strong>
                        <span className="text-slate-400 text-[11px]">{nextOrder.materialName}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px]">Volume Lote:</span>
                          <strong className="text-slate-300">{nextOrder.plannedTons} t</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">Setup Estimado:</span>
                          <strong className="text-amber-400">{nextOrder.setupMinutes} min</strong>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Início Previsto:</span>
                          <strong className="text-white">{nextOrder.plannedStart}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Matéria-Prima:</span>
                          <strong
                            className={
                              nextOrder.rawMaterialAvailable ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {nextOrder.rawMaterialAvailable
                              ? '✓ Disponível no Pátio'
                              : '⚠ Em Trânsito'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Cliente:</span>
                          <span className="text-slate-300 truncate max-w-[140px]">
                            {nextOrder.customerName}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(nextOrder)}
                        className="w-full h-6 text-[11px] border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                      >
                        Abrir Ficha da OP
                      </Button>
                    </div>
                  ) : (
                    <div className="text-slate-500 py-6 text-center">
                      Fila vazia / Sem próxima OP
                    </div>
                  )}
                </div>

                {/* 3. DEPOIS (Sequência Posterior) */}
                <div className="p-4 space-y-2.5 bg-slate-950/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      DEPOIS (Sequência Programada)
                    </span>
                    {laterOrder && (
                      <Badge className="bg-slate-900 text-slate-400 border-slate-800 text-[10px]">
                        {laterOrder.orderNumber}
                      </Badge>
                    )}
                  </div>

                  {laterOrder ? (
                    <div className="space-y-2 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">
                          Família / Material:
                        </span>
                        <strong className="text-white text-xs font-sans block">
                          {laterOrder.familyName}
                        </strong>
                        <span className="text-slate-400 text-[11px]">
                          {laterOrder.materialName}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800/80 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px]">Volume Lote:</span>
                          <strong className="text-slate-300">{laterOrder.plannedTons} t</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px]">Início Previsto:</span>
                          <strong className="text-slate-300">{laterOrder.plannedStart}</strong>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Total de ordens aguardando na linha:{' '}
                        <strong className="text-white">
                          {Math.max(0, totalOrdersCount - 2)} ordens
                        </strong>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrder(laterOrder)}
                        className="w-full h-6 text-[11px] border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                      >
                        Abrir Ficha da OP
                      </Button>
                    </div>
                  ) : (
                    <div className="text-slate-500 py-6 text-center">
                      Fim da carteira programada
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* 2. VISÃO MULTILINHAS DA PLANTA EM TABELA CONSOLIDADA */}
      <Card className="bg-slate-950 border-slate-800 shadow-sm mt-6">
        <CardHeader className="p-4 pb-2 border-b border-slate-900 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
            <Layers className="w-4 h-4 text-pantone-2945" /> Visão Multilinhas da Planta (Quadro
            Resumo)
          </CardTitle>
          <span className="text-[11px] text-slate-400 font-mono">
            Status operacional e ritmos em tempo real
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-900/80">
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400 text-xs font-mono">Linha</TableHead>
                <TableHead className="text-slate-400 text-xs font-mono">Produzindo Agora</TableHead>
                <TableHead className="text-slate-400 text-xs font-mono">Próximo</TableHead>
                <TableHead className="text-slate-400 text-xs font-mono text-right">
                  Saldo a Produzir
                </TableHead>
                <TableHead className="text-slate-400 text-xs font-mono text-right">
                  Ritmo (Real / Meta)
                </TableHead>
                <TableHead className="text-slate-400 text-xs font-mono text-right">
                  Aderência
                </TableHead>
                <TableHead className="text-slate-400 text-xs font-mono text-center">
                  Conclusão
                </TableHead>
                <TableHead className="text-slate-400 text-xs font-mono text-center">
                  Status
                </TableHead>
                <TableHead className="text-slate-400 text-xs font-mono text-center">
                  Alertas
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linesToDisplay.map((line) => {
                const { nowOrder, nextOrder } = getLineOperationalFlow(line.code)
                return (
                  <TableRow
                    key={line.code}
                    className="border-slate-800/60 hover:bg-slate-900/50 cursor-pointer font-mono text-xs"
                    onClick={() => {
                      if (nowOrder) setSelectedOrder(nowOrder)
                    }}
                  >
                    <TableCell className="font-bold text-white">
                      {line.code} - {line.name}
                    </TableCell>
                    <TableCell className="text-slate-200">
                      {nowOrder
                        ? `${nowOrder.orderNumber} (${nowOrder.familyName})`
                        : 'Parada / Ociosa'}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {nextOrder ? `${nextOrder.orderNumber} (${nextOrder.familyName})` : '—'}
                    </TableCell>
                    <TableCell className="text-right text-cyan-300">
                      {nowOrder ? `${nowOrder.remainingTons} t` : '0 t'}
                    </TableCell>
                    <TableCell className="text-right text-emerald-400">
                      {nowOrder
                        ? `${nowOrder.currentRatePerHour} / ${nowOrder.targetRatePerHour} t/h`
                        : '0 t/h'}
                    </TableCell>
                    <TableCell className="text-right text-pantone-2945 font-bold">
                      {nowOrder ? `${nowOrder.adherencePct}%` : '—'}
                    </TableCell>
                    <TableCell className="text-center text-amber-300">
                      {nowOrder ? nowOrder.projectedEnd : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          line.status === 'running'
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30 text-[10px]'
                            : line.status === 'maintenance'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-600/30 text-[10px]'
                              : 'bg-amber-950/40 text-amber-400 border-amber-600/30 text-[10px]'
                        }
                      >
                        {line.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {nowOrder && nowOrder.alertsCount > 0 ? (
                        <span className="text-rose-400 font-bold text-xs">
                          {nowOrder.alertsCount} ⚠
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-xs">✓ Ok</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Drawer de Detalhe da Ordem */}
      <OrderDrawer />
    </div>
  )
}

export default OperationalPage
