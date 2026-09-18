/**
 * MODAL DE INCLUSÃO DE PRODUTO NA PROGRAMAÇÃO SEMANAL (PCP ROBOTIZADO)
 * Atende integralmente às Partes 0, 2, 3, 4 e 5:
 * - Parte 0: Preservação de todos os comportamentos existentes (cálculo temporal, cadência estrita da Ficha Mestre)
 * - Parte 2: Bloco "Estoque & Carteira" imediato após seleção do produto SAP
 *   * Origem SAP / Integração existente (somente leitura)
 *   * Saldo Carteira = Carteira - Estoque ACAB + Estoque SEMI
 *   * Cobertura atual e Cobertura pós-programação
 *   * Situação da cobertura com TEXTO + Status ("Dentro da tolerância", etc.)
 *   * Tratamento de indisponibilidade com as 3 mensagens obrigatórias
 *   * Diferenciação visual entre digitado, SAP e calculado
 * - Parte 3: Seção "Matéria-Prima Programada"
 *   * Tipo de MP, Material MP, Quantidade MP, Rendimento Metálico Previsto (%)
 *   * Cálculo direto: Qtd MP = Prod Boa / Rendimento
 *   * Cálculo inverso: Prod Boa = Qtd MP * Rendimento
 *   * Saldo MP pós-programação = MP disponível - MP necessária com alerta claro de déficit
 * - Parte 4: Tipo de Enfornamento (Somente Laminação: L1 / L2 / LAMINAÇÃO)
 *   * Opções: Frio, Quente, Intercalado, Tapete, Normal
 *   * Busca produtividade ativa por linha + bitola + enfornamento + vigência
 * - Parte 5: Resumo de Impacto antes de salvar e persistência completa
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Package,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Search,
  Layers,
  Flame,
  Boxes,
  Database,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { DAYS_OF_WEEK, WeeklyScheduleItem, OfficialMaterialOption } from '@/types/weekly-schedule'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface RawMaterialRowItem {
  id: string
  mpType: string
  materialCode: string
  yieldPct: number
  quantityTons: number
}
import { LineOverviewData } from '@/types/line-master'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'
import {
  StockCarteiraEngine,
  MaterialStockAndCarteiraData,
  ValueWithAvailability,
} from '@/services/stock-carteira-engine'
import {
  MpProgrammingEngine,
  OfficialMpOption,
  OFFICIAL_MP_TYPES,
} from '@/services/mp-programming-engine'
import {
  EnfornamentoLaminacaoEngine,
  EnfornamentoType,
  ENFORNAMENTO_OPTIONS,
  EnfornamentoProductivityMatch,
} from '@/services/enfornamento-laminacao-engine'
import { sapMrpService } from '@/services/sap-mrp-service'
import { bottleneckMatrixService } from '@/services/bottleneck-rules-engine'
import { MatrixResolutionResult } from '@/types/sap-mrp'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (item: Partial<WeeklyScheduleItem>) => void
  lineCode: string
  lineOverview: LineOverviewData | null
  officialMaterials: OfficialMaterialOption[]
  existingItems?: WeeklyScheduleItem[]
  targetDay?: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  targetShiftCode?: string
  targetShiftName?: string
  targetCrewName?: string
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  lineCode,
  lineOverview,
  officialMaterials,
  existingItems = [],
  targetDay = 'SEG',
  targetShiftCode = 'T1_L1',
  targetShiftName = '1º Turno Matutino',
  targetCrewName = 'Turma A',
}) => {
  // Cascata: 1. Família -> 2. Produto
  const [selectedFamilyCode, setSelectedFamilyCode] = useState<string>('')
  const [selectedMaterial, setSelectedMaterial] = useState<OfficialMaterialOption | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // 3. Programar Por: Quantidade vs Horário
  const [programBy, setProgramBy] = useState<'QUANTITY' | 'TIME'>('QUANTITY')

  // Entradas de Programação
  const [quantityInput, setQuantityInput] = useState<string>('100')
  const [startTimeInput, setStartTimeInput] = useState<string>('06:00')
  const [endTimeInput, setEndTimeInput] = useState<string>('14:20')

  // Dia, Turno e Metadados
  const [selectedDay, setSelectedDay] = useState<
    'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
  >(targetDay)
  const [selectedShift, setSelectedShift] = useState<string>(targetShiftCode)
  const [productionOrder, setProductionOrder] = useState('')
  const [salesOrderMto, setSalesOrderMto] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [orderType, setOrderType] = useState<'MTS' | 'MTO' | 'INDUSTRIALIZACAO'>('MTS')
  const [pcpNotes, setPcpNotes] = useState('')

  // PARTE 2: ESTOQUE & CARTEIRA & PROGRAMADO
  const [stockCarteiraData, setStockCarteiraData] = useState<MaterialStockAndCarteiraData | null>(
    null,
  )
  const [loadingStockCarteira, setLoadingStockCarteira] = useState<boolean>(false)
  const [isExistingScheduleModalOpen, setIsExistingScheduleModalOpen] = useState<boolean>(false)

  // Resolução Automática da Matriz de Gargalos por Planejador MRP (MARC-DISPO)
  const [matrixResolution, setMatrixResolution] = useState<MatrixResolutionResult | null>(null)
  const [loadingMatrixRes, setLoadingMatrixRes] = useState<boolean>(false)

  // PARTE 4: ENFORNAMENTO (SOMENTE LAMINAÇÃO)
  const isLaminacao = useMemo(() => {
    const code = (lineCode || '').trim().toUpperCase()
    const desc = (lineOverview?.master?.description || '').toUpperCase()
    return code === 'L1' || code === 'L2' || code.includes('LAM') || desc.includes('LAMINA')
  }, [lineCode, lineOverview])

  const [enfornamentoType, setEnfornamentoType] = useState<EnfornamentoType>('NORMAL')
  const [productivityMatch, setProductivityMatch] = useState<EnfornamentoProductivityMatch | null>(
    null,
  )

  // PARTE 4 (antiga 3): MATÉRIA-PRIMA PROGRAMADA (MULTI-MP)
  const [mpOptions, setMpOptions] = useState<OfficialMpOption[]>([])
  const [rawMaterialRows, setRawMaterialRows] = useState<RawMaterialRowItem[]>([
    {
      id: 'mp-row-1',
      mpType: 'TARUGO 130x130',
      materialCode: '',
      yieldPct: 97.5,
      quantityTons: 102.56,
    },
  ])
  const [mpDirectionLock, setMpDirectionLock] = useState<'PROD_TO_MP' | 'MP_TO_PROD'>('PROD_TO_MP')

  // Sincroniza dias/turnos quando props mudarem
  useEffect(() => {
    if (isOpen) {
      setSelectedDay(targetDay)
      setSelectedShift(targetShiftCode)
    }
  }, [isOpen, targetDay, targetShiftCode])

  // Carrega opções de MP quando a linha mudar ou modal abrir
  useEffect(() => {
    if (isOpen) {
      MpProgrammingEngine.fetchOfficialMpOptions(lineCode, lineOverview).then((opts) => {
        setMpOptions(opts)
        if (opts.length > 0) {
          setRawMaterialRows((prev) => {
            if (prev.length === 0) {
              return [
                {
                  id: 'mp-row-1',
                  mpType: opts[0].mpType,
                  materialCode: opts[0].code,
                  yieldPct: opts[0].defaultYieldPct,
                  quantityTons: 102.56,
                },
              ]
            }
            // Preserva a MP já informada se houver código; senão inicializa com a padrão
            return prev.map((row, idx) => {
              if (idx === 0 && !row.materialCode) {
                return {
                  ...row,
                  materialCode: opts[0].code,
                  mpType: opts[0].mpType,
                  yieldPct: opts[0].defaultYieldPct,
                }
              }
              return row
            })
          })
        }
      })
    }
  }, [isOpen, lineCode, lineOverview])

  // 1. Extração de Famílias Únicas Homologadas para esta linha
  const homologatedFamilies = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>()
    officialMaterials.forEach((m) => {
      const code = m.family_code || 'GERAL'
      const name = m.family_name || 'Geral'
      const existing = map.get(code)
      if (existing) {
        existing.count += 1
      } else {
        map.set(code, { code, name, count: 1 })
      }
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [officialMaterials])

  // 2. Produtos filtrados estritamente pela família selecionada
  const materialsInSelectedFamily = useMemo(() => {
    if (!selectedFamilyCode) return []
    return officialMaterials.filter((m) => m.family_code === selectedFamilyCode)
  }, [officialMaterials, selectedFamilyCode])

  const filteredMaterials = useMemo(() => {
    const s = searchTerm.toLowerCase().trim()
    if (!s) return materialsInSelectedFamily
    return materialsInSelectedFamily.filter(
      (m) =>
        m.material_code.toLowerCase().includes(s) ||
        m.material_name.toLowerCase().includes(s) ||
        (m.dimension_spec && m.dimension_spec.toLowerCase().includes(s)) ||
        (m.steel_grade && m.steel_grade.toLowerCase().includes(s)),
    )
  }, [materialsInSelectedFamily, searchTerm])

  // PARTE 4: Busca de produtividade ativa com base no enfornamento
  useEffect(() => {
    if (isLaminacao && selectedMaterial) {
      EnfornamentoLaminacaoEngine.resolveActiveProductivity({
        lineCode,
        lineOverview,
        materialCode: selectedMaterial.material_code,
        gaugeDimension: selectedMaterial.dimension_spec,
        enfornamentoType,
        targetDate: new Date(),
      }).then((match) => {
        setProductivityMatch(match)
      })
    } else {
      setProductivityMatch(null)
    }
  }, [isLaminacao, selectedMaterial, enfornamentoType, lineCode, lineOverview])

  // 3. Cadência Oficial Ficha Mestra (com ajuste de enfornamento quando aplicável)
  const materialCadence = useMemo(() => {
    if (!selectedMaterial) return null
    if (isLaminacao && productivityMatch && productivityMatch.productivityTh > 0) {
      return productivityMatch.productivityTh
    }
    return WeeklyScheduleEngine.getProductivityForMaterialStrict(
      selectedMaterial.material_code,
      lineOverview,
    )
  }, [selectedMaterial, isLaminacao, productivityMatch, lineOverview])

  // 4. Executa cálculo temporal bidirecional através do motor central
  const calculationResult = useMemo(() => {
    if (!selectedMaterial || materialCadence === null || materialCadence <= 0) {
      return null
    }

    return WeeklyScheduleEngine.calculateBidirectionalSchedule({
      mode: programBy,
      cadenceTh: materialCadence,
      quantityTons: Number(quantityInput) || 0,
      startTime: startTimeInput,
      endTime: endTimeInput,
    })
  }, [selectedMaterial, materialCadence, programBy, quantityInput, startTimeInput, endTimeInput])

  // Consulta de Estoque e Carteira ao selecionar material ou alterar quantidade
  const plannedTonsNum = calculationResult?.quantityTons ?? (Number(quantityInput) || 0)

  useEffect(() => {
    if (selectedMaterial) {
      setLoadingStockCarteira(true)
      StockCarteiraEngine.fetchMaterialStockAndCarteira({
        materialCode: selectedMaterial.material_code,
        plannedTons: plannedTonsNum,
      })
        .then((data) => {
          setStockCarteiraData(data)
        })
        .finally(() => {
          setLoadingStockCarteira(false)
        })
    } else {
      setStockCarteiraData(null)
    }
  }, [selectedMaterial?.material_code, plannedTonsNum])

  // Resolução Automática da Matriz de Gargalos vinculada ao MARC-DISPO (Itens 9, 10, 11)
  useEffect(() => {
    if (selectedMaterial) {
      setLoadingMatrixRes(true)
      const matWerks = selectedMaterial.werks || '1001'
      const dispoCode = selectedMaterial.marc_dispo || selectedMaterial.mrp_controller_code || ''

      bottleneckMatrixService
        .listMatrices(lineCode)
        .then((matrices) => {
          const res = sapMrpService.resolveMatrixByMrpController(matrices, {
            werks: matWerks,
            line_code: lineCode,
            mrp_controller_code: dispoCode,
            material_code: selectedMaterial.material_code,
            material_description: selectedMaterial.material_name,
            company_code: 'CIAFAL',
          })
          setMatrixResolution(res)
        })
        .catch((err) => {
          console.warn('Erro ao resolver matriz de gargalos:', err)
          setMatrixResolution(null)
        })
        .finally(() => {
          setLoadingMatrixRes(false)
        })
    } else {
      setMatrixResolution(null)
    }
  }, [selectedMaterial, lineCode])

  // Produção planejada atual numérica
  const plannedGoodProduction = useMemo(() => {
    return calculationResult?.quantityTons ?? (Number(quantityInput) || 0)
  }, [calculationResult?.quantityTons, quantityInput])

  // Rendimento efetivo principal para cálculo da necessidade única
  const effectiveYieldPct = useMemo(() => {
    const r1 = rawMaterialRows[0]
    return r1 && Number(r1.yieldPct) > 0 ? Number(r1.yieldPct) : 90
  }, [rawMaterialRows])

  // Multi-MP: Sincroniza Quantidade de MP a partir da Produção Boa (Cálculo Direto canônico)
  // Quando em PROD_TO_MP e há apenas 1 linha de MP, ela recebe 100% da necessidade calculada
  // Se houver múltiplas linhas de MP, não sobrescreve as repartições manuais do usuário automaticamente
  useEffect(() => {
    if (mpDirectionLock === 'PROD_TO_MP') {
      const goodProd = plannedGoodProduction
      if (goodProd > 0) {
        setRawMaterialRows((prev) => {
          if (prev.length <= 1) {
            const y = prev[0]?.yieldPct || 90
            const calculatedMp = MpProgrammingEngine.calculateCanonicalMpRequired(goodProd, y)
            return [
              {
                ...prev[0],
                quantityTons: calculatedMp,
              },
            ]
          }
          return prev
        })
      }
    }
  }, [plannedGoodProduction, mpDirectionLock])

  // Ações de Linha de MP (Adicionar / Remover / Alterar)
  // REGRA BLOCO B: "+ Adicionar MP" cria linha LIMPA (sem copiar material anterior)
  const handleAddMpRow = () => {
    const newRow: RawMaterialRowItem = {
      id: `mp-row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      mpType: 'TARUGO 130x130',
      materialCode: '', // LIMPO! Não copia material anterior
      yieldPct: 90,
      quantityTons: 0,
    }
    setRawMaterialRows((prev) => [...prev, newRow])
  }

  const handleRemoveMpRow = (rowId: string) => {
    setRawMaterialRows((prev) => {
      if (prev.length <= 1) return prev // Mantém no mínimo 1 linha
      return prev.filter((r) => r.id !== rowId)
    })
  }

  const handleUpdateMpRow = (rowId: string, field: keyof RawMaterialRowItem, value: any) => {
    setRawMaterialRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r
        const updated = { ...r, [field]: value }

        if (field === 'materialCode') {
          const opt = mpOptions.find((o) => o.code === value)
          if (opt) {
            updated.mpType = opt.mpType
            updated.yieldPct = opt.defaultYieldPct
          }
        }

        // Se alterou rendimento da linha 1 ou única e está em PROD_TO_MP, recalcula MP imediatamente
        if (field === 'yieldPct' && prev.length === 1 && mpDirectionLock === 'PROD_TO_MP') {
          const newYield = Number(value) || 0
          if (newYield > 0 && plannedGoodProduction > 0) {
            updated.quantityTons = MpProgrammingEngine.calculateCanonicalMpRequired(
              plannedGoodProduction,
              newYield,
            )
          }
        }

        // Se alterou quantidade da MP manualmente (Cálculo Inverso)
        if (field === 'quantityTons') {
          setMpDirectionLock('MP_TO_PROD')
        }

        return updated
      }),
    )
  }

  // Totais consolidados de MP
  const totalMpQuantity = useMemo(() => {
    return Number(
      rawMaterialRows.reduce((acc, r) => acc + (Number(r.quantityTons) || 0), 0).toFixed(2),
    )
  }, [rawMaterialRows])

  const weightedYieldPct = useMemo(() => {
    if (totalMpQuantity <= 0) return rawMaterialRows[0]?.yieldPct || 90
    const weighted = rawMaterialRows.reduce(
      (acc, r) => acc + (Number(r.yieldPct) || 90) * (Number(r.quantityTons) || 0),
      0,
    )
    return Number((weighted / totalMpQuantity).toFixed(2))
  }, [rawMaterialRows, totalMpQuantity])

  // Registro principal da 1ª MP para retrocompatibilidade
  const primaryMpRow = rawMaterialRows[0] || {
    id: 'mp-1',
    mpType: 'TARUGO 130x130',
    materialCode: '',
    yieldPct: 90,
    quantityTons: 0,
  }

  const currentMpRecord = useMemo(() => {
    return mpOptions.find((o) => o.code === primaryMpRow.materialCode) || mpOptions[0] || null
  }, [mpOptions, primaryMpRow.materialCode])

  // Dicionários para o motor de disponibilidade por MP individual
  const pcpCommittedOtherByMp = useMemo(() => {
    const map: Record<string, number> = {}
    existingItems.forEach((it) => {
      if (it.raw_material_rows) {
        it.raw_material_rows.forEach((r) => {
          const k = (r.materialCode || '').toUpperCase().trim()
          if (k) {
            map[k] = (map[k] || 0) + (Number(r.quantityTons) || 0)
          }
        })
      } else if (it.raw_material_material_code) {
        const k = it.raw_material_material_code.toUpperCase().trim()
        map[k] = (map[k] || 0) + (Number(it.raw_material_planned_tons) || 0)
      }
    })
    return map
  }, [existingItems])

  // AVALIAÇÃO DE CONTROLE EM TEMPO REAL DE MATÉRIA-PRIMA (BLOCO A + B)
  const mpControlEvaluation = useMemo(() => {
    return MpProgrammingEngine.evaluateScheduleMpControl({
      plannedProductionTons: plannedGoodProduction,
      yieldPct: effectiveYieldPct,
      rawMaterialRows: rawMaterialRows.map((r) => ({
        id: r.id,
        mpType: r.mpType,
        materialCode: r.materialCode,
        yieldPct: Number(r.yieldPct) || 90,
        quantityTons: Number(r.quantityTons) || 0,
      })),
      productionDate: new Date(),
      realStockByMp: {}, // Sem integração direta SAP na sessão: PROIBIDO inventar
      supplierReceiptsByMp: {},
      upstreamByMp: {},
      pcpCommittedOtherByMp,
    })
  }, [plannedGoodProduction, effectiveYieldPct, rawMaterialRows, pcpCommittedOtherByMp])

  // 5. Validação de Conflito e Sobreposição de Horários
  const overlapValidation = useMemo(() => {
    if (!calculationResult || !calculationResult.isValid) return { hasConflict: false }

    return WeeklyScheduleEngine.validateTimeOverlap({
      items: existingItems,
      dayOfWeek: selectedDay,
      shiftCode: selectedShift,
      startTime: calculationResult.startTime,
      endTime: calculationResult.endTime,
    })
  }, [calculationResult, existingItems, selectedDay, selectedShift])

  const handleApplyNextAvailableTime = () => {
    if (overlapValidation.nextAvailableStartTime) {
      setStartTimeInput(overlapValidation.nextAvailableStartTime)
    }
  }

  // Manipulador de Troca de Família
  const handleFamilyChange = (famCode: string) => {
    setSelectedFamilyCode(famCode)
    setSelectedMaterial(null)
    setSearchTerm('')
  }

  // Manipulador de Troca de Material
  const handleSelectMaterial = (mat: OfficialMaterialOption) => {
    setSelectedMaterial(mat)
    setMpDirectionLock('PROD_TO_MP')
    if (mat.default_order_type) {
      setOrderType(mat.default_order_type)
    }
  }

  // Helper visual para exibir campos de disponibilidade
  const renderFieldWithAvailability = (
    label: string,
    field: ValueWithAvailability<number> | undefined | null,
    unit: string,
    isCalculated = false,
    customBadge = 'Origem SAP',
  ) => {
    if (
      !field ||
      field.status !== 'AVAILABLE' ||
      field.value === null ||
      field.value === undefined
    ) {
      const msg = field?.statusMessage || 'Dado indisponível — aguardando integração SAP.'
      return (
        <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col justify-between min-h-[72px]">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium shrink-0">
              {customBadge}
            </span>
          </div>
          <p className="text-[10px] text-amber-700 italic mt-1 leading-snug line-clamp-2">{msg}</p>
        </div>
      )
    }

    return (
      <div
        className={`rounded p-2.5 border flex flex-col justify-between min-h-[72px] ${
          isCalculated
            ? 'bg-blue-50/60 border-blue-200 ring-1 ring-blue-300/30'
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{label}</span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
              isCalculated
                ? 'bg-blue-100 text-[#004C97] font-semibold'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isCalculated ? 'Calculado' : customBadge}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-mono text-base font-bold text-slate-900 truncate">
            {field.value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-slate-500 font-bold shrink-0">{unit}</span>
        </div>
      </div>
    )
  }

  // Confirmação com Validação e Persistência Completa (Parte 5)
  const handleConfirm = () => {
    if (!selectedMaterial) return
    if (!calculationResult || !calculationResult.isValid) return
    if (overlapValidation.hasConflict) return

    const shifts = lineOverview?.shifts || []
    const shiftObj = shifts.find((s) => s.code === selectedShift)

    // Formata o turno no padrão institucional CIAFAL T1 · Turma X
    const formattedShiftName = WeeklyScheduleEngine.formatShiftDisplay(
      shiftObj?.name || targetShiftName,
      selectedShift,
      targetCrewName,
    )

    // BLOCO B: Status do MP persistido no item salvo (não só toast — alertas NÃO podem desaparecer após salvar)
    const evaluatedStatus = mpControlEvaluation.status
    const evaluatedStatusLabel = mpControlEvaluation.statusLabel
    const deficitTons =
      mpControlEvaluation.differenceTons < 0 ? Math.abs(mpControlEvaluation.differenceTons) : 0

    onAdd({
      material_code: selectedMaterial.material_code,
      material_description: selectedMaterial.material_name,
      family_code: selectedFamilyCode || selectedMaterial.family_code,
      steel_grade: selectedMaterial.steel_grade || 'SAE 1020',
      dimensions: selectedMaterial.dimension_spec || '50x50 mm #2.00',
      day_of_week: selectedDay,
      shift_code: selectedShift,
      shift_name: formattedShiftName,
      crew_name: targetCrewName || 'Turma A',
      planned_quantity_tons: calculationResult.quantityTons,
      productivity_rate_th: calculationResult.cadenceTh,
      production_hours: calculationResult.durationHours,
      start_datetime: `${selectedDay} ${calculationResult.startTime}`,
      end_datetime: `${selectedDay} ${calculationResult.endTime}`,
      order_type: orderType,
      production_order: productionOrder.trim() || undefined,
      sales_order_mto: salesOrderMto.trim() || undefined,
      customer_name:
        customerName.trim() ||
        (orderType === 'MTO' ? 'Cliente Específico MTO' : 'Mercado Geral (MTS)'),
      pcp_notes: pcpNotes.trim() || undefined,
      item_type: 'PRODUCTION',
      status: 'DRAFT',
      sap_cycle_time_avg_min:
        stockCarteiraData?.tempoMedioCicloMin?.value ??
        selectedMaterial.sap_cycle_time_avg_min ??
        null,
      exception_approval_status: 'NONE',

      // PARTE 5: Persistência junto ao item programado
      estoque_referencia_consultado: stockCarteiraData?.estoqueAcab?.value ?? null,
      carteira_referencia: stockCarteiraData?.carteira?.value ?? null,
      cobertura_antes_dias: stockCarteiraData?.coverage?.currentCoverageDays ?? null,
      cobertura_depois_dias: stockCarteiraData?.coverage?.postCoverageDays ?? null,
      situacao_cobertura: stockCarteiraData?.coverage?.situationText || 'Indisponível para cálculo',

      raw_material_type: primaryMpRow.mpType,
      raw_material_material_code: primaryMpRow.materialCode,
      raw_material_planned_tons: totalMpQuantity,
      raw_material_yield_pct: weightedYieldPct,
      raw_material_available_tons: currentMpRecord?.stockAvailableTons ?? null,
      raw_material_status: evaluatedStatus,
      raw_material_status_label: evaluatedStatusLabel,
      raw_material_deficit_tons: deficitTons,
      raw_material_summary: {
        plannedProductionTons: mpControlEvaluation.plannedProductionTons,
        totalRequiredTons: mpControlEvaluation.totalRequiredTons,
        totalProgrammedMpTons: mpControlEvaluation.totalProgrammedMpTons,
        differenceTons: mpControlEvaluation.differenceTons,
        fulfillmentPct: mpControlEvaluation.fulfillmentPct,
        status: evaluatedStatus,
        statusLabel: evaluatedStatusLabel,
        alertMessage: mpControlEvaluation.alertMessage,
        isExcessBlocked: mpControlEvaluation.isExcessBlocked,
      },
      raw_material_rows: rawMaterialRows.map((r) => {
        const rowEval = mpControlEvaluation.rowsAvailability.find((row) => row.id === r.id)
        return {
          id: r.id,
          mpType: r.mpType,
          materialCode: r.materialCode,
          yieldPct: r.yieldPct,
          quantityTons: r.quantityTons,
          availableTons: rowEval?.totalStockTons ?? null,
          totalStockTons: rowEval?.totalStockTons ?? null,
          pcpProgrammedStockTons: rowEval?.pcpProgrammedStockTons ?? 0,
          supplierReceiptsTons: rowEval?.supplierReceiptsTons ?? 0,
          pcpUpstreamPlannedTons: rowEval?.pcpUpstreamPlannedTons ?? 0,
          finalBalanceTons: rowEval?.finalBalanceTons ?? null,
          status: rowEval?.status,
          statusLabel: rowEval?.statusLabel,
        }
      }),

      enfornamento_type: isLaminacao ? enfornamentoType : undefined,
      productivity_applied_source:
        isLaminacao && productivityMatch ? productivityMatch.notes : undefined,
      query_timestamp: stockCarteiraData?.calculationTimestamp || new Date().toISOString(),
    })

    // BLOCO C: Rastreabilidade de cada cálculo via pcpAuditService
    try {
      pcpAuditService
        .recordLog({
          action: 'Cálculo e Alocação de Matéria-Prima Programada',
          event_type: 'Cálculo',
          status: evaluatedStatus === 'ATENDIDO' ? 'Sucesso' : 'Alerta',
          module: 'Programação Semanal',
          screen: 'AddProductModal',
          company: 'CIAFAL',
          line: lineCode,
          center: 'Produção',
          entity: 'RAW_MATERIAL_PROGRAMMING',
          reason: evaluatedStatusLabel,
          justification: `Cálculo MP: Produção ${calculationResult.quantityTons} t / Rendimento ${effectiveYieldPct}% = Necessidade ${mpControlEvaluation.totalRequiredTons} t. Programado: ${totalMpQuantity} t. Status: ${evaluatedStatusLabel}.`,
          details: {
            productCode: selectedMaterial.material_code,
            plannedQuantityTons: calculationResult.quantityTons,
            yieldPct: effectiveYieldPct,
            requiredMpTons: mpControlEvaluation.totalRequiredTons,
            totalProgrammedMpTons: totalMpQuantity,
            differenceTons: mpControlEvaluation.differenceTons,
            fulfillmentPct: mpControlEvaluation.fulfillmentPct,
            status: evaluatedStatus,
            statusLabel: evaluatedStatusLabel,
            alertMessage: mpControlEvaluation.alertMessage,
            rawMaterialRows: rawMaterialRows.map((r) => {
              const rowEval = mpControlEvaluation.rowsAvailability.find((row) => row.id === r.id)
              return {
                mpType: r.mpType,
                materialCode: r.materialCode,
                quantityTons: r.quantityTons,
                yieldPct: r.yieldPct,
                totalStockDisplay: rowEval?.totalStockDisplay,
                finalBalanceDisplay: rowEval?.finalBalanceDisplay,
                statusLabel: rowEval?.statusLabel,
              }
            }),
            dataSource: 'Cálculo Canônico PCP Robotizado + Regras de Disponibilidade',
          },
        })
        .catch((err) => {
          console.warn('Registro de auditoria de MP:', err)
        })
    } catch {
      // Ignora erro assíncrono de auditoria para não travar UX
    }

    // Reset de estado
    setSelectedFamilyCode('')
    setSelectedMaterial(null)
    setQuantityInput('100')
    setStartTimeInput('06:00')
    setEndTimeInput('14:20')
    setRawMaterialRows([
      {
        id: 'mp-row-1',
        mpType: mpOptions[0]?.mpType || 'TARUGO 130x130',
        materialCode: mpOptions[0]?.code || '',
        yieldPct: mpOptions[0]?.defaultYieldPct || 97.5,
        quantityTons: 102.56,
      },
    ])
    setProductionOrder('')
    setSalesOrderMto('')
    setCustomerName('')
    setPcpNotes('')
    setStockCarteiraData(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white text-slate-900 border-slate-300 shadow-2xl p-0 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Cabeçalho CIAFAL Pantone 2945 */}
        <div className="bg-[#004C97] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                Programar Produção — Linha {lineCode}
              </DialogTitle>
              <p className="text-xs text-blue-100">
                Motor Temporal Bidirecional • Integração SAP Oficial • Validação MP & Enfornamento
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-xs font-mono">
            CIAFAL PCP • PRD
          </Badge>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* ETAPA 1: FAMÍLIA E PRODUTO SAP */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-4 h-4 text-[#004C97]" />
                1. Família e Produto SAP * (Ficha Mestre Linha {lineCode})
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {homologatedFamilies.length} família(s) homologada(s)
              </span>
            </div>

            <Select value={selectedFamilyCode} onValueChange={handleFamilyChange}>
              <SelectTrigger className="text-xs bg-white border-slate-300 h-10 font-medium text-slate-900">
                <SelectValue placeholder="Selecione primeiro a Família de Produto..." />
              </SelectTrigger>
              <SelectContent>
                {homologatedFamilies.map((fam) => (
                  <SelectItem key={fam.code} value={fam.code} className="text-xs">
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-bold text-slate-900">{fam.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({fam.code} • {fam.count} produto(s) homologado(s))
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SELEÇÃO DO PRODUTO (LIBERADO APENAS APÓS FAMÍLIA) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-[#004C97]" />
                  Produto / Material Oficial SAP *
                </label>
                {selectedFamilyCode ? (
                  <span className="text-[10px] text-slate-500 font-mono">
                    {filteredMaterials.length} produtos disponíveis
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Selecione uma família acima
                  </span>
                )}
              </div>

              {!selectedFamilyCode ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center bg-white text-slate-400 text-xs">
                  A lista de produtos fica liberada imediatamente após selecionar a Família de
                  Produto homologada.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <Input
                      placeholder="Filtrar por código SAP, bitola, aço ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 text-xs bg-white border-slate-300 h-9"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto border border-slate-200 rounded-lg p-1.5 bg-white">
                    {filteredMaterials.map((mat) => {
                      const isSelected = selectedMaterial?.material_code === mat.material_code
                      return (
                        <button
                          key={mat.material_code}
                          type="button"
                          onClick={() => handleSelectMaterial(mat)}
                          className={`text-left p-2.5 rounded-md border text-xs transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#004C97] bg-blue-50 ring-2 ring-blue-500/20 shadow-xs'
                              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="font-mono font-bold text-slate-900 block text-xs">
                                {mat.material_code}
                              </span>
                              <span className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 font-medium">
                                {mat.material_name}
                              </span>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-[#004C97] shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2 pt-1 border-t border-slate-200 text-[10px] text-slate-600">
                            <span className="font-mono font-bold text-slate-800">
                              {mat.dimension_spec || '--'}
                            </span>
                            <span>•</span>
                            <span className="font-mono font-bold text-[#004C97]">
                              {mat.productivity_th > 0
                                ? `${mat.productivity_th} t/h`
                                : 'Sem cadência'}
                            </span>
                            {mat.steel_grade && (
                              <>
                                <span>•</span>
                                <span className="bg-slate-200 px-1 rounded text-slate-800 font-mono">
                                  {mat.steel_grade}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ETAPA 2: ESTOQUE & CARTEIRA & PROGRAMADO — MATERIAL [PRODUTO] */}
          {selectedMaterial && (
            <div className="bg-white border-2 border-[#004C97]/30 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#004C97]" />
                  <span className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    2. ESTOQUE & CARTEIRA & PROGRAMADO — MATERIAL {selectedMaterial.material_code}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
                    Fonte Oficial SAP ZSD28C / PCP
                  </Badge>
                  {loadingStockCarteira && (
                    <span className="text-[10px] text-slate-500 animate-pulse">
                      Sincronizando...
                    </span>
                  )}
                </div>
              </div>

              {/* Resolução de Matriz de Gargalos por Planejador MRP (MARC-DISPO) - Itens 9, 10, 11 */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-[#004C97]" />
                    Matriz de Gargalos Associada (MARC-DISPO &bull; Planejador MRP)
                  </span>
                  {matrixResolution && (
                    <Badge
                      className={`text-[10px] font-bold ${
                        matrixResolution.status === 'VALID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : matrixResolution.status === 'NO_MRP_CONTROLLER'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {matrixResolution.status === 'VALID'
                        ? 'Matriz Válida Homologada'
                        : matrixResolution.status === 'NO_MRP_CONTROLLER'
                          ? 'Inconsistência de Dados Mestres'
                          : 'Matriz Não Homologada / Não Configurada'}
                    </Badge>
                  )}
                </div>

                {matrixResolution?.status === 'VALID' && matrixResolution.matched_matrix && (
                  <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded text-emerald-950 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">
                        Matriz:{' '}
                        <strong>
                          {matrixResolution.matched_matrix.matrix_name ||
                            matrixResolution.matched_matrix.gauge_dimension}
                        </strong>{' '}
                        (Rev.{matrixResolution.matched_matrix.version || 1})
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        Planejador MRP SAP:{' '}
                        <strong>
                          {matrixResolution.details?.mrp_controller_code}
                          {matrixResolution.details?.mrp_controller_description
                            ? ` — ${matrixResolution.details.mrp_controller_description}`
                            : ''}
                        </strong>{' '}
                        &bull; WERKS {matrixResolution.details?.werks || '1001'} &bull; Gargalo:{' '}
                        {matrixResolution.matched_matrix.primary_bottleneck_stage} (
                        {matrixResolution.matched_matrix.primary_bottleneck_rate_th ||
                          matrixResolution.matched_matrix.continuous_mill_capacity_th ||
                          24.8}{' '}
                        t/h)
                      </span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-bold">
                      Vigente
                    </Badge>
                  </div>
                )}

                {matrixResolution?.status === 'NO_MRP_CONTROLLER' && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-rose-950 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">
                        Material sem Planejador MRP definido no SAP.
                      </strong>
                      <p className="text-[11px] text-rose-800 mt-0.5">
                        O material {selectedMaterial.material_code} está sem o campo MARC-DISPO
                        preenchido no SAP. O PCP não cria classificações fictícias. Inconsistência
                        registrada para saneamento cadastral.
                      </p>
                    </div>
                  </div>
                )}

                {matrixResolution?.status === 'NOT_FOUND' && (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-950 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">
                          Matriz de Gargalos não configurada
                        </strong>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Material: {selectedMaterial.material_code} &bull; Centro SAP: WERKS{' '}
                          {matrixResolution.details?.werks || '1001'} &bull; Planejador MRP:{' '}
                          {matrixResolution.details?.mrp_controller_code || 'Não Definido'} &bull;
                          Linha: {lineCode}. Nenhuma matriz de gargalos vigente e homologada foi
                          encontrada.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guia de Legenda Visual Atualizada */}
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                <span className="font-bold text-slate-700">Legenda:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-white border border-slate-300" />
                  Origem SAP Oficial
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-100 border border-indigo-400" />
                  Origem PCP Robotizado
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-300" />
                  Calculado Automaticamente
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-400" />
                  Indisponível / Aguardando SAP
                </span>
              </div>

              {/* Alerta informativo não-bloqueante se já existir programação futura no PCP */}
              {stockCarteiraData?.programacaoExistente &&
                stockCarteiraData.programacaoExistente.totalPlannedTons > 0 && (
                  <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-lg flex items-center justify-between gap-3 text-xs text-indigo-950">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping shrink-0" />
                      <span>
                        Este material já possui{' '}
                        <strong className="font-mono text-indigo-900 font-bold">
                          {stockCarteiraData.programacaoExistente.totalPlannedTons.toLocaleString(
                            'pt-BR',
                            {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            },
                          )}{' '}
                          t
                        </strong>{' '}
                        programadas no PCP Robotizado.{' '}
                        {stockCarteiraData.programacaoExistente.nextPredictedDate && (
                          <span>
                            Próxima produção prevista para{' '}
                            <strong className="font-mono text-indigo-900 font-bold">
                              {stockCarteiraData.programacaoExistente.nextPredictedDate}
                            </strong>
                            .
                          </span>
                        )}
                      </span>
                    </div>
                    {stockCarteiraData.programacaoExistente.items.length > 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsExistingScheduleModalOpen(true)}
                        className="h-7 text-[10px] bg-white text-indigo-800 border-indigo-300 hover:bg-indigo-100 font-semibold shrink-0"
                      >
                        Ver programação existente (
                        {stockCarteiraData.programacaoExistente.items.length})
                      </Button>
                    )}
                  </div>
                )}

              {/* Grid 3 linhas × 4 colunas responsivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* LINHA 1: Estoque Acab / Estoque Semi / Estoque Qualidade / Estoque Bloqueado */}
                {/* L1.1 Estoque ACAB */}
                {renderFieldWithAvailability(
                  'Estoque Acabado',
                  stockCarteiraData?.estoqueAcab,
                  't',
                  false,
                  'Origem SAP',
                )}

                {/* L1.2 Estoque SEMI */}
                {renderFieldWithAvailability(
                  'Estoque Semi-Acab.',
                  stockCarteiraData?.estoqueSemi,
                  't',
                  false,
                  'Origem SAP',
                )}

                {/* L1.3 Estoque QUALIDADE (inventory_items.qty_in_quality) */}
                {renderFieldWithAvailability(
                  'Estoque Qualidade',
                  stockCarteiraData?.estoqueQualidade,
                  't',
                  false,
                  'Origem SAP',
                )}

                {/* L1.4 Estoque BLOQUEADO (inventory_items.qty_blocked) */}
                {renderFieldWithAvailability(
                  'Estoque Bloqueado',
                  stockCarteiraData?.estoqueBloqueado,
                  't',
                  false,
                  'Origem SAP',
                )}

                {/* LINHA 2: Carteira Total / Saldo Carteira / Média Diária Fat. / Tempo Médio Ciclo */}
                {/* L2.1 Carteira Total */}
                {renderFieldWithAvailability(
                  'Carteira Total',
                  stockCarteiraData?.carteira,
                  't',
                  false,
                  'Origem SAP',
                )}

                {/* L2.2 Saldo Carteira */}
                {renderFieldWithAvailability(
                  'Saldo Carteira',
                  stockCarteiraData?.saldoCarteira,
                  't',
                  true,
                  'Calculado',
                )}

                {/* L2.3 Média Diária Fat. */}
                {renderFieldWithAvailability(
                  'Média Diária Fat.',
                  stockCarteiraData?.mediaDiariaFaturamentoTDia,
                  't/dia',
                  false,
                  'Origem SAP',
                )}

                {/* L2.4 Tempo Médio Ciclo */}
                {renderFieldWithAvailability(
                  'Tempo Médio Ciclo',
                  stockCarteiraData?.tempoMedioCicloMin,
                  'min',
                  false,
                  'Origem SAP',
                )}

                {/* LINHA 3: Programação Existente / Cobertura Atual / Cobertura Pós-Prog. / Situação Cobertura */}
                {/* L3.1 Programação Existente */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-indigo-900 uppercase truncate">
                      Prog. Existente
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold shrink-0">
                      PCP Robotizado
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <div className="flex items-baseline gap-1 truncate">
                      <span className="font-mono text-base font-bold text-indigo-950">
                        {stockCarteiraData?.programacaoExistente
                          ? stockCarteiraData.programacaoExistente.totalPlannedTons.toLocaleString(
                              'pt-BR',
                              {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 3,
                              },
                            )
                          : '0,000'}
                      </span>
                      <span className="text-[10px] text-indigo-700 font-bold shrink-0">t</span>
                    </div>
                    {stockCarteiraData?.programacaoExistente &&
                      stockCarteiraData.programacaoExistente.items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsExistingScheduleModalOpen(true)}
                          className="text-[10px] text-indigo-700 underline font-medium hover:text-indigo-950 shrink-0"
                        >
                          Ver detalhes
                        </button>
                      )}
                  </div>
                  {stockCarteiraData?.programacaoExistente?.nextPredictedDate && (
                    <div className="text-[9px] text-indigo-700 font-mono mt-0.5 truncate">
                      Próx: {stockCarteiraData.programacaoExistente.nextPredictedDate}
                    </div>
                  )}
                </div>

                {/* L3.2 Cobertura Atual */}
                <div className="bg-blue-50/60 border border-blue-200 rounded p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                      Cobertura Atual
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-[#004C97] font-semibold shrink-0">
                      Calculado
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-base font-bold text-slate-900">
                      {stockCarteiraData?.coverage?.currentCoverageDays !== null &&
                      stockCarteiraData?.coverage?.currentCoverageDays !== undefined
                        ? stockCarteiraData.coverage.currentCoverageDays.toFixed(1)
                        : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">dias</span>
                  </div>
                </div>

                {/* L3.3 Cobertura Pós-Prog. */}
                <div className="bg-blue-50/60 border border-blue-200 rounded p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                      Cobertura Pós-Prog.
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-[#004C97] font-semibold shrink-0">
                      Calculado
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono text-base font-bold text-[#004C97]">
                      {stockCarteiraData?.coverage?.postCoverageDays !== null &&
                      stockCarteiraData?.coverage?.postCoverageDays !== undefined
                        ? stockCarteiraData.coverage.postCoverageDays.toFixed(1)
                        : '--'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">dias</span>
                  </div>
                </div>

                {/* L3.4 Situação Cobertura */}
                <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                      Situação Cobertura
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-medium shrink-0">
                      Faixa: 5-8 dias
                    </span>
                  </div>
                  <div className="mt-1">
                    <Badge
                      className={`text-[10px] font-bold px-2 py-0.5 truncate max-w-full ${
                        stockCarteiraData?.coverage?.situationStatus === 'WITHIN_TOLERANCE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : stockCarteiraData?.coverage?.situationStatus === 'BELOW_MIN'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : stockCarteiraData?.coverage?.situationStatus === 'ABOVE_MAX'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {stockCarteiraData?.coverage?.situationText || 'Indisponível para cálculo'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: PRODUTO PROGRAMADO (MOTOR TEMPORAL BIDIRECIONAL QUANTIDADE VS HORÁRIO) */}
          {/* ALERTA DE CADÊNCIA AUSENTE (REQUISITO 29) */}
          {selectedMaterial && (materialCadence === null || materialCadence <= 0) && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-800">Cadência não cadastrada na Ficha Mestre</p>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  Cadência não cadastrada para este material nesta linha. Atualize a Ficha Mestre
                  antes de concluir a programação.
                </p>
              </div>
            </div>
          )}

          {/* ALERTA DE CONFLITO DE HORÁRIO / SOBREPOSIÇÃO (BLOQUEANTE) */}
          {overlapValidation.hasConflict && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-800">Conflito de Horário Detectado</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed font-mono font-bold">
                    {overlapValidation.conflictMessage}
                  </p>
                  <p className="text-[10px] text-rose-600 mt-1">
                    Não é permitido sobrepor itens no mesmo dia e turno. Ajuste o horário ou use a
                    ação rápida abaixo.
                  </p>
                </div>
              </div>

              {overlapValidation.nextAvailableStartTime && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleApplyNextAvailableTime}
                  className="shrink-0 bg-white hover:bg-rose-100 text-rose-900 border-rose-300 text-xs font-bold h-8"
                >
                  Usar próximo horário ({overlapValidation.nextAvailableStartTime})
                </Button>
              )}
            </div>
          )}

          {selectedMaterial && materialCadence !== null && materialCadence > 0 && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calculator className="w-4 h-4 text-[#004C97]" />3 - Produto programado
                </label>
                <div className="inline-flex rounded-lg border border-blue-300 bg-white p-0.5 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setProgramBy('QUANTITY')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      programBy === 'QUANTITY'
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Quantidade (t &rarr; Tempo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgramBy('TIME')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      programBy === 'TIME'
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Horário (Tempo &rarr; t)
                  </button>
                </div>
              </div>

              {/* OPÇÃO A: PROGRAMAR POR QUANTIDADE */}
              {programBy === 'QUANTITY' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-blue-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Informado pelo PCP:
                    </span>
                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Quantidade Programada (t) *
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={quantityInput}
                          onChange={(e) => setQuantityInput(e.target.value)}
                          className="font-mono text-sm font-bold bg-slate-50 border-blue-300 h-9 pr-10 text-slate-900"
                        />
                        <span className="absolute right-3 top-2 font-bold text-xs text-[#004C97]">
                          t
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Hora Inicial (HH:mm) *
                      </label>
                      <Input
                        type="time"
                        value={startTimeInput}
                        onChange={(e) => setStartTimeInput(e.target.value)}
                        className="font-mono text-sm bg-slate-50 border-blue-300 h-9 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* RESULTADOS CALCULADOS */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-1 font-bold text-[#004C97]">
                        <Calculator className="w-3.5 h-3.5" />
                        Calculado Automaticamente
                      </span>
                      <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-mono">
                        Ficha Mestre: {materialCadence} t/h
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">Duração:</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {calculationResult?.durationFormatted || '0 min'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          ({calculationResult?.durationHours.toFixed(2)} h)
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">
                          Fim Previsto:
                        </span>
                        <span className="font-bold text-[#004C97] text-sm">
                          {calculationResult?.endTime || '--:--'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Início: {calculationResult?.startTime || '--:--'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1 italic leading-tight">
                      Fórmula: Duração = {quantityInput} t ÷ {materialCadence} t/h ={' '}
                      {calculationResult?.durationFormatted}
                    </p>
                  </div>
                </div>
              )}

              {/* OPÇÃO B: PROGRAMAR POR HORÁRIO */}
              {programBy === 'TIME' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="space-y-3 bg-white p-3.5 rounded-lg border border-blue-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                      Informado pelo PCP:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          Hora Inicial *
                        </label>
                        <Input
                          type="time"
                          value={startTimeInput}
                          onChange={(e) => setStartTimeInput(e.target.value)}
                          className="font-mono text-xs bg-slate-50 border-blue-300 h-9 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-800 block mb-1">
                          Hora Final *
                        </label>
                        <Input
                          type="time"
                          value={endTimeInput}
                          onChange={(e) => setEndTimeInput(e.target.value)}
                          className="font-mono text-xs bg-slate-50 border-blue-300 h-9 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* RESULTADOS CALCULADOS */}
                  <div className="bg-white p-3.5 rounded-lg border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-1 font-bold text-[#004C97]">
                        <Calculator className="w-3.5 h-3.5" />
                        Calculado Automaticamente
                      </span>
                      <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px] font-mono">
                        Ficha Mestre: {materialCadence} t/h
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">
                          Tempo Produtivo:
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {calculationResult?.durationFormatted || '0 min'}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          ({calculationResult?.durationHours.toFixed(2)} h)
                        </span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-sans">
                          Quantidade Prevista:
                        </span>
                        <span className="font-bold text-emerald-800 text-sm">
                          {calculationResult?.quantityTons.toLocaleString('pt-BR')} t
                        </span>
                        <span className="text-[10px] text-slate-400 block font-sans">
                          Cadência: {materialCadence} t/h
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 mt-1 italic leading-tight">
                      Fórmula: Quantidade = {calculationResult?.durationHours.toFixed(2)} h ×{' '}
                      {materialCadence} t/h = {calculationResult?.quantityTons} t
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 4: MATÉRIA-PRIMA PROGRAMADA (MULTI-MP) */}
          {selectedMaterial && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Boxes className="w-4 h-4 text-[#004C97]" />
                    4. Matéria-Prima Programada
                  </label>
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
                    {rawMaterialRows.length} MP(s)
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono hidden sm:inline-flex">
                    Cálculo Direto / Inverso
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddMpRow}
                    className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold h-8 flex items-center gap-1 px-3 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />+ Adicionar MP
                  </Button>
                </div>
              </div>

              {/* RESUMO DE CONTROLE EM TEMPO REAL (BLOCO B) */}
              <div
                className={`p-3 rounded-lg border text-xs space-y-2 transition-all ${
                  mpControlEvaluation.color === 'RED'
                    ? mpControlEvaluation.isExcessBlocked
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-900'
                    : mpControlEvaluation.color === 'YELLOW'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-black/10">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                    <ShieldCheck className="w-4 h-4" />
                    Resumo de Controle de Matéria-Prima
                  </div>
                  <Badge
                    className={`text-[10px] font-bold font-mono ${
                      mpControlEvaluation.color === 'RED'
                        ? 'bg-rose-600 text-white'
                        : mpControlEvaluation.color === 'YELLOW'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {mpControlEvaluation.statusLabel}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
                  <div className="bg-white/70 p-1.5 rounded border border-black/5">
                    <span className="text-[10px] text-slate-500 block">Produção Programada:</span>
                    <strong className="font-mono text-slate-900">
                      {mpControlEvaluation.plannedProductionTons.toFixed(2)} t
                    </strong>
                  </div>

                  <div className="bg-white/70 p-1.5 rounded border border-black/5">
                    <span className="text-[10px] text-slate-500 block">Necessidade Total:</span>
                    <strong className="font-mono text-[#004C97]">
                      {mpControlEvaluation.totalRequiredTons.toFixed(2)} t
                    </strong>
                    <span className="text-[9px] text-slate-400 block">
                      ({mpControlEvaluation.yieldPct}% rend.)
                    </span>
                  </div>

                  <div className="bg-white/70 p-1.5 rounded border border-black/5">
                    <span className="text-[10px] text-slate-500 block">MP Programada (Σ):</span>
                    <strong className="font-mono text-slate-900">
                      {mpControlEvaluation.totalProgrammedMpTons.toFixed(2)} t
                    </strong>
                  </div>

                  <div className="bg-white/70 p-1.5 rounded border border-black/5">
                    <span className="text-[10px] text-slate-500 block">Diferença:</span>
                    <strong
                      className={`font-mono ${
                        mpControlEvaluation.differenceTons > 0.01
                          ? 'text-rose-600'
                          : mpControlEvaluation.differenceTons < -0.01
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }`}
                    >
                      {mpControlEvaluation.differenceTons > 0 ? '+' : ''}
                      {mpControlEvaluation.differenceTons.toFixed(2)} t
                    </strong>
                  </div>

                  <div className="bg-white/70 p-1.5 rounded border border-black/5">
                    <span className="text-[10px] text-slate-500 block">Atendimento %:</span>
                    <strong className="font-mono text-slate-900">
                      {mpControlEvaluation.fulfillmentPct.toFixed(1)}%
                    </strong>
                  </div>

                  <div className="bg-white/70 p-1.5 rounded border border-black/5">
                    <span className="text-[10px] text-slate-500 block">Status:</span>
                    <strong className="text-[10px] uppercase font-bold truncate block">
                      {mpControlEvaluation.status}
                    </strong>
                  </div>
                </div>

                {/* Mensagem e Alertas em Tempo Real */}
                {mpControlEvaluation.alertMessage && (
                  <div
                    className={`p-2 rounded text-xs flex items-start gap-2 font-medium ${
                      mpControlEvaluation.isExcessBlocked
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : mpControlEvaluation.color === 'RED'
                          ? 'bg-rose-100/70 text-rose-950 border border-rose-200'
                          : 'bg-amber-100 text-amber-950 border border-amber-300'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block">{mpControlEvaluation.alertMessage}</strong>
                      {mpControlEvaluation.isExcessBlocked && (
                        <p className="text-[10px] text-rose-700 mt-0.5">
                          Ação bloqueada: Ajuste a quantidade das MPs programadas para não exceder a
                          necessidade líquida.
                        </p>
                      )}
                      {!mpControlEvaluation.isExcessBlocked &&
                        mpControlEvaluation.color !== 'GREEN' && (
                          <p className="text-[10px] text-slate-600 mt-0.5">
                            O PCP permite salvar esta programação com advertência de auditoria.
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>

              {/* LISTA MULTI-MP */}
              <div className="space-y-3">
                {rawMaterialRows.map((row, index) => {
                  const rowEval = mpControlEvaluation.rowsAvailability.find((r) => r.id === row.id)
                  const selectedMpOpt = mpOptions.find((o) => o.code === row.materialCode)

                  return (
                    <div
                      key={row.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-[#004C97] font-mono">
                            MP #{index + 1}
                          </span>
                          {rowEval && (
                            <Badge
                              className={`text-[9px] font-bold font-mono ${
                                rowEval.statusTrafficLight === 'GREEN'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : rowEval.statusTrafficLight === 'YELLOW'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {rowEval.statusLabel}
                            </Badge>
                          )}
                        </div>
                        {rawMaterialRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMpRow(row.id)}
                            className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1 font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remover
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* 1. Tipo de MP */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Tipo de MP *
                          </label>
                          <Select
                            value={row.mpType}
                            onValueChange={(val) => handleUpdateMpRow(row.id, 'mpType', val)}
                          >
                            <SelectTrigger className="text-xs bg-white border-slate-300 h-9 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {OFFICIAL_MP_TYPES.map((t) => (
                                <SelectItem key={t} value={t} className="text-xs">
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. Material MP (BLOCO B: reformatado linha 1 código destaque, linha 2 descrição menor ellipsis + tooltip) */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Material MP (SAP/Ficha Mestre) *
                          </label>
                          <Select
                            value={row.materialCode}
                            onValueChange={(code) =>
                              handleUpdateMpRow(row.id, 'materialCode', code)
                            }
                          >
                            <SelectTrigger className="text-xs bg-white border-slate-300 h-9 font-medium">
                              <SelectValue placeholder="Selecione MP...">
                                {selectedMpOpt ? (
                                  <div className="flex flex-col text-left truncate leading-tight">
                                    <span className="font-bold text-slate-900 text-xs font-mono">
                                      {selectedMpOpt.code}
                                    </span>
                                    <span
                                      className="text-[10px] text-slate-500 truncate"
                                      title={selectedMpOpt.description}
                                    >
                                      {selectedMpOpt.description}
                                    </span>
                                  </div>
                                ) : (
                                  'Selecione MP...'
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-w-md">
                              {mpOptions.map((o) => (
                                <SelectItem key={o.code} value={o.code} className="text-xs py-1.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex flex-col text-left max-w-[280px]">
                                        <span className="font-black text-slate-900 text-xs font-mono">
                                          {o.code}
                                        </span>
                                        <span className="text-[10px] text-slate-600 truncate">
                                          {o.description} ({o.supplierName || 'Padrão'})
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="bg-slate-900 text-white text-xs p-2 max-w-xs"
                                    >
                                      <p className="font-bold text-amber-300">{o.code}</p>
                                      <p>{o.description}</p>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        Fornecedor: {o.supplierName || 'Padrão'} • Rendimento:{' '}
                                        {o.defaultYieldPct}%
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Rendimento Metálico Previsto (%) */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Rendimento Previsto (%) *
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              min="50"
                              max="100"
                              value={row.yieldPct}
                              onChange={(e) => {
                                handleUpdateMpRow(row.id, 'yieldPct', Number(e.target.value) || 0)
                              }}
                              className="font-mono text-xs bg-white border-slate-300 h-9 pr-8"
                            />
                            <span className="absolute right-2.5 top-2 font-bold text-xs text-slate-500">
                              %
                            </span>
                          </div>
                        </div>

                        {/* 4. Quantidade MP */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 block mb-1">
                            Quantidade MP Programada (t) *
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.1"
                              value={row.quantityTons}
                              onChange={(e) =>
                                handleUpdateMpRow(row.id, 'quantityTons', e.target.value)
                              }
                              className="font-mono text-xs font-bold text-[#004C97] bg-white border-blue-300 h-9 pr-8"
                            />
                            <span className="absolute right-2.5 top-2 font-bold text-xs text-[#004C97]">
                              t
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* BLOCO INDIVIDUAL: DISPONIBILIDADE DA MP (BLOCO B - por linha individual) */}
                      <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                        <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <span>
                            Disponibilidade da MP ({row.materialCode || 'Material não selecionado'})
                          </span>
                          <span className="font-mono">
                            Status:{' '}
                            <strong
                              className={
                                rowEval?.statusTrafficLight === 'RED'
                                  ? 'text-rose-600'
                                  : rowEval?.statusTrafficLight === 'YELLOW'
                                    ? 'text-amber-600'
                                    : 'text-emerald-700'
                              }
                            >
                              {rowEval?.statusLabel || 'PENDENTE'}
                            </strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
                          <div>
                            <span className="text-slate-500 block">Estoque Total:</span>
                            <strong className="text-slate-800 font-mono">
                              {rowEval?.totalStockDisplay ||
                                MpProgrammingEngine.WAITING_SAP_WMS_MSG}
                            </strong>
                          </div>

                          <div>
                            <span className="text-slate-500 block">Estoque Programado PCP:</span>
                            <strong className="text-slate-800 font-mono">
                              {rowEval?.pcpProgrammedStockTons.toFixed(2)} t
                            </strong>
                          </div>

                          <div>
                            <span className="text-slate-500 block">Entradas Fornecedor:</span>
                            <strong className="text-slate-800 font-mono">
                              {rowEval?.supplierReceiptsDisplay ||
                                MpProgrammingEngine.WAITING_SAP_WMS_MSG}
                            </strong>
                            {rowEval?.supplierReceiptsDate && (
                              <span className="text-slate-400 block text-[9px]">
                                ({rowEval.supplierReceiptsDate})
                              </span>
                            )}
                          </div>

                          <div>
                            <span className="text-slate-500 block">Produção PCP Prevista:</span>
                            <strong className="text-slate-800 font-mono">
                              {rowEval?.pcpUpstreamPlannedTons.toFixed(2)} t
                            </strong>
                            {rowEval?.pcpUpstreamPlannedDate && (
                              <span className="text-slate-400 block text-[9px]">
                                ({rowEval.pcpUpstreamPlannedDate})
                              </span>
                            )}
                          </div>

                          <div className="bg-white p-1 rounded border border-slate-200">
                            <span className="text-slate-500 block">Saldo Final:</span>
                            <strong
                              className={`font-mono text-xs ${
                                rowEval?.finalBalanceTons !== null &&
                                rowEval?.finalBalanceTons !== undefined &&
                                rowEval.finalBalanceTons < 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {rowEval?.finalBalanceDisplay ||
                                MpProgrammingEngine.WAITING_SAP_WMS_MSG}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ETAPA 5: DIA, TURNO E METADADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                5. Dia da Semana *
              </label>
              <Select value={selectedDay} onValueChange={(v: any) => setSelectedDay(v)}>
                <SelectTrigger className="text-xs bg-slate-50 border-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.code} value={d.code} className="text-xs">
                      {d.label} ({d.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Turno de Produção *
              </label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="text-xs bg-slate-50 border-slate-300 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(lineOverview?.shifts || []).map((s) => (
                    <SelectItem key={s.code} value={s.code} className="text-xs">
                      {WeeklyScheduleEngine.formatShiftDisplay(s.name, s.code, targetCrewName)} (
                      {s.start_time} - {s.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ETAPA 6: CLASSIFICAÇÃO MTS / MTO & CAMPOS COMPLEMENTARES */}
          <div className="border-t border-slate-200 pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                6. Classificação da Demanda *
              </span>
              <div className="flex items-center gap-1.5">
                {(['MTS', 'MTO', 'INDUSTRIALIZACAO'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOrderType(type)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors ${
                      orderType === type
                        ? 'bg-[#004C97] text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">
                  Ordem de Produção (OP)
                </label>
                <Input
                  placeholder="Ex: OP-2026-8812"
                  value={productionOrder}
                  onChange={(e) => setProductionOrder(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8 font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Pedido SAP / MTO</label>
                <Input
                  placeholder="Ex: 4500981240"
                  value={salesOrderMto}
                  onChange={(e) => setSalesOrderMto(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-0.5">Cliente Destino</label>
                <Input
                  placeholder="Ex: Usiminas / Gerdau / Mercado"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="text-xs bg-slate-50 border-slate-300 h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-600 block mb-0.5">
                7. Observações do PCP / Instrução Operacional
              </label>
              <Textarea
                placeholder="Ex: Respeitar resfriamento prévio de tarugo; prioridade comercial contratual..."
                value={pcpNotes}
                onChange={(e) => setPcpNotes(e.target.value)}
                className="text-xs bg-slate-50 border-slate-300 h-14 resize-none"
              />
            </div>
          </div>

          {/* PARTE 8: RESUMO DE IMPACTO ANTES DE SALVAR (OBRIGATÓRIO) */}
          {selectedMaterial && calculationResult && calculationResult.isValid && (
            <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-100">
                    Resumo de Impacto da Programação
                  </span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Auditoria Automática Pré-Gravação
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Produto / Quantidade:</span>
                  <span className="font-bold text-white">
                    {selectedMaterial.material_code} ({calculationResult.quantityTons} t)
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Tempo Previsto:</span>
                  <span className="font-bold text-white">
                    {calculationResult.durationFormatted} ({calculationResult.startTime} -{' '}
                    {calculationResult.endTime})
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Linha / Data / Turno:</span>
                  <span className="font-bold text-white">
                    Linha {lineCode} • {selectedDay} • {selectedShift}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Turma Operacional:</span>
                  <span className="font-bold text-white">{targetCrewName || 'Turma A'}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Carteira / Estoque Atual:
                  </span>
                  <span className="font-bold text-white">
                    {stockCarteiraData?.carteira?.value !== null &&
                    stockCarteiraData?.carteira?.value !== undefined
                      ? `${stockCarteiraData.carteira.value} t`
                      : 'N/D'}{' '}
                    /{' '}
                    {stockCarteiraData?.estoqueAcab?.value !== null &&
                    stockCarteiraData?.estoqueAcab?.value !== undefined
                      ? `${stockCarteiraData.estoqueAcab.value} t`
                      : 'N/D'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">MP Necessária / Disp.:</span>
                  <span className="font-bold text-white">
                    {totalMpQuantity} t /{' '}
                    {currentMpRecord?.stockAvailableTons !== null &&
                    currentMpRecord?.stockAvailableTons !== undefined
                      ? `${currentMpRecord.stockAvailableTons} t`
                      : 'N/D'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">Rendimento Metálico:</span>
                  <span className="font-bold text-white">{weightedYieldPct}%</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Cobertura Antes &rarr; Depois:
                  </span>
                  <span className="font-bold text-blue-300">
                    {stockCarteiraData?.coverage?.currentCoverageDays ?? '--'}d &rarr;{' '}
                    {stockCarteiraData?.coverage?.postCoverageDays ?? '--'}d (
                    {stockCarteiraData?.coverage?.situationText || 'N/D'})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
          >
            Cancelar
          </Button>

          <Button
            onClick={handleConfirm}
            disabled={
              !selectedMaterial ||
              !calculationResult ||
              !calculationResult.isValid ||
              overlapValidation.hasConflict ||
              mpControlEvaluation.isExcessBlocked
            }
            title={
              mpControlEvaluation.isExcessBlocked
                ? 'Quantidade de matéria-prima programada acima da necessidade calculada. Reduza a quantidade das MPs para salvar.'
                : undefined
            }
            className={`${
              mpControlEvaluation.isExcessBlocked
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-[#004C97] hover:bg-[#003d7a] text-white shadow'
            } text-xs font-semibold flex items-center gap-1.5`}
          >
            <Plus className="w-4 h-4" />
            Adicionar à Programação &rarr;
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal Compacto Somente Leitura: Programação Existente */}
      {isExistingScheduleModalOpen && (
        <Dialog open={isExistingScheduleModalOpen} onOpenChange={setIsExistingScheduleModalOpen}>
          <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-300 shadow-2xl p-0 overflow-hidden">
            <div className="bg-[#004C97] px-5 py-3 text-white flex items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                  Programação Existente no PCP Robotizado
                </DialogTitle>
                <p className="text-[11px] text-blue-100 font-mono">
                  Material: {selectedMaterial?.material_code} — {selectedMaterial?.material_name}
                </p>
              </div>
              <Badge className="bg-white/20 text-white text-[10px] font-mono">
                Somente Leitura
              </Badge>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                <span>
                  Total já programado (versões vigentes):{' '}
                  <strong className="text-indigo-900 font-mono">
                    {stockCarteiraData?.programacaoExistente.totalPlannedTons.toLocaleString(
                      'pt-BR',
                      {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      },
                    )}{' '}
                    t
                  </strong>
                </span>
                <span>
                  Itens únicos:{' '}
                  <strong className="text-slate-900 font-mono">
                    {stockCarteiraData?.programacaoExistente.items.length || 0}
                  </strong>
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Data Prevista</th>
                      <th className="py-2 px-3">Linha</th>
                      <th className="py-2 px-3 text-right">Quantidade (t)</th>
                      <th className="py-2 px-3 text-center">Status</th>
                      <th className="py-2 px-3 text-center">Versão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stockCarteiraData?.programacaoExistente.items.map((item) => {
                      const displayDate = item.start_datetime
                        ? item.start_datetime.split(' ')[0]
                        : item.date_str || '--'
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono text-slate-800">{displayDate}</td>
                          <td className="py-2 px-3 font-bold text-slate-700">
                            Linha {item.line_code}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-indigo-950">
                            {item.planned_quantity_tons.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 3,
                            })}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono ${
                                item.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : item.status === 'APPROVED'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-600">
                            v{item.version}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsExistingScheduleModalOpen(false)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
