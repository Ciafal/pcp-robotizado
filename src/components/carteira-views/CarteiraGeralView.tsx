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
  Info,
} from 'lucide-react'
import { CarteiraItem, StatusRuptura, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { formatNumberPTBR, formatDatePTBR, formatPercentagePTBR } from '@/lib/formatters-ptbr'
import {
  CurvaAbcFaturamentoEngine,
  CurvaAbcResultadoConsolidado,
  ItemCurvaAbcCalculado,
} from '@/services/curva-abc-faturamento-engine'
import {
  OPCOES_ORDENACAO_CARTEIRA_GERAL,
  OrdenacaoCarteiraGeralOpcao,
  enriquecerItensCarteiraGeral,
  ordenarItensCarteiraGeral,
  ItemCarteiraGeralEnriquecido,
} from '@/services/carteira-geral-ordenacao-engine'
import { CurvaAbcParametrosBackend } from '@/services/sap-carteira-rfc-service'
import { PortfolioCardsGrid, PortfolioCardMetric } from './PortfolioCardsGrid'
import { PortfolioDrilldown } from './PortfolioDrilldown'
import { PortfolioCharts } from './PortfolioCharts'
import { PortfolioABC } from './PortfolioABC'
import { PortfolioAISection } from './PortfolioAISection'
import { MinimoNaoAtingidoCard } from './MinimoNaoAtingidoCard'
import {
  SaldoSemiacabadoCard,
  saldoSemiacabadoItemTons,
  TOOLTIP_SALDO_SEMIACABADO,
} from './SaldoSemiacabadoCard'
import { MinimoNaoAtingidoModal } from './MinimoNaoAtingidoModal'
import { useSapMaterialLoteMinimo } from '@/hooks/use-sap-material-lote-minimo'
import {
  calcularMinimoNaoAtingido,
  MinimoNaoAtingidoSummary,
} from '@/services/carteira-minimo-nao-atingido-engine'
import { resolverCarteiraItem } from '@/lib/carteira-item-helper'

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
  const [ordenarPor, setOrdenarPor] = useState<OrdenacaoCarteiraGeralOpcao>('MATERIAL_DESCRICAO')
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const [pagina, setPagina] = useState(1)
  const itensPorPagina = 25

  // Modais analíticos
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)
  const [isMinimoModalOpen, setIsMinimoModalOpen] = useState(false)
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

  // Réplica oficial SAP do lote mínimo sincronizado via RFC
  const { replicaMap: replicaSapLoteMinimo } = useSapMaterialLoteMinimo()

  // Cálculo reativo do indicador Mínimo Não Atingido para a Carteira Geral
  const resumoMinimoNaoAtingido: MinimoNaoAtingidoSummary = useMemo(() => {
    return calcularMinimoNaoAtingido({
      itens: [...itens, ...sdcItens],
      tipoVisao: 'Geral',
      replicaSapPorCodigo: replicaSapLoteMinimo,
    })
  }, [itens, sdcItens, replicaSapLoteMinimo])

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

  // Saldo Semiacabado consolidado (Geral + SDC). Fonte: campo real da carteira
  // populado pelo motor. Sem dupla contagem: soma por material apenas uma vez
  // (Semi CIAFAL/consolidado + Semi Vallourec), nunca re-somando o estoque disponível.
  const saldoSemiacabadoConsolidado = useMemo(() => {
    const mapa = new Map<string, number>()
    todosItensCalculados.forEach((i) => {
      const orig = i.origemItemOriginal as CarteiraItem | undefined
      if (orig) {
        const atual = mapa.get(i.codigo_material) || 0
        mapa.set(i.codigo_material, atual + saldoSemiacabadoItemTons(orig))
      }
    })
    const totalT = Array.from(mapa.values()).reduce((a, b) => a + b, 0)
    const materiaisCount = Array.from(mapa.values()).filter((v) => v > 0).length
    return { totalT, materiaisCount }
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
    let faturamentoFisicoTotalT = 0
    let erroFaturamentoFisico = false
    try {
      faturamentoFisicoTotalT = todosItensCalculados.reduce((acc, it) => {
        const orig = it.origemItemOriginal as CarteiraItem | undefined
        const faturado =
          orig && typeof orig.qtd_faturada_tons === 'number' && !isNaN(orig.qtd_faturada_tons)
            ? orig.qtd_faturada_tons
            : 0
        return acc + faturado
      }, 0)
    } catch {
      erroFaturamentoFisico = true
    }
    const temFaturamentoFisico = !erroFaturamentoFisico && faturamentoFisicoTotalT > 0

    return [
      {
        id: 'SALDO_SEMIACABADO',
        titulo: 'Saldo Semiacabado',
        valor: saldoSemiacabadoConsolidado.totalT,
        tipoFormato: 'tonelada',
        cor: 'azul',
        subtitulo: `${saldoSemiacabadoConsolidado.materiaisCount} materiais`,
        tooltip: TOOLTIP_SALDO_SEMIACABADO,
      },
      {
        id: 'CARTEIRA_TOTAL',
        titulo: 'Carteira (t)',
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
        titulo: 'Estoque disponível (t)',
        valor: estoqueDisponivelT,
        tipoFormato: 'tonelada',
        cor: 'verde',
        subtitulo: 'Pronto para atendimento',
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
        titulo: 'Déficit (t)',
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
        titulo: 'Programado (t)',
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
        id: 'FATURAMENTO_FISICO',
        titulo: 'Faturamento Físico (t)',
        valor: erroFaturamentoFisico
          ? 'Informação temporariamente indisponível'
          : temFaturamentoFisico
            ? faturamentoFisicoTotalT
            : 'Dado não disponível',
        tipoFormato: temFaturamentoFisico ? 'tonelada' : 'texto',
        cor: 'azul',
        subtitulo: 'Últimos 3 meses + atual',
        tooltip: 'Volume físico faturado em toneladas (últimos 3 meses completos + mês atual)',
      },
      {
        id: 'CURVA_A',
        titulo: 'Curva A',
        valor: resultadoABC.resumoA.quantidade_itens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'roxo',
        badge: `${formatPercentagePTBR(resultadoABC.tonelagemTotal_t > 0 ? (resultadoABC.resumoA.toneladas / resultadoABC.tonelagemTotal_t) * 100 : 0, 0)} vol.`,
        subtitulo: `Até ${parametrosCurvaAbc?.corteA_pct || 85}% do volume`,
        tooltip: `Materiais de maior impacto volumétrico (concentram ${formatPercentagePTBR(resultadoABC.tonelagemTotal_t > 0 ? (resultadoABC.resumoA.toneladas / resultadoABC.tonelagemTotal_t) * 100 : 0, 1)} do volume)`,
      },
      {
        id: 'CURVA_B',
        titulo: 'Curva B',
        valor: resultadoABC.resumoB.quantidade_itens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'azul',
        badge: `${formatPercentagePTBR(resultadoABC.tonelagemTotal_t > 0 ? (resultadoABC.resumoB.toneladas / resultadoABC.tonelagemTotal_t) * 100 : 0, 0)} vol.`,
        subtitulo: `${parametrosCurvaAbc?.corteA_pct || 85}% a ${parametrosCurvaAbc?.corteB_pct || 95}%`,
        tooltip: `Materiais de volume intermediário (concentram ${formatPercentagePTBR(resultadoABC.tonelagemTotal_t > 0 ? (resultadoABC.resumoB.toneladas / resultadoABC.tonelagemTotal_t) * 100 : 0, 1)} do volume)`,
      },
      {
        id: 'CURVA_C',
        titulo: 'Curva C',
        valor: resultadoABC.resumoC.quantidade_itens,
        tipoFormato: 'quantidade',
        unidade: 'itens',
        cor: 'cinza',
        badge: `${formatPercentagePTBR(resultadoABC.tonelagemTotal_t > 0 ? (resultadoABC.resumoC.toneladas / resultadoABC.tonelagemTotal_t) * 100 : 0, 0)} vol.`,
        subtitulo: `Acima de ${parametrosCurvaAbc?.corteB_pct || 95}%`,
        tooltip: `Materiais de cauda longa (concentram ${formatPercentagePTBR(resultadoABC.tonelagemTotal_t > 0 ? (resultadoABC.resumoC.toneladas / resultadoABC.tonelagemTotal_t) * 100 : 0, 1)} do volume)`,
      },
    ]
  }, [todosItensCalculados, resultadoABC, parametrosCurvaAbc, saldoSemiacabadoConsolidado])

  // Drill-down dos cards executivos
  const handleCardClick = (cardId: string) => {
    switch (cardId) {
      case 'CARTEIRA_TOTAL':
      case 'TOTAL_ITENS':
      case 'FATURAMENTO_FISICO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Carteira Total Consolidada',
          descricao: 'Todos os materiais com ordens abertas no SAP ECC ZSD28C',
          itens: todosItensCalculados,
        })
        break
      case 'SALDO_SEMIACABADO':
        setDrilldownConfig({
          isOpen: true,
          nome: 'Materiais com Saldo Semiacabado',
          descricao: 'Saldo disponível de materiais semiacabados aplicáveis à carteira selecionada',
          itens: todosItensCalculados.filter((i) => {
            const orig = i.origemItemOriginal as CarteiraItem | undefined
            return orig ? saldoSemiacabadoItemTons(orig) > 0 : false
          }),
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
          descricao: `Itens de alta relevância volumétrica (até ${parametrosCurvaAbc?.corteA_pct || 85}% do volume)`,
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

  // Itens enriquecidos com métricas temporais e ordenados em tempo real
  const itensEnriquecidosEOrdenados: ItemCarteiraGeralEnriquecido[] = useMemo(() => {
    const enriquecidos = enriquecerItensCarteiraGeral(itensFiltrados, entradasFuturas)
    return ordenarItensCarteiraGeral(enriquecidos, ordenarPor)
  }, [itensFiltrados, entradasFuturas, ordenarPor])

  const totalPaginas = Math.ceil(itensEnriquecidosEOrdenados.length / itensPorPagina) || 1
  const itensExibidos = itensEnriquecidosEOrdenados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina,
  )

  // Disparar abertura de detalhe do material original - SEMPRE resolutivo, NUNCA silencioso
  const handleAbrirDetalhe = (itemCalc: ItemCurvaAbcCalculado) => {
    const itemResolvido = resolverCarteiraItem(itemCalc, itens, sdcItens)
    if (onOpenDetalheMaterial) {
      onOpenDetalheMaterial(itemResolvido)
    } else {
      onOpenMemoria(itemResolvido)
    }
  }

  // Skeleton de carregamento da Carteira Geral
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="p-3 bg-white rounded-xl border border-slate-200 h-14" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-72 bg-white rounded-xl border border-slate-200" />
      </div>
    )
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
            className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Curva ABC (Pareto)
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

      {/* Grid de Cards Executivos Consolidados com o Card 'Mínimo não atingido' integrado responsivamente */}
      <div className="space-y-2.5">
        <PortfolioCardsGrid cards={cardsExecutivos} onCardClick={handleCardClick} />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          <SaldoSemiacabadoCard
            testid="card-saldo-semiacabado-geral"
            valorTons={saldoSemiacabadoConsolidado.totalT}
            materiaisCount={saldoSemiacabadoConsolidado.materiaisCount}
            notaComposicao="Semi CIAFAL + Semi Vallourec • Geral + SDC"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          <MinimoNaoAtingidoCard
            summary={resumoMinimoNaoAtingido}
            onClick={() => setIsMinimoModalOpen(true)}
          />
        </div>
      </div>

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

              {/* Filtro Ordenar por (18 opções reais) */}
              <div className="flex items-center gap-1.5 bg-blue-50/60 p-1 rounded-lg border border-blue-200">
                <span className="text-[11px] font-bold text-[#004C97] whitespace-nowrap pl-1 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-[#004C97]" />
                  Ordenar por:
                </span>
                <select
                  value={ordenarPor}
                  onChange={(e) => {
                    setOrdenarPor(e.target.value as OrdenacaoCarteiraGeralOpcao)
                    setPagina(1)
                  }}
                  className="text-xs py-1 px-2 rounded-md border border-blue-300 bg-white text-slate-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                >
                  {OPCOES_ORDENACAO_CARTEIRA_GERAL.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
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
                  setOrdenarPor('MATERIAL_DESCRICAO')
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

      {/* Tabela Consolidada de Materiais - 17 Colunas Estritas com Rolagem Horizontal Interna */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs max-w-full">
        <div className="overflow-x-auto max-w-full scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse min-w-[1550px]">
            <thead className="bg-[#004C97] text-white text-[11px] select-none sticky top-0 z-10 shadow-xs">
              <tr>
                {/* 1. Código (congelada à esquerda para boa usabilidade) */}
                <th className="p-2.5 font-bold sticky left-0 z-20 bg-[#004C97] min-w-[120px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.15)]">
                  Código
                </th>

                {/* 2. Material / Descrição */}
                <th className="p-2.5 font-bold min-w-[240px]">Material / Descrição</th>

                {/* 3. Linha */}
                <th className="p-2.5 font-bold text-center min-w-[80px]">Linha</th>

                {/* 4. Centro */}
                <th className="p-2.5 font-bold text-center min-w-[70px]">Centro</th>

                {/* 5. Curva ABC */}
                <th className="p-2.5 font-bold text-center min-w-[85px]">Curva ABC</th>

                {/* 6. Carteira (t) */}
                <th className="p-2.5 font-bold text-right min-w-[105px]">Carteira (t)</th>

                {/* 7. Estoque disponível (t) */}
                <th className="p-2.5 font-bold text-right min-w-[130px]">Estoque disponível (t)</th>

                {/* 8. Programado (t) */}
                <th className="p-2.5 font-bold text-right min-w-[110px]">Programado (t)</th>

                {/* 9. Déficit (t) */}
                <th className="p-2.5 font-bold text-right min-w-[95px]">Déficit (t)</th>

                {/* 10. Saldo projetado (t) */}
                <th className="p-2.5 font-bold text-right min-w-[120px]">Saldo projetado (t)</th>

                {/* 11. Média diária faturamento (t/dia) */}
                <th
                  className="p-2.5 font-bold text-right min-w-[145px]"
                  title="Média física faturada em toneladas no período considerado."
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Média diária faturamento (t/dia)</span>
                    <Info className="w-3 h-3 text-blue-200 shrink-0" />
                  </div>
                </th>

                {/* 12. Dias de estoque */}
                <th
                  className="p-2.5 font-bold text-center min-w-[115px]"
                  title="Estimativa de quantos dias o estoque atual suporta considerando o faturamento médio."
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Dias de estoque</span>
                    <Info className="w-3 h-3 text-blue-200 shrink-0" />
                  </div>
                </th>

                {/* 13. Data fim estoque */}
                <th
                  className="p-2.5 font-bold text-center min-w-[120px]"
                  title="Data projetada de ruptura considerando estoque, consumo e programação disponível."
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Data fim estoque</span>
                    <Info className="w-3 h-3 text-blue-200 shrink-0" />
                  </div>
                </th>

                {/* 14. Dias estoque negativo */}
                <th
                  className="p-2.5 font-bold text-center min-w-[130px]"
                  title="Quantidade estimada de dias em que o saldo projetado permanecerá abaixo de zero antes da recomposição."
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Dias estoque negativo</span>
                    <Info className="w-3 h-3 text-blue-200 shrink-0" />
                  </div>
                </th>

                {/* 15. Representatividade fat. (%) */}
                <th
                  className="p-2.5 font-bold text-right min-w-[135px]"
                  title="Participação percentual do material no faturamento físico em toneladas dentro do universo filtrado."
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Representatividade fat. (%)</span>
                    <Info className="w-3 h-3 text-blue-200 shrink-0" />
                  </div>
                </th>

                {/* 16. Risco */}
                <th className="p-2.5 font-bold text-center min-w-[85px]">Risco</th>

                {/* 17. Detalhes */}
                <th className="p-2.5 font-bold text-center min-w-[100px]">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensExibidos.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-8 text-center text-slate-500">
                    Nenhum material encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensExibidos.map((enriq, idx) => {
                  const it = enriq.item
                  const isLinhaCritica = it.curva_abc === 'A' && it.deficit_tons > 0

                  return (
                    <tr
                      key={it.codigo_material + idx}
                      onClick={() => handleAbrirDetalhe(it)}
                      className={`hover:bg-blue-50/50 transition-colors text-[11px] cursor-pointer ${
                        isLinhaCritica
                          ? 'bg-rose-50/35'
                          : enriq.isEstoqueNegativo && it.saldo_projetado_tons < 0
                            ? 'bg-amber-50/25'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50/30'
                      }`}
                    >
                      {/* 1. Código (congelada) */}
                      <td className="p-2.5 font-mono font-bold text-slate-900 sticky left-0 z-1 bg-inherit shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center gap-1.5">
                          <span>{it.codigo_material}</span>
                          {it.curva_abc === 'A' && (
                            <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[9px] font-bold px-1 py-0">
                              A
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* 2. Material / Descrição */}
                      <td className="p-2.5">
                        <span
                          className="text-slate-800 font-medium block truncate max-w-[260px]"
                          title={it.descricao_material}
                        >
                          {it.descricao_material || 'Sem descrição cadastrada'}
                        </span>
                      </td>

                      {/* 3. Linha */}
                      <td className="p-2.5 text-center">
                        <Badge className="bg-slate-100 text-[#004C97] font-bold border-slate-200 text-[10px]">
                          {it.linha}
                        </Badge>
                      </td>

                      {/* 4. Centro */}
                      <td className="p-2.5 text-center font-mono text-slate-600 font-semibold">
                        {it.centro}
                      </td>

                      {/* 5. Curva ABC */}
                      <td className="p-2.5 text-center font-bold">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            it.curva_abc === 'A'
                              ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                              : it.curva_abc === 'B'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {it.curva_abc || 'C'}
                        </span>
                      </td>

                      {/* 6. Carteira (t) */}
                      <td className="p-2.5 text-right font-mono font-bold text-blue-950">
                        {formatNumberPTBR(it.carteira_tons, 2)} t
                      </td>

                      {/* 7. Estoque disponível (t) */}
                      <td className="p-2.5 text-right font-mono text-slate-700 font-medium">
                        {formatNumberPTBR(it.estoque_disponivel_tons, 2)} t
                      </td>

                      {/* 8. Programado (t) */}
                      <td className="p-2.5 text-right font-mono text-indigo-700 font-semibold">
                        {formatNumberPTBR(it.programado_tons, 2)} t
                      </td>

                      {/* 9. Déficit (t) */}
                      <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                        {it.deficit_tons > 0
                          ? `${formatNumberPTBR(it.deficit_tons, 2)} t`
                          : '0,00 t'}
                      </td>

                      {/* 10. Saldo projetado (t) */}
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          it.saldo_projetado_tons < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatNumberPTBR(it.saldo_projetado_tons, 2)} t
                      </td>

                      {/* 11. Média diária faturamento (t/dia) */}
                      <td className="p-2.5 text-right font-mono text-slate-800">
                        {enriq.mediaDiariaTexto === 'Sem consumo histórico' ? (
                          <span className="text-slate-400 text-[10px] italic">
                            Sem consumo histórico
                          </span>
                        ) : (
                          <span className="font-semibold">{enriq.mediaDiariaTexto}</span>
                        )}
                      </td>

                      {/* 12. Dias de estoque */}
                      <td className="p-2.5 text-center font-mono">
                        {enriq.diasEstoqueTexto === 'Sem consumo histórico' ? (
                          <span className="text-slate-400 text-[10px] italic">
                            Sem consumo histórico
                          </span>
                        ) : (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              enriq.diasEstoqueNivel === 'CRITICO'
                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                : enriq.diasEstoqueNivel === 'ATENCAO'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {enriq.diasEstoqueTexto}
                          </span>
                        )}
                      </td>

                      {/* 13. Data fim estoque */}
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {enriq.dataFimEstoqueTexto === 'Sem previsão' ? (
                          <span className="text-slate-400 text-[10px] italic">Sem previsão</span>
                        ) : (
                          <span className="font-semibold text-slate-900">
                            {enriq.dataFimEstoqueTexto}
                          </span>
                        )}
                      </td>

                      {/* 14. Dias estoque negativo */}
                      <td className="p-2.5 text-center font-mono">
                        {enriq.isEstoqueNegativo ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {enriq.diasEstoqueNegativoTexto}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">
                            {enriq.diasEstoqueNegativoTexto}
                          </span>
                        )}
                      </td>

                      {/* 15. Representatividade fat. (%) */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {enriq.representatividadeFatTexto}
                      </td>

                      {/* 16. Risco */}
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

                      {/* 17. Detalhes */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAbrirDetalhe(it)}
                          className="h-6 px-2 text-[10px] text-[#004C97] hover:bg-blue-50 font-bold gap-1"
                          title="Ver detalhes do material"
                        >
                          <Eye className="w-3 h-3 text-[#004C97]" /> Ver detalhes
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Exibindo <strong>{itensExibidos.length}</strong> de{' '}
            <strong>{itensEnriquecidosEOrdenados.length}</strong> materiais
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

      {/* Modal Mínimo Não Atingido */}
      <MinimoNaoAtingidoModal
        isOpen={isMinimoModalOpen}
        onClose={() => setIsMinimoModalOpen(false)}
        summary={resumoMinimoNaoAtingido}
        tituloVisao="Carteira Geral"
        onSelectMaterial={(mat) => {
          setSearchTerm(mat)
          setPagina(1)
        }}
      />
    </div>
  )
}
export default CarteiraGeralView
