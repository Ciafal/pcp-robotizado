import React, { useState } from 'react'
import {
  Activity,
  Server,
  Layers,
  Cpu,
  Bell,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdapterHealthInfo, TechnicalIntegrationLog } from '@/types/pcp-integration-contracts'
import {
  PcpAdapter,
  SapAdapter,
  WmsAdapter,
  MesAdapter,
  NotificationAdapter,
  TechnicalIntegrationLogger,
} from '@/services/pcp-adapters-service'
import { useToast } from '@/hooks/use-toast'

interface IntegrationGovernancePanelProps {
  onStateChange?: () => void
}

export const IntegrationGovernancePanel: React.FC<IntegrationGovernancePanelProps> = ({
  onStateChange,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'adapters' | 'logs' | 'contracts'>('adapters')
  const [testingAdapter, setTestingAdapter] = useState<string | null>(null)
  const [logs, setLogs] = useState<TechnicalIntegrationLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false)

  // Estados dos adaptadores
  const pcpHealth = PcpAdapter.getHealth()
  const sapHealth = SapAdapter.getHealth()
  const wmsHealth = WmsAdapter.getHealth()
  const mesHealth = MesAdapter.getHealth()
  const notifHealth = NotificationAdapter.getHealth()

  const allAdapters: AdapterHealthInfo[] = [pcpHealth, sapHealth, wmsHealth, mesHealth, notifHealth]

  const handleTestSap = async () => {
    setTestingAdapter('SAP')
    try {
      const res = await SapAdapter.testConnection()
      toast({
        title: res.success ? 'SAP Conectado' : 'Falha no SAP',
        description: res.message,
        variant: res.success ? 'default' : 'destructive',
      })
      onStateChange?.()
    } finally {
      setTestingAdapter(null)
    }
  }

  const handleToggleSapSimulatedOutage = () => {
    const current = SapAdapter.isForcedUnavailable()
    SapAdapter.setForcedUnavailable(!current)
    toast({
      title: !current ? 'Simulação: SAP Marcado como Indisponível' : 'SAP Restaurado',
      description: !current
        ? 'A tela do DP07 exibirá o status individual dos campos SAP com snapshot anterior identificado.'
        : 'Sincronização em tempo real restabelecida com sucesso.',
    })
    onStateChange?.()
  }

  const handleToggleWmsSimulatedOutage = () => {
    const current = WmsAdapter.isForcedUnavailable()
    WmsAdapter.setForcedUnavailable(!current)
    toast({
      title: !current ? 'Simulação: WMS Marcado como Indisponível' : 'WMS Restaurado',
      description: !current
        ? 'A tela do DP07 exibirá localização WMS indisponível com pendência registrada.'
        : 'Localização em tempo real restabelecida.',
    })
    onStateChange?.()
  }

  const handleTestWms = async () => {
    setTestingAdapter('WMS')
    try {
      const res = await WmsAdapter.testConnection()
      toast({
        title: res.success ? 'WMS Conectado' : 'Falha no WMS',
        description: res.message,
        variant: res.success ? 'default' : 'destructive',
      })
      onStateChange?.()
    } finally {
      setTestingAdapter(null)
    }
  }

  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      const recent = await TechnicalIntegrationLogger.listRecentLogs(40)
      setLogs(recent)
    } finally {
      setLoadingLogs(false)
    }
  }

  const getStatusBadge = (status: AdapterHealthInfo['status']) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 font-bold text-[10px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Conectado
          </Badge>
        )
      case 'UNAVAILABLE':
      case 'TIMEOUT':
        return (
          <Badge className="bg-rose-500/15 text-rose-700 border-rose-300 font-bold text-[10px] flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            Indisponível
          </Badge>
        )
      case 'DEGRADED':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 font-bold text-[10px] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Degradado
          </Badge>
        )
      default:
        return <Badge className="bg-slate-100 text-slate-700 text-[10px]">{status}</Badge>
    }
  }

  const getAdapterIcon = (id: string) => {
    switch (id) {
      case 'PCP':
        return <Activity className="w-4 h-4 text-[#004C97]" />
      case 'SAP':
        return <Server className="w-4 h-4 text-blue-600" />
      case 'WMS':
        return <Layers className="w-4 h-4 text-emerald-600" />
      case 'MES':
        return <Cpu className="w-4 h-4 text-purple-600" />
      case 'NOTIFICATION':
        return <Bell className="w-4 h-4 text-amber-600" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  return (
    <Card className="border border-slate-200 shadow-xs bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2 tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" />
              Integrações & Governança — Camada de Adaptadores
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Arquitetura desacoplada: a tela não chama SAP/WMS diretamente. Ausência de conector
              não paralisa a operação do DP07.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleSapSimulatedOutage}
              className={`h-7 text-xs font-bold ${
                SapAdapter.isForcedUnavailable()
                  ? 'border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Testar resiliência simulando indisponibilidade do SAP"
            >
              {SapAdapter.isForcedUnavailable() ? 'Reativar SAP' : 'Simular Queda SAP'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleWmsSimulatedOutage}
              className={`h-7 text-xs font-bold ${
                WmsAdapter.isForcedUnavailable()
                  ? 'border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Testar resiliência simulando indisponibilidade do WMS"
            >
              {WmsAdapter.isForcedUnavailable() ? 'Reativar WMS' : 'Simular Queda WMS'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any)
            if (v === 'logs') loadLogs()
          }}
        >
          <TabsList className="grid grid-cols-3 w-full sm:w-[420px] mb-3 h-8">
            <TabsTrigger value="adapters" className="text-xs font-bold">
              Adaptadores ({allAdapters.length})
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs font-bold">
              Logs Técnicos
            </TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs font-bold">
              Contratos Oficiais
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: STATUS DOS ADAPTADORES */}
          <TabsContent value="adapters" className="space-y-2 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {allAdapters.map((ad) => (
                <div
                  key={ad.adapter_id}
                  className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {getAdapterIcon(ad.adapter_id)}
                        <span className="font-bold text-xs text-slate-900">{ad.adapter_name}</span>
                      </div>
                      {getStatusBadge(ad.status)}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{ad.description}</p>
                    <div className="font-mono text-[10px] text-slate-400 truncate bg-slate-100 px-1.5 py-0.5 rounded">
                      {ad.endpoint}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {ad.last_sync_at
                        ? new Date(ad.last_sync_at).toLocaleTimeString('pt-BR')
                        : 'Nunca'}
                    </span>
                    <span className="font-mono">Latência: {ad.latency_ms}ms</span>
                    {ad.adapter_id === 'SAP' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleTestSap}
                        disabled={testingAdapter === 'SAP'}
                        className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-bold"
                      >
                        <RefreshCw
                          className={`w-2.5 h-2.5 mr-1 ${testingAdapter === 'SAP' ? 'animate-spin' : ''}`}
                        />
                        Testar
                      </Button>
                    )}
                    {ad.adapter_id === 'WMS' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleTestWms}
                        disabled={testingAdapter === 'WMS'}
                        className="h-6 px-1.5 text-[10px] text-emerald-700 hover:bg-emerald-50 font-bold"
                      >
                        <RefreshCw
                          className={`w-2.5 h-2.5 mr-1 ${testingAdapter === 'WMS' ? 'animate-spin' : ''}`}
                        />
                        Testar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 2: LOGS TÉCNICOS DE INTEGRAÇÃO (SEPARADOS DO LOG FUNCIONAL) */}
          <TabsContent value="logs" className="space-y-2 mt-0">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs text-slate-500">
                Registros técnicos de chamadas, timeouts, falhas e tempos de resposta (isolado do
                DP07).
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={loadLogs}
                disabled={loadingLogs}
                className="h-6 px-2 text-[10px]"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loadingLogs ? 'animate-spin' : ''}`} />
                Atualizar Logs
              </Button>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[320px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2">Hora</th>
                    <th className="p-2">Origem</th>
                    <th className="p-2">Operação</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Latência</th>
                    <th className="p-2">Mensagem Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 font-sans text-xs">
                        Nenhum registro de log técnico capturado recentemente.
                      </td>
                    </tr>
                  ) : (
                    logs.map((lg, i) => (
                      <tr key={lg.id || i} className="hover:bg-slate-50">
                        <td className="p-2 text-slate-500">
                          {new Date(lg.timestamp).toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="p-2 font-bold text-slate-800">{lg.origin_system}</td>
                        <td className="p-2 text-slate-700">{lg.operation}</td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              lg.status === 'SUCCESS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : lg.status === 'UNAVAILABLE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {lg.status}
                          </span>
                        </td>
                        <td className="p-2 text-right text-slate-600">{lg.response_time_ms}ms</td>
                        <td className="p-2 font-sans text-xs text-slate-600 truncate max-w-[320px]">
                          {lg.technical_message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 3: CONTRATOS DE DADOS OFICIAIS */}
          <TabsContent value="contracts" className="space-y-3 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 uppercase">Contrato SAP RFC</span>
                  <Badge className="bg-blue-100 text-[#004C97] font-mono text-[9px]">
                    SapMaterialStockContract
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Campos estritos acordados com a equipe SAP:
                </p>
                <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[10.5px] text-slate-700 space-y-1">
                  <div>• center (string): Centro industrial (ex: FORNOL1)</div>
                  <div>• production_order (string): Ordem de Produção</div>
                  <div>• raw_material_code (string): Código Matéria-Prima</div>
                  <div>• raw_material_description (string): Descrição SAP</div>
                  <div>• heat_number (string): Lote / Corrida</div>
                  <div>• storage_location (string): Depósito (DP07)</div>
                  <div>• stock_tons (number): Estoque físico em t</div>
                  <div>• pieces_count (number): Quantidade em peças</div>
                  <div>• sap_status (LIBERADO | BLOQUEADO | INSPECAO)</div>
                  <div>• is_blocked (boolean): Bloqueio de qualidade</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 uppercase">Contrato WMS REST API</span>
                  <Badge className="bg-emerald-100 text-emerald-800 font-mono text-[9px]">
                    WmsMaterialLocationContract
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Campos estritos acordados com a Logística & Pátio:
                </p>
                <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-[10.5px] text-slate-700 space-y-1">
                  <div>• raw_material_code (string): Material no pátio</div>
                  <div>• heat_number (string): Corrida / Lote</div>
                  <div>• warehouse (string): Galpão físico</div>
                  <div>• wm_address (string): Endereço WM / Box / Rua</div>
                  <div>• quantity_pieces (number): Peças no endereço</div>
                  <div>• physical_situation (DISPONIVEL | AVARIADO | MOVIMENTANDO)</div>
                  <div>• is_blocked (boolean): Bloqueio no pátio</div>
                  <div>• is_reserved (boolean): Reserva ativa para outra OP</div>
                  <div>• last_movement_at (string): Timestamp movimentação</div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
