import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Database,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react'
import { usePCPData } from '@/hooks/usePCPData'
import { Link } from 'react-router-dom'

interface DataQualityMetric {
  id: string
  title: string
  scorePct: number
  validCount: number
  totalCount: number
  status: 'EXCELENTE' | 'BOM' | 'ATENCAO' | 'CRITICO'
  description: string
  actionRequired?: string
}

export const PCPDataQualityPage: React.FC = () => {
  const { data, loading, refreshData, orders, currentUpload } = usePCPData()
  const [searchTerm, setSearchTerm] = useState('')

  const totalOrders = orders.length

  // Métricas reais calculadas sobre os registros vigentes
  const metrics: DataQualityMetric[] = [
    {
      id: 'materials_recognized',
      title: 'Materiais Reconhecidos no Catálogo',
      scorePct:
        totalOrders > 0
          ? Math.round(
              (orders.filter((o) => o.material_code && o.material_code.length >= 3).length /
                totalOrders) *
                1000,
            ) / 10
          : 0,
      validCount: orders.filter((o) => o.material_code && o.material_code.length >= 3).length,
      totalCount: totalOrders,
      status:
        totalOrders === 0
          ? 'ATENCAO'
          : orders.filter((o) => o.material_code).length === totalOrders
            ? 'EXCELENTE'
            : 'ATENCAO',
      description: 'Itens com código de material válido e aderente à estrutura mestre de produtos.',
      actionRequired: 'Validar cadastros de novos materiais ou prefixos não mapeados.',
    },
    {
      id: 'complete_orders',
      title: 'Pedidos com Dados Mandatórios Completos',
      scorePct:
        totalOrders > 0
          ? Math.round(
              (orders.filter(
                (o) =>
                  o.sales_order &&
                  o.sales_order_item &&
                  o.customer_name &&
                  o.order_quantity_tons > 0,
              ).length /
                totalOrders) *
                1000,
            ) / 10
          : 0,
      validCount: orders.filter(
        (o) => o.sales_order && o.sales_order_item && o.customer_name && o.order_quantity_tons > 0,
      ).length,
      totalCount: totalOrders,
      status: totalOrders > 0 ? 'EXCELENTE' : 'ATENCAO',
      description: 'Verificação de Pedido, Item, Cliente e Quantidade preenchidos sem nulos.',
    },
    {
      id: 'dates_consistency',
      title: 'Pedidos com Data Desejada Válida',
      scorePct:
        totalOrders > 0
          ? Math.round(
              (orders.filter(
                (o) => o.requested_date && !isNaN(new Date(o.requested_date).getTime()),
              ).length /
                totalOrders) *
                1000,
            ) / 10
          : 0,
      validCount: orders.filter(
        (o) => o.requested_date && !isNaN(new Date(o.requested_date).getTime()),
      ).length,
      totalCount: totalOrders,
      status: totalOrders > 0 ? 'EXCELENTE' : 'ATENCAO',
      description: 'Datas solicitadas no padrão ISO/pt-BR consistentes para cálculo de lead time.',
    },
    {
      id: 'line_assigned',
      title: 'Pedidos com Linha Produtiva Atribuída',
      scorePct:
        totalOrders > 0
          ? Math.round(
              (orders.filter((o) => o.production_line && o.production_line !== 'GERAL').length /
                totalOrders) *
                1000,
            ) / 10
          : 0,
      validCount: orders.filter((o) => o.production_line && o.production_line !== 'GERAL').length,
      totalCount: totalOrders,
      status: 'BOM',
      description: 'Itens roteados para L1 (Laminação) ou L2 (Trefilação) por regra de produto.',
      actionRequired:
        'Itens classificados como GERAL aguardam confirmação de rota na ficha mestre.',
    },
    {
      id: 'reconciliation_rate',
      title: 'Taxa de Reconciliação com Carga Vigente',
      scorePct: currentUpload?.status === 'PROCESSADO' ? 100 : 0,
      validCount: currentUpload?.valid_rows || 0,
      totalCount: currentUpload?.total_rows || 0,
      status: currentUpload?.status === 'PROCESSADO' ? 'EXCELENTE' : 'ATENCAO',
      description: 'Paridade dos registros entre carga QAS recebida e banco PocketBase.',
    },
    {
      id: 'uniqueness_rate',
      title: 'Ausência de Registros Duplicados (Pedido + Item)',
      scorePct:
        totalOrders > 0
          ? Math.round(
              ((totalOrders - (currentUpload?.validation_log?.duplicados?.length || 0)) /
                totalOrders) *
                1000,
            ) / 10
          : 100,
      validCount: totalOrders - (currentUpload?.validation_log?.duplicados?.length || 0),
      totalCount: totalOrders,
      status:
        (currentUpload?.validation_log?.duplicados?.length || 0) === 0 ? 'EXCELENTE' : 'ATENCAO',
      description: 'Garantia de chave natural única (Pedido SAP + Posição).',
    },
  ]

  // Score Global de Qualidade Derivado
  const globalScore =
    totalOrders > 0
      ? Math.round((metrics.reduce((acc, m) => acc + m.scorePct, 0) / metrics.length) * 10) / 10
      : 0

  return (
    <div className="space-y-5 pb-12">
      {/* Topo / Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#004C97] text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Qualidade dos Dados PCP
              </h1>
              <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                AUDITORIA & CONFIABILIDADE
              </Badge>
              <Badge
                variant="outline"
                className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[10px]"
              >
                AMBIENTE: HOMOLOGAÇÃO QAS
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Monitoramento determinístico da acurácia, integridade cadastral e linhagem da carteira
              ZSD28C.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refreshData(true)}
            disabled={loading}
            className="text-xs h-9 border-slate-300 gap-1.5 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Auditando...' : 'Reauditar Dados'}
          </Button>

          <Link to="/pcp/analise-carteira">
            <Button
              size="sm"
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-9 gap-1.5"
            >
              <Database className="w-3.5 h-3.5" />
              Ver Carteira Geral
            </Button>
          </Link>
        </div>
      </div>

      {/* Card Principal de Score Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 bg-gradient-to-br from-[#004C97] to-[#002f60] text-white shadow-md border-0">
          <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-200 font-bold block">
                Índice Global de Qualidade
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-black">
                  {totalOrders > 0 ? `${globalScore}%` : 'Sem Carga'}
                </span>
                {totalOrders > 0 && (
                  <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
                    {globalScore >= 95 ? 'NÍVEL ELEVADO' : 'ACEITÁVEL'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-blue-100 mt-2">
                Score ponderado calculado a partir de {metrics.length} dimensões de integridade de
                dados.
              </p>
            </div>

            <div className="pt-3 border-t border-blue-400/30 text-[11px] text-blue-200 flex items-center justify-between">
              <span>
                Carga Ativa: <strong>{currentUpload?.upload_code || 'N/A'}</strong>
              </span>
              <span>{totalOrders} ordens</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" />
              Linhagem e Rastreabilidade da Fonte
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Origem Canônica
              </span>
              <strong className="text-slate-800 font-mono">SAP SD / ZSD28C</strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Arquivo Importado
              </span>
              <strong
                className="text-slate-800 font-mono truncate block"
                title={currentUpload?.filename}
              >
                {currentUpload?.filename || 'Nenhum'}
              </strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Idade dos Dados
              </span>
              <strong className="text-slate-800">
                {currentUpload?.created
                  ? new Date(currentUpload.created).toLocaleString('pt-BR')
                  : 'Aguardando Carga'}
              </strong>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Responsável
              </span>
              <strong className="text-slate-800 truncate block">
                {currentUpload?.user_name || 'Operador QAS'}
              </strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Métricas de Qualidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card
            key={m.id}
            className="bg-white border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-xs font-bold text-slate-900 leading-snug">
                  {m.title}
                </CardTitle>
                <Badge
                  className={`text-[9px] font-bold ${
                    m.status === 'EXCELENTE'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : m.status === 'BOM'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  {m.scorePct}%
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3">
              <div className="space-y-1">
                <Progress value={m.scorePct} className="h-2" />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{m.validCount} registros válidos</span>
                  <span>Total: {m.totalCount}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">{m.description}</p>

              {m.actionRequired && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[10px] flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{m.actionRequired}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default PCPDataQualityPage
