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
} from 'lucide-react'

interface SchedulesAndRunsTabProps {
  templates: MonthlySummaryTemplate[]
  canManage: boolean
  onOpenGenerateModal?: () => void
  onOpenSummaryDetail?: (summaryId: string) => void
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

  // Filtros
  const [searchFilter, setSearchFilter] = useState('')
  const [lineFilter, setLineFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

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
  const totalProgramados = configs.filter((c) => c.status === 'ATIVO' && c.geracao_automatica).length
  const totalRunsSucesso = runs.filter((r) => r.status === 'SUCESSO').length
  const totalAguardandoAprovacao = configs.filter((c) => c.exigir_aprovacao && c.status === 'ATIVO').length
  const totalRunsFalha = runs.filter((r) => r.status === 'FALHA').length
  const totalEnviados = runs.filter((r) => r.status === 'SUCESSO' && !r.erro).length

  // Ação: Gerar Agora (respeita período, dedup e desabilita durante execução)
  const handleGenerateNow = async (cfg: LineSummaryConfig) => {
    setProcessingConfigId(cfg.id)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      const now = new Date()
      const mesNum = now.getMonth() + 1
      const periodo = `${now.getFullYear()}-${mesNum < 10 ? '0' + mesNum : mesNum}`

      const res = await lineSummaryAutomationService.generateSummariesByLine({
        config_ids: [cfg.id],
        periodo,
        with_ai: true,
      })

      const item = res.results?.[0]
      if (item?.result?.already_executed) {
        setSuccessMsg(`Resumo da Linha ${cfg.linha_code} já estava gerado para o período ${periodo}.`)
      } else if (item?.success) {
        setSuccessMsg(`Resumo da Linha ${cfg.linha_code} gerado com sucesso (${item.resumo_codigo || 'PMS'}).`)
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
                <th className="py-2.5 px-3">Linha / Centro</th>
                <th className="py-2.5 px-3">Periodicidade</th>
                <th className="py-2.5 px-3">Template Vinculado</th>
                <th className="py-2.5 px-3">Última Geração</th>
                <th className="py-2.5 px-3">Próxima Geração</th>
                <th className="py-2.5 px-3">Envio Previsto</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Responsável</th>
                <th className="py-2.5 px-3 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConfigs.map((cfg) => {
                const isProcessing = processingConfigId === cfg.id
                const lastRun = runs.find((r) => r.config_id === cfg.id)
                const linkedTpl = templates.find((t) => t.id === cfg.template_id)

                return (
                  <tr key={cfg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Badge className="bg-[#004C97] text-white text-[10px] px-1.5 py-0">
                          {cfg.linha_code}
                        </Badge>
                        <span>{cfg.linha_nome || cfg.linha_code}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Centro: {cfg.centro_code || 'Geral'} &bull; {cfg.empresa_code}
                      </div>
                    </td>

                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-bold text-slate-800">
                        {PERIODICITY_LABELS[cfg.periodicidade] || cfg.periodicidade}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Horário: {cfg.parametros_personalizados?.horario || '08:00'}
                      </div>
                    </td>

                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>{linkedTpl?.nome || cfg.template_nome || 'Padrão Canônico'}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {linkedTpl?.versao_tag || 'V1.0'}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div>{formatDateTime(cfg.data_ultima_geracao)}</div>
                      {lastRun && (
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
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div>{formatDateTime(cfg.proxima_execucao)}</div>
                    </td>

                    <td className="py-3 px-3 space-y-0.5">
                      <div className="text-slate-700">
                        {cfg.envio_automatico_apos_aprovacao
                          ? 'Automático pós-aprovação'
                          : 'Manual / Sob Demanda'}
                      </div>
                      {cfg.exigir_aprovacao && (
                        <div className="text-[10px] text-amber-700 font-bold">
                          Bloqueado até aprovação
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          cfg.status === 'ATIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cfg.status === 'SUSPENSO'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cfg.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-slate-800">
                      {cfg.responsavel_geracao_nome || 'PCP'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Botão Gerar Agora */}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isProcessing || cfg.status !== 'ATIVO'}
                          onClick={() => handleGenerateNow(cfg)}
                          className="h-7 text-[11px] font-bold border-blue-300 text-blue-700 hover:bg-blue-50 px-2 gap-1"
                          title="Gerar resumo da linha imediatamente respeitando período"
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

                        {/* Botão Configurar Destinatários */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenRecipientsModal(cfg)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Configurar Destinatários de Envio"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </Button>

                        {/* Botão Histórico de Execuções */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenHistoryModal(cfg)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Consultar Histórico de Execuções"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>

                        {/* Suspender / Reativar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(cfg)}
                          className={`h-7 w-7 p-0 ${
                            cfg.status === 'ATIVO'
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={cfg.status === 'ATIVO' ? 'Suspender Agendamento' : 'Reativar'}
                        >
                          {cfg.status === 'ATIVO' ? (
                            <PauseCircle className="w-3.5 h-3.5" />
                          ) : (
                            <PlayCircle className="w-3.5 h-3.5" />
                          )}
                        </Button>
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
                      {r.template_codigo_usado || 'Padrão'} ({r.template_versao_usada || 'V1.0'}) &bull;{' '}
                      {formatDateTime(r.created)}
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

      {/* Modal de Histórico Específico da Configuração */}
      {historyTargetConfig && (
        <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
          <DialogContent className="max-w-2xl text-xs max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-200 pb-2">
              <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>
                  Histórico de Execuções da Linha {historyTargetConfig.linha_code}
                </span>
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
