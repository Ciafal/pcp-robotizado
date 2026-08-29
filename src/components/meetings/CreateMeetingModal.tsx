import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Clock, Video, MapPin, Users, Building, Plus, X } from 'lucide-react'
import { PCPMeeting, MeetingModality } from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { useToast } from '@/hooks/use-toast'

interface CreateMeetingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (meeting: PCPMeeting) => void
  initialDate?: string
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialDate,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [referenceWeek, setReferenceWeek] = useState(
    `Semana ${Math.ceil(new Date().getDate() / 7)} / ${new Date().getFullYear()}`,
  )
  const [meetingDate, setMeetingDate] = useState(
    initialDate || new Date().toISOString().split('T')[0],
  )
  const [meetingTime, setMeetingTime] = useState('15:00')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [modality, setModality] = useState<MeetingModality>('PRESENCIAL')
  const [location, setLocation] = useState('Sala de Reuniões PCP - Prédio Administrativo')
  const [onlineLink, setOnlineLink] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')

  // Linhas e Setores
  const [involvedLines, setInvolvedLines] = useState<string[]>(['L01', 'L02', 'L03', 'L04'])
  const [lineInput, setLineInput] = useState('')

  const [involvedSectors, setInvolvedSectors] = useState<string[]>([
    'PCP',
    'PRODUCAO',
    'QUALIDADE',
    'MANUTENCAO',
  ])

  // Participantes
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [mandatoryList, setMandatoryList] = useState<
    Array<{ user_id: string; name: string; email: string; status: 'PENDING' }>
  >([
    {
      user_id: 'usr1',
      name: 'Carlos Mendes',
      email: 'carlos.mendes@ciafal.com.br',
      status: 'PENDING',
    },
    {
      user_id: 'usr2',
      name: 'Roberto Silva',
      email: 'roberto.silva@ciafal.com.br',
      status: 'PENDING',
    },
    { user_id: 'usr3', name: 'Ana Paula', email: 'ana.paula@ciafal.com.br', status: 'PENDING' },
  ])

  const handleAddLine = () => {
    if (lineInput.trim() && !involvedLines.includes(lineInput.trim().toUpperCase())) {
      setInvolvedLines([...involvedLines, lineInput.trim().toUpperCase()])
      setLineInput('')
    }
  }

  const handleRemoveLine = (code: string) => {
    setInvolvedLines(involvedLines.filter((l) => l !== code))
  }

  const handleAddParticipant = () => {
    if (participantName.trim() && participantEmail.trim()) {
      setMandatoryList([
        ...mandatoryList,
        {
          user_id: `usr_${Date.now()}`,
          name: participantName.trim(),
          email: participantEmail.trim(),
          status: 'PENDING',
        },
      ])
      setParticipantName('')
      setParticipantEmail('')
    }
  }

  const handleRemoveParticipant = (email: string) => {
    setMandatoryList(mandatoryList.filter((p) => p.email !== email))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const created = await pcpMeetingService.createMeeting({
        title: title.trim() || `Reunião Semanal de PCP - ${referenceWeek}`,
        reference_week: referenceWeek,
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        duration_minutes: Number(durationMinutes),
        modality,
        location: modality !== 'ONLINE' ? location : '',
        online_link: modality !== 'PRESENCIAL' ? onlineLink : '',
        involved_lines: involvedLines,
        involved_sectors: involvedSectors,
        mandatory_participants: mandatoryList as any,
        general_notes: generalNotes,
      })

      toast({
        title: 'Reunião PCP Criada com Sucesso',
        description: `Compromisso gerado e convites expedidos para ${mandatoryList.length} participantes.`,
      })

      onSuccess(created)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar reunião',
        description: err.message || 'Falha ao gravar no backend',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#004C97]" />
            Agendar Nova Reunião Semanal de PCP
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
          {/* Título e Semana */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-slate-700 font-semibold">Título da Reunião</Label>
              <Input
                placeholder="Ex: Reunião Semanal de Sequenciamento & Desvios"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Semana de Referência *</Label>
              <Input
                required
                value={referenceWeek}
                onChange={(e) => setReferenceWeek(e.target.value)}
                className="h-8 text-xs border-slate-300 font-mono"
              />
            </div>
          </div>

          {/* Data, Horário e Duração */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" /> Data *
              </Label>
              <Input
                type="date"
                required
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Horário *
              </Label>
              <Input
                type="time"
                required
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Duração (minutos)</Label>
              <Input
                type="number"
                min={15}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="h-8 text-xs border-slate-300"
              />
            </div>
          </div>

          {/* Modalidade, Local e Link */}
          <div className="space-y-2">
            <Label className="text-slate-700 font-semibold">Modalidade</Label>
            <div className="flex gap-2">
              {(['PRESENCIAL', 'ONLINE', 'HIBRIDA'] as MeetingModality[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModality(m)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                    modality === m
                      ? 'bg-[#004C97] text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {m === 'PRESENCIAL' && '🏢 Presencial'}
                  {m === 'ONLINE' && '💻 Online'}
                  {m === 'HIBRIDA' && '🌐 Híbrida'}
                </button>
              ))}
            </div>

            {modality !== 'ONLINE' && (
              <div className="space-y-1 pt-1">
                <Label className="text-slate-600 flex items-center gap-1 text-[11px]">
                  <MapPin className="w-3 h-3" /> Local Físico
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Sala de Reuniões PCP - Sala 02"
                  className="h-8 text-xs border-slate-300"
                />
              </div>
            )}

            {modality !== 'PRESENCIAL' && (
              <div className="space-y-1 pt-1">
                <Label className="text-slate-600 flex items-center gap-1 text-[11px]">
                  <Video className="w-3 h-3" /> Link da Reunião Online (Teams / Meet)
                </Label>
                <Input
                  value={onlineLink}
                  onChange={(e) => setOnlineLink(e.target.value)}
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  className="h-8 text-xs border-slate-300"
                />
              </div>
            )}
          </div>

          {/* Linhas Envolvidas */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-semibold flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-500" /> Linhas Produtivas em Pauta
            </Label>
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
              {involvedLines.map((line) => (
                <Badge
                  key={line}
                  variant="outline"
                  className="bg-white text-[#004C97] border-blue-200 text-xs gap-1 font-mono"
                >
                  {line}
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(line)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <Input
                  placeholder="Código da linha (Ex: L05)"
                  value={lineInput}
                  onChange={(e) => setLineInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddLine()
                    }
                  }}
                  className="h-6 text-[11px] w-32 border-slate-300"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddLine}
                  className="h-6 px-2 text-[10px]"
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Convocação de Participantes Obrigatórios */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-500" /> Participantes Obrigatórios (Convite
              E-mail / Agenda)
            </Label>
            <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
              <div className="flex flex-wrap gap-1.5">
                {mandatoryList.map((p) => (
                  <Badge
                    key={p.email}
                    variant="outline"
                    className="bg-white text-slate-800 border-slate-300 text-xs gap-1.5 py-1 px-2"
                  >
                    <span>{p.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">({p.email})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.email)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                <Input
                  placeholder="Nome do participante"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  className="h-7 text-xs border-slate-300"
                />
                <Input
                  placeholder="E-mail corporativo"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  className="h-7 text-xs border-slate-300"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddParticipant}
                  className="h-7 text-xs bg-white text-slate-700 hover:bg-slate-100 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">Observações e Pauta Preliminar</Label>
            <Textarea
              placeholder="Instruções adicionais para os setores ou tópicos prioritários..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="text-xs border-slate-300 h-16 resize-none"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4"
            >
              {loading ? 'Agendando...' : 'Confirmar e Disparar Convites'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default CreateMeetingModal
