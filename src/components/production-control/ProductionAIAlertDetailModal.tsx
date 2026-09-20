import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileText,
  Activity,
  History,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ProductionOrder } from '@/types/pcp-production'
import { formatQuantity, formatPercentagePTBR } from '@/lib/formatters-ptbr'

export interface ProductionAlertItem {
  id: string
  opNumber: string
  classificacao: 'CRITICO' | 'ALTO' | 'ATENCAO' | 'INFORMATIVO'
  tempoRelativo: string
  textoCurto: string
  fato: string
  historico: string
  desvio: string
  hipoteseIA: string
  acaoSugerida: string
  order?: ProductionOrder
}

interface ProductionAIAlertDetailModalProps {
  alert: ProductionAlertItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenOrderDetail?: (order: ProductionOrder) => void
}

export const ProductionAIAlertDetailModal: React.FC<ProductionAIAlertDetailModalProps> = ({
  alert,
  open,
  onOpenChange,
  onOpenOrderDetail,
}) => {
  const navigate = useNavigate()

  if (!alert) return null

  const getBadgeStyle = (cl: ProductionAlertItem['classificacao']) => {
    switch (cl) {
      case 'CRITICO':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-300 font-semibold',
          borderLeft: 'border-l-rose-500',
          dot: 'bg-rose-500',
          label: 'Crítico',
        }
      case 'ALTO':
        return {
          badge: 'bg-orange-50 text-orange-700 border-orange-300 font-semibold',
          borderLeft: 'border-l-orange-500',
          dot: 'bg-orange-500',
          label: 'Alto',
        }
      case 'ATENCAO':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold',
          borderLeft: 'border-l-amber-500',
          dot: 'bg-amber-500',
          label: 'Atenção',
        }
      case 'INFORMATIVO':
      default:
        return {
          badge: 'bg-blue-50 text-[#004C97] border-blue-200 font-semibold',
          borderLeft: 'border-l-[#004C97]',
          dot: 'bg-[#004C97]',
          label: 'Informativo',
        }
    }
  }

  const badgeConfig = getBadgeStyle(alert.classificacao)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 bg-white rounded-xl shadow-lg border border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${badgeConfig.dot}`} />
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Alerta de IA — OP {alert.opNumber}</span>
              </DialogTitle>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${badgeConfig.badge}`}>
                {badgeConfig.label}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{alert.tempoRelativo}</span>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-600 mt-1">
            {alert.textoCurto}
          </DialogDescription>
        </DialogHeader>

        {/* Banner de Governança IA: Hipótese não é Fato */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900">
              Protocolo de Transparência da Inteligência Industrial CIAFAL:
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Hipóteses formuladas pela IA indicam probabilidades baseadas na telemetria de
              sensores, apontamentos MES e séries temporais históricas. Elas <strong>NUNCA</strong>{' '}
              devem ser tratadas como causa técnica confirmada sem a validação do operador líder ou
              especialista do processo.
            </p>
          </div>
        </div>

        {/* Seções Estruturadas: Fato / Histórico / Desvio / Hipótese IA / Ação Sugerida */}
        <div className="space-y-3 pt-1 text-xs">
          {/* 1. Fato */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <FileText className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Fato Constatado (Sensoriamento & ERP)</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">{alert.fato}</p>
          </div>

          {/* 2. Histórico */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span>Histórico & Contexto Operacional</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs">{alert.historico}</p>
          </div>

          {/* 3. Desvio */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold uppercase tracking-wider text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Desvio Quantificado vs. Padrão Nominal</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-xs font-mono">{alert.desvio}</p>
          </div>

          {/* 4. Hipótese IA */}
          <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40 space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-950 font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hipótese Levantada pela IA (Probabilidade Analítica)</span>
            </div>
            <p className="text-indigo-900 leading-relaxed text-xs">{alert.hipoteseIA}</p>
            <div className="pt-1 text-[10px] text-indigo-700/80 italic">
              * Hipótese calculada com correlação cruzada de modelos de perda e velocidade de
              laminação.
            </div>
          </div>

          {/* 5. Ação Sugerida */}
          <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/40 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-950 font-bold uppercase tracking-wider text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ação Sugerida Prioritária</span>
            </div>
            <p className="text-emerald-900 leading-relaxed text-xs font-medium">
              {alert.acaoSugerida}
            </p>
          </div>
        </div>

        {/* Rodapé com Navegação para Subtelas (Drill-down) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-200 pt-3 mt-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {alert.order && onOpenOrderDetail && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false)
                  onOpenOrderDetail(alert.order!)
                }}
                className="h-8 text-xs bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                Detalhar OP Completa
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate(`/pcp/producao/ordens?search=${alert.opNumber}`)
              }}
              className="h-8 text-xs text-[#004C97] hover:bg-blue-50/50 border-blue-200"
            >
              Ver no Controle de Ordens &rarr;
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate(`/pcp/producao/ia-analises?search=${alert.opNumber}`)
              }}
              className="h-8 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Análise de Ordens (IA)
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ProductionAIAlertDetailModal
