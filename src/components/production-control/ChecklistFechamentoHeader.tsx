// HEADER
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
  Users,
  Building2,
  GitBranch,
  Factory,
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
import { DateInputPtBr } from '@/components/mp-optimization/DateInputPtBr'

export interface ChecklistFiltrosAvancados {
  empresa: string // 'TODAS' ou WERKS (ex: '1000')
  linha: string // 'TODAS' ou line_id / line_code (ex: 'L1')
  centro: string // 'TODOS' ou center_code / sap_work_center (ex: 'WC-L1')
  ano: string // 'TODOS' ou '2025', '2026', '2027'...
  mes: string // 'TODOS' ou '01'..'12'
  dataInicio: string // 'DD/MM/AAAA'
  dataFim: string // 'DD/MM/AAAA'
}

export interface EmpresaOpcaoItem {
  werks: string
  name: string
  label: string
}

export interface LinhaOpcaoItem {
  id: string
  code: string
  name: string
  werks?: string
  label: string
}

export interface CentroOpcaoItem {
  id?: string
  code: string
  name: string
  lineCode?: string
  werks?: string
  label: string
}

export const MESES_FECHAMENTO = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
] as const

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
  onAbrirFormulario?: () => void
  onAbrirAnaliseIa?: () => void
  onAbrirDestinatarios?: () => void

  // Filtros em cascata e período (Etapa 2a)
  filtros?: ChecklistFiltrosAvancados
  onChangeFiltros?: (novosFiltros: ChecklistFiltrosAvancados) => void
  onLimparFiltros?: () => void
  opcoesEmpresas?: (string | EmpresaOpcaoItem)[]
  opcoesLinhas?: (string | LinhaOpcaoItem)[]
  opcoesCentros?: (string | CentroOpcaoItem)[]
  opcoesAnos?: string[]
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
  onAbrirFormulario,
  onAbrirAnaliseIa,
  onAbrirDestinatarios,
  filtros = {
    empresa: 'TODAS',
    linha: 'TODAS',
    centro: 'TODOS',
    ano: 'TODOS',
    mes: 'TODOS',
    dataInicio: '',
    dataFim: '',
  },
  onChangeFiltros,
  onLimparFiltros,
  opcoesEmpresas = [],
  opcoesLinhas = [],
  opcoesCentros = [],
  opcoesAnos = ['2025', '2026', '2027'],
}) => {
  // Normalizar lista de Empresas para objetos { werks, label }
  const empresasNormalizadas = React.useMemo(() => {
    return opcoesEmpresas.map((item) => {
      if (typeof item === 'string') {
        return { werks: item, label: item }
      }
      return { werks: item.werks, label: item.label || `${item.werks} — ${item.name}` }
    })
  }, [opcoesEmpresas])

  // Normalizar lista de Linhas para objetos { value, label }
  const linhasNormalizadas = React.useMemo(() => {
    return opcoesLinhas.map((item) => {
      if (typeof item === 'string') {
        return { value: item, label: item }
      }
      return { value: item.code || item.id, label: item.label || `${item.code} — ${item.name}` }
    })
  }, [opcoesLinhas])

  // Normalizar lista de Centros para objetos { value, label }
  const centrosNormalizados = React.useMemo(() => {
    return opcoesCentros.map((item) => {
      if (typeof item === 'string') {
        return { value: item, label: item }
      }
      return {
        value: item.code || item.id || '',
        label: item.label || `${item.code} — ${item.name}`,
      }
    })
  }, [opcoesCentros])

  const temEmpresaSelecionada = Boolean(filtros.empresa && filtros.empresa !== 'TODAS')
  const temLinhaSelecionada = Boolean(filtros.linha && filtros.linha !== 'TODAS')
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

          {onAbrirAnaliseIa && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAbrirAnaliseIa}
              className="h-8 text-xs font-semibold border-amber-300 bg-amber-50/80 text-amber-950 hover:bg-amber-100 gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Analisar fechamento com IA
            </Button>
          )}

          {onAbrirFormulario && (
            <Button
              type="button"
              size="sm"
              onClick={onAbrirFormulario}
              className="h-8 text-xs font-semibold bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              Gerar formulário de fechamento
            </Button>
          )}

          {onAbrirDestinatarios && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAbrirDestinatarios}
              className="h-8 text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Destinatários
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros em Cascata da Etapa 2: Empresa -> Linha -> Centro, Ano, Mês, Datas e Limpar */}
      <div className="bg-slate-50/90 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Layers className="w-3.5 h-3.5 text-[#004C97]" />
            <span>Filtros do Check-list</span>
            <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
              (Refinam as atividades por hierarquia e período histórico)
            </span>
          </div>

          {onLimparFiltros && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLimparFiltros}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 gap-1.5 px-2.5 font-medium rounded-md"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Desktop: linha única com os 7 filtros estruturados / Mobile: grade equilibrada responsiva */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5 text-xs">
          {/* 1. EMPRESA (WERKS) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-[#004C97]" />
              Empresa
            </label>
            <select
              aria-label="Empresa"
              value={filtros.empresa}
              onChange={(e) => {
                const novoWerks = e.target.value
                if (onChangeFiltros) {
                  // Regra de cascata: ao alterar Empresa, limpar Linha e Centro
                  onChangeFiltros({
                    ...filtros,
                    empresa: novoWerks,
                    linha: 'TODAS',
                    centro: 'TODOS',
                  })
                }
              }}
              className="w-full h-8 text-xs px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
            >
              <option value="TODAS">Todas as Empresas</option>
              {empresasNormalizadas.map((emp) => (
                <option key={emp.werks} value={emp.werks}>
                  {emp.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. LINHA (Desabilitada sem Empresa selecionada) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-[#004C97]" />
              Linha
            </label>
            <select
              aria-label="Linha"
              value={filtros.linha}
              disabled={!temEmpresaSelecionada}
              onChange={(e) => {
                const novaLinha = e.target.value
                if (onChangeFiltros) {
                  // Regra de cascata: ao alterar Linha, limpar Centro
                  onChangeFiltros({
                    ...filtros,
                    linha: novaLinha,
                    centro: 'TODOS',
                  })
                }
              }}
              className={`w-full h-8 text-xs px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] ${
                !temEmpresaSelecionada
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-dashed'
                  : ''
              }`}
            >
              <option value="TODAS">
                {!temEmpresaSelecionada
                  ? 'Selecione primeiro a Empresa.'
                  : linhasNormalizadas.length === 0
                    ? 'Nenhuma linha nesta empresa'
                    : 'Todas as Linhas'}
              </option>
              {temEmpresaSelecionada &&
                linhasNormalizadas.map((lin) => (
                  <option key={lin.value} value={lin.value}>
                    {lin.label}
                  </option>
                ))}
            </select>
          </div>

          {/* 3. CENTRO (Desabilitado sem Linha selecionada) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Factory className="w-3 h-3 text-[#004C97]" />
              Centro
            </label>
            <select
              aria-label="Centro"
              value={filtros.centro}
              disabled={!temLinhaSelecionada}
              onChange={(e) => {
                const novoCentro = e.target.value
                if (onChangeFiltros) {
                  onChangeFiltros({
                    ...filtros,
                    centro: novoCentro,
                  })
                }
              }}
              className={`w-full h-8 text-xs px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] ${
                !temLinhaSelecionada
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-dashed'
                  : ''
              }`}
            >
              <option value="TODOS">
                {!temLinhaSelecionada
                  ? 'Selecione primeiro a Linha.'
                  : centrosNormalizados.length === 0
                    ? 'Nenhum centro vinculado'
                    : 'Todos os Centros'}
              </option>
              {temLinhaSelecionada &&
                centrosNormalizados.map((cen) => (
                  <option key={cen.value} value={cen.value}>
                    {cen.label}
                  </option>
                ))}
            </select>
          </div>

          {/* 4. ANO */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Ano
            </label>
            <select
              aria-label="Ano"
              value={filtros.ano}
              onChange={(e) => {
                if (onChangeFiltros) {
                  onChangeFiltros({ ...filtros, ano: e.target.value })
                }
              }}
              className="w-full h-8 text-xs px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
            >
              <option value="TODOS">Todos os Anos</option>
              {opcoesAnos.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          {/* 5. MÊS (Português internamente 01-12) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Mês
            </label>
            <select
              aria-label="Mês"
              value={filtros.mes}
              onChange={(e) => {
                if (onChangeFiltros) {
                  onChangeFiltros({ ...filtros, mes: e.target.value })
                }
              }}
              className="w-full h-8 text-xs px-2.5 rounded-md border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
            >
              <option value="TODOS">Todos os Meses</option>
              {MESES_FECHAMENTO.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.value} — {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* 6. DATA INÍCIO (Padrão pt-BR dd/mm/aaaa) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Data Início
            </label>
            <DateInputPtBr
              id="filtro-data-inicio"
              label="Data Início"
              value={filtros.dataInicio}
              onChange={(val) => {
                if (onChangeFiltros) {
                  onChangeFiltros({ ...filtros, dataInicio: val })
                }
              }}
              placeholder="dd/mm/aaaa"
            />
          </div>

          {/* 7. DATA FIM (Padrão pt-BR dd/mm/aaaa) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              Data Fim
            </label>
            <DateInputPtBr
              id="filtro-data-fim"
              label="Data Fim"
              value={filtros.dataFim}
              onChange={(val) => {
                if (onChangeFiltros) {
                  onChangeFiltros({ ...filtros, dataFim: val })
                }
              }}
              placeholder="dd/mm/aaaa"
            />
          </div>
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
