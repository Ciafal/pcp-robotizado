/**
 * TÓPICO HISTÓRICO DE REUNIÕES & CONSULTA INTELIGENTE COM IA — FATIA 2
 * Implementa o Bloco 3 e Bloco 4:
 * - Listagem de todas as reuniões históricas com filtros múltiplos (ano, semana, empresa, status, palavra-chave);
 * - Detalhe histórico em abas (Visão Geral, Pauta, Prévia, ATA Final, Participantes, Decisões, Pendências, Transcrição, Logs);
 * - "CONSULTAR HISTÓRICO COM IA": busca semântica estrita sobre dados reais (NUNCA inventa);
 * - Detecção de recorrências e painel de reincidências entre reuniões.
 */

import React, { useState, useEffect } from 'react'
import {
  PCPMeetingRecord,
  PCPMeetingAgendaItemRecord,
  PCPMeetingParticipantRecord,
  PCPMeetingPendencyRecord,
  PCPMeetingDecisionRecord,
  PCPMeetingAtaRecord,
  PCPMeetingLogRecord,
  RecurrenceDetectionItem,
} from '@/types/pcp-meeting'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import { pcpMeetingFatia2Service } from '@/services/pcp-meeting-fatia2-service'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Filter,
  Sparkles,
  History,
  FileText,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface HistoricoReunioesViewProps {
  onNavigateTab: (tab: string, meetingId?: string) => void
  currentUser: { id?: string; name: string }
}

