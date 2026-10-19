import React, { useState, useEffect, useMemo } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Mail,
  Search,
  Users,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  Building2,
  FileText,
  Eye,
  ShieldAlert,
} from 'lucide-react'
import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'
import { DestinatarioAtaItem } from '@/types/pcp-ata-distribuicao'
import pcpAtaDistribuicaoService from '@/services/pcp-ata-distribuicao-service'
import { createAtaPdfBlob, getAtaPdfFileName } from '@/services/pcp-ata-pdf-generator'
import pb from '@/lib/pocketbase/client'

export interface EnviarEmailAtaModalProps {
  isOpen: boolean
  onClose: () => void
  meeting: PCPMeetingRecord
  ata: PCPMeetingAtaRecord
  onSuccess?: () => void
}

export const EnviarEmailAtaModal: React.FC<EnviarEmailAtaModalProps> = ({
  isOpen,
  onClose,
  meeting,
  ata,
  onSuccess,
}) => {
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [previewCorpo, setPreviewCorpo] = useState(false)

  // Usuários do HUB (sem e-mail manual)
  const [allUsers, setAllUsers] = useState<DestinatarioAtaItem[]>([])
  const [meetingParticipants, setMeetingParticipants] = useState<DestinatarioAtaItem[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set())
  const [selectedCcIds, setSelectedCcIds] = useState<Set<string>>(new Set())

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSector, setFilterSector] = useState<string>('TODOS')

  // Campos
  const [assunto, setAssunto] = useState('')
  const [mensagemComplementar, setMensagemComplementar] = useState('')
  const [exigirConfirmacao, setExigirConfirmacao] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // PDF
  const [pdfInfo, setPdfInfo] = useState<{
    blob: Blob | null
    fileName: string
    html: string
    base64DataUrl: string
  }>({
    blob: null,
    fileName: '',
    html: '',
    base64DataUrl: '',
  })
  const [pdfGenerationError, setPdfGenerationError] = useState<string | null>(null)

  const isMinuta = (ata as any).is_minuta || ata.status === 'MINUTA' || ata.ata_type === 'PREVIA'

  const currentUser = useMemo(() => {
    const rec = (pb.authStore.record || pb.authStore.model) as any
    return {
      id: rec?.id || '',
      name: rec?.name || 'Administrador PCP',
      email: rec?.email || 'pcp@ciafal.com.br',
      role: rec?.role || 'PCP_ADMIN',
    }
  }, [])

  // Inicialização
  useEffect(() => {
    if (!isOpen) return

    // Assunto padrão conforme especificação:
    // "ATA OFICIAL — Reunião Semanal PCP — [Data da reunião]"
    const padraoAssunto = isMinuta
      ? `MINUTA DE ATA — Reunião Semanal PCP — ${meeting.meeting_date || ''}`
      : `ATA OFICIAL — Reunião Semanal PCP — ${meeting.meeting_date || ''}`

    setAssunto(padraoAssunto)
    setMensagemComplementar('')
    setExigirConfirmacao(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setPdfGenerationError(null)
    setPreviewCorpo(false)

    // 1. Gera o PDF Oficial SGQ obrigatório
    setGeneratingPdf(true)
    try {
      const generated = createAtaPdfBlob({
        meeting,
        ata,
      })
      if (!generated.blob || generated.blob.size === 0) {
        throw new Error('Falha na geração do arquivo PDF SGQ.')
      }
      setPdfInfo(generated)
    } catch (e: any) {
      setPdfGenerationError(
        'Falha crítica ao gerar o PDF oficial da ATA. O envio por e-mail foi bloqueado conforme a norma SGQ.',
      )
    } finally {
      setGeneratingPdf(false)
    }

    // 2. Carrega usuários reais do HUB
    const loadUsers = async () => {
      setLoadingUsers(true)
      try {
        const [users, parts] = await Promise.all([
          pcpAtaDistribuicaoService.listarUsuariosReaisHub(),
          pcpAtaDistribuicaoService.listarParticipantesReuniao(meeting.id),
        ])

        const partEmails = new Set(parts.map((p) => p.email.toLowerCase()).filter(Boolean))
        const partsByName = new Set(parts.map((p) => p.name.toLowerCase()).filter(Boolean))

        const merged = users.map((u) => ({
          ...u,
          isParticipant:
            (u.email && partEmails.has(u.email.toLowerCase())) ||
            partsByName.has(u.name.toLowerCase()),
        }))

        for (const p of parts) {
          if (!merged.some((u) => u.email && u.email.toLowerCase() === p.email.toLowerCase())) {
            merged.push({
              ...p,
              isParticipant: true,
            })
          }
        }

        setAllUsers(merged)
        setMeetingParticipants(parts)

        // Pré-seleciona participantes como destinatários principais
        const initRecipients = new Set<string>()
        merged.forEach((u) => {
          if (u.isParticipant) initRecipients.add(u.id)
        })
        setSelectedRecipientIds(initRecipients)
        setSelectedCcIds(new Set())
      } catch (err) {
        console.warn('Erro ao carregar usuários:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    loadUsers()
  }, [isOpen, meeting, ata])

  // Setores disponíveis
  const availableSectors = useMemo(() => {
    const s = new Set<string>()
    allUsers.forEach((u) => {
      if (u.sector) s.add(u.sector)
    })
    return Array.from(s).sort()
  }, [allUsers])

  // Usuários filtrados
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.sector && u.sector.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q))

      const matchesSector = filterSector === 'TODOS' || u.sector === filterSector
      return matchesSearch && matchesSector
    })
  }, [allUsers, searchQuery, filterSector])

  // Alterna Destinatário Principal (Para)
  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        // Se estiver em CC, remove de CC
        setSelectedCcIds((ccPrev) => {
          const nextCc = new Set(ccPrev)
          nextCc.delete(id)
          return nextCc
        })
      }
      return next
    })
  }

  // Alterna Cópia (CC)
  const toggleCc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedCcIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else {
        next.add(id)
        // Se estiver em Principal, remove de Principal
        setSelectedRecipientIds((recPrev) => {
          const nextRec = new Set(recPrev)
          nextRec.delete(id)
          return nextRec
        })
      }
      return next
    })
  }

  // Seleções rápidas
  const handleSelectAllParticipants = () => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      allUsers.forEach((u) => {
        if (u.isParticipant && !selectedCcIds.has(u.id)) next.add(u.id)
      })
      return next
    })
  }

  const handleSelectBySector = (sector: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      allUsers.forEach((u) => {
        if (u.sector === sector && !selectedCcIds.has(u.id)) next.add(u.id)
      })
      return next
    })
  }

  const handleClearAll = () => {
    setSelectedRecipientIds(new Set())
    setSelectedCcIds(new Set())
  }

  // Listas finais
  const recipientsList = useMemo(() => {
    return allUsers.filter((u) => selectedRecipientIds.has(u.id))
  }, [allUsers, selectedRecipientIds])

  const ccList = useMemo(() => {
    return allUsers.filter((u) => selectedCcIds.has(u.id))
  }, [allUsers, selectedCcIds])

  // Submissão do envio
  const handleSendEmail = async () => {
    if (pdfGenerationError || !pdfInfo.blob) {
      setErrorMsg('Impossível enviar: o anexo PDF oficial é obrigatório e não pôde ser gerado.')
      return
    }

    if (recipientsList.length === 0) {
      setErrorMsg('Selecione pelo menos um destinatário principal (Para) cadastrado no HUB.')
      return
    }

    if (!assunto.trim()) {
      setErrorMsg('O assunto do e-mail é obrigatório.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await pcpAtaDistribuicaoService.enviarAtaPorEmail({
        ataId: ata.id,
        meetingId: meeting.id,
        meetingCode: meeting.meeting_code,
        meetingDate: meeting.meeting_date,
        meetingTitle: meeting.title,
        versaoAta: ata.version,
        isMinuta,
        assunto,
        mensagemComplementar,
        exigirConfirmacao,
        destinatarios: recipientsList,
        destinatariosCc: ccList,
        pdfNomeArquivo: pdfInfo.fileName,
        pdfBlob: pdfInfo.blob,
        pdfBase64: pdfInfo.base64DataUrl,
        corpoEmailHtml: pdfInfo.html,
        currentUser,
      })

      setSuccessMsg(
        `E-mail registrado com sucesso para ${recipientsList.length} destinatário(s) e ${ccList.length} em cópia! Status: Enfileirado para despacho com PDF SGQ anexado.`,
      )
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1800)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar o envio por e-mail da ATA.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-xl">
        {/* Header */}
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-xs">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Enviar ATA por E-mail &bull; Notificação Formal SGQ
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Distribuição corporativa via e-mails reais cadastrados no HUB com anexo PDF
                  obrigatório
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                className={`text-[10px] font-bold ${
                  isMinuta
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                }`}
              >
                {isMinuta ? 'MINUTA DE ATA' : 'ATA OFICIAL'}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                V{ata.version}.0
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Scroll Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pdfGenerationError && (
            <div className="p-3 bg-rose-100 border border-rose-300 rounded-lg text-rose-900 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-700 mt-0.5 shrink-0" />
              <div>
                <strong>Bloqueio de Envio por Regra SGQ:</strong>
                <p className="mt-0.5">{pdfGenerationError}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Indicador de Anexo PDF Obrigatório */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#004C97] text-white rounded-md">
                <Paperclip className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-xs">
                  Anexo Obrigatório: {pdfInfo.fileName || 'Gerando PDF...'}
                </span>
                <span className="text-[11px] text-slate-600">
                  {generatingPdf
                    ? 'Gerando arquivo PDF da ATA...'
                    : 'PDF SGQ gerado a partir da mesma versão selecionada da ATA'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewCorpo(!previewCorpo)}
              className="text-xs h-7 gap-1 text-[#004C97] border-blue-300 hover:bg-blue-100 font-semibold"
            >
              <Eye className="w-3.5 h-3.5" />
              {previewCorpo ? 'Ocultar Prévia do E-mail' : 'Visualizar Corpo Completo'}
            </Button>
          </div>

          {/* Prévia do Corpo do E-mail (quando expandido) */}
          {previewCorpo && (
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between border-b pb-1.5">
                <span className="font-bold text-slate-800 uppercase text-[10px]">
                  Prévia do Corpo do E-mail (Reprodução Integral das Seções)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Visualização no HUB CIAFAL
                </span>
              </div>
              <div
                className="max-h-60 overflow-y-auto bg-white p-4 rounded border text-slate-800"
                dangerouslySetInnerHTML={{ __html: pdfInfo.html }}
              />
            </div>
          )}

          {/* Campos de Assunto e Mensagem */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Assunto do E-mail <span className="text-rose-500">*</span>
              </label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex: ATA OFICIAL — Reunião Semanal PCP — DD/MM/AAAA"
                className="text-xs h-8 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Mensagem Complementar (Aparecerá antes da ATA completa no e-mail)
              </label>
              <Textarea
                value={mensagemComplementar}
                onChange={(e) => setMensagemComplementar(e.target.value)}
                placeholder="Insira esclarecimentos ou encaminhamentos específicos para este envio..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="exigirConfirmacaoEmail"
                checked={exigirConfirmacao}
                onCheckedChange={(c) => setExigirConfirmacao(!!c)}
              />
              <label
                htmlFor="exigirConfirmacaoEmail"
                className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <span>Solicitar confirmação de leitura no cliente de e-mail e no HUB</span>
                <Badge variant="outline" className="text-[9px] font-normal text-slate-500">
                  Rastreabilidade SGQ
                </Badge>
              </label>
            </div>
          </div>

          {/* Destinatários (Usuários reais do HUB) */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#004C97]" />
                  Destinatários Oficiais (Perfis do HUB)
                </span>
                <p className="text-[11px] text-slate-500">
                  <strong>{recipientsList.length}</strong> no campo Para &bull;{' '}
                  <strong>{ccList.length}</strong> em cópia (CC) &bull; Digitação manual
                  desabilitada por governança
                </p>
              </div>

              {/* Ações rápidas */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllParticipants}
                  className="text-[10px] h-7 px-2 font-semibold text-[#004C97] border-blue-200 hover:bg-blue-50"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Participantes ({meetingParticipants.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleClearAll}
                  className="text-[10px] h-7 px-2 font-semibold text-slate-500"
                >
                  <Square className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
            </div>

            {/* Busca e Setor */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar destinatário cadastrado no HUB por nome, setor ou e-mail..."
                  className="pl-8 text-xs h-8"
                />
              </div>
              <div className="sm:col-span-4">
                <select
                  value={filterSector}
                  onChange={(e) => setFilterSector(e.target.value)}
                  className="w-full text-xs h-8 border border-slate-300 rounded-md px-2 bg-white font-medium"
                >
                  <option value="TODOS">Todos os setores</option>
                  {availableSectors.map((sec) => (
                    <option key={sec} value={sec}>
                      Setor: {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Atalhos por Setor */}
            {availableSectors.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">
                  Atalhos Setores:
                </span>
                {availableSectors.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSelectBySector(sec)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                  >
                    + {sec}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de Destinatários com botões Para / CC */}
            <div className="border rounded-md max-h-52 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {loadingUsers ? (
                <div className="p-6 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-[#004C97]" />
                  <span>Carregando usuários reais cadastrados...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Nenhum usuário cadastrado encontrado.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isRecipient = selectedRecipientIds.has(u.id)
                  const isCc = selectedCcIds.has(u.id)

                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleRecipient(u.id)}
                      className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                        isRecipient
                          ? 'bg-blue-50/90'
                          : isCc
                            ? 'bg-amber-50/80'
                            : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          checked={isRecipient}
                          onCheckedChange={() => toggleRecipient(u.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{u.name}</span>
                            {u.isParticipant && (
                              <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200 text-[9px] py-0">
                                Participante
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{u.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">
                          {u.sector || 'Operação'}
                        </Badge>

                        {/* Botão Cópia (CC) */}
                        <button
                          type="button"
                          onClick={(e) => toggleCc(u.id, e)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                            isCc
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                          title="Alternar envio em Cópia (CC)"
                        >
                          CC
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>PDF anexado &bull; Rastreabilidade total em pcp_audit_logs</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendEmail}
              disabled={
                submitting || generatingPdf || !!pdfGenerationError || recipientsList.length === 0
              }
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8 gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processando envio...
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  Enviar E-mail ({recipientsList.length + ccList.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EnviarEmailAtaModal
