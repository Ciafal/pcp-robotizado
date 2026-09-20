import React, { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  AlertOctagon,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MESIntegrationBanner } from '@/components/production-control/MESIntegrationBanner'
import { ProductionOrderDetailModal } from '@/components/production-control/ProductionOrderDetailModal'
import {
  pcpProductionService,
  defaultProductionFilters,
  type MESConnectionStatus,
} from '@/services/pcp-production-service'
import type { ProductionPosting, ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatDatePTBR } from '@/lib/formatters-ptbr'
import { useToast } from '@/hooks/use-toast'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

type PostingCardFilter =
  | 'ALL'
  | 'HOJE'
  | 'PENDENTES'
  | 'REJEITADOS_SAP'
  | 'AGUARDANDO_INTEGRACAO'
  | 'DIVERGENCIAS'
  | 'SEM_APONTAMENTO'
  | 'CRITICAS'

interface PendencyItem {
  id: string
  op_number: string
  centro_code: string
  linha_code: string
  material_code: string
  material_description: string
  production_produced_tons: number
  production_posted_tons: number
  difference_tons: number
  motivo: string
  tempo_pendente: string
  responsavel: string
  criticidade: 'CRITICA' | 'ALTA' | 'MEDIA'
  status: string
  orderRef?: ProductionOrder
}

