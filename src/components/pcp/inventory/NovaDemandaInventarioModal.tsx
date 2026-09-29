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
import { sapMaterialService } from '@/services/sap-material-service'
import { pcpProductionService } from '@/services/pcp-production-service'
import { parsePtBrNumber, formatPtBrNumber, calculatePiecesFromTons } from '@/lib/number-format'
type ProductionOrder = any
import {
  InventoryDemandPriority,
  CreateDemandPayload,
  CreateDemandMaterialInput,
  InventoryDemand,
} from '@/types/pcp-inventory-demands'
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
  Info,
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
  heat_number: string // Corrida (opcional)
  quantity_tons_str: string
  quantity_tons: number
  unit_weight_t: number | null
  unit_weight_kg?: number | null
  weight_origin?: string
  calculated_pieces: number
  weightLoading?: boolean
  weightAvailable?: boolean
  weightStatusMessage?: string
  quantityError?: string | null
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

  // Quando o modal abre, herda contexto e inicializa estado limpo
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
          unit_weight_t: null,
          unit_weight_kg: null,
          weight_origin: 'NOT_FOUND',
          calculated_pieces: 0,
          weightLoading: false,
          weightAvailable: false,
          weightStatusMessage: 'Informe o código da MP para buscar o peso unitário.',
        },
      ])
      setObservation('')
      setErrorField(null)
      setErrorMessage(null)

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

  // Manipulação de Matérias-Primas (1..N)
  const handleAddMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      {
        id: `mp-${Date.now()}-${prev.length + 1}`,
        material_code: '',
        material_description: '',
        heat_number: '', // Corrida (opcional)
        quantity_tons_str: '',
        quantity_tons: 0,
        unit_weight_t: null,
        unit_weight_kg: null,
        weight_origin: 'NOT_FOUND',
        calculated_pieces: 0,
        weightLoading: false,
        weightAvailable: false,
        weightStatusMessage: 'Informe o código da MP para buscar o peso unitário.',
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

  // Busca dados de material no SAP (descrição + peso unitário) via sapMaterialService dedicado
  const handleMaterialCodeChange = async (index: number, code: string) => {
    const clean = code.trim()

    // 1. Limpa descrição anterior imediatamente e mostra status de consulta
    setMaterials((prev) => {
      const next = [...prev]
      if (!next[index]) return prev
      next[index] = {
        ...next[index],
        material_code: code,
        material_description: clean.length > 0 ? 'Consultando SAP...' : '',
        unit_weight_t: null,
        unit_weight_kg: null,
        calculated_pieces: 0,
        weightLoading: clean.length >= 2,
        weightStatusMessage: clean.length >= 2 ? 'Consultando SAP...' : 'Informe o código da MP.',
      }
      return next
    })

    if (clean.length < 2) {
      setMaterials((prev) => {
        const next = [...prev]
        if (!next[index]) return prev
        next[index] = {
          ...next[index],
          material_description: '',
          weightLoading: false,
          weightStatusMessage: 'Informe o código da MP.',
        }
        return next
      })
      return
    }

    try {
      const res = await sapMaterialService.getMaterialWeight(clean, {
        application,
        gauge,
      })

      setMaterials((prev) => {
        const next = [...prev]
        if (!next[index]) return prev
        const r = { ...next[index] }
        r.weightLoading = false

        if (res && res.is_available) {
          r.material_description = res.material_description || `Matéria-prima ${clean}`
          r.unit_weight_t = res.unit_weight_t
          r.unit_weight_kg = res.unit_weight_kg
          r.weight_origin = res.source
          r.weightAvailable = true
          r.weightStatusMessage = undefined

          if (r.unit_weight_t && r.unit_weight_t > 0 && r.quantity_tons > 0) {
            r.calculated_pieces = calculatePiecesFromTons(r.quantity_tons, r.unit_weight_t)
          } else {
            r.calculated_pieces = 0
          }
        } else {
          r.material_description = 'Material não encontrado no SAP.'
          r.unit_weight_t = null
          r.unit_weight_kg = null
          r.weightAvailable = false
          r.calculated_pieces = 0
          r.weightStatusMessage = 'Material não encontrado no SAP.'
        }

        next[index] = r
        return next
      })
    } catch (err) {
      console.warn('Erro ao consultar material no SAP:', err)
      setMaterials((prev) => {
        const next = [...prev]
        if (!next[index]) return prev
        const r = { ...next[index] }
        r.material_description = 'Material não encontrado no SAP.'
        r.unit_weight_t = null
        r.unit_weight_kg = null
        r.weightLoading = false
        r.weightAvailable = false
        r.weightStatusMessage = 'Material não encontrado no SAP.'
        next[index] = r
        return next
      })
    }
  }

  // Parser robusto para Quantidade (t) aceitando padrão pt-BR ("24,00", "5,50", "24,500", "1.250,750")
  const handleTonsChange = (index: number, valStr: string) => {
    setMaterials((prev) => {
      const next = [...prev]
      const row = { ...next[index], quantity_tons_str: valStr }

      const parsed = parsePtBrNumber(valStr)

      if (valStr.trim() === '') {
        row.quantity_tons = 0
        row.calculated_pieces = 0
        row.quantityError = null
      } else if (isNaN(parsed) || parsed <= 0) {
        row.quantity_tons = 0
        row.calculated_pieces = 0
        row.quantityError = 'Informe uma quantidade maior que zero.'
      } else {
        row.quantity_tons = parsed
        row.quantityError = null

        // Se o peso unitário em toneladas estiver disponível, recalcula as peças
        // Nova fórmula: peças = Quantidade (t) ÷ Peso Unitário (t)
        if (row.unit_weight_t && row.unit_weight_t > 0) {
          row.calculated_pieces = calculatePiecesFromTons(parsed, row.unit_weight_t)
        } else {
          row.calculated_pieces = 0
        }
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
    if (submitting) return // Proteção anti-duplo-envio no frontend

    setErrorField(null)
    setErrorMessage(null)

    // Validações Bloco 1
    if (!company.trim()) {
      setErrorField('company')
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }
    if (!line.trim()) {
      setErrorField('line')
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }
    if (!center.trim()) {
      setErrorField('center')
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }
    if (!storageDeposit.trim()) {
      setErrorField('storageDeposit')
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }

    // Validações Bloco 2
    if (!selectedOrderNumber.trim()) {
      setErrorField('productionOrder')
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }
    if (!priority) {
      setErrorField('priority')
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }

    // Validações Bloco 3: Matérias-Primas
    if (materials.length === 0) {
      setErrorMessage(
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
      )
      return
    }

    for (let i = 0; i < materials.length; i++) {
      const m = materials[i]
      if (!m.material_code.trim()) {
        setErrorField(`mp_code_${i}`)
        setErrorMessage(
          'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
        )
        return
      }

      // CORRIDA É OPCIONAL — NUNCA barra se vazia!
      // Quantidade (t) validação: erro de usuário só para vazio, não numérico, <= 0
      const parsed = parsePtBrNumber(m.quantity_tons_str)
      if (m.quantity_tons_str.trim() === '' || isNaN(parsed) || parsed <= 0) {
        setErrorField(`mp_tons_${i}`)
        setErrorMessage(
          'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.',
        )
        return
      }
    }

    setSubmitting(true)
    try {
      const itemsPayload: CreateDemandMaterialInput[] = materials.map((m) => {
        const parsedTons = parsePtBrNumber(m.quantity_tons_str)
        const effectiveTons = !isNaN(parsedTons) && parsedTons > 0 ? parsedTons : m.quantity_tons
        const pces =
          m.unit_weight_t && m.unit_weight_t > 0
            ? calculatePiecesFromTons(effectiveTons, m.unit_weight_t)
            : m.calculated_pieces || 0

        return {
          material_code: m.material_code.trim(),
          material_description: m.material_description.trim() || undefined,
          heat_number: m.heat_number.trim(), // Corrida opcional: vazia se não informada
          quantity_tons: effectiveTons,
          calculated_pieces: pces,
          unit_weight_t: m.unit_weight_t,
          unit_weight_kg: m.unit_weight_kg ?? (m.unit_weight_t ? m.unit_weight_t * 1000 : null),
          weight_origin: m.weight_origin || 'LOCAL_CADASTRO',
        }
      })

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

      console.debug('[FORM:PAYLOAD]', payload)
      const created = await pcpInventoryDemandsService.createDemand(payload)
      console.debug('[BACKEND:RESPONSE]', created)

      // Sequência obrigatória:
      // 1. Backend persistiu e retornou registro completo (created)
      // 2. Chama onSuccess(created) para abrir popup de confirmação com dados reais
      // 3. Fecha o modal do formulário
      // 4. Somente após a confirmação do sucesso os campos podem ser limpos
      onSuccess(created)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao gerar demanda:', err)
      const userFriendlyMsg =
        err?.message ||
        'Não foi possível gerar a demanda de inventário. Verifique os campos destacados.'
      setErrorMessage(userFriendlyMsg)
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar demanda',
        description: userFriendlyMsg,
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
                matérias-primas cadastradas.
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
                    errorField === 'company'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : ''
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
                    errorField === 'line'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : ''
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
                    errorField === 'center'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : ''
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
                    errorField === 'storageDeposit'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : ''
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
                      errorField === 'productionOrder'
                        ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                        : ''
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
                    errorField === 'priority'
                      ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                      : 'border-slate-300'
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

                  {/* Linha 1: Código MP* | Descrição da MP (readOnly) | Corrida (opcional) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                    <div className="flex flex-col justify-end">
                      <div className="h-5 flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-slate-700 leading-none">
                          Código MP *
                        </Label>
                      </div>
                      <Input
                        value={mat.material_code}
                        onChange={(e) => handleMaterialCodeChange(idx, e.target.value)}
                        placeholder="Código MP"
                        className={`text-xs h-9 font-mono ${
                          errorField === `mp_code_${idx}`
                            ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                            : ''
                        }`}
                        disabled={submitting}
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="h-5 flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-slate-700 leading-none">
                          Descrição da MP
                        </Label>
                        <Badge
                          variant="outline"
                          className="text-[9px] text-slate-500 bg-slate-50 font-mono"
                        >
                          readOnly
                        </Badge>
                      </div>
                      <Input
                        readOnly
                        value={mat.material_description}
                        placeholder="Descrição técnica"
                        className="text-xs h-9 bg-slate-50 cursor-not-allowed font-medium text-slate-700 truncate"
                        disabled={submitting}
                      />
                    </div>

                    <div className="flex flex-col justify-end md:col-span-2 lg:col-span-1">
                      <div className="h-5 flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-slate-700 leading-none">
                          Corrida (opcional)
                        </Label>
                      </div>
                      <Input
                        value={mat.heat_number}
                        onChange={(e) =>
                          handleMaterialFieldChange(idx, 'heat_number', e.target.value)
                        }
                        placeholder="Nº da Corrida (opcional)"
                        className="text-xs h-9 font-mono"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Linha 2: Quantidade (t)* | Peso Unitário (t) | Qtd. Calculada (peças) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                    <div className="flex flex-col justify-end">
                      <div className="h-5 flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-slate-700 leading-none">
                          Quantidade (t) *
                        </Label>
                      </div>
                      <Input
                        value={mat.quantity_tons_str}
                        onChange={(e) => handleTonsChange(idx, e.target.value)}
                        placeholder="Ex.: 24,00"
                        className={`text-xs h-9 font-mono ${
                          errorField === `mp_tons_${idx}` || mat.quantityError
                            ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500'
                            : ''
                        }`}
                        disabled={submitting}
                      />
                      {mat.quantityError && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">
                          {mat.quantityError}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="h-5 flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-slate-700 leading-none">
                          Peso Unitário (t)
                        </Label>
                        {mat.weightLoading ? (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 leading-none">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Buscando...
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">SAP</span>
                        )}
                      </div>
                      <Input
                        readOnly
                        value={
                          mat.unit_weight_t != null
                            ? `${formatPtBrNumber(mat.unit_weight_t, 3, 4)} t`
                            : 'Aguardando dado do SAP'
                        }
                        className={`text-xs h-9 font-mono bg-slate-50 cursor-not-allowed ${
                          mat.unit_weight_t != null
                            ? 'text-slate-800 font-bold'
                            : 'text-amber-700 bg-amber-50/50'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col justify-end md:col-span-2 lg:col-span-1">
                      <div className="h-5 flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-slate-700 leading-none">
                          Qtd. Calculada (peças)
                        </Label>
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 leading-none shrink-0"
                          title="Fórmula: Quantidade (t) ÷ Peso Unitário (t)"
                        >
                          <Info className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                          <span>Qtd. (t) ÷ Peso (t)</span>
                        </span>
                      </div>
                      <Input
                        readOnly
                        value={
                          mat.calculated_pieces > 0
                            ? `${formatPtBrNumber(mat.calculated_pieces, 0, 0)} pç`
                            : '—'
                        }
                        placeholder="Calculado automaticamente"
                        className="text-xs h-9 font-mono bg-slate-50 cursor-not-allowed font-bold text-[#004C97]"
                      />
                    </div>
                  </div>

                  {/* Estado informativo sobre o peso unitário quando ausente */}
                  {mat.material_code.trim().length >= 2 &&
                    !mat.unit_weight_t &&
                    !mat.weightLoading && (
                      <div className="p-2 rounded bg-amber-50/80 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        <span>
                          {mat.weightStatusMessage ||
                            'Peso unitário ainda não disponível para esta matéria-prima (Aguardando dado do SAP).'}
                        </span>
                      </div>
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
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003B75] text-white font-bold gap-1.5 shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gerando demanda...
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
