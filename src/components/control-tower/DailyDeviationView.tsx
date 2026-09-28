/**
 * Componente Principal da VISÃO DIÁRIA de Análise de Desvios
 * CIAFAL HUB Industrial - PCP Robotizado
 *
 * Itens Obrigatórios:
 * - Filtros: Centro SAP / Planta, Linha PCP, Data (com atalhos Dia Anterior, Hoje, Próximo Dia, específica),
 *   Turno, Ordem de Produção, Produto/Material, Natureza/Tipo, Status. Formato dd/mm/aaaa.
 * - Hierarquia: DIA -> TURNO -> ORDEM DE PRODUÇÃO -> MATERIAL
 * - Resumo do Dia (Cards sintéticos com reação aos filtros)
 * - Consolidação por Turno (1º Turno, 2º Turno, 3º Turno com clique para filtrar)
 * - Grade Principal Responsiva com todas as colunas mínimas obrigatórias
 * - Detalhamento via Modal/Drawer
 * - Padrão PT-BR: dd/mm/aaaa, decimais com vírgula, milhar com ponto, t, t/h, % com espaço
 * - Estados obrigatórios: skeleton/loading, vazio com texto estrito, erro com texto estrito.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar as CalendarIcon,
  Filter,
  Search,
  RotateCcw,
  Layers,
  Clock,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Info,
  CalendarDays,
  Hash,
  Box,
  Activity,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DailyDeviationFilterParams,
  DailyDeviationItem,
  DailyShiftConsolidation,
  DailySummaryCardsData,
} from '@/types/daily-deviation'
import { dailyDeviationService } from '@/services/daily-deviation-service'
import { DailyDeviationDetailModal } from './DailyDeviationDetailModal'
import { formatNumberPTBR, formatDatePTBR } from '@/lib/formatters-ptbr'

interface DailyDeviationViewProps {
  initialPlant?: string
  initialLine?: string
  onPlantChange?: (plant: string) => void
  onLineChange?: (line: string) => void
}

export const DailyDeviationView: React.FC<DailyDeviationViewProps> = ({
  initialPlant = 'ALL',
  initialLine = 'ALL',
  onPlantChange,
  onLineChange,
}) => {
  // Filtros
  const [plantCode, setPlantCode] = useState<string>(initialPlant)
  const [lineCode, setLineCode] = useState<string>(initialLine)
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-24') // Data base de campanha existente
  const [datePreset, setDatePreset] = useState<'yesterday' | 'today' | 'tomorrow' | 'custom'>(
    'custom',
  )
  const [selectedShift, setSelectedShift] = useState<string>('ALL')
  const [productionOrderQuery, setProductionOrderQuery] = useState<string>('')
  const [materialQuery, setMaterialQuery] = useState<string>('')
  const [natureFilter, setNatureFilter] = useState<string>('TODAS')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Estado dos dados
  const [items, setItems] = useState<DailyDeviationItem[]>([])
  const [shifts, setShifts] = useState<DailyShiftConsolidation[]>([])
  const [summary, setSummary] = useState<DailySummaryCardsData | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Item selecionado para detalhamento
  const [detailItem, setDetailItem] = useState<DailyDeviationItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false)

  // Ordenação da tabela
  const [sortField, setSortField] = useState<keyof DailyDeviationItem>('sequence')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Carrega os dados do serviço
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const filterParams: DailyDeviationFilterParams = {
        plantCode: plantCode === 'ALL' ? undefined : plantCode,
        lineCode: lineCode === 'ALL' ? undefined : lineCode,
        date: selectedDate,
        datePreset,
        shift: selectedShift === 'ALL' ? undefined : selectedShift,
        productionOrder: productionOrderQuery || undefined,
        material: materialQuery || undefined,
        nature: natureFilter === 'TODAS' ? undefined : natureFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }

      const result = await dailyDeviationService.getDailyDeviationData(filterParams)
      setItems(result.items)
      setShifts(result.shifts)
      setSummary(result.summary)
      setAvailableDates(result.availableDates)

      if (
        result.selectedDateIso &&
        result.selectedDateIso !== selectedDate &&
        datePreset !== 'custom'
      ) {
        setSelectedDate(result.selectedDateIso)
      }
    } catch (err: any) {
      console.error('[DailyDeviationView] Erro ao carregar dados diários:', err)
      // Texto ESTRITO do requisito 17:
      setError('Não foi possível carregar os dados da Análise de Desvios. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [
    plantCode,
    lineCode,
    selectedDate,
    datePreset,
    selectedShift,
    productionOrderQuery,
    materialQuery,
    natureFilter,
    statusFilter,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Handlers de navegação de data rápida (Dia Anterior, Hoje, Próximo Dia)
  const handleDatePreset = (preset: 'yesterday' | 'today' | 'tomorrow') => {
    setDatePreset(preset)
    const base = new Date()
    if (preset === 'yesterday') {
      base.setDate(base.getDate() - 1)
    } else if (preset === 'tomorrow') {
      base.setDate(base.getDate() + 1)
    }
    const iso = base.toISOString().slice(0, 10)
    setSelectedDate(iso)
  }

  // Ao alterar a data específica manualmente (formato AAAA-MM-DD no input nativo ou dd/mm/aaaa)
  const handleCustomDateChange = (val: string) => {
    setDatePreset('custom')
    setSelectedDate(val)
  }

  // Handler de limpeza de filtros
  const handleResetFilters = () => {
    setPlantCode(initialPlant || 'ALL')
    setLineCode(initialLine || 'ALL')
    setSelectedShift('ALL')
    setProductionOrderQuery('')
    setMaterialQuery('')
    setNatureFilter('TODAS')
    setStatusFilter('ALL')
    setDatePreset('custom')
    if (availableDates.length > 0) {
      setSelectedDate(availableDates[0])
    }
  }

  // Filtro rápido ao clicar em um Turno da consolidação
  const handleShiftCardClick = (shiftDisplay: string) => {
    if (selectedShift === shiftDisplay) {
      setSelectedShift('ALL')
    } else {
      setSelectedShift(shiftDisplay)
    }
  }

  // Abertura do modal de detalhamento
  const handleRowClick = (item: DailyDeviationItem) => {
    setDetailItem(item)
    setDetailModalOpen(true)
  }

  // Ordenação da tabela
  const handleSort = (field: keyof DailyDeviationItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      let comp = 0
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comp = aVal.localeCompare(bVal, 'pt-BR')
      } else {
        comp = (aVal as any) < (bVal as any) ? -1 : 1
      }
      return sortDirection === 'asc' ? comp : -comp
    })
  }, [items, sortField, sortDirection])

  // Helper visual para situação com ícone + texto (Requisito 7: não usar apenas cor)
  const renderSituationTag = (situation: string, statusDisplay: string) => {
    switch (situation) {
      case 'DENTRO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>{statusDisplay}</span>
          </span>
        )
      case 'ABAIXO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
            <TrendingDown className="w-3 h-3 text-rose-600 shrink-0" />
            <span>{statusDisplay}</span>
          </span>
        )
      case 'ACIMA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
            <TrendingUp className="w-3 h-3 text-blue-600 shrink-0" />
            <span>{statusDisplay}</span>
          </span>
        )
      case 'PARADA':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3 text-purple-600 shrink-0" />
            <span>{statusDisplay}</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{statusDisplay}</span>
          </span>
        )
    }
  }

  return (
    <div className="space-y-4 w-full">
      {/* 1. BARRA DE FILTROS DA VISÃO DIÁRIA */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#004C97]" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filtros Operacionais &bull; Visão Diária
            </h2>
            <Badge
              variant="outline"
              className="text-[10px] bg-white border-blue-200 text-[#004C97]"
            >
              dd/mm/aaaa
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpar Filtros</span>
            </Button>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Linha 1: Centro SAP, Linha PCP, Atalhos de Data e Data Específica */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Centro SAP / Planta */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Centro SAP / Planta
              </label>
              <Select
                value={plantCode}
                onValueChange={(val) => {
                  setPlantCode(val)
                  if (onPlantChange) onPlantChange(val)
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Centro SAP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Centros</SelectItem>
                  <SelectItem value="1000">1000 &bull; Divinópolis</SelectItem>
                  <SelectItem value="2000">2000 &bull; Contagem</SelectItem>
                  <SelectItem value="PLANTA_1">PLANTA_1 &bull; Divinópolis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha PCP */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Linha PCP</label>
              <Select
                value={lineCode}
                onValueChange={(val) => {
                  setLineCode(val)
                  if (onLineChange) onLineChange(val)
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Linha PCP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Linhas</SelectItem>
                  <SelectItem value="L1">L1 &bull; Laminação 1</SelectItem>
                  <SelectItem value="L2">L2 &bull; Laminação 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Atalhos Rápidos de Data (Dia Anterior, Hoje, Próximo Dia) */}
            <div className="lg:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Atalhos Rápidos de Data
              </label>
              <div className="flex items-center gap-1.5 h-8">
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === 'yesterday' ? 'default' : 'outline'}
                  onClick={() => handleDatePreset('yesterday')}
                  className={`h-8 text-xs flex-1 px-2 ${
                    datePreset === 'yesterday'
                      ? 'bg-[#004C97] text-white hover:bg-[#003870]'
                      : 'border-slate-200'
                  }`}
                >
                  Dia Anterior
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === 'today' ? 'default' : 'outline'}
                  onClick={() => handleDatePreset('today')}
                  className={`h-8 text-xs flex-1 px-2 ${
                    datePreset === 'today'
                      ? 'bg-[#004C97] text-white hover:bg-[#003870]'
                      : 'border-slate-200'
                  }`}
                >
                  Dia Atual
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={datePreset === 'tomorrow' ? 'default' : 'outline'}
                  onClick={() => handleDatePreset('tomorrow')}
                  className={`h-8 text-xs flex-1 px-2 ${
                    datePreset === 'tomorrow'
                      ? 'bg-[#004C97] text-white hover:bg-[#003870]'
                      : 'border-slate-200'
                  }`}
                >
                  Próximo Dia
                </Button>
              </div>
            </div>

            {/* Data Específica dd/mm/aaaa */}
            <div className="lg:col-span-4 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Data Específica</span>
                <span className="text-[10px] text-blue-700 font-normal">
                  Atual: {formatDatePTBR(selectedDate)}
                </span>
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <CalendarIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="h-8 pl-8 text-xs font-mono bg-slate-50 border-slate-200"
                  />
                </div>
                {availableDates.length > 0 && (
                  <Select value={selectedDate} onValueChange={(val) => handleCustomDateChange(val)}>
                    <SelectTrigger className="h-8 w-28 text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Base..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDates.map((d) => (
                        <SelectItem key={d} value={d}>
                          {formatDatePTBR(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          {/* Linha 2: Turno, Ordem de Produção, Material, Natureza e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
            {/* Turno */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Turno</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Turnos</SelectItem>
                  <SelectItem value="1º Turno">1º Turno</SelectItem>
                  <SelectItem value="2º Turno">2º Turno</SelectItem>
                  <SelectItem value="3º Turno">3º Turno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordem de Produção */}
            <div className="lg:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Ordem de Produção (OP)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Filtrar por OP..."
                  value={productionOrderQuery}
                  onChange={(e) => setProductionOrderQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 font-mono"
                />
              </div>
            </div>

            {/* Produto / Material */}
            <div className="lg:col-span-3 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Produto / Material
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Código ou descrição..."
                  value={materialQuery}
                  onChange={(e) => setMaterialQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
                />
              </div>
            </div>

            {/* Natureza / Tipo */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Natureza</label>
              <Select value={natureFilter} onValueChange={setNatureFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Natureza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as Naturezas</SelectItem>
                  <SelectItem value="PRODUCAO_PROPRIA">Produção Própria</SelectItem>
                  <SelectItem value="INDUSTRIALIZACAO">Industrialização</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status / Situação */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">
                Status / Situação
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Status</SelectItem>
                  <SelectItem value="DENTRO">Dentro da programação</SelectItem>
                  <SelectItem value="ABAIXO">Abaixo da programação</SelectItem>
                  <SelectItem value="ACIMA">Acima da programação</SelectItem>
                  <SelectItem value="NAO_INICIADO">Não iniciado</SelectItem>
                  <SelectItem value="PARADA">Parada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESTADO DE ERRO (Requisito 17) */}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <Button
            size="sm"
            onClick={loadData}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 h-8 font-semibold"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* ESTADO DE CARREGANDO / SKELETON (Requisito 17) */}
      {loading && !error && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl bg-slate-200" />
            ))}
          </div>
          <Skeleton className="h-32 w-full rounded-xl bg-slate-200" />
          <Skeleton className="h-64 w-full rounded-xl bg-slate-200" />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 8. RESUMO DO DIA (Cards Sintéticos que respondem aos filtros) */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Card 1: Volume Programado */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Volume Programado
                  </span>
                  <CalendarDays className="w-4 h-4 text-[#004C97]" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {formatNumberPTBR(summary.totalPlannedTons, 1)} t
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {formatNumberPTBR(summary.totalPlannedHours, 1)} h planejadas
                  </span>
                </div>
              </div>

              {/* Card 2: Volume Realizado */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Volume Realizado
                  </span>
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-lg font-black text-emerald-800 font-mono">
                    {summary.totalRealizedTons !== null
                      ? `${formatNumberPTBR(summary.totalRealizedTons, 1)} t`
                      : 'Dado ainda não disponível'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {summary.totalRealizedHours !== null
                      ? `${formatNumberPTBR(summary.totalRealizedHours, 1)} h apontadas`
                      : 'Aguardando MES'}
                  </span>
                </div>
              </div>

              {/* Card 3: Desvio em Toneladas */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Desvio (t)</span>
                  {summary.deviationTons !== null && summary.deviationTons < 0 ? (
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <div
                    className={`text-lg font-black font-mono ${
                      summary.deviationTons === null
                        ? 'text-slate-400 text-xs'
                        : summary.deviationTons < 0
                          ? 'text-rose-600'
                          : summary.deviationTons > 0
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                    }`}
                  >
                    {summary.deviationTons !== null
                      ? `${summary.deviationTons > 0 ? '+' : ''}${formatNumberPTBR(summary.deviationTons, 1)} t`
                      : 'Dado ainda não disponível'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Realizado &minus; Programado
                  </span>
                </div>
              </div>

              {/* Card 4: Desvio Percentual */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Desvio (%)</span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">%</span>
                </div>
                <div>
                  <div
                    className={`text-lg font-black font-mono ${
                      summary.deviationPct === null
                        ? 'text-slate-400 text-xs'
                        : summary.deviationPct < 0
                          ? 'text-rose-600'
                          : summary.deviationPct > 0
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                    }`}
                  >
                    {summary.deviationPct !== null
                      ? `${summary.deviationPct > 0 ? '+' : ''}${formatNumberPTBR(summary.deviationPct, 1)} %`
                      : 'Dado ainda não disponível'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">Base programada</span>
                </div>
              </div>

              {/* Card 5: OPs e Materiais */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Ordens &bull; Materiais
                  </span>
                  <Hash className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 font-mono">
                    {summary.ordersCount} OPs / {summary.materialsCount} Mat.
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {summary.producingShiftsCount} turno(s) com produção
                  </span>
                </div>
              </div>

              {/* Card 6: Principais Desvios */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Principais Desvios
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  {summary.mainDeviations.length > 0 ? (
                    <div className="space-y-0.5">
                      {summary.mainDeviations.slice(0, 2).map((dev, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px]">
                          <span
                            className="truncate max-w-[85px] font-medium text-slate-700"
                            title={dev.material}
                          >
                            {dev.op !== 'OP não disponível' ? dev.op : dev.material}
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              dev.deviationTons < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {dev.deviationTons > 0 ? '+' : ''}
                            {formatNumberPTBR(dev.deviationTons, 1)} t
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Sem desvios expressivos</span>
                  )}
                  <span className="text-[9px] text-slate-400 block mt-0.5">Impacto do dia</span>
                </div>
              </div>
            </div>
          )}

          {/* 9. CONSOLIDAÇÃO POR TURNO (1º Turno, 2º Turno, 3º Turno) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#004C97]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Consolidação por Turno
                </h3>
                <span className="text-[11px] text-slate-500">
                  (Clique em um turno para filtrar a grade; clique novamente para ver todos)
                </span>
              </div>
              {selectedShift !== 'ALL' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedShift('ALL')}
                  className="h-6 text-[10px] text-[#004C97] border-[#004C97]/30 hover:bg-blue-50"
                >
                  Voltar para Todos os Turnos
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {shifts.map((s) => {
                const isSelected = selectedShift === s.shiftDisplay
                return (
                  <div
                    key={s.shiftCode}
                    onClick={() => handleShiftCardClick(s.shiftDisplay)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all duration-150 ${
                      isSelected
                        ? 'border-[#004C97] bg-blue-50/50 shadow-sm ring-1 ring-[#004C97]'
                        : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{s.shiftDisplay}</span>
                        {isSelected && (
                          <Badge className="bg-[#004C97] text-white text-[9px] py-0 px-1">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {s.ordersCount} OP(s) &bull; {s.materialsCount} Mat.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">
                          Programado
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatNumberPTBR(s.plannedTons, 1)} t
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">
                          Realizado
                        </span>
                        <span className="font-mono font-bold text-emerald-800">
                          {s.realizedTons !== null
                            ? `${formatNumberPTBR(s.realizedTons, 1)} t`
                            : 'Não disponível'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">
                          Desvio (t)
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            s.deviationTons === null
                              ? 'text-slate-400'
                              : s.deviationTons < 0
                                ? 'text-rose-600'
                                : s.deviationTons > 0
                                  ? 'text-emerald-700'
                                  : 'text-slate-800'
                          }`}
                        >
                          {s.deviationTons !== null
                            ? `${s.deviationTons > 0 ? '+' : ''}${formatNumberPTBR(s.deviationTons, 1)} t`
                            : 'Não disponível'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-medium">
                          Desvio (%)
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            s.deviationPct === null
                              ? 'text-slate-400'
                              : s.deviationPct < 0
                                ? 'text-rose-600'
                                : s.deviationPct > 0
                                  ? 'text-emerald-700'
                                  : 'text-slate-800'
                          }`}
                        >
                          {s.deviationPct !== null
                            ? `${s.deviationPct > 0 ? '+' : ''}${formatNumberPTBR(s.deviationPct, 1)} %`
                            : 'Não disponível'}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 4. GRADE PRINCIPAL - VISÃO DIÁRIA */}
          <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/40 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#004C97]" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Programação Diária x Execução Real (MES)
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-white border-slate-200 text-slate-700 font-mono"
                >
                  {items.length} registro(s)
                </Badge>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Hierarquia: Data &rarr; Turno &rarr; Ordem de Produção &rarr; Material
              </span>
            </div>

            {/* ESTADO VAZIO (Requisito 17: texto estrito) */}
            {items.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Box className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma programação encontrada para os filtros selecionados.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Ajuste os filtros de Centro, Linha, Data ou Turno para visualizar a programação.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="mt-4 text-xs text-[#004C97] border-blue-200 hover:bg-blue-50"
                >
                  Restaurar Filtros Padrão
                </Button>
              </div>
            ) : (
              /* TABELA RESPONSIVA (Requisito 13: rolagem horizontal APENAS dentro da tabela) */
              <div className="w-full overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                        onClick={() => handleSort('sequence')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Seq.</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th
                        className="py-2.5 px-3 cursor-pointer hover:bg-slate-200/60"
                        onClick={() => handleSort('dateDisplay')}
                      >
                        <div className="flex items-center gap-1">
                          <span>Data</span>
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </th>
                      <th className="py-2.5 px-3">Dia Semana</th>
                      <th className="py-2.5 px-3">Turno</th>
                      <th className="py-2.5 px-3">Turma</th>
                      {/* COLUNA OBRIGATÓRIA ORDEM DE PRODUÇÃO (Requisito 4 e 5) */}
                      <th className="py-2.5 px-3 bg-blue-50/70 border-x border-blue-200 text-[#004C97]">
                        ORDEM DE PRODUÇÃO
                      </th>
                      <th className="py-2.5 px-3">Cód. Material</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Produto / Material</th>
                      <th className="py-2.5 px-3 text-right">Vol. Prog. (t)</th>
                      <th className="py-2.5 px-3 text-right">Vol. Real (t)</th>
                      <th className="py-2.5 px-3 text-right">Desvio (t)</th>
                      <th className="py-2.5 px-3 text-right">Desvio (%)</th>
                      <th className="py-2.5 px-3 text-right">Cad. Plan (t/h)</th>
                      <th className="py-2.5 px-3 text-right">Cad. Real (t/h)</th>
                      <th className="py-2.5 px-3 text-right">Horas Prog.</th>
                      <th className="py-2.5 px-3 text-right">Horas Real.</th>
                      <th className="py-2.5 px-2 text-center">Início Prog.</th>
                      <th className="py-2.5 px-2 text-center">Fim Prog.</th>
                      <th className="py-2.5 px-2 text-center">Início Real</th>
                      <th className="py-2.5 px-2 text-center">Fim Real</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-2 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                          #{item.sequence}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {item.dateDisplay}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {item.dayOfWeekShort}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.shiftDisplay}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {item.crewName}
                        </td>

                        {/* COLUNA OBRIGATÓRIA ORDEM DE PRODUÇÃO */}
                        <td className="py-2.5 px-3 bg-blue-50/40 border-x border-blue-100 whitespace-nowrap">
                          {item.hasRealProductionOrder ? (
                            <span className="font-mono font-bold text-[#004C97] text-xs bg-white px-2 py-0.5 rounded border border-blue-200 inline-block shadow-2xs">
                              {item.productionOrder}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              {item.productionOrder}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {item.materialCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">
                          <div>
                            <span className="block font-semibold">{item.materialDescription}</span>
                            {item.steelGrade && (
                              <span className="text-[10px] text-slate-500">
                                {item.steelGrade}{' '}
                                {item.dimensions ? `&bull; ${item.dimensions}` : ''}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Vol. Programado (t) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatNumberPTBR(item.plannedVolumeTons, 1)} t
                        </td>

                        {/* Vol. Realizado (t) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                          {item.realizedVolumeTons !== null ? (
                            `${formatNumberPTBR(item.realizedVolumeTons, 1)} t`
                          ) : (
                            <span
                              className="text-slate-400 font-normal italic text-[11px]"
                              title="Dado ainda não disponível pela integração"
                            >
                              Não disp.
                            </span>
                          )}
                        </td>

                        {/* Desvio (t) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {item.deviationTons !== null ? (
                            <span
                              className={
                                item.deviationTons < 0
                                  ? 'text-rose-600'
                                  : item.deviationTons > 0
                                    ? 'text-emerald-700'
                                    : 'text-slate-700'
                              }
                            >
                              {item.deviationTons > 0 ? '+' : ''}
                              {formatNumberPTBR(item.deviationTons, 1)} t
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic text-[11px]">
                              Não disp.
                            </span>
                          )}
                        </td>

                        {/* Desvio (%) */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {item.deviationPct !== null ? (
                            <span
                              className={
                                item.deviationPct < 0
                                  ? 'text-rose-600'
                                  : item.deviationPct > 0
                                    ? 'text-emerald-700'
                                    : 'text-slate-700'
                              }
                            >
                              {item.deviationPct > 0 ? '+' : ''}
                              {formatNumberPTBR(item.deviationPct, 1)} %
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal italic text-[11px]">
                              Não disp.
                            </span>
                          )}
                        </td>

                        {/* Cadência Planejada (t/h) */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatNumberPTBR(item.plannedRateTh, 1)} t/h
                        </td>

                        {/* Cadência Real (t/h) */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {item.realizedRateTh !== null ? (
                            `${formatNumberPTBR(item.realizedRateTh, 1)} t/h`
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Não disp.</span>
                          )}
                        </td>

                        {/* Horas Programadas */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatNumberPTBR(item.plannedHours, 2)} h
                        </td>

                        {/* Horas Realizadas */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {item.realizedHours !== null ? (
                            `${formatNumberPTBR(item.realizedHours, 2)} h`
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Não disp.</span>
                          )}
                        </td>

                        {/* Início / Fim Programados */}
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                          {item.plannedStart || '--:--'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                          {item.plannedEnd || '--:--'}
                        </td>

                        {/* Início / Fim Reais */}
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                          {item.realStart || (
                            <span className="text-slate-400 italic text-[10px]">Não disp.</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 whitespace-nowrap">
                          {item.realEnd || (
                            <span className="text-slate-400 italic text-[10px]">Não disp.</span>
                          )}
                        </td>

                        {/* Status / Situação (Acessível: texto + ícone) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {renderSituationTag(item.situation, item.statusDisplay)}
                        </td>

                        {/* Ações / Detalhe */}
                        <td className="py-2.5 px-2 text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-[#004C97]"
                            title="Ver Detalhamento Completo"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {/* 10. MODAL / DRAWER DE DETALHAMENTO */}
      <DailyDeviationDetailModal
        item={detailItem}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setDetailItem(null)
        }}
      />
    </div>
  )
}
export default DailyDeviationView
