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
  onRefreshSap?: () => void
  onApply?: () => void
  isRefreshing?: boolean
  isDemo?: boolean
  pendencyType: 'COGI' | 'CO1P'
}

export const SapPendenciesFilterBar: React.FC<SapPendenciesFilterBarProps> = ({
  filters,
  onChange,
  onClear,
  onRefreshSap,
  onApply,
  isRefreshing = false,
  isDemo = false,
  pendencyType,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState<SapPendenciesFilters>(filters)

  // Sincroniza draft quando filters mudam externamente (ex: onClear)
  React.useEffect(() => {
    setDraft(filters)
  }, [filters])

  const handleUpdate = (patch: Partial<SapPendenciesFilters>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const handleApply = () => {
    onChange(draft)
    onApply?.()
  }

  const handleClear = () => {
    setDraft({})
    onClear()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2.5">
      {/* Linha Principal de Filtros Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-2 items-center">
        {/* Busca textual rápida */}
        <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-3 xl:col-span-3 relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <Input
            value={draft.search || ''}
            onChange={(e) => handleUpdate({ search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="Buscar por OP, material, mensagem SAP..."
            className="h-8 pl-8 text-xs border-slate-200"
          />
        </div>

        {/* Centro */}
        <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-2">
          <Select
            value={draft.centro || 'TODOS'}
            onValueChange={(val) => handleUpdate({ centro: val })}
          >
            <SelectTrigger className="h-8 text-xs border-slate-200">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Centro: Todos</SelectItem>
              <SelectItem value="1001">Centro 1001</SelectItem>
              <SelectItem value="1002">Centro 1002</SelectItem>
              <SelectItem value="1003">Centro 1003</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Linha Produtiva */}
        <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
          <Select
            value={draft.linha || 'TODAS'}
            onValueChange={(val) => handleUpdate({ linha: val })}
          >
            <SelectTrigger className="h-8 text-xs border-slate-200">
              <SelectValue placeholder="Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Linha: Todas</SelectItem>
              <SelectItem value="L1">Linha L1</SelectItem>
              <SelectItem value="L2">Linha L2</SelectItem>
              <SelectItem value="TREF_01">TREF 01</SelectItem>
              <SelectItem value="TREF_02">TREF 02</SelectItem>
              <SelectItem value="ACAB_01">ACAB 01</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categoria IA */}
        <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-2">
          <Select
            value={draft.categoria || 'TODAS'}
            onValueChange={(val) => handleUpdate({ categoria: val })}
          >
            <SelectTrigger className="h-8 text-xs border-slate-200">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Categoria: Todas</SelectItem>
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
        </div>

        {/* Criticidade */}
        <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-2">
          <Select
            value={draft.criticality || 'TODAS'}
            onValueChange={(val) => handleUpdate({ criticality: val })}
          >
            <SelectTrigger className="h-8 text-xs border-slate-200">
              <SelectValue placeholder="Criticidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Criticidade: Todas</SelectItem>
              <SelectItem value="CRITICA">🔴 Crítica</SelectItem>
              <SelectItem value="URGENTE">🟠 Urgente</SelectItem>
              <SelectItem value="ATENCAO">🟡 Atenção</SelectItem>
              <SelectItem value="BAIXA">🟢 Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status de Tratamento HUB */}
        <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-2">
          <Select
            value={draft.treatment_status || 'TODOS'}
            onValueChange={(val) => handleUpdate({ treatment_status: val })}
          >
            <SelectTrigger className="h-8 text-xs border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Status: Todos</SelectItem>
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
        </div>
      </div>

      {/* Linha Secundária: Botões Aplicar, Limpar, Mais Filtros e Atualizar SAP */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className="h-7 text-xs bg-[#004C97] hover:bg-[#003870] text-white px-3 shadow-2xs font-medium"
          >
            Aplicar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-7 text-xs text-slate-700 border-slate-300 hover:bg-slate-50 gap-1 px-2.5"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            Limpar
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 text-xs text-slate-600 gap-1 px-2"
          >
            <Filter className="w-3.5 h-3.5" />
            {expanded ? 'Menos filtros' : 'Mais filtros'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshSap && (
            <Button
              type="button"
              size="sm"
              disabled={isRefreshing}
              onClick={onRefreshSap}
              className="h-7 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar SAP
            </Button>
          )}
        </div>
      </div>

      {/* Área Expandida de Mais Filtros Específicos */}
      {expanded && (
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Ordem de Produção */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Ordem (OP)
            </label>
            <Input
              value={draft.op_number || ''}
              onChange={(e) => handleUpdate({ op_number: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Ex: 10004921"
              className="h-7 text-xs font-mono"
            />
          </div>

          {/* Material */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Material
            </label>
            <Input
              value={draft.material || ''}
              onChange={(e) => handleUpdate({ material: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="Ex: 10002941"
              className="h-7 text-xs font-mono"
            />
          </div>

          {/* Responsável */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Responsável / Área
            </label>
            <Select
              value={draft.area_responsavel || 'TODAS'}
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

          {/* Data inicial */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Data Inicial
            </label>
            <Input
              type="date"
              value={draft.data_inicial || ''}
              onChange={(e) => handleUpdate({ data_inicial: e.target.value })}
              className="h-7 text-xs"
            />
          </div>

          {/* Data final */}
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
              Data Final
            </label>
            <Input
              type="date"
              value={draft.data_final || ''}
              onChange={(e) => handleUpdate({ data_final: e.target.value })}
              className="h-7 text-xs"
            />
          </div>

          {/* Filtros específicos de COGI: Depósito, Lote, Tipo de movimento */}
          {pendencyType === 'COGI' && (
            <>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Depósito
                </label>
                <Input
                  value={draft.deposito || ''}
                  onChange={(e) => handleUpdate({ deposito: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="Ex: 0001, 0005"
                  className="h-7 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Lote
                </label>
                <Input
                  value={draft.lote || ''}
                  onChange={(e) => handleUpdate({ lote: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="Ex: LOTE-01"
                  className="h-7 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Tipo Movimento (TMv)
                </label>
                <Input
                  value={draft.tipo_movimento || ''}
                  onChange={(e) => handleUpdate({ tipo_movimento: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="Ex: 261, 101, 531"
                  className="h-7 text-xs font-mono"
                />
              </div>
            </>
          )}

          {/* Filtros específicos de CO1P: Confirmação, Reserva, Centro de trabalho */}
          {pendencyType === 'CO1P' && (
            <>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Nº Confirmação
                </label>
                <Input
                  value={draft.confirmation_number || ''}
                  onChange={(e) => handleUpdate({ confirmation_number: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="Ex: 0000492101"
                  className="h-7 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Nº Reserva
                </label>
                <Input
                  value={draft.reservation_number || ''}
                  onChange={(e) => handleUpdate({ reservation_number: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="Ex: 0000881920"
                  className="h-7 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
                  Centro de Trabalho
                </label>
                <Input
                  value={draft.work_center || ''}
                  onChange={(e) => handleUpdate({ work_center: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="Ex: LAM-01, TREF-01"
                  className="h-7 text-xs font-mono"
                />
              </div>
            </>
          )}

          {/* Checkboxes Rápidos */}
          <div className="col-span-full flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-medium">
              <Checkbox
                checked={Boolean(draft.somente_criticas)}
                onCheckedChange={(checked) => handleUpdate({ somente_criticas: Boolean(checked) })}
              />
              Somente pendências críticas (🔴)
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-medium">
              <Checkbox
                checked={Boolean(draft.somente_reincidentes)}
                onCheckedChange={(checked) =>
                  handleUpdate({ somente_reincidentes: Boolean(checked) })
                }
              />
              Somente reincidentes
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs font-medium">
              <Checkbox
                checked={Boolean(draft.somente_impactam_programacao)}
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
