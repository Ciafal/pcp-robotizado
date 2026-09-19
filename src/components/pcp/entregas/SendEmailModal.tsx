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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Send, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react'
import { pcpMonthlySummaryService } from '@/services/pcp-monthly-summaries'
import { useToast } from '@/hooks/use-toast'

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  summaryCode: string
  lineName: string
  mesAno: string
  versionTag: string
  onDispatched?: () => void
}

const DEFAULT_GROUPS = [
  {
    id: 'PCP',
    label: 'PCP Planejamento',
    emails: ['pcp@ciafal.com.br', 'carlos.mendes@ciafal.com.br'],
  },
  {
    id: 'Comercial',
    label: 'Comercial & Vendas',
    emails: ['comercial@ciafal.com.br', 'vendas@ciafal.com.br'],
  },
  {
    id: 'Industria',
    label: 'Indústria & Operações',
    emails: ['operacoes@ciafal.com.br', 'gerencia.fabril@ciafal.com.br'],
  },
  {
    id: 'Gestao',
    label: 'Gestão & Diretoria',
    emails: ['diretoria@ciafal.com.br', 'controladoria@ciafal.com.br'],
  },
  { id: 'Manutencao', label: 'Manutenção Industrial', emails: ['manutencao@ciafal.com.br'] },
  {
    id: 'Suprimentos',
    label: 'Suprimentos & MP',
    emails: ['suprimentos@ciafal.com.br', 'compras@ciafal.com.br'],
  },
  { id: 'Qualidade', label: 'Qualidade & SGQ', emails: ['qualidade@ciafal.com.br'] },
  { id: 'Industrializados', label: 'Industrializados', emails: ['industrializados@ciafal.com.br'] },
]

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  summaryCode,
  lineName,
  mesAno,
  versionTag,
  onDispatched,
}) => {
  const { toast } = useToast()
  const [selectedGroups, setSelectedGroups] = useState<string[]>([
    'PCP',
    'Comercial',
    'Industria',
    'Gestao',
  ])
  const [customEmails, setCustomEmails] = useState<string>('')
  const [subject, setSubject] = useState<string>(
    `[CIAFAL PCP] Resumo Mensal de Entregas - ${lineName} (${mesAno} - ${versionTag})`,
  )
  const [message, setMessage] = useState<string>(
    `Prezados,\n\nSegue o Resumo Mensal de Entregas consolidado para a linha ${lineName}, referente ao período ${mesAno} (${versionTag}).\n\nO documento inclui balanço de carteira, estoque de produto acabado, suprimento de MP, assertividade histórica e conclusões técnicas.\n\nAtenciosamente,\nEquipe PCP Robotizado CIAFAL`,
  )
  const [isSending, setIsSending] = useState(false)
  const [dispatchResult, setDispatchResult] = useState<{
    status: string
    message: string
    isError: boolean
  } | null>(null)

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId],
    )
  }

  const handleSend = async () => {
    setIsSending(true)
    setDispatchResult(null)

    const recipients: string[] = []
    selectedGroups.forEach((gId) => {
      const g = DEFAULT_GROUPS.find((grp) => grp.id === gId)
      if (g) recipients.push(...g.emails)
    })

    if (customEmails.trim()) {
      const additional = customEmails
        .split(',')
        .map((e) => e.trim())
        .filter(Boolean)
      recipients.push(...additional)
    }

    try {
      const res = await pcpMonthlySummaryService.sendEmail({
        summaryCode,
        recipients,
        groups: selectedGroups,
        subject,
        message,
      })

      if (!res.success) {
        // Conforme especificado na Parte 6: se não houver credencial real, registrar status real
        setDispatchResult({
          status: res.status,
          message: res.message,
          isError: true,
        })
        toast({
          title: 'Envio de e-mail registrado com pendência',
          description: `Status: ${res.status}. Registro de auditoria gravado com sucesso.`,
          variant: 'destructive',
        })
      } else {
        setDispatchResult({
          status: 'Enviado com sucesso',
          message: 'E-mails despachados para a fila do servidor.',
          isError: false,
        })
        toast({
          title: 'E-mail enviado',
          description: 'Resumo mensal disparado aos destinatários.',
        })
      }
      onDispatched?.()
    } catch (err: any) {
      setDispatchResult({
        status: 'falha: integração de e-mail não configurada',
        message: err.message || 'Servidor SMTP não provisionado nesta instância de homologação.',
        isError: true,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-[#004C97] text-white">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Disparar Resumo Mensal por E-mail
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Resumo: <strong>{summaryCode}</strong> ({versionTag})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Grupos Corporativos Configuráveis */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Grupos Corporativos Destinatários:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DEFAULT_GROUPS.map((g) => {
                const isSelected = selectedGroups.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleGroup(g.id)}
                    className={`p-2 rounded border text-left transition-all ${
                      isSelected
                        ? 'border-[#004C97] bg-[#004C97]/5 text-[#004C97] font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span>{g.label}</span>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-[#004C97]" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* E-mails Adicionais */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">
              Destinatários Adicionais / Cópia (separados por vírgula):
            </label>
            <Input
              value={customEmails}
              onChange={(e) => setCustomEmails(e.target.value)}
              placeholder="ex: diretoria.industrial@ciafal.com.br, consultor.externo@ciafal.com.br"
              className="text-xs h-8"
            />
          </div>

          {/* Assunto */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Assunto:</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs h-8 font-semibold"
            />
          </div>

          {/* Mensagem */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Mensagem do Corpo do E-mail:</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="text-xs resize-none"
            />
          </div>

          {/* Anexo Indicado */}
          <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <Info className="w-4 h-4 text-[#004C97]" />
              <span>
                Anexo Automático: <strong>{summaryCode}.pdf</strong> + Link Seguro do HUB CIAFAL
              </span>
            </div>
            <Badge variant="outline" className="bg-white text-[10px]">
              PDF Gerado
            </Badge>
          </div>

          {/* Resultado Transacional Real */}
          {dispatchResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                dispatchResult.isError
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              {dispatchResult.isError ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <div className="font-bold uppercase tracking-wide text-[11px]">
                  Status Oficial: {dispatchResult.status}
                </div>
                <div>{dispatchResult.message}</div>
                {dispatchResult.isError && (
                  <div className="text-[10px] text-rose-700 pt-1 font-mono">
                    Auditoria gravada em Integrações & Governança &rarr; Logs com status
                    FAILED/FALHA_INTEGRACAO.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700"
          >
            Fechar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSend}
            disabled={isSending || selectedGroups.length === 0}
            className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Processando envio...' : 'Disparar E-mail'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default SendEmailModal
