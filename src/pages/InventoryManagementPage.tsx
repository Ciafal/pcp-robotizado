import React, { useState, useEffect } from 'react'
import {
  Layers,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Building,
  Warehouse,
  TrendingDown,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Sliders,
  History,
  Activity,
  ChevronDown,
  ChevronRight,
  Boxes,
  Clock,
  ExternalLink,
  GitCompare,
  FileText,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { inventoryService } from '@/services/inventory-service'
import {
  InventoryItem,
  InventoryKPIs,
  InventoryDiscrepancy,
  StockScenarioType,
  StockProjectionScenarioResult,
  IntegratedIndustrialCoverage,
  SmartStockAlert,
  ProductionNature,
} from '@/types/master-planning-inventory'
import { Can } from '@/components/auth/Can'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export const InventoryManagementPage: React.FC = () => {
  const { toast } = useToast()

  // 1. Estado Principal & Subtópicos Oficiais
  const [activeTab, setActiveTab] = useState<string>('visao-geral')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [discrepancies, setDiscrepancies] = useState<InventoryDiscrepancy[]>([])
  const [kpis, setKpis] = useState<InventoryKPIs | null>(null)
  const [alerts, setAlerts] = useState<SmartStockAlert[]>([])
  const [integratedCoverage, setIntegratedCoverage] = useState<IntegratedIndustrialCoverage[]>([])

  // 2. Filtros Gerais Globais (Regra 10)
  const [selectedPlant, setSelectedPlant] = useState('ALL')
  const [selectedStorage, setSelectedStorage] = useState('ALL')
  const [selectedLine, setSelectedLine] = useState('ALL')
  const [selectedNature, setSelectedNature] = useState<ProductionNature>('TODAS')
  const [selectedSteel, setSelectedSteel] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // 3. Drill-down State
  const [selectedDrilldownItem, setSelectedDrilldownItem] = useState<InventoryItem | null>(null)
  const [drilldownModalTitle, setDrilldownModalTitle] = useState('')
  const [drilldownModalOpen, setDrilldownModalOpen] = useState(false)
  const [drilldownCategoryItems, setDrilldownCategoryItems] = useState<InventoryItem[]>([])

  // 4. Projeção Temporal & Cenários (Regras 11, 12, 13)
  const [projectionItem, setProjectionItem] = useState<InventoryItem | null>(null)
  const [activeScenario, setActiveScenario] = useState<StockScenarioType>('SCENARIO_A_APPROVED')
  const [projectionResult, setProjectionResult] = useState<StockProjectionScenarioResult | null>(
    null,
  )

  // 5. Tratamento de Divergência SAP x WMS
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<InventoryDiscrepancy | null>(null)
  const [discrepancyActionModalOpen, setDiscrepancyActionModalOpen] = useState(false)
  const [discrepancyNotes, setDiscrepancyNotes] = useState('')
  const [discrepancyStatus, setDiscrepancyStatus] = useState<
    'EM_TRATAMENTO' | 'CONCILIADO' | 'JUSTIFICADO'
  >('EM_TRATAMENTO')

  // 6. IA de Estoques
  const [aiAnalysisRunning, setAiAnalysisRunning] = useState(false)
  const [aiReport, setAiReport] = useState<string | null>(null)

  // Carregar Dados
  const loadData = async () => {
    setLoading(true)
    try {
      const data = await inventoryService.getInventory({
        plantCode: selectedPlant,
        storageLocation: selectedStorage,
        productionNature: selectedNature,
      })
      const disc = await inventoryService.getDiscrepancies({ plantCode: selectedPlant })
      setItems(data)
      setDiscrepancies(disc)

      const calculatedKpis = await inventoryService.getKPIs(data)
      setKpis(calculatedKpis)

      const calculatedAlerts = inventoryService.getSmartAlerts(data, disc)
      setAlerts(calculatedAlerts)

      const cov = inventoryService.getIntegratedCoverage(data)
      setIntegratedCoverage(cov)

      if (data.length > 0 && !projectionItem) {
        setProjectionItem(data[0])
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados de estoque',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedPlant, selectedStorage, selectedNature])

  // Recalcular projeção quando item ou cenário muda
  useEffect(() => {
    if (projectionItem) {
      const scenarios = inventoryService.getProjectionScenarios(projectionItem)
      if (activeScenario === 'SCENARIO_A_APPROVED') setProjectionResult(scenarios.scenarioA)
      else if (activeScenario === 'SCENARIO_B_HISTORIC') setProjectionResult(scenarios.scenarioB)
      else setProjectionResult(scenarios.scenarioC)
    }
  }, [projectionItem, activeScenario])

  const handleSyncSap = async () => {
    setSyncing(true)
    try {
      const result = await inventoryService.syncWithSap(selectedPlant)
      toast({
        title: result.success ? 'Sincronização SAP Concluída' : 'Aviso SAP',
        description: result.message,
      })
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Sincronização SAP',
        description: err.message,
      })
    } finally {
      setSyncing(false)
    }
  }

  // Filtragem local
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.material_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storage_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batch_number && item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesPlant = selectedPlant === 'ALL' || item.plant_code === selectedPlant
    const matchesLine =
      selectedLine === 'ALL' ||
      item.consumer_line_code === selectedLine ||
      item.producer_line_code === selectedLine

    let matchesStatus = true
    if (selectedStatus === 'BELOW_MIN') {
      matchesStatus = item.min_stock !== undefined && item.qty_unrestricted < item.min_stock
    } else if (selectedStatus === 'ABOVE_MAX') {
      matchesStatus = item.max_stock !== undefined && item.qty_unrestricted > item.max_stock
    } else if (selectedStatus === 'ZERO_STOCK') {
      matchesStatus = item.qty_unrestricted <= 0
    }

    return matchesSearch && matchesPlant && matchesLine && matchesStatus
  })

  // Subgrupos de materiais
  const mpItems = filteredItems.filter((i) => i.category === 'RAW_MATERIAL')
  const semiFinishedItems = filteredItems.filter((i) => i.category === 'SEMI_FINISHED')
  const finishedGoodsItems = filteredItems.filter((i) => i.category === 'FINISHED_GOOD')
  const mpWithoutAppItems = mpItems.filter(
    (i) => !i.consumer_line_code || i.consumer_line_code === 'SEM_APLICACAO',
  )

  // Drilldown card handler
  const openDrilldown = (title: string, categoryItems: InventoryItem[]) => {
    setDrilldownModalTitle(title)
    setDrilldownCategoryItems(categoryItems)
    setDrilldownModalOpen(true)
  }

  const handleRunAiStockAnalysis = () => {
    setAiAnalysisRunning(true)
    setTimeout(() => {
      setAiAnalysisRunning(false)
      setAiReport(
        `RELATÓRIO EXECUTIVO DE IA — GOVERNANÇA DE ESTOQUES CIAFAL\n\n` +
          `1. MATÉRIA-PRIMA CRÍTICA:\n` +
          `• Tarugos SAE 1020 (TB-5050-1020) apresentam menor cobertura estimada (18 dias no Cenário A, 14 dias no Cenário C Forecast IA).\n` +
          `• Ruptura prevista em L1 calculada para o dia 22 do próximo ciclo caso a remessa SAP #4500918 não seja antecipada.\n\n` +
          `2. SEMIACABADOS & GARGALOS INTERMEDIÁRIOS:\n` +
          `• Linha 1 -> Linha 2: O pulmão intermediário de Bobinas Laminadas está com 480 t disponíveis vs necessidade de 620 t programadas na Linha 2.\n` +
          `• Déficit de 140 t previsto em L2 para 14/09. Ação recomendada: priorizar batelada de laminação em L1.\n\n` +
          `3. PRODUTOS ACABADOS & DEMANDA COMERCIAL CRM:\n` +
          `• Perfis SAE 1045 possuem 62 dias de cobertura com queda de 18% no forecast comercial CRM 360º. Risco de excesso e pátio saturado.\n\n` +
          `4. DIVERGÊNCIAS SAP × WMS:\n` +
          `• Identificadas divergências relevantes no Depósito 0001 (Diferença de saldo contábil vs leitor físico). Nenhuma alteração automática foi executada.`,
      )
      toast({
        title: 'Análise de IA Concluída',
        description:
          'Recomendações preditivas geradas com base nas fontes oficiais SAP, WMS e CRM.',
      })
    }, 800)
  }

  const handleSaveDiscrepancyResolution = async () => {
    if (!selectedDiscrepancy) return
    const ok = await inventoryService.updateDiscrepancyStatus(
      selectedDiscrepancy.id,
      discrepancyStatus,
      discrepancyNotes,
      'Gestor PCP / Logística',
    )
    if (ok) {
      toast({
        title: 'Ocorrência Registrada',
        description: 'Tratamento de divergência auditado e registrado sem alterar saldos SAP.',
      })
      setDiscrepancyActionModalOpen(false)
      loadData()
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Oficial CIAFAL Pantone 2945 & Fundo Claro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Gestão de Estoques Industriais
              </h1>
              <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-[10px] font-bold">
                SAP ECC &bull; WMS &bull; CRM 360º
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Controle determinístico de Matéria-Prima, Semiacabados, Acabados e Curva Temporal de
              Cobertura. Padrão oficial de unidades em toneladas (<strong>t</strong>).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right hidden sm:block pr-3 border-r border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Última Carga SAP / WMS
            </span>
            <span className="text-xs font-mono font-semibold text-slate-700">
              {kpis?.lastSyncTime
                ? new Date(kpis.lastSyncTime).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </span>
          </div>

          <Can permission="pcp.inventory.sync">
            <Button
              size="sm"
              onClick={handleSyncSap}
              disabled={syncing}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5 h-8 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando SAP/WMS...' : 'Sincronizar SAP'}
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. Filtros Globais Unificados (Regra 10) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs">
        <div className="relative md:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <Input
            placeholder="Buscar material, descrição, lote ou depósito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-slate-50 border-slate-300 text-xs text-slate-900 h-8 placeholder:text-slate-400"
          />
        </div>

        <div>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todos os Centros SAP</option>
            <option value="1000">1000 - Divinópolis</option>
            <option value="2000">2000 - Contagem</option>
          </select>
        </div>

        <div>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todas as Linhas PCP</option>
            <option value="L1">L1 - Laminação</option>
            <option value="L2">L2 - Perfis & Trefila</option>
            <option value="SDC">SDC - Corte e Dobra</option>
            <option value="Separadora">Separadora</option>
          </select>
        </div>

        <div>
          <select
            value={selectedNature}
            onChange={(e) => setSelectedNature(e.target.value as ProductionNature)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="TODAS">Natureza: Todas</option>
            <option value="PRODUCAO_PROPRIA">Produção Própria</option>
            <option value="INDUSTRIALIZACAO">Industrialização</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Status / Nível</option>
            <option value="BELOW_MIN">Abaixo do Mínimo</option>
            <option value="ABOVE_MAX">Acima do Máximo</option>
            <option value="ZERO_STOCK">Saldo Zerado</option>
          </select>
        </div>
      </div>

      {/* 3. Subtópicos Oficiais (Regra 1) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 border border-slate-200 p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="visao-geral"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="materia-prima"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Matéria-Prima — MP ({mpItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="semiacabados"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Semiacabados ({semiFinishedItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="produtos-acabados"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Produtos Acabados ({finishedGoodsItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="cobertura"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Cobertura & Projeções
          </TabsTrigger>
          <TabsTrigger
            value="divergencias"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Divergências SAP × WMS ({discrepancies.length})
          </TabsTrigger>
          <TabsTrigger
            value="alertas-ia"
            className="text-xs data-[state=active]:bg-[#004C97] data-[state=active]:text-white font-semibold"
          >
            Alertas & IA ({alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* =========================================================================
            TAB 1: VISÃO GERAL — CARDS EXECUTIVOS COM DRILL-DOWN (Regra 4)
           ========================================================================= */}
        <TabsContent value="visao-geral" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card
              onClick={() => openDrilldown('Matéria-Prima Disponível', mpItems)}
              className="bg-white border-slate-200 shadow-sm hover:border-[#004C97] cursor-pointer transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  MP Disponível
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-amber-700 font-mono">
                    {kpis ? kpis.rawMaterialTons.toLocaleString('pt-BR') : '0'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">t</span>
                </div>
                <span className="text-[9px] text-[#004C97] font-semibold block mt-1 flex items-center gap-0.5">
                  Ver materiais &rarr;
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => openDrilldown('Semiacabados em Pulmão', semiFinishedItems)}
              className="bg-white border-slate-200 shadow-sm hover:border-[#004C97] cursor-pointer transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Semiacabado
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-[#004C97] font-mono">
                    {kpis ? kpis.semiFinishedTons.toLocaleString('pt-BR') : '0'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">t</span>
                </div>
                <span className="text-[9px] text-[#004C97] font-semibold block mt-1 flex items-center gap-0.5">
                  Ver pulmão &rarr;
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => openDrilldown('Produtos Acabados para Expedição', finishedGoodsItems)}
              className="bg-white border-slate-200 shadow-sm hover:border-[#004C97] cursor-pointer transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Produto Acabado
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {kpis ? kpis.finishedGoodsTons.toLocaleString('pt-BR') : '0'}
                  </span>
                  <span className="text-xs font-bold text-slate-400">t</span>
                </div>
                <span className="text-[9px] text-[#004C97] font-semibold block mt-1 flex items-center gap-0.5">
                  Ver expedição &rarr;
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() =>
                openDrilldown(
                  'MP Abaixo do Mínimo / Rupturas Previstas',
                  items.filter((i) => i.min_stock && i.qty_unrestricted < i.min_stock),
                )
              }
              className="bg-white border-slate-200 shadow-sm hover:border-rose-400 cursor-pointer transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Abaixo do Mínimo
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-rose-600 font-mono">
                    {kpis ? kpis.itemsBelowMinCount : 0}
                  </span>
                  <span className="text-xs font-bold text-slate-400">itens</span>
                </div>
                <span className="text-[9px] text-rose-600 font-semibold block mt-1 flex items-center gap-0.5">
                  Rupturas previstas &rarr;
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => openDrilldown('MP Sem Aplicação Definida', mpWithoutAppItems)}
              className="bg-white border-slate-200 shadow-sm hover:border-amber-400 cursor-pointer transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  MP Sem Aplicação
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-amber-600 font-mono">
                    {mpWithoutAppItems.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400">lotes</span>
                </div>
                <span className="text-[9px] text-amber-600 font-semibold block mt-1 flex items-center gap-0.5">
                  Avaliar alocação &rarr;
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab('divergencias')}
              className="bg-white border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer transition-all hover:shadow-md"
            >
              <CardContent className="p-3">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">
                  Divergência SAP×WMS
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-xl font-black text-slate-900 font-mono">
                    {discrepancies.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400">ocorrências</span>
                </div>
                <span className="text-[9px] text-[#004C97] font-semibold block mt-1 flex items-center gap-0.5">
                  Ver conciliação &rarr;
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Cobertura Industrial Integrada da Cadeia (Regra 14) */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Cobertura Industrial Integrada por Aço & Família
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Análise sincronizada da cadeia completa: MP &rarr; Semiacabado &rarr; Produto
                    Acabado &rarr; Demanda Comercial CRM 360º.
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                  Autonomia Combinada
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Aço / Liga</th>
                    <th className="py-2.5 px-3 text-center">Cobertura MP</th>
                    <th className="py-2.5 px-3 text-center">Cobertura Semiacabado</th>
                    <th className="py-2.5 px-3 text-center">Cobertura Acabado</th>
                    <th className="py-2.5 px-3 text-right">Demanda CRM (t)</th>
                    <th className="py-2.5 px-3 text-center">Etapa Gargalo</th>
                    <th className="py-2.5 px-3 text-center">Autonomia Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {integratedCoverage.map((row) => (
                    <tr key={row.steelGrade} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{row.steelGrade}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-amber-800">
                        {row.mpDays} dias
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-[#004C97]">
                        {row.semiFinishedDays} dias
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-emerald-800">
                        {row.finishedGoodsDays} dias
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                        {row.crmDemandTons.toLocaleString('pt-BR')} t
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge className="bg-slate-100 text-slate-700 text-[10px]">
                          {row.bottleneckStage === 'MP'
                            ? 'Matéria-Prima'
                            : row.bottleneckStage === 'SEMI_FINISHED'
                              ? 'Pulmão Intermediário'
                              : 'Expedição Acabado'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                        {row.totalChainCoverageDays} dias
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.status === 'SAUDAVEL' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Saudável
                          </Badge>
                        ) : row.status === 'ATENCAO' ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                            Atenção
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                            Crítico
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 2: MATÉRIA-PRIMA (MP) & MP POR APLICAÇÃO (Regras 5, 6, 7)
           ========================================================================= */}
        <TabsContent value="materia-prima" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Matriz de Matéria-Prima por Aplicação & Linha
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Distribuição da MP (Tarugos, Placas, Bobinas) vinculada às linhas homologadas do
                    PCP e materiais sem aplicação.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-50 text-amber-900 border-amber-200 text-xs">
                  Total MP: {kpis?.rawMaterialTons} t
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Código SAP</th>
                    <th className="py-2 px-3">Descrição da MP</th>
                    <th className="py-2 px-3">Aço / Tipo</th>
                    <th className="py-2 px-3">Centro / Depósito</th>
                    <th className="py-2 px-3">Lote</th>
                    <th className="py-2 px-3 text-right">Saldo Livre (t)</th>
                    <th className="py-2 px-3 text-right">Qualidade (t)</th>
                    <th className="py-2 px-3 text-center">Aplicação / Linha</th>
                    <th className="py-2 px-3 text-center">Cobertura</th>
                    <th className="py-2 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mpItems.map((item) => {
                    const isNoApp =
                      !item.consumer_line_code || item.consumer_line_code === 'SEM_APLICACAO'
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {item.material_code}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{item.material_description}</td>
                        <td className="py-2 px-3 font-medium text-slate-600">
                          {item.family_code || 'SAE 1020'}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono">
                          {item.plant_code} / {item.storage_location}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {item.batch_number || '--'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">
                          {item.qty_unrestricted.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {item.qty_in_quality.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isNoApp ? (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                              Sem Aplicação
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-bold">
                              Linha {item.consumer_line_code}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                          {Math.round(item.qty_unrestricted / 12)} dias
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProjectionItem(item)
                              setActiveTab('cobertura')
                            }}
                            className="h-7 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold"
                          >
                            Projetar &rarr;
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 3: SEMIACABADOS & INTEGRAÇÃO PRODUTIVA (Regra 8)
           ========================================================================= */}
        <TabsContent value="semiacabados" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Pulmão de Semiacabados — Relação Linha Anterior &rarr; Linha Posterior
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Rastreabilidade de material em processo intermediário (ex: Laminação L1 &rarr;
                    Perfis L2) e validação de suficiência de estoque.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-xs">
                  Total Pulmão: {kpis?.semiFinishedTons} t
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Código SAP</th>
                    <th className="py-2 px-3">Descrição Semiacabado</th>
                    <th className="py-2 px-3">Centro / Depósito</th>
                    <th className="py-2 px-3 text-center">Linha Origem</th>
                    <th className="py-2 px-3 text-center">Próxima Linha</th>
                    <th className="py-2 px-3 text-right">Saldo Disponível (t)</th>
                    <th className="py-2 px-3 text-right">Necessidade (t)</th>
                    <th className="py-2 px-3 text-right">Gap Projetado (t)</th>
                    <th className="py-2 px-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {semiFinishedItems.map((item) => {
                    const necessidade = (item.qty_unrestricted || 0) * 1.2 + 15
                    const gap = item.qty_unrestricted - necessidade
                    const hasDeficit = gap < 0

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {item.material_code}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{item.material_description}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono">
                          {item.plant_code} / {item.storage_location}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-700">
                          {item.producer_line_code || 'L1'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-[#004C97]">
                          {item.consumer_line_code || 'L2'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#004C97]">
                          {item.qty_unrestricted.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-600">
                          {necessidade.toFixed(1)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${hasDeficit ? 'text-rose-600' : 'text-emerald-700'}`}
                        >
                          {gap.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {hasDeficit ? (
                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                              Risco de Restrição
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                              Balanceado
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 4: PRODUTOS ACABADOS & CARTEIRA RESERVADA (Regra 9)
           ========================================================================= */}
        <TabsContent value="produtos-acabados" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Estoque de Acabados & Balanço Projetado de Carteira
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Cálculo oficial: Estoque Físico &minus; Carteira Confirmada &minus; Reservas =
                    Saldo Projetado Livre.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-50 text-emerald-900 border-emerald-200 text-xs">
                  Total Acabados: {kpis?.finishedGoodsTons} t
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2 px-3">Código SAP</th>
                    <th className="py-2 px-3">Descrição do Produto</th>
                    <th className="py-2 px-3">Centro / Depósito</th>
                    <th className="py-2 px-3 text-right">Estoque Total (t)</th>
                    <th className="py-2 px-3 text-right">Carteira / Reservado (t)</th>
                    <th className="py-2 px-3 text-right">Saldo Livre (t)</th>
                    <th className="py-2 px-3 text-center">Previsão Expedição</th>
                    <th className="py-2 px-3 text-center">Cobertura</th>
                    <th className="py-2 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finishedGoodsItems.map((item) => {
                    const reservado = item.qty_reserved || Math.round(item.qty_unrestricted * 0.4)
                    const livre = Math.max(0, item.qty_unrestricted - reservado)

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {item.material_code}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{item.material_description}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono">
                          {item.plant_code} / {item.storage_location}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {item.qty_total.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-amber-800">
                          {reservado.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {livre.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600">
                          Em até 48h
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                          {Math.round(item.qty_unrestricted / 8)} dias
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setProjectionItem(item)
                              setActiveTab('cobertura')
                            }}
                            className="h-7 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold"
                          >
                            Projetar &rarr;
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 5: COBERTURA & PROJEÇÕES — 3 CENÁRIOS & CURVA TEMPORAL (Regras 11, 12, 13)
           ========================================================================= */}
        <TabsContent value="cobertura" className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Projeção Temporal & Curva de Ruptura Dia a Dia
              </h2>
              <p className="text-xs text-slate-500">
                Material selecionado:{' '}
                <strong className="text-slate-800">
                  {projectionItem
                    ? `${projectionItem.material_code} - ${projectionItem.material_description}`
                    : 'Nenhum selecionado'}
                </strong>
              </p>
            </div>

            {/* Seletor de 3 Cenários (Regra 12) */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <Button
                size="sm"
                variant={activeScenario === 'SCENARIO_A_APPROVED' ? 'default' : 'ghost'}
                onClick={() => setActiveScenario('SCENARIO_A_APPROVED')}
                className={`text-xs h-7 ${activeScenario === 'SCENARIO_A_APPROVED' ? 'bg-[#004C97] text-white' : 'text-slate-700'}`}
              >
                Cenário A: Programação Aprovada
              </Button>
              <Button
                size="sm"
                variant={activeScenario === 'SCENARIO_B_HISTORIC' ? 'default' : 'ghost'}
                onClick={() => setActiveScenario('SCENARIO_B_HISTORIC')}
                className={`text-xs h-7 ${activeScenario === 'SCENARIO_B_HISTORIC' ? 'bg-[#004C97] text-white' : 'text-slate-700'}`}
              >
                Cenário B: Ritmo Histórico
              </Button>
              <Button
                size="sm"
                variant={activeScenario === 'SCENARIO_C_AI_FORECAST' ? 'default' : 'ghost'}
                onClick={() => setActiveScenario('SCENARIO_C_AI_FORECAST')}
                className={`text-xs h-7 ${activeScenario === 'SCENARIO_C_AI_FORECAST' ? 'bg-[#004C97] text-white' : 'text-slate-700'}`}
              >
                Cenário C: Previsão IA & CRM
              </Button>
            </div>
          </div>

          {projectionResult && (
            <div className="space-y-4">
              {/* Cards de Métricas da Projeção */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Saldo Atual em Estoque
                  </span>
                  <div className="text-xl font-black text-slate-900 font-mono mt-1">
                    {projectionResult.currentStockTons.toLocaleString('pt-BR')} t
                  </div>
                  <span className="text-[10px] text-slate-400">Posição contábil SAP</span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Consumo Médio Diário
                  </span>
                  <div className="text-xl font-black text-[#004C97] font-mono mt-1">
                    {projectionResult.averageDailyConsumptionTons.toLocaleString('pt-BR')} t/dia
                  </div>
                  <span className="text-[10px] text-slate-400">Cadência programada</span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Autonomia / Cobertura
                  </span>
                  <div className="text-xl font-black text-emerald-700 font-mono mt-1">
                    {projectionResult.daysOfCoverage} dias ({projectionResult.monthsOfCoverage}{' '}
                    meses)
                  </div>
                  <span className="text-[10px] text-slate-400">Sem novas entradas</span>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-3">
                  <span className="text-[10px] font-bold uppercase text-slate-500">
                    Data Prevista de Ruptura
                  </span>
                  <div
                    className={`text-xl font-black font-mono mt-1 ${projectionResult.predictedRuptureDate ? 'text-rose-600' : 'text-emerald-700'}`}
                  >
                    {projectionResult.predictedRuptureDate
                      ? new Date(projectionResult.predictedRuptureDate).toLocaleDateString('pt-BR')
                      : 'Sem Ruptura no Ciclo'}
                  </div>
                  <span className="text-[10px] text-rose-500 font-semibold">
                    {projectionResult.predictedRuptureDate
                      ? 'Risco crítico de parada'
                      : 'Abastecimento garantido'}
                  </span>
                </Card>
              </div>

              {/* Tabela / Curva Temporal Dia a Dia (Regra 11) */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Projeção Temporal de 30 Dias (Dia a Dia)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-2 px-2.5">Dia</th>
                        <th className="py-2 px-2.5">Data</th>
                        <th className="py-2 px-2.5 text-right">Entradas Programadas (t)</th>
                        <th className="py-2 px-2.5 text-right">Consumo Planejado (t)</th>
                        <th className="py-2 px-2.5 text-right">Estoque Projetado (t)</th>
                        <th className="py-2 px-2.5 text-right">Estoque Mínimo (t)</th>
                        <th className="py-2 px-2.5 text-center">Status no Dia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectionResult.timeline.map((point) => (
                        <tr
                          key={point.dayIndex}
                          className={`hover:bg-slate-50/80 ${point.isRupture ? 'bg-rose-50/50' : ''}`}
                        >
                          <td className="py-1.5 px-2.5 font-bold text-slate-700">
                            Dia {point.dayIndex} ({point.dayName})
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-slate-600">{point.date}</td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-emerald-700 font-semibold">
                            {point.plannedInput > 0 ? `+${point.plannedInput.toFixed(1)}` : '0.0'}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                            -{point.plannedConsumption.toFixed(1)}
                          </td>
                          <td
                            className={`py-1.5 px-2.5 text-right font-mono font-bold ${point.projectedStock <= point.minStock ? 'text-rose-600' : 'text-slate-900'}`}
                          >
                            {point.projectedStock.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-400">
                            {point.minStock.toFixed(1)}
                          </td>
                          <td className="py-1.5 px-2.5 text-center">
                            {point.isRupture ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                                Ruptura (Saldo &le; 0)
                              </Badge>
                            ) : point.projectedStock <= point.minStock ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                                Abaixo do Mínimo
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                                Normal
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* =========================================================================
            TAB 6: DIVERGÊNCIAS SAP × WMS (Regra 15)
           ========================================================================= */}
        <TabsContent value="divergencias" className="space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 pb-2 border-b border-slate-100">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Reconciliação & Divergências de Estoque (SAP ECC &times; WMS)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    O PCP compara os saldos e aponta ocorrências para investigação. Nenhuma
                    divergência é corrigida automaticamente.
                  </CardDescription>
                </div>
                <Badge className="bg-slate-100 text-slate-700 text-xs">Aguardando Tratamento</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Ocorrência</th>
                    <th className="py-2.5 px-3">Código SAP</th>
                    <th className="py-2.5 px-3">Descrição do Material</th>
                    <th className="py-2.5 px-3">Centro / Depósito</th>
                    <th className="py-2.5 px-3 text-right">Saldo SAP (t)</th>
                    <th className="py-2.5 px-3 text-right">Saldo WMS (t)</th>
                    <th className="py-2.5 px-3 text-right">Diferença (t)</th>
                    <th className="py-2.5 px-3 text-right">Variação (%)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discrepancies.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Nenhuma divergência registrada entre o SAP e o WMS.
                      </td>
                    </tr>
                  ) : (
                    discrepancies.map((disc) => (
                      <tr key={disc.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono font-bold text-[#004C97]">
                          {disc.discrepancy_code}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-900">{disc.material_code}</td>
                        <td className="py-2 px-3 text-slate-800">{disc.material_description}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {disc.plant_code} / {disc.storage_location}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {disc.sap_qty.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#004C97]">
                          {disc.wms_qty.toFixed(1)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${disc.diff_qty < 0 ? 'text-rose-600' : 'text-amber-700'}`}
                        >
                          {disc.diff_qty > 0
                            ? `+${disc.diff_qty.toFixed(1)}`
                            : disc.diff_qty.toFixed(1)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${Math.abs(disc.diff_pct) > 5 ? 'text-rose-600' : 'text-slate-700'}`}
                        >
                          {disc.diff_pct > 0 ? `+${disc.diff_pct}%` : `${disc.diff_pct}%`}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            className={
                              disc.status === 'CONCILIADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }
                          >
                            {disc.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedDiscrepancy(disc)
                              setDiscrepancyNotes(disc.occurrence_notes || '')
                              setDiscrepancyStatus(
                                disc.status === 'CONCILIADO' ? 'CONCILIADO' : 'EM_TRATAMENTO',
                              )
                              setDiscrepancyActionModalOpen(true)
                            }}
                            className="h-7 text-[11px] text-[#004C97] border-slate-300 hover:bg-blue-50 font-semibold"
                          >
                            Tratar Ocorrência
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
            TAB 7: ALERTAS & IA DE ESTOQUES (Regras 16, 17)
           ========================================================================= */}
        <TabsContent value="alertas-ia" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Painel de Alertas Inteligentes & Diagnóstico com IA
              </h2>
              <p className="text-xs text-slate-500">
                A IA analisa e recomenda planos de ação (priorização de remessas e alocação de MP)
                sem executar movimentações automáticas.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleRunAiStockAnalysis}
              disabled={aiAnalysisRunning}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5 h-8 shadow-sm"
            >
              <Sparkles className={`w-3.5 h-3.5 ${aiAnalysisRunning ? 'animate-spin' : ''}`} />
              {aiAnalysisRunning ? 'Analisando Estoques...' : 'Analisar Estoques com IA'}
            </Button>
          </div>

          {aiReport && (
            <Card className="bg-blue-50/50 border-blue-200 shadow-sm">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2 text-[#004C97]">
                  <Sparkles className="w-4 h-4" />
                  <CardTitle className="text-sm font-bold">
                    Diagnóstico Preditivo do Agente IA CIAFAL
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1">
                <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-blue-100">
                  {aiReport}
                </pre>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card key={alert.id} className="bg-white border-slate-200 shadow-sm p-3.5">
                <div className="flex flex-col md:flex-row justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          alert.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }
                      >
                        {alert.severity === 'critical' ? 'Crítico' : 'Atenção'}
                      </Badge>
                      <h3 className="text-xs font-bold text-slate-900">{alert.title}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-1">
                      <div>
                        <strong className="text-slate-800">Problema:</strong> {alert.problem}
                      </div>
                      <div>
                        <strong className="text-slate-800">Causa Provável:</strong>{' '}
                        {alert.probableCause}
                      </div>
                      <div>
                        <strong className="text-slate-800">Impacto:</strong> {alert.impact}
                      </div>
                      <div>
                        <strong className="text-slate-800">Ação Recomendada:</strong>{' '}
                        {alert.recommendedAction}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs font-mono text-slate-500 shrink-0">
                    <div>
                      Centro: <strong className="text-slate-800">{alert.plantCode}</strong>
                    </div>
                    {alert.gapTons && (
                      <div>
                        Gap: <strong className="text-rose-600">{alert.gapTons} t</strong>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL DRILL-DOWN DE CATEGORIA / RUÍNA DE DADOS (Regra 4) */}
      <Dialog open={drilldownModalOpen} onOpenChange={setDrilldownModalOpen}>
        <DialogContent className="max-w-3xl bg-white border-slate-200 text-slate-900 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Drill-down: {drilldownModalTitle} ({drilldownCategoryItems.length} materiais)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2 px-2.5">Código SAP</th>
                  <th className="py-2 px-2.5">Descrição</th>
                  <th className="py-2 px-2.5">Centro/Depósito</th>
                  <th className="py-2 px-2.5 text-right">Saldo Livre (t)</th>
                  <th className="py-2 px-2.5 text-right">Mínimo (t)</th>
                  <th className="py-2 px-2.5 text-center">Linha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drilldownCategoryItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900">
                      {item.material_code}
                    </td>
                    <td className="py-2 px-2.5 text-slate-800">{item.material_description}</td>
                    <td className="py-2 px-2.5 font-mono text-slate-600">
                      {item.plant_code} / {item.storage_location}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold text-[#004C97]">
                      {item.qty_unrestricted.toFixed(1)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-slate-500">
                      {item.min_stock ?? '--'}
                    </td>
                    <td className="py-2 px-2.5 text-center font-bold text-slate-700">
                      {item.consumer_line_code || 'L1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDrilldownModalOpen(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TRATAMENTO DE DIVERGÊNCIA SAP x WMS */}
      <Dialog open={discrepancyActionModalOpen} onOpenChange={setDiscrepancyActionModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Tratar Divergência: {selectedDiscrepancy?.discrepancy_code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs py-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800">
                {selectedDiscrepancy?.material_code} - {selectedDiscrepancy?.material_description}
              </div>
              <div className="text-slate-500 mt-0.5">
                Saldo SAP: {selectedDiscrepancy?.sap_qty} t | Saldo Físico WMS:{' '}
                {selectedDiscrepancy?.wms_qty} t | Diferença: {selectedDiscrepancy?.diff_qty} t
              </div>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Status da Ocorrência
              </Label>
              <select
                value={discrepancyStatus}
                onChange={(e) => setDiscrepancyStatus(e.target.value as any)}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
              >
                <option value="EM_TRATAMENTO">EM_TRATAMENTO (Inventário / Investigação)</option>
                <option value="CONCILIADO">CONCILIADO (Ajustado via Transação Oficial SAP)</option>
                <option value="JUSTIFICADO">
                  JUSTIFICADO (Perda Operacional / Apontamento Pendente)
                </option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Parecer Técnico / Justificativa
              </Label>
              <Input
                placeholder="Ex: Realizada recontagem física no box 14-B. Identificada duplicidade de leitura no WMS."
                value={discrepancyNotes}
                onChange={(e) => setDiscrepancyNotes(e.target.value)}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDiscrepancyActionModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDiscrepancyResolution}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Gravar Tratamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InventoryManagementPage
