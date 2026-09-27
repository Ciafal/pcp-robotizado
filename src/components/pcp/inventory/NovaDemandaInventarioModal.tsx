import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { pcpInventoryDemandsService } from '@/services/pcp-inventory-demands-service'
import { pcpProductionService } from '@/services/pcp-production-service'
type ProductionOrder = any
import {
  InventoryDemandPriority,
  CreateDemandPayload,
  InventoryDemand,
  CreateDemandMaterialInput,
} from '@/types/pcp-inventory-demands'
import pb from '@/lib/pocketbase/client'
import {
  PlusCircle,
  Loader2,
  AlertCircle,
  Trash2,
  Search,
  CheckCircle2,
  Boxes,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'

interface NovaDemandaInventarioModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (demanda: InventoryDemand) => void
  initialContext?: {
    company?: string
    line?: string
    center?: string
    storageDeposit?: string
    productionOrder?: string
  }
}

interface MaterialRowState {
  id: string
  material_code: string
  material_description: string
  heat_number: string
  quantity_tons_str: string
  quantity_tons: number
  unit_weight_kg: number | null
  calculated_pieces: number
  piecesError?: string | null
}

export const NovaDemandaInventarioModal: React.FC<NovaDemandaInventarioModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  initialContext,
}) => {
  const { toast } = useToast()

  // Bloco 1: Empresa, Linha, Centro, Depósito (herdam apenas o contexto ativo dos filtros)
  const [company, setCompany] = useState<string>('')
  const [line, setLine] = useState<string>('')
  const [center, setCenter] = useState<string>('')
  const [storageDeposit, setStorageDeposit] = useState<string>('')

  // Bloco 2: Ordem de Produção (pesquisável) + Prioridade + Bitola/Aplicação preenchidas auto
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState<boolean>(false)
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>('')
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>('')
  const [orderDropdownOpen, setOrderDropdownOpen] = useState<boolean>(false)

  const [gauge, setGauge] = useState<string>('')
  const [application, setApplication] = useState<string>('')
  const [gaugeAppFound, setGaugeAppFound] = useState<boolean | null>(null)
  const [priority, setPriority] = useState<InventoryDemandPriority | ''>('')

  // Bloco 3: MATÉRIAS-PRIMAS 1..N
  const [materials, setMaterials] = useState<MaterialRowState[]>([])

  // Observação / Justificativa
  const [observation, setObservation] = useState<string>('')

  // Estados de controle
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [errorField, setErrorField] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Quando o modal abre, herda contexto e limpa estado
  useEffect(() => {
    if (open) {
      setCompany(initialContext?.company || '')
      setLine(initialContext?.line || '')
      setCenter(initialContext?.center || '')
      setStorageDeposit(initialContext?.storageDeposit || '')

      const initialOp = initialContext?.productionOrder || ''
      setSelectedOrderNumber(initialOp)
      setOrderSearchTerm(initialOp)
      setOrderDropdownOpen(false)

      setPriority('')
      setGauge('')
      setApplication('')
      setGaugeAppFound(null)
      setMaterials([
        {
          id: `mp-${Date.now()}-1`,
          material_code: '',
          material_description: '',
          heat_number: '',
          quantity_tons_str: '',
          quantity_tons: 0,
          unit_weight_kg: null,
          calculated_pieces: 0,
        },
      ])
      setObservation('')
      setErrorField(null)
      setErrorMessage(null)

      // Carrega ordens de produção reais
      loadRealOrders()
    }
  }, [open, initialContext])

  const loadRealOrders = async () => {
    setLoadingOrders(true)
    try {
      const resp = await pcpProductionService.getOrders()
      if (resp && resp.data) {
        setProductionOrders(resp.data)
      }
    } catch (err) {
      console.warn('Erro ao carregar ordens de produção:', err)
    } finally {
      setLoadingOrders(false)
    }
  }

  // Ao selecionar uma ordem de produção, preenche automaticamente Bitola e Aplicação
  const handleSelectOrder = (order: ProductionOrder) => {
    setSelectedOrderNumber(order.op_number)
    setOrderSearchTerm(order.op_number)
    setOrderDropdownOpen(false)
    setErrorField(null)
    setErrorMessage(null)

    // Se a empresa/linha/centro estiverem vazios no contexto, pode puxar da OP
    if (!company && order.empresa_code) setCompany(order.empresa_code)
    if (!line && order.linha_code) setLine(order.linha_code)
    if (!center && (order.work_center || order.centro_code)) {
      setCenter(order.work_center || order.centro_code)
    }

    const foundGauge =
      order.gauge_dimension && order.gauge_dimension !== '-' ? order.gauge_dimension : ''
    const foundApp =
      order.product_name && order.product_name !== '-'
        ? order.product_name
        : order.material_description && order.material_description !== '-'
          ? order.material_description
          : order.programming_type || ''

    if (foundGauge || foundApp) {
      setGauge(foundGauge)
      setApplication(foundApp)
      setGaugeAppFound(true)
    } else {
      setGauge('')
      setApplication('')
      setGaugeAppFound(false)
    }
  }

  // Busca peso unitário real do cadastro técnico (Ficha Mestra / line_productivity_rates / MP)
  const lookupUnitWeightKg = async (
    matCode: string,
    appSpec?: string,
  ): Promise<{ weight: number | null; desc?: string }> => {
    const cleanCode = matCode.trim()
    if (!cleanCode) return { weight: null }

    try {
      // 1. Tenta buscar em line_productivity_rates
      const rates = await pb.collection('line_productivity_rates').getFullList({
        filter: `material_product_code ~ '${cleanCode}' || raw_material_type ~ '${cleanCode}'`,
        sort: '-created',
        limit: 1,
      })
      if (rates && rates.length > 0) {
        const r: any = rates[0]
        if (r.kg_per_meter && Number(r.kg_per_meter) > 0) {
          const mLen = Number(r.max_length_m) || Number(r.min_length_m) || 12 // padrão 12m se comprimento
          return {
            weight: Number((Number(r.kg_per_meter) * mLen).toFixed(2)),
            desc: r.material_product_name || '',
          }
        }
      }
    } catch {
      // continua
    }

    try {
      // 2. Tenta em line_raw_material_priorities
      const prios = await pb.collection('line_raw_material_priorities').getFullList({
        filter: `material_code = '${cleanCode}'`,
        limit: 1,
      })
      if (prios && prios.length > 0) {
        const p: any = prios[0]
        // Se tiver peso associado em metadata ou descrição
        return {
          weight: null,
          desc: p.material_description || '',
        }
      }
    } catch {
      // continua
    }

    // Regra técnica homologada por bitola/código de tarugos CIAFAL
    // Tarugo 130mm x 12m peso unitário padrão = 1.590 kg (1,59 t)
    // Tarugo 150mm x 12m peso unitário padrão = 2.120 kg (2,12 t)
    // Tarugo 120mm x 12m = 1.350 kg
    const upper = (cleanCode + ' ' + (appSpec || '') + ' ' + gauge).toUpperCase()
    if (upper.includes('130') || upper.includes('TAR-130')) {
      return { weight: 1590, desc: 'Tarugo SAE 1020 130mm x 12m' }
    }
    if (upper.includes('150') || upper.includes('TAR-150')) {
      return { weight: 2120, desc: 'Tarugo SAE 1045 150mm x 12m' }
    }
    if (upper.includes('120') || upper.includes('TAR-120')) {
      return { weight: 1350, desc: 'Tarugo SAE 1020 120mm x 12m' }
    }
    if (upper.includes('BOB') || upper.includes('BOBINA')) {
      // Bobina peso unitário de 5.000 kg (5 t) ou 10.000 kg
      return { weight: 5000, desc: 'Bobina de Aço Laminada' }
    }

    return { weight: null }
  }

  // Manipulação de Matérias-Primas (1..N)
  const handleAddMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      {
        id: `mp-${Date.now()}-${prev.length + 1}`,
        material_code: '',
        material_description: '',
        heat_number: '',
        quantity_tons_str: '',
        quantity_tons: 0,
        unit_weight_kg: null,
        calculated_pieces: 0,
      },
    ])
  }

  const handleRemoveMaterial = (index: number) => {
    if (materials.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Operação não permitida',
        description: 'A demanda precisa de pelo menos uma matéria-prima.',
      })
      return
    }
    setMaterials((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMaterialCodeChange = async (index: number, code: string) => {
    const updated = [...materials]
    const row = { ...updated[index], material_code: code }
    updated[index] = row
    setMaterials(updated)

    if (code.trim().length >= 3) {
      const res = await lookupUnitWeightKg(code, application)
      setMaterials((curr) => {
        const next = [...curr]
        const r = { ...next[index] }
        if (res.desc && !r.material_description) {
          r.material_description = res.desc
        }
        r.unit_weight_kg = res.weight
        // Recalcula peças se já houver tonelagem
        if (r.quantity_tons > 0) {
          if (res.weight && res.weight > 0) {
            const kg = r.quantity_tons * 1000
            r.calculated_pieces = Math.round(kg / res.weight)
            r.piecesError = null
          } else {
            r.calculated_pieces = 0
            r.piecesError =
              'Peso unitário não disponível. Não foi possível calcular a quantidade de peças.'
          }
        }
        next[index] = r
        return next
      })
    }
  }

  const handleTonsChange = (index: number, valStr: string) => {
    // Permite digitação com vírgula decimal (ex. 25,000)
    const normalized = valStr.replace(',', '.')
    const tons = Number(normalized)

    setMaterials((prev) => {
      const next = [...prev]
      const row = { ...next[index], quantity_tons_str: valStr }

      if (!isNaN(tons) && tons > 0) {
        row.quantity_tons = tons
        if (row.unit_weight_kg && row.unit_weight_kg > 0) {
          const kg = tons * 1000
          row.calculated_pieces = Math.round(kg / row.unit_weight_kg)
          row.piecesError = null
        } else {
          row.calculated_pieces = 0
          row.piecesError =
            'Peso unitário não disponível. Não foi possível calcular a quantidade de peças.'
        }
      } else {
        row.quantity_tons = 0
        row.calculated_pieces = 0
        row.piecesError = null
      }
      next[index] = row
      return next
    })
  }

  const handleMaterialFieldChange = (index: number, field: keyof MaterialRowState, value: any) => {
    setMaterials((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // Submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return // impede duplo clique

    setErrorField(null)
    setErrorMessage(null)

    // Validações Bloco 1
    if (!company.trim()) {
      setErrorField('company')
      setErrorMessage('Informe a Empresa.')
      return
    }
    if (!line.trim()) {
      setErrorField('line')
      setErrorMessage('Informe a Linha.')
      return
    }
    if (!center.trim()) {
      setErrorField('center')
      setErrorMessage('Informe o Centro.')
      return
    }
    if (!storageDeposit.trim()) {
      setErrorField('storageDeposit')
      setErrorMessage('Informe o Depósito.')
      return
    }

    // Validações Bloco 2
    if (!selectedOrderNumber.trim()) {
      setErrorField('productionOrder')
      setErrorMessage('Selecione uma Ordem de Produção existente no sistema.')
      return
    }
    if (!priority) {
      setErrorField('priority')
      setErrorMessage('Selecione a Prioridade (Normal ou Urgente).')
      return
    }

    // Validações Bloco 3: Matérias-Primas
    if (materials.length === 0) {
      setErrorMessage('Adicione pelo menos 1 matéria-prima à demanda.')
      return
    }

    for (let i = 0; i < materials.length; i++) {
      const m = materials[i]
      if (!m.material_code.trim()) {
        setErrorField(`mp_code_${i}`)
        setErrorMessage(`Informe o Código da Matéria-Prima no item #${i + 1}.`)
        return
      }
      if (!m.heat_number.trim()) {
        setErrorField(`mp_heat_${i}`)
        setErrorMessage(`Informe a Corrida específica da Matéria-Prima no item #${i + 1}.`)
        return
      }
      if (m.quantity_tons <= 0) {
        setErrorField(`mp_tons_${i}`)
        setErrorMessage(
          `Informe uma Quantidade (t) maior que zero para a Matéria-Prima no item #${i + 1}.`,
        )
        return
      }
      if (m.piecesError || m.calculated_pieces <= 0 || m.unit_weight_kg == null) {
        setErrorField(`mp_pieces_${i}`)
        setErrorMessage(
          `Peso unitário não disponível para ${m.material_code}. Não foi possível calcular a quantidade de peças e a geração está bloqueada.`,
        )
        return
      }
    }

    setSubmitting(true)
    try {
      const itemsPayload: CreateDemandMaterialInput[] = materials.map((m) => ({
        material_code: m.material_code.trim(),
        material_description: m.material_description.trim() || undefined,
        heat_number: m.heat_number.trim(),
        quantity_tons: m.quantity_tons,
        calculated_pieces: m.calculated_pieces,
        unit_weight_kg: m.unit_weight_kg,
      }))

      const payload: CreateDemandPayload = {
        company: company.trim(),
        line: line.trim(),
        center: center.trim(),
        storage_deposit: storageDeposit.trim(),
        production_order: selectedOrderNumber.trim(),
        priority: priority as InventoryDemandPriority,
        gauge: gauge.trim() || undefined,
        application: application.trim() || undefined,
        materials: itemsPayload,
        observation: observation.trim() || undefined,
      }

      const created = await pcpInventoryDemandsService.createDemand(payload)

      toast({
        title: 'Demanda de Inventário gerada',
        description: `Demanda de Inventário nº ${created.control_number} gerada com sucesso.`,
      })

      onOpenChange(false)
      onSuccess(created)
    } catch (err: any) {
      console.error('Erro ao gerar demanda:', err)
      const msg = err?.message || 'Falha ao salvar demanda no backend. Tente novamente.'
      setErrorMessage(msg)
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar demanda',
        description: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtragem de ordens de produção
  const filteredOrders = productionOrders.filter((o) => {
    if (!orderSearchTerm) return true
    const term = orderSearchTerm.toLowerCase()
    return (
      o.op_number.toLowerCase().includes(term) ||
      (o.material_code && o.material_code.toLowerCase().includes(term)) ||
      (o.material_description && o.material_description.toLowerCase().includes(term))
    )
  })

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 pb-1 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-[#004C97] text-white flex items-center justify-center shadow-sm">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900 tracking-tight">
                Nova Demanda de Inventário de Matéria-Prima
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gere uma ordem de contagem física rastreável com vínculo à Ordem de Produção e
                matérias-primas por corrida.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* BLOCO 1: Contexto Operacional */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Bloco 1: Contexto Operacional (Herdado dos Filtros)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Ex.: CIAFAL"
                  className={`text-xs h-8 bg-white ${
                    errorField === 'company' ? 'border-rose-500 bg-rose-50/40' : ''
                  }`}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Linha *</Label>
                <Input
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  placeholder="Ex.: L1"
                  className={`text-xs h-8 bg-white ${
                    errorField === 'line' ? 'border-rose-500 bg-rose-50/40' : ''
                  }`}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Centro *</Label>
                <Input
                  value={center}
                  onChange={(e) => setCenter(e.target.value)}
                  placeholder="Ex.: FORNOL1"
                  className={`text-xs h-8 bg-white ${
                    errorField === 'center' ? 'border-rose-500 bg-rose-50/40' : ''
                  }`}
                  disabled={submitting}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Depósito *</Label>
                <Input
                  value={storageDeposit}
                  onChange={(e) => setStorageDeposit(e.target.value)}
                  placeholder="Ex.: DP07"
                  className={`text-xs h-8 bg-white ${
                    errorField === 'storageDeposit' ? 'border-rose-500 bg-rose-50/40' : ''
                  }`}
                  disabled={submitting}
                />
              </div>
            </div>
          </div>

          {/* BLOCO 2: Ordem de Produção e Prioridade */}
          <div className="p-3.5 bg-sky-50/50 rounded-xl border border-sky-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#004C97] uppercase tracking-wider">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bloco 2: Ordem de Produção & Prioridade</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Ordem de Produção pesquisável */}
              <div className="sm:col-span-2 relative">
                <Label className="text-xs font-semibold text-slate-700">
                  Ordem de Produção * (Pesquisar ordens ativas)
                </Label>
                <div className="relative mt-1">
                  <Input
                    value={orderSearchTerm}
                    onChange={(e) => {
                      setOrderSearchTerm(e.target.value)
                      setSelectedOrderNumber(e.target.value)
                      setOrderDropdownOpen(true)
                    }}
                    onFocus={() => setOrderDropdownOpen(true)}
                    placeholder="Digite o número da OP (ex.: 4500012342, OP-2025-0891)..."
                    className={`text-xs h-8 pr-8 font-mono bg-white ${
                      errorField === 'productionOrder' ? 'border-rose-500 bg-rose-50/40' : ''
                    }`}
                    disabled={submitting}
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>

                {orderDropdownOpen && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {loadingOrders ? (
                      <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Carregando ordens de produção...
                      </div>
                    ) : filteredOrders.length > 0 ? (
                      filteredOrders.map((ord) => (
                        <div
                          key={ord.id}
                          onClick={() => handleSelectOrder(ord)}
                          className="p-2.5 text-xs hover:bg-sky-50 cursor-pointer border-b border-slate-100 last:border-0 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#004C97]">
                              {ord.op_number}
                            </span>
                            <span className="ml-2 text-slate-600">
                              {ord.material_description || ord.product_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                            <span>{ord.linha_code}</span>
                            <span>•</span>
                            <span>{ord.quantity_planned_tons} t</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        Nenhuma ordem encontrada para o termo digitado.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prioridade */}
              <div>
                <Label className="text-xs font-semibold text-slate-700">Prioridade *</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as InventoryDemandPriority)}
                  className={`w-full text-xs h-8 px-2.5 mt-1 rounded-md border bg-white font-medium ${
                    errorField === 'priority' ? 'border-rose-500 bg-rose-50/40' : 'border-slate-300'
                  }`}
                  disabled={submitting}
                >
                  <option value="">Selecione a prioridade...</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
            </div>

            {/* Bitola / Aplicação (Somente Leitura - Preenchimento Automático) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Bitola da Ordem (Somente leitura)
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-100">
                    Preenchimento automático
                  </Badge>
                </div>
                <Input
                  readOnly
                  value={gauge}
                  placeholder="Selecione a OP para carregar a bitola..."
                  className="text-xs h-8 bg-slate-100/80 font-mono text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Aplicação da Ordem (Somente leitura)
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-slate-500 bg-slate-100">
                    Preenchimento automático
                  </Badge>
                </div>
                <Input
                  readOnly
                  value={application}
                  placeholder="Selecione a OP para carregar a aplicação..."
                  className="text-xs h-8 bg-slate-100/80 font-mono text-slate-700 cursor-not-allowed"
                />
              </div>
            </div>

            {selectedOrderNumber && gaugeAppFound === false && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Bitola/Aplicação não encontrada para a ordem selecionada.
              </p>
            )}
          </div>

          {/* BLOCO 3: MATÉRIAS-PRIMAS 1..N */}
          <div className="p-3.5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Boxes className="w-3.5 h-3.5 text-[#004C97]" />
                <span>Bloco 3: Matérias-Primas ({materials.length})</span>
              </div>
              <Button
                type="button"
                onClick={handleAddMaterial}
                variant="outline"
                size="sm"
                className="text-xs h-7 text-[#004C97] border-[#004C97]/30 hover:bg-[#004C97]/10 font-bold gap-1"
                disabled={submitting}
              >
                <PlusCircle className="w-3.5 h-3.5" />+ Matéria-prima
              </Button>
            </div>

            <div className="space-y-3">
              {materials.map((mat, idx) => (
                <div
                  key={mat.id}
                  className="p-3 bg-white rounded-lg border border-slate-200/90 shadow-sm relative space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-black text-[#004C97]">
                      Item #{idx + 1} de Matéria-Prima
                    </span>
                    {materials.length > 1 && (
                      <Button
                        type="button"
                        onClick={() => handleRemoveMaterial(idx)}
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-6 px-2 text-xs gap-1"
                        disabled={submitting}
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Código MP * (ex.: TAR-130-1020)
                      </Label>
                      <Input
                        value={mat.material_code}
                        onChange={(e) => handleMaterialCodeChange(idx, e.target.value)}
                        placeholder="Código MP"
                        className={`text-xs h-8 font-mono ${
                          errorField === `mp_code_${idx}` ? 'border-rose-500 bg-rose-50/40' : ''
                        }`}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Descrição da MP
                      </Label>
                      <Input
                        value={mat.material_description}
                        onChange={(e) =>
                          handleMaterialFieldChange(idx, 'material_description', e.target.value)
                        }
                        placeholder="Descrição técnica"
                        className="text-xs h-8"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Corrida * (específica da MP)
                      </Label>
                      <Input
                        value={mat.heat_number}
                        onChange={(e) =>
                          handleMaterialFieldChange(idx, 'heat_number', e.target.value)
                        }
                        placeholder="Nº da Corrida"
                        className={`text-xs h-8 font-mono ${
                          errorField === `mp_heat_${idx}` ? 'border-rose-500 bg-rose-50/40' : ''
                        }`}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Quantidade (t) e Quantidade calculada (peças) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Quantidade (t) * (vírgula decimal)
                      </Label>
                      <Input
                        value={mat.quantity_tons_str}
                        onChange={(e) => handleTonsChange(idx, e.target.value)}
                        placeholder="Ex.: 25,000"
                        className={`text-xs h-8 font-mono ${
                          errorField === `mp_tons_${idx}` ? 'border-rose-500 bg-rose-50/40' : ''
                        }`}
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">
                          Qtd. Calculada (peças)
                        </Label>
                        <span className="text-[10px] text-slate-400">t × 1000 ÷ peso un.</span>
                      </div>
                      <Input
                        readOnly
                        value={mat.calculated_pieces > 0 ? `${mat.calculated_pieces} pç` : '—'}
                        placeholder="Calculado automaticamente"
                        className={`text-xs h-8 font-mono bg-slate-50 cursor-not-allowed ${
                          mat.piecesError ? 'border-amber-400 bg-amber-50/30 text-amber-800' : ''
                        }`}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Peso Unitário (kg)
                      </Label>
                      <Input
                        readOnly
                        value={
                          mat.unit_weight_kg != null
                            ? `${mat.unit_weight_kg.toLocaleString('pt-BR')} kg`
                            : 'Não identificado'
                        }
                        className="text-xs h-8 font-mono bg-slate-50 cursor-not-allowed text-slate-600"
                      />
                    </div>
                  </div>

                  {mat.piecesError && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {mat.piecesError}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observação / Justificativa multilinha */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Observação / Justificativa (Opcional)
            </Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva detalhes ou justificativas específicas desta demanda de inventário..."
              rows={3}
              className="text-xs resize-none mt-1"
              disabled={submitting}
            />
          </div>

          {/* Rodapé com Botões Cancelar e Gerar Demanda */}
          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003B75] text-white font-bold gap-1.5 shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gerando Demanda...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Gerar Demanda
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
