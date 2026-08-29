import React, { useState, useEffect } from 'react'
import {
  CalendarDays,
  Clock,
  Video,
  MapPin,
  Users,
  Play,
  FileText,
  AlertTriangle,
  Sparkles,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Share2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PCPMeeting, PreMeetingBriefing } from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { CreateMeetingModal } from '@/components/meetings/CreateMeetingModal'
import { RescheduleMeetingModal } from '@/components/meetings/RescheduleMeetingModal'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export const NextMeetingView: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [meeting, setMeeting] = useState<PCPMeeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingBriefing, setGeneratingBriefing] = useState(false)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)

  const loadNextMeeting = async () => {
    setLoading(true)
    try {
      const next = await pcpMeetingService.getNextMeeting()
      setMeeting(next)
    } catch (err) {
      console.error('Erro ao carregar próxima reunião:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNextMeeting()
  }, [])

  const handleGenerateBriefing = async () => {
    if (!meeting) return
    setGeneratingBriefing(true)
    try {
      const res = await pb.send<any>('/backend/v1/meetings/pre-briefing', {
        method: 'POST',
        body: { meeting_id: meeting.id },
      })
      if (res.briefing) {
        setMeeting({
          ...meeting,
          pre_meeting_briefing: res.briefing,
          pre_meeting_generated_at: new Date().toISOString(),
        })
        toast({
          title: 'Briefing Pré-Meeting Gerado',
          description:
            'Análise automática de pendências, desvios e pauta sugerida consolidada com IA nativa.',
        })
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar briefing',
        description: e.message || 'Serviço temporariamente indisponível',
      })
    } finally {
      setGeneratingBriefing(false)
    }
  }

  const handleRespondInvite = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!meeting) return
    try {
      const updated = await pcpMeetingService.respondParticipant(meeting.id, status)
      setMeeting(updated)
      toast({
        title: status === 'ACCEPTED' ? 'Presença Confirmada' : 'Declínio Registrado',
        description: 'Seu status de participação foi atualizado no HUB.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao responder convite',
        description: err.message,
      })
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-mono">
          Carregando próxima reunião de PCP...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ações de Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#004C97]" />
            Próxima Reunião Semanal de PCP
          </h2>
          <p className="text-xs text-slate-500">
            Cadência semanal configurável (Padrão: Quarta-feira às 15h00). Convocação e integração
            corporativa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Reunião
          </Button>
          {meeting && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRescheduleModalOpen(true)}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Remarcar
            </Button>
          )}
          {meeting && (
            <Button
              size="sm"
              onClick={() => navigate(`/pcp/reunioes/andamento?id=${meeting.id}`)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4 gap-1.5 shadow-xs font-semibold"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Abrir Modo Reunião
            </Button>
          )}
        </div>
      </div>

      {!meeting ? (
        <Card className="bg-white border-slate-200 p-8 text-center space-y-3">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Nenhuma reunião agendada no momento</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Utilize o botão acima para agendar a reunião semanal de alinhamento com a diretoria,
            operação e áreas de apoio.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#004C97] text-white text-xs h-8"
          >
            Agendar Reunião Agora
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Principal: Informações da Reunião e Participação */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-blue-200 shadow-xs overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50/80 via-white to-slate-50 p-5 border-b border-blue-100 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#004C97] text-white text-[10px] font-mono font-bold">
                      {meeting.reference_week}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        meeting.status === 'EM_ANDAMENTO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse'
                          : 'bg-blue-50 text-blue-700 border-blue-300'
                      }
                    >
                      ● {meeting.status}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {meeting.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">Código: {meeting.code}</p>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                    Sua Confirmação:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespondInvite('ACCEPTED')}
                      className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 gap-1 font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespondInvite('DECLINED')}
                      className="h-7 text-xs bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 gap-1 font-semibold"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Recusar
                    </Button>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4 text-xs">
                {/* Grade de Detalhes da Reunião */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Data & Horário</span>
                    <strong className="text-slate-900 font-medium text-xs flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {meeting.meeting_date} às {meeting.meeting_time}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Duração Prevista</span>
                    <strong className="text-slate-900 font-medium text-xs">
                      {meeting.duration_minutes} minutos
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Modalidade</span>
                    <strong className="text-[#004C97] font-semibold text-xs">
                      {meeting.modality}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Local / Conexão</span>
                    <strong className="text-slate-900 font-medium text-xs truncate block">
                      {meeting.modality === 'ONLINE' ? (
                        <a
                          href={meeting.online_link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline flex items-center gap-1"
                        >
                          <Video className="w-3 h-3" /> Acessar Link
                        </a>
                      ) : (
                        meeting.location || 'Sala de Reuniões PCP'
                      )}
                    </strong>
                  </div>
                </div>

                {/* Linhas Envolvidas e Setores */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600 text-xs">Linhas em Pauta:</span>
                    <div className="flex flex-wrap gap-1">
                      {meeting.involved_lines?.map((line) => (
                        <Badge
                          key={line}
                          variant="outline"
                          className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]"
                        >
                          {line}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600 text-xs">Setores:</span>
                    <div className="flex flex-wrap gap-1">
                      {meeting.involved_sectors?.map((sec) => (
                        <Badge
                          key={sec}
                          variant="outline"
                          className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]"
                        >
                          {sec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pauta Prevista */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#004C97]" /> Pauta Oficial da Reunião
                  </h4>
                  <div className="space-y-1.5">
                    {meeting.agenda_topics?.map((topic, idx) => (
                      <div
                        key={topic.id || idx}
                        className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-800">{topic.title}</span>
                        {topic.duration_minutes && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {topic.duration_minutes} min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Histórico de Remarcações caso exista */}
                {meeting.reschedule_history && meeting.reschedule_history.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-1.5">
                    <span className="font-bold text-amber-900 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Histórico de
                      Remarcação
                    </span>
                    {meeting.reschedule_history.map((log, idx) => (
                      <div key={idx} className="text-[11px] text-amber-800 font-mono">
                        De: {log.previous_date} {log.previous_time} ➔ Para: {log.new_date}{' '}
                        {log.new_time} &bull; Motivo: {log.reason} ({log.changed_by})
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Participantes Convocados e Status */}
            <Card className="bg-white border-slate-200 shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#004C97]" /> Convocação de Participantes (Agenda
                    HUB)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {meeting.mandatory_participants?.filter((p) => p.status === 'ACCEPTED').length}{' '}
                    / {meeting.mandatory_participants?.length || 0} Confirmados
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {meeting.mandatory_participants?.map((p, idx) => (
                    <div
                      key={p.email || idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs truncate">{p.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            p.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]'
                              : p.status === 'DECLINED'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 text-[9px]'
                                : 'bg-amber-50 text-amber-700 border-amber-300 text-[9px]'
                          }
                        >
                          {p.status === 'ACCEPTED'
                            ? '✓ Confirmado'
                            : p.status === 'DECLINED'
                              ? '✕ Recusado'
                              : '⏳ Pendente'}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        {p.email}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna Direita: PREPARAÇÃO INTELIGENTE DA REUNIÃO (IA Pré-Meeting) */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-blue-50/50 border-blue-200 shadow-xs">
              <CardHeader className="p-4 pb-2 border-b border-blue-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#004C97]" /> Briefing Pré-Meeting PCP
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateBriefing}
                  disabled={generatingBriefing}
                  className="h-7 text-xs bg-white text-[#004C97] border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
                >
                  <Sparkles className="w-3 h-3 text-blue-600 animate-pulse" />
                  {generatingBriefing ? 'Gerando...' : 'Atualizar IA'}
                </Button>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5 text-xs">
                {meeting.pre_meeting_briefing ? (
                  <>
                    <div className="bg-white p-3 rounded-md border border-blue-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-wider block">
                        Resumo Executivo
                      </span>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        {meeting.pre_meeting_briefing.executive_summary}
                      </p>
                    </div>

                    {/* Desvios e Riscos */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 block">
                        Principais Desvios & Riscos:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {meeting.pre_meeting_briefing.critical_risks?.map((risk, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] text-rose-900 bg-rose-50 border border-rose-200 p-2 rounded flex items-start gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pontos para Decisão */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-800 block">
                        Pontos que Precisam de Decisão:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {meeting.pre_meeting_briefing.points_for_decision?.map((p, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] text-blue-900 bg-blue-50 border border-blue-200 p-2 rounded flex items-start gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pendências não resolvidas trazidas da reunião anterior */}
                    {meeting.pre_meeting_briefing.unresolved_pendencies && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800">
                            Pendências da Reunião Anterior:
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {meeting.pre_meeting_briefing.unresolved_pendencies.length} abertas
                          </span>
                        </div>
                        <div className="space-y-1">
                          {meeting.pre_meeting_briefing.unresolved_pendencies
                            .slice(0, 3)
                            .map((pend, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-white border border-slate-200 rounded text-[11px] space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <strong className="text-slate-800">{pend.title}</strong>
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-50 text-amber-700 border-amber-300 text-[9px]"
                                  >
                                    {pend.status}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Linhas: {pend.line_codes?.join(', ') || 'Geral'} &bull; Resp:{' '}
                                  {pend.responsible}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6 space-y-2">
                    <Sparkles className="w-8 h-8 text-blue-400 mx-auto animate-bounce" />
                    <p className="text-xs text-slate-600">
                      Briefing de IA não gerado para esta reunião.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleGenerateBriefing}
                      disabled={generatingBriefing}
                      className="bg-[#004C97] text-white text-xs h-8"
                    >
                      {generatingBriefing ? 'Gerando Análise...' : 'Gerar Briefing com IA'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modais de Gestão */}
      <CreateMeetingModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={(newM) => setMeeting(newM)}
      />

      <RescheduleMeetingModal
        meeting={meeting}
        open={rescheduleModalOpen}
        onOpenChange={setRescheduleModalOpen}
        onSuccess={(updated) => setMeeting(updated)}
      />
    </div>
  )
}
export default NextMeetingView
