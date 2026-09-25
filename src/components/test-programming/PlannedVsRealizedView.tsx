import React, { useState, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  BarChart2,
  Filter,
  RefreshCw,
  Search,
  Eye,
  Activity,
  Layers,
  Building2,
  TrendingDown,
  Calendar,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TestProgrammingRecord, PlannedVsRealizedCardMetrics } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'
import { formatDatePTBR } from '@/lib/formatters-ptbr'
import { TestDetailModal } from './TestDetailModal'
import { TestAiAnalysisSection } from './TestAiAnalysisSection'
import { generateTestAiAnalysis } from '@/services/test-ai-service'

interface PlannedVsRealizedViewProps {
  tests: TestProgrammingRecord[]
  onRefresh: () => void
  isRefreshing?: boolean
}

export const PlannedVsRealizedView: React.FC<PlannedVsRealizedViewProps> = ({
  tests,
  onRefresh,
  isRefreshing = false,
}) => {
  // Filtros (Requisito 7)
  const [filterCompany, setFilterCompany] = useState<string>('TODAS')
  const [filterLine, setFilterLine] = useState<string>('TODAS')
  const [filterCenter, setFilterCenter] = useState<string>('TODOS')
  const [filterCategory, setFilterCategory] = useState<string>('TODAS')
  const [filterTechnicalLead, setFilterTechnicalLead] = useState<string>('TODOS')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Detalhamento do teste selecionado (Requisito 10)
  const [selectedTest, setSelectedTest] = useState<TestProgrammingRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Opções dinâmicas para os filtros baseadas nos testes existentes
  const filterOptions = useMemo(() => {
    const companies = Array.from(new Set(tests.map((t) => t.company).filter(Boolean))).sort()
    const lines = Array.from(new Set(tests.map((t) => t.production_line).filter(Boolean))).sort()
    const centers = Array.from(new Set(tests.map((t) => t.work_center).filter(Boolean))).sort()
    const categories = Array.from(new Set(tests.map((t) => t.test_category).filter(Boolean))).sort()
    const leads = Array.from(new Set(tests.map((t) => t.technical_lead).filter(Boolean))).sort()
    const statuses = Array.from(new Set(tests.map((t) => t.status).filter(Boolean))).sort()

    return { companies, lines, centers, categories, leads, statuses }
  }, [tests])

  // Aplicação dos Filtros
  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      if (filterCompany !== 'TODAS' && test.company !== filterCompany) return false
      if (filterLine !== 'TODAS' && test.production_line !== filterLine) return false
      if (filterCenter !== 'TODOS' && test.work_center !== filterCenter) return false
      if (filterCategory !== 'TODAS' && test.test_category !== filterCategory) return false
      if (filterTechnicalLead !== 'TODOS' && test.technical_lead !== filterTechnicalLead)
        return false
      if (filterStatus !== 'TODOS' && test.status !== filterStatus) return false

      const testDate = test.expected_start_date || test.expected_date
      if (filterStartDate && testDate < filterStartDate) return false
      if (filterEndDate && testDate > filterEndDate) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesId = (test.test_id || '').toLowerCase().includes(term)
        const matchesTitle = (test.title || '').toLowerCase().includes(term)
        const matchesLead = (test.technical_lead || '').toLowerCase().includes(term)
        const matchesLine = (test.production_line || '').toLowerCase().includes(term)
        if (!matchesId && !matchesTitle && !matchesLead && !matchesLine) return false
      }

      return true
    })
  }, [
    tests,
    filterCompany,
    filterLine,
    filterCenter,
    filterCategory,
    filterTechnicalLead,
    filterStatus,
    filterStartDate,
    filterEndDate,
    searchTerm,
  ])

  // 8 Cards Responsivos (Requisito 8)
  const metrics: PlannedVsRealizedCardMetrics = useMemo(() => {
    return testProgrammingService.calculatePlannedVsRealizedMetrics(filteredTests)
  }, [filteredTests])

  // Análise IA Geral do recorte filtrado
  const consolidatedAiAnalysis = useMemo(() => {
    const executed = filteredTests.find(
      (t) => t.mes_execution_data?.actual_start_date || t.deviation_metrics,
    )
    if (executed) {
      return generateTestAiAnalysis(executed, filteredTests)
    }
    // fallback caso nenhum teste ainda tenha executado
    if (filteredTests.length > 0) {
      return generateTestAiAnalysis(filteredTests[0], filteredTests)
    }
    return null
  }, [filteredTests])

  const handleOpenDetail = (test: TestProgrammingRecord) => {
    setSelectedTest(test)
    setIsDetailOpen(true)
  }

  // Dados para os gráficos G1-G5 reagindo aos filtros da tela (Requisito 12)
  const chartData = useMemo(() => {
    // G1: Duração Prevista x Realizada por teste (últimos 8 testes da lista filtrada)
    const g1Items = filteredTests.slice(0, 8).map((t) => {
      const pDur = t.expected_duration_minutes || 150
      const aDur = t.mes_execution_data?.actual_duration_minutes || pDur
      return {
        id: t.test_id || t.id.slice(0, 6),
        planned: pDur,
        actual: aDur,
      }
    })

    // G2: Desvio por Linha (média de minutos em cada linha)
    const lineMap: Record<string, { total: number; count: number }> = {}
    filteredTests.forEach((t) => {
      const l = t.production_line || 'Geral'
      const devMin = t.deviation_metrics?.duration_deviation_minutes || 0
      if (!lineMap[l]) lineMap[l] = { total: 0, count: 0 }
      lineMap[l].total += devMin
      lineMap[l].count += 1
    })
    const g2Items = Object.entries(lineMap).map(([line, val]) => ({
      line,
      avgDeviation: Math.round(val.total / (val.count || 1)),
    }))

    // G3: Desvio por Centro SAP
    const centerMap: Record<string, { total: number; count: number }> = {}
    filteredTests.forEach((t) => {
      const c = t.work_center || 'Sem Centro'
      const devMin = t.deviation_metrics?.duration_deviation_minutes || 0
      if (!centerMap[c]) centerMap[c] = { total: 0, count: 0 }
      centerMap[c].total += devMin
      centerMap[c].count += 1
    })
    const g3Items = Object.entries(centerMap).map(([center, val]) => ({
      center,
      avgDeviation: Math.round(val.total / (val.count || 1)),
    }))

    // G4: Evolução dos desvios ao longo do tempo (agrupado por data de início)
    const dateMap: Record<string, number> = {}
    filteredTests.forEach((t) => {
      const d = t.expected_start_date || t.expected_date
      if (!dateMap[d]) dateMap[d] = 0
      dateMap[d] += t.deviation_metrics?.duration_deviation_minutes || 0
    })
    const g4Items = Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([date, devMin]) => ({
        date: formatDatePTBR(date),
        deviation: devMin,
      }))

    // G5: Principais Ocorrências durante testes (dados MES)
    const occMap: Record<string, number> = {}
    filteredTests.forEach((t) => {
      if (t.mes_execution_data?.stops) {
        t.mes_execution_data.stops.forEach((s) => {
          const reason = s.reason_description || s.reason_code || 'Parada Operacional'
          occMap[reason] = (occMap[reason] || 0) + 1
        })
      }
      if (t.mes_execution_data?.occurrences) {
        t.mes_execution_data.occurrences.forEach((occ) => {
          occMap[occ] = (occMap[occ] || 0) + 1
        })
      }
    })
    const g5Items = Object.entries(occMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))

    return { g1Items, g2Items, g3Items, g4Items, g5Items }
  }, [filteredTests])

  return (
    <div className="space-y-4">
      {/* 1. FILTROS MULTIPLOS (REQUISITO 7) */}
      <Card className="bg-white border-slate-200 shadow-2xs">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
              <Filter className="w-3.5 h-3.5 text-[#004C97]" />
              Filtros da Análise Previsto x Realizado
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFilterCompany('TODAS')
                  setFilterLine('TODAS')
                  setFilterCenter('TODOS')
                  setFilterCategory('TODAS')
                  setFilterTechnicalLead('TODOS')
                  setFilterStatus('TODOS')
                  setFilterStartDate('')
                  setFilterEndDate('')
                  setSearchTerm('')
                }}
                className="text-[11px] h-7 text-slate-500 hover:text-slate-800"
              >
                Limpar Filtros
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-xs h-7 gap-1 border-slate-300"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">Empresa</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {filterOptions.companies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">Linha</Label>
              <Select value={filterLine} onValueChange={setFilterLine}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {filterOptions.lines.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">
                Centro SAP
              </Label>
              <Select value={filterCenter} onValueChange={setFilterCenter}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {filterOptions.centers.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">
                Categoria
              </Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  {filterOptions.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">
                Resp. Técnico
              </Label>
              <Select value={filterTechnicalLead} onValueChange={setFilterTechnicalLead}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {filterOptions.leads.map((lead) => (
                    <SelectItem key={lead} value={lead}>
                      {lead}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {filterOptions.statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">
                Data Inicial
              </Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            <div>
              <Label className="text-[10px] text-slate-500 uppercase font-semibold">
                Data Final
              </Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID (TESTE-000123), Título, Responsável Técnico ou Linha..."
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2. CARDS RESPONSIVOS CLICÁVEIS (REQUISITO 8) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {/* Card 1: Testes Concluídos */}
        <Card
          onClick={() => {
            if (filteredTests.length > 0) handleOpenDetail(filteredTests[0])
          }}
          className="bg-white border-slate-200 cursor-pointer hover:border-[#004C97] hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Testes Concluídos
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-slate-900">
                {metrics.testesConcluidos}
              </span>
              <span className="text-[10px] text-slate-400">no período</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Dentro do Previsto */}
        <Card
          onClick={() => {
            const first = filteredTests.find(
              (t) => t.deviation_metrics?.classification === 'DENTRO_PREVISTO',
            )
            if (first) handleOpenDetail(first)
          }}
          className="bg-white border-emerald-200 cursor-pointer hover:border-emerald-500 hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
              Dentro do Previsto
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-emerald-800">
                {metrics.dentroDoPrevistoCount}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 font-mono">
                ({metrics.dentroDoPrevistoPct} %)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Testes com Desvio */}
        <Card
          onClick={() => {
            const first = filteredTests.find(
              (t) =>
                t.deviation_metrics && t.deviation_metrics.classification !== 'DENTRO_PREVISTO',
            )
            if (first) handleOpenDetail(first)
          }}
          className="bg-white border-amber-200 cursor-pointer hover:border-amber-500 hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-amber-700 block">Com Desvio</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-mono text-amber-800">
                {metrics.comDesvioCount}
              </span>
              <span className="text-[11px] font-bold text-amber-700 font-mono">
                ({metrics.comDesvioPct} %)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Atraso Médio de Início */}
        <Card
          onClick={() => {
            if (filteredTests.length > 0) handleOpenDetail(filteredTests[0])
          }}
          className="bg-white border-slate-200 cursor-pointer hover:border-[#004C97] hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Atraso Médio Início
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-slate-900">
                {metrics.atrasoMedioInicioFormatted}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Desvio Médio de Duração */}
        <Card
          onClick={() => {
            if (filteredTests.length > 0) handleOpenDetail(filteredTests[0])
          }}
          className="bg-white border-slate-200 cursor-pointer hover:border-[#004C97] hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Desvio Médio Duração
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-slate-900">
                {metrics.desvioMedioDuracaoFormatted}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Tempo Excedente Acumulado */}
        <Card
          onClick={() => {
            if (filteredTests.length > 0) handleOpenDetail(filteredTests[0])
          }}
          className="bg-white border-rose-200 cursor-pointer hover:border-rose-500 hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">
              Tempo Excedente Acum.
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-rose-800">
                {metrics.tempoExcedenteAcumuladoFormatted}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 7: Impacto Produtivo MES */}
        <Card
          onClick={() => {
            if (filteredTests.length > 0) handleOpenDetail(filteredTests[0])
          }}
          className="bg-white border-blue-200 cursor-pointer hover:border-[#004C97] hover:shadow-sm transition-all"
        >
          <CardContent className="p-3">
            <span className="text-[10px] uppercase font-bold text-[#004C97] block">
              Impacto Produtivo MES
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-lg font-bold font-mono text-blue-900">
                {metrics.totalProduzidoPeriodoFormatted}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABELA PREVISTO X REALIZADO (REQUISITO 9) */}
      <Card className="bg-white border-slate-200 shadow-2xs overflow-hidden">
        <CardHeader className="p-3 bg-slate-50/70 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#004C97]" />
            Comparativo de Programações de Teste — Previsto x Realizado ({filteredTests.length})
          </CardTitle>
          <span className="text-[11px] text-slate-500">
            Clique em qualquer linha para abrir o detalhamento completo
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">ID Teste</th>
                  <th className="p-2.5">Teste</th>
                  <th className="p-2.5">Linha</th>
                  <th className="p-2.5">Centro</th>
                  <th className="p-2.5">Início Prev.</th>
                  <th className="p-2.5">Início Real</th>
                  <th className="p-2.5 text-center">Δ Início</th>
                  <th className="p-2.5">Fim Prev.</th>
                  <th className="p-2.5">Fim Real</th>
                  <th className="p-2.5 text-center">Δ Fim</th>
                  <th className="p-2.5">Duração Prev.</th>
                  <th className="p-2.5">Duração Real</th>
                  <th className="p-2.5 text-center">Δ Duração</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTests.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="p-6 text-center text-slate-400">
                      Nenhuma programação de teste encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTests.map((item) => {
                    const dev = item.deviation_metrics
                    const mes = item.mes_execution_data
                    const hasMes = Boolean(mes?.actual_start_date && mes?.actual_start_time)

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleOpenDetail(item)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        {/* ID Teste */}
                        <td className="p-2.5 font-mono font-bold text-[#004C97]">
                          {item.test_id || 'TESTE-000000'}
                        </td>

                        {/* Teste */}
                        <td className="p-2.5 font-medium text-slate-900 max-w-[180px] truncate">
                          {item.title}
                        </td>

                        {/* Linha */}
                        <td className="p-2.5 font-semibold text-slate-700">
                          {item.production_line}
                        </td>

                        {/* Centro */}
                        <td className="p-2.5 text-slate-600 font-mono">
                          {item.work_center || '-'}
                        </td>

                        {/* Início Previsto */}
                        <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                          {formatDatePTBR(item.expected_start_date || item.expected_date)}{' '}
                          <span className="font-bold text-slate-900">
                            {item.expected_start_time || '08:00'}
                          </span>
                        </td>

                        {/* Início Real */}
                        <td className="p-2.5 font-mono whitespace-nowrap">
                          {hasMes ? (
                            <span className="text-teal-900 font-semibold">
                              {formatDatePTBR(mes!.actual_start_date)} {mes!.actual_start_time}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Aguardando</span>
                          )}
                        </td>

                        {/* Δ Início com Semáforo (ícone + texto + cor) */}
                        <td className="p-2.5 text-center font-mono">
                          {dev ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold px-1.5 py-0.2 gap-1 inline-flex items-center ${
                                dev.start_deviation_minutes <= 10
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : dev.start_deviation_minutes <= 30
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-red-300 bg-red-50 text-red-800'
                              }`}
                            >
                              {dev.start_deviation_minutes <= 10 ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              ) : dev.start_deviation_minutes <= 30 ? (
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              ) : (
                                <AlertOctagon className="w-2.5 h-2.5 text-red-600" />
                              )}
                              <span>{dev.start_deviation_formatted}</span>
                            </Badge>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Fim Previsto */}
                        <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                          {formatDatePTBR(item.expected_end_date || item.expected_date)}{' '}
                          <span className="font-bold text-slate-900">
                            {item.expected_end_time || '10:30'}
                          </span>
                        </td>

                        {/* Fim Real */}
                        <td className="p-2.5 font-mono whitespace-nowrap">
                          {hasMes ? (
                            <span className="text-teal-900 font-semibold">
                              {formatDatePTBR(mes!.actual_end_date)} {mes!.actual_end_time}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Aguardando</span>
                          )}
                        </td>

                        {/* Δ Fim com Semáforo */}
                        <td className="p-2.5 text-center font-mono">
                          {dev ? (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold px-1.5 py-0.2 gap-1 inline-flex items-center ${
                                Math.abs(dev.end_deviation_minutes) <= 15
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                  : Math.abs(dev.end_deviation_minutes) <= 30
                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-red-300 bg-red-50 text-red-800'
                              }`}
                            >
                              {Math.abs(dev.end_deviation_minutes) <= 15 ? (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              ) : Math.abs(dev.end_deviation_minutes) <= 30 ? (
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              ) : (
                                <AlertOctagon className="w-2.5 h-2.5 text-red-600" />
                              )}
                              <span>{dev.end_deviation_formatted}</span>
                            </Badge>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Duração Prevista */}
                        <td className="p-2.5 font-mono text-[#004C97] font-semibold whitespace-nowrap">
                          {item.expected_duration_formatted || '2 h 30 min'}
                        </td>

                        {/* Duração Real */}
                        <td className="p-2.5 font-mono text-teal-800 font-semibold whitespace-nowrap">
                          {hasMes ? mes!.actual_duration_formatted : '-'}
                        </td>

                        {/* Δ Duração (absoluto + %) com Semáforo completo */}
                        <td className="p-2.5 text-center font-mono whitespace-nowrap">
                          {dev ? (
                            <div className="flex flex-col items-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold px-1.5 py-0.2 gap-1 inline-flex items-center ${
                                  dev.classification === 'DENTRO_PREVISTO'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                    : dev.classification === 'DESVIO_MODERADO'
                                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                                      : 'border-red-300 bg-red-50 text-red-800'
                                }`}
                              >
                                {dev.classification === 'DENTRO_PREVISTO' ? (
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                ) : dev.classification === 'DESVIO_MODERADO' ? (
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                ) : (
                                  <AlertOctagon className="w-2.5 h-2.5 text-red-600" />
                                )}
                                <span>{dev.duration_deviation_formatted}</span>
                              </Badge>
                              <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                                ({dev.percentage_deviation_formatted})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-2.5">
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {item.status}
                          </Badge>
                        </td>

                        {/* Ações */}
                        <td className="p-2.5 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDetail(item)
                            }}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-[#004C97]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. GRÁFICOS G1-G5 REAGINDO AOS FILTROS (REQUISITO 12) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* G1: Duração Prevista x Realizada por Teste */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
              <span>G1: Duração Prevista x Realizada</span>
              <span className="text-[10px] text-slate-400 font-normal">minutos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {chartData.g1Items.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="font-bold text-slate-700">{item.id}</span>
                  <span className="text-slate-500">
                    Prev: {item.planned}m | Real: {item.actual}m
                  </span>
                </div>
                <div className="flex h-3 gap-1 bg-slate-100 rounded overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, (item.planned / 300) * 100)}%` }}
                    className="bg-[#004C97] rounded-l"
                    title={`Previsto: ${item.planned} min`}
                  />
                  <div
                    style={{ width: `${Math.min(100, (item.actual / 300) * 100)}%` }}
                    className="bg-teal-500 rounded-r"
                    title={`Realizado: ${item.actual} min`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* G2: Desvio Médio por Linha */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
              <span>G2: Desvio Médio por Linha</span>
              <span className="text-[10px] text-slate-400 font-normal">minutos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {chartData.g2Items.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700">{item.line}</span>
                  <span
                    className={`font-mono font-bold ${
                      item.avgDeviation > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {item.avgDeviation > 0 ? `+${item.avgDeviation}` : item.avgDeviation} min
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(10, Math.abs(item.avgDeviation) * 2))}%`,
                    }}
                    className={`h-full ${
                      item.avgDeviation > 15
                        ? 'bg-red-500'
                        : item.avgDeviation > 0
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* G3: Desvio por Centro SAP */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
              <span>G3: Desvio por Centro de Trabalho</span>
              <span className="text-[10px] text-slate-400 font-normal">minutos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2.5">
            {chartData.g3Items.map((item, idx) => (
              <div key={idx} className="space-y-1 text-xs">
                <div className="flex justify-between text-[11px]">
                  <span className="font-bold text-slate-700">{item.center}</span>
                  <span className="font-mono font-bold text-slate-800">
                    {item.avgDeviation > 0 ? `+${item.avgDeviation}` : item.avgDeviation} min
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(10, Math.abs(item.avgDeviation) * 2))}%`,
                    }}
                    className="h-full bg-blue-600"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* G4: Evolução dos Desvios ao Longo do Tempo */}
        <Card className="bg-white border-slate-200 shadow-2xs">
          <CardHeader className="p-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
              <span>G4: Evolução Temporal dos Desvios</span>
              <span className="text-[10px] text-slate-400 font-normal">datas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {chartData.g4Items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
              >
                <span className="font-mono text-slate-600">{item.date}</span>
                <Badge
                  variant="outline"
                  className={`font-mono text-[10px] ${
                    item.deviation > 0
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {item.deviation > 0 ? `+${item.deviation}` : item.deviation} min
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* G5: Principais Ocorrências durante Testes (MES) */}
        <Card className="bg-white border-slate-200 shadow-2xs lg:col-span-2">
          <CardHeader className="p-3 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase flex items-center justify-between">
              <span>G5: Principais Ocorrências & Paradas (Origem: MES 4.0)</span>
              <span className="text-[10px] text-teal-700 font-semibold">Chão de Fábrica</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {chartData.g5Items.length > 0 ? (
              chartData.g5Items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <span className="text-slate-800 truncate max-w-[75%] font-medium">
                    {idx + 1}. {item.reason}
                  </span>
                  <Badge className="bg-slate-800 text-white font-mono text-[10px]">
                    {item.count} ocorrência{item.count > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Nenhuma parada registrada no período filtrado via telemetria MES.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. ANÁLISE IA — TESTES INDUSTRIAIS (REQUISITO 13) */}
      {consolidatedAiAnalysis && (
        <TestAiAnalysisSection
          analysis={consolidatedAiAnalysis}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />
      )}

      {/* MODAL DE DETALHAMENTO AMPLO (REQUISITOS 10 E 11) */}
      <TestDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        testItem={selectedTest}
        allTests={tests}
        onUpdated={onRefresh}
      />
    </div>
  )
}
