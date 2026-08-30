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
  AlertTriangle,
  Factory,
  Radio,
  Briefcase,
  Users,
  Truck,
  Layers,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react'
import {
  VersionImpactAssessment,
  ScheduleItemDiff,
  ChangeReasonExact,
  CHANGE_REASONS_LIST,
} from '@/types/schedule-versioning'

interface PrePublishImpactModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmPublish: (reason: ChangeReasonExact | string, notes: string) => void
  impact: VersionImpactAssessment | null
  diffs: ScheduleItemDiff[]
  nextVersionTag: string
  previousVersionTag?: string
  lineCode: string
  weekDisplay: string
  isPublishing?: boolean
}

export const PrePublishImpactModal: React.FC<PrePublishImpactModalProps> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  impact,
  diffs,
  nextVersionTag,
  previousVersionTag = 'V01',
  lineCode,
  weekDisplay,
  isPublishing = false,
}) => {
  const [selectedReason, setSelectedReason] = useState<ChangeReasonExact>(
    'reprogramação operacional',
  )
  const [customNotes, setCustomNotes] = useState('')
  const [activeDiffTab, setActiveDiffTab] = useState<'IMPACT' | 'DIFFS'>('IMPACT')

  if (!impact) return null

  const getRelevanceBadge = (rel: 'BAIXA' | 'MEDIA' | 'ALTA') => {
    switch (rel) {
      case 'ALTA':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold">
            🔴 ALTA RELEVÂNCIA
          </Badge>
        )
      case 'MEDIA':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">
            🟡 MÉDIA RELEVÂNCIA
          </Badge>
        )
      case 'BAIXA':
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
            🟢 BAIXA RELEVÂNCIA
          </Badge>
        )
    }
  }

  const handlePublish = () => {
    onConfirmPublish(selectedReason, customNotes)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#004C97] text-white rounded-lg">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-slate-900">
                  Painel de Impacto da Nova Versão ({previousVersionTag} &rarr; {nextVersionTag})
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Avaliação pré-publicação multidimensional: Produção, MES, Carteira, CRM 360º, TMS
                  e SAP.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border">
                Linha {lineCode} &bull; {weekDisplay}
              </span>
              {getRelevanceBadge(impact.overallRelevance)}
            </div>
          </div>
        </DialogHeader>

        {/* Abas Superiores */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveDiffTab('IMPACT')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              activeDiffTab === 'IMPACT'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Matriz de Impacto Integrado
          </button>
          <button
            type="button"
            onClick={() => setActiveDiffTab('DIFFS')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5 ${
              activeDiffTab === 'DIFFS'
                ? 'bg-[#004C97] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Diferenças de Versão ({diffs.length} itens)
          </button>
        </div>

        {activeDiffTab === 'IMPACT' ? (
          <div className="space-y-4 py-1 text-xs">
            {/* Grid dos 6 Impactos Obrigatórios (Requisito 12) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. PRODUÇÃO */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Factory className="w-4 h-4 text-[#004C97]" /> Produção
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {impact.production.itemsChangedCount +
                      impact.production.itemsAddedCount +
                      impact.production.itemsRemovedCount}{' '}
                    itens alterados
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600">{impact.production.summary}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  &bull; +{impact.production.itemsAddedCount} novos | -
                  {impact.production.itemsRemovedCount} removidos
                </div>
              </div>

              {/* 2. MES (CHÃO DE FÁBRICA) */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-[#004C97]" /> Chão de Fábrica (MES)
                  </span>
                  <Badge className="bg-blue-600 text-white text-[10px]">OBRIGATÓRIO</Badge>
                </div>
                <p className="text-[11px] text-blue-950 font-medium">
                  {lineCode} será notificada em tempo real no terminal com controle de ciência.
                </p>
                <div className="text-[10px] text-blue-700">
                  Operação visualizará versão {nextVersionTag} com banner de alteração.
                </div>
              </div>

              {/* 3. CARTEIRA */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600" /> Carteira Comercial
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    {impact.crm.affectedOrdersCount} pedido(s)
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600">{impact.crm.summary}</p>
              </div>

              {/* 4. CRM 360º */}
              <div
                className={`p-3 rounded-xl space-y-1.5 border ${
                  impact.crm.willNotify
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-600" /> CRM 360º
                  </span>
                  {impact.crm.willNotify ? (
                    <Badge className="bg-amber-500 text-white text-[10px]">ALERTA ATIVO</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      SEM RUÍDO
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-700 font-medium">
                  {impact.crm.willNotify
                    ? `${impact.crm.affectedCustomersCount} cliente(s) afetado(s): ${impact.crm.customersList.join(', ')}.`
                    : 'Sem impacto comercial direto. Equipe CRM não será incomodada.'}
                </p>
                {impact.crm.willNotify && (
                  <div className="text-[10px] text-amber-800">
                    Notificará vendedor do cliente e representante com tradução de IA.
                  </div>
                )}
              </div>

              {/* 5. TMS (LOGÍSTICA) */}
              <div
                className={`p-3 rounded-xl space-y-1.5 border ${
                  impact.tms.needsRecalculation
                    ? 'bg-blue-50/60 border-blue-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-700" /> TMS Logística
                  </span>
                  {impact.tms.needsRecalculation ? (
                    <Badge className="bg-blue-600 text-white text-[10px]">RECALCULAR</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      OK
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-700">{impact.tms.summary}</p>
                <div className="text-[10px] text-slate-500">
                  Data de produto disponível será recalculada para despacho.
                </div>
              </div>

              {/* 6. SAP ECC (ORDEM DE PRODUÇÃO) */}
              <div
                className={`p-3 rounded-xl space-y-1.5 border ${
                  impact.sap.requiresHandling
                    ? 'bg-rose-50 border-rose-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-rose-700" /> Integração SAP
                  </span>
                  {impact.sap.requiresHandling ? (
                    <Badge className="bg-rose-600 text-white text-[10px]">TRATAMENTO SAP</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      SINCRONIZADO
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-800 font-medium">{impact.sap.summary}</p>
                {impact.sap.requiresHandling && (
                  <div className="text-[10px] text-rose-700 font-mono">
                    Atualizará RFC ZPP_PROD na fila PostgreSQL &rarr; SAP.
                  </div>
                )}
              </div>
            </div>

            {/* Motivos da Classificação */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Fatores Determinantes da Relevância:
              </span>
              <div className="flex flex-wrap gap-2">
                {impact.relevanceReasons.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border rounded text-[11px] text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#004C97]" /> {r}
                  </span>
                ))}
              </div>
            </div>

            {/* Formulário de Motivo Obrigatório (Requisito 8) */}
            <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  Motivo da Alteração <span className="text-rose-600">*</span> (Obrigatório conforme
                  Governança CIAFAL):
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value as ChangeReasonExact)}
                  className="w-full text-xs font-semibold p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#004C97]"
                >
                  {CHANGE_REASONS_LIST.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 text-xs mb-1">
                  Observações Técnicas / Justificativa Complementar:
                </label>
                <textarea
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: Ajuste acordado com Comercial devido à entrega atrasada do tarugo 150x150 em 29/08..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#004C97]"
                />
              </div>
            </div>
          </div>
        ) : (
          /* Aba de Diferenças (Diffs) */
          <div className="space-y-3 py-1 max-h-[50vh] overflow-y-auto pr-1">
            {diffs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Nenhuma diferença encontrada.</div>
            ) : (
              diffs.map((diff) => (
                <div
                  key={diff.id}
                  className={`p-3 rounded-lg border text-xs space-y-2 ${
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
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          diff.changeType === 'INCLUIDO'
                            ? 'bg-emerald-600 text-white'
                            : diff.changeType === 'REMOVIDO'
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                        }`}
                      >
                        {diff.changeType}
                      </span>
                      <strong className="text-slate-900 font-mono text-xs">
                        {diff.materialCode}
                      </strong>
                      <span className="text-slate-500 text-[11px]">{diff.materialDescription}</span>
                    </div>
                    {getRelevanceBadge(diff.relevance)}
                  </div>

                  <div className="bg-white/80 p-2.5 rounded border border-slate-200/80 space-y-1.5">
                    {diff.fieldDiffs.map((fd, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 text-[11px] items-center">
                        <span className="col-span-3 font-semibold text-slate-700">
                          {fd.fieldNamePt}:
                        </span>
                        <span className="col-span-4 text-slate-500 line-through truncate font-mono">
                          {fd.previousValue}
                        </span>
                        <span className="col-span-1 text-center font-bold text-slate-400">
                          &rarr;
                        </span>
                        <span
                          className={`col-span-4 font-bold font-mono truncate ${
                            fd.highlightColor === 'green'
                              ? 'text-emerald-700'
                              : fd.highlightColor === 'red'
                                ? 'text-rose-700'
                                : 'text-amber-800'
                          }`}
                        >
                          {fd.newValue}
                        </span>
                      </div>
                    ))}
                  </div>

                  {(diff.customerAffected || diff.sapOpAffected) && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-600 font-medium">
                      {diff.customerAffected && (
                        <span>
                          Cliente: <strong>{diff.customerAffected}</strong>
                        </span>
                      )}
                      {diff.salesOrder && (
                        <span>
                          Pedido: <strong>{diff.salesOrder}</strong>
                        </span>
                      )}
                      {diff.sapOpAffected && (
                        <span className="text-rose-700 font-mono">
                          OP SAP: {diff.sapOpAffected}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Rodapé com os 3 botões exigidos no Requisito 12 */}
        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between w-full">
          <Button variant="outline" onClick={onClose} className="text-xs h-9">
            Voltar e revisar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-xs h-9 text-slate-500 hover:text-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing}
              className="text-xs h-9 bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-sm"
            >
              {isPublishing ? 'Publicando...' : `Publicar Nova Versão (${nextVersionTag})`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default PrePublishImpactModal
