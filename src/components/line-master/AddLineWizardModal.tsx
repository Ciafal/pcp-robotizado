import React, { useState } from 'react'
import {
  Layers,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Save,
  Building2,
  Users,
  ShieldCheck,
  GitCommit,
  FileText,
  Sliders,
  Check,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { lineMasterService } from '@/services/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { ProductionLine, ProductFamily } from '@/types/line-master'

interface AddLineWizardModalProps {
  open: boolean
  onClose: () => void
  onSuccess: (newLine: ProductionLine) => void
  users: UserProfile[]
  existingLines: ProductionLine[]
  productFamilies: ProductFamily[]
}

const STEPS = [
  { id: 1, title: 'Identificação da Linha', icon: Building2 },
  { id: 2, title: 'Hierarquia Organizacional', icon: Layers },
  { id: 3, title: 'Gestores & Aprovadores', icon: Users },
  { id: 4, title: 'Sequenciamento & Dependências', icon: GitCommit },
  { id: 5, title: 'Ficha Mestre Inicial', icon: Sliders },
  { id: 6, title: 'Revisão & Conformidade', icon: FileText },
]

export const AddLineWizardModal: React.FC<AddLineWizardModalProps> = ({
  open,
  onClose,
  onSuccess,
  users,
  existingLines,
  productFamilies,
}) => {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [saving, setSaving] = useState<boolean>(false)

  // Etapa 1: Identificação
  const [code, setCode] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [resourceType, setResourceType] = useState<string>('LINE')
  const [programmingType, setProgrammingType] = useState<string>('Laminação')
  const [programmingStages, setProgrammingStages] = useState<string[]>([])
  const [plant, setPlant] = useState<string>('Planta Principal - CIAFAL 01')
  const [sapPlantCode, setSapPlantCode] = useState<string>('1000')
  const [sector, setSector] = useState<string>('Laminação & Conformação Estrutural')
  const [processStep, setProcessStep] = useState<string>('Conformação Contínua & Solda HF')
  const [status, setStatus] = useState<'ACTIVE' | 'CONFIGURING' | 'MAINTENANCE'>('ACTIVE')
  const [sapWorkCenter, setSapWorkCenter] = useState<string>('')
  const [sapEquipmentId, setSapEquipmentId] = useState<string>('')
  const [mesIdentifier, setMesIdentifier] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Etapa 2: Hierarquia Organizacional
  const [orgDirectorId, setOrgDirectorId] = useState<string>('')
  const [orgManagerId, setOrgManagerId] = useState<string>('')
  const [orgSupervisorId, setOrgSupervisorId] = useState<string>('')

  // Etapa 3: Gestores e Aprovadores
  const [primaryManagerId, setPrimaryManagerId] = useState<string>('')
  const [substituteManagerId, setSubstituteManagerId] = useState<string>('')
  const [pcpApproverId, setPcpApproverId] = useState<string>('')
  const [lineApproverId, setLineApproverId] = useState<string>('')
  const [approvalRequirement, setApprovalRequirement] = useState<'MANDATORY' | 'OPTIONAL'>(
    'MANDATORY',
  )

  // Etapa 4: Sequenciamento
  const [prevProcess, setPrevProcess] = useState<string>('')
  const [prevLineId, setPrevLineId] = useState<string>('')
  const [nextProcess, setNextProcess] = useState<string>('')
  const [nextLineId, setNextLineId] = useState<string>('')
  const [leadTimeMinutes, setLeadTimeMinutes] = useState<number>(30)
  const [bufferCapacity, setBufferCapacity] = useState<number>(100)
  const [bufferUnit, setBufferUnit] = useState<string>('t')

  // Etapa 5: Ficha Mestre Inicial
  const [nominalHourlyCapacity, setNominalHourlyCapacity] = useState<number>(12.0)
  const [capacityUnit, setCapacityUnit] = useState<string>('t/h')
  const [plannedEfficiencyPct, setPlannedEfficiencyPct] = useState<number>(90.0)
  const [minBatchSize, setMinBatchSize] = useState<number>(10)
  const [maxBatchSize, setMaxBatchSize] = useState<number>(500)
  const [shiftHours, setShiftHours] = useState<number>(8)

  if (!open) return null

  const handleNext = () => {
    if (currentStep === 1) {
      if (!code.trim() || !name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Campos Obrigatórios',
          description: 'Código e Nome da Linha são obrigatórios.',
        })
        return
      }
      // Verificar unicidade de código
      const exists = existingLines.some((l) => l.code.toUpperCase() === code.trim().toUpperCase())
      if (exists) {
        toast({
          variant: 'destructive',
          title: 'Código já existente',
          description: `Já existe uma linha cadastrada com o código ${code.toUpperCase()}.`,
        })
        return
      }
    }

    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos Obrigatórios',
        description: 'Código e Nome da Linha são obrigatórios para gravação.',
      })
      setCurrentStep(1)
      return
    }

    setSaving(true)
    try {
      // 1. Criar a Linha Produtiva no Banco
      const createdLine = await lineMasterService.createLine({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim(),
        plant: plant,
        process: processStep || 'Conformação',
        status: (status as any) || 'ACTIVE',
        is_active: true,
        programming_type: programmingType || 'Laminação',
        programming_stages: programmingType === 'Múltiplo' ? programmingStages : [],
        current_rate: Number(nominalHourlyCapacity) || 12,
        target_rate: Number(nominalHourlyCapacity) || 12,
        efficiency: Number(plannedEfficiencyPct) || 90,
        sap_plant_code: sapPlantCode || '1000',
        sap_work_center: sapWorkCenter.trim() || undefined,
        sap_equipment_id: sapEquipmentId.trim() || undefined,
        mes_identifier: mesIdentifier.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      if (!createdLine || !createdLine.id) {
        throw new Error('Falha ao obter confirmação de criação da Linha no backend.')
      }

      // 2. Criar a Ficha Mestre Versão 1 Inicial no Banco
      const validResourceType = [
        'PRODUCTION_LINE',
        'FURNACE',
        'FINISHING',
        'STRAIGHTENER',
        'REWORK',
        'AUXILIARY_PROCESS',
        'STORAGE',
        'OTHER',
      ].includes(resourceType)
        ? resourceType
        : 'PRODUCTION_LINE'

      const validCapacityUnit = ['t/h', 't', 'kg', 'peça', 'm', 'mm', 'h', 'min'].includes(
        capacityUnit,
      )
        ? capacityUnit
        : 't/h'

      const createdMaster = await lineMasterService.saveLineMaster({
        line_id: createdLine.id,
        version: 1,
        status: 'ACTIVE',
        resource_type: validResourceType as any,
        unit: validCapacityUnit === 't/h' ? 't' : validCapacityUnit === 'peça' ? 'peça' : 'm',
        sap_plant_code: sapPlantCode || '1000',
        sector: sector || 'Laminação',
        process_step: processStep || 'Conformação',
        programming_type: programmingType || 'Laminação',
        programming_stages: programmingType === 'Múltiplo' ? programmingStages : [],
        nominal_hourly_capacity: Number(nominalHourlyCapacity) || 12,
        nominal_shift_capacity: (Number(nominalHourlyCapacity) || 12) * (Number(shiftHours) || 8),
        nominal_daily_capacity:
          (Number(nominalHourlyCapacity) || 12) * (Number(shiftHours) || 8) * 3,
        nominal_monthly_capacity:
          (Number(nominalHourlyCapacity) || 12) * (Number(shiftHours) || 8) * 3 * 22,
        capacity_unit: validCapacityUnit as any,
        min_batch_size: Number(minBatchSize) || 10,
        max_batch_size: Number(maxBatchSize) || 500,
        planned_efficiency_pct: Number(plannedEfficiencyPct) || 90,
        max_recommended_utilization_pct: 85,
        ready_for_scheduling: Boolean(primaryManagerId),
        completeness_score: 75,
        change_reason: 'Cadastro Inicial da Linha via Wizard Estruturado',
      })

      // 3. Criar Turnos Iniciais Padrão para a Linha recém-criada
      const shift1 = await lineMasterService.saveShift({
        line_id: createdLine.id,
        line_master_id: createdMaster.id,
        code: `T1_${createdLine.code}`,
        name: '1º Turno Matutino',
        description: 'Turno Regular Manhã',
        sequence_order: 1,
        start_time: '06:00',
        end_time: '14:20',
        duration_hours: 8.33,
        break_minutes: 40,
        applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
        crosses_midnight: false,
        active: true,
      })

      const shift2 = await lineMasterService.saveShift({
        line_id: createdLine.id,
        line_master_id: createdMaster.id,
        code: `T2_${createdLine.code}`,
        name: '2º Turno Vespertino',
        description: 'Turno Regular Tarde',
        sequence_order: 2,
        start_time: '14:20',
        end_time: '22:40',
        duration_hours: 8.33,
        break_minutes: 40,
        applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'],
        crosses_midnight: false,
        active: true,
      })

      const shift3 = await lineMasterService.saveShift({
        line_id: createdLine.id,
        line_master_id: createdMaster.id,
        code: `T3_${createdLine.code}`,
        name: '3º Turno Noturno',
        description: 'Turno Regular Noite',
        sequence_order: 3,
        start_time: '22:40',
        end_time: '06:00',
        duration_hours: 7.33,
        break_minutes: 40,
        applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'],
        crosses_midnight: true,
        active: true,
      })

      // 4. Criar Turmas Padrão (A, B, C, D) e Associação Turno × Turma
      const crewA = await lineMasterService.saveCrew({
        line_id: createdLine.id,
        code: 'TURMA_A',
        name: 'Turma A',
        description: 'Turma Operacional Alfa',
        active: true,
      })
      const crewB = await lineMasterService.saveCrew({
        line_id: createdLine.id,
        code: 'TURMA_B',
        name: 'Turma B',
        description: 'Turma Operacional Bravo',
        active: true,
      })
      const crewC = await lineMasterService.saveCrew({
        line_id: createdLine.id,
        code: 'TURMA_C',
        name: 'Turma C',
        description: 'Turma Operacional Charlie',
        active: true,
      })
      const crewD = await lineMasterService.saveCrew({
        line_id: createdLine.id,
        code: 'TURMA_D',
        name: 'Turma D',
        description: 'Turma Operacional Delta',
        active: true,
      })

      // Associações Turno x Turma
      await lineMasterService.saveShiftCrew({
        line_id: createdLine.id,
        shift_id: shift1.id,
        crew_id: crewA.id,
        day_of_week: 'ALL',
        active: true,
      })
      await lineMasterService.saveShiftCrew({
        line_id: createdLine.id,
        shift_id: shift2.id,
        crew_id: crewB.id,
        day_of_week: 'ALL',
        active: true,
      })
      await lineMasterService.saveShiftCrew({
        line_id: createdLine.id,
        shift_id: shift3.id,
        crew_id: crewC.id,
        day_of_week: 'ALL',
        active: true,
      })

      // 3. Criar Hierarquia Organizacional
      if (orgDirectorId) {
        await lineMasterService.saveOrgHierarchy({
          line_id: createdLine.id,
          org_level_name: 'Diretoria Industrial',
          org_level_order: 1,
          area_name: 'Diretoria de Operações',
          job_title: 'Diretor Industrial',
          user_id: orgDirectorId,
          integration_status: 'CONECTADO_HUB',
          active: true,
        })
      }
      if (orgManagerId) {
        await lineMasterService.saveOrgHierarchy({
          line_id: createdLine.id,
          org_level_name: 'Gerência de Produção',
          org_level_order: 2,
          area_name: 'Gerência Fabril',
          job_title: 'Gerente Industrial',
          user_id: orgManagerId,
          integration_status: 'CONECTADO_HUB',
          active: true,
        })
      }
      if (orgSupervisorId) {
        await lineMasterService.saveOrgHierarchy({
          line_id: createdLine.id,
          org_level_name: 'Supervisão de Turno',
          org_level_order: 3,
          area_name: 'Supervisão de Linha',
          job_title: 'Supervisor Fabril',
          user_id: orgSupervisorId,
          integration_status: 'CONECTADO_HUB',
          active: true,
        })
      }

      // 4. Criar Gestores da Linha
      if (primaryManagerId) {
        await lineMasterService.saveManagerAssignment({
          line_id: createdLine.id,
          user_id: primaryManagerId,
          responsibility_type: 'PRIMARY_MANAGER',
          role_title: `Gestor Titular da Linha ${createdLine.code}`,
          active: true,
          scope_description: 'Responsabilidade operacional direta cadastrada pelo Wizard.',
        })
      }
      if (substituteManagerId) {
        await lineMasterService.saveManagerAssignment({
          line_id: createdLine.id,
          user_id: substituteManagerId,
          responsibility_type: 'SUBSTITUTE_MANAGER',
          role_title: `Gestor Substituto da Linha ${createdLine.code}`,
          active: true,
          scope_description: 'Cobertura de férias e substituição programada.',
        })
      }

      // 5. Criar Matriz de Aprovadores
      if (pcpApproverId) {
        await lineMasterService.saveApprover({
          line_id: createdLine.id,
          approval_type: 'PCP_APPROVAL',
          approval_stage: 'STAGE_1_PCP',
          sequence_order: 1,
          user_id: pcpApproverId,
          role_title: 'Programador PCP Homologador',
          requirement_type: approvalRequirement,
          active: true,
        })
      }
      if (lineApproverId) {
        await lineMasterService.saveApprover({
          line_id: createdLine.id,
          approval_type: 'LINE_MANAGER_APPROVAL',
          approval_stage: 'STAGE_2_LINE_MANAGER',
          sequence_order: 2,
          user_id: lineApproverId,
          role_title: 'Gestor Aprovador de Linha',
          requirement_type: approvalRequirement,
          active: true,
        })
      }

      // 6. Criar Sequenciamento Inicial
      if (prevProcess || nextProcess || prevLineId || nextLineId) {
        await lineMasterService.saveSequencing({
          line_id: createdLine.id,
          previous_process_name: prevProcess || undefined,
          previous_line_id: prevLineId || undefined,
          next_process_name: nextProcess || undefined,
          next_line_id: nextLineId || undefined,
          sequence_order: 1,
          relation_nature: 'MANDATORY',
          dependency_type: 'TRANSFER_BATCH',
          standard_lead_time_minutes: Number(leadTimeMinutes),
          intermediate_buffer_type: `Pulmão da Linha ${createdLine.code}`,
          intermediate_buffer_capacity: Number(bufferCapacity),
          intermediate_buffer_unit: bufferUnit,
          active: true,
        })
      }

      // 7. Gravar Auditoria
      await lineMasterService.recordAuditVersion({
        line_id: createdLine.id,
        line_master_id: createdMaster.id,
        version: 1,
        action: 'CREATE',
        changed_fields: [
          'identification',
          'hierarchy',
          'managers',
          'approvers',
          'sequencing',
          'initial_master',
        ],
        change_reason: 'Criação estruturada da Linha Produtiva pelo Wizard CIAFAL',
        snapshot_data: {
          code: createdLine.code,
          name: createdLine.name,
          status: createdLine.status,
          primary_manager_id: primaryManagerId,
          nominal_hourly_capacity: nominalHourlyCapacity,
        },
      })

      toast({
        title: 'Linha Cadastrada com Sucesso',
        description: `Linha ${createdLine.code} e Ficha Mestre inicial criadas no padrão CIAFAL.`,
      })

      onSuccess(createdLine)
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar linha',
        description: err?.message || 'Falha na gravação dos dados no backend.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-950 border border-slate-800 rounded-xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Wizard em Pantone 2945 (#004C97) */}
        <div className="bg-[#004C97] p-5 text-white flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-950/60 rounded-lg border border-blue-400/30">
              <Building2 className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Adicionar Nova Linha Produtiva
                <Badge className="bg-blue-900 text-blue-200 border-blue-400/40 text-[10px]">
                  Etapa {currentStep} de 6
                </Badge>
              </h2>
              <p className="text-xs text-blue-100/80">
                Cadastro estruturado de recursos, governança, sequenciamento e parâmetros técnicos.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-blue-800 h-8 text-xs font-semibold"
          >
            Fechar [ESC]
          </Button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 p-3 grid grid-cols-6 gap-2 text-center text-xs">
          {STEPS.map((s) => {
            const Icon = s.icon
            const isActive = currentStep === s.id
            const isDone = currentStep > s.id
            return (
              <div
                key={s.id}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-[#004C97]/40 text-cyan-300 border border-blue-500 font-bold'
                    : isDone
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-500'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                <span className="hidden md:inline text-[11px] truncate">{s.title}</span>
              </div>
            )
          })}
        </div>

        {/* Body com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-200">
          {/* ETAPA 1: Identificação */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Identificação Básica da Linha & Processo
                </h3>
                <p className="text-xs text-slate-400">
                  Preencha os códigos internos e dados operacionais base.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Código Interno <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: L3, CORTE_02, SOLDA_04"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white font-mono uppercase font-bold"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-slate-300">
                    Nome da Linha <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: Linha de Conformação de Tubos Quadrados III"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Descrição / Finalidade Produtiva</Label>
                <Input
                  placeholder="Ex: Produção contínua de perfis leves e médios soldados por indução de alta frequência."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Tipo de Recurso</Label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md text-xs text-white p-2"
                  >
                    <option value="PRODUCTION_LINE">
                      PRODUCTION_LINE (Linha de Produção Contínua)
                    </option>
                    <option value="FURNACE">FURNACE (Forno / Tratamento)</option>
                    <option value="FINISHING">FINISHING (Acabamento)</option>
                    <option value="STRAIGHTENER">STRAIGHTENER (Endireitadeira)</option>
                    <option value="REWORK">REWORK (Retrabalho)</option>
                    <option value="AUXILIARY_PROCESS">AUXILIARY_PROCESS (Processo Auxiliar)</option>
                    <option value="STORAGE">STORAGE (Armazenamento)</option>
                    <option value="OTHER">OTHER (Outro)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-bold text-cyan-300">
                    Tipo de Programação <span className="text-rose-400">*</span>
                  </Label>
                  <select
                    value={programmingType}
                    onChange={(e) => {
                      setProgrammingType(e.target.value)
                      if (e.target.value !== 'Múltiplo') {
                        setProgrammingStages([])
                      }
                    }}
                    className="w-full bg-slate-900 border border-cyan-700 rounded-md text-xs text-cyan-300 font-bold p-2"
                  >
                    <option value="Enfornamento">Enfornamento</option>
                    <option value="Laminação">Laminação</option>
                    <option value="Envio">Envio</option>
                    <option value="Preparação">Preparação</option>
                    <option value="Acabamento">Acabamento</option>
                    <option value="Endireitadeira">Endireitadeira</option>
                    <option value="Inspeção">Inspeção</option>
                    <option value="Múltiplo">Múltiplo</option>
                    <option value="Argola">Argola</option>
                    <option value="Alto-Forno">Alto-Forno</option>
                    <option value="Aciaria">Aciaria</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Planta / Unidade</Label>
                  <Input
                    value={plant}
                    onChange={(e) => setPlant(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Centro SAP (Werk)</Label>
                  <Input
                    value={sapPlantCode}
                    onChange={(e) => setSapPlantCode(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Bloco de Seleção de Etapas para Tipo Múltiplo */}
              {programmingType === 'Múltiplo' && (
                <div className="p-3 bg-blue-950/40 rounded-lg border border-cyan-800 space-y-2">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                    Etapas de Programação Habilitadas (Selecione 2 ou mais)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {[
                      'Enfornamento',
                      'Laminação',
                      'Envio',
                      'Preparação',
                      'Acabamento',
                      'Endireitadeira',
                      'Inspeção',
                      'Argola',
                      'Alto-Forno',
                      'Aciaria',
                    ].map((stage) => {
                      const isChecked = programmingStages.includes(stage)
                      return (
                        <label
                          key={stage}
                          className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-[#004C97]/60 border-cyan-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setProgrammingStages((prev) => [...prev, stage])
                              } else {
                                setProgrammingStages((prev) => prev.filter((s) => s !== stage))
                              }
                            }}
                            className="rounded border-slate-700 text-[#004C97] focus:ring-[#004C97]"
                          />
                          <span>{stage}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Campos SAP / MES Futuros (Regra 5) */}
              <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
                  Mapeamento de Integração SAP / MES (Opcional - Regra 5)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">
                      Centro de Trabalho SAP (Arbpl)
                    </Label>
                    <Input
                      placeholder="Ex: CT_LAM_03"
                      value={sapWorkCenter}
                      onChange={(e) => setSapWorkCenter(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-cyan-300 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Equipamento SAP (Equnr)</Label>
                    <Input
                      placeholder="Ex: EQ-200941"
                      value={sapEquipmentId}
                      onChange={(e) => setSapEquipmentId(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-cyan-300 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">ID de Telemetria MES</Label>
                    <Input
                      placeholder="Ex: MES_PLC_L3_NODE"
                      value={mesIdentifier}
                      onChange={(e) => setMesIdentifier(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-cyan-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: Hierarquia Organizacional */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Hierarquia Organizacional Associada à Linha
                </h3>
                <p className="text-xs text-slate-400">
                  Associação com a estrutura corporativa do HUB CIAFAL (Diretoria, Gerência,
                  Supervisão).
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Nível 1: Diretoria Industrial
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Diretoria de Operações e Manufatura
                    </span>
                  </div>
                  <select
                    value={orgDirectorId}
                    onChange={(e) => setOrgDirectorId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-2 min-w-[240px]"
                  >
                    <option value="">Selecione o Diretor...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Nível 2: Gerência de Produção
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Gerência Industrial de Laminação
                    </span>
                  </div>
                  <select
                    value={orgManagerId}
                    onChange={(e) => setOrgManagerId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-2 min-w-[240px]"
                  >
                    <option value="">Selecione o Gerente...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Nível 3: Supervisão de Linha
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Supervisão Técnica e Operacional
                    </span>
                  </div>
                  <select
                    value={orgSupervisorId}
                    onChange={(e) => setOrgSupervisorId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded text-xs text-white p-2 min-w-[240px]"
                  >
                    <option value="">Selecione o Supervisor...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: Gestores e Aprovadores */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-400" />
                  Gestores Operacionais & Matriz de Aprovadores
                </h3>
                <p className="text-xs text-slate-400">
                  Defina o gestor titular responsável e os homologadores da linha.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gestor Titular */}
                <div className="p-4 bg-slate-900/70 border border-cyan-900/60 rounded-lg space-y-3">
                  <span className="text-xs font-bold text-cyan-400 uppercase block">
                    Gestor Titular da Linha (Fase 2)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Usuário Responsável Principal</Label>
                    <select
                      value={primaryManagerId}
                      onChange={(e) => setPrimaryManagerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-white p-2"
                    >
                      <option value="">Selecione o gestor...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Gestor Substituto Imediato</Label>
                    <select
                      value={substituteManagerId}
                      onChange={(e) => setSubstituteManagerId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-white p-2"
                    >
                      <option value="">Selecione o substituto...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Aprovadores */}
                <div className="p-4 bg-slate-900/70 border border-blue-900/60 rounded-lg space-y-3">
                  <span className="text-xs font-bold text-blue-400 uppercase block">
                    Matriz de Aprovação (PCP & Linha)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Aprovador PCP (Etapa 1)</Label>
                    <select
                      value={pcpApproverId}
                      onChange={(e) => setPcpApproverId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-white p-2"
                    >
                      <option value="">Selecione aprovador PCP...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Aprovador da Linha (Etapa 2)</Label>
                    <select
                      value={lineApproverId}
                      onChange={(e) => setLineApproverId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-white p-2"
                    >
                      <option value="">Selecione aprovador de linha...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Regra de Aprovação</Label>
                    <select
                      value={approvalRequirement}
                      onChange={(e) => setApprovalRequirement(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded text-xs text-white p-2"
                    >
                      <option value="MANDATORY">MANDATÓRIA (Plano só roda após aprovação)</option>
                      <option value="OPTIONAL">OPCIONAL (Aprovação recomendada)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: Sequenciamento */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-cyan-400" />
                  Sequenciamento & Dependências Estruturais do Processo
                </h3>
                <p className="text-xs text-slate-400">
                  Cadastre a posição da linha no fluxo da fábrica (predecessores e sucessores).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-amber-400 uppercase block">
                    Etapa Anterior (Predecessor)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Processo Anterior</Label>
                    <Input
                      placeholder="Ex: Corte Slitter / Pátio de Matéria-Prima"
                      value={prevProcess}
                      onChange={(e) => setPrevProcess(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Linha Anterior Direta</Label>
                    <select
                      value={prevLineId}
                      onChange={(e) => setPrevLineId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded text-xs text-white p-2"
                    >
                      <option value="">Nenhuma / Origem Externa</option>
                      {existingLines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} - {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase block">
                    Etapa Seguinte (Sucessor)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Processo Seguinte</Label>
                    <Input
                      placeholder="Ex: Tratamento Térmico / Acabamento Final"
                      value={nextProcess}
                      onChange={(e) => setNextProcess(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Linha Sucessora Direta</Label>
                    <select
                      value={nextLineId}
                      onChange={(e) => setNextLineId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded text-xs text-white p-2"
                    >
                      <option value="">Nenhuma / Destino Expedição</option>
                      {existingLines.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.code} - {l.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-900/40 rounded border border-slate-800 text-xs">
                <div className="space-y-1">
                  <Label className="text-slate-300">Lead Time Padrão (Minutos)</Label>
                  <Input
                    type="number"
                    value={leadTimeMinutes}
                    onChange={(e) => setLeadTimeMinutes(Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 text-cyan-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Capacidade do Pulmão Intermediário</Label>
                  <Input
                    type="number"
                    value={bufferCapacity}
                    onChange={(e) => setBufferCapacity(Number(e.target.value))}
                    className="bg-slate-950 border-slate-700 text-cyan-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-300">Unidade do Pulmão</Label>
                  <Input
                    value={bufferUnit}
                    onChange={(e) => setBufferUnit(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 5: Ficha Mestre Inicial */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Parâmetros de Capacidade & Ficha Mestre Inicial (v1)
                </h3>
                <p className="text-xs text-slate-400">
                  Defina as cadências nominais e tamanhos de lote.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">
                    Capacidade Horária Nominal <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={nominalHourlyCapacity}
                    onChange={(e) => setNominalHourlyCapacity(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700 text-white font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Unidade de Medida</Label>
                  <select
                    value={capacityUnit}
                    onChange={(e) => setCapacityUnit(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                  >
                    <option value="t/h">t/h (Toneladas por Hora - Padrão Aço)</option>
                    <option value="peça/h">peça/h (Peças por Hora)</option>
                    <option value="m/h">m/h (Metros por Hora)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Eficiência Planejada (%)</Label>
                  <Input
                    type="number"
                    value={plannedEfficiencyPct}
                    onChange={(e) => setPlannedEfficiencyPct(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Lote Mínimo de Produção</Label>
                  <Input
                    type="number"
                    value={minBatchSize}
                    onChange={(e) => setMinBatchSize(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Lote Máximo Recomendado</Label>
                  <Input
                    type="number"
                    value={maxBatchSize}
                    onChange={(e) => setMaxBatchSize(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700 text-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Duração Padrão do Turno (h)</Label>
                  <Input
                    type="number"
                    value={shiftHours}
                    onChange={(e) => setShiftHours(Number(e.target.value))}
                    className="bg-slate-900 border-slate-700 text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 6: Revisão & Conformidade */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Revisão Geral e Validação do Cadastro
                </h3>
                <p className="text-xs text-slate-400">
                  Confira todos os parâmetros antes de homologar e gravar no banco de dados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-cyan-300 uppercase block text-[11px]">
                    Identificação & Localização
                  </span>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Código da Linha:</span>
                    <span className="font-bold text-white font-mono">
                      {code.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Nome:</span>
                    <span className="text-white">{name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Planta / Centro SAP:</span>
                    <span className="text-white">
                      {plant} ({sapPlantCode})
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Status Inicial:</span>
                    <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px]">
                      {status}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-2">
                  <span className="font-bold text-blue-300 uppercase block text-[11px]">
                    Governança & Capacidade
                  </span>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Gestor Titular:</span>
                    <span className="text-white">
                      {users.find((u) => u.id === primaryManagerId)?.name ||
                        'Pendente de Atribuição'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Aprovador PCP:</span>
                    <span className="text-white">
                      {users.find((u) => u.id === pcpApproverId)?.name || 'Padrão Sistema'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 py-1">
                    <span className="text-slate-400">Capacidade Nominal:</span>
                    <span className="text-cyan-300 font-mono font-bold">
                      {nominalHourlyCapacity} {capacityUnit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Ficha Mestre:</span>
                    <span className="text-emerald-400 font-semibold">
                      Versão 1 (Pronta para Edição)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Navegação */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-4 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? onClose : handlePrev}
            className="border-slate-700 bg-slate-950 text-slate-300 text-xs"
          >
            {currentStep === 1 ? 'Cancelar' : 'Voltar Etapa'}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 6 ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5"
              >
                Próxima Etapa <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 px-6 shadow-lg shadow-emerald-950"
              >
                {saving ? (
                  'Gravando no Backend...'
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Concluir & Cadastrar Linha
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
