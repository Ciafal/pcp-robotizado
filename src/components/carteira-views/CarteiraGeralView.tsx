import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Eye,
  SlidersHorizontal,
  BarChart3,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  Package,
} from 'lucide-react'
import { CarteiraItem, StatusRuptura, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import {
  formatNumberPTBR,
  formatDatePTBR,
  formatCurrencyPTBR,
  formatPercentagePTBR,
} from '@/lib/formatters-ptbr'
import {
  CurvaAbcFaturamentoEngine,
  CurvaAbcResultadoConsolidado,
  ItemCurvaAbcCalculado,
} from '@/services/curva-abc-faturamento-engine'
import { CurvaAbcParametrosBackend } from '@/services/sap-carteira-rfc-service'
import { PortfolioCardsGrid, PortfolioCardMetric } from './PortfolioCardsGrid'
import { PortfolioDrilldown } from './PortfolioDrilldown'
import { PortfolioCharts } from './PortfolioCharts'
import { PortfolioABC } from './PortfolioABC'
import { PortfolioAISection } from './PortfolioAISection'

interface CarteiraGeralViewProps {
  itens: CarteiraItem[]
  entradasFuturas?: CarteiraEntradaFutura[]
  sdcItens?: CarteiraSDCItem[]
  isLoading?: boolean
  onOpenMemoria: (item: CarteiraItem) => void
  filtroMaterial?: string
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
  onAtualizarSap?: () => void
  parametrosCurvaAbc?: CurvaAbcParametrosBackend
  erroDisponibilidade?: boolean
  mensagemErro?: string
}

export const CarteiraGeralView: React.FC<CarteiraGeralViewProps> = ({
  itens,
  entradasFuturas = [],
  sdcItens = [],
  isLoading,
  onOpenMemoria,
  filtroMaterial,
  onOpenDetalheMaterial,
  onAtualizarSap,
  parametrosCurvaAbc,
  erroDisponibilidade,
  mensagemErro,
}) => {
  const [searchTerm, setSearchTerm] = useState(filtroMaterial || '')
  const [filtroLinha, setFiltroLinha] = useState<string>('TODAS')
  const [filtroCentro, setFiltroCentro] = useState<string>('TODOS')
  const [filtroTipo, setFiltroTipo] = useState<string>('TODOS')
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [filtroSaldo, setFiltroSaldo] = useState<'TODOS' | 'POSITIVO' | 'NEGATIVO'>('TODOS')
  const [filtroRuptura, setFiltroRuptura] = useState<string>('TODOS')
  const [filtroEspecial, setFiltroEspecial] = useState<
    'NENHUM' | 'DEFICIT' | 'SEM_PROG' | 'RUPTURA' | 'EXCESSO'
  >('NENHUM')
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const [pagina, setPagina] = useState(1)
  const itensPorPagina = 25

  // Modais analíticos
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)
  const [drilldownConfig, setDrilldownConfig] = useState<{
    isOpen: boolean
    nome: string
    descricao?: string
    itens: ItemCurvaAbcCalculado[]
  }>({
    isOpen: false,
    nome: '',
    itens: [],
  })

  // 1. Processar dados da Carteira Consolidada (Geral + SDC) pelo motor Curva ABC por faturamento
  const conjuntoBrutoConsolidado = useMemo(() => {
    return [...itens, ...sdcItens]
  }, [itens, sdcItens])

  const resultadoABC: CurvaAbcResultadoConsolidado = useMemo(() => {
    return CurvaAbcFaturamentoEngine.calcularCurvaAbc(conjuntoBrutoConsolidado, parametrosCurvaAbc)
  }, [conjuntoBrutoConsolidado, parametrosCurvaAbc])

  const todosItensCalculados = resultadoABC.itens

  // Centros e Linhas disponíveis
  const centrosDisponiveis = useMemo(() => {
    const s = new Set<string>()
    todosItensCalculados.forEach((i) => {
      if (i.centro) s.add(i.centro)
    })
    return Array.from(s).sort()
  }, [todosItensCalculados])

  const linhasDisponiveis = useMemo(() => {
    const s = new Set<string>()
    todosItensCalculados.forEach((i) => {
      if (i.linha) s.add(i.linha)
    })
    return Array.from(s).sort()
  }, [todosItensCalculados])

  // 2. Os 17 Cards Executivos Consolidados da Carteira Geral
  const cardsExecutivos: PortfolioCardMetric[] = useMemo(() => {
    const totalItens = todosItensCalculados.length
    const carteiraTotalT = todosItensCalculados.reduce((s, i) => s + i.carteira_tons, 0)
    const estoqueDisponivelT = todosItensCalculados.reduce(
      (s, i) => s + i.estoque_disponivel_tons,
      0,
    )
    const estoqueQualidadeT = todosItensCalculados.reduce((s, i) => s + i.estoque_qualidade_tons, 0)
    const estoqueBloqueadoT = todosItensCalculados.reduce((s, i) => s + i.estoque_bloqueado_tons, 0)
    const deficitAtualT = todosItensCalculados.reduce((s, i) => s + i.deficit_tons, 0)
    const itensComDeficitCount = todosItensCalculados.filter((i) => i.deficit_tons > 0).length
    const emProducaoT = todosItensCalculados.reduce((s, i) => s + i.em_producao_tons, 0)
    const coberturaProgramadaT = todosItensCalculados.reduce((s, i) => s + i.programado_tons, 0)
    const saldoProjetadoT = todosItensCalculados.reduce((s, i) => s + i.saldo_projetado_tons, 0)
    const itensCriticosCount = todosItensCalculados.filter((i) => i.risco === 'CRITICO').length
    const itensSemProgCount = todosItensCalculados.filter(
      (i) => i.deficit_tons > 0 && i.programado_tons === 0,
    ).length
    const itensRiscoRupturaCount = todosItensCalculados.filter(
      (i) => i.deficit_tons > 0 && i.saldo_projetado_tons < 0,
    ).length
    const valorTotalCarteiraBrl = resultadoABC.faturamentoTotal_brl
    const faturamentoRelacionadoBrl = resultadoABC.faturamentoTotal_brl

    return [
      {
        id: 'CARTEIRA_TOTAL',
        titulo: 'Carteira Total',
        valor: carteiraTotalT,
        tipoFormato: 'tonelada',
        cor: 'azul',
        subtitulo: 'Volume comercial aberto',
        tooltip:
          'Volume total da carteira comercial consolidada (L1, L2, MTO, Revenda, Importado e SDC)',
      },
      {
        id: 'TOTAL_ITENS',
        titulo: 'Qtd. Total de Itens',
        valor: totalItens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'padrao',
        subtitulo: 'Materiais distintos',
        tooltip: 'Quantidade de códigos de materiais distintos cadastrados na carteira',
      },
      {
        id: 'ESTOQUE_DISPONIVEL',
        titulo: 'Estoque Disponível',
        valor: estoqueDisponivelT,
        tipoFormato: 'tonelada',
        cor: 'verde',
        subtitulo: 'Pronto para faturamento',
        tooltip: 'Estoque físico livre deduzido de bloqueios e reservas',
      },
      {
        id: 'ESTOQUE_QUALIDADE',
        titulo: 'Estoque Qualidade',
        valor: estoqueQualidadeT,
        tipoFormato: 'tonelada',
        cor: 'amarelo',
        subtitulo: 'Em inspeção técnica',
        tooltip:
          'Lotes de material sob avaliação do controle de qualidade ou ensaios laboratoriais',
      },
      {
        id: 'ESTOQUE_BLOQUEADO',
        titulo: 'Estoque Bloqueado',
        valor: estoqueBloqueadoT,
        tipoFormato: 'tonelada',
        cor: 'vermelho',
        subtitulo: 'Retido comercial/SGQ',
        tooltip: 'Estoque com bloqueio comercial, financeiro ou por não conformidade técnica',
      },
      {
        id: 'DEFICIT_ATUAL',
        titulo: 'Déficit Atual',
        valor: deficitAtualT,
        tipoFormato: 'tonelada',
        cor: 'vermelho',
        badge: itensComDeficitCount > 0 ? `${itensComDeficitCount} itens` : undefined,
        badgeVariant: 'destructive',
        subtitulo: 'Demanda sem estoque físico',
        tooltip: 'Volume de pedidos que ultrapassam o estoque físico disponível atual',
      },
      {
        id: 'ITENS_COM_DEFICIT',
        titulo: 'Itens com Déficit',
        valor: itensComDeficitCount,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'vermelho',
        subtitulo: 'Materiais com saldo negativo',
        tooltip: 'Quantidade de materiais cujo saldo de estoque imediato é negativo',
      },
      {
        id: 'EM_PRODUCAO',
        titulo: 'Em Produção',
        valor: emProducaoT,
        tipoFormato: 'tonelada',
        cor: 'roxo',
        subtitulo: 'OPs em execução no chão',
        tooltip: 'Ordens de produção com apontamento iniciado na laminação CIAFAL ou SDC',
      },
      {
        id: 'COBERTURA_PROGRAMADA',
        titulo: 'Cobertura Programada',
        valor: coberturaProgramadaT,
        tipoFormato: 'tonelada',
        cor: 'azul',
        subtitulo: 'OPs no sequenciamento PCP',
        tooltip: 'Volume total de ordens programadas pelo PCP para entrega da carteira',
      },
      {
        id: 'SALDO_PROJETADO',
        titulo: 'Saldo Projetado',
        valor: saldoProjetadoT,
        tipoFormato: 'tonelada',
        cor: saldoProjetadoT < 0 ? 'vermelho' : 'verde',
        subtitulo: 'Estoque + Prog. - Carteira',
        tooltip:
          'Saldo final projetado considerando estoque livre mais produção programada menos pedidos',
      },
      {
        id: 'ITENS_CRITICOS',
        titulo: 'Itens Críticos',
        valor: itensCriticosCount,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'vermelho',
        badge: 'Risco Alto',
        badgeVariant: 'destructive',
        subtitulo: 'Risco imediato de ruptura',
        tooltip:
          'Materiais com ruptura iminente ou sem possibilidade de atendimento no prazo comercial',
      },
      {
        id: 'ITENS_SEM_PROGRAMACAO',
        titulo: 'Itens sem Programação',
        valor: itensSemProgCount,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'amarelo',
        subtitulo: 'Déficit sem OP no PCP',
        tooltip:
          'Produtos com déficit de estoque que ainda não possuem ordem de produção vinculada',
      },
      {
        id: 'ITENS_RISCO_RUPTURA',
        titulo: 'Risco de Ruptura',
        valor: itensRiscoRupturaCount,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'vermelho',
        subtitulo: 'Saldo projetado negativo',
        tooltip: 'Materiais onde a programação cadastrada é insuficiente para cobrir o déficit',
      },
      {
        id: 'VALOR_TOTAL_CARTEIRA',
        titulo: 'Valor Total da Carteira',
        valor: valorTotalCarteiraBrl,
        tipoFormato: 'moeda',
        cor: 'azul',
        subtitulo: 'Base faturamento R$',
        tooltip:
          'Faturamento total estimado da carteira com base no preço médio SAP ECC por família',
      },
      {
        id: 'FATURAMENTO_RELACIONADO',
        titulo: 'Faturamento Relacionado',
        valor: faturamentoRelacionadoBrl,
        tipoFormato: 'moeda',
        cor: 'padrao',
        subtitulo: 'Exposição comercial total',
        tooltip: 'Faturamento global associado ao lote de pedidos sob gestão',
      },
      {
        id: 'CURVA_A',
        titulo: 'Curva A',
        valor: resultadoABC.resumoA.quantidade_itens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'roxo',
        badge: `${formatPercentagePTBR(resultadoABC.resumoA.percentual_faturamento, 0)} fat.`,
        subtitulo: `Até ${parametrosCurvaAbc?.corteA_pct || 85}% do faturamento`,
        tooltip: `Materiais de maior relevância financeira comercial (concentram ${resultadoABC.resumoA.percentual_faturamento.toFixed(1)}% do faturamento)`,
      },
      {
        id: 'CURVA_B',
        titulo: 'Curva B',
        valor: resultadoABC.resumoB.quantidade_itens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'azul',
        badge: `${formatPercentagePTBR(resultadoABC.resumoB.percentual_faturamento, 0)} fat.`,
        subtitulo: `${parametrosCurvaAbc?.corteA_pct || 85}% a ${parametrosCurvaAbc?.corteB_pct || 95}%`,
        tooltip: `Materiais de relevância intermediária (concentram ${resultadoABC.resumoB.percentual_faturamento.toFixed(1)}% do faturamento)`,
      },
      {
        id: 'CURVA_C',
        titulo: 'Curva C',
        valor: resultadoABC.resumoC.quantidade_itens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'cinza',
        badge: `${formatPercentagePTBR(resultadoABC.resumoC.percentual_faturamento, 0)} fat.`,
        subtitulo: `Acima de ${parametrosCurvaAbc?.corteB_pct || 95}%`,
        tooltip: `Materiais de cauda longa (concentram ${resultadoABC.resumoC.percentual_faturamento.toFixed(1)}% do faturamento)`,
      },
    ]
  }, [todosItensCalculados, resultadoABC, parametrosCurvaAbc])

  // Drill-down dos cards executivos
  const handleCardClick = (cardId: string) => {
    switch (cardId) {
      case 'CARTEIRA_TOTAL':
      case 'TOTAL_ITENS':
      case 'VALOR_TOTAL_CARTEIRA':
      case 'FATURAMENTO_RELACIONADO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Carteira Total Consolidada',
          descricao: 'Todos os materiais com ordens abertas no SAP ECC ZSD28C',
          itens: todosItensCalculados,
        })
        break
      case 'ESTOQUE_DISPONIVEL':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Estoque Disponível',
          descricao: 'Produtos com disponibilidade física imediata para faturamento',
          itens: todosItensCalculados.filter((i) => i.estoque_disponivel_tons > 0),
        })
        break
      case 'ESTOQUE_QUALIDADE':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais em Inspeção de Qualidade',
          descricao: 'Lotes sob retenção do controle de qualidade',
          itens: todosItensCalculados.filter((i) => i.estoque_qualidade_tons > 0),
        })
        break
      case 'ESTOQUE_BLOQUEADO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Estoque Bloqueado',
          descricao: 'Materiais retidos por bloqueio comercial, de qualidade ou apontamento',
          itens: todosItensCalculados.filter((i) => i.estoque_bloqueado_tons > 0),
        })
        break
      case 'DEFICIT_ATUAL':
      case 'ITENS_COM_DEFICIT':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Déficit Físico Atual',
          descricao: 'Itens com necessidade de reposição imediata (carteira supera estoque)',
          itens: todosItensCalculados.filter((i) => i.deficit_tons > 0),
        })
        break
      case 'EM_PRODUCAO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Produção em Chão de Fábrica',
          descricao: 'Ordens em processamento nas linhas de laminação CIAFAL ou SDC',
          itens: todosItensCalculados.filter((i) => i.em_producao_tons > 0),
        })
        break
      case 'COBERTURA_PROGRAMADA':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Cobertura Programada no PCP',
          descricao: 'Itens com ordens programadas cadastradas no sequenciamento',
          itens: todosItensCalculados.filter((i) => i.programado_tons > 0),
        })
        break
      case 'SALDO_PROJETADO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Saldo Projetado Negativo',
          descricao: 'Produtos com déficit final mesmo após considerar as OPs programadas',
          itens: todosItensCalculados.filter((i) => i.saldo_projetado_tons < 0),
        })
        break
      case 'ITENS_CRITICOS':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais em Nível Crítico',
          descricao: 'Produtos sob risco imediato de ruptura no horizonte de entrega',
          itens: todosItensCalculados.filter((i) => i.risco === 'CRITICO'),
        })
        break
      case 'ITENS_SEM_PROGRAMACAO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Déficits sem Programação PCP',
          descricao: 'Materiais que demandam inserção prioritária no sequenciamento semanal',
          itens: todosItensCalculados.filter((i) => i.deficit_tons > 0 && i.programado_tons === 0),
        })
        break
      case 'ITENS_RISCO_RUPTURA':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Risco de Ruptura',
          descricao: 'Programação insuficiente para saldar os pedidos em aberto',
          itens: todosItensCalculados.filter(
            (i) => i.deficit_tons > 0 && i.saldo_projetado_tons < 0,
          ),
        })
        break
      case 'CURVA_A':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais da Curva A',
          descricao: `Itens de alta relevância (até ${parametrosCurvaAbc?.corteA_pct || 85}% do faturamento)`,
          itens: todosItensCalculados.filter((i) => i.curva_abc === 'A'),
        })
        break
      case 'CURVA_B':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais da Curva B',
          descricao: `Itens de relevância intermediária (${parametrosCurvaAbc?.corteA_pct || 85}% a ${
            parametrosCurvaAbc?.corteB_pct || 95
          }%)`,
          itens: todosItensCalculados.filter((i) => i.curva_abc === 'B'),
        })
        break
      case 'CURVA_C':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais da Curva C',
          descricao: `Itens de cauda longa (acima de ${parametrosCurvaAbc?.corteB_pct || 95}%)`,
          itens: todosItensCalculados.filter((i) => i.curva_abc === 'C'),
        })
        break
      default:
        break
    }
  }

  // Filtragem da tabela consolidada
  const itensFiltrados = useMemo(() => {
    return todosItensCalculados.filter((it) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchMat = it.codigo_material.toLowerCase().includes(term)
        const matchDesc = it.descricao_material.toLowerCase().includes(term)
        const matchCli = (it.cliente || '').toLowerCase().includes(term)
        if (!matchMat && !matchDesc && !matchCli) return false
      }

      if (filtroLinha !== 'TODAS' && it.linha !== filtroLinha) return false
      if (filtroCentro !== 'TODOS' && it.centro !== filtroCentro) return false
      if (filtroCurva !== 'TODAS' && it.curva_abc !== filtroCurva) return false

      if (filtroSaldo === 'POSITIVO' && it.saldo_atual_tons <= 0) return false
      if (filtroSaldo === 'NEGATIVO' && it.saldo_atual_tons >= 0) return false

      if (filtroRuptura !== 'TODOS' && it.risco !== filtroRuptura) return false

      if (filtroEspecial === 'DEFICIT' && it.deficit_tons <= 0) return false
      if (filtroEspecial === 'SEM_PROG' && (it.deficit_tons <= 0 || it.programado_tons > 0))
        return false
      if (filtroEspecial === 'RUPTURA' && (it.deficit_tons <= 0 || it.saldo_projetado_tons >= 0))
        return false
      if (filtroEspecial === 'EXCESSO' && it.saldo_projetado_tons <= it.carteira_tons * 1.5)
        return false

      return true
    })
  }, [
    todosItensCalculados,
    searchTerm,
    filtroLinha,
    filtroCentro,
    filtroCurva,
    filtroSaldo,
    filtroRuptura,
    filtroEspecial,
  ])

  const totalPaginas = Math.ceil(itensFiltrados.length / itensPorPagina) || 1
  const itensExibidos = itensFiltrados.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina)

  // Disparar abertura de detalhe do material original se for CarteiraItem
  const handleAbrirDetalhe = (itemCalc: ItemCurvaAbcCalculado) => {
    if (itemCalc.origemItemOriginal) {
      if ('ordem_venda' in itemCalc.origemItemOriginal && onOpenDetalheMaterial) {
        onOpenDetalheMaterial(itemCalc.origemItemOriginal as CarteiraItem)
        return
      }
    }
    // Fallback: abrir memória de cálculo
    const ci = itens.find((i) => i.codigo_material === itemCalc.codigo_material)
    if (ci) {
      onOpenMemoria(ci)
    }
  }

  // Estado de indisponibilidade oficial da RFC SAP ECC
  if (!isLoading && (erroDisponibilidade || (itens.length === 0 && sdcItens.length === 0))) {
    return (
      <Card className="bg-white border-amber-300 rounded-xl p-8 sm:p-12 text-center shadow-xs space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold text-slate-900">
            {mensagemErro || 'Não foi possível consultar a carteira no SAP.'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Status de contingência: a integração SAP ECC via RFC (referência ZSD28C) está em
            processamento ou aguardando resposta do gateway corporativo. Em conformidade com as
            regras do PCP Robotizado, não são gerados dados fictícios.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            onClick={onAtualizarSap}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 px-4"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações Rápidas: Botões Análise Gráfica & Curva ABC */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#004C97] text-white text-xs font-bold">Visão Consolidada</Badge>
          <span className="text-xs text-slate-600 hidden sm:inline">
            Síntese operacional: Laminação L1, L2, Encomenda MTO, Revenda, Importados e SDC.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsChartsOpen(true)}
            className="h-8 text-xs font-bold border-blue-300 text-[#004C97] hover:bg-blue-50 gap-1.5 shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#004C97]" /> Análise Gráfica
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAbcOpen(true)}
            className="h-8 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" /> Curva ABC (Pareto)
          </Button>
        </div>
      </div>

      {/* Bloco Alertas & IA • Análise Automática da Carteira Geral */}
      <PortfolioAISection
        resultadoABC={resultadoABC}
        onFiltrarMaterial={(mat) => {
          setSearchTerm(mat)
          setPagina(1)
        }}
        onOpenCurvaAbcModal={() => setIsAbcOpen(true)}
      />

      {/* Grid de 17 Cards Executivos Consolidados */}
      <PortfolioCardsGrid cards={cardsExecutivos} onCardClick={handleCardClick} />

      {/* Barra de Filtros Combináveis */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPagina(1)
                  }}
                  placeholder="Buscar material, descrição ou cliente..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97] bg-white"
                />
              </div>

              {/* Filtro Curva ABC [Todos | A | B | C] */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                {(['TODAS', 'A', 'B', 'C'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setFiltroCurva(c)
                      setPagina(1)
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                      filtroCurva === c
                        ? 'bg-[#004C97] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {c === 'TODAS' ? 'ABC: Todos' : `Curva ${c}`}
                  </button>
                ))}
              </div>

              {/* Filtros Especiais Rápidos */}
              <select
                value={filtroEspecial}
                onChange={(e) => {
                  setFiltroEspecial(e.target.value as any)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="NENHUM">Condição: Todas</option>
                <option value="DEFICIT">Apenas com Déficit</option>
                <option value="SEM_PROG">Déficit sem Programação</option>
                <option value="RUPTURA">Risco de Ruptura (Proj. Negativo)</option>
                <option value="EXCESSO">Estoque Excessivo (&gt;150%)</option>
              </select>

              <select
                value={filtroLinha}
                onChange={(e) => {
                  setFiltroLinha(e.target.value)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Linhas: Todas</option>
                {linhasDisponiveis.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <select
                value={filtroCentro}
                onChange={(e) => {
                  setFiltroCentro(e.target.value)
                  setPagina(1)
                }}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Centros: Todos</option>
                {centrosDisponiveis.map((c) => (
                  <option key={c} value={c}>
                    Centro {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMostrarColunasTemporais(!mostrarColunasTemporais)}
                className={`h-7 text-xs gap-1 border-slate-300 ${
                  mostrarColunasTemporais
                    ? 'bg-blue-50 text-[#004C97] font-bold border-blue-300'
                    : 'text-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Colunas: Cobertura Temporal</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFiltroLinha('TODAS')
                  setFiltroCentro('TODOS')
                  setFiltroTipo('TODOS')
                  setFiltroCurva('TODAS')
                  setFiltroSaldo('TODOS')
                  setFiltroRuptura('TODOS')
                  setFiltroEspecial('NENHUM')
                  setPagina(1)
                }}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 text-xs h-7"
              >
                Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Consolidada de Materiais */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px] select-none">
              <tr>
                <th className="p-2.5 font-bold">Material / Descrição</th>
                <th className="p-2.5 font-bold text-center">Linha</th>
                <th className="p-2.5 font-bold text-center">Centro</th>
                <th className="p-2.5 font-bold text-center">Curva ABC</th>
                <th className="p-2.5 font-bold text-right">Carteira (t)</th>
                <th className="p-2.5 font-bold text-right">Estoque Disp. (t)</th>
                <th className="p-2.5 font-bold text-right">Programado (t)</th>
                <th className="p-2.5 font-bold text-right">Déficit (t)</th>
                <th className="p-2.5 font-bold text-right">Saldo Proj. (t)</th>
                <th className="p-2.5 font-bold text-right">Faturamento (R$)</th>
                <th className="p-2.5 font-bold text-right">% Indiv.</th>
                <th className="p-2.5 font-bold text-center">Risco</th>
                <th className="p-2.5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensExibidos.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-500">
                    Nenhum material encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                itensExibidos.map((it, idx) => (
                  <tr
                    key={it.codigo_material + idx}
                    onClick={() => handleAbrirDetalhe(it)}
                    className={`hover:bg-blue-50/50 transition-colors text-[11px] cursor-pointer ${
                      it.curva_abc === 'A' && it.deficit_tons > 0
                        ? 'bg-rose-50/30'
                        : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="p-2.5">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        {it.codigo_material}
                        {it.curva_abc === 'A' && (
                          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[9px] font-bold">
                            A
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block truncate max-w-[220px]">
                        {it.descricao_material}
                      </span>
                    </td>

                    <td className="p-2.5 text-center">
                      <Badge className="bg-slate-100 text-[#004C97] font-bold border-slate-200 text-[10px]">
                        {it.linha}
                      </Badge>
                    </td>

                    <td className="p-2.5 text-center font-mono text-slate-600">{it.centro}</td>

                    <td className="p-2.5 text-center font-bold">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                          it.curva_abc === 'A'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : it.curva_abc === 'B'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {it.curva_abc}
                      </span>
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-blue-950">
                      {formatNumberPTBR(it.carteira_tons, 2)}
                    </td>

                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatNumberPTBR(it.estoque_disponivel_tons, 2)}
                    </td>

                    <td className="p-2.5 text-right font-mono text-indigo-700 font-semibold">
                      {formatNumberPTBR(it.programado_tons, 2)}
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {it.deficit_tons > 0 ? formatNumberPTBR(it.deficit_tons, 2) : '-'}
                    </td>

                    <td
                      className={`p-2.5 text-right font-mono font-bold ${
                        it.saldo_projetado_tons < 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {formatNumberPTBR(it.saldo_projetado_tons, 2)}
                    </td>

                    <td className="p-2.5 text-right font-mono text-slate-900">
                      {formatCurrencyPTBR(it.faturamento_brl)}
                    </td>

                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatPercentagePTBR(it.participacao_individual_pct, 2)}
                    </td>

                    <td className="p-2.5 text-center">
                      <Badge
                        className={`text-[9px] font-bold ${
                          it.risco === 'CRITICO'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : it.risco === 'ATENCAO'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {it.risco}
                      </Badge>
                    </td>

                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAbrirDetalhe(it)}
                        className="h-6 px-2 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
                      >
                        <Eye className="w-3 h-3" /> Ficha
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Exibindo <strong>{itensExibidos.length}</strong> de{' '}
            <strong>{itensFiltrados.length}</strong> materiais
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={pagina === 1}
              onClick={() => setPagina(pagina - 1)}
              className="h-7 text-xs border-slate-300"
            >
              Anterior
            </Button>
            <span className="px-2 font-mono text-xs">
              {pagina} / {totalPaginas}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pagina === totalPaginas}
              onClick={() => setPagina(pagina + 1)}
              className="h-7 text-xs border-slate-300"
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>

      {/* Modal Drilldown Reutilizável */}
      <PortfolioDrilldown
        isOpen={drilldownConfig.isOpen}
        onClose={() => setDrilldownConfig((prev) => ({ ...prev, isOpen: false }))}
        indicadorNome={drilldownConfig.nome}
        indicadorDescricao={drilldownConfig.descricao}
        itens={drilldownConfig.itens}
        onOpenDetalheMaterialOriginal={handleAbrirDetalhe}
      />

      {/* Modal Análise Gráfica Reutilizável */}
      <PortfolioCharts
        isOpen={isChartsOpen}
        onClose={() => setIsChartsOpen(false)}
        tituloCarteira="Carteira Consolidada"
        itens={todosItensCalculados}
        onSelectMaterial={handleAbrirDetalhe}
        onDrilldownGrupo={(grupoNome, grupoItens) => {
          setIsChartsOpen(false)
          setDrilldownConfig({
            isOpen: true,
            nome: grupoNome,
            descricao: `Detalhamento dos materiais do grupo ${grupoNome}`,
            itens: grupoItens,
          })
        }}
      />

      {/* Modal Curva ABC (Pareto) Reutilizável */}
      <PortfolioABC
        isOpen={isAbcOpen}
        onClose={() => setIsAbcOpen(false)}
        resultadoABC={resultadoABC}
        onSelectMaterial={handleAbrirDetalhe}
        onDrilldownFaixa={(faixa, faixaItens) => {
          setIsAbcOpen(false)
          setDrilldownConfig({
            isOpen: true,
            nome: `Materiais da Curva ${faixa}`,
            descricao: `Materiais classificados na faixa ${faixa} por faturamento comercial`,
            itens: faixaItens,
          })
        }}
      />
    </div>
  )
}
export default CarteiraGeralView
