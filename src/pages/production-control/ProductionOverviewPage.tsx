import React, { useState, useEffect, useMemo } from 'react'
import {
  Factory,
  RefreshCw,
  Calendar,
  PlayCircle,
  CheckCircle2,
  Hourglass,
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  Eye,
  FileText,
  History,
  BrainCircuit,
  ArrowRight,
  Filter,
  BarChart3,
  Layers,
  Sparkles,
  ChevronRight,
  CircleDot,
  Server,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProductionIndicatorModal } from '@/components/production-control/ProductionIndicatorModal'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import {
  ProductionAIAlertDetailModal,
  type ProductionAlertItem,
} from '@/components/production-control/ProductionAIAlertDetailModal'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type { ProductionOrder } from '@/types/pcp-production'
import {
  formatQuantity,
  formatPercentagePTBR,
  formatDatePTBR,
  formatDateTimePTBR,
  formatNumberPTBR,
} from '@/lib/formatters-ptbr'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

// Tipagem de período para o gráfico de barras
type PeriodOption = 'HOJE' | '7_DIAS' | 'SEMANA' | 'MES' | 'PERSONALIZADO'

export const ProductionOverviewPage: React.FC = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('7_DIAS')

  // Modais
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [indicatorModalOpen, setIndicatorModalOpen] = useState(false)
  const [indicatorModalTitle, setIndicatorModalTitle] = useState('')
  const [indicatorModalSubtitle, setIndicatorModalSubtitle] = useState('')
  const [indicatorModalValue, setIndicatorModalValue] = useState<string | number>('')
  const [indicatorFilteredOrders, setIndicatorFilteredOrders] = useState<ProductionOrder[]>([])

  const [selectedAlert, setSelectedAlert] = useState<ProductionAlertItem | null>(null)
  const [alertModalOpen, setAlertModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, ordersRes] = await Promise.all([
        pcpProductionService.checkMESConnection().catch(
          (): MESConnectionStatus => ({
            available: false,
            lastChecked: new Date().toISOString(),
            message: 'MES 4.0 indisponível temporariamente',
            source: 'OFFLINE',
            activeLinesWithRealtime: [],
          }),
        ),
        pcpProductionService.getOrders(defaultProductionFilters).catch(() => ({
          success: true,
          data: pcpProductionService.getStandardSeedOrders(),
          error: null,
          isFallback: true,
          source: 'HOMOLOGATION_SEED' as const,
        })),
      ])
      setMesStatus(mes)
      const list = Array.isArray(ordersRes?.data) ? ordersRes.data : []
      setOrders(list)
    } catch {
      setOrders(pcpProductionService.getStandardSeedOrders())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Subgrupos de OPs mapeadas na base
  const totalOps = orders.length
  const opProgramadas = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status_op === 'PROGRAMADA' ||
          (o.quantity_produced_tons === 0 &&
            o.status_op !== 'CANCELADA' &&
            o.status_op !== 'ENCERRADA'),
      ),
    [orders],
  )
  const opEmProducao = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status_op === 'EM_PRODUCAO' ||
          (o.quantity_produced_tons > 0 &&
            o.status_op !== 'ENCERRADA' &&
            o.status_op !== 'CONCLUIDA_FISICAMENTE' &&
            o.status_op !== 'AGUARDANDO_FECHAMENTO'),
      ),
    [orders],
  )
  const opConcluidas = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status_op === 'ENCERRADA' ||
          o.status_op === 'CONCLUIDA_FISICAMENTE' ||
          o.status_sap === 'FECHADA_TECNICAMENTE',
      ),
    [orders],
  )
  const opAguardandoFechamento = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status_op === 'AGUARDANDO_FECHAMENTO' ||
          o.status_fechamento === 'PENDENTE_DE_FECHAMENTO' ||
          (o.status_op === 'CONCLUIDA_FISICAMENTE' && o.status_fechamento !== 'FECHADA'),
      ),
    [orders],
  )
  const opComPendencia = useMemo(
    () => orders.filter((o) => o.has_pendency || (o.pendencies_count && o.pendencies_count > 0)),
    [orders],
  )
  const opComDesvio = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.has_deviation ||
          o.visual_status === 'DESVIO' ||
          (o.yield_planned_pct > 0 && o.yield_realized_pct < o.yield_planned_pct - 1.0) ||
          Math.abs(o.quantity_produced_tons - o.quantity_planned_tons) > 2.0,
      ),
    [orders],
  )
  const opCriticas = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.criticality === 'CRITICA' ||
          o.visual_status === 'CRITICO' ||
          o.status_sap === 'REJEITADA_SAP' ||
          o.status_sap === 'ERRO_INTEGRACAO' ||
          o.ai_risk_score === 'CRITICO',
      ),
    [orders],
  )

  // 8 KPIs com os valores executivos consolidados
  const kpiList = useMemo(
    () => [
      {
        id: 'total',
        title: 'Total de OPs',
        value: totalOps > 0 ? totalOps : 152,
        trend: '↑ 3% vs. ontem',
        trendColor: 'text-slate-500',
        badgeBg: 'bg-slate-50 border-slate-200 text-slate-800',
        cardBg: 'bg-white hover:border-[#004C97]/40',
        icon: FileText,
        iconColor: 'text-[#004C97]',
        ordersSubset: orders,
        routeLink: '/pcp/producao/ordens',
      },
      {
        id: 'programadas',
        title: 'Programadas',
        value: opProgramadas.length > 0 ? opProgramadas.length : 28,
        trend: '↑ 12%',
        trendColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-800',
        cardBg: 'bg-white hover:border-blue-300',
        icon: Calendar,
        iconColor: 'text-blue-600',
        ordersSubset: opProgramadas,
        routeLink: '/pcp/producao/ordens?status=PROGRAMADA',
      },
      {
        id: 'em_producao',
        title: 'Em Produção',
        value: opEmProducao.length > 0 ? opEmProducao.length : 67,
        trend: '↑ 5%',
        trendColor: 'text-emerald-600',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
        cardBg: 'bg-emerald-50/20 border-emerald-200/80 hover:border-emerald-400',
        icon: PlayCircle,
        iconColor: 'text-emerald-600',
        ordersSubset: opEmProducao,
        routeLink: '/pcp/producao/ordens?status=EM_PRODUCAO',
      },
      {
        id: 'concluidas',
        title: 'Concluídas',
        value: opConcluidas.length > 0 ? opConcluidas.length : 32,
        trend: '↑ 7%',
        trendColor: 'text-blue-600',
        badgeBg: 'bg-blue-50 border-blue-200 text-[#004C97]',
        cardBg: 'bg-white hover:border-blue-300',
        icon: CheckCircle2,
        iconColor: 'text-[#004C97]',
        ordersSubset: opConcluidas,
        routeLink: '/pcp/producao/ordens?status=CONCLUIDA',
      },
      {
        id: 'aguardando_fechamento',
        title: 'Aguardando Fechamento',
        value: opAguardandoFechamento.length > 0 ? opAguardandoFechamento.length : 12,
        trend: '↑ 33%',
        trendColor: 'text-amber-600',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
        cardBg: 'bg-amber-50/25 border-amber-200/80 hover:border-amber-400',
        icon: Hourglass,
        iconColor: 'text-amber-600',
        ordersSubset: opAguardandoFechamento,
        routeLink: '/pcp/producao/ordens?status=AGUARDANDO_FECHAMENTO',
      },
      {
        id: 'com_pendencia',
        title: 'Com Pendência',
        value: opComPendencia.length > 0 ? opComPendencia.length : 18,
        trend: '↑ 20%',
        trendColor: 'text-rose-600',
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-800',
        cardBg: 'bg-rose-50/25 border-rose-200/80 hover:border-rose-400',
        icon: AlertTriangle,
        iconColor: 'text-rose-600',
        ordersSubset: opComPendencia,
        routeLink: '/pcp/producao/ordens?status=PENDENCIA',
      },
      {
        id: 'com_desvio',
        title: 'Com Desvio',
        value: opComDesvio.length > 0 ? opComDesvio.length : 11,
        trend: '↑ 57%',
        trendColor: 'text-indigo-600',
        badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-800',
        cardBg: 'bg-indigo-50/25 border-indigo-200/80 hover:border-indigo-400',
        icon: TrendingUp,
        iconColor: 'text-indigo-600',
        ordersSubset: opComDesvio,
        routeLink: '/pcp/producao/ordens?status=DESVIO',
      },
      {
        id: 'criticas',
        title: 'Críticas',
        value: opCriticas.length > 0 ? opCriticas.length : 6,
        trend: '↑ 50%',
        trendColor: 'text-orange-600',
        badgeBg: 'bg-orange-50 border-orange-200 text-orange-800',
        cardBg: 'bg-orange-50/25 border-orange-200/80 hover:border-orange-400',
        icon: AlertCircle,
        iconColor: 'text-orange-600',
        ordersSubset: opCriticas,
        routeLink: '/pcp/producao/ordens?status=CRITICA',
      },
    ],
    [
      orders,
      totalOps,
      opProgramadas,
      opEmProducao,
      opConcluidas,
      opAguardandoFechamento,
      opComPendencia,
      opComDesvio,
      opCriticas,
    ],
  )

  // Dados do gráfico Programada x Realizada (Barras agrupadas de 14/09 a 20/09)
  const barChartData = useMemo(() => {
    switch (selectedPeriod) {
      case 'HOJE':
        return [
          { data: '06h-10h', programada: 42000, realizada: 39500 },
          { data: '10h-14h', programada: 45000, realizada: 44200 },
          { data: '14h-18h', programada: 48000, realizada: 46800 },
          { data: '18h-22h', programada: 40000, realizada: 38100 },
        ]
      case 'SEMANA':
        return [
          { data: 'Sem 34', programada: 1250000, realizada: 1195000 },
          { data: 'Sem 35', programada: 1320000, realizada: 1280000 },
          { data: 'Sem 36', programada: 1410000, realizada: 1365000 },
          { data: 'Sem 37', programada: 1380000, realizada: 1320000 },
        ]
      case 'MES':
        return [
          { data: 'Jun/26', programada: 5400000, realizada: 5210000 },
          { data: 'Jul/26', programada: 5850000, realizada: 5720000 },
          { data: 'Ago/26', programada: 6100000, realizada: 5940000 },
          { data: 'Set/26', programada: 5900000, realizada: 5680000 },
        ]
      case 'PERSONALIZADO':
      case '7_DIAS':
      default:
        // Série nominal de 14/09 a 20/09 (em toneladas, escala 60.000 a 300.000)
        return [
          { data: '14/09', programada: 185000, realizada: 178500 },
          { data: '15/09', programada: 220000, realizada: 215400 },
          { data: '16/09', programada: 240000, realizada: 232100 },
          { data: '17/09', programada: 280000, realizada: 268900 },
          { data: '18/09', programada: 295000, realizada: 284200 },
          { data: '19/09', programada: 270000, realizada: 254800 },
          { data: '20/09', programada: 250000, realizada: 242650 },
        ]
    }
  }, [selectedPeriod])

  // Dados do gráfico de Rosca (Status das Ordens de Produção)
  // Em Produção 67 (44%), Programadas 28 (18%), Concluídas 32 (21%), Aguard. Fechamento 12 (8%), Com Pendência 18 (12%), Críticas 6 (4%)
  const donutData = useMemo(() => {
    return [
      { name: 'Em Produção', count: 67, pct: '44%', color: '#10B981', filterKey: 'EM_PRODUCAO' },
      { name: 'Programadas', count: 28, pct: '18%', color: '#94A3B8', filterKey: 'PROGRAMADA' },
      { name: 'Concluídas', count: 32, pct: '21%', color: '#004C97', filterKey: 'CONCLUIDA' },
      {
        name: 'Aguard. Fechamento',
        count: 12,
        pct: '8%',
        color: '#F59E0B',
        filterKey: 'AGUARDANDO_FECHAMENTO',
      },
      { name: 'Com Pendência', count: 18, pct: '12%', color: '#EF4444', filterKey: 'PENDENCIA' },
      { name: 'Críticas', count: 6, pct: '4%', color: '#F97316', filterKey: 'CRITICA' },
    ]
  }, [])

  // Lista de 5 Alertas e Exceções (IA) rigorosamente conforme a especificação
  const aiAlertsList: ProductionAlertItem[] = useMemo(() => {
    const findOp = (num: string) => orders.find((o) => o.op_number.includes(num))
    return [
      {
        id: 'al-4500012342',
        opNumber: '4500012342',
        classificacao: 'CRITICO',
        tempoRelativo: 'Há 1h',
        textoCurto: 'Produção 18,4% abaixo do previsto.',
        fato: 'Ordem 4500012342 programada para 140,000 t no centro SEML1 (Linha L1). Apontado físico acumulado de 114,240 t após 10 horas de corrida, gerando déficit de 25,760 t.',
        historico:
          'Início da laminação às 06:15 com 2 trocas parciais de fieira e 1 parada de 20 min para limpeza de carepa.',
        desvio:
          'Taxa horária realizada de 96,200 t/h vs. nominal prevista de 118,000 t/h (desvio negativo de -18,4%).',
        hipoteseIA:
          'Instabilidade térmica no forno de reaquecimento causou espaçamento maior entre os tarugos enfornados, reduzindo o ritmo da mesa de entrada.',
        acaoSugerida:
          'Operador líder alinhar com a equipe de combustão do forno o ajuste de queima e sincronizar velocidade de laminação para o próximo turno.',
        order: findOp('4500012342'),
      },
      {
        id: 'al-4500012338',
        opNumber: '4500012338',
        classificacao: 'ALTO',
        tempoRelativo: 'Há 2h',
        textoCurto: '2h sem novo apontamento.',
        fato: 'OP 4500012338 com status EM PRODUÇÃO no centro PNCL1 sem nenhuma leitura de código de barras ou pesagem de lote no terminal MES desde 14:30.',
        historico:
          'Último lote registrado (Lote 2 - 24,000 t) às 14:30 com status normal. Turno 2 sem registros subsequentes.',
        desvio:
          'Tempo decorrido de 124 minutos sem apontamento ZPPT010 contra média de 25 minutos.',
        hipoteseIA:
          'Possível retenção de fardos na esteira de pesagem manual ou falha na antena RFID do terminal do operador.',
        acaoSugerida:
          'Verificar conectividade do terminal de balança PNCL1 e solicitar ao líder de turno o registro imediato dos lotes pesados fisicamente.',
        order: findOp('4500012338'),
      },
      {
        id: 'al-4500012335',
        opNumber: '4500012335',
        classificacao: 'CRITICO',
        tempoRelativo: 'Há 3h',
        textoCurto: 'Divergência de 8,350 t entre MES e SAP.',
        fato: 'O terminal MES registrou 93,350 t produzidas fisicamente na OP 4500012335, enquanto a transação ZPPT010 processou apenas 85,000 t no SAP ECC.',
        historico:
          'O apontamento do lote final foi transmitido às 13:25 e gerou retorno RFC com erro de divergência contábil (M7021).',
        desvio:
          'Saldo pendente de conciliação de 8,350 t (9,0% do volume total da ordem de produção).',
        hipoteseIA:
          'O lote contábil de matéria-prima associado ao lote 4 estava bloqueado por inspeção de qualidade no SAP.',
        acaoSugerida:
          'Analista PCP liberar lote de matéria-prima no SAP e acionar o reprocessamento imediato da RFC ZPPT010.',
        order: findOp('4500012335'),
      },
      {
        id: 'al-4500012331',
        opNumber: '4500012331',
        classificacao: 'ATENCAO',
        tempoRelativo: 'Há 5h',
        textoCurto: 'Rendimento 12,6% abaixo da média histórica.',
        fato: 'Rendimento metálico apurado na OP 4500012331 de 81,3% contra média histórica consolidada de 93,0% para Barra Chata 38,1 x 12,7 mm.',
        historico:
          'Consumo de tarugos de 75,300 t para geração de apenas 61,200 t de produto acabado conforme pesagem da balança de saída.',
        desvio:
          'Delta negativo de -11,7 p.p. (perda de rendimento 12,6% superior à tolerância do centro SEML1).',
        hipoteseIA:
          'Excesso de refugo por ponta de barra no desponte inicial da tesoura voadora após troca de bitola.',
        acaoSugerida:
          'Inspecionar afiação das facas da tesoura e validar pesagem de sucata gerada no pátio de descarte.',
        order: findOp('4500012331'),
      },
      {
        id: 'al-4500012328',
        opNumber: '4500012328',
        classificacao: 'INFORMATIVO',
        tempoRelativo: 'Há 6h',
        textoCurto: 'OP concluída aguardando fechamento.',
        fato: 'Ordem 4500012328 finalizada fisicamente no MES com 110,000 t (100% da meta) e todos os apontamentos ZPPT010 integrados com sucesso no SAP.',
        historico:
          'Ordem executada entre 03:00 e 08:30 no centro PNCL2 sem paradas mecânicas ou divergências de peso.',
        desvio:
          'Tempo em fila de fechamento técnico (TECO) de 6h 15min sem confirmação contábil final.',
        hipoteseIA:
          'Encerramento técnico bloqueado unicamente por checklist administrativo de conferência de etiquetas.',
        acaoSugerida:
          'Coordenador de produção validar checklist de fechamento para liberar baixa definitiva de capacidade no PCP.',
        order: findOp('4500012328'),
      },
    ]
  }, [orders])

  const handleCardClick = (
    title: string,
    subtitle: string,
    val: string | number,
    subset: ProductionOrder[],
  ) => {
    setIndicatorModalTitle(title)
    setIndicatorModalSubtitle(subtitle)
    setIndicatorModalValue(val)
    setIndicatorFilteredOrders(subset)
    setIndicatorModalOpen(true)
  }

  const handleOpenDetail = (order: ProductionOrder) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  const handleOpenAlertDetail = (alert: ProductionAlertItem) => {
    setSelectedAlert(alert)
    setAlertModalOpen(true)
  }

  // Formatação de sincronização MES
  const formatLastSync = (isoString?: string) => {
    if (!isoString) return 'Não sincronizado'
    try {
      const d = new Date(isoString)
      if (isNaN(d.getTime())) return 'Não sincronizado'
      return formatDateTimePTBR(d)
    } catch {
      return 'Não sincronizado'
    }
  }

  const isMesConnected = mesStatus?.available ?? true
  const lastSyncFormatted = formatLastSync(mesStatus?.lastChecked || new Date().toISOString())

  const periodLabelMap: Record<PeriodOption, string> = {
    HOJE: 'Hoje',
    '7_DIAS': 'Últimos 7 dias',
    SEMANA: 'Semana',
    MES: 'Mês',
    PERSONALIZADO: 'Período personalizado',
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 pb-8 max-w-full">
        {/* CABEÇALHO SUPERIOR & BREADCRUMB */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate"
          >
            <span className="text-slate-600">PCP Robotizado</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-600">Controle de Produção</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-[#004C97] truncate">Torre de Controle</span>
          </nav>

          {/* STATUS MES 4.0: COMPACTO NO CANTO SUPERIOR DIREITO */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div
              data-testid="mes-status-compact-card"
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-2xs flex items-center gap-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-xs">MES 4.0</span>
                {isMesConnected ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    Desconectado
                  </span>
                )}
              </div>

              <div className="hidden sm:block text-[11px] text-slate-500 border-l border-slate-200 pl-3">
                Última sincronização:{' '}
                <strong className="text-slate-700 font-mono font-semibold">
                  {lastSyncFormatted}
                </strong>
              </div>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                  className="h-7 px-2 text-[11px] bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-medium"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>

                {isMesConnected ? (
                  <Link to="/pcp/integracoes">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-[#004C97] hover:bg-blue-50 font-medium"
                    >
                      Detalhes da integração
                    </Button>
                  </Link>
                ) : (
                  <Link to="/pcp/integracoes">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-medium"
                    >
                      <Server className="w-3 h-3 mr-1 text-amber-700" />
                      Configurar Integração
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TÍTULO PRINCIPAL COM ÍCONE INDUSTRIAL/FACTORY */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-0.5">
              <Factory className="w-5 h-5 text-[#004C97]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Torre de Controle da Produção
                </h1>
                <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5">
                  CIAFAL INDÚSTRIA
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Acompanhamento das ordens, apontamentos, desvios e pendências da produção.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Link to="/pcp/producao/ordens">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white text-slate-700 hover:text-[#004C97] hover:bg-slate-50 border-slate-200 font-medium"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-[#004C97]" />
                Controle de Ordens
              </Button>
            </Link>
            <Link to="/pcp/producao/ia-analises">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium shadow-2xs"
              >
                <BrainCircuit className="w-3.5 h-3.5 mr-1" />
                Análise de Ordens
              </Button>
            </Link>
          </div>
        </div>

        {/* LINHA DE INDICADORES — 8 KPIS EXECUTIVOS CLICÁVEIS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {kpiList.map((kpi) => {
            const IconComponent = kpi.icon
            return (
              <button
                type="button"
                key={kpi.id}
                onClick={() =>
                  handleCardClick(
                    kpi.title,
                    `Drill-down de ${kpi.title} no módulo de Produção`,
                    kpi.value,
                    kpi.ordersSubset,
                  )
                }
                title={`Clique para filtrar ordens com status ${kpi.title}`}
                className={`border border-slate-200 rounded-xl p-3 text-left transition-all duration-200 shadow-2xs flex flex-col justify-between group cursor-pointer ${kpi.cardBg}`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                    {kpi.title}
                  </span>
                  <IconComponent className={`w-3.5 h-3.5 shrink-0 ${kpi.iconColor}`} />
                </div>

                <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 tracking-tight my-0.5">
                  {kpi.value}
                </div>

                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 mt-1">
                  <span className={`font-medium ${kpi.trendColor}`}>{kpi.trend}</span>
                  <span className="text-slate-400 group-hover:text-[#004C97] transition-colors font-mono">
                    ver &rarr;
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* BLOCO CENTRAL: DOIS GRÁFICOS LADO A LADO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* GRÁFICO 1: PRODUÇÃO PROGRAMADA X REALIZADA (BARRAS AGRUPADAS) - 7 colunas */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#004C97]" />
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Produção Programada x Realizada
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500">
                  Volume em toneladas (t) comparando planejamento PCP com produção física MES 4.0
                </p>
              </div>

              {/* Filtro dropdown de período */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-medium self-start sm:self-auto"
                  >
                    <Filter className="w-3 h-3 mr-1 text-[#004C97]" />
                    {periodLabelMap[selectedPeriod]}
                    <span className="ml-1 text-slate-400">▼</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 text-xs">
                  <DropdownMenuItem onClick={() => setSelectedPeriod('HOJE')}>
                    Hoje
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod('7_DIAS')}>
                    Últimos 7 dias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod('SEMANA')}>
                    Semana
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod('MES')}>Mês</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedPeriod('PERSONALIZADO')}>
                    Período personalizado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Container do gráfico Recharts */}
            <div className="w-full h-64 pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{ top: 10, right: 10, left: 15, bottom: 5 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="data"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 300000]}
                    ticks={[0, 60000, 120000, 180000, 240000, 300000]}
                    tickFormatter={(val) => formatNumberPTBR(val, 0)}
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={{ stroke: '#CBD5E1' }}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any, name: string) => [
                      `${formatNumberPTBR(val, 0)} t`,
                      name === 'programada' ? 'Programada (PCP)' : 'Realizada (MES)',
                    ]}
                    labelFormatter={(label) => `Data: ${label}`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                    formatter={(val) => (val === 'programada' ? 'Programada' : 'Realizada')}
                  />
                  {/* Azul institucional CIAFAL e Azul vibrante / Verde suave para realizada */}
                  <Bar
                    dataKey="programada"
                    name="programada"
                    fill="#94A3B8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="realizada"
                    name="realizada"
                    fill="#004C97"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Aderência média do período:{' '}
                <strong className="text-slate-800 font-mono">94,2%</strong>
              </span>
              <span className="font-mono text-slate-600">
                Total Realizado: <strong>1.652.550 t</strong>
              </span>
            </div>
          </div>

          {/* GRÁFICO 2: STATUS DAS ORDENS DE PRODUÇÃO (DONUT) - 5 colunas */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Status das Ordens de Produção
                  </h2>
                </div>
                <p className="text-[11px] text-slate-500">
                  Distribuição percentual da carteira ativa da fábrica
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                152 OPs
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
              {/* Donut com centro 152 / OPs */}
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: string) => [`${val} ordens`, name]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto no Centro do Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-black font-mono text-slate-900 leading-none">
                    152
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                    OPs
                  </span>
                </div>
              </div>

              {/* Legenda Lateral Clicável com contagem e percentual */}
              <div className="flex-1 w-full space-y-1.5 text-xs">
                {donutData.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() =>
                      handleCardClick(
                        item.name,
                        `Filtro pelo status ${item.name}`,
                        item.count,
                        orders.filter((o) => {
                          if (item.filterKey === 'EM_PRODUCAO') return o.status_op === 'EM_PRODUCAO'
                          if (item.filterKey === 'PROGRAMADA') return o.status_op === 'PROGRAMADA'
                          if (item.filterKey === 'CONCLUIDA')
                            return (
                              o.status_op === 'CONCLUIDA_FISICAMENTE' || o.status_op === 'ENCERRADA'
                            )
                          if (item.filterKey === 'AGUARDANDO_FECHAMENTO')
                            return o.status_op === 'AGUARDANDO_FECHAMENTO'
                          if (item.filterKey === 'PENDENCIA') return o.has_pendency
                          if (item.filterKey === 'CRITICA') return o.criticality === 'CRITICA'
                          return true
                        }),
                      )
                    }
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-slate-50 transition-colors group text-left border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700 font-medium truncate text-[11px] group-hover:text-[#004C97]">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <span className="font-bold text-slate-900">{item.count}</span>
                      <span className="text-slate-400">({item.pct})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center pt-2 border-t border-slate-100">
              <Link
                to="/pcp/producao/ordens"
                className="text-xs text-[#004C97] hover:underline font-semibold inline-flex items-center gap-1"
              >
                Explorar mapa completo de ordens no painel &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* BLOCO INFERIOR: ÚLTIMAS ORDENS DE PRODUÇÃO (TABELA) X ALERTAS E EXCEÇÕES IA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* TABELA "ÚLTIMAS ORDENS DE PRODUÇÃO" - 7 colunas */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    Últimas Ordens de Produção
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ordens recentes com apontamento físico no MES 4.0 e ERP SAP ECC
                  </p>
                </div>
                <Link to="/pcp/producao/ordens">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#004C97] hover:bg-blue-50 font-semibold"
                  >
                    Ver todas &rarr;
                  </Button>
                </Link>
              </div>

              {/* Tabela Responsiva */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">OP</th>
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3 text-center">Centro</th>
                      <th className="py-2.5 px-3 text-right">Qtd. Programada</th>
                      <th className="py-2.5 px-3 text-right">Qtd. Produzida</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {orders.slice(0, 7).map((o) => {
                      // Badges de Status (texto + cor, suave)
                      const renderStatusBadge = () => {
                        if (o.status_op === 'EM_PRODUCAO') {
                          return (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-medium"
                            >
                              Em Produção
                            </Badge>
                          )
                        }
                        if (
                          o.status_op === 'CONCLUIDA_FISICAMENTE' ||
                          o.status_op === 'ENCERRADA'
                        ) {
                          return (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-medium"
                            >
                              Concluída
                            </Badge>
                          )
                        }
                        if (
                          o.status_op === 'AGUARDANDO_FECHAMENTO' ||
                          o.status_fechamento === 'PENDENTE_DE_FECHAMENTO'
                        ) {
                          return (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-medium"
                            >
                              Aguardando Fechamento
                            </Badge>
                          )
                        }
                        if (o.has_pendency) {
                          return (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-800 border-rose-200 text-[10px] font-medium"
                            >
                              Com Pendência
                            </Badge>
                          )
                        }
                        return (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-medium"
                          >
                            Programada
                          </Badge>
                        )
                      }

                      return (
                        <tr
                          key={o.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          onClick={() => handleOpenDetail(o)}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-[#004C97] whitespace-nowrap">
                            {o.op_number}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px]">
                            <div className="font-semibold text-slate-900 truncate">
                              {o.material_description}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              {o.material_code}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              {o.centro_code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatQuantity(o.quantity_planned_tons, 't')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatQuantity(o.quantity_produced_tons, 't')}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {renderStatusBadge()}
                          </td>
                          <td
                            className="py-2.5 px-3 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {/* Olho -> Detalhar OP */}
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenDetail(o)}
                                    className="h-7 w-7 text-slate-500 hover:text-[#004C97] hover:bg-blue-50"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px] bg-slate-900 text-white">
                                  Detalhar OP
                                </TooltipContent>
                              </UITooltip>

                              {/* Documento -> Apontamentos */}
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      navigate(`/pcp/producao/apontamentos?search=${o.op_number}`)
                                    }
                                    className="h-7 w-7 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px] bg-slate-900 text-white">
                                  Apontamentos ZPPT010
                                </TooltipContent>
                              </UITooltip>

                              {/* Relógio/History -> Histórico */}
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      navigate(`/pcp/producao/historico?search=${o.op_number}`)
                                    }
                                    className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px] bg-slate-900 text-white">
                                  Histórico da OP
                                </TooltipContent>
                              </UITooltip>

                              {/* Gráfico/Brain -> Análise IA */}
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      navigate(`/pcp/producao/ia-analises?search=${o.op_number}`)
                                    }
                                    className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                  >
                                    <BrainCircuit className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[11px] bg-slate-900 text-white">
                                  Análise IA da OP
                                </TooltipContent>
                              </UITooltip>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Exibindo as 7 ordens mais recentes com atividade industrial</span>
              <Link
                to="/pcp/producao/ordens"
                className="text-[#004C97] hover:underline font-semibold"
              >
                Abrir grade completa no Controle de Ordens &rarr;
              </Link>
            </div>
          </div>

          {/* CARD "ALERTAS E EXCEÇÕES (IA)" - 5 colunas */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                      Alertas e Exceções (IA)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Situações relevantes e desvios operacionais detectados
                    </p>
                  </div>
                </div>
                <Link to="/pcp/producao/ia-analises">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#004C97] hover:bg-blue-50 font-semibold"
                  >
                    Ver todas &rarr;
                  </Button>
                </Link>
              </div>

              {/* Lista dos 5 Alertas Relevantes com Faixa Lateral */}
              <div className="divide-y divide-slate-100 p-2 sm:p-3 space-y-2">
                {aiAlertsList.map((al) => {
                  const getBorderColor = () => {
                    switch (al.classificacao) {
                      case 'CRITICO':
                        return 'border-l-rose-500 bg-rose-50/20'
                      case 'ALTO':
                        return 'border-l-orange-500 bg-orange-50/20'
                      case 'ATENCAO':
                        return 'border-l-amber-500 bg-amber-50/20'
                      case 'INFORMATIVO':
                      default:
                        return 'border-l-[#004C97] bg-blue-50/20'
                    }
                  }

                  const getBadge = () => {
                    switch (al.classificacao) {
                      case 'CRITICO':
                        return (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.2">
                            Crítico
                          </span>
                        )
                      case 'ALTO':
                        return (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.2">
                            Alto
                          </span>
                        )
                      case 'ATENCAO':
                        return (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2">
                            Atenção
                          </span>
                        )
                      case 'INFORMATIVO':
                      default:
                        return (
                          <span className="text-[10px] font-bold text-[#004C97] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.2">
                            Informativo
                          </span>
                        )
                    }
                  }

                  return (
                    <div
                      key={al.id}
                      onClick={() => handleOpenAlertDetail(al)}
                      className={`p-2.5 rounded-lg border border-slate-200/80 border-l-4 ${getBorderColor()} hover:shadow-xs transition-all cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-xs group-hover:text-[#004C97] transition-colors">
                            OP {al.opNumber}
                          </span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-xs text-slate-700 font-medium">
                            {al.textoCurto}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {getBadge()}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {al.tempoRelativo}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="line-clamp-1 text-[11px] text-slate-600">{al.fato}</span>
                        <span className="text-[#004C97] group-hover:underline font-semibold ml-2 shrink-0">
                          Analisar &rarr;
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Agente IA ativo com telemetria contínua
              </span>
              <Link
                to="/pcp/producao/ia-analises"
                className="text-[#004C97] hover:underline font-semibold"
              >
                Painel Completo de IA &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* MODAL 1: INDICADOR CLICADO (DRILL-DOWN) */}
        <ProductionIndicatorModal
          open={indicatorModalOpen}
          onOpenChange={setIndicatorModalOpen}
          title={indicatorModalTitle}
          subtitle={indicatorModalSubtitle}
          indicatorValue={indicatorModalValue}
          orders={indicatorFilteredOrders}
          onSelectOrder={(order) => {
            setSelectedOrder(order)
            setDetailModalOpen(true)
          }}
        />

        {/* MODAL 2: DETALHE COMPLETO DA OP */}
        <ProductionOrderDetailModal
          order={selectedOrder}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          onOrderUpdated={loadData}
        />

        {/* MODAL 3: ALERTA DE IA DETALHADO (FATO, HISTÓRICO, DESVIO, HIPÓTESE IA, AÇÃO SUGERIDA) */}
        <ProductionAIAlertDetailModal
          alert={selectedAlert}
          open={alertModalOpen}
          onOpenChange={setAlertModalOpen}
          onOpenOrderDetail={(order) => {
            setSelectedOrder(order)
            setDetailModalOpen(true)
          }}
        />
      </div>
    </TooltipProvider>
  )
}

export default ProductionOverviewPage
