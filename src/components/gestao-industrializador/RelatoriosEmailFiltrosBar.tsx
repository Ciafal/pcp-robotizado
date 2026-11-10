import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, RotateCcw, Filter } from 'lucide-react'
import type {
  ReportSendingsFilter,
  ReportChannel,
  ScreenOriginKey,
  ReportStatus,
} from '@/services/industrializer-report-sendings-service'

interface RelatoriosEmailFiltrosBarProps {
  filters: ReportSendingsFilter
  onChangeFilters: (filters: ReportSendingsFilter) => void
  onReset: () => void
  totalRecords: number
  filteredRecords: number
}

export const RelatoriosEmailFiltrosBar: React.FC<RelatoriosEmailFiltrosBarProps> = ({
  filters,
  onChangeFilters,
  onReset,
  totalRecords,
  filteredRecords,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilters({ ...filters, search: e.target.value })
  }

  const handleChannelChange = (value: string) => {
    onChangeFilters({ ...filters, channel: value as ReportChannel })
  }

  const handleScreenChange = (value: string) => {
    onChangeFilters({ ...filters, screenKey: value as ScreenOriginKey })
  }

  const handleStatusChange = (value: string) => {
    onChangeFilters({ ...filters, status: value as ReportStatus })
  }

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilters({ ...filters, dateFrom: e.target.value })
  }

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeFilters({ ...filters, dateTo: e.target.value })
  }

  const hasActiveFilters = Boolean(
    (filters.channel && filters.channel !== 'TODOS') ||
    (filters.screenKey && filters.screenKey !== 'TODAS') ||
    (filters.status && filters.status !== 'TODOS') ||
    (filters.search && filters.search.trim()) ||
    filters.dateFrom ||
    filters.dateTo,
  )

  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-[#004C97]" />
            <span>Filtros do Histórico de Envios</span>
            <span className="text-slate-400 font-normal">
              (Exibindo {filteredRecords} de {totalRecords} envios)
            </span>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1 font-medium px-2"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar filtros</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Busca textual */}
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[11px] font-medium text-slate-600 block">
              Busca (assunto, destinatário, usuário)
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={filters.search || ''}
                onChange={handleSearchChange}
                placeholder="Filtrar por texto..."
                className="h-9 pl-8 pr-7 text-xs bg-slate-50 border-slate-200 focus:bg-white"
              />
              {filters.search && (
                <button
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, search: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. Tela de origem */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 block">Tela de Origem</label>
            <Select value={filters.screenKey || 'TODAS'} onValueChange={handleScreenChange}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Todas as telas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as telas</SelectItem>
                <SelectItem value="gestao_mp">Gestão de MP</SelectItem>
                <SelectItem value="analise_carteira">Análise de Carteira</SelectItem>
                <SelectItem value="sequenciamento_pxr">Sequenciamento P x R</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 3. Tipo de envio / Canal */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 block">Tipo de Envio</label>
            <Select value={filters.channel || 'TODOS'} onValueChange={handleChannelChange}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os tipos</SelectItem>
                <SelectItem value="EMAIL">E-mail</SelectItem>
                <SelectItem value="HUB">HUB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. Período: De */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 block">Data Inicial</label>
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={handleDateFromChange}
              className="h-9 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* 5. Período: Até */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 block">Data Final</label>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={handleDateToChange}
              className="h-9 text-xs bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        {/* Linha rápida de status */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-slate-500">Status:</span>
          {(['TODOS', 'SUCESSO', 'FALHA'] as ReportStatus[]).map((st) => {
            const isSelected = (filters.status || 'TODOS') === st
            const labelMap: Record<ReportStatus, string> = {
              TODOS: 'Todos os status',
              SUCESSO: 'Apenas Sucesso',
              FALHA: 'Apenas Falhas',
              ENVIADO: 'Enviados',
            }
            return (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#004C97] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labelMap[st]}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default RelatoriosEmailFiltrosBar
