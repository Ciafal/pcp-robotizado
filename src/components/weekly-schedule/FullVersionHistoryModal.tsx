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
import {
  History,
  Clock,
  User,
  ArrowRight,
  GitCommit,
  ArrowLeftRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
} from 'lucide-react'
import { ScheduleVersionRecord } from '@/types/schedule-versioning'
import { VersionComparisonDiffModal } from './VersionComparisonDiffModal'

interface FullVersionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  versions: ScheduleVersionRecord[]
  scheduleCode: string
  currentVersionNumber: number
  lineCode: string
  weekDisplay: string
  onSelectVersionToView?: (ver: ScheduleVersionRecord) => void
}

export const FullVersionHistoryModal: React.FC<FullVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  scheduleCode,
  currentVersionNumber,
  lineCode,
  weekDisplay,
  onSelectVersionToView,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<ScheduleVersionRecord | null>(
    versions[0] || null,
  )
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareVerA, setCompareVerA] = useState<ScheduleVersionRecord | null>(null)
  const [compareVerB, setCompareVerB] = useState<ScheduleVersionRecord | null>(null)

  const handleOpenDiff = (verA: ScheduleVersionRecord, verB: ScheduleVersionRecord) => {
    setCompareVerA(verA)
    setCompareVerB(verB)
    setCompareModalOpen(true)
  }

  const getRelevanceBadge = (rel: string) => {
    switch (rel) {
      case 'ALTA':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
            🔴 ALTA
          </Badge>
        )
      case 'MEDIA':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
            🟡 MÉDIA
          </Badge>
        )
      case 'BAIXA':
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
            🟢 BAIXA
          </Badge>
        )
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#004C97] text-white rounded-lg">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black text-slate-900">
                    Histórico Oficial de Versões ({scheduleCode})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Nenhuma versão anterior é sobrescrita ou apagada. Controle auditável completo
                    com snapshots e diffs.
                  </DialogDescription>
                </div>
              </div>
              <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-xs font-mono">
                Linha {lineCode} &bull; Vigente: V{String(currentVersionNumber).padStart(2, '0')}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {versions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <GitCommit className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-slate-700">Versão V01 Oficial</p>
                <p className="text-slate-500 text-[11px] max-w-md mx-auto">
                  Esta programação está em sua versão base oficial (V01). Modificações subsequentes
                  gerarão revisões imutáveis (V02, V03...).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Tabela de Versões (Requisito 6) */}
                <div className="md:col-span-5 space-y-2 border-r border-slate-200 pr-3">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                    Trilha de Revisões ({versions.length})
                  </span>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {versions.map((ver, idx) => {
                      const isSelected = selectedVersion?.version_code === ver.version_code
                      const prevInList = versions[idx + 1]

                      return (
                        <div
                          key={ver.id || ver.version_code}
                          className={`p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-blue-50/90 border-[#004C97] shadow-sm'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-[#004C97]">
                                {ver.version_tag}
                              </span>
                              {ver.is_current_published && (
                                <Badge className="bg-emerald-600 text-white text-[9px]">
                                  VIGENTE
                                </Badge>
                              )}
                            </div>
                            {getRelevanceBadge(ver.relevance_level)}
                          </div>

                          <p className="text-[11px] font-bold text-slate-800 line-clamp-1">
                            {ver.change_reason}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                            <span>{ver.user_name}</span>
                            <span>
                              {ver.created
                                ? new Date(ver.created).toLocaleString('pt-BR').slice(0, 16)
                                : 'Hoje'}
                            </span>
                          </div>

                          {/* Ações da Versão (Requisito 6) */}
                          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/70">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedVersion(ver)}
                              className="h-6 text-[10px] px-2 bg-white"
                            >
                              <Eye className="w-3 h-3 mr-1" /> Visualizar
                            </Button>

                            {prevInList && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDiff(prevInList, ver)}
                                className="h-6 text-[10px] px-2 bg-white text-[#004C97] border-blue-200"
                              >
                                <ArrowLeftRight className="w-3 h-3 mr-1" /> Comparar (
                                {prevInList.version_tag} &times; {ver.version_tag})
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Detalhes e Snapshot da Versão Selecionada (Requisito 5) */}
                <div className="md:col-span-7 space-y-3">
                  {selectedVersion ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 text-sm">
                              {selectedVersion.version_code}
                            </h4>
                            {selectedVersion.is_current_published && (
                              <Badge className="bg-emerald-600 text-white text-[10px]">
                                Vigente no Chão de Fábrica
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Data/Hora:{' '}
                            {selectedVersion.created
                              ? new Date(selectedVersion.created).toLocaleString('pt-BR')
                              : 'Hoje'}
                          </span>
                        </div>
                        {getRelevanceBadge(selectedVersion.relevance_level)}
                      </div>

                      {/* Metadados da Versão */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block font-semibold">
                            Usuário Responsável:
                          </span>
                          <strong className="text-slate-800 flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-[#004C97]" />
                            {selectedVersion.user_name}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block font-semibold">
                            Motivo Oficial:
                          </span>
                          <span className="font-bold text-[#004C97]">
                            {selectedVersion.change_reason}
                          </span>
                        </div>
                      </div>

                      {/* Notificações e Integrações */}
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200 grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div>
                          <span className="text-slate-400 block font-mono">MES</span>
                          <span className="font-bold text-emerald-700">Notificado</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-mono">CIÊNCIA MES</span>
                          <span
                            className={`font-bold ${
                              selectedVersion.mes_ack_status === 'RECONHECIDO'
                                ? 'text-emerald-700'
                                : 'text-amber-600'
                            }`}
                          >
                            {selectedVersion.mes_ack_status || 'NAO_LIDO'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-mono">CRM 360º</span>
                          <span className="font-bold text-slate-700">
                            {selectedVersion.crm_dispatched ? 'Alertado' : 'Sem ruído'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-mono">SAP OP</span>
                          <span className="font-bold text-slate-700">
                            {selectedVersion.sap_dispatched ? 'Tratamento' : 'Sincronizado'}
                          </span>
                        </div>
                      </div>

                      {/* Snapshot Completo dos Itens (Requisito 5) */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                            Snapshot de Itens ({selectedVersion.snapshot_data?.length || 0}{' '}
                            atividades)
                          </span>
                          <span className="text-[10px] text-slate-400">Totalmente auditável</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 divide-y divide-slate-100 text-[11px]">
                          {(selectedVersion.snapshot_data || []).map((it, idx) => (
                            <div
                              key={idx}
                              className="py-1.5 flex items-center justify-between font-mono"
                            >
                              <div>
                                <span className="font-bold text-slate-800">
                                  #{it.sequence_order || idx + 1} &bull; {it.day_of_week}{' '}
                                  {it.date_str}
                                </span>
                                <span className="text-slate-600 ml-2">
                                  <strong>{it.material_code}</strong> ({it.planned_quantity_tons} t)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px]">
                                {it.customer_name && (
                                  <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-sans">
                                    {it.customer_name}
                                  </span>
                                )}
                                <span className="text-slate-400">{it.shift_name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Diffs Registrados da Versão */}
                      {selectedVersion.diff_payload && selectedVersion.diff_payload.length > 0 && (
                        <div>
                          <span className="text-slate-700 font-bold text-[11px] uppercase tracking-wider block mb-1">
                            Diferenças Gravadas nesta Revisão ({selectedVersion.diff_payload.length}
                            ):
                          </span>
                          <div className="p-2 bg-white rounded border border-slate-200 space-y-1 text-[11px]">
                            {selectedVersion.diff_payload.slice(0, 3).map((d, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="font-mono text-slate-800">
                                  &bull; {d.materialCode} ({d.changeType})
                                </span>
                                <span className="text-slate-500 text-[10px]">
                                  {d.fieldDiffs?.[0]?.fieldNamePt}:{' '}
                                  {d.fieldDiffs?.[0]?.previousValue} &rarr;{' '}
                                  {d.fieldDiffs?.[0]?.newValue}
                                </span>
                              </div>
                            ))}
                            {selectedVersion.diff_payload.length > 3 && (
                              <span className="text-[10px] text-slate-400 block text-right">
                                + {selectedVersion.diff_payload.length - 3} outra(s) alteração(ões)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">
                      Selecione uma versão para visualizar seus dados.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={onClose} className="text-xs h-9">
              Fechar Histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Comparação Diff */}
      {compareVerA && compareVerB && (
        <VersionComparisonDiffModal
          isOpen={compareModalOpen}
          onClose={() => setCompareModalOpen(false)}
          versionA={compareVerA.version_tag}
          versionB={compareVerB.version_tag}
          diffs={compareVerB.diff_payload || []}
          lineCode={lineCode}
          weekDisplay={weekDisplay}
        />
      )}
    </>
  )
}
export default FullVersionHistoryModal
