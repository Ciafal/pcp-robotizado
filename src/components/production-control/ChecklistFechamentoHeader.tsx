import React, { useState } from 'react'
import {
  Calendar,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building,
  User,
  Layers,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Ban,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ChecklistFechamentoExecucao, PrazoFechamentoInfo } from '@/types/checklist-fechamento'

interface Props {
  execucao: ChecklistFechamentoExecucao | null
  competencias: string[]
  competenciaSelecionada: string
  onSelectCompetencia: (comp: string) => void
  onGerarCompetencia: () => void
  prazoInfo: PrazoFechamentoInfo | null
  onFilterStatus?: (status: 'TODOS' | 'OK' | 'ERRO' | 'PENDENTE') => void
  filtroAtivo?: string
  isGenerating?: boolean
}

export const ChecklistFechamentoHeader: React.FC<Props> = ({
  execucao,
  competencias,
  competenciaSelecionada,
  onSelectCompetencia,
  onGerarCompetencia,
  prazoInfo,
  onFilterStatus,
  filtroAtivo = 'TODOS',
  isGenerating = false,
}) => {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Fechado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Fechado
          </Badge>
        )
      case 'Com erro':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Com erro
          </Badge>
        )
      case 'Aguardando fechamento':
        return (
          <Badge className="bg-blue-100 text-[#004C97] border-blue-300 gap-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-[#004C97]" />
            Aguardando fechamento
          </Badge>
        )
      case 'Em andamento':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Em andamento
          </Badge>
        )
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 gap-1 text-xs">
            Pendente
          </Badge>
        )
    }
  }

  const getPrazoBadge = () => {
    if (!prazoInfo) return null
    switch (prazoInfo.statusPrazo) {
      case 'VENCIDO':
        return (
          <Badge className="bg-rose-500 text-white border-rose-600 gap-1 text-[11px] font-semibold animate-pulse">
            <AlertCircle className="w-3 h-3" />
            {prazoInfo.statusTexto}
          </Badge>
        )
      case 'CRITICO':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 gap-1 text-[11px] font-semibold">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {prazoInfo.statusTexto}
          </Badge>
        )
      case 'ATENCAO':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 gap-1 text-[11px] font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            {prazoInfo.statusTexto}
          </Badge>
        )
      default:
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 gap-1 text-[11px]">
            <Clock className="w-3 h-3 text-emerald-600" />
            {prazoInfo.statusTexto}
          </Badge>
        )
    }
  }

  const obrigatoriasPendentes =
    (execucao?.total_erro || 0) > 0 || (execucao?.total_pendente || 0) > 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
      {/* Topo do Header: Identificação, Seletor de Competência e Ações */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-[#004C97] text-white rounded-xl shadow-xs">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Check-list Fechamento do Controle de Produção
              </h1>
              {getStatusBadge(execucao?.status_geral)}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Digitalização do fechamento mensal da CIAFAL com regras do manual interno e
              preservação de histórico.
            </p>
          </div>
        </div>

        {/* Controles de Competência */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 font-medium px-2">Competência:</span>
            <Select value={competenciaSelecionada} onValueChange={onSelectCompetencia}>
              <SelectTrigger className="w-32 h-8 text-xs font-semibold bg-white border-slate-200 text-slate-800">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {competencias.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGerarCompetencia}
            disabled={isGenerating}
            className="h-8 text-xs font-medium border-blue-200 text-[#004C97] hover:bg-blue-50 gap-1.5"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {execucao ? 'Recarregar / Atualizar' : 'Gerar Competência'}
          </Button>
        </div>
      </div>

      {/* Grid de Metadados e Prazos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Empresa</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            {execucao?.empresa || 'CIAFAL'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Responsável</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-500" />
            {execucao?.responsavel || 'Controle de Produção'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-medium">Data Início</span>
          <span className="font-semibold text-slate-800 block mt-0.5">
            {execucao?.data_inicio
              ? new Date(execucao.data_inicio + 'T12:00:00Z').toLocaleDateString('pt-BR')
              : '-'}
          </span>
        </div>

        <div>
          <span className="text-slate-400 block text-[11px] font-medium">
            Data Limite (2º dia útil)
          </span>
          <span className="font-semibold text-slate-800 block mt-0.5">
            {prazoInfo?.segundoDiaUtil || '-'}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 lg:col-span-2 flex flex-col justify-center">
          <span className="text-slate-400 block text-[11px] font-medium mb-1">Status do Prazo</span>
          <div>{getPrazoBadge()}</div>
        </div>
      </div>

      {/* Cards de Resumo de Totais (Clicáveis para filtro rápido) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Atividades */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('TODOS')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filtroAtivo === 'TODOS'
              ? 'bg-blue-50/80 border-[#004C97] ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] text-slate-500 font-medium block">Total Atividades</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 block mt-0.5">
            {execucao?.total_atividades || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {execucao?.total_obrigatorias || 0} obrigatórias
          </span>
        </button>

        {/* Concluídas (OK) */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('OK')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filtroAtivo === 'OK'
              ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] text-emerald-700 font-medium block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Concluídas (OK)
          </span>
          <span className="text-xl sm:text-2xl font-bold text-emerald-700 block mt-0.5">
            {execucao?.total_ok || 0}
          </span>
          <span className="text-[10px] text-emerald-600 mt-0.5 block">
            {execucao?.percentual_concluido || 0}% concluído
          </span>
        </button>

        {/* Com Erro */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('ERRO')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filtroAtivo === 'ERRO'
              ? 'bg-rose-50/80 border-rose-500 ring-1 ring-rose-500'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] text-rose-700 font-medium block flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Com Erro
          </span>
          <span className="text-xl sm:text-2xl font-bold text-rose-700 block mt-0.5">
            {execucao?.total_erro || 0}
          </span>
          <span className="text-[10px] text-rose-600 mt-0.5 block">
            {(execucao?.total_erro || 0) > 0 ? 'Exige correção' : 'Nenhum erro'}
          </span>
        </button>

        {/* Pendentes */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('PENDENTE')}
          className={`p-3 rounded-lg border text-left transition-all ${
            filtroAtivo === 'PENDENTE'
              ? 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-[11px] text-amber-700 font-medium block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pendentes
          </span>
          <span className="text-xl sm:text-2xl font-bold text-amber-700 block mt-0.5">
            {execucao?.total_pendente || 0}
          </span>
          <span className="text-[10px] text-amber-600 mt-0.5 block">Aguardando execução</span>
        </button>

        {/* Ordens Fechadas */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block">Ordens Fechadas</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-800 block mt-0.5">
            {execucao?.ordens_fechadas || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Encerradas / TECO</span>
        </div>

        {/* Ordens Pendentes */}
        <div className="p-3 rounded-lg border border-slate-200 bg-white">
          <span className="text-[11px] text-slate-500 font-medium block">Ordens Pendentes</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-800 block mt-0.5">
            {execucao?.ordens_pendentes || 0}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Em aberto no período</span>
        </div>
      </div>

      {/* Barra de Progresso do Fechamento */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-600 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#004C97]" />
            Progresso Geral da Competência
          </span>
          <span className="font-bold text-[#004C97]">{execucao?.percentual_concluido || 0}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              (execucao?.total_erro || 0) > 0
                ? 'bg-amber-500'
                : (execucao?.percentual_concluido || 0) === 100
                  ? 'bg-emerald-500'
                  : 'bg-[#004C97]'
            }`}
            style={{ width: `${execucao?.percentual_concluido || 0}%` }}
          />
        </div>
      </div>

      {/* Bloqueio de Fechamento (Etapa 1: exibição da regra de bloqueio estrita) */}
      {obrigatoriasPendentes && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
          <Ban className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-950">Fechamento Bloqueado</p>
            <p className="text-amber-800 leading-relaxed">
              Existem atividades obrigatórias ainda não concluídas. Regularize as pendências antes
              de confirmar o fechamento.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
