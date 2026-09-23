import React, { useState } from 'react'
import {
  Filter,
  RotateCcw,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Calendar,
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
import { Checkbox } from '@/components/ui/checkbox'
import type {
  SapPendenciesFilters,
  SapPendencyCategory,
  SapPendencyCriticality,
  ResponsibleArea,
  SapTreatmentStatus,
} from '@/types/sap-pendencies'

interface SapPendenciesFilterBarProps {
  filters: SapPendenciesFilters
  onChange: (filters: SapPendenciesFilters) => void
  onClear: () => void
  onRefreshSap: () => void
  isRefreshing?: boolean
  isDemo?: boolean
  pendencyType: 'COGI' | 'CO1P'
}

export const SapPendenciesFilterBar: React.FC<SapPendenciesFilterBarProps> = ({
  filters,
  onChange,
  onClear,
  onRefreshSap,
  isRefreshing = false,
  isDemo = false,
  pendencyType,
}) => {
  const [expanded, setExpanded] = useState(false)

  const handleUpdate = (patch: Partial<SapPendenciesFilters>) => {
    onChange({ ...filters, ...patch })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2.5">
      {/* Linha Principal de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Busca textual rápida */}
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={filters.search || ''}
              onChange={(e) => handleUpdate({ search: e.target.value })}
              placeholder={`Buscar por OP, material, mensagem SAP...`}
              className="h-8 pl-8 text-xs border-slate-200"
            />
          </div>

          {/* Centro */}
          <Select
            value={filters.centro || 'TODOS'}
            onValueChange={(val) => handleUpdate({ centro: val })}
          >
            <SelectTrigger className="h-8 w-28 text-xs border-slate-200">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos Centros</SelectItem>
              <SelectItem value="1001">Centro 1001 (Laminação)</SelectItem>
              <SelectItem value="1002">Centro 1002 (Trefilação)</SelectItem>
              <SelectItem value="1003">Centro 1003 (Acabamento)</SelectItem>
            </SelectContent>
          </Select>

          {/* Categoria IA */}
          <Select
            value={filters.categoria || 'TODAS'}
            onValueChange={(val) => handleUpdate({ categoria: val })}
          >
            <SelectTrigger className="h-8 w-36 text-xs border-slate-200">
              <SelectValue placeholder="Categoria IA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas Categorias</SelectItem>
              <SelectItem value="Estoque">Estoque</SelectItem>
              <SelectItem value="Saldo/Reserva">Saldo/Reserva</SelectItem>
              <SelectItem value="Contábil">Contábil</SelectItem>
              <SelectItem value="Cadastro">Cadastro</SelectItem>
              <SelectItem value="Lote">Lote</SelectItem>
              <SelectItem value="Ordem de Produção">Ordem de Produção</SelectItem>
              <SelectItem value="Confirmação">Confirmação</SelectItem>
              <SelectItem value="Integração">Integração</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>

          {/* Criticidade */}
          <Select
            value={filters.criticality || 'TODAS'}
            onValueChange={(val) => handleUpdate({ criticality: val })}
          >
            <SelectTrigger className="h-8 w-32 text-xs border-slate-200">
              <SelectValue placeholder="Criticidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Toda Criticidade</SelectItem>
              <SelectItem value="CRITICA">🔴 Crítica</SelectItem>
              <SelectItem value="URGENTE">🟠 Urgente</SelectItem>
              <SelectItem value="ATENCAO">🟡 Atenção</SelectItem>
              <SelectItem value="BAIXA">🟢 Baixa</SelectItem>
            </SelectContent>
          </Select>

          {/* Status de Tratamento HUB */}
          <Select
            value={filters.treatment_status || 'TODOS'}
            onValueChange={(val) => handleUpdate({ treatment_status: val })}
          >
            <SelectTrigger className="h-8 w-36 text-xs border-slate-200">
              <SelectValue placeholder="Tratamento HUB" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos Status</SelectItem>
              <SelectItem value="Nova">Nova</SelectItem>
              <SelectItem value="Em análise">Em análise</SelectItem>
              <SelectItem value="Em tratamento">Em tratamento</SelectItem>
              <SelectItem value="Aguardando outra área">Aguardando outra área</SelectItem>
              <SelectItem value="Corrigida">Corrigida</SelectItem>
              <SelectItem value="Aguardando reprocessamento SAP">Aguardando SAP</SelectItem>
              <SelectItem value="Reprocessada">Reprocessada</SelectItem>
              <SelectItem value="Não resolvida">Não resolvida</SelectItem>
              <SelectItem value="Encerrada">Encerrada</SelectItem>
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 text-xs text-slate-600 gap-1 px-2"
          >
            <Filter className="w-3.5 h-3.5" />
            {expanded ? 'Menos filtros' : 'Mais filtros'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertOctagon className="w-3 h-3 text-amber-600" />
              Dados de demonstração / Integração SAP pendente
            </span>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            className="h-8 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 gap-1"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            Limpar filtros
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={isRefreshing}
            onClick={onRefreshSap}
            className="h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar SAP
          </Button>
        </div>
      </div>

      {/* Área Expandida de Filtros Específicos */}
      {expanded && (
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Empresa
            </label>
            <Input
              value={filters.empresa || ''}
              onChange={(e) => handleUpdate({ empresa: e.target.value })}
              placeholder="Ex: CIAFAL"
              className="h-7 text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Ordem de Produção
            </label>
            <Input
              value={filters.op_number || ''}
              onChange={(e) => handleUpdate({ op_number: e.target.value })}
              placeholder="Ex: 10004921"
              className="h-7 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Código do Material
            </label>
            <Input
              value={filters.material || ''}
              onChange={(e) => handleUpdate({ material: e.target.value })}
              placeholder="Ex: 10002941"
              className="h-7 text-xs font-mono"
            />
          </div>

          {pendencyType === 'COGI' && (
            <>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Depósito
                </label>
                <Input
                  value={filters.deposito || ''}
                  onChange={(e) => handleUpdate({ deposito: e.target.value })}
                  placeholder="Ex: 0001"
                  className="h-7 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Tipo Movimento
                </label>
                <Input
                  value={filters.tipo_movimento || ''}
                  onChange={(e) => handleUpdate({ tipo_movimento: e.target.value })}
                  placeholder="Ex: 261, 101"
                  className="h-7 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Lote
                </label>
                <Input
                  value={filters.lote || ''}
                  onChange={(e) => handleUpdate({ lote: e.target.value })}
                  placeholder="Ex: LOTE-01"
                  className="h-7 text-xs"
                />
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Área Responsável
            </label>
            <Select
              value={filters.area_responsavel || 'TODAS'}
              onValueChange={(val) => handleUpdate({ area_responsavel: val })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Selecione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Áreas</SelectItem>
                <SelectItem value="PCP">PCP</SelectItem>
                <SelectItem value="Produção">Produção</SelectItem>
                <SelectItem value="Estoque">Estoque</SelectItem>
                <SelectItem value="Qualidade">Qualidade</SelectItem>
                <SelectItem value="Contabilidade">Contabilidade</SelectItem>
                <SelectItem value="Fiscal">Fiscal</SelectItem>
                <SelectItem value="Cadastro">Cadastro</SelectItem>
                <SelectItem value="TI">TI</SelectItem>
                <SelectItem value="Manutenção">Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checkboxes Rápidos */}
          <div className="col-span-full flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-medium">
              <Checkbox
                checked={Boolean(filters.somente_criticas)}
                onCheckedChange={(checked) => handleUpdate({ somente_criticas: Boolean(checked) })}
              />
              Somente pendências críticas (🔴)
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-medium">
              <Checkbox
                checked={Boolean(filters.somente_reincidentes)}
                onCheckedChange={(checked) =>
                  handleUpdate({ somente_reincidentes: Boolean(checked) })
                }
              />
              Somente reincidentes
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-medium">
              <Checkbox
                checked={Boolean(filters.somente_impactam_programacao)}
                onCheckedChange={(checked) =>
                  handleUpdate({ somente_impactam_programacao: Boolean(checked) })
                }
              />
              Somente pendências que impactam programação vigente
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
