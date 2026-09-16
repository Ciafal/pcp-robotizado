import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { TestProgrammingRecord, IndustrialApprovalDecision } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface IndustrialApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  testItem: TestProgrammingRecord | null
  onSuccess: () => void
}

export const IndustrialApprovalModal: React.FC<IndustrialApprovalModalProps> = ({
  isOpen,
  onClose,
  testItem,
  onSuccess,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [decision, setDecision] = useState<'APROVADO' | 'REPROVADO' | 'SOLICITAR_AJUSTES'>(
    'APROVADO',
  )
  const [observation, setObservation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setDecision('APROVADO')
      setObservation('')
      setError(null)
    }
  }, [isOpen])

  if (!testItem) return null

  const handleConfirm = async () => {
    if (!observation.trim()) {
      setError('A observação / parecer técnico é obrigatório para registrar a decisão.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const now = new Date()
      const decisionPayload: IndustrialApprovalDecision = {
        decision,
        userId: user?.id || 'usr_anonymous',
        userName: user?.name || user?.email || 'Aprovador Industrial',
        userRole: user?.role || 'LINE_MANAGER',
        decisionDate: now.toISOString().split('T')[0],
        decisionTime: now.toTimeString().split(' ')[0].substring(0, 5),
        observation: observation.trim(),
      }

      await testProgrammingService.processIndustrialApproval(testItem.id, decisionPayload)

      // Regra corporativa: Toast só após confirmação do backend
      toast({
        title: 'Parecer Industrial Registrado',
        description: `O teste ${testItem.test_id} foi atualizado com sucesso (${decision}).`,
        variant: decision === 'REPROVADO' ? 'destructive' : 'default',
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Falha ao processar aprovação industrial:', err)
      setError(err?.message || 'Falha na comunicação com o backend.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Parecer da Aprovação Industrial</span>
              <Badge variant="outline" className="font-mono text-xs">
                {testItem.test_id}
              </Badge>
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500">
            Linha: <span className="font-semibold text-slate-700">{testItem.production_line}</span>{' '}
            | Título: <span className="font-semibold text-slate-700">{testItem.title}</span>
          </p>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4 my-2">
          {/* Seletor de Decisão */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Decisão Industrial *</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={decision === 'APROVADO' ? 'default' : 'outline'}
                className={`text-xs h-9 justify-center gap-1.5 ${
                  decision === 'APROVADO'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                    : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                }`}
                onClick={() => setDecision('APROVADO')}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprovar
              </Button>

              <Button
                type="button"
                variant={decision === 'SOLICITAR_AJUSTES' ? 'default' : 'outline'}
                className={`text-xs h-9 justify-center gap-1.5 ${
                  decision === 'SOLICITAR_AJUSTES'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold'
                    : 'text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
                onClick={() => setDecision('SOLICITAR_AJUSTES')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Pedir Ajustes
              </Button>

              <Button
                type="button"
                variant={decision === 'REPROVADO' ? 'default' : 'outline'}
                className={`text-xs h-9 justify-center gap-1.5 ${
                  decision === 'REPROVADO'
                    ? 'bg-red-600 hover:bg-red-700 text-white font-semibold'
                    : 'text-red-700 border-red-200 hover:bg-red-50'
                }`}
                onClick={() => setDecision('REPROVADO')}
              >
                <XCircle className="w-3.5 h-3.5" />
                Reprovar
              </Button>
            </div>
          </div>

          {/* Dados do Aprovador */}
          <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Aprovador / Responsável:</span>
              <p className="truncate font-medium">
                {user?.name || user?.email || 'Carlos Mendes (Gestor)'}
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Papel / Cargo:</span>
              <p className="font-medium">{user?.role || 'LINE_MANAGER'}</p>
            </div>
          </div>

          {/* Parecer / Observação */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Observação / Parecer Técnico Justificativo *
              </Label>
              <span className="text-[10px] text-slate-400">Obrigatório para auditoria</span>
            </div>
            <Textarea
              rows={4}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva a fundamentação técnica da aprovação, condicionantes, alinhamento com a manutenção/equipe da linha ou os motivos de recusa..."
              className="text-xs resize-none"
            />
          </div>

          <div className="text-[11px] text-slate-500 bg-blue-50/70 p-2.5 rounded border border-blue-100 flex items-start gap-2">
            <span className="font-bold text-[#004C97]">Fluxo:</span>
            <span>
              Após aprovação industrial, o status avançará automaticamente para{' '}
              <strong className="text-slate-800">"Aguardando Aprovação PCP"</strong> e ficará
              disponível para a equipe de Planejamento e Controle da Produção.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`text-xs ${
              decision === 'APROVADO'
                ? 'bg-[#004C97] hover:bg-[#003974]'
                : decision === 'REPROVADO'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isSubmitting ? 'Gravando no Backend...' : 'Confirmar Parecer Industrial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
