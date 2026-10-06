import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Package,
  Layers,
  Factory,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Info,
} from 'lucide-react'
import {
  ItemMinimoNaoAtingido,
  MinimoNaoAtingidoSummary,
  StatusMinimoNaoAtingido,
  formatPtBr,
} from '@/services/carteira-minimo-nao-atingido-engine'
import { formatDatePTBR } from '@/lib/formatters-ptbr'

interface MinimoNaoAtingidoModalProps {
  isOpen: boolean
  onClose: () => void
  summary: MinimoNaoAtingidoSummary
  tituloVisao?: string // Ex: "Carteira Geral", "Carteira L1"
  onSelectMaterial?: (codigoMaterial: string) => void
}

export const MinimoNaoAtingidoModal: React.FC<MinimoNaoAtingidoModalProps> = ({
  isOpen,
  onClose,
  summary,
  tituloVisao = 'Carteira Geral',
  onSelectMaterial,
}) => {
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('TODOS')
  const [filtroLinha, setFiltroLinha] = useState('TODAS')
  const [filtroCliente, setFiltroCliente] = useState('TODOS')
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [filtroTipoCarteira, setFiltroTipoCarteira] = useState('TODAS')
  const [filtroStatus, setFiltroStatus] = useState<'TODOS' | StatusMinimoNaoAtingido>('TODOS')
  const [somenteCriticos, setSomenteCriticos] = useState(false)
  const [faixaDeficit, setFaixaDeficit] = useState<
    'TODAS' | 'ATE_10T' | 'DE_10_A_30T' | 'ACIMA_30T'
  >('TODAS')
  const [ordenacao, setOrdenacao] = useState<
    | 'MAIOR_DEFICIT'
    | 'MENOR_DEFICIT'
    | 'MAIOR_FATURAMENTO'
    | 'CURVA_A_PRIMEIRO'
    | 'DATA_MAIS_PROXIMA'
  >('MAIOR_DEFICIT')

  // Item expandido para drilldown
  const [itemExpandidoId, setItemExpandidoId] = useState<string | null>(null)
  const [abaDrilldown, setAbaDrilldown] = useState<'COMERCIAL' | 'PCP' | 'ESTOQUE' | 'HISTORICO'>(
    'COMERCIAL',
  )

  // Listas para selects de filtro
  const centrosDisponiveis = useMemo(() => {
    const s = new Set<string>()
    summary.itens.forEach((i) => {
      if (i.centro) s.add(i.centro)
    })
    return Array.from(s).sort()
  }, [summary.itens])

  const linhasDisponiveis = useMemo(() => {
    const s = new Set<string>()
    summary.itens.forEach((i) => {
      if (i.linha) s.add(i.linha)
    })
    return Array.from(s).sort()
  }, [summary.itens])

  const clientesDisponiveis = useMemo(() => {
    const s = new Set<string>()
    summary.itens.forEach((i) => {
      i.clientes_lista.forEach((c) => s.add(c))
    })
    return Array.from(s).sort()
  }, [summary.itens])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return summary.itens.filter((item) => {
      if (busca) {
        const query = busca.toLowerCase().trim()
        const matchMat = item.codigo_material.toLowerCase().includes(query)
        const matchDesc = item.descricao_material.toLowerCase().includes(query)
        const matchCli = item.cliente.toLowerCase().includes(query)
        if (!matchMat && !matchDesc && !matchCli) return false
      }

      if (filtroCentro !== 'TODOS' && item.centro !== filtroCentro) return false
      if (filtroLinha !== 'TODAS' && item.linha !== filtroLinha) return false

      if (filtroCliente !== 'TODOS') {
        const hasCli = item.clientes_lista.some((c) =>
          c.toLowerCase().includes(filtroCliente.toLowerCase()),
        )
        if (!hasCli) return false
      }

      if (filtroCurva !== 'TODAS' && item.curva_abc !== filtroCurva) return false
      if (filtroTipoCarteira !== 'TODAS' && item.tipo_carteira !== filtroTipoCarteira) return false
      if (filtroStatus !== 'TODOS' && item.status !== filtroStatus) return false
      if (somenteCriticos && item.status !== 'Crítico') return false

      if (faixaDeficit === 'ATE_10T' && item.deficit_tons > 10) return false
      if (faixaDeficit === 'DE_10_A_30T' && (item.deficit_tons <= 10 || item.deficit_tons > 30))
        return false
      if (faixaDeficit === 'ACIMA_30T' && item.deficit_tons <= 30) return false

      return true
    })
  }, [
    summary.itens,
    busca,
    filtroCentro,
    filtroLinha,
    filtroCliente,
    filtroCurva,
    filtroTipoCarteira,
    filtroStatus,
    somenteCriticos,
    faixaDeficit,
  ])

  // Ordenação
  const itensOrdenados = useMemo(() => {
    const copia = [...itensFiltrados]
    switch (ordenacao) {
      case 'MAIOR_DEFICIT':
        return copia.sort((a, b) => b.deficit_tons - a.deficit_tons)
      case 'MENOR_DEFICIT':
        return copia.sort((a, b) => a.deficit_tons - b.deficit_tons)
      case 'MAIOR_FATURAMENTO':
        return copia.sort(
          (a, b) =>
            b.detalhe_comercial.faturamento_estimado_brl -
            a.detalhe_comercial.faturamento_estimado_brl,
        )
      case 'CURVA_A_PRIMEIRO':
        return copia.sort((a, b) => {
          const peso = (c: string) => (c === 'A' ? 3 : c === 'B' ? 2 : 1)
          const diff = peso(b.curva_abc) - peso(a.curva_abc)
          if (diff !== 0) return diff
          return b.deficit_tons - a.deficit_tons
        })
      case 'DATA_MAIS_PROXIMA':
        return copia.sort((a, b) => {
          const dA = a.data_necessidade || '9999-12-31'
          const dB = b.data_necessidade || '9999-12-31'
          return dA.localeCompare(dB)
        })
      default:
        return copia
    }
  }, [itensFiltrados, ordenacao])

  // Limpar filtros
  const handleLimparFiltros = () => {
    setBusca('')
    setFiltroCentro('TODOS')
    setFiltroLinha('TODAS')
    setFiltroCliente('TODOS')
    setFiltroCurva('TODAS')
    setFiltroTipoCarteira('TODAS')
    setFiltroStatus('TODOS')
    setSomenteCriticos(false)
    setFaixaDeficit('TODAS')
    setOrdenacao('MAIOR_DEFICIT')
  }

  // Exportar dados como CSV padrão pt-BR
  const handleExportarCsv = () => {
    if (itensOrdenados.length === 0) return

    const colunas = [
      'Código Material',
      'Descrição',
      'Cliente(s)',
      'Centro',
      'Linha',
      'Tipo Carteira',
      'Curva ABC',
      'Qtd Carteira (t)',
      'Estoque Disp (t)',
      'Qtd Programada (t)',
      'Qtd Considerada Prog (t)',
      'Mínimo Necessário (t)',
      'Déficit (t)',
      'Data Necessidade',
      'Status',
      'Fonte do Mínimo',
    ]

    const linhas = itensOrdenados.map((it) => [
      `"${it.codigo_material}"`,
      `"${it.descricao_material.replace(/"/g, '""')}"`,
      `"${it.cliente.replace(/"/g, '""')}"`,
      `"${it.centro}"`,
      `"${it.linha}"`,
      `"${it.tipo_carteira}"`,
      `"${it.curva_abc}"`,
      formatPtBr(it.carteira_tons),
      formatPtBr(it.estoque_disponivel_tons),
      formatPtBr(it.programado_tons),
      formatPtBr(it.qtd_considerada_programacao_tons),
      formatPtBr(it.minimo_necessario_tons),
      formatPtBr(it.deficit_tons),
      it.data_necessidade ? formatDatePTBR(it.data_necessidade) : 'Sem data',
      `"${it.status}"`,
      `"${it.fonte_minimo.replace(/"/g, '""')}"`,
    ])

    const csvContent =
      '\uFEFF' + [colunas.join(';'), ...linhas.map((l) => l.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `minimo_nao_atingido_${tituloVisao.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: StatusMinimoNaoAtingido) => {
    switch (status) {
      case 'Crítico':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
            Crítico
          </Badge>
        )
      case 'Aguardando composição de lote':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
            Aguardando composição de lote
          </Badge>
        )
      case 'Próximo do mínimo':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
            Próximo do mínimo
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[94vw] max-h-[92vh] p-0 flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl border-slate-200">
        {/* Cabeçalho */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-200 bg-linear-to-r from-amber-50/70 to-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                    Materiais com mínimo não atingido
                  </DialogTitle>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs">
                    {tituloVisao}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Consolidação determinística de pedidos abertos por material, centro e linha para
                  viabilização de campanha.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportarCsv}
                className="h-8 text-xs font-semibold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
                title="Exportar listagem em CSV (Excel pt-BR)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </Button>
            </div>
          </div>

          {/* Cards de Métricas Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-2 border-t border-amber-200/60">
            <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Materiais Abaixo do Mínimo
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-lg font-mono font-bold text-amber-900">
                  {summary.total_materiais}
                </strong>
                <span className="text-[11px] text-slate-500 font-medium">itens</span>
              </div>
            </div>

            <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">
                Déficit Total Consolidado
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-lg font-mono font-bold text-rose-700">
                  {formatPtBr(summary.total_deficit_tons)}
                </strong>
                <span className="text-[11px] text-rose-600 font-semibold">t</span>
              </div>
            </div>

            <div className="p-2.5 bg-white/80 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">
                Qtd. Considerada para Prog.
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-lg font-mono font-bold text-blue-900">
                  {formatPtBr(summary.total_qtd_considerada_tons)}
                </strong>
                <span className="text-[11px] text-blue-700 font-semibold">t</span>
              </div>
            </div>

            <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">
                Distribuição de Criticidade
              </span>
              <div className="flex items-center gap-2 mt-1 text-xs font-mono font-bold">
                <span className="text-rose-700" title="Críticos">
                  {summary.criticos_count} crit.
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-700" title="Aguardando lote">
                  {summary.aguardando_lote_count} ag.
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-700" title="Próximo do mínimo">
                  {summary.proximo_minimo_count} próx.
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Filtros Multifacetada */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Busca Textual */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar material, descrição ou cliente..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97] bg-white"
                />
              </div>

              {/* Centro */}
              <select
                value={filtroCentro}
                onChange={(e) => setFiltroCentro(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Centros: Todos</option>
                {centrosDisponiveis.map((c) => (
                  <option key={c} value={c}>
                    Centro {c}
                  </option>
                ))}
              </select>

              {/* Linha */}
              <select
                value={filtroLinha}
                onChange={(e) => setFiltroLinha(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Linhas: Todas</option>
                {linhasDisponiveis.map((l) => (
                  <option key={l} value={l}>
                    Linha {l}
                  </option>
                ))}
              </select>

              {/* Cliente */}
              {clientesDisponiveis.length > 0 && (
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium max-w-[160px] truncate"
                >
                  <option value="TODOS">Clientes: Todos</option>
                  {clientesDisponiveis.map((cli) => (
                    <option key={cli} value={cli}>
                      {cli}
                    </option>
                  ))}
                </select>
              )}

              {/* Curva ABC */}
              <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-200">
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

              {/* Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="Crítico">Crítico</option>
                <option value="Aguardando composição de lote">Aguardando composição de lote</option>
                <option value="Próximo do mínimo">Próximo do mínimo</option>
              </select>

              {/* Faixa de Déficit */}
              <select
                value={faixaDeficit}
                onChange={(e) => setFaixaDeficit(e.target.value as any)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Faixa de Déficit: Todas</option>
                <option value="ATE_10T">Até 10,00 t</option>
                <option value="DE_10_A_30T">De 10,00 t a 30,00 t</option>
                <option value="ACIMA_30T">Acima de 30,00 t</option>
              </select>

              {/* Botão Somente Críticos */}
              <button
                onClick={() => setSomenteCriticos((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border ${
                  somenteCriticos
                    ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                    : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                }`}
              >
                Somente críticos
              </button>
            </div>

            {/* Ordenação e Limpar */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-semibold">Ordenar:</span>
              <select
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as any)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold"
              >
                <option value="MAIOR_DEFICIT">Maior déficit</option>
                <option value="MENOR_DEFICIT">Menor déficit</option>
                <option value="MAIOR_FATURAMENTO">Maior faturamento</option>
                <option value="CURVA_A_PRIMEIRO">Curva A primeiro</option>
                <option value="DATA_MAIS_PROXIMA">Data mais próxima</option>
              </select>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleLimparFiltros}
                className="h-7 text-xs text-slate-600 hover:text-slate-900"
              >
                Limpar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabela de Materiais com Mínimo Não Atingido */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itensOrdenados.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                Nenhum material com mínimo pendente com os filtros atuais
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todos os materiais atendem ao lote mínimo de programação parametrizado ou nenhum
                pedido em aberto satisfaz os filtros selecionados.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleLimparFiltros}
                className="mt-2 text-xs"
              >
                Restaurar filtros
              </Button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#004C97] text-white text-[11px] select-none">
                    <tr>
                      <th className="p-2.5 font-bold">Material / Descrição</th>
                      <th className="p-2.5 font-bold">Cliente(s)</th>
                      <th className="p-2.5 font-bold text-center">Centro</th>
                      <th className="p-2.5 font-bold text-center">Linha</th>
                      <th className="p-2.5 font-bold text-center">Tipo</th>
                      <th className="p-2.5 font-bold text-center">Curva</th>
                      <th className="p-2.5 font-bold text-right">Carteira (t)</th>
                      <th className="p-2.5 font-bold text-right">Estoque (t)</th>
                      <th className="p-2.5 font-bold text-right">Programado (t)</th>
                      <th className="p-2.5 font-bold text-right bg-blue-900/50">Qtd. Prog. (t)</th>
                      <th className="p-2.5 font-bold text-right">Mínimo (t)</th>
                      <th className="p-2.5 font-bold text-right bg-rose-900/60">Déficit (t)</th>
                      <th className="p-2.5 font-bold text-center">Necessidade</th>
                      <th className="p-2.5 font-bold text-center">Status</th>
                      <th className="p-2.5 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensOrdenados.map((item, idx) => {
                      const isExpanded = itemExpandidoId === item.id
                      return (
                        <React.Fragment key={item.id}>
                          <tr
                            onClick={() => setItemExpandidoId(isExpanded ? null : item.id)}
                            className={`hover:bg-amber-50/40 transition-colors text-[11px] cursor-pointer ${
                              item.status === 'Crítico'
                                ? 'bg-rose-50/25'
                                : idx % 2 === 0
                                  ? 'bg-white'
                                  : 'bg-slate-50/30'
                            }`}
                          >
                            <td className="p-2.5">
                              <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                {item.codigo_material}
                                {item.pedidos_count > 1 && (
                                  <Badge className="bg-slate-100 text-slate-700 text-[9px] font-semibold border-slate-300">
                                    {item.pedidos_count} ped.
                                  </Badge>
                                )}
                              </div>
                              <span
                                className="text-[10px] text-slate-500 block truncate max-w-[200px]"
                                title={item.descricao_material}
                              >
                                {item.descricao_material}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <span
                                className="text-slate-800 font-medium block truncate max-w-[160px]"
                                title={item.clientes_lista.join(', ')}
                              >
                                {item.cliente}
                              </span>
                            </td>

                            <td className="p-2.5 text-center font-mono text-slate-700">
                              {item.centro}
                            </td>

                            <td className="p-2.5 text-center">
                              <Badge className="bg-slate-100 text-[#004C97] font-bold border-slate-200 text-[10px]">
                                {item.linha}
                              </Badge>
                            </td>

                            <td className="p-2.5 text-center">
                              <span className="text-[10px] font-medium text-slate-600">
                                {item.tipo_carteira}
                              </span>
                            </td>

                            <td className="p-2.5 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.curva_abc === 'A'
                                    ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                                    : item.curva_abc === 'B'
                                      ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                                }`}
                              >
                                {item.curva_abc}
                              </span>
                            </td>

                            <td className="p-2.5 text-right font-mono text-slate-800 font-semibold">
                              {formatPtBr(item.carteira_tons)}
                            </td>

                            <td className="p-2.5 text-right font-mono text-slate-600">
                              {formatPtBr(item.estoque_disponivel_tons)}
                            </td>

                            <td className="p-2.5 text-right font-mono text-indigo-700 font-semibold">
                              {formatPtBr(item.programado_tons)}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-[#004C97] bg-blue-50/50">
                              {formatPtBr(item.qtd_considerada_programacao_tons)}
                            </td>

                            <td
                              className="p-2.5 text-right font-mono text-slate-700"
                              title={`Fonte: ${item.fonte_minimo}`}
                            >
                              {formatPtBr(item.minimo_necessario_tons)}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-rose-700 bg-rose-50/50">
                              {formatPtBr(item.deficit_tons)}
                            </td>

                            <td className="p-2.5 text-center font-mono text-slate-700">
                              {item.data_necessidade ? formatDatePTBR(item.data_necessidade) : '-'}
                              {item.dias_restantes !== undefined && (
                                <span
                                  className={`block text-[9.5px] ${
                                    item.dias_restantes <= 3
                                      ? 'text-rose-700 font-bold'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {item.dias_restantes < 0
                                    ? `${Math.abs(item.dias_restantes)}d atr.`
                                    : `${item.dias_restantes}d`}
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-center">{getStatusBadge(item.status)}</td>

                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setItemExpandidoId(isExpanded ? null : item.id)}
                                  className="h-6 px-1.5 text-[10px] text-slate-700 hover:text-[#004C97] font-semibold gap-0.5"
                                  title="Ver detalhamento multi-seção e análise IA"
                                >
                                  <span>{isExpanded ? 'Fechar' : 'Detalhes'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            </td>
                          </tr>

                          {/* Bloco Expandido (Drill-down por material + Análise IA PCP) */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 border-t border-b border-amber-200">
                              <td colSpan={15} className="p-4 space-y-3">
                                {/* Alerta IA PCP (Apoio à Decisão) */}
                                <div className="p-3 bg-linear-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-xl space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#004C97]">
                                      <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                      <span>Análise IA PCP &bull; Apoio à Decisão</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 italic">
                                      Orientação analítica pura — não altera pedidos, OPs ou
                                      carteira
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed">
                                    {item.analise_ia.diagnostico}
                                  </p>
                                  <div className="pt-1 space-y-1">
                                    <span className="text-[11px] font-bold text-slate-800 block">
                                      Recomendações sugeridas:
                                    </span>
                                    <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                                      {item.analise_ia.recomendacoes.map((rec, rIdx) => (
                                        <li key={rIdx}>{rec}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                {/* Seções de Drill-down por Material */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                  {/* Abas do Drilldown */}
                                  <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1">
                                    <button
                                      onClick={() => setAbaDrilldown('COMERCIAL')}
                                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
                                        abaDrilldown === 'COMERCIAL'
                                          ? 'bg-white text-[#004C97] border-t-2 border-t-[#004C97] border-x border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      Comercial ({item.pedidos_count} pedido
                                      {item.pedidos_count > 1 ? 's' : ''})
                                    </button>

                                    <button
                                      onClick={() => setAbaDrilldown('PCP')}
                                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
                                        abaDrilldown === 'PCP'
                                          ? 'bg-white text-[#004C97] border-t-2 border-t-[#004C97] border-x border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      PCP & Linha
                                    </button>

                                    <button
                                      onClick={() => setAbaDrilldown('ESTOQUE')}
                                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
                                        abaDrilldown === 'ESTOQUE'
                                          ? 'bg-white text-[#004C97] border-t-2 border-t-[#004C97] border-x border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      Estoque
                                    </button>

                                    <button
                                      onClick={() => setAbaDrilldown('HISTORICO')}
                                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
                                        abaDrilldown === 'HISTORICO'
                                          ? 'bg-white text-[#004C97] border-t-2 border-t-[#004C97] border-x border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      Histórico & Rastreabilidade
                                    </button>
                                  </div>

                                  {/* Conteúdo da Aba */}
                                  <div className="p-3 text-xs">
                                    {abaDrilldown === 'COMERCIAL' && (
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 border-b border-slate-100 pb-1.5">
                                          <span>
                                            Total de Pedidos Abertos:{' '}
                                            <strong className="text-slate-900">
                                              {item.detalhe_comercial.total_pedidos}
                                            </strong>
                                          </span>
                                          <span>
                                            Faturamento Estimado:{' '}
                                            <strong className="text-slate-900 font-mono">
                                              R${' '}
                                              {item.detalhe_comercial.faturamento_estimado_brl.toLocaleString(
                                                'pt-BR',
                                                { minimumFractionDigits: 2 },
                                              )}
                                            </strong>
                                          </span>
                                        </div>

                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-[11px] border-collapse">
                                            <thead>
                                              <tr className="bg-slate-100 text-slate-700">
                                                <th className="p-1.5 font-bold">Pedido / Item</th>
                                                <th className="p-1.5 font-bold">Cliente</th>
                                                <th className="p-1.5 font-bold text-right">
                                                  Quantidade (t)
                                                </th>
                                                <th className="p-1.5 font-bold text-center">
                                                  Data Desejada
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                              {item.pedidos.map((ped, pIdx) => (
                                                <tr key={pIdx} className="hover:bg-slate-50">
                                                  <td className="p-1.5 font-mono font-bold text-slate-900">
                                                    {ped.ordem_venda} / {ped.item_ordem}
                                                  </td>
                                                  <td className="p-1.5 text-slate-800">
                                                    {ped.cliente}
                                                  </td>
                                                  <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                                                    {formatPtBr(ped.quantidade_tons)} t
                                                  </td>
                                                  <td className="p-1.5 text-center font-mono text-slate-600">
                                                    {ped.data_desejada
                                                      ? formatDatePTBR(ped.data_desejada)
                                                      : 'Sem data'}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}

                                    {abaDrilldown === 'PCP' && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Parametrização Industrial
                                          </span>
                                          <div className="text-xs space-y-0.5">
                                            <div>
                                              Linha Sugerida:{' '}
                                              <strong className="text-slate-900 font-bold">
                                                {item.detalhe_pcp.linha_sugerida}
                                              </strong>
                                            </div>
                                            <div>
                                              Centro Produtivo:{' '}
                                              <strong className="text-slate-900 font-bold">
                                                {item.centro}
                                              </strong>
                                            </div>
                                            <div>
                                              Regra de Mínimo:{' '}
                                              <span className="text-slate-800">
                                                {item.detalhe_pcp.regra_aplicada}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Origem e Auditoria do Mínimo
                                          </span>
                                          <p className="text-xs text-slate-700">
                                            <strong>Fonte:</strong> {item.fonte_minimo}
                                          </p>
                                          <p className="text-[11px] text-slate-500">
                                            {item.deficit_formatado}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    {abaDrilldown === 'ESTOQUE' && (
                                      <div className="grid grid-cols-3 gap-2.5">
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Estoque Livre
                                          </span>
                                          <strong className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
                                            {formatPtBr(item.detalhe_estoque.estoque_livre_tons)} t
                                          </strong>
                                        </div>

                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Estoque MTO Dedicado
                                          </span>
                                          <strong className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
                                            {formatPtBr(item.detalhe_estoque.estoque_mto_tons)} t
                                          </strong>
                                        </div>

                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Semiacabado / Tarugo
                                          </span>
                                          <strong className="text-sm font-mono font-bold text-slate-900 block mt-0.5">
                                            {formatPtBr(
                                              item.detalhe_estoque.estoque_semiacabado_tons,
                                            )}{' '}
                                            t
                                          </strong>
                                        </div>
                                      </div>
                                    )}

                                    {abaDrilldown === 'HISTORICO' && (
                                      <div className="space-y-1 text-slate-600">
                                        {item.detalhe_historico.observacoes.length > 0 ? (
                                          item.detalhe_historico.observacoes.map((obs, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2">
                                              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                              <span>{obs}</span>
                                            </div>
                                          ))
                                        ) : (
                                          <span className="text-slate-400 italic">
                                            Sem dados adicionais de histórico no momento.
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <span>
            Exibindo <strong>{itensOrdenados.length}</strong> de{' '}
            <strong>{summary.total_materiais}</strong> materiais abaixo do mínimo
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose} className="h-8 text-xs">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MinimoNaoAtingidoModal
