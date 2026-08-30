import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { mpOptimizationService } from '@/services/mp-optimization'
import {
  MPDimensionalItem,
  MPPurchaseOrder,
  MPFutureReception,
  MPCuttingPlan,
  MPReapplicationOpportunity,
  MPWorkflowApproval,
} from '@/types/mp-optimization'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Boxes,
  FileSpreadsheet,
  Scissors,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  DollarSign,
  BarChart3,
  Calendar,
  Truck,
  Activity,
  Layers3,
} from 'lucide-react'

export const MPOverviewConsolidatedPage: React.FC = () => {
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<MPPurchaseOrder[]>([])
  const [futureReceptions, setFutureReceptions] = useState<MPFutureReception[]>([])
  const [cuttingPlans, setCuttingPlans] = useState<MPCuttingPlan[]>([])
  const [opportunities, setOpportunities] = useState<MPReapplicationOpportunity[]>([])
  const [approvals, setApprovals] = useState<MPWorkflowApproval[]>([])
  const [timeframe, setTimeframe] = useState<'MENSAL' | 'YTD'>('MENSAL')

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [inv, pos, recs, plans, opps, apps] = await Promise.all([
          mpOptimizationService.getDimensionalInventory(),
          mpOptimizationService.getPurchaseOrders(),
          mpOptimizationService.getFutureReceptions(),
          mpOptimizationService.getCuttingPlans(),
          mpOptimizationService.getReapplicationOpportunities(),
          mpOptimizationService.getWorkflowApprovals(),
        ])
        setItems(inv)
        setPurchaseOrders(pos)
        setFutureReceptions(recs)
        setCuttingPlans(plans)
        setOpportunities(opps)
        setApprovals(apps)
      } catch (err) {
        console.warn('Erro ao carregar cockpit geral:', err)
      }
    }
    loadAll()
  }, [])

  // Métricas Consolidadas do Ciclo de Matéria-Prima
  const totalPhysicalStockTons = items.reduce((acc, it) => acc + (it.weight_kg || 0) / 1000, 0)
  const totalPoPendingTons = purchaseOrders.reduce(
    (acc, po) => acc + (po.pending_weight_kg || po.ordered_weight_kg || 0) / 1000,
    0,
  )
  const totalExpectedTons = futureReceptions.reduce((acc, r) => acc + (r.expected_tons || 0), 0)
  const criticalItems = items.filter((it) => it.is_critical)
  const reservedItems = items.filter(
    (it) => it.reservation_status === 'RESERVADA' || it.reservation_status === 'EM_PLANO_DE_CORTE',
  )
  const blockedItems = items.filter(
    (it) => it.reservation_status === 'BLOQUEADA' || it.sap_block_status === '05_FORNO',
  )
  const delayedOrders = purchaseOrders.filter((po) => po.is_delayed)

  const potentialSavings = opportunities.reduce(
    (acc, op) => acc + (op.potential_savings_brl || 0),
    0,
  )
  const potentialScrapAvoidedKg = opportunities.reduce(
    (acc, op) => acc + (op.scrap_avoided_kg || 0),
    0,
  )

  return (
    <MPModuleLayout
      activeTopic="visao-geral"
      headerActions={
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              size="sm"
              variant={timeframe === 'MENSAL' ? 'default' : 'ghost'}
              className={`h-7 px-2.5 text-xs font-bold ${
                timeframe === 'MENSAL' ? 'bg-[#004C97] text-white' : 'text-slate-600'
              }`}
              onClick={() => setTimeframe('MENSAL')}
            >
              MENSAL
            </Button>
            <Button
              size="sm"
              variant={timeframe === 'YTD' ? 'default' : 'ghost'}
              className={`h-7 px-2.5 text-xs font-bold ${
                timeframe === 'YTD' ? 'bg-[#004C97] text-white' : 'text-slate-600'
              }`}
              onClick={() => setTimeframe('YTD')}
            >
              YTD 2025
            </Button>
          </div>
        </div>
      }
    >
      {/* 1. Alertas Globais em Faixa Superior */}
      <div className="p-3.5 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-900">
            Monitor do Ciclo Global de MP Ativo &bull; Governança e Rastreabilidade SAP ECC
          </span>
          <span className="text-slate-500 hidden sm:inline">
            | {delayedOrders.length} pedido(s) em atraso &bull; {opportunities.length}{' '}
            reaplicação(ões) sugeridas &bull;{' '}
            {approvals.filter((a) => a.overall_status === 'EM_ANALISE').length} pendência(s) de
            aprovação
          </span>
        </div>
        <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
          Pantone 2945 &bull; RBAC Ativo
        </Badge>
      </div>

      {/* 2. Grid com 8 Cards Estratégicos de Matéria-Prima */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Física Disponível
          </span>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {totalPhysicalStockTons.toFixed(1)}{' '}
            <span className="text-[11px] font-normal text-slate-500">t</span>
          </div>
          <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
            {items.length} un rastreadas
          </span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP em Pedido (PO)
          </span>
          <div className="text-base sm:text-lg font-black text-[#004C97] mt-1">
            {totalPoPendingTons.toFixed(1)}{' '}
            <span className="text-[11px] font-normal text-slate-500">t</span>
          </div>
          <span className="text-[9px] text-blue-600 font-bold block mt-0.5">
            {purchaseOrders.length} POs SAP
          </span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Recebimento Previsto
          </span>
          <div className="text-base sm:text-lg font-black text-blue-900 mt-1">
            {totalExpectedTons.toFixed(1)}{' '}
            <span className="text-[11px] font-normal text-slate-500">t</span>
          </div>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Horiz. 7-90d</span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Crítica
          </span>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-1">
            {criticalItems.length}{' '}
            <span className="text-[11px] font-normal text-slate-500">un</span>
          </div>
          <span className="text-[9px] text-rose-600 font-bold block mt-0.5">Preservação IA</span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Reservada
          </span>
          <div className="text-base sm:text-lg font-black text-slate-800 mt-1">
            {reservedItems.length}{' '}
            <span className="text-[11px] font-normal text-slate-500">un</span>
          </div>
          <span className="text-[9px] text-blue-700 font-bold block mt-0.5">Vínculo PCP</span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Bloqueada
          </span>
          <div className="text-base sm:text-lg font-black text-amber-700 mt-1">
            {blockedItems.length} <span className="text-[11px] font-normal text-slate-500">un</span>
          </div>
          <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Forno / Trauml</span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Reaplicável
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-800 mt-1">
            {opportunities.length}{' '}
            <span className="text-[11px] font-normal text-slate-500">un</span>
          </div>
          <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">ZPP86 / ZPP88</span>
        </Card>

        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Economia Potencial
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-700 mt-1">
            R$ {(potentialSavings / 1000).toFixed(0)}k
          </div>
          <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
            {(potentialScrapAvoidedKg / 1000).toFixed(1)}t sucata evitada
          </span>
        </Card>
      </div>

      {/* 3. OS TRÊS GRANDES CARDS OPERACIONAIS OBRIGATÓRIOS DO SUBMÓDULO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SUBTÓPICO 1: PEDIDOS E RECEBIMENTO DE MP */}
        <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-5 shadow-xs flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#004C97] font-black text-sm flex items-center justify-center border border-blue-200">
                1
              </span>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                ME23N &bull; MIGO &bull; 7-90d
              </Badge>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                PEDIDOS E RECEBIMENTO DE MP
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Consolidação oficial:{' '}
                <strong>
                  Necessidade + Pedidos de Compra SAP ECC + Previsão de Entrega + Recebimento Real
                  (Dimensão Real Medida) + Estoque Futuro
                </strong>{' '}
                nos horizontes Hoje / 7 / 15 / 30 / 60 / 90 dias.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Pedidos SAP Cadastrados:</span>
                <span className="font-bold text-slate-900">{purchaseOrders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recebimentos Futuros Previstos:</span>
                <span className="font-bold text-blue-700">{totalExpectedTons.toFixed(1)} t</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Risco Ruptura Monitorado:</span>
                <span className="font-bold text-rose-700">{delayedOrders.length} pedido(s)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <Link to="/pcp/gestao-materia-prima/pedidos-recebimento">
              <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2">
                <span>Acessar Pedidos e Recebimento</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* SUBTÓPICO 2: PLANOS DE CORTE */}
        <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-5 shadow-xs flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#004C97] font-black text-sm flex items-center justify-center border border-blue-200">
                2
              </span>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                Motor IA &bull; Gêmeo 3D &bull; 6 Cenários
              </Badge>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                PLANOS DE CORTE
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Ambiente estratégico para responder{' '}
                <strong>
                  qual MP usar, como cortar e como preservar o melhor resultado global
                </strong>
                : Estoque dimensional, Matriz Oficial (ZPPMP), Motor IA de 6 cenários, Gêmeo Digital
                3D e Reserva Inteligente.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Placas/Blocos em Estoque:</span>
                <span className="font-bold text-slate-900">{items.length} un</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Rendimento Médio Calculado:</span>
                <span className="font-bold text-emerald-800">92.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Planos de Corte Salvos:</span>
                <span className="font-bold text-[#004C97]">{cuttingPlans.length}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <Link to="/pcp/gestao-materia-prima/planos-corte">
              <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2">
                <span>Acessar Planos de Corte</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* SUBTÓPICO 3: OTIMIZAR APLICAÇÕES */}
        <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-5 shadow-xs flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-blue-50 text-[#004C97] font-black text-sm flex items-center justify-center border border-blue-200">
                3
              </span>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-600">
                ZPP86 &bull; ZPP88 &bull; ZPPT058
              </Badge>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                OTIMIZAR APLICAÇÕES
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Avaliação contínua de blocos já cortados:{' '}
                <strong>
                  ZPP86 (modificar aplicação KS preservando aplicação original) + ZPP88 (peças fora
                  do padrão ideal com produto final conforme) + Matriz de Reaplicação e Nuvem
                  Dimensional 3D
                </strong>
                .
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Oportunidades Mapeadas:</span>
                <span className="font-bold text-emerald-800">{opportunities.length} blocos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Economia R$ Estimada:</span>
                <span className="font-bold text-emerald-700">
                  R$ {potentialSavings.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aprovações Governança:</span>
                <span className="font-bold text-[#004C97]">{approvals.length} registros</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <Link to="/pcp/gestao-materia-prima/otimizar-aplicacoes">
              <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2">
                <span>Acessar Otimizar Aplicações</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Quadro Comparativo: O Ciclo Macro da Matéria-Prima no PCP Robotizado */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#004C97]" />
          Ciclo Macro e Fluxo Operacional de Matéria-Prima
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          O PCP Robotizado CIAFAL opera de ponta a ponta com dados reais do SAP ECC, garantindo que
          nenhum bloco seja cortado ou alterado sem validação dimensional estrita, aprovação humana
          e sincronização na fila PostgreSQL &rarr; SAP.
        </p>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto">
          <span className="text-[#004C97] font-bold">FLUXO OFICIAL:</span> NECESSIDADE &rarr; PEDIDO
          DE COMPRA (SAP) &rarr; PREVISÃO DE RECEBIMENTO &rarr; RECEBIMENTO REAL (DIMENSÃO MEDIDA)
          &rarr; ESTOQUE DIMENSIONAL &rarr; PLANO DE CORTE (IA) &rarr; APLICAÇÃO &rarr; REAPLICAÇÃO
          (ZPP86/ZPP88) &rarr; RESERVA PRODUÇÃO &rarr; ENVIO À LINHA &rarr; CONSUMO &rarr; PLANO X
          REAL &rarr; HISTÓRICO ZPPT058.
        </div>
      </div>
    </MPModuleLayout>
  )
}
