import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  GitFork,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Clock,
  Wrench,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import {
  weeklyDerivationEngine,
  CandidateDerivationItem,
  DerivationSimulationResult,
  DERIVATION_REASONS,
  DerivationReasonOption,
} from '@/services/weekly-derivation-engine'
import { formatTonsPtBr } from '@/lib/formatters-ptbr'
import { useToast } from '@/hooks/use-toast'

interface DerivedProgrammingModalProps {
  isOpen: boolean
  onClose: () => void
  currentLineCode: string
  currentYear: number
  currentWeek: number
  currentVersion: number
  items: WeeklyScheduleItem[]
  allScheduleItems?: WeeklyScheduleItem[]
  onSuccess: (
    generatedCount: number,
    targetCenters: string[],
    createdItems: WeeklyScheduleItem[],
  ) => void
  onNavigateToCenter?: (targetCenterCode: string) => void
}

export const DerivedProgrammingModal: React.FC<DerivedProgrammingModalProps> = ({
  isOpen,
  onClose,
  currentLineCode,
  currentYear,
  currentWeek,
  currentVersion,
  items,
  allScheduleItems,
  onSuccess,
  onNavigateToCenter,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [candidates, setCandidates] = useState<CandidateDerivationItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [aiModalCandidate, setAiModalCandidate] = useState<CandidateDerivationItem | null>(null)
  const [simulationResult, setSimulationResult] = useState<DerivationSimulationResult | null>(null)
  const [showSimulationModal, setShowSimulationModal] = useState(false)

  // Anti-duplicidade e sobrescrita
  const [conflictType, setConflictType] = useState<
    'NONE' | 'ALREADY_EXISTS' | 'HAS_MANUAL_CHANGES'
  >('NONE')
  const [conflictItemToProcess, setConflictItemToProcess] =
    useState<CandidateDerivationItem | null>(null)

  // Mensagem final de sucesso customizada
  const [successInfo, setSuccessInfo] = useState<{
    targetCenter: string
    count: number
    week: string
  } | null>(null)

  // Carregar candidatos ao abrir o modal
  useEffect(() => {
    if (!isOpen) {
      setCandidates([])
      setSelectedIds({})
      setSimulationResult(null)
      setConflictType('NONE')
      setSuccessInfo(null)
      return
    }

    let isMounted = true
    setLoading(true)

    weeklyDerivationEngine
      .buildCandidateDerivations(currentLineCode, items, allScheduleItems)
      .then((res) => {
        if (!isMounted) return
        setCandidates(res)
        const initialSelected: Record<string, boolean> = {}
        res.forEach((c) => {
          initialSelected[c.parentItem.id] = true
        })
        setSelectedIds(initialSelected)
      })
      .catch((err) => {
        console.error('Erro ao construir candidatos à derivação:', err)
        toast({
          title: 'Erro ao carregar derivações',
          description: 'Não foi possível carregar as regras de derivação ativas.',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, currentLineCode, items, allScheduleItems, toast])

  const selectedCandidates = useMemo(() => {
    return candidates.filter((c) => selectedIds[c.parentItem.id])
  }, [candidates, selectedIds])

  const targetCentersList = useMemo(() => {
    const set = new Set<string>()
    candidates.forEach((c) => set.add(c.targetCenterCode))
    return Array.from(set)
  }, [candidates])

  const matklList = useMemo(() => {
    const set = new Set<string>()
    candidates.forEach((c) => {
      const mat = (c.parentItem.family_code || c.parentItem.metadata?.matkl || '001').toString()
      set.add(mat)
    })
    return Array.from(set)
  }, [candidates])

  const allSelected = candidates.length > 0 && candidates.every((c) => selectedIds[c.parentItem.id])
  const someSelected = candidates.some((c) => selectedIds[c.parentItem.id]) && !allSelected

  const handleToggleSelectAll = () => {
    const nextState = !allSelected
    const updated: Record<string, boolean> = {}
    candidates.forEach((c) => {
      updated[c.parentItem.id] = nextState
    })
    setSelectedIds(updated)
  }

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handleCandidateChange = (id: string, field: keyof CandidateDerivationItem, value: any) => {
    setCandidates((prev) =>
      prev.map((item) => {
        if (item.parentItem.id !== id) return item
        const updated = { ...item, [field]: value }
        // Se mudou quantidade ou destino ou data/hora, marca como editado pelo PCP
        const isQtyChanged =
          field === 'derivedQuantity' && Number(value) !== Number(item.suggestedQuantity)
        const isTargetChanged =
          field === 'targetCenterCode' && value !== item.matchedRule.center_code
        const isDateChanged = field === 'derivedDate' && value !== item.suggestedDate

        if (isQtyChanged || isTargetChanged || isDateChanged || field === 'adjustmentReason') {
          updated.isEdited = true
          if (!updated.adjustmentReason) {
            updated.adjustmentReason = 'Ajuste manual PCP'
          }
        }
        return updated
      }),
    )
  }

  const handleRunSimulation = () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: 'Nenhum item selecionado',
        description: 'Selecione pelo menos um item para simular a programação derivada.',
        variant: 'destructive',
      })
      return
    }

    const sim = weeklyDerivationEngine.simulateDerivationSchedule(
      selectedCandidates,
      targetCentersList[0],
    )
    setSimulationResult(sim)
    setShowSimulationModal(true)
  }

  const executeGeneration = async (preserveManualEdits = true) => {
    if (selectedCandidates.length === 0) {
      toast({
        title: 'Nenhum item selecionado',
        description: 'Selecione pelo menos um item para gerar a programação derivada.',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    const createdItems: WeeklyScheduleItem[] = []
    const generatedCenters = new Set<string>()

    try {
      for (const cand of selectedCandidates) {
        const itemToPersist = { ...cand }
        if (!preserveManualEdits) {
          itemToPersist.derivedQuantity = itemToPersist.suggestedQuantity
          itemToPersist.derivedDate = itemToPersist.suggestedDate
          itemToPersist.isEdited = false
        }

        const derivedItem = await weeklyDerivationEngine.createDerivedScheduleItem(
          itemToPersist.parentItem,
          itemToPersist.matchedRule,
          {
            targetCenterCode: itemToPersist.targetCenterCode,
            suggestedQuantity: itemToPersist.derivedQuantity,
            suggestedDateStr: itemToPersist.derivedDate,
            suggestedHourStr: itemToPersist.derivedHour,
            sequenceOrder: itemToPersist.derivedSequenceOrder,
            shiftCode: itemToPersist.derivedShiftCode,
            shiftName: itemToPersist.derivedShiftName,
            crewName: itemToPersist.derivedCrewName,
            setupMinutes: itemToPersist.setupMinutes,
            tuningMinutes: itemToPersist.tuningMinutes,
            isEdited: itemToPersist.isEdited,
            adjustmentReason: itemToPersist.adjustmentReason,
            adjustmentObservation: itemToPersist.adjustmentObservation,
            aiAnalysis: itemToPersist.aiAnalysis,
          },
          'MANUAL',
          'PCP Programador',
        )

        createdItems.push(derivedItem)
        generatedCenters.add(itemToPersist.targetCenterCode)
      }

      const centersArr = Array.from(generatedCenters)
      setSuccessInfo({
        targetCenter: centersArr.join(', '),
        count: createdItems.length,
        week: `Semana ${currentWeek}/${currentYear}`,
      })

      onSuccess(createdItems.length, centersArr, createdItems)
      toast({
        title: 'Programação derivada gerada com sucesso.',
        description: `${createdItems.length} item(ns) gerado(s) com sucesso para ${centersArr.join(', ')}.`,
      })
    } catch (err: any) {
      console.error('Erro ao gerar derivação:', err)
      const msg =
        err?.message ||
        'Não foi possível gerar: foram encontradas regras obrigatórias incompatíveis ou falha de conexão.'
      toast({
        title: 'Falha na geração da programação derivada',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
      setConflictType('NONE')
      setConflictItemToProcess(null)
    }
  }

  const handleStartGeneration = () => {
    // Verificar se algum item já possui derivação pré-existente
    const hasAlreadyDerived = selectedCandidates.some((c) => {
      return allScheduleItems.some(
        (si) =>
          si.origem_programacao_id === c.parentItem.id ||
          (si.is_derived && si.origem_programacao_id === c.parentItem.schedule_code),
      )
    })

    if (hasAlreadyDerived) {
      setConflictType('ALREADY_EXISTS')
      return
    }

    // Verificar se tem alterações manuais do PCP
    const hasEdits = selectedCandidates.some((c) => c.isEdited)
    if (hasEdits) {
      setConflictType('HAS_MANUAL_CHANGES')
      return
    }

    executeGeneration(true)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !generating && onClose()}>
      <DialogContent
        className="w-[92vw] max-w-[1400px] h-[90vh] max-h-[90vh] p-0 flex flex-col bg-card border-border shadow-2xl overflow-hidden rounded-xl"
        data-testid="derived-programming-modal"
      >
        {/* CABEÇALHO */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <GitFork className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  GERAR PROGRAMAÇÃO DERIVADA
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 text-amber-500 bg-amber-500/10 font-mono text-xs"
                  >
                    V{currentVersion}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Origem: <strong className="text-foreground">{currentLineCode}</strong> • Semana{' '}
                  <strong className="text-foreground">
                    {String(currentWeek).padStart(2, '0')}/{currentYear}
                  </strong>{' '}
                  • Versão <strong className="text-foreground">{currentVersion}</strong>
                </p>
              </div>
            </div>

            {/* Badges do Resumo Superior */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Centros Derivados
                </div>
                <div className="text-sm font-bold text-foreground">
                  {targetCentersList.length > 0 ? targetCentersList.join(', ') : 'Nenhum'}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* CORPO COM SCROLL ÚNICO */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* SUCESSO PÓS-GERAÇÃO COM AÇÕES */}
          {successInfo && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Programação derivada gerada com sucesso.</h4>
                  <p className="text-xs opacity-90">
                    {successInfo.count} produto(s) programado(s) no centro{' '}
                    <strong>{successInfo.targetCenter}</strong> para a {successInfo.week}.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSuccessInfo(null)
                    onClose()
                  }}
                >
                  Permanecer na origem ({currentLineCode})
                </Button>
                {onNavigateToCenter && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      onNavigateToCenter(successInfo.targetCenter.split(',')[0].trim())
                      onClose()
                    }}
                  >
                    Abrir programação do {successInfo.targetCenter}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* BANNER DE RESUMO COMPACTO */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-3.5 rounded-lg bg-muted/40 border border-border/70 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Centro Origem
              </span>
              <span className="font-bold text-foreground text-sm">{currentLineCode}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Centro(s) Destino
              </span>
              <span className="font-bold text-foreground text-sm">
                {targetCentersList.length > 0 ? targetCentersList.join(', ') : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Semana / Ano
              </span>
              <span className="font-semibold text-foreground">
                Semana {String(currentWeek).padStart(2, '0')}/{currentYear}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Versão Ativa
              </span>
              <span className="font-semibold text-foreground">V{currentVersion}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                Itens Encontrados
              </span>
              <span className="font-bold text-foreground text-sm">
                {candidates.length} item(ns)
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                MATKL Aplicáveis
              </span>
              <span className="font-semibold text-foreground">
                {matklList.length > 0 ? matklList.join(', ') : 'Nenhum'}
              </span>
            </div>
          </div>

          {/* MODAL DE CONFLITO / ANTI-DUPLICIDADE */}
          {conflictType === 'ALREADY_EXISTS' && (
            <div className="p-4 rounded-lg bg-amber-500/15 border border-amber-500/40 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Programação derivada já existente
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Um ou mais itens selecionados já possuem programação derivada registrada para o
                    centro de destino nesta semana.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setConflictType('NONE')}>
                  Cancelar
                </Button>
                {onNavigateToCenter && targetCentersList[0] && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onNavigateToCenter(targetCentersList[0])
                      onClose()
                    }}
                  >
                    Abrir existente ({targetCentersList[0]})
                  </Button>
                )}
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => executeGeneration(true)}
                >
                  Recalcular / Atualizar
                </Button>
              </div>
            </div>
          )}

          {conflictType === 'HAS_MANUAL_CHANGES' && (
            <div className="p-4 rounded-lg bg-blue-500/15 border border-blue-500/40 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-foreground">
                    Esta programação possui alterações realizadas pelo PCP
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Foram identificados ajustes manuais de quantidade, sequência ou parâmetros
                    operacionais. Deseja recalcular preservando os ajustes manuais?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-blue-500/20 justify-end">
                <Button size="sm" variant="ghost" onClick={() => setConflictType('NONE')}>
                  Cancelar
                </Button>
                <Button size="sm" variant="outline" onClick={() => executeGeneration(false)}>
                  Gerar nova proposta (Descartar ajustes)
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  onClick={() => executeGeneration(true)}
                >
                  Recalcular preservando ajustes
                </Button>
              </div>
            </div>
          )}

          {/* TABELA DE ITENS CANDIDATOS */}
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Carregando regras ativas e itens elegíveis da semana...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-12 px-6 rounded-lg border border-dashed border-border text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-foreground">
                  Nenhum item elegível para derivação nesta semana
                </h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Não foi possível gerar: nenhum produto na linha {currentLineCode} possui grupo de
                  mercadoria (MATKL) com regra de derivação ativa ou dentro da vigência.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden bg-card shadow-sm">
              <div className="max-h-[46vh] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/70 text-muted-foreground text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-border">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleToggleSelectAll}
                          aria-label="Selecionar todos"
                          data-testid="derivation-select-all"
                        />
                      </th>
                      <th className="p-3 font-semibold">Seq. Origem</th>
                      <th className="p-3 font-semibold">Produto / Descrição</th>
                      <th className="p-3 font-semibold text-center">MATKL</th>
                      <th className="p-3 font-semibold text-right">Qtd. Origem</th>
                      <th className="p-3 font-semibold text-center">Centro Destino</th>
                      <th className="p-3 font-semibold text-right w-28">Qtd. Derivada</th>
                      <th className="p-3 font-semibold">Data Sugerida</th>
                      <th className="p-3 font-semibold text-center">Status / Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {candidates.map((cand) => {
                      const isSelected = !!selectedIds[cand.parentItem.id]
                      const isExpanded = expandedRowId === cand.parentItem.id
                      const matklCode = (
                        cand.parentItem.family_code ||
                        cand.parentItem.metadata?.matkl ||
                        '001'
                      ).toString()

                      return (
                        <React.Fragment key={cand.parentItem.id}>
                          <tr
                            className={`hover:bg-muted/30 transition-colors ${
                              isSelected ? 'bg-primary/5' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleRow(cand.parentItem.id)}
                                data-testid={`checkbox-derivation-${cand.parentItem.id}`}
                              />
                            </td>
                            <td className="p-3 font-mono font-medium text-muted-foreground">
                              #{cand.parentItem.sequence_order || 1}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-foreground">
                                {cand.parentItem.material_description ||
                                  cand.parentItem.material_code}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {cand.parentItem.material_code} •{' '}
                                {cand.parentItem.client_name || 'Lote Padrão'}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {matklCode}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-mono font-semibold text-foreground">
                              {formatTonsPtBr(cand.suggestedQuantity)}
                            </td>
                            <td className="p-3 text-center">
                              {cand.destinationCenters.length > 1 ? (
                                <Select
                                  value={cand.targetCenterCode}
                                  onValueChange={(val) =>
                                    handleCandidateChange(
                                      cand.parentItem.id,
                                      'targetCenterCode',
                                      val,
                                    )
                                  }
                                >
                                  <SelectTrigger className="h-7 text-xs font-semibold w-28 mx-auto">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {cand.destinationCenters.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold border-amber-500/40">
                                  {cand.targetCenterCode}
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={cand.derivedQuantity}
                                  onChange={(e) =>
                                    handleCandidateChange(
                                      cand.parentItem.id,
                                      'derivedQuantity',
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="h-7 text-xs w-24 text-right font-mono font-bold"
                                  data-testid={`input-derived-qty-${cand.parentItem.id}`}
                                />
                                <span className="text-[10px] text-muted-foreground">t</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-xs">
                                {cand.derivedDate || cand.suggestedDate || '—'}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {cand.derivedShiftName}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {cand.isEdited ? (
                                  <Badge
                                    className="bg-amber-500 text-white font-medium text-[10px] px-2 py-0.5"
                                    data-testid={`badge-edited-pcp-${cand.parentItem.id}`}
                                  >
                                    Editado pelo PCP
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Sugerido
                                  </Badge>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-primary"
                                  title="Análise IA Objetiva"
                                  onClick={() => setAiModalCandidate(cand)}
                                  data-testid={`btn-ai-analysis-${cand.parentItem.id}`}
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  title={isExpanded ? 'Ocultar detalhes' : 'Ajuste fino pelo PCP'}
                                  onClick={() =>
                                    setExpandedRowId(isExpanded ? null : cand.parentItem.id)
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* PAINEL DE AJUSTES DETALHADOS PELO PROGRAMADOR */}
                          {isExpanded && (
                            <tr className="bg-muted/20 border-b border-border/70">
                              <td colSpan={9} className="p-4 space-y-3">
                                <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                                  <Wrench className="w-4 h-4 text-amber-500" />
                                  Parâmetros Operacionais de Derivação (Edição PCP)
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  <div>
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                                      Data Derivada
                                    </Label>
                                    <Input
                                      type="date"
                                      value={cand.derivedDate}
                                      onChange={(e) =>
                                        handleCandidateChange(
                                          cand.parentItem.id,
                                          'derivedDate',
                                          e.target.value,
                                        )
                                      }
                                      className="h-7 text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                                      Horário Inicial
                                    </Label>
                                    <Input
                                      type="time"
                                      value={cand.derivedHour || '08:00'}
                                      onChange={(e) =>
                                        handleCandidateChange(
                                          cand.parentItem.id,
                                          'derivedHour',
                                          e.target.value,
                                        )
                                      }
                                      className="h-7 text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                                      Seq. no Destino
                                    </Label>
                                    <Input
                                      type="number"
                                      value={cand.derivedSequenceOrder}
                                      onChange={(e) =>
                                        handleCandidateChange(
                                          cand.parentItem.id,
                                          'derivedSequenceOrder',
                                          parseInt(e.target.value) || 1,
                                        )
                                      }
                                      className="h-7 text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                                      Turno / Turma
                                    </Label>
                                    <Input
                                      value={`${cand.derivedShiftName} • ${cand.derivedCrewName}`}
                                      onChange={(e) =>
                                        handleCandidateChange(
                                          cand.parentItem.id,
                                          'derivedCrewName',
                                          e.target.value,
                                        )
                                      }
                                      className="h-7 text-xs mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                                      Motivo do Ajuste *
                                    </Label>
                                    <Select
                                      value={cand.adjustmentReason || 'Ajuste manual PCP'}
                                      onValueChange={(val: DerivationReasonOption) =>
                                        handleCandidateChange(
                                          cand.parentItem.id,
                                          'adjustmentReason',
                                          val,
                                        )
                                      }
                                    >
                                      <SelectTrigger
                                        className="h-7 text-xs mt-1 font-semibold"
                                        data-testid="select-adjustment-reason"
                                      >
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DERIVATION_REASONS.map((reason) => (
                                          <SelectItem key={reason} value={reason}>
                                            {reason}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-[10px] uppercase font-semibold text-muted-foreground">
                                    Observação Livre do Programador (Registrada na Auditoria)
                                  </Label>
                                  <Textarea
                                    rows={2}
                                    placeholder="Ex: Ajustado lote para comportar capacidade do acabamento térmico..."
                                    value={cand.adjustmentObservation || ''}
                                    onChange={(e) =>
                                      handleCandidateChange(
                                        cand.parentItem.id,
                                        'adjustmentObservation',
                                        e.target.value,
                                      )
                                    }
                                    className="text-xs mt-1"
                                  />
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ STICKY FIXO */}
        <div className="px-6 py-3.5 border-t border-border bg-card/95 backdrop-blur shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {selectedCandidates.length} de {candidates.length}
            </span>{' '}
            itens selecionados
            {selectedCandidates.length > 0 && (
              <span className="text-muted-foreground">
                (
                {formatTonsPtBr(
                  selectedCandidates.reduce((acc, c) => acc + Number(c.derivedQuantity || 0), 0),
                )}
                )
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={generating}
              data-testid="btn-cancel-derivation"
            >
              Cancelar
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunSimulation}
              disabled={generating || selectedCandidates.length === 0}
              className="gap-1.5"
              data-testid="btn-simulate-derivation"
            >
              <Play className="w-4 h-4 text-primary" />
              Simular Programação
            </Button>

            <Button
              size="sm"
              onClick={handleStartGeneration}
              disabled={generating || selectedCandidates.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1.5 shadow-md"
              data-testid="btn-confirm-generate-derivation"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Gerando Derivação...
                </>
              ) : (
                <>
                  <GitFork className="w-4 h-4" />
                  Gerar Programação Derivada ({selectedCandidates.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* MODAL DE ANÁLISE IA POR LINHA */}
        {aiModalCandidate && (
          <Dialog open={!!aiModalCandidate} onOpenChange={() => setAiModalCandidate(null)}>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Análise IA Objetiva de Derivação
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Item: {aiModalCandidate.parentItem.material_description} (
                  {aiModalCandidate.parentItem.material_code})
                </p>
              </DialogHeader>

              <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                  <span className="font-semibold text-primary block">
                    1. Motivo & Regra Aplicada
                  </span>
                  <p className="text-foreground">{aiModalCandidate.aiAnalysis.motivo}</p>
                  <p className="text-muted-foreground font-mono text-[11px]">
                    {aiModalCandidate.aiAnalysis.regraAplicada}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-muted/40 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Centro Destino Sugerido
                    </span>
                    <span className="font-bold text-foreground">
                      {aiModalCandidate.aiAnalysis.centroDestino}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-muted/40 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Janela Sugerida
                    </span>
                    <span className="font-semibold text-foreground">
                      {aiModalCandidate.aiAnalysis.janelaSugerida}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-muted/40 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Impacto de Setup
                    </span>
                    <span className="text-foreground">
                      {aiModalCandidate.aiAnalysis.impactoSetup}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-muted/40 border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Impacto de Acerto
                    </span>
                    <span className="text-foreground">
                      {aiModalCandidate.aiAnalysis.impactoAcerto}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-muted/40 border border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Matéria-Prima & Restrições
                  </span>
                  <p className="text-foreground">{aiModalCandidate.aiAnalysis.mp}</p>
                  <p className="text-muted-foreground text-[11px] mt-1">
                    {aiModalCandidate.aiAnalysis.restricoes}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  <span className="font-bold block">
                    Recomendação IA (Hierarquia Determinística)
                  </span>
                  <p className="mt-1">{aiModalCandidate.aiAnalysis.recomendacao}</p>
                  <p className="text-[10px] opacity-80 mt-1">
                    Lições Históricas: {aiModalCandidate.aiAnalysis.licoesHistoricas}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border">
                <Button size="sm" onClick={() => setAiModalCandidate(null)}>
                  Fechar Análise
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* MODAL DE SIMULAÇÃO DE PROGRAMAÇÃO (GANTT PRÉVIO E ALERTAS) */}
        {showSimulationModal && simulationResult && (
          <Dialog open={showSimulationModal} onOpenChange={setShowSimulationModal}>
            <DialogContent className="max-w-3xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Play className="w-4 h-4 text-primary" />
                  Simulação de Programação Derivada (Prévia sem Persistir)
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Prévia calculada para {simulationResult.itemsCount} itens no centro de destino
                </p>
              </DialogHeader>

              <div className="space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
                {/* Indicadores Previstos */}
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Volume Total
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {formatTonsPtBr(simulationResult.totalTons)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      OEE Estimado
                    </span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {simulationResult.estimatedOee}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Produtividade
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {simulationResult.estimatedProductivityTh} t/h
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-center">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Tempo Total
                    </span>
                    <span className="text-base font-bold text-foreground">
                      {simulationResult.totalHours} h
                    </span>
                  </div>
                </div>

                {/* Conflitos ou Alertas */}
                {simulationResult.conflicts.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 space-y-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Conflitos Detectados
                    </span>
                    <ul className="list-disc list-inside">
                      {simulationResult.conflicts.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prévia Gantt */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/70 px-3 py-2 font-semibold text-[11px] text-muted-foreground uppercase border-b border-border">
                    Prévia de Alocação Temporal (Gantt Previsto)
                  </div>
                  <div className="divide-y divide-border/60 max-h-48 overflow-y-auto">
                    {simulationResult.ganttPreview.map((gp, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-foreground">{gp.materialCode}</span>
                          <span className="text-muted-foreground ml-2">({gp.lineCode})</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-muted-foreground">
                            {gp.startTime} → {gp.endTime}
                          </span>
                          <span className="font-bold font-mono">{formatTonsPtBr(gp.tons)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => setShowSimulationModal(false)}>
                  Voltar para Edição
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => {
                    setShowSimulationModal(false)
                    handleStartGeneration()
                  }}
                >
                  Confirmar e Gerar Derivação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
