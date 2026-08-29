import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FileText,
  CheckCircle2,
  Send,
  Printer,
  Sparkles,
  Users,
  Building,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Megaphone,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PCPMeeting, PCPMeetingMinute, PCPMinuteItem } from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { ConvertToCommModal } from '@/components/meetings/ConvertToCommModal'
import { useToast } from '@/hooks/use-toast'

export const MeetingMinutesView: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<PCPMeeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<PCPMeeting | null>(null)
  const [minute, setMinute] = useState<PCPMeetingMinute | null>(null)
  const [items, setItems] = useState<PCPMinuteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  const [selectedItemForComm, setSelectedItemForComm] = useState<PCPMinuteItem | null>(null)
  const [commModalOpen, setCommModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const allMeetings = await pcpMeetingService.listMeetings()
      setMeetings(allMeetings)

      if (allMeetings.length > 0) {
        const queryId = searchParams.get('meetingId')
        const target = queryId
          ? allMeetings.find((m) => m.id === queryId) || allMeetings[0]
          : allMeetings[0]
        setSelectedMeeting(target)
        await loadMinuteAndItems(target)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadMinuteAndItems = async (m: PCPMeeting) => {
    try {
      const min = await pcpMeetingService.getOrCreateMinute(m)
      setMinute(min)
      const minuteItems = await pcpMeetingService.listMinuteItems({ meetingId: m.id })
      setItems(minuteItems)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelectMeeting = async (m: PCPMeeting) => {
    setSelectedMeeting(m)
    await loadMinuteAndItems(m)
  }

  const handlePublishMinute = async () => {
    if (!minute) return
    setPublishing(true)
    try {
      const published = await pcpMeetingService.publishMinute(minute.id)
      setMinute(published)
      toast({
        title: 'ATA Oficial Publicada com Sucesso',
        description:
          'Deliberações oficiais registradas e e-mails disparados aos participantes e gestores.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao publicar ATA',
        description: err.message,
      })
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-mono">Carregando Atas Oficiais de PCP...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#004C97]" />
            Atas Digitais Oficiais de PCP
          </h2>
          <p className="text-xs text-slate-500">
            Estrutura atômica em banco de dados: 1 ITEM ➔ N LINHAS. Revisão, publicação e disparo
            automático por e-mail.
          </p>
        </div>

        {minute && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir / Exportar PDF
            </Button>
            {minute.status !== 'PUBLICADA' ? (
              <Button
                size="sm"
                disabled={publishing}
                onClick={handlePublishMinute}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4 gap-1.5 font-bold shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                {publishing ? 'Publicando...' : 'Publicar e Disparar E-mails'}
              </Button>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-3 py-1 font-bold">
                ✓ ATA PUBLICADA OFICIALMENTE
              </Badge>
            )}
          </div>
        )}
      </div>

      {meetings.length === 0 ? (
        <Card className="bg-white border-slate-200 p-8 text-center space-y-2">
          <FileText className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Nenhuma ATA cadastrada</h3>
          <p className="text-xs text-slate-500">
            As atas digitais são geradas a partir das reuniões semanais de PCP.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Menu Lateral de Reuniões/Atas */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-1">
              Histórico de Reuniões / Atas
            </span>
            <div className="space-y-2 max-h-[700px] overflow-y-auto">
              {meetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMeeting(m)}
                    className={`w-full text-left p-3 rounded-lg border transition-all space-y-1.5 ${
                      isSelected
                        ? 'bg-blue-50/90 border-[#004C97] shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                        {m.reference_week}
                      </Badge>
                      <span className="text-[10px] text-slate-500 font-mono">{m.meeting_date}</span>
                    </div>
                    <strong className="text-xs text-slate-900 font-bold block truncate">
                      {m.title}
                    </strong>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Linhas: {m.involved_lines?.join(', ') || 'Geral'}</span>
                      <span className="font-semibold text-slate-700">{m.status}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Painel Central: Visualizador Estruturado da ATA */}
          <div className="lg:col-span-8 space-y-4">
            {selectedMeeting && minute && (
              <Card className="bg-white border-slate-200 shadow-xs print:border-none print:shadow-none">
                {/* Header Formal da ATA */}
                <div className="border-b border-slate-200 p-5 bg-gradient-to-r from-blue-50/50 via-white to-slate-50">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                          ATA CIAFAL PCP
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-slate-300 font-mono">
                          Versão {minute.version}.0
                        </Badge>
                        <Badge
                          className={
                            minute.status === 'PUBLICADA'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : 'bg-amber-500 text-white text-[10px]'
                          }
                        >
                          {minute.status}
                        </Badge>
                      </div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
                        {minute.title}
                      </h1>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Referência: {selectedMeeting.reference_week} &bull; Data Realização:{' '}
                        {selectedMeeting.meeting_date} às {selectedMeeting.meeting_time}
                      </p>
                    </div>

                    <div className="text-right text-xs text-slate-500 font-mono space-y-0.5">
                      {minute.published_at && (
                        <div>
                          Publicada em:{' '}
                          <strong>{new Date(minute.published_at).toLocaleString('pt-BR')}</strong>
                        </div>
                      )}
                      {minute.published_by_name && (
                        <div>
                          Responsável: <strong>{minute.published_by_name}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 space-y-6 text-xs text-slate-800">
                  {/* Resumo Executivo da ATA */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-[#004C97] uppercase tracking-wider block">
                      1. Resumo Executivo & Deliberações Estratégicas
                    </span>
                    <p className="text-slate-700 leading-relaxed text-xs">
                      {minute.executive_summary ||
                        selectedMeeting.general_notes ||
                        'Pauta concluída sem ressalvas.'}
                    </p>
                  </div>

                  {/* Participantes Presentes e Convocados */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#004C97]" /> 2. Participantes & Presença
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedMeeting.mandatory_participants?.map((p, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs flex items-center gap-2"
                        >
                          <span className="font-semibold text-slate-800">{p.name}</span>
                          <span className="text-[10px] text-slate-400">({p.email})</span>
                          <Badge
                            variant="outline"
                            className={
                              p.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 text-[9px]'
                                : 'bg-slate-100 text-slate-500 border-slate-300 text-[9px]'
                            }
                          >
                            {p.status === 'ACCEPTED' ? 'Presente' : 'Convocado'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Itens Atômicos da ATA: 1 ITEM -> N LINHAS */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#004C97]" /> 3. Registro Estruturado de
                        Itens, Decisões e Pendências ({items.length})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Vínculo automático com telas de operação
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4">
                        Nenhum item registrado para esta reunião.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-lg border space-y-2 transition-all ${
                              item.classification === 'DECISAO'
                                ? 'bg-blue-50/40 border-blue-200'
                                : item.classification === 'PENDENCIA'
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : item.classification === 'RISCO' ||
                                      item.classification === 'ALERTA'
                                    ? 'bg-rose-50/40 border-rose-200'
                                    : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
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
                                <span className="font-mono text-slate-400 text-[10px]">
                                  [{item.item_code}]
                                </span>
                                <strong className="text-slate-900 font-bold text-xs">
                                  {item.title}
                                </strong>
                              </div>

                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono border-slate-300"
                              >
                                Status: {item.status}
                              </Badge>
                            </div>

                            <p className="text-slate-700 text-xs leading-relaxed pl-1">
                              {item.description}
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                              <div className="flex items-center gap-2">
                                <span>
                                  Linhas Vinculadas:{' '}
                                  <strong className="text-[#004C97] font-mono">
                                    {item.line_codes?.join(', ') || 'Todas as Linhas'}
                                  </strong>
                                </span>
                                {item.product_code && (
                                  <span>
                                    &bull; Produto: <strong>{item.product_code}</strong>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span>
                                  Responsável: <strong>{item.responsible_name}</strong>
                                </span>
                                <span>
                                  Prazo: <strong>{item.deadline}</strong>
                                </span>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedItemForComm(item)
                                    setCommModalOpen(true)
                                  }}
                                  className="h-6 text-[10px] bg-white border-slate-300 text-[#004C97] hover:bg-blue-50 gap-1 font-semibold"
                                >
                                  <Megaphone className="w-3 h-3" /> Gerar Comunicado
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal para Gerar Comunicado a partir do Item de ATA */}
      <ConvertToCommModal
        item={selectedItemForComm}
        open={commModalOpen}
        onOpenChange={setCommModalOpen}
        onSuccess={() => {
          toast({
            title: 'Comunicado PCP Gerado com Sucesso',
            description: 'Vínculo permanente registrado entre ATA ➔ Decisão ➔ Comunicado.',
          })
        }}
      />
    </div>
  )
}
export default MeetingMinutesView
