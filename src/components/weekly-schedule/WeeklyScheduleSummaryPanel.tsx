import React, { useState } from 'react'
import {
  BarChart3,
  Boxes,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Layers,
  PieChart,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeeklyScheduleSummary } from '@/types/weekly-schedule'

interface WeeklyScheduleSummaryPanelProps {
  summary: WeeklyScheduleSummary
  lineCode: string
}

export const WeeklyScheduleSummaryPanel: React.FC<WeeklyScheduleSummaryPanelProps> = ({
  summary,
  lineCode,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'CAPACIDADE' | 'PRODUCAO' | 'MATERIA_PRIMA' | 'CARTEIRA'
  >('CAPACIDADE')

  return (
    <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
      {/* Header Recolhível */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-bold text-slate-800 hover:text-[#004C97] transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-[#004C97]" />
            <span>Resumo Consolidado da Semana (Painel Operacional CIAFAL)</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
          <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
            Linha {lineCode}
          </Badge>
        </div>

        {isExpanded && (
          <div className="flex items-center gap-1">
            {[
              { id: 'CAPACIDADE', label: '1. Capacidade', icon: Clock },
              { id: 'PRODUCAO', label: '2. Produção', icon: Layers },
              { id: 'MATERIA_PRIMA', label: '3. Necessidade de MP', icon: Boxes },
              { id: 'CARTEIRA', label: '4. Carteira / Backlog', icon: Briefcase },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#004C97] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isExpanded && (
        <CardContent className="p-4 text-xs">
          {/* TAB 1: CAPACIDADE */}
          {activeTab === 'CAPACIDADE' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 text-center">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Horas Calendário
                </span>
                <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
                  {summary.capacity.calendarHours} h
                </span>
                <span className="text-[9px] text-slate-400">7 dias × 24h</span>
              </div>

              <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-[#004C97] uppercase font-bold block">
                  Horas Disponíveis
                </span>
                <span className="text-base font-black font-mono text-[#004C97] mt-1 block">
                  {summary.capacity.availableHours} h
                </span>
                <span className="text-[9px] text-slate-500">Turnos ativos</span>
              </div>

              <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">
                  Horas Produção
                </span>
                <span className="text-base font-bold font-mono text-emerald-800 mt-1 block">
                  {summary.capacity.productionHours} h
                </span>
                <span className="text-[9px] text-emerald-600">Qtd / Produtividade</span>
              </div>

              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg">
                <span className="text-[10px] text-amber-800 uppercase font-bold block">
                  Horas Setup
                </span>
                <span className="text-base font-bold font-mono text-amber-800 mt-1 block">
                  {summary.capacity.setupHours} h
                </span>
                <span className="text-[9px] text-amber-600">Trocas de bitola/aço</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-600 uppercase font-bold block">
                  Horas Paradas
                </span>
                <span className="text-base font-bold font-mono text-slate-700 mt-1 block">
                  {summary.capacity.stoppedHours} h
                </span>
                <span className="text-[9px] text-slate-400">Manut. programada</span>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] text-slate-600 uppercase font-bold block">
                  Horas Livres
                </span>
                <span className="text-base font-bold font-mono text-emerald-700 mt-1 block">
                  {summary.capacity.freeHours} h
                </span>
                <span className="text-[9px] text-slate-400">Saldo disponível</span>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-300 rounded-lg">
                <span className="text-[10px] text-blue-900 uppercase font-bold block">
                  Ocupação %
                </span>
                <span className="text-base font-black font-mono text-[#004C97] mt-1 block">
                  {summary.capacity.utilizationPct}%
                </span>
                <span className="text-[9px] text-blue-700">Meta: 85 - 95%</span>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUÇÃO */}
          {activeTab === 'PRODUCAO' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900">
                  Total Programado na Semana:{' '}
                  <span className="text-[#004C97] font-mono font-black">
                    {summary.production.totalTons} t
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Unidade rigorosamente em toneladas (t)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Por Família */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wide">
                    Por Família de Produto
                  </span>
                  {Object.entries(summary.production.byFamily).length > 0 ? (
                    <div className="space-y-1.5 font-mono">
                      {Object.entries(summary.production.byFamily).map(([fam, tons]) => (
                        <div key={fam} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 truncate max-w-[120px]">{fam}</span>
                          <span className="font-bold text-slate-900">
                            {tons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Nenhum produto programado</span>
                  )}
                </div>

                {/* Por Material */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wide">
                    Por Material / Código SAP
                  </span>
                  {Object.entries(summary.production.byMaterial).length > 0 ? (
                    <div className="space-y-1.5 font-mono max-h-24 overflow-y-auto">
                      {Object.entries(summary.production.byMaterial).map(([mat, tons]) => (
                        <div key={mat} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 truncate max-w-[120px]">{mat}</span>
                          <span className="font-bold text-[#004C97]">
                            {tons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Nenhum material</span>
                  )}
                </div>

                {/* Por Turno */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wide">
                    Por Turno de Trabalho
                  </span>
                  {Object.entries(summary.production.byTurno).length > 0 ? (
                    <div className="space-y-1.5 font-mono">
                      {Object.entries(summary.production.byTurno).map(([tur, tons]) => (
                        <div key={tur} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 truncate max-w-[120px]">{tur}</span>
                          <span className="font-bold text-slate-900">
                            {tons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Sem distribuição</span>
                  )}
                </div>

                {/* Por Dia */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wide">
                    Por Dia da Semana
                  </span>
                  {Object.entries(summary.production.byDay).length > 0 ? (
                    <div className="space-y-1.5 font-mono">
                      {Object.entries(summary.production.byDay).map(([d, tons]) => (
                        <div key={d} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600">{d}</span>
                          <span className="font-bold text-slate-900">
                            {tons.toLocaleString('pt-BR')} t
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Sem programação</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MATÉRIA-PRIMA */}
          {activeTab === 'MATERIA_PRIMA' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">
                  Necessidade de MP Calculada: Aço, Tipo de Tarugo/Bobina, Disponibilidade e Saldos
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Origem oficial: Cadastro de Materiais SAP / WMS
                </span>
              </div>

              {summary.rawMaterials.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="py-2 px-3">Grau de Aço</th>
                        <th className="py-2 px-3">Tipo de Matéria-Prima</th>
                        <th className="py-2 px-3 text-right">Necessidade (t)</th>
                        <th className="py-2 px-3 text-center">Estoque Disponível</th>
                        <th className="py-2 px-3 text-center">Entrada Futura</th>
                        <th className="py-2 px-3 text-right">Consumo Previsto</th>
                        <th className="py-2 px-3 text-center">Saldo Projetado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.rawMaterials.map((rm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-slate-900">{rm.steelGrade}</td>
                          <td className="py-2 px-3 text-slate-700">{rm.rawMaterialType}</td>
                          <td className="py-2 px-3 text-right font-bold text-[#004C97]">
                            {rm.requiredTons} t
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400 italic font-sans text-[11px]">
                            {rm.availableStockTons !== null
                              ? `${rm.availableStockTons} t`
                              : 'Aguardando dados do SAP/WMS'}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400 italic font-sans text-[11px]">
                            {rm.futureEntryTons !== null
                              ? `${rm.futureEntryTons} t`
                              : 'Aguardando dados do SAP/WMS'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-800">
                            {rm.projectedConsumptionTons} t
                          </td>
                          <td className="py-2 px-3 text-center text-slate-400 italic font-sans text-[11px]">
                            {rm.projectedBalanceTons !== null
                              ? `${rm.projectedBalanceTons} t`
                              : 'Aguardando dados do SAP/WMS'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500 italic">
                  Adicione produtos na grade semanal para gerar o cálculo de necessidade de MP.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CARTEIRA */}
          {activeTab === 'CARTEIRA' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Carteira Total
                </span>
                <span className="text-sm font-medium text-slate-400 italic mt-2 block font-sans">
                  {summary.backlog.totalTons !== null
                    ? `${summary.backlog.totalTons} t`
                    : 'Aguardando dados do SAP/WMS'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Pedidos SAP / CRM</span>
              </div>

              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg text-center">
                <span className="text-[10px] text-[#004C97] uppercase font-bold block">
                  Carteira Contemplada
                </span>
                <span className="text-lg font-black font-mono text-[#004C97] mt-1 block">
                  {summary.backlog.scheduledTons} t
                </span>
                <span className="text-[10px] text-blue-700 mt-1 block">
                  Programado nesta semana
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Carteira Restante
                </span>
                <span className="text-sm font-medium text-slate-400 italic mt-2 block font-sans">
                  {summary.backlog.remainingTons !== null
                    ? `${summary.backlog.remainingTons} t`
                    : 'Aguardando dados do SAP/WMS'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Backlog remanescente</span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
