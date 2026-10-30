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
import { Mail, Send, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { MPSdcSteelMatrixRow } from '@/types/mp-optimization'
import { formatTonsSdc } from '@/lib/number-format'
import { pb } from '@/lib/pocketbase/client'

interface SdcSendEmailModalProps {
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

// Lista oficial de usuários autorizados do HUB para comunicação de PCP
export const authorizedHubUsers = [
  { id: 'usr-1', name: 'Carlos Eduardo (PCP Coordenação)', email: 'carlos.pcp@ciafal.com.br' },
  { id: 'usr-2', name: 'Mariana Silva (Planejamento L2)', email: 'mariana.l2@ciafal.com.br' },
  {
    id: 'usr-3',
    name: 'Roberto Mendes (Gerência Sidercentro)',
    email: 'roberto.mendes@sidercentro.com.br',
  },
  {
    id: 'usr-4',
    name: 'Luciano Albuquerque (Operações SDC)',
    email: 'luciano.operacoes@sidercentro.com.br',
  },
  { id: 'usr-5', name: 'PCP Robotizado Homologação', email: 'pcp.automacao@ciafal.com.br' },
]

export const SdcSendEmailModal: React.FC<SdcSendEmailModalProps> = ({
  isOpen,
  onClose,
  selectedRows,
  activeFilters,
}) => {
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    'carlos.pcp@ciafal.com.br',
  ])
  const [subject, setSubject] = useState(
    'PCP | Matéria-prima Sidercentro | Análise de disponibilidade',
  )
  const [isSending, setIsSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Geração automática do corpo inicial com base nos registros SELECIONADOS
  const generateInitialMessage = (): string => {
    const periodStr =
      activeFilters.startDate || activeFilters.endDate
        ? `Período Analisado: ${activeFilters.startDate || 'Início'} até ${activeFilters.endDate || 'Fim'}\n`
        : 'Período: Horizonte Vigente Sidercentro\n'

    const rowsSummary = selectedRows
      .map((r, idx) => {
        const title = `${idx + 1}. Aço: ${r.steel_grade} (${r.steel_class || 'Comercial'})${
          r.material_code ? ` | Material: ${r.material_code} - ${r.material_description || ''}` : ''
        }`
        const st = `   - Estoque Disponível: ${formatTonsSdc(r.total_stock_tons)}`
        const l2 = `   - Produção L2 Útil: ${formatTonsSdc(r.projected_l2_useful_tons, { includeSign: true })}`
        const cns = `   - Consumo Programado SDC: ${formatTonsSdc(-r.projected_consumption_sdc_tons)}`
        const sld = `   - Saldo Projetado: ${formatTonsSdc(r.projected_balance_tons)}`
        const cov = `   - Cobertura Estatística: ${r.statistical_coverage_days ?? '-'} dias`
        const risk = `   - Risco de Ruptura: ${r.auto_conclusion || r.rupture_risk_level || 'ADEQUADO'}`
        return `${title}\n${st}\n${l2}\n${cns}\n${sld}\n${cov}\n${risk}`
      })
      .join('\n\n')

    return `Prezados,\n\nSegue a análise oficial de disponibilidade e projeções de Matéria-prima Sidercentro gerada pelo PCP Robotizado CIAFAL.\n\n${periodStr}\nRegistros Selecionados (${selectedRows.length} item(ns)):\n\n${rowsSummary}\n\nFavor avaliar os saldos projetados e impactos na linha L2.\n\nAtenciosamente,\nEquipe de Planejamento e Controle da Produção — CIAFAL`
  }

  const [message, setMessage] = useState<string>('')

  // Atualiza mensagem quando abrir o modal ou mudar a seleção
  React.useEffect(() => {
    if (isOpen) {
      setMessage(generateInitialMessage())
      setSuccessMessage(null)
      setErrorMessage(null)
    }
  }, [isOpen, selectedRows])

  const toggleRecipient = (email: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email],
    )
  }

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      setErrorMessage('Selecione pelo menos um destinatário autorizado.')
      return
    }
    if (!message.trim()) {
      setErrorMessage('A mensagem do e-mail não pode ficar vazia.')
      return
    }

    setIsSending(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    // Formatação dos registros para o backend
    const payloadRecords = selectedRows.map((r) => ({
      id: r.id || r.steel_grade,
      steel_grade: r.steel_grade,
      steel_class: r.steel_class,
      code: r.material_code || r.steel_grade,
      material_code: r.material_code || '',
      material_description: r.material_description || '',
      total_stock_tons: r.total_stock_tons,
      total_stock_tons_fmt: formatTonsSdc(r.total_stock_tons),
      projected_l2_useful_tons: r.projected_l2_useful_tons,
      projected_l2_useful_tons_fmt: formatTonsSdc(r.projected_l2_useful_tons, {
        includeSign: true,
      }),
      projected_consumption_sdc_tons: r.projected_consumption_sdc_tons,
      projected_consumption_sdc_tons_fmt: formatTonsSdc(-r.projected_consumption_sdc_tons),
      projected_balance_tons: r.projected_balance_tons,
      projected_balance_tons_fmt: formatTonsSdc(r.projected_balance_tons),
      statistical_coverage_days: r.statistical_coverage_days,
      rupture_risk_level: r.rupture_risk_level,
      auto_conclusion: r.auto_conclusion,
    }))

    try {
      const response = await pb.send('/backend/v1/mp-sidercentro/send-email', {
        method: 'POST',
        body: {
          recipients: selectedRecipients,
          subject,
          message,
          selectedRecords: payloadRecords,
          filters: activeFilters,
        },
      })

      const count = response?.recipients_count ?? selectedRecipients.length
      setSuccessMessage(`E-mail enviado com sucesso para ${count} destinatário(s).`)
    } catch (err: any) {
      // Em caso de erro: NÃO fecha modal, NÃO perde seleção nem conteúdo, mensagem amigável sem stack trace
      const readableError =
        err?.response?.error ||
        err?.message ||
        'Falha na comunicação com o serviço de e-mail Resend. Tente novamente em instantes.'
      setErrorMessage(readableError)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSending && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-5 rounded-xl border border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Enviar via E-mail — Matéria-prima Sidercentro
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Disparo oficial via Resend (owner mode) com registros selecionados
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-[#004C97] border-blue-200 text-xs">
              {selectedRows.length} registro(s) selecionado(s)
            </Badge>
          </div>
        </DialogHeader>

        {/* Mensagem de sucesso */}
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

        {/* Mensagem amigável de erro */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3.5 text-xs">
          {/* Destinatário(s) autorizados */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Destinatário(s) Autorizados do HUB:</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {selectedRecipients.length} selecionado(s)
              </span>
            </label>
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-32 overflow-y-auto space-y-1">
              {authorizedHubUsers.map((u) => {
                const isChecked = selectedRecipients.includes(u.email)
                return (
                  <label
                    key={u.id}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                      isChecked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRecipient(u.email)}
                        className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                      />
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">{u.email}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">Assunto:</label>
            <Input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 text-xs bg-white border-slate-300"
            />
          </div>

          {/* Dados Selecionados (Resumo visual rápido) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700">
              Dados Selecionados ({selectedRows.length}):
            </label>
            <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-24 overflow-y-auto flex flex-wrap gap-1">
              {selectedRows.map((r, i) => (
                <Badge
                  key={r.id || r.steel_grade || i}
                  variant="outline"
                  className="bg-white text-slate-700 border-slate-200 text-[10px]"
                >
                  {r.steel_grade} &bull; Saldo: {formatTonsSdc(r.projected_balance_tons)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Mensagem editável */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Mensagem (editável antes do envio):</span>
              <button
                type="button"
                onClick={() => setMessage(generateInitialMessage())}
                className="text-[11px] text-[#004C97] hover:underline"
              >
                Restaurar texto padrão
              </button>
            </label>
            <Textarea
              rows={8}
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
            disabled={isSending || selectedRecipients.length === 0}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Enviando via Resend...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 mr-1" /> Enviar E-mail
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SdcSendEmailModal
