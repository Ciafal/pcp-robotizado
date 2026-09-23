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
  const [list, setList] = useState<SapCogiPendency[]>([])
  const [filters, setFilters] = useState<SapPendenciesFilters>({})
  const [activeCardKey, setActiveCardKey] = useState<string | null>(null)

  // Modais
  const [selectedRecord, setSelectedRecord] = useState<SapCogiPendency | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
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
    try {
      const res = await sapPendenciesService.refreshFromSap('COGI')
      if (res.success) {
        toast({
          title: 'Sincronização SAP',
          description: res.message || 'Dados atualizados com sucesso.',
        })
      } else {
        toast({
          title: 'Aviso de Conexão SAP',
          description:
            res.error ||
            'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
          variant: 'destructive',
        })
      }
      await loadData()
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

  const handleOpenDetail = (record: SapCogiPendency) => {
    setSelectedRecord(record)
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
    <div className="space-y-4">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-700 text-white rounded-lg shadow-xs">
            <Boxes className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pendências - COGI</h1>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                Movimentação & Estoque
              </Badge>
              {isDemo && (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                  Dados de demonstração / Integração SAP pendente
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Central Inteligente de Falhas de Movimentação de Mercadorias (SAP ECC) — Diagnóstico
              IA, Resoluções SGQ e Impacto na Produção.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateAiSummary}
            className="h-8 text-xs gap-1.5 border-blue-300 text-blue-800 hover:bg-blue-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Gerar Resumo IA
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isRefreshing}
            onClick={handleRefreshSap}
            className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar SAP
          </Button>
        </div>
      </div>

      {/* 1. Cards Executivos (Top da Tela) */}
      <SapPendenciesExecutiveCards
        stats={stats}
        activeFilterKey={activeCardKey}
        onCardClick={handleCardClick}
      />

      {/* 2. Painel IA - Análise Inteligente das Pendências */}
      <SapPendenciesAiPanel
        selectedRecord={selectedRecord}
        totalCount={stats.total}
        criticalCount={stats.criticas}
        topCategory={stats.categoria_top.categoria}
        topCentro={stats.centro_top.centro}
        recurrentCount={stats.reincidentes}
        onOpenSgqModal={() => setSgqModalOpen(true)}
      />

      {/* 3. Barra de Filtros Compacta */}
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

      {/* 4. Tabela Responsiva de Pendências COGI */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs bg-slate-50">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span>Listagem de Ocorrências ({list.length})</span>
            {activeCardKey && (
              <Badge variant="outline" className="text-[10px] text-blue-700 border-blue-300">
                Filtro: {activeCardKey}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Ordem decrescente de criticidade e idade
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Criticidade</th>
                <th className="py-2.5 px-3">Ordem / Linha</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Centro / Depósito</th>
                <th className="py-2.5 px-3">Mov. / Qtd</th>
                <th className="py-2.5 px-3">Mensagem Original SAP</th>
                <th className="py-2.5 px-3">Categoria IA</th>
                <th className="py-2.5 px-3">Área Resp.</th>
                <th className="py-2.5 px-3">Idade</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Nenhuma pendência COGI encontrada para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDetail(item)}
                  >
                    {/* Status de Tratamento */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] font-medium bg-slate-50">
                        {item.treatment_status}
                      </Badge>
                    </td>

                    {/* Criticidade */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getCriticalityBadge(item.criticality)}
                    </td>

                    {/* Ordem / Linha */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                      <div className="font-bold text-blue-700">{item.op_number || '-'}</div>
                      <div className="text-[10px] text-slate-400">
                        Linha: {item.linha_code || '-'}
                      </div>
                    </td>

                    {/* Material */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-slate-800">{item.material_code}</div>
                      <div
                        className="text-[11px] text-slate-600 truncate max-w-[180px]"
                        title={item.material_description}
                      >
                        {item.material_description}
                      </div>
                    </td>

                    {/* Centro / Depósito */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-mono">
                      <div>C{item.centro_code}</div>
                      <div className="text-[10px] text-slate-400">Dep: {item.deposito || '-'}</div>
                    </td>

                    {/* Movimento / Qtd */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                      <div className="font-bold text-slate-800">
                        {item.quantidade} {item.unidade_medida}
                      </div>
                      <div className="text-[10px] text-blue-600">Mov: {item.tipo_movimento}</div>
                    </td>

                    {/* Mensagem SAP com Tooltip */}
                    <td className="py-2.5 px-3 max-w-xs">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="font-mono text-[11px] text-slate-800 truncate select-all">
                            {item.sap_message}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md font-mono text-xs p-2 bg-slate-900 text-slate-100">
                          <p className="font-bold text-amber-300 mb-1">Cód: {item.sap_msg_code}</p>
                          <p>{item.sap_message}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cód: {item.sap_msg_code}
                      </div>
                    </td>

                    {/* Categoria IA */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px]">
                        {item.categoria_ia}
                      </Badge>
                      {item.reincidente && (
                        <span className="block text-[9px] text-purple-700 font-bold mt-0.5">
                          ↺ Reincidente
                        </span>
                      )}
                    </td>

                    {/* Área Responsável */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                      {item.area_responsavel_sugerida}
                    </td>

                    {/* Idade */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.idade_horas}h</span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSimilar(item)}
                          className="h-7 text-[10px] text-blue-700 hover:text-blue-900 px-2"
                          title="Ver ocorrências semelhantes"
                        >
                          <History className="w-3 h-3 mr-1" />
                          Similares
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(item)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais Integrados */}
      <SapPendencyDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        record={selectedRecord}
        type="COGI"
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
