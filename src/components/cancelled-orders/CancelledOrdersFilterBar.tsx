/**
 * Barra de Filtros de Pesquisa Combinada para Pedidos Cancelados
 * PARTE 3: Correção da área de filtros
 * - Grid desktop de 5 colunas rigoroso:
 *    Linha 1: Pesquisa (OV, item, cliente, material ou motivo), Data início, Data fim, Centro, Linha
 *    Linha 2: Categoria do motivo, Responsabilidade provável, Inconsistência IA, Recorrência, Evitabilidade IA
 *    Linha 3: Curva ABC + demais filtros alinhados perfeitamente à grade
 * - Labels de data: "Data início" e "Data fim" (sem repetição de formato redundante no label).
 * - Campo de pesquisa: label "Pesquisar", placeholder "OV, item, cliente, material ou motivo".
 * - Mesma altura (h-9), mesmo border-radius, mesma fonte, mesmo padding e alinhamento vertical.
 * - Responsividade: desktop 5 colunas (xl:grid-cols-5), tablet 3 (md:grid-cols-3), celular 1.
 * - Botões "Limpar filtros" e "Aplicar filtros" alinhados à direita no desktop; responsivos no celular.
 * - Botões "Salvar visão", "Exportar", "Gerar Análise IA" acima dos filtros e alinhados.
 * - Sem overflow horizontal (sem corte artificial por overflow-x: hidden).
 */

import React from 'react'
import {
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  Download,
  Bookmark,
  Calendar,
  Building2,
} from 'lucide-react'
import {
  CancelledOrdersFilterState,
  CancellationCategory,
  ProbableResponsibility,
} from '@/types/cancelled-orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterBarProps {
  filters: CancelledOrdersFilterState
  onFiltersChange: (newFilters: CancelledOrdersFilterState) => void
  onApply: () => void
  onReset: () => void
  onExport: () => void
  onSaveView: () => void
  onTriggerGlobalAI: () => void
  isGeneratingAI: boolean
  totalFilteredCount: number
}

const CATEGORIAS_LIST: CancellationCategory[] = [
  'PCP/Planejamento',
  'Comercial',
  'Cliente',
  'Crédito/Financeiro',
  'Logística',
  'Qualidade/Indústria',
  'Cadastro/Processo',
  'Externo',
]

const RESPONSABILIDADES_LIST: ProbableResponsibility[] = [
  'PCP',
  'Comercial',
  'Cliente',
  'Crédito/Financeiro',
  'Logística',
  'Qualidade',
  'Indústria',
  'Suprimentos',
  'Cadastro',
  'Sistema',
  'Externo',
  'Indefinido',
]

