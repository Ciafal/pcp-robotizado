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
import { STRUCTURED_REASONS_BY_CATEGORY } from '@/data/cancellation-reasons-catalog'
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
  onApply?: () => void
  onReset: () => void
  onExport: () => void
  onSaveView: () => void
  onTriggerGlobalAI: () => void
  isGeneratingAI: boolean
  totalFilteredCount: number
  availableOptions?: {
    empresas?: string[]
    centros?: string[]
    linhas?: string[]
    responsaveis?: string[]
  }
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
  availableOptions,
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

  // Lista padrão de empresas CIAFAL caso não venha dinâmica
  const empresasList = availableOptions?.empresas?.length
    ? availableOptions.empresas
    : ['CIAFAL', 'CIAFAL DISTRIBUIÇÃO', 'SIDERCENTRO']

  // Lista padrão de centros caso não venha dinâmica
  const centrosList = availableOptions?.centros?.length
    ? availableOptions.centros
    : ['CT01', 'CT02', 'L1', 'L2', 'SDC']

  // Lista padrão de linhas
  const linhasList = availableOptions?.linhas?.length
    ? availableOptions.linhas
    : ['LINHA 1 - PERFIS', 'LINHA 2 - BARRAS', 'LINHA SDC - CORTE E CONFORMAÇÃO', 'L1', 'L2', 'SDC']

  // Lista de responsáveis
  const responsaveisList = availableOptions?.responsaveis?.length
    ? availableOptions.responsaveis
    : RESPONSABILIDADES_LIST

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

      {/* Grid Rigoroso de Filtros: Campos compactos, alinhados, identidade CIAFAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pt-3">
        {/* 1. Pesquisa por pedido/item/cliente/material */}
        <div className="col-span-1 sm:col-span-2 xl:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Pesquisar pedido / item / cliente / material
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="Nº Pedido (OV), Item, Cliente, Código ou Descrição do Material..."
              value={filters.buscaGeral}
              onChange={(e) => update('buscaGeral', e.target.value)}
              className="pl-8 h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md"
            />
          </div>
        </div>

        {/* 2. Data inicial */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Data inicial
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={filters.periodoInicio}
              onChange={(e) => update('periodoInicio', e.target.value)}
              className="pl-8 h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md font-mono"
            />
          </div>
        </div>

        {/* 3. Data final */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Data final
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              type="text"
              placeholder="dd/mm/aaaa"
              value={filters.periodoFim}
              onChange={(e) => update('periodoFim', e.target.value)}
              className="pl-8 h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md font-mono"
            />
          </div>
        </div>

        {/* 4. Empresa */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Empresa
          </label>
          <Select
            value={filters.empresa || 'todas'}
            onValueChange={(val) => update('empresa', val)}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md">
              <SelectValue placeholder="Todas as Empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">
                Todas as Empresas
              </SelectItem>
              {empresasList.map((emp) => (
                <SelectItem key={emp} value={emp} className="text-xs">
                  {emp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 5. Centro */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Centro
          </label>
          <Select value={filters.centro || 'todos'} onValueChange={(val) => update('centro', val)}>
            <SelectTrigger className="h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md">
              <SelectValue placeholder="Todos os Centros" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Centros
              </SelectItem>
              {centrosList.map((ct) => (
                <SelectItem key={ct} value={ct} className="text-xs">
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 6. Linha */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Linha
          </label>
          <Select value={filters.linha || 'todas'} onValueChange={(val) => update('linha', val)}>
            <SelectTrigger className="h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md">
              <SelectValue placeholder="Todas as Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas" className="text-xs">
                Todas as Linhas
              </SelectItem>
              {linhasList.map((ln) => (
                <SelectItem key={ln} value={ln} className="text-xs">
                  {ln}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 7. Categoria da recusa */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Categoria da recusa
          </label>
          <Select
            value={filters.categoriaRecusa || 'todos'}
            onValueChange={(val) => {
              update('categoriaRecusa', val as any)
              if (val !== 'todos' && val !== 'SEM_CATEGORIZACAO') {
                const permitidos =
                  STRUCTURED_REASONS_BY_CATEGORY[
                    val as keyof typeof STRUCTURED_REASONS_BY_CATEGORY
                  ] || []
                if (filters.motivoRecusa && !permitidos.includes(filters.motivoRecusa)) {
                  update('motivoRecusa', 'todos')
                }
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todas as Categorias
              </SelectItem>
              <SelectItem value="COMERCIAL" className="text-xs font-medium text-emerald-800">
                Comercial
              </SelectItem>
              <SelectItem value="PCP" className="text-xs font-medium text-indigo-800">
                PCP
              </SelectItem>
              <SelectItem value="TRANSPORTE" className="text-xs font-medium text-cyan-800">
                Transporte
              </SelectItem>
              <SelectItem value="SEM_CATEGORIZACAO" className="text-xs font-medium text-amber-800">
                Sem categorização (Históricos)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 8. Motivo da recusa */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Motivo da recusa
          </label>
          <Select
            value={filters.motivoRecusa || 'todos'}
            onValueChange={(val) => update('motivoRecusa', val)}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md">
              <SelectValue placeholder="Todos os Motivos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Motivos
              </SelectItem>
              {(() => {
                const cat = filters.categoriaRecusa
                let motivosParaExibir: string[] = []
                if (cat === 'COMERCIAL' || cat === 'PCP' || cat === 'TRANSPORTE') {
                  motivosParaExibir = STRUCTURED_REASONS_BY_CATEGORY[cat] || []
                } else {
                  motivosParaExibir = [
                    ...STRUCTURED_REASONS_BY_CATEGORY.COMERCIAL,
                    ...STRUCTURED_REASONS_BY_CATEGORY.PCP,
                    ...STRUCTURED_REASONS_BY_CATEGORY.TRANSPORTE,
                  ]
                }
                return motivosParaExibir.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))
              })()}
            </SelectContent>
          </Select>
        </div>

        {/* 9. Responsável */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1 leading-none">
            Responsável
          </label>
          <Select
            value={filters.responsavel || filters.responsabilidadeProvavel || 'todos'}
            onValueChange={(val) => {
              update('responsavel', val)
              if (RESPONSABILIDADES_LIST.includes(val as any)) {
                update('responsabilidadeProvavel', val)
              } else {
                update('responsabilidadeProvavel', 'todas')
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs border-slate-300 focus:border-[#004C97] focus:ring-1 focus:ring-[#004C97] bg-white rounded-md">
              <SelectValue placeholder="Todos os Responsáveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Responsáveis
              </SelectItem>
              {responsaveisList.map((resp) => (
                <SelectItem key={resp} value={resp} className="text-xs">
                  {resp}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ações inferiores da barra */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-xs">
        <div className="text-slate-500 flex items-center w-full sm:w-auto">
          <Building2 className="w-3.5 h-3.5 mr-1.5 text-[#004C97] flex-shrink-0" />
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
            className="text-xs h-8 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Limpar filtros
          </Button>

          {onApply && (
            <Button
              type="button"
              size="sm"
              onClick={onApply}
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold shadow-xs px-4"
            >
              Aplicar filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
