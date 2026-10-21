import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { parsePtBrNumber } from '@/lib/number-format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Filter,
  Play,
  RotateCcw,
  Scale,
  Settings2,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  Flame,
  Binary,
  Layers,
  Check,
  X,
  Info,
} from 'lucide-react'
import type {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
  MPOptimizationCriterion,
} from '@/types/mp-cutting-weight-standards'
import {
  pcpMultipleSelectionService,
  type AvailableHeatInfo,
  type AvailableMultipleItem,
} from '@/services/pcp-multiple-selection-service'

interface MPCuttingOptimizationFilterBarProps {
  filters: MPCuttingOptimizationFilters
  standards: MPCuttingWeightStandard[]
  onFiltersChange: (newFilters: MPCuttingOptimizationFilters) => void
  onGenerateScenarios: () => void
  onOpenStandardsModal: () => void
  isGenerating?: boolean
}

export const MPCuttingOptimizationFilterBar: React.FC<MPCuttingOptimizationFilterBarProps> = ({
  filters,
  standards,
  onFiltersChange,
  onGenerateScenarios,
  onOpenStandardsModal,
  isGenerating = false,
}) => {
  const [allowManualAdjust, setAllowManualAdjust] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Estados de Corrida e Múltiplos
  const [availableHeats, setAvailableHeats] = useState<AvailableHeatInfo[]>([])
  const [availableMultiples, setAvailableMultiples] = useState<AvailableMultipleItem[]>([])
  const [isLoadingHeats, setIsLoadingHeats] = useState(false)
  const [isLoadingMultiples, setIsLoadingMultiples] = useState(false)
  const [heatSearchText, setHeatSearchText] = useState('')
  const [multipleSearchText, setMultipleSearchText] = useState('')
  const [clearedMultiplesNotice, setClearedMultiplesNotice] = useState<string | null>(null)

  const companies = ['CIAFAL']
  const centers = [
    { code: 'SEML1', name: 'SEML1 — Laminação Geral L1' },
    { code: 'PNCL1', name: 'PNCL1 — Prensa e Corte L1' },
    { code: 'PNCL2', name: 'PNCL2 — Prensa e Corte L2' },
    { code: 'OXIFERKS', name: 'OXIFERKS — Oxicorte CIAFAL' },
    { code: 'PNCSDC', name: 'PNCSDC — Corte Sidercentro' },
    { code: 'ACAB_L2', name: 'ACAB_L2 — Acabamento L2' },
  ]

  const materials = [
    { code: 'TARUGO-130-1020', name: 'Tarugo 130x130 SAE 1020' },
    { code: 'TARUGO-150-1045', name: 'Tarugo 150x150 SAE 1045' },
    { code: 'TARUGO-160-5160', name: 'Tarugo 160x160 SAE 5160' },
    { code: 'PLACA-200-A36', name: 'Placa Laminada 200 mm ASTM A36' },
    { code: 'BARRA-RED-75-1020', name: 'Barra Redonda 75 mm SAE 1020' },
  ]

  const criteriaOptions: Array<{ value: MPOptimizationCriterion; label: string }> = [
    { value: 'MAIOR_APROVEITAMENTO', label: '1. Maior Aproveitamento de MP (Rendimento)' },
    { value: 'MENOR_SUCATA', label: '2. Menor Geração de Sucata / Pontas' },
    { value: 'MAIOR_ATENDIMENTO_PADROES', label: '3. Maior Atendimento aos Pesos Padrões' },
    { value: 'MENOR_QUANTIDADE_CORTES', label: '4. Menor Quantidade de Cortes (Produtividade)' },
    { value: 'MELHOR_EQUILIBRIO', label: '5. Melhor Equilíbrio (Rendimento x Demanda)' },
  ]

  // Carregar corridas quando material ou centro mudarem e cutting_type === 'BLOCOS'
  useEffect(() => {
    let isMounted = true
    if (filters.cutting_type === 'BLOCOS') {
      setIsLoadingHeats(true)
      pcpMultipleSelectionService
        .getAvailableHeats(filters.material_code, filters.center_code)
        .then((heats) => {
          if (!isMounted) return
          setAvailableHeats(heats)
          // Se a corrida atual não existe mais nas disponíveis, limpa
          if (
            filters.selected_heat_number &&
            !heats.some((h) => h.heat_number === filters.selected_heat_number)
          ) {
            onFiltersChange({
              ...filters,
              selected_heat_number: undefined,
              selected_multiple_numbers: [],
            })
            setClearedMultiplesNotice('Corrida incompatível desmarcada após alteração de filtro.')
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingHeats(false)
        })
    } else {
      setAvailableHeats([])
      setAvailableMultiples([])
    }
    return () => {
      isMounted = false
    }
  }, [filters.material_code, filters.center_code, filters.cutting_type])

  // Carregar múltiplos quando a corrida selecionada mudar
  useEffect(() => {
    let isMounted = true
    if (filters.cutting_type === 'BLOCOS' && filters.selected_heat_number) {
      setIsLoadingMultiples(true)
      pcpMultipleSelectionService
        .getMultiplesByHeat(
          filters.material_code,
          filters.center_code,
          filters.selected_heat_number,
        )
        .then((mults) => {
          if (!isMounted) return
          setAvailableMultiples(mults)
          // Limpa seleções incompatíveis de múltiplos que não pertencem a essa nova corrida
          const currentSelected = filters.selected_multiple_numbers || []
          const validSelected = currentSelected.filter((sel) =>
            mults.some((m) => m.multiple_number === sel),
          )
          if (validSelected.length !== currentSelected.length) {
            onFiltersChange({
              ...filters,
              selected_multiple_numbers: validSelected,
            })
            setClearedMultiplesNotice(
              'Múltiplos incompatíveis com a nova corrida foram removidos da seleção.',
            )
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingMultiples(false)
        })
    } else {
      setAvailableMultiples([])
    }
    return () => {
      isMounted = false
    }
  }, [
    filters.selected_heat_number,
    filters.material_code,
    filters.center_code,
    filters.cutting_type,
  ])

  // Handler de troca de corrida: limpa múltiplos incompatíveis com aviso
  const handleSelectHeat = (heat: string) => {
    if (filters.selected_heat_number === heat) {
      // Desmarcar corrida
      onFiltersChange({
        ...filters,
        selected_heat_number: undefined,
        selected_multiple_numbers: [],
      })
      setClearedMultiplesNotice(null)
    } else {
      const prevMultiplesCount = (filters.selected_multiple_numbers || []).length
      onFiltersChange({
        ...filters,
        selected_heat_number: heat,
        selected_multiple_numbers: [],
      })
      if (prevMultiplesCount > 0) {
        setClearedMultiplesNotice(
          `Corrida alterada para [${heat}]. Múltiplos anteriores foram redefinidos.`,
        )
      } else {
        setClearedMultiplesNotice(null)
      }
    }
  }

  // Handler de seleção de múltiplos (toggle sem duplicados)
  const handleToggleMultiple = (multipleNumber: string) => {
    const current = filters.selected_multiple_numbers || []
    let updated: string[]
    if (current.includes(multipleNumber)) {
      updated = current.filter((m) => m !== multipleNumber)
    } else {
      updated = Array.from(new Set([...current, multipleNumber]))
    }
    onFiltersChange({
      ...filters,
      selected_multiple_numbers: updated,
    })
  }

  // Selecionar todos / limpar múltiplos
  const handleSelectAllMultiples = () => {
    const allNums = Array.from(new Set(availableMultiples.map((m) => m.multiple_number)))
    onFiltersChange({
      ...filters,
      selected_multiple_numbers: allNums,
    })
  }

  const handleClearAllMultiples = () => {
    onFiltersChange({
      ...filters,
      selected_multiple_numbers: [],
    })
  }

  // Múltiplos selecionados atualmente com seus dados completos
  const selectedMultiplesItems = availableMultiples.filter((m) =>
    (filters.selected_multiple_numbers || []).includes(m.multiple_number),
  )

  // Padrões ativos elegíveis (apenas ATIVO e com dados válidos, nunca PENDENTE_CORRECAO ou INATIVO)
  const activeStandards = standards.filter((s) => s.status === 'ATIVO')

  // Estados locais para digitação em pt-BR (evitando formatação forçada que bloqueia a vírgula)
  const [targetInput, setTargetInput] = useState<string>('')
  const [minInput, setMinInput] = useState<string>('')
  const [maxInput, setMaxInput] = useState<string>('')

  // Sincronizar inputs locais quando os filtros externos mudarem (ex: ao selecionar outro padrão)
  useEffect(() => {
    if (
      filters.target_weight_kg != null &&
      !isNaN(filters.target_weight_kg) &&
      filters.target_weight_kg > 0
    ) {
      setTargetInput(
        (filters.target_weight_kg / 1000).toLocaleString('pt-BR', {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }),
      )
    } else {
      setTargetInput('')
    }

    if (
      filters.min_weight_kg != null &&
      !isNaN(filters.min_weight_kg) &&
      filters.min_weight_kg > 0
    ) {
      setMinInput(
        (filters.min_weight_kg / 1000).toLocaleString('pt-BR', {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }),
      )
    } else {
      setMinInput('')
    }

    if (
      filters.max_weight_kg != null &&
      !isNaN(filters.max_weight_kg) &&
      filters.max_weight_kg > 0
    ) {
      setMaxInput(
        (filters.max_weight_kg / 1000).toLocaleString('pt-BR', {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        }),
      )
    } else {
      setMaxInput('')
    }
  }, [filters.target_weight_kg, filters.min_weight_kg, filters.max_weight_kg])

  // Ao selecionar um padrão, preencher automaticamente seus parâmetros
  const handleSelectStandard = (standardCode: string) => {
    const isAlreadySelected = (filters.selected_standard_codes || []).includes(standardCode)
    let newSelected: string[] = []

    if (isAlreadySelected) {
      newSelected = (filters.selected_standard_codes || []).filter((c) => c !== standardCode)
    } else {
      newSelected = [...(filters.selected_standard_codes || []), standardCode]
    }

    const selectedStd = standards.find((s) => s.code === standardCode)
    if (selectedStd && !isAlreadySelected) {
      // Preencher automaticamente parâmetros do padrão selecionado
      onFiltersChange({
        ...filters,
        selected_standard_codes: newSelected,
        target_weight_kg: selectedStd.target_weight_kg,
        min_weight_kg: selectedStd.min_weight_kg,
        max_weight_kg: selectedStd.max_weight_kg,
        steel_family: selectedStd.steel_family || filters.steel_family,
        manual_adjustment_active: false,
      })
    } else {
      onFiltersChange({
        ...filters,
        selected_standard_codes: newSelected,
      })
    }
  }

  const handleManualTargetChange = (val: number) => {
    if (!allowManualAdjust) return
    onFiltersChange({
      ...filters,
      target_weight_kg: val,
      manual_adjustment_active: true,
      manual_adjustment_notes: 'Ajuste manual de peso ideal autorizado pelo usuário',
    })
  }

  return (
    <Card className="border border-slate-200 bg-white shadow-sm mb-6">
      <CardContent className="p-4 space-y-4">
        {/* Cabeçalho de Controle e Botão Cadastrar Padrões */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-900 text-white shadow-sm">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                Parâmetros de Otimização de Corte
                <Badge variant="outline" className="text-[11px] bg-slate-100 text-slate-700">
                  Motor Industrial v4.0
                </Badge>
              </h3>
              <p className="text-xs text-slate-500">
                Configure os filtros de engenharia e selecione os padrões de peso cadastrados para
                geração dos 6 cenários comparativos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenStandardsModal}
              className="border-blue-900 text-blue-900 hover:bg-blue-50 gap-1.5 text-xs font-semibold shadow-sm"
            >
              <Scale className="w-3.5 h-3.5" /> Cadastrar Padrões de Peso
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onGenerateScenarios}
              disabled={isGenerating}
              className="bg-blue-900 hover:bg-blue-950 text-white gap-2 font-semibold shadow-sm text-xs"
            >
              <Play className="w-3.5 h-3.5" />{' '}
              {isGenerating ? 'Calculando Cenários...' : 'Gerar 6 Cenários'}
            </Button>
          </div>
        </div>

        {/* Linha 1: Empresa, Centro, Tipo de Corte, Material, Família */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Empresa</Label>
            <select
              value={filters.company_code}
              onChange={(e) => onFiltersChange({ ...filters, company_code: e.target.value })}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm"
            >
              {companies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Centro Produtivo *</Label>
            <select
              value={filters.center_code}
              onChange={(e) => onFiltersChange({ ...filters, center_code: e.target.value })}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm font-medium"
            >
              {centers.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Tipo de Corte *</Label>
            <select
              value={filters.cutting_type}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  cutting_type: e.target.value as any,
                })
              }
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm font-medium"
            >
              <option value="BLOCOS">Blocos</option>
              <option value="MULTIPLOS">Múltiplos</option>
              <option value="AMBOS">Ambos (Blocos e Múltiplos)</option>
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Material / MP *</Label>
            <select
              value={filters.material_code}
              onChange={(e) => onFiltersChange({ ...filters, material_code: e.target.value })}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs shadow-sm font-medium"
            >
              {materials.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Família / Aço</Label>
            <Input
              value={filters.steel_family || ''}
              onChange={(e) => onFiltersChange({ ...filters, steel_family: e.target.value })}
              placeholder="Ex: SAE 1020"
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>

        {/* Bloco Condicional: Seleção de Corrida e Múltiplos (Exclusivo para Tipo de Corte = BLOCOS) */}
        {filters.cutting_type === 'BLOCOS' && (
          <div className="bg-slate-50/90 border border-blue-200/80 rounded-lg p-3.5 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-600" />
                <Label className="text-xs font-bold text-blue-950">
                  Seleção de Corrida e Número do Múltiplo (Individualização de Blocos)
                </Label>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-50 text-blue-800 border-blue-200"
                >
                  Rastreabilidade Físico-Dimensional
                </Badge>
              </div>

              {/* Indicação de modo agregado vs individualizado */}
              {!filters.selected_multiple_numbers ||
              filters.selected_multiple_numbers.length === 0 ? (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Cálculo não individualizado por múltiplo (modo agregado mantido)
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {filters.selected_multiple_numbers.length} múltiplo(s) individualizado(s)
                </span>
              )}
            </div>

            {/* Aviso de limpeza de seleções incompatíveis */}
            {clearedMultiplesNotice && (
              <div className="flex items-center justify-between text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  {clearedMultiplesNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setClearedMultiplesNotice(null)}
                  className="text-amber-900 hover:text-amber-950 font-bold ml-2"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seletor 1: Corrida (Filtrada por material e centro) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>1. Corrida Disponível</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({availableHeats.length} encontrada{availableHeats.length === 1 ? '' : 's'})
                    </span>
                  </Label>
                  {filters.selected_heat_number && (
                    <button
                      type="button"
                      onClick={() => handleSelectHeat(filters.selected_heat_number!)}
                      className="text-[10px] text-blue-800 hover:underline font-medium"
                    >
                      Limpar Corrida
                    </button>
                  )}
                </div>

                <Input
                  type="text"
                  placeholder="Pesquisar número da corrida..."
                  value={heatSearchText}
                  onChange={(e) => setHeatSearchText(e.target.value)}
                  className="h-7 text-xs bg-white"
                />

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded bg-white p-1 space-y-1">
                  {isLoadingHeats ? (
                    <div className="text-[11px] text-slate-500 p-2 text-center">
                      Consultando estoque dimensional no banco...
                    </div>
                  ) : availableHeats.length === 0 ? (
                    <div className="text-[11px] text-slate-500 p-3 text-center space-y-1">
                      <div className="font-semibold text-slate-600">
                        Nenhuma corrida disponível para este material e centro.
                      </div>
                      <div className="text-[10px] text-slate-400">
                        O cálculo seguirá em modo agregado padrão sem individualização de corrida.
                      </div>
                    </div>
                  ) : (
                    availableHeats
                      .filter((h) =>
                        h.heat_number.toLowerCase().includes(heatSearchText.toLowerCase()),
                      )
                      .map((h) => {
                        const isSelected = filters.selected_heat_number === h.heat_number
                        return (
                          <button
                            key={h.heat_number}
                            type="button"
                            onClick={() => handleSelectHeat(h.heat_number)}
                            className={`w-full text-left p-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-900 text-white font-bold shadow-xs'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-mono">
                              <Flame
                                className={`w-3.5 h-3.5 ${
                                  isSelected ? 'text-orange-300' : 'text-orange-600'
                                }`}
                              />
                              <span>Corrida {h.heat_number}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className={isSelected ? 'text-blue-100' : 'text-slate-500'}>
                                {h.items_count} un &bull;{' '}
                                {(h.total_weight_kg / 1000).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{' '}
                                t
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 ${
                                  isSelected
                                    ? 'bg-blue-800 text-white border-blue-700'
                                    : h.origin === 'SAP'
                                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                                      : 'bg-amber-50 text-amber-900 border-amber-200'
                                }`}
                              >
                                {h.origin === 'SAP' ? 'SAP' : 'Homologação'}
                              </Badge>
                            </div>
                          </button>
                        )
                      })
                  )}
                </div>
              </div>

              {/* Seletor 2: Número do Múltiplo (Múltipla escolha sem duplicado) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Binary className="w-3.5 h-3.5 text-blue-800" />
                    <span>2. Número do Múltiplo / Bloco</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      ({availableMultiples.length} disponível
                      {availableMultiples.length === 1 ? '' : 'is'})
                    </span>
                  </Label>
                  {availableMultiples.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={handleSelectAllMultiples}
                        className="text-blue-800 hover:underline font-semibold"
                      >
                        Todos
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleClearAllMultiples}
                        className="text-slate-600 hover:underline"
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>

                <Input
                  type="text"
                  placeholder="Pesquisar número do múltiplo..."
                  disabled={!filters.selected_heat_number}
                  value={multipleSearchText}
                  onChange={(e) => setMultipleSearchText(e.target.value)}
                  className="h-7 text-xs bg-white"
                />

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded bg-white p-1 space-y-1">
                  {!filters.selected_heat_number ? (
                    <div className="text-[11px] text-slate-400 p-3 text-center">
                      Selecione uma Corrida ao lado para listar os múltiplos rastreáveis.
                    </div>
                  ) : isLoadingMultiples ? (
                    <div className="text-[11px] text-slate-500 p-2 text-center">
                      Carregando múltiplos da corrida {filters.selected_heat_number}...
                    </div>
                  ) : availableMultiples.length === 0 ? (
                    <div className="text-[11px] text-slate-500 p-3 text-center space-y-1">
                      <div className="font-semibold text-slate-600">
                        Nenhum múltiplo cadastrado para esta corrida.
                      </div>
                      <div className="text-[10px] text-slate-400">
                        O cálculo utilizará o padrão nominal da Ficha Mestra.
                      </div>
                    </div>
                  ) : (
                    availableMultiples
                      .filter((m) =>
                        m.multiple_number.toLowerCase().includes(multipleSearchText.toLowerCase()),
                      )
                      .map((m) => {
                        const isSelected = (filters.selected_multiple_numbers || []).includes(
                          m.multiple_number,
                        )
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMultiple(m.multiple_number)}
                            className={`w-full text-left p-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-900 text-white font-bold shadow-xs'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-mono">
                              <span
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                                  isSelected
                                    ? 'bg-white text-blue-900 border-white font-black'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isSelected ? '✓' : ''}
                              </span>
                              <span>Múltiplo {m.multiple_number}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className={isSelected ? 'text-blue-100' : 'text-slate-600'}>
                                {m.section_mm} mm &bull; {m.piece_length_mm.toLocaleString('pt-BR')}{' '}
                                mm &bull;{' '}
                                {(m.unit_weight_kg / 1000).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })}{' '}
                                t
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[9px] px-1 py-0 ${
                                  isSelected
                                    ? 'bg-blue-800 text-white border-blue-700'
                                    : m.origin === 'SAP'
                                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                                      : 'bg-amber-50 text-amber-900 border-amber-200'
                                }`}
                              >
                                {m.origin === 'SAP' ? 'SAP' : 'Homologação'}
                              </Badge>
                            </div>
                          </button>
                        )
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Painel Informativo Dimensional dos Múltiplos Selecionados */}
            {selectedMultiplesItems.length > 0 && (
              <div className="bg-white border border-blue-200 rounded-md p-2.5 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-blue-950 flex items-center gap-1 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-blue-800" />
                    Características Dimensionais dos Múltiplos Selecionados (
                    {selectedMultiplesItems.length})
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedMultiplesItems.some((m) => m.origin !== 'SAP') && (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-900 border-amber-300 text-[10px] font-semibold"
                      >
                        Dados de homologação
                      </Badge>
                    )}
                    <span className="text-[11px] font-mono text-slate-600">
                      Peso Total:{' '}
                      <strong className="text-blue-950">
                        {(
                          selectedMultiplesItems.reduce((acc, m) => acc + m.unit_weight_kg, 0) /
                          1000
                        ).toLocaleString('pt-BR', {
                          minimumFractionDigits: 3,
                          maximumFractionDigits: 3,
                        })}{' '}
                        t
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {selectedMultiplesItems.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded border border-slate-200 bg-slate-50/60 font-mono text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-bold text-blue-950">
                        <span>Múltiplo {m.multiple_number}</span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          Lote: {m.batch_code}
                        </span>
                      </div>
                      <div className="text-slate-700">
                        Seção: <strong>{m.section_mm} mm</strong> &bull; Comp:{' '}
                        <strong>{m.piece_length_mm.toLocaleString('pt-BR')} mm</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 text-[10px]">
                        <span>
                          Peso real:{' '}
                          <strong className="text-emerald-800">
                            {(m.unit_weight_kg / 1000).toLocaleString('pt-BR', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}{' '}
                            t
                          </strong>{' '}
                          ({m.unit_weight_kg.toLocaleString('pt-BR')} kg)
                        </span>
                        {m.origin !== 'SAP' && (
                          <span className="text-amber-700 font-sans font-semibold">
                            Homologação
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Linha 2: Padrões de Peso Cadastrados (Seleção MÚLTIPLA) */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-blue-800" />
              Padrões de Peso Cadastrados (Seleção Múltipla)
            </Label>
            <span className="text-[11px] text-slate-500">
              {filters.selected_standard_codes.length} padrão(ões) selecionado(s)
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {activeStandards.length === 0 ? (
              <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Nenhum padrão cadastrado ainda. Clique em "Cadastrar Padrões de Peso" acima para
                criar os padrões nominais.
              </div>
            ) : (
              activeStandards.map((std) => {
                const isSelected = filters.selected_standard_codes.includes(std.code)
                return (
                  <button
                    key={std.code}
                    type="button"
                    onClick={() => handleSelectStandard(std.code)}
                    className={`text-xs px-3 py-1.5 rounded-md border font-medium flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-950 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-mono font-bold">{std.code}</span>
                    <span>{std.description}</span>
                    <span className="opacity-90 font-mono text-[11px]">
                      (
                      {(std.target_weight_kg / 1000).toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      t)
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Linha 3: Peso Ideal, Faixas de Tolerância, Quantidade/Tonelagem e Critério de Otimização */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Peso Ideal com Trava de Ajuste Manual (em toneladas) */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Peso Ideal Desejado (t)
              </Label>
              <button
                type="button"
                onClick={() => setAllowManualAdjust(!allowManualAdjust)}
                className="text-[11px] text-blue-800 hover:underline flex items-center gap-1 font-medium"
                title="Ajuste manual somente com permissão do usuário"
              >
                {allowManualAdjust ? (
                  <>
                    <Unlock className="w-3 h-3 text-amber-600" /> Manual
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-400" /> Travado
                  </>
                )}
              </button>
            </div>
            <div className="relative mt-1">
              <Input
                type="text"
                inputMode="decimal"
                disabled={!allowManualAdjust}
                value={targetInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setTargetInput(raw)
                  const valTon = parsePtBrNumber(raw)
                  if (!isNaN(valTon) && valTon > 0) {
                    handleManualTargetChange(valTon * 1000)
                  }
                }}
                placeholder="Ex: 1,250"
                className={`h-8 text-xs font-bold ${
                  allowManualAdjust
                    ? 'bg-amber-50/60 border-amber-300 text-amber-950'
                    : 'bg-slate-100 text-slate-700'
                }`}
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-semibold">
                t
              </span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Peso Mínimo Permitido (t)
            </Label>
            <div className="relative mt-1">
              <Input
                type="text"
                inputMode="decimal"
                disabled={!allowManualAdjust}
                value={minInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setMinInput(raw)
                  const valTon = parsePtBrNumber(raw)
                  if (!isNaN(valTon) && valTon > 0) {
                    onFiltersChange({
                      ...filters,
                      min_weight_kg: valTon * 1000,
                      manual_adjustment_active: true,
                    })
                  }
                }}
                placeholder="Ex: 1,200"
                className={`h-8 text-xs ${
                  allowManualAdjust ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-100'
                }`}
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-semibold">
                t
              </span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Peso Máximo Permitido (t)
            </Label>
            <div className="relative mt-1">
              <Input
                type="text"
                inputMode="decimal"
                disabled={!allowManualAdjust}
                value={maxInput}
                onChange={(e) => {
                  const raw = e.target.value
                  setMaxInput(raw)
                  const valTon = parsePtBrNumber(raw)
                  if (!isNaN(valTon) && valTon > 0) {
                    onFiltersChange({
                      ...filters,
                      max_weight_kg: valTon * 1000,
                      manual_adjustment_active: true,
                    })
                  }
                }}
                placeholder="Ex: 1,300"
                className={`h-8 text-xs ${
                  allowManualAdjust ? 'bg-amber-50/60 border-amber-300' : 'bg-slate-100'
                }`}
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-semibold">
                t
              </span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Demanda (Toneladas / Qtd)
            </Label>
            <div className="flex gap-1.5 mt-1">
              <Input
                type="number"
                step="0.1"
                value={filters.required_weight_tons ?? ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    required_weight_tons: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="Ex: 30"
                className="h-8 text-xs font-medium"
              />
              <span className="flex items-center text-xs font-bold text-slate-500 px-1">t</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">
              Critério Principal de Otimização *
            </Label>
            <select
              value={filters.optimization_criterion}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  optimization_criterion: e.target.value as MPOptimizationCriterion,
                })
              }
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs shadow-sm font-semibold text-blue-950"
            >
              {criteriaOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filters.manual_adjustment_active && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 flex items-center justify-between">
            <span>
              <strong>Atenção:</strong> Parâmetros foram ajustados manualmente para esta simulação.
              O cadastro original do padrão não foi alterado.
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const std = standards.find((s) => s.code === filters.selected_standard_codes[0])
                if (std) {
                  onFiltersChange({
                    ...filters,
                    target_weight_kg: std.target_weight_kg,
                    min_weight_kg: std.min_weight_kg,
                    max_weight_kg: std.max_weight_kg,
                    manual_adjustment_active: false,
                  })
                }
              }}
              className="h-5 text-[10px] text-amber-900 underline"
            >
              Restaurar Padrão
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
