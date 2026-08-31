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
import { Database, Plus, Check } from 'lucide-react'
import { MPSdcStockSource } from '@/types/mp-optimization'

interface SdcStockSourcesModalProps {
  isOpen: boolean
  onClose: () => void
  sources: MPSdcStockSource[]
  onSave: (source: Partial<MPSdcStockSource>) => Promise<void>
}

export const SdcStockSourcesModal: React.FC<SdcStockSourcesModalProps> = ({
  isOpen,
  onClose,
  sources,
  onSave,
}) => {
  const [editingSource, setEditingSource] = useState<Partial<MPSdcStockSource> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleStartNew = () => {
    setEditingSource({
      company_code: 'SIDERCENTRO_SDC',
      company_name: 'Sidercentro',
      plant_center: 'SDC1',
      storage_deposit: 'DS03',
      deposit_description: 'Novo Depósito / Pátio',
      operation_type: 'ESTOQUE_SDC',
      mp_owner: 'SIDERCENTRO',
      stock_type: 'PROPRIO_SDC',
      utilization_rule: 'LIBERADO_SDC',
      is_active: true,
    })
  }

  const handleSaveCurrent = async () => {
    if (!editingSource || !editingSource.storage_deposit || !editingSource.company_code) return
    setIsSaving(true)
    try {
      await onSave(editingSource)
      setEditingSource(null)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Matriz: Fonte de Estoque por Empresa / Operação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configuração dinâmica de depósitos SAP (DS03, DP04, KS, Sucata, etc.) sem
                  hardcoding
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleStartNew}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Nova Fonte / Depósito
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Formulário de Edição */}
          {editingSource && (
            <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#004C97] uppercase">
                  {editingSource.id ? 'Editar Fonte de Estoque' : 'Cadastrar Nova Fonte'}
                </span>
                <Badge variant="outline" className="text-[10px] bg-white text-blue-700">
                  Integração SAP MB52
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Empresa</Label>
                  <select
                    value={editingSource.company_code || 'SIDERCENTRO_SDC'}
                    onChange={(e) =>
                      setEditingSource((prev) => ({
                        ...prev,
                        company_code: e.target.value as any,
                        company_name:
                          e.target.value === 'CIAFAL'
                            ? 'CIAFAL Wilson Santos'
                            : e.target.value === 'KS'
                              ? 'Depósito KS Parceiro'
                              : 'Sidercentro',
                      }))
                    }
                    className="h-8 text-xs border border-slate-300 rounded px-2 w-full bg-white"
                  >
                    <option value="SIDERCENTRO_SDC">Sidercentro (SDC)</option>
                    <option value="CIAFAL">CIAFAL</option>
                    <option value="KS">KS</option>
                  </select>
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Centro SAP</Label>
                  <Input
                    value={editingSource.plant_center || ''}
                    onChange={(e) =>
                      setEditingSource((prev) => ({ ...prev, plant_center: e.target.value }))
                    }
                    placeholder="Ex: SDC1, CFPL"
                    className="h-8 text-xs bg-white uppercase font-mono"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Depósito SAP</Label>
                  <Input
                    value={editingSource.storage_deposit || ''}
                    onChange={(e) =>
                      setEditingSource((prev) => ({
                        ...prev,
                        storage_deposit: e.target.value,
                      }))
                    }
                    placeholder="Ex: DS03, DP04, DP07"
                    className="h-8 text-xs bg-white uppercase font-mono"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Proprietário da MP</Label>
                  <select
                    value={editingSource.mp_owner || 'SIDERCENTRO'}
                    onChange={(e) =>
                      setEditingSource((prev) => ({
                        ...prev,
                        mp_owner: e.target.value as any,
                      }))
                    }
                    className="h-8 text-xs border border-slate-300 rounded px-2 w-full bg-white"
                  >
                    <option value="SIDERCENTRO">Sidercentro</option>
                    <option value="CIAFAL">CIAFAL</option>
                    <option value="COMPARTILHAVEL">Compartilhável</option>
                    <option value="TERCEIROS">Terceiros</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Descrição do Depósito
                  </Label>
                  <Input
                    value={editingSource.deposit_description || ''}
                    onChange={(e) =>
                      setEditingSource((prev) => ({
                        ...prev,
                        deposit_description: e.target.value,
                      }))
                    }
                    placeholder="Ex: Estoque Exclusivo SDC"
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Regra de Utilização / Cessão
                  </Label>
                  <Input
                    value={editingSource.utilization_rule || ''}
                    onChange={(e) =>
                      setEditingSource((prev) => ({
                        ...prev,
                        utilization_rule: e.target.value,
                      }))
                    }
                    placeholder="Ex: LIBERADO_SDC, AVALIACAO_TECNICA"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingSource(null)}
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
                  <Check className="w-3.5 h-3.5 mr-1" /> Salvar Fonte
                </Button>
              </div>
            </div>
          )}

          {/* Tabela de Depósitos e Fontes */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Centro / Depósito</th>
                  <th className="p-3">Operação</th>
                  <th className="p-3">Proprietário</th>
                  <th className="p-3">Tipo de Estoque</th>
                  <th className="p-3">Regra Utilização</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sources.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{s.company_name}</td>
                    <td className="p-3 font-mono font-bold text-[#004C97]">
                      {s.plant_center} &bull; {s.storage_deposit}
                    </td>
                    <td className="p-3 text-slate-700">{s.operation_type}</td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          s.mp_owner === 'SIDERCENTRO'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : s.mp_owner === 'CIAFAL'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {s.mp_owner}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600">{s.stock_type}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">
                      {s.utilization_rule || 'LIBERADO_SDC'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Ativo</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingSource(s)}
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

export default SdcStockSourcesModal
