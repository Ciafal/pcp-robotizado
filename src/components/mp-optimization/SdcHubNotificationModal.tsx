import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Bell, Send, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { MPSdcSteelMatrixRow } from '@/types/mp-optimization'
import { formatTonsSdc } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'
import { authorizedHubUsers } from './SdcSendEmailModal'

interface SdcHubNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  selectedRows: MPSdcSteelMatrixRow[]
  activeFilters: {
    startDate?: string
    endDate?: string
    steel?: string
    material?: string
  }
}

export const SdcHubNotificationModal: React.FC<SdcHubNotificationModalProps> = ({
  isOpen,
  onClose,
  selectedRows,
  activeFilters,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([
    'carlos.pcp@ciafal.com.br',
    'mariana.l2@ciafal.com.br',
  ])
  const [title, setTitle] = useState('PCP — Matéria-prima Sidercentro')
  const [isSending, setIsSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const generateInitialMessage = (): string => {
    const periodStr =
      activeFilters.startDate || activeFilters.endDate
        ? `Período: ${activeFilters.startDate || 'Início'} até ${activeFilters.endDate || 'Fim'}\n`
        : ''

    const lines = selectedRows.map((r, i) => {
      return `• [${r.steel_grade}] Saldo: ${formatTonsSdc(r.projected_balance_tons)} | L2: ${formatTonsSdc(r.projected_l2_useful_tons, { includeSign: true })} | Status: ${r.auto_conclusion || r.rupture_risk_level || 'ADEQUADO'}`
    })

    return `Alerta operacional PCP Sidercentro:\n${periodStr}${selectedRows.length} item(ns) selecionado(s):\n${lines.join('\n')}\n\nAcesse a tela oficial para simulação de cenários e ações de produção L2.`
  }

  const [message, setMessage] = useState('')

  React.useEffect(() => {
    if (isOpen) {
      setMessage(generateInitialMessage())
      setSuccessMessage(null)
      setErrorMessage(null)
    }
  }, [isOpen, selectedRows])

  const toggleUser = (email: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(email) ? prev.filter((id) => id !== email) : [...prev, email],
    )
  }

  const handleSend = async () => {
    if (selectedUserIds.length === 0) {
      setErrorMessage('Selecione pelo menos um destinatário para a notificação HUB.')
      return
    }
    if (!message.trim()) {
      setErrorMessage('A mensagem não pode estar vazia.')
      return
    }

    setIsSending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const payloadRecords = selectedRows.map((r) => ({
      id: r.id || r.steel_grade,
      steel_grade: r.steel_grade,
      steel_class: r.steel_class,
      code: r.material_code || r.steel_grade,
      total_stock_tons: r.total_stock_tons,
      total_stock_tons_fmt: formatTonsSdc(r.total_stock_tons),
      projected_l2_useful_tons: r.projected_l2_useful_tons,
      projected_balance_tons: r.projected_balance_tons,
      projected_balance_tons_fmt: formatTonsSdc(r.projected_balance_tons),
      statistical_coverage_days: r.statistical_coverage_days,
      rupture_risk_level: r.rupture_risk_level,
    }))

    try {
      const response = await pb.send('/backend/v1/mp-sidercentro/send-hub-notification', {
        method: 'POST',
        body: {
          recipients: selectedUserIds,
          title,
          message,
          selectedRecords: payloadRecords,
          filters: activeFilters,
        },
      })

      const count = response?.recipients_count ?? selectedUserIds.length
      setSuccessMessage(`Notificação HUB enviada com sucesso para ${count} usuário(s).`)
    } catch (err: any) {
      const readableError =
        err?.response?.error ||
        err?.message ||
        'Não foi possível registrar a notificação HUB. Tente novamente.'
      setErrorMessage(readableError)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSending && !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white p-5 rounded-xl border border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Notificação HUB — Matéria-prima Sidercentro
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Comunicação interna persistida no banco + deep-link para a tela de MP
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-200 text-xs"
            >
              {selectedRows.length} selecionado(s)
            </Badge>
          </div>
        </DialogHeader>

        {/* Sucesso */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 text-xs text-emerald-900 hover:bg-emerald-100 font-bold"
            >
              Fechar
            </Button>
          </div>
        )}

        {/* Erro */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          {/* Destinatários */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Destinatário(s) ou Grupos do HUB:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {selectedUserIds.length} selecionado(s)
              </span>
            </label>
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-32 overflow-y-auto space-y-1">
              {authorizedHubUsers.map((u) => {
                const isChecked = selectedUserIds.includes(u.email)
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                      isChecked ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUser(u.email)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">{u.email}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Título da Notificação:</label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs bg-white border-slate-300 font-semibold"
            />
          </div>

          {/* Resumo de Dados Selecionados */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Registros em Análise:</label>
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-20 overflow-y-auto flex flex-wrap gap-1">
              {selectedRows.map((r, i) => (
                <Badge
                  key={r.id || r.steel_grade || i}
                  variant="outline"
                  className="bg-white text-slate-700 border-slate-200 text-[10px]"
                >
                  {r.steel_grade} &bull; {formatTonsSdc(r.projected_balance_tons)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Mensagem da Notificação:</span>
              <button
                type="button"
                onClick={() => setMessage(generateInitialMessage())}
                className="text-[11px] text-amber-700 hover:underline"
              >
                Restaurar texto padrão
              </button>
            </label>
            <Textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs font-mono bg-white border-slate-300 resize-y"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSending}
            className="text-xs text-slate-600 border-slate-300"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={isSending || selectedUserIds.length === 0}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Registrando...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1" /> Enviar Notificação HUB
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SdcHubNotificationModal
