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
import { Progress } from '@/components/ui/progress'
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Sliders,
  Calendar,
  Layers,
  Sparkles,
  Database,
  ExternalLink,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import {
  MasterSheetCompletenessResult,
  MasterSheetBlockKey,
  CompletenessItem,
} from '@/types/line-master'

interface MasterSheetCompletenessModalProps {
  open: boolean
  onClose: () => void
  completeness: MasterSheetCompletenessResult | null
  loading?: boolean
  onNavigateToBlock?: (target: NonNullable<CompletenessItem['navigationTarget']>) => void
}

const BLOCK_ICONS: Record<MasterSheetBlockKey, React.ComponentType<{ className?: string }>> = {
  IDENTIFICATION_GOVERNANCE: Building2,
  CAPACITY_CALENDAR: Calendar,
  PROCESS: Sliders,
  MATERIALS: Layers,
  INTEGRATIONS: Database,
}

export const MasterSheetCompletenessModal: React.FC<MasterSheetCompletenessModalProps> = ({
  open,
  onClose,
  completeness,
  loading = false,
  onNavigateToBlock,
}) => {
  if (!completeness) return null

  const getStatusBadge = (status: MasterSheetCompletenessResult['status']) => {
    switch (status) {
      case 'Completa':
        return (
          <Badge className="bg-emerald-600 text-white font-bold text-xs px-2.5 py-0.5">
            ● 100% — Completa
          </Badge>
        )
      case 'Quase completa':
        return (
          <Badge className="bg-blue-600 text-white font-bold text-xs px-2.5 py-0.5">
            ● {completeness.percentage}% — Quase completa
          </Badge>
        )
      case 'Em preenchimento':
        return (
          <Badge className="bg-amber-600 text-white font-bold text-xs px-2.5 py-0.5">
            ● {completeness.percentage}% — Em preenchimento
          </Badge>
        )
      case 'Incompleta':
      default:
        return (
          <Badge className="bg-rose-600 text-white font-bold text-xs px-2.5 py-0.5">
            ● {completeness.percentage}% — Incompleta
          </Badge>
        )
    }
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'bg-emerald-500'
    if (pct >= 80) return 'bg-blue-600'
    if (pct >= 50) return 'bg-amber-500'
    return 'bg-rose-500'
  }

  const blockEntries = Object.entries(completeness.blocks) as [
    MasterSheetBlockKey,
    MasterSheetCompletenessResult['blocks'][MasterSheetBlockKey],
  ][]

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-slate-200">
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-gradient-to-r from-[#004C97] via-[#003870] to-slate-900 text-white rounded-t-lg">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    Completude da Ficha Mestre
                  </DialogTitle>
                  <span className="font-mono text-cyan-300 font-bold text-sm bg-blue-950/70 px-2 py-0.5 rounded border border-blue-400/30">
                    {completeness.lineCode}
                  </span>
                </div>
                <DialogDescription className="text-xs text-blue-100/80">
                  Diagnóstico determinístico dos parâmetros obrigatórios por tipo de linha
                  produtiva.
                </DialogDescription>
              </div>

              <div>{getStatusBadge(completeness.status)}</div>
            </div>
          </DialogHeader>

          {/* Barra Geral de Progresso */}
          <div className="mt-5 p-4 bg-white/10 rounded-xl border border-white/15 backdrop-blur-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/90">Índice Geral de Preenchimento:</span>
              <span className="font-mono font-black text-lg text-white">
                {completeness.percentage}%
              </span>
            </div>
            <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(completeness.percentage)}`}
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-blue-100/70 pt-1">
              <span>
                {completeness.totalFulfilled} de {completeness.totalApplicable} parâmetros
                obrigatórios preenchidos
              </span>
              <span className="italic">Campos N/A não penalizam o score</span>
            </div>
          </div>
        </div>

        {/* Aviso de Governança: Completude ≠ Homologação */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-900 font-medium">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Aviso de Governança:</strong> Completude cadastral não substitui homologação
            técnica nem liberação formal por alçada executiva.
          </span>
        </div>

        <div className="p-6 space-y-6 bg-slate-50">
          {/* Percentual por Bloco */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Detalhamento por Blocos da Ficha Mestre
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {blockEntries.map(([key, block]) => {
                const Icon = BLOCK_ICONS[key] || Sliders
                return (
                  <div
                    key={key}
                    className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-blue-50 text-[#004C97]">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {block.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {block.totalFulfilled}/{block.totalApplicable} itens preenchidos
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-sm text-[#004C97]">
                        {block.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getProgressColor(block.percentage)}`}
                        style={{ width: `${block.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista de Pendências em Texto Claro com Links para Correção */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Lista de Pendências ({completeness.pendencies.length})
              </h3>
              <span className="text-[11px] text-slate-500">
                {completeness.pendencies.length === 0
                  ? 'Todos os parâmetros obrigatórios foram preenchidos!'
                  : 'Clique na pendência para navegar diretamente para a seção correspondente.'}
              </span>
            </div>

            {completeness.pendencies.length === 0 ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-emerald-900">Ficha Mestre 100% Preenchida!</p>
                <p className="text-xs text-emerald-700">
                  Todos os parâmetros obrigatórios da linha {completeness.lineCode} foram informados
                  e estão aptos para validação.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {completeness.pendencies.map((pend) => {
                  const blockTitle = completeness.blocks[pend.blockKey]?.title || 'Ficha Mestre'
                  return (
                    <div
                      key={pend.id}
                      className="p-3 bg-white rounded-lg border border-amber-200 hover:border-[#004C97] transition-all flex items-center justify-between gap-3 text-xs shadow-xs group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{pend.label}</span>
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-slate-50 text-slate-600 border-slate-200"
                          >
                            {blockTitle}
                          </Badge>
                        </div>
                        <p className="text-rose-600 font-medium text-[11px]">
                          {pend.missingMessage ||
                            'Parâmetro obrigatório pendente de preenchimento.'}
                        </p>
                      </div>

                      {pend.navigationTarget && onNavigateToBlock && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            onNavigateToBlock(pend.navigationTarget!)
                            onClose()
                          }}
                          className="text-[#004C97] hover:bg-blue-50 font-semibold text-xs h-7 gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform"
                        >
                          Corrigir <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#004C97]" />
            <span>
              Último recálculo: {new Date(completeness.calculatedAt).toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold text-xs h-8"
          >
            Fechar Painel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
