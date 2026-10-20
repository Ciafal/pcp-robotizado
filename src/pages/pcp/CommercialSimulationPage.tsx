import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { formatNumberPtBr } from '../../lib/number-format'
import {
  SimulationFormData,
  SimulationResultBundle,
  CommercialSimulationRecord,
  CommercialPriority,
} from '../../types/pcp-commercial-simulation'
import { CommercialSimulationService } from '../../services/pcp-commercial-simulation-service'
import { CommercialSimulationDataService } from '../../services/pcp-commercial-simulation-data-service'
import { DelayedOrdersModal } from './DelayedOrdersModal'
import { GanttComparisonModal } from './GanttComparisonModal'
import { SubmitPcpModal } from './SubmitPcpModal'
import { SnapshotDetailModal } from './SnapshotDetailModal'
import { PcpDecisionModal } from './PcpDecisionModal'
import { useAuth } from '../../contexts/AuthContext'
import {
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  Eye,
  History,
  FileCheck2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Box,
  Truck,
  HelpCircle,
  XCircle,
} from 'lucide-react'

export const CommercialSimulationPage: React.FC = () => {
  const { user } = useAuth()
  const userRole = (user?.role || '').toUpperCase()
  const isPcpRole =
    userRole === 'PCP_PROGRAMMER' ||
    userRole === 'PCP_ADMIN' ||
    userRole === 'LINE_MANAGER' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'GESTOR' ||
    userRole === 'ADMIN'

  // Aba ativa: Simulação ou Histórico
  const [activeTab, setActiveTab] = useState<'simulation' | 'history'>('simulation')

  // Listas de apoio para autocomplete/select
  const [existingCustomers, setExistingCustomers] = useState<string[]>([])
  const [existingProducts, setExistingProducts] = useState<{ code: string; description: string }[]>(
    [],
  )
  const [loadingContext, setLoadingContext] = useState<boolean>(true)

  // Estado do Formulário
  const [formData, setFormData] = useState<SimulationFormData>({
    customer_name: '',
    customer_code: '',
    product_code: '',
    product_description: '',
    requested_quantity_tons: 25.0,
    unit_measure: 't',
    requested_deadline: '20/11/2026',
    order_or_opportunity: '',
    commercial_priority: 'NORMAL',
    notes: '',
  })

  // Estado de Processamento da Simulação
  const [isSimulating, setIsSimulating] = useState<boolean>(false)
  const [simulationResult, setSimulationResult] = useState<SimulationResultBundle | null>(null)
  const [savedRecord, setSavedRecord] = useState<CommercialSimulationRecord | null>(null)
  const [simulationCode, setSimulationCode] = useState<string | null>(null)
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Cenário selecionado na comparação (A, B ou C)
  const [selectedScenarioId, setSelectedScenarioId] = useState<'A' | 'B' | 'C'>('A')

  // Modais analíticos
  const [isDelayedOrdersModalOpen, setIsDelayedOrdersModalOpen] = useState<boolean>(false)
  const [isGanttModalOpen, setIsGanttModalOpen] = useState<boolean>(false)
  const [isSubmitPcpModalOpen, setIsSubmitPcpModalOpen] = useState<boolean>(false)
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState<boolean>(false)
  const [isPcpDecisionModalOpen, setIsPcpDecisionModalOpen] = useState<boolean>(false)

  // Histórico
  const [historyList, setHistoryList] = useState<CommercialSimulationRecord[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<CommercialSimulationRecord | null>(
    null,
  )
  const [historySnapshot, setHistorySnapshot] = useState<any | null>(null)
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

  // Carregar dados de contexto na inicialização
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingContext(true)
        const [custs, prods] = await Promise.all([
          CommercialSimulationDataService.getExistingCustomers(),
          CommercialSimulationDataService.getExistingProducts(),
        ])
        setExistingCustomers(custs)
        setExistingProducts(prods)

        // Se houver opções, inicializar com valor padrão seguro
        if (custs.length > 0 && !formData.customer_name) {
          setFormData((prev) => ({ ...prev, customer_name: custs[0] }))
        }
        if (prods.length > 0 && !formData.product_code) {
          setFormData((prev) => ({
            ...prev,
            product_code: prods[0].code,
            product_description: prods[0].description,
          }))
        }
      } catch (err) {
        console.error('Erro ao carregar contexto inicial:', err)
      } finally {
        setLoadingContext(false)
      }
    }
    loadData()
  }, [])

  // Carregar histórico quando seleciona a aba
  const loadHistory = async () => {
    try {
      setLoadingHistory(true)
      const list = await CommercialSimulationService.listSimulations()
      setHistoryList(list)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory()
    }
  }, [activeTab])

  // Manipulação de campos do formulário
  const handleProductSelect = (code: string) => {
    const prod = existingProducts.find((p) => p.code === code)
    setFormData((prev) => ({
      ...prev,
      product_code: code,
      product_description: prod ? prod.description : prev.product_description,
    }))
  }

  // Executar simulação de atendimento
  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !formData.customer_name ||
      !formData.product_code ||
      formData.requested_quantity_tons <= 0
    ) {
      setErrorMsg('Preencha Cliente, Produto e Quantidade válida (> 0).')
      return
    }

    try {
      setIsSimulating(true)
      setErrorMsg(null)
      setFeedbackSuccessMsg(null)

      // Execução matemática do motor
      const result = await CommercialSimulationService.runSimulation(formData)
      setSimulationResult(result)

      // Gravação no backend (gerando numeração SIM-XXXXXX/AAAA e snapshot imutável)
      const saved = await CommercialSimulationService.saveSimulationWithSnapshot(
        formData,
        result,
        user,
      )
      setSimulationCode(saved.simulation_code)
      setFeedbackSuccessMsg(
        `Simulação gerada e registrada com sucesso sob o código ${saved.simulation_code}.`,
      )
    } catch (err: any) {
      console.error('Erro na simulação:', err)
      setErrorMsg(err.message || 'Falha ao executar simulação comercial.')
    } finally {
      setIsSimulating(false)
    }
  }

  // Submeter para o PCP
  const handleConfirmSubmitPcp = async (chosenScenario: string, commercialNotes: string) => {
    if (!simulationResult) return
    const simCode = simulationCode || 'SIM-PENDENTE'
    let targetSimId = savedRecord?.id

    if (!targetSimId) {
      // Salva antes se ainda não tiver ID
      const saved = await CommercialSimulationService.saveSimulationWithSnapshot(
        formData,
        simulationResult,
        user,
      )
      targetSimId = saved.simulation_id
      setSimulationCode(saved.simulation_code)
    }

    await CommercialSimulationService.submitToPcp(targetSimId, chosenScenario, commercialNotes)
    setFeedbackSuccessMsg(
      `Simulação ${simulationCode || simCode} submetida com sucesso para avaliação do PCP.`,
    )
    loadHistory()
  }

  // Decisão do PCP
  const handlePcpDecision = async (
    decision: 'APROVADA_PCP' | 'REPROVADA_PCP' | 'SOLICITADO_AJUSTE_PCP',
    feedbackNotes: string,
  ) => {
    if (!selectedHistoryItem) return
    await CommercialSimulationService.decidePcpSimulation(
      selectedHistoryItem.id,
      decision,
      feedbackNotes,
    )
    setFeedbackSuccessMsg(
      `Decisão "${decision}" registrada com sucesso para ${selectedHistoryItem.simulation_code}.`,
    )
    loadHistory()
  }

  // Abrir detalhe do snapshot histórico
  const handleOpenSnapshot = async (item: CommercialSimulationRecord) => {
    setSelectedHistoryItem(item)
    try {
      const detail = await CommercialSimulationService.getSimulationDetail(item.id)
      setHistorySnapshot(detail.snapshot)
      setIsSnapshotModalOpen(true)
    } catch (err) {
      console.error('Erro ao abrir snapshot:', err)
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* 1. Header do Módulo com Identidade CIAFAL e Rótulo de Advertência */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Simulação Comercial
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                PCP Robotizado CIAFAL • Análise de viabilidade e impacto em capacidade/matéria-prima
              </p>
            </div>
          </div>
        </div>

        {/* RÓTULO PERMANENTE OBRIGATÓRIO */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs font-semibold shadow-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>SIMULAÇÃO — NÃO ALTERA A PROGRAMAÇÃO VIGENTE</span>
        </div>
      </div>

      {/* Tabs Principais: Nova Simulação / Histórico */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <TabsTrigger
            value="simulation"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Nova Simulação Comercial
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-2"
          >
            <History className="w-3.5 h-3.5" />
            Histórico de Simulações
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: NOVA SIMULAÇÃO */}
        <TabsContent value="simulation" className="space-y-6 mt-4">
          {/* Formulário "Nova Simulação Comercial" */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-600" />
                Parâmetros da Demanda Comercial Hipotética
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSimulate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Cliente (Obrigatório) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Cliente <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={formData.customer_name}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, customer_name: val }))
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Selecione o cliente cadastrado" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingCustomers.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantidade Solicitada (Obrigatório) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Quantidade Solicitada (t) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.requested_quantity_tons}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          requested_quantity_tons: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="Ex.: 25,0"
                      className="text-xs font-medium"
                      required
                    />
                  </div>

                  {/* Prazo Desejado (Obrigatório) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Prazo Desejado (dd/mm/aaaa) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={formData.requested_deadline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requested_deadline: e.target.value }))
                      }
                      placeholder="Ex.: 20/11/2026"
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Produto (Obrigatório) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Produto (Código / Descrição) <span className="text-rose-500">*</span>
                    </Label>
                    <Select value={formData.product_code} onValueChange={handleProductSelect}>
                      <SelectTrigger className="text-xs font-mono">
                        <SelectValue placeholder="Busque o material na base" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingProducts.map((p) => (
                          <SelectItem key={p.code} value={p.code} className="text-xs">
                            <span className="font-mono font-bold mr-2">{p.code}</span>
                            <span className="text-slate-500">{p.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pedido / Oportunidade (Opcional) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Pedido / Oportunidade (Opcional)
                    </Label>
                    <Input
                      type="text"
                      value={formData.order_or_opportunity}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, order_or_opportunity: e.target.value }))
                      }
                      placeholder="Nº Pedido, cotação ou CRM"
                      className="text-xs"
                    />
                  </div>

                  {/* Prioridade Comercial (Opcional) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Prioridade Comercial</span>
                      <span className="text-[10px] text-amber-600 font-normal">informativo</span>
                    </Label>
                    <Select
                      value={formData.commercial_priority}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          commercial_priority: val as CommercialPriority,
                        }))
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMAL" className="text-xs">
                          Normal
                        </SelectItem>
                        <SelectItem value="ALTA" className="text-xs">
                          Alta
                        </SelectItem>
                        <SelectItem value="ESTRATEGICA" className="text-xs">
                          Estratégica
                        </SelectItem>
                        <SelectItem value="URGENTE" className="text-xs">
                          Urgente
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Observações Comerciais (Campo Livre)
                  </Label>
                  <Textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Informações adicionais da negociação, particularidades do cliente, exigências de entrega..."
                    className="text-xs resize-none"
                  />
                </div>

                {/* Mensagens de Sucesso ou Erro */}
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {feedbackSuccessMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{feedbackSuccessMsg}</span>
                  </div>
                )}

                {/* Botão Principal SIMULAR ATENDIMENTO com proteção contra duplo clique */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSimulating}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-6 py-2.5 h-auto flex items-center gap-2 shadow-sm transition"
                  >
                    {isSimulating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Analisando programação, capacidade, matéria-prima e carteira...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        SIMULAR ATENDIMENTO
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Seção de Confiabilidade de Dados (Regra 20) */}
          {simulationResult && !simulationResult.dataReliability.is_complete && (
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">
                  Simulação incompleta — dado necessário não disponível
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
                  {simulationResult.dataReliability.missing_data_items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* PAINEL DE RESULTADOS DA SIMULAÇÃO */}
          {simulationResult && (
            <div className="space-y-6">
              {/* Barra de Ações Rápidas do Cenário */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Registro da Simulação:
                  </span>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700">
                    {simulationCode || 'SIM-PROVISÓRIA/2026'}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px]">
                    Cenário Selecionado: {selectedScenarioId}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGanttModalOpen(true)}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Visualizar na Programação (Gantt)
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsSubmitPcpModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar para Análise do PCP
                  </Button>
                </div>
              </div>

              {/* 5. Painel "Resultado da Simulação" com Cards Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Viabilidade */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">Viabilidade Técnica</span>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.kpis.viability_label}
                      </span>
                      <Badge
                        className={`text-[10px] font-bold ${
                          simulationResult.kpis.viability === 'VIAVEL'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : simulationResult.kpis.viability === 'VIAVEL_COM_AJUSTE'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : simulationResult.kpis.viability === 'PARCIALMENTE_VIAVEL'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {simulationResult.kpis.viability}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Avaliação multifatorial de linha e insumos
                    </span>
                  </CardContent>
                </Card>

                {/* Card 2: Melhor Data Possível */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">Melhor Data Possível</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.kpis.best_date_possible}
                      </span>
                      <span className="text-xs font-semibold text-amber-600">
                        {simulationResult.kpis.difference_days > 0
                          ? `+${simulationResult.kpis.difference_days} dias`
                          : 'No prazo'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Prazo solicitado: {simulationResult.kpis.requested_deadline}
                    </span>
                  </CardContent>
                </Card>

                {/* Card 3: Quantidade Possível no Prazo */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">Atendimento no Prazo</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {formatNumberPtBr(
                          simulationResult.kpis.quantity_possible_requested_date,
                          1,
                        )}{' '}
                        t
                      </span>
                      <span className="text-xs text-slate-500">
                        de {formatNumberPtBr(simulationResult.kpis.quantity_requested, 1)} t
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 block mt-1">
                      {simulationResult.kpis.quantity_possible_requested_pct}% do lote solicitado
                    </span>
                  </CardContent>
                </Card>

                {/* Card 4: Quantidade Total Possível */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Quantidade Total Possível
                    </span>
                    <div className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                      {formatNumberPtBr(simulationResult.kpis.quantity_total_possible, 1)} t
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      100% disponível em {simulationResult.kpis.date_total_quantity_available}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* Linha 2 de Cards Analíticos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Matéria-Prima */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">Matéria-Prima</span>
                    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {simulationResult.kpis.raw_material_label}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Cruzamento com saldo real do pátio
                    </span>
                  </CardContent>
                </Card>

                {/* Impacto na Capacidade */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Impacto na Capacidade
                    </span>
                    <div className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {simulationResult.kpis.capacity_impact_text}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Semana da simulação em linha
                    </span>
                  </CardContent>
                </Card>

                {/* Alteração da Programação */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardContent className="p-4">
                    <span className="text-xs font-medium text-slate-500">
                      Alteração da Programação
                    </span>
                    <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                      {simulationResult.kpis.schedule_change_label}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Severidade de impacto na fábrica
                    </span>
                  </CardContent>
                </Card>

                {/* Pedidos Impactados (CARD CLICÁVEL) */}
                <Card
                  onClick={() => setIsDelayedOrdersModalOpen(true)}
                  className="border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-400 hover:shadow-md transition bg-amber-50/20"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Pedidos Impactados
                      </span>
                      <ChevronRight className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-900 dark:text-amber-200">
                      {simulationResult.kpis.impacted_orders_count} pedidos
                    </div>
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 block mt-1 underline">
                      {simulationResult.kpis.delayed_orders_count} com risco de atraso • Clique para
                      abrir
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* 14. SEÇÃO "Resposta Comercial" — Resumo Executivo */}
              <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
                <CardHeader className="border-b border-blue-100 dark:border-blue-900/40 pb-3">
                  <CardTitle className="text-sm font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-blue-600" />
                    Resposta Comercial Executiva CIAFAL
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs leading-relaxed">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block">Diagnóstico de Viabilidade:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {simulationResult.commercialResponse.viability_label} — Melhor data para
                        atendimento integral:{' '}
                        <strong>{simulationResult.commercialResponse.best_date}</strong>.
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Status da Matéria-Prima:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {simulationResult.commercialResponse.raw_material_summary}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200/80 dark:border-blue-800/60">
                    <span className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                      Recomendação Estratégica da IA para a Negociação:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {simulationResult.commercialResponse.executive_recommendation}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 13. COMPARAÇÃO DE CENÁRIOS — Até 3 Alternativas da IA */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Comparação de Cenários Gerados pela IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">
                            Critério / Métrica
                          </TableHead>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableHead
                              key={sc.scenario_id}
                              className="text-xs font-semibold text-center"
                            >
                              <div>{sc.title}</div>
                              <span className="text-[10px] font-normal text-slate-500">
                                {sc.criteria_highlight}
                              </span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Data de Entrega Prometida
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell
                              key={sc.scenario_id}
                              className="text-center font-bold text-slate-900 dark:text-slate-100"
                            >
                              {sc.delivery_date}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Quantidade Atendida
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center font-semibold">
                              {formatNumberPtBr(sc.quantity_tons, 1)} t
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Pedidos Impactados
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              {sc.impacted_orders_count} ordens
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Atrasos Gerados na Carteira
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              {sc.delayed_orders_count > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-rose-700 border-rose-300 text-[10px]"
                                >
                                  {sc.delayed_orders_count} pedidos atrasados
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-emerald-700 border-emerald-300 text-[10px]"
                                >
                                  Zero atrasos
                                </Badge>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Setup Adicional Estimado
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              {sc.additional_setup_minutes} min
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Ocupação da Capacidade
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center font-mono">
                              {formatNumberPtBr(sc.capacity_utilization_pct, 1)}%
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Resumo da IA
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell
                              key={sc.scenario_id}
                              className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed"
                            >
                              {sc.ai_summary}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600 dark:text-slate-400">
                            Ação
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  selectedScenarioId === sc.scenario_id ? 'default' : 'outline'
                                }
                                onClick={() => setSelectedScenarioId(sc.scenario_id)}
                                className="text-xs px-2.5 py-1 h-auto"
                              >
                                {selectedScenarioId === sc.scenario_id
                                  ? 'Selecionado'
                                  : 'Selecionar'}
                              </Button>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* 6. SEÇÃO "Onde este pedido poderia ser produzido?" */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Onde este pedido poderia ser produzido? (Centros Compatíveis)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Centro</TableHead>
                          <TableHead className="text-xs font-semibold">Linha</TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Data Início Possível
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Data Fim Possível
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Tempo Necessário
                          </TableHead>
                          <TableHead className="text-xs font-semibold">
                            Situação / Restrições Técnicas
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {simulationResult.productionCenters.map((c, idx) => (
                          <TableRow
                            key={idx}
                            className={
                              c.is_best_alternative ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                            }
                          >
                            <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {c.center_code}
                            </TableCell>
                            <TableCell>{c.line_name}</TableCell>
                            <TableCell className="text-center text-slate-600 dark:text-slate-400">
                              {c.possible_start_date}
                            </TableCell>
                            <TableCell className="text-center text-slate-600 dark:text-slate-400">
                              {c.possible_end_date}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatNumberPtBr(c.required_hours, 1)} h
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {c.is_best_alternative && (
                                  <Badge className="bg-blue-600 text-white text-[10px]">
                                    Melhor alternativa
                                  </Badge>
                                )}
                                <span className="text-slate-600 dark:text-slate-400">
                                  {c.situation}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* 10. SEÇÃO "Análise de Matéria-Prima" */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Análise de Matéria-Prima Real
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Matéria-Prima</TableHead>
                          <TableHead className="text-xs font-semibold text-right">
                            Necessária
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-right">
                            Disponível PCP
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-right">
                            Comprometida
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-right">
                            Saldo após Simulação
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Entrada Prevista
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Situação
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {simulationResult.rawMaterialAnalysis.map((mp, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {mp.raw_material_code}
                              </div>
                              <div className="text-[11px] text-slate-400">{mp.description}</div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatNumberPtBr(mp.required_tons, 1)} t
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatNumberPtBr(mp.available_pcp_tons, 1)} t
                            </TableCell>
                            <TableCell className="text-right text-slate-500">
                              {formatNumberPtBr(mp.reserved_tons, 1)} t
                            </TableCell>
                            <TableCell
                              className={`text-right font-bold ${
                                mp.balance_after_simulation_tons < 0
                                  ? 'text-rose-600'
                                  : 'text-emerald-600'
                              }`}
                            >
                              {formatNumberPtBr(mp.balance_after_simulation_tons, 1)} t
                            </TableCell>
                            <TableCell className="text-center text-slate-600 dark:text-slate-400">
                              {mp.expected_arrival_date ? (
                                <div>
                                  <div className="font-medium">{mp.expected_arrival_date}</div>
                                  <div className="text-[10px] text-slate-400">
                                    ({mp.purchase_order})
                                  </div>
                                </div>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  mp.situation === 'MP DISPONÍVEL'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : mp.situation === 'PARCIAL'
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                {mp.situation}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* 7 & 8. SEÇÕES de Impacto na Sequência Atual e nas Datas de Entrega */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 7. Impacto na Sequência Atual */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Impacto na Sequência Atual (Efeito em Cadeia)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                          <TableRow>
                            <TableHead className="text-xs">Seq.</TableHead>
                            <TableHead className="text-xs">Produto / OP</TableHead>
                            <TableHead className="text-xs">Data Atual</TableHead>
                            <TableHead className="text-xs">Nova Data</TableHead>
                            <TableHead className="text-xs text-center">Deslocamento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {simulationResult.sequenceImpact.map((imp, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono font-bold">
                                {imp.current_sequence}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {imp.product_code}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {imp.customer_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-500">{imp.current_date}</TableCell>
                              <TableCell className="font-medium text-slate-800 dark:text-slate-200">
                                {imp.simulated_new_date}
                              </TableCell>
                              <TableCell className="text-center font-bold text-amber-700 dark:text-amber-400">
                                +{imp.displacement_days} d
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* 8. Impacto nas Datas de Entrega */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Impacto nas Datas de Entrega da Carteira
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                          <TableRow>
                            <TableHead className="text-xs">Pedido</TableHead>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs">Data Atual</TableHead>
                            <TableHead className="text-xs">Nova Data</TableHead>
                            <TableHead className="text-xs text-center">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {simulationResult.deliveryImpact.map((d, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs">{d.sales_order}</TableCell>
                              <TableCell className="text-xs">{d.customer_name}</TableCell>
                              <TableCell className="text-xs text-slate-500">
                                {d.current_promised_date}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {d.simulated_delivery_date}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-semibold ${
                                    d.is_delayed
                                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                                      : 'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {d.classification}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 11 & 12. SEÇÃO de Capacidade & Setup e Sequenciamento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 11. Capacidade por Centro */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Ocupação de Capacidade por Linha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {simulationResult.capacityImpact.map((cap, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {cap.center_code} ({cap.center_name}) — {cap.period_label}
                          </span>
                          <Badge
                            className={
                              cap.is_critical
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }
                          >
                            {formatNumberPtBr(cap.utilization_pct_simulated, 1)}% Utilização
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-500">
                          <div>
                            Disponível:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {cap.total_available_hours} h
                            </strong>
                          </div>
                          <div>
                            Antes:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {cap.current_programmed_hours} h
                            </strong>
                          </div>
                          <div>
                            Simulado:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {formatNumberPtBr(cap.simulated_total_hours, 1)} h
                            </strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 12. Setup e Sequenciamento */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Análise de Setup e Sequenciamento Mecânico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2 text-xs leading-relaxed">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Setup Adicional Estimado:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {simulationResult.setupSequencing.additional_setup_minutes} min
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 font-medium">Motivo do Acerto:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {simulationResult.setupSequencing.setup_reason}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Parecer Técnico de Sequenciamento:
                      </span>
                      <p className="text-slate-600 dark:text-slate-400">
                        {simulationResult.setupSequencing.technical_recommendation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 20. REGRA DE CONFIABILIDADE — Separação Rigorosa dos 3 Níveis */}
              <Card className="border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-800 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Auditoria e Confiabilidade da Resposta (Regra CIAFAL de Três Níveis)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Nível 1: Dado Confirmado */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                      1. Dado Confirmado (Sistema Real)
                    </span>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                      {simulationResult.dataReliability.confirmed_data.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Nível 2: Cálculo da Simulação */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-blue-700 dark:text-blue-400 block">
                      2. Cálculo da Simulação (Matemático)
                    </span>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                      {simulationResult.dataReliability.calculated_simulations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Nível 3: Recomendação da IA */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="font-bold text-indigo-700 dark:text-indigo-400 block">
                      3. Recomendação da IA (Interpretação)
                    </span>
                    <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 space-y-0.5 text-[11px]">
                      {simulationResult.dataReliability.ai_recommendations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ABA 2: HISTÓRICO DE SIMULAÇÕES COM SNAPSHOT IMUTÁVEL */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  Histórico de Simulações Comerciais
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registros com snapshots imutáveis salvos e rastreabilidade da decisão
                  comercial/PCP.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadHistory}
                disabled={loadingHistory}
                className="text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Simulação</TableHead>
                      <TableHead className="text-xs font-semibold">Data Registro</TableHead>
                      <TableHead className="text-xs font-semibold">Comercial</TableHead>
                      <TableHead className="text-xs font-semibold">Cliente</TableHead>
                      <TableHead className="text-xs font-semibold">Produto</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Quantidade</TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Prazo Desejado
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Melhor Data
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Viabilidade
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Status PCP
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {historyList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                          {loadingHistory
                            ? 'Carregando histórico de simulações...'
                            : 'Nenhuma simulação comercial registrada no banco até o momento.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyList.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <TableCell className="font-mono font-bold text-blue-700 dark:text-blue-400">
                            {item.simulation_code}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {new Date(item.created).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                            {item.created_by_name || 'Comercial'}
                          </TableCell>
                          <TableCell className="font-medium">{item.customer_name}</TableCell>
                          <TableCell className="font-mono">{item.product_code}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatNumberPtBr(item.requested_quantity_tons, 1)} t
                          </TableCell>
                          <TableCell className="text-center text-slate-500">
                            {item.requested_deadline}
                          </TableCell>
                          <TableCell className="text-center font-bold text-emerald-600">
                            {item.best_date_possible}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[10px]">
                              {item.viability}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`text-[10px] ${
                                item.approval_status === 'APROVADA_PCP'
                                  ? 'bg-emerald-600 text-white'
                                  : item.approval_status === 'REPROVADA_PCP'
                                    ? 'bg-rose-600 text-white'
                                    : item.approval_status === 'SOLICITADO_AJUSTE_PCP'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {item.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Visualizar Snapshot */}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSnapshot(item)}
                                className="h-7 px-2 text-[11px] flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3 text-blue-600" />
                                Snapshot
                              </Button>

                              {/* Ação do PCP (Somente se for papel PCP) */}
                              {isPcpRole && item.approval_status === 'AGUARDANDO_ANALISE_PCP' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedHistoryItem(item)
                                    setIsPcpDecisionModalOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  Decidir
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Pedidos Potencialmente Atrasados (Card Clicável) */}
      {simulationResult && (
        <DelayedOrdersModal
          isOpen={isDelayedOrdersModalOpen}
          onClose={() => setIsDelayedOrdersModalOpen(false)}
          delayedOrders={simulationResult.delayedOrders}
          totalDelayedTonnage={simulationResult.kpis.delayed_tonnage}
          aiExplanation={simulationResult.aiExplanation}
        />
      )}

      {/* MODAL 2: Visualização Gantt Comparativa */}
      {simulationResult && (
        <GanttComparisonModal
          isOpen={isGanttModalOpen}
          onClose={() => setIsGanttModalOpen(false)}
          items={simulationResult.ganttComparison}
          productCode={formData.product_code}
          customerName={formData.customer_name}
        />
      )}

      {/* MODAL 3: Enviar para Análise do PCP */}
      {simulationResult && (
        <SubmitPcpModal
          isOpen={isSubmitPcpModalOpen}
          onClose={() => setIsSubmitPcpModalOpen(false)}
          simulationCode={simulationCode || undefined}
          customerName={formData.customer_name}
          productCode={formData.product_code}
          productDescription={formData.product_description}
          requestedQuantity={formData.requested_quantity_tons}
          requestedDeadline={formData.requested_deadline}
          resultBundle={simulationResult}
          onSubmit={handleConfirmSubmitPcp}
        />
      )}

      {/* MODAL 4: Detalhe do Snapshot Imutável */}
      <SnapshotDetailModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
        simulation={selectedHistoryItem}
        snapshot={historySnapshot}
      />

      {/* MODAL 5: Parecer e Decisão do PCP */}
      <PcpDecisionModal
        isOpen={isPcpDecisionModalOpen}
        onClose={() => setIsPcpDecisionModalOpen(false)}
        simulation={selectedHistoryItem}
        onDecide={handlePcpDecision}
      />
    </div>
  )
}
export default CommercialSimulationPage
