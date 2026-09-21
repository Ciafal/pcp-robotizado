import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { lineMasterService } from '@/services/line-master'
import { invalidateCompletenessCache } from '@/services/master-sheet-completeness'
import { pcpAuditService, computeDiff, FieldChange } from '@/services/pcp-audit-service'
import {
  ProductionLine,
  LineMaster,
  ProgrammingType,
  LineManagerAssignment,
  LineApproverMatrix,
  PROGRAMMING_TYPES_CATALOG,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { Building2, AlertTriangle, ShieldAlert, CheckCircle2, Sliders, Users } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { LineGaugeMinRestriction } from '@/types/line-gauge-restriction'
import { lineGaugeRestrictionService } from '@/services/line-gauge-restriction-service'
import { GaugeRestrictionsSection } from '@/components/line-master/GaugeRestrictionsSection'
import { CenterDerivationSection } from './CenterDerivationSection'
import { centerDerivationService } from '@/services/pcp-center-derivation-service'
import { CenterDerivationRule } from '@/types/center-derivation'

export interface EditLineModalProps {
  open: boolean
  onClose: () => void
  line: ProductionLine | null
  existingLines: ProductionLine[]
  users: UserProfile[]
  onSuccess: (updatedLine: ProductionLine) => void
}

export const EditLineModal: React.FC<EditLineModalProps> = ({
  open,
  onClose,
  line,
  existingLines,
  users,
  onSuccess,
}) => {
  const { toast } = useToast()

  // Unified form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isActive: true,
    companyId: '',
    hierarchyLineId: '',
    programmingType: 'Laminação' as ProgrammingType,
    processName: '',
    hierarchyDescription: 'Não alocado em uma linha',
    sapPlantCode: '1000',
    sapWorkCenter: '',
    nominalCapacity: 12,
    capacityUnit: 't/h',
    efficiency: 90,
    primaryManagerId: '',
    substituteManagerId: '',
    pcpApproverId: '',
    lineApproverId: '',
  })

  // Collections state
  const [availableCompanies, setAvailableCompanies] = useState<
    Array<{ id: string; name: string; code?: string; sap_company_code?: string; status: string }>
  >([])
  const [availableHierarchyLines, setAvailableHierarchyLines] = useState<
    Array<{ id: string; code: string; name: string; plant_id?: string; company_id?: string }>
  >([])

  // Control states
  const [loadingContext, setLoadingContext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeMasterRecord, setActiveMasterRecord] = useState<LineMaster | null>(null)
  const [managerAssignments, setManagerAssignments] = useState<LineManagerAssignment[]>([])
  const [approversList, setApproversList] = useState<LineApproverMatrix[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)

  // Restrições Mínimas de Programação por Bitola (1:N)
  const [gaugeRestrictions, setGaugeRestrictions] = useState<LineGaugeMinRestriction[]>([])
  const [loadingRestrictions, setLoadingRestrictions] = useState<boolean>(false)

  // Derivação de Centro (1:N)
  const [isDerived, setIsDerived] = useState<boolean>(false)
  const [derivationRules, setDerivationRules] = useState<CenterDerivationRule[]>([])
  const [derivationError, setDerivationError] = useState<string | null>(null)

  // Deactivation confirmation modal & blocker states
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [futureSchedulesCount, setFutureSchedulesCount] = useState<number | null>(null)
  const [checkingFutureSchedules, setCheckingFutureSchedules] = useState(false)
  const [blockedByFutureSchedules, setBlockedByFutureSchedules] = useState(false)

  // Initialize and load context when opened
  useEffect(() => {
    if (!open || !line) return

    setValidationErrors({})
    let hierarchyText = 'Não alocado em uma linha'
    if (line.plant) {
      hierarchyText = line.plant
    }

    setFormData({
      name: line.name || '',
      code: line.code || '',
      isActive: line.is_active !== false,
      companyId: '',
      hierarchyLineId: '',
      programmingType: (line.programming_type as ProgrammingType) || 'Laminação',
      processName: line.process || '',
      hierarchyDescription: hierarchyText,
      sapPlantCode: line.sap_plant_code || '1000',
      sapWorkCenter: line.sap_work_center || '',
      nominalCapacity: Number(line.nominal_capacity || line.current_rate || 12),
      capacityUnit: line.capacity_unit || 't/h',
      efficiency: Number(line.efficiency || 90),
      primaryManagerId: line.manager_user_id || '',
      substituteManagerId: '',
      pcpApproverId: line.pcp_programmer_user_id || '',
      lineApproverId: '',
    })

    setShowDeactivateConfirm(false)
    setFutureSchedulesCount(null)
    setBlockedByFutureSchedules(false)
    setIsDirty(false)
    setShowCancelConfirmDialog(false)

    // Load full context (managers, approvers, active master, companies, hierarchy lines)
    const loadContext = async () => {
      setLoadingContext(true)
      try {
        // Carregar empresas reais e linhas produtivas reais do PocketBase
        const [companiesRes, linesRes, plantsRes] = await Promise.all([
          pb
            .collection('companies')
            .getFullList({
              filter: "status='ACTIVE'",
              sort: 'name',
            })
            .catch((e) => {
              console.warn('Erro ao carregar companies:', e)
              return []
            }),
          pb
            .collection('production_lines')
            .getFullList({
              sort: 'code',
            })
            .catch((e) => {
              console.warn('Erro ao carregar production_lines:', e)
              return []
            }),
          pb
            .collection('plants')
            .getFullList()
            .catch((e) => {
              console.warn('Erro ao carregar plants:', e)
              return []
            }),
        ])

        const plantMap = new Map<string, string>()
        plantsRes.forEach((p: any) => {
          if (p.id && p.company_id) {
            plantMap.set(p.id, p.company_id)
          }
        })

        const mappedLines = linesRes.map((l: any) => ({
          id: l.id,
          code: l.code,
          name: l.name,
          plant_id: l.plant_id,
          company_id: l.plant_id ? plantMap.get(l.plant_id) : undefined,
        }))

        setAvailableCompanies(companiesRes as any[])
        setAvailableHierarchyLines(mappedLines)

        const overview = await lineMasterService.getLineOverview(line.id)
        if (overview.master) {
          setActiveMasterRecord(overview.master)
        }

        // Tentar resolver Empresa e Linha Produtiva a partir do registro real
        let detectedCompanyId = ''
        let detectedHierarchyLineId = ''

        // 1. Verificar se line.plant_id aponta para um plant
        if (line.plant_id) {
          const compId = plantMap.get(line.plant_id)
          if (compId) {
            detectedCompanyId = compId
          }
        }

        // 2. Verificar dependências de sequenciamento onde este centro seja next_line_id
        try {
          const parentDeps = await pb.collection('line_sequencing_dependencies').getFullList({
            filter: `next_line_id = '${line.id}'`,
            expand: 'line_id',
          })
          if (parentDeps && parentDeps.length > 0) {
            const parentLine = parentDeps[0].line_id
            if (parentLine) {
              detectedHierarchyLineId = parentLine
              const pLineObj = mappedLines.find((m) => m.id === parentLine)
              if (pLineObj?.company_id && !detectedCompanyId) {
                detectedCompanyId = pLineObj.company_id
              }
            }
          }
        } catch (depErr) {
          console.warn('Erro ao buscar dependência hierárquica:', depErr)
        }

        // 3. Fallback inteligente baseado no sapPlantCode ou sap_company_code
        if (!detectedCompanyId && (line.sap_plant_code || overview.master?.sap_plant_code)) {
          const codeToFind = (line.sap_plant_code || overview.master?.sap_plant_code || '').trim()
          const matchedComp = (companiesRes as any[]).find(
            (c) => c.sap_company_code === codeToFind || c.code === codeToFind,
          )
          if (matchedComp) {
            detectedCompanyId = matchedComp.id
          }
        }

        // Se ainda não encontrou empresa mas existe CIAFAL (1000)
        if (!detectedCompanyId && companiesRes.length > 0) {
          const ciafal = (companiesRes as any[]).find(
            (c) => c.sap_company_code === '1000' || c.name?.includes('CIAFAL'),
          )
          if (ciafal) {
            detectedCompanyId = ciafal.id
          }
        }

        // Se a própria linha está em availableHierarchyLines e possui company_id
        const selfInLines = mappedLines.find((l) => l.id === line.id)
        if (selfInLines && !detectedHierarchyLineId) {
          detectedHierarchyLineId = selfInLines.id
          if (selfInLines.company_id && !detectedCompanyId) {
            detectedCompanyId = selfInLines.company_id
          }
        }

        let updatedHierarchyDesc = hierarchyText
        // Identificar vínculo hierárquico se houver predecessor/sequenciamento
        if (overview.sequencing && overview.sequencing.length > 0) {
          const firstSeq = overview.sequencing[0]
          const prev = firstSeq.expand?.previous_line_id
          const next = firstSeq.expand?.next_line_id
          const orderStr = String(firstSeq.sequence_order).padStart(2, '0')
          if (prev) {
            updatedHierarchyDesc = `CIAFAL → ${prev.code} → posição ${orderStr}`
          } else if (next) {
            updatedHierarchyDesc = `CIAFAL → ${next.code} → posição ${orderStr}`
          } else {
            updatedHierarchyDesc = `CIAFAL → ${line.code} (posição ${orderStr})`
          }
        } else if (line.code === 'ENF_L1') {
          updatedHierarchyDesc = 'CIAFAL → L1 → posição 01'
        } else if (line.code === 'L1') {
          updatedHierarchyDesc = 'CIAFAL → L1 (Linha Principal)'
        } else if (line.code === 'ACAB_L2' || line.code === 'L2' || line.code === 'ENDIR') {
          updatedHierarchyDesc = `CIAFAL → L2 → ${line.code}`
        }

        let resolvedPrimaryMgr = line.manager_user_id || ''
        let resolvedSubstituteMgr = ''
        if (overview.managers && overview.managers.length > 0) {
          setManagerAssignments(overview.managers)
          const primary = overview.managers.find((m) => m.responsibility_type === 'PRIMARY_MANAGER')
          const substitute = overview.managers.find(
            (m) => m.responsibility_type === 'SUBSTITUTE_MANAGER',
          )
          if (primary?.user_id) resolvedPrimaryMgr = primary.user_id
          if (substitute?.user_id) resolvedSubstituteMgr = substitute.user_id
        }

        let resolvedPcpApp = line.pcp_programmer_user_id || ''
        let resolvedLineApp = ''
        if (overview.approvers && overview.approvers.length > 0) {
          setApproversList(overview.approvers)
          const pcp = overview.approvers.find((a) => a.approval_type === 'PCP_APPROVAL')
          const lm = overview.approvers.find((a) => a.approval_type === 'LINE_MANAGER_APPROVAL')
          if (pcp?.user_id) resolvedPcpApp = pcp.user_id
          if (lm?.user_id) resolvedLineApp = lm.user_id
        }

        // Carregar Restrições Mínimas por Bitola do Centro
        setLoadingRestrictions(true)
        try {
          const loadedRes = await lineGaugeRestrictionService.listByLine(line.code)
          setGaugeRestrictions(loadedRes)
        } catch (rErr) {
          console.warn('Erro ao carregar restrições mínimas por bitola:', rErr)
        } finally {
          setLoadingRestrictions(false)
        }

        // Carregar Derivações de Centro cadastradas com isolamento de falha
        try {
          const rules = await centerDerivationService.getDerivationsByCenter(line.code)
          const safeRules = Array.isArray(rules) ? rules : []
          setDerivationRules(safeRules)
          setIsDerived(Boolean(line.is_derived || safeRules.length > 0))
        } catch (dErr) {
          console.warn('Erro ao carregar derivações do centro:', dErr)
          setDerivationRules([])
          setIsDerived(Boolean(line.is_derived))
        }

        setFormData((prev) => ({
          ...prev,
          sapPlantCode: overview.master?.sap_plant_code || prev.sapPlantCode,
          nominalCapacity: overview.master?.nominal_hourly_capacity ?? prev.nominalCapacity,
          capacityUnit: overview.master?.capacity_unit || prev.capacityUnit,
          companyId: detectedCompanyId || prev.companyId,
          hierarchyLineId: detectedHierarchyLineId || prev.hierarchyLineId,
          hierarchyDescription: updatedHierarchyDesc,
          primaryManagerId: resolvedPrimaryMgr,
          substituteManagerId: resolvedSubstituteMgr,
          pcpApproverId: resolvedPcpApp,
          lineApproverId: resolvedLineApp,
        }))
      } catch (err) {
        console.warn('Erro ao carregar contexto detalhado da linha para edição:', err)
      } finally {
        setLoadingContext(false)
      }
    }

    loadContext()
  }, [open, line])

  // Handle switching status toggle
  const handleStatusChange = async (targetActive: boolean) => {
    if (!line) return

    if (!targetActive && formData.isActive) {
      // Trying to deactivate: check future schedules count first
      setCheckingFutureSchedules(true)
      try {
        const count = await lineMasterService.checkFutureSchedulesCount(line.code)
        setFutureSchedulesCount(count)
        if (count > 0) {
          setBlockedByFutureSchedules(true)
          toast({
            variant: 'destructive',
            title: 'Inativação Bloqueada',
            description: `Esta linha possui ${count} itens programados em datas futuras. Resolva ou transfira os itens programados antes de concluir a inativação.`,
          })
          return
        }
        // Count is 0: show confirmation dialog
        setBlockedByFutureSchedules(false)
        setShowDeactivateConfirm(true)
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro na verificação de programações',
          description: err.message || 'Falha ao verificar programações futuras.',
        })
      } finally {
        setCheckingFutureSchedules(false)
      }
    } else {
      // Re-activating: directly set state
      setFormData((prev) => ({ ...prev, isActive: targetActive }))
    }
  }

  const handleConfirmDeactivation = () => {
    setFormData((prev) => ({ ...prev, isActive: false }))
    setIsDirty(true)
    setShowDeactivateConfirm(false)
  }

  const handleRequestCancel = () => {
    if (isDirty) {
      setShowCancelConfirmDialog(true)
    } else {
      onClose()
    }
  }

  const handleSave = async () => {
    if (!line) return

    const errors: Record<string, string> = {}

    // Validações obrigatórias com mensagens amigáveis e específicas
    if (!formData.code.trim()) {
      errors.code = 'Código Interno do Centro é obrigatório.'
    }

    if (!formData.name.trim()) {
      errors.name = 'Nome Oficial do Centro é obrigatório.'
    }

    const numCapacity = Number(formData.nominalCapacity)
    if (isNaN(numCapacity) || numCapacity <= 0) {
      errors.nominalCapacity = 'Capacidade Nominal Horária é obrigatória.'
    }

    const isCodeDuplicate = existingLines.some(
      (l) => l.id !== line.id && l.code.toUpperCase() === formData.code.trim().toUpperCase(),
    )
    if (isCodeDuplicate) {
      errors.code = `Já existe outro Centro cadastrado com o código ${formData.code.trim().toUpperCase()}.`
    }

    // Validação estrita da Derivação de Centro
    // Se "Centro derivado? = Sim", exigir pelo menos 1 regra válida e ativa
    if (isDerived) {
      const activeRules = derivationRules.filter((r) => !r.deleted && r.status === 'Ativa')
      if (activeRules.length === 0) {
        const msg = 'Existe uma Regra de Derivação incompleta.'
        setDerivationError(msg)
        toast({
          variant: 'destructive',
          title: 'Não foi possível salvar o Centro',
          description: msg,
        })
        return
      }
    }
    setDerivationError(null)

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar o Centro',
        description: Object.values(errors)[0],
      })
      return
    }

    setValidationErrors({})

    // If changing to inactive, verify future schedules again as safety
    if (line.is_active !== false && !formData.isActive) {
      try {
        const count = await lineMasterService.checkFutureSchedulesCount(line.code)
        if (count > 0) {
          toast({
            variant: 'destructive',
            title: 'Inativação Bloqueada',
            description: `Esta linha possui ${count} itens programados em datas futuras. Resolva ou transfira os itens programados antes de concluir a inativação.`,
          })
          return
        }
      } catch (checkErr) {
        console.warn('Erro ao verificar programações futuras:', checkErr)
      }
    }

    setSaving(true)

    const sanitizeNumber = (val: unknown): number | null => {
      if (val === '' || val === null || val === undefined) return null
      const n = Number(val)
      return isNaN(n) ? null : n
    }

    const parsedCapacity = sanitizeNumber(formData.nominalCapacity) ?? 0.1
    const parsedEfficiency = sanitizeNumber(formData.efficiency) ?? 90

    // Montar mapa de usuários para resolução de nomes em computeDiff
    const usersMap: Record<string, string> = {}
    users.forEach((u) => {
      usersMap[u.id] = u.name ? `${u.name} (${u.role || 'PCP'})` : u.email
    })

    // Montar snapshot antes x depois
    const beforeSnapshot: Record<string, any> = {
      name: line.name || '',
      code: line.code || '',
      is_active: line.is_active !== false,
      programming_type: (line.programming_type as ProgrammingType) || 'Laminação',
      process: line.process || '',
      sap_work_center: line.sap_work_center || '',
      nominal_hourly_capacity:
        activeMasterRecord?.nominal_hourly_capacity ??
        line.nominal_capacity ??
        line.current_rate ??
        12,
      capacity_unit: activeMasterRecord?.capacity_unit || line.capacity_unit || 't/h',
      planned_efficiency_pct: activeMasterRecord?.planned_efficiency_pct ?? line.efficiency ?? 90,
      primary_responsible_id:
        line.manager_user_id || activeMasterRecord?.primary_responsible_id || '',
      substitute_responsible_id: activeMasterRecord?.substitute_responsible_id || '',
      pcp_approver_id: line.pcp_programmer_user_id || '',
      line_approver_id:
        approversList.find((a) => a.approval_type === 'LINE_MANAGER_APPROVAL')?.user_id || '',
    }

    const afterSnapshot: Record<string, any> = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      is_active: formData.isActive,
      programming_type: formData.programmingType,
      process: formData.processName.trim(),
      sap_work_center: formData.sapWorkCenter.trim(),
      nominal_hourly_capacity: parsedCapacity,
      capacity_unit: formData.capacityUnit,
      planned_efficiency_pct: parsedEfficiency,
      primary_responsible_id: formData.primaryManagerId || '',
      substitute_responsible_id: formData.substituteManagerId || '',
      pcp_approver_id: formData.pcpApproverId || '',
      line_approver_id: formData.lineApproverId || '',
    }

    const calculatedChanges: FieldChange[] = computeDiff(beforeSnapshot, afterSnapshot, {
      usersMap,
    })

    try {
      // 1. Atualiza dados estritos do centro de produção com getOne de confirmação
      const lineUpdatePayload: Partial<ProductionLine> = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        is_active: formData.isActive,
        is_derived: isDerived,
        programming_type: formData.programmingType,
        process: formData.processName.trim(),
        sap_work_center: formData.sapWorkCenter.trim() || undefined,
        current_rate: parsedCapacity,
        nominal_capacity: parsedCapacity,
        capacity_unit: formData.capacityUnit,
        efficiency: parsedEfficiency,
        manager_user_id: formData.primaryManagerId ? formData.primaryManagerId : (null as any),
        pcp_programmer_user_id: formData.pcpApproverId ? formData.pcpApproverId : (null as any),
      }

      const updatedLine = await lineMasterService.updateLine(line.id, lineUpdatePayload)

      // 2. Se o status ativo/inativo foi alterado, sincronizar com toggleLineActive
      if (line.is_active !== formData.isActive) {
        try {
          await lineMasterService.toggleLineActive(line.id, formData.isActive)
        } catch (statusErr: unknown) {
          console.warn('Status toggle via service:', statusErr)
        }
      }

      // 3. Atualiza ou sincroniza Ficha Mestre correspondente (coleção line_masters via upsert)
      const cleanReason = `Edição cadastral do centro ${formData.code.trim().toUpperCase()}. Status: ${formData.isActive ? 'Ativo' : 'Inativo'}`
      await lineMasterService.saveLineMaster({
        id: activeMasterRecord?.id,
        line_id: line.id,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        programming_type: formData.programmingType,
        process_step: formData.processName.trim() || 'Processo Industrial',
        sap_plant_code: formData.sapPlantCode.trim(),
        nominal_hourly_capacity: parsedCapacity,
        capacity_unit: formData.capacityUnit as any,
        planned_efficiency_pct: parsedEfficiency,
        primary_responsible_id: formData.primaryManagerId
          ? formData.primaryManagerId
          : (null as any),
        substitute_responsible_id: formData.substituteManagerId
          ? formData.substituteManagerId
          : (null as any),
        change_reason: cleanReason,
      })

      // 4. Sincroniza Gestor Titular e Substituto em coleções de responsáveis (line_managers_assignment)
      const existingPrimary = managerAssignments.find(
        (m) => m.responsibility_type === 'PRIMARY_MANAGER',
      )
      if (formData.primaryManagerId) {
        try {
          await lineMasterService.saveManagerAssignment({
            id: existingPrimary?.id,
            line_id: line.id,
            user_id: formData.primaryManagerId,
            responsibility_type: 'PRIMARY_MANAGER',
            role_title: `Gestor Titular da Linha ${formData.code.trim().toUpperCase()}`,
            active: true,
            scope_description: 'Responsabilidade operacional principal da linha.',
          })
        } catch (mgrErr: unknown) {
          console.warn('Falha ao salvar gestor titular:', mgrErr)
        }
      } else if (existingPrimary?.id) {
        // Desvincular se foi limpo
        try {
          await lineMasterService.deleteManagerAssignment(existingPrimary.id)
        } catch (delMgrErr) {
          console.warn('Falha ao desvincular gestor titular anterior:', delMgrErr)
        }
      }

      const existingSubstitute = managerAssignments.find(
        (m) => m.responsibility_type === 'SUBSTITUTE_MANAGER',
      )
      if (formData.substituteManagerId) {
        try {
          await lineMasterService.saveManagerAssignment({
            id: existingSubstitute?.id,
            line_id: line.id,
            user_id: formData.substituteManagerId,
            responsibility_type: 'SUBSTITUTE_MANAGER',
            role_title: `Gestor Substituto da Linha ${formData.code.trim().toUpperCase()}`,
            active: true,
            scope_description: 'Cobertura operacional de férias e substituição programada.',
          })
        } catch (subErr: unknown) {
          console.warn('Falha ao salvar gestor substituto:', subErr)
        }
      } else if (existingSubstitute?.id) {
        // Desvincular substituto se foi limpo
        try {
          await lineMasterService.deleteManagerAssignment(existingSubstitute.id)
        } catch (delSubErr) {
          console.warn('Falha ao desvincular gestor substituto anterior:', delSubErr)
        }
      }

      // 5. Sincroniza Aprovador PCP e Gestor Homologador (line_approvers_matrix)
      const existingPcp = approversList.find((a) => a.approval_type === 'PCP_APPROVAL')
      if (formData.pcpApproverId) {
        try {
          await lineMasterService.saveApprover({
            id: existingPcp?.id,
            line_id: line.id,
            user_id: formData.pcpApproverId,
            approval_stage: 'STAGE_1_PCP',
            approval_type: 'PCP_APPROVAL',
            requirement_type: 'MANDATORY',
            sequence_order: 1,
            role_title: 'Analista de Planejamento PCP Homologador',
            active: true,
          })
        } catch (pcpErr: unknown) {
          console.warn('Falha ao salvar aprovador PCP:', pcpErr)
        }
      } else if (existingPcp?.id) {
        try {
          await lineMasterService.deleteApprover(existingPcp.id)
        } catch (delPcpErr) {
          console.warn('Falha ao desvincular aprovador PCP anterior:', delPcpErr)
        }
      }

      const existingLineApp = approversList.find((a) => a.approval_type === 'LINE_MANAGER_APPROVAL')
      if (formData.lineApproverId) {
        try {
          await lineMasterService.saveApprover({
            id: existingLineApp?.id,
            line_id: line.id,
            user_id: formData.lineApproverId,
            approval_stage: 'STAGE_2_LINE_MANAGER',
            approval_type: 'LINE_MANAGER_APPROVAL',
            requirement_type: 'MANDATORY',
            sequence_order: 2,
            role_title: 'Gestor Operacional da Linha Homologador',
            active: true,
          })
        } catch (lineAppErr: unknown) {
          console.warn('Falha ao salvar aprovador do gestor da linha:', lineAppErr)
        }
      } else if (existingLineApp?.id) {
        try {
          await lineMasterService.deleteApprover(existingLineApp.id)
        } catch (delLineAppErr) {
          console.warn('Falha ao desvincular gestor homologador anterior:', delLineAppErr)
        }
      }

      // 6. Invalida cache de completude da linha
      invalidateCompletenessCache(line.id)

      // 7. Auditoria de edição cadastral oficial via pcpAuditService.recordLog
      if (calculatedChanges.length > 0) {
        try {
          await pcpAuditService.recordLog({
            event_type: 'Alteração',
            action: `Alteração cadastral do centro ${formData.code.trim().toUpperCase()}`,
            module: 'Centros e Ficha Mestra',
            screen: 'Editar Centro',
            company: 'CIAFAL',
            line: formData.code.trim().toUpperCase(),
            center: formData.code.trim().toUpperCase(),
            record_id: line.id,
            entity: 'Centros e Ficha Mestra',
            outcome: 'SUCCESS',
            status: 'Concluída',
            reason: cleanReason,
            justification: `Parâmetros do centro ${formData.code.trim().toUpperCase()} atualizados via formulário Editar Centro.`,
            changes: calculatedChanges,
            details: {
              before: beforeSnapshot,
              after: afterSnapshot,
            },
          })
        } catch (auditLogErr) {
          console.warn('Falha ao gravar log oficial de auditoria antes/depois:', auditLogErr)
        }
      }

      // Auditoria de versão de ficha mestra
      try {
        await lineMasterService.recordAuditVersion({
          line_id: line.id,
          line_master_id: activeMasterRecord?.id,
          version: (activeMasterRecord?.version ?? 1) + 1,
          action: 'UPDATE',
          changed_fields: calculatedChanges.map((c) => c.field),
          change_reason: cleanReason,
          snapshot_data: afterSnapshot,
        })
      } catch (auditErr) {
        console.warn('Falha ao gravar auditoria de versão:', auditErr)
      }

      // Data e hora da atualização no formato DD/MM/AAAA HH:mm
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const formattedTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`
      setLastSavedTime(formattedTimestamp)
      setIsDirty(false)

      // Toast de confirmação real da persistência
      const centerLabel = `${formData.code.trim().toUpperCase()} — ${formData.name.trim()}`
      toast({
        title: 'Centro salvo com sucesso',
        description: `Centro: ${centerLabel} | Última atualização: ${formattedTimestamp}`,
      })

      // onSuccess recarrega listagem sem fechar abruptamente se usuário quiser continuar
      await onSuccess(updatedLine)
    } catch (err: unknown) {
      console.error('Erro ao salvar alterações da linha:', err)

      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as any).message)
            : 'Falha de persistência no cadastro do Centro.'

      // Registrar a falha no serviço de auditoria existente (pcp_audit_logs) com status "Erro" e diff tentado
      try {
        await pcpAuditService.recordFailureAttempt({
          operation: `Salvar alterações do centro ${formData.code.trim().toUpperCase()}`,
          module: 'Centros e Ficha Mestra',
          screen: 'Editar Centro',
          line: formData.code.trim().toUpperCase(),
          center: formData.code.trim().toUpperCase(),
          recordId: line.id,
          errorMessage,
          changesAttempted: calculatedChanges.length > 0 ? calculatedChanges : undefined,
          reason: 'Falha ao atualizar parâmetros cadastrais',
          justification: `Tentativa de salvar alterações do centro ${formData.code.trim().toUpperCase()} falhou.`,
        })
      } catch (auditFailureErr) {
        console.warn('Erro ao registrar auditoria de falha:', auditFailureErr)
      }

      // Em erro, manter o modal aberto com todos os valores digitados preservados
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar o Centro',
        description: errorMessage || 'Falha de persistência no cadastro do Centro.',
      })
    } finally {
      setSaving(false)
    }
  }
  if (!line) return null

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && handleRequestCancel()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 border-slate-200 overflow-hidden">
          {/* Header Fixo */}
          <div className="p-5 bg-gradient-to-r from-[#004C97] via-[#003870] to-slate-900 text-white rounded-t-lg shrink-0">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-200" />
                    <DialogTitle className="text-lg font-black tracking-tight text-white">
                      Editar Centro
                    </DialogTitle>
                    <span className="font-mono text-cyan-300 font-bold text-xs bg-blue-950/80 px-2 py-0.5 rounded border border-blue-400/30">
                      {line.code}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-blue-100/80">
                    Ajuste de status operacional, capacidade nominal, processo e responsáveis
                    corporativos.
                  </DialogDescription>
                </div>

                {/* Badge de status atual */}
                <div>
                  {formData.isActive ? (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs">
                      ● Centro Ativo
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-600 text-white font-bold text-xs">
                      ○ Centro Inativo
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Form Content com Scroll Vertical */}
          <div className="p-6 space-y-5 bg-slate-50 flex-1 overflow-y-auto">
            {/* Bloco 1: Status Operacional (Ativo / Inativo) */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Status Cadastral do Centro
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Centros inativos deixam de receber novas programações, preservando todo o
                    histórico.
                  </p>
                </div>

                <div className="flex rounded-md border border-slate-300 p-0.5 bg-slate-50 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(true)}
                    className={`py-1 px-3 rounded text-center transition-all ${
                      formData.isActive
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ● Ativo
                  </button>
                  <button
                    type="button"
                    disabled={checkingFutureSchedules}
                    onClick={() => handleStatusChange(false)}
                    className={`py-1 px-3 rounded text-center transition-all ${
                      !formData.isActive
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ○ Inativo
                  </button>
                </div>
              </div>

              {blockedByFutureSchedules && futureSchedulesCount !== null && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Este centro possui <strong>{futureSchedulesCount}</strong> itens programados em
                    datas futuras. Resolva ou transfira os itens programados antes de concluir a
                    inativação.
                  </span>
                </div>
              )}
            </div>

            {/* Bloco 2: Identificação Estrutural */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#004C97]" /> Identificação & Parâmetros
                Estruturais
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Código Interno do Centro *
                  </Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setFormData((prev) => ({ ...prev, code: val }))
                      setIsDirty(true)
                      if (validationErrors.code) {
                        setValidationErrors((prev) => ({ ...prev, code: '' }))
                      }
                    }}
                    className={`h-8 text-xs font-mono font-bold bg-slate-50 uppercase ${
                      validationErrors.code
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300'
                    }`}
                    placeholder="Ex.: L1, L2, ENF_L1"
                  />
                  {validationErrors.code && (
                    <p className="text-[11px] text-rose-600 font-medium">{validationErrors.code}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Nome Oficial do Centro *
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value
                      setFormData((prev) => ({ ...prev, name: val }))
                      setIsDirty(true)
                      if (validationErrors.name) {
                        setValidationErrors((prev) => ({ ...prev, name: '' }))
                      }
                    }}
                    className={`h-8 text-xs bg-slate-50 ${
                      validationErrors.name
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300'
                    }`}
                    placeholder="Ex.: Enfornamento L1 / Laminação L1"
                  />
                  {validationErrors.name && (
                    <p className="text-[11px] text-rose-600 font-medium">{validationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Processo *</Label>
                  <Input
                    value={formData.processName}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, processName: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="h-8 text-xs bg-slate-50 border-slate-300"
                    placeholder="Ex.: Conformação, Laminação, Aquecimento..."
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Tipo de Programação</Label>
                  <select
                    value={formData.programmingType}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        programmingType: e.target.value as ProgrammingType,
                      }))
                      setIsDirty(true)
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    {PROGRAMMING_TYPES_CATALOG.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Hierarquia da Linha</Label>
                  <Input
                    value={formData.hierarchyDescription}
                    readOnly
                    className="h-8 text-xs bg-slate-100 text-slate-700 font-mono cursor-not-allowed"
                    title="Vínculo organizacional e sequencial do centro na Linha Produtiva"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Centro SAP (Werk)</Label>
                  <Input
                    value={formData.sapPlantCode}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, sapPlantCode: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="h-8 text-xs font-mono bg-slate-50 border-slate-300"
                    placeholder="Ex.: 1000"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Centro de Trabalho SAP
                  </Label>
                  <Input
                    value={formData.sapWorkCenter}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, sapWorkCenter: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="h-8 text-xs font-mono bg-slate-50 border-slate-300"
                    placeholder="Ex.: CRHD_LAM_L1"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Capacidade Nominal Horária *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.nominalCapacity}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setFormData((prev) => ({ ...prev, nominalCapacity: val }))
                        setIsDirty(true)
                        if (validationErrors.nominalCapacity) {
                          setValidationErrors((prev) => ({ ...prev, nominalCapacity: '' }))
                        }
                      }}
                      className={`h-8 text-xs font-mono font-bold bg-slate-50 flex-1 ${
                        validationErrors.nominalCapacity
                          ? 'border-rose-500 focus:ring-rose-500'
                          : 'border-slate-300'
                      }`}
                    />
                    <select
                      value={formData.capacityUnit}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, capacityUnit: e.target.value }))
                        setIsDirty(true)
                      }}
                      className="bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium"
                    >
                      <option value="t/h">t/h</option>
                      <option value="peça/h">peça/h</option>
                      <option value="m/h">m/h</option>
                    </select>
                  </div>
                  {validationErrors.nominalCapacity && (
                    <p className="text-[11px] text-rose-600 font-medium">
                      {validationErrors.nominalCapacity}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Eficiência Planejada OEE (%)
                  </Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={formData.efficiency}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, efficiency: Number(e.target.value) }))
                      setIsDirty(true)
                    }}
                    className="h-8 text-xs font-mono bg-slate-50 border-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Bloco: DERIVAÇÃO DE CENTRO (1:N) */}
            <CenterDerivationSection
              centerCode={formData.code || line.code}
              centerName={formData.name || line.name}
              isDerived={isDerived}
              onToggleDerived={(val) => {
                setIsDerived(val)
                setIsDirty(true)
                if (!val) setDerivationError(null)
              }}
              rules={derivationRules}
              onRulesChange={(newRules) => {
                setDerivationRules(newRules)
                if (newRules.some((r) => !r.deleted && r.status === 'Ativa')) {
                  setDerivationError(null)
                }
              }}
              availableCenters={existingLines}
              currentUser={
                users.find((u) => u.id === formData.primaryManagerId)?.name || 'Engenharia PCP'
              }
              validationError={derivationError}
            />

            {/* Bloco: RESTRIÇÕES MÍNIMAS DE PROGRAMAÇÃO POR BITOLA (1:N) */}
            <GaugeRestrictionsSection
              lineCode={formData.code || line.code}
              lineId={line.id}
              restrictions={gaugeRestrictions}
              isLoading={loadingRestrictions}
              onAddRestriction={async (dto) => {
                const created = await lineGaugeRestrictionService.create(
                  { ...dto, line_id: line.id, line_code: formData.code || line.code },
                  {
                    lineName: formData.name || line.name,
                    centerCode: formData.code || line.code,
                  },
                )
                setGaugeRestrictions((prev) => [...prev, created])
              }}
              onUpdateRestriction={async (id, dto) => {
                const updated = await lineGaugeRestrictionService.update(id, dto, {
                  lineName: formData.name || line.name,
                  centerCode: formData.code || line.code,
                })
                setGaugeRestrictions((prev) =>
                  prev.map((item) => (item.id === id ? updated : item)),
                )
              }}
              onToggleStatus={async (id, newStatus) => {
                const updated = await lineGaugeRestrictionService.toggleStatus(id, newStatus, {
                  lineName: formData.name || line.name,
                  centerCode: formData.code || line.code,
                })
                setGaugeRestrictions((prev) =>
                  prev.map((item) => (item.id === id ? updated : item)),
                )
              }}
              onDeleteRestriction={async (id) => {
                await lineGaugeRestrictionService.delete(id, {
                  lineName: formData.name || line.name,
                  centerCode: formData.code || line.code,
                })
                setGaugeRestrictions((prev) => prev.filter((item) => item.id !== id))
              }}
            />

            {/* Bloco 3: Gestores e Aprovadores */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#004C97]" /> Gestores Operacionais & Matriz de
                Aprovadores
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Gestor Operacional Titular *
                  </Label>
                  <select
                    value={formData.primaryManagerId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, primaryManagerId: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    <option value="">Selecione o Gestor Titular...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Gestor Substituto</Label>
                  <select
                    value={formData.substituteManagerId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, substituteManagerId: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    <option value="">Selecione o Gestor Substituto (opcional)...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Aprovador Homologador PCP *
                  </Label>
                  <select
                    value={formData.pcpApproverId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, pcpApproverId: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    <option value="">Selecione o Aprovador PCP...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Aprovador do Gestor da Linha
                  </Label>
                  <select
                    value={formData.lineApproverId}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, lineApproverId: e.target.value }))
                      setIsDirty(true)
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    <option value="">Selecione o Gestor Homologador (opcional)...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé FIXO interno com [Cancelar] e [Salvar Centro] */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0 sticky bottom-0 z-10 shadow-sm">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Alterações não salvas
                </span>
              ) : lastSavedTime ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 text-[11px] font-medium">
                  ✓ Alterações salvas ({lastSavedTime})
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">
                  {loadingContext
                    ? 'Sincronizando Ficha Mestre...'
                    : 'Alterações preservam integridade e auditoria.'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRequestCancel}
                disabled={saving}
                className="h-8 text-xs bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={saving || loadingContext}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold text-xs h-8 gap-1.5 shadow-xs"
              >
                {saving ? 'Salvando Centro...' : 'Salvar Centro'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Cancelar no Editar Centro */}
      {showCancelConfirmDialog && (
        <Dialog open={showCancelConfirmDialog} onOpenChange={setShowCancelConfirmDialog}>
          <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-800 p-4">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Alterações não salvas
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-slate-600 py-2">
              Existem alterações no cadastro deste Centro que ainda não foram salvas.
            </p>
            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirmDialog(false)}
                className="text-xs"
              >
                Continuar editando
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowCancelConfirmDialog(false)
                  setIsDirty(false)
                  onClose()
                }}
                className="text-xs"
              >
                Descartar alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmação Estrita para Inativar Linha Produtiva */}
      <AlertDialog
        open={showDeactivateConfirm}
        onOpenChange={(val) => !val && setShowDeactivateConfirm(false)}
      >
        <AlertDialogContent className="bg-white border-slate-200 max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <AlertDialogTitle className="text-base font-bold text-slate-900">
                Inativar centro de produção?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              O centro deixará de estar disponível para novas programações. A Ficha Mestre,
              histórico, programações realizadas e registros de auditoria serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel
              onClick={() => setShowDeactivateConfirm(false)}
              className="text-xs h-8"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeactivation}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-8"
            >
              Inativar Centro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
