import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  FileCheck,
  Send,
  Upload,
  Info,
  Clock,
  BarChart3,
  Sliders,
} from 'lucide-react'
import { SetupAcertoRecord } from '@/services/pcp-rules-service'
import { MesStatisticalEngine } from '@/services/rules-ai-engine'

interface NewRevisionModalProps {
  isOpen: boolean
  onClose: () => void
  record: SetupAcertoRecord | null
  onSubmitProposal: (data: {
    proposedMinutes: number
    changeReason: string
    justificationCategory?: string
    justificationDetail?: string
    aiClassification: string
    aiExplanation: string
    mesSnapshot: any
  }) => void
}

const JUSTIFICATION_OPTIONS = [
  { value: 'EQUIPMENT_CHANGE', label: 'Alteração de Equipamento' },
  { value: 'PROCESS_IMPROVEMENT', label: 'Melhoria Implementada / Kaizen' },
  { value: 'NEW_TOOLING', label: 'Novo Ferramental / Troca Rápida (SMED)' },
  { value: 'PROCESS_CHANGE', label: 'Mudança de Processo Metalúrgico' },
  { value: 'METHOD_CHANGE', label: 'Alteração de Método Operacional' },
  { value: 'SAMPLE_NON_REPRESENTATIVE', label: 'Amostra Histórica Não Representativa' },
  { value: 'OTHER', label: 'Outra Justificativa Técnica' },
]

