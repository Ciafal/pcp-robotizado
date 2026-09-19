import React, { useState, useEffect } from 'react'
import {
  BarChart3,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
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
import { pcpProductionService, type MESConnectionStatus } from '@/services/pcp-production-service'
import type { ProductionOrder, ProductionDeviation } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatNumberPTBR } from '@/lib/formatters-ptbr'

export const ProductionDeviationsPage: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [deviations, setDeviations] = useState<ProductionDeviation[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [typeFilter, setTypeFilter] = useState('TODOS')
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [mes, list] = await Promise.all([
        pcpProductionService.checkMESConnection(),
        pcpProductionService.listOrders(),
      ])
      setMesStatus(mes)
      setOrders(list)

      // Extrai todos os desvios calculados
      const allDevs: ProductionDeviation[] = []
      list.forEach((ord) => {
        const orderDevs = pcpProductionService.getDeviationsForOrder(ord)
        allDevs.push(...orderDevs)
      })
      setDeviations(allDevs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredDeviations = deviations.filter((d) => {
    if (typeFilter !== 'TODOS' && d.deviation_type !== typeFilter) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      return (
        d.op_number.toLowerCase().includes(term) ||
        d.material_code.toLowerCase().includes(term) ||
        d.material_description.toLowerCase().includes(term) ||
        d.probable_cause.toLowerCase().includes(term) ||
        d.centro_code.toLowerCase().includes(term)
      )
    }
    return true
  })

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-5">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Desvios de Produção (Programado PCP x Realizado MES)
            </h1>
            <Badge className="bg-amber-600 text-white font-mono text-xs">
              ANÁLISE DE VARIAÇÕES
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Análise detalhada de desvios em quantidade, rendimento, produtividade, paradas e
            tolerâncias com recomendação de IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Desvios
          </Button>
        </div>
      </div>

      {/* Banner MES 4.0 */}
      <MESIntegrationBanner
        status={mesStatus}
        loading={loading}
        onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
      />

      {/* Barra de Filtros */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative min-w-[280px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por OP, material, provável causa, centro..."
              className="pl-9 h-8 text-xs"
            />
          </div>

          <div className="w-[200px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Tipo de Desvio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Tipos</SelectItem>
                <SelectItem value="QUANTIDADE">Quantidade</SelectItem>
                <SelectItem value="RENDIMENTO">Rendimento</SelectItem>
                <SelectItem value="PRODUTIVIDADE">Produtividade</SelectItem>
                <SelectItem value="TEMPO">Tempo Operacional</SelectItem>
                <SelectItem value="PARADAS">Paradas de Linha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Desvios Identificados: <strong>{filteredDeviations.length}</strong>
        </div>
      </div>

      {/* Lista de Desvios com os 3 Blocos de Governança de IA */}
      <div className="space-y-4">
        {filteredDeviations.length === 0 ? (
          <div className="bg-white border rounded-lg p-8 text-center text-slate-500 text-xs">
            Nenhum desvio fora de tolerância identificado nas ordens analisadas.
          </div>
        ) : (
          filteredDeviations.map((dev) => (
            <div key={dev.id} className="bg-white border rounded-lg shadow-2xs p-4 space-y-3">
              {/* Topo do Card de Desvio */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-base font-mono text-blue-900">
                    {dev.op_number}
                  </span>
                  <Badge variant="outline" className="text-xs font-semibold bg-slate-50">
                    Centro: {dev.centro_code} ({dev.linha_code})
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs font-mono ${
                      dev.status === 'CRITICO'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    Tipo: {dev.deviation_type} ({dev.status})
                  </Badge>
                </div>
                <div className="text-xs text-slate-500">
                  Tolerância do Processo:{' '}
                  <strong>± {formatNumberPTBR(dev.tolerance_pct, 1)} %</strong>
                </div>
              </div>

              {/* Comparativo Numérico */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-md text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Programado PCP
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-900">
                    {dev.unit === 't'
                      ? formatQuantity(dev.planned_value, 't')
                      : formatPercentagePTBR(dev.planned_value)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Realizado MES
                  </span>
                  <span className="text-sm font-bold font-mono text-blue-900">
                    {dev.unit === 't'
                      ? formatQuantity(dev.realized_value, 't')
                      : formatPercentagePTBR(dev.realized_value)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Diferença Absoluta
                  </span>
                  <span
                    className={`text-sm font-bold font-mono ${dev.diff_absolute < 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                  >
                    {dev.unit === 't'
                      ? formatQuantity(dev.diff_absolute, 't')
                      : formatPercentagePTBR(dev.diff_absolute)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Diferença %
                  </span>
                  <span
                    className={`text-sm font-bold font-mono ${dev.diff_pct < 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                  >
                    {formatPercentagePTBR(dev.diff_pct)}
                  </span>
                </div>
              </div>

              {/* Causas e Impactos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-white border rounded-md p-2.5">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Provável Causa Operacional:
                  </span>
                  <p className="text-slate-600">{dev.probable_cause}</p>
                </div>
                <div className="bg-white border rounded-md p-2.5">
                  <span className="font-bold text-slate-700 block mb-0.5">
                    Impacto no Negócio / Atendimento:
                  </span>
                  <p className="text-slate-600">{dev.business_impact}</p>
                </div>
              </div>

              {/* SEPARAÇÃO OBRIGATÓRIA EM 3 BLOCOS DA RECOMENDAÇÃO DE IA */}
              <div className="border rounded-md p-3 bg-indigo-50/50 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Parecer do Agente Especialista Skip Cloud (Tripla Separação de Governança)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* Bloco 1: FATO */}
                  <div className="bg-white border border-indigo-100 rounded-md p-2.5">
                    <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block mb-1">
                      [FATO OBJETIVO]
                    </span>
                    <p className="text-slate-700 leading-relaxed">{dev.ai_recommendation.fact}</p>
                  </div>

                  {/* Bloco 2: HIPÓTESE DA IA */}
                  <div className="bg-white border border-indigo-100 rounded-md p-2.5">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                      [HIPÓTESE DA IA]
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {dev.ai_recommendation.hypothesis}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1 italic">
                      *Não apresentar como causa confirmada sem perícia física.
                    </span>
                  </div>

                  {/* Bloco 3: AÇÃO SUGERIDA */}
                  <div className="bg-white border border-indigo-100 rounded-md p-2.5">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">
                      [AÇÃO SUGERIDA]
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {dev.ai_recommendation.suggested_action}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
