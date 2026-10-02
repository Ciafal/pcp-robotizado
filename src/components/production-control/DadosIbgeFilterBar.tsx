/**
 * Barra de Filtros — Peça 1: Dados IBGE
 * - Empresa (WERKS — Nome da Empresa)
 * - Linha (filtrada pela Empresa, desabilitada com 'Selecione primeiro a Empresa.' se vazia)
 * - Centro (Multi-seleção de Centros com busca, checkboxes, 'Selecionar todos', 'Limpar seleção' e rótulo 'N centros selecionados')
 * - MTART (distintos de MARA-MTART presentes nos dados reais do HUB, 'MTART — Descrição')
 * - Período (Mês + Ano em português em componente único, sem intervalo de datas)
 * - Botões 'Aplicar filtros' e 'Limpar filtros' (sem refresh)
 * - Responsivo (desktop em linha, mobile vertical), sem rolagem horizontal.
 */

import React, { useState, useMemo } from 'react'
import {
  Building2,
  GitBranch,
  Factory,
  Layers,
  Calendar,
  RotateCcw,
  Check,
  Search,
  ChevronDown,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DadosIbgeFiltros, OpcaoMtart } from '@/types/dados-ibge'

export interface EmpresaOpcao {
  werks: string
  name: string
  label: string
}

export interface LinhaOpcao {
  id: string
  code: string
  name: string
  label: string
  werks: string
}

export interface CentroOpcao {
  id?: string
  code: string
  name: string
  label: string
  lineCode?: string
}

interface Props {
  filtros: DadosIbgeFiltros
  onAplicarFiltros: (filtros: DadosIbgeFiltros) => void
  onLimparFiltros: () => void
  opcoesEmpresas: EmpresaOpcao[]
  opcoesLinhas: LinhaOpcao[]
  opcoesCentros: CentroOpcao[]
  opcoesMtart: OpcaoMtart[]
  carregando?: boolean
}

const MESES = [
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
]

const ANOS = ['2024', '2025', '2026', '2027', '2028']

