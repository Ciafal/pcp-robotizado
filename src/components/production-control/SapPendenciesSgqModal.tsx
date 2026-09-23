import React, { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Save,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import type { SapPendencySgqMapping, SapPendencyCategory } from '@/types/sap-pendencies'
import { sapPendenciesService } from '@/services/sap-pendencies-service'

interface SapPendenciesSgqModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SapPendenciesSgqModal: React.FC<SapPendenciesSgqModalProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast()
  const [mappings, setMappings] = useState<SapPendencySgqMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form states
  const [category, setCategory] = useState<SapPendencyCategory>('Estoque')
  const [sapMsgCode, setSapMsgCode] = useState('')
  const [sgqDocCode, setSgqDocCode] = useState('')
  const [sgqTitle, setSgqTitle] = useState('')
  const [sgqRevision, setSgqRevision] = useState('Rev.01')
  const [applicableProcedure, setApplicableProcedure] = useState('')
  const [recommendedStep, setRecommendedStep] = useState('')
  const [responsible, setResponsible] = useState('Almoxarifado / PCP')

  useEffect(() => {
    if (open) {
      loadMappings()
    }
  }, [open])

  const loadMappings = async () => {
    setLoading(true)
    try {
      const list = await sapPendenciesService.listSgqMappings()
      setMappings(list)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sgqDocCode || !sgqTitle || !applicableProcedure) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe código, título e procedimento aplicável.',
        variant: 'destructive',
      })
      return
    }

    const success = await sapPendenciesService.saveSgqMapping({
      id: editingId || undefined,
      category,
      sap_msg_code: sapMsgCode || undefined,
      sgq_document_code: sgqDocCode,
      sgq_document_title: sgqTitle,
      sgq_document_revision: sgqRevision,
      sgq_applicable_procedure: applicableProcedure,
      sgq_recommended_step: recommendedStep || undefined,
      sgq_procedure_responsible: responsible || undefined,
      active: true,
    })

    if (success) {
      toast({
        title: 'Mapeamento SGQ salvo',
        description: 'A inteligência artificial agora utilizará esta diretriz oficial.',
      })
      resetForm()
      loadMappings()
    } else {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar o mapeamento SGQ.',
        variant: 'destructive',
      })
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setCategory('Estoque')
    setSapMsgCode('')
    setSgqDocCode('')
    setSgqTitle('')
    setSgqRevision('Rev.01')
    setApplicableProcedure('')
    setRecommendedStep('')
    setResponsible('Almoxarifado / PCP')
  }

  const handleEdit = (m: SapPendencySgqMapping) => {
    setEditingId(m.id)
    setCategory(m.category)
    setSapMsgCode(m.sap_msg_code || '')
    setSgqDocCode(m.sgq_document_code)
    setSgqTitle(m.sgq_document_title)
    setSgqRevision(m.sgq_document_revision)
    setApplicableProcedure(m.sgq_applicable_procedure)
    setRecommendedStep(m.sgq_recommended_step || '')
    setResponsible(m.sgq_procedure_responsible || '')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-white p-0 gap-0 overflow-hidden h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30 text-blue-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white tracking-tight">
                Matriz de Procedimentos SGQ — Resoluções SAP
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Associação Categoria / Mensagem SAP com Documentos Oficiais do SGQ (Guardrail contra
                invenção de procedimentos).
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo com Grid Formulário + Lista */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Formulário (4 colunas) */}
          <form
            onSubmit={handleSave}
            className="md:col-span-5 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800 uppercase text-[10px]">
                {editingId ? 'Editar Associação SGQ' : 'Nova Associação SGQ'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-blue-600 hover:underline text-[11px]"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Categoria de Ocorrência SAP
              </label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as SapPendencyCategory)}
              >
                <SelectTrigger className="h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estoque">Estoque</SelectItem>
                  <SelectItem value="Saldo/Reserva">Saldo/Reserva</SelectItem>
                  <SelectItem value="Contábil">Contábil</SelectItem>
                  <SelectItem value="Cadastro">Cadastro</SelectItem>
                  <SelectItem value="Lote">Lote</SelectItem>
                  <SelectItem value="Ordem de Produção">Ordem de Produção</SelectItem>
                  <SelectItem value="Confirmação">Confirmação</SelectItem>
                  <SelectItem value="Integração">Integração</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Código Mensagem SAP (Opcional)
              </label>
              <Input
                value={sapMsgCode}
                onChange={(e) => setSapMsgCode(e.target.value)}
                placeholder="Ex: M7021, M7043, RU010..."
                className="h-8 text-xs font-mono bg-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Código Doc. SGQ *
                </label>
                <Input
                  value={sgqDocCode}
                  onChange={(e) => setSgqDocCode(e.target.value)}
                  placeholder="PO-EST-005"
                  className="h-8 text-xs font-mono bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Revisão *
                </label>
                <Input
                  value={sgqRevision}
                  onChange={(e) => setSgqRevision(e.target.value)}
                  placeholder="Rev.03"
                  className="h-8 text-xs font-mono bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Título do Documento SGQ *
              </label>
              <Input
                value={sgqTitle}
                onChange={(e) => setSgqTitle(e.target.value)}
                placeholder="Procedimento Operacional de Regularização..."
                className="h-8 text-xs bg-white"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Procedimento Aplicável (Texto da Norma) *
              </label>
              <Textarea
                value={applicableProcedure}
                onChange={(e) => setApplicableProcedure(e.target.value)}
                placeholder="Item 4.2 - Verificação física imediata no depósito de consumo..."
                className="h-16 text-xs bg-white font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Etapa Recomendada / Passos
              </label>
              <Input
                value={recommendedStep}
                onChange={(e) => setRecommendedStep(e.target.value)}
                placeholder="1. Conferir inventário; 2. Solicitar transferência..."
                className="h-8 text-xs bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                Responsável pelo Procedimento
              </label>
              <Input
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Ex: Almoxarifado Central"
                className="h-8 text-xs bg-white"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              className="w-full h-8 text-xs bg-blue-700 hover:bg-blue-800 text-white gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {editingId ? 'Atualizar Associação' : 'Salvar Associação SGQ'}
            </Button>
          </form>

          {/* Lista de Associações Vigentes (7 colunas) */}
          <div className="md:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 uppercase text-[10px]">
                Procedimentos Oficiais Registrados ({mappings.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Fonte da Verdade SGQ</span>
            </div>

            <div className="space-y-2 max-h-[64vh] overflow-y-auto pr-1">
              {mappings.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-colors text-xs space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                        {m.category}
                      </Badge>
                      {m.sap_msg_code && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {m.sap_msg_code}
                        </Badge>
                      )}
                      <span className="font-mono font-bold text-slate-800 text-[11px]">
                        {m.sgq_document_code} ({m.sgq_document_revision})
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(m)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="text-slate-800 font-medium">{m.sgq_document_title}</div>

                  <p className="text-slate-600 text-[11px] bg-slate-50 p-2 rounded border border-slate-100 font-mono leading-relaxed">
                    {m.sgq_applicable_procedure}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>
                      Responsável: <strong>{m.sgq_procedure_responsible || 'PCP'}</strong>
                    </span>
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Ativo para IA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-end shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 bg-slate-800 hover:bg-slate-900 text-white"
          >
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
