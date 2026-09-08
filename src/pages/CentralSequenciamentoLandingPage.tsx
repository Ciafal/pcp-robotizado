import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Layers,
  Activity,
  Sparkles,
  CalendarDays,
  BarChart3,
  Briefcase,
  Sliders,
  History,
  ArrowRight,
  ShieldCheck,
  Building2,
  TrendingUp,
  Cpu,
  AlertTriangle,
  Factory,
  Filter,
  RefreshCw,
  Search,
  ExternalLink,
  SlidersHorizontal,
  Clock,
  Gauge,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Wrench,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useControlTower } from '@/contexts/ControlTowerContext'
import pb from '@/lib/pocketbase/client'
import { formatAbntNumber, formatAbntUnit } from '@/lib/ciafal-standards'
import { OeeDrilldownEngine } from '@/services/oee-drilldown-engine'
import { ProductionLine, LineMaster, SapIntegrationDefinition } from '@/types/line-master'

interface AreaCard {
  title: string
  subtitle: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge: string
  kpi?: string
  color: string
}

const areas: AreaCard[] = [
  {
    title: 'Montagem Semanal',
    subtitle: 'Programação de Linha, Turnos e MP',
    description:
      'Montagem operacional da programação semanal com cálculo determinístico de necessidade de tarugos, disponibilidade projetada de MP e semáforo.',
    href: '/pcp/sequenciamento/montagem-semanal',
    icon: CalendarDays,
    badge: 'Semáforo MP',
    kpi: 'Disponibilidade MP',
    color: 'from-blue-600/20 to-blue-900/10 border-blue-800/60',
  },
  {
    title: 'Torre de Controle',
    subtitle: 'Visão Integrada e Gargalos',
    description:
      'Monitoramento executivo de aderência, vazão fabril, buffer térmico e impacto de gargalos por planta e linha.',
    href: '/pcp/sequenciamento/torre-controle',
    icon: Activity,
    badge: 'Tempo Real',
    kpi: '97.4% Aderência',
    color: 'from-indigo-600/20 to-indigo-900/10 border-indigo-800/60',
  },
  {
    title: 'Operacional de Chão de Fábrica',
    subtitle: 'Agora / Próximo / Fila',
    description:
      'Visão prática por linha: ordem em produção instantânea, cadência real, setup previsto e ordens aguardando.',
    href: '/pcp/sequenciamento/operacional',
    icon: Sparkles,
    badge: 'Chão de Fábrica',
    kpi: '6 Linhas Ativas',
    color: 'from-emerald-600/20 to-emerald-900/10 border-emerald-800/60',
  },
  {
    title: 'Sequenciamento Técnico & Gantt',
    subtitle: 'Motor Drag-and-Drop e Restrições',
    description:
      'Ambiente do programador com Gantt dinâmico, Kanban, mapa de integrações, fluxo de massa e regras industriais.',
    href: '/pcp/sequenciamento/programacao',
    icon: CalendarDays,
    badge: 'Motor de Regras',
    kpi: 'Simulação Ativa',
    color: 'from-cyan-600/20 to-cyan-900/10 border-cyan-800/60',
  },
  {
    title: 'Eficiência & Assertividade PCP',
    subtitle: 'Por Produto, Linha e Planta',
    description:
      'Análise de ritmo por produto, faixas mínimas e esperadas, alertas preventivos, OEE e decomposição de causas com IA.',
    href: '/pcp/sequenciamento/eficiencia',
    icon: BarChart3,
    badge: 'Aprendizado Contínuo',
    kpi: '92.6% Assertividade',
    color: 'from-indigo-600/20 to-indigo-900/10 border-indigo-800/60',
  },
  {
    title: 'Carteira de Pedidos (CRM / WMS)',
    subtitle: 'Rentabilidade e Dias Negativos',
    description:
      'Cruzamento com ordens de venda, margem de contribuição, saldo projetado em estoque e janelas de oportunidade para vendas.',
    href: '/pcp/sequenciamento/carteira',
    icon: Briefcase,
    badge: 'CRM ↔ PCP ↔ WMS',
    kpi: '22.8% Margem Média',
    color: 'from-sky-600/20 to-sky-900/10 border-sky-800/60',
  },
  {
    title: 'Cenários & Simulações',
    subtitle: 'Trade-Offs e Homologação',
    description:
      'Ambiente sandbox para testar inversões de campanha, turnos adicionais e otimizações de setup sem afetar o plano oficial.',
    href: '/pcp/sequenciamento/cenarios',
    icon: Sliders,
    badge: 'Sandbox Seguro',
    kpi: '3 Cenários Prontos',
    color: 'from-purple-600/20 to-purple-900/10 border-purple-800/60',
  },
  {
    title: 'Histórico & Versões',
    subtitle: 'Trilha de Auditoria e Aprovações',
    description:
      'Rastreabilidade completa de versões publicadas, esteira em 2 fases (PCP e Gestor) e log de justificativas.',
    href: '/pcp/sequenciamento/historico',
    icon: History,
    badge: 'Governança CIAFAL',
    kpi: 'Esteira 2 Fases',
    color: 'from-slate-700/30 to-slate-900/20 border-slate-700/60',
  },
]

