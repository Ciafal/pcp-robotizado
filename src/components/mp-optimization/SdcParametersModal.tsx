import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, ShieldCheck, Plus, Check, Trash2 } from 'lucide-react'
import { MPSdcMinStockParameter } from '@/types/mp-optimization'

interface SdcParametersModalProps {
  isOpen: boolean
  onClose: () => void
  parameters: MPSdcMinStockParameter[]
  onSave: (param: Partial<MPSdcMinStockParameter>) => Promise<void>
}

export const SdcParametersModal: React.FC<SdcParametersModalProps> = ({
  isOpen,
  onClose,
  parameters,
  onSave,
}) => {
  const [editingParam, setEditingParam] = useState<Partial<MPSdcMinStockParameter> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleStartNew = () => {
    setEditingParam({
      company_code: 'SIDERCENTRO_SDC',
      operation_code: 'CORTE_DOBRA',
      steel_grade: 'Novo Aço',
      min_stock_tons: 50.0,
      reorder_point_tons: 80.0,
      responsible_name: 'Engenharia de PCP SDC',
      justification_origin: 'Revisão periódica de estoque de segurança',
      is_active: true,
    })
  }

  const handleSaveCurrent = async () => {
    if (!editingParam || !editingParam.steel_grade || !editingParam.min_stock_tons) return
    setIsSaving(true)
    try {
      await onSave(editingParam)
      setEditingParam(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Parâmetros de Estoque Mínimo & Segurança — Sidercentro
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Parametrização dinâmica por aço/pool/operação. Não utiliza valores hardcodados.
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleStartNew}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Parâmetro
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Formulário de Edição */}
          {editingParam && (
            <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#004C97] uppercase">
                  {editingParam.id ? 'Editar Parâmetro' : 'Cadastrar Novo Parâmetro'}
                </span>
                <Badge variant="outline" className="text-[10px] bg-white text-blue-700">
                  Governança Versionada
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Aço / Classe / Pool
                  </Label>
                  <Input
                    value={editingParam.steel_grade || ''}
                    onChange={(e) =>
                      setEditingParam((prev) => ({ ...prev, steel_grade: e.target.value }))
                    }
                    placeholder="Ex: AC, Classe B, 1020"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Estoque Mínimo (t)</Label>
                  <Input
                    type="number"
                    value={editingParam.min_stock_tons || ''}
                    onChange={(e) =>
                      setEditingParam((prev) => ({
                        ...prev,
                        min_stock_tons: Number(e.target.value),
                      }))
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Ponto de Reposição (t)
                  </Label>
                  <Input
                    type="number"
                    value={editingParam.reorder_point_tons || ''}
                    onChange={(e) =>
                      setEditingParam((prev) => ({
                        ...prev,
                        reorder_point_tons: Number(e.target.value),
                      }))
                    }
                    className="h-8 text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Responsável pela Regra
                  </Label>
                  <Input
                    value={editingParam.responsible_name || ''}
                    onChange={(e) =>
                      setEditingParam((prev) => ({ ...prev, responsible_name: e.target.value }))
                    }
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Justificativa da Origem
                  </Label>
                  <Input
                    value={editingParam.justification_origin || ''}
                    onChange={(e) =>
                      setEditingParam((prev) => ({
                        ...prev,
                        justification_origin: e.target.value,
                      }))
                    }
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingParam(null)}
                  className="h-7 text-xs border-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSaveCurrent}
                  className="h-7 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Salvar Parâmetro
                </Button>
              </div>
            </div>
          )}

          {/* Tabela de Parâmetros Vigentes */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Aço / Grupo</th>
                  <th className="p-3 text-right">Estoque Mínimo</th>
                  <th className="p-3 text-right">Ponto Reposição</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Justificativa</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parameters.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{p.steel_grade}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#004C97]">
                      {p.min_stock_tons.toFixed(1)} t
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">
                      {p.reorder_point_tons ? `${p.reorder_point_tons.toFixed(1)} t` : '-'}
                    </td>
                    <td className="p-3 text-slate-700">{p.responsible_name}</td>
                    <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">
                      {p.justification_origin}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingParam(p)}
                        className="h-7 text-xs text-blue-700 hover:bg-blue-50 font-semibold px-2"
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SdcParametersModal
