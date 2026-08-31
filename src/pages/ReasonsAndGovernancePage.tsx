import React, { useEffect, useState, useMemo } from 'react'
import {
  HelpCircle,
  Sparkles,
  History,
  BarChart3,
  TrendingUp,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  Layers,
  ArrowRight,
  Shield,
  ShieldAlert,
  Building,
  RefreshCw,
  Check,
  X,
  Sliders,
  Maximize2,
  Clock,
  Briefcase,
  Boxes,
  Factory,
  Wrench,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { pcpReasonsService } from '@/services/pcp-reasons-service'
import {
  PCPReasonFamily,
  PCPChangeReason,
  PCPChangeJustification,
  PCPReasonCluster,
  CauseAnalysisMetrics,
} from '@/types/pcp-reasons'
import { useAuth } from '@/contexts/AuthContext'

export default function ReasonsAndGovernancePage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<string>('motivos-padrao')
  const [loading, setLoading] = useState<boolean>(true)

  // Dados das 4 abas
  const [families, setFamilies] = useState<PCPReasonFamily[]>([])
  const [reasons, setReasons] = useState<PCPChangeReason[]>([])
  const [clusters, setClusters] = useState<PCPReasonCluster[]>([])
  const [justifications, setJustifications] = useState<PCPChangeJustification[]>([])
  const [metrics, setMetrics] = useState<CauseAnalysisMetrics | null>(null)

  // Filtros Aba 1 (Motivos Padrão)
  const [reasonSearch, setReasonSearch] = useState<string>('')
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<string>('ALL')
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL')

  // Filtros Aba 3 (Histórico de Justificativas)
  const [historySearch, setHistorySearch] = useState<string>('')
  const [historyLineFilter, setHistoryLineFilter] = useState<string>('ALL')
  const [historyFamilyFilter, setHistoryFamilyFilter] = useState<string>('ALL')
  const [historyEvidenceFilter, setHistoryEvidenceFilter] = useState<string>('ALL')

  // Modais de Criação/Edição de Motivo
  const [isReasonModalOpen, setIsReasonModalOpen] = useState<boolean>(false)
  const [editingReason, setEditingReason] = useState<Partial<PCPChangeReason> | null>(null)

  // Modais de Criação de Família
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState<boolean>(false)
  const [editingFamily, setEditingFamily] = useState<Partial<PCPReasonFamily> | null>(null)

  // Modal Detalhes do Cluster IA
  const [selectedCluster, setSelectedCluster] = useState<PCPReasonCluster | null>(null)
  const [isClusterModalOpen, setIsClusterModalOpen] = useState<boolean>(false)

  // RBAC
  const userRole = (user?.role as string) || 'PCP_PROGRAMMER'
  const isAdmin = userRole === 'PCP_ADMIN' || userRole === 'ADMIN'
  const isGestor = userRole === 'PCP_GESTOR' || isAdmin

  const loadData = async () => {
    setLoading(true)
    try {
      const [fams, reas, clusts, justs, mets] = await Promise.all([
        pcpReasonsService.listFamilies(),
        pcpReasonsService.listReasons(false),
        pcpReasonsService.listClusters(),
        pcpReasonsService.listJustifications(),
        pcpReasonsService.computeCauseAnalysisMetrics(),
      ])
      setFamilies(fams)
      setReasons(reas)
      setClusters(clusts)
      setJustifications(justs)
      setMetrics(mets)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar governança de motivos',
        description: err.message || 'Falha de comunicação.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem Aba 1
  const filteredReasons = useMemo(() => {
    return reasons.filter((r) => {
      const matchesSearch =
        !reasonSearch.trim() ||
        r.code.toLowerCase().includes(reasonSearch.toLowerCase()) ||
        r.name.toLowerCase().includes(reasonSearch.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(reasonSearch.toLowerCase()))

      const matchesFamily = selectedFamilyFilter === 'ALL' || r.family_code === selectedFamilyFilter
      const matchesSeverity =
        selectedSeverityFilter === 'ALL' || r.severity === selectedSeverityFilter

      return matchesSearch && matchesFamily && matchesSeverity
    })
  }, [reasons, reasonSearch, selectedFamilyFilter, selectedSeverityFilter])

  // Filtragem Aba 3
  const filteredJustifications = useMemo(() => {
    return justifications.filter((j) => {
      const matchesSearch =
        !historySearch.trim() ||
        j.justification.toLowerCase().includes(historySearch.toLowerCase()) ||
        j.specific_cause.toLowerCase().includes(historySearch.toLowerCase()) ||
        j.reason_name.toLowerCase().includes(historySearch.toLowerCase()) ||
        j.created_by_name.toLowerCase().includes(historySearch.toLowerCase())

      const matchesLine = historyLineFilter === 'ALL' || j.line_code === historyLineFilter
      const matchesFamily = historyFamilyFilter === 'ALL' || j.family_code === historyFamilyFilter
      const matchesEvidence =
        historyEvidenceFilter === 'ALL' || j.evidence_status === historyEvidenceFilter

      return matchesSearch && matchesLine && matchesFamily && matchesEvidence
    })
  }, [justifications, historySearch, historyLineFilter, historyFamilyFilter, historyEvidenceFilter])

  // Handlers para Motivos
  const handleSaveReason = async () => {
    if (
      !editingReason ||
      !editingReason.code ||
      !editingReason.name ||
      !editingReason.family_code
    ) {
      toast({
        variant: 'destructive',
        title: 'Campos Obrigatórios',
        description: 'Informe Código, Nome e Família do Motivo.',
      })
      return
    }

    try {
      const targetFamily = families.find((f) => f.code === editingReason.family_code)
      await pcpReasonsService.saveReason({
        ...editingReason,
        family_name: targetFamily?.name || editingReason.family_name || 'Geral',
        family_id: targetFamily?.id,
        severity: editingReason.severity || 'MEDIA',
        active: editingReason.active !== false,
      })

      toast({
        title: 'Motivo Gravado com Sucesso',
        description: `Código ${editingReason.code} integrado à taxonomia oficial CIAFAL.`,
      })
      setIsReasonModalOpen(false)
      setEditingReason(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Motivo',
        description: err.message,
      })
    }
  }

  const handleToggleReasonStatus = async (reason: PCPChangeReason) => {
    try {
      await pcpReasonsService.toggleReasonActive(reason.id, !reason.active)
      toast({
        title: `Motivo ${reason.code} ${!reason.active ? 'Ativado' : 'Inativado'}`,
        description: 'Status atualizado na governança.',
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: err.message,
      })
    }
  }

  // Handlers para Clusters IA
  const handleApproveCluster = async (cluster: PCPReasonCluster) => {
    try {
      await pcpReasonsService.approveClusterAsNewReason(cluster.id)
      toast({
        title: 'Novo Motivo Aprovado com Sucesso',
        description: `Sugestão "${cluster.proposed_name}" integrada ao catálogo oficial.`,
      })
      setIsClusterModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar cluster',
        description: err.message,
      })
    }
  }

  const handleRejectCluster = async (cluster: PCPReasonCluster) => {
    try {
      await pcpReasonsService.rejectCluster(cluster.id)
      toast({
        title: 'Sugestão Descartada',
        description: 'Cluster descartado pela gestão.',
      })
      setIsClusterModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao descartar',
        description: err.message,
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Motivos & Justificativas
                </h1>
                <Badge className="bg-[#004C97] text-white text-[10px] uppercase font-bold tracking-wider">
                  Governança & IA
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Taxonomia padronizada de causas de reprogramação, correlação com módulos industriais
                e IA auditável.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Dados
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={() => {
                setEditingReason({
                  code: '',
                  name: '',
                  family_code: 'MP',
                  severity: 'MEDIA',
                  source_type: 'SAP MM / WMS',
                  allows_date_change: true,
                  allows_sequence_change: true,
                  allows_quantity_change: true,
                  require_comment: true,
                  require_evidence: false,
                  notify_mes: true,
                  active: true,
                })
                setIsReasonModalOpen(true)
              }}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003B75] text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Motivo Padrão
            </Button>
          )}
        </div>
      </div>

      {/* ABAS DO MÓDULO */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger
            value="motivos-padrao"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            1. Motivos Padrão ({reasons.length})
          </TabsTrigger>
          <TabsTrigger
            value="sugestoes-ia"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            2. Sugestões da IA ({clusters.filter((c) => c.status === 'PROPOSED').length})
          </TabsTrigger>
          <TabsTrigger
            value="historico-justificativas"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            3. Histórico de Justificativas ({justifications.length})
          </TabsTrigger>
          <TabsTrigger
            value="analise-causas"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            4. Análise de Causas & IEP
          </TabsTrigger>
          <TabsTrigger
            value="risco-preditivo"
            className="text-xs font-semibold opacity-75 data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs"
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            5. Risco de Reprogramação (Fase Preditiva)
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: MOTIVOS PADRÃO (CADASTRO, MANUTENÇÃO E GOVERNANÇA) */}
        {/* ========================================================================= */}
        <TabsContent value="motivos-padrao" className="space-y-4">
          {/* BARRA DE FILTROS */}
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-3 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Pesquisar por código, nome ou descrição..."
                  value={reasonSearch}
                  onChange={(e) => setReasonSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50/50 border-slate-300"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={selectedFamilyFilter}
                  onChange={(e) => setSelectedFamilyFilter(e.target.value)}
                  className="h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#004C97]"
                >
                  <option value="ALL">Todas as Famílias ({families.length})</option>
                  {families.map((f) => (
                    <option key={f.code} value={f.code}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSeverityFilter}
                  onChange={(e) => setSelectedSeverityFilter(e.target.value)}
                  className="h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#004C97]"
                >
                  <option value="ALL">Todas as Severidades</option>
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* TABELA DE MOTIVOS */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Catálogo Homologado de Motivos ({filteredReasons.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Taxonomia estruturada de 3 níveis para rastreabilidade do PCP Robotizado.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Código</th>
                      <th className="p-3">Família</th>
                      <th className="p-3">Nome do Motivo</th>
                      <th className="p-3">Severidade</th>
                      <th className="p-3">Origem Sistêmica</th>
                      <th className="p-3">Impactos Permitidos</th>
                      <th className="p-3">Notificações</th>
                      <th className="p-3">Status</th>
                      {isAdmin && <th className="p-3 text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReasons.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          Nenhum motivo encontrado para os critérios de busca.
                        </td>
                      </tr>
                    ) : (
                      filteredReasons.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#004C97]">{r.code}</td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] font-medium bg-slate-50 border-slate-200"
                            >
                              {r.family_name || r.family_code}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{r.name}</div>
                            {r.description && (
                              <div className="text-[11px] text-slate-500 line-clamp-1">
                                {r.description}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] font-bold ${
                                r.severity === 'CRITICA'
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : r.severity === 'ALTA'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : r.severity === 'MEDIA'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {r.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600 font-mono text-[11px]">
                            {r.source_type}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              {r.allows_date_change && (
                                <span title="Data" className="px-1 bg-slate-100 rounded text-[9px]">
                                  Data
                                </span>
                              )}
                              {r.allows_sequence_change && (
                                <span
                                  title="Sequência"
                                  className="px-1 bg-slate-100 rounded text-[9px]"
                                >
                                  Seq
                                </span>
                              )}
                              {r.allows_quantity_change && (
                                <span
                                  title="Quantidade"
                                  className="px-1 bg-slate-100 rounded text-[9px]"
                                >
                                  Qtd
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500">
                              {r.notify_mes && (
                                <span className="font-bold text-[#004C97]">MES</span>
                              )}
                              {r.notify_crm && (
                                <span className="font-bold text-indigo-600">CRM</span>
                              )}
                              {r.notify_pcm && <span className="font-bold text-rose-600">PCM</span>}
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] ${
                                r.active
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {r.active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </td>
                          {isAdmin && (
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingReason(r)
                                    setIsReasonModalOpen(true)
                                  }}
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleReasonStatus(r)}
                                  className={`h-7 px-2 text-[10px] font-bold ${
                                    r.active
                                      ? 'text-rose-600 hover:bg-rose-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  {r.active ? 'Inativar' : 'Ativar'}
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: SUGESTÕES DA IA (AGRUPAMENTO SEMÂNTICO E NOVOS MOTIVOS) */}
        {/* ========================================================================= */}
        <TabsContent value="sugestoes-ia" className="space-y-4">
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-indigo-950">
                Padrões Recorrentes Identificados pelo Motor IA
              </h3>
              <p className="text-xs text-indigo-900/80 leading-relaxed mt-0.5">
                A IA analisa continuamente o histórico de justificativas livres e identifica novos
                grupos de causas para inclusão no catálogo oficial.{' '}
                <strong className="font-semibold">
                  Nenhum motivo é inserido automaticamente sem aprovação humana expressa.
                </strong>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clusters.map((c) => (
              <Card
                key={c.id}
                className="border-slate-200 shadow-2xs hover:border-indigo-300 transition-all"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px] font-bold font-mono">
                      {c.proposed_code || 'PROPOSTA IA'}
                    </Badge>
                    <Badge
                      className={`text-[10px] ${
                        c.status === 'PROPOSED'
                          ? 'bg-amber-100 text-amber-800'
                          : c.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {c.status === 'PROPOSED' ? 'Pendente de Revisão' : c.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                    {c.proposed_name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Família Sugerida:{' '}
                    <strong className="text-slate-700">{c.proposed_family_name}</strong>
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3 text-xs">
                  {/* METRICAS DO CLUSTER */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Ocorrências
                      </span>
                      <span className="font-bold text-slate-800">{c.occurrence_count}x</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Impacto
                      </span>
                      <span className="font-bold text-rose-700">{c.impact_hours} h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Similaridade
                      </span>
                      <span className="font-bold text-emerald-700">{c.similarity_score}%</span>
                    </div>
                  </div>

                  {/* TERMOS RECORRENTES */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Termos Recorrentes Identificados:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {c.recurring_terms.map((t, idx) => (
                        <span
                          key={idx}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* AÇÕES DE GOVERNANÇA */}
                  {c.status === 'PROPOSED' && isAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectCluster(c)}
                        className="h-7 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Descartar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproveCluster(c)}
                        className="h-7 text-xs bg-[#004C97] hover:bg-[#003B75] text-white font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Aprovar Novo Motivo
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: HISTÓRICO DE JUSTIFICATIVAS (CONSULTA AUDITADA) */}
        {/* ========================================================================= */}
        <TabsContent value="historico-justificativas" className="space-y-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardContent className="p-3 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Pesquisar por motivo, justificativa ou usuário..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50/50 border-slate-300"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <select
                  value={historyLineFilter}
                  onChange={(e) => setHistoryLineFilter(e.target.value)}
                  className="h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 font-medium text-slate-700"
                >
                  <option value="ALL">Todas as Linhas</option>
                  <option value="L1">Linha 1</option>
                  <option value="L2">Linha 2</option>
                </select>

                <select
                  value={historyEvidenceFilter}
                  onChange={(e) => setHistoryEvidenceFilter(e.target.value)}
                  className="h-8 text-xs bg-white border border-slate-300 rounded-md px-2.5 font-medium text-slate-700"
                >
                  <option value="ALL">Todas as Evidências</option>
                  <option value="SYSTEM_CONFIRMED">Confirmado por Sistema</option>
                  <option value="HUMAN_ONLY">Exclusivamente Humana</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Registros Consolidados de Justificativas ({filteredJustifications.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Linha / Versão</th>
                      <th className="p-3">Família & Motivo</th>
                      <th className="p-3">Causa Específica (Nível 3)</th>
                      <th className="p-3">Justificativa Detalhada</th>
                      <th className="p-3">Status Evidência</th>
                      <th className="p-3">Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJustifications.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Ainda não há histórico suficiente para esta análise.
                        </td>
                      </tr>
                    ) : (
                      filteredJustifications.map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            {new Date(j.created || '').toLocaleString('pt-BR')}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800">
                            Linha {j.line_code} &bull; {j.version_from} &rarr; {j.version_to}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-[#004C97] block">
                              {j.reason_code} — {j.reason_name}
                            </span>
                            <span className="text-[10px] text-slate-500">{j.family_name}</span>
                          </td>
                          <td className="p-3 text-slate-700 font-medium max-w-xs">
                            {j.specific_cause}
                          </td>
                          <td className="p-3 text-slate-600 text-[11px] max-w-sm line-clamp-2">
                            {j.justification}
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`text-[10px] font-semibold ${
                                j.evidence_status === 'SYSTEM_CONFIRMED'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {j.evidence_status === 'SYSTEM_CONFIRMED'
                                ? 'Sistêmica'
                                : '⚠ Apenas Humana'}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-700 font-medium">{j.created_by_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: ANÁLISE DE CAUSAS & PARETO REAL (DASHBOARD REAL) */}
        {/* ========================================================================= */}
        <TabsContent value="analise-causas" className="space-y-5">
          {metrics ? (
            <>
              {/* CARDS SUPERIORES DE INDICADORES */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card className="border-slate-200 p-3 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Total Alterações
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {metrics.totalAlterations}
                  </span>
                </Card>
                <Card className="border-slate-200 p-3 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Índice Estabilidade (IEP)
                  </span>
                  <span className="text-xl font-black text-emerald-700">
                    {metrics.stabilityIndex}%
                  </span>
                  <span className="text-[9px] font-bold text-emerald-800 block">
                    {metrics.stabilityLabel}
                  </span>
                </Card>
                <Card className="border-slate-200 p-3 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Horas Afetadas
                  </span>
                  <span className="text-xl font-black text-rose-700">
                    {metrics.totalHoursImpacted} h
                  </span>
                </Card>
                <Card className="border-slate-200 p-3 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Toneladas Impactadas
                  </span>
                  <span className="text-xl font-black text-blue-700">
                    {metrics.totalTonsImpacted} t
                  </span>
                </Card>
                <Card className="border-slate-200 p-3 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Taxa Aceitação IA
                  </span>
                  <span className="text-xl font-black text-indigo-700">
                    {metrics.pctAiAccepted}%
                  </span>
                </Card>
                <Card className="border-slate-200 p-3 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Sem Evidência Sistêmica
                  </span>
                  <span className="text-xl font-black text-amber-700">
                    {metrics.alterationsHumanOnly}
                  </span>
                </Card>
              </div>

              {/* PARETO POR FAMÍLIA & MOTIVO (SEÇÃO 17) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-slate-200 shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                      <span>Pareto por Família de Causa</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Impacto vs Frequência
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    {metrics.paretoByFamily.map((f) => (
                      <div key={f.code} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{f.name}</span>
                          <span className="font-mono text-slate-600">
                            <strong>{f.impactHours} h</strong> ({f.count} ocor.)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#004C97] h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (f.impactHours / (metrics.totalHoursImpacted || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-2xs">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                      <span>Top Motivos Padrão com Maior Impacto</span>
                      <span className="text-[10px] text-slate-400 font-normal">Horas Perdidas</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-2">
                    {metrics.paretoByReason.slice(0, 5).map((r) => (
                      <div key={r.code} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {r.code} — {r.name}
                          </span>
                          <span className="font-mono text-rose-700 font-bold">
                            {r.impactHours} h
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-600 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (r.impactHours / (metrics.totalHoursImpacted || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
              Os indicadores serão disponibilizados após o início do registro das alterações.
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 5: RISCO DE REPROGRAMAÇÃO (PREPARAÇÃO ARQUITETURAL PARA FASE PREDITIVA) */}
        {/* ========================================================================= */}
        <TabsContent value="risco-preditivo" className="space-y-4">
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#004C97]" />
                <CardTitle className="text-base font-bold text-slate-900">
                  Modelo Arquitetural: Predição de Risco de Reprogramação
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500">
                Estrutura de dados preparada para inferência de probabilidade de alteração futura
                (sem bloqueio ativo nesta entrega).
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 pt-0 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <span className="font-bold text-slate-900 block text-sm">
                  Simulação do Vetor de Fatores de Risco
                </span>
                <p className="text-slate-600 leading-relaxed">
                  Quando ativado na próxima fase, o modelo correlacionará:
                </p>
                <ul className="list-disc list-inside space-y-1 font-mono text-slate-800 text-[11px] pl-1">
                  <li>MP Crítica no Pátio (+31% no score de risco)</li>
                  <li>Setup com troca de cilindro complexa (+18%)</li>
                  <li>Histórico de reincidência da sequência operacional (+14%)</li>
                  <li>Mudança comercial recente no pedido via CRM (+11%)</li>
                </ul>
              </div>

              <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 text-blue-900 text-xs flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  <strong>Governança Ativa:</strong> As previsões servirão como alertas consultivos
                  e nunca bloquearão a autonomia do programador PCP.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE MOTIVO */}
      {isReasonModalOpen && editingReason && (
        <Dialog open={isReasonModalOpen} onOpenChange={setIsReasonModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                {editingReason.id ? 'Editar Motivo Padrão' : 'Cadastrar Novo Motivo Padrão'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Código do Motivo *</Label>
                  <Input
                    placeholder="Ex: MP-008"
                    value={editingReason.code || ''}
                    onChange={(e) =>
                      setEditingReason({ ...editingReason, code: e.target.value.toUpperCase() })
                    }
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Família *</Label>
                  <select
                    value={editingReason.family_code || 'MP'}
                    onChange={(e) =>
                      setEditingReason({ ...editingReason, family_code: e.target.value })
                    }
                    className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2"
                  >
                    {families.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome do Motivo *</Label>
                <Input
                  placeholder="Nome conciso do motivo"
                  value={editingReason.name || ''}
                  onChange={(e) => setEditingReason({ ...editingReason, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição Operacional</Label>
                <Textarea
                  placeholder="Explicação detalhada do motivo e critérios de uso..."
                  value={editingReason.description || ''}
                  onChange={(e) =>
                    setEditingReason({ ...editingReason, description: e.target.value })
                  }
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Severidade Padrão</Label>
                  <select
                    value={editingReason.severity || 'MEDIA'}
                    onChange={(e) =>
                      setEditingReason({ ...editingReason, severity: e.target.value as any })
                    }
                    className="w-full h-8 text-xs bg-white border border-slate-300 rounded px-2"
                  >
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Origem Provável</Label>
                  <Input
                    placeholder="Ex: SAP MM / WMS"
                    value={editingReason.source_type || ''}
                    onChange={(e) =>
                      setEditingReason({ ...editingReason, source_type: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsReasonModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveReason}
                className="bg-[#004C97] hover:bg-[#003B75] text-white"
              >
                Salvar Motivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
