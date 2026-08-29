import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPPlannedVsRealized } from '@/types/mp-optimization'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Compass, RefreshCw, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'

export const MPPlannedVsRealizedPage: React.FC = () => {
  const [comparisons, setComparisons] = useState<MPPlannedVsRealized[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await mpOptimizationService.getPlannedVsRealized()
      setComparisons(data)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <MPModuleLayout currentStep={13}>
      {/* Header com Conceito de Aderência e Feedback IA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#004C97]">
            <Compass className="w-4 h-4" />
            <span>ADERÊNCIA OPERACIONAL &bull; APONTAMENTO SAP</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Comparativo Dimensional: Planejado × Realizado
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
            A IA utiliza o histórico de apontamentos reais (peso, dimensões, rendimento, sucata,
            sobras e qualidade) para calibrar suas previsões estatísticas, sem alterar as regras
            técnicas da engenharia.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadData}
          className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5 shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
          Sincronizar Apontamentos
        </Button>
      </div>

      {/* Tabela de Plano x Real */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {comparisons.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Não existem apontamentos de execução real registrados no SAP para comparar com os planos de corte."
            sapTransaction="CO11N / ZPP86 / MB51"
            onRefresh={loadData}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Plano / Bloco</th>
                  <th className="p-2.5">Massa Plan. (kg)</th>
                  <th className="p-2.5">Massa Real (kg)</th>
                  <th className="p-2.5">Rend. Plan.</th>
                  <th className="p-2.5">Rend. Real</th>
                  <th className="p-2.5">Sucata Real (kg)</th>
                  <th className="p-2.5">Conformidade Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">
                      {c.plan_code} ({c.block_number})
                    </td>
                    <td className="p-2.5">{c.planned_weight_kg} kg</td>
                    <td className="p-2.5 font-bold text-slate-800">{c.realized_weight_kg} kg</td>
                    <td className="p-2.5 text-[#004C97]">{c.planned_yield_pct}%</td>
                    <td className="p-2.5 font-bold text-emerald-800">{c.realized_yield_pct}%</td>
                    <td className="p-2.5 text-slate-600">{c.realized_scrap_kg} kg</td>
                    <td className="p-2.5 font-sans">
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                        {c.final_product_conformance || 'CONFORME'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
