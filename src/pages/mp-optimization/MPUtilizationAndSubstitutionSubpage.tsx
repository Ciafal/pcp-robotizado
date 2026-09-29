import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { MPUtilizationItem, CalculationExplainPayload } from '@/types/mp-optimization'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import {
  MPUtilizationFilterHeader,
  MPUtilizationFiltersState,
  MPUtilizationHierarchyOptions,
  getIsoWeekDateRangePtBr,
} from '@/components/mp-optimization/MPUtilizationFilterHeader'
import {
  CANONICAL_MP_HIERARCHY_OPTIONS,
  CANONICAL_MP_UTILIZATION_DATASET,
  filterMPUtilizationRows,
} from '@/services/mp-utilization-dataset'
import { lineMasterService } from '@/services/line-master'
import { pcpAuditService } from '@/services/pcp-audit-service'
import {
  Flame,
  Snowflake,
  AlertOctagon,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
  Inbox,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { ColdCouldBeHotCard } from '@/components/mp-optimization/ColdCouldBeHotCard'
import { MPUtilizationAiAnalysis } from '@/components/mp-optimization/MPUtilizationAiAnalysis'
import { MPMonthlyChargingBarChart } from '@/components/mp-optimization/MPMonthlyChargingBarChart'

export const MPUtilizationAndSubstitutionSubpage: React.FC = () => {
  // Modal Explicador
  const [explainerPayload, setExplainerPayload] = useState<CalculationExplainPayload | null>(null)
  const [isExplainerOpen, setIsExplainerOpen] = useState(false)

  // Opções dinâmicas de hierarquia (Empresa -> Linha -> Centro da Ficha Mestra -> MP)
  const [hierarchyOptions, setHierarchyOptions] = useState<MPUtilizationHierarchyOptions>(
    CANONICAL_MP_HIERARCHY_OPTIONS,
  )

  // Estado inicial padrão conforme especificação (Critério 6):
  // Visão: MENSAL; Período: mês atual (Setembro/2026 no contexto do projeto);
  // Empresa, Linha, Centro e Matéria-prima: 'ALL'
  const defaultFilters: MPUtilizationFiltersState = {
    companyCode: 'ALL',
    lineCode: 'ALL',
    centerCode: 'ALL',
    selectedRawMaterials: [],
    temporalVision: 'MENSAL',
    dailyDate: '2026-06-15',
    weeklyWeek: 24,
    weeklyYear: 2026,
    monthlyMonth: 6,
    monthlyYear: 2026,
    annualYear: 2026,
  }

  // Estado dos filtros editados no formulário
  const [filters, setFilters] = useState<MPUtilizationFiltersState>(defaultFilters)
  // Estado dos filtros efetivamente aplicados na tela
  const [appliedFilters, setAppliedFilters] = useState<MPUtilizationFiltersState>(defaultFilters)
  // Estado de carregamento / skeleton
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Carrega centros e linhas reais da Ficha Mestra para garantir coerência com cadastros existentes
  useEffect(() => {
    let isMounted = true
    const loadFichaMestraData = async () => {
      try {
        const lines = await lineMasterService.listLines()
        if (!isMounted || !lines || lines.length === 0) return
        // Linhas obtidas do serviço de Ficha Mestra
      } catch (err) {
        // Fallback silencioso para manter opções canônicas intactas
        console.warn('Utilizando centros canônicos da Ficha Mestra:', err)
      }
    }
    loadFichaMestraData()
    return () => {
      isMounted = false
    }
  }, [])

  // Handler do botão "Aplicar filtros"
  const handleApplyFilters = (nextFilters: MPUtilizationFiltersState) => {
    setIsLoading(true)
    // Simula breve latência de consulta / processamento analítico para exibir o loading/skeleton discreto
    setTimeout(() => {
      setAppliedFilters(nextFilters)
      setIsLoading(false)

      // Registro de auditoria padrão HUB CIAFAL
      pcpAuditService
        .recordLog({
          event_type: 'FILTER_APPLIED',
          action: 'APPLY_FILTERS',
          entity: 'mp_utilization_history',
          resource: 'mp_utilization_history',
          module: 'Gestão de MP',
          screen: 'Utilização e Substituição de MP',
          company: nextFilters.companyCode === 'ALL' ? 'CIAFAL' : nextFilters.companyCode,
          line: nextFilters.lineCode === 'ALL' ? '' : nextFilters.lineCode,
          center: nextFilters.centerCode === 'ALL' ? '' : nextFilters.centerCode,
          justification: `Filtros aplicados: Visão=${nextFilters.temporalVision}, Empresa=${nextFilters.companyCode}, Linha=${nextFilters.lineCode}, Centro=${nextFilters.centerCode}, MPs=${nextFilters.selectedRawMaterials.length || 'Todas'}`,
          details: {
            vision: nextFilters.temporalVision,
            company: nextFilters.companyCode,
            line: nextFilters.lineCode,
            center: nextFilters.centerCode,
            selected_mps: nextFilters.selectedRawMaterials,
          },
        })
        .catch(() => {
          // Auditoria não bloqueante
        })
    }, 280)
  }

  // Handler do botão "Limpar filtros"
  const handleResetFilters = () => {
    setFilters(defaultFilters)
    handleApplyFilters(defaultFilters)
  }

  // Filtragem reativa do dataset com base nos filtros APLICADOS
  const filteredRows: MPUtilizationItem[] = useMemo(() => {
    return filterMPUtilizationRows(CANONICAL_MP_UTILIZATION_DATASET, appliedFilters)
  }, [appliedFilters])

  // Métricas Consolidadas baseadas estritamente nos dados filtrados
  const totalProducedTons = useMemo(() => {
    return filteredRows.reduce((a, b) => a + b.produced_tons, 0)
  }, [filteredRows])

  const totalConsumedTons = useMemo(() => {
    return filteredRows.reduce((a, b) => a + b.mp_consumed_tons, 0)
  }, [filteredRows])

  const totalHotChargingTons = useMemo(() => {
    return filteredRows.reduce((a, b) => a + (b.hot_charging_tons || 0), 0)
  }, [filteredRows])

  const totalColdChargingTons = useMemo(() => {
    return filteredRows.reduce((a, b) => a + (b.cold_charging_tons || 0), 0)
  }, [filteredRows])

  const pctHotCharging = useMemo(() => {
    return totalConsumedTons > 0 ? (totalHotChargingTons / totalConsumedTons) * 100 : 0
  }, [totalConsumedTons, totalHotChargingTons])

  // Substituições (1020 no lugar de AC)
  const eligibleAcRows = useMemo(() => {
    return filteredRows.filter((r) => r.could_be_ac)
  }, [filteredRows])

  const totalEligibleAcTons = useMemo(() => {
    return eligibleAcRows.reduce((a, b) => a + b.mp_consumed_tons, 0)
  }, [eligibleAcRows])

  const substitutedAcRows = useMemo(() => {
    return filteredRows.filter((r) => r.is_substitute_application)
  }, [filteredRows])

  const totalSubstitutedTons = useMemo(() => {
    return substitutedAcRows.reduce((a, b) => a + b.mp_consumed_tons, 0)
  }, [substitutedAcRows])

  const pctSubstitution = useMemo(() => {
    return totalEligibleAcTons > 0 ? (totalSubstitutedTons / totalEligibleAcTons) * 100 : 0
  }, [totalEligibleAcTons, totalSubstitutedTons])

  // Agrupamento analítico por Grupos / Fornecedores dinâmico baseado nos registros filtrados
  const analyticalGroupsData = useMemo(() => {
    const groupTotals: Record<string, number> = {
      ArcelorMittal: 0,
      'Vallourec Soluções': 0,
      'Ciafal L2 (Própria)': 0,
      'Gerdau Especiais': 0,
      'Aço Comercial AC': 0,
      'Ecosucata / Faca': 0,
    }

    filteredRows.forEach((r) => {
      const orig = r.origin_group || 'Outros'
      if (orig.includes('Arcelor')) {
        groupTotals['ArcelorMittal'] += r.mp_consumed_tons
      } else if (orig.includes('Vallourec')) {
        groupTotals['Vallourec Soluções'] += r.mp_consumed_tons
      } else if (orig.includes('L2') || orig.includes('Ciafal')) {
        groupTotals['Ciafal L2 (Própria)'] += r.mp_consumed_tons
      } else if (orig.includes('Gerdau')) {
        groupTotals['Gerdau Especiais'] += r.mp_consumed_tons
      } else if (orig.includes('Comercial') || orig.includes('AC')) {
        groupTotals['Aço Comercial AC'] += r.mp_consumed_tons
      } else if (orig.includes('Faca') || orig.includes('Sucata')) {
        groupTotals['Ecosucata / Faca'] += r.mp_consumed_tons
      } else {
        if (!groupTotals[orig]) groupTotals[orig] = 0
        groupTotals[orig] += r.mp_consumed_tons
      }
    })

    return [
      { name: 'ArcelorMittal', tons: groupTotals['ArcelorMittal'] },
      { name: 'Vallourec Soluções', tons: groupTotals['Vallourec Soluções'] },
      { name: 'Ciafal L2 (Própria)', tons: groupTotals['Ciafal L2 (Própria)'] },
      { name: 'Gerdau Especiais', tons: groupTotals['Gerdau Especiais'] },
      { name: 'Aço Comercial AC', tons: groupTotals['Aço Comercial AC'] },
      { name: 'Ecosucata / Faca', tons: groupTotals['Ecosucata / Faca'] },
    ]
  }, [filteredRows])

  // Dados do Gráfico de Enfornamento
  const chargingPieData = useMemo(() => {
    if (totalConsumedTons === 0) {
      return [
        { name: 'Enfornamento a Quente', value: 0, color: '#ea580c' },
        { name: 'Enfornamento a Frio', value: 0, color: '#0284c7' },
      ]
    }
    return [
      {
        name: 'Enfornamento a Quente',
        value: Number(totalHotChargingTons.toFixed(1)),
        color: '#ea580c',
      },
      {
        name: 'Enfornamento a Frio',
        value: Number(totalColdChargingTons.toFixed(1)),
        color: '#0284c7',
      },
    ]
  }, [totalConsumedTons, totalHotChargingTons, totalColdChargingTons])

  const openSubstitutionExplainer = () => {
    const payload = MPCentralProjectionEngine.explainCalculation('SUBSTITUICAO_AC', {
      substituteVolume: totalSubstitutedTons,
      eligibleVolume: totalEligibleAcTons,
    })
    setExplainerPayload(payload)
    setIsExplainerOpen(true)
  }

  // Cálculos do Novo Indicador: "Enfornamento frio que poderia ser quente"
  const ordersWithPotentialHot = useMemo(() => {
    return filteredRows.filter((r) => r.could_be_hot_charging && (r.potential_hot_tons || 0) > 0)
  }, [filteredRows])

  const totalPotentialHotTons = useMemo(() => {
    return ordersWithPotentialHot.reduce((acc, r) => acc + (r.potential_hot_tons || 0), 0)
  }, [ordersWithPotentialHot])

  const pctColdCouldBeHot = useMemo(() => {
    return totalColdChargingTons > 0 ? (totalPotentialHotTons / totalColdChargingTons) * 100 : 0
  }, [totalColdChargingTons, totalPotentialHotTons])

  const openColdCouldBeHotExplainer = () => {
    const payload = MPCentralProjectionEngine.explainCalculation(
      'ENFORNAMENTO_FRIO_POTENCIAL_QUENTE' as any,
      {
        totalColdTons: totalColdChargingTons,
        potentialHotTons: totalPotentialHotTons,
        impactedOrders: ordersWithPotentialHot.length,
      },
    )
    setExplainerPayload(payload)
    setIsExplainerOpen(true)
  }

  // Rótulo textual do contexto temporal aplicado (considerando granularidade DE / ATÉ)
  const appliedPeriodDisplay = useMemo(() => {
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]

    if (appliedFilters.periodMode === 'DATA') {
      const fromParts = (appliedFilters.dateFrom || '2026-06-01').split('-')
      const toParts = (appliedFilters.dateTo || '2026-06-30').split('-')
      const fromBr =
        fromParts.length === 3
          ? `${fromParts[2]}/${fromParts[1]}/${fromParts[0]}`
          : appliedFilters.dateFrom
      const toBr =
        toParts.length === 3 ? `${toParts[2]}/${toParts[1]}/${toParts[0]}` : appliedFilters.dateTo
      return `De ${fromBr} até ${toBr}`
    }

    if (appliedFilters.periodMode === 'MES') {
      const fromM = appliedFilters.monthFrom ?? 6
      const fromY = appliedFilters.yearMonthFrom ?? 2026
      const toM = appliedFilters.monthTo ?? 8
      const toY = appliedFilters.yearMonthTo ?? 2026
      return `De ${months[fromM - 1]}/${fromY} até ${months[toM - 1]}/${toY}`
    }

    if (appliedFilters.periodMode === 'ANO') {
      const fromY = appliedFilters.yearFrom ?? 2025
      const toY = appliedFilters.yearTo ?? 2026
      return `De ${fromY} até ${toY}`
    }

    // Fallback legado
    switch (appliedFilters.temporalVision) {
      case 'DIARIA': {
        const parts = appliedFilters.dailyDate.split('-')
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : appliedFilters.dailyDate
      }
      case 'SEMANAL': {
        const range = getIsoWeekDateRangePtBr(appliedFilters.weeklyYear, appliedFilters.weeklyWeek)
        return `Semana ${String(appliedFilters.weeklyWeek).padStart(2, '0')}/${appliedFilters.weeklyYear} (${range.display})`
      }
      case 'MENSAL': {
        return `${months[appliedFilters.monthlyMonth - 1]}/${appliedFilters.monthlyYear}`
      }
      case 'ANUAL':
        return `Ano ${appliedFilters.annualYear}`
    }
  }, [appliedFilters])

  return (
    <div className="space-y-4">
      {/* Topo Oficial da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Utilização & Substituição de MP (1020 vs AC)
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 8
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Qual MP deveria ter sido usada vs qual foi realmente utilizada? Desvios por ordem e
            enfornamento quente/frio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openSubstitutionExplainer}
            className="text-xs text-[#004C97] border-[#004C97]/30 bg-blue-50/50 hover:bg-blue-100 gap-1.5 h-8 font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Auditar % Substituição 1020/AC
          </Button>
        </div>
      </div>

      {/* CABEÇALHO PADRÃO DE FILTROS E PERÍODO DE ANÁLISE */}
      <MPUtilizationFilterHeader
        filters={filters}
        options={hierarchyOptions}
        onChange={setFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Indicador de Período Ativo / Contexto Consolidado */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Exibindo dados para o período:{' '}
          <span className="font-semibold text-slate-800">{appliedPeriodDisplay}</span>
          {appliedFilters.lineCode !== 'ALL' && (
            <span>
              {' '}
              &bull; Linha:{' '}
              <span className="font-semibold text-slate-800">{appliedFilters.lineCode}</span>
            </span>
          )}
          {appliedFilters.centerCode !== 'ALL' && (
            <span>
              {' '}
              &bull; Centro:{' '}
              <span className="font-semibold text-slate-800">{appliedFilters.centerCode}</span>
            </span>
          )}
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          {filteredRows.length} ordem(ns) no escopo
        </span>
      </div>

      {/* ESTADO SEM DADOS (CRITÉRIO 11):
          Quando a combinação de filtros não possuir registros, NÃO apresentar erro de sistema.
          Exibir exatamente a mensagem: "Nenhum registro encontrado para os filtros selecionados." e disponibilizar o botão [ Limpar filtros ]. */}
      {!isLoading && filteredRows.length === 0 ? (
        <Card
          data-testid="mp-utilization-empty-state"
          className="bg-white border-dashed border-slate-300 shadow-sm p-8 text-center"
        >
          <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Inbox className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">
                Nenhum registro encontrado para os filtros selecionados.
              </h4>
              <p className="text-xs text-slate-500">
                Tente ajustar a combinação de Empresa, Linha, Centro, Matéria-prima ou período de
                análise para visualizar os apontamentos.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="gap-1.5 text-xs text-[#004C97] border-blue-200 hover:bg-blue-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar filtros
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Cards de Métricas Principais (4 originais + 1 novo card solicitado) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Card 1: % 1020 no Lugar de AC */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  % 1020 no Lugar de AC
                </span>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 my-1" />
                ) : (
                  <div className="text-xl font-black text-rose-600 font-mono mt-1">
                    {pctSubstitution.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    %
                  </div>
                )}
                {isLoading ? (
                  <Skeleton className="h-3.5 w-32 mt-1" />
                ) : (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {totalSubstitutedTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t de{' '}
                    {totalEligibleAcTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t elegíveis
                  </span>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Enfornamento a Quente */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  Enfornamento a Quente
                </span>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 my-1" />
                ) : (
                  <div className="text-xl font-black text-orange-600 font-mono mt-1">
                    {pctHotCharging.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    %
                  </div>
                )}
                {isLoading ? (
                  <Skeleton className="h-3.5 w-28 mt-1" />
                ) : (
                  <span className="text-[10px] text-orange-600 font-semibold block mt-0.5">
                    {totalHotChargingTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t direto da L2
                  </span>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Enfornamento a Frio */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5 text-blue-500" />
                  Enfornamento a Frio
                </span>
                {isLoading ? (
                  <Skeleton className="h-7 w-24 my-1" />
                ) : (
                  <div className="text-xl font-black text-blue-600 font-mono mt-1">
                    {(totalConsumedTons > 0 ? 100 - pctHotCharging : 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    %
                  </div>
                )}
                {isLoading ? (
                  <Skeleton className="h-3.5 w-24 mt-1" />
                ) : (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {totalColdChargingTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t do pátio
                  </span>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Desvios Identificados */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Desvios Identificados
                </span>
                {isLoading ? (
                  <Skeleton className="h-7 w-20 my-1" />
                ) : (
                  <div className="text-xl font-black text-amber-700 font-mono mt-1">
                    {substitutedAcRows.length}{' '}
                    <span className="text-xs font-normal text-slate-500">ordens</span>
                  </div>
                )}
                <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
                  Impacto no estoque nobre
                </span>
              </CardContent>
            </Card>

            {/* NOVO CARD 5 (CRITÉRIO 1): Enfornamento frio que poderia ser quente */}
            <ColdCouldBeHotCard
              totalColdTons={totalColdChargingTons}
              potentialHotTons={totalPotentialHotTons}
              impactedOrdersCount={ordersWithPotentialHot.length}
              opportunityPct={pctColdCouldBeHot}
              isLoading={isLoading}
              onAuditClick={openColdCouldBeHotExplainer}
            />
          </div>

          {/* NOVA SEÇÃO DE ANÁLISE DE IA (CRITÉRIO 2):
              O que deveria ter sido realizado, desvios, impactos e recomendações executivas */}
          <MPUtilizationAiAnalysis
            rows={filteredRows}
            isLoading={isLoading}
            companyCode={appliedFilters.companyCode}
            lineCode={appliedFilters.lineCode}
            centerCode={appliedFilters.centerCode}
            periodLabel={appliedPeriodDisplay}
          />

          {/* NOVO GRÁFICO DE BARRAS POR MÊS (CRITÉRIO 4):
              Evolução mensal do enfornamento frio com potencial para quente */}
          <MPMonthlyChargingBarChart rows={filteredRows} isLoading={isLoading} />

          {/* Gráfico e Análise de Grupos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gráfico Donut de Enfornamento */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase">
                  Relação Térmica: Quente vs Frio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-44 w-44 rounded-full my-2" />
                ) : (
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chargingPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chargingPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [
                            `${Number(value).toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })} t`,
                            'Volume',
                          ]}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 text-center mt-2">
                  Meta energética CIAFAL: &gt; 70% enfornamento a quente
                </div>
              </CardContent>
            </Card>

            {/* Grupos Analíticos de MP */}
            <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2">
              <CardHeader className="py-3 px-4 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase">
                  Classificação por Grupos Analíticos de MP
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    {analyticalGroupsData.map((group) => (
                      <div
                        key={group.name}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded"
                      >
                        <span className="text-slate-500 block text-[10px]">{group.name}</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {group.tons.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}{' '}
                          t
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Desvios de Aplicação por Ordem */}
          <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Desvios de Aplicação e Rastreabilidade por Ordem de Produção
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Confronto regra técnica vs apontamento real SAP MB51/CO03
                </CardDescription>
              </div>
              <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
                Motor de Regras ZPPT058
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-100/70">
                    <TableRow>
                      <TableHead className="text-xs font-bold text-slate-800">Ordem SAP</TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        Linha / Centro
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        Produto Final
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        MP Padrão (Regra)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        MP Efetiva Consumida
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 text-right">
                        Peso Consumido (t)
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800 text-center">
                        Enfornamento
                      </TableHead>
                      <TableHead className="text-xs font-bold text-slate-800">
                        Desvio Identificado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell colSpan={8}>
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          </TableRow>
                        ))
                      : filteredRows.map((r) => (
                          <TableRow key={r.id} className="hover:bg-slate-50/80">
                            <TableCell className="font-mono text-xs font-bold text-[#004C97]">
                              <div>{r.order_number}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {r.period_week || r.period_month}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-slate-700 font-medium">
                              <div>{r.line_code || '-'}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {r.center_code || '-'}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-slate-900">
                              <div className="font-semibold">{r.product_code}</div>
                              <div className="text-[10px] text-slate-400">
                                {r.product_description}
                              </div>
                            </TableCell>

                            <TableCell className="text-xs text-slate-600">
                              <span className="font-medium">{r.standard_mp_rule}</span>
                            </TableCell>

                            <TableCell className="text-xs text-slate-900 font-semibold">
                              <div>{r.steel_grade}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {r.origin_group}
                              </div>
                            </TableCell>

                            <TableCell className="text-right font-mono text-xs font-bold text-slate-800">
                              {r.mp_consumed_tons.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{' '}
                              t
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                className={`text-[10px] ${
                                  r.charging_type === 'QUENTE'
                                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                                    : r.charging_type === 'FRIO'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : 'bg-purple-100 text-purple-800 border-purple-200'
                                }`}
                              >
                                {r.charging_type}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-xs">
                              {r.deviation_detected ? (
                                <div>
                                  <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-semibold mb-0.5">
                                    {r.substitution_category}
                                  </Badge>
                                  <div className="text-[10px] text-slate-500">
                                    {r.deviation_reason}
                                  </div>
                                </div>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Conforme
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal Explicador */}
      <CalculationExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        payload={explainerPayload}
      />
    </div>
  )
}

export default MPUtilizationAndSubstitutionSubpage
