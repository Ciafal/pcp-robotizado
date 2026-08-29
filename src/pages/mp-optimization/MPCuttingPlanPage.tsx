import React, { useState, useEffect } from 'react'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { mpOptimizationService } from '@/services/mp-optimization'
import {
  MPDimensionalItem,
  MPApplicationRequirement,
  MPCuttingPlan,
  CuttingScenarioType,
  ScenarioDetail,
} from '@/types/mp-optimization'
import {
  generateCuttingScenarios,
  DEFAULT_OPTIMIZATION_PARAMETERS,
} from '@/services/mp-optimization-engine'
import { MP3DCanvasViewer } from '@/components/mp-optimization/MP3DCanvasViewer'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Scissors,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Send,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

export const MPCuttingPlanPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [selectedPlate, setSelectedPlate] = useState<MPDimensionalItem | null>(null)
  const [scenarios, setScenarios] = useState<Record<CuttingScenarioType, ScenarioDetail> | null>(
    null,
  )
  const [selectedScenarioType, setSelectedScenarioType] =
    useState<CuttingScenarioType>('RECOMENDADO_IA')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false)

  const loadData = async () => {
    try {
      const inv = await mpOptimizationService.getDimensionalInventory()
      setItems(inv)
      if (inv.length > 0) {
        setSelectedPlate(inv[0])
      }
    } catch (err) {
      console.warn(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGeneratePlan = () => {
    if (!selectedPlate) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma Placa Selecionada',
        description: 'Selecione uma placa ou bloco rastreável do estoque para otimizar.',
      })
      return
    }

    setIsGenerating(true)
    setTimeout(() => {
      // Simulação de demandas da carteira SAP para o corte
      const demands = [
        {
          order_number: 'ORD-70891',
          application: 'APL_LAM_ESTRUTURAL',
          width_mm: 550,
          length_mm: 1400,
          qty: 1,
          weight_kg: 1800,
        },
        {
          order_number: 'ORD-70892',
          application: 'APL_LAM_ESTRUTURAL',
          width_mm: 550,
          length_mm: 1400,
          qty: 1,
          weight_kg: 1800,
        },
      ]

      const results = generateCuttingScenarios(
        selectedPlate,
        demands,
        DEFAULT_OPTIMIZATION_PARAMETERS,
      )
      setScenarios(results)
      setIsGenerating(false)
      toast({
        title: '6 Cenários Gerados com Sucesso',
        description: 'Cenários comparados com pesos balanceados e cálculo de explicabilidade IA.',
      })
    }, 400)
  }

  const handleRequestApproval = async () => {
    if (!scenarios || !selectedPlate) return

    setIsSubmittingApproval(true)
    try {
      const activeScen = scenarios[selectedScenarioType]
      const planCode = `PLN-CORTE-${Date.now()}`

      // Salva o plano
      await mpOptimizationService.createCuttingPlan({
        plan_code: planCode,
        version: 1,
        title: `Plano de Corte ${selectedPlate.block_number || selectedPlate.material_code} — ${activeScen.name}`,
        status: 'PENDENTE_APROVACAO',
        selected_scenario: selectedScenarioType,
        source_plates_count: 1,
        total_input_weight_tons: Number(((selectedPlate.weight_kg || 4000) / 1000).toFixed(2)),
        total_output_weight_tons: Number(
          (((selectedPlate.weight_kg || 4000) * (activeScen.yield_pct / 100)) / 1000).toFixed(2),
        ),
        overall_yield_pct: activeScen.yield_pct,
        overall_ai_score: activeScen.score_ia,
        created_by_user_id: user?.id,
        created_by_user_name: user?.name || user?.email || 'Programador PCP',
      })

      // Cria solicitação formal de aprovação
      await mpOptimizationService.createWorkflowApproval({
        approval_code: `APPR-${Date.now()}`,
        approval_type: 'PLANO_CORTE',
        entity_ref_id: planCode,
        title: `Aprovação de Plano de Corte — ${selectedPlate.block_number}`,
        block_number: selectedPlate.block_number,
        original_application: selectedPlate.original_application,
        stage_pcp_status: 'PENDENTE',
        stage_quality_status: 'NAO_APLICAVEL',
        stage_production_status: 'PENDENTE',
        overall_status: 'EM_ANALISE',
        ai_recommendation_summary: `Score IA ${activeScen.score_ia}/100. Rendimento ${activeScen.yield_pct}%, Sucata ${activeScen.scrap_pct}%.`,
      })

      toast({
        title: 'Plano Submetido para Aprovação',
        description: 'Encaminhado ao painel de aprovações com fluxo de governança em 2 fases.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Solicitar Aprovação',
        description: err.message,
      })
    } finally {
      setIsSubmittingApproval(false)
    }
  }

  const activeScenario = scenarios ? scenarios[selectedScenarioType] : null

  return (
    <MPModuleLayout currentStep={4}>
      {/* Header com Ações do Motor IA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#004C97]" />
            Motor de Corte Multi-Placas & Comparador de Cenários
          </h2>
          <p className="text-xs text-slate-500">
            Avalia dimensões reais, kerf, aparas, sobremetal, tolerâncias, rendimento, sucata,
            sobras reutilizáveis e carteira.
          </p>
        </div>

        <Button
          onClick={handleGeneratePlan}
          disabled={isGenerating || !selectedPlate}
          className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isGenerating ? 'Calculando Otimização Global...' : 'GERAR MELHOR PLANO COM IA'}
        </Button>
      </div>

      {items.length === 0 ? (
        <SapEmptyState
          title="AGUARDANDO INTEGRAÇÃO SAP"
          description="Não há placas ou blocos cadastrados no estoque físico do SAP para planejar o corte."
          sapTransaction="ZPP86 / ZMM029"
          onRefresh={loadData}
        />
      ) : (
        <div className="space-y-4">
          {/* Seletor de Placa / Bloco de Origem */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
              1. Selecionar Placa / Bloco de Origem do Estoque
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {items.map((it) => {
                const isSel = selectedPlate?.id === it.id
                return (
                  <div
                    key={it.id}
                    onClick={() => {
                      setSelectedPlate(it)
                      setScenarios(null)
                    }}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSel
                        ? 'border-[#004C97] bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span>Bloco {it.block_number || it.material_code}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {it.steel_grade || 'Aço SAP'}
                      </Badge>
                    </div>
                    <div className="font-mono text-slate-600 text-[11px]">
                      {it.thickness_mm} × {it.width_mm} × {it.length_mm} mm &bull;{' '}
                      <strong>{it.weight_kg} kg</strong>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">
                      Aplicação: <strong>{it.current_application}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comparação dos 6 Cenários Gerados */}
          {scenarios && activeScenario && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    2. Comparação Lado a Lado dos Cenários da IA
                  </span>
                  <Badge className="bg-blue-50 text-[#004C97] border-blue-300 text-xs font-bold font-mono">
                    Score do Cenário: {activeScenario.score_ia} / 100
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {(Object.keys(scenarios) as CuttingScenarioType[])
                    .filter((k) => k !== 'PERSONALIZADO_HUMANO')
                    .map((scenKey) => {
                      const sc = scenarios[scenKey]
                      const isSel = selectedScenarioType === scenKey
                      return (
                        <div
                          key={scenKey}
                          onClick={() => setSelectedScenarioType(scenKey)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                            isSel
                              ? 'border-[#004C97] bg-blue-50/80 shadow-xs ring-2 ring-[#004C97]'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-[11px] leading-tight mb-1">
                              {sc.name}
                            </div>
                            <div className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                              {sc.description}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200/80 font-mono text-[10px] space-y-0.5">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Rendimento:</span>
                              <span className="font-bold text-emerald-700">{sc.yield_pct}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Sucata:</span>
                              <span className="text-slate-700">{sc.scrap_pct}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Sobra Útil:</span>
                              <span className="font-bold text-[#004C97]">
                                {sc.reusable_leftover_pct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Detalhes e 3D do Cenário Selecionado */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8">
                  <MP3DCanvasViewer
                    title={`Plano de Corte 3D — ${activeScenario.name}`}
                    plate={
                      selectedPlate
                        ? {
                            thickness: selectedPlate.thickness_mm,
                            width: selectedPlate.width_mm,
                            length: selectedPlate.length_mm,
                            weight: selectedPlate.weight_kg,
                            label: `Placa ${selectedPlate.block_number}`,
                          }
                        : undefined
                    }
                    pieces={activeScenario.pieces_generated}
                  />
                </div>

                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#004C97]" />
                    <span>Resumo Técnico & Governança</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Massa de Entrada:</span>
                      <span className="font-bold text-slate-900">
                        {activeScenario.total_weight_tons} t
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Massa Útil Cortada:</span>
                      <span className="font-bold text-emerald-800">
                        {(
                          (activeScenario.total_weight_tons * activeScenario.yield_pct) /
                          100
                        ).toFixed(2)}{' '}
                        t
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sobra Reutilizável:</span>
                      <span className="font-bold text-[#004C97]">
                        {(
                          (activeScenario.total_weight_tons *
                            activeScenario.reusable_leftover_pct) /
                          100
                        ).toFixed(2)}{' '}
                        t
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sucata Projetada:</span>
                      <span className="text-slate-700">
                        {(
                          (activeScenario.total_weight_tons * activeScenario.scrap_pct) /
                          100
                        ).toFixed(2)}{' '}
                        t
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1">
                    <span className="font-bold text-[#004C97] block">Aprovação Obrigatória</span>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Nenhum corte é enviado ao SAP sem revisão e aprovação formal do Programador
                      PCP.
                    </p>
                  </div>

                  <Button
                    onClick={handleRequestApproval}
                    disabled={isSubmittingApproval}
                    className="w-full bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-2 py-2.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSubmittingApproval ? 'Submetendo...' : 'SOLICITAR APROVAÇÃO DO PLANO'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </MPModuleLayout>
  )
}
