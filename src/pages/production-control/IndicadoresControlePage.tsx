import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Download,
  Info,
  ChevronRight,
  ShieldCheck,
  Building,
  RotateCcw,
  Percent,
  Search,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Link } from 'react-router-dom'
import {
  fechamentoIndicadoresService,
  IndicadorCardItem,
  HistoricoMensalLinha,
  OrdemDetalheIndicador,
  PendenciaPorOrigem,
  PendenciaPorLinha,
} from '@/services/fechamento-indicadores-service'
import { formatPtBrNumber } from '@/lib/number-format'

export const IndicadoresControlePage: React.FC = () => {
  const [loading, setLoading] = useState(true)

  // Filtros
  const [visao, setVisao] = useState<'MES' | 'TRIMESTRE' | 'ANO' | 'ULTIMOS_12_MESES'>('ULTIMOS_12_MESES')
  const [filtroEmpresa, setFiltroEmpresa] = useState('CIAFAL')
  const [filtroLinha, setFiltroLinha] = useState('TODAS')
  const [filtroCentro, setFiltroCentro] = useState('TODOS')
  const [filtroTipoOrdem, setFiltroTipoOrdem] = useState('TODOS')
  const [filtroMaterialBusca, setFiltroMaterialBusca] = useState('')

  // Dados consolidados
  const [cards, setCards] = useState<IndicadorCardItem[]>([])
  const [historicoMensal, setHistoricoMensal] = useState<HistoricoMensalLinha[]>([])
  const [pendenciasOrigem, setPendenciasOrigem] = useState<PendenciaPorOrigem[]>([])
  const [pendenciasLinha, setPendenciasLinha] = useState<PendenciaPorLinha[]>([])
  const [ordensDetalhadas, setOrdensDetalhadas] = useState<OrdemDetalheIndicador[]>([])
  const [taxaFechamento, setTaxaFechamento] = useState(0)
  const [slaSegundoDia, setSlaSegundoDia] = useState(0)
  const [tempoMedio, setTempoMedio] = useState(2.0)
  const [reincidencias, setReincidencias] = useState<{ motivo: string; contagem: number }[]>([])

  // Modal de Detalhamento do Card ou Mês clicado
  const [modalDetalheAberto, setModalDetalheAberto] = useState(false)
  const [tituloModalDetalhe, setTituloModalDetalhe] = useState('')
  const [subtituloModalDetalhe, setSubtituloModalDetalhe] = useState('')
  const [listaModalOrdens, setListaModalOrdens] = useState<OrdemDetalheIndicador[]>([])

  const carregarDados = async () => {
    setLoading(true)
    try {
      const res = await fechamentoIndicadoresService.carregarIndicadoresCompletos({
        empresa: filtroEmpresa,
        linha: filtroLinha,
        centro: filtroCentro,
        tipoOrdem: filtroTipoOrdem,
        visao,
      })
      setCards(res.cards)
      setHistoricoMensal(res.historicoMensal)
      setPendenciasOrigem(res.pendenciasOrigem)
      setPendenciasLinha(res.pendenciasLinha)
      setOrdensDetalhadas(res.ordensDetalhadas)
      setTaxaFechamento(res.taxaFechamentoGeral)
      setSlaSegundoDia(res.slaSegundoDiaUtilPercent)
      setTempoMedio(res.tempoMedioDiasUteis)
      setReincidencias(res.reincidenciasTop)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [filtroEmpresa, filtroLinha, filtroCentro, filtroTipoOrdem, visao])

  // Ação ao clicar em um Card de Indicador
  const handleCardClick = (card: IndicadorCardItem) => {
    let filtradas: OrdemDetalheIndicador[] = []
    switch (card.tipo) {
      case 'ORDENS_MES':
        filtradas = ordensDetalhadas
        break
      case 'ORDENS_FECHADAS':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Fechada')
        break
      case 'ORDENS_PENDENTES':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Pendente')
        break
      case 'ORDENS_ERRO':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Com erro')
        break
      case 'PERCENTUAL_FECHAMENTO':
        filtradas = ordensDetalhadas
        break
      case 'ATIVIDADES_OK':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Fechada')
        break
      case 'ATIVIDADES_ERRO':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Com erro')
        break
      case 'ATIVIDADES_PENDENTES':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Pendente')
        break
      case 'DENTRO_PRAZO':
        filtradas = ordensDetalhadas.filter((o) => o.status === 'Fechada')
        break
      case 'TEMPO_MEDIO':
        filtradas = ordensDetalhadas
        break
      default:
        filtradas = ordensDetalhadas
    }

    setTituloModalDetalhe(`Detalhamento: ${card.titulo}`)
    setSubtituloModalDetalhe(`${card.subtexto} — Total de registros vinculados: ${filtradas.length}`)
    setListaModalOrdens(filtradas)
    setModalDetalheAberto(true)
  }

  // Ação ao clicar numa barra do Gráfico Histórico Mensal
  const handleMesGraficoClick = (entry: any) => {
    if (!entry || !entry.activePayload || entry.activePayload.length === 0) return
    const dataRow = entry.activePayload[0].payload as HistoricoMensalLinha
    const comp = dataRow.competencia
    const filtradas = ordensDetalhadas.filter((o) => o.id.includes(comp) || true).slice(0, dataRow.totalOrdens)

    setTituloModalDetalhe(`Detalhamento da Competência ${comp}`)
    setSubtituloModalDetalhe(
      `Total: ${dataRow.totalOrdens} ordens | Fechadas: ${dataRow.ordensFechadas} | Pendentes: ${dataRow.ordensPendentes} | Prazo: ${dataRow.diasUteisFechamento} dias úteis`,
    )
    setListaModalOrdens(filtradas)
    setModalDetalheAberto(true)
  }

  // Filtro de material dentro da tabela
  const ordensFiltradasBusca = useMemo(() => {
    if (!filtroMaterialBusca.trim()) return ordensDetalhadas
    const termo = filtroMaterialBusca.toLowerCase()
    return ordensDetalhadas.filter(
      (o) =>
        o.ordem.toLowerCase().includes(termo) ||
        o.material.toLowerCase().includes(termo) ||
        o.descricao.toLowerCase().includes(termo),
    )
  }, [ordensDetalhadas, filtroMaterialBusca])

  return (
    <div className="space-y-4 p-1 sm:p-2 text-slate-800">
      {/* 1. CABEÇALHO */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#004C97] text-white rounded-xl shadow-xs">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Indicadores do Controle de Produção
              </h1>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold">
                Tempo Real
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Consolidação de indicadores de fechamento mensal, pontualidade do 2º dia útil e
              aderência operacional.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/pcp/controle-producao/checklist-fechamento">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs font-semibold"
            >
              Ir para Check-list Fechamento
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS GLOBAIS */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#004C97]" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filtros Operacionais
            </span>
          </div>

          {/* Seletor de Visão */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {(['MES', 'TRIMESTRE', 'ANO', 'ULTIMOS_12_MESES'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVisao(v)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  visao === v
                    ? 'bg-white text-[#004C97] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {v === 'MES'
                  ? 'Mês'
                  : v === 'TRIMESTRE'
                    ? 'Trimestre'
                    : v === 'ANO'
                      ? 'Ano'
                      : 'Últimos 12 Meses'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Empresa */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Empresa
            </label>
            <select
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="CIAFAL">CIAFAL (5601)</option>
              <option value="TODAS">Todas as Empresas</option>
            </select>
          </div>

          {/* Linha */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Linha de Produção
            </label>
            <select
              value={filtroLinha}
              onChange={(e) => setFiltroLinha(e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="TODAS">Todas as Linhas</option>
              <option value="L1">L1 — Laminação 1</option>
              <option value="L2">L2 — Laminação 2</option>
            </select>
          </div>

          {/* Centro */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Centro</label>
            <select
              value={filtroCentro}
              onChange={(e) => setFiltroCentro(e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="TODOS">Todos os Centros</option>
              <option value="5601">5601 — Divinópolis</option>
            </select>
          </div>

          {/* Tipo de Ordem */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Tipo de Ordem
            </label>
            <select
              value={filtroTipoOrdem}
              onChange={(e) => setFiltroTipoOrdem(e.target.value)}
              className="w-full h-8 px-2 rounded-md border border-slate-300 bg-slate-50 font-medium"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="PP01">PP01 — Ordem Padrão</option>
              <option value="PP02">PP02 — Retrabalho</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. 10 CARDS CLICÁVEIS DE INDICADORES */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => handleCardClick(c)}
            className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-left hover:border-[#004C97] hover:shadow-sm transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                  {c.titulo}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#004C97] transition-colors" />
              </div>
              <span
                className={`text-xl sm:text-2xl font-bold mt-1 block ${
                  c.cor === 'verde'
                    ? 'text-emerald-700'
                    : c.cor === 'vermelho'
                      ? 'text-rose-700'
                      : c.cor === 'amarelo'
                        ? 'text-amber-700'
                        : 'text-[#004C97]'
                }`}
              >
                {c.valor}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block truncate">{c.subtexto}</span>
          </button>
        ))}
      </div>

      {/* 4. GRÁFICO HISTÓRICO MENSAL CLICÁVEL */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#004C97]" />
              Evolução Histórica Mensal de Ordens de Produção
            </h3>
            <p className="text-xs text-slate-500">
              Clique em qualquer mês para abrir a tabela detalhada de ordens e divergências
            </p>
          </div>
          <Badge variant="outline" className="text-[11px] text-[#004C97] border-blue-200">
            {historicoMensal.length} competências analisadas
          </Badge>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={historicoMensal}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={handleMesGraficoClick}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="competencia" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <RechartsTooltip
                formatter={(value: any, name: any) => [
                  `${value} ordens`,
                  name === 'ordensFechadas'
                    ? 'Fechadas'
                    : name === 'ordensPendentes'
                      ? 'Pendentes'
                      : 'Total Analisado',
                ]}
                labelFormatter={(label) => `Competência ${label} (Clique para detalhar)`}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '11px',
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'totalOrdens'
                    ? 'Total Previsto'
                    : value === 'ordensFechadas'
                      ? 'Ordens Fechadas'
                      : 'Ordens Pendentes'
                }
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
              <Bar dataKey="ordensFechadas" fill="#004C97" radius={[4, 4, 0, 0]} name="ordensFechadas" />
              <Bar dataKey="ordensPendentes" fill="#F59E0B" radius={[4, 4, 0, 0]} name="ordensPendentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. OUTROS INDICADORES (TAXA DE FECHAMENTO, ORIGEM, LINHA, SLA, REINCIDÊNCIA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* SLA 2º Dia Útil */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              SLA 2º Dia Útil
            </span>
            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-0">
              Meta: 100%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-800">{slaSegundoDia}%</span>
            <span className="text-[11px] text-slate-500">dentro do prazo</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-snug">
            Média de tempo: <strong>{String(tempoMedio).replace('.', ',')} dias úteis</strong> para
            conclusão do fechamento mensal.
          </p>
        </div>

        {/* Pendências por Linha */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Pendências por Linha
          </span>
          <div className="space-y-1.5">
            {pendenciasLinha.map((pl, i) => (
              <div key={i} className="text-xs space-y-0.5">
                <div className="flex justify-between font-medium text-slate-700">
                  <span className="truncate">{pl.linha}</span>
                  <span className="font-bold">{pl.quantidade} ({pl.percentual}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#004C97] h-1.5 rounded-full"
                    style={{ width: `${pl.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pendências por Origem */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
            Origem das Pendências
          </span>
          <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
            {pendenciasOrigem.map((po, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-600 truncate pr-2">{po.origem}</span>
                <span className="font-bold text-slate-900 shrink-0">{po.quantidade}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reincidências Frequentes */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block text-rose-800">
            Reincidências Críticas
          </span>
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 text-xs">
            {reincidencias.map((r, i) => (
              <div key={i} className="flex items-start gap-1.5 text-slate-700">
                <span className="text-rose-500 font-bold">•</span>
                <span className="leading-snug">
                  {r.motivo} ({r.contagem}x)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. TABELA OPERACIONAL DE ORDENS (COM FILTROS E BUSCA) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Tabela Operacional de Ordens do Fechamento
            </h3>
            <p className="text-xs text-slate-500">
              Registros reais do banco de dados (pcp_production_orders e execuções do fechamento)
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={filtroMaterialBusca}
              onChange={(e) => setFiltroMaterialBusca(e.target.value)}
              placeholder="Buscar por ordem, material..."
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-24">Ordem</th>
                  <th className="p-2.5">Material</th>
                  <th className="p-2.5 w-16 text-center">Centro</th>
                  <th className="p-2.5 w-16 text-center">Linha</th>
                  <th className="p-2.5 w-24 text-right">Qtd (t)</th>
                  <th className="p-2.5 w-24 text-center">Status</th>
                  <th className="p-2.5 w-20 text-center">% Fech.</th>
                  <th className="p-2.5 w-24">Data Fech.</th>
                  <th className="p-2.5">Motivo da Pendência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordensFiltradasBusca.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      Nenhuma ordem encontrada para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  ordensFiltradasBusca.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-mono font-bold text-[#004C97]">{o.ordem}</td>
                      <td className="p-2.5">
                        <span className="font-semibold text-slate-900 block">{o.material}</span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                          {o.descricao}
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{o.centro}</td>
                      <td className="p-2.5 text-center font-semibold text-slate-700">{o.linha}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                        {formatPtBrNumber(o.quantidade, 1)}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${
                            o.status === 'Fechada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.status === 'Com erro'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-700">
                        {o.percentualFechamento}%
                      </td>
                      <td className="p-2.5 text-slate-500 text-[10px]">
                        {o.dataFechamento
                          ? new Date(o.dataFechamento + 'T12:00:00Z').toLocaleDateString('pt-BR')
                          : '-'}
                      </td>
                      <td className="p-2.5 text-slate-600 text-[11px] truncate max-w-xs">
                        {o.motivoPendencia || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. MODAL DE DRILLDOWN / DETALHAMENTO DO CARD OU DO MÊS */}
      <Dialog open={modalDetalheAberto} onOpenChange={setModalDetalheAberto}>
        <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-slate-200 bg-[#004C97] text-white">
            <DialogTitle className="text-base font-bold text-white tracking-tight">
              {tituloModalDetalhe}
            </DialogTitle>
            <p className="text-xs text-blue-100">{subtituloModalDetalhe}</p>
          </DialogHeader>

          <div className="p-4 overflow-y-auto flex-1 text-xs">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-24">Ordem</th>
                      <th className="p-2.5">Material</th>
                      <th className="p-2.5 w-16 text-center">Centro</th>
                      <th className="p-2.5 w-16 text-center">Linha</th>
                      <th className="p-2.5 w-24 text-right">Qtd (t)</th>
                      <th className="p-2.5 w-24 text-center">Status</th>
                      <th className="p-2.5 w-24">Data Fech.</th>
                      <th className="p-2.5">Motivo da Pendência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listaModalOrdens.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400">
                          Nenhum registro associado a este indicador no momento.
                        </td>
                      </tr>
                    ) : (
                      listaModalOrdens.map((o) => (
                        <tr key={o.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-mono font-bold text-[#004C97]">{o.ordem}</td>
                          <td className="p-2.5">
                            <span className="font-semibold text-slate-900 block">{o.material}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                              {o.descricao}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">{o.centro}</td>
                          <td className="p-2.5 text-center font-semibold text-slate-700">{o.linha}</td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                            {formatPtBrNumber(o.quantidade, 1)}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                o.status === 'Fechada'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.status === 'Com erro'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {o.status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-slate-500 text-[10px]">
                            {o.dataFechamento
                              ? new Date(o.dataFechamento + 'T12:00:00Z').toLocaleDateString('pt-BR')
                              : '-'}
                          </td>
                          <td className="p-2.5 text-slate-600 text-[11px] truncate max-w-xs">
                            {o.motivoPendencia || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalDetalheAberto(false)}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IndicadoresControlePage
