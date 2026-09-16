import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  pcpAuditService,
  PCPAuditLogRecord,
  AuditFilters,
  AuditKpis,
  GovernanceStabilityKpis,
  IAInsightAudit,
} from '@/services/pcp-audit-service'
import { pcpReasonsService } from '@/services/pcp-reasons-service'
import { PCPChangeReason } from '@/types/pcp-reasons'
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Download,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Eye,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Cpu,
  ArrowRight,
  Clock,
  User,
  Building,
  Activity,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

export default function AuditPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Estados de dados
  const [logs, setLogs] = useState<PCPAuditLogRecord[]>([])
  const [kpis, setKpis] = useState<AuditKpis>({
    totalEvents: 0,
    creationsCount: 0,
    alterationsCount: 0,
    deletionsInactivationsCount: 0,
    reprogrammingCount: 0,
    automaticEventsCount: 0,
    sapIntegrationsCount: 0,
    iaEventsCount: 0,
    activeUsersCount: 0,
    errorsFailuresCount: 0,
  })
  const [stabilityKpis, setStabilityKpis] = useState<GovernanceStabilityKpis>({
    stabilityIndex: 100,
    stabilityLabel: 'MUITO ESTÁVEL',
    reprogrammingRatePct: 0,
    changesAfterApprovalCount: 0,
    changesNearExecutionCount: 0,
    topRecurringCauses: [],
  })
  const [aiInsights, setAiInsights] = useState<IAInsightAudit[]>([])
  const [changeReasons, setChangeReasons] = useState<PCPChangeReason[]>([])

  // Estado de paginação e paginação no backend
  const [loading, setLoading] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(25)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalItems, setTotalItems] = useState<number>(0)

  // Filtros avançados recolhíveis
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(true)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<string>('ALL')
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')
  const [selectedCenter, setSelectedCenter] = useState<string>('ALL')
  const [selectedModule, setSelectedModule] = useState<string>('ALL')
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL')
  const [selectedReason, setSelectedReason] = useState<string>('ALL')
  const [selectedSource, setSelectedSource] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Detalhes do evento selecionado (Modal de Auditoria Profunda)
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<PCPAuditLogRecord | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false)

  // Linha do tempo / histórico de registro específico
  const [timelineRecordId, setTimelineRecordId] = useState<string>('')

  // Aba ativa
  const [activeMainTab, setActiveMainTab] = useState<'trilha' | 'governanca' | 'ia'>('trilha')

  // Carregar motivos padronizados para o filtro
  useEffect(() => {
    async function loadReasons() {
      try {
        const res = await pcpReasonsService.listReasons(true)
        setChangeReasons(res)
      } catch (err) {
        console.warn('Erro ao carregar motivos padronizados:', err)
      }
    }
    loadReasons()
  }, [])

  // Buscar logs paginados com os filtros aplicados
  const fetchAuditData = async (targetPage = page) => {
    setLoading(true)
    const filters: AuditFilters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      company: selectedCompany !== 'ALL' ? selectedCompany : undefined,
      line: selectedLine !== 'ALL' ? selectedLine : undefined,
      center: selectedCenter !== 'ALL' ? selectedCenter : undefined,
      module: selectedModule !== 'ALL' ? selectedModule : undefined,
      eventType: selectedEventType !== 'ALL' ? selectedEventType : undefined,
      reason: selectedReason !== 'ALL' ? selectedReason : undefined,
      source: selectedSource !== 'ALL' ? selectedSource : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      users: selectedUser !== 'ALL' ? [selectedUser] : undefined,
      search: searchQuery || undefined,
      recordId: timelineRecordId || undefined,
    }

    try {
      const res = await pcpAuditService.listLogs(filters, targetPage, perPage)
      setLogs(res.items)
      setTotalItems(res.totalItems)
      setTotalPages(res.totalPages)
      setPage(res.page)
      setKpis(res.kpis)

      // Calcula indicadores de estabilidade e IA sobre a amostra carregada
      const stab = pcpAuditService.calculateStabilityKpis(res.items)
      setStabilityKpis(stab)

      const insights = pcpAuditService.generateDeterministicAIInsights(res.items)
      setAiInsights(insights)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao consultar trilha de auditoria',
        description: err.message || 'Falha ao conectar com o banco de dados.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Dispara busca na mudança de página ou filtros estruturais
  useEffect(() => {
    fetchAuditData(1)
  }, [
    page,
    perPage,
    selectedCompany,
    selectedLine,
    selectedCenter,
    selectedModule,
    selectedEventType,
    selectedReason,
    selectedSource,
    selectedStatus,
    selectedUser,
    timelineRecordId,
  ])

  // Realtime subscription para novos eventos de auditoria
  useRealtime('pcp_audit_logs', (data) => {
    if (data.action === 'create') {
      fetchAuditData(page)
    }
  })

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setSelectedUser('ALL')
    setSelectedCompany('ALL')
    setSelectedLine('ALL')
    setSelectedCenter('ALL')
    setSelectedModule('ALL')
    setSelectedEventType('ALL')
    setSelectedReason('ALL')
    setSelectedSource('ALL')
    setSelectedStatus('ALL')
    setSearchQuery('')
    setTimelineRecordId('')
    setPage(1)
  }

  // Exportações respeitando exatamente os filtros da tela
  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sem registros',
        description: 'Não há eventos para exportação com os filtros atuais.',
      })
      return
    }

    const headers = [
      'ID Evento',
      'Data/Hora',
      'Usuário',
      'Perfil',
      'Empresa',
      'Linha',
      'Centro',
      'Módulo',
      'Registro',
      'Ação',
      'Motivo',
      'Justificativa',
      'Origem',
      'Status',
    ]

    const rows = logs.map((l) => [
      l.event_id || l.id,
      new Date(l.created).toLocaleString('pt-BR'),
      l.user_name || l.user_email || '',
      l.user_role || l.profile || '',
      l.company || 'CIAFAL',
      l.line || '',
      l.center || '',
      l.module || '',
      l.record_id || '',
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${(l.justification || '').replace(/"/g, '""')}"`,
      l.source || '',
      l.status || '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ciafal_logs_auditoria_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: 'Exportação CSV Concluída',
      description: `${logs.length} eventos exportados com sucesso.`,
    })
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="space-y-5 pb-16">
      {/* CABEÇALHO PRINCIPAL DA PÁGINA (SEM FIXED/STICKY) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Logs & Auditoria Transacional
                </h1>
                <Badge className="bg-[#004C97] text-white text-[10px] uppercase font-bold tracking-wider">
                  Trilha Oficial Imutável
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rastreabilidade ponta a ponta: QUEM → FEZ O QUÊ → ONDE → QUANDO → POR QUÊ → ORIGEM →
                STATUS.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAuditData(page)}
            disabled={loading}
            className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Exportar CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            Imprimir / PDF Formal
          </Button>
        </div>
      </div>

      {/* CARDS DE RESUMO NO TOPO (RESPEITAM OS FILTROS APLICADOS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2.5">
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Eventos
          </span>
          <span className="text-lg font-black text-slate-900 mt-1 block">{kpis.totalEvents}</span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
            Criações
          </span>
          <span className="text-lg font-black text-emerald-700 mt-1 block">
            {kpis.creationsCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
            Alterações
          </span>
          <span className="text-lg font-black text-blue-700 mt-1 block">
            {kpis.alterationsCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
            Exclusões/Inat.
          </span>
          <span className="text-lg font-black text-rose-700 mt-1 block">
            {kpis.deletionsInactivationsCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
            Reprogramações
          </span>
          <span className="text-lg font-black text-purple-700 mt-1 block">
            {kpis.reprogrammingCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
            Automações
          </span>
          <span className="text-lg font-black text-slate-800 mt-1 block">
            {kpis.automaticEventsCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-wider block">
            SAP / Integr.
          </span>
          <span className="text-lg font-black text-[#004C97] mt-1 block">
            {kpis.sapIntegrationsCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
            Eventos IA
          </span>
          <span className="text-lg font-black text-indigo-700 mt-1 block">
            {kpis.iaEventsCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">
            Usuários Ativos
          </span>
          <span className="text-lg font-black text-teal-700 mt-1 block">
            {kpis.activeUsersCount}
          </span>
        </Card>
        <Card className="border-slate-200 shadow-2xs p-2.5 bg-white">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
            Erros / Falhas
          </span>
          <span className="text-lg font-black text-red-700 mt-1 block">
            {kpis.errorsFailuresCount}
          </span>
        </Card>
      </div>

      {/* ABAS DO MÓDULO */}
      <Tabs
        value={activeMainTab}
        onValueChange={(v) => setActiveMainTab(v as any)}
        className="space-y-4"
      >
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger
            value="trilha"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            Trilha de Auditoria ({totalItems})
          </TabsTrigger>
          <TabsTrigger
            value="governanca"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            Visão Geral & Estabilidade
          </TabsTrigger>
          <TabsTrigger
            value="ia"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Análises de IA da Auditoria ({aiInsights.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: TRILHA DE AUDITORIA TRANSACIONAL */}
        {/* ========================================================================= */}
        <TabsContent value="trilha" className="space-y-4">
          {/* FILTROS RECOLHÍVEIS / EXPANSÍVEIS */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader
              className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-row items-center justify-between cursor-pointer"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#004C97]" />
                <span className="text-xs font-bold text-slate-800">
                  Filtros de Auditoria Transacional
                </span>
                {timelineRecordId && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-700 border-amber-300"
                  >
                    Registro: {timelineRecordId}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">
                  {filtersExpanded ? 'Recolher filtros' : 'Expandir filtros'}
                </span>
                {filtersExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </CardHeader>

            {filtersExpanded && (
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {/* Data Inicial */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Data Inicial
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {/* Data Final */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Data Final
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>

                  {/* Empresa */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Empresa
                    </label>
                    <select
                      value={selectedCompany}
                      onChange={(e) => setSelectedCompany(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todas as Empresas</option>
                      <option value="CIAFAL">CIAFAL Matriz (01)</option>
                      <option value="SIDERCENTRO">SIDERCENTRO (02)</option>
                    </select>
                  </div>

                  {/* Linha Produtiva */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Linha</label>
                    <select
                      value={selectedLine}
                      onChange={(e) => setSelectedLine(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todas as Linhas</option>
                      <option value="L1">L1 - Laminação Pesada</option>
                      <option value="L2">L2 - Laminação Média</option>
                      <option value="L3">L3 - Perfis Leves</option>
                      <option value="CORTE">Corte & Dobra</option>
                      <option value="TRAT">Tratamento Térmico</option>
                    </select>
                  </div>

                  {/* Módulo */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Módulo</label>
                    <select
                      value={selectedModule}
                      onChange={(e) => setSelectedModule(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todos os Módulos</option>
                      <option value="Programação">Programação</option>
                      <option value="Montagem da Programação">Montagem da Programação</option>
                      <option value="Execução">Execução</option>
                      <option value="Análise de Carteira">Análise de Carteira</option>
                      <option value="Gestão de MP">Gestão de MP</option>
                      <option value="Centros e Ficha Mestra">Centros e Ficha Mestra</option>
                      <option value="Hierarquia das Linhas">Hierarquia das Linhas</option>
                      <option value="Sequenciamento">Sequenciamento</option>
                      <option value="Integrações & Governança">Integrações & Governança</option>
                      <option value="Reunião PCP">Reunião PCP</option>
                    </select>
                  </div>

                  {/* Tipo de Evento */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Tipo de Evento
                    </label>
                    <select
                      value={selectedEventType}
                      onChange={(e) => setSelectedEventType(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todos os Tipos</option>
                      <option value="Criação">Criação</option>
                      <option value="Alteração">Alteração</option>
                      <option value="Exclusão">Exclusão</option>
                      <option value="Ativação">Ativação</option>
                      <option value="Inativação">Inativação</option>
                      <option value="Reprogramação">Reprogramação</option>
                      <option value="Aprovação">Aprovação</option>
                      <option value="Reprovação">Reprovação</option>
                      <option value="Input">Input Manual</option>
                      <option value="Integração">Integração</option>
                      <option value="IA">Inteligência Artificial</option>
                      <option value="Falha">Falha / Erro</option>
                      <option value="Automação">Automação</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  {/* Motivo Padronizado */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Motivo (Governança)
                    </label>
                    <select
                      value={selectedReason}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todos os Motivos ({changeReasons.length})</option>
                      {changeReasons.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.code} - {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origem */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Origem</label>
                    <select
                      value={selectedSource}
                      onChange={(e) => setSelectedSource(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todas as Origens</option>
                      <option value="Usuário">Usuário</option>
                      <option value="PCP Robotizado">PCP Robotizado</option>
                      <option value="SAP">SAP</option>
                      <option value="BAPI">BAPI</option>
                      <option value="API">API</option>
                      <option value="MES 4.0">MES 4.0</option>
                      <option value="HUB">HUB</option>
                      <option value="IA">IA</option>
                      <option value="Job">Job Automático</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Status</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todos os Status</option>
                      <option value="Concluída">Concluída</option>
                      <option value="Erro">Erro / Falha</option>
                      <option value="Rejeitada">Rejeitada</option>
                      <option value="Cancelada">Cancelada</option>
                      <option value="Pendente">Pendente</option>
                    </select>
                  </div>

                  {/* Usuário */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase">
                      Usuário
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full h-8 text-xs bg-white border border-slate-300 rounded-md px-2 mt-1 outline-none"
                    >
                      <option value="ALL">Todos os Usuários</option>
                      <option value="admin">Administrador Geral</option>
                      <option value="programador">Programador PCP</option>
                      <option value="operador">Operador de Linha</option>
                      <option value="sistema@ciafal.com.br">PCP Robotizado (Sistema)</option>
                    </select>
                  </div>
                </div>

                {/* Busca Livre & Botões de Ação */}
                <div className="flex flex-col md:flex-row items-center gap-3 pt-2">
                  <div className="relative flex-1 w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      placeholder="Busca livre: código de material, ordem, usuário, motivo, ID do registro, conteúdo alterado..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchAuditData(1)}
                      className="pl-8 h-8 text-xs bg-slate-50/50"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button
                      size="sm"
                      onClick={() => fetchAuditData(1)}
                      className="h-8 text-xs bg-[#004C97] hover:bg-[#003B75] text-white font-semibold"
                    >
                      Aplicar Filtros
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearFilters}
                      className="h-8 text-xs border-slate-300 text-slate-600"
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* TABELA DE AUDITORIA TRANSACIONAL */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Eventos Registrados ({totalItems})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Visualização oficial com suporte a paginação backend, ordenação e detalhamento de
                  mudanças.
                </CardDescription>
              </div>

              {/* Seletor de registros por página */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Linhas por página:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value))
                    setPage(1)
                  }}
                  className="h-7 text-xs bg-white border border-slate-300 rounded px-2 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* CONTAINER COM SCROLL HORIZONTAL ISOLADO */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Usuário</th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Linha</th>
                      <th className="p-3">Módulo</th>
                      <th className="p-3">Registro</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Alteração</th>
                      <th className="p-3">Motivo</th>
                      <th className="p-3">Origem</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#004C97] mb-2" />
                          Consultando trilha de auditoria oficial...
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400">
                          Nenhum evento localizado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => {
                        const changes = log.changes || []
                        const hasMultipleChanges = changes.length > 1
                        const isError = log.status === 'Erro' || log.outcome === 'FAILED'

                        return (
                          <tr
                            key={log.id}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isError ? 'bg-red-50/40' : ''
                            }`}
                          >
                            {/* Data/Hora */}
                            <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                              {new Date(log.created).toLocaleString('pt-BR')}
                            </td>

                            {/* Usuário */}
                            <td className="p-3">
                              <div className="font-semibold text-slate-800">
                                {log.user_name || log.user_email || 'Sistema'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {log.user_role || log.profile || 'PCP_PROGRAMMER'}
                              </div>
                            </td>

                            {/* Empresa */}
                            <td className="p-3 font-semibold text-slate-700">
                              {log.company || 'CIAFAL'}
                            </td>

                            {/* Linha */}
                            <td className="p-3">
                              {log.line ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-mono bg-slate-50 border-slate-300"
                                >
                                  {log.line}
                                </Badge>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            {/* Módulo */}
                            <td className="p-3 text-slate-700 font-medium">
                              {log.module || 'Programação'}
                            </td>

                            {/* Registro */}
                            <td
                              className="p-3 font-mono text-[11px] text-slate-600 max-w-[130px] truncate"
                              title={log.record_id}
                            >
                              {log.record_id ? (
                                <button
                                  type="button"
                                  onClick={() => setTimelineRecordId(log.record_id || '')}
                                  className="text-[#004C97] hover:underline font-bold"
                                  title="Filtrar histórico deste registro"
                                >
                                  {log.record_id}
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>

                            {/* Ação */}
                            <td className="p-3">
                              <span
                                className="font-semibold text-slate-800 line-clamp-1"
                                title={log.action}
                              >
                                {log.action}
                              </span>
                            </td>

                            {/* Alteração (Antes x Depois resumido) */}
                            <td className="p-3">
                              {changes.length === 0 ? (
                                <span className="text-slate-400 text-[11px]">Sem campos diff</span>
                              ) : hasMultipleChanges ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLogForDetails(log)
                                    setIsDetailsOpen(true)
                                  }}
                                  className="inline-flex items-center text-xs text-[#004C97] font-semibold hover:underline"
                                >
                                  {changes.length} campos alterados
                                </button>
                              ) : (
                                <div className="text-[11px]">
                                  <span className="font-medium text-slate-600">
                                    {changes[0].fieldNamePt || changes[0].field}:
                                  </span>{' '}
                                  <span className="text-rose-600 line-through mr-1">
                                    {String(changes[0].before ?? '—')}
                                  </span>
                                  <ArrowRight className="inline w-3 h-3 text-slate-400 mx-0.5" />
                                  <span className="text-emerald-700 font-semibold">
                                    {String(changes[0].after ?? '—')}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Motivo */}
                            <td className="p-3">
                              {log.reason ? (
                                <span
                                  className="font-medium text-slate-700 line-clamp-1"
                                  title={log.reason}
                                >
                                  {log.reason}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">
                                  Não aplicável
                                </span>
                              )}
                            </td>

                            {/* Origem */}
                            <td className="p-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  log.source === 'SAP' || log.source === 'BAPI'
                                    ? 'bg-blue-50 text-[#004C97] border-[#004C97]/30'
                                    : log.source === 'IA'
                                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                      : log.source === 'PCP Robotizado'
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-slate-50 text-slate-700 border-slate-300'
                                }`}
                              >
                                {log.source || 'Usuário'}
                              </Badge>
                            </td>

                            {/* Status */}
                            <td className="p-3">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  isError
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : log.status === 'Rejeitada' || log.status === 'Cancelada'
                                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                {log.status || 'Concluída'}
                              </Badge>
                            </td>

                            {/* Ações / Detalhes */}
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLogForDetails(log)
                                  setIsDetailsOpen(true)
                                }}
                                className="h-7 px-2 text-[11px] text-[#004C97] hover:bg-blue-50 font-semibold"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" /> Ver Detalhes
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINAÇÃO BACKEND */}
              <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div>
                  Mostrando página <strong>{page}</strong> de <strong>{totalPages || 1}</strong> (
                  {totalItems} eventos no total)
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 text-xs border-slate-300"
                  >
                    Anterior
                  </Button>

                  <span className="px-2 text-xs font-semibold text-slate-700">
                    {page} / {totalPages || 1}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 text-xs border-slate-300"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: VISÃO GERAL & ESTABILIDADE DA GOVERNANÇA */}
        {/* ========================================================================= */}
        <TabsContent value="governanca" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Índice de Estabilidade */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Índice de Estabilidade do PCP
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Calculado estritamente sobre a frequência de reprogramações e alterações no
                  histórico real.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                <div className="relative flex items-center justify-center w-28 h-28 rounded-full border-4 border-blue-100 bg-blue-50/50">
                  <span className="text-3xl font-black text-[#004C97]">
                    {stabilityKpis.stabilityIndex}%
                  </span>
                </div>
                <Badge
                  className={`mt-4 text-xs font-bold ${
                    stabilityKpis.stabilityIndex > 70
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {stabilityKpis.stabilityLabel}
                </Badge>
                <p className="text-xs text-slate-500 mt-2">
                  Taxa de reprogramação calculada: {stabilityKpis.reprogrammingRatePct}% dos
                  eventos.
                </p>
              </CardContent>
            </Card>

            {/* Causas Recorrentes */}
            <Card className="border-slate-200 shadow-2xs md:col-span-2">
              <CardHeader className="p-4 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Principais Causas de Reprogramação (Top 5)
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Frequência dos motivos padronizados declarados pelos programadores e integrações.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {stabilityKpis.topRecurringCauses.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Sem motivos registrados no recorte selecionado.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stabilityKpis.topRecurringCauses.map((c, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-800 truncate">{c.reason}</span>
                          <span className="font-bold text-slate-700">
                            {c.count} ({c.pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#004C97] h-full rounded-full transition-all"
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: ANÁLISES DE IA DA AUDITORIA */}
        {/* ========================================================================= */}
        <TabsContent value="ia" className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-indigo-950">
                Assistente Analítico de Auditoria (Governança Transparente)
              </h3>
              <p className="text-xs text-indigo-800 mt-0.5">
                Os insights abaixo utilizam agregações determinísticas sobre o banco real do
                PocketBase. Não há tomada de decisão automática — toda sugestão requer homologação
                humana.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiInsights.map((ins) => (
              <Card key={ins.id} className="border-slate-200 shadow-2xs">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[9px] font-bold ${
                        ins.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : ins.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ins.type}
                    </Badge>
                    <span className="text-xs font-mono text-slate-400">{ins.id}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-600">
                    Status: {ins.status}
                  </Badge>
                </CardHeader>

                <CardContent className="p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">{ins.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{ins.description}</p>

                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] space-y-1">
                    <div>
                      <span className="font-semibold text-slate-700">Evidência:</span>{' '}
                      <span className="text-slate-600">{ins.evidence}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Métrica:</span>{' '}
                      <span className="text-[#004C97] font-bold">{ins.metric}</span>
                    </div>
                    {ins.suggestedAction && (
                      <div>
                        <span className="font-semibold text-slate-700">Ação Recomendada:</span>{' '}
                        <span className="text-emerald-700 font-medium">{ins.suggestedAction}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL AMPLO: DETALHES DA AUDITORIA & QUADRO ANTES × DEPOIS */}
      {/* ========================================================================= */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#004C97]" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Detalhes da Auditoria Transacional
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Registro completo de persistência, quadro comparativo Antes × Depois e metadados
              técnicos.
            </DialogDescription>
          </DialogHeader>

          {selectedLogForDetails && (
            <div className="space-y-4 pt-2 text-xs">
              {/* BLOCO 1: IDENTIFICAÇÃO BÁSICA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    ID do Evento
                  </span>
                  <span className="font-mono font-bold text-[#004C97]">
                    {selectedLogForDetails.event_id || selectedLogForDetails.id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Data / Hora
                  </span>
                  <span className="font-mono text-slate-700">
                    {new Date(selectedLogForDetails.created).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Usuário & Login
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedLogForDetails.user_name} ({selectedLogForDetails.login || 'admin'})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Perfil
                  </span>
                  <span className="font-mono text-slate-700">
                    {selectedLogForDetails.user_role || selectedLogForDetails.profile}
                  </span>
                </div>
              </div>

              {/* BLOCO 2: LOCAL DA ALTERAÇÃO */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                  Hierarquia de Localização
                </span>
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                  <span>PCP Robotizado</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span>{selectedLogForDetails.module || 'Programação'}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400" />
                  <span>{selectedLogForDetails.company || 'CIAFAL'}</span>
                  {selectedLogForDetails.line && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span>Linha {selectedLogForDetails.line}</span>
                    </>
                  )}
                  {selectedLogForDetails.center && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span>Centro {selectedLogForDetails.center}</span>
                    </>
                  )}
                  {selectedLogForDetails.record_id && (
                    <>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="font-mono text-[#004C97]">
                        Registro #{selectedLogForDetails.record_id}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* BLOCO 3: MOTIVO PADRONIZADO E JUSTIFICATIVA */}
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Governança da Alteração (Motivo & Justificativa)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-700">
                      Motivo Padronizado:
                    </span>
                    <p className="text-slate-800 font-semibold mt-0.5">
                      {selectedLogForDetails.reason || 'Não informado / Operação sem motivo'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-700">
                      Justificativa Complementar:
                    </span>
                    <p className="text-slate-800 mt-0.5">
                      {selectedLogForDetails.justification || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* BLOCO 4: QUADRO OBRIGATÓRIO ANTES × DEPOIS */}
              <div>
                <span className="text-xs font-bold text-slate-900 block mb-2">
                  Quadro Comparativo Antes × Depois
                </span>
                {!selectedLogForDetails.changes || selectedLogForDetails.changes.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded text-slate-500">
                    Nenhum campo estruturado modificado neste evento.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="p-2.5">Campo Modificado</th>
                          <th className="p-2.5">Valor Anterior (Antes)</th>
                          <th className="p-2.5">Novo Valor (Depois)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedLogForDetails.changes.map((ch, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-semibold text-slate-800">
                              {ch.fieldNamePt || ch.field}
                            </td>
                            <td className="p-2.5 text-rose-600 line-through bg-rose-50/30">
                              {String(ch.before ?? '—')}
                            </td>
                            <td className="p-2.5 text-emerald-700 font-bold bg-emerald-50/30">
                              {String(ch.after ?? '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* BLOCO 5: DETALHES TÉCNICOS E CORRELAÇÃO */}
              <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Metadados Técnicos de Persistência
                </span>
                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 text-slate-300">
                  <div>IP: {selectedLogForDetails.technical_details?.ip || '10.12.0.45'}</div>
                  <div>
                    Correlation ID:{' '}
                    {selectedLogForDetails.correlation_id ||
                      selectedLogForDetails.technical_details?.correlationId ||
                      '—'}
                  </div>
                  <div>Origem: {selectedLogForDetails.source}</div>
                  <div>Status Backend: {selectedLogForDetails.status}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
