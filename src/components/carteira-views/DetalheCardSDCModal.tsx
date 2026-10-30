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
import { Input } from '@/components/ui/input'
import { LocalErrorBoundary } from '@/components/common/LocalErrorBoundary'
import {
  formatDatePTBR,
  formatTons3DecimalsValue,
  formatPercentagePTBR,
} from '@/lib/formatters-ptbr'
import { CarteiraSDCItem, CarteiraSDCKpis, EstoqueCentroDetalhe } from '@/types/carteira-sdc'
import { MinimoNaoAtingidoSummary } from '@/services/carteira-minimo-nao-atingido-engine'
import {
  Building2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  Database,
  Clock,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  Package,
  TrendingDown,
  Factory,
  Calendar,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react'

export type TipoCardSDC =
  | 'CARTEIRA_TOTAL'
  | 'ESTOQUE_TOTAL_SDPL'
  | 'ESTOQUE_REMESSA'
  | 'ESTOQUE_ARMAZENADO_CIAFAL'
  | 'DEFICIT_ATUAL'
  | 'ITENS_COM_DEFICIT'
  | 'EM_PRODUCAO'
  | 'COBERTURA_PROGRAMADA'
  | 'ITENS_CRITICOS'
  | 'MINIMO_NAO_ATINGIDO'

export interface DetalheCardSDCModalProps {
  isOpen: boolean
  onClose: () => void
  tipoCard: TipoCardSDC
  itens: CarteiraSDCItem[]
  kpis: CarteiraSDCKpis
  dataAtualizacao: string
  resumoMinimo?: MinimoNaoAtingidoSummary
  centrosEstoqueSdpl?: EstoqueCentroDetalhe[]
  isLoading?: boolean
  onAtualizarSap?: () => void
  onSelectMaterial?: (material: string) => void
}

export const DetalheCardSDCModal: React.FC<DetalheCardSDCModalProps> = (props) => {
  return (
    <LocalErrorBoundary moduleName="Detalhamento do Card da Carteira SDC">
      <DetalheCardSDCContent {...props} />
    </LocalErrorBoundary>
  )
}

const DetalheCardSDCContent: React.FC<DetalheCardSDCModalProps> = ({
  isOpen,
  onClose,
  tipoCard,
  itens,
  kpis,
  dataAtualizacao,
  resumoMinimo,
  centrosEstoqueSdpl,
  isLoading = false,
  onAtualizarSap,
  onSelectMaterial,
}) => {
  // Filtros internos do modal
  const [busca, setBusca] = useState('')
  const [filtroFamilia, setFiltroFamilia] = useState('TODAS')
  const [filtroCentro, setFiltroCentro] = useState('TODOS')
  const [filtroSituacao, setFiltroSituacao] = useState('TODAS')
  const [filtroOrigem, setFiltroOrigem] = useState('TODAS')
  const [ordenacaoCampo, setOrdenacaoCampo] = useState<string>('prioridade')
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<'asc' | 'desc'>('asc')

  // Metadados do card ativo
  const cardMeta = useMemo(() => {
    switch (tipoCard) {
      case 'CARTEIRA_TOTAL':
        return {
          tituloCompleto: 'Carteira Total SDC',
          subtitulo: 'Centro WERKS = SDPL • Pedidos em aberto na Sidercentro',
          unidadeConsolidado: 't',
          icone: Package,
          corBadge: 'bg-blue-100 text-[#004C97] border-blue-300',
          origem: 'SAP ECC • RFC (ZSD28C / VBAK / VBAP)',
          descricao:
            'Composição detalhada dos pedidos em aberto, clientes solicitantes, materiais, saldos e situação de atendimento.',
          valorConsolidado: kpis.carteira_total_t,
          valorConsolidadoTexto: `${formatTons3DecimalsValue(kpis.carteira_total_t)} t`,
          itensCount: kpis.total_itens,
          itensRotulo: 'itens analisados',
        }
      case 'ESTOQUE_TOTAL_SDPL':
        return {
          tituloCompleto: 'Estoque Total SDPL',
          subtitulo: 'Centro WERKS = SDPL • Sidercentro Laminação',
          unidadeConsolidado: 't',
          icone: Building2,
          corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          origem: 'SAP ECC • RFC (MB52 / MARD centro SDPL)',
          descricao:
            'Posição de estoque físico por material, lote, depósito de laminação, quantidade disponível e bloqueada.',
          valorConsolidado: kpis.estoque_total_t,
          valorConsolidadoTexto: `${formatTons3DecimalsValue(kpis.estoque_total_t)} t`,
          itensCount: itens.filter((i) => i.estoque_total_t > 0).length,
          itensRotulo: 'materiais com estoque',
        }
      case 'ESTOQUE_REMESSA': {
        const est = kpis.estoque_remessa_cfpl
        const isIndisp =
          est?.status === 'INDISPONIVEL' ||
          est?.quantidade_t === null ||
          est?.quantidade_t === undefined
        return {
          tituloCompleto: 'Estoque Remessa',
          subtitulo: 'Centro SAP: CFPL • Remessas em trânsito e industrialização',
          unidadeConsolidado: 't',
          icone: Layers,
          corBadge: 'bg-sky-100 text-sky-800 border-sky-300',
          origem: 'SAP ECC • RFC (BAPI_MATERIAL_STOCK_REQ_GET / CFPL)',
          descricao:
            'Rastreabilidade de documentos de remessa, lotes, centro CFPL e situação do fluxo de transferência/industrialização.',
          valorConsolidado: isIndisp ? null : est?.quantidade_t,
          valorConsolidadoTexto: isIndisp
            ? 'Dados SAP indisponíveis'
            : `${formatTons3DecimalsValue(est?.quantidade_t ?? 0)} t`,
          itensCount: est?.centros?.length || 1,
          itensRotulo: 'centros vinculados',
          statusIntegracao: est?.status || 'INDISPONIVEL',
          mensagemErro: est?.mensagem_erro,
        }
      }
      case 'ESTOQUE_ARMAZENADO_CIAFAL': {
        const est = kpis.estoque_armazenado_ciafal
        const isIndisp =
          est?.status === 'INDISPONIVEL' ||
          est?.quantidade_t === null ||
          est?.quantidade_t === undefined
        return {
          tituloCompleto: 'Estoque Armazenado Ciafal',
          subtitulo: 'Operação SDC • Centro SAP 1100 (Matriz Contagem)',
          unidadeConsolidado: 't',
          icone: Building2,
          corBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          origem: 'SAP ECC • RFC (MB52 / MARD centro 1100)',
          descricao:
            'Estoque armazenado de propriedade/operação SDC no centro 1100 Ciafal, por depósito e localização.',
          valorConsolidado: isIndisp ? null : est?.quantidade_t,
          valorConsolidadoTexto: isIndisp
            ? 'Dados SAP indisponíveis'
            : `${formatTons3DecimalsValue(est?.quantidade_t ?? 0)} t`,
          itensCount: est?.centros?.length || 1,
          itensRotulo: 'centros vinculados',
          statusIntegracao: est?.status || 'INDISPONIVEL',
          mensagemErro: est?.mensagem_erro,
        }
      }
      case 'DEFICIT_ATUAL':
        return {
          tituloCompleto: 'Déficit Atual',
          subtitulo: 'Soma dos saldos negativos imediatos (Estoque SDPL − Carteira SDC)',
          unidadeConsolidado: 't',
          icone: TrendingDown,
          corBadge: 'bg-rose-100 text-rose-800 border-rose-300',
          origem: 'Motor Determinístico PCP • Dados SAP RFC ZSD28C + MB52',
          descricao:
            'Volume exato de ruptura imediata de estoque frente à carteira em aberto no centro SDPL.',
          valorConsolidado: kpis.deficit_atual_t,
          valorConsolidadoTexto: `${formatTons3DecimalsValue(kpis.deficit_atual_t)} t`,
          itensCount: kpis.itens_com_deficit_count,
          itensRotulo: 'materiais em déficit',
        }
      case 'ITENS_COM_DEFICIT':
        return {
          tituloCompleto: 'Itens com Déficit',
          subtitulo: 'Materiais com saldo negativo que demandam cobertura fabril',
          unidadeConsolidado: 'itens',
          icone: AlertTriangle,
          corBadge: 'bg-rose-100 text-rose-800 border-rose-300',
          origem: 'Motor Determinístico PCP • ZSD28C',
          descricao:
            'Lista de materiais com déficit imediato, cobertura percentual e prioridade de atendimento.',
          valorConsolidado: kpis.itens_com_deficit_count,
          valorConsolidadoTexto: `${kpis.itens_com_deficit_count} itens`,
          itensCount: kpis.itens_com_deficit_count,
          itensRotulo: 'materiais necessitando cobertura',
        }
      case 'EM_PRODUCAO':
        return {
          tituloCompleto: 'Em Produção',
          subtitulo: 'Ordens de Produção (OP) ativas nos centros SDPL e CFPL',
          unidadeConsolidado: 't',
          icone: Factory,
          corBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          origem: 'SAP ECC • RFC (COOIS / AFPO / AFKO)',
          descricao:
            'Ordens de produção planejadas e em processo para atendimento da Carteira SDC.',
          valorConsolidado: kpis.em_producao_total_t,
          valorConsolidadoTexto: `${formatTons3DecimalsValue(kpis.em_producao_total_t)} t`,
          itensCount: itens.filter((i) => i.em_producao_t > 0).length,
          itensRotulo: 'materiais em processo',
        }
      case 'COBERTURA_PROGRAMADA':
        return {
          tituloCompleto: 'Cobertura Programada',
          subtitulo: 'Materiais com déficit cujo saldo projetado atinge cobertura ≥ 0',
          unidadeConsolidado: 'itens',
          icone: Calendar,
          corBadge: 'bg-blue-100 text-[#004C97] border-blue-300',
          origem: 'Motor de Programação PCP + SAP ECC RFC',
          descricao:
            'Materiais onde a programação vinculada cobre a carteira, com datas previstas de entrega.',
          valorConsolidado: kpis.itens_cobertura_programada_count,
          valorConsolidadoTexto: `${kpis.itens_cobertura_programada_count} itens`,
          itensCount: kpis.itens_cobertura_programada_count,
          itensRotulo: 'materiais com saldo projetado ≥ 0',
        }
      case 'ITENS_CRITICOS':
        return {
          tituloCompleto: 'Itens Críticos',
          subtitulo: 'Materiais com déficit sem estoque e sem nenhuma programação vinculada',
          unidadeConsolidado: 'itens',
          icone: AlertCircle,
          corBadge: 'bg-rose-600 text-white border-rose-700',
          origem: 'Motor Determinístico PCP • Risco de Atendimento',
          descricao:
            'Risco máximo de atendimento: materiais da Carteira SDC com saldo negativo sem ordem fabril vinculada.',
          valorConsolidado: kpis.itens_criticos_count,
          valorConsolidadoTexto: `${kpis.itens_criticos_count} itens`,
          itensCount: kpis.itens_criticos_count,
          itensRotulo: 'materiais sem cobertura programada',
        }
      case 'MINIMO_NAO_ATINGIDO':
        return {
          tituloCompleto: 'Mínimo Não Atingido',
          subtitulo: 'Carteira abaixo do Lote Mínimo de Produção SAP por material',
          unidadeConsolidado: 'itens',
          icone: AlertTriangle,
          corBadge: 'bg-amber-100 text-amber-900 border-amber-300',
          origem: 'SAP ECC • RFC (Tabela MARC / Lote Mínimo Oficial)',
          descricao:
            'Materiais cuja carteira consolidada não atinge o lote mínimo cadastrado no SAP para viabilizar campanha de laminação.',
          valorConsolidado: resumoMinimo?.total_materiais_abaixo_minimo || 0,
          valorConsolidadoTexto: `${resumoMinimo?.total_materiais_abaixo_minimo || 0} itens`,
          itensCount: resumoMinimo?.total_materiais_abaixo_minimo || 0,
          itensRotulo: 'materiais abaixo do lote mínimo SAP',
        }
    }
  }, [tipoCard, kpis, itens, resumoMinimo])

  // Lista base filtrada por tipo de card
  const itensDoCard = useMemo(() => {
    switch (tipoCard) {
      case 'CARTEIRA_TOTAL':
        return itens
      case 'ESTOQUE_TOTAL_SDPL':
        return itens.filter((i) => i.estoque_total_t > 0)
      case 'DEFICIT_ATUAL':
      case 'ITENS_COM_DEFICIT':
        return itens.filter((i) => i.saldo_t < 0)
      case 'EM_PRODUCAO':
        return itens.filter((i) => i.em_producao_t > 0)
      case 'COBERTURA_PROGRAMADA':
        return itens.filter((i) => i.status === 'COBERTURA PROGRAMADA')
      case 'ITENS_CRITICOS':
        return itens.filter((i) => i.status === 'CRÍTICO' || i.status === 'SEM ESTOQUE')
      case 'ESTOQUE_REMESSA':
      case 'ESTOQUE_ARMAZENADO_CIAFAL':
      case 'MINIMO_NAO_ATINGIDO':
      default:
        return itens
    }
  }, [tipoCard, itens])

  // Listas de filtros únicos
  const familiasDisponiveis = useMemo(() => {
    const s = new Set<string>()
    itensDoCard.forEach((i) => {
      if (i.familia) s.add(i.familia)
    })
    return Array.from(s).sort()
  }, [itensDoCard])

  const situacoesDisponiveis = useMemo(() => {
    const s = new Set<string>()
    itensDoCard.forEach((i) => {
      if (i.situacao_producao) s.add(i.situacao_producao)
    })
    return Array.from(s).sort()
  }, [itensDoCard])

  // Filtragem
  const itensFiltrados = useMemo(() => {
    return itensDoCard.filter((it) => {
      if (busca) {
        const b = busca.toLowerCase().trim()
        const matMatch = it.material.toLowerCase().includes(b)
        const descMatch = it.descricao.toLowerCase().includes(b)
        const cliMatch = it.pedidos_compoem?.some((p) => p.cliente.toLowerCase().includes(b))
        if (!matMatch && !descMatch && !cliMatch) return false
      }
      if (filtroFamilia !== 'TODAS' && it.familia !== filtroFamilia) return false
      if (filtroSituacao !== 'TODAS' && it.situacao_producao !== filtroSituacao) return false
      if (filtroOrigem !== 'TODAS' && it.origem_producao !== filtroOrigem) return false
      if (filtroCentro !== 'TODOS' && it.centro_sap !== filtroCentro) return false
      return true
    })
  }, [itensDoCard, busca, filtroFamilia, filtroSituacao, filtroOrigem, filtroCentro])

  // Totalizadores da tabela filtrada
  const totalizadores = useMemo(() => {
    let somaCarteiraT = 0
    let somaEstoqueT = 0
    let somaSaldoT = 0
    let somaProgramadoT = 0
    let somaEmProducaoT = 0
    let somaDeficitT = 0
    let somaEstoqueBloqueadoT = 0

    itensFiltrados.forEach((it) => {
      somaCarteiraT += it.carteira_t || 0
      somaEstoqueT += it.estoque_total_t || 0
      somaSaldoT += it.saldo_t || 0
      somaProgramadoT += it.programado_t || 0
      somaEmProducaoT += it.em_producao_t || 0
      somaEstoqueBloqueadoT += it.estoque_bloqueado_t || 0
      if (it.saldo_t < 0) {
        somaDeficitT += Math.abs(it.saldo_t)
      }
    })

    return {
      quantidadeItens: itensFiltrados.length,
      somaCarteiraT,
      somaEstoqueT,
      somaSaldoT,
      somaProgramadoT,
      somaEmProducaoT,
      somaDeficitT,
      somaEstoqueBloqueadoT,
    }
  }, [itensFiltrados])

  // Totalizador correspondente ao valor do card
  const valorTotalizadorCorrespondente = useMemo(() => {
    switch (tipoCard) {
      case 'CARTEIRA_TOTAL':
        return `${formatTons3DecimalsValue(totalizadores.somaCarteiraT)} t`
      case 'ESTOQUE_TOTAL_SDPL':
        return `${formatTons3DecimalsValue(totalizadores.somaEstoqueT)} t`
      case 'DEFICIT_ATUAL':
        return `${formatTons3DecimalsValue(totalizadores.somaDeficitT)} t`
      case 'ITENS_COM_DEFICIT':
        return `${totalizadores.quantidadeItens} itens`
      case 'EM_PRODUCAO':
        return `${formatTons3DecimalsValue(totalizadores.somaEmProducaoT)} t`
      case 'COBERTURA_PROGRAMADA':
        return `${totalizadores.quantidadeItens} itens`
      case 'ITENS_CRITICOS':
        return `${totalizadores.quantidadeItens} itens`
      case 'ESTOQUE_REMESSA': {
        const est = kpis.estoque_remessa_cfpl
        if (est?.status === 'INDISPONIVEL' || est?.quantidade_t === null) {
          return 'Dados SAP indisponíveis'
        }
        return `${formatTons3DecimalsValue(est?.quantidade_t ?? 0)} t`
      }
      case 'ESTOQUE_ARMAZENADO_CIAFAL': {
        const est = kpis.estoque_armazenado_ciafal
        if (est?.status === 'INDISPONIVEL' || est?.quantidade_t === null) {
          return 'Dados SAP indisponíveis'
        }
        return `${formatTons3DecimalsValue(est?.quantidade_t ?? 0)} t`
      }
      case 'MINIMO_NAO_ATINGIDO':
        return `${resumoMinimo?.total_materiais_abaixo_minimo || 0} itens`
    }
  }, [tipoCard, totalizadores, kpis, resumoMinimo])

  // Análise IA contextualizada para este card
  const analisesIACard = useMemo(() => {
    const msgs: string[] = []
    if (tipoCard === 'CARTEIRA_TOTAL') {
      msgs.push(
        `Volume total de ${formatTons3DecimalsValue(kpis.carteira_total_t)} t distribuído em ${kpis.total_itens} materiais no centro SDPL.`,
      )
      if (kpis.deficit_atual_t > 0) {
        msgs.push(
          `Déficit imediato identificado de ${formatTons3DecimalsValue(kpis.deficit_atual_t)} t necessitando de programação de laminação/industrialização.`,
        )
      }
    } else if (tipoCard === 'ESTOQUE_TOTAL_SDPL') {
      msgs.push(
        `Estoque físico consolidado em SDPL: ${formatTons3DecimalsValue(kpis.estoque_total_t)} t. Acesso via MB52 RFC.`,
      )
      const comBloqueio = itens.filter((i) => (i.estoque_bloqueado_t || 0) > 0)
      if (comBloqueio.length > 0) {
        msgs.push(
          `Atenção: ${comBloqueio.length} material(is) possuem estoque com bloqueio de qualidade no depósito.`,
        )
      }
    } else if (tipoCard === 'ESTOQUE_REMESSA') {
      const r = kpis.estoque_remessa_cfpl
      if (r?.status === 'SUCESSO' && r.quantidade_t !== null) {
        msgs.push(
          `Existem ${formatTons3DecimalsValue(r.quantidade_t)} t em remessa no centro CFPL. Não considerado como estoque disponível para abatimento direto de déficit em SDPL.`,
        )
      } else {
        msgs.push(
          'Consulta SAP RFC para estoque em remessa retornou indisponibilidade. O cálculo determinístico mantém os dados sem valores simulados.',
        )
      }
    } else if (tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL') {
      const a = kpis.estoque_armazenado_ciafal
      if (a?.status === 'SUCESSO' && a.quantidade_t !== null) {
        msgs.push(
          `Estoque Armazenado Ciafal: ${formatTons3DecimalsValue(a.quantidade_t)} t registradas no centro 1100 (Matriz). Operação SDC segregada do estoque de laminação.`,
        )
      } else {
        msgs.push(
          'Consulta SAP RFC para estoque armazenado Ciafal retornou indisponibilidade. Registros detalhados dependem da liberação da BAPI MB52.',
        )
      }
    } else if (tipoCard === 'DEFICIT_ATUAL' || tipoCard === 'ITENS_COM_DEFICIT') {
      msgs.push(
        `Ruptura fabril: ${kpis.itens_com_deficit_count} materiais com déficit somam ${formatTons3DecimalsValue(kpis.deficit_atual_t)} t de demanda desatendida.`,
      )
      const topDeficit = [...itens]
        .filter((i) => i.saldo_t < 0)
        .sort((a, b) => a.saldo_t - b.saldo_t)
        .slice(0, 2)
      if (topDeficit.length > 0) {
        msgs.push(
          `Prioridade crítica: ${topDeficit.map((d) => `${d.material} (${formatTons3DecimalsValue(Math.abs(d.saldo_t))} t)`).join(', ')}.`,
        )
      }
    } else if (tipoCard === 'EM_PRODUCAO') {
      msgs.push(
        `Processamento em andamento: ${formatTons3DecimalsValue(kpis.em_producao_total_t)} t em processo industrial. Verifique previsões de encerramento de ordem.`,
      )
    } else if (tipoCard === 'COBERTURA_PROGRAMADA') {
      msgs.push(
        `${kpis.itens_cobertura_programada_count} materiais possuem programação ativa suficiente para cobrir o déficit atual (saldo projetado ≥ 0).`,
      )
    } else if (tipoCard === 'ITENS_CRITICOS') {
      msgs.push(
        `Risco máximo: ${kpis.itens_criticos_count} materiais da Carteira SDC estão sem estoque e sem nenhuma programação fabril vinculada.`,
      )
    } else if (tipoCard === 'MINIMO_NAO_ATINGIDO') {
      msgs.push(
        `Parâmetro SAP MARC: ${resumoMinimo?.total_materiais_abaixo_minimo || 0} materiais na carteira não atingem o lote mínimo de laminação, totalizando ${formatTons3DecimalsValue(resumoMinimo?.total_toneladas_faltantes || 0)} t faltantes.`,
      )
    }
    return msgs
  }, [tipoCard, kpis, itens, resumoMinimo])

  // Render do ícone do card
  const IconeCard = cardMeta.icone

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[92vw] sm:w-[90vw] max-w-7xl max-h-[92vh] sm:max-h-[90vh] p-0 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden focus:outline-none"
        data-testid={`modal-detalhamento-${tipoCard.toLowerCase().replace(/_/g, '-')}`}
      >
        {/* HEADER INSTITUCIONAL CIAFAL */}
        <DialogHeader className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 via-sky-50/40 to-white border-b border-slate-200 flex-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-[#004C97] text-white rounded-xl shadow-xs shrink-0 mt-0.5 sm:mt-0">
                <IconeCard className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {cardMeta.tituloCompleto}
                  </DialogTitle>
                  <Badge className={`${cardMeta.corBadge} text-[11px] font-bold`}>
                    Indicador Consolidado
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-white text-slate-600 border-slate-300 font-medium"
                  >
                    Origem: {cardMeta.origem}
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                  <span>{cardMeta.subtitulo}</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="flex items-center gap-1 text-slate-500 font-mono text-[10px]">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Última sincronização: {formatDatePTBR(dataAtualizacao)}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* BOTÃO ATUALIZAR E STATUS */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {onAtualizarSap && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAtualizarSap}
                  disabled={isLoading}
                  className="h-8 text-xs font-semibold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-100"
                  title="Atualizar dados diretamente do SAP ECC via RFC"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Atualizar SAP</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                title="Fechar modal (Esc)"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* CORPO ROLÁVEL */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* BANNER DE STATUS DE INTEGRAÇÃO (SE INDISPONÍVEL) */}
          {cardMeta.statusIntegracao === 'INDISPONIVEL' && (
            <div
              className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-900 space-y-1.5"
              data-testid="aviso-sap-indisponivel"
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Integração SAP ECC / RFC com pendência ou indisponível</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {cardMeta.mensagemErro ||
                  'A consulta RFC correspondente a este indicador retornou status indisponível. Conforme diretriz do PCP Robotizado, o sistema preserva os cálculos sem inserir valores fictícios e sem travar a navegação.'}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-amber-900">
                <span className="font-semibold">Pendência técnica:</span>
                <span className="bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300">
                  {tipoCard === 'ESTOQUE_REMESSA'
                    ? 'RFC BAPI_MATERIAL_STOCK_REQ_GET / CFPL'
                    : 'RFC MB52 / T001W / 1100'}
                </span>
                <span>• Aguardando liberação de autorização de leitura da BAPI no SAP ECC.</span>
              </div>
            </div>
          )}

          {/* INDICADOR CONSOLIDADO EM DESTAQUE + TOTALIZADORES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 sm:p-3.5 bg-gradient-to-br from-blue-50/80 to-slate-50 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Consolidado do Card
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className="text-xl sm:text-2xl font-bold font-mono text-[#004C97] tracking-tight"
                  data-testid="modal-valor-consolidado"
                >
                  {cardMeta.valorConsolidadoTexto}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {cardMeta.itensCount} {cardMeta.itensRotulo}
              </span>
            </div>

            <div className="p-3 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Totalizador da Tabela Filtrada
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <strong
                  className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight"
                  data-testid="modal-totalizador-filtrado"
                >
                  {valorTotalizadorCorrespondente}
                </strong>
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {itensFiltrados.length} materiais listados
              </span>
            </div>

            <div className="p-3 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Origem & Rastreabilidade
              </span>
              <div className="text-xs font-bold text-slate-800 mt-1 leading-snug">
                {cardMeta.origem}
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                Centro SAP SDPL • Operação SDC
              </span>
            </div>

            <div className="p-3 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
                Regra do Indicador
              </span>
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                {cardMeta.descricao}
              </p>
            </div>
          </div>

          {/* SEÇÃO DE ANÁLISE IA — CARTEIRA SDC */}
          {analisesIACard.length > 0 && (
            <div
              className="p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-xl border border-blue-200 space-y-1.5 shadow-2xs"
              data-testid="secao-analise-ia-modal"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 bg-[#004C97] text-white rounded-md">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  Análise IA — Carteira SDC &bull; Diagnóstico do Indicador
                </h4>
                <Badge className="bg-[#004C97] text-white text-[9px] font-bold py-0 h-4">
                  Motor Corporativo Ativo
                </Badge>
              </div>
              <div className="space-y-1 pt-0.5">
                {analisesIACard.map((msg, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-700 bg-white/90 p-2 rounded-lg border border-blue-100 flex items-start gap-2 shadow-2xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{msg}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 italic pt-1">
                * As análises utilizam dados corporativos reais e não modificam programação, pedidos
                ou estoques.
              </p>
            </div>
          )}

          {/* SE O CARD FOR ESTOQUE POR CENTRO E POSSUIR CENTROS, EXIBE A TABELA DE CENTROS */}
          {(tipoCard === 'ESTOQUE_TOTAL_SDPL' ||
            tipoCard === 'ESTOQUE_REMESSA' ||
            tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL') &&
            centrosEstoqueSdpl &&
            centrosEstoqueSdpl.length > 0 && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#004C97]" />
                    Distribuição por Centro SAP (WERKS)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total: {formatTons3DecimalsValue(cardMeta.valorConsolidado ?? 0)} t
                  </span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-[11px] font-bold">
                      <tr>
                        <th className="p-2">Centro</th>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-right">Quantidade (t)</th>
                        <th className="p-2 text-right">Part. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {centrosEstoqueSdpl.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-900">{c.centro}</td>
                          <td className="p-2 text-slate-600">{c.descricao || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {formatTons3DecimalsValue(c.quantidade_t)} t
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {formatPercentagePTBR(c.participacao_pct ?? 100, 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* BARRA DE FILTROS DO DETALHAMENTO */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <Input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Filtrar por material, descrição ou cliente..."
                  className="text-xs pl-8 h-8 bg-white border-slate-300"
                />
              </div>

              {familiasDisponiveis.length > 0 && (
                <select
                  value={filtroFamilia}
                  onChange={(e) => setFiltroFamilia(e.target.value)}
                  className="text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
                >
                  <option value="TODAS">Família: Todas</option>
                  {familiasDisponiveis.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}

              {situacoesDisponiveis.length > 0 && (
                <select
                  value={filtroSituacao}
                  onChange={(e) => setFiltroSituacao(e.target.value)}
                  className="text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
                >
                  <option value="TODAS">Situação: Todas</option>
                  {situacoesDisponiveis.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value)}
                className="text-xs h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Origem: Todas</option>
                <option value="Sidercentro">Sidercentro (SDC)</option>
                <option value="CIAFAL">CIAFAL</option>
              </select>

              {(busca ||
                filtroFamilia !== 'TODAS' ||
                filtroSituacao !== 'TODAS' ||
                filtroOrigem !== 'TODAS') && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBusca('')
                    setFiltroFamilia('TODAS')
                    setFiltroSituacao('TODAS')
                    setFiltroOrigem('TODAS')
                  }}
                  className="h-8 text-xs text-slate-600 hover:text-slate-900"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </div>

          {/* TABELA DETALHADA COM OS REGISTROS QUE COMPÕEM O INDICADOR */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto max-h-[460px]">
              <table
                className="w-full text-left text-xs border-collapse"
                data-testid="tabela-detalhamento-card"
              >
                <thead className="bg-[#004C97] text-white text-[11px] sticky top-0 z-10 select-none">
                  <tr>
                    <th className="p-2.5 font-bold">Material (SAP)</th>
                    <th className="p-2.5 font-bold">Descrição</th>
                    {tipoCard === 'CARTEIRA_TOTAL' && (
                      <th className="p-2.5 font-bold">Cliente / Pedido</th>
                    )}
                    {(tipoCard === 'ESTOQUE_TOTAL_SDPL' ||
                      tipoCard === 'ESTOQUE_REMESSA' ||
                      tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL') && (
                      <>
                        <th className="p-2.5 font-bold">Lote</th>
                        <th className="p-2.5 font-bold">Depósito</th>
                        {tipoCard === 'ESTOQUE_REMESSA' && (
                          <th className="p-2.5 font-bold">Doc. Remessa</th>
                        )}
                        {tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL' && (
                          <th className="p-2.5 font-bold">Localização</th>
                        )}
                      </>
                    )}
                    {tipoCard === 'EM_PRODUCAO' && (
                      <>
                        <th className="p-2.5 font-bold">Ordem (OP)</th>
                        <th className="p-2.5 font-bold">Centro Produtivo</th>
                        <th className="p-2.5 font-bold text-right">Qtd. Planejada (t)</th>
                        <th className="p-2.5 font-bold text-right">Qtd. Realizada (t)</th>
                      </>
                    )}
                    {tipoCard === 'COBERTURA_PROGRAMADA' && (
                      <>
                        <th className="p-2.5 font-bold">Programação Vinculada</th>
                        <th className="p-2.5 font-bold text-right">Qtd. Programada (t)</th>
                        <th className="p-2.5 font-bold text-center">Data Prevista</th>
                        <th className="p-2.5 font-bold text-right">Cobertura Projetada</th>
                      </>
                    )}
                    {tipoCard === 'MINIMO_NAO_ATINGIDO' && (
                      <>
                        <th className="p-2.5 font-bold text-right">Mínimo Exigido (t)</th>
                        <th className="p-2.5 font-bold text-right">Qtd. Identificada (t)</th>
                        <th className="p-2.5 font-bold text-right">Diferença (t)</th>
                        <th className="p-2.5 font-bold">Parâmetro SAP</th>
                      </>
                    )}
                    <th className="p-2.5 font-bold text-right">Carteira (t)</th>
                    <th className="p-2.5 font-bold text-right">Estoque (t)</th>
                    <th className="p-2.5 font-bold text-right">Saldo (t)</th>
                    <th className="p-2.5 font-bold text-center">Cobertura (%)</th>
                    <th className="p-2.5 font-bold text-center">Situação / Status</th>
                    <th className="p-2.5 font-bold text-center">Centro</th>
                    <th className="p-2.5 font-bold text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-8 text-center text-slate-500">
                        Nenhum registro encontrado para os filtros selecionados neste indicador.
                      </td>
                    </tr>
                  ) : (
                    itensFiltrados.map((it, idx) => {
                      const primeiroPedido = it.pedidos_compoem?.[0]
                      const clienteStr = primeiroPedido
                        ? `${primeiroPedido.cliente} (${primeiroPedido.ordem_venda})`
                        : it.empresa || 'Sidercentro'

                      // Mínimo não atingido do item
                      const matMin = resumoMinimo?.todos_materiais.find(
                        (m) => m.codigo_material === it.material,
                      )

                      return (
                        <tr
                          key={`${it.material}-${idx}`}
                          className={`hover:bg-blue-50/50 transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {it.material}
                          </td>
                          <td className="p-2.5 text-slate-700 max-w-[220px]">
                            <span className="truncate block font-medium" title={it.descricao}>
                              {it.descricao}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {it.familia} &bull; {it.bitola}
                            </span>
                          </td>

                          {tipoCard === 'CARTEIRA_TOTAL' && (
                            <td
                              className="p-2.5 text-slate-600 max-w-[180px] truncate"
                              title={clienteStr}
                            >
                              {clienteStr}
                            </td>
                          )}

                          {(tipoCard === 'ESTOQUE_TOTAL_SDPL' ||
                            tipoCard === 'ESTOQUE_REMESSA' ||
                            tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL') && (
                            <>
                              <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                <span
                                  className="text-slate-400 italic"
                                  title="Campo detalhado por lote aguardando liberação da BAPI MB52"
                                >
                                  Não disponível
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                {tipoCard === 'ESTOQUE_TOTAL_SDPL'
                                  ? 'DEP-SDC-01'
                                  : 'Não disponível'}
                              </td>
                              {tipoCard === 'ESTOQUE_REMESSA' && (
                                <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                  <span className="text-slate-400 italic">Não disponível</span>
                                </td>
                              )}
                              {tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL' && (
                                <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                                  <span className="text-slate-400 italic">Não disponível</span>
                                </td>
                              )}
                            </>
                          )}

                          {tipoCard === 'EM_PRODUCAO' && (
                            <>
                              <td className="p-2.5 font-mono text-slate-800">
                                {it.programacao_detalhe ? 'OP-SDC-2026' : 'Em processo'}
                              </td>
                              <td className="p-2.5 text-slate-700 font-medium">
                                {it.origem_producao} ({it.centro_sap})
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-700">
                                {formatTons3DecimalsValue(it.em_producao_t)} t
                              </td>
                              <td className="p-2.5 text-right font-mono text-indigo-700 font-bold">
                                {formatTons3DecimalsValue(it.em_producao_t)} t
                              </td>
                            </>
                          )}

                          {tipoCard === 'COBERTURA_PROGRAMADA' && (
                            <>
                              <td className="p-2.5 font-medium text-[#004C97]">
                                {it.programacao_detalhe?.linha || 'Laminação SDC'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {formatTons3DecimalsValue(it.programado_t)} t
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-600">
                                {formatDatePTBR(it.data_prevista)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                +{formatTons3DecimalsValue(it.saldo_projetado_t)} t
                              </td>
                            </>
                          )}

                          {tipoCard === 'MINIMO_NAO_ATINGIDO' && (
                            <>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {matMin?.lote_minimo_tons !== null &&
                                matMin?.lote_minimo_tons !== undefined
                                  ? `${formatTons3DecimalsValue(matMin.lote_minimo_tons)} t`
                                  : 'Não recebido'}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-700">
                                {formatTons3DecimalsValue(it.carteira_t)} t
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                                {matMin?.falta_para_minimo_tons
                                  ? `${formatTons3DecimalsValue(matMin.falta_para_minimo_tons)} t`
                                  : '-'}
                              </td>
                              <td className="p-2.5 text-slate-600 text-[11px]">
                                MARC-BSTMI (Lote Mínimo)
                              </td>
                            </>
                          )}

                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            {formatTons3DecimalsValue(it.carteira_t)} t
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            {formatTons3DecimalsValue(it.estoque_total_t)} t
                          </td>
                          <td
                            className={`p-2.5 text-right font-mono font-bold ${
                              it.saldo_t < 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {it.saldo_t > 0
                              ? `+${formatTons3DecimalsValue(it.saldo_t)} t`
                              : `${formatTons3DecimalsValue(it.saldo_t)} t`}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold">
                            {formatPercentagePTBR(it.cobertura_pct, 1)}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                              {it.situacao_producao}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-slate-700">
                            {it.centro_sap}
                          </td>
                          <td className="p-2.5 text-center">
                            {onSelectMaterial && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  onSelectMaterial(it.material)
                                  onClose()
                                }}
                                className="h-6 px-2 text-[10px] font-bold text-[#004C97] border-blue-200 hover:bg-blue-50"
                              >
                                Ver na grade
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {itensFiltrados.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-200 text-xs text-slate-900 sticky bottom-0 z-10">
                    <tr>
                      <td className="p-2.5 uppercase font-semibold text-slate-700" colSpan={2}>
                        Total Consolidado ({itensFiltrados.length} materiais)
                      </td>
                      {tipoCard === 'CARTEIRA_TOTAL' && <td className="p-2.5" />}
                      {(tipoCard === 'ESTOQUE_TOTAL_SDPL' ||
                        tipoCard === 'ESTOQUE_REMESSA' ||
                        tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL') && (
                        <>
                          <td className="p-2.5" />
                          <td className="p-2.5" />
                          {tipoCard === 'ESTOQUE_REMESSA' && <td className="p-2.5" />}
                          {tipoCard === 'ESTOQUE_ARMAZENADO_CIAFAL' && <td className="p-2.5" />}
                        </>
                      )}
                      {tipoCard === 'EM_PRODUCAO' && (
                        <>
                          <td className="p-2.5" />
                          <td className="p-2.5" />
                          <td className="p-2.5 text-right font-mono">
                            {formatTons3DecimalsValue(totalizadores.somaEmProducaoT)} t
                          </td>
                          <td className="p-2.5 text-right font-mono text-indigo-700">
                            {formatTons3DecimalsValue(totalizadores.somaEmProducaoT)} t
                          </td>
                        </>
                      )}
                      {tipoCard === 'COBERTURA_PROGRAMADA' && (
                        <>
                          <td className="p-2.5" />
                          <td className="p-2.5 text-right font-mono">
                            {formatTons3DecimalsValue(totalizadores.somaProgramadoT)} t
                          </td>
                          <td className="p-2.5" />
                          <td className="p-2.5" />
                        </>
                      )}
                      {tipoCard === 'MINIMO_NAO_ATINGIDO' && (
                        <>
                          <td className="p-2.5" />
                          <td className="p-2.5 text-right font-mono">
                            {formatTons3DecimalsValue(totalizadores.somaCarteiraT)} t
                          </td>
                          <td className="p-2.5" />
                          <td className="p-2.5" />
                        </>
                      )}
                      <td className="p-2.5 text-right font-mono text-[#004C97]">
                        {formatTons3DecimalsValue(totalizadores.somaCarteiraT)} t
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700">
                        {formatTons3DecimalsValue(totalizadores.somaEstoqueT)} t
                      </td>
                      <td
                        className={`p-2.5 text-right font-mono ${
                          totalizadores.somaSaldoT < 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {totalizadores.somaSaldoT > 0
                          ? `+${formatTons3DecimalsValue(totalizadores.somaSaldoT)} t`
                          : `${formatTons3DecimalsValue(totalizadores.somaSaldoT)} t`}
                      </td>
                      <td className="p-2.5 text-center font-mono">-</td>
                      <td className="p-2.5 text-center">-</td>
                      <td className="p-2.5 text-center">SDPL</td>
                      <td className="p-2.5 text-center">-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* FOOTER DO MODAL */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex-none flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Auditoria & Rastreabilidade SAP ECC • Logs registrados</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DetalheCardSDCModal
