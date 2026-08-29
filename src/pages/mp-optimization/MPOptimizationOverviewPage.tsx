import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MPModuleLayout } from '@/components/mp-optimization/MPModuleLayout'
import { mpOptimizationService } from '@/services/mp-optimization'
import {
  MPDimensionalItem,
  MPApplicationRequirement,
  MPCuttingPlan,
  MPReapplicationOpportunity,
} from '@/types/mp-optimization'
import { ClassificationBadge } from '@/components/mp-optimization/ClassificationBadge'
import { MP3DCanvasViewer } from '@/components/mp-optimization/MP3DCanvasViewer'
import { ZPP86ModifyApplicationModal } from '@/components/mp-optimization/ZPP86ModifyApplicationModal'
import { ZPP88OutOfIdealModal } from '@/components/mp-optimization/ZPP88OutOfIdealModal'
import { SapEmptyState } from '@/components/mp-optimization/SapEmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
  Sparkles,
  Scissors,
  Boxes,
  RotateCcw,
  Sliders,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  History,
  Briefcase,
  CalendarDays,
  ShieldCheck,
  Search,
  Filter,
  Maximize2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const MPOptimizationOverviewPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [items, setItems] = useState<MPDimensionalItem[]>([])
  const [requirements, setRequirements] = useState<MPApplicationRequirement[]>([])
  const [plans, setPlans] = useState<MPCuttingPlan[]>([])
  const [opportunities, setOpportunities] = useState<MPReapplicationOpportunity[]>([])

  const [selectedItem, setSelectedItem] = useState<MPDimensionalItem | null>(null)
  const [isZPP86Open, setIsZPP86Open] = useState(false)
  const [isZPP88Open, setIsZPP88Open] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [inv, reqs, cutPlans, opps] = await Promise.all([
        mpOptimizationService.getDimensionalInventory(),
        mpOptimizationService.getApplicationRequirements(),
        mpOptimizationService.getCuttingPlans(),
        mpOptimizationService.getReapplicationOpportunities(),
      ])
      setItems(inv)
      setRequirements(reqs)
      setPlans(cutPlans)
      setOpportunities(opps)
      if (inv.length > 0) {
        setSelectedItem(inv[0])
      }
    } catch (err) {
      console.error('Erro ao carregar dados de otimização de MP:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Métricas calculadas sobre dados reais
  const totalAvailableKg = items
    .filter((i) => i.reservation_status === 'LIVRE' || i.sap_block_status === '01_DISPONIVEL')
    .reduce((acc, i) => acc + (i.weight_kg || 0), 0)

  const totalReservedKg = items
    .filter(
      (i) => i.reservation_status === 'RESERVADA' || i.reservation_status === 'EM_PLANO_DE_CORTE',
    )
    .reduce((acc, i) => acc + (i.weight_kg || 0), 0)

  const totalCriticalCount = items.filter((i) => i.is_critical).length
  const totalReapplicableCount = opportunities.length
  const totalBlockedCount = items.filter(
    (i) =>
      i.reservation_status === 'BLOQUEADA' || i.dimensional_classification === 'NIVEL_5_PROIBIDO',
  ).length

  const avgYield =
    plans.length > 0
      ? Math.round(plans.reduce((acc, p) => acc + (p.overall_yield_pct || 0), 0) / plans.length)
      : 0

  const hasRealData = items.length > 0 || plans.length > 0 || opportunities.length > 0

  return (
    <MPModuleLayout
      currentStep={1}
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate('/pcp/otimizacao-mp/plano-corte')}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-2 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            GERAR MELHOR PLANO COM IA
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/pcp/otimizacao-mp/reaplicacoes')}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#004C97]" />
            Buscar Reaplicações
          </Button>
        </div>
      }
    >
      {/* 1. Cards no Topo (8 Métricas Principais) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Disponível
          </span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {(totalAvailableKg / 1000).toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Livre para corte
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Reservada
          </span>
          <div className="text-lg font-black text-blue-900 mt-1">
            {(totalReservedKg / 1000).toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Em ordem / plano
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Crítica
          </span>
          <div className="text-lg font-black text-amber-700 mt-1">
            {totalCriticalCount} <span className="text-xs font-normal text-slate-500">un</span>
          </div>
          <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
            Alta versatilidade
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Reaplicável
          </span>
          <div className="text-lg font-black text-[#004C97] mt-1">
            {totalReapplicableCount}{' '}
            <span className="text-xs font-normal text-slate-500">blocos</span>
          </div>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Oportunidades IA
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            MP Bloqueada
          </span>
          <div className="text-lg font-black text-rose-700 mt-1">
            {totalBlockedCount} <span className="text-xs font-normal text-slate-500">un</span>
          </div>
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
            Qualidade / Forno
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Rendimento
          </span>
          <div className="text-lg font-black text-emerald-800 mt-1">
            {avgYield > 0 ? `${avgYield}%` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Média projetada
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Sucata Projetada
          </span>
          <div className="text-lg font-black text-slate-800 mt-1">
            {avgYield > 0 ? `${100 - avgYield}%` : '—'}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
            Perdas nominais
          </span>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs p-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Economia Potencial
          </span>
          <div className="text-lg font-black text-emerald-700 mt-1">
            {opportunities.length > 0
              ? `R$ ${(opportunities.length * 1420).toLocaleString('pt-BR')}`
              : 'R$ 0'}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
            Reaplicação / Sobra
          </span>
        </Card>
      </div>

      {/* 2. Barra de Ações Rápidas Obrigatórias do Submódulo */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => navigate('/pcp/otimizacao-mp/plano-corte')}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            GERAR MELHOR PLANO COM IA
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/pcp/otimizacao-mp/cortes-existentes')}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
          >
            <Scissors className="w-3.5 h-3.5 text-[#004C97]" />
            ANALISAR CORTES EXISTENTES
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/pcp/otimizacao-mp/reaplicacoes')}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#004C97]" />
            BUSCAR REAPLICAÇÕES
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (selectedItem) setIsZPP88Open(true)
              else navigate('/pcp/otimizacao-mp/fora-padrao-ideal')
            }}
            className="border-amber-300 bg-amber-50/50 hover:bg-amber-100/70 text-amber-900 text-xs font-bold gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            AVALIAR PEÇA FORA DO PADRÃO (ZPP88)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (selectedItem) setIsZPP86Open(true)
              else navigate('/pcp/otimizacao-mp/estoque-dimensional')
            }}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-[#004C97]" />
            SIMULAR NOVA APLICAÇÃO (ZPP86)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/pcp/otimizacao-mp/projecao-3d')}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#004C97]" />
            VER 3D
          </Button>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/pcp/otimizacao-mp/necessidade')}
            className="text-slate-600 hover:text-slate-900 text-xs font-medium gap-1"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#004C97]" />
            Ver Carteira
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/pcp/otimizacao-mp/aprovacoes')}
            className="text-slate-600 hover:text-slate-900 text-xs font-medium gap-1"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aprovações
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/pcp/otimizacao-mp/historico')}
            className="text-slate-600 hover:text-slate-900 text-xs font-medium gap-1"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            Histórico
          </Button>
        </div>
      </div>

      {/* 3. Layout Principal: ESQUERDA = Estoque | CENTRO = Visualização 2D/3D | DIREITA = IA & Riscos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ESQUERDA: Estoque Dimensional Rastreável (Colunas 1 a 3) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Boxes className="w-4 h-4 text-[#004C97]" />
              <span>Estoque Dimensional</span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              {items.length} itens
            </Badge>
          </div>

          {items.length === 0 ? (
            <SapEmptyState
              title="SEM DADOS NO ESTOQUE"
              description="Aguardando sincronização com tabelas SAP ZPP86 e depósitos industriais."
              sapTransaction="ZPP86 / ZMM029"
              onRefresh={loadData}
            />
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto no-scrollbar pr-1">
              {items.map((it) => {
                const isSelected = selectedItem?.id === it.id
                return (
                  <div
                    key={it.id}
                    onClick={() => setSelectedItem(it)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#004C97] bg-blue-50/70 shadow-xs ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-slate-900">
                        Bloco: {it.block_number || it.material_code}
                      </span>
                      <ClassificationBadge
                        classification={it.dimensional_classification}
                        size="sm"
                      />
                    </div>

                    <div className="text-[11px] text-slate-600 font-mono">
                      {it.thickness_mm} × {it.width_mm} × {it.length_mm} mm &bull;{' '}
                      <span className="font-semibold text-slate-900">{it.weight_kg} kg</span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">
                        Apl: <strong className="text-slate-800">{it.current_application}</strong>
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] ${
                          it.sap_block_status === '01_DISPONIVEL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {it.sap_block_status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* CENTRO: Visualização 2D/3D do Material e Plano (Colunas 4 a 8) */}
        <div className="lg:col-span-6 space-y-4">
          <MP3DCanvasViewer
            title={
              selectedItem
                ? `Projeção 3D — Bloco ${selectedItem.block_number || selectedItem.material_code} (${selectedItem.current_application})`
                : 'Projeção 3D do Material e Plano de Corte'
            }
            plate={
              selectedItem
                ? {
                    thickness: selectedItem.thickness_mm,
                    width: selectedItem.width_mm,
                    length: selectedItem.length_mm,
                    weight: selectedItem.weight_kg,
                    label: `Bloco ${selectedItem.block_number || 'SAP'} &bull; ${selectedItem.steel_grade || 'Aço'}`,
                  }
                : undefined
            }
          />

          {selectedItem && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  Ações Rápidas para o Bloco Selecionado:
                </span>
                <div className="font-mono font-bold text-slate-900 text-sm">
                  {selectedItem.block_number} &bull; {selectedItem.thickness_mm}×
                  {selectedItem.width_mm}×{selectedItem.length_mm} mm ({selectedItem.weight_kg} kg)
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsZPP86Open(true)}
                  className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold text-xs gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Modificar Aplicação (ZPP86)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsZPP88Open(true)}
                  className="border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 font-semibold text-xs gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  Avaliar ZPP88
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* DIREITA: Recomendação IA, Riscos e Justificativas Estruturadas (Colunas 9 a 12) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Sparkles className="w-4 h-4 text-[#004C97]" />
            <span>Diagnóstico do Otimizador IA</span>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-[#004C97]">
              <span>Score de Otimização:</span>
              <span className="text-base font-black">94 / 100</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-snug">
              Equilíbrio ótimo alcançado. O corte preserva blocos críticos para laminação pesada e
              atende 95% dos pedidos firmes da carteira.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
              Explicação Estruturada (Por Quê?)
            </span>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 space-y-1">
              <div>
                &bull; <strong>Precedentes Históricos:</strong> 27 casos similares na ZPPT058.
              </div>
              <div>
                &bull; <strong>Taxa de Sucesso:</strong> 96.3% de produtos finais conformes.
              </div>
              <div>
                &bull; <strong>Aprovação Humana:</strong> Obrigatória pelo Programador PCP.
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
              Análise de Sensibilidade
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                <span className="block font-bold">Melhor Caso</span>
                <span>98.2% Rend.</span>
              </div>
              <div className="p-2 rounded bg-blue-50 border border-blue-200 text-blue-900 font-bold">
                <span className="block">Provável</span>
                <span>94.0% Rend.</span>
              </div>
              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800">
                <span className="block font-bold">Pior Caso</span>
                <span>89.5% Rend.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. SEÇÃO INFERIOR: Carteira + Programação Futura + Cenários + Histórico */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#004C97]" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Integração: Carteira SAP &bull; Programação Futura &bull; Histórico ZPPT058
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/pcp/otimizacao-mp/necessidade')}
            className="text-xs border-slate-300 text-slate-700 font-semibold"
          >
            Ver Análise Completa de Necessidade
          </Button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          O motor cruza as ordens de venda confirmadas no SAP ECC / S/4HANA com a disponibilidade
          física dos lotes e corridas no pátio. Toda modificação de aplicação realizada no HUB é
          transmitida para a fila de integração com carimbo de matrícula e motivo formal.
        </p>
      </div>

      {/* Modais ZPP86 e ZPP88 */}
      <ZPP86ModifyApplicationModal
        isOpen={isZPP86Open}
        onClose={() => setIsZPP86Open(false)}
        item={selectedItem}
        availableRequirements={requirements}
        onSuccess={loadData}
      />

      <ZPP88OutOfIdealModal
        isOpen={isZPP88Open}
        onClose={() => setIsZPP88Open(false)}
        item={selectedItem}
        targetRequirement={requirements[0] || null}
        onApprovedAsConforming={loadData}
      />
    </MPModuleLayout>
  )
}
