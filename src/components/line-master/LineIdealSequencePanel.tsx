import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ListOrdered,
  Plus,
  Edit3,
  Power,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  HelpCircle,
  Database,
  Layers,
  Clock,
  ShieldCheck,
  Building2,
  History,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { IdealGaugeSequenceItem } from '@/types/weekly-schedule'
import { ProductFamily, ProductionLine } from '@/types/line-master'
import { lineIdealSequenceService } from '@/services/line-ideal-sequence-service'

interface LineIdealSequencePanelProps {
  line: ProductionLine
  productFamilies?: ProductFamily[]
  onRefreshParent?: () => void
}

type FilterStatus = 'ACTIVE' | 'INACTIVE' | 'ALL'

export const LineIdealSequencePanel: React.FC<LineIdealSequencePanelProps> = ({
  line,
  productFamilies = [],
  onRefreshParent,
}) => {
  const { toast } = useToast()

  // Estados principais
  const [sequences, setSequences] = useState<IdealGaugeSequenceItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ACTIVE')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('ALL')

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<IdealGaugeSequenceItem | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  // Inativação com confirmação
  const [inactivatingItem, setInactivatingItem] = useState<IdealGaugeSequenceItem | null>(null)
  const [inactivating, setInactivating] = useState<boolean>(false)

  // Ativação rápida
  const [activatingId, setActivatingId] = useState<string | null>(null)

  // Estado do Formulário
  const [formData, setFormData] = useState({
    family_order: 1,
    family_name: '',
    family_code: '',
    family_id: '',
    subsequence_order: 1,
    gauge_dimension: '',
    material_code: '',
    material_description: '',
    cycle_time_avg_min: 30,
    cycle_time_tolerance_pct: 10,
    stock_coverage_max_days: 30,
    is_active: true,
    homologation_status: 'HOMOLOGADA' as 'HOMOLOGADA' | 'NAO_HOMOLOGADA',
    notes: '',
    sap_work_center: '',
  })

  // Carregar sequências do backend
  const loadSequences = useCallback(async () => {
    setLoading(true)
    try {
      const data = await lineIdealSequenceService.listByLine(line.code, 'ALL')
      setSequences(data)
    } catch (err) {
      console.error('Erro ao carregar sequências:', err)
      toast({
        variant: 'destructive',
        title: 'Sequência Ideal',
        description: 'Não foi possível carregar a sequência ideal. Tente novamente.',
      })
    } finally {
      setLoading(false)
    }
  }, [line.code, toast])

  useEffect(() => {
    loadSequences()
  }, [loadSequences])

  // Filtragem
  const filteredSequences = useMemo(() => {
    return sequences.filter((item) => {
      // Filtro Status Operacional
      if (statusFilter === 'ACTIVE' && item.is_active === false) return false
      if (statusFilter === 'INACTIVE' && item.is_active !== false) return false

      // Filtro por Família
      if (
        selectedFamilyFilter !== 'ALL' &&
        item.family_code !== selectedFamilyFilter &&
        item.family_name !== selectedFamilyFilter
      ) {
        return false
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchMat = (item.material_code || '').toLowerCase().includes(query)
        const matchDesc = (item.material_description || '').toLowerCase().includes(query)
        const matchGauge = (item.gauge_dimension || '').toLowerCase().includes(query)
        const matchFamily = (item.family_name || '').toLowerCase().includes(query)
        return matchMat || matchDesc || matchGauge || matchFamily
      }

      return true
    })
  }, [sequences, statusFilter, selectedFamilyFilter, searchTerm])

  // Contadores
  const countActive = useMemo(
    () => sequences.filter((s) => s.is_active !== false).length,
    [sequences],
  )
  const countInactive = useMemo(
    () => sequences.filter((s) => s.is_active === false).length,
    [sequences],
  )

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      family_order:
        sequences.length > 0 ? Math.max(...sequences.map((s) => s.family_order || 1)) : 1,
      family_name: productFamilies[0]?.name || 'Tubo Quadrado',
      family_code: productFamilies[0]?.code || 'TUB_QUAD',
      family_id: productFamilies[0]?.id || '',
      subsequence_order: 1,
      gauge_dimension: '',
      material_code: '',
      material_description: '',
      cycle_time_avg_min: 30,
      cycle_time_tolerance_pct: 10,
      stock_coverage_max_days: 30,
      is_active: true,
      homologation_status: 'HOMOLOGADA',
      notes: '',
      sap_work_center: line.sap_work_center || '',
    })
    setIsFormModalOpen(true)
  }

  // Abrir Modal de Edição (mantém o mesmo ID)
  const handleOpenEdit = (item: IdealGaugeSequenceItem) => {
    setEditingItem(item)
    setFormData({
      family_order: item.family_order,
      family_name: item.family_name || '',
      family_code: item.family_code || '',
      family_id: item.family_id || '',
      subsequence_order: item.subsequence_order,
      gauge_dimension: item.gauge_dimension || '',
      material_code: item.material_code || '',
      material_description: item.material_description || '',
      cycle_time_avg_min: item.cycle_time_avg_min,
      cycle_time_tolerance_pct: item.cycle_time_tolerance_pct,
      stock_coverage_max_days: item.stock_coverage_max_days,
      is_active: item.is_active !== false,
      homologation_status: item.homologation_status || 'HOMOLOGADA',
      notes: item.notes || '',
      sap_work_center: item.sap_work_center || line.sap_work_center || '',
    })
    setIsFormModalOpen(true)
  }

  // Submissão do Formulário (Criar ou Editar)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações básicas
    if (!formData.gauge_dimension.trim()) {
      toast({
        variant: 'destructive',
        title: 'Sequência Ideal',
        description: 'Informe a Bitola / Dimensão SAP.',
      })
      return
    }
    if (!formData.material_code.trim()) {
      toast({
        variant: 'destructive',
        title: 'Sequência Ideal',
        description: 'Informe o código do Material SAP.',
      })
      return
    }

    setSaving(true)
    const context = {
      lineName: line.name,
      companyCode: 'CIAFAL',
      centerCode: line.sap_plant_code || line.code,
    }

    try {
      if (editingItem) {
        // EDIÇÃO: mesmo ID garantido
        await lineIdealSequenceService.update(
          editingItem.id,
          {
            line_code: line.code,
            line_id: line.id,
            family_order: Number(formData.family_order),
            family_name: formData.family_name,
            family_code: formData.family_code,
            family_id: formData.family_id,
            subsequence_order: Number(formData.subsequence_order),
            gauge_dimension: formData.gauge_dimension,
            material_code: formData.material_code,
            material_description: formData.material_description,
            cycle_time_avg_min: Number(formData.cycle_time_avg_min),
            cycle_time_tolerance_pct: Number(formData.cycle_time_tolerance_pct),
            stock_coverage_max_days: Number(formData.stock_coverage_max_days),
            is_active: formData.is_active,
            homologation_status: formData.homologation_status,
            notes: formData.notes,
            sap_work_center: formData.sap_work_center,
          },
          context,
        )

        toast({
          title: 'Sequência Ideal',
          description: 'Sequência atualizada com sucesso.',
        })
      } else {
        // CRIAÇÃO
        await lineIdealSequenceService.create(
          {
            line_code: line.code,
            line_id: line.id,
            family_order: Number(formData.family_order),
            family_name: formData.family_name,
            family_code: formData.family_code,
            family_id: formData.family_id,
            subsequence_order: Number(formData.subsequence_order),
            gauge_dimension: formData.gauge_dimension,
            material_code: formData.material_code,
            material_description: formData.material_description,
            cycle_time_avg_min: Number(formData.cycle_time_avg_min),
            cycle_time_tolerance_pct: Number(formData.cycle_time_tolerance_pct),
            stock_coverage_max_days: Number(formData.stock_coverage_max_days),
            is_active: formData.is_active,
            homologation_status: formData.homologation_status,
            notes: formData.notes,
            sap_work_center: formData.sap_work_center,
          },
          context,
        )

        toast({
          title: 'Sequência Ideal',
          description: 'Sequência cadastrada com sucesso.',
        })
      }

      setIsFormModalOpen(false)
      await loadSequences()
      if (onRefreshParent) onRefreshParent()
    } catch (err) {
      console.error('Erro ao salvar sequência:', err)
      toast({
        variant: 'destructive',
        title: 'Sequência Ideal',
        description:
          'Não foi possível atualizar a sequência. Verifique os dados e tente novamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Executar Inativação com confirmação
  const handleConfirmInactivate = async () => {
    if (!inactivatingItem) return
    setInactivating(true)
    const context = {
      lineName: line.name,
      companyCode: 'CIAFAL',
      centerCode: line.sap_plant_code || line.code,
    }

    try {
      await lineIdealSequenceService.toggleActive(inactivatingItem.id, false, context)
      toast({
        title: 'Sequência Ideal',
        description: 'Sequência inativada com sucesso. Histórico preservado.',
      })
      setInactivatingItem(null)
      await loadSequences()
      if (onRefreshParent) onRefreshParent()
    } catch (err) {
      console.error('Erro ao inativar sequência:', err)
      toast({
        variant: 'destructive',
        title: 'Sequência Ideal',
        description:
          'Não foi possível atualizar a sequência. Verifique os dados e tente novamente.',
      })
    } finally {
      setInactivating(false)
    }
  }

  // Reativar Sequência
  const handleActivate = async (item: IdealGaugeSequenceItem) => {
    setActivatingId(item.id)
    const context = {
      lineName: line.name,
      companyCode: 'CIAFAL',
      centerCode: line.sap_plant_code || line.code,
    }

    try {
      await lineIdealSequenceService.toggleActive(item.id, true, context)
      toast({
        title: 'Sequência Ideal',
        description: 'Sequência reativada com sucesso para novas programações.',
      })
      await loadSequences()
      if (onRefreshParent) onRefreshParent()
    } catch (err) {
      console.error('Erro ao ativar sequência:', err)
      toast({
        variant: 'destructive',
        title: 'Sequência Ideal',
        description:
          'Não foi possível atualizar a sequência. Verifique os dados e tente novamente.',
      })
    } finally {
      setActivatingId(null)
    }
  }

  return (
    <div id="section-ideal-gauge-sequence" className="space-y-4">
      {/* Card Principal */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        {/* Top bar identitária CIAFAL */}
        <div className="h-1.5 bg-[#004C97] w-full" />

        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-[#004C97] rounded-md border border-blue-100">
                  <ListOrdered className="w-5 h-5 text-[#004C97]" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900 tracking-tight">
                  Sequência Ideal
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold bg-blue-50 text-[#004C97] border-blue-200"
                >
                  Linha {line.code} &bull; Parâmetros Operacionais & SAP
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Ordem padrão de laminação/conformação por famílias de bitola, tolerâncias de ciclo e
                cobertura de estoque máxima. Controla a ordem ótima do motor de sequenciamento.
              </p>
            </div>

            {/* Botão + Adicionar Sequência visível sem rolagem horizontal com identidade CIAFAL */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handleOpenCreate}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-9 px-4 shadow-sm gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> + Adicionar Sequência
              </Button>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Busca textual */}
            <div className="relative md:col-span-5">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por bitola, material SAP ou família..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-300 text-xs text-slate-900 h-8 placeholder:text-slate-400 focus:bg-white"
              />
            </div>

            {/* Filtro por Família */}
            <div className="md:col-span-3">
              <select
                value={selectedFamilyFilter}
                onChange={(e) => setSelectedFamilyFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2.5 h-8 font-medium focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              >
                <option value="ALL">Todas as Famílias</option>
                {Array.from(new Set(sequences.map((s) => s.family_name).filter(Boolean))).map(
                  (fam) => (
                    <option key={fam} value={fam}>
                      {fam}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Filtro Status: Ativos (padrão) / Inativos / Todos */}
            <div className="md:col-span-4 flex items-center justify-end gap-2">
              <div className="flex rounded-md border border-slate-300 p-0.5 bg-slate-50 text-[11px] font-semibold w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`flex-1 md:flex-initial py-1 px-3 rounded text-center transition-all ${
                    statusFilter === 'ACTIVE'
                      ? 'bg-[#004C97] text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ● Ativos ({countActive})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`flex-1 md:flex-initial py-1 px-3 rounded text-center transition-all ${
                    statusFilter === 'INACTIVE'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ○ Inativos ({countInactive})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`flex-1 md:flex-initial py-1 px-3 rounded text-center transition-all ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({sequences.length})
                </button>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadSequences}
                      disabled={loading}
                      className="h-8 px-2 text-slate-600 hover:text-[#004C97] border-slate-300"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Recarregar do banco</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && sequences.length === 0 ? (
            <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
              <span className="text-xs font-medium">Carregando Sequência Ideal do banco...</span>
            </div>
          ) : filteredSequences.length === 0 ? (
            <div className="p-10 text-center space-y-2 border-t border-slate-100">
              <ListOrdered className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">
                Nenhuma sequência encontrada para o filtro atual.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter === 'INACTIVE'
                  ? 'Não há sequências inativas arquivadas nesta linha.'
                  : 'Nenhuma sequência ideal cadastrada ou correspondente aos termos de busca.'}
              </p>
              {statusFilter !== 'ALL' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setSearchTerm('')
                    setSelectedFamilyFilter('ALL')
                  }}
                  className="text-xs mt-2 text-[#004C97] border-blue-200 hover:bg-blue-50"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-700 font-semibold border-y border-slate-200">
                    <th className="py-2.5 px-3 w-16 text-center">Ordem</th>
                    <th className="py-2.5 px-3">Família</th>
                    <th className="py-2.5 px-3 w-16 text-center">Subseq.</th>
                    <th className="py-2.5 px-3">Bitola / Dimensão SAP</th>
                    <th className="py-2.5 px-3">Material SAP</th>
                    <th className="py-2.5 px-3 text-right">Ciclo Médio SAP</th>
                    <th className="py-2.5 px-3 text-center">Tolerância</th>
                    <th className="py-2.5 px-3 text-right">Cob. Máxima</th>
                    <th className="py-2.5 px-3 text-center">Homologação</th>
                    <th className="py-2.5 px-3 text-center">Status Operacional</th>
                    <th className="py-2.5 px-3 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredSequences.map((seq) => {
                    const isActive = seq.is_active !== false
                    const isHomologated = seq.homologation_status === 'HOMOLOGADA'

                    return (
                      <tr
                        key={seq.id}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          !isActive ? 'bg-slate-50/60 text-slate-500' : ''
                        }`}
                      >
                        {/* Ordem da Família */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                              isActive
                                ? 'bg-blue-100 text-[#004C97]'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            #{seq.family_order}
                          </span>
                        </td>

                        {/* Família */}
                        <td className="py-2.5 px-3 font-medium">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{seq.family_name}</span>
                            {seq.family_code && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                {seq.family_code}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Subsequência */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                          {seq.subsequence_order}
                        </td>

                        {/* Bitola / Dimensão SAP */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {seq.gauge_dimension}
                        </td>

                        {/* Material SAP */}
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span className="text-[#004C97] font-bold block">
                            {seq.material_code}
                          </span>
                          {seq.material_description && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {seq.material_description}
                            </span>
                          )}
                        </td>

                        {/* Ciclo Médio SAP */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {seq.cycle_time_avg_min} min
                        </td>

                        {/* Tolerância de Ciclo */}
                        <td className="py-2.5 px-3 text-center font-mono">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-50 border-slate-200 text-slate-700 font-mono"
                          >
                            &plusmn;{seq.cycle_time_tolerance_pct}%
                          </Badge>
                        </td>

                        {/* Cobertura Máxima */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {seq.stock_coverage_max_days} dias
                        </td>

                        {/* Status de Homologação (Preservado e Desacoplado) */}
                        <td className="py-2.5 px-3 text-center">
                          {isHomologated ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                            >
                              Homologada
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 font-bold"
                            >
                              Não Homologada
                            </Badge>
                          )}
                        </td>

                        {/* Status Operacional (Ativo / Inativo) */}
                        <td className="py-2.5 px-3 text-center">
                          {isActive ? (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 font-bold">
                              ● Ativo
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-slate-100 text-slate-600 border-slate-300 font-bold"
                            >
                              ○ Inativo
                            </Badge>
                          )}
                        </td>

                        {/* Coluna Ações */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEdit(seq)}
                                    className="h-7 px-2 text-slate-700 hover:text-[#004C97] hover:bg-blue-50 font-semibold"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Editar
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Editar parâmetros desta sequência</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {/* Dropdown de Ações Complementares */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs w-44">
                                <DropdownMenuItem onClick={() => handleOpenEdit(seq)}>
                                  <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-600" />
                                  Editar Cadastro
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                {isActive ? (
                                  <DropdownMenuItem
                                    onClick={() => setInactivatingItem(seq)}
                                    className="text-amber-700 hover:text-amber-800 focus:text-amber-800"
                                  >
                                    <Power className="w-3.5 h-3.5 mr-2" />
                                    Inativar Sequência
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleActivate(seq)}
                                    disabled={activatingId === seq.id}
                                    className="text-emerald-700 hover:text-emerald-800 focus:text-emerald-800"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                    Ativar Sequência
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Rodapé Informativo CIAFAL */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Regra Operacional:</span>
            <span>
              Itens <strong>Ativos</strong> são utilizados nos algoritmos de sequenciamento e
              sugestão de campanhas. Itens <strong>Inativos</strong> têm histórico preservado na
              auditoria.
            </span>
          </div>
          <div className="font-mono text-slate-600 font-medium">
            Total Exibido: {filteredSequences.length} de {sequences.length} sequências
          </div>
        </div>
      </Card>

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR / EDITAR SEQUÊNCIA IDEAL                 */}
      {/* ======================================================== */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#004C97] text-white rounded-md">
                <ListOrdered className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingItem ? 'Editar Sequência Ideal' : 'Nova Sequência Ideal'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {editingItem
                ? `Editando sequência ID ${editingItem.id} da Linha ${line.code}. O ID permanece o mesmo.`
                : `Cadastre uma nova regra de sequência operacional para a Linha ${line.code}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveForm} className="space-y-4 py-2 text-xs">
            {/* Bloco 1: Linha & Família */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">Linha de Produção</Label>
                <Input
                  value={`${line.code} - ${line.name}`}
                  disabled
                  className="bg-slate-100 font-mono text-xs text-slate-600 h-8"
                />
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Ordem da Família <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.family_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      family_order: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Subsequência <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.subsequence_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subsequence_order: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Família <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Ex: Tubo Quadrado, Tubo Retangular, Perfil U"
                  value={formData.family_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, family_name: e.target.value }))
                  }
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Código da Família SAP
                </Label>
                <Input
                  placeholder="Ex: TUB_QUAD, TUB_RET, PERF_U"
                  value={formData.family_code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, family_code: e.target.value }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Bloco 2: Bitola e Material SAP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Bitola / Dimensão SAP <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Ex: 40x40 mm #1.50, 50x50 mm #2.00"
                  value={formData.gauge_dimension}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, gauge_dimension: e.target.value }))
                  }
                  required
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Material SAP <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="Ex: TQ-GALV-40x40, PU-150x50x4.75"
                  value={formData.material_code}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, material_code: e.target.value }))
                  }
                  required
                  className="h-8 text-xs font-mono font-bold text-[#004C97]"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Descrição do Material SAP
                </Label>
                <Input
                  placeholder="Ex: TUBO PRE-GALV Z275 40X40X1,50MM"
                  value={formData.material_description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, material_description: e.target.value }))
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Bloco 3: Tempos, Tolerâncias e Cobertura */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Ciclo Médio SAP (min) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.cycle_time_avg_min}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cycle_time_avg_min: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                  className="h-8 text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Tempo nominal de processamento
                </span>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Tolerância de Ciclo (%) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.cycle_time_tolerance_pct}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      cycle_time_tolerance_pct: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Variação aceitável sem desvio
                </span>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Cobertura Máxima (dias) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.stock_coverage_max_days}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      stock_coverage_max_days: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  required
                  className="h-8 text-xs font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Limite de estoque do produto
                </span>
              </div>
            </div>

            {/* Bloco 4: Status Operacional e Homologação (Desacoplados) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100 bg-slate-50/60 p-3 rounded-lg border border-slate-200">
              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Status Operacional
                </Label>
                <select
                  value={formData.is_active ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.value === 'ACTIVE',
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded px-2.5 h-8 text-xs font-semibold text-slate-800"
                >
                  <option value="ACTIVE">● ATIVO (Utilizado no sequenciamento)</option>
                  <option value="INACTIVE">○ INATIVO (Preservado no histórico)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Define se o motor de programação deve considerar esta bitola na fila.
                </span>
              </div>

              <div>
                <Label className="text-slate-700 font-semibold mb-1 block">
                  Status de Homologação
                </Label>
                <select
                  value={formData.homologation_status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      homologation_status: e.target.value as 'HOMOLOGADA' | 'NAO_HOMOLOGADA',
                    }))
                  }
                  className="w-full bg-white border border-slate-300 rounded px-2.5 h-8 text-xs font-semibold text-slate-800"
                >
                  <option value="HOMOLOGADA">HOMOLOGADA (Engenharia / Qualidade)</option>
                  <option value="NAO_HOMOLOGADA">NÃO HOMOLOGADA (Em testes/validação)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Classificação técnica de engenharia independente do status de uso.
                </span>
              </div>
            </div>

            {/* Observações / Notas */}
            <div>
              <Label className="text-slate-700 font-semibold mb-1 block">
                Observações Operacionais / Centro de Trabalho SAP
              </Label>
              <Input
                placeholder="Ex: Restrições de ferramentais, cilindros dedicados, notas de calibração..."
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormModalOpen(false)}
                disabled={saving}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 px-4"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Salvando...
                  </>
                ) : editingItem ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Sequência'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAÇÃO DE INATIVAÇÃO DE SEQUÊNCIA              */}
      {/* Texto exato obrigatório pelo usuário                      */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(inactivatingItem)}
        onOpenChange={(open) => {
          if (!open) setInactivatingItem(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 text-amber-700 rounded-md">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Inativar Sequência Ideal
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs space-y-3">
            <p className="text-slate-700 leading-relaxed font-medium">
              Tem certeza que deseja inativar esta sequência? Ela deixará de ser utilizada em novas
              programações, mas seu histórico será preservado.
            </p>

            {inactivatingItem && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Bitola: </span>
                  <strong className="text-slate-900">{inactivatingItem.gauge_dimension}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Material SAP: </span>
                  <strong className="text-[#004C97]">{inactivatingItem.material_code}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Família: </span>
                  <span className="text-slate-800">{inactivatingItem.family_name}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInactivatingItem(null)}
              disabled={inactivating}
              className="h-8 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmInactivate}
              disabled={inactivating}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-4"
            >
              {inactivating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Inativando...
                </>
              ) : (
                'Inativar sequência'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
