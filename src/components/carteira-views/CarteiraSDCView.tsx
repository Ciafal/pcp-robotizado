import React, { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  Eye,
  Download,
  UploadCloud,
  ArrowUpDown,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  Sparkles,
  BarChart3,
  RefreshCw,
  Info,
} from 'lucide-react'
import {
  CarteiraSDCItem,
  CarteiraSDCKpis,
  StatusCarteiraSDC,
  OrigemProducaoSDC,
  CarteiraSDCImportRow,
  EstoqueCentroDetalhe,
} from '@/types/carteira-sdc'
import { CarteiraSDCEngine } from '@/services/carteira-sdc-engine'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { DetalheMaterialUnificadoModal } from './DetalheMaterialUnificadoModal'
import { DetalheEstoquePorCentroModal } from './DetalheEstoquePorCentroModal'
import {
  formatNumberPTBR,
  formatDatePTBR,
  formatPercentagePTBR,
  formatTons3DecimalsValue,
} from '@/lib/formatters-ptbr'
import { CurvaAbcFaturamentoEngine } from '@/services/curva-abc-faturamento-engine'
import { PortfolioCharts } from './PortfolioCharts'
import { PortfolioABC } from './PortfolioABC'
import { MinimoNaoAtingidoCard } from './MinimoNaoAtingidoCard'
import { MinimoNaoAtingidoModal } from './MinimoNaoAtingidoModal'
import { useSapMaterialLoteMinimo } from '@/hooks/use-sap-material-lote-minimo'
import {
  calcularMinimoNaoAtingido,
  MinimoNaoAtingidoSummary,
} from '@/services/carteira-minimo-nao-atingido-engine'

interface CarteiraSDCViewProps {
  itens: CarteiraSDCItem[]
  kpis: CarteiraSDCKpis
  fonteAtual?: 'Carga QAS' | 'SAP ECC'
  dataAtualizacao: string
  analisesIA: string[]
  materialAncorado?: string
  abrirDetalheAncorado?: boolean
  isLoading?: boolean
  onAtualizarItens?: (itens: CarteiraSDCItem[]) => void
  onOpenDetalheSDC?: (item: CarteiraSDCItem) => void
  onAtualizarSap?: () => void
}