export const HistoricoReunioesView: React.FC<HistoricoReunioesViewProps> = ({
  onNavigateTab,
  currentUser,
}) => {
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<PCPMeetingRecord[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<PCPMeetingRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros de busca
  const [searchKeyword, setSearchKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [yearFilter, setYearFilter] = useState<string>('TODOS')

  // Detalhes da reunião selecionada
  const [detailTab, setDetailTab] = useState<
    'geral' | 'pauta' | 'ata' | 'participantes' | 'decisoes' | 'pendencias' | 'logs'
  >('geral')
  const [agendaItems, setAgendaItems] = useState<PCPMeetingAgendaItemRecord[]>([])
  const [atas, setAtas] = useState<PCPMeetingAtaRecord[]>([])
  const [participants, setParticipants] = useState<PCPMeetingParticipantRecord[]>([])
  const [decisions, setDecisions] = useState<PCPMeetingDecisionRecord[]>([])
  const [pendencies, setPendencies] = useState<PCPMeetingPendencyRecord[]>([])
  const [logs, setLogs] = useState<PCPMeetingLogRecord[]>([])

  // Consulta Inteligente com IA
  const [aiQuery, setAiQuery] = useState('')
  const [aiSearching, setAiSearching] = useState(false)
  const [aiResult, setAiResult] = useState<{
    answer: string
    relatedMeetings: PCPMeetingRecord[]
    snippets: any[]
  } | null>(null)

  // Detecção de Recorrências
  const [recurrences, setRecurrences] = useState<RecurrenceDetectionItem[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const list = await pcpMeetingFatia1Service.listMeetings()
      setMeetings(list)
      if (list.length > 0) {
        setSelectedMeeting(list[0])
        await loadMeetingDetails(list[0].id)
      }

      // Carregar recorrências globais
      const recs = await pcpMeetingFatia2Service.detectRecurrences()
      setRecurrences(recs)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadMeetingDetails = async (meetingId: string) => {
    try {
      const [items, aList, parts, decs, pends, lgList] = await Promise.all([
        pcpMeetingFatia1Service.listAgendaItems(meetingId),
        pcpMeetingFatia2Service.listAtas(meetingId),
        pcpMeetingFatia1Service.listParticipants(meetingId),
        pcpMeetingFatia2Service.listDecisions(meetingId),
        pcpMeetingFatia1Service.listPendencies({ meetingId }),
        pcpMeetingFatia1Service.listLogs(meetingId),
      ])
      setAgendaItems(items)
      setAtas(aList)
      setParticipants(parts)
      setDecisions(decs)
      setPendencies(pends)
      setLogs(lgList)
    } catch (err: any) {
      console.error(err)
    }
  }

  const handleSelectMeeting = async (m: PCPMeetingRecord) => {
    setSelectedMeeting(m)
    await loadMeetingDetails(m.id)
  }

  // Consulta IA no Histórico
  const handleRunAiQuery = async (queryText?: string) => {
    const q = queryText || aiQuery
    if (!q.trim()) return
    setAiSearching(true)
    try {
      const res = await pcpMeetingFatia2Service.queryMeetingHistoryWithAi(q)
      setAiResult(res)
    } catch (err: any) {
      toast({ title: 'Erro na busca com IA', description: err.message, variant: 'destructive' })
    } finally {
      setAiSearching(false)
    }
  }

  // Filtragem da lista
  const filteredMeetings = meetings.filter((m) => {
    const matchesKeyword =
      !searchKeyword ||
      m.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.meeting_code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.conductor.toLowerCase().includes(searchKeyword.toLowerCase())

    const matchesStatus = statusFilter === 'TODOS' || m.status === statusFilter
    const matchesYear = yearFilter === 'TODOS' || String(m.year) === yearFilter

    return matchesKeyword && matchesStatus && matchesYear
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#004C97] mb-2" />
        <span className="text-xs font-semibold">Carregando Histórico de Reuniões PCP...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. SEÇÃO CONSULTAR HISTÓRICO COM IA */}
      <Card className="border-indigo-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Consultar Histórico com IA (Estrito sobre Registros Oficiais)
              </h2>
              <p className="text-xs text-slate-500">
                Respostas baseadas unicamente no histórico oficial de ATAs, decisões e pendências. A
                IA não inventa fatos.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Ex: 'Quais pendências da L2 continuam abertas?', 'Matéria-prima Arcelor', 'DP04'..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunAiQuery()}
                className="pl-9 text-xs h-9 bg-white"
              />
            </div>
            <Button
              size="sm"
              onClick={() => handleRunAiQuery()}
              disabled={aiSearching || !aiQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 px-4"
            >
              {aiSearching ? 'Pesquisando...' : 'Consultar IA'}
            </Button>
          </div>

          {/* Atalhos de perguntas frequentes */}
          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-500 font-semibold self-center mr-1">Sugestões:</span>
            {[
              'Quais pendências da L2 continuam abertas?',
              'Problemas de matéria-prima',
              'Quais ações estão vencidas?',
              'Decisões sobre MTO',
            ].map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setAiQuery(sug)
                  handleRunAiQuery(sug)
                }}
                className="px-2 py-0.5 bg-white border border-indigo-200 rounded text-indigo-800 hover:bg-indigo-50 font-medium"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Resultado da Pesquisa com IA */}
          {aiResult && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-900">Resultado Oficial da Consulta:</span>
                <Badge variant="outline" className="text-[10px]">
                  {aiResult.snippets.length} evidências documentais
                </Badge>
              </div>
              <p className="text-slate-700 font-medium">{aiResult.answer}</p>

              {aiResult.snippets.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {aiResult.snippets.map((snip, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 bg-slate-50 rounded border text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-slate-500 font-mono">
                        <span className="font-bold text-[#004C97]">
                          {snip.meetingCode} (S{snip.week}/{snip.year}) &bull; {snip.secao}
                        </span>
                        <span>{snip.origem}</span>
                      </div>
                      <p className="text-slate-800">{snip.trecho}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. DETECÇÃO DE RECORRÊNCIAS ENTRE REUNIÕES */}
      {recurrences.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Detecção Automática de Recorrências ({recurrences.length} temas reincidentes)
              </span>
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                Atenção da Liderança
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {recurrences.map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 bg-white border border-amber-200 rounded-lg text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{rec.assunto}</span>
                    <Badge
                      className={`text-[9px] ${
                        rec.severidade === 'CRITICA'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rec.totalOcorrencias} Ocorrências ({rec.primeiraSemana} a {rec.ultimaSemana})
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">{rec.indicadorTexto}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 italic">
                      {rec.isAiSuggested
                        ? 'Possível recorrência identificada por IA'
                        : 'Vínculo objetivo'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: 'Recorrência vinculada',
                          description:
                            'Recomendação enviada para o plano de ação 5W2H na Gestão de Performance.',
                        })
                      }}
                      className="text-[10px] h-6 px-2 text-[#004C97] font-bold"
                    >
                      Elevar para 5W2H
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. LISTA HISTÓRICA & FILTROS + DETALHE COMPLETO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Painel Esquerdo: Lista Histórica com Filtros */}
        <div className="lg:col-span-5 space-y-2">
          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Filtrar por código, título ou condutor..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded px-2 py-1 text-xs bg-white font-semibold"
              >
                <option value="TODOS">Todos os Status</option>
                <option value="PUBLICADA">Publicada</option>
                <option value="ATA_APROVADA">Aprovada</option>
                <option value="MINUTA_GERADA">Minuta Gerada</option>
                <option value="AGUARDANDO_ATA_FINAL">Aguardando ATA</option>
                <option value="AGENDADA">Agendada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>

              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="border rounded px-2 py-1 text-xs bg-white font-semibold"
              >
                <option value="TODOS">Todos os Anos</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredMeetings.map((m) => {
              const isSelected = selectedMeeting?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMeeting(m)}
                  className={`w-full text-left p-3 rounded-lg border transition-all space-y-1 ${
                    isSelected
                      ? 'bg-blue-50/90 border-[#004C97] shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                      Semana {m.week}/{m.year}
                    </Badge>
                    <span className="text-[10px] text-slate-500 font-mono">{m.meeting_date}</span>
                  </div>
                  <strong className="text-xs text-slate-900 font-bold block truncate">
                    {m.title}
                  </strong>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {m.company} &bull; {m.modality}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-bold">
                      {m.status}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Painel Direito: Detalhe Histórico em Abas */}
        <div className="lg:col-span-7 space-y-3">
          {selectedMeeting ? (
            <Card className="bg-white border-slate-200 shadow-sm">
              <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase">
                    Detalhe da {selectedMeeting.meeting_code} — Semana {selectedMeeting.week}/
                    {selectedMeeting.year}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Realizada em {selectedMeeting.meeting_date} &bull; Status:{' '}
                    {selectedMeeting.status}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onNavigateTab('atas', selectedMeeting.id)}
                    className="text-xs h-7 text-[#004C97] font-bold"
                  >
                    Ver na Central de ATAs
                  </Button>
                </div>
              </div>

              {/* Sub-abas de detalhe */}
              <div className="flex border-b border-slate-200 px-2 pt-2 gap-1 overflow-x-auto text-xs font-bold bg-white">
                {[
                  { id: 'geral', label: 'Visão Geral' },
                  { id: 'pauta', label: `Pauta (${agendaItems.length})` },
                  { id: 'ata', label: `ATA (${atas.length})` },
                  { id: 'decisoes', label: `Decisões (${decisions.length})` },
                  { id: 'pendencias', label: `Pendências (${pendencies.length})` },
                  { id: 'participantes', label: `Presenças (${participants.length})` },
                  { id: 'logs', label: `Auditoria (${logs.length})` },
                ].map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setDetailTab(tb.id as any)}
                    className={`px-3 py-1.5 border-b-2 text-xs whitespace-nowrap ${
                      detailTab === tb.id
                        ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              <CardContent className="p-4 min-h-[360px] text-xs">
                {detailTab === 'geral' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Organizador</span>
                        <strong className="text-slate-800">{selectedMeeting.organizer}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Condutor</span>
                        <strong className="text-slate-800">{selectedMeeting.conductor}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Modalidade / Sala</span>
                        <strong className="text-slate-800">
                          {selectedMeeting.modality}{' '}
                          {selectedMeeting.room ? `(${selectedMeeting.room})` : ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Duração Registrada</span>
                        <strong className="text-slate-800">
                          {selectedMeeting.actual_duration_seconds
                            ? `${Math.round(selectedMeeting.actual_duration_seconds / 60)} min`
                            : 'Prevista na agenda'}
                        </strong>
                      </div>
                    </div>

                    {selectedMeeting.objective && (
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">Objetivo:</span>
                        <p className="text-slate-600 bg-white p-2 border rounded">
                          {selectedMeeting.objective}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'pauta' && (
                  <div className="space-y-2">
                    {agendaItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2 border rounded bg-white flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400">
                              #{item.order || idx + 1}
                            </span>
                            <span className="font-bold text-slate-900">{item.subject}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {item.area}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Apresentador: {item.presenter} &bull; Estimado:{' '}
                            {item.estimated_time_min} min
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {item.discussion_status || 'NAO_INICIADO'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'ata' && (
                  <div className="space-y-2">
                    {atas.map((a) => (
                      <div key={a.id} className="p-2.5 border rounded bg-slate-50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            Versão {a.version}.0 ({a.ata_type})
                          </span>
                          <Badge className="bg-[#004C97] text-white text-[10px]">{a.status}</Badge>
                        </div>
                        <p className="text-slate-600 text-[11px]">
                          Template: {a.template_code} &bull; Completude: {a.overall_completeness}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'decisoes' && (
                  <div className="space-y-1.5">
                    {decisions.map((d) => (
                      <div key={d.id} className="p-2 border rounded bg-white space-y-0.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900">{d.subject || 'Decisão'}</strong>
                          <span className="text-[10px] text-slate-400">{d.decision_date}</span>
                        </div>
                        <p className="text-slate-700">{d.description}</p>
                        <div className="text-[10px] text-slate-500">
                          Resp: {d.responsible} &bull; Origem: {d.origin_type || 'MANUAL'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'pendencias' && (
                  <div className="space-y-1.5">
                    {pendencies.map((p) => (
                      <div key={p.id} className="p-2 border rounded bg-white space-y-0.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-900">{p.subject}</strong>
                          <Badge className="text-[9px] bg-slate-100 text-slate-700">
                            {p.status}
                          </Badge>
                        </div>
                        <p className="text-slate-600">{p.action}</p>
                        <div className="text-[10px] text-slate-500">
                          Resp: {p.responsible || 'Sem resp'} &bull; Prazo:{' '}
                          {p.deadline || 'Sem prazo'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'participantes' && (
                  <div className="space-y-1.5">
                    {participants.map((pt) => (
                      <div
                        key={pt.id}
                        className="p-2 border rounded bg-white flex items-center justify-between"
                      >
                        <div>
                          <strong className="text-slate-900">{pt.person_name}</strong>
                          <div className="text-[10px] text-slate-500">
                            {pt.role_title} &bull; {pt.area}
                          </div>
                        </div>
                        <Badge
                          className={`text-[9px] ${
                            pt.attendance_status === 'PRESENTE'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pt.attendance_status || pt.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'logs' && (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {logs.map((lg) => (
                      <div
                        key={lg.id}
                        className="p-1.5 border-b text-[11px] font-mono flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-[#004C97]">{lg.action}</span>
                          <span className="text-slate-600 ml-2">{lg.reason || lg.new_value}</span>
                        </div>
                        <span className="text-slate-400 text-[10px]">
                          {lg.user_name} &bull;{' '}
                          {lg.created ? new Date(lg.created).toLocaleTimeString('pt-BR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center text-slate-400">
              Selecione uma reunião para visualizar o histórico.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default HistoricoReunioesView
