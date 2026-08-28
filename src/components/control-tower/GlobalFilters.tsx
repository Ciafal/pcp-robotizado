import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { X, Search, AlertTriangle, Clock, AlertOctagon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const GlobalFilters: React.FC = () => {
  const { filters, setFilters, resetFilters } = useControlTower()

  const handlePeriodChange = (p: typeof filters.period) => {
    setFilters((prev) => ({ ...prev, period: p }))
  }

  const handleLineChange = (line: string) => {
    setFilters((prev) => ({ ...prev, lineCode: line }))
  }

  const handleFamilyChange = (fam: string) => {
    setFilters((prev) => ({ ...prev, familyCode: fam }))
  }

  const toggleQuickFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const activeQuickFiltersCount = [
    filters.quickFilterOnlyBottlenecks,
    filters.quickFilterOnlyDelays,
    filters.quickFilterOnlyConflicts,
    filters.quickFilterOnlyRisks,
    filters.quickFilterOnlyChanges,
    filters.quickFilterOnlyOrdersAtRisk,
  ].filter(Boolean).length

  return (
    <div className="bg-slate-950 border-b border-slate-850 p-3 space-y-2.5 text-xs text-slate-300">
      {/* Top Filter Bar: Period, Selectors and Search */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Período */}
          <div className="inline-flex bg-slate-900 border border-slate-800 rounded-md p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => handlePeriodChange('HOJE')}
              className={`px-2 py-1 rounded font-medium ${
                filters.period === 'HOJE'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('AMANHA')}
              className={`px-2 py-1 rounded font-medium ${
                filters.period === 'AMANHA'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Amanhã
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('SEMANA')}
              className={`px-2 py-1 rounded font-medium ${
                filters.period === 'SEMANA'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('7_DIAS')}
              className={`px-2 py-1 rounded font-medium ${
                filters.period === '7_DIAS'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7 dias
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('15_DIAS')}
              className={`px-2 py-1 rounded font-medium ${
                filters.period === '15_DIAS'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              15 dias
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('MES')}
              className={`px-2 py-1 rounded font-medium ${
                filters.period === 'MES'
                  ? 'bg-[#004C97] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês
            </button>
          </div>

          {/* Seletor de Linha */}
          <select
            value={filters.lineCode}
            onChange={(e) => handleLineChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md text-slate-200 px-2.5 py-1 text-xs outline-none focus:border-[#004C97]"
          >
            <option value="ALL">Todas as Linhas</option>
            <option value="L1">L1 - Laminação & Conformação</option>
            <option value="ENF_L1">ENF_L1 - Enfornamento</option>
            <option value="ACAB_L1">ACAB_L1 - Acabamento L1</option>
            <option value="L2">L2 - Perfis & Estruturais</option>
            <option value="ACAB_L2">ACAB_L2 - Acabamento L2</option>
            <option value="ENDIR">ENDIR - Endireitadeira</option>
            <option value="RETRAB">RETRAB - Retrabalho</option>
          </select>

          {/* Seletor de Família */}
          <select
            value={filters.familyCode}
            onChange={(e) => handleFamilyChange(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-md text-slate-200 px-2.5 py-1 text-xs outline-none focus:border-[#004C97]"
          >
            <option value="ALL">Todas as Famílias</option>
            <option value="TUB_QUAD">Tubos Quadrados</option>
            <option value="TUB_RET">Tubos Retangulares</option>
            <option value="TUB_RED">Tubos Redondos</option>
            <option value="PERF_U">Perfis U</option>
            <option value="BAR_CHATA">Barras Chatas</option>
          </select>
        </div>

        {/* Busca por OP / Material / Cliente */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <Input
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Buscar OP, cliente, material..."
            className="bg-slate-900 border-slate-800 text-slate-200 text-xs pl-8 h-8 rounded-md"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-2 top-2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters Pill Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-900">
        <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mr-1">
          Filtros Rápidos:
        </span>

        {/* Somente Gargalos */}
        <button
          type="button"
          onClick={() => toggleQuickFilter('quickFilterOnlyBottlenecks')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all flex items-center gap-1 ${
            filters.quickFilterOnlyBottlenecks
              ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon className="w-3 h-3 text-rose-400" />
          Somente gargalos
        </button>

        {/* Somente Atrasos */}
        <button
          type="button"
          onClick={() => toggleQuickFilter('quickFilterOnlyDelays')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all flex items-center gap-1 ${
            filters.quickFilterOnlyDelays
              ? 'bg-amber-950/80 border-amber-700 text-amber-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3 h-3 text-amber-400" />
          Somente atrasos
        </button>

        {/* Somente Conflitos */}
        <button
          type="button"
          onClick={() => toggleQuickFilter('quickFilterOnlyConflicts')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all flex items-center gap-1 ${
            filters.quickFilterOnlyConflicts
              ? 'bg-purple-950/80 border-purple-700 text-purple-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-purple-400" />
          Somente conflitos
        </button>

        {/* Somente Pedidos em Risco */}
        <button
          type="button"
          onClick={() => toggleQuickFilter('quickFilterOnlyOrdersAtRisk')}
          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all flex items-center gap-1 ${
            filters.quickFilterOnlyOrdersAtRisk
              ? 'bg-orange-950/80 border-orange-700 text-orange-300 font-bold'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-orange-400" />
          Somente pedidos em risco
        </button>

        {/* Limpar Filtros */}
        {(activeQuickFiltersCount > 0 ||
          filters.lineCode !== 'ALL' ||
          filters.familyCode !== 'ALL' ||
          filters.searchQuery) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-6 px-2 text-[11px] text-slate-400 hover:text-rose-400 hover:bg-slate-900 ml-auto gap-1"
          >
            <X className="w-3 h-3" /> Limpar filtros
          </Button>
        )}
      </div>
    </div>
  )
}
