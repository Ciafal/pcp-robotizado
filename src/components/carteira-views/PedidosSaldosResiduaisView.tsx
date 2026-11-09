/**
 * Visão: Pedidos com Saldos Residuais
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  SlidersHorizontal,
  Send,
  Sparkles,
  Search,
  RefreshCw,
  Eye,
  Clock,
  ArrowUpDown,
} from 'lucide-react'
import {
  PedidoCarteiraItem,
  ParametrosSaldoResidual,
  PARAMETROS_SALDO_RESIDUAL_PADRAO,
  StatusAnaliseCrm,
  CrmRevisionPendency,
  AnaliseIaResidual,
} from '@/types/pcp-pedidos-carteira'
import { PcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'
import {
  CARDS_CONFIG_SALDOS_RESIDUAIS,
  buildDrilldownSaldosResiduais,
  LinhaDrillPedido,
} from '@/components/carteira-views/drilldown-pedidos'
import {
  DrilldownCardModal,
  DrilldownCardConfig,
} from '@/components/carteira-views/DrilldownCardModal'
import { ParametrosSaldoResidualModal } from '@/components/carteira-views/ParametrosSaldoResidualModal'
import { AnaliseIaSaldosResiduaisModal } from '@/components/carteira-views/AnaliseIaSaldosResiduaisModal'
import { EnviarCrmResidualModal } from '@/components/carteira-views/EnviarCrmResidualModal'
import { ConsultarCrmResidualModal } from '@/components/carteira-views/ConsultarCrmResidualModal'
import { DetalhePedidoModal } from '@/components/carteira-views/DetalhePedidoModal'

const ITENS_POR_PAGINA = 25

const formatarMoeda = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(val || 0)
}

const formatarTons = (val: number) => {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0) + ' t'
  )
}

const formatarPercentual = (val: number) => {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0) + '%'
  )
}

const formatarDataPtBr = (iso?: string) => {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('pt-BR')
  } catch {
    return iso
  }
}

export const PedidosSaldosResiduaisView: React.FC = () => {
  const [todosItensCarteira, setTodosItensCarteira] = useState<PedidoCarteiraItem[]>([])
  const [parametros, setParametros] = useState<ParametrosSaldoResidual>(
    PARAMETROS_SALDO_RESIDUAL_PADRAO,
  )
  const [pendenciasCrmMap, setPendenciasCrmMap] = useState<Map<string, CrmRevisionPendency>>(
    new Map(),
  )
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('TODAS')
  const [filtroLinha, setFiltroLinha] = useState('TODAS')
  const [filtroStatusCrm, setFiltroStatusCrm] = useState('TODOS')
  const [filtroApenasVencidos, setFiltroApenasVencidos] = useState(false)

  const [colunaOrdenacao, setColunaOrdenacao] = useState<keyof PedidoCarteiraItem>('dias_em_atraso')
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<'asc' | 'desc'>('desc')
  const [paginaAtual, setPaginaAtual] = useState(1)

  const [itensSelecionadosIds, setItensSelecionadosIds] = useState<Set<string>>(new Set())

  const [modalParametrosAberto, setModalParametrosAberto] = useState(false)
  const [modalIaAberto, setModalIaAberto] = useState(false)
  const [modalEnviarCrmAberto, setModalEnviarCrmAberto] = useState(false)
  const [pendenciaEmConsulta, setPendenciaEmConsulta] = useState<CrmRevisionPendency | null>(null)
  const [pedidoEmDetalhe, setPedidoEmDetalhe] = useState<PedidoCarteiraItem | null>(null)

  const [cardDrilldownAberto, setCardDrilldownAberto] = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      const [paramsCarregados, itensCarregados] = await Promise.all([
        PcpPedidosCarteiraService.obterParametrosAtuais(),
        PcpPedidosCarteiraService.obterPedidosCarteira(),
      ])
      setParametros(paramsCarregados)

      const pendencias = await PcpPedidosCarteiraService.obterPendenciasCrmResiduais()
      const mapa = new Map<string, CrmRevisionPendency>()
      pendencias.forEach((p) => {
        const chave = `${p.sales_order_number}_${p.sales_order_item}`
        mapa.set(chave, p)
      })
      setPendenciasCrmMap(mapa)

      const itensComCrm = itensCarregados.map((item) => {
        const chave = `${item.pedido_sap}_${item.item_sap}`
        const pend = mapa.get(chave)
        if (pend) {
          return {
            ...item,
            status_analise_crm: pend.status,
            protocolo_crm: pend.protocol,
          }
        }
        return item
      })

      setTodosItensCarteira(itensComCrm)
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar dados da carteira SAP e parâmetros.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const todosItensResiduais = useMemo(() => {
    return PcpPedidosCarteiraService.filtrarItensResiduais(todosItensCarteira, parametros)
  }, [todosItensCarteira, parametros])

  const opcoesEmpresas = useMemo(() => {
    const s = new Set<string>()
    todosItensResiduais.forEach((i) => i.empresa && s.add(i.empresa))
    return Array.from(s).sort()
  }, [todosItensResiduais])

  const opcoesLinhas = useMemo(() => {
    const s = new Set<string>()
    todosItensResiduais.forEach((i) => i.linha && s.add(i.linha))
    return Array.from(s).sort()
  }, [todosItensResiduais])

  const itensFiltrados = useMemo(() => {
    return todosItensResiduais.filter((item) => {
      if (filtroEmpresa !== 'TODAS' && item.empresa !== filtroEmpresa) return false
      if (filtroLinha !== 'TODAS' && item.linha !== filtroLinha) return false
      if (filtroApenasVencidos && !item.atrasado) return false
      if (filtroStatusCrm !== 'TODOS') {
        const statusItem = item.status_analise_crm || 'SEM_PENDENCIA'
        if (statusItem !== filtroStatusCrm) return false
      }

      if (busca.trim()) {
        const q = busca.toLowerCase()
        const matchPedido = item.pedido_sap.toLowerCase().includes(q)
        const matchCliente = item.cliente_nome.toLowerCase().includes(q)
        const matchMaterial = item.material_codigo.toLowerCase().includes(q)
        const matchDesc = item.material_descricao.toLowerCase().includes(q)
        const matchLinha = item.linha.toLowerCase().includes(q)
        if (!matchPedido && !matchCliente && !matchMaterial && !matchDesc && !matchLinha) {
          return false
        }
      }

      return true
    })
  }, [
    todosItensResiduais,
    filtroEmpresa,
    filtroLinha,
    filtroStatusCrm,
    filtroApenasVencidos,
    busca,
  ])

  const itensOrdenados = useMemo(() => {
    return [...itensFiltrados].sort((a, b) => {
      let valA = a[colunaOrdenacao]
      let valB = b[colunaOrdenacao]

      if (typeof valA === 'string') {
        valA = (valA as string).toLowerCase()
        valB = ((valB as string) || '').toLowerCase()
      }

      if (valA === undefined || valA === null) return 1
      if (valB === undefined || valB === null) return -1

      if (valA < valB) return direcaoOrdenacao === 'asc' ? -1 : 1
      if (valA > valB) return direcaoOrdenacao === 'asc' ? 1 : -1
      return 0
    })
  }, [itensFiltrados, colunaOrdenacao, direcaoOrdenacao])

  const totalPaginas = Math.ceil(itensOrdenados.length / ITENS_POR_PAGINA) || 1
  const itensPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA
    return itensOrdenados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [itensOrdenados, paginaAtual])

  const alternarOrdenacao = (coluna: keyof PedidoCarteiraItem) => {
    if (colunaOrdenacao === coluna) {
      setDirecaoOrdenacao((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setColunaOrdenacao(coluna)
      setDirecaoOrdenacao('desc')
    }
    setPaginaAtual(1)
  }

  const kpisResiduais = useMemo(() => {
    return PcpPedidosCarteiraService.calcularKpisSaldosResiduais(
      todosItensResiduais,
      todosItensCarteira,
    )
  }, [todosItensResiduais, todosItensCarteira])

  const analiseIa = useMemo<AnaliseIaResidual>(() => {
    return PcpPedidosCarteiraService.gerarAnaliseIaResiduais(itensFiltrados)
  }, [itensFiltrados])

  const itensSelecionadosLista = useMemo(() => {
    return itensFiltrados.filter((i) => itensSelecionadosIds.has(i.id))
  }, [itensFiltrados, itensSelecionadosIds])

  const todosFiltradosSelecionados =
    itensFiltrados.length > 0 && itensFiltrados.every((i) => itensSelecionadosIds.has(i.id))

  const alternarSelecionarTodosFiltrados = () => {
    if (todosFiltradosSelecionados) {
      setItensSelecionadosIds(new Set())
    } else {
      const novoSet = new Set<string>()
      itensFiltrados.forEach((i) => novoSet.add(i.id))
      setItensSelecionadosIds(novoSet)
    }
  }

  const alternarSelecaoItem = (id: string) => {
    const novoSet = new Set(itensSelecionadosIds)
    if (novoSet.has(id)) {
      novoSet.delete(id)
    } else {
      novoSet.add(id)
    }
    setItensSelecionadosIds(novoSet)
  }

  const configDrilldownAtiva = useMemo<DrilldownCardConfig<LinhaDrillPedido> | null>(() => {
    if (!cardDrilldownAberto) return null
    return buildDrilldownSaldosResiduais(cardDrilldownAberto, todosItensResiduais, {
      totalPedidosComResidual: kpisResiduais.total_pedidos,
      totalItensResiduais: kpisResiduais.total_itens,
      saldoResidualTotalTons: kpisResiduais.saldo_total_t,
      valorFinanceiroResidualBrl: kpisResiduais.valor_total_rs,
      totalClientesComResiduais: kpisResiduais.total_clientes,
      pedidosResiduaisVencidos: kpisResiduais.pedidos_vencidos,
      percentualCarteiraEmResidual: kpisResiduais.percentual_carteira_total,
    })
  }, [cardDrilldownAberto, todosItensResiduais, kpisResiduais])

  const renderBadgeCrm = (status?: StatusAnaliseCrm) => {
    if (!status) {
      return <span className="text-[11px] text-slate-400 italic">Não enviado</span>
    }

    const mapaBadge: Record<
      StatusAnaliseCrm,
      { label: string; color: string; border: string; bg: string }
    > = {
      PENDENTE: {
        label: 'Pendente',
        color: 'text-amber-800',
        border: 'border-amber-300',
        bg: 'bg-amber-50',
      },
      EM_ANALISE: {
        label: 'Em análise',
        color: 'text-blue-800',
        border: 'border-blue-300',
        bg: 'bg-blue-50',
      },
      MANTER_PEDIDO: {
        label: 'Manter',
        color: 'text-purple-800',
        border: 'border-purple-300',
        bg: 'bg-purple-50',
      },
      SOLICITAR_AJUSTE: {
        label: 'Ajuste',
        color: 'text-orange-800',
        border: 'border-orange-300',
        bg: 'bg-orange-50',
      },
      SOLICITAR_CANCELAMENTO: {
        label: 'Cancelamento',
        color: 'text-rose-800',
        border: 'border-rose-300',
        bg: 'bg-rose-50',
      },
      CONCLUIDO: {
        label: 'Concluído',
        color: 'text-emerald-800',
        border: 'border-emerald-300',
        bg: 'bg-emerald-50',
      },
    }

    const b = mapaBadge[status] || mapaBadge.PENDENTE
    return (
      <Badge
        variant="outline"
        className={`${b.bg} ${b.color} ${b.border} text-[10px] font-semibold cursor-pointer hover:opacity-80`}
      >
        {b.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-700">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Pedidos com Saldos Residuais</h1>
            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-xs font-semibold">
              Critério: Saldo &le; {parametros.valor_saldo_t.toFixed(2)} t{' '}
              {parametros.relacao_logica} % &le; {parametros.valor_percentual.toFixed(1)}%
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de sobras de pedidos que impactam a programação, travam capacidade produtiva e
            exigem alinhamento comercial via CRM 360°.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalParametrosAberto(true)}
            className="text-xs border-[#004C97] text-[#004C97] hover:bg-blue-50 font-semibold"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            Parâmetros de Saldo Residual
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalIaAberto(true)}
            className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Análise IA de Saldos Residuais
          </Button>

          <Button
            size="sm"
            onClick={() => setModalEnviarCrmAberto(true)}
            disabled={itensSelecionadosLista.length === 0}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Enviar para Análise no CRM 360° ({itensSelecionadosLista.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={carregando}
            className="text-xs border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{erro}</span>
          </div>
          <Button size="sm" variant="outline" onClick={carregarDados} className="text-xs bg-white">
            Tentar novamente
          </Button>
        </div>
      )}

      {/* 7 Cards Executivos de Saldos Residuais com Drilldown */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {CARDS_CONFIG_SALDOS_RESIDUAIS.map((card) => {
          let valorFormatado = '-'
          let subtexto = ''

          switch (card.id) {
            case 'RESIDUAL_PEDIDOS':
              valorFormatado = kpisResiduais.total_pedidos.toLocaleString('pt-BR')
              subtexto = 'Ordens com saldo residual'
              break
            case 'RESIDUAL_ITENS':
              valorFormatado = kpisResiduais.total_itens.toLocaleString('pt-BR')
              subtexto = 'Linhas de pedido'
              break
            case 'RESIDUAL_SALDO_TONS':
              valorFormatado = formatarTons(kpisResiduais.saldo_total_t)
              subtexto = 'Volume físico em aberto'
              break
            case 'RESIDUAL_VALOR_RS':
              valorFormatado = formatarMoeda(kpisResiduais.valor_total_rs)
              subtexto = 'Receita remanescente'
              break
            case 'RESIDUAL_CLIENTES':
              valorFormatado = kpisResiduais.total_clientes.toLocaleString('pt-BR')
              subtexto = 'Clientes com resíduos'
              break
            case 'RESIDUAL_VENCIDOS':
              valorFormatado = kpisResiduais.pedidos_vencidos.toLocaleString('pt-BR')
              subtexto = 'Data prometida expirada'
              break
            case 'RESIDUAL_PERCENTUAL_CARTEIRA':
              valorFormatado = formatarPercentual(kpisResiduais.percentual_carteira_total)
              subtexto = 'Do total em aberto'
              break
          }

          return (
            <Card
              key={card.id}
              onClick={() => setCardDrilldownAberto(card.id)}
              className="p-3.5 border-slate-200 bg-white hover:border-[#004C97] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block group-hover:text-[#004C97] transition-colors truncate">
                  {card.titulo}
                </span>
                <span className="text-base font-black text-slate-900 font-mono mt-1 block">
                  {carregando ? '...' : valorFormatado}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block truncate">{subtexto}</span>
            </Card>
          )
        })}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value)
                setPaginaAtual(1)
              }}
              placeholder="Buscar por pedido, cliente, material, linha..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Select
              value={filtroEmpresa}
              onValueChange={(v) => {
                setFiltroEmpresa(v)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs w-36">
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas Empresas</SelectItem>
                {opcoesEmpresas.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtroLinha}
              onValueChange={(v) => {
                setFiltroLinha(v)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs w-32">
                <SelectValue placeholder="Linha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas Linhas</SelectItem>
                {opcoesLinhas.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filtroStatusCrm}
              onValueChange={(v) => {
                setFiltroStatusCrm(v)
                setPaginaAtual(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs w-44">
                <SelectValue placeholder="Status CRM" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos Status CRM</SelectItem>
                <SelectItem value="SEM_PENDENCIA">Sem Alerta CRM</SelectItem>
                <SelectItem value="PENDENTE">Pendente de Análise</SelectItem>
                <SelectItem value="EM_ANALISE">Em Análise Comercial</SelectItem>
                <SelectItem value="MANTER_PEDIDO">Manter Pedido</SelectItem>
                <SelectItem value="SOLICITAR_AJUSTE">Solicitar Ajuste</SelectItem>
                <SelectItem value="SOLICITAR_CANCELAMENTO">Solicitar Cancelamento</SelectItem>
                <SelectItem value="CONCLUIDO">Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={filtroApenasVencidos ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFiltroApenasVencidos((prev) => !prev)
                setPaginaAtual(1)
              }}
              className={`text-xs h-9 ${
                filtroApenasVencidos
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 mr-1" />
              Apenas Vencidos
            </Button>
          </div>
        </div>

        {/* Resumo de seleção e contagem */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800">
              {itensFiltrados.length} itens residuais encontrados
            </span>
            <span>&bull;</span>
            <span>
              Saldo:{' '}
              <strong className="text-[#004C97] font-mono">
                {formatarTons(itensFiltrados.reduce((a, b) => a + b.saldo_aberto_t, 0))}
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Valor:{' '}
              <strong className="text-emerald-700 font-mono">
                {formatarMoeda(itensFiltrados.reduce((a, b) => a + b.valor_saldo_rs, 0))}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {itensSelecionadosIds.size} de {itensFiltrados.length} selecionados
            </span>
            {itensSelecionadosIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setItensSelecionadosIds(new Set())}
                className="text-[11px] h-7 text-slate-500 hover:text-slate-800"
              >
                Limpar seleção
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Saldos Residuais com Checkbox */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <Checkbox
                    checked={todosFiltradosSelecionados}
                    onCheckedChange={alternarSelecionarTodosFiltrados}
                    aria-label="Selecionar todos os filtrados"
                  />
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('pedido_sap')}
                >
                  <div className="flex items-center gap-1">
                    Pedido / Item <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('cliente_nome')}
                >
                  <div className="flex items-center gap-1">
                    Cliente <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3">Material / Descrição</th>
                <th className="p-3">Linha / Centro</th>
                <th
                  className="p-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('quantidade_original_t')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Qtd. Orig. (t) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('quantidade_entregue_t')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Qtd. Entregue (t) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:text-slate-900 bg-rose-50/50"
                  onClick={() => alternarOrdenacao('saldo_aberto_t')}
                >
                  <div className="flex items-center justify-end gap-1 text-rose-900 font-bold">
                    Saldo Residual (t) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:text-slate-900 bg-rose-50/50"
                  onClick={() => alternarOrdenacao('percentual_residual')}
                >
                  <div className="flex items-center justify-end gap-1 text-rose-900 font-bold">
                    % Residual <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 text-right cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('valor_saldo_rs')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Valor Residual (R$) <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('data_prevista_entrega')}
                >
                  <div className="flex items-center gap-1">
                    Data Prevista <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="p-3 text-center cursor-pointer hover:text-slate-900"
                  onClick={() => alternarOrdenacao('dias_em_atraso')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Dias Atraso <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-center">Status CRM 360°</th>
                <th className="p-3 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carregando ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#004C97]" />
                    Carregando pedidos com saldos residuais da SAP RFC...
                  </td>
                </tr>
              ) : itensPaginados.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500">
                    Nenhum item com saldo residual encontrado para os filtros atuais.
                  </td>
                </tr>
              ) : (
                itensPaginados.map((item) => {
                  const selecionado = itensSelecionadosIds.has(item.id)
                  const chave = `${item.pedido_sap}_${item.item_sap}`
                  const pendencia = pendenciasCrmMap.get(chave)

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        selecionado ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <Checkbox
                          checked={selecionado}
                          onCheckedChange={() => alternarSelecaoItem(item.id)}
                          aria-label={`Selecionar ${item.pedido_sap}/${item.item_sap}`}
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800">
                        {item.pedido_sap} / {item.item_sap}
                      </td>
                      <td
                        className="p-3 font-medium text-slate-800 max-w-[180px] truncate"
                        title={item.cliente_nome}
                      >
                        {item.cliente_nome}
                      </td>
                      <td className="p-3 max-w-[200px]">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 block truncate">
                          {item.material_codigo}
                        </span>
                        <span
                          className="text-[11px] text-slate-500 block truncate"
                          title={item.material_descricao}
                        >
                          {item.material_descricao}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-700 block">{item.linha}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.centro}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {formatarTons(item.quantidade_original_t)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {formatarTons(item.quantidade_entregue_t)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700 bg-rose-50/40">
                        {formatarTons(item.saldo_aberto_t)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700 bg-rose-50/40">
                        {formatarPercentual(item.percentual_residual)}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700">
                        {formatarMoeda(item.valor_saldo_rs)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {formatarDataPtBr(item.data_prevista_entrega)}
                      </td>
                      <td className="p-3 text-center">
                        {item.atrasado ? (
                          <Badge variant="destructive" className="font-mono text-[10px]">
                            +{item.dias_em_atraso}d
                          </Badge>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium">No prazo</span>
                        )}
                      </td>
                      <td
                        className="p-3 text-center"
                        onClick={() => {
                          if (pendencia) setPendenciaEmConsulta(pendencia)
                        }}
                      >
                        {renderBadgeCrm(item.status_analise_crm)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPedidoEmDetalhe(item)}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-[#004C97]"
                          title="Ver detalhes completos do pedido"
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

        {/* Rodapé da Paginação */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Mostrando página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> (
            {itensFiltrados.length} itens residuais no total)
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              className="h-8 text-xs bg-white"
            >
              Anterior
            </Button>
            <span className="px-3 font-mono font-semibold text-slate-700">
              {paginaAtual} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
              className="h-8 text-xs bg-white"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Configuração de Parâmetros */}
      <ParametrosSaldoResidualModal
        isOpen={modalParametrosAberto}
        onClose={() => setModalParametrosAberto(false)}
        parametrosAtuais={parametros}
        onSalvar={(novos) => {
          setParametros(novos)
          setPaginaAtual(1)
        }}
        onAplicarSemSalvar={(temp) => {
          setParametros(temp)
          setPaginaAtual(1)
        }}
      />

      {/* Modal de Análise Cognitiva de IA */}
      <AnaliseIaSaldosResiduaisModal
        isOpen={modalIaAberto}
        onClose={() => setModalIaAberto(false)}
        analise={analiseIa}
      />

      {/* Modal de Envio para CRM 360° */}
      <EnviarCrmResidualModal
        isOpen={modalEnviarCrmAberto}
        onClose={() => setModalEnviarCrmAberto(false)}
        itensSelecionados={itensSelecionadosLista}
        onSucesso={() => {
          setItensSelecionadosIds(new Set())
          carregarDados()
        }}
      />

      {/* Modal de Consulta e Acompanhamento de CRM */}
      <ConsultarCrmResidualModal
        isOpen={!!pendenciaEmConsulta}
        onClose={() => setPendenciaEmConsulta(null)}
        pendencia={pendenciaEmConsulta}
        onAtualizado={carregarDados}
      />

      {/* Modal de Detalhes do Pedido */}
      <DetalhePedidoModal
        isOpen={!!pedidoEmDetalhe}
        onClose={() => setPedidoEmDetalhe(null)}
        pedido={pedidoEmDetalhe}
      />

      {/* Drilldown de Cards */}
      <DrilldownCardModal
        isOpen={!!cardDrilldownAberto && !!configDrilldownAtiva}
        onClose={() => setCardDrilldownAberto(null)}
        config={configDrilldownAtiva}
      />
    </div>
  )
}
