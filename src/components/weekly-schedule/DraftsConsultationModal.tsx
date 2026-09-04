import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { WeeklyScheduleVersionRecord, WeeklyScheduleItem } from '@/types/weekly-schedule'
import { weeklyScheduleService } from '@/services/weekly-schedule-service'
import { toast } from '@/hooks/use-toast'
import {
  FileText,
  Trash2,
  Play,
  Search,
  AlertTriangle,
  Calendar,
  User,
  CheckCircle2,
} from 'lucide-react'

interface DraftsConsultationModalProps {
  isOpen: boolean
  onClose: () => void
  currentLineCode: string
  currentYear: number
  currentWeekNumber: number
  versions: WeeklyScheduleVersionRecord[]
  onOpenDraft: (versionRecord: WeeklyScheduleVersionRecord) => void
  onDraftDeleted: () => void
}

export const DraftsConsultationModal: React.FC<DraftsConsultationModalProps> = ({
  isOpen,
  onClose,
  currentLineCode,
  currentYear,
  currentWeekNumber,
  versions,
  onOpenDraft,
  onDraftDeleted,
}) => {
  const [filterLine, setFilterLine] = useState<string>('ALL')
  const [filterWeek, setFilterWeek] = useState<string>('ALL')
  const [filterVersion, setFilterVersion] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchUser, setSearchUser] = useState<string>('')
  const [draftToDelete, setDraftToDelete] = useState<WeeklyScheduleVersionRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Filtros aplicados à lista de versões
  const filteredVersions = useMemo(() => {
    return versions.filter((v) => {
      if (filterLine !== 'ALL' && v.line_code !== filterLine) return false
      if (filterWeek !== 'ALL' && String(v.week_number) !== filterWeek) return false
      if (
        filterVersion !== 'ALL' &&
        `V${String(v.version_number).padStart(2, '0')}` !== filterVersion
      )
        return false

      const isApproval =
        v.change_reason?.toUpperCase().includes('APROVACAO') ||
        v.impact_assessment?.toUpperCase().includes('APROVACAO')
      const isApproved =
        v.change_reason?.toUpperCase().includes('APROVADO') ||
        v.impact_assessment?.toUpperCase().includes('APROVADO')
      const statusDetermined = isApproved ? 'APROVADO' : isApproval ? 'EM_APROVACAO' : 'DRAFT'

      if (filterStatus !== 'ALL' && statusDetermined !== filterStatus) return false

      if (searchUser) {
        const u = (v.user_name || '').toLowerCase()
        const e = (v.user_email || '').toLowerCase()
        const q = searchUser.toLowerCase()
        if (!u.includes(q) && !e.includes(q)) return false
      }

      return true
    })
  }, [versions, filterLine, filterWeek, filterVersion, filterStatus, searchUser])

  // Opções únicas para selects
  const uniqueLines = useMemo(
    () => Array.from(new Set(versions.map((v) => v.line_code))),
    [versions],
  )
  const uniqueWeeks = useMemo(
    () => Array.from(new Set(versions.map((v) => String(v.week_number)))),
    [versions],
  )
  const uniqueVersions = useMemo(
    () =>
      Array.from(
        new Set(versions.map((v) => `V${String(v.version_number).padStart(2, '0')}`)),
      ).sort(),
    [versions],
  )

  const handleConfirmDelete = async () => {
    if (!draftToDelete || !draftToDelete.id) return
    setIsDeleting(true)
    try {
      await weeklyScheduleService.deleteWeeklyScheduleDraft(
        draftToDelete.id,
        draftToDelete.schedule_code,
        draftToDelete.line_code,
        draftToDelete.year,
        draftToDelete.week_number,
        draftToDelete.version_number,
      )
      toast({
        title: 'Rascunho Eliminado',
        description: `Versão V${String(draftToDelete.version_number).padStart(2, '0')} eliminada com sucesso.`,
      })
      setDraftToDelete(null)
      onDraftDeleted()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Exclusão Bloqueada',
        description:
          err?.message || 'Não é permitido excluir uma versão em aprovação ou já aprovada.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white border border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#004C97]" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Consulta e Gestão de Rascunhos Salvos
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600">
              Listagem de rascunhos e versões gravadas em weekly_schedule_versions com histórico de
              data/hora e opções de retomar ou eliminar.
            </DialogDescription>
          </DialogHeader>

          {/* Barra de Filtros: Linha, Semana, Versão, Status, Usuário */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {/* Linha */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Linha</label>
              <select
                value={filterLine}
                onChange={(e) => setFilterLine(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Todas</option>
                {uniqueLines.map((l) => (
                  <option key={l} value={l}>
                    Linha {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Semana */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Semana</label>
              <select
                value={filterWeek}
                onChange={(e) => setFilterWeek(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Todas</option>
                {uniqueWeeks.map((w) => (
                  <option key={w} value={w}>
                    Semana {w}
                  </option>
                ))}
              </select>
            </div>

            {/* Versão */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Versão</label>
              <select
                value={filterVersion}
                onChange={(e) => setFilterVersion(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-slate-800"
              >
                <option value="ALL">Todas</option>
                {uniqueVersions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800"
              >
                <option value="ALL">Todos</option>
                <option value="DRAFT">Rascunho (DRAFT)</option>
                <option value="EM_APROVACAO">Em Aprovação</option>
                <option value="APROVADO">Aprovada</option>
              </select>
            </div>

            {/* Usuário */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Usuário</label>
              <div className="relative">
                <Input
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Nome ou e-mail..."
                  className="h-7 text-xs pr-6"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1.5" />
              </div>
            </div>
          </div>

          {/* Tabela de Rascunhos */}
          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Versão</th>
                  <th className="p-2.5">Linha / Período</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Usuário Responsável</th>
                  <th className="p-2.5">Data/Hora de Salvamento</th>
                  <th className="p-2.5">Itens / Tons</th>
                  <th className="p-2.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVersions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      Nenhum rascunho encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredVersions.map((v) => {
                    const isApproval =
                      v.change_reason?.toUpperCase().includes('APROVACAO') ||
                      v.impact_assessment?.toUpperCase().includes('APROVACAO')
                    const isApproved =
                      v.change_reason?.toUpperCase().includes('APROVADO') ||
                      v.impact_assessment?.toUpperCase().includes('APROVADO')
                    const isDraftOnly = !isApproval && !isApproved

                    const itemsCount = v.new_schedule_data ? v.new_schedule_data.length : 0
                    const totalTons = v.new_schedule_data
                      ? v.new_schedule_data.reduce(
                          (s: number, it: WeeklyScheduleItem) =>
                            s + (it.planned_quantity_tons || 0),
                          0,
                        )
                      : 0

                    return (
                      <tr
                        key={v.id || `${v.schedule_code}-${v.version_number}`}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-2.5 font-mono font-bold text-[#004C97]">
                          V{String(v.version_number).padStart(2, '0')}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          Linha {v.line_code} • S{v.week_number}/{v.year}
                        </td>
                        <td className="p-2.5">
                          {isApproved ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px]">
                              Aprovada
                            </Badge>
                          ) : isApproval ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[10px]">
                              Em Aprovação
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-semibold text-[10px]">
                              Rascunho (DRAFT)
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{v.user_name || 'Programador PCP'}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-600 font-mono text-[11px]">
                          {v.created ? new Date(v.created).toLocaleString('pt-BR') : '—'}
                        </td>
                        <td className="p-2.5 text-slate-700 font-semibold">
                          {itemsCount} itens ({totalTons} t)
                        </td>
                        <td className="p-2.5 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onOpenDraft(v)
                              onClose()
                            }}
                            className="h-6 px-2 text-[11px] font-bold text-[#004C97] hover:bg-blue-50 border-blue-200"
                            title="Abrir e retomar edição"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Retomar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!isDraftOnly}
                            onClick={() => setDraftToDelete(v)}
                            className={`h-6 px-2 text-[11px] font-bold ${
                              isDraftOnly
                                ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                                : 'text-slate-300 border-slate-200 cursor-not-allowed'
                            }`}
                            title={
                              isDraftOnly
                                ? 'Eliminar rascunho'
                                : 'Bloqueado: versão em aprovação ou aprovada não pode ser excluída'
                            }
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação Exata de Eliminação */}
      <AlertDialog open={!!draftToDelete} onOpenChange={() => setDraftToDelete(null)}>
        <AlertDialogContent className="bg-white border border-slate-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                Confirmar Eliminação
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm font-semibold text-slate-800 pt-2">
              Deseja realmente eliminar este registro?
            </AlertDialogDescription>
            <p className="text-xs text-slate-500 pt-1">
              Esta ação removerá o rascunho V
              {String(draftToDelete?.version_number).padStart(2, '0')} da Linha{' '}
              {draftToDelete?.line_code} e registrará a exclusão na auditoria oficial.
            </p>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="text-xs font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
export default DraftsConsultationModal
