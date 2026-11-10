/**
 * Modal "Enviar informações para o HUB"
 * - Origem automática ("PCP Robotizado > Gestão Industrializador > <tela>")
 * - Destinatários: busca entre usuários existentes do HUB
 * - Assunto auto-gerado editável
 * - Mensagem auto-gerada com filtros, data/hora, indicadores e link
 * - Botões Cancelar | Visualizar | Enviar ao HUB
 * - Mantém os dados da tela e filtros intactos ao fechar
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Send,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  UserCheck,
} from 'lucide-react'
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
  sendIndustrializerHub,
  HubRecipient,
  IndustrializerScreenKey,
} from '@/services/gestao-industrializador-actions-service'
import { pb } from '@/lib/pocketbase/client'

export interface IndustrializerSendHubModalProps {
  isOpen: boolean
  onClose: () => void
  screenKey: IndustrializerScreenKey
  screenName: string
  filters: Record<string, any>
  metrics?: Record<string, any>
  records: Array<Record<string, any>>
  initialSubject?: string
  initialMessage?: string
  onSuccess?: (message: string) => void
}

export const IndustrializerSendHubModal: React.FC<IndustrializerSendHubModalProps> = ({
  isOpen,
  onClose,
  screenKey,
  screenName,
  filters,
  metrics = {},
  records,
  initialSubject,
  initialMessage,
  onSuccess,
}) => {
  const [hubUsers, setHubUsers] = useState<HubRecipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<HubRecipient[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isPreview, setIsPreview] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null)

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

  // Carregar usuários do HUB
  useEffect(() => {
    if (isOpen) {
      setIsLoadingUsers(true)
      fetchHubUsers()
        .then((users) => {
          setHubUsers(users)
          if (selectedRecipients.length === 0 && users.length > 0) {
            // Seleciona por padrão o primeiro ou destinatário relevante
            const defaultRecipient = users.find((u) => u.department === 'PCP' || u.department === 'Industrialização') || users[0]
            setSelectedRecipients([defaultRecipient])
          }
        })
        .finally(() => setIsLoadingUsers(false))
    }
  }, [isOpen])

  // Gerar assunto e mensagem padrão quando abrir ou quando dados mudarem
  useEffect(() => {
    if (isOpen) {
      setFeedback(null)
      setIsPreview(false)

      const defaultSubject = initialSubject || `PCP | ${screenName} | Alerta Operacional Industrializador (${nowFormatted})`
      setSubject(defaultSubject)

      if (initialMessage) {
        setMessage(initialMessage)
      } else {
        const filtersList = Object.entries(filters)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '' && v !== 'todos')
          .map(([k, v]) => `• ${k}: ${v}`)
          .join('\n') || '• Nenhum filtro restritivo aplicado (visão geral)'

        const metricsList = Object.entries(metrics)
          .map(([k, v]) => `• ${k}: ${typeof v === 'number' ? v.toLocaleString('pt-BR') : v}`)
          .join('\n') || `• Registros analisados: ${records.length}`

        const currentUserName = pb.authStore.record?.name || 'Responsável PCP'
        const urlRef = `${window.location.origin}${window.location.pathname}`

        const defaultBody = [
          `RELATÓRIO OPERACIONAL - HUB INDUSTRIAL CIAFAL`,
          `Origem: ${originPath}`,
          `Data/Hora: ${nowFormatted}`,
          `Responsável: ${currentUserName}`,
          ``,
          `FILTROS APLICADOS:`,
          filtersList,
          ``,
          `INDICADORES PRINCIPAIS:`,
          metricsList,
          ``,
          `SITUAÇÕES DE ATENÇÃO:`,
          `• Total de registros em acompanhamento: ${records.length}`,
          records.length > 0
            ? `• Verificação de lotes e alinhamento de prioridades recomendado para o próximo turno.`
            : `• Não foram localizados registros para o critério selecionado.`,
          ``,
          `Acesse a tela para visualização detalhada: ${urlRef}`,
        ].join('\n')

        setMessage(defaultBody)
      }
    }
  }, [isOpen, initialSubject, initialMessage, screenName, nowFormatted, filters, metrics, records.length])

  // Filtro de usuários
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return hubUsers
    const term = searchTerm.toLowerCase()
    return hubUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.department && u.department.toLowerCase().includes(term)),
    )
  }, [hubUsers, searchTerm])

  const handleToggleRecipient = (user: HubRecipient) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((p) => p.email.toLowerCase() === user.email.toLowerCase())
      if (exists) {
        return prev.filter((p) => p.email.toLowerCase() !== user.email.toLowerCase())
      }
      return [...prev, user]
    })
  }

  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Selecione ao menos um destinatário do HUB para concluir o envio.',
      })
      return
    }

    if (!subject.trim()) {
      setFeedback({
        type: 'error',
        message: 'Informe o assunto do comunicado antes de enviar.',
      })
      return
    }

    setIsSending(true)
    setFeedback(null)

    const payload = {
      screen_key: screenKey,
      screen_name: screenName,
      recipients: selectedRecipients.map((r) => ({ id: r.id, name: r.name, email: r.email })),
      subject: subject.trim(),
      message: message.trim(),
      filters: filters,
      data_summary: {
        records_count: records.length,
        metrics: metrics,
      },
    }

    const response = await sendIndustrializerHub(payload)

    setIsSending(false)

    if (response.success) {
      const currentUserName = pb.authStore.record?.name || 'Usuário PCP'
      const names = selectedRecipients.map((r) => r.name).join(', ')
      const successText = `Informações enviadas ao HUB com sucesso para: ${names}.`
      setFeedback({
        type: 'success',
        message: successText,
        details: `Emissão: ${nowFormatted} | Responsável: ${currentUserName}`,
      })
      onSuccess?.(successText)
    } else {
      setFeedback({
        type: 'error',
        message: response.message || 'Falha ao comunicar com o HUB. Os dados foram preservados.',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="modal-enviar-hub"
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900 border-slate-200 shadow-xl"
      >
        <DialogHeader className="px-6 py-4 bg-[#004C97] text-white flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Send className="w-5 h-5 text-white" />
              Enviar informações para o HUB
            </DialogTitle>
            <p className="text-xs text-blue-100 mt-1">
              Origem: <span className="font-semibold">{originPath}</span>
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
              data-testid={`feedback-${feedback.type}`}
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

          {/* Destinatários */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Destinatários do HUB (Usuários Cadastrados)
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-md min-h-[38px] bg-slate-50/50">
              {selectedRecipients.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Nenhum destinatário selecionado.</span>
              ) : (
                selectedRecipients.map((rec) => (
                  <Badge
                    key={rec.email}
                    variant="secondary"
                    className="bg-[#004C97]/10 text-[#004C97] border border-[#004C97]/20 flex items-center gap-1 py-0.5 pl-2 pr-1 text-xs"
                  >
                    <span>{rec.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleRecipient(rec)}
                      className="hover:bg-[#004C97]/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            {/* Caixa de busca de destinatários */}
            <div className="border border-slate-200 rounded-md p-2 space-y-2 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Pesquisar usuário do HUB por nome, e-mail ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="max-h-28 overflow-y-auto divide-y divide-slate-100 text-xs">
                {isLoadingUsers ? (
                  <div className="py-2 text-center text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Carregando usuários...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-2 text-center text-slate-400 italic">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedRecipients.some(
                      (p) => p.email.toLowerCase() === user.email.toLowerCase(),
                    )
                    return (
                      <div
                        key={user.id || user.email}
                        onClick={() => handleToggleRecipient(user)}
                        className={`flex items-center justify-between p-1.5 cursor-pointer rounded hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50/60 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck
                            className={`w-3.5 h-3.5 ${isSelected ? 'text-[#004C97]' : 'text-slate-300'}`}
                          />
                          <div>
                            <span className="text-slate-800">{user.name}</span>
                            <span className="text-slate-400 text-[11px] ml-1.5">({user.email})</span>
                          </div>
                        </div>
                        {user.department && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500">
                            {user.department}
                          </Badge>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Assunto */}
          <div className="space-y-1.5">
            <Label htmlFor="hub-subject" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Assunto
            </Label>
            <Input
              id="hub-subject"
              data-testid="input-hub-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm font-medium"
              placeholder="Assunto do comunicado ao HUB..."
            />
          </div>

          {/* Alternância Visualizar / Editar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="hub-message" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Conteúdo do Comunicado
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPreview(!isPreview)}
                className="h-7 text-xs text-[#004C97] hover:bg-blue-50"
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                {isPreview ? 'Editar Texto' : 'Visualizar Prévia'}
              </Button>
            </div>

            {isPreview ? (
              <div
                data-testid="preview-hub-content"
                className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed"
              >
                {message}
              </div>
            ) : (
              <Textarea
                id="hub-message"
                data-testid="textarea-hub-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                className="text-xs font-mono resize-y"
                placeholder="Mensagem do comunicado..."
              />
            )}
            <p className="text-[11px] text-slate-500">
              O conteúdo foi pré-gerado com base nos dados reais e filtros aplicados nesta tela e pode ser editado livremente.
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
              className="text-[#004C97] border-[#004C97]/30 hover:bg-blue-50"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {isPreview ? 'Voltar para Edição' : 'Visualizar'}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSend}
              disabled={isSending || selectedRecipients.length === 0}
              className="bg-[#004C97] text-white hover:bg-[#003d7a] font-medium"
              data-testid="btn-confirmar-envio-hub"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1.5" />
                  Enviar ao HUB
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
