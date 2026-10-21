import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatNumberPtBr } from '@/lib/number-format'
import {
  SimulationFormData,
  SimulationResultBundle,
  CommercialSimulationRecord,
  CommercialPriority,
  SimulationType,
} from '@/types/pcp-commercial-simulation'
import { CommercialSimulationService } from '@/services/pcp-commercial-simulation-service'
import { CommercialSimulationDataService } from '@/services/pcp-commercial-simulation-data-service'
import { DelayedOrdersModal } from '@/components/pcp-simulation/DelayedOrdersModal'
import { GanttComparisonModal } from '@/components/pcp-simulation/GanttComparisonModal'
import { SubmitPcpModal } from '@/components/pcp-simulation/SubmitPcpModal'
import { SnapshotDetailModal } from '@/components/pcp-simulation/SnapshotDetailModal'
import { PcpDecisionModal } from '@/components/pcp-simulation/PcpDecisionModal'
import { useAuth } from '@/contexts/AuthContext'
import {
  Sparkles,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldAlert,
  Send,
  Eye,
  History,
  FileCheck2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  Box,
  Building2,
  Factory,
  Cpu,
  BarChart3,
  CalendarRange,
} from 'lucide-react'

export const CommercialSimulationPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const userRole = (user?.role || '').toUpperCase()
  const isPcpRole =
    userRole === 'PCP_PROGRAMMER' ||
    userRole === 'PCP_ADMIN' ||
    userRole === 'LINE_MANAGER' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'GESTOR' ||
    userRole === 'ADMIN'

  // 3 abas principais: 'new' | 'results' | 'history'
  const [activeTab, setActiveTab] = useState<'new' | 'results' | 'history'>('new')

  // Listas de apoio para autocomplete/select
  const [existingCustomers, setExistingCustomers] = useState<string[]>([])
  const [existingProducts, setExistingProducts] = useState<{ code: string; description: string }[]>(
    [],
  )
  const [availableLines, setAvailableLines] = useState<
    { code: string; name: string; plant_code?: string; company_code?: string }[]
  >([])
  const [availableCenters, setAvailableCenters] = useState<
    { code: string; name: string; line_code?: string }[]
  >([])
  const [loadingContext, setLoadingContext] = useState<boolean>(true)

  // Estado do Formulário
  const [formData, setFormData] = useState<SimulationFormData>({
    company_code: 'CIAFAL',
    plant_code: searchParams.get('planta') || 'DIV',
    line_code: searchParams.get('linha') || 'L1',
    production_center: 'L1',
    simulation_type: 'COMERCIAL',
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
        const [custs, prods, infra] = await Promise.all([
          CommercialSimulationDataService.getExistingCustomers(),
          CommercialSimulationDataService.getExistingProducts(),
          CommercialSimulationDataService.getCompatibleInfrastructure(),
        ])
        setExistingCustomers(custs)
        setExistingProducts(prods)
        setAvailableLines(infra.lines)
        setAvailableCenters(infra.centers)

        // Se houver opções, inicializar com valor padrão seguro
        setFormData((prev) => {
          const plantParam = searchParams.get('planta')
          const lineParam = searchParams.get('linha')
          const chosenPlant = plantParam || prev.plant_code || 'DIV'
          const chosenLine = lineParam || prev.line_code || (infra.lines[0]?.code ?? 'L1')
          const matchingCenter =
            infra.centers.find((c) => c.line_code === chosenLine)?.code ||
            infra.centers[0]?.code ||
            'L1'

          return {
            ...prev,
            plant_code: chosenPlant,
            line_code: chosenLine,
            production_center: matchingCenter,
            customer_name: prev.customer_name || custs[0] || 'ABC Ltda.',
            product_code: prev.product_code || prods[0]?.code || 'TR-60x30x2.0',
            product_description:
              prev.product_description || prods[0]?.description || 'Tubo Retangular 60x30x2.0mm',
          }
        })
      } catch (err) {
        console.error('Erro ao carregar contexto inicial de infraestrutura:', err)
      } finally {
        setLoadingContext(false)
      }
    }
    loadData()
  }, [searchParams])

  // Filtrar centros compatíveis conforme linha selecionada
  const filteredCenters = availableCenters.filter(
    (c) => !c.line_code || c.line_code === formData.line_code,
  )

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
      !formData.product_code ||
      !formData.requested_deadline ||
      !formData.requested_quantity_tons ||
      formData.requested_quantity_tons <= 0
    ) {
      setErrorMsg('Campos obrigatórios: Produto (SAP), Quantidade (> 0) e Prazo desejado.')
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
      // Direciona automaticamente para aba de Resultados e Cenários
      setActiveTab('results')
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
      {/* 1. Header do Módulo com Identidade CIAFAL e Banner Obrigatório */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#004C97] text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Simulações do PCP
              </h1>
              <p className="text-xs text-slate-600">
                HUB CIAFAL • Simulação comercial e produtiva sem alteração da programação vigente
                oficial
              </p>
            </div>
          </div>
        </div>

        {/* BANNER OBRIGATÓRIO PERMANENTE */}
        <div
          data-testid="banner-simulacao-aviso"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs"
        >
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>SIMULAÇÃO — NÃO ALTERA A PROGRAMAÇÃO VIGENTE</span>
        </div>
      </div>

      {/* Tabs Principais: 3 ABAS SOLICITADAS */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger
            value="new"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Nova Simulação
          </TabsTrigger>
          <TabsTrigger
            value="results"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-2xs"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Resultados e Cenários
            {simulationResult && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-2xs"
          >
            <History className="w-3.5 h-3.5" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* ABA 1: NOVA SIMULAÇÃO                                          */}
        {/* ============================================================== */}
        <TabsContent value="new" className="space-y-6 mt-4">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-4 h-4 text-[#004C97]" />
                Parâmetros da Demanda Hipotética (Comercial / Produtiva)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSimulate} className="space-y-4">
                {/* Linha 1: Empresa, Planta, Linha, Centro Produtivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-slate-50/60 rounded-lg border border-slate-200">
                  {/* Empresa */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-[#004C97]" />
                      Empresa
                    </Label>
                    <Select
                      value={formData.company_code}
                      onValueChange={(val) => setFormData((p) => ({ ...p, company_code: val }))}
                    >
                      <SelectTrigger className="text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CIAFAL" className="text-xs">
                          CIAFAL (0100)
                        </SelectItem>
                        <SelectItem value="CIAFAL_CORTE" className="text-xs">
                          CIAFAL Corte & Dobra (0200)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Planta */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Factory className="w-3.5 h-3.5 text-[#004C97]" />
                      Planta
                    </Label>
                    <Select
                      value={formData.plant_code}
                      onValueChange={(val) => setFormData((p) => ({ ...p, plant_code: val }))}
                    >
                      <SelectTrigger className="text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIV" className="text-xs">
                          Divinópolis (DIV)
                        </SelectItem>
                        <SelectItem value="CTG" className="text-xs">
                          Contagem (CTG)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Linha compatível */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#004C97]" />
                      Linha de Produção
                    </Label>
                    <Select
                      value={formData.line_code}
                      onValueChange={(val) => {
                        const matchingCenter =
                          availableCenters.find((c) => c.line_code === val)?.code || val
                        setFormData((p) => ({
                          ...p,
                          line_code: val,
                          production_center: matchingCenter,
                        }))
                      }}
                    >
                      <SelectTrigger className="text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLines.map((l) => (
                          <SelectItem key={l.code} value={l.code} className="text-xs">
                            {l.code} - {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Centro Produtivo */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-[#004C97]" />
                      Centro Produtivo
                    </Label>
                    <Select
                      value={formData.production_center}
                      onValueChange={(val) =>
                        setFormData((p) => ({ ...p, production_center: val }))
                      }
                    >
                      <SelectTrigger className="text-xs bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCenters.map((c) => (
                          <SelectItem key={c.code} value={c.code} className="text-xs">
                            {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Linha 2: Tipo de Simulação, Cliente, Produto */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Tipo de Simulação */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Tipo de Simulação
                    </Label>
                    <Select
                      value={formData.simulation_type || 'COMERCIAL'}
                      onValueChange={(val) =>
                        setFormData((p) => ({ ...p, simulation_type: val as SimulationType }))
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMERCIAL" className="text-xs">
                          Comercial (Atendimento a Pedido)
                        </SelectItem>
                        <SelectItem value="PRODUTIVA" className="text-xs">
                          Produtiva (Capacidade / Inserção PCP)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Cliente */}
                  <div className="space-y-1.5 md:col-span-3">
                    <Label className="text-xs font-semibold text-slate-700">Cliente</Label>
                    <Select
                      value={formData.customer_name}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, customer_name: val }))
                      }
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Selecione o cliente" />
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
                </div>

                {/* Linha 3: Produto SAP, Quantidade, Prazo Desejado */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Produto SAP (Obrigatório) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-900">
                      Produto (Código SAP + Descrição) <span className="text-rose-500">*</span>
                    </Label>
                    <Select value={formData.product_code} onValueChange={handleProductSelect}>
                      <SelectTrigger className="text-xs font-mono">
                        <SelectValue placeholder="Busque o código SAP ou perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingProducts.map((p) => (
                          <SelectItem key={p.code} value={p.code} className="text-xs">
                            <span className="font-mono font-bold mr-2 text-[#004C97]">
                              {p.code}
                            </span>
                            <span className="text-slate-600">{p.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantidade Solicitada (Obrigatório) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-900">
                      Quantidade (t) <span className="text-rose-500">*</span>
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
                      className="text-xs font-semibold"
                      required
                    />
                  </div>

                  {/* Prazo Desejado (Obrigatório) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-900">
                      Prazo Desejado (dd/mm/aaaa) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      value={formData.requested_deadline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, requested_deadline: e.target.value }))
                      }
                      placeholder="dd/mm/aaaa"
                      className="text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Linha 4: Pedido / Oportunidade, Prioridade Comercial */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-medium text-slate-600">
                      Nº Pedido / Cotação / Oportunidade CRM (Opcional)
                    </Label>
                    <Input
                      type="text"
                      value={formData.order_or_opportunity}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, order_or_opportunity: e.target.value }))
                      }
                      placeholder="Nº Pedido SAP, cotação ou CRM"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-medium text-slate-600 flex items-center justify-between">
                      <span>Prioridade</span>
                      <span className="text-[10px] text-amber-700 font-semibold">
                        (Apenas informativa)
                      </span>
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
                  <Label className="text-xs font-medium text-slate-600">Observações Livres</Label>
                  <Textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Particularidades da entrega, restrições do cliente ou notas técnicas para a programação..."
                    className="text-xs resize-none"
                  />
                </div>

                {/* Mensagens de Feedback */}
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
                    className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs px-6 py-2.5 h-auto flex items-center gap-2 shadow-2xs transition"
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
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 2: RESULTADOS E CENÁRIOS                                   */}
        {/* ============================================================== */}
        <TabsContent value="results" className="space-y-6 mt-4">
          {!simulationResult ? (
            <Card className="border-slate-200 bg-slate-50/50 p-8 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  Nenhuma simulação calculada ainda nesta sessão
                </h3>
                <p className="text-xs text-slate-500">
                  Preencha os parâmetros na aba &ldquo;Nova Simulação&rdquo; e clique em
                  &ldquo;SIMULAR ATENDIMENTO&rdquo; para visualizar a viabilidade, impacto e
                  cenários.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('new')}
                  className="text-xs border-[#004C97] text-[#004C97]"
                >
                  Ir para Nova Simulação
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Barra de Rastreabilidade e Ações */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Simulação:
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-xs font-bold text-[#004C97] border-[#004C97]/30 bg-blue-50/50"
                  >
                    {simulationCode || 'SIM-PROVISÓRIA/2026'}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[11px]">
                    Cenário Selecionado: {selectedScenarioId}
                  </Badge>
                  <span className="text-xs text-slate-500 font-mono">
                    Linha: <strong>{formData.line_code}</strong> • Centro:{' '}
                    <strong>{formData.production_center}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGanttModalOpen(true)}
                    className="text-xs flex items-center gap-1.5 border-slate-300"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                    Gantt Comparativo (Vigente × Simulado)
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsSubmitPcpModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5 shadow-2xs font-semibold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar ao PCP
                  </Button>
                </div>
              </div>

              {/* Advertência de dado incompleto quando faltar dado obrigatório */}
              {!simulationResult.dataReliability.is_complete && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">
                      Simulação incompleta — dado necessário não disponível
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                      {simulationResult.dataReliability.missing_data_items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* CARDS PRINCIPAIS DE RESULTADOS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Viabilidade */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">Viabilidade</span>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900">
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
                      Resultado multifatorial do motor determinístico
                    </span>
                  </CardContent>
                </Card>

                {/* Card 2: Melhor Data Possível */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Melhor Data Possível
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
                        {simulationResult.kpis.best_date_possible}
                      </span>
                      <span className="text-xs font-semibold text-amber-600">
                        {simulationResult.kpis.difference_days > 0
                          ? `Diferença: +${simulationResult.kpis.difference_days} dias`
                          : 'No prazo'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Prazo solicitado: {simulationResult.kpis.requested_deadline}
                    </span>
                  </CardContent>
                </Card>

                {/* Card 3: Quantidade Possível no Prazo */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Atendimento no Prazo
                    </span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-slate-900">
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
                    <span className="text-[11px] font-bold text-[#004C97] block mt-1">
                      {formatNumberPtBr(simulationResult.kpis.quantity_possible_requested_pct, 1)}%
                      do lote no prazo
                    </span>
                  </CardContent>
                </Card>

                {/* Card 4: Quantidade Total Possível */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Quantidade Total Possível
                    </span>
                    <div className="mt-1 text-xl font-bold text-slate-900">
                      {formatNumberPtBr(simulationResult.kpis.quantity_total_possible, 1)} t
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      100% em {simulationResult.kpis.date_total_quantity_available}
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* LINHA 2 DE CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Matéria-Prima */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">Matéria-Prima</span>
                    <div className="mt-1 text-sm font-bold text-slate-800">
                      {simulationResult.kpis.raw_material_label}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Cruzamento com saldo real do pátio
                    </span>
                  </CardContent>
                </Card>

                {/* Capacidade */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Capacidade na Linha
                    </span>
                    <div className="mt-1 text-xs font-bold text-slate-800">
                      {simulationResult.kpis.capacity_impact_text}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Semana da simulação
                    </span>
                  </CardContent>
                </Card>

                {/* Impacto na Programação */}
                <Card className="border-slate-200">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500">
                      Impacto na Programação
                    </span>
                    <div className="mt-1 text-sm font-bold text-slate-800">
                      {simulationResult.kpis.schedule_change_label}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Severidade operacional
                    </span>
                  </CardContent>
                </Card>

                {/* Pedidos Potencialmente Atrasados (CARD CLICÁVEL) */}
                <Card
                  onClick={() => setIsDelayedOrdersModalOpen(true)}
                  className="border-slate-200 cursor-pointer hover:border-amber-400 hover:shadow-md transition bg-amber-50/30"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800">Pedidos Atrasados</span>
                      <ChevronRight className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="mt-1 text-xl font-bold text-amber-900">
                      {simulationResult.kpis.delayed_orders_count} pedidos
                    </div>
                    <span className="text-[11px] text-amber-700 block mt-1 underline">
                      {formatNumberPtBr(simulationResult.kpis.delayed_tonnage, 1)} t em risco • Ver
                      detalhes
                    </span>
                  </CardContent>
                </Card>
              </div>

              {/* COMPARAÇÃO DE CENÁRIOS: A Menor impacto / B Menor prazo / C Melhor eficiência */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#004C97]" />
                    Comparação de Cenários (A Menor impacto / B Menor prazo / C Melhor eficiência)
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGanttModalOpen(true)}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#004C97]" />
                    Gantt Comparativo
                  </Button>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Critério</TableHead>
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
                          <TableCell className="font-medium text-slate-600">
                            Data de Entrega
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell
                              key={sc.scenario_id}
                              className="text-center font-bold text-slate-900"
                            >
                              {sc.delivery_date}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">Quantidade</TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center font-semibold">
                              {formatNumberPtBr(sc.quantity_tons, 1)} t
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">
                            Pedidos Impactados
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              {sc.impacted_orders_count} ordens
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">
                            Pedidos Atrasados
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              {sc.delayed_orders_count > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-rose-700 border-rose-300 text-[10px]"
                                >
                                  {sc.delayed_orders_count} atrasado(s)
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-emerald-700 border-emerald-300 text-[10px]"
                                >
                                  0 atrasos
                                </Badge>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">
                            Setup Adicional
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              {sc.additional_setup_minutes} min
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">
                            Ocupação de Capacidade
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell
                              key={sc.scenario_id}
                              className="text-center font-mono font-bold"
                            >
                              {formatNumberPtBr(sc.capacity_utilization_pct, 1)}%
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">
                            Parecer da IA
                          </TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell
                              key={sc.scenario_id}
                              className="text-[11px] text-slate-600 leading-relaxed"
                            >
                              {sc.ai_summary}
                            </TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-slate-600">Ação</TableCell>
                          {simulationResult.scenariosComparison.map((sc) => (
                            <TableCell key={sc.scenario_id} className="text-center">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  selectedScenarioId === sc.scenario_id ? 'default' : 'outline'
                                }
                                onClick={() => setSelectedScenarioId(sc.scenario_id)}
                                className={`text-xs px-2.5 py-1 h-auto ${selectedScenarioId === sc.scenario_id ? 'bg-[#004C97]' : ''}`}
                              >
                                {selectedScenarioId === sc.scenario_id
                                  ? 'Selecionado para análise detalhada'
                                  : 'Selecionar cenário'}
                              </Button>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Centros Compatíveis da Ficha Mestra */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Centros Produtivos Compatíveis (Identificados via Ficha Mestra)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Centro</TableHead>
                          <TableHead className="text-xs font-semibold">Linha</TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Data Início
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Data Fim
                          </TableHead>
                          <TableHead className="text-xs font-semibold text-center">
                            Tempo Necessário
                          </TableHead>
                          <TableHead className="text-xs font-semibold">Situação Técnica</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {simulationResult.productionCenters.map((c, idx) => (
                          <TableRow
                            key={idx}
                            className={c.is_best_alternative ? 'bg-blue-50/50' : ''}
                          >
                            <TableCell className="font-mono font-bold text-slate-900">
                              {c.center_code}
                            </TableCell>
                            <TableCell>{c.line_name}</TableCell>
                            <TableCell className="text-center text-slate-600">
                              {c.possible_start_date}
                            </TableCell>
                            <TableCell className="text-center text-slate-600">
                              {c.possible_end_date}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {formatNumberPtBr(c.required_hours, 1)} h
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {c.is_best_alternative && (
                                  <Badge className="bg-[#004C97] text-white text-[10px]">
                                    Melhor alternativa
                                  </Badge>
                                )}
                                <span className="text-slate-600">{c.situation}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Matéria-Prima: Disponibilidade, Comprometimentos e Necessidade */}
              <Card className="border-slate-200 shadow-xs">
                <CardHeader className="border-b border-slate-100 pb-3">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Matéria-Prima: Disponibilidade, Comprometimentos e Necessidade Real
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-semibold">
                            Código / Descrição
                          </TableHead>
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
                            Saldo Simulado
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
                              <div className="font-mono font-bold text-slate-900">
                                {mp.raw_material_code}
                              </div>
                              <div className="text-[11px] text-slate-500">{mp.description}</div>
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

              {/* Produtos Deslocados com Efeito em Cadeia */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-slate-200 shadow-xs">
                  <CardHeader className="border-b border-slate-100 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Produtos Deslocados (Efeito em Cadeia)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-xs">Seq.</TableHead>
                            <TableHead className="text-xs">Produto / Cliente</TableHead>
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
                                <div className="font-medium text-slate-900">{imp.product_code}</div>
                                <div className="text-[10px] text-slate-500">
                                  {imp.customer_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-slate-500">{imp.current_date}</TableCell>
                              <TableCell className="font-medium">
                                {imp.simulated_new_date}
                              </TableCell>
                              <TableCell className="text-center font-bold text-amber-700">
                                +{imp.displacement_days} d
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Pedidos Potencialmente Atrasados */}
                <Card className="border-slate-200 shadow-xs">
                  <CardHeader className="border-b border-slate-100 pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Pedidos Potencialmente Atrasados na Carteira
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-xs">Pedido</TableHead>
                            <TableHead className="text-xs">Cliente</TableHead>
                            <TableHead className="text-xs">Data Prometida</TableHead>
                            <TableHead className="text-xs">Simulada</TableHead>
                            <TableHead className="text-xs text-center">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                          {simulationResult.deliveryImpact.map((d, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">{d.sales_order}</TableCell>
                              <TableCell>{d.customer_name}</TableCell>
                              <TableCell className="text-slate-500">
                                {d.current_promised_date}
                              </TableCell>
                              <TableCell className="font-medium">
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

              {/* CONFIABILIDADE: SEPARAÇÃO RIGOROSA DOS 3 NÍVEIS */}
              <Card className="border-slate-200 bg-slate-50/50">
                <CardHeader className="border-b border-slate-200 pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Separação de Confiabilidade (Regra CIAFAL: Confirmado × Cálculo × IA)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-emerald-700 block">
                      1. Dado Confirmado (Sistema Real)
                    </span>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      {simulationResult.dataReliability.confirmed_data.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-[#004C97] block">
                      2. Cálculo da Simulação (Matemático)
                    </span>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
                      {simulationResult.dataReliability.calculated_simulations.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="font-bold text-indigo-700 block">
                      3. Recomendação da IA (Explicativa)
                    </span>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5 text-[11px]">
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

        {/* ============================================================== */}
        {/* ABA 3: HISTÓRICO COM SNAPSHOT IMUTÁVEL                          */}
        {/* ============================================================== */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#004C97]" />
                  Histórico de Simulações (Snapshots Imutáveis)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Reabrir qualquer simulação recupera os resultados originais congelados no momento
                  do cálculo.
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
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Número</TableHead>
                      <TableHead className="text-xs font-semibold">Data / Hora</TableHead>
                      <TableHead className="text-xs font-semibold">Usuário</TableHead>
                      <TableHead className="text-xs font-semibold">Cliente</TableHead>
                      <TableHead className="text-xs font-semibold">Produto</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Quantidade</TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Prazo Solicitado
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Melhor Data
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">
                        Viabilidade
                      </TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {historyList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-500">
                          {loadingHistory
                            ? 'Carregando histórico...'
                            : 'Nenhuma simulação registrada no banco até o momento.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyList.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-bold text-[#004C97]">
                            {item.simulation_code}
                          </TableCell>
                          <TableCell className="text-slate-500 font-mono">
                            {new Date(item.created).toLocaleString('pt-BR', { hour12: false })}
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">
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
                                      : 'bg-slate-200 text-slate-800'
                              }`}
                            >
                              {item.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenSnapshot(item)}
                                className="h-7 px-2 text-[11px] flex items-center gap-1 border-slate-300"
                                title="Visualizar snapshot imutável"
                              >
                                <Eye className="w-3 h-3 text-[#004C97]" />
                                Visualizar
                              </Button>

                              {isPcpRole && item.approval_status === 'AGUARDANDO_ANALISE_PCP' && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedHistoryItem(item)
                                    setIsPcpDecisionModalOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] bg-[#004C97] hover:bg-[#003870] text-white"
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

      {/* MODAL 1: Pedidos Potencialmente Atrasados */}
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
