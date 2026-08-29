import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Megaphone,
  Layers,
  X,
} from 'lucide-react'
import { ItemClassification, ItemCategory, PCPMinuteItem } from '@/types/pcp-meetings-comms'
import { pcpMeetingService } from '@/services/pcp-meeting-service'
import { useToast } from '@/hooks/use-toast'

interface FastItemModalProps {
  meetingId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (item: PCPMinuteItem) => void
  initialClassification?: ItemClassification
  availableLines?: string[]
}

export const FastItemModal: React.FC<FastItemModalProps> = ({
  meetingId,
  open,
  onOpenChange,
  onSuccess,
  initialClassification = 'DECISAO',
  availableLines = ['L01', 'L02', 'L03', 'L04', 'ENDL1', 'ACABL1'],
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [classification, setClassification] = useState<ItemClassification>(initialClassification)
  const [category, setCategory] = useState<ItemCategory>('GERAL')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [responsibleName, setResponsibleName] = useState('')
  const [sector, setSector] = useState('PCP')
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  )
  const [impactLevel, setImpactLevel] = useState<'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO'>('MEDIO')

  // Vínculo Multilinhas 1:N
  const [selectedLines, setSelectedLines] = useState<string[]>(['L01'])
  const [productCode, setProductCode] = useState('')
  const [materialCode, setMaterialCode] = useState('')

  const toggleLine = (line: string) => {
    if (selectedLines.includes(line)) {
      setSelectedLines(selectedLines.filter((l) => l !== line))
    } else {
      setSelectedLines([...selectedLines, line])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Preencha título e descrição do item.',
      })
      return
    }

    setLoading(true)
    try {
      const created = await pcpMeetingService.createMinuteItem({
        meeting_id: meetingId,
        classification,
        category,
        title: title.trim(),
        description: description.trim(),
        responsible_name: responsibleName.trim() || 'PCP',
        sector,
        deadline,
        impact_level: impactLevel,
        line_codes: selectedLines,
        product_code: productCode.trim(),
        material_code: materialCode.trim(),
        status: 'ABERTA',
        is_active_operational: true,
      })

      toast({
        title: `+ ${classification} Registrado`,
        description: `Item associado a ${selectedLines.length} linha(s) e refletido nas telas operacionais.`,
      })

      // Reset
      setTitle('')
      setDescription('')
      setProductCode('')
      setMaterialCode('')
      onSuccess(created)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar item',
        description: err.message || 'Falha ao salvar no banco',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#004C97]" />
            Registrar Item na Reunião PCP
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs pt-1">
          {/* Classificação */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">Tipo de Registro</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  'INFORMACAO',
                  'OBSERVACAO',
                  'DECISAO',
                  'PENDENCIA',
                  'ALERTA',
                  'RISCO',
                  'ACAO',
                  'ALTERACAO_PROGRAMACAO',
                  'COMUNICADO',
                ] as ItemClassification[]
              ).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setClassification(type)}
                  className={`p-1.5 text-[11px] font-semibold rounded-md border transition-all truncate text-left ${
                    classification === type
                      ? 'bg-[#004C97] text-white border-blue-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  ● {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Título e Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2 space-y-1">
              <Label className="text-slate-700 font-semibold">Título do Item *</Label>
              <Input
                required
                placeholder="Ex: Aguardar resultado de ensaio de ultrassom"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Categoria</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
              >
                <option value="GERAL">Geral</option>
                <option value="QUALIDADE">Qualidade</option>
                <option value="MATERIA_PRIMA">Matéria-Prima</option>
                <option value="ESTOQUE">Estoque</option>
                <option value="MANUTENCAO">Manutenção</option>
                <option value="LOGISTICA">Logística</option>
                <option value="CAPACIDADE">Capacidade</option>
                <option value="PROCESSO">Processo</option>
              </select>
            </div>
          </div>

          {/* Vínculo 1:N com Múltiplas Linhas */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold flex items-center justify-between">
              <span>Linhas Afetadas (1 Item → N Linhas)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Aparecerá automaticamente na tela operacional das linhas selecionadas
              </span>
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
              {availableLines.map((line) => {
                const isSelected = selectedLines.includes(line)
                return (
                  <button
                    key={line}
                    type="button"
                    onClick={() => toggleLine(line)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                      isSelected
                        ? 'bg-[#004C97] text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {line} {isSelected ? '✓' : '+'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contexto do Produto / Material */}
          <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-2.5 rounded-md border border-blue-100">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold text-[11px]">
                Código do Produto / Família
              </Label>
              <Input
                placeholder="Ex: PERFIL-ESTRUT-350"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="h-7 text-xs bg-white border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold text-[11px]">
                Código de Material SAP
              </Label>
              <Input
                placeholder="Ex: TARUGO-SAE1045"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                className="h-7 text-xs bg-white border-slate-300"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">
              Descrição Detalhada e Orientação *
            </Label>
            <Textarea
              required
              placeholder="Descreva detalhadamente o item, condição técnica ou ação requerida..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs border-slate-300 h-16 resize-none"
            />
          </div>

          {/* Responsável, Setor e Prazo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Responsável</Label>
              <Input
                placeholder="Ex: Carlos Mendes"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Setor</Label>
              <Input
                placeholder="Ex: Qualidade"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Prazo (Deadline)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs h-8 px-4"
            >
              {loading ? 'Salvando...' : 'Salvar no Registro Oficial'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default FastItemModal
