/**
 * CENTRAL DE ATAS & MINUTA IA — FATIA 2 (HUB CIAFAL)
 * Implementa o Bloco 2:
 * - Geração de ATA Final por IA a partir de Prévia + Reunião + Decisões + Presenças + Transcrição;
 * - Versionamento estrito: PRÉVIA V1 -> PRÉVIA ENVIADA V2 -> ATA DURANTE REUNIÃO V3 -> MINUTA IA V4 -> ATA APROVADA V5;
 * - Comparação tripla estruturada: PRÉVIA | REUNIÃO | ATA FINAL com classificação de mudanças;
 * - NUNCA inventa informações (se indisponível: "INFORMAÇÃO NÃO DISPONÍVEL" ou "NECESSITA VALIDAÇÃO");
 * - Revisão humana (editar, aceitar, rejeitar alterações, salvar rascunho);
 * - Fluxo de aprovação e publicação formal com geração de PDF no template oficial SGQ 8.1.001-R002 Rev 8.
 */

import React, { useState, useEffect } from 'react'
import {
  PCPMeetingRecord,
  PCPMeetingAtaRecord,
  AtaDiffItem,
  DiffClassification,
} from '@/types/pcp-meeting'
import { pcpMeetingFatia1Service } from '@/services/pcp-meeting-fatia1-service'
import { pcpMeetingFatia2Service } from '@/services/pcp-meeting-fatia2-service'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  Printer,
  Send,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  Eye,
  Check,
  X,
  Edit2,
  AlertTriangle,
  History,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CentralAtasFatia2ViewProps {
  initialMeetingId?: string
  currentUser: { id?: string; name: string }
  onNavigateTab: (tab: string, meetingId?: string) => void
}

