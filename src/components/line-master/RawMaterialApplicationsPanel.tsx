/**
 * Painel: Matéria-Prima por Aplicação
 * Tópico na Ficha Mestra Expandida (PCP Robotizado HUB Ciafal)
 * Suporta múltiplas MPs e múltiplas aplicações para o mesmo centro/produto
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  Ruler,
  Percent,
  Check,
  ShieldCheck,
  Building,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  LineRawMaterialApplication,
  RawMaterialApplicationFormData,
  RawMaterialApplicationValidationErrors,
} from '@/types/raw-material-application'
import { rawMaterialApplicationService } from '@/services/raw-material-application-service'
import {
  formatBrNumber,
  formatBrWithUnit,
  calculateReductionFromRatioX,
  calculateReductionFromPercentage,
} from '@/utils/number-br-formatters'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import { BitolaSelector } from '@/components/line-master/BitolaSelector'
import { TipoAcoSelector } from '@/components/line-master/TipoAcoSelector'

interface RawMaterialApplicationsPanelProps {
  lineId: string
  centerCode: string
  centerName?: string
  lineMasterId?: string
  onRefreshParent?: () => void
}

const FORNECEDORES_SUGERIDOS = [
  'Gerdau Aços Especiais',
  'ArcelorMittal',
  'Siderúrgica Barra Mansa',
  'Sinobras',
  'Villares Metals',
  'Aperam South America',
  'Usiminas',
  'Importado / Outros',
]

export const RawMaterialApplicationsPanel: React.FC<RawMaterialApplicationsPanelProps> = ({
  lineId,
  centerCode,
  centerName,
  lineMasterId,
  onRefreshParent,
}) => {
  const { toast } = useToast()

  const [items, setItems] = useState<LineRawMaterialApplication[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterProduct, setFilterProduct] = useState<string>('Todos')
  const [filterRawMaterial, setFilterRawMaterial] = useState<string>('Todos')
  const [filterSupplier, setFilterSupplier] = useState<string>('Todos')
  const [filterApplication, setFilterApplication] = useState<string>('Todos')
  const [filterStatus, setFilterStatus] = useState<'Ativo' | 'Inativo' | 'Todos'>('Todos')
  const [filterFirstRun, setFilterFirstRun] = useState<'Sim' | 'Não' | 'Todos'>('Todos')
  const [filterAllowOutOfStd, setFilterAllowOutOfStd] = useState<'Sim' | 'Não' | 'Todos'>('Todos')

  // Modal de cadastro/edição
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<LineRawMaterialApplication | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [fieldErrors, setFieldErrors] = useState<RawMaterialApplicationValidationErrors>({})

  // Estado do formulário
  const [formProductCode, setFormProductCode] = useState<string>('')
  const [formProductDesc, setFormProductDesc] = useState<string>('')
  const [formRawCode, setFormRawCode] = useState<string>('')
  const [formRawDesc, setFormRawDesc] = useState<string>('')
  const [formSupplier, setFormSupplier] = useState<string>('')
  const [formApplication, setFormApplication] = useState<string>('')
  const [formBitolaRef, setFormBitolaRef] = useState<string>('')
  const [formSteelType, setFormSteelType] = useState<string>('')

  // Pesos
  const [formAvgWeight, setFormAvgWeight] = useState<string>('')
  const [formMaxWeight, setFormMaxWeight] = useState<string>('')
  const [formMinWeight, setFormMinWeight] = useState<string>('')

  // Comprimentos
  const [formRolledLength, setFormRolledLength] = useState<string>('')
  const [formMultipleLength, setFormMultipleLength] = useState<string>('')
  const [formMaxMpLength, setFormMaxMpLength] = useState<string>('')
  const [formMinMpLength, setFormMinMpLength] = useState<string>('')

  // Redução
  const [formRatioX, setFormRatioX] = useState<string>('')
  const [formReductionPct, setFormReductionPct] = useState<string>('')

  // Flags
  const [formFirstRun, setFormFirstRun] = useState<boolean>(false)
  const [formAllowOutOfStd, setFormAllowOutOfStd] = useState<boolean>(false)

  // Bloco 7: Tempo Mínimo PCP
  const [formTempoUnidade, setFormTempoUnidade] = useState<
    'Minutos' | 'Horas' | 'Dias' | 'Semanas' | ''
  >('')
  const [formTempoValor, setFormTempoValor] = useState<string>('')

  const [formStatus, setFormStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [formNotes, setFormNotes] = useState<string>('')

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await rawMaterialApplicationService.listByLine(lineId)
      setItems(data)
    } catch (err) {
      console.warn('Erro ao carregar matérias-primas por aplicação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as matérias-primas por aplicação.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [lineId, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Listas de opções para filtros
  const distinctProducts = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.product_code) set.add(i.product_code)
    })
    return Array.from(set).sort()
  }, [items])

  const distinctRawMaterials = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.raw_material_code) set.add(i.raw_material_code)
    })
    return Array.from(set).sort()
  }, [items])

  const distinctSuppliers = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.supplier) set.add(i.supplier)
    })
    return Array.from(set).sort()
  }, [items])

  const distinctApplications = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.application) set.add(i.application)
    })
    return Array.from(set).sort()
  }, [items])

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterProduct !== 'Todos' && item.product_code !== filterProduct) return false
      if (filterRawMaterial !== 'Todos' && item.raw_material_code !== filterRawMaterial)
        return false
      if (filterSupplier !== 'Todos' && item.supplier !== filterSupplier) return false
      if (filterApplication !== 'Todos' && item.application !== filterApplication) return false
      if (filterStatus !== 'Todos' && item.status !== filterStatus) return false
      if (filterFirstRun !== 'Todos') {
        const exp = filterFirstRun === 'Sim'
        if (Boolean(item.first_run) !== exp) return false
      }
      if (filterAllowOutOfStd !== 'Todos') {
        const exp = filterAllowOutOfStd === 'Sim'
        if (Boolean(item.allow_out_of_standard_mp) !== exp) return false
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const text = [
          item.product_code,
          item.product_description,
          item.raw_material_code,
          item.raw_material_description,
          item.supplier,
          item.application,
          item.steel_type,
          item.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!text.includes(term)) return false
      }
      return true
    })
  }, [
    items,
    filterProduct,
    filterRawMaterial,
    filterSupplier,
    filterApplication,
    filterStatus,
    filterFirstRun,
    filterAllowOutOfStd,
    searchTerm,
  ])

  // Abertura para novo cadastro
  const handleOpenAdd = () => {
    setEditingItem(null)
    setFieldErrors({})
    setFormProductCode('')
    setFormProductDesc('')
    setFormRawCode('')
    setFormRawDesc('')
    setFormSupplier('')
    setFormApplication('')
    setFormBitolaRef('')
    setFormSteelType('')
    setFormAvgWeight('')
    setFormMaxWeight('')
    setFormMinWeight('')
    setFormRolledLength('')
    setFormMultipleLength('')
    setFormMaxMpLength('')
    setFormMinMpLength('')
    setFormRatioX('')
    setFormReductionPct('')
    setFormFirstRun(false)
    setFormAllowOutOfStd(false)
    setFormTempoUnidade('')
    setFormTempoValor('')
    setFormStatus('Ativo')
    setFormNotes('')
    setIsModalOpen(true)
  }

  // Abertura para edição
  const handleOpenEdit = (item: LineRawMaterialApplication) => {
    setEditingItem(item)
    setFieldErrors({})
    setFormProductCode(item.product_code || '')
    setFormProductDesc(item.product_description || '')
    setFormRawCode(item.raw_material_code || '')
    setFormRawDesc(item.raw_material_description || '')
    setFormSupplier(item.supplier || '')
    setFormApplication(item.application || '')
    setFormBitolaRef(item.bitola_ref || '')
    setFormSteelType(item.steel_type || '')

    setFormAvgWeight(
      item.average_weight_kg != null ? formatBrNumber(item.average_weight_kg, 2) : '',
    )
    setFormMaxWeight(item.max_weight_kg != null ? formatBrNumber(item.max_weight_kg, 2) : '')
    setFormMinWeight(item.min_weight_kg != null ? formatBrNumber(item.min_weight_kg, 2) : '')

    setFormRolledLength(item.rolled_length_m != null ? formatBrNumber(item.rolled_length_m, 2) : '')
    setFormMultipleLength(
      item.multiple_length_m != null ? formatBrNumber(item.multiple_length_m, 2) : '',
    )
    setFormMaxMpLength(item.max_mp_length_m != null ? formatBrNumber(item.max_mp_length_m, 2) : '')
    setFormMinMpLength(item.min_mp_length_m != null ? formatBrNumber(item.min_mp_length_m, 2) : '')

    setFormRatioX(item.reduction_ratio_x != null ? formatBrNumber(item.reduction_ratio_x, 2) : '')
    setFormReductionPct(
      item.reduction_percentage != null ? formatBrNumber(item.reduction_percentage, 2) : '',
    )

    setFormFirstRun(Boolean(item.first_run))
    setFormAllowOutOfStd(Boolean(item.allow_out_of_standard_mp))
    setFormTempoUnidade(
      (item.tempo_minimo_pcp_unidade as 'Minutos' | 'Horas' | 'Dias' | 'Semanas') || '',
    )
    setFormTempoValor(
      item.tempo_minimo_pcp_valor != null
        ? formatBrNumber(item.tempo_minimo_pcp_valor, item.tempo_minimo_pcp_valor % 1 === 0 ? 0 : 2)
        : '',
    )
    setFormStatus(item.status || 'Ativo')
    setFormNotes(item.notes || '')
    setIsModalOpen(true)
  }

  // Sincronização automática da razão 1:X com o percentual de redução
  const handleRatioXChange = (val: string) => {
    setFormRatioX(val)
    if (!val.trim()) {
      setFormReductionPct('')
      setFieldErrors((prev) => ({ ...prev, reduction: undefined }))
      return
    }

    const res = calculateReductionFromRatioX(val)
    if (res.isValid) {
      setFormReductionPct(formatBrNumber(res.percentage, 2))
      setFieldErrors((prev) => ({ ...prev, reduction: undefined }))
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        reduction: res.error || 'Razão inválida.',
      }))
    }
  }

  // Sincronização automática do percentual com a razão 1:X
  const handleReductionPctChange = (val: string) => {
    setFormReductionPct(val)
    if (!val.trim()) {
      setFormRatioX('')
      setFieldErrors((prev) => ({ ...prev, reduction: undefined }))
      return
    }

    const res = calculateReductionFromPercentage(val)
    if (res.isValid) {
      setFormRatioX(formatBrNumber(res.ratioX, 2))
      setFieldErrors((prev) => ({ ...prev, reduction: undefined }))
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        reduction: res.error || 'Percentual inválido.',
      }))
    }
  }

  // Ativar / Inativar diretamente da lista
  const handleToggleStatus = async (item: LineRawMaterialApplication) => {
    try {
      const updated = await rawMaterialApplicationService.toggleStatus(item)
      toast({
        title: 'Status atualizado',
        description: `Matéria-prima ${item.raw_material_code} (${item.application}) agora está ${updated.status}.`,
      })
      loadData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: err.message || 'Falha ao alterar status da matéria-prima.',
      })
    }
  }

  // Salvamento
  const handleSave = async () => {
    if (isSaving) return

    const formData: RawMaterialApplicationFormData = {
      id: editingItem?.id,
      line_id: lineId,
      line_master_id: lineMasterId,
      center_code: centerCode,
      product_code: formProductCode.trim(),
      product_description: formProductDesc.trim(),
      raw_material_code: formRawCode.trim(),
      raw_material_description: formRawDesc.trim(),
      supplier: formSupplier.trim(),
      application: formApplication.trim(),
      bitola_ref: formBitolaRef.trim(),
      steel_type: formSteelType.trim(),
      average_weight_kg: formAvgWeight,
      max_weight_kg: formMaxWeight,
      min_weight_kg: formMinWeight,
      rolled_length_m: formRolledLength,
      multiple_length_m: formMultipleLength,
      max_mp_length_m: formMaxMpLength,
      min_mp_length_m: formMinMpLength,
      reduction_ratio_x: formRatioX,
      reduction_percentage: formReductionPct,
      first_run: formFirstRun,
      allow_out_of_standard_mp: formAllowOutOfStd,
      tempo_minimo_pcp_unidade: formTempoUnidade,
      tempo_minimo_pcp_valor: formTempoValor,
      status: formStatus,
      notes: formNotes.trim(),
    }

    // 1. Validar e exibir erros sob os campos
    const errors = rawMaterialApplicationService.validateFormData(formData)

    // Validação de produto vazio
    if (!formProductCode.trim()) {
      errors.general = 'Informe o Produto correspondente.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      const firstErr = Object.values(errors)[0]
      const errorTitle = errors.tempo_minimo_pcp
        ? 'Não foi possível salvar. Verifique os campos do Tempo mínimo PCP.'
        : 'Campos com divergência'
      toast({
        variant: 'destructive',
        title: errorTitle,
        description: errors.tempo_minimo_pcp || firstErr,
      })
      return
    }

    // 2. Bloquear duplicidade antes de salvar
    const isDup = await rawMaterialApplicationService.checkDuplicate({
      lineId,
      centerCode,
      productCode: formProductCode,
      application: formApplication,
      rawMaterialCode: formRawCode,
      excludeId: editingItem?.id,
    })

    if (isDup) {
      const dupMsg =
        'Já existe um cadastro idêntico para a mesma combinação de Centro + Produto + Aplicação + Código MP.'
      setFieldErrors({ duplicate: dupMsg })
      toast({
        variant: 'destructive',
        title: 'Registro duplicado',
        description: dupMsg,
      })
      return
    }

    setIsSaving(true)
    try {
      await rawMaterialApplicationService.save(formData)
      toast({
        title: 'Sucesso',
        description: 'Matéria-prima por aplicação salva com sucesso.',
      })
      setIsModalOpen(false)
      loadData()
      if (onRefreshParent) onRefreshParent()
    } catch (err: any) {
      const isTempoErr = err?.message?.includes('tempo mínimo')
      toast({
        variant: 'destructive',
        title: isTempoErr
          ? 'Não foi possível salvar. Verifique os campos do Tempo mínimo PCP.'
          : 'Erro ao salvar',
        description: err.message || 'Falha ao salvar matéria-prima por aplicação.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4" data-testid="raw-material-applications-panel">
      {/* Cabeçalho da Seção */}
      <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              Matéria-prima por Aplicação
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-bold"
              >
                {filteredItems.length} registros
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 pt-0.5">
              Cadastro técnico de múltiplas matérias-primas e aplicações para o mesmo centro/produto
              (HUB Ciafal).
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#004C97]' : ''}`}
              />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              data-testid="btn-add-mp-application"
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 gap-1.5 font-bold shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar matéria-prima
            </Button>
          </div>
        </CardHeader>

        {/* Barra de Filtros e Pesquisa */}
        <CardContent className="p-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
            {/* Pesquisa Livre */}
            <div className="col-span-1 sm:col-span-2 md:col-span-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Pesquisar por MP, produto, fornecedor, aplicação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 bg-slate-50 border-slate-200 focus-visible:ring-[#004C97]"
                />
              </div>
            </div>

            {/* Filtro: Produto */}
            <div>
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="Todos">Produto: Todos</option>
                {distinctProducts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Código MP */}
            <div>
              <select
                value={filterRawMaterial}
                onChange={(e) => setFilterRawMaterial(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="Todos">Código MP: Todos</option>
                {distinctRawMaterials.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Fornecedor */}
            <div>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="Todos">Fornecedor: Todos</option>
                {distinctSuppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: Aplicação */}
            <div>
              <select
                value={filterApplication}
                onChange={(e) => setFilterApplication(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="Todos">Aplicação: Todas</option>
                {distinctApplications.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro: 1ª Corrida */}
            <div>
              <select
                value={filterFirstRun}
                onChange={(e) => setFilterFirstRun(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="Todos">1ª Corrida: Todos</option>
                <option value="Sim">1ª Corrida: Sim</option>
                <option value="Não">1ª Corrida: Não</option>
              </select>
            </div>

            {/* Filtro: Permitir Fora Padrão */}
            <div>
              <select
                value={filterAllowOutOfStd}
                onChange={(e) => setFilterAllowOutOfStd(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
              >
                <option value="Todos">Fora Padrão: Todos</option>
                <option value="Sim">Fora Padrão: Sim</option>
                <option value="Não">Fora Padrão: Não</option>
              </select>
            </div>
          </div>

          {/* Filtro de Status Rápido */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Status:</span>
              {(['Todos', 'Ativo', 'Inativo'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-all ${
                    filterStatus === st
                      ? st === 'Ativo'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : st === 'Inativo'
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'bg-[#004C97] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-500">
              Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong>{' '}
              especificações cadastradas
            </span>
          </div>

          {/* Tabela Responsiva */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="p-2.5 whitespace-nowrap">Código MP</th>
                  <th className="p-2.5 whitespace-nowrap">Fornecedor</th>
                  <th className="p-2.5 whitespace-nowrap">Produto / Ref.</th>
                  <th className="p-2.5 whitespace-nowrap">Aplicação</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Peso Médio (kg)</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Faixa Peso (kg)</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Comp. Laminado</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Faixa Comp. MP</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Redução (1:X | %)</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Tempo Mínimo PCP</th>
                  <th className="p-2.5 whitespace-nowrap text-center">1ª Corrida</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Fora Padrão MP</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Status</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-6 text-center text-slate-400 italic text-xs">
                      Nenhuma matéria-prima por aplicação encontrada com os filtros selecionados.
                      Clique em &quot;Adicionar matéria-prima&quot; para cadastrar.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isActive = item.status === 'Ativo'
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !isActive ? 'opacity-65 bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Código MP */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-amber-900 block">
                            {item.raw_material_code}
                          </span>
                          {item.raw_material_description && (
                            <span
                              className="text-[11px] text-slate-500 block truncate max-w-[180px]"
                              title={item.raw_material_description}
                            >
                              {item.raw_material_description}
                            </span>
                          )}
                        </td>

                        {/* Fornecedor */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="text-slate-800 font-medium">
                            {item.supplier || <span className="text-slate-400">—</span>}
                          </span>
                        </td>

                        {/* Produto */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#004C97] block">
                            {item.product_code}
                          </span>
                          {item.product_description && (
                            <span
                              className="text-[11px] text-slate-500 block truncate max-w-[160px]"
                              title={item.product_description}
                            >
                              {item.product_description}
                            </span>
                          )}
                        </td>

                        {/* Aplicação */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block">
                            {item.application}
                          </span>
                          {item.bitola_ref && (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 bg-slate-50 border-slate-300 text-slate-600"
                            >
                              {item.bitola_ref}
                            </Badge>
                          )}
                        </td>

                        {/* Peso Médio (kg) */}
                        <td className="p-2.5 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                          {item.average_weight_kg != null
                            ? `${formatBrNumber(item.average_weight_kg, 2)} kg`
                            : '—'}
                        </td>

                        {/* Faixa Peso (kg) */}
                        <td className="p-2.5 font-mono text-slate-600 text-right whitespace-nowrap text-[11px]">
                          {item.min_weight_kg != null || item.max_weight_kg != null ? (
                            <span>
                              {item.min_weight_kg != null
                                ? formatBrNumber(item.min_weight_kg, 2)
                                : '0,00'}{' '}
                              a{' '}
                              {item.max_weight_kg != null
                                ? formatBrNumber(item.max_weight_kg, 2)
                                : '∞'}{' '}
                              kg
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Comprimento Laminado */}
                        <td className="p-2.5 font-mono text-slate-700 text-right whitespace-nowrap">
                          {item.rolled_length_m != null
                            ? `${formatBrNumber(item.rolled_length_m, 2)} m`
                            : '—'}
                        </td>

                        {/* Faixa Comp MP */}
                        <td className="p-2.5 font-mono text-slate-600 text-right whitespace-nowrap text-[11px]">
                          {item.min_mp_length_m != null || item.max_mp_length_m != null ? (
                            <span>
                              {item.min_mp_length_m != null
                                ? formatBrNumber(item.min_mp_length_m, 2)
                                : '0,00'}{' '}
                              a{' '}
                              {item.max_mp_length_m != null
                                ? formatBrNumber(item.max_mp_length_m, 2)
                                : '∞'}{' '}
                              m
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Redução */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.reduction_ratio_text || item.reduction_percentage != null ? (
                            <div className="inline-flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] bg-blue-50 text-[#004C97] border-blue-200 font-bold"
                              >
                                {item.reduction_ratio_text || '—'}
                              </Badge>
                              <span className="font-mono font-bold text-emerald-700 text-xs">
                                {item.reduction_percentage != null
                                  ? `${formatBrNumber(item.reduction_percentage, 2)}%`
                                  : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Tempo Mínimo PCP */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.tempo_minimo_pcp_valor != null && item.tempo_minimo_pcp_unidade ? (
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px] bg-blue-50 text-[#004C97] border-blue-200 font-semibold"
                              data-testid={`badge-tempo-minimo-${item.id}`}
                            >
                              {formatBrNumber(
                                item.tempo_minimo_pcp_valor,
                                item.tempo_minimo_pcp_valor % 1 === 0 ? 0 : 2,
                              )}{' '}
                              {item.tempo_minimo_pcp_unidade}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Não definido</span>
                          )}
                        </td>

                        {/* 1ª Corrida */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.first_run ? (
                            <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-bold">
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Não</span>
                          )}
                        </td>

                        {/* Permitir fora padrão MP */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.allow_out_of_standard_mp ? (
                            <Badge
                              className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold"
                              title="Exceção técnica autorizada pela Ficha Mestra para a Programação Mensal"
                            >
                              Sim (Exceção)
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Não</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {isActive ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                              Ativo
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-slate-300 text-[10px] font-semibold">
                              Inativo
                            </Badge>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              data-testid={`btn-edit-mp-${item.id}`}
                              className="h-7 px-2 text-xs font-semibold text-[#004C97] hover:bg-blue-50 border border-transparent hover:border-blue-200"
                            >
                              Editar
                            </Button>
                            <span className="text-slate-200 text-xs">|</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(item)}
                              data-testid={`btn-toggle-status-mp-${item.id}`}
                              className={`h-7 px-2 text-xs font-semibold ${
                                isActive
                                  ? 'text-amber-700 hover:text-amber-800 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              {isActive ? 'Inativar' : 'Ativar'}
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
      </Card>

      {/* MODAL: Cadastrar / Editar Matéria-Prima por Aplicação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              {editingItem
                ? 'Editar Matéria-Prima por Aplicação'
                : 'Adicionar Matéria-Prima por Aplicação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Centro: <strong>{centerCode}</strong> — {centerName || 'Ficha Mestra'}
            </DialogDescription>
          </DialogHeader>

          {/* Alerta de erro geral / duplicidade */}
          {fieldErrors.duplicate && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{fieldErrors.duplicate}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            {/* Bloco 1: Produto Acabado & Código MP (Obrigatórios) */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                1. Produto Acabado & Matéria-Prima (Obrigatório)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Produto */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Produto Acabado / Referência *
                  </Label>
                  <MaterialSelector
                    value={formProductCode}
                    lineId={lineId}
                    onChange={(code, mat) => {
                      setFormProductCode(code)
                      if (mat && mat.name) setFormProductDesc(mat.name)
                      setFieldErrors((prev) => ({ ...prev, general: undefined }))
                    }}
                    placeholder="Pesquise o produto no catálogo..."
                  />
                  {formProductDesc && (
                    <span className="text-[11px] text-slate-500 block truncate">
                      {formProductDesc}
                    </span>
                  )}
                  {fieldErrors.general && (
                    <p className="text-[11px] text-red-600 font-medium">{fieldErrors.general}</p>
                  )}
                </div>

                {/* Código MP */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Código MP (Matéria-Prima) *
                  </Label>
                  <Input
                    placeholder="Ex: MP-TAR-130X130-1045"
                    value={formRawCode}
                    data-testid="input-raw-material-code"
                    onChange={(e) => {
                      setFormRawCode(e.target.value)
                      setFieldErrors((prev) => ({
                        ...prev,
                        raw_material_code: undefined,
                      }))
                    }}
                    className={`h-8 text-xs font-mono uppercase bg-white ${
                      fieldErrors.raw_material_code ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                  />
                  {fieldErrors.raw_material_code && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-raw-material-code"
                    >
                      {fieldErrors.raw_material_code}
                    </p>
                  )}
                </div>
              </div>

              {/* Descrição da MP */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">
                  Descrição da Matéria-Prima
                </Label>
                <Input
                  placeholder="Ex: Tarugo Aço 1045 130x130mm corrida contínua"
                  value={formRawDesc}
                  onChange={(e) => setFormRawDesc(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Bloco 2: Fornecedor, Aplicação e Bitola */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                2. Fornecedor & Aplicação
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Fornecedor */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">Fornecedor</Label>
                  <div className="space-y-1.5">
                    <select
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none"
                    >
                      <option value="">Selecione ou digite abaixo...</option>
                      {FORNECEDORES_SUGERIDOS.map((forn) => (
                        <option key={forn} value={forn}>
                          {forn}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Ou digite o nome/código do fornecedor"
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Aplicação */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Aplicação da Matéria-Prima *
                  </Label>
                  <Input
                    placeholder="Ex: Laminação direta, Forjaria, Trefilação L02"
                    value={formApplication}
                    data-testid="input-application"
                    onChange={(e) => {
                      setFormApplication(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, application: undefined }))
                    }}
                    className={`h-8 text-xs bg-white ${
                      fieldErrors.application ? 'border-red-500 ring-1 ring-red-500' : ''
                    }`}
                  />
                  {fieldErrors.application && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-application"
                    >
                      {fieldErrors.application}
                    </p>
                  )}
                </div>
              </div>

              {/* Bitola ZPPT052 & Tipo de Aço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">
                    Bitola de Referência (SAP ZPPT052)
                  </Label>
                  <BitolaSelector
                    value={formBitolaRef}
                    centerCode={centerCode}
                    onChange={(val) => {
                      setFormBitolaRef(val)
                      if (!formApplication && val && val !== 'Não há') {
                        setFormApplication(`Bitola ${val}`)
                      }
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Tipo de Aço</Label>
                  <TipoAcoSelector
                    value={formSteelType}
                    onChange={(val) => setFormSteelType(val)}
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Pesos (kg) com validações e padrão brasileiro */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#004C97]" /> 3. Pesos da Matéria-Prima (kg)
                </span>
                <span className="text-[11px] text-slate-500">Padrão pt-BR: 1.250,50 kg</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Peso Mínimo */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Peso Mínimo (kg)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 1.200,00"
                      value={formMinWeight}
                      data-testid="input-min-weight"
                      onChange={(e) => {
                        setFormMinWeight(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, min_weight_kg: undefined }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-8 ${
                        fieldErrors.min_weight_kg ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">kg</span>
                  </div>
                  {fieldErrors.min_weight_kg && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-min-weight"
                    >
                      {fieldErrors.min_weight_kg}
                    </p>
                  )}
                </div>

                {/* Peso Médio */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">Peso Médio (kg)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 1.250,50"
                      value={formAvgWeight}
                      data-testid="input-avg-weight"
                      onChange={(e) => {
                        setFormAvgWeight(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          average_weight_kg: undefined,
                        }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-8 font-bold text-slate-900 ${
                        fieldErrors.average_weight_kg ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">kg</span>
                  </div>
                  {fieldErrors.average_weight_kg && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-avg-weight"
                    >
                      {fieldErrors.average_weight_kg}
                    </p>
                  )}
                </div>

                {/* Peso Máximo */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Peso Máximo (kg)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 1.300,00"
                      value={formMaxWeight}
                      data-testid="input-max-weight"
                      onChange={(e) => {
                        setFormMaxWeight(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, max_weight_kg: undefined }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-8 ${
                        fieldErrors.max_weight_kg ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">kg</span>
                  </div>
                  {fieldErrors.max_weight_kg && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-max-weight"
                    >
                      {fieldErrors.max_weight_kg}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 4: Comprimentos (m) */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-[#004C97]" /> 4. Comprimentos (m)
                </span>
                <span className="text-[11px] text-slate-500">Padrão pt-BR: 6,00 m</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Comprimento Laminado */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Comp. Laminado (m)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 6,00"
                      value={formRolledLength}
                      data-testid="input-rolled-length"
                      onChange={(e) => {
                        setFormRolledLength(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          rolled_length_m: undefined,
                        }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-7 ${
                        fieldErrors.rolled_length_m ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">m</span>
                  </div>
                  {fieldErrors.rolled_length_m && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-rolled-length"
                    >
                      {fieldErrors.rolled_length_m}
                    </p>
                  )}
                </div>

                {/* Comprimento Múltiplo */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Comp. Múltiplo (m)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 12,00"
                      value={formMultipleLength}
                      data-testid="input-multiple-length"
                      onChange={(e) => {
                        setFormMultipleLength(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          multiple_length_m: undefined,
                        }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-7 ${
                        fieldErrors.multiple_length_m ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">m</span>
                  </div>
                  {fieldErrors.multiple_length_m && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-multiple-length"
                    >
                      {fieldErrors.multiple_length_m}
                    </p>
                  )}
                </div>

                {/* Comprimento Mínimo MP */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Comp. Mínimo MP (m)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 5,50"
                      value={formMinMpLength}
                      data-testid="input-min-mp-length"
                      onChange={(e) => {
                        setFormMinMpLength(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          min_mp_length_m: undefined,
                        }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-7 ${
                        fieldErrors.min_mp_length_m ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">m</span>
                  </div>
                  {fieldErrors.min_mp_length_m && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-min-mp-length"
                    >
                      {fieldErrors.min_mp_length_m}
                    </p>
                  )}
                </div>

                {/* Comprimento Máximo MP */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Comp. Máximo MP (m)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 6,50"
                      value={formMaxMpLength}
                      data-testid="input-max-mp-length"
                      onChange={(e) => {
                        setFormMaxMpLength(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          max_mp_length_m: undefined,
                        }))
                      }}
                      className={`h-8 text-xs font-mono bg-white pr-7 ${
                        fieldErrors.max_mp_length_m ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400">m</span>
                  </div>
                  {fieldErrors.max_mp_length_m && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-max-mp-length"
                    >
                      {fieldErrors.max_mp_length_m}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 5: Redução Técnica (Duas representações sincronizadas) */}
            <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#004C97] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5" /> 5. Regra de Redução Sincronizada
                </span>
                <span className="text-[11px] text-slate-500">
                  Fórmula: Redução (%) = (1 - 1/X) × 100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Razão 1:X */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Razão de Redução (1:X) — Informe o valor de X
                  </Label>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-[#004C97] text-sm bg-white border border-slate-300 rounded px-2.5 py-1">
                      1 :
                    </span>
                    <Input
                      placeholder="Ex: 5 ou 5,00"
                      value={formRatioX}
                      data-testid="input-reduction-ratio-x"
                      onChange={(e) => handleRatioXChange(e.target.value)}
                      className={`h-8 text-xs font-mono bg-white font-bold ${
                        fieldErrors.reduction ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ex: se digitar <strong>5</strong>, calcula 1:5 → (1 - 1/5) × 100 ={' '}
                    <strong>80,00%</strong>.
                  </p>
                </div>

                {/* Redução Percentual */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Redução Percentual (%)
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 80,00"
                      value={formReductionPct}
                      data-testid="input-reduction-percentage"
                      onChange={(e) => handleReductionPctChange(e.target.value)}
                      className={`h-8 text-xs font-mono bg-white font-bold text-emerald-700 pr-7 ${
                        fieldErrors.reduction ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 font-bold">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sincronizado bidirecionalmente com a razão 1:X.
                  </p>
                </div>
              </div>

              {fieldErrors.reduction && (
                <p className="text-[11px] text-red-600 font-medium" data-testid="error-reduction">
                  {fieldErrors.reduction}
                </p>
              )}
            </div>

            {/* Bloco 6: Flags de Sequenciamento & Autorização Técnica */}
            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                6. CONTROLE DE SEQUENCIAMENTO & EXECUÇÃO TÉCNICA
              </span>

              <div className="space-y-3">
                {/* 1ª corrida */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="chkFirstRun"
                    checked={formFirstRun}
                    data-testid="checkbox-first-run"
                    onChange={(e) => setFormFirstRun(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                  />
                  <div>
                    <Label
                      htmlFor="chkFirstRun"
                      className="text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      1ª corrida: Sim
                    </Label>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Identifica matéria-prima inaugural/piloto. Disponível para regras de
                      sequenciamento e programação prioritária.
                    </p>
                  </div>
                </div>

                {/* Permitir fora padrão MP */}
                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    id="chkAllowOutOfStd"
                    checked={formAllowOutOfStd}
                    data-testid="checkbox-allow-out-of-standard"
                    onChange={(e) => setFormAllowOutOfStd(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <Label
                      htmlFor="chkAllowOutOfStd"
                      className="text-xs font-bold text-amber-900 cursor-pointer flex items-center gap-1.5"
                    >
                      Permitir fora padrão MP (Autorização Técnica da Ficha Mestra)
                    </Label>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      <strong>Se NÃO:</strong> a Programação Mensal (Fase 2) bloqueará
                      matérias-primas fora dos limites técnicos.
                      <br />
                      <strong>Se SIM:</strong> autoriza exceção técnica exclusiva para esta
                      configuração com alerta oficial e auditoria. O programador NUNCA poderá marcar
                      esta exceção durante a programação — a autorização vem exclusivamente deste
                      cadastro.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 7: TEMPO MÍNIMO PCP */}
            <div
              className="p-3 bg-slate-50/80 rounded-lg border border-slate-200 space-y-3"
              data-testid="bloco-tempo-minimo-pcp"
            >
              <div>
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                  7. TEMPO MÍNIMO PCP
                </span>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  Define a antecedência mínima necessária para que esta matéria-prima possa ser
                  utilizada em uma programação do PCP.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Campo 1: Unidade de tempo */}
                <div className="space-y-1">
                  <Label
                    htmlFor="select-tempo-minimo-unidade"
                    className="text-xs text-slate-700 font-semibold"
                  >
                    Unidade de tempo
                  </Label>
                  <select
                    id="select-tempo-minimo-unidade"
                    data-testid="select-tempo-minimo-unidade"
                    value={formTempoUnidade}
                    onChange={(e) => {
                      const nextUnidade = e.target.value as
                        | 'Minutos'
                        | 'Horas'
                        | 'Dias'
                        | 'Semanas'
                        | ''
                      setFormTempoUnidade(nextUnidade)
                      if (!nextUnidade) {
                        setFormTempoValor('')
                      }
                      setFieldErrors((prev) => ({ ...prev, tempo_minimo_pcp: undefined }))
                    }}
                    className={`w-full bg-white border rounded text-xs text-slate-900 h-8 px-2 focus:ring-1 focus:ring-[#004C97] outline-none ${
                      fieldErrors.tempo_minimo_pcp
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-slate-300'
                    }`}
                  >
                    <option value="">Selecione a unidade</option>
                    <option value="Minutos">Minutos</option>
                    <option value="Horas">Horas</option>
                    <option value="Dias">Dias</option>
                    <option value="Semanas">Semanas</option>
                  </select>
                </div>

                {/* Campo 2: Tempo mínimo de antecedência */}
                <div className="space-y-1">
                  <Label
                    htmlFor="input-tempo-minimo-valor"
                    className="text-xs text-slate-700 font-semibold"
                  >
                    Tempo mínimo de antecedência
                  </Label>
                  <div className="relative">
                    <Input
                      id="input-tempo-minimo-valor"
                      data-testid="input-tempo-minimo-valor"
                      placeholder={formTempoUnidade ? 'Ex: 12' : 'Selecione a unidade primeiro'}
                      disabled={!formTempoUnidade}
                      value={formTempoValor}
                      onChange={(e) => {
                        setFormTempoValor(e.target.value)
                        setFieldErrors((prev) => ({ ...prev, tempo_minimo_pcp: undefined }))
                      }}
                      className={`h-8 text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 ${
                        fieldErrors.tempo_minimo_pcp
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-slate-300'
                      }`}
                    />
                    {formTempoUnidade && (
                      <span className="absolute right-2.5 top-2 text-[11px] text-slate-500 font-medium pointer-events-none">
                        {formTempoUnidade.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {fieldErrors.tempo_minimo_pcp && (
                <p
                  className="text-[11px] text-red-600 font-medium"
                  data-testid="error-tempo-minimo-pcp"
                >
                  {fieldErrors.tempo_minimo_pcp}
                </p>
              )}
            </div>

            {/* Bloco 8: Status & Observações */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">Status *</Label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="mpStatus"
                      checked={formStatus === 'Ativo'}
                      data-testid="radio-status-ativo"
                      onChange={() => setFormStatus('Ativo')}
                      className="text-[#004C97] focus:ring-[#004C97]"
                    />
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Ativo
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="mpStatus"
                      checked={formStatus === 'Inativo'}
                      data-testid="radio-status-inativo"
                      onChange={() => setFormStatus('Inativo')}
                      className="text-[#004C97] focus:ring-[#004C97]"
                    />
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                      Inativo
                    </span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pt-0.5">
                  A Programação Mensal não permitirá uso de MPs inativas.
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-medium">Observações / Notas</Label>
                <Input
                  placeholder="Instruções de laminação ou observação técnica"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t border-slate-200 pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsModalOpen(false)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              data-testid="btn-save-mp-application"
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RawMaterialApplicationsPanel
