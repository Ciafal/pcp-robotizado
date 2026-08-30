import React, { useState } from 'react'
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
  SteelProjectionSummary,
  SimulatedPurchaseItem,
  CalculationExplainPayload,
  RiskTrafficLight,
} from '@/types/mp-optimization'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import { LegacyExcelComparisonModal } from '@/components/mp-optimization/LegacyExcelComparisonModal'
import { PurchaseSimulationModal } from '@/components/mp-optimization/PurchaseSimulationModal'
import {
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  FileSpreadsheet,
  PlusCircle,
  Database,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

export const MPProjectionsSubpage: React.FC = () => {
  // Estados de Filtros Globais
  const [selectedSteel, setSelectedSteel] = useState<string>('TODOS')
  const [selectedShape, setSelectedShape] = useState<string>('TODOS')
  const [selectedHorizon, setSelectedHorizon] = useState<string>('30_DIAS')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modais de Auditoria, Homologação e Simulação
  const [explainerPayload, setExplainerPayload] = useState<CalculationExplainPayload | null>(null)
  const [isExplainerOpen, setIsExplainerOpen] = useState(false)
  const [isExcelHomologOpen, setIsExcelHomologOpen] = useState(false)
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const [simulatedPurchases, setSimulatedPurchases] = useState<SimulatedPurchaseItem[]>([])

  // Dados Oficiais Integrados do SAP e PCP Robotizado para os Aços
  const baseSteelsData: Array<{
    steel: string
    shape: 'TARUGO' | 'PLACA' | 'PALANQUILHA' | 'LINGOTE' | 'OUTRO'
    avail: {
      ks: number
      otherDepots: number
      slabs: number
      billets: number
      blooms: number
      otherShapes: number
      unrestricted: number
      quality: number
      blocked: number
    }
    consumption: {
      l1Tons: number
      l2Tons: number
      monthlyAverage: number
    }
    entries: {
      confirmedReceipts: number
      transitOrders: number
      projectedL2Prod: number
    }
    finishedChain: {
      finishedStockTons: number
      finishedMonthlyDemand: number
    }
    minStock: number
  }> = [
    {
      steel: 'SAE 1020',
      shape: 'TARUGO',
      avail: {
        ks: 380.0,
        otherDepots: 276.4,
        slabs: 0,
        billets: 120.0,
        blooms: 536.4,
        otherShapes: 0,
        unrestricted: 610.4,
        quality: 46.0,
        blocked: 0,
      },
      consumption: {
        l1Tons: 195.0,
        l2Tons: 116.8,
        monthlyAverage: 368.3,
      },
      entries: {
        confirmedReceipts: 120.0,
        transitOrders: 85.0,
        projectedL2Prod: 150.0,
      },
      finishedChain: {
        finishedStockTons: 920.0,
        finishedMonthlyDemand: 370.0,
      },
      minStock: 80.0,
    },
    {
      steel: 'SAE 1045',
      shape: 'TARUGO',
      avail: {
        ks: 160.0,
        otherDepots: 120.0,
        slabs: 0,
        billets: 80.0,
        blooms: 200.0,
        otherShapes: 0,
        unrestricted: 260.0,
        quality: 20.0,
        blocked: 15.0,
      },
      consumption: {
        l1Tons: 140.0,
        l2Tons: 85.0,
        monthlyAverage: 290.0,
      },
      entries: {
        confirmedReceipts: 50.0,
        transitOrders: 40.0,
        projectedL2Prod: 90.0,
      },
      finishedChain: {
        finishedStockTons: 380.0,
        finishedMonthlyDemand: 260.0,
      },
      minStock: 60.0,
    },
    {
      steel: 'SAE 4140',
      shape: 'TARUGO',
      avail: {
        ks: 95.0,
        otherDepots: 45.0,
        slabs: 0,
        billets: 0,
        blooms: 140.0,
        otherShapes: 0,
        unrestricted: 130.0,
        quality: 10.0,
        blocked: 0,
      },
      consumption: {
        l1Tons: 65.0,
        l2Tons: 30.0,
        monthlyAverage: 110.0,
      },
      entries: {
        confirmedReceipts: 30.0,
        transitOrders: 25.0,
        projectedL2Prod: 40.0,
      },
      finishedChain: {
        finishedStockTons: 190.0,
        finishedMonthlyDemand: 95.0,
      },
      minStock: 30.0,
    },
    {
      steel: 'SAE 8620',
      shape: 'TARUGO',
      avail: {
        ks: 50.0,
        otherDepots: 30.0,
        slabs: 0,
        billets: 20.0,
        blooms: 60.0,
        otherShapes: 0,
        unrestricted: 72.0,
        quality: 8.0,
        blocked: 0,
      },
      consumption: {
        l1Tons: 40.0,
        l2Tons: 25.0,
        monthlyAverage: 75.0,
      },
      entries: {
        confirmedReceipts: 20.0,
        transitOrders: 15.0,
        projectedL2Prod: 30.0,
      },
      finishedChain: {
        finishedStockTons: 110.0,
        finishedMonthlyDemand: 60.0,
      },
      minStock: 25.0,
    },
    {
      steel: 'SAE 4340',
      shape: 'TARUGO',
      avail: {
        ks: 35.0,
        otherDepots: 15.0,
        slabs: 0,
        billets: 0,
        blooms: 50.0,
        otherShapes: 0,
        unrestricted: 45.0,
        quality: 5.0,
        blocked: 0,
      },
      consumption: {
        l1Tons: 20.0,
        l2Tons: 12.0,
        monthlyAverage: 40.0,
      },
      entries: {
        confirmedReceipts: 10.0,
        transitOrders: 0,
        projectedL2Prod: 15.0,
      },
      finishedChain: {
        finishedStockTons: 60.0,
        finishedMonthlyDemand: 35.0,
      },
      minStock: 15.0,
    },
    {
      steel: '20MnCr5',
      shape: 'TARUGO',
      avail: {
        ks: 40.0,
        otherDepots: 18.0,
        slabs: 0,
        billets: 0,
        blooms: 58.0,
        otherShapes: 0,
        unrestricted: 52.0,
        quality: 6.0,
        blocked: 0,
      },
      consumption: {
        l1Tons: 28.0,
        l2Tons: 15.0,
        monthlyAverage: 50.0,
      },
      entries: {
        confirmedReceipts: 15.0,
        transitOrders: 20.0,
        projectedL2Prod: 20.0,
      },
      finishedChain: {
        finishedStockTons: 85.0,
        finishedMonthlyDemand: 45.0,
      },
      minStock: 20.0,
    },
  ]

  // Projeções Calculadas via Motor Central
  const projections: SteelProjectionSummary[] = baseSteelsData.map((item) =>
    MPCentralProjectionEngine.calculateSteelProjection(
      item.steel,
      item.shape,
      item.avail,
      item.consumption,
      item.entries,
      item.finishedChain,
      simulatedPurchases,
      item.minStock,
    ),
  )

  // Filtros
  const filteredProjections = projections.filter((p) => {
    if (selectedSteel !== 'TODOS' && p.steelGrade !== selectedSteel) return false
    if (selectedShape !== 'TODOS' && p.shape !== selectedShape) return false
    if (searchTerm && !p.steelGrade.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  // Métricas Consolidadas para os Cards Executivos
  const totalStockTons = projections.reduce((acc, p) => acc + p.totalAvailableTons, 0)
  const totalFreeTons = projections.reduce((acc, p) => acc + p.unrestrictedTons, 0)
  const totalQualityTons = projections.reduce((acc, p) => acc + p.qualityControlTons, 0)
  const totalConfirmedReceiptsTons = projections.reduce(
    (acc, p) => acc + p.confirmedReceiptsTons,
    0,
  )
  const totalSimulatedTons = simulatedPurchases.reduce((acc, p) => acc + p.quantityTons, 0)
  const steelsInRisk = projections.filter(
    (p) => p.riskLevel === 'VERMELHO' || p.riskLevel === 'LARANJA',
  ).length

  // Gráfico Temporal Consolidado (30 dias)
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const baseTotal = totalStockTons
    const consumptionRate = 45 // t/dia
    const entryDay = day === 7 ? totalConfirmedReceiptsTons : day === 15 ? 120 : 0
    const simEntry = day === 12 && totalSimulatedTons > 0 ? totalSimulatedTons : 0
    const projected = Math.max(
      0,
      baseTotal - day * consumptionRate + entryDay * (day >= 7 ? 1 : 0) + simEntry,
    )
    return {
      dia: `D+${day}`,
      'Estoque Projetado (t)': Number(projected.toFixed(1)),
      'Estoque Mínimo (t)': 230,
      'Consumo Acumulado (t)': Number((day * consumptionRate).toFixed(1)),
      'Entradas Previstas (t)': Number(
        (day >= 7 ? totalConfirmedReceiptsTons : 0) + (day >= 12 ? totalSimulatedTons : 0),
      ),
    }
  })

  // Handlers para Simulação
  const handleAddSimulatedPurchase = (item: SimulatedPurchaseItem) => {
    setSimulatedPurchases((prev) => [...prev, item])
  }
  const handleRemoveSimulatedPurchase = (id: string) => {
    setSimulatedPurchases((prev) => prev.filter((p) => p.id !== id))
  }
  const handleClearSimulatedPurchases = () => {
    setSimulatedPurchases([])
  }

  // Handler de Explicabilidade
  const openExplainer = (type: 'RUPTURA_MP' | 'COBERTURA_CADEIA', p: SteelProjectionSummary) => {
    if (type === 'RUPTURA_MP') {
      const payload = MPCentralProjectionEngine.explainCalculation('RUPTURA_MP', {
        totalAvailable: p.totalAvailableTons,
        confirmedReceipts: p.confirmedReceiptsTons,
        programmedConsumption: p.totalProgrammedConsumptionTons,
        monthlyAverage: p.monthlyAverageConsumptionTons,
      })
      setExplainerPayload(payload)
    } else {
      const payload = MPCentralProjectionEngine.explainCalculation('COBERTURA_CADEIA', {
        mpDays: p.dailyRuptureDays,
        finishedDays: Math.round(p.finishedCoverageMonths * 30),
      })
      setExplainerPayload(payload)
    }
    setIsExplainerOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Topo: Barra de Identidade CIAFAL + Ações de Simulação e Homologação */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Projeções de MP & Ruptura da Cadeia Integrada
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 4
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Com o estoque atual, programação do PCP e pedidos SAP: em que data cada MP irá acabar?
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Botão Homologação Excel */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExcelHomologOpen(true)}
            className="text-xs text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 gap-1.5 h-8 font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Confrontar com Excel Legado
          </Button>

          {/* Botão Simulação de Compras */}
          <Button
            size="sm"
            onClick={() => setIsSimulationOpen(true)}
            className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 h-8 font-semibold shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Simulação de Compras
            {simulatedPurchases.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-white text-[#004C97] rounded-full text-[10px] font-black">
                {simulatedPurchases.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Banner Informativo de Fonte Oficial */}
      <div className="flex items-center justify-between text-xs px-3.5 py-2 bg-blue-50/70 border border-blue-200/60 rounded-lg text-slate-600">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-[#004C97]" />
          <span>
            <strong>Fonte Oficial:</strong> SAP ECC (MB52 / ME23N / MD04) + Sequenciamento L1/L2 PCP
            Robotizado
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Última sincronização: {new Date().toLocaleDateString('pt-BR')} às 07:00 • Sem fundo preto
        </div>
      </div>

      {/* Cards Executivos de Indicadores (KPIs do Topo) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              MP Total Disponível
            </span>
            <div className="text-xl font-black text-slate-900 font-mono mt-1">
              {totalStockTons.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
              Livre: {totalFreeTons.toFixed(1)} t
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Controle de Qualidade
            </span>
            <div className="text-xl font-black text-amber-700 font-mono mt-1">
              {totalQualityTons.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Aguardando liberação CQ</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pedidos SAP em Trânsito
            </span>
            <div className="text-xl font-black text-[#004C97] font-mono mt-1">
              {totalConfirmedReceiptsTons.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">
              Entradas confirmadas
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Simulação Adicional
            </span>
            <div className="text-xl font-black text-purple-700 font-mono mt-1">
              +{totalSimulatedTons.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">t</span>
            </div>
            <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">
              {simulatedPurchases.length} compra(s) no cenário
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Aços em Risco de Ruptura
            </span>
            <div
              className={`text-xl font-black font-mono mt-1 ${steelsInRisk > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
            >
              {steelsInRisk} <span className="text-xs font-normal text-slate-500">de 6</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Horizonte &lt; 15 dias</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Primeira Ruptura
            </span>
            <div className="text-sm font-black text-rose-700 font-mono mt-1">SAE 1045 (18d)</div>
            <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
              Pedido chega 4d após
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs">
        <div className="w-48">
          <Input
            placeholder="Buscar por aço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Aço:</span>
          <Select value={selectedSteel} onValueChange={setSelectedSteel}>
            <SelectTrigger className="h-8 w-36 text-xs bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os Aços</SelectItem>
              <SelectItem value="SAE 1020">SAE 1020</SelectItem>
              <SelectItem value="SAE 1045">SAE 1045</SelectItem>
              <SelectItem value="SAE 4140">SAE 4140</SelectItem>
              <SelectItem value="SAE 8620">SAE 8620</SelectItem>
              <SelectItem value="SAE 4340">SAE 4340</SelectItem>
              <SelectItem value="20MnCr5">20MnCr5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Forma:</span>
          <Select value={selectedShape} onValueChange={setSelectedShape}>
            <SelectTrigger className="h-8 w-36 text-xs bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas as Formas</SelectItem>
              <SelectItem value="TARUGO">Tarugos</SelectItem>
              <SelectItem value="PALANQUILHA">Palanquilhas</SelectItem>
              <SelectItem value="PLACA">Placas</SelectItem>
              <SelectItem value="LINGOTE">Lingotes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-semibold">Horizonte:</span>
          <Select value={selectedHorizon} onValueChange={setSelectedHorizon}>
            <SelectTrigger className="h-8 w-32 text-xs bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7_DIAS">7 Dias</SelectItem>
              <SelectItem value="15_DIAS">15 Dias</SelectItem>
              <SelectItem value="30_DIAS">30 Dias</SelectItem>
              <SelectItem value="60_DIAS">60 Dias</SelectItem>
              <SelectItem value="90_DIAS">90 Dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela Principal de Projeções de MP com Dupla Metodologia e Explicabilidade */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Matriz de Projeção de Estoque, Ruptura e Cobertura Total da Cadeia
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Apresentação simultânea do Modelo Excel (médio) vs Motor Diário Operacional CIAFAL
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Cobertura OK
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Atenção
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Risco de Ruptura
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-800">Aço & Forma</TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    MP Total Disponível
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Consumo L1 + L2
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Entradas Previstas
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Saldo Projetado
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center bg-blue-50/60">
                    Data Ruptura (Excel)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-[#004C97] text-center bg-blue-100/50">
                    Data Ruptura (Diária)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-emerald-800 text-center bg-emerald-50/70">
                    Cobertura Total Cadeia
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Auditoria
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjections.map((p) => {
                  const isSimulated = simulatedPurchases.some(
                    (sp) => sp.steelGrade === p.steelGrade,
                  )
                  return (
                    <TableRow key={p.steelGrade} className="hover:bg-slate-50/80">
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>{p.steelGrade}</span>
                          {isSimulated && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[9px] px-1 py-0">
                              Simulado
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {p.shape} • KS: {p.ksAvailableTons.toFixed(1)}t • Outros:{' '}
                          {p.otherDepotsTons.toFixed(1)}t
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-slate-800">
                        <div className="font-bold">{p.totalAvailableTons.toFixed(1)} t</div>
                        <div className="text-[10px] text-slate-400">
                          Livre: {p.unrestrictedTons.toFixed(1)}t | CQ:{' '}
                          {p.qualityControlTons.toFixed(1)}t
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-slate-700">
                        <div className="font-bold">
                          -{p.totalProgrammedConsumptionTons.toFixed(1)} t
                        </div>
                        <div className="text-[10px] text-slate-400">
                          L1: {p.programmedL1Tons.toFixed(1)}t | L2: {p.programmedL2Tons.toFixed(1)}
                          t
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs text-blue-700">
                        <div className="font-bold">
                          +{(p.confirmedReceiptsTons + p.transitOrdersTons).toFixed(1)} t
                        </div>
                        <div className="text-[10px] text-slate-400">
                          SAP: {p.confirmedReceiptsTons.toFixed(1)}t | L2 útil:{' '}
                          {p.projectedIntermedProdTons.toFixed(1)}t
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs">
                        <span
                          className={`font-black ${p.projectedBalanceTons < p.minStockLimitTons ? 'text-rose-600' : 'text-slate-900'}`}
                        >
                          {p.projectedBalanceTons.toFixed(1)} t
                        </span>
                        <div className="text-[10px] text-slate-400">
                          Mínimo: {p.minStockLimitTons.toFixed(1)}t
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs bg-blue-50/40 text-slate-700">
                        <div className="font-semibold">{p.excelRuptureDate}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.excelCoverageDays} dias ({p.excelCoverageMonths}m)
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs bg-blue-100/30">
                        <div className="font-black text-[#004C97]">{p.dailyRuptureDate}</div>
                        <div className="text-[10px] font-semibold text-blue-700">
                          {p.dailyRuptureDays} dias
                          {p.methodDiffDays > 0 && (
                            <span className="text-slate-400 font-normal ml-1">
                              (Δ {p.methodDiffDays}d)
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center font-mono text-xs bg-emerald-50/50">
                        <div className="font-bold text-emerald-800">
                          {p.totalChainCoverageDays} dias
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          MP: {p.dailyRuptureDays}d + Acab: +
                          {Math.round(p.finishedCoverageMonths * 30)}d
                        </div>
                        <div className="text-[9px] text-slate-400">Fim: {p.totalChainEndDate}</div>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openExplainer('RUPTURA_MP', p)}
                            title="Como foi calculada a Ruptura de MP?"
                            className="h-7 w-7 text-slate-500 hover:text-[#004C97] hover:bg-blue-50"
                          >
                            <HelpCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openExplainer('COBERTURA_CADEIA', p)}
                            title="Como foi calculada a Cobertura da Cadeia?"
                            className="h-7 w-7 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <Layers className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Curva Temporal de Estoque Projetado */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Curva Temporal de Estoque Projetado vs Consumo e Ruptura Operacional
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Projeção contínua nos próximos 30 dias com linha de corte do Estoque Mínimo de
                Segurança
              </CardDescription>
            </div>
            <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
              Granularidade Diária
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" t" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine
                  y={230}
                  label={{
                    value: 'Estoque Mínimo (230 t)',
                    fill: '#dc2626',
                    fontSize: 11,
                    position: 'insideTopRight',
                  }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="Estoque Projetado (t)"
                  stroke="#004C97"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#004C97' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Consumo Acumulado (t)"
                  stroke="#ea580c"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="Entradas Previstas (t)"
                  stroke="#16a34a"
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Modais Integrados */}
      <CalculationExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        payload={explainerPayload}
      />
      <LegacyExcelComparisonModal
        isOpen={isExcelHomologOpen}
        onClose={() => setIsExcelHomologOpen(false)}
      />
      <PurchaseSimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        simulatedPurchases={simulatedPurchases}
        onAddPurchase={handleAddSimulatedPurchase}
        onRemovePurchase={handleRemoveSimulatedPurchase}
        onClearPurchases={handleClearSimulatedPurchases}
      />
    </div>
  )
}

export default MPProjectionsSubpage
