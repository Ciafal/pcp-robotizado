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
import {
  Search,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react'
import {
  MinimoNaoAtingidoItem,
  MinimoNaoAtingidoSummary,
  StatusLoteMinimo,
  formatarDataHoraPtBr,
  formatarToneladasPtBr,
} from '@/services/carteira-minimo-nao-atingido-engine'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface MinimoNaoAtingidoModalProps {
  isOpen: boolean
  onClose: () => void
  summary: MinimoNaoAtingidoSummary
  tituloVisao?: string
  onSelectMaterial?: (codigoMaterial: string) => void
}

export const MinimoNaoAtingidoModal: React.FC<MinimoNaoAtingidoModalProps> = ({
  isOpen,
  onClose,
  summary,
  tituloVisao = 'Carteira Geral',
  onSelectMaterial,
}) => {
  // Aba principal do Modal: (a) Mínimo não atingido vs (b) Lote mínimo não recebido
  const [secaoAtiva, setSecaoAtiva] = useState<'NAO_ATINGIDO' | 'SEM_PARAMETRIZACAO'>(
    'NAO_ATINGIDO',
  )

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroCentro, setFiltroCentro] = useState('TODOS')
  const [filtroLinha, setFiltroLinha] = useState('TODAS')
  const [filtroCliente, setFiltroCliente] = useState('TODOS')
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [somenteCriticos, setSomenteCriticos] = useState(false)
  const [faixaDeficit, setFaixaDeficit] = useState<
    'TODAS' | 'ATE_10T' | 'DE_10_A_30T' | 'ACIMA_30T'
  >('TODAS')
  const [ordenacao, setOrdenacao] = useState<
    'MAIOR_DEFICIT' | 'MENOR_DEFICIT' | 'CURVA_A_PRIMEIRO' | 'DATA_MAIS_PROXIMA' | 'MAIOR_CARTEIRA'
  >('MAIOR_DEFICIT')

  // Material expandido para drilldown
  const [itemExpandidoCodigo, setItemExpandidoCodigo] = useState<string | null>(null)
  const [abaDrilldown, setAbaDrilldown] = useState<'COMERCIAL' | 'PCP' | 'HISTORICO'>('COMERCIAL')

  // Listas de opções
  const centrosDisponiveis = useMemo(() => {
    const s = new Set<string>()
    summary.todos_materiais.forEach((i) => {
      if (i.centro) s.add(i.centro)
    })
    return Array.from(s).sort()
  }, [summary.todos_materiais])

  const linhasDisponiveis = useMemo(() => {
    const s = new Set<string>()
    summary.todos_materiais.forEach((i) => {
      if (i.linha) s.add(i.linha)
    })
    return Array.from(s).sort()
  }, [summary.todos_materiais])

  const clientesDisponiveis = useMemo(() => {
    const s = new Set<string>()
    summary.todos_materiais.forEach((i) => {
      i.clientes.forEach((c) => s.add(c))
    })
    return Array.from(s).sort()
  }, [summary.todos_materiais])

  // Itens da seção atual
  const itensBase = useMemo(() => {
    if (secaoAtiva === 'NAO_ATINGIDO') {
      return summary.materiais_abaixo
    }
    return summary.materiais_sem_minimo_sap
  }, [secaoAtiva, summary.materiais_abaixo, summary.materiais_sem_minimo_sap])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itensBase.filter((item) => {
      if (busca) {
        const query = busca.toLowerCase().trim()
        const matchMat = item.codigo_material.toLowerCase().includes(query)
        const matchDesc = item.descricao_material.toLowerCase().includes(query)
        const matchCli = item.clientes.some((c) => c.toLowerCase().includes(query))
        if (!matchMat && !matchDesc && !matchCli) return false
      }

      if (filtroCentro !== 'TODOS' && item.centro !== filtroCentro) return false
      if (filtroLinha !== 'TODAS' && item.linha !== filtroLinha) return false

      if (filtroCliente !== 'TODOS') {
        const hasCli = item.clientes.some((c) =>
          c.toLowerCase().includes(filtroCliente.toLowerCase()),
        )
        if (!hasCli) return false
      }

      if (filtroCurva !== 'TODAS' && item.curva_abc !== filtroCurva) return false

      if (somenteCriticos) {
        // Crítico = Curva A ou déficit > 15t
        if (item.curva_abc !== 'A' && item.falta_para_minimo_tons < 15) return false
      }

      if (secaoAtiva === 'NAO_ATINGIDO') {
        if (faixaDeficit === 'ATE_10T' && item.falta_para_minimo_tons > 10) return false
        if (
          faixaDeficit === 'DE_10_A_30T' &&
          (item.falta_para_minimo_tons <= 10 || item.falta_para_minimo_tons > 30)
        )
          return false
        if (faixaDeficit === 'ACIMA_30T' && item.falta_para_minimo_tons <= 30) return false
      }

      return true
    })
  }, [
    itensBase,
    busca,
    filtroCentro,
    filtroLinha,
    filtroCliente,
    filtroCurva,
    somenteCriticos,
    faixaDeficit,
    secaoAtiva,
  ])

  // Ordenação
  const itensOrdenados = useMemo(() => {
    const copia = [...itensFiltrados]
    switch (ordenacao) {
      case 'MAIOR_DEFICIT':
        return copia.sort((a, b) => b.falta_para_minimo_tons - a.falta_para_minimo_tons)
      case 'MENOR_DEFICIT':
        return copia.sort((a, b) => a.falta_para_minimo_tons - b.falta_para_minimo_tons)
      case 'MAIOR_CARTEIRA':
        return copia.sort((a, b) => b.quantidade_consolidada_tons - a.quantidade_consolidada_tons)
      case 'CURVA_A_PRIMEIRO':
        return copia.sort((a, b) => {
          const peso = (c: string) => (c === 'A' ? 3 : c === 'B' ? 2 : 1)
          const diff = peso(b.curva_abc) - peso(a.curva_abc)
          if (diff !== 0) return diff
          return b.falta_para_minimo_tons - a.falta_para_minimo_tons
        })
      case 'DATA_MAIS_PROXIMA':
        return copia.sort((a, b) => {
          const dA = a.data_necessidade_mais_antiga || '9999-12-31'
          const dB = b.data_necessidade_mais_antiga || '9999-12-31'
          return dA.localeCompare(dB)
        })
      default:
        return copia
    }
  }, [itensFiltrados, ordenacao])

  const handleLimparFiltros = () => {
    setBusca('')
    setFiltroCentro('TODOS')
    setFiltroLinha('TODAS')
    setFiltroCliente('TODOS')
    setFiltroCurva('TODAS')
    setSomenteCriticos(false)
    setFaixaDeficit('TODAS')
    setOrdenacao('MAIOR_DEFICIT')
  }

  // Exportação CSV estrita pt-BR
  const handleExportarCsv = () => {
    if (itensOrdenados.length === 0) return

    const colunas = [
      'Código Material',
      'Descrição',
      'Carteira',
      'Cliente(s)',
      'Linha',
      'Centro',
      'Qtd Carteira (t)',
      'Qtd Consolidada (t)',
      'Lote Mínimo SAP (t)',
      'Falta para Mínimo (t)',
      'Unidade',
      'Curva ABC',
      'Data Necessidade',
      'Origem Lote Mínimo',
      'Última Atualização SAP',
      'Status',
    ]

    const linhas = itensOrdenados.map((it) => [
      `"${it.codigo_material}"`,
      `"${(it.descricao_material || '').replace(/"/g, '""')}"`,
      `"${it.carteira}"`,
      `"${it.clientes.join(', ').replace(/"/g, '""')}"`,
      `"${it.linha}"`,
      `"${it.centro}"`,
      formatNumberPTBR(it.quantidade_carteira_tons, 2),
      formatNumberPTBR(it.quantidade_consolidada_tons, 2),
      it.lote_minimo_tons !== null ? formatNumberPTBR(it.lote_minimo_tons, 2) : 'Não recebido',
      it.falta_para_minimo_tons > 0 ? formatNumberPTBR(it.falta_para_minimo_tons, 2) : '0,00',
      `"${it.unidade_medida}"`,
      `"${it.curva_abc}"`,
      `"${it.data_necessidade_mais_antiga}"`,
      `"${it.origem_lote_minimo}"`,
      `"${it.ultima_atualizacao_sap}"`,
      it.status_lote === 'SEM_PARAMETRIZACAO_SAP'
        ? '"⚠ Lote mínimo não recebido"'
        : it.status_lote === 'MINIMO_NAO_ATINGIDO'
          ? '"Mínimo não atingido"'
          : '"Mínimo atingido"',
    ])

    const csvContent =
      '\uFEFF' + [colunas.join(';'), ...linhas.map((l) => l.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `lote_minimo_${secaoAtiva.toLowerCase()}_${tituloVisao.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Análise IA PCP (Apoio à Decisão)
  const analiseIaTexto = useMemo(() => {
    const totalAbaixo = summary.total_materiais_abaixo_minimo
    const totalSemParam = summary.total_materiais_sem_minimo_sap
    const curvaA = summary.porCurvaAbc.A.count
    const topDéficit = summary.materiais_abaixo.slice(0, 3)

    return {
      diagnostico:
        totalAbaixo > 0
          ? `Identificados ${totalAbaixo} códigos de material abaixo do lote mínimo SAP na ${tituloVisao}, totalizando déficit de ${formatNumberPTBR(summary.total_toneladas_faltantes, 2)} t.`
          : `Nenhum material abaixo do lote mínimo SAP identificado na ${tituloVisao}.`,
      orientacoes: [
        curvaA > 0
          ? `Prioridade Alta: ${curvaA} material(is) Curva A demandam ${formatNumberPTBR(summary.porCurvaAbc.A.faltam_tons, 2)} t para viabilizar campanha de laminação sem descarte.`
          : 'Nenhum material Curva A com déficit de lote mínimo.',
        topDéficit.length > 0
          ? `Maiores déficits identificados: ${topDéficit.map((m) => `${m.codigo_material} (faltam ${formatNumberPTBR(m.falta_para_minimo_tons, 2)} t)`).join(', ')}.`
          : 'Sem pendências críticas de volume.',
        totalSemParam > 0
          ? `Inconsistência cadastral: ${totalSemParam} código(s) na carteira estão com status "⚠ Lote mínimo não recebido". Necessário acionar TI/SAP para conferência da RFC do material.`
          : 'Todos os códigos da carteira possuem lote mínimo retornado pela RFC SAP.',
      ],
    }
  }, [summary, tituloVisao])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] p-0 flex flex-col bg-white overflow-hidden rounded-2xl shadow-2xl border-slate-200">
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
                    Lote Mínimo de Produção &bull; Análise de Carteira
                  </DialogTitle>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs">
                    {tituloVisao}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white text-slate-600 border-slate-300"
                  >
                    Origem: SAP / RFC (Somente Leitura)
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Consolidação determinística por Código de Material SAP. Consulta direta à réplica
                  sincronizada do SAP ECC via RFC.
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

          {/* Abas Superiores de Separação de Conceitos (Regra 6 e 7) */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-200">
            <button
              onClick={() => setSecaoAtiva('NAO_ATINGIDO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                secaoAtiva === 'NAO_ATINGIDO'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>(a) Mínimo Não Atingido</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  secaoAtiva === 'NAO_ATINGIDO'
                    ? 'bg-amber-800 text-white'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {summary.total_materiais_abaixo_minimo}
              </span>
            </button>

            <button
              onClick={() => setSecaoAtiva('SEM_PARAMETRIZACAO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                secaoAtiva === 'SEM_PARAMETRIZACAO'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>(b) ⚠ Lote Mínimo Não Recebido</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  secaoAtiva === 'SEM_PARAMETRIZACAO'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {summary.total_materiais_sem_minimo_sap}
              </span>
            </button>

            <div className="ml-auto text-[11px] text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Apuração em tempo real</span>
            </div>
          </div>

          {/* Cards de Métricas Resumo */}
          {secaoAtiva === 'NAO_ATINGIDO' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-2 border-t border-amber-200/60">
              <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Materiais Abaixo do Mínimo
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-lg font-mono font-bold text-amber-900">
                    {formatNumberPTBR(summary.total_materiais_abaixo_minimo, 0)}
                  </strong>
                  <span className="text-[11px] text-slate-500 font-medium">códigos</span>
                </div>
              </div>

              <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">
                  Falta Total p/ Mínimo
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-lg font-mono font-bold text-rose-700">
                    {formatarToneladasPtBr(summary.total_toneladas_faltantes)}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 bg-white/90 rounded-xl border border-blue-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-blue-800 block">
                  Carteira Afetada
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-lg font-mono font-bold text-blue-900">
                    {formatarToneladasPtBr(summary.total_toneladas_carteira_afetada)}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 bg-white/90 rounded-xl border border-purple-200 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-purple-800 block">
                  Distribuição Curva ABC
                </span>
                <div className="flex items-center gap-2 mt-1 text-xs font-mono font-bold">
                  <span className="text-purple-700" title="Curva A">
                    A: {summary.porCurvaAbc.A.count}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-blue-700" title="Curva B">
                    B: {summary.porCurvaAbc.B.count}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-600" title="Curva C">
                    C: {summary.porCurvaAbc.C.count}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 pt-2 border-t border-slate-200">
              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-300 shadow-2xs col-span-2">
                <span className="text-[10px] uppercase font-bold text-amber-900 block flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                  Inconsistência de Dados &bull; Avaliação PCP / TI
                </span>
                <p className="text-xs text-amber-800 mt-0.5">
                  Estes códigos constam nos pedidos da carteira ativa, porém{' '}
                  <strong>não retornaram parâmetro de lote mínimo via RFC SAP</strong>. Por
                  governança rigorosa, nenhum valor é assumido, emprestado ou defaulted.
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-300 shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Volume Pendente de Cadastro
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <strong className="text-lg font-mono font-bold text-slate-900">
                    {formatarToneladasPtBr(summary.total_toneladas_sem_minimo_sap)}
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    em {summary.total_materiais_sem_minimo_sap} códigos
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Barra de Filtros */}
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
                  placeholder="Buscar código SAP, descrição ou cliente..."
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

              {secaoAtiva === 'NAO_ATINGIDO' && (
                <>
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

                  <button
                    onClick={() => setSomenteCriticos((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border ${
                      somenteCriticos
                        ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                        : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                    }`}
                  >
                    Somente críticos (Curva A / Déficit &gt; 15t)
                  </button>
                </>
              )}
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
                <option value="MAIOR_CARTEIRA">Maior quantidade carteira</option>
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

        {/* Conteúdo Principal da Tabela */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {itensOrdenados.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-300 rounded-xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">
                {secaoAtiva === 'NAO_ATINGIDO'
                  ? 'Nenhum material com mínimo não atingido com os filtros atuais'
                  : 'Nenhum material pendente de parametrização SAP com os filtros atuais'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {secaoAtiva === 'NAO_ATINGIDO'
                  ? 'Todos os materiais atingiram o lote mínimo de produção recebido do SAP RFC ou nenhum pedido satisfaz o filtro.'
                  : 'Todos os materiais presentes na carteira possuem lote mínimo retornado pela RFC SAP.'}
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
                      <th className="p-2.5 font-bold">Código Material</th>
                      <th className="p-2.5 font-bold">Descrição</th>
                      <th className="p-2.5 font-bold">Carteira</th>
                      <th className="p-2.5 font-bold">Cliente(s)</th>
                      <th className="p-2.5 font-bold text-center">Linha</th>
                      <th className="p-2.5 font-bold text-center">Centro</th>
                      <th className="p-2.5 font-bold text-right">Qtd. Carteira (t)</th>
                      <th className="p-2.5 font-bold text-right bg-blue-900/50">
                        Qtd. Consolidada (t)
                      </th>
                      <th className="p-2.5 font-bold text-right">Lote Mínimo SAP (t)</th>
                      <th className="p-2.5 font-bold text-right bg-rose-900/60">
                        Falta p/ Mínimo (t)
                      </th>
                      <th className="p-2.5 font-bold text-center">Curva</th>
                      <th className="p-2.5 font-bold text-center">Necessidade</th>
                      <th className="p-2.5 font-bold text-center">Origem Mínimo</th>
                      <th className="p-2.5 font-bold text-center">Status</th>
                      <th className="p-2.5 font-bold text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensOrdenados.map((item, idx) => {
                      const isExpanded = itemExpandidoCodigo === item.codigo_material
                      return (
                        <React.Fragment key={item.codigo_material}>
                          <tr
                            onClick={() =>
                              setItemExpandidoCodigo(isExpanded ? null : item.codigo_material)
                            }
                            className={`hover:bg-amber-50/40 transition-colors text-[11px] cursor-pointer ${
                              item.status_lote === 'SEM_PARAMETRIZACAO_SAP'
                                ? 'bg-slate-50/70'
                                : item.curva_abc === 'A'
                                  ? 'bg-rose-50/20'
                                  : idx % 2 === 0
                                    ? 'bg-white'
                                    : 'bg-slate-50/30'
                            }`}
                          >
                            <td className="p-2.5">
                              <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                {item.codigo_material}
                                {item.pedidos_consolidados_count > 1 && (
                                  <Badge className="bg-slate-100 text-slate-700 text-[9px] font-semibold border-slate-300">
                                    {item.pedidos_consolidados_count} ped.
                                  </Badge>
                                )}
                              </div>
                            </td>

                            <td className="p-2.5">
                              <span
                                className="text-[10px] text-slate-600 block truncate max-w-[200px]"
                                title={item.descricao_material}
                              >
                                {item.descricao_material}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <Badge variant="outline" className="text-[9px] font-semibold">
                                {item.carteira}
                              </Badge>
                            </td>

                            <td className="p-2.5">
                              <span
                                className="text-slate-800 font-medium block truncate max-w-[150px]"
                                title={item.clientes.join(', ')}
                              >
                                {item.clientes[0] || 'Diversos'}
                                {item.clientes.length > 1 && ` (+${item.clientes.length - 1})`}
                              </span>
                            </td>

                            <td className="p-2.5 text-center">
                              <Badge className="bg-slate-100 text-[#004C97] font-bold border-slate-200 text-[10px]">
                                {item.linha}
                              </Badge>
                            </td>

                            <td className="p-2.5 text-center font-mono text-slate-700">
                              {item.centro}
                            </td>

                            <td className="p-2.5 text-right font-mono text-slate-800 font-semibold">
                              {formatarToneladasPtBr(item.quantidade_carteira_tons)}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-[#004C97] bg-blue-50/50">
                              {formatarToneladasPtBr(item.quantidade_consolidada_tons)}
                            </td>

                            <td className="p-2.5 text-right font-mono text-slate-700">
                              {item.lote_minimo_tons !== null ? (
                                formatarToneladasPtBr(item.lote_minimo_tons)
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">
                                  Não recebido
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-right font-mono font-bold text-rose-700 bg-rose-50/50">
                              {item.falta_para_minimo_tons > 0 ? (
                                formatarToneladasPtBr(item.falta_para_minimo_tons)
                              ) : item.status_lote === 'SEM_PARAMETRIZACAO_SAP' ? (
                                <span className="text-slate-400">-</span>
                              ) : (
                                <span className="text-emerald-700">0,00 t</span>
                              )}
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

                            <td className="p-2.5 text-center font-mono text-slate-700 text-[10px]">
                              {item.data_necessidade_mais_antiga || '-'}
                            </td>

                            <td className="p-2.5 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-[10px] font-semibold text-slate-700">
                                  {item.origem_lote_minimo}
                                </span>
                                <span className="text-[8.5px] text-slate-400">
                                  {item.ultima_atualizacao_sap}
                                </span>
                              </div>
                            </td>

                            <td className="p-2.5 text-center">
                              {item.status_lote === 'SEM_PARAMETRIZACAO_SAP' ? (
                                <Badge className="bg-slate-200 text-slate-800 border-slate-300 text-[9.5px] font-bold gap-1">
                                  <HelpCircle className="w-2.5 h-2.5 text-amber-600" />⚠ Lote mínimo
                                  não recebido
                                </Badge>
                              ) : item.status_lote === 'MINIMO_NAO_ATINGIDO' ? (
                                <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9.5px] font-bold">
                                  Mínimo não atingido
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9.5px] font-bold">
                                  Mínimo atingido
                                </Badge>
                              )}
                            </td>

                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setItemExpandidoCodigo(isExpanded ? null : item.codigo_material)
                                }
                                className="h-6 px-1.5 text-[10px] text-slate-700 hover:text-[#004C97] font-semibold gap-0.5"
                                title="Ver detalhamento do material"
                              >
                                <span>{isExpanded ? 'Fechar' : 'Detalhes'}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </Button>
                            </td>
                          </tr>

                          {/* Bloco Expandido (Drill-down e IA PCP de Apoio à Decisão) */}
                          {isExpanded && (
                            <tr className="bg-slate-50/80 border-t border-b border-amber-200">
                              <td colSpan={15} className="p-4 space-y-3">
                                {/* Alerta IA PCP (Apoio à Decisão Estrito - Regra 8) */}
                                <div className="p-3 bg-linear-to-r from-blue-50/90 to-indigo-50/80 border border-blue-200 rounded-xl space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-[#004C97]">
                                      <Sparkles className="w-4 h-4 text-blue-600" />
                                      <span>
                                        Análise IA PCP &bull; Apoio à Decisão (Não Executora)
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 italic">
                                      Proibido alterar ou estimar parâmetros SAP. Apenas suporte ao
                                      programador.
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 leading-relaxed">
                                    {item.status_lote === 'SEM_PARAMETRIZACAO_SAP' ? (
                                      <span>
                                        O material <strong>{item.codigo_material}</strong> possui
                                        carteira consolidada de{' '}
                                        <strong>
                                          {formatarToneladasPtBr(item.quantidade_consolidada_tons)}
                                        </strong>{' '}
                                        ({item.pedidos_consolidados_count} pedidos), mas não recebeu
                                        lote mínimo da RFC SAP. Não é permitido criar estimativas ou
                                        emprestar mínimo de outro item. Sugere-se reportar ao TI/Key
                                        User SAP.
                                      </span>
                                    ) : (
                                      <span>
                                        O material <strong>{item.codigo_material}</strong> (Curva{' '}
                                        {item.curva_abc}) possui carteira de{' '}
                                        <strong>
                                          {formatarToneladasPtBr(item.quantidade_consolidada_tons)}
                                        </strong>{' '}
                                        frente ao lote mínimo SAP de{' '}
                                        <strong>
                                          {formatarToneladasPtBr(item.lote_minimo_tons)}
                                        </strong>
                                        . Faltam{' '}
                                        <strong className="text-rose-700 font-mono">
                                          {formatarToneladasPtBr(item.falta_para_minimo_tons)}
                                        </strong>{' '}
                                        para atingir a viabilidade de campanha industrial.
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {/* Seções de Drill-down por Material */}
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                  <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1">
                                    <button
                                      onClick={() => setAbaDrilldown('COMERCIAL')}
                                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
                                        abaDrilldown === 'COMERCIAL'
                                          ? 'bg-white text-[#004C97] border-t-2 border-t-[#004C97] border-x border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      Comercial ({item.pedidos_consolidados_count} pedido
                                      {item.pedidos_consolidados_count > 1 ? 's' : ''})
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
                                      onClick={() => setAbaDrilldown('HISTORICO')}
                                      className={`px-3 py-1.5 rounded-t-lg text-xs font-bold transition-colors ${
                                        abaDrilldown === 'HISTORICO'
                                          ? 'bg-white text-[#004C97] border-t-2 border-t-[#004C97] border-x border-slate-200'
                                          : 'text-slate-600 hover:text-slate-900'
                                      }`}
                                    >
                                      Rastreabilidade SAP RFC
                                    </button>
                                  </div>

                                  <div className="p-3 text-xs">
                                    {abaDrilldown === 'COMERCIAL' && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[11px] text-slate-600 pb-1 border-b border-slate-100">
                                          <span>
                                            Clientes atendidos por este código:{' '}
                                            <strong className="text-slate-900">
                                              {item.clientes.join(', ')}
                                            </strong>
                                          </span>
                                          <span>
                                            Consolidação determinística:{' '}
                                            <strong className="text-[#004C97] font-mono">
                                              {formatarToneladasPtBr(
                                                item.quantidade_consolidada_tons,
                                              )}
                                            </strong>
                                          </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">
                                          Os pedidos deste material somam{' '}
                                          {formatarToneladasPtBr(item.quantidade_consolidada_tons)}.
                                          Na lógica do PCP Robotizado, múltiplos pedidos do mesmo
                                          código compõem uma única ocorrência de material.
                                        </p>
                                      </div>
                                    )}

                                    {abaDrilldown === 'PCP' && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Alocação Industrial
                                          </span>
                                          <div className="text-xs space-y-0.5">
                                            <div>
                                              Linha de Produção:{' '}
                                              <strong className="text-slate-900">
                                                {item.linha}
                                              </strong>
                                            </div>
                                            <div>
                                              Centro Industrial:{' '}
                                              <strong className="text-slate-900">
                                                {item.centro}
                                              </strong>
                                            </div>
                                            <div>
                                              Curva ABC:{' '}
                                              <strong className="text-slate-900">
                                                Curva {item.curva_abc}
                                              </strong>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                            Governança do Lote Mínimo
                                          </span>
                                          <div className="text-xs space-y-0.5">
                                            <div>
                                              Fonte Oficial:{' '}
                                              <strong className="text-slate-900">
                                                SAP ECC / RFC
                                              </strong>
                                            </div>
                                            <div>
                                              Associação:{' '}
                                              <strong className="text-[#004C97] font-mono">
                                                Exclusivamente por Código de Material SAP
                                              </strong>
                                            </div>
                                            <div>
                                              Status do Mínimo:{' '}
                                              <span className="text-slate-700">
                                                {item.status_lote === 'SEM_PARAMETRIZACAO_SAP'
                                                  ? 'Pendente de parametrização no SAP'
                                                  : `Lote oficial de ${formatarToneladasPtBr(item.lote_minimo_tons)}`}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {abaDrilldown === 'HISTORICO' && (
                                      <div className="space-y-1 text-slate-600">
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-800">
                                              Origem do Registro:
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className="font-mono text-[10px]"
                                            >
                                              {item.origem_lote_minimo}
                                            </Badge>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1.5">
                                            <span className="text-slate-600">
                                              Última Sincronização SAP:
                                            </span>
                                            <span className="font-mono text-slate-900">
                                              {item.ultima_atualizacao_sap}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-2">
                                            Auditado via log de sincronização RFC. Nenhuma alteração
                                            manual é permitida no HUB CIAFAL.
                                          </div>
                                        </div>
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
            Exibindo <strong>{itensOrdenados.length}</strong> de <strong>{itensBase.length}</strong>{' '}
            materiais nesta seção
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
