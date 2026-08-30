import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertCircle,
  Clock,
  Truck,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Send,
  X,
  CheckCircle2,
} from 'lucide-react'
import { ScheduleCrmAlert } from '@/types/schedule-versioning'

interface CrmAlertCardProps {
  alert: ScheduleCrmAlert
  onViewOrder?: (orderNum: string) => void
  onViewSchedule?: (versionCode: string) => void
  onRequestReevaluation?: (alertId: string, notes: string) => void
}

export const CrmAlertCard: React.FC<CrmAlertCardProps> = ({
  alert,
  onViewOrder,
  onViewSchedule,
  onRequestReevaluation,
}) => {
  const [isReevaluating, setIsReevaluating] = useState(false)
  const [reevalNotes, setReevalNotes] = useState('')
  const [submitted, setSubmitted] = useState(alert.status === 'REAVALIACAO_SOLICITADA')

  const handleSendReevaluation = () => {
    if (!reevalNotes.trim()) return
    if (onRequestReevaluation) {
      onRequestReevaluation(alert.id, reevalNotes)
    }
    setSubmitted(true)
    setIsReevaluating(false)
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-sm text-xs space-y-3 hover:border-rose-300 transition-all">
      {/* Header do Card (Requisito 23) */}
      <div className="flex items-center justify-between border-b border-rose-100 pb-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-rose-600 text-white font-black text-[10px] tracking-wide">
            🔴 ALTERAÇÃO RELEVANTE NO PCP
          </Badge>
          <span className="font-mono text-slate-500 text-[11px]">{alert.version_code}</span>
        </div>

        <Badge variant="outline" className="text-[10px] text-slate-600 border-slate-300">
          Pedido {alert.sales_order_number}
        </Badge>
      </div>

      {/* Grid de Informações Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
        <div>
          <span className="text-slate-500 block font-medium">Cliente:</span>
          <strong className="text-slate-900 text-xs">{alert.customer_name}</strong>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Produto / Material:</span>
          <strong className="text-[#004C97] font-mono text-xs">{alert.material_code}</strong>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Produção Prevista:</span>
          <div className="flex items-center gap-1 font-mono">
            <span className="line-through text-slate-400">{alert.previous_production_date}</span>
            <span className="text-rose-600 font-bold">&rarr; {alert.new_production_date}</span>
          </div>
        </div>
        <div>
          <span className="text-slate-500 block font-medium">Volume Programado:</span>
          <div className="flex items-center gap-1 font-mono">
            <span className="line-through text-slate-400">{alert.previous_quantity_tons} t</span>
            <span className="text-amber-700 font-bold">&rarr; {alert.new_quantity_tons} t</span>
          </div>
        </div>
      </div>

      {/* Motivo e Impacto Comercial */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Motivo da Reprogramação:</span>
          <span className="font-bold text-slate-800">{alert.reason}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500">Impacto Comercial Direto:</span>
          <span className="font-bold text-rose-700">{alert.commercial_impact_summary}</span>
        </div>
      </div>

      {/* Tradução IA para Linguagem Comercial (Requisito 25) */}
      {alert.ai_commercial_explanation && (
        <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200 text-[11px] text-slate-800 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#004C97] block text-[10px] uppercase">
              Diagnóstico Comercial Inteligente (IA):
            </span>
            <p className="mt-0.5 leading-relaxed text-slate-700">
              {alert.ai_commercial_explanation}
            </p>
          </div>
        </div>
      )}

      {/* Previsão Logística TMS (Requisito 26) */}
      {alert.tms_recalculation_required && (
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded border text-[11px] text-slate-600">
          <span className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-blue-600" /> Logística TMS:
          </span>
          <span className="font-mono font-bold text-blue-900">
            {alert.tms_new_delivery_estimate || 'Janela de entrega em recálculo automático'}
          </span>
        </div>
      )}

      {/* Botões de Ação do Requisito 23 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {onViewOrder && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewOrder(alert.sales_order_number)}
              className="text-xs h-8 bg-white border-slate-300"
            >
              Ver Pedido
            </Button>
          )}

          {onViewSchedule && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewSchedule(alert.version_code)}
              className="text-xs h-8 bg-white border-slate-300 text-[#004C97]"
            >
              Ver Programação
            </Button>
          )}
        </div>

        <div>
          {submitted ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Reavaliação Solicitada ao PCP
            </span>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsReevaluating(!isReevaluating)}
              className="text-xs h-8 bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Solicitar Reavaliação PCP
            </Button>
          )}
        </div>
      </div>

      {/* Formulário de Solicitação de Reavaliação */}
      {isReevaluating && !submitted && (
        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mt-2 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-[11px]">
              Justificativa Comercial para o Programador PCP:
            </span>
            <button
              onClick={() => setIsReevaluating(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea
            rows={2}
            value={reevalNotes}
            onChange={(e) => setReevalNotes(e.target.value)}
            placeholder="Ex: Cliente possui obra prioritária em 28/08, solicitamos priorizar laminação no 1º turno..."
            className="w-full p-2 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#004C97]"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsReevaluating(false)}
              className="h-7 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSendReevaluation}
              className="h-7 text-xs bg-[#004C97] text-white font-bold gap-1"
            >
              <Send className="w-3 h-3" /> Enviar ao PCP
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
export default CrmAlertCard
