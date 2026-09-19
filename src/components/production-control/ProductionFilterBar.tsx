import React, { useState } from 'react'
import {
  Filter,
  RotateCcw,
  Search,
  Bookmark,
  FileDown,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductionFiltersState } from '@/types/pcp-production'
import { defaultProductionFilters } from '@/services/pcp-production-service'

interface ProductionFilterBarProps {
  filters: ProductionFiltersState
  onChange: (filters: ProductionFiltersState) => void
  onApply?: () => void
  onRefresh?: () => void
  onExportPdf?: () => void
  loading?: boolean
}

export const ProductionFilterBar: React.FC<ProductionFilterBarProps> = ({
  filters,
  onChange,
  onApply,
  onRefresh,
  onExportPdf,
  loading = false,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [savedViewName, setSavedViewName] = useState('')
  const [savedViews, setSavedViews] = useState<string[]>([
    'Visão Padrão Semanal',
    'Foco L1 com Pendências',
    'Desvios Críticos SAP',
  ])

  const handleFieldChange = (key: keyof ProductionFiltersState, val: any) => {
    onChange({
      ...filters,
      [key]: val,
    })
  }

  const handleClear = () => {
    onChange({ ...defaultProductionFilters })
  }

  const handleSaveView = () => {
    const name = window.prompt(
      'Nome da visão personalizada de filtros:',
      savedViewName || 'Minha Visão PCP',
    )
    if (name && name.trim()) {
      setSavedViews((prev) => Array.from(new Set([...prev, name.trim()])))
      setSavedViewName(name.trim())
      alert(`Visão "${name.trim()}" salva com sucesso para este usuário!`)
    }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 mb-5 transition-all">
      {/* Linha Superior: Busca Rápida + Controles Principais */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Busca Texto Livre */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={filters.buscaTexto}
              onChange={(e) => handleFieldChange('buscaTexto', e.target.value)}
              placeholder="Buscar por OP, material, centro, operador..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Empresa */}
          <div className="w-[140px]">
            <Select
              value={filters.empresa}
              onValueChange={(val) => handleFieldChange('empresa', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Empresa: Todas</SelectItem>
                <SelectItem value="CIAFAL">CIAFAL</SelectItem>
                <SelectItem value="KS-CIAFAL">KS / Ferradura</SelectItem>
                <SelectItem value="SIDERCENTRO">Sidercentro</SelectItem>
                <SelectItem value="CISAM">CISAM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Centro */}
          <div className="w-[140px]">
            <Select
              value={filters.centro}
              onValueChange={(val) => handleFieldChange('centro', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Centro: Todos</SelectItem>
                <SelectItem value="SEML1">SEML1</SelectItem>
                <SelectItem value="ENDL1">ENDL1</SelectItem>
                <SelectItem value="PNCL1">PNCL1</SelectItem>
                <SelectItem value="PNCL2">PNCL2</SelectItem>
                <SelectItem value="OXIFERKS">OXIFERKS</SelectItem>
                <SelectItem value="PNCSDC">PNCSDC</SelectItem>
                <SelectItem value="CISAM_TOT">CISAM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Linha */}
          <div className="w-[130px]">
            <Select value={filters.linha} onValueChange={(val) => handleFieldChange('linha', val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Linha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Linha: Todas</SelectItem>
                <SelectItem value="L1">Linha 1 (L1)</SelectItem>
                <SelectItem value="L2">Linha 2 (L2)</SelectItem>
                <SelectItem value="ENVIO-KSC">KS Envio</SelectItem>
                <SelectItem value="ARGOLA">Argola SDC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status OP */}
          <div className="w-[160px]">
            <Select
              value={filters.statusOp}
              onValueChange={(val) => handleFieldChange('statusOp', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status OP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Status OP: Todos</SelectItem>
                <SelectItem value="PROGRAMADA">Programada</SelectItem>
                <SelectItem value="EM_PRODUCAO">Em Produção</SelectItem>
                <SelectItem value="PARCIALMENTE_APONTADA">Parcialmente Apontada</SelectItem>
                <SelectItem value="CONCLUIDA_FISICAMENTE">Concluída Fisicamente</SelectItem>
                <SelectItem value="AGUARDANDO_FECHAMENTO">Aguardando Fechamento</SelectItem>
                <SelectItem value="ENCERRADA">Encerrada (TECO)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pendência Filter */}
          <div className="w-[150px]">
            <Select
              value={filters.comSemPendencia}
              onValueChange={(val) => handleFieldChange('comSemPendencia', val)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Pendências" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Pendências: Todas</SelectItem>
                <SelectItem value="COM_PENDENCIA">Com Pendência</SelectItem>
                <SelectItem value="SEM_PENDENCIA">Sem Pendência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-9 text-xs text-blue-700 hover:text-blue-900"
          >
            <Filter className="w-3.5 h-3.5 mr-1" />
            {expanded ? 'Menos Filtros' : 'Filtros Avançados'}
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </Button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
          <Button
            variant="default"
            size="sm"
            onClick={onApply}
            className="h-9 text-xs bg-blue-700 hover:bg-blue-800 text-white"
          >
            Aplicar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-9 text-xs text-slate-600 hover:text-slate-900"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Limpar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveView}
            className="h-9 text-xs text-slate-700"
            title="Salvar visão atual de filtros"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1" />
            Salvar Visão
          </Button>
          {onExportPdf && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPdf}
              className="h-9 text-xs text-slate-700"
            >
              <FileDown className="w-3.5 h-3.5 mr-1" />
              Exportar PDF
            </Button>
          )}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="h-9 text-xs text-slate-700"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Painel Avançado Expansível com todos os critérios solicitados */}
      {expanded && (
        <div className="pt-4 mt-3 border-t grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Centro de Trabalho */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Centro Trabalho (CT)
            </label>
            <Input
              value={filters.work_center}
              onChange={(e) => handleFieldChange('work_center', e.target.value)}
              placeholder="Ex: CT-LAM-01"
              className="h-8 text-xs"
            />
          </div>

          {/* Data Inicial */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Data Inicial (DD/MM/AAAA)
            </label>
            <Input
              type="date"
              value={filters.dataInicial}
              onChange={(e) => handleFieldChange('dataInicial', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Data Final (DD/MM/AAAA)
            </label>
            <Input
              type="date"
              value={filters.dataFinal}
              onChange={(e) => handleFieldChange('dataFinal', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Turno */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Turno
            </label>
            <Select value={filters.turno} onValueChange={(val) => handleFieldChange('turno', val)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Turnos</SelectItem>
                <SelectItem value="TURNO_1">Turno 1 (06h - 14h)</SelectItem>
                <SelectItem value="TURNO_2">Turno 2 (14h - 22h)</SelectItem>
                <SelectItem value="TURNO_3">Turno 3 (22h - 06h)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Família */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Família
            </label>
            <Select
              value={filters.familia}
              onValueChange={(val) => handleFieldChange('familia', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Família" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Famílias</SelectItem>
                <SelectItem value="TUBOS_LEVES">Tubos Leves</SelectItem>
                <SelectItem value="TUBOS_REDONDOS">Tubos Redondos</SelectItem>
                <SelectItem value="PERFIS_ESTRUTURAIS">Perfis Estruturais</SelectItem>
                <SelectItem value="FORJADOS_ESPECIAIS">Forjados KS</SelectItem>
                <SelectItem value="ARGOLAS">Argolas SDC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Planejador MRP */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Planejador MRP
            </label>
            <Select
              value={filters.mrpPlanner}
              onValueChange={(val) => handleFieldChange('mrpPlanner', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Planejador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Planejadores</SelectItem>
                <SelectItem value="PCP Linha 1">PCP Linha 1</SelectItem>
                <SelectItem value="PCP Central">PCP Central</SelectItem>
                <SelectItem value="PCP KS">PCP KS</SelectItem>
                <SelectItem value="PCP Sidercentro">PCP Sidercentro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Apontamento */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Status Apontamento (SAP)
            </label>
            <Select
              value={filters.statusApontamento}
              onValueChange={(val) => handleFieldChange('statusApontamento', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status Apontamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PROCESSADO_SAP">Processado SAP</SelectItem>
                <SelectItem value="REJEITADO_SAP">Rejeitado SAP</SelectItem>
                <SelectItem value="ENVIADO_SAP">Enviado SAP</SelectItem>
                <SelectItem value="AGUARDANDO_CORRECAO">Aguardando Correção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Fechamento */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Status Fechamento
            </label>
            <Select
              value={filters.statusFechamento}
              onValueChange={(val) => handleFieldChange('statusFechamento', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Status Fechamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="APTA">Apta para Fechamento</SelectItem>
                <SelectItem value="PENDENTE_DE_FECHAMENTO">Pendente de Fechamento</SelectItem>
                <SelectItem value="FECHADA">Fechada (TECO)</SelectItem>
                <SelectItem value="BLOQUEADA">Bloqueada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desvio */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Filtro de Desvio
            </label>
            <Select
              value={filters.comSemDesvio}
              onValueChange={(val) => handleFieldChange('comSemDesvio', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Desvios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="COM_DESVIO">Apenas com Desvio</SelectItem>
                <SelectItem value="SEM_DESVIO">Sem Desvio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Operador Líder */}
          <div>
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Operador / Líder
            </label>
            <Input
              value={filters.operador === 'TODOS' ? '' : filters.operador}
              onChange={(e) => handleFieldChange('operador', e.target.value || 'TODOS')}
              placeholder="Nome do operador"
              className="h-8 text-xs"
            />
          </div>

          {/* Visões Salvas */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-slate-600 uppercase mb-1 block">
              Visões Salvas Rápidas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {savedViews.map((sv) => (
                <button
                  key={sv}
                  type="button"
                  onClick={() => {
                    setSavedViewName(sv)
                    if (sv.includes('Pendências')) {
                      onChange({ ...filters, comSemPendencia: 'COM_PENDENCIA' })
                    } else if (sv.includes('SAP')) {
                      onChange({ ...filters, statusApontamento: 'REJEITADO_SAP' })
                    } else {
                      onChange({ ...defaultProductionFilters })
                    }
                  }}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    savedViewName === sv
                      ? 'bg-blue-100 border-blue-400 text-blue-900 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {sv}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
