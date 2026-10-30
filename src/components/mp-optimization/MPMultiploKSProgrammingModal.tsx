import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  Layers,
  Factory,
  Boxes,
  FileCheck2,
} from 'lucide-react'
import { pb } from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { formatNumberPtBr } from '@/lib/number-format'
import { pcpAuditService } from '@/services/pcp-audit-service'
import {
  mpMultipleCuttingPlansService,
  MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'

export interface MPMultiploKSProgrammingModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedPlan?: MPMultipleCuttingPlanRecord | null
  onSuccess?: (programmingResult: {
    scheduleCode: string
    centerCode: string
    planCodes: string[]
  }) => void
}

export const MPMultiploKSProgrammingModal: React.FC<MPMultiploKSProgrammingModalProps> = ({
  isOpen,
  onClose,
  preSelectedPlan,
  onSuccess,
}) => {
  const { user } = useAuth()
  const userRole = (user?.role || 'PRODUCTION_VIEWER').toUpperCase()
  const canProgram =
    userRole === 'PCP_ADMIN' ||
    userRole === 'ADMIN' ||
    userRole === 'ADMINISTRADOR' ||
    userRole === 'PCP_PROGRAMMER' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'LINE_MANAGER'

  // Etapas: 1 = Seleção de Planos, 2 = Validação do Centro Múltiplo KS, 3 = Parâmetros & Revisão
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Planos disponíveis
  const [isLoadingPlans, setIsLoadingPlans] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<MPMultipleCuttingPlanRecord[]>([])
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('')

  // Centro Múltiplo KS consultado em line_masters
  const [isLoadingCenter, setIsLoadingCenter] = useState(false)
  const [multiploKsCenter, setMultiploKsCenter] = useState<any | null>(null)
  const [centerError, setCenterError] = useState<string | null>(null)

  // Parâmetros da Programação
  const [programmedDate, setProgrammedDate] = useState<string>(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [shiftCode, setShiftCode] = useState<string>('TURNO_1')
  const [crewName, setCrewName] = useState<string>('Turma A')
  const [sequenceOrder, setSequenceOrder] = useState<number>(1)
  const [pcpNotes, setPcpNotes] = useState<string>('')

  // Estado de confirmação / execução
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [confirmedSuccess, setConfirmedSuccess] = useState<{
    code: string
    centerName: string
    date: string
    plansCount: number
    totalWeightTons: number
    totalPieces: number
  } | null>(null)

  // 1. Carregar planos elegíveis do sistema
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setConfirmedSuccess(null)
      setSubmissionError(null)
      return
    }

    const loadPlans = async () => {
      setIsLoadingPlans(true)
      try {
        const records = await mpMultipleCuttingPlansService.listPlans()
        setAvailablePlans(records || [])

        if (preSelectedPlan?.id) {
          setSelectedPlanIds([preSelectedPlan.id])
        }
      } catch (err: any) {
        console.error('Erro ao carregar planos:', err)
      } finally {
        setIsLoadingPlans(false)
      }
    }

    // Consultar Centro Múltiplo KS no cadastro de linhas do PCP (line_masters)
    const checkCenter = async () => {
      setIsLoadingCenter(true)
      setCenterError(null)
      try {
        const list = await pb.collection('line_masters').getFullList({
          filter: "code ~ 'MULT' || name ~ 'Múltiplo KS' || name ~ 'Multiplo KS'",
        })

        if (!list || list.length === 0) {
          setMultiploKsCenter(null)
          setCenterError(
            'Centro produtivo "Múltiplo KS" não encontrado no cadastro de centros do PCP (line_masters). É necessária a regularização cadastral pelo administrador.',
          )
        } else {
          // Pega o centro prioritário
          const center = list.find((c: any) => c.code === 'MULTIPLOKS') || list[0]
          if (center.status === 'INACTIVE' || center.ready_for_scheduling === false) {
            setMultiploKsCenter(center)
            setCenterError(
              `O centro produtivo "${center.name || center.code}" está inativo ou não habilitado para programação (ready_for_scheduling = false). Bloqueio preventivo ativado.`,
            )
          } else {
            setMultiploKsCenter(center)
          }
        }
      } catch (err: any) {
        console.warn('Erro ao consultar cadastro de centro Múltiplo KS:', err)
        setCenterError(
          'Falha de comunicação ao validar o cadastro do centro "Múltiplo KS" no banco de dados.',
        )
      } finally {
        setIsLoadingCenter(false)
      }
    }

    loadPlans()
    checkCenter()
  }, [isOpen, preSelectedPlan])

  // Filtragem e Elegibilidade de Planos
  // Regras: Não permitir planos cancelados, inválidos, sem cenário viável, ou já integralmente programados
  const eligiblePlans = availablePlans.filter((p) => {
    const isCancelled = (p.status || '').toLowerCase() === 'cancelado'
    const isInvalid = !p.plan_code || (p.cutting_yield_pct || 0) <= 0
    return !isCancelled && !isInvalid
  })

  const filteredPlans = eligiblePlans.filter((p) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      const matchCode = (p.plan_code || '').toLowerCase().includes(q)
      const matchMat = (p.material_code || '').toLowerCase().includes(q)
      const matchLot = (p.batch_number || '').toLowerCase().includes(q)
      const matchHeat = (p.heat_number || '').toLowerCase().includes(q)
      if (!matchCode && !matchMat && !matchLot && !matchHeat) return false
    }
    if (filterMaterial.trim()) {
      if (!p.material_code?.toLowerCase().includes(filterMaterial.toLowerCase())) return false
    }
    return true
  })

  // Planos Selecionados
  const selectedPlans = availablePlans.filter((p) => selectedPlanIds.includes(p.id))

  // Totais
  const totalWeightTons = selectedPlans.reduce((acc, p) => acc + (p.block_weight_tons || 0), 0)
  const totalPieces = selectedPlans.reduce((acc, p) => acc + (p.pieces_count || 0), 0)
  const avgYield =
    selectedPlans.length > 0
      ? selectedPlans.reduce((acc, p) => acc + (p.cutting_yield_pct || 0), 0) / selectedPlans.length
      : 0
  const totalScrapTons = selectedPlans.reduce((acc, p) => acc + (p.scrap_weight_tons || 0), 0)

  // Validação do Cenário dos planos selecionados
  const hasInviableScenarioSelected = selectedPlans.some((p) => {
    const selScen = (p as any).selected_scenario_json
    if (selScen && (selScen.status === 'INVIÁVEL' || selScen.viabilityStatus === 'INVIÁVEL')) {
      return true
    }
    return false
  })

  const toggleSelectPlan = (plan: MPMultipleCuttingPlanRecord) => {
    // Validação de cenário inviável ou plano já programado
    const isAlreadyProgrammed = (p: any) => p.is_programmed === true || (p as any).programming_id
    if (isAlreadyProgrammed(plan)) {
      setSubmissionError(
        `O plano ${plan.plan_code} já possui uma programação produtiva ativa (${(plan as any).programming_id || 'Programado'}). Para evitar duplicação, este plano não pode ser reprogramado.`,
      )
      return
    }

    setSubmissionError(null)
    setSelectedPlanIds((prev) =>
      prev.includes(plan.id) ? prev.filter((id) => id !== plan.id) : [...prev, plan.id],
    )
  }

  // Execução da Programação Real no Múltiplo KS
  const handleConfirmProgramming = async () => {
    if (!canProgram) {
      setSubmissionError('Usuário sem permissão para gerar programações do PCP.')
      return
    }

    if (selectedPlans.length === 0) {
      setSubmissionError('Selecione ao menos um plano de corte elegível.')
      return
    }

    if (!multiploKsCenter) {
      setSubmissionError(
        'Centro Múltiplo KS não identificado no cadastro. Bloqueio cadastral ativo.',
      )
      return
    }

    if (centerError) {
      setSubmissionError(centerError)
      return
    }

    if (hasInviableScenarioSelected) {
      setSubmissionError(
        'Um dos planos selecionados contém cenário classificado como INVIÁVEL. É proibido programar cenários fisicamente inviáveis.',
      )
      return
    }

    if (!programmedDate) {
      setSubmissionError('Informe a data prevista para a programação.')
      return
    }

    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      const year = new Date(programmedDate).getFullYear() || new Date().getFullYear()
      const timestamp = Date.now().toString().slice(-4)
      const scheduleCode = `PRG-MULT-${year}-${timestamp}`

      const programmerName = user?.name || user?.email || 'Programador PCP'
      const centerCode = multiploKsCenter.code || 'MULTIPLOKS'
      const lineCode = multiploKsCenter.line_id || 'L1'

      // 1. Criar os registros em weekly_schedules (coleção oficial que compõe a Montagem Semanal)
      for (const plan of selectedPlans) {
        const scenarioJson = (plan as any).selected_scenario_json || {}
        const scenarioName =
          scenarioJson.name || (plan as any).selected_scenario_id || 'Cenário 1 — Recomendado'

        const scheduleRecordPayload = {
          company_code: 'CIAFAL',
          plant_code: 'PLANTA_1',
          line_code: lineCode,
          schedule_code: scheduleCode,
          item_type: 'PRODUCTION',
          lifecycle_stage: 'PROGRAMADO',
          status: 'DRAFT',
          order_type: 'MTS',
          production_order: '', // Não gera OP automaticamente
          material_code: plan.material_code,
          material_description: plan.material_description || `Corte Múltiplo - ${plan.plan_code}`,
          steel_grade: plan.steel_grade || 'SAE 1020',
          family_code: 'MULTIPLOS',
          dimensions: plan.gauge_dimension || `${plan.thickness_mm}x${plan.width_mm}mm`,
          raw_material_type: `${plan.material_code} - Lote: ${plan.batch_number || '-'}`,
          raw_material_req_tons: plan.block_weight_tons || 0,
          planned_quantity_tons: Number(
            (((plan.block_weight_tons || 0) * (plan.cutting_yield_pct || 90)) / 100).toFixed(3),
          ),
          realized_quantity_tons: 0,
          production_hours: Number(((plan.block_weight_tons || 0) / 13.6).toFixed(1)),
          productivity_rate_th: multiploKsCenter.nominal_hourly_capacity || 13.6,
          shift_code: shiftCode,
          shift_name: shiftCode === 'TURNO_1' ? '1º Turno' : '2º Turno',
          crew_name: crewName,
          sequence_order: sequenceOrder,
          start_datetime: `${programmedDate} 07:00`,
          end_datetime: `${programmedDate} 15:00`,
          date_str: new Date(programmedDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
          day_of_week: 'TER',
          week_number: 39,
          year,
          period_display: `${programmedDate} (Múltiplo KS)`,
          pcp_notes: `Origem: Plano de Corte ${plan.plan_code} v0${plan.version || 1} | Cenário: ${scenarioName} | Peças: ${plan.pieces_count} un | ${pcpNotes || ''}`,
          scenario_id: (plan as any).selected_scenario_id || 'SCEN-01',
          scenario_name: scenarioName,
          metadata: {
            origin_module: 'MP_MULTIPLE_CUTTING_PLAN',
            cutting_plan_id: plan.id,
            cutting_plan_code: plan.plan_code,
            cutting_plan_version: plan.version || 1,
            selected_scenario: scenarioJson,
            target_center_code: centerCode,
            target_center_name: multiploKsCenter.name,
            batch_number: plan.batch_number,
            heat_number: plan.heat_number,
            programmer: programmerName,
            created_at: new Date().toISOString(),
          },
        }

        await pb.collection('weekly_schedules').create(scheduleRecordPayload)

        // 2. Atualizar o plano de corte vinculando a programação e marcando como Programado
        await pb.collection('mp_multiple_cutting_plans').update(plan.id, {
          is_programmed: true,
          programming_id: scheduleCode,
          programmed_date: programmedDate,
          programmed_center_code: centerCode,
          status: 'Aprovado', // Garante que o plano permaneça aprovado/em execução
        })

        // 3. Registrar Log de Auditoria
        await pcpAuditService.recordLog({
          event_type: 'Criação',
          action: 'PROGRAMAR_CORTE_MULTIPLO_KS',
          module: 'PCP Robotizado',
          screen: 'Plano de Corte Múltiplo',
          entity: 'weekly_schedules',
          record_id: scheduleCode,
          user_name: programmerName,
          status: 'Concluída',
          outcome: 'SUCCESS',
          source: 'Usuário',
          details: {
            schedule_code: scheduleCode,
            plan_code: plan.plan_code,
            plan_version: plan.version,
            center_code: centerCode,
            center_name: multiploKsCenter.name,
            programmed_date: programmedDate,
            shift_code: shiftCode,
            crew_name: crewName,
            planned_weight_tons: plan.block_weight_tons,
            planned_pieces: plan.pieces_count,
            yield_pct: plan.cutting_yield_pct,
            scenario: scenarioName,
          },
        })
      }

      setConfirmedSuccess({
        code: scheduleCode,
        centerName: multiploKsCenter.name || 'Preparação de múltiplos KS',
        date: new Date(programmedDate).toLocaleDateString('pt-BR'),
        plansCount: selectedPlans.length,
        totalWeightTons,
        totalPieces,
      })

      if (onSuccess) {
        onSuccess({
          scheduleCode,
          centerCode,
          planCodes: selectedPlans.map((p) => p.plan_code),
        })
      }
    } catch (err: any) {
      console.error('Falha ao programar corte:', err)
      setSubmissionError(err.message || 'Erro ao persistir programação no banco de dados do PCP.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-50 border-blue-900/20 p-5 sm:p-6">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#004C97] text-white shadow-xs">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  Programação de Corte — Centro Múltiplo KS
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
                    PCP Central
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Conferência, seleção de planos elegíveis e envio direto para a Montagem Semanal do
                  centro Múltiplo KS.
                </DialogDescription>
              </div>
            </div>

            {/* Stepper visual */}
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <span
                className={`px-2.5 py-1 rounded-md transition-all ${
                  step === 1
                    ? 'bg-[#004C97] text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Planos Elegíveis
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span
                className={`px-2.5 py-1 rounded-md transition-all ${
                  step === 2
                    ? 'bg-[#004C97] text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Centro Múltiplo KS
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span
                className={`px-2.5 py-1 rounded-md transition-all ${
                  step === 3
                    ? 'bg-[#004C97] text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Confirmação
              </span>
            </div>
          </div>
        </DialogHeader>

        {confirmedSuccess ? (
          /* TELA DE SUCESSO CONFIRMADA */
          <div className="py-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <FileCheck2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900">
                Programação nº {confirmedSuccess.code} criada com sucesso para o centro Múltiplo KS.
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                A programação foi inserida com rastreabilidade na Montagem Semanal do PCP, vinculada
                aos planos de corte e seus respectivos cenários dimensionais.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-left shadow-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Número da Programação:</span>
                <span className="font-mono font-bold text-[#004C97]">{confirmedSuccess.code}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Centro Produtivo Destino:</span>
                <span className="font-semibold text-slate-800">{confirmedSuccess.centerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Data de Execução:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {confirmedSuccess.date}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Planos Vinculados:</span>
                <span className="font-bold text-slate-900">
                  {confirmedSuccess.plansCount} plano(s)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Peso Total Programado:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatNumberPtBr(confirmedSuccess.totalWeightTons, 3)} t
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Peças Programadas:</span>
                <span className="font-mono font-bold text-blue-900">
                  {confirmedSuccess.totalPieces} un
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={onClose}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold px-6"
              >
                Concluir e Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {submissionError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-snug">{submissionError}</div>
              </div>
            )}

            {/* ETAPA 1: SELEÇÃO DE PLANOS ELEGÍVEIS */}
            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por Plano, Material, Lote ou Corrida..."
                      className="pl-9 h-8 text-xs bg-white"
                    />
                  </div>
                  <div className="w-44">
                    <Input
                      value={filterMaterial}
                      onChange={(e) => setFilterMaterial(e.target.value)}
                      placeholder="Filtrar Material SAP..."
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1 shrink-0">
                    <span>Selecionados:</span>
                    <strong className="text-[#004C97] font-bold">{selectedPlanIds.length}</strong>
                    <span>de {eligiblePlans.length}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs max-h-[360px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 w-10 text-center">Sel.</th>
                        <th className="p-2.5">Código Plano</th>
                        <th className="p-2.5">Material</th>
                        <th className="p-2.5">Lote / Corrida</th>
                        <th className="p-2.5 text-right">Peso (t)</th>
                        <th className="p-2.5 text-center">Peças</th>
                        <th className="p-2.5 text-right">Rendimento</th>
                        <th className="p-2.5">Cenário Selecionado</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoadingPlans ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-500 font-mono">
                            Carregando planos de corte elegíveis...
                          </td>
                        </tr>
                      ) : filteredPlans.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-500">
                            Nenhum plano de corte elegível encontrado com os filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((plan) => {
                          const isSelected = selectedPlanIds.includes(plan.id)
                          const isProgrammed =
                            (plan as any).is_programmed === true || (plan as any).programming_id
                          const scenarioJson = (plan as any).selected_scenario_json
                          const scenarioName =
                            scenarioJson?.name ||
                            (plan as any).selected_scenario_id ||
                            'Cenário 1 (Recomendado)'
                          const isScenarioInviable =
                            scenarioJson?.status === 'INVIÁVEL' ||
                            scenarioJson?.viabilityStatus === 'INVIÁVEL'

                          return (
                            <tr
                              key={plan.id}
                              onClick={() => !isProgrammed && toggleSelectPlan(plan)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50/70 font-medium'
                                  : isProgrammed
                                    ? 'bg-slate-50 opacity-60 cursor-not-allowed'
                                    : 'hover:bg-slate-50'
                              }`}
                            >
                              <td
                                className="p-2.5 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  disabled={isProgrammed}
                                  onChange={() => toggleSelectPlan(plan)}
                                  className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                                />
                              </td>
                              <td className="p-2.5 font-mono font-bold text-[#004C97]">
                                {plan.plan_code}
                                <span className="ml-1 text-[10px] text-slate-400">
                                  v0{plan.version || 1}
                                </span>
                              </td>
                              <td className="p-2.5">
                                <div className="font-mono font-bold text-slate-900">
                                  {plan.material_code}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  {plan.material_description || plan.steel_grade}
                                </div>
                              </td>
                              <td className="p-2.5 font-mono text-[11px] text-slate-600">
                                <div>LT: {plan.batch_number || '-'}</div>
                                <div>CR: {plan.heat_number || '-'}</div>
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {formatNumberPtBr(plan.block_weight_tons || 0, 3)} t
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                                {plan.pieces_count || 0}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                {formatNumberPtBr(plan.cutting_yield_pct || 0, 2)}%
                              </td>
                              <td className="p-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] text-slate-800 font-semibold truncate max-w-[160px]">
                                    {scenarioName}
                                  </span>
                                  {isScenarioInviable && (
                                    <Badge className="bg-red-100 text-red-800 border-red-300 text-[9px]">
                                      INVIÁVEL
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5">
                                {isProgrammed ? (
                                  <Badge className="bg-amber-50 text-amber-900 border-amber-300 text-[10px]">
                                    Já Programado
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-300 text-emerald-800 text-[10px]"
                                  >
                                    Elegível
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-slate-500">
                    Selecione os planos que serão agrupados na sequência do centro Múltiplo KS.
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (selectedPlanIds.length === 0) {
                        setSubmissionError('Selecione ao menos um plano para prosseguir.')
                        return
                      }
                      setSubmissionError(null)
                      setStep(2)
                    }}
                    disabled={selectedPlanIds.length === 0}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
                  >
                    Avançar para Centro Produtivo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 2: DESTINO — CENTRO MÚLTIPLO KS */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#004C97]" />
                      Validação Cadastral do Centro Produtivo de Destino
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Fonte: Cadastro Central line_masters
                    </span>
                  </div>

                  {isLoadingCenter ? (
                    <div className="p-6 text-center text-xs text-slate-500 font-mono">
                      Consultando cadastro do centro Múltiplo KS...
                    </div>
                  ) : centerError ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-2">
                      <div className="font-bold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Bloqueio de Regularização Cadastral
                      </div>
                      <p>{centerError}</p>
                      <p className="text-[11px] text-red-700">
                        O PCP Robotizado proíbe a criação silenciosa de centros fictícios.
                        Regularize o cadastro do centro "Múltiplo KS" na hierarquia de linhas antes
                        de prosseguir com a programação produtiva.
                      </p>
                    </div>
                  ) : multiploKsCenter ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Centro PCP
                        </span>
                        <span className="font-mono font-bold text-slate-900 block mt-0.5">
                          {multiploKsCenter.code}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">
                          {multiploKsCenter.name}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Capacidade Nominal
                        </span>
                        <span className="font-mono font-bold text-blue-900 block mt-0.5">
                          {multiploKsCenter.nominal_hourly_capacity || 13.6} t/h
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {multiploKsCenter.nominal_shift_capacity || 96} t / turno
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Setor / Linha
                        </span>
                        <span className="font-medium text-slate-800 block mt-0.5">
                          {multiploKsCenter.sector || 'Laminação & Conformação'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Planta {multiploKsCenter.sap_plant_code || '1000'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                          Status Operacional
                        </span>
                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] mt-0.5 font-bold">
                          Habilitado PCP
                        </Badge>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="text-xs"
                  >
                    Voltar aos Planos
                  </Button>

                  <Button
                    type="button"
                    disabled={Boolean(centerError) || !multiploKsCenter}
                    onClick={() => setStep(3)}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
                  >
                    Avançar para Parâmetros e Revisão
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ETAPA 3: PARÂMETROS E REVISÃO ANTES DE CONFIRMAR */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Painel de Parâmetros de Sequenciamento */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Clock className="w-4 h-4 text-[#004C97]" />
                    Parâmetros da Programação Produtiva
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="text-[11px] text-slate-600">Data Prevista *</Label>
                      <Input
                        type="date"
                        value={programmedDate}
                        onChange={(e) => setProgrammedDate(e.target.value)}
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Turno de Operação</Label>
                      <Select value={shiftCode} onValueChange={setShiftCode}>
                        <SelectTrigger className="h-8 text-xs mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TURNO_1">1º Turno (07:00 - 15:20)</SelectItem>
                          <SelectItem value="TURNO_2">2º Turno (15:20 - 23:40)</SelectItem>
                          <SelectItem value="TURNO_3">3º Turno (23:40 - 07:00)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Turma / Equipe</Label>
                      <Select value={crewName} onValueChange={setCrewName}>
                        <SelectTrigger className="h-8 text-xs mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Turma A">Turma A</SelectItem>
                          <SelectItem value="Turma B">Turma B</SelectItem>
                          <SelectItem value="Turma C">Turma C</SelectItem>
                          <SelectItem value="Turma D">Turma D</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[11px] text-slate-600">Ordem na Sequência</Label>
                      <Input
                        type="number"
                        min={1}
                        value={sequenceOrder}
                        onChange={(e) => setSequenceOrder(Number(e.target.value) || 1)}
                        className="h-8 text-xs font-mono mt-1"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <Label className="text-[11px] text-slate-600">
                        Observações do PCP / Instruções Operacionais para Múltiplo KS
                      </Label>
                      <Input
                        value={pcpNotes}
                        onChange={(e) => setPcpNotes(e.target.value)}
                        placeholder="Ex: Respeitar tolerância dimensional restrita e conferência do kerf de serra."
                        className="h-8 text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumo da Revisão "Confirmar Programação — Múltiplo KS" */}
                <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-amber-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      Revisão Geral da Programação — Múltiplo KS
                    </span>
                    <Badge className="bg-blue-600 text-white text-[10px]">
                      {selectedPlans.length} plano(s) agrupado(s)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">
                        Peso Total a Cortar
                      </span>
                      <span className="text-base font-bold font-mono text-white mt-0.5 block">
                        {formatNumberPtBr(totalWeightTons, 3)} t
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">
                        Total de Peças Previstas
                      </span>
                      <span className="text-base font-bold font-mono text-amber-300 mt-0.5 block">
                        {totalPieces} un
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">
                        Rendimento Médio Ponderado
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-400 mt-0.5 block">
                        {formatNumberPtBr(avgYield, 2)}%
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">
                        Perda Prevista de Processo
                      </span>
                      <span className="text-base font-bold font-mono text-rose-300 mt-0.5 block">
                        {formatNumberPtBr(totalScrapTons, 3)} t
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300 border-t border-slate-700/60 pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      Centro de Execução: <strong>{multiploKsCenter?.name || 'Múltiplo KS'}</strong>{' '}
                      &bull; Data:{' '}
                      <strong>{new Date(programmedDate).toLocaleDateString('pt-BR')}</strong> &bull;
                      Turno: <strong>{shiftCode}</strong>
                    </div>
                    <div className="text-slate-400">
                      Rastreabilidade: Plano &rarr; Cenário &rarr; Programação PCP &rarr; Montagem
                      Semanal
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="text-xs"
                  >
                    Voltar ao Centro
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} className="text-xs">
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={isSubmitting || hasInviableScenarioSelected}
                      onClick={handleConfirmProgramming}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 gap-1.5 shadow"
                    >
                      <Check className="w-4 h-4" />
                      {isSubmitting ? 'Gerando Programação...' : 'Confirmar Programação'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
