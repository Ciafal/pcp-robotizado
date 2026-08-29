import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  Gauge,
  Boxes,
  Truck,
  Building2,
  FileText,
} from 'lucide-react'
import { WeeklySimulationReport } from '@/types/weekly-schedule'

interface SimulationResultsModalProps {
  isOpen: boolean
  onClose: () => void
  report: WeeklySimulationReport | null
  onProceedToValidation?: () => void
}

export const SimulationResultsModal: React.FC<SimulationResultsModalProps> = ({
  isOpen,
  onClose,
  report,
  onProceedToValidation,
}) => {
  if (!report) return null

  const getResultBadge = () => {
    switch (report.overallResult) {
      case 'VIAVEL':
        return (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-emerald-900">{report.overallTitle}</h3>
                <Badge className="bg-emerald-600 text-white text-[10px] uppercase font-mono">
                  100% Viável
                </Badge>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">{report.overallDescription}</p>
            </div>
          </div>
        )
      case 'ALERTAS':
        return (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-amber-900">{report.overallTitle}</h3>
                <Badge className="bg-amber-600 text-white text-[10px] uppercase font-mono">
                  Atenção Requerida
                </Badge>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">{report.overallDescription}</p>
            </div>
          </div>
        )
      case 'INVIAVEL':
      default:
        return (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
            <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-sm">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-rose-900">{report.overallTitle}</h3>
                <Badge className="bg-rose-600 text-white text-[10px] uppercase font-mono">
                  Impeditivo Operacional
                </Badge>
              </div>
              <p className="text-xs text-rose-800 mt-0.5">{report.overallDescription}</p>
            </div>
          </div>
        )
    }
  }

  const domainList = Object.values(report.domains)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg">
                <Play className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
                  Relatório de Simulação & Viabilidade Industrial
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Avaliação integral dos 13 domínios fabris: capacidade, matéria-prima, compras,
                  setups, MTO e paradas.
                </DialogDescription>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {new Date(report.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Resultado Geral em Destaque */}
          {getResultBadge()}

          {/* 2. Resumo de Indicadores Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Card className="p-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Ocupação da Linha
              </span>
              <span className="text-lg font-black font-mono text-slate-900">
                {report.indicators.utilizationPct}%
              </span>
              <span className="text-[10px] text-slate-500 block">
                {report.indicators.programmedProductiveHours + report.indicators.setupHours}h de{' '}
                {report.indicators.availableCapacityHours}h
              </span>
            </Card>

            <Card className="p-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Volume Programado
              </span>
              <span className="text-lg font-black font-mono text-[#004C97]">
                {report.indicators.programmedQuantityTons} t
              </span>
              <span className="text-[10px] text-slate-500 block">
                {report.indicators.programmedProductsCount} lotes de produção
              </span>
            </Card>

            <Card className="p-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Eficiência Sequência
              </span>
              <span className="text-lg font-black font-mono text-emerald-700">
                {report.indicators.sequenceScore}/100
              </span>
              <span className="text-[10px] text-slate-500 block">
                Setup: {report.indicators.setupHours}h totais
              </span>
            </Card>

            <Card className="p-3 bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Status Matéria-Prima
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {report.indicators.rawMaterialGreenCount || 0} OK
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">
                  {report.indicators.rawMaterialYellowCount || 0} Alertas
                </span>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                  {report.indicators.rawMaterialRedCount || 0} Rupturas
                </span>
              </div>
            </Card>
          </div>

          {/* 3. Tabela / Grid dos 13 Domínios Analisados */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-[#004C97]" />
              Checklist dos 13 Domínios Operacionais
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {domainList.map((dom) => (
                <div
                  key={dom.id}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                    dom.status === 'PASS'
                      ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                      : dom.status === 'WARN'
                        ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      {dom.status === 'PASS' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      {dom.status === 'WARN' && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                      {dom.status === 'FAIL' && (
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span>{dom.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">{dom.description}</p>
                  </div>
                  <Badge
                    className={`text-[9px] font-mono shrink-0 ${
                      dom.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : dom.status === 'WARN'
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-rose-100 text-rose-800 border-rose-200'
                    }`}
                  >
                    {dom.status === 'PASS'
                      ? 'APROVADO'
                      : dom.status === 'WARN'
                        ? 'ALERTA'
                        : 'IMPEDIDO'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Parecer Consultivo de IA (Governança: IA Apenas Recomenda) */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#004C97]">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Diagnóstico da IA &bull; Assistente Consultivo de Programação</span>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[9px]">
                Governança: Decisão Humana
              </Badge>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {report.aiSummaryRecommendation}
            </p>
            {report.suggestedActions.length > 0 && (
              <div className="pt-2 border-t border-blue-100">
                <span className="text-[10px] font-bold text-slate-600 uppercase">
                  Ações Recomendadas ao Programador:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-700 mt-1 space-y-0.5">
                  {report.suggestedActions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <Button variant="outline" onClick={onClose} className="text-xs h-9">
            Fechar
          </Button>
          <div className="flex items-center gap-2">
            {report.overallResult !== 'INVIAVEL' && onProceedToValidation && (
              <Button
                onClick={() => {
                  onProceedToValidation()
                  onClose()
                }}
                className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold flex items-center gap-1.5 h-9"
              >
                <ShieldCheck className="w-4 h-4" />
                Avançar para Estado "Validado"
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default SimulationResultsModal
