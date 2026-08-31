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
import { Layers, Plus, Check } from 'lucide-react'
import { MPSdcPool } from '@/types/mp-optimization'

interface SdcPoolsModalProps {
  isOpen: boolean
  onClose: () => void
  pools: MPSdcPool[]
  onSave: (pool: Partial<MPSdcPool>) => Promise<void>
}

export const SdcPoolsModal: React.FC<SdcPoolsModalProps> = ({ isOpen, onClose, pools, onSave }) => {
  const [editingPool, setEditingPool] = useState<Partial<MPSdcPool> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleStartNew = () => {
    setEditingPool({
      pool_code: 'POOL_CUSTOM',
      pool_name: 'Novo Pool de MP',
      participating_steels_json: ['AC', 'Classe B'],
      target_line: 'TODAS',
      substitution_rule_description: 'Substituição permitida para conformação padrão',
      consumption_priority_json: ['AC', 'Classe B'],
      is_active: true,
    })
  }

  const handleSaveCurrent = async () => {
    if (!editingPool || !editingPool.pool_code || !editingPool.pool_name) return
    setIsSaving(true)
    try {
      await onSave(editingPool)
      setEditingPool(null)
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
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Pools de Matéria-Prima & Regras de Substituição
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Agrupamentos compostos dinâmicos (AC+B, A+C, AC+1020, AC/IF/Z, etc.) com
                  prioridade técnica
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleStartNew}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Novo Pool
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Formulário de Edição */}
          {editingPool && (
            <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#004C97] uppercase">
                  {editingPool.id ? 'Editar Pool de MP' : 'Cadastrar Novo Pool'}
                </span>
                <Badge variant="outline" className="text-[10px] bg-white text-blue-700">
                  Regra Técnica Versionada
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Código do Pool</Label>
                  <Input
                    value={editingPool.pool_code || ''}
                    onChange={(e) =>
                      setEditingPool((prev) => ({ ...prev, pool_code: e.target.value }))
                    }
                    placeholder="Ex: POOL_AC_B"
                    className="h-8 text-xs font-mono bg-white uppercase"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Nome do Pool</Label>
                  <Input
                    value={editingPool.pool_name || ''}
                    onChange={(e) =>
                      setEditingPool((prev) => ({ ...prev, pool_name: e.target.value }))
                    }
                    placeholder="Ex: Pool AC + Classe B"
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">Linha Alvo</Label>
                  <select
                    value={editingPool.target_line || 'TODAS'}
                    onChange={(e) =>
                      setEditingPool((prev) => ({ ...prev, target_line: e.target.value }))
                    }
                    className="h-8 text-xs border border-slate-300 rounded px-2 w-full bg-white"
                  >
                    <option value="TODAS">Todas as Linhas</option>
                    <option value="L1">Linha 1 (L1)</option>
                    <option value="L2">Linha 2 (L2)</option>
                    <option value="SDC_CORTE_DOBRA">SDC Corte e Dobra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Aços Participantes (separados por vírgula)
                  </Label>
                  <Input
                    value={(editingPool.participating_steels_json || []).join(', ')}
                    onChange={(e) =>
                      setEditingPool((prev) => ({
                        ...prev,
                        participating_steels_json: e.target.value.split(',').map((s) => s.trim()),
                      }))
                    }
                    placeholder="Ex: AC, Classe B, 1020"
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-bold text-slate-700">
                    Prioridade de Consumo (da esq. para dir.)
                  </Label>
                  <Input
                    value={(editingPool.consumption_priority_json || []).join(' > ')}
                    onChange={(e) =>
                      setEditingPool((prev) => ({
                        ...prev,
                        consumption_priority_json: e.target.value
                          .split('>')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="Ex: AC > Classe B > 1020"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-bold text-slate-700">
                  Descrição da Regra de Substituição
                </Label>
                <Input
                  value={editingPool.substitution_rule_description || ''}
                  onChange={(e) =>
                    setEditingPool((prev) => ({
                      ...prev,
                      substitution_rule_description: e.target.value,
                    }))
                  }
                  placeholder="Ex: Consumir AC prioritariamente; Classe B liberada sem restrição de tração."
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPool(null)}
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
                  <Check className="w-3.5 h-3.5 mr-1" /> Salvar Pool
                </Button>
              </div>
            </div>
          )}

          {/* Cards de Pools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pools.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#004C97] block">
                      {p.pool_code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{p.pool_name}</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPool(p)}
                    className="h-7 text-xs text-blue-700 hover:bg-blue-50 font-semibold px-2"
                  >
                    Editar
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    Participantes:
                  </span>
                  {p.participating_steels_json.map((st) => (
                    <Badge
                      key={st}
                      variant="outline"
                      className="bg-slate-100 text-slate-800 text-[10px] font-bold"
                    >
                      {st}
                    </Badge>
                  ))}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                  {p.substitution_rule_description}
                </p>

                {p.technical_restrictions && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <strong>Restrição:</strong> {p.technical_restrictions}
                  </div>
                )}
              </div>
            ))}
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

export default SdcPoolsModal
