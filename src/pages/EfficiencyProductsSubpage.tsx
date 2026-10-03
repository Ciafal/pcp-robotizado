import React, { useState, useEffect } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import { ProductEfficiencyCardsView } from '@/components/control-tower/efficiency/ProductEfficiencyCardsView'
import {
  efficiencyProductService,
  ProductEfficiencyItem,
  ProductEfficiencySummary,
} from '@/services/efficiency-product-service'
import { Package, Sparkles, TrendingUp, AlertTriangle, Layers, FileSpreadsheet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { toast } from '@/hooks/use-toast'
import { EfficiencyDrilldownModal } from '@/components/control-tower/efficiency/EfficiencyDrilldownModal'

export const EfficiencyProductsSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    centerCode: 'ALL',
    product: '',
    status: 'ALL',
    startDate: '',
    endDate: '',
  })

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductEfficiencyItem[]>([])
  const [summary, setSummary] = useState<ProductEfficiencySummary | null>(null)

  // Estado para Drill-down Nível 1 & Nível 2
  const [drilldownItem, setDrilldownItem] = useState<{
    type: 'LINHA' | 'CENTRO' | 'PRODUTO'
    title: string
    code: string
    breadcrumb: string[]
    plantCode?: string
    lineCode?: string
    centerCode?: string
    materialCode?: string
  } | null>(null)

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
      { code: 'L2', name: 'Linha 2 - Trefilação / Acabamento', plantCode: 'DIV' },
      { code: 'L3', name: 'Linha 3 - Corte e Dobra', plantCode: 'BH' },
      { code: 'L4', name: 'Linha 4 - Treliças', plantCode: 'SAB' },
    ],
    centers: [
      { code: 'SEML1', name: 'Semilaminados L1', lineCode: 'L1' },
      { code: 'TREFILA_1', name: 'Trefilação 01', lineCode: 'L2' },
      { code: 'CD_BH01', name: 'Corte e Dobra BH', lineCode: 'L3' },
    ],
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await efficiencyProductService.getProductEfficiencyData({
        companyCode: filters.companyCode,
        plantCode: filters.plantCode,
        lineCode: filters.lineCode,
        centerCode: filters.centerCode,
        product: filters.product,
        status: filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
      })
      setProducts(res.products)
      setSummary(res.summary)
    } catch (err) {
      console.warn('Erro ao carregar dados de produtos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters])

  const handleRunAi = (prod: ProductEfficiencyItem) => {
    toast({
      title: `Análise IA &bull; ${prod.productCode}`,
      description: `Diagnóstico inteligente cruzando Ficha Mestra e histórico de apontamentos.`,
    })
  }

  const handleOpenDrilldown = (prod: ProductEfficiencyItem) => {
    setDrilldownItem({
      type: 'PRODUTO',
      title: prod.productDescription,
      code: prod.productCode,
      breadcrumb: [
        `Planta ${prod.plantCode}`,
        `Linha ${prod.lineCode}`,
        `Centro ${prod.centerCode || 'Geral'}`,
        `Material ${prod.productCode}`,
      ],
      plantCode: prod.plantCode,
      lineCode: prod.lineCode,
      centerCode: prod.centerCode,
      materialCode: prod.productCode,
    })
  }

  return (
    <div className="space-y-4">
      {/* BLOCO 1: Cabeçalho com contexto CIAFAL */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Eficiência Operacional por Produto Acabado
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                {products.length}{' '}
                {products.length === 1 ? 'produto analisado' : 'produtos analisados'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Desagregação por família, Ficha Mestra Expandida e histórico de apontamentos do chão
              de fábrica
            </p>
          </div>
        </div>
      </div>

      {/* BLOCO 2: Filtros Integrados (ANTES DE QUALQUER CARD) */}
      <EfficiencyUnifiedFilterBar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        onReset={() =>
          setFilters({
            companyCode: 'ALL',
            plantCode: 'ALL',
            lineCode: 'ALL',
            centerCode: 'ALL',
            product: '',
            status: 'ALL',
            startDate: '',
            endDate: '',
          })
        }
        onRefresh={loadData}
        showCenterFilter={true}
        showLine2={true}
      />

      {/* BLOCO 3: KPIs do Período */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="bg-white border border-slate-200 shadow-2xs border-t-4 border-t-[#004C97]">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-xs font-semibold text-slate-600">Volume Previsto</span>
              <div className="text-lg font-bold font-mono text-slate-900">
                {formatTonsPtBr(summary.totalPlannedTons, 1)}
              </div>
              <p className="text-[11px] text-slate-500">Programação semanal consolidada</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-2xs border-t-4 border-t-emerald-600">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-xs font-semibold text-slate-600">Volume Realizado</span>
              <div className="text-lg font-bold font-mono text-slate-900">
                {summary.totalRealizedTons !== null
                  ? formatTonsPtBr(summary.totalRealizedTons, 1)
                  : 'Sem apontamento'}
              </div>
              <p className="text-[11px] text-slate-500">Apontamentos físicos do MES 4.0</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-2xs border-t-4 border-t-blue-600">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-xs font-semibold text-slate-600">Aderência Média</span>
              <div className="text-lg font-bold font-mono text-slate-900">
                {summary.overallAdherencePct !== null
                  ? formatPercentPtBr(summary.overallAdherencePct, 1)
                  : '—'}
              </div>
              <p className="text-[11px] text-slate-500">Realizado vs Previsto</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-slate-200 shadow-2xs border-t-4 border-t-amber-600">
            <CardContent className="p-3.5 space-y-1">
              <span className="text-xs font-semibold text-slate-600">OEE Médio Ponderado</span>
              <div className="text-lg font-bold font-mono text-slate-900">
                {formatPercentPtBr(summary.averageOeePct, 1)}
              </div>
              <p className="text-[11px] text-slate-500">Média ponderada do período</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* BLOCO 4: Cards Detalhados dos Produtos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white border border-slate-200 rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-6 w-3/4 bg-slate-300 rounded" />
              <div className="h-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <ProductEfficiencyCardsView
          products={products}
          onRunAiAnalysis={handleRunAi}
          onOpenDrilldown={handleOpenDrilldown}
        />
      )}

      {/* Drill-down Modal Unificado */}
      {drilldownItem && (
        <EfficiencyDrilldownModal
          isOpen={!!drilldownItem}
          onClose={() => setDrilldownItem(null)}
          title={drilldownItem.title}
          code={drilldownItem.code}
          breadcrumb={drilldownItem.breadcrumb}
          filters={{
            plantCode: drilldownItem.plantCode,
            lineCode: drilldownItem.lineCode,
            centerCode: drilldownItem.centerCode,
            materialCode: drilldownItem.materialCode,
          }}
        />
      )}
    </div>
  )
}

export default EfficiencyProductsSubpage
