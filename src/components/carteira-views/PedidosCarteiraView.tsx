/**
 * Visão Oficial: Pedidos em Carteira (Tópico 1)
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 *
 * Funcionalidades:
 * - Cards com drill-down: Total de Pedidos, Total de Itens, Quantidade em Carteira (t),
 *   Valor Total em Carteira (R$), Pedidos com Saldo Residual, Pedidos com Atraso,
 *   Pedidos com Déficit de Estoque, Pedidos com Cobertura Disponível.
 * - Tabela analítica completa com cabeçalho fixo, pesquisa, paginação e ordenação.
 * - Filtros rápidos: Linha, Centro, Status, Família, Atraso, Residual.
 * - Análise de IA da Carteira em modal dedicado.
 * - Detalhe do pedido com histórico de remessas e especificações técnicas.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  Layers,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpDown,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PedidoCarteiraAnalitico,
  KpisPedidosCarteira,
  KpisPedidosSaldosResiduais,
  PARAMETROS_SALDO_RESIDUAL_PADRAO,
} from '@/types/pcp-pedidos-carteira'
import { PcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'
import { DrilldownCardModal, DrilldownCardConfig } from './DrilldownCardModal'
import { buildDrilldownPedidosCarteira, LinhaDrillPedido } from './drilldown-pedidos'
import { AnaliseIaPedidosCarteiraModal } from './AnaliseIaPedidosCarteiraModal'
import { DetalhePedidoModal } from './DetalhePedidoModal'

export const PedidosCarteiraView: React.FC = () => {
  const [carregando, setCarregando] = useState(true)
  const [itens, setItens] = useState<PedidoCarteiraAnalitico[]>([])
  const [kpis, setKpis] = useState<KpisPedidosCarteira>({
    totalPedidos: 0,
    totalItens: 0,
    quantidadeTotalCarteiraTons: 0,
    valorTotalCarteiraBrl: 0,
    pedidosComSaldoResidual: 0,
    pedidosComAtraso: 0,
    pedidosComDeficitEstoque: 0,
    pedidosComCoberturaDisponivel: 0,
  })
  const [timestamp, setTimestamp] = useState('')
  const [fonteIndisponivel, setFonteIndisponivel] = useState(false)

  // Filtros locais
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [filtroLinha, setFiltroLinha] = useState('TODAS')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [filtroFamilia, setFiltroFamilia] = useState('TODAS')

  // Paginação e Ordenação
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 25
  const [ordenacao, setOrdenacao] = useState<{
    campo: keyof PedidoCarteiraAnalitico
    direcao: 'asc' | 'desc'
  }>({
    campo: 'dias_atraso',
    direcao: 'desc',
  })

  // Modais
  const [drillConfig, setDrillConfig] = useState<DrilldownCardConfig<LinhaDrillPedido> | null>(null)
  const [isDrillOpen, setIsDrillOpen] = useState(false)
  const [isIaModalOpen, setIsIaModalOpen] = useState(false)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoCarteiraAnalitico | null>(null)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const res = await PcpPedidosCarteiraService.carregarPedidosAnaliticos()
      setItens(res.itens)
      setKpis(res.kpisCarteira)
      setTimestamp(res.timestamp)
      setFonteIndisponivel(!!res.fonteIndisponivel)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      setFonteIndisponivel(true)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Linhas e Famílias únicas para os selects
  const listaLinhas = useMemo(() => {
    const set = new Set<string>()
    itens.forEach((i) => i.linha && set.add(i.linha))
    return Array.from(set).sort()
  }, [itens])

  const listaFamilias = useMemo(() => {
    const set = new Set<string>()
    itens.forEach((i) => i.familia && set.add(i.familia))
    return Array.from(set).sort()
  }, [itens])

  // Filtragem da tabela
  const itensFiltrados = useMemo(() => {
    const q = termoPesquisa.toLowerCase().trim()
    return itens.filter((it) => {
      if (filtroLinha !== 'TODAS' && it.linha !== filtroLinha) return false
      if (filtroFamilia !== 'TODAS' && it.familia !== filtroFamilia) return false
      if (filtroStatus !== 'TODOS') {
        if (filtroStatus === 'ATRASADO' && !it.tem_atraso) return false
        if (filtroStatus === 'RESIDUAL' && !it.eh_saldo_residual) return false
        if (filtroStatus === 'DEFICIT' && !it.tem_deficit_estoque) return false
        if (filtroStatus === 'COBERTURA' && !it.tem_cobertura_disponivel) return false
      }
      if (q) {
        const matchPedido = it.pedido_sap.toLowerCase().includes(q)
        const matchCliente =
          it.nome_cliente.toLowerCase().includes(q) || it.codigo_cliente.toLowerCase().includes(q)
        const matchMaterial =
          it.codigo_material.toLowerCase().includes(q) ||
          it.descricao_material.toLowerCase().includes(q)
        if (!matchPedido && !matchCliente && !matchMaterial) return false
      }
      return true
    })
  }, [itens, termoPesquisa, filtroLinha, filtroFamilia, filtroStatus])

  // Ordenação
  const itensOrdenados = useMemo(() => {
    return [...itensFiltrados].sort((a, b) => {
      const vA = a[ordenacao.campo]
      const vB = b[ordenacao.campo]

      if (typeof vA === 'number' && typeof vB === 'number') {
        return ordenacao.direcao === 'asc' ? vA - vB : vB - vA
      }
      return ordenacao.direcao === 'asc'
        ? String(vA).localeCompare(String(vB))
        : String(vB).localeCompare(String(vA))
    })
  }, [itensFiltrados, ordenacao])

  // Paginação
  const totalPaginas = Math.ceil(itensOrdenados.length / itensPorPagina) || 1
  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return itensOrdenados.slice(inicio, inicio + itensPorPagina)
  }, [itensOrdenados, paginaAtual, itensPorPagina])

  const alternarOrdenacao = (campo: keyof PedidoCarteiraAnalitico) => {
    setOrdenacao((prev) => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc',
    }))
  }

  const abrirDrill = (cardId: string) => {
    const config = buildDrilldownPedidosCarteira(cardId, itens, kpis)
    setDrillConfig(config)
    setIsDrillOpen(true)
  }

  const fmtT = (v: number) => `${formatNumberPTBR(v, 2)} t`
  const fmtMoeda = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Visão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#004C97] bg-blue-50 px-2.5 py-1 rounded">
              PCP Robotizado • ZSD28C
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">
              {timestamp
                ? `Atualizado em ${new Date(timestamp).toLocaleTimeString('pt-BR')}`
                : 'Sincronizado'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-[#004C97]" />
            Pedidos em Carteira
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Visão detalhada de ordens de venda, faturamentos acumulados, saldos abertos e
            priorização de capacidade.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={carregando}
            className="text-xs h-9 border-slate-300 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Sincronizar SAP
          </Button>

          <Button
            size="sm"
            onClick={() => setIsIaModalOpen(true)}
            className="bg-gradient-to-r from-[#004C97] to-cyan-600 hover:opacity-95 text-white text-xs h-9 font-medium shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-200" />
            Análise IA da Carteira
          </Button>
        </div>
      </div>

      {/* Alerta de fonte indisponível (nunca 0,00 silencioso) */}
      {fonteIndisponivel && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <strong>Aviso de Conectividade SAP:</strong> A RFC de carteira está operando com dados
            em cache seguro. Algumas alterações recentes do SAP ECC podem sofrer atraso de
            sincronização.
          </div>
        </div>
      )}

      {/* GRID DE CARDS COM DRILL-DOWN EXECUTIVO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Card 1: Total Pedidos */}
        <div
          onClick={() => abrirDrill('TOTAL_PEDIDOS')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-[#004C97] hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total de Pedidos
            </span>
            <FileSpreadsheet className="w-4 h-4 text-[#004C97] opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {kpis.totalPedidos.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-[#004C97] mt-1 font-medium flex items-center gap-1">
            Clique para drill-down analítico
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#004C97]" />
        </div>

        {/* Card 2: Total Itens */}
        <div
          onClick={() => abrirDrill('TOTAL_ITENS')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-[#004C97] hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total de Itens
            </span>
            <Layers className="w-4 h-4 text-cyan-600 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {kpis.totalItens.toLocaleString('pt-BR')}
          </div>
          <div className="text-[11px] text-cyan-700 mt-1 font-medium flex items-center gap-1">
            Linhas ativas na carteira
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-cyan-600" />
        </div>

        {/* Card 3: Qtd Carteira (t) */}
        <div
          onClick={() => abrirDrill('QUANTIDADE_CARTEIRA')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-[#004C97] hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Volume em Carteira
            </span>
            <Package className="w-4 h-4 text-[#004C97] opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {fmtT(kpis.quantidadeTotalCarteiraTons)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">
            Saldo aberto oficial SAP
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#004C97]" />
        </div>

        {/* Card 4: Valor Total (R$) */}
        <div
          onClick={() => abrirDrill('VALOR_TOTAL_CARTEIRA')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-600 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Valor Total Carteira
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-bold text-emerald-800 mt-2 truncate">
            {fmtMoeda(kpis.valorTotalCarteiraBrl)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            Faturamento contratado
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600" />
        </div>

        {/* Card 5: Pedidos com Saldo Residual */}
        <div
          onClick={() => abrirDrill('SALDO_RESIDUAL')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Saldo Residual
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2">
            {kpis.pedidosComSaldoResidual}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            Itens ≤ 2,00 t ou ≤ 5,00%
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>

        {/* Card 6: Pedidos com Atraso */}
        <div
          onClick={() => abrirDrill('PEDIDOS_ATRASO')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-red-500 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pedidos com Atraso
            </span>
            <Clock className="w-4 h-4 text-red-500 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-red-900 mt-2">{kpis.pedidosComAtraso}</div>
          <div className="text-[11px] text-red-600 mt-1 font-medium">Data prevista vencida</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500" />
        </div>

        {/* Card 7: Déficit de Estoque */}
        <div
          onClick={() => abrirDrill('DEFICIT_ESTOQUE')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-orange-500 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Déficit de Estoque
            </span>
            <AlertTriangle className="w-4 h-4 text-orange-500 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-orange-900 mt-2">
            {kpis.pedidosComDeficitEstoque}
          </div>
          <div className="text-[11px] text-orange-700 mt-1 font-medium">
            Exige produção imediata
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500" />
        </div>

        {/* Card 8: Cobertura Disponível */}
        <div
          onClick={() => abrirDrill('COBERTURA_DISPONIVEL')}
          className="group p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Cobertura Disponível
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 opacity-80 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2">
            {kpis.pedidosComCoberturaDisponivel}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium">
            Prontos para faturamento
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>
      </div>

      {/* BARRA DE FILTROS E PESQUISA */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={termoPesquisa}
              onChange={(e) => {
                setTermoPesquisa(e.target.value)
                setPaginaAtual(1)
              }}
              placeholder="Pesquisar pedido SAP, cliente, código ou descrição de material..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro Linha */}
            <Select
              value={filtroLinha}
              onValueChange={(v) => {
                setFiltroLinha(v)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Linha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Linhas</SelectItem>
                {listaLinhas.map((l) => (
                  <SelectItem key={l} value={l}>
                    Linha {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro Família */}
            <Select
              value={filtroFamilia}
              onValueChange={(v) => {
                setFiltroFamilia(v)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue placeholder="Família" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as Famílias</SelectItem>
                {listaFamilias.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro Status Operacional */}
            <Select
              value={filtroStatus}
              onValueChange={(v) => {
                setFiltroStatus(v)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="ATRASADO">Em Atraso</SelectItem>
                <SelectItem value="RESIDUAL">Saldo Residual</SelectItem>
                <SelectItem value="DEFICIT">Déficit de Estoque</SelectItem>
                <SelectItem value="COBERTURA">Cobertura Disponível</SelectItem>
              </SelectContent>
            </Select>

            {(termoPesquisa ||
              filtroLinha !== 'TODAS' ||
              filtroFamilia !== 'TODAS' ||
              filtroStatus !== 'TODOS') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTermoPesquisa('')
                  setFiltroLinha('TODAS')
                  setFiltroFamilia('TODAS')
                  setFiltroStatus('TODOS')
                  setPaginaAtual(1)
                }}
                className="text-xs text-slate-500 hover:text-slate-800 h-9"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Exibindo <strong>{itensOrdenados.length}</strong> de <strong>{itens.length}</strong>{' '}
            itens de pedido
          </span>
          <span>
            Página {paginaAtual} de {totalPaginas}
          </span>
        </div>
      </div>

      {/* TABELA ANALÍTICA DE PEDIDOS EM CARTEIRA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th
                  onClick={() => alternarOrdenacao('pedido_sap')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Pedido / Item</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('nome_cliente')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('codigo_material')}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Material / Descrição</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center">Linha</th>
                <th
                  onClick={() => alternarOrdenacao('qtd_original_t')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Qtd Orig (t)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('qtd_entregue_t')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Entregue (t)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('saldo_aberto_t')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Saldo Aberto (t)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('percentual_residual')}
                  className="py-3 px-2 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>% Resid</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('data_prevista')}
                  className="py-3 px-3 text-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Data Prev</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => alternarOrdenacao('valor_saldo_brl')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Valor Saldo (R$)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensPaginados.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400">
                    Nenhum pedido encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensPaginados.map((it) => (
                  <tr key={it.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#004C97]">
                      {it.pedido_sap} / {it.item_sap}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {it.nome_cliente}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {it.codigo_cliente}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-mono text-[11px] font-bold text-slate-800">
                        {it.codigo_material}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                        {it.descricao_material}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {it.familia} • {it.bitola}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {it.linha}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                      {fmtT(it.qtd_original_t)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-medium">
                      {fmtT(it.qtd_entregue_t)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#004C97]">
                      {fmtT(it.saldo_aberto_t)}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span
                        className={`text-[11px] font-medium ${
                          it.eh_saldo_residual ? 'text-amber-700 font-bold' : 'text-slate-600'
                        }`}
                      >
                        {formatNumberPTBR(it.percentual_residual, 1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="text-slate-800 font-medium">{it.data_prevista}</div>
                      {it.tem_atraso && (
                        <span className="text-[10px] text-red-600 font-semibold block">
                          +{it.dias_atraso}d atraso
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {fmtMoeda(it.valor_saldo_brl)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {it.tem_atraso ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 text-[10px]">
                          Atrasado
                        </Badge>
                      ) : it.eh_saldo_residual ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                          Residual
                        </Badge>
                      ) : it.tem_cobertura_disponivel ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px]">
                          Coberto
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-800 hover:bg-blue-50 border-blue-200 text-[10px]">
                          {it.status}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPedidoSelecionado(it)}
                        className="h-7 w-7 p-0 text-[#004C97] hover:bg-blue-50"
                        title="Ver detalhes do pedido e entregas"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Paginação */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500">
            Mostrando {itensPaginados.length} itens (página {paginaAtual} de {totalPaginas})
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              className="h-8 text-xs px-3"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Anterior
            </Button>
            <span className="text-xs font-semibold px-2 text-slate-700">
              {paginaAtual} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
              className="h-8 text-xs px-3"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL DE DRILL-DOWN PADRÃO DA CIAFAL */}
      <DrilldownCardModal
        isOpen={isDrillOpen}
        onClose={() => setIsDrillOpen(false)}
        config={drillConfig}
      />

      {/* MODAL DE DIAGNÓSTICO IA */}
      <AnaliseIaPedidosCarteiraModal
        isOpen={isIaModalOpen}
        onClose={() => setIsIaModalOpen(false)}
        itens={itensFiltrados}
        kpis={kpis}
      />

      {/* MODAL DE DETALHE DO PEDIDO */}
      <DetalhePedidoModal
        pedido={pedidoSelecionado}
        isOpen={!!pedidoSelecionado}
        onClose={() => setPedidoSelecionado(null)}
      />
    </div>
  )
}
