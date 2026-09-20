import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  FileText,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Download,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { pcpProductionService, type MESConnectionStatus } from '@/services/pcp-production-service'
import type { ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR } from '@/lib/formatters-ptbr'

export const ProductionAIAnalysisPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [summaryReport, setSummaryReport] = useState<string | null>(null)
  const [selectedOpComparison, setSelectedOpComparison] = useState<string>('OP-2025-0891')
  const [historicalReport, setHistoricalReport] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listOrders(),
      ])
      setMesStatus(mes)
      setOrders(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGeneratePeriodSummary = async () => {
    setAiGenerating(true)
    try {
      const totalPlanned = orders.reduce((acc, o) => acc + (o.quantity_planned_tons || 0), 0)
      const totalProduced = orders.reduce((acc, o) => acc + (o.quantity_produced_tons || 0), 0)

      const res = await pcpProductionService.requestAIAnalysis({
        mode: 'period_summary',
        period_ref: 'Semana 38 / 2026',
        context_data: {
          total_orders: orders.length,
          total_planned_tons: totalPlanned,
          total_produced_tons: totalProduced,
          adherence_pct: totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0,
          orders_summary: orders.map((o) => ({
            op: o.op_number,
            centro: o.centro_code,
            material: o.material_description,
            prog_t: o.quantity_planned_tons,
            prod_t: o.quantity_produced_tons,
            sap_t: o.quantity_sap_tons,
            saldo_t: o.balance_tons,
            rend_real: o.yield_realized_pct,
            rend_meta: o.yield_planned_pct,
            status_sap: o.status_sap,
            status_fechamento: o.status_fechamento,
          })),
        },
      })
      setSummaryReport(res.content)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleGenerateHistoricalComparison = async () => {
    if (!selectedOpComparison) return
    setAiGenerating(true)
    try {
      const op = orders.find((o) => o.op_number === selectedOpComparison)
      const res = await pcpProductionService.requestAIAnalysis({
        mode: 'historical_comparison',
        op_number: selectedOpComparison,
        context_data: {
          op_selected: op,
          historical_equivalents_count: 12,
          historical_avg_yield: 92.4,
          historical_avg_speed_th: 120.0,
        },
      })
      setHistoricalReport(res.content)
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Análises Especialistas por IA (Skip Cloud Native)
            </h1>
            <Badge className="bg-indigo-700 text-white font-mono text-xs">
              AGENTE CIAFAL-PRODUCTION-AGENT
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Pareceres técnicos estruturados obrigatoriamente em 3 blocos: [FATO] / [HIPÓTESE DA IA]
            / [AÇÃO SUGERIDA]. Sem frases genéricas nem alucinações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleGeneratePeriodSummary}
            disabled={aiGenerating}
            className="h-9 text-xs bg-indigo-700 hover:bg-indigo-800 text-white font-semibold"
          >
            <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${aiGenerating ? 'animate-spin' : ''}`} />
            Gerar Análise do Período (11 Seções)
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Módulo A: Comparação com Ordens Históricas Semelhantes */}
      <div className="bg-white border rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-700" />
              Comparativo com Ordens Históricas Semelhantes
            </h3>
            <p className="text-xs text-slate-500">
              Compara material, família, bitola, aço e rota para avaliar rendimento e ritmo contra a
              média histórica.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedOpComparison}
              onChange={(e) => setSelectedOpComparison(e.target.value)}
              className="h-8 text-xs font-mono border rounded px-2 bg-white"
            >
              {orders.map((o) => (
                <option key={o.op_number} value={o.op_number}>
                  {o.op_number} — {o.material_code} ({o.centro_code})
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateHistoricalComparison}
              disabled={aiGenerating}
              className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Comparar Histórico
            </Button>
          </div>
        </div>

        {historicalReport ? (
          <div className="bg-slate-50 border rounded-lg p-4 text-xs whitespace-pre-wrap leading-relaxed text-slate-800 font-sans">
            {historicalReport}
          </div>
        ) : (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 text-xs text-indigo-950">
            <strong>Exemplo de insight histórico gerado pelo modelo:</strong>
            <p className="mt-1 italic text-slate-700">
              "Esta OP-2025-0891 apresenta rendimento de 91,8%. Nas últimas 12 ordens equivalentes
              do mesmo material no centro L1, o rendimento médio foi de 94,5%."
            </p>
          </div>
        )}
      </div>

      {/* Módulo B: Resumo Executivo Completo do Período (11 Seções Obrigatórias) */}
      <div className="bg-white border rounded-lg p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-700" />
              Resumo Executivo do Período (11 Seções de Governança CIAFAL)
            </h3>
            <p className="text-xs text-slate-500">
              Auditoria analítica completa de panorama, aderência, rendimento, ritmo operacional,
              paradas e plano de ação.
            </p>
          </div>
          {summaryReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const blob = new Blob([summaryReport], { type: 'text/markdown;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Resumo_Executivo_Producao_${new Date().toISOString().slice(0, 10)}.md`
                a.click()
              }}
              className="h-8 text-xs text-slate-700"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Baixar Parecer
            </Button>
          )}
        </div>

        {summaryReport ? (
          <div className="bg-slate-50 border rounded-lg p-5 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
            {summaryReport}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-slate-50">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">
              Nenhum resumo executivo gerado nesta sessão
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Clique no botão abaixo para que o Agente de Produção processe os dados de programação,
              apontamentos MES e integração SAP, montando as 11 seções de governança industrial.
            </p>
            <Button
              onClick={handleGeneratePeriodSummary}
              disabled={aiGenerating}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-xs"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${aiGenerating ? 'animate-spin' : ''}`} />
              Gerar Análise do Período Agora
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductionAIAnalysisPage
