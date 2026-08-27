import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/pcp-auth'
import { PCPAuditLog } from '@/types/pcp-auth'
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Download,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

export default function AuditPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [logs, setLogs] = useState<PCPAuditLog[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL')
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL')
  const [searchUser, setSearchUser] = useState<string>('')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await authService.listAuditLogs({
        eventType: eventTypeFilter,
        outcome: outcomeFilter,
        userEmail: searchUser,
        perPage: 50,
      })
      setLogs(res.items as any)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar auditoria',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [eventTypeFilter, outcomeFilter])

  // Realtime subscription para novos eventos de auditoria
  useRealtime('pcp_audit_logs', (data) => {
    if (data.action === 'create') {
      setLogs((prev) => [data.record as any, ...prev])
    }
  })

  const handleExportCSV = () => {
    if (logs.length === 0) return
    const headers = [
      'Data/Hora',
      'Usuário',
      'Perfil',
      'Evento',
      'Ação',
      'Recurso',
      'Escopo',
      'Resultado',
    ]
    const rows = logs.map((l) => [
      l.created || '',
      l.user_email || '',
      l.user_role || '',
      l.event_type || '',
      l.action || '',
      l.resource || '',
      l.scope || '',
      l.outcome || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ciafal_audit_security_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Relatório Exportado',
      description: `${logs.length} registros de auditoria baixados em CSV.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-black text-white tracking-tight">
              Trilha de Auditoria e Governança de Segurança
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro imutável de autenticações SSO/AD, checagens de autorização, bloqueios 403 e
            alterações de escopo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-slate-700 bg-slate-900 text-slate-200 hover:text-white text-xs gap-1.5 h-8"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Auditoria (CSV)
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 h-8"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardContent className="p-3 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <Input
              placeholder="Buscar por e-mail do usuário..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              className="pl-8 bg-slate-900 border-slate-800 text-xs h-8 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 px-3 py-1.5 outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Eventos</option>
              <option value="ACCESS_GRANTED">ACCESS_GRANTED (Login SSO/AD)</option>
              <option value="UNAUTHORIZED_ACTION_ATTEMPT">
                UNAUTHORIZED_ACTION_ATTEMPT (Bloqueio 403)
              </option>
              <option value="ROLE_ASSIGNED">ROLE_ASSIGNED</option>
              <option value="SCOPE_ASSIGNED">SCOPE_ASSIGNED</option>
              <option value="PERMISSION_CHANGED">PERMISSION_CHANGED</option>
              <option value="SCHEDULE_ACTION">SCHEDULE_ACTION</option>
            </select>

            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 px-3 py-1.5 outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos os Resultados</option>
              <option value="ALLOW">ALLOW / SUCCESS</option>
              <option value="DENY">DENY / FAILED</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Eventos de Auditoria */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Eventos de Segurança Registrados ({logs.length})
            </CardTitle>
            <span className="text-[11px] text-slate-400">Stream em tempo real ativo</span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Identidade AD</th>
                  <th className="p-3">Perfil</th>
                  <th className="p-3">Tipo de Evento</th>
                  <th className="p-3">Ação Executada</th>
                  <th className="p-3">Recurso / Escopo</th>
                  <th className="p-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Nenhum evento de segurança localizado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isDeny = log.outcome === 'DENY' || log.outcome === 'FAILED'
                    const isAccess = log.event_type === 'ACCESS_GRANTED'

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-900/60 transition-colors ${
                          isDeny ? 'bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="p-3 whitespace-nowrap text-[11px] text-slate-400 font-mono">
                          {new Date(log.created || '').toLocaleString('pt-BR')}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">
                              {log.user_name || log.user_email}
                            </span>
                            <span className="text-[10px] text-slate-400">{log.user_email}</span>
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-slate-700 text-slate-300 bg-slate-900"
                          >
                            {log.user_role || 'SISTEMA'}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <span className="font-mono text-[11px] text-cyan-300">
                            {log.event_type}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-medium text-slate-200">{log.action}</span>
                          {log.permission_required && (
                            <span className="block text-[10px] text-slate-500 font-mono">
                              Req: {log.permission_required}
                            </span>
                          )}
                        </td>

                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-300">{log.resource}</span>
                            {log.scope && (
                              <span className="text-[10px] text-amber-400/90">
                                Escopo: {log.scope}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isDeny
                                ? 'bg-rose-950 text-rose-300 border-rose-600'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                            }`}
                          >
                            {log.outcome}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
