import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Database,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Info,
  XCircle,
  Loader2,
  Sparkles,
  ArrowDownCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FcaIntegrationStatus,
  ModelVisualStatus,
  ModelWarning,
  SapFetchedMaterialData,
  FieldComparisonItem,
  OFFICIAL_VALIDATION_GROUPS,
  ValidationOverallStatus,
  SapStandardModelRecord,
} from '@/types/sap-validation'
import { sapValidationService } from '@/services/sap-validation-service'
import {
  sapStandardModelsService,
  MaterialSuggestionItem,
} from '@/services/sap-standard-models-service'

interface NovaValidacaoTabProps {
  fcaStatus: FcaIntegrationStatus | null
  onValidationSaved?: () => void
}

export const NovaValidacaoTab: React.FC<NovaValidacaoTabProps> = ({
  fcaStatus,
  onValidationSaved,
}) => {
  // Estado dos Códigos
  const [materialNewCode, setMaterialNewCode] = useState('')
  const [materialNewDesc, setMaterialNewDesc] = useState('')
  const [materialModelCode, setMaterialModelCode] = useState('')
  const [materialModelDesc, setMaterialModelDesc] = useState('')

  // Sugestões de Código Novo
  const [newCodeSuggestions, setNewCodeSuggestions] = useState<MaterialSuggestionItem[]>([])
  const [showNewSuggestions, setShowNewSuggestions] = useState(false)
  const [searchingNewCatalog, setSearchingNewCatalog] = useState(false)
  const newRef = useRef<HTMLDivElement>(null)

  // Sugestões de Código Modelo
  const [modelCodeSuggestions, setModelCodeSuggestions] = useState<MaterialSuggestionItem[]>([])
  const [showModelSuggestions, setShowModelSuggestions] = useState(false)
  const [searchingModelCatalog, setSearchingModelCatalog] = useState(false)
  const modelRef = useRef<HTMLDivElement>(null)

  // Modelos Padrão Sugeridos Automaticamente
  const [suggestedStandardModels, setSuggestedStandardModels] = useState<SapStandardModelRecord[]>(
    [],
  )
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  // Dados consultados no SAP
  const [sapNewData, setSapNewData] = useState<SapFetchedMaterialData | null>(null)
  const [sapModelData, setSapModelData] = useState<SapFetchedMaterialData | null>(null)

  // Mensagens e feedbacks
  const [fcaErrorMessage, setFcaErrorMessage] = useState<string | null>(null)
  const [fcaErrorDetails, setFcaErrorDetails] = useState<string | null>(null)
  const [successConsultMessage, setSuccessConsultMessage] = useState<string | null>(null)

  // Loading states
  const [loadingConsultNew, setLoadingConsultNew] = useState(false)
  const [loadingConsultModel, setLoadingConsultModel] = useState(false)

  // Validação do Código Modelo (Regras 1, 2 e 3)
  const [modelStatus, setModelStatus] = useState<ModelVisualStatus | null>(null)
  const [modelWarnings, setModelWarnings] = useState<ModelWarning[]>([])
  const [modelJustification, setModelJustification] = useState('')
  const [activeWarningPopup, setActiveWarningPopup] = useState<ModelWarning | null>(null)

  // Validação Geral (Matriz)
  const [executingValidation, setExecutingValidation] = useState(false)
  const [validationRun, setValidationRun] = useState(false)
  const [overallStatus, setOverallStatus] =
    useState<ValidationOverallStatus>('AGUARDANDO_VALIDACAO')
  const [fieldResults, setFieldResults] = useState<FieldComparisonItem[]>([])
  const [filterCategory, setFilterCategory] = useState<
    'TODOS' | 'DIVERGENTES' | 'CONFORMES' | 'NEUTROS' | 'NAO_APLICAVEIS'
  >('TODOS')
  const [selectedFieldForDetail, setSelectedFieldForDetail] = useState<FieldComparisonItem | null>(
    null,
  )

  // Histórico de reconsulta
  const [reconsultingSap, setReconsultingSap] = useState(false)
  const [reconsultHistory, setReconsultHistory] = useState<any[]>([])

  // Fechar dropdowns de sugestão ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newRef.current && !newRef.current.contains(e.target as Node)) {
        setShowNewSuggestions(false)
      }
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setShowModelSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Busca de sugestões para Código Novo
  useEffect(() => {
    if (!materialNewCode || materialNewCode.trim().length < 2) {
      setNewCodeSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingNewCatalog(true)
      try {
        const res = await sapStandardModelsService.searchMaterialsCatalog(materialNewCode)
        setNewCodeSuggestions(res)
      } finally {
        setSearchingNewCatalog(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [materialNewCode])

  // Busca de sugestões para Código Modelo
  useEffect(() => {
    if (!materialModelCode || materialModelCode.trim().length < 2) {
      setModelCodeSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      setSearchingModelCatalog(true)
      try {
        const res = await sapStandardModelsService.searchMaterialsCatalog(materialModelCode)
        setModelCodeSuggestions(res)
      } finally {
        setSearchingModelCatalog(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [materialModelCode])

  // Buscar Modelos Padrão Sugeridos quando houver dados do Código Novo
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!materialNewCode.trim()) {
        setSuggestedStandardModels([])
        return
      }

      setLoadingSuggestions(true)
      try {
        const suggestions = await sapStandardModelsService.findSuggestedModels({
          material_type: sapNewData?.material_type,
          center: sapNewData?.center,
        })
        setSuggestedStandardModels(suggestions)
      } finally {
        setLoadingSuggestions(false)
      }
    }

    fetchSuggestions()
  }, [materialNewCode, sapNewData?.material_type, sapNewData?.center])

  // Ação: Selecionar modelo sugerido
  const handleSelectSuggestedModel = (model: SapStandardModelRecord) => {
    setMaterialModelCode(model.material_code)
    setMaterialModelDesc(model.description || `Material Homologado (${model.material_code})`)
    setModelStatus(null)
    setModelWarnings([])
  }

  // Consulta do código novo no SAP
  const handleConsultNewCode = async () => {
    const code = materialNewCode.trim()
    if (!code || loadingConsultNew) return

    setLoadingConsultNew(true)
    setFcaErrorMessage(null)
    setFcaErrorDetails(null)
    setSuccessConsultMessage(null)

    try {
      const res = await sapValidationService.fetchMaterialFromSap(code, false)

      if (!res.success) {
        setFcaErrorMessage(`Não foi possível consultar o código ${code} no SAP.`)
        setFcaErrorDetails(res.functional_message || res.message || null)
        // Preservar código informado em caso de erro conforme requisito 6
        return
      }

      setSapNewData(res.data || null)
      if (res.data?.description) {
        setMaterialNewDesc(res.data.description)
      }
      setSuccessConsultMessage(`Código ${code} consultado no SAP com sucesso.`)
      setTimeout(() => setSuccessConsultMessage(null), 5000)
    } finally {
      setLoadingConsultNew(false)
    }
  }

  // Consulta do código modelo no SAP
  const handleConsultModelCode = async () => {
    const code = materialModelCode.trim()
    if (!code || loadingConsultModel) return

    setLoadingConsultModel(true)
    setFcaErrorMessage(null)
    setFcaErrorDetails(null)
    setSuccessConsultMessage(null)

    try {
      const res = await sapValidationService.fetchMaterialFromSap(code, true)

      if (!res.success) {
        setFcaErrorMessage(`Não foi possível consultar o código ${code} no SAP.`)
        setFcaErrorDetails(res.functional_message || res.message || null)
        return
      }

      setSapModelData(res.data || null)
      if (res.data?.description) {
        setMaterialModelDesc(res.data.description)
      }
      setSuccessConsultMessage(`Código ${code} consultado no SAP com sucesso.`)
      setTimeout(() => setSuccessConsultMessage(null), 5000)
    } finally {
      setLoadingConsultModel(false)
    }
  }

  // Validar Código Modelo (3 Regras Funcionais)
  const handleValidateModelCode = () => {
    if (!materialModelCode.trim()) return

    const evaluation = sapValidationService.evaluateModelCodeRules({
      materialNewCode,
      materialModelCode,
      modelCreatedDate: sapModelData?.created_at_sap,
      hasMovements: !!sapModelData?.movements_summary?.last_movement_date,
    })

    setModelStatus(evaluation.modelStatus)
    setModelWarnings(evaluation.warnings)

    if (evaluation.warnings.length > 0) {
      setActiveWarningPopup(evaluation.warnings[0])
    }
  }

  // Executar validação completa (Engine de comparação)
  const handleExecuteValidation = async () => {
    if (!materialNewCode.trim() || !materialModelCode.trim()) return

    if (modelStatus && modelStatus !== 'VERDE' && !modelJustification.trim()) {
      alert(
        'Explicação para utilização do código modelo é obrigatória para status Amarelo ou Vermelho.',
      )
      return
    }

    setExecutingValidation(true)
    const res = await sapValidationService.executeValidation({
      materialNewCode,
      materialModelCode,
      modelJustification,
      sapNewData: sapNewData?.raw_fields,
      sapModelData: sapModelData?.raw_fields,
    })
    setExecutingValidation(false)
    setValidationRun(true)

    if (res.success) {
      setOverallStatus(res.overall_status)
      setFieldResults(res.field_results || [])
      setModelStatus(res.model_status)
      if (onValidationSaved) onValidationSaved()
    }
  }

  // Botão "Atualizar dados do SAP" (reconsulta + recalcula)
  const handleReconsultSap = async () => {
    setReconsultingSap(true)
    const prevOverall = overallStatus
    const res = await sapValidationService.fetchMaterialFromSap(materialNewCode, false)
    setReconsultingSap(false)

    if (!res.success) {
      setFcaErrorMessage(
        res.functional_message ||
          'Não foi possível consultar o SAP. A validação não foi executada.',
      )
      return
    }

    const reconsultEntry = {
      timestamp: new Date().toLocaleString('pt-BR'),
      user: 'Usuário Conectado',
      previous_result: prevOverall,
      new_result: overallStatus,
      status: 'Sucesso',
    }
    setReconsultHistory((prev) => [reconsultEntry, ...prev])
  }

  // KPIs de conformidade
  const totalAnalyzed = fieldResults.length
  const approvedCount = fieldResults.filter((f) => f.validation_result === 'APROVADO').length
  const divergentCount = fieldResults.filter((f) => f.validation_result === 'DIVERGENTE').length
  const naCount = fieldResults.filter((f) => f.validation_result === 'NAO_SE_APLICA').length
  const neutralCount = fieldResults.filter(
    (f) => f.validation_result === 'NEUTRO' || f.tipo_validacao === 'NEUTRO',
  ).length

  const denominator = approvedCount + divergentCount
  const compliancePct =
    denominator > 0 ? Math.round((approvedCount / denominator) * 1000) / 10 : 100

  const visibleFieldResults = fieldResults.filter((f) => {
    if (filterCategory === 'DIVERGENTES') return f.validation_result === 'DIVERGENTE'
    if (filterCategory === 'CONFORMES') return f.validation_result === 'APROVADO'
    if (filterCategory === 'NEUTROS')
      return f.validation_result === 'NEUTRO' || f.tipo_validacao === 'NEUTRO'
    if (filterCategory === 'NAO_APLICAVEIS') return f.validation_result === 'NAO_SE_APLICA'
    return true
  })

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* ALERTA DE ESTADO REAL: Integração SAP FCA e Matriz ZVALIDA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card de Conector FCA */}
        <div
          className={`p-4 rounded-lg border text-sm flex items-start gap-3 ${
            fcaStatus?.fca_configured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {fcaStatus?.fca_configured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-2">
              Conexão SAP FCA (ECC 6.08)
              <Badge
                variant="outline"
                className={
                  fcaStatus?.fca_configured
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]'
                    : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'
                }
              >
                {fcaStatus?.fca_configured ? 'CONECTADO' : 'NÃO CONFIGURADO'}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {fcaStatus?.fca_configured
                ? `Integração FCA ativa. Endpoint: ${fcaStatus.fca_base_url}`
                : 'Integração SAP/FCA ainda não configurada para consulta.'}
            </p>
          </div>
        </div>

        {/* Card de Matriz ZVALIDA */}
        <div
          className={`p-4 rounded-lg border text-sm flex items-start gap-3 ${
            fcaStatus?.matrix_loaded
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <Database className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-2">
              Matriz Funcional ZVALIDA
              <Badge
                variant="outline"
                className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]"
              >
                {fcaStatus?.matrix_loaded
                  ? `${fcaStatus.matrix_rules_count} REGRAS ATIVAS`
                  : 'AGUARDANDO IMPORTAÇÃO'}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {fcaStatus?.matrix_loaded
                ? 'Estrutura da matriz de campos e regras lida diretamente das tabelas do banco de dados.'
                : 'Matriz ZVALIDA não carregada — aguardando importação da matriz funcional pelo administrador. Toda a arquitetura e motor de comparação estão operacionais.'}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback de Sucesso da Consulta */}
      {successConsultMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successConsultMessage}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSuccessConsultMessage(null)}
            className="text-emerald-800 hover:bg-emerald-100 h-7 text-xs"
          >
            Fechar
          </Button>
        </div>
      )}

      {/* Mensagem de Erro Funcional SAP se houver tentativa de consulta sem FCA */}
      {fcaErrorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">{fcaErrorMessage}</div>
              {fcaErrorDetails && (
                <div className="text-xs text-red-700 mt-0.5 leading-relaxed">{fcaErrorDetails}</div>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-800 hover:bg-red-100 shrink-0 gap-1.5"
            onClick={handleConsultNewCode}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* REDESENHO: ÁREA DOS CÓDIGOS EM LAYOUT VERTICAL (CÓDIGO NOVO EM CIMA, CÓDIGO MODELO EM BAIXO) */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#004C97]" />
            Seleção e Parâmetros dos Códigos
          </CardTitle>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* BLOCO 1 (SUPERIOR): CÓDIGO NOVO */}
          <div
            className="p-4 rounded-lg border border-emerald-300 bg-emerald-50/30 space-y-3 relative"
            ref={newRef}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <Label
                htmlFor="input-codigo-novo"
                className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                Código Novo [MARA-MATNR] *
              </Label>
              <Badge
                variant="outline"
                className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] w-fit"
              >
                Material a ser Homologado
              </Badge>
            </div>

            {/* Input de Busca com Botão Pesquisar */}
            <div className="relative">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input
                    id="input-codigo-novo"
                    aria-label="Código Novo"
                    placeholder="Digite código SAP, parte ou descrição (ex: 1020, 2002132E)..."
                    value={materialNewCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setMaterialNewCode(val)
                      setShowNewSuggestions(true)
                    }}
                    onFocus={() => {
                      if (newCodeSuggestions.length > 0) setShowNewSuggestions(true)
                    }}
                    className="bg-white border-emerald-300 focus-visible:ring-emerald-500 font-mono text-sm font-bold text-slate-900 pr-8"
                  />
                  {searchingNewCatalog && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-2.5 top-2.5" />
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewSuggestions(true)}
                    className="border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Pesquisar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConsultNewCode}
                    disabled={loadingConsultNew || !materialNewCode.trim()}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5 shrink-0"
                  >
                    {loadingConsultNew ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Consultar SAP
                  </Button>
                </div>
              </div>

              {/* Sugestões de autocomplete Código Novo */}
              {showNewSuggestions && newCodeSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white rounded-md border border-slate-200 shadow-lg text-xs">
                  <div className="p-1.5 bg-slate-50 border-b text-[10px] text-slate-500 font-semibold">
                    Sugestões no catálogo SAP:
                  </div>
                  {newCodeSuggestions.map((item) => (
                    <div
                      key={item.code}
                      onClick={() => {
                        setMaterialNewCode(item.code)
                        setMaterialNewDesc(item.description)
                        setShowNewSuggestions(false)
                      }}
                      className="p-2 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex flex-col gap-0.5"
                    >
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.code}</span>
                        {item.material_type && (
                          <Badge variant="outline" className="text-[9px] py-0">
                            {item.material_type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-slate-600 truncate">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição do Material Novo logo abaixo no mesmo bloco */}
            <div className="pt-1 space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">
                Descrição Código Novo (MAKTX)
              </Label>
              <div className="p-2.5 bg-white rounded border border-emerald-200 text-xs font-semibold text-slate-800 min-h-[38px] flex items-center">
                {materialNewDesc || sapNewData?.description || (
                  <span className="text-slate-400 font-normal italic">
                    {fcaStatus?.fca_configured
                      ? 'Preenchimento automático após seleção ou consulta SAP...'
                      : 'Integração SAP/FCA ainda não configurada para consulta.'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* SUGESTÃO AUTOMÁTICA DE CÓDIGO MODELO (SEÇÃO COMPATÍVEL) */}
          {suggestedStandardModels.length > 0 && (
            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#004C97]" />
                  Modelos Padrão Sugeridos Automaticamente
                </span>
                <Badge
                  variant="outline"
                  className="bg-white text-blue-800 border-blue-300 text-[10px]"
                >
                  {suggestedStandardModels.length} compatíveis
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600">
                O PCP encontrou modelos homologados compatíveis com as características deste
                material. Você pode utilizar uma das referências abaixo ou pesquisar outro modelo
                manualmente.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {suggestedStandardModels.slice(0, 4).map((mod) => (
                  <div
                    key={mod.id}
                    className="p-2.5 bg-white rounded-md border border-blue-200 flex flex-col justify-between gap-2 shadow-2xs hover:border-blue-400 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {mod.material_code}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[9px] py-0 font-mono">
                            {mod.material_type}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] py-0 bg-slate-50">
                            {mod.line_code || mod.line_id}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 bg-blue-50 text-blue-800"
                          >
                            {mod.center}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate font-medium">
                        {mod.description || 'Modelo de Referência Homologado'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleSelectSuggestedModel(mod)}
                      className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      Usar este modelo
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BLOCO 2 (INFERIOR): CÓDIGO MODELO */}
          <div
            className="p-4 rounded-lg border border-blue-300 bg-blue-50/20 space-y-3 relative"
            ref={modelRef}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <Label
                htmlFor="input-codigo-modelo"
                className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                Código Modelo [MARA-MATNR] *
              </Label>
              <Badge
                variant="outline"
                className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] w-fit"
              >
                Material de Referência Homologado
              </Badge>
            </div>

            {/* Input de Busca com Botão Pesquisar */}
            <div className="relative">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input
                    id="input-codigo-modelo"
                    aria-label="Código Modelo"
                    placeholder="Digite código modelo, parte ou descrição (ex: 1020, 2001987E)..."
                    value={materialModelCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setMaterialModelCode(val)
                      setShowModelSuggestions(true)
                    }}
                    onFocus={() => {
                      if (modelCodeSuggestions.length > 0) setShowModelSuggestions(true)
                    }}
                    className="bg-white border-blue-300 focus-visible:ring-blue-500 font-mono text-sm font-bold text-slate-900 pr-8"
                  />
                  {searchingModelCatalog && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-2.5 top-2.5" />
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowModelSuggestions(true)}
                    className="border-blue-300 text-blue-900 hover:bg-blue-100 text-xs gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Pesquisar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConsultModelCode}
                    disabled={loadingConsultModel || !materialModelCode.trim()}
                    className="bg-[#004C97] hover:bg-[#003870] text-white text-xs gap-1.5 shrink-0"
                  >
                    {loadingConsultModel ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    Consultar SAP
                  </Button>
                </div>
              </div>

              {/* Sugestões de autocomplete Código Modelo */}
              {showModelSuggestions && modelCodeSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white rounded-md border border-slate-200 shadow-lg text-xs">
                  <div className="p-1.5 bg-slate-50 border-b text-[10px] text-slate-500 font-semibold">
                    Sugestões no catálogo SAP:
                  </div>
                  {modelCodeSuggestions.map((item) => (
                    <div
                      key={item.code}
                      onClick={() => {
                        setMaterialModelCode(item.code)
                        setMaterialModelDesc(item.description)
                        setShowModelSuggestions(false)
                      }}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-b-0 flex flex-col gap-0.5"
                    >
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                        <span>{item.code}</span>
                        {item.material_type && (
                          <Badge variant="outline" className="text-[9px] py-0">
                            {item.material_type}
                          </Badge>
                        )}
                      </div>
                      <div className="text-slate-600 truncate">{item.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descrição do Material Modelo logo abaixo no mesmo bloco */}
            <div className="pt-1 space-y-1">
              <Label className="text-[11px] font-semibold text-slate-700">
                Descrição Código Modelo (MAKTX)
              </Label>
              <div className="p-2.5 bg-white rounded border border-blue-200 text-xs font-semibold text-slate-800 min-h-[38px] flex items-center">
                {materialModelDesc || sapModelData?.description || (
                  <span className="text-slate-400 font-normal italic">
                    {fcaStatus?.fca_configured
                      ? 'Preenchimento automático após seleção ou consulta SAP...'
                      : 'Integração SAP/FCA ainda não configurada para consulta.'}
                  </span>
                )}
              </div>
            </div>

            {/* Botão Validar Modelo abaixo dentro do mesmo bloco */}
            <div className="pt-2 flex items-center justify-between border-t border-blue-100">
              <p className="text-[11px] text-slate-500">
                Verifica as 3 regras funcionais: criação recente (&lt;6 meses), movimentação SAP e
                compatibilidade.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleValidateModelCode}
                disabled={!materialModelCode.trim()}
                className="border-blue-400 text-blue-900 hover:bg-blue-100 text-xs font-semibold shrink-0"
              >
                Validar Modelo
              </Button>
            </div>
          </div>

          {/* STATUS VISUAL DO CÓDIGO MODELO APÓS VERIFICAÇÕES */}
          {modelStatus && (
            <div
              className={`p-4 rounded-lg border text-sm flex flex-col md:flex-row items-start justify-between gap-4 ${
                modelStatus === 'VERDE'
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                  : modelStatus === 'AMARELO'
                    ? 'bg-amber-50/60 border-amber-300 text-amber-900'
                    : 'bg-red-50/60 border-red-300 text-red-900'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    Status do Código Modelo:
                  </span>
                  <Badge
                    className={
                      modelStatus === 'VERDE'
                        ? 'bg-emerald-600 text-white'
                        : modelStatus === 'AMARELO'
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-600 text-white'
                    }
                  >
                    {modelStatus === 'VERDE' && 'VERDE — SEM ADVERTÊNCIAS'}
                    {modelStatus === 'AMARELO' && 'AMARELO — 1 ADVERTÊNCIA'}
                    {modelStatus === 'VERMELHO' && 'VERMELHO — 2+ ADVERTÊNCIAS'}
                  </Badge>
                </div>
                {modelWarnings.length > 0 ? (
                  <ul className="text-xs list-disc list-inside space-y-0.5 text-slate-700">
                    {modelWarnings.map((w, idx) => (
                      <li key={idx} className="font-medium">
                        {w.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-600">
                    Código modelo plenamente aprovado pelas 3 regras funcionais (tempo de criação,
                    movimentação e prefixo).
                  </p>
                )}
              </div>

              {/* Justificativa obrigatória se amarelo ou vermelho */}
              {(modelStatus === 'AMARELO' || modelStatus === 'VERMELHO') && (
                <div className="w-full md:w-1/2 space-y-1">
                  <Label className="text-xs font-bold text-slate-800">
                    Explicação para utilização do código modelo *
                  </Label>
                  <Textarea
                    placeholder="Descreva detalhadamente a justificativa técnica para aceitar este código modelo com advertências..."
                    value={modelJustification}
                    onChange={(e) => setModelJustification(e.target.value)}
                    className="h-16 text-xs bg-white border-amber-300 focus-visible:ring-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO DOS CAMPOS AMARELOS (SOMENTE LEITURA, PREENCHIDOS VIA SAP FCA) */}
          <div className="space-y-3 bg-amber-50/30 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Dados Consultados Diretamente no SAP (Somente Leitura)
                </span>
              </div>
              <Badge
                variant="outline"
                className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                Indicador FCA Automático
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
              {/* Centro WERKS */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Centro (WERKS)</span>
                <div className="font-bold text-slate-800 truncate">
                  {sapNewData?.center || sapModelData?.center || '—'}
                </div>
              </div>

              {/* Tipo de Material MTART */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">
                  Tipo Material (MARA-MTART)
                </span>
                <div className="font-bold text-slate-800 truncate">
                  {sapNewData?.material_type || sapModelData?.material_type || '—'}
                </div>
              </div>

              {/* Controle de Preço */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Controle de Preço</span>
                <div className="font-bold text-slate-800 truncate">
                  {sapNewData?.price_control || sapModelData?.price_control || '—'}
                </div>
              </div>

              {/* Descrição Código Novo */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5 col-span-2">
                <span className="text-[10px] text-slate-500 font-medium">
                  Descrição Código Novo (MAKTX)
                </span>
                <div className="font-bold text-slate-800 truncate">
                  {materialNewDesc || sapNewData?.description || 'Aguardando consulta SAP...'}
                </div>
              </div>

              {/* Descrição Código Modelo */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5 col-span-2">
                <span className="text-[10px] text-slate-500 font-medium">
                  Descrição Código Modelo (MAKTX)
                </span>
                <div className="font-bold text-slate-800 truncate">
                  {materialModelDesc || sapModelData?.description || 'Aguardando consulta SAP...'}
                </div>
              </div>

              {/* Data Criação */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Criado em (UDATE)</span>
                <div className="font-semibold text-slate-700 truncate">
                  {sapNewData?.created_at_sap || '—'}
                </div>
              </div>

              {/* Criado Por */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">
                  Criado Por (CDHDR-USER)
                </span>
                <div className="font-semibold text-slate-700 truncate">
                  {sapNewData?.created_by_sap || '—'}
                </div>
              </div>

              {/* Modificado Em */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Modificado em</span>
                <div className="font-semibold text-slate-700 truncate">
                  {sapNewData?.modified_at_sap || '—'}
                </div>
              </div>

              {/* Modificado Por */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500 font-medium">Modificado Por</span>
                <div className="font-semibold text-slate-700 truncate">
                  {sapNewData?.modified_by_sap || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* DADOS DE MOVIMENTAÇÃO DO CÓDIGO MODELO (CARREGADOS VIA FCA) */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#004C97]" />
                Registros de Movimentação do Código Modelo (SAP MKPF / MSEG)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Último movimento:{' '}
                {sapModelData?.movements_summary?.last_movement_date ||
                  'Sem movimentação SAP localizada.'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Entrada de Estoque */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Última Entrada (101/531)</span>
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {sapModelData?.movements_summary?.last_stock_entry?.date || 'Sem movimentação'}
                </div>
              </div>

              {/* Consumo de Estoque */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Último Consumo (261)</span>
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {sapModelData?.movements_summary?.last_stock_consumption?.date ||
                    'Sem movimentação'}
                </div>
              </div>

              {/* Movimento de Estoque */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Última Transf. (311/309)</span>
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {sapModelData?.movements_summary?.last_stock_transfer?.date || 'Sem movimentação'}
                </div>
              </div>

              {/* Faturamento */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Último Faturamento (601)</span>
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {sapModelData?.movements_summary?.last_invoicing?.date || 'Sem movimentação'}
                </div>
              </div>

              {/* Envio Industrialização */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Envio Industrializ. (541)</span>
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {sapModelData?.movements_summary?.last_send_industrialization?.date ||
                    'Sem movimentação'}
                </div>
              </div>

              {/* Retorno Industrialização */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Retorno Industrializ. (121)</span>
                <div className="font-semibold text-slate-800 text-[11px] truncate">
                  {sapModelData?.movements_summary?.last_return_industrialization?.date ||
                    'Sem movimentação'}
                </div>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO: COMPARAR E ATUALIZAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleExecuteValidation}
                disabled={
                  executingValidation || !materialNewCode.trim() || !materialModelCode.trim()
                }
                className="bg-[#004C97] hover:bg-[#003870] text-white gap-2 text-xs h-9 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                {executingValidation ? 'Executando Análise...' : 'Executar Comparação de Cadastro'}
              </Button>

              <Button
                variant="outline"
                onClick={handleReconsultSap}
                disabled={reconsultingSap || !materialNewCode.trim()}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reconsultingSap ? 'animate-spin' : ''}`} />
                Atualizar dados do SAP
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Status Geral:</span>
              <Badge
                className={
                  overallStatus === 'VALIDADO'
                    ? 'bg-emerald-600 text-white'
                    : overallStatus === 'DIVERGENTE'
                      ? 'bg-red-600 text-white'
                      : overallStatus === 'APTO_PARA_APROVACAO'
                        ? 'bg-blue-600 text-white'
                        : 'bg-amber-500 text-white'
                }
              >
                {overallStatus.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARDS DE RESUMO NO TOPO (CLICÁVEIS) */}
      {validationRun && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Analisados */}
          <Card
            onClick={() => setFilterCategory('TODOS')}
            className={`cursor-pointer transition-all border-slate-200 ${
              filterCategory === 'TODOS' ? 'ring-2 ring-[#004C97]' : 'hover:border-slate-300'
            }`}
          >
            <CardContent className="p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Total de Campos
              </span>
              <div className="text-xl font-black text-slate-800 mt-1">{totalAnalyzed}</div>
              <span className="text-[10px] text-slate-400">Campos verificados</span>
            </CardContent>
          </Card>

          {/* Aprovados */}
          <Card
            onClick={() => setFilterCategory('CONFORMES')}
            className={`cursor-pointer transition-all border-emerald-200 bg-emerald-50/20 ${
              filterCategory === 'CONFORMES'
                ? 'ring-2 ring-emerald-600'
                : 'hover:border-emerald-300'
            }`}
          >
            <CardContent className="p-3.5">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Aprovados</span>
              <div className="text-xl font-black text-emerald-700 mt-1">{approvedCount}</div>
              <span className="text-[10px] text-emerald-600">Conformes</span>
            </CardContent>
          </Card>

          {/* Divergentes */}
          <Card
            onClick={() => setFilterCategory('DIVERGENTES')}
            className={`cursor-pointer transition-all border-red-200 bg-red-50/30 ${
              filterCategory === 'DIVERGENTES' ? 'ring-2 ring-red-600' : 'hover:border-red-300'
            }`}
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-red-800">Divergentes</span>
                <Badge
                  variant="outline"
                  className="bg-red-100 text-red-800 text-[9px] border-red-300"
                >
                  {filterCategory === 'DIVERGENTES' ? 'Filtrado' : 'Filtrar'}
                </Badge>
              </div>
              <div className="text-xl font-black text-red-700 mt-1">{divergentCount}</div>
              <span className="text-[10px] text-red-600">Com divergência</span>
            </CardContent>
          </Card>

          {/* Campos Neutros */}
          <Card
            onClick={() => setFilterCategory('NEUTROS')}
            className={`cursor-pointer transition-all border-slate-300 bg-slate-50/70 ${
              filterCategory === 'NEUTROS' ? 'ring-2 ring-slate-600' : 'hover:border-slate-400'
            }`}
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-700">
                  Campos Neutros
                </span>
                <Badge
                  variant="outline"
                  className="bg-slate-100 text-slate-700 text-[9px] border-slate-300"
                >
                  {filterCategory === 'NEUTROS' ? 'Filtrado' : 'Neutro'}
                </Badge>
              </div>
              <div className="text-xl font-black text-slate-800 mt-1">{neutralCount}</div>
              <span className="text-[10px] text-slate-500">Visualização (sem bloqueio)</span>
            </CardContent>
          </Card>

          {/* Não Aplicáveis */}
          <Card
            onClick={() => setFilterCategory('NAO_APLICAVEIS')}
            className={`cursor-pointer transition-all border-slate-200 bg-slate-50/40 ${
              filterCategory === 'NAO_APLICAVEIS'
                ? 'ring-2 ring-slate-500'
                : 'hover:border-slate-300'
            }`}
          >
            <CardContent className="p-3.5">
              <span className="text-[10px] uppercase font-bold text-slate-600">Não Aplicáveis</span>
              <div className="text-xl font-black text-slate-700 mt-1">{naCount}</div>
              <span className="text-[10px] text-slate-500">Regra N/A</span>
            </CardContent>
          </Card>

          {/* % Conformidade */}
          <Card className="border-blue-200 bg-blue-50/20">
            <CardContent className="p-3.5">
              <span className="text-[10px] uppercase font-bold text-blue-900">% Conformidade</span>
              <div className="text-xl font-black text-blue-800 mt-1">{compliancePct}%</div>
              <span className="text-[10px] text-blue-600">
                {approvedCount}/{denominator} comparáveis
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MATRIZ DE COMPARAÇÃO EM ACCORDIONS POR GRUPO */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <CardTitle className="text-sm font-bold text-slate-800">
              Matriz de Comparação Estrutural SAP
            </CardTitle>
          </div>

          {/* Barra de Filtros por Categoria */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Filtrar:</span>
            <Button
              size="sm"
              variant={filterCategory === 'TODOS' ? 'default' : 'outline'}
              className={`h-7 px-2.5 text-xs ${
                filterCategory === 'TODOS'
                  ? 'bg-[#004C97] text-white hover:bg-[#003870]'
                  : 'text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              onClick={() => setFilterCategory('TODOS')}
            >
              Todos ({totalAnalyzed})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === 'DIVERGENTES' ? 'default' : 'outline'}
              className={`h-7 px-2.5 text-xs ${
                filterCategory === 'DIVERGENTES'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'text-red-700 border-red-200 hover:bg-red-50'
              }`}
              onClick={() => setFilterCategory('DIVERGENTES')}
            >
              Divergentes ({divergentCount})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === 'CONFORMES' ? 'default' : 'outline'}
              className={`h-7 px-2.5 text-xs ${
                filterCategory === 'CONFORMES'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
              }`}
              onClick={() => setFilterCategory('CONFORMES')}
            >
              Conformes ({approvedCount})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === 'NEUTROS' ? 'default' : 'outline'}
              className={`h-7 px-2.5 text-xs ${
                filterCategory === 'NEUTROS'
                  ? 'bg-slate-700 text-white hover:bg-slate-800'
                  : 'text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              onClick={() => setFilterCategory('NEUTROS')}
            >
              Neutros ({neutralCount})
            </Button>
            <Button
              size="sm"
              variant={filterCategory === 'NAO_APLICAVEIS' ? 'default' : 'outline'}
              className={`h-7 px-2.5 text-xs ${
                filterCategory === 'NAO_APLICAVEIS'
                  ? 'bg-slate-600 text-white hover:bg-slate-700'
                  : 'text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
              onClick={() => setFilterCategory('NAO_APLICAVEIS')}
            >
              Não aplicáveis ({naCount})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {visibleFieldResults.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Database className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-slate-700 font-semibold text-sm">
                Nenhum resultado de comparação disponível no momento.
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Informe o Código Novo e o Código Modelo acima e clique em &quot;Executar Comparação
                de Cadastro&quot; para analisar os dados contra a matriz funcional.
              </p>
            </div>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={['MM03', 'CS01', 'CA01']}
              className="w-full space-y-2"
            >
              {OFFICIAL_VALIDATION_GROUPS.map((grp) => {
                const groupItems = visibleFieldResults.filter(
                  (f) => f.group_name.toUpperCase().includes(grp.id) || f.group_name === grp.title,
                )
                const groupDivergent = groupItems.filter(
                  (f) => f.validation_result === 'DIVERGENTE',
                ).length

                return (
                  <AccordionItem
                    key={grp.id}
                    value={grp.id}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <AccordionTrigger className="px-4 py-3 bg-slate-50/50 hover:bg-slate-100/70 text-slate-800 font-semibold text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{grp.title}</span>
                        <Badge variant="outline" className="text-[10px] bg-white border-slate-300">
                          {grp.transactionCode}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mr-3">
                        <span className="text-[11px] text-slate-500">
                          {groupItems.length} campos
                        </span>
                        {groupDivergent > 0 && (
                          <Badge className="bg-red-600 text-white text-[10px]">
                            {groupDivergent} divergência(s)
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0 border-t border-slate-200 bg-white">
                      {groupItems.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 text-center">
                          Aguardando importação dos campos da matriz funcional para o grupo{' '}
                          {grp.title}.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 text-xs">
                          {groupItems.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedFieldForDetail(item)}
                              className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <div className="space-y-0.5 min-w-0 pr-4 flex-1">
                                <div className="font-semibold text-slate-800 flex items-center gap-2 truncate">
                                  <span>{item.field_name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({item.sap_table_field})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-4">
                                  <span>
                                    Modelo: <strong>{item.model_value || '—'}</strong>
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                                  <span>
                                    Novo: <strong>{item.new_value || '—'}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {item.validation_result === 'NEUTRO' ||
                                item.tipo_validacao === 'NEUTRO' ? (
                                  <Badge
                                    title="Somente visualização — campo não comparado"
                                    className="bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[11px] hover:bg-slate-200"
                                  >
                                    NEUTRO
                                  </Badge>
                                ) : (
                                  <Badge
                                    className={
                                      item.validation_result === 'APROVADO'
                                        ? 'bg-emerald-600 text-white'
                                        : item.validation_result === 'DIVERGENTE'
                                          ? 'bg-red-600 text-white'
                                          : 'bg-slate-400 text-white'
                                    }
                                  >
                                    {item.validation_result}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* MODAL: POPUP DE CONFIRMAÇÃO DO CÓDIGO MODELO (REGRAS 1, 2 E 3) */}
      <Dialog
        open={!!activeWarningPopup}
        onOpenChange={(open) => !open && setActiveWarningPopup(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Confirmação de Código Modelo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              {activeWarningPopup?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveWarningPopup(null)
                setMaterialModelCode('')
                setMaterialModelDesc('')
                setModelStatus(null)
              }}
            >
              Não, alterar modelo
            </Button>
            <Button
              size="sm"
              className="bg-[#004C97] hover:bg-[#003870] text-white"
              onClick={() => setActiveWarningPopup(null)}
            >
              Sim, continuar com este modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DETALHE DA DIVERGÊNCIA */}
      <Dialog
        open={!!selectedFieldForDetail}
        onOpenChange={(open) => !open && setSelectedFieldForDetail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#004C97]" />
              Detalhe da Comparação do Campo
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreabilidade do campo, tabela SAP e regra aplicada.
            </DialogDescription>
          </DialogHeader>

          {selectedFieldForDetail && (
            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Grupo</span>
                  <span className="font-semibold text-slate-800">
                    {selectedFieldForDetail.group_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Subgrupo</span>
                  <span className="font-semibold text-slate-800">
                    {selectedFieldForDetail.subgroup_name || 'Geral'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-500 block">Campo / Tabela SAP</span>
                  <span className="font-semibold text-slate-800">
                    {selectedFieldForDetail.field_name} ({selectedFieldForDetail.sap_table_field})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Valor Código Modelo</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedFieldForDetail.model_value || '— (vazio)'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Valor Código Novo</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedFieldForDetail.new_value || '— (vazio)'}
                  </span>
                </div>
              </div>

              {selectedFieldForDetail.expected_parameter_value && (
                <div className="p-3 bg-blue-50/50 rounded border border-blue-200">
                  <span className="text-[10px] text-blue-700 block">
                    Parâmetro Esperado (Lógica Código)
                  </span>
                  <span className="font-mono font-bold text-blue-900">
                    {selectedFieldForDetail.expected_parameter_value}
                  </span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">Resultado:</span>
                  {selectedFieldForDetail.validation_result === 'NEUTRO' ||
                  selectedFieldForDetail.tipo_validacao === 'NEUTRO' ? (
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-300 font-semibold">
                      NEUTRO
                    </Badge>
                  ) : (
                    <Badge
                      className={
                        selectedFieldForDetail.validation_result === 'APROVADO'
                          ? 'bg-emerald-600 text-white'
                          : selectedFieldForDetail.validation_result === 'DIVERGENTE'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-400 text-white'
                      }
                    >
                      {selectedFieldForDetail.validation_result}
                    </Badge>
                  )}
                </div>

                {selectedFieldForDetail.validation_result === 'NEUTRO' ||
                selectedFieldForDetail.tipo_validacao === 'NEUTRO' ? (
                  <div className="p-2.5 rounded bg-sky-50 border border-sky-200 text-sky-900 text-xs mt-2 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-sky-800">
                      <Info className="w-3.5 h-3.5 text-sky-600" />
                      Somente visualização — campo não comparado
                    </div>
                    <p className="text-[11px] text-sky-800 leading-relaxed">
                      Este campo é classificado como <strong>NEUTRO</strong> na matriz funcional
                      ZVALIDA. Não gera bloqueio, não gera divergência e fica fora do percentual de
                      conformidade.
                    </p>
                  </div>
                ) : null}

                {selectedFieldForDetail.divergence_detail && (
                  <p className="text-slate-700 mt-1 font-medium">
                    {selectedFieldForDetail.divergence_detail}
                  </p>
                )}
                <div className="text-[10px] text-slate-400 pt-1">
                  Regra aplicada:{' '}
                  {selectedFieldForDetail.rule_applied ||
                    (selectedFieldForDetail.validation_result === 'NEUTRO'
                      ? 'Somente Leitura / Informativo'
                      : 'Comparação Modelo x Novo')}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button size="sm" variant="outline" onClick={() => setSelectedFieldForDetail(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NovaValidacaoTab
