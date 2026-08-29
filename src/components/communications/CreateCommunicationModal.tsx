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
  Megaphone,
  Sparkles,
  CalendarDays,
  ShieldAlert,
  Users,
  Building,
  Layers,
  X,
  Plus,
} from 'lucide-react'
import {
  PCPCommunication,
  CommunicationType,
  CriticalityLevel,
  TargetAudienceType,
} from '@/types/pcp-meetings-comms'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface CreateCommunicationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (comm: PCPCommunication) => void
}

export const CreateCommunicationModal: React.FC<CreateCommunicationModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingAi, setLoadingAi] = useState(false)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [content, setContent] = useState('')
  const [commType, setCommType] = useState<CommunicationType>('OPERACIONAL')
  const [criticality, setCriticality] = useState<CriticalityLevel>('NORMAL')
  const [targetAudience, setTargetAudience] = useState<TargetAudienceType>('LINHAS_ESPECIFICAS')

  // Vigência & Agendamento
  const [publishNow, setPublishNow] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0])
  const [validUntil, setValidUntil] = useState('')

  // Linhas e Objetos Fabris
  const [targetLines, setTargetLines] = useState<string[]>(['L01', 'L02'])
  const [productCode, setProductCode] = useState('')
  const [materialCode, setMaterialCode] = useState('')
  const [productionOrder, setProductionOrder] = useState('')

  // Ciência e Bloqueio
  const [requiresAck, setRequiresAck] = useState(false)
  const [ackDeadline, setAckDeadline] = useState('')
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [unblockCondition, setUnblockCondition] = useState('')

  const toggleLine = (line: string) => {
    if (targetLines.includes(line)) {
      setTargetLines(targetLines.filter((l) => l !== line))
    } else {
      setTargetLines([...targetLines, line])
    }
  }

  const handleAiAssist = async () => {
    if (!title && !content) {
      toast({
        variant: 'destructive',
        title: 'Informe ao menos o título ou ideia inicial',
        description: 'A IA precisa de um tema ou descrição preliminar.',
      })
      return
    }

    setLoadingAi(true)
    try {
      const res = await pb.send<any>('/backend/v1/communications/generate-with-ai', {
        method: 'POST',
        body: {
          title: title || 'Comunicado Técnico de Produção',
          description: content,
          line_codes: targetLines,
          product_code: productCode,
          material_code: materialCode,
        },
      })

      if (res.suggested_title) setTitle(res.suggested_title)
      if (res.suggested_summary) setSummary(res.suggested_summary)
      if (res.suggested_content) setContent(res.suggested_content)
      if (res.suggested_comm_type) setCommType(res.suggested_comm_type)

      toast({
        title: 'Texto Estruturado por IA',
        description:
          'Comunicado gerado com seções de Ação Esperada e Público-Alvo. Revise antes de publicar.',
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na assistência de IA',
        description: e.message,
      })
    } finally {
      setLoadingAi(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const status = publishNow ? 'VIGENTE' : 'PROGRAMADO'
      const created = await pcpCommunicationService.createCommunication({
        title: title.trim(),
        summary: summary.trim(),
        content: content.trim(),
        comm_type: commType,
        criticality,
        target_audience_type: targetAudience,
        target_line_codes: targetLines,
        product_code: productCode.trim(),
        material_code: materialCode.trim(),
        production_order: productionOrder.trim(),
        status,
        valid_from: validFrom,
        valid_until: validUntil || undefined,
        scheduled_publish_at: !publishNow ? scheduledDate : undefined,
        requires_acknowledgement: requiresAck,
        ack_deadline: requiresAck ? ackDeadline : undefined,
        is_blocking: isBlocking || commType === 'BLOQUEANTE',
        block_reason: isBlocking ? blockReason : undefined,
        unblock_condition: isBlocking ? unblockCondition : undefined,
      })

      toast({
        title: publishNow ? 'Comunicado Publicado com Sucesso' : 'Comunicado Agendado',
        description: `Disponibilizado na central de comunicados e nas telas operacionais correspondentes.`,
      })

      onSuccess(created)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao emitir comunicado',
        description: err.message || 'Falha no salvamento',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#004C97]" />
              Criar Novo Comunicado PCP
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAiAssist}
              disabled={loadingAi}
              className="h-7 text-xs bg-blue-50 text-[#004C97] border-blue-200 hover:bg-blue-100 gap-1.5 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              {loadingAi ? 'Redigindo...' : 'Gerar com IA'}
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {/* Título */}
          <div className="space-y-1">
            <Label className="text-slate-700 font-semibold">Título do Comunicado *</Label>
            <Input
              required
              placeholder="Ex: COMUNICADO PCP: Restrição de bitola e conferência de tarugos na L01"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-xs border-slate-300 font-bold"
            />
          </div>

          {/* Tipo, Criticidade e Público */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Tipo de Comunicado</Label>
              <select
                value={commType}
                onChange={(e) => setCommType(e.target.value as CommunicationType)}
                className="w-full h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
              >
                <option value="OPERACIONAL">Operacional</option>
                <option value="QUALIDADE">Qualidade</option>
                <option value="MATERIA_PRIMA">Matéria-Prima</option>
                <option value="ESTOQUE">Estoque</option>
                <option value="ALTERACAO_PROGRAMACAO">Alteração Programação</option>
                <option value="MANUTENCAO">Manutenção</option>
                <option value="LOGISTICA">Logística</option>
                <option value="SEGURANCA">Segurança</option>
                <option value="BLOQUEANTE">Bloqueante (Stop)</option>
                <option value="INFORMATIVO">Informativo</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Criticidade</Label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value as CriticalityLevel)}
                className="w-full h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none font-semibold"
              >
                <option value="NORMAL">Normal</option>
                <option value="ATENCAO">Atenção (Amarelo)</option>
                <option value="URGENTE">Urgente (Laranja)</option>
                <option value="CRITICA">Crítica (Vermelho)</option>
                <option value="BLOQUEANTE">Bloqueante (Roxo / Trava)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Público-Alvo (AD/RBAC)</Label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as TargetAudienceType)}
                className="w-full h-8 px-2 border border-slate-300 rounded-md bg-white text-xs outline-none"
              >
                <option value="LINHAS_ESPECIFICAS">Linhas Específicas</option>
                <option value="TODOS">Todos os Usuários HUB</option>
                <option value="PCP">Equipe PCP</option>
                <option value="OPERACAO">Operadores de Linha</option>
                <option value="QUALIDADE">Qualidade & Laboratório</option>
                <option value="SUPERVISORES_GESTORES">Supervisores & Gestores</option>
              </select>
            </div>
          </div>

          {/* Linhas Produtivas Afetadas */}
          <div className="space-y-1.5">
            <Label className="text-slate-700 font-semibold flex items-center justify-between">
              <span>Linhas Impactadas (Exibição Direta na Tela Operacional)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-md">
              {['L01', 'L02', 'L03', 'L04', 'ENDL1', 'ACABL1', 'ACABL2'].map((line) => {
                const isSelected = targetLines.includes(line)
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

          {/* Contexto de Produto / Material / Ordem */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-blue-50/40 p-2.5 rounded-md border border-blue-100">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold text-[11px]">Código do Produto</Label>
              <Input
                placeholder="Ex: PERFIL-ESTRUT-350"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="h-7 text-xs bg-white border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold text-[11px]">
                Código do Material SAP
              </Label>
              <Input
                placeholder="Ex: TARUGO-SAE1045"
                value={materialCode}
                onChange={(e) => setMaterialCode(e.target.value)}
                className="h-7 text-xs bg-white border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold text-[11px]">
                Ordem de Produção (OP)
              </Label>
              <Input
                placeholder="Ex: OP-108492"
                value={productionOrder}
                onChange={(e) => setProductionOrder(e.target.value)}
                className="h-7 text-xs bg-white border-slate-300"
              />
            </div>
          </div>

          {/* Resumo e Conteúdo Completo */}
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Resumo Curto (Banner da Linha)</Label>
              <Input
                placeholder="Resumo em uma linha para visualização rápida no painel operacional..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Conteúdo & Orientações *</Label>
              <Textarea
                required
                placeholder="Descreva integralmente a diretriz operacional, impactos e orientações para a equipe..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="text-xs border-slate-300 h-28 resize-none font-mono"
              />
            </div>
          </div>

          {/* Vigência e Publicação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Modo de Publicação</Label>
              <div className="flex gap-1 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={publishNow ? 'default' : 'outline'}
                  onClick={() => setPublishNow(true)}
                  className={`h-7 text-xs flex-1 ${publishNow ? 'bg-[#004C97] text-white' : 'bg-white'}`}
                >
                  Publicar Agora
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={!publishNow ? 'default' : 'outline'}
                  onClick={() => setPublishNow(false)}
                  className={`h-7 text-xs flex-1 ${!publishNow ? 'bg-[#004C97] text-white' : 'bg-white'}`}
                >
                  Agendar
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Início da Vigência *</Label>
              <Input
                type="date"
                required
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="h-7 text-xs border-slate-300"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-700 font-semibold">Fim da Vigência (Expiração)</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="h-7 text-xs border-slate-300"
              />
            </div>
          </div>

          {/* Governança: Leitura Obrigatória / Ciência & Bloqueio */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresAck}
                onChange={(e) => setRequiresAck(e.target.checked)}
                className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
              />
              <span className="font-semibold text-slate-800 text-xs">
                Exigir confirmação de leitura formal ([LI E ESTOU CIENTE])
              </span>
            </label>

            {requiresAck && (
              <div className="pl-6 pt-1">
                <Label className="text-slate-600 text-[11px]">Prazo limite para ciência</Label>
                <Input
                  type="date"
                  value={ackDeadline}
                  onChange={(e) => setAckDeadline(e.target.value)}
                  className="h-7 text-xs w-44 bg-white border-slate-300 mt-0.5"
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isBlocking || commType === 'BLOQUEANTE'}
                onChange={(e) => setIsBlocking(e.target.checked)}
                className="rounded border-slate-300 text-rose-600 focus:ring-rose-600"
              />
              <span className="font-semibold text-rose-800 text-xs flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Comunicado Bloqueante (Exige motivo e
                condição formal de desbloqueio)
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
                    placeholder="Ex: Aguardando conferência laboratorial do certificado metalúrgico..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="h-7 text-xs bg-white border-rose-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-rose-900 font-semibold text-[11px]">
                    Condição de Desbloqueio *
                  </Label>
                  <Input
                    required
                    placeholder="Ex: Assinatura de liberação do Gerente de Qualidade no sistema..."
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
              {loading ? 'Salvando...' : publishNow ? 'Publicar Comunicado' : 'Agendar Publicação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default CreateCommunicationModal
