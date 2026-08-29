import React from 'react'
import {
  Clock,
  Boxes,
  Briefcase,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { WeeklyScheduleSummary, WeeklyIndicators } from '@/types/weekly-schedule'

interface BottomOperationalPanelsProps {
  summary: WeeklyScheduleSummary
  indicators: WeeklyIndicators
  lineCode?: string
  onViewAllAlerts?: () => void
  onViewMpAnalysis?: () => void
  onViewCarteira?: () => void
}

export const BottomOperationalPanels: React.FC<BottomOperationalPanelsProps> = ({
  summary,
  indicators,
  lineCode = 'L1',
  onViewAllAlerts,
  onViewMpAnalysis,
  onViewCarteira,
}) => {
  // 1. Resumo Semana
  const calHours = summary.capacity.calendarHours || 168.0
  const dispHours = summary.capacity.availableHours || 148.0
  const prodHours = summary.capacity.productionHours || 102.45
  const setupHours = summary.capacity.setupHours || 18.6
  const stopHours = summary.capacity.stoppedHours || 16.75
  const freeHours = summary.capacity.freeHours || 10.2
  const occupPct = summary.capacity.utilizationPct || 69.2

  // 2. Necessidade Tarugos
  const billetRows = [
    {
      steelGrade: 'SAE 1020 - 80x40x2.5',
      necessity: 428.5,
      available: 512.0,
      balance: 83.5,
      statusIcon: '🟢',
    },
    {
      steelGrade: 'SAE 1020 - 50x50x2.0',
      necessity: 312.0,
      available: 200.0,
      balance: -112.0,
      statusIcon: '🔴',
    },
    {
      steelGrade: 'SAE 1045 - 60x30x2.0',
      necessity: 185.8,
      available: 190.0,
      balance: 4.2,
      statusIcon: '🟡',
    },
  ]

  // Se o summary tiver dados dinâmicos reais, mesclamos/usamos eles
  const activeBilletRows =
    summary.billetRequirements && summary.billetRequirements.length > 0
      ? summary.billetRequirements.slice(0, 3).map((b) => ({
          steelGrade: `${b.steelGrade} - ${b.sectionDimension}`,
          necessity: b.requiredTons,
          available: b.availableTons,
          balance: b.projectedBalanceTons,
          statusIcon: b.status === 'GREEN' ? '🟢' : b.status === 'YELLOW' ? '🟡' : '🔴',
        }))
      : billetRows

  // 3. Carteira & Atendimento
  const totalCarteira = summary.backlog.totalTons || 1850.0
  const programadoSemana = summary.backlog.scheduledTons || 1248.3
  const pctAtendida = ((programadoSemana / totalCarteira) * 100).toFixed(1).replace('.', ',')
  const carteiraRestante = summary.backlog.remainingTons || 601.7
  const pctNum = Math.min(100, Math.max(0, (programadoSemana / totalCarteira) * 100))

  // 4. Alertas Principais (máx 4)
  const alertsList = [
    {
      icon: '🔴',
      text: 'MP SAE 1020: saldo projetado crítico em 27/08',
      type: 'critical',
    },
    {
      icon: '🟠',
      text: 'Sequência não recomendada entre Seq. 1 e 2',
      type: 'warning',
    },
    {
      icon: '🟠',
      text: 'Pedido 45871: prazo solicitado 25/08',
      type: 'warning',
    },
    {
      icon: '🟡',
      text: '1 item aguardando observações',
      type: 'info',
    },
  ]

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5 text-xs">
      {/* PAINEL 1: RESUMO SEMANA */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#004C97]" />
              Resumo Semana
            </span>
            <span className="text-[10px] font-mono text-slate-400">Linha {lineCode}</span>
          </div>

          <div className="mt-2 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Horas Calendário:</span>
              <span className="font-bold text-slate-800">{calHours.toFixed(2)} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Horas Disponíveis:</span>
              <span className="font-bold text-slate-800">{dispHours.toFixed(2)} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Horas Produção:</span>
              <span className="font-bold text-emerald-700">{prodHours.toFixed(2)} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Horas Setup/Troca:</span>
              <span className="font-bold text-amber-700">{setupHours.toFixed(2)} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Horas Parada Prog.:</span>
              <span className="font-bold text-orange-700">{stopHours.toFixed(2)} h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Horas Livres:</span>
              <span className="font-bold text-slate-600">{freeHours.toFixed(2)} h</span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
            <span>Ocupação da Capacidade</span>
            <span className="font-mono text-[#004C97]">{occupPct}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(100, occupPct)}%` }}
              className="h-full bg-[#004C97] rounded-full"
            />
          </div>
        </div>
      </div>

      {/* PAINEL 2: NECESSIDADE TARUGOS */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
              Necessidade Tarugos
            </span>
            <span className="text-[10px] font-mono text-slate-400">(t)</span>
          </div>

          <div className="mt-2 overflow-x-auto no-scrollbar">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-1 font-sans">Aço/Tarugo</th>
                  <th className="pb-1 text-right">Nec.</th>
                  <th className="pb-1 text-right">Disp.</th>
                  <th className="pb-1 text-right">Saldo</th>
                  <th className="pb-1 text-center w-6">St</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeBilletRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td
                      className="py-1 text-slate-800 font-sans font-medium truncate max-w-[95px]"
                      title={row.steelGrade}
                    >
                      {row.steelGrade}
                    </td>
                    <td className="py-1 text-right text-slate-700">{row.necessity.toFixed(1)}</td>
                    <td className="py-1 text-right text-slate-700">{row.available.toFixed(1)}</td>
                    <td
                      className={`py-1 text-right font-bold ${
                        row.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {row.balance.toFixed(1)}
                    </td>
                    <td className="py-1 text-center text-xs">{row.statusIcon}</td>
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

      {/* PAINEL 3: CARTEIRA & ATENDIMENTO */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
              Carteira & Atendimento
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-bold">{pctAtendida}%</span>
          </div>

          <div className="mt-2 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Carteira Total:</span>
              <span className="font-bold text-slate-900">
                {totalCarteira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Programado na Semana:</span>
              <span className="font-bold text-emerald-700">
                {programadoSemana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">% Carteira Atendida:</span>
              <span className="font-bold text-emerald-700">{pctAtendida}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Carteira Restante:</span>
              <span className="font-bold text-slate-800">
                {carteiraRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>
          </div>

          <div className="mt-2">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div style={{ width: `${pctNum}%` }} className="h-full bg-emerald-600 rounded-full" />
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onViewCarteira}
            className="text-[10px] font-bold text-[#004C97] hover:underline flex items-center gap-1"
          >
            Ver carteira detalhada &rarr;
          </button>
        </div>
      </div>

      {/* PAINEL 4: ALERTAS PRINCIPAIS */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="font-bold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Alertas Principais
            </span>
            <span className="text-[10px] font-mono text-rose-600 font-bold bg-rose-50 px-1 rounded">
              4 Ativos
            </span>
          </div>

          <div className="mt-1.5 space-y-1 text-[11px]">
            {alertsList.map((al, idx) => (
              <div
                key={idx}
                className="flex items-start gap-1.5 text-slate-800 leading-tight py-0.5"
              >
                <span className="text-xs shrink-0">{al.icon}</span>
                <span className="line-clamp-1 text-[10.5px]">{al.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onViewAllAlerts}
            className="text-[10px] font-bold text-[#004C97] hover:underline flex items-center gap-1"
          >
            Ver todos os alertas (12) &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
