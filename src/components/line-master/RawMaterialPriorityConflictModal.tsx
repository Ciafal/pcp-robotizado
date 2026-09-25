import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowRight, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface HierarchyImpactItem {
  id?: string
  material_code: string
  material_description?: string
  current_priority: number | null
  new_priority: number
  is_target?: boolean
}

interface RawMaterialPriorityConflictModalProps {
  open: boolean
  isEditing?: boolean
  targetPriority: number
  targetMaterialCode: string
  targetMaterialDescription?: string
  conflictingMaterialCode?: string
  impactList: HierarchyImpactItem[]
  isSubmitting?: boolean
  onCancel: () => void
  onConfirmReorganize: () => void
}

export const RawMaterialPriorityConflictModal: React.FC<RawMaterialPriorityConflictModalProps> = ({
  open,
  isEditing = false,
  targetPriority,
  targetMaterialCode,
  targetMaterialDescription,
  conflictingMaterialCode,
  impactList,
  isSubmitting = false,
  onCancel,
  onConfirmReorganize,
}) => {
  // Monta a mensagem exata requerida na especificação
  const message = isEditing
    ? `Alterar esta matéria-prima para prioridade #${targetPriority} exige reorganizar a hierarquia atual. Deseja continuar?`
    : `Já existe uma matéria-prima cadastrada como prioridade #${targetPriority} para este Centro durante o período informado. Deseja inserir esta matéria-prima como prioridade #${targetPriority} e reorganizar automaticamente toda a hierarquia?`

  return (
    <Dialog open={open} onOpenChange={(v) => (!v && !isSubmitting ? onCancel() : null)}>
      <DialogContent
        className="bg-white border-amber-300 text-slate-900 max-w-xl shadow-2xl p-0 overflow-hidden"
        data-testid="raw-material-conflict-modal"
      >
        <DialogHeader className="p-5 pb-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-amber-950 flex items-center gap-2">
                Conflito de Prioridade
              </DialogTitle>
              <p className="text-xs text-amber-800 mt-0.5">
                Sobreposição de vigência detectada para a prioridade #{targetPriority}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          <div className="p-3.5 rounded-md bg-amber-50/70 border border-amber-200 text-amber-950 leading-relaxed font-medium">
            {message}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                Alteração prevista na hierarquia:
              </span>
              <span className="text-[11px] text-slate-500">
                {impactList.length} registro(s) afetado(s)
              </span>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold">
                  <tr>
                    <th className="p-2.5">MP</th>
                    <th className="p-2.5">Prioridade atual</th>
                    <th className="p-2.5 text-right">Nova prioridade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {impactList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                        Nenhum impacto adicional calculado.
                      </td>
                    </tr>
                  ) : (
                    impactList.map((item, idx) => (
                      <tr
                        key={item.id || item.material_code || idx}
                        className={
                          item.is_target
                            ? 'bg-blue-50/70 font-semibold'
                            : 'hover:bg-slate-50 transition-colors'
                        }
                      >
                        <td className="p-2.5 font-mono text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{item.material_code}</span>
                            {item.is_target && (
                              <Badge className="bg-[#004C97] text-white text-[9px] py-0 px-1 font-sans">
                                Alvo
                              </Badge>
                            )}
                          </div>
                          {item.material_description && (
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs font-sans">
                              {item.material_description}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {item.current_priority !== null ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-slate-700 bg-slate-50 border-slate-300"
                            >
                              #{item.current_priority}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-mono font-bold">
                              #{item.new_priority}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={onCancel}
            data-testid="conflict-cancel-btn"
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={onConfirmReorganize}
            data-testid="conflict-confirm-reorganize-btn"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                Reorganizando...
              </>
            ) : (
              'Reorganizar Hierarquia e Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RawMaterialPriorityConflictModal