export const DadosIbgeFilterBar: React.FC<Props> = ({
  filtros,
  onAplicarFiltros,
  onLimparFiltros,
  opcoesEmpresas,
  opcoesLinhas,
  opcoesCentros,
  opcoesMtart,
  carregando = false,
}) => {
  // Estado local para permitir configurar e aplicar com botão "Aplicar filtros"
  const [localFiltros, setLocalFiltros] = useState<DadosIbgeFiltros>(filtros)
  const [buscaCentro, setBuscaCentro] = useState('')
  const [popoverCentrosOpen, setPopoverCentrosOpen] = useState(false)

  // Sincroniza se os filtros externos mudarem
  React.useEffect(() => {
    setLocalFiltros(filtros)
  }, [filtros])

  const temEmpresaSelecionada = Boolean(localFiltros.empresa && localFiltros.empresa !== 'TODAS')
  const temLinhaSelecionada = Boolean(localFiltros.linha && localFiltros.linha !== 'TODAS')

  // Centros filtrados pela busca no Popover
  const centrosFiltradosBusca = useMemo(() => {
    if (!buscaCentro.trim()) return opcoesCentros
    const termo = buscaCentro.toLowerCase()
    return opcoesCentros.filter(
      (c) =>
        c.code.toLowerCase().includes(termo) ||
        c.name.toLowerCase().includes(termo) ||
        c.label.toLowerCase().includes(termo),
    )
  }, [opcoesCentros, buscaCentro])

  // Rótulo dinâmico da multi-seleção de centros
  const rotuloCentros = useMemo(() => {
    const qtd = localFiltros.centros.length
    if (qtd === 0) return 'Todos os Centros'
    if (qtd === 1) {
      const achado = opcoesCentros.find((c) => c.code === localFiltros.centros[0])
      return achado?.code || '1 centro selecionado'
    }
    return `${qtd} centros selecionados`
  }, [localFiltros.centros, opcoesCentros])

  const handleToggleCentro = (codigo: string) => {
    setLocalFiltros((prev) => {
      const existe = prev.centros.includes(codigo)
      const novaLista = existe
        ? prev.centros.filter((c) => c !== codigo)
        : [...prev.centros, codigo]
      return { ...prev, centros: novaLista }
    })
  }

  const handleSelecionarTodosCentros = () => {
    const todosCodigos = opcoesCentros.map((c) => c.code)
    setLocalFiltros((prev) => ({ ...prev, centros: todosCodigos }))
  }

  const handleLimparCentros = () => {
    setLocalFiltros((prev) => ({ ...prev, centros: [] }))
  }

  // Nome do mês atual selecionado
  const mesNomeAtual = useMemo(() => {
    const m = MESES.find((item) => item.value === localFiltros.mes)
    return m ? m.label : 'Mês'
  }, [localFiltros.mes])

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#004C97]" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Filtros Oficiais de Produção
          </h2>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            (Consolidação on-the-fly para competência e fechamento)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLimparFiltros}
            className="h-8 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1.5 px-3 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Limpar filtros
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onAplicarFiltros(localFiltros)}
            disabled={carregando}
            className="h-8 text-xs font-semibold bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 px-4 shadow-2xs"
          >
            <Filter className="w-3.5 h-3.5" />
            Aplicar filtros
          </Button>
        </div>
      </div>

      {/* Grid de Filtros Responsivo (Desktop em linha, Mobile vertical, sem scroll horizontal) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        {/* 1. EMPRESA */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3 text-[#004C97]" />
            Empresa
          </label>
          <select
            aria-label="Empresa"
            value={localFiltros.empresa}
            onChange={(e) => {
              const novaEmp = e.target.value
              // Cascata: trocar Empresa limpa Linha e Centro
              setLocalFiltros((prev) => ({
                ...prev,
                empresa: novaEmp,
                linha: 'TODAS',
                centros: [],
              }))
            }}
            className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
          >
            <option value="TODAS">Todas as Empresas</option>
            {opcoesEmpresas.map((emp) => (
              <option key={emp.werks} value={emp.werks}>
                {emp.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. LINHA (Desabilitada se sem Empresa) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-[#004C97]" />
            Linha
          </label>
          <select
            aria-label="Linha"
            value={localFiltros.linha}
            disabled={!temEmpresaSelecionada}
            onChange={(e) => {
              const novaLinha = e.target.value
              // Cascata: trocar Linha limpa Centro
              setLocalFiltros((prev) => ({
                ...prev,
                linha: novaLinha,
                centros: [],
              }))
            }}
            className={`w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] ${
              !temEmpresaSelecionada
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-dashed'
                : ''
            }`}
          >
            <option value="TODAS">
              {!temEmpresaSelecionada
                ? 'Selecione primeiro a Empresa.'
                : opcoesLinhas.length === 0
                  ? 'Nenhuma linha cadastrada'
                  : 'Todas as Linhas'}
            </option>
            {temEmpresaSelecionada &&
              opcoesLinhas.map((lin) => (
                <option key={lin.code || lin.id} value={lin.code || lin.id}>
                  {lin.label}
                </option>
              ))}
          </select>
        </div>

        {/* 3. CENTRO (Multi-seleção com Busca, Selecionar Todos e Limpar) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Factory className="w-3 h-3 text-[#004C97]" />
              Centro (Multi-seleção)
            </span>
            {localFiltros.centros.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 h-4 bg-blue-50 text-[#004C97]"
              >
                {localFiltros.centros.length}
              </Badge>
            )}
          </label>

          <Popover open={popoverCentrosOpen} onOpenChange={setPopoverCentrosOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97] text-left"
              >
                <span className="truncate">{rotuloCentros}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 text-xs space-y-2 z-50" align="start">
              {/* Barra de busca */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2.5" />
                <Input
                  placeholder="Buscar centro..."
                  value={buscaCentro}
                  onChange={(e) => setBuscaCentro(e.target.value)}
                  className="h-8 pl-7 text-xs"
                />
              </div>

              {/* Botões Selecionar Todos / Limpar */}
              <div className="flex items-center justify-between pt-1 border-b border-slate-100 pb-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelecionarTodosCentros}
                  className="text-[#004C97] hover:underline font-semibold"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={handleLimparCentros}
                  className="text-slate-500 hover:text-slate-800 hover:underline"
                >
                  Limpar seleção
                </button>
              </div>

              {/* Lista de checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                {centrosFiltradosBusca.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    Nenhum centro disponível
                  </div>
                ) : (
                  centrosFiltradosBusca.map((centro) => {
                    const isSelected = localFiltros.centros.includes(centro.code)
                    return (
                      <label
                        key={centro.code}
                        className={`flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/70 text-[#004C97] font-semibold'
                            : 'text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCentro(centro.code)}
                          className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97] w-3.5 h-3.5"
                        />
                        <span className="truncate text-xs">{centro.label}</span>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#004C97] ml-auto shrink-0" />
                        )}
                      </label>
                    )
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* 4. TIPO MATERIAL MTART (MARA-MTART Reais) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#004C97]" />
            Tipo Material (MTART)
          </label>
          <select
            aria-label="Tipo Material"
            value={localFiltros.mtart}
            onChange={(e) =>
              setLocalFiltros((prev) => ({
                ...prev,
                mtart: e.target.value,
              }))
            }
            className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
          >
            <option value="TODOS">Todos os Tipos (MTART)</option>
            {opcoesMtart.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. PERÍODO (Componente Único Mês + Ano em Português: ex: "Setembro / 2026") */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#004C97]" />
            Período (Mês / Ano)
          </label>
          <div className="flex items-center gap-1.5">
            <select
              aria-label="Mês de Competência"
              value={localFiltros.mes}
              onChange={(e) =>
                setLocalFiltros((prev) => ({
                  ...prev,
                  mes: e.target.value,
                }))
              }
              className="w-3/5 h-9 text-xs px-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
            >
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Ano de Competência"
              value={localFiltros.ano}
              onChange={(e) =>
                setLocalFiltros((prev) => ({
                  ...prev,
                  ano: e.target.value,
                }))
              }
              className="w-2/5 h-9 text-xs px-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#004C97]"
            >
              {ANOS.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DadosIbgeFilterBar
