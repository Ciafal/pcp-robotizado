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
import {
  ProductionLine,
  LineMaster,
  ProgrammingType,
  LineManagerAssignment,
  LineApproverMatrix,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { Building2, AlertTriangle, ShieldAlert, CheckCircle2, Sliders, Users } from 'lucide-react'

export interface EditLineModalProps {
  open: boolean
  onClose: () => void
  line: ProductionLine | null
  existingLines: ProductionLine[]
  users: UserProfile[]
  onSuccess: (updatedLine: ProductionLine) => void
}

const PROGRAMMING_TYPES: (ProgrammingType | string)[] = [
  'Laminação',
  'Corte Longitudinal',
  'Conformação',
  'Tratamento Térmico',
  'Múltiplo',
  'Padrão',
]

export const EditLineModal: React.FC<EditLineModalProps> = ({
  open,
  onClose,
  line,
  existingLines,
  users,
  onSuccess,
}) => {
  const { toast } = useToast()

  // Form states
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isActive, setIsActive] = useState<boolean>(true)
  const [programmingType, setProgrammingType] = useState<ProgrammingType>('Laminação')
  const [plant, setPlant] = useState('Planta Principal - CIAFAL 01')
  const [sapPlantCode, setSapPlantCode] = useState('1000')
  const [sapWorkCenter, setSapWorkCenter] = useState('')
  const [nominalCapacity, setNominalCapacity] = useState<number>(12)
  const [capacityUnit, setCapacityUnit] = useState<string>('t/h')
  const [efficiency, setEfficiency] = useState<number>(90)
  const [primaryManagerId, setPrimaryManagerId] = useState<string>('')
  const [substituteManagerId, setSubstituteManagerId] = useState<string>('')
  const [pcpApproverId, setPcpApproverId] = useState<string>('')
  const [lineApproverId, setLineApproverId] = useState<string>('')

  // Control states
  const [loadingContext, setLoadingContext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeMasterRecord, setActiveMasterRecord] = useState<LineMaster | null>(null)
  const [managerAssignments, setManagerAssignments] = useState<LineManagerAssignment[]>([])
  const [approversList, setApproversList] = useState<LineApproverMatrix[]>([])

  // Deactivation confirmation modal & blocker states
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [futureSchedulesCount, setFutureSchedulesCount] = useState<number | null>(null)
  const [checkingFutureSchedules, setCheckingFutureSchedules] = useState(false)
  const [blockedByFutureSchedules, setBlockedByFutureSchedules] = useState(false)

  // Initialize and load context when opened
  useEffect(() => {
    if (!open || !line) return

    setName(line.name || '')
    setCode(line.code || '')
    setIsActive(line.is_active !== false)
    setProgrammingType((line.programming_type as ProgrammingType) || 'Laminação')
    setPlant(line.plant || 'Planta Principal - CIAFAL 01')
    setSapPlantCode(line.sap_plant_code || '1000')
    setSapWorkCenter(line.sap_work_center || '')
    setNominalCapacity(Number(line.nominal_capacity || line.current_rate || 12))
    setCapacityUnit(line.capacity_unit || 't/h')
    setEfficiency(Number(line.efficiency || 90))
    setPrimaryManagerId(line.manager_user_id || '')
    setSubstituteManagerId('')
    setPcpApproverId(line.pcp_programmer_user_id || '')
    setLineApproverId('')

    setShowDeactivateConfirm(false)
    setFutureSchedulesCount(null)
    setBlockedByFutureSchedules(false)

    // Load full context (managers, approvers, active master)
    const loadContext = async () => {
      setLoadingContext(true)
      try {
        const overview = await lineMasterService.getLineOverview(line.id)
        if (overview.master) {
          setActiveMasterRecord(overview.master)
          if (overview.master.sap_plant_code) setSapPlantCode(overview.master.sap_plant_code)
          if (overview.master.nominal_hourly_capacity) {
            setNominalCapacity(overview.master.nominal_hourly_capacity)
          }
          if (overview.master.capacity_unit) {
            setCapacityUnit(overview.master.capacity_unit)
          }
        }
        if (overview.managers && overview.managers.length > 0) {
          setManagerAssignments(overview.managers)
          const primary = overview.managers.find((m) => m.responsibility_type === 'PRIMARY_MANAGER')
          const substitute = overview.managers.find(
            (m) => m.responsibility_type === 'SUBSTITUTE_MANAGER',
          )
          if (primary?.user_id) setPrimaryManagerId(primary.user_id)
          if (substitute?.user_id) setSubstituteManagerId(substitute.user_id)
        }
        if (overview.approvers && overview.approvers.length > 0) {
          setApproversList(overview.approvers)
          const pcp = overview.approvers.find((a) => a.approval_type === 'PCP_APPROVAL')
          const lm = overview.approvers.find((a) => a.approval_type === 'LINE_MANAGER_APPROVAL')
          if (pcp?.user_id) setPcpApproverId(pcp.user_id)
          if (lm?.user_id) setLineApproverId(lm.user_id)
        }
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

    if (!targetActive && isActive) {
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
      setIsActive(targetActive)
    }
  }

  const handleConfirmDeactivation = () => {
    setIsActive(false)
    setShowDeactivateConfirm(false)
  }

  const handleSave = async () => {
    if (!line) return

    // 1. Validations
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'O nome da linha produtiva é obrigatório.',
      })
      return
    }

    if (!code.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'O código interno da linha é obrigatório.',
      })
      return
    }

    // Check code uniqueness against other lines
    const duplicateCode = existingLines.some(
      (l) => l.id !== line.id && l.code.trim().toUpperCase() === code.trim().toUpperCase(),
    )
    if (duplicateCode) {
      toast({
        variant: 'destructive',
        title: 'Código duplicado',
        description: `Já existe outra linha cadastrada com o código ${code.trim().toUpperCase()}.`,
      })
      return
    }

    if (nominalCapacity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Capacidade inválida',
        description: 'A capacidade nominal deve ser maior que zero.',
      })
      return
    }

    // If changing to inactive, verify future schedules again as safety
    if (line.is_active !== false && !isActive) {
      const count = await lineMasterService.checkFutureSchedulesCount(line.code)
      if (count > 0) {
        toast({
          variant: 'destructive',
          title: 'Inativação Bloqueada',
          description: `Esta linha possui ${count} itens programados em datas futuras. Resolva ou transfira os itens programados antes de concluir a inativação.`,
        })
        return
      }
    }

    setSaving(true)
    try {
      // 1. Atualiza dados estruturais da linha
      const lineUpdatePayload: Partial<ProductionLine> = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        is_active: isActive,
        programming_type: programmingType,
        plant,
        sap_plant_code: sapPlantCode.trim(),
        sap_work_center: sapWorkCenter.trim() || undefined,
        current_rate: nominalCapacity,
        nominal_capacity: nominalCapacity,
        capacity_unit: capacityUnit,
        efficiency,
        manager_user_id: primaryManagerId || undefined,
        pcp_programmer_user_id: pcpApproverId || undefined,
      }

      const updatedLine = await lineMasterService.updateLine(line.id, lineUpdatePayload)

      // 2. Se o status ativo/inativo foi alterado, assegurar toggleLineActive para auditoria oficial se necessário
      if (line.is_active !== isActive) {
        try {
          await lineMasterService.toggleLineActive(line.id, isActive)
        } catch (statusErr: any) {
          console.warn('Status toggle via service:', statusErr)
        }
      }

      // 3. Atualiza ou sincroniza Ficha Mestre correspondente
      if (activeMasterRecord?.id) {
        await lineMasterService.saveLineMaster({
          id: activeMasterRecord.id,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          programming_type: programmingType,
          sap_plant_code: sapPlantCode.trim(),
          nominal_hourly_capacity: nominalCapacity,
          capacity_unit: capacityUnit as any,
          planned_efficiency_pct: efficiency,
          primary_responsible_id: primaryManagerId || undefined,
          substitute_responsible_id: substituteManagerId || undefined,
        })
      }

      // 4. Sincroniza Gestor Titular e Substituto se preenchidos
      if (primaryManagerId) {
        const existingPrimary = managerAssignments.find(
          (m) => m.responsibility_type === 'PRIMARY_MANAGER',
        )
        await lineMasterService.saveManagerAssignment({
          id: existingPrimary?.id,
          line_id: line.id,
          user_id: primaryManagerId,
          responsibility_type: 'PRIMARY_MANAGER',
          role_title: `Gestor Titular da Linha ${code.trim().toUpperCase()}`,
          active: true,
          scope_description: 'Responsabilidade operacional principal da linha.',
        })
      }

      if (substituteManagerId) {
        const existingSubstitute = managerAssignments.find(
          (m) => m.responsibility_type === 'SUBSTITUTE_MANAGER',
        )
        await lineMasterService.saveManagerAssignment({
          id: existingSubstitute?.id,
          line_id: line.id,
          user_id: substituteManagerId,
          responsibility_type: 'SUBSTITUTE_MANAGER',
          role_title: `Gestor Substituto da Linha ${code.trim().toUpperCase()}`,
          active: true,
          scope_description: 'Cobertura operacional de férias e substituição programada.',
        })
      }

      // 5. Sincroniza Aprovador PCP e Gestor Homologador
      if (pcpApproverId) {
        const existingPcp = approversList.find((a) => a.approval_type === 'PCP_APPROVAL')
        await lineMasterService.saveApprover({
          id: existingPcp?.id,
          line_id: line.id,
          user_id: pcpApproverId,
          approval_stage: 'STAGE_1_PCP',
          approval_type: 'PCP_APPROVAL',
          requirement_type: 'MANDATORY',
          sequence_order: 1,
          role_title: 'Analista de Planejamento PCP Homologador',
          active: true,
        })
      }

      if (lineApproverId) {
        const existingLineApp = approversList.find(
          (a) => a.approval_type === 'LINE_MANAGER_APPROVAL',
        )
        await lineMasterService.saveApprover({
          id: existingLineApp?.id,
          line_id: line.id,
          user_id: lineApproverId,
          approval_stage: 'STAGE_2_LINE_MANAGER',
          approval_type: 'LINE_MANAGER_APPROVAL',
          requirement_type: 'MANDATORY',
          sequence_order: 2,
          role_title: 'Gestor Operacional da Linha Homologador',
          active: true,
        })
      }

      // 6. Auditoria de edição cadastral
      try {
        await lineMasterService.recordAuditVersion({
          line_id: line.id,
          line_master_id: activeMasterRecord?.id,
          version: (activeMasterRecord?.version ?? 1) + 1,
          action: 'UPDATE',
          changed_fields: [
            'name',
            'code',
            'is_active',
            'programming_type',
            'sap_plant_code',
            'nominal_capacity',
          ],
          change_reason: `Edição cadastral da linha ${code}. Status: ${isActive ? 'Ativa' : 'Inativa'}`,
          snapshot_data: {
            name,
            code,
            is_active: isActive,
            programming_type: programmingType,
            sap_plant_code: sapPlantCode,
            nominal_capacity: nominalCapacity,
            efficiency,
            primaryManagerId,
            pcpApproverId,
          },
        })
      } catch (auditErr) {
        console.warn('Falha ao gravar auditoria:', auditErr)
      }

      toast({
        title: 'Linha Atualizada com Sucesso',
        description: `Os dados da linha ${code.trim().toUpperCase()} e status (${isActive ? 'Ativa' : 'Inativa'}) foram persistidos.`,
      })

      onSuccess(updatedLine)
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar alterações da linha',
        description: err.message || 'Verifique os dados e tente novamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!line) return null

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200">
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-[#004C97] via-[#003870] to-slate-900 text-white rounded-t-lg">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-200" />
                    <DialogTitle className="text-lg font-black tracking-tight text-white">
                      Editar Linha Produtiva
                    </DialogTitle>
                    <span className="font-mono text-cyan-300 font-bold text-xs bg-blue-950/80 px-2 py-0.5 rounded border border-blue-400/30">
                      {line.code}
                    </span>
                  </div>
                  <DialogDescription className="text-xs text-blue-100/80">
                    Ajuste de status operacional, capacidade nominal e responsáveis corporativos.
                  </DialogDescription>
                </div>

                {/* Badge de status atual */}
                <div>
                  {isActive ? (
                    <Badge className="bg-emerald-600 text-white font-bold text-xs">
                      ● Linha Ativa
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-600 text-white font-bold text-xs">
                      ○ Linha Inativa
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5 bg-slate-50">
            {/* Bloco 1: Status Operacional (Ativa / Inativa) */}
            <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Status Cadastral da Linha
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Linhas inativas deixam de receber novas programações, preservando todo o
                    histórico.
                  </p>
                </div>

                <div className="flex rounded-md border border-slate-300 p-0.5 bg-slate-50 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => handleStatusChange(true)}
                    className={`py-1 px-3 rounded text-center transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ● Ativa
                  </button>
                  <button
                    type="button"
                    disabled={checkingFutureSchedules}
                    onClick={() => handleStatusChange(false)}
                    className={`py-1 px-3 rounded text-center transition-all ${
                      !isActive
                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ○ Inativa
                  </button>
                </div>
              </div>

              {blockedByFutureSchedules && futureSchedulesCount !== null && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    Esta linha possui <strong>{futureSchedulesCount}</strong> itens programados em
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
                    Código Interno da Linha *
                  </Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="h-8 text-xs font-mono font-bold bg-slate-50 uppercase"
                    placeholder="Ex.: L1, L2, CORTE_01"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Nome Oficial da Linha *
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                    placeholder="Ex.: Laminação L1 - Barras e Perfis"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Tipo de Programação</Label>
                  <select
                    value={programmingType}
                    onChange={(e) => setProgrammingType(e.target.value as ProgrammingType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium focus:ring-1 focus:ring-[#004C97]"
                  >
                    {PROGRAMMING_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Planta Fabril</Label>
                  <Input
                    value={plant}
                    onChange={(e) => setPlant(e.target.value)}
                    className="h-8 text-xs bg-slate-50"
                    placeholder="Ex.: Planta Principal - CIAFAL 01"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">Centro SAP (Werk)</Label>
                  <Input
                    value={sapPlantCode}
                    onChange={(e) => setSapPlantCode(e.target.value)}
                    className="h-8 text-xs font-mono bg-slate-50"
                    placeholder="Ex.: 1000"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-700">
                    Centro de Trabalho SAP
                  </Label>
                  <Input
                    value={sapWorkCenter}
                    onChange={(e) => setSapWorkCenter(e.target.value)}
                    className="h-8 text-xs font-mono bg-slate-50"
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
                      value={nominalCapacity}
                      onChange={(e) => setNominalCapacity(Number(e.target.value))}
                      className="h-8 text-xs font-mono font-bold bg-slate-50 flex-1"
                    />
                    <select
                      value={capacityUnit}
                      onChange={(e) => setCapacityUnit(e.target.value)}
                      className="bg-slate-50 border border-slate-300 rounded px-2 h-8 text-xs text-slate-800 font-medium"
                    >
                      <option value="t/h">t/h</option>
                      <option value="peça/h">peça/h</option>
                      <option value="m/h">m/h</option>
                    </select>
                  </div>
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
                    value={efficiency}
                    onChange={(e) => setEfficiency(Number(e.target.value))}
                    className="h-8 text-xs font-mono bg-slate-50"
                  />
                </div>
              </div>
            </div>

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
                    value={primaryManagerId}
                    onChange={(e) => setPrimaryManagerId(e.target.value)}
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
                    value={substituteManagerId}
                    onChange={(e) => setSubstituteManagerId(e.target.value)}
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
                    value={pcpApproverId}
                    onChange={(e) => setPcpApproverId(e.target.value)}
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
                    value={lineApproverId}
                    onChange={(e) => setLineApproverId(e.target.value)}
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

          {/* Rodapé com Ações */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">
              {loadingContext
                ? 'Sincronizando Ficha Mestre...'
                : 'Alterações preservam integridade e auditoria.'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={saving}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || loadingContext}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold text-xs h-8 gap-1.5"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                Inativar linha produtiva?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              A linha deixará de estar disponível para novas programações. A Ficha Mestre,
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
              Inativar Linha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
