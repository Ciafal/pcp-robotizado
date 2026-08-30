import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sparkles,
  RefreshCw,
  Sliders,
  Mail,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  HelpCircle,
  Truck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Send,
  SlidersHorizontal,
  ChevronRight,
  Radio,
  FileText,
  Boxes,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import SuggestedNextStepsSection from '@/components/common/SuggestedNextStepsSection'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import { IndustrializerSimulationModal } from '@/components/mp-optimization/IndustrializerSimulationModal'
import { IndustrializerCommunicationModal } from '@/components/mp-optimization/IndustrializerCommunicationModal'
import { IndustrializerLegacyComparisonModal } from '@/components/mp-optimization/IndustrializerLegacyComparisonModal'
import { IndustrializerParametersModal } from '@/components/mp-optimization/IndustrializerParametersModal'
import { MPIndustrializerEngine } from '@/services/mp-industrializer-engine'
import { mpIndustrializerService } from '@/services/mp-industrializer-service'
import {
  MPIndustrializerContract,
  MPIndustrializerMatrixItem,
  MPIndustrializerInventoryItem,
  MPIndustrializerTransitItem,
  MPIndustrializerCommunication,
  MPIndustrializerAction,
  MPIndustrializerDimensionSummary,
  MPIndustrializerScheduleRow,
  CalculationExplainPayload,
  IndustrializerStatus,
} from '@/types/mp-optimization'

