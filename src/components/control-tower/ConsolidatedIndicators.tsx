import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { LineChart as ChartIcon, Cpu } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const ConsolidatedIndicators: React.FC = () => {
  const { kpis, scenarios, activeScenarioId } = useControlTower()
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0]

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-4 h-4 text-[#004C97]" />
          <span className="font-bold text-slate-900 uppercase tracking-wider">
            Painel Executivo de Indicadores Consolidados (Cockpit Industrial)
          </span>
        </div>
        <Badge className="bg-[#004C97]/10 text-[#004C97] border-[#004C97]/30 text-[10px] font-bold">
          Cenário Ativo: {currentScenario.name}
        </Badge>
      </div>

      {/* Grid de 4 Grandes Blocos de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aderência ao Plano */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-semibold">
              Aderência Global
            </CardDescription>
            <CardTitle className="text-3xl font-black text-[#004C97]">
              {kpis.adherencePct} %
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Produzido:</span>
              <strong className="text-slate-900">
                {kpis.producedTons.toLocaleString('pt-BR')} t
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Programado:</span>
              <strong className="text-slate-700">
                {kpis.plannedTons.toLocaleString('pt-BR')} t
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* Eficiência OEE & Cadência */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-semibold">
              Vazão Fabril Instantânea
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-700">
              {kpis.totalRatePerHour}{' '}
              <span className="text-sm font-semibold text-slate-500 font-mono">t/h</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Ocupação Global:</span>
              <strong className="text-slate-900">{kpis.occupancyPct} %</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Capacidade Livre:</span>
              <strong className="text-emerald-700">{kpis.availableCapacityPct} %</strong>
            </div>
          </CardContent>
        </Card>

        {/* Restrições & Gargalos */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-semibold">
              Gargalos Ativos
            </CardDescription>
            <CardTitle className="text-3xl font-black text-rose-700">
              {kpis.activeBottlenecks}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Paradas Relevantes:</span>
              <strong className="text-rose-700">{kpis.criticalStopsCount} linhas</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Ordens em Risco:</span>
              <strong className="text-amber-700">{kpis.ordersAtRisk} OPs</strong>
            </div>
          </CardContent>
        </Card>

        {/* Atendimento à Carteira */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-2xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-500 font-semibold">
              Pedidos com Risco de Atraso
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-700">
              {kpis.ordersAtRisk}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Atrasos Acumulados:</span>
              <strong className="text-slate-900">{kpis.delaysCount} ordens</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Nível de Serviço:</span>
              <strong className="text-[#004C97] font-bold">92,8 % On-Time</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premissas e Resumo do Cenário Homologado */}
      <Card className="bg-white border-slate-200 text-slate-900 shadow-2xs">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#004C97]" /> Resumo do Planejamento Integrado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-3 text-slate-700">
          <p>
            O sequenciamento atual sincroniza <strong>6 linhas industriais ativas</strong> com o
            planejamento mestre do SAP ECC. Todas as alterações temporárias passam por simulação com
            motor de regras e aprovação em duas fases (PCP + Gestor).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-500 block">Fonte Oficial Upstream:</span>
              <strong className="text-slate-900">SAP ECC 6.0 (RFC ZPP_PROD)</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Controle de Autonomia de IA:</span>
              <strong className="text-emerald-700 font-bold">
                Humano no Controle (Decisão Assistida por IA)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Horário de Fechamento de Turno:</span>
              <strong className="text-slate-800">Turno 1: 14:00 &bull; Turno 2: 22:00</strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
