import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SimulatedPurchaseItem, MPShape } from '@/types/mp-optimization'
import { ShoppingCart, Plus, Trash2, Sparkles } from 'lucide-react'

interface PurchaseSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  simulatedPurchases: SimulatedPurchaseItem[]
  onAddPurchase: (purchase: SimulatedPurchaseItem) => void
  onRemovePurchase: (id: string) => void
  onClearPurchases: () => void
}

export const PurchaseSimulationModal: React.FC<PurchaseSimulationModalProps> = ({
  isOpen,
  onClose,
  simulatedPurchases,
  onAddPurchase,
  onRemovePurchase,
  onClearPurchases,
}) => {
  const [steelGrade, setSteelGrade] = useState('SAE 1045')
  const [shape, setShape] = useState<MPShape>('TARUGO')
  const [dimension, setDimension] = useState('130x130 mm (525 kg)')
  const [quantityTons, setQuantityTons] = useState('150')
  const [supplierName, setSupplierName] = useState('Gerdau Aços Especiais')
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  )
  const [notes, setNotes] = useState('Compra objetivada para cobrir antecipação da L1')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(quantityTons)
    if (isNaN(qty) || qty <= 0) return

    const newItem: SimulatedPurchaseItem = {
      id: 'sim-' + Date.now(),
      steelGrade,
      shape,
      dimension,
      quantityTons: qty,
      supplierName,
      expectedArrivalDate,
      notes,
    }
    onAddPurchase(newItem)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-white text-slate-900 border-slate-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-[#004C97]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Simulador de Compra Objetivada de MP
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Simule compras adicionais e recalcule imediatamente datas de ruptura, meses de
                cobertura e novos saldos sem alterar os dados oficiais do SAP
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Formulário de Nova Compra Simulada */}
          <form
            onSubmit={handleAdd}
            className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
          >
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#004C97]" />
              Adicionar Compra em Cenário Simulado
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Aço</Label>
                <Select value={steelGrade} onValueChange={setSteelGrade}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAE 1020">SAE 1020</SelectItem>
                    <SelectItem value="SAE 1045">SAE 1045</SelectItem>
                    <SelectItem value="SAE 4140">SAE 4140</SelectItem>
                    <SelectItem value="SAE 8620">SAE 8620</SelectItem>
                    <SelectItem value="SAE 4340">SAE 4340</SelectItem>
                    <SelectItem value="20MnCr5">20MnCr5</SelectItem>
                    <SelectItem value="1522">1522</SelectItem>
                    <SelectItem value="AÇO COMERCIAL AC">AÇO COMERCIAL AC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Forma da MP</Label>
                <Select value={shape} onValueChange={(v) => setShape(v as MPShape)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TARUGO">Tarugo</SelectItem>
                    <SelectItem value="PLACA">Placa</SelectItem>
                    <SelectItem value="PALANQUILHA">Palanquilha</SelectItem>
                    <SelectItem value="LINGOTE">Lingote</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Quantidade (t)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={quantityTons}
                  onChange={(e) => setQuantityTons(e.target.value)}
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: 120"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Dimensão / Bitola</Label>
                <Input
                  value={dimension}
                  onChange={(e) => setDimension(e.target.value)}
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: 130x130 mm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Fornecedor Estimado</Label>
                <Input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="h-8 text-xs bg-white"
                  placeholder="Ex: Gerdau / Sinobras"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Data Prevista Chegada
                </Label>
                <Input
                  type="date"
                  value={expectedArrivalDate}
                  onChange={(e) => setExpectedArrivalDate(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="submit"
                size="sm"
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Inserir na Simulação
              </Button>
            </div>
          </form>

          {/* Lista de Compras Simuladas no Cenário */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Compras Inseridas na Simulação ({simulatedPurchases.length})
              </h4>
              {simulatedPurchases.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearPurchases}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7"
                >
                  Limpar Todas
                </Button>
              )}
            </div>

            {simulatedPurchases.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500">
                Nenhuma compra simulada ativa. Adicione itens acima para ver o impacto em tempo real
                nas curvas de estoque.
              </div>
            ) : (
              <div className="space-y-2">
                {simulatedPurchases.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white border border-blue-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#004C97] flex items-center gap-2">
                        <span>{p.steelGrade}</span>
                        <span className="text-slate-500 font-normal">
                          ({p.shape} - {p.dimension})
                        </span>
                      </div>
                      <div className="text-slate-600 mt-0.5">
                        {p.supplierName} • Chegada estimada:{' '}
                        <strong>
                          {new Date(p.expectedArrivalDate).toLocaleDateString('pt-BR')}
                        </strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-base font-bold text-emerald-700 font-mono block">
                          +{p.quantityTons.toFixed(1)} t
                        </span>
                        <span className="text-[10px] text-slate-400">Simulação</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemovePurchase(p.id)}
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Impacto recalculado automaticamente em todas as projeções
          </div>
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs px-4"
          >
            Aplicar ao Painel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
