import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  mpOutOfStandardService,
  DEFAULT_OUT_OF_STANDARD_REASONS,
} from '@/services/mp-out-of-standard-service'
import {
  MPOutOfStandardEvaluationRecord,
  MPSelectionCandidate,
  ApplicationRequirementCandidate,
  ParameterComparisonResult,
  OutOfStandardCompatibility,
} from '@/types/mp-out-of-standard'
import { formatNumberPtBr } from '@/lib/number-format'
import { formatDateTimePTBR } from '@/lib/formatters-ptbr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  RefreshCw,
  Search,
  FileCheck2,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Database,
  History,
  Ban,
  FileSpreadsheet,
} from 'lucide-react'

export const MPAproveitamentoForaPadraoPage: React.FC = () => {
  const { user, can } = useAuth()
  const { toast } = useToast()

  // Permissões RBAC específicas da funcionalidade
  const canView = can('pcp.mp_out_of_standard.view') || can('pcp.mp_opt.view')
  const canCreate = can('pcp.mp_out_of_standard.create') || can('pcp.mp_opt.modify_app')
  const canEdit = can('pcp.mp_out_of_standard.edit') || can('pcp.mp_opt.modify_app')
  const canDecide = can('pcp.mp_out_of_standard.decide') || can('pcp.mp_opt.approve')
  const canCancel = can('pcp.mp_out_of_standard.cancel') || can('pcp.mp_opt.modify_app')

  // Estados de carregamento
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Listas de cadastros
  const [mpCandidates, setMpCandidates] = useState<MPSelectionCandidate[]>([])
  const [appCandidates, setAppCandidates] = useState<ApplicationRequirementCandidate[]>([])
  const [savedEvaluations, setSavedEvaluations] = useState<MPOutOfStandardEvaluationRecord[]>([])

  // Seleções do formulário principal
  const [selectedMpId, setSelectedMpId] = useState<string>('')
  const [selectedCandidate, setSelectedCandidate] = useState<MPSelectionCandidate | null>(null)

  // BLOCO B: Campos
  const [selectedReason, setSelectedReason] = useState<string>(
    DEFAULT_OUT_OF_STANDARD_REASONS[0].code,
  )
  const [selectedTargetAppCode, setSelectedTargetAppCode] = useState<string>('')
  const [permiteForaPadrao, setPermiteForaPadrao] = useState<boolean>(true)

  // Comparativo e resultado
  const [comparativo, setComparativo] = useState<ParameterComparisonResult[]>([])
  const [compatibilidade, setCompatibilidade] =
    useState<OutOfStandardCompatibility>('AWAITING_EVALUATION')
  const [regraStatus, setRegraStatus] = useState<'PARAMETRIZADA' | 'NAO_PARAMETRIZADA'>(
    'PARAMETRIZADA',
  )
  const [regraDetalhes, setRegraDetalhes] = useState<string>('')
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  // Diálogo de confirmação para sair/cancelar formulário
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false)

  // Diálogo de cancelamento lógico de registro salvo
  const [cancelTargetRecord, setCancelTargetRecord] =
    useState<MPOutOfStandardEvaluationRecord | null>(null)
  const [cancelJustificativa, setCancelJustificativa] = useState<string>('')
  const [isCancelling, setIsCancelling] = useState(false)

  // Diálogo de consulta de detalhes de avaliação do histórico
  const [viewingRecord, setViewingRecord] = useState<MPOutOfStandardEvaluationRecord | null>(null)

  // Filtros da tabela de histórico
  const [filterSituacao, setFilterSituacao] = useState<string>('ALL')
  const [filterCompatibilidade, setFilterCompatibilidade] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Carrega cadastros e histórico inicial
  const loadData = useCallback(async () => {
    setIsLoadingInitial(true)
    setLoadError(null)
    try {
      const [mps, apps, evals] = await Promise.all([
        mpOutOfStandardService.loadMPCandidatesFromOfficialCadastros(),
        mpOutOfStandardService.loadApplicationCandidates(),
        mpOutOfStandardService.listEvaluations({ includeCancelled: true }),
      ])
      setMpCandidates(mps)
      setAppCandidates(apps)
      setSavedEvaluations(evals)

      // Seleção inicial padrão
      if (mps.length > 0 && !selectedMpId) {
        setSelectedMpId(mps[0].id)
        setSelectedCandidate(mps[0])
      }
      if (apps.length > 0 && !selectedTargetAppCode) {
        setSelectedTargetAppCode(apps[0].application_code)
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar dados de Aproveitamento MP fora do padrão:', err)
      setLoadError('Não foi possível carregar os cadastros técnicos no momento. Tente novamente.')
    } finally {
      setIsLoadingInitial(false)
    }
  }, [selectedMpId, selectedTargetAppCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Trata troca de MP
  const handleSelectMP = (mpId: string) => {
    setSelectedMpId(mpId)
    const found = mpCandidates.find((m) => m.id === mpId) || null
    setSelectedCandidate(found)
    setHasEvaluated(false)
    setCompatibilidade('AWAITING_EVALUATION')
    setComparativo([])
    setIsDirty(true)
  }

  // Objeto de aplicação candidata selecionada
  const selectedAppObj = useMemo(() => {
    return appCandidates.find((a) => a.application_code === selectedTargetAppCode) || null
  }, [appCandidates, selectedTargetAppCode])

  // Executa avaliação de compatibilidade (Botão "Avaliar")
  const handleRunEvaluation = () => {
    if (!selectedCandidate) {
      toast({
        variant: 'destructive',
        title: 'Seleção Obrigatória',
        description: 'Selecione uma matéria-prima para avaliar.',
      })
      return
    }

    setIsEvaluating(true)
    try {
      const result = mpOutOfStandardService.evaluateCompatibility(
        {
          peso_kg: selectedCandidate.peso_kg,
          espessura_mm: selectedCandidate.espessura_mm,
          largura_mm: selectedCandidate.largura_mm,
          comprimento_mm: selectedCandidate.comprimento_mm,
        },
        selectedAppObj,
        permiteForaPadrao,
      )

      setComparativo(result.comparativo)
      setCompatibilidade(result.compatibilidade)
      setRegraStatus(result.regraStatus)
      setRegraDetalhes(result.regraDetalhes)
      setHasEvaluated(true)
      setIsDirty(true)

      toast({
        title: 'Avaliação Concluída',
        description:
          result.regraStatus === 'NAO_PARAMETRIZADA'
            ? 'Regra técnica não parametrizada nos cadastros oficiais.'
            : `Classificação: ${getCompatibilityBadge(result.compatibilidade).label}`,
      })
    } catch (err: unknown) {
      console.error('Falha no motor de avaliação:', err)
      toast({
        variant: 'destructive',
        title: 'Falha na Avaliação',
        description: 'Ocorreu um erro ao calcular os limites dimensionais.',
      })
    } finally {
      setIsEvaluating(false)
    }
  }

  // Salva avaliação na collection do PocketBase
  const handleSaveEvaluation = async () => {
    if (!selectedCandidate) {
      toast({
        variant: 'destructive',
        title: 'Matéria-prima Ausente',
        description: 'Selecione uma matéria-prima para salvar a avaliação.',
      })
      return
    }

    if (!hasEvaluated) {
      toast({
        variant: 'destructive',
        title: 'Avaliação Pendente',
        description: 'Clique em "Avaliar" antes de salvar para gerar o comparativo técnico.',
      })
      return
    }

    if (!canCreate && !canEdit) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description:
          'Seu perfil não possui permissão para registrar ou editar avaliações (pcp.mp_out_of_standard.create).',
      })
      return
    }

    setIsSaving(true)
    try {
      const createdRecord = await mpOutOfStandardService.createEvaluation({
        centro: selectedCandidate.centro,
        material_codigo: selectedCandidate.material_codigo,
        material_descricao: selectedCandidate.material_descricao,
        item_identificacao: selectedCandidate.item_identificacao,
        lote: selectedCandidate.lote,
        corrida: selectedCandidate.corrida,
        fornecedor: selectedCandidate.fornecedor,
        aplicacao_atual: selectedCandidate.aplicacao_atual,
        deposito: selectedCandidate.deposito,
        peso_kg: selectedCandidate.peso_kg,
        espessura_mm: selectedCandidate.espessura_mm,
        largura_mm: selectedCandidate.largura_mm,
        comprimento_mm: selectedCandidate.comprimento_mm,
        bloco_b_motivo: selectedReason,
        bloco_b_nova_aplicacao: selectedTargetAppCode,
        bloco_b_permite_fora_padrao: permiteForaPadrao,
        nova_espessura_min_mm: selectedAppObj?.min_thickness_mm,
        nova_espessura_max_mm: selectedAppObj?.max_thickness_mm,
        nova_largura_min_mm: selectedAppObj?.min_width_mm,
        nova_largura_max_mm: selectedAppObj?.max_width_mm,
        nova_comprimento_min_mm: selectedAppObj?.min_length_mm,
        nova_comprimento_max_mm: selectedAppObj?.max_length_mm,
        nova_peso_min_kg: selectedAppObj?.min_weight_kg,
        nova_peso_max_kg: selectedAppObj?.max_weight_kg,
        comparativo_json: comparativo,
        compatibilidade: compatibilidade,
        regra_tecnica_status: regraStatus,
        regra_tecnica_detalhes: regraDetalhes,
        situacao: 'EM_ANALISE',
        origem_dados_mp: 'CADASTROS_PCP',
        ia_recomendacao:
          compatibilidade === 'COMPATIBLE'
            ? 'IA PCP: Compatibilidade geométrica favorável para reaproveitamento direto sem risco de corte.'
            : compatibilidade === 'COMPATIBLE_WITH_RESERVATION'
              ? 'IA PCP: Requer acompanhamento dimensional no processo. Apenas apoio à decisão humana.'
              : 'IA PCP: Alta divergência de parâmetros. Rejeição recomendada pelo modelo técnico.',
        ia_score:
          compatibilidade === 'COMPATIBLE'
            ? 95
            : compatibilidade === 'COMPATIBLE_WITH_RESERVATION'
              ? 70
              : 25,
      })

      setIsDirty(false)
      toast({
        title: 'Avaliação Salva com Sucesso',
        description: `Avaliação nº ${createdRecord.numero_sequencial} salva com sucesso.`,
      })

      // Recarrega a lista do histórico
      const evals = await mpOutOfStandardService.listEvaluations({ includeCancelled: true })
      setSavedEvaluations(evals)
    } catch (err: unknown) {
      console.error('Erro ao salvar avaliação:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar a avaliação no banco.'
      toast({
        variant: 'destructive',
        title: 'Erro ao Salvar Avaliação',
        description: msg,
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Ação de Cancelar formulário (com confirmação se isDirty)
  const handleCancelForm = () => {
    if (isDirty) {
      setShowExitConfirmDialog(true)
    } else {
      resetForm()
    }
  }

  const resetForm = () => {
    if (mpCandidates.length > 0) {
      setSelectedMpId(mpCandidates[0].id)
      setSelectedCandidate(mpCandidates[0])
    }
    setHasEvaluated(false)
    setCompatibilidade('AWAITING_EVALUATION')
    setComparativo([])
    setIsDirty(false)
    setShowExitConfirmDialog(false)
  }

  // Cancelamento lógico no backend
  const handleExecuteCancelRecord = async () => {
    if (!cancelTargetRecord) return
    if (!cancelJustificativa.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa Obrigatória',
        description: 'Informe o motivo detalhado do cancelamento.',
      })
      return
    }

    if (!canCancel) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description:
          'Seu perfil não possui permissão para cancelar avaliações (pcp.mp_out_of_standard.cancel).',
      })
      return
    }

    setIsCancelling(true)
    try {
      await mpOutOfStandardService.cancelEvaluation(cancelTargetRecord.id, cancelJustificativa)
      toast({
        title: 'Avaliação Cancelada',
        description: `Avaliação nº ${cancelTargetRecord.numero_sequencial} cancelada logicamente.`,
      })
      setCancelTargetRecord(null)
      setCancelJustificativa('')
      const evals = await mpOutOfStandardService.listEvaluations({ includeCancelled: true })
      setSavedEvaluations(evals)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cancelar a avaliação.'
      toast({
        variant: 'destructive',
        title: 'Falha no Cancelamento',
        description: msg,
      })
    } finally {
      setIsCancelling(false)
    }
  }

  // Decisão final (Aprovar / Reprovar)
  const handleDecideRecord = async (
    record: MPOutOfStandardEvaluationRecord,
    decision: 'APROVADA' | 'REPROVADA',
  ) => {
    if (!canDecide) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description:
          'Seu perfil não possui permissão para aprovar ou reprovar avaliações (pcp.mp_out_of_standard.decide).',
      })
      return
    }

    try {
      await mpOutOfStandardService.decideEvaluation(
        record.id,
        decision,
        `Decisão registrada via HUB CIAFAL por ${user?.name || user?.email || 'Usuário Homologado'}.`,
      )
      toast({
        title: decision === 'APROVADA' ? 'Avaliação Aprovada' : 'Avaliação Reprovada',
        description: `Avaliação nº ${record.numero_sequencial} atualizada com sucesso.`,
      })
      const evals = await mpOutOfStandardService.listEvaluations({ includeCancelled: true })
      setSavedEvaluations(evals)
      if (viewingRecord?.id === record.id) {
        setViewingRecord(null)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar a decisão.'
      toast({
        variant: 'destructive',
        title: 'Falha na Decisão',
        description: msg,
      })
    }
  }

  // Filtros aplicados no histórico
  const filteredEvaluations = useMemo(() => {
    return savedEvaluations.filter((ev) => {
      if (filterSituacao !== 'ALL' && ev.situacao !== filterSituacao) return false
      if (filterCompatibilidade !== 'ALL' && ev.compatibilidade !== filterCompatibilidade)
        return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const text =
          `${ev.numero_sequencial} ${ev.material_codigo} ${ev.item_identificacao} ${ev.lote} ${ev.avaliador_nome}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [savedEvaluations, filterSituacao, filterCompatibilidade, searchTerm])

  return (
    <div className="w-full max-w-full space-y-6 p-3 sm:p-5 md:p-6 bg-slate-50 min-h-screen text-slate-900">
      {/* Cabeçalho Institucional Ciafal */}
      <header className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-[#004C97] text-white hover:bg-[#003d7a] font-mono text-[11px] px-2.5 py-0.5 font-bold tracking-wide">
              PCP ROBOTIZADO &bull; GESTÃO DE MP
            </Badge>
            <Badge
              variant="outline"
              className="text-slate-600 border-slate-300 font-mono text-[11px] gap-1"
            >
              <Database className="w-3 h-3 text-[#004C97]" />
              SAP ZPP86 / ZPP88 &bull; PENDÊNCIA RFC
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Aproveitamento MP Fora do Padrão
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
            Avaliação técnica de compatibilidade de matéria-prima fora do padrão dimensional ideal
            para nova aplicação candidata. O número sequencial{' '}
            <span className="font-mono font-bold text-[#004C97]">AMP-000001/2026</span> é gerado
            atomicamente no servidor e auditado em fluxo irreversível.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={isLoadingInitial}
            className="border-slate-300 text-slate-700 text-xs font-semibold gap-1.5 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-[#004C97] ${isLoadingInitial ? 'animate-spin' : ''}`}
            />
            Atualizar Cadastros
          </Button>
        </div>
      </header>

      {/* Alerta de aviso RFC SAP */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-snug">
          <span className="font-bold">Aviso de Governança & Integração SAP:</span> Os dados atuais
          são alimentados pelos cadastros oficiais do PCP (Ficha Mestra, Prioridades de MP e
          Inventário). A leitura direta em tempo real de ZPP86/ZPP88 será conectada via RFC
          corporativa no endpoint do SAP ECC. A avaliação{' '}
          <span className="underline font-semibold">não movimenta estoque físico</span> e{' '}
          <span className="underline font-semibold">não gera ordem de produção</span>.
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Falha no Carregamento:</span> {loadError}
          </div>
        </div>
      )}

      {/* BLOCO PRINCIPAL RESPONSIVO COM DOIS GRANDES BLOCOS (A & B) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ========================================================= */}
        {/* BLOCO A — AVALIAR PEÇA FORA DO PADRÃO                     */}
        {/* ========================================================= */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#004C97]" />
                  Avaliar peça fora do padrão
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Avaliar peça fora do padrão (Substitui a nomenclatura legada &quot;Modificar a
                  aplicação KS&quot;).
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white border-slate-300 text-[10px] font-mono">
                BLOCO A
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-5 text-xs">
            {isLoadingInitial ? (
              <div className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : (
              <>
                {/* Seleção de MP a partir dos cadastros oficiais */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Selecionar Peça / MP dos Cadastros Oficiais</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Fonte: Ficha Mestra & Prioridades
                    </span>
                  </Label>
                  <Select value={selectedMpId} onValueChange={handleSelectMP}>
                    <SelectTrigger className="bg-white border-slate-300 text-xs font-mono h-9">
                      <SelectValue placeholder="Selecione a peça/MP nos cadastros oficiais..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-72">
                      {mpCandidates.map((cand) => (
                        <SelectItem key={cand.id} value={cand.id} className="text-xs font-mono">
                          {cand.material_codigo} — {cand.material_descricao} (
                          {cand.item_identificacao} &bull; Lote {cand.lote})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Área de Identificação da Peça/MP */}
                {!selectedCandidate ? (
                  <div className="p-6 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/60 text-slate-500 font-mono text-xs">
                    Nenhuma matéria-prima selecionada para avaliação.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                          Identificação Oficial ZPP86 / ZPP88
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-white text-slate-600 text-[10px] font-mono"
                        >
                          Origem: {selectedCandidate.source}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Centro
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {selectedCandidate.centro}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Material
                          </span>
                          <span className="font-mono font-bold text-[#004C97]">
                            {selectedCandidate.material_codigo}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Item / Identificação
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            {selectedCandidate.item_identificacao}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Lote
                          </span>
                          <span className="font-mono text-slate-800">{selectedCandidate.lote}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Corrida
                          </span>
                          <span className="font-mono text-slate-800">
                            {selectedCandidate.corrida || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Fornecedor
                          </span>
                          <span
                            className="text-slate-800 truncate block"
                            title={selectedCandidate.fornecedor}
                          >
                            {selectedCandidate.fornecedor}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Aplicação Atual
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-blue-50/70 border-blue-200 text-[#004C97] font-mono text-[11px] mt-0.5"
                          >
                            {selectedCandidate.aplicacao_atual}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                            Depósito
                          </span>
                          <span className="font-mono text-slate-800">
                            {selectedCandidate.deposito || 'DP07'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card "Dimensões" — Padrão brasileiro/ABNT obrigatório */}
                    <Card className="border-slate-200 bg-linear-to-br from-white to-slate-50/50 shadow-none rounded-xl">
                      <CardHeader className="py-2.5 px-3.5 border-b border-slate-200">
                        <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                          <span>Dimensões e Peso da Peça Atual (Padrão ABNT pt-BR)</span>
                          <span className="text-[10px] text-slate-500 font-normal normal-case">
                            vírgula decimal / milhar com ponto
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                              Espessura
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatNumberPtBr(selectedCandidate.espessura_mm, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              mm
                            </span>
                          </div>
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                              Largura
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatNumberPtBr(selectedCandidate.largura_mm, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              mm
                            </span>
                          </div>
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                              Comprimento
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatNumberPtBr(selectedCandidate.comprimento_mm, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}{' '}
                              mm
                            </span>
                          </div>
                          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                              Peso
                            </span>
                            <span className="font-mono font-bold text-[#004C97] text-sm">
                              {formatNumberPtBr(selectedCandidate.peso_kg, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              kg
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* BLOCO B — AVALIAR NOVA APLICAÇÃO                          */}
        {/* ========================================================= */}
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="bg-slate-50/80 border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5">
                <CardTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#004C97]" />
                  Avaliar nova aplicação
                </CardTitle>
                <CardDescription className="text-xs text-slate-600">
                  Avaliar nova aplicação (Substitui a nomenclatura legada &quot;Modificação&quot;).
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white border-slate-300 text-[10px] font-mono">
                BLOCO B
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
            {/* Campo Motivo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Motivo</span>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Parametrizável &bull; Pendência SAP
                </span>
              </Label>
              <Select
                value={selectedReason}
                onValueChange={(v) => {
                  setSelectedReason(v)
                  setIsDirty(true)
                }}
              >
                <SelectTrigger className="bg-white border-slate-300 text-xs h-9">
                  <SelectValue placeholder="Selecione o motivo..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {DEFAULT_OUT_OF_STANDARD_REASONS.map((r) => (
                    <SelectItem key={r.code} value={r.code} className="text-xs">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo Nova Aplicação (Lista de cadastros oficiais do PCP) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Nova Aplicação Candidata</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Cadastros Oficiais: Requisitos & Capacidades
                </span>
              </Label>
              <Select
                value={selectedTargetAppCode}
                onValueChange={(v) => {
                  setSelectedTargetAppCode(v)
                  setHasEvaluated(false)
                  setCompatibilidade('AWAITING_EVALUATION')
                  setIsDirty(true)
                }}
              >
                <SelectTrigger className="bg-white border-slate-300 text-xs font-mono h-9">
                  <SelectValue placeholder="Selecione a aplicação pretendida..." />
                </SelectTrigger>
                <SelectContent className="bg-white max-h-72">
                  {appCandidates.map((app) => (
                    <SelectItem
                      key={app.id}
                      value={app.application_code}
                      className="text-xs font-mono"
                    >
                      {app.application_code} — {app.application_name}
                      {!app.is_parameterized && ' ⚠️ (Sem Matriz Técnica)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* CAMPO OBRIGATÓRIO: "Permite peça fora do padrão" com controle Sim/Não visível */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="switch-permite-fora-padrao"
                    className="text-xs font-black text-slate-900 cursor-pointer"
                  >
                    Permite peça fora do padrão
                  </Label>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Autorização expressa de engenharia para compensar variações dimensionais sem
                    reprovação imediata.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch
                    id="switch-permite-fora-padrao"
                    checked={permiteForaPadrao}
                    onCheckedChange={(checked) => {
                      setPermiteForaPadrao(checked)
                      setHasEvaluated(false)
                      setCompatibilidade('AWAITING_EVALUATION')
                      setIsDirty(true)
                    }}
                    data-testid="toggle-permite-fora-padrao"
                  />
                </div>
              </div>

              {/* RÓTULO DE ESTADO VISÍVEL OBRIGATÓRIO */}
              <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-slate-700">
                  Estado selecionado:
                </span>
                <span
                  data-testid="permite-fora-padrao-label"
                  className={`font-black tracking-wide text-xs px-2 py-0.5 rounded ${
                    permiteForaPadrao
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}
                >
                  Permite peça fora do padrão: {permiteForaPadrao ? 'SIM' : 'NÃO'}
                </span>
              </div>
            </div>

            {/* Resumo da Matriz Técnica da Aplicação Selecionada */}
            <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase">
                  Limites Técnicos Cadastrados
                </span>
                {selectedAppObj?.is_parameterized ? (
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                  >
                    Matriz Parametrizada
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold"
                  >
                    Regra técnica não parametrizada
                  </Badge>
                )}
              </div>

              {selectedAppObj?.is_parameterized ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono pt-1 text-slate-600">
                  <div>
                    <span className="block text-[10px] text-slate-400">Espessura (mm):</span>
                    {selectedAppObj.min_thickness_mm != null
                      ? formatNumberPtBr(selectedAppObj.min_thickness_mm)
                      : '-'}{' '}
                    a{' '}
                    {selectedAppObj.max_thickness_mm != null
                      ? formatNumberPtBr(selectedAppObj.max_thickness_mm)
                      : '-'}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Largura (mm):</span>
                    {selectedAppObj.min_width_mm != null
                      ? formatNumberPtBr(selectedAppObj.min_width_mm)
                      : '-'}{' '}
                    a{' '}
                    {selectedAppObj.max_width_mm != null
                      ? formatNumberPtBr(selectedAppObj.max_width_mm)
                      : '-'}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Comp. (mm):</span>
                    {selectedAppObj.min_length_mm != null
                      ? formatNumberPtBr(selectedAppObj.min_length_mm)
                      : '-'}{' '}
                    a{' '}
                    {selectedAppObj.max_length_mm != null
                      ? formatNumberPtBr(selectedAppObj.max_length_mm)
                      : '-'}
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Peso (kg):</span>
                    {selectedAppObj.min_weight_kg != null
                      ? formatNumberPtBr(selectedAppObj.min_weight_kg)
                      : '-'}{' '}
                    a{' '}
                    {selectedAppObj.max_weight_kg != null
                      ? formatNumberPtBr(selectedAppObj.max_weight_kg)
                      : '-'}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-rose-700 leading-snug pt-1">
                  A aplicação candidata{' '}
                  <span className="font-mono font-bold">{selectedTargetAppCode}</span> não possui
                  matriz técnica cadastrada. A hierarquia técnica CIAFAL impede aprovação automática
                  sem parametrização.
                </p>
              )}
            </div>

            {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelForm}
                disabled={isEvaluating || isSaving}
                className="border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Cancelar
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRunEvaluation}
                  disabled={isEvaluating || isSaving || !selectedCandidate}
                  data-testid="btn-avaliar"
                  className="border-[#004C97] text-[#004C97] hover:bg-blue-50 text-xs font-bold gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                  {isEvaluating ? 'Avaliando...' : 'Avaliar'}
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveEvaluation}
                  disabled={isSaving || isEvaluating || !selectedCandidate || !hasEvaluated}
                  data-testid="btn-salvar-avaliacao"
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-xs"
                >
                  <FileCheck2 className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  {isSaving ? 'Salvando...' : 'Salvar avaliação'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================= */}
      {/* COMPARATIVO CENTRAL: PEÇA ATUAL × NOVA APLICAÇÃO          */}
      {/* ========================================================= */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#004C97]" />
                COMPARATIVO CENTRAL &bull; PEÇA ATUAL × NOVA APLICAÇÃO
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Tabela Parâmetro | Peça atual | Nova aplicação | Resultado com semáforo Conforme /
                Divergente.
              </CardDescription>
            </div>

            {/* STATUS VISUAL: ÍCONE + TEXTO + COR (Nunca só cor) */}
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Status Geral:</span>
              <CompatibilityBadgeView compatibility={compatibilidade} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {comparativo.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p>Nenhuma avaliação processada no momento.</p>
              <p className="text-[11px] text-slate-400">
                Selecione os parâmetros nos blocos A e B e clique em &quot;Avaliar&quot; para exibir
                o comparativo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-xs font-mono border-collapse"
                data-testid="tabela-comparativo"
              >
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-4">Parâmetro</th>
                    <th className="py-2.5 px-4">Peça atual</th>
                    <th className="py-2.5 px-4">Nova aplicação</th>
                    <th className="py-2.5 px-4 text-center">Resultado</th>
                    <th className="py-2.5 px-4">Observação Técnica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {comparativo.map((row) => (
                    <tr key={row.parametro} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{row.parametro}</td>
                      <td className="py-3 px-4 text-slate-800">{row.peca_atual}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {row.nova_aplicacao === 'Regra técnica não parametrizada' ? (
                          <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                            Regra técnica não parametrizada
                          </span>
                        ) : (
                          row.nova_aplicacao
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <ResultBadgeView result={row.resultado} />
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 font-sans">
                        {row.observacao || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Seção IA de Apoio (Ponto de Extensão) */}
          <div className="p-4 bg-linear-to-r from-blue-50/50 via-slate-50/70 to-indigo-50/30 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">
                    Apoio de Inteligência Artificial PCP
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-white text-[10px] text-slate-500 font-mono"
                  >
                    Apenas Apoio &bull; Sem Aprovação Automática
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  {regraStatus === 'NAO_PARAMETRIZADA'
                    ? 'Regra técnica não parametrizada. A IA não pode emitir parecer conclusivo.'
                    : compatibilidade === 'COMPATIBLE'
                      ? 'Recomendação IA: Baixo risco dimensional. Sugerido prosseguir com a gravação da avaliação.'
                      : compatibilidade === 'COMPATIBLE_WITH_RESERVATION'
                        ? 'Recomendação IA: Desvios compensáveis por laminação ZPP88. Requer ciência do programador responsável.'
                        : 'Recomendação IA: Desvio fora da margem aceitável. Risco de não conformidade no produto final.'}
                </p>
              </div>
            </div>

            {hasEvaluated && (
              <div className="shrink-0 font-mono text-[11px] bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                Score IA:{' '}
                <strong>
                  {compatibilidade === 'COMPATIBLE'
                    ? 95
                    : compatibilidade === 'COMPATIBLE_WITH_RESERVATION'
                      ? 70
                      : 25}{' '}
                  / 100
                </strong>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================= */}
      {/* HISTÓRICO DE AVALIAÇÕES SALVAS                            */}
      {/* ========================================================= */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b border-slate-200 py-3.5 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <CardTitle className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <History className="w-4 h-4 text-[#004C97]" />
                Histórico de Avaliações Salvas
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Lista de avaliações persistidas na collection mp_out_of_standard_evaluations com
                rastreabilidade completa.
              </CardDescription>
            </div>

            {/* Barra de filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar nº AMP, material, lote..."
                  className="pl-8 h-8 text-xs w-44 sm:w-56 bg-white font-mono"
                />
              </div>

              <Select value={filterSituacao} onValueChange={setFilterSituacao}>
                <SelectTrigger className="h-8 text-xs bg-white w-32">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">Todas Situações</SelectItem>
                  <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                  <SelectItem value="APROVADA">Aprovada</SelectItem>
                  <SelectItem value="REPROVADA">Reprovada</SelectItem>
                  <SelectItem value="CANCELADA">Cancelada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCompatibilidade} onValueChange={setFilterCompatibilidade}>
                <SelectTrigger className="h-8 text-xs bg-white w-36">
                  <SelectValue placeholder="Compatibilidade" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">Todos Status</SelectItem>
                  <SelectItem value="COMPATIBLE">Compatível</SelectItem>
                  <SelectItem value="COMPATIBLE_WITH_RESERVATION">Com Ressalva</SelectItem>
                  <SelectItem value="INCOMPATIBLE">Incompatível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoadingInitial ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs space-y-1">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <p>Nenhuma avaliação encontrada com os filtros atuais.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-left text-xs font-mono border-collapse"
                data-testid="tabela-historico"
              >
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-4">Nº Sequencial</th>
                    <th className="py-2.5 px-4">Peça / Material</th>
                    <th className="py-2.5 px-4">Aplicação Pretendida</th>
                    <th className="py-2.5 px-4">Compatibilidade</th>
                    <th className="py-2.5 px-4">Situação</th>
                    <th className="py-2.5 px-4">Responsável</th>
                    <th className="py-2.5 px-4">Data</th>
                    <th className="py-2.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEvaluations.map((ev) => (
                    <tr
                      key={ev.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        ev.cancelado ? 'opacity-60 bg-slate-50/40 line-through' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[#004C97]">
                        {ev.numero_sequencial || 'AMP-PENDENTE'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{ev.material_codigo}</div>
                        <div className="text-[10px] text-slate-500">
                          {ev.item_identificacao} &bull; Lt {ev.lote}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="bg-blue-50 text-[#004C97] text-[10px]">
                          {ev.bloco_b_nova_aplicacao}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <CompatibilityBadgeView compatibility={ev.compatibilidade} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <SituationBadgeView situation={ev.situacao} />
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-sans text-[11px]">
                        {ev.avaliador_nome}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {ev.data_avaliacao ? formatDateTimePTBR(ev.data_avaliacao) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingRecord(ev)}
                            className="h-7 px-2 text-[11px] border-slate-300 font-semibold"
                          >
                            Consultar
                          </Button>

                          {!ev.cancelado && ev.situacao === 'EM_ANALISE' && canDecide && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecideRecord(ev, 'APROVADA')}
                                className="h-7 px-2 text-[11px] border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"
                              >
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecideRecord(ev, 'REPROVADA')}
                                className="h-7 px-2 text-[11px] border-rose-300 text-rose-800 hover:bg-rose-50 font-semibold"
                              >
                                Reprovar
                              </Button>
                            </>
                          )}

                          {!ev.cancelado && canCancel && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCancelTargetRecord(ev)
                                setCancelJustificativa('')
                              }}
                              className="h-7 px-2 text-[11px] text-rose-700 hover:bg-rose-50"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: DETALHES DA AVALIAÇÃO (CONSULTA) */}
      <Dialog
        open={Boolean(viewingRecord)}
        onOpenChange={(open) => !open && setViewingRecord(null)}
      >
        <DialogContent className="max-w-2xl bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <div className="flex items-center gap-2 text-xs font-mono text-[#004C97] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>AVALIAÇÃO DE APROVEITAMENTO MP</span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {viewingRecord?.numero_sequencial} &bull; {viewingRecord?.material_codigo}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Registrado por {viewingRecord?.avaliador_nome} em{' '}
              {viewingRecord?.data_avaliacao
                ? formatDateTimePTBR(viewingRecord.data_avaliacao)
                : '-'}
            </DialogDescription>
          </DialogHeader>

          {viewingRecord && (
            <div className="space-y-4 text-xs font-mono">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Centro / Depósito
                  </span>
                  <span className="font-bold">
                    {viewingRecord.centro} / {viewingRecord.deposito || 'DP07'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Lote / Corrida</span>
                  <span className="font-bold">
                    {viewingRecord.lote} / {viewingRecord.corrida || 'S/C'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Aplicação Atual
                  </span>
                  <span>{viewingRecord.aplicacao_atual}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Nova Aplicação</span>
                  <span className="font-bold text-[#004C97]">
                    {viewingRecord.bloco_b_nova_aplicacao}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Motivo Informado
                </span>
                <p className="text-slate-800 font-sans">{viewingRecord.bloco_b_motivo}</p>
                <div className="pt-1 text-[11px]">
                  Permite fora do padrão:{' '}
                  <strong>{viewingRecord.bloco_b_permite_fora_padrao ? 'SIM' : 'NÃO'}</strong>
                </div>
              </div>

              {/* Tabela de parâmetros gravada */}
              {viewingRecord.comparativo_json && viewingRecord.comparativo_json.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px] font-mono border-collapse">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="py-2 px-3">Parâmetro</th>
                        <th className="py-2 px-3">Peça atual</th>
                        <th className="py-2 px-3">Nova aplicação</th>
                        <th className="py-2 px-3 text-center">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingRecord.comparativo_json.map((c) => (
                        <tr key={c.parametro}>
                          <td className="py-2 px-3 font-bold">{c.parametro}</td>
                          <td className="py-2 px-3">{c.peca_atual}</td>
                          <td className="py-2 px-3">{c.nova_aplicacao}</td>
                          <td className="py-2 px-3 text-center">
                            <ResultBadgeView result={c.resultado} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Parecer IA gravado */}
              {viewingRecord.ia_recomendacao && (
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] font-sans text-blue-950 space-y-0.5">
                  <span className="font-bold flex items-center gap-1 text-[#004C97]">
                    <Sparkles className="w-3.5 h-3.5" /> Recomendação IA Registrada:
                  </span>
                  <p>{viewingRecord.ia_recomendacao}</p>
                </div>
              )}

              {viewingRecord.cancelado && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs space-y-1">
                  <span className="font-bold">Avaliação Cancelada Logicamente:</span>
                  <p className="font-sans">Motivo: {viewingRecord.motivo_cancelamento}</p>
                  <p className="text-[10px] text-rose-600">
                    Cancelado por {viewingRecord.cancelado_por_nome} em{' '}
                    {viewingRecord.data_cancelamento
                      ? formatDateTimePTBR(viewingRecord.data_cancelamento)
                      : '-'}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setViewingRecord(null)}
              className="border-slate-300"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CANCELAMENTO LÓGICO */}
      <Dialog
        open={Boolean(cancelTargetRecord)}
        onOpenChange={(open) => !open && setCancelTargetRecord(null)}
      >
        <DialogContent className="max-w-md bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-800 flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              Cancelar Avaliação {cancelTargetRecord?.numero_sequencial}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              O cancelamento é estritamente lógico para auditoria legal. A justificativa técnica é
              obrigatória e será gravada de forma permanente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs font-semibold text-slate-800">
              Justificativa Técnica do Cancelamento (Obrigatória)
            </Label>
            <Textarea
              rows={3}
              value={cancelJustificativa}
              onChange={(e) => setCancelJustificativa(e.target.value)}
              placeholder="Descreva o motivo pelo qual esta avaliação está sendo cancelada..."
              className="bg-white border-slate-300 text-xs font-sans"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setCancelTargetRecord(null)}
              disabled={isCancelling}
              className="border-slate-300"
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteCancelRecord}
              disabled={isCancelling || !cancelJustificativa.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isCancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: CONFIRMAÇÃO DE SAÍDA COM ALTERAÇÕES NÃO SALVAS */}
      <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
        <DialogContent className="max-w-md bg-white text-slate-900 border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alterações não salvas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Existem alterações não salvas. Deseja realmente sair?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => setShowExitConfirmDialog(false)}
              className="border-slate-300"
            >
              Continuar editando
            </Button>
            <Button
              variant="default"
              onClick={resetForm}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Descartar e Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helpers Visuais com Ícone + Texto + Cor (Nunca apenas cor)
function getCompatibilityBadge(comp: OutOfStandardCompatibility) {
  switch (comp) {
    case 'COMPATIBLE':
      return {
        label: '✓ Compatível',
        className: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        icon: CheckCircle2,
      }
    case 'COMPATIBLE_WITH_RESERVATION':
      return {
        label: '⚠ Compatível com ressalva',
        className: 'bg-amber-100 text-amber-900 border-amber-300',
        icon: AlertTriangle,
      }
    case 'INCOMPATIBLE':
      return {
        label: '✕ Incompatível',
        className: 'bg-rose-100 text-rose-900 border-rose-300',
        icon: XCircle,
      }
    case 'AWAITING_EVALUATION':
    default:
      return {
        label: '⏳ Aguardando avaliação',
        className: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: Clock,
      }
  }
}

function CompatibilityBadgeView({
  compatibility,
  size = 'md',
}: {
  compatibility: OutOfStandardCompatibility
  size?: 'sm' | 'md'
}) {
  const badge = getCompatibilityBadge(compatibility)
  const Icon = badge.icon
  return (
    <span
      data-testid="compatibility-badge"
      className={`inline-flex items-center gap-1 font-bold rounded border ${badge.className} ${
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{badge.label}</span>
    </span>
  )
}

function ResultBadgeView({ result }: { result: 'CONFORME' | 'DIVERGENTE' | 'NAO_PARAMETRIZADO' }) {
  if (result === 'CONFORME') {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
        <CheckCircle2 className="w-3 h-3 text-emerald-700" />✓ Conforme
      </span>
    )
  }
  if (result === 'DIVERGENTE') {
    return (
      <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
        <XCircle className="w-3 h-3 text-rose-700" />✕ Divergente
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
      <AlertTriangle className="w-3 h-3 text-amber-700" />
      Não parametrizado
    </span>
  )
}

function SituationBadgeView({ situation }: { situation: string }) {
  switch (situation) {
    case 'APROVADA':
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Aprovada
        </span>
      )
    case 'REPROVADA':
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Reprovada
        </span>
      )
    case 'CANCELADA':
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
          <Ban className="w-3 h-3 text-slate-500" />
          Cancelada
        </span>
      )
    case 'EM_ANALISE':
    default:
      return (
        <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3 text-[#004C97]" />
          Em Análise
        </span>
      )
  }
}
