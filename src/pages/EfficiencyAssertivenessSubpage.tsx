/**
 * Módulo Execução -> Previsto x Realizado (Assertividade Operacional)
 *
 * Tela de acompanhamento do cumprimento da programação industrial CIAFAL.
 *
 * Melhorias implementadas diretamente nesta tela existente:
 * 1. Coluna "Carteira (t)" nos 3 níveis (Linha, Centro, OP) com dados da carteira SAP ECC (ZSD28C / pcp_pedidos_carteira),
 *    sem duplicação de pedidos, '—' quando indisponível e preservando o sinal retornado.
 * 2. Ordem das 12 colunas oficiais:
 *    Estrutura/Item | Código | Ordem | Carteira (t) | Programado (t) | Realizado (t) | % Realizado | Perda (t) | % Perda | Sequência Cumprida | Status | Observação
 * 3. Três botões no cabeçalho da tabela (alinhados à direita):
 *    - Análise de IA (Agente Nativo Skip Cloud / PxrAiAnalysisModal)
 *    - Enviar HUB (Publicação de Comunicado Corporativo / PxrSendHubModal)
 *    - Enviar E-mail (Disparo corporativo via Resend em modo owner / PxrSendEmailModal)
 * 4. Hierarquia expansível Linha -> Centro -> OP com rolagem horizontal interna e conformidade rigorosa pt-BR.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Clock,
  Target,
  TrendingUp,
  FileCheck2,
  ChevronRight,
  ChevronDown,
  Layers,
  Cpu,
  FileText,
  AlertCircle,
  Inbox,
  Loader2,
  Sparkles,
  Building2,
  Mail,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/number-format'
import {
  EfficiencyUnifiedFilterBar,
  type UnifiedEfficiencyFilters,
  type UnifiedFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  loadOperationalCentersSummary,
  loadOpsByCenter,
  aggregateLineFromCenters,
  aggregateCenterFromOps,
  calculateRealizedPercent,
  fetchOpenPortfolioForHierarchy,
  type EfficiencyCenterSummaryRow,
  type HierarchyLineItem,
  type HierarchyCenterItem,
  type HierarchyOpItem,
} from '@/services/efficiency-assertiveness-hierarchy-service'
import {
  requestPxrAiAnalysis,
  loadOfficialOrLatestPxrAnalysis,
  type PxrAiStructuredAnalysis,
  type PxrSavedAnalysisRecord,
} from '@/services/assertiveness-pxr-ai-service'
import { PxrAiAnalysisModal } from '@/components/control-tower/efficiency/PxrAiAnalysisModal'
import { PxrSendHubModal } from '@/components/control-tower/efficiency/PxrSendHubModal'
import { PxrSendEmailModal } from '@/components/control-tower/efficiency/PxrSendEmailModal'

const INITIAL_FILTERS: UnifiedEfficiencyFilters = {
  companyCode: 'ALL',
  plantCode: 'ALL',
  lineCode: 'ALL',
  workCenterCode: 'ALL',
  shiftCode: 'ALL',
  status: 'ALL',
  periodPreset: 'WEEK_CURRENT',
  startDate: '',
  endDate: '',
  date: '',
  week: '',
  month: '',
  year: String(new Date().getFullYear()),
}

export const EfficiencyAssertivenessSubpage: React.FC = () => {
  // Filtros em edição e filtros aplicados
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>(INITIAL_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<UnifiedEfficiencyFilters>(INITIAL_FILTERS)

  // Estado dos dados
  const [rawCenters, setRawCenters] = useState<EfficiencyCenterSummaryRow[]>([])
  const [lineCatalog, setLineCatalog] = useState<
    { lineCode: string; lineName: string; sequencePct?: number }[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Mapa de OPs carregadas sob demanda: chave `${lineCode}:${centerCode}` -> HierarchyOpItem[]
  const [opsByCenter, setOpsByCenter] = useState<Record<string, HierarchyOpItem[]>>({})
  const [loadingOpsCenters, setLoadingOpsCenters] = useState<Set<string>>(new Set())
  const [errorOpsCenters, setErrorOpsCenters] = useState<Record<string, string>>({})

  // Estado de expansão do drill-down
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())
  const [expandedCenters, setExpandedCenters] = useState<Set<string>>(new Set())

  // Carteira SAP ECC em cache (para não refazer chamadas desnecessárias)
  const [carteiraMap, setCarteiraMap] = useState<Map<string, number>>(new Map())

  // Estados dos Modais das Melhorias 2, 3, 5 e 6
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [isHubModalOpen, setIsHubModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Análise de IA persistida / ativa
  const [currentAiAnalysis, setCurrentAiAnalysis] = useState<PxrAiStructuredAnalysis | null>(null)
  const [savedAnalysisRecord, setSavedAnalysisRecord] = useState<PxrSavedAnalysisRecord | null>(
    null,
  )

  // Opções para a barra unificada de filtros
  const filterOptions: UnifiedFilterOptions = useMemo(
    () => ({
      companies: [
        { code: 'ALL', name: 'Todas as Empresas' },
        { code: 'CIAFAL', name: 'CIAFAL Siderurgia' },
      ],
      plants: [
        { code: 'ALL', name: 'Todas as Plantas' },
        { code: 'P01', name: 'Planta Principal' },
      ],
      lines: [
        { code: 'ALL', name: 'Todas as Linhas' },
        { code: 'L1', name: 'Linha 1 — Laminação Fina' },
        { code: 'L2', name: 'Linha 2 — Laminação Pesada' },
        { code: 'L3', name: 'Linha 3 — Tratamento Térmico' },
        { code: 'SDC', name: 'Sidercentro — Corte e Dobra' },
      ],
      workCenters: [
        { code: 'ALL', name: 'Todos os Centros de Trabalho' },
        { code: 'FORNO-01', name: 'Forno de Reaquecimento 01', lineCode: 'L1' },
        { code: 'TREM-01', name: 'Trem de Laminação 01', lineCode: 'L1' },
        { code: 'TESOURA-01', name: 'Tesoura Voadora 01', lineCode: 'L1' },
        { code: 'FORNO-02', name: 'Forno de Reaquecimento 02', lineCode: 'L2' },
        { code: 'TREM-02', name: 'Trem de Laminação 02', lineCode: 'L2' },
        { code: 'RESFRIAMENTO-02', name: 'Leito de Resfriamento 02', lineCode: 'L2' },
      ],
      shifts: [
        { code: 'ALL', name: 'Todos os Turnos' },
        { code: 'TURNO_A', name: 'Turno A (Manhã)' },
        { code: 'TURNO_B', name: 'Turno B (Tarde)' },
        { code: 'TURNO_C', name: 'Turno C (Noite)' },
      ],
      statuses: [
        { code: 'ALL', name: 'Todos os Status' },
        { code: 'DENTRO_ESPERADO', name: 'Dentro do Esperado' },
        { code: 'ATRASADO', name: 'Atrasado' },
        { code: 'ATRASO_CRITICO', name: 'Atraso Crítico' },
      ],
    }),
    [],
  )

  // Carregamento inicial de dados
  const loadData = useCallback(
    async (currentFilters = appliedFilters) => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const result = await loadOperationalCentersSummary(currentFilters)
        setRawCenters(result.centers)
        setLineCatalog(result.lines)

        // Carrega análise de IA previamente aprovada ou mais recente se houver
        try {
          const saved = await loadOfficialOrLatestPxrAnalysis({
            empresa_code: currentFilters.companyCode,
            planta_code: currentFilters.plantCode,
            linha_code: currentFilters.lineCode,
          })
          if (saved) {
            setSavedAnalysisRecord(saved)
            if (saved.executive_summary) {
              setCurrentAiAnalysis({
                executive_summary: saved.executive_summary,
                identified_causes: (saved.ai_findings as any) || [],
                investigation_hypotheses: (saved.investigation_hypotheses as any) || [],
                recommendations: (saved.recommendations as any) || [],
                analyzed_at: saved.created,
              })
            }
          }
        } catch (err) {
          console.warn('[PxR] Sem análise de IA gravada prévia:', err)
        }

        // Consulta dados de carteira SAP ECC
        try {
          const portMap = await fetchOpenPortfolioForHierarchy(currentFilters)
          setCarteiraMap(portMap)
        } catch (err) {
          console.warn('[PxR] Carteira SAP não acessível diretamente:', err)
        }
      } catch (err) {
        console.error('[EfficiencyAssertivenessSubpage] Erro ao carregar dados:', err)
        setLoadError('Não foi possível carregar os dados de assertividade. Tente novamente.')
      } finally {
        setIsLoading(false)
      }
    },
    [appliedFilters],
  )

  useEffect(() => {
    loadData(appliedFilters)
  }, [appliedFilters, loadData])

  // Handlers da barra de filtros
  const handleFiltersChange = (newFilters: UnifiedEfficiencyFilters) => {
    setFilters(newFilters)
  }

  const handleFiltersApply = () => {
    setAppliedFilters({ ...filters })
    setOpsByCenter({})
    setExpandedLines(new Set())
    setExpandedCenters(new Set())
  }

  const handleFiltersReset = () => {
    setFilters(INITIAL_FILTERS)
    setAppliedFilters(INITIAL_FILTERS)
    setOpsByCenter({})
    setExpandedLines(new Set())
    setExpandedCenters(new Set())
  }

  // Toggle do Nível 1: Linha de Produção
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

  // Toggle do Nível 2: Centro de Trabalho (com Lazy Loading das OPs)
  const toggleCenter = async (lineCode: string, centerCode: string, details?: any[]) => {
    const centerKey = `${lineCode}:${centerCode}`

    setExpandedCenters((prev) => {
      const next = new Set(prev)
      if (next.has(centerKey)) {
        next.delete(centerKey)
      } else {
        next.add(centerKey)
      }
      return next
    })

    // Se ainda não carregou as OPs para este centro, dispara a busca sob demanda
    if (!opsByCenter[centerKey] && !loadingOpsCenters.has(centerKey)) {
      setLoadingOpsCenters((prev) => new Set(prev).add(centerKey))
      setErrorOpsCenters((prev) => {
        const next = { ...prev }
        delete next[centerKey]
        return next
      })

      try {
        const ops = await loadOpsByCenter(centerCode, lineCode, appliedFilters, details)
        setOpsByCenter((prev) => ({
          ...prev,
          [centerKey]: ops,
        }))
      } catch (err) {
        console.error(`[Efficiency] Erro ao carregar OPs do centro ${centerCode}:`, err)
        setErrorOpsCenters((prev) => ({
          ...prev,
          [centerKey]: 'Falha ao carregar ordens deste centro. Clique para tentar novamente.',
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

  // Construção e agregação hierárquica Linha -> Centros -> OPs
  const aggregatedLines: HierarchyLineItem[] = useMemo(() => {
    const linesToProcess =
      appliedFilters.lineCode && appliedFilters.lineCode !== 'ALL'
        ? [appliedFilters.lineCode]
        : lineCatalog.map((l) => l.lineCode)

    return linesToProcess.map((lineCode) => {
      const meta = lineCatalog.find((l) => l.lineCode === lineCode)
      const centersRaw = rawCenters.filter((rc) => rc.lineCode === lineCode)

      const centers: HierarchyCenterItem[] =
        centersRaw.length > 0
          ? centersRaw.map((cr) => {
              const centerKey = `${lineCode}:${cr.centerCode}`
              const loadedOps = opsByCenter[centerKey]

              // Se as OPs foram carregadas para este centro, o Centro agrega estritamente as OPs
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
                  ops: loadedOps,
                }
              }

              // Se as OPs ainda não foram carregadas, usa valores consolidados do centro
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
                carteiraT: cr.carteiraT ?? null,
                status: cr.status,
                ordersCount: cr.ordersCount || cr.details?.length || 0,
                ops: [],
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
                carteiraT: null,
                status: 'DENTRO_ESPERADO',
                ordersCount: 0,
                ops: [],
              },
            ]

      return aggregateLineFromCenters(
        lineCode,
        meta?.lineName || `Linha ${lineCode}`,
        centers,
        meta?.sequencePct ?? null,
        centers.some((c) => c.status === 'ATRASO_CRITICO' || c.status === 'ATRASADO')
          ? 'ATENCAO'
          : 'DENTRO_ESPERADO',
      )
    })
  }, [rawCenters, appliedFilters.lineCode, lineCatalog, opsByCenter])

  // Resumo para IA e Relatórios
  const executionSummary = useMemo(() => {
    let totalProg = 0
    let totalReal = 0
    let hasReal = false
    let totalPerda = 0
    let totalCarteira = 0
    let hasCarteira = false
    let totalOps = 0
    let opsNaoRealizadas = 0
    let opsParciais = 0
    let opsComAtraso = 0

    for (const line of aggregatedLines) {
      totalProg += line.programadoT || 0
      if (line.realizadoT !== null && line.realizadoT !== undefined) {
        hasReal = true
        totalReal += line.realizadoT
      }
      if (line.perdaT !== null && line.perdaT !== undefined) {
        totalPerda += line.perdaT
      }
      if (line.carteiraT !== null && line.carteiraT !== undefined) {
        hasCarteira = true
        totalCarteira += line.carteiraT
      }
      for (const center of line.centers || []) {
        for (const op of center.ops || []) {
          totalOps += 1
          if (!op.realizedQuantityTons || op.realizedQuantityTons === 0) {
            opsNaoRealizadas += 1
          } else if (op.realizedQuantityTons < op.plannedQuantityTons) {
            opsParciais += 1
          }
          if (op.statusOp === 'ATRASADO' || op.statusOp === 'ATRASO_CRITICO') {
            opsComAtraso += 1
          }
        }
      }
    }

    const pctGeral =
      totalProg > 0 && hasReal ? Number(((totalReal / totalProg) * 100).toFixed(1)) : null

    return {
      totalProgramadoT: totalProg,
      totalRealizadoT: totalReal,
      percentualRealizadoGeral: pctGeral,
      totalPerdaT: totalPerda,
      totalOps,
      opsNaoRealizadas,
      opsParciais,
      opsComAtraso,
      carteiraTotalT: hasCarteira ? totalCarteira : null,
    }
  }, [aggregatedLines])

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

  // Formatação pt-BR segura para células
  const formatTonsCell = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : formatTonsPtBr(value, 2)

  const formatPercentCell = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : formatPercentPtBr(value, 1)

  // Abrir Modal de IA disparando análise se ainda vazia
  const handleOpenAiModal = async () => {
    if (!currentAiAnalysis) {
      try {
        const res = await requestPxrAiAnalysis({
          filters: appliedFilters,
          hierarchy: aggregatedLines,
          summary: executionSummary,
        })
        if (res.success && res.analysis) {
          setCurrentAiAnalysis(res.analysis)
        }
      } catch (err) {
        console.warn('[PxR] Pré-análise IA automática:', err)
      }
    }
    setIsAiModalOpen(true)
  }

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
        {/* Cabeçalho da Tabela com Título e 3 Botões Alinhados à Direita (Melhoria 2) */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <h4 className="text-xs font-bold text-slate-900">
              Assertividade Operacional por Linha de Produção
            </h4>
          </div>

          {/* Botões de Ação Corporativa: 1. Análise de IA | 2. Enviar HUB | 3. Enviar E-mail */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenAiModal}
              className="text-xs gap-1.5 border-[#004C97]/30 text-[#004C97] hover:bg-[#004C97]/5 h-8 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Análise de IA</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsHubModalOpen(true)}
              className="text-xs gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100 h-8 shadow-2xs"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Enviar HUB</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => setIsEmailModalOpen(true)}
              className="text-xs gap-1.5 bg-[#004C97] hover:bg-[#003870] text-white h-8 shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-white" />
              <span>Enviar E-mail</span>
            </Button>
          </div>
        </div>

        {/* Rolagem horizontal SOMENTE dentro do componente da tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[1100px]">
            {/* Ordem Canônica das 12 Colunas Oficiais (Melhoria 1) */}
            <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 min-w-[240px]">Estrutura / Item</th>
                <th className="py-2.5 px-3 w-[100px]">Código</th>
                <th className="py-2.5 px-3 w-[110px]">Ordem</th>
                <th className="py-2.5 px-3 text-right w-[110px]">Carteira (t)</th>
                <th className="py-2.5 px-3 text-right w-[110px]">Programado (t)</th>
                <th className="py-2.5 px-3 text-right w-[110px]">Realizado (t)</th>
                <th className="py-2.5 px-3 text-right w-[95px]">% Realizado</th>
                <th className="py-2.5 px-3 text-right w-[95px]">Perda (t)</th>
                <th className="py-2.5 px-3 text-right w-[85px]">% Perda</th>
                <th className="py-2.5 px-3 text-right w-[115px]">Sequência Cumprida</th>
                <th className="py-2.5 px-3 text-center w-[90px]">Status</th>
                <th className="py-2.5 px-3 min-w-[140px]">Observação</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#004C97]" />
                      <span className="text-xs font-medium">Carregando dados operacionais...</span>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-rose-600 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span className="text-xs font-semibold">{loadError}</span>
                      <button
                        onClick={() => loadData()}
                        className="mt-1 px-3 py-1 bg-white border border-rose-300 text-rose-700 text-xs rounded-md shadow-2xs hover:bg-rose-50 font-sans"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </td>
                </tr>
              ) : aggregatedLines.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-sans">
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
                        {/* 1. Estrutura/Item */}
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
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
                        {/* 2. Código */}
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        {/* 3. Ordem */}
                        <td className="py-2.5 px-3 text-slate-400">—</td>
                        {/* 4. Carteira (t) */}
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap text-slate-800">
                          {formatTonsCell(line.carteiraT)}
                        </td>
                        {/* 5. Programado (t) */}
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          {formatTonsCell(line.programadoT)}
                        </td>
                        {/* 6. Realizado (t) */}
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap">
                          {formatTonsCell(line.realizadoT)}
                        </td>
                        {/* 7. % Realizado */}
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatPercentCell(line.percentualRealizado)}
                        </td>
                        {/* 8. Perda (t) */}
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap text-rose-700">
                          {formatTonsCell(line.perdaT)}
                        </td>
                        {/* 9. % Perda */}
                        <td className="py-2.5 px-3 text-right font-medium whitespace-nowrap text-rose-700">
                          {formatPercentCell(line.percentualPerda)}
                        </td>
                        {/* 10. Sequência Cumprida */}
                        <td className="py-2.5 px-3 text-right font-medium">
                          {formatPercentPtBr(line.sequencePct, 1)}
                        </td>
                        {/* 11. Status */}
                        <td className="py-2.5 px-3 text-center font-sans">
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
                        {/* 12. Observação */}
                        <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">—</td>
                      </tr>

                      {/* NÍVEL 2: CENTROS DE TRABALHO (EXPANDIDO) */}
                      {isLineExpanded &&
                        centers.map((center) => {
                          const centerKey = `${line.lineCode}:${center.centerCode}`
                          const isCenterExpanded = expandedCenters.has(centerKey)
                          const isLoadingOps = loadingOpsCenters.has(centerKey)
                          const errorOps = errorOpsCenters[centerKey]
                          const ops = opsByCenter[centerKey] || []

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
                                {/* 1. Estrutura/Item */}
                                <td className="py-2 px-3 pl-8 font-sans text-slate-800 whitespace-nowrap">
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
                                {/* 2. Código */}
                                <td className="py-2 px-3 text-slate-400">—</td>
                                {/* 3. Ordem */}
                                <td className="py-2 px-3 text-slate-400">—</td>
                                {/* 4. Carteira (t) */}
                                <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-700">
                                  {formatTonsCell(center.carteiraT)}
                                </td>
                                {/* 5. Programado (t) */}
                                <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-700">
                                  {formatTonsCell(center.programadoT)}
                                </td>
                                {/* 6. Realizado (t) */}
                                <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-700">
                                  {formatTonsCell(center.realizadoT)}
                                </td>
                                {/* 7. % Realizado */}
                                <td className="py-2 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                  {formatPercentCell(center.percentualRealizado)}
                                </td>
                                {/* 8. Perda (t) */}
                                <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-600">
                                  {formatTonsCell(center.perdaT)}
                                </td>
                                {/* 9. % Perda */}
                                <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-600">
                                  {formatPercentCell(center.percentualPerda)}
                                </td>
                                {/* 10. Sequência Cumprida */}
                                <td className="py-2 px-3 text-right font-medium text-slate-400">
                                  —
                                </td>
                                {/* 11. Status */}
                                <td className="py-2 px-3 text-center font-sans">
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
                                {/* 12. Observação */}
                                <td className="py-2 px-3 text-slate-500 font-sans text-[11px] truncate max-w-[180px]">
                                  {center.description || '—'}
                                </td>
                              </tr>

                              {/* NÍVEL 3: ORDENS DE PRODUÇÃO (EXPANDIDO) */}
                              {isCenterExpanded && (
                                <>
                                  {isLoadingOps ? (
                                    <tr className="bg-slate-50/40">
                                      <td
                                        colSpan={12}
                                        className="py-4 pl-14 pr-4 text-slate-500 font-sans"
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
                                        colSpan={12}
                                        className="py-3 pl-14 pr-4 text-rose-600 font-sans"
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
                                        colSpan={12}
                                        className="py-3 pl-14 pr-4 text-slate-400 font-sans text-[11px]"
                                      >
                                        Nenhuma Ordem de Produção encontrada para este centro no
                                        período.
                                      </td>
                                    </tr>
                                  ) : (
                                    ops.map((op) => {
                                      const perdaOp =
                                        op.realizedQuantityTons !== null
                                          ? Math.max(
                                              0,
                                              op.plannedQuantityTons -
                                                (op.realizedQuantityTons || 0),
                                            )
                                          : null
                                      const perdaOpPct =
                                        perdaOp !== null && op.plannedQuantityTons > 0
                                          ? Number(
                                              ((perdaOp / op.plannedQuantityTons) * 100).toFixed(1),
                                            )
                                          : null

                                      return (
                                        <tr
                                          key={op.id}
                                          className="bg-white/90 hover:bg-sky-50/40 border-b border-slate-100 transition-colors"
                                        >
                                          {/* 1. Estrutura/Item */}
                                          <td className="py-2 px-3 pl-14 font-sans text-slate-700 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                              <span
                                                className="text-slate-800 text-[11px] font-medium truncate max-w-[220px]"
                                                title={
                                                  op.materialDescription ||
                                                  op.productName ||
                                                  'Material'
                                                }
                                              >
                                                {op.materialDescription ||
                                                  op.productName ||
                                                  'Material Sem Descrição'}
                                              </span>
                                            </div>
                                          </td>
                                          {/* 2. Código */}
                                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                                            {op.materialCode || '—'}
                                          </td>
                                          {/* 3. Ordem */}
                                          <td className="py-2 px-3 font-mono font-bold text-[#004C97] text-[11px]">
                                            {op.opNumber}
                                          </td>
                                          {/* 4. Carteira (t) */}
                                          <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-700">
                                            {formatTonsCell(op.carteiraT)}
                                          </td>
                                          {/* 5. Programado (t) */}
                                          <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-600">
                                            {formatTonsCell(op.plannedQuantityTons)}
                                          </td>
                                          {/* 6. Realizado (t) */}
                                          <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-600">
                                            {formatTonsCell(op.realizedQuantityTons)}
                                          </td>
                                          {/* 7. % Realizado */}
                                          <td className="py-2 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                                            {formatPercentCell(op.percentualRealizado)}
                                          </td>
                                          {/* 8. Perda (t) */}
                                          <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-500">
                                            {formatTonsCell(perdaOp)}
                                          </td>
                                          {/* 9. % Perda */}
                                          <td className="py-2 px-3 text-right font-medium whitespace-nowrap text-slate-500">
                                            {formatPercentCell(perdaOpPct)}
                                          </td>
                                          {/* 10. Sequência Cumprida */}
                                          <td className="py-2 px-3 text-right font-medium text-slate-400">
                                            —
                                          </td>
                                          {/* 11. Status */}
                                          <td className="py-2 px-3 text-center font-sans">
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] font-mono py-0 px-1 border-slate-200 text-slate-600 bg-slate-50"
                                            >
                                              {op.statusOp}
                                            </Badge>
                                          </td>
                                          {/* 12. Observação */}
                                          <td
                                            className="py-2 px-3 font-sans text-[11px] text-slate-500 truncate max-w-[200px]"
                                            title={op.observacao || ''}
                                          >
                                            {op.observacao || '—'}
                                          </td>
                                        </tr>
                                      )
                                    })
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

      {/* Modais das Melhorias */}
      <PxrAiAnalysisModal
        open={isAiModalOpen}
        onOpenChange={setIsAiModalOpen}
        hierarchy={aggregatedLines}
        filters={appliedFilters}
        summary={executionSummary}
        currentAnalysis={currentAiAnalysis}
        savedRecord={savedAnalysisRecord}
        onAnalysisUpdated={(analysis, record) => {
          setCurrentAiAnalysis(analysis)
          if (record) setSavedAnalysisRecord(record)
        }}
      />

      <PxrSendHubModal
        open={isHubModalOpen}
        onOpenChange={setIsHubModalOpen}
        hierarchy={aggregatedLines}
        filters={appliedFilters}
        aiAnalysis={currentAiAnalysis}
        savedRecord={savedAnalysisRecord}
      />

      <PxrSendEmailModal
        open={isEmailModalOpen}
        onOpenChange={setIsEmailModalOpen}
        hierarchy={aggregatedLines}
        filters={appliedFilters}
        aiAnalysis={currentAiAnalysis}
        savedRecord={savedAnalysisRecord}
      />
    </div>
  )
}

export default EfficiencyAssertivenessSubpage
