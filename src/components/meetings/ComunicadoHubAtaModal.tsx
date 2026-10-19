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
  Bell,
  Search,
  Users,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  Building2,
  Info,
} from 'lucide-react'
import { PCPMeetingAtaRecord, PCPMeetingRecord } from '@/types/pcp-meeting'
import { DestinatarioAtaItem } from '@/types/pcp-ata-distribuicao'
import pcpAtaDistribuicaoService from '@/services/pcp-ata-distribuicao-service'
import { getAtaPdfFileName } from '@/services/pcp-ata-pdf-generator'
import pb from '@/lib/pocketbase/client'

export interface ComunicadoHubAtaModalProps {
  isOpen: boolean
  onClose: () => void
  meeting: PCPMeetingRecord
  ata: PCPMeetingAtaRecord
  onSuccess?: () => void
}

export const ComunicadoHubAtaModal: React.FC<ComunicadoHubAtaModalProps> = ({
  isOpen,
  onClose,
  meeting,
  ata,
  onSuccess,
}) => {
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [allUsers, setAllUsers] = useState<DestinatarioAtaItem[]>([])
  const [meetingParticipants, setMeetingParticipants] = useState<DestinatarioAtaItem[]>([])
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSector, setFilterSector] = useState<string>('TODOS')

  // Campos do Comunicado
  const [assunto, setAssunto] = useState(`ATA Reunião PCP — ${meeting.meeting_date || ''}`)
  const [mensagemComplementar, setMensagemComplementar] = useState('')
  const [exigirConfirmacao, setExigirConfirmacao] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isMinuta = (ata as any).is_minuta || ata.status === 'MINUTA' || ata.ata_type === 'PREVIA'
  const pdfNomeArquivo = getAtaPdfFileName(meeting.meeting_code, meeting.meeting_date)

  const currentUser = useMemo(() => {
    const rec = (pb.authStore.record || pb.authStore.model) as any
    return {
      id: rec?.id || '',
      name: rec?.name || 'Administrador PCP',
      email: rec?.email || 'pcp@ciafal.com.br',
      role: rec?.role || 'PCP_ADMIN',
    }
  }, [])

  // Carrega usuários reais e participantes da reunião
  useEffect(() => {
    if (!isOpen) return

    setAssunto(`ATA Reunião PCP — ${meeting.meeting_date || ''}`)
    setMensagemComplementar('')
    setExigirConfirmacao(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setSearchQuery('')
    setFilterSector('TODOS')

    const loadData = async () => {
      setLoadingUsers(true)
      try {
        const [users, parts] = await Promise.all([
          pcpAtaDistribuicaoService.listarUsuariosReaisHub(),
          pcpAtaDistribuicaoService.listarParticipantesReuniao(meeting.id),
        ])

        // Marca quem é participante da reunião
        const partEmails = new Set(parts.map((p) => p.email.toLowerCase()).filter(Boolean))
        const partsByName = new Set(parts.map((p) => p.name.toLowerCase()).filter(Boolean))

        const mergedUsers = users.map((u) => {
          const isPart =
            (u.email && partEmails.has(u.email.toLowerCase())) ||
            partsByName.has(u.name.toLowerCase())
          return {
            ...u,
            isParticipant: isPart,
          }
        })

        // Se houver participantes na reunião que não estavam em 'users', adiciona
        for (const p of parts) {
          if (
            !mergedUsers.some((u) => u.email && u.email.toLowerCase() === p.email.toLowerCase())
          ) {
            mergedUsers.push({
              ...p,
              isParticipant: true,
            })
          }
        }

        setAllUsers(mergedUsers)
        setMeetingParticipants(parts)

        // Por padrão, já pré-seleciona os participantes da reunião
        const initialSelected = new Set<string>()
        mergedUsers.forEach((u) => {
          if (u.isParticipant) {
            initialSelected.add(u.id)
          }
        })
        setSelectedRecipientIds(initialSelected)
      } catch (err) {
        console.warn('Erro ao carregar dados:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    loadData()
  }, [isOpen, meeting, ata])

  // Lista de setores disponíveis
  const availableSectors = useMemo(() => {
    const s = new Set<string>()
    allUsers.forEach((u) => {
      if (u.sector) s.add(u.sector)
    })
    return Array.from(s).sort()
  }, [allUsers])

  // Usuários filtrados por busca e setor
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

  // Ações de Seleção
  const toggleRecipient = (id: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAllFiltered = () => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      filteredUsers.forEach((u) => next.add(u.id))
      return next
    })
  }

  const handleDeselectAllFiltered = () => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      filteredUsers.forEach((u) => next.delete(u.id))
      return next
    })
  }

  const handleSelectAllParticipants = () => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      allUsers.forEach((u) => {
        if (u.isParticipant) next.add(u.id)
      })
      return next
    })
  }

  const handleSelectBySector = (sector: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev)
      allUsers.forEach((u) => {
        if (u.sector === sector) next.add(u.id)
      })
      return next
    })
  }

  // Destinatários finais
  const selectedRecipients = useMemo(() => {
    return allUsers.filter((u) => selectedRecipientIds.has(u.id))
  }, [allUsers, selectedRecipientIds])

  // Submissão
  const handlePublish = async () => {
    if (selectedRecipients.length === 0) {
      setErrorMsg('Selecione pelo menos um destinatário para publicar o comunicado.')
      return
    }

    if (!assunto.trim()) {
      setErrorMsg('O assunto do comunicado é obrigatório.')
      return
    }

    setSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await pcpAtaDistribuicaoService.publicarComunicadoNoHub({
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
        destinatarios: selectedRecipients,
        pdfNomeArquivo,
        currentUser,
      })

      setSuccessMsg(
        `Comunicado publicado com sucesso no HUB para ${selectedRecipients.length} usuário(s)! Notificações individuais e solicitação de leitura registradas.`,
      )
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao publicar comunicado no HUB.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-xl">
        {/* Cabeçalho */}
        <DialogHeader className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Publicar Comunicado no HUB &bull; Central de ATAs
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Notificação oficial corporativa vinculada à versão auditada da ATA
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

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Card Resumo da ATA */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wide text-[10px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#004C97]" />
                Dados da ATA Selecionada
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                PDF SGQ: <strong>{pdfNomeArquivo}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Código / Reunião</span>
                <strong className="text-slate-800 font-mono">{meeting.meeting_code}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Data da Reunião</span>
                <strong className="text-slate-800 font-mono">{meeting.meeting_date}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">Status</span>
                <strong className="text-slate-800">{ata.status || meeting.status}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] uppercase">
                  Responsável Emissão
                </span>
                <strong className="text-slate-800 truncate block">{currentUser.name}</strong>
              </div>
            </div>
          </div>

          {/* Assunto e Mensagem */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Assunto do Comunicado <span className="text-rose-500">*</span>
              </label>
              <Input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex: ATA Reunião PCP — 17/03/2025"
                className="text-xs h-8 font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Mensagem Complementar (Opcional)
              </label>
              <Textarea
                value={mensagemComplementar}
                onChange={(e) => setMensagemComplementar(e.target.value)}
                placeholder="Insira orientações aos destinatários, prazos específicos ou observações da coordenação do PCP..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="exigirConfirmacao"
                checked={exigirConfirmacao}
                onCheckedChange={(c) => setExigirConfirmacao(!!c)}
              />
              <label
                htmlFor="exigirConfirmacao"
                className="text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5"
              >
                <span>Exigir confirmação formal de leitura nesta ATA</span>
                <Badge variant="outline" className="text-[9px] font-normal text-slate-500">
                  Padrão SGQ
                </Badge>
              </label>
            </div>
          </div>

          {/* Destinatários (Usuários Reais HUB) */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div>
                <span className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#004C97]" />
                  Destinatários do HUB CIAFAL
                </span>
                <p className="text-[11px] text-slate-500">
                  {selectedRecipients.length} de {allUsers.length} usuário(s) selecionado(s)
                </p>
              </div>

              {/* Botões Rápidos */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllParticipants}
                  className="text-[10px] h-7 px-2 font-semibold text-[#004C97] border-blue-200 hover:bg-blue-50"
                  title="Selecionar quem participou desta reunião"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Participantes da Reunião ({meetingParticipants.length})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectAllFiltered}
                  className="text-[10px] h-7 px-2 font-semibold"
                >
                  <CheckSquare className="w-3 h-3 mr-1" /> Marcar Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDeselectAllFiltered}
                  className="text-[10px] h-7 px-2 font-semibold text-slate-500"
                >
                  <Square className="w-3 h-3 mr-1" /> Limpar
                </Button>
              </div>
            </div>

            {/* Filtros de Busca e Setor */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, e-mail, função ou setor..."
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

            {/* Atalhos Rápidos por Setor */}
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

            {/* Lista com Checkbox */}
            <div className="border rounded-md max-h-52 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {loadingUsers ? (
                <div className="p-6 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-[#004C97]" />
                  <span>Carregando usuários reais cadastrados no HUB...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  Nenhum usuário encontrado para os critérios de busca.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = selectedRecipientIds.has(u.id)
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleRecipient(u.id)}
                      className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50/80' : 'hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Checkbox
                          checked={isChecked}
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

                      <div className="text-right">
                        <Badge variant="outline" className="text-[9px]">
                          {u.sector || 'Operação'}
                        </Badge>
                        <span className="block text-[9px] text-slate-400">{u.role}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 flex flex-row items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Disponibiliza a ATA oficial e cria notificações no HUB.</span>
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
              onClick={handlePublish}
              disabled={submitting || selectedRecipients.length === 0}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8 gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  Publicar Comunicado ({selectedRecipients.length})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ComunicadoHubAtaModal
