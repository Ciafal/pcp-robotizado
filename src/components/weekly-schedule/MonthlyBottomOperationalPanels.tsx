import React from 'react'
import {
  MonthlyWeekRowData,
  MonthlyRawMaterialRow,
  MonthlyBacklogSummary,
  MonthlyAwaitingObsItem,
} from '@/types/monthly-schedule'
import {
  Clock,
  Boxes,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

interface MonthlyBottomOperationalPanelsProps {
  weeks: MonthlyWeekRowData[]
  rawMaterials: MonthlyRawMaterialRow[]
  backlog: MonthlyBacklogSummary
  awaitingObs: MonthlyAwaitingObsItem[]
  lineCode?: string
  onSelectWeek: (weekNumber: number) => void
  onNavigateToObsItem: (item: MonthlyAwaitingObsItem) => void
  onViewMpAnalysis?: () => void
  onViewCarteira?: () => void
}

export const MonthlyBottomOperationalPanels: React.FC<MonthlyBottomOperationalPanelsProps> = ({
  weeks,
  rawMaterials,
  backlog,
  awaitingObs,
  lineCode = 'L1',
  onSelectWeek,
  onNavigateToObsItem,
  onViewMpAnalysis,
  onViewCarteira,
}) => {
  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 text-xs font-sans">
      {/* PAINEL 1: DESEMPENHO / CARGA POR SEMANA (Requisito 6) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#004C97]" />
              Desempenho / Carga por Semana
            </span>
            <span className="text-[10px] font-mono text-slate-400">S35–S39</span>
          </div>

          <div className="mt-2 overflow-x-auto no-scrollbar">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-1 font-sans">Sem</th>
                  <th className="pb-1 text-right">Cap.</th>
                  <th className="pb-1 text-right">Prod.</th>
                  <th className="pb-1 text-right">Ocup.</th>
                  <th className="pb-1 text-right">Setup</th>
                  <th className="pb-1 text-right">Paradas</th>
                  <th className="pb-1 text-center w-6">Alt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {weeks.map((w) => (
                  <tr
                    key={w.weekNumber}
                    onClick={() => onSelectWeek(w.weekNumber)}
                    className="hover:bg-slate-100/70 cursor-pointer transition-colors"
                    title={`Clique para abrir Semana ${w.weekNumber}`}
                  >
                    <td className="py-1 font-bold text-[#004C97] font-sans flex items-center gap-0.5">
                      {w.weekLabel} <ChevronRight className="w-2.5 h-2.5 opacity-60" />
                    </td>
                    <td className="py-1 text-right text-slate-700">{w.capacityHours}h</td>
                    <td className="py-1 text-right font-bold text-slate-900">
                      {w.productionTons}t
                    </td>
                    <td className="py-1 text-right text-emerald-700 font-bold">
                      {w.occupancyPct}%
                    </td>
                    <td className="py-1 text-right text-amber-700">{w.setupHours}h</td>
                    <td className="py-1 text-right text-orange-700">{w.stopsHours}h</td>
                    <td className="py-1 text-center font-bold">
                      {w.alertsCount > 0 ? (
                        <span className="text-rose-600 bg-rose-50 px-1 rounded">
                          {w.alertsCount}
                        </span>
                      ) : (
                        <span className="text-emerald-600">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
          <span>Total Mês: 5.840 t</span>
          <span className="font-bold text-[#004C97]">Ocupação Média: 83,5%</span>
        </div>
      </div>

      {/* PAINEL 2: MATÉRIA-PRIMA & TARUGOS (Requisito 7) com PRIMEIRA DATA DE RISCO */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
              Matéria-Prima & Tarugos
            </span>
            <span className="text-[10px] font-mono text-slate-400">(t / Saldo)</span>
          </div>

          <div className="mt-2 overflow-x-auto no-scrollbar">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-1 font-sans">Aço / Tarugo</th>
                  <th className="pb-1 text-right">Nec.</th>
                  <th className="pb-1 text-right">Saldo</th>
                  <th className="pb-1 text-right font-sans">1ª Data Risco</th>
                  <th className="pb-1 text-center w-5">St</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rawMaterials.map((rm, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50" title={rm.details}>
                    <td className="py-1 text-slate-800 font-sans font-medium truncate max-w-[85px]">
                      {rm.steelGrade}
                    </td>
                    <td className="py-1 text-right text-slate-700">{rm.monthlyNeedTons}</td>
                    <td
                      className={`py-1 text-right font-bold ${
                        rm.projectedBalanceTons >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {rm.projectedBalanceTons}
                    </td>
                    <td
                      className={`py-1 text-right font-sans font-medium text-[9.5px] truncate max-w-[80px] ${
                        rm.firstRiskDate !== 'Sem risco'
                          ? 'text-rose-700 font-bold'
                          : 'text-emerald-700'
                      }`}
                    >
                      {rm.firstRiskDate}
                    </td>
                    <td className="py-1 text-center text-xs">
                      {rm.status === 'GREEN' ? '🟢' : rm.status === 'YELLOW' ? '🟡' : '🔴'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onViewMpAnalysis}
            className="text-[10px] font-bold text-[#004C97] hover:underline flex items-center gap-1"
          >
            Ver análise completa de MP &rarr;
          </button>
        </div>
      </div>

      {/* PAINEL 3: CARTEIRA & ATENDIMENTO (Requisito 8) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              Carteira & Atendimento
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-bold">
              {backlog.fulfillmentPct}% atend.
            </span>
          </div>

          <div className="mt-2 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Carteira Início do Mês:</span>
              <span className="font-bold text-slate-900">
                {backlog.startMonthBacklogTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">+ Novos Pedidos (CRM):</span>
              <span className="font-bold text-indigo-700">
                +{backlog.newOrdersTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">- Programado no Mês:</span>
              <span className="font-bold text-emerald-700">
                -{backlog.programmedMonthTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div className="flex justify-between pt-0.5 border-t border-slate-100">
              <span className="text-slate-700 font-sans font-bold">
                = Carteira Projetada Final:
              </span>
              <span className="font-bold text-slate-900">
                {backlog.projectedFinalBacklogTons.toLocaleString('pt-BR')} t
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-sans">
              <span>Mix de Produção:</span>
              <span className="font-mono">
                MTS {backlog.mtsSharePct}% • MTO {backlog.mtoSharePct}%
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onViewCarteira}
            className="text-[10px] font-bold text-[#004C97] hover:underline flex items-center gap-1"
          >
            Ver carteira e backlog detalhados &rarr;
          </button>
        </div>
      </div>

      {/* PAINEL 4: AGUARDANDO OBSERVAÇÕES (Requisito 9) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Aguardando Observações
            </span>
            <span className="text-[10px] font-mono text-amber-800 font-bold bg-amber-50 px-1 rounded">
              {awaitingObs.length} Pendentes
            </span>
          </div>

          <div className="mt-1 space-y-1 text-[10.5px] max-h-[145px] overflow-y-auto no-scrollbar">
            {awaitingObs.slice(0, 4).map((obs) => (
              <div
                key={obs.id}
                onClick={() => onNavigateToObsItem(obs)}
                className="p-1.5 rounded bg-amber-50/40 border border-amber-200/80 hover:bg-amber-100/60 cursor-pointer transition-all"
                title={`Clique para abrir item ${obs.materialCode} na Semana ${obs.weekNumber}`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-amber-950 truncate max-w-[150px]">{obs.materialCode}</span>
                  <span className="font-mono text-[9.5px] text-amber-800">
                    S{obs.weekNumber} ({obs.dayDateStr})
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 line-clamp-1 mt-0.5">{obs.reason}</div>
                <div className="text-[9px] text-slate-500 flex justify-between mt-0.5">
                  <span>Resp: {obs.responsible}</span>
                  <span className="font-mono">{obs.deadline.split(' ')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-1.5 pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between items-center">
          <span>Total pendente: {awaitingObs.reduce((s, i) => s + i.tons, 0)} t</span>
          <span className="text-[#004C97] font-bold">Clique no item para editar &rarr;</span>
        </div>
      </div>
    </div>
  )
}
export default MonthlyBottomOperationalPanels