export const CancelledOrdersFilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  onApply,
  onReset,
  onExport,
  onSaveView,
  onTriggerGlobalAI,
  isGeneratingAI,
  totalFilteredCount,
}) => {
  const update = <K extends keyof CancelledOrdersFilterState>(
    field: K,
    value: CancelledOrdersFilterState[K],
  ) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-6 shadow-xs">
      {/* Topo da Seção de Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-[#004C97]/10 text-[#004C97]">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Filtros de Pesquisa Combinada
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline ml-2">
              • Critérios multidimensionais
            </span>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 ml-2">
            {totalFilteredCount} pedido(s)
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveView}
            className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            title="Salvar visão atual de filtros"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Salvar visão
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            className="text-xs h-9 text-slate-700 border-slate-300 hover:bg-slate-50"
            title="Exportar dados filtrados em planilha/relatório"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Exportar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onTriggerGlobalAI}
            disabled={isGeneratingAI}
            className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
            title="Gerar reavaliação de inconsistências e padrões via IA"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            {isGeneratingAI ? 'Analisando...' : 'Gerar Análise IA'}
          </Button>
        </div>
      </div>

      {/* Grid Rigoroso de Filtros: 5 Colunas no Desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5 pt-4">
        {/* LINHA 1 */}
        {/* 1. Pesquisa */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Pesquisar
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="OV, item, cliente, material ou motivo"
              value={filters.buscaGeral}
              onChange={(e) => update('buscaGeral', e.target.value)}
              className="pl-8 h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]"
            />
          </div>
        </div>

        {/* 2. Data início */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Data início
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={filters.periodoInicio}
              onChange={(e) => update('periodoInicio', e.target.value)}
              className="pl-8 h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]"
            />
          </div>
        </div>

        {/* 3. Data fim */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Data fim
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={filters.periodoFim}
              onChange={(e) => update('periodoFim', e.target.value)}
              className="pl-8 h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]"
            />
          </div>
        </div>

        {/* 4. Centro */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Centro
          </label>
          <Select value={filters.centro} onValueChange={(val) => update('centro', val)}>
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todos os Centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Centros
              </SelectItem>
              <SelectItem value="L1" className="text-xs">
                L1 - Laminação 1
              </SelectItem>
              <SelectItem value="L2" className="text-xs">
                L2 - Laminação 2
              </SelectItem>
              <SelectItem value="SDC" className="text-xs">
                SDC - Sidercentro
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Linha */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Linha
          </label>
          <Select value={filters.linha} onValueChange={(val) => update('linha', val)}>
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todas as Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">
                Todas as Linhas
              </SelectItem>
              <SelectItem value="LINHA 1 - PERFIS" className="text-xs">
                Linha 1 - Perfis
              </SelectItem>
              <SelectItem value="LINHA 2 - BARRAS" className="text-xs">
                Linha 2 - Barras
              </SelectItem>
              <SelectItem value="LINHA SDC - CORTE E CONFORMAÇÃO" className="text-xs">
                SDC - Corte e Conformação
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* LINHA 2 */}
        {/* 6. Categoria do motivo */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Categoria do motivo
          </label>
          <Select
            value={filters.categoriaMotivo}
            onValueChange={(val) => update('categoriaMotivo', val)}
          >
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">
                Todas as Categorias
              </SelectItem>
              {CATEGORIAS_LIST.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 7. Responsabilidade provável */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Responsabilidade provável
          </label>
          <Select
            value={filters.responsabilidadeProvavel}
            onValueChange={(val) => update('responsabilidadeProvavel', val)}
          >
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todas as Áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">
                Todas as Áreas
              </SelectItem>
              {RESPONSABILIDADES_LIST.map((resp) => (
                <SelectItem key={resp} value={resp} className="text-xs">
                  {resp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 8. Inconsistência IA */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Inconsistência IA
          </label>
          <Select
            value={filters.comInconsistenciaIA}
            onValueChange={(val) => update('comInconsistenciaIA', val)}
          >
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Pedidos
              </SelectItem>
              <SelectItem value="sim" className="text-xs">
                Com Inconsistência Detectada
              </SelectItem>
              <SelectItem value="nao" className="text-xs">
                Sem Inconsistência (Coerente)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 9. Recorrência */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Recorrência
          </label>
          <Select value={filters.recorrencia} onValueChange={(val) => update('recorrencia', val)}>
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos
              </SelectItem>
              <SelectItem value="recorrente" className="text-xs">
                Padrão Recorrente (≥ 2 casos)
              </SelectItem>
              <SelectItem value="nao_recorrente" className="text-xs">
                Não Recorrente (Pontual)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 10. Evitabilidade IA */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Evitabilidade IA
          </label>
          <Select
            value={filters.evitabilidade}
            onValueChange={(val) => update('evitabilidade', val)}
          >
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todas
              </SelectItem>
              <SelectItem value="evitavel" className="text-xs">
                Potencialmente Evitável
              </SelectItem>
              <SelectItem value="nao_evitavel" className="text-xs">
                Provavelmente Não Evitável
              </SelectItem>
              <SelectItem value="investigacao" className="text-xs">
                Necessita Investigação
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* LINHA 3 */}
        {/* 11. Curva ABC (perfeitamente alinhada na grade de 5 colunas) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 leading-none">
            Curva ABC
          </label>
          <Select value={filters.curvaAbc} onValueChange={(val) => update('curvaAbc', val)}>
            <SelectTrigger className="h-9 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97]">
              <SelectValue placeholder="Todas as Curvas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todas as Curvas
              </SelectItem>
              <SelectItem value="A" className="text-xs">
                Curva A (Alto Impacto)
              </SelectItem>
              <SelectItem value="B" className="text-xs">
                Curva B (Médio Impacto)
              </SelectItem>
              <SelectItem value="C" className="text-xs">
                Curva C (Baixo Impacto)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ações inferiores da barra */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 mt-4 border-t border-slate-100 text-xs">
        <div className="text-slate-500 flex items-center w-full sm:w-auto">
          <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
          <span className="text-[11px]">
            CIAFAL Indústria & Distribuição • Padrão ABNT / SAP ECC
          </span>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs h-9 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Limpar filtros
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onApply}
            className="text-xs h-9 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold shadow-xs px-4"
          >
            Aplicar filtros
          </Button>
        </div>
      </div>
    </div>
  )
}
