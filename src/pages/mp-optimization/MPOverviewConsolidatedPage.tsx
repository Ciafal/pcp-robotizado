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
import { MPAIAgentAnalystCard } from '@/components/mp-optimization/MPAIAgentAnalystCard'
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

      {/* Agente Especialista IA em MP */}
      <MPAIAgentAnalystCard />

      {/* 2. Grid com 8 Cards Estratégicos de Matéria-Prima */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card className="border-slate-200 bg-white p-3 shadow-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Física Disponível
          </span>
          <div className="text-base sm:text-lg font-black text-slate-900 mt-1">
            {totalPhysicalStockTons.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
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
            {totalPoPendingTons.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
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
            {totalExpectedTons.toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            <span className="text-[11px] font-normal text-slate-500">t</span>
          </div>
          <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Horiz. 7-90 dias</span>
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
            {potentialSavings.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          </div>
          <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
            {(potentialScrapAvoidedKg / 1000).toLocaleString('pt-BR', {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{' '}
            t sucata evitada
          </span>
        </Card>
      </div>

      {/* 3. OS 8 GRANDES CARDS OPERACIONAIS DO SUBMÓDULO DE MATÉRIA-PRIMA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            8 Subtópicos Oficiais da Gestão de Matéria-Prima
          </h3>
          <Badge className="bg-[#004C97] text-white text-[10px]">
            100% Regras Nativas Integradas
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SUBTÓPICO 1: PEDIDOS E RECEBIMENTO DE MP */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  1
                </span>
                <Badge variant="outline" className="text-[9px] font-mono text-slate-600">
                  ME23N &bull; 7-90d
                </Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  1. Pedidos e Recebimento de MP
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Necessidade, Pedidos de Compra SAP, Previsões de Entrega e Horizontes.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pedidos SAP:</span>
                  <span className="font-bold text-slate-900">{purchaseOrders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entradas Previstas:</span>
                  <span className="font-bold text-blue-700">
                    {totalExpectedTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/pedidos-recebimento">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 2: PLANOS DE CORTE */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  2
                </span>
                <Badge variant="outline" className="text-[9px] font-mono text-slate-600">
                  IA &bull; Gêmeo 3D
                </Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  2. Planos de Corte
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Nesting dimensional, Matriz ZPPMP, 6 cenários IA e Gêmeo 3D.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Blocos em Estoque:</span>
                  <span className="font-bold text-slate-900">{items.length} un</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rendimento Médio:</span>
                  <span className="font-bold text-emerald-800">92,4 %</span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/planos-corte">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 3: OTIMIZAR APLICAÇÕES */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  3
                </span>
                <Badge variant="outline" className="text-[9px] font-mono text-slate-600">
                  ZPP86 &bull; ZPP88
                </Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  3. Otimizar Aplicações
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Reaplicação estratégica de blocos cortados e peças fora do ideal.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Oportunidades IA:</span>
                  <span className="font-bold text-emerald-800">{opportunities.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Economia R$:</span>
                  <span className="font-bold text-emerald-700">
                    {potentialSavings.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/otimizar-aplicacoes">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 4: PROJEÇÕES DE MP */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  4
                </span>
                <Badge className="bg-[#004C97] text-white text-[9px] font-mono">Novo</Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  4. Projeções de MP
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Ruptura diária vs Excel, Cobertura Total MP+Acabado e Simulação de Compras.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Primeira Ruptura:</span>
                  <span className="font-bold text-rose-600">SAE 1045 (18 dias)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cobertura 1020:</span>
                  <span className="font-bold text-emerald-700">125 dias</span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/projecoes-mp">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar Projeções</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 5: SALDO E DISPONIBILIDADE POR DESTINO */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  5
                </span>
                <Badge className="bg-[#004C97] text-white text-[9px] font-mono">Novo</Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  5. Saldo & Destino
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Lotes, Industrializadores (SDC), Sobras Sem Aplicação e Matriz Aço x Destino.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Industrializadores:</span>
                  <span className="font-bold text-blue-700">58,0 t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sobras (&lt; 0,35 t):</span>
                  <span className="font-bold text-amber-700">0,59 t</span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/saldo-disponibilidade-destino">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar Destinos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 6: NÍVEIS DE ESTOQUE — AÇOS ESPECIAIS */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  6
                </span>
                <Badge className="bg-[#004C97] text-white text-[9px] font-mono">Novo</Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  6. Aços Especiais
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Projeção contínua semana/dia/turno, Pools 525kg/510kg e Fator L2 versionado.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fator Atendimento L2:</span>
                  <span className="font-bold text-emerald-700">95,0 %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Granularidade:</span>
                  <span className="font-bold text-slate-800">T1 / T2 / T3</span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/niveis-estoque-acos-especiais">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar Aços Especiais</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 7: SALDO MP L1 E PREVISÃO DE CONSUMO */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  7
                </span>
                <Badge className="bg-[#004C97] text-white text-[9px] font-mono">Novo</Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  7. Saldo MP L1
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Matriz de Necessidade L1, KS, DP07/04, Necessidade L2 e Fornecedores.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Necessário L2:</span>
                  <span className="font-bold text-rose-600">120,0 t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Fornecedores:</span>
                  <span className="font-bold text-blue-700">185,0 t</span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/saldo-mp-l1-previsao-consumo">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar Saldo L1</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* SUBTÓPICO 8: UTILIZAÇÃO E SUBSTITUIÇÃO DE MP */}
          <div className="bg-white border-2 border-slate-200 hover:border-[#004C97] transition-all rounded-xl p-4 shadow-xs flex flex-col justify-between group">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 text-[#004C97] font-black text-xs flex items-center justify-center border border-blue-200">
                  8
                </span>
                <Badge className="bg-[#004C97] text-white text-[9px] font-mono">Novo</Badge>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#004C97] transition-colors">
                  8. Utilização MP
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Substituição 1020 vs AC, Enfornamento Quente/Frio e Desvios por Ordem.
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded text-[11px] space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">% 1020 no lugar de AC:</span>
                  <span className="font-bold text-rose-600">27,4 %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Enfornamento Quente:</span>
                  <span className="font-bold text-orange-600">71,8 %</span>
                </div>
              </div>
            </div>
            <div className="pt-3">
              <Link to="/pcp/gestao-materia-prima/utilizacao-substituicao-mp">
                <Button className="w-full bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold h-8 gap-1.5">
                  <span>Acessar Utilização</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
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
