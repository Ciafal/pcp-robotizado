/**
 * Modal "Enviar informações por e-mail"
 * - Para: múltiplos e-mails (priorizando usuários do HUB ou digitação manual)
 * - CC: opcional
 * - Assunto auto-gerado editável
 * - Corpo auto-gerado: Resumo, Pontos de Atenção, Filtros, Origem e Link
 * - Botões Cancelar | Visualizar | Enviar e-mail
 * - Envio REAL via Resend owner no backend ($connectors.executeAsOwner)
 * - Sucesso: "E-mail enviado com sucesso para X destinatário(s)."
 * - Erro: mantém dados, não fecha modal, motivo objetivo.
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Mail, X, CheckCircle2, AlertCircle, Eye, Loader2, Plus } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  fetchHubUsers,
  sendIndustrializerEmail,
  type HubRecipient,
  type IndustrializerScreenKey,
} from '@/services/gestao-industrializador-actions-service'
import { pb } from '@/lib/pocketbase/client'

export interface IndustrializerSendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  screenKey: IndustrializerScreenKey
  screenName: string
  filters: Record<string, any>
  metrics?: Record<string, any>
  records: Array<Record<string, any>>
  initialSubject?: string
  initialBody?: string
  onSuccess?: (message: string) => void
}

export const IndustrializerSendEmailModal: React.FC<IndustrializerSendEmailModalProps> = ({
  isOpen,
  onClose,
  screenKey,
  screenName,
  filters,
  metrics = {},
  records,
  initialSubject,
  initialBody,
  onSuccess,
}) => {
  const [hubUsers, setHubUsers] = useState<HubRecipient[]>([])
  const [toList, setToList] = useState<string[]>([])
  const [ccList, setCcList] = useState<string[]>([])
  const [toInput, setToInput] = useState('')
  const [ccInput, setCcInput] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
    details?: string
  } | null>(null)

  const originPath = `PCP Robotizado > Gestão Industrializador > ${screenName}`
  const nowFormatted = useMemo(() => {
    return new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      fetchHubUsers().then((users) => {
        setHubUsers(users)
        if (toList.length === 0 && users.length > 0) {
          const defaultUser =
            users.find((u) => u.email.includes('pcp') || u.email.includes('industrializador')) ||
            users[0]
          if (defaultUser?.email) {
            setToList([defaultUser.email])
          }
        }
      })
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setFeedback(null)
      setIsPreview(false)

      const defaultSubject =
        initialSubject || `PCP | ${screenName} | Relatório Técnico (${nowFormatted})`
      setSubject(defaultSubject)

      if (initialBody) {
        setBodyText(initialBody)
      } else {
        const filtersList =
          Object.entries(filters)
            .filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'todos')
            .map(([k, v]) => `  • ${k}: ${v}`)
            .join('\n') || '  • Visão geral (sem filtros restritivos)'

        const metricsList =
          Object.entries(metrics)
            .map(([k, v]) => `  • ${k}: ${typeof v === 'number' ? v.toLocaleString('pt-BR') : v}`)
            .join('\n') || `  • Registros analisados: ${records.length}`

        const currentUserName = pb.authStore.record?.name || 'Responsável PCP'
        const urlRef = `${window.location.origin}${window.location.pathname}`

        const defaultContent = [
          `Prezados,`,
          ``,
          `Segue o posicionamento operacional e analítico da tela ${screenName}:`,
          ``,
          `1. RESUMO EXECUTIVO`,
          `  • Origem: ${originPath}`,
          `  • Data de emissão: ${nowFormatted}`,
          `  • Responsável técnico: ${currentUserName}`,
          `  • Registros considerados: ${records.length}`,
          ``,
          `2. INDICADORES & PRINCIPAIS MÉTRICAS`,
          metricsList,
          ``,
          `3. PONTOS DE ATENÇÃO & DIRETRIZES`,
          records.length > 0
            ? `  • Lotes prioritários requerem acompanhamento próximo nas próximas 24h.`
            : `  • Não foram encontrados desvios para os parâmetros informados.`,
          `  • Manter monitoramento contínuo junto ao industrializador.`,
          ``,
          `4. FILTROS APLICADOS`,
          filtersList,
          ``,
          `Link direto para o painel: ${urlRef}`,
          ``,
          `Atenciosamente,`,
          `${currentUserName}`,
          `PCP Robotizado CIAFAL`,
        ].join('\n')

        setBodyText(defaultContent)
      }
    }
  }, [
    isOpen,
    initialSubject,
    initialBody,
    screenName,
    nowFormatted,
    filters,
    metrics,
    records.length,
  ])

  const handleAddEmail = (email: string, target: 'to' | 'cc') => {
    const cleaned = email.trim()
    if (!cleaned) return
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)
    if (!isValid) {
      setFeedback({
        type: 'error',
        message: `O endereço "${cleaned}" não é um e-mail válido.`,
      })
      return
    }

    if (target === 'to') {
      if (!toList.includes(cleaned)) setToList([...toList, cleaned])
      setToInput('')
    } else {
      if (!ccList.includes(cleaned)) setCcList([...ccList, cleaned])
      setCcInput('')
    }
    setFeedback(null)
  }

  const handleSend = async () => {
    if (toList.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Informe ao menos um destinatário no campo "Para" para concluir o envio.',
      })
      return
    }

    if (!subject.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o assunto do e-mail antes de enviar.',
      })
      return
    }

    setIsSending(true)
    setFeedback(null)

    const payload = {
      screen_key: screenKey,
      screen_name: screenName,
      to: toList,
      cc: ccList,
      subject: subject.trim(),
      body: bodyText.trim(),
      filters: filters,
      data_summary: {
        records_count: records.length,
        metrics: metrics,
      },
    }

    const response = await sendIndustrializerEmail(payload)

    setIsSending(false)

    if (response.success) {
      const successText = `E-mail enviado com sucesso para ${toList.length} destinatário(s).`
      setFeedback({
        type: 'success',
        message: successText,
        details: `Disparado via serviço Resend em ${nowFormatted}.`,
      })
      onSuccess?.(successText)
    } else {
      setFeedback({
        type: 'error',
        message:
          response.message || 'Falha ao processar o envio de e-mail. Os dados foram preservados.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="modal-enviar-email"
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 border-slate-200 shadow-xl"
      >
        <DialogHeader className="px-6 py-4 bg-slate-800 text-white flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Mail className="w-5 h-5 text-white" />
              Enviar informações por e-mail
            </DialogTitle>
            <p className="text-xs text-slate-300 mt-1">
              Origem: <span className="font-semibold text-white">{originPath}</span>
            </p>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {feedback && (
            <Alert
              variant={feedback.type === 'error' ? 'destructive' : 'default'}
              className={
                feedback.type === 'success'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                  : 'border-red-300 bg-red-50 text-red-900'
              }
              data-testid={`email-feedback-${feedback.type}`}
            >
              <div className="flex items-start gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <AlertDescription className="font-semibold text-sm">
                    {feedback.message}
                  </AlertDescription>
                  {feedback.details && (
                    <p className="text-xs text-slate-600 mt-1">{feedback.details}</p>
                  )}
                </div>
              </div>
            </Alert>
          )}

          {/* Campo Para */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Para (Destinatários Principais)
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-md min-h-[38px] bg-slate-50/50">
              {toList.map((email) => (
                <Badge
                  key={email}
                  variant="secondary"
                  className="bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1 py-0.5 pl-2 pr-1 text-xs"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => setToList(toList.filter((e) => e !== email))}
                    className="hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex-1 min-w-[200px] flex items-center gap-1">
                <Input
                  placeholder="Digitar e-mail e pressionar Enter ou +"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddEmail(toInput, 'to')
                    }
                  }}
                  className="h-7 border-none shadow-none text-xs focus-visible:ring-0 p-0"
                  data-testid="input-email-to"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddEmail(toInput, 'to')}
                  className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Sugestões de e-mails rápidos de usuários do HUB */}
            {hubUsers.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto py-1 text-[11px] text-slate-500">
                <span className="shrink-0 font-medium">Sugeridos:</span>
                {hubUsers.slice(0, 4).map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => handleAddEmail(u.email, 'to')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] shrink-0 border border-slate-200 transition-colors"
                  >
                    + {u.name.split(' ')[0]} ({u.email})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campo CC */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              CC (Com Cópia - Opcional)
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-md min-h-[34px] bg-slate-50/30">
              {ccList.map((email) => (
                <Badge
                  key={email}
                  variant="outline"
                  className="bg-white text-slate-700 border-slate-300 flex items-center gap-1 py-0.5 pl-2 pr-1 text-xs"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => setCcList(ccList.filter((e) => e !== email))}
                    className="hover:bg-slate-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex-1 min-w-[180px] flex items-center gap-1">
                <Input
                  placeholder="Adicionar e-mail em cópia..."
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddEmail(ccInput, 'cc')
                    }
                  }}
                  className="h-6 border-none shadow-none text-xs focus-visible:ring-0 p-0"
                  data-testid="input-email-cc"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddEmail(ccInput, 'cc')}
                  className="h-5 w-5 p-0 text-slate-500 hover:text-slate-800"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email-subject"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Assunto
            </Label>
            <Input
              id="email-subject"
              data-testid="input-email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm font-medium"
              placeholder="Assunto do e-mail..."
            />
          </div>

          {/* Corpo do E-mail */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="email-body"
                className="text-xs font-semibold uppercase tracking-wider text-slate-600"
              >
                Corpo do E-mail
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                className="h-7 text-xs text-slate-700 hover:bg-slate-100"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {isPreview ? 'Editar Corpo' : 'Prévia Visual'}
              </Button>
            </div>

            {isPreview ? (
              <div
                data-testid="preview-email-content"
                className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed"
              >
                {bodyText}
              </div>
            ) : (
              <Textarea
                id="email-body"
                data-testid="textarea-email-body"
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={8}
                className="text-xs font-mono resize-y"
                placeholder="Conteúdo do e-mail..."
              />
            )}
            <p className="text-[11px] text-slate-500">
              O e-mail será formatado com o template visual oficial CIAFAL e enviado via conector
              Resend.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSending}
            className="text-slate-600 border-slate-300 hover:bg-slate-100"
          >
            Cancelar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="text-slate-700 border-slate-300 hover:bg-slate-100"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {isPreview ? 'Voltar para Edição' : 'Visualizar'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={isSending || toList.length === 0}
              className="bg-slate-900 text-white hover:bg-slate-800 font-medium"
              data-testid="btn-confirmar-envio-email"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-1.5" />
                  Enviar e-mail
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
