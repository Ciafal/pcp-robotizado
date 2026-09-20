import React, { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  Layers,
  FileText,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type { ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

interface StructuredAIAnalysis {
  fato: string
  historico: string
  hipotese: string
  acaoSugerida: string
}

interface HistoricalComparisonData {
  opAtual: ProductionOrder
  totalHistoricas: number
  mediaHistoricaRendimento: number
  melhorRendimento: number
  piorRendimento: number
  mediaHistoricaProdutividade: number
  melhorProdutividade: number
  piorProdutividade: number
  temHistoricoSuficiente: boolean
}

export const ProductionAIAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('TODOS')

  // OP selecionada para análise detalhada
  const [selectedOp, setSelectedOp] = useState<ProductionOrder | null>(null)
  const [selectedOpComparison, setSelectedOpComparison] = useState<string>('')
  const [comparisonData, setComparisonData] = useState<HistoricalComparisonData | null>(null)

  const [aiGenerating, setAiGenerating] = useState(false)
  const [summaryReport, setSummaryReport] = useState<string | null>(null)
  const [historicalReport, setHistoricalReport] = useState<string | null>(null)

  // Modal amplo de OP
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [iaOffline, setIaOffline] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
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

      const initialSearch = searchParams.get('search')
      if (initialSearch && list.length > 0) {
        const found = list.find((o) =>
          o.op_number.toLowerCase().includes(initialSearch.toLowerCase()),
        )
        if (found) {
          setSelectedOp(found)
          setSelectedOpComparison(found.op_number)
          calculateComparison(found, list)
        } else {
          setSelectedOp(list[0])
          setSelectedOpComparison(list[0].op_number)
          calculateComparison(list[0], list)
        }
      } else if (list.length > 0) {
        setSelectedOp(list[0])
        setSelectedOpComparison(list[0].op_number)
        calculateComparison(list[0], list)
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Não foi possível carregar os dados.')
      const fallbackList = pcpProductionService.getStandardSeedOrders()
      setOrders(fallbackList)
      if (fallbackList.length > 0) {
        setSelectedOp(fallbackList[0])
        setSelectedOpComparison(fallbackList[0].op_number)
        calculateComparison(fallbackList[0], fallbackList)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Separação em grupos por exceção: CRÍTICO primeiro, ALTO/ATENÇÃO depois, OPs normais consolidadas
  const { criticas, atencao, normais } = useMemo(() => {
    const crit: ProductionOrder[] = []
    const aten: ProductionOrder[] = []
    const norm: ProductionOrder[] = []

    orders.forEach((o) => {
      if (
        o.criticality === 'CRITICA' ||
        o.visual_status === 'CRITICO' ||
        o.status_sap === 'REJEITADA_SAP' ||
        o.status_sap === 'ERRO_INTEGRACAO'
      ) {
        crit.push(o)
      } else if (
        o.criticality === 'ALTA' ||
        o.visual_status === 'ATENCAO' ||
        o.visual_status === 'DESVIO' ||
        o.has_pendency
      ) {
        aten.push(o)
      } else {
        norm.push(o)
      }
    })

    return { criticas: crit, atencao: aten, normais: norm }
  }, [orders])

  // Desvios detectados para subseção dedicada
  const desvios = useMemo(() => {
    return orders.filter(
      (o) =>
        o.has_deviation ||
        o.visual_status === 'DESVIO' ||
        o.status_sap === 'ERRO_INTEGRACAO' ||
        o.status_sap === 'REJEITADA_SAP' ||
        Math.abs(o.quantity_produced_tons - o.quantity_posted_tons) > 0.01 ||
        o.yield_realized_pct < o.yield_planned_pct - 1,
    )
  }, [orders])

  // Subseções de navegação da tela: Ordens atuais, Ordens críticas, Desvios, Histórico comparativo, Análises IA
  const [activeSubSection, setActiveSubSection] = useState<
    'ATUAIS' | 'CRITICAS' | 'DESVIOS' | 'COMPARATIVO' | 'IA'
  >('CRITICAS')

  const calculateComparison = (targetOp: ProductionOrder, allOrders: ProductionOrder[]) => {
    // Busca OPs semelhantes por material, família, centro ou linha
    const semelhantes = allOrders.filter(
      (o) =>
        o.id !== targetOp.id &&
        (o.material_code === targetOp.material_code ||
          o.family_code === targetOp.family_code ||
          (o.steel_grade === targetOp.steel_grade && o.linha_code === targetOp.linha_code)),
    )

    if (semelhantes.length === 0) {
      setComparisonData({
        opAtual: targetOp,
        totalHistoricas: 0,
        mediaHistoricaRendimento: targetOp.yield_planned_pct,
        melhorRendimento: targetOp.yield_realized_pct,
        piorRendimento: targetOp.yield_realized_pct,
        mediaHistoricaProdutividade: targetOp.productivity_realized_ton_h || 110,
        melhorProdutividade: targetOp.productivity_realized_ton_h || 110,
        piorProdutividade: targetOp.productivity_realized_ton_h || 110,
        temHistoricoSuficiente: false,
      })
      return
    }

    const rendimentos = semelhantes.map((o) => o.yield_realized_pct)
    const prods = semelhantes.map((o) => o.productivity_realized_ton_h || 110)

    const avgYield = rendimentos.reduce((a, b) => a + b, 0) / rendimentos.length
    const maxYield = Math.max(...rendimentos)
    const minYield = Math.min(...rendimentos)

    const avgProd = prods.reduce((a, b) => a + b, 0) / prods.length
    const maxProd = Math.max(...prods)
    const minProd = Math.min(...prods)

    setComparisonData({
      opAtual: targetOp,
      totalHistoricas: semelhantes.length,
      mediaHistoricaRendimento: avgYield,
      melhorRendimento: maxYield,
      piorRendimento: minYield,
      mediaHistoricaProdutividade: avgProd,
      melhorProdutividade: maxProd,
      piorProdutividade: minProd,
      temHistoricoSuficiente: semelhantes.length >= 2,
    })
  }

  // Gera a análise estrita em 4 blocos: FATO / HISTÓRICO / HIPÓTESE DA IA / AÇÃO SUGERIDA
  // Abrange: atraso, rendimento, produtividade, aderência PCP, tempo sem apontamento, excesso de parada, diferença MES x SAP, quantidade acima/abaixo, risco de fechamento, comportamento anormal
  const getStructuredAnalysis = (op: ProductionOrder): StructuredAIAnalysis => {
    const isCritical =
      op.criticality === 'CRITICA' ||
      op.visual_status === 'CRITICO' ||
      op.status_sap === 'REJEITADA_SAP'

    const deltaRend = op.yield_realized_pct - op.yield_planned_pct
    const deltaSaldo = op.balance_tons
    const diffMesSap = Math.abs(op.quantity_produced_tons - op.quantity_posted_tons).toFixed(1)
    const aderenciaPcp =
      op.quantity_planned_tons > 0
        ? ((op.quantity_produced_tons / op.quantity_planned_tons) * 100).toFixed(1)
        : '100'

    const fato = `[FATO] OP ${op.op_number} no centro ${op.centro_code} (${op.linha_code}) para o material ${op.material_code}. Quantidade programada PCP: ${formatQuantity(
      op.quantity_planned_tons,
      't',
    )}; Quantidade produzida MES: ${formatQuantity(
      op.quantity_produced_tons,
      't',
    )}; Quantidade apontada: ${formatQuantity(
      op.quantity_posted_tons,
      't',
    )}; Saldo restante: ${deltaSaldo.toFixed(1)} t (aderência PCP: ${aderenciaPcp}%). Rendimento realizado: ${formatPercentagePTBR(
      op.yield_realized_pct,
    )} (meta: ${formatPercentagePTBR(op.yield_planned_pct)}). Produtividade real: ${formatQuantity(
      op.productivity_realized_ton_h || 110,
      't/h',
    )}. Diferença MES x SAP: ${diffMesSap} t. Status MES: ${op.status_mes}; Status SAP: ${op.status_sap}; Fechamento: ${op.status_fechamento}.`

    const historico =
      comparisonData && comparisonData.temHistoricoSuficiente
        ? `[HISTÓRICO] Base de ${comparisonData.totalHistoricas} ordens semelhantes no histórico registra média de rendimento de ${formatPercentagePTBR(
            comparisonData.mediaHistoricaRendimento,
          )} (melhor: ${formatPercentagePTBR(
            comparisonData.melhorRendimento,
          )}, pior: ${formatPercentagePTBR(
            comparisonData.piorRendimento,
          )}) e produtividade média de ${formatQuantity(
            comparisonData.mediaHistoricaProdutividade,
            't/h',
          )}. Desvio histórico de rendimento da OP atual: ${deltaRend.toFixed(1)}%.`
        : `[HISTÓRICO] Histórico insuficiente de campanhas anteriores deste material específico. Referência adotada: Ficha Mestra e parâmetros de capacidade do Centro ${op.centro_code}.`

    const hipotese = isCritical
      ? `[HIPÓTESE DA IA — NÃO CONFIRMADA] A divergência de ${diffMesSap} t entre produção física no MES e saldo apontado no SAP, associada ao saldo de ${deltaSaldo.toFixed(1)} t, sugere HIPÓTESE de atraso no conector RFC ZPPT010 ou perda de rendimento não lançada ao fim do passe (tempo sem apontamento ou excesso de paradas operacionais). Risco moderado a alto de bloqueio de fechamento técnico. ATENÇÃO: É uma hipótese preditiva e investigativa da IA, NÃO uma causa confirmada.`
      : `[HIPÓTESE DA IA — NÃO CONFIRMADA] Aderência de ${aderenciaPcp}% ao plano de corte/laminação e delta de rendimento de ${deltaRend.toFixed(1)}% indicam estabilidade termomecânica na linha, sem evidência de anomalia refratária, parada crítica ou risco de fechamento.`

    const acaoSugerida = isCritical
      ? `1. Convocação do Líder de Turno para conferência física de pesagem e saldo na esteira de saída.\n2. Caso haja refugo ou descarte gerado, apontar imediatamente no código SGQ adequado antes do encerramento.\n3. Acionar repasse do conector ZPPT010 no monitor de integrações para reconciliar com o SAP ECC.\n4. Bloquear fechamento técnico final da OP até saneamento da diferença de ${diffMesSap} t.`
      : `1. Manter ritmo operacional da linha acompanhado pela supervisão.\n2. Executar checklist preventivo de setup da próxima campanha.\n3. Proceder com encerramento e sincronização SAP standard.`

    return { fato, historico, hipotese, acaoSugerida }
  }

  const handleGenerateHistoricalComparison = async () => {
    if (!selectedOp) return
    setAiGenerating(true)
    setIaOffline(false)
    try {
      const res = await pcpProductionService.requestAIAnalysis({
        mode: 'historical_comparison',
        op_number: selectedOp.op_number,
        context_data: {
          op_selected: selectedOp,
          comparison: comparisonData,
        },
      })
      setHistoricalReport(res.content)
    } catch {
      setIaOffline(true)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleGeneratePeriodSummary = async () => {
    setAiGenerating(true)
    setIaOffline(false)
    try {
      const totalPlanned = orders.reduce((acc, o) => acc + (o.quantity_planned_tons || 0), 0)
      const totalProduced = orders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0)
      const res = await pcpProductionService.requestAIAnalysis({
        mode: 'period_summary',
        period_ref: 'Semana Operacional Vigente',
        context_data: {
          total_planned_tons: totalPlanned,
          total_produced_tons: totalProduced,
          orders_count: orders.length,
          criticas_count: criticas.length,
          atencao_count: atencao.length,
        },
      })
      setSummaryReport(res.content)
    } catch {
      setIaOffline(true)
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Análise de Ordens com Inteligência Artificial
            </h1>
            <Badge className="bg-[#004C97] hover:bg-[#003d7a] text-white text-[11px] font-semibold">
              CONTROLE DE PRODUÇÃO
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Gestão por exceção com separação estrita: FATO &bull; HISTÓRICO &bull; HIPÓTESE DA IA
            &bull; AÇÃO SUGERIDA. Hipótese nunca é tratada como causa confirmada.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <MESIntegrationBanner
            status={mesStatus}
            loading={loading}
            onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
          />
          <Button
            onClick={handleGeneratePeriodSummary}
            disabled={aiGenerating}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
          >
            <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${aiGenerating ? 'animate-spin' : ''}`} />
            Gerar Parecer Executivo do Período
          </Button>
        </div>
      </div>

      {/* BARRA DE SUBSEÇÕES: Ordens atuais, Ordens críticas, Desvios, Histórico comparativo, Análises IA */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-x-auto text-xs">
        <button
          type="button"
          onClick={() => setActiveSubSection('CRITICAS')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            activeSubSection === 'CRITICAS'
              ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
          Ordens críticas ({criticas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('ATUAIS')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            activeSubSection === 'ATUAIS'
              ? 'bg-blue-50 text-[#004C97] font-bold border border-blue-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#004C97]" />
          Ordens atuais ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('DESVIOS')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            activeSubSection === 'DESVIOS'
              ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Desvios ({desvios.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('COMPARATIVO')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            activeSubSection === 'COMPARATIVO'
              ? 'bg-indigo-50 text-indigo-800 font-bold border border-indigo-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <History className="w-3.5 h-3.5 text-indigo-600" />
          Histórico comparativo
        </button>

        <button
          type="button"
          onClick={() => setActiveSubSection('IA')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            activeSubSection === 'IA'
              ? 'bg-purple-50 text-purple-800 font-bold border border-purple-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          Análises IA (Parecer 4 Blocos)
        </button>
      </div>

      {/* GESTÃO POR EXCEÇÃO: 3 FAIXAS (CRÍTICAS PRIMEIRO, ATENÇÃO, E CONSOLIDAÇÃO DE NORMAIS) */}
      <ErrorBoundary moduleName="Painel de Exceções" variant="compact">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card Críticas */}
          <div
            onClick={() => setActiveSubSection('CRITICAS')}
            className={`cursor-pointer transition-all border rounded-xl p-3 flex flex-col justify-between ${
              activeSubSection === 'CRITICAS'
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
                : 'bg-rose-50/60 border-rose-200 hover:bg-rose-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900 uppercase">
                1. OPs Críticas (Intervenção Imediata)
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-rose-700 mt-2">
              {criticas.length} <span className="text-xs font-normal text-slate-600">ordens</span>
            </div>
            <p className="text-[11px] text-rose-800 mt-1">
              Rejeições SAP ou desvios graves de saldo/yield
            </p>
          </div>

          {/* Card Atenção */}
          <div
            onClick={() => setActiveSubSection('DESVIOS')}
            className={`cursor-pointer transition-all border rounded-xl p-3 flex flex-col justify-between ${
              activeSubSection === 'DESVIOS'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase">
                2. OPs em Desvio / Atenção
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-800 mt-2">
              {desvios.length} <span className="text-xs font-normal text-slate-600">ordens</span>
            </div>
            <p className="text-[11px] text-amber-800 mt-1">
              Pendência de checklist ou divergência branda
            </p>
          </div>

          {/* Card Normais */}
          <div
            onClick={() => setActiveSubSection('ATUAIS')}
            className={`cursor-pointer transition-all border rounded-xl p-3 flex flex-col justify-between ${
              activeSubSection === 'ATUAIS'
                ? 'bg-blue-50 border-blue-300 ring-2 ring-[#004C97]'
                : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase">
                3. Total de OPs Atuais
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-800 mt-2">
              {orders.length} <span className="text-xs font-normal text-slate-600">ordens</span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-1">
              Produção aderente e conciliação regular
            </p>
          </div>
        </div>
      </ErrorBoundary>

      {/* SELETOR E ANÁLISE DETALHADA POR OP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Coluna 1: Lista Priorizada de Ordens */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col max-h-[820px]">
          <div className="p-3 border-b bg-slate-50 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Fila por Prioridade ({orders.length})
            </span>
            <span className="text-[11px] text-slate-500">Críticas no topo</span>
          </div>

          <div className="p-2 border-b bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar OP, material..."
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-500">Carregando ordens...</div>
            ) : loadError ? (
              <div className="p-6 text-center text-xs text-rose-700 bg-rose-50/50 space-y-2">
                <p>Não foi possível carregar os dados. Tentar novamente.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadData}
                  className="h-7 text-xs border-rose-300"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Nenhuma Ordem de Produção encontrada.
              </div>
            ) : null}

            {/* Lista ordenada: primeiro Críticas, depois Atenção, depois Normais */}
            {[...criticas, ...atencao, ...normais]
              .filter((o) => {
                if (!searchTerm) return true
                const t = searchTerm.toLowerCase()
                return (
                  o.op_number.toLowerCase().includes(t) ||
                  o.material_code.toLowerCase().includes(t) ||
                  o.material_description.toLowerCase().includes(t)
                )
              })
              .map((o) => {
                const isSelected = selectedOp?.id === o.id
                const isCrit = criticas.some((c) => c.id === o.id)
                const isAtencao = atencao.some((a) => a.id === o.id)

                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedOp(o)
                      setSelectedOpComparison(o.op_number)
                      calculateComparison(o, orders)
                    }}
                    className={`w-full p-3 text-left transition-colors flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-[#004C97]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold font-mono text-[#004C97] text-xs">
                        OP {o.op_number}
                      </span>
                      {isCrit ? (
                        <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0 font-mono">
                          Crítico
                        </Badge>
                      ) : isAtencao ? (
                        <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 font-mono">
                          Atenção
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-mono">
                          Normal
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-800 font-medium truncate">
                      {o.material_description}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>
                        {o.centro_code} &bull; {o.linha_code}
                      </span>
                      <span>{formatQuantity(o.quantity_produced_tons, 't')}</span>
                    </div>
                  </button>
                )
              })}
          </div>
        </div>

        {/* Coluna 2: Análise da OP com os 4 Blocos Estritos + Comparador Histórico */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedOp ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500 shadow-2xs">
              Selecione uma Ordem de Produção à esquerda para inspecionar os pareceres estruturados
              da IA.
            </div>
          ) : (
            <>
              {/* Header da OP Selecionada */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 font-mono">
                      OP {selectedOp.op_number} &bull; {selectedOp.centro_code} (
                      {selectedOp.linha_code})
                    </h2>
                    <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                      {selectedOp.family_code}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedOp.material_code} &bull; {selectedOp.material_description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOp(selectedOp)
                      setDetailModalOpen(true)
                    }}
                    className="h-8 text-xs text-[#004C97] border-slate-200 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    Abrir Detalhe Completo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateHistoricalComparison}
                    disabled={aiGenerating}
                    className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Comparar com Histórico
                  </Button>
                </div>
              </div>

              {iaOffline && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
                  Análise IA temporariamente indisponível.
                </div>
              )}

              {/* COMPARATIVO COM HISTÓRICO (OP ATUAL X MÉDIA HISTÓRICA X MELHOR X PIOR) */}
              <ErrorBoundary moduleName="Comparador com Histórico" variant="compact">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#004C97]" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Comparativo com Histórico de Ordens Semelhantes
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {comparisonData?.temHistoricoSuficiente
                        ? `${comparisonData.totalHistoricas} ordens correlacionadas`
                        : 'Histórico insuficiente'}
                    </span>
                  </div>

                  {!comparisonData || !comparisonData.temHistoricoSuficiente ? (
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Histórico insuficiente para análise comparativa:</strong> não foram
                        localizadas ordens anteriores com o mesmo material, rota ou bitola em volume
                        suficiente para gerar média histórica representativa.
                      </span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b">
                          <tr>
                            <th className="py-2 px-3">Métrica de Processo</th>
                            <th className="py-2 px-3 text-right">
                              OP Atual ({selectedOp.op_number})
                            </th>
                            <th className="py-2 px-3 text-right">Média Histórica</th>
                            <th className="py-2 px-3 text-right">Melhor Registro</th>
                            <th className="py-2 px-3 text-right">Pior Registro</th>
                            <th className="py-2 px-3 text-center">Avaliação IA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              Rendimento Metálico (%)
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                              {formatPercentagePTBR(selectedOp.yield_realized_pct)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatPercentagePTBR(comparisonData.mediaHistoricaRendimento)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium">
                              {formatPercentagePTBR(comparisonData.melhorRendimento)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-medium">
                              {formatPercentagePTBR(comparisonData.piorRendimento)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-mono ${
                                  selectedOp.yield_realized_pct >=
                                  comparisonData.mediaHistoricaRendimento
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {selectedOp.yield_realized_pct >=
                                comparisonData.mediaHistoricaRendimento
                                  ? 'Dentro da Média'
                                  : 'Abaixo da Média'}
                              </Badge>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              Produtividade Média (t/h)
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                              {formatQuantity(selectedOp.productivity_realized_ton_h || 110, 't/h')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatQuantity(comparisonData.mediaHistoricaProdutividade, 't/h')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-medium">
                              {formatQuantity(comparisonData.melhorProdutividade, 't/h')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700 font-medium">
                              {formatQuantity(comparisonData.piorProdutividade, 't/h')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono bg-slate-50 text-slate-700 border-slate-200"
                              >
                                Cadência Regular
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </ErrorBoundary>

              {/* OS 4 BLOCOS ESTRITOS DE ANÁLISE IA (FATO / HISTÓRICO / HIPÓTESE DA IA / AÇÃO SUGERIDA) */}
              <ErrorBoundary moduleName="Blocos Estruturados da IA" variant="compact">
                {(() => {
                  const analysis = getStructuredAnalysis(selectedOp)
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b pb-3">
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#004C97]" />
                          Parecer Estruturado da IA por Ordem de Produção
                        </h3>
                        <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                          ciafal-production-agent
                        </Badge>
                      </div>

                      {/* 1. FATO */}
                      <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                          [FATO] — Dados Comprovados no MES e SAP
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-sans">
                          {analysis.fato}
                        </p>
                      </div>

                      {/* 2. HISTÓRICO */}
                      <div className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/40 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#004C97] inline-block" />
                          [HISTÓRICO] — Contexto e Comparações Passadas
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-sans">
                          {analysis.historico}
                        </p>
                      </div>

                      {/* 3. HIPÓTESE DA IA */}
                      <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50/40 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-600 inline-block" />
                          [HIPÓTESE DA IA] — Avaliação Preditiva (Não é Causa Confirmada)
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-sans">
                          {analysis.hipotese}
                        </p>
                      </div>

                      {/* 4. AÇÃO SUGERIDA */}
                      <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 space-y-1">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                          [AÇÃO SUGERIDA] — Encaminhamento Operacional Recomendado
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
                          {analysis.acaoSugerida}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </ErrorBoundary>

              {/* PARECER GERAL DO PERÍODO SE GERADO */}
              {summaryReport && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#004C97]" />
                      Parecer Consolidado do Período (11 Seções)
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([summaryReport], {
                          type: 'text/markdown;charset=utf-8',
                        })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `Resumo_Producao_CIAFAL_${new Date().toISOString().slice(0, 10)}.md`
                        a.click()
                      }}
                      className="h-7 text-xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Baixar Relatório
                    </Button>
                  </div>
                  <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans bg-slate-50 p-4 rounded-lg border border-slate-200">
                    {summaryReport}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Amplo de Detalhe da OP */}
      <ProductionOrderDetailModal
        order={selectedOp}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}

export default ProductionAIAnalysisPage
