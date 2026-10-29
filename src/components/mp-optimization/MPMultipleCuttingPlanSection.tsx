import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Scissors,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  History,
  Info,
  Scale,
  Ruler,
  Layers,
  ArrowRight,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatNumberPtBr } from '@/lib/number-format'
import { mpPieceApplicationOptimizationService } from '@/services/mp-piece-application-optimization-service'
import type {
  IndustrialApplicationCandidate,
  PieceOptimizationResult,
} from '@/types/mp-piece-application-optimization'
import {
  mpMultipleCuttingPlansService,
  MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'

export interface MPMultipleCuttingPlanSectionProps {
  initialMaterial?: {
    material_code: string
    material_description?: string
    steel_grade?: string
    center_code?: string
    line_code?: string
    batch_number?: string
    heat_number?: string
    supplier_code?: string
    supplier_name?: string
    thickness_mm?: number
    width_mm?: number
    length_mm?: number
    weight_kg?: number
  } | null
  onOpenHistory?: () => void
}

export const MPMultipleCuttingPlanSection: React.FC<MPMultipleCuttingPlanSectionProps> = ({
  initialMaterial,
  onOpenHistory,
}) => {
  const { toast } = useToast()
  const { user } = useAuth()

  // Seção A: Seleção de Material
  const [materialCode, setMaterialCode] = useState(initialMaterial?.material_code || '10000452')
  const [materialDescription, setMaterialDescription] = useState(
    initialMaterial?.material_description || 'Tarugo de Aço Laminado Redondo SAE 1020',
  )
  const [steelGrade, setSteelGrade] = useState(initialMaterial?.steel_grade || 'SAE 1020')
  const [gaugeDimension, setGaugeDimension] = useState(
    initialMaterial?.thickness_mm && initialMaterial?.width_mm
      ? `${initialMaterial.thickness_mm} × ${initialMaterial.width_mm} mm`
      : '130 × 130 mm',
  )
  const [batchNumber, setBatchNumber] = useState(initialMaterial?.batch_number || 'LT-2026-SAP')
  const [heatNumber, setHeatNumber] = useState(initialMaterial?.heat_number || 'CR-9041')
  const [supplierCode, setSupplierCode] = useState(initialMaterial?.supplier_code || 'FORN-01')
  const [supplierName, setSupplierName] = useState(
    initialMaterial?.supplier_name || 'Gerdau Aços Especiais',
  )
  const [centerCode, setCenterCode] = useState(initialMaterial?.center_code || '1020')
  const [lineCode, setLineCode] = useState(initialMaterial?.line_code || 'L1')

  // Seção B: Características do Bloco
  // Peso em toneladas (3 casas) -> convertido internamente em kg para o motor
  const [blockWeightTons, setBlockWeightTons] = useState<number>(
    initialMaterial?.weight_kg ? Number((initialMaterial.weight_kg / 1000).toFixed(3)) : 5.268,
  )
  const [thicknessMm, setThicknessMm] = useState<number>(initialMaterial?.thickness_mm || 130)
  const [widthMm, setWidthMm] = useState<number>(initialMaterial?.width_mm || 130)
  const [lengthMm, setLengthMm] = useState<number>(initialMaterial?.length_mm || 6000)
  const [linearMassKgM, setLinearMassKgM] = useState<number>(13.2)
  const [sawKerfMm, setSawKerfMm] = useState<number>(5)
  const [squaringLossMm, setSquaringLossMm] = useState<number>(10)
  const [endCropLossMm, setEndCropLossMm] = useState<number>(15)

  // Seção C: Aplicações Industriais Reais
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [candidates, setCandidates] = useState<IndustrialApplicationCandidate[]>([])
  const [selectedApps, setSelectedApps] = useState<Record<string, boolean>>({})
  const [appPriorities, setAppPriorities] = useState<Record<string, number>>({})
  const [appDesiredQty, setAppDesiredQty] = useState<Record<string, number>>({})

  // Seção D/E: Resultado da Otimização
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [optResult, setOptResult] = useState<PieceOptimizationResult | null>(null)
  const [savedPlanCode, setSavedPlanCode] = useState<string | null>(null)

  // Sincroniza se o initialMaterial mudar
  useEffect(() => {
    if (!initialMaterial) return
    if (initialMaterial.material_code) setMaterialCode(initialMaterial.material_code)
    if (initialMaterial.material_description)
      setMaterialDescription(initialMaterial.material_description)
    if (initialMaterial.steel_grade) setSteelGrade(initialMaterial.steel_grade)
    if (initialMaterial.batch_number) setBatchNumber(initialMaterial.batch_number)
    if (initialMaterial.heat_number) setHeatNumber(initialMaterial.heat_number)
    if (initialMaterial.supplier_code) setSupplierCode(initialMaterial.supplier_code)
    if (initialMaterial.supplier_name) setSupplierName(initialMaterial.supplier_name)
    if (initialMaterial.center_code) setCenterCode(initialMaterial.center_code)
    if (initialMaterial.thickness_mm) setThicknessMm(initialMaterial.thickness_mm)
    if (initialMaterial.width_mm) setWidthMm(initialMaterial.width_mm)
    if (initialMaterial.length_mm) setLengthMm(initialMaterial.length_mm)
    if (initialMaterial.weight_kg)
      setBlockWeightTons(Number((initialMaterial.weight_kg / 1000).toFixed(3)))
  }, [initialMaterial])

  // Comprimento laminado previsto calculado (m = pesoKg / massaLinear / 1000 * 1000 = pesoKg / massaLinear)
  const blockWeightKg = useMemo(() => blockWeightTons * 1000, [blockWeightTons])

  const projectedRolledLengthM = useMemo(() => {
    if (!linearMassKgM || linearMassKgM <= 0) return 0
    return blockWeightKg / linearMassKgM
  }, [blockWeightKg, linearMassKgM])

  // Carregar candidatos reais compativeis
  useEffect(() => {
    let active = true
    setIsLoadingApps(true)

    async function loadCandidates() {
      try {
        const apps = await mpPieceApplicationOptimizationService.loadCompatibleApplications({
          materialCode,
          gaugeDimension,
          centerCode,
        })
        if (!active) return
        setCandidates(apps)

        const initialSel: Record<string, boolean> = {}
        const initialPrio: Record<string, number> = {}
        const initialQty: Record<string, number> = {}

        apps.forEach((app) => {
          initialSel[app.id] = true
          initialPrio[app.id] = app.priority_order
          initialQty[app.id] = app.available_demand_qty
        })

        setSelectedApps(initialSel)
        setAppPriorities(initialPrio)
        setAppDesiredQty(initialQty)
      } catch (err) {
        console.error('Erro ao carregar aplicações de corte múltiplo:', err)
      } finally {
        if (active) setIsLoadingApps(false)
      }
    }

    loadCandidates()
    return () => {
      active = false
    }
  }, [materialCode, gaugeDimension, centerCode])

  // Botão "Otimizar Plano de Corte Múltiplo" - REUTILIZA integralmente o motor existente!
  const handleOptimize = () => {
    if (candidates.length === 0) {
      toast({
        title: 'Nenhuma aplicação industrial compatível',
        description:
          'Não foram encontradas aplicações cadastradas para o material e dimensões selecionados.',
        variant: 'destructive',
      })
      return
    }

    setIsOptimizing(true)

    try {
      const overrides: Record<string, any> = {}
      candidates.forEach((c) => {
        overrides[c.id] = {
          selected: selectedApps[c.id] ?? true,
          priority: appPriorities[c.id] ?? c.priority_order,
          desiredQty: appDesiredQty[c.id] ?? c.available_demand_qty,
        }
      })

      // Executa o motor central mpPieceApplicationOptimizationService.optimize
      const result = mpPieceApplicationOptimizationService.optimize({
        pieceIdentifier: `MULT-${materialCode}-${batchNumber || 'LT'}`,
        scenarioId: 'SCEN-MULTIPLE',
        scenarioName: 'Otimização de Corte Múltiplo',
        materialCode,
        gaugeDimension,
        centerCode,
        heatNumber,
        pieceWeightKg: blockWeightKg,
        linearMassKgM,
        sawKerfMm,
        squaringLossMm,
        endCropLossMm,
        candidates,
        userOverrides: overrides,
      })

      setOptResult(result)
      setSavedPlanCode(null)

      toast({
        title: 'Plano de Corte Múltiplo Otimizado',
        description: `Rendimento metálico: ${formatNumberPtBr(result.cutting_yield_pct, 2)}% | ${result.generated_pieces_count} peças em múltiplos.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha na Otimização',
        description: err.message || 'Erro durante a execução do motor de encaixe.',
        variant: 'destructive',
      })
    } finally {
      setIsOptimizing(false)
    }
  }

  // Salvar plano gerado
  const handleSavePlan = async () => {
    if (!optResult) return
    setIsSaving(true)
    try {
      const planCode = `PCM-${Date.now()}`
      const usableLeftoverWeightKg = (optResult.usable_leftover_mm / 1000) * linearMassKgM
      const scrapWeightKg =
        ((optResult.scrap_mm + optResult.cut_losses_length_mm) / 1000) * linearMassKgM
      const aiScore = Math.min(100, Math.round(optResult.cutting_yield_pct * 0.95 + 5))
      const aiJustification = `Motor de corte longitudinal aprovou plano com ${optResult.cutting_yield_pct.toFixed(2)}% de rendimento metálico, alocando ${optResult.generated_pieces_count} peças em múltiplos comprimentos com ${optResult.cuts_count} cortes de serra.`

      const record: MPMultipleCuttingPlanRecord = {
        plan_code: planCode,
        material_code: materialCode,
        material_description: materialDescription,
        steel_grade: steelGrade,
        batch_number: batchNumber,
        heat_number: heatNumber,
        supplier_code: supplierCode,
        supplier_name: supplierName,
        center_code: centerCode,
        line_code: lineCode,
        gauge_dimension: gaugeDimension,
        block_weight_tons: blockWeightTons,
        thickness_mm: thicknessMm,
        width_mm: widthMm,
        length_mm: lengthMm,
        linear_mass_kg_m: linearMassKgM,
        projected_rolled_length_m: projectedRolledLengthM,
        cutting_yield_pct: optResult.cutting_yield_pct,
        total_used_length_m: optResult.used_length_mm / 1000,
        leftover_length_m: optResult.usable_leftover_mm / 1000,
        leftover_weight_tons: usableLeftoverWeightKg / 1000,
        scrap_length_m: (optResult.scrap_mm + optResult.cut_losses_length_mm) / 1000,
        scrap_weight_tons: scrapWeightKg / 1000,
        pieces_count: optResult.generated_pieces_count,
        ai_score: aiScore,
        ai_technical_justification: aiJustification,
        allocated_applications_json: optResult.allocated_items,
        multiples_summary_json: {
          sawKerfMm,
          squaringLossMm,
          endCropLossMm,
          cuts_count: optResult.cuts_count,
          cut_losses_length_mm: optResult.cut_losses_length_mm,
        },
        status: 'CONFIRMADO_PCP',
        created_by_user_name: user?.name || user?.email || 'Programador PCP',
      }

      await mpMultipleCuttingPlansService.savePlan(record)
      setSavedPlanCode(planCode)

      toast({
        title: 'Plano Salvo com Sucesso',
        description: `Código do Plano: ${planCode}. Disponível no Histórico de Planos.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Plano',
        description: err.message || 'Falha de persistência no Skip Cloud.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* CABEÇALHO DO TÓPICO */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
              <Scissors className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Plano de Corte Múltiplo de Blocos & Peças
            </h2>
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
              Motor Central Unificado
            </Badge>
          </div>
          <p className="text-xs text-slate-600">
            Otimização do corte de blocos em peças de múltiplos comprimentos com base nas aplicações
            industriais cadastradas, considerando kerf, esquadrejamento e rendimento metálico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenHistory && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenHistory}
              className="text-xs font-semibold gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[#004C97]" />
              Consultar Histórico
            </Button>
          )}
          <Button
            type="button"
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isOptimizing ? 'Otimizando Corte...' : 'Otimizar Plano de Corte Múltiplo'}
          </Button>
        </div>
      </div>

      {/* GRADE DE CONFIGURAÇÃO (A + B) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* BLOCO A: SELEÇÃO DO MATERIAL (5 colunas) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Layers className="w-3.5 h-3.5 text-[#004C97]" />
            A. Identificação e Seleção do Material
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-[11px] text-slate-600">Código do Material SAP</Label>
              <Input
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                className="h-8 text-xs font-mono font-bold"
                placeholder="Ex: 10000452"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Tipo de Aço / Bitola</Label>
              <Input
                value={steelGrade}
                onChange={(e) => setSteelGrade(e.target.value)}
                className="h-8 text-xs font-mono text-[#004C97] font-bold"
                placeholder="Ex: SAE 1020"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] text-slate-600">Descrição do Material</Label>
              <Input
                value={materialDescription}
                onChange={(e) => setMaterialDescription(e.target.value)}
                className="h-8 text-xs"
                placeholder="Descrição técnica SAP"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Lote SAP</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder="Lote"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Corrida</Label>
              <Input
                value={heatNumber}
                onChange={(e) => setHeatNumber(e.target.value)}
                className="h-8 text-xs font-mono"
                placeholder="Corrida"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Fornecedor (Código/Nome)</Label>
              <Input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="h-8 text-xs"
                placeholder="Fornecedor"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Centro / Linha</Label>
              <div className="flex gap-1.5">
                <Input
                  value={centerCode}
                  onChange={(e) => setCenterCode(e.target.value)}
                  className="h-8 text-xs font-mono w-1/2"
                  placeholder="Centro"
                />
                <Input
                  value={lineCode}
                  onChange={(e) => setLineCode(e.target.value)}
                  className="h-8 text-xs font-mono w-1/2"
                  placeholder="Linha"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO B: CARACTERÍSTICAS DO BLOCO (7 colunas) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Scale className="w-3.5 h-3.5 text-[#004C97]" />
            B. Características Dimensionais do Bloco e Parâmetros de Perda
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <Label className="text-[11px] text-slate-600">Peso do Bloco (t)</Label>
              <Input
                type="number"
                step="0.001"
                value={blockWeightTons}
                onChange={(e) => setBlockWeightTons(Number(e.target.value) || 0)}
                className="h-8 text-xs font-mono font-bold text-blue-950"
              />
              <span className="text-[10px] text-slate-400">
                {formatNumberPtBr(blockWeightKg, 0)} kg
              </span>
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Espessura (mm)</Label>
              <Input
                type="number"
                value={thicknessMm}
                onChange={(e) => setThicknessMm(Number(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Largura (mm)</Label>
              <Input
                type="number"
                value={widthMm}
                onChange={(e) => setWidthMm(Number(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Comprimento Bloco (mm)</Label>
              <Input
                type="number"
                value={lengthMm}
                onChange={(e) => setLengthMm(Number(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">
                {formatNumberPtBr(lengthMm / 1000, 2)} m
              </span>
            </div>
            <div>
              <Label className="text-[11px] text-slate-600">Massa Linear (kg/m)</Label>
              <Input
                type="number"
                step="0.1"
                value={linearMassKgM}
                onChange={(e) => setLinearMassKgM(Number(e.target.value) || 0)}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="bg-blue-50/70 p-2 rounded-md border border-blue-100 flex flex-col justify-center">
              <span className="text-[10px] text-blue-900 font-semibold uppercase">
                Comprimento Laminado Previsto
              </span>
              <span className="text-sm font-black font-mono text-[#004C97]">
                {formatNumberPtBr(projectedRolledLengthM, 2)} m
              </span>
            </div>
          </div>

          {/* Parâmetros técnicos de perdas */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs bg-slate-50/60 p-2 rounded-lg">
            <div>
              <Label className="text-[10px] text-slate-500 font-semibold">Largura Serra (mm)</Label>
              <Input
                type="number"
                value={sawKerfMm}
                onChange={(e) => setSawKerfMm(Number(e.target.value) || 0)}
                className="h-7 text-xs font-mono mt-0.5 bg-white"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500 font-semibold">
                Esquadrejamento (mm)
              </Label>
              <Input
                type="number"
                value={squaringLossMm}
                onChange={(e) => setSquaringLossMm(Number(e.target.value) || 0)}
                className="h-7 text-xs font-mono mt-0.5 bg-white"
              />
            </div>
            <div>
              <Label className="text-[10px] text-slate-500 font-semibold">Desponta (mm)</Label>
              <Input
                type="number"
                value={endCropLossMm}
                onChange={(e) => setEndCropLossMm(Number(e.target.value) || 0)}
                className="h-7 text-xs font-mono mt-0.5 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO C: APLICAÇÕES INDUSTRIAIS CADASTRADAS (Grade de compatibilidade) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-[#004C97]" />
              C. Aplicações Industriais Compatíveis (Comprimentos Finais & Múltiplos)
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              {candidates.length} candidatas
            </Badge>
          </div>
          <span className="text-[11px] text-slate-500">
            Aplicações cadastradas recuperadas da base de conhecimento da CIAFAL
          </span>
        </div>

        {isLoadingApps ? (
          <div className="p-6 text-center text-xs text-slate-500 font-mono">
            Carregando aplicações industriais compatíveis...
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Nenhuma aplicação compatível encontrada para o material {materialCode}.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[300px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sticky top-0">
                <tr>
                  <th className="p-2.5 w-12 text-center">Incluir</th>
                  <th className="p-2.5">Cód. Aplicação</th>
                  <th className="p-2.5">Descrição</th>
                  <th className="p-2.5">Produto</th>
                  <th className="p-2.5">Comp. Final (m)</th>
                  <th className="p-2.5">Tolerância (mm)</th>
                  <th className="p-2.5">Qtd. Necessária</th>
                  <th className="p-2.5">Prioridade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((cand) => {
                  const isChecked = selectedApps[cand.id] ?? true
                  return (
                    <tr
                      key={cand.id}
                      className={`hover:bg-slate-50 ${!isChecked ? 'opacity-50' : ''}`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedApps((prev) => ({
                              ...prev,
                              [cand.id]: e.target.checked,
                            }))
                          }
                          className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {cand.application_code}
                      </td>
                      <td className="p-2.5">{cand.application_name}</td>
                      <td className="p-2.5 font-mono text-slate-700">{cand.product_code}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-800">
                        {formatNumberPtBr(cand.target_length_mm / 1000, 2)} m
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        &plusmn;{cand.tolerance_mm || 10} mm
                      </td>
                      <td className="p-2.5 font-mono">
                        <Input
                          type="number"
                          value={appDesiredQty[cand.id] ?? cand.available_demand_qty}
                          onChange={(e) =>
                            setAppDesiredQty((prev) => ({
                              ...prev,
                              [cand.id]: Number(e.target.value) || 0,
                            }))
                          }
                          className="h-6 w-20 text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5 font-mono">
                        <Input
                          type="number"
                          value={appPriorities[cand.id] ?? cand.priority_order}
                          onChange={(e) =>
                            setAppPriorities((prev) => ({
                              ...prev,
                              [cand.id]: Number(e.target.value) || 1,
                            }))
                          }
                          className="h-6 w-16 text-xs font-mono"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BLOCO E: RESULTADO DA OTIMIZAÇÃO (Se calculado) */}
      {optResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  E. Resultado: Plano de Corte Longitudinal Otimizado
                </h3>
                <p className="text-xs text-slate-600">
                  Combinação de múltiplos maximizando aproveitamento metálico e minimizando sobras.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOptimize}
                className="text-xs font-semibold gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                Recalcular
              </Button>
              <Button
                type="button"
                onClick={handleSavePlan}
                disabled={isSaving}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {savedPlanCode ? 'Plano Salvo (Atualizar)' : 'Salvar Plano de Corte Múltiplo'}
              </Button>
            </div>
          </div>

          {/* Cards de Indicadores do Resultado */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-900 font-bold uppercase">
                Rendimento Metálico
              </span>
              <div className="text-lg font-black font-mono text-emerald-950 mt-1">
                {formatNumberPtBr(optResult.cutting_yield_pct, 2)}%
              </div>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200">
              <span className="text-[10px] text-blue-900 font-bold uppercase">
                Peças em Múltiplos
              </span>
              <div className="text-lg font-black font-mono text-blue-950 mt-1">
                {optResult.generated_pieces_count} un
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-600 font-bold uppercase">
                Comprimento Aproveitado
              </span>
              <div className="text-base font-black font-mono text-slate-900 mt-1">
                {formatNumberPtBr(optResult.used_length_mm / 1000, 2)} m
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-600 font-bold uppercase">
                Sobra Reutilizável
              </span>
              <div className="text-base font-black font-mono text-slate-900 mt-1">
                {formatNumberPtBr(optResult.usable_leftover_mm / 1000, 2)} m
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {formatNumberPtBr(
                  ((optResult.usable_leftover_mm / 1000) * linearMassKgM) / 1000,
                  3,
                )}{' '}
                t
              </span>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] text-amber-900 font-bold uppercase">
                Perdas Totais (Kerf/Refile)
              </span>
              <div className="text-base font-black font-mono text-amber-950 mt-1">
                {formatNumberPtBr((optResult.scrap_mm + optResult.cut_losses_length_mm) / 1000, 2)}{' '}
                m
              </div>
              <span className="text-[10px] text-amber-800 font-mono">
                {formatNumberPtBr(
                  (((optResult.scrap_mm + optResult.cut_losses_length_mm) / 1000) * linearMassKgM) /
                    1000,
                  3,
                )}{' '}
                t
              </span>
            </div>

            <div className="bg-blue-900 text-white p-3 rounded-xl shadow-xs">
              <span className="text-[10px] text-blue-200 font-bold uppercase">Score da IA</span>
              <div className="text-lg font-black font-mono mt-1">
                {Math.min(100, Math.round(optResult.cutting_yield_pct * 0.95 + 5))} / 100
              </div>
              <span className="text-[10px] text-blue-200">Aprovado pelo motor</span>
            </div>
          </div>

          {/* Justificativa Técnica da IA */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#004C97]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Justificativa Técnica do Motor Heurístico de Corte Múltiplo:</span>
            </div>
            <p className="text-slate-700 leading-relaxed font-sans text-[11px]">
              Motor heurístico unificado CIAFAL combinou os múltiplos das aplicações de prioridade
              mais alta, alcançando rendimento metálico de{' '}
              <strong>{formatNumberPtBr(optResult.cutting_yield_pct, 2)}%</strong> e gerando{' '}
              <strong>{optResult.generated_pieces_count} peças</strong> com{' '}
              <strong>{optResult.cuts_count} cortes de serra</strong> com espessura de kerf{' '}
              {sawKerfMm} mm.
            </p>
          </div>

          {/* Tabela dos múltiplos alocados */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Detalhamento dos Múltiplos e Peças Produzidas
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left font-mono">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Sequência</th>
                    <th className="p-2.5">Aplicação</th>
                    <th className="p-2.5">Comprimento Unitário (m)</th>
                    <th className="p-2.5">Qtd. Produzida</th>
                    <th className="p-2.5">Comprimento Total (m)</th>
                    <th className="p-2.5">Peso Calculado (t)</th>
                    <th className="p-2.5">Prioridade Atendida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {optResult.allocated_items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900"># {idx + 1}</td>
                      <td className="p-2.5 text-[#004C97] font-bold">
                        {item.application_code} &bull; {item.application_name}
                      </td>
                      <td className="p-2.5">{formatNumberPtBr(item.length_mm / 1000, 2)} m</td>
                      <td className="p-2.5 font-bold text-emerald-800">{item.quantity} peças</td>
                      <td className="p-2.5">{formatNumberPtBr(item.used_length_mm / 1000, 2)} m</td>
                      <td className="p-2.5 font-bold">
                        {formatNumberPtBr(item.estimated_weight_kg / 1000, 3)} t
                      </td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]"
                        >
                          Prio {item.priority}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
