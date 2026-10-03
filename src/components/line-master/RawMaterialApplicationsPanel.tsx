/**
 * Painel: Matéria-Prima por Aplicação
 * Tópico na Ficha Mestra Expandida (PCP Robotizado HUB Ciafal)
 *
 * Estrutura oficial dos tópicos no modal:
 * BLOCO 1: Produto Acabado & Matéria-Prima
 * BLOCO 2: FORNECEDOR DA MP (Aplicabilidade: Aplicável/Não aplicável, Fornecedores múltiplos com SYSTEM_HOMOLOGATED_SUPPLIERS, Tipo de MP com SYSTEM_RAW_MATERIAL_TYPES)
 * BLOCO 3: APLICAÇÃO DO PRODUTO (Bitolas múltiplas, Tipos de Aço múltiplos, Comprimentos Laminado mm, Redução min/ideal/max %, Vigência dd/mm/aaaa, Redução 1:X <-> %)
 * BLOCO 4: PESOS DA MATÉRIA-PRIMA (t) (Mínimo, Médio, Máximo em toneladas)
 * BLOCO 5: COMPRIMENTO MATÉRIA-PRIMA (mm) (Mínimo, Ideal, Máximo em mm)
 * BLOCO 6: CONTROLE DE SEQUENCIAMENTO & EXECUÇÃO TÉCNICA
 * BLOCO 7: TEMPO MÍNIMO PCP
 * BLOCO 8: STATUS & OBSERVAÇÕES
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Scale,
  Ruler,
  Percent,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
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
  StructuredSupplier,
  SYSTEM_RAW_MATERIAL_TYPES,
  SYSTEM_HOMOLOGATED_SUPPLIERS,
} from '@/types/raw-material-application'
import { rawMaterialApplicationService } from '@/services/raw-material-application-service'
import {
  formatBrNumber,
  formatBrWithUnit,
  calculateReductionFromRatioX,
  calculateReductionFromPercentage,
} from '@/utils/number-br-formatters'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import { SupplierMultiSelect } from '@/components/line-master/SupplierMultiSelect'
import { BitolaMultiSelect } from '@/components/line-master/BitolaMultiSelect'
import { TipoAcoMultiSelect } from '@/components/line-master/TipoAcoMultiSelect'

interface RawMaterialApplicationsPanelProps {
  lineId: string
  centerCode: string
  centerName?: string
  lineMasterId?: string
  onRefreshParent?: () => void
}

/** Formata data ISO (YYYY-MM-DD) para dd/mm/aaaa */
function isoToPtBrDate(iso?: string | null): string {
  if (!iso) return ''
  const trimmed = iso.trim()
  if (trimmed.includes('/')) return trimmed
  const parts = trimmed.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`
  }
  return trimmed
}

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

  // Filtros da listagem
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

  // Estado do formulário — Bloco 1: Produto Acabado & Matéria-Prima
  const [formProductCode, setFormProductCode] = useState<string>('')
  const [formProductDesc, setFormProductDesc] = useState<string>('')
  const [formRawCode, setFormRawCode] = useState<string>('')
  const [formRawDesc, setFormRawDesc] = useState<string>('')

  // Bloco 2: FORNECEDOR DA MP
  const [formSupplierApplicable, setFormSupplierApplicable] = useState<boolean>(true)
  const [formSuppliersJson, setFormSuppliersJson] = useState<StructuredSupplier[]>([])
  const [formRawMaterialType, setFormRawMaterialType] = useState<string>('')

  // Bloco 3: APLICAÇÃO DO PRODUTO
  const [formApplication, setFormApplication] = useState<string>('')
  const [formBitolasJson, setFormBitolasJson] = useState<string[]>([])
  const [formSteelTypesJson, setFormSteelTypesJson] = useState<string[]>([])
  const [formRolledMinLengthMm, setFormRolledMinLengthMm] = useState<string>('')
  const [formRolledIdealLengthMm, setFormRolledIdealLengthMm] = useState<string>('')
  const [formRolledMaxLengthMm, setFormRolledMaxLengthMm] = useState<string>('')
  const [formReductionMinPct, setFormReductionMinPct] = useState<string>('')
  const [formReductionIdealPct, setFormReductionIdealPct] = useState<string>('')
  const [formReductionMaxPct, setFormReductionMaxPct] = useState<string>('')
  const [formValidityStart, setFormValidityStart] = useState<string>('')
  const [formValidityEnd, setFormValidityEnd] = useState<string>('')
  const [formRatioX, setFormRatioX] = useState<string>('')
  const [formReductionPct, setFormReductionPct] = useState<string>('')

  // Bloco 4: PESOS DA MATÉRIA-PRIMA (t)
  const [formMinWeightT, setFormMinWeightT] = useState<string>('')
  const [formAvgWeightT, setFormAvgWeightT] = useState<string>('')
  const [formMaxWeightT, setFormMaxWeightT] = useState<string>('')

  // Bloco 5: COMPRIMENTO MATÉRIA-PRIMA (mm)
  const [formMinMpLengthMm, setFormMinMpLengthMm] = useState<string>('')
  const [formIdealMpLengthMm, setFormIdealMpLengthMm] = useState<string>('')
  const [formMaxMpLengthMm, setFormMaxMpLengthMm] = useState<string>('')

  // Bloco 6: CONTROLE DE SEQUENCIAMENTO & EXECUÇÃO TÉCNICA
  const [formFirstRun, setFormFirstRun] = useState<boolean>(false)
  const [formAllowOutOfStd, setFormAllowOutOfStd] = useState<boolean>(false)

  // Bloco 7: TEMPO MÍNIMO PCP
  const [formTempoUnidade, setFormTempoUnidade] = useState<
    'Minutos' | 'Horas' | 'Dias' | 'Semanas' | ''
  >('')
  const [formTempoValor, setFormTempoValor] = useState<string>('')

  // Bloco 8: STATUS & OBSERVAÇÕES
  const [formStatus, setFormStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [formNotes, setFormNotes] = useState<string>('')

  // Carregar dados da linha
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

  // Listas de opções para filtros do cabeçalho
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
      if (i.suppliers_json && Array.isArray(i.suppliers_json)) {
        i.suppliers_json.forEach((s) => {
          if (s && s.name) set.add(s.name)
        })
      }
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
      if (filterSupplier !== 'Todos') {
        const hasInJson =
          Array.isArray(item.suppliers_json) &&
          item.suppliers_json.some((s) => s.name === filterSupplier || s.code === filterSupplier)
        const hasLegacy = item.supplier === filterSupplier
        if (!hasInJson && !hasLegacy) return false
      }
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
        const suppliersText = Array.isArray(item.suppliers_json)
          ? item.suppliers_json.map((s) => `${s.code} ${s.name}`).join(' ')
          : ''
        const text = [
          item.product_code,
          item.product_description,
          item.raw_material_code,
          item.raw_material_description,
          item.raw_material_type,
          item.supplier,
          suppliersText,
          item.application,
          (item.bitolas_json || []).join(' '),
          (item.steel_types_json || []).join(' '),
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

    // Bloco 1
    setFormProductCode('')
    setFormProductDesc('')
    setFormRawCode('')
    setFormRawDesc('')

    // Bloco 2
    setFormSupplierApplicable(true)
    setFormSuppliersJson([])
    setFormRawMaterialType('')

    // Bloco 3
    setFormApplication('')
    setFormBitolasJson([])
    setFormSteelTypesJson([])
    setFormRolledMinLengthMm('')
    setFormRolledIdealLengthMm('')
    setFormRolledMaxLengthMm('')
    setFormReductionMinPct('')
    setFormReductionIdealPct('')
    setFormReductionMaxPct('')
    setFormValidityStart('')
    setFormValidityEnd('')
    setFormRatioX('')
    setFormReductionPct('')

    // Bloco 4
    setFormMinWeightT('')
    setFormAvgWeightT('')
    setFormMaxWeightT('')

    // Bloco 5
    setFormMinMpLengthMm('')
    setFormIdealMpLengthMm('')
    setFormMaxMpLengthMm('')

    // Bloco 6
    setFormFirstRun(false)
    setFormAllowOutOfStd(false)

    // Bloco 7
    setFormTempoUnidade('')
    setFormTempoValor('')

    // Bloco 8
    setFormStatus('Ativo')
    setFormNotes('')

    setIsModalOpen(true)
  }

  // Abertura para edição com conversão integral dos campos legados (kg -> t, m -> mm)
  const handleOpenEdit = (item: LineRawMaterialApplication) => {
    setEditingItem(item)
    setFieldErrors({})

    // Bloco 1
    setFormProductCode(item.product_code || '')
    setFormProductDesc(item.product_description || '')
    setFormRawCode(item.raw_material_code || '')
    setFormRawDesc(item.raw_material_description || '')

    // Bloco 2: Fornecedor da MP
    const isApplicable =
      item.supplier_applicable !== undefined && item.supplier_applicable !== null
        ? Boolean(item.supplier_applicable)
        : true
    setFormSupplierApplicable(isApplicable)

    let loadedSuppliers: StructuredSupplier[] = []
    if (Array.isArray(item.suppliers_json) && item.suppliers_json.length > 0) {
      loadedSuppliers = item.suppliers_json
    } else if (item.supplier) {
      // Conversão retrocompatível de fornecedor legado em texto
      const matched = SYSTEM_HOMOLOGATED_SUPPLIERS.find(
        (s) =>
          s.name.toLowerCase() === item.supplier!.toLowerCase() ||
          s.code.toLowerCase() === (item.supplier_id || '').toLowerCase(),
      )
      if (matched) {
        loadedSuppliers = [{ code: matched.code, name: matched.name }]
      } else {
        loadedSuppliers = [{ code: item.supplier_id || 'HOMOLOGADO', name: item.supplier }]
      }
    }
    setFormSuppliersJson(loadedSuppliers)
    setFormRawMaterialType(item.raw_material_type || '')

    // Bloco 3: Aplicação do Produto
    setFormApplication(item.application || '')

    // Bitolas
    let loadedBitolas: string[] = []
    if (Array.isArray(item.bitolas_json) && item.bitolas_json.length > 0) {
      loadedBitolas = item.bitolas_json
    } else if (item.bitola_ref) {
      loadedBitolas = [item.bitola_ref]
    }
    setFormBitolasJson(loadedBitolas)

    // Tipos de Aço
    let loadedSteels: string[] = []
    if (Array.isArray(item.steel_types_json) && item.steel_types_json.length > 0) {
      loadedSteels = item.steel_types_json
    } else if (item.steel_type) {
      loadedSteels = [item.steel_type]
    }
    setFormSteelTypesJson(loadedSteels)

    // Comprimentos Laminado (mm com fallback m -> mm)
    const rolledIdealMm =
      item.rolled_ideal_length_mm != null
        ? item.rolled_ideal_length_mm
        : item.rolled_length_m != null
          ? Math.round(item.rolled_length_m * 1000)
          : null
    const rolledMinMm =
      item.rolled_min_length_mm != null ? item.rolled_min_length_mm : rolledIdealMm
    const rolledMaxMm =
      item.rolled_max_length_mm != null ? item.rolled_max_length_mm : rolledIdealMm

    setFormRolledMinLengthMm(rolledMinMm != null ? formatBrNumber(rolledMinMm, 0) : '')
    setFormRolledIdealLengthMm(rolledIdealMm != null ? formatBrNumber(rolledIdealMm, 0) : '')
    setFormRolledMaxLengthMm(rolledMaxMm != null ? formatBrNumber(rolledMaxMm, 0) : '')

    // Redução (%) faixas mín/ideal/máx
    const redIdeal =
      item.reduction_ideal_pct != null
        ? item.reduction_ideal_pct
        : item.reduction_percentage != null
          ? item.reduction_percentage
          : null
    const redMin = item.reduction_min_pct != null ? item.reduction_min_pct : redIdeal
    const redMax = item.reduction_max_pct != null ? item.reduction_max_pct : redIdeal

    setFormReductionMinPct(redMin != null ? formatBrNumber(redMin, 2) : '')
    setFormReductionIdealPct(redIdeal != null ? formatBrNumber(redIdeal, 2) : '')
    setFormReductionMaxPct(redMax != null ? formatBrNumber(redMax, 2) : '')

    // Vigência (dd/mm/aaaa)
    setFormValidityStart(isoToPtBrDate(item.validity_start_date))
    setFormValidityEnd(isoToPtBrDate(item.validity_end_date))

    // Redução sincronizada (1:X e %)
    setFormRatioX(item.reduction_ratio_x != null ? formatBrNumber(item.reduction_ratio_x, 2) : '')
    setFormReductionPct(
      item.reduction_percentage != null
        ? formatBrNumber(item.reduction_percentage, 2)
        : redIdeal != null
          ? formatBrNumber(redIdeal, 2)
          : '',
    )

    // Bloco 4: Pesos (t com conversão de kg legados se t vazio)
    const minWt =
      item.min_weight_t != null
        ? item.min_weight_t
        : item.min_weight_kg != null
          ? item.min_weight_kg / 1000
          : null
    const avgWt =
      item.average_weight_t != null
        ? item.average_weight_t
        : item.average_weight_kg != null
          ? item.average_weight_kg / 1000
          : null
    const maxWt =
      item.max_weight_t != null
        ? item.max_weight_t
        : item.max_weight_kg != null
          ? item.max_weight_kg / 1000
          : null

    setFormMinWeightT(minWt != null ? formatBrNumber(minWt, 4) : '')
    setFormAvgWeightT(avgWt != null ? formatBrNumber(avgWt, 4) : '')
    setFormMaxWeightT(maxWt != null ? formatBrNumber(maxWt, 4) : '')

    // Bloco 5: Comprimento MP (mm com conversão de m legados se mm vazio)
    const minMpMm =
      item.min_mp_length_mm != null
        ? item.min_mp_length_mm
        : item.min_mp_length_m != null
          ? Math.round(item.min_mp_length_m * 1000)
          : null
    const maxMpMm =
      item.max_mp_length_mm != null
        ? item.max_mp_length_mm
        : item.max_mp_length_m != null
          ? Math.round(item.max_mp_length_m * 1000)
          : null
    const idealMpMm =
      item.ideal_mp_length_mm != null
        ? item.ideal_mp_length_mm
        : minMpMm != null && maxMpMm != null
          ? Math.round((minMpMm + maxMpMm) / 2)
          : null

    setFormMinMpLengthMm(minMpMm != null ? formatBrNumber(minMpMm, 0) : '')
    setFormIdealMpLengthMm(idealMpMm != null ? formatBrNumber(idealMpMm, 0) : '')
    setFormMaxMpLengthMm(maxMpMm != null ? formatBrNumber(maxMpMm, 0) : '')

    // Bloco 6
    setFormFirstRun(Boolean(item.first_run))
    setFormAllowOutOfStd(Boolean(item.allow_out_of_standard_mp))

    // Bloco 7: Tempo Mínimo PCP
    setFormTempoUnidade(
      (item.tempo_minimo_pcp_unidade as 'Minutos' | 'Horas' | 'Dias' | 'Semanas') || '',
    )
    setFormTempoValor(
      item.tempo_minimo_pcp_valor != null
        ? formatBrNumber(item.tempo_minimo_pcp_valor, item.tempo_minimo_pcp_valor % 1 === 0 ? 0 : 2)
        : '',
    )

    // Bloco 8
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
      const pctFormatted = formatBrNumber(res.percentage, 2)
      setFormReductionPct(pctFormatted)
      // Se a redução ideal estiver vazia, preencher automaticamente
      if (!formReductionIdealPct) {
        setFormReductionIdealPct(pctFormatted)
      }
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
      if (!formReductionIdealPct) {
        setFormReductionIdealPct(val)
      }
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
        title: 'Status atualizado com sucesso',
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

      // Bloco 2: Fornecedor da MP
      supplier_applicable: formSupplierApplicable,
      suppliers_json: formSupplierApplicable ? formSuppliersJson : [],
      raw_material_type: formRawMaterialType.trim(),

      // Bloco 3: Aplicação do Produto
      application: formApplication.trim(),
      bitolas_json: formBitolasJson,
      steel_types_json: formSteelTypesJson,
      rolled_min_length_mm: formRolledMinLengthMm,
      rolled_ideal_length_mm: formRolledIdealLengthMm,
      rolled_max_length_mm: formRolledMaxLengthMm,
      reduction_min_pct: formReductionMinPct,
      reduction_ideal_pct: formReductionIdealPct,
      reduction_max_pct: formReductionMaxPct,
      reduction_ratio_x: formRatioX,
      reduction_percentage: formReductionPct,
      validity_start_date: formValidityStart,
      validity_end_date: formValidityEnd,

      // Bloco 4: Pesos (t)
      min_weight_t: formMinWeightT,
      average_weight_t: formAvgWeightT,
      max_weight_t: formMaxWeightT,

      // Bloco 5: Comprimento MP (mm)
      min_mp_length_mm: formMinMpLengthMm,
      ideal_mp_length_mm: formIdealMpLengthMm,
      max_mp_length_mm: formMaxMpLengthMm,

      // Bloco 6: Sequenciamento
      first_run: formFirstRun,
      allow_out_of_standard_mp: formAllowOutOfStd,

      // Bloco 7: Tempo Mínimo PCP
      tempo_minimo_pcp_unidade: formTempoUnidade,
      tempo_minimo_pcp_valor: formTempoValor,

      // Bloco 8: Status & Observações
      status: formStatus,
      notes: formNotes.trim(),
    }

    // 1. Validar campos
    const errors = rawMaterialApplicationService.validateFormData(formData)

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
        title: 'Matéria-prima salva com sucesso!',
        description: `Especificação da MP ${formRawCode} cadastrada para ${formProductCode} (${formApplication}).`,
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
              Cadastro técnico de múltiplas matérias-primas e aplicações para o centro/produto (HUB
              Ciafal). Pesos em toneladas (t) e comprimentos em milímetros (mm).
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

          {/* Tabela Responsiva com Formatação ABNT/pt-BR (t e mm) */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200 font-bold tracking-wider">
                <tr>
                  <th className="p-2.5 whitespace-nowrap">Código MP</th>
                  <th className="p-2.5 whitespace-nowrap">Tipo MP</th>
                  <th className="p-2.5 whitespace-nowrap">Fornecedor</th>
                  <th className="p-2.5 whitespace-nowrap">Produto / Ref.</th>
                  <th className="p-2.5 whitespace-nowrap">Aplicação</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Peso Médio (t)</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Faixa Peso (t)</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Comp. Ideal MP (mm)</th>
                  <th className="p-2.5 whitespace-nowrap text-right">Faixa Comp. MP (mm)</th>
                  <th className="p-2.5 whitespace-nowrap text-center">Redução</th>
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
                    <td colSpan={15} className="p-6 text-center text-slate-400 italic text-xs">
                      Nenhuma matéria-prima por aplicação encontrada com os filtros selecionados.
                      Clique em &quot;Adicionar matéria-prima&quot; para cadastrar.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isActive = item.status === 'Ativo'

                    // Obter valores em t com fallback para kg legados
                    const displayAvgT =
                      item.average_weight_t != null
                        ? item.average_weight_t
                        : item.average_weight_kg != null
                          ? item.average_weight_kg / 1000
                          : null

                    const displayMinT =
                      item.min_weight_t != null
                        ? item.min_weight_t
                        : item.min_weight_kg != null
                          ? item.min_weight_kg / 1000
                          : null

                    const displayMaxT =
                      item.max_weight_t != null
                        ? item.max_weight_t
                        : item.max_weight_kg != null
                          ? item.max_weight_kg / 1000
                          : null

                    // Obter valores em mm com fallback para m legados
                    const displayIdealMm =
                      item.ideal_mp_length_mm != null
                        ? item.ideal_mp_length_mm
                        : item.min_mp_length_mm != null && item.max_mp_length_mm != null
                          ? Math.round((item.min_mp_length_mm + item.max_mp_length_mm) / 2)
                          : item.min_mp_length_m != null && item.max_mp_length_m != null
                            ? Math.round(((item.min_mp_length_m + item.max_mp_length_m) / 2) * 1000)
                            : null

                    const displayMinMm =
                      item.min_mp_length_mm != null
                        ? item.min_mp_length_mm
                        : item.min_mp_length_m != null
                          ? Math.round(item.min_mp_length_m * 1000)
                          : null

                    const displayMaxMm =
                      item.max_mp_length_mm != null
                        ? item.max_mp_length_mm
                        : item.max_mp_length_m != null
                          ? Math.round(item.max_mp_length_m * 1000)
                          : null

                    // Fornecedor label
                    const isApplicable = item.supplier_applicable !== false
                    let supplierLabel = 'Não aplicável'
                    if (isApplicable) {
                      if (Array.isArray(item.suppliers_json) && item.suppliers_json.length > 0) {
                        supplierLabel = item.suppliers_json.map((s) => s.name || s.code).join(', ')
                      } else if (item.supplier) {
                        supplierLabel = item.supplier
                      } else {
                        supplierLabel = '—'
                      }
                    }

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
                              className="text-[11px] text-slate-500 block truncate max-w-[160px]"
                              title={item.raw_material_description}
                            >
                              {item.raw_material_description}
                            </span>
                          )}
                        </td>

                        {/* Tipo de MP */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="text-slate-800 font-medium">
                            {item.raw_material_type || <span className="text-slate-400">—</span>}
                          </span>
                        </td>

                        {/* Fornecedor */}
                        <td className="p-2.5 whitespace-nowrap">
                          {isApplicable ? (
                            <span
                              className="text-slate-800 font-medium truncate block max-w-[180px]"
                              title={supplierLabel}
                            >
                              {supplierLabel}
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-100 text-slate-500 border-slate-300"
                            >
                              Não aplicável
                            </Badge>
                          )}
                        </td>

                        {/* Produto */}
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#004C97] block">
                            {item.product_code}
                          </span>
                          {item.product_description && (
                            <span
                              className="text-[11px] text-slate-500 block truncate max-w-[150px]"
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
                          {Array.isArray(item.bitolas_json) && item.bitolas_json.length > 0 ? (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {item.bitolas_json.join(', ')}
                            </span>
                          ) : item.bitola_ref ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 bg-slate-50 border-slate-300 text-slate-600"
                            >
                              {item.bitola_ref}
                            </Badge>
                          ) : null}
                        </td>

                        {/* Peso Médio (t) */}
                        <td className="p-2.5 font-mono font-bold text-slate-900 text-right whitespace-nowrap">
                          {displayAvgT != null ? formatBrWithUnit(displayAvgT, 't', 4) : '—'}
                        </td>

                        {/* Faixa Peso (t) */}
                        <td className="p-2.5 font-mono text-slate-600 text-right whitespace-nowrap text-[11px]">
                          {displayMinT != null || displayMaxT != null ? (
                            <span>
                              {displayMinT != null ? formatBrNumber(displayMinT, 4) : '0,0000'} a{' '}
                              {displayMaxT != null ? formatBrNumber(displayMaxT, 4) : '∞'} t
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Comp. Ideal MP (mm) */}
                        <td className="p-2.5 font-mono font-bold text-slate-800 text-right whitespace-nowrap">
                          {displayIdealMm != null ? formatBrWithUnit(displayIdealMm, 'mm', 0) : '—'}
                        </td>

                        {/* Faixa Comp. MP (mm) */}
                        <td className="p-2.5 font-mono text-slate-600 text-right whitespace-nowrap text-[11px]">
                          {displayMinMm != null || displayMaxMm != null ? (
                            <span>
                              {displayMinMm != null ? formatBrNumber(displayMinMm, 0) : '0'} a{' '}
                              {displayMaxMm != null ? formatBrNumber(displayMaxMm, 0) : '∞'} mm
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Redução */}
                        <td className="p-2.5 text-center whitespace-nowrap">
                          {item.reduction_ratio_text || item.reduction_percentage != null ? (
                            <div className="inline-flex items-center gap-1.5">
                              {item.reduction_ratio_text && (
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] bg-blue-50 text-[#004C97] border-blue-200 font-bold"
                                >
                                  {item.reduction_ratio_text}
                                </Badge>
                              )}
                              <span className="font-mono font-bold text-emerald-700 text-xs">
                                {item.reduction_percentage != null
                                  ? `${formatBrNumber(item.reduction_percentage, 2)} %`
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

      {/* MODAL: Cadastrar / Editar Matéria-Prima por Aplicação (Grande Área Útil & Responsivo) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-slate-900 text-base sm:text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#004C97]" />
              {editingItem
                ? 'Editar Matéria-Prima por Aplicação'
                : 'Cadastrar Matéria-Prima por Aplicação'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Centro de Trabalho: <strong className="text-slate-700">{centerCode}</strong> —{' '}
              {centerName || 'Ficha Mestra Ciafal'}. Preencha os 8 blocos técnicos abaixo.
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
            {/* ========================================================= */}
            {/* BLOCO 1: Produto Acabado & Matéria-Prima (MANTER)         */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-[#004C97] text-xs uppercase tracking-wider block">
                1. Produto Acabado & Matéria-Prima (Obrigatório)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Produto Acabado */}
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
                    <span
                      className="text-[11px] text-slate-500 block truncate"
                      title={formProductDesc}
                    >
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
                    className={`h-9 text-xs font-mono uppercase bg-white ${
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
                  placeholder="Ex: Tarugo Aço 1045 130x130 mm corrida contínua"
                  value={formRawDesc}
                  onChange={(e) => setFormRawDesc(e.target.value)}
                  className="h-9 text-xs bg-white"
                />
              </div>
            </div>

            {/* ========================================================= */}
            {/* BLOCO 2: FORNECEDOR DA MP (Reestruturado)                  */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-[#004C97] text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#004C97]" /> 2. FORNECEDOR DA MP
              </span>

              {/* Aplicabilidade do fornecedor */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 font-semibold">
                  Aplicabilidade do Fornecedor *
                </Label>
                <div className="flex items-center gap-4">
                  <label
                    data-testid="radio-supplier-applicable"
                    className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md border text-xs font-semibold transition-all ${
                      formSupplierApplicable
                        ? 'bg-blue-50 border-[#004C97] text-[#004C97] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="supplierApplicable"
                      checked={formSupplierApplicable}
                      onChange={() => {
                        setFormSupplierApplicable(true)
                        setFieldErrors((prev) => ({ ...prev, suppliers: undefined }))
                      }}
                      className="text-[#004C97] focus:ring-[#004C97]"
                    />
                    <span>Aplicável</span>
                  </label>

                  <label
                    data-testid="radio-supplier-not-applicable"
                    className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-md border text-xs font-semibold transition-all ${
                      !formSupplierApplicable
                        ? 'bg-slate-100 border-slate-400 text-slate-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="supplierApplicable"
                      checked={!formSupplierApplicable}
                      onChange={() => {
                        setFormSupplierApplicable(false)
                        setFieldErrors((prev) => ({ ...prev, suppliers: undefined }))
                      }}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <span>Não aplicável</span>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  {formSupplierApplicable
                    ? 'Selecione uma ou mais siderúrgicas homologadas pelo SGQ Ciafal.'
                    : 'MP sem restrição por fornecedor específico (seleção de fornecedores desabilitada sem erro).'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Fornecedores da MP (Multisseleção) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Fornecedores da MP {formSupplierApplicable && '*'}
                  </Label>
                  <SupplierMultiSelect
                    selectedSuppliers={formSuppliersJson}
                    onChange={(sups) => {
                      setFormSuppliersJson(sups)
                      setFieldErrors((prev) => ({ ...prev, suppliers: undefined }))
                    }}
                    disabled={!formSupplierApplicable}
                    hasError={Boolean(fieldErrors.suppliers)}
                  />
                  {fieldErrors.suppliers && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-suppliers"
                    >
                      {fieldErrors.suppliers}
                    </p>
                  )}
                </div>

                {/* Tipo de Matéria-prima (Seleção Única de SYSTEM_RAW_MATERIAL_TYPES) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Tipo de Matéria-prima *
                  </Label>
                  <select
                    value={formRawMaterialType}
                    data-testid="select-raw-material-type"
                    onChange={(e) => {
                      setFormRawMaterialType(e.target.value)
                      setFieldErrors((prev) => ({ ...prev, raw_material_type: undefined }))
                    }}
                    className={`w-full bg-white border rounded text-xs text-slate-900 h-9 px-2.5 focus:ring-1 focus:ring-[#004C97] outline-none ${
                      fieldErrors.raw_material_type
                        ? 'border-red-500 ring-1 ring-red-500'
                        : 'border-slate-300'
                    }`}
                  >
                    <option value="">Selecione o Tipo de MP homologado...</option>
                    {SYSTEM_RAW_MATERIAL_TYPES.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Ex: Placa, Bloco, Palanquilha, Tarugo 155, Tarugo 130x130, Lingote.
                  </p>
                  {fieldErrors.raw_material_type && (
                    <p className="text-[11px] text-red-600 font-medium">
                      {fieldErrors.raw_material_type}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* BLOCO 3: APLICAÇÃO DO PRODUTO (Novo e Completo)            */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-blue-50/40 rounded-lg border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#004C97] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#004C97]" /> 3. APLICAÇÃO DO PRODUTO
                </span>
                <span className="text-[11px] text-slate-500">
                  Bitolas, aços, conformação e vigência
                </span>
              </div>

              {/* Aplicação da Matéria-Prima */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-700 font-semibold">
                  Aplicação da Matéria-Prima *
                </Label>
                <Input
                  placeholder="Ex: Laminação direta, Forjaria pesada, Trefilação L02"
                  value={formApplication}
                  data-testid="input-application"
                  onChange={(e) => {
                    setFormApplication(e.target.value)
                    setFieldErrors((prev) => ({ ...prev, application: undefined }))
                  }}
                  className={`h-9 text-xs bg-white ${
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

              {/* Multisseleção de Bitolas e Tipos de Aço */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Bitolas Homologadas (ZPPT052)
                  </Label>
                  <BitolaMultiSelect
                    selectedBitolas={formBitolasJson}
                    onChange={(bits) => setFormBitolasJson(bits)}
                    centerCode={centerCode}
                  />
                  <p className="text-[11px] text-slate-500">
                    Selecione uma ou mais bitolas aplicáveis a esta MP.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Tipos de Aço Homologados (ZPPT002)
                  </Label>
                  <TipoAcoMultiSelect
                    selectedSteelTypes={formSteelTypesJson}
                    onChange={(steels) => setFormSteelTypesJson(steels)}
                    centerCode={centerCode}
                  />
                  <p className="text-[11px] text-slate-500">
                    Selecione os tipos de aço atendidos por esta aplicação.
                  </p>
                </div>
              </div>

              {/* Comprimentos Laminados (mm) */}
              <div className="pt-2 border-t border-blue-100 space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Comprimento Laminado (mm) — Mínimo / Ideal / Máximo
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Comp. Mín. Laminado (mm)</Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 5.500"
                        value={formRolledMinLengthMm}
                        data-testid="input-rolled-min-length-mm"
                        onChange={(e) => {
                          setFormRolledMinLengthMm(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            rolled_min_length_mm: undefined,
                            rolled_length: undefined,
                          }))
                        }}
                        className={`h-9 text-xs font-mono bg-white pr-9 ${
                          fieldErrors.rolled_min_length_mm
                            ? 'border-red-500 ring-1 ring-red-500'
                            : ''
                        }`}
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                        mm
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Comprimento Ideal Laminado (mm)
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 6.000"
                        value={formRolledIdealLengthMm}
                        data-testid="input-rolled-ideal-length-mm"
                        onChange={(e) => {
                          setFormRolledIdealLengthMm(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            rolled_ideal_length_mm: undefined,
                            rolled_length: undefined,
                          }))
                        }}
                        className={`h-9 text-xs font-mono bg-white font-bold pr-9 ${
                          fieldErrors.rolled_ideal_length_mm
                            ? 'border-red-500 ring-1 ring-red-500'
                            : ''
                        }`}
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                        mm
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Comp. Máx. Laminado (mm)</Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 6.500"
                        value={formRolledMaxLengthMm}
                        data-testid="input-rolled-max-length-mm"
                        onChange={(e) => {
                          setFormRolledMaxLengthMm(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            rolled_max_length_mm: undefined,
                            rolled_length: undefined,
                          }))
                        }}
                        className={`h-9 text-xs font-mono bg-white pr-9 ${
                          fieldErrors.rolled_max_length_mm
                            ? 'border-red-500 ring-1 ring-red-500'
                            : ''
                        }`}
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                        mm
                      </span>
                    </div>
                  </div>
                </div>
                {fieldErrors.rolled_length && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {fieldErrors.rolled_length}
                  </p>
                )}
              </div>

              {/* Reduções (%) Faixas */}
              <div className="pt-2 border-t border-blue-100 space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Faixa de Redução (%) — Mínima / Ideal / Máxima
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Redução Mínima (%)</Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 70,00"
                        value={formReductionMinPct}
                        data-testid="input-reduction-min-pct"
                        onChange={(e) => {
                          setFormReductionMinPct(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            reduction_min_pct: undefined,
                            reduction_order: undefined,
                          }))
                        }}
                        className="h-9 text-xs font-mono bg-white pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Redução Ideal (%)
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 80,00"
                        value={formReductionIdealPct}
                        data-testid="input-reduction-ideal-pct"
                        onChange={(e) => {
                          setFormReductionIdealPct(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            reduction_ideal_pct: undefined,
                            reduction_order: undefined,
                          }))
                        }}
                        className="h-9 text-xs font-mono bg-white font-bold text-emerald-700 pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                        %
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Redução Máxima (%)</Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 85,00"
                        value={formReductionMaxPct}
                        data-testid="input-reduction-max-pct"
                        onChange={(e) => {
                          setFormReductionMaxPct(e.target.value)
                          setFieldErrors((prev) => ({
                            ...prev,
                            reduction_max_pct: undefined,
                            reduction_order: undefined,
                          }))
                        }}
                        className="h-9 text-xs font-mono bg-white pr-7"
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                        %
                      </span>
                    </div>
                  </div>
                </div>
                {fieldErrors.reduction_order && (
                  <p className="text-[11px] text-red-600 font-medium">
                    {fieldErrors.reduction_order}
                  </p>
                )}
              </div>

              {/* Sincronismo Razão 1:X <-> Redução Percentual (%) */}
              <div className="pt-2 border-t border-blue-100 p-3 bg-white/80 rounded-md border border-blue-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#004C97] text-xs">
                    Sincronismo Bidirecional de Redução (1:X ↔ %)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Redução (%) = (1 - 1/X) × 100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Razão de Redução (1:X) — Valor de X
                    </Label>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#004C97] text-sm bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5">
                        1 :
                      </span>
                      <Input
                        placeholder="Ex: 5 ou 5,00"
                        value={formRatioX}
                        data-testid="input-reduction-ratio-x"
                        onChange={(e) => handleRatioXChange(e.target.value)}
                        className={`h-9 text-xs font-mono bg-white font-bold ${
                          fieldErrors.reduction ? 'border-red-500 ring-1 ring-red-500' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Redução Percentual Sincronizada (%)
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Ex: 80,00"
                        value={formReductionPct}
                        data-testid="input-reduction-percentage"
                        onChange={(e) => handleReductionPctChange(e.target.value)}
                        className={`h-9 text-xs font-mono bg-white font-bold text-emerald-700 pr-7 ${
                          fieldErrors.reduction ? 'border-red-500 ring-1 ring-red-500' : ''
                        }`}
                      />
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400 font-bold">
                        %
                      </span>
                    </div>
                  </div>
                </div>
                {fieldErrors.reduction && (
                  <p className="text-[11px] text-red-600 font-medium" data-testid="error-reduction">
                    {fieldErrors.reduction}
                  </p>
                )}
              </div>

              {/* Datas de Vigência (dd/mm/aaaa) */}
              <div className="pt-2 border-t border-blue-100 space-y-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#004C97]" /> Período de Vigência Técnica *
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Data de Início da Vigência * (dd/mm/aaaa)
                    </Label>
                    <Input
                      placeholder="01/01/2026"
                      value={formValidityStart}
                      data-testid="input-validity-start-date"
                      onChange={(e) => {
                        setFormValidityStart(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          validity_start_date: undefined,
                          validity: undefined,
                        }))
                      }}
                      className="h-9 text-xs font-mono bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-700 font-semibold">
                      Data de Fim da Vigência * (dd/mm/aaaa)
                    </Label>
                    <Input
                      placeholder="31/12/2026"
                      value={formValidityEnd}
                      data-testid="input-validity-end-date"
                      onChange={(e) => {
                        setFormValidityEnd(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          validity_end_date: undefined,
                          validity: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white ${
                        fieldErrors.validity_end_date || fieldErrors.validity
                          ? 'border-red-500 ring-1 ring-red-500'
                          : ''
                      }`}
                    />
                  </div>
                </div>
                {(fieldErrors.validity_end_date || fieldErrors.validity) && (
                  <p className="text-[11px] text-red-600 font-medium" data-testid="error-validity">
                    {fieldErrors.validity_end_date || fieldErrors.validity}
                  </p>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* BLOCO 4: PESOS DA MATÉRIA-PRIMA (t)                       */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#004C97]" /> 4. PESOS DA MATÉRIA-PRIMA (t)
                </span>
                <span className="text-[11px] text-slate-500">Padrão pt-BR: 1,2505 t</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Peso Mínimo (t) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Peso Mínimo (t)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 1,2000"
                      value={formMinWeightT}
                      data-testid="input-min-weight-t"
                      onChange={(e) => {
                        setFormMinWeightT(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          min_weight_t: undefined,
                          weight: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white pr-8 ${
                        fieldErrors.min_weight_t ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">t</span>
                  </div>
                  {fieldErrors.min_weight_t && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-min-weight-t"
                    >
                      {fieldErrors.min_weight_t}
                    </p>
                  )}
                </div>

                {/* Peso Médio (t) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">Peso Médio (t)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 1,2505"
                      value={formAvgWeightT}
                      data-testid="input-avg-weight-t"
                      onChange={(e) => {
                        setFormAvgWeightT(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          average_weight_t: undefined,
                          weight: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white pr-8 font-bold text-slate-900 ${
                        fieldErrors.average_weight_t ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">t</span>
                  </div>
                  {fieldErrors.average_weight_t && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-avg-weight-t"
                    >
                      {fieldErrors.average_weight_t}
                    </p>
                  )}
                </div>

                {/* Peso Máximo (t) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Peso Máximo (t)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 1,3000"
                      value={formMaxWeightT}
                      data-testid="input-max-weight-t"
                      onChange={(e) => {
                        setFormMaxWeightT(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          max_weight_t: undefined,
                          weight: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white pr-8 ${
                        fieldErrors.max_weight_t ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">t</span>
                  </div>
                  {fieldErrors.max_weight_t && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-max-weight-t"
                    >
                      {fieldErrors.max_weight_t}
                    </p>
                  )}
                </div>
              </div>
              {fieldErrors.weight && (
                <p className="text-[11px] text-red-600 font-medium" data-testid="error-weight">
                  {fieldErrors.weight}
                </p>
              )}
            </div>

            {/* ========================================================= */}
            {/* BLOCO 5: COMPRIMENTO MATÉRIA-PRIMA (mm)                   */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-[#004C97]" /> 5. COMPRIMENTO MATÉRIA-PRIMA (mm)
                </span>
                <span className="text-[11px] text-slate-500">Padrão pt-BR: 6.000 mm</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Comp. Mínimo (mm) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Comp. Mín. MP (mm)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 5.500"
                      value={formMinMpLengthMm}
                      data-testid="input-min-mp-length-mm"
                      onChange={(e) => {
                        setFormMinMpLengthMm(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          min_mp_length_mm: undefined,
                          mp_length: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white pr-9 ${
                        fieldErrors.min_mp_length_mm ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                      mm
                    </span>
                  </div>
                  {fieldErrors.min_mp_length_mm && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-min-mp-length-mm"
                    >
                      {fieldErrors.min_mp_length_mm}
                    </p>
                  )}
                </div>

                {/* Comp. Ideal (mm) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-semibold">
                    Comp. Ideal MP (mm)
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 6.000"
                      value={formIdealMpLengthMm}
                      data-testid="input-ideal-mp-length-mm"
                      onChange={(e) => {
                        setFormIdealMpLengthMm(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          ideal_mp_length_mm: undefined,
                          mp_length: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white font-bold text-slate-900 pr-9 ${
                        fieldErrors.ideal_mp_length_mm ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                      mm
                    </span>
                  </div>
                  {fieldErrors.ideal_mp_length_mm && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-ideal-mp-length-mm"
                    >
                      {fieldErrors.ideal_mp_length_mm}
                    </p>
                  )}
                </div>

                {/* Comp. Máximo (mm) */}
                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Comp. Máx. MP (mm)</Label>
                  <div className="relative">
                    <Input
                      placeholder="Ex: 6.500"
                      value={formMaxMpLengthMm}
                      data-testid="input-max-mp-length-mm"
                      onChange={(e) => {
                        setFormMaxMpLengthMm(e.target.value)
                        setFieldErrors((prev) => ({
                          ...prev,
                          max_mp_length_mm: undefined,
                          mp_length: undefined,
                        }))
                      }}
                      className={`h-9 text-xs font-mono bg-white pr-9 ${
                        fieldErrors.max_mp_length_mm ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-400">
                      mm
                    </span>
                  </div>
                  {fieldErrors.max_mp_length_mm && (
                    <p
                      className="text-[11px] text-red-600 font-medium"
                      data-testid="error-max-mp-length-mm"
                    >
                      {fieldErrors.max_mp_length_mm}
                    </p>
                  )}
                </div>
              </div>
              {fieldErrors.mp_length && (
                <p className="text-[11px] text-red-600 font-medium" data-testid="error-mp-length">
                  {fieldErrors.mp_length}
                </p>
              )}
            </div>

            {/* ========================================================= */}
            {/* BLOCO 6: CONTROLE DE SEQUENCIAMENTO & EXECUÇÃO TÉCNICA    */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3">
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
                      Identifica matéria-prima inaugural/piloto para regras de sequenciamento e
                      programação prioritária.
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

            {/* ========================================================= */}
            {/* BLOCO 7: TEMPO MÍNIMO PCP                                 */}
            {/* ========================================================= */}
            <div
              className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3"
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
                    className={`w-full bg-white border rounded text-xs text-slate-900 h-9 px-2.5 focus:ring-1 focus:ring-[#004C97] outline-none ${
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
                      className={`h-9 text-xs font-mono bg-white disabled:bg-slate-100 disabled:text-slate-400 ${
                        fieldErrors.tempo_minimo_pcp
                          ? 'border-red-500 ring-1 ring-red-500'
                          : 'border-slate-300'
                      }`}
                    />
                    {formTempoUnidade && (
                      <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-medium pointer-events-none">
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

            {/* ========================================================= */}
            {/* BLOCO 8: STATUS & OBSERVAÇÕES                             */}
            {/* ========================================================= */}
            <div className="p-3.5 bg-slate-50/90 rounded-lg border border-slate-200 space-y-3">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wider block">
                8. STATUS & OBSERVAÇÕES
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                        Inativo
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-0.5">
                    A Programação Mensal bloqueará o uso de matérias-primas com status inativo.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-700 font-medium">Observações / Notas</Label>
                  <Input
                    placeholder="Instruções técnicas, especificações de corrida ou notas operacionais"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
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
