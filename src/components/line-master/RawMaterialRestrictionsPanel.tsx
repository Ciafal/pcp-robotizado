import React, { useState } from 'react'
import { ShieldAlert, Plus, Pencil, Power, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LineRawMaterialRestriction } from '@/services/line-raw-material-restrictions-service'

interface RawMaterialRestrictionsPanelProps {
  restrictions: LineRawMaterialRestriction[]
  activeCount: number
  isReadOnly?: boolean
  isLoading?: boolean
  onAddClick: () => void
  onEditClick: (restriction: LineRawMaterialRestriction) => void
  onToggleActiveClick: (restriction: LineRawMaterialRestriction) => Promise<void>
  onDeleteClick: (restriction: LineRawMaterialRestriction) => Promise<void>
}

function formatVigencia(validFrom?: string | null, validUntil?: string | null): string {
  if (!validFrom) return '—'
  const fromStr = String(validFrom).slice(0, 10)
  const [y1, m1, d1] = fromStr.split('-')
  const formattedFrom = d1 && m1 && y1 ? `${d1}/${m1}/${y1}` : fromStr

  if (!validUntil) {
    return `${formattedFrom} a indeterminado`
  }

  const untilStr = String(validUntil).slice(0, 10)
  const [y2, m2, d2] = untilStr.split('-')
  const formattedUntil = d2 && m2 && y2 ? `${d2}/${m2}/${y2}` : untilStr

  return `${formattedFrom} a ${formattedUntil}`
}

