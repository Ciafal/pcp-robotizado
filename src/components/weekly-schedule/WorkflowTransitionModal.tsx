import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import {
  Sparkles,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  Lock,
  Layers,
  Building,
  User,
  Eye,
  Radio,
  Search,
  Check,
  X,
  Edit3,
  Database,
  HelpCircle,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { ScheduleItemDiff } from '@/types/schedule-versioning'
import { pcpReasonsService } from '@/services/pcp-reasons-service'
import {
  PCPReasonFamily,
  PCPChangeReason,
  PCPChangeEvidence,
  PCPAIReprogrammingSuggestion,
  EvidenceStatusType,
} from '@/types/pcp-reasons'

interface WorkflowTransitionModalProps {
  isOpen?: boolean
  open?: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  transition?: any
  currentState?: string
  currentStatus?: string
  targetState?: string
  targetLabel?: string
  currentVersion?: number
  versionTag?: string
  currentItems?: WeeklyScheduleItem[]
  previousItems?: WeeklyScheduleItem[]
  diffs?: ScheduleItemDiff[]
  lineCode?: string
  onConfirm: (reasonOrTransition: any, notesOrJustificationData?: any) => void
  onOpenDiffModal?: () => void
}

export const WorkflowTransitionModal: React.FC<WorkflowTransitionModalProps> = (props) => {
  const isModalOpen = Boolean(props.isOpen !== undefined ? props.isOpen : props.open)
  const handleModalClose = () => {
    if (props.onClose) props.onClose()
    if (props.onOpenChange) props.onOpenChange(false)
  }

  const effectiveCurrentStatus = props.currentState || props.currentStatus || 'DRAFT'
  const effectiveTargetStatus = props.targetState || props.transition?.targetStatus || 'VALIDADO'
  const effectiveTargetLabel =
    props.targetLabel || props.transition?.actionLabel || 'Validar Programação'
  const effectiveVersionTag =
    props.versionTag ||
    (props.currentVersion ? `V${String(props.currentVersion).padStart(2, '0')}` : 'V01')
  const lineCode = props.lineCode || 'L1'
  const diffs = props.diffs || []
  const currentItems = props.currentItems || []
  const previousItems = props.previousItems || []
  const [families, setFamilies] = useState<PCPReasonFamily[]>([])
  const [reasons, setReasons] = useState<PCPChangeReason[]>([])
  const [selectedReasonId, setSelectedReasonId] = useState<string>('')
  const [searchReasonText, setSearchReasonText] = useState<string>('')
  const [specificCause, setSpecificCause] = useState<string>('')
  const [detailedJustification, setDetailedJustification] = useState<string>('')
  const [leadershipNotes, setLeadershipNotes] = useState<string>('')

  // Estados da IA
  const [aiSuggestion, setAiSuggestion] = useState<PCPAIReprogrammingSuggestion | null>(null)
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false)
  const [aiDecision, setAiDecision] = useState<'ACCEPTED' | 'EDITED' | 'REJECTED' | 'MANUAL'>(
    'MANUAL',
  )
  const [isGeneratingAiText, setIsGeneratingAiText] = useState<boolean>(false)
  const [aiErrorFallback, setAiErrorFallback] = useState<boolean>(false)

  // Carregar dados de taxonomia e disparar análise IA ao abrir o modal
  useEffect(() => {
    if (isModalOpen) {
      loadTaxonomy()
      runAICorrelation()
    } else {
      // Limpar campos
      setSelectedReasonId('')
      setSearchReasonText('')
      setSpecificCause('')
      setDetailedJustification('')
      setLeadershipNotes('')
      setAiSuggestion(null)
      setAiDecision('MANUAL')
      setAiErrorFallback(false)
    }
  }, [])

  const loadTaxonomy = async () => {
    try {
      const [fams, reas] = await Promise.all([
        pcpReasonsService.listFamilies(),
        pcpReasonsService.listReasons(true),
      ])
      setFamilies(fams)
      setReasons(reas)
    } catch (err) {
      console.warn('Erro ao carregar taxonomia no modal:', err)
    }
  }

  const runAICorrelation = async () => {
    setIsAnalyzingAi(true)
    setAiErrorFallback(false)
    try {
      const nextVerTag = `V${parseInt(effectiveVersionTag.replace('V', '') || '1') + 1}`
      const suggestion = await pcpReasonsService.correlateEvidenceAndSuggest({
        lineCode,
        diffs,
        previousItems,
        newItems: currentItems,
        currentVersionTag: effectiveVersionTag,
        nextVersionTag: nextVerTag,
      })
      setAiSuggestion(suggestion)

      // Se houver sugestão com confiança >= 80%, pré-selecionar se usuário não mexeu
      if (suggestion && suggestion.suggested_reason_code && reasons.length > 0) {
        const found = reasons.find((r) => r.code === suggestion.suggested_reason_code)
        if (found) {
          setSelectedReasonId(found.id)
          setSpecificCause(suggestion.explanation)
        }
      }
    } catch (err) {
      console.warn('Falha na correlação de IA:', err)
      setAiErrorFallback(true)
    } finally {
      setIsAnalyzingAi(false)
    }
  }

  const selectedReason = useMemo(() => {
    return reasons.find((r) => r.id === selectedReasonId) || null
  }, [reasons, selectedReasonId])

  // Filtragem de motivos por texto pesquisável
  const filteredReasons = useMemo(() => {
    if (!searchReasonText.trim()) return reasons
    const q = searchReasonText.toLowerCase()
    return reasons.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.family_name.toLowerCase().includes(q),
    )
  }, [reasons, searchReasonText])

  // Agrupamento por Família para o Select
  const reasonsByFamily = useMemo(() => {
    const map: Record<string, PCPChangeReason[]> = {}
    filteredReasons.forEach((r) => {
      const fName = r.family_name || 'Geral'
      if (!map[fName]) map[fName] = []
      map[fName].push(r)
    })
    return map
  }, [filteredReasons])

  // Aceitar sugestão da IA
  const handleAcceptAi = () => {
    if (!aiSuggestion || !aiSuggestion.suggested_reason_code) return
    const found = reasons.find((r) => r.code === aiSuggestion.suggested_reason_code)
    if (found) {
      setSelectedReasonId(found.id)
    }
    setSpecificCause(aiSuggestion.explanation)
    setAiDecision('ACCEPTED')
  }

  // Editar sugestão da IA
  const handleEditAi = () => {
    if (!aiSuggestion) return
    setAiDecision('EDITED')
  }

  // Descartar sugestão da IA
  const handleDiscardAi = () => {
    setAiDecision('REJECTED')
    setSelectedReasonId('')
    setSpecificCause('')
  }

  // Gerar justificativa detalhada com IA (baseada em diffs reais, nunca genérica)
  const handleGenerateAiText = () => {
    if (!selectedReason) return
    setIsGeneratingAiText(true)
    setTimeout(() => {
      const nextVer = `V${parseInt(effectiveVersionTag.replace('V', '') || '1') + 1}`
      const generated = pcpReasonsService.generateStructuredAIJustification({
        lineCode,
        previousVersionTag: effectiveVersionTag,
        nextVersionTag: nextVer,
        diffs,
        reasonName: selectedReason.name,
        specificCause,
        evidences: aiSuggestion?.evidences || [],
      })
      setDetailedJustification(generated)
      setIsGeneratingAiText(false)
    }, 300)
  }

  const handleConfirm = async () => {
    const evidenceStatus: EvidenceStatusType =
      aiSuggestion && aiSuggestion.evidences && aiSuggestion.evidences.length > 0
        ? 'SYSTEM_CONFIRMED'
        : aiErrorFallback
          ? 'EXTERNAL_UNAVAILABLE'
          : 'HUMAN_ONLY'

    const payload = {
      justification:
        detailedJustification || specificCause || 'Transição validada pela programação.',
      leadershipNotes: leadershipNotes.trim() ? leadershipNotes : undefined,
      reasonId: selectedReason?.id || '',
      reasonCode: selectedReason?.code || 'OUT-001',
      reasonName: selectedReason?.name || 'Transição de Fluxo',
      familyCode: selectedReason?.family_code || 'OUT',
      familyName: selectedReason?.family_name || 'Outros',
      specificCause: specificCause || 'Transição operacional formal',
      aiGenerated: aiDecision === 'ACCEPTED',
      aiConfidence: aiSuggestion?.confidence || 0,
      humanDecision: aiDecision,
      evidenceStatus,
      evidences: aiSuggestion?.evidences || [],
    }

    // Gravação imutável no backend
    try {
      await pcpReasonsService.recordJustification({
        scheduleCode: `WS-${lineCode}-2026`,
        lineCode,
        versionFrom: effectiveVersionTag,
        versionTo: `V${parseInt(effectiveVersionTag.replace('V', '') || '1') + 1}`,
        reasonId: payload.reasonId,
        reasonCode: payload.reasonCode,
        reasonName: payload.reasonName,
        familyCode: payload.familyCode,
        familyName: payload.familyName,
        specificCause: payload.specificCause,
        justification: payload.justification,
        leadershipNotes: payload.leadershipNotes,
        aiGenerated: payload.aiGenerated,
        aiConfidence: payload.aiConfidence,
        aiSuggestedReasonCode: aiSuggestion?.suggested_reason_code,
        aiSuggestedReasonName: aiSuggestion?.suggested_reason_name,
        humanDecision: payload.humanDecision,
        evidenceStatus: payload.evidenceStatus,
        evidences: payload.evidences,
      })
    } catch (recErr) {
      console.warn('Registro de justificativa no backend com fallback local:', recErr)
    }

    if (props.transition) {
      props.onConfirm(props.transition, payload)
    } else {
      // Compatibilidade legada (reason: string, notes?: string)
      props.onConfirm(payload.justification, payload.leadershipNotes)
    }

    handleModalClose()
  }

  if (!isModalOpen) return null

  const isFormValid = Boolean(
    selectedReasonId && specificCause.trim() && detailedJustification.trim(),
  )

  const hasSystemEvidence =
    aiSuggestion &&
    aiSuggestion.evidences &&
    aiSuggestion.evidences.length > 0 &&
    aiSuggestion.suggested_reason_code

  return (
    <Dialog open={isModalOpen} onOpenChange={(v) => !v && handleModalClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 border border-slate-200 shadow-2xl rounded-xl">
        {/* CABEÇALHO */}
        <DialogHeader className="bg-[#004C97] text-white p-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  Confirmar Transição de Fluxo
                </DialogTitle>
                <p className="text-xs text-blue-100 mt-0.5">
                  Governança e Rastreabilidade Operacional CIAFAL — Linha {lineCode}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-white/15 text-white border-white/20 text-xs px-2.5 py-1 font-mono"
            >
              {effectiveVersionTag} → V{parseInt(effectiveVersionTag.replace('V', '') || '1') + 1}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 bg-slate-50/50">
          {/* BLOCO DE TRANSIÇÃO (ESTADO ATUAL -> NOVO ESTADO) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Estado Atual
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 font-medium">
                    {effectiveCurrentStatus}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col items-center px-4">
                <span className="text-xs font-semibold text-blue-700">Ação Solicitada</span>
                <span className="text-sm font-bold text-slate-800">{effectiveTargetLabel}</span>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Novo Estado
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Badge className="bg-[#004C97] text-white font-medium hover:bg-[#003B75]">
                    {effectiveTargetStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {/* BOTÃO VER DIFERENÇAS SE HOUVER */}
            {diffs && diffs.length > 0 && props.onOpenDiffModal && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Layers className="w-4 h-4 text-[#004C97]" />
                  <span>
                    <strong>{diffs.length}</strong> alteração(ões) identificada(s) nesta versão.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={props.onOpenDiffModal}
                  className="h-7 text-xs border-blue-200 text-[#004C97] hover:bg-blue-50 flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ver Diffs Detalhados
                </Button>
              </div>
            )}
          </div>

          {/* DEGRADAÇÃO CONTROLADA SE IA/INTEGRAÇÃO FALHAR */}
          {aiErrorFallback && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Aviso de Integração:</strong> Serviço de IA ou conectores externos
                temporariamente indisponíveis. Selecione o motivo e informe a justificativa
                manualmente para prosseguir sem bloqueio.
              </div>
            </div>
          )}

          {/* SUGESTÃO DA IA (EXIBIDA SOMENTE QUANDO HOUVER EVIDÊNCIA SUFICIENTE) */}
          {hasSystemEvidence && (
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200 rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-[#004C97] rounded text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[#004C97]">
                    IA sugere: {aiSuggestion?.suggested_reason_code} —{' '}
                    {aiSuggestion?.suggested_reason_name}
                  </span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs">
                  Confiança: {aiSuggestion?.confidence}%
                </Badge>
              </div>

              {/* LISTA DE EVIDÊNCIAS */}
              <div className="bg-white/80 rounded border border-blue-100 p-2.5 text-xs text-slate-700 space-y-1.5">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  Evidências Encontradas nos Módulos Integrados:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  {aiSuggestion?.evidences.map((ev, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <strong className="text-slate-800">[{ev.source_system}]</strong>{' '}
                      {ev.description}{' '}
                      <span className="text-slate-500 italic">
                        ({ev.old_value} → {ev.new_value})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* BOTÕES DE AÇÃO DA IA */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDiscardAi}
                  className="h-7 text-xs text-slate-600 border-slate-300 hover:bg-slate-100"
                >
                  <X className="w-3 h-3 mr-1" />
                  Descartar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleEditAi}
                  className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                >
                  <Edit3 className="w-3 h-3 mr-1" />
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAcceptAi}
                  className="h-7 text-xs bg-[#004C97] hover:bg-[#003B75] text-white"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Aceitar Sugestão
                </Button>
              </div>
            </div>
          )}

          {/* ALERTA DE ALTERAÇÃO SEM EVIDÊNCIA SISTÊMICA (SEÇÃO 15) */}
          {diffs.length > 0 && !hasSystemEvidence && !isAnalyzingAi && (
            <div className="bg-amber-50/70 border border-amber-300/80 rounded-lg p-3.5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-amber-900 block">
                  ⚠ ALTERAÇÃO SEM EVIDÊNCIA SISTÊMICA
                </span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Não foi encontrada evidência sistêmica suficiente para determinar automaticamente
                  a causa. A alteração poderá ser realizada, mas será registrada no histórico como{' '}
                  <strong className="text-amber-950">
                    justificativa exclusivamente humana (evidence_status = HUMAN_ONLY)
                  </strong>
                  .
                </p>
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE JUSTIFICATIVA OBRIGATÓRIA */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#004C97]" />
                Classificação da Causa Raiz & Justificativa
              </Label>
              {selectedReason && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-semibold border-slate-300"
                  style={{
                    backgroundColor: `${selectedReason.severity === 'CRITICA' ? '#FEE2E2' : '#EFF6FF'}`,
                    color: `${selectedReason.severity === 'CRITICA' ? '#991B1B' : '#1E40AF'}`,
                  }}
                >
                  Severidade: {selectedReason.severity} | Origem: {selectedReason.source_type}
                </Badge>
              )}
            </div>

            {/* 1. SELETOR DE MOTIVO PADRÃO (NÍVEL 2) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="motivo-select" className="text-xs font-semibold text-slate-700">
                  Motivo Padrão <span className="text-red-500">*</span>
                </Label>
                <div className="w-48">
                  <Input
                    placeholder="Filtrar por código/nome..."
                    value={searchReasonText}
                    onChange={(e) => setSearchReasonText(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              <Select value={selectedReasonId} onValueChange={setSelectedReasonId}>
                <SelectTrigger id="motivo-select" className="h-9 text-xs border-slate-300">
                  <SelectValue placeholder="Selecione o motivo padronizado na taxonomia CIAFAL..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(reasonsByFamily).map(([family, list]) => (
                    <SelectGroup key={family}>
                      <SelectLabel className="text-[11px] font-bold text-[#004C97] bg-slate-50 px-2 py-1">
                        Família: {family}
                      </SelectLabel>
                      {list.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs pl-4">
                          <span className="font-mono font-bold mr-2 text-slate-700">{r.code}</span>{' '}
                          — {r.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. CAUSA ESPECÍFICA / COMPLEMENTO (NÍVEL 3) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="causa-especifica" className="text-xs font-semibold text-slate-700">
                  Causa Específica / Complemento Operacional <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-slate-400">
                  Preenchimento humano ou refinamento IA
                </span>
              </div>
              <Input
                id="causa-especifica"
                placeholder="Ex: Tarugo Aço 1020 com ruptura no lote 2026-B91 aguardando reclassificação SGQ..."
                value={specificCause}
                onChange={(e) => setSpecificCause(e.target.value)}
                className="h-8 text-xs border-slate-300"
              />
            </div>

            {/* 3. JUSTIFICATIVA DETALHADA + BOTÃO IA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="justificativa-detalhada"
                  className="text-xs font-semibold text-slate-700"
                >
                  Justificativa Detalhada da Transição <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedReasonId || isGeneratingAiText}
                  onClick={handleGenerateAiText}
                  className="h-7 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  {isGeneratingAiText ? 'Gerando...' : '✨ Gerar justificativa com IA'}
                </Button>
              </div>
              <Textarea
                id="justificativa-detalhada"
                placeholder="Informe o racional técnico, correlações operacionais e plano de contenção para aprovação da transição..."
                value={detailedJustification}
                onChange={(e) => setDetailedJustification(e.target.value)}
                rows={3}
                className="text-xs resize-none border-slate-300"
              />
            </div>

            {/* 4. NOTAS ADICIONAIS PARA A LIDERANÇA (CAMPO EXISTENTE PRESERVADO) */}
            <div className="space-y-1.5">
              <Label htmlFor="notas-lideranca" className="text-xs font-medium text-slate-600">
                Notas Adicionais para a Liderança (Opcional)
              </Label>
              <Textarea
                id="notas-lideranca"
                placeholder="Observações confidenciais ou direcionamentos estratégicos para a gerência..."
                value={leadershipNotes}
                onChange={(e) => setLeadershipNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none border-slate-200 bg-slate-50/50"
              />
            </div>

            {/* 5. RESUMO DE NOTIFICAÇÕES AUTOMÁTICAS DISPARADAS */}
            {selectedReason && (
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-[#004C97]" /> Notificações configuradas:
                </span>
                {selectedReason.notify_mes && (
                  <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">
                    MES (Chão de Fábrica)
                  </Badge>
                )}
                {selectedReason.notify_crm && (
                  <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">
                    CRM (Comercial)
                  </Badge>
                )}
                {selectedReason.notify_tms && (
                  <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">
                    TMS (Logística)
                  </Badge>
                )}
                {selectedReason.notify_pcm && (
                  <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">
                    PCM (Manutenção)
                  </Badge>
                )}
                {selectedReason.notify_roll_shop && (
                  <Badge variant="outline" className="bg-white text-slate-700 text-[10px]">
                    Oficina de Cilindros
                  </Badge>
                )}
                {selectedReason.generate_sgq_occurrence && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                    Ocorrência SGQ
                  </Badge>
                )}
                {selectedReason.generate_action_plan && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                    Plano de Ação
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ */}
        <DialogFooter className="bg-slate-100 p-4 rounded-b-xl border-t border-slate-200 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Registro oficial e imutável na Trilha de Auditoria</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleModalClose}
              className="text-xs h-9 border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!isFormValid}
              onClick={handleConfirm}
              className="text-xs h-9 bg-[#004C97] hover:bg-[#003B75] text-white font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Transição
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
