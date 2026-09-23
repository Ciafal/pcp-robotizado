import React, { useState } from 'react'
import {
  History,
  Shield,
  Search,
  Filter,
  User,
  Clock,
  ArrowRight,
  Database,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SapValidationAuditLog } from '@/types/sap-validation'

interface HistoricoAuditoriaTabProps {
  logs: SapValidationAuditLog[]
  onRefreshLogs?: () => void
}

export const HistoricoAuditoriaTab: React.FC<HistoricoAuditoriaTabProps> = ({
  logs,
  onRefreshLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.validation_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter
    return matchesSearch && matchesAction
  })

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'APROVACAO':
      case 'CONCLUSAO':
        return 'bg-emerald-600 text-white'
      case 'DETECCAO_DIVERGENCIA':
        return 'bg-red-600 text-white'
      case 'ADVERTENCIA_MODELO':
        return 'bg-amber-500 text-white'
      case 'RECONSULTA_SAP':
      case 'CONSULTA_SAP':
        return 'bg-blue-600 text-white'
      case 'CRIACAO_REVISAO':
        return 'bg-purple-600 text-white'
      case 'CONSULTA_CAMPO_NEUTRO':
        return 'bg-slate-100 text-slate-700 border border-slate-300'
      default:
        return 'bg-slate-600 text-white'
    }
  }

  return (
    <div className="space-y-4">
      {/* Alerta de Imutabilidade da Auditoria */}
      <Card className="border-slate-200 bg-slate-50/50 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#004C97] shrink-0" />
            <div>
              <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                Trilha de Auditoria e Governança Imutável
                <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px]">
                  Bloqueio de Edição/Exclusão Ativo
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Todos os eventos de validação, consultas SAP, advertências de modelos,
                justificativas e aprovações são gravados sem possibilidade de alteração ou exclusão.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onRefreshLogs}
            className="border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
          >
            Atualizar Trilha
          </Button>
        </CardContent>
      </Card>

      {/* Busca e Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Filtrar por código, usuário ou ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs bg-white border-slate-300"
          />
        </div>

        <Badge variant="outline" className="bg-white text-slate-700">
          Total de Registros: {filteredLogs.length}
        </Badge>
      </div>

      {/* Tabela de Logs */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4">
          <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-[#004C97]" />
            Logs Cronológicos de Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 text-[11px] text-slate-600">
              <TableRow>
                <TableHead>Data / Hora</TableHead>
                <TableHead>Ação Executada</TableHead>
                <TableHead>Validação / Rev.</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Origem SAP</TableHead>
                <TableHead>Justificativa / Detalhe</TableHead>
                <TableHead>Status (De → Para)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                    Nenhum log de auditoria registrado até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {log.validation_code || '—'}{' '}
                      {log.revision_number ? `(R${log.revision_number})` : ''}
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      {log.material_code || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-800">{log.user_name || 'Sistema'}</div>
                      <div className="text-[10px] text-slate-400">{log.user_email || '—'}</div>
                    </TableCell>
                    <TableCell className="text-slate-600 text-[11px]">
                      {log.sap_source || 'FCA SAP'}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-slate-600">
                      {log.justification || log.rule_result || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-[11px]">
                      {log.action === 'CONSULTA_CAMPO_NEUTRO' ? (
                        <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px]">
                          NEUTRO
                        </Badge>
                      ) : log.previous_status || log.new_status ? (
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-slate-400">{log.previous_status || '—'}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                          <span className="font-bold text-slate-800">{log.new_status || '—'}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
