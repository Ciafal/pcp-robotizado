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
import { Megaphone, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react'
import {
  PCPMinuteItem,
  PCPCommunication,
  CommunicationType,
  CriticalityLevel,
} from '@/types/pcp-meetings-comms'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface ConvertToCommModalProps {
  item: PCPMinuteItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (comm: PCPCommunication) => void
}

export const ConvertToCommModal: React.FC<ConvertToCommModalProps> = ({
  item,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingAi, setLoadingAi] = useState(false)

  const [title, setTitle] = useState(
    item ? `COMUNICADO PCP: ${item.title.toUpperCase()}` : 'COMUNICADO PCP',
  )
  const [summary, setSummary] = useState(item?.title || '')
  const [content, setContent] = useState(item?.description || '')
  const [commType, setCommType] = useState<CommunicationType>('OPERACIONAL')
  const [criticality, setCriticality] = useState<CriticalityLevel>('ATENCAO')
  const [requiresAck, setRequiresAck] = useState(false)
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [unblockCondition, setUnblockCondition] = useState('')

  if (!item) return null

  const handleGenerateWithAi = async () => {
    setLoadingAi(true)
    try {
      const res = await pb.send<any>('/backend/v1/communications/generate-with-ai', {
        method: 'POST',
        body: {
          title: item.title,
          description: item.description,
          line_codes: item.line_codes,
          product_code: item.product_code,
          material_code: item.material_code,
        },
      })

      if (res.suggested_title) setTitle(res.suggested_title)
      if (res.suggested_summary) setSummary(res.suggested_summary)
      if (res.suggested_content) setContent(res.suggested_content)
      if (res.suggested_comm_type) setCommType(res.suggested_comm_type)
      if (res.suggested_criticality) setCriticality(res.suggested_criticality)

      toast({
        title: 'Comunicado Formatado por IA',
        description:
          'Texto estruturado gerado com base nas diretrizes do PCP. Revise antes de publicar.',
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao gerar com IA',
        description: e.message || 'Serviço indisponível',
      })
    } finally {
      setLoadingAi(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const created = await pcpCommunicationService.createCommunication({
        title,
        summary,
        content,
        comm_type: commType,
        criticality,
        origin_type: 'ATA_PCP',
        origin_ref_id: item.id,
        origin_ref_code: item.item_code,
        status: 'VIGENTE',
        valid_from: new Date().toISOString().split('T')[0],
        requires_acknowledgement: requiresAck,
        is_blocking: isBlocking,
        block_reason: isBlocking ? blockReason : '',
        unblock_condition: isBlocking ? unblockCondition : '',
        target_audience_type: item.line_codes?.length > 0 ? 'LINHAS_ESPECIFICAS' : 'TODOS',
        target_line_codes: item.line_codes || [],
        product_code: item.product_code || '',
        material_code: item.material_code || '',
        production_order: item.production_order || '',
      })

      toast({
        title: 'Comunicado Oficial Publicado',
        description: `Comunicado gerado a partir do item ${item.item_code} e ativo na tela das linhas.`,
      })
      onSuccess(created)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao publicar comunicado',
        description: err.message || 'Falha ao salvar',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#004C97]" />
              Gerar Comunicado Oficial PCP
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateWithAi}
              disabled={loadingAi}
              className="h-7 text-xs bg-blue-50 text-[#004C97] border-blue-200 hover:bg-blue-100 gap-1.5 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              {loadingAi ? 'Formatando...' : 'Formatar com IA'}
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs pt-1">
          {/* Origem e Vínculo */}
          <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-md flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-500 block">Origem Vinculada:</span>
              <strong className="text-slate-800">
                Item ATA [{item.item_code}] - {item.title}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Linhas:</span>
              <strong className="text-[#004C97] font-mono">
                {item.line_codes?.join(', ') || 'Todas'}
              </strong>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">Título do Comunicado *</Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs border-slate-300 font-semibold"
            />
          </div>

          {/* Tipo e Criticidade */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Classificação</Label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value as CommunicationType)}
                className="w-full h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
              >
                <option value="OPERACIONAL">Operacional</option>
                <option value="QUALIDADE">Qualidade</option>
                <option value="MATERIA_PRIMA">Matéria-Prima</option>
                <option value="ESTOQUE">Estoque</option>
                <option value="ALTERACAO_PROGRAMACAO">Alteração de Programação</option>
                <option value="MANUTENCAO">Manutenção</option>
                <option value="BLOQUEANTE">Bloqueante</option>
                <option value="INFORMATIVO">Informativo</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Criticidade Visual</Label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value as CriticalityLevel)}
                className="w-full h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none font-semibold"
              >
                <option value="NORMAL">Normal</option>
                <option value="ATENCAO">Atenção (Amarelo)</option>
                <option value="URGENTE">Urgente (Laranja)</option>
                <option value="CRITICA">Crítica (Vermelho)</option>
                <option value="BLOQUEANTE">Bloqueante (Roxo / Stop)</option>
              </select>
            </div>
          </div>

          {/* Resumo */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">Resumo Curto (Exibido na Linha)</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="h-8 text-xs border-slate-300"
            />
          </div>

          {/* Conteúdo Detalhado */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">
              Conteúdo e Diretrizes Detalhadas *
            </Label>
            <Textarea
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs border-slate-300 h-28 resize-none font-mono"
            />
          </div>

          {/* Opções de Governança: Ciência e Bloqueio */}
          <div className="space-y-2 pt-1 border-t border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
              />
              <span className="font-semibold text-slate-800 text-xs">
                Exigir confirmação de leitura e ciência formal ([LI E ESTOU CIENTE])
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBlocking || commType === 'BLOQUEANTE'}
                onChange={(e) => setIsBlocking(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-600"
              />
              <span className="font-semibold text-rose-800 text-xs flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Comunicado Bloqueante (Interrompe ou
                condiciona a produção)
              </span>
            </label>

            {(isBlocking || commType === 'BLOQUEANTE') && (
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-md space-y-2 mt-2">
                <div className="space-y-1">
                  <Label className="text-rose-900 font-semibold text-[11px]">
                    Motivo do Bloqueio *
                  </Label>
                  <Input
                    required
                    placeholder="Ex: Não conformidade dimensional detectada no lote anterior..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="h-7 text-xs bg-white border-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-rose-900 font-semibold text-[11px]">
                    Condição para Desbloqueio *
                  </Label>
                  <Input
                    required
                    placeholder="Ex: Liberação formal com laudo do laboratório metalúrgico..."
                    value={unblockCondition}
                    onChange={(e) => setUnblockCondition(e.target.value)}
                    className="h-7 text-xs bg-white border-rose-300"
                  />
                </div>
              </div>
            )}
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
              {loading ? 'Publicando...' : 'Publicar Comunicado Agora'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default ConvertToCommModal
