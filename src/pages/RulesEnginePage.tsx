import React, { useState, useEffect, useMemo } from 'react'
import {
  Cpu,
  Layers,
  Clock,
  ThermometerSnowflake,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  X,
  ChevronRight,
  Database,
  Lock,
  Download,
  UploadCloud,
  FileCheck,
  Zap,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  pcpRulesService,
  SetupAcertoRecord,
  ScheduledStopRecord,
  CoolingTimeRecord,
  SequencingRuleRecord,
  PendingRevisionRecord,
  RuleAuditLogRecord,
} from '@/services/pcp-rules-service'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'
import { SetupDetailDrawer } from '@/components/rules-engine/SetupDetailDrawer'
import { NewRevisionModal } from '@/components/rules-engine/NewRevisionModal'
import { ImportPreviewModal } from '@/components/rules-engine/ImportPreviewModal'
import { CoolingCalculatorWidget } from '@/components/rules-engine/CoolingCalculatorWidget'
import { downloadOfficialTemplate } from '@/services/rules-template-export'

export const RulesEnginePage: React.FC = () => {
  const { can, user } = useAuth()
  const { toast } = useToast()

  // Permissões RBAC
  const canEdit = can('pcp.rules.edit') || can('pcp.rules.manage') || can('pcp.schedule.edit')
  const canApprove = can('pcp.rules.approve') || can('pcp.schedule.approve')

  // Filtros Globais
  const [selectedPlant, setSelectedPlant] = useState<string>('ALL')
  const [selectedLine, setSelectedLine] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeTab, setActiveTab] = useState<string>('setup-acerto')

  // Estados de Dados do Backend
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [setupList, setSetupList] = useState<SetupAcertoRecord[]>([])
  const [stopsList, setStopsList] = useState<ScheduledStopRecord[]>([])
  const [coolingList, setCoolingList] = useState<CoolingTimeRecord[]>([])
  const [sequencingList, setSequencingList] = useState<SequencingRuleRecord[]>([])
  const [pendingList, setPendingList] = useState<PendingRevisionRecord[]>([])
  const [auditList, setAuditList] = useState<RuleAuditLogRecord[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Drawer & Modais
  const [selectedSetupForDrawer, setSelectedSetupForDrawer] = useState<SetupAcertoRecord | null>(
    null,
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false)
  const [setupForRevision, setSetupForRevision] = useState<SetupAcertoRecord | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false)
  const [importTemplateType, setImportTemplateType] = useState<
    'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING'
  >('SETUP')

  // Carrega todos os dados do Backend PocketBase
  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [lineData, setups, stops, coolings, sequencings, pendings, audits] = await Promise.all([
        lineMasterService.listLines(),
        pcpRulesService.listSetupAcerto(),
        pcpRulesService.listScheduledStops(),
        pcpRulesService.listCoolingTimes(),
        pcpRulesService.listSequencingRules(),
        pcpRulesService.listPendingRevisions(),
        pcpRulesService.listRuleAuditLogs(),
      ])

      setLines(lineData)
      setSetupList(setups)
      setStopsList(stops)
      setCoolingList(coolings)
      setSequencingList(sequencings)
      setPendingList(pendings)
      setAuditList(audits)
    } catch (err) {
      console.error('Erro ao carregar dados do motor de regras:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao conectar ao Backend',
        description: 'Não foi possível buscar as parametrizações oficiais do PocketBase.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Abertura de Drawer ao selecionar linha
  const handleSelectSetupRow = (row: SetupAcertoRecord) => {
    setSelectedSetupForDrawer(row)
    setIsDrawerOpen(true)
  }

  // Abertura de Nova Revisão a partir de um registro ou do Drawer
  const handleOpenRevisionProposal = (row?: SetupAcertoRecord) => {
    const target = row || selectedSetupForDrawer || setupList[0]
    setSetupForRevision(target)
    setIsRevisionModalOpen(true)
  }

  // Submissão da proposta de revisão
  const handleSubmitRevision = async (data: {
    proposedMinutes: number
    changeReason: string
    justificationCategory?: string
    justificationDetail?: string
    aiClassification: string
    aiExplanation: string
    mesSnapshot: any
  }) => {
    if (!setupForRevision) return

    try {
      await pcpRulesService.createRevisionProposal({
        entityType: 'SETUP',
        entityId: setupForRevision.setup_code || setupForRevision.id,
        lineCode: setupForRevision.line_code,
        currentValue: `${setupForRevision.setup_time_minutes} min`,
        proposedValue: `${data.proposedMinutes} min`,
        changeReason: data.changeReason,
        justificationCategory: data.justificationCategory,
        justificationDetail: data.justificationDetail,
        aiClassification: data.aiClassification,
        aiExplanation: data.aiExplanation,
        mesSnapshot: data.mesSnapshot,
      })

      toast({
        title: 'Proposta de Revisão Criada',
        description: `Proposta enviada para a esteira de dupla aprovação (PCP + Linha ${setupForRevision.line_code}).`,
      })

      loadAllData()
    } catch (err) {
      console.error('Erro ao enviar proposta de revisão:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar proposta',
        description: 'Não foi possível registrar a proposta de revisão no banco de dados.',
      })
    }
  }

  // Aprovação em esteira
  const handleApproveRevision = async (
    record: PendingRevisionRecord,
    stage: 'PCP' | 'LINE_MANAGER',
  ) => {
    try {
      await pcpRulesService.approveRevision(record.id, stage, user?.name || 'Carlos Alberto (PCP)')

      toast({
        title: stage === 'PCP' ? 'Fase 1 (PCP) Aprovada' : 'Fase 2 (Linha) Homologada & Publicada',
        description: `Revisão do parâmetro ${record.parameter_name} atualizada com sucesso.`,
      })

      loadAllData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na aprovação',
        description: 'Falha ao homologar etapa da revisão.',
      })
    }
  }

  // Filtros aplicados na lista de Setup
  const filteredSetups = useMemo(() => {
    return setupList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.line_code.toLowerCase().includes(q) ||
          item.from_family_code.toLowerCase().includes(q) ||
          item.to_family_code.toLowerCase().includes(q) ||
          item.to_description_gauge.toLowerCase().includes(q) ||
          item.work_center.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [setupList, selectedLine, searchTerm])

  // Filtros aplicados nas Paradas Programadas
  const filteredStops = useMemo(() => {
    return stopsList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.line_code.toLowerCase().includes(q) ||
          item.stop_type.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [stopsList, selectedLine, searchTerm])

  // Filtros aplicados em Tempos de Resfriamento
  const filteredCoolings = useMemo(() => {
    return coolingList.filter((item) => {
      if (selectedLine !== 'ALL' && item.origin_line_code !== selectedLine) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.origin_line_code.toLowerCase().includes(q) ||
          item.dest_line_code.toLowerCase().includes(q) ||
          (item.material_code && item.material_code.toLowerCase().includes(q)) ||
          (item.family_code && item.family_code.toLowerCase().includes(q)) ||
          item.gauge_dimension.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [coolingList, selectedLine, searchTerm])

  // Filtros aplicados em Regras de Sequenciamento
  const filteredSequencings = useMemo(() => {
    return sequencingList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.from_family_code && item.from_family_code.toLowerCase().includes(q)) ||
          (item.to_family_code && item.to_family_code.toLowerCase().includes(q)) ||
          item.scope_level.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [sequencingList, searchTerm])

  // Filtros aplicados em Revisões Pendentes
  const filteredPendings = useMemo(() => {
    return pendingList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.entity_type.toLowerCase().includes(q) ||
          item.line_code.toLowerCase().includes(q) ||
          item.change_reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [pendingList, searchTerm])

  // Filtros aplicados em Histórico de Alterações
  const filteredAudits = useMemo(() => {
    return auditList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.parameter_name.toLowerCase().includes(q) ||
          item.user_name.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [auditList, searchTerm])

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen text-slate-900 relative">
      {/* 1. CABEÇALHO PADRÃO CIAFAL COM GOVERNANÇA E BOTÕES DE TEMPLATE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-sm">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Motor de Regras & Setup
              </h1>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-mono">
                PCP Robotizado &bull; Hub CIAFAL
              </Badge>
              {canEdit ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Perfil Gravador
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Somente Consulta
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fonte oficial governada de tempos DE&rarr;PARA, acertos, paradas de capacidade,
              resfriamento metalúrgico e penalidades CP-SAT.
            </p>
          </div>
        </div>

        {/* BOTÕES HORIZONTAIS DE TEMPLATES & WORKFLOW (REQUISITO 1 & 10) */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => downloadOfficialTemplate('SETUP')}
            className="text-xs border-slate-300 gap-1.5 h-8 bg-white hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Baixar Template</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setImportTemplateType(
                activeTab === 'paradas-programadas'
                  ? 'STOP'
                  : activeTab === 'resfriamento'
                    ? 'COOLING'
                    : activeTab === 'sequenciamento'
                      ? 'SEQUENCING'
                      : 'SETUP',
              )
              setIsImportModalOpen(true)
            }}
            className="text-xs border-blue-200 bg-blue-50/60 text-blue-800 hover:bg-blue-100 gap-1.5 h-8 font-semibold"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Importar Template</span>
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenRevisionProposal()}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs gap-1.5 h-8 font-bold shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Nova Proposta de Revisão</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            disabled={isLoading}
            className="text-xs border-slate-300 gap-1 h-8 bg-white hover:bg-slate-50 px-2"
            title="Atualizar dados do backend"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. CARDS COMPACTOS DE GOVERNANÇA INDUSTRIAL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          onClick={() => setActiveTab('setup-acerto')}
          className={`p-3 shadow-sm cursor-pointer transition-all ${
            activeTab === 'setup-acerto'
              ? 'border-[#004C97] bg-blue-50/30'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Setups Cadastrados</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{setupList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Matriz De/Para</div>
        </Card>

        <Card
          onClick={() => setActiveTab('paradas-programadas')}
          className={`p-3 shadow-sm cursor-pointer transition-all ${
            activeTab === 'paradas-programadas'
              ? 'border-[#004C97] bg-blue-50/30'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Paradas Programadas</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{stopsList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Preventivas/Limpeza</div>
        </Card>

        <Card
          onClick={() => setActiveTab('resfriamento')}
          className={`p-3 shadow-sm cursor-pointer transition-all ${
            activeTab === 'resfriamento'
              ? 'border-[#004C97] bg-blue-50/30'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" />
            <span>Resfriamentos</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {coolingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Regras de Cura</div>
        </Card>

        <Card
          onClick={() => setActiveTab('sequenciamento')}
          className={`p-3 shadow-sm cursor-pointer transition-all ${
            activeTab === 'sequenciamento'
              ? 'border-[#004C97] bg-blue-50/30'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sequenciamento</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {sequencingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Penalidades CP-SAT</div>
        </Card>

        <Card
          onClick={() => setActiveTab('revisoes-pendentes')}
          className={`p-3 shadow-sm cursor-pointer transition-all ${
            activeTab === 'revisoes-pendentes'
              ? 'border-[#004C97] bg-blue-50/30'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Revisões Pendentes</span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {pendingList.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Aprovação 2 Fases</div>
        </Card>

        <Card
          onClick={() => setActiveTab('historico-alteracoes')}
          className={`p-3 shadow-sm cursor-pointer transition-all ${
            activeTab === 'historico-alteracoes'
              ? 'border-[#004C97] bg-blue-50/30'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>Auditoria & Logs</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{auditList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Trilha de Versões</div>
        </Card>
      </div>

      {/* 3. BARRA DE FILTROS RÁPIDOS */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Filtrar por linha, bitola DE/PARA, motivo ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtrar Linha:</span>
          </div>
          <Select value={selectedLine} onValueChange={setSelectedLine}>
            <SelectTrigger className="h-8 w-48 text-xs bg-white border-slate-200 font-medium">
              <SelectValue placeholder="Todas as Linhas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Linhas</SelectItem>
              {lines.map((l) => (
                <SelectItem key={l.id} value={l.code}>
                  {l.code} - {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. ÁREA CENTRAL: 6 ABAS FUNCIONAIS COMPLETAS */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-slate-200 px-4 pt-3 bg-slate-50/50 rounded-t-xl overflow-x-auto">
            <TabsList className="h-9 bg-slate-200/60 p-0.5 gap-1">
              <TabsTrigger
                value="setup-acerto"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>1. Setup & Acerto</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {setupList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="paradas-programadas"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>2. Paradas Programadas</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {stopsList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="resfriamento"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <ThermometerSnowflake className="w-3.5 h-3.5" />
                <span>3. Tempo de Resfriamento</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {coolingList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="sequenciamento"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>4. Regras de Sequenciamento</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {sequencingList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="revisoes-pendentes"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>5. Revisões Pendentes</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {pendingList.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="historico-alteracoes"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-sm font-semibold gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>6. Histórico & Auditoria</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {auditList.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1 — SETUP & ACERTO (ALTA DENSIDADE, SAP STYLE, DE -> PARA)             */}
          {/* ========================================================================= */}
          <TabsContent value="setup-acerto" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Matriz de Setup & Acerto DE &rarr; PARA (Estilo SAP / Alta Densidade)
                  <Badge className="bg-slate-100 text-slate-700 font-mono text-[10px]">
                    Edição Direta Bloqueada &bull; Clique na linha para Evidências MES/IA
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Quando não existir regra DE específica, o motor aplica a regra genérica de entrada
                  PARA.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredSetups.length} registro(s) oficiais
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Centro</th>
                    <th className="p-2.5">Linha</th>
                    <th className="p-2.5">Centro de Trabalho</th>
                    <th className="p-2.5 bg-blue-50/50 text-blue-900">Família DE</th>
                    <th className="p-2.5 bg-blue-50/50 text-blue-900">Código DE</th>
                    <th className="p-2.5 bg-blue-50/50 text-blue-900">Descrição / Bitola DE</th>
                    <th className="p-2.5 bg-indigo-50/50 text-indigo-900">Família PARA</th>
                    <th className="p-2.5 bg-indigo-50/50 text-indigo-900">Código PARA</th>
                    <th className="p-2.5 bg-indigo-50/50 text-indigo-900">
                      Descrição / Bitola PARA
                    </th>
                    <th className="p-2.5 text-right font-mono font-bold">Tempo Setup</th>
                    <th className="p-2.5 text-right font-mono">Tempo Acerto</th>
                    <th className="p-2.5 text-center">Origem</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Vigência</th>
                    <th className="p-2.5">Última Revisão</th>
                    <th className="p-2.5">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredSetups.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectSetupRow(row)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors whitespace-nowrap group"
                    >
                      <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                      <td className="p-2.5 font-bold text-[#004C97]">{row.line_code}</td>
                      <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>

                      {/* COLUNAS DE */}
                      <td className="p-2.5 bg-blue-50/20 font-medium">
                        {row.is_generic ? (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-600 text-[10px]"
                          >
                            * (QUALQUER)
                          </Badge>
                        ) : (
                          row.from_family_code
                        )}
                      </td>
                      <td className="p-2.5 bg-blue-50/20 font-mono text-slate-600">
                        {row.from_code_prefix}
                      </td>
                      <td
                        className="p-2.5 bg-blue-50/20 text-slate-700 max-w-xs truncate"
                        title={row.from_description_gauge}
                      >
                        {row.from_description_gauge}
                      </td>

                      {/* COLUNAS PARA */}
                      <td className="p-2.5 bg-indigo-50/20 font-bold text-slate-800">
                        {row.to_family_code}
                      </td>
                      <td className="p-2.5 bg-indigo-50/20 font-mono font-bold text-indigo-900">
                        {row.to_code_prefix}
                      </td>
                      <td
                        className="p-2.5 bg-indigo-50/20 text-slate-800 font-medium max-w-xs truncate"
                        title={row.to_description_gauge}
                      >
                        {row.to_description_gauge}
                      </td>

                      {/* TEMPOS */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 group-hover:text-[#004C97]">
                        {row.setup_time_minutes} min
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {row.tuning_time_minutes} min
                      </td>

                      {/* ORIGEM & STATUS */}
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            row.origin === 'SAP'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.origin}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>

                      <td className="p-2.5 text-slate-500 text-[11px] font-mono">
                        {row.validity_start} &rarr; {row.validity_end}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                        {row.last_revision}
                      </td>
                      <td className="p-2.5 text-slate-600">{row.responsible_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2 — PARADAS PROGRAMADAS (COM HORAS E CAPACIDADE PERDIDA EM TONELADAS) */}
          {/* ========================================================================= */}
          <TabsContent value="paradas-programadas" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Paradas Programadas de Linha & Impacto na Capacidade
                </h3>
                <p className="text-xs text-slate-500">
                  Somente paradas <strong>PUBLICADAS</strong> consomem capacidade oficial no cálculo
                  de horas úteis e toneladas programáveis.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredStops.length} parada(s) programada(s)
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Centro</th>
                    <th className="p-2.5">Linha</th>
                    <th className="p-2.5">Centro de Trabalho</th>
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Motivo / Código</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5 text-right">Duração Padrão</th>
                    <th className="p-2.5 text-center">Hora Início</th>
                    <th className="p-2.5">Recorrência</th>
                    <th className="p-2.5">Turno</th>
                    <th className="p-2.5 text-right text-amber-800 bg-amber-50/50">
                      Horas Perdidas / Mês
                    </th>
                    <th className="p-2.5 text-right text-amber-800 bg-amber-50/50">
                      Capacidade Perdida (t)
                    </th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Vigência</th>
                    <th className="p-2.5">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredStops.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                      <td className="p-2.5 font-bold text-[#004C97]">{row.line_code}</td>
                      <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]"
                        >
                          {row.stop_type}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-mono font-medium text-slate-700">{row.reason}</td>
                      <td
                        className="p-2.5 text-slate-800 font-medium max-w-xs truncate"
                        title={row.description}
                      >
                        {row.description}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                        {row.duration_minutes} min
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {row.start_time}
                      </td>
                      <td className="p-2.5 text-slate-700">{row.recurrence}</td>
                      <td className="p-2.5 text-slate-600">{row.shift}</td>

                      {/* IMPACTO CALCULADO EM HORAS E TONELADAS (REQUISITO 5) */}
                      <td className="p-2.5 text-right font-mono font-bold text-amber-800 bg-amber-50/20">
                        {row.lost_hours_month || 0} h/mês
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-700 bg-amber-50/20">
                        {row.lost_capacity_tons || 0} t
                      </td>

                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{row.validity}</td>
                      <td className="p-2.5 text-slate-600">{row.responsible_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3 — TEMPO DE RESFRIAMENTO (COM FLUXO LINHA ORIGEM -> DESTINO)         */}
          {/* ========================================================================= */}
          <TabsContent value="resfriamento" className="m-0 p-4 space-y-4">
            {/* WIDGET DE CÁLCULO DE DEPENDÊNCIA TÉRMICA (REQUISITO 6) */}
            <CoolingCalculatorWidget />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tabela Oficial de Tempos de Resfriamento & Cura Metalúrgica
                </h3>
                <p className="text-xs text-slate-500">
                  Valores homologados: 18h, 23h, 24h e 36h dependendo da seção, espessura e
                  material.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredCoolings.length} regra(s) de resfriamento
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Centro</th>
                    <th className="p-2.5">Linha Origem</th>
                    <th className="p-2.5">Centro Trab. Origem</th>
                    <th className="p-2.5 text-[#004C97] font-bold">Linha Destino</th>
                    <th className="p-2.5 text-[#004C97]">Centro Trab. Destino</th>
                    <th className="p-2.5">Família</th>
                    <th className="p-2.5">Material / Bitola</th>
                    <th className="p-2.5 text-right text-cyan-900 bg-cyan-50/50">
                      Tempo Mínimo Resfriamento
                    </th>
                    <th className="p-2.5">Unidade</th>
                    <th className="p-2.5">Origem</th>
                    <th className="p-2.5">Vigência</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5 text-center">Revisão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredCoolings.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                      <td className="p-2.5 font-bold text-slate-800">{row.origin_line_code}</td>
                      <td className="p-2.5 font-mono text-slate-600">{row.origin_work_center}</td>
                      <td className="p-2.5 font-bold text-[#004C97] bg-blue-50/20">
                        {row.dest_line_code}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 bg-blue-50/20">
                        {row.dest_work_center}
                      </td>
                      <td className="p-2.5 font-medium">{row.family_code}</td>
                      <td className="p-2.5 text-slate-800 font-medium">
                        {row.gauge_dimension}{' '}
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({row.material_code})
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-cyan-800 bg-cyan-50/30">
                        {row.cooling_time_hours} h
                      </td>
                      <td className="p-2.5 text-slate-500 font-mono">{row.unit}</td>
                      <td className="p-2.5">
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                          {row.origin}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-500 text-[11px] font-mono">
                        {row.valid_from} &rarr; {row.valid_until}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-600">{row.responsible_name}</td>
                      <td className="p-2.5 text-center font-mono text-slate-500">
                        v{row.revision_number}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4 — REGRAS DE SEQUENCIAMENTO (PROIBITIVA, NÃO RECOMENDADA, ETC)       */}
          {/* ========================================================================= */}
          <TabsContent value="sequenciamento" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Regras de Sequenciamento & Penalidades no Score (0–100)
                </h3>
                <p className="text-xs text-slate-500">
                  Tipos: <strong>PROIBITIVA</strong> (hard constraint),{' '}
                  <strong>NÃO RECOMENDADA</strong> (soft constraint), <strong>PREFERENCIAL</strong>{' '}
                  (bonifica) e <strong>NEUTRA</strong>.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredSequencings.length} regra(s) registradas
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Linha</th>
                    <th className="p-2.5">Família DE</th>
                    <th className="p-2.5">Material DE</th>
                    <th className="p-2.5">Família PARA</th>
                    <th className="p-2.5">Material PARA</th>
                    <th className="p-2.5 text-center">Tipo da Regra</th>
                    <th className="p-2.5 text-right font-mono">Impacto no Score</th>
                    <th className="p-2.5">Motivo Técnico / Rationale</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Versão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredSequencings.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5 font-bold text-[#004C97]">
                        {row.line_code || 'GLOBAL'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {row.from_family_code || '*'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {row.from_material_code || '*'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-indigo-900">
                        {row.to_family_code || '*'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {row.to_material_code || '*'}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.rule_type === 'PROIBITIVA'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : row.rule_type === 'NAO_RECOMENDADA'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : row.rule_type === 'PREFERENCIAL'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.rule_type}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {row.penalty_score > 0 ? (
                          <span className="text-rose-700">-{row.penalty_score} pts</span>
                        ) : row.penalty_score < 0 ? (
                          <span className="text-emerald-700">
                            +{Math.abs(row.penalty_score)} pts
                          </span>
                        ) : (
                          <span className="text-slate-500">0 pts</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-800 max-w-sm truncate" title={row.reason}>
                        {row.reason}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500">{row.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 5 — REVISÕES PENDENTES (ESTEIRA DE DUPLA APROVAÇÃO PCP + LINHA)        */}
          {/* ========================================================================= */}
          <TabsContent value="revisoes-pendentes" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Esteira de Homologação Dupla (Fase 1: PCP &rarr; Fase 2: Gestor da Linha)
                </h3>
                <p className="text-xs text-slate-500">
                  Nenhum parâmetro é publicado diretamente. A aprovação exige parecer técnico e
                  histórico preservado.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredPendings.length} revisão(ões) na esteira
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Linha / Entidade</th>
                    <th className="p-2.5">Parâmetro / Código</th>
                    <th className="p-2.5 font-mono">Atual &rarr; Proposto</th>
                    <th className="p-2.5">Motivo & Justificativa Técnica</th>
                    <th className="p-2.5 text-center">Fase 1: PCP</th>
                    <th className="p-2.5 text-center">Fase 2: Gestor Linha</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPendings.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]"
                        >
                          {row.entity_type}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">{row.line_code}</td>
                      <td className="p-2.5 font-mono text-slate-700">{row.parameter_name}</td>
                      <td className="p-2.5 font-mono">
                        <span className="line-through text-slate-400">{row.current_value}</span>{' '}
                        &rarr; <strong className="text-[#004C97]">{row.proposed_value}</strong>
                      </td>
                      <td
                        className="p-2.5 text-slate-700 max-w-xs truncate"
                        title={row.change_reason}
                      >
                        {row.change_reason}
                      </td>

                      {/* FASE 1: PCP */}
                      <td className="p-2.5 text-center">
                        {row.pcp_approved_at ? (
                          <div className="text-[10px]">
                            <span className="font-bold text-emerald-700 block">
                              ✓ {row.pcp_approver_name || 'Aprovado'}
                            </span>
                            <span className="text-slate-400 font-mono">{row.pcp_approved_at}</span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-amber-50 text-amber-800 border-amber-200"
                          >
                            Aguardando PCP
                          </Badge>
                        )}
                      </td>

                      {/* FASE 2: GESTOR LINHA */}
                      <td className="p-2.5 text-center">
                        {row.line_manager_approved_at ? (
                          <div className="text-[10px]">
                            <span className="font-bold text-emerald-700 block">
                              ✓ {row.line_manager_name || 'Homologado'}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {row.line_manager_approved_at}
                            </span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-slate-50 text-slate-500 border-slate-200"
                          >
                            Pendente
                          </Badge>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>

                      {/* BOTÕES DE APROVAÇÃO */}
                      <td className="p-2.5 text-right">
                        {canApprove && !row.pcp_approved_at && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveRevision(row, 'PCP')}
                            className="h-7 text-xs bg-[#004C97] hover:bg-[#003d7a] text-white font-semibold"
                          >
                            Aprovar PCP (Fase 1)
                          </Button>
                        )}
                        {canApprove && row.pcp_approved_at && !row.line_manager_approved_at && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveRevision(row, 'LINE_MANAGER')}
                            className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                          >
                            Homologar Linha (Fase 2)
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 6 — HISTÓRICO & AUDITORIA (TRILHA COMPLETA COM RASTREABILIDADE)       */}
          {/* ========================================================================= */}
          <TabsContent value="historico-alteracoes" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Trilha de Auditoria & Preservação Histórica de Parâmetros
                </h3>
                <p className="text-xs text-slate-500">
                  Nunca apagamos versões anteriores: todas as alterações guardam solicitante,
                  data/hora, parecer IA, evidência MES e aprovador.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredAudits.length} log(s) registrado(s)
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Parâmetro / Regra</th>
                    <th className="p-2.5 font-mono">Valor Anterior</th>
                    <th className="p-2.5 font-mono">Novo Valor Publicado</th>
                    <th className="p-2.5">Usuário Solicitante</th>
                    <th className="p-2.5">Data / Hora</th>
                    <th className="p-2.5">Motivo / Justificativa</th>
                    <th className="p-2.5 text-center">Origem</th>
                    <th className="p-2.5 text-center">Validação MES</th>
                    <th className="p-2.5">Recomendação IA</th>
                    <th className="p-2.5">Aprovador</th>
                    <th className="p-2.5">Data Publicação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredAudits.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5 font-bold text-slate-900">{row.parameter_name}</td>
                      <td className="p-2.5 font-mono text-slate-500 line-through">
                        {row.previous_value || '-'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#004C97]">
                        {row.new_value || '-'}
                      </td>
                      <td className="p-2.5 text-slate-700">{row.user_name}</td>
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                        {row.change_date}
                      </td>
                      <td className="p-2.5 text-slate-800 max-w-xs truncate" title={row.reason}>
                        {row.reason}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                          {row.origin}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.mes_validation_status === 'VALIDADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.mes_validation_status}
                        </Badge>
                      </td>
                      <td
                        className="p-2.5 text-slate-700 italic max-w-xs truncate"
                        title={row.ai_recommendation}
                      >
                        {row.ai_recommendation || '-'}
                      </td>
                      <td className="p-2.5 text-slate-600">{row.approver_name || '-'}</td>
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                        {row.published_at || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* DRAWER LATERAL DE DETALHE DE SETUP & EVIDÊNCIA MES/IA */}
      <SetupDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        record={selectedSetupForDrawer}
        onRequestRevision={(rec) => {
          setIsDrawerOpen(false)
          handleOpenRevisionProposal(rec)
        }}
      />

      {/* MODAL DE NOVA PROPOSTA DE REVISÃO */}
      <NewRevisionModal
        isOpen={isRevisionModalOpen}
        onClose={() => setIsRevisionModalOpen(false)}
        record={setupForRevision}
        onSubmitProposal={handleSubmitRevision}
      />

      {/* MODAL DE PRÉVIA DA IMPORTAÇÃO */}
      <ImportPreviewModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        templateType={importTemplateType}
        onConfirmSendToWorkflow={(items) => {
          toast({
            title: 'Lote Enviado para Validação',
            description: `${items.length} registro(s) encaminhados para validação MES e esteira de revisão.`,
          })
          loadAllData()
        }}
      />
    </div>
  )
}
export default RulesEnginePage
