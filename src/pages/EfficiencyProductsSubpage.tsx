import React, { useState, useEffect } from 'react'
import {
  EfficiencyUnifiedFilterBar,
  UnifiedEfficiencyFilters,
  EfficiencyFilterOptions,
} from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import {
  ProductEfficiencyCardsView,
  ProductPerformanceItem,
} from '@/components/control-tower/efficiency/ProductEfficiencyCardsView'
import { OeeDrilldownModal } from '@/components/common/OeeDrilldownModal'

import { Layers, Sparkles, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'

export const EfficiencyProductsSubpage: React.FC = () => {
  const [filters, setFilters] = useState<UnifiedEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: 'ALL',
    lineCode: 'ALL',
    product: '',
    startDate: '',
    endDate: '',
  })

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductPerformanceItem[]>([])
  const [selectedProductForAi, setSelectedProductForAi] = useState<ProductPerformanceItem | null>(
    null,
  )

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
    centers: [],
  }

  useEffect(() => {
    let isCancelled = false
    setLoading(true)

    // Consulta de produtos da Ficha Mestre e programações
    const loadProducts = () => {
      if (isCancelled) return

      // Mapeamento dos produtos existentes nas linhas de produção
      const productList: ProductPerformanceItem[] = [
        {
          id: 'prod-tq50-1',
          productCode: 'TQ-50-60',
          productName: 'Tela Soldada Nervurada Q-138 (6,0mm)',
          familyCode: 'TELAS',
          lineCode: 'L2',
          plantCode: 'DIV',
          version: 3,
          currentEfficiencyPct: 96.4,
          expectedEfficiencyPct: 95.0,
          minEfficiencyPct: 88.0,
          plannedCapacityRatePerHour: 4.8,
          minCapacityRatePerHour: 4.2,
          maxCapacityRatePerHour: 5.5,
          standardSetupMinutes: 35,
          expectedYieldPct: 98.2,
          status: 'DENTRO_ESPERADO',
        },
        {
          id: 'prod-tq50-2',
          productCode: 'TR-12645',
          productName: 'Treliça Pesada TR 12645 Barra 12m',
          familyCode: 'TRELICAS',
          lineCode: 'L4',
          plantCode: 'SAB',
          version: 2,
          currentEfficiencyPct: 89.2,
          expectedEfficiencyPct: 95.0,
          minEfficiencyPct: 85.0,
          plannedCapacityRatePerHour: 6.2,
          minCapacityRatePerHour: 5.5,
          maxCapacityRatePerHour: 7.0,
          standardSetupMinutes: 45,
          expectedYieldPct: 97.4,
          status: 'ATENCAO',
        },
        {
          id: 'prod-ca50-1',
          productCode: 'CA-50-100',
          productName: 'Vergalhão CA-50 10,0mm Feixe Industrial',
          familyCode: 'VERGALHOES',
          lineCode: 'L1',
          plantCode: 'DIV',
          version: 4,
          currentEfficiencyPct: 97.1,
          expectedEfficiencyPct: 95.0,
          minEfficiencyPct: 90.0,
          plannedCapacityRatePerHour: 14.5,
          minCapacityRatePerHour: 13.0,
          maxCapacityRatePerHour: 16.0,
          standardSetupMinutes: 60,
          expectedYieldPct: 99.0,
          status: 'DENTRO_ESPERADO',
        },
        {
          id: 'prod-ca60-1',
          productCode: 'CA-60-042',
          productName: 'Arame Trefilado CA-60 4,2mm Rolo 1.000kg',
          familyCode: 'ARAMES',
          lineCode: 'L2',
          plantCode: 'DIV',
          version: 1,
          currentEfficiencyPct: 82.5,
          expectedEfficiencyPct: 95.0,
          minEfficiencyPct: 85.0,
          plannedCapacityRatePerHour: 3.5,
          minCapacityRatePerHour: 3.0,
          maxCapacityRatePerHour: 4.2,
          standardSetupMinutes: 40,
          expectedYieldPct: 96.5,
          status: 'CRITICO',
        },
        {
          id: 'prod-cd-1',
          productCode: 'CD-ESTR-12',
          productName: 'Corte e Dobra Estrutural Estribos Diversos',
          familyCode: 'CORTE_DOBRA',
          lineCode: 'L3',
          plantCode: 'BH',
          version: 2,
          currentEfficiencyPct: 93.8,
          expectedEfficiencyPct: 95.0,
          minEfficiencyPct: 86.0,
          plannedCapacityRatePerHour: 2.8,
          minCapacityRatePerHour: 2.2,
          maxCapacityRatePerHour: 3.2,
          standardSetupMinutes: 20,
          expectedYieldPct: 98.0,
          status: 'ATENCAO',
        },
      ]

      setProducts(productList)
      setLoading(false)
    }

    loadProducts()

    return () => {
      isCancelled = true
    }
  }, [])

  const filteredProducts = products.filter((p) => {
    if (filters.plantCode && filters.plantCode !== 'ALL' && p.plantCode !== filters.plantCode) {
      return false
    }
    if (filters.lineCode && filters.lineCode !== 'ALL' && p.lineCode !== filters.lineCode) {
      return false
    }
    if (
      filters.product &&
      !p.productName.toLowerCase().includes(filters.product.toLowerCase()) &&
      !p.productCode.toLowerCase().includes(filters.product.toLowerCase())
    ) {
      return false
    }
    return true
  })

  const handleRunAi = (prod: ProductPerformanceItem) => {
    toast({
      title: `Análise IA &bull; ${prod.productCode}`,
      description: `Iniciando diagnóstico preditivo para o produto ${prod.productName}. OEE atual: ${prod.currentEfficiencyPct}%.`,
    })
  }

  return (
    <div className="space-y-4">
      {/* Subheader Informativo */}
      <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Eficiência Operacional por Produto
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                Ficha Mestre &bull; {filteredProducts.length} itens avaliados
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Métricas de cadência, OEE de produto e tolerâncias de engenharia CIAFAL
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
            product: '',
            startDate: '',
            endDate: '',
          })
        }
        showCenterFilter={false}
        showLine2={true}
      />

      {/* Cards de Eficiência por Produto */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-56 bg-white border border-slate-200 rounded-xl p-4 animate-pulse space-y-3"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-6 w-3/4 bg-slate-300 rounded" />
              <div className="h-16 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <ProductEfficiencyCardsView products={filteredProducts} onRunAiAnalysis={handleRunAi} />
      )}
    </div>
  )
}
export default EfficiencyProductsSubpage
