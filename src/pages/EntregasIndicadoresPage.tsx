import React, { useState } from 'react'
import { EntregasSubmenu } from '@/components/pcp/entregas/EntregasSubmenu'
import { CiafalPageHeader, CiafalKPICard, CiafalCard } from '@/components/common/CiafalDesignSystem'
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

export const EntregasIndicadoresPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2025-05')

  return (
    <div className="space-y-4 max-w-full min-w-0" data-testid="entregas-indicadores-page">
      <EntregasSubmenu />

      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Indicadores de Entregas & Performance"
        subtitle="Métricas consolidadas de SLA de entrega, aderência à grade, perdas de expedição e desvios por linha fabril."
        breadcrumbs={[{ label: 'Entregas PCP', href: '/pcp/entregas' }, { label: 'Indicadores' }]}
        badge="Painel Gerencial"
        dataSource="SAP S/4HANA / MES 4.0 / WMS"
        lastUpdated={new Date()}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <CiafalKPICard
          title="Aderência Geral de SLA"
          value={94.6}
          unit="%"
          decimals={1}
          target="95,0"
          targetLabel="Meta SLA:"
          status="NORMAL"
          icon={TrendingUp}
        />
        <CiafalKPICard
          title="OTIF Expedição"
          value={92.8}
          unit="%"
          decimals={1}
          target="90,0"
          targetLabel="Meta OTIF:"
          status="SUCESSO"
          icon={CheckCircle2}
        />
        <CiafalKPICard
          title="Lead Time Médio Fabril"
          value={4.2}
          unit="dias"
          decimals={1}
          status="NORMAL"
          icon={Clock}
        />
        <CiafalKPICard
          title="Índice de Reprogramação"
          value={5.4}
          unit="%"
          decimals={1}
          target="< 7,0"
          targetLabel="Tolerância:"
          status="NORMAL"
          icon={AlertTriangle}
        />
      </div>

      {/* Gráficos e Tabelas Analíticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CiafalCard
          title="Evolução da Assertividade de Entregas (Últimos 6 Meses)"
          icon={BarChart3}
        >
          <div className="space-y-3 pt-2">
            {[
              { mes: 'Dez/2024', pct: 93.4, tons: 3100 },
              { mes: 'Jan/2025', pct: 94.1, tons: 3250 },
              { mes: 'Fev/2025', pct: 97.2, tons: 3110 },
              { mes: 'Mar/2025', pct: 98.2, tons: 3290 },
              { mes: 'Abr/2025', pct: 94.6, tons: 3216 },
              { mes: 'Mai/2025 (Atual)', pct: 94.6, tons: 3420 },
            ].map((m) => (
              <div key={m.mes} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{m.mes}</span>
                  <span className="font-mono text-[#004C97]">
                    {formatNumberPTBR(m.pct, 1)}% ({formatNumberPTBR(m.tons, 0)} t)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#004C97] h-full rounded-full transition-all"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CiafalCard>

        <CiafalCard title="Performance Comparativa por Linha Fabril" icon={Building2}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50">
                  <th className="py-2 px-3">Linha</th>
                  <th className="py-2 px-3 text-right">Volume (t)</th>
                  <th className="py-2 px-3 text-right">No Prazo (%)</th>
                  <th className="py-2 px-3 text-right">Atraso (%)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Linha L1</td>
                  <td className="py-2.5 px-3 text-right font-mono">3.420,50 t</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                    94,6%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">5,4%</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ÓTIMO
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Linha L2</td>
                  <td className="py-2.5 px-3 text-right font-mono">4.180,00 t</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                    95,2%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">4,8%</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      ÓTIMO
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Linha SDC</td>
                  <td className="py-2.5 px-3 text-right font-mono">2.890,40 t</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                    98,4%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">1,6%</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      DESTAQUE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">Endireitadeira</td>
                  <td className="py-2.5 px-3 text-right font-mono">1.120,00 t</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-bold">
                    89,2%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-bold">
                    10,8%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      ATENÇÃO
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CiafalCard>
      </div>
    </div>
  )
}
export default EntregasIndicadoresPage
