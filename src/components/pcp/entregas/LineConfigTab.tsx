import React, { useState, useEffect } from 'react'
import {
  lineSummaryAutomationService,
  type LineSummaryConfig,
  type SummaryPeriodicity,
  type RealProductionLine,
  type HubUser,
  PERIODICITY_LABELS,
  SUMMARY_TYPES,
} from '@/services/pcp-line-summary-automation-service'
import type { MonthlySummaryTemplate } from '@/services/pcp-line-summary-automation-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Plus,
  Search,
  Edit2,
  PauseCircle,
  PlayCircle,
  Trash2,
  Clock,
  Layers,
  User,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building,
} from 'lucide-react'

interface LineConfigTabProps {
  templates: MonthlySummaryTemplate[]
  canManage: boolean
  onNavigateToSchedules?: () => void
}

export const LineConfigTab: React.FC<LineConfigTabProps> = ({ templates, canManage }) => {
  const [configs, setConfigs] = useState<LineSummaryConfig[]>([])
  const [realLines, setRealLines] = useState<RealProductionLine[]>([])
  const [hubUsers, setHubUsers] = useState<HubUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchFilter, setSearchFilter] = useState('')
  const [lineFilter, setLineFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const { toast } = useToast()

  // Modal de Edição / Criação
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<Partial<LineSummaryConfig> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Estados do formulário
  const [formEmpresa, setFormEmpresa] = useState('CIAFAL')
  const [formLinhaCode, setFormLinhaCode] = useState('L1')
  const [formLinhaNome, setFormLinhaNome] = useState('')
  const [formCentroCode, setFormCentroCode] = useState('SDPL')
  const [formCentroNome, setFormCentroNome] = useState('Sidercentro')
  const [formTemplateId, setFormTemplateId] = useState('')
  const [formTipoResumo, setFormTipoResumo] = useState('Resumo Mensal PCP')
  const [formFinalidade, setFormFinalidade] = useState('')
  const [formPeriodicidade, setFormPeriodicidade] = useState<SummaryPeriodicity>('mensal')
  const [formIntervaloDias, setFormIntervaloDias] = useState(30)
  const [formHorario, setFormHorario] = useState('08:00')
  const [formDiaMes, setFormDiaMes] = useState(1)
  const [formGeracaoAuto, setFormGeracaoAuto] = useState(true)
  const [formExigirAprovacao, setFormExigirAprovacao] = useState(true)
  const [formEnvioAuto, setFormEnvioAuto] = useState(false)
  const [formRespGeracaoId, setFormRespGeracaoId] = useState('')
  const [formProgPcpId, setFormProgPcpId] = useState('')
  const [formProgSubstitutoId, setFormProgSubstitutoId] = useState('')
  const [formSupervisorId, setFormSupervisorId] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [formStatus, setFormStatus] = useState<'ATIVO' | 'INATIVO' | 'SUSPENSO'>('ATIVO')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const [cfgs, lines, users] = await Promise.all([
        lineSummaryAutomationService.listLineConfigs(),
        lineSummaryAutomationService.getRealProductionLines(),
        lineSummaryAutomationService.getHubUsers(),
      ])
      setConfigs(cfgs)
      setRealLines(lines)
      setHubUsers(users)
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar configurações por linha')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenNewModal = () => {
    const defaultLine = realLines.find((l) => l.code === 'L1') || realLines[0]
    const defaultUser = hubUsers[0]

    setEditingConfig(null)
    setFormEmpresa('CIAFAL')
    setFormLinhaCode(defaultLine ? defaultLine.code : 'L1')
    setFormLinhaNome(defaultLine ? defaultLine.name : 'Linha L1')
    setFormCentroCode(defaultLine?.sap_work_center || 'SDPL')
    setFormCentroNome(defaultLine?.sap_work_center || 'Sidercentro')
    setFormTemplateId('')
    setFormTipoResumo('Resumo Mensal PCP')
    setFormFinalidade('Fechamento operacional e aderência do plano de entregas')
    setFormPeriodicidade('mensal')
    setFormIntervaloDias(30)
    setFormHorario('08:00')
    setFormDiaMes(1)
    setFormGeracaoAuto(true)
    setFormExigirAprovacao(true)
    setFormEnvioAuto(false)
    setFormRespGeracaoId(defaultUser ? defaultUser.id : '')
    setFormProgPcpId(defaultUser ? defaultUser.id : '')
    setFormProgSubstitutoId('')
    setFormSupervisorId('')
    setFormObservacoes('')
    setFormStatus('ATIVO')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (cfg: LineSummaryConfig) => {
    setEditingConfig(cfg)
    setFormEmpresa(cfg.empresa_code || 'CIAFAL')
    setFormLinhaCode(cfg.linha_code)
    setFormLinhaNome(cfg.linha_nome || '')
    setFormCentroCode(cfg.centro_code || '')
    setFormCentroNome(cfg.centro_nome || '')
    setFormTemplateId(cfg.template_id || '')
    setFormTipoResumo(cfg.tipo_resumo || 'Resumo Mensal PCP')
    setFormFinalidade(cfg.finalidade || '')
    setFormPeriodicidade(cfg.periodicidade || 'mensal')
    setFormIntervaloDias(cfg.parametros_personalizados?.intervalo_dias || 30)
    setFormHorario(cfg.parametros_personalizados?.horario || '08:00')
    setFormDiaMes(cfg.parametros_personalizados?.dia_do_mes || 1)
    setFormGeracaoAuto(cfg.geracao_automatica)
    setFormExigirAprovacao(cfg.exigir_aprovacao)
    setFormEnvioAuto(cfg.envio_automatico_apos_aprovacao)
    setFormRespGeracaoId(cfg.responsavel_geracao_id || '')
    setFormProgPcpId(cfg.programador_pcp_id || '')
    setFormProgSubstitutoId(cfg.programador_substituto_id || '')
    setFormSupervisorId(cfg.supervisor_pcp_id || '')
    setFormObservacoes(cfg.observacoes || '')
    setFormStatus(cfg.status)
    setIsModalOpen(true)
  }

  const handleLineSelectionChange = (code: string) => {
    setFormLinhaCode(code)
    const lineObj = realLines.find((l) => l.code === code)
    if (lineObj) {
      setFormLinhaNome(lineObj.name)
      if (lineObj.sap_work_center) {
        setFormCentroCode(lineObj.sap_work_center)
        setFormCentroNome(lineObj.sap_work_center)
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return

    // Validação preventiva dos campos obrigatórios antes do envio
    if (!formEmpresa?.trim()) {
      setErrorMsg('Não foi possível salvar: o campo "Empresa" é obrigatório.')
      return
    }
    if (!formLinhaCode?.trim()) {
      setErrorMsg('Não foi possível salvar: selecione uma "Linha Produtiva".')
      return
    }
    if (!formTipoResumo?.trim()) {
      setErrorMsg('Não foi possível salvar: selecione o "Tipo de Resumo".')
      return
    }
    if (!formPeriodicidade?.trim()) {
      setErrorMsg('Não foi possível salvar: selecione a "Periodicidade".')
      return
    }
    if (!formRespGeracaoId?.trim()) {
      setErrorMsg('Não foi possível salvar: selecione o "Responsável pela Geração / Elaboração".')
      return
    }

    setIsSaving(true)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const selectedLine = realLines.find((l) => l.code === formLinhaCode)
      const respUser = hubUsers.find((u) => u.id === formRespGeracaoId)
      const progUser = hubUsers.find((u) => u.id === formProgPcpId)
      const subUser = hubUsers.find((u) => u.id === formProgSubstitutoId)
      const supUser = hubUsers.find((u) => u.id === formSupervisorId)
      const tpl = templates.find((t) => t.id === formTemplateId)

      // Payload estritamente alinhado ao schema de pcp_line_summary_configs
      const payload: Partial<LineSummaryConfig> = {
        id: editingConfig?.id,
        empresa_code: formEmpresa.trim(),
        linha_id: selectedLine?.id || '',
        linha_code: formLinhaCode.trim(),
        linha_nome: formLinhaNome || selectedLine?.name || formLinhaCode,
        centro_code: formCentroCode?.trim() || '',
        centro_nome: formCentroNome?.trim() || formCentroCode?.trim() || '',
        template_id: formTemplateId || '',
        template_code: tpl ? tpl.template_code : '',
        template_nome: tpl ? tpl.nome : '',
        tipo_resumo: formTipoResumo,
        responsavel_geracao_id: formRespGeracaoId,
        responsavel_geracao_nome: respUser ? respUser.name : '',
        programador_pcp_id: formProgPcpId || '',
        programador_pcp_nome: progUser ? progUser.name : '',
        programador_substituto_id: formProgSubstitutoId || '',
        programador_substituto_nome: subUser ? subUser.name : '',
        supervisor_pcp_id: formSupervisorId || '',
        supervisor_pcp_nome: supUser ? supUser.name : '',
        geracao_automatica: Boolean(formGeracaoAuto),
        exigir_aprovacao: Boolean(formExigirAprovacao),
        envio_automatico_apos_aprovacao: Boolean(formEnvioAuto),
        periodicidade: formPeriodicidade,
        parametros_personalizados: {
          intervalo_dias: formIntervaloDias,
          horario: formHorario,
          dia_do_mes: formDiaMes,
        },
        data_referencia_str: '',
        status: formStatus,
        observacoes: formObservacoes?.trim() || '',
        finalidade: formFinalidade?.trim() || '',
      }

      await lineSummaryAutomationService.saveLineConfig(payload)
      const successNotice = `Configuração da Linha ${formLinhaCode} salva com sucesso.`
      setSuccessMsg(successNotice)
      toast({
        title: 'Sucesso',
        description: successNotice,
      })

      // Fechar modal apenas em sucesso e recarregar listagem
      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      console.error('[LineConfigTab] Falha ao salvar configuração:', err)
      const friendlyMessage =
        err?.message ||
        'Não foi possível salvar a configuração. Verifique os dados e tente novamente.'
      setErrorMsg(friendlyMessage)
      toast({
        title: 'Erro ao salvar',
        description: friendlyMessage,
        variant: 'destructive',
      })
      // Em falha: o modal permanece aberto e os campos preenchidos
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (cfg: LineSummaryConfig) => {
    try {
      if (cfg.status === 'ATIVO') {
        await lineSummaryAutomationService.suspendConfig(cfg.id)
      } else {
        await lineSummaryAutomationService.reactivateConfig(cfg.id)
      }
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao alternar status da configuração')
    }
  }

  const handleDelete = async (cfg: LineSummaryConfig) => {
    if (!window.confirm(`Confirma a exclusão da configuração da Linha ${cfg.linha_code}?`)) {
      return
    }
    try {
      await lineSummaryAutomationService.deleteConfig(cfg.id)
      setSuccessMsg(`Configuração da Linha ${cfg.linha_code} excluída com sucesso.`)
      await loadData()
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir configuração')
    }
  }

  const filteredConfigs = configs.filter((c) => {
    const q = searchFilter.toLowerCase().trim()
    const matchesSearch =
      !q ||
      c.linha_code.toLowerCase().includes(q) ||
      (c.linha_nome && c.linha_nome.toLowerCase().includes(q)) ||
      (c.template_nome && c.template_nome.toLowerCase().includes(q)) ||
      (c.centro_code && c.centro_code.toLowerCase().includes(q)) ||
      (c.tipo_resumo && c.tipo_resumo.toLowerCase().includes(q))

    const matchesLine = lineFilter === 'ALL' || c.linha_code === lineFilter
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter

    return matchesSearch && matchesLine && matchesStatus
  })

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

  return (
    <div className="space-y-4">
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

      {/* Barra de Filtros e Ações */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por linha, template, centro ou tipo..."
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
            <option value="ALL">Todas as Linhas ({configs.length})</option>
            {realLines.map((l) => (
              <option key={l.id} value={l.code}>
                {l.code} — {l.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 border border-slate-200 rounded text-xs px-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ATIVO">Ativos</option>
            <option value="SUSPENSO">Suspensos</option>
            <option value="INATIVO">Inativos</option>
          </select>

          {(searchFilter || lineFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchFilter('')
                setLineFilter('ALL')
                setStatusFilter('ALL')
              }}
              className="h-8 text-xs text-slate-500 hover:text-slate-800"
            >
              Limpar
            </Button>
          )}
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={handleOpenNewModal}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 h-8 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Configuração de Linha</span>
          </Button>
        )}
      </div>

      {/* Tabela de Configurações */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 bg-white border rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-[#004C97] mx-auto mb-2" />
          <span>Carregando parametrizações por linha produtiva...</span>
        </div>
      ) : filteredConfigs.length === 0 ? (
        <div className="p-10 text-center bg-white border border-dashed rounded-lg space-y-3">
          <Layers className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <div className="font-bold text-slate-800 text-sm">Nenhuma configuração encontrada</div>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
              Cada linha produtiva real (L1, L2, SDC, etc.) pode ter regras automatizadas
              individuais com periodicidade, template vinculado e responsáveis.
            </p>
          </div>
          {canManage && (
            <Button
              size="sm"
              onClick={handleOpenNewModal}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configurar Primeira Linha</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
          <table className="w-full text-xs text-left min-w-[1000px]">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Empresa / Linha</th>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3">Template Vinculado</th>
                <th className="py-2.5 px-3">Periodicidade / Geração</th>
                <th className="py-2.5 px-3">Próxima Geração</th>
                <th className="py-2.5 px-3">Responsáveis</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConfigs.map((cfg) => {
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
                        Empresa: {cfg.empresa_code} &bull; {cfg.tipo_resumo}
                      </div>
                      {cfg.finalidade && (
                        <div className="text-[10px] text-slate-600 line-clamp-1 italic">
                          {cfg.finalidade}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {cfg.centro_code || 'Geral (Todos)'}
                      </div>
                      {cfg.centro_nome && cfg.centro_nome !== cfg.centro_code && (
                        <div className="text-[10px] text-slate-500">{cfg.centro_nome}</div>
                      )}
                    </td>

                    <td className="py-3 px-3 space-y-0.5">
                      {linkedTpl || cfg.template_nome ? (
                        <div>
                          <div className="font-semibold text-blue-900 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-blue-600" />
                            <span>{linkedTpl?.nome || cfg.template_nome}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {linkedTpl?.template_code || cfg.template_code} &bull;{' '}
                            {linkedTpl?.versao_tag || 'V1.0'}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic text-[11px]">
                          Automático (Centro → Linha → Empresa → Geral)
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 space-y-0.5">
                      <div className="font-bold text-slate-800">
                        {PERIODICITY_LABELS[cfg.periodicidade] || cfg.periodicidade}
                      </div>
                      <div className="text-[10px] text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{cfg.parametros_personalizados?.horario || '08:00'}</span>
                        {cfg.geracao_automatica ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 text-[9px] py-0 px-1 border-emerald-300 font-bold ml-1"
                          >
                            Auto
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-600 text-[9px] py-0 px-1 border-slate-300 font-medium ml-1"
                          >
                            Manual
                          </Badge>
                        )}
                        {cfg.exigir_aprovacao && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 text-[9px] py-0 px-1 border-amber-300 font-medium"
                          >
                            Exige Aprov.
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                      <div>{formatDateTime(cfg.proxima_execucao)}</div>
                      {cfg.data_ultima_geracao && (
                        <div className="text-[9px] text-slate-400">
                          Última: {formatDateTime(cfg.data_ultima_geracao)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 space-y-0.5">
                      <div className="text-slate-800 font-medium flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{cfg.responsavel_geracao_nome || 'PCP Responsável'}</span>
                      </div>
                      {cfg.supervisor_pcp_nome && (
                        <div className="text-[10px] text-slate-500">
                          Sup: {cfg.supervisor_pcp_nome}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          cfg.status === 'ATIVO'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                            : cfg.status === 'SUSPENSO'
                              ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cfg.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(cfg)}
                              className={`h-7 w-7 p-0 ${
                                cfg.status === 'ATIVO'
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
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

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditModal(cfg)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                              title="Editar Configuração"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cfg)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Excluir Configuração"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
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

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CONFIGURAÇÃO POR LINHA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto text-xs">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-sm font-bold text-[#004C97] flex items-center gap-2">
              <Building className="w-4 h-4" />
              <span>
                {editingConfig ? 'Editar Configuração de Linha' : 'Nova Configuração por Linha'}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                1. Contexto Fabril & Linha Real
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Empresa (WERKS) *</Label>
                  <select
                    value={formEmpresa}
                    onChange={(e) => setFormEmpresa(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                    required
                  >
                    <option value="CIAFAL">CIAFAL (1000)</option>
                    <option value="SIDERCENTRO">SIDERCENTRO (2000)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Linha Produtiva (Real) *
                  </Label>
                  <select
                    value={formLinhaCode}
                    onChange={(e) => handleLineSelectionChange(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                    required
                  >
                    {realLines.map((l) => (
                      <option key={l.id} value={l.code}>
                        {l.code} — {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Centro / Work Center
                  </Label>
                  <Input
                    type="text"
                    value={formCentroCode}
                    onChange={(e) => setFormCentroCode(e.target.value)}
                    placeholder="Ex: SDPL, LAML2, WC-DIV-L1"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Tipo de Resumo *</Label>
                  <select
                    value={formTipoResumo}
                    onChange={(e) => setFormTipoResumo(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                    required
                  >
                    {SUMMARY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Template Vinculado (Opcional)
                  </Label>
                  <select
                    value={formTemplateId}
                    onChange={(e) => setFormTemplateId(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                  >
                    <option value="">Fallback Automático (Centro → Linha → Empresa → Geral)</option>
                    {templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.nome} ({tpl.template_code} - {tpl.versao_tag || 'V1.0'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Finalidade / Descrição da Parametrização
                </Label>
                <Input
                  type="text"
                  value={formFinalidade}
                  onChange={(e) => setFormFinalidade(e.target.value)}
                  placeholder="Ex: Relatório mensal de fechamento operacional de tubos para gerência fabril"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                2. Periodicidade & Regras de Disparo
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Periodicidade *</Label>
                  <select
                    value={formPeriodicidade}
                    onChange={(e) => setFormPeriodicidade(e.target.value as SummaryPeriodicity)}
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
                    Horário da Execução (HH:mm)
                  </Label>
                  <Input
                    type="time"
                    value={formHorario}
                    onChange={(e) => setFormHorario(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                {formPeriodicidade === 'mensal' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Dia do Mês</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={formDiaMes}
                      onChange={(e) => setFormDiaMes(parseInt(e.target.value, 10) || 1)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                )}

                {formPeriodicidade === 'personalizada' && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      Intervalo em Dias
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={formIntervaloDias}
                      onChange={(e) => setFormIntervaloDias(parseInt(e.target.value, 10) || 1)}
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">Geração Automática</Label>
                    <div className="text-[10px] text-slate-500">
                      Executado pelo cron persistente
                    </div>
                  </div>
                  <Switch checked={formGeracaoAuto} onCheckedChange={setFormGeracaoAuto} />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">Exigir Aprovação</Label>
                    <div className="text-[10px] text-slate-500">Trava status para revisão PCP</div>
                  </div>
                  <Switch checked={formExigirAprovacao} onCheckedChange={setFormExigirAprovacao} />
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-white border border-slate-200">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold text-slate-800">Envio Pós-Aprovação</Label>
                    <div className="text-[10px] text-slate-500">
                      Disparo aos destinatários autorizados
                    </div>
                  </div>
                  <Switch checked={formEnvioAuto} onCheckedChange={setFormEnvioAuto} />
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                3. Matriz de Responsáveis (HUB CIAFAL)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Responsável pela Geração / Elaboração *
                  </Label>
                  <select
                    value={formRespGeracaoId}
                    onChange={(e) => setFormRespGeracaoId(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                    required
                  >
                    <option value="">Selecione o usuário...</option>
                    {hubUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Programador PCP Titular
                  </Label>
                  <select
                    value={formProgPcpId}
                    onChange={(e) => setFormProgPcpId(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                  >
                    <option value="">Selecione o programador...</option>
                    {hubUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Programador PCP Substituto
                  </Label>
                  <select
                    value={formProgSubstitutoId}
                    onChange={(e) => setFormProgSubstitutoId(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                  >
                    <option value="">Nenhum substituto vinculado</option>
                    {hubUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Supervisor PCP</Label>
                  <select
                    value={formSupervisorId}
                    onChange={(e) => setFormSupervisorId(e.target.value)}
                    className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-medium"
                  >
                    <option value="">Nenhum supervisor vinculado</option>
                    {hubUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Observações Operacionais
              </Label>
              <Input
                type="text"
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                placeholder="Diretrizes específicas de auditoria, prazos de corte SAP..."
                className="h-8 text-xs bg-white"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSaving}
                className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Configuração</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