export const CarteiraSDCView: React.FC<CarteiraSDCViewProps> = ({
  itens: itensIniciais,
  kpis: kpisIniciais,
  fonteAtual,
  dataAtualizacao,
  analisesIA,
  materialAncorado,
  abrirDetalheAncorado = false,
  isLoading = false,
  onAtualizarItens,
  onOpenDetalheSDC,
  onAtualizarSap,
}) => {
  const [itens, setItens] = useState<CarteiraSDCItem[]>(itensIniciais)
  const [kpis, setKpis] = useState<CarteiraSDCKpis>(kpisIniciais)

  // Atualiza estado local se props mudarem
  React.useEffect(() => {
    setItens(itensIniciais)
    setKpis(kpisIniciais)
  }, [itensIniciais, kpisIniciais])

  // Modais
  const [itemSelecionado, setItemSelecionado] = useState<CarteiraSDCItem | null>(null)
  const [isModalDetalheOpen, setIsModalDetalheOpen] = useState(false)
  const [isModalImportOpen, setIsModalImportOpen] = useState(false)
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)
  const [isMinimoModalOpen, setIsMinimoModalOpen] = useState(false)
  const [destaqueMaterial, setDestaqueMaterial] = useState<string | null>(materialAncorado || null)

  // Estado do Modal de Detalhamento de Estoque por Centro SAP
  const [modalEstoqueCentro, setModalEstoqueCentro] = useState<{
    isOpen: boolean
    titulo: string
    subtitulo?: string
    origemInfo?: string
    valorConsolidadoT: number | null | undefined
    centros?: EstoqueCentroDetalhe[] | null
  }>({
    isOpen: false,
    titulo: '',
    subtitulo: '',
    origemInfo: '',
    valorConsolidadoT: null,
    centros: null,
  })

  // Detalhamento de Estoque Total SDPL por centro (base de dados da Carteira SDC: WERKS = SDPL)
  const centrosEstoqueTotalSdpl: EstoqueCentroDetalhe[] = useMemo(() => {
    if (!itens || itens.length === 0) return []
    // Como a carteira SDC opera no centro SDPL (Sidercentro), o estoque total SDPL consolida em SDPL
    const totalSdpl = kpis?.estoque_total_t || 0
    return [
      {
        centro: 'SDPL',
        descricao: 'Sidercentro Laminação',
        quantidade_t: totalSdpl,
        unidade: 't',
        participacao_pct: 100,
      },
    ]
  }, [itens, kpis?.estoque_total_t])

  // Réplica oficial SAP do lote mínimo sincronizado via RFC
  const { replicaMap: replicaSapLoteMinimo } = useSapMaterialLoteMinimo()

  // Cálculo reativo do Mínimo Não Atingido para Carteira SDC
  const resumoMinimoSDC: MinimoNaoAtingidoSummary = useMemo(() => {
    return calcularMinimoNaoAtingido({
      itens,
      tipoVisao: 'SDC',
      replicaSapPorCodigo: replicaSapLoteMinimo,
    })
  }, [itens, replicaSapLoteMinimo])

  // Curva ABC por faturamento para SDC
  const resultadoABCSDC = useMemo(() => {
    return CurvaAbcFaturamentoEngine.calcularCurvaAbc(itens)
  }, [itens])

  // Efeito de ancoragem por parâmetro de URL (?material=)
  React.useEffect(() => {
    if (materialAncorado && itens.length > 0) {
      setDestaqueMaterial(materialAncorado)
      const achado = itens.find((i) => i.material.toLowerCase() === materialAncorado.toLowerCase())
      if (achado) {
        if (abrirDetalheAncorado) {
          setItemSelecionado(achado)
          setIsModalDetalheOpen(true)
        }
        // Rolagem suave até a linha do material ancorado
        setTimeout(() => {
          const el = document.getElementById(`row-material-${materialAncorado}`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
    }
  }, [materialAncorado, abrirDetalheAncorado, itens])

  // Filtros compactos
  const [busca, setBusca] = useState('')
  const [filtroFamilia, setFiltroFamilia] = useState('TODAS')
  const [filtroBitola, setFiltroBitola] = useState('TODAS')
  const [filtroAco, setFiltroAco] = useState('TODOS')
  const [filtroCurva, setFiltroCurva] = useState('TODAS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('TODAS')
  const [apenasComDeficit, setApenasComDeficit] = useState(false)
  const [apenasComProg, setApenasComProg] = useState(false)
  const [apenasEmProducao, setApenasEmProducao] = useState(false)
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)

  // Ordenação
  const [ordenacaoCampo, setOrdenacaoCampo] = useState<string>('PRIORIZAR_NECESSIDADE')
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<'asc' | 'desc'>('asc')

  // Extrair listas únicas para selects
  const familias = useMemo(
    () => Array.from(new Set(itens.map((i) => i.familia || 'Perfis SDC'))).sort(),
    [itens],
  )
  const bitolas = useMemo(
    () => Array.from(new Set(itens.map((i) => i.bitola || '-'))).sort(),
    [itens],
  )
  const acos = useMemo(
    () => Array.from(new Set(itens.map((i) => i.qualidade_aco || 'SAE 1020'))).sort(),
    [itens],
  )

  // Filtro
  const itensFiltrados = useMemo(() => {
    return itens.filter((it) => {
      if (busca) {
        const b = busca.toLowerCase()
        const matMatch = it.material.toLowerCase().includes(b)
        const descMatch = it.descricao.toLowerCase().includes(b)
        if (!matMatch && !descMatch) return false
      }

      if (filtroFamilia !== 'TODAS' && it.familia !== filtroFamilia) return false
      if (filtroBitola !== 'TODAS' && it.bitola !== filtroBitola) return false
      if (filtroAco !== 'TODOS' && it.qualidade_aco !== filtroAco) return false
      if (filtroCurva !== 'TODAS' && it.curva_abc !== filtroCurva) return false
      if (filtroStatus !== 'TODOS' && it.status !== filtroStatus) return false
      if (filtroOrigem !== 'TODAS' && it.origem_producao !== filtroOrigem) return false

      if (apenasComDeficit && it.saldo_t >= 0) return false
      if (apenasComProg && it.programado_t <= 0) return false
      if (apenasEmProducao && it.em_producao_t <= 0) return false

      return true
    })
  }, [
    itens,
    busca,
    filtroFamilia,
    filtroBitola,
    filtroAco,
    filtroCurva,
    filtroStatus,
    filtroOrigem,
    apenasComDeficit,
    apenasComProg,
    apenasEmProducao,
  ])

  // Ordenar
  const itensOrdenados = useMemo(() => {
    return CarteiraSDCEngine.ordenarItens(itensFiltrados, ordenacaoCampo, ordenacaoDirecao)
  }, [itensFiltrados, ordenacaoCampo, ordenacaoDirecao])

  const handleOrdenar = (campo: string) => {
    if (ordenacaoCampo === campo) {
      setOrdenacaoDirecao((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdenacaoCampo(campo)
      setOrdenacaoDirecao('asc')
    }
  }

  const handleOpenDetalhe = (item: CarteiraSDCItem) => {
    if (onOpenDetalheSDC) {
      onOpenDetalheSDC(item)
      return
    }
    setItemSelecionado(item)
    setIsModalDetalheOpen(true)
  }

  const handleImportarQAS = (rows: CarteiraSDCImportRow[]) => {
    const novosItens = rows.map((r) =>
      CarteiraSDCEngine.calcularItem({
        material: r.material,
        descricao: r.descricao,
        curva_abc: r.curva_abc,
        carteira_t: r.carteira_t,
        estoque_total_t: r.estoque_total_t,
        programado_t: r.programado_t || 0,
        em_producao_t: r.em_producao_t || 0,
        origem_producao: r.origem_producao || 'Sidercentro',
        centro_sap: 'SDPL',
      }),
    )
    const novosKpis = CarteiraSDCEngine.calcularKpis(novosItens)
    setItens(novosItens)
    setKpis(novosKpis)
    if (onAtualizarItens) {
      onAtualizarItens(novosItens)
    }
  }

  const getStatusBadge = (status: StatusCarteiraSDC) => {
    switch (status) {
      case 'COBERTO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
            COBERTO
          </Badge>
        )
      case 'DÉFICIT':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
            DÉFICIT
          </Badge>
        )
      case 'EM PRODUÇÃO':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] font-bold">
            EM PRODUÇÃO
          </Badge>
        )
      case 'COBERTURA PROGRAMADA':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold">
            COBERTURA PROGRAMADA
          </Badge>
        )
      case 'COBERTURA PARCIAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
            COBERTURA PARCIAL
          </Badge>
        )
      case 'SEM CARTEIRA':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px] font-bold">
            SEM CARTEIRA
          </Badge>
        )
      case 'SEM ESTOQUE':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold animate-pulse">
            SEM ESTOQUE
          </Badge>
        )
      case 'CRÍTICO':
        return (
          <Badge className="bg-rose-600 text-white border-rose-700 text-[10px] font-bold animate-pulse">
            CRÍTICO
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  const getSituacaoBadge = (situacao: string) => {
    const isCIAFAL = situacao.includes('CIAFAL')
    const isSDC = situacao.includes('SDC')
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
          isCIAFAL
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : isSDC
              ? 'bg-sky-50 text-[#004C97] border border-sky-200 font-bold'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
        }`}
      >
        <Building2 className="w-3 h-3 shrink-0" />
        {situacao}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* 9 CARDS EXECUTIVOS NO TOPO — Grid Responsivo Equilibrado e Sem Cortes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9 gap-2.5">
        {/* 1. Carteira Total SDC */}
        <div
          onClick={() => {
            setFiltroStatus('TODOS')
            setApenasComDeficit(false)
          }}
          className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-400 cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0"
        >
          <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
            Carteira Total SDC
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight">
                  {formatTons3DecimalsValue(kpis.carteira_total_t)}
                </strong>
                <span className="text-xs font-semibold text-slate-500">t</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">
            {kpis.total_itens} itens analisados
          </span>
        </div>

        {/* 2. Estoque Total SDPL */}
        <div
          onClick={() => {
            setModalEstoqueCentro({
              isOpen: true,
              titulo: 'ESTOQUE TOTAL SDPL',
              subtitulo: 'Centro WERKS = SDPL',
              origemInfo: 'Base Operacional SDC',
              valorConsolidadoT: kpis.estoque_total_t,
              centros: centrosEstoqueTotalSdpl,
            })
          }}
          className="p-3 bg-white rounded-xl border border-emerald-200 hover:border-emerald-400 cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0 group"
          data-testid="card-estoque-total-sdpl"
          title="Clique para ver o detalhamento por centro SAP"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block leading-tight">
              Estoque Total SDPL
            </span>
            <div
              className="text-emerald-500/70 group-hover:text-emerald-700 transition-colors shrink-0"
              title="Ver detalhamento por centro"
            >
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-emerald-700 tracking-tight">
                  {formatTons3DecimalsValue(kpis.estoque_total_t)}
                </strong>
                <span className="text-xs font-semibold text-emerald-600">t</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-emerald-600 mt-1">
            <span>Centro WERKS = SDPL</span>
            <span className="text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity underline">
              Ver centros
            </span>
          </div>
        </div>

        {/* 3. ESTOQUE REMESSA (Centro CFPL via SAP RFC) */}
        <div
          onClick={() => {
            const detalhe = kpis.estoque_remessa_cfpl
            // Determinar array de centros vindo da RFC
            const centrosRfc =
              detalhe?.centros && Array.isArray(detalhe.centros)
                ? detalhe.centros
                : detalhe?.detalhes_rfc?.centros && Array.isArray(detalhe.detalhes_rfc.centros)
                  ? detalhe.detalhes_rfc.centros
                  : detalhe?.status === 'SUCESSO' &&
                      typeof detalhe?.quantidade_t === 'number' &&
                      detalhe.centro
                    ? [
                        {
                          centro: detalhe.centro,
                          descricao: 'Centro CFPL (Laminação/Remessa)',
                          quantidade_t: detalhe.quantidade_t,
                          unidade: detalhe.unidade_original || 't',
                          participacao_pct: 100,
                        },
                      ]
                    : null

            setModalEstoqueCentro({
              isOpen: true,
              titulo: 'ESTOQUE REMESSA',
              subtitulo: 'Centro SAP: CFPL',
              origemInfo: 'SAP ECC • RFC',
              valorConsolidadoT: detalhe?.quantidade_t,
              centros: centrosRfc,
            })
          }}
          className={`p-3 bg-white rounded-xl border shadow-xs transition-all flex flex-col justify-between min-w-0 cursor-pointer group ${
            kpis.estoque_remessa_cfpl?.status === 'INDISPONIVEL'
              ? 'border-amber-200 hover:border-amber-400'
              : 'border-sky-200 hover:border-sky-400'
          }`}
          data-testid="card-estoque-remessa"
          title="Clique para ver o detalhamento por centro SAP"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#004C97] leading-tight break-words">
              ESTOQUE REMESSA
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <div
                className="text-sky-500/70 group-hover:text-[#004C97] transition-colors"
                title="Ver detalhamento por centro"
              >
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div
                className="text-slate-400 hover:text-[#004C97] cursor-help"
                onClick={(e) => e.stopPropagation()}
                title={`Estoque em remessa consultado no SAP ECC via RFC, considerando o centro CFPL.${
                  kpis.estoque_remessa_cfpl?.timestamp
                    ? `\nÚltima sincronização: ${formatDatePTBR(kpis.estoque_remessa_cfpl.timestamp)}`
                    : ''
                }\nOrigem: SAP ECC\nCentro considerado: CFPL\nUnidade original: ${
                  kpis.estoque_remessa_cfpl?.unidade_original || 't'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1 min-h-[26px]">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : kpis.estoque_remessa_cfpl?.status === 'INDISPONIVEL' ||
              kpis.estoque_remessa_cfpl?.quantidade_t === null ||
              kpis.estoque_remessa_cfpl?.quantidade_t === undefined ? (
              <div
                className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 leading-snug py-0.5"
                title="Não foi possível atualizar este indicador através da integração SAP/RFC."
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>Dados SAP indisponíveis</span>
              </div>
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-[#004C97] tracking-tight">
                  {formatTons3DecimalsValue(kpis.estoque_remessa_cfpl.quantidade_t)}
                </strong>
                <span className="text-xs font-semibold text-[#004C97]">t</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium">
            <span>Centro SAP: CFPL</span>
            <span className="text-[9px] font-semibold text-[#004C97] opacity-0 group-hover:opacity-100 transition-opacity underline">
              Ver centros
            </span>
          </div>
        </div>

        {/* 4. ESTOQUE ARMAZENADO CIAFAL (Via SAP ECC RFC) */}
        <div
          onClick={() => {
            const detalhe = kpis.estoque_armazenado_ciafal
            // Determinar array de centros vindo da RFC
            const centrosRfc =
              detalhe?.centros && Array.isArray(detalhe.centros)
                ? detalhe.centros
                : detalhe?.detalhes_rfc?.centros && Array.isArray(detalhe.detalhes_rfc.centros)
                  ? detalhe.detalhes_rfc.centros
                  : detalhe?.status === 'SUCESSO' &&
                      typeof detalhe?.quantidade_t === 'number' &&
                      detalhe.centro
                    ? [
                        {
                          centro: detalhe.centro,
                          descricao: 'Centro 1100 (CIAFAL Matriz)',
                          quantidade_t: detalhe.quantidade_t,
                          unidade: detalhe.unidade_original || 't',
                          participacao_pct: 100,
                        },
                      ]
                    : null

            setModalEstoqueCentro({
              isOpen: true,
              titulo: 'ESTOQUE ARMAZENADO CIAFAL',
              subtitulo: 'Operação SDC • Centro SAP 1100',
              origemInfo: 'SAP ECC • RFC',
              valorConsolidadoT: detalhe?.quantidade_t,
              centros: centrosRfc,
            })
          }}
          className={`p-3 bg-white rounded-xl border shadow-xs transition-all flex flex-col justify-between min-w-0 cursor-pointer group ${
            kpis.estoque_armazenado_ciafal?.status === 'INDISPONIVEL'
              ? 'border-amber-200 hover:border-amber-400'
              : 'border-blue-200 hover:border-blue-400'
          }`}
          data-testid="card-estoque-armazenado-ciafal"
          title="Clique para ver o detalhamento por centro SAP"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] uppercase font-bold text-blue-900 leading-tight break-words">
              ESTOQUE ARMAZENADO CIAFAL
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <div
                className="text-blue-500/70 group-hover:text-blue-900 transition-colors"
                title="Ver detalhamento por centro"
              >
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div
                className="text-slate-400 hover:text-[#004C97] cursor-help"
                onClick={(e) => e.stopPropagation()}
                title={`Estoque armazenado Ciafal consultado diretamente no SAP ECC via RFC.${
                  kpis.estoque_armazenado_ciafal?.timestamp
                    ? `\nÚltima sincronização: ${formatDatePTBR(kpis.estoque_armazenado_ciafal.timestamp)}`
                    : ''
                }\nOrigem: SAP ECC • RFC\nCentro considerado: 1100\nUnidade original: ${
                  kpis.estoque_armazenado_ciafal?.unidade_original || 't'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-1 mt-1 min-h-[26px]">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : kpis.estoque_armazenado_ciafal?.status === 'INDISPONIVEL' ||
              kpis.estoque_armazenado_ciafal?.quantidade_t === null ||
              kpis.estoque_armazenado_ciafal?.quantidade_t === undefined ? (
              <div
                className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 leading-snug py-0.5"
                title="Não foi possível atualizar este indicador através da integração SAP/RFC."
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>Dados SAP indisponíveis</span>
              </div>
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-blue-900 tracking-tight">
                  {formatTons3DecimalsValue(kpis.estoque_armazenado_ciafal.quantidade_t)}
                </strong>
                <span className="text-xs font-semibold text-blue-800">t</span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium">
            <span>Fonte: SAP ECC &bull; RFC</span>
            <span className="text-[9px] font-semibold text-blue-900 opacity-0 group-hover:opacity-100 transition-opacity underline">
              Ver centros
            </span>
          </div>
        </div>

        {/* 5. Déficit Atual */}
        <div
          onClick={() => setApenasComDeficit((prev) => !prev)}
          className={`p-3 rounded-xl border cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0 ${
            apenasComDeficit
              ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
              : 'bg-white border-rose-200 hover:border-rose-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-rose-700 block leading-tight">
            Déficit Atual (-)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-rose-700 tracking-tight">
                  {formatTons3DecimalsValue(kpis.deficit_atual_t)}
                </strong>
                <span className="text-xs font-semibold text-rose-600">t</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-rose-600 block mt-1">Soma saldos negativos</span>
        </div>

        {/* 6. Itens com Déficit */}
        <div
          onClick={() => setApenasComDeficit(true)}
          className="p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0"
        >
          <span className="text-[10px] uppercase font-bold text-rose-700 block leading-tight">
            Itens com Déficit
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-rose-700 tracking-tight">
                  {kpis.itens_com_deficit_count}
                </strong>
                <span className="text-xs font-semibold text-rose-600">itens</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-rose-600 block mt-1">Necessitam cobertura</span>
        </div>

        {/* 7. Em Produção */}
        <div
          onClick={() => setApenasEmProducao((prev) => !prev)}
          className={`p-3 rounded-xl border cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0 ${
            apenasEmProducao
              ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400'
              : 'bg-white border-indigo-200 hover:border-indigo-400'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-indigo-700 block leading-tight">
            Em Produção (t)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-indigo-700 tracking-tight">
                  {formatTons3DecimalsValue(kpis.em_producao_total_t)}
                </strong>
                <span className="text-xs font-semibold text-indigo-600">t</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-indigo-600 block mt-1">Processo em andamento</span>
        </div>

        {/* 8. Cobertura Programada */}
        <div
          onClick={() => setFiltroStatus('COBERTURA PROGRAMADA')}
          className="p-3 bg-white rounded-xl border border-blue-200 hover:border-blue-400 cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0"
        >
          <span className="text-[10px] uppercase font-bold text-[#004C97] block leading-tight">
            Cobertura Programada
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-[#004C97] tracking-tight">
                  {kpis.itens_cobertura_programada_count}
                </strong>
                <span className="text-xs font-semibold text-[#004C97]">itens</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-1">Saldo proj. ≥ 0</span>
        </div>

        {/* 9. Itens Críticos */}
        <div
          onClick={() => setFiltroStatus('CRÍTICO')}
          className="p-3 bg-white rounded-xl border border-amber-200 hover:border-rose-400 cursor-pointer shadow-xs transition-all flex flex-col justify-between min-w-0"
        >
          <span className="text-[10px] uppercase font-bold text-amber-800 block leading-tight">
            Itens Críticos
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded" />
            ) : (
              <>
                <strong className="text-base sm:text-lg font-bold font-mono text-rose-700 tracking-tight">
                  {kpis.itens_criticos_count}
                </strong>
                <span className="text-xs font-semibold text-rose-600">itens</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-rose-600 block mt-1">Sem prog / Sem estoque</span>
        </div>
      </div>

      {/* Card Executivo 'Mínimo não atingido' Carteira SDC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        <MinimoNaoAtingidoCard
          summary={resumoMinimoSDC}
          onClick={() => setIsMinimoModalOpen(true)}
        />
      </div>

      {/* PAINEL DE INTELIGÊNCIA ARTIFICIAL: ALERTAS & IA */}
      <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-xl p-4 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-none">
                Alertas & IA &bull; Análise Automática da Carteira SDC
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Diagnóstico preditivo em tempo real &bull; Centro SAP SDPL &bull; Sidercentro
              </p>
            </div>
          </div>
          <Badge className="bg-[#004C97] text-white text-[10px] font-bold">Motor IA Ativo</Badge>
        </div>

        <div className="space-y-1.5 pt-1">
          {analisesIA.map((msg, idx) => (
            <div
              key={idx}
              className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2 shadow-xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{msg}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BARRA DE FILTROS COMPACTOS & CONTROLES */}
      <Card className="bg-white border-slate-200 shadow-xs">
        <CardContent className="p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Pesquisa rápida por código ou descrição */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar código SAP ou descrição..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              {/* Família */}
              <select
                value={filtroFamilia}
                onChange={(e) => setFiltroFamilia(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Família: Todas</option>
                {familias.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              {/* Bitola */}
              <select
                value={filtroBitola}
                onChange={(e) => setFiltroBitola(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Bitola: Todas</option>
                {bitolas.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Aço / Qualidade */}
              <select
                value={filtroAco}
                onChange={(e) => setFiltroAco(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Aço: Todos</option>
                {acos.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              {/* Curva ABC */}
              <select
                value={filtroCurva}
                onChange={(e) => setFiltroCurva(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Curva ABC: Todas</option>
                <option value="A">Curva A</option>
                <option value="B">Curva B</option>
                <option value="C">Curva C</option>
              </select>

              {/* Status */}
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="COBERTO">COBERTO</option>
                <option value="DÉFICIT">DÉFICIT</option>
                <option value="EM PRODUÇÃO">EM PRODUÇÃO</option>
                <option value="COBERTURA PROGRAMADA">COBERTURA PROGRAMADA</option>
                <option value="COBERTURA PARCIAL">COBERTURA PARCIAL</option>
                <option value="SEM CARTEIRA">SEM CARTEIRA</option>
                <option value="SEM ESTOQUE">SEM ESTOQUE</option>
                <option value="CRÍTICO">CRÍTICO</option>
              </select>

              {/* Origem da Produção */}
              <select
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value)}
                className="text-xs py-1.5 px-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="TODAS">Origem: Todas</option>
                <option value="Sidercentro">Sidercentro (SDC)</option>
                <option value="CIAFAL">CIAFAL</option>
              </select>
            </div>

            {/* Ações e Limpeza */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={ordenacaoCampo === 'PRIORIZAR_NECESSIDADE' ? 'default' : 'outline'}
                onClick={() => setOrdenacaoCampo('PRIORIZAR_NECESSIDADE')}
                className={`text-xs h-7 font-bold gap-1 ${
                  ordenacaoCampo === 'PRIORIZAR_NECESSIDADE'
                    ? 'bg-[#004C97] text-white hover:bg-[#003870]'
                    : 'border-slate-300 text-slate-700'
                }`}
                title="1 críticos, 2 maior déficit, 3 cobertura parcial, 4 cobertura programada, 5 cobertos, 6 sem carteira"
              >
                <ArrowUpDown className="w-3 h-3" /> Priorizar Necessidade
              </Button>

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
                  setBusca('')
                  setFiltroFamilia('TODAS')
                  setFiltroBitola('TODAS')
                  setFiltroAco('TODOS')
                  setFiltroCurva('TODAS')
                  setFiltroStatus('TODOS')
                  setFiltroOrigem('TODAS')
                  setApenasComDeficit(false)
                  setApenasComProg(false)
                  setApenasEmProducao(false)
                  setOrdenacaoCampo('PRIORIZAR_NECESSIDADE')
                }}
                className="border-slate-300 text-slate-600 hover:bg-slate-50 text-xs h-7"
              >
                Limpar
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsChartsOpen(true)}
                className="h-7 text-xs font-bold border-blue-300 text-[#004C97] hover:bg-blue-50 gap-1"
              >
                <BarChart3 className="w-3.5 h-3.5 text-[#004C97]" /> Análise Gráfica
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAbcOpen(true)}
                className="h-7 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Curva ABC
              </Button>

              {onAtualizarSap && (
                <Button
                  size="sm"
                  onClick={onAtualizarSap}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1 h-7 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar SAP
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABELA PRINCIPAL DA CARTEIRA SDC (Colunas mínimas do usuário) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px] select-none">
              <tr>
                <th
                  onClick={() => handleOrdenar('material')}
                  className="p-2.5 font-bold cursor-pointer hover:bg-blue-800"
                >
                  <div className="flex items-center gap-1">
                    <span>Material (Código SAP)</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleOrdenar('descricao')}
                  className="p-2.5 font-bold cursor-pointer hover:bg-blue-800"
                >
                  Descrição
                </th>
                <th
                  onClick={() => handleOrdenar('curva_abc')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Curva ABC
                </th>
                <th
                  onClick={() => handleOrdenar('carteira_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Carteira (t)
                </th>
                <th
                  onClick={() => handleOrdenar('estoque_total_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Estoque Total (t)
                </th>
                <th
                  onClick={() => handleOrdenar('saldo_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                  title="FÓRMULA: Saldo = Estoque Total − Carteira"
                >
                  Saldo (t)
                </th>
                <th
                  onClick={() => handleOrdenar('programado_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Programado (t)
                </th>
                <th
                  onClick={() => handleOrdenar('em_producao_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                >
                  Em Produção (t)
                </th>
                <th
                  onClick={() => handleOrdenar('saldo_projetado_t')}
                  className="p-2.5 font-bold text-right cursor-pointer hover:bg-blue-800"
                  title="FÓRMULA: Saldo Projetado = Estoque + Programado/Em Produção − Carteira"
                >
                  Saldo Projetado (t)
                </th>
                <th
                  onClick={() => handleOrdenar('cobertura_pct')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Cobertura (%)
                </th>
                <th
                  onClick={() => handleOrdenar('status')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Status
                </th>
                <th
                  onClick={() => handleOrdenar('origem_producao')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Origem Produção
                </th>
                <th
                  onClick={() => handleOrdenar('situacao_producao')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Situação Produção
                </th>
                <th
                  onClick={() => handleOrdenar('data_prevista')}
                  className="p-2.5 font-bold text-center cursor-pointer hover:bg-blue-800"
                >
                  Data Prevista
                </th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 font-bold text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 font-bold text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 font-bold text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 font-bold text-center bg-blue-900/40">Próx. Reposição</th>
                    <th className="p-2.5 font-bold text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 font-bold text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 font-bold text-center">Alerta</th>
                <th className="p-2.5 font-bold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensOrdenados.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-slate-500">
                    Nenhum produto da Carteira SDC encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                itensOrdenados.map((it, idx) => {
                  const isDeficit = it.saldo_t < 0
                  const isProjNegativo = it.saldo_projetado_t < 0

                  return (
                    <tr
                      id={`row-material-${it.material}`}
                      key={it.material + idx}
                      onClick={() => handleOpenDetalhe(it)}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer text-[11px] ${
                        destaqueMaterial &&
                        it.material.toLowerCase() === destaqueMaterial.toLowerCase()
                          ? 'bg-amber-100 ring-2 ring-amber-400 font-bold'
                          : it.status === 'CRÍTICO' || it.status === 'SEM ESTOQUE'
                            ? 'bg-rose-50/30'
                            : idx % 2 === 0
                              ? 'bg-white'
                              : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Material */}
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          {destaqueMaterial &&
                            it.material.toLowerCase() === destaqueMaterial.toLowerCase() && (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                          <span>{it.material}</span>
                        </div>
                      </td>

                      {/* Descrição */}
                      <td className="p-2.5 text-slate-700 max-w-[220px]">
                        <span className="truncate block font-medium" title={it.descricao}>
                          {it.descricao}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {it.familia} &bull; {it.bitola}
                        </span>
                      </td>

                      {/* Curva ABC */}
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            it.curva_abc === 'A'
                              ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                              : it.curva_abc === 'B'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {it.curva_abc || '-'}
                        </span>
                      </td>

                      {/* Carteira (t) */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatTons3DecimalsValue(it.carteira_t)}
                      </td>

                      {/* Estoque Total (t) */}
                      <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                        {formatTons3DecimalsValue(it.estoque_total_t)}
                        {(it.estoque_bloqueado_t || 0) > 0 && (
                          <span
                            className="block text-[9px] text-rose-600 font-normal"
                            title="Estoque bloqueado"
                          >
                            (bloq: {formatTons3DecimalsValue(it.estoque_bloqueado_t || 0)})
                          </span>
                        )}
                      </td>

                      {/* Saldo (t) = Estoque Total - Carteira */}
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          isDeficit ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {it.saldo_t > 0
                          ? `+${formatTons3DecimalsValue(it.saldo_t)}`
                          : formatTons3DecimalsValue(it.saldo_t)}
                      </td>

                      {/* Programado (t) */}
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {formatTons3DecimalsValue(it.programado_t)}
                      </td>

                      {/* Em Produção (t) */}
                      <td className="p-2.5 text-right font-mono font-semibold text-indigo-700">
                        {formatTons3DecimalsValue(it.em_producao_t)}
                      </td>

                      {/* Saldo Projetado (t) */}
                      <td
                        className={`p-2.5 text-right font-mono font-bold ${
                          isProjNegativo ? 'text-amber-800' : 'text-[#004C97]'
                        }`}
                      >
                        {it.saldo_projetado_t > 0
                          ? `+${formatTons3DecimalsValue(it.saldo_projetado_t)}`
                          : formatTons3DecimalsValue(it.saldo_projetado_t)}
                      </td>

                      {/* Cobertura (%) */}
                      <td className="p-2.5 text-center font-mono font-semibold">
                        <span
                          className={`${
                            it.cobertura_pct >= 100
                              ? 'text-emerald-700'
                              : it.cobertura_pct >= 50
                                ? 'text-amber-700'
                                : 'text-rose-600'
                          }`}
                        >
                          {formatPercentagePTBR(it.cobertura_pct, 2)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {getStatusBadge(it.status)}
                      </td>

                      {/* Origem Produção */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            it.origem_producao === 'CIAFAL'
                              ? 'border-blue-300 text-blue-800'
                              : 'border-blue-200 text-[#004C97]'
                          }`}
                        >
                          {it.origem_producao}
                        </Badge>
                      </td>

                      {/* Situação da Produção */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {getSituacaoBadge(it.situacao_producao)}
                      </td>

                      {/* Data Prevista */}
                      <td className="p-2.5 text-center font-mono text-slate-600">
                        {formatDatePTBR(it.data_prevista)}
                      </td>

                      {mostrarColunasTemporais &&
                        (() => {
                          const inputTemp =
                            CoberturaTemporalEngine.converterCarteiraSDCParaInput(it)
                          const resTemp = CoberturaTemporalEngine.calcular(inputTemp)
                          return (
                            <>
                              <td className="p-2.5 text-right font-mono text-slate-700">
                                {resTemp.mediaDiariaFaturamentoT
                                  ? formatTons3DecimalsValue(resTemp.mediaDiariaFaturamentoT)
                                  : 'N/D'}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                                {resTemp.diasCoberturaFormatado}
                              </td>
                              <td className="p-2.5 text-center font-mono text-slate-700">
                                {resTemp.dataFimEstoqueFormatada}
                              </td>
                              <td
                                className="p-2.5 text-center font-mono text-[10px] text-blue-900 truncate max-w-[120px]"
                                title={resTemp.proximaDataPrevistaFormatada}
                              >
                                {resTemp.proximaDataPrevistaFormatada}
                              </td>
                              <td
                                className={`p-2.5 text-center font-mono font-bold ${
                                  resTemp.temGapRuptura ? 'text-rose-700' : 'text-emerald-700'
                                }`}
                              >
                                {resTemp.diasEstoqueNegativoFormatado}
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge
                                  className={`text-[9px] font-bold border ${resTemp.badgeCor.bg} ${resTemp.badgeCor.text} ${resTemp.badgeCor.border}`}
                                >
                                  {resTemp.status}
                                </Badge>
                              </td>
                            </>
                          )
                        })()}

                      {/* Alerta */}
                      <td className="p-2.5 text-center">
                        {it.alerta ? (
                          <div
                            className="inline-flex items-center text-amber-600"
                            title={it.alerta}
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDetalhe(it)}
                          className="h-6 w-6 p-0 text-[#004C97] hover:bg-blue-100 rounded"
                          title="Ver Detalhamento Completo"
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

      {/* MODAL DETALHAMENTO DO MATERIAL (Padronizado com Cobertura Temporal & Previsão) */}
      <DetalheMaterialUnificadoModal
        isOpen={isModalDetalheOpen}
        onClose={() => setIsModalDetalheOpen(false)}
        item={itemSelecionado}
        origemCarteira="SDC"
      />

      {/* Modais Analíticos */}
      <PortfolioCharts
        isOpen={isChartsOpen}
        onClose={() => setIsChartsOpen(false)}
        tituloCarteira="Carteira SDC (WERKS SDPL)"
        itens={resultadoABCSDC.itens}
        onSelectMaterial={(itemCalc) => {
          const sdc = itens.find((i) => i.material === itemCalc.codigo_material)
          if (sdc) handleOpenDetalhe(sdc)
        }}
      />

      <PortfolioABC
        isOpen={isAbcOpen}
        onClose={() => setIsAbcOpen(false)}
        resultadoABC={resultadoABCSDC}
        onSelectMaterial={(itemCalc) => {
          const sdc = itens.find((i) => i.material === itemCalc.codigo_material)
          if (sdc) handleOpenDetalhe(sdc)
        }}
      />

      {/* Modal Mínimo Não Atingido SDC */}
      <MinimoNaoAtingidoModal
        isOpen={isMinimoModalOpen}
        onClose={() => setIsMinimoModalOpen(false)}
        summary={resumoMinimoSDC}
        tituloVisao="Carteira SDC (SDPL)"
        onSelectMaterial={(mat) => {
          setBusca(mat)
        }}
      />

      {/* Modal de Detalhamento de Estoque por Centro SAP */}
      <DetalheEstoquePorCentroModal
        isOpen={modalEstoqueCentro.isOpen}
        onClose={() =>
          setModalEstoqueCentro((prev) => ({
            ...prev,
            isOpen: false,
          }))
        }
        titulo={modalEstoqueCentro.titulo}
        subtitulo={modalEstoqueCentro.subtitulo}
        origemInfo={modalEstoqueCentro.origemInfo}
        valorConsolidadoT={modalEstoqueCentro.valorConsolidadoT}
        centros={modalEstoqueCentro.centros}
        isLoading={isLoading}
      />
    </div>
  )
}
export default CarteiraSDCView
