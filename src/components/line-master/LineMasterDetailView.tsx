import React, { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Building2,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  GitCommit,
  Layers,
  Lock,
  PauseCircle,
  Plus,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Can } from '@/components/auth/Can'
import { lineMasterService } from '@/services/line-master'
import { LineBottleneckMatrixPanel } from '@/components/line-master/LineBottleneckMatrixPanel'
import { LineShiftsAndCrewsPanel } from '@/components/line-master/LineShiftsAndCrewsPanel'
import { MaterialSelector } from '@/components/common/MaterialSelector'
import {
  MULTIPLE_PROGRAMMING_STAGES_CATALOG,
  PROGRAMMING_TYPES_CATALOG,
  ProgrammingType,
  LineOverviewData,
  ProductionLine,
  ProductFamily,
  StandardScheduledStop,
  SapIntegrationDefinition,
  MasterSheetCompletenessResult,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { MasterSheetCompletenessModal } from '@/components/line-master/MasterSheetCompletenessModal'

interface LineMasterDetailViewProps {
  overview: LineOverviewData
  users: UserProfile[]
  productFamilies: ProductFamily[]
  allLines: ProductionLine[]
  sapCatalog: SapIntegrationDefinition[]
  onRefresh: () => void
  onOpenSapCatalog: () => void
}

export const LineMasterDetailView: React.FC<LineMasterDetailViewProps> = ({
  overview,
  users,
  productFamilies,
  allLines: _allLines,
  sapCatalog,
  onRefresh,
  onOpenSapCatalog,
}) => {
  const { toast } = useToast()

  const {
    line,
    master,
    hierarchy = [],
    managers = [],
    approvers = [],
    sequencing = [],
    shifts = [],
    productivity = [],
    rawMaterials = [],
    blockedProducts = [],
    setupMatrix = [],
    scheduledStops = [],
    history = [],
    alerts = [],
    completeness = 0,
    readyForScheduling = false,
  } = overview

  // Estado da Completude detalhada e Modal
  const [completenessResult, setCompletenessResult] =
    useState<MasterSheetCompletenessResult | null>(null)
  const [isCompletenessModalOpen, setIsCompletenessModalOpen] = useState(false)

  // Carrega cálculo determinístico de completude para a linha
  const loadCompleteness = React.useCallback(async () => {
    try {
      const res = await lineMasterService.getMasterSheetCompleteness(line.id, {
        forceRefresh: true,
      })
      setCompletenessResult(res)
    } catch (err) {
      console.warn('Erro ao carregar completude da linha:', err)
    }
  }, [line.id])

  React.useEffect(() => {
    loadCompleteness()
  }, [loadCompleteness, overview])

  // Sub-aba ativa no agrupamento de Governança / Processo / Ficha Mestre
  const [mainGroup, setMainGroup] = useState<
    'OVERVIEW' | 'ORGANIZATION' | 'PROCESS' | 'MASTERDATA' | 'BOTTLENECK_MATRIX' | 'GOVERNANCE'
  >('OVERVIEW')

  const [masterSubTab, setMasterSubTab] = useState<
    | 'CAPACITY'
    | 'SHIFTS_CREWS'
    | 'MATRIZ_GARGALOS'
    | 'PRODUCTIVITY'
    | 'RAW_MATERIALS'
    | 'BLOCKED'
    | 'SETUP_MATRIX'
    | 'IDEAL_GAUGE_SEQUENCE'
  >('CAPACITY')

  // Estado e persistência de Tipo de Programação da Linha / Ficha Mestre
  const [selectedProgType, setSelectedProgType] = useState<string>(
    (line.programming_type as string) || (master?.programming_type as string) || 'Laminação',
  )
  const [selectedProgStages, setSelectedProgStages] = useState<string[]>(
    Array.isArray(line.programming_stages)
      ? (line.programming_stages as string[])
      : Array.isArray(master?.programming_stages)
        ? (master.programming_stages as string[])
        : ['Enfornamento', 'Laminação'],
  )
  const [isSavingProgType, setIsSavingProgType] = useState(false)
  const [pendingTypeChange, setPendingTypeChange] = useState<string | null>(null)

  const applyProgTypeChange = (newType: string) => {
    setSelectedProgType(newType)
    if (newType !== 'Múltiplo') setSelectedProgStages([])
  }

  const handleProgTypeChange = (newType: string) => {
    if (newType === selectedProgType) return
    if (
      selectedProgType === 'Múltiplo' &&
      selectedProgStages.length > 0 &&
      newType !== 'Múltiplo'
    ) {
      setPendingTypeChange(newType)
      return
    }
    applyProgTypeChange(newType)
  }

  const toggleProgStage = (stage: string) => {
    if (selectedProgStages.includes(stage)) {
      setSelectedProgStages(selectedProgStages.filter((s) => s !== stage))
    } else {
      setSelectedProgStages([...selectedProgStages, stage])
    }
  }

  const handleSaveProgrammingType = async () => {
    if (selectedProgType === 'Múltiplo' && selectedProgStages.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Etapas de Programação',
        description: 'Tipo de Programação Múltiplo exige pelo menos duas etapas.',
      })
      return
    }

    const previousType =
      (line.programming_type as string) || (master?.programming_type as string) || ''
    const previousStages = Array.isArray(line.programming_stages)
      ? (line.programming_stages as string[])
      : Array.isArray(master?.programming_stages)
        ? (master.programming_stages as string[])
        : []
    const finalStages = selectedProgType === 'Múltiplo' ? selectedProgStages : []

    setIsSavingProgType(true)
    try {
      await lineMasterService.updateLine(line.id, {
        programming_type: selectedProgType as ProgrammingType,
        programming_stages: finalStages,
      })

      if (master?.id) {
        await lineMasterService.saveLineMaster({
          id: master.id,
          programming_type: selectedProgType as ProgrammingType,
          programming_stages: finalStages,
        })
      }

      try {
        await lineMasterService.recordAuditVersion({
          line_id: line.id,
          line_master_id: master?.id,
          version: master?.version ?? 1,
          action: 'UPDATE',
          changed_fields: ['programming_type', 'programming_stages'],
          change_reason: `Tipo de Programação: "${previousType || selectedProgType}" → "${selectedProgType}"; Etapas: [${previousStages.join(', ')}] → [${finalStages.join(', ')}]`,
          snapshot_data: {
            programming_type: selectedProgType,
            programming_stages: finalStages,
            previous_programming_type: previousType,
            previous_programming_stages: previousStages,
          },
        })
      } catch (auditErr) {
        console.warn('Falha ao registrar auditoria do Tipo de Programação:', auditErr)
      }

      toast({
        title: 'Tipo de Programação Atualizado',
        description: `Tipo "${selectedProgType}" e etapas salvos com sucesso na Ficha Mestre da linha ${line.code}.`,
      })
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar tipo de programação',
        description: err.message,
      })
    } finally {
      setIsSavingProgType(false)
    }
  }

  // Modais de Criação Rápida
  const [isProdModalOpen, setIsProdModalOpen] = useState(false)
  const [isRawModalOpen, setIsRawModalOpen] = useState(false)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [isSetupMatrixModalOpen, setIsSetupMatrixModalOpen] = useState(false)
  const [isScheduledStopModalOpen, setIsScheduledStopModalOpen] = useState(false)

  // Estados dos formulários de modais
  const [prodMaterialCode, setProdMaterialCode] = useState('')
  const [prodMaterialName, setProdMaterialName] = useState('')
  const [prodDim, setProdDim] = useState('')
  const [prodUnit, setProdUnit] = useState<'t/h' | 'peça/h' | 'm/h'>('t/h')
  const [prodNominal, setProdNominal] = useState<number>(12.0)
  const [prodPlanned, setProdPlanned] = useState<number>(11.5)
  const [prodSource, setProdSource] = useState<'MANUAL' | 'SAP'>('MANUAL')
  const [prodSapId, setProdSapId] = useState('')
  const [prodFamilyId, setProdFamilyId] = useState('')

  const [rawCode, setRawCode] = useState('')
  const [rawDesc, setRawDesc] = useState('')
  const [rawGroup, setRawGroup] = useState('Bobinas BQ')
  const [rawOrigin, setRawOrigin] = useState('CSN')
  const [rawPriority, setRawPriority] = useState<number>(1)
  const [rawCond, setRawCond] = useState('')
  const [rawSource, setRawSource] = useState<'MANUAL' | 'SAP'>('MANUAL')
  const [rawSapId, setRawSapId] = useState('')

  const [blkCode, setBlkCode] = useState('')
  const [blkDesc, setBlkDesc] = useState('')
  const [blkReason, setBlkReason] = useState('')
  const [blkType, setBlkType] = useState<any>('TECHNICAL')
  const [blkUser, setBlkUser] = useState('')

  const [stpCode, setStpCode] = useState('')
  const [stpDesc, setStpDesc] = useState('')
  const [stpCat, setStpCat] = useState<any>('TOOL_CHANGE')
  const [stpFromFam, setStpFromFam] = useState('')
  const [stpToFam, setStpToFam] = useState('')
  const [stpDuration, setStpDuration] = useState<number>(60)
  const [stpImpact, setStpImpact] = useState('')

  const [schId, setSchId] = useState<string | null>(null)
  const [schReason, setSchReason] = useState('')
  const [schRelationType, setSchRelationType] = useState<string>('PROGRAMADA_MANUTENCAO')
  const [schGaugeCode, setSchGaugeCode] = useState('')
  const [schGaugeDim, setSchGaugeDim] = useState('')
  const [schDesc, setSchDesc] = useState('')
  const [schDur, setSchDur] = useState<number>(30)
  const [schStartTime, setSchStartTime] = useState<string>('08:00')
  const [schEndTime, setSchEndTime] = useState<string>('08:30')
  const [schTimeApplicable, setSchTimeApplicable] = useState<boolean>(true)
  const [schActive, setSchActive] = useState<boolean>(true)
  const [schRec, setSchRec] = useState<any>('DAILY')
  const [schImpact, setSchImpact] = useState(
    'Redução direta da capacidade útil disponível no turno.',
  )
  const [timeMismatchAlert, setTimeMismatchAlert] = useState<string | null>(null)

  const handleSaveProductivity = async () => {
    if (!prodMaterialCode || !prodMaterialName) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição do produto.',
      })
      return
    }
    if (prodSource === 'SAP' && !prodSapId) {
      toast({
        variant: 'destructive',
        title: 'Origem SAP exige configuração',
        description: 'Vincule obrigatoriamente uma integração RFC/BAPI cadastrada no Catálogo SAP.',
      })
      return
    }

    try {
      await lineMasterService.saveProductivity({
        line_id: line.id,
        line_master_id: master?.id,
        product_family_id: prodFamilyId || undefined,
        material_product_code: prodMaterialCode.trim().toUpperCase(),
        material_product_name: prodMaterialName.trim(),
        dimension_spec: prodDim.trim(),
        productivity_unit: prodUnit,
        nominal_productivity: Number(prodNominal),
        planned_productivity: Number(prodPlanned),
        expected_efficiency_pct: Math.round((Number(prodPlanned) / Number(prodNominal)) * 100),
        source_mode: prodSource,
        sap_integration_id: prodSource === 'SAP' ? prodSapId : undefined,
        active: true,
      })

      toast({
        title: 'Produtividade Cadastrada',
        description: `${prodMaterialCode} (${prodNominal} ${prodUnit}) homologada.`,
      })
      setIsProdModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveRawMaterial = async () => {
    if (!rawCode || !rawDesc) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição do material.',
      })
      return
    }
    if (rawSource === 'SAP' && !rawSapId) {
      toast({
        variant: 'destructive',
        title: 'Origem SAP exige configuração',
        description: 'Vincule uma integração BAPI/Z do Catálogo SAP.',
      })
      return
    }

    try {
      await lineMasterService.saveRawMaterialPriority({
        line_id: line.id,
        line_master_id: master?.id,
        material_code: rawCode.trim().toUpperCase(),
        material_description: rawDesc.trim(),
        material_group: rawGroup,
        material_origin: rawOrigin,
        priority_order: Number(rawPriority),
        condition_rule: rawCond,
        source_mode: rawSource,
        sap_integration_id: rawSource === 'SAP' ? rawSapId : undefined,
        active: true,
      })

      toast({
        title: 'Prioridade de Matéria-Prima Cadastrada',
        description: `Material ${rawCode} cadastrado com prioridade #${rawPriority}.`,
      })
      setIsRawModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveBlockedProduct = async () => {
    if (!blkCode || !blkReason) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código do produto e motivo do bloqueio.',
      })
      return
    }

    try {
      await lineMasterService.saveBlockedProduct({
        line_id: line.id,
        line_master_id: master?.id,
        product_code: blkCode.trim().toUpperCase(),
        product_description: blkDesc.trim() || blkCode,
        block_reason: blkReason.trim(),
        block_type: blkType,
        responsible_user_id: blkUser || undefined,
        source_mode: 'MANUAL',
        active: true,
      })

      toast({
        title: 'Bloqueio de Produto Ativado',
        description: `Produto ${blkCode} bloqueado na linha ${line.code}. Restrição forte de programação.`,
      })
      setIsBlockModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleSaveSetupMatrix = async () => {
    if (!stpCode || !stpDesc) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe código e descrição da transição de setup.',
      })
      return
    }

    try {
      await lineMasterService.saveSetupMatrix({
        line_id: line.id,
        line_master_id: master?.id,
        setup_code: stpCode.trim().toUpperCase(),
        setup_description: stpDesc.trim(),
        setup_category: stpCat,
        from_family_id: stpFromFam || undefined,
        to_family_id: stpToFam || undefined,
        setup_duration_minutes: Number(stpDuration),
        capacity_loss_impact: stpImpact.trim() || 'Troca programada de ferramental',
        source_mode: 'MANUAL',
        active: true,
      })

      toast({
        title: 'Matriz de Setup Cadastrada',
        description: `Transição ${stpCode} (${stpDuration} min) homologada.`,
      })
      setIsSetupMatrixModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  const handleOpenAddScheduledStop = () => {
    setSchId(null)
    setSchReason('')
    setSchRelationType('PROGRAMADA_MANUTENCAO')
    setSchGaugeCode('')
    setSchGaugeDim('')
    setSchDesc('')
    setSchDur(30)
    setSchStartTime('08:00')
    setSchEndTime('08:30')
    setSchTimeApplicable(true)
    setSchActive(true)
    setSchRec('DAILY')
    setSchImpact('Redução direta da capacidade útil disponível no turno.')
    setTimeMismatchAlert(null)
    setIsScheduledStopModalOpen(true)
  }

  const handleOpenEditScheduledStop = (stop: StandardScheduledStop) => {
    setSchId(stop.id)
    setSchReason(stop.reason || stop.code || '')
    setSchRelationType(stop.relation_type || 'PROGRAMADA_MANUTENCAO')
    setSchGaugeCode(stop.gauge_material_code || '')
    setSchGaugeDim(stop.gauge_dimension || '')
    setSchDesc(stop.description || '')
    setSchDur(stop.expected_duration_minutes || 0)
    const isApplicable = stop.time_applicable !== false && !!stop.start_time && !!stop.end_time
    setSchTimeApplicable(isApplicable)
    setSchStartTime(stop.start_time || '08:00')
    setSchEndTime(stop.end_time || '08:30')
    setSchActive(stop.active !== false)
    setSchRec(stop.recurrence || 'DAILY')
    setSchImpact(
      stop.impact ||
        stop.expected_impact ||
        'Redução direta da capacidade útil disponível no turno.',
    )
    setTimeMismatchAlert(null)
    setIsScheduledStopModalOpen(true)
  }

  const handleToggleScheduledStopStatus = async (stop: StandardScheduledStop) => {
    const newStatus = !stop.active
    try {
      await lineMasterService.toggleScheduledStopStatus(stop.id, newStatus)
      toast({
        title: newStatus ? 'Parada Reativada' : 'Parada Inativada',
        description: `A parada "${stop.reason || stop.code}" foi ${
          newStatus
            ? 'reativada (impacta capacidade)'
            : 'inativada (histórico preservado, sem impacto em capacidade)'
        }.`,
      })
      onRefresh()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: err.message,
      })
    }
  }

  const calculateMinutesBetweenTimes = (start: string, end: string): number | null => {
    if (!start || !end) return null
    const [h1, m1] = start.split(':').map(Number)
    const [h2, m2] = end.split(':').map(Number)
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null
    let diff = h2 * 60 + m2 - (h1 * 60 + m1)
    if (diff < 0) diff += 24 * 60 // Atravessou meia-noite
    return diff
  }

  const handleSaveScheduledStop = async () => {
    if (!schReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo da parada programada.',
      })
      return
    }

    if (!schRelationType) {
      toast({
        variant: 'destructive',
        title: 'Tipo de Relação Obrigatório',
        description: 'Selecione o tipo de relação da parada.',
      })
      return
    }

    if (schDur === undefined || schDur === null || Number(schDur) < 0) {
      toast({
        variant: 'destructive',
        title: 'Tempo de Parada Inválido',
        description: 'O tempo de parada em minutos deve ser numérico e maior ou igual a zero.',
      })
      return
    }

    // Regras de Horário: ou os dois preenchidos, ou ambos N/A (timeApplicable = false)
    let finalStartTime: string | null = null
    let finalEndTime: string | null = null

    if (schTimeApplicable) {
      if (!schStartTime || !schEndTime) {
        toast({
          variant: 'destructive',
          title: 'Horários Incompletos',
          description:
            'Quando aplicável, tanto a Hora Início quanto a Hora Fim devem ser informadas (ou marque N/A).',
        })
        return
      }
      finalStartTime = schStartTime
      finalEndTime = schEndTime

      // Validação de divergência entre intervalo e tempo editado
      const calculatedDuration = calculateMinutesBetweenTimes(schStartTime, schEndTime)
      if (calculatedDuration !== null && calculatedDuration !== Number(schDur)) {
        setTimeMismatchAlert(
          `Atenção: O intervalo entre ${schStartTime} e ${schEndTime} é de ${calculatedDuration} min, divergente dos ${schDur} min informados.`,
        )
      } else {
        setTimeMismatchAlert(null)
      }
    } else {
      finalStartTime = null
      finalEndTime = null
      setTimeMismatchAlert(null)
    }

    try {
      const generatedCode = schReason.trim().slice(0, 20).toUpperCase().replace(/\s+/g, '_')
      await lineMasterService.saveScheduledStop({
        id: schId || undefined,
        line_id: line.id,
        line_master_id: master?.id,
        code: generatedCode || 'STOP_PROG',
        reason: schReason.trim(),
        relation_type: schRelationType as any,
        gauge_material_code: schGaugeCode.trim() || undefined,
        gauge_dimension: schGaugeDim.trim() || undefined,
        description: schDesc.trim() || schReason.trim(),
        category: 'PREVENTIVE',
        recurrence: schRec,
        expected_duration_minutes: Number(schDur),
        start_time: finalStartTime,
        end_time: finalEndTime,
        time_applicable: schTimeApplicable,
        scheduled_time: finalStartTime || 'N/A',
        impact: schImpact,
        active: schActive,
      })

      toast({
        title: schId ? 'Parada Programada Atualizada' : 'Parada Programada Criada',
        description: `Parada "${schReason}" persistida com sucesso. Impacto em capacidade atualizado.`,
      })
      setIsScheduledStopModalOpen(false)
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header da Linha */}
      <div className="p-5 bg-gradient-to-r from-[#004C97] via-[#003870] to-slate-950 rounded-xl border border-blue-900/80 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-black text-2xl tracking-tight text-white">
              {line.code}
            </span>
            <span className="text-sm font-semibold text-blue-200">• {line.name}</span>
            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-500 font-bold text-xs">
              {line.status}
            </Badge>
            {master && (
              <Badge className="bg-blue-950 text-cyan-300 border-cyan-600 font-mono text-xs">
                Ficha Mestre v{master.version}
              </Badge>
            )}

            {/* Indicador no cabeçalho da Ficha Mestre com botão clicável para abrir o Painel de Completude */}
            {(() => {
              const currentScore = completenessResult ? completenessResult.percentage : completeness
              const currentStatus = completenessResult
                ? completenessResult.status
                : completeness >= 80
                  ? 'Quase completa'
                  : 'Em preenchimento'
              const badgeTheme =
                currentScore >= 100
                  ? 'bg-emerald-900 text-emerald-100 border-emerald-400'
                  : currentScore >= 80
                    ? 'bg-blue-900 text-cyan-200 border-cyan-400'
                    : currentScore >= 50
                      ? 'bg-amber-900 text-amber-100 border-amber-400'
                      : 'bg-rose-900 text-rose-100 border-rose-400'

              return (
                <button
                  type="button"
                  onClick={() => setIsCompletenessModalOpen(true)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-all hover:scale-105 cursor-pointer flex items-center gap-1.5 shadow-xs ${badgeTheme}`}
                  title="Clique para ver o Painel de Completude da Ficha Mestre e pendências"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ficha Mestre — {currentScore}% preenchida</span>
                  <span className="opacity-75 font-normal">({currentStatus})</span>
                </button>
              )
            })()}

            <Badge
              className={`text-xs font-bold ${
                readyForScheduling
                  ? 'bg-emerald-900 text-emerald-200 border-emerald-500'
                  : 'bg-amber-900 text-amber-200 border-amber-500'
              }`}
            >
              {readyForScheduling ? 'Pronta para Programação (Ready)' : 'Ajustes Pendentes'}
            </Badge>
          </div>
          <p className="text-xs text-blue-100/80">
            {line.description ||
              'Linha de produção industrial configurada para o PCP Robotizado CIAFAL.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenSapCatalog}
            className="bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-800 text-xs font-bold h-8 gap-1.5"
          >
            <Database className="w-3.5 h-3.5" /> Catálogo SAP
          </Button>
          <Button
            size="sm"
            onClick={onRefresh}
            variant="outline"
            className="border-blue-700 bg-blue-950/40 text-white hover:bg-blue-900 text-xs h-8 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>
        </div>
      </div>

      {/* 2. Menu Interno de Navegação por Grupos */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
        <button
          onClick={() => setMainGroup('OVERVIEW')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'OVERVIEW'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> VISÃO GERAL DA LINHA
        </button>

        <button
          onClick={() => setMainGroup('ORGANIZATION')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'ORGANIZATION'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> ORGANIZAÇÃO & APROVADORES (
          {managers.length + approvers.length})
        </button>

        <button
          onClick={() => setMainGroup('PROCESS')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'PROCESS'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <GitCommit className="w-3.5 h-3.5" /> PROCESSO & SEQUENCIAMENTO ({sequencing.length})
        </button>

        <button
          onClick={() => setMainGroup('MASTERDATA')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'MASTERDATA'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> FICHA MESTRE EXPANDIDA
        </button>

        <button
          onClick={() => setMainGroup('BOTTLENECK_MATRIX')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'BOTTLENECK_MATRIX'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-rose-400 hover:text-rose-200 hover:bg-slate-900'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> MATRIZ DE GARGALOS DINÂMICA
        </button>

        <button
          onClick={() => setMainGroup('GOVERNANCE')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
            mainGroup === 'GOVERNANCE'
              ? 'bg-[#004C97] text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> GOVERNANÇA & FONTES SAP ({sapCatalog.length})
        </button>
      </div>

      {/* 3. CONTEÚDO: GRUPO 1 - VISÃO GERAL */}
      {mainGroup === 'OVERVIEW' && (
        <div className="space-y-5">
          {/* Configuração de Tipo de Programação */}
          <Card className="bg-white border-slate-200 text-slate-900 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  Tipo de Programação & Etapas da Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Define a modalidade de sequenciamento e roteamento operacional para a linha{' '}
                  {line.code}.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={handleSaveProgrammingType}
                disabled={isSavingProgType}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-7 gap-1 shadow-xs"
              >
                {isSavingProgType ? 'Salvando...' : 'Salvar Tipo de Programação'}
              </Button>
            </CardHeader>

            <CardContent className="p-4 pt-3 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Tipo de Programação Principal
                  </Label>
                  <select
                    value={selectedProgType}
                    onChange={(e) => handleProgTypeChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs font-medium text-slate-900 focus:ring-1 focus:ring-[#004C97]"
                  >
                    {PROGRAMMING_TYPES_CATALOG.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Modalidade operacional persistida no cadastro da linha e na ficha mestre.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    Status do Cadastro
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono font-bold text-[#004C97]">{line.code}</span>
                    <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-bold">
                      {selectedProgType}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedProgType === 'Múltiplo' && (
                <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-[#004C97] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Etapas de Programação Habilitadas (selecione 2 ou mais) *
                    </Label>
                    <span className="text-[11px] font-bold text-slate-600">
                      {selectedProgStages.length} selecionada(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
                    {MULTIPLE_PROGRAMMING_STAGES_CATALOG.map((stage) => {
                      const isChecked = selectedProgStages.includes(stage)
                      return (
                        <label
                          key={stage}
                          className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-100/70 border-[#004C97] text-[#004C97] font-semibold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleProgStage(stage)}
                            className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                          />
                          <span>{stage}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Confirmação de troca saindo de Múltiplo */}
          <Dialog
            open={pendingTypeChange !== null}
            onOpenChange={(open) => {
              if (!open) setPendingTypeChange(null)
            }}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmar troca de Tipo de Programação</DialogTitle>
                <DialogDescription>
                  {pendingTypeChange
                    ? `Mudar de Múltiplo para ${pendingTypeChange} removerá as etapas adicionais associadas. Deseja continuar?`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setPendingTypeChange(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    const newType = pendingTypeChange
                    setPendingTypeChange(null)
                    if (newType) applyProgTypeChange(newType)
                  }}
                  className="bg-[#004C97] hover:bg-[#003870] text-white"
                >
                  Confirmar alteração
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Alertas de Configuração */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Diagnóstico & Alertas de Configuração ({alerts.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-lg border text-xs flex items-start gap-3 ${
                      alt.level === 'CRITICAL'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : alt.level === 'WARNING'
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-cyan-950/40 border-cyan-800 text-cyan-200'
                    }`}
                  >
                    {alt.level === 'CRITICAL' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    ) : alt.level === 'WARNING' ? (
                      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <span className="font-bold block">{alt.title}</span>
                      <p className="text-[11px] opacity-90">{alt.description}</p>
                      {alt.resolutionAction && (
                        <span className="text-[10px] uppercase font-mono font-bold text-cyan-300 block pt-0.5">
                          → {alt.resolutionAction}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cards Principais 360 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Gestor Responsável Titular
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {managers.length > 0 ? (
                  <div>
                    <span className="text-base font-bold text-white block">
                      {managers[0].expand?.user_id?.name || 'Gestor Vinculado'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {managers[0].role_title}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-rose-400 italic">Nenhum gestor cadastrado</span>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Aprovador Homologador
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {approvers.length > 0 ? (
                  <div>
                    <span className="text-base font-bold text-white block">
                      {approvers[0].expand?.user_id?.name || 'Aprovador PCP'}
                    </span>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      {approvers[0].role_title} ({approvers[0].requirement_type})
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-400 italic">
                    Aprovação Não Requerida / Opcional
                  </span>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Capacidade Nominal
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-white font-mono">
                    {master?.nominal_hourly_capacity || line.current_rate || 0}
                  </span>
                  <span className="text-xs text-cyan-400 font-bold">
                    {master?.capacity_unit || 't/h'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Eficiência Esperada: {master?.planned_efficiency_pct || line.efficiency || 90}%
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => setIsCompletenessModalOpen(true)}
              className="bg-slate-950 border-slate-800 hover:border-cyan-500 transition-all cursor-pointer text-slate-100 group"
              title="Clique para abrir o Painel de Completude da Ficha Mestre"
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Completude da Ficha Mestre
                  </CardTitle>
                  <span className="text-[10px] text-cyan-400 font-semibold group-hover:underline">
                    Ver Painel &rarr;
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {(() => {
                  const score = completenessResult ? completenessResult.percentage : completeness
                  const status = completenessResult
                    ? completenessResult.status
                    : score >= 80
                      ? 'Quase completa'
                      : 'Em preenchimento'
                  return (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg font-black text-cyan-300 font-mono">{score}%</span>
                        <Badge className="bg-slate-800 text-slate-200 text-[10px] font-semibold">
                          {status}
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            score >= 100
                              ? 'bg-emerald-500'
                              : score >= 80
                                ? 'bg-cyan-500'
                                : score >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 block pt-1.5">
                        {completenessResult
                          ? `${completenessResult.totalFulfilled} de ${completenessResult.totalApplicable} parâmetros preenchidos`
                          : 'Preenchimento: ' + score + '%'}
                      </span>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Dados Técnicos e Mapeamento SAP / MES */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Mapeamento de Centros e Sistemas Corporativos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Centro SAP (Werk):</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {line.sap_plant_code || master?.sap_plant_code || '1000 (CIAFAL)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Centro de Trabalho SAP:</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {line.sap_work_center || 'CRHD_LAM_L1'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Equipamento SAP:</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {line.sap_equipment_id || 'EQ-100293'}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-slate-400 block">Identificador Telemetria MES:</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {line.mes_identifier || 'MES_OPC_L1'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 4. CONTEÚDO: GRUPO 2 - ORGANIZAÇÃO & APROVADORES */}
      {mainGroup === 'ORGANIZATION' && (
        <div className="space-y-6">
          {/* Hierarquia Organizacional */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Hierarquia Organizacional Associada à Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Estrutura corporativa do HUB CIAFAL (Diretoria → Gerência → Supervisão → Gestor →
                  Operação).
                </CardDescription>
              </div>
              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px]">
                CONECTADO_HUB
              </Badge>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {hierarchy.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-950 text-cyan-300 border border-blue-800 flex items-center justify-center font-bold text-xs">
                        #{h.org_level_order}
                      </div>
                      <div>
                        <span className="font-bold text-white block">{h.org_level_name}</span>
                        <span className="text-[11px] text-slate-400">
                          {h.area_name} • Cargo:{' '}
                          <strong className="text-slate-300">{h.job_title}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-cyan-300 block">
                        {h.expand?.user_id?.name || 'Pendente de Atribuição'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {h.expand?.user_id?.email || 'HUB Central'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gestores da Linha */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Gestores Operacionais da Linha
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Gestor Titular, Substituto e Adicionais vinculados aos usuários do HUB.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {managers.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">
                        {m.expand?.user_id?.name || 'Gestor'}
                      </span>
                      <Badge
                        className={`text-[10px] ${
                          m.responsibility_type === 'PRIMARY_MANAGER'
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                            : 'bg-amber-950 text-amber-300 border-amber-700'
                        }`}
                      >
                        {m.responsibility_type}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 block">{m.role_title}</span>
                    <p className="text-[11px] text-slate-300 bg-slate-950 p-2 rounded border border-slate-800">
                      {m.scope_description || 'Responsável operacional pela linha.'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Matriz de Aprovadores */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Matriz de Aprovadores da Linha (Workflow de Aprovação)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Definição de alçadas: Estágio 1 (PCP) → Estágio 2 (Gestor de Linha) → Qualidade /
                  Diretor.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Ordem</th>
                      <th className="p-2.5">Estágio / Tipo</th>
                      <th className="p-2.5">Aprovador Homologador</th>
                      <th className="p-2.5">Substituto Homologado</th>
                      <th className="p-2.5">Exigência</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {approvers.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-900/60">
                        <td className="p-2.5 font-bold text-cyan-300">#{a.sequence_order}</td>
                        <td className="p-2.5">
                          <span className="font-semibold text-white block">{a.approval_stage}</span>
                          <span className="text-[10px] text-slate-400">{a.approval_type}</span>
                        </td>
                        <td className="p-2.5 font-medium text-white">
                          {a.expand?.user_id?.name || 'Aprovador'}
                        </td>
                        <td className="p-2.5 text-slate-400">
                          {a.expand?.substitute_user_id?.name || 'Não cadastrado'}
                        </td>
                        <td className="p-2.5">
                          <Badge
                            className={`text-[10px] ${
                              a.requirement_type === 'MANDATORY'
                                ? 'bg-rose-950 text-rose-300 border-rose-700 font-bold'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {a.requirement_type}
                          </Badge>
                        </td>
                        <td className="p-2.5">
                          <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                            Ativo
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. CONTEÚDO: GRUPO 3 - PROCESSO & SEQUENCIAMENTO */}
      {mainGroup === 'PROCESS' && (
        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-cyan-400" />
                Sequenciamento Estrutural no Fluxo Produtivo
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Dependências físicas e fluxos entre linhas (Predecessores → Esta Linha → Sucessores
                & Pulmões).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 pt-2 space-y-4">
              {sequencing.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Nenhum sequenciamento produtivo cadastrado para esta linha.
                </div>
              ) : (
                sequencing.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#004C97] text-white font-mono text-xs">
                          Etapa #{s.sequence_order}
                        </Badge>
                        <span className="text-xs font-bold text-white">
                          Relação {s.relation_nature} ({s.dependency_type})
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[11px] border-cyan-800 text-cyan-300 font-mono"
                      >
                        Lead Time Padrão: {s.standard_lead_time_minutes || 0} min
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                        <span className="text-slate-400 block uppercase text-[10px] font-bold text-amber-400">
                          ← Origem / Predecessor
                        </span>
                        <span className="font-bold text-white block">
                          {s.previous_process_name || 'Processo Externo / Matéria-Prima'}
                        </span>
                        {s.expand?.previous_line_id && (
                          <span className="text-cyan-400 font-mono text-[11px]">
                            Linha: {s.expand.previous_line_id.code} (
                            {s.expand.previous_line_id.name})
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                        <span className="text-slate-400 block uppercase text-[10px] font-bold text-emerald-400">
                          → Destino / Sucessor
                        </span>
                        <span className="font-bold text-white block">
                          {s.next_process_name || 'Expedição / Estoque Intermediário'}
                        </span>
                        {s.expand?.next_line_id && (
                          <span className="text-cyan-400 font-mono text-[11px]">
                            Linha: {s.expand.next_line_id.code} ({s.expand.next_line_id.name})
                          </span>
                        )}
                      </div>
                    </div>

                    {s.intermediate_buffer_type && (
                      <div className="p-2.5 bg-blue-950/30 rounded border border-blue-900/60 text-xs flex items-center justify-between">
                        <span className="text-blue-200">
                          Pulmão: <strong>{s.intermediate_buffer_type}</strong>
                        </span>
                        <span className="font-mono font-bold text-cyan-300">
                          Capacidade: {s.intermediate_buffer_capacity} {s.intermediate_buffer_unit}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. CONTEÚDO: GRUPO 4 - FICHA MESTRE EXPANDIDA */}
      {mainGroup === 'MASTERDATA' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800">
            <Button
              size="sm"
              variant={masterSubTab === 'CAPACITY' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('CAPACITY')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'CAPACITY' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Capacidade & Paradas Programadas
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'SHIFTS_CREWS' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('SHIFTS_CREWS')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'SHIFTS_CREWS' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Turnos & Turmas ({shifts.length}T /{' '}
              {overview.crews?.length || 0}E)
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'MATRIZ_GARGALOS' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('MATRIZ_GARGALOS')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'MATRIZ_GARGALOS' ? 'bg-rose-600 text-white' : 'text-rose-400'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Matriz de Gargalos Integrada
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'PRODUCTIVITY' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('PRODUCTIVITY')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'PRODUCTIVITY' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Produtividade ({productivity.length})
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'RAW_MATERIALS' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('RAW_MATERIALS')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'RAW_MATERIALS' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Prioridades de Matéria-Prima ({rawMaterials.length}
              )
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'BLOCKED' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('BLOCKED')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'BLOCKED' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Lock className="w-3.5 h-3.5" /> Produtos Bloqueados ({blockedProducts.length})
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'SETUP_MATRIX' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('SETUP_MATRIX')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'SETUP_MATRIX' ? 'bg-[#004C97] text-white' : 'text-slate-400'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Matriz de Setup De→Para ({setupMatrix.length})
            </Button>

            <Button
              size="sm"
              variant={masterSubTab === 'IDEAL_GAUGE_SEQUENCE' ? 'default' : 'ghost'}
              onClick={() => setMasterSubTab('IDEAL_GAUGE_SEQUENCE')}
              className={`text-xs h-7 gap-1 font-bold ${
                masterSubTab === 'IDEAL_GAUGE_SEQUENCE'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-400'
              }`}
            >
              <ArrowDownUp className="w-3.5 h-3.5" /> Sequência Ideal de Bitolas & Tolerâncias
            </Button>
          </div>

          {/* Sub-aba: Turnos & Turmas */}
          {masterSubTab === 'SHIFTS_CREWS' && (
            <LineShiftsAndCrewsPanel
              line={line}
              shifts={shifts}
              crews={overview.crews || []}
              shiftCrews={overview.shiftCrews || []}
              onRefresh={onRefresh}
            />
          )}

          {/* Sub-aba: Matriz de Gargalos */}
          {masterSubTab === 'MATRIZ_GARGALOS' && (
            <LineBottleneckMatrixPanel lineCode={line?.code || 'L1'} lineName={line?.name} />
          )}

          {/* Sub-aba: Capacidade & Paradas */}
          {masterSubTab === 'CAPACITY' && (
            <div className="space-y-4">
              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Capacidades Nominais da Linha
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade Horária:</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {master?.nominal_hourly_capacity || 0} {master?.capacity_unit || 't/h'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade por Turno:</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {master?.nominal_shift_capacity || 0} {master?.capacity_unit || 't'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade Diária (3T):</span>
                      <span className="text-lg font-mono font-bold text-white">
                        {master?.nominal_daily_capacity || 0} {master?.capacity_unit || 't'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <span className="text-slate-400 block">Capacidade Mensal:</span>
                      <span className="text-lg font-mono font-bold text-cyan-300">
                        {master?.nominal_monthly_capacity || 0} {master?.capacity_unit || 't'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-950 border-slate-800 text-slate-100">
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <PauseCircle className="w-4 h-4 text-amber-400" />
                      Paradas Programadas que Reduzem Capacidade
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      Paradas padrão de rotina que abatem capacidade líquida (Manutenção preventiva,
                      limpeza, reuniões).
                      <strong className="text-amber-300 block pt-0.5">
                        * Paradas extraordinárias são alimentadas via integração SAP ZPP003.
                      </strong>
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOpenAddScheduledStop}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-7 gap-1 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Adicionar Parada
                  </Button>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Motivo</th>
                          <th className="p-2.5">Tipo Relação</th>
                          <th className="p-2.5">Bitola</th>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5">Tempo (min)</th>
                          <th className="p-2.5">Início</th>
                          <th className="p-2.5">Fim</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {scheduledStops.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-slate-400 italic">
                              Nenhuma parada programada cadastrada para esta linha.
                            </td>
                          </tr>
                        ) : (
                          scheduledStops.map((ss) => {
                            const isTimeApplicable =
                              ss.time_applicable !== false && !!ss.start_time && !!ss.end_time
                            const relationLabels: Record<string, string> = {
                              PROGRAMADA_MANUTENCAO: 'Manutenção Programada',
                              TROCA_CAMPANHA: 'Troca de Campanha',
                              LIMPEZA_5S: 'Limpeza & 5S',
                              SETUP_BITOLA: 'Setup de Bitola',
                              REFEICAO_DDS: 'Refeição / DDS',
                              OUTROS: 'Outros',
                            }
                            return (
                              <tr
                                key={ss.id}
                                className={`hover:bg-slate-900/60 transition-colors ${
                                  !ss.active ? 'opacity-60 bg-slate-950/40' : ''
                                }`}
                              >
                                <td className="p-2.5 font-bold text-white">
                                  {ss.reason || ss.code}
                                </td>
                                <td className="p-2.5">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-cyan-800 text-cyan-300 bg-cyan-950/40"
                                  >
                                    {relationLabels[ss.relation_type || ''] ||
                                      ss.relation_type ||
                                      'PROGRAMADA_MANUTENCAO'}
                                  </Badge>
                                </td>
                                <td className="p-2.5 font-mono text-[11px] text-amber-200">
                                  {ss.gauge_material_code ? (
                                    <span>
                                      {ss.gauge_material_code}
                                      {ss.gauge_dimension ? ` (${ss.gauge_dimension})` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">Todas</span>
                                  )}
                                </td>
                                <td
                                  className="p-2.5 text-slate-200 max-w-xs truncate"
                                  title={ss.description}
                                >
                                  {ss.description}
                                </td>
                                <td className="p-2.5 font-mono font-bold text-amber-300">
                                  {ss.expected_duration_minutes} min
                                </td>
                                <td className="p-2.5 font-mono text-[11px]">
                                  {isTimeApplicable ? (
                                    <span className="text-slate-200">{ss.start_time}</span>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] border-slate-700 text-slate-400"
                                    >
                                      N/A
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono text-[11px]">
                                  {isTimeApplicable ? (
                                    <span className="text-slate-200">{ss.end_time}</span>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] border-slate-700 text-slate-400"
                                    >
                                      N/A
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {ss.active ? (
                                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                                      Ativa
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-800 text-slate-400 border-slate-600 text-[10px]">
                                      Inativa
                                    </Badge>
                                  )}
                                </td>
                                <td className="p-2.5 text-right space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleOpenEditScheduledStop(ss)}
                                    className="h-6 px-2 text-[11px] text-cyan-300 hover:text-cyan-200 hover:bg-slate-800"
                                  >
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleToggleScheduledStopStatus(ss)}
                                    className={`h-6 px-2 text-[11px] ${
                                      ss.active
                                        ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/30'
                                        : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                                    }`}
                                  >
                                    {ss.active ? 'Inativar' : 'Ativar'}
                                  </Button>
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
            </div>
          )}

          {/* Sub-aba: Produtividade */}
          {masterSubTab === 'PRODUCTIVITY' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    Tabela de Produtividade & Cadência de Materiais
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Cadência nominal e planejada por produto, família e dimensão (Unidades: t/h,
                    peça/h, m/h).
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsProdModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Produtividade
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Produto / Material</th>
                        <th className="p-2.5">Dimensão</th>
                        <th className="p-2.5">Unidade</th>
                        <th className="p-2.5">Prod. Nominal</th>
                        <th className="p-2.5">Prod. Planejada</th>
                        <th className="p-2.5">Eficiência</th>
                        <th className="p-2.5">Fonte Oficial</th>
                        <th className="p-2.5">Status Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {productivity.map((p) => {
                        const isSap = p.source_mode === 'SAP'
                        return (
                          <tr key={p.id} className="hover:bg-slate-900/60">
                            <td className="p-2.5">
                              <span className="font-mono font-bold text-white block">
                                {p.material_product_code}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {p.material_product_name}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-slate-300">
                              {p.dimension_spec || '-'}
                            </td>
                            <td className="p-2.5 font-bold text-cyan-300">{p.productivity_unit}</td>
                            <td className="p-2.5 font-mono font-bold text-white">
                              {p.nominal_productivity}
                            </td>
                            <td className="p-2.5 font-mono text-slate-200">
                              {p.planned_productivity}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-400 font-bold">
                              {p.expected_efficiency_pct}%
                            </td>
                            <td className="p-2.5">
                              <Badge
                                className={`text-[10px] ${
                                  isSap
                                    ? 'bg-blue-950 text-cyan-300 border-blue-700'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {p.source_mode}
                              </Badge>
                            </td>
                            <td className="p-2.5">
                              {isSap ? (
                                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                                  {p.expand?.sap_integration_id?.last_status || 'CONECTADO'}
                                </Badge>
                              ) : (
                                <span className="text-slate-500 font-mono text-[10px]">
                                  Manual Homologado
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-aba: Prioridades de MP */}
          {masterSubTab === 'RAW_MATERIALS' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Prioridades de Matéria-Prima & Bobinas
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Materiais preferenciais para a programação (1 = Prioridade Máxima).
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRawModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Matéria-Prima
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Prioridade</th>
                        <th className="p-2.5">Material</th>
                        <th className="p-2.5">Origem / Fornecedor</th>
                        <th className="p-2.5">Regra / Condição</th>
                        <th className="p-2.5">Fonte</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {rawMaterials.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5">
                            <Badge className="bg-amber-950 text-amber-300 border-amber-600 font-mono font-bold text-xs">
                              #{r.priority_order}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono font-bold text-white block">
                              {r.material_code}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {r.material_description}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300 font-medium">
                            {r.material_origin || 'CSN / Gerdau'}
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-400">
                            {r.condition_rule || 'Uso Padrão'}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {r.source_mode}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                              Ativo
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-aba: Produtos Bloqueados */}
          {masterSubTab === 'BLOCKED' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Produtos Bloqueados na Linha (Restrição Forte de Programação)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Materiais que NÃO podem ser alocados nesta linha sob nenhuma circunstância.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsBlockModalOpen(true)}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Bloqueio
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Produto</th>
                        <th className="p-2.5">Tipo do Bloqueio</th>
                        <th className="p-2.5">Motivo Técnico do Bloqueio</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {blockedProducts.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5">
                            <span className="font-mono font-bold text-rose-400 block">
                              {b.product_code}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {b.product_description}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <Badge className="bg-rose-950 text-rose-300 border-rose-800 text-[10px]">
                              {b.block_type}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-xs text-slate-300 max-w-md">
                            {b.block_reason}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {b.expand?.responsible_user_id?.name || 'Sistema'}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {b.source_mode}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-aba: Matriz de Setup */}
          {masterSubTab === 'SETUP_MATRIX' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-cyan-400" />
                    Matriz De → Para de Trocas de Setup
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Tempos de transição entre famílias, produtos e ferramentas de conformação.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsSetupMatrixModalOpen(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-7 gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Transição de Setup
                </Button>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Código Setup</th>
                        <th className="p-2.5">Descrição</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Transição (De → Para)</th>
                        <th className="p-2.5">Duração Padrão</th>
                        <th className="p-2.5">Fonte</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {setupMatrix.map((sm) => (
                        <tr key={sm.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5 font-mono font-bold text-cyan-300">
                            {sm.setup_code}
                          </td>
                          <td className="p-2.5 text-slate-200">{sm.setup_description}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {sm.setup_category}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-300">
                            {sm.expand?.from_family_id?.name || 'Qualquer'} →{' '}
                            {sm.expand?.to_family_id?.name || 'Qualquer'}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-amber-300">
                            {sm.setup_duration_minutes} min
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px] border-slate-700">
                              {sm.source_mode}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-aba: Sequência Ideal de Bitolas */}
          {masterSubTab === 'IDEAL_GAUGE_SEQUENCE' && (
            <Card className="bg-slate-950 border-slate-800 text-slate-100">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowDownUp className="w-4 h-4 text-amber-400" />
                    Sequência Ideal de Bitolas, Tempo de Ciclo SAP & Cobertura Máxima
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Encadeamento metalúrgico ótimo por família/subsequência, ciclo de máquina
                    oficial SAP/MRP e tolerância parametrizada.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-950 text-amber-300 border-amber-600 text-xs font-mono">
                  Matriz Metalúrgica CIAFAL
                </Badge>
              </CardHeader>

              <CardContent className="p-4 pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Ordem Família</th>
                        <th className="p-2.5">Família</th>
                        <th className="p-2.5">Subsequência</th>
                        <th className="p-2.5">Bitola / Dimensão</th>
                        <th className="p-2.5">Material SAP</th>
                        <th className="p-2.5">Ciclo Médio SAP</th>
                        <th className="p-2.5">Tolerância Ciclo</th>
                        <th className="p-2.5">Cobertura Máx.</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {[
                        {
                          famOrder: 1,
                          famName: 'Tubo Quadrado',
                          subSeq: 1,
                          gauge: '40x40 mm #1.50',
                          matCode: 'TQ-GALV-40x40',
                          matDesc: 'TUBO PRE-GALV Z275 40X40X1,50MM',
                          cycleMin: 36,
                          tolPct: 10,
                          maxCovDays: 30,
                        },
                        {
                          famOrder: 1,
                          famName: 'Tubo Quadrado',
                          subSeq: 2,
                          gauge: '50x50 mm #2.00',
                          matCode: 'TQ-50x50x2.0',
                          matDesc: 'TUBO QUADRADO ASTM A500 50X50X2,00MM',
                          cycleMin: 42,
                          tolPct: 10,
                          maxCovDays: 30,
                        },
                        {
                          famOrder: 1,
                          famName: 'Tubo Quadrado',
                          subSeq: 3,
                          gauge: '100x100 mm #8.00',
                          matCode: 'TQ-100x100x8.0',
                          matDesc: 'TUBO QUADRADO ASTM A36 100X100X8,00MM',
                          cycleMin: 68,
                          tolPct: 12,
                          maxCovDays: 20,
                        },
                        {
                          famOrder: 2,
                          famName: 'Tubo Retangular',
                          subSeq: 1,
                          gauge: '80x40 mm #2.50',
                          matCode: 'TR-80x40x2.5',
                          matDesc: 'TUBO RETANGULAR ASTM A500 80X40X2,50MM',
                          cycleMin: 55,
                          tolPct: 10,
                          maxCovDays: 30,
                        },
                        {
                          famOrder: 3,
                          famName: 'Perfil U',
                          subSeq: 1,
                          gauge: '100x40 mm #1.20',
                          matCode: 'PU-FINO-1.20',
                          matDesc: 'PERFIL U SIMPLES NBR 6355 100X40X1,20MM',
                          cycleMin: 50,
                          tolPct: 10,
                          maxCovDays: 25,
                        },
                        {
                          famOrder: 3,
                          famName: 'Perfil U',
                          subSeq: 2,
                          gauge: '150x50 mm #4.75',
                          matCode: 'PU-150x50x4.75',
                          matDesc: 'PERFIL U ENRIJECIDO NBR 6355 150X50X4,75MM',
                          cycleMin: 48,
                          tolPct: 10,
                          maxCovDays: 35,
                        },
                      ].map((seq, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="p-2.5 font-mono font-bold text-amber-300">
                            #{seq.famOrder}
                          </td>
                          <td className="p-2.5 font-bold text-white">{seq.famName}</td>
                          <td className="p-2.5 font-mono text-cyan-300">Sub. {seq.subSeq}</td>
                          <td className="p-2.5 font-mono text-slate-200">{seq.gauge}</td>
                          <td className="p-2.5 font-mono text-white">
                            <span className="block font-bold">{seq.matCode}</span>
                            <span className="text-[10px] text-slate-400 font-sans">
                              {seq.matDesc}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-emerald-400">
                            {seq.cycleMin} min
                          </td>
                          <td className="p-2.5 font-mono text-slate-300">±{seq.tolPct}%</td>
                          <td className="p-2.5 font-mono font-bold text-blue-300">
                            {seq.maxCovDays} dias
                          </td>
                          <td className="p-2.5">
                            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-600 text-[10px]">
                              HOMOLOGADA
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* NOVO GRUPO: MATRIZ DE GARGALOS DINÂMICA */}
      {mainGroup === 'BOTTLENECK_MATRIX' && (
        <LineBottleneckMatrixPanel lineCode={line?.code || 'L1'} lineName={line?.name} />
      )}

      {/* 7. CONTEÚDO: GRUPO 5 - GOVERNANÇA & FONTES SAP */}
      {mainGroup === 'GOVERNANCE' && (
        <div className="space-y-6">
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  Fontes de Dados Conectadas à Linha (SAP vs MANUAL)
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Governança das integrações RFC/BAPI e trilha auditável de alteração de origem.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={onOpenSapCatalog}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 font-bold gap-1.5"
              >
                <Server className="w-3.5 h-3.5" /> Abrir Catálogo Central SAP
              </Button>
            </CardHeader>

            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 uppercase block text-[11px]">
                    Extrator de Produtividade SAP
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Sincronização de cadências e tempos de roteiro a partir do módulo standard RFC.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <Badge className="bg-blue-950 text-cyan-300 border-blue-700 font-mono text-[10px]">
                      BAPI_ROUTING_GET_DETAIL
                    </Badge>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">CONECTADO</Badge>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-300 uppercase block text-[11px]">
                    Extrator Customizado CIAFAL (Z)
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Prioridades de bobinas e matérias-primas homologadas no SAP ECC.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <Badge className="bg-amber-950 text-amber-300 border-amber-700 font-mono text-[10px]">
                      Z_CIAFAL_PCP_RAW_MAT_PRIORITY
                    </Badge>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                      CUSTOM CIAFAL
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-rose-300 uppercase block text-[11px]">
                    Bloqueios de Qualidade QM/PP
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Restrições fortes e bloqueios de engenharia importados do SAP.
                  </p>
                  <div className="pt-2 flex items-center justify-between">
                    <Badge className="bg-rose-950 text-rose-300 border-rose-700 font-mono text-[10px]">
                      Z_CIAFAL_PP_BLOCKED_MATERIALS
                    </Badge>
                    <Badge className="bg-emerald-950 text-emerald-300 text-[10px]">
                      CUSTOM CIAFAL
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico & Trilha de Versões */}
          <Card className="bg-slate-950 border-slate-800 text-slate-100">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Histórico de Versões & Auditoria da Linha
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {history.length === 0 ? (
                  <span className="text-xs text-slate-500">Nenhum histórico registrado ainda.</span>
                ) : (
                  history.map((h) => (
                    <div
                      key={h.id}
                      className="p-3 bg-slate-900/70 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[#004C97] text-white font-mono text-[10px]">
                          v{h.version}
                        </Badge>
                        <div>
                          <span className="font-bold text-white block">{h.action}</span>
                          <span className="text-[11px] text-slate-400">{h.change_reason}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-slate-400">
                        <span className="block font-medium text-slate-300">
                          {h.expand?.changed_by?.name || 'Sistema'}
                        </span>
                        <span>{new Date(h.created).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Cadastrar Produtividade */}
      <Dialog open={isProdModalOpen} onOpenChange={setIsProdModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              Cadastrar Produtividade de Material
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código do Produto / Material</Label>
                <Input
                  placeholder="Ex: TQ-50x50x2.0"
                  value={prodMaterialCode}
                  onChange={(e) => setProdMaterialCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Família de Produtos</Label>
                <select
                  value={prodFamilyId}
                  onChange={(e) => setProdFamilyId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Selecione a família...</option>
                  {productFamilies.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} - {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição do Material</Label>
              <Input
                placeholder="Ex: Tubo Quadrado 50x50x2.00mm SAE 1012"
                value={prodMaterialName}
                onChange={(e) => setProdMaterialName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Unidade de Medida</Label>
                <select
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="t/h">t/h (Toneladas/h)</option>
                  <option value="peça/h">peça/h</option>
                  <option value="m/h">m/h</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Prod. Nominal</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={prodNominal}
                  onChange={(e) => setProdNominal(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Prod. Planejada</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={prodPlanned}
                  onChange={(e) => setProdPlanned(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-cyan-400">Origem do Cadastro</Label>
                <select
                  value={prodSource}
                  onChange={(e) => setProdSource(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-1"
                >
                  <option value="MANUAL">MANUAL (Auditável)</option>
                  <option value="SAP">SAP (RFC / BAPI)</option>
                </select>
              </div>

              {prodSource === 'SAP' && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">
                    Integração do Catálogo SAP (Obrigatório)
                  </Label>
                  <select
                    value={prodSapId}
                    onChange={(e) => setProdSapId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-cyan-300 p-2"
                  >
                    <option value="">Selecione a BAPI / Integração homologada...</option>
                    {sapCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.function_name} - {s.standard_or_z})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProdModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveProductivity}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Homologar Produtividade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar Prioridade de Matéria-Prima */}
      <Dialog open={isRawModalOpen} onOpenChange={setIsRawModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Cadastrar Prioridade de Matéria-Prima
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código do Material (Bobina/Aço)</Label>
                <Input
                  placeholder="Ex: BOB_CSN_BQ_1012"
                  value={rawCode}
                  onChange={(e) => setRawCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Ordem de Prioridade (1 = Máx)</Label>
                <Input
                  type="number"
                  min="1"
                  value={rawPriority}
                  onChange={(e) => setRawPriority(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-amber-300 font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição do Material</Label>
              <Input
                placeholder="Ex: Bobina Laminada a Quente SAE 1012"
                value={rawDesc}
                onChange={(e) => setRawDesc(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Origem / Usina Fornecedora</Label>
                <Input
                  placeholder="Ex: CSN Volta Redonda"
                  value={rawOrigin}
                  onChange={(e) => setRawOrigin(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Grupo do Material</Label>
                <Input
                  value={rawGroup}
                  onChange={(e) => setRawGroup(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-cyan-400">Origem do Cadastro</Label>
                <select
                  value={rawSource}
                  onChange={(e) => setRawSource(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-1"
                >
                  <option value="MANUAL">MANUAL</option>
                  <option value="SAP">SAP</option>
                </select>
              </div>

              {rawSource === 'SAP' && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-300">Integração SAP</Label>
                  <select
                    value={rawSapId}
                    onChange={(e) => setRawSapId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-cyan-300 p-2"
                  >
                    <option value="">Selecione a BAPI / Função Z...</option>
                    {sapCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ({s.function_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRawModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveRawMaterial}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Salvar Prioridade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar Produto Bloqueado */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              Bloquear Produto na Linha (Restrição Forte)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Código do Produto a Bloquear</Label>
              <Input
                placeholder="Ex: TQ-100x100x8.0"
                value={blkCode}
                onChange={(e) => setBlkCode(e.target.value)}
                className="bg-slate-900 border-slate-700 text-rose-400 font-mono uppercase font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Tipo de Bloqueio</Label>
              <select
                value={blkType}
                onChange={(e) => setBlkType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="TECHNICAL">TECHNICAL (Restrição de Ferramental / Espessura)</option>
                <option value="CAPACITY">CAPACITY (Excesso de Carga / Força Mecânica)</option>
                <option value="QUALITY">QUALITY (Problema de Homologação / Solda)</option>
                <option value="PROCESS">PROCESS (Incompatibilidade com o Processo)</option>
                <option value="TEMPORARY">TEMPORARY (Bloqueio Temporário)</option>
                <option value="TOTAL">TOTAL (Bloqueio Permanente)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">
                Motivo / Justificativa Técnica do Bloqueio
              </Label>
              <Input
                placeholder="Ex: Espessura 8.0mm excede tração máxima dos roletes conformadores."
                value={blkReason}
                onChange={(e) => setBlkReason(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Usuário Responsável pelo Bloqueio</Label>
              <select
                value={blkUser}
                onChange={(e) => setBlkUser(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              >
                <option value="">Selecione o responsável...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBlockModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBlockedProduct}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar Matriz de Setup */}
      <Dialog open={isSetupMatrixModalOpen} onOpenChange={setIsSetupMatrixModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-400" />
              Adicionar Transição na Matriz de Setup
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código do Setup</Label>
                <Input
                  placeholder="Ex: STP_TQ40_TO_TQ50"
                  value={stpCode}
                  onChange={(e) => setStpCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Categoria do Setup</Label>
                <select
                  value={stpCat}
                  onChange={(e) => setStpCat(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="TOOL_CHANGE">TOOL_CHANGE (Troca de Ferramental)</option>
                  <option value="DIMENSION_CHANGE">DIMENSION_CHANGE (Mudança de Bitola)</option>
                  <option value="MATERIAL_CHANGE">MATERIAL_CHANGE (Mudança de Aço)</option>
                  <option value="CLEANING_SETUP">CLEANING_SETUP (Limpeza)</option>
                  <option value="OTHER">OTHER (Outros)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição do Setup</Label>
              <Input
                placeholder="Ex: Troca de cassetes de conformação de 40mm para 50mm"
                value={stpDesc}
                onChange={(e) => setStpDesc(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Família Origem (De)</Label>
                <select
                  value={stpFromFam}
                  onChange={(e) => setStpFromFam(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Qualquer Família</option>
                  {productFamilies.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Família Destino (Para)</Label>
                <select
                  value={stpToFam}
                  onChange={(e) => setStpToFam(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Qualquer Família</option>
                  {productFamilies.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Duração Padrão (minutos)</Label>
                <Input
                  type="number"
                  min="1"
                  value={stpDuration}
                  onChange={(e) => setStpDuration(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-amber-300 font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Impacto na Capacidade</Label>
                <Input
                  placeholder="Ex: Perda estimada de 60min"
                  value={stpImpact}
                  onChange={(e) => setStpImpact(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSetupMatrixModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSetupMatrix}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
            >
              Homologar Transição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Cadastrar/Editar Parada Programada (Capacidade) */}
      <Dialog open={isScheduledStopModalOpen} onOpenChange={setIsScheduledStopModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-amber-400" />
              {schId ? 'Editar Parada Programada' : 'Adicionar Parada Programada à Capacidade'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Motivo da Parada *</Label>
              <Input
                placeholder="Ex: Manutenção Preventiva Semanal"
                value={schReason}
                onChange={(e) => setSchReason(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Tipo de Relação *</Label>
                <select
                  value={schRelationType}
                  onChange={(e) => setSchRelationType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="PROGRAMADA_MANUTENCAO">Manutenção Programada</option>
                  <option value="TROCA_CAMPANHA">Troca de Campanha</option>
                  <option value="LIMPEZA_5S">Limpeza & 5S</option>
                  <option value="SETUP_BITOLA">Setup de Bitola</option>
                  <option value="REFEICAO_DDS">Refeição / DDS</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Recorrência</Label>
                <select
                  value={schRec}
                  onChange={(e) => setSchRec(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="DAILY">DAILY (Diária)</option>
                  <option value="PER_SHIFT">PER_SHIFT (Por Turno)</option>
                  <option value="WEEKLY">WEEKLY (Semanal)</option>
                  <option value="MONTHLY">MONTHLY (Mensal)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Código Bitola (Opcional)</Label>
                <Input
                  placeholder="Ex: BITOLA_01"
                  value={schGaugeCode}
                  onChange={(e) => setSchGaugeCode(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Dimensão (Opcional)</Label>
                <Input
                  placeholder="Ex: 50x50mm"
                  value={schGaugeDim}
                  onChange={(e) => setSchGaugeDim(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Descrição Detalhada</Label>
              <Input
                placeholder="Ex: Lubrificação diária e inspeção de cabeçotes"
                value={schDesc}
                onChange={(e) => setSchDesc(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Duração (min) *</Label>
                <Input
                  type="number"
                  value={schDur}
                  onChange={(e) => setSchDur(Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-amber-300 font-mono font-bold"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Hora Início</Label>
                <Input
                  type="time"
                  disabled={!schTimeApplicable}
                  value={schStartTime}
                  onChange={(e) => setSchStartTime(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Hora Fim</Label>
                <Input
                  type="time"
                  disabled={!schTimeApplicable}
                  value={schEndTime}
                  onChange={(e) => setSchEndTime(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={schTimeApplicable}
                  onChange={(e) => setSchTimeApplicable(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-[#004C97]"
                />
                <span>Horário aplicável</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={schActive}
                  onChange={(e) => setSchActive(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-[#004C97]"
                />
                <span>Ativo (impacta capacidade)</span>
              </label>
            </div>

            {timeMismatchAlert && (
              <p className="text-[11px] text-amber-400 bg-amber-950/40 p-2 rounded border border-amber-800">
                {timeMismatchAlert}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScheduledStopModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveScheduledStop}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs"
            >
              Gravar Parada Programada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE COMPLETUDE DA FICHA MESTRE */}
      <MasterSheetCompletenessModal
        open={isCompletenessModalOpen}
        onClose={() => setIsCompletenessModalOpen(false)}
        completeness={completenessResult}
        onNavigateToBlock={(target) => {
          if (target.mainGroup) {
            setMainGroup(target.mainGroup)
          }
          if (target.masterSubTab) {
            setMasterSubTab(target.masterSubTab)
          }
        }}
      />
    </div>
  )
}
