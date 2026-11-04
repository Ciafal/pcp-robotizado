import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  tarugoPlansService,
  type TarugoPlanRecord,
  type TarugoPlanHistoryEntry,
} from '@/services/tarugo-plans-service'

export interface TarugoPlanHistoryModalProps {
  plan: TarugoPlanRecord | null
  onClose: () => void
}

export function TarugoPlanHistoryModal({ plan, onClose }: TarugoPlanHistoryModalProps) {
  const [logs, setLogs] = useState<TarugoPlanHistoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!plan) return
    setLoading(true)
    tarugoPlansService
      .listHistory(plan.id)
      .then((data) => setLogs(data))
      .catch((err) => {
        console.error('[TarugoPlanHistoryModal] Erro ao carregar histórico:', err)
        setLogs([])
      })
      .finally(() => setLoading(false))
  }, [plan])

  const formatDateTime = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  const badgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'PLANO_CRIADO':
        return 'default'
      case 'PLANO_EDITADO':
        return 'secondary'
      case 'PLANO_DUPLICADO':
        return 'outline'
      case 'PLANO_ATIVADO':
        return 'default'
      case 'PLANO_INATIVADO':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Histórico de Auditoria</span>
            {plan && <Badge variant="outline">{plan.cutting_plan}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {plan && (
              <span>
                {plan.company} · {plan.center} · {plan.line} · Histórico completo e imutável de
                alterações do plano de tarugos.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden py-2">
          {plan?.derived_from_plan && (
            <div className="mb-3 rounded-md bg-blue-50 border border-blue-200 p-2.5 text-xs text-blue-900">
              <span className="font-semibold">Plano derivado:</span> Criado a partir do plano{' '}
              <span className="font-mono font-bold">{plan.derived_from_plan}</span>.
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Carregando histórico de auditoria...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum registro de auditoria encontrado para este plano.
            </div>
          ) : (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-3 bg-white shadow-xs text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={badgeVariant(log.event_type)}>
                          {log.event_label || log.event_type}
                        </Badge>
                        <span className="font-medium text-slate-700">
                          {log.user_name || log.user_email || 'Sistema / Usuário'}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono">
                        {formatDateTime(log.event_timestamp)}
                      </span>
                    </div>

                    {log.details && (
                      <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
