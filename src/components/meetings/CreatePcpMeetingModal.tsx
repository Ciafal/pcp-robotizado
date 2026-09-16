import React, { useState, useEffect } from 'react'
import {
  CalendarDays,
  Plus,
  Clock,
  Building2,
  Users,
  MapPin,
  Video,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { getIsoWeekAndYear, getPlantNow } from '@/lib/temporal-utils'
import { PCPMeetingModality, PCPMeetingRecord } from '@/types/pcp-meeting'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface CreatePcpMeetingModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (meeting: PCPMeetingRecord) => void
}

export const CreatePcpMeetingModal: React.FC<CreatePcpMeetingModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Form states
  const now = getPlantNow()
  const initialDateStr = now.toISOString().slice(0, 10)
  const { week: initialWeek, year: initialYear } = getIsoWeekAndYear(now)

  const [meetingDate, setMeetingDate] = useState(initialDateStr)
  const [detectedWeek, setDetectedWeek] = useState(initialWeek)
  const [detectedYear, setDetectedYear] = useState(initialYear)
  const [title, setTitle] = useState(`Reunião Semanal PCP - S${initialWeek}/${initialYear}`)
  const [company, setCompany] = useState('CIAFAL')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:30')
  const [modality, setModality] = useState<PCPMeetingModality>('PRESENCIAL')
  const [location, setLocation] = useState('Unidade Industrial CIAFAL')
  const [room, setRoom] = useState('Sala de Reuniões PCP / Diretoria')
  const [onlineLink, setOnlineLink] = useState('')
  const [organizer, setOrganizer] = useState(user?.name || 'Coordenação PCP')
  const [conductor, setConductor] = useState(user?.name || 'Coordenação PCP')
  const [objective, setObjective] = useState(
    'Alinhamento semanal de programação, restrições fabris, testes programados e confirmação do sequenciamento.',
  )
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Ao mudar a data, recalcular a semana ISO e atualizar sugestão de título
  const handleDateChange = (newDate: string) => {
    setMeetingDate(newDate)
    if (!newDate) return
    const d = new Date(newDate + 'T12:00:00')
    if (!isNaN(d.getTime())) {
      const { week, year } = getIsoWeekAndYear(d)
      setDetectedWeek(week)
      setDetectedYear(year)
      setTitle(`Reunião Semanal PCP - S${week}/${year}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !meetingDate || !startTime || !endTime || !organizer || !conductor) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título, data, horários, organizador e condutor.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)
      const userContext = {
        id: user?.id,
        name: user?.name || 'Coordenação PCP',
      }

      const created = await pcpMeetingFatia1Service.createMeeting(
        {
          title: title.trim(),
          week: detectedWeek,
          year: detectedYear,
          company,
          meeting_date: meetingDate,
          start_time: startTime,
          expected_end_time: endTime,
          modality,
          location: modality !== 'ONLINE' ? location : undefined,
          room: modality !== 'ONLINE' ? room : undefined,
          online_link: modality !== 'PRESENCIAL' ? onlineLink : undefined,
          organizer: organizer.trim(),
          conductor: conductor.trim(),
          objective: objective.trim(),
          notes: notes.trim(),
        },
        userContext,
      )

      toast({
        title: 'Reunião PCP Criada com Sucesso!',
        description: `Código gerado: ${created.meeting_code} (Semana ISO: S${created.week}/${created.year}). Participantes convocados automaticamente.`,
      })

      onSuccess(created)
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar reunião',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#004C97] text-white font-mono text-xs">
              S{detectedWeek}/{detectedYear} (ISO)
            </Badge>
            <DialogTitle className="text-base font-black text-slate-900 tracking-tight">
              Nova Reunião PCP
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Preencha os parâmetros oficiais. O sistema convocará os representantes das áreas
            conforme matriz de participantes SGQ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs py-2">
          {/* Título e Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">Título da Reunião *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs font-semibold"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Empresa / Unidade *</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
              >
                <option value="CIAFAL">CIAFAL</option>
                <option value="SIDERCENTRO">SIDERCENTRO</option>
                <option value="INDUSTRIALIZADORES">INDUSTRIALIZADORES</option>
              </select>
            </div>
          </div>

          {/* Data, Horários e Semana ISO */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Data *</label>
              <Input
                type="date"
                value={meetingDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Hora Inicial *</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Hora Final Prevista *
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Semana ISO</label>
              <div className="h-9 flex items-center px-3 bg-slate-100 rounded border border-slate-200 font-mono font-bold text-slate-800 text-xs">
                S{detectedWeek} / {detectedYear}
              </div>
            </div>
          </div>

          {/* Modalidade */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Modalidade *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['PRESENCIAL', 'ONLINE', 'HIBRIDA'] as PCPMeetingModality[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModality(m)}
                  className={`py-2 px-3 rounded border text-xs font-bold transition-all text-center ${
                    modality === m
                      ? 'bg-[#004C97] text-white border-[#004C97] shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Campos condicionais de Local / Link */}
          {modality !== 'ONLINE' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Local Físico</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: CIAFAL - Bloco Industrial"
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sala</label>
                <Input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Ex: Sala de Reuniões 01"
                  className="text-xs bg-white"
                />
              </div>
            </div>
          )}

          {modality !== 'PRESENCIAL' && (
            <div className="p-3 bg-blue-50/50 rounded-md border border-blue-200">
              <label className="font-semibold text-blue-900 block mb-1">
                Link da Reunião Online (Teams / Meet / Zoom)
              </label>
              <Input
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                className="text-xs font-mono bg-white"
              />
            </div>
          )}

          {/* Organizador e Condutor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Organizador *</label>
              <Input
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Responsável pela Condução *
              </label>
              <Input
                value={conductor}
                onChange={(e) => setConductor(e.target.value)}
                className="text-xs"
                required
              />
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Objetivo da Reunião</label>
            <Textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Observações Adicionais
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções de preparação ou restrições especiais..."
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold"
            >
              {saving ? 'Criando...' : '+ Gravar e Iniciar Preparação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default CreatePcpMeetingModal
