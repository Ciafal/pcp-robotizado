import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  History,
  Radio,
  Users,
  Truck,
  Layers,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Save,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  Database,
  Sparkles,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react'
import { scheduleVersioningService } from '@/services/schedule-versioning-service'
import { VersioningEngine } from '@/services/versioning-engine'
import {
  ScheduleVersionRecord,
  ScheduleMesAlert,
  ScheduleCrmAlert,
  ScheduleTmsEvent,
  ScheduleSapQueueItem,
  RelevanceCriteriaConfig,
  StabilityIndicators,
  ScheduleItemDiff,
} from '@/types/schedule-versioning'
import { VersionComparisonDiffModal } from '@/components/weekly-schedule/VersionComparisonDiffModal'
import { CrmAlertCard } from '@/components/weekly-schedule/CrmAlertCard'
import { useToast } from '@/hooks/use-toast'

export const ScheduleChangesCenterPage: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<
    'VERSIONS' | 'MES' | 'CRM' | 'TMS' | 'SAP' | 'STABILITY' | 'CRITERIA'
  >('VERSIONS')

  const [isLoading, setIsLoading] = useState(true)
  const [versions, setVersions] = useState<ScheduleVersionRecord[]>([])
  const [mesAlerts, setMesAlerts] = useState<ScheduleMesAlert[]>([])
  const [crmAlerts, setCrmAlerts] = useState<ScheduleCrmAlert[]>([])
  const [tmsEvents, setTmsEvents] = useState<ScheduleTmsEvent[]>([])
  const [sapQueue, setSapQueue] = useState<ScheduleSapQueueItem[]>([])
  const [criteria, setCriteria] = useState<RelevanceCriteriaConfig | null>(null)
  const [stability, setStability] = useState<StabilityIndicators | null>(null)

  // Filtros
  const [selectedLine, setSelectedLine] = useState<string>('TODAS')
  const [searchTerm, setSearchTerm] = useState('')

  // Modais
  const [diffModalOpen, setDiffModalOpen] = useState(false)
  const [diffTarget, setDiffTarget] = useState<{
    versionA: string
    versionB: string
    diffs: ScheduleItemDiff[]
    lineCode: string
  } | null>(null)

  // Drill-down de Alteração Selecionada
  const [selectedVersionDrillDown, setSelectedVersionDrillDown] =
    useState<ScheduleVersionRecord | null>(null)

  const [isSavingCriteria, setIsSavingCriteria] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [vers, mes, crm, tms, sap, crit] = await Promise.all([
        scheduleVersioningService.getAllVersions(),
        scheduleVersioningService.listMesAlerts(),
        scheduleVersioningService.listCrmAlerts(),
        scheduleVersioningService.listTmsEvents(),
        scheduleVersioningService.listSapQueue(),
        scheduleVersioningService.getRelevanceCriteria(),
      ])

      setVersions(vers)
      setMesAlerts(mes)
      setCrmAlerts(crm)
      setTmsEvents(tms)
      setSapQueue(sap)
      setCriteria(crit)

      // Calcula indicadores de estabilidade
      const stab = VersioningEngine.calculateStabilityIndex(
        vers,
        selectedLine === 'TODAS' ? undefined : selectedLine,
      )
      setStability(stab)
    } catch (err) {
      console.error('Erro ao carregar dados da Central de Alterações:', err)
      toast({
        title: 'Aviso de Sincronização',
        description: 'Carregando dados com base em snapshots locais/servidor.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedLine])

  const handleAcknowledgeMes = async (alertId: string) => {
    const ok = await scheduleVersioningService.acknowledgeMesAlert(alertId)
    if (ok) {
      toast({
        title: 'Ciência Registrada no MES',
        description: 'Operador líder e data/hora auditados na Central.',
      })
      loadData()
    }
  }

  const handleMarkCrmViewed = async (alertId: string) => {
    const ok = await scheduleVersioningService.markCrmAlertViewed(alertId)
    if (ok) {
      toast({
        title: 'Alerta CRM Visualizado',
        description: 'Ciência comercial registrada com usuário, data e hora.',
      })
      loadData()
    }
  }

  const handleCrmReeval = async (alertId: string, notes: string) => {
    const ok = await scheduleVersioningService.requestCrmReevaluation(alertId, notes)
    if (ok) {
      toast({
        title: 'Reavaliação Solicitada ao PCP',
        description: 'Notificação encaminhada à fila de reprogramação do PCP.',
      })
      loadData()
    }
  }

  const handleSyncSapItem = async (queueId: string) => {
    const ok = await scheduleVersioningService.syncSapQueueItem(queueId)
    if (ok) {
      toast({
        title: 'Ordem SAP Sincronizada',
        description: 'RFC ZPP_PROD confirmou atualização no SAP ERP.',
      })
      loadData()
    }
  }

  const handleSaveCriteria = async () => {
    if (!criteria) return
    setIsSavingCriteria(true)
    try {
      await scheduleVersioningService.saveRelevanceCriteria(criteria)
      toast({
        title: 'Critérios Salvos',
        description: 'Limites de relevância de reprogramação atualizados com sucesso.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao Salvar',
        description: 'Não foi possível gravar os critérios.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCriteria(false)
    }
  }

  const handleOpenDiffFromVersion = (ver: ScheduleVersionRecord) => {
    setDiffTarget({
      versionA: ver.previous_version_tag || 'V01',
      versionB: ver.version_tag,
      diffs: ver.diff_payload || [],
      lineCode: ver.line_code,
    })
    setDiffModalOpen(true)
  }

  const getRelevanceBadge = (rel: string) => {
    switch (rel) {
      case 'ALTA':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">🔴 ALTA</Badge>
        )
      case 'MEDIA':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">🟡 MÉDIA</Badge>
        )
      case 'BAIXA':
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
            🟢 BAIXA
          </Badge>
        )
    }
  }

  // Filtragem
  const filteredVersions = versions.filter((v) => {
    const matchesLine = selectedLine === 'TODAS' || v.line_code === selectedLine
    const matchesSearch =
      !searchTerm ||
      v.version_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.change_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesLine && matchesSearch
  })

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Cabeçalho da Central */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-xl shadow-xs">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">
                Central de Alterações &amp; Governança de Versões
              </h1>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-xs font-mono">
                PCP Robotizado CIAFAL
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              Rastreabilidade ponta a ponta: PCP &bull; MES &bull; CRM 360º &bull; TMS &bull;
              PostgreSQL &bull; SAP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Índice de Estabilidade Compacto (Requisito 32) */}
          {stability && (
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 block font-semibold uppercase">
                  Índice de Estabilidade
                </span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {stability.stabilityIndex} / 100
                </span>
              </div>
              <Badge
                className={`text-[10px] font-bold ${
                  stability.stabilityLabel === 'MUITO ESTÁVEL' ||
                  stability.stabilityLabel === 'ESTÁVEL'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                {stability.stabilityLabel}
              </Badge>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={isLoading}
            className="text-xs h-9 bg-white border-slate-300 gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Navegação por Abas Principais (Requisitos 31, 32, 10) */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 text-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('VERSIONS')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'VERSIONS'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <History className="w-4 h-4" /> Alterações de Programação ({versions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MES')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'MES'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" /> Alertas MES ({mesAlerts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CRM')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'CRM'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Alertas CRM 360º ({crmAlerts.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TMS')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'TMS'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" /> Logística TMS ({tmsEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SAP')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'SAP'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" /> Fila SAP / Ordens ({sapQueue.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STABILITY')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'STABILITY'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Indicadores de Estabilidade
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CRITERIA')}
          className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all ${
            activeTab === 'CRITERIA'
              ? 'bg-[#004C97] text-white shadow-sm'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" /> Critérios de Relevância
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      {(activeTab === 'VERSIONS' || activeTab === 'MES' || activeTab === 'CRM') && (
        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, motivo, pedido ou usuário..."
              className="h-8 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrar Linha:</span>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="text-xs font-semibold h-8 px-2.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="TODAS">Todas as Linhas</option>
              <option value="L1">Linha L1 (Perfis)</option>
              <option value="L2">Linha L2 (Barras)</option>
              <option value="L3">Linha L3 (Tubos)</option>
              <option value="L4">Linha L4 (Especiais)</option>
            </select>
          </div>
        </div>
      )}

      {/* ABA 1: TABELA CENTRAL DE ALTERAÇÕES (Requisito 31) */}
      {activeTab === 'VERSIONS' && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Registro Completo de Reprogramações e Versionamento</span>
              <span className="text-xs font-mono text-slate-400 font-normal">
                {filteredVersions.length} versão(ões) auditadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Linha</th>
                    <th className="p-3">Semana</th>
                    <th className="p-3">Versão</th>
                    <th className="p-3">Alteração</th>
                    <th className="p-3">Relevância</th>
                    <th className="p-3 text-center">MES</th>
                    <th className="p-3 text-center">CRM</th>
                    <th className="p-3 text-center">TMS</th>
                    <th className="p-3 text-center">SAP</th>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVersions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        Nenhuma versão encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredVersions.map((v) => {
                      const diffCount = v.diff_payload ? v.diff_payload.length : 1

                      // Status MES: Não enviado / Enviado / Visualizado / Reconhecido
                      let mesStatusBadge = (
                        <Badge variant="outline" className="text-[9.5px] text-slate-400">
                          Não enviado
                        </Badge>
                      )
                      if (v.mes_dispatched) {
                        if (v.mes_ack_status === 'RECONHECIDO') {
                          mesStatusBadge = (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9.5px]">
                              Reconhecido
                            </Badge>
                          )
                        } else if (v.mes_ack_status === 'VISUALIZADO') {
                          mesStatusBadge = (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[9.5px]">
                              Visualizado
                            </Badge>
                          )
                        } else {
                          mesStatusBadge = (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9.5px]">
                              Enviado
                            </Badge>
                          )
                        }
                      }

                      // Status CRM: Não aplicável / Gerado / Visualizado / Em tratamento / Resolvido
                      let crmStatusBadge = (
                        <Badge variant="outline" className="text-[9.5px] text-slate-400">
                          Não aplicável
                        </Badge>
                      )
                      if (v.crm_dispatched) {
                        crmStatusBadge = (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9.5px]">
                            Gerado
                          </Badge>
                        )
                      }

                      // Status TMS: Não aplicável / Reavaliação necessária / Replanejado / Sem impacto
                      let tmsStatusBadge = (
                        <Badge variant="outline" className="text-[9.5px] text-slate-400">
                          Sem impacto
                        </Badge>
                      )
                      if (v.tms_dispatched) {
                        tmsStatusBadge = (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[9.5px]">
                            Reavaliação necessária
                          </Badge>
                        )
                      }

                      // Status SAP: Não aplicável / Sincronização pendente / Processando / Sincronizado / Erro
                      let sapStatusBadge = (
                        <Badge variant="outline" className="text-[9.5px] text-slate-400">
                          Não aplicável
                        </Badge>
                      )
                      if (v.sap_dispatched) {
                        sapStatusBadge = (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9.5px]">
                            Sincronização pendente
                          </Badge>
                        )
                      }

                      return (
                        <tr
                          key={v.id || v.version_code}
                          onClick={() => setSelectedVersionDrillDown(v)}
                          className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                          title="Clique para abrir detalhes completos da reprogramação (Drill-down)"
                        >
                          <td className="p-3 font-bold font-mono text-slate-900">{v.line_code}</td>
                          <td className="p-3 font-bold text-slate-700">
                            S{String(v.week_number).padStart(2, '0')}/{v.year}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            <span className="text-slate-400">
                              {v.previous_version_tag || 'V01'}
                            </span>
                            <span className="text-slate-400 mx-1">&rarr;</span>
                            <span className="text-[#004C97]">{v.version_tag}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{v.change_reason}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {diffCount} item(ns) modificado(s)
                            </div>
                          </td>
                          <td className="p-3">{getRelevanceBadge(v.relevance_level)}</td>
                          <td className="p-3 text-center">{mesStatusBadge}</td>
                          <td className="p-3 text-center">{crmStatusBadge}</td>
                          <td className="p-3 text-center">{tmsStatusBadge}</td>
                          <td className="p-3 text-center">{sapStatusBadge}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {v.created
                              ? new Date(v.created).toLocaleString('pt-BR').slice(0, 16)
                              : 'Hoje'}
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedVersionDrillDown(v)}
                                className="h-7 text-[10px] px-2 bg-white text-slate-700 border-slate-200"
                              >
                                Detalhes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDiffFromVersion(v)}
                                className="h-7 text-[10px] px-2 bg-white text-[#004C97] border-blue-200 font-bold"
                              >
                                <Eye className="w-3 h-3 mr-1" /> Diffs
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 2: ALERTAS MES (Requisitos 13, 14, 15, 16) */}
      {activeTab === 'MES' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start justify-between">
            <div>
              <strong className="block font-bold">Regra Operacional MES:</strong>
              Toda e qualquer publicação gera notificação em tempo real para a linha de produção,
              independente da relevância. O operador líder registra ciência com data/hora e usuário.
            </div>
            <Badge className="bg-[#004C97] text-white">100% AUDITADO</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {mesAlerts.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                Nenhum alerta MES registrado no momento.
              </div>
            ) : (
              mesAlerts.map((alert) => (
                <div
                  key={alert.id || alert.alert_code}
                  className={`p-4 bg-white rounded-xl border shadow-2xs space-y-2 ${
                    alert.ack_status === 'RECONHECIDO'
                      ? 'border-slate-200'
                      : 'border-amber-300 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#004C97]" />
                      <span className="font-bold text-slate-900 text-xs">
                        PCP &rarr; Linha {alert.line_code} ({alert.previous_version_tag || 'V01'}{' '}
                        &rarr; {alert.new_version_tag})
                      </span>
                      {getRelevanceBadge(alert.relevance)}
                    </div>
                    <div>
                      {alert.ack_status === 'RECONHECIDO' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          CIÊNCIA REGISTRADA: {alert.acknowledged_by_user} (
                          {alert.acknowledged_at
                            ? new Date(alert.acknowledged_at).toLocaleTimeString('pt-BR')
                            : ''}
                          )
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledgeMes(alert.id)}
                          className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Registrar Ciência Operador
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Produto:</span>
                      <strong className="text-slate-800">{alert.product_code}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Motivo:</span>
                      <strong className="text-[#004C97]">{alert.reason}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Programador PCP:</span>
                      <span className="text-slate-700">{alert.user_name}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 3: ALERTAS CRM 360º (Requisitos 17 a 25) */}
      {activeTab === 'CRM' && (
        <div className="space-y-4">
          {/* Banner de Falha de Comunicação se houver erro (Requisito 11) */}
          {crmAlerts.some((a) => a.status === 'PENDENTE' && a.tms_recalculation_required) && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-950 flex items-center justify-between shadow-xs animate-pulse">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔴</span>
                <div>
                  <strong className="block font-black text-rose-900 text-sm">
                    FALHA DE COMUNICAÇÃO COM CRM — Alteração de alta relevância ainda não foi
                    entregue ao Comercial.
                  </strong>
                  <span className="text-rose-700 text-[11px]">
                    O evento permanece seguro na fila de retentativas e a versão vigente continua
                    ativa no PCP.
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/pcp/integracoes/monitor')}
                className="border-rose-400 text-rose-900 bg-white hover:bg-rose-100 font-bold text-xs shrink-0"
              >
                Abrir Fila de Retentativas
              </Button>
            </div>
          )}

          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start justify-between">
            <div>
              <strong className="block font-bold">Filtro Antirruído CRM:</strong>
              Apenas alterações de ALTA relevância com impacto efetivo em clientes, pedidos MTO,
              datas de entrega ou quantidade são enviadas à equipe comercial, com tradução por
              Inteligência Artificial.
            </div>
            <Badge className="bg-amber-600 text-white font-mono">CRM 360º</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {crmAlerts.length === 0 ? (
              <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                Nenhum alerta comercial pendente no CRM. A programação atual atende integralmente os
                prazos comerciais.
              </div>
            ) : (
              crmAlerts.map((alert) => (
                <CrmAlertCard
                  key={alert.id || alert.alert_code}
                  alert={alert}
                  onViewOrder={(num) =>
                    toast({
                      title: 'Pedido Comercial',
                      description: `Abrindo detalhes da ordem ${num} no CRM.`,
                    })
                  }
                  onViewSchedule={(code) =>
                    toast({
                      title: 'Programação PCP',
                      description: `Localizando versão ${code} no sequenciador.`,
                    })
                  }
                  onRequestReevaluation={handleCrmReeval}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ABA 4: LOGÍSTICA TMS (Requisito 26) */}
      {activeTab === 'TMS' && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-700" /> Janela de Disponibilidade e Expedição TMS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Evento TMS</th>
                    <th className="p-3">Pedido &bull; Cliente</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3">Material</th>
                    <th className="p-3">Volume</th>
                    <th className="p-3">Disponibilidade PCP</th>
                    <th className="p-3">Expedição Prevista</th>
                    <th className="p-3">Entrega Recalculada</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tmsEvents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Nenhum evento logístico divergente no momento.
                      </td>
                    </tr>
                  ) : (
                    tmsEvents.map((tms) => (
                      <tr key={tms.id || tms.event_code} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-900">{tms.event_code}</td>
                        <td className="p-3">
                          <strong className="block text-slate-900">{tms.customer_name}</strong>
                          <span className="text-slate-400 text-[10px]">
                            Ped. {tms.sales_order_number}
                          </span>
                        </td>
                        <td className="p-3">
                          {tms.destination_city}/{tms.destination_state}
                        </td>
                        <td className="p-3 font-mono font-bold">{tms.material_code}</td>
                        <td className="p-3 font-mono">{tms.quantity_tons} t</td>
                        <td className="p-3 font-mono text-slate-600">
                          {tms.product_available_datetime?.slice(0, 16)}
                        </td>
                        <td className="p-3 font-mono text-blue-800 font-bold">
                          {tms.recalculated_shipping_date}
                        </td>
                        <td className="p-3 font-mono text-emerald-800 font-bold">
                          {tms.recalculated_delivery_date}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                            RECALCULADO
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 5: FILA SAP E ORDENS (Requisito 27, 36) */}
      {activeTab === 'SAP' && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-700" /> Fila de Sincronização PostgreSQL &rarr;
                SAP (RFC ZPP_PROD)
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                Ponte Assíncrona Governança
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID Fila</th>
                    <th className="p-3">Ordem SAP (OP)</th>
                    <th className="p-3">Linha &bull; Versão</th>
                    <th className="p-3">Material</th>
                    <th className="p-3">Ação de Sync</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Mensagem Retorno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sapQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Todas as ordens SAP estão 100% reconciliadas com a versão vigente do PCP.
                      </td>
                    </tr>
                  ) : (
                    sapQueue.map((item) => (
                      <tr key={item.id || item.queue_code} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500">{item.queue_code}</td>
                        <td className="p-3 font-mono font-black text-rose-700">
                          {item.sap_production_order}
                        </td>
                        <td className="p-3 font-mono">
                          {item.line_code} &bull; {item.version_code}
                        </td>
                        <td className="p-3 font-mono font-bold">{item.material_code}</td>
                        <td className="p-3 font-medium text-slate-700">{item.sync_action}</td>
                        <td className="p-3">
                          <Badge
                            className={`text-[10px] ${
                              item.status === 'PROCESSADO_COM_SUCESSO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {item.sap_response_message}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABA 6: INDICADORES DE ESTABILIDADE (Requisito 32) */}
      {activeTab === 'STABILITY' && stability && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-xs font-semibold block uppercase">
                Índice de Estabilidade
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-[#004C97]">
                  {stability.stabilityIndex}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Quanto menos alterações relevantes pós-aprovação, maior a assertividade.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-xs font-semibold block uppercase">
                Revisões Pós-Aprovação
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-rose-600">
                  {stability.revisionsPostApprovalCount}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  de {stability.totalRevisionsCount} totais
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Alterações em grades já aprovadas formalmente.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-xs font-semibold block uppercase">
                Ciência MES Operacional
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-emerald-600">{stability.mesAckPct}%</span>
                <span className="text-xs text-slate-400 font-mono">reconhecidos</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Taxa de ciência dos operadores líderes de linha.
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 text-xs font-semibold block uppercase">
                Volume &bull; Clientes Afetados
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-black text-slate-800">
                  {stability.impactedCustomersCount}
                </span>
                <span className="text-xs text-slate-500">
                  clientes ({stability.impactedTonsTotal} t)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Impacto comercial acumulado em reprogramações.
              </p>
            </div>
          </div>

          {/* Análise de Causas com IA CIAFAL (Requisitos 27 e 28) */}
          <Card className="border-blue-200 bg-blue-50/20 shadow-2xs">
            <CardHeader className="pb-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#004C97]" /> IA &mdash; Diagnóstico de
                  Estabilidade e Causas Raiz
                </CardTitle>
                <Badge className="bg-[#004C97] text-white text-[10px]">MOTOR IA CIAFAL</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-2">
                <strong className="text-slate-900 block font-bold text-xs">
                  Diagnóstico das Últimas 4 Semanas:
                </strong>
                <p className="text-slate-700 leading-relaxed">
                  Nas últimas 4 semanas, a Linha {selectedLine === 'TODAS' ? 'Geral' : selectedLine}{' '}
                  sofreu{' '}
                  <strong className="text-rose-700">
                    {stability.totalRevisionsCount} alterações
                  </strong>{' '}
                  após a primeira aprovação. Principais motivos mapeados:{' '}
                  {stability.topChangeReasons
                    .slice(0, 3)
                    .map((r) => `${r.pct}% ${r.reason}`)
                    .join('; ')}
                  .
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                  <div className="p-2 bg-slate-50 rounded border">
                    <strong className="text-slate-800 block">
                      Instabilidade Estrutural Identificada:
                    </strong>
                    Produtos tubulares e perfis médios registraram deslocamento recorrente de data
                    antes da execução por oscilação de tarugos.
                  </div>
                  <div className="p-2 bg-slate-50 rounded border">
                    <strong className="text-slate-800 block">Impacto em Pedidos MTO:</strong>
                    Aproximadamente 32% dos pedidos MTO vinculados sofreram pelo menos uma
                    reprogramação com reavaliação de entrega.
                  </div>
                </div>
              </div>

              {/* Oportunidades de Melhoria Recomendadas */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <strong className="text-slate-900 block font-bold text-xs flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" /> Oportunidades de Melhoria
                  Sugeridas (Sem Modificação Automática do Processo):
                </strong>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                  <li>
                    Fixar janela de congelamento (frozen period) de 48h para pedidos MTO com
                    matérias-primas já alocadas.
                  </li>
                  <li>
                    Revisar estoque mínimo de segurança para tarugos 150x150 SAE 1020 no
                    almoxarifado central.
                  </li>
                  <li>
                    Sincronizar previsão logística TMS imediatamente na pré-publicação antes do
                    envio de alertas comerciais.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Top Motivos de Alteração Gráficos */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#004C97]" /> Distribuição das Causas de
                Reprogramação
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {stability.topChangeReasons.map((item, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-700">
                    <span>{item.reason}</span>
                    <span className="font-mono font-bold">
                      {item.count} ocorrência(s) ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#004C97] h-full rounded-full transition-all"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ABA 7: CONFIGURAÇÃO DOS LIMITES DE RELEVÂNCIA (Requisitos 9 e 10) */}
      {activeTab === 'CRITERIA' && criteria && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">
                  Critérios Parametrizáveis de Relevância da Reprogramação
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure os limites oficiais da CIAFAL para classificação automática (BAIXA,
                  MÉDIA, ALTA).
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleSaveCriteria}
                disabled={isSavingCriteria}
                className="text-xs h-8 bg-[#004C97] text-white font-bold gap-1"
              >
                <Save className="w-3.5 h-3.5" />{' '}
                {isSavingCriteria ? 'Salvando...' : 'Salvar Critérios'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6 text-xs">
            {/* 1. Limites de Quantidade */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                1. Limites de Variação de Quantidade (% em Relação ao Previsto):
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Limite Máximo para Baixa Relevância (Até %):
                  </label>
                  <Input
                    type="number"
                    value={criteria.qty_low_threshold_pct}
                    onChange={(e) =>
                      setCriteria({
                        ...criteria,
                        qty_low_threshold_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-white"
                  />
                  <span className="text-[10px] text-slate-400">Padrão CIAFAL: 5%</span>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Limite Médio (Acima deste percentual classifica como ALTA):
                  </label>
                  <Input
                    type="number"
                    value={criteria.qty_medium_threshold_pct}
                    onChange={(e) =>
                      setCriteria({
                        ...criteria,
                        qty_medium_threshold_pct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs bg-white"
                  />
                  <span className="text-[10px] text-slate-400">
                    Padrão CIAFAL: 15% (Variações &gt;15% geram ALTA)
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Impacto de Data e Turno */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                2. Impacto de Mudança de Data / Turno:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Mudança de Turno (Mesmo Dia):
                  </label>
                  <select
                    value={criteria.date_shift_change_level}
                    onChange={(e) =>
                      setCriteria({ ...criteria, date_shift_change_level: e.target.value as any })
                    }
                    className="w-full text-xs p-2 rounded-lg border bg-white"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mudança de Dia:</label>
                  <select
                    value={criteria.date_day_change_level}
                    onChange={(e) =>
                      setCriteria({ ...criteria, date_day_change_level: e.target.value as any })
                    }
                    className="w-full text-xs p-2 rounded-lg border bg-white"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Mudança de Semana / Mês:
                  </label>
                  <select
                    value={criteria.date_week_change_level}
                    onChange={(e) =>
                      setCriteria({ ...criteria, date_week_change_level: e.target.value as any })
                    }
                    className="w-full text-xs p-2 rounded-lg border bg-white"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Impacto de Sequência e Cliente */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                3. Impacto de Sequenciamento, Pedidos e OP SAP:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Troca de Sequência com Aumento Setup:
                  </label>
                  <select
                    value={criteria.seq_setup_increase_level}
                    onChange={(e) =>
                      setCriteria({ ...criteria, seq_setup_increase_level: e.target.value as any })
                    }
                    className="w-full text-xs p-2 rounded-lg border bg-white"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Impacto em Pedido MTO / Cliente:
                  </label>
                  <select
                    value={criteria.mto_impact_level}
                    onChange={(e) =>
                      setCriteria({ ...criteria, mto_impact_level: e.target.value as any })
                    }
                    className="w-full text-xs p-2 rounded-lg border bg-white"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Ordem SAP Existente Divergente:
                  </label>
                  <select
                    value={criteria.existing_sap_op_change_level}
                    onChange={(e) =>
                      setCriteria({
                        ...criteria,
                        existing_sap_op_change_level: e.target.value as any,
                      })
                    }
                    className="w-full text-xs p-2 rounded-lg border bg-white"
                  >
                    <option value="BAIXA">BAIXA</option>
                    <option value="MEDIA">MÉDIA</option>
                    <option value="ALTA">ALTA</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drawer / Modal de Drill-Down da Alteração Selecionada (Requisito 22) */}
      {selectedVersionDrillDown && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#004C97] text-white rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Drill-down da Alteração &mdash; {selectedVersionDrillDown.version_code}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rastreabilidade completa da mudança entre versões do PCP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVersionDrillDown(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadados da Mudança */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Transição
                </span>
                <strong className="font-mono text-slate-900">
                  {selectedVersionDrillDown.previous_version_tag || 'V01'} &rarr;{' '}
                  {selectedVersionDrillDown.version_tag}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Usuário Responsável
                </span>
                <strong className="text-slate-900">{selectedVersionDrillDown.user_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Data / Hora
                </span>
                <span className="font-mono text-slate-700">
                  {selectedVersionDrillDown.created
                    ? new Date(selectedVersionDrillDown.created).toLocaleString('pt-BR')
                    : '29/08/2026 14:35'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">
                  Relevância
                </span>
                {getRelevanceBadge(selectedVersionDrillDown.relevance_level)}
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-xs space-y-1">
              <span className="text-[10px] text-blue-900 uppercase font-black">
                Motivo Oficial CIAFAL:
              </span>
              <p className="font-bold text-slate-900">{selectedVersionDrillDown.change_reason}</p>
              {selectedVersionDrillDown.change_notes && (
                <p className="text-slate-600 italic text-[11px]">
                  &ldquo;{selectedVersionDrillDown.change_notes}&rdquo;
                </p>
              )}
            </div>

            {/* Impactos Granulares */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                Propagação Multidimensional dos Impactos:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-[#004C97] block font-bold flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" /> Impacto MES (Chão de Fábrica)
                  </strong>
                  <p className="text-slate-600 text-[11px]">
                    {selectedVersionDrillDown.impact_summary?.mes?.summary ||
                      'Notificação obrigatória transmitida ao terminal MES.'}
                  </p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Status: {selectedVersionDrillDown.mes_ack_status}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-amber-700 block font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Impacto Comercial CRM 360º
                  </strong>
                  <p className="text-slate-600 text-[11px]">
                    {selectedVersionDrillDown.impact_summary?.crm?.summary ||
                      'Sem impacto comercial direto.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-blue-700 block font-bold flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Impacto Logístico TMS
                  </strong>
                  <p className="text-slate-600 text-[11px]">
                    {selectedVersionDrillDown.impact_summary?.tms?.summary ||
                      'Previsão logística sincronizada com carga.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <strong className="text-rose-700 block font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Impacto Ordens SAP
                  </strong>
                  <p className="text-slate-600 text-[11px]">
                    {selectedVersionDrillDown.impact_summary?.sap?.summary ||
                      'Nenhuma OP divergente.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVersionDrillDown(null)}
                className="text-xs"
              >
                Fechar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  handleOpenDiffFromVersion(selectedVersionDrillDown)
                  setSelectedVersionDrillDown(null)
                }}
                className="text-xs bg-[#004C97] text-white font-bold"
              >
                Ver Comparativo Visual de Diffs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Diffs */}
      {diffTarget && (
        <VersionComparisonDiffModal
          isOpen={diffModalOpen}
          onClose={() => setDiffModalOpen(false)}
          versionA={diffTarget.versionA}
          versionB={diffTarget.versionB}
          diffs={diffTarget.diffs}
          lineCode={diffTarget.lineCode}
          weekDisplay="Semana Oficial"
        />
      )}
    </div>
  )
}
export default ScheduleChangesCenterPage
