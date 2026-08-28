import React, { useState, useEffect } from 'react'
import {
  Layers,
  Database,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  PackageCheck,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Building,
  Warehouse,
  ExternalLink,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { inventoryService } from '@/services/inventory-service'
import { InventoryItem, InventoryKPIs, InventoryCategory } from '@/types/inventory-projection'
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

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [kpis, setKpis] = useState<InventoryKPIs | null>(null)

  // Filtros em Cascata
  const [selectedPlant, setSelectedPlant] = useState('ALL')
  const [selectedStorage, setSelectedStorage] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Drill-down Expandidos
  const [expandedCentros, setExpandedCentros] = useState<Record<string, boolean>>({
    '1000': true,
    '2000': true,
    DIV: true,
    CTG: true,
  })
  const [expandedDepositos, setExpandedDepositos] = useState<Record<string, boolean>>({})

  // Modal Novo Item Manual
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false)
  const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({
    plant_code: '1000',
    storage_location: '0001',
    storage_location_name: 'Depósito Geral Almoxarifado',
    material_code: '',
    material_description: '',
    category: 'RAW_MATERIAL',
    unit: 't',
    qty_unrestricted: 0,
    qty_blocked: 0,
    qty_in_quality: 0,
    qty_reserved: 0,
    qty_total: 0,
    min_stock: 50,
    target_stock: 150,
    max_stock: 300,
    source_mode: 'MANUAL',
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await inventoryService.getInventory({
        plantCode: selectedPlant,
        storageLocation: selectedStorage,
        category: selectedCategory,
      })
      setItems(data)
      const calculatedKpis = await inventoryService.getKPIs(data)
      setKpis(calculatedKpis)
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
  }, [selectedPlant, selectedStorage, selectedCategory])

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

  const handleCreateManualItem = async () => {
    if (!newItemData.material_code || !newItemData.material_description) {
      toast({
        variant: 'destructive',
        title: 'Campos Obrigatórios',
        description: 'Informe o código do material e a descrição.',
      })
      return
    }

    try {
      const total =
        (Number(newItemData.qty_unrestricted) || 0) +
        (Number(newItemData.qty_blocked) || 0) +
        (Number(newItemData.qty_in_quality) || 0)

      await inventoryService.saveManualItem({
        ...newItemData,
        qty_total: total,
      })

      toast({
        title: 'Material Cadastrado com Sucesso',
        description: 'O saldo foi incorporado à base operacional do PCP.',
      })

      setIsNewItemModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar material',
        description: err.message,
      })
    }
  }

  // Filtragem local por busca
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.material_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.material_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.storage_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.batch_number && item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory
    const matchesPlant = selectedPlant === 'ALL' || item.plant_code === selectedPlant

    let matchesStatus = true
    if (selectedStatus === 'BELOW_MIN') {
      matchesStatus = item.min_stock !== undefined && item.qty_unrestricted < item.min_stock
    } else if (selectedStatus === 'ABOVE_MAX') {
      matchesStatus = item.max_stock !== undefined && item.qty_unrestricted > item.max_stock
    } else if (selectedStatus === 'ZERO_STOCK') {
      matchesStatus = item.qty_unrestricted <= 0
    }

    return matchesSearch && matchesCat && matchesPlant && matchesStatus
  })

  // Agrupamento Hierárquico: Centro -> Depósito -> Categoria -> Materiais
  const groupedHierarchy = filteredItems.reduce(
    (acc, item) => {
      const plant = item.plant_code || '1000'
      const storage = item.storage_location || '0001'
      const category = item.category || 'OTHER'

      if (!acc[plant]) acc[plant] = {}
      if (!acc[plant][storage]) acc[plant][storage] = {}
      if (!acc[plant][storage][category]) acc[plant][storage][category] = []

      acc[plant][storage][category].push(item)
      return acc
    },
    {} as Record<string, Record<string, Record<string, InventoryItem[]>>>,
  )

  const toggleCentro = (plantCode: string) => {
    setExpandedCentros((prev) => ({ ...prev, [plantCode]: !prev[plantCode] }))
  }

  const toggleDeposito = (key: string) => {
    setExpandedDepositos((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const getCategoryBadge = (cat: InventoryCategory) => {
    switch (cat) {
      case 'RAW_MATERIAL':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold">
            Matéria-Prima (MP)
          </Badge>
        )
      case 'SEMI_FINISHED':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold">Semiacabado</Badge>
        )
      case 'FINISHED_GOOD':
        return (
          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
            Produto Acabado
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-300">Outros / Consumo</Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Executivo CIAFAL em Fundo Claro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 bg-white p-4 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Gestão de Estoques Industriais (SAP ECC / S4HANA)
                </h1>
                <Badge className="bg-blue-50 text-[#004C97] border-[#004C97]/30 text-[10px] font-bold">
                  READ-ONLY &bull; Normalizado
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Visão consolidada por Centro, Depósito e Categoria PCP (Matéria-Prima, Semiacabado e
                Acabado). Unidades em toneladas (<strong className="text-slate-700">t</strong>).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-right hidden sm:block pr-2 border-r border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Última Carga SAP
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
              {syncing ? 'Sincronizando RFC...' : 'Sincronizar SAP'}
            </Button>
          </Can>

          <Can permission="pcp.masterdata.edit">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewItemModalOpen(true)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5 h-8"
            >
              <Plus className="w-3.5 h-3.5 text-[#004C97]" /> + Cadastrar Material
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. KPIs de Estoque no Topo (Regra 13) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">Estoque MP</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-700 font-mono">
                {kpis ? kpis.rawMaterialTons.toLocaleString('pt-BR') : '0'}
              </span>
              <span className="text-xs font-bold text-slate-400">t</span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">Matéria-Prima / Tarugos</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
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
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Pulmão Intermediário L1/L2
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
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
            <span className="text-[9px] text-slate-400 block mt-0.5">
              Disponível para Expedição
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Abaixo do Mínimo
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-xl font-black font-mono ${kpis && kpis.itemsBelowMinCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}
              >
                {kpis ? kpis.itemsBelowMinCount : 0}
              </span>
              <span className="text-xs font-bold text-slate-400">itens</span>
            </div>
            <span className="text-[9px] text-rose-500 block mt-0.5">Risco de abastecimento</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Acima do Máximo
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-xl font-black font-mono ${kpis && kpis.itemsAboveMaxCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}
              >
                {kpis ? kpis.itemsAboveMaxCount : 0}
              </span>
              <span className="text-xs font-bold text-slate-400">itens</span>
            </div>
            <span className="text-[9px] text-amber-500 block mt-0.5">Excesso / Pátio saturado</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Sem Saldo (Zerados)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-xl font-black font-mono ${kpis && kpis.itemsZeroStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}
              >
                {kpis ? kpis.itemsZeroStockCount : 0}
              </span>
              <span className="text-xs font-bold text-slate-400">itens</span>
            </div>
            <span className="text-[9px] text-slate-400 block mt-0.5">Saldo zero no SAP</span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              Itens Monitorados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-slate-900 font-mono">
                {kpis ? kpis.totalItemsCount : 0}
              </span>
              <span className="text-xs font-bold text-slate-400">SKUs</span>
            </div>
            <span className="text-[9px] text-emerald-600 block mt-0.5">
              Catálogo operacional ativo
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filtros Avançados de Pesquisa */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar por código do material, descrição, depósito ou lote SAP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-300 text-xs text-slate-900 h-8 placeholder:text-slate-400"
          />
        </div>

        <div>
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2.5 h-8 font-medium focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todos os Centros SAP</option>
            <option value="1000">1000 - Planta Divinópolis</option>
            <option value="2000">2000 - Planta Contagem</option>
          </select>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2.5 h-8 font-medium focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todas as Categorias PCP</option>
            <option value="RAW_MATERIAL">Matéria-Prima (MP)</option>
            <option value="SEMI_FINISHED">Semiacabado</option>
            <option value="FINISHED_GOOD">Produto Acabado</option>
            <option value="OTHER">Outros</option>
          </select>
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2.5 h-8 font-medium focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          >
            <option value="ALL">Todos os Níveis de Estoque</option>
            <option value="BELOW_MIN">Abaixo do Mínimo</option>
            <option value="ABOVE_MAX">Acima do Máximo</option>
            <option value="ZERO_STOCK">Saldo Zerado</option>
          </select>
        </div>
      </div>

      {/* 4. Visualização Hierárquica / Drill-down: CIAFAL -> Centro -> Depósito -> Categoria -> Materiais */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 flex flex-col items-center gap-2.5 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
          <span className="text-xs font-semibold">Carregando catálogo de estoques...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State Conforme Regra 2 */
        <div className="p-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <Warehouse className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">
              Nenhum estoque sincronizado com o SAP.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhum saldo foi retornado para os filtros selecionados. Clique em "Sincronizar SAP"
              para disparar a carga oficial ou cadastre parâmetros de estoque operacional.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleSyncSap}
              disabled={syncing}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sincronizar com SAP
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewItemModalOpen(true)}
              className="border-slate-300 text-slate-700 text-xs font-semibold h-8"
            >
              + Cadastrar Parâmetro
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedHierarchy).map(([plantCode, storages]) => {
            const isPlantOpen = expandedCentros[plantCode] ?? true
            const plantName =
              plantCode === '1000' || plantCode === 'DIV'
                ? 'Planta Divinópolis (1000)'
                : 'Planta Contagem (2000)'
            const plantItemsCount = Object.values(storages).flatMap((s) =>
              Object.values(s).flat(),
            ).length
            const plantTotalTons = Object.values(storages)
              .flatMap((s) => Object.values(s).flat())
              .reduce((sum, i) => sum + i.qty_unrestricted, 0)

            return (
              <Card key={plantCode} className="bg-white border-slate-200 shadow-sm overflow-hidden">
                {/* Cabeçalho do Centro */}
                <div
                  onClick={() => toggleCentro(plantCode)}
                  className="p-3 bg-slate-100 hover:bg-slate-150 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <button className="text-slate-500 hover:text-slate-900 focus:outline-none">
                      {isPlantOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <Building className="w-4 h-4 text-[#004C97]" />
                    <span className="font-bold text-sm text-slate-900">{plantName}</span>
                    <Badge className="bg-slate-200 text-slate-800 text-[10px] font-mono font-bold border-slate-300">
                      {plantItemsCount} itens
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
                    <span>
                      Saldo Disponível:{' '}
                      <strong className="text-[#004C97] text-sm">
                        {plantTotalTons.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Conteúdo do Centro: Depósitos */}
                {isPlantOpen && (
                  <div className="p-3 space-y-3 bg-slate-50/50">
                    {Object.entries(storages).map(([storageLoc, categories]) => {
                      const depKey = `${plantCode}_${storageLoc}`
                      const isDepOpen = expandedDepositos[depKey] ?? true
                      const depItems = Object.values(categories).flat()
                      const depTotalTons = depItems.reduce((sum, i) => sum + i.qty_unrestricted, 0)

                      return (
                        <div
                          key={storageLoc}
                          className="border border-slate-200 rounded-lg bg-white overflow-hidden"
                        >
                          {/* Cabeçalho do Depósito */}
                          <div
                            onClick={() => toggleDeposito(depKey)}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <button className="text-slate-400 hover:text-slate-700">
                                {isDepOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <Warehouse className="w-3.5 h-3.5 text-slate-600" />
                              <span className="font-bold text-xs text-slate-800 font-mono">
                                Depósito SAP {storageLoc}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                ({depItems[0]?.storage_location_name || 'Armazenagem Padrão'})
                              </span>
                            </div>

                            <div className="text-xs font-mono text-slate-600">
                              Total Depósito:{' '}
                              <strong className="text-slate-900">
                                {depTotalTons.toFixed(1)} t
                              </strong>
                            </div>
                          </div>

                          {/* Tabela de Materiais por Categoria */}
                          {isDepOpen && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                                    <th className="py-2 px-3">Código SAP</th>
                                    <th className="py-2 px-3">Descrição do Material</th>
                                    <th className="py-2 px-3">Categoria</th>
                                    <th className="py-2 px-3">Lote</th>
                                    <th className="py-2 px-3 text-right">Disponível (t)</th>
                                    <th className="py-2 px-3 text-right">Bloqueado (t)</th>
                                    <th className="py-2 px-3 text-right">Qualidade (t)</th>
                                    <th className="py-2 px-3 text-right">Reservado (t)</th>
                                    <th className="py-2 px-3 text-right">Total (t)</th>
                                    <th className="py-2 px-3 text-center">Mín / Máx</th>
                                    <th className="py-2 px-3 text-center">Origem</th>
                                    <th className="py-2 px-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {depItems.map((item) => {
                                    const isBelowMin =
                                      item.min_stock !== undefined &&
                                      item.qty_unrestricted < item.min_stock
                                    const isAboveMax =
                                      item.max_stock !== undefined &&
                                      item.qty_unrestricted > item.max_stock

                                    return (
                                      <tr
                                        key={item.id}
                                        className="hover:bg-blue-50/50 transition-colors"
                                      >
                                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                                          {item.material_code}
                                        </td>
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          {item.material_description}
                                        </td>
                                        <td className="py-2 px-3">
                                          {getCategoryBadge(item.category)}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-slate-500 text-[11px]">
                                          {item.batch_number || '--'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-[#004C97]">
                                          {item.qty_unrestricted.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 1,
                                          })}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                                          {item.qty_blocked ? item.qty_blocked.toFixed(1) : '0.0'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                                          {item.qty_in_quality
                                            ? item.qty_in_quality.toFixed(1)
                                            : '0.0'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                                          {item.qty_reserved ? item.qty_reserved.toFixed(1) : '0.0'}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                          {item.qty_total.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 1,
                                          })}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                                          {item.min_stock ?? '--'} / {item.max_stock ?? '--'}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <Badge
                                            className={`text-[9px] font-mono ${
                                              item.source_mode === 'SAP'
                                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                            }`}
                                          >
                                            {item.source_mode}
                                          </Badge>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {isBelowMin ? (
                                            <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                                              Abaixo Mínimo
                                            </Badge>
                                          ) : isAboveMax ? (
                                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                                              Acima Máximo
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                                              Normal
                                            </Badge>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal: Cadastro Manual de Material / Saldo (apenas para modo manual) */}
      <Dialog open={isNewItemModalOpen} onOpenChange={setIsNewItemModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cadastrar Saldo de Estoque Operacional
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 text-xs py-2">
            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Centro SAP</Label>
              <select
                value={newItemData.plant_code}
                onChange={(e) => setNewItemData({ ...newItemData, plant_code: e.target.value })}
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
              >
                <option value="1000">1000 - Planta Divinópolis</option>
                <option value="2000">2000 - Planta Contagem</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Depósito SAP</Label>
              <Input
                placeholder="Ex: 0001"
                value={newItemData.storage_location}
                onChange={(e) =>
                  setNewItemData({ ...newItemData, storage_location: e.target.value })
                }
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-[11px] font-semibold text-slate-700">Categoria PCP</Label>
              <select
                value={newItemData.category}
                onChange={(e) =>
                  setNewItemData({ ...newItemData, category: e.target.value as InventoryCategory })
                }
                className="w-full mt-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
              >
                <option value="RAW_MATERIAL">RAW_MATERIAL (Matéria-Prima)</option>
                <option value="SEMI_FINISHED">SEMI_FINISHED (Semiacabado)</option>
                <option value="FINISHED_GOOD">FINISHED_GOOD (Produto Acabado)</option>
                <option value="OTHER">OTHER (Outros)</option>
              </select>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Código do Material</Label>
              <Input
                placeholder="Ex: TB-5050-1020"
                value={newItemData.material_code}
                onChange={(e) => setNewItemData({ ...newItemData, material_code: e.target.value })}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Lote (Opcional)</Label>
              <Input
                placeholder="Ex: LT-2026-001"
                value={newItemData.batch_number}
                onChange={(e) => setNewItemData({ ...newItemData, batch_number: e.target.value })}
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-[11px] font-semibold text-slate-700">
                Descrição do Material
              </Label>
              <Input
                placeholder="Ex: Tubo Industrial 50x50x2.00mm SAE 1020"
                value={newItemData.material_description}
                onChange={(e) =>
                  setNewItemData({ ...newItemData, material_description: e.target.value })
                }
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">
                Saldo Disponível (t)
              </Label>
              <Input
                type="number"
                value={newItemData.qty_unrestricted}
                onChange={(e) =>
                  setNewItemData({
                    ...newItemData,
                    qty_unrestricted: parseFloat(e.target.value) || 0,
                  })
                }
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Estoque Mínimo (t)</Label>
              <Input
                type="number"
                value={newItemData.min_stock}
                onChange={(e) =>
                  setNewItemData({ ...newItemData, min_stock: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 bg-slate-50 border-slate-300 text-xs h-8"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNewItemModalOpen(false)}
              className="border-slate-300 text-slate-700 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreateManualItem}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Salvar Saldo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InventoryManagementPage
