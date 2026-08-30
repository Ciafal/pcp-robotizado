import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Filter,
  Search,
  Eye,
  RotateCw,
  Radio,
  FileCode,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Server,
  Zap,
} from 'lucide-react'
import {
  IntegrationEventPayload,
  IntegrationEventStatus,
  IntegrationDestination,
  IntegrationMonitorKPIs,
  IntegrationEnvironment,
  ReconciliationResult,
} from '@/types/pcp-integration'
import { integrationEventService } from '@/services/pcp-integration-service'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export const PCPIntegrationMonitorPage: React.FC = () => {
  const { user, can } = useAuth()
  const [events, setEvents] = useState<IntegrationEventPayload[]>([])
  const [kpis, setKpis] = useState<IntegrationMonitorKPIs>({
    eventsTodayCount: 0,
    pendingCount: 0,
    processedCount: 0,
    errorCount: 0,
    retryCount: 0,
    avgProcessingTimeMs: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<IntegrationEventPayload | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [reconcileResults, setReconcileResults] = useState<ReconciliationResult[] | null>(null)
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  // Filtros
  const [activeEnv, setActiveEnv] = useState<IntegrationEnvironment>(
    integrationEventService.getActiveEnvironment(),
  )
  const [destFilter, setDestFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const canReconcile = can('pcp.integrations.reconcile') || user?.role === 'PCP_ADMIN'

  const loadData = async () => {
    setLoading(true)
    try {
      const kpiData = await integrationEventService.getMonitorKPIs(activeEnv)
      setKpis(kpiData)

      const eventList = await integrationEventService.listEvents({
        ambiente: activeEnv,
        destino: destFilter !== 'ALL' ? (destFilter as IntegrationDestination) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as IntegrationEventStatus) : undefined,
        search: searchTerm || undefined,
        limit: 100,
      })
      setEvents(eventList)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const handleEnvChanged = (e: any) => {
      if (e.detail?.env) {
        setActiveEnv(e.detail.env)
      }
    }
    window.addEventListener('ciafal_environment_changed', handleEnvChanged)
    return () => {
      window.removeEventListener('ciafal_environment_changed', handleEnvChanged)
    }
  }, [activeEnv, destFilter, statusFilter, searchTerm])

  const handleRetry = async (event: IntegrationEventPayload) => {
    setRetryingId(event.event_id)
    try {
      const res = await integrationEventService.retryEvent(event.event_id, event.destino)
      if (res.success) {
        toast({
          title: 'Retentativa com Sucesso',
          description: res.message,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na Retentativa',
          description: res.message,
        })
      }
      await loadData()
      if (selectedEvent?.event_id === event.event_id) {
        setIsDetailModalOpen(false)
      }
    } finally {
      setRetryingId(null)
    }
  }

  const handleRunReconciliation = async () => {
    setReconciling(true)
    try {
      const results = await integrationEventService.runReconciliation('WS-L1-2026-W35', 'L1')
      setReconcileResults(results)
      setIsReconcileModalOpen(true)
    } finally {
      setReconciling(false)
    }
  }

  const getStatusBadge = (status: IntegrationEventStatus) => {
    switch (status) {
      case 'PENDENTE':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 font-mono text-[10px]"
          >
            PENDENTE
          </Badge>
        )
      case 'ENVIANDO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 font-mono text-[10px] animate-pulse"
          >
            ENVIANDO...
          </Badge>
        )
      case 'ENVIADO':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300 font-mono text-[10px]"
          >
            ENVIADO
          </Badge>
        )
      case 'RECEBIDO':
        return (
          <Badge
            variant="outline"
            className="bg-cyan-50 text-cyan-800 border-cyan-300 font-mono text-[10px]"
          >
            RECEBIDO
          </Badge>
        )
      case 'PROCESSADO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold font-mono text-[10px]"
          >
            ✓ PROCESSADO
          </Badge>
        )
      case 'EVENTO_JA_PROCESSADO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-400 font-bold font-mono text-[10px]"
          >
            ✓ IDEMPOTENTE (JÁ PROC.)
          </Badge>
        )
      case 'NAO_APLICAVEL':
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-500 border-slate-200 font-mono text-[10px]"
          >
            NÃO APLICÁVEL
          </Badge>
        )
      case 'ERRO':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 font-bold font-mono text-[10px]"
          >
            🔴 ERRO
          </Badge>
        )
      case 'INTERVENCAO_NECESSARIA':
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-800 border-purple-400 font-black font-mono text-[10px]"
          >
            ⚠️ INTERVENÇÃO NECESSÁRIA
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#004C97]" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              MONITOR DE INTEGRAÇÕES & EVENTOS PONTA A PONTA
            </h1>
            <Badge className="bg-[#004C97] text-white font-bold text-xs ml-2">
              Rastreabilidade Integral
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditoria e acompanhamento em tempo real do tráfego de eventos: PCP → MES → CRM → TMS →
            SAP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunReconciliation}
            disabled={reconciling || !canReconcile}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2"
          >
            <RotateCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin' : ''}`} />
            {reconciling ? 'Reconciliando...' : 'Reconciliar Versões'}
          </Button>

          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] text-slate-500 font-bold uppercase">Eventos Totais</div>
          <div className="text-xl font-black text-slate-900 mt-1">{kpis.eventsTodayCount}</div>
          <div className="text-[10px] text-slate-400">no ambiente ativo</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] text-amber-600 font-bold uppercase">Pendentes / Fila</div>
          <div className="text-xl font-black text-amber-700 mt-1">{kpis.pendingCount}</div>
          <div className="text-[10px] text-slate-400">em transmissão</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] text-emerald-600 font-bold uppercase">Processados</div>
          <div className="text-xl font-black text-emerald-700 mt-1">{kpis.processedCount}</div>
          <div className="text-[10px] text-slate-400">confirmados</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] text-rose-600 font-bold uppercase">Falhas / Erros</div>
          <div className="text-xl font-black text-rose-700 mt-1">{kpis.errorCount}</div>
          <div className="text-[10px] text-slate-400">requer atenção</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] text-purple-600 font-bold uppercase">Retentativas</div>
          <div className="text-xl font-black text-purple-700 mt-1">{kpis.retryCount}</div>
          <div className="text-[10px] text-slate-400">política de retry</div>
        </Card>

        <Card className="bg-white border-slate-200 p-3 shadow-xs">
          <div className="text-[10px] text-blue-600 font-bold uppercase">Tempo Médio</div>
          <div className="text-xl font-black text-[#004C97] mt-1">
            {kpis.avgProcessingTimeMs} ms
          </div>
          <div className="text-[10px] text-slate-400">latência fim a fim</div>
        </Card>
      </div>

      {/* Tabela de Eventos com Filtros */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Trilha de Execução de Eventos Ponta a Ponta
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Clique em qualquer registro para abrir a auditoria completa de horários e payloads.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Buscar event_id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50"
              />
            </div>

            <Select value={destFilter} onValueChange={setDestFilter}>
              <SelectTrigger className="h-8 w-28 text-xs bg-slate-50">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent className="bg-white text-xs">
                <SelectItem value="ALL">Destinos (Todos)</SelectItem>
                <SelectItem value="MES">MES</SelectItem>
                <SelectItem value="CRM">CRM</SelectItem>
                <SelectItem value="TMS">TMS</SelectItem>
                <SelectItem value="SAP">SAP</SelectItem>
                <SelectItem value="WMS">WMS</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-32 text-xs bg-slate-50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white text-xs">
                <SelectItem value="ALL">Status (Todos)</SelectItem>
                <SelectItem value="PROCESSADO">PROCESSADO</SelectItem>
                <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                <SelectItem value="ERRO">ERRO</SelectItem>
                <SelectItem value="INTERVENCAO_NECESSARIA">INTERVENÇÃO</SelectItem>
                <SelectItem value="NAO_APLICAVEL">NÃO APLICÁVEL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="text-[11px] font-bold text-slate-600">
                  <TableHead className="w-56">EVENT_ID ÚNICO</TableHead>
                  <TableHead>ORIGEM</TableHead>
                  <TableHead>DESTINO</TableHead>
                  <TableHead>TIPO DO EVENTO</TableHead>
                  <TableHead>VERSÃO</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>TENTATIVAS</TableHead>
                  <TableHead>DATA / HORA</TableHead>
                  <TableHead className="text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y divide-slate-100">
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                      Nenhum evento registrado com os filtros ativos. Publique uma nova versão da
                      programação para disparar o ciclo.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((evt) => (
                    <TableRow
                      key={evt.id || evt.event_id + evt.destino}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedEvent(evt)
                        setIsDetailModalOpen(true)
                      }}
                    >
                      <TableCell className="font-mono font-bold text-[#004C97] text-[11px]">
                        {evt.event_id}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-700">{evt.origem}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-bold text-[10px] bg-slate-100 text-slate-800"
                        >
                          {evt.destino}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium text-[11px]">
                        {evt.tipo_evento}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] border-blue-300 text-blue-700"
                        >
                          {evt.versao}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(evt.status)}</TableCell>
                      <TableCell className="font-mono text-slate-600">
                        {evt.tentativas} / {evt.max_tentativas || 3}
                      </TableCell>
                      <TableCell className="text-slate-500 text-[11px] font-mono">
                        {evt.criado_em ? new Date(evt.criado_em).toLocaleString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {(evt.status === 'ERRO' || evt.status === 'INTERVENCAO_NECESSARIA') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(evt)}
                              disabled={retryingId === evt.event_id}
                              className="h-6 text-[10px] px-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold gap-1"
                            >
                              <RotateCw
                                className={`w-3 h-3 ${retryingId === evt.event_id ? 'animate-spin' : ''}`}
                              />
                              Retentar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(evt)
                              setIsDetailModalOpen(true)
                            }}
                            className="h-6 text-[10px] px-2 text-[#004C97] hover:bg-blue-50"
                          >
                            <Eye className="w-3 h-3 mr-1" /> Detalhes
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Drill-down do Evento */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
              <Activity className="w-5 h-5 text-[#004C97]" />
              Drill-down do Evento: {selectedEvent?.event_id}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreamento detalhado da propagação, payload, carimbos de tempo e confirmação de
              retorno.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Destino
                  </span>
                  <span className="font-bold text-slate-900 text-sm">{selectedEvent.destino}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Versão
                  </span>
                  <span className="font-bold text-blue-700 text-sm">{selectedEvent.versao}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Status Atual
                  </span>
                  <div className="mt-0.5">{getStatusBadge(selectedEvent.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Tentativas
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedEvent.tentativas} / {selectedEvent.max_tentativas || 3}
                  </span>
                </div>
              </div>

              {/* Ciclo de Vida / Timestamps */}
              <div className="bg-slate-900 text-slate-100 p-3 rounded-lg space-y-1.5 font-mono text-[11px]">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Trilha de Carimbos de Tempo (Ciclo Ponta a Ponta)
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">1. Criado em (PCP):</span>
                  <span>{selectedEvent.criado_em || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">2. Enviado em (Transmissão):</span>
                  <span>{selectedEvent.enviado_em || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">3. Recebido em (Destino):</span>
                  <span>{selectedEvent.recebido_em || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1">
                  <span className="text-slate-400">4. Processado em:</span>
                  <span>{selectedEvent.processado_em || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">5. Retorno Confirmado em:</span>
                  <span className="text-emerald-400 font-bold">
                    {selectedEvent.retorno_em || '—'}
                  </span>
                </div>
              </div>

              {/* Mensagem de Erro se houver */}
              {selectedEvent.mensagem_erro && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Diagnóstico de Falha / Intervenção
                  </div>
                  <p className="text-[11px] font-mono leading-relaxed">
                    {selectedEvent.mensagem_erro}
                  </p>
                </div>
              )}

              {/* Payloads */}
              <div className="space-y-2">
                <span className="font-bold text-xs text-slate-700">
                  Payload Transmitido (Contrato de Integração)
                </span>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-800 max-h-40 overflow-y-auto">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>

              {selectedEvent.retorno_payload && (
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-700">
                    Payload de Retorno do Destino
                  </span>
                  <pre className="p-3 bg-emerald-50/50 border border-emerald-200 rounded text-[10px] font-mono text-emerald-950 max-h-32 overflow-y-auto">
                    {JSON.stringify(selectedEvent.retorno_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedEvent &&
              (selectedEvent.status === 'ERRO' ||
                selectedEvent.status === 'INTERVENCAO_NECESSARIA') && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRetry(selectedEvent)}
                  disabled={retryingId === selectedEvent.event_id}
                  className="text-xs font-bold gap-1.5"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${retryingId === selectedEvent.event_id ? 'animate-spin' : ''}`}
                  />
                  Executar Retentativa
                </Button>
              )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Reconciliação Periódica */}
      <Dialog open={isReconcileModalOpen} onOpenChange={setIsReconcileModalOpen}>
        <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-slate-900">
              <RotateCw className="w-5 h-5 text-[#004C97]" />
              Resultado da Reconciliação Periódica de Versões
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Comparação automática entre a versão vigente do PCP e o estado registrado em MES, CRM
              e SAP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {reconcileResults?.map((res, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
                  res.hasDivergence
                    ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                    : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase">{res.system}</span>
                    <Badge
                      variant="outline"
                      className={
                        res.hasDivergence
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]'
                      }
                    >
                      {res.hasDivergence ? '🔴 DIVERGÊNCIA' : '🟢 SINCRONIZADO'}
                    </Badge>
                  </div>
                  <p className="text-[11px] mt-1">{res.divergenceDetails}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-500 font-mono block">Ação sugerida:</span>
                  <span className="font-semibold text-xs text-slate-800">
                    {res.suggestedAction}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setIsReconcileModalOpen(false)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Concluir Reconciliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PCPIntegrationMonitorPage
