import React, { useState, useEffect } from 'react'
import {
  CalendarDays,
  Clock,
  Filter,
  RefreshCw,
  Plus,
  Send,
  Calendar,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Building2,
  Video,
  MapPin,
  CheckCircle2,
  ExternalLink,
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
import { PCPMeetingRecord, PCPMeetingStatus } from '@/types/pcp-meeting'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface AgendaReunioesViewProps {
  onOpenNewMeetingModal: () => void
  onNavigateTab: (tab: string, meetingId?: string) => void
}

export const AgendaReunioesView: React.FC<AgendaReunioesViewProps> = ({
  onOpenNewMeetingModal,
  onNavigateTab,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<PCPMeetingRecord[]>([])
  const [loading, setLoading] = useState(false)

  // Filtros
  const [filterWeek, setFilterWeek] = useState<string>('')
  const [filterYear, setFilterYear] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterCompany, setFilterCompany] = useState<string>('TODAS')

  // Modais de Cancelamento e Reagendamento
  const [cancelTarget, setCancelTarget] = useState<PCPMeetingRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const [rescheduleTarget, setRescheduleTarget] = useState<PCPMeetingRecord | null>(null)
  const [newDate, setNewDate] = useState('')
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('10:30')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduling, setRescheduling] = useState(false)

  const userContext = {
    id: user?.id,
    name: user?.name || 'Coordenação PCP',
  }

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const options: any = {}
      if (filterWeek) options.week = Number(filterWeek)
      if (filterYear) options.year = Number(filterYear)
      if (filterStatus && filterStatus !== 'TODOS') options.status = filterStatus
      if (filterCompany && filterCompany !== 'TODAS') options.company = filterCompany

      const list = await pcpMeetingFatia1Service.listMeetings(options)
      setMeetings(list)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar lista de reuniões',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMeetings()
  }, [filterWeek, filterYear, filterStatus, filterCompany])

  // Cancelar reunião
  const handleConfirmCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return
    try {
      setCancelling(true)
      await pcpMeetingFatia1Service.cancelMeeting(cancelTarget.id, cancelReason, userContext)
      setCancelTarget(null)
      setCancelReason('')
      await loadMeetings()
      toast({
        title: 'Reunião Cancelada!',
        description: `O cancelamento foi registrado com auditoria completa.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar reunião',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  // Reagendar reunião
  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !newDate || !rescheduleReason.trim()) return
    try {
      setRescheduling(true)
      await pcpMeetingFatia1Service.rescheduleMeeting(
        rescheduleTarget.id,
        {
          newDate,
          newStartTime,
          newEndTime,
          reason: rescheduleReason,
        },
        userContext,
      )
      setRescheduleTarget(null)
      setRescheduleReason('')
      await loadMeetings()
      toast({
        title: 'Reunião Reagendada!',
        description: `A data foi alterada. Por governança, a prévia precisa ser reenviada antes da reconfirmação do agendamento.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao reagendar reunião',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Ações */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Agenda Corporativa de Reuniões de PCP
            </h2>
            <p className="text-xs text-slate-500">
              Gerencie todas as reuniões programadas, reagendamentos e cancelamentos com
              rastreabilidade SGQ.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMeetings}
              disabled={loading}
              className="text-xs font-semibold h-8 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button
              size="sm"
              onClick={onOpenNewMeetingModal}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> + NOVA REUNIÃO PCP
            </Button>
          </div>
        </div>

        {/* Linha de Filtros */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Filtrar por Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="RASCUNHO">RASCUNHO</option>
              <option value="PREPARACAO">PREPARAÇÃO</option>
              <option value="PREVIA_GERADA">PRÉVIA GERADA</option>
              <option value="PREVIA_VALIDADA">PRÉVIA VALIDADA</option>
              <option value="PREVIA_ENVIADA">PRÉVIA ENVIADA</option>
              <option value="AGENDADA">AGENDADA</option>
              <option value="EM_ANDAMENTO">EM ANDAMENTO</option>
              <option value="REALIZADA">REALIZADA</option>
              <option value="CANCELADA">CANCELADA</option>
              <option value="REAGENDADA">REAGENDADA</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Semana ISO</label>
            <Input
              type="number"
              placeholder="Ex: 8"
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Ano</label>
            <Input
              type="number"
              placeholder="Ex: 2025"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="text-xs h-8"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">Empresa</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-slate-50"
            >
              <option value="TODAS">Todas</option>
              <option value="CIAFAL">CIAFAL</option>
              <option value="SIDERCENTRO">SIDERCENTRO</option>
              <option value="INDUSTRIALIZADORES">INDUSTRIALIZADORES</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Reuniões */}
      <div className="space-y-3">
        {meetings.length > 0 ? (
          meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className={`border transition-all ${
                meeting.status === 'AGENDADA'
                  ? 'border-emerald-300 bg-white hover:border-emerald-400'
                  : meeting.status === 'CANCELADA'
                    ? 'border-rose-200 bg-rose-50/20 opacity-75'
                    : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-[#004C97] text-white font-mono text-xs">
                        {meeting.meeting_code}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          meeting.status === 'AGENDADA'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : meeting.status === 'PREVIA_ENVIADA'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : meeting.status === 'CANCELADA'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {meeting.status}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-600">
                        Semana {meeting.week}/{meeting.year} &bull; {meeting.company}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {meeting.modality}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900">{meeting.title}</h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-mono font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-[#004C97]" />
                        {meeting.meeting_date} &bull; {meeting.start_time} às{' '}
                        {meeting.expected_end_time}
                      </span>
                      {meeting.modality !== 'ONLINE' && meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {meeting.location} {meeting.room ? `(${meeting.room})` : ''}
                        </span>
                      )}
                      {meeting.modality !== 'PRESENCIAL' && meeting.online_link && (
                        <span className="flex items-center gap-1 text-blue-700 font-mono text-[11px]">
                          <Video className="w-3.5 h-3.5" />
                          Link configurado
                        </span>
                      )}
                      <span>
                        Condutor: <strong>{meeting.conductor}</strong>
                      </span>
                    </div>

                    {/* Alertas de motivos de cancelamento ou reagendamento */}
                    {meeting.status === 'CANCELADA' && meeting.cancellation_reason && (
                      <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
                        <strong>Motivo do Cancelamento:</strong> {meeting.cancellation_reason}
                      </p>
                    )}
                    {meeting.status === 'REAGENDADA' && meeting.reschedule_reason && (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                        <strong>Motivo do Reagendamento:</strong> {meeting.reschedule_reason}
                      </p>
                    )}
                  </div>

                  {/* Ações Rápidas por Reunião */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {meeting.status === 'AGENDADA' && (
                      <Button
                        size="sm"
                        onClick={() => onNavigateTab('andamento', meeting.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 shadow-sm"
                      >
                        Iniciar Reunião
                      </Button>
                    )}

                    {meeting.status === 'EM_ANDAMENTO' && (
                      <Button
                        size="sm"
                        onClick={() => onNavigateTab('andamento', meeting.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 animate-pulse"
                      >
                        Acessar Em Andamento
                      </Button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => onNavigateTab('preparacao', meeting.id)}
                      className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8"
                    >
                      Preparar / Detalhes
                    </Button>

                    {meeting.status !== 'CANCELADA' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleTarget(meeting)
                            setNewDate(meeting.meeting_date)
                            setNewStartTime(meeting.start_time)
                            setNewEndTime(meeting.expected_end_time)
                          }}
                          className="text-xs font-semibold h-8 text-amber-700 hover:bg-amber-50 border-amber-200"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Reagendar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelTarget(meeting)}
                          className="text-xs font-semibold h-8 text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">
              Nenhuma reunião encontrada para os filtros selecionados.
            </p>
            <Button
              size="sm"
              onClick={onOpenNewMeetingModal}
              className="mt-3 bg-[#004C97] text-white text-xs font-bold"
            >
              Criar Reunião
            </Button>
          </div>
        )}
      </div>

      {/* Modal: Cancelar Reunião */}
      <Dialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Cancelar Reunião {cancelTarget?.meeting_code}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O cancelamento exige justificativa formal obrigatória e será registrado na trilha de
              auditoria SGQ. O registro nunca será apagado.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <label className="font-semibold text-slate-700 block">
              Motivo do Cancelamento * (mínimo 5 caracteres)
            </label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Descreva a razão oficial pela qual a reunião não será realizada..."
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelling || cancelReason.trim().length < 5}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Reagendar Reunião */}
      <Dialog open={!!rescheduleTarget} onOpenChange={() => setRescheduleTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" /> Reagendar Reunião{' '}
              {rescheduleTarget?.meeting_code}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A nova data recalculará a semana ISO. Por governança, o agendamento anterior perde
              confirmação e a prévia precisará ser validada/reenviada.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Nova Data *</label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nova Hora Inicial</label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nova Hora Final</label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Motivo do Reagendamento * (mínimo 5 caracteres)
              </label>
              <Textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ex: Conflito de agenda da liderança fabril ou necessidade de consolidação de testes..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRescheduleTarget(null)}>
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReschedule}
              disabled={rescheduling || !newDate || rescheduleReason.trim().length < 5}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {rescheduling ? 'Reagendando...' : 'Confirmar Reagendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AgendaReunioesView
