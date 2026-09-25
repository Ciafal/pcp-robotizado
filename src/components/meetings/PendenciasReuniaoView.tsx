import React, { useState, useEffect } from 'react'
import {
  Clock,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  ExternalLink,
  Target,
  ShieldCheck,
  Bell,
  ChevronDown,
  ChevronRight,
  Send,
  Calendar,
  Building,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import {
  PCPMeetingPendencyRecord,
  PCPMeetingRecord,
  PCPMeetingAtaRecord,
  PendencyStatus,
  PendencyPriority,
  PendencyUpdateHistoryEntry,
} from '@/types/pcp-meeting'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { getPlantNow } from '@/lib/temporal-utils'
import pb from '@/lib/pocketbase/client'

interface PendenciasReuniaoViewProps {
  onNavigateTab?: (tab: string, meetingId?: string) => void
}

export const PendenciasReuniaoView: React.FC<PendenciasReuniaoViewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [pendencies, setPendencies] = useState<PCPMeetingPendencyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterArea, setFilterArea] = useState<string>('TODAS')

  // Reuniões e ATAs para contexto obrigatório de criação
  const [availableMeetings, setAvailableMeetings] = useState<PCPMeetingRecord[]>([])
  const [availableAtas, setAvailableAtas] = useState<PCPMeetingAtaRecord[]>([])

  // Modal: Nova Pendência (Contexto Obrigatório: Reunião -> ATA -> Pendência)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [selectedMeetingId, setSelectedMeetingId] = useState('')
  const [selectedAtaId, setSelectedAtaId] = useState('')
  const [loadingAtas, setLoadingAtas] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newArea, setNewArea] = useState('PCP')
  const [newAction, setNewAction] = useState('')
  const [newResponsible, setNewResponsible] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [newPriority, setNewPriority] = useState<PendencyPriority>('ALTA')

  // Modal: Editar / Atualizar Pendência com Histórico Cumulativo
  const [editingTarget, setEditingTarget] = useState<PCPMeetingPendencyRecord | null>(null)
  const [editStatus, setEditStatus] = useState<PendencyStatus>('ABERTA')
  const [editEvidence, setEditEvidence] = useState('')
  const [editNote, setEditNote] = useState('')
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true)
  const [savingUpdate, setSavingUpdate] = useState(false)

  // Modal: Enviar Alerta
  const [alertTarget, setAlertTarget] = useState<PCPMeetingPendencyRecord | null>(null)
  const [alertRecipientEmail, setAlertRecipientEmail] = useState('')
  const [sendingAlert, setSendingAlert] = useState(false)

  // Modal: Gerar Ação na Gestão de Performance (5W2H) com Confirmação Humana
  const [performanceTarget, setPerformanceTarget] = useState<PCPMeetingPendencyRecord | null>(null)
  const [what, setWhat] = useState('')
  const [why, setWhy] = useState('')
  const [who, setWho] = useState('')
  const [when, setWhen] = useState('')
  const [where, setWhere] = useState('')
  const [how, setHow] = useState('')
  const [generatingPerf, setGeneratingPerf] = useState(false)

  const userContext = {
    id: user?.id,
    name: user?.name || 'Coordenação PCP',
  }

  const loadPendencies = async () => {
    try {
      setLoading(true)
      const list = await pcpMeetingFatia1Service.listPendencies({
        status: filterStatus,
        area: filterArea,
      })
      setPendencies(list)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar pendências',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMeetings = async () => {
    try {
      const meetings = await pcpMeetingFatia1Service.listMeetings()
      setAvailableMeetings(meetings)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadPendencies()
    loadMeetings()
  }, [filterStatus, filterArea])

  // Quando a reunião de origem é selecionada no modal de criação, buscar suas ATAs
  useEffect(() => {
    if (!selectedMeetingId) {
      setAvailableAtas([])
      setSelectedAtaId('')
      return
    }

    const fetchAtas = async () => {
      setLoadingAtas(true)
      try {
        const res = await pb.collection('pcp_meeting_ata').getFullList<PCPMeetingAtaRecord>({
          filter: `meeting_id = '${selectedMeetingId}'`,
          sort: '-version',
        })
        setAvailableAtas(res)
        if (res.length > 0) {
          setSelectedAtaId(res[0].id || '')
        } else {
          setSelectedAtaId('')
        }
      } catch {
        setAvailableAtas([])
        setSelectedAtaId('')
      } finally {
        setLoadingAtas(false)
      }
    }

    fetchAtas()
  }, [selectedMeetingId])

  const selectedMeetingObj = availableMeetings.find((m) => m.id === selectedMeetingId)
  const selectedAtaObj = availableAtas.find((a) => a.id === selectedAtaId)

  // Salvar nova pendência com rastreabilidade Reunião -> ATA -> Pendência
  const handleCreatePendency = async () => {
    if (!selectedMeetingId) {
      toast({
        title: 'Reunião de Origem Obrigatória',
        description:
          'Toda pendência do PCP deve obrigatoriamente originar-se de uma Reunião existente.',
        variant: 'destructive',
      })
      return
    }

    if (!selectedAtaId) {
      toast({
        title: 'ATA de Origem Obrigatória',
        description:
          'Toda pendência deve estar formalmente vinculada à ATA da reunião selecionada.',
        variant: 'destructive',
      })
      return
    }

    if (!newSubject.trim() || !newAction.trim() || !newResponsible.trim() || !newDeadline) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha assunto, ação, responsável e prazo final.',
        variant: 'destructive',
      })
      return
    }

    try {
      const ataCode = selectedAtaObj
        ? `ATA-${selectedMeetingObj?.meeting_code || 'REUNIAO'}-V${selectedAtaObj.version}`
        : `ATA-${selectedMeetingObj?.meeting_code || 'REUNIAO'}-V1`

      await pcpMeetingFatia1Service.createPendency(
        {
          meeting_id: selectedMeetingId,
          meeting_code: selectedMeetingObj?.meeting_code || '',
          meeting_date: selectedMeetingObj?.meeting_date || '',
          company: selectedMeetingObj?.company || 'CIAFAL',
          ata_id: selectedAtaId,
          ata_code: ataCode,
          origin_week: selectedMeetingObj?.week || 1,
          origin_year: selectedMeetingObj?.year || 2026,
          area: newArea,
          subject: newSubject.trim(),
          action: newAction.trim(),
          responsible: newResponsible.trim(),
          deadline: newDeadline,
          priority: newPriority,
          status: 'ABERTA',
          origin: `Reunião ${selectedMeetingObj?.meeting_code || ''} · ${ataCode}`,
        },
        userContext,
      )

      setIsNewOpen(false)
      setSelectedMeetingId('')
      setSelectedAtaId('')
      setNewSubject('')
      setNewAction('')
      setNewResponsible('')
      setNewDeadline('')
      await loadPendencies()

      toast({
        title: 'Pendência Registrada com Sucesso!',
        description: `Rastreabilidade confirmada: ${selectedMeetingObj?.meeting_code} ➔ ${ataCode}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar pendência',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Atualizar pendência mantendo mesmo ID e inserindo histórico cumulativo
  const handleUpdatePendency = async () => {
    if (!editingTarget) return
    try {
      setSavingUpdate(true)
      const updated = await pcpMeetingFatia1Service.updatePendency(
        editingTarget.id!,
        {
          status: editStatus,
          evidence: editEvidence,
          last_update_note: editNote,
        },
        userContext,
        editNote ? `Atualização de status para ${editStatus}` : undefined,
      )

      toast({
        title: 'Pendência Atualizada!',
        description: `Pendência ${updated.pendency_code} atualizada com sucesso.`,
      })

      setEditingTarget(null)
      await loadPendencies()
    } catch (err: any) {
      toast({
        title: 'Não foi possível atualizar a pendência',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingUpdate(false)
    }
  }

  // Enviar alerta da pendência
  const handleSendAlert = async () => {
    if (!alertTarget) return
    try {
      setSendingAlert(true)
      const res = await pcpMeetingFatia1Service.sendPendencyAlert(alertTarget, userContext, {
        responsibleEmail: alertRecipientEmail.trim() || undefined,
      })

      if (res.hubNotificationSuccess) {
        toast({
          title: `Alerta da pendência ${alertTarget.pendency_code} disparado!`,
          description: res.message,
        })
      } else {
        toast({
          title: 'Aviso sobre envio de alerta',
          description: res.message,
          variant: 'default',
        })
      }

      setAlertTarget(null)
      setAlertRecipientEmail('')
    } catch (err: any) {
      toast({
        title: 'Não foi possível enviar o alerta',
        description: `Motivo: ${err.message || 'Falha na comunicação'}`,
        variant: 'destructive',
      })
    } finally {
      setSendingAlert(false)
    }
  }

  // Gerar ação 5W2H na Gestão de Performance
  const handleCreatePerformanceAction = async () => {
    if (!performanceTarget || !what.trim() || !who.trim() || !when.trim()) {
      toast({
        title: 'Campos obrigatórios do 5W2H',
        description: 'O que, quem e quando são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGeneratingPerf(true)
      const res = await pcpMeetingFatia1Service.createPerformanceActionFromDecision(
        performanceTarget.id!,
        {
          what,
          why,
          who,
          when,
          where,
          how,
        },
        userContext,
      )

      setPerformanceTarget(null)
      await loadPendencies()

      toast({
        title: 'Ação 5W2H Registrada na Gestão de Performance!',
        description: `Ação vinculada bidirecionalmente: ${res.actionId} com confirmação humana.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao vincular ação de performance',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingPerf(false)
    }
  }

  const calculateDaysOpen = (createdDate?: string) => {
    if (!createdDate) return 0
    const created = new Date(createdDate)
    const now = getPlantNow()
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const formatDateTimePtBr = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatDatePtBr = (dateStr?: string) => {
    if (!dateStr) return '-'
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  // Abertura de reuniões e atas com navegação interna
  const handleOpenMeeting = (meetingCodeOrId?: string) => {
    if (!meetingCodeOrId || meetingCodeOrId === 'REUNIAO_MANUAL') return
    const matched = availableMeetings.find(
      (m) => m.id === meetingCodeOrId || m.meeting_code === meetingCodeOrId,
    )
    if (onNavigateTab) {
      onNavigateTab('preparacao', matched ? matched.id : meetingCodeOrId)
    }
  }

  const handleOpenAta = (meetingCodeOrId?: string) => {
    if (!meetingCodeOrId || meetingCodeOrId === 'REUNIAO_MANUAL') return
    const matched = availableMeetings.find(
      (m) => m.id === meetingCodeOrId || m.meeting_code === meetingCodeOrId,
    )
    if (onNavigateTab) {
      onNavigateTab('atas', matched ? matched.id : meetingCodeOrId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topo Executivo */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Pendências e Ações das Reuniões de PCP
            </h2>
            <p className="text-xs text-slate-500">
              Rastreabilidade formal obrigatória Reunião ➔ ATA ➔ Pendência, alertas corporativos HUB
              e histórico de atualizações cronológico e imutável.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPendencies}
              disabled={loading}
              className="text-xs font-semibold h-8 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsNewOpen(true)
                if (availableMeetings.length > 0 && !selectedMeetingId) {
                  setSelectedMeetingId(availableMeetings[0].id)
                }
              }}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> + Nova Pendência
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="ABERTA">ABERTA</option>
              <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
              <option value="AGUARDANDO_TERCEIRO">AGUARDANDO TERCEIRO</option>
              <option value="CONCLUIDA">CONCLUÍDA</option>
              <option value="CANCELADA">CANCELADA</option>
              <option value="VENCIDA">VENCIDA</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Área</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="TODAS">Todas as Áreas</option>
              <option value="PCP">PCP</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="Preparação L2">Preparação L2</option>
              <option value="Estoque">Estoque</option>
              <option value="Qualidade">Qualidade</option>
              <option value="Comercial">Comercial</option>
              <option value="SDC">SDC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Pendências */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Pendências da Reunião Anterior e Histórico Ativo
          </CardTitle>
          <span className="text-xs text-slate-500 font-mono">
            {pendencies.length} pendência(s) encontrada(s)
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Origem</th>
                  <th className="p-3">Área</th>
                  <th className="p-3">Assunto / Ação</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Prazo</th>
                  <th className="p-3 text-center">Dias Aberto</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendencies.map((p) => {
                  const isVencida =
                    (p.status === 'ABERTA' || p.status === 'EM_ANDAMENTO') &&
                    new Date(p.deadline + 'T23:59:59') < getPlantNow()

                  const meetingDisplayCode =
                    p.meeting_code || (p.meeting_id !== 'REUNIAO_MANUAL' ? p.meeting_id : null)
                  const ataDisplayCode =
                    p.ata_code || (p.ata_id ? `ATA-${p.ata_id.slice(0, 8)}` : null)

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.pendency_code}</td>
                      <td className="p-3 text-xs leading-snug">
                        {p.origem_pendente_regularizacao || !meetingDisplayCode ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              <AlertTriangle className="w-3 h-3" /> Origem a regularizar
                            </span>
                            <div className="font-mono text-[11px] text-slate-500">
                              S{p.origin_week}/{p.origin_year}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {/* Linha 1: Código da Reunião clicável */}
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenMeeting(p.meeting_id || p.meeting_code)}
                                className="font-mono font-bold text-[#004C97] hover:underline hover:text-blue-900 text-xs inline-flex items-center gap-1"
                                title={`Abrir reunião ${meetingDisplayCode}`}
                              >
                                {meetingDisplayCode}
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            </div>
                            {/* Linha 2: ATA e Semana clicáveis */}
                            <div className="text-[11px] text-slate-600 font-mono">
                              <button
                                type="button"
                                onClick={() => handleOpenAta(p.meeting_id || p.meeting_code)}
                                className="hover:underline text-slate-700 hover:text-[#004C97]"
                                title="Abrir ATA correspondente"
                              >
                                {ataDisplayCode || 'ATA Sem Registro'} &bull; S{p.origin_week}/
                                {p.origin_year}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{p.area}</td>
                      <td className="p-3 max-w-sm">
                        <div className="font-semibold text-slate-900">{p.subject}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{p.action}</div>
                        {p.performance_action_id && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-700 font-bold font-mono">
                            <Target className="w-3 h-3" /> Gestão Performance:{' '}
                            {p.performance_action_id}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">{p.responsible}</td>
                      <td className="p-3 font-mono">
                        <span
                          className={`font-semibold ${
                            isVencida ? 'text-rose-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {formatDatePtBr(p.deadline)}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-semibold text-slate-600">
                        {calculateDaysOpen(p.created)}d
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            p.status === 'CONCLUIDA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isVencida
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isVencida ? 'VENCIDA' : p.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Ação 1: Enviar Alerta */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAlertTarget(p)
                              setAlertRecipientEmail('')
                            }}
                            className="h-7 text-xs font-semibold px-2 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                            title="Enviar lembrete da pendência por Notificação HUB e E-mail"
                          >
                            <Bell className="w-3.5 h-3.5 mr-1" /> Alerta
                          </Button>

                          {/* Ação 2: Editar / Atualizar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTarget(p)
                              setEditStatus(p.status)
                              setEditEvidence(p.evidence || '')
                              setEditNote('')
                              setIsHistoryExpanded(true)
                            }}
                            className="h-7 text-xs font-semibold px-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                            title="Atualizar status, nota e histórico da pendência"
                          >
                            <Edit2 className="w-3 h-3 mr-1" /> Editar
                          </Button>

                          {/* Ação 3: 5W2H */}
                          {!p.performance_action_id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPerformanceTarget(p)
                                setWhat(p.action)
                                setWhy(p.subject)
                                setWho(p.responsible)
                                setWhen(p.deadline)
                                setWhere(p.area)
                                setHow('Execução conforme plano de recuperação acordado no PCP')
                              }}
                              className="h-7 text-[10px] font-bold text-blue-700 border-blue-200 hover:bg-blue-50"
                              title="Gerar Ação 5W2H na Gestão de Performance com confirmação humana"
                            >
                              5W2H
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL: NOVA PENDÊNCIA (RASTREABILIDADE OBRIGATÓRIA REUNIÃO -> ATA -> PENDÊNCIA) */}
      {/* ========================================================================= */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Registrar Nova Pendência da Reunião
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Governança SGQ: Toda pendência deve possuir vínculo obrigatório com Reunião e ATA
              existentes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {/* Bloco de Rastreabilidade e Origem Obrigatória */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#004C97]" /> Origem da Pendência (Obrigatória)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Reunião de Origem *
                  </label>
                  <select
                    value={selectedMeetingId}
                    onChange={(e) => setSelectedMeetingId(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white font-medium"
                  >
                    <option value="">Selecione uma reunião...</option>
                    {availableMeetings.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.meeting_code} — S{m.week}/{m.year} ({m.title})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ATA de Origem *</label>
                  <select
                    value={selectedAtaId}
                    onChange={(e) => setSelectedAtaId(e.target.value)}
                    disabled={!selectedMeetingId || loadingAtas}
                    className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white font-medium disabled:opacity-50"
                  >
                    {loadingAtas ? (
                      <option value="">Carregando ATAs...</option>
                    ) : availableAtas.length === 0 ? (
                      <option value="">Nenhuma ATA encontrada para esta reunião</option>
                    ) : (
                      availableAtas.map((a) => (
                        <option key={a.id} value={a.id}>
                          ATA-V{a.version} ({a.status}) — {a.template_code || '8.1.001-R002'}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Resumo somente leitura dos dados herdados */}
              {selectedMeetingObj && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Código Reunião:</span>
                    <strong className="text-slate-900 font-mono">
                      {selectedMeetingObj.meeting_code}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Semana:</span>
                    <span className="font-semibold text-slate-800">
                      S{selectedMeetingObj.week}/{selectedMeetingObj.year}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Data Reunião:</span>
                    <span>{formatDatePtBr(selectedMeetingObj.meeting_date)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Empresa:</span>
                    <span className="font-semibold">{selectedMeetingObj.company || 'CIAFAL'}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assunto *</label>
              <Input
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="Ex: Regularização de saldo físico vs sistêmico em pátio"
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ação a Executar *</label>
              <Textarea
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Descreva a ação prática e mensurável a ser realizada..."
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Área</label>
                <select
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                >
                  <option value="PCP">PCP</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="Preparação L2">Preparação L2</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Qualidade">Qualidade</option>
                  <option value="Comercial">Comercial</option>
                  <option value="SDC">SDC</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prioridade</label>
                <select
                  value={newPriority}
                  onChange={(e: any) => setNewPriority(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                >
                  <option value="CRITICA">CRÍTICA</option>
                  <option value="ALTA">ALTA</option>
                  <option value="MEDIA">MÉDIA</option>
                  <option value="BAIXA">BAIXA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Responsável *</label>
                <Input
                  value={newResponsible}
                  onChange={(e) => setNewResponsible(e.target.value)}
                  placeholder="Nome do responsável corporativo"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prazo Final *</label>
                <Input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePendency}
              disabled={!selectedMeetingId || !selectedAtaId}
              className="bg-[#004C97] text-white font-bold disabled:opacity-50"
            >
              Gravar Pendência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ATUALIZAR PENDÊNCIA (COM HISTÓRICO CUMULATIVO E BLOCO DE ORIGEM) */}
      {/* ========================================================================= */}
      <Dialog open={!!editingTarget} onOpenChange={() => setEditingTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Atualizar Pendência {editingTarget?.pendency_code}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {editingTarget?.priority}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Altere o status, registre nota de andamento e preserve todo o histórico de auditoria.
            </DialogDescription>
          </DialogHeader>

          {editingTarget && (
            <div className="space-y-3 py-2 text-xs">
              {/* Bloco somente leitura de Origem com links */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wide block">
                  Origem da Pendência
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block">Reunião:</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenMeeting(editingTarget.meeting_id || editingTarget.meeting_code)
                        setEditingTarget(null)
                      }}
                      className="font-mono font-bold text-[#004C97] hover:underline"
                    >
                      {editingTarget.meeting_code || editingTarget.meeting_id || 'Não informada'}
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ATA:</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenAta(editingTarget.meeting_id || editingTarget.meeting_code)
                        setEditingTarget(null)
                      }}
                      className="font-mono font-bold text-[#004C97] hover:underline"
                    >
                      {editingTarget.ata_code ||
                        (editingTarget.ata_id
                          ? `ATA-${editingTarget.ata_id.slice(0, 8)}`
                          : 'Não informada')}
                    </button>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Semana / Data:</span>
                    <span>
                      S{editingTarget.origin_week}/{editingTarget.origin_year} &bull;{' '}
                      {formatDatePtBr(editingTarget.meeting_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Responsável / Prazo:</span>
                    <span className="font-semibold text-slate-800">
                      {editingTarget.responsible} ({formatDatePtBr(editingTarget.deadline)})
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e: any) => setEditStatus(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white font-medium"
                >
                  <option value="ABERTA">ABERTA</option>
                  <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
                  <option value="AGUARDANDO_TERCEIRO">AGUARDANDO TERCEIRO</option>
                  <option value="CONCLUIDA">CONCLUÍDA</option>
                  <option value="CANCELADA">CANCELADA</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nota de Atualização
                </label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Descreva o andamento atual, alinhamentos ou justificativas da alteração..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Evidência de Conclusão / Comprovante
                </label>
                <Input
                  value={editEvidence}
                  onChange={(e) => setEditEvidence(e.target.value)}
                  placeholder="Número de OP, link SGQ ou referência de documento SAP"
                  className="text-xs font-mono"
                />
              </div>

              {/* Seção: Histórico de Atualizações (recolhível e imutável) */}
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <button
                  type="button"
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full px-3 py-2 bg-slate-100 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-200/70"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Histórico de Atualizações ({editingTarget.update_history?.length || 0})
                  </span>
                  {isHistoryExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {isHistoryExpanded && (
                  <div className="p-3 space-y-2 max-h-48 overflow-y-auto bg-slate-50/50">
                    {!editingTarget.update_history || editingTarget.update_history.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">
                        Nenhum histórico anterior registrado para esta pendência.
                      </p>
                    ) : (
                      editingTarget.update_history.map((hist, idx) => (
                        <div
                          key={hist.id || idx}
                          className="p-2 bg-white rounded border border-slate-200 text-[11px] space-y-1 shadow-2xs"
                        >
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-semibold text-slate-700">{hist.user_name}</span>
                            <span className="font-mono text-[10px]">
                              {formatDateTimePtBr(hist.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Status:</span>
                            <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">
                              {hist.status_anterior} ➔ {hist.status_novo}
                            </span>
                          </div>
                          {hist.nota && (
                            <p className="text-slate-800 font-medium text-xs pl-1 border-l-2 border-slate-300">
                              {hist.nota}
                            </p>
                          )}
                          {hist.evidencia && (
                            <div className="text-[10px] text-slate-500 font-mono">
                              Evidência:{' '}
                              <span className="font-semibold text-slate-700">{hist.evidencia}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  if (editingTarget) {
                    setAlertTarget(editingTarget)
                    setAlertRecipientEmail('')
                  }
                }}
                className="text-amber-700 border-amber-200 hover:bg-amber-50 text-xs font-semibold h-8"
              >
                <Bell className="w-3.5 h-3.5 mr-1" /> 🔔 Enviar Lembrete
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingTarget(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleUpdatePendency}
                disabled={savingUpdate}
                className="bg-[#004C97] text-white font-bold"
              >
                {savingUpdate ? 'Salvando...' : 'Salvar Atualização'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ENVIAR ALERTA (HUB + E-MAIL CORPORATIVO COM TRATAMENTO SMTP) */}
      {/* ========================================================================= */}
      <Dialog open={!!alertTarget} onOpenChange={() => setAlertTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-600" /> Enviar Lembrete da Pendência
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O responsável receberá uma notificação no HUB e um e-mail com os dados desta
              pendência.
            </DialogDescription>
          </DialogHeader>

          {alertTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {alertTarget.pendency_code}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {alertTarget.status}
                  </Badge>
                </div>
                <div className="font-semibold text-slate-800">{alertTarget.subject}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block">Responsável:</span>
                    <strong className="text-slate-900">{alertTarget.responsible}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Prazo:</span>
                    <strong className="text-slate-900 font-mono">
                      {formatDatePtBr(alertTarget.deadline)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Reunião de Origem:</span>
                    <span className="font-mono">
                      {alertTarget.meeting_code || alertTarget.meeting_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">ATA de Origem:</span>
                    <span className="font-mono">
                      {alertTarget.ata_code || alertTarget.ata_id || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  E-mail do Responsável (opcional se cadastrado no HUB)
                </label>
                <Input
                  type="email"
                  value={alertRecipientEmail}
                  onChange={(e) => setAlertRecipientEmail(e.target.value)}
                  placeholder={`${alertTarget.responsible.toLowerCase().replace(/\s+/g, '.')}@ciafal.com.br`}
                  className="text-xs font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Se omitido, o sistema utilizará o e-mail corporativo correspondente ao usuário.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertTarget(null)}
              disabled={sendingAlert}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendAlert}
              disabled={sendingAlert}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingAlert ? 'Enviando Alerta...' : 'Enviar Alerta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: GERAR AÇÃO NA GESTÃO DE PERFORMANCE (5W2H COM CONFIRMAÇÃO HUMANA) */}
      {/* ========================================================================= */}
      <Dialog open={!!performanceTarget} onOpenChange={() => setPerformanceTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" /> Gerar Ação na Gestão de Performance
              (5W2H)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              <strong>Regra SGQ:</strong> Exige confirmação humana expressa. Vincula a pendência
              bidirecionalmente à Gestão de Performance do HUB.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                O Que (What) — Ação *
              </label>
              <Input
                value={what}
                onChange={(e) => setWhat(e.target.value)}
                className="text-xs font-medium"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Por Que (Why) — Causa
              </label>
              <Input value={why} onChange={(e) => setWhy(e.target.value)} className="text-xs" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quem (Who) *</label>
                <Input value={who} onChange={(e) => setWho(e.target.value)} className="text-xs" />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Quando (When) *</label>
                <Input
                  type="date"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Onde (Where)</label>
                <Input
                  value={where}
                  onChange={(e) => setWhere(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Como (How)</label>
                <Input value={how} onChange={(e) => setHow(e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPerformanceTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePerformanceAction}
              disabled={generatingPerf}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
            >
              {generatingPerf ? 'Gerando...' : 'Confirmar e Vincular 5W2H'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PendenciasReuniaoView
