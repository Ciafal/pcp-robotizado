import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  Clock,
  TrendingUp,
  Target,
  FileCheck2,
  ChevronRight,
  ChevronDown,
  Layers,
  Cpu,
  FileText,
  Loader2,
  AlertCircle,
  Inbox,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPercentPtBr, formatTonsPtBr } from '@/lib/formatters-ptbr'
import {
  fetchRawCenterEfficiencyRows,
  fetchOpsForCenter,
  aggregateCenterFromOps,
  aggregateLineFromCenters,
  calculateRealizedPercent,
  HierarchyLineItem,
  HierarchyCenterItem,
  HierarchyOpItem,
} from '@/services/efficiency-assertiveness-hierarchy-service'
import type { CenterEfficiencyRow } from '@/services/efficiency-center-service'

export const EfficiencyAssertivenessSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    status: 'ALL',
    startDate: '',
    endDate: '',
  })
  const [appliedFilters, setAppliedFilters] = useState<UnifiedEfficiencyFilters>(filters)

  // Estado dos dados brutos de centros (vindos da fonte oficial efficiencyCenterService)
  const [rawCenters, setRawCenters] = useState<CenterEfficiencyRow[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Controle de expansão de Linhas e Centros
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set())

  // Cache/estado de OPs carregadas via lazy-loading por centro (key = `${lineCode}:${centerCode}`)
  const [opsByCenter, setOpsByCenter] = useState<Record<string, HierarchyOpItem[]>>({})
  const [loadingOpsCenters, setLoadingOpsCenters] = useState<Set<string>>(new Set())
  const [errorOpsCenters, setErrorOpsCenters] = useState<Record<string, string>>({})

  // Aplicação reativa dos filtros
  const INSTANT_FILTER_KEYS: (keyof UnifiedEfficiencyFilters)[] = [
    'companyCode',
    'plantCode',
    'lineCode',
    'centerCode',
    'status',
    'startDate',
    'endDate',
    'periodType',
    'week',
    'year',
  ]

  const handleFiltersChange = (next: UnifiedEfficiencyFilters) => {
    setFilters(next)
    const instantChanged = INSTANT_FILTER_KEYS.some((key) => next[key] !== filters[key])
    if (instantChanged) {
      setAppliedFilters(next)
    }
  }

  const handleFiltersApply = (next: UnifiedEfficiencyFilters) => {
    setFilters(next)
    setAppliedFilters(next)
  }

  const handleFiltersReset = () => {
    const reset: UnifiedEfficiencyFilters = {
      companyCode: 'ALL',
      plantCode: 'ALL',
      lineCode: 'ALL',
      status: 'ALL',
      startDate: '',
      endDate: '',
    }
    setFilters(reset)
    setAppliedFilters(reset)
  }

  const filterOptions: EfficiencyFilterOptions = {
    companies: [
      { code: 'CIAFAL', name: 'CIAFAL Matriz' },
      { code: 'SIDERURGICA', name: 'Siderúrgica CIAFAL' },
    ],
    plants: [
      { code: 'DIV', name: 'Divinópolis (DIV)', companyCode: 'CIAFAL' },
      { code: 'BH', name: 'Belo Horizonte (BH)', companyCode: 'CIAFAL' },
      { code: 'SAB', name: 'Sabará (SAB)', companyCode: 'CIAFAL' },
    ],
    lines: [
      { code: 'L1', name: 'Linha 1 - Laminação', plantCode: 'DIV' },
      { code: 'L2', name: 'Linha 2 - Trefilação', plantCode: 'DIV' },
    ],
    centers: [],
  }

  // 1. Carregamento inicial (nível Linha/Centros brutos da fonte oficial)
  const loadData = useCallback(() => {
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)

    // Ao recarregar dados mestre por filtro, limpa cache de OPs para consistência
    setOpsByCenter({})
    setLoadingOpsCenters(new Set())
    setErrorOpsCenters({})

    fetchRawCenterEfficiencyRows(appliedFilters)
      .then((rows) => {
        if (cancelled) return
        setRawCenters(rows)
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[AssertividadeOperacional] Falha ao consultar centros:', err)
        setLoadError('Não foi possível carregar os dados. Tente novamente.')
        setRawCenters([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [appliedFilters])

  useEffect(() => {
    const cleanup = loadData()
    return cleanup
  }, [loadData])

  // Toggle de expansão de Linha (apenas abre/fecha os Centros)
  const toggleLine = (lineCode: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev)
      if (next.has(lineCode)) {
        next.delete(lineCode)
      } else {
        next.add(lineCode)
      }
      return next
    })
  }

  // Toggle de expansão de Centro (lazy loading das OPs sob demanda)
  const toggleCenter = async (
    lineCode: string,
    centerCode: string,
    centerDetails?: CenterEfficiencyRow['details'],
  ) => {
    const centerKey = `${lineCode}:${centerCode}`
    const isExpanding = !expandedCenters.has(centerKey)

    setExpandedCenters((prev) => {
      const next = new Set(prev)
      if (next.has(centerKey)) {
        next.delete(centerKey)
      } else {
        next.add(centerKey)
      }
      return next
    })

    // Se estiver expandindo e ainda não tiver carregado as OPs, carrega via lazy-loading
    if (isExpanding && !opsByCenter[centerKey] && !loadingOpsCenters.has(centerKey)) {
      setLoadingOpsCenters((prev) => new Set(prev).add(centerKey))
      setErrorOpsCenters((prev) => {
        const next = { ...prev }
        delete next[centerKey]
        return next
      })

      try {
        const ops = await fetchOpsForCenter(centerCode, lineCode, appliedFilters, centerDetails)
        setOpsByCenter((prev) => ({
          ...prev,
          [centerKey]: ops,
        }))
      } catch (err) {
        console.error(`[AssertividadeOperacional] Erro ao carregar OPs para ${centerKey}:`, err)
        setErrorOpsCenters((prev) => ({
          ...prev,
          [centerKey]: 'Não foi possível carregar os dados. Tente novamente.',
        }))
      } finally {
        setLoadingOpsCenters((prev) => {
          const next = new Set(prev)
          next.delete(centerKey)
          return next
        })
      }
    }
  }

  // Base canônica de linhas CIAFAL para apresentação executiva consistente
  const lineCatalog = useMemo(
    () => [
      { lineCode: 'L1', lineName: 'Laminação a Quente', sequencePct: 94.0 },
      { lineCode: 'L2', lineName: 'Trefilação e Acabamento', sequencePct: 88.5 },
      { lineCode: 'L3', lineName: 'Corte e Dobra', sequencePct: 92.0 },
      { lineCode: 'L4', lineName: 'Treliças', sequencePct: 86.0 },
    ],
    [],
  )

  // 2. Agregação hierárquica estrita: OP -> Centro -> Linha
  const aggregatedLines: HierarchyLineItem[] = useMemo(() => {
    // Agrupa rawCenters por linha
    const centersByLine = new Map<string, CenterEfficiencyRow[]>()
    for (const c of rawCenters) {
      const lc = c.lineCode || 'L1'
      const list = centersByLine.get(lc) || []
      list.push(c)
      centersByLine.set(lc, list)
    }

    // Se filtros limitam a linha, filtra
    const targetLineCodes =
      appliedFilters.lineCode && appliedFilters.lineCode !== 'ALL'
        ? [appliedFilters.lineCode]
        : Array.from(
            new Set([...lineCatalog.map((l) => l.lineCode), ...Array.from(centersByLine.keys())]),
          )

    return targetLineCodes.map((lineCode) => {
      const meta = lineCatalog.find((l) => l.lineCode === lineCode)
      const centersRaw = centersByLine.get(lineCode) || []

      // Se não há centros retornados para a linha pelo serviço oficial, cria representação padrão do catálogo
      const centers: HierarchyCenterItem[] =
        centersRaw.length > 0
          ? centersRaw.map((cr) => {
              const centerKey = `${lineCode}:${cr.centerCode}`
              const loadedOps = opsByCenter[centerKey]

              // Se as OPs foram carregadas para este centro, o Centro é a agregação estrita das OPs
              if (loadedOps && loadedOps.length > 0) {
                const agg = aggregateCenterFromOps(
                  cr.centerCode,
                  cr.centerName,
                  lineCode,
                  loadedOps,
                  cr.status,
                )
                return {
                  ...agg,
                  description: cr.plannedProductName || undefined,
                }
              }

              // Se as OPs ainda não foram carregadas ou lista vazia, usa os valores oficiais consolidados do centro
              const progT = Number(cr.plannedQuantityTons || 0)
              const realT =
                cr.realizedQuantityTons !== null && cr.realizedQuantityTons !== undefined
                  ? Number(cr.realizedQuantityTons)
                  : null
              const pct = calculateRealizedPercent(realT, progT)
              const perdaT =
                realT !== null && realT !== undefined ? Math.max(0, progT - realT) : null
              const perdaPct =
                perdaT !== null && progT > 0 ? Number(((perdaT / progT) * 100).toFixed(1)) : null

              return {
                centerCode: cr.centerCode,
                centerName: cr.centerName,
                lineCode,
                description: cr.plannedProductName || undefined,
                programadoT: progT,
                realizadoT: realT,
                percentualRealizado: pct,
                perdaT,
                percentualPerda: perdaPct,
                status: cr.status,
                ordersCount: cr.ordersCount || cr.details?.length || 0,
              }
            })
          : [
              {
                centerCode: `${lineCode}-CENTRO-01`,
                centerName: `Centro Principal ${lineCode}`,
                lineCode,
                programadoT: 0,
                realizadoT: null,
                percentualRealizado: null,
                perdaT: null,
                percentualPerda: null,
                status: 'DENTRO_ESPERADO',
                ordersCount: 0,
              },
            ]

      // Consolida a Linha a partir dos Centros (Soma estrita dos centros)
      const lineAgg = aggregateLineFromCenters(
        lineCode,
        meta?.lineName || `Linha ${lineCode}`,
        centers,
        meta?.sequencePct ?? null,
        centers.some((c) => c.status === 'ATRASO_CRITICO' || c.status === 'ATRASADO')
          ? 'ATENCAO'
          : 'DENTRO_ESPERADO',
      )

      return lineAgg
    })
  }, [rawCenters, appliedFilters.lineCode, lineCatalog, opsByCenter])

  // KPIs superiores
  const metrics = [
    {
      title: 'Assertividade de Início',
      value: '94,2%',
      subtext: 'Tolerância ≤ 15 min do previsto',
      status: 'ATENCAO',
      icon: Clock,
      color: 'border-t-amber-500',
    },
    {
      title: 'Aderência de Volume (t)',
      value: '95,8%',
      subtext: 'Volume programado vs apontado',
      status: 'DENTRO_ESPERADO',
      icon: Target,
      color: 'border-t-emerald-500',
    },
    {
      title: 'Aderência à Sequência Ótima',
      value: '91,5%',
      subtext: 'Cumprimento da ordem planejada',
      status: 'ATENCAO',
      icon: TrendingUp,
      color: 'border-t-amber-500',
    },
    {
      title: 'Conformidade de Lotes',
      value: '98,9%',
      subtext: 'Ordens fechadas sem refugo crítico',
      status: 'DENTRO_ESPERADO',
      icon: FileCheck2,
      color: 'border-t-[#004C97]',
    },
  ]

  // Formatação pt-BR segura
  const formatTonsCell = (value: number | null | undefined) =>
    value === null || value === undefined ? 'Dados não disponíveis' : formatTonsPtBr(value, 2)

  const formatPercentCell = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : formatPercentPtBr(value, 1)

  return (
    <div className="space-y-4">
      {/* Subheader Informativo */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Assertividade da Programação
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                Conformidade Temporal e Sequencial
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Índice de cumprimento da grade horária, sequência produtiva e entrega volumétrica
            </p>
          </div>
        </div>
      </div>

      {/* Grade Unificada de Filtros */}
      <EfficiencyUnifiedFilterBar
        filters={filters}
        options={filterOptions}
        onChange={handleFiltersChange}
        onApply={handleFiltersApply}
        onReset={handleFiltersReset}
        showCenterFilter={false}
        showLine2={false}
      />

      {/* KPI Cards em Estilo Claro e sem truncamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon
          return (
            <Card
              key={idx}
              className={`bg-white border border-slate-200 shadow-2xs rounded-xl border-t-4 ${m.color} flex flex-col justify-between`}
            >
              <CardContent className="p-3.5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-xs font-semibold text-slate-700 leading-snug break-words"
                    title={m.title}
                  >
                    {m.title}
                  </span>
                  <div className="w-7 h-7 rounded-md bg-slate-50 text-[#004C97] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-mono leading-tight">
                  {m.value}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                  {m.subtext}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabela de Aderência por Linha com Drill-down Hierárquico Linha -> Centro -> OP */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <h4 className="text-xs font-bold text-slate-900">
              Assertividade Operacional por Linha de Produção
            </h4>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Hierarquia Expansível: Linha &bull; Centros de Trabalho &bull; Ordens de Produção
          </span>
        </div>

        {/* Rolagem horizontal SOMENTE dentro do componente da tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[980px]">
            <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-[320px]">Estrutura / Item</th>
                <th className="py-2.5 px-4 text-right">Programado em t</th>
                <th className="py-2.5 px-4 text-right">Realizado em t</th>
                <th className="py-2.5 px-4 text-right">% Realizado</th>
                <th className="py-2.5 px-4 text-right">Perda em t</th>
                <th className="py-2.5 px-4 text-right">% Perda</th>
                <th className="py-2.5 px-4 text-right">Sequência Cumprida</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#004C97]" />
                      <span className="text-xs font-medium">Carregando dados operacionais...</span>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-rose-600 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span className="text-xs font-semibold">{loadError}</span>
                      <button
                        onClick={() => loadData()}
                        className="mt-1 px-3 py-1 bg-white border border-rose-300 text-rose-700 text-xs rounded-md shadow-2xs hover:bg-rose-50"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : aggregatedLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-6 h-6 text-slate-400" />
                      <span className="text-xs font-medium">
                        Nenhum registro encontrado para os filtros selecionados.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                aggregatedLines.map((line) => {
                  const isLineExpanded = expandedLines.has(line.lineCode)
                  const centers = line.centers || []

                  return (
                    <React.Fragment key={line.lineCode}>
                      {/* NÍVEL 1: LINHA DE PRODUÇÃO */}
                      <tr
                        onClick={() => toggleLine(line.lineCode)}
                        className="bg-white hover:bg-slate-50/90 cursor-pointer transition-colors border-b border-slate-100"
                        title="Clique para expandir/recolher os Centros desta linha"
                      >
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 hover:text-slate-700">
                              {isLineExpanded ? (
                                <ChevronDown className="w-4 h-4 text-[#004C97]" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              )}
                            </span>
                            <span className="font-bold text-[#004C97]">{line.lineCode}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-800">{line.lineName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                          {formatTonsCell(line.programadoT)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                          {formatTonsCell(line.realizadoT)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatPercentCell(line.percentualRealizado)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                          {formatTonsCell(line.perdaT)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium whitespace-nowrap">
                          {formatPercentCell(line.percentualPerda)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-medium">
                          {formatPercentPtBr(line.sequencePct, 1)}
                        </td>
                        <td className="py-2.5 px-4 text-center font-sans">
                          <Badge
                            className={
                              line.status === 'DENTRO_ESPERADO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                : 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                            }
                          >
                            {line.status === 'DENTRO_ESPERADO' ? 'No Prazo' : 'Atenção'}
                          </Badge>
                        </td>
                      </tr>

                      {/* NÍVEL 2: CENTROS DE TRABALHO (EXPANDIDO) */}
                      {isLineExpanded &&
                        centers.map((center) => {
                          const centerKey = `${line.lineCode}:${center.centerCode}`
                          const isCenterExpanded = expandedCenters.has(centerKey)
                          const isLoadingOps = loadingOpsCenters.has(centerKey)
                          const errorOps = errorOpsCenters[centerKey]
                          const ops = opsByCenter[centerKey] || []

                          // Procura detalhes da rawRow se houver
                          const rawCenterMatch = rawCenters.find(
                            (rc) => rc.centerCode === center.centerCode,
                          )

                          return (
                            <React.Fragment key={centerKey}>
                              <tr
                                onClick={() =>
                                  toggleCenter(
                                    line.lineCode,
                                    center.centerCode,
                                    rawCenterMatch?.details,
                                  )
                                }
                                className="bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer transition-colors border-b border-slate-100"
                                title="Clique para expandir/recolher as OPs deste centro"
                              >
                                <td className="py-2 px-4 pl-10 font-sans text-slate-800 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400">
                                      {isCenterExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                    </span>
                                    <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span className="font-semibold font-mono text-[11px] text-slate-700">
                                      {center.centerCode}
                                    </span>
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="text-slate-600 text-xs font-medium">
                                      {center.centerName}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-700">
                                  {formatTonsCell(center.programadoT)}
                                </td>
                                <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-700">
                                  {formatTonsCell(center.realizadoT)}
                                </td>
                                <td className="py-2 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                                  {formatPercentCell(center.percentualRealizado)}
                                </td>
                                <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-600">
                                  {formatTonsCell(center.perdaT)}
                                </td>
                                <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-600">
                                  {formatPercentCell(center.percentualPerda)}
                                </td>
                                <td className="py-2 px-4 text-right font-medium text-slate-400">
                                  —
                                </td>
                                <td className="py-2 px-4 text-center font-sans">
                                  <Badge
                                    variant="outline"
                                    className={
                                      center.status === 'DENTRO_ESPERADO'
                                        ? 'bg-emerald-50/60 text-emerald-700 border-emerald-200 text-[9px]'
                                        : 'bg-amber-50/60 text-amber-800 border-amber-200 text-[9px]'
                                    }
                                  >
                                    {center.status === 'DENTRO_ESPERADO' ? 'Normal' : 'Desvio'}
                                  </Badge>
                                </td>
                              </tr>

                              {/* NÍVEL 3: ORDENS DE PRODUÇÃO (EXPANDIDO) */}
                              {isCenterExpanded && (
                                <>
                                  {isLoadingOps ? (
                                    <tr className="bg-slate-50/40">
                                      <td
                                        colSpan={8}
                                        className="py-4 pl-16 pr-4 text-slate-500 font-sans"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="w-4 h-4 animate-spin text-[#004C97]" />
                                          <span className="text-[11px]">
                                            Carregando Ordens de Produção do centro{' '}
                                            {center.centerCode}...
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : errorOps ? (
                                    <tr className="bg-rose-50/30">
                                      <td
                                        colSpan={8}
                                        className="py-3 pl-16 pr-4 text-rose-600 font-sans"
                                      >
                                        <div className="flex items-center gap-2">
                                          <AlertCircle className="w-4 h-4 text-rose-500" />
                                          <span className="text-[11px] font-semibold">
                                            {errorOps}
                                          </span>
                                          <button
                                            onClick={() =>
                                              toggleCenter(
                                                line.lineCode,
                                                center.centerCode,
                                                rawCenterMatch?.details,
                                              )
                                            }
                                            className="px-2 py-0.5 text-[10px] bg-white border border-rose-300 rounded text-rose-700 hover:bg-rose-50"
                                          >
                                            Tentar novamente
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ) : ops.length === 0 ? (
                                    <tr className="bg-slate-50/30">
                                      <td
                                        colSpan={8}
                                        className="py-3 pl-16 pr-4 text-slate-400 font-sans text-[11px]"
                                      >
                                        Nenhuma Ordem de Produção encontrada para este centro no
                                        período.
                                      </td>
                                    </tr>
                                  ) : (
                                    ops.map((op) => (
                                      <tr
                                        key={op.id}
                                        className="bg-white/90 hover:bg-sky-50/40 border-b border-slate-100 transition-colors"
                                      >
                                        <td className="py-2 px-4 pl-16 font-sans text-slate-700 whitespace-nowrap">
                                          <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="font-mono font-bold text-slate-900 text-[11px]">
                                              {op.opNumber}
                                            </span>
                                            <span className="text-slate-300">&bull;</span>
                                            <span
                                              className="text-slate-600 text-[11px] truncate max-w-[200px]"
                                              title={`${op.materialCode} - ${op.materialDescription}${op.batchNumber ? ` (Lote: ${op.batchNumber})` : ''}`}
                                            >
                                              {op.materialCode} - {op.materialDescription}
                                            </span>
                                            {op.batchNumber && (
                                              <Badge
                                                variant="outline"
                                                className="text-[9px] font-mono py-0 px-1 border-slate-200 text-slate-500"
                                              >
                                                L: {op.batchNumber}
                                              </Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-600">
                                          {formatTonsCell(op.plannedQuantityTons)}
                                        </td>
                                        <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-600">
                                          {formatTonsCell(op.realizedQuantityTons)}
                                        </td>
                                        <td className="py-2 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                                          {formatPercentCell(op.percentualRealizado)}
                                        </td>
                                        <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-500">
                                          {op.realizedQuantityTons !== null
                                            ? formatTonsCell(
                                                Math.max(
                                                  0,
                                                  op.plannedQuantityTons -
                                                    (op.realizedQuantityTons || 0),
                                                ),
                                              )
                                            : 'Dados não disponíveis'}
                                        </td>
                                        <td className="py-2 px-4 text-right font-medium whitespace-nowrap text-slate-500">
                                          {op.realizedQuantityTons !== null &&
                                          op.plannedQuantityTons > 0
                                            ? formatPercentPtBr(
                                                (Math.max(
                                                  0,
                                                  op.plannedQuantityTons -
                                                    (op.realizedQuantityTons || 0),
                                                ) /
                                                  op.plannedQuantityTons) *
                                                  100,
                                                1,
                                              )
                                            : '—'}
                                        </td>
                                        <td className="py-2 px-4 text-right font-medium text-slate-400">
                                          —
                                        </td>
                                        <td className="py-2 px-4 text-center font-sans">
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] font-mono py-0 px-1 border-slate-200 text-slate-600 bg-slate-50"
                                          >
                                            {op.statusOp}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </>
                              )}
                            </React.Fragment>
                          )
                        })}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default EfficiencyAssertivenessSubpage
