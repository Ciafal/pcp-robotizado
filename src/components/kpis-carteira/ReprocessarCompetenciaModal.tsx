import React, { useState } from 'react'
import { RotateCcw, X, AlertTriangle, History, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { kpisCarteiraService } from '@/services/kpis-carteira-service'

interface ReprocessarCompetenciaModalProps {
  isOpen: boolean
  onClose: () => void
  competencia: string
  posicaoFechamentoEm: string
  onReprocessed: () => void
}

export const ReprocessarCompetenciaModal: React.FC<ReprocessarCompetenciaModalProps> = ({
  isOpen,
  onClose,
  competencia,
  posicaoFechamentoEm,
  onReprocessed,
}) => {
  const { toast } = useToast()
  const [motivo, setMotivo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleReprocessar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!motivo.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo formal do reprocessamento da competência histórica.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const novaVersao = `REV-${Date.now().toString().slice(-4)}`

      // Registra auditoria imutável via pcpAuditService conforme regra transversal
      await kpisCarteiraService.registrarAuditoriaApuracao(competencia, 'REPROCESSAMENTO', {
        versao: novaVersao,
        motivo: motivo.trim(),
        antes: { posicaoFechamentoEm, competencia },
        depois: {
          posicaoFechamentoEm,
          reprocessadoEm: new Date().toISOString(),
          status: 'RECALCULADO',
        },
      })

      toast({
        title: 'Reprocessamento Concluído com Sucesso',
        description: `Competência ${competencia} reprocessada na versão ${novaVersao} com registro de auditoria.`,
      })

      onReprocessed()
      onClose()
    } catch {
      toast({
        title: 'Erro ao reprocessar',
        description: 'Não foi possível registrar o reprocessamento da competência.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-lg shadow-xs">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Reprocessar Competência Histórica
              </h3>
              <p className="text-xs text-slate-500">
                Competência: <strong>{competencia}</strong> • Fechamento: {posicaoFechamentoEm}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleReprocessar} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Regra de Governança CIAFAL:</span>
              <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                O reprocessamento de competências passadas gera uma nova versão auditada,
                preservando os snapshots originais e registrando data, usuário e justificativa.
                Nunca reconstrói mês passado pelo saldo atual.
              </p>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Motivo do Reprocessamento <span className="text-rose-500">*</span>
            </label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Conciliação retroativa de ordens de laminação do Centro L1 enviadas pelo SAP ECC..."
              rows={3}
              required
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Auditoria via pcpAuditService
            </span>

            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {isSubmitting ? 'Reprocessando...' : 'Confirmar Reprocessamento'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
