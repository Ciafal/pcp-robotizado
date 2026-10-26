import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  GitBranch,
  Layers,
  Sparkles,
  Copy,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Calendar,
  Building2,
  Factory,
  Compass,
} from 'lucide-react'
import {
  PCPMonthlySummaryRecord,
  PCPMonthlySummaryTemplateRecord,
  pcpMonthlySummaryService,
} from '@/services/pcp-monthly-summaries'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

interface CreateNewVersionModalProps {
  isOpen: boolean
  onClose: () => void
  summary: PCPMonthlySummaryRecord | null
  onSuccess: (newSummary: PCPMonthlySummaryRecord) => void
}

export const CreateNewVersionModal: React.FC<CreateNewVersionModalProps> = ({
  isOpen,
  onClose,
  summary,
  onSuccess,
}) => {
  const [motivo, setMotivo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [generationMode, setGenerationMode] = useState<'copy' | 'reprocess'>('copy')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [applicableTemplate, setApplicableTemplate] =
    useState<PCPMonthlySummaryTemplateRecord | null>(null)
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false)

  // Próxima versão calculada
  const currentVersionNumber = summary?.version_number || 1
  const nextVersionNumber = currentVersionNumber + 1
  const nextVersionTag = `V${String(nextVersionNumber).padStart(2, '0')}`
  const nextSummaryCode = summary
    ? `RES-${summary.linha_code}-${summary.ano}-${String(summary.mes).padStart(2, '0')}-${nextVersionTag}`
    : ''

  // Carregar template aplicável ao abrir
  useEffect(() => {
    if (!isOpen || !summary) {
      setMotivo('')
      setObservacoes('')
      setGenerationMode('copy')
      setErrorMsg(null)
      setIsSubmitting(false)
      return
    }

    let isMounted = true
    setIsLoadingTemplate(true)

    pcpMonthlySummaryService
      .resolveApplicableTemplate({
        empresa: summary.empresa_code,
        linha: summary.linha_code,
        centro: summary.centro_code,
      })
      .then((tmpl) => {
        if (isMounted) {
          setApplicableTemplate(tmpl)
          setIsLoadingTemplate(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoadingTemplate(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, summary])

  if (!summary) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação estrita: motivo obrigatório
    if (!motivo.trim()) {
      setErrorMsg('O preenchimento do motivo da nova versão é estritamente obrigatório.')
      return
    }

    if (isSubmitting) return // Guarda contra duplo clique

    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const newSummary = await pcpMonthlySummaryService.createNewVersion(
        summary.id,
        motivo.trim(),
        observacoes.trim(),
        {
          reprocessWithAI: generationMode === 'reprocess',
          templateId: applicableTemplate?.id,
        },
      )

      onSuccess(newSummary)
      onClose()
    } catch (err: any) {
      console.error('Erro ao gerar nova versão do resumo mensal:', err)
      setErrorMsg(
        err?.message ||
          'Falha ao gerar nova versão do resumo mensal. Verifique os dados e tente novamente.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="w-[min(94vw,850px)] max-w-[min(94vw,850px)] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-slate-200">
        <ErrorBoundary componentName="CreateNewVersionModal">
          <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            {/* Cabeçalho no padrão azul Ciafal */}
            <DialogHeader className="p-4 border-b border-slate-200 bg-[#004C97] text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/10 backdrop-blur-xs text-white">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Criar Nova Versão do Resumo Mensal</span>
                    <Badge className="bg-white/20 hover:bg-white/25 text-white border-none font-mono text-xs">
                      {nextVersionTag}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-blue-100/90 mt-0.5">
                    Gera uma nova iteração incremental preservando integralmente o histórico da
                    versão anterior.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Corpo do formulário com rolagem interna */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-slate-50/50">
              {errorMsg && (
                <Alert
                  variant="destructive"
                  className="bg-rose-50 border-rose-300 text-rose-900 py-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <AlertDescription className="text-xs font-medium ml-2">
                    {errorMsg}
                  </AlertDescription>
                </Alert>
              )}

              {/* Card de Contexto e Metadados do Resumo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    Empresa / Centro
                  </span>
                  <div className="font-bold text-slate-800 text-xs">
                    {summary.empresa_code} &bull; {summary.centro_code}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={summary.centro_nome}>
                    {summary.centro_nome || 'Divinópolis Matriz'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Factory className="w-3 h-3 text-slate-400" />
                    Linha de Produção
                  </span>
                  <div className="font-bold text-slate-800 text-xs">{summary.linha_code}</div>
                  <div className="text-[10px] text-slate-500 truncate" title={summary.linha_nome}>
                    {summary.linha_nome || `Linha ${summary.linha_code}`}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Mês / Ano
                  </span>
                  <div className="font-bold text-slate-800 text-xs">{summary.mes_ano}</div>
                  <div className="text-[10px] text-slate-500">
                    Ano: {summary.ano} | Mês: {String(summary.mes).padStart(2, '0')}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-slate-400" />
                    Transição de Versão
                  </span>
                  <div className="font-bold text-sky-800 text-xs flex items-center gap-1">
                    <span className="text-slate-500 line-through font-mono">
                      {summary.version_tag || `V${String(summary.version_number).padStart(2, '0')}`}
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <Badge className="bg-sky-100 text-sky-900 border-sky-300 font-mono text-[10px] px-1.5 py-0">
                      {nextVersionTag}
                    </Badge>
                  </div>
                  <div
                    className="text-[10px] text-slate-500 font-mono truncate"
                    title={nextSummaryCode}
                  >
                    {nextSummaryCode}
                  </div>
                </div>
              </div>

              {/* Card de Template Aplicável */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-600 text-white shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-blue-950 uppercase tracking-wide flex items-center gap-1.5">
                      <span>Template Vigente Vinculado:</span>
                      {isLoadingTemplate && (
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      )}
                    </div>
                    {applicableTemplate ? (
                      <div className="mt-1 space-y-0.5">
                        <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                          <span>{applicableTemplate.nome}</span>
                          <Badge
                            variant="outline"
                            className="bg-white text-blue-900 border-blue-300 font-mono text-[10px]"
                          >
                            {applicableTemplate.versao_tag || 'V1.0'}
                          </Badge>
                          {applicableTemplate.is_default && (
                            <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-600">
                          Código:{' '}
                          <strong className="font-mono text-slate-800">
                            {applicableTemplate.template_code}
                          </strong>{' '}
                          &bull; Aplicação:{' '}
                          <span className="capitalize font-medium">
                            {applicableTemplate.aplicacao.toLowerCase()}
                          </span>{' '}
                          &bull; {applicableTemplate.sections_config?.length || 18} seções
                          configuradas
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] text-slate-600">
                        Estrutura Canônica Padrão Institucional CIAFAL (18 seções mínimas
                        homologadas)
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <Badge
                    variant="outline"
                    className="bg-white text-slate-700 border-slate-300 text-[10px]"
                  >
                    Hierarquia Ativa
                  </Badge>
                </div>
              </div>

              {/* Opções de Conteúdo Base */}
              <div className="space-y-2 p-3.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                <Label className="text-xs font-bold text-slate-800">
                  Modo de Inicialização do Conteúdo:
                </Label>
                <RadioGroup
                  value={generationMode}
                  onValueChange={(val) => setGenerationMode(val as 'copy' | 'reprocess')}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
                >
                  <label
                    htmlFor="mode-copy"
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      generationMode === 'copy'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <RadioGroupItem value="copy" id="mode-copy" className="mt-0.5 text-[#004C97]" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Copy className="w-3.5 h-3.5 text-blue-600" />
                        <span>Usar conteúdo da versão atual como base</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Clona os textos e tabelas da versão atual para ajustes pontuais manuais pelo
                        PCP. Status inicial:{' '}
                        <strong className="text-slate-700">Em Edição PCP</strong>.
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="mode-reprocess"
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      generationMode === 'reprocess'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-950 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <RadioGroupItem
                      value="reprocess"
                      id="mode-reprocess"
                      className="mt-0.5 text-[#004C97]"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Reprocessar dados e IA utilizando o template vigente</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Reexecuta a compilação a partir das fontes SAP, MES e WMS aplicando as
                        regras do template. Status inicial:{' '}
                        <strong className="text-slate-700">Rascunho IA</strong>.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              {/* Campo Obrigatório: Motivo da Nova Versão */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="motivo"
                    className="text-xs font-bold text-slate-800 flex items-center gap-1"
                  >
                    <span>Motivo da Nova Versão</span>
                    <span className="text-rose-600 font-bold">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-400">
                    Obrigatório &bull; Gravado de forma imutável na auditoria
                  </span>
                </div>
                <Textarea
                  id="motivo"
                  value={motivo}
                  onChange={(e) => {
                    setMotivo(e.target.value)
                    if (errorMsg) setErrorMsg(null)
                  }}
                  placeholder="Ex: Replanejamento fabril após alteração na carteira de pedidos MTO e repriorização da linha no SAP SD..."
                  rows={3}
                  className="text-xs bg-white border-slate-300 focus:border-[#004C97] focus:ring-[#004C97]"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Campo Opcional: Observações Adicionais */}
              <div className="space-y-1.5">
                <Label htmlFor="observacoes" className="text-xs font-semibold text-slate-700">
                  Observações Adicionais (Opcional)
                </Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Detalhes complementares sobre as alterações esperadas nesta iteração..."
                  rows={2}
                  className="text-xs bg-white border-slate-300 focus:border-[#004C97] focus:ring-[#004C97]"
                  disabled={isSubmitting}
                />
              </div>

              {/* Nota de Governança e Regras de Segurança */}
              <div className="p-3 bg-slate-100/80 rounded-md border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Garantias de Governança Operacional:
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-500 pl-1">
                  <li>
                    A versão anterior permanece intacta e acessível na consulta e no histórico.
                  </li>
                  <li>
                    O código de rastreamento é unívoco e protegido contra duplicidade concorrente.
                  </li>
                  <li>
                    A ação será registrada no log imutável com usuário, data/hora e justificativa.
                  </li>
                </ul>
              </div>
            </div>

            {/* Rodapé com Ações */}
            <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !motivo.trim()}
                className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-2 font-bold shadow-xs px-4"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Criando {nextVersionTag}...</span>
                  </>
                ) : (
                  <>
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Confirmar & Criar {nextVersionTag}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

export default CreateNewVersionModal
