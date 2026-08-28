import React, { useState } from 'react'
import {
  Layers,
  Sparkles,
  ArrowRight,
  CalendarDays,
  FileCheck,
  CheckCircle2,
  Clock,
  TrendingUp,
  AlertTriangle,
  Send,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { ControlTowerHeader } from '@/components/control-tower/ControlTowerHeader'
import { ScenarioSimulator } from '@/components/control-tower/ScenarioSimulator'
import { ScenarioComparison } from '@/components/control-tower/ScenarioComparison'
import { AISequencingPanel } from '@/components/control-tower/AISequencingPanel'

export const ScenariosPage: React.FC = () => {
  const {
    scenarios,
    activeScenarioId,
    setActiveScenarioId,
    navigateToSubmodule,
    setIsSimulatorModalOpen,
    setIsComparisonModalOpen,
    setIsAIPanelOpen,
    isSimulatorModalOpen,
    isComparisonModalOpen,
    isAIPanelOpen,
    sendScenarioForApproval,
  } = useControlTower()

  const [filterType, setFilterType] = useState<string>('ALL')

  const currentScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0]

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto text-slate-100">
      {/* Header Central com Breadcrumb, Escopo e Ações */}
      <ControlTowerHeader
        title="Cenários e Simulações Produtivas"
        subtitle="Testar alternativas, inversões de campanha e compensações térmicas sem alterar a programação oficial."
        breadcrumbSubmodule="Cenários e Simulações"
      />

      {/* Barra de Ações Rápidas de Cenário */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-pantone-2945" />
          <span className="font-bold text-white">Cenários Disponíveis ({scenarios.length})</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Ambiente de sandbox seguro</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(true)}
            className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Comparar Cenários A / B / Base
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAIPanelOpen(true)}
            className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1 text-pantone-2945" />
            Analisar Trade-Offs com IA
          </Button>

          <Button
            size="sm"
            onClick={() => setIsSimulatorModalOpen(true)}
            className="h-7 text-xs bg-pantone-2945 hover:bg-pantone-2945/90 text-white font-bold"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Cenário
          </Button>
        </div>
      </div>

      {/* Grid de Cenários Cadastrados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((scen) => {
          const isActive = scen.id === activeScenarioId

          return (
            <Card
              key={scen.id}
              className={`bg-slate-950 border transition-all ${
                isActive
                  ? 'border-pantone-2945 shadow-lg shadow-pantone-2945/20 ring-1 ring-pantone-2945'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <CardHeader className="p-4 pb-2 border-b border-slate-900">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    className={
                      scen.type === 'BASE'
                        ? 'bg-blue-950 text-blue-300 border-blue-700 text-[10px]'
                        : scen.type === 'CENARIO_A'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-700 text-[10px]'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px]'
                    }
                  >
                    {scen.type === 'BASE'
                      ? 'OFICIAL (SAP)'
                      : scen.type === 'CENARIO_A'
                        ? 'CENÁRIO A (Setup)'
                        : 'CENÁRIO B (IA Otimizado)'}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={
                      scen.status === 'PUBLISHED'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-600/40 text-[10px]'
                        : 'bg-amber-950 text-amber-400 border-amber-600/40 text-[10px]'
                    }
                  >
                    {scen.status}
                  </Badge>
                </div>

                <CardTitle className="text-sm font-bold text-white mt-2">{scen.name}</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Criado por {scen.creator} em {scen.createdAt}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 text-xs space-y-3 font-mono">
                {/* KPIs do Cenário */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded border border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Volume Total:</span>
                    <strong className="text-white">
                      {scen.kpis.totalPlannedTons.toLocaleString('pt-BR')} t
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Aderência:</span>
                    <strong className="text-pantone-2945">{scen.kpis.adherencePct}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Pedidos em Risco:</span>
                    <strong
                      className={
                        scen.kpis.ordersAtRiskCount > 4 ? 'text-rose-400' : 'text-emerald-400'
                      }
                    >
                      {scen.kpis.ordersAtRiskCount} OPs
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Gargalos Ativos:</span>
                    <strong className="text-amber-400">{scen.kpis.activeBottlenecksCount}</strong>
                  </div>
                </div>

                {/* Premissas */}
                <div className="space-y-1 font-sans">
                  <span className="text-slate-400 font-semibold block text-[11px]">Premissa:</span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{scen.assumptions}</p>
                </div>

                {/* Vantagens / Desvantagens */}
                <div className="pt-2 border-t border-slate-900 space-y-1 font-sans text-[11px]">
                  <div className="text-emerald-400 font-semibold">
                    ✓ Vantagem: {scen.tradeOffs.advantages[0]}
                  </div>
                  <div className="text-amber-400 font-semibold">
                    ⚠ Risco: {scen.tradeOffs.risks[0] || 'Nenhum risco crítico'}
                  </div>
                </div>

                {/* Ações do Cenário */}
                <div className="pt-3 border-t border-slate-900 flex flex-col gap-2 font-sans">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveScenarioId(scen.id)}
                      className={`h-7 text-xs ${
                        isActive
                          ? 'bg-pantone-2945 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isActive ? '● Ativo em Tela' : 'Ativar Cenário'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigateToSubmodule('SEQUENCIAMENTO', {
                          company: scen.companyCode,
                          plant: scen.plantCode,
                          line: scen.lineCode,
                          tab: 'GANTT',
                        })
                      }
                      className="h-7 text-xs border-slate-800 bg-slate-900 text-cyan-300 hover:text-white"
                    >
                      <CalendarDays className="w-3.5 h-3.5 mr-1" />
                      Abrir no Gantt
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      sendScenarioForApproval(
                        `Cenário ${scen.name} submetido para validação oficial.`,
                      )
                    }
                    className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Submeter Cenário para Homologação
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modais de Simulação & Comparação */}
      <ScenarioSimulator
        isOpen={isSimulatorModalOpen}
        onClose={() => setIsSimulatorModalOpen(false)}
      />
      <ScenarioComparison
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
      />
      <AISequencingPanel isOpen={isAIPanelOpen} onClose={() => setIsAIPanelOpen(false)} />
    </div>
  )
}
