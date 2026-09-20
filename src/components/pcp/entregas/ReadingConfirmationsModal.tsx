import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Eye,
  Send,
  AlertTriangle,
  RotateCcw,
  UserCheck,
} from 'lucide-react'
import { ReadingConfirmationItem } from '@/services/pcp-monthly-summaries'
import { useToast } from '@/hooks/use-toast'

interface ReadingConfirmationsModalProps {
  isOpen: boolean
  onClose: () => void
  summaryCode: string
  versionTag: string
  confirmations: ReadingConfirmationItem[]
  onConfirmCurrentReading: () => void
  onSendReminder?: (userId: string) => void
}

export const ReadingConfirmationsModal: React.FC<ReadingConfirmationsModalProps> = ({
  isOpen,
  onClose,
  summaryCode,
  versionTag,
  confirmations,
  onConfirmCurrentReading,
  onSendReminder,
}) => {
  const { toast } = useToast()
  const [hasConfirmedLocally, setHasConfirmedLocally] = useState(false)

  const confirmedCount = confirmations.filter((c) => c.status === 'CONFIRMADO').length
  const totalCount = confirmations.length || 1
  const adherence = Math.round((confirmedCount / totalCount) * 100)

  const handleSelfConfirm = () => {
    onConfirmCurrentReading()
    setHasConfirmedLocally(true)
    toast({
      title: 'Leitura Confirmada',
      description: 'Sua ciência e leitura do resumo mensal foram registradas no sistema.',
    })
  }

  const renderStatusBadge = (status: ReadingConfirmationItem['status']) => {
    switch (status) {
      case 'CONFIRMADO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 text-[11px]"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Leitura Confirmada
          </Badge>
        )
      case 'VISUALIZADO':
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-800 border-sky-300 gap-1 text-[11px]"
          >
            <Eye className="w-3 h-3 text-sky-600" />
            Visualizado
          </Badge>
        )
      case 'ENTREGUE':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-800 border-blue-300 gap-1 text-[11px]"
          >
            <Send className="w-3 h-3 text-blue-600" />
            Entregue
          </Badge>
        )
      case 'ENVIADO':
        return (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-700 border-slate-300 gap-1 text-[11px]"
          >
            <Clock className="w-3 h-3 text-slate-500" />
            Enviado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-500 text-[11px]">
            Não Enviado
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[min(92vw,1400px)] max-w-[min(92vw,1400px)] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-[#004C97] text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900">
                  Painel de Confirmação de Leitura
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Resumo: <strong>{summaryCode}</strong> ({versionTag}) &bull; Distinto do fluxo de
                  aprovação
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-bold"
            >
              {confirmedCount} de {totalCount} Leituras ({adherence}%)
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Banner de Ação de Leitura para o Usuário Atual */}
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-sky-700 shrink-0" />
              <div>
                <div className="font-bold text-sky-900">
                  Você já leu este Resumo Mensal de Entregas?
                </div>
                <div className="text-sky-700 text-[11px]">
                  Ao confirmar leitura, seu nome, área, data, hora e versão ({versionTag}) são
                  registrados oficialmente.
                </div>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleSelfConfirm}
              disabled={hasConfirmedLocally}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5 shadow-xs shrink-0 ml-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{hasConfirmedLocally ? 'Leitura Confirmada' : 'Confirmar Minha Leitura'}</span>
            </Button>
          </div>

          {/* Tabela de Destinatários e Status de Leitura */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
              <span>Rastreabilidade Individual por Usuário & Área</span>
              <span className="text-[10px] text-slate-500">Atualizado em tempo real</span>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="py-2 px-3">Usuário</th>
                    <th className="py-2 px-3">Área / Cargo</th>
                    <th className="py-2 px-3 text-center">Status de Leitura</th>
                    <th className="py-2 px-3 text-center">Data / Hora</th>
                    <th className="py-2 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {confirmations.map((c, idx) => (
                    <tr key={c.userId || idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{c.userName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{c.userEmail}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{c.area}</td>
                      <td className="py-2.5 px-3 text-center">{renderStatusBadge(c.status)}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {c.confirmedAt || c.viewedAt || c.sentAt || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {c.status !== 'CONFIRMADO' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onSendReminder?.(c.userId)
                              toast({
                                title: 'Lembrete enviado',
                                description: `Notificação reenviada para ${c.userName}.`,
                              })
                            }}
                            className="h-7 text-[11px] text-[#004C97] hover:bg-sky-50 gap-1 px-2"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reenviar</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ReadingConfirmationsModal
