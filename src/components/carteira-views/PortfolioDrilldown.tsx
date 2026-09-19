import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  SlidersHorizontal,
  Bot,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Layers,
  ChevronRight,
  ShieldCheck,
  TrendingDown,
  Info,
} from 'lucide-react'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'
import {
  formatNumberPTBR,
  formatCurrencyPTBR,
  formatPercentagePTBR,
  formatDatePTBR,
} from '@/lib/formatters-ptbr'

export interface PortfolioDrilldownProps {
  isOpen: boolean
  onClose: () => void
  indicadorNome: string
  indicadorDescricao?: string
  itens: ItemCurvaAbcCalculado[]
  onOpenDetalheMaterialOriginal?: (item: ItemCurvaAbcCalculado) => void
}

export const PortfolioDrilldown: React.FC<PortfolioDrilldownProps> = ({
  isOpen,
  onClose,
  indicadorNome,
  indicadorDescricao,
  itens,
  onOpenDetalheMaterialOriginal,
}) => {
  const [busca, setBusca] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('TODOS')
  const [filtroLinha, setFiltroLinha] = useState('TODAS')
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [filtroCriticidade, setFiltroCriticidade] = useState('TODAS')
  const [ordenacaoCampo, setOrdenacaoCampo] =
    useState<keyof ItemCurvaAbcCalculado>('faturamento_brl')
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<'asc' | 'desc'>('desc')
  const [materialSelecionado, setMaterialSelecionado] = useState<ItemCurvaAbcCalculado | null>(null)

  // Resumos do indicador
  const totalItens = itens.length
  const deficitTotalT = itens.reduce((acc, i) => acc + (i.deficit_tons || 0), 0)
  const valorTotalBrl = itens.reduce((acc, i) => acc + (i.faturamento_brl || 0), 0)
  const contagemA = itens.filter((i) => i.curva_abc === 'A').length
  const contagemB = itens.filter((i) => i.curva_abc === 'B').length
  const contagemC = itens.filter((i) => i.curva_abc === 'C').length

  const centrosDisponiveis = useMemo(() => {
    const s = new Set<string>()
    itens.forEach((i) => {
      if (i.centro) s.add(i.centro)
    })
    return Array.from(s).sort()
  }, [itens])

  const linhasDisponiveis = useMemo(() => {
    const s = new Set<string>()
    itens.forEach((i) => {
      if (i.linha) s.add(i.linha)
    })
    return Array.from(s).sort()
  }, [itens])

  const itensFiltrados = useMemo(() => {
    return itens
      .filter((it) => {
        if (busca) {
          const t = busca.toLowerCase()
          const matchCod = it.codigo_material.toLowerCase().includes(t)
          const matchDesc = it.descricao_material.toLowerCase().includes(t)
          const matchCli = (it.cliente || '').toLowerCase().includes(t)
          if (!matchCod && !matchDesc && !matchCli) return false
        }
        if (filtroCentro !== 'TODOS' && it.centro !== filtroCentro) return false
        if (filtroLinha !== 'TODAS' && it.linha !== filtroLinha) return false
        if (filtroCurva !== 'TODAS' && it.curva_abc !== filtroCurva) return false
        if (filtroCriticidade !== 'TODAS' && it.criticidade !== filtroCriticidade) return false
        return true
      })
      .sort((a, b) => {
        const valA = a[ordenacaoCampo] ?? ''
        const valB = b[ordenacaoCampo] ?? ''
        if (typeof valA === 'number' && typeof valB === 'number') {
          return ordenacaoDirecao === 'asc' ? valA - valB : valB - valA
        }
        return ordenacaoDirecao === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA))
      })
  }, [
    itens,
    busca,
    filtroCentro,
    filtroLinha,
    filtroCurva,
    filtroCriticidade,
    ordenacaoCampo,
    ordenacaoDirecao,
  ])

  const toggleOrdenacao = (campo: keyof ItemCurvaAbcCalculado) => {
    if (ordenacaoCampo === campo) {
      setOrdenacaoDirecao((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdenacaoCampo(campo)
      setOrdenacaoDirecao('desc')
    }
  }

  // Geração do texto interpretativo de Análise & IA
  const textoAnaliseIA = useMemo(() => {
    if (materialSelecionado) {
      const mat = materialSelecionado
      const defFmt = formatNumberPTBR(mat.deficit_tons, 2)
      const partFmt = formatPercentagePTBR(mat.participacao_individual_pct, 2)
      const fatFmt = formatCurrencyPTBR(mat.faturamento_brl)
      const progT = mat.programado_tons

      let riscoDesc = 'sob controle operacional'
      if (mat.curva_abc === 'A' && mat.deficit_tons > 0 && progT === 0) {
        riscoDesc =
          'CRÍTICO COMERCIAL: item classe A com déficit e sem programação PCP no horizonte ativo'
      } else if (mat.deficit_tons > 0 && mat.saldo_projetado_tons < 0) {
        riscoDesc = 'ATENÇÃO: programação parcial insuficiente para cobrir a carteira em aberto'
      } else if (mat.saldo_projetado_tons >= 0 && mat.deficit_tons > 0) {
        riscoDesc = 'COBERTO: a programação PCP cobre o déficit da carteira aberta'
      }

      return `Este material (${mat.codigo_material}) pertence à Curva ${mat.curva_abc} e possui carteira de ${formatNumberPTBR(
        mat.carteira_tons,
        2,
      )} t, com estoque disponível de ${formatNumberPTBR(
        mat.estoque_disponivel_tons,
        2,
      )} t e déficit atual de ${defFmt} t. Programação PCP vinculada: ${formatNumberPTBR(
        progT,
        2,
      )} t. Representa ${partFmt} de participação individual no faturamento (${fatFmt}), classificando a situação como ${riscoDesc}. Recomenda-se validar sequenciamento industrial na linha ${
        mat.linha
      } e conferir disponibilidade de tarugos/semiacabados no Centro ${mat.centro}. (Análise descritiva — IA não altera programação nem modifica SAP).`
    }

    // Texto geral do indicador
    if (itens.length === 0) {
      return 'Nenhum item com a condição deste indicador foi encontrado na carteira consultada via SAP RFC.'
    }

    const materiaisA = itens.filter((i) => i.curva_abc === 'A').length
    const materiaisComDeficit = itens.filter((i) => i.deficit_tons > 0).length
    const exposicaoFat = formatCurrencyPTBR(valorTotalBrl)
    const defFmt = formatNumberPTBR(deficitTotalT, 2)

    return `O indicador "${indicadorNome}" consolida ${totalItens} materiais na carteira ativa, totalizando ${defFmt} t de déficit e exposição de ${exposicaoFat} em faturamento relacionado. Destes, ${materiaisA} itens pertencem à Curva A (alta relevância comercial) e ${materiaisComDeficit} possuem déficit de estoque. Recomenda-se priorizar a investigação dos materiais Curva A sem cobertura programada antes do fechamento semanal.`
  }, [materialSelecionado, itens, indicadorNome, totalItens, deficitTotalT, valorTotalBrl])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                  Drill-Down Executivo
                </Badge>
                <DialogTitle className="text-base sm:text-lg font-bold text-white">
                  {indicadorNome}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-300">
                {indicadorDescricao ||
                  'Detalhamento consolidado por material com rastreabilidade SAP ECC (ZSD28C), Curva ABC e IA.'}
              </DialogDescription>
            </div>
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Total Encontrado</div>
              <div className="text-lg font-bold text-cyan-300 font-mono">{totalItens} itens</div>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo do indicador em 5 mini-cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Itens</span>
            <span className="text-sm font-bold font-mono text-slate-900">{totalItens}</span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Déficit Total
            </span>
            <span className="text-sm font-bold font-mono text-rose-700">
              {formatNumberPTBR(deficitTotalT, 2)} t
            </span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Valor Relacionado
            </span>
            <span className="text-sm font-bold font-mono text-blue-900">
              {formatCurrencyPTBR(valorTotalBrl)}
            </span>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs col-span-2 sm:col-span-2">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Distribuição ABC
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-bold">
                A: {contagemA}
              </Badge>
              <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[10px] font-bold">
                B: {contagemB}
              </Badge>
              <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
                C: {contagemC}
              </Badge>
            </div>
          </div>
        </div>

        {/* Seção Análise & IA */}
        <div className="p-3 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border-b border-slate-200 text-xs">
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-md mt-0.5 shrink-0 shadow-2xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-slate-900 text-xs">
                  Análise & IA • Interpretação Operacional
                </span>
                <span className="text-[10px] text-slate-500">
                  (Raciocínio diagnóstico em tempo real)
                </span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                {textoAnaliseIA}
              </p>
            </div>
          </div>
        </div>

        {/* Ficha Resumida do Material Selecionado (quando houver) */}
        {materialSelecionado && (
          <div className="p-3 bg-amber-50/70 border-b border-amber-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {materialSelecionado.codigo_material}
                </span>
                <Badge
                  className={`text-[10px] font-bold ${
                    materialSelecionado.curva_abc === 'A'
                      ? 'bg-purple-600 text-white'
                      : materialSelecionado.curva_abc === 'B'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-600 text-white'
                  }`}
                >
                  Curva {materialSelecionado.curva_abc}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-amber-400 bg-white"
                >
                  Risco: {materialSelecionado.risco}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {onOpenDetalheMaterialOriginal && (
                  <Button
                    size="sm"
                    onClick={() => onOpenDetalheMaterialOriginal(materialSelecionado)}
                    className="h-6 text-[11px] bg-[#004C97] text-white hover:bg-[#003870] font-bold px-2"
                  >
                    Abrir Ficha Completa
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMaterialSelecionado(null)}
                  className="h-6 text-[11px] text-slate-600 hover:text-slate-900 px-2"
                >
                  Fechar ficha
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Descrição:</span>
                <span className="font-medium text-slate-800 truncate block">
                  {materialSelecionado.descricao_material}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Carteira:</span>
                <span className="font-mono font-bold text-blue-900">
                  {formatNumberPTBR(materialSelecionado.carteira_tons, 2)} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Estoque Disponível:</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatNumberPTBR(materialSelecionado.estoque_disponivel_tons, 2)} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Produção Programada:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {formatNumberPTBR(materialSelecionado.programado_tons, 2)} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Déficit Atual:</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatNumberPTBR(materialSelecionado.deficit_tons, 2)} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Saldo Projetado:</span>
                <span
                  className={`font-mono font-bold ${
                    materialSelecionado.saldo_projetado_tons < 0
                      ? 'text-rose-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {formatNumberPTBR(materialSelecionado.saldo_projetado_tons, 2)} t
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Part. Faturamento:</span>
                <span className="font-mono font-bold text-purple-900">
                  {formatPercentagePTBR(materialSelecionado.participacao_individual_pct, 2)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Faturamento Relacionado:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrencyPTBR(materialSelecionado.faturamento_brl)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Centro / Linha:</span>
                <span className="font-bold text-slate-800">
                  {materialSelecionado.centro} &bull; {materialSelecionado.linha}
                </span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-slate-500 block text-[10px]">Próxima Produção:</span>
                <span className="font-medium text-slate-800">
                  {materialSelecionado.programado_tons > 0
                    ? `Programada (${formatNumberPTBR(materialSelecionado.programado_tons, 2)} t) para ${
                        materialSelecionado.data_prevista
                          ? formatDatePTBR(materialSelecionado.data_prevista)
                          : 'ciclo ativo'
                      }`
                    : 'Não programada'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filtros da Tabela */}
        <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar código, descrição ou cliente..."
                className="h-7 pl-8 text-xs bg-white"
              />
            </div>

            <select
              value={filtroCentro}
              onChange={(e) => setFiltroCentro(e.target.value)}
              className="h-7 text-xs px-2 rounded-md border border-slate-300 bg-white"
            >
              <option value="TODOS">Centros: Todos</option>
              {centrosDisponiveis.map((c) => (
                <option key={c} value={c}>
                  Centro {c}
                </option>
              ))}
            </select>

            <select
              value={filtroLinha}
              onChange={(e) => setFiltroLinha(e.target.value)}
              className="h-7 text-xs px-2 rounded-md border border-slate-300 bg-white"
            >
              <option value="TODAS">Linhas: Todas</option>
              {linhasDisponiveis.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <div className="flex items-center bg-white rounded-md border border-slate-300 p-0.5">
              {(['TODAS', 'A', 'B', 'C'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setFiltroCurva(c)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    filtroCurva === c
                      ? 'bg-[#004C97] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c === 'TODAS' ? 'ABC: Todos' : `Curva ${c}`}
                </button>
              ))}
            </div>

            <select
              value={filtroCriticidade}
              onChange={(e) => setFiltroCriticidade(e.target.value)}
              className="h-7 text-xs px-2 rounded-md border border-slate-300 bg-white"
            >
              <option value="TODAS">Criticidade: Todas</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            Exibindo <strong>{itensFiltrados.length}</strong> de {itens.length}
          </div>
        </div>

        {/* Tabela por Material */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px] sticky top-0 select-none z-10">
              <tr>
                <th
                  onClick={() => toggleOrdenacao('codigo_material')}
                  className="p-2.5 font-bold cursor-pointer hover:bg-blue-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Material</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleOrdenacao('descricao_material')}
                  className="p-2.5 font-bold cursor-pointer hover:bg-blue-800"
                >
                  Descrição / Família
                </th>
                <th
                  onClick={() => toggleOrdenacao('linha')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Linha
                </th>
                <th
                  onClick={() => toggleOrdenacao('centro')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Centro
                </th>
                <th
                  onClick={() => toggleOrdenacao('curva_abc')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  ABC
                </th>
                <th
                  onClick={() => toggleOrdenacao('carteira_tons')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Carteira (t)
                </th>
                <th
                  onClick={() => toggleOrdenacao('estoque_disponivel_tons')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Disp. (t)
                </th>
                <th
                  onClick={() => toggleOrdenacao('programado_tons')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Prog. (t)
                </th>
                <th
                  onClick={() => toggleOrdenacao('deficit_tons')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Déficit (t)
                </th>
                <th
                  onClick={() => toggleOrdenacao('saldo_projetado_tons')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Projetado (t)
                </th>
                <th
                  onClick={() => toggleOrdenacao('faturamento_brl')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Faturamento (R$)
                </th>
                <th
                  onClick={() => toggleOrdenacao('participacao_individual_pct')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  % Indiv.
                </th>
                <th
                  onClick={() => toggleOrdenacao('participacao_acumulada_pct')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  % Acum.
                </th>
                <th className="p-2.5 font-bold text-center">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500">
                    Nenhum material encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensFiltrados.map((item, idx) => {
                  const isSelected = materialSelecionado?.codigo_material === item.codigo_material

                  return (
                    <tr
                      key={item.codigo_material + idx}
                      onClick={() => setMaterialSelecionado(item)}
                      className={`hover:bg-blue-50/60 cursor-pointer text-[11px] transition-colors ${
                        isSelected
                          ? 'bg-amber-100/70 font-semibold'
                          : item.curva_abc === 'A' && item.deficit_tons > 0
                            ? 'bg-rose-50/30'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        {item.codigo_material}
                      </td>
                      <td className="p-2.5 max-w-[200px]">
                        <span
                          className="block truncate text-slate-800 font-medium"
                          title={item.descricao_material}
                        >
                          {item.descricao_material}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {item.familia}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {item.linha || 'GERAL'}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{item.centro}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.curva_abc === 'A'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : item.curva_abc === 'B'
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {item.curva_abc}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-950">
                        {formatNumberPTBR(item.carteira_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {formatNumberPTBR(item.estoque_disponivel_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-indigo-700 font-semibold">
                        {formatNumberPTBR(item.programado_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                        {item.deficit_tons > 0 ? formatNumberPTBR(item.deficit_tons, 2) : '-'}
                      </td>
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          item.saldo_projetado_tons < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatNumberPTBR(item.saldo_projetado_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-900">
                        {formatCurrencyPTBR(item.faturamento_brl)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {formatPercentagePTBR(item.participacao_individual_pct, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-500">
                        {formatPercentagePTBR(item.participacao_acumulada_pct, 2)}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[9px] font-bold ${
                            item.risco === 'CRITICO'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : item.risco === 'ATENCAO'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {item.risco}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé com botão de fechar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Clique em qualquer linha para carregar a <strong>Ficha Resumida do Material</strong> e a
            interpretação de IA.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-7 text-xs border-slate-300"
          >
            Fechar Janela
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default PortfolioDrilldown
