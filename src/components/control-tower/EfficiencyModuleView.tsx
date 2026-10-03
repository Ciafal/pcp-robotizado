import React, { useState } from 'react'
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  Sparkles,
  Search,
  CheckCircle2,
  HelpCircle,
  Clock,
  Zap,
  ArrowRight,
  Filter,
  BarChart3,
  Building2,
  Factory,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { EfficiencyCenterMainView } from './efficiency/EfficiencyCenterMainView'
import { EfficiencyProductsSubpage } from '@/pages/EfficiencyProductsSubpage'
import { EfficiencyLinesSubpage } from '@/pages/EfficiencyLinesSubpage'
import { EfficiencyPlantsSubpage } from '@/pages/EfficiencyPlantsSubpage'
import { EfficiencyAssertivenessSubpage } from '@/pages/EfficiencyAssertivenessSubpage'

interface EfficiencyViewProps {
  initialTab?: 'linhas' | 'centros' | 'produtos' | 'plantas' | 'assertividade' | 'aprendizado'
}

export const EfficiencyModuleView: React.FC<EfficiencyViewProps> = ({ initialTab = 'linhas' }) => {
  const {
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    productPerformances,
    scheduleAssertiveness,
    productionDeviations,
    addDeviationAction,
    proposeParamRevision,
    lines,
    plants,
  } = useControlTower()

  const [activeTab, setActiveTab] = useState<string>(initialTab)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'DENTRO_ESPERADO' | 'ATENCAO' | 'CRITICO'
  >('ALL')

  // Modal IA de Eficiência
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiAnalysisProduct, setAiAnalysisProduct] = useState<any>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Modal de Tratamento de Desvio
  const [selectedDeviation, setSelectedDeviation] = useState<any>(null)
  const [actionPlanInput, setActionPlanInput] = useState('')
  const [justificationInput, setJustificationInput] = useState('')
  const [responsibleInput, setResponsibleInput] = useState('')
  const [deadlineInput, setDeadlineInput] = useState('')

  // Filtragem de Produtos
  const filteredProducts = productPerformances.filter((p) => {
    if (filters.plantCode !== 'ALL' && p.plantCode !== filters.plantCode) return false
    if (filters.lineCode !== 'ALL' && p.lineCode !== filters.lineCode) return false
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        p.productCode.toLowerCase().includes(q) ||
        p.productName.toLowerCase().includes(q) ||
        p.familyCode.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Disparar Análise com IA
  const handleRunAiAnalysis = (prod: any) => {
    setAiAnalysisProduct(prod)
    setAiLoading(true)
    setIsAiModalOpen(true)
    setTimeout(() => {
      setAiLoading(false)
    }, 600)
  }

  // Submeter Ação de Desvio
  const handleSaveAction = () => {
    if (!selectedDeviation) return
    addDeviationAction(
      selectedDeviation.id,
      actionPlanInput || selectedDeviation.actionPlan,
      justificationInput || selectedDeviation.justification,
      responsibleInput || selectedDeviation.responsibleName,
      deadlineInput || selectedDeviation.deadline,
    )
    setSelectedDeviation(null)
  }

  return (
    <div className="space-y-6">
      {/* Header com Contexto CIAFAL — Responsivo (Desktop em linha, Tablet com quebra controlada, Mobile empilhado) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-[#004C97]/10 border border-[#004C97]/20 flex items-center justify-center text-[#004C97] shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Previsto x Realizado
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] sm:text-[11px] border-[#004C97]/30 text-[#004C97] bg-[#004C97]/5 font-mono font-medium"
              >
                {filters.plantCode === 'ALL' ? 'Todas as Plantas' : `Planta ${filters.plantCode}`}{' '}
                &bull;{' '}
                {filters.lineCode === 'ALL' ? 'Todas as Linhas' : `Linha ${filters.lineCode}`}
              </Badge>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Comparação entre programação planejada e produção realizada por centro e linha.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
          <Button
            size="sm"
            onClick={() => handleRunAiAnalysis(productPerformances[0])}
            className="w-full sm:w-auto gap-2 bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            Analisar Eficiência com IA
          </Button>
        </div>
      </div>

      {/* Seletor Dropdown em mobile para troca instantânea sem gerar rolagem na página */}
      <div className="block sm:hidden">
        <label className="text-[11px] font-semibold text-slate-500 mb-1 block">
          Visão de Eficiência:
        </label>
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004C97]/30 shadow-2xs"
        >
          <option value="linhas">1. Eficiência por Linha</option>
          <option value="centros">2. Eficiência por Centro</option>
          <option value="produtos">3. Eficiência por Produto (Nova)</option>
          <option value="plantas">4. Eficiência por Planta</option>
          <option value="assertividade">5. Assertividade da Programação</option>
          <option value="aprendizado">
            6. Ciclo de Aprendizado ({productionDeviations.length})
          </option>
        </select>
      </div>

      {/* Tabs Principais da Eficiência — Ordem estrita:
          1. Eficiência por Linha
          2. Eficiência por Centro
          3. Eficiência por Produto (NOVA)
          4. Eficiência por Planta
          5. Assertividade da Programação
          Desktop: rótulos inteiros sem corte nem reticências
          Tablet: scroll horizontal apenas dentro do trilho de abas
          Mobile: nunca scroll horizontal na página */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4 max-w-full">
        <div className="hidden sm:block w-full overflow-x-auto pb-1 scrollbar-thin">
          <TabsList className="bg-slate-100/90 border border-slate-200 p-1 rounded-xl h-auto flex flex-nowrap w-max min-w-full sm:w-auto gap-1">
            <TabsTrigger
              value="linhas"
              className="text-xs text-slate-700 data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-xs font-semibold px-3.5 py-2 whitespace-nowrap rounded-lg shrink-0"
            >
              <Factory className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Eficiência por Linha</span>
            </TabsTrigger>
            <TabsTrigger
              value="centros"
              className="text-xs text-slate-700 data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-xs font-semibold px-3.5 py-2 whitespace-nowrap rounded-lg shrink-0"
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Eficiência por Centro</span>
            </TabsTrigger>
            <TabsTrigger
              value="produtos"
              className="text-xs text-slate-700 data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-xs font-semibold px-3.5 py-2 whitespace-nowrap rounded-lg shrink-0"
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Eficiência por Produto</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full uppercase ml-1.5 leading-none">
                Nova
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="plantas"
              className="text-xs text-slate-700 data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-xs font-semibold px-3.5 py-2 whitespace-nowrap rounded-lg shrink-0"
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Eficiência por Planta</span>
            </TabsTrigger>
            <TabsTrigger
              value="assertividade"
              className="text-xs text-slate-700 data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-xs font-semibold px-3.5 py-2 whitespace-nowrap rounded-lg shrink-0"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Assertividade da Programação</span>
            </TabsTrigger>
            <TabsTrigger
              value="aprendizado"
              className="text-xs text-slate-700 data-[state=active]:bg-[#004C97] data-[state=active]:text-white data-[state=active]:shadow-xs font-semibold px-3.5 py-2 whitespace-nowrap rounded-lg shrink-0"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500 data-[state=active]:text-amber-300 shrink-0" />
              <span>Ciclo de Aprendizado ({productionDeviations.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Eficiência por Linha */}
        <TabsContent value="linhas" className="space-y-4">
          <EfficiencyLinesSubpage />
        </TabsContent>

        {/* 2. Eficiência por Centro */}
        <TabsContent value="centros" className="space-y-4">
          <EfficiencyCenterMainView
            initialLineCode={filters.lineCode}
            initialPlantCode={filters.plantCode}
          />
        </TabsContent>

        {/* 3. Eficiência por Produto (NOVA) */}
        <TabsContent value="produtos" className="space-y-4">
          <EfficiencyProductsSubpage />
        </TabsContent>

        {/* 4. Eficiência por Planta */}
        <TabsContent value="plantas" className="space-y-4">
          <EfficiencyPlantsSubpage />
        </TabsContent>

        {/* 5. Assertividade da Programação */}
        <TabsContent value="assertividade" className="space-y-4">
          <EfficiencyAssertivenessSubpage />
        </TabsContent>

        {/* 6. Ciclo de Aprendizado e Desvios — Identidade CIAFAL Clara */}
        <TabsContent value="aprendizado" className="space-y-4">
          <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Princípio Obrigatório CIAFAL: Desvio como Oportunidade de Aprendizado</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Ciclo Contínuo:{' '}
              <strong className="text-slate-900">
                PREVISÃO &rarr; EXECUÇÃO &rarr; DESVIO &rarr; ANÁLISE &rarr; CAUSA &rarr; AÇÃO
                &rarr; EFICÁCIA &rarr; APRENDIZADO &rarr; AJUSTE DE PARÂMETRO
              </strong>
              . Se um desvio ocorrer, justificativa e ação são mandatórias.
            </p>
          </div>

          <div className="space-y-3">
            {productionDeviations.map((dev) => (
              <Card
                key={dev.id}
                className={cn(
                  'bg-white border rounded-xl shadow-2xs overflow-hidden',
                  dev.isRecurrent ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200',
                )}
              >
                <CardHeader className="p-4 pb-2 bg-slate-50/60 border-b border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-mono">
                        {dev.orderNumber}
                      </Badge>
                      <span className="text-xs font-mono text-[#004C97] font-semibold">
                        Linha {dev.lineCode} &bull; {dev.productCode} &bull; {dev.shift}
                      </span>
                      {dev.isRecurrent && (
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                          ⚠️ Reincidência ({dev.recurrenceCount}x)
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-slate-200 bg-white text-slate-700"
                    >
                      Status: {dev.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3 space-y-3">
                  {/* Gap numérico formatado */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Planejado</span>
                      <span className="text-slate-800 font-semibold">{dev.plannedQty} t</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Realizado</span>
                      <span className="text-slate-800 font-semibold">{dev.realizedQty} t</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Gap de Produção</span>
                      <span className="text-rose-700 font-bold">-{dev.gapQty} t</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Aderência / Eficiência
                      </span>
                      <span className="text-amber-700 font-semibold">
                        {dev.adherencePct}% / {dev.efficiencyPct}%
                      </span>
                    </div>
                  </div>

                  {/* Causa e Justificativa */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <span className="text-[#004C97] font-mono">Causa Raiz:</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 border border-slate-200">
                        {dev.causeTaxonomy}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      &quot;{dev.justification}&quot;
                    </p>
                  </div>

                  {/* Ação e Responsável */}
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-600 font-semibold">Plano de Ação Corretivo:</span>
                      <span className="text-slate-500 font-mono">
                        Resp: <strong className="text-slate-800">{dev.responsibleName}</strong> |
                        Prazo: <strong className="text-slate-800">{dev.deadline}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{dev.actionPlan}</p>
                  </div>

                  {/* Histórico de Reincidência */}
                  {dev.isRecurrent && dev.previousActionHistory && (
                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Histórico de Tentativas Anteriores:</span>
                      </div>
                      <p className="text-[11px] text-amber-800">{dev.previousActionHistory}</p>
                    </div>
                  )}

                  {/* Proposta de Revisão de Parâmetro da Ficha Mestre */}
                  {dev.paramRevisionProposed && dev.proposedParamRevision && (
                    <div className="bg-blue-50/70 border border-blue-200 p-3 rounded-lg text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-[#004C97] font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>IA Propõe Revisão de Parâmetro da Ficha Mestre</span>
                        </div>
                        <Badge className="bg-blue-100 text-[#004C97] border-blue-300 text-[10px]">
                          Confiança {dev.proposedParamRevision.confidencePct}%
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-700">{dev.proposedParamRevision.reason}</p>
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs font-mono text-slate-600">
                          Alterar{' '}
                          <span className="text-slate-900 font-semibold">
                            {dev.proposedParamRevision.field}
                          </span>{' '}
                          de{' '}
                          <span className="text-rose-600 line-through">
                            {dev.proposedParamRevision.currentValue} t/h
                          </span>{' '}
                          para{' '}
                          <span className="text-emerald-700 font-bold">
                            {dev.proposedParamRevision.suggestedValue} t/h
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => proposeParamRevision(dev.id)}
                          className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-semibold gap-1 shadow-2xs"
                        >
                          Abrir Proposta de Ficha Mestre
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDeviation(dev)
                        setActionPlanInput(dev.actionPlan)
                        setJustificationInput(dev.justification)
                        setResponsibleInput(dev.responsibleName)
                        setDeadlineInput(dev.deadline)
                      }}
                      className="text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-8"
                    >
                      Editar / Atualizar Ação
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal IA de Análise de Eficiência — Identidade Clara */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-[#004C97] font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Diagnóstico Avançado de Eficiência Industrial &bull; IA CIAFAL</span>
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
              Análise Multidimensional de Perdas & Gargalos
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cruzamento de histórico, telemetria térmica, paradas registradas e Ficha Mestre do
              produto.
            </DialogDescription>
          </DialogHeader>

          {aiLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-[#004C97] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono text-slate-500">
                Cruzando 12 variáveis industriais do SAP e chão de fábrica...
              </p>
            </div>
          ) : (
            aiAnalysisProduct && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="font-mono text-[#004C97] text-xs font-semibold">
                      {aiAnalysisProduct.productCode}
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {aiAnalysisProduct.productName}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Gap de Eficiência:
                    </span>
                    <span className="text-rose-600 font-bold font-mono text-sm">
                      -
                      {(
                        aiAnalysisProduct.expectedEfficiencyPct -
                        aiAnalysisProduct.currentEfficiencyPct
                      ).toFixed(1)}{' '}
                      p.p.
                    </span>
                  </div>
                </div>
                {/* Categorização obrigatória: Dado | Desvio | Hipótese | Causa Registrada | Recomendação */}
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-slate-600 uppercase font-semibold">
                    Evidências e Diagnóstico Estruturado:
                  </span>
                  <div className="space-y-1.5">
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs flex items-start gap-2">
                      <Badge className="bg-slate-200 text-slate-800 text-[9px] shrink-0 font-mono">
                        DADO REAL
                      </Badge>
                      <span className="text-slate-700">
                        Produção física de 1.612,5 t realizada no período vs 1.650,0 t programadas.
                      </span>
                    </div>
                    <div className="bg-rose-50/50 p-2 rounded border border-rose-200 text-xs flex items-start gap-2">
                      <Badge className="bg-rose-100 text-rose-800 text-[9px] shrink-0 font-mono">
                        DESVIO
                      </Badge>
                      <span className="text-rose-900">
                        Gap negativo de 37,5 t (-2,3%) na velocidade de acabamento da bitola.
                      </span>
                    </div>
                    <div className="bg-blue-50/50 p-2 rounded border border-blue-200 text-xs flex items-start gap-2">
                      <Badge className="bg-blue-100 text-blue-800 text-[9px] shrink-0 font-mono">
                        CAUSA REGISTRADA
                      </Badge>
                      <span className="text-blue-950 font-medium">
                        Apontamento MES: Paradas corretivas de troca de guias térmicas (3.2 p.p. de
                        perda de disponibilidade).
                      </span>
                    </div>
                    <div className="bg-amber-50/50 p-2 rounded border border-amber-200 text-xs flex items-start gap-2">
                      <Badge className="bg-amber-100 text-amber-800 text-[9px] shrink-0 font-mono">
                        HIPÓTESE IA
                      </Badge>
                      <span className="text-amber-950 italic">
                        Hipótese probabilística: Superaquecimento em passagens de alta velocidade
                        (nunca tratada como causa confirmada sem laudo de engenharia).
                      </span>
                    </div>
                  </div>
                </div>
                {/* Recomendação Proativa Consultiva */}
                <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-lg text-slate-800 space-y-1 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-[#004C97]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Recomendação de Otimização Prescritiva (Consultiva):</span>
                  </div>
                  <p className="text-slate-600">
                    O ritmo cadastrado na Ficha Mestra (70 t/h) está 4 t/h acima da média térmica
                    sustentada para a bitola 50x50. Sugere-se avaliar junto à Engenharia a
                    calibração de cadência em 68 t/h para eliminar microparadas por superaquecimento
                    de guias.
                  </p>
                </div>{' '}
              </div>
            )
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(false)}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
            >
              Fechar Diagnóstico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Ação de Desvio Obrigatório */}
      <Dialog
        open={!!selectedDeviation}
        onOpenChange={(open) => !open && setSelectedDeviation(null)}
      >
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Tratamento Obrigatório do Desvio
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preenchimento mandatório de causa, justificativa, ação e responsável conforme
              governança CIAFAL.
            </DialogDescription>
          </DialogHeader>

          {selectedDeviation && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Justificativa Operacional:
                </label>
                <Textarea
                  value={justificationInput}
                  onChange={(e) => setJustificationInput(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-16"
                  placeholder="Descreva o motivo que gerou o gap..."
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Plano de Ação Corretiva:
                </label>
                <Textarea
                  value={actionPlanInput}
                  onChange={(e) => setActionPlanInput(e.target.value)}
                  className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-16"
                  placeholder="Qual contramedida será aplicada para evitar reincidência?"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Responsável:
                  </label>
                  <Input
                    value={responsibleInput}
                    onChange={(e) => setResponsibleInput(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Prazo Conclusão:
                  </label>
                  <Input
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-slate-900 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDeviation(null)}
              className="border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAction}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold shadow-xs"
            >
              Salvar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
