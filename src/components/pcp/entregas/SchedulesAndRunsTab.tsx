import React, { useState, useEffect, useMemo } from 'react'
import {
  lineSummaryAutomationService,
  type LineSummaryConfig,
  type SummaryScheduleRun,
  type RealProductionLine,
  type SummaryPeriodicity,
  PERIODICITY_LABELS,
} from '@/services/pcp-line-summary-automation-service'
import type { MonthlySummaryTemplate } from '@/services/pcp-monthly-summaries'
import { ConfigureRecipientsModal } from './ConfigureRecipientsModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Calendar,
  Clock,
  Play,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Mail,
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Eye,
  Plus,
  Sparkles,
  Edit,
  ShieldAlert,
  CalendarCheck,
  Building,
  Layers,
  Send,
} from 'lucide-react'

interface SchedulesAndRunsTabProps {
  templates: MonthlySummaryTemplate[]
  canManage: boolean
  onOpenGenerateModal?: () => void
  onOpenSummaryDetail?: (summaryId: string) => void
  onEditConfig?: (config: LineSummaryConfig) => void
}

export const SchedulesAndRunsTab: React.FC<SchedulesAndRunsTabProps> = ({
  templates,
  canManage,
  onOpenGenerateModal,
  onOpenSummaryDetail,
}) => {
  const [configs, setConfigs] = useState<LineSummaryConfig[]>([])
  const [runs, setRuns] = useState<SummaryScheduleRun[]>([])
  const [realLines, setRealLines] = useState<RealProductionLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const { toast } = useToast()

  // Filtros
  const [searchFilter, setSearchFilter] = useState('')
  const [lineFilter, setLineFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>(() => {
    const now = new Date()
    const m = now.getMonth() + 1
    return `${now.getFullYear()}-${m < 10 ? '0' + m : m}`
  })

  // Ações em andamento (tracking por configId ou runId)
  const [processingConfigId, setProcessingConfigId] = useState<string | null>(null)
  const [reprocessingRunId, setReprocessingRunId] = useState<string | null>(null)

  // Popup de Destinatários
  const [recipientModalOpen, setRecipientModalOpen] = useState(false)
  const [recipientTargetLine, setRecipientTargetLine] = useState('L1')
  const [recipientTargetConfigId, setRecipientTargetConfigId] = useState<string | undefined>()

  // Modal de Histórico de Execuções
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [historyTargetConfig, setHistoryTargetConfig] = useState<LineSummaryConfig | null>(null)

  // Modal de Visualização da Configuração
  const [viewConfigModalOpen, setViewConfigModalOpen] = useState(false)
  const [viewingConfig, setViewingConfig] = useState<LineSummaryConfig | null>(null)

  // Modal Unificado de Criação & Edição de Agendamento (Centralizado)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  // Estado do formulário de Agendamento
  const [selectedConfigId, setSelectedConfigId] = useState<string>('')
  const [schedPeriodicidade, setSchedPeriodicidade] = useState<SummaryPeriodicity>('mensal')
  const [schedHorario, setSchedHorario] = useState('08:00')
  const [schedDiaMes, setSchedDiaMes] = useState(1)
  const [schedIntervaloDias, setSchedIntervaloDias] = useState(30)
  const [schedDataInicio, setSchedDataInicio] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [schedDataFim, setSchedDataFim] = useState('')
  const [schedGeracaoAuto, setSchedGeracaoAuto] = useState(true)
  const [schedExigirAprovacao, setSchedExigirAprovacao] = useState(true)
  const [schedEnvioAuto, setSchedEnvioAuto] = useState(false)
  const [schedStatus, setSchedStatus] = useState<'ATIVO' | 'INATIVO' | 'SUSPENSO'>('ATIVO')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const [cfgs, rns, lines] = await Promise.all([
        lineSummaryAutomationService.listLineConfigs(),
        lineSummaryAutomationService.listRuns('', 100),
        lineSummaryAutomationService.getRealProductionLines(),
      ])
      setConfigs(cfgs)
      setRuns(rns)
      setRealLines(lines)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar agendamentos e execuções')
    } finally {
      setIsLoading(false)
    }
  }

  // Configuração selecionada no formulário de agendamento (para herança do template em modo somente leitura)
  const currentSelectedConfig = useMemo(() => {
    return configs.find((c) => c.id === selectedConfigId) || null
  }, [configs, selectedConfigId])

  // Template resolvido / herdado pela configuração por linha selecionada (Leitura)
  const currentInheritedTemplate = useMemo(() => {
    if (!currentSelectedConfig) return null
    return lineSummaryAutomationService.resolveTemplateForLine(
      currentSelectedConfig,
      templates as any,
    )
  }, [currentSelectedConfig, templates])

  // Próxima execução estimada com base nos valores informados
  const calculatedNextExecutionPreview = useMemo(() => {
    try {
      return lineSummaryAutomationService.calculateNextExecution(schedPeriodicidade, {
        horario: schedHorario,
        dia_do_mes: schedDiaMes,
        intervalo_dias: schedIntervaloDias,
        data_inicio: schedDataInicio,
        data_fim: schedDataFim,
      })
    } catch (_) {
      return ''
    }
  }, [
    schedPeriodicidade,
    schedHorario,
    schedDiaMes,
    schedIntervaloDias,
    schedDataInicio,
    schedDataFim,
  ])

  // Cards de Indicadores
  const totalConfigsAtivas = configs.filter((c) => c.status === 'ATIVO').length
  const totalProgramados = configs.filter(
    (c) => c.status === 'ATIVO' && c.geracao_automatica,
  ).length
  const totalRunsSucesso = runs.filter((r) => r.status === 'SUCESSO').length
  const totalAguardandoAprovacao = configs.filter(
    (c) => c.exigir_aprovacao && c.status === 'ATIVO',
  ).length
  const totalRunsFalha = runs.filter((r) => r.status === 'FALHA').length
  const totalEnviados = runs.filter((r) => r.status === 'SUCESSO' && !r.erro).length

  // Ação: Abrir modal para NOVO Agendamento vinculado a uma linha existente
  const handleOpenNewScheduleModal = () => {
    const firstActive = configs.find((c) => c.status === 'ATIVO') || configs[0]
    setEditingConfigId(null)
    setSelectedConfigId(firstActive ? firstActive.id : '')
    setSchedPeriodicidade('mensal')
    setSchedHorario('08:00')
    setSchedDiaMes(1)
    setSchedIntervaloDias(30)
    setSchedDataInicio(new Date().toISOString().slice(0, 10))
    setSchedDataFim('')
    setSchedGeracaoAuto(true)
    setSchedExigirAprovacao(true)
    setSchedEnvioAuto(false)
    setSchedStatus('ATIVO')
    setIsScheduleModalOpen(true)
  }

  // Ação: Abrir modal para EDITAR Agendamento existente
  const handleOpenEditScheduleModal = (cfg: LineSummaryConfig) => {
    setEditingConfigId(cfg.id)
    setSelectedConfigId(cfg.id)
    setSchedPeriodicidade(cfg.periodicidade || 'mensal')
    setSchedHorario(cfg.parametros_personalizados?.horario || '08:00')
    setSchedDiaMes(cfg.parametros_personalizados?.dia_do_mes || 1)
    setSchedIntervaloDias(cfg.parametros_personalizados?.intervalo_dias || 30)
    setSchedDataInicio(
      cfg.parametros_personalizados?.data_inicio || new Date().toISOString().slice(0, 10),
    )
    setSchedDataFim(cfg.parametros_personalizados?.data_fim || '')
    setSchedGeracaoAuto(cfg.geracao_automatica ?? true)
    setSchedExigirAprovacao(cfg.exigir_aprovacao ?? true)
    setSchedEnvioAuto(cfg.envio_automatico_apos_aprovacao ?? false)
    setSchedStatus(cfg.status || 'ATIVO')
    setIsScheduleModalOpen(true)
  }

  // Ação: Salvar Agendamento & Periodicidade (Centralizado)
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSavingSchedule) return

    if (!selectedConfigId) {
      setErrorMsg('Não foi possível salvar: selecione uma Configuração por Linha para vincular.')
      return
    }

    const targetConfig = configs.find((c) => c.id === selectedConfigId)
    if (!targetConfig) {
      setErrorMsg('A configuração por linha selecionada não foi encontrada.')
      return
    }

    setIsSavingSchedule(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const proximaCalculada = lineSummaryAutomationService.calculateNextExecution(
        schedPeriodicidade,
        {
          horario: schedHorario,
          dia_do_mes: schedDiaMes,
          intervalo_dias: schedIntervaloDias,
          data_inicio: schedDataInicio,
          data_fim: schedDataFim,
        },
      )

      await lineSummaryAutomationService.saveLineConfig({
        id: targetConfig.id,
        empresa_code: targetConfig.empresa_code,
        linha_code: targetConfig.linha_code,
        linha_nome: targetConfig.linha_nome,
        centro_code: targetConfig.centro_code,
        centro_nome: targetConfig.centro_nome,
        template_id: targetConfig.template_id,
        template_code: targetConfig.template_code,
        template_nome: targetConfig.template_nome,
        tipo_resumo: targetConfig.tipo_resumo,
        responsavel_geracao_id: targetConfig.responsavel_geracao_id,
        responsavel_geracao_nome: targetConfig.responsavel_geracao_nome,
        programador_pcp_id: targetConfig.programador_pcp_id,
        programador_pcp_nome: targetConfig.programador_pcp_nome,
        programador_substituto_id: targetConfig.programador_substituto_id,
        programador_substituto_nome: targetConfig.programador_substituto_nome,
        supervisor_pcp_id: targetConfig.supervisor_pcp_id,
        supervisor_pcp_nome: targetConfig.supervisor_pcp_nome,
        observacoes: targetConfig.observacoes,
        finalidade: targetConfig.finalidade,
        // Parametrização exclusiva gerenciada aqui:
        periodicidade: schedPeriodicidade,
        parametros_personalizados: {
          horario: schedHorario,
          dia_do_mes: Number(schedDiaMes),
          intervalo_dias: Number(schedIntervaloDias),
          data_inicio: schedDataInicio,
          data_fim: schedDataFim,
        },
        geracao_automatica: schedGeracaoAuto,
        exigir_aprovacao: schedExigirAprovacao,
        envio_automatico_apos_aprovacao: schedEnvioAuto,
        proxima_execucao: proximaCalculada,
        status: schedStatus,
      })

      const successNotice = `Agendamento da Linha ${targetConfig.linha_code} salvo com sucesso.`
      setSuccessMsg(successNotice)
      toast({
        title: 'Sucesso',
        description: successNotice,
      })

      setIsScheduleModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error('[SchedulesAndRunsTab] Erro ao salvar agendamento:', err)
      const friendlyMessage =
        err?.message ||
        'Não foi possível salvar os parâmetros do agendamento. Verifique os dados e tente novamente.'
      setErrorMsg(friendlyMessage)
      toast({
        title: 'Erro ao salvar agendamento',
        description: friendlyMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSavingSchedule(false)
    }
  }

  // Ação: Visualizar Configuração
  const handleViewConfig = (cfg: LineSummaryConfig) => {
    setViewingConfig(cfg)
    setViewConfigModalOpen(true)
  }

  // Ação: Gerar Agora (respeita período selecionado, dedup e desabilita durante execução)
  const handleGenerateNow = async (cfg: LineSummaryConfig) => {
    setProcessingConfigId(cfg.id)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const periodo =
        selectedPeriodo ||
        (() => {
          const now = new Date()
          const mesNum = now.getMonth() + 1
          return `${now.getFullYear()}-${mesNum < 10 ? '0' + mesNum : mesNum}`
        })()

      const res = await lineSummaryAutomationService.generateSummariesByLine({
        config_ids: [cfg.id],
        periodo,
        with_ai: true,
      })

      const item = res.results?.[0]
      if (item?.result?.already_executed) {
        setSuccessMsg(
          `Resumo da Linha ${cfg.linha_code} já estava gerado para o período ${periodo}. Não houve duplicação.`,
        )
      } else if (item?.success) {
        setSuccessMsg(
          `Resumo da Linha ${cfg.linha_code} gerado com sucesso (${item.resumo_codigo || 'PMS'}) para o período ${periodo}.`,
        )
      } else {
        setErrorMsg(`Falha ao gerar: ${item?.error || 'Erro desconhecido'}`)
      }
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar resumo da linha')
    } finally {
      setProcessingConfigId(null)
    }
  }

  // Ação: Reprocessar Falha
  const handleReprocessRun = async (run: SummaryScheduleRun) => {
    setReprocessingRunId(run.id)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const res = await lineSummaryAutomationService.reprocessRun(run.id)
      if (res.success) {
        setSuccessMsg(`Execução da Linha ${run.linha_code} reprocessada com sucesso.`)
      } else {
        setErrorMsg(`Falha no reprocessamento: ${res.message}`)
      }
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao reprocessar execução')
    } finally {
      setReprocessingRunId(null)
    }
  }

  // Ação: Suspender / Reativar
  const handleToggleStatus = async (cfg: LineSummaryConfig) => {
    try {
      if (cfg.status === 'ATIVO') {
        await lineSummaryAutomationService.suspendConfig(cfg.id)
        setSuccessMsg(`Agendamento da Linha ${cfg.linha_code} suspenso.`)
      } else {
        await lineSummaryAutomationService.reactivateConfig(cfg.id)
        setSuccessMsg(`Agendamento da Linha ${cfg.linha_code} reativado.`)
      }
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao alterar status')
    }
  }

  const handleOpenRecipientsModal = (cfg: LineSummaryConfig) => {
    setRecipientTargetLine(cfg.linha_code)
    setRecipientTargetConfigId(cfg.id)
    setRecipientModalOpen(true)
  }

  const handleOpenHistoryModal = (cfg: LineSummaryConfig) => {
    setHistoryTargetConfig(cfg)
    setHistoryModalOpen(true)
  }

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—'
    try {
      const d = new Date(iso)
      if (isNaN(d.getTime())) return iso
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
    } catch (_) {
      return iso
    }
  }

  const filteredConfigs = configs.filter((c) => {
    const q = searchFilter.toLowerCase().trim()
    const matchesSearch =
      !q ||
      c.linha_code.toLowerCase().includes(q) ||
      (c.linha_nome && c.linha_nome.toLowerCase().includes(q)) ||
      (c.template_nome && c.template_nome.toLowerCase().includes(q))
    const matchesLine = lineFilter === 'ALL' || c.linha_code === lineFilter
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchesSearch && matchesLine && matchesStatus
  })

  if (!canManage && configs.length === 0 && !isLoading) {
    return (
      <div className="p-8 text-center bg-white border border-amber-200 rounded-lg space-y-2">
        <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto" />
        <div className="font-bold text-slate-800 text-sm">
          Acesso Restrito ao Monitoramento Operacional
        </div>
        <p className="text-slate-500 text-xs max-w-md mx-auto">
          Você não possui perfil administrativo do PCP para gerenciar parâmetros de agendamento
          automático ou disparos. Contate o gestor do PCP CIAFAL para liberação de perfil.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Mensagens */}
      {errorMsg && (
        <Alert variant="destructive" className="bg-rose-50 border-rose-300 text-rose-900 py-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <AlertDescription className="text-xs font-medium ml-2">{errorMsg}</AlertDescription>
        </Alert>
      )}
      {successMsg && (
        <Alert className="bg-emerald-50 border-emerald-300 text-emerald-900 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <AlertDescription className="text-xs font-medium ml-2">{successMsg}</AlertDescription>
        </Alert>
      )}

      {/* 6 Cards de Indicadores do Plano */}
      <div
        className="grid gap-2.5"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        }}
      >
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-600 whitespace-normal break-words leading-tight">
            Configurações Ativas
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#004C97] font-mono">
            {totalConfigsAtivas}
          </div>
          <div className="text-[10px] text-slate-400">Linhas produtivas</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-600 whitespace-normal break-words leading-tight">
            Programados
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700 font-mono">
            {totalProgramados}
          </div>
          <div className="text-[10px] text-slate-400">Via cron persistente</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-600 whitespace-normal break-words leading-tight">
            Gerados (Runs)
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono">
            {totalRunsSucesso}
          </div>
          <div className="text-[10px] text-slate-400">Com sucesso</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-600 whitespace-normal break-words leading-tight">
            Aguard. Aprovação
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-700 font-mono">
            {totalAguardandoAprovacao}
          </div>
          <div className="text-[10px] text-slate-400">Trava de governança</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-600 whitespace-normal break-words leading-tight">
            Enviados
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-700 font-mono">
            {totalEnviados}
          </div>
          <div className="text-[10px] text-slate-400">Pós-aprovação</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 flex flex-col justify-between">
          <div className="text-xs uppercase font-bold text-slate-600 whitespace-normal break-words leading-tight">
            Falhas / Erros
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-700 font-mono">
            {totalRunsFalha}
          </div>
          <div className="text-[10px] text-slate-400">Com reprocessamento</div>
        </div>
      </div>

      {/* Barra de Filtro e Ações */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar agendamentos por linha ou template..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded px-2 h-8">
            <CalendarCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-500 font-medium">Período Alvo:</span>
            <input
              type="month"
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="bg-transparent text-xs text-slate-700 font-bold focus:outline-none"
              title="Período de referência para geração e monitoramento"
            />
          </div>

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="h-8 border border-slate-200 rounded text-xs px-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Todas as Linhas</option>
            {realLines.map((l) => (
              <option key={l.id} value={l.code}>
                {l.code}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 border border-slate-200 rounded text-xs px-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ATIVO">Ativo</option>
            <option value="SUSPENSO">Suspenso</option>
            <option value="INATIVO">Inativo</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <Button
              size="sm"
              onClick={handleOpenNewScheduleModal}
              disabled={configs.length === 0}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 h-8 text-xs"
              title={
                configs.length === 0
                  ? 'Cadastre primeiro uma Configuração por Linha para parametrizar o agendamento'
                  : 'Criar / Configurar novo agendamento vinculado a uma linha'
              }
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Agendamento</span>
            </Button>
          )}

          {onOpenGenerateModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenGenerateModal}
              className="border-blue-300 text-blue-700 hover:bg-blue-50 font-bold gap-1.5 h-8 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Gerar Resumo por Linha</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabela de Agendamentos e Envios */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white border rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-[#004C97] mx-auto mb-2" />
          <span>Carregando monitoramento de agendamentos...</span>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="p-8 text-center bg-white border border-dashed rounded-lg space-y-2">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="font-bold text-slate-800 text-xs">Nenhum agendamento ativo</div>
          <p className="text-slate-500 text-[11px]">
            Cadastre parametrizações na aba "Configuração por Linha" para ativar a automação.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
          <table className="w-full text-xs text-left min-w-[1050px]">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Linha</th>
                <th className="py-2.5 px-3">Período</th>
                <th className="py-2.5 px-3">Template</th>
                <th className="py-2.5 px-3">Última Geração</th>
                <th className="py-2.5 px-3">Próxima Geração</th>
                <th className="py-2.5 px-3">Data Prevista de Envio</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConfigs.map((cfg) => {
                const isProcessing = processingConfigId === cfg.id
                const lastRun = runs.find((r) => r.config_id === cfg.id)
                const resolvedTpl = lineSummaryAutomationService.resolveTemplateForLine(
                  cfg,
                  templates as any,
                )
                const hasFailedRun = lastRun?.status === 'FALHA'

                const dataPrevistaEnvio = cfg.envio_automatico_apos_aprovacao
                  ? cfg.proxima_execucao
                    ? formatDateTime(cfg.proxima_execucao)
                    : 'Pós-aprovação'
                  : 'Manual'

                return (
                  <tr key={cfg.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Linha */}
                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Badge className="bg-[#004C97] text-white text-[10px] px-1.5 py-0 font-bold">
                          {cfg.linha_code}
                        </Badge>
                        <span className="font-medium text-slate-800">
                          {cfg.linha_nome || cfg.linha_code}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Centro: {cfg.centro_code || 'Geral'} &bull; {cfg.empresa_code}
                      </div>
                    </td>

                    {/* Período */}
                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-bold text-slate-800">
                        {PERIODICITY_LABELS[cfg.periodicidade] || cfg.periodicidade}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Horário: {cfg.parametros_personalizados?.horario || '08:00'}</span>
                        {cfg.parametros_personalizados?.dia_do_mes && (
                          <span>&bull; Dia {cfg.parametros_personalizados.dia_do_mes}</span>
                        )}
                      </div>
                    </td>

                    {/* Template */}
                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span
                          className="truncate max-w-[170px]"
                          title={resolvedTpl?.nome || cfg.template_nome || 'Padrão'}
                        >
                          {resolvedTpl?.nome || cfg.template_nome || 'Padrão Canônico'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {resolvedTpl?.versao_tag || 'V1.0'} &bull;{' '}
                        {resolvedTpl?.aplicacao || 'GERAL'}
                      </div>
                    </td>

                    {/* Última Geração */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div>{formatDateTime(cfg.data_ultima_geracao)}</div>
                      {lastRun && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge
                            variant="outline"
                            className={`text-[9px] py-0 px-1 font-bold ${
                              lastRun.status === 'SUCESSO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300'
                            }`}
                          >
                            {lastRun.status}
                          </Badge>
                          <span className="text-[9px] text-slate-400">{lastRun.periodo}</span>
                        </div>
                      )}
                    </td>

                    {/* Próxima Geração */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div>{formatDateTime(cfg.proxima_execucao)}</div>
                      <div className="text-[9px] text-slate-400">
                        {cfg.geracao_automatica ? 'Automática' : 'Manual'}
                      </div>
                    </td>

                    {/* Data Prevista de Envio */}
                    <td className="py-3 px-3 space-y-0.5 text-[11px]">
                      <div className="font-mono text-slate-700">{dataPrevistaEnvio}</div>
                      {cfg.exigir_aprovacao ? (
                        <div className="text-[9px] text-amber-700 font-bold flex items-center gap-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Exige aprovação
                        </div>
                      ) : (
                        <div className="text-[9px] text-emerald-700 font-medium">Envio direto</div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          cfg.status === 'ATIVO'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : cfg.status === 'SUSPENSO'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {cfg.status}
                      </Badge>
                    </td>

                    {/* Responsável */}
                    <td className="py-3 px-3 text-slate-800 text-xs">
                      <div className="font-medium">
                        {cfg.responsavel_geracao_nome || 'PCP Operação'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {cfg.responsavel_geracao_id
                          ? 'ID: ' + cfg.responsavel_geracao_id.slice(0, 6)
                          : 'Sistema'}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* 1. Visualizar Configuração */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewConfig(cfg)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Visualizar Detalhes da Configuração"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* 2. Parametrizar / Editar Agendamento (Centralizado) */}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEditScheduleModal(cfg)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Editar Periodicidade e Agendamento"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* 3. Gerar Agora */}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing || cfg.status !== 'ATIVO'}
                          onClick={() => handleGenerateNow(cfg)}
                          className="h-7 text-[11px] font-bold border-blue-300 text-blue-700 hover:bg-blue-50 px-2 gap-1"
                          title={`Gerar resumo da Linha ${cfg.linha_code} agora para o período ${selectedPeriodo}`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Gerando...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-blue-700" />
                              <span>Gerar Agora</span>
                            </>
                          )}
                        </Button>

                        {/* 4. Suspender / Reativar */}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleStatus(cfg)}
                            className={`h-7 w-7 p-0 ${
                              cfg.status === 'ATIVO'
                                ? 'text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={
                              cfg.status === 'ATIVO'
                                ? 'Suspender Agendamento'
                                : 'Reativar Agendamento'
                            }
                          >
                            {cfg.status === 'ATIVO' ? (
                              <PauseCircle className="w-3.5 h-3.5" />
                            ) : (
                              <PlayCircle className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}

                        {/* 5. Reprocessar Falha */}
                        {hasFailedRun && canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={reprocessingRunId === lastRun!.id}
                            onClick={() => handleReprocessRun(lastRun!)}
                            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                            title="Reprocessar Última Falha Registrada"
                          >
                            {reprocessingRunId === lastRun!.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}

                        {/* 6. Consultar Histórico */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenHistoryModal(cfg)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Consultar Histórico de Execuções e Envios"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>

                        {/* 7. Configurar Destinatários */}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenRecipientsModal(cfg)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Configurar Destinatários de Envio"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Seção Inferior: Últimas Execuções e Reprocessamento */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4" />
            <span>Últimas Execuções Registradas (pcp_summary_schedule_runs)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {runs.length} execuções no histórico
          </span>
        </div>

        {runs.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-xs italic">
            Nenhuma execução registrada até o momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
            {runs.slice(0, 15).map((r) => {
              const isReprocessing = reprocessingRunId === r.id
              return (
                <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <Badge className="bg-[#004C97] text-white text-[9px] px-1 py-0">
                        {r.linha_code}
                      </Badge>
                      <span>Período: {r.periodo}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] py-0 px-1 font-bold ${
                          r.status === 'SUCESSO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : r.status === 'FALHA'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status}
                      </Badge>
                      <span className="text-[10px] text-slate-400 font-mono">({r.origem})</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Código Resumo: {r.resumo_codigo || '—'} &bull; Template:{' '}
                      {r.template_codigo_usado || 'Padrão'} ({r.template_versao_usada || 'V1.0'})
                      &bull; {formatDateTime(r.created)}
                    </div>
                    {r.erro && (
                      <div className="text-[10px] text-rose-600 font-medium">{r.erro}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {r.status === 'FALHA' && canManage && (
                      <Button
                        size="sm"
                        disabled={isReprocessing}
                        onClick={() => handleReprocessRun(r)}
                        className="h-6 text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 px-2"
                      >
                        {isReprocessing ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Reprocessando...</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3 h-3" />
                            <span>Reprocessar Falha</span>
                          </>
                        )}
                      </Button>
                    )}

                    {r.resumo_gerado_id && onOpenSummaryDetail && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenSummaryDetail(r.resumo_gerado_id!)}
                        className="h-6 text-[10px] text-blue-700 hover:bg-blue-50 px-2"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Ver Resumo
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL CENTRALIZADO DE CRIAÇÃO & EDIÇÃO DE AGENDAMENTOS & ENVIOS */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                {editingConfigId
                  ? 'Parametrizar Agendamento & Disparo'
                  : 'Novo Agendamento & Disparo'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSchedule} className="space-y-4 py-2">
            {/* Bloco 1: Vinculação Obrigatória à Configuração por Linha */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>1. Configuração por Linha Vinculada</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Configuração por Linha *
                </Label>
                <select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  disabled={Boolean(editingConfigId)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold disabled:bg-slate-100"
                  required
                >
                  <option value="">Selecione uma configuração cadastrada...</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      Linha {c.linha_code} — {c.linha_nome || c.linha_code} ({c.empresa_code} /{' '}
                      {c.centro_code || 'Geral'}) &bull; {c.tipo_resumo}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  O agendamento herda o contexto fabril e a matriz de responsáveis da linha.
                </p>
              </div>

              {/* Template Herdado — Modo Leitura */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-blue-900 font-semibold flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Template Herdado da Linha (Somente Leitura):
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 text-[9px] border-blue-300">
                    Herança Automática
                  </Badge>
                </div>
                <div className="font-bold text-slate-900 text-xs">
                  {currentInheritedTemplate?.nome ||
                    currentSelectedConfig?.template_nome ||
                    'Template Padrão Institucional (18 Seções Mínimas)'}
                </div>
                <div className="text-[10px] text-slate-600 font-mono">
                  Código:{' '}
                  {currentInheritedTemplate?.template_code ||
                    currentSelectedConfig?.template_code ||
                    'TMP-CANONICO'}{' '}
                  &bull; Versão: {currentInheritedTemplate?.versao_tag || 'V1.0'} &bull; Nível:{' '}
                  {currentInheritedTemplate?.aplicacao || 'GERAL'}
                </div>
              </div>
            </div>

            {/* Bloco 2: Periodicidade & Cronograma de Disparo */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>2. Periodicidade, Horário & Vigência</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Periodicidade *</Label>
                  <select
                    value={schedPeriodicidade}
                    onChange={(e) => setSchedPeriodicidade(e.target.value as SummaryPeriodicity)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                    required
                  >
                    <option value="diaria">Diária</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="sob_demanda">Sob Demanda (Sem Agendamento Automático)</option>
                    <option value="personalizada">Personalizada</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Horário da Execução (HH:mm) *
                  </Label>
                  <Input
                    type="time"
                    value={schedHorario}
                    onChange={(e) => setSchedHorario(e.target.value)}
                    className="h-8 text-xs bg-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {schedPeriodicidade === 'mensal' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Dia do Mês de Execução (1 a 31) *
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={schedDiaMes}
                      onChange={(e) => setSchedDiaMes(parseInt(e.target.value, 10) || 1)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>
                )}

                {schedPeriodicidade === 'personalizada' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Intervalo em Dias *
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={schedIntervaloDias}
                      onChange={(e) => setSchedIntervaloDias(parseInt(e.target.value, 10) || 1)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Data de Início da Automação *
                  </Label>
                  <Input
                    type="date"
                    value={schedDataInicio}
                    onChange={(e) => setSchedDataInicio(e.target.value)}
                    className="h-8 text-xs bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Data de Fim (Opcional)
                  </Label>
                  <Input
                    type="date"
                    value={schedDataFim}
                    onChange={(e) => setSchedDataFim(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Cálculo Visível de Próxima Execução */}
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] flex items-center justify-between">
                <div>
                  <span className="text-emerald-900 font-bold block">
                    Próxima Execução Calculada:
                  </span>
                  <span className="text-slate-600 text-[10px]">
                    Estimada pelo fuso horário de Brasília (UTC-03:00)
                  </span>
                </div>
                <div className="font-mono font-bold text-emerald-800 text-xs">
                  {formatDateTime(calculatedNextExecutionPreview) || 'Sob Demanda'}
                </div>
              </div>
            </div>

            {/* Bloco 3: Governança, Aprovação e Disparo Automático */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                3. Governança & Regras de Distribuição
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">Geração Automática</Label>
                    <div className="text-[10px] text-slate-500">
                      Disparada pontualmente pelo cron persistente de backend
                    </div>
                  </div>
                  <Switch checked={schedGeracaoAuto} onCheckedChange={setSchedGeracaoAuto} />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Exigir Aprovação Prévia (Trava de Governança)
                    </Label>
                    <div className="text-[10px] text-slate-500">
                      Bloqueia envio até validação do Supervisor PCP
                    </div>
                  </div>
                  <Switch
                    checked={schedExigirAprovacao}
                    onCheckedChange={setSchedExigirAprovacao}
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">
                      Envio Automático Pós-Aprovação
                    </Label>
                    <div className="text-[10px] text-slate-500">
                      Distribui imediatamente aos destinatários autorizados quando aprovado
                    </div>
                  </div>
                  <Switch checked={schedEnvioAuto} onCheckedChange={setSchedEnvioAuto} />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Status do Agendamento *
                </Label>
                <select
                  value={schedStatus}
                  onChange={(e) => setSchedStatus(e.target.value as any)}
                  className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                >
                  <option value="ATIVO">ATIVO (Em Operação)</option>
                  <option value="SUSPENSO">SUSPENSO (Pausado temporariamente)</option>
                  <option value="INATIVO">INATIVO</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-200 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsScheduleModalOpen(false)}
                className="h-8 text-xs"
                disabled={isSavingSchedule}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingSchedule}
                className="bg-[#004C97] hover:bg-[#003870] text-white h-8 text-xs font-bold gap-1.5"
              >
                {isSavingSchedule ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando Agendamento...</span>
                  </>
                ) : (
                  <span>Salvar Agendamento</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Destinatários */}
      <ConfigureRecipientsModal
        isOpen={recipientModalOpen}
        onClose={() => setRecipientModalOpen(false)}
        linhaCode={recipientTargetLine}
        configId={recipientTargetConfigId}
        canManage={canManage}
        onSuccess={() => {
          setSuccessMsg('Destinatários atualizados com sucesso.')
          setRecipientModalOpen(false)
        }}
      />

      {/* Modal de Visualização da Configuração */}
      {viewingConfig && (
        <Dialog open={viewConfigModalOpen} onOpenChange={setViewConfigModalOpen}>
          <DialogContent className="max-w-md text-xs">
            <DialogHeader className="border-b border-slate-200 pb-2">
              <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Configuração da Linha {viewingConfig.linha_code}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-2.5 py-2">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border rounded text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Linha Produtiva:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.linha_code} — {viewingConfig.linha_nome || 'CIAFAL'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Centro / Empresa:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.centro_code || 'Geral'} &bull; {viewingConfig.empresa_code}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Periodicidade:</span>
                  <span className="font-bold text-slate-800">
                    {PERIODICITY_LABELS[viewingConfig.periodicidade]}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Horário de Execução:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.parametros_personalizados?.horario || '08:00'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Status:</span>
                  <Badge
                    className={
                      viewingConfig.status === 'ATIVO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }
                  >
                    {viewingConfig.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Template Vinculado:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.template_nome || 'Padrão Homologado'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Geração Automática:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.geracao_automatica ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Exigir Aprovação Prévia:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.exigir_aprovacao ? 'Sim (Trava de Governança)' : 'Não'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Envio Automático Pós-Aprovação:</span>
                  <span className="font-bold text-slate-800">
                    {viewingConfig.envio_automatico_apos_aprovacao ? 'Sim' : 'Não'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Próxima Execução:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatDateTime(viewingConfig.proxima_execucao)}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setViewConfigModalOpen(false)}
                className="h-7 text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Histórico Específico da Configuração */}
      {historyTargetConfig && (
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-2xl text-xs max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-200 pb-2">
              <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Histórico de Execuções da Linha {historyTargetConfig.linha_code}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-2.5 bg-slate-50 border rounded text-[11px] space-y-1">
                <div>
                  <strong>Linha:</strong> {historyTargetConfig.linha_code} —{' '}
                  {historyTargetConfig.linha_nome}
                </div>
                <div>
                  <strong>Periodicidade:</strong>{' '}
                  {PERIODICITY_LABELS[historyTargetConfig.periodicidade]} (Horário:{' '}
                  {historyTargetConfig.parametros_personalizados?.horario || '08:00'})
                </div>
                <div>
                  <strong>Próxima Execução Prevista:</strong>{' '}
                  {formatDateTime(historyTargetConfig.proxima_execucao)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800 text-xs">Registros de Disparo:</div>
                {runs.filter((r) => r.config_id === historyTargetConfig.id).length === 0 ? (
                  <div className="p-4 text-center text-slate-400 italic">
                    Nenhum disparo anterior registrado para esta configuração.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {runs
                      .filter((r) => r.config_id === historyTargetConfig.id)
                      .map((run) => (
                        <div
                          key={run.id}
                          className="py-2 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              <span>Período: {run.periodo}</span>
                              <Badge
                                variant="outline"
                                className={
                                  run.status === 'SUCESSO'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 font-bold'
                                }
                              >
                                {run.status}
                              </Badge>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Código: {run.resumo_codigo || '—'} &bull; Executado em:{' '}
                              {formatDateTime(run.iniciado_em || run.created)}
                            </div>
                          </div>
                          {run.status === 'FALHA' && canManage && (
                            <Button
                              size="sm"
                              onClick={() => handleReprocessRun(run)}
                              className="h-6 text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold"
                            >
                              Reprocessar
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryModalOpen(false)}
                className="h-7 text-xs"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