export const MPIndustrializerSubpage: React.FC = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Filtro de Cliente Industrializador (Arcelor inicial, arquitetura multi-cliente)
  const [selectedClient, setSelectedClient] = useState<string>('ARCELOR')
  const [activeTab, setActiveTab] = useState<'OPERACIONAL' | 'CRONOLOGICO' | 'ACOES' | 'HISTORICO'>(
    'OPERACIONAL',
  )

  // Modais
  const [explainPayload, setExplainPayload] = useState<CalculationExplainPayload | null>(null)
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [simulationModalOpen, setSimulationModalOpen] = useState(false)
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false)
  const [legacyModalOpen, setLegacyModalOpen] = useState(false)
  const [parametersModalOpen, setParametersModalOpen] = useState(false)

  // Estados de Dados da Entidade
  const [contracts, setContracts] = useState<MPIndustrializerContract[]>([])
  const [matrixItems, setMatrixItems] = useState<MPIndustrializerMatrixItem[]>([])
  const [inventoryItems, setInventoryItems] = useState<MPIndustrializerInventoryItem[]>([])
  const [transitItems, setTransitItems] = useState<MPIndustrializerTransitItem[]>([])
  const [actions, setActions] = useState<MPIndustrializerAction[]>([])
  const [communications, setCommunications] = useState<MPIndustrializerCommunication[]>([])

  // Mock seguro da Programação L1 Vigente vinculada ao industrializador Arcelor
  const [scheduleVersion] = useState('PROG-L1-2026-W09-v3.1')
  const [programmedOrders, setProgrammedOrders] = useState<
    Array<{
      date: string
      week: string
      order_number: string
      product_code: string
      product_name: string
      steel_grade: string
      meta_productivity_th: number
      programmed_quantity_tons: number
      billet_choice?: '130x130' | '150x150'
    }>
  >([
    {
      date: '2026-03-02',
      week: 'Semana 10',
      order_number: 'OF-88201',
      product_code: 'BAR-RED-3/8-ARC',
      product_name: 'Barra Redonda 3/8" Arcelor',
      steel_grade: '1020 AI',
      meta_productivity_th: 16.5, // <= 18 t/h -> 130x130 obrigatório
      programmed_quantity_tons: 320.0,
    },
    {
      date: '2026-03-03',
      week: 'Semana 10',
      order_number: 'OF-88202',
      product_code: 'BAR-RED-1/2-ARC',
      product_name: 'Barra Redonda 1/2" Arcelor',
      steel_grade: '1020 AI',
      meta_productivity_th: 21.0, // > 18 t/h -> aceita 130 ou 150
      programmed_quantity_tons: 450.0,
    },
    {
      date: '2026-03-04',
      week: 'Semana 10',
      order_number: 'OF-88203',
      product_code: 'BAR-CHATA-1X1/4',
      product_name: 'Barra Chata 1" x 1/4" Arcelor',
      steel_grade: '1020 AI',
      meta_productivity_th: 17.0, // <= 18 t/h -> 130x130 obrigatório
      programmed_quantity_tons: 380.0,
    },
    {
      date: '2026-03-05',
      week: 'Semana 10',
      order_number: 'OF-88204',
      product_code: 'CANTONEIRA-2X1/8',
      product_name: 'Cantoneira 2" x 1/8" Arcelor',
      steel_grade: '1020 AI',
      meta_productivity_th: 24.5, // > 18 t/h -> aceita 130 ou 150
      programmed_quantity_tons: 510.0,
    },
    {
      date: '2026-03-06',
      week: 'Semana 10',
      order_number: 'OF-88205',
      product_code: 'BAR-QUAD-5/8',
      product_name: 'Barra Quadrada 5/8" Arcelor',
      steel_grade: '1020 AI',
      meta_productivity_th: 19.5, // > 18 t/h -> aceita 130 ou 150
      programmed_quantity_tons: 420.0,
    },
    {
      date: '2026-03-09',
      week: 'Semana 11',
      order_number: 'OF-88206',
      product_code: 'BAR-RED-5/8-ARC',
      product_name: 'Barra Redonda 5/8" Arcelor',
      steel_grade: '1020 AI',
      meta_productivity_th: 22.0,
      programmed_quantity_tons: 600.0,
    },
  ])

  // Carregamento de dados do PocketBase
  const loadData = async () => {
    setLoading(true)
    try {
      const [ctr, mat, inv, trn, acts, comms] = await Promise.all([
        mpIndustrializerService.getContracts(selectedClient),
        mpIndustrializerService.getMatrixItems(selectedClient),
        mpIndustrializerService.getInventory(selectedClient),
        mpIndustrializerService.getTransitItems(selectedClient),
        mpIndustrializerService.getActions(selectedClient),
        mpIndustrializerService.getCommunications(selectedClient),
      ])

      setContracts(ctr)
      setMatrixItems(mat)
      setInventoryItems(inv)
      setTransitItems(trn)
      setActions(acts)
      setCommunications(comms)
    } catch (err) {
      console.warn('Erro ao carregar dados do industrializador:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedClient])

  // Contrato ativo e rendimento
  const activeContract = useMemo(() => {
    return (
      contracts.find((c) => c.status === 'ATIVO') || {
        id: 'ctr-arc-01',
        contract_code: 'CTR-ARC-L1-2026',
        client_code: 'ARCELOR',
        client_name: 'ArcelorMittal',
        line_code: 'L1',
        metallic_yield_rate: 0.93, // 93% contratual
        monthly_order_avg_tons: 6000,
        source_authority: 'Contrato Vigente CIAFAL-Arcelor 2026',
        technical_doc_ref: 'TB-002 Rev.05',
        version: 2,
        responsible_name: 'Engenharia de Processos',
        status: 'ATIVO' as const,
        schedule_check_routine_days: 'SEG_QUA_SEX',
      }
    )
  }, [contracts])

  // Estoque SAP consolidado por dimensão
  const stock130 = useMemo(() => {
    const inv = inventoryItems.find((i) => i.dimension_section === '130x130')
    if (inv) return inv
    return {
      id: 'inv-130',
      client_code: 'ARCELOR',
      center_code: 'CFPL',
      dimension_section: '130x130',
      steel_grade: '1020 AI',
      dp18_whole_tons: 580.0, // Tarugos inteiros
      dp07_cut_ready_tons: 145.0, // Tarugos cortados prontos
      dp20_ks_pointed_tons: 40.0, // Apontados KS
      awaiting_unloading_tons: 60.0, // Carretas na descarga
      in_transit_tons: 220.0,
      received_tons: 1420.0,
      remaining_to_receive_tons: 1580.0,
      total_physical_ciafal_tons: 825.0, // 580+145+40+60
      total_ciafal_plus_transit_tons: 1045.0,
      data_source_official: 'SAP ECC MB52 (Direto)',
    } as MPIndustrializerInventoryItem
  }, [inventoryItems])

  const stock150 = useMemo(() => {
    const inv = inventoryItems.find((i) => i.dimension_section === '150x150')
    if (inv) return inv
    return {
      id: 'inv-150',
      client_code: 'ARCELOR',
      center_code: 'CFPL',
      dimension_section: '150x150',
      steel_grade: '1020 AI',
      dp18_whole_tons: 320.0,
      dp07_cut_ready_tons: 90.0,
      dp20_ks_pointed_tons: 25.0,
      awaiting_unloading_tons: 45.0,
      in_transit_tons: 150.0,
      received_tons: 980.0,
      remaining_to_receive_tons: 2020.0,
      total_physical_ciafal_tons: 480.0, // 320+90+25+45
      total_ciafal_plus_transit_tons: 630.0,
      data_source_official: 'SAP ECC MB52 (Direto)',
    } as MPIndustrializerInventoryItem
  }, [inventoryItems])

  // Trânsito consolidado
  const activeTransits = useMemo(() => {
    if (transitItems.length > 0) return transitItems
    return [
      {
        id: 'trn-1',
        client_code: 'ARCELOR',
        supplier_mill: 'ArcelorMittal Tubarão/Juiz de Fora',
        steel_grade: '1020 AI',
        dimension_section: '130x130' as const,
        quantity_tons: 110.0,
        vehicle_plate: 'BRA-4E88',
        invoice_number: 'NF-984421',
        expected_arrival_date: '2026-03-03',
        status: 'EM_TRANSITO' as const,
        source_system: 'TMS' as const,
        driver_info: 'Carlos Eduardo',
      },
      {
        id: 'trn-2',
        client_code: 'ARCELOR',
        supplier_mill: 'ArcelorMittal Monlevade',
        steel_grade: '1020 AI',
        dimension_section: '130x130' as const,
        quantity_tons: 110.0,
        vehicle_plate: 'MGX-9012',
        invoice_number: 'NF-984488',
        expected_arrival_date: '2026-03-05',
        status: 'EM_TRANSITO' as const,
        source_system: 'INTEGRACAO_API' as const,
        driver_info: 'Roberto Dias',
      },
      {
        id: 'trn-3',
        client_code: 'ARCELOR',
        supplier_mill: 'ArcelorMittal Tubarão',
        steel_grade: '1020 AI',
        dimension_section: '150x150' as const,
        quantity_tons: 150.0,
        vehicle_plate: 'ESX-7711',
        invoice_number: 'NF-984502',
        expected_arrival_date: '2026-03-04',
        status: 'EM_TRANSITO' as const,
        source_system: 'TMS' as const,
        driver_info: 'Marcos Silveira',
      },
    ]
  }, [transitItems])

  // Projeção cronológica pelo motor
  const projectionResult = useMemo(() => {
    return MPIndustrializerEngine.projectChronologicalSchedule(
      programmedOrders,
      stock130.total_physical_ciafal_tons,
      stock150.total_physical_ciafal_tons,
      activeTransits as any,
      activeContract.metallic_yield_rate,
    )
  }, [programmedOrders, stock130, stock150, activeTransits, activeContract])

  // Resumos por dimensão (130x130 e 150x150)
  const sum130 = useMemo(() => {
    const consumptionTotal130 = projectionResult.rows
      .filter((r) => r.allocated_billet === '130x130')
      .reduce((sum, r) => sum + r.consumption_tons, 0)

    const consumptionWeek130 = projectionResult.rows
      .filter((r) => r.allocated_billet === '130x130' && r.week === 'Semana 10')
      .reduce((sum, r) => sum + r.consumption_tons, 0)

    return MPIndustrializerEngine.calculateDimensionSummary(
      '130x130',
      stock130,
      activeTransits as any,
      consumptionWeek130,
      consumptionTotal130,
      3000,
    )
  }, [stock130, activeTransits, projectionResult])

  const sum150 = useMemo(() => {
    const consumptionTotal150 = projectionResult.rows
      .filter((r) => r.allocated_billet === '150x150')
      .reduce((sum, r) => sum + r.consumption_tons, 0)

    const consumptionWeek150 = projectionResult.rows
      .filter((r) => r.allocated_billet === '150x150' && r.week === 'Semana 10')
      .reduce((sum, r) => sum + r.consumption_tons, 0)

    return MPIndustrializerEngine.calculateDimensionSummary(
      '150x150',
      stock150,
      activeTransits as any,
      consumptionWeek150,
      consumptionTotal150,
      3000,
    )
  }, [stock150, activeTransits, projectionResult])

  // Totais Físicos e Balanços
  const totalPhysicalTons =
    stock130.total_physical_ciafal_tons + stock150.total_physical_ciafal_tons
  const totalTransitTons = sum130.in_transit_tons + sum150.in_transit_tons
  const totalUnloadingTons = stock130.awaiting_unloading_tons + stock150.awaiting_unloading_tons
  const totalAvailableReadyTons = stock130.dp07_cut_ready_tons + stock150.dp07_cut_ready_tons
  const totalConsumptionTons = projectionResult.totalRequiredMpTons
  const totalProjectedBalance = totalPhysicalTons + totalTransitTons - totalConsumptionTons
  const totalNeedToReceiveTons = Math.max(0, totalConsumptionTons - totalPhysicalTons)

  // Status Geral do Semáforo
  const globalTrafficLight = MPIndustrializerEngine.calculateTrafficLight({
    projectedBalance: totalProjectedBalance,
    physicalBalance: totalPhysicalTons - totalConsumptionTons,
    hasRupture: Boolean(projectionResult.firstRupture),
    hasPendingTransit: totalTransitTons > 0,
    isDataConnected: true,
  })

  // Funções de Explicação
  const handleExplain = (
    type:
      | 'NECESSIDADE_TOTAL'
      | 'SALDO_PROJETADO'
      | 'COMPATIBILIDADE_TB002'
      | 'RENDIMENTO_CONTRATUAL'
      | 'DATA_RUPTURA',
    params: Record<string, any>,
  ) => {
    const exp = MPIndustrializerEngine.explainCellCalculation(type, params)
    setExplainPayload(exp)
    setExplainModalOpen(true)
  }

  // Frequência automática baseada no semáforo
  const currentCheckFrequency = useMemo(() => {
    if (globalTrafficLight === 'VERMELHO' || globalTrafficLight === 'LARANJA') {
      return 'Monitoramento Contínuo (Recálculo em Tempo Real por Eventos Críticos)'
    }
    if (globalTrafficLight === 'AMARELO') {
      return 'Diário (Recálculo a cada atualização de trânsito/ordens)'
    }
    return 'Segunda, Quarta e Sexta (Padrão Arcelor L1)'
  }, [globalTrafficLight])

  return (
    <MPModuleLayout
      activeTopic="materia-prima-industrializador"
      currentStep={9}
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Frequência do Semáforo */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[11px] text-slate-600 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span className="font-semibold text-slate-800">Frequência:</span>
            <span>{currentCheckFrequency}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setParametersModalOpen(true)}
            className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Shield className="w-3.5 h-3.5 text-[#004C97]" />
            Parâmetros Versionados
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLegacyModalOpen(true)}
            className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Auditoria Excel Legado
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulationModalOpen(true)}
            className="text-xs gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Simular Cenário (What-If)
          </Button>

          <Button
            size="sm"
            onClick={() => setCommunicationModalOpen(true)}
            className="text-xs gap-1.5 bg-[#004C97] hover:bg-[#003870] text-white font-semibold shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            Gerar Comunicado de MP
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner de Identidade Operacional e Filtros Superiores */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900">
                  Matéria-prima – Industrializador
                </h1>
                <Badge className="bg-[#004C97] text-white text-[10px]">
                  {activeContract.client_name} ({activeContract.client_code})
                </Badge>
                <Badge variant="outline" className="text-[10px] text-slate-600">
                  Linha Consumidora: {activeContract.line_code}
                </Badge>
                <Badge
                  className={`text-[10px] font-bold ${
                    globalTrafficLight === 'VERMELHO'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : globalTrafficLight === 'LARANJA'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : globalTrafficLight === 'AMARELO'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  Semáforo: {globalTrafficLight}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Contrato:{' '}
                <span className="font-semibold text-slate-700">
                  {activeContract.contract_code} (v{activeContract.version})
                </span>{' '}
                • Rendimento Metálico:{' '}
                <span className="font-semibold text-[#004C97]">
                  {(activeContract.metallic_yield_rate * 100).toFixed(1)}%
                </span>{' '}
                • Norma Técnica:{' '}
                <span className="font-semibold text-slate-700">
                  {activeContract.technical_doc_ref || 'TB-002'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Cliente:</span>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-8 text-xs w-44 bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARCELOR">ArcelorMittal (L1)</SelectItem>
                  <SelectItem value="GERDAU" disabled>
                    Gerdau Aços Especiais (Em breve)
                  </SelectItem>
                  <SelectItem value="APERAM" disabled>
                    Aperam Inox (Em breve)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-8 text-xs text-slate-600 gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
          </div>
        </div>

        {/* 22. CARDS NO TOPO — Painel Executivo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Card 1: Carteira Programada */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                Carteira Programada L1
              </span>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {projectionResult.totalProgrammedTons.toFixed(1)} t
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {programmedOrders.length} ordens de laminação
              </span>
            </CardContent>
          </Card>

          {/* Card 2: MP Física CIAFAL (DP18+DP07+DP20+Descarga) */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                MP Física na CIAFAL
              </span>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {totalPhysicalTons.toFixed(1)} t
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                DP18 + DP07 + DP20 + Descarga
              </span>
            </CardContent>
          </Card>

          {/* Card 3: MP em Trânsito */}
          <Card className="border-blue-200 bg-blue-50/40 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 block">
                MP em Trânsito
              </span>
              <span className="text-lg font-black text-[#004C97] mt-1 block">
                +{totalTransitTons.toFixed(1)} t
              </span>
              <span className="text-[10px] text-blue-600 font-mono">
                {activeTransits.length} veículos rastreados
              </span>
            </CardContent>
          </Card>

          {/* Card 4: MP Pronta p/ Produção (DP07) */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block">
                Pronta p/ Laminação (DP07)
              </span>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {totalAvailableReadyTons.toFixed(1)} t
              </span>
              <span className="text-[10px] text-slate-500">Tarugos cortados e liberados</span>
            </CardContent>
          </Card>

          {/* Card 5: Consumo do Horizonte */}
          <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                  Consumo Requerido
                </span>
                <button
                  onClick={() =>
                    handleExplain('RENDIMENTO_CONTRATUAL', {
                      programmedProduction: projectionResult.totalProgrammedTons,
                      yieldRate: activeContract.metallic_yield_rate,
                    })
                  }
                  className="text-slate-400 hover:text-[#004C97]"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-lg font-black text-slate-900 mt-1 block">
                {totalConsumptionTons.toFixed(1)} t
              </span>
              <span className="text-[10px] text-slate-500">
                Rendimento {(activeContract.metallic_yield_rate * 100).toFixed(0)}% aplicado
              </span>
            </CardContent>
          </Card>

          {/* Card 6: Saldo Projetado & Ruptura */}
          <Card
            className={`shadow-sm ${
              projectionResult.firstRupture
                ? 'border-rose-300 bg-rose-50/50'
                : 'border-emerald-200 bg-emerald-50/40'
            }`}
          >
            <CardContent className="p-3">
              <span
                className={`text-[10px] uppercase tracking-wider font-bold ${
                  projectionResult.firstRupture ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                Saldo Projetado
              </span>
              <span
                className={`text-lg font-black mt-1 block ${
                  totalProjectedBalance < 0 ? 'text-rose-700' : 'text-emerald-800'
                }`}
              >
                {totalProjectedBalance >= 0
                  ? `+${totalProjectedBalance.toFixed(1)}`
                  : totalProjectedBalance.toFixed(1)}{' '}
                t
              </span>
              <span className="text-[10px] font-semibold text-slate-700 block truncate">
                {projectionResult.firstRupture
                  ? `Ruptura: ${projectionResult.firstRupture.date}`
                  : '✅ Cobertura total atendida'}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de Ruptura / Parada de Linha (Quando aplicável) */}
        {projectionResult.firstRupture && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-950 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-rose-900">
                    PREVISÃO DE PARADA DE LINHA L1 POR FALTA DE MP
                  </span>
                  <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                    Déficit: {projectionResult.firstRupture.missing_tons.toFixed(1)} t
                  </Badge>
                </div>
                <p className="text-xs text-rose-800 mt-0.5">
                  Primeira data de ruptura: <strong>{projectionResult.firstRupture.date}</strong> •
                  Ordem: <strong>{projectionResult.firstRupture.order_number}</strong> (
                  {projectionResult.firstRupture.product_name}) • Tarugo em falta:{' '}
                  <strong>{projectionResult.firstRupture.missing_dimension}</strong> • Impacto
                  estimado: <strong>{projectionResult.firstRupture.line_impact_hours} horas</strong>{' '}
                  de produção paralisada.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setCommunicationModalOpen(true)}
                className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold gap-1"
              >
                <Mail className="w-3.5 h-3.5" />
                Alertar Comercial & Cliente
              </Button>
            </div>
          </div>
        )}

        {/* Navegação por Sub-Abas do Novo Tópico */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('OPERACIONAL')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'OPERACIONAL'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            1. Quadro Operacional Estoque × Consumo
          </button>
          <button
            onClick={() => setActiveTab('CRONOLOGICO')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'CRONOLOGICO'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            2. Projeção Cronológica Ordem a Ordem
          </button>
          <button
            onClick={() => setActiveTab('ACOES')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ACOES'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            3. Tratamento de Desvios & Ações Automáticas
          </button>
          <button
            onClick={() => setActiveTab('HISTORICO')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'HISTORICO'
                ? 'border-[#004C97] text-[#004C97]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            4. Histórico de Comunicados & Auditoria
          </button>
        </div>

        {/* TAB 1: OPERACIONAL (QUADRO ESTOQUE X CONSUMO E QUADRO SIMPLIFICADO) */}
        {activeTab === 'OPERACIONAL' && (
          <div className="space-y-4">
            {/* 24. QUADRO SIMPLIFICADO (Resumo Executivo do E-mail) */}
            <Card className="border-slate-200 bg-slate-50/70 shadow-sm">
              <CardHeader className="p-3.5 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#004C97]" />
                    Resumo Executivo (Acompanhamento Simplificado do E-mail Arcelor)
                  </CardTitle>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Atualizado via integração nativa SAP ECC & TMS
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-3.5 pt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Prep. KS (DP20)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {(stock130.dp20_ks_pointed_tons + stock150.dp20_ks_pointed_tons).toFixed(1)} t
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Estoque Pronto (DP07)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {(stock130.dp07_cut_ready_tons + stock150.dp07_cut_ready_tons).toFixed(1)} t
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Trânsito 130×130
                    </span>
                    <span className="font-mono font-bold text-[#004C97]">
                      {sum130.in_transit_tons.toFixed(1)} t
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Trânsito 150×150
                    </span>
                    <span className="font-mono font-bold text-[#004C97]">
                      {sum150.in_transit_tons.toFixed(1)} t
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Total MP (Fís+Trn)
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {(totalPhysicalTons + totalTransitTons).toFixed(1)} t
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Consumo L1
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {totalConsumptionTons.toFixed(1)} t
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">
                      Necessidade Envio
                    </span>
                    <span
                      className={`font-mono font-black ${
                        totalNeedToReceiveTons > 0 ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {totalNeedToReceiveTons.toFixed(1)} t
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 23. QUADRO "ESTOQUE E CONSUMO" COMPLETO */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Quadro de Estoque e Consumo por Seção Dimensional
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Separação obrigatória 130×130 e 150×150 conforme manual de homologação Arcelor
                    L1.
                  </p>
                </div>
                <Badge className="bg-[#004C97] text-white text-[10px]">
                  Unidade: Toneladas (t)
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <Table className="text-xs min-w-[1000px]">
                  <TableHeader className="bg-slate-100/80">
                    <TableRow>
                      <TableHead className="font-bold text-slate-800">Seção</TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        MP Fornecida
                      </TableHead>
                      <TableHead className="font-bold text-[#004C97] text-right">
                        Em Trânsito
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Recebido
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Recebido %
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        A Receber
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        DP18 (Inteiros)
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        DP07 (Cortados)
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        DP20 (KS)
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Descarga
                      </TableHead>
                      <TableHead className="font-bold text-slate-900 text-right bg-slate-200/50">
                        Estoque Físico
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Consumo Semana
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Nec. Semana
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Consumo Total
                      </TableHead>
                      <TableHead className="font-bold text-blue-900 text-right bg-blue-50">
                        Físico + Trânsito
                      </TableHead>
                      <TableHead className="font-bold text-slate-900 text-right">
                        Saldo Projetado
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Nec. Total
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[sum130, sum150].map((dim) => (
                      <TableRow key={dim.dimension} className="hover:bg-slate-50/80 font-mono">
                        <TableCell className="font-sans font-bold text-slate-900">
                          {dim.dimension === '130x130' ? 'Tarugo 130×130' : 'Tarugo 150×150'}
                        </TableCell>
                        <TableCell className="text-right">
                          {dim.supplied_monthly_target_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#004C97]">
                          +{dim.in_transit_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">{dim.received_tons.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{dim.received_pct.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          {dim.to_receive_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">{dim.dp18_tons.toFixed(1)}</TableCell>
                        <TableCell className="text-right text-emerald-700 font-semibold">
                          {dim.dp07_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">{dim.dp20_tons.toFixed(1)}</TableCell>
                        <TableCell className="text-right">
                          {dim.awaiting_unloading_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 bg-slate-100/50">
                          {dim.total_physical_ciafal_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {dim.programmed_consumption_week_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-800">
                          {dim.need_week_current_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {dim.programmed_consumption_total_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#004C97] bg-blue-50/60">
                          {dim.physical_plus_transit_tons.toFixed(1)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-black ${
                            dim.projected_balance_tons < 0 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {dim.projected_balance_tons >= 0
                            ? `+${dim.projected_balance_tons.toFixed(1)}`
                            : dim.projected_balance_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-800">
                          {dim.total_need_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-center font-sans">
                          <Badge
                            className={`text-[9px] ${
                              dim.status === 'VERMELHO'
                                ? 'bg-rose-100 text-rose-800'
                                : dim.status === 'LARANJA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : dim.status === 'AMARELO'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {dim.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Linha de Total Consolidado */}
                    <TableRow className="bg-slate-100 font-mono font-bold">
                      <TableCell className="font-sans text-slate-900 font-black">
                        TOTAL CONSOLIDADO
                      </TableCell>
                      <TableCell className="text-right">6.000,0</TableCell>
                      <TableCell className="text-right text-[#004C97]">
                        +{totalTransitTons.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(sum130.received_tons + sum150.received_tons).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(((sum130.received_tons + sum150.received_tons) / 6000) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {(sum130.to_receive_tons + sum150.to_receive_tons).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(stock130.dp18_whole_tons + stock150.dp18_whole_tons).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-700">
                        {(stock130.dp07_cut_ready_tons + stock150.dp07_cut_ready_tons).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(stock130.dp20_ks_pointed_tons + stock150.dp20_ks_pointed_tons).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">{totalUnloadingTons.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-slate-900 bg-slate-200">
                        {totalPhysicalTons.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(
                          sum130.programmed_consumption_week_tons +
                          sum150.programmed_consumption_week_tons
                        ).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {(sum130.need_week_current_tons + sum150.need_week_current_tons).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        {totalConsumptionTons.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-[#004C97] bg-blue-100">
                        {(totalPhysicalTons + totalTransitTons).toFixed(1)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-black ${
                          totalProjectedBalance < 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {totalProjectedBalance >= 0
                          ? `+${totalProjectedBalance.toFixed(1)}`
                          : totalProjectedBalance.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-amber-800">
                        {totalNeedToReceiveTons.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center font-sans">
                        <Badge className="bg-[#004C97] text-white text-[9px]">
                          {globalTrafficLight}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* 10. DETALHAMENTO DE MP EM TRÂNSITO & CARRETAS */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-100 text-[#004C97] flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      MP em Trânsito & Carretas em Rota / Portaria
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Rastreabilidade em tempo real com separação expressa do estoque físico.
                    </p>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] text-slate-600">
                  Total em Trânsito: {totalTransitTons.toFixed(1)} t
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Usina / Fornecedor</TableHead>
                      <TableHead className="font-bold text-slate-700">Dimensão</TableHead>
                      <TableHead className="font-bold text-slate-700 text-right">
                        Quantidade
                      </TableHead>
                      <TableHead className="font-bold text-slate-700">Veículo / Placa</TableHead>
                      <TableHead className="font-bold text-slate-700">Nota Fiscal</TableHead>
                      <TableHead className="font-bold text-slate-700">Previsão Chegada</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                      <TableHead className="font-bold text-slate-700">Origem do Dado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTransits.map((trn) => (
                      <TableRow key={trn.id} className="hover:bg-slate-50/80">
                        <TableCell className="font-semibold text-slate-900">
                          {trn.supplier_mill}
                        </TableCell>
                        <TableCell className="font-bold text-[#004C97]">
                          {trn.dimension_section}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-900">
                          {trn.quantity_tons.toFixed(1)} t
                        </TableCell>
                        <TableCell className="font-mono text-slate-700">
                          {trn.vehicle_plate || '—'}
                        </TableCell>
                        <TableCell className="font-mono text-slate-600">
                          {trn.invoice_number || '—'}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {trn.expected_arrival_date}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800 text-[10px] gap-1">
                            <Truck className="w-3 h-3" /> {trn.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-500 font-mono">
                          {trn.source_system}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CRONOLÓGICO (25. QUADRO DE ACOMPANHAMENTO DA PRODUÇÃO ORDEM A ORDEM) */}
        {activeTab === 'CRONOLOGICO' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#004C97]" />
                    Acompanhamento Cronológico da Programação L1 & Compatibilidade TB-002
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sequência oficial de ordens com rendimento de{' '}
                    {(activeContract.metallic_yield_rate * 100).toFixed(1)}% e alocação inteligente
                    de tarugos.
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="text-[10px] font-mono text-slate-700 bg-slate-50 self-start"
                >
                  Versão Programação: {scheduleVersion}
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <Table className="text-xs min-w-[950px]">
                  <TableHeader className="bg-slate-100">
                    <TableRow>
                      <TableHead className="font-bold text-slate-800">Data / Sem</TableHead>
                      <TableHead className="font-bold text-slate-800">Ordem</TableHead>
                      <TableHead className="font-bold text-slate-800">Produto Acabado</TableHead>
                      <TableHead className="font-bold text-slate-800 text-center">
                        Meta t/h
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Prog. (t)
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        MP Req. (t)
                      </TableHead>
                      <TableHead className="font-bold text-[#004C97]">Tarugo Alocado</TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Saldo Antes
                      </TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">Consumo</TableHead>
                      <TableHead className="font-bold text-slate-800 text-right">
                        Saldo Depois
                      </TableHead>
                      <TableHead className="font-bold text-slate-800">
                        Situação Operacional
                      </TableHead>
                      <TableHead className="font-bold text-slate-800">
                        Observação do Motor
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectionResult.rows.map((row, idx) => (
                      <TableRow
                        key={idx}
                        className={`hover:bg-slate-50/80 ${
                          row.is_rupture ? 'bg-rose-50/70 border-l-4 border-l-rose-600' : ''
                        }`}
                      >
                        <TableCell className="font-semibold text-slate-800">
                          <div>{row.date}</div>
                          <span className="text-[10px] text-slate-500 font-normal">{row.week}</span>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-slate-900">
                          {row.order_number}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          <div>{row.product_name}</div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {row.product_code}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.meta_productivity_th > 18.0
                                ? 'bg-blue-100 text-[#004C97]'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.meta_productivity_th.toFixed(1)} t/h
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-900">
                          {row.programmed_quantity_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[#004C97]">
                          {row.required_mp_tons.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge
                              className={`text-[10px] font-mono ${
                                row.allocated_billet === '150x150'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : 'bg-blue-100 text-[#004C97] border-blue-200'
                              }`}
                            >
                              {row.allocated_billet}
                            </Badge>
                            {row.authorized_alternative_billet && (
                              <button
                                onClick={() =>
                                  handleExplain('COMPATIBILIDADE_TB002', {
                                    metaTh: row.meta_productivity_th,
                                  })
                                }
                                title="Regra TB-002: Aceita 130 ou 150"
                                className="text-slate-400 hover:text-[#004C97]"
                              >
                                <HelpCircle className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {row.balance_before_tons.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-rose-700">
                          -{row.consumption_tons.toFixed(1)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-black ${
                            row.balance_after_tons < 0
                              ? 'text-rose-600 font-bold'
                              : 'text-emerald-700'
                          }`}
                        >
                          {row.balance_after_tons >= 0
                            ? `+${row.balance_after_tons.toFixed(1)}`
                            : row.balance_after_tons.toFixed(1)}
                        </TableCell>
                        <TableCell>
                          {row.operational_status === 'FALTA_DE_MP' ? (
                            <Badge className="bg-rose-600 text-white text-[9px] font-bold gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> FALTA DE MP
                            </Badge>
                          ) : row.operational_status === 'DEPENDENTE_TRANSITO' ? (
                            <Badge className="bg-amber-100 text-amber-800 text-[9px] gap-1">
                              <Truck className="w-3 h-3" /> Dep. Trânsito
                            </Badge>
                          ) : row.operational_status === 'ATENCAO' ? (
                            <Badge className="bg-yellow-100 text-yellow-800 text-[9px]">
                              Atenção
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[9px] gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Disponível Área
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          {row.observation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AÇÕES AUTOMÁTICAS E TRATAMENTO DE DESVIOS */}
        {activeTab === 'ACOES' && (
          <div className="space-y-4">
            {/* Seção Estruturada Corporativa de Próximos Passos & Plano de Ação */}
            <SuggestedNextStepsSection
              title="Próximos Passos Sugeridos & Ações Mitigadoras Arcelor"
              subtitle="Recomendações corporativas integradas entre Comercial, Torre de Controle PCP, KS Corte e Logística de Pátio."
            />

            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#004C97]" />
                    Tratamento de Desvios & Ações Mitigadoras de Ruptura
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Integração com CRM Comercial, Torre de Controle PCP, KS Corte e Logística de
                    Pátio.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    toast({
                      title: 'Ação manual criada',
                      description: 'Nova diretriz registrada na governança do PCP.',
                    })
                  }}
                  className="text-xs bg-[#004C97] text-white"
                >
                  Nova Ação
                </Button>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Código / Origem</TableHead>
                      <TableHead className="font-bold text-slate-700">Tipo de Ação</TableHead>
                      <TableHead className="font-bold text-slate-700">Título & Descrição</TableHead>
                      <TableHead className="font-bold text-slate-700">Responsável</TableHead>
                      <TableHead className="font-bold text-slate-700">Prazo Limite</TableHead>
                      <TableHead className="font-bold text-slate-700">Severidade</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                      <TableHead className="font-bold text-slate-700">Integrações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="hover:bg-slate-50">
                      <TableCell className="font-mono font-bold text-slate-900">
                        ACT-ARC-001
                        <div className="text-[10px] text-rose-600 font-semibold">
                          Gatilho: RUPTURA_MP
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-slate-300">
                          ANTECIPAR_RECEBIMENTO
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        <div>Solicitar antecipação de 150 t de tarugos 130x130 para 05/03</div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Evitar parada da ordem OF-88206 na L1.
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 font-semibold">
                        Comercial / Logística
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        03/03/2026 12:00
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-rose-100 text-rose-800 text-[10px]">CRÍTICO</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">
                          EM ANDAMENTO
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-[10px]">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                            CRM: OK
                          </Badge>
                          <Badge className="bg-purple-50 text-purple-700 border-purple-200">
                            Torre: OK
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>

                    <TableRow className="hover:bg-slate-50">
                      <TableCell className="font-mono font-bold text-slate-900">
                        ACT-ARC-002
                        <div className="text-[10px] text-blue-600 font-semibold">
                          Gatilho: PREPARACAO_KS
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] border-slate-300">
                          REVISAR_KS
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        <div>Priorizar corte de 145 t na KS para alimentação da ordem OF-88202</div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          Tarugos 150x150 no DP18 prontos para preparação.
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-700 font-semibold">
                        Supervisão KS / PCP
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        02/03/2026 18:00
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">ALTO</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                          CONCLUÍDO
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 text-slate-700 text-[10px]">KS: OK</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HISTÓRICO & KPIS DO PROCESSO */}
        {activeTab === 'HISTORICO' && (
          <div className="space-y-4">
            {/* 36. KPIS DO PROCESSO DE INDUSTRIALIZAÇÃO */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              <Card className="border-slate-200 bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Disponibilidade MP
                  </span>
                  <span className="text-base font-black text-emerald-800 mt-1 block">94.2%</span>
                  <span className="text-[10px] text-slate-500">Meta: &ge; 90.0%</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Atendimento Necessidade
                  </span>
                  <span className="text-base font-black text-slate-900 mt-1 block">96.8%</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    Conforme contrato
                  </span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Rupturas / Mês
                  </span>
                  <span className="text-base font-black text-emerald-800 mt-1 block">0 qtd</span>
                  <span className="text-[10px] text-slate-500">0 h perdidas</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Acurácia Projeção Ruptura
                  </span>
                  <span className="text-base font-black text-[#004C97] mt-1 block">98.2%</span>
                  <span className="text-[10px] text-blue-600 font-mono">Motor determinístico</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Lead Time Alerta
                  </span>
                  <span className="text-base font-black text-slate-900 mt-1 block">6.4 dias</span>
                  <span className="text-[10px] text-slate-500">Antecedência média</span>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardContent className="p-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">
                    Rupturas Evitadas
                  </span>
                  <span className="text-base font-black text-emerald-800 mt-1 block">92.0%</span>
                  <span className="text-[10px] text-emerald-700">Após alerta antecipado</span>
                </CardContent>
              </Card>
            </div>

            {/* Histórico de Comunicados Enviados */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#004C97]" />
                Histórico de Comunicados Eletrônicos Enviados & Registros em ATA
              </h4>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table className="text-xs">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700">Código</TableHead>
                      <TableHead className="font-bold text-slate-700">Assunto</TableHead>
                      <TableHead className="font-bold text-slate-700">Aprovador / Data</TableHead>
                      <TableHead className="font-bold text-slate-700">Destinatários</TableHead>
                      <TableHead className="font-bold text-slate-700">Versão Prog.</TableHead>
                      <TableHead className="font-bold text-slate-700">Status</TableHead>
                      <TableHead className="font-bold text-slate-700">Evidência ATA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communications.length > 0 ? (
                      communications.map((c) => (
                        <TableRow key={c.id || c.communication_code} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-bold text-slate-900">
                            {c.communication_code}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-900">
                            {c.subject}
                          </TableCell>
                          <TableCell className="text-slate-600 text-[11px]">
                            {c.approved_by_user || 'PCP Central'} •{' '}
                            {c.sent_at || c.created || '26/02/2026'}
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-600">
                            Comercial, PCP, Estoque, Indústria
                          </TableCell>
                          <TableCell className="font-mono text-slate-700">
                            {c.schedule_version_ref || scheduleVersion}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                              {c.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]">
                              ATA Semanal PCP
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="hover:bg-slate-50">
                        <TableCell className="font-mono font-bold text-slate-900">
                          COMM-ARC-892102
                        </TableCell>
                        <TableCell className="font-semibold text-slate-900">
                          Acompanhamento de tarugo Arcelor — Linha Leve L1 [W09-v2]
                        </TableCell>
                        <TableCell className="text-slate-600 text-[11px]">
                          PCP L1 • 25/02/2026 08:30
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-600">
                          Comercial, PCP, Estoque, Indústria
                        </TableCell>
                        <TableCell className="font-mono text-slate-700">
                          {scheduleVersion}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                            ENVIADO
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px]">
                            Anexado ATA Quarta
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Suporte */}
      {explainPayload && (
        <CalculationExplainerModal
          isOpen={explainModalOpen}
          onClose={() => setExplainModalOpen(false)}
          payload={explainPayload}
        />
      )}

      <IndustrializerSimulationModal
        open={simulationModalOpen}
        onOpenChange={setSimulationModalOpen}
        currentPhysicalTons={totalPhysicalTons}
        currentTransitTons={totalTransitTons}
        currentProgrammedTons={projectionResult.totalProgrammedTons}
        currentRuptureDate={projectionResult.firstRupture?.date}
        onApplyScenario={(name, params) => {
          toast({
            title: `Cenário "${name}" aplicado!`,
            description: `Rendimento: ${(params.metallicYield * 100).toFixed(1)}% | Trânsito adicional: +${(params.additionalTransit130 + params.additionalTransit150).toFixed(1)} t.`,
          })
        }}
      />

      <IndustrializerCommunicationModal
        open={communicationModalOpen}
        onOpenChange={setCommunicationModalOpen}
        clientName={activeContract.client_name}
        clientCode={activeContract.client_code}
        totalPhysicalTons={totalPhysicalTons}
        totalTransitTons={totalTransitTons}
        totalConsumptionTons={totalConsumptionTons}
        projectedBalanceTons={totalProjectedBalance}
        ruptureDate={projectionResult.firstRupture?.date}
        firstRuptureOrder={projectionResult.firstRupture?.order_number}
        firstRuptureMissingTons={projectionResult.firstRupture?.missing_tons}
        scheduleVersion={scheduleVersion}
        onSentSuccess={loadData}
      />

      <IndustrializerLegacyComparisonModal
        open={legacyModalOpen}
        onOpenChange={setLegacyModalOpen}
        summaries={[sum130, sum150]}
      />

      <IndustrializerParametersModal
        open={parametersModalOpen}
        onOpenChange={setParametersModalOpen}
        contracts={contracts}
        matrixItems={matrixItems}
        onRefresh={loadData}
      />
    </MPModuleLayout>
  )
}

export default MPIndustrializerSubpage
