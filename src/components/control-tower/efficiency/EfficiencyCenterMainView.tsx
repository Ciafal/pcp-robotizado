import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  efficiencyCenterService,
  CenterEfficiencyFilters,
  CenterEfficiencyDataResult,
} from '@/services/efficiency-center-service'
import { EfficiencyCenterCards } from './EfficiencyCenterCards'
import { EfficiencyCenterFiltersBar } from './EfficiencyCenterFiltersBar'
import { EfficiencyCenterTable } from './EfficiencyCenterTable'
import { EfficiencyCenterHierarchyView } from './EfficiencyCenterHierarchyView'
import { EfficiencyDrilldownModal } from './EfficiencyDrilldownModal'
import { Badge } from '@/components/ui/badge'
import { Building2, RefreshCw, Radio, Table, ListTree, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EfficiencyCenterMainViewProps {
  initialLineCode?: string
  initialPlantCode?: string
  externalFilters?: CenterEfficiencyFilters
  onFilterChange?: (next: CenterEfficiencyFilters) => void
  hideInternalFiltersBar?: boolean
}

export const EfficiencyCenterMainView: React.FC<EfficiencyCenterMainViewProps> = ({
  initialLineCode = 'ALL',
  initialPlantCode = 'ALL',
  externalFilters,
  onFilterChange,
  hideInternalFiltersBar = false,
}) => {
  const [internalFilters, setInternalFilters] = useState<CenterEfficiencyFilters>({
    companyCode: 'ALL',
    plantCode: initialPlantCode,
    lineCode: initialLineCode,
    centerCode: 'ALL',
    status: 'ALL',
    startDate: '',
    endDate: '',
    product: '',
    order: '',
    allowDraftSchedule: false,
  })

  const filters = externalFilters || internalFilters

  const [data, setData] = useState<CenterEfficiencyDataResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'table'>('hierarchy')

  // Drill-down para Centro de Trabalho
  const [drilldownItem, setDrilldownItem] = useState<{
    title: string
    code: string
    breadcrumb: string[]
    plantCode?: string
    lineCode?: string
    centerCode?: string
  } | null>(null)

  // Controle de debounce e cancelamento para performance
  const abortControllerRef = useRef<AbortController | null>(null)

  const loadData = useCallback(async (appliedFilters: CenterEfficiencyFilters) => {
    setLoading(true)
    setError(null)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const result = await efficiencyCenterService.getEfficiencyByCenter(appliedFilters)
      setData(result)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Erro ao buscar dados de eficiência por centro:', err)
        setError(
          'Ocorreu um erro ao consultar as fontes de Montagem Semanal e apontamentos MES 4.0. Por favor, tente novamente.',
        )
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(filters)
  }, [loadData, filters])

  const handleApplyFilters = (newFilters: CenterEfficiencyFilters) => {
    if (onFilterChange) {
      onFilterChange(newFilters)
    } else {
      setInternalFilters(newFilters)
    }
  }

  const handleResetFilters = () => {
    const resetValues: CenterEfficiencyFilters = {
      companyCode: 'ALL',
      plantCode: 'ALL',
      lineCode: 'ALL',
      centerCode: 'ALL',
      status: 'ALL',
      startDate: '',
      endDate: '',
      product: '',
      order: '',
      allowDraftSchedule: false,
    }
    if (onFilterChange) {
      onFilterChange(resetValues)
    } else {
      setInternalFilters(resetValues)
    }
  }

  return (
    <div className="space-y-4" data-testid="efficiency-center-view">
      {/* BLOCO 1: CABEÇALHO (Título + Subtítulo curto + Status MES e alternadores) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97] shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                Eficiência por Centro de Trabalho
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-200 bg-slate-50 text-slate-700"
              >
                Previsto x Realizado &bull; Oficial
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Confronto das programações vigentes com os apontamentos físicos do MES 4.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Botão para Drill-down do centro selecionado */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const currentCenter =
                filters.centerCode && filters.centerCode !== 'ALL' ? filters.centerCode : 'SEML1'
              setDrilldownItem({
                title: `Detalhamento de Ordens &bull; ${currentCenter}`,
                code: currentCenter,
                breadcrumb: [
                  `Planta ${filters.plantCode || 'DIV'}`,
                  `Linha ${filters.lineCode || 'L1'}`,
                  `Centro ${currentCenter}`,
                ],
                plantCode: filters.plantCode,
                lineCode: filters.lineCode,
                centerCode: currentCenter,
              })
            }}
            className="h-8 text-xs border-[#004C97]/30 text-[#004C97] hover:bg-[#004C97]/10 font-semibold gap-1.5 shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ver detalhes</span>
          </Button>

          {/* Alternador de visualização: Árvore Hierárquica vs Tabela Analítica */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                viewMode === 'hierarchy'
                  ? 'bg-white text-[#004C97] font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Visão Hierárquica</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#004C97] font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabela Detalhada</span>
            </button>
          </div>

          {/* Status do MES */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            <Radio
              className={`w-3.5 h-3.5 ${
                data?.metadata.mesEndpointStatus === 'CONECTADO'
                  ? 'text-emerald-500 animate-pulse'
                  : 'text-amber-500'
              }`}
            />
            <span className="hidden md:inline">
              MES 4.0:{' '}
              {data?.metadata.mesEndpointStatus === 'CONECTADO' ? 'Conectado' : 'Aguardando'}
            </span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => loadData(filters)}
            disabled={loading}
            className="h-8 text-xs text-slate-700 border-slate-200 bg-white hover:bg-slate-50 gap-1 px-2.5 shadow-2xs"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* BLOCO 2: FILTROS OPERACIONAIS (LOGO ABAIXO DO CABEÇALHO, ANTES DE QUALQUER CARD) */}
      {!hideInternalFiltersBar && (
        <EfficiencyCenterFiltersBar
          initialFilters={filters}
          options={
            data?.availableOptions || {
              companies: [],
              plants: [],
              lines: [],
              centers: [],
            }
          }
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          isLoading={loading}
        />
      )}

      {/* BLOCO 3: KPIS DO PERÍODO */}
      <EfficiencyCenterCards
        summary={
          data?.summary || {
            totalCenters: 0,
            totalPlannedTons: 0,
            totalRealizedTons: null,
            overallAdherencePct: null,
            withinPlannedCount: 0,
            withinPlannedPct: 0,
            delayedCount: 0,
            delayedPct: 0,
            estimatedImpactTons: 0,
          }
        }
        loading={loading}
      />

      {/* 3. VISÃO PRINCIPAL: HIERARQUIA PLANTA -> LINHA -> CENTRO COM CARDS EXPANSÍVEIS */}
      {viewMode === 'hierarchy' ? (
        <EfficiencyCenterHierarchyView
          rows={data?.rows || []}
          loading={loading}
          error={error}
          onRetry={() => loadData(filters)}
          activeProgramacaoId={data?.metadata.activeProgramacaoId}
          activeProgramacaoVersion={data?.metadata.activeProgramacaoVersion}
        />
      ) : (
        <EfficiencyCenterTable
          rows={data?.rows || []}
          loading={loading}
          error={error}
          onRetry={() => loadData(filters)}
          activeProgramacaoId={data?.metadata.activeProgramacaoId}
          activeProgramacaoVersion={data?.metadata.activeProgramacaoVersion}
        />
      )}

      {/* MODAL DRILL-DOWN DE CENTRO */}
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
          }}
        />
      )}
    </div>
  )
}
