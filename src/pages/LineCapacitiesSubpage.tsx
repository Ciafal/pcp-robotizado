import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Building2,
  GitBranch,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Gauge,
  Clock,
  Activity,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { lineMasterService } from '@/services/line-master'
import type { ProductionLine, LineSequencingDependency, LineMaster } from '@/types/line-master'

interface CompanyRecord {
  id: string
  code: string
  name: string
  status: string
}

interface PlantRecord {
  id: string
  code: string
  name: string
  company_id: string
}

interface CenterSequenceItem {
  dependencyId?: string
  centerId: string
  centerCode: string
  centerName: string
  sequenceOrder: number
  isActive: boolean
  operationalStatus: string // 'running' | 'idle' | 'stopped' | 'maintenance'
  process: string
  nominalCapacity: number
  capacityUnit: string
  efficiency: number
  shiftsCount: number
  sapWorkCenter?: string
}

interface HierarchyLineStructure {
  id: string
  code: string
  name: string
  companyId: string
  companyCode: string
  companyName: string
  plantId?: string
  description?: string
  status: string // 'running' | 'idle' | 'stopped' | 'maintenance'
  isActive: boolean
  centers: CenterSequenceItem[]
}

export default function LineCapacitiesSubpage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingSequence, setSavingSequence] = useState(false)
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [plants, setPlants] = useState<PlantRecord[]>([])
  const [lineMasters, setLineMasters] = useState<LineMaster[]>([])
  const [dependencies, setDependencies] = useState<LineSequencingDependency[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL')

  // Estado local editável da hierarquia
  const [hierarchyLines, setHierarchyLines] = useState<HierarchyLineStructure[]>([])

  // Modal: Cadastrar Linha Produtiva
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [creatingLine, setCreatingLine] = useState(false)
  const [createForm, setCreateForm] = useState({
    companyId: '',
    name: '',
    description: '',
    status: 'ACTIVE', // Ativa / Inativa
  })
  const [createFieldError, setCreateFieldError] = useState<string | null>(null)

  // Modal: Editar Linha Produtiva
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingLineLoading, setEditingLineLoading] = useState(false)
  const [editingLineStruct, setEditingLineStruct] = useState<HierarchyLineStructure | null>(null)
  const [editForm, setEditForm] = useState({
    companyId: '',
    code: '',
    name: '',
    description: '',
    status: 'ACTIVE', // Ativa / Inativa
  })
  const [editFieldError, setEditFieldError] = useState<string | null>(null)
  const [removeConfirmItem, setRemoveConfirmItem] = useState<{
    lineId: string
    centerIndex: number
    centerName: string
    centerCode: string
  } | null>(null)

  // Diálogo shadcn de remoção de centro do card principal
  const [centerToRemove, setCenterToRemove] = useState<{
    lineId: string
    centerIndex: number
    centerId: string
    centerCode: string
    centerName: string
    dependencyId?: string
  } | null>(null)
  const [isRemovingCenter, setIsRemovingCenter] = useState(false)

  // Modal de bloqueio quando centro possui dependências ativas
  const [blockingDependencies, setBlockingDependencies] = useState<{
    centerCode: string
    centerName: string
    reasons: Array<{
      type: 'ROUTE' | 'SCHEDULE' | 'BOTTLENECK'
      title: string
      details: string
    }>
  } | null>(null)

  // Modal: Adicionar Centro à Linha
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [targetLineIdForAdd, setTargetLineIdForAdd] = useState<string>('')
  const [selectedCenterIdToAdd, setSelectedCenterIdToAdd] = useState<string>('')
  const [addingCenter, setAddingCenter] = useState(false)
  const [confirmInactiveCenterWarning, setConfirmInactiveCenterWarning] = useState(false)

  // 1. Carregar dados reais das coleções do PocketBase
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Carregar Empresas existentes
      let compList: CompanyRecord[] = []
      try {
        compList = await pb.collection('companies').getFullList<CompanyRecord>({
          sort: 'code',
        })
      } catch (e) {
        console.warn('Erro ao carregar companies:', e)
      }

      if (compList.length === 0) {
        compList = [
          { id: 'ciafal_default', code: 'CIAFAL', name: 'CIAFAL Wilson Santos', status: 'ACTIVE' },
        ]
      }
      setCompanies(compList)

      // Carregar Plantas existentes
      let plantList: PlantRecord[] = []
      try {
        plantList = await pb.collection('plants').getFullList<PlantRecord>({
          sort: 'code',
        })
      } catch (e) {
        console.warn('Erro ao carregar plants:', e)
      }
      setPlants(plantList)

      // Carregar todas as linhas/centros cadastrados
      const allLines = await pb.collection('production_lines').getFullList<ProductionLine>({
        sort: 'code',
      })
      setLines(allLines)

      // Carregar Fichas Mestras para vincular processo e capacidade técnica
      let allMasters: LineMaster[] = []
      try {
        allMasters = await pb.collection('line_masters').getFullList<LineMaster>({
          filter: `status = 'ACTIVE'`,
          sort: '-version',
        })
      } catch (e) {
        console.warn('Erro ao carregar line_masters:', e)
      }
      setLineMasters(allMasters)

      // Carregar dependências de sequenciamento existentes
      const allDeps = await pb
        .collection('line_sequencing_dependencies')
        .getFullList<LineSequencingDependency>({
          sort: 'sequence_order',
        })
      setDependencies(allDeps)

      // Helper para identificar empresa de um registro de linha
      const resolveCompanyForLine = (l: ProductionLine): CompanyRecord => {
        if (l.plant_id) {
          const matchedPlant = plantList.find((p) => p.id === l.plant_id)
          if (matchedPlant?.company_id) {
            const matchedComp = compList.find((c) => c.id === matchedPlant.company_id)
            if (matchedComp) return matchedComp
          }
        }
        const upperCode = (l.code || '').toUpperCase()
        const upperName = (l.name || '').toUpperCase()
        if (upperCode.includes('KS-FERRADURA') || upperCode.includes('ENVIO-KSF')) {
          const comp = compList.find(
            (c) => c.code.includes('FERRADURA') || c.name.includes('Ferradura'),
          )
          if (comp) return comp
        }
        if (upperCode.includes('KS-CIAFAL') || upperCode.includes('ENVIO-KSC')) {
          const comp = compList.find(
            (c) => c.code.includes('KS-CIAFAL') || c.name.includes('KS - Ciafal'),
          )
          if (comp) return comp
        }
        if (upperCode.includes('KS') || upperName.includes('KS')) {
          const comp = compList.find((c) => c.code.includes('KS') || c.name.includes('KS'))
          if (comp) return comp
        }
        if (
          upperCode.includes('SDC') ||
          upperCode.includes('SIDERCENTRO') ||
          upperName.includes('SIDERCENTRO')
        ) {
          const comp = compList.find(
            (c) => c.code.includes('SIDERCENTRO') || c.name.includes('Sidercentro'),
          )
          if (comp) return comp
        }
        if (
          upperCode.includes('CSM') ||
          upperCode.includes('CISAM') ||
          upperName.includes('CISAM')
        ) {
          const comp = compList.find((c) => c.code.includes('CISAM') || c.name.includes('Cisam'))
          if (comp) return comp
        }
        // Default: CIAFAL
        return compList.find((c) => c.code.includes('CIAFAL')) || compList[0]
      }

      // Regra de domínio CIAFAL: Centros de produção vs Linhas Produtivas
      // Centros conhecidos: ENF_L1, ACAB_L2, ENDIR, RETRAB
      const knownCenterCodes = new Set(['ENF_L1', 'ACAB_L2', 'ENDIR', 'RETRAB'])

      // Linhas principais: qualquer linha que não seja exclusivamente centro
      // Ou seja: L1, L2, BLOCOS KS, TARUGOS KS, ENVIO-KSF, ENVIO-KSC, MULTIPLOKS, INSPKS, e quaisquer novas linhas cadastradas
      const lineRecords = allLines.filter((l) => !knownCenterCodes.has(l.code))

      const structured: HierarchyLineStructure[] = lineRecords.map((line) => {
        const company = resolveCompanyForLine(line)

        // Centros associados via line_sequencing_dependencies com normalização defensiva
        const centerDeps = allDeps.filter((d) => d && d.line_id === line.id)

        const centers: CenterSequenceItem[] = []

        if (centerDeps.length > 0) {
          centerDeps.forEach((dep) => {
            const targetCenterId = dep.next_line_id || dep.line_id
            const centerLine = allLines.find((l) => l.id === targetCenterId)
            if (centerLine && !centers.some((c) => c.centerId === centerLine.id)) {
              // Buscar processo e unidade reais da Ficha Mestra
              const master = allMasters.find(
                (m) => m.line_id === centerLine.id || m.code === centerLine.code,
              )
              const realProcess =
                master?.process_step ||
                centerLine.process ||
                centerLine.programming_type ||
                'Não informado'
              const realUnit = master?.capacity_unit || centerLine.capacity_unit || 't/h'
              const realCapacity =
                master?.nominal_hourly_capacity ||
                centerLine.nominal_capacity ||
                centerLine.current_rate ||
                0

              centers.push({
                dependencyId: dep.id,
                centerId: centerLine.id,
                centerCode: centerLine.code,
                centerName: centerLine.name,
                sequenceOrder: dep.sequence_order || (centers.length + 1) * 10,
                isActive: centerLine.is_active !== false,
                operationalStatus: centerLine.status || 'running',
                process: realProcess,
                nominalCapacity: realCapacity,
                capacityUnit: realUnit,
                efficiency: centerLine.efficiency || 90,
                shiftsCount: centerLine.shifts_count || 3,
                sapWorkCenter: centerLine.sap_work_center,
              })
            }
          })
        } else {
          // Centros nativos padrão da linha caso nenhuma dependência exista no banco ainda
          if (line.code === 'L1') {
            const enfCenter = allLines.find((l) => l.code === 'ENF_L1')
            if (enfCenter) {
              const enfMaster = allMasters.find((m) => m.code === 'ENF_L1')
              centers.push({
                centerId: enfCenter.id,
                centerCode: enfCenter.code,
                centerName: enfCenter.name,
                sequenceOrder: 10,
                isActive: enfCenter.is_active !== false,
                operationalStatus: enfCenter.status || 'running',
                process: enfMaster?.process_step || enfCenter.process || 'Enfornamento / Forno',
                nominalCapacity:
                  enfMaster?.nominal_hourly_capacity || enfCenter.nominal_capacity || 50,
                capacityUnit: enfMaster?.capacity_unit || enfCenter.capacity_unit || 't/h',
                efficiency: enfCenter.efficiency || 96,
                shiftsCount: enfCenter.shifts_count || 3,
                sapWorkCenter: enfCenter.sap_work_center,
              })
            }
            const l1Master = allMasters.find((m) => m.code === 'L1')
            centers.push({
              centerId: line.id,
              centerCode: line.code,
              centerName: line.name,
              sequenceOrder: 20,
              isActive: line.is_active !== false,
              operationalStatus: line.status || 'running',
              process: l1Master?.process_step || line.process || 'Laminação Contínua',
              nominalCapacity: l1Master?.nominal_hourly_capacity || line.nominal_capacity || 120,
              capacityUnit: l1Master?.capacity_unit || line.capacity_unit || 't/h',
              efficiency: line.efficiency || 98,
              shiftsCount: line.shifts_count || 3,
              sapWorkCenter: line.sap_work_center,
            })
          } else if (line.code === 'L2') {
            const l2Master = allMasters.find((m) => m.code === 'L2')
            centers.push({
              centerId: line.id,
              centerCode: line.code,
              centerName: line.name,
              sequenceOrder: 10,
              isActive: line.is_active !== false,
              operationalStatus: line.status || 'idle',
              process: l2Master?.process_step || line.process || 'Laminação Pesada L2',
              nominalCapacity: l2Master?.nominal_hourly_capacity || line.nominal_capacity || 18,
              capacityUnit: l2Master?.capacity_unit || line.capacity_unit || 't/h',
              efficiency: line.efficiency || 95,
              shiftsCount: line.shifts_count || 3,
              sapWorkCenter: line.sap_work_center,
            })
            const acabCenter = allLines.find((l) => l.code === 'ACAB_L2')
            if (acabCenter) {
              const acabMaster = allMasters.find((m) => m.code === 'ACAB_L2')
              centers.push({
                centerId: acabCenter.id,
                centerCode: acabCenter.code,
                centerName: acabCenter.name,
                sequenceOrder: 20,
                isActive: acabCenter.is_active !== false,
                operationalStatus: acabCenter.status || 'running',
                process: acabMaster?.process_step || acabCenter.process || 'Acabamento e Embalagem',
                nominalCapacity:
                  acabMaster?.nominal_hourly_capacity || acabCenter.nominal_capacity || 58,
                capacityUnit: acabMaster?.capacity_unit || acabCenter.capacity_unit || 'peça',
                efficiency: acabCenter.efficiency || 97,
                shiftsCount: acabCenter.shifts_count || 3,
                sapWorkCenter: acabCenter.sap_work_center,
              })
            }
          }
        }

        // Ordenar por sequenceOrder
        centers.sort((a, b) => a.sequenceOrder - b.sequenceOrder)

        // Normalizar numeração em saltos 10, 20, 30...
        centers.forEach((c, idx) => {
          c.sequenceOrder = (idx + 1) * 10
        })

        return {
          id: line.id,
          code: line.code,
          name: line.name,
          companyId: company.id,
          companyCode: company.code,
          companyName: company.name,
          plantId: line.plant_id,
          description: line.description || `Linha Produtiva ${line.name}`,
          status: line.status || 'running',
          isActive: line.is_active !== false,
          centers,
        }
      })

      setHierarchyLines(structured)
    } catch (err: any) {
      console.error('Erro ao carregar dados da hierarquia:', err)
      toast({
        title: 'Erro ao carregar hierarquia',
        description: err.message || 'Falha ao sincronizar dados industriais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtragem por empresa com normalização defensiva de centers
  const filteredHierarchy = useMemo(() => {
    const list = Array.isArray(hierarchyLines) ? hierarchyLines : []
    const normalized = list.map((l) => ({
      ...l,
      centers: Array.isArray(l.centers) ? l.centers : [],
    }))
    if (selectedCompanyId === 'ALL') return normalized
    return normalized.filter((l) => l.companyId === selectedCompanyId)
  }, [hierarchyLines, selectedCompanyId])

  // Tradução amigável de status operacional
  const getOperationalStatusDisplay = (status: string) => {
    switch (status) {
      case 'running':
        return {
          label: 'Em produção',
          variant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        }
      case 'idle':
        return { label: 'Disponível', variant: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'maintenance':
        return { label: 'Em manutenção', variant: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'stopped':
        return { label: 'Parada', variant: 'bg-rose-50 text-rose-700 border-rose-200' }
      default:
        return {
          label: status || 'Disponível',
          variant: 'bg-slate-50 text-slate-700 border-slate-200',
        }
    }
  }

  // ==========================================
  // FASE 2: CADASTRAR LINHA PRODUTIVA
  // ==========================================
  const handleOpenCreateModal = () => {
    setCreateFieldError(null)
    setCreateForm({
      companyId: companies.length > 0 ? companies[0].id : '',
      name: '',
      description: '',
      status: 'ACTIVE',
    })
    setIsCreateModalOpen(true)
  }

  // Gera identificador técnico automático no formato LIN-{planta}-{slug da linha}-{sufixo 4 chars}
  const generateTechnicalLineCode = (companyId: string, lineName: string): string => {
    const targetComp = companies.find((c) => c.id === companyId)
    const plantForComp = plants.find((p) => p.company_id === companyId)

    // Planta: code ou fallback WERKS
    const plantCodeRaw =
      (targetComp as any)?.sap_company_code || targetComp?.code || plantForComp?.code || '1000'
    const plantCodeClean =
      plantCodeRaw
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 6) || '1000'

    // Slug simples do nome da linha (maiúsculo, sem acentos, caracteres alfanuméricos)
    const slug =
      lineName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8) || 'LIN'

    // Sufixo aleatório de 4 caracteres alfanuméricos (ex.: A7K2)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let suffix = ''
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    return `LIN-${plantCodeClean}-${slug}-${suffix}`
  }

  const handleCreateLine = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateFieldError(null)

    const trimmedName = createForm.name.trim()

    if (!trimmedName) {
      setCreateFieldError('O nome oficial da linha é obrigatório.')
      return
    }
    if (!createForm.companyId) {
      setCreateFieldError('Selecione a empresa da linha produtiva.')
      return
    }

    // Gerar identificador técnico automaticamente no formato LIN-{planta}-{slug}-{sufixo 4 chars}
    let generatedCode = generateTechnicalLineCode(createForm.companyId, trimmedName)

    // Garantir unicidade contra linhas existentes
    let attempts = 0
    while (
      lines.some((l) => l.code.toUpperCase() === generatedCode.toUpperCase()) &&
      attempts < 10
    ) {
      generatedCode = generateTechnicalLineCode(createForm.companyId, trimmedName)
      attempts++
    }

    setCreatingLine(true)
    try {
      // Descobrir plant_id associada à empresa para vincular
      const plantForCompany = plants.find((p) => p.company_id === createForm.companyId)

      // Payload estritamente compatível com o schema de production_lines
      const payload: Partial<ProductionLine> = {
        code: generatedCode,
        name: trimmedName,
        description: createForm.description.trim() || `Linha Produtiva ${trimmedName}`,
        status: 'idle',
        target_rate: 100,
        current_rate: 0,
        efficiency: 90,
        shifts_count: 3,
        nominal_capacity: 100,
        capacity_unit: 't/h',
        is_active: createForm.status === 'ACTIVE',
        programming_type: 'Laminação',
        plant_id: plantForCompany ? plantForCompany.id : undefined,
      }

      // POST real na coleção production_lines
      const createdRecord = await pb.collection('production_lines').create<ProductionLine>(payload)

      // Leitura de confirmação rigorosa antes do toast
      const confirmed = await pb
        .collection('production_lines')
        .getOne<ProductionLine>(createdRecord.id)
      if (!confirmed || confirmed.id !== createdRecord.id) {
        throw new Error('Falha na confirmação de gravação do registro pelo servidor.')
      }

      // Auditoria em try/catch isolada em pcp_audit_logs
      try {
        const targetComp = companies.find((c) => c.id === createForm.companyId)
        const currentUser = pb.authStore.record || pb.authStore.model
        await pb.collection('pcp_audit_logs').create({
          user_id: currentUser?.id || null,
          user_email: (currentUser as any)?.email || '',
          user_name: (currentUser as any)?.name || 'Administrador PCP',
          user_role: (currentUser as any)?.role || 'PCP_ADMIN',
          event_type: 'SCHEDULE_ACTION',
          action: 'CREATE_PRODUCTION_LINE',
          resource: 'production_lines',
          resource_id: confirmed.id,
          permission_required: 'pcp.lines.manage',
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            companyId: createForm.companyId,
            companyCode: targetComp?.code,
            code: confirmed.code,
            name: confirmed.name,
            status: confirmed.status,
            is_active: confirmed.is_active,
          },
        })
      } catch (auditErr) {
        console.warn('Auditoria em pcp_audit_logs falhou (não bloqueante):', auditErr)
      }
      // Toast somente após confirmação real
      toast({
        title: 'Sucesso',
        description: 'Linha produtiva cadastrada com sucesso.',
      })

      setIsCreateModalOpen(false)
      // Recarregar dados reais
      await loadData()
    } catch (err: any) {
      console.error('Erro ao cadastrar linha produtiva:', err)
      setCreateFieldError(
        'Não foi possível cadastrar a linha produtiva. Verifique os dados e tente novamente.',
      )
    } finally {
      setCreatingLine(false)
    }
  }

  // ==========================================
  // FASE 3: EDITAR LINHA PRODUTIVA
  // ==========================================
  const handleOpenEditModal = (lineStruct: HierarchyLineStructure) => {
    setEditFieldError(null)
    setEditingLineStruct(JSON.parse(JSON.stringify(lineStruct)))
    setEditForm({
      companyId: lineStruct.companyId,
      code: lineStruct.code,
      name: lineStruct.name,
      description: lineStruct.description || '',
      status: lineStruct.isActive ? 'ACTIVE' : 'INACTIVE',
    })
    setIsEditModalOpen(true)
  }

  const handleEditMoveCenter = (centerIndex: number, direction: 'UP' | 'DOWN') => {
    if (!editingLineStruct) return
    const newCenters = [...editingLineStruct.centers]
    const targetIndex = direction === 'UP' ? centerIndex - 1 : centerIndex + 1
    if (targetIndex < 0 || targetIndex >= newCenters.length) return

    const temp = newCenters[centerIndex]
    newCenters[centerIndex] = newCenters[targetIndex]
    newCenters[targetIndex] = temp

    // Padronizar saltos 10, 20, 30...
    const updated = newCenters.map((c, idx) => ({
      ...c,
      sequenceOrder: (idx + 1) * 10,
    }))

    setEditingLineStruct({
      ...editingLineStruct,
      centers: updated,
    })
  }

  const handleEditRemoveCenterClick = async (centerIndex: number) => {
    if (!editingLineStruct) return
    const target = editingLineStruct.centers[centerIndex]
    if (!target) return

    // Validação prévia de dependências ativas
    try {
      const depCheck = await lineMasterService.checkCenterActiveDependencies(
        target.centerId,
        target.centerCode,
      )
      if (depCheck.hasActiveDependencies) {
        setBlockingDependencies({
          centerCode: target.centerCode,
          centerName: target.centerName,
          reasons: depCheck.blockingReasons,
        })
        return
      }
    } catch (err) {
      console.warn('Erro ao verificar dependências ativas do centro:', err)
    }

    setRemoveConfirmItem({
      lineId: editingLineStruct.id,
      centerIndex,
      centerName: target.centerName,
      centerCode: target.centerCode,
    })
  }

  const handleConfirmRemoveCenter = () => {
    if (!removeConfirmItem || !editingLineStruct) return
    const newCenters = editingLineStruct.centers.filter(
      (_, idx) => idx !== removeConfirmItem.centerIndex,
    )
    const renumbered = newCenters.map((c, idx) => ({
      ...c,
      sequenceOrder: (idx + 1) * 10,
    }))

    setEditingLineStruct({
      ...editingLineStruct,
      centers: renumbered,
    })
    setRemoveConfirmItem(null)
  }

  const handleSaveEditLine = async () => {
    if (!editingLineStruct) return
    setEditFieldError(null)

    // Código readOnly no modal de edição preserva o código existente
    const trimmedCode = (editForm.code || editingLineStruct.code).trim().toUpperCase()
    const trimmedName = editForm.name.trim()

    if (!trimmedName) {
      setEditFieldError('O nome oficial da linha é obrigatório.')
      return
    }

    // Avisar sobre mudança de empresa se houver centros vinculados
    const isCompanyChanged = editForm.companyId !== editingLineStruct.companyId
    if (isCompanyChanged && editingLineStruct.centers.length > 0) {
      const confirmChange = window.confirm(
        `Atenção: Você está alterando a Empresa da linha ${editingLineStruct.code}. Esta linha possui ${editingLineStruct.centers.length} centros vinculados. Deseja realmente prosseguir?`,
      )
      if (!confirmChange) return
    }

    setEditingLineLoading(true)
    try {
      // 1. Atualizar dados básicos da Linha Produtiva
      const plantForCompany = plants.find((p) => p.company_id === editForm.companyId)
      const lineUpdatePayload: Partial<ProductionLine> = {
        code: trimmedCode,
        name: trimmedName,
        description: editForm.description.trim(),
        is_active: editForm.status === 'ACTIVE',
        plant_id: plantForCompany ? plantForCompany.id : undefined,
      }

      await pb.collection('production_lines').update(editingLineStruct.id, lineUpdatePayload)

      // Leitura de confirmação da Linha
      const confirmedLine = await pb
        .collection('production_lines')
        .getOne<ProductionLine>(editingLineStruct.id)
      if (!confirmedLine) {
        throw new Error('Falha ao confirmar atualização da linha produtiva.')
      }

      // 2. Coordenar persistência dos Centros e Sequenciamento
      // Obter dependências existentes para esta linha
      const currentDeps = await pb
        .collection('line_sequencing_dependencies')
        .getFullList<LineSequencingDependency>({
          filter: `line_id = '${editingLineStruct.id}'`,
        })

      const targetCenters = editingLineStruct.centers
      const targetCenterIds = new Set(targetCenters.map((c) => c.centerId))

      // Deletar vínculos removidos
      for (const dep of currentDeps) {
        const targetId = dep.next_line_id || dep.line_id
        if (!targetCenterIds.has(targetId)) {
          await pb.collection('line_sequencing_dependencies').delete(dep.id)
        }
      }

      // Atualizar ou criar dependências para cada centro com sequence_order 10, 20, 30...
      for (let i = 0; i < targetCenters.length; i++) {
        const c = targetCenters[i]
        const orderVal = (i + 1) * 10
        const existingDep = currentDeps.find(
          (d) => d.next_line_id === c.centerId || d.line_id === c.centerId,
        )

        if (existingDep) {
          if (existingDep.sequence_order !== orderVal) {
            await pb.collection('line_sequencing_dependencies').update(existingDep.id, {
              sequence_order: orderVal,
            })
          }
        } else {
          await pb.collection('line_sequencing_dependencies').create({
            line_id: editingLineStruct.id,
            next_line_id: c.centerId,
            sequence_order: orderVal,
            dependency_type: 'TRANSFER_BATCH',
            relation_nature: 'MANDATORY',
            active: true,
            notes: `Hierarquia Empresa -> ${trimmedCode} -> ${c.centerCode}`,
          })
        }
      }

      // Leitura de confirmação pós-atualização
      const verifiedDeps = await pb
        .collection('line_sequencing_dependencies')
        .getFullList<LineSequencingDependency>({
          filter: `line_id = '${editingLineStruct.id}'`,
        })

      // Auditoria pcp_audit_logs isolada em try/catch
      try {
        const currentUser = pb.authStore.record || pb.authStore.model
        await pb.collection('pcp_audit_logs').create({
          user_id: currentUser?.id || null,
          user_email: (currentUser as any)?.email || '',
          user_name: (currentUser as any)?.name || 'Administrador PCP',
          user_role: (currentUser as any)?.role || 'PCP_ADMIN',
          event_type: 'SCHEDULE_ACTION',
          action: 'UPDATE_PRODUCTION_LINE_HIERARCHY',
          resource: 'production_lines',
          resource_id: editingLineStruct.id,
          permission_required: 'pcp.lines.manage',
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            lineId: editingLineStruct.id,
            previousCode: editingLineStruct.code,
            newCode: trimmedCode,
            previousName: editingLineStruct.name,
            newName: trimmedName,
            isCompanyChanged,
            centersCount: targetCenters.length,
            depsCount: verifiedDeps.length,
          },
        })
      } catch (auditErr) {
        console.warn('Falha ao registrar auditoria em pcp_audit_logs:', auditErr)
      }

      toast({
        title: 'Sucesso',
        description: 'Linha produtiva e hierarquia atualizadas com sucesso.',
      })

      setIsEditModalOpen(false)
      setEditingLineStruct(null)
      await loadData()
    } catch (err: any) {
      console.error('Erro ao salvar edição da linha:', err)
      setEditFieldError(
        err.message ||
          'Não foi possível salvar as alterações. Verifique os dados e tente novamente.',
      )
    } finally {
      setEditingLineLoading(false)
    }
  }

  // ==========================================
  // SALVAR SEQUÊNCIA NO CARD PRINCIPAL
  // ==========================================
  const handleSaveSequence = async (lineId: string) => {
    const lineStruct = hierarchyLines.find((l) => l.id === lineId)
    if (!lineStruct) return

    setSavingSequence(true)
    try {
      for (let i = 0; i < lineStruct.centers.length; i++) {
        const item = lineStruct.centers[i]
        const seqVal = (i + 1) * 10
        if (item.dependencyId) {
          await lineMasterService.updateSequencingDependencyOrder(item.dependencyId, seqVal)
        } else {
          const newDep = await lineMasterService.addCenterToLineSequence({
            lineId: lineStruct.id,
            centerId: item.centerId,
            sequenceOrder: seqVal,
            notes: `Ordenação da Hierarquia Empresa -> ${lineStruct.code} -> ${item.centerCode}`,
          })
          item.dependencyId = newDep.id
        }
      }

      // Leitura de confirmação
      const confirmedDeps = await pb
        .collection('line_sequencing_dependencies')
        .getFullList<LineSequencingDependency>({
          filter: `line_id = '${lineId}'`,
          sort: 'sequence_order',
        })

      if (confirmedDeps.length === 0 && lineStruct.centers.length > 0) {
        throw new Error('Falha na confirmação de persistência da sequência.')
      }

      toast({
        title: 'Sucesso',
        description: 'Sequência da linha salva com sucesso.',
      })

      await loadData()
    } catch (err: any) {
      console.error('Erro ao salvar sequência:', err)
      toast({
        title: 'Não foi possível salvar a sequência',
        description: err.message || 'Verifique as dependências e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingSequence(false)
    }
  }

  // Reordenação inline no card
  const moveCenter = (lineId: string, centerIndex: number, direction: 'UP' | 'DOWN') => {
    setHierarchyLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l
        const newCenters = [...l.centers]
        const targetIndex = direction === 'UP' ? centerIndex - 1 : centerIndex + 1
        if (targetIndex < 0 || targetIndex >= newCenters.length) return l

        const temp = newCenters[centerIndex]
        newCenters[centerIndex] = newCenters[targetIndex]
        newCenters[targetIndex] = temp

        const updatedCenters = newCenters.map((c, idx) => ({
          ...c,
          sequenceOrder: (idx + 1) * 10,
        }))

        return {
          ...l,
          centers: updatedCenters,
        }
      }),
    )
  }

  // Iniciar solicitação de remoção de centro do card principal: checar dependências ativas primeiro
  const handleRequestRemoveCenterCard = async (lineId: string, centerIndex: number) => {
    const lineStruct = hierarchyLines.find((l) => l.id === lineId)
    if (!lineStruct) return
    const targetCenter = lineStruct.centers[centerIndex]
    if (!targetCenter) return

    // Validação prévia de dependências ativas
    try {
      const depCheck = await lineMasterService.checkCenterActiveDependencies(
        targetCenter.centerId,
        targetCenter.centerCode,
      )
      if (depCheck.hasActiveDependencies) {
        setBlockingDependencies({
          centerCode: targetCenter.centerCode,
          centerName: targetCenter.centerName,
          reasons: depCheck.blockingReasons,
        })
        return
      }
    } catch (err) {
      console.warn('Erro ao verificar dependências ativas do centro:', err)
    }

    // Se não há dependências bloqueantes, abre o Dialog shadcn de confirmação
    setCenterToRemove({
      lineId,
      centerIndex,
      centerId: targetCenter.centerId,
      centerCode: targetCenter.centerCode,
      centerName: targetCenter.centerName,
      dependencyId: targetCenter.dependencyId,
    })
  }

  // Executar remoção de centro após confirmação no Dialog shadcn
  const handleExecuteRemoveCenter = async () => {
    if (!centerToRemove) return
    const { lineId, centerIndex, centerId, centerCode, dependencyId } = centerToRemove

    setIsRemovingCenter(true)
    try {
      // Resolver dependencyId: se targetCenter.dependencyId veio nulo, buscar registro real em line_sequencing_dependencies
      let effDepId = dependencyId
      if (!effDepId) {
        const matchingDeps = await pb
          .collection('line_sequencing_dependencies')
          .getFullList<LineSequencingDependency>({
            filter: `line_id = '${lineId}' && (next_line_id = '${centerId}' || line_id = '${centerId}')`,
          })
          .catch(() => [])

        if (matchingDeps.length > 0) {
          effDepId = matchingDeps[0].id
        }
      }

      // Persistência real: remove estritamente o vínculo intermediário
      if (effDepId) {
        await lineMasterService.removeCenterFromLineSequence(effDepId)
      }

      // Recalcular sequência dos centros restantes com saltos de 10: (idx + 1) * 10
      // e atualizar o estado local imediatamente
      const currentLine = hierarchyLines.find((l) => l.id === lineId)
      const remainingCenters = (currentLine?.centers || [])
        .filter((_, idx) => idx !== centerIndex)
        .map((c, idx) => ({
          ...c,
          sequenceOrder: (idx + 1) * 10,
        }))

      setHierarchyLines((prev) =>
        prev.map((l) => {
          if (l.id !== lineId) return l
          return { ...l, centers: remainingCenters }
        }),
      )

      // Atualizar no banco a numeração de sequência dos centros remanescentes se tinham dependências
      for (let i = 0; i < remainingCenters.length; i++) {
        const item = remainingCenters[i]
        const newOrder = (i + 1) * 10
        if (item.dependencyId) {
          try {
            await lineMasterService.updateSequencingDependencyOrder(item.dependencyId, newOrder)
          } catch {
            // Não bloqueia
          }
        }
      }

      // Sincronizar com o banco (loadData)
      await loadData()

      // Toast com descrição exata: "Centro removido da hierarquia com sucesso."
      toast({
        title: 'Sucesso',
        description: 'Centro removido da hierarquia com sucesso.',
      })

      setCenterToRemove(null)
    } catch (err: any) {
      toast({
        title: 'Erro ao remover vínculo',
        description: err.message || 'Falha ao desvincular centro da hierarquia.',
        variant: 'destructive',
      })
    } finally {
      setIsRemovingCenter(false)
    }
  }

  // Adicionar Centro Existente à Linha
  const handleAddCenterToLine = async () => {
    if (!targetLineIdForAdd || !selectedCenterIdToAdd) return
    const lineStruct = hierarchyLines.find((l) => l.id === targetLineIdForAdd)
    if (!lineStruct) return

    if (lineStruct.centers.some((c) => c.centerId === selectedCenterIdToAdd)) {
      toast({
        title: 'Centro Já Vinculado',
        description: 'Este centro já faz parte da sequência produtiva desta linha.',
        variant: 'destructive',
      })
      return
    }

    const centerToAdd = lines.find((l) => l.id === selectedCenterIdToAdd)
    if (!centerToAdd) return

    // Se o centro estiver inativo, pedir confirmação explícita
    if (centerToAdd.is_active === false && !confirmInactiveCenterWarning) {
      const proceed = window.confirm(
        `Atenção: O centro "${centerToAdd.name} (${centerToAdd.code})" está marcado como INATIVO. Deseja realmente vinculá-lo a esta linha produtiva?`,
      )
      if (!proceed) return
    }

    setAddingCenter(true)
    try {
      const nextSeq = (lineStruct.centers.length + 1) * 10
      const createdDep = await lineMasterService.addCenterToLineSequence({
        lineId: targetLineIdForAdd,
        centerId: selectedCenterIdToAdd,
        sequenceOrder: nextSeq,
        notes: `Adicionado à hierarquia da linha ${lineStruct.code}`,
      })

      // Leitura de confirmação da dependência
      const confirmedDep = await pb
        .collection('line_sequencing_dependencies')
        .getOne<LineSequencingDependency>(createdDep.id)
      if (!confirmedDep) {
        throw new Error('Falha ao confirmar criação de dependência no servidor.')
      }

      toast({
        title: 'Sucesso',
        description: `${centerToAdd.code} vinculado à linha ${lineStruct.code} na sequência ${nextSeq}.`,
      })

      setIsAddModalOpen(false)
      setSelectedCenterIdToAdd('')
      setConfirmInactiveCenterWarning(false)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha ao adicionar centro',
        description: err.message || 'Erro ao persistir vínculo de hierarquia.',
        variant: 'destructive',
      })
    } finally {
      setAddingCenter(false)
    }
  }

  // Centros disponíveis para adição (existentes na coleção production_lines)
  const availableCentersToAdd = useMemo(() => {
    if (!targetLineIdForAdd) return []
    const lineStruct = (hierarchyLines || []).find((l) => l.id === targetLineIdForAdd)
    if (!lineStruct) return []
    const safeCenters = Array.isArray(lineStruct.centers) ? lineStruct.centers : []
    const boundCenterIds = new Set(safeCenters.map((c) => c?.centerId).filter(Boolean))
    return (Array.isArray(lines) ? lines : []).filter((l) => l && !boundCenterIds.has(l.id))
  }, [targetLineIdForAdd, hierarchyLines, lines])

  return (
    <div className="w-full max-w-full space-y-6">
      {/* Cabeçalho da Hierarquia — Fluxo normal sem sticky/fixed para rolagem fluida e responsiva */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1.5 bg-[#004C97] rounded-md text-white">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Hierarquia das Linhas e Centros de Produção
            </h1>
            <Badge
              variant="outline"
              className="text-xs border-blue-200 text-[#004C97] bg-blue-50 font-bold"
            >
              Governança Corporativa
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Estrutura Empresa &rarr; Linha Produtiva &rarr; Centros de Produção, com ordenação do
            fluxo industrial e parâmetros integrados da Ficha Mestra.
          </p>
        </div>

        {/* Barra de Ações: [ Empresa: Todas ] [ + Cadastrar Linha ] [ Atualizar ] */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Empresa existente */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
            <Building2 className="w-4 h-4 text-[#004C97] shrink-0" />
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Empresa:</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              <option value="ALL">Todas as Empresas ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.code}
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Cadastrar Linha
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="text-xs h-8 gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Conteúdo da Hierarquia */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
          <span className="text-xs font-semibold">
            Sincronizando hierarquia industrial com o banco de dados...
          </span>
        </div>
      ) : filteredHierarchy.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
          <GitBranch className="w-10 h-10 text-slate-400 mx-auto" />
          <div>
            <p className="text-sm font-bold text-slate-800">
              Nenhuma Linha Produtiva cadastrada para esta Empresa.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre uma nova linha produtiva para vincular centros e estruturar o fluxo
              operacional.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />+ Cadastrar Linha
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredHierarchy.map((lineStruct) => (
            <div
              key={lineStruct.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
            >
              {/* Header do Card da Linha Produtiva */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#004C97] text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg shrink-0">
                    <GitBranch className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Nome Oficial da Linha em Destaque Principal */}
                      <h2 className="text-base font-black text-white">{lineStruct.name}</h2>
                      {/* Identificador Técnico como tag discreta secundária */}
                      <span
                        className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-900/60 rounded border border-slate-700 text-slate-300"
                        title="Identificador técnico da linha na malha industrial"
                      >
                        {lineStruct.companyCode} &bull; {lineStruct.code}
                      </span>
                      {lineStruct.isActive ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                          Inativa
                        </Badge>
                      )}
                    </div>
                    {lineStruct.description && (
                      <p className="text-xs text-slate-300 mt-0.5 truncate max-w-xl">
                        {lineStruct.description}
                      </p>
                    )}
                  </div>
                </div>
                {/* Ações do Card de Linha: [ Editar Linha ] [ + Adicionar Centro à Linha ] [ Salvar Sequência ] */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenEditModal(lineStruct)}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold h-8 border border-white/20 gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar Linha
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetLineIdForAdd(lineStruct.id)
                      setSelectedCenterIdToAdd('')
                      setConfirmInactiveCenterWarning(false)
                      setIsAddModalOpen(true)
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold h-8 border border-white/20 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Centro à Linha
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleSaveSequence(lineStruct.id)}
                    disabled={savingSequence || lineStruct.centers.length === 0}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs h-8 gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Sequência
                  </Button>
                </div>
              </div>

              {/* Lista de Centros de Produção vinculados */}
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 text-xs gap-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#004C97]" /> Sequência Operacional de
                    Centros ({(lineStruct.centers || []).length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Saltos de sequência: 10 &bull; 20 &bull; 30... (utilize os controles para
                    reordenar)
                  </span>
                </div>

                {!lineStruct.centers || lineStruct.centers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <p className="text-xs text-slate-600 font-medium">
                      Nenhum centro vinculado a esta linha produtiva.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Clique em "Adicionar Centro à Linha" para vincular um centro existente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(lineStruct.centers || []).map((center, idx) => {
                      const opDisplay = getOperationalStatusDisplay(center.operationalStatus)
                      return (
                        <div
                          key={center.centerId}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-lg border transition-all ${
                            !center.isActive
                              ? 'bg-amber-50/50 border-amber-200'
                              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                          }`}
                        >
                          {/* Posição e Identificação */}
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center justify-center w-8 h-8 rounded-md bg-[#004C97]/10 text-[#004C97] font-mono font-black text-xs shrink-0">
                              {String(center.sequenceOrder).padStart(2, '0')}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-black text-slate-900">
                                  {center.centerCode}
                                </span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {center.centerName}
                                </span>

                                {/* Badges de Status Cadastral e Operacional traduzido */}
                                {center.isActive ? (
                                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0">
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0">
                                    Inativo
                                  </Badge>
                                )}

                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${opDisplay.variant}`}
                                >
                                  {opDisplay.label}
                                </span>
                              </div>

                              {/* Informações de Processo vindo da Ficha Mestra real */}
                              <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                                <span>
                                  Processo:{' '}
                                  <strong className="text-slate-800 font-semibold">
                                    {center.process}
                                  </strong>
                                </span>
                                {center.sapWorkCenter && (
                                  <span className="font-mono text-slate-400">
                                    SAP: {center.sapWorkCenter}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Parâmetros Técnicos Leitura-Only vindos da Ficha Mestra com Unidade Real */}
                          <div className="flex items-center gap-3 mt-3 md:mt-0">
                            <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200 font-mono text-slate-700">
                              <span className="flex items-center gap-1" title="Capacidade Nominal">
                                <Gauge className="w-3.5 h-3.5 text-blue-600" />
                                <strong>{center.nominalCapacity}</strong> {center.capacityUnit}
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-1" title="Eficiência OEE">
                                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                                <strong>{center.efficiency}%</strong> OEE
                              </span>
                              <span className="text-slate-300">|</span>
                              <span className="flex items-center gap-1" title="Turnos Operacionais">
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <strong>{center.shiftsCount}</strong> Turnos
                              </span>
                            </div>

                            {/* Controles de Reordenação e Remoção */}
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={idx === 0}
                                onClick={() => moveCenter(lineStruct.id, idx, 'UP')}
                                className="h-7 w-7 text-slate-600 hover:text-slate-900"
                                title="Mover para cima"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={idx === lineStruct.centers.length - 1}
                                onClick={() => moveCenter(lineStruct.id, idx, 'DOWN')}
                                className="h-7 w-7 text-slate-600 hover:text-slate-900"
                                title="Mover para baixo"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>

                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRequestRemoveCenterCard(lineStruct.id, idx)}
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                title="Remover da Hierarquia"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CADASTRAR LINHA PRODUTIVA (FASE 2)             */}
      {/* ======================================================== */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#004C97]" /> Cadastrar Linha Produtiva
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre uma nova Linha Produtiva na empresa selecionada. Os parâmetros técnicos e
              centros de produção serão configurados na hierarquia e na Ficha Mestra.
            </DialogDescription>
          </DialogHeader>

          {createFieldError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{createFieldError}</span>
            </div>
          )}

          <form onSubmit={handleCreateLine} className="space-y-4 py-2">
            {/* Empresa * */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Empresa <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={createForm.companyId}
                onValueChange={(val) => setCreateForm((prev) => ({ ...prev, companyId: val }))}
              >
                <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-300">
                  <SelectValue placeholder="Selecione a empresa..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name || c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome Oficial da Linha * */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Nome Oficial da Linha <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex.: Linha de Laminação Contínua 3"
                className="text-xs h-9"
                required
              />
              <span className="text-[11px] text-slate-400">
                O identificador técnico será gerado automaticamente (ex.: LIN-1000-LAM-A7K2).
              </span>
            </div>
            {/* Descrição (opcional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Descrição <span className="text-slate-400">(opcional)</span>
              </Label>
              <Textarea
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Finalidade operacional ou escopo da linha..."
                className="text-xs min-h-[60px]"
              />
            </div>

            {/* Status * (Ativa / Inativa, default Ativa) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Status <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={createForm.status}
                onValueChange={(val) => setCreateForm((prev) => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ACTIVE" className="text-xs">
                    Ativa
                  </SelectItem>
                  <SelectItem value="INACTIVE" className="text-xs">
                    Inativa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creatingLine}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creatingLine}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8 gap-1.5"
              >
                {creatingLine ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confirmar Cadastro
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: EDITAR LINHA PRODUTIVA (FASE 3 - 3 BLOCOS)     */}
      {/* ======================================================== */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Edit className="w-4 h-4 text-[#004C97]" /> Editar Linha Produtiva
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gerencie a identificação da linha e a ordenação dos centros de produção associados.
            </DialogDescription>
          </DialogHeader>

          {editFieldError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{editFieldError}</span>
            </div>
          )}

          {editingLineStruct && (
            <div className="space-y-6 py-2">
              {/* BLOCO 1 — Identificação */}
              <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-200 space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-200">
                  <Info className="w-3.5 h-3.5 text-[#004C97]" /> Bloco 1 — Identificação da Linha
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Empresa */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
                    <Select
                      value={editForm.companyId}
                      onValueChange={(val) => setEditForm((prev) => ({ ...prev, companyId: val }))}
                    >
                      <SelectTrigger className="text-xs h-9 bg-white border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {companies.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name || c.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Ativa/Inativa */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Status *</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(val) => setEditForm((prev) => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger className="text-xs h-9 bg-white border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="ACTIVE" className="text-xs">
                          Ativa
                        </SelectItem>
                        <SelectItem value="INACTIVE" className="text-xs">
                          Inativa
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Código Interno (readOnly informativo) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Identificador Técnico (Código)
                    </Label>
                    <Input
                      value={editForm.code}
                      readOnly
                      className="text-xs h-9 uppercase font-mono bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200"
                      title="Identificador gerado automaticamente no padrão LIN-{planta}-{slug}-{sufixo}"
                    />
                  </div>
                  {/* Nome Oficial */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Nome Oficial *</Label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="text-xs h-9 bg-white"
                      required
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">Descrição</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="text-xs min-h-[50px] bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* BLOCO 2 — Centros da Linha */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Sliders className="w-3.5 h-3.5 text-[#004C97]" /> Bloco 2 — Centros da Linha (
                    {(editingLineStruct.centers || []).length})
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ordem com saltos 10 / 20 / 30
                  </span>
                </div>

                {!editingLineStruct.centers || editingLineStruct.centers.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500">Nenhum centro vinculado a esta linha.</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-16 text-center">Ordem</th>
                          <th className="p-2.5">Código</th>
                          <th className="p-2.5">Centro</th>
                          <th className="p-2.5">Processo (Ficha Mestra)</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5 w-24 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(editingLineStruct.centers || []).map((c, idx) => (
                          <tr key={c.centerId} className="hover:bg-slate-50/70">
                            <td className="p-2.5 text-center font-mono font-bold text-[#004C97]">
                              {String(c.sequenceOrder).padStart(2, '0')}
                            </td>
                            <td className="p-2.5 font-mono font-semibold text-slate-900">
                              {c.centerCode}
                            </td>
                            <td className="p-2.5 text-slate-700 font-medium">{c.centerName}</td>
                            <td className="p-2.5 text-slate-600">
                              {c.process || (
                                <span className="text-slate-400 italic">Não informado</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {c.isActive ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0">
                                  Inativo
                                </Badge>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === 0}
                                  onClick={() => handleEditMoveCenter(idx, 'UP')}
                                  className="h-6 w-6 text-slate-600 hover:text-slate-900"
                                  title="Subir"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  disabled={idx === editingLineStruct.centers.length - 1}
                                  onClick={() => handleEditMoveCenter(idx, 'DOWN')}
                                  className="h-6 w-6 text-slate-600 hover:text-slate-900"
                                  title="Descer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleEditRemoveCenterClick(idx)}
                                  className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                                  title="Remover da Linha"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* BLOCO 3 — Ações */}
              <DialogFooter className="gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editingLineLoading}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveEditLine}
                  disabled={editingLineLoading}
                  className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8 gap-1.5"
                >
                  {editingLineLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Salvando Alterações...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de remoção de centro na edição */}
      <Dialog
        open={Boolean(removeConfirmItem)}
        onOpenChange={(open) => !open && setRemoveConfirmItem(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-4 h-4" /> Remover centro da hierarquia?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              O centro{' '}
              <strong className="text-slate-800">
                {removeConfirmItem?.centerCode} — {removeConfirmItem?.centerName}
              </strong>{' '}
              será removido apenas desta Linha Produtiva. O cadastro mestre do Centro não será
              excluído.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveConfirmItem(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemoveCenter}
              className="text-xs h-8 font-bold"
            >
              Remover da Hierarquia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo shadcn de remoção de centro do card principal (A1) */}
      <Dialog
        open={Boolean(centerToRemove)}
        onOpenChange={(open) => !open && !isRemovingCenter && setCenterToRemove(null)}
      >
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Remover centro da hierarquia?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              O centro{' '}
              <strong className="text-slate-800">
                {centerToRemove?.centerCode} — {centerToRemove?.centerName}
              </strong>{' '}
              será removido apenas desta Linha Produtiva. O cadastro mestre do Centro não será
              excluído.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRemovingCenter}
              onClick={() => setCenterToRemove(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isRemovingCenter}
              onClick={handleExecuteRemoveCenter}
              className="text-xs h-8 font-bold gap-1.5"
            >
              {isRemovingCenter ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover da Hierarquia'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de bloqueio quando centro possui dependências ativas (A4) */}
      <Dialog
        open={Boolean(blockingDependencies)}
        onOpenChange={(open) => !open && setBlockingDependencies(null)}
      >
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Centro possui dependências ativas.
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-1 leading-relaxed">
              Não é possível remover o vínculo do centro{' '}
              <strong className="text-slate-800">
                {blockingDependencies?.centerCode} — {blockingDependencies?.centerName}
              </strong>{' '}
              porque ele está associado a estruturas industriais ativas que impedem a desvinculação.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
            {Array.isArray(blockingDependencies?.reasons) &&
              blockingDependencies.reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1"
                >
                  <div className="font-bold text-rose-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    {reason?.title || 'Dependência'}
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    {reason?.details || ''}
                  </p>
                </div>
              ))}
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBlockingDependencies(null)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR CENTRO EXISTENTE À LINHA                */}
      {/* ======================================================== */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#004C97]" /> Adicionar Centro à Linha
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione um centro de produção já existente na coleção de linhas para associá-lo a
              esta linha produtiva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Selecione o Centro de Produção *
              </Label>
              <Select value={selectedCenterIdToAdd} onValueChange={setSelectedCenterIdToAdd}>
                <SelectTrigger className="text-xs h-9 bg-slate-50 border-slate-300">
                  <SelectValue placeholder="Selecione um centro existente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-white">
                  {availableCentersToAdd.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <span className="font-mono font-bold mr-2 text-[#004C97]">[{c.code}]</span>{' '}
                      {c.name} {c.process ? `(${c.process})` : ''}{' '}
                      {c.is_active === false ? '— [INATIVO]' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-blue-700" /> Governança de Centros e Ficha
                Mestra
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                O centro herdará automaticamente os turnos, capacidades, produtividade e parâmetros
                da Ficha Mestra sem duplicar registros no banco de dados.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedCenterIdToAdd || addingCenter}
              onClick={handleAddCenterToLine}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
            >
              {addingCenter ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Vinculando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Vínculo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
