import React, { useState } from 'react'
import {
  Clock,
  Users,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Calendar,
  AlertTriangle,
  Link as LinkIcon,
  Layers,
  Loader2,
} from 'lucide-react'
import {
  DateInputPtBr,
  parseDatePtBr,
  formatDatePtBr,
} from '@/components/mp-optimization/DateInputPtBr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { lineMasterService } from '@/services/line-master'
import {
  ProductionCrew,
  ProductionLine,
  ProductionShift,
  ProductionShiftCrew,
} from '@/types/line-master'

interface LineShiftsAndCrewsPanelProps {
  line: ProductionLine
  shifts: ProductionShift[]
  crews: ProductionCrew[]
  shiftCrews: ProductionShiftCrew[]
  onRefresh: () => void
}

export const LineShiftsAndCrewsPanel: React.FC<LineShiftsAndCrewsPanelProps> = ({
  line,
  shifts = [],
  crews = [],
  shiftCrews = [],
  onRefresh,
}) => {
  const { toast } = useToast()

  // Modal states - Shifts
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState<ProductionShift | null>(null)
  const [shiftCode, setShiftCode] = useState('')
  const [shiftName, setShiftName] = useState('')
  const [shiftStartTime, setShiftStartTime] = useState('06:00')
  const [shiftEndTime, setShiftEndTime] = useState('14:00')
  const [shiftOrder, setShiftOrder] = useState<number>(1)
  const [shiftBreakMin, setShiftBreakMin] = useState<number>(40)
  const [shiftScale, setShiftScale] = useState<'5X2' | '6X1' | '12X36' | '5X1'>('6X1')
  const [shiftValidFrom, setShiftValidFrom] = useState('')
  const [shiftValidUntil, setShiftValidUntil] = useState('')
  const [shiftActive, setShiftActive] = useState(true)

  // Modal states - Crews
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false)
  const [editingCrew, setEditingCrew] = useState<ProductionCrew | null>(null)
  const [crewCode, setCrewCode] = useState('')
  const [crewName, setCrewName] = useState('')
  const [crewDesc, setCrewDesc] = useState('')
  const [crewValidFrom, setCrewValidFrom] = useState('')
  const [crewValidUntil, setCrewValidUntil] = useState('')
  const [crewActive, setCrewActive] = useState(true)
  const [crewNotes, setCrewNotes] = useState('')

  // Modal states - Shift x Crew Link
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [editingShiftCrew, setEditingShiftCrew] = useState<ProductionShiftCrew | null>(null)
  const [linkShiftId, setLinkShiftId] = useState('')
  const [linkCrewId, setLinkCrewId] = useState('')
  const [linkValidFrom, setLinkValidFrom] = useState('')
  const [linkValidUntil, setLinkValidUntil] = useState('')
  const [linkStatus, setLinkStatus] = useState<'ATIVO' | 'INATIVO'>('ATIVO')
  const [linkNotes, setLinkNotes] = useState('')
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [linkErrorMessage, setLinkErrorMessage] = useState<string | null>(null)

  // Helper: calculate duration between HH:MM and HH:MM
  const calculateDuration = (start: string, end: string): { hours: number; display: string } => {
    if (!start || !end) return { hours: 8, display: '8 h' }
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    let minDiff = h2 * 60 + m2 - (h1 * 60 + m1)
    if (minDiff <= 0) {
      minDiff += 24 * 60 // passes midnight
    }
    const hours = Math.round((minDiff / 60) * 100) / 100
    return { hours, display: `${hours} h` }
  }

  // Shift CRUD
  const handleOpenAddShift = () => {
    setEditingShift(null)
    const nextSeq =
      shifts.length > 0 ? Math.max(...shifts.map((s) => s.sequence_order || 0)) + 1 : 1
    setShiftCode(`T${nextSeq}`)
    setShiftName(`${nextSeq}º Turno`)
    setShiftStartTime(nextSeq === 1 ? '06:00' : nextSeq === 2 ? '14:00' : '22:00')
    setShiftEndTime(nextSeq === 1 ? '14:00' : nextSeq === 2 ? '22:00' : '06:00')
    setShiftOrder(nextSeq)
    setShiftBreakMin(40)
    setShiftScale('6X1')
    setShiftValidFrom('')
    setShiftValidUntil('')
    setShiftActive(true)
    setIsShiftModalOpen(true)
  }

  const handleOpenEditShift = (shift: ProductionShift) => {
    setEditingShift(shift)
    setShiftCode(shift.code)
    setShiftName(shift.name)
    setShiftStartTime(shift.start_time)
    setShiftEndTime(shift.end_time)
    setShiftOrder(shift.sequence_order || 1)
    setShiftBreakMin(shift.break_minutes || 40)
    setShiftScale(shift.scale || '6X1')
    setShiftValidFrom(shift.valid_from ? shift.valid_from.substring(0, 10) : '')
    setShiftValidUntil(shift.valid_until ? shift.valid_until.substring(0, 10) : '')
    setShiftActive(shift.active !== false)
    setIsShiftModalOpen(true)
  }

  const handleSaveShift = async () => {
    if (!shiftCode.trim() || !shiftStartTime || !shiftEndTime || !shiftScale) {
      toast({
        variant: 'destructive',
        title: 'Dados obrigatórios',
        description: 'Informe o código, horários e escala operacional do turno.',
      })
      return
    }

    // Validação de duplicação de código na mesma linha e vigência
    const isDuplicate = shifts.some((s) => {
      if (editingShift && s.id === editingShift.id) return false
      return s.code.trim().toUpperCase() === shiftCode.trim().toUpperCase()
    })
    if (isDuplicate) {
      toast({
        variant: 'destructive',
        title: 'Código de Turno Duplicado',
        description: `Já existe um turno com o código ${shiftCode.toUpperCase()} cadastrado nesta linha.`,
      })
      return
    }

    const { hours } = calculateDuration(shiftStartTime, shiftEndTime)

    try {
      await lineMasterService.saveShift({
        id: editingShift?.id,
        line_id: line.id,
        code: shiftCode.trim().toUpperCase(),
        name: shiftName.trim() || shiftCode.trim().toUpperCase(),
        sequence_order: Number(shiftOrder) || 1,
        start_time: shiftStartTime,
        end_time: shiftEndTime,
        duration_hours: hours,
        break_minutes: Number(shiftBreakMin) || 0,
        scale: shiftScale,
        active: shiftActive,
        valid_from: shiftValidFrom || undefined,
        valid_until: shiftValidUntil || undefined,
        crosses_midnight: shiftStartTime > shiftEndTime,
      })

      toast({
        title: editingShift ? 'Turno Atualizado' : 'Turno Cadastrado',
        description: `Turno ${shiftCode} salvo com sucesso para a linha ${line.code}.`,
      })
      setIsShiftModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar turno',
        description: err.message || 'Falha na persistência.',
      })
    }
  }

  const handleToggleShiftActive = async (shift: ProductionShift) => {
    try {
      await lineMasterService.toggleShiftStatus(shift.id, !shift.active)
      toast({
        title: shift.active ? 'Turno Desativado' : 'Turno Ativado',
        description: `Turno ${shift.code} agora está ${shift.active ? 'INATIVO' : 'ATIVO'}.`,
      })
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err.message,
      })
    }
  }

  const handleDeleteShift = async (shiftId: string, shiftCodeStr: string) => {
    if (!window.confirm(`Deseja remover o turno ${shiftCodeStr} da linha ${line.code}?`)) return
    try {
      await lineMasterService.deleteShift(shiftId)
      toast({
        title: 'Turno Removido',
        description: `Turno ${shiftCodeStr} excluído.`,
      })
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir turno',
        description: err.message,
      })
    }
  }

  // Crew CRUD
  const handleOpenAddCrew = () => {
    setEditingCrew(null)
    const letter = String.fromCharCode(65 + crews.length) // A, B, C, D...
    setCrewCode(letter)
    setCrewName(`Turma ${letter}`)
    setCrewDesc(`Turma Operacional ${letter}`)
    setCrewValidFrom('')
    setCrewValidUntil('')
    setCrewActive(true)
    setCrewNotes('')
    setIsCrewModalOpen(true)
  }

  const handleOpenEditCrew = (crew: ProductionCrew) => {
    setEditingCrew(crew)
    setCrewCode(crew.code)
    setCrewName(crew.name)
    setCrewDesc(crew.description || '')
    setCrewValidFrom(crew.valid_from ? crew.valid_from.substring(0, 10) : '')
    setCrewValidUntil(crew.valid_until ? crew.valid_until.substring(0, 10) : '')
    setCrewActive(crew.active !== false)
    setCrewNotes(crew.notes || '')
    setIsCrewModalOpen(true)
  }

  const handleSaveCrew = async () => {
    if (!crewCode.trim() || !crewName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Dados obrigatórios',
        description: 'Informe o código e a descrição/nome da turma.',
      })
      return
    }

    const isDuplicate = crews.some((c) => {
      if (editingCrew && c.id === editingCrew.id) return false
      return c.code.trim().toUpperCase() === crewCode.trim().toUpperCase()
    })
    if (isDuplicate) {
      toast({
        variant: 'destructive',
        title: 'Código de Turma Duplicado',
        description: `Já existe uma turma com o código ${crewCode.toUpperCase()} cadastrada nesta linha.`,
      })
      return
    }

    try {
      await lineMasterService.saveCrew({
        id: editingCrew?.id,
        line_id: line.id,
        code: crewCode.trim().toUpperCase(),
        name: crewName.trim(),
        description: crewDesc.trim() || undefined,
        active: crewActive,
        valid_from: crewValidFrom || undefined,
        valid_until: crewValidUntil || undefined,
        notes: crewNotes.trim() || undefined,
      })

      toast({
        title: editingCrew ? 'Turma Atualizada' : 'Turma Cadastrada',
        description: `Turma ${crewCode} salva com sucesso para a linha ${line.code}.`,
      })
      setIsCrewModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar turma',
        description: err.message || 'Falha na persistência.',
      })
    }
  }

  const handleToggleCrewActive = async (crew: ProductionCrew) => {
    try {
      await lineMasterService.toggleCrewStatus(crew.id, !crew.active)
      toast({
        title: crew.active ? 'Turma Desativada' : 'Turma Ativada',
        description: `Turma ${crew.code} agora está ${crew.active ? 'INATIVA' : 'ATIVA'}.`,
      })
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err.message,
      })
    }
  }

  const handleDeleteCrew = async (crewId: string, crewCodeStr: string) => {
    if (!window.confirm(`Deseja remover a turma ${crewCodeStr} da linha ${line.code}?`)) return
    try {
      await lineMasterService.deleteCrew(crewId)
      toast({
        title: 'Turma Removida',
        description: `Turma ${crewCodeStr} excluída.`,
      })
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir turma',
        description: err.message,
      })
    }
  }

  // Shift x Crew Links
  const handleOpenLinkModal = (defaultShiftId?: string) => {
    setEditingShiftCrew(null)
    setLinkShiftId(defaultShiftId || shifts[0]?.id || '')
    // Procura a primeira turma disponível ou a primeira da lista
    setLinkCrewId(crews[0]?.id || '')
    // Data de início padrão hoje em dd/mm/aaaa
    setLinkValidFrom(formatDatePtBr(new Date()))
    setLinkValidUntil('')
    setLinkStatus('ATIVO')
    setLinkNotes('')
    setLinkErrorMessage(null)
    setIsLinkModalOpen(true)
  }

  const handleOpenEditLinkModal = (link: ProductionShiftCrew) => {
    setEditingShiftCrew(link)
    setLinkShiftId(link.shift_id)
    setLinkCrewId(link.crew_id)

    // Converter YYYY-MM-DD para DD/MM/AAAA
    if (link.valid_from) {
      const parsed = new Date(link.valid_from)
      setLinkValidFrom(!isNaN(parsed.getTime()) ? formatDatePtBr(parsed) : '')
    } else {
      setLinkValidFrom(formatDatePtBr(new Date()))
    }

    if (link.valid_until) {
      const parsedUntil = new Date(link.valid_until)
      setLinkValidUntil(!isNaN(parsedUntil.getTime()) ? formatDatePtBr(parsedUntil) : '')
    } else {
      setLinkValidUntil('')
    }

    const currentStatus = (
      link.status || (link.active !== false ? 'ATIVO' : 'INATIVO')
    ).toUpperCase()
    setLinkStatus(currentStatus === 'INATIVO' ? 'INATIVO' : 'ATIVO')
    setLinkNotes(link.notes || '')
    setLinkErrorMessage(null)
    setIsLinkModalOpen(true)
  }

  const handleSaveShiftCrewLink = async () => {
    if (isSavingLink) return
    setLinkErrorMessage(null)

    // (1) Validar os campos
    if (!linkShiftId) {
      setLinkErrorMessage('Selecione o Turno.')
      return
    }

    if (!linkCrewId) {
      setLinkErrorMessage('Selecione a Turma Operacional.')
      return
    }

    if (!linkValidFrom || !linkValidFrom.trim()) {
      setLinkErrorMessage('Data de início é obrigatória (formato DD/MM/AAAA).')
      return
    }

    const parsedFrom = parseDatePtBr(linkValidFrom)
    if (!parsedFrom) {
      setLinkErrorMessage('Data de início inválida. Utilize o formato DD/MM/AAAA.')
      return
    }

    let parsedUntil: Date | null = null
    if (linkValidUntil && linkValidUntil.trim()) {
      parsedUntil = parseDatePtBr(linkValidUntil)
      if (!parsedUntil) {
        setLinkErrorMessage('Data de fim inválida. Utilize o formato DD/MM/AAAA.')
        return
      }
      if (parsedUntil < parsedFrom) {
        setLinkErrorMessage('A Data de fim não pode ser anterior à Data de início.')
        return
      }
    }

    // Datas em ISO YYYY-MM-DD para envio ao backend
    const fromIso = `${parsedFrom.getFullYear()}-${String(parsedFrom.getMonth() + 1).padStart(2, '0')}-${String(parsedFrom.getDate()).padStart(2, '0')}`
    const untilIso = parsedUntil
      ? `${parsedUntil.getFullYear()}-${String(parsedUntil.getMonth() + 1).padStart(2, '0')}-${String(parsedUntil.getDate()).padStart(2, '0')}`
      : undefined

    // (2) Validação prévia de cardinalidade / sobreposição no front para feedback imediato
    if (linkStatus === 'ATIVO') {
      const overlappingConflict = shiftCrews.find((sc) => {
        if (editingShiftCrew && sc.id === editingShiftCrew.id) return false
        if (sc.crew_id !== linkCrewId) return false
        const otherStatus = (sc.status || (sc.active !== false ? 'ATIVO' : 'INATIVO')).toUpperCase()
        if (otherStatus !== 'ATIVO') return false

        const scFrom = sc.valid_from ? sc.valid_from.slice(0, 10) : '0000-01-01'
        const scUntil = sc.valid_until ? sc.valid_until.slice(0, 10) : '9999-12-31'
        const currentEnd = untilIso || '9999-12-31'

        return fromIso <= scUntil && currentEnd >= scFrom
      })

      if (overlappingConflict) {
        const conflictShift = shifts.find((s) => s.id === overlappingConflict.shift_id)
        const conflictShiftCode = conflictShift?.code || conflictShift?.name || 'outro turno'
        const msg = `Esta turma já possui vínculo vigente com o turno ${conflictShiftCode}. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.`
        setLinkErrorMessage(msg)
        return
      }
    }

    const selectedShift = shifts.find((s) => s.id === linkShiftId)
    const selectedCrew = crews.find((c) => c.id === linkCrewId)
    const shiftCodeDisplay = selectedShift?.code || 'TURNO'
    const crewCodeDisplay = selectedCrew?.code || 'TURMA'

    setIsSavingLink(true)
    try {
      // (3) Gravar efetivamente o vínculo no banco
      await lineMasterService.saveShiftCrew({
        id: editingShiftCrew?.id,
        line_id: line.id,
        shift_id: linkShiftId,
        crew_id: linkCrewId,
        valid_from: fromIso,
        valid_until: untilIso,
        status: linkStatus,
        active: linkStatus === 'ATIVO',
        notes: linkNotes.trim() || undefined,
      })

      // (4) Fechar o popup somente após confirmação da gravação
      setIsLinkModalOpen(false)

      // (5) Atualizar imediatamente a seção Turnos e Turmas na tela, sem recarga manual
      onRefresh()

      // (6) Apresentar mensagem de sucesso com texto EXATO exigido
      toast({
        title: 'Vínculo Confirmado',
        description: `Vínculo entre o turno ${shiftCodeDisplay} e a turma ${crewCodeDisplay} realizado com sucesso.`,
      })
    } catch (err: any) {
      // Em caso de erro: NÃO fechar popup, NÃO apagar campos, registrar tecnicamente no log
      console.error('[ERRO_TECNICO_VINCULO_TURNO_TURMA]', err)
      const backendMessage =
        err?.data?.data?.crew_id?.message ||
        err?.data?.data?.valid_until?.message ||
        err?.data?.data?.valid_from?.message ||
        err?.message ||
        'Não foi possível concluir o vínculo entre turno e turma.'
      setLinkErrorMessage(backendMessage)
      toast({
        variant: 'destructive',
        title: 'Falha na Gravação do Vínculo',
        description: backendMessage,
      })
    } finally {
      setIsSavingLink(false)
    }
  }

  const handleInactivateShiftCrewLink = async (link: ProductionShiftCrew) => {
    try {
      await lineMasterService.inactivateShiftCrew(link.id)
      const matchedShift = shifts.find((s) => s.id === link.shift_id)
      const matchedCrew = crews.find((c) => c.id === link.crew_id)
      toast({
        title: 'Vínculo Inativado',
        description: `Vínculo entre ${matchedShift?.code || 'turno'} e ${matchedCrew?.code || 'turma'} foi inativado e mantido no histórico.`,
      })
      onRefresh()
    } catch (err: any) {
      console.error('[ERRO_INATIVAR_VINCULO]', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao inativar vínculo',
        description: err.message || 'Erro ao atualizar status do vínculo.',
      })
    }
  }

  const handleToggleLinkStatus = async (link: ProductionShiftCrew) => {
    const isCurrentlyActive =
      (link.status || (link.active !== false ? 'ATIVO' : 'INATIVO')) === 'ATIVO'
    const nextStatus = isCurrentlyActive ? 'INATIVO' : 'ATIVO'

    try {
      await lineMasterService.saveShiftCrew({
        id: link.id,
        line_id: link.line_id,
        shift_id: link.shift_id,
        crew_id: link.crew_id,
        valid_from: link.valid_from ? link.valid_from.slice(0, 10) : undefined,
        valid_until: link.valid_until ? link.valid_until.slice(0, 10) : undefined,
        status: nextStatus,
        active: nextStatus === 'ATIVO',
        notes: link.notes,
      })
      toast({
        title: nextStatus === 'ATIVO' ? 'Vínculo Ativado' : 'Vínculo Inativado',
        description: `Status alterado para ${nextStatus}.`,
      })
      onRefresh()
    } catch (err: any) {
      console.error('[ERRO_ALTERAR_STATUS_VINCULO]', err)
      const msg = err?.data?.data?.crew_id?.message || err.message || 'Erro ao alterar status.'
      toast({
        variant: 'destructive',
        title: 'Falha na alteração',
        description: msg,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE TURNOS */}
      <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#004C97]" />
              Turnos Operacionais da Linha ({shifts.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Jornada de trabalho parametrizada para a linha {line.code} ({line.name}).
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleOpenAddShift}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-7 gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Adicionar Turno
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {shifts.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhum turno configurado para esta linha.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique em "+ Adicionar Turno" para parametrizar a escala operacional (ex.: T1, T2,
                T3).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5">Escala</th>
                    <th className="p-2.5">Hora Inicial</th>
                    <th className="p-2.5">Hora Final</th>
                    <th className="p-2.5">Duração</th>
                    <th className="p-2.5">Intervalo</th>
                    <th className="p-2.5 text-center">Ordem</th>
                    <th className="p-2.5">Vigência</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {shifts.map((s) => {
                    const dur = calculateDuration(s.start_time, s.end_time)
                    const isActive = s.active !== false
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-slate-900">
                          <span className="bg-blue-50 text-[#004C97] px-2 py-0.5 rounded border border-blue-200">
                            {s.code}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans font-medium text-slate-800">{s.name}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-700">
                          {s.scale ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono font-semibold bg-slate-50 text-slate-700 border-slate-300"
                            >
                              {s.scale === '5X2'
                                ? '5x2'
                                : s.scale === '6X1'
                                  ? '6x1'
                                  : s.scale === '12X36'
                                    ? '12x36'
                                    : s.scale === '5X1'
                                      ? '5x1'
                                      : s.scale}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700">{s.start_time}</td>
                        <td className="p-2.5 text-slate-700">{s.end_time}</td>
                        <td className="p-2.5 font-bold text-slate-900">{dur.display}</td>
                        <td className="p-2.5 text-slate-500 font-sans">
                          {s.break_minutes || 0} min
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-600">
                          #{s.sequence_order || 1}
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px] font-sans">
                          {s.valid_from ? s.valid_from.substring(0, 10) : 'Início imediato'}
                          {s.valid_until
                            ? ` até ${s.valid_until.substring(0, 10)}`
                            : ' (sem término)'}
                        </td>
                        <td className="p-2.5 text-center font-sans">
                          {isActive ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                              ATIVO
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-bold">
                              INATIVO
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-sans">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleShiftActive(s)}
                              title={isActive ? 'Desativar turno' : 'Ativar turno'}
                              className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-slate-900"
                            >
                              {isActive ? (
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditShift(s)}
                              className="h-6 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50"
                            >
                              <Edit2 className="w-3 h-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteShift(s.id, s.code)}
                              className="h-6 px-1.5 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SEÇÃO DE TURMAS */}
      <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#004C97]" />
              Turmas Operacionais da Linha ({crews.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Equipes de operadores e técnicos associadas à linha {line.code}.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={handleOpenAddCrew}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-7 gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Adicionar Turma
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {crews.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhuma turma cadastrada nesta linha.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Clique em "+ Adicionar Turma" para cadastrar turmas operacionais (ex.: A, B, C, D).
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Código</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5">Observação</th>
                    <th className="p-2.5">Vigência</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {crews.map((c) => {
                    const isActive = c.active !== false
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded border border-slate-300 font-bold">
                            {c.code}
                          </span>
                        </td>
                        <td className="p-2.5 font-medium text-slate-900">{c.name}</td>
                        <td className="p-2.5 text-slate-500 text-[11px] max-w-[200px] truncate">
                          {c.description || c.notes || '-'}
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">
                          {c.valid_from ? c.valid_from.substring(0, 10) : 'Início imediato'}
                          {c.valid_until ? ` até ${c.valid_until.substring(0, 10)}` : ' (contínuo)'}
                        </td>
                        <td className="p-2.5 text-center">
                          {isActive ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                              ATIVO
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-bold">
                              INATIVO
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCrewActive(c)}
                              title={isActive ? 'Desativar turma' : 'Ativar turma'}
                              className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-slate-900"
                            >
                              {isActive ? (
                                <XCircle className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditCrew(c)}
                              className="h-6 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50"
                            >
                              <Edit2 className="w-3 h-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCrew(c.id, c.code)}
                              className="h-6 px-1.5 text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. SEÇÃO DE RELAÇÃO TURNO × TURMA */}
      <Card className="bg-white border-slate-200 shadow-sm text-slate-900">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#004C97]" />
              Associação Turno &times; Turma ({shiftCrews.length} vínculos)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Escala operacional com controle de vigência e histórico imutável para a linha{' '}
              {line.code}. 1 Turno suporta múltiplas Turmas; cada Turma possui vínculo único por
              vigência.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenLinkModal()}
            disabled={shifts.length === 0 || crews.length === 0}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-7 gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> + Vincular Turno &times; Turma
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-3">
          {shiftCrews.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <LinkIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Nenhum vínculo Turno &times; Turma cadastrado.
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Vincule as turmas operacionais aos turnos para permitir o sequenciamento no motor
                temporal.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tabela Unificada Completa de Vínculos com Vigência e Status */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Turno</th>
                      <th className="p-2.5">Turma Operacional</th>
                      <th className="p-2.5">Data de Início</th>
                      <th className="p-2.5">Data de Fim</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Observações da Escala</th>
                      <th className="p-2.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shiftCrews.map((link) => {
                      const matchedShift =
                        shifts.find((s) => s.id === link.shift_id) || (link.expand as any)?.shift_id
                      const matchedCrew =
                        crews.find((c) => c.id === link.crew_id) || (link.expand as any)?.crew_id

                      const shiftCodeStr = matchedShift?.code || 'Turno'
                      const shiftNameStr = matchedShift?.name || ''
                      const crewCodeStr = matchedCrew?.code || 'Turma'
                      const crewNameStr = matchedCrew?.name || crewCodeStr

                      const rawStatus = (
                        link.status || (link.active !== false ? 'ATIVO' : 'INATIVO')
                      ).toUpperCase()
                      const isActive = rawStatus === 'ATIVO'

                      // Formatação brasileira de datas dd/mm/aaaa
                      const formatDisplayDate = (dStr?: string) => {
                        if (!dStr) return null
                        const clean = dStr.slice(0, 10)
                        if (clean.includes('-')) {
                          const [y, m, d] = clean.split('-')
                          return `${d}/${m}/${y}`
                        }
                        return clean
                      }

                      const dateFromFormatted = formatDisplayDate(link.valid_from) || 'Imediato'
                      const dateUntilFormatted =
                        formatDisplayDate(link.valid_until) || 'Indeterminado'

                      return (
                        <tr
                          key={link.id}
                          className={`hover:bg-slate-50/80 transition-colors ${!isActive ? 'bg-slate-50/50 text-slate-500' : ''}`}
                        >
                          <td className="p-2.5 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 bg-blue-50 text-[#004C97] px-2 py-0.5 rounded border border-blue-200">
                                {shiftCodeStr}
                              </span>
                              {shiftNameStr && (
                                <span className="text-[11px] text-slate-600 font-medium">
                                  {shiftNameStr}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                                {crewCodeStr}
                              </span>
                              <span className="text-[11px] text-slate-700 font-medium">
                                {crewNameStr}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 font-mono text-xs font-semibold text-slate-700">
                            {dateFromFormatted}
                          </td>
                          <td className="p-2.5 font-mono text-xs text-slate-600">
                            {dateUntilFormatted}
                          </td>
                          <td className="p-2.5 text-center">
                            {isActive ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                                ATIVO
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-bold">
                                INATIVO
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px] max-w-[200px] truncate">
                            {link.notes || '-'}
                          </td>
                          <td className="p-2.5 text-right font-sans">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleLinkStatus(link)}
                                title={
                                  isActive
                                    ? 'Inativar vínculo (mantém no histórico)'
                                    : 'Ativar vínculo'
                                }
                                className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-slate-900"
                              >
                                {isActive ? (
                                  <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditLinkModal(link)}
                                className="h-6 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50"
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Editar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visão de Cards Agrupados por Turno (1 Turno -> Várias Turmas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {shifts.map((shift) => {
                  const shiftLinks = shiftCrews.filter((sc) => sc.shift_id === shift.id)
                  const activeLinks = shiftLinks.filter(
                    (sc) =>
                      (sc.status || (sc.active !== false ? 'ATIVO' : 'INATIVO')).toUpperCase() ===
                      'ATIVO',
                  )
                  return (
                    <div
                      key={shift.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-[#004C97]">
                            {shift.code}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {shift.start_time}–{shift.end_time}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                          {activeLinks.length} turma(s) ativa(s)
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Turmas no Turno:
                        </span>
                        {shiftLinks.length === 0 ? (
                          <span className="text-xs text-amber-600 italic block">
                            Nenhuma turma vinculada a este turno.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {shiftLinks.map((link) => {
                              const matchedCrew =
                                crews.find((c) => c.id === link.crew_id) ||
                                (link.expand as any)?.crew_id
                              const crewCodeStr = matchedCrew?.code || 'Turma'
                              const crewNameStr = matchedCrew?.name || crewCodeStr
                              const isLinkActive =
                                (
                                  link.status || (link.active !== false ? 'ATIVO' : 'INATIVO')
                                ).toUpperCase() === 'ATIVO'
                              return (
                                <div
                                  key={link.id}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded shadow-2xs text-xs border ${
                                    isLinkActive
                                      ? 'bg-white border-slate-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-300'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-slate-900">
                                    {crewCodeStr}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    ({crewNameStr})
                                  </span>
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${isLinkActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                    title={isLinkActive ? 'Vínculo Ativo' : 'Vínculo Inativo'}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditLinkModal(link)}
                                    className="text-slate-400 hover:text-[#004C97] ml-1"
                                    title="Editar vínculo"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenLinkModal(shift.id)}
                          className="w-full text-xs text-[#004C97] hover:bg-blue-50 font-semibold h-6"
                        >
                          + Vincular Turma ao {shift.code}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Criar / Editar Turno */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-[#004C97] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-sm">
                  {editingShift ? 'Editar Turno Operacional' : 'Novo Turno Operacional'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShiftModalOpen(false)}
                className="text-white/80 hover:text-white text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Código do Turno (ex.: T1, T2) *</Label>
                  <Input
                    value={shiftCode}
                    onChange={(e) => setShiftCode(e.target.value.toUpperCase())}
                    placeholder="T1"
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Descrição / Nome do Turno</Label>
                  <Input
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="1º Turno Matutino"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Hora Inicial *</Label>
                  <Input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Hora Final *</Label>
                  <Input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Duração Calculada</Label>
                  <div className="h-8 rounded border border-slate-200 bg-slate-50 flex items-center px-3 font-mono font-bold text-slate-900">
                    {calculateDuration(shiftStartTime, shiftEndTime).display}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-bold">Escala *</Label>
                <select
                  value={shiftScale}
                  onChange={(e) => setShiftScale(e.target.value as '5X2' | '6X1' | '12X36' | '5X1')}
                  className="w-full bg-slate-50 border border-slate-300 rounded text-xs p-2 font-medium"
                >
                  <option value="5X2">Escala 5x2</option>
                  <option value="6X1">Escala 6x1</option>
                  <option value="12X36">Escala 12x36</option>
                  <option value="5X1">Escala 5x1</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Ordem de Execução</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={shiftOrder}
                    onChange={(e) => setShiftOrder(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Intervalo / Refeição (minutos)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={shiftBreakMin}
                    onChange={(e) => setShiftBreakMin(Number(e.target.value))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Vigência Inicial</Label>
                  <Input
                    type="date"
                    value={shiftValidFrom}
                    onChange={(e) => setShiftValidFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Vigência Final</Label>
                  <Input
                    type="date"
                    value={shiftValidUntil}
                    onChange={(e) => setShiftValidUntil(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="shiftActiveCheckbox"
                  checked={shiftActive}
                  onChange={(e) => setShiftActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                />
                <Label
                  htmlFor="shiftActiveCheckbox"
                  className="text-xs text-slate-700 font-semibold cursor-pointer"
                >
                  Turno Ativo para Planejamento e Sequenciamento
                </Label>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsShiftModalOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveShift}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8"
              >
                {editingShift ? 'Salvar Alterações' : 'Criar Turno'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Criar / Editar Turma */}
      {isCrewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-[#004C97] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-sm">
                  {editingCrew ? 'Editar Turma Operacional' : 'Nova Turma Operacional'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCrewModalOpen(false)}
                className="text-white/80 hover:text-white text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Código Compacto (ex.: A, B, C) *</Label>
                  <Input
                    value={crewCode}
                    onChange={(e) => setCrewCode(e.target.value.toUpperCase())}
                    placeholder="A"
                    maxLength={10}
                    className="h-8 text-xs font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Descrição / Nome da Turma *</Label>
                  <Input
                    value={crewName}
                    onChange={(e) => setCrewName(e.target.value)}
                    placeholder="Turma A"
                    className="h-8 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Observações / Escopo</Label>
                <Input
                  value={crewDesc}
                  onChange={(e) => setCrewDesc(e.target.value)}
                  placeholder="Equipe de laminação contínua"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Vigência Inicial</Label>
                  <Input
                    type="date"
                    value={crewValidFrom}
                    onChange={(e) => setCrewValidFrom(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700">Vigência Final</Label>
                  <Input
                    type="date"
                    value={crewValidUntil}
                    onChange={(e) => setCrewValidUntil(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="crewActiveCheckbox"
                  checked={crewActive}
                  onChange={(e) => setCrewActive(e.target.checked)}
                  className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                />
                <Label
                  htmlFor="crewActiveCheckbox"
                  className="text-xs text-slate-700 font-semibold cursor-pointer"
                >
                  Turma Ativa para Alocação
                </Label>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCrewModalOpen(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCrew}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8"
              >
                {editingCrew ? 'Salvar Alterações' : 'Criar Turma'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Vincular Turno x Turma (ou Editar Vínculo) */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-[#004C97] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-cyan-300" />
                <h3 className="font-bold text-sm">
                  {editingShiftCrew ? 'Editar Vínculo Turno × Turma' : 'Vincular Turno × Turma'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isSavingLink && setIsLinkModalOpen(false)}
                className="text-white/80 hover:text-white text-sm font-bold disabled:opacity-50"
                disabled={isSavingLink}
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800">
              {linkErrorMessage && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">Atenção na validação:</p>
                    <p className="text-[11px] leading-relaxed">{linkErrorMessage}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">Turno *</Label>
                  <select
                    value={linkShiftId}
                    onChange={(e) => setLinkShiftId(e.target.value)}
                    disabled={isSavingLink}
                    className="w-full bg-slate-50 border border-slate-300 rounded text-xs p-2 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    <option value="">Selecione o Turno</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {s.name} ({s.start_time}–{s.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Turma Operacional *
                  </Label>
                  <select
                    value={linkCrewId}
                    onChange={(e) => setLinkCrewId(e.target.value)}
                    disabled={isSavingLink}
                    className="w-full bg-slate-50 border border-slate-300 rounded text-xs p-2 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    <option value="">Selecione a Turma Operacional</option>
                    {crews.map((c) => {
                      // Verificar se a turma tem outro vínculo ativo nesta linha (exceto o próprio se estiver editando)
                      const otherActive = shiftCrews.find(
                        (sc) =>
                          sc.crew_id === c.id &&
                          (!editingShiftCrew || sc.id !== editingShiftCrew.id) &&
                          (
                            sc.status || (sc.active !== false ? 'ATIVO' : 'INATIVO')
                          ).toUpperCase() === 'ATIVO',
                      )
                      const isOccupied = !!otherActive
                      const activeShift = isOccupied
                        ? shifts.find((s) => s.id === otherActive.shift_id)
                        : null

                      return (
                        <option key={c.id} value={c.id}>
                          {c.code} — {c.name}
                          {isOccupied
                            ? ` (Em uso no ${activeShift?.code || 'outro turno'})`
                            : ' (Disponível)'}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Data de início * (dd/mm/aaaa)
                  </Label>
                  <DateInputPtBr
                    value={linkValidFrom}
                    onChange={(v) => setLinkValidFrom(v)}
                    disabled={isSavingLink}
                    placeholder="DD/MM/AAAA"
                  />
                  <span className="text-[10px] text-slate-500">Início da vigência operacional</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Data de fim (opcional, dd/mm/aaaa)
                  </Label>
                  <DateInputPtBr
                    value={linkValidUntil}
                    onChange={(v) => setLinkValidUntil(v)}
                    disabled={isSavingLink}
                    placeholder="DD/MM/AAAA"
                  />
                  <span className="text-[10px] text-slate-500">
                    Deixe em branco para prazo indeterminado
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">Status do vínculo *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSavingLink}
                    onClick={() => setLinkStatus('ATIVO')}
                    className={`py-2 px-3 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      linkStatus === 'ATIVO'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-400 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${linkStatus === 'ATIVO' ? 'text-emerald-600' : 'text-slate-400'}`}
                    />
                    ATIVO
                  </button>

                  <button
                    type="button"
                    disabled={isSavingLink}
                    onClick={() => setLinkStatus('INATIVO')}
                    className={`py-2 px-3 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      linkStatus === 'INATIVO'
                        ? 'bg-slate-200 text-slate-800 border-slate-400 ring-1 ring-slate-400 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <XCircle
                      className={`w-3.5 h-3.5 ${linkStatus === 'INATIVO' ? 'text-slate-700' : 'text-slate-400'}`}
                    />
                    INATIVO
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">
                  Observações da Escala (opcional)
                </Label>
                <Input
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  disabled={isSavingLink}
                  placeholder="Escala regular semanal, revezamento, etc."
                  className="h-8 text-xs"
                />
              </div>

              <div className="p-2.5 rounded bg-blue-50/70 border border-blue-200/60 text-[11px] text-[#004C97] space-y-1">
                <p className="font-semibold">Regra de Vínculo CIAFAL:</p>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Um Turno pode receber múltiplas turmas operacionais. A mesma Turma não pode
                  possuir dois vínculos ativos no mesmo período. Vínculos inativados permanecem no
                  histórico de rastreabilidade.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLinkModalOpen(false)}
                disabled={isSavingLink}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveShiftCrewLink}
                disabled={isSavingLink}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
              >
                {isSavingLink ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Gravando vínculo...
                  </>
                ) : (
                  'Confirmar Vínculo'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