export const CentralAtasFatia2View: React.FC<CentralAtasFatia2ViewProps> = ({
  initialMeetingId,
  currentUser,
  onNavigateTab,
}) => {
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<PCPMeetingRecord[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<PCPMeetingRecord | null>(null)
  const [atasList, setAtasList] = useState<PCPMeetingAtaRecord[]>([])
  const [selectedAta, setSelectedAta] = useState<PCPMeetingAtaRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [approving, setApproving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Comparação e Revisão Humana
  const [diffItems, setDiffItems] = useState<AtaDiffItem[]>([])
  const [filterDiff, setFilterDiff] = useState<string>('TODAS')
  const [editingDiff, setEditingDiff] = useState<AtaDiffItem | null>(null)
  const [editedFinalText, setEditedFinalText] = useState('')

  // Modal de Aprovação / Publicação
  const [approvalModal, setApprovalModal] = useState(false)
  const [publishModal, setPublishModal] = useState(false)

  useEffect(() => {
    loadMeetings()
  }, [])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const list = await pcpMeetingFatia1Service.listMeetings()
      setMeetings(list)

      if (list.length > 0) {
        const target = initialMeetingId
          ? list.find((m) => m.id === initialMeetingId) || list[0]
          : list[0]
        setSelectedMeeting(target)
        await loadAtasForMeeting(target.id)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar reuniões',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAtasForMeeting = async (meetingId: string) => {
    try {
      const atas = await pcpMeetingFatia2Service.listAtas(meetingId)
      setAtasList(atas)
      if (atas.length > 0) {
        const topAta = atas[0]
        setSelectedAta(topAta)
        setDiffItems(topAta.comparison_data || [])
      } else {
        setSelectedAta(null)
        setDiffItems([])
      }
    } catch (err: any) {
      toast({ title: 'Erro ao carregar ATAs', description: err.message, variant: 'destructive' })
    }
  }

  const handleSelectMeeting = async (m: PCPMeetingRecord) => {
    setSelectedMeeting(m)
    await loadAtasForMeeting(m.id)
  }

  // =========================================================================
  // GERAÇÃO DA ATA FINAL COM IA (V4)
  // =========================================================================
  const handleGenerateFinalAta = async () => {
    if (!selectedMeeting) return
    setGeneratingAi(true)
    try {
      const newAta = await pcpMeetingFatia2Service.generateFinalAtaWithAi(
        selectedMeeting.id,
        currentUser,
      )
      setSelectedAta(newAta)
      setDiffItems(newAta.comparison_data || [])
      await loadMeetings()
      toast({
        title: 'Minuta da ATA Final Gerada por IA!',
        description: `Criada nova versão V${newAta.version} com comparativo e conciliação de decisões.`,
      })
    } catch (err: any) {
      toast({
        title: 'Não foi possível gerar ATA com IA',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingAi(false)
    }
  }

  // =========================================================================
  // REVISÃO HUMANA: ACEITAR / REJEITAR / EDITAR
  // =========================================================================
  const handleReviewItemAction = (
    index: number,
    newStatus: 'ACEITO' | 'REJEITADO' | 'EDITADO',
    customText?: string,
  ) => {
    const updated = [...diffItems]
    updated[index].statusRevisao = newStatus
    if (customText !== undefined) {
      updated[index].definidoAtaFinal = customText
    }
    setDiffItems(updated)
    toast({
      title: `Item ${newStatus}`,
      description: 'Alteração salva na minuta de revisão.',
    })
  }

  // =========================================================================
  // FLUXO DE APROVAÇÃO & PUBLICAÇÃO
  // =========================================================================
  const handleSubmitForApproval = async () => {
    if (!selectedMeeting || !selectedAta) return
    try {
      await pcpMeetingFatia2Service.submitAtaForApproval(
        selectedMeeting.id,
        selectedAta.id!,
        currentUser,
      )
      await loadMeetings()
      toast({
        title: 'Enviada para Aprovação',
        description: 'Status atualizado para AGUARDANDO APROVAÇÃO da gerência/coordenação.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar para aprovação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleApproveAta = async () => {
    if (!selectedMeeting || !selectedAta) return
    setApproving(true)
    try {
      await pcpMeetingFatia2Service.approveAta(selectedMeeting.id, selectedAta.id!, currentUser)
      setApprovalModal(false)
      await loadMeetings()
      toast({
        title: 'ATA Aprovada Formalmente!',
        description: `Aprovação registrada por ${currentUser.name}. Habilitada publicação oficial.`,
      })
    } catch (err: any) {
      toast({ title: 'Erro ao aprovar', description: err.message, variant: 'destructive' })
    } finally {
      setApproving(false)
    }
  }

  const handlePublishAta = async () => {
    if (!selectedMeeting || !selectedAta) return
    setPublishing(true)
    try {
      await pcpMeetingFatia2Service.publishAta(selectedMeeting.id, selectedAta.id!, currentUser)
      setPublishModal(false)
      await loadMeetings()
      toast({
        title: 'ATA Publicada com Sucesso no HUB!',
        description: 'Documento oficializado com PDF corporativo e bloqueio contra edições.',
      })
    } catch (err: any) {
      toast({ title: 'Erro ao publicar', description: err.message, variant: 'destructive' })
    } finally {
      setPublishing(false)
    }
  }

  // =========================================================================
  // IMPRESSÃO / EXPORTAÇÃO PDF SGQ OFICIAL
  // =========================================================================
  const handlePrintPdf = () => {
    window.print()
  }

  const filteredDiffs = diffItems.filter((item) => {
    if (filterDiff === 'TODAS') return true
    return item.classificacao === filterDiff
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-[#004C97] mb-2" />
        <span className="text-xs font-semibold">Carregando Central de ATAs & Minutas IA...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. CABEÇALHO COMPACTO DA CENTRAL */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#004C97]" />
            Central de ATAs Oficiais & Minuta IA (SGQ 8.1.001-R002 Rev 8)
          </h2>
          <p className="text-xs text-slate-500">
            Versionamento auditável (V1 Prévia ➔ V3 Ao Vivo ➔ V4 Minuta IA ➔ V5 Aprovada). Nenhuma
            informação é inventada pela IA.
          </p>
        </div>

        {selectedMeeting && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintPdf}
              className="text-xs h-8 border-slate-300 font-semibold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / PDF SGQ
            </Button>

            {/* Ação: Gerar Minuta IA (após encerramento) */}
            {(selectedMeeting.status === 'AGUARDANDO_ATA_FINAL' ||
              selectedMeeting.status === 'REALIZADA' ||
              selectedMeeting.status === 'MINUTA_GERADA') && (
              <Button
                size="sm"
                onClick={handleGenerateFinalAta}
                disabled={generatingAi}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {generatingAi ? 'Gerando com IA...' : 'GERAR ATA FINAL COM IA'}
              </Button>
            )}

            {/* Ação: Enviar para Aprovação */}
            {selectedMeeting.status === 'MINUTA_GERADA' && (
              <Button
                size="sm"
                onClick={handleSubmitForApproval}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Enviar para Aprovação
              </Button>
            )}

            {/* Ação: Aprovar ATA */}
            {selectedMeeting.status === 'AGUARDANDO_APROVACAO' && (
              <Button
                size="sm"
                onClick={() => setApprovalModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Aprovar ATA
              </Button>
            )}

            {/* Ação: Publicar ATA */}
            {selectedMeeting.status === 'ATA_APROVADA' && (
              <Button
                size="sm"
                onClick={() => setPublishModal(true)}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs h-8"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Publicar Oficialmente
              </Button>
            )}

            {selectedMeeting.status === 'PUBLICADA' && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs py-1">
                ✓ ATA PUBLICADA OFICIALMENTE
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 2. GRID PRINCIPAL: LISTA LATERAL DE REUNIÕES + PAINEL DE CONTEÚDO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* COLUNA ESQUERDA: LISTA DE REUNIÕES */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-1">
            Selecione a Reunião / ATA
          </span>
          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {meetings.map((m) => {
              const isSelected = selectedMeeting?.id === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectMeeting(m)}
                  className={`w-full text-left p-3 rounded-lg border transition-all space-y-1.5 ${
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
                    <span className="font-semibold text-slate-700">
                      {m.status.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{m.meeting_code}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* COLUNA DIREITA: VISUALIZADOR DA ATA & COMPARATIVO PRÉVIA X REUNIÃO */}
        <div className="lg:col-span-8 space-y-4">
          {selectedMeeting && selectedAta ? (
            <Card className="bg-white border-slate-200 shadow-sm print:border-none print:shadow-none">
              {/* Header Formal Corporativo SGQ da ATA */}
              <div className="border-b border-slate-200 p-4 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                        SGQ 8.1.001-R002 Rev 8
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Versão {selectedAta.version}.0 ({selectedAta.ata_type})
                      </Badge>
                      <Badge className="bg-slate-800 text-white text-[10px]">
                        Status: {selectedAta.status}
                      </Badge>
                    </div>
                    <h1 className="text-base font-extrabold text-slate-900 tracking-tight mt-1">
                      ATA DA REUNIÃO PCP — SEMANA {selectedMeeting.week}/{selectedMeeting.year}
                    </h1>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      Empresa: {selectedMeeting.company} &bull; Data: {selectedMeeting.meeting_date}{' '}
                      &bull; Horário: {selectedMeeting.start_time} às{' '}
                      {selectedMeeting.expected_end_time}
                    </p>
                  </div>

                  <div className="text-right text-xs text-slate-500 font-mono">
                    {selectedAta.published_at && (
                      <div>
                        Publicado em:{' '}
                        <strong>
                          {new Date(selectedAta.published_at).toLocaleString('pt-BR')}
                        </strong>
                      </div>
                    )}
                    {selectedAta.published_by && (
                      <div>
                        Por: <strong>{selectedAta.published_by}</strong>
                      </div>
                    )}
                    {selectedAta.approver_name && (
                      <div className="text-emerald-700 font-semibold">
                        Aprovado por: {selectedAta.approver_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <CardContent className="p-4 space-y-5 text-xs">
                {/* 1. TELA DE COMPARAÇÃO PRÉVIA X REUNIÃO X ATA FINAL */}
                {diffItems.length > 0 && (
                  <div className="space-y-3 border-b pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 text-xs">
                          <History className="w-4 h-4 text-[#004C97]" />
                          Comparativo Inteligente: PRÉVIA | REUNIÃO | ATA FINAL
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Identificação objetiva de alterações entre o planejado antes e o pactuado
                          na reunião.
                        </p>
                      </div>

                      {/* Filtro de classificação */}
                      <div className="flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <select
                          value={filterDiff}
                          onChange={(e) => setFilterDiff(e.target.value)}
                          className="text-xs border rounded px-2 py-1 bg-white font-semibold"
                        >
                          <option value="TODAS">Todas as Alterações</option>
                          <option value="ATUALIZADO">Atualizados</option>
                          <option value="DECISAO_NOVA">Decisões Novas</option>
                          <option value="INFORMACAO_NOVA">Informações Novas</option>
                          <option value="INFORMACAO_REMOVIDA">Adiados / Removidos</option>
                          <option value="SEM_ALTERACAO">Sem Alteração</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {filteredDiffs.map((diff, idx) => (
                        <div
                          key={idx}
                          className="border rounded-lg p-3 bg-white space-y-2 text-xs shadow-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-bold text-[10px]">
                                {diff.secaoNome}
                              </Badge>
                              <strong className="text-slate-900">{diff.campo}</strong>
                              <Badge
                                className={`text-[9px] font-bold ${
                                  diff.classificacao === 'DECISAO_NOVA'
                                    ? 'bg-blue-600 text-white'
                                    : diff.classificacao === 'ATUALIZADO'
                                      ? 'bg-amber-600 text-white'
                                      : diff.classificacao === 'INFORMACAO_NOVA'
                                        ? 'bg-emerald-600 text-white'
                                        : diff.classificacao === 'INFORMACAO_REMOVIDA'
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-slate-600 text-white'
                                }`}
                              >
                                {diff.classificacao.replace(/_/g, ' ')}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500 font-mono">
                                Status: <strong>{diff.statusRevisao}</strong>
                              </span>
                              {selectedAta.status !== 'PUBLICADA' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReviewItemAction(idx, 'ACEITO')}
                                    className="text-[10px] h-6 px-1.5 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <Check className="w-3 h-3 mr-0.5" /> Aceitar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReviewItemAction(idx, 'REJEITADO')}
                                    className="text-[10px] h-6 px-1.5 text-rose-700 hover:bg-rose-50"
                                  >
                                    <X className="w-3 h-3 mr-0.5" /> Rejeitar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingDiff(diff)
                                      setEditedFinalText(diff.definidoAtaFinal)
                                    }}
                                    className="text-[10px] h-6 px-1.5 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Edit2 className="w-3 h-3 mr-0.5" /> Editar
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Comparador em 3 Colunas */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px]">
                            <div>
                              <span className="font-bold text-slate-500 block uppercase text-[10px]">
                                1. Antes da Reunião (Prévia)
                              </span>
                              <p className="text-slate-700 mt-1">{diff.antesPrevia}</p>
                            </div>
                            <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-1 md:pt-0 md:pl-2">
                              <span className="font-bold text-amber-700 block uppercase text-[10px]">
                                2. Definido na Reunião
                              </span>
                              <p className="text-slate-900 font-semibold mt-1">
                                {diff.duranteReuniao}
                              </p>
                            </div>
                            <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-1 md:pt-0 md:pl-2">
                              <span className="font-bold text-emerald-700 block uppercase text-[10px]">
                                3. Redação ATA Final
                              </span>
                              <p className="text-slate-900 mt-1">{diff.definidoAtaFinal}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. CONTEÚDO OFICIAL DAS SEÇÕES DA ATA (SGQ) */}
                <div className="space-y-4">
                  <span className="font-extrabold text-slate-900 uppercase tracking-wide block text-xs">
                    Estrutura Completa de Seções Corporativas (SGQ 8.1.001-R002 Rev 8)
                  </span>

                  {Object.entries(selectedAta.structured_content.secoes || {}).map(
                    ([secKey, sec]) => (
                      <div
                        key={secKey}
                        className="border border-slate-200 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between border-b pb-1.5">
                          <span className="font-bold text-slate-900 uppercase tracking-wide text-xs">
                            {sec.nome}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sec.itens?.length || 0} deliberações
                          </span>
                        </div>

                        {sec.itens && sec.itens.length > 0 ? (
                          <div className="space-y-1.5">
                            {sec.itens.map((it, itIdx) => (
                              <div
                                key={it.id || itIdx}
                                className="bg-slate-50 p-2 rounded text-xs space-y-0.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800">{it.topico}</span>
                                  <Badge variant="outline" className="text-[9px]">
                                    {it.responsavel || 'PCP'}
                                  </Badge>
                                </div>
                                <p className="text-slate-700">{it.detalhes}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Sem deliberações específicas nesta seção.
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg border border-slate-200 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500">
                Nenhuma ATA gerada ainda para esta reunião. Inicie a reunião ou gere a prévia na
                Preparação.
              </p>
              <Button
                size="sm"
                onClick={() => onNavigateTab('preparacao', selectedMeeting?.id)}
                className="bg-[#004C97] text-white text-xs font-bold"
              >
                Ir para Preparação
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDITAR REDAÇÃO FINAL DE ITEM DIFF */}
      <Dialog open={!!editingDiff} onOpenChange={() => setEditingDiff(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Editar Redação da ATA Final
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Ajuste o texto final que constará na ATA corporativa sem descaracterizar a decisão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Antes (Prévia):</label>
              <p className="p-2 bg-slate-50 rounded border text-slate-700">
                {editingDiff?.antesPrevia}
              </p>
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">
                Definido na Reunião:
              </label>
              <p className="p-2 bg-amber-50 rounded border text-amber-900">
                {editingDiff?.duranteReuniao}
              </p>
            </div>
            <div>
              <label className="font-semibold text-slate-900 block mb-1">
                Texto Final na ATA *
              </label>
              <Textarea
                value={editedFinalText}
                onChange={(e) => setEditedFinalText(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingDiff(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (editingDiff) {
                  const idx = diffItems.findIndex((d) => d === editingDiff)
                  if (idx >= 0) {
                    handleReviewItemAction(idx, 'EDITADO', editedFinalText)
                  }
                  setEditingDiff(null)
                }
              }}
              className="bg-[#004C97] text-white font-bold"
            >
              Salvar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: APROVAÇÃO FORMAL */}
      <Dialog open={approvalModal} onOpenChange={setApprovalModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Aprovação Formal da ATA
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta ação valida formalmente a versão final da ATA para publicação oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <p>
              Você está aprovando como: <strong>{currentUser.name}</strong>.
            </p>
            <p className="text-slate-500 text-[11px]">
              O carimbo eletrônico de aprovação ficará gravado na trilha de auditoria do SGQ.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApprovalModal(false)}>
              Voltar
            </Button>
            <Button
              size="sm"
              disabled={approving}
              onClick={handleApproveAta}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {approving ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: PUBLICAÇÃO OFICIAL */}
      <Dialog open={publishModal} onOpenChange={setPublishModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" /> Publicação Oficial no HUB CIAFAL
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A publicação oficial torna a ATA um documento SGQ imutável e acessível a toda a
              diretoria e fábrica.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <p className="text-slate-700">
              A ATA da{' '}
              <strong>
                Semana {selectedMeeting?.week}/{selectedMeeting?.year}
              </strong>{' '}
              será publicada como versão definitiva.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPublishModal(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={publishing}
              onClick={handlePublishAta}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-bold"
            >
              {publishing ? 'Publicando...' : 'Publicar Agora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default CentralAtasFatia2View
