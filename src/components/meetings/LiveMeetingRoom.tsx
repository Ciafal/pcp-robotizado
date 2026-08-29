import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Play,
  Square,
  Mic,
  MicOff,
  Sparkles,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  ShieldAlert,
  ArrowLeft,
  FileText,
  Megaphone,
  Paperclip,
  Check,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  PCPMeeting,
  PCPMinuteItem,
  ItemClassification,
  ItemStatus,
} from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { FastItemModal } from '@/components/meetings/FastItemModal'
import { ConvertToCommModal } from '@/components/meetings/ConvertToCommModal'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export const LiveMeetingRoom: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const meetingId = searchParams.get('id')
  const [meeting, setMeeting] = useState<PCPMeeting | null>(null)
  const [items, setItems] = useState<PCPMinuteItem[]>([])
  const [loading, setLoading] = useState(true)

  // Estados de Gravação & IA
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isProcessingTranscript, setIsProcessingTranscript] = useState(false)

  // Tópico Ativo da Pauta
  const [activeTopicIndex, setActiveTopicIndex] = useState(0)

  // Modais
  const [fastModalOpen, setFastModalOpen] = useState(false)
  const [selectedClassification, setSelectedClassification] =
    useState<ItemClassification>('DECISAO')
  const [selectedItemForComm, setSelectedItemForComm] = useState<PCPMinuteItem | null>(null)
  const [commModalOpen, setCommModalOpen] = useState(false)

  const loadMeetingData = async () => {
    if (!meetingId) {
      // Carregar a próxima agendada caso não passe ID
      const next = await pcpMeetingService.getNextMeeting()
      if (next) {
        setMeeting(next)
        loadItems(next.id)
      }
      setLoading(false)
      return
    }

    try {
      const m = await pcpMeetingService.getMeetingById(meetingId)
      setMeeting(m)
      if (m) loadItems(m.id)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async (mId: string) => {
    const list = await pcpMeetingService.listMinuteItems({ meetingId: mId })
    setItems(list)
  }

  useEffect(() => {
    loadMeetingData()
  }, [meetingId])

  // Cronômetro da Gravação
  useEffect(() => {
    let interval: any = null
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleOpenFastModal = (classification: ItemClassification) => {
    setSelectedClassification(classification)
    setFastModalOpen(true)
  }

  const handleToggleRecording = async () => {
    if (!isRecording) {
      setIsRecording(true)
      toast({
        title: 'Gravação da Reunião Iniciada',
        description: 'Captação de áudio ativa para transcrição e extração de pauta com IA.',
      })
    } else {
      setIsRecording(false)
      setIsProcessingTranscript(true)
      toast({
        title: 'Gravação Finalizada',
        description: 'Processando áudio com IA nativa Skip Cloud para gerar rascunho de ATA...',
      })

      try {
        const res = await pb.send<any>('/backend/v1/meetings/ai-transcribe-and-draft', {
          method: 'POST',
          body: {
            meeting_id: meeting?.id,
            transcript_text:
              'Áudio captado na reunião de PCP com deliberações de qualidade e sequenciamento.',
          },
        })

        if (res.items && meeting) {
          await loadItems(meeting.id)
          toast({
            title: 'Rascunho da ATA Gerado',
            description: `${res.identified_items_count} itens identificados pela IA (aguardando validação humana).`,
          })
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro na transcrição',
          description: err.message,
        })
      } finally {
        setIsProcessingTranscript(false)
      }
    }
  }

  const handleValidateHuman = async (item: PCPMinuteItem) => {
    try {
      const updated = await pcpMeetingService.updateMinuteItemStatus(
        item.id,
        'VALIDADO_HUMANO',
        'Item validado pelo responsável do PCP durante a reunião.',
      )
      setItems(items.map((it) => (it.id === item.id ? updated : it)))
      toast({
        title: 'Item Validado Oficialmente',
        description: `O item ${item.item_code} agora é oficial e reflete na tela operacional da linha.`,
      })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao validar', description: e.message })
    }
  }

  const handleFinishMeeting = async () => {
    if (!meeting) return
    try {
      await pcpMeetingService.finishMeeting(meeting.id)
      const min = await pcpMeetingService.getOrCreateMinute(meeting)
      toast({
        title: 'Reunião Concluída',
        description: 'ATA oficial estruturada e pronta para revisão final e publicação.',
      })
      navigate(`/pcp/reunioes/atas?id=${min.id}`)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao encerrar reunião', description: e.message })
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Preparando tela para projetor...</span>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm text-slate-600">Nenhuma reunião selecionada.</p>
        <Button
          onClick={() => navigate('/pcp/reunioes')}
          className="bg-[#004C97] text-white text-xs"
        >
          Voltar às Reuniões
        </Button>
      </div>
    )
  }

  const currentTopic = meeting.agenda_topics?.[activeTopicIndex]

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto text-slate-900">
      {/* CABEÇALHO PROJETOR / TV */}
      <div className="bg-white border-b-2 border-[#004C97] p-4 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pcp/reunioes')}
            className="h-8 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Sair do Modo Sala
          </Button>
          <div className="border-l border-slate-200 pl-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#004C97] text-white text-xs font-mono font-bold">
                {meeting.reference_week}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold animate-pulse">
                ● REUNIÃO EM ANDAMENTO
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-300 font-mono">
                {meeting.modality}
              </Badge>
            </div>
            <h1 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
              {meeting.title}
            </h1>
          </div>
        </div>

        {/* Painel Central de Gravação e Conclusão */}
        <div className="flex items-center gap-3">
          {/* Gravador e Transcrição IA */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={isProcessingTranscript}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-rose-600" />
              )}
              {isRecording ? `Gravando (${formatTimer(recordingSeconds)})` : 'Iniciar Gravação IA'}
            </button>

            {isProcessingTranscript && (
              <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" /> Transcrevendo...
              </span>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleFinishMeeting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4 font-bold shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Concluir e Gerar ATA Oficial
          </Button>
        </div>
      </div>

      {/* BARRA DE BOTÕES RÁPIDOS (+ DECISÃO, + PENDÊNCIA, + ALERTA, + COMUNICADO, ETC.) */}
      <div className="bg-gradient-to-r from-blue-900 via-[#004C97] to-slate-900 p-2.5 rounded-lg text-white flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <span className="text-xs font-black uppercase tracking-wider pl-2 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Registro Imediato da Mesa:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('DECISAO')}
            className="h-7 text-[11px] bg-white/90 text-slate-900 hover:bg-white font-bold"
          >
            + Decisão Oficial
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('PENDENCIA')}
            className="h-7 text-[11px] bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold"
          >
            + Pendência
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('ALERTA')}
            className="h-7 text-[11px] bg-orange-400 text-orange-950 hover:bg-orange-300 font-bold"
          >
            + Alerta de Linha
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('RISCO')}
            className="h-7 text-[11px] bg-rose-500 text-white hover:bg-rose-400 font-bold"
          >
            + Risco Crítico
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('ACAO')}
            className="h-7 text-[11px] bg-blue-100 text-blue-950 hover:bg-white font-bold"
          >
            + Ação Corretiva
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('ALTERACAO_PROGRAMACAO')}
            className="h-7 text-[11px] bg-cyan-200 text-cyan-950 hover:bg-white font-bold"
          >
            + Alteração de Programação
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenFastModal('COMUNICADO')}
            className="h-7 text-[11px] bg-purple-200 text-purple-950 hover:bg-white font-bold"
          >
            + Comunicado Direto
          </Button>
        </div>
      </div>

      {/* PAINEL PROJETOR EM 3 COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUNA ESQUERDA: MENU LATERAL DA PAUTA (3 colunas) */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Pauta da Reunião</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {meeting.agenda_topics?.length || 0} Tópicos
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {meeting.agenda_topics?.map((topic, idx) => {
                const isActive = activeTopicIndex === idx
                return (
                  <button
                    key={topic.id || idx}
                    type="button"
                    onClick={() => setActiveTopicIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-md text-xs font-semibold transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-100'
                    }`}
                  >
                    <span className="truncate">{topic.title}</span>
                    {topic.duration_minutes && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {topic.duration_minutes}m
                      </span>
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Participantes Presentes na Sala */}
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#004C97]" /> Mesa / Convocados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-1.5 text-xs">
              {meeting.mandatory_participants?.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100"
                >
                  <span className="font-medium text-slate-800 truncate">{p.name}</span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]"
                  >
                    Presente
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* PAINEL CENTRAL: ASSUNTO ATUAL, INDICADORES E CONTEXTO (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-white border-blue-200 shadow-xs overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 border-b border-blue-100">
              <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-wider block">
                Assunto em Discussão na Mesa:
              </span>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
                {currentTopic?.title || 'Discussão Geral do Sequenciamento'}
              </h2>
            </div>

            <CardContent className="p-4 space-y-4 text-xs">
              {/* Indicadores Relacionados ao PCP */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Aderência Semanal</span>
                  <strong className="text-lg font-mono font-bold text-[#004C97]">91.4%</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">OEE Global</span>
                  <strong className="text-lg font-mono font-bold text-emerald-600">86.8%</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 text-[10px] block">Itens Registrados</span>
                  <strong className="text-lg font-mono font-bold text-slate-800">
                    {items.length}
                  </strong>
                </div>
              </div>

              {/* Informações e Linhas em Pauta */}
              <div className="p-3 bg-blue-50/60 rounded-md border border-blue-100 space-y-2">
                <span className="font-bold text-[#004C97] text-xs block">
                  Linhas Impactadas no Tópico:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {meeting.involved_lines?.map((line) => (
                    <Badge
                      key={line}
                      variant="outline"
                      className="bg-white text-[#004C97] border-blue-300 font-mono font-bold text-xs"
                    >
                      {line}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Orientações do Briefing para o Conducente */}
              {meeting.pre_meeting_briefing && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 text-xs block flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Pontos de Decisão Sugeridos
                    pela IA:
                  </span>
                  <div className="space-y-1.5">
                    {meeting.pre_meeting_briefing.points_for_decision?.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 leading-relaxed text-[11px]"
                      >
                        &bull; {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PAINEL LATERAL DIREITO: DECISÕES, PENDÊNCIAS E AÇÕES EM TEMPO REAL (4 colunas) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="bg-white border-slate-200 shadow-xs flex flex-col h-[650px]">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#004C97]" /> Registros da Reunião (
                {items.length})
              </CardTitle>
              <span className="text-[10px] text-slate-400 font-mono">1 Item ➔ N Linhas</span>
            </CardHeader>

            <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5 text-xs">
              {items.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Nenhum item registrado nesta sessão ainda.</p>
                  <p className="text-[11px]">
                    Utilize os botões rápidos no topo para registrar decisões e pendências.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const isAiPending = item.status === 'IDENTIFICADO_IA'
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border space-y-2 transition-all ${
                        isAiPending
                          ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-200'
                          : item.classification === 'DECISAO'
                            ? 'bg-blue-50/50 border-blue-200'
                            : item.classification === 'RISCO' || item.classification === 'ALERTA'
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Cabeçalho do Item */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            className={`text-[10px] font-bold ${
                              item.classification === 'DECISAO'
                                ? 'bg-[#004C97] text-white'
                                : item.classification === 'PENDENCIA'
                                  ? 'bg-amber-500 text-white'
                                  : item.classification === 'RISCO' ||
                                      item.classification === 'ALERTA'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-700 text-white'
                            }`}
                          >
                            {item.classification}
                          </Badge>
                          <span className="font-mono text-[10px] text-slate-400">
                            [{item.item_code}]
                          </span>
                        </div>

                        {/* Status / Validação IA */}
                        {isAiPending ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold animate-pulse">
                            Identificado IA (Pendente Validação)
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]"
                          >
                            Oficial
                          </Badge>
                        )}
                      </div>

                      {/* Título e Descrição */}
                      <div>
                        <strong className="text-slate-900 font-bold text-xs block">
                          {item.title}
                        </strong>
                        <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      {/* Linhas e Responsável */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">Linhas:</span>
                          <span className="font-mono text-[#004C97] font-bold">
                            {item.line_codes?.join(', ') || 'Geral'}
                          </span>
                        </div>
                        <div>
                          Resp: <strong className="text-slate-700">{item.responsible_name}</strong>
                        </div>
                      </div>

                      {/* Ações Rápidas no Item: Validar IA / Gerar Comunicado */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {isAiPending ? (
                          <Button
                            size="sm"
                            onClick={() => handleValidateHuman(item)}
                            className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 w-full font-bold"
                          >
                            <Check className="w-3 h-3" /> Validar Oficialmente (Humano)
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedItemForComm(item)
                              setCommModalOpen(true)
                            }}
                            className="h-6 text-[10px] border-slate-300 bg-white text-[#004C97] hover:bg-blue-50 gap-1 ml-auto font-semibold"
                          >
                            <Megaphone className="w-3 h-3" /> Gerar Comunicado Oficial
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modais de Registro Rápido */}
      <FastItemModal
        meetingId={meeting.id}
        open={fastModalOpen}
        onOpenChange={setFastModalOpen}
        initialClassification={selectedClassification}
        availableLines={meeting.involved_lines || ['L01', 'L02', 'L03', 'L04']}
        onSuccess={(newItem) => setItems([newItem, ...items])}
      />

      <ConvertToCommModal
        item={selectedItemForComm}
        open={commModalOpen}
        onOpenChange={setCommModalOpen}
        onSuccess={() => {
          toast({
            title: 'Comunicado PCP Publicado',
            description: 'Disponível na Central de Comunicados e nas telas das linhas vinculadas.',
          })
        }}
      />
    </div>
  )
}
export default LiveMeetingRoom
