import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Settings,
  ShieldCheck,
  Zap,
  Radio,
  FileCode,
  ArrowRight,
  Database,
} from 'lucide-react'
import {
  ConnectorConfig,
  ConnectorInterfaceType,
  IntegrationEnvironment,
} from '@/types/pcp-integration'
import { integrationEventService } from '@/services/pcp-integration-service'
import { toast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const PCPIntegrationsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [testingCode, setTestingCode] = useState<string | null>(null)
  const [activeEnv, setActiveEnv] = useState<IntegrationEnvironment>(
    integrationEventService.getActiveEnvironment(),
  )
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const canManage = can('pcp.integrations.manage') || user?.role === 'PCP_ADMIN'

  const loadConnectors = async () => {
    setLoading(true)
    try {
      const data = await integrationEventService.listConnectors(activeEnv)
      setConnectors(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConnectors()
    const handleEnvChanged = (e: any) => {
      if (e.detail?.env) {
        setActiveEnv(e.detail.env)
      }
    }
    window.addEventListener('ciafal_environment_changed', handleEnvChanged)
    return () => {
      window.removeEventListener('ciafal_environment_changed', handleEnvChanged)
    }
  }, [activeEnv])

  const handleTestConnection = async (systemCode: string) => {
    setTestingCode(systemCode)
    try {
      const res = await integrationEventService.testConnectorConnection(systemCode)
      toast({
        title: `Conexão validada: ${systemCode}`,
        description: res.message,
      })
      await loadConnectors()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: `Falha no teste: ${systemCode}`,
        description: err.message || 'Não foi possível estabelecer contato com o conector.',
      })
    } finally {
      setTestingCode(null)
    }
  }

  const handleOpenEdit = (connector: ConnectorConfig) => {
    if (!canManage) {
      toast({
        variant: 'destructive',
        title: 'Acesso Restrito',
        description: 'Apenas Administradores do PCP possuem permissão para configurar conectores.',
      })
      return
    }
    setSelectedConnector({ ...connector })
    setIsEditModalOpen(true)
  }

  const handleSaveConfig = async () => {
    if (!selectedConnector) return
    setSaving(true)
    try {
      await integrationEventService.saveConnectorConfig(selectedConnector)
      toast({
        title: 'Conector atualizado',
        description: `As configurações de ${selectedConnector.system_name} foram salvas com sucesso.`,
      })
      setIsEditModalOpen(false)
      await loadConnectors()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao gravar parâmetros do conector.',
      })
    } finally {
      setSaving(false)
    }
  }

  const getInterfaceBadge = (type: ConnectorInterfaceType) => {
    switch (type) {
      case 'POSTGRESQL_BRIDGE':
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-200 gap-1 font-mono text-[10px]"
          >
            <Database className="w-3 h-3" /> PostgreSQL Bridge
          </Badge>
        )
      case 'EVENT_BUS_WEBHOOK':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-mono text-[10px]"
          >
            <Radio className="w-3 h-3" /> Event Bus / Webhook
          </Badge>
        )
      case 'REST_API':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 gap-1 font-mono text-[10px]"
          >
            <Zap className="w-3 h-3" /> API REST
          </Badge>
        )
      case 'RFC_BAPI':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-200 gap-1 font-mono text-[10px]"
          >
            <FileCode className="w-3 h-3" /> SAP RFC / BAPI
          </Badge>
        )
      case 'IDOC_FILE':
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-300 gap-1 font-mono text-[10px]"
          >
            IDoc / Mensageria
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#004C97]" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              CONECTORES & INTEGRAÇÕES PCP CIAFAL
            </h1>
            <Badge className="bg-blue-100 text-[#004C97] hover:bg-blue-200 font-bold ml-2">
              Arquitetura Multi-Conector
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão operacional dos canais de propagação de programação e retorno de status (SAP ECC,
            MES, CRM 360º, TMS, WMS).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/pcp/integracoes/monitor')}
            className="border-[#004C97] text-[#004C97] hover:bg-blue-50 text-xs font-semibold gap-2"
          >
            <Activity className="w-4 h-4" /> Monitor de Eventos Ponta a Ponta
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            onClick={loadConnectors}
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid de Conectores Reais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {connectors.map((conn) => {
          const isConnected = conn.status === 'CONECTADO'
          const isTesting = testingCode === conn.system_code

          return (
            <Card
              key={conn.system_code}
              className="bg-white border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{conn.system_code}</h3>
                      <Badge
                        variant="outline"
                        className={
                          isConnected
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold text-[10px]'
                            : 'bg-rose-50 text-rose-700 border-rose-300 font-bold text-[10px]'
                        }
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            isConnected ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                        {conn.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{conn.system_name}</p>
                  </div>
                  {getInterfaceBadge(conn.interface_type)}
                </div>
              </CardHeader>

              <CardContent className="py-4 space-y-3 text-xs flex-1">
                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 bg-slate-50 p-2 rounded border border-slate-100">
                  {conn.description}
                </p>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400">Endpoint / Destino:</span>
                    <span
                      className="font-mono text-slate-800 text-[11px] max-w-[180px] truncate"
                      title={conn.endpoint}
                    >
                      {conn.endpoint}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400">Método / Interface:</span>
                    <span className="font-mono text-slate-800 text-[11px]">{conn.method}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400">Latência Média:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {conn.latency_ms} ms
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400">Fila Pendente:</span>
                    <Badge variant="secondary" className="font-mono text-[11px] h-5 px-1.5">
                      {conn.pending_queue_count} msgs
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400">Total de Erros:</span>
                    <span
                      className={`font-semibold font-mono ${
                        conn.errors_count > 0 ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {conn.errors_count}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-0.5 font-mono">
                  <div>
                    Última Comunicação:{' '}
                    {conn.last_communication_at
                      ? new Date(conn.last_communication_at).toLocaleTimeString('pt-BR')
                      : '—'}
                  </div>
                  <div>
                    Último Sucesso:{' '}
                    {conn.last_success_at
                      ? new Date(conn.last_success_at).toLocaleTimeString('pt-BR')
                      : '—'}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-4 px-6 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestConnection(conn.system_code)}
                  disabled={isTesting}
                  className="w-1/2 text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(conn)}
                  className="w-1/2 text-xs h-8 text-[#004C97] hover:bg-blue-50"
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" /> Configurar
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Modal de Configuração do Conector */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Settings className="w-5 h-5 text-[#004C97]" />
              Parâmetros do Conector: {selectedConnector?.system_code}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Edição administrativa das definições de protocolo, interface e política de
              retentativa.
            </DialogDescription>
          </DialogHeader>

          {selectedConnector && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Nome do Sistema</Label>
                <Input
                  value={selectedConnector.system_name}
                  onChange={(e) =>
                    setSelectedConnector({ ...selectedConnector, system_name: e.target.value })
                  }
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Interface</Label>
                  <Select
                    value={selectedConnector.interface_type}
                    onValueChange={(val: any) =>
                      setSelectedConnector({ ...selectedConnector, interface_type: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-xs">
                      <SelectItem value="REST_API">REST API</SelectItem>
                      <SelectItem value="POSTGRESQL_BRIDGE">PostgreSQL Bridge (SAP)</SelectItem>
                      <SelectItem value="EVENT_BUS_WEBHOOK">Event Bus / Webhook</SelectItem>
                      <SelectItem value="RFC_BAPI">SAP RFC / BAPI</SelectItem>
                      <SelectItem value="IDOC_FILE">IDoc File</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Status Operacional</Label>
                  <Select
                    value={selectedConnector.status}
                    onValueChange={(val: any) =>
                      setSelectedConnector({ ...selectedConnector, status: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white text-xs">
                      <SelectItem value="CONECTADO">CONECTADO</SelectItem>
                      <SelectItem value="DESCONECTADO">DESCONECTADO</SelectItem>
                      <SelectItem value="DEGRADADO">DEGRADADO</SelectItem>
                      <SelectItem value="EM_TESTE">EM_TESTE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Endpoint / URL / String de Conexão
                </Label>
                <Input
                  value={selectedConnector.endpoint}
                  onChange={(e) =>
                    setSelectedConnector({ ...selectedConnector, endpoint: e.target.value })
                  }
                  className="h-8 text-xs font-mono bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Método de Comunicação
                </Label>
                <Input
                  value={selectedConnector.method}
                  onChange={(e) =>
                    setSelectedConnector({ ...selectedConnector, method: e.target.value })
                  }
                  className="h-8 text-xs font-mono bg-slate-50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Descrição / Finalidade
                </Label>
                <Input
                  value={selectedConnector.description}
                  onChange={(e) =>
                    setSelectedConnector({ ...selectedConnector, description: e.target.value })
                  }
                  className="h-8 text-xs bg-slate-50"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Segurança & Conformidade CIAFAL
                </div>
                <div>
                  Credenciais NUNCA expostas no frontend ou logs. Registrado para:{' '}
                  {user?.email || 'Administrador'}.
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar Conector'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PCPIntegrationsPage
