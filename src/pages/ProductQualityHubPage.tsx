import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  Sparkles,
  Award,
  Microscope,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Filter,
  Plus,
  ArrowRight,
  TrendingUp,
  Cpu,
  FileText,
  AlertOctagon,
  RefreshCw,
  FileCheck,
} from 'lucide-react'
import {
  QualityInspectionDemand,
  ProductQualityRequirement,
  OrderRequirementSheet,
  QualityCapacityPlanning,
  QualityDemandStatus,
} from '@/types/product-quality'
import { qualityService } from '@/services/quality-service'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { OrderRequirementSheetModal } from '@/components/quality/OrderRequirementSheetModal'
import { QualityRequirementDetailModal } from '@/components/quality/QualityRequirementDetailModal'
import { useToast } from '@/hooks/use-toast'

export const ProductQualityHubPage: React.FC = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'WORKFLOW' | 'CAPACITY' | 'CATALOG' | 'SHEETS'>(
    'WORKFLOW',
  )
  const [demands, setDemands] = useState<QualityInspectionDemand[]>([])
  const [requirements, setRequirements] = useState<ProductQualityRequirement[]>([])
  const [sheets, setSheets] = useState<OrderRequirementSheet[]>([])
  const [capacities, setCapacities] = useState<QualityCapacityPlanning[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros do Workflow
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterLine, setFilterLine] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  // Modais de Inspeção e Laudo
  const [selectedDemandForInspect, setSelectedDemandForInspect] =
    useState<QualityInspectionDemand | null>(null)
  const [inspectStatus, setInspectStatus] = useState<QualityDemandStatus>('APROVADA')
  const [inspectorName, setInspectorName] = useState('Inspetor N2 Qualidade CIAFAL')
  const [inspectNotes, setInspectNotes] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [nonConformityReason, setNonConformityReason] = useState('')
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false)

  // Modais de Ficha e Detalhe
  const [selectedSheet, setSelectedSheet] = useState<OrderRequirementSheet | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [dList, rList, sList, cList] = await Promise.all([
        qualityService.listQualityDemands(),
        qualityService.listProductQualityRequirements(),
        qualityService.listOrderRequirementSheets(),
        qualityService.listQualityCapacityPlanning(),
      ])
      setDemands(dList)
      setRequirements(rList)
      setSheets(sList)
      setCapacities(cList)
    } catch (err) {
      console.error('Erro ao carregar dados de qualidade:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas do Workflow
  const workflowMetrics = useMemo(() => {
    const total = demands.length
    const previstas = demands.filter((d) => d.status === 'PREVISTA').length
    const programadas = demands.filter((d) => d.status === 'PROGRAMADA').length
    const emInspecao = demands.filter(
      (d) => d.status === 'EM_INSPECAO' || d.status === 'DISPONIVEL_INSPECAO',
    ).length
    const aprovadas = demands.filter(
      (d) => d.status === 'APROVADA' || d.status === 'LIBERADA',
    ).length
    const reprovadas = demands.filter((d) => d.status === 'REPROVADA').length
    const pendencias = demands.filter((d) => d.status === 'PENDENTE').length

    return { total, previstas, programadas, emInspecao, aprovadas, reprovadas, pendencias }
  }, [demands])

  // Demandas Filtradas
  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      const matchSearch =
        searchTerm === '' ||
        d.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.product_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.production_order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.customer_name && d.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchType =
        filterType === 'ALL' ||
        (filterType === 'ULTRASSOM' && d.inspection_type === 'ULTRASSOM') ||
        (filterType === 'MECANICOS' && d.inspection_type !== 'ULTRASSOM')

      const matchStatus = filterStatus === 'ALL' || d.status === filterStatus
      const matchLine = filterLine === 'ALL' || d.line_code === filterLine

      return matchSearch && matchType && matchStatus && matchLine
    })
  }, [demands, searchTerm, filterType, filterStatus, filterLine])

  const handleOpenInspect = (demand: QualityInspectionDemand) => {
    setSelectedDemandForInspect(demand)
    setInspectStatus(demand.status === 'APROVADA' ? 'APROVADA' : 'APROVADA')
    setInspectNotes(
      demand.result_notes || 'Inspeção 100% em conformidade com as tolerâncias normativas.',
    )
    setCertificateNumber(demand.certificate_number || `LAUDO-CQ-${Date.now().toString().slice(-4)}`)
    setNonConformityReason(demand.non_conformity_reason || '')
    setIsInspectModalOpen(true)
  }

  const handleSaveInspection = async () => {
    if (!selectedDemandForInspect) return
    try {
      await qualityService.updateQualityDemandStatus(selectedDemandForInspect.id, inspectStatus, {
        inspectorName,
        resultNotes: inspectNotes,
        certificateNumber,
        nonConformityReason: inspectStatus === 'REPROVADA' ? nonConformityReason : undefined,
        auditEvent: `INSPECTION_RESULT_${inspectStatus}`,
      })
      toast({
        title: `Inspeção Registrada: ${inspectStatus}`,
        description: `Demanda ${selectedDemandForInspect.demand_code} atualizada com sucesso.`,
      })
      setIsInspectModalOpen(false)
      loadData()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar inspeção',
        description: 'Não foi possível registrar o resultado da inspeção.',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Corporativo CIAFAL */}
      <div className="bg-[#004C97] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-900 text-cyan-200 text-xs px-2.5 py-0.5 rounded font-mono border border-blue-700 font-bold">
              QUALIDADE DO PRODUTO &bull; CIAFAL
            </span>
            <span className="text-xs text-blue-200">Módulo Integrado ao PCP Robotizado</span>
          </div>
          <h1 className="text-2xl font-bold mt-1 text-white flex items-center gap-2">
            <Microscope className="w-6 h-6 text-cyan-300" /> Painel de Qualidade, Ultrassom &
            Ensaios
          </h1>
          <p className="text-xs text-blue-100 max-w-3xl mt-1">
            Gestão antecipada de demandas de inspeção, ensaios não destrutivos de Ultrassom (US),
            ensaios mecânicos, fichas de requisitos MTO e planejamento de capacidade dos
            laboratórios.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={loadData}
            variant="outline"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl border border-slate-200">
          <TabsTrigger
            value="WORKFLOW"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-xs font-semibold px-4 py-2"
          >
            Workflow de Inspeções & Ensaios
          </TabsTrigger>
          <TabsTrigger
            value="CAPACITY"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-xs font-semibold px-4 py-2"
          >
            Capacidade dos Laboratórios
          </TabsTrigger>
          <TabsTrigger
            value="SHEETS"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-xs font-semibold px-4 py-2"
          >
            Fichas de Requisitos MTO ({sheets.length})
          </TabsTrigger>
          <TabsTrigger
            value="CATALOG"
            className="data-[state=active]:bg-[#004C97] data-[state=active]:text-white text-xs font-semibold px-4 py-2"
          >
            Catálogo Mestre MTS/MTO ({requirements.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: WORKFLOW DE INSPEÇÕES */}
        <TabsContent value="WORKFLOW" className="space-y-4 pt-3">
          {/* Funil de Status */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div
              onClick={() => setFilterStatus('ALL')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-blue-50 border-[#004C97] shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Total Demandas
              </span>
              <strong className="text-xl font-bold text-slate-900">{workflowMetrics.total}</strong>
              <span className="text-[10px] text-slate-500 block">Todas as ordens</span>
            </div>

            <div
              onClick={() => setFilterStatus('PREVISTA')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterStatus === 'PREVISTA'
                  ? 'bg-blue-50 border-[#004C97] shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-blue-700 block flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-600" /> Futuras / Previstas
              </span>
              <strong className="text-xl font-bold text-blue-900">
                {workflowMetrics.previstas}
              </strong>
              <span className="text-[10px] text-slate-500 block">Aguardando grade</span>
            </div>

            <div
              onClick={() => setFilterStatus('PROGRAMADA')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterStatus === 'PROGRAMADA'
                  ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-indigo-700 block flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-600" /> Programadas
              </span>
              <strong className="text-xl font-bold text-indigo-900">
                {workflowMetrics.programadas}
              </strong>
              <span className="text-[10px] text-slate-500 block">Na grade de produção</span>
            </div>

            <div
              onClick={() => setFilterStatus('EM_INSPECAO')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterStatus === 'EM_INSPECAO'
                  ? 'bg-cyan-50 border-cyan-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-cyan-800 block flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-600" /> Em Inspeção
              </span>
              <strong className="text-xl font-bold text-cyan-900">
                {workflowMetrics.emInspecao}
              </strong>
              <span className="text-[10px] text-slate-500 block">Em bancada lab</span>
            </div>

            <div
              onClick={() => setFilterStatus('APROVADA')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterStatus === 'APROVADA'
                  ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-emerald-700 block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aprovadas
              </span>
              <strong className="text-xl font-bold text-emerald-900">
                {workflowMetrics.aprovadas}
              </strong>
              <span className="text-[10px] text-slate-500 block">Laudo conforme</span>
            </div>

            <div
              onClick={() => setFilterStatus('REPROVADA')}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                filterStatus === 'REPROVADA'
                  ? 'bg-rose-50 border-rose-500 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase text-rose-700 block flex items-center gap-1">
                <AlertOctagon className="w-3 h-3 text-rose-600" /> Reprovadas
              </span>
              <strong className="text-xl font-bold text-rose-900">
                {workflowMetrics.reprovadas}
              </strong>
              <span className="text-[10px] text-slate-500 block">Bloqueadas</span>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar por OP, produto, cliente, laudo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    filterType === 'ALL' ? 'bg-[#004C97] text-white' : 'text-slate-600'
                  }`}
                >
                  Todos Ensaios
                </button>
                <button
                  onClick={() => setFilterType('ULTRASSOM')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    filterType === 'ULTRASSOM' ? 'bg-[#004C97] text-white' : 'text-slate-600'
                  }`}
                >
                  Ultrassom (US)
                </button>
                <button
                  onClick={() => setFilterType('MECANICOS')}
                  className={`px-3 py-1 rounded text-xs font-semibold ${
                    filterType === 'MECANICOS' ? 'bg-[#004C97] text-white' : 'text-slate-600'
                  }`}
                >
                  Ensaios Mecânicos
                </button>
              </div>

              <select
                value={filterLine}
                onChange={(e) => setFilterLine(e.target.value)}
                className="h-9 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
              >
                <option value="ALL">Todas as Linhas</option>
                <option value="L1">Linha L1</option>
                <option value="L2">Linha L2</option>
                <option value="L3">Linha L3</option>
                <option value="L4">Linha L4</option>
              </select>
            </div>
          </div>

          {/* Tabela Principal de Workflow */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#004C97] text-white text-[11px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Código Demanda</th>
                    <th className="p-3">Tipo Ensaio</th>
                    <th className="p-3">OP / Linha</th>
                    <th className="p-3">Material & Norma</th>
                    <th className="p-3">Cliente / Pedido</th>
                    <th className="p-3 text-right">Volume</th>
                    <th className="p-3">Data Prevista</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Ações / Laudo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDemands.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        Nenhuma demanda de inspeção encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredDemands.map((d) => {
                      const isUS = d.inspection_type === 'ULTRASSOM'
                      const isMto = d.production_type === 'MTO'

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-[#004C97]">
                            {d.demand_code}
                            <span className="block text-[10px] text-slate-400 font-sans font-normal">
                              Prioridade {d.priority}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {isUS ? (
                                <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[10px] font-bold">
                                  <Sparkles className="w-2.5 h-2.5 mr-1" /> ULTRASSOM
                                </Badge>
                              ) : (
                                <Badge className="bg-indigo-100 text-indigo-900 border-indigo-200 text-[10px] font-bold">
                                  <Award className="w-2.5 h-2.5 mr-1" />{' '}
                                  {d.inspection_type.replace('ENSAIO_', '')}
                                </Badge>
                              )}
                              {d.is_blocking_release && (
                                <span title="Bloqueante para liberação física">
                                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600 inline" />
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                              {d.applicable_standard || 'ASME / NBR'}
                            </span>
                          </td>

                          <td className="p-3">
                            <strong className="text-slate-900 block font-bold">
                              {d.production_order_number}
                            </strong>
                            <span className="text-[10px] text-slate-500">Linha {d.line_code}</span>
                          </td>

                          <td className="p-3">
                            <strong className="text-slate-900 block truncate max-w-[190px]">
                              {d.product_description}
                            </strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-500">
                                {d.product_code}
                              </span>
                              <Badge
                                className={`text-[9px] font-bold px-1 py-0 ${
                                  isMto
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {d.production_type}
                              </Badge>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="text-slate-800 font-medium block truncate max-w-[150px]">
                              {d.customer_name || 'Mercado Geral'}
                            </span>
                            {d.sales_order_sap && (
                              <span className="text-[10px] font-mono text-[#004C97] block">
                                SAP: {d.sales_order_sap}
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {d.quantity_tons.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}{' '}
                            t
                          </td>

                          <td className="p-3">
                            <span className="text-slate-800 font-mono text-[11px] block">
                              {d.planned_inspection_date}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {d.sample_count || 3} CPs
                            </span>
                          </td>

                          <td className="p-3">
                            <Badge
                              className={`text-[10px] font-bold ${
                                d.status === 'APROVADA' || d.status === 'LIBERADA'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : d.status === 'REPROVADA'
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : d.status === 'EM_INSPECAO'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse'
                                      : 'bg-amber-100 text-amber-800 border-amber-200'
                              }`}
                            >
                              {d.status}
                            </Badge>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                onClick={() => handleOpenInspect(d)}
                                className="h-7 px-2.5 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
                              >
                                Laudo / Resultado
                              </Button>

                              {isMto && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const s = sheets.find(
                                      (sh) => sh.order_number === d.production_order_number,
                                    )
                                    if (s) {
                                      setSelectedSheet(s)
                                      setIsSheetOpen(true)
                                    }
                                  }}
                                  className="h-7 px-2 text-xs border-purple-200 text-purple-800 hover:bg-purple-50"
                                  title="Abrir Ficha de Requisitos"
                                >
                                  <FileText className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: CAPACIDADE DOS LABORATÓRIOS */}
        <TabsContent value="CAPACITY" className="space-y-4 pt-3">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#004C97]" /> Planejamento de Capacidade &
                  Balanceamento de Carga
                </h3>
                <p className="text-xs text-slate-600">
                  Visão comparativa de ensaios previstos vs. capacidade nominal dos laboratórios da
                  CIAFAL.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {capacities.map((cap) => (
                <div
                  key={cap.id}
                  className={`p-4 rounded-xl border ${
                    cap.has_overload
                      ? 'bg-rose-50/50 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  } space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-bold text-slate-900 block">
                        {cap.laboratory_or_line}
                      </strong>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Período: {cap.period_ref}
                      </span>
                    </div>
                    <Badge
                      className={`text-[10px] font-bold ${
                        cap.has_overload
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {cap.has_overload ? 'SOBRECARGA DETECTADA' : 'CAPACIDADE OK'}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Ocupação do Laboratório:</span>
                      <strong className="font-bold text-slate-900">
                        {cap.utilization_pct.toFixed(1)}%
                      </strong>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cap.has_overload ? 'bg-rose-500' : 'bg-[#004C97]'}`}
                        style={{ width: `${Math.min(cap.utilization_pct, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                    <div>
                      Ensaios Previstos: <strong>{cap.planned_tests_count}</strong>
                    </div>
                    <div>
                      Limite Diário: <strong>{cap.daily_capacity_tests_limit || 10}</strong>
                    </div>
                    <div>
                      Horas Demandadas: <strong>{cap.planned_hours.toFixed(1)}h</strong>
                    </div>
                    <div>
                      Capacidade Disponível:{' '}
                      <strong>{cap.available_capacity_hours.toFixed(1)}h</strong>
                    </div>
                  </div>

                  {cap.has_overload &&
                    cap.ai_capacity_alerts &&
                    cap.ai_capacity_alerts.length > 0 && (
                      <div className="bg-rose-100/80 p-2.5 rounded-lg border border-rose-200 text-xs text-rose-900 space-y-1">
                        <strong className="block text-[11px] font-bold uppercase">
                          Alerta IA Programadora:
                        </strong>
                        <p className="text-[11px]">{cap.ai_capacity_alerts[0]}</p>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: FICHAS DE REQUISITOS MTO */}
        <TabsContent value="SHEETS" className="space-y-4 pt-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Fichas Completas de Requisitos do Pedido (MTO)
                </h3>
                <p className="text-xs text-slate-500">
                  Cadastros integrados de requisitos técnicos, dimensionais, metalúrgicos e de
                  qualidade por pedido de cliente.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#004C97] text-white text-[11px] uppercase font-bold">
                  <tr>
                    <th className="p-3">Código Ficha</th>
                    <th className="p-3">Ordem / OP</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Pedido SAP / Item</th>
                    <th className="p-3">Material & Dimensão</th>
                    <th className="p-3">Norma Técnica</th>
                    <th className="p-3">US / Ensaios</th>
                    <th className="p-3">Status Validação</th>
                    <th className="p-3 text-center">Visualizar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sheets.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#004C97]">{s.sheet_code}</td>
                      <td className="p-3 font-mono text-slate-900 font-bold">{s.order_number}</td>
                      <td className="p-3 font-medium text-slate-900 truncate max-w-[150px]">
                        {s.customer_name}
                      </td>
                      <td className="p-3 font-mono text-slate-700">
                        {s.sales_order_sap} / {s.sales_order_item}
                      </td>
                      <td className="p-3">
                        <strong className="text-slate-900 block">{s.material_description}</strong>
                        <span className="text-[10px] text-slate-500">{s.nominal_dimension}</span>
                      </td>
                      <td className="p-3 text-slate-800 font-medium">{s.technical_standard}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {s.requires_ultrasound && (
                            <Badge className="bg-blue-100 text-[#004C97] text-[9px]">US</Badge>
                          )}
                          {s.requires_mechanical_tests && (
                            <Badge className="bg-indigo-100 text-indigo-900 text-[9px]">EM</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            s.validation_status === 'VALIDADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.validation_status === 'CONFLITO_REQUISITOS'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.validation_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSheet(s)
                            setIsSheetOpen(true)
                          }}
                          className="h-7 px-2.5 text-xs text-[#004C97] hover:bg-blue-50 border-[#004C97]"
                        >
                          <FileText className="w-3 h-3 mr-1" /> Abrir Ficha
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: CATÁLOGO MESTRE MTS/MTO */}
        <TabsContent value="CATALOG" className="space-y-4 pt-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                Catálogo Mestre de Classificação MTS / MTO e Qualidade
              </h3>
              <p className="text-xs text-slate-500">
                Parametrização corporativa de Ultrassom (Sim / Não / Condicional), Ensaios Mecânicos
                e Bloqueio de Liberação.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#004C97] text-white text-[11px] uppercase font-bold">
                  <tr>
                    <th className="p-3">Cód. Produto</th>
                    <th className="p-3">Descrição Produto</th>
                    <th className="p-3">Classif. Padrão</th>
                    <th className="p-3">Exige Ultrassom</th>
                    <th className="p-3">Exige Ensaios Mecânicos</th>
                    <th className="p-3">Tipos de Ensaio</th>
                    <th className="p-3">Bloqueante Liberação</th>
                    <th className="p-3">Laboratório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requirements.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-[#004C97]">{req.product_code}</td>
                      <td className="p-3 font-bold text-slate-900">{req.product_name}</td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            req.production_type === 'MTO'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {req.production_type}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            req.ultrasound_requirement === 'SIM'
                              ? 'bg-blue-100 text-blue-900'
                              : req.ultrasound_requirement === 'CONDICIONAL'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {req.ultrasound_requirement}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[10px] font-bold ${
                            req.mechanical_test_requirement === 'SIM'
                              ? 'bg-indigo-100 text-indigo-900'
                              : req.mechanical_test_requirement === 'CONDICIONAL'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {req.mechanical_test_requirement}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-700">
                        {req.mechanical_test_types && req.mechanical_test_types.length > 0
                          ? req.mechanical_test_types.join(', ')
                          : 'Isento'}
                      </td>
                      <td className="p-3">
                        {req.is_blocking_default ? (
                          <span className="text-rose-700 font-bold text-xs flex items-center gap-1">
                            <AlertOctagon className="w-3.5 h-3.5" /> Sim (Bloqueante)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Não</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {req.responsible_laboratory || 'LAB_CENTRAL'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Laudo / Inspeção */}
      <Dialog open={isInspectModalOpen} onOpenChange={setIsInspectModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#004C97] flex items-center gap-2">
              <Microscope className="w-5 h-5" /> Registro de Laudo & Liberação de Qualidade
            </DialogTitle>
          </DialogHeader>

          {selectedDemandForInspect && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <strong className="text-slate-900 block font-bold">
                  {selectedDemandForInspect.product_description}
                </strong>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 mt-1">
                  <div>
                    Demanda:{' '}
                    <strong className="text-[#004C97]">
                      {selectedDemandForInspect.demand_code}
                    </strong>
                  </div>
                  <div>
                    OP: <strong>{selectedDemandForInspect.production_order_number}</strong>
                  </div>
                  <div>
                    Ensaio: <strong>{selectedDemandForInspect.inspection_type}</strong>
                  </div>
                  <div>
                    Classificação: <strong>{selectedDemandForInspect.production_type}</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Resultado / Parecer do Ensaio:
                </label>
                <select
                  value={inspectStatus}
                  onChange={(e) => setInspectStatus(e.target.value as any)}
                  className="w-full h-9 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold"
                >
                  <option value="APROVADA">
                    APROVADA (Material conforme normas e especificações)
                  </option>
                  <option value="LIBERADA">
                    LIBERADA (Liberada formalmente para expedição/faturamento)
                  </option>
                  <option value="REPROVADA">REPROVADA (Não conformidade técnica detectada)</option>
                  <option value="PENDENTE">
                    PENDENTE (Aguardando contraprova ou validação adicional)
                  </option>
                  <option value="EM_INSPECAO">EM INSPEÇÃO (Em andamento no laboratório)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Número do Certificado / Laudo:
                  </label>
                  <Input
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    className="h-8 text-xs bg-slate-50 border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Inspetor / Responsável:
                  </label>
                  <Input
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="h-8 text-xs bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Notas Técnicas & Observações:
                </label>
                <textarea
                  value={inspectNotes}
                  onChange={(e) => setInspectNotes(e.target.value)}
                  rows={3}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  placeholder="Detalhes dos resultados obtidos nos corpos de prova..."
                />
              </div>

              {inspectStatus === 'REPROVADA' && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-1">
                  <label className="text-[11px] font-bold text-rose-900 block">
                    Motivo da Não Conformidade:
                  </label>
                  <textarea
                    value={nonConformityReason}
                    onChange={(e) => setNonConformityReason(e.target.value)}
                    rows={2}
                    className="w-full p-2 text-xs bg-white border border-rose-300 rounded text-rose-900"
                    placeholder="Descrever a falha detectada..."
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button size="sm" variant="outline" onClick={() => setIsInspectModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveInspection}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Confirmar e Gravar Laudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ficha Completa */}
      <OrderRequirementSheetModal
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        sheet={selectedSheet}
      />
    </div>
  )
}

export default ProductQualityHubPage
