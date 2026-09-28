import React, { useState } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import { CheckCircle2, AlertTriangle, Clock, TrendingUp, Target, FileCheck2 } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPercentPtBr } from '@/lib/formatters-ptbr'

export const EfficiencyAssertivenessSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    startDate: '',
    endDate: '',
  })

  const filterOptions: EfficiencyFilterOptions = {
    companies: [
      { code: 'CIAFAL', name: 'CIAFAL Matriz' },
      { code: 'SIDERURGICA', name: 'Siderúrgica CIAFAL' },
    ],
    plants: [
      { code: 'DIV', name: 'Divinópolis (DIV)', companyCode: 'CIAFAL' },
      { code: 'BH', name: 'Belo Horizonte (BH)', companyCode: 'CIAFAL' },
      { code: 'SAB', name: 'Sabará (SAB)', companyCode: 'CIAFAL' },
    ],
    lines: [
      { code: 'L1', name: 'Linha 1 - Laminação', plantCode: 'DIV' },
      { code: 'L2', name: 'Linha 2 - Trefilação', plantCode: 'DIV' },
    ],
    centers: [],
  }

  const metrics = [
    {
      title: 'Assertividade de Início',
      value: '94,2%',
      subtext: 'Tolerância ≤ 15 min do previsto',
      status: 'ATENCAO',
      icon: Clock,
      color: 'border-t-amber-500',
    },
    {
      title: 'Aderência de Volume (t)',
      value: '95,8%',
      subtext: 'Volume programado vs apontado',
      status: 'DENTRO_ESPERADO',
      icon: Target,
      color: 'border-t-emerald-500',
    },
    {
      title: 'Aderência à Sequência Ótima',
      value: '91,5%',
      subtext: 'Cumprimento da ordem planejada',
      status: 'ATENCAO',
      icon: TrendingUp,
      color: 'border-t-amber-500',
    },
    {
      title: 'Conformidade de Lotes',
      value: '98,9%',
      subtext: 'Ordens fechadas sem refugo crítico',
      status: 'DENTRO_ESPERADO',
      icon: FileCheck2,
      color: 'border-t-[#004C97]',
    },
  ]

  const lineAssertiveness = [
    {
      lineCode: 'L1',
      lineName: 'Laminação a Quente',
      startPct: 96.5,
      volumePct: 97.7,
      sequencePct: 94.0,
      status: 'DENTRO_ESPERADO',
    },
    {
      lineCode: 'L2',
      lineName: 'Trefilação e Acabamento',
      startPct: 91.2,
      volumePct: 91.6,
      sequencePct: 88.5,
      status: 'ATENCAO',
    },
    {
      lineCode: 'L3',
      lineName: 'Corte e Dobra',
      startPct: 95.0,
      volumePct: 97.4,
      sequencePct: 92.0,
      status: 'DENTRO_ESPERADO',
    },
    {
      lineCode: 'L4',
      lineName: 'Treliças',
      startPct: 89.0,
      volumePct: 88.9,
      sequencePct: 86.0,
      status: 'ATENCAO',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Subheader Informativo */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Assertividade da Programação
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                Conformidade Temporal e Sequencial
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Índice de cumprimento da grade horária, sequência produtiva e entrega volumétrica
            </p>
          </div>
        </div>
      </div>

      {/* Grade Unificada de Filtros */}
      <EfficiencyUnifiedFilterBar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onReset={() =>
          setFilters({
            companyCode: 'ALL',
            plantCode: 'ALL',
            lineCode: 'ALL',
            startDate: '',
            endDate: '',
          })
        }
        showCenterFilter={false}
        showLine2={false}
      />

      {/* KPI Cards em Estilo Claro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m, idx) => {
          const Icon = m.icon
          return (
            <Card
              key={idx}
              className={`bg-white border border-slate-200 shadow-2xs rounded-lg border-t-4 ${m.color}`}
            >
              <CardContent className="p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 truncate">{m.title}</span>
                  <div className="w-7 h-7 rounded-md bg-slate-50 text-[#004C97] flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-mono">
                  {m.value}
                </div>
                <p className="text-[11px] text-slate-500 truncate">{m.subtext}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Tabela de Aderência por Linha */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900">
            Assertividade Operacional por Linha de Produção
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Critério: Início &le; 15 min &bull; Sequência = 100%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[640px]">
            <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Linha</th>
                <th className="py-2.5 px-4 text-right">Início no Horário</th>
                <th className="py-2.5 px-4 text-right">Aderência de Volume</th>
                <th className="py-2.5 px-4 text-right">Sequência Cumprida</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {lineAssertiveness.map((item) => (
                <tr key={item.lineCode} className="hover:bg-slate-50/80">
                  <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                    {item.lineCode} &bull; {item.lineName}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatPercentPtBr(item.startPct, 1)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatPercentPtBr(item.volumePct, 1)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatPercentPtBr(item.sequencePct, 1)}
                  </td>
                  <td className="py-2.5 px-4 text-center font-sans">
                    <Badge
                      className={
                        item.status === 'DENTRO_ESPERADO'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                          : 'bg-amber-50 text-amber-800 border-amber-200 text-[10px]'
                      }
                    >
                      {item.status === 'DENTRO_ESPERADO' ? 'No Prazo' : 'Atenção'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default EfficiencyAssertivenessSubpage
