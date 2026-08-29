import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  CheckCircle2,
  GitCompare,
  TrendingUp,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { WeeklyScheduleScenario } from '@/types/weekly-schedule'

interface ScenarioComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  scenarios: WeeklyScheduleScenario[]
  activeScenarioCode: string
  onSelectScenario: (scenarioCode: string) => void
}

export const ScenarioComparisonModal: React.FC<ScenarioComparisonModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  activeScenarioCode,
  onSelectScenario,
}) => {
  // Cenário recomendado pela IA
  const recommendedScenario =
    scenarios.find((s) => s.ai_recommendation?.isRecommended) || scenarios[0]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Comparativo de Cenários de Programação (A / B / C)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Compare as métricas operacionais, ocupação de capacidade, setups e atendimento de
                  pedidos entre alternativas.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-mono">
              {scenarios.length} Cenários Ativos
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card de Recomendação de IA */}
          {recommendedScenario && (
            <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#004C97] text-white rounded-md">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Recomendação da IA CIAFAL: Cenário {recommendedScenario.scenario_code} (
                      {recommendedScenario.scenario_name})
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Score de Eficiência:{' '}
                      <strong className="text-blue-700">
                        {recommendedScenario.ai_recommendation?.score || 94}/100
                      </strong>
                    </span>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px]">
                  Decisão soberana do Programador
                </Badge>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {recommendedScenario.ai_recommendation?.rationale ||
                  `O Cenário ${recommendedScenario.scenario_code} apresenta a melhor relação entre taxa de ocupação da linha e agrupamento de matrizes de setup, reduzindo paradas operacionais e mitigando riscos de matéria-prima.`}
              </p>
            </div>
          )}

          {/* Tabela Comparativa de Cenários */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Indicador / Métrica</th>
                  {scenarios.map((sc) => (
                    <th
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center border-l border-slate-200"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">
                            Cenário {sc.scenario_code}
                          </span>
                          {sc.scenario_code === activeScenarioCode && (
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {sc.scenario_name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {/* 1. Produção Total */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#004C97]" />
                    Produção Programada (t)
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono font-bold text-slate-900 border-l border-slate-200"
                    >
                      {sc.metrics_snapshot.productionTons.toLocaleString('pt-BR')} t
                    </td>
                  ))}
                </tr>

                {/* 2. Ocupação da Capacidade */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    Ocupação de Capacidade (%)
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono font-bold border-l border-slate-200"
                    >
                      <span
                        className={
                          sc.metrics_snapshot.utilizationPct > 100
                            ? 'text-rose-600'
                            : sc.metrics_snapshot.utilizationPct >= 85
                              ? 'text-emerald-700'
                              : 'text-amber-600'
                        }
                      >
                        {sc.metrics_snapshot.utilizationPct}%
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 3. Tempo de Setup */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Tempo Total de Setup (h)
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono font-semibold border-l border-slate-200"
                    >
                      {sc.metrics_snapshot.setupHours}h
                    </td>
                  ))}
                </tr>

                {/* 4. Número de Trocas */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Trocas de Matriz / Família
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono text-slate-700 border-l border-slate-200"
                    >
                      {sc.metrics_snapshot.switchesCount} trocas
                    </td>
                  ))}
                </tr>

                {/* 5. Matéria-Prima em Risco */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Aços / MP em Risco / Déficit
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono font-bold border-l border-slate-200"
                    >
                      {sc.metrics_snapshot.rawMaterialRiskCount === 0 ? (
                        <span className="text-emerald-600 flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 0 riscos
                        </span>
                      ) : (
                        <span className="text-rose-600">
                          {sc.metrics_snapshot.rawMaterialRiskCount} item(ns)
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 6. Pedidos Atendidos */}
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Pedidos Atendidos (Carteira)
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono text-slate-700 border-l border-slate-200"
                    >
                      {sc.metrics_snapshot.ordersMetCount} / {sc.metrics_snapshot.ordersTotalCount}{' '}
                      (
                      {Math.round(
                        (sc.metrics_snapshot.ordersMetCount /
                          Math.max(1, sc.metrics_snapshot.ordersTotalCount)) *
                          100,
                      )}
                      %)
                    </td>
                  ))}
                </tr>

                {/* 7. Eficiência da Sequência */}
                <tr className="hover:bg-slate-50/70 bg-slate-50/50">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    Eficiência Técnica da Sequência
                  </td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center font-mono font-bold text-emerald-700 text-sm border-l border-slate-200"
                    >
                      {sc.metrics_snapshot.sequenceEfficiencyPct}%
                    </td>
                  ))}
                </tr>

                {/* Ação de Seleção */}
                <tr className="bg-white">
                  <td className="py-3 px-4 font-bold text-slate-900">Ação Operacional</td>
                  {scenarios.map((sc) => (
                    <td
                      key={sc.scenario_code}
                      className="py-3 px-4 text-center border-l border-slate-200"
                    >
                      {sc.scenario_code === activeScenarioCode ? (
                        <Badge className="bg-slate-100 text-slate-600 border-slate-300">
                          Em Exibição
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            onSelectScenario(sc.scenario_code)
                            onClose()
                          }}
                          className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs h-7 px-2.5 font-bold"
                        >
                          Ativar Cenário {sc.scenario_code}
                        </Button>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onClose} className="text-xs h-9">
            Fechar Comparativo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ScenarioComparisonModal
