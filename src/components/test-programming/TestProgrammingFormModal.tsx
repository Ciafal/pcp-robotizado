import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, HelpCircle, Clock, Sparkles, Layers, Wrench, Package } from 'lucide-react'
import {
  TestCategory,
  ScheduleImpactType,
  EfficacyEvalTiming,
  RevisionType,
  RecipeChangeType,
  TestProgrammingRecord,
  DynamicCategoryData,
  ScheduleImpactData,
  EfficacyCriteria,
  RevisionDetails,
  IndustrialTestObjective,
} from '@/types/test-programming'
import {
  testProgrammingService,
  calculateEndTime,
  calculateReductionPercent,
} from '@/services/test-programming-service'
import { calculatePeriodDuration, MSG_REGRA_1_DATA_HORA } from '@/lib/test-programming-calculations'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface TestProgrammingFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialItem?: TestProgrammingRecord | null
}

export const TestProgrammingFormModal: React.FC<TestProgrammingFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  // Dados mestres existentes no backend
  const [companies, setCompanies] = useState<Array<{ code: string; name: string }>>([])
  const [lines, setLines] = useState<Array<{ code: string; name: string; work_center?: string }>>(
    [],
  )
  const [shifts, setShifts] = useState<
    Array<{ code: string; name: string; start_time: string; end_time: string; scale?: string }>
  >([])
  const [sapWorkCenters, setSapWorkCenters] = useState<Array<{ code: string; name: string }>>([])
  const [recipesAOM, setRecipesAOM] = useState<
    Array<{
      id: string
      version: string
      material: string
      gauge: string
      family: string
      date: string
    }>
  >([])
  const [sapMaterials, setSapMaterials] = useState<
    Array<{ code: string; desc: string; family: string; gauge: string }>
  >([])
  const [sapEquipments, setSapEquipments] = useState<
    Array<{ code: string; desc: string; location: string }>
  >([])

  // Estado geral do formulário
  const [company, setCompany] = useState('CIAFAL')
  const [productionLine, setProductionLine] = useState('L1')
  const [workCenter, setWorkCenter] = useState('')
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedDate, setExpectedDate] = useState(new Date().toISOString().split('T')[0])

  // Agrupamento "Período Previsto do Teste" (Requisito 1 & 2)
  const [expectedStartDate, setExpectedStartDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedStartTime, setExpectedStartTime] = useState('08:00')
  const [expectedEndDate, setExpectedEndDate] = useState(new Date().toISOString().split('T')[0])
  const [expectedEndTime, setExpectedEndTime] = useState('10:30')
  const [periodValidationMessage, setPeriodValidationMessage] = useState<string | null>(null)

  const [requestingSector, setRequestingSector] = useState('Engenharia de Processos')
  const [requesterName, setRequesterName] = useState(user?.name || user?.email || 'Lucas Ferreira')
  const [technicalLead, setTechnicalLead] = useState('')
  const [testType, setTestType] = useState('Homologação Operacional')
  const [title, setTitle] = useState('')
  const [objective, setObjective] = useState('')
  const [availableObjectives, setAvailableObjectives] = useState<IndustrialTestObjective[]>([])
  const [selectedObjectiveCodes, setSelectedObjectiveCodes] = useState<string[]>([])
  const [objectiveSearchTerm, setObjectiveSearchTerm] = useState('')
  const [otherObjectiveDesc, setOtherObjectiveDesc] = useState('')
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [justification, setJustification] = useState('')

  // Categoria do Teste
  const [testCategory, setTestCategory] = useState<TestCategory>('EQUIPAMENTO')

  // Dados Dinâmicos - EQUIPAMENTO
  const [eqCode, setEqCode] = useState('')
  const [eqDesc, setEqDesc] = useState('')
  const [eqLocation, setEqLocation] = useState('')
  const [isNewEquipment, setIsNewEquipment] = useState(false)
  const [hasMechanicalChange, setHasMechanicalChange] = useState(false)
  const [hasElectricalChange, setHasElectricalChange] = useState(false)
  const [hasAutomationChange, setHasAutomationChange] = useState(false)
  const [hasInstrumentationChange, setHasInstrumentationChange] = useState(false)
  const [hasSoftwareChange, setHasSoftwareChange] = useState(false)
  const [requiresMaintenance, setRequiresMaintenance] = useState(false)
  const [requiresAutomationOrIT, setRequiresAutomationOrIT] = useState(false)

  // Dados Dinâmicos - MATÉRIA-PRIMA
  const [rawCode, setRawCode] = useState('')
  const [rawDesc, setRawDesc] = useState('')
  const [rawQty, setRawQty] = useState<number>(20)
  const [rawUnit, setRawUnit] = useState('t')
  const [rawBatch, setRawBatch] = useState('')
  const [rawSupplier, setRawSupplier] = useState('Gerdau Aços Especiais')
  // Material produzido
  const [prodCode, setProdCode] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodQty, setProdQty] = useState<number>(18)
  const [prodUnit, setProdUnit] = useState('t')
  const [prodGauge, setProdGauge] = useState('50x50x2.0mm')
  const [prodFamily, setProdFamily] = useState('TUB_QUAD')

  // Dados Dinâmicos - RECEITA LAMINAÇÃO (AOM)
  const [recipeChangeType, setRecipeChangeType] = useState<RecipeChangeType>('Validação de Receita')
  const [recipeId, setRecipeId] = useState('')
  const [recipeVersion, setRecipeVersion] = useState('')
  const [recipeVersionDate, setRecipeVersionDate] = useState('')
  const [recipeMaterial, setRecipeMaterial] = useState('')
  const [recipeGauge, setRecipeGauge] = useState('')
  const [recipeFamily, setRecipeFamily] = useState('')
  const [recipeNotes, setRecipeNotes] = useState('')

  // Impacto do Teste
  const [impactType, setImpactType] = useState<ScheduleImpactType>('PARADA_TOTAL')
  // Parada Total
  const [stopDate, setStopDate] = useState(new Date().toISOString().split('T')[0])
  const [stopShift, setStopShift] = useState('')
  const [stopStartTime, setStopStartTime] = useState('22:00')
  const [stopDurationMinutes, setStopDurationMinutes] = useState<number>(25)
  const [stopCrew, setStopCrew] = useState('')
  const [stopScale, setStopScale] = useState('')
  const [stopIsSpecific, setStopIsSpecific] = useState(false)
  // Redução de Ritmo
  const [nominalRate, setNominalRate] = useState<number>(20)
  const [expectedRate, setExpectedRate] = useState<number>(12)
  const [reductionStart, setReductionStart] = useState('')
  const [reductionEnd, setReductionEnd] = useState('')

  // Critério de Eficácia
  const [critIndicator, setCritIndicator] = useState('Throughput / Produtividade')
  const [critExpectedCond, setCritExpectedCond] = useState(
    'Sem superaquecimento ou perda dimensional',
  )
  const [critCurrentVal, setCritCurrentVal] = useState('12.5')
  const [critTargetVal, setCritTargetVal] = useState('14.0')
  const [critUnit, setCritUnit] = useState('t/h')
  const [critPeriod, setCritPeriod] = useState('3 turnos consecutivos')
  const [evalTiming, setEvalTiming] = useState<EfficacyEvalTiming>('Imediatamente')
  const [evalSpecificDate, setEvalSpecificDate] = useState('')

  // Revisão de Documento ou Meta
  const [docRevisionType, setDocRevisionType] = useState<RevisionType>('Não')
  const [revItem, setRevItem] = useState('')
  const [revReason, setRevReason] = useState('')
  const [revResp, setRevResp] = useState('')
  const [revDeadline, setRevDeadline] = useState('')
  const [revDesc, setRevDesc] = useState('')

  const [activeTab, setActiveTab] = useState('geral')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 1. Carrega fontes de dados reais
  useEffect(() => {
    if (!isOpen) return

    async function loadMasterData() {
      try {
        // Empresas
        const compRecs = await pb.collection('companies').getFullList({ sort: 'name' })
        setCompanies(compRecs.map((c: any) => ({ code: c.code, name: c.name || c.corporate_name })))

        // Objetivos Industriais Padronizados
        const objs = await testProgrammingService.listActiveIndustrialObjectives()
        setAvailableObjectives(objs)

        // Linhas de produção
        const lineRecs = await pb
          .collection('production_lines')
          .getFullList({ filter: 'is_active = true', sort: 'name' })
        setLines(
          lineRecs.map((l: any) => ({
            code: l.code,
            name: l.name,
            work_center: l.sap_work_center,
          })),
        )

        // Turnos da linha L1 por padrão
        const shiftRecs = await pb
          .collection('production_shifts')
          .getFullList({ sort: 'sequence_order' })
        setShifts(
          shiftRecs.map((s: any) => ({
            code: s.code,
            name: s.name,
            start_time: s.start_time || '06:00',
            end_time: s.end_time || '14:20',
            scale: s.scale || '',
          })),
        )

        // Catálogo de centros de trabalho
        const wcRecs = await pb.collection('work_centers').getFullList({ sort: 'code' })
        if (wcRecs.length > 0) {
          setSapWorkCenters(wcRecs.map((w: any) => ({ code: w.code, name: w.name })))
        }

        // Matriz de gargalos / materiais cadastrados para autopreenchimento de sapMaterials
        const bottleneckRecs = await pb
          .collection('line_bottleneck_matrix')
          .getFullList({ limit: 20 })
        const mats = bottleneckRecs.map((b: any) => ({
          code: b.material_code || '700142',
          desc: `${b.product_family} ${b.gauge_dimension} (${b.steel_grade})`,
          family: b.product_family || 'QUAD',
          gauge: b.gauge_dimension || '130x130',
        }))
        setSapMaterials(
          mats.length > 0
            ? mats
            : [
                {
                  code: '700142',
                  desc: 'Tarugo SAE 1020 130x130mm',
                  family: 'QUAD_130',
                  gauge: '130x130',
                },
                {
                  code: '700145',
                  desc: 'Tarugo SAE 1045 150x150mm',
                  family: 'QUAD_150',
                  gauge: '150x150',
                },
                {
                  code: '700210',
                  desc: 'Tarugo SAE 5160 Perfil L2',
                  family: 'PERFIS_L2',
                  gauge: '130x130',
                },
              ],
        )

        // Receitas AOM do módulo AOM / Linhas
        setRecipesAOM([
          {
            id: 'REC-L1-1020-01',
            version: 'v3.2',
            material: 'SAE 1020',
            gauge: '130x130mm',
            family: 'TUB_QUAD',
            date: '2026-08-15',
          },
          {
            id: 'REC-L1-1045-02',
            version: 'v2.1',
            material: 'SAE 1045',
            gauge: '150x150mm',
            family: 'TUB_RET',
            date: '2026-07-20',
          },
          {
            id: 'REC-L2-5160-01',
            version: 'v4.0',
            material: 'SAE 5160',
            gauge: 'Perfis 6"',
            family: 'PERFIS_U',
            date: '2026-09-01',
          },
          {
            id: 'REC-L1-1010-04',
            version: 'v1.5',
            material: 'SAE 1010',
            gauge: '50x50x2.0mm',
            family: 'TUB_QUAD',
            date: '2026-06-10',
          },
        ])

        // Equipamentos SAP simulando catálogo do chão de fábrica
        setSapEquipments([
          {
            code: 'EQ-L1-LAMINADOR',
            desc: 'Laminador Desbastador Principal L1',
            location: 'Linha L1 - CIAFAL Wilson Santos',
          },
          {
            code: 'EQ-L1-FORNO',
            desc: 'Forno de Reaquecimento Contínuo Forno 1',
            location: 'Forno L1 - Setor Térmico',
          },
          {
            code: 'EQ-L1-TESOURA',
            desc: 'Tesoura Voadora TR2 Corte ao Comprimento',
            location: 'Pós-Trem de Laminação',
          },
          {
            code: 'EQ-L2-ENDIR',
            desc: 'Endireitadeira Multieixos 6 Cilindros L2',
            location: 'Célula de Conformação L2',
          },
          {
            code: 'EQ-L1-ROLETES',
            desc: 'Mesa de Roletes de Entrada do Resfriamento TCC',
            location: 'Leito TCC L1',
          },
        ])
      } catch (err) {
        console.warn('Erro ao carregar dados mestres para o formulário de teste:', err)
      }
    }

    loadMasterData()
  }, [isOpen])

  // Inicializa com dados caso seja edição
  useEffect(() => {
    if (initialItem && isOpen) {
      setCompany(initialItem.company)
      setProductionLine(initialItem.production_line)
      setWorkCenter(initialItem.work_center || '')
      setRequestDate(initialItem.request_date)
      setExpectedDate(initialItem.expected_date)
      setExpectedStartDate(initialItem.expected_start_date || initialItem.expected_date)
      setExpectedStartTime(initialItem.expected_start_time || '08:00')
      setExpectedEndDate(initialItem.expected_end_date || initialItem.expected_date)
      setExpectedEndTime(initialItem.expected_end_time || '10:30')
      setRequestingSector(initialItem.requesting_sector)
      setRequesterName(initialItem.requester_name)
      setTechnicalLead(initialItem.technical_lead)
      setTestType(initialItem.test_type)
      setTitle(initialItem.title)
      setObjective(initialItem.objective)
      if (initialItem.objectives_list && Array.isArray(initialItem.objectives_list)) {
        setSelectedObjectiveCodes(initialItem.objectives_list)
      } else if (initialItem.objective) {
        setSelectedObjectiveCodes([initialItem.objective])
      }
      setOtherObjectiveDesc(initialItem.other_objective_description || '')
      setDescription(initialItem.description || '')
      setJustification(initialItem.justification)
      setTestCategory(initialItem.test_category)
      setImpactType(initialItem.schedule_impact_type)

      if (initialItem.dynamic_category_data) {
        const dyn = initialItem.dynamic_category_data
        if (dyn.category === 'EQUIPAMENTO') {
          setEqCode(dyn.data.sapEquipmentCode)
          setEqDesc(dyn.data.sapEquipmentDescription)
          setEqLocation(dyn.data.installationLocation)
          setIsNewEquipment(dyn.data.isNewEquipment)
          setHasMechanicalChange(dyn.data.hasMechanicalChange)
          setHasElectricalChange(dyn.data.hasElectricalChange)
          setHasAutomationChange(dyn.data.hasAutomationChange)
          setHasInstrumentationChange(dyn.data.hasInstrumentationChange)
          setHasSoftwareChange(dyn.data.hasSoftwareChange)
          setRequiresMaintenance(dyn.data.requiresMaintenance)
          setRequiresAutomationOrIT(dyn.data.requiresAutomationOrIT)
        } else if (dyn.category === 'MATERIA_PRIMA') {
          setRawCode(dyn.data.rawMaterialCode)
          setRawDesc(dyn.data.rawMaterialDescription)
          setRawQty(dyn.data.rawMaterialQuantity)
          setRawUnit(dyn.data.rawMaterialUnit)
          setRawBatch(dyn.data.batchNumber)
          setRawSupplier(dyn.data.supplier)
          setProdCode(dyn.data.producedMaterialCode)
          setProdDesc(dyn.data.producedMaterialDescription)
          setProdQty(dyn.data.plannedQuantity)
          setProdUnit(dyn.data.producedMaterialUnit)
          setProdGauge(dyn.data.gaugeDimension)
          setProdFamily(dyn.data.family)
        } else if (dyn.category === 'RECEITA_LAMINACAO') {
          setRecipeChangeType(dyn.data.changeType)
          setRecipeId(dyn.data.recipeId)
          setRecipeVersion(dyn.data.recipeVersion)
          setRecipeVersionDate(dyn.data.recipeVersionDate)
          setRecipeMaterial(dyn.data.material)
          setRecipeGauge(dyn.data.gaugeDimension)
          setRecipeFamily(dyn.data.family)
          setRecipeNotes(dyn.data.technicalNotes || '')
        }
      }

      if (initialItem.impact_data) {
        const imp = initialItem.impact_data
        if (imp.type === 'PARADA_TOTAL') {
          setStopDate(imp.data.date)
          setStopShift(imp.data.shiftCode || '')
          setStopStartTime(imp.data.startTime)
          setStopDurationMinutes(imp.data.expectedDurationMinutes)
          setStopCrew(imp.data.crew || '')
          setStopScale(imp.data.scale || '')
          setStopIsSpecific(imp.data.isSpecificTime || false)
        } else if (imp.type === 'REDUCAO_RITMO') {
          setNominalRate(imp.data.nominalProductivity)
          setExpectedRate(imp.data.expectedProductivity)
          setReductionStart(imp.data.startDateTime)
          setReductionEnd(imp.data.endDateTime)
        }
      }

      if (initialItem.efficacy_criteria) {
        setCritIndicator(initialItem.efficacy_criteria.indicator)
        setCritExpectedCond(initialItem.efficacy_criteria.expectedCondition)
        setCritCurrentVal(initialItem.efficacy_criteria.currentValue)
        setCritTargetVal(initialItem.efficacy_criteria.expectedTarget)
        setCritUnit(initialItem.efficacy_criteria.unit)
        setCritPeriod(initialItem.efficacy_criteria.evaluationPeriod)
      }

      setEvalTiming(initialItem.efficacy_eval_timing || 'Imediatamente')
      setEvalSpecificDate(initialItem.efficacy_eval_specific_date || '')
      setDocRevisionType(initialItem.doc_or_target_revision || 'Não')

      if (initialItem.revision_details) {
        setRevItem(initialItem.revision_details.item)
        setRevReason(initialItem.revision_details.reason)
        setRevResp(initialItem.revision_details.responsible)
        setRevDeadline(initialItem.revision_details.deadline)
        setRevDesc(initialItem.revision_details.description)
      }
    } else if (isOpen) {
      // Reset básico
      setTitle('')
      setObjective('')
      setSelectedObjectiveCodes([])
      setOtherObjectiveDesc('')
      setConflictWarning(null)
      setDescription('')
      setJustification('')
      setTechnicalLead(user?.name || 'Carlos Mendes')
      const todayStr = new Date().toISOString().split('T')[0]
      setExpectedStartDate(todayStr)
      setExpectedStartTime('08:00')
      setExpectedEndDate(todayStr)
      setExpectedEndTime('10:30')
      setPeriodValidationMessage(null)
      setErrorMessage(null)
    }
  }, [initialItem, isOpen, user])

  // Duração prevista calculada automaticamente e validação em tempo real (Requisitos 1 e 2)
  const computedPeriod = useMemo(() => {
    return calculatePeriodDuration(
      expectedStartDate,
      expectedStartTime,
      expectedEndDate,
      expectedEndTime,
    )
  }, [expectedStartDate, expectedStartTime, expectedEndDate, expectedEndTime])

  // Hora fim calculada automaticamente
  const calculatedEndTime = calculateEndTime(stopStartTime, stopDurationMinutes)

  // Percentual de redução calculado automaticamente
  const calculatedReductionPct = calculateReductionPercent(nominalRate, expectedRate)

  // Handlers de autopreenchimento de equipamento
  const handleSelectEquipment = (code: string) => {
    const found = sapEquipments.find((e) => e.code === code)
    if (found) {
      setEqCode(found.code)
      setEqDesc(found.desc)
      setEqLocation(found.location)
    }
  }

  // Autopreenchimento de Receita AOM
  const handleSelectRecipe = (id: string) => {
    const found = recipesAOM.find((r) => r.id === id)
    if (found) {
      setRecipeId(found.id)
      setRecipeVersion(found.version)
      setRecipeVersionDate(found.date)
      setRecipeMaterial(found.material)
      setRecipeGauge(found.gauge)
      setRecipeFamily(found.family)
    }
  }

  // Autopreenchimento de Matéria-Prima
  const handleSelectMaterial = (code: string) => {
    const found = sapMaterials.find((m) => m.code === code)
    if (found) {
      setRawCode(found.code)
      setRawDesc(found.desc)
      setProdFamily(found.family)
      setProdGauge(found.gauge)
    }
  }

  // Preenchimento de turno da Linha
  const handleSelectShift = (code: string) => {
    const found = shifts.find((s) => s.code === code)
    if (found) {
      setStopShift(found.code)
      setStopStartTime(found.start_time)
      setStopScale(found.scale || '')
    }
  }

  const handleSubmit = async (submitStatus: 'Rascunho' | 'Enviado para Aprovação Industrial') => {
    // Validações do Período Previsto (Regras 1, 2 e 3)
    if (!expectedStartDate) {
      setErrorMessage('Informe a Data de Início no Período Previsto do Teste.')
      setActiveTab('geral')
      return
    }
    if (!expectedStartTime) {
      setErrorMessage('Informe a Hora de Início no Período Previsto do Teste.')
      setActiveTab('geral')
      return
    }
    if (!expectedEndDate) {
      setErrorMessage('Informe a Data de Fim no Período Previsto do Teste.')
      setActiveTab('geral')
      return
    }
    if (!expectedEndTime) {
      setErrorMessage('Informe a Hora de Fim no Período Previsto do Teste.')
      setActiveTab('geral')
      return
    }

    if (!computedPeriod.isValid) {
      const msg = computedPeriod.errorMessage || MSG_REGRA_1_DATA_HORA
      setErrorMessage(msg)
      setPeriodValidationMessage(msg)
      setActiveTab('geral')
      return
    }

    // Validações obrigatórias
    if (!title.trim()) {
      setErrorMessage('O título do teste é obrigatório.')
      setActiveTab('geral')
      return
    }

    if (selectedObjectiveCodes.length === 0) {
      setErrorMessage('Selecione pelo menos 1 Objetivo Industrial Padronizado.')
      setActiveTab('geral')
      return
    }

    const hasOtherObj = selectedObjectiveCodes.some(
      (code) =>
        code === 'OBJ-35' ||
        code === 'Outro objetivo industrial' ||
        availableObjectives.find((o) => o.code === code)?.is_custom_trigger,
    )
    if (hasOtherObj && !otherObjectiveDesc.trim()) {
      setErrorMessage(
        'O campo "Descrever outro objetivo" é obrigatório quando "Outro objetivo industrial" está selecionado.',
      )
      setActiveTab('geral')
      return
    }

    if (!justification.trim()) {
      setErrorMessage('A justificativa do teste é obrigatória.')
      setActiveTab('geral')
      return
    }
    if (!technicalLead.trim()) {
      setErrorMessage('O responsável técnico é obrigatório.')
      setActiveTab('geral')
      return
    }

    // Validação da categoria dinâmica
    let dynamicCategoryData: DynamicCategoryData
    if (testCategory === 'EQUIPAMENTO') {
      if (!eqCode || !eqDesc) {
        setErrorMessage(
          'Para categoria EQUIPAMENTO, selecione ou informe o código e a descrição do equipamento SAP.',
        )
        setActiveTab('categoria')
        return
      }
      dynamicCategoryData = {
        category: 'EQUIPAMENTO',
        data: {
          sapEquipmentCode: eqCode,
          sapEquipmentDescription: eqDesc,
          installationLocation: eqLocation,
          isNewEquipment,
          hasMechanicalChange,
          hasElectricalChange,
          hasAutomationChange,
          hasInstrumentationChange,
          hasSoftwareChange,
          requiresMaintenance,
          requiresAutomationOrIT,
        },
      }
    } else if (testCategory === 'MATERIA_PRIMA') {
      if (!rawCode || !rawDesc) {
        setErrorMessage('Para categoria MATÉRIA-PRIMA, informe os dados da matéria-prima a testar.')
        setActiveTab('categoria')
        return
      }
      dynamicCategoryData = {
        category: 'MATERIA_PRIMA',
        data: {
          rawMaterialCode: rawCode,
          rawMaterialDescription: rawDesc,
          rawMaterialQuantity: Number(rawQty) || 0,
          rawMaterialUnit: rawUnit,
          batchNumber: rawBatch,
          supplier: rawSupplier,
          producedMaterialCode: prodCode || rawCode,
          producedMaterialDescription: prodDesc || rawDesc,
          plannedQuantity: Number(prodQty) || 0,
          producedMaterialUnit: prodUnit,
          gaugeDimension: prodGauge,
          family: prodFamily,
          productionLine,
        },
      }
    } else {
      if (!recipeId) {
        setErrorMessage(
          'Para categoria RECEITA DE LAMINAÇÃO, selecione a receita AOM de referência.',
        )
        setActiveTab('categoria')
        return
      }
      dynamicCategoryData = {
        category: 'RECEITA_LAMINACAO',
        data: {
          changeType: recipeChangeType,
          recipeId,
          recipeVersion,
          recipeVersionDate,
          material: recipeMaterial,
          gaugeDimension: recipeGauge,
          family: recipeFamily,
          productionLine,
          technicalNotes: recipeNotes,
        },
      }
    }

    // Validação do Impacto
    let impactData: ScheduleImpactData
    if (impactType === 'PARADA_TOTAL') {
      impactData = {
        type: 'PARADA_TOTAL',
        data: {
          date: stopDate,
          shiftCode: stopShift,
          shiftName: shifts.find((s) => s.code === stopShift)?.name || stopShift,
          startTime: stopStartTime,
          expectedDurationMinutes: Number(stopDurationMinutes) || 0,
          calculatedEndTime,
          crew: stopCrew,
          scale: stopScale,
          isSpecificTime: stopIsSpecific,
        },
      }
    } else if (impactType === 'REDUCAO_RITMO') {
      impactData = {
        type: 'REDUCAO_RITMO',
        data: {
          nominalProductivity: Number(nominalRate) || 0,
          expectedProductivity: Number(expectedRate) || 0,
          unit: 't/h',
          calculatedReductionPercent: calculatedReductionPct,
          startDateTime: reductionStart,
          endDateTime: reductionEnd,
        },
      }
    } else {
      impactData = {
        type: 'SEM_IMPACTO',
        data: { notes: 'Não requer parada nem redução de velocidade' },
      }
    }

    const efficacyCriteria: EfficacyCriteria = {
      indicator: critIndicator,
      expectedCondition: critExpectedCond,
      currentValue: critCurrentVal,
      expectedTarget: critTargetVal,
      unit: critUnit,
      evaluationPeriod: critPeriod,
    }

    const revisionDetails: RevisionDetails | undefined =
      docRevisionType !== 'Não'
        ? {
            item: revItem,
            reason: revReason,
            responsible: revResp,
            deadline: revDeadline,
            description: revDesc,
          }
        : undefined

    setIsSubmitting(true)
    setErrorMessage(null)
    setConflictWarning(null)

    try {
      // Etapa 1: Checagem de Conflitos na Montagem Semanal
      const conflictCheck = await testProgrammingService.checkScheduleConflicts({
        center: productionLine,
        startDate: expectedStartDate,
        startTime: expectedStartTime,
        endDate: expectedEndDate,
        endTime: expectedEndTime,
        ignoreTestProgrammingId: initialItem?.id,
      })

      if (conflictCheck.hasConflict) {
        setConflictWarning(conflictCheck.message || 'Conflito de programação identificado.')
      }

      // Montar nomes legíveis dos objetivos
      const primaryObjectiveName =
        availableObjectives.find((o) => o.code === selectedObjectiveCodes[0])?.name ||
        selectedObjectiveCodes[0] ||
        'Objetivo Industrial'

      const payload: any = {
        company,
        production_line: productionLine,
        work_center: workCenter || lines.find((l) => l.code === productionLine)?.work_center || '',
        request_date: requestDate,
        expected_date: expectedStartDate || expectedDate,
        expected_start_date: expectedStartDate,
        expected_start_time: expectedStartTime,
        expected_end_date: expectedEndDate,
        expected_end_time: expectedEndTime,
        expected_duration_minutes: computedPeriod.totalMinutes,
        expected_duration_formatted: computedPeriod.formatted,
        requesting_sector: requestingSector,
        requester_name: requesterName,
        requester_user_id: user?.id || '',
        technical_lead: technicalLead,
        test_type: testType,
        title: title.trim(),
        objective: primaryObjectiveName,
        objectives_list: selectedObjectiveCodes,
        other_objective_description: hasOtherObj ? otherObjectiveDesc.trim() : '',
        description: description.trim(),
        justification: justification.trim(),
        test_category: testCategory,
        dynamic_category_data: dynamicCategoryData,
        schedule_impact_type: impactType,
        impact_data: impactData,
        efficacy_criteria: efficacyCriteria,
        efficacy_eval_timing: evalTiming,
        efficacy_eval_specific_date: evalSpecificDate,
        doc_or_target_revision: docRevisionType,
        revision_details: revisionDetails,
        status: submitStatus,
      }

      if (initialItem?.id) {
        const updated = await testProgrammingService.update(
          initialItem.id,
          payload,
          { id: user?.id, name: user?.name || user?.email || 'Usuário', role: user?.role },
          submitStatus === 'Enviado para Aprovação Industrial'
            ? 'Envio para Aprovação Industrial'
            : 'Edição de dados da programação de teste',
        )
        toast({
          title: 'Teste Atualizado',
          description: `✅ Teste ${updated.test_id} atualizado com sucesso. A Montagem Semanal foi sincronizada automaticamente.`,
        })
      } else {
        const created = await testProgrammingService.create(payload, {
          id: user?.id,
          name: user?.name || user?.email || 'Usuário',
          role: user?.role,
        })
        toast({
          title: 'Teste Salvo',
          description: `Teste ${created.test_id} salvo com sucesso. Programação integrada à Montagem Semanal do centro [${created.production_line || productionLine}].`,
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Falha ao salvar programação de teste:', err)
      setErrorMessage(err?.message || 'Erro na comunicação com o backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#004C97]" />
              {initialItem
                ? `Editar Programação de Teste (${initialItem.test_id})`
                : 'Nova Programação de Teste Industrial'}
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500">
            Objeto real da programação industrial (impacta capacidade, sequenciamento e carteira
            fabril).
          </p>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-1">
          <TabsList className="grid grid-cols-4 h-9 bg-slate-100 p-1">
            <TabsTrigger value="geral" className="text-xs font-semibold">
              1. Geral & Local
            </TabsTrigger>
            <TabsTrigger value="categoria" className="text-xs font-semibold">
              2. Categoria Dinâmica
            </TabsTrigger>
            <TabsTrigger value="impacto" className="text-xs font-semibold">
              3. Impacto Produtivo
            </TabsTrigger>
            <TabsTrigger value="eficacia" className="text-xs font-semibold">
              4. Eficácia & Revisão
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: DADOS GERAIS */}
          <TabsContent value="geral" className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Empresa *</Label>
                <Select value={company} onValueChange={setCompany}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                    {companies.length === 0 && (
                      <SelectItem value="CIAFAL" className="text-xs">
                        CIAFAL Wilson Santos
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Linha de Produção *</Label>
                <Select
                  value={productionLine}
                  onValueChange={(val) => {
                    setProductionLine(val)
                    const found = lines.find((l) => l.code === val)
                    if (found?.work_center) setWorkCenter(found.work_center)
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Selecione a linha" />
                  </SelectTrigger>
                  <SelectContent>
                    {lines.map((l) => (
                      <SelectItem key={l.code} value={l.code} className="text-xs">
                        {l.name} ({l.code})
                      </SelectItem>
                    ))}
                    {lines.length === 0 && (
                      <SelectItem value="L1" className="text-xs">
                        Linha L1
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Centro de Trabalho (SAP)
                </Label>
                <Input
                  value={workCenter}
                  onChange={(e) => setWorkCenter(e.target.value)}
                  placeholder="Ex: WC-DIV-L1"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Data Solicitação *</Label>
                <Input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Setor Solicitante *</Label>
                <Input
                  value={requestingSector}
                  onChange={(e) => setRequestingSector(e.target.value)}
                  placeholder="Ex: Engenharia de Processos / Manutenção"
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Agrupamento "Período Previsto do Teste" (Requisito 1: substitui o campo único anterior) */}
            <div className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#004C97]" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Período Previsto do Teste *
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Duração prevista do teste:
                  </span>
                  <Badge
                    data-testid="expected-duration-badge"
                    className={`font-mono text-xs font-bold px-2 py-0.5 ${
                      computedPeriod.isValid
                        ? 'bg-[#004C97] text-white hover:bg-[#003974]'
                        : 'bg-red-100 text-red-800 border-red-300'
                    }`}
                  >
                    {computedPeriod.isValid ? computedPeriod.formatted : 'Inválida'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Data Início (dd/mm/aaaa) *
                  </Label>
                  <Input
                    type="date"
                    data-testid="expected-start-date"
                    value={expectedStartDate}
                    onChange={(e) => {
                      setExpectedStartDate(e.target.value)
                      setPeriodValidationMessage(null)
                    }}
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Hora Início (HH:mm) *
                  </Label>
                  <Input
                    type="time"
                    data-testid="expected-start-time"
                    value={expectedStartTime}
                    onChange={(e) => {
                      setExpectedStartTime(e.target.value)
                      setPeriodValidationMessage(null)
                    }}
                    className="text-xs h-8 bg-white font-mono"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Data Fim (dd/mm/aaaa) *
                  </Label>
                  <Input
                    type="date"
                    data-testid="expected-end-date"
                    value={expectedEndDate}
                    onChange={(e) => {
                      setExpectedEndDate(e.target.value)
                      setPeriodValidationMessage(null)
                    }}
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Hora Fim (HH:mm) *
                  </Label>
                  <Input
                    type="time"
                    data-testid="expected-end-time"
                    value={expectedEndTime}
                    onChange={(e) => {
                      setExpectedEndTime(e.target.value)
                      setPeriodValidationMessage(null)
                    }}
                    className="text-xs h-8 bg-white font-mono"
                  />
                </div>
              </div>

              {!computedPeriod.isValid && (
                <div
                  data-testid="period-error-message"
                  className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                  <span>{computedPeriod.errorMessage || MSG_REGRA_1_DATA_HORA}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Solicitante *</Label>
                <Input
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Nome do Solicitante"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Responsável Técnico *
                </Label>
                <Input
                  value={technicalLead}
                  onChange={(e) => setTechnicalLead(e.target.value)}
                  placeholder="Engenheiro / Técnico Líder"
                  className="text-xs h-8"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Tipo de Teste *</Label>
                <Input
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  placeholder="Ex: Validação Dimensional / Homologação"
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Título do Teste *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Validação de Novo Cilindro Desbastador Linha L1"
                className="text-xs h-8 font-medium"
              />
            </div>

            {/* Seletor Pesquisável Multi-seleção de Objetivos Industriais Padronizados */}
            <div className="space-y-2 p-3 bg-purple-50/50 border border-purple-200/80 rounded-lg">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                  Objetivo Industrial *
                </Label>
                <span className="text-[11px] font-semibold text-purple-800">
                  {selectedObjectiveCodes.length} selecionado(s)
                </span>
              </div>

              {/* Input de busca rápida */}
              <Input
                placeholder="Pesquisar entre os 35 objetivos industriais..."
                value={objectiveSearchTerm}
                onChange={(e) => setObjectiveSearchTerm(e.target.value)}
                className="text-xs h-7 bg-white"
              />

              {/* Grid / Lista rolável de objetivos ativos */}
              <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-white rounded border border-purple-200">
                {availableObjectives
                  .filter(
                    (obj) =>
                      obj.active &&
                      (obj.name.toLowerCase().includes(objectiveSearchTerm.toLowerCase()) ||
                        obj.code.toLowerCase().includes(objectiveSearchTerm.toLowerCase())),
                  )
                  .map((obj) => {
                    const isSelected = selectedObjectiveCodes.includes(obj.code)
                    return (
                      <div
                        key={obj.code}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedObjectiveCodes(
                              selectedObjectiveCodes.filter((c) => c !== obj.code),
                            )
                          } else {
                            setSelectedObjectiveCodes([...selectedObjectiveCodes, obj.code])
                          }
                        }}
                        className={`flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-purple-100/90 text-purple-950 font-bold border border-purple-300'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="font-mono text-[11px] text-slate-500">{obj.code}</span>
                          <span>{obj.name}</span>
                        </div>
                        {obj.is_custom_trigger && (
                          <Badge className="text-[9px] bg-purple-600 text-white py-0 px-1">
                            Complementar
                          </Badge>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Campo complementar obrigatório apenas se "Outro objetivo industrial" estiver marcado */}
              {selectedObjectiveCodes.some(
                (code) =>
                  code === 'OBJ-35' ||
                  code === 'Outro objetivo industrial' ||
                  availableObjectives.find((o) => o.code === code)?.is_custom_trigger,
              ) && (
                <div className="pt-2 border-t border-purple-200 space-y-1">
                  <Label className="text-xs font-bold text-purple-900">
                    Descrever outro objetivo *
                  </Label>
                  <Input
                    value={otherObjectiveDesc}
                    onChange={(e) => setOtherObjectiveDesc(e.target.value)}
                    placeholder="Descreva detalhadamente o objetivo industrial específico..."
                    className="text-xs h-8 bg-white border-purple-300 focus:border-purple-600"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Justificativa *</Label>
              <Textarea
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Motivo industrial, redução de custo, desvio de qualidade..."
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Descrição Detalhada / Procedimento
              </Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Passo a passo ou cuidados de segurança operacional durante a execução..."
                className="text-xs resize-none"
              />
            </div>
          </TabsContent>

          {/* ABA 2: CATEGORIA DINÂMICA (OBRIGATÓRIO) */}
          <TabsContent value="categoria" className="space-y-3 pt-2">
            <div className="flex items-center gap-4 p-2 bg-slate-50 border border-slate-200 rounded">
              <Label className="text-xs font-bold text-slate-800 shrink-0">
                Categoria do Teste:
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={testCategory === 'EQUIPAMENTO' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestCategory('EQUIPAMENTO')}
                  className={`text-xs h-8 gap-1.5 ${
                    testCategory === 'EQUIPAMENTO' ? 'bg-[#004C97]' : ''
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  EQUIPAMENTO
                </Button>
                <Button
                  type="button"
                  variant={testCategory === 'MATERIA_PRIMA' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestCategory('MATERIA_PRIMA')}
                  className={`text-xs h-8 gap-1.5 ${
                    testCategory === 'MATERIA_PRIMA' ? 'bg-[#004C97]' : ''
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  MATÉRIA-PRIMA
                </Button>
                <Button
                  type="button"
                  variant={testCategory === 'RECEITA_LAMINACAO' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTestCategory('RECEITA_LAMINACAO')}
                  className={`text-xs h-8 gap-1.5 ${
                    testCategory === 'RECEITA_LAMINACAO' ? 'bg-[#004C97]' : ''
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  RECEITA DE LAMINAÇÃO (AOM)
                </Button>
              </div>
            </div>

            {/* Subformulário: EQUIPAMENTO */}
            {testCategory === 'EQUIPAMENTO' && (
              <div className="space-y-3 p-3 bg-amber-50/50 border border-amber-200/80 rounded">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-amber-700" />
                    Parâmetros de Equipamento SAP & Flags Técnicas
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    Estrutura SAP Integrada
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Equipamento SAP (Pesquisa)
                    </Label>
                    <Select value={eqCode} onValueChange={handleSelectEquipment}>
                      <SelectTrigger className="text-xs h-8 bg-white">
                        <SelectValue placeholder="Selecione no SAP" />
                      </SelectTrigger>
                      <SelectContent>
                        {sapEquipments.map((eq) => (
                          <SelectItem key={eq.code} value={eq.code} className="text-xs">
                            {eq.code} - {eq.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Código SAP *</Label>
                    <Input
                      value={eqCode}
                      onChange={(e) => setEqCode(e.target.value)}
                      placeholder="Ex: EQ-L1-LAMINADOR"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Local de Instalação
                    </Label>
                    <Input
                      value={eqLocation}
                      onChange={(e) => setEqLocation(e.target.value)}
                      placeholder="Autopreenchido pelo SAP"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Descrição do Equipamento *
                  </Label>
                  <Input
                    value={eqDesc}
                    onChange={(e) => setEqDesc(e.target.value)}
                    placeholder="Descrição técnica"
                    className="text-xs h-8 bg-white"
                  />
                </div>

                <div className="pt-2 border-t border-amber-200/60">
                  <span className="text-[11px] font-bold text-slate-700 block mb-2">
                    Flags de Intervenção e Envolvimento Técnico (Sim / Não):
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Equipamento Novo
                      </Label>
                      <Switch checked={isNewEquipment} onCheckedChange={setIsNewEquipment} />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Alt. Mecânica
                      </Label>
                      <Switch
                        checked={hasMechanicalChange}
                        onCheckedChange={setHasMechanicalChange}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Alt. Elétrica
                      </Label>
                      <Switch
                        checked={hasElectricalChange}
                        onCheckedChange={setHasElectricalChange}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Alt. Automação
                      </Label>
                      <Switch
                        checked={hasAutomationChange}
                        onCheckedChange={setHasAutomationChange}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Instrumentação
                      </Label>
                      <Switch
                        checked={hasInstrumentationChange}
                        onCheckedChange={setHasInstrumentationChange}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Software / CLP
                      </Label>
                      <Switch checked={hasSoftwareChange} onCheckedChange={setHasSoftwareChange} />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Requer Manutenção
                      </Label>
                      <Switch
                        checked={requiresMaintenance}
                        onCheckedChange={setRequiresMaintenance}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                      <Label className="text-[11px] font-medium text-slate-700 cursor-pointer">
                        Requer Automação/TI
                      </Label>
                      <Switch
                        checked={requiresAutomationOrIT}
                        onCheckedChange={setRequiresAutomationOrIT}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subformulário: MATÉRIA-PRIMA */}
            {testCategory === 'MATERIA_PRIMA' && (
              <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-200/80 rounded">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-700" />
                    1. Matéria-prima a Testar (Entrada)
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    Estoque & Bobinas SAP
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs font-semibold text-slate-700">
                      Pesquisar Material no SAP
                    </Label>
                    <Select value={rawCode} onValueChange={handleSelectMaterial}>
                      <SelectTrigger className="text-xs h-8 bg-white">
                        <SelectValue placeholder="Selecione o material" />
                      </SelectTrigger>
                      <SelectContent>
                        {sapMaterials.map((m) => (
                          <SelectItem key={m.code} value={m.code} className="text-xs">
                            {m.code} - {m.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Qtd a Testar *</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        value={rawQty}
                        onChange={(e) => setRawQty(Number(e.target.value))}
                        className="text-xs h-8 bg-white"
                      />
                      <Select value={rawUnit} onValueChange={setRawUnit}>
                        <SelectTrigger className="text-xs h-8 w-16 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="t">t</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="peça">pç</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Lote / Corrida</Label>
                    <Input
                      value={rawBatch}
                      onChange={(e) => setRawBatch(e.target.value)}
                      placeholder="Ex: #4429A"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Descrição Matéria-Prima *
                    </Label>
                    <Input
                      value={rawDesc}
                      onChange={(e) => setRawDesc(e.target.value)}
                      placeholder="Descrição detalhada"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Fornecedor / Siderúrgica
                    </Label>
                    <Input
                      value={rawSupplier}
                      onChange={(e) => setRawSupplier(e.target.value)}
                      placeholder="Ex: Gerdau, ArcelorMittal, Usiminas"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-200/60">
                  <h4 className="text-xs font-bold text-blue-900 mb-2">
                    2. Material Produzido Resultante (Saída)
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Código Produto</Label>
                      <Input
                        value={prodCode}
                        onChange={(e) => setProdCode(e.target.value)}
                        placeholder="Ex: TQ-50x50"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Bitola / Dimensão
                      </Label>
                      <Input
                        value={prodGauge}
                        onChange={(e) => setProdGauge(e.target.value)}
                        placeholder="Ex: 50x50x2.0mm"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Família</Label>
                      <Input
                        value={prodFamily}
                        onChange={(e) => setProdFamily(e.target.value)}
                        placeholder="Ex: TUB_QUAD"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Qtd Prevista</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={prodQty}
                          onChange={(e) => setProdQty(Number(e.target.value))}
                          className="text-xs h-8 bg-white"
                        />
                        <Select value={prodUnit} onValueChange={setProdUnit}>
                          <SelectTrigger className="text-xs h-8 w-16 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="t">t</SelectItem>
                            <SelectItem value="peça">pç</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subformulário: RECEITA DE LAMINAÇÃO (AOM) */}
            {testCategory === 'RECEITA_LAMINACAO' && (
              <div className="space-y-3 p-3 bg-purple-50/50 border border-purple-200/80 rounded">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-700" />
                    Parâmetros da Receita AOM & Modificação
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    Histórico Preservado
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Tipo de Alteração da Receita *
                    </Label>
                    <Select
                      value={recipeChangeType}
                      onValueChange={(val) => setRecipeChangeType(val as RecipeChangeType)}
                    >
                      <SelectTrigger className="text-xs h-8 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alteração de Layout" className="text-xs">
                          Alteração de Layout
                        </SelectItem>
                        <SelectItem value="Alteração de Calibração" className="text-xs">
                          Alteração de Calibração
                        </SelectItem>
                        <SelectItem value="Nova Receita" className="text-xs">
                          Nova Receita
                        </SelectItem>
                        <SelectItem value="Ajuste de Receita" className="text-xs">
                          Ajuste de Receita
                        </SelectItem>
                        <SelectItem value="Validação de Receita" className="text-xs">
                          Validação de Receita
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Selecionar Receita AOM Existente
                    </Label>
                    <Select value={recipeId} onValueChange={handleSelectRecipe}>
                      <SelectTrigger className="text-xs h-8 bg-white">
                        <SelectValue placeholder="Selecione no catálogo AOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {recipesAOM.map((r) => (
                          <SelectItem key={r.id} value={r.id} className="text-xs">
                            {r.id} ({r.version}) - {r.material} {r.gauge}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">ID da Receita *</Label>
                    <Input
                      value={recipeId}
                      onChange={(e) => setRecipeId(e.target.value)}
                      placeholder="Ex: REC-L1-1020-01"
                      className="text-xs h-8 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Versão Usada</Label>
                    <Input
                      value={recipeVersion}
                      onChange={(e) => setRecipeVersion(e.target.value)}
                      placeholder="Ex: v3.2"
                      className="text-xs h-8 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Data da Versão</Label>
                    <Input
                      type="date"
                      value={recipeVersionDate}
                      onChange={(e) => setRecipeVersionDate(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Aço / Material</Label>
                    <Input
                      value={recipeMaterial}
                      onChange={(e) => setRecipeMaterial(e.target.value)}
                      placeholder="Ex: SAE 1020"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Bitola / Dimensão
                    </Label>
                    <Input
                      value={recipeGauge}
                      onChange={(e) => setRecipeGauge(e.target.value)}
                      placeholder="Ex: 130x130mm"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Família de Produto
                    </Label>
                    <Input
                      value={recipeFamily}
                      onChange={(e) => setRecipeFamily(e.target.value)}
                      placeholder="Ex: TUB_QUAD"
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Notas Técnicas da Calibração / Ajuste
                  </Label>
                  <Textarea
                    rows={2}
                    value={recipeNotes}
                    onChange={(e) => setRecipeNotes(e.target.value)}
                    placeholder="Registrar os parâmetros alterados sem sobrescrever versões anteriores da receita..."
                    className="text-xs bg-white resize-none"
                  />
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA 3: IMPACTO NA PROGRAMAÇÃO (CÁLCULOS AUTOMÁTICOS) */}
          <TabsContent value="impacto" className="space-y-3 pt-2">
            <div className="flex items-center gap-4 p-2 bg-slate-50 border border-slate-200 rounded">
              <Label className="text-xs font-bold text-slate-800 shrink-0">
                Tipo de Impacto na Linha:
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={impactType === 'PARADA_TOTAL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImpactType('PARADA_TOTAL')}
                  className={`text-xs h-8 gap-1.5 ${
                    impactType === 'PARADA_TOTAL' ? 'bg-red-600 hover:bg-red-700' : ''
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  PARADA TOTAL
                </Button>
                <Button
                  type="button"
                  variant={impactType === 'REDUCAO_RITMO' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImpactType('REDUCAO_RITMO')}
                  className={`text-xs h-8 gap-1.5 ${
                    impactType === 'REDUCAO_RITMO' ? 'bg-amber-600 hover:bg-amber-700' : ''
                  }`}
                >
                  REDUÇÃO DE RITMO
                </Button>
                <Button
                  type="button"
                  variant={impactType === 'SEM_IMPACTO' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImpactType('SEM_IMPACTO')}
                  className={`text-xs h-8 gap-1.5 ${
                    impactType === 'SEM_IMPACTO' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                  }`}
                >
                  SEM IMPACTO PRODUTIVO
                </Button>
              </div>
            </div>

            {/* Subformulário: PARADA TOTAL */}
            {impactType === 'PARADA_TOTAL' && (
              <div className="space-y-3 p-3 bg-red-50/40 border border-red-200 rounded">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-red-600" />
                    Parada Total da Linha (Ficha Mestra & Turnos Integrados)
                  </h4>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white text-red-700 border-red-300"
                  >
                    Cálculo Automático de Fim
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Data da Parada *</Label>
                    <Input
                      type="date"
                      value={stopDate}
                      onChange={(e) => setStopDate(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Turno da Ficha Mestra
                    </Label>
                    <Select value={stopShift} onValueChange={handleSelectShift}>
                      <SelectTrigger className="text-xs h-8 bg-white">
                        <SelectValue placeholder="Selecione o turno" />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.map((s) => (
                          <SelectItem key={s.code} value={s.code} className="text-xs">
                            {s.name} ({s.start_time}-{s.end_time})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Turma / Escala</Label>
                    <Input
                      value={stopCrew || stopScale}
                      onChange={(e) => setStopCrew(e.target.value)}
                      placeholder="Ex: Turma A / 6X1"
                      className="text-xs h-8 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <Switch
                      checked={stopIsSpecific}
                      onCheckedChange={setStopIsSpecific}
                      id="specific-time"
                    />
                    <Label
                      htmlFor="specific-time"
                      className="text-[11px] text-slate-700 cursor-pointer"
                    >
                      Horário Específico
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-2.5 bg-white rounded border border-red-200">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Hora Início *</Label>
                    <Input
                      type="time"
                      value={stopStartTime}
                      onChange={(e) => setStopStartTime(e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Duração Prevista (minutos) *
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={stopDurationMinutes}
                      onChange={(e) => setStopDurationMinutes(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-emerald-800 flex items-center gap-1">
                      <span>Hora Fim (Calculada)</span>
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                    </Label>
                    <div className="h-8 px-3 rounded bg-emerald-50 border border-emerald-200 flex items-center font-mono font-bold text-sm text-emerald-800">
                      {calculatedEndTime || '--:--'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subformulário: REDUÇÃO DE RITMO */}
            {impactType === 'REDUCAO_RITMO' && (
              <div className="space-y-3 p-3 bg-amber-50/40 border border-amber-200 rounded">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900">
                    Redução Temporária de Ritmo / Cadência
                  </h4>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white text-amber-700 border-amber-300"
                  >
                    Cálculo Automático de %
                  </Badge>
                </div>

                <div className="grid grid-cols-4 gap-3 p-2.5 bg-white rounded border border-amber-200">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Produtividade Nominal (t/h)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={nominalRate}
                      onChange={(e) => setNominalRate(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Produtividade Prevista (t/h)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={expectedRate}
                      onChange={(e) => setExpectedRate(Number(e.target.value))}
                      className="text-xs h-8"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Unidade</Label>
                    <Input value="t/h" disabled className="text-xs h-8 bg-slate-50 font-mono" />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                      <span>Redução Calculada (%)</span>
                      <Sparkles className="w-3 h-3 text-amber-600" />
                    </Label>
                    <div className="h-8 px-3 rounded bg-amber-50 border border-amber-200 flex items-center font-mono font-bold text-sm text-amber-900">
                      {calculatedReductionPct}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data/Hora Início da Redução
                    </Label>
                    <Input
                      type="datetime-local"
                      value={reductionStart}
                      onChange={(e) => setReductionStart(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data/Hora Fim da Redução
                    </Label>
                    <Input
                      type="datetime-local"
                      value={reductionEnd}
                      onChange={(e) => setReductionEnd(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subformulário: SEM IMPACTO */}
            {impactType === 'SEM_IMPACTO' && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded text-center">
                <p className="text-xs text-emerald-800 font-medium">
                  Este teste será executado em paralelo sem necessidade de interrupção ou queda na
                  cadência da linha.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ABA 4: CRITÉRIO DE EFICÁCIA & REVISÕES */}
          <TabsContent value="eficacia" className="space-y-3 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">
                  Critério de Eficácia (Definido ANTES do Teste) *
                </h4>
                <Badge variant="outline" className="text-[10px] bg-white">
                  Governança & Garantia de Sucesso
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Indicador Avaliado *
                  </Label>
                  <Input
                    value={critIndicator}
                    onChange={(e) => setCritIndicator(e.target.value)}
                    placeholder="Ex: Produtividade / Tolerância"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Valor Atual</Label>
                  <Input
                    value={critCurrentVal}
                    onChange={(e) => setCritCurrentVal(e.target.value)}
                    placeholder="Ex: 12.5"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Meta Esperada *</Label>
                  <div className="flex gap-1">
                    <Input
                      value={critTargetVal}
                      onChange={(e) => setCritTargetVal(e.target.value)}
                      placeholder="Ex: 14.0"
                      className="text-xs h-8 bg-white"
                    />
                    <Input
                      value={critUnit}
                      onChange={(e) => setCritUnit(e.target.value)}
                      placeholder="t/h"
                      className="text-xs h-8 w-16 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Condição Esperada *
                  </Label>
                  <Input
                    value={critExpectedCond}
                    onChange={(e) => setCritExpectedCond(e.target.value)}
                    placeholder="Ex: Operação estável sem quebras superficiais"
                    className="text-xs h-8 bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Período para Avaliação
                  </Label>
                  <Input
                    value={critPeriod}
                    onChange={(e) => setCritPeriod(e.target.value)}
                    placeholder="Ex: 3 turnos / 24h"
                    className="text-xs h-8 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Quando Avaliar Eficácia? *
                  </Label>
                  <Select
                    value={evalTiming}
                    onValueChange={(val) => setEvalTiming(val as EfficacyEvalTiming)}
                  >
                    <SelectTrigger className="text-xs h-8 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Imediatamente" className="text-xs">
                        Imediatamente
                      </SelectItem>
                      <SelectItem value="Após 1 turno" className="text-xs">
                        Após 1 turno
                      </SelectItem>
                      <SelectItem value="24h" className="text-xs">
                        24h
                      </SelectItem>
                      <SelectItem value="7 dias" className="text-xs">
                        7 dias
                      </SelectItem>
                      <SelectItem value="30 dias" className="text-xs">
                        30 dias
                      </SelectItem>
                      <SelectItem value="data específica" className="text-xs">
                        data específica
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {evalTiming === 'data específica' && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Data Específica de Avaliação
                    </Label>
                    <Input
                      type="date"
                      value={evalSpecificDate}
                      onChange={(e) => setEvalSpecificDate(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Revisão de Documento ou Meta */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Revisão de Documento ou Meta?</h4>
                <Select
                  value={docRevisionType}
                  onValueChange={(val) => setDocRevisionType(val as RevisionType)}
                >
                  <SelectTrigger className="text-xs h-8 w-56 bg-white font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não" className="text-xs">
                      Não
                    </SelectItem>
                    <SelectItem value="Documento" className="text-xs">
                      Documento
                    </SelectItem>
                    <SelectItem value="Procedimento" className="text-xs">
                      Procedimento
                    </SelectItem>
                    <SelectItem value="Instrução de Trabalho" className="text-xs">
                      Instrução de Trabalho
                    </SelectItem>
                    <SelectItem value="Receita AOM" className="text-xs">
                      Receita AOM
                    </SelectItem>
                    <SelectItem value="Parâmetro Industrial" className="text-xs">
                      Parâmetro Industrial
                    </SelectItem>
                    <SelectItem value="Ficha Mestra" className="text-xs">
                      Ficha Mestra
                    </SelectItem>
                    <SelectItem value="Meta" className="text-xs">
                      Meta
                    </SelectItem>
                    <SelectItem value="Indicador" className="text-xs">
                      Indicador
                    </SelectItem>
                    <SelectItem value="Outro" className="text-xs">
                      Outro
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {docRevisionType !== 'Não' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Item a Revisar *
                      </Label>
                      <Input
                        value={revItem}
                        onChange={(e) => setRevItem(e.target.value)}
                        placeholder="Código ou nome do documento/meta"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Responsável *</Label>
                      <Input
                        value={revResp}
                        onChange={(e) => setRevResp(e.target.value)}
                        placeholder="Nome do responsável"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Prazo *</Label>
                      <Input
                        type="date"
                        value={revDeadline}
                        onChange={(e) => setRevDeadline(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Motivo da Revisão
                      </Label>
                      <Input
                        value={revReason}
                        onChange={(e) => setRevReason(e.target.value)}
                        placeholder="Justificativa da atualização"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">
                        Descrição das Alterações
                      </Label>
                      <Input
                        value={revDesc}
                        onChange={(e) => setRevDesc(e.target.value)}
                        placeholder="Resumo do que será modificado"
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => handleSubmit('Rascunho')}
            disabled={isSubmitting}
            className="text-xs"
          >
            Salvar como Rascunho
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleSubmit('Enviado para Aprovação Industrial')}
            disabled={isSubmitting}
            className="text-xs bg-[#004C97] hover:bg-[#003974] text-white"
          >
            {isSubmitting ? 'Gravando...' : 'Enviar p/ Aprovação Industrial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
