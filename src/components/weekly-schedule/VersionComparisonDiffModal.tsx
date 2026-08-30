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
import { ArrowLeftRight, Check, AlertCircle } from 'lucide-react'
import { ScheduleItemDiff } from '@/types/schedule-versioning'

interface VersionComparisonDiffModalProps {
  isOpen: boolean
  onClose: () => void
  versionA: string // ex: "V02"
  versionB: string // ex: "V03"
  diffs: ScheduleItemDiff[]
  lineCode: string
  weekDisplay: string
}

export const VersionComparisonDiffModal: React.FC<VersionComparisonDiffModalProps> = ({
  isOpen,
  onClose,
  versionA,
  versionB,
  diffs,
  lineCode,
  weekDisplay,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Comparação de Versões: {versionA} &times; {versionB}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Exibindo exclusivamente as diferenças identificadas entre as revisões da Linha{' '}
                  {lineCode}.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-xs font-mono">
              {diffs.length} diferença(s)
            </Badge>
          </div>
        </DialogHeader>

        {/* Legenda de Cores Oficiais: Verde = incluído, Amarelo = alterado, Vermelho = removido */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
          <span className="font-bold text-slate-700">Legenda de Cores CIAFAL:</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-medium text-emerald-800">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Verde = Incluído
            </span>
            <span className="flex items-center gap-1 font-medium text-amber-800">
              <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Amarelo = Alterado
            </span>
            <span className="flex items-center gap-1 font-medium text-rose-800">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Vermelho = Removido
            </span>
          </div>
        </div>

        {/* Lista de Diffs */}
        <div className="space-y-3 py-2 text-xs max-h-[55vh] overflow-y-auto pr-1">
          {diffs.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <Check className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-bold text-slate-700">Versões Idênticas</p>
              <p className="text-slate-500 text-xs">
                Nenhuma alteração detectada entre {versionA} e {versionB}.
              </p>
            </div>
          ) : (
            diffs.map((diff, i) => (
              <div
                key={diff.id || i}
                className={`p-3.5 rounded-xl border space-y-2 transition-all ${
                  diff.changeType === 'INCLUIDO'
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : diff.changeType === 'REMOVIDO'
                      ? 'bg-rose-50/70 border-rose-300'
                      : 'bg-amber-50/70 border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        diff.changeType === 'INCLUIDO'
                          ? 'bg-emerald-600 text-white'
                          : diff.changeType === 'REMOVIDO'
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-500 text-white'
                      }`}
                    >
                      {diff.changeType}
                    </span>
                    <strong className="text-slate-900 font-mono text-sm">
                      {diff.materialCode}
                    </strong>
                    <span className="text-slate-600 text-[11px]">{diff.materialDescription}</span>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      diff.relevance === 'ALTA'
                        ? 'border-rose-400 text-rose-700 bg-rose-50'
                        : diff.relevance === 'MEDIA'
                          ? 'border-amber-400 text-amber-800 bg-amber-50'
                          : 'border-emerald-400 text-emerald-700 bg-emerald-50'
                    }`}
                  >
                    {diff.relevance} Relevância
                  </Badge>
                </div>

                {/* Grid comparativo Antes x Depois */}
                <div className="bg-white/90 p-3 rounded-lg border border-slate-200 space-y-2">
                  {diff.fieldDiffs.map((fd, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 text-xs items-center font-mono"
                    >
                      <span className="col-span-3 font-bold text-slate-700 font-sans">
                        {fd.fieldNamePt}:
                      </span>
                      <div className="col-span-4 p-1.5 rounded bg-slate-100 text-slate-600 line-through truncate">
                        {fd.previousValue}
                      </div>
                      <span className="col-span-1 text-center font-bold text-slate-400">
                        &rarr;
                      </span>
                      <div
                        className={`col-span-4 p-1.5 rounded font-bold truncate ${
                          fd.highlightColor === 'green'
                            ? 'bg-emerald-100 text-emerald-900'
                            : fd.highlightColor === 'red'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-950'
                        }`}
                      >
                        {fd.newValue}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detalhes de rastreabilidade */}
                {(diff.customerAffected || diff.sapOpAffected || diff.notes) && (
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                    {diff.customerAffected && (
                      <span>
                        Cliente: <strong className="text-slate-800">{diff.customerAffected}</strong>
                      </span>
                    )}
                    {diff.salesOrder && (
                      <span>
                        Pedido MTO: <strong>{diff.salesOrder}</strong>
                      </span>
                    )}
                    {diff.sapOpAffected && (
                      <span className="text-rose-700 font-bold font-mono">
                        OP SAP: {diff.sapOpAffected}
                      </span>
                    )}
                    {diff.notes && <span className="text-slate-500 italic">({diff.notes})</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onClose} className="text-xs h-9">
            Fechar Comparação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default VersionComparisonDiffModal
