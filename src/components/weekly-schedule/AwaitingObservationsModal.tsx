import React, { useState, useEffect } from 'react'
import {
  AlertCircle,
  Clock,
  User,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle2,
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { useAuth } from '@/contexts/AuthContext'

interface AwaitingObservationsModalProps {
  isOpen: boolean
  onClose: () => void
  item: WeeklyScheduleItem | null
  onSave: (
    item: WeeklyScheduleItem,
    data: {
      reason: string
      observation: string
      responsible: string
      dateTime: string
      deadline?: string
    },
  ) => void
  onClearAwaiting?: (item: WeeklyScheduleItem) => void
}

const REASONS_LIST = [
  'Aguardando liberação de matéria-prima (tarugo/bobina)',
  'Aguardando confirmação comercial de pedido MTO',
  'Aguardando validação técnica de processo / Engenharia',
  'Aguardando laudo de qualidade / ensaio ultrassom',
  'Aguardando definição de sequência ou matriz de troca',
  'Aguardando autorização de gestão da linha / turno',
  'Outro motivo operacional / administrativo',
]

export const AwaitingObservationsModal: React.FC<AwaitingObservationsModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  onClearAwaiting,
}) => {
  const { user } = useAuth()
  const [reason, setReason] = useState<string>(REASONS_LIST[0])
  const [observation, setObservation] = useState<string>('')
  const [responsible, setResponsible] = useState<string>('')
  const [dateTime, setDateTime] = useState<string>('')
  const [deadline, setDeadline] = useState<string>('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen && item) {
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const defaultDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`

      if (item.awaiting_observations?.is_awaiting) {
        setReason(item.awaiting_observations.reason || REASONS_LIST[0])
        setObservation(item.awaiting_observations.observation || '')
        setResponsible(
          item.awaiting_observations.responsible || user?.name || user?.email || 'Programador PCP',
        )
        setDateTime(item.awaiting_observations.date_time || defaultDateTime)
        setDeadline(item.awaiting_observations.deadline || '')
      } else {
        setReason(REASONS_LIST[0])
        setObservation('')
        setResponsible(user?.name || user?.email || 'Programador PCP')
        setDateTime(defaultDateTime)
        setDeadline('')
      }
      setErrors({})
    }
  }, [isOpen, item, user])

  if (!item) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}

    if (!reason.trim()) {
      errs.reason = 'O motivo é obrigatório.'
    }
    if (!observation.trim()) {
      errs.observation = 'A observação descritiva é obrigatória.'
    }
    if (!responsible.trim()) {
      errs.responsible = 'O responsável é obrigatório.'
    }
    if (!dateTime.trim()) {
      errs.dateTime = 'A data e hora são obrigatórias.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    onSave(item, {
      reason,
      observation,
      responsible,
      dateTime,
      deadline: deadline ? deadline : undefined,
    })
    onClose()
  }

  const isCurrentlyAwaiting =
    item.awaiting_observations?.is_awaiting || item.status === 'AGUARDANDO_OBSERVACOES'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg bg-white p-0 overflow-hidden shadow-2xl border-slate-200">
        <DialogHeader className="bg-amber-500 text-slate-950 px-6 py-4 flex flex-row items-center justify-between border-b border-amber-400">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-400/80 rounded-lg text-slate-950">
              <AlertTriangle className="w-5 h-5 font-bold" />
            </div>
            <div>
              <DialogTitle className="text-base font-black tracking-tight text-slate-950">
                Aguardando Observações
              </DialogTitle>
              <p className="text-xs text-amber-950 font-medium mt-0.5">
                Item permanece na programação participando de todos os cálculos
              </p>
            </div>
          </div>
          <Badge className="bg-amber-950 text-amber-300 font-mono text-[10px] font-bold border-0">
            {item.material_code}
          </Badge>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Card com Detalhes do Produto Selecionado */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 space-y-1">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-bold text-slate-900">
                {item.material_code} &bull; {item.material_description || 'Produto'}
              </span>
              <Badge className="bg-white text-slate-700 border-slate-300 text-[10px] font-mono">
                {item.order_type}
              </Badge>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 font-mono">
              <span>
                Qtd: <strong>{item.planned_quantity_tons} t</strong> | Duração: ~
                {item.production_hours.toFixed(1)}h
              </span>
              <span>
                Dia: {item.day_of_week} ({item.shift_name})
              </span>
            </div>
          </div>

          {/* 1. Motivo (Obrigatório) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Motivo do Alerta *
            </label>
            <Select
              value={reason}
              onValueChange={(val) => {
                setReason(val)
                setErrors((prev) => ({ ...prev, reason: '' }))
              }}
            >
              <SelectTrigger className="w-full bg-slate-50 border-slate-300 text-xs">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {REASONS_LIST.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-[10px] text-rose-600 font-semibold">{errors.reason}</p>
            )}
          </div>

          {/* 2. Observação Detalhada (Obrigatório) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Observação / Descrição da Pendência *
            </label>
            <Textarea
              value={observation}
              onChange={(e) => {
                setObservation(e.target.value)
                setErrors((prev) => ({ ...prev, observation: '' }))
              }}
              rows={3}
              placeholder="Descreva a pendência ou instrução para a equipe de planejamento e produção..."
              className="bg-slate-50 border-slate-300 text-xs resize-none"
            />
            {errors.observation && (
              <p className="text-[10px] text-rose-600 font-semibold">{errors.observation}</p>
            )}
          </div>

          {/* Grid: Responsável & Data/Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 3. Responsável (Obrigatório) */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-600" />
                Responsável *
              </label>
              <Input
                value={responsible}
                onChange={(e) => {
                  setResponsible(e.target.value)
                  setErrors((prev) => ({ ...prev, responsible: '' }))
                }}
                placeholder="Nome do responsável..."
                className="bg-slate-50 border-slate-300 text-xs h-8"
              />
              {errors.responsible && (
                <p className="text-[10px] text-rose-600 font-semibold">{errors.responsible}</p>
              )}
            </div>

            {/* 4. Data/Hora do Registro (Obrigatório) */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Data e Hora *
              </label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => {
                  setDateTime(e.target.value)
                  setErrors((prev) => ({ ...prev, dateTime: '' }))
                }}
                className="bg-slate-50 border-slate-300 text-xs h-8 font-mono"
              />
              {errors.dateTime && (
                <p className="text-[10px] text-rose-600 font-semibold">{errors.dateTime}</p>
              )}
            </div>
          </div>

          {/* 5. Prazo Previsto (Quando Aplicável) */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              Prazo Limite para Resolução (Opcional)
            </label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-slate-50 border-slate-300 text-xs h-8 font-mono max-w-xs"
            />
            <p className="text-[10px] text-slate-400">
              Quando aplicável, informe a data em que a pendência deve estar resolvida.
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-200 flex flex-row items-center justify-between">
            {isCurrentlyAwaiting && onClearAwaiting ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClearAwaiting(item)
                  onClose()
                }}
                className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Liberar Pendência
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-slate-600"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                Marcar como Aguardando Observações
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
