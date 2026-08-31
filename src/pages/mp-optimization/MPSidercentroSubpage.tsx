import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Boxes,
  Database,
  Layers,
  CalendarRange,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Sliders,
  FileSpreadsheet,
  ArrowRight,
  Eye,
  CheckCircle2,
  RefreshCw,
  Search,
  Settings,
  HelpCircle,
  Building2,
} from 'lucide-react'
import {
  MPSdcStockSource,
  MPSdcPool,
  MPSdcMinStockParameter,
  MPSdcDailyConsumption,
  MPSdcL2PlannedVsRealized,
  MPSdcSteelMatrixRow,
  MPSdcRuptureAlert,
  MPSdcCockpitKpis,
  RiskTrafficLight,
  SdcSteelConclusion,
} from '@/types/mp-optimization'
import { mpSdcService } from '@/services/mp-sidercentro-service'
import { MPSdcProjectionEngine } from '@/services/mp-sdc-projection-engine'
import { SdcSimulationModal } from '@/components/mp-optimization/SdcSimulationModal'
import { SdcParametersModal } from '@/components/mp-optimization/SdcParametersModal'
import { SdcStockSourcesModal } from '@/components/mp-optimization/SdcStockSourcesModal'
import { SdcPoolsModal } from '@/components/mp-optimization/SdcPoolsModal'
import { SdcBalanceCompositionModal } from '@/components/mp-optimization/SdcBalanceCompositionModal'
import { SdcLegacyComparisonModal } from '@/components/mp-optimization/SdcLegacyComparisonModal'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import { useToast } from '@/hooks/use-toast'

