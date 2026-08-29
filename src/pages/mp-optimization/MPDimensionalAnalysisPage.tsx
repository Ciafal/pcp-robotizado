import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import { MPDimensionalItem } from '@/types/mp-optimization'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, RefreshCw, Filter, Layers, DollarSign, TrendingDown } from 'lucide-react'

export const MPDimensionalAnalysisPage: React.FC = () => {
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const inv = await mpOptimizationService.getDimensionalInventory()
      setItems(inv)
    } catch (err) {
      console.warn(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const totalKg = items.reduce((acc, i) => acc + (i.weight_kg || 0), 0)

  return (
    <MPModuleLayout currentStep={9}>
      {/* 8 Cards Analíticos de Otimização */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Disponível
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {(totalKg / 1000).toFixed(1)} t
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            100% Rastreável
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Reservada
          </span>
          <div className="text-lg font-black text-blue-900 mt-1">0.0 t</div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Ordens Firmes
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Bloqueada
          </span>
          <div className="text-lg font-black text-rose-700 mt-1">0.0 t</div>
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">Não Conforme</span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Crítica
          </span>
          <div className="text-lg font-black text-amber-700 mt-1">
            {items.filter((i) => i.is_critical).length} un
          </div>
          <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
            Preservação Ativa
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Reaplicáveis
          </span>
          <div className="text-lg font-black text-[#004C97] mt-1">{items.length} un</div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Alta Versatilidade
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Peças Fora Ideal
          </span>
          <div className="text-lg font-black text-sky-800 mt-1">0 un</div>
          <span className="text-[10px] text-sky-600 font-semibold mt-0.5 block">
            ZPP88 Conforme
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Sucata Evitável
          </span>
          <div className="text-lg font-black text-emerald-700 mt-1">0.0 t</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Sobras Reúteis
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Economia (R$)
          </span>
          <div className="text-lg font-black text-emerald-700 mt-1">R$ 0</div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Custo Evitado
          </span>
        </Card>
      </div>

      {/* Seção com Distribuição Dimensional (Histogramas de Espessura, Largura, Comprimento) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#004C97]" />
              Histogramas de Distribuição Dimensional Real do Estoque Físico
            </h3>
            <p className="text-xs text-slate-500">
              Distribuição por faixas de Espessura (mm), Largura (mm) e Comprimento (mm) dos lotes
              estocados.
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#004C97]" />
            Atualizar Indicadores
          </Button>
        </div>

        {items.length === 0 ? (
          <SapEmptyState
            title="AGUARDANDO INTEGRAÇÃO SAP"
            description="Sem dados dimensionais de estoque para plotar distribuição estatística."
            sapTransaction="MB52 / ZPP86"
            onRefresh={loadData}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase block font-sans">
                Faixas de Espessura (mm)
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>100 - 150 mm:</span>
                  <span className="font-bold text-[#004C97]">
                    {items.filter((i) => i.thickness_mm <= 150).length} blocos
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>151 - 220 mm:</span>
                  <span className="font-bold text-[#004C97]">
                    {items.filter((i) => i.thickness_mm > 150).length} blocos
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase block font-sans">
                Faixas de Largura (mm)
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>&lt; 1000 mm:</span>
                  <span className="font-bold text-[#004C97]">
                    {items.filter((i) => i.width_mm < 1000).length} blocos
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>1000 - 1500 mm:</span>
                  <span className="font-bold text-[#004C97]">
                    {items.filter((i) => i.width_mm >= 1000).length} blocos
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-800 text-[11px] uppercase block font-sans">
                Faixas de Comprimento (mm)
              </span>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>&lt; 2500 mm:</span>
                  <span className="font-bold text-[#004C97]">
                    {items.filter((i) => i.length_mm < 2500).length} blocos
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>2500 - 4000 mm:</span>
                  <span className="font-bold text-[#004C97]">
                    {items.filter((i) => i.length_mm >= 2500).length} blocos
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MPModuleLayout>
  )
}
