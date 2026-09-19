import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Activity,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  History,
} from 'lucide-react'
import type {
  ProductionOrder,
  ProductionOrderFlowStep,
  ProductionTimelineEvent,
} from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { pcpProductionService } from '@/services/pcp-production-service'

interface ProductionOrderDetailModalProps {
  order: ProductionOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrderUpdated?: () => void
}

export const ProductionOrderDetailModal: React.FC<ProductionOrderDetailModalProps> = ({
  order,
  open,
  onOpenChange,
  onOrderUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'fluxo' | 'timeline' | 'checklist' | 'ia'>(
    'geral',
  )
  const [aiLoading, setAiLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)

  if (!order) return null

  // Etapas de fluxo padrão
  const flowSteps: ProductionOrderFlowStep[] = order.flow_status_json?.length
    ? order.flow_status_json
    : [
        {
          step: 'PCP',
          label: 'Programação PCP',
          status: 'CONCLUIDO',
          timestamp: order.planned_start_date,
        },
        {
          step: 'MES',
          label: 'Chão de Fábrica (MES)',
          status: order.quantity_produced_tons > 0 ? 'CONCLUIDO' : 'EM_ANDAMENTO',
          timestamp: order.real_start_date,
        },
        {
          step: 'APONTAMENTO',
          label: 'Apontamento ZPPT010',
          status: order.quantity_posted_tons > 0 ? 'CONCLUIDO' : 'EM_ANDAMENTO',
          timestamp: order.last_posting_at,
        },
        {
          step: 'SAP',
          label: 'Integração SAP ECC',
          status:
            order.status_sap === 'ERRO_INTEGRACAO' || order.status_sap === 'REJEITADA_SAP'
              ? 'ERRO'
              : order.status_sap === 'FECHADA_TECNICAMENTE' ||
                  order.status_sap === 'CONFIRMADA_TOTAL'
                ? 'CONCLUIDO'
                : 'EM_ANDAMENTO',
        },
        {
          step: 'FECHAMENTO',
          label: 'Fechamento Técnico',
          status:
            order.status_fechamento === 'FECHADA'
              ? 'CONCLUIDO'
              : order.status_fechamento === 'APTA'
                ? 'EM_ANDAMENTO'
                : 'BLOQUEADO',
        },
      ]

  // Timeline cronológica que nunca sobrescreve eventos
  const timelineEvents: ProductionTimelineEvent[] = order.timeline_json?.length
    ? order.timeline_json
    : [
        {
          id: 'ev-1',
          timestamp: order.planned_start_date || '2026-09-18 07:00',
          title: 'Criação da Programação Semanal no PCP',
          category: 'PROGRAMACAO',
          description: `Ordem programada para lote de ${formatQuantity(order.quantity_planned_tons, 't')}.`,
          origin: 'PCP',
          userOrSystem: order.mrp_planner,
        },
        {
          id: 'ev-2',
          timestamp: order.real_start_date || '2026-09-18 07:30',
          title: 'Início da Operação Física (MES 4.0)',
          category: 'INICIO_PRODUCAO',
          description: `Produção iniciada no centro ${order.centro_code} sob liderança de ${order.operator_leader}.`,
          origin: 'MES',
          userOrSystem: 'Terminal MES',
        },
        {
          id: 'ev-3',
          timestamp: order.last_posting_at || '2026-09-18 16:30',
          title: 'Último Apontamento Realizado',
          category: 'APONTAMENTO',
          description: `Registrado no formato ZPPT010 com volume acumulado de ${formatQuantity(order.quantity_posted_tons, 't')}.`,
          origin: 'MES',
          userOrSystem: order.operator_leader,
        },
      ]

  const handleAskAIRisk = async () => {
    setAiLoading(true)
    try {
      const res = await pcpProductionService.requestAIAnalysis({
        mode: 'op_risk',
        op_number: order.op_number,
        context_data: {
          op_number: order.op_number,
          material: order.material_description,
          programado_tons: order.quantity_planned_tons,
          produzido_tons: order.quantity_produced_tons,
          apontado_tons: order.quantity_posted_tons,
          sap_tons: order.quantity_sap_tons,
          saldo_tons: order.balance_tons,
          rendimento_real: order.yield_realized_pct,
          rendimento_meta: order.yield_planned_pct,
          status_sap: order.status_sap,
          status_fechamento: order.status_fechamento,
        },
      })
      setAiExplanation(res.content)
      setActiveTab('ia')
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1380px] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* Cabeçalho da Ordem */}
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight font-mono">
                  {order.op_number}
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-xs font-semibold bg-slate-50">
                  Centro: {order.centro_code} ({order.linha_code})
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    order.visual_status === 'NORMAL'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : order.visual_status === 'ATENCAO'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : order.visual_status === 'CRITICO'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-blue-50 text-blue-800 border-blue-300'
                  }`}
                >
                  🟢 {order.visual_status}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono ${
                    order.ai_risk_score === 'CRITICO' || order.ai_risk_score === 'ALTO_RISCO'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  Score de Risco IA: {order.ai_risk_score}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-600 mt-1">
                <strong>{order.material_code}</strong> — {order.material_description} (
                {order.steel_grade} | {order.gauge_dimension})
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAskAIRisk}
                disabled={aiLoading}
                className="h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 mr-1 text-indigo-600 ${aiLoading ? 'animate-spin' : ''}`}
                />
                Por que esta OP está sinalizada?
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* 9 Perguntas de Conciliação em Faixa Rápida de Resposta */}
        <div className="bg-slate-50 border rounded-lg p-3 my-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 text-center text-xs">
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              1. Prog. PCP
            </span>
            <span className="font-bold font-mono text-slate-900">
              {formatQuantity(order.quantity_planned_tons, 't')}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              2. Prod. MES
            </span>
            <span className="font-bold font-mono text-blue-900">
              {formatQuantity(order.quantity_produced_tons, 't')}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              3. Apontado
            </span>
            <span className="font-bold font-mono text-slate-800">
              {formatQuantity(order.quantity_posted_tons, 't')}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              4. Chegou SAP
            </span>
            <span className="font-bold font-mono text-indigo-900">
              {formatQuantity(order.quantity_sap_tons, 't')}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              5. Saldo Dif.
            </span>
            <span
              className={`font-bold font-mono ${order.balance_tons > 0 ? 'text-amber-700' : 'text-slate-700'}`}
            >
              {formatQuantity(order.balance_tons, 't')}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              6. Por quê?
            </span>
            <span
              className="text-[11px] font-medium text-slate-700 truncate block"
              title={order.deviation_reason || 'Normal'}
            >
              {order.deviation_reason || 'Normal'}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              7. O que falta?
            </span>
            <span className="text-[11px] font-medium text-slate-700 truncate block">
              {order.status_fechamento === 'FECHADA' ? 'Encerrada' : 'Validar ZPPT010'}
            </span>
          </div>
          <div className="border-r pr-2 last:border-0">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              8. Quem age?
            </span>
            <span className="text-[11px] font-medium text-slate-700 truncate block">
              {order.operator_leader}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">
              9. Risco Prog?
            </span>
            <span
              className={`font-bold text-[11px] ${order.has_pendency ? 'text-rose-700' : 'text-emerald-700'}`}
            >
              {order.has_pendency ? 'Risco Ativo' : 'Controlado'}
            </span>
          </div>
        </div>

        {/* Abas de Navegação */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="bg-slate-100 p-1 w-full justify-start rounded-md border text-xs">
            <TabsTrigger value="geral" className="text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Dados Gerais & Conciliação
            </TabsTrigger>
            <TabsTrigger value="fluxo" className="text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" />
              Fluxo PCP → MES → Apontamento → SAP → Fechamento
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs">
              <History className="w-3.5 h-3.5 mr-1.5" />
              Timeline Cronológica Completa
            </TabsTrigger>
            <TabsTrigger value="checklist" className="text-xs">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              Checklist de Fechamento (10 Itens)
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Parecer Técnico IA (Fato / Hipótese / Ação)
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Dados Gerais */}
          <TabsContent value="geral" className="flex-1 overflow-auto p-3 mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
                  Identificação & Planejamento
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Empresa:</span>
                    <span className="font-semibold text-slate-800">{order.empresa_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Centro / Linha:</span>
                    <span className="font-semibold text-slate-800">
                      {order.centro_code} / {order.linha_code}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Centro de Trabalho:</span>
                    <span className="font-semibold text-slate-800">{order.work_center}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Planejador MRP:</span>
                    <span className="font-semibold text-slate-800">{order.mrp_planner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo Programação:</span>
                    <span className="font-semibold text-slate-800">{order.programming_type}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
                  Rendimento & Produtividade
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rendimento Previsto:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatPercentagePTBR(order.yield_planned_pct)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Rendimento Realizado:</span>
                    <span className="font-mono font-bold text-blue-900">
                      {formatPercentagePTBR(order.yield_realized_pct)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Desvio de Rendimento:</span>
                    <span
                      className={`font-mono font-bold ${order.yield_realized_pct - order.yield_planned_pct < 0 ? 'text-rose-700' : 'text-emerald-700'}`}
                    >
                      {formatPercentagePTBR(order.yield_realized_pct - order.yield_planned_pct)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operador Líder:</span>
                    <span className="font-semibold text-slate-800">{order.operator_leader}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">
                  Status Operacionais Separados
                </h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status OP:</span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {order.status_op}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status MES (Físico):</span>
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-50">
                      {order.status_mes}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status SAP (ERP Oficial):</span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${order.status_sap.includes('ERRO') ? 'border-rose-400 text-rose-800' : ''}`}
                    >
                      {order.status_sap}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status Fechamento:</span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] bg-amber-50 text-amber-900"
                    >
                      {order.status_fechamento}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {order.ai_risk_reason && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Sinalização de Risco Operacional
                </div>
                <p>{order.ai_risk_reason}</p>
              </div>
            )}
          </TabsContent>

          {/* Aba 2: Fluxo Visual com status próprio por etapa */}
          <TabsContent value="fluxo" className="flex-1 overflow-auto p-4 mt-0">
            <h4 className="text-xs font-bold text-slate-800 uppercase mb-4">
              Fluxo Integrado de Produção (Status Próprio por Etapa)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {flowSteps.map((step, idx) => (
                <div
                  key={step.step}
                  className={`border rounded-lg p-3 relative flex flex-col justify-between ${
                    step.status === 'CONCLUIDO'
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : step.status === 'ERRO'
                        ? 'bg-rose-50/80 border-rose-300'
                        : step.status === 'EM_ANDAMENTO'
                          ? 'bg-blue-50/70 border-blue-300'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-500 font-mono">
                        ETAPA 0{idx + 1}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono ${
                          step.status === 'CONCLUIDO'
                            ? 'text-emerald-800 border-emerald-400'
                            : step.status === 'ERRO'
                              ? 'text-rose-800 border-rose-400'
                              : 'text-blue-800 border-blue-400'
                        }`}
                      >
                        {step.status}
                      </Badge>
                    </div>
                    <div className="font-bold text-xs text-slate-900 mb-1">{step.label}</div>
                    {step.timestamp && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {step.timestamp}
                      </div>
                    )}
                    {step.notes && <p className="text-[11px] text-rose-700 mt-1">{step.notes}</p>}
                  </div>
                  {idx < 4 && (
                    <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-0.5 border shadow-xs">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Aba 3: Timeline Cronológica Completa */}
          <TabsContent value="timeline" className="flex-1 overflow-auto p-4 mt-0">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase">
                Trilha Cronológica Auditável (Registros Não Sobrescritos)
              </h4>
              <span className="text-xs text-slate-500">Origens: PCP, MES, SAP, IA, USUÁRIO</span>
            </div>
            <div className="relative border-l-2 border-slate-200 ml-4 pl-4 space-y-4">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative">
                  <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-600 shadow-xs" />
                  <div className="bg-white border rounded-md p-3 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-1 mb-1">
                      <span className="font-bold text-slate-900">{evt.title}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                          Origem: {evt.origin}
                        </Badge>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {evt.timestamp}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-700 text-xs mb-1">{evt.description}</p>
                    <span className="text-[10px] text-slate-400">
                      Responsável / Sistema: {evt.userOrSystem}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Aba 4: Checklist de Fechamento (10 Itens Obrigatórios) */}
          <TabsContent value="checklist" className="flex-1 overflow-auto p-4 mt-0 space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
              <strong>Regra de Fechamento CIAFAL:</strong> É terminantemente proibido considerar a
              OP encerrada apenas por atingir 100% da quantidade produzida. Qualquer item não
              atendido resulta em status <span className="font-bold">PENDENTE DE FECHAMENTO</span>{' '}
              com a causa exata identificada.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(order.checklist_fechamento_json || []).map((chk, i) => (
                <div
                  key={chk.id || i}
                  className={`border rounded-md p-3 flex items-start gap-3 ${
                    chk.status === 'OK'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <div
                    className={`mt-0.5 ${chk.status === 'OK' ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {chk.status === 'OK' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-slate-900">
                      Item {i + 1}: {chk.title}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{chk.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Aba 5: Análise por IA Nativa (3 Blocos Estritos) */}
          <TabsContent value="ia" className="flex-1 overflow-auto p-4 mt-0 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Parecer Especialista do Agente de Produção (Skip Cloud Native)
                </h4>
                <p className="text-xs text-slate-500">
                  Estrutura de governança estrita: separação obrigatória entre FATO, HIPÓTESE DA IA
                  e AÇÃO SUGERIDA.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAskAIRisk}
                disabled={aiLoading}
                className="text-xs text-indigo-700 border-indigo-200"
              >
                <Sparkles className={`w-3.5 h-3.5 mr-1 ${aiLoading ? 'animate-spin' : ''}`} />
                Atualizar Parecer IA
              </Button>
            </div>

            {aiExplanation ? (
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                    {aiExplanation}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border rounded-lg bg-slate-50">
                <p className="text-xs text-slate-600 mb-3">
                  Clique no botão abaixo para que o Agente Skip Cloud analise a conciliação da OP{' '}
                  <span className="font-mono font-bold">{order.op_number}</span> contra o histórico
                  do HUB CIAFAL.
                </p>
                <Button
                  size="sm"
                  onClick={handleAskAIRisk}
                  disabled={aiLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${aiLoading ? 'animate-spin' : ''}`} />
                  Gerar Análise Analítica da OP
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Rodapé com Fechamento e Encerramento */}
        <div className="flex items-center justify-between border-t pt-3 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Origem da Ordem: <strong>PCP</strong> | Execução: <strong>MES 4.0</strong> | Oficial:{' '}
              <strong>SAP</strong>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
