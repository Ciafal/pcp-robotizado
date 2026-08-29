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
import { CalendarDays, Clock, RefreshCw } from 'lucide-react'
import { PCPMeeting } from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { useToast } from '@/hooks/use-toast'

interface RescheduleMeetingModalProps {
  meeting: PCPMeeting | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (updated: PCPMeeting) => void
}

export const RescheduleMeetingModal: React.FC<RescheduleMeetingModalProps> = ({
  meeting,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [newDate, setNewDate] = useState(meeting?.meeting_date || '')
  const [newTime, setNewTime] = useState(meeting?.meeting_time || '15:00')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!meeting) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo obrigatório',
        description: 'É mandatório registrar a justificativa técnica para a remarcação.',
      })
      return
    }

    setLoading(true)
    try {
      const updated = await pcpMeetingService.rescheduleMeeting(meeting.id, {
        newDate,
        newTime,
        reason: reason.trim(),
        currentMeeting: meeting,
      })

      toast({
        title: 'Reunião Remarcada',
        description: `Nova data ${newDate} às ${newTime} registrada com auditoria. Participantes informados automaticamente.`,
      })
      onSuccess(updated)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remarcar reunião',
        description: err.message || 'Falha no servidor',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#004C97]" />
            Remarcação de Reunião PCP
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs pt-2">
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-md text-slate-700 space-y-1">
            <span className="font-bold text-[#004C97] block">{meeting.title}</span>
            <div className="text-[11px] text-slate-600">
              Horário Anterior:{' '}
              <strong className="text-slate-800">
                {meeting.meeting_date} às {meeting.meeting_time}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5 text-slate-500" /> Nova Data *
              </Label>
              <Input
                type="date"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Novo Horário *
              </Label>
              <Input
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">
              Motivo da Remarcação (Rastreabilidade Obrigatória) *
            </Label>
            <Textarea
              required
              placeholder="Ex: Conflito de agenda da diretoria industrial e necessidade de consolidação de laudos de qualidade..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs border-slate-300 h-20 resize-none"
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
              {loading ? 'Salvando...' : 'Confirmar Remarcação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default RescheduleMeetingModal
