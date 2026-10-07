import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  RealtimeDataPayload,
  RealtimeFilters,
  RealtimeCenterData,
  RealtimeLineData,
  OperationalStatus,
} from '@/types/pcp-realtime-analysis'
import { PcpRealtimeAnalysisService } from '@/services/pcp-realtime-analysis-service'
import { PcpRealtimeAiService } from '@/services/pcp-realtime-ai-service'
import { RealtimeDrilldownModal } from '@/components/realtime-analysis/RealtimeDrilldownModal'
import { formatNumberPtBr } from '@/lib/number-format'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Activity,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Layers,
  Building2,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Info,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Radio,
  FileSpreadsheet,
} from 'lucide-react'

export const RealtimeAnalysisPage: React.FC = () => {
  // Filtros dependentes
  const [filters, setFilters] = useState<RealtimeFilters>({
    companyCode: 'CIAFAL',
    lineCode: 'ALL',
    centerCode: 'ALL',
    shiftCode: 'ALL',
    operationalStatus: 'ALL',
  })

  const [data, setData] = useState<RealtimeDataPayload | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCenters, setExpandedCenters] = useState<Record<string, boolean>>({})

  // Drilldown Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [selectedCenter, setSelectedCenter] = useState<RealtimeCenterData | null>(null)
  const [selectedLine, setSelectedLine] = useState<RealtimeLineData | null>(null)
  const [modalTitle, setModalTitle] = useState<string>('')

  // Carregamento de dados com tratamento defensivo
  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true)
      else setRefreshing(true)
      setError(null)

      try {
        const result = await PcpRealtimeAnalysisService.fetchRealtimeData(filters)
        setData(result)
      } catch (err: any) {
        console.error('Falha ao carregar Análise Real Time:', err)
        setError('Não foi possível carregar os dados. Tentar novamente.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [filters],
  )

  // Carga inicial e ao mudar filtros
  useEffect(() => {
    loadData()
  }, [loadData])

  // Polling automático e sincronização eficiente a cada 30 segundos (preservando filtros e centro expandido)
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true)
    }, 30000)
    return () => clearInterval(timer)
  }, [loadData])

  const toggleCenterExpand = (centerCode: string) => {
    setExpandedCenters((prev) => ({
      ...prev,
      [centerCode]: !prev[centerCode],
    }))
  }

  const handleOpenCenterDrilldown = (center: RealtimeCenterData) => {
    setSelectedCenter(center)
    setSelectedLine(null)
    setModalTitle(`Detalhamento Operacional — ${center.centerName} (${center.centerCode})`)
    setModalOpen(true)
  }

  const handleOpenLineDrilldown = (line: RealtimeLineData) => {
    setSelectedLine(line)
    setSelectedCenter(null)
    setModalTitle(`Situação Operacional — Linha ${line.lineName}`)
    setModalOpen(true)
  }

  // Resumo Executivo IA Topo
  const companyAiSummary = useMemo(() => {
    if (!data?.consolidatedCompany) return null
    return PcpRealtimeAiService.generateCompanySummary(data.consolidatedCompany, data.linesData)
  }, [data])

  // Formata hora HH:mm:ss a partir de ISO string
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--:--'
    try {
      const d = new Date(isoString)
      return d.toLocaleTimeString('pt-BR', { hour12: false })
    } catch {
      return '--:--:--'
    }
  }

  // Formata segundos em HH:mm:ss
  const formatSecondsToHms = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Render do Status Badge
  const renderStatusBadge = (status: OperationalStatus) => {
    switch (status) {
      case 'NORMAL':
        return <Badge className="bg-emerald-600 text-white font-medium text-xs">🟢 Normal</Badge>
      case 'ATENCAO':
        return <Badge className="bg-amber-500 text-white font-medium text-xs">🟡 Atenção</Badge>
      case 'CRITICO':
        return <Badge className="bg-rose-600 text-white font-medium text-xs">🔴 Crítico</Badge>
      case 'PARADA_PROGRAMADA':
        return (
          <Badge className="bg-blue-600 text-white font-medium text-xs">🔵 Parada programada</Badge>
        )
      case 'SEM_PROGRAMACAO':
        return (
          <Badge className="bg-slate-400 text-white font-medium text-xs">⚪ Sem programação</Badge>
        )
      default:
        return <Badge variant="outline">N/D</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-full overflow-hidden">
      {/* 1. CABEÇALHO DA TELA & STATUS DE SINCRONISMO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              PCP Robotizado • HUB CIAFAL
            </span>
            <Badge variant="outline" className="text-xs font-semibold bg-slate-100 text-slate-700">
              Ambiente: {data?.environment || 'Produção'}
            </Badge>
            <Badge
              className={
                data?.qualityStatus === 'ONLINE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-amber-50 text-amber-700 border-amber-300'
              }
              variant="outline"
            >
              <Radio className="w-3 h-3 mr-1 text-emerald-600 animate-pulse" />
              {data?.qualityStatus === 'ONLINE' ? 'Conectado (MES 4.0)' : 'Telemetria Parcial'}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-[#004C97]" />
            Análise Real Time — PCP
          </h1>
          <p className="text-xs text-slate-500">
            Acompanhamento operacional de empresas, linhas e centros produtivos
          </p>
        </div>

        {/* Indicador de Atualização e Botão Atualizar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-700">
              {data?.isStale ? (
                <span className="text-rose-600 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Dados desatualizados — última atualização às {formatTime(data?.dataFetchedAt)}
                </span>
              ) : (
                <span>Atualizado às {formatTime(data?.dataFetchedAt)}</span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">Intervalo automático: 30 segundos</div>
          </div>

          <Button
            variant="default"
            size="sm"
            onClick={() => loadData(false)}
            disabled={loading || refreshing}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 2. FILTROS DEPENDENTES NO TOPO: Empresa → Linha → Centro, Data, Turno, Situação */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#004C97]" />
          Filtros Operacionais Dependentes
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Empresa */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Empresa</label>
            <Select
              value={filters.companyCode || 'CIAFAL'}
              onValueChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  companyCode: val,
                  lineCode: 'ALL',
                  centerCode: 'ALL',
                }))
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Empresas</SelectItem>
                {data?.companies.map((comp) => (
                  <SelectItem key={comp.code} value={comp.code}>
                    {comp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Linha (filtrada pela empresa selecionada) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Linha</label>
            <Select
              value={filters.lineCode || 'ALL'}
              onValueChange={(val) =>
                setFilters((prev) => ({
                  ...prev,
                  lineCode: val,
                  centerCode: 'ALL',
                }))
              }
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas as Linhas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Linhas</SelectItem>
                {data?.lines
                  .filter((l) =>
                    !filters.companyCode || filters.companyCode === 'ALL'
                      ? true
                      : l.companyCode === filters.companyCode,
                  )
                  .map((line) => (
                    <SelectItem key={line.code} value={line.code}>
                      {line.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Centro (filtrado pela linha selecionada) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              Centro Produtivo
            </label>
            <Select
              value={filters.centerCode || 'ALL'}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, centerCode: val }))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todos os Centros" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Centros</SelectItem>
                {data?.centers
                  .filter((c) =>
                    !filters.lineCode || filters.lineCode === 'ALL'
                      ? !filters.companyCode || filters.companyCode === 'ALL'
                        ? true
                        : c.companyCode === filters.companyCode
                      : c.lineCode === filters.lineCode,
                  )
                  .map((cent) => (
                    <SelectItem key={cent.code} value={cent.code}>
                      {cent.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Turno */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Turno</label>
            <Select
              value={filters.shiftCode || 'ALL'}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, shiftCode: val }))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todos os Turnos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Turnos</SelectItem>
                <SelectItem value="TURNO_1">Turno 1 (06:00 - 14:00)</SelectItem>
                <SelectItem value="TURNO_2">Turno 2 (14:00 - 22:00)</SelectItem>
                <SelectItem value="TURNO_3">Turno 3 (22:00 - 06:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Situação Operacional */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
              Situação Operacional
            </label>
            <Select
              value={filters.operationalStatus || 'ALL'}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, operationalStatus: val }))}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas as Situações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Situações</SelectItem>
                <SelectItem value="NORMAL">🟢 Normal</SelectItem>
                <SelectItem value="ATENCAO">🟡 Atenção</SelectItem>
                <SelectItem value="CRITICO">🔴 Crítico</SelectItem>
                <SelectItem value="PARADA_PROGRAMADA">🔵 Parada programada</SelectItem>
                <SelectItem value="SEM_PROGRAMACAO">⚪ Sem programação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limpar Filtros */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setFilters({
                  companyCode: 'CIAFAL',
                  lineCode: 'ALL',
                  centerCode: 'ALL',
                  shiftCode: 'ALL',
                  operationalStatus: 'ALL',
                })
              }
              className="w-full h-9 text-xs text-slate-600 hover:text-slate-900 border-slate-300"
            >
              Restaurar Padrão
            </Button>
          </div>
        </div>
      </div>

      {/* ESTADOS DE ERRO E CARREGAMENTO */}
      {loading && !data && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm text-rose-900">{error}</div>
          <p className="text-xs text-rose-700">Fonte de dados indisponível no momento.</p>
          <Button
            variant="default"
            size="sm"
            onClick={() => loadData(false)}
            className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL EM 3 NÍVEIS */}
      {!loading && data && (
        <>
          {/* NÍVEL 1: VISÃO CONSOLIDADA DA EMPRESA */}
          <section className="space-y-4" data-testid="realtime-level-1-company">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#004C97]" />
                Nível 1 — Visão Consolidada da Empresa: {data.consolidatedCompany.companyName}
              </h2>
              <Badge variant="outline" className="text-xs text-slate-600">
                Ponderação por Tempo Produtivo
              </Badge>
            </div>

            {/* Resumo Real Time IA Empresa (Fatos, Alertas e Interpretações) */}
            {companyAiSummary && (
              <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white border border-blue-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#004C97] font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                    Resumo Real Time — Empresa (IA Orientativa PCP)
                  </div>
                  <Badge variant="outline" className="bg-white text-[11px] text-slate-600">
                    Base Real • Sem Alucinações
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div className="bg-white/95 border border-slate-200/90 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fatos Medidos no
                      Escopo
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                      {companyAiSummary.factualPoints.map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white/95 border border-slate-200/90 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Alertas & Desvios
                    </div>
                    {companyAiSummary.calculatedAlerts.length > 0 ? (
                      <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                        {companyAiSummary.calculatedAlerts.map((al, i) => (
                          <li key={i}>{al}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        Nenhum desvio crítico registrado.
                      </p>
                    )}
                  </div>

                  <div className="bg-white/95 border border-slate-200/90 rounded-xl p-3.5 space-y-1.5 shadow-2xs">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> 3 Maiores Pontos de
                      Atenção
                    </div>
                    <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                      {companyAiSummary.aiInterpretations.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-indigo-900">
                        Próxima Atenção:{' '}
                      </span>
                      <span className="text-xs text-slate-700">
                        {companyAiSummary.nextActionAdvice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid dos Cards Obrigatórios da Empresa */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Centros no Escopo */}
              <Card className="shadow-2xs">
                <CardHeader className="p-3.5 pb-1">
                  <CardTitle className="text-xs text-slate-500 font-medium">
                    Centros no Escopo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-2xl font-black text-slate-900">
                    {data.consolidatedCompany.totalCenters}
                  </div>
                  <div className="text-[10px] text-slate-600 flex flex-wrap gap-1 leading-tight">
                    <span className="text-emerald-700 font-bold">
                      {data.consolidatedCompany.centersOperating} op
                    </span>{' '}
                    •{' '}
                    <span className="text-rose-700 font-bold">
                      {data.consolidatedCompany.centersStopped} par
                    </span>{' '}
                    •{' '}
                    <span className="text-amber-700 font-bold">
                      {data.consolidatedCompany.centersInSetup} set
                    </span>{' '}
                    •{' '}
                    <span className="text-blue-700 font-bold">
                      {data.consolidatedCompany.centersScheduledStop} prog
                    </span>{' '}
                    •{' '}
                    <span className="text-slate-500 font-bold">
                      {data.consolidatedCompany.centersWithoutSchedule} s/prg
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* OEE da Empresa */}
              <Card className="shadow-2xs">
                <CardHeader className="p-3.5 pb-1">
                  <CardTitle className="text-xs text-slate-500 font-medium">
                    OEE da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-2xl font-black text-slate-900">
                    {data.consolidatedCompany.oeePct !== null
                      ? `${formatNumberPtBr(data.consolidatedCompany.oeePct)} %`
                      : 'N/D'}
                  </div>
                  <div className="text-[11px] text-slate-500">Meta corporativa: 85,00 %</div>
                </CardContent>
              </Card>

              {/* Taxa de Utilização */}
              <Card className="shadow-2xs">
                <CardHeader className="p-3.5 pb-1">
                  <CardTitle className="text-xs text-slate-500 font-medium">
                    Taxa de Utilização
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-2xl font-black text-slate-900">
                    {data.consolidatedCompany.utilizationPct !== null
                      ? `${formatNumberPtBr(data.consolidatedCompany.utilizationPct)} %`
                      : 'N/D'}
                  </div>
                  <div className="text-[11px] text-slate-500">Meta corporativa: 88,00 %</div>
                </CardContent>
              </Card>

              {/* Rendimento Metálico */}
              <Card className="shadow-2xs">
                <CardHeader className="p-3.5 pb-1">
                  <CardTitle className="text-xs text-slate-500 font-medium">
                    Rendimento Metálico
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-2xl font-black text-slate-900">
                    {data.consolidatedCompany.metallicYieldPct !== null
                      ? `${formatNumberPtBr(data.consolidatedCompany.metallicYieldPct)} %`
                      : 'N/D'}
                  </div>
                  <div className="text-[11px] text-slate-500">Meta nominal: 97,44 %</div>
                </CardContent>
              </Card>

              {/* Produção Realizada x Prevista */}
              <Card className="shadow-2xs">
                <CardHeader className="p-3.5 pb-1">
                  <CardTitle className="text-xs text-slate-500 font-medium">Produção (t)</CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-lg font-black text-slate-900">
                    {data.consolidatedCompany.realizedProductionTons !== null
                      ? `${formatNumberPtBr(data.consolidatedCompany.realizedProductionTons)} t`
                      : 'N/D'}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      /{' '}
                      {data.consolidatedCompany.plannedProductionTons !== null
                        ? `${formatNumberPtBr(data.consolidatedCompany.plannedProductionTons)} t`
                        : 'N/D'}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600">
                    Atingimento:{' '}
                    {data.consolidatedCompany.achievementPct !== null
                      ? `${formatNumberPtBr(data.consolidatedCompany.achievementPct)} %`
                      : 'N/D'}
                  </div>
                </CardContent>
              </Card>

              {/* Taxa Atual e Tempo Parado */}
              <Card className="shadow-2xs">
                <CardHeader className="p-3.5 pb-1">
                  <CardTitle className="text-xs text-slate-500 font-medium">
                    Taxa Atual / Parada
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 pt-0 space-y-1">
                  <div className="text-xl font-black text-slate-900">
                    {data.consolidatedCompany.currentProductionRatePerHour !== null
                      ? `${formatNumberPtBr(data.consolidatedCompany.currentProductionRatePerHour)} t/h`
                      : '0,00 t/h'}
                  </div>
                  <div className="text-[11px] text-rose-600 font-semibold">
                    Parada total:{' '}
                    {formatSecondsToHms(data.consolidatedCompany.totalStoppedTimeSeconds)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* NÍVEL 2: SITUAÇÃO DAS LINHAS */}
          <section className="space-y-4 pt-3" data-testid="realtime-level-2-lines">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#004C97]" />
                Nível 2 — Situação das Linhas Produtivas
              </h2>
              <span className="text-xs text-slate-500">
                {data.linesData.length} linha(s) em monitoramento
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.linesData.map((line) => (
                <div
                  key={line.lineCode}
                  onClick={() => handleOpenLineDrilldown(line)}
                  className="bg-white border border-slate-200 hover:border-[#004C97] rounded-2xl p-5 shadow-xs transition-all cursor-pointer hover:shadow-md space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {line.lineCode}
                        </span>
                        {renderStatusBadge(line.status)}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{line.lineName}</h3>
                      <div className="text-xs text-slate-500">
                        {line.plantName} • {line.companyName}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      {line.scheduleSituation.replace('_', ' ')}
                    </Badge>
                  </div>

                  {/* Métricas Principais da Linha */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[11px] text-slate-400">Produção Realizada</span>
                      <p className="text-sm font-black text-slate-800">
                        {line.realizedTons !== null
                          ? `${formatNumberPtBr(line.realizedTons)} t`
                          : 'N/D'}
                        <span className="text-xs font-normal text-slate-400">
                          {' '}
                          /{' '}
                          {line.plannedTons !== null
                            ? `${formatNumberPtBr(line.plannedTons)} t`
                            : 'N/D'}
                        </span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400">Atingimento %</span>
                      <p className="text-sm font-black text-emerald-600">
                        {line.achievementPct !== null
                          ? `${formatNumberPtBr(line.achievementPct)} %`
                          : 'N/D'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400">OEE / Utilização</span>
                      <p className="text-sm font-black text-slate-800">
                        {line.oeePct !== null ? `${formatNumberPtBr(line.oeePct)} %` : 'N/D'} /{' '}
                        {line.utilizationPct !== null
                          ? `${formatNumberPtBr(line.utilizationPct)} %`
                          : 'N/D'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400">Taxa Atual (t/h)</span>
                      <p className="text-sm font-black text-slate-800">
                        {line.currentRatePerHour !== null
                          ? `${formatNumberPtBr(line.currentRatePerHour)} t/h`
                          : '0,00 t/h'}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span
                      className="truncate max-w-[200px]"
                      title={line.currentProduct || 'Sem produto em processo'}
                    >
                      Produto: {line.currentProduct || 'Sem produto em processo'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Atualizado às {line.lastUpdated.slice(11, 19)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* NÍVEL 3: DETALHAMENTO POR CENTRO (LINHAS EXPANSÍVEIS COM TODAS AS ESPECIFICAÇÕES) */}
          <section className="space-y-4 pt-3" data-testid="realtime-level-3-centers">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#004C97]" />
                Nível 3 — Detalhamento por Centro Produtivo (Expansível)
              </h2>
              <span className="text-xs text-slate-500">
                Clique nas linhas para expandir/recolher e nos indicadores para abrir o drill-down
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10"></th>
                      <th className="p-3">Centro / Linha</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Produto Atual (OP)</th>
                      <th className="p-3">Produção (t)</th>
                      <th className="p-3">Atingimento %</th>
                      <th className="p-3">Taxa (t/h)</th>
                      <th className="p-3">OEE</th>
                      <th className="p-3">Utilização</th>
                      <th className="p-3">Rendimento</th>
                      <th className="p-3">Última Atualização</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.linesData
                      .flatMap((l) => l.centers)
                      .map((center) => {
                        const isExpanded = !!expandedCenters[center.centerCode]

                        return (
                          <React.Fragment key={center.centerCode}>
                            <tr
                              className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                                isExpanded ? 'bg-blue-50/20' : ''
                              }`}
                              onClick={() => toggleCenterExpand(center.centerCode)}
                            >
                              <td className="p-3 text-center">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{center.centerName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {center.centerCode} • {center.lineName}
                                </div>
                              </td>
                              <td className="p-3">{renderStatusBadge(center.status)}</td>
                              <td className="p-3 max-w-[180px]">
                                <div
                                  className="font-semibold text-slate-800 truncate"
                                  title={center.materialDescription || ''}
                                >
                                  {center.materialDescription || 'Sem ordem'}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  OP: {center.productionOrder || '-'}
                                </div>
                              </td>
                              <td className="p-3 font-mono">
                                <span className="font-bold text-slate-900">
                                  {center.realizedTons !== null
                                    ? `${formatNumberPtBr(center.realizedTons)} t`
                                    : 'N/D'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {' '}
                                  /{' '}
                                  {center.programmedTons !== null
                                    ? `${formatNumberPtBr(center.programmedTons)} t`
                                    : 'N/D'}
                                </span>
                              </td>
                              <td className="p-3">
                                {center.achievementPct !== null ? (
                                  <span
                                    className={`font-bold ${
                                      center.achievementPct >= 100
                                        ? 'text-emerald-700'
                                        : center.achievementPct >= 80
                                          ? 'text-amber-600'
                                          : 'text-rose-600'
                                    }`}
                                  >
                                    {center.achievementPct > 100 ? `Previsto: ` : ''}
                                    {formatNumberPtBr(center.achievementPct)} %
                                  </span>
                                ) : (
                                  <span className="text-slate-400">N/D</span>
                                )}
                              </td>
                              <td className="p-3 font-mono">
                                <span className="font-bold text-slate-900">
                                  {center.currentRatePerHour !== null
                                    ? `${formatNumberPtBr(center.currentRatePerHour)} t/h`
                                    : '0,00 t/h'}
                                </span>
                                <div className="text-[10px] text-slate-400">
                                  Plan:{' '}
                                  {center.plannedRatePerHour !== null
                                    ? `${formatNumberPtBr(center.plannedRatePerHour)} t/h`
                                    : 'N/D'}
                                </div>
                              </td>
                              <td
                                className="p-3 font-bold text-blue-700 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenCenterDrilldown(center)
                                }}
                              >
                                {center.oee.value !== null
                                  ? `${formatNumberPtBr(center.oee.value)} %`
                                  : 'N/D'}
                              </td>
                              <td
                                className="p-3 font-bold text-slate-800 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenCenterDrilldown(center)
                                }}
                              >
                                {center.utilization.value !== null
                                  ? `${formatNumberPtBr(center.utilization.value)} %`
                                  : 'N/D'}
                              </td>
                              <td
                                className="p-3 font-bold text-slate-800 hover:underline cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenCenterDrilldown(center)
                                }}
                              >
                                {center.metallicYield.yieldPct !== null
                                  ? `${formatNumberPtBr(center.metallicYield.yieldPct)} %`
                                  : 'N/D'}
                              </td>
                              <td className="p-3 text-[11px] text-slate-500">
                                {center.lastUpdated.slice(11, 19)}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenCenterDrilldown(center)
                                  }}
                                  className="h-7 text-xs text-[#004C97] border-blue-200 hover:bg-blue-50"
                                >
                                  Detalhes
                                </Button>
                              </td>
                            </tr>

                            {/* LINHA EXPANDIDA COM OS 3 BLOCOS OBRIGATÓRIOS DO CENTRO */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 border-b border-slate-200">
                                <td colSpan={12} className="p-5 space-y-4">
                                  {/* Resumo IA do Centro */}
                                  <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-2xs space-y-2">
                                    <div className="flex items-center gap-2 text-[#004C97] font-bold text-xs">
                                      <Sparkles className="w-4 h-4 text-indigo-600" />
                                      Resumo Operacional IA — Centro {center.centerName}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
                                      <div>
                                        <span className="font-semibold text-slate-700">
                                          Fatos da Fonte:{' '}
                                        </span>
                                        <p className="text-slate-600">
                                          Material em conformação:{' '}
                                          {center.materialDescription || 'Nenhum'} (OP{' '}
                                          {center.productionOrder || 'N/A'}). Produção atual de{' '}
                                          {center.realizedTons !== null
                                            ? `${formatNumberPtBr(center.realizedTons)} t`
                                            : 'N/D'}
                                          .
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-amber-700">
                                          Alertas Calculados:{' '}
                                        </span>
                                        <p className="text-slate-600">
                                          {center.activeStop
                                            ? `Parada Ativa: ${center.activeStop.reason} (${center.activeStop.durationMinutes} min).`
                                            : 'Operação dentro dos padrões sem paradas críticas ativas.'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="font-semibold text-indigo-700">
                                          Próxima Atenção:{' '}
                                        </span>
                                        <p className="text-slate-600">
                                          {center.activeStop
                                            ? `Acompanhar retorno previsto: ${center.activeStop.expectedReturnDatetime || 'Imediato'}.`
                                            : 'Garantir alimentação de tarugos para o próximo produto.'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Detalhamento de Produção e Paradas */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Bloco 1: Produção Atual */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                                      <div className="text-xs font-bold text-slate-800 border-b pb-1.5 flex items-center justify-between">
                                        <span>Produção Atual & Material</span>
                                        <Badge variant="outline" className="text-[10px]">
                                          OP: {center.productionOrder || 'Sem OP'}
                                        </Badge>
                                      </div>
                                      <div className="text-xs space-y-1 text-slate-600">
                                        <div>
                                          <span className="font-semibold">Material:</span>{' '}
                                          {center.materialDescription || 'N/D'}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Dimensão / Aço:</span>{' '}
                                          {center.dimension} / {center.steelGrade}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Campanha:</span>{' '}
                                          {center.campaign}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Início Real:</span>{' '}
                                          {center.productionStartTime} |{' '}
                                          <span className="font-semibold">Término Previsto:</span>{' '}
                                          {center.productionForecastEndTime}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bloco 2: Volumes e Taxas */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                                      <div className="text-xs font-bold text-slate-800 border-b pb-1.5 flex items-center justify-between">
                                        <span>Volumes & Cadência (t/h)</span>
                                        <span className="text-[11px] font-semibold text-emerald-600">
                                          {center.achievementPct !== null
                                            ? `${formatNumberPtBr(center.achievementPct)} %`
                                            : 'N/D'}
                                        </span>
                                      </div>
                                      <div className="text-xs space-y-1 text-slate-600">
                                        <div>
                                          <span className="font-semibold">Programado:</span>{' '}
                                          {center.programmedTons !== null
                                            ? `${formatNumberPtBr(center.programmedTons)} t`
                                            : 'N/D'}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Realizado:</span>{' '}
                                          {center.realizedTons !== null
                                            ? `${formatNumberPtBr(center.realizedTons)} t`
                                            : 'N/D'}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Saldo:</span>{' '}
                                          {center.balanceTons !== null
                                            ? `${formatNumberPtBr(center.balanceTons)} t`
                                            : 'N/D'}
                                        </div>
                                        <div>
                                          <span className="font-semibold">Taxa Instantânea:</span>{' '}
                                          {center.currentRatePerHour !== null
                                            ? `${formatNumberPtBr(center.currentRatePerHour)} t/h`
                                            : '0,00 t/h'}{' '}
                                          (Meta:{' '}
                                          {center.plannedRatePerHour !== null
                                            ? `${formatNumberPtBr(center.plannedRatePerHour)} t/h`
                                            : 'N/D'}
                                          )
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bloco 3: Paradas por Centro */}
                                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
                                      <div className="text-xs font-bold text-slate-800 border-b pb-1.5 flex items-center justify-between">
                                        <span>Paradas do Turno</span>
                                        <Badge
                                          variant={center.activeStop ? 'destructive' : 'secondary'}
                                          className="text-[10px]"
                                        >
                                          {center.activeStop ? 'Parada Ativa' : 'Normal'}
                                        </Badge>
                                      </div>
                                      <div className="text-xs space-y-1 text-slate-600">
                                        <div>
                                          <span className="font-semibold">
                                            Ocorrências no Turno:
                                          </span>{' '}
                                          {center.stopsCountShift}
                                        </div>
                                        <div>
                                          <span className="font-semibold">
                                            Tempo Parado no Turno:
                                          </span>{' '}
                                          {center.stoppedMinutesShift} min
                                        </div>
                                        {center.activeStop && (
                                          <div className="pt-1 text-rose-700 font-semibold border-t">
                                            {center.activeStop.categoryLabel}:{' '}
                                            {center.activeStop.reason} (
                                            {center.activeStop.durationMinutes} min)
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Botão de Ação do Centro */}
                                  <div className="flex justify-end pt-1">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleOpenCenterDrilldown(center)}
                                      className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold gap-1.5"
                                    >
                                      <Activity className="w-3.5 h-3.5" />
                                      Abrir Painel Completo do Centro
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}

      {/* MODAL / DRAWER AMPLO E RESPONSIVO (94% VIEWPORT DESKTOP) */}
      <RealtimeDrilldownModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={selectedCenter ? 'CENTRO' : selectedLine ? 'LINE' : 'COMPANY'}
        title={modalTitle}
        center={selectedCenter}
        line={selectedLine}
        company={data?.consolidatedCompany}
      />
    </div>
  )
}

export default RealtimeAnalysisPage
