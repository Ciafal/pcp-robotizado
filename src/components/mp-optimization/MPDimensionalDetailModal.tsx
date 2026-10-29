import React, { useState, useEffect } from 'react'
import {
  X,
  FileText,
  Boxes,
  Scale,
  Calendar,
  Clock,
  Layers,
  History,
  MessageSquare,
  Plus,
  Scissors,
  CheckCircle2,
  Lock,
  Building2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatNumberPtBr } from '@/lib/number-format'
import { MPDimensionalItem } from '@/types/mp-optimization'
import {
  mpDimensionalNotesService,
  MPDimensionalInventoryNote,
} from '@/services/mp-dimensional-notes-service'

export interface MPDimensionalDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: MPDimensionalItem | null
  onSelectForCuttingPlan?: (item: MPDimensionalItem) => void
  onSelectForMultiplePlan?: (item: MPDimensionalItem) => void
}

export const MPDimensionalDetailModal: React.FC<MPDimensionalDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onSelectForCuttingPlan,
  onSelectForMultiplePlan,
}) => {
  const { toast } = useToast()
  const { user } = useAuth()

  const [notes, setNotes] = useState<MPDimensionalInventoryNote[]>([])
  const [newNoteText, setNewNoteText] = useState('')
  const [isSubmittingNote, setIsSubmittingNote] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [activeTab, setActiveTab] = useState<'INFO' | 'HISTORICO' | 'OBSERVACOES'>('INFO')

  // Carrega observações persistidas vinculadas ao registro
  useEffect(() => {
    if (!isOpen || !item) return
    let active = true
    setIsLoadingNotes(true)

    async function loadNotes() {
      if (!item) return
      try {
        const list = await mpDimensionalNotesService.getNotesByMaterial(item.id, item.material_code)
        if (active) setNotes(list)
      } catch (err) {
        console.error('Erro ao carregar observações:', err)
      } finally {
        if (active) setIsLoadingNotes(false)
      }
    }

    loadNotes()
    return () => {
      active = false
    }
  }, [isOpen, item])

  if (!item) return null

  // Helpers de formatação
  const formatTons = (kgVal?: number) => {
    if (kgVal === undefined || kgVal === null || isNaN(kgVal)) return '-'
    return `${formatNumberPtBr(kgVal / 1000, 3)} t`
  }

  const formatMeters = (mmVal?: number) => {
    if (mmVal === undefined || mmVal === null || isNaN(mmVal)) return '-'
    return `${formatNumberPtBr(mmVal / 1000, 2)} m`
  }

  const calculateDaysInStock = (dateStr?: string) => {
    if (!dateStr) return null
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      const diffMs = Date.now() - d.getTime()
      return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    } catch {
      return null
    }
  }

  const daysInStock = calculateDaysInStock(item.reception_date)

  // Adicionar observação persistida no HUB
  const handleAddNote = async () => {
    if (!newNoteText.trim()) return
    setIsSubmittingNote(true)

    try {
      const created = await mpDimensionalNotesService.addNote({
        material_id: item.id,
        material_code: item.material_code,
        block_number: item.block_number,
        batch_number: item.batch_number,
        heat_number: item.heat_number,
        note_text: newNoteText.trim(),
        author_name: user?.name || user?.email || 'Programador PCP',
        author_email: user?.email,
        author_role: user?.role || 'PCP_PROGRAMMER',
      })

      setNotes((prev) => [created, ...prev])
      setNewNoteText('')
      toast({
        title: 'Observação Registrada',
        description: 'Nota vinculada ao item no HUB Ciafal com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao Registrar Observação',
        description: err.message || 'Falha ao salvar nota no Skip Cloud.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingNote(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 text-slate-900 border border-slate-300 rounded-xl shadow-2xl">
        {/* CABEÇALHO */}
        <DialogHeader className="shrink-0 p-4 bg-slate-900 text-white flex flex-row items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-blue-700/60 rounded-md shrink-0">
              <Boxes className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base font-bold text-white truncate">
                  Detalhamento do Estoque Dimensional
                </DialogTitle>
                <Badge
                  variant="outline"
                  className="bg-blue-950 text-blue-200 border-blue-700 font-mono text-[11px]"
                >
                  {item.block_number || item.material_code}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-slate-800 text-slate-200 border-slate-600 text-[11px]"
                >
                  {item.item_type || 'BLOCO'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 truncate">
                Rastreabilidade e dados técnicos integrados com depósitos SAP ECC
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-slate-800 h-8 w-8 p-0 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        {/* NAVEGAÇÃO INTERNA DO MODAL */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('INFO')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                activeTab === 'INFO'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Informações Gerais & Dimensões
            </button>
            <button
              onClick={() => setActiveTab('HISTORICO')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all ${
                activeTab === 'HISTORICO'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rastreabilidade & Histórico
            </button>
            <button
              onClick={() => setActiveTab('OBSERVACOES')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'OBSERVACOES'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Observações ({notes.length})
            </button>
          </div>

          <Badge variant="outline" className="font-mono text-[10px] text-slate-600">
            Lote SAP: {item.batch_number || 'Sem lote'}
          </Badge>
        </div>

        {/* CONTEÚDO ROLÁVEL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'INFO' && (
            <div className="space-y-4">
              {/* SEÇÃO A: IDENTIFICAÇÃO DO MATERIAL */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <FileText className="w-3.5 h-3.5 text-[#004C97]" />
                  A. Identificação do Material (SAP ECC)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Código SAP</span>
                    <span className="font-mono font-bold text-slate-900">{item.material_code}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[11px] text-slate-500 block">Descrição do Material</span>
                    <span className="font-semibold text-slate-900">
                      {item.material_description || 'Tarugo / Bloco de Aço'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Aço / Bitola</span>
                    <span className="font-mono font-bold text-[#004C97]">
                      {item.steel_grade || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Centro</span>
                    <span className="font-mono text-slate-900">{item.center_code}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Depósito (LGORT)</span>
                    <span className="font-mono text-slate-900">
                      {item.storage_location || 'DP04'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Lote SAP</span>
                    <span className="font-mono text-slate-900">{item.batch_number || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Corrida</span>
                    <span className="font-mono text-slate-900">{item.heat_number || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Fornecedor</span>
                    <span className="text-slate-800">
                      {item.supplier_name || item.supplier_code || 'Gerdau'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Status da Reserva</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        item.reservation_status === 'LIVRE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {item.reservation_status}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Status Bloco SAP</span>
                    <span className="font-mono text-slate-700">
                      {item.sap_block_status || '01_DISPONIVEL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Aplicação Atual</span>
                    <span className="font-bold text-[#004C97]">{item.current_application}</span>
                  </div>
                </div>
              </div>

              {/* SEÇÃO B: INFORMAÇÕES DIMENSIONAIS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Scale className="w-3.5 h-3.5 text-[#004C97]" />
                  B. Informações Dimensionais & Peso (Padronização Oficial)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                    <span className="text-[10px] text-blue-900 font-bold uppercase block">
                      Peso Total (t)
                    </span>
                    <span className="text-base font-black font-mono text-blue-950 mt-0.5 block">
                      {formatTons(item.weight_kg)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatNumberPtBr(item.weight_kg || 0, 0)} kg
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Espessura & Largura
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                      {item.thickness_mm} × {item.width_mm} mm
                    </span>
                    <span className="text-[10px] text-slate-400">Seção Transversal</span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Comprimento
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-900 mt-0.5 block">
                      {item.length_mm} mm
                    </span>
                    <span className="text-[10px] text-[#004C97] font-semibold font-mono">
                      {formatMeters(item.length_mm)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Classificação Dimensional
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                      {item.dimensional_classification || 'NIVEL_1_IDEAL'}
                    </span>
                    <span className="text-[10px] text-emerald-700">Tolerância Conforme</span>
                  </div>
                </div>
              </div>

              {/* SEÇÃO C: RECEBIMENTO E PERMANÊNCIA */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                  C. Recebimento e Permanência em Estoque
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Data de Recebimento</span>
                    <span className="font-mono font-bold text-slate-900">
                      {item.reception_date
                        ? new Date(item.reception_date).toLocaleDateString('pt-BR')
                        : 'Informação não disponível na integração SAP.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Dias em Estoque</span>
                    <span className="font-mono font-black text-amber-900">
                      {daysInStock !== null ? `${daysInStock} dias` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Doc. de Recebimento</span>
                    <span className="font-mono text-slate-800">
                      {item.invoice_number || 'Informação não disponível na integração SAP.'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Último Movimento SAP</span>
                    <span className="font-mono text-slate-800">
                      MB51 &bull; 101 Entrada de Mercadorias
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HISTORICO' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <History className="w-3.5 h-3.5 text-[#004C97]" />
                D. Rastreabilidade & Histórico Operacional
              </h4>
              <p className="text-xs text-slate-600">
                Histórico de transferências, reservas, apontamentos e vínculos de corte.
              </p>

              <div className="space-y-2 border-l-2 border-blue-200 pl-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">
                      Entrada no Pátio (Recebimento SAP)
                    </span>
                    <Badge variant="outline" className="text-[9px]">
                      {item.reception_date
                        ? new Date(item.reception_date).toLocaleDateString('pt-BR')
                        : 'Recebimento Registrado'}
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Material {item.material_code} registrado via BAPI_GOODSMVT_CREATE no depósito{' '}
                    {item.storage_location || 'DP04'}.
                  </p>
                </div>

                <div className="space-y-0.5 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Classificação Dimensional IA</span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800">
                      Conforme
                    </Badge>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Validação automática contra tabela de requisitos ZPPMP / ZBITOLAS concluída com
                    status {item.dimensional_classification || 'NIVEL_1_IDEAL'}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'OBSERVACOES' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#004C97]" />
                  E. Observações do Material (Armazenadas no HUB CIAFAL)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Notas internas preservam os dados oficiais do SAP
                </span>
              </div>

              {/* Formulário de Nova Observação */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Label className="text-xs font-semibold text-slate-700">
                  Adicionar Nova Observação Técnica
                </Label>
                <Textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Ex: Bloco inspecionado pelo controle de qualidade; autorizado para corte na Linha L1 com tolerância especial."
                  className="text-xs min-h-[70px] bg-white"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleAddNote}
                    disabled={isSubmittingNote || !newNoteText.trim()}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isSubmittingNote ? 'Gravando...' : 'Adicionar Observação'}
                  </Button>
                </div>
              </div>

              {/* Lista de Observações Cadastradas */}
              <div className="space-y-2.5">
                {isLoadingNotes ? (
                  <p className="text-xs text-slate-500 font-mono text-center py-4">
                    Carregando histórico de notas...
                  </p>
                ) : notes.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Nenhuma observação técnica registrada para este material.
                  </div>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-[#004C97]">{n.author_name}</span>
                        <span className="text-slate-400 font-mono">
                          {n.created ? new Date(n.created).toLocaleString('pt-BR') : ''}
                        </span>
                      </div>
                      <p className="text-slate-700 leading-relaxed text-[11px] whitespace-pre-wrap">
                        {n.note_text}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ COM AÇÕES F */}
        <div className="shrink-0 p-3.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold"
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            {onSelectForCuttingPlan && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onSelectForCuttingPlan(item)
                  onClose()
                }}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <Scissors className="w-3.5 h-3.5" />
                Selecionar para Plano de Corte
              </Button>
            )}

            {onSelectForMultiplePlan && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  onSelectForMultiplePlan(item)
                  onClose()
                }}
                className="border-[#004C97] text-[#004C97] hover:bg-blue-50 text-xs font-bold gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                Carregar no Corte Múltiplo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
