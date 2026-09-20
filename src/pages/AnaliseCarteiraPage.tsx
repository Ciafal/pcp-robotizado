import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  Layers,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Clock,
  Database,
  Briefcase,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CiafalPageHeader } from '@/components/common/CiafalDesignSystem'
import {
  CarteiraItem,
  CarteiraEntradaFutura,
  CarteiraUpload,
  CarteiraIAInsight,
} from '@/types/carteira-analise'
import { CarteiraService } from '@/services/carteira-service'
import { CarteiraZSD28CEngine } from '@/services/carteira-engine'
import {
  SapCarteiraRfcService,
  CurvaAbcParametrosBackend,
} from '@/services/sap-carteira-rfc-service'

// Componentes da Análise de Carteira
import CarteiraGeralView from '@/components/carteira-views/CarteiraGeralView'
import CarteiraL1View from '@/components/carteira-views/CarteiraL1View'
import CarteiraL2View from '@/components/carteira-views/CarteiraL2View'
import CarteiraMTOView from '@/components/carteira-views/CarteiraMTOView'
import CarteiraRevendaView from '@/components/carteira-views/CarteiraRevendaView'
import CarteiraImportadoView from '@/components/carteira-views/CarteiraImportadoView'
import CarteiraSDCView from '@/components/carteira-views/CarteiraSDCView'
import AnalistaIACard from '@/components/carteira-views/AnalistaIACard'
import { CarteiraSDCItem, CarteiraSDCKpis } from '@/types/carteira-sdc'
import { CarteiraSDCService } from '@/services/carteira-sdc-service'
import { formatDateTimePTBR } from '@/lib/formatters-ptbr'
import MemoriaCalculoModal from '@/components/carteira-views/MemoriaCalculoModal'
import DetalheMaterialUnificadoModal from '@/components/carteira-views/DetalheMaterialUnificadoModal'
import GovernancaRegrasModal from '@/components/carteira-views/GovernancaRegrasModal'
import ReconciliacaoSapModal from '@/components/carteira-views/ReconciliacaoSapModal'
import { OrigemCarteira } from '@/services/cobertura-temporal-engine'

type TopicoCarteira = 'GERAL' | 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO' | 'SDC'

