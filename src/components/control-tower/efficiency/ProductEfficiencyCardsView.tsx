import React, { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Gauge,
  Clock,
  Layers,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { cn } from '@/lib/utils'

export interface ProductPerformanceItem {
  id: string
  productCode: string
  productName: string
  familyCode: string
  lineCode: string
  plantCode: string
  version: number
  currentEfficiencyPct: number
  expectedEfficiencyPct: number
  minEfficiencyPct: number
  plannedCapacityRatePerHour: number
  minCapacityRatePerHour: number
  maxCapacityRatePerHour: number
  standardSetupMinutes: number
  expectedYieldPct: number
  status: 'DENTRO_ESPERADO' | 'ATENCAO' | 'CRITICO' | string
}

interface ProductEfficiencyCardsViewProps {
  products: ProductPerformanceItem[]
  onRunAiAnalysis: (product: ProductPerformanceItem) => void
}

export const ProductEfficiencyCardsView: React.FC<ProductEfficiencyCardsViewProps> = ({
  products,
  onRunAiAnalysis,
}) => {
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({})

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (products.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-2 shadow-2xs">
        <Layers className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">
          Nenhum produto encontrado para os filtros selecionados
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Tente alterar o período, linha ou os termos de pesquisa.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((prod) => {
        const isBelowExpected = prod.currentEfficiencyPct < prod.expectedEfficiencyPct
        const isCritical = prod.currentEfficiencyPct < prod.minEfficiencyPct
        const isExpanded = !!expandedProducts[prod.id]

        return (
          <Card
            key={prod.id}
            className={cn(
              'bg-white border border-slate-200 transition-all hover:shadow-sm rounded-xl overflow-hidden shadow-2xs',
              isCritical
                ? 'border-rose-300'
                : isBelowExpected
                  ? 'border-amber-300'
                  : 'border-slate-200',
            )}
          >
            {/* Header do Card com Identidade CIAFAL Clara */}
            <CardHeader className="p-4 pb-2 bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-[#004C97] font-bold">
                    <span>{prod.productCode}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-600">Linha {prod.lineCode}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-500 font-normal">v{prod.version}</span>
                  </div>
                  <h4
                    className="text-sm font-bold text-slate-900 leading-snug mt-1 truncate"
                    title={prod.productName}
                  >
                    {prod.productName}
                  </h4>
                </div>

                <div className="shrink-0">
                  {isCritical ? (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                      Crítico
                    </Badge>
                  ) : isBelowExpected ? (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                      Atenção Preventiva
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                      Dentro do Esperado
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3 space-y-3">
              {/* Barra de Progresso da Eficiência */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Eficiência Realizada (OEE):</span>
                  <OeeInteractiveValue
                    value={prod.currentEfficiencyPct}
                    context={{
                      lineCode: prod.lineCode,
                      productCode: prod.productCode,
                      productName: prod.productName,
                      period: 'SHIFT',
                    }}
                    className={cn(
                      'font-bold cursor-pointer font-mono text-sm',
                      isCritical
                        ? 'text-rose-600'
                        : isBelowExpected
                          ? 'text-amber-600'
                          : 'text-emerald-700',
                    )}
                  />
                </div>

                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 relative">
                  {/* Linha Mínima */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                    style={{ left: `${prod.minEfficiencyPct}%` }}
                    title={`Mínimo: ${prod.minEfficiencyPct}%`}
                  />
                  {/* Linha Esperada */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#004C97] z-10"
                    style={{ left: `${prod.expectedEfficiencyPct}%` }}
                    title={`Esperado: ${prod.expectedEfficiencyPct}%`}
                  />
                  <div
                    className={cn(
                      'h-full transition-all',
                      isCritical
                        ? 'bg-rose-500'
                        : isBelowExpected
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                    )}
                    style={{ width: `${Math.min(100, prod.currentEfficiencyPct)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Mín: {formatPercentPtBr(prod.minEfficiencyPct, 1)}</span>
                  <span className="text-[#004C97] font-semibold">
                    Esperado: {formatPercentPtBr(prod.expectedEfficiencyPct, 1)}
                  </span>
                </div>
              </div>

              {/* Parâmetros Operacionais Principais */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px]">Capacidade Nominal</span>
                  <span className="text-slate-800 font-semibold">
                    {formatTonsPtBr(prod.plannedCapacityRatePerHour, 1, '—')}/h
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Faixa Esperada</span>
                  <span className="text-slate-700">
                    {prod.minCapacityRatePerHour}–{prod.maxCapacityRatePerHour} t/h
                  </span>
                </div>
              </div>

              {/* Alerta Preventivo */}
              {isBelowExpected && (
                <div className="bg-amber-50/80 border border-amber-200 p-2 rounded-lg text-xs text-amber-900 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Eficiência ({formatPercentPtBr(prod.currentEfficiencyPct, 1)}) abaixo da meta (
                    {formatPercentPtBr(prod.expectedEfficiencyPct, 1)}).
                  </span>
                </div>
              )}

              {/* Detalhes Expansíveis Secundários (Setup, Rendimento, Histórico) */}
              {isExpanded && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 space-y-2 text-xs font-mono animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Setup Padrão</span>
                      <span className="text-slate-800 font-semibold">
                        {prod.standardSetupMinutes} min
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Rendimento Metálico</span>
                      <span className="text-slate-800 font-semibold">
                        {formatPercentPtBr(prod.expectedYieldPct, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200 font-sans">
                    Ficha Mestre atrelada às diretrizes de cadência térmica e tolerâncias SAP.
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleProduct(prod.id)}
                  className="flex-1 h-8 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium gap-1"
                >
                  {isExpanded ? 'Ocultar' : 'Ver detalhes'}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={() => onRunAiAnalysis(prod)}
                  className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Analisar IA</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
