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
} from 'lucide-react'
import type {
  MPCuttingWeightStandard,
  MPCuttingOptimizationFilters,
  MPOptimizationCriterion,
} from '@/types/mp-cutting-weight-standards'

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