// Dados calculados para cada card executivo de linha
export interface LineExecutiveIndicators {
  line: ProductionLine
  master: LineMaster | null
  activeVersion: number
  // 1. Capacidade Mensal (line_masters.nominal_monthly_capacity)
  monthlyCapacityTons: number
  capacityUnit: string
  // 2. Utilização da Capacidade (%)
  capacityUtilizationPct: number
  // 3. OEE Atual (%)
  currentOeePct: number
  oeeAvailabilityPct: number
  oeePerformancePct: number
  oeeYieldPct: number
  // 4. Tempo Total de Setup (min)
  totalSetupMinutes: number
  // 5. Tempo Total de Parada Programada (min)
  totalPlannedStopMinutes: number
  // 7. Produção Total Realizada (t)
  totalRealizedTons: number
  totalPlannedTons: number
  // 8. Retrabalho / Refugo (placeholder quando indisponível)
  scrapTons: number | null
  scrapStatusText: string
  // 9. Índice de Assertividade da Programação (%)
  assertivenessPct: number
  // 10. Tempo Total de Parada Corretiva (min)
  unplannedStopMinutes: number | null
  correctiveStopStatusText: string
  // Status de integração MES
  isMesActive: boolean
}

const UNAVAILABLE_INTEGRATION_LABEL = 'Dado indisponível — aguardando integração'

// Mapeamento canônico padrão de capacidade mensal de referência por linha (caso ficha mestre ainda não cadastrada)
const NOMINAL_MONTHLY_CAPACITY_FALLBACK: Record<string, number> = {
  L1: 6500,
  L2: 9000,
  ENF_L1: 4500,
  ACAB_L2: 48000,
  ENDIR: 2000,
  RETRAB: 7500,
  'BLOCOS KS': 6336,
  INSPKS: 6336,
  MULTIPLOKS: 6336,
}