export const RawMaterialRestrictionsPanel: React.FC<RawMaterialRestrictionsPanelProps> = ({
  restrictions,
  activeCount,
  isReadOnly = false,
  isLoading = false,
  onAddClick,
  onEditClick,
  onToggleActiveClick,
  onDeleteClick,
}) => {
  const [itemToDelete, setItemToDelete] = useState<LineRawMaterialRestriction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      await onDeleteClick(itemToDelete)
      setItemToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleActive = async (r: LineRawMaterialRestriction) => {
    if (actionInProgressId) return
    setActionInProgressId(r.id)
    try {
      await onToggleActiveClick(r)
    } finally {
      setActionInProgressId(null)
    }
  }

  return (
    <Card
      className="bg-white border-slate-200 shadow-sm"
      data-testid="raw-material-restrictions-panel"
    >
      <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Restrições de Matéria-Prima ({activeCount} ativas)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Define matérias-primas que não podem ser utilizadas para determinadas bitolas de
            produto. Prevalece sempre sobre prioridades.
          </CardDescription>
        </div>
        {!isReadOnly && (
          <Button
            id="target-add-raw-material-restriction-btn"
            data-testid="btn-add-raw-material-restriction"
            size="sm"
            onClick={onAddClick}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 gap-1.5 font-bold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Cadastrar Restrição de Matéria-Prima
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-3">
        {/* Tabela Responsiva com rolagem interna apenas quando necessário para evitar scroll global */}
        <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table
            className="w-full text-left text-xs text-slate-700 table-auto min-w-[880px] lg:min-w-full"
            data-testid="raw-material-restrictions-table"
          >
            <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
              <tr>
                <th className="p-2.5 w-20 text-center whitespace-nowrap">Status</th>
                <th className="p-2.5 w-28 whitespace-nowrap">Código MP</th>
                <th className="p-2.5 min-w-[140px]">Descrição MP</th>
                <th className="p-2.5 w-24 whitespace-nowrap">Bitola MP</th>
                <th className="p-2.5 min-w-[180px]">Bitolas Restritas</th>
                <th className="p-2.5 w-32 whitespace-nowrap">Início</th>
                <th className="p-2.5 w-32 whitespace-nowrap">Fim</th>
                <th className="p-2.5 min-w-[200px]">Motivo</th>
                <th className="p-2.5 w-32 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#004C97]" />
                      Carregando restrições de matéria-prima...
                    </div>
                  </td>
                </tr>
              ) : restrictions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                    Nenhuma restrição de matéria-prima cadastrada para este Centro.
                  </td>
                </tr>
              ) : (
                restrictions.map((r) => {
                  const isActive = r.active !== false
                  const isActionPending = actionInProgressId === r.id
                  const gauges = Array.isArray(r.restricted_product_gauges)
                    ? r.restricted_product_gauges
                    : []

                  return (
                    <tr
                      key={r.id}
                      data-testid={`restriction-row-${r.material_code}`}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Status */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {isActive ? (
                          <Badge
                            data-testid={`badge-restriction-status-active-${r.id}`}
                            className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                          >
                            Ativo
                          </Badge>
                        ) : (
                          <Badge
                            data-testid={`badge-restriction-status-inactive-${r.id}`}
                            className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold"
                          >
                            Inativo
                          </Badge>
                        )}
                      </td>

                      {/* Código MP */}
                      <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {r.material_code}
                      </td>

                      {/* Descrição MP */}
                      <td
                        className="p-2.5 text-slate-700 font-medium max-w-xs truncate"
                        title={r.material_description}
                      >
                        {r.material_description}
                      </td>

                      {/* Bitola MP */}
                      <td className="p-2.5 text-slate-700 font-medium whitespace-nowrap font-mono">
                        {r.bitola_mp ? (
                          r.bitola_mp
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Bitolas Restritas (chips/tags) */}
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {gauges.length === 0 ? (
                            <span className="text-slate-400 italic">Nenhuma</span>
                          ) : (
                            gauges.map((g) => (
                              <Badge
                                key={g}
                                variant="outline"
                                className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-mono py-0 px-1.5 font-bold"
                              >
                                {g}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Início */}
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {formatVigencia(r.valid_from, null).replace(' a indeterminado', '')}
                      </td>

                      {/* Fim */}
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {r.valid_until ? (
                          formatVigencia(r.valid_until, null).replace(' a indeterminado', '')
                        ) : (
                          <span className="text-slate-400 italic">Indeterminado</span>
                        )}
                      </td>

                      {/* Motivo */}
                      <td
                        className="p-2.5 text-slate-600 text-xs max-w-sm truncate"
                        title={r.reason}
                      >
                        {r.reason}
                      </td>

                      {/* Ações */}
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Editar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isReadOnly || isActionPending}
                            onClick={() => onEditClick(r)}
                            data-testid={`btn-edit-restriction-${r.material_code}`}
                            className="h-7 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50 gap-1"
                            title="Editar restrição"
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Button>

                          {/* Ativar / Inativar */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isReadOnly || isActionPending}
                            onClick={() => handleToggleActive(r)}
                            data-testid={`btn-toggle-active-restriction-${r.material_code}`}
                            className={`h-7 px-2 text-[11px] font-semibold gap-1 ${
                              isActive
                                ? 'text-amber-700 hover:bg-amber-50 hover:text-amber-800'
                                : 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800'
                            }`}
                            title={isActive ? 'Inativar regra' : 'Ativar regra'}
                          >
                            <Power className="w-3 h-3" />
                            {isActive ? 'Inativar' : 'Ativar'}
                          </Button>

                          {/* Excluir Logicamente */}
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isReadOnly || isActionPending}
                            onClick={() => setItemToDelete(r)}
                            data-testid={`btn-delete-restriction-${r.material_code}`}
                            className="h-7 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1"
                            title="Excluir restrição"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Confirmação de Exclusão Lógica */}
      <AlertDialog
        open={Boolean(itemToDelete)}
        onOpenChange={(v) => (!v ? setItemToDelete(null) : null)}
      >
        <AlertDialogContent className="bg-white border-slate-200 text-slate-900 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 font-bold text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Excluir restrição de matéria-prima?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Esta ação desativará e arquivará logicamente a restrição da matéria-prima{' '}
              <strong className="text-slate-900 font-mono">
                {itemToDelete?.material_code}
              </strong>{' '}
              para as bitolas selecionadas. O registro histórico será preservado para auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-end pt-2">
            <AlertDialogCancel
              disabled={isDeleting}
              onClick={() => setItemToDelete(null)}
              className="text-xs border-slate-300 hover:bg-slate-100"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              data-testid="btn-confirm-delete-restriction"
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default RawMaterialRestrictionsPanel
