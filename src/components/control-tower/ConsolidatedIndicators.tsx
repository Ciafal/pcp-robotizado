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
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <ChartIcon className="w-4 h-4 text-[#004C97]" />
          <span className="font-bold text-white uppercase tracking-wider">
            Painel Executivo de Indicadores Consolidados (Cockpit Industrial)
          </span>
        </div>
        <Badge className="bg-[#004C97] text-white border-blue-400/30 text-[10px]">
          Cenário Ativo: {currentScenario.name}
        </Badge>
      </div>

      {/* Grid de 4 Grandes Blocos de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Aderência ao Plano */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Aderência Global</CardDescription>
            <CardTitle className="text-3xl font-black text-[#004C97]">
              {kpis.adherencePct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Produzido:</span>
              <strong className="text-white">{kpis.producedTons.toLocaleString('pt-BR')} t</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Programado:</span>
              <strong className="text-slate-300">
                {kpis.plannedTons.toLocaleString('pt-BR')} t
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* Eficiência OEE & Cadência */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">
              Vazão Fabril Instantânea
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-400">
              {kpis.totalRatePerHour}{' '}
              <span className="text-sm font-normal text-slate-400">t/h</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Ocupação Global:</span>
              <strong className="text-white">{kpis.occupancyPct}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Capacidade Livre:</span>
              <strong className="text-emerald-400">{kpis.availableCapacityPct}%</strong>
            </div>
          </CardContent>
        </Card>

        {/* Restrições & Gargalos */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">Gargalos Ativos</CardDescription>
            <CardTitle className="text-3xl font-black text-rose-400">
              {kpis.activeBottlenecks}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Paradas Relevantes:</span>
              <strong className="text-rose-400">{kpis.criticalStopsCount} linhas</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Ordens em Risco:</span>
              <strong className="text-amber-400">{kpis.ordersAtRisk} OPs</strong>
            </div>
          </CardContent>
        </Card>

        {/* Atendimento à Carteira */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs text-slate-400">
              Pedidos com Risco de Atraso
            </CardDescription>
            <CardTitle className="text-3xl font-black text-amber-400">
              {kpis.ordersAtRisk}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Atrasos Acumulados:</span>
              <strong className="text-white">{kpis.delaysCount} ordens</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Nível de Serviço:</span>
              <strong className="text-cyan-400">92.8% On-Time</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premissas e Resumo do Cenário Homologado */}
      <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
        <CardHeader className="p-4 pb-2 border-b border-slate-900">
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" /> Resumo do Planejamento Integrado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs space-y-3 text-slate-300">
          <p>
            O sequenciamento atual sincroniza <strong>6 linhas industriais ativas</strong> com o
            planejamento mestre do SAP ECC. Todas as alterações temporárias passam por simulação com
            motor de regras e aprovação em duas fases (PCP + Gestor).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-900 text-[11px]">
            <div>
              <span className="text-slate-500 block">Fonte Oficial Upstream:</span>
              <strong className="text-white">SAP ECC 6.0 (RFC ZPP_PROD)</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Controle de Autonomia de IA:</span>
              <strong className="text-emerald-400">
                Humano no Controle (Simulação & Recomendações)
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Horário de Fechamento de Turno:</span>
              <strong className="text-slate-300">Turno 1: 14:00 &bull; Turno 2: 22:00</strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