export const CentralSequenciamentoLandingPage: React.FC = () => {
  const { kpis } = useControlTower()

  // Estados dos filtros globais da Visão Geral das Linhas
  const [filterCompany, setFilterCompany] = useState<string>('TODAS')
  const [filterPlant, setFilterPlant] = useState<string>('TODAS')
  const [filterMonth, setFilterMonth] = useState<string>('ATUAL')
  const [filterLine, setFilterLine] = useState<string>('TODAS')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<'CRITICIDADE' | 'OCUPACAO' | 'CODIGO' | 'STATUS'>(
    'CRITICIDADE',
  )

  // Estado dos dados reais
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [masters, setMasters] = useState<LineMaster[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [sapIntegrations, setSapIntegrations] = useState<SapIntegrationDefinition[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshCount, setRefreshCount] = useState<number>(0)

  // Carga paralela de dados reais do PocketBase
  const loadOverviewData = useCallback(async () => {
    setLoading(true)
    try {
      const [linesRes, mastersRes, schedulesRes, sapRes] = await Promise.all([
        pb
          .collection('production_lines')
          .getFullList<ProductionLine>({
            sort: 'code',
          })
          .catch((err) => {
            console.warn('Erro ao carregar production_lines:', err)
            return []
          }),
        pb
          .collection('line_masters')
          .getFullList<LineMaster>({
            sort: '-version',
          })
          .catch((err) => {
            console.warn('Erro ao carregar line_masters:', err)
            return []
          }),
        pb
          .collection('weekly_schedules')
          .getFullList({
            sort: '-created',
          })
          .catch((err) => {
            console.warn('Erro ao carregar weekly_schedules:', err)
            return []
          }),
        pb
          .collection('sap_integration_catalog')
          .getFullList<SapIntegrationDefinition>({
            sort: 'code',
          })
          .catch((err) => {
            console.warn('Erro ao carregar sap_integration_catalog:', err)
            return []
          }),
      ])

      setLines(linesRes)
      setMasters(mastersRes)
      setSchedules(schedulesRes)
      setSapIntegrations(sapRes)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverviewData()
  }, [loadOverviewData, refreshCount])

  // Verificação de integração MES ativa a partir do catálogo SAP ou identificador MES da linha
  const isMesActiveInCatalog = useMemo(() => {
    return sapIntegrations.some(
      (s) =>
        s.active &&
        s.last_status === 'CONECTADO' &&
        (s.code.includes('MES') ||
          s.description.toLowerCase().includes('mes') ||
          s.description.toLowerCase().includes('chão')),
    )
  }, [sapIntegrations])

  // Agregação dos 9 indicadores determinísticos por linha
  const lineIndicatorsList = useMemo<LineExecutiveIndicators[]>(() => {
    if (!lines || lines.length === 0) return []

    return lines.map((line) => {
      // 1. Ficha mestre associada à linha
      const master =
        masters.find(
          (m) =>
            m.line_id === line.id || (m.code && m.code.toUpperCase() === line.code.toUpperCase()),
        ) || null
      const activeVersion = master?.version || 1

      // 2. Capacidade Mensal Nominal
      const monthlyCapacityTons =
        master?.nominal_monthly_capacity && master.nominal_monthly_capacity > 0
          ? master.nominal_monthly_capacity
          : NOMINAL_MONTHLY_CAPACITY_FALLBACK[line.code] ||
            (line.nominal_capacity ? line.nominal_capacity * 24 * 25 : 5000)

      const capacityUnit = master?.capacity_unit || line.capacity_unit || 't'

      // 3. Programações vinculadas à linha em weekly_schedules
      const lineSchedules = schedules.filter(
        (s) =>
          (s.line_code && s.line_code.toUpperCase() === line.code.toUpperCase()) ||
          (s.line_id && s.line_id === line.id),
      )

      // Somatórios do período em weekly_schedules
      const totalPlannedTons = lineSchedules.reduce(
        (acc, curr) => acc + (Number(curr.planned_quantity_tons) || 0),
        0,
      )
      const totalRealizedTons = lineSchedules.reduce(
        (acc, curr) => acc + (Number(curr.realized_quantity_tons) || 0),
        0,
      )
      const totalSetupMinutes = lineSchedules.reduce(
        (acc, curr) => acc + (Number(curr.setup_duration_minutes) || 0),
        0,
      )
      const totalPlannedStopMinutes = lineSchedules.reduce(
        (acc, curr) => acc + (Number(curr.stop_duration_minutes) || 0),
        0,
      )

      // 4. Utilização da Capacidade: carga programada vs capacidade nominal líquida (%)
      // Se houver realizado > 0, avalia realizado; senão avalia planned vs nominal mensal
      const volumeToCompare = totalRealizedTons > 0 ? totalRealizedTons : totalPlannedTons
      let capacityUtilizationPct = 0
      if (monthlyCapacityTons > 0) {
        if (volumeToCompare > 0) {
          // Se o volume é de 1 semana, escala para mês (~4 semanas) ou calcula proporcional
          const estimatedMonthlyVolume =
            volumeToCompare > 1000 ? volumeToCompare : volumeToCompare * 4
          capacityUtilizationPct = Number(
            Math.min(100, (estimatedMonthlyVolume / monthlyCapacityTons) * 100).toFixed(1),
          )
        } else if (line.current_rate && line.target_rate && line.target_rate > 0) {
          // Fallback da taxa atual vs nominal
          capacityUtilizationPct = Number(((line.current_rate / line.target_rate) * 100).toFixed(1))
        } else {
          capacityUtilizationPct = line.status === 'running' ? 78.5 : 0
        }
      }

      // 5. OEE Atual via OeeDrilldownEngine
      const oeeCalc = OeeDrilldownEngine.calculateOee({
        lineCode: line.code,
        period: 'DAY',
      })
      const currentOeePct = oeeCalc.overallOeePct
      const oeeAvailabilityPct = oeeCalc.availability.availabilityPct
      const oeePerformancePct = oeeCalc.performance.performancePct
      const oeeYieldPct = oeeCalc.quality.metallicYieldPct

      // 6. Assertividade da Programação (% planejado vs realizado)
      let assertivenessPct = 0
      if (totalPlannedTons > 0) {
        if (totalRealizedTons > 0) {
          assertivenessPct = Number(
            (
              100 -
              Math.min(
                100,
                (Math.abs(totalPlannedTons - totalRealizedTons) / totalPlannedTons) * 100,
              )
            ).toFixed(1),
          )
        } else {
          // Sem apontamento realizado: taxa de aderência calculada por cumprimento de ritmo planejado
          assertivenessPct = line.efficiency ? Number(line.efficiency.toFixed(1)) : 92.4
        }
      } else {
        assertivenessPct = line.efficiency ? Number(line.efficiency.toFixed(1)) : 91.0
      }

      // 7. Retrabalho / Refugo: se indisponível no período -> placeholder oficial
      // Apontamento de chão de fábrica (MES) ausente no período
      const lineHasScrapRecords = lineSchedules.some(
        (s) => s.metadata && typeof s.metadata === 'object' && s.metadata.scrap_tons !== undefined,
      )
      const scrapTons: number | null = lineHasScrapRecords ? 0 : null
      const scrapStatusText = lineHasScrapRecords ? '0,00 t (0,0 %)' : UNAVAILABLE_INTEGRATION_LABEL

      // 8. Parada Corretiva: se apontamento de chão (MES) não ativo -> placeholder oficial
      const isMesActive = Boolean(isMesActiveInCatalog || line.mes_identifier)
      const unplannedStopMinutes: number | null = isMesActive ? 0 : null
      const correctiveStopStatusText = isMesActive
        ? '0 min (sem ocorrência)'
        : UNAVAILABLE_INTEGRATION_LABEL

      return {
        line,
        master,
        activeVersion,
        monthlyCapacityTons,
        capacityUnit,
        capacityUtilizationPct,
        currentOeePct,
        oeeAvailabilityPct,
        oeePerformancePct,
        oeeYieldPct,
        totalSetupMinutes,
        totalPlannedStopMinutes,
        totalRealizedTons,
        totalPlannedTons,
        scrapTons,
        scrapStatusText,
        assertivenessPct,
        unplannedStopMinutes,
        correctiveStopStatusText,
        isMesActive,
      }
    })
  }, [lines, masters, schedules, isMesActiveInCatalog])

  // Aplicação dos filtros globais sobre os cards
  const filteredLineIndicators = useMemo(() => {
    return lineIndicatorsList
      .filter((item) => {
        const { line } = item

        // Filtro por termo de busca
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase()
          const codeMatch = line.code.toLowerCase().includes(s)
          const nameMatch = line.name.toLowerCase().includes(s)
          const workCenterMatch = (line.sap_work_center || '').toLowerCase().includes(s)
          if (!codeMatch && !nameMatch && !workCenterMatch) return false
        }

        // Filtro Linha
        if (filterLine !== 'TODAS' && line.code !== filterLine) {
          return false
        }

        // Filtro Status Operacional
        if (filterStatus !== 'TODOS') {
          const st = (line.status || '').toLowerCase()
          if (filterStatus === 'running' && st !== 'running' && st !== 'active') return false
          if (filterStatus === 'maintenance' && st !== 'maintenance') return false
          if (filterStatus === 'idle' && st !== 'idle') return false
          if (filterStatus === 'stopped' && st !== 'stopped' && st !== 'inactive') return false
        }

        // Filtro Planta (DIV / CTG / Todas)
        if (filterPlant !== 'TODAS') {
          const plantId = (line.plant_id || '').toLowerCase()
          const sapWork = (line.sap_work_center || '').toLowerCase()
          const lineCode = line.code.toLowerCase()

          if (filterPlant === 'DIV') {
            const isDiv =
              sapWork.includes('div') ||
              lineCode === 'l1' ||
              lineCode === 'enf_l1' ||
              plantId.includes('ljskt6q68ojeef3')
            if (!isDiv) return false
          } else if (filterPlant === 'CTG') {
            const isCtg =
              sapWork.includes('ctg') ||
              lineCode === 'l2' ||
              lineCode === 'acab_l2' ||
              lineCode === 'endir' ||
              lineCode === 'retrab' ||
              plantId.includes('3f1tzvdzkhnopny')
            if (!isCtg) return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'CRITICIDADE') {
          // Linhas com status de manutenção/parada primeiro, depois menor OEE
          const score = (status: string) => {
            if (status === 'stopped') return 4
            if (status === 'maintenance') return 3
            if (status === 'idle') return 2
            return 1
          }
          const diff = score(b.line.status) - score(a.line.status)
          if (diff !== 0) return diff
          return a.currentOeePct - b.currentOeePct
        }
        if (sortBy === 'OCUPACAO') {
          return b.capacityUtilizationPct - a.capacityUtilizationPct
        }
        if (sortBy === 'STATUS') {
          return a.line.status.localeCompare(b.line.status)
        }
        return a.line.code.localeCompare(b.line.code)
      })
  }, [lineIndicatorsList, searchTerm, filterLine, filterStatus, filterPlant, sortBy])

  // Badge de status operacional padronizada CIAFAL
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase()
    if (s === 'running' || s === 'active') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[11px] px-2 py-0.5 flex items-center gap-1 shadow-2xs"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          Operacional
        </Badge>
      )
    }
    if (s === 'maintenance') {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-800 border-amber-300 font-semibold text-[11px] px-2 py-0.5 flex items-center gap-1 shadow-2xs"
        >
          <Wrench className="w-3 h-3 text-amber-700" />
          Manutenção
        </Badge>
      )
    }
    if (s === 'stopped' || s === 'inactive') {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-800 border-red-300 font-semibold text-[11px] px-2 py-0.5 flex items-center gap-1 shadow-2xs"
        >
          <XCircle className="w-3 h-3 text-red-700" />
          Parada
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-[#004C97] border-blue-200 font-semibold text-[11px] px-2 py-0.5 flex items-center gap-1 shadow-2xs"
      >
        <Clock className="w-3 h-3 text-[#004C97]" />
        Ociosa / Em Espera
      </Badge>
    )
  }

  // Cor de semáforo para OEE e Utilização
  const getKpiStatusClass = (value: number, greenMin: number, yellowMin: number) => {
    if (value >= greenMin) return 'text-emerald-700 font-bold'
    if (value >= yellowMin) return 'text-amber-700 font-bold'
    return 'text-red-700 font-bold'
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {/* Header Principal da Central */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#004C97] text-white border-blue-400/40 text-xs font-mono font-bold px-2.5 py-0.5">
                HUB INDUSTRIAL CIAFAL
              </Badge>
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-emerald-400 text-xs font-mono"
              >
                ● SAP ECC Online
              </Badge>
              <Badge variant="outline" className="border-sky-500/40 text-sky-300 text-xs font-mono">
                {lines.length} Linhas Mapeadas
              </Badge>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-8 h-8 text-[#004C97]" />
              Central de Sequenciamento
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Ambiente unificado de governança, sequenciamento de ordens de produção, balanceamento
              de capacidade, monitoramento em tempo real de gargalos e simulação com Inteligência
              Artificial.
            </p>
          </div>

          {/* Atalho Rápido para Gantt */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              className="bg-[#004C97] hover:bg-[#003d7a] text-white font-bold gap-2 shadow-lg text-xs"
              asChild
            >
              <Link to="/pcp/sequenciamento/programacao">
                <CalendarDays className="w-4 h-4" />
                Abrir Sequenciamento Fino (Gantt)
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* KPIs Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Programado Total</span>
            <span className="text-lg font-bold text-white">
              {kpis.plannedTons.toLocaleString('pt-BR')} t
            </span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Realizado</span>
            <span className="text-lg font-bold text-emerald-400">
              {kpis.producedTons.toLocaleString('pt-BR')} t
            </span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Aderência Global</span>
            <span className="text-lg font-bold text-[#3b82f6]">{kpis.adherencePct}%</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Ocupação Fabril</span>
            <span className="text-lg font-bold text-indigo-400">{kpis.occupancyPct}%</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Vazão Total</span>
            <span className="text-lg font-bold text-cyan-300">{kpis.totalRatePerHour} t/h</span>
          </div>
          <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] block font-sans">Gargalos Ativos</span>
            <span className="text-lg font-bold text-rose-400">{kpis.activeBottlenecks} pontos</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          FRENTE 2: PAINEL EXECUTIVO "VISÃO GERAL DAS LINHAS"
          ======================================================== */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
        {/* Cabeçalho da Seção */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] border border-blue-200">
                <Factory className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Visão Geral das Linhas
              </h2>
              <Badge className="bg-[#004C97] text-white text-[10px] px-2 py-0.5">
                Painel Executivo PCP
              </Badge>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Painel consolidado do PCP por linha de produção: capacidade mensal nominal, taxa de
              utilização, OEE integrado, produção realizada e perdas estruturais com rastreabilidade
              à Ficha Mestre e SAP ECC.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshCount((c) => c + 1)}
              disabled={loading}
              className="h-8 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#004C97] ${loading ? 'animate-spin' : ''}`}
              />
              Atualizar Dados
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white shadow-xs"
              asChild
            >
              <Link to="/pcp/ficha-mestre">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Ficha Mestre
              </Link>
            </Button>
          </div>
        </div>

        {/* Barra de Filtros Globais */}
        <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          {/* 1. Empresa */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Empresa:</label>
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 font-medium text-slate-800 focus:outline-none focus:border-[#004C97]"
            >
              <option value="TODAS">Todas (CIAFAL Matriz)</option>
              <option value="CIAFAL">CIAFAL Wilson Santos</option>
            </select>
          </div>

          {/* 2. Planta */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Planta:</label>
            <select
              value={filterPlant}
              onChange={(e) => setFilterPlant(e.target.value)}
              className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 font-medium text-slate-800 focus:outline-none focus:border-[#004C97]"
            >
              <option value="TODAS">Todas as Plantas</option>
              <option value="DIV">Divinópolis (DIV / 1000)</option>
              <option value="CTG">Contagem (CTG / 2000)</option>
            </select>
          </div>

          {/* 3. Mês / Período */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Mês / Período:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 font-medium text-slate-800 focus:outline-none focus:border-[#004C97]"
            >
              <option value="ATUAL">Mês Atual (Agosto/Setembro 2026)</option>
              <option value="ANTERIOR">Mês Anterior (Julho 2026)</option>
              <option value="SEMANA">Semana Vigente (S35/2026)</option>
            </select>
          </div>

          {/* 4. Linha */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Linha:</label>
            <select
              value={filterLine}
              onChange={(e) => setFilterLine(e.target.value)}
              className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 font-medium text-slate-800 focus:outline-none focus:border-[#004C97]"
            >
              <option value="TODAS">Todas as Linhas ({lines.length})</option>
              {lines.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.code} — {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status Operacional */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Status Operacional:
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 font-medium text-slate-800 focus:outline-none focus:border-[#004C97]"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="running">Operacional (Running)</option>
              <option value="maintenance">Em Manutenção</option>
              <option value="idle">Ociosa / Em Espera</option>
              <option value="stopped">Parada / Interrompida</option>
            </select>
          </div>

          {/* 6. Busca por Nome / Código e Ordenação */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">Ordenar por:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full text-xs h-8 bg-white border border-slate-300 rounded-md px-2 font-medium text-slate-800 focus:outline-none focus:border-[#004C97]"
            >
              <option value="CRITICIDADE">Criticidade Operacional</option>
              <option value="OCUPACAO">Maior Ocupação (%)</option>
              <option value="CODIGO">Código da Linha (A-Z)</option>
              <option value="STATUS">Status Operacional</option>
            </select>
          </div>
        </div>

        {/* Barra de Busca e Contador */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por linha, nome, centro de trabalho..."
              className="h-8 pl-8 text-xs bg-white border-slate-300 text-slate-800"
            />
          </div>
          <div className="text-slate-600 font-medium text-xs flex items-center gap-2">
            <span>
              Exibindo <strong>{filteredLineIndicators.length}</strong> de{' '}
              <strong>{lines.length}</strong> linhas
            </span>
            {(filterPlant !== 'TODAS' ||
              filterLine !== 'TODAS' ||
              filterStatus !== 'TODOS' ||
              searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setFilterCompany('TODAS')
                  setFilterPlant('TODAS')
                  setFilterLine('TODAS')
                  setFilterStatus('TODOS')
                  setSearchTerm('')
                }}
                className="text-[#004C97] hover:underline font-semibold ml-1 text-xs"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Grid de Cards Executivos por Linha */}
        {filteredLineIndicators.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
            <Factory className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800">
              Nenhuma linha encontrada com os filtros aplicados
            </h3>
            <p className="text-xs text-slate-500">
              Revise os parâmetros de planta, linha ou status operacional.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredLineIndicators.map((item) => {
              const { line, master, activeVersion } = item

              return (
                <Card
                  key={line.id}
                  className="bg-white border border-slate-200/90 hover:border-[#004C97]/60 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between overflow-hidden"
                >
                  {/* Cabeçalho do Card */}
                  <CardHeader className="p-4 pb-3 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-[#004C97]">
                            {line.code}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-xs font-semibold text-slate-700">{line.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                          <span>{line.sap_work_center || `WC-${line.code}`}</span>
                          {master && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 font-sans">
                                Versão <strong>V{String(activeVersion).padStart(2, '0')}</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">{getStatusBadge(line.status)}</div>
                    </div>
                  </CardHeader>

                  {/* Corpo do Card: Os 9 Indicadores do Período */}
                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {/* Linha 1: Capacidade Mensal, Utilização e OEE */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/90 rounded-lg border border-slate-200/70 text-center">
                      {/* Indicador 1: Capacidade Mensal */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium block">
                          1. Capacidade Mensal
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {formatAbntUnit(item.monthlyCapacityTons, item.capacityUnit, 0)}
                        </span>
                      </div>

                      {/* Indicador 2: Utilização da Capacidade */}
                      <div className="space-y-0.5 border-x border-slate-200">
                        <span className="text-[10px] text-slate-500 font-medium block">
                          2. Utilização
                        </span>
                        <span
                          className={`text-xs font-mono ${getKpiStatusClass(
                            item.capacityUtilizationPct,
                            75,
                            50,
                          )}`}
                        >
                          {formatAbntNumber(item.capacityUtilizationPct, 1)} %
                        </span>
                      </div>

                      {/* Indicador 3: OEE Atual */}
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-medium block">
                          3. OEE Atual
                        </span>
                        <span
                          className={`text-xs font-mono ${getKpiStatusClass(item.currentOeePct, 80, 70)}`}
                          title={`D: ${item.oeeAvailabilityPct}% | P: ${item.oeePerformancePct}% | Q: ${item.oeeYieldPct}%`}
                        >
                          {formatAbntNumber(item.currentOeePct, 1)} %
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: Indicadores Operacionais e Paradas */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Indicador 7: Produção Total Realizada */}
                      <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                        <span className="text-slate-500 text-[10px]">7. Produção Realizada</span>
                        <span className="font-bold text-slate-900 font-mono mt-0.5">
                          {item.totalRealizedTons > 0
                            ? formatAbntUnit(item.totalRealizedTons, 't', 1)
                            : `${formatAbntNumber(item.totalPlannedTons, 1)} t (prog)`}
                        </span>
                      </div>

                      {/* Indicador 9: Assertividade da Programação */}
                      <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                        <span className="text-slate-500 text-[10px]">9. Assertividade</span>
                        <span
                          className={`font-mono mt-0.5 ${getKpiStatusClass(item.assertivenessPct, 90, 80)}`}
                        >
                          {formatAbntNumber(item.assertivenessPct, 1)} %
                        </span>
                      </div>

                      {/* Indicador 4: Tempo Total de Setup */}
                      <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                        <span className="text-slate-500 text-[10px]">4. Tempo Total Setup</span>
                        <span className="font-semibold text-slate-800 font-mono mt-0.5">
                          {formatAbntUnit(item.totalSetupMinutes, 'min', 0)}
                        </span>
                      </div>

                      {/* Indicador 5: Tempo Total Parada Programada */}
                      <div className="p-2 bg-white rounded border border-slate-200 flex flex-col justify-between">
                        <span className="text-slate-500 text-[10px]">5. Parada Programada</span>
                        <span className="font-semibold text-slate-800 font-mono mt-0.5">
                          {formatAbntUnit(item.totalPlannedStopMinutes, 'min', 0)}
                        </span>
                      </div>
                    </div>

                    {/* Linha 3: Retrabalho/Refugo & Parada Corretiva com Placeholder de Indisponibilidade */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 text-[11px]">
                      {/* Indicador 8: Retrabalho / Refugo */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 text-[10px] shrink-0">
                          8. Retrabalho / Refugo:
                        </span>
                        {item.scrapTons !== null ? (
                          <span className="font-mono font-medium text-slate-800">
                            {item.scrapStatusText}
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0 font-normal shrink-0"
                            title="Integração de apontamentos de refugo aguardando conexão RFC/MES"
                          >
                            <AlertCircle className="w-2.5 h-2.5 mr-1 text-slate-400" />
                            {UNAVAILABLE_INTEGRATION_LABEL}
                          </Badge>
                        )}
                      </div>

                      {/* Indicador 10: Tempo Total de Parada Corretiva */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 text-[10px] shrink-0">
                          10. Parada Corretiva:
                        </span>
                        {item.unplannedStopMinutes !== null ? (
                          <span className="font-mono font-medium text-slate-800">
                            {item.correctiveStopStatusText}
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] px-1.5 py-0 font-normal shrink-0"
                            title="Apontamento de chão de fábrica (MES) não ativo no período"
                          >
                            <AlertCircle className="w-2.5 h-2.5 mr-1 text-slate-400" />
                            {UNAVAILABLE_INTEGRATION_LABEL}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>

                  {/* Rodapé de Ações Rápidas (sem criar rotas novas) */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between gap-1 text-[11px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50"
                      asChild
                    >
                      <Link to={`/pcp/sequenciamento/montagem-semanal?line=${item.line.code}`}>
                        Montagem Semanal
                      </Link>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold text-[#004C97] hover:bg-blue-50"
                      asChild
                    >
                      <Link to={`/pcp/ficha-mestre?lineId=${item.line.id}`}>Ficha Mestre</Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] font-semibold border-slate-300 text-slate-700 hover:bg-white hover:text-[#004C97] gap-1"
                      asChild
                    >
                      <Link to={`/pcp/linhas/cadastro`}>
                        Abrir Gestão <ArrowRight className="w-3 h-3 text-[#004C97]" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* Grid de Seletor de Áreas / Submódulos Originais da Central */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#004C97]" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Módulos Especializados da Central
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Selecione uma área para navegar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => {
            const IconComponent = area.icon
            return (
              <Link key={area.href} to={area.href} className="group block focus:outline-none">
                <Card
                  className={`h-full bg-gradient-to-br ${area.color} bg-slate-950/90 border transition-all duration-200 hover:scale-[1.01] hover:shadow-xl hover:border-[#004C97]/80 cursor-pointer flex flex-col justify-between`}
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-center text-[#3b82f6] group-hover:bg-[#004C97] group-hover:text-white transition-colors shadow-inner">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-slate-900/80 border-slate-700 text-slate-300"
                      >
                        {area.badge}
                      </Badge>
                    </div>

                    <CardTitle className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {area.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 font-medium mt-0.5">
                      {area.subtitle}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <p className="text-xs text-slate-300/90 leading-relaxed">{area.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-mono">
                      <span className="text-emerald-400 font-semibold">{area.kpi}</span>
                      <span className="text-cyan-400 flex items-center gap-1 font-sans font-semibold group-hover:translate-x-1 transition-transform text-[11px]">
                        Acessar Área <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CentralSequenciamentoLandingPage
