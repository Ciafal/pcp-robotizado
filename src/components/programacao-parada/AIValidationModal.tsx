import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Factory,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { ValidacaoIAResultado } from '@/services/programacao-parada-service'

interface AIValidationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resultado: ValidacaoIAResultado | null
  loading?: boolean
}

export const AIValidationModal: React.FC<AIValidationModalProps> = ({
  open,
  onOpenChange,
  resultado,
  loading = false,
}) => {
  if (!resultado && !loading) return null

  const getClassificationBadge = (cls?: string) => {
    switch (cls) {
      case 'SEM_CONFLITO':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sem Conflito
          </Badge>
        )
      case 'ATENCAO':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Atenção / Conflito Moderado
          </Badge>
        )
      case 'CONFLITO_CRITICO':
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-300 font-bold px-3 py-1 text-xs flex items-center gap-1.5 shadow-2xs animate-pulse"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Conflito Crítico
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="font-semibold text-xs">
            {cls || 'Análise Realizada'}
          </Badge>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-0 border border-slate-200 rounded-2xl shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-purple-50/70 via-white to-blue-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Resultado da Validação IA — Parada Programada
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cruzamento automatizado com cronogramas semanais, produção programada e testes
                  técnicos.
                </DialogDescription>
              </div>
            </div>
            {resultado && getClassificationBadge(resultado.classificacao)}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">
              Consultando Inteligência de Sequenciamento PCP...
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Verificando weekly_schedules, apontamentos e sobreposições nos centros indicados.
            </p>
          </div>
        ) : resultado ? (
          <div className="p-6 space-y-5">
            {/* Aviso de Governança: IA só analisa, nunca altera */}
            <div className="flex items-center gap-2 p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#004C97] shrink-0" />
              <span>
                <strong>Diretriz de Governança:</strong> A IA atua exclusivamente como assistente
                analítica e orientativa. Nenhuma ordem ou parada é alterada automaticamente sem a
                aprovação expressa do PCP.
              </span>
            </div>

            {/* Resumo Executivo */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Resumo da Análise
              </span>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {resultado.resumo}
              </p>
            </div>

            {/* Impactos Identificados */}
            {resultado.impactos_identificados && resultado.impactos_identificados.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Impactos Identificados ({resultado.impactos_identificados.length})
                </h4>
                <div className="space-y-1.5">
                  {resultado.impactos_identificados.map((imp, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 flex items-start gap-2 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{imp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alertas */}
            {resultado.alertas && resultado.alertas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Alertas Operacionais ({resultado.alertas.length})
                </h4>
                <div className="space-y-1.5">
                  {resultado.alertas.map((alt, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs text-amber-900 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-snug font-medium">{alt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Centros Afetados */}
            {resultado.centros_afetados && resultado.centros_afetados.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Factory className="w-3.5 h-3.5 text-blue-600" />
                  Centros Afetados
                </h4>
                <div className="flex flex-wrap gap-2">
                  {resultado.centros_afetados.map((c, idx) => {
                    const centroLabel = typeof c === 'string' ? c : `${c.centro} (${c.linha})`
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-bold text-[#004C97]"
                      >
                        <Factory className="w-3 h-3 text-blue-500" />
                        {centroLabel}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Programações Afetadas */}
            {resultado.programacoes_afetadas && resultado.programacoes_afetadas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  Programações / Lotes Afetados
                </h4>
                <div className="flex flex-wrap gap-2">
                  {resultado.programacoes_afetadas.map((p, idx) => {
                    const progLabel =
                      typeof p === 'string'
                        ? p
                        : `${p.schedule_code} ${p.material ? `— ${p.material}` : ''}`
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-800"
                      >
                        <Calendar className="w-3 h-3 text-purple-500" />
                        {progLabel}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {resultado.recomendacoes && resultado.recomendacoes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Recomendações Práticas do Sequenciamento
                </h4>
                <div className="space-y-1.5">
                  {resultado.recomendacoes.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs text-emerald-900 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="leading-snug">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Próximas Ações Sugeridas */}
            {((resultado.proximas_acoes_sugeridas &&
              resultado.proximas_acoes_sugeridas.length > 0) ||
              (resultado.proximas_acoes && resultado.proximas_acoes.length > 0)) && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  Próximas Ações Sugeridas
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  {(resultado.proximas_acoes_sugeridas || resultado.proximas_acoes || []).map(
                    (acao, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
                        <span>{acao}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            Fechar Painel de Validação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default AIValidationModal
