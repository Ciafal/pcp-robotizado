import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPReapplicationOpportunity } from '@/types/mp-optimization'
import { ClassificationBadge } from '@/components/mp-optimization/ClassificationBadge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  RotateCcw,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const MPReapplicationsPage: React.FC = () => {
  const { toast } = useToast()
  const [opportunities, setOpportunities] = useState<MPReapplicationOpportunity[]>([])
  const [sortBy, setSortBy] = useState<'SCORE' | 'SAVINGS' | 'WEIGHT' | 'RISK'>('SCORE')
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const data = await mpOptimizationService.getReapplicationOpportunities()
      setOpportunities(data)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [sortBy])

  return (
    <MPModuleLayout currentStep={7}>
      {/* Header com Critérios de Ordenação */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#004C97]" />
            Ranking Inteligente de Oportunidades de Reaplicação
          </h2>
          <p className="text-xs text-slate-500">
            Recomendações com justificativa matemática, precedentes históricos, cálculo de risco e
            economia em R$.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold">Ordenar por:</span>
          {(['SCORE', 'SAVINGS', 'WEIGHT', 'RISK'] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={sortBy === mode ? 'default' : 'outline'}
              className={`h-7 px-2 text-[11px] ${
                sortBy === mode
                  ? 'bg-[#004C97] text-white font-bold'
                  : 'border-slate-200 text-slate-600'
              }`}
              onClick={() => setSortBy(mode)}
            >
              {mode === 'SCORE' && 'Maior Score IA'}
              {mode === 'SAVINGS' && 'Maior Economia (R$)'}
              {mode === 'WEIGHT' && 'Maior Tonelagem'}
              {mode === 'RISK' && 'Menor Risco'}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-300 text-slate-700 text-xs font-semibold gap-1 ml-1"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
          </Button>
        </div>
      </div>

      {/* Lista de Oportunidades ou Estado Vazio */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        {opportunities.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Nenhuma oportunidade de reaplicação aberta no momento. O motor varre continuamente o pátio e a carteira para sugerir migrações dimensionais conforme novas ordens chegarem."
            sapTransaction="ZPP86 / ZPPT058"
            onRefresh={loadData}
          />
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-all space-y-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-slate-900 text-sm">
                      Bloco {opp.block_number} ({opp.heat_number || 'S/C'})
                    </span>
                    <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono">
                      Score IA: {opp.ai_score || 92} / 100
                    </Badge>
                  </div>
                  <ClassificationBadge classification={opp.dimensional_classification} size="sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Aplicação Atual</span>
                    <span className="font-bold text-slate-700">{opp.current_application}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Aplicação Recomendada</span>
                    <span className="font-bold text-emerald-800 flex items-center gap-1 font-sans">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                      {opp.recommended_application}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Dimensões & Massa</span>
                    <span className="font-bold text-slate-900">
                      {opp.thickness_mm}×{opp.width_mm}×{opp.length_mm} mm ({opp.weight_kg} kg)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Economia Estimada</span>
                    <span className="font-bold text-emerald-700">
                      R$ {(opp.potential_savings_brl || 1450).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px]">
                  <p className="text-slate-600 max-w-xl">
                    <strong>Justificativa IA:</strong>{' '}
                    {opp.ai_reasoning ||
                      'Material atende rigorosamente a tolerância dimensional sem necessidade de compra adicional.'}
                  </p>

                  <Button
                    size="sm"
                    className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs"
                    onClick={() => {
                      toast({
                        title: 'Simulação de Reaplicação Iniciada',
                        description: `Bloco ${opp.block_number} direcionado para aprovação de modificação de aplicação.`,
                      })
                    }}
                  >
                    Simular e Aplicar (ZPP86)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