export const MPSidercentroSubpage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Estados dos Dados
  const [sources, setSources] = useState<MPSdcStockSource[]>([])
  const [pools, setPools] = useState<MPSdcPool[]>([])
  const [minParameters, setMinParameters] = useState<MPSdcMinStockParameter[]>([])
  const [dailyConsumptions, setDailyConsumptions] = useState<MPSdcDailyConsumption[]>([])
  const [l2PxR, setL2PxR] = useState<MPSdcL2PlannedVsRealized[]>([])
  const [matrixRows, setMatrixRows] = useState<MPSdcSteelMatrixRow[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Filtros
  const [filterText, setFilterText] = useState('')
  const [selectedPoolFilter, setSelectedPoolFilter] = useState('TODOS')
  const [selectedHorizon, setSelectedHorizon] = useState<'DIARIO' | 'SEMANAL' | 'MENSAL'>('SEMANAL')
  const [selectedSteelDetail, setSelectedSteelDetail] = useState<MPSdcSteelMatrixRow | null>(null)

  // Modais
  const [isSimModalOpen, setIsSimModalOpen] = useState(false)
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false)
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false)
  const [isPoolsModalOpen, setIsPoolsModalOpen] = useState(false)
  const [isCompositionModalOpen, setIsCompositionModalOpen] = useState(false)
  const [isLegacyModalOpen, setIsLegacyModalOpen] = useState(false)
  const [explainPayload, setExplainPayload] = useState<any>(null)

  // Carregar Dados
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const [s, p, m, c, l, mx] = await Promise.all([
          mpSdcService.getStockSources(),
          mpSdcService.getPools(),
          mpSdcService.getMinStockParameters(),
          mpSdcService.getDailyConsumptions(),
          mpSdcService.getL2PlannedVsRealized(),
          mpSdcService.getSteelMatrixRows(),
        ])
        setSources(s)
        setPools(p)
        setMinParameters(m)
        setDailyConsumptions(c)
        setL2PxR(l)
        setMatrixRows(mx)
      } catch (err) {
        console.warn('Erro ao carregar dados SDC:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // KPIs do Cockpit
  const cockpitKpis: MPSdcCockpitKpis = useMemo(() => {
    return mpSdcService.calculateCockpitKpis(matrixRows, l2PxR)
  }, [matrixRows, l2PxR])

  // Alertas de Ruptura
  const ruptureAlerts: MPSdcRuptureAlert[] = useMemo(() => {
    return mpSdcService.generateRuptureAlerts(matrixRows)
  }, [matrixRows])

  // Linhas Filtradas da Matriz
  const filteredMatrixRows = useMemo(() => {
    return matrixRows.filter((r) => {
      const matchText =
        !filterText ||
        r.steel_grade.toLowerCase().includes(filterText.toLowerCase()) ||
        r.steel_class.toLowerCase().includes(filterText.toLowerCase())
      const matchPool =
        selectedPoolFilter === 'TODOS' ||
        (r.pool_code && r.pool_code === selectedPoolFilter) ||
        (!r.pool_code && selectedPoolFilter === 'SEM_POOL')
      return matchText && matchPool
    })
  }, [matrixRows, filterText, selectedPoolFilter])

  // Salvar Parâmetro Mínimo
  const handleSaveMinParam = async (param: Partial<MPSdcMinStockParameter>) => {
    const saved = await mpSdcService.saveMinStockParameter(param)
    setMinParameters((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    toast({
      title: 'Parâmetro Atualizado',
      description: `Estoque mínimo de ${saved.steel_grade} configurado para ${saved.min_stock_tons} t.`,
    })
  }

  // Salvar Fonte de Estoque
  const handleSaveSource = async (source: Partial<MPSdcStockSource>) => {
    const saved = await mpSdcService.saveStockSource(source)
    setSources((prev) => {
      const idx = prev.findIndex((s) => s.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    toast({
      title: 'Fonte de Estoque Atualizada',
      description: `Depósito ${saved.storage_deposit} (${saved.company_code}) salvo com sucesso.`,
    })
  }

  // Salvar Pool
  const handleSavePool = async (pool: Partial<MPSdcPool>) => {
    const saved = await mpSdcService.savePool(pool)
    setPools((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    toast({
      title: 'Pool de MP Salvo',
      description: `Pool ${saved.pool_name} configurado com sucesso.`,
    })
  }

  return (
    <MPModuleLayout
      activeTopic="materia-prima-sidercentro"
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLegacyModalOpen(true)}
            className="h-8 text-xs font-semibold bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-[#004C97]" /> Comparar c/ Legado
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSourcesModalOpen(true)}
            className="h-8 text-xs font-semibold bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <Database className="w-3.5 h-3.5 mr-1 text-slate-600" /> Fontes & Depósitos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPoolsModalOpen(true)}
            className="h-8 text-xs font-semibold bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-slate-600" /> Pools de MP
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsParamsModalOpen(true)}
            className="h-8 text-xs font-semibold bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          >
            <Settings className="w-3.5 h-3.5 mr-1 text-slate-600" /> Estoque Mínimo
          </Button>
          <Button
            size="sm"
            onClick={() => setIsSimModalOpen(true)}
            className="h-8 text-xs font-semibold bg-[#004C97] hover:bg-[#003870] text-white shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 mr-1" /> Simular Cenários SDC
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Banner de Posicionamento Oficial da Sidercentro */}
        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#004C97] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                OPERAÇÃO SIDERCENTRO (SDC) &bull; CONTROLE INTEGRADO
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                Motor Único Central CIAFAL
              </Badge>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Disponibilidade & Projeção de Matéria-Prima — Sidercentro
            </h2>
            <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
              Segregação transparente entre <strong>MP CIAFAL</strong> (própria),{' '}
              <strong>MP Sidercentro</strong> (DS03) e <strong>MP Compartilhável/Elegível</strong>{' '}
              (DP04, KS, Sucata). Projeção diária/semanal/mensal acoplada à Produção L2 e ordens do
              PCP.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Aderência da Produção L2
              </span>
              <span className="font-mono font-extrabold text-[#004C97] text-sm">
                {cockpitKpis.l2_adherence_pct}%
              </span>
            </div>
            <div className="h-7 w-[1px] bg-slate-300" />
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                Primeira Ruptura
              </span>
              <span className="font-mono font-bold text-amber-700 text-xs">
                {cockpitKpis.first_rupture_steel} ({cockpitKpis.first_rupture_date})
              </span>
            </div>
          </div>
        </div>

        {/* COCKPIT DE CARDS EXECUTIVOS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Card 1: Estoque SDC */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Estoque SDC (DS03)
                </span>
                <Boxes className="w-3.5 h-3.5 text-[#004C97]" />
              </div>
              <div className="text-lg font-black text-slate-900 font-mono">
                {cockpitKpis.stock_sdc_tons.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} t
              </div>
              <span className="text-[10px] text-slate-500 block">
                Material físico exclusivo SDC
              </span>
            </CardContent>
          </Card>

          {/* Card 2: CIAFAL Elegível */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  CIAFAL Elegível (DP04)
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-black text-blue-700 font-mono">
                +
                {cockpitKpis.stock_ciafal_eligible_tons.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                })}{' '}
                t
              </div>
              <span className="text-[10px] text-slate-500 block">Autorizado por regra técnica</span>
            </CardContent>
          </Card>

          {/* Card 3: Sucata + KS */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  KS + Sucata Utilizável
                </span>
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-emerald-700 font-mono">
                +
                {(cockpitKpis.stock_ks_eligible_tons + cockpitKpis.stock_usable_scrap_tons).toFixed(
                  1,
                )}{' '}
                t
              </div>
              <span className="text-[10px] text-slate-500 block">
                Reclassificado p/ aproveitamento
              </span>
            </CardContent>
          </Card>

          {/* Card 4: Produção L2 */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Produção Prevista L2
                </span>
                <TrendingUp className="w-3.5 h-3.5 text-[#004C97]" />
              </div>
              <div className="text-lg font-black text-[#004C97] font-mono">
                +
                {cockpitKpis.projected_l2_prod_tons.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                })}{' '}
                t
              </div>
              <span className="text-[10px] text-slate-500 block">Alimentação útil programada</span>
            </CardContent>
          </Card>

          {/* Card 5: Consumo Programado SDC */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Consumo Programado SDC
                </span>
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-lg font-black text-rose-700 font-mono">
                -
                {cockpitKpis.programmed_sdc_consumption_tons.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                })}{' '}
                t
              </div>
              <span className="text-[10px] text-slate-500 block">
                Ordens oficiais de corte e dobra
              </span>
            </CardContent>
          </Card>

          {/* Card 6: Saldo Projetado & Cobertura */}
          <Card className="bg-blue-50/40 border-blue-200 shadow-xs">
            <CardContent className="p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#004C97]">
                  Saldo Projetado
                </span>
                <Badge className="bg-[#004C97] text-white text-[9px] px-1 py-0 font-bold">
                  {cockpitKpis.avg_coverage_days}d
                </Badge>
              </div>
              <div className="text-lg font-black text-slate-900 font-mono">
                {cockpitKpis.projected_balance_tons.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                })}{' '}
                t
              </div>
              <span className="text-[10px] text-slate-600 block">
                {cockpitKpis.steels_below_min_count} aços abaixo do mínimo
              </span>
            </CardContent>
          </Card>
        </div>

        {/* ALERTAS DE RUPTURA PROJETADA (AUTOMÁTICOS) */}
        {ruptureAlerts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Painel de Rupturas Projetadas & Mitigações Imediatas
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {ruptureAlerts.length} itens demandam intervenção ou avanço de campanha L2
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {ruptureAlerts.slice(0, 3).map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">
                      {al.steel_grade} ({al.steel_class})
                    </span>
                    <Badge
                      className={`text-[9px] px-1.5 py-0 ${
                        al.severity === 'CRITICO'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Ruptura em {al.estimated_date}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <strong>Déficit:</strong> {al.missing_quantity_tons} t &bull;{' '}
                    <strong>Produção L2 necessária:</strong> {al.needed_l2_production_tons} t
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight bg-white/80 p-2 rounded border border-amber-200/60">
                    {al.recommended_action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABELAS E DETALHES OPERACIONAIS */}
        <Tabs defaultValue="MATRIZ" className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <TabsList className="bg-slate-100 p-1 rounded-lg">
              <TabsTrigger value="MATRIZ" className="text-xs font-semibold">
                Matriz de Estoque por Aço
              </TabsTrigger>
              <TabsTrigger value="CONSUMO" className="text-xs font-semibold">
                Consumo Diário / Semanal
              </TabsTrigger>
              <TabsTrigger value="PXR_L2" className="text-xs font-semibold">
                Previsto &times; Realizado L2
              </TabsTrigger>
              <TabsTrigger value="PRIORIDADES" className="text-xs font-semibold">
                Painel de Atenção & Prioridades
              </TabsTrigger>
            </TabsList>

            {/* Filtros da Tabela */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  placeholder="Filtrar por aço..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="h-8 pl-8 text-xs bg-white"
                />
              </div>

              <select
                value={selectedPoolFilter}
                onChange={(e) => setSelectedPoolFilter(e.target.value)}
                className="h-8 text-xs border border-slate-300 rounded px-2 bg-white text-slate-700"
              >
                <option value="TODOS">Todos os Pools</option>
                {pools.map((p) => (
                  <option key={p.pool_code} value={p.pool_code}>
                    {p.pool_name}
                  </option>
                ))}
                <option value="SEM_POOL">Aços Individuais (Sem Pool)</option>
              </select>

              <select
                value={selectedHorizon}
                onChange={(e) => setSelectedHorizon(e.target.value as any)}
                className="h-8 text-xs border border-slate-300 rounded px-2 bg-white text-slate-700 font-bold"
              >
                <option value="DIARIO">Horizonte Diário</option>
                <option value="SEMANAL">Horizonte Semanal</option>
                <option value="MENSAL">Horizonte Mensal</option>
              </select>
            </div>
          </div>

          {/* TAB 1: MATRIZ DE ESTOQUE POR AÇO */}
          <TabsContent value="MATRIZ" className="m-0 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 sticky left-0 bg-slate-50 z-10 shadow-xs">
                        Aço / Família
                      </th>
                      <th className="p-3 text-right">DS03 (SDC)</th>
                      <th className="p-3 text-right">DP04 Elegível</th>
                      <th className="p-3 text-right">KS + Sucata</th>
                      <th className="p-3 text-right">Recebimentos</th>
                      <th className="p-3 text-right font-black text-[#004C97]">Estoque Total</th>
                      <th className="p-3 text-right">Produção L2</th>
                      <th className="p-3 text-right text-rose-700">Consumo SDC</th>
                      <th className="p-3 text-right font-black text-slate-900">Saldo Projetado</th>
                      <th className="p-3 text-right text-slate-500">Estoque Mín.</th>
                      <th className="p-3 text-center">Cobertura</th>
                      <th className="p-3 text-center">Conclusão IA</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMatrixRows.map((row) => {
                      const isBelowMin = row.projected_balance_tons < row.min_stock_tons
                      return (
                        <tr
                          key={row.steel_grade}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          <td className="p-3 font-bold text-slate-900 sticky left-0 bg-white z-10 shadow-xs">
                            <div>{row.steel_grade}</div>
                            <span className="text-[10px] text-slate-500 font-normal">
                              {row.steel_class}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {row.stock_sdc_ds03_tons.toFixed(1)} t
                          </td>
                          <td className="p-3 text-right font-mono text-blue-700 font-medium">
                            {row.stock_ciafal_eligible_tons > 0
                              ? `+${row.stock_ciafal_eligible_tons.toFixed(1)} t`
                              : '-'}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-700 font-medium">
                            {row.stock_ks_tons + row.stock_usable_scrap_sdc_tons > 0
                              ? `+${(row.stock_ks_tons + row.stock_usable_scrap_sdc_tons).toFixed(1)} t`
                              : '-'}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            {row.expected_receipts_tons > 0
                              ? `+${row.expected_receipts_tons.toFixed(1)} t`
                              : '-'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-[#004C97] bg-blue-50/30">
                            {row.total_stock_tons.toFixed(1)} t
                          </td>
                          <td className="p-3 text-right font-mono text-blue-700 font-bold">
                            {row.projected_l2_useful_tons > 0
                              ? `+${row.projected_l2_useful_tons.toFixed(1)} t`
                              : '-'}
                          </td>
                          <td className="p-3 text-right font-mono text-rose-700 font-bold">
                            -{row.projected_consumption_sdc_tons.toFixed(1)} t
                          </td>
                          <td
                            className={`p-3 text-right font-mono font-black ${
                              isBelowMin ? 'text-amber-700 bg-amber-50/50' : 'text-slate-900'
                            }`}
                          >
                            {row.projected_balance_tons.toFixed(1)} t
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500 text-[11px]">
                            {row.min_stock_tons.toFixed(1)} t
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold font-mono ${
                                row.statistical_coverage_days < 15
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : row.statistical_coverage_days < 30
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {row.statistical_coverage_days}d ({row.chronological_coverage_date})
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                row.auto_conclusion === 'ESTOQUE_ADEQUADO'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.auto_conclusion === 'ESTOQUE_ABAIXO_MINIMO'
                                    ? 'bg-amber-100 text-amber-800'
                                    : row.auto_conclusion === 'PRODUCAO_PREVISTA_SUFICIENTE'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {row.auto_conclusion.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSteelDetail(row)
                                setIsCompositionModalOpen(true)
                              }}
                              className="h-7 text-xs text-blue-700 hover:bg-blue-50 font-semibold px-2"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Composição
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CONSUMO DIÁRIO / SEMANAL */}
          <TabsContent value="CONSUMO" className="m-0 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Programação Diária de Consumo SDC (Ordens Oficiais do PCP)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Consumo apurado sem digitação manual a partir de ordens SAP e sequenciamento da
                    fábrica
                  </span>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-[#004C97] text-xs font-bold">
                  Sincronizado SAP PP / PCP
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data Programada</th>
                      <th className="p-3">Semana</th>
                      <th className="p-3">Aço / Classe</th>
                      <th className="p-3">Pool Vinculado</th>
                      <th className="p-3 text-right">Previsto (t)</th>
                      <th className="p-3 text-right">Realizado (t)</th>
                      <th className="p-3">Origem da Necessidade</th>
                      <th className="p-3">Ordem PCP / SAP</th>
                      <th className="p-3">Aços Compatíveis</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {dailyConsumptions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {c.consumption_date}
                        </td>
                        <td className="p-3 font-mono text-slate-600">{c.week_ref}</td>
                        <td className="p-3 font-bold text-slate-800">{c.steel_grade}</td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          {c.pool_code || '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-700">
                          {c.programmed_tons.toFixed(2)} t
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700">
                          {c.realized_tons ? `${c.realized_tons.toFixed(2)} t` : '-'}
                        </td>
                        <td className="p-3 text-slate-600">{c.need_origin}</td>
                        <td className="p-3 font-mono text-blue-700 text-[11px]">
                          {c.production_order_ref} / {c.sap_order_ref}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {(c.compatible_steels_json || [c.steel_grade]).join(', ')}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={`text-[9px] ${
                              c.status === 'CONSUMIDO'
                                ? 'bg-slate-100 text-slate-700'
                                : c.status === 'EM_CORTE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: PREVISTO X REALIZADO L2 */}
          <TabsContent value="PXR_L2" className="m-0 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Aderência da Produção L2 (PxR) & Impacto no Estoque SDC
                  </h3>
                  <span className="text-xs text-slate-500">
                    Cruzamento determinístico: Aderência percentual &times; Saldo físico real para
                    evitar alarmes falsos
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-800 text-xs font-bold"
                >
                  Integração Programação L2
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Período</th>
                      <th className="p-3">Aço Produzido L2</th>
                      <th className="p-3 text-right">Planejado L2</th>
                      <th className="p-3 text-right">Realizado L2</th>
                      <th className="p-3 text-right">Desvio</th>
                      <th className="p-3 text-center">Aderência (%)</th>
                      <th className="p-3 text-right font-bold text-[#004C97]">Disponível SDC</th>
                      <th className="p-3">Impacto Real no Estoque SDC</th>
                      <th className="p-3 text-center">Semáforo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {l2PxR.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">{p.period_ref}</td>
                        <td className="p-3 font-bold text-slate-800">{p.steel_grade}</td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {p.planned_l2_tons.toFixed(1)} t
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {p.realized_l2_tons.toFixed(1)} t
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {p.deviation_tons >= 0
                            ? `+${p.deviation_tons.toFixed(1)}`
                            : p.deviation_tons.toFixed(1)}{' '}
                          t
                        </td>
                        <td className="p-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              p.adherence_pct >= 95
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.adherence_pct >= 80
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.adherence_pct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-[#004C97]">
                          +{p.useful_tons_for_sdc.toFixed(1)} t
                        </td>
                        <td className="p-3 text-slate-700 text-[11px] max-w-sm">
                          {p.operational_risk_summary}
                        </td>
                        <td className="p-3 text-center">
                          <div
                            className={`w-3.5 h-3.5 rounded-full mx-auto ${
                              p.traffic_light === 'VERDE'
                                ? 'bg-emerald-500'
                                : p.traffic_light === 'AMARELO'
                                  ? 'bg-amber-400'
                                  : p.traffic_light === 'LARANJA'
                                    ? 'bg-orange-500'
                                    : 'bg-rose-500'
                            }`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: PAINEL DE ATENÇÃO & PRIORIDADES */}
          <TabsContent value="PRIORIDADES" className="m-0 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Matéria-Prima que Exige Atenção (Fila Ordenada por Risco)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Ordenação estrita: Sem Cobertura &rarr; Ruptura &le; 3d &rarr; Ruptura &le; 7d
                    &rarr; Abaixo do Mínimo &rarr; Dependente L2
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {matrixRows
                  .filter(
                    (r) =>
                      r.statistical_coverage_days < 30 ||
                      r.projected_balance_tons < r.min_stock_tons,
                  )
                  .sort((a, b) => a.statistical_coverage_days - b.statistical_coverage_days)
                  .map((r, idx) => (
                    <div
                      key={r.steel_grade}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white transition-all shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-md bg-[#004C97] text-white flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {r.steel_grade}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-white">
                              {r.steel_class}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Saldo projetado:{' '}
                            <strong>{r.projected_balance_tons.toFixed(1)} t</strong> (Mínimo:{' '}
                            {r.min_stock_tons.toFixed(1)} t)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">
                            Cobertura
                          </span>
                          <span className="font-mono font-bold text-amber-700 text-xs">
                            {r.statistical_coverage_days} dias ({r.chronological_coverage_date})
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">
                            Necessidade
                          </span>
                          <span className="font-mono font-bold text-rose-700 text-xs">
                            {r.need_mp_tons > 0 ? `${r.need_mp_tons.toFixed(1)} t` : 'Sem déficit'}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSteelDetail(r)
                            setIsSimModalOpen(true)
                          }}
                          className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
                        >
                          Simular Ação
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modais de Suporte */}
      <SdcSimulationModal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        steelRows={matrixRows}
        selectedSteel={selectedSteelDetail?.steel_grade || 'Classe A'}
      />

      <SdcParametersModal
        isOpen={isParamsModalOpen}
        onClose={() => setIsParamsModalOpen(false)}
        parameters={minParameters}
        onSave={handleSaveMinParam}
      />

      <SdcStockSourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        sources={sources}
        onSave={handleSaveSource}
      />

      <SdcPoolsModal
        isOpen={isPoolsModalOpen}
        onClose={() => setIsPoolsModalOpen(false)}
        pools={pools}
        onSave={handleSavePool}
      />

      <SdcBalanceCompositionModal
        isOpen={isCompositionModalOpen}
        onClose={() => setIsCompositionModalOpen(false)}
        row={selectedSteelDetail}
      />

      <SdcLegacyComparisonModal
        isOpen={isLegacyModalOpen}
        onClose={() => setIsLegacyModalOpen(false)}
      />

      <CalculationExplainerModal
        isOpen={!!explainPayload}
        onClose={() => setExplainPayload(null)}
        payload={explainPayload}
      />
    </MPModuleLayout>
  )
}

export default MPSidercentroSubpage
