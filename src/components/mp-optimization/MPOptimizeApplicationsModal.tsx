/**
 * Popup "Otimização de Aplicações por Peça"
 * HUB CIAFAL - PCP Robotizado - Gestão de MP
 *
 * Funcionalidades completas:
 * - Cabeçalho técnico detalhado: Centro, Material, Bitola, Corrida, Identificação do Bloco,
 *   Peso calculado, Comprimento laminado, Massa linear, Largura de corte da serra.
 * - Tabela interativa: Aplicação | Produto | Comprimento (mm) | Quantidade | Prioridade | Comprimento Utilizado (mm)
 * - Interações reais: selecionar/desmarcar, prioridades, quantidades desejadas, simulação, comparação.
 * - Gráfico longitudinal proporcional com tooltips ricos (nome, código, comp, peso, peça, posição de corte).
 * - 8 Cards de Indicadores consistentes com a tabela e gráfico:
 *   1. Comprimento laminado total (mm)
 *   2. Comprimento aproveitado (mm)
 *   3. Quantidade de peças geradas
 *   4. Quantidade de aplicações atendidas
 *   5. Comprimento perdido nos cortes (mm)
 *   6. Sobra aproveitável (mm)
 *   7. Refugo (mm)
 *   8. Rendimento do corte (%)
 * - Persistência em mp_cutting_piece_applications e auditoria imutável via pcpAuditService.
 * - ErrorBoundary local e null-guards defensivos.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import {
  Sparkles,
  Scissors,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Info,
  Scale,
  Ruler,
  Layers,
  Factory,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import {
  IndustrialApplicationCandidate,
  PieceOptimizationResult,
  SavedPieceApplicationRecord,
} from '@/types/mp-piece-application-optimization'
import { mpPieceApplicationOptimizationService } from '@/services/mp-piece-application-optimization-service'
import { formatNumberPtBr } from '@/lib/number-format'
import { useToast } from '@/hooks/use-toast'

export interface MPOptimizeApplicationsModalProps {
  isOpen: boolean
  onClose: () => void
  pieceIdentifier: string
  scenarioId: string
  scenarioName?: string
  materialCode: string
  gaugeDimension?: string
  centerCode?: string
  heatNumber?: string
  pieceWeightKg: number
  linearMassKgM: number
  cuttingWidthMm?: number
  onConfirmOptimization: (result: PieceOptimizationResult) => void
}

export const MPOptimizeApplicationsModal: React.FC<MPOptimizeApplicationsModalProps> = ({
  isOpen,
  onClose,
  pieceIdentifier,
  scenarioId,
  scenarioName,
  materialCode,
  gaugeDimension,
  centerCode,
  heatNumber,
  pieceWeightKg,
  linearMassKgM,
  cuttingWidthMm = 5,
  onConfirmOptimization,
}) => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [candidates, setCandidates] = useState<IndustrialApplicationCandidate[]>([])
  const [selectedApps, setSelectedApps] = useState<Record<string, boolean>>({})
  const [appPriorities, setAppPriorities] = useState<Record<string, number>>({})
  const [appDesiredQty, setAppDesiredQty] = useState<Record<string, number>>({})

  // Parâmetros de corte ajustáveis pelo usuário
  const [sawKerfMm, setSawKerfMm] = useState<number>(cuttingWidthMm || 5)
  const [squaringLossMm, setSquaringLossMm] = useState<number>(10)
  const [endCropLossMm, setEndCropLossMm] = useState<number>(15)

  // Resultado da simulação
  const [optResult, setOptResult] = useState<PieceOptimizationResult | null>(null)
  const [savedRecord, setSavedRecord] = useState<SavedPieceApplicationRecord | null>(null)

  // Carregar candidatos reais e plano prévio ao abrir
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setLoading(true)

    async function loadData() {
      try {
        const [apps, priorPlan] = await Promise.all([
          mpPieceApplicationOptimizationService.loadCompatibleApplications({
            materialCode,
            gaugeDimension,
            centerCode,
          }),
          mpPieceApplicationOptimizationService.loadSavedPlan(pieceIdentifier, scenarioId),
        ])

        if (!isMounted) return

        setCandidates(apps)
        setSavedRecord(priorPlan)

        // Inicializar estados de seleção e prioridades
        const initialSelected: Record<string, boolean> = {}
        const initialPrio: Record<string, number> = {}
        const initialQty: Record<string, number> = {}

        apps.forEach((app) => {
          initialSelected[app.id] = true
          initialPrio[app.id] = app.priority_order
          initialQty[app.id] = app.available_demand_qty
        })

        // Se houver plano salvo anterior, restaurar seleção e perdas
        if (priorPlan) {
          if (priorPlan.saw_kerf_mm !== undefined) setSawKerfMm(priorPlan.saw_kerf_mm)
          if (priorPlan.squaring_loss_mm !== undefined)
            setSquaringLossMm(priorPlan.squaring_loss_mm)
          if (priorPlan.end_crop_loss_mm !== undefined) setEndCropLossMm(priorPlan.end_crop_loss_mm)

          const allocatedIds = new Set(priorPlan.allocated_items_json.map((i) => i.application_id))
          apps.forEach((app) => {
            initialSelected[app.id] = allocatedIds.has(app.id)
            const alloc = priorPlan.allocated_items_json.find((i) => i.application_id === app.id)
            if (alloc) {
              initialPrio[app.id] = alloc.priority
            }
          })
        }

        setSelectedApps(initialSelected)
        setAppPriorities(initialPrio)
        setAppDesiredQty(initialQty)

        // Executar simulação inicial
        const initialResult = mpPieceApplicationOptimizationService.optimize({
          pieceIdentifier,
          scenarioId,
          scenarioName,
          materialCode,
          gaugeDimension,
          centerCode,
          heatNumber,
          pieceWeightKg,
          linearMassKgM,
          sawKerfMm: priorPlan?.saw_kerf_mm ?? cuttingWidthMm ?? 5,
          squaringLossMm: priorPlan?.squaring_loss_mm ?? 10,
          endCropLossMm: priorPlan?.end_crop_loss_mm ?? 15,
          candidates: apps,
          userOverrides: apps.reduce(
            (acc, a) => {
              acc[a.id] = {
                selected: initialSelected[a.id],
                priority: initialPrio[a.id],
                desiredQty: initialQty[a.id],
              }
              return acc
            },
            {} as Record<string, any>,
          ),
        })

        setOptResult(initialResult)
      } catch (err) {
        console.error('Erro ao carregar dados de otimização:', err)
        toast({
          title: 'Aviso de Carregamento',
          description: 'Não foi possível carregar todas as aplicações reais. Verifique cadastros.',
          variant: 'destructive',
        })
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [
    isOpen,
    pieceIdentifier,
    scenarioId,
    scenarioName,
    materialCode,
    gaugeDimension,
    centerCode,
    heatNumber,
    pieceWeightKg,
    linearMassKgM,
    cuttingWidthMm,
  ])

  // Recalcular simulação
  const handleRecalculate = () => {
    if (candidates.length === 0) return

    const overrides: Record<string, any> = {}
    candidates.forEach((c) => {
      overrides[c.id] = {
        selected: selectedApps[c.id] ?? true,
        priority: appPriorities[c.id] ?? c.priority_order,
        desiredQty: appDesiredQty[c.id] ?? c.available_demand_qty,
      }
    })

    const result = mpPieceApplicationOptimizationService.optimize({
      pieceIdentifier,
      scenarioId,
      scenarioName,
      materialCode,
      gaugeDimension,
      centerCode,
      heatNumber,
      pieceWeightKg,
      linearMassKgM,
      sawKerfMm,
      squaringLossMm,
      endCropLossMm,
      candidates,
      userOverrides: overrides,
    })

    setOptResult(result)
  }

  // Confirmar e Salvar Otimização
  const handleConfirm = async () => {
    if (!optResult || !optResult.is_viable) {
      toast({
        title: 'Plano Inviável',
        description: optResult?.inviability_reason || 'O plano atual não é viável para gravação.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const saved = await mpPieceApplicationOptimizationService.savePieceApplicationPlan(
        optResult,
        'Programador PCP Ciafal',
      )
      setSavedRecord(saved)
      onConfirmOptimization(optResult)
      toast({
        title: 'Otimização Salva com Sucesso',
        description: `Rendimento de corte: ${optResult.cutting_yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}% em ${optResult.generated_pieces_count} peças geradas.`,
      })
      onClose()
    } catch (e: any) {
      toast({
        title: 'Erro ao Salvar Otimização',
        description: e?.message || 'Falha ao persistir dados no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Helpers padronizados de exibição (Regras A, B, C, D e E do Usuário):
  // 1. PESO -> TONELADAS com EXATAMENTE 3 casas decimais ("5,268 t", "1,600 t", "59,200 t")
  const formatTons = (kgVal?: number) => {
    if (kgVal === undefined || kgVal === null || isNaN(kgVal)) return '-'
    const tons = kgVal / 1000
    return `${formatNumberPtBr(tons, 3)} t`
  }

  // 2. COMPRIMENTO LAMINADO e COMPRIMENTO FINAL DA PEÇA -> METROS com EXATAMENTE 2 casas ("9,46 m", "6,00 m")
  const formatMeters = (mmVal?: number) => {
    if (mmVal === undefined || mmVal === null || isNaN(mmVal)) return '0,00 m'
    const meters = mmVal / 1000
    return `${formatNumberPtBr(meters, 2)} m`
  }

  // 3. DIMENSÕES DOS BLOCOS e PARÂMETROS TÉCNICOS -> MILÍMETROS ("130 × 130 × 12.156 mm", "5 mm", "10 mm")
  const formatMm = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0 mm'
    return `${Math.round(val).toLocaleString('pt-BR')} mm`
  }

  // 4. MASSA LINEAR -> kg/m ("132,5 kg/m")
  const formatLinearMass = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,0 kg/m'
    return `${formatNumberPtBr(val, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kg/m`
  }

  // 5. RENDIMENTO (%)
  const formatPct = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '0,00%'
    return `${formatNumberPtBr(val, 2)}%`
  }

  // Comprimento Laminado Calculado
  const totalRolledLengthMm = useMemo(() => {
    return mpPieceApplicationOptimizationService.calculateRolledLengthMm(
      pieceWeightKg,
      linearMassKgM,
    )
  }, [pieceWeightKg, linearMassKgM])

  // Normalização de Dimensões do Bloco para mm com formato pt-BR (ex. "130 × 130 mm")
  const blockDimensionsFormatted = useMemo(() => {
    if (!gaugeDimension) return '130 × 130 mm'
    // Limpeza de formatações legadas (ex: 130x130 mm -> 130 × 130 mm)
    return gaugeDimension.replace(/x/gi, ' × ').trim()
  }, [gaugeDimension])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="mp-optimize-applications-modal-content"
        className="w-[95vw] max-w-[1400px] h-[94vh] max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50 text-slate-900 shadow-2xl border border-slate-300 rounded-xl"
      >
        <ErrorBoundary
          fallback={
            <div className="p-6 text-red-600 bg-white m-4 rounded-lg border border-red-200">
              <h3 className="font-bold text-sm">
                Erro no painel de otimização de aplicações por peça.
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Por favor, feche e abra novamente a janela de otimização.
              </p>
            </div>
          }
        >
          {/* CABEÇALHO FIXO (Título; Identificação da peça; Subtítulo; Botão de fechar) */}
          <DialogHeader className="shrink-0 p-3.5 sm:p-4 bg-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800 gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-blue-700/60 rounded-md shrink-0">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-sm sm:text-base font-bold tracking-tight text-white truncate">
                    Otimização de Aplicações por Peça
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className="bg-blue-950 text-blue-200 border-blue-700 font-mono text-[11px] shrink-0"
                  >
                    {pieceIdentifier}
                  </Badge>
                  {savedRecord && (
                    <Badge
                      variant="outline"
                      className="bg-emerald-950/80 text-emerald-300 border-emerald-600 text-[11px] shrink-0 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Plano Salvo
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                  HUB Industrial Ciafal → Gestão de MP → Planos de Corte → Máximo Rendimento de MP
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 shrink-0 rounded-full"
              title="Fechar janela"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Fechar</span>
            </Button>
          </DialogHeader>

          {/* CONTEÚDO COM ROLAGEM VERTICAL EXCLUSIVA */}
          <div
            data-testid="mp-optimize-modal-scrollable-body"
            className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-5 space-y-4 min-h-0 bg-slate-50"
          >
            {/* 1. SEÇÃO DE INDICADORES TÉCNICOS & PARÂMETROS TÉCNICOS DE CORTE */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Factory className="w-4 h-4 text-blue-900 shrink-0" />
                  Indicadores Técnicos & Parâmetros de Corte
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>Dimensões dos Blocos:</span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {blockDimensionsFormatted}
                  </span>
                </div>
              </div>

              {/* Grade flexível e responsiva: 1 col (mobile), 2-3 cols (tablet), 6 cols (desktop) sem sobreposição */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {/* 1. Peso da Peça (Padronizado em Toneladas com 3 casas) */}
                <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 flex flex-col justify-between">
                  <span className="text-blue-900 block text-[11px] font-semibold">
                    Peso da Peça (t)
                  </span>
                  <span className="font-bold text-blue-950 font-mono flex items-center gap-1.5 mt-1 text-sm sm:text-base">
                    <Scale className="w-4 h-4 text-blue-800 shrink-0" />
                    <span>{formatTons(pieceWeightKg)}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Precisão interna: {formatNumberPtBr(pieceWeightKg, 2)} kg
                  </span>
                </div>

                {/* 2. Massa Linear (kg/m) */}
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-600 block text-[11px] font-semibold">
                    Massa Linear
                  </span>
                  <span className="font-bold text-slate-900 font-mono flex items-center gap-1.5 mt-1 text-sm">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{formatLinearMass(linearMassKgM)}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">kg/m da seção</span>
                </div>

                {/* 3. Comprimento Laminado (Padronizado em Metros com 2 casas) */}
                <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 flex flex-col justify-between">
                  <span className="text-emerald-900 block text-[11px] font-semibold">
                    Comprimento Laminado (m)
                  </span>
                  <span className="font-bold text-emerald-900 font-mono flex items-center gap-1.5 mt-1 text-sm sm:text-base">
                    <Ruler className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{formatMeters(totalRolledLengthMm)}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {formatMm(totalRolledLengthMm)}
                  </span>
                </div>

                {/* 4. Largura de Corte da Serra (mm) */}
                <div className="bg-slate-50/80 p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                  <span className="text-slate-600 block text-[11px] font-semibold">
                    Largura de Corte (Kerf)
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={sawKerfMm}
                      onChange={(e) => setSawKerfMm(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="h-7 w-20 text-xs font-mono px-2 py-0 bg-white border-slate-300"
                    />
                    <span className="text-slate-700 font-mono text-xs font-semibold">mm</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">Por corte efetuado</span>
                </div>

                {/* 5. Esquadrejamento (mm) - Incorporado de forma permanente aos parâmetros técnicos sem flutuar nem vazar */}
                <div
                  data-testid="param-esquadrejamento-container"
                  className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 flex flex-col justify-between"
                >
                  <span className="text-amber-950 block text-[11px] font-semibold">
                    Esquadrejamento
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={squaringLossMm}
                      onChange={(e) =>
                        setSquaringLossMm(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="h-7 w-20 text-xs font-mono px-2 py-0 bg-white border-amber-300 focus:border-amber-500"
                    />
                    <span className="text-amber-900 font-mono text-xs font-semibold">mm</span>
                  </div>
                  <span className="text-[10px] text-amber-800/80 mt-0.5">Extremidade frontal</span>
                </div>

                {/* 6. Ponta Descartada (mm) - Incorporado aos parâmetros técnicos */}
                <div className="bg-amber-50/60 p-3 rounded-lg border border-amber-200 flex flex-col justify-between">
                  <span className="text-amber-950 block text-[11px] font-semibold">
                    Ponta Descartada
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={endCropLossMm}
                      onChange={(e) =>
                        setEndCropLossMm(Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="h-7 w-20 text-xs font-mono px-2 py-0 bg-white border-amber-300 focus:border-amber-500"
                    />
                    <span className="text-amber-900 font-mono text-xs font-semibold">mm</span>
                  </div>
                  <span className="text-[10px] text-amber-800/80 mt-0.5">Extremidade traseira</span>
                </div>
              </div>

              {/* Informações adicionais do bloco/peça em linha secundária */}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                <div>
                  <span className="font-medium text-slate-600">Centro:</span>{' '}
                  <span className="font-bold text-slate-800">{centerCode || 'L1'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Material (Aço):</span>{' '}
                  <span className="font-bold font-mono text-slate-800">
                    {materialCode || 'SAE 1020'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">Corrida:</span>{' '}
                  <span className="font-bold font-mono text-slate-800">{heatNumber || '—'}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-600">
                    Perdas Fixas (Esquadr. + Ponta):
                  </span>{' '}
                  <span className="font-bold font-mono text-amber-900">
                    {squaringLossMm + endCropLossMm} mm (
                    {formatMeters(squaringLossMm + endCropLossMm)})
                  </span>
                </div>
              </div>
            </div>

            {/* AVISO / MENSAGEM EXATA SE NENHUMA APLICAÇÃO COMPATÍVEL */}
            {(!candidates || candidates.length === 0) && !loading && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Nenhuma aplicação compatível encontrada para esta peça. Verifique os cadastros e
                  parâmetros técnicos.
                </span>
              </div>
            )}

            {/* 2. TABELA DE APLICAÇÕES INDUSTRIAIS COMPATÍVEIS */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-900 shrink-0" />
                  Aplicações Industriais Compatíveis
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculate}
                  className="h-7 text-xs flex items-center gap-1.5 text-blue-900 hover:text-blue-950 border-blue-300 bg-blue-50/50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Simular Combinações
                </Button>
              </div>

              {/* Rolagem horizontal exclusiva da tabela para proteger telas pequenas */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table className="text-xs w-full min-w-[760px]">
                  <TableHeader className="bg-slate-100/80">
                    <TableRow>
                      <TableHead className="w-[50px] text-center font-bold text-slate-700">
                        Ativar
                      </TableHead>
                      <TableHead className="min-w-[220px] font-bold text-slate-700">
                        Aplicação
                      </TableHead>
                      <TableHead className="min-w-[120px] font-bold text-slate-700">
                        Produto
                      </TableHead>
                      <TableHead className="min-w-[130px] text-right font-bold text-slate-700 whitespace-nowrap">
                        Comprimento (m)
                      </TableHead>
                      <TableHead className="min-w-[140px] text-center font-bold text-slate-700 whitespace-nowrap">
                        Quantidade Desejada
                      </TableHead>
                      <TableHead className="w-[110px] text-center font-bold text-slate-700">
                        Prioridade
                      </TableHead>
                      <TableHead className="min-w-[170px] text-right font-bold text-slate-700 whitespace-nowrap">
                        Comprimento Utilizado (m)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidates.map((cand) => {
                      const isSelected = selectedApps[cand.id] ?? true
                      const prio = appPriorities[cand.id] ?? cand.priority_order
                      const desiredQty = appDesiredQty[cand.id] ?? cand.available_demand_qty
                      const allocItem = optResult?.allocated_items.find(
                        (i) => i.application_id === cand.id,
                      )
                      const usedMm = allocItem ? allocItem.used_length_mm : 0
                      const allocQty = allocItem ? allocItem.quantity : 0

                      return (
                        <TableRow
                          key={cand.id}
                          className={`hover:bg-slate-50 transition-colors ${!isSelected ? 'opacity-50 bg-slate-50/60' : ''}`}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              aria-label={`Ativar ${cand.application_name}`}
                              onCheckedChange={(checked) => {
                                setSelectedApps((prev) => ({
                                  ...prev,
                                  [cand.id]: Boolean(checked),
                                }))
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">
                            <span>{cand.application_name}</span>
                            <span className="block text-[10px] text-slate-500 font-mono font-normal">
                              Cód: {cand.application_code} • {cand.steel_grade}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-slate-700">
                            {cand.product_code}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {formatMeters(cand.target_length_mm)}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              ({cand.target_length_mm.toLocaleString('pt-BR')} mm)
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!isSelected || desiredQty <= 0}
                                onClick={() => {
                                  setAppDesiredQty((prev) => ({
                                    ...prev,
                                    [cand.id]: Math.max(0, desiredQty - 1),
                                  }))
                                }}
                                className="h-6 w-6 p-0 text-xs shrink-0"
                                title="Diminuir quantidade"
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="0"
                                value={desiredQty}
                                disabled={!isSelected}
                                onChange={(e) => {
                                  const v = Math.max(0, parseInt(e.target.value, 10) || 0)
                                  setAppDesiredQty((prev) => ({ ...prev, [cand.id]: v }))
                                }}
                                className="h-6 w-14 text-center text-xs font-mono py-0 px-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!isSelected}
                                onClick={() => {
                                  setAppDesiredQty((prev) => ({
                                    ...prev,
                                    [cand.id]: desiredQty + 1,
                                  }))
                                }}
                                className="h-6 w-6 p-0 text-xs shrink-0"
                                title="Aumentar quantidade"
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!isSelected || prio <= 1}
                                onClick={() => {
                                  setAppPriorities((prev) => ({
                                    ...prev,
                                    [cand.id]: Math.max(1, prio - 1),
                                  }))
                                }}
                                className="h-6 w-6 p-0 text-xs shrink-0"
                                title="Aumentar prioridade"
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={prio}
                                disabled={!isSelected}
                                onChange={(e) => {
                                  const v = Math.max(1, parseInt(e.target.value, 10) || 1)
                                  setAppPriorities((prev) => ({ ...prev, [cand.id]: v }))
                                }}
                                className="h-6 w-12 text-center text-xs font-mono py-0 px-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!isSelected}
                                onClick={() => {
                                  setAppPriorities((prev) => ({
                                    ...prev,
                                    [cand.id]: prio + 1,
                                  }))
                                }}
                                className="h-6 w-6 p-0 text-xs shrink-0"
                                title="Diminuir prioridade"
                              >
                                +
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-blue-950 whitespace-nowrap">
                            {usedMm > 0 ? (
                              <span>
                                {formatMeters(usedMm)}{' '}
                                <span className="text-[11px] font-normal text-slate-500">
                                  ({allocQty} un)
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0,00 m</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 3. GRÁFICO "PLANO DE CORTE LONGITUDINAL DA PEÇA (VISUALIZAÇÃO EM ESCALA)" */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-blue-900 shrink-0" />
                  Plano de Corte Longitudinal da Peça (Visualização em Escala)
                </h4>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <span>Comprimento Laminado Total:</span>
                  <strong className="text-slate-900">{formatMeters(totalRolledLengthMm)}</strong>
                  <span className="text-slate-400">({formatMm(totalRolledLengthMm)})</span>
                </div>
              </div>

              {/* Barra Longitudinal Proporcional com rolagem horizontal interna protegida */}
              <div className="overflow-x-auto pb-1">
                <div className="relative min-w-[700px] w-full h-11 bg-slate-200 rounded-md overflow-hidden flex border border-slate-300 shadow-inner">
                  <TooltipProvider delayDuration={50}>
                    {optResult?.visual_segments && optResult.visual_segments.length > 0 ? (
                      optResult.visual_segments.map((seg) => {
                        const widthPct = Math.max(
                          0.5,
                          (seg.length_mm / (optResult.total_rolled_length_mm || 1)) * 100,
                        )
                        return (
                          <Tooltip key={seg.id}>
                            <TooltipTrigger asChild>
                              <div
                                style={{
                                  width: `${widthPct}%`,
                                  backgroundColor: seg.color,
                                }}
                                className="h-full border-r border-white/20 transition-all hover:brightness-110 flex items-center justify-center cursor-help px-1 select-none"
                              >
                                {widthPct > 6 && (
                                  <span className="text-[10px] font-bold text-white truncate drop-shadow-sm font-mono whitespace-nowrap">
                                    {formatMeters(seg.length_mm)}
                                  </span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-slate-950 text-slate-100 border-slate-800 text-xs p-3 space-y-1.5 max-w-sm shadow-xl z-50 pointer-events-none"
                            >
                              <p className="font-bold text-amber-300 text-xs">{seg.label}</p>
                              <div className="border-t border-slate-800 pt-1 space-y-0.5 text-[11px]">
                                {seg.application_name && (
                                  <div>
                                    <span className="text-slate-400">Aplicação:</span>{' '}
                                    <strong className="text-white">{seg.application_name}</strong>
                                  </div>
                                )}
                                {seg.product_code && (
                                  <div>
                                    <span className="text-slate-400">Código do Produto:</span>{' '}
                                    <strong className="text-blue-300 font-mono">
                                      {seg.product_code}
                                    </strong>
                                  </div>
                                )}
                                <div>
                                  <span className="text-slate-400">Comprimento:</span>{' '}
                                  <strong className="text-white font-mono">
                                    {formatMeters(seg.length_mm)} ({formatMm(seg.length_mm)})
                                  </strong>
                                </div>
                                {seg.estimated_weight_kg !== undefined && (
                                  <div>
                                    <span className="text-slate-400">Peso estimado:</span>{' '}
                                    <strong className="text-white font-mono">
                                      {formatTons(seg.estimated_weight_kg)}
                                    </strong>
                                  </div>
                                )}
                                {seg.piece_number && (
                                  <div>
                                    <span className="text-slate-400">Nº da Peça:</span>{' '}
                                    <strong className="text-emerald-400 font-mono">
                                      #{seg.piece_number}
                                    </strong>
                                  </div>
                                )}
                                {seg.cut_sequence && (
                                  <div>
                                    <span className="text-slate-400">Posição no corte:</span>{' '}
                                    <strong className="text-amber-300 font-mono">
                                      {seg.cut_sequence}º corte
                                    </strong>
                                  </div>
                                )}
                                <div>
                                  <span className="text-slate-400">Posição longitudinal:</span>{' '}
                                  <strong className="text-slate-300 font-mono">
                                    {formatMeters(seg.start_mm)} a {formatMeters(seg.end_mm)}
                                  </strong>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-500 italic">
                        Nenhuma distribuição calculada
                      </div>
                    )}
                  </TooltipProvider>
                </div>
              </div>

              {/* Legenda do Gráfico */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#1e3a8a] shrink-0" />
                  <span>Produtos Conformes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#64748b] shrink-0" />
                  <span>Corte Serra (Kerf)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#f59e0b] shrink-0" />
                  <span>Esquadrejamento</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#10b981] shrink-0" />
                  <span>Sobra Aproveitável</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#ef4444] shrink-0" />
                  <span>Refugo Final</span>
                </div>
              </div>
            </div>

            {/* 4. RESULTADOS DA OTIMIZAÇÃO (8 CARDS DE INDICADORES TÉCNICOS COM UNIDADES PADRONIZADAS) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Resultados da Otimização & Balanço Metálico
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {/* 1. Comprimento Laminado Total (m) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-slate-500 block font-medium leading-tight">
                    1. Comp. Laminado Total (m)
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-1">
                    {formatMeters(optResult?.total_rolled_length_mm)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatMm(optResult?.total_rolled_length_mm)}
                  </span>
                </div>

                {/* 2. Comprimento Aproveitado (m) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-blue-900 block font-medium leading-tight">
                    2. Comp. Aproveitado (m)
                  </span>
                  <span className="text-sm font-bold text-blue-900 font-mono mt-1">
                    {formatMeters(optResult?.used_length_mm)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {formatMm(optResult?.used_length_mm)}
                  </span>
                </div>

                {/* 3. Quantidade de Peças Geradas */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-slate-500 block font-medium leading-tight">
                    3. Peças Geradas
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-1">
                    {optResult?.generated_pieces_count || 0} un
                  </span>
                  <span className="text-[10px] text-slate-400">Total conformado</span>
                </div>

                {/* 4. Quantidade de Aplicações Atendidas */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-slate-500 block font-medium leading-tight">
                    4. Aplicações Atendidas
                  </span>
                  <span className="text-sm font-bold text-slate-900 font-mono mt-1">
                    {optResult?.fulfilled_applications_count || 0}
                  </span>
                  <span className="text-[10px] text-slate-400">Demandas PCP</span>
                </div>

                {/* 5. Comprimento Perdido nos Cortes (m) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-amber-800 block font-medium leading-tight">
                    5. Perdas de Corte (m)
                  </span>
                  <span className="text-sm font-bold text-amber-700 font-mono mt-1">
                    {formatMeters(optResult?.cut_losses_length_mm)}
                  </span>
                  <span className="text-[10px] text-amber-900/70 font-mono">
                    {formatMm(optResult?.cut_losses_length_mm)}
                  </span>
                </div>

                {/* 6. Sobra Aproveitável (m) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-emerald-800 block font-medium leading-tight">
                    6. Sobra Aproveitável (m)
                  </span>
                  <span className="text-sm font-bold text-emerald-700 font-mono mt-1">
                    {formatMeters(optResult?.usable_leftover_mm)}
                  </span>
                  <span className="text-[10px] text-emerald-900/70 font-mono">
                    {formatMm(optResult?.usable_leftover_mm)}
                  </span>
                </div>

                {/* 7. Refugo (m) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-red-700 block font-medium leading-tight">
                    7. Refugo Final (m)
                  </span>
                  <span className="text-sm font-bold text-red-600 font-mono mt-1">
                    {formatMeters(optResult?.scrap_mm)}
                  </span>
                  <span className="text-[10px] text-red-800/70 font-mono">
                    {formatMm(optResult?.scrap_mm)}
                  </span>
                </div>

                {/* 8. Rendimento do Corte (%) */}
                <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] text-blue-900 block font-bold leading-tight">
                    8. Rendimento (%)
                  </span>
                  <span className="text-base font-extrabold text-blue-950 font-mono mt-0.5">
                    {formatPct(optResult?.cutting_yield_pct)}
                  </span>
                  <span className="text-[10px] text-blue-800 leading-tight">
                    Metálico aproveitado
                  </span>
                </div>
              </div>
            </div>

            {/* 5. INFORMAÇÕES TÉCNICAS COMPLEMENTARES */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 text-[11px]">
                <Info className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                Informações Técnicas Complementares
              </h4>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Os cálculos de rendimento respeitam rigorosamente a conservação da massa e as
                espessuras de corte programadas para as serras industriais. Os comprimentos dos
                blocos são calculados a partir da massa linear de{' '}
                <strong>{formatLinearMass(linearMassKgM)}</strong>. Todas as alterações efetuadas
                geram registro auditável no log de operações do PCP Robotizado.
              </p>
            </div>
          </div>

          {/* RODAPÉ FIXO (Status da otimização; Botão Cancelar; Botão Confirmar Otimização) */}
          <DialogFooter className="shrink-0 p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600 min-w-0 truncate">
              {optResult?.is_viable ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Combinação viável ({formatPct(optResult.cutting_yield_pct)} de rendimento em{' '}
                    {optResult.generated_pieces_count} peças)
                  </span>
                </span>
              ) : (
                <span className="text-red-600 font-semibold flex items-center gap-1.5 truncate">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="truncate">{optResult?.inviability_reason}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirm}
                disabled={saving || !optResult?.is_viable}
                className="bg-blue-900 hover:bg-blue-950 text-white flex items-center gap-1.5 shadow-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Gravando...' : 'Confirmar Otimização'}
              </Button>
            </div>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
