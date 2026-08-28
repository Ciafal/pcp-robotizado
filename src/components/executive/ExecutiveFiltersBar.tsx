import React, { useState } from 'react'
import { ExecutiveFilterState, PeriodFilterShortcut } from '@/types/executive-cockpit'
import { ProductionLine } from '@/types/pcp-auth'
import { Filter, Calendar, Building2, Layers, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ExecutiveFiltersBarProps {
  filters: ExecutiveFilterState
  lines: ProductionLine[]
  onChange: (newFilters: ExecutiveFilterState) => void
  onReset: () => void
}

const PERIOD_SHORTCUTS: { key: PeriodFilterShortcut; label: string }[] = [
  { key: 'HOJE', label: 'Hoje' },
  { key: 'SEMANA', label: 'Semana' },
  { key: 'MES', label: 'Mês' },
  { key: 'YTD', label: 'YTD' },
  { key: 'ANO', label: 'Ano' },
  { key: 'HISTORICO_PERSONALIZADO', label: 'Histórico' },
]

export const ExecutiveFiltersBar: React.FC<ExecutiveFiltersBarProps> = ({
  filters,
  lines,
  onChange,
  onReset,
}) => {
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)

  const handleShortcutClick = (shortcut: PeriodFilterShortcut) => {
    onChange({ ...filters, period: shortcut })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
      {/* Linha 1: Atalhos de Período + Seletor de Linha Rápido */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-2">
            <Calendar className="w-4 h-4 text-[#004C97]" />
            <span>Período:</span>
          </div>

          <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200">
            {PERIOD_SHORTCUTS.map((s) => {
              const active = filters.period === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleShortcutClick(s.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    active
                      ? 'bg-[#004C97] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtro Rápido de Linha & Botão Avançado */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Linha:</span>
            <select
              value={filters.line}
              onChange={(e) => onChange({ ...filters, line: e.target.value })}
              className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer text-xs"
            >
              <option value="ALL">Todas as Linhas do Escopo</option>
              {lines.map((l) => (
                <option key={l.id} value={l.code}>
                  {l.code} - {l.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 gap-1"
          >
            <Filter className="w-3.5 h-3.5 text-[#004C97]" />
            {showAdvanced ? 'Menos Filtros' : 'Filtros Estruturais'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs h-8 text-slate-500 hover:text-slate-800"
            title="Redefinir filtros"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Linha 2 (Opcional): Filtros Estruturais Corporativos */}
      {showAdvanced && (
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Empresa</label>
            <select
              value={filters.company}
              onChange={(e) => onChange({ ...filters, company: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
            >
              <option value="ALL">CIAFAL Wilson Santos</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Unidade / Planta
            </label>
            <select
              value={filters.plant}
              onChange={(e) => onChange({ ...filters, plant: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
            >
              <option value="ALL">Todas as Plantas</option>
              <option value="DIVINOPOLIS">Planta Divinópolis</option>
              <option value="CONTAGEM">Planta Contagem</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Processo / Setor
            </label>
            <select
              value={filters.process}
              onChange={(e) => onChange({ ...filters, process: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
            >
              <option value="ALL">Todos os Processos</option>
              <option value="LAMINACAO">Laminação a Quente</option>
              <option value="TREFILACAO">Trefilação a Frio</option>
              <option value="CORTE_DOBRA">Corte e Dobra</option>
              <option value="TRATAMENTO">Tratamento Térmico</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Família de Produto
            </label>
            <select
              value={filters.family}
              onChange={(e) => onChange({ ...filters, family: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
            >
              <option value="ALL">Todas as Famílias</option>
              <option value="VERGALHAO_CA50">Vergalhões CA-50</option>
              <option value="PERFIS_PESADOS">Perfis Pesados</option>
              <option value="TREFILADOS_LAMINADOS">Trefilados Especiais</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Gestor / Responsável
            </label>
            <select
              value={filters.manager}
              onChange={(e) => onChange({ ...filters, manager: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
            >
              <option value="ALL">Todos os Gestores</option>
              <option value="pcp">PCP Central</option>
              <option value="carlos">Carlos Mendes (L01)</option>
              <option value="fernando">Fernando Silva (L02)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 mb-1">
              Indicador Foco
            </label>
            <select
              value={filters.indicator}
              onChange={(e) => onChange({ ...filters, indicator: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-800"
            >
              <option value="ALL">Visão Consolidada</option>
              <option value="kpi_production">Produção (t)</option>
              <option value="kpi_otif">Atendimento OTIF (%)</option>
              <option value="kpi_oee">OEE (%)</option>
              <option value="kpi_stock">Estoque Pulmão (t)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExecutiveFiltersBar
