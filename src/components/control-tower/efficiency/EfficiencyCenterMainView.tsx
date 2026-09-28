import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  efficiencyCenterService,
  CenterEfficiencyFilters,
  CenterEfficiencyDataResult,
} from '@/services/efficiency-center-service'
import { EfficiencyCenterCards } from './EfficiencyCenterCards'
import { EfficiencyCenterFiltersBar } from './EfficiencyCenterFiltersBar'
import { EfficiencyCenterTable } from './EfficiencyCenterTable'
import { Badge } from '@/components/ui/badge'
import { Building2, RefreshCw, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EfficiencyCenterMainViewProps {
  initialLineCode?: string
  initialPlantCode?: string
}

export const EfficiencyCenterMainView: React.FC<EfficiencyCenterMainViewProps> = ({
  initialLineCode = 'ALL',
  initialPlantCode = 'ALL',
}) => {
  const [filters, setFilters] = useState<CenterEfficiencyFilters>({
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

  const [data, setData] = useState<CenterEfficiencyDataResult | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

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
    setFilters(newFilters)
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
    setFilters(resetValues)
  }

  return (
    <div className="space-y-4" data-testid="efficiency-center-view">
      {/* Barra de Status de Fontes e Telemetria */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-lg shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Eficiência por Centro de Trabalho
              </span>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-slate-300 bg-slate-50 text-slate-600"
              >
                Fase 2 &bull; Previsto x Realizado
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Cruzamento estrito entre a Montagem Semanal oficial e os apontamentos de chão de
              fábrica.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status do MES */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
            <Radio
              className={`w-3.5 h-3.5 ${
                data?.metadata.mesEndpointStatus === 'CONECTADO'
                  ? 'text-emerald-500 animate-pulse'
                  : 'text-amber-500'
              }`}
            />
            <span>
              MES 4.0:{' '}
              {data?.metadata.mesEndpointStatus === 'CONECTADO'
                ? 'Conectado (Apontamentos Ativos)'
                : 'Aguardando telemetria em tempo real'}
            </span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => loadData(filters)}
            disabled={loading}
            className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1 px-2"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 1. CARDS SINTÉTICOS */}
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

      {/* 2. FILTROS OPERACIONAIS */}
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

      {/* 3. TABELA ANALÍTICA PREVISTO X REALIZADO POR CENTRO */}
      <EfficiencyCenterTable
        rows={data?.rows || []}
        loading={loading}
        error={error}
        onRetry={() => loadData(filters)}
        activeProgramacaoId={data?.metadata.activeProgramacaoId}
        activeProgramacaoVersion={data?.metadata.activeProgramacaoVersion}
      />
    </div>
  )
}
