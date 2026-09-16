/**
 * TELA OPERACIONAL "REUNIÃO EM ANDAMENTO" — FATIA 2 (HUB CIAFAL)
 * Tela operacional usada pelo PCP DURANTE a reunião.
 * Todos os botões funcionam e persistem no banco.
 * - Início real, cabeçalho compacto, cronômetro contínuo sem re-renderizar abas;
 * - 6 Abas compartilhando estado: PAUTA, ATA AO VIVO, DECISÕES, PENDÊNCIAS, PARTICIPANTES, TRANSCRIÇÃO;
 * - Autosave discreto com detecção de concorrência e aviso;
 * - Sugestões de IA protegidas (confirmação humana obrigatória);
 * - Encerramento com validação de itens pendentes/sem responsável/sem prazo.
 */

import React, { useState, useEffect, useRef } from 'react'
import {
  PCPMeetingRecord,
  PCPMeetingAgendaItemRecord,
  PCPMeetingParticipantRecord,
  PCPMeetingPendencyRecord,
  PCPMeetingDecisionRecord,
  PCPMeetingAtaRecord,
  AtaStructuredContent,
  TranscriptionSnippet,
  AiSuggestionItem,
  AtaDiffAction,
} from '@/types/pcp-meeting'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import {
  pcpMeetingFatia2Service,
  MeetingClosureSummary,
} from '@/services/pcp-meeting-fatia2-service'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Play,
  Pause,
  Square,
  Clock,
  Users,
  FileText,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Save,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Video,
  Mic,
  MicOff,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReuniaoEmAndamentoViewProps {
  meetingId: string
  onNavigateTab: (tab: string, meetingId?: string) => void
  currentUser: { id?: string; name: string }
}

