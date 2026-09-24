import React, { useState, useEffect, useMemo } from 'react'
import {
  Boxes,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  History,
  ShieldCheck,
  ChevronRight,
  Clock,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { useToast } from '@/hooks/use-toast'
import type {
  SapCogiPendency,
  SapPendenciesFilters,
  ExecutiveCardsStats,
  AiAnalysisSummary,
  SimilarOccurrencesResult,
} from '@/types/sap-pendencies'
import { sapPendenciesService } from '@/services/sap-pendencies-service'
import { SapPendenciesExecutiveCards } from '@/components/production-control/SapPendenciesExecutiveCards'
import { SapPendenciesAiPanel } from '@/components/production-control/SapPendenciesAiPanel'
import { SapPendenciesFilterBar } from '@/components/production-control/SapPendenciesFilterBar'
import { SapPendencyDetailModal } from '@/components/production-control/SapPendencyDetailModal'
import { SapPendenciesAiSummaryModal } from '@/components/production-control/SapPendenciesAiSummaryModal'
import { SapPendenciesSgqModal } from '@/components/production-control/SapPendenciesSgqModal'
import { SimilarOccurrencesModal } from '@/components/production-control/SimilarOccurrencesModal'

export const CogiPendenciesPage: React.FC = () => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>(() =>
    new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
  )
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null)
  const [list, setList] = useState<SapCogiPendency[]>([])
  const [filters, setFilters] = useState<SapPendenciesFilters>({})
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null)

  // Modais
  const [selectedRecord, setSelectedRecord] = useState<SapCogiPendency | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailInitialTab, setDetailInitialTab] = useState('dados-sap')
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [aiSummary, setAiSummary] = useState<AiAnalysisSummary | null>(null)
  const [sgqModalOpen, setSgqModalOpen] = useState(false)
  const [similarModalOpen, setSimilarModalOpen] = useState(false)
  const [similarResult, setSimilarResult] = useState<SimilarOccurrencesResult | null>(null)

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await sapPendenciesService.listCogiPendencies(filters)
      setList(res.data)
      setIsDemo(res.isFallback)
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshSap = async () => {
    setIsRefreshing(true)
    setTimeoutNotice(null)
    try {
      const res = await sapPendenciesService.refreshFromSap('COGI')
      if (res.success) {
        setLastUpdate(
          new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        )
        toast({
          title: 'Sincronização SAP',
          description: res.message || 'Dados atualizados com sucesso.',
        })
      } else {
        setTimeoutNotice(
          'Não foi possível atualizar os dados SAP neste momento. Os últimos dados disponíveis continuam sendo exibidos.',
        )
        toast({
          title: 'Aviso de Conexão SAP',
          description:
            res.error ||
            'Não foi possível atualizar os dados SAP neste momento. Os últimos dados disponíveis continuam sendo exibidos.',
          variant: 'destructive',
        })
      }
      await loadData()
    } catch {
      setTimeoutNotice(
        'Não foi possível atualizar os dados SAP neste momento. Os últimos dados disponíveis continuam sendo exibidos.',
      )
    } finally {
      setIsRefreshing(false)
    }
  }

  const stats: ExecutiveCardsStats = useMemo(() => {
    return sapPendenciesService.calculateExecutiveCards(list)
  }, [list])

  const handleCardClick = (cardKey: string) => {
    if (activeCardKey === cardKey) {
      setActiveCardKey(null)
      setFilters({})
      return
    }

    setActiveCardKey(cardKey)
    switch (cardKey) {
      case 'CRITICAS':
        setFilters((prev) => ({ ...prev, criticality: 'CRITICA' }))
        break
      case 'URGENTES':
        setFilters((prev) => ({ ...prev, criticality: 'URGENTE' }))
        break
      case 'MAIOR_24H':
        setFilters((prev) => ({ ...prev, idade_min_horas: 24 }))
        break
      case 'MAIOR_48H':
        setFilters((prev) => ({ ...prev, idade_min_horas: 48 }))
        break
      case 'REINCIDENTES':
        setFilters((prev) => ({ ...prev, somente_reincidentes: true }))
        break
      default:
        setFilters({})
        break
    }
  }

  const handleOpenDetail = (record: SapCogiPendency, tab: string = 'dados-sap') => {
    setSelectedRecord(record)
    setDetailInitialTab(tab)
    setDetailModalOpen(true)
  }

  const handleGenerateAiSummary = () => {
    const summary = sapPendenciesService.generateExecutiveAiSummary(list, 'COGI')
    setAiSummary(summary)
    setSummaryModalOpen(true)
  }

  const handleOpenSimilar = async (record: SapCogiPendency) => {
    setSelectedRecord(record)
    const result = await sapPendenciesService.findSimilarOccurrences(record, list)
    setSimilarResult(result)
    setSimilarModalOpen(true)
  }

  const getCriticalityBadge = (crit: string) => {
    switch (crit) {
      case 'CRITICA':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">🔴 Crítica</Badge>
      case 'URGENTE':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">🟠 Urgente</Badge>
      case 'ATENCAO':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">🟡 Atenção</Badge>
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">🟢 Baixa</Badge>
        )
    }
  }

  return (
    <div>
      <div className="space-y-3.5">
        {/* Cabeçalho Oficial CIAFAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-2xs">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Pendências - COGI
                </h1>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-600 font-mono">
                  Última atualização: {lastUpdate}
                </span>
                {isDemo && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Dados demonstrativos
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Processamento posterior de movimentos de mercadorias SAP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAiSummary}
              className="h-8 text-xs gap-1.5 border-blue-200 text-[#004C97] hover:bg-blue-50 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
              Gerar Resumo IA
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={isRefreshing}
              onClick={handleRefreshSap}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar SAP
            </Button>
          </div>
        </div>

        {/* Aviso de timeout/indisponibilidade RFC */}
        {timeoutNotice && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
            <span>{timeoutNotice}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTimeoutNotice(null)}
              className="h-6 text-xs text-amber-900 hover:bg-amber-100 px-2"
            >
              Fechar
            </Button>
          </div>
        )}

        {/* 1. Cards Executivos (Top da Tela) - 6 cards responsivos */}
        <ErrorBoundary moduleName="Cards Executivos COGI">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <SapPendenciesExecutiveCards
              stats={stats}
              activeFilterKey={activeCardKey}
              onCardClick={handleCardClick}
            />
          )}
        </ErrorBoundary>

        {/* 2. Painel IA - Análise das Pendências */}
        <ErrorBoundary moduleName="Painel IA COGI">
          {loading ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : (
            <SapPendenciesAiPanel
              selectedRecord={selectedRecord}
              totalCount={stats.total}
              criticalCount={stats.criticas}
              topCategory={stats.categoria_top.categoria}
              topCentro={stats.centro_top.centro}
              recurrentCount={stats.reincidentes}
              onOpenSgqModal={() => setSgqModalOpen(true)}
            />
          )}
        </ErrorBoundary>

        {/* 3. Barra de Filtros Compacta */}
        <ErrorBoundary moduleName="Filtros COGI">
          <SapPendenciesFilterBar
            filters={filters}
            onChange={setFilters}
            onClear={() => {
              setFilters({})
              setActiveCardKey(null)
            }}
            onRefreshSap={handleRefreshSap}
            isRefreshing={isRefreshing}
            isDemo={isDemo}
            pendencyType="COGI"
          />
        </ErrorBoundary>

        {/* 4. Tabela Responsiva de Pendências COGI */}
        <ErrorBoundary moduleName="Tabela COGI">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs bg-slate-50">
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <span>Listagem de Ocorrências ({list.length})</span>
                {activeCardKey && (
                  <Badge variant="outline" className="text-[10px] text-[#004C97] border-blue-300">
                    Filtro: {activeCardKey}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Processamento posterior de movimentos de mercadorias
              </span>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Criticidade</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3">Centro</th>
                    <th className="py-2.5 px-3">Depósito</th>
                    <th className="py-2.5 px-3">Lote</th>
                    <th className="py-2.5 px-3">TMv</th>
                    <th className="py-2.5 px-3">Quantidade</th>
                    <th className="py-2.5 px-3">UM</th>
                    <th className="py-2.5 px-3">Ordem</th>
                    <th className="py-2.5 px-3">Data do erro</th>
                    <th className="py-2.5 px-3">Categoria IA</th>
                    <th className="py-2.5 px-3">Mensagem SAP</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={16} className="py-3 px-3">
                          <Skeleton className="h-6 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : list.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-8 text-center text-slate-500">
                        Nenhuma pendência encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    list.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                        onClick={() => handleOpenDetail(item)}
                      >
                        {/* Status */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-medium bg-slate-50 text-slate-700"
                          >
                            {item.treatment_status}
                          </Badge>
                        </td>

                        {/* Criticidade */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          {getCriticalityBadge(item.criticality)}
                        </td>

                        {/* Material */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-slate-800">
                          {item.material_code}
                        </td>

                        {/* Descrição */}
                        <td className="py-2 px-3 max-w-[180px]">
                          <div
                            className="text-[11px] text-slate-700 truncate"
                            title={item.material_description}
                          >
                            {item.material_description}
                          </div>
                        </td>

                        {/* Centro */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-700">
                          {item.centro_code}
                        </td>

                        {/* Depósito */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                          {item.deposito || '-'}
                        </td>

                        {/* Lote */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                          {item.lote || '-'}
                        </td>

                        {/* TMv */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono font-semibold text-[#004C97]">
                          {item.tipo_movimento}
                        </td>

                        {/* Quantidade */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-800 text-right">
                          {item.quantidade}
                        </td>

                        {/* UM */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-600">
                          {item.unidade_medida}
                        </td>

                        {/* Ordem */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono font-bold text-[#004C97]">
                          {item.op_number || '-'}
                        </td>

                        {/* Data do erro */}
                        <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {item.data_erro}
                        </td>

                        {/* Categoria IA */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px]">
                            {item.categoria_ia}
                          </Badge>
                          {item.reincidente && (
                            <span className="block text-[9px] text-purple-700 font-bold mt-0.5">
                              ↺ Reincidente
                            </span>
                          )}
                        </td>

                        {/* Mensagem SAP com Tooltip */}
                        <td className="py-2 px-3 max-w-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="font-mono text-[11px] text-slate-800 truncate select-all">
                                {item.sap_message}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md font-mono text-xs p-2 bg-slate-900 text-slate-100">
                              <p className="font-bold text-amber-300 mb-1">
                                Cód: {item.sap_msg_code}
                              </p>
                              <p>{item.sap_message}</p>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Cód: {item.sap_msg_code}
                          </div>
                        </td>

                        {/* Responsável */}
                        <td className="py-2 px-3 whitespace-nowrap text-slate-700 font-medium">
                          {item.responsavel_tratamento_nome || item.area_responsavel_sugerida}
                        </td>

                        {/* Ações */}
                        <td className="py-2 px-3 whitespace-nowrap text-right">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Ação IA */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(item, 'acao-recomendada')}
                                  className="h-7 text-[10px] text-blue-700 bg-blue-50/70 hover:bg-blue-100 hover:text-blue-900 px-2 font-semibold flex items-center gap-1 border border-blue-200"
                                >
                                  <Sparkles className="w-3 h-3 text-blue-600" />
                                  Ação IA
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Ver ação recomendada pela IA baseada nos procedimentos oficiais
                              </TooltipContent>
                            </Tooltip>

                            {/* Similares */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenSimilar(item)}
                                  className="h-7 text-[10px] text-slate-700 hover:bg-slate-100 px-2"
                                >
                                  <History className="w-3 h-3 mr-1 text-slate-500" />
                                  Similares
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Ver ocorrências semelhantes no histórico
                              </TooltipContent>
                            </Tooltip>

                            {/* Detalhar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetail(item, 'dados-sap')}
                                  className="h-7 text-[10px] text-slate-700 hover:bg-slate-100 px-2 flex items-center gap-1"
                                >
                                  Detalhar
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                Abrir ficha técnica completa
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ErrorBoundary>
      </div>

      {/* Modais Integrados */}
      <SapPendencyDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        record={selectedRecord}
        type="COGI"
        initialTab={detailInitialTab}
        onStatusUpdated={loadData}
        onFindSimilar={handleOpenSimilar}
      />

      <SapPendenciesAiSummaryModal
        open={summaryModalOpen}
        onOpenChange={setSummaryModalOpen}
        summary={aiSummary}
        pendencyType="COGI"
      />

      <SapPendenciesSgqModal open={sgqModalOpen} onOpenChange={setSgqModalOpen} />

      <SimilarOccurrencesModal
        open={similarModalOpen}
        onOpenChange={setSimilarModalOpen}
        record={selectedRecord}
        result={similarResult}
        onSelectRecord={(rec) => {
          setSelectedRecord(rec as SapCogiPendency)
          setDetailModalOpen(true)
        }}
      />
    </div>
  )
}
export default CogiPendenciesPage
