import React, { useState, useEffect } from 'react'
import { X, Send, Users, AlertTriangle, CheckCircle2, Mail, Loader2, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { pb } from '@/lib/pocketbase/client'
import { comercialComunicadoService } from '@/services/comercial-comunicado-service'
import type { DestinatarioHub } from '@/types/comercial-comunicado'

export interface EfficiencySendPdfModalProps {
  isOpen: boolean
  onClose: () => void
  contextInfo: {
    title: string
    code: string
    breadcrumb: string[]
    periodFormatted: string
    plantCode?: string
    lineCode?: string
    centerCode?: string
    materialCode?: string
    ordersCount: number
  }
  onSuccessDispatch?: (recipientsCount: number) => void
}

export const EfficiencySendPdfModal: React.FC<EfficiencySendPdfModalProps> = ({
  isOpen,
  onClose,
  contextInfo,
  onSuccessDispatch,
}) => {
  const [recipients, setRecipients] = useState<DestinatarioHub[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  // Campos preenchidos automaticamente e editáveis
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  // Estados de envio e feedback
  const [sending, setSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Inicializa assunto e mensagem quando aberto
  useEffect(() => {
    if (!isOpen) return

    const targetLocal = contextInfo.centerCode || contextInfo.lineCode || contextInfo.code
    const defaultSubject = `PCP Robotizado | Eficiência | ${targetLocal} | ${contextInfo.periodFormatted}`
    const defaultMessage = `Segue relatório de eficiência operacional das Ordens de Produção referentes a ${targetLocal} no período selecionado (${contextInfo.periodFormatted}).`

    setSubject(defaultSubject)
    setMessage(defaultMessage)
    setErrorMessage(null)
    setSuccessMessage(null)

    // Carregar usuários do HUB
    let isMounted = true
    setLoadingRecipients(true)
    comercialComunicadoService
      .listarDestinatariosHub()
      .then((users) => {
        if (!isMounted) return
        setRecipients(users)
        // Seleciona os primeiros 2 por padrão para agilizar
        if (users.length > 0) {
          setSelectedRecipientIds(users.slice(0, 2).map((u) => u.id))
        }
      })
      .catch((err) => {
        console.warn('Falha ao listar usuários do HUB:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingRecipients(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, contextInfo])

  if (!isOpen) return null

  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleSend = async () => {
    setErrorMessage(null)

    if (selectedRecipientIds.length === 0) {
      setErrorMessage('Selecione pelo menos um destinatário para envio do relatório.')
      return
    }

    if (!subject.trim()) {
      setErrorMessage('O assunto do envio é obrigatório.')
      return
    }

    setSending(true)

    const selectedUsers = recipients.filter((r) => selectedRecipientIds.includes(r.id))
    const recipientEmails = selectedUsers.map((u) => u.email)

    // Auditoria obrigatória (sempre append-only em pcp_audit_logs)
    const currentUser = pb.authStore.record || pb.authStore.model
    const userEmail = (currentUser as any)?.email || 'operador.pcp@ciafal.com.br'
    const userName = (currentUser as any)?.name || 'Operador PCP'
    const userId = (currentUser as any)?.id || null

    try {
      // 1. Tentar acionar endpoint corporativo caso exista backend com SMTP
      let smtpSuccess = false
      let technicalReason = 'Integração de e-mail corporativo (SMTP) não configurada no servidor.'

      try {
        const data = await pb.send<any>('/backend/v1/pcp/summaries/send-email', {
          method: 'POST',
          body: {
            summary_code: `PDF-EFIC-${contextInfo.code}`,
            recipients: recipientEmails,
            subject,
            message,
          },
        })

        if (data && data.success) {
          smtpSuccess = true
        } else {
          technicalReason = data?.message || technicalReason
        }
      } catch (e: any) {
        technicalReason =
          e?.data?.message ||
          e?.message ||
          'Serviço corporativo de e-mail temporariamente indisponível. Provisionamento SMTP pendente na infraestrutura.'
      }

      // 2. Gravar auditoria detalhada em pcp_audit_logs
      try {
        await pb.collection('pcp_audit_logs').create({
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          user_role: (currentUser as any)?.role || 'PCP_PROGRAMMER',
          event_type: 'SCHEDULE_ACTION',
          action: 'ENVIAR_PDF_DETALHAMENTO_ORDENS',
          resource: 'EFICIENCIA_DRILLDOWN',
          resource_id: contextInfo.code,
          outcome: smtpSuccess ? 'SUCCESS' : 'FAILED',
          status: smtpSuccess ? 'ENVIADO' : 'FALHA_SMTP_NAO_CONFIGURADO',
          module: 'TORRE_CONTROLE_EFICIENCIA',
          screen: 'DETALHAMENTO_OPERACIONAL_ORDENS',
          details: {
            target_code: contextInfo.code,
            recipients: recipientEmails,
            subject,
            orders_count: contextInfo.ordersCount,
            smtp_success: smtpSuccess,
            technical_reason: technicalReason,
            timestamp: new Date().toISOString(),
          },
        })
      } catch (auditErr) {
        console.warn('Erro ao registrar log de auditoria do envio de PDF:', auditErr)
      }

      // 3. Resposta honesta ao usuário: se não há SMTP, relata o erro claro e mantém os dados
      if (!smtpSuccess) {
        setErrorMessage(
          `Não foi possível concluir o envio por e-mail: ${technicalReason} Verifique o provisionamento de SMTP corporativo no painel de integrações. Seus dados foram preservados.`,
        )
        setSending(false)
        return
      }

      // Caso de sucesso real (se configurado)
      const successText = `PDF enviado com sucesso para ${selectedRecipientIds.length} destinatário(s).`
      setSuccessMessage(successText)
      if (onSuccessDispatch) {
        onSuccessDispatch(selectedRecipientIds.length)
      }
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha inesperada ao tentar despachar o relatório PDF.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !sending && onClose()}>
      <DialogContent className="max-w-md sm:max-w-lg bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Enviar PDF do Detalhamento Operacional
              </DialogTitle>
              <p className="text-[11px] text-slate-500 font-sans">
                HUB Industrial CIAFAL &bull; PCP Robotizado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do formulário */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
          {/* Alerta de Erro Claro e Honesto */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold block">Falha no envio do relatório</span>
                <p className="text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-900 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{successMessage}</span>
            </div>
          )}

          {/* Seleção de Múltiplos Destinatários */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#004C97]" />
                Destinatários Cadastrados no HUB ({selectedRecipientIds.length} selecionados)
              </label>
              <span className="text-[10px] text-slate-500">Múltipla seleção</span>
            </div>

            <div className="border border-slate-200 rounded-xl p-2 max-h-36 overflow-y-auto bg-slate-50/50 space-y-1">
              {loadingRecipients ? (
                <div className="py-4 text-center text-slate-500 flex items-center justify-center gap-2 text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando usuários do HUB...
                </div>
              ) : recipients.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  Nenhum usuário cadastrado localizado.
                </div>
              ) : (
                recipients.map((user) => {
                  const isSelected = selectedRecipientIds.includes(user.id)
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleRecipient(user.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#004C97]/10 border border-[#004C97]/30 text-[#004C97] font-semibold'
                          : 'bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-900">{user.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate font-mono">
                          {user.email}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          isSelected
                            ? 'bg-[#004C97] text-white border-[#004C97]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isSelected ? 'Selecionado' : user.sector || 'HUB'}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 text-xs">Assunto do E-mail</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-xs h-8 bg-white border-slate-200"
              placeholder="Assunto da mensagem..."
            />
          </div>

          {/* Mensagem curta editável */}
          <div className="space-y-1">
            <label className="font-bold text-slate-800 text-xs">Mensagem (editável)</label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs bg-white border-slate-200 resize-none"
              placeholder="Digite a mensagem de acompanhamento..."
            />
          </div>

          {/* Resumo do Anexo */}
          <div className="p-2.5 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-xs text-slate-700">
            <FileText className="w-4 h-4 text-[#004C97] shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-slate-900 block">
                Anexo gerado automaticamente
              </span>
              <span className="text-[10px] text-slate-500 font-mono truncate block">
                Relatorio_Eficiencia_{contextInfo.code}.pdf &bull; {contextInfo.ordersCount} Ordens
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={sending}
            className="text-xs h-8 text-slate-700"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={sending || Boolean(successMessage)}
            className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold gap-1.5"
          >
            {sending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Enviando PDF...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Enviar PDF</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