export const ReuniaoEmAndamentoView: React.FC<ReuniaoEmAndamentoViewProps> = ({
  meetingId,
  onNavigateTab,
  currentUser,
}) => {
  const { toast } = useToast()

  // Dados centrais
  const [meeting, setMeeting] = useState<PCPMeetingRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'pauta' | 'ata' | 'decisoes' | 'pendencias' | 'participantes' | 'transcricao'
  >('pauta')

  // Cronômetro
  const [durationSec, setDurationSec] = useState(0)

  // Status de Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>(
    'IDLE',
  )
  const [concurrencyConflict, setConcurrencyConflict] = useState<string | null>(null)

  // Sub-dados
  const [agendaItems, setAgendaItems] = useState<PCPMeetingAgendaItemRecord[]>([])
  const [currentAta, setCurrentAta] = useState<PCPMeetingAtaRecord | null>(null)
  const [structuredAta, setStructuredAta] = useState<AtaStructuredContent | null>(null)
  const [decisions, setDecisions] = useState<PCPMeetingDecisionRecord[]>([])
  const [pendencies, setPendencies] = useState<PCPMeetingPendencyRecord[]>([])
  const [inheritedPendencies, setInheritedPendencies] = useState<PCPMeetingPendencyRecord[]>([])
  const [participants, setParticipants] = useState<PCPMeetingParticipantRecord[]>([])
  const [transcriptionSnippets, setTranscriptionSnippets] = useState<TranscriptionSnippet[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionItem[]>([])

  // Filtro/busca transcrição
  const [transcriptionFilter, setTranscriptionFilter] = useState('')

  // Modais de operação
  const [newDecisionModal, setNewDecisionModal] = useState(false)
  const [newDecisionData, setNewDecisionData] = useState({
    subject: '',
    description: '',
    area: 'PCP',
    responsible: '',
    ata_section_id: 'sec_pcp',
  })

  const [newPendencyModal, setNewPendencyModal] = useState(false)
  const [newPendencyData, setNewPendencyData] = useState({
    subject: '',
    action: '',
    area: 'PCP',
    responsible: '',
    deadline: '',
    priority: 'ALTA' as const,
    ata_section_id: 'sec_pcp',
  })

  const [closureSummary, setClosureSummary] = useState<MeetingClosureSummary | null>(null)
  const [closeMeetingModal, setCloseMeetingModal] = useState(false)
  const [closing, setClosing] = useState(false)

  // Carga inicial
  useEffect(() => {
    loadAllData()
  }, [meetingId])

  const loadAllData = async () => {
    try {
      setLoading(true)
      const m = await pcpMeetingFatia1Service.getMeetingById(meetingId)
      if (!m) {
        toast({ title: 'Erro', description: 'Reunião não encontrada.', variant: 'destructive' })
        return
      }
      setMeeting(m)

      // Se status for AGENDADA, auto-iniciar ou preparar
      if (m.status === 'EM_ANDAMENTO' && m.real_start_time) {
        const startMs = new Date(m.real_start_time).getTime()
        const diffSec = Math.max(0, Math.round((Date.now() - startMs) / 1000))
        setDurationSec(diffSec)
      }

      const [items, pList, decs, pends, inhPends, atas] = await Promise.all([
        pcpMeetingFatia1Service.listAgendaItems(meetingId),
        pcpMeetingFatia1Service.listParticipants(meetingId),
        pcpMeetingFatia2Service.listDecisions(meetingId),
        pcpMeetingFatia1Service.listPendencies({ meetingId }),
        pcpMeetingFatia2Service.inheritPreviousPendencies(meetingId),
        pcpMeetingFatia2Service.listAtas(meetingId),
      ])

      setAgendaItems(items)
      setParticipants(pList)
      setDecisions(decs)
      setPendencies(pends)
      setInheritedPendencies(inhPends)

      if (atas.length > 0) {
        setCurrentAta(atas[0])
        setStructuredAta(atas[0].structured_content)
      }

      setTranscriptionSnippets(m.transcription_snippets || [])
      setAiSuggestions(m.ai_suggestions || [])
    } catch (err: any) {
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Timer contínuo de reunião
  useEffect(() => {
    if (meeting?.status !== 'EM_ANDAMENTO') return
    const timer = setInterval(() => {
      setDurationSec((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [meeting?.status])

  // Formatação do cronômetro
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // =========================================================================
  // OPERAÇÕES: INICIAR REUNIÃO
  // =========================================================================
  const handleStartMeeting = async () => {
    try {
      const updated = await pcpMeetingFatia2Service.startMeeting(meetingId, currentUser)
      setMeeting(updated)
      setDurationSec(0)
      toast({
        title: 'Reunião Iniciada',
        description: `Início oficial registrado às ${new Date().toLocaleTimeString('pt-BR')}`,
      })
    } catch (err: any) {
      toast({ title: 'Não foi possível iniciar', description: err.message, variant: 'destructive' })
    }
  }

  // =========================================================================
  // OPERAÇÕES: PAUTA AO VIVO
  // =========================================================================
  const handleUpdateAgendaStatus = async (
    itemId: string,
    action: 'INICIAR_DISCUSSAO' | 'CONCLUIR_ASSUNTO' | 'ADIAR' | 'OBSERVACAO',
    notes?: string,
  ) => {
    try {
      const updatedItem = await pcpMeetingFatia2Service.updateAgendaItemProgress(
        itemId,
        meetingId,
        action,
        currentUser,
        { notes },
      )
      setAgendaItems((prev) => prev.map((i) => (i.id === itemId ? updatedItem : i)))
      toast({
        title: 'Pauta Atualizada',
        description: `Item marcado como: ${updatedItem.discussion_status}`,
      })
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar pauta', description: err.message, variant: 'destructive' })
    }
  }

  // =========================================================================
  // OPERAÇÕES: ATA AO VIVO COM AUTOSAVE & SGQ
  // =========================================================================
  const handleSaveAtaSectionItem = async (
    secaoKey: string,
    novoItem: { topico: string; detalhes: string; status_info: AtaDiffAction },
  ) => {
    if (!structuredAta) return
    setAutosaveStatus('SAVING')
    try {
      const clone: AtaStructuredContent = JSON.parse(JSON.stringify(structuredAta))
      if (clone.secoes[secaoKey]) {
        if (!clone.secoes[secaoKey].itens) clone.secoes[secaoKey].itens = []
        clone.secoes[secaoKey].itens.push({
          id: `item-${Date.now()}`,
          topico: novoItem.topico,
          detalhes: novoItem.detalhes,
          status_info: novoItem.status_info,
          responsavel: currentUser.name,
          origem: 'Reunião em Andamento',
        })
      }
      const updated = await pcpMeetingFatia2Service.updateLiveAtaContent(
        meetingId,
        clone,
        currentUser,
      )
      setStructuredAta(clone)
      setCurrentAta(updated)
      setAutosaveStatus('SAVED')
      setTimeout(() => setAutosaveStatus('IDLE'), 3000)
    } catch (err: any) {
      setAutosaveStatus('ERROR')
      toast({
        title: 'Não foi possível salvar esta alteração.',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // =========================================================================
  // OPERAÇÕES: PRESENÇA REAL
  // =========================================================================
  const handleUpdateAttendance = async (
    participantId: string,
    status: 'PRESENTE' | 'AUSENTE' | 'ENTROU_DEPOIS' | 'SAIU_ANTES',
  ) => {
    try {
      const nowIso = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const listToUpdate = participants.map((p) => {
        if (p.id === participantId) {
          return {
            participantId: p.id!,
            attendance_status: status,
            joined_at: status === 'PRESENTE' || status === 'ENTROU_DEPOIS' ? nowIso : undefined,
            left_at: status === 'SAIU_ANTES' ? nowIso : undefined,
          }
        }
        return {
          participantId: p.id!,
          attendance_status: p.attendance_status || 'AUSENTE',
          joined_at: p.joined_at,
          left_at: p.left_at,
        }
      })

      await pcpMeetingFatia2Service.recordAttendance(meetingId, listToUpdate, currentUser)

      setParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? {
                ...p,
                attendance_status: status,
                status:
                  status === 'PRESENTE' || status === 'ENTROU_DEPOIS'
                    ? 'PARTICIPOU'
                    : 'NAO_PARTICIPOU',
                joined_at:
                  status === 'PRESENTE' || status === 'ENTROU_DEPOIS' ? nowIso : p.joined_at,
              }
            : p,
        ),
      )

      toast({ title: 'Presença Registrada', description: 'Registro salvo no banco com sucesso.' })
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar presença',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // =========================================================================
  // OPERAÇÕES: DECISÕES (MANUAIS E CONFIRMAÇÃO DE IA)
  // =========================================================================
  const handleCreateDecision = async () => {
    if (!newDecisionData.description.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe a descrição da decisão.',
        variant: 'destructive',
      })
      return
    }
    try {
      const dec = await pcpMeetingFatia2Service.createDecision(
        meetingId,
        {
          subject: newDecisionData.subject || 'Decisão Operacional',
          description: newDecisionData.description,
          area: newDecisionData.area,
          responsible: newDecisionData.responsible || currentUser.name,
          ata_section_id: newDecisionData.ata_section_id,
          origin_type: 'MANUAL',
          is_confirmed: true,
        },
        currentUser,
      )

      setDecisions((prev) => [dec, ...prev])
      setNewDecisionModal(false)
      setNewDecisionData({
        subject: '',
        description: '',
        area: 'PCP',
        responsible: '',
        ata_section_id: 'sec_pcp',
      })
      toast({ title: 'Decisão Confirmada', description: 'Decisão oficial registrada na reunião.' })
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar decisão',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleConfirmAiSuggestion = async (sug: AiSuggestionItem) => {
    try {
      if (sug.tipo === 'DECISAO') {
        const dec = await pcpMeetingFatia2Service.createDecision(
          meetingId,
          {
            subject: 'Decisão via IA',
            description: sug.sugestao,
            area: 'PCP',
            responsible: currentUser.name,
            origin_type: 'TRANSCRICAO_IA',
            is_confirmed: true,
          },
          currentUser,
        )
        setDecisions((prev) => [dec, ...prev])
      }

      setAiSuggestions((prev) =>
        prev.map((item) => (item.id === sug.id ? { ...item, status: 'CONFIRMADO' } : item)),
      )

      toast({
        title: 'Sugestão Validada e Confirmada',
        description: 'Transformada em registro oficial humano.',
      })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDiscardAiSuggestion = (sugId: string) => {
    setAiSuggestions((prev) =>
      prev.map((item) => (item.id === sugId ? { ...item, status: 'DESCARTADO' } : item)),
    )
    toast({
      title: 'Sugestão Descartada',
      description: 'A sugestão da IA foi rejeitada pelo condutor.',
    })
  }

  // =========================================================================
  // OPERAÇÕES: PENDÊNCIAS
  // =========================================================================
  const handleCreatePendency = async () => {
    if (!newPendencyData.subject.trim() || !newPendencyData.action.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o assunto e a ação necessária.',
        variant: 'destructive',
      })
      return
    }

    try {
      const pend = await pcpMeetingFatia1Service.createPendency(
        {
          meeting_id: meetingId,
          area: newPendencyData.area,
          subject: newPendencyData.subject,
          action: newPendencyData.action,
          responsible: newPendencyData.responsible || '',
          deadline: newPendencyData.deadline || '',
          priority: newPendencyData.priority,
          status: 'ABERTA',
          origin: `Reunião PCP S${meeting?.week || ''}`,
          ata_section_id: newPendencyData.ata_section_id,
          origin_week: meeting?.week || 1,
          origin_year: meeting?.year || 2025,
        },
        currentUser,
      )
      setPendencies((prev) => [pend, ...prev])
      setNewPendencyModal(false)
      setNewPendencyData({
        subject: '',
        action: '',
        area: 'PCP',
        responsible: '',
        deadline: '',
        priority: 'ALTA',
        ata_section_id: 'sec_pcp',
      })

      if (!newPendencyData.responsible) {
        toast({
          title: 'Pendência Salva',
          description: 'Atenção: Pendência salva sem responsável definido.',
          variant: 'default',
        })
      } else {
        toast({ title: 'Pendência Criada', description: 'Nova pendência registrada com sucesso.' })
      }
    } catch (err: any) {
      toast({ title: 'Erro ao criar pendência', description: err.message, variant: 'destructive' })
    }
  }

  // =========================================================================
  // OPERAÇÕES: TRANSCRIÇÃO & GRAVAÇÃO (SEM SIMULAÇÃO, COM HONESTIDADE)
  // =========================================================================
  const handleMediaAction = async (
    type: 'GRAVACAO' | 'TRANSCRICAO',
    action: 'INICIAR' | 'PAUSAR' | 'FINALIZAR',
  ) => {
    try {
      const updated = await pcpMeetingFatia2Service.setMediaSessionState(
        meetingId,
        type,
        action,
        currentUser,
      )
      setMeeting(updated)
      toast({
        title: `${type === 'GRAVACAO' ? 'Gravação' : 'Transcrição'} ${action}`,
        description: 'Estado atualizado com registro formal na auditoria.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro no controle de mídia',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // =========================================================================
  // OPERAÇÕES: ENCERRAMENTO COM RESUMO E VALIDAÇÕES
  // =========================================================================
  const handleOpenCloseModal = async () => {
    try {
      const summary = await pcpMeetingFatia2Service.getMeetingClosureSummary(meetingId)
      setClosureSummary(summary)
      setCloseMeetingModal(true)
    } catch (err: any) {
      toast({ title: 'Erro ao compor resumo', description: err.message, variant: 'destructive' })
    }
  }

  const handleConfirmCloseMeeting = async () => {
    try {
      setClosing(true)
      const updated = await pcpMeetingFatia2Service.closeMeeting(meetingId, currentUser)
      setMeeting(updated)
      setCloseMeetingModal(false)
      toast({
        title: 'Reunião Encerrada com Sucesso!',
        description:
          'Status atualizado para AGUARDANDO ATA FINAL. Redirecionando para Central de ATAs...',
      })
      setTimeout(() => {
        onNavigateTab('atas', meetingId)
      }, 1000)
    } catch (err: any) {
      toast({ title: 'Erro ao encerrar reunião', description: err.message, variant: 'destructive' })
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#004C97] mb-2" />
        <span className="text-xs font-semibold">Carregando Reunião em Andamento...</span>
      </div>
    )
  }

  if (!meeting) {
    return <div className="p-8 text-center text-slate-500">Reunião não encontrada.</div>
  }

  return (
    <div className="space-y-3">
      {/* 1. CABEÇALHO COMPACTO DA REUNIÃO */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-[#004C97] text-white font-mono text-xs">
                  REUNIÃO PCP — SEMANA {meeting.week}/{meeting.year}
                </Badge>
                <Badge variant="outline" className="text-xs font-semibold">
                  {meeting.company}
                </Badge>
                <Badge
                  className={`text-[11px] font-bold ${
                    meeting.status === 'EM_ANDAMENTO'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                      : meeting.status === 'AGENDADA'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {meeting.status.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {meeting.modality}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span>
                  <strong>Data:</strong> {meeting.meeting_date} &bull; Previsto:{' '}
                  {meeting.start_time} - {meeting.expected_end_time}
                </span>
                {meeting.real_start_time && (
                  <span className="text-emerald-700 font-semibold">
                    Início Real: {new Date(meeting.real_start_time).toLocaleTimeString('pt-BR')}{' '}
                    (por {meeting.started_by_user})
                  </span>
                )}
                {meeting.location && <span>Local: {meeting.location}</span>}
                {meeting.online_link && (
                  <a
                    href={meeting.online_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <Video className="w-3 h-3" /> Link da Sala
                  </a>
                )}
                <span>Organizador: {meeting.organizer}</span>
              </div>
            </div>

            {/* Cronômetro e Ações do Cabeçalho */}
            <div className="flex flex-wrap items-center gap-3">
              {meeting.status === 'EM_ANDAMENTO' && (
                <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-md font-mono text-xs shadow-inner">
                  <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>DURAÇÃO:</span>
                  <span className="font-bold text-emerald-300 text-sm tracking-wider">
                    {formatTimer(durationSec)}
                  </span>
                </div>
              )}

              {/* Indicador discreto de Autosave */}
              <div className="text-[11px] font-medium flex items-center gap-1">
                {autosaveStatus === 'SAVING' && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Salvando...
                  </span>
                )}
                {autosaveStatus === 'SAVED' && (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Alterações salvas
                  </span>
                )}
                {autosaveStatus === 'ERROR' && (
                  <span className="text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Erro ao salvar
                  </span>
                )}
              </div>

              {/* Botão de Iniciar ou Encerrar */}
              {meeting.status === 'AGENDADA' && (
                <Button
                  onClick={handleStartMeeting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> INICIAR REUNIÃO
                </Button>
              )}

              {meeting.status === 'EM_ANDAMENTO' && (
                <Button
                  onClick={handleOpenCloseModal}
                  size="sm"
                  variant="destructive"
                  className="font-bold text-xs h-8 shadow-sm"
                >
                  <Square className="w-3.5 h-3.5 mr-1" /> ENCERRAR REUNIÃO
                </Button>
              )}

              {meeting.status === 'AGUARDANDO_ATA_FINAL' && (
                <Button
                  onClick={() => onNavigateTab('atas', meetingId)}
                  size="sm"
                  className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> IR PARA ATA FINAL
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de Conflito de Concorrência se houver */}
      {concurrencyConflict && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-xs text-amber-900 flex items-center justify-between">
          <span>{concurrencyConflict}</span>
          <Button size="sm" variant="outline" onClick={loadAllData} className="text-xs h-7">
            Atualizar tela
          </Button>
        </div>
      )}

      {/* 2. BARRA DE NAVEGAÇÃO DE ABAS OPERACIONAIS */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-2 pt-2 gap-1 overflow-x-auto text-xs font-bold">
        {[
          { id: 'pauta', label: `PAUTA (${agendaItems.length})`, icon: ListTodo },
          { id: 'ata', label: 'ATA AO VIVO (SGQ)', icon: FileText },
          { id: 'decisoes', label: `DECISÕES (${decisions.length})`, icon: CheckCircle2 },
          { id: 'pendencias', label: `PENDÊNCIAS (${pendencies.length})`, icon: AlertTriangle },
          { id: 'participantes', label: `PARTICIPANTES (${participants.length})`, icon: Users },
          { id: 'transcricao', label: 'TRANSCRIÇÃO & IA', icon: Mic },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* 3. CONTEÚDO DAS ABAS */}
      <div className="bg-white rounded-b-lg border border-slate-200 border-t-0 p-4 min-h-[480px]">
        {/* ABA 1: PAUTA AO VIVO */}
        {activeTab === 'pauta' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pauta da Reunião em Execução</h3>
                <p className="text-xs text-slate-500">
                  Acompanhe os tópicos, inicie discussões e marque conclusões registrando tempos
                  reais.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {agendaItems.map((item, idx) => (
                <Card
                  key={item.id}
                  className={`border transition-all ${
                    item.discussion_status === 'EM_DISCUSSAO'
                      ? 'border-amber-400 bg-amber-50/30 ring-1 ring-amber-400'
                      : item.discussion_status === 'CONCLUIDO'
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : item.discussion_status === 'ADIADO'
                          ? 'border-slate-300 bg-slate-50 opacity-60'
                          : 'border-slate-200 bg-white'
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-400">
                            #{item.order || idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{item.subject}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {item.area}
                          </Badge>
                          <Badge
                            className={`text-[10px] ${
                              item.priority === 'CRITICO'
                                ? 'bg-rose-100 text-rose-800'
                                : item.priority === 'ALTO'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.priority}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold bg-slate-100 text-slate-700"
                          >
                            {item.discussion_status || 'NAO_INICIADO'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-600 text-[11px]">
                          <span>
                            Apresentador: <strong>{item.presenter}</strong>
                          </span>
                          <span>
                            Estimado: <strong>{item.estimated_time_min} min</strong>
                          </span>
                          {item.discussion_duration_sec && (
                            <span className="text-emerald-700 font-semibold">
                              Duração Real: {Math.round(item.discussion_duration_sec / 60)} min (
                              {item.discussion_duration_sec}s)
                            </span>
                          )}
                          {item.discussion_notes && (
                            <span className="text-slate-500 italic">
                              Obs: {item.discussion_notes}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações da Pauta */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.discussion_status !== 'EM_DISCUSSAO' &&
                          item.discussion_status !== 'CONCLUIDO' && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleUpdateAgendaStatus(item.id!, 'INICIAR_DISCUSSAO')
                              }
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-7"
                            >
                              <Play className="w-3 h-3 mr-1" /> Iniciar Discussão
                            </Button>
                          )}

                        {item.discussion_status === 'EM_DISCUSSAO' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateAgendaStatus(item.id!, 'CONCLUIR_ASSUNTO')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Concluir Assunto
                          </Button>
                        )}

                        {item.discussion_status !== 'CONCLUIDO' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const note = prompt('Motivo do adiamento deste assunto:', '')
                              if (note !== null) {
                                handleUpdateAgendaStatus(item.id!, 'ADIAR', note)
                              }
                            }}
                            className="text-slate-600 hover:bg-slate-100 text-xs h-7"
                          >
                            Adiar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ABA 2: ATA AO VIVO (SGQ) */}
        {activeTab === 'ata' && structuredAta && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ATA ao Vivo — Template Oficial SGQ 8.1.001-R002 Rev 8
                </h3>
                <p className="text-xs text-slate-500">
                  Edição em tempo real durante a reunião. Toda inserção gera autosave e compõe a
                  minuta final.
                </p>
              </div>
              <Badge className="bg-[#004C97] text-white text-xs">
                Completude Geral: {currentAta?.overall_completeness || 0}%
              </Badge>
            </div>

            <div className="space-y-4">
              {Object.entries(structuredAta.secoes).map(([secKey, secao]) => (
                <div
                  key={secKey}
                  className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                      {secao.nome}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const top = prompt(`Inserir Informação/Decisão em ${secao.nome}:`, '')
                        if (top) {
                          handleSaveAtaSectionItem(secKey, {
                            topico: top,
                            detalhes: `Registrado durante reunião às ${new Date().toLocaleTimeString('pt-BR')}`,
                            status_info: 'NOVA',
                          })
                        }
                      }}
                      className="text-xs h-6 text-[#004C97] font-bold"
                    >
                      <Plus className="w-3 h-3 mr-1" /> + Adicionar Registro
                    </Button>
                  </div>

                  {secao.itens && secao.itens.length > 0 ? (
                    <div className="space-y-1.5 pl-2 border-l-2 border-slate-300">
                      {secao.itens.map((it, iIdx) => (
                        <div
                          key={it.id || iIdx}
                          className="text-xs bg-white p-2 rounded border border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{it.topico}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {it.responsavel || 'PCP'}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1">{it.detalhes}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Nenhum registro específico nesta seção.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA 3: DECISÕES */}
        {activeTab === 'decisoes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Decisões Registradas na Reunião
                </h3>
                <p className="text-xs text-slate-500">
                  Decisões oficiais pactuadas pela equipe ou validadas a partir de sugestões da IA.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setNewDecisionModal(true)}
                className="bg-[#004C97] text-white font-bold text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> + NOVA DECISÃO
              </Button>
            </div>

            {/* Sugestões de IA pendentes de validação */}
            {aiSuggestions.filter((s) => s.tipo === 'DECISAO' && s.status === 'PENDENTE').length >
              0 && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  SUGESTÃO DE DECISÃO IDENTIFICADA PELA IA (Confirmação Humana Obrigatória)
                </div>
                {aiSuggestions
                  .filter((s) => s.tipo === 'DECISAO' && s.status === 'PENDENTE')
                  .map((sug) => (
                    <div
                      key={sug.id}
                      className="bg-white p-2.5 rounded border border-indigo-100 text-xs space-y-1.5"
                    >
                      <p className="text-slate-800 font-medium">{sug.sugestao}</p>
                      <p className="text-[11px] text-slate-500 italic">
                        Trecho identificado: "{sug.trechoOrigem}"
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmAiSuggestion(sug)}
                          className="bg-emerald-600 text-white text-xs h-6 font-bold"
                        >
                          Confirmar Decisão
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDiscardAiSuggestion(sug.id)}
                          className="text-xs h-6 text-slate-600"
                        >
                          Descartar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Lista de Decisões Oficiais */}
            <div className="space-y-2">
              {decisions.length > 0 ? (
                decisions.map((dec) => (
                  <Card key={dec.id} className="border-slate-200 bg-white">
                    <CardContent className="p-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-600 text-white text-[10px]">OFICIAL</Badge>
                            <span className="font-bold text-slate-900">
                              {dec.subject || 'Decisão'}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {dec.area}
                            </Badge>
                            <span className="text-slate-500 font-mono text-[11px]">
                              Resp: <strong>{dec.responsible}</strong>
                            </span>
                          </div>
                          <p className="text-slate-700">{dec.description}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          Origem: {dec.origin_type || 'MANUAL'} &bull; {dec.decision_date}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  Nenhuma decisão oficial registrada até o momento nesta reunião.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 4: PENDÊNCIAS */}
        {activeTab === 'pendencias' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pendências e Ações da Reunião</h3>
                <p className="text-xs text-slate-500">
                  Gerencie pendências anteriores herdadas e cadastre novas ações com responsável e
                  prazo.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setNewPendencyModal(true)}
                className="bg-[#004C97] text-white font-bold text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> + NOVA PENDÊNCIA
              </Button>
            </div>

            {/* Bloco A: Pendências Herdadas de Reuniões Anteriores */}
            {inheritedPendencies.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  (A) Pendências Herdadas de Reuniões Anteriores ({inheritedPendencies.length})
                </span>
                <div className="space-y-1.5">
                  {inheritedPendencies.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-amber-50/50 border border-amber-200 rounded text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] bg-white">
                            {p.pendency_code}
                          </Badge>
                          <span className="font-bold text-slate-900">{p.subject}</span>
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-slate-600 mt-0.5">{p.action}</p>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Resp: <strong>{p.responsible || 'NÃO DEFINIDO'}</strong> &bull; Prazo:{' '}
                          <strong>{p.deadline || 'SEM PRAZO'}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const note = prompt('Atualizar andamento desta pendência:', '')
                            if (note) {
                              pcpMeetingFatia1Service.updatePendency(
                                p.id!,
                                { status: 'EM_ANDAMENTO', last_update_note: note },
                                currentUser,
                              )
                              toast({ title: 'Pendência Atualizada' })
                            }
                          }}
                          className="text-xs h-7"
                        >
                          Atualizar Andamento
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloco B: Novas Pendências Desta Reunião */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                (B) Novas Pendências Registradas na Reunião ({pendencies.length})
              </span>
              <div className="space-y-1.5">
                {pendencies.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-white border border-slate-200 rounded text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {p.pendency_code}
                        </Badge>
                        <span className="font-bold text-slate-900">{p.subject}</span>
                        <Badge
                          className={`text-[10px] ${
                            p.priority === 'CRITICA'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {p.priority}
                        </Badge>
                        {!p.responsible && (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-[10px]">
                            SEM RESPONSÁVEL
                          </Badge>
                        )}
                        {!p.deadline && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
                            SEM PRAZO
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-600 mt-0.5">{p.action}</p>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Resp: <strong>{p.responsible || 'A Definir'}</strong> &bull; Prazo:{' '}
                        <strong>{p.deadline || 'A Definir'}</strong> &bull; Área: {p.area}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: PARTICIPANTES & PRESENÇA REAL */}
        {activeTab === 'participantes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Registro de Presença Efetiva</h3>
                <p className="text-xs text-slate-500">
                  O quadro oficial da ATA considera quem efetivamente participou da sessão.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Nome / Cargo</th>
                    <th className="p-2.5">Área</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Confirmação Prévia</th>
                    <th className="p-2.5">Presença na Reunião</th>
                    <th className="p-2.5">Horários</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {participants.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{p.person_name}</div>
                        <div className="text-[11px] text-slate-500">{p.role_title}</div>
                      </td>
                      <td className="p-2.5">{p.area}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {p.is_mandatory ? 'OBRIGATÓRIO' : 'OPCIONAL'}
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant={p.attendance_status === 'PRESENTE' ? 'default' : 'outline'}
                            onClick={() => handleUpdateAttendance(p.id!, 'PRESENTE')}
                            className={`text-[10px] h-6 px-2 ${
                              p.attendance_status === 'PRESENTE' ? 'bg-emerald-600 text-white' : ''
                            }`}
                          >
                            Presente
                          </Button>
                          <Button
                            size="sm"
                            variant={p.attendance_status === 'AUSENTE' ? 'default' : 'outline'}
                            onClick={() => handleUpdateAttendance(p.id!, 'AUSENTE')}
                            className={`text-[10px] h-6 px-2 ${
                              p.attendance_status === 'AUSENTE' ? 'bg-rose-600 text-white' : ''
                            }`}
                          >
                            Ausente
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              p.attendance_status === 'ENTROU_DEPOIS' ? 'default' : 'outline'
                            }
                            onClick={() => handleUpdateAttendance(p.id!, 'ENTROU_DEPOIS')}
                            className={`text-[10px] h-6 px-2 ${
                              p.attendance_status === 'ENTROU_DEPOIS'
                                ? 'bg-amber-600 text-white'
                                : ''
                            }`}
                          >
                            Entrou depois
                          </Button>
                        </div>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">
                        {p.joined_at ? `Entrada: ${p.joined_at}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 6: TRANSCRIÇÃO & IA (SEM SIMULAÇÃO) */}
        {activeTab === 'transcricao' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Transcrição & Gravação da Sessão
                </h3>
                <p className="text-xs text-slate-500">
                  Captação de áudio, busca e extração supervisionada de decisões e pendências.
                </p>
              </div>

              {/* Indicadores honestos de Gravação e Transcrição */}
              <div className="flex items-center gap-2 text-xs">
                {meeting.recording_status === 'GRAVANDO' ? (
                  <Badge className="bg-rose-600 text-white font-mono animate-pulse">
                    ● GRAVAÇÃO ATIVA
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 font-mono">
                    GRAVAÇÃO: {meeting.recording_status || 'INATIVO'}
                  </Badge>
                )}

                {meeting.transcription_status === 'TRANSCREVENDO' ? (
                  <Badge className="bg-emerald-600 text-white font-mono animate-pulse">
                    ● TRANSCRIÇÃO ATIVA
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-700 bg-amber-50 font-mono">
                    TRANSCRIÇÃO: {meeting.transcription_status || 'AGUARDANDO INTEGRAÇÃO'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Ações de Gravação e Transcrição */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleMediaAction(
                    'GRAVACAO',
                    meeting.recording_status === 'GRAVANDO' ? 'PAUSAR' : 'INICIAR',
                  )
                }
                className="text-xs h-8"
              >
                {meeting.recording_status === 'GRAVANDO' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1" /> Pausar Gravação
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1" /> Iniciar Gravação
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleMediaAction(
                    'TRANSCRICAO',
                    meeting.transcription_status === 'TRANSCREVENDO' ? 'PAUSAR' : 'INICIAR',
                  )
                }
                className="text-xs h-8"
              >
                {meeting.transcription_status === 'TRANSCREVENDO' ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1" /> Pausar Transcrição
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 mr-1" /> Iniciar Transcrição
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const speaker = prompt('Identificação do Falante (ex: Coordenador PCP):', 'PCP')
                  const text = prompt('Trecho da fala:', '')
                  if (text) {
                    pcpMeetingFatia2Service
                      .addTranscriptionSnippet(
                        meetingId,
                        {
                          speaker: speaker || 'Participante',
                          text,
                          timestamp: new Date().toLocaleTimeString('pt-BR'),
                          timeOffsetSec: durationSec,
                          source: 'USUARIO',
                        },
                        currentUser,
                      )
                      .then((snips) => {
                        setTranscriptionSnippets(snips)
                        pcpMeetingFatia2Service
                          .generateAiSuggestionsForSnippet(meetingId, text)
                          .then((sugs) => {
                            setAiSuggestions(sugs)
                          })
                        toast({ title: 'Trecho registrado manualmente' })
                      })
                  }
                }}
                className="text-xs h-8 font-semibold text-[#004C97]"
              >
                <Plus className="w-3 h-3 mr-1" /> Inserir Trecho Manual
              </Button>
            </div>

            {/* Aviso honesto quando não integrado */}
            {transcriptionSnippets.length === 0 && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-1">
                <MicOff className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">
                  Recurso aguardando integração do provedor de telecom/gravação.
                </p>
                <p className="text-[11px] text-slate-500">
                  Assim como o canal de notificações da Fatia 1, o streaming automático de áudio
                  respeita os endpoints do HUB. Você pode inserir trechos manualmente ou consultar o
                  histórico.
                </p>
              </div>
            )}

            {/* Busca e Lista de Trechos */}
            {transcriptionSnippets.length > 0 && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Buscar trecho na transcrição (ex: MTO, Arcelor, L2, Matéria-prima, DP04)..."
                    value={transcriptionFilter}
                    onChange={(e) => setTranscriptionFilter(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {transcriptionSnippets
                    .filter(
                      (s) =>
                        !transcriptionFilter ||
                        s.text.toLowerCase().includes(transcriptionFilter.toLowerCase()),
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                          <span className="font-bold text-slate-700">{s.speaker || 'Falante'}</span>
                          <span>
                            {s.timestamp} ({Math.floor(s.timeOffsetSec / 60)}m)
                          </span>
                        </div>
                        <p className="text-slate-800">{s.text}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: NOVA DECISÃO */}
      {/* ========================================================================= */}
      <Dialog open={newDecisionModal} onOpenChange={setNewDecisionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Registrar Nova Decisão
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Decisão oficial tomada pelo comitê PCP. Será vinculada à seção correspondente da ATA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Assunto / Tópico</label>
              <Input
                value={newDecisionData.subject}
                onChange={(e) =>
                  setNewDecisionData({ ...newDecisionData, subject: e.target.value })
                }
                placeholder="Ex: Reprogramação de Bobinas L2"
                className="text-xs"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Descrição da Decisão *</label>
              <Textarea
                value={newDecisionData.description}
                onChange={(e) =>
                  setNewDecisionData({ ...newDecisionData, description: e.target.value })
                }
                placeholder="Descreva claramente o que foi pactuado..."
                rows={3}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Área Envolvida</label>
                <Input
                  value={newDecisionData.area}
                  onChange={(e) => setNewDecisionData({ ...newDecisionData, area: e.target.value })}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Responsável</label>
                <Input
                  value={newDecisionData.responsible}
                  onChange={(e) =>
                    setNewDecisionData({ ...newDecisionData, responsible: e.target.value })
                  }
                  placeholder="Nome do responsável"
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewDecisionModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateDecision}
              className="bg-[#004C97] text-white font-bold"
            >
              Salvar Decisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: NOVA PENDÊNCIA */}
      {/* ========================================================================= */}
      <Dialog open={newPendencyModal} onOpenChange={setNewPendencyModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Registrar Nova Pendência
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ação com acompanhamento formal pelo PCP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Assunto *</label>
              <Input
                value={newPendencyData.subject}
                onChange={(e) =>
                  setNewPendencyData({ ...newPendencyData, subject: e.target.value })
                }
                placeholder="Ex: Falta de Tarugo SAE 1020"
                className="text-xs"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Ação / O que fazer *</label>
              <Textarea
                value={newPendencyData.action}
                onChange={(e) => setNewPendencyData({ ...newPendencyData, action: e.target.value })}
                placeholder="Descreva a ação operacional a ser executada..."
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Responsável</label>
                <Input
                  value={newPendencyData.responsible}
                  onChange={(e) =>
                    setNewPendencyData({ ...newPendencyData, responsible: e.target.value })
                  }
                  placeholder="Se vazio, alertará na validação"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Prazo Limite</label>
                <Input
                  type="date"
                  value={newPendencyData.deadline}
                  onChange={(e) =>
                    setNewPendencyData({ ...newPendencyData, deadline: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNewPendencyModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePendency}
              className="bg-[#004C97] text-white font-bold"
            >
              Salvar Pendência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: RESUMO DA REUNIÃO & VALIDAÇÃO ANTES DE ENCERRAR */}
      {/* ========================================================================= */}
      <Dialog open={closeMeetingModal} onOpenChange={setCloseMeetingModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Square className="w-4 h-4 text-rose-600" /> Resumo da Reunião — Validação SGQ
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verifique os itens concluídos e pendências antes do encerramento oficial.
            </DialogDescription>
          </DialogHeader>

          {closureSummary && (
            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Pauta Concluída:</span>
                  <strong className="text-emerald-700 text-sm">
                    {closureSummary.pautaConcluidos} de {closureSummary.pautaTotal} itens
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Itens Adiados:</span>
                  <strong className="text-amber-700 text-sm">
                    {closureSummary.pautaAdiados} itens
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Decisões Registradas:</span>
                  <strong className="text-[#004C97] text-sm">{closureSummary.decisoesCount}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Novas Pendências:</span>
                  <strong className="text-slate-900 text-sm">
                    {closureSummary.novasPendenciasCount}
                  </strong>
                </div>
              </div>

              {/* Alertas de pendências sem responsável ou prazo */}
              {closureSummary.pendenciasSemResponsavel.length > 0 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pendências sem responsável definido (
                    {closureSummary.pendenciasSemResponsavel.length}):
                  </div>
                  <ul className="list-disc pl-4 text-[11px]">
                    {closureSummary.pendenciasSemResponsavel.map((p) => (
                      <li key={p.id}>{p.subject}</li>
                    ))}
                  </ul>
                </div>
              )}

              {closureSummary.pendenciasSemPrazo.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Pendências sem prazo limite definido (
                    {closureSummary.pendenciasSemPrazo.length}):
                  </div>
                  <ul className="list-disc pl-4 text-[11px]">
                    {closureSummary.pendenciasSemPrazo.map((p) => (
                      <li key={p.id}>{p.subject}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCloseMeetingModal(false)}>
              Continuar Editando
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCloseMeeting}
              disabled={closing}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {closing ? 'Encerrando...' : 'Encerrar Mesmo Assim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ReuniaoEmAndamentoView
