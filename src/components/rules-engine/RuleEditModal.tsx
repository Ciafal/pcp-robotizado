import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sliders, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { pcpRulesService, RuleAuditLogRecord } from '@/services/pcp-rules-service'
import { useToast } from '@/hooks/use-toast'

export type RuleCategoryType = 'SETUP' | 'STOP' | 'COOLING' | 'SEQUENCING' | 'CP_SAT'

export interface RuleEditTarget {
  id?: string
  ruleId?: string
  entityType: RuleCategoryType
  parameterName: string
  ruleIdentifier?: string
  lineCode?: string
  workCenter?: string
  currentValue: string
  unit?: string
  isNew?: boolean
  reasonDefault?: string
}

interface RuleEditModalProps {
  isOpen: boolean
  onClose: () => void
  target: RuleEditTarget | null
  onSuccess: (newLog: RuleAuditLogRecord) => void
}

export const RuleEditModal: React.FC<RuleEditModalProps> = ({
  isOpen,
  onClose,
  target,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [newValue, setNewValue] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [origin, setOrigin] = useState<'MANUAL' | 'MES' | 'SAP' | 'IA_OPTIMIZER' | 'ENGENHARIA'>(
    'MANUAL',
  )
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Reset fields when target changes
  React.useEffect(() => {
    if (target) {
      setNewValue(target.currentValue || '')
      setReason(target.reasonDefault || '')
      setOrigin('MANUAL')
    }
  }, [target])

  if (!isOpen || !target) return null

  const categoryLabel: Record<RuleCategoryType, string> = {
    SETUP: 'Setup & Acerto',
    STOP: 'Paradas Programadas',
    COOLING: 'Tempo de Resfriamento',
    SEQUENCING: 'Regras de Sequenciamento',
    CP_SAT: 'Parâmetros Mestres CP-SAT',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValue.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campo obrigatório',
        description: 'Informe o novo valor para a regra.',
      })
      return
    }

    if (!reason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa obrigatória',
        description:
          'Informe o motivo/justificativa da alteração da regra para a trilha de auditoria.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const auditPayload: Partial<RuleAuditLogRecord> = {
        parameter_name: target.parameterName,
        entity_type: target.entityType,
        entity_id: target.id || '',
        previous_value: target.currentValue || 'N/A',
        new_value: target.unit ? `${newValue.trim()} ${target.unit}` : newValue.trim(),
        reason: reason.trim(),
        origin,
        mes_validation_status: 'VALIDADO',
        ai_recommendation: `🟢 Regra industrial auditada (${categoryLabel[target.entityType]} - Linha ${target.lineCode || 'Geral'}).`,
      }

      // Adiciona campos extras se disponíveis
      ;(auditPayload as any).rule_identifier =
        target.ruleIdentifier || target.id || target.parameterName
      ;(auditPayload as any).field_name = target.parameterName

      const createdLog = await pcpRulesService.logRuleChange(auditPayload)

      toast({
        title: 'Regra salva com sucesso',
        description: `Alteração registrada na Trilha de Auditoria (ID: ${createdLog.id.slice(0, 8)}...).`,
      })

      onSuccess(createdLog)
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar alteração da regra:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar auditoria',
        description: err?.message || 'Falha ao salvar auditoria da regra no servidor.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-white text-slate-900 border-slate-200">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-[#004C97] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                {target.isNew ? 'Criar Nova Regra' : 'Editar Regra Industrial'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Aba: <strong className="text-[#004C97]">{categoryLabel[target.entityType]}</strong>
                {target.lineCode && ` • Linha: ${target.lineCode}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1 text-xs">
          {/* Identificação da Regra */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-bold text-slate-700 block">Regra / Parâmetro:</span>
            <div className="font-semibold text-slate-900 text-xs">{target.parameterName}</div>
            {!target.isNew && (
              <div className="flex items-center gap-2 pt-1 text-[11px]">
                <span className="text-slate-500">Valor Anterior:</span>
                <Badge variant="outline" className="font-mono bg-white text-slate-700">
                  {target.currentValue || 'Não definido'} {target.unit || ''}
                </Badge>
              </div>
            )}
          </div>

          {/* Novo Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="new-rule-value" className="text-xs font-bold text-slate-800">
              Novo Valor {target.unit ? `(${target.unit})` : ''} *
            </Label>
            <Input
              id="new-rule-value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Ex: 90 ou ATIVO ou Restrição Severa..."
              className="text-xs h-8 bg-white border-slate-300"
              required
              autoFocus
            />
          </div>

          {/* Origem da alteração */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-origin" className="text-xs font-bold text-slate-800">
              Origem da Solicitação
            </Label>
            <Select value={origin} onValueChange={(v: any) => setOrigin(v)}>
              <SelectTrigger id="rule-origin" className="h-8 text-xs bg-white border-slate-300">
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">MANUAL (PCP / Operação)</SelectItem>
                <SelectItem value="ENGENHARIA">ENGENHARIA (Processos Metalúrgicos)</SelectItem>
                <SelectItem value="MES">MES (Estatística Apurada)</SelectItem>
                <SelectItem value="SAP">SAP (Parâmetro Corporativo)</SelectItem>
                <SelectItem value="IA_OPTIMIZER">IA_OPTIMIZER (Algoritmo CP-SAT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motivo / Justificativa */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-reason" className="text-xs font-bold text-slate-800">
              Motivo & Justificativa Técnica *
            </Label>
            <Textarea
              id="rule-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique o motivo da alteração, evidência prática ou ordem de serviço..."
              className="text-xs bg-white border-slate-300 resize-none"
              required
            />
          </div>

          <div className="p-2 rounded bg-blue-50/60 border border-blue-100 flex items-start gap-2 text-[11px] text-blue-900">
            <ShieldCheck className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
            <span>
              A alteração será gravada no backend com seu usuário, data/hora e valores anterior
              &rarr; novo na
              <strong> Trilha de Auditoria</strong>.
            </span>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold h-8 gap-1.5 shadow-xs"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar & Registrar Auditoria'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