export const NewRevisionModal: React.FC<NewRevisionModalProps> = ({
  isOpen,
  onClose,
  record,
  onSubmitProposal,
}) => {
  const defaultMinutes = record?.setup_time_minutes || 60
  const [proposedMinutes, setProposedMinutes] = useState<number>(defaultMinutes)
  const [changeReason, setChangeReason] = useState<string>('')
  const [justificationCategory, setJustificationCategory] = useState<string>('')
  const [justificationDetail, setJustificationDetail] = useState<string>('')
  const [hasAttachment, setHasAttachment] = useState<boolean>(false)

  // Estatística MES correspondente
  const mesStats = useMemo(() => {
    if (!record) return MesStatisticalEngine.getMesEvidence('L1', 60)
    return MesStatisticalEngine.getMesEvidence(
      record.line_code,
      record.setup_time_minutes,
      record.from_code_prefix,
      record.to_code_prefix,
      record.setup_code,
    )
  }, [record])

  // Avaliação IA em tempo real da proposta digitada
  const aiEvaluation = useMemo(() => {
    const current = record?.setup_time_minutes || 60
    return MesStatisticalEngine.evaluateProposal(
      current,
      proposedMinutes,
      mesStats,
      justificationDetail,
    )
  }, [record?.setup_time_minutes, proposedMinutes, mesStats, justificationDetail])

  if (!isOpen || !record) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSubmitProposal({
      proposedMinutes,
      changeReason:
        changeReason ||
        `Revisão do tempo de setup de ${record.setup_time_minutes} min para ${proposedMinutes} min`,
      justificationCategory: aiEvaluation.requiresTechnicalJustification
        ? justificationCategory
        : undefined,
      justificationDetail: aiEvaluation.requiresTechnicalJustification
        ? justificationDetail
        : undefined,
      aiClassification: aiEvaluation.classification,
      aiExplanation: aiEvaluation.explanation,
      mesSnapshot: {
        sampleCount: mesStats.sampleCount,
        median: mesStats.median,
        mean: mesStats.mean,
        p25: mesStats.p25,
        p75: mesStats.p75,
      },
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white text-slate-900 border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Nova Proposta de Revisão Paramétrica
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono bg-blue-50 text-[#004C97] border-blue-200"
                >
                  {record.line_code} &bull; {record.setup_code || 'SETUP'}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Todo parâmetro publicado exige workflow de homologação. A IA confrontará a proposta
                contra a base real do MES.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 my-2 text-xs">
          {/* COMPARAÇÃO DO VALOR: ATUAL VS PROPOSTO */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="text-slate-500 block mb-1 font-medium">
                Tempo de Setup Atual (Oficial)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  disabled
                  value={`${record.setup_time_minutes} min`}
                  className="bg-slate-100 font-mono font-bold text-slate-700 h-9"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-700 block mb-1 font-bold">
                Tempo de Setup Proposto (min)
              </label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={proposedMinutes}
                onChange={(e) => setProposedMinutes(parseInt(e.target.value) || 0)}
                className="bg-white font-mono font-bold text-[#004C97] border-blue-300 focus:border-blue-500 h-9"
              />
            </div>
          </div>

          {/* EVIDÊNCIA DO MES EM TEMPO REAL (REQUISITO 2) */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-900">
              <span className="flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-blue-700" />
                Evidência MES Considerada
              </span>
              <span className="font-mono">{mesStats.sampleCount} ocorrências</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
              <div className="bg-white p-1.5 rounded border border-blue-100">
                <span className="text-[10px] text-slate-500 block">Média MES</span>
                <span className="font-bold font-mono text-slate-800">{mesStats.mean} min</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-blue-100">
                <span className="text-[10px] text-blue-700 font-bold block">Mediana MES</span>
                <span className="font-bold font-mono text-blue-900">{mesStats.median} min</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-blue-100">
                <span className="text-[10px] text-slate-500 block">P25 (Q1)</span>
                <span className="font-mono text-slate-800">{mesStats.p25} min</span>
              </div>
              <div className="bg-white p-1.5 rounded border border-blue-100">
                <span className="text-[10px] text-slate-500 block">P75 (Q3)</span>
                <span className="font-mono text-slate-800">{mesStats.p75} min</span>
              </div>
            </div>
          </div>

          {/* RESULTADO DA ANÁLISE IA (REQUISITO 2 & 3) */}
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
              aiEvaluation.classification === 'COERENTE'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : aiEvaluation.classification === 'REVISAR'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : aiEvaluation.classification === 'POUCA_EVIDENCIA'
                    ? 'bg-orange-50 border-orange-300 text-orange-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {aiEvaluation.badgeLabel}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-mono ${
                  aiEvaluation.classification === 'COERENTE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : aiEvaluation.classification === 'INCOERENTE'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                {aiEvaluation.classification}
              </Badge>
            </div>
            <p className="text-[11px] leading-relaxed">{aiEvaluation.explanation}</p>
            <p className="text-[11px] font-medium opacity-90">{aiEvaluation.technicalSuggestion}</p>
          </div>

          {/* MOTIVO DA ALTERAÇÃO */}
          <div>
            <label className="text-slate-700 block mb-1 font-bold">
              Motivo da Solicitação de Revisão
            </label>
            <Input
              placeholder="Ex: Novo ferramental de encaixe rápido instalado na Linha 1..."
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="bg-white text-xs h-9"
              required
            />
          </div>

          {/* SEÇÃO OBRIGATÓRIA DE JUSTIFICATIVA TÉCNICA SE DIVERGENTE / INCOERENTE (REQUISITO 8) */}
          {aiEvaluation.requiresTechnicalJustification && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Justificativa Técnica Formal Obrigatória</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Por apresentar divergência ou incoerência em relação aos dados históricos do MES,
                selecione a categoria de justificativa e descreva a comprovação técnica:
              </p>

              <div className="space-y-2">
                <div>
                  <label className="text-slate-700 block mb-1 font-medium">
                    Categoria da Justificativa:
                  </label>
                  <Select value={justificationCategory} onValueChange={setJustificationCategory}>
                    <SelectTrigger className="bg-white h-8 text-xs">
                      <SelectValue placeholder="Selecione a categoria técnica..." />
                    </SelectTrigger>
                    <SelectContent>
                      {JUSTIFICATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-medium">
                    Detalhamento Técnico / Evidência:
                  </label>
                  <Textarea
                    placeholder="Descreva o teste de cronometragem, número do Kaizen ou especificações do novo ferramental..."
                    value={justificationDetail}
                    onChange={(e) => setJustificationDetail(e.target.value)}
                    className="bg-white text-xs min-h-[60px]"
                    required={aiEvaluation.requiresTechnicalJustification}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHasAttachment(!hasAttachment)}
                    className={`h-7 text-[11px] gap-1 ${
                      hasAttachment
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    {hasAttachment
                      ? '✓ Evidência Técnica Anexada (SMED-Relatório.pdf)'
                      : 'Anexar Laudo / Evidência'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>

            {/* BOTÕES CONDICIONAIS CONFORME AVALIAÇÃO IA (REQUISITO 2 & 9) */}
            <div className="flex items-center gap-2">
              {aiEvaluation.canPublishDirectly ? (
                <Button
                  type="submit"
                  className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs h-8 gap-1.5 font-bold shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar para Aprovação (PCP + Linha)</span>
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProposedMinutes(mesStats.median)}
                    className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Ajustar para Mediana ({mesStats.median} min)
                  </Button>

                  <Button
                    type="submit"
                    disabled={!justificationCategory || !justificationDetail}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 font-bold shadow-xs disabled:opacity-50"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Enviar com Justificativa Técnica</span>
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
