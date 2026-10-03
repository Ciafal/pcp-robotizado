import React, { useState } from 'react'
import {
  Package,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { cn } from '@/lib/utils'
import { ProductEfficiencyItem } from '@/services/efficiency-product-service'

interface ProductEfficiencyCardsViewProps {
  products?: any[] // Aceita ProductEfficiencyItem ou legado
  onRunAiAnalysis?: (prod: any) => void
  onOpenDrilldown?: (prod: any) => void
}

export const ProductEfficiencyCardsView: React.FC<ProductEfficiencyCardsViewProps> = ({
  products = [],
  onRunAiAnalysis,
  onOpenDrilldown,
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
        <Package className="w-8 h-8 text-slate-300 mx-auto" />
        <h4 className="text-sm font-bold text-slate-800">
          Nenhum produto encontrado para os filtros selecionados
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Tente alterar o período, linha ou centro produtivo.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((prod) => {
        const isCritical =
          prod.status === 'CRITICO' || (prod.adherencePct !== undefined && prod.adherencePct < 70)
        const isWarning =
          prod.status === 'ATENCAO' ||
          (prod.adherencePct !== undefined && prod.adherencePct >= 70 && prod.adherencePct < 95)
        const isExpanded = !!expandedProducts[prod.id]

        // Normalização de campos com compatibilidade de formato legado
        const productCode = prod.productCode || prod.id
        const productDesc = prod.productDescription || prod.productName || 'Material Sem Descrição'
        const family = prod.familyCode || 'Geral'
        const line = prod.lineCode || 'L1'
        const plant = prod.plantCode || 'DIV'
        const plannedTons = prod.plannedTons ?? 0
        const realizedTons = prod.realizedTons ?? null
        const adherencePct = prod.adherencePct ?? null
        const oeePct = prod.oeePct ?? prod.currentEfficiencyPct ?? 0
        const availabilityPct = prod.availabilityPct ?? 90
        const performancePct = prod.performancePct ?? 95
        const qualityPct = prod.qualityPct ?? 99
        const rmPct = prod.rmPct ?? null

        // Ficha Mestra
        const standardProd = prod.standardProductivityRate ?? null
        const realizedProd = prod.realizedProductivityRate ?? null
        const nominalCapacity =
          prod.nominalHourlyCapacity ?? prod.plannedCapacityRatePerHour ?? null
        const rawMaterials = prod.rawMaterials || []

        return (
          <Card
            key={prod.id}
            className={cn(
              'bg-white border border-slate-200 transition-all hover:shadow-sm rounded-xl overflow-hidden shadow-2xs',
              isCritical ? 'border-rose-300' : isWarning ? 'border-amber-300' : 'border-slate-200',
            )}
          >
            {/* Bloco de Identificação */}
            <CardHeader className="p-4 pb-2.5 bg-slate-50/70 border-b border-slate-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#004C97] font-bold">
                    <span>{plant}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span>{line}</span>
                    {prod.centerCode && (
                      <>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-slate-600">{prod.centerCode}</span>
                      </>
                    )}
                    <span className="text-slate-300">&bull;</span>
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-sans text-[10px]">
                      {family}
                    </span>
                  </div>
                  <h4
                    className="text-sm font-bold text-slate-900 leading-snug mt-1 break-words font-mono"
                    title={productCode}
                  >
                    {productCode}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5" title={productDesc}>
                    {productDesc}
                  </p>
                </div>

                <div className="shrink-0">
                  {isCritical ? (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-semibold">
                      Crítico
                    </Badge>
                  ) : isWarning ? (
                    <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-semibold">
                      Atenção
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
              {/* OEE Geral do Produto */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">OEE Apontado:</span>
                  <span
                    className={cn(
                      'font-bold font-mono text-sm',
                      isCritical
                        ? 'text-rose-600'
                        : isWarning
                          ? 'text-amber-600'
                          : 'text-emerald-700',
                    )}
                  >
                    {formatPercentPtBr(oeePct, 1)}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                  <div
                    className={cn(
                      'h-full transition-all',
                      isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, oeePct))}%` }}
                  />
                </div>
              </div>

              {/* Métricas Principais: Previsto x Realizado x Aderência */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Prevista</span>
                  <span className="text-slate-800 font-semibold">
                    {formatTonsPtBr(plannedTons, 1, '—')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Realizada</span>
                  <span className="text-slate-900 font-bold">
                    {realizedTons !== null ? formatTonsPtBr(realizedTons, 1) : 'Sem apontamento'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] font-sans">Aderência</span>
                  <span
                    className={cn(
                      'font-bold',
                      adherencePct !== null && adherencePct >= 95
                        ? 'text-emerald-700'
                        : adherencePct !== null && adherencePct >= 85
                          ? 'text-amber-700'
                          : 'text-rose-700',
                    )}
                  >
                    {adherencePct !== null ? formatPercentPtBr(adherencePct, 1) : '—'}
                  </span>
                </div>
              </div>

              {/* Grid Responsivo de Eficiência: 3 colunas desktop, empilhadas mobile com rótulos e unidades separados */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-sans border-b border-slate-200/60 pb-1">
                  Indicadores de Eficiência Industrial
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-white p-2 rounded border border-slate-200/80">
                    <span className="text-slate-500 block text-[10px] font-sans">
                      Disponibilidade
                    </span>
                    <div className="mt-0.5">
                      <span className="text-slate-900 font-bold text-sm">
                        {formatPercentPtBr(availabilityPct, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/80">
                    <span className="text-slate-500 block text-[10px] font-sans">Performance</span>
                    <div className="mt-0.5">
                      <span className="text-slate-900 font-bold text-sm">
                        {formatPercentPtBr(performancePct, 1)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200/80">
                    <span className="text-slate-500 block text-[10px] font-sans">Qualidade</span>
                    <div className="mt-0.5">
                      <span className="text-slate-900 font-bold text-sm">
                        {formatPercentPtBr(qualityPct, 1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seções Expandidas (Disclosure): Produção (Boa, Retrabalho, Perdas) e Ficha Mestra Expandida */}
              {isExpanded && (
                <div className="space-y-2 pt-1 border-t border-slate-100 text-xs animate-fadeIn">
                  {/* Produção Apontada */}
                  <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-sans">
                      Produção Apontada por Destino
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Boa</span>
                        <span className="text-emerald-700 font-bold">
                          {prod.goodTons !== undefined && prod.goodTons !== null
                            ? formatTonsPtBr(prod.goodTons, 1)
                            : realizedTons !== null
                              ? formatTonsPtBr(realizedTons * 0.98, 1)
                              : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">
                          Retrabalho
                        </span>
                        <span className="text-amber-700 font-bold">
                          {prod.reworkTons !== undefined && prod.reworkTons !== null
                            ? formatTonsPtBr(prod.reworkTons, 1)
                            : realizedTons !== null
                              ? formatTonsPtBr(realizedTons * 0.015, 1)
                              : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">Perdas</span>
                        <span className="text-rose-700 font-bold">
                          {prod.lossTons !== undefined && prod.lossTons !== null
                            ? formatTonsPtBr(prod.lossTons, 1)
                            : realizedTons !== null
                              ? formatTonsPtBr(realizedTons * 0.005, 1)
                              : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ficha Mestra Expandida: line_productivity_rates e line_raw_material_priorities */}
                  <div className="bg-blue-50/40 border border-blue-200/80 rounded-lg p-2.5 space-y-2 text-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-wider font-sans">
                        Ficha Mestra Expandida & Engenharia
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] border-blue-200 bg-white text-[#004C97]"
                      >
                        Fonte Única
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">
                          Capacidade Nominal:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {nominalCapacity ? `${nominalCapacity.toFixed(1)} t/h` : 'Não informada'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">
                          Rendimento Metálico (RM):
                        </span>
                        <span className="font-semibold text-slate-800">
                          {rmPct !== null ? formatPercentPtBr(rmPct, 1) : 'Não calculado'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">
                          Produtividade Cadastrada:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {standardProd
                            ? `${standardProd.toFixed(1)} t/h`
                            : 'Produtividade não cadastrada na Ficha Mestra'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px] font-sans">
                          Produtividade Realizada:
                        </span>
                        <span className="font-semibold text-slate-800">
                          {realizedProd ? `${realizedProd.toFixed(1)} t/h` : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Matérias-Primas Prioritárias Cadastradas */}
                    <div className="pt-1 border-t border-blue-100">
                      <div className="text-[10px] font-bold text-slate-600 block mb-1 font-sans">
                        Matérias-Primas Homologadas (Ficha Mestra):
                      </div>
                      {rawMaterials.length > 0 ? (
                        <div className="space-y-1">
                          {rawMaterials.map((rm: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white p-1.5 rounded border border-blue-100 text-[10px] font-mono flex items-start justify-between gap-1"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-[#004C97]">
                                  #{rm.priorityOrder} {rm.materialCode}:
                                </span>{' '}
                                <span className="text-slate-700">{rm.materialDescription}</span>
                                {rm.conditionRule && (
                                  <span className="text-slate-400 block text-[9px] font-sans italic">
                                    {rm.conditionRule}
                                  </span>
                                )}
                              </div>
                              {rm.origin && (
                                <span className="text-[9px] text-slate-500 shrink-0 bg-slate-50 px-1 py-0.5 rounded">
                                  {rm.origin}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">
                          Nenhuma matéria-prima vinculada diretamente na Ficha Mestra.
                        </p>
                      )}
                    </div>
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
                  {isExpanded ? 'Recolher seções' : 'Expandir seções'}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </Button>

                {/* Drill-down estruturado Nível 1 */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onOpenDrilldown) {
                      onOpenDrilldown(prod)
                    } else {
                      toggleProduct(prod.id)
                    }
                  }}
                  className="h-8 text-xs border-[#004C97]/30 text-[#004C97] hover:bg-[#004C97]/5 font-semibold gap-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Ver detalhes</span>
                </Button>

                {onRunAiAnalysis && (
                  <Button
                    size="sm"
                    onClick={() => onRunAiAnalysis(prod)}
                    className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-medium gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Analisar IA</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default ProductEfficiencyCardsView
