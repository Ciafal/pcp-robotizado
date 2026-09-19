import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  Filter,
  Download,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Package,
} from 'lucide-react'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'
import {
  formatNumberPTBR,
  formatCurrencyPTBR,
  formatPercentagePTBR,
  formatDatePTBR,
} from '@/lib/formatters-ptbr'
import { AnalyticalModal } from '@/components/common/AnalyticalModal'

export interface PortfolioDrilldownProps {
  isOpen: boolean
  onClose: () => void
  curvaInicial?: 'A' | 'B' | 'C' | null
  indicadorNome?: string
  indicadorDescricao?: string
  itens: ItemCurvaAbcCalculado[]
  onSelectMaterial?: (item: ItemCurvaAbcCalculado) => void
  onOpenDetalheMaterialOriginal?: (item: ItemCurvaAbcCalculado) => void
}

export const PortfolioDrilldown: React.FC<PortfolioDrilldownProps> = ({
  isOpen,
  onClose,
  curvaInicial = null,
  indicadorNome,
  indicadorDescricao,
  itens,
  onSelectMaterial,
  onOpenDetalheMaterialOriginal,
}) => {
  const [curvaFiltro, setCurvaFiltro] = useState<'TODOS' | 'A' | 'B' | 'C'>(curvaInicial || 'TODOS')
  const [busca, setBusca] = useState('')
  const [centroFiltro, setCentroFiltro] = useState<string>('TODOS')
  const [linhaFiltro, setLinhaFiltro] = useState<string>('TODAS')
  const [apenasComDeficit, setApenasComDeficit] = useState(false)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const ITENS_POR_PAGINA = 25

  // Listas para selects
  const centrosDisponiveis = useMemo(() => {
    return Array.from(new Set(itens.map((i) => i.centro || 'SDPL'))).sort()
  }, [itens])

  const linhasDisponiveis = useMemo(() => {
    return Array.from(new Set(itens.map((i) => i.linha || 'Outros'))).sort()
  }, [itens])

  // Filtro completo
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      if (curvaFiltro !== 'TODOS' && it.curva_abc !== curvaFiltro) return false
      if (centroFiltro !== 'TODOS' && it.centro !== centroFiltro) return false
      if (linhaFiltro !== 'TODAS' && it.linha !== linhaFiltro) return false
      if (apenasComDeficit && it.deficit_tons <= 0) return false

      if (busca.trim()) {
        const b = busca.toLowerCase()
        const mat = it.codigo_material.toLowerCase()
        const desc = (it.descricao_material || '').toLowerCase()
        if (!mat.includes(b) && !desc.includes(b)) return false
      }

      return true
    })
  }, [itens, curvaFiltro, centroFiltro, linhaFiltro, apenasComDeficit, busca])

  // Paginação
  const totalPaginas = Math.ceil(itensFiltrados.length / ITENS_POR_PAGINA) || 1
  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    return itensFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [itensFiltrados, paginaAtual])

  // KPIs dos itens filtrados (com valores sem corte)
  const kpisFiltro = useMemo(() => {
    const qtd = itensFiltrados.length
    const deficitTotal = itensFiltrados.reduce((s, i) => s + i.deficit_tons, 0)
    const faturamentoTotal = itensFiltrados.reduce((s, i) => s + i.faturamento_brl, 0)
    const carteiraTotal = itensFiltrados.reduce((s, i) => s + i.carteira_tons, 0)

    const countA = itensFiltrados.filter((i) => i.curva_abc === 'A').length
    const countB = itensFiltrados.filter((i) => i.curva_abc === 'B').length
    const countC = itensFiltrados.filter((i) => i.curva_abc === 'C').length

    return {
      qtd,
      deficitTotal,
      faturamentoTotal,
      carteiraTotal,
      countA,
      countB,
      countC,
    }
  }, [itensFiltrados])

  const handleDetalhar = (item: ItemCurvaAbcCalculado) => {
    if (onOpenDetalheMaterialOriginal) {
      onOpenDetalheMaterialOriginal(item)
    } else if (onSelectMaterial) {
      onSelectMaterial(item)
    }
  }

  const exportarCSV = () => {
    const cabecalho =
      'Material;Descrição;Curva ABC;Centro;Linha;Carteira (t);Estoque (t);Programado (t);Déficit (t);Faturamento (R$);% do Total;Risco\n'
    const linhas = itensFiltrados
      .map(
        (i) =>
          `"${i.codigo_material}";"${i.descricao_material}";"${i.curva_abc}";"${i.centro}";"${i.linha}";${i.carteira_tons.toFixed(2)};${i.estoque_disponivel_tons.toFixed(2)};${i.programado_tons.toFixed(2)};${i.deficit_tons.toFixed(2)};${i.faturamento_brl.toFixed(2)};${i.participacao_individual_pct.toFixed(2)};"${i.risco}"`,
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `drilldown_curva_${curvaFiltro}_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const kpisTopo = [
    { label: 'Materiais Exibidos', value: `${kpisFiltro.qtd} de ${itens.length}` },
    { label: 'Faturamento Filtro', value: formatCurrencyPTBR(kpisFiltro.faturamentoTotal) },
    { label: 'Déficit no Filtro', value: `${formatNumberPTBR(kpisFiltro.deficitTotal, 2)} t` },
  ]

  const tituloModal = indicadorNome
    ? `Detalhamento • ${indicadorNome}`
    : curvaFiltro === 'TODOS'
      ? 'Detalhamento por Material • Todas as Curvas'
      : `Detalhamento Analítico • Materiais Curva ${curvaFiltro}`

  const subtituloModal =
    indicadorDescricao ||
    'Auditoria detalhada linha a linha com rastreabilidade de faturamento comercial, estoques físicos e cobertura industrial'

  return (
    <AnalyticalModal
      isOpen={isOpen}
      onClose={onClose}
      size="drilldown"
      badge="Drill-Down Executivo"
      title={tituloModal}
      subtitle={subtituloModal}
      headerKpis={kpisTopo}
      scrollMode="auto"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-[#004C97]" />
            <span className="font-semibold text-slate-800">Fonte: SAP RFC ZSD28C</span>
            <span className="text-slate-300">•</span>
            <span>Última sincronização: {formatDatePTBR(new Date().toISOString())}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto flex-wrap">
            {/* Paginação */}
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <Button
                size="icon"
                variant="outline"
                disabled={paginaAtual <= 1}
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                className="w-7 h-7 p-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                className="w-7 h-7 p-0"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={exportarCSV}
              className="h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 px-3"
            >
              <Download className="w-3.5 h-3.5 text-[#004C97]" /> Exportar CSV
            </Button>
            <Button
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white px-5 shadow-xs"
            >
              Fechar
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5">
        {/* 4 MINI-CARDS NO TOPO DO DRILL-DOWN EM 4 COLUNAS NO DESKTOP (Sem valores cortados) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Itens no Filtro */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-500 block">
              Materiais Filtrados
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-xl sm:text-2xl font-bold font-sans text-slate-900">
                {kpisFiltro.qtd}
              </strong>
              <span className="text-xs font-semibold text-slate-500">itens</span>
            </div>
            <span className="text-xs text-slate-600 block mt-1">
              Volume:{' '}
              <strong className="text-slate-800">
                {formatNumberPTBR(kpisFiltro.carteiraTotal, 2)} t
              </strong>
            </span>
          </div>

          {/* Card 2: Déficit Total */}
          <div className="p-3.5 bg-white rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold text-rose-700 block">
              Déficit Físico Total
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong className="text-xl sm:text-2xl font-bold font-sans text-rose-700 whitespace-nowrap">
                {formatNumberPTBR(kpisFiltro.deficitTotal, 2)}
              </strong>
              <span className="text-xs font-semibold text-rose-600">t</span>
            </div>
            <span className="text-xs text-rose-600 font-medium block mt-1">
              Necessidade de produção
            </span>
          </div>

          {/* Card 3: Valor Comercial Relacionado (Completo, sem corte) */}
          <div className="p-3.5 bg-white rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold text-[#004C97] block">
              Faturamento Relacionado
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <strong
                className="text-xl sm:text-2xl font-bold font-sans text-[#004C97] whitespace-nowrap"
                title={formatCurrencyPTBR(kpisFiltro.faturamentoTotal)}
              >
                {formatCurrencyPTBR(kpisFiltro.faturamentoTotal)}
              </strong>
            </div>
            <span className="text-xs text-slate-600 block mt-1">Receita dos itens filtrados</span>
          </div>

          {/* Card 4: Distribuição ABC Clara */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">
              Distribuição ABC no Filtro
            </span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <Badge className="bg-[#004C97] text-white text-xs font-bold px-2 py-0.5">
                A: {kpisFiltro.countA}
              </Badge>
              <Badge className="bg-[#3380CC] text-white text-xs font-bold px-2 py-0.5">
                B: {kpisFiltro.countB}
              </Badge>
              <Badge className="bg-slate-600 text-white text-xs font-bold px-2 py-0.5">
                C: {kpisFiltro.countC}
              </Badge>
            </div>
            <span className="text-xs text-slate-600 block mt-1">Classificação por receita</span>
          </div>
        </div>

        {/* TOOLBAR RESPONSIVA DE FILTROS */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Campo de Busca: min-width 320px, flex: 1, nunca truncado */}
            <div className="relative flex-1 min-w-[280px] sm:min-w-[320px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setPaginaAtual(1)
                }}
                placeholder="Buscar código, descrição ou material..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
              />
            </div>

            {/* Centro */}
            <select
              value={centroFiltro}
              onChange={(e) => {
                setCentroFiltro(e.target.value)
                setPaginaAtual(1)
              }}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="TODOS">Centro: Todos</option>
              {centrosDisponiveis.map((c) => (
                <option key={c} value={c}>
                  Centro {c}
                </option>
              ))}
            </select>

            {/* Linha */}
            <select
              value={linhaFiltro}
              onChange={(e) => {
                setLinhaFiltro(e.target.value)
                setPaginaAtual(1)
              }}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="TODAS">Linha: Todas</option>
              {linhasDisponiveis.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            {/* Checkbox Apenas com Déficit */}
            <Button
              size="sm"
              variant={apenasComDeficit ? 'default' : 'outline'}
              onClick={() => {
                setApenasComDeficit(!apenasComDeficit)
                setPaginaAtual(1)
              }}
              className={`h-7 text-xs font-semibold gap-1.5 ${
                apenasComDeficit
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Apenas com Déficit
            </Button>
          </div>

          {/* Segunda linha: [Todos][Curva A][Curva B][Curva C] + Exibindo X de Y */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              {(['TODOS', 'A', 'B', 'C'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCurvaFiltro(c)
                    setPaginaAtual(1)
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    curvaFiltro === c
                      ? 'bg-[#004C97] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c === 'TODOS' ? 'Todas as Curvas' : `Curva ${c}`}
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-slate-500">
              Exibindo{' '}
              <strong className="text-slate-800">
                {itensFiltrados.length === 0
                  ? 0
                  : `${(paginaAtual - 1) * ITENS_POR_PAGINA + 1}–${Math.min(paginaAtual * ITENS_POR_PAGINA, itensFiltrados.length)}`}
              </strong>{' '}
              de <strong className="text-slate-800">{itensFiltrados.length}</strong> materiais
            </div>
          </div>
        </div>

        {/* TABELA PROPORCIONAL COM HEADER STICKY DENTRO DO SEU CONTAINER */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
          <div className="w-full overflow-x-auto max-h-[500px] scrollbar-thin">
            <table className="w-full min-w-[900px] text-left text-xs border-collapse">
              <thead className="bg-[#004C97] text-white text-[11px] sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="p-2.5 font-bold">Material</th>
                  <th className="p-2.5 font-bold">Descrição</th>
                  <th className="p-2.5 font-bold text-center">Curva</th>
                  <th className="p-2.5 font-bold text-center">Centro</th>
                  <th className="p-2.5 font-bold text-center">Linha</th>
                  <th className="p-2.5 font-bold text-right">Carteira (t)</th>
                  <th className="p-2.5 font-bold text-right">Estoque (t)</th>
                  <th className="p-2.5 font-bold text-right">Programado (t)</th>
                  <th className="p-2.5 font-bold text-right">Déficit (t)</th>
                  <th className="p-2.5 font-bold text-right">Faturamento (R$)</th>
                  <th className="p-2.5 font-bold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-500">
                      Nenhum material encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  itensPaginados.map((it, idx) => {
                    const isDeficit = it.deficit_tons > 0
                    return (
                      <tr
                        key={it.codigo_material + idx}
                        onClick={() => handleDetalhar(it)}
                        className={`hover:bg-blue-50/50 transition-colors cursor-pointer text-[11px] ${
                          it.risco === 'CRITICO'
                            ? 'bg-rose-50/40'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50/30'
                        }`}
                      >
                        {/* Material (Fonte Mono para códigos técnicos) */}
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {it.codigo_material}
                        </td>

                        {/* Descrição (Tipografia padrão, sem estourar o modal) */}
                        <td className="p-2.5 text-slate-700 max-w-[240px]">
                          <span
                            className="truncate block font-medium"
                            title={it.descricao_material}
                          >
                            {it.descricao_material}
                          </span>
                        </td>

                        {/* Curva ABC (Identificada por TEXTO e badge) */}
                        <td className="p-2.5 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              it.curva_abc === 'A'
                                ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                                : it.curva_abc === 'B'
                                  ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            Curva {it.curva_abc}
                          </span>
                        </td>

                        {/* Centro */}
                        <td className="p-2.5 text-center font-medium text-slate-700">
                          {it.centro}
                        </td>

                        {/* Linha */}
                        <td className="p-2.5 text-center font-medium text-slate-700">{it.linha}</td>

                        {/* Carteira (t) - Numérico à direita na tipografia padrão */}
                        <td className="p-2.5 text-right font-sans font-bold text-slate-900">
                          {formatNumberPTBR(it.carteira_tons, 2)}
                        </td>

                        {/* Estoque (t) */}
                        <td className="p-2.5 text-right font-sans font-semibold text-slate-800">
                          {formatNumberPTBR(it.estoque_disponivel_tons, 2)}
                        </td>

                        {/* Programado (t) */}
                        <td className="p-2.5 text-right font-sans text-slate-700">
                          {formatNumberPTBR(it.programado_tons, 2)}
                        </td>

                        {/* Déficit (t) */}
                        <td
                          className={`p-2.5 text-right font-sans font-bold ${
                            isDeficit ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {formatNumberPTBR(it.deficit_tons, 2)}
                        </td>

                        {/* Faturamento (R$) */}
                        <td className="p-2.5 text-right font-sans font-bold text-[#004C97]">
                          {formatCurrencyPTBR(it.faturamento_brl)}
                        </td>

                        {/* Ações */}
                        <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDetalhar(it)}
                            className="h-6 w-6 p-0 text-[#004C97] hover:bg-blue-100 rounded"
                            title="Visualizar Detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AnalyticalModal>
  )
}

export default PortfolioDrilldown
