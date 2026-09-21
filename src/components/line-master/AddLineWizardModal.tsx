import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { lineMasterService } from '@/services/line-master'
import { lineGaugeRestrictionService } from '@/services/line-gauge-restriction-service'
import { UserProfile } from '@/types/pcp-auth'
import { ProductionLine, ProductFamily } from '@/types/line-master'
import { LineGaugeMinRestriction } from '@/types/line-gauge-restriction'
import { GaugeRestrictionsSection } from './GaugeRestrictionsSection'
import { CenterDerivationSection } from './CenterDerivationSection'
import { centerDerivationService } from '@/services/pcp-center-derivation-service'
import { CenterDerivationRule } from '@/types/center-derivation'

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
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [saving, setSaving] = useState<boolean>(false)
  const [availableCompanies, setAvailableCompanies] = useState<
    Array<{ id: string; name: string; code: string; sap_company_code?: string }>
  >([])
  const [availableHierarchyLines, setAvailableHierarchyLines] = useState<
    Array<{ id: string; name: string; code: string; plant_id?: string; company_id?: string }>
  >([])
  const [loadingCompaniesLines, setLoadingCompaniesLines] = useState<boolean>(false)
  const [successDialogOpen, setSuccessDialogOpen] = useState<boolean>(false)
  const [createdLineRecord, setCreatedLineRecord] = useState<ProductionLine | null>(null)

  // Carrega empresas e linhas da hierarquia
  useEffect(() => {
    if (!open) return
    let isMounted = true
    async function loadCompaniesAndLines() {
      setLoadingCompaniesLines(true)
      try {
        const [compRes, linesRes, plantsRes] = await Promise.all([
          pb.collection('companies').getFullList({ filter: 'status="ACTIVE"', sort: 'name' }),
          pb.collection('production_lines').getFullList({ filter: 'is_active=true', sort: 'name' }),
          pb.collection('plants').getFullList({ sort: 'name' }),
        ])
        if (!isMounted) return
        setAvailableCompanies(
          compRes.map((c) => ({
            id: c.id,
            name: c.name || c.corporate_name || c.code,
            code: c.code,
            sap_company_code: c.sap_company_code || '',
          })),
        )

        const plantMap = new Map<string, string>()
        plantsRes.forEach((p) => {
          if (p.company_id) plantMap.set(p.id, p.company_id)
        })

        setAvailableHierarchyLines(
          linesRes.map((l) => ({
            id: l.id,
            name: l.name,
            code: l.code,
            plant_id: l.plant_id || '',
            company_id: (l.plant_id && plantMap.get(l.plant_id)) || '',
          })),
        )
      } catch (err) {
        console.warn('Erro ao carregar empresas e linhas:', err)
      } finally {
        if (isMounted) setLoadingCompaniesLines(false)
      }
    }
    loadCompaniesAndLines()
    return () => {
      isMounted = false
    }
  }, [open])

  // Etapa 1: Identificação
  const [code, setCode] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [companyId, setCompanyId] = useState<string>('')
  const [hierarchyLineId, setHierarchyLineId] = useState<string>('')
  const [programmingType, setProgrammingType] = useState<string>('Laminação')
  const [plant, setPlant] = useState<string>('Planta Principal - CIAFAL 01')
  const [sapPlantCode, setSapPlantCode] = useState<string>('1000')
  const [sector, setSector] = useState<string>('Laminação & Conformação Estrutural')
  const [processStep, setProcessStep] = useState<string>('Conformação Contínua & Solda HF')
  const [status, setStatus] = useState<'running' | 'idle' | 'stopped' | 'maintenance'>('idle')
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

  // Restrições Mínimas de Programação por Bitola para o novo Centro
  const [pendingRestrictions, setPendingRestrictions] = useState<LineGaugeMinRestriction[]>([])

  // Derivação de Centro (1:N)
  const [isDerived, setIsDerived] = useState<boolean>(false)
  const [derivationRules, setDerivationRules] = useState<CenterDerivationRule[]>([])
  const [derivationError, setDerivationError] = useState<string | null>(null)

  const [validationIssuesList, setValidationIssuesList] = useState<
    Array<{ step: number; stepTitle: string; label: string }>
  >([])

  if (!open) return null

  // Lista de pendências calculada dinamicamente com atalhos para cada etapa
  const getValidationIssues = (): Array<{ step: number; stepTitle: string; label: string }> => {
    const issues: Array<{ step: number; stepTitle: string; label: string }> = []

    if (!code.trim()) {
      issues.push({ step: 1, stepTitle: 'Identificação', label: 'Código Interno não informado' })
    }
    if (!name.trim()) {
      issues.push({ step: 1, stepTitle: 'Identificação', label: 'Nome do Centro não informado' })
    }
    if (!companyId) {
      issues.push({ step: 1, stepTitle: 'Identificação', label: 'Empresa não selecionada' })
    }
    if (!hierarchyLineId) {
      issues.push({ step: 1, stepTitle: 'Identificação', label: 'Linha Produtiva não selecionada' })
    }
    if (isDerived) {
      const activeRules = (derivationRules || []).filter((r) => !r.deleted && r.status === 'Ativa')
      if (activeRules.length === 0) {
        issues.push({
          step: 1,
          stepTitle: 'Identificação',
          label: 'Centro derivado ativado sem nenhuma regra ativa',
        })
      }
    }

    if (!primaryManagerId) {
      issues.push({
        step: 3,
        stepTitle: 'Gestores & Aprovadores',
        label: 'Gestor Titular da Linha não atribuído',
      })
    }
    if (!pcpApproverId) {
      issues.push({
        step: 3,
        stepTitle: 'Gestores & Aprovadores',
        label: 'Aprovador PCP não informado',
      })
    }

    if (!nominalHourlyCapacity || Number(nominalHourlyCapacity) <= 0) {
      issues.push({
        step: 5,
        stepTitle: 'Ficha Mestre',
        label: 'Capacidade Horária Nominal deve ser maior que zero',
      })
    }

    return issues
  }

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!code.trim()) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'O Código Interno do Centro é obrigatório.',
        })
        return false
      }
      // Validação do Card Derivação de Centro: se Sim, exigir pelo menos 1 regra válida e ativa
      if (isDerived) {
        const activeRules = (derivationRules || []).filter(
          (r) => !r.deleted && r.status === 'Ativa',
        )
        if (activeRules.length === 0) {
          const msg = 'Informe pelo menos uma derivação antes de salvar o Centro.'
          setDerivationError(msg)
          toast({
            variant: 'destructive',
            title: 'Derivação Obrigatória',
            description: msg,
          })
          return false
        }
      }
      setDerivationError(null)
      if (!name.trim()) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'O Nome do Centro de Produção é obrigatório.',
        })
        return false
      }
      const exists = existingLines.some((l) => l.code.toUpperCase() === code.trim().toUpperCase())
      if (exists) {
        toast({
          variant: 'destructive',
          title: 'Código já existente',
          description: `Já existe um centro cadastrado com este código (${code.trim().toUpperCase()}).`,
        })
        return false
      }
      if (!companyId) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'A Empresa é obrigatória.',
        })
        return false
      }
      if (!hierarchyLineId) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'A Linha Produtiva é obrigatória.',
        })
        return false
      }
      // Validar consistência linha.empresa_id === empresa selecionada
      const selectedLineObj = availableHierarchyLines.find((l) => l.id === hierarchyLineId)
      if (
        selectedLineObj &&
        selectedLineObj.company_id &&
        selectedLineObj.company_id !== companyId
      ) {
        toast({
          variant: 'destructive',
          title: 'Inconsistência de Hierarquia',
          description: 'A Linha Produtiva selecionada não pertence à Empresa informada.',
        })
        return false
      }
      if (!programmingType) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'O Tipo de Programação é obrigatório.',
        })
        return false
      }
    }

    if (step === 3) {
      if (!primaryManagerId) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'O Gestor Titular da Linha é obrigatório antes de prosseguir.',
        })
        return false
      }
      if (!pcpApproverId) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'O Aprovador PCP é obrigatório antes de prosseguir.',
        })
        return false
      }
    }

    if (step === 5) {
      if (!nominalHourlyCapacity || Number(nominalHourlyCapacity) <= 0) {
        toast({
          variant: 'destructive',
          title: 'Campo Obrigatório',
          description: 'A Capacidade Horária Nominal deve ser maior que zero.',
        })
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return

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
    // Validação completa de todas as etapas e exibição de pendências navegáveis
    const issues = getValidationIssues()
    if (issues.length > 0) {
      setValidationIssuesList(issues)
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar o Centro',
        description: `Existem ${issues.length} pendências para concluir o cadastro. Veja a lista abaixo para navegar diretamente ao campo.`,
      })
      // Navegar para o passo da primeira pendência
      setCurrentStep(issues[0].step)
      return
    }

    setValidationIssuesList([])
    setSaving(true)
    let createdLineId: string | null = null

    try {
      // Mapear status para valor válido do enum em production_lines ('running' | 'idle' | 'stopped' | 'maintenance')
      const validLineStatus: 'running' | 'idle' | 'stopped' | 'maintenance' =
        status === 'running' || status === 'stopped' || status === 'maintenance' ? status : 'idle'

      // Localizar objeto da Linha Produtiva e Empresa selecionadas
      const selectedLineObj = availableHierarchyLines.find((l) => l.id === hierarchyLineId)
      const selectedCompanyObj = availableCompanies.find((c) => c.id === companyId)

      // 1. Criar o Centro na coleção production_lines (compatibilidade de centro de trabalho)
      const createdLine = await lineMasterService.createLine({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        status: validLineStatus,
        is_active: true,
        is_derived: isDerived,
        current_rate: Number(nominalHourlyCapacity) || 12,
        target_rate: Number(nominalHourlyCapacity) || 12,
        efficiency: Number(plannedEfficiencyPct) || 90,
        sap_work_center: sapWorkCenter.trim() || undefined,
        nominal_capacity: Number(nominalHourlyCapacity) || 12,
        capacity_unit: capacityUnit || 't/h',
        shifts_count: 3,
        manager_user_id: primaryManagerId || undefined,
        pcp_programmer_user_id: pcpApproverId || undefined,
        programming_type: programmingType as any,
        plant_id: selectedLineObj?.plant_id || undefined,
      })

      if (!createdLine || !createdLine.id) {
        throw new Error('Falha ao obter confirmação de criação do Centro de Produção no backend.')
      }

      createdLineId = createdLine.id

      // Vincular centro à Linha Produtiva via line_sequencing_dependencies
      if (hierarchyLineId) {
        try {
          const currentDeps = await pb.collection('line_sequencing_dependencies').getFullList({
            filter: `line_id = '${hierarchyLineId}'`,
          })
          const nextOrder = (currentDeps.length + 1) * 10
          await pb.collection('line_sequencing_dependencies').create({
            line_id: hierarchyLineId,
            next_line_id: createdLine.id,
            sequence_order: nextOrder,
            relation_nature: 'MANDATORY',
            dependency_type: 'TRANSFER_BATCH',
            standard_lead_time_minutes: Number(leadTimeMinutes) || 30,
            active: true,
            notes: `Vínculo com a Linha Produtiva ${selectedLineObj?.code || ''}`,
          })
        } catch (depErr) {
          console.warn('Falha ao criar dependência de hierarquia com a linha produtiva:', depErr)
        }
      }

      // 2. Criar a Ficha Mestre Versão 1 Inicial no Banco
      const validCapacityUnit = ['t/h', 't', 'kg', 'peça', 'm', 'mm', 'h', 'min'].includes(
        capacityUnit,
      )
        ? capacityUnit
        : 't/h'

      const createdMaster = await lineMasterService.saveLineMaster({
        line_id: createdLine.id,
        version: 1,
        code: createdLine.code,
        name: createdLine.name,
        description: description.trim() || undefined,
        status: 'DRAFT',
        resource_type: 'PRODUCTION_LINE',
        unit: validCapacityUnit === 't/h' ? 't' : validCapacityUnit === 'peça' ? 'peça' : 'm',
        sap_plant_code: sapPlantCode || selectedCompanyObj?.sap_company_code || '1000',
        sector: sector || 'Laminação',
        process_step: processStep || 'Conformação',
        primary_responsible_id: primaryManagerId || undefined,
        substitute_responsible_id: substituteManagerId || undefined,
        programming_type: programmingType as any,
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
        change_reason: `Cadastro Inicial do Centro via Wizard Estruturado - Empresa: ${selectedCompanyObj?.name || ''} - Linha: ${selectedLineObj?.code || ''}`,
        technical_notes: notes.trim() || undefined,
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

      // 5. Criar Hierarquia Organizacional
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

      // 6. Criar Gestores da Linha
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

      // 7. Criar Matriz de Aprovadores
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

      // 8. Criar Sequenciamento Inicial
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

      // 8.1. Persistir Restrições Mínimas configuradas no Wizard
      if (pendingRestrictions.length > 0) {
        for (const rest of pendingRestrictions) {
          try {
            await lineGaugeRestrictionService.create(
              {
                line_id: createdLine.id,
                line_code: createdLine.code,
                restriction_type: rest.restriction_type,
                min_value: rest.min_value,
                unit_of_measure: rest.unit_of_measure,
                rule_description: rest.rule_description,
                status: rest.status,
                created_by_name: 'PCP Robotizado (Wizard)',
              },
              {
                lineName: createdLine.name,
                companyCode: selectedCompanyObj?.code || 'CIAFAL',
                centerCode: createdLine.code,
              },
            )
          } catch (rErr) {
            console.warn('Erro ao salvar restrição mínima configurada no Wizard:', rErr)
          }
        }
      }

      // 8.2. Persistir Derivações de Centro configuradas no Wizard
      if (isDerived && (derivationRules || []).length > 0) {
        for (const rule of derivationRules || []) {
          try {
            await centerDerivationService.saveDerivationRule(
              {
                ...rule,
                center_code: createdLine.code,
                center_id: createdLine.id,
              },
              'PCP Robotizado (Wizard)',
            )
          } catch (dErr) {
            console.warn('Erro ao salvar regra de derivação no Wizard:', dErr)
          }
        }
      }

      // 9. Gravar Auditoria
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

      // Toast de Sucesso somente após confirmação do backend (verbatim do requisito)
      toast({
        title: 'Sucesso',
        description: 'Centro de Produção cadastrado com sucesso.',
      })

      setCreatedLineRecord(createdLine)
      setSuccessDialogOpen(true)
    } catch (err: any) {
      // Rollback compensatório se a linha foi criada mas as etapas seguintes falharam
      if (createdLineId) {
        try {
          console.warn(
            `[AddLineWizardModal] Executando rollback compensatório da linha ${createdLineId}`,
          )
          await lineMasterService.deleteLine(createdLineId)
          console.info(
            `[AddLineWizardModal] Rollback concluído com sucesso para a linha ${createdLineId}`,
          )
        } catch (rollbackErr) {
          console.error(
            '[AddLineWizardModal] Falha ao executar rollback compensatório:',
            rollbackErr,
          )
        }
      }

      // Logar detalhe técnico detalhado no console — nunca mostrar cru ao usuário
      console.error('[AddLineWizardModal] Erro ao cadastrar linha:', {
        status: err?.status || err?.statusCode || err?.response?.status,
        code: err?.code || err?.data?.code,
        data: err?.data,
        message: err?.message,
        originalError: err,
      })

      const statusHttp = err?.status || err?.statusCode || err?.response?.status
      const errCode = err?.code || err?.data?.code || ''
      const errMessage = String(err?.message || '')
      const dataStr = JSON.stringify(err?.data || '')

      let userFriendlyMessage =
        'Não foi possível concluir o cadastro. Nenhuma informação foi perdida.'

      if (
        statusHttp === 400 &&
        (errCode === 'validation_failed' ||
          dataStr.includes('unique') ||
          dataStr.includes('code') ||
          errMessage.includes('unique') ||
          errMessage.includes('idx_lines_code'))
      ) {
        if (
          dataStr.includes('code') ||
          dataStr.includes('unique') ||
          errMessage.includes('unique')
        ) {
          userFriendlyMessage = 'Já existe uma linha cadastrada com este código.'
        } else {
          userFriendlyMessage = 'Existem informações obrigatórias pendentes.'
        }
      } else if (statusHttp === 403) {
        userFriendlyMessage = 'Seu perfil não possui permissão para cadastrar linhas produtivas.'
      } else if (statusHttp === 400 && errCode === 'validation_failed') {
        userFriendlyMessage = 'Existem informações obrigatórias pendentes.'
      }

      toast({
        variant: 'destructive',
        title: 'Atenção',
        description: userFriendlyMessage,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Wizard com identidade CIAFAL (#004C97) */}
        <div className="bg-[#004C97] p-4 sm:p-5 text-white flex items-center justify-between border-b border-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg border border-white/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2">
                Adicionar Novo Centro de Produção
                <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-medium">
                  Etapa {currentStep} de 6
                </Badge>
              </h2>
              <p className="text-xs text-blue-100">
                Cadastro estruturado do centro de produção, vínculo hierárquico e parâmetros
                técnicos.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-blue-800 hover:text-white h-8 text-xs font-medium"
          >
            Fechar [ESC]
          </Button>
        </div>

        {/* Stepper Progress Bar sem truncamento e com navegação direta */}
        <div className="bg-[#F8FAFC] border-b border-slate-200 p-2.5 flex items-center justify-between gap-1 overflow-x-auto text-xs shrink-0">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            const isActive = currentStep === s.id
            const isDone = currentStep > s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(s.id)
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#004C97] text-white font-bold shadow-xs'
                    : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
                title={s.title}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive
                      ? 'bg-white text-[#004C97]'
                      : isDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {isDone ? <Check className="w-2.5 h-2.5" /> : s.id}
                </div>
                <span>{s.title}</span>
                {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-400 ml-1" />}
              </button>
            )
          })}
        </div>

        {/* Resumo de Pendências Navegável por Etapa */}
        {validationIssuesList.length > 0 && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-900 shrink-0">
            <div className="flex items-center gap-1.5 font-bold mb-1 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Existem {validationIssuesList.length} pendências para concluir o cadastro. Clique em
              um item para corrigir:
            </div>
            <ul className="space-y-1 mt-1.5 pl-2">
              {validationIssuesList.map((issue, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(issue.step)}
                    className="text-left font-medium text-rose-700 hover:text-[#004C97] hover:underline flex items-center gap-1.5"
                  >
                    <span className="font-bold bg-rose-200/80 text-rose-900 px-1 py-0.5 rounded text-[10px]">
                      Etapa {issue.step} - {issue.stepTitle}
                    </span>
                    <span>&rarr; {issue.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Body com Scroll */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-800 bg-white">
          {/* ETAPA 1: Identificação */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#004C97]" />
                  Identificação Básica da Linha & Processo
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os códigos internos e dados operacionais base do novo Centro.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">
                    Código Interno <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: L3, CORTE_02, SOLDA_04"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 font-mono uppercase font-bold focus:border-[#004C97]"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs text-slate-700 font-medium">
                    Nome da Linha <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: Linha de Conformação de Tubos Quadrados III"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 focus:border-[#004C97]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-slate-700 font-medium">
                  Descrição / Finalidade Produtiva
                </Label>
                <Input
                  placeholder="Ex: Produção contínua de perfis leves e médios soldados por indução de alta frequência."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900 focus:border-[#004C97]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Select Empresa */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-semibold text-[#004C97]">
                    Empresa <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={companyId}
                    onChange={(e) => {
                      const newCompanyId = e.target.value
                      setCompanyId(newCompanyId)
                      setHierarchyLineId('') // Limpar Linha ao trocar Empresa
                      const matched = availableCompanies.find((c) => c.id === newCompanyId)
                      if (matched) {
                        setPlant(matched.name)
                        if (matched.sap_company_code) {
                          setSapPlantCode(matched.sap_company_code)
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium p-2 focus:border-[#004C97]"
                  >
                    <option value="">Selecione a empresa...</option>
                    {availableCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{' '}
                        {c.sap_company_code
                          ? `(${c.sap_company_code})`
                          : c.code
                            ? `(${c.code})`
                            : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Linha Produtiva (Filtrada por Empresa) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-semibold text-[#004C97]">
                    Linha Produtiva <span className="text-rose-500">*</span>
                  </Label>
                  {companyId &&
                  availableHierarchyLines.filter((l) => l.company_id === companyId).length === 0 ? (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-900 space-y-1.5">
                      <p>
                        Nenhuma Linha Produtiva cadastrada para esta empresa. Cadastre primeiro a
                        Linha Produtiva em Hierarquia de Linhas.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          onClose()
                          navigate('/pcp/linhas/capacidades')
                        }}
                        className="h-6 text-[10px] bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 w-full"
                      >
                        Ir para Hierarquia de Linhas
                      </Button>
                    </div>
                  ) : (
                    <select
                      value={hierarchyLineId}
                      onChange={(e) => setHierarchyLineId(e.target.value)}
                      disabled={!companyId}
                      className="w-full bg-white border border-slate-300 rounded-md text-xs text-slate-900 p-2 disabled:opacity-50 focus:border-[#004C97]"
                    >
                      <option value="">
                        {!companyId
                          ? 'Selecione primeiro a empresa...'
                          : 'Selecione a Linha Produtiva...'}
                      </option>
                      {availableHierarchyLines
                        .filter((l) => l.company_id === companyId)
                        .map((hl) => (
                          <option key={hl.id} value={hl.id}>
                            {hl.code} - {hl.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-semibold text-[#004C97]">
                    Tipo de Programação <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    value={programmingType}
                    onChange={(e) => setProgrammingType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md text-xs text-slate-900 font-medium p-2 focus:border-[#004C97]"
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
                  <Label className="text-xs text-slate-700 font-medium">Centro SAP (Werk)</Label>
                  <Input
                    value={sapPlantCode}
                    onChange={(e) => setSapPlantCode(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900 font-mono text-xs focus:border-[#004C97]"
                  />
                </div>
              </div>

              {/* Campos SAP / MES Futuros (Regra 5) */}
              <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase block tracking-wider">
                  Mapeamento de Integração SAP / MES (Opcional - Regra 5)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">
                      Centro de Trabalho SAP (Arbpl)
                    </Label>
                    <Input
                      placeholder="Ex: CT_LAM_03"
                      value={sapWorkCenter}
                      onChange={(e) => setSapWorkCenter(e.target.value)}
                      className="bg-white border-slate-300 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">Equipamento SAP (Equnr)</Label>
                    <Input
                      placeholder="Ex: EQ-200941"
                      value={sapEquipmentId}
                      onChange={(e) => setSapEquipmentId(e.target.value)}
                      className="bg-white border-slate-300 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-600">ID de Telemetria MES</Label>
                    <Input
                      placeholder="Ex: MES_PLC_L3_NODE"
                      value={mesIdentifier}
                      onChange={(e) => setMesIdentifier(e.target.value)}
                      className="bg-white border-slate-300 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* CARD DERIVAÇÃO DE CENTRO (HUB CIAFAL) */}
              <CenterDerivationSection
                centerCode={code.trim().toUpperCase() || 'NOVO_CENTRO'}
                centerName={name.trim()}
                isDerived={isDerived}
                onToggleDerived={(val) => {
                  setIsDerived(val)
                  if (!val) setDerivationError(null)
                }}
                rules={derivationRules || []}
                onRulesChange={(newRules) => {
                  const safeRules = Array.isArray(newRules) ? newRules : []
                  setDerivationRules(safeRules)
                  if (safeRules.some((r) => !r.deleted && r.status === 'Ativa')) {
                    setDerivationError(null)
                  }
                }}
                availableCenters={existingLines}
                currentUser="Engenharia PCP"
                validationError={derivationError}
              />
            </div>
          )}

          {/* ETAPA 2: Hierarquia Organizacional */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  Hierarquia Organizacional Associada à Linha
                </h3>
                <p className="text-xs text-slate-500">
                  Associação com a estrutura corporativa do HUB CIAFAL (Diretoria, Gerência,
                  Supervisão).
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Nível 1: Diretoria Industrial
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Diretoria de Operações e Manufatura
                    </span>
                  </div>
                  <select
                    value={orgDirectorId}
                    onChange={(e) => setOrgDirectorId(e.target.value)}
                    className="bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 min-w-[240px] focus:border-[#004C97]"
                  >
                    <option value="">Selecione o Diretor...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Nível 2: Gerência de Produção
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Gerência Industrial de Laminação
                    </span>
                  </div>
                  <select
                    value={orgManagerId}
                    onChange={(e) => setOrgManagerId(e.target.value)}
                    className="bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 min-w-[240px] focus:border-[#004C97]"
                  >
                    <option value="">Selecione o Gerente...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Nível 3: Supervisão de Linha
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Supervisão Técnica e Operacional
                    </span>
                  </div>
                  <select
                    value={orgSupervisorId}
                    onChange={(e) => setOrgSupervisorId(e.target.value)}
                    className="bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 min-w-[240px] focus:border-[#004C97]"
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
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#004C97]" />
                  Gestores Operacionais & Matriz de Aprovadores
                </h3>
                <p className="text-xs text-slate-500">
                  Defina o gestor titular responsável e os homologadores da linha.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Gestor Titular */}
                <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-3">
                  <span className="text-xs font-bold text-[#004C97] uppercase block">
                    Gestor Titular da Linha
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-medium">
                      Usuário Responsável Principal <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={primaryManagerId}
                      onChange={(e) => setPrimaryManagerId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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
                    <Label className="text-xs text-slate-700 font-medium">
                      Gestor Substituto Imediato
                    </Label>
                    <select
                      value={substituteManagerId}
                      onChange={(e) => setSubstituteManagerId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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
                <div className="p-4 bg-[#F8FAFC] border border-slate-200 rounded-lg space-y-3">
                  <span className="text-xs font-bold text-[#004C97] uppercase block">
                    Matriz de Aprovação (PCP & Linha)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-medium">
                      Aprovador PCP (Etapa 1) <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={pcpApproverId}
                      onChange={(e) => setPcpApproverId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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
                    <Label className="text-xs text-slate-700 font-medium">
                      Aprovador da Linha (Etapa 2)
                    </Label>
                    <select
                      value={lineApproverId}
                      onChange={(e) => setLineApproverId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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
                    <Label className="text-xs text-slate-700 font-medium">Regra de Aprovação</Label>
                    <select
                      value={approvalRequirement}
                      onChange={(e) => setApprovalRequirement(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <GitCommit className="w-4 h-4 text-[#004C97]" />
                  Sequenciamento & Dependências Estruturais do Processo
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastre a posição da linha no fluxo da fábrica (predecessores e sucessores).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-amber-700 uppercase block">
                    Etapa Anterior (Predecessor)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-medium">Processo Anterior</Label>
                    <Input
                      placeholder="Ex: Corte Slitter / Pátio de Matéria-Prima"
                      value={prevProcess}
                      onChange={(e) => setPrevProcess(e.target.value)}
                      className="bg-white border-slate-300 text-xs text-slate-900 focus:border-[#004C97]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-medium">
                      Linha Anterior Direta
                    </Label>
                    <select
                      value={prevLineId}
                      onChange={(e) => setPrevLineId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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

                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-emerald-700 uppercase block">
                    Etapa Seguinte (Sucessor)
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-medium">Processo Seguinte</Label>
                    <Input
                      placeholder="Ex: Tratamento Térmico / Acabamento Final"
                      value={nextProcess}
                      onChange={(e) => setNextProcess(e.target.value)}
                      className="bg-white border-slate-300 text-xs text-slate-900 focus:border-[#004C97]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-700 font-medium">
                      Linha Sucessora Direta
                    </Label>
                    <select
                      value={nextLineId}
                      onChange={(e) => setNextLineId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-[#F8FAFC] rounded border border-slate-200 text-xs">
                <div className="space-y-1">
                  <Label className="text-slate-700 font-medium">Lead Time Padrão (Minutos)</Label>
                  <Input
                    type="number"
                    value={leadTimeMinutes}
                    onChange={(e) => setLeadTimeMinutes(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700 font-medium">
                    Capacidade do Pulmão Intermediário
                  </Label>
                  <Input
                    type="number"
                    value={bufferCapacity}
                    onChange={(e) => setBufferCapacity(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-slate-700 font-medium">Unidade do Pulmão</Label>
                  <Input
                    value={bufferUnit}
                    onChange={(e) => setBufferUnit(e.target.value)}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 5: Ficha Mestre Inicial */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#004C97]" />
                  Parâmetros de Capacidade & Ficha Mestre Inicial (v1)
                </h3>
                <p className="text-xs text-slate-500">
                  Defina as cadências nominais e tamanhos de lote do novo Centro.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">
                    Capacidade Horária Nominal <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={nominalHourlyCapacity}
                    onChange={(e) => setNominalHourlyCapacity(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono font-bold focus:border-[#004C97]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">Unidade de Medida</Label>
                  <select
                    value={capacityUnit}
                    onChange={(e) => setCapacityUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded text-xs text-slate-900 p-2 focus:border-[#004C97]"
                  >
                    <option value="t/h">t/h (Toneladas por Hora - Padrão Aço)</option>
                    <option value="peça/h">peça/h (Peças por Hora)</option>
                    <option value="m/h">m/h (Metros por Hora)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">
                    Eficiência Planejada (%)
                  </Label>
                  <Input
                    type="number"
                    value={plannedEfficiencyPct}
                    onChange={(e) => setPlannedEfficiencyPct(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">
                    Lote Mínimo de Produção
                  </Label>
                  <Input
                    type="number"
                    value={minBatchSize}
                    onChange={(e) => setMinBatchSize(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">
                    Lote Máximo Recomendado
                  </Label>
                  <Input
                    type="number"
                    value={maxBatchSize}
                    onChange={(e) => setMaxBatchSize(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-700 font-medium">
                    Duração Padrão do Turno (h)
                  </Label>
                  <Input
                    type="number"
                    value={shiftHours}
                    onChange={(e) => setShiftHours(Number(e.target.value))}
                    className="bg-white border-slate-300 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Seção Restrições Mínimas de Programação por Bitola */}
              <div className="pt-2">
                <GaugeRestrictionsSection
                  lineCode={code || 'NOVO_CENTRO'}
                  restrictions={pendingRestrictions}
                  onAddRestriction={async (dto) => {
                    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    const newItem: LineGaugeMinRestriction = {
                      id: tempId,
                      line_code: (code || 'NOVO_CENTRO').toUpperCase(),
                      restriction_type: dto.restriction_type,
                      min_value: dto.min_value,
                      unit_of_measure: dto.unit_of_measure,
                      rule_description: dto.rule_description,
                      status: dto.status || 'ATIVA',
                      has_scheduling_history: false,
                    }
                    setPendingRestrictions((prev) => [...prev, newItem])
                  }}
                  onUpdateRestriction={async (id, dto) => {
                    setPendingRestrictions((prev) =>
                      prev.map((item) =>
                        item.id === id
                          ? {
                              ...item,
                              restriction_type: dto.restriction_type || item.restriction_type,
                              min_value: dto.min_value ?? item.min_value,
                              unit_of_measure: dto.unit_of_measure || item.unit_of_measure,
                              rule_description: dto.rule_description || item.rule_description,
                              status: dto.status || item.status,
                            }
                          : item,
                      ),
                    )
                  }}
                  onToggleStatus={async (id, newStatus) => {
                    setPendingRestrictions((prev) =>
                      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item)),
                    )
                  }}
                  onDeleteRestriction={async (id) => {
                    setPendingRestrictions((prev) => prev.filter((item) => item.id !== id))
                  }}
                />
              </div>
            </div>
          )}

          {/* ETAPA 6: Revisão & Conformidade */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Revisão Geral e Validação do Cadastro
                </h3>
                <p className="text-xs text-slate-500">
                  Confira todos os parâmetros antes de homologar e gravar no banco de dados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-[#004C97] uppercase block text-[11px]">
                    Identificação & Localização
                  </span>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">Código da Linha:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {code.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">Nome:</span>
                    <span className="text-slate-900 font-medium">{name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">Planta / Centro SAP:</span>
                    <span className="text-slate-900">
                      {plant} ({sapPlantCode})
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Status Inicial:</span>
                    <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px]">
                      {status}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-[#F8FAFC] rounded-lg border border-slate-200 space-y-2">
                  <span className="font-bold text-[#004C97] uppercase block text-[11px]">
                    Governança & Capacidade
                  </span>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">Gestor Titular:</span>
                    <span className="text-slate-900 font-medium">
                      {users.find((u) => u.id === primaryManagerId)?.name ||
                        'Pendente de Atribuição'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">Aprovador PCP:</span>
                    <span className="text-slate-900 font-medium">
                      {users.find((u) => u.id === pcpApproverId)?.name || 'Padrão Sistema'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-1">
                    <span className="text-slate-500">Capacidade Nominal:</span>
                    <span className="text-slate-900 font-mono font-bold">
                      {nominalHourlyCapacity} {capacityUnit}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Ficha Mestre:</span>
                    <span className="text-emerald-700 font-semibold">
                      Versão 1 (Pronta para Edição)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Navegação CIAFAL */}
        <div className="bg-[#F8FAFC] border-t border-slate-200 p-4 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? onClose : handlePrev}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-medium"
          >
            {currentStep === 1 ? 'Cancelar' : 'Voltar Etapa'}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 6 ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-medium text-xs gap-1.5"
              >
                Próxima Etapa <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5 px-6 shadow-sm"
              >
                {saving ? (
                  'Salvando Centro...'
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar Centro
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Diálogo de Sucesso com Tema Clean CIAFAL */}
      <Dialog
        open={successDialogOpen}
        onOpenChange={(openState) => {
          if (!openState && createdLineRecord) {
            setSuccessDialogOpen(false)
            onSuccess(createdLineRecord)
            onClose()
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-base sm:text-lg font-bold text-slate-900">
              Centro salvo com sucesso!
            </DialogTitle>
            <DialogDescription className="text-center text-slate-600 text-xs mt-1">
              O centro de produção{' '}
              <span className="text-[#004C97] font-mono font-bold">
                {createdLineRecord?.code} - {createdLineRecord?.name}
              </span>{' '}
              foi cadastrado com sucesso no HUB CIAFAL e sua Ficha Mestre inicial (Versão 1) já está
              disponível.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                const line = createdLineRecord
                setSuccessDialogOpen(false)
                if (line) onSuccess(line)
                onClose()
              }}
              className="w-full sm:w-auto border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Centros
            </Button>
            <Button
              onClick={() => {
                const line = createdLineRecord
                setSuccessDialogOpen(false)
                if (line) onSuccess(line)
                onClose()
                if (line?.id) {
                  navigate(`/pcp/ficha-mestre?lineId=${line.id}`)
                }
              }}
              className="w-full sm:w-auto bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5 font-bold"
            >
              <ExternalLink className="w-4 h-4" /> Abrir Ficha Mestre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
