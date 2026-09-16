import React, { useState, useEffect } from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileText,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  CalendarDays,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import {
  PCPMeetingRecord,
  PCPMeetingBriefingRecord,
  PCPMeetingAgendaItemRecord,
  PCPMeetingAtaRecord,
  AtaStructuredContent,
  BriefingItem,
  PriorityTopic,
} from '@/types/pcp-meeting'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface PreparacaoReuniaoViewProps {
  meetingId?: string
  onMeetingUpdated?: () => void
}

export const PreparacaoReuniaoView: React.FC<PreparacaoReuniaoViewProps> = ({
  meetingId: initialMeetingId,
  onMeetingUpdated,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<PCPMeetingRecord[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>(initialMeetingId || '')
  const [currentMeeting, setCurrentMeeting] = useState<PCPMeetingRecord | null>(null)

  // Estados dos 4 pilares
  const [briefing, setBriefing] = useState<PCPMeetingBriefingRecord | null>(null)
  const [agendaItems, setAgendaItems] = useState<PCPMeetingAgendaItemRecord[]>([])
  const [previaAta, setPreviaAta] = useState<PCPMeetingAtaRecord | null>(null)

  // Loading states
  const [loadingMeeting, setLoadingMeeting] = useState(false)
  const [generatingBriefing, setGeneratingBriefing] = useState(false)
  const [generatingAgenda, setGeneratingAgenda] = useState(false)
  const [generatingPrevia, setGeneratingPrevia] = useState(false)
  const [validatingPrevia, setValidatingPrevia] = useState(false)
  const [sendingPrevia, setSendingPrevia] = useState(false)
  const [confirmingSchedule, setConfirmingSchedule] = useState(false)

  // Modal para inclusão de item na pauta
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [newItemSubject, setNewItemSubject] = useState('')
  const [newItemArea, setNewItemArea] = useState('PCP')
  const [newItemReason, setNewItemReason] = useState('')
  const [newItemPriority, setNewItemPriority] = useState<
    'CRITICO' | 'ALTO' | 'MEDIO' | 'INFORMATIVO'
  >('MEDIO')
  const [newItemTime, setNewItemTime] = useState(10)
  const [newItemPresenter, setNewItemPresenter] = useState('')
  const [newItemDecision, setNewItemDecision] = useState(false)

  // Modal de confirmação de envio da prévia
  const [isSendPreviaOpen, setIsSendPreviaOpen] = useState(false)
  const [destinatariosInput, setDestinatariosInput] = useState(
    'grupo.pcp@ciafal.com.br, lideres.producao@ciafal.com.br, sgq@ciafal.com.br',
  )

  // Controle de colapso de seções da prévia
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Carregar lista de reuniões para o seletor
  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const list = await pcpMeetingFatia1Service.listMeetings()
        setMeetings(list)
        if (!selectedMeetingId && list.length > 0) {
          // Seleciona a mais recente por padrão
          setSelectedMeetingId(list[0].id)
        }
      } catch (err: any) {
        toast({
          title: 'Erro ao carregar reuniões',
          description: err.message,
          variant: 'destructive',
        })
      }
    }
    fetchMeetings()
  }, [])

  // Carregar dados da reunião selecionada
  const loadMeetingData = async (id: string) => {
    if (!id) return
    try {
      setLoadingMeeting(true)
      const m = await pcpMeetingFatia1Service.getMeetingById(id)
      setCurrentMeeting(m)

      const [brf, agd, ata] = await Promise.all([
        pcpMeetingFatia1Service.getBriefing(id),
        pcpMeetingFatia1Service.listAgendaItems(id),
        pcpMeetingFatia1Service.getPreviaAta(id),
      ])

      setBriefing(brf)
      setAgendaItems(agd)
      setPreviaAta(ata)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar detalhes da preparação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoadingMeeting(false)
    }
  }

  useEffect(() => {
    if (selectedMeetingId) {
      loadMeetingData(selectedMeetingId)
    }
  }, [selectedMeetingId])

  const userContext = {
    id: user?.id,
    name: user?.name || 'Coordenação PCP',
  }

  // 1. ORGANIZAR REUNIÃO PCP COM IA (Briefing Executivo)
  const handleGenerateBriefing = async () => {
    if (!currentMeeting) return
    try {
      setGeneratingBriefing(true)
      const brf = await pcpMeetingFatia1Service.generateExecutiveBriefing(
        currentMeeting.id,
        userContext,
      )
      setBriefing(brf)
      // Atualiza reunião local
      const updatedM = await pcpMeetingFatia1Service.getMeetingById(currentMeeting.id)
      setCurrentMeeting(updatedM)
      if (onMeetingUpdated) onMeetingUpdated()

      toast({
        title: 'Briefing Executivo Gerado com Sucesso!',
        description: `${brf.briefing_items.length} apontamentos consolidados a partir dos dados reais do PCP Robotizado.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar briefing executivo',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingBriefing(false)
    }
  }

  // 2. GERAR PAUTA SUGERIDA
  const handleGenerateAgenda = async () => {
    if (!currentMeeting) return
    try {
      setGeneratingAgenda(true)
      const items = await pcpMeetingFatia1Service.generateSuggestedAgenda(
        currentMeeting.id,
        userContext,
      )
      setAgendaItems(items)
      const updatedM = await pcpMeetingFatia1Service.getMeetingById(currentMeeting.id)
      setCurrentMeeting(updatedM)
      if (onMeetingUpdated) onMeetingUpdated()

      toast({
        title: 'Pauta Sugerida Criada!',
        description: `${items.length} itens persistidos e ordenados combinando pendências e assuntos do briefing.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar pauta',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingAgenda(false)
    }
  }

  // Adicionar item manual na pauta
  const handleAddAgendaItem = async () => {
    if (!currentMeeting || !newItemSubject.trim()) return
    try {
      const maxOrder = agendaItems.reduce((max, it) => Math.max(max, it.order || 0), 0)
      const created = await pcpMeetingFatia1Service.addAgendaItem(
        {
          meeting_id: currentMeeting.id,
          subject: newItemSubject.trim(),
          area: newItemArea,
          reason: newItemReason.trim(),
          priority: newItemPriority,
          estimated_time_min: Number(newItemTime) || 10,
          presenter: newItemPresenter.trim() || 'A Definir',
          decision_needed: newItemDecision,
          order: maxOrder + 1,
        },
        userContext,
      )
      setAgendaItems((prev) => [...prev, created])
      setIsAddItemOpen(false)
      setNewItemSubject('')
      setNewItemReason('')
      toast({ title: 'Item incluído na pauta com sucesso!' })
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar item na pauta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Reordenar pauta
  const handleMoveAgendaItem = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!currentMeeting) return
    const targetIndex = direction === 'UP' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= agendaItems.length) return

    const newItems = [...agendaItems]
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp

    // Persistir nova ordem
    const orderedIds = newItems.map((it) => it.id!)
    try {
      const saved = await pcpMeetingFatia1Service.reorderAgendaItems(
        currentMeeting.id,
        orderedIds,
        userContext,
      )
      setAgendaItems(saved)
    } catch (err: any) {
      toast({
        title: 'Erro ao reordenar pauta',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Deletar item da pauta
  const handleDeleteAgendaItem = async (itemId: string) => {
    if (!currentMeeting) return
    try {
      await pcpMeetingFatia1Service.deleteAgendaItem(itemId, currentMeeting.id, userContext)
      setAgendaItems((prev) => prev.filter((it) => it.id !== itemId))
      toast({ title: 'Item removido da pauta.' })
    } catch (err: any) {
      toast({
        title: 'Erro ao remover item',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // 3. GERAR PRÉVIA DA ATA COM IA (Template SGQ)
  const handleGeneratePrevia = async () => {
    if (!currentMeeting) return
    try {
      setGeneratingPrevia(true)
      const ata = await pcpMeetingFatia1Service.generatePreviaAta(currentMeeting.id, userContext)
      setPreviaAta(ata)
      const updatedM = await pcpMeetingFatia1Service.getMeetingById(currentMeeting.id)
      setCurrentMeeting(updatedM)
      if (onMeetingUpdated) onMeetingUpdated()

      toast({
        title: 'Prévia da ATA SGQ Gerada!',
        description: `Minuta baseada no modelo 8.1.001-R002 gerada com ${ata.overall_completeness}% de completude.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar prévia da ATA',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingPrevia(false)
    }
  }

  // 4. VALIDAR PRÉVIA DA ATA
  const handleValidatePrevia = async () => {
    if (!currentMeeting) return
    try {
      setValidatingPrevia(true)
      const updatedM = await pcpMeetingFatia1Service.validatePreviaAta(
        currentMeeting.id,
        userContext,
      )
      setCurrentMeeting(updatedM)
      if (onMeetingUpdated) onMeetingUpdated()

      toast({
        title: 'Prévia Validada com Sucesso!',
        description: 'A prévia da ATA está aprovada tecnicamente e pronta para envio ao Grupo PCP.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao validar prévia',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setValidatingPrevia(false)
    }
  }

  // 5. ENVIAR PRÉVIA AO GRUPO PCP
  const handleSendPrevia = async () => {
    if (!currentMeeting) return
    try {
      setSendingPrevia(true)
      const destList = destinatariosInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)

      const res = await pcpMeetingFatia1Service.sendPreviaToGrupoPCP(
        currentMeeting.id,
        destList,
        userContext,
      )
      setCurrentMeeting(res.meeting)
      setIsSendPreviaOpen(false)
      if (onMeetingUpdated) onMeetingUpdated()

      toast({
        title: 'Prévia Enviada ao Grupo PCP!',
        description: `Envio registrado no banco para ${destList.length} destinatários. Canal registrado honestamente: ${res.envioInfo.canal}. Trava de agendamento liberada!`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar envio da prévia',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSendingPrevia(false)
    }
  }

  // 6. CONFIRMAR AGENDAMENTO (COM TRAVA DE SEGURANÇA SGQ)
  const handleConfirmSchedule = async () => {
    if (!currentMeeting) return
    const check = pcpMeetingFatia1Service.canConfirmSchedule(currentMeeting)
    if (!check.allowed) {
      toast({
        title: 'Ação Bloqueada por Regra SGQ',
        description: check.reason,
        variant: 'destructive',
      })
      return
    }

    try {
      setConfirmingSchedule(true)
      const res = await pcpMeetingFatia1Service.confirmMeetingSchedule(
        currentMeeting.id,
        userContext,
      )
      setCurrentMeeting(res.meeting)
      if (onMeetingUpdated) onMeetingUpdated()

      toast({
        title: 'Agendamento Confirmado com Sucesso!',
        description: `Reunião ${res.meeting.meeting_code} agendada oficialmente. Status Agenda Corporativa: ${res.agendaCorporativaStatus}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao confirmar agendamento',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setConfirmingSchedule(false)
    }
  }

  const toggleSection = (secId: string) => {
    setExpandedSections((prev) => ({ ...prev, [secId]: !prev[secId] }))
  }

  // Verificação da Trava do Agendamento
  const scheduleAllowed = currentMeeting
    ? pcpMeetingFatia1Service.canConfirmSchedule(currentMeeting).allowed
    : false

  return (
    <div className="space-y-6">
      {/* Seletor de Reunião e Status do Fluxo */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[#004C97] tracking-wider uppercase">
              Fluxo Completo de Preparação SGQ
            </span>
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Selecionar Reunião:</label>
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-800"
              >
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.meeting_code} &bull; S{m.week}/{m.year} &bull; {m.title} ({m.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentMeeting && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-[#004C97] text-white font-mono text-xs">
                {currentMeeting.meeting_code}
              </Badge>
              <Badge variant="outline" className="text-xs font-bold">
                STATUS: {currentMeeting.status}
              </Badge>
              <Badge
                variant="outline"
                className={`text-xs ${
                  currentMeeting.previa_enviada
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                {currentMeeting.previa_enviada ? 'Prévia Enviada' : 'Prévia Não Enviada'}
              </Badge>
            </div>
          )}
        </div>

        {/* Linha do Tempo Visual do Fluxo */}
        {currentMeeting && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-[11px]">
            <div
              className={`p-2 rounded border text-center font-bold ${
                currentMeeting.briefing_gerado
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              1. Briefing IA
            </div>
            <div
              className={`p-2 rounded border text-center font-bold ${
                currentMeeting.pauta_gerada
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              2. Pauta Sugerida
            </div>
            <div
              className={`p-2 rounded border text-center font-bold ${
                currentMeeting.previa_gerada
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              3. Prévia da ATA
            </div>
            <div
              className={`p-2 rounded border text-center font-bold ${
                currentMeeting.status === 'PREVIA_VALIDADA' ||
                currentMeeting.status === 'PREVIA_ENVIADA' ||
                currentMeeting.agendamento_confirmado
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              4. Validação Prévia
            </div>
            <div
              className={`p-2 rounded border text-center font-bold ${
                currentMeeting.previa_enviada
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
            >
              5. Envio Grupo PCP
            </div>
            <div
              className={`p-2 rounded border text-center font-bold ${
                currentMeeting.agendamento_confirmado
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              6. Agendamento
            </div>
          </div>
        )}
      </div>

      {currentMeeting ? (
        <div className="space-y-6">
          {/* =========================================================================
              QUADRO 1: BRIEFING EXECUTIVO COM IA (Dados Reais)
          ========================================================================== */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#004C97]" /> 1. Briefing Executivo com IA
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Compara Semana Anterior &times; Atual &times; Próxima &times; Futuras usando os
                  dados REAIS das carteiras, cobertura temporal, MTO, testes e montagem semanal.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleGenerateBriefing}
                disabled={generatingBriefing}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5 shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${generatingBriefing ? 'animate-spin' : ''}`} />
                {briefing ? 'Reexecutar Briefing com IA' : 'ORGANIZAR REUNIÃO PCP COM IA'}
              </Button>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {briefing ? (
                <>
                  {/* Resumo de Contadores */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-600">
                      Itens gerados em: {new Date(briefing.generated_at).toLocaleString('pt-BR')}{' '}
                      por <strong>{briefing.generated_by}</strong>
                    </span>
                    <Badge variant="outline" className="text-rose-700 border-rose-300 font-bold">
                      {briefing.critical_items_count} Itens Críticos
                    </Badge>
                    {briefing.missing_info_count > 0 && (
                      <Badge
                        variant="outline"
                        className="text-amber-700 border-amber-300 font-semibold"
                      >
                        {briefing.missing_info_count} Informações Faltantes
                      </Badge>
                    )}
                  </div>

                  {/* Tabela de Assuntos Prioritários */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Quadro de Assuntos Prioritários para a Reunião
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-md">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] uppercase border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Prioridade</th>
                            <th className="p-2.5">Área</th>
                            <th className="p-2.5">Assunto</th>
                            <th className="p-2.5">Origem dos Dados</th>
                            <th className="p-2.5">Impacto / Risco</th>
                            <th className="p-2.5">Situação</th>
                            <th className="p-2.5 text-center">Decisão Necessária?</th>
                            <th className="p-2.5">Responsável</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {briefing.priority_topics.map((topic) => (
                            <tr key={topic.id} className="hover:bg-slate-50/70">
                              <td className="p-2.5">
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    topic.prioridade === 'CRITICO'
                                      ? 'bg-rose-600 text-white'
                                      : topic.prioridade === 'ALTO'
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-slate-600 text-white'
                                  }`}
                                >
                                  {topic.prioridade}
                                </Badge>
                              </td>
                              <td className="p-2.5 font-bold text-slate-800">{topic.area}</td>
                              <td className="p-2.5 font-medium text-slate-900">{topic.assunto}</td>
                              <td className="p-2.5 text-[11px] text-slate-500 font-mono">
                                {topic.origem}
                              </td>
                              <td className="p-2.5 text-slate-700 max-w-xs">{topic.impacto}</td>
                              <td className="p-2.5">
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    topic.situacao === 'DADO FALTANTE'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {topic.situacao}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                {topic.decisao_necessaria ? (
                                  <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 font-bold text-[10px]">
                                    SIM
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 font-medium">Não</span>
                                )}
                              </td>
                              <td className="p-2.5 font-semibold text-slate-800">
                                {topic.responsavel_relacionado}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    O briefing executivo ainda não foi gerado para esta reunião.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerateBriefing}
                    disabled={generatingBriefing}
                    className="mt-3 bg-[#004C97] text-white text-xs font-bold"
                  >
                    ORGANIZAR REUNIÃO PCP COM IA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* =========================================================================
              QUADRO 2: PAUTA SUGERIDA & REORDENAÇÃO (Persistida)
          ========================================================================== */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#004C97]" /> 2. Pauta da Reunião PCP (Ordem &
                  Tempo)
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Combina as pendências abertas da reunião anterior com os assuntos do briefing.
                  Permite incluir, excluir e reordenar com ordem persistida.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddItemOpen(true)}
                  className="text-xs font-semibold h-8 gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Item
                </Button>

                <Button
                  size="sm"
                  onClick={handleGenerateAgenda}
                  disabled={generatingAgenda}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold h-8 gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${generatingAgenda ? 'animate-spin' : ''}`} />
                  {agendaItems.length > 0 ? 'Regerar Pauta' : 'Gerar Pauta Sugerida'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {agendaItems.length > 0 ? (
                <div className="space-y-2">
                  {agendaItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => handleMoveAgendaItem(idx, 'UP')}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5"
                            title="Subir"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            #{item.order}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveAgendaItem(idx, 'DOWN')}
                            disabled={idx === agendaItems.length - 1}
                            className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-0.5"
                            title="Descer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{item.subject}</span>
                            <Badge
                              className={`text-[9px] ${
                                item.priority === 'CRITICO'
                                  ? 'bg-rose-600 text-white'
                                  : item.priority === 'ALTO'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-500 text-white'
                              }`}
                            >
                              {item.priority}
                            </Badge>
                            {item.decision_needed && (
                              <Badge
                                variant="outline"
                                className="text-[9px] text-rose-700 border-rose-300 font-bold"
                              >
                                Decisão Necessária
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span>
                              Área: <strong>{item.area}</strong>
                            </span>
                            <span>
                              Tempo: <strong>{item.estimated_time_min} min</strong>
                            </span>
                            <span>
                              Apresentador: <strong>{item.presenter}</strong>
                            </span>
                            {item.origin_ref && (
                              <span className="font-mono text-[10px]">
                                Origem: {item.origin_ref}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAgendaItem(item.id!)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 w-7 p-0 shrink-0"
                        title="Remover da pauta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right text-xs text-slate-500 font-mono pt-1">
                    Tempo Total Estimado da Reunião:{' '}
                    <strong>
                      {agendaItems.reduce((acc, it) => acc + (it.estimated_time_min || 0), 0)} min
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    Nenhuma pauta gerada para esta reunião ainda.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGenerateAgenda}
                    disabled={generatingAgenda}
                    className="mt-3 bg-slate-800 text-white text-xs font-bold"
                  >
                    Gerar Pauta Sugerida
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* =========================================================================
              QUADRO 3: PRÉVIA DA ATA COM IA & TEMPLATE SGQ (8.1.001-R002)
          ========================================================================== */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#004C97]" /> 3. Prévia da ATA (Template SGQ
                  8.1.001-R002 Rev 8)
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Monta a minuta com classificação
                  (MANTER/ATUALIZAR/NOVA/CONCLUIDA/PENDENTE/SUGESTÃO_DE_EXCLUSÃO/NECESSITA_VALIDAÇÃO).
                  Preserva dados anteriores integralmente.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleGeneratePrevia}
                  disabled={generatingPrevia}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold h-8 gap-1.5"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generatingPrevia ? 'animate-spin' : ''}`} />
                  {previaAta ? 'Regerar Minuta com IA' : 'GERAR PRÉVIA DA ATA COM IA'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {previaAta ? (
                <>
                  {/* Barra de Completude da ATA */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          Completude Geral da Prévia:
                        </span>
                        <Badge className="bg-[#004C97] text-white font-mono text-xs">
                          {previaAta.overall_completeness}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Versão {previaAta.version} &bull; Status: {previaAta.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Template: {previaAta.template_code} (Revisão 8 Oficial SGQ CIAFAL)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão de Validação Técnica */}
                      {currentMeeting.status !== 'PREVIA_VALIDADA' &&
                        currentMeeting.status !== 'PREVIA_ENVIADA' &&
                        !currentMeeting.agendamento_confirmado && (
                          <Button
                            size="sm"
                            onClick={handleValidatePrevia}
                            disabled={validatingPrevia}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-8 gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Validar Minuta da Prévia
                          </Button>
                        )}
                    </div>
                  </div>

                  {/* Lista de Seções do Template SGQ */}
                  <div className="space-y-2">
                    {Object.values(previaAta.structured_content?.secoes || {}).map((sec) => {
                      const isExpanded = expandedSections[sec.id] ?? false
                      const completenessScore = previaAta.section_completeness?.[sec.id] ?? 0

                      return (
                        <div
                          key={sec.id}
                          className="border border-slate-200 rounded-md overflow-hidden bg-white"
                        >
                          <div
                            onClick={() => toggleSection(sec.id)}
                            className="p-3 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between gap-2 select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                Seção {sec.ordem}: {sec.nome}
                              </span>
                              {sec.obrigatorio && (
                                <span className="text-[10px] text-rose-600 font-bold">
                                  *Obrigatória
                                </span>
                              )}
                              <Badge variant="outline" className="text-[10px] text-slate-600">
                                {sec.itens?.length || 0} tópico(s)
                              </Badge>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-semibold text-slate-600">
                                {completenessScore}% preenchida
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
                              {sec.itens && sec.itens.length > 0 ? (
                                sec.itens.map((item, itIdx) => (
                                  <div
                                    key={item.id || itIdx}
                                    className="p-2.5 rounded border border-slate-100 bg-slate-50/50 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-slate-900">
                                        {item.topico}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] font-bold ${
                                          item.status_info === 'MANTER'
                                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                                            : item.status_info === 'PENDENTE'
                                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                                              : item.status_info === 'NOVA'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                                : 'bg-purple-50 text-purple-700 border-purple-300'
                                        }`}
                                      >
                                        {item.status_info}
                                      </Badge>
                                    </div>
                                    <p className="text-slate-700">{item.detalhes}</p>
                                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-mono">
                                      {item.responsavel && <span>Resp: {item.responsavel}</span>}
                                      {item.origem && <span>Origem: {item.origem}</span>}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  Nenhum tópico inserido nesta seção ainda.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    A prévia da ATA ainda não foi gerada para esta reunião.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleGeneratePrevia}
                    disabled={generatingPrevia}
                    className="mt-3 bg-[#004C97] text-white text-xs font-bold"
                  >
                    GERAR PRÉVIA DA ATA COM IA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* =========================================================================
              QUADRO 4: TRAVA CRÍTICA — ENVIO DA PRÉVIA & BLOQUEIO DE AGENDAMENTO
          ========================================================================== */}
          <Card
            className={`border-2 shadow-xs transition-colors ${
              scheduleAllowed
                ? 'border-emerald-500 bg-emerald-50/20'
                : 'border-rose-400 bg-rose-50/20'
            }`}
          >
            <CardHeader className="p-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    className={`w-5 h-5 ${scheduleAllowed ? 'text-emerald-600' : 'text-rose-600'}`}
                  />
                  <CardTitle className="text-sm font-black text-slate-900 tracking-tight">
                    4. Trava de Governança: Confirmação de Agendamento Oficial
                  </CardTitle>
                </div>
                <p className="text-xs text-slate-600">
                  <strong>Regra Obrigatória do SGQ:</strong> O botão "CONFIRMAR AGENDAMENTO"
                  permanece <strong>BLOQUEADO</strong> até que a prévia tenha sido VALIDADA e
                  ENVIADA ao Grupo PCP com registro auditável.
                </p>
              </div>

              <div>
                {scheduleAllowed ? (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs gap-1 py-1">
                    <Unlock className="w-3.5 h-3.5" /> AGENDAMENTO LIBERADO
                  </Badge>
                ) : (
                  <Badge className="bg-rose-600 text-white font-bold text-xs gap-1 py-1">
                    <Lock className="w-3.5 h-3.5" /> AGENDAMENTO BLOQUEADO
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Painel Informativo sobre o Bloqueio */}
              {!currentMeeting.previa_enviada ? (
                <div className="p-3 bg-white border border-rose-200 rounded-md text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de
                      confirmar o agendamento.
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Etapas pendentes:
                    {!currentMeeting.previa_gerada && ' • Gerar Prévia da ATA'}
                    {currentMeeting.previa_gerada &&
                      currentMeeting.status !== 'PREVIA_VALIDADA' &&
                      ' • Validar Minuta da Prévia'}
                    {!currentMeeting.previa_enviada && ' • Registrar Envio ao Grupo PCP'}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white border border-emerald-200 rounded-md text-xs space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Prévia Enviada com Sucesso ao Grupo PCP</span>
                  </div>
                  {currentMeeting.previa_envio_info && (
                    <div className="text-[11px] text-slate-600 font-mono space-y-0.5 pt-1">
                      <div>
                        Data/Hora Envio:{' '}
                        {new Date(currentMeeting.previa_envio_info.data_hora).toLocaleString(
                          'pt-BR',
                        )}
                      </div>
                      <div>Usuário: {currentMeeting.previa_envio_info.usuario}</div>
                      <div>Versão Prévia: v{currentMeeting.previa_envio_info.versao}</div>
                      <div>
                        Destinatários: {currentMeeting.previa_envio_info.destinatarios.join(', ')}
                      </div>
                      <div className="text-amber-700 font-semibold">
                        Canal: {currentMeeting.previa_envio_info.canal} (Sem SMTP direto, auditado
                        no banco)
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação do Fluxo */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {/* Botão Enviar Prévia */}
                {!currentMeeting.previa_enviada && (
                  <Button
                    onClick={() => setIsSendPreviaOpen(true)}
                    disabled={!currentMeeting.previa_gerada}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Prévia ao Grupo PCP
                  </Button>
                )}

                {/* Botão Confirmar Agendamento com Trava */}
                <Button
                  onClick={handleConfirmSchedule}
                  disabled={!scheduleAllowed || confirmingSchedule}
                  className={`text-xs font-bold gap-1.5 px-5 ${
                    scheduleAllowed
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                  title={
                    scheduleAllowed
                      ? 'Confirmar Reunião e Integrar à Agenda'
                      : 'É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento.'
                  }
                >
                  <CalendarDays className="w-4 h-4" />
                  {currentMeeting.agendamento_confirmado
                    ? 'AGENDAMENTO JÁ CONFIRMADO'
                    : 'CONFIRMAR AGENDAMENTO'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500">
            Selecione ou crie uma reunião para iniciar a preparação.
          </p>
        </div>
      )}

      {/* Modal: Adicionar Item à Pauta */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Incluir Novo Item na Pauta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O item será adicionado e persistido na ordem sequencial da pauta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assunto do Item *</label>
              <Input
                value={newItemSubject}
                onChange={(e) => setNewItemSubject(e.target.value)}
                placeholder="Ex: Alinhamento de gargalo na Linha L1"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Área</label>
                <select
                  value={newItemArea}
                  onChange={(e) => setNewItemArea(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                >
                  <option value="PCP">PCP</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="Preparação L2">Preparação L2</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Qualidade">Qualidade</option>
                  <option value="Comercial">Comercial</option>
                  <option value="KS">KS</option>
                  <option value="SDC">SDC</option>
                  <option value="Laboratório">Laboratório</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Projetos">Projetos</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Prioridade</label>
                <select
                  value={newItemPriority}
                  onChange={(e: any) => setNewItemPriority(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2.5 py-2 bg-white"
                >
                  <option value="CRITICO">CRITICO</option>
                  <option value="ALTO">ALTO</option>
                  <option value="MEDIO">MEDIO</option>
                  <option value="INFORMATIVO">INFORMATIVO</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tempo Estimado (min)
                </label>
                <Input
                  type="number"
                  value={newItemTime}
                  onChange={(e) => setNewItemTime(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Apresentador</label>
                <Input
                  value={newItemPresenter}
                  onChange={(e) => setNewItemPresenter(e.target.value)}
                  placeholder="Nome do responsável"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Motivo / Detalhes</label>
              <Textarea
                value={newItemReason}
                onChange={(e) => setNewItemReason(e.target.value)}
                placeholder="Por que este assunto deve ser discutido nesta reunião?"
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="chkDecision"
                checked={newItemDecision}
                onChange={(e) => setNewItemDecision(e.target.checked)}
                className="rounded border-slate-300 text-[#004C97]"
              />
              <label htmlFor="chkDecision" className="text-xs font-semibold text-slate-800">
                Este item exige tomada de decisão formal na reunião
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddItemOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddAgendaItem}
              className="bg-[#004C97] text-white font-bold"
            >
              Adicionar à Pauta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Enviar Prévia ao Grupo PCP */}
      <Dialog open={isSendPreviaOpen} onOpenChange={setIsSendPreviaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#004C97]" /> Confirmar Envio da Prévia ao Grupo PCP
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O envio será auditado no banco com data/hora, versão da ATA, usuário logado e lista de
              destinatários.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Destinatários (separados por vírgula):
              </label>
              <Input
                value={destinatariosInput}
                onChange={(e) => setDestinatariosInput(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900 space-y-1">
              <strong>Aviso de Integração Honesta:</strong>
              <p>
                Como o servidor de SMTP corporativo do HUB ainda não está integrado nesta fatia, o
                envio será registrado no banco sob o canal{' '}
                <code>REGISTRO_SISTEMA_CANAL_NOTIF_PENDENTE</code>, liberando o agendamento sem
                mascarar o status do canal.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsSendPreviaOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendPrevia}
              disabled={sendingPrevia}
              className="bg-[#004C97] text-white font-bold"
            >
              {sendingPrevia ? 'Registrando...' : 'Confirmar Registro de Envio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PreparacaoReuniaoView
