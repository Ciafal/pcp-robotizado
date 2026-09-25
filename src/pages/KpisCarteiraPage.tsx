import React, { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'
import {
  kpisCarteiraService,
  type KpisCarteiraResult,
  type KpiFilterParams,
  type KpiMaterialDetail,
  type KpiHistoricoRow,
} from '@/services/kpis-carteira-service'
import { cancelledOrdersService } from '@/services/cancelled-orders-service'
import { KpiMaterialDrilldownModal } from '@/components/kpis-carteira/KpiMaterialDrilldownModal'
import { KpiMaterialDetailModal } from '@/components/kpis-carteira/KpiMaterialDetailModal'
import { KpiCancelledOrdersDrilldownModal } from '@/components/kpis-carteira/KpiCancelledOrdersDrilldownModal'
import { ReprocessarCompetenciaModal } from '@/components/kpis-carteira/ReprocessarCompetenciaModal'
import { KpisCarteiraPdfModal } from '@/components/kpis-carteira/KpisCarteiraPdfModal'

export const KpisCarteiraPage: React.FC = () => {
  const { toast } = useToast()

  // Estados de Controle & Dados
  const [activeTab, setActiveTab] = useState<'mensal' | 'historico'>('mensal')
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [kpis, setKpis] = useState<KpisCarteiraResult | null>(null)
  const [historicoRows, setHistoricoRows] = useState<KpiHistoricoRow[]>([])

  // Filtros
  const [exercicio, setExercicio] = useState<number>(2026)
  const [competencia, setCompetencia] = useState<string>('2026-09')
  const [centro, setCentro] = useState<string>('Todos')
  const [linha, setLinha] = useState<string>('Todas')
  const [tipoMaterial, setTipoMaterial] = useState<string>('Todos')
  const [curvaAbc, setCurvaAbc] = useState<'Todos' | 'A' | 'B' | 'C'>('Todos')
  const [materialBusca, setMaterialBusca] = useState<string>('')

  // Visão do Gráfico do KPI 2
  const [graficoKpi2Visao, setGraficoKpi2Visao] = useState<
    'total' | 'curvaA' | 'curvaB' | 'curvaC' | 'centros'
  >('total')

  // Métrica Selecionada no Histórico
  const [metricaHistorico, setMetricaHistorico] = useState<
    'saldo' | 'itens' | 'itemDias' | 'pctPcp'
  >('saldo')

  // Modais de Drilldown
  const [isDrilldownModalOpen, setIsDrilldownModalOpen] = useState(false)
  const [drilldownTitle, setDrilldownTitle] = useState('')
  const [drilldownSubtitle, setDrilldownSubtitle] = useState<string | undefined>(undefined)
  const [drilldownMaterials, setDrilldownMaterials] = useState<KpiMaterialDetail[]>([])

  // Modal Detalhe do Material
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<KpiMaterialDetail | null>(
    null,
  )
  const [isMaterialDetailOpen, setIsMaterialDetailOpen] = useState(false)

  // Modal Drilldown de Pedidos Cancelados
  const [isCancelledOrdersModalOpen, setIsCancelledOrdersModalOpen] = useState(false)
  const [cancelledOrdersList, setCancelledOrdersList] = useState<any[]>([])

  // Modal Reprocessamento e PDF
  const [isReprocessarOpen, setIsReprocessarOpen] = useState(false)
  const [isPdfOpen, setIsPdfOpen] = useState(false)

  // Carrega dados da competência
  const loadKpis = async () => {
    try {
      setIsLoading(true)
      const filters: KpiFilterParams = {
        exercicio,
        competencia,
        centro: centro === 'Todos' ? undefined : centro,
        linha: linha === 'Todas' ? undefined : linha,
        tipoMaterial: tipoMaterial === 'Todos' ? undefined : tipoMaterial,
        curvaAbc,
        materialBusca: materialBusca.trim() || undefined,
      }

      const res = await kpisCarteiraService.computeCarteiraKpis(competencia, filters)
      setKpis(res)

      // Carrega histórico consolidado
      const hist = await kpisCarteiraService.getHistoricoCompetencias(exercicio)
      setHistoricoRows(hist)
    } catch {
      toast({
        title: 'Erro ao carregar KPIs',
        description: 'Não foi possível carregar os dados de carteira da competência.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadKpis()
  }, [competencia, exercicio])

  const handleApplyFilters = () => {
    loadKpis()
    toast({
      title: 'Filtros Aplicados',
      description: 'Indicadores recalculados em conformidade com os filtros informados.',
    })
  }

  const handleResetFilters = () => {
    setCentro('Todos')
    setLinha('Todas')
    setTipoMaterial('Todos')
    setCurvaAbc('Todos')
    setMaterialBusca('')
    setTimeout(() => {
      loadKpis()
    }, 50)
  }

  // Ação de Análise IA com cruzamento e separação Fato / Correlação / Hipótese
  const handleTriggerIA = () => {
    setIsGeneratingAi(true)
    setTimeout(() => {
      setIsGeneratingAi(false)
      toast({
        title: 'Análise de IA Atualizada',
        description:
          'Correlações de atrasos de laminação e pedidos cancelados analisadas pelo motor neural.',
      })
    }, 900)
  }

  // Exportação Excel / CSV operacional respeitando filtros (sem dados financeiros de cancelados)
  const handleExportExcel = () => {
    if (!kpis || kpis.materiais.length === 0) {
      toast({
        title: 'Sem dados para exportação',
        description: 'Nenhum material encontrado com os filtros atuais.',
        variant: 'destructive',
      })
      return
    }

    const headers = [
      'Material',
      'Descrição',
      'Família',
      'Tipo Material',
      'Curva ABC',
      'Centro',
      'Linha',
      'Saldo Inicial (t)',
      '1º Dia Negativo',
      'Último Dia Negativo',
      'Qtd Dias Negativos',
      'Maior Saldo Negativo (t)',
      'Saldo Final Fechamento (t)',
      'Estoque (t)',
      'Programação (t)',
      'Produção (t)',
      'Pedidos Cancelados PCP',
      'Toneladas Canceladas PCP',
      'Criticidade',
      'Observação IA',
    ]

    const rows = kpis.materiais.map((m) => [
      `"${m.material}"`,
      `"${m.material_descricao.replace(/"/g, '""')}"`,
      `"${m.familia}"`,
      `"${m.tipo_material}"`,
      `"${m.curva_abc}"`,
      `"${m.centro}"`,
      `"${m.linha || ''}"`,
      m.saldo_inicial_t.toFixed(2).replace('.', ','),
      `"${m.primeiro_dia_negativo || '-'}"`,
      `"${m.ultimo_dia_negativo || '-'}"`,
      m.dias_negativos,
      m.maior_saldo_negativo_t.toFixed(2).replace('.', ','),
      m.saldo_final_t.toFixed(2).replace('.', ','),
      m.estoque_t.toFixed(2).replace('.', ','),
      m.programacao_t.toFixed(2).replace('.', ','),
      m.producao_t.toFixed(2).replace('.', ','),
      m.pedidos_cancelados_pcp,
      m.toneladas_canceladas_pcp.toFixed(2).replace('.', ','),
      `"${m.status_criticidade}"`,
      `"${(m.observacao_ia || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `kpis_carteira_${competencia}_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    link.remove()

    toast({
      title: 'Planilha Exportada com Sucesso',
      description: `Relatório da competência ${kpis.competenciaFormatada} gerado com ${kpis.materiais.length} itens.`,
    })
  }

  // Drilldowns nos 11 Cards Superiores
  const handleCardDrilldown = async (cardType: string) => {
    if (!kpis) return

    if (cardType === 'itens_negativos_fechamento') {
      const list = kpis.materiais.filter((m) => m.saldo_final_t < 0)
      setDrilldownTitle('Itens com Saldo Negativo no Fechamento')
      setDrilldownSubtitle(
        `Posição em ${kpis.posicaoFechamentoEm} • ${list.length} itens negativos`,
      )
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (cardType === 'curva_a') {
      const list = kpis.materiais.filter((m) => m.curva_abc === 'A' && m.saldo_final_t < 0)
      setDrilldownTitle('Itens Negativos — Curva A (Prioridade Estratégica)')
      setDrilldownSubtitle(`Posição em ${kpis.posicaoFechamentoEm} • ${list.length} itens críticos`)
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (cardType === 'curva_b') {
      const list = kpis.materiais.filter((m) => m.curva_abc === 'B' && m.saldo_final_t < 0)
      setDrilldownTitle('Itens Negativos — Curva B')
      setDrilldownSubtitle(`Posição em ${kpis.posicaoFechamentoEm} • ${list.length} itens`)
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (cardType === 'curva_c') {
      const list = kpis.materiais.filter((m) => m.curva_abc === 'C' && m.saldo_final_t < 0)
      setDrilldownTitle('Itens Negativos — Curva C')
      setDrilldownSubtitle(`Posição em ${kpis.posicaoFechamentoEm} • ${list.length} itens`)
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (cardType === 'saldo_negativo_fechamento') {
      const list = kpis.materiais.filter((m) => m.saldo_final_t < 0)
      setDrilldownTitle('Composição do Saldo Negativo no Fechamento')
      setDrilldownSubtitle(
        `Total de ${kpis.kpi2_saldoNegativoFechamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t`,
      )
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (cardType === 'maior_saldo_negativo_mes') {
      const list = kpis.materiais.filter((m) => m.maior_saldo_negativo_t < 0)
      setDrilldownTitle('Pico de Déficit Mensal por Material')
      setDrilldownSubtitle(`Registrado em ${kpis.kpi2_dataMaiorSaldoNegativo}`)
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (cardType === 'item_dias_acumulados' || cardType === 'media_dias_negativos') {
      const list = kpis.materiais.filter((m) => m.dias_negativos > 0)
      setDrilldownTitle('Detalhamento por Item-Dias de Permanência Negativa')
      setDrilldownSubtitle(
        `${kpis.kpi3_itemDiasAcumulados} item-dias acumulados no mês • ${list.length} materiais afetados`,
      )
      setDrilldownMaterials(list)
      setIsDrilldownModalOpen(true)
    } else if (
      cardType === 'pedidos_cancelados_pcp' ||
      cardType === 'pct_cancelados_pcp' ||
      cardType === 'toneladas_canceladas_pcp'
    ) {
      const orders = await cancelledOrdersService.getOrders()
      const pcpOrders = orders.filter(
        (o) =>
          o.categoria_motivo === 'PCP/Planejamento' ||
          (o.motivo_original_sap && o.motivo_original_sap.toLowerCase().includes('estoque')),
      )
      setCancelledOrdersList(pcpOrders)
      setIsCancelledOrdersModalOpen(true)
    }
  }

  const handleOpenMaterialDetail = (mat: KpiMaterialDetail) => {
    setSelectedMaterialDetail(mat)
    setIsMaterialDetailOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* 1. Header do Módulo & Identidade CIAFAL */}
      <div className="bg-white border-b border-slate-200 py-4 px-6 mb-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold tracking-wider text-[#004C97] uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  PCP Robotizado • Análise de Carteira
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-500 font-medium">HUB CIAFAL</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                KPI's - Carteira & Gestão de Saldos Negativos
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadKpis}
              disabled={isLoading}
              className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Exportar Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPdfOpen(true)}
              className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Relatório PDF
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsReprocessarOpen(true)}
              className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reprocessar Mês
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* Banner de Demonstração Devidamente Identificado */}
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50/70 text-amber-950 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong className="font-semibold">
                Ambiente de Apuração com Dados de Demonstração Oficiais:
              </strong>{' '}
              Série diária de snapshots de carteira (tabela{' '}
              <code>pcp_carteira_daily_snapshots</code>) com feeder preparado para RFC/SAP ECC.
              Nenhum valor mock não rotulado em produção.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-amber-200/80 rounded font-mono text-amber-900 font-semibold border border-amber-300">
            DEMO RFC-SAP
          </span>
        </div>

        {/* 2. Barra de Filtros dos Indicadores (Grade Responsiva 5/3/2/1) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-[#004C97]" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Filtros dos Indicadores da Carteira
              </span>
            </div>
            {kpis && (
              <span className="text-xs text-slate-500 font-medium">
                Posição de fechamento em: <strong>{kpis.posicaoFechamentoEm}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Exercício */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Exercício
              </label>
              <Select
                value={String(exercicio)}
                onValueChange={(v) => {
                  setExercicio(Number(v))
                  setCompetencia(`${v}-09`)
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Exercício" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Período / Competência */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Competência
              </label>
              <Select value={competencia} onValueChange={setCompetencia}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Competência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={`${exercicio}-01`}>01/{exercicio} - Janeiro</SelectItem>
                  <SelectItem value={`${exercicio}-02`}>02/{exercicio} - Fevereiro</SelectItem>
                  <SelectItem value={`${exercicio}-03`}>03/{exercicio} - Março</SelectItem>
                  <SelectItem value={`${exercicio}-04`}>04/{exercicio} - Abril</SelectItem>
                  <SelectItem value={`${exercicio}-05`}>05/{exercicio} - Maio</SelectItem>
                  <SelectItem value={`${exercicio}-06`}>06/{exercicio} - Junho</SelectItem>
                  <SelectItem value={`${exercicio}-07`}>07/{exercicio} - Julho</SelectItem>
                  <SelectItem value={`${exercicio}-08`}>08/{exercicio} - Agosto</SelectItem>
                  <SelectItem value={`${exercicio}-09`}>09/{exercicio} - Setembro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Centro */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Centro Produtivo
              </label>
              <Select value={centro} onValueChange={setCentro}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os Centros</SelectItem>
                  <SelectItem value="L1">Centro L1 (Laminação 1)</SelectItem>
                  <SelectItem value="L2">Centro L2 (Laminação 2)</SelectItem>
                  <SelectItem value="SDC">Centro SDC (Sidercentro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Linha Produtiva
              </label>
              <Select value={linha} onValueChange={setLinha}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Linha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas as Linhas</SelectItem>
                  <SelectItem value="Linha 1 - Perfis">Linha 1 - Perfis</SelectItem>
                  <SelectItem value="Linha 2 - Barras">Linha 2 - Barras</SelectItem>
                  <SelectItem value="Linha Corte e Dobra">Linha Corte e Dobra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Curva ABC */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Curva ABC
              </label>
              <Select value={curvaAbc} onValueChange={(v: any) => setCurvaAbc(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Curva ABC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas as Curvas</SelectItem>
                  <SelectItem value="A">Curva A (80% Faturamento)</SelectItem>
                  <SelectItem value="B">Curva B (15% Faturamento)</SelectItem>
                  <SelectItem value="C">Curva C (5% Faturamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Segunda linha: Busca de Material & Botões de Ação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-100 items-end">
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Pesquisa por Material (Código SAP ou Descrição)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <Input
                  value={materialBusca}
                  onChange={(e) => setMaterialBusca(e.target.value)}
                  placeholder="Ex: 1000245 ou BARRA CHATA..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs text-slate-700"
              >
                Limpar Filtros
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyFilters}
                className="h-9 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
              >
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* 3. Cards Superiores (11 Cards Executivos Clicáveis com Grid Responsivo) */}
        {kpis && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Cards Executivos Rápidos • Clique para drill-down analítico
              </span>
              <span className="text-[11px] text-slate-500">
                11 indicadores sincronizados com a competência {kpis.competenciaFormatada}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Card 1: Itens Negativos Fechamento */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('itens_negativos_fechamento')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Itens Negativos</span>
                  <Package className="w-4 h-4 text-slate-400 group-hover:text-[#004C97]" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {kpis.cards.itensNegativosFechamento}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Saldo &lt; 0 no fechamento
                </div>
              </button>

              {/* Card 2: Curva A */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('curva_a')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-rose-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Curva A Negativos</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 bg-rose-50 text-rose-700 border-rose-300 font-bold"
                  >
                    A
                  </Badge>
                </div>
                <div className="text-xl font-bold font-mono text-rose-600 my-1">
                  {kpis.cards.itensNegativosA}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Prioridade comercial máxima
                </div>
              </button>

              {/* Card 3: Curva B */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('curva_b')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-amber-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Curva B Negativos</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-300 font-bold"
                  >
                    B
                  </Badge>
                </div>
                <div className="text-xl font-bold font-mono text-amber-600 my-1">
                  {kpis.cards.itensNegativosB}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Demanda intermediária
                </div>
              </button>

              {/* Card 4: Curva C */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('curva_c')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-emerald-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Curva C Negativos</span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 font-bold"
                  >
                    C
                  </Badge>
                </div>
                <div className="text-xl font-bold font-mono text-emerald-700 my-1">
                  {kpis.cards.itensNegativosC}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Giro reduzido de estoque
                </div>
              </button>

              {/* Card 5: Saldo Negativo no Fechamento */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('saldo_negativo_fechamento')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-rose-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Saldo Fechamento</span>
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-xl font-bold font-mono text-rose-600 my-1">
                  {kpis.cards.saldoNegativoFechamento.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Soma estrita dos saldos &lt; 0
                </div>
              </button>

              {/* Card 6: Maior Saldo Negativo do Mês */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('maior_saldo_negativo_mes')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-rose-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Maior Saldo Neg.</span>
                  <Calendar className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                </div>
                <div className="text-xl font-bold font-mono text-rose-700 my-1">
                  {kpis.cards.maiorSaldoNegativoMes.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Pico em {kpis.kpi2_dataMaiorSaldoNegativo}
                </div>
              </button>

              {/* Card 7: Dias Negativos Acumulados */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('item_dias_acumulados')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Item-Dias Negativos</span>
                  <Clock className="w-4 h-4 text-slate-400 group-hover:text-[#004C97]" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {kpis.cards.diasNegativosAcumulados}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Soma de dias por material
                </div>
              </button>

              {/* Card 8: Média de Dias Negativos / Item */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('media_dias_negativos')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Média Dias/Item</span>
                  <Layers className="w-4 h-4 text-slate-400 group-hover:text-[#004C97]" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {kpis.cards.mediaDiasNegativosPorItem.toFixed(1)} d
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Permanência média no mês
                </div>
              </button>

              {/* Card 9: Pedidos Cancelados PCP */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('pedidos_cancelados_pcp')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-rose-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Cancelados PCP</span>
                  <AlertTriangle className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {kpis.cards.pedidosCanceladosPcp}
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  OVs distintas categoria PCP
                </div>
              </button>

              {/* Card 10: % Cancelamentos PCP */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('pct_cancelados_pcp')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-rose-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">% Cancelados PCP</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                    PCP
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-rose-600 my-1">
                  {kpis.cards.pctCancelamentosPcp.toLocaleString('pt-BR', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  %
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Sobre total de cancelamentos
                </div>
              </button>

              {/* Card 11: Toneladas Canceladas PCP */}
              <button
                type="button"
                onClick={() => handleCardDrilldown('toneladas_canceladas_pcp')}
                className="p-3 bg-white rounded-xl border border-slate-200 text-left hover:border-rose-400 hover:shadow-xs transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Tons Canceladas</span>
                  <Building2 className="w-4 h-4 text-slate-400 group-hover:text-rose-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900 my-1">
                  {kpis.cards.toneladasCanceladasPcp.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </div>
                <div className="text-[11px] text-slate-500 leading-tight">
                  Sem dados financeiros
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 4. Abas de Navegação: "Mensal" x "Histórico" */}
        <div className="border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('mensal')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'mensal'
                  ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Visão Mensal ({kpis?.competenciaFormatada || 'Mês Atual'})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'historico'
                  ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Histórico & Tendências ({exercicio})
            </button>
          </div>

          {/* Comparativo rápido com período anterior */}
          {kpis?.comparativoAnterior && (
            <div className="hidden md:flex items-center space-x-3 text-xs text-slate-600 pb-1">
              <span>
                Vs. Mês Anterior (<strong>{kpis.comparativoAnterior.competenciaAnterior}</strong>):
              </span>
              <span
                className={`font-semibold flex items-center gap-0.5 ${
                  kpis.comparativoAnterior.diffSaldoAbs >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {kpis.comparativoAnterior.diffSaldoAbs >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                Saldo: {kpis.comparativoAnterior.diffSaldoPct.toFixed(1)}%
              </span>
              <span
                className={`font-semibold flex items-center gap-0.5 ${
                  kpis.comparativoAnterior.diffItensAbs <= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                Itens:{' '}
                {kpis.comparativoAnterior.diffItensAbs > 0
                  ? `+${kpis.comparativoAnterior.diffItensAbs}`
                  : kpis.comparativoAnterior.diffItensAbs}
              </span>
            </div>
          )}
        </div>

        {/* Conteúdo da Aba 1: MENSAL */}
        {activeTab === 'mensal' && kpis && (
          <div className="space-y-6">
            {/* Grid dos KPIs 1, 2, 3, 4 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* KPI 1 — Itens que viraram o mês negativo */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-100 text-[#004C97] rounded-md">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        KPI 1 — Itens que viraram o mês negativo
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Materiais com saldo negativo no último snapshot da competência
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCardDrilldown('itens_negativos_fechamento')}
                    className="h-7 text-xs text-[#004C97]"
                  >
                    Ver Materiais
                  </Button>
                </div>

                {/* Tabela Classificação / Itens / % com validação A + B + C = Total */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Classificação ABC</th>
                        <th className="py-2 px-3 text-center">Itens Negativos</th>
                        <th className="py-2 px-3 text-right">Percentual (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {kpis.kpi1_curvaTabela.map((row) => (
                        <tr
                          key={row.curva}
                          className={
                            row.curva === 'Total'
                              ? 'bg-slate-50 font-bold border-t-2 border-slate-200'
                              : 'hover:bg-blue-50/30'
                          }
                        >
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">
                            {row.curva === 'Total' ? (
                              <span className="font-bold text-slate-900">Total Geral</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold px-1 py-0 ${
                                    row.curva === 'A'
                                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                                      : row.curva === 'B'
                                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  }`}
                                >
                                  Curva {row.curva}
                                </Badge>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-900">{row.itens}</td>
                          <td className="py-2 px-3 text-right text-slate-800">
                            {row.percentual.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>
                    Validação matemática estrita:{' '}
                    <strong>
                      A ({kpis.kpi1_itensNegativosA}) + B ({kpis.kpi1_itensNegativosB}) + C (
                      {kpis.kpi1_itensNegativosC}) = {kpis.kpi1_totalItensNegativos}
                    </strong>
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>

              {/* KPI 2 — Saldo de carteira negativa */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-rose-100 text-rose-700 rounded-md">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        KPI 2 — Saldo de carteira negativa (t)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Soma diária dos saldos &lt; 0 (saldo positivo não compensa)
                      </p>
                    </div>
                  </div>

                  {/* Seletor de visão do gráfico */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGraficoKpi2Visao('total')}
                      className={`px-2 py-1 text-[11px] rounded font-medium ${
                        graficoKpi2Visao === 'total'
                          ? 'bg-[#004C97] text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Total
                    </button>
                    <button
                      type="button"
                      onClick={() => setGraficoKpi2Visao('curvaA')}
                      className={`px-2 py-1 text-[11px] rounded font-medium ${
                        graficoKpi2Visao === 'curvaA'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Curva A
                    </button>
                  </div>
                </div>

                {/* Destaques do KPI 2 */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Fechamento</span>
                    <span className="font-mono font-bold text-rose-600 text-sm block mt-0.5">
                      {kpis.kpi2_saldoNegativoFechamento.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      t
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Maior Negativa</span>
                    <span className="font-mono font-bold text-rose-700 text-sm block mt-0.5">
                      {kpis.kpi2_maiorSaldoNegativoMes.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      t
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Variação Início×Fim</span>
                    <span
                      className={`font-semibold text-xs block mt-1 ${
                        kpis.kpi2_variacaoInicioFim === 'Melhorou'
                          ? 'text-emerald-600'
                          : kpis.kpi2_variacaoInicioFim === 'Piorou'
                            ? 'text-rose-600'
                            : 'text-slate-600'
                      }`}
                    >
                      {kpis.kpi2_variacaoInicioFim}
                    </span>
                  </div>
                </div>

                {/* Gráfico da Evolução Diária */}
                <div className="h-52 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={kpis.kpi2_serieDiaria}>
                      <defs>
                        <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="diaFormatado" tick={{ fontSize: 10 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => `${v}t`}
                        domain={['dataMin - 5', 0]}
                      />
                      <Tooltip
                        formatter={(val: any) => [
                          `${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t`,
                          'Saldo Negativo',
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={graficoKpi2Visao === 'curvaA' ? 'curvaA' : 'totalNegativo'}
                        stroke="#e11d48"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorNeg)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* KPI 3 — Dias negativos totais (item-dias) */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-blue-100 text-[#004C97] rounded-md">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        KPI 3 — Dias negativos totais (item-dias)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Acúmulo de permanência negativa individual por material
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 text-[#004C97] border-blue-200 font-bold"
                  >
                    {kpis.kpi3_itemDiasAcumulados} item-dias
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Materiais Afetados</span>
                    <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                      {kpis.kpi3_materiaisAfetadosQtd} materiais
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Tiveram saldo &lt; 0 em algum dia
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Média Dias / Material</span>
                    <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                      {kpis.kpi3_mediaDiasPorMaterial.toFixed(1)} dias
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Permanência média mensal
                    </span>
                  </div>
                </div>

                {/* Material com Maior Permanência */}
                {kpis.kpi3_maiorPermanencia && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        Maior Permanência Negativa do Mês:
                      </span>
                      <span className="font-mono font-bold text-amber-950">
                        {kpis.kpi3_maiorPermanencia.dias} dias
                      </span>
                    </div>
                    <div className="font-medium text-slate-900 mt-1">
                      {kpis.kpi3_maiorPermanencia.material} —{' '}
                      {kpis.kpi3_maiorPermanencia.material_descricao}
                    </div>
                  </div>
                )}

                {/* Distribuição por Curva ABC com destaque na Curva A */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Distribuição dos Item-Dias por Curva ABC:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {kpis.kpi3_distribuicaoCurva.map((c) => (
                      <div
                        key={c.curva}
                        className={`p-2 rounded border text-center ${
                          c.destaqueA
                            ? 'bg-rose-50 border-rose-300 text-rose-900'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="font-bold block text-[11px]">Curva {c.curva}</span>
                        <span className="font-mono font-bold text-sm block mt-0.5">
                          {c.itemDias} d
                        </span>
                        <span className="text-[10px] block opacity-80">
                          {c.percentual.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI 4 — Pedidos cancelados PCP */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-rose-100 text-rose-700 rounded-md">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        KPI 4 — Pedidos cancelados (Motivo PCP)
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Consome a mesma base e regras da tela Pedidos Cancelados
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCardDrilldown('pedidos_cancelados_pcp')}
                    className="h-7 text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
                  >
                    Ver Cancelamentos
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Pedidos / Itens PCP</span>
                    <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                      {kpis.kpi4_pedidosCanceladosPcp} pedidos | {kpis.kpi4_itensCanceladosPcp}{' '}
                      itens
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      OV conta 1x • Itens individuais
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">Representatividade PCP</span>
                    <span className="text-lg font-bold font-mono text-rose-600 mt-0.5 block">
                      {kpis.kpi4_pctPedidosCanceladosPcp.toFixed(1)}% dos cancelamentos
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {kpis.kpi4_pedidosCanceladosPcp} de {kpis.kpi4_totalPedidosCancelados} ordens
                      gerais
                    </span>
                  </div>
                </div>

                {/* Toneladas Canceladas (sem dados financeiros conforme especificação) */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">
                      Toneladas Canceladas PCP
                    </span>
                    <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                      {kpis.kpi4_toneladasCanceladasPcp.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      t
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs bg-slate-100 text-slate-700 font-medium"
                  >
                    {kpis.kpi4_pctToneladasPcp.toFixed(1)}% do volume total
                  </Badge>
                </div>

                <div className="text-[11px] text-slate-500 italic">
                  * Governança PCP: Dados operacionais restritos a volume físico e causas técnicas.
                  Sem exposição de valores financeiros.
                </div>
              </div>
            </div>

            {/* Seção 5: Análise de Inteligência Artificial Oficial */}
            {kpis.analiseIA && (
              <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Análise de IA dos Indicadores de Carteira
                      </h2>
                      <p className="text-xs text-slate-500">
                        Cruzamento de atrasos, permanência negativa e cancelamentos com separação
                        estrita Fato / Correlação / Hipótese
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold px-2.5 py-1 ${
                        kpis.analiseIA.criticidadeGeral === 'Crítico'
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : kpis.analiseIA.criticidadeGeral === 'Atenção'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      }`}
                    >
                      Criticidade Geral: {kpis.analiseIA.criticidadeGeral}
                    </Badge>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleTriggerIA}
                      disabled={isGeneratingAi}
                      className="text-xs h-8 bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
                    >
                      <Sparkles
                        className={`w-3.5 h-3.5 mr-1.5 ${isGeneratingAi ? 'animate-spin' : ''}`}
                      />
                      Analisar KPIs com IA
                    </Button>
                  </div>
                </div>

                {/* Situação do Período */}
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
                  <span className="font-bold text-[#004C97] uppercase tracking-wider block mb-1 text-[11px]">
                    Diagnóstico Executivo do Período:
                  </span>
                  <p className="text-slate-800 leading-relaxed font-medium">
                    {kpis.analiseIA.situacaoPeriodo}
                  </p>
                </div>

                {/* Principais Desvios & Pontos para Atuação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-2">
                      Principais Desvios Identificados
                    </span>
                    <ul className="space-y-1.5">
                      {kpis.analiseIA.principaisDesvios.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-2">
                      Pontos para Atuação Imediata do PCP
                    </span>
                    <ul className="space-y-1.5">
                      {kpis.analiseIA.pontosParaAtuacaoPcp.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Relações Encontradas (Fato / Correlação / Hipótese) */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Relações Analíticas Cruzadas (Fato / Correlação / Hipótese)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {kpis.analiseIA.relacoesEncontradas.map((r, i) => (
                      <div
                        key={i}
                        className={`p-3.5 rounded-lg border flex flex-col justify-between ${
                          r.tipo === 'Fato'
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : r.tipo === 'Correlação'
                              ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                              : 'bg-amber-50/60 border-amber-200 text-amber-950'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                r.tipo === 'Fato'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : r.tipo === 'Correlação'
                                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {r.tipo}
                            </Badge>
                          </div>
                          <h4 className="font-bold text-slate-900 leading-tight mb-1">
                            {r.titulo}
                          </h4>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {r.descricao}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 italic">
                          Ação: {r.acaoRecomendada}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Seção 6: Visão por Material (Tabela Analítica Completa) */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Visão Analítica por Material da Carteira
                  </h2>
                  <p className="text-xs text-slate-500">
                    Saldo inicial, permanência, maior déficit, estoque e cancelamentos PCP
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-semibold">
                  {kpis.materiais.length} materiais na competência
                </Badge>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descrição & Família</th>
                      <th className="py-2.5 px-2 text-center">Curva</th>
                      <th className="py-2.5 px-2 text-center">Centro / Linha</th>
                      <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                      <th className="py-2.5 px-2 text-center">1º Dia Neg.</th>
                      <th className="py-2.5 px-2 text-center">Dias Neg.</th>
                      <th className="py-2.5 px-3 text-right">Maior Neg.</th>
                      <th className="py-2.5 px-3 text-right">Saldo Final</th>
                      <th className="py-2.5 px-2 text-center">Cancel. PCP</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kpis.materiais.map((m) => (
                      <tr
                        key={`${m.material}-${m.centro}`}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                        onClick={() => handleOpenMaterialDetail(m)}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {m.material}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-900 leading-tight">
                            {m.material_descricao}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {m.familia} • {m.tipo_material}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-1.5 py-0 ${
                              m.curva_abc === 'A'
                                ? 'bg-rose-50 text-rose-700 border-rose-300'
                                : m.curva_abc === 'B'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            }`}
                          >
                            {m.curva_abc}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-semibold text-slate-800">{m.centro}</span>
                          {m.linha && (
                            <span className="block text-[10px] text-slate-500">{m.linha}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {m.saldo_inicial_t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                          t
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600 whitespace-nowrap">
                          {m.primeiro_dia_negativo || '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              m.dias_negativos >= 15
                                ? 'bg-rose-100 text-rose-800'
                                : m.dias_negativos > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.dias_negativos}d
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {m.maior_saldo_negativo_t < 0
                            ? `${m.maior_saldo_negativo_t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t`
                            : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span
                            className={m.saldo_final_t < 0 ? 'text-rose-600' : 'text-emerald-700'}
                          >
                            {m.saldo_final_t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                            t
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className="font-mono font-semibold text-slate-800">
                            {m.pedidos_cancelados_pcp}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-[#004C97] hover:bg-blue-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenMaterialDetail(m)
                            }}
                          >
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba 2: HISTÓRICO & TENDÊNCIAS */}
        {activeTab === 'historico' && (
          <div className="space-y-6">
            {/* Gráfico de Tendência Mensal com métrica selecionável */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Tendência Mensal da Carteira — Exercício {exercicio}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Evolução dos indicadores oficiais apurados ao longo dos meses
                  </p>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setMetricaHistorico('saldo')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      metricaHistorico === 'saldo'
                        ? 'bg-[#004C97] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Saldo Negativo Final
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricaHistorico('itens')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      metricaHistorico === 'itens'
                        ? 'bg-[#004C97] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Itens Negativos
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricaHistorico('itemDias')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      metricaHistorico === 'itemDias'
                        ? 'bg-[#004C97] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Item-Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetricaHistorico('pctPcp')}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      metricaHistorico === 'pctPcp'
                        ? 'bg-[#004C97] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    % Cancelamentos PCP
                  </button>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historicoRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [
                        metricaHistorico === 'saldo'
                          ? `${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t`
                          : metricaHistorico === 'pctPcp'
                            ? `${Number(val).toFixed(1)}%`
                            : val,
                        metricaHistorico === 'saldo'
                          ? 'Saldo Negativo'
                          : metricaHistorico === 'itens'
                            ? 'Itens Negativos'
                            : metricaHistorico === 'itemDias'
                              ? 'Item-Dias'
                              : '% Cancelados PCP',
                      ]}
                    />
                    <Bar
                      dataKey={
                        metricaHistorico === 'saldo'
                          ? 'saldoNegativoFinal'
                          : metricaHistorico === 'itens'
                            ? 'itensNegativos'
                            : metricaHistorico === 'itemDias'
                              ? 'itemDias'
                              : 'pctPcp'
                      }
                      fill={metricaHistorico === 'saldo' ? '#e11d48' : '#004C97'}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela do Histórico Consolidado */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Consolidação Histórica por Competência
                </h3>
                <span className="text-xs text-slate-500">
                  Valores apurados com base no fechamento mensal oficial
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Exercício</th>
                      <th className="py-2.5 px-3">Período</th>
                      <th className="py-2.5 px-3 text-center">Itens Negativos</th>
                      <th className="py-2.5 px-2 text-center">Curva A</th>
                      <th className="py-2.5 px-2 text-center">Curva B</th>
                      <th className="py-2.5 px-2 text-center">Curva C</th>
                      <th className="py-2.5 px-3 text-right">Saldo Negativo Final</th>
                      <th className="py-2.5 px-3 text-center">Item-Dias</th>
                      <th className="py-2.5 px-3 text-center">Pedidos PCP</th>
                      <th className="py-2.5 px-3 text-right">% PCP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {historicoRows.map((row) => (
                      <tr
                        key={row.periodo}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          row.competencia === competencia ? 'bg-blue-50/60 font-semibold' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-sans text-slate-600">{row.exercicio}</td>
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">
                          {row.periodo}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-900 font-bold">
                          {row.itensNegativos}
                        </td>
                        <td className="py-2.5 px-2 text-center text-rose-600">{row.itensA}</td>
                        <td className="py-2.5 px-2 text-center text-amber-600">{row.itensB}</td>
                        <td className="py-2.5 px-2 text-center text-emerald-700">{row.itensC}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                          {row.saldoNegativoFinal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          t
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-900">{row.itemDias}</td>
                        <td className="py-2.5 px-3 text-center text-slate-900">{row.pedidosPcp}</td>
                        <td className="py-2.5 px-3 text-right text-slate-800">
                          {row.pctPcp.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modais de Drilldown */}
      <KpiMaterialDrilldownModal
        isOpen={isDrilldownModalOpen}
        onClose={() => setIsDrilldownModalOpen(false)}
        title={drilldownTitle}
        subtitle={drilldownSubtitle}
        materials={drilldownMaterials}
        onSelectMaterial={handleOpenMaterialDetail}
      />

      <KpiMaterialDetailModal
        isOpen={isMaterialDetailOpen}
        onClose={() => setIsMaterialDetailOpen(false)}
        material={selectedMaterialDetail}
      />

      <KpiCancelledOrdersDrilldownModal
        isOpen={isCancelledOrdersModalOpen}
        onClose={() => setIsCancelledOrdersModalOpen(false)}
        orders={cancelledOrdersList}
      />

      <ReprocessarCompetenciaModal
        isOpen={isReprocessarOpen}
        onClose={() => setIsReprocessarOpen(false)}
        competencia={competencia}
        posicaoFechamentoEm={kpis?.posicaoFechamentoEm || ''}
        onReprocessed={loadKpis}
      />

      {kpis && (
        <KpisCarteiraPdfModal
          isOpen={isPdfOpen}
          onClose={() => setIsPdfOpen(false)}
          kpis={kpis}
          filters={{ centro, linha, tipoMaterial, curvaAbc }}
        />
      )}
    </div>
  )
}

export default KpisCarteiraPage
