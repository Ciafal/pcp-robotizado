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
import { Badge } from '@/components/ui/badge'
import { History, Clock, User, FileText, AlertTriangle, ArrowRight, GitCommit } from 'lucide-react'
import { WeeklyScheduleVersionRecord } from '@/types/weekly-schedule'

interface VersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  versions: WeeklyScheduleVersionRecord[]
  scheduleCode: string
  currentVersion: number
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  scheduleCode,
  currentVersion,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<WeeklyScheduleVersionRecord | null>(
    versions[0] || null,
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Trilha de Auditoria & Versões Pós-Publicação
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Histórico completo de alterações com registro de usuário, data/hora, motivo,
                  impacto e snapshot.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs font-mono">
              {scheduleCode} &bull; v{currentVersion}.0
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {versions.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <GitCommit className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700">Versão Inicial (v1.0)</p>
              <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                Esta programação está em sua primeira versão de publicação. Alterações subsequentes
                gerarão revisões numeradas (v2.0, v3.0...) com trilha de auditoria formal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Lista de Versões */}
              <div className="space-y-2 border-r border-slate-200 pr-3">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                  Revisões Gravadas ({versions.length})
                </span>
                {versions.map((ver) => (
                  <button
                    key={ver.id || ver.version_number}
                    type="button"
                    onClick={() => setSelectedVersion(ver)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedVersion?.version_number === ver.version_number
                        ? 'bg-blue-50/80 border-[#004C97] text-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#004C97]">
                        Versão {ver.version_number}.0
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {ver.created ? new Date(ver.created).toLocaleDateString('pt-BR') : 'Hoje'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-1 font-medium">
                      {ver.change_reason}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Por: {ver.user_name}
                    </span>
                  </button>
                ))}
              </div>

              {/* Detalhes da Versão Selecionada */}
              <div className="md:col-span-2 space-y-3">
                {selectedVersion ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">
                          Detalhes da Versão {selectedVersion.version_number}.0
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {selectedVersion.created
                            ? new Date(selectedVersion.created).toLocaleString('pt-BR')
                            : 'Data não registrada'}
                        </span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                        Auditado
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Usuário Responsável:</span>
                        <strong className="text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-[#004C97]" />
                          {selectedVersion.user_name}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Email Corporativo:</span>
                        <span className="font-mono text-slate-700">
                          {selectedVersion.user_email || 'ciafal@ciafal.com.br'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-bold text-[10px] uppercase">
                        Motivo da Alteração:
                      </span>
                      <p className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-xs mt-0.5">
                        {selectedVersion.change_reason}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-bold text-[10px] uppercase">
                        Avaliação de Impacto Operacional:
                      </span>
                      <p className="p-2 bg-white rounded border border-slate-200 text-slate-800 text-xs mt-0.5">
                        {selectedVersion.impact_assessment}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 block font-bold text-[10px] uppercase mb-1">
                        Snapshot de Itens ({selectedVersion.new_schedule_data?.length || 0}{' '}
                        atividades)
                      </span>
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded bg-white p-2 divide-y divide-slate-100 text-[11px]">
                        {(selectedVersion.new_schedule_data || []).map((it, i) => (
                          <div key={i} className="py-1 flex items-center justify-between font-mono">
                            <span>
                              #{it.sequence_order || i + 1} &bull; {it.day_of_week} &bull;{' '}
                              <strong>{it.material_code}</strong> ({it.planned_quantity_tons} t)
                            </span>
                            <span className="text-slate-500 text-[10px]">{it.shift_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Selecione uma versão para visualizar.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onClose} className="text-xs h-9">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default VersionHistoryModal
