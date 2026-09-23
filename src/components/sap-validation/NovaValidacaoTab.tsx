import React, { useState } from 'react'
import {
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Building,
  Info,
  Clock,
  ArrowRight,
  Database,
  ChevronDown,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  FcaIntegrationStatus,
  FieldComparisonItem,
  ModelVisualStatus,
  ModelWarning,
  OFFICIAL_VALIDATION_GROUPS,
  SapFetchedMaterialData,
  ValidationOverallStatus,
} from '@/types/sap-validation'
import { sapValidationService } from '@/services/sap-validation-service'

interface NovaValidacaoTabProps {
  fcaStatus: FcaIntegrationStatus | null
  onValidationSaved?: () => void
}

export const NovaValidacaoTab: React.FC<NovaValidacaoTabProps> = ({
  fcaStatus,
  onValidationSaved,
}) => {
  // Campos VERDES (editáveis manuais)
  const [materialNewCode, setMaterialNewCode] = useState('')
  const [materialModelCode, setMaterialModelCode] = useState('')

  // Estado de consulta SAP / FCA
  const [loadingSap, setLoadingSap] = useState(false)
  const [fcaErrorMessage, setFcaErrorMessage] = useState<string | null>(null)
  const [fcaErrorDetails, setFcaErrorDetails] = useState<string | null>(null)

  // Dados retornados do SAP para o Código Novo (amarelos)
  const [sapNewData, setSapNewData] = useState<SapFetchedMaterialData | null>(null)

  // Dados retornados do SAP para o Código Modelo (amarelos + movimentações)
  const [sapModelData, setSapModelData] = useState<SapFetchedMaterialData | null>(null)

  // Status e Validação do Modelo
  const [modelStatus, setModelStatus] = useState<ModelVisualStatus | null>(null)
  const [modelWarnings, setModelWarnings] = useState<ModelWarning[]>([])
  const [activeWarningPopup, setActiveWarningPopup] = useState<ModelWarning | null>(null)
  const [modelJustification, setModelJustification] = useState('')

  // Resultados da Validação / Matriz
  const [executingValidation, setExecutingValidation] = useState(false)
  const [validationRun, setValidationRun] = useState(false)
  const [overallStatus, setOverallStatus] =
    useState<ValidationOverallStatus>('AGUARDANDO_VALIDACAO')
  const [fieldResults, setFieldResults] = useState<FieldComparisonItem[]>([])
  const [filterDivergentOnly, setFilterDivergentOnly] = useState(false)
  const [selectedFieldForDetail, setSelectedFieldForDetail] = useState<FieldComparisonItem | null>(
    null,
  )

  // Histórico de reconsulta
  const [reconsultingSap, setReconsultingSap] = useState(false)
  const [reconsultHistory, setReconsultHistory] = useState<any[]>([])

  // Consulta do código novo no SAP
  const handleConsultNewCode = async () => {
    if (!materialNewCode.trim()) return
    setLoadingSap(true)
    setFcaErrorMessage(null)
    setFcaErrorDetails(null)

    const res = await sapValidationService.fetchMaterialFromSap(materialNewCode, false)
    setLoadingSap(false)

    if (!res.success) {
      setFcaErrorMessage(
        res.functional_message ||
          'Não foi possível consultar o SAP. A validação não foi executada.',
      )
      setFcaErrorDetails(res.message || null)
      setSapNewData(null)
      return
    }

    setSapNewData(res.data || null)
  }

  // Consulta do código modelo no SAP
  const handleConsultModelCode = async () => {
    if (!materialModelCode.trim()) return
    setLoadingSap(true)
    setFcaErrorMessage(null)
    setFcaErrorDetails(null)

    const res = await sapValidationService.fetchMaterialFromSap(materialModelCode, true)
    setLoadingSap(false)

    if (!res.success) {
      setFcaErrorMessage(
        res.functional_message ||
          'Não foi possível consultar o SAP. A validação não foi executada.',
      )
      setFcaErrorDetails(res.message || null)
      setSapModelData(null)
      return
    }

    setSapModelData(res.data || null)
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

    // Se houver advertências, abre o popup da primeira para confirmação do usuário
    if (evaluation.warnings.length > 0) {
      setActiveWarningPopup(evaluation.warnings[0])
    }
  }

  // Executar validação completa (Engine de comparação)
  const handleExecuteValidation = async () => {
    if (!materialNewCode.trim() || !materialModelCode.trim()) return

    // Se o modelo estiver Amarelo ou Vermelho, a justificativa é mandatória
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
    }
  }

  // Botão "Atualizar dados do SAP" (reconsulta + recalcula + preserva histórico)
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

  // Cálculo de KPIs de conformidade
  const totalAnalyzed = fieldResults.length
  const approvedCount = fieldResults.filter((f) => f.validation_result === 'APROVADO').length
  const divergentCount = fieldResults.filter((f) => f.validation_result === 'DIVERGENTE').length
  const naCount = fieldResults.filter((f) => f.validation_result === 'NAO_SE_APLICA').length
  const compliancePct =
    totalAnalyzed > 0
      ? Math.round(((totalAnalyzed - divergentCount) / totalAnalyzed) * 1000) / 10
      : 100

  const visibleFieldResults = filterDivergentOnly
    ? fieldResults.filter((f) => f.validation_result === 'DIVERGENTE')
    : fieldResults

  return (
    <div className="space-y-6">
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
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }
              >
                {fcaStatus?.fca_configured ? 'CONECTADO' : 'NÃO CONFIGURADO'}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-slate-700">
              {fcaStatus?.fca_configured
                ? `Integração FCA ativa. Endpoint: ${fcaStatus.fca_base_url}`
                : 'A integração SAP via FCA ainda não está configurada (credenciais/URL ausentes nos secrets). Quando solicitada a consulta, o sistema retornará a mensagem funcional padrão.'}
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
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                {fcaStatus?.matrix_loaded
                  ? `${fcaStatus.matrix_rules_count} REGRAS ATIVAS`
                  : 'AGUARDANDO IMPORTAÇÃO'}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {fcaStatus?.matrix_loaded
                ? 'Estrutura da matriz de campos e regras lida diretamente das tabelas do banco de dados.'
                : 'Matriz ZVALIDA não carregada — aguardando importação da matriz funcional pelo administrador. Toda a arquitetura e motor de comparação estão prontos.'}
            </p>
          </div>
        </div>
      </div>

      {/* Mensagem de Erro Funcional SAP se houver tentativa de consulta sem FCA */}
      {fcaErrorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">{fcaErrorMessage}</div>
              {fcaErrorDetails && (
                <div className="text-xs text-red-700 mt-0.5 font-mono">{fcaErrorDetails}</div>
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

      {/* FORMULÁRIO PRINCIPAL: Códigos e Dados Consultados */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#004C97]" />
            Parâmetros de Validação de Materiais
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* SEÇÃO DOS CÓDIGOS (VERDES - EDITÁVEIS MANUAIS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/40 p-4 rounded-lg border border-emerald-200">
            {/* Código Novo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  Código Novo (MARA-MATNR) *
                </Label>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                >
                  Manual / Editável
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 10002941"
                  value={materialNewCode}
                  onChange={(e) => setMaterialNewCode(e.target.value.toUpperCase())}
                  className="bg-white border-emerald-300 focus-visible:ring-emerald-500 font-mono text-sm font-semibold text-slate-800"
                />
                <Button
                  size="sm"
                  onClick={handleConsultNewCode}
                  disabled={loadingSap || !materialNewCode.trim()}
                  className="bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  Consultar SAP
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Informe o código SAP do material recém-criado a ser homologado.
              </p>
            </div>

            {/* Código Modelo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  Código Modelo (MARA-MATNR) *
                </Label>
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                >
                  Manual / Editável
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 10001872"
                  value={materialModelCode}
                  onChange={(e) => setMaterialModelCode(e.target.value.toUpperCase())}
                  className="bg-white border-emerald-300 focus-visible:ring-emerald-500 font-mono text-sm font-semibold text-slate-800"
                />
                <Button
                  size="sm"
                  onClick={handleConsultModelCode}
                  disabled={loadingSap || !materialModelCode.trim()}
                  className="bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  Consultar SAP
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleValidateModelCode}
                  disabled={!materialModelCode.trim()}
                  className="border-slate-300 hover:bg-slate-100 text-slate-700 shrink-0"
                >
                  Validar Modelo
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Código de referência homologado cujos parâmetros serão comparados.
              </p>
            </div>
          </div>

          {/* STATUS VISUAL DO CÓDIGO MODELO APÓS VERIFICAÇÕES */}
          {modelStatus && (
            <div
              className={`p-4 rounded-lg border text-sm flex items-start justify-between gap-4 ${
                modelStatus === 'VERDE'
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                  : modelStatus === 'AMARELO'
                    ? 'bg-amber-50/60 border-amber-300 text-amber-900'
                    : 'bg-red-50/60 border-red-300 text-red-900'
              }`}
            >
              <div className="space-y-1.5">
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
                  {sapNewData?.description || 'Aguardando consulta SAP...'}
                </div>
              </div>

              {/* Descrição Código Modelo */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5 col-span-2">
                <span className="text-[10px] text-slate-500 font-medium">
                  Descrição Código Modelo (MAKTX)
                </span>
                <div className="font-bold text-slate-800 truncate">
                  {sapModelData?.description || 'Aguardando consulta SAP...'}
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
            <div className="flex items-center justify-between">
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
                <div className="font-semibold text-slate-800 text-[11px]">
                  {sapModelData?.movements_summary?.last_stock_entry?.date || 'Sem movimentação'}
                </div>
              </div>

              {/* Consumo de Estoque */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Último Consumo (261)</span>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {sapModelData?.movements_summary?.last_stock_consumption?.date ||
                    'Sem movimentação'}
                </div>
              </div>

              {/* Movimento de Estoque */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Última Transf. (311/309)</span>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {sapModelData?.movements_summary?.last_stock_transfer?.date || 'Sem movimentação'}
                </div>
              </div>

              {/* Faturamento */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Último Faturamento (601)</span>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {sapModelData?.movements_summary?.last_invoicing?.date || 'Sem movimentação'}
                </div>
              </div>

              {/* Envio Industrialização */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Envio Industrializ. (541)</span>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {sapModelData?.movements_summary?.last_send_industrialization?.date ||
                    'Sem movimentação'}
                </div>
              </div>

              {/* Retorno Industrialização */}
              <div className="p-2.5 bg-white rounded border border-slate-200 space-y-0.5">
                <span className="text-[10px] text-slate-500">Retorno Industrializ. (121)</span>
                <div className="font-semibold text-slate-800 text-[11px]">
                  {sapModelData?.movements_summary?.last_return_industrialization?.date ||
                    'Sem movimentação'}
                </div>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO: COMPARAR E ATUALIZAR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExecuteValidation}
                disabled={
                  executingValidation || !materialNewCode.trim() || !materialModelCode.trim()
                }
                className="bg-[#004C97] hover:bg-[#003870] text-white gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {executingValidation ? 'Executando Análise...' : 'Executar Comparação de Cadastro'}
              </Button>

              <Button
                variant="outline"
                onClick={handleReconsultSap}
                disabled={reconsultingSap || !materialNewCode.trim()}
                className="border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Total Analisados */}
          <Card
            onClick={() => setFilterDivergentOnly(false)}
            className={`cursor-pointer transition-all border-slate-200 ${
              !filterDivergentOnly ? 'ring-2 ring-[#004C97]' : 'hover:border-slate-300'
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
          <Card className="border-emerald-200 bg-emerald-50/20">
            <CardContent className="p-3.5">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Aprovados</span>
              <div className="text-xl font-black text-emerald-700 mt-1">{approvedCount}</div>
              <span className="text-[10px] text-emerald-600">Conformes</span>
            </CardContent>
          </Card>

          {/* Divergentes (Clicável -> Filtra só divergentes) */}
          <Card
            onClick={() => setFilterDivergentOnly(!filterDivergentOnly)}
            className={`cursor-pointer transition-all border-red-200 bg-red-50/30 ${
              filterDivergentOnly ? 'ring-2 ring-red-600' : 'hover:border-red-300'
            }`}
          >
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-red-800">Divergentes</span>
                <Badge
                  variant="outline"
                  className="bg-red-100 text-red-800 text-[9px] border-red-300"
                >
                  {filterDivergentOnly ? 'Filtrado' : 'Filtrar'}
                </Badge>
              </div>
              <div className="text-xl font-black text-red-700 mt-1">{divergentCount}</div>
              <span className="text-[10px] text-red-600">Com divergência</span>
            </CardContent>
          </Card>

          {/* Não Aplicáveis */}
          <Card className="border-slate-200 bg-slate-50/50">
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
                {totalAnalyzed - divergentCount}/{totalAnalyzed} conformes
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MATRIZ DE COMPARAÇÃO EM ACCORDIONS POR GRUPO */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="bg-slate-50/70 border-b border-slate-200 py-3.5 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            Matriz de Comparação Estrutural SAP
          </CardTitle>
          {filterDivergentOnly && (
            <Badge className="bg-red-600 text-white text-xs">
              Exibindo apenas campos divergentes ({divergentCount})
            </Badge>
          )}
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
                de Cadastro&quot; para analisar os dados contra a arquitetura e matriz funcional.
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
                                  <ArrowRight className="w-3 h-3 text-slate-300" />
                                  <span>
                                    Novo: <strong>{item.new_value || '—'}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
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
                </div>
                {selectedFieldForDetail.divergence_detail && (
                  <p className="text-slate-700 mt-1 font-medium">
                    {selectedFieldForDetail.divergence_detail}
                  </p>
                )}
                <div className="text-[10px] text-slate-400 pt-1">
                  Regra aplicada:{' '}
                  {selectedFieldForDetail.rule_applied || 'Comparação Modelo x Novo'}
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