export const AnaliseCarteiraPage: React.FC = () => {
  const { toast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()

  // Sincronizar topicoAtivo com a rota atual (/pcp/analise-carteira/l1, etc.)
  const getTopicoFromPath = (pathname: string): TopicoCarteira => {
    if (pathname.includes('/analise-carteira/sdc')) return 'SDC'
    if (pathname.includes('/analise-carteira/l1')) return 'L1'
    if (pathname.includes('/analise-carteira/l2')) return 'L2'
    if (pathname.includes('/analise-carteira/mto')) return 'MTO'
    if (pathname.includes('/analise-carteira/revenda')) return 'REVENDA'
    if (pathname.includes('/analise-carteira/importado')) return 'IMPORTADO'
    return 'GERAL'
  }

  const [topicoAtivo, setTopicoAtivo] = useState<TopicoCarteira>(() =>
    getTopicoFromPath(location.pathname),
  )

  // Extrair ?material= da query string para suporte de ancoragem
  const materialParam = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return searchParams.get('material') || undefined
  }, [location.search])

  useEffect(() => {
    const t = getTopicoFromPath(location.pathname)
    setTopicoAtivo(t)
  }, [location.pathname])

  const handleSelectTab = (topico: TopicoCarteira) => {
    setTopicoAtivo(topico)
    const subpath =
      topico === 'GERAL'
        ? '/pcp/analise-carteira/geral'
        : `/pcp/analise-carteira/${topico.toLowerCase()}`
    navigate(subpath)
  }
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [itens, setItens] = useState<CarteiraItem[]>([])
  const [entradasFuturas, setEntradasFuturas] = useState<CarteiraEntradaFutura[]>([])
  const [uploadAtual, setUploadAtual] = useState<CarteiraUpload | null>(null)
  const [historicoUploads, setHistoricoUploads] = useState<CarteiraUpload[]>([])
  const [insightsIA, setInsightsIA] = useState<CarteiraIAInsight[]>([])
  const [dataAtualizacaoSap, setDataAtualizacaoSap] = useState<string>(new Date().toISOString())
  const [parametrosCurvaAbc, setParametrosCurvaAbc] = useState<
    CurvaAbcParametrosBackend | undefined
  >(undefined)
  const [erroConsultaSap, setErroConsultaSap] = useState<string | null>(null)

  // Estado da Carteira SDC (WERKS = SDPL)
  const [itensSDC, setItensSDC] = useState<CarteiraSDCItem[]>([])
  const [kpisSDC, setKpisSDC] = useState<CarteiraSDCKpis>({
    carteira_total_t: 0,
    estoque_total_t: 0,
    deficit_atual_t: 0,
    itens_com_deficit_count: 0,
    em_producao_total_t: 0,
    itens_cobertura_programada_count: 0,
    itens_criticos_count: 0,
    total_itens: 0,
  })
  const [analisesIASDC, setAnalisesIASDC] = useState<string[]>([])
  const [fonteSDC, setFonteSDC] = useState<'SAP ECC' | 'Carga QAS'>('SAP ECC')
  const [dataAtualizacaoSDC, setDataAtualizacaoSDC] = useState<string>(new Date().toISOString())

  const [isMemoriaOpen, setIsMemoriaOpen] = useState(false)
  const [itemSelecionadoMemoria, setItemSelecionadoMemoria] = useState<CarteiraItem | null>(null)

  // Modal Unificado de Detalhe Material com a seção Cobertura Temporal & Previsão
  const [materialUnificadoSelecionado, setMaterialUnificadoSelecionado] =
    useState<CarteiraItem | null>(null)
  const [materialSDCSelecionado, setMaterialSDCSelecionado] = useState<CarteiraSDCItem | null>(null)
  const [origemUnificadaModal, setOrigemUnificadaModal] = useState<OrigemCarteira>('GERAL')
  const [isDetalheUnificadoOpen, setIsDetalheUnificadoOpen] = useState(false)

  const [isRegrasModalOpen, setIsRegrasModalOpen] = useState(false)
  const [isReconciliacaoOpen, setIsReconciliacaoOpen] = useState(false)
  const [filtroMaterialDireto, setFiltroMaterialDireto] = useState('')

  const carregarDados = async (bypassCache = false) => {
    setIsLoading(true)
    setErroConsultaSap(null)
    try {
      // 1. Obter parâmetros da Curva ABC no backend
      const paramsAbc = await SapCarteiraRfcService.obterParametrosCurvaAbc()
      setParametrosCurvaAbc(paramsAbc)

      // 2. Consultar carteira oficial via SAP ECC RFC (referência ZSD28C)
      const rfcRes = await SapCarteiraRfcService.consultarCarteiraSAP({
        forceRefresh: bypassCache,
      })

      if (rfcRes.sucesso) {
        setItens(rfcRes.itens)
        setEntradasFuturas(rfcRes.entradasFuturas)
        setDataAtualizacaoSap(rfcRes.timestamp)
        if (rfcRes.sdcItens && rfcRes.sdcItens.length > 0) {
          setItensSDC(rfcRes.sdcItens)
        }
      } else {
        // Tratar erro oficial sem dados fictícios
        setErroConsultaSap(rfcRes.mensagem || 'Não foi possível consultar a carteira no SAP.')
      }

      // 3. Carregar Carteira SDC (WERKS = SDPL)
      const resSDC = await CarteiraSDCService.carregarCarteiraSDC()
      setItensSDC(resSDC.itens)
      setKpisSDC(resSDC.kpis)
      setAnalisesIASDC(resSDC.analisesIA)
      setFonteSDC('SAP ECC')
      setDataAtualizacaoSDC(resSDC.dataAtualizacao)
    } catch (err: any) {
      console.error('Erro ao carregar dados da carteira via SAP RFC:', err)
      setErroConsultaSap('Não foi possível consultar a carteira no SAP.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleForcarAtualizacaoSap = async () => {
    toast({
      title: 'Consultando SAP ECC RFC...',
      description: 'Sincronizando carteira oficial ZSD28C diretamente do SAP.',
    })
    await carregarDados(true)
    toast({
      title: 'Dados Atualizados',
      description: 'Carteira SAP ECC atualizada com sucesso.',
    })
  }

  const handleOpenMemoria = (item: CarteiraItem) => {
    setItemSelecionadoMemoria(item)
    setIsMemoriaOpen(true)
  }

  const handleOpenDetalheUnificado = (item: CarteiraItem, origem: OrigemCarteira = 'GERAL') => {
    setMaterialUnificadoSelecionado(item)
    setMaterialSDCSelecionado(null)
    setOrigemUnificadaModal(origem)
    setIsDetalheUnificadoOpen(true)
  }

  const handleFiltrarMaterialIA = (material: string) => {
    setFiltroMaterialDireto(material)
    handleSelectTab('GERAL')
  }

  const getSubtopicName = (t: TopicoCarteira) => {
    switch (t) {
      case 'L1':
        return 'Carteira L1'
      case 'L2':
        return 'Carteira L2'
      case 'MTO':
        return 'Carteira MTO'
      case 'REVENDA':
        return 'Carteira Revenda'
      case 'IMPORTADO':
        return 'Carteira Importado'
      case 'SDC':
        return 'Carteira SDC'
      default:
        return 'Carteira Geral'
    }
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header Geral com Breadcrumb Oficial e Ações */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Análise de Carteira"
        subtitle="Base única de carteira aberta, saldos fabris e rupturas industriais com rastreabilidade SAP."
        compactInfo={`Subtópico: ${getSubtopicName(topicoAtivo)} | SAP ECC RFC (ZSD28C)`}
        infoTooltip="Base única de carteira corporativa CIAFAL integrada via RFC ao SAP ECC (transação ZSD28C), com balanceamento de ordens L1, L2, MTO, Revenda, Importados e SDC."
        breadcrumbs={[
          { label: 'PCP' },
          { label: 'Análise de Carteira', href: '/pcp/analise-carteira/geral' },
          { label: getSubtopicName(topicoAtivo) },
        ]}
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-[#004C97] text-white text-xs font-bold">
              Fonte atual: SAP ECC • RFC
            </Badge>
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-300 text-xs font-semibold"
            >
              Referência: ZSD28C
            </Badge>
          </div>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsReconciliacaoOpen(true)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5 h-8 shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Reconciliação SAP</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsRegrasModalOpen(true)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold gap-1.5 h-8 shrink-0"
            >
              <Sliders className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Motor de Regras</span>
            </Button>

            <Button
              size="sm"
              onClick={handleForcarAtualizacaoSap}
              disabled={isLoading}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 shadow-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar dados SAP</span>
            </Button>
          </>
        }
      />

      {/* Selo Superior com Rastreabilidade Oficial SAP ECC RFC */}
      <div className="px-3.5 py-2 bg-slate-100/90 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 font-bold text-slate-800">
            <Database className="w-3.5 h-3.5 text-[#004C97]" />
            Fonte atual: <span className="text-[#004C97] font-semibold">SAP ECC &bull; RFC</span>
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="flex items-center gap-1 text-slate-700 font-mono text-[10px]">
            Referência SAP: <strong>ZSD28C</strong>
          </span>
          <span className="text-slate-400">&bull;</span>
          <span className="flex items-center gap-1 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> Última atualização:{' '}
            <strong>{formatDateTimePTBR(dataAtualizacaoSap, true)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-slate-500">
            Unidades: <strong>Toneladas (t)</strong>
          </span>
          <button
            onClick={() => carregarDados(true)}
            disabled={isLoading}
            className="text-[#004C97] hover:underline font-bold flex items-center gap-1 ml-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Forçar
            Sincronização SAP
          </button>
        </div>
      </div>

      <AnalistaIACard insights={insightsIA} onFiltrarMaterial={handleFiltrarMaterialIA} />

      {/* 6 Subtópicos Oficiais da Análise de Carteira */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => handleSelectTab('GERAL')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'GERAL'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          1. Carteira Geral
        </button>

        <button
          onClick={() => handleSelectTab('L1')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'L1'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          2. Carteira L1
        </button>

        <button
          onClick={() => handleSelectTab('L2')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'L2'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          3. Carteira L2
        </button>

        <button
          onClick={() => handleSelectTab('MTO')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'MTO'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          4. Carteira MTO
        </button>

        <button
          onClick={() => handleSelectTab('REVENDA')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'REVENDA'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          5. Carteira Revenda
        </button>

        <button
          onClick={() => handleSelectTab('IMPORTADO')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'IMPORTADO'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          6. Carteira Importado
        </button>

        <button
          onClick={() => handleSelectTab('SDC')}
          className={`px-3.5 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 border-b-2 ${
            topicoAtivo === 'SDC'
              ? 'border-[#004C97] text-[#004C97] bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          7. Carteira SDC
        </button>
      </div>

      <div className="pt-1">
        {topicoAtivo === 'GERAL' && (
          <CarteiraGeralView
            itens={itens}
            entradasFuturas={entradasFuturas}
            sdcItens={itensSDC}
            isLoading={isLoading}
            onOpenMemoria={handleOpenMemoria}
            onOpenDetalheMaterial={(it) =>
              handleOpenDetalheUnificado(
                it,
                (it.linha === 'L1'
                  ? 'L1'
                  : it.linha === 'L2'
                    ? 'L2'
                    : it.tipo_ordem === 'ZPRM'
                      ? 'MTO'
                      : 'GERAL') as any,
              )
            }
            onAtualizarSap={() => carregarDados(true)}
            parametrosCurvaAbc={parametrosCurvaAbc}
            erroDisponibilidade={Boolean(erroConsultaSap)}
            mensagemErro={erroConsultaSap || undefined}
            filtroMaterial={filtroMaterialDireto}
          />
        )}

        {topicoAtivo === 'L1' && (
          <CarteiraL1View
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
            onOpenDetalheMaterial={(it) => handleOpenDetalheUnificado(it, 'L1')}
          />
        )}

        {topicoAtivo === 'L2' && (
          <CarteiraL2View
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
            onOpenDetalheMaterial={(it) => handleOpenDetalheUnificado(it, 'L2')}
          />
        )}

        {topicoAtivo === 'MTO' && (
          <CarteiraMTOView
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
            onOpenDetalheMaterial={(it) => handleOpenDetalheUnificado(it, 'MTO')}
          />
        )}

        {topicoAtivo === 'REVENDA' && (
          <CarteiraRevendaView
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
            onOpenDetalheMaterial={(it) => handleOpenDetalheUnificado(it, 'REVENDA')}
          />
        )}

        {topicoAtivo === 'IMPORTADO' && (
          <CarteiraImportadoView
            itens={itens}
            entradasFuturas={entradasFuturas}
            onOpenMemoria={handleOpenMemoria}
            onOpenDetalheMaterial={(it) => handleOpenDetalheUnificado(it, 'IMPORTADO')}
          />
        )}

        {topicoAtivo === 'SDC' && (
          <CarteiraSDCView
            itens={itensSDC}
            kpis={kpisSDC}
            fonteAtual="SAP ECC"
            dataAtualizacao={dataAtualizacaoSDC}
            analisesIA={analisesIASDC}
            materialAncorado={materialParam}
            abrirDetalheAncorado={Boolean(materialParam)}
            onAtualizarItens={(novos) => setItensSDC(novos)}
            onOpenDetalheSDC={(sdc) => {
              setMaterialSDCSelecionado(sdc)
              setMaterialUnificadoSelecionado(null)
              setOrigemUnificadaModal('SDC')
              setIsDetalheUnificadoOpen(true)
            }}
            onAtualizarSap={() => carregarDados(true)}
          />
        )}
      </div>

      <MemoriaCalculoModal
        isOpen={isMemoriaOpen}
        onClose={() => setIsMemoriaOpen(false)}
        item={itemSelecionadoMemoria}
      />

      <DetalheMaterialUnificadoModal
        isOpen={isDetalheUnificadoOpen}
        onClose={() => {
          setIsDetalheUnificadoOpen(false)
          setMaterialUnificadoSelecionado(null)
          setMaterialSDCSelecionado(null)
        }}
        material={
          materialUnificadoSelecionado?.codigo_material || materialSDCSelecionado?.material || ''
        }
        origemCarteira={origemUnificadaModal}
        centro={materialSDCSelecionado?.centro || '1100'}
        genItem={materialUnificadoSelecionado || undefined}
        sdcItem={materialSDCSelecionado || undefined}
        entradasFuturas={entradasFuturas}
      />

      <GovernancaRegrasModal
        isOpen={isRegrasModalOpen}
        onClose={() => setIsRegrasModalOpen(false)}
        onSalvarRegras={async (regrasAtualizadas) => {
          await CarteiraService.salvarRegrasParametrizadas(
            regrasAtualizadas,
            'pcp.admin@ciafal.com.br',
            'Atualização de parâmetros via Modal de Governança',
          )
          carregarDados()
        }}
      />

      <ReconciliacaoSapModal
        isOpen={isReconciliacaoOpen}
        onClose={() => setIsReconciliacaoOpen(false)}
        itensPcp={itens}
      />
    </div>
  )
}
export default AnaliseCarteiraPage
