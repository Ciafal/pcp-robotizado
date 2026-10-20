import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileText,
  Clock,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Factory,
  Database,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { ProductionOrder, ProductionOrderCooisDetail } from '@/types/pcp-production'
import { pcpProductionService } from '@/services/pcp-production-service'
import { formatNumberPtBr } from '@/lib/number-format'

interface ProductionOrderCooisDetailModalProps {
  order: ProductionOrder | null
  isOpen: boolean
  onClose: () => void
  onActionSuccess?: () => void
}

export const ProductionOrderCooisDetailModal: React.FC<ProductionOrderCooisDetailModalProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'resumo' | 'confirmacoes' | 'pendencias' | 'historico'
  >('resumo')
  const [loading, setLoading] = useState<boolean>(false)
  const [detailData, setDetailData] = useState<ProductionOrderCooisDetail | null>(null)

  useEffect(() => {
    if (isOpen && order) {
      setLoading(true)
      pcpProductionService
        .getCooisOrderDetail(order.op_number)
        .then((res) => {
          setDetailData(res)
        })
        .catch((err) => {
          console.error('Erro ao carregar detalhes COOIS:', err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [isOpen, order])

  if (!order) return null

  const pctRealized =
    order.quantity_planned_tons > 0
      ? (order.quantity_produced_tons / order.quantity_planned_tons) * 100
      : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENCERRADA':
      case 'FECHADA_TECNICAMENTE':
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
            🟢 Encerrada (TECO)
          </Badge>
        )
      case 'EM_PRODUCAO':
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">🔵 Em Produção</Badge>
      case 'LIBERADA':
        return <Badge className="bg-sky-500 text-white">🟢 Liberada (REL)</Badge>
      case 'AGUARDANDO_FECHAMENTO':
        return <Badge className="bg-amber-500 text-white">🟡 Aguardando Fechamento</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50 border-slate-200">
        <DialogHeader className="border-b border-slate-200 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-[#004C97]/10 text-[#004C97]">
                  VISÃO COOIS — SAP ECC
                </span>
                <span className="text-sm font-mono text-slate-500">
                  Centro: {order.centro_code}
                </span>
                <span className="text-sm font-mono text-slate-500">Linha: {order.linha_code}</span>
              </div>
              <DialogTitle className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-3">
                OP {order.op_number}
                {getStatusBadge(order.status_op)}
              </DialogTitle>
              <DialogDescription className="text-slate-600 font-medium">
                {order.material_code} — {order.material_description}
              </DialogDescription>
            </div>

            {/* Balanço em destaque no cabeçalho */}
            <div className="grid grid-cols-3 gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-right">
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Programado</p>
                <p className="text-sm font-bold text-slate-800">
                  {formatNumberPtBr(order.quantity_planned_tons, 2)} t
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Apontado</p>
                <p className="text-sm font-bold text-blue-700">
                  {formatNumberPtBr(order.quantity_produced_tons, 2)} t
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Saldo (% Real)</p>
                <p className="text-sm font-bold text-slate-900">
                  {formatNumberPtBr(order.balance_tons, 2)} t ({pctRealized.toFixed(1)}%)
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-[#004C97] animate-spin" />
            <p className="text-sm text-slate-500">
              Conectando e conciliando registros COOIS no backend...
            </p>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="w-full mt-2"
          >
            <TabsList className="grid grid-cols-4 bg-slate-200/80 p-1">
              <TabsTrigger
                value="resumo"
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <FileText className="w-4 h-4" />
                Resumo da Ordem
              </TabsTrigger>
              <TabsTrigger
                value="confirmacoes"
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <Clock className="w-4 h-4" />
                Confirmações ({detailData?.confirmations.length || 0})
              </TabsTrigger>
              <TabsTrigger
                value="pendencias"
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <AlertTriangle className="w-4 h-4" />
                Pendências & Travas
                {detailData?.pendencies &&
                  (detailData.pendencies.has_cogi || detailData.pendencies.has_co1p) && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-1" />
                  )}
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="flex items-center gap-1.5 text-xs font-semibold"
              >
                <History className="w-4 h-4" />
                Histórico Cronológico
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: RESUMO */}
            <TabsContent value="resumo" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                      <Factory className="w-4 h-4 text-[#004C97]" />
                      Dados de Engenharia & Linha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Centro Fabril:</span>
                      <span className="font-semibold text-slate-800">{order.centro_code}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Linha de Produção:</span>
                      <span className="font-semibold text-slate-800">{order.linha_code}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Posto de Trabalho (Arbpl):</span>
                      <span className="font-semibold text-slate-800">
                        {order.work_center || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Família / Aço:</span>
                      <span className="font-semibold text-slate-800">
                        {order.steel_grade || order.family_code || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bitola / Dimensão:</span>
                      <span className="font-semibold text-slate-800">
                        {order.gauge_dimension || '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-[#004C97]" />
                      Volumes & Balanço Físico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Qtd. Programada:</span>
                      <span className="font-semibold text-slate-800">
                        {formatNumberPtBr(order.quantity_planned_tons, 2)} t
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Qtd. Produzida (MES):</span>
                      <span className="font-semibold text-blue-700">
                        {formatNumberPtBr(order.quantity_produced_tons, 2)} t
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Qtd. Integrada (SAP):</span>
                      <span className="font-semibold text-slate-800">
                        {formatNumberPtBr(order.quantity_sap_tons, 2)} t
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Saldo a Produzir:</span>
                      <span className="font-semibold text-amber-700">
                        {formatNumberPtBr(order.balance_tons, 2)} t
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rendimento Metálico:</span>
                      <span className="font-semibold text-slate-800">
                        {order.yield_realized_pct.toFixed(1)}% (Meta:{' '}
                        {order.yield_planned_pct.toFixed(1)}%)
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#004C97]" />
                      Status & Rastreamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Status no SAP ECC:</span>
                      <span className="font-mono text-xs font-semibold">
                        {order.status_sap || 'CRIADA_LIBERADA'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Status Operacional:</span>
                      <span className="font-semibold text-slate-800">{order.status_op}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Fechamento:</span>
                      <span className="font-semibold text-slate-800">
                        {order.status_fechamento}
                      </span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500">Operador Líder:</span>
                      <span className="font-semibold text-slate-800">
                        {order.operator_leader || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Início Real:</span>
                      <span className="font-semibold text-slate-800">
                        {order.real_start_date || order.planned_start_date || '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Banner de causa de desvio se houver */}
              <div
                className={`p-4 rounded-lg border ${order.has_deviation ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}
              >
                <div className="flex items-start gap-3">
                  {order.has_deviation ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {order.has_deviation
                        ? 'Causa de Desvio Declarada'
                        : 'Sem Causa de Desvio Declarada'}
                    </h4>
                    <p className="text-xs text-slate-700 mt-1">
                      {order.has_deviation
                        ? order.deviation_reason
                        : 'OP operando dentro dos parâmetros nominais de tolerância sem registro de anomalia.'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: CONFIRMAÇÕES (APONTAMENTOS) */}
            <TabsContent value="confirmacoes" className="mt-4">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase">
                    Relação OP → Confirmação → Contador (COOIS)
                  </span>
                  <span className="text-xs text-slate-500">Ordenação: Data DESC + Hora DESC</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Confirmação</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Contador</th>
                        <th className="py-2.5 px-3 font-semibold">Data</th>
                        <th className="py-2.5 px-3 font-semibold">Hora</th>
                        <th className="py-2.5 px-3 font-semibold">Turma</th>
                        <th className="py-2.5 px-3 font-semibold">Turno</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Qtd. Apontada</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Confirmação Final</th>
                        <th className="py-2.5 px-3 font-semibold">Causa de Desvio</th>
                        <th className="py-2.5 px-3 font-semibold">Origem</th>
                        <th className="py-2.5 px-3 font-semibold">Status SAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailData?.confirmations && detailData.confirmations.length > 0 ? (
                        detailData.confirmations.map((conf, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-medium text-[#004C97]">
                              {conf.confirmation_number}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                              {conf.counter}
                            </td>
                            <td className="py-2 px-3 font-mono">{conf.posting_date}</td>
                            <td className="py-2 px-3 font-mono">{conf.posting_time}</td>
                            <td className="py-2 px-3">{conf.turma}</td>
                            <td className="py-2 px-3">{conf.turno}</td>
                            <td className="py-2 px-3 text-right font-bold font-mono text-slate-800">
                              {formatNumberPtBr(conf.quantity_tons, 2)} {conf.unit}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {conf.is_final ? (
                                <Badge className="bg-emerald-600 text-white font-medium text-[10px] px-2 py-0.5">
                                  🟢 Final
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-white font-medium text-[10px] px-2 py-0.5">
                                  🟡 Parcial
                                </Badge>
                              )}
                            </td>
                            <td
                              className="py-2 px-3 text-slate-700 max-w-[180px] truncate"
                              title={conf.deviation_reason}
                            >
                              {conf.deviation_reason || 'Sem causa de desvio'}
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {conf.data_origin}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`text-[11px] font-semibold ${
                                  conf.status_sap === 'REJEITADO_SAP'
                                    ? 'text-rose-600'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {conf.status_sap}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400">
                            Nenhum apontamento ou confirmação registrado para esta OP.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: PENDÊNCIAS & TRAVAS */}
            <TabsContent value="pendencias" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cartão COGI */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2 text-rose-700">
                        <ShieldAlert className="w-4 h-4" />
                        Pendências COGI (Déficit / Falha de Baixa)
                      </span>
                      <Badge
                        variant={detailData?.pendencies.cogi.length ? 'destructive' : 'outline'}
                      >
                        {detailData?.pendencies.cogi.length || 0} pendência(s)
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData?.pendencies.cogi && detailData.pendencies.cogi.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.pendencies.cogi.map((cg, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs"
                          >
                            <div className="flex justify-between font-mono font-semibold text-rose-800">
                              <span>Erro: {cg.error_code}</span>
                              <span>{cg.detected_at}</span>
                            </div>
                            <p className="text-slate-800 mt-1">{cg.error_message}</p>
                            <div className="flex justify-between mt-1 text-[11px] text-slate-500">
                              <span>Material: {cg.material_code}</span>
                              <span>Qtd: {cg.quantity} t</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 py-4 text-center font-medium">
                        ✓ Nenhuma pendência COGI ativa para esta Ordem de Produção.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Cartão CO1P */}
                <Card className="border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="w-4 h-4" />
                        Pendências CO1P (Desacoplamento de Baixa)
                      </span>
                      <Badge variant={detailData?.pendencies.co1p.length ? 'secondary' : 'outline'}>
                        {detailData?.pendencies.co1p.length || 0} pendência(s)
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detailData?.pendencies.co1p && detailData.pendencies.co1p.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.pendencies.co1p.map((cp, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs"
                          >
                            <div className="flex justify-between font-mono font-semibold text-amber-800">
                              <span>Confirmação: {cp.confirmation_number}</span>
                              <span>{cp.detected_at}</span>
                            </div>
                            <p className="text-slate-800 mt-1">
                              Movimento Tipo: {cp.movement_type}
                            </p>
                            <span className="text-[11px] text-slate-600">Status: {cp.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 py-4 text-center font-medium">
                        ✓ Nenhuma pendência CO1P ativa para esta Ordem de Produção.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Divergências MES x SAP e Fechamento */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-800">
                    Trava de Integridade & Divergências de Fechamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      {detailData?.pendencies.has_mes_sap_divergence ? (
                        <XCircle className="w-4 h-4 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-800">
                          Divergência Volume MES x SAP:
                        </span>
                        <p className="text-[11px] text-slate-500">
                          MES: {formatNumberPtBr(order.quantity_produced_tons, 2)} t vs SAP:{' '}
                          {formatNumberPtBr(order.quantity_sap_tons, 2)} t
                        </p>
                      </div>
                    </div>
                    <span className="font-mono font-bold">
                      Delta:{' '}
                      {formatNumberPtBr(detailData?.pendencies.mes_sap_divergence_tons || 0, 2)} t
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      {detailData?.pendencies.missing_final_confirmation ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-800">
                          Status da Confirmação Final:
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {detailData?.pendencies.missing_final_confirmation
                            ? 'Ordem não possui apontamento marcado como Confirmação Final.'
                            : 'Confirmação Final registrada.'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        detailData?.pendencies.missing_final_confirmation ? 'outline' : 'secondary'
                      }
                    >
                      {detailData?.pendencies.missing_final_confirmation ? 'Pendente' : 'Atendido'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 4: HISTÓRICO CRONOLÓGICO */}
            <TabsContent value="historico" className="mt-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm max-h-[450px] overflow-y-auto">
                <div className="relative pl-6 border-l-2 border-[#004C97]/30 space-y-6">
                  {detailData?.history && detailData.history.length > 0 ? (
                    detailData.history.map((evt, idx) => (
                      <div key={evt.id || idx} className="relative">
                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#004C97] border-2 border-white ring-2 ring-[#004C97]/20" />
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{evt.title}</span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {evt.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">{evt.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {evt.origin}
                            </Badge>
                            <span className="text-[10px] text-slate-500">
                              Por: {evt.userOrSystem}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-slate-400" />
                      <p className="text-xs text-slate-500">
                        Criação da OP no repositório de produção PCP.
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {order.created_at || order.planned_start_date}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="border-t border-slate-200 pt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} size="sm">
            Fechar Detalhes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