export const ProductionPostingsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'realizados' | 'pendentes'>(() => {
    return searchParams.get('tab') === 'pendentes' ? 'pendentes' : 'realizados'
  })

  const [postings, setPostings] = useState<ProductionPosting[]>([])
  const [orders, setOrders] = useState<ProductionOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [mesStatus, setMesStatus] = useState<MESConnectionStatus | null>(null)
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [statusSapFilter, setStatusSapFilter] = useState<string>('TODOS')
  const [activeCardFilter, setActiveCardFilter] = useState<PostingCardFilter>('ALL')
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)

  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [mes, pResp, oResp] = await Promise.all([
        pcpProductionService.checkMESConnection().catch(
          (): MESConnectionStatus => ({
            available: false,
            lastChecked: new Date().toISOString(),
            message: 'MES 4.0 indisponível temporariamente',
            source: 'OFFLINE',
            activeLinesWithRealtime: [],
          }),
        ),
        pcpProductionService.getPostings().catch(() => ({
          success: true,
          data: pcpProductionService.getStandardSeedPostings(),
          error: null,
          isFallback: true,
          source: 'HOMOLOGATION_SEED' as const,
        })),
        pcpProductionService.getOrders(defaultProductionFilters).catch(() => ({
          success: true,
          data: pcpProductionService.getStandardSeedOrders(),
          error: null,
          isFallback: true,
          source: 'HOMOLOGATION_SEED' as const,
        })),
      ])
      setMesStatus(mes)
      setPostings(Array.isArray(pResp?.data) ? pResp.data : [])
      setOrders(Array.isArray(oResp?.data) ? oResp.data : [])
    } catch (e: any) {
      setLoadError(e?.message || 'Não foi possível carregar os dados.')
      setPostings(pcpProductionService.getStandardSeedPostings())
      setOrders(pcpProductionService.getStandardSeedOrders())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleReprocessPosting = async (posting: ProductionPosting) => {
    setReprocessingId(posting.id)
    try {
      const res = await pcpProductionService.reprocessPosting(posting.id)
      if (res.success) {
        toast({
          title: 'Apontamento Reprocessado com Sucesso',
          description: `Apontamento ${posting.posting_code} sincronizado via RFC ZPPT010.`,
        })
        loadData()
      } else {
        toast({
          title: 'Erro ao Reprocessar Apontamento',
          description: res.error || 'O SAP rejeitou o apontamento.',
          variant: 'destructive',
        })
      }
    } finally {
      setReprocessingId(null)
    }
  }

  // Identificação automática dos pendentes (regras industriais de consistência)
  const pendenciasAutomaticas = useMemo<PendencyItem[]>(() => {
    const items: PendencyItem[] = []

    orders.forEach((o) => {
      const delta = Math.max(0, o.quantity_produced_tons - o.quantity_posted_tons)

      // 1. Produção sem nenhum apontamento
      if (o.quantity_produced_tons > 0 && o.quantity_posted_tons === 0) {
        items.push({
          id: `sem-apont-${o.id}`,
          op_number: o.op_number,
          centro_code: o.centro_code,
          linha_code: o.linha_code,
          material_code: o.material_code,
          material_description: o.material_description,
          production_produced_tons: o.quantity_produced_tons,
          production_posted_tons: 0,
          difference_tons: o.quantity_produced_tons,
          motivo: 'Produção física iniciada no MES sem nenhum apontamento lançado',
          tempo_pendente: '6h 40min',
          responsavel: 'Operador / Líder de Turno',
          criticidade: 'CRITICA',
          status: 'SEM_APONTAMENTO',
          orderRef: o,
        })
      }
      // 2. Apontamento parcial com saldo significativo (> 0.5 t)
      else if (delta > 0.5 && o.status_op !== 'CONCLUIDA_FISICAMENTE') {
        items.push({
          id: `parcial-${o.id}`,
          op_number: o.op_number,
          centro_code: o.centro_code,
          linha_code: o.linha_code,
          material_code: o.material_code,
          material_description: o.material_description,
          production_produced_tons: o.quantity_produced_tons,
          production_posted_tons: o.quantity_posted_tons,
          difference_tons: delta,
          motivo: 'Apontamento parcial: saldo físico produzido pendente de envio',
          tempo_pendente: '3h 15min',
          responsavel: 'Turno Atual',
          criticidade: 'ALTA',
          status: 'PARCIAL',
          orderRef: o,
        })
      }

      // 3. OP Concluída fisicamente mas não totalmente apontada
      if (
        (o.status_op === 'CONCLUIDA_FISICAMENTE' ||
          o.quantity_produced_tons >= o.quantity_planned_tons) &&
        o.quantity_posted_tons < o.quantity_produced_tons * 0.99
      ) {
        items.push({
          id: `concl-nao-apont-${o.id}`,
          op_number: o.op_number,
          centro_code: o.centro_code,
          linha_code: o.linha_code,
          material_code: o.material_code,
          material_description: o.material_description,
          production_produced_tons: o.quantity_produced_tons,
          production_posted_tons: o.quantity_posted_tons,
          difference_tons: delta,
          motivo: 'OP concluída fisicamente mas com apontamento incompleto no SAP',
          tempo_pendente: '12h 20min',
          responsavel: 'PCP / Encarregado',
          criticidade: 'CRITICA',
          status: 'FECHAMENTO_BLOQUEADO',
          orderRef: o,
        })
      }

      // 4. Rejeitado pelo SAP
      if (o.status_sap === 'REJEITADA_SAP' || o.status_sap === 'ERRO_INTEGRACAO') {
        items.push({
          id: `rejeit-sap-${o.id}`,
          op_number: o.op_number,
          centro_code: o.centro_code,
          linha_code: o.linha_code,
          material_code: o.material_code,
          material_description: o.material_description,
          production_produced_tons: o.quantity_produced_tons,
          production_posted_tons: o.quantity_posted_tons,
          difference_tons: delta,
          motivo:
            o.sap_message || 'Transação ZPPT010 retornou erro de consistência/depósito no SAP',
          tempo_pendente: '1d 04h',
          responsavel: 'TI / Integração PCP',
          criticidade: 'CRITICA',
          status: 'REJEITADO_SAP',
          orderRef: o,
        })
      }
    })

    return items
  }, [orders])

  // Métricas dos cards clicáveis
  const countRealizadosHoje = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return postings.filter((p) => (p.posting_date || '').slice(0, 10) === today || p.posting_date)
      .length
  }, [postings])

  const countPendentes = pendenciasAutomaticas.length
  const countRejeitadosSap = useMemo(
    () => postings.filter((p) => p.status_sap === 'REJEITADO_SAP').length,
    [postings],
  )
  const countAguardandoIntegracao = useMemo(
    () =>
      postings.filter((p) => p.status_sap === 'ENVIADO_SAP' || p.status_sap === 'REPROCESSANDO')
        .length,
    [postings],
  )
  const countDivergencias = pendenciasAutomaticas.filter((p) => p.difference_tons > 1.0).length
  const countSemApontamento = pendenciasAutomaticas.filter(
    (p) => p.status === 'SEM_APONTAMENTO',
  ).length
  const countPendenciasCriticas = pendenciasAutomaticas.filter(
    (p) => p.criticidade === 'CRITICA',
  ).length

  // Filtragem da tabela Realizados
  const filteredPostings = useMemo(() => {
    return postings.filter((p) => {
      if (searchTerm) {
        const t = searchTerm.toLowerCase()
        const match =
          p.op_number.toLowerCase().includes(t) ||
          p.posting_code.toLowerCase().includes(t) ||
          p.operator_name.toLowerCase().includes(t) ||
          (p.sap_document_number && p.sap_document_number.toLowerCase().includes(t)) ||
          p.material_code.toLowerCase().includes(t) ||
          p.material_description.toLowerCase().includes(t)
        if (!match) return false
      }
      if (statusSapFilter !== 'TODOS' && p.status_sap !== statusSapFilter) {
        return false
      }
      if (activeCardFilter === 'REJEITADOS_SAP' && p.status_sap !== 'REJEITADO_SAP') return false
      if (
        activeCardFilter === 'AGUARDANDO_INTEGRACAO' &&
        !(p.status_sap === 'ENVIADO_SAP' || p.status_sap === 'REPROCESSANDO')
      )
        return false
      return true
    })
  }, [postings, searchTerm, statusSapFilter, activeCardFilter])

  // Filtragem da tabela Pendentes
  const filteredPendencias = useMemo(() => {
    return pendenciasAutomaticas.filter((it) => {
      if (searchTerm) {
        const t = searchTerm.toLowerCase()
        const match =
          it.op_number.toLowerCase().includes(t) ||
          it.material_code.toLowerCase().includes(t) ||
          it.material_description.toLowerCase().includes(t) ||
          it.motivo.toLowerCase().includes(t)
        if (!match) return false
      }
      if (activeCardFilter === 'SEM_APONTAMENTO' && it.status !== 'SEM_APONTAMENTO') return false
      if (activeCardFilter === 'DIVERGENCIAS' && it.difference_tons <= 1.0) return false
      if (activeCardFilter === 'CRITICAS' && it.criticidade !== 'CRITICA') return false
      if (activeCardFilter === 'REJEITADOS_SAP' && it.status !== 'REJEITADO_SAP') return false
      return true
    })
  }, [pendenciasAutomaticas, searchTerm, activeCardFilter])

  const handleOpenOrder = (opNum: string) => {
    const found = orders.find((o) => o.op_number === opNum)
    if (found) {
      setSelectedOrder(found)
      setDetailModalOpen(true)
    } else {
      navigate(`/pcp/controle-producao/ordens?search=${opNum}`)
    }
  }

  const handleExportPostings = () => {
    if (filteredPostings.length === 0) return
    const headers = [
      'Data',
      'Hora',
      'OP',
      'Centro',
      'Linha',
      'Operacao',
      'Quantidade_t',
      'Unidade',
      'Operador',
      'Origem',
      'Status_MES',
      'Status_SAP',
      'Doc_SAP',
      'Mensagem_SAP',
    ]
    const rows = filteredPostings.map((p) => [
      formatDatePTBR(p.posting_date),
      p.posting_time,
      p.op_number,
      p.centro_code,
      p.linha_code,
      p.operation_code,
      String(p.quantity_tons).replace('.', ','),
      't',
      p.operator_name,
      p.data_origin,
      p.status_mes,
      p.status_sap,
      p.sap_document_number || '',
      `"${(p.sap_message || '').replace(/"/g, '""')}"`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `apontamentos-producao-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen space-y-4">
      {/* Cabeçalho */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Apontamentos de Produção
            </h1>
            <Badge className="bg-[#004C97] hover:bg-[#003d7a] text-white text-[11px] font-semibold">
              CONTROLE DE PRODUÇÃO
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Gestão operacional dos apontamentos físicos (MES 4.0), conciliação com SAP (ZPPT010) e
            identificação automática de pendências.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <MESIntegrationBanner
            status={mesStatus}
            loading={loading}
            onRefresh={() => pcpProductionService.checkMESConnection().then(setMesStatus)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPostings}
            className="h-8 text-xs bg-white text-[#004C97] border-slate-200 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar
          </Button>
        </div>
      </div>

      {/* CARDS CLICÁVEIS NO TOPO (FILTRANDO AS TABELAS) */}
      <ErrorBoundary moduleName="Cards de Apontamento" variant="compact">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* 1. Realizados Hoje */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('realizados')
              setActiveCardFilter('HOJE')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeTab === 'realizados' && activeCardFilter === 'HOJE'
                ? 'bg-blue-50/80 border-[#004C97] shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-slate-500 uppercase block truncate">
              Realizados Hoje
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-0.5">
              {countRealizadosHoje}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">Registros no MES</span>
          </button>

          {/* 2. Pendentes */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pendentes')
              setActiveCardFilter('PENDENTES')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeTab === 'pendentes' && activeCardFilter === 'PENDENTES'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-amber-700 uppercase block truncate">
              Pendentes
            </span>
            <span className="text-xl font-bold font-mono text-amber-800 block mt-0.5">
              {countPendentes}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">Identificação auto</span>
          </button>

          {/* 3. Rejeitados SAP */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('realizados')
              setActiveCardFilter('REJEITADOS_SAP')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'REJEITADOS_SAP'
                ? 'bg-rose-50 border-rose-500 shadow-xs'
                : 'bg-white border-rose-200 hover:border-rose-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-rose-700 uppercase block truncate">
              Rejeitados SAP
            </span>
            <span className="text-xl font-bold font-mono text-rose-700 block mt-0.5">
              {countRejeitadosSap}
            </span>
            <span className="text-[10px] text-rose-600 block truncate">Requerem correção</span>
          </button>

          {/* 4. Aguardando Integração */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('realizados')
              setActiveCardFilter('AGUARDANDO_INTEGRACAO')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeCardFilter === 'AGUARDANDO_INTEGRACAO'
                ? 'bg-blue-50 border-blue-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-blue-700 uppercase block truncate">
              Aguard. Integração
            </span>
            <span className="text-xl font-bold font-mono text-blue-900 block mt-0.5">
              {countAguardandoIntegracao}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">Fila ZPPT010</span>
          </button>

          {/* 5. Divergências */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pendentes')
              setActiveCardFilter('DIVERGENCIAS')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeTab === 'pendentes' && activeCardFilter === 'DIVERGENCIAS'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-amber-700 uppercase block truncate">
              Divergências
            </span>
            <span className="text-xl font-bold font-mono text-amber-800 block mt-0.5">
              {countDivergencias}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">Delta &gt; 1,0 t</span>
          </button>

          {/* 6. OPs Sem Apontamento */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pendentes')
              setActiveCardFilter('SEM_APONTAMENTO')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeTab === 'pendentes' && activeCardFilter === 'SEM_APONTAMENTO'
                ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-amber-700 uppercase block truncate">
              Sem Apontamento
            </span>
            <span className="text-xl font-bold font-mono text-amber-800 block mt-0.5">
              {countSemApontamento}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">Físico &gt; 0</span>
          </button>

          {/* 7. Pendências Críticas */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('pendentes')
              setActiveCardFilter('CRITICAS')
            }}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeTab === 'pendentes' && activeCardFilter === 'CRITICAS'
                ? 'bg-rose-50 border-rose-500 shadow-xs'
                : 'bg-white border-rose-200 hover:border-rose-300'
            }`}
          >
            <span className="text-[10px] font-semibold text-rose-700 uppercase block truncate">
              Pendências Críticas
            </span>
            <span className="text-xl font-bold font-mono text-rose-700 block mt-0.5">
              {countPendenciasCriticas}
            </span>
            <span className="text-[10px] text-rose-600 block truncate">Bloqueiam fechamento</span>
          </button>
        </div>
      </ErrorBoundary>

      {/* ABAS [REALIZADOS] E [PENDENTES] */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as 'realizados' | 'pendentes')
          setActiveCardFilter('ALL')
          setSearchParams({ tab: val })
        }}
        className="space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger
              value="realizados"
              className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:text-[#004C97] font-semibold"
            >
              Apontamentos Realizados ({filteredPostings.length})
            </TabsTrigger>
            <TabsTrigger
              value="pendentes"
              className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:text-amber-800 font-semibold"
            >
              Apontamentos Pendentes ({pendenciasAutomaticas.length})
            </TabsTrigger>
          </TabsList>

          {/* Barra de Busca e Filtro de Status SAP */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por OP, material, operador..."
                className="pl-8 h-8 text-xs bg-white"
              />
            </div>

            {activeTab === 'realizados' && (
              <Select value={statusSapFilter} onValueChange={setStatusSapFilter}>
                <SelectTrigger className="h-8 text-xs w-[170px] bg-white">
                  <SelectValue placeholder="Status SAP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Status SAP: Todos</SelectItem>
                  <SelectItem value="PROCESSADO_SAP">Processado SAP</SelectItem>
                  <SelectItem value="REJEITADO_SAP">Rejeitado SAP</SelectItem>
                  <SelectItem value="ENVIADO_SAP">Enviado SAP</SelectItem>
                  <SelectItem value="AGUARDANDO_CORRECAO">Aguardando Correção</SelectItem>
                </SelectContent>
              </Select>
            )}

            {activeCardFilter !== 'ALL' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveCardFilter('ALL')}
                className="h-8 text-xs text-[#004C97] hover:underline"
              >
                Limpar filtro card
              </Button>
            )}
          </div>
        </div>

        {/* ABA 1: REALIZADOS */}
        <TabsContent value="realizados" className="space-y-0">
          <ErrorBoundary moduleName="Tabela de Apontamentos Realizados" variant="compact">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Hora</th>
                      <th className="py-2.5 px-3">OP</th>
                      <th className="py-2.5 px-3">Centro</th>
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3">Operação</th>
                      <th className="py-2.5 px-3 text-right">Quantidade</th>
                      <th className="py-2.5 px-3 text-center">Unidade</th>
                      <th className="py-2.5 px-3">Operador</th>
                      <th className="py-2.5 px-3 text-center">Origem</th>
                      <th className="py-2.5 px-3 text-center">Status MES</th>
                      <th className="py-2.5 px-3 text-center">Status SAP</th>
                      <th className="py-2.5 px-3">Data Integração</th>
                      <th className="py-2.5 px-3">Mensagem Integração</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={15} className="py-10 text-center text-slate-500">
                          Carregando apontamentos...
                        </td>
                      </tr>
                    ) : loadError ? (
                      <tr>
                        <td colSpan={15} className="py-8 text-center text-rose-700 bg-rose-50/50">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span>Não foi possível carregar os dados. Tentar novamente.</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={loadData}
                              className="h-7 text-xs border-rose-300 text-rose-800 bg-white hover:bg-rose-50"
                            >
                              Tentar novamente
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : filteredPostings.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="py-8 text-center text-slate-500">
                          Nenhum apontamento realizado encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredPostings.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => handleOpenOrder(p.op_number)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-700">
                            {formatDatePTBR(p.posting_date)}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {p.posting_time}
                          </td>
                          <td className="py-2.5 px-3 font-bold font-mono text-[#004C97] whitespace-nowrap">
                            {p.op_number}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-800">
                            {p.centro_code}
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px]">
                            <div className="font-medium text-slate-900 truncate">
                              {p.material_description || p.material_code}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {p.material_code}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {p.operation_code}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatQuantity(p.quantity_tons, 't')}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">t</td>
                          <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                            {p.operator_name}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                              {p.data_origin}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono ${
                                p.status_mes === 'VALIDADO_MES'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              {p.status_mes}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono ${
                                p.status_sap === 'PROCESSADO_SAP'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : p.status_sap === 'REJEITADO_SAP'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-blue-50 text-blue-800 border-blue-300'
                              }`}
                            >
                              {p.status_sap}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {p.sap_document_number ? formatDatePTBR(p.posting_date) : '-'}
                          </td>
                          <td className="py-2.5 px-3 max-w-[240px]">
                            {p.sap_document_number && (
                              <div className="font-mono text-[11px] font-bold text-emerald-800">
                                Doc: {p.sap_document_number}
                              </div>
                            )}
                            <p
                              className="text-[11px] text-slate-600 truncate"
                              title={p.sap_message || ''}
                            >
                              {p.sap_message || '-'}
                            </p>
                          </td>
                          <td
                            className="py-2.5 px-3 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {p.status_sap === 'REJEITADO_SAP' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReprocessPosting(p)}
                                  disabled={reprocessingId === p.id}
                                  className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                                >
                                  <RotateCcw
                                    className={`w-3 h-3 mr-1 ${
                                      reprocessingId === p.id ? 'animate-spin' : ''
                                    }`}
                                  />
                                  Reprocessar
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenOrder(p.op_number)}
                                  className="h-7 text-xs text-[#004C97] hover:text-[#003870]"
                                >
                                  Ver OP &rarr;
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </ErrorBoundary>
        </TabsContent>

        {/* ABA 2: PENDENTES */}
        <TabsContent value="pendentes" className="space-y-0">
          <ErrorBoundary moduleName="Tabela de Apontamentos Pendentes" variant="compact">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <div className="p-3 border-b bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Identificação automática de divergências, faltas de apontamento e rejeições SAP.
                  </span>
                </div>
                <span className="font-medium">
                  Clique na linha para abrir a OP correspondente e agir.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/90 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">OP</th>
                      <th className="py-2.5 px-3">Centro</th>
                      <th className="py-2.5 px-3">Material</th>
                      <th className="py-2.5 px-3 text-right">Produção realizada</th>
                      <th className="py-2.5 px-3 text-right">Produção apontada</th>
                      <th className="py-2.5 px-3 text-right">Diferença</th>
                      <th className="py-2.5 px-3">Pendência</th>
                      <th className="py-2.5 px-3 text-center">Tempo pendente</th>
                      <th className="py-2.5 px-3">Responsável</th>
                      <th className="py-2.5 px-3 text-center">Criticidade</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="py-10 text-center text-slate-500">
                          Carregando pendências...
                        </td>
                      </tr>
                    ) : filteredPendencias.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-500">
                          Nenhum apontamento pendente encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredPendencias.map((it) => (
                        <tr
                          key={it.id}
                          onClick={() => handleOpenOrder(it.op_number)}
                          className="hover:bg-amber-50/50 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 font-bold font-mono text-[#004C97] whitespace-nowrap">
                            {it.op_number}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                            {it.centro_code}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px]">
                            <div className="font-medium text-slate-900 truncate">
                              {it.material_description}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {it.material_code}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                            {formatQuantity(it.production_produced_tons, 't')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatQuantity(it.production_posted_tons, 't')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800 whitespace-nowrap">
                            {formatQuantity(it.difference_tons, 't')}
                          </td>
                          <td className="py-2.5 px-3 max-w-[260px]">
                            <p
                              className="text-[11px] text-slate-700 line-clamp-2"
                              title={it.motivo}
                            >
                              {it.motivo}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {it.tempo_pendente}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                            {it.responsavel}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-mono ${
                                it.criticidade === 'CRITICA'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}
                            >
                              {it.criticidade === 'CRITICA' ? '🔴 Crítica' : '🟡 Alta'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                              {it.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td
                            className="py-2.5 px-3 text-center whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenOrder(it.op_number)}
                              className="h-7 text-xs text-[#004C97] hover:text-[#003870]"
                            >
                              Abrir OP &rarr;
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhe da OP */}
      <ProductionOrderDetailModal
        order={selectedOrder}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onOrderUpdated={loadData}
      />
    </div>
  )
}

export default ProductionPostingsPage
