import React, { useState, useEffect } from 'react'
import {
  lineSummaryAutomationService,
  type LineSummaryConfig,
  type SummaryScheduleRun,
  type RealProductionLine,
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
  Filter,
  Eye,
  Send,
  Layers,
  Sparkles,
  ArrowRight,
  Edit,
  ShieldAlert,
  CalendarCheck,
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
  onEditConfig,
}) => {
  const [configs, setConfigs] = useState<LineSummaryConfig[]>([])
  const [runs, setRuns] = useState<SummaryScheduleRun[]>([])
  const [realLines, setRealLines] = useState<RealProductionLine[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

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

  // Modal de Edição Direta da Configuração
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<LineSummaryConfig | null>(null)
  const [editFormData, setEditFormData] = useState({
    periodicidade: 'mensal',
    horario: '08:00',
    dia_do_mes: 1,
    intervalo_dias: 1,
    geracao_automatica: true,
    exigir_aprovacao: true,
    envio_automatico_apos_aprovacao: true,
    template_id: '',
    status: 'ATIVO',
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

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

  // Ação: Visualizar Configuração
  const handleViewConfig = (cfg: LineSummaryConfig) => {
    setViewingConfig(cfg)
    setViewConfigModalOpen(true)
  }

  // Ação: Iniciar Edição de Configuração
  const handleStartEditConfig = (cfg: LineSummaryConfig) => {
    if (onEditConfig) {
      onEditConfig(cfg)
      return
    }
    setEditingConfig(cfg)
    setEditFormData({
      periodicidade: cfg.periodicidade || 'mensal',
      horario: cfg.parametros_personalizados?.horario || '08:00',
      dia_do_mes: cfg.parametros_personalizados?.dia_do_mes || 1,
      intervalo_dias: cfg.parametros_personalizados?.intervalo_dias || 1,
      geracao_automatica: cfg.geracao_automatica ?? true,
      exigir_aprovacao: cfg.exigir_aprovacao ?? true,
      envio_automatico_apos_aprovacao: cfg.envio_automatico_apos_aprovacao ?? true,
      template_id: cfg.template_id || '',
      status: cfg.status || 'ATIVO',
    })
    setEditModalOpen(true)
  }

  // Ação: Salvar Edição Direta
  const handleSaveEditConfig = async () => {
    if (!editingConfig) return
    setIsSavingEdit(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const proxima = lineSummaryAutomationService.calculateNextExecution(
        editFormData.periodicidade as any,
        {
          horario: editFormData.horario,
          dia_do_mes: editFormData.dia_do_mes,
          intervalo_dias: editFormData.intervalo_dias,
        },
      )

      await lineSummaryAutomationService.saveLineConfig({
        id: editingConfig.id,
        linha_code: editingConfig.linha_code,
        linha_nome: editingConfig.linha_nome,
        centro_code: editingConfig.centro_code,
        empresa_code: editingConfig.empresa_code,
        template_id: editFormData.template_id || undefined,
        periodicidade: editFormData.periodicidade as any,
        parametros_personalizados: {
          horario: editFormData.horario,
          dia_do_mes: Number(editFormData.dia_do_mes),
          intervalo_dias: Number(editFormData.intervalo_dias),
        },
        geracao_automatica: editFormData.geracao_automatica,
        exigir_aprovacao: editFormData.exigir_aprovacao,
        envio_automatico_apos_aprovacao: editFormData.envio_automatico_apos_aprovacao,
        status: editFormData.status as any,
        proxima_execucao: proxima,
      })

      setSuccessMsg(`Configuração da Linha ${editingConfig.linha_code} atualizada com sucesso.`)
      setEditModalOpen(false)
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar configuração da linha')
    } finally {
      setIsSavingEdit(false)
    }
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
        setSuccessMsg(`Configuração da Linha ${cfg.linha_code} suspensa.`)
      } else {
        await lineSummaryAutomationService.reactivateConfig(cfg.id)
        setSuccessMsg(`Configuração da Linha ${cfg.linha_code} reativada.`)
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

  // Estado de interface: sem permissão administrativa
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Configurações Ativas</div>
          <div className="text-xl font-bold text-[#004C97]">{totalConfigsAtivas}</div>
          <div className="text-[9px] text-slate-400">Linhas produtivas</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Programados</div>
          <div className="text-xl font-bold text-blue-700">{totalProgramados}</div>
          <div className="text-[9px] text-slate-400">Via cron persistente</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Gerados (Runs)</div>
          <div className="text-xl font-bold text-emerald-700">{totalRunsSucesso}</div>
          <div className="text-[9px] text-slate-400">Com sucesso</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Aguard. Aprovação</div>
          <div className="text-xl font-bold text-amber-700">{totalAguardandoAprovacao}</div>
          <div className="text-[9px] text-slate-400">Trava de governança</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Enviados</div>
          <div className="text-xl font-bold text-indigo-700">{totalEnviados}</div>
          <div className="text-[9px] text-slate-400">Pós-aprovação</div>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500">Falhas / Erros</div>
          <div className="text-xl font-bold text-rose-700">{totalRunsFalha}</div>
          <div className="text-[9px] text-slate-400">Com reprocessamento</div>
        </div>
      </div>

      {/* Barra de Filtro e Ação Principal */}
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

          {/* Seletor de Período para Execução Operacional */}
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

        {onOpenGenerateModal && (
          <Button
            size="sm"
            onClick={onOpenGenerateModal}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 h-8 text-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Gerar Resumo por Linha</span>
          </Button>
        )}
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

                // Data prevista de envio (calculada com base na próxima geração ou última aprovação)
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
                      <div className="text-[10px] text-slate-500">
                        Horário: {cfg.parametros_personalizados?.horario || '08:00'}
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

                        {/* 2. Editar Configuração */}
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditConfig(cfg)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Editar Configuração da Linha"
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

                        {/* 5. Reprocessar Falha (quando a última execução da linha falhou) */}
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

      {/* Modal de Edição Rápida da Configuração */}
      {editingConfig && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-lg text-xs">
            <DialogHeader className="border-b border-slate-200 pb-2">
              <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center gap-2">
                <Edit className="w-4 h-4" />
                <span>Editar Configuração — Linha {editingConfig.linha_code}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Periodicidade</Label>
                  <select
                    value={editFormData.periodicidade}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, periodicidade: e.target.value as any })
                    }
                    className="w-full h-8 text-xs border border-slate-200 rounded px-2 bg-slate-50"
                  >
                    <option value="diaria">Diária</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="sob_demanda">Sob Demanda</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Horário Previsto (HH:mm)
                  </Label>
                  <Input
                    type="time"
                    value={editFormData.horario}
                    onChange={(e) => setEditFormData({ ...editFormData, horario: e.target.value })}
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              </div>

              {editFormData.periodicidade === 'mensal' && (
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Dia do Mês de Execução (1 a 31)
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={editFormData.dia_do_mes}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        dia_do_mes: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="h-8 text-xs bg-slate-50"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Template Vinculado
                </Label>
                <select
                  value={editFormData.template_id}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, template_id: e.target.value })
                  }
                  className="w-full h-8 text-xs border border-slate-200 rounded px-2 bg-slate-50"
                >
                  <option value="">Padrão Canônico / Herança Automática</option>
                  {templates
                    .filter((t) => t.status === 'ATIVO')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({t.versao_tag}) &bull; {t.aplicacao}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Status Operacional
                </Label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, status: e.target.value as any })
                  }
                  className="w-full h-8 text-xs border border-slate-200 rounded px-2 bg-slate-50"
                >
                  <option value="ATIVO">Ativo</option>
                  <option value="SUSPENSO">Suspenso</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium text-slate-800">Geração Automática</Label>
                    <p className="text-[10px] text-slate-500">
                      Disparo agendado via cron de backend
                    </p>
                  </div>
                  <Switch
                    checked={editFormData.geracao_automatica}
                    onCheckedChange={(v) =>
                      setEditFormData({ ...editFormData, geracao_automatica: v })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium text-slate-800">
                      Exigir Aprovação Prévia
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      Bloqueia distribuição externa até revisão
                    </p>
                  </div>
                  <Switch
                    checked={editFormData.exigir_aprovacao}
                    onCheckedChange={(v) =>
                      setEditFormData({ ...editFormData, exigir_aprovacao: v })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-medium text-slate-800">
                      Envio Automático Pós-Aprovação
                    </Label>
                    <p className="text-[10px] text-slate-500">
                      Dispara e-mail/notificação imediatamente após aprovação
                    </p>
                  </div>
                  <Switch
                    checked={editFormData.envio_automatico_apos_aprovacao}
                    onCheckedChange={(v) =>
                      setEditFormData({ ...editFormData, envio_automatico_apos_aprovacao: v })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-slate-200 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(false)}
                className="h-8 text-xs"
                disabled={isSavingEdit}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEditConfig}
                disabled={isSavingEdit}
                className="bg-[#004C97] hover:bg-[#003870] text-white h-8 text-xs font-bold gap-1.5"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
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
