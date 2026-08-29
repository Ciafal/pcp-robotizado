import React, { useState, useMemo } from 'react'
import {
  Search,
  Plus,
  Package,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Calculator,
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
import { OfficialMaterialOption, WeeklyScheduleItem } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { WeeklyScheduleEngine, DAYS_OF_WEEK } from '@/services/weekly-schedule-engine'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (item: Partial<WeeklyScheduleItem>) => void
  officialMaterials: OfficialMaterialOption[]
  lineOverview: LineOverviewData | null
  targetDay: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  targetShiftCode: string
  targetShiftName: string
  targetCrewName: string
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  officialMaterials,
  lineOverview,
  targetDay,
  targetShiftCode,
  targetShiftName,
  targetCrewName,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<OfficialMaterialOption | null>(null)
  const [quantityTons, setQuantityTons] = useState<string>('100')
  const [selectedDay, setSelectedDay] = useState<
    'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  >(targetDay || 'SEG')
  const [selectedShift, setSelectedShift] = useState<string>(targetShiftCode || 'T1_L1')
  const [productionOrder, setProductionOrder] = useState('')
  const [salesOrderMto, setSalesOrderMto] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderType, setOrderType] = useState<'MTS' | 'MTO' | 'INDUSTRIALIZACAO'>('MTS')
  const [pcpNotes, setPcpNotes] = useState('')

  // Filtragem rápida de materiais oficiais
  const filteredMaterials = useMemo(() => {
    const s = searchTerm.toLowerCase().trim()
    if (!s) return officialMaterials
    return officialMaterials.filter(
      (m) =>
        m.material_code.toLowerCase().includes(s) ||
        m.material_name.toLowerCase().includes(s) ||
        (m.dimension_spec && m.dimension_spec.toLowerCase().includes(s)) ||
        (m.steel_grade && m.steel_grade.toLowerCase().includes(s)) ||
        (m.family_name && m.family_name.toLowerCase().includes(s)),
    )
  }, [officialMaterials, searchTerm])

  // Cálculo automático prévio de horas
  const qtyNum = Number(quantityTons) || 0
  const productivity = selectedMaterial
    ? WeeklyScheduleEngine.getProductivityForMaterial(
        selectedMaterial.material_code,
        lineOverview,
        12.0,
      )
    : 12.0
  const calculatedHours = productivity > 0 ? (qtyNum / productivity).toFixed(2) : '0.00'

  const handleSelectMaterial = (mat: OfficialMaterialOption) => {
    setSelectedMaterial(mat)
    if (mat.default_order_type) {
      setOrderType(mat.default_order_type)
    }
  }

  const handleConfirm = () => {
    if (!selectedMaterial) return
    if (qtyNum <= 0) return

    const shifts = lineOverview?.shifts || []
    const shiftObj = shifts.find((s) => s.code === selectedShift)

    onAdd({
      material_code: selectedMaterial.material_code,
      material_description: selectedMaterial.material_name,
      family_code: selectedMaterial.family_code,
      steel_grade: selectedMaterial.steel_grade || 'SAE 1020',
      dimensions: selectedMaterial.dimension_spec || '50x50 mm #2.00',
      day_of_week: selectedDay,
      shift_code: selectedShift,
      shift_name: shiftObj?.name || targetShiftName || '1º Turno Matutino',
      crew_name: targetCrewName || 'Turma A',
      planned_quantity_tons: qtyNum,
      order_type: orderType,
      production_order: productionOrder.trim() || undefined,
      sales_order_mto: salesOrderMto.trim() || undefined,
      customer_name:
        customerName.trim() || (orderType === 'MTO' ? 'Cliente Específico MTO' : 'Mercado Geral'),
      pcp_notes: pcpNotes.trim() || undefined,
      item_type: 'PRODUCTION',
    })

    // Reset
    setSelectedMaterial(null)
    setQuantityTons('100')
    setProductionOrder('')
    setSalesOrderMto('')
    setCustomerName('')
    setPcpNotes('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-300 shadow-2xl p-0 overflow-hidden">
        {/* Cabeçalho CIAFAL Pantone 2945 */}
        <div className="bg-[#004C97] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Adicionar Produto à Programação Semanal
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Seleção exclusiva de materiais cadastrados oficialmente no SAP / Ficha Mestre
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. Seleção de Material Oficial com Busca */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#004C97]" />
                1. Selecione o Material / Produto (Cadastro Oficial SAP)*
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {filteredMaterials.length} itens homologados na linha
              </span>
            </div>

            {/* Input de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por código SAP, descrição, bitola, aço ou família..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs bg-slate-50 border-slate-300 h-9"
              />
            </div>

            {/* Grade de Materiais Oficiais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-1.5 bg-slate-50/50">
              {filteredMaterials.map((mat) => {
                const isSelected = selectedMaterial?.material_code === mat.material_code
                return (
                  <button
                    key={mat.material_code}
                    type="button"
                    onClick={() => handleSelectMaterial(mat)}
                    className={`text-left p-2.5 rounded-md border text-xs transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#004C97] bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {mat.material_code}
                        </span>
                        <span className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {mat.material_name}
                        </span>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#004C97] shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="font-mono font-medium text-slate-700">
                        {mat.dimension_spec}
                      </span>
                      <span>&bull;</span>
                      <span className="font-bold text-[#004C97]">{mat.productivity_th} t/h</span>
                      {mat.steel_grade && (
                        <>
                          <span>&bull;</span>
                          <span className="bg-slate-100 px-1 rounded">{mat.steel_grade}</span>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Quantidade Prevista & Cálculo Automático de Horas */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  2. Quantidade Programada (t — Toneladas) *
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    step="0.5"
                    value={quantityTons}
                    onChange={(e) => setQuantityTons(e.target.value)}
                    className="font-mono text-sm font-bold bg-white border-blue-300 h-10 pr-12 text-slate-900"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-xs text-[#004C97]">
                    t
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Unidade de massa rigorosamente em toneladas (t).
                </p>
              </div>

              {/* Box de Cálculo Automático Determinístico */}
              <div className="bg-white p-3 rounded-lg border border-blue-200 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1 font-medium">
                    <Calculator className="w-3.5 h-3.5 text-[#004C97]" />
                    Cálculo Automático de Produção
                  </span>
                  <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-mono">
                    Ficha Mestre
                  </Badge>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <div>
                    <span className="text-xs text-slate-600 block">Horas Produtivas:</span>
                    <span className="text-lg font-black font-mono text-slate-900">
                      {calculatedHours} <span className="text-xs font-bold text-slate-500">h</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Cadência Ficha Mestre:</span>
                    <span className="font-mono font-bold text-xs text-blue-800">
                      {productivity} t/h
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Horas = {qtyNum} t ÷ {productivity} t/h
                </p>
              </div>
            </div>
          </div>

          {/* 3. Posicionamento de Dia e Turno */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Dia da Semana</label>
              <Select value={selectedDay} onValueChange={(v: any) => setSelectedDay(v)}>
                <SelectTrigger className="text-xs bg-slate-50 border-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.code} value={d.code} className="text-xs">
                      {d.label} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Turno de Produção
              </label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="text-xs bg-slate-50 border-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(lineOverview?.shifts || []).map((s) => (
                    <SelectItem key={s.code} value={s.code} className="text-xs">
                      {s.name} ({s.start_time} - {s.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 4. Metadados Opcionais (Ordem SAP, MTO, Observações) */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Campos Complementares (Quando aplicável)
              </span>
              <div className="flex items-center gap-1.5">
                {(['MTS', 'MTO', 'INDUSTRIALIZACAO'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                      orderType === type
                        ? 'bg-[#004C97] text-white border-blue-600'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">
                  Ordem de Produção (OP)
                </label>
                <Input
                  placeholder="Ex: OP-2026-8812"
                  value={productionOrder}
                  onChange={(e) => setProductionOrder(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8 font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Pedido SAP / MTO</label>
                <Input
                  placeholder="Ex: 4500981240"
                  value={salesOrderMto}
                  onChange={(e) => setSalesOrderMto(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Cliente Destino</label>
                <Input
                  placeholder="Ex: Usiminas / Gerdau / Mercado"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 block mb-0.5">
                Observação do PCP / Instrução Operacional
              </label>
              <Textarea
                placeholder="Ex: Respeitar resfriamento prévio de tarugo; prioridade comercial contratual..."
                value={pcpNotes}
                onChange={(e) => setPcpNotes(e.target.value)}
                className="text-xs bg-slate-50 border-slate-300 h-14 resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={!selectedMaterial || qtyNum <= 0}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold flex items-center gap-1.5 shadow"
          >
            <Plus className="w-4 h-4" />
            Adicionar à Programação &rarr;
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
