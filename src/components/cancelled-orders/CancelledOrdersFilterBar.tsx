/**
 * Barra Superior de Filtros Combináveis para Pedidos Cancelados no PCP Robotizado
 * Requisito 4: Período, Mês, Ano, Empresa, Linha, Centro, Cliente, Representante, Material,
 * Família, Tipo de carteira, Motivo, Categoria, Responsabilidade, Status da análise,
 * Com/sem inconsistência IA, Recorrente, Evitável, Curva ABC.
 * Ações: Aplicar, Limpar, Salvar visão, Exportar relatório, Gerar análise IA.
 * Datas sempre em dd/mm/aaaa.
 */

import React from 'react'
import {
  Filter,
  RotateCcw,
  Sparkles,
  Download,
  Bookmark,
  Search,
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
  onChange: (newFilters: CancelledOrdersFilterState) => void
  onApply: () => void
  onReset: () => void
  onExport: () => void
  onSaveView: () => void
  onTriggerGlobalAI: () => void
  isGeneratingAI?: boolean
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
  onChange,
  onApply,
  onReset,
  onExport,
  onSaveView,
  onTriggerGlobalAI,
  isGeneratingAI = false,
  totalFilteredCount,
}) => {
  const update = (key: keyof CancelledOrdersFilterState, val: string) => {
    onChange({
      ...filters,
      [key]: val,
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-700" />
          <span className="text-sm font-semibold text-slate-800">
            Filtros de Pesquisa Combinada
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
            {totalFilteredCount} pedido(s) encontrado(s)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSaveView}
            className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-50"
            title="Salvar visão atual de filtros"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Salvar Visão
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            className="text-xs h-8 text-slate-700 border-slate-300 hover:bg-slate-50"
            title="Exportar dados filtrados em planilha/relatório"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Exportar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onTriggerGlobalAI}
            disabled={isGeneratingAI}
            className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            title="Gerar reavaliação de inconsistências e padrões via IA"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            {isGeneratingAI ? 'Analisando...' : 'Gerar Análise IA'}
          </Button>
        </div>
      </div>

      {/* Grid de Filtros */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-3">
        {/* Busca textual */}
        <div className="col-span-2">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Pesquisa (Ordem, Item, Cliente, Material, Motivo)
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="Digite nº da OV, código ou descrição..."
              value={filters.buscaGeral}
              onChange={(e) => update('buscaGeral', e.target.value)}
              className="pl-8 h-8 text-xs border-slate-300"
            />
          </div>
        </div>

        {/* Período Data Início (dd/mm/aaaa) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            <Calendar className="w-3 h-3 inline mr-1 text-slate-400" />
            Data Início (dd/mm/aaaa)
          </label>
          <Input
            type="text"
            placeholder="01/01/2025"
            value={filters.periodoInicio}
            onChange={(e) => update('periodoInicio', e.target.value)}
            className="h-8 text-xs border-slate-300"
          />
        </div>

        {/* Período Data Fim (dd/mm/aaaa) */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            <Calendar className="w-3 h-3 inline mr-1 text-slate-400" />
            Data Fim (dd/mm/aaaa)
          </label>
          <Input
            type="text"
            placeholder="31/12/2025"
            value={filters.periodoFim}
            onChange={(e) => update('periodoFim', e.target.value)}
            className="h-8 text-xs border-slate-300"
          />
        </div>

        {/* Centro */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Centro</label>
          <Select value={filters.centro} onValueChange={(val) => update('centro', val)}>
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todos os Centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Centros</SelectItem>
              <SelectItem value="L1">L1 - Laminação 1</SelectItem>
              <SelectItem value="L2">L2 - Laminação 2</SelectItem>
              <SelectItem value="SDC">SDC - Sidercentro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Linha */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Linha</label>
          <Select value={filters.linha} onValueChange={(val) => update('linha', val)}>
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todas as Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Linhas</SelectItem>
              <SelectItem value="LINHA 1 - PERFIS">Linha 1 - Perfis</SelectItem>
              <SelectItem value="LINHA 2 - BARRAS">Linha 2 - Barras</SelectItem>
              <SelectItem value="LINHA SDC - CORTE E CONFORMAÇÃO">
                SDC - Corte e Conformação
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categoria do Motivo */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Categoria do Motivo
          </label>
          <Select
            value={filters.categoriaMotivo}
            onValueChange={(val) => update('categoriaMotivo', val)}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Categorias</SelectItem>
              {CATEGORIAS_LIST.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsabilidade Provável */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Responsabilidade Provável
          </label>
          <Select
            value={filters.responsabilidadeProvavel}
            onValueChange={(val) => update('responsabilidadeProvavel', val)}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todas as Áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Áreas</SelectItem>
              {RESPONSABILIDADES_LIST.map((resp) => (
                <SelectItem key={resp} value={resp}>
                  {resp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inconsistência IA */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Inconsistência IA
          </label>
          <Select
            value={filters.comInconsistenciaIA}
            onValueChange={(val) => update('comInconsistenciaIA', val)}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Pedidos</SelectItem>
              <SelectItem value="sim">Com Inconsistência Detectada</SelectItem>
              <SelectItem value="nao">Sem Inconsistência (Coerente)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Recorrência */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Recorrência</label>
          <Select value={filters.recorrencia} onValueChange={(val) => update('recorrencia', val)}>
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="recorrente">Padrão Recorrente (a partir de 2 casos)</SelectItem>
              <SelectItem value="nao_recorrente">Não Recorrente (Pontual)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Evitabilidade */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Evitabilidade (IA)
          </label>
          <Select
            value={filters.evitabilidade}
            onValueChange={(val) => update('evitabilidade', val)}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="evitavel">Potencialmente Evitável</SelectItem>
              <SelectItem value="nao_evitavel">Provavelmente Não Evitável</SelectItem>
              <SelectItem value="investigacao">Necessita Investigação</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Curva ABC */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Curva ABC</label>
          <Select value={filters.curvaAbc} onValueChange={(val) => update('curvaAbc', val)}>
            <SelectTrigger className="h-8 text-xs border-slate-300">
              <SelectValue placeholder="Curva ABC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Curvas</SelectItem>
              <SelectItem value="A">Curva A (Alto Impacto)</SelectItem>
              <SelectItem value="B">Curva B (Médio Impacto)</SelectItem>
              <SelectItem value="C">Curva C (Baixo Impacto)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ações inferiores da barra */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
        <div className="text-slate-500 flex items-center">
          <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
          <span>CIAFAL Indústria & Distribuição • Padrão ABNT / SAP ECC</span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs h-8 text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Limpar Filtros
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onApply}
            className="text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  )
}
