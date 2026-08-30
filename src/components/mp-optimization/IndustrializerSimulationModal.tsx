import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Sliders, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'

interface SimulationParams {
  metallicYield: number // Ex: 0.93 (93%)
  additionalTransit130: number // Toneladas adicionais de 130x130
  additionalTransit150: number // Toneladas adicionais de 150x150
  delayDaysTransit: number // Dias de atraso do trânsito
  prioritize150WhenPossible: boolean
  ksPreparationSpeedMultiplier: number // 1.0 = normal, 1.2 = acelerado
}

interface IndustrializerSimulationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPhysicalTons: number
  currentTransitTons: number
  currentProgrammedTons: number
  currentRuptureDate?: string
  onApplyScenario?: (scenarioName: string, params: SimulationParams) => void
}

export const IndustrializerSimulationModal: React.FC<IndustrializerSimulationModalProps> = ({
  open,
  onOpenChange,
  currentPhysicalTons,
  currentTransitTons,
  currentProgrammedTons,
  currentRuptureDate,
  onApplyScenario,
}) => {
  const [params, setParams] = useState<SimulationParams>({
    metallicYield: 0.93,
    additionalTransit130: 0,
    additionalTransit150: 0,
    delayDaysTransit: 0,
    prioritize150WhenPossible: true,
    ksPreparationSpeedMultiplier: 1.0,
  })

  // Cálculos do cenário atual
  const baseRequiredMp = currentProgrammedTons / 0.93
  const baseProjectedBalance = currentPhysicalTons + currentTransitTons - baseRequiredMp

  // Cálculos do cenário simulado
  const simRequiredMp = currentProgrammedTons / params.metallicYield
  const simTotalTransit =
    currentTransitTons + params.additionalTransit130 + params.additionalTransit150
  const simProjectedBalance = currentPhysicalTons + simTotalTransit - simRequiredMp

  const deltaBalance = simProjectedBalance - baseProjectedBalance
  const simRuptureResolved = baseProjectedBalance < 0 && simProjectedBalance >= 0

  const handleReset = () => {
    setParams({
      metallicYield: 0.93,
      additionalTransit130: 0,
      additionalTransit150: 0,
      delayDaysTransit: 0,
      prioritize150WhenPossible: true,
      ksPreparationSpeedMultiplier: 1.0,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Simulação de Cenários — MP Industrializador
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Varie chegadas, rendimento contratual, priorização TB-002 e verifique o impacto em
                  rupturas e saldo.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
              Modo Sandbox (Sem impacto oficial)
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quadro de Comparação Rápida */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-3 space-y-1.5 text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Cenário Oficial Atual
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Rendimento Metálico:</span>
                  <span className="font-mono font-bold">93,0% (0,93)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">MP Requerida:</span>
                  <span className="font-mono font-bold">{baseRequiredMp.toFixed(1)} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Projetado:</span>
                  <span
                    className={`font-mono font-black ${
                      baseProjectedBalance < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {baseProjectedBalance.toFixed(1)} t
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data Prevista Ruptura:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {currentRuptureDate || 'Sem ruptura'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/60 border-blue-200">
              <CardContent className="p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#004C97] uppercase tracking-wider text-[10px]">
                    Cenário Simulado (What-If)
                  </span>
                  <Badge
                    className={
                      simProjectedBalance < 0
                        ? 'bg-rose-100 text-rose-700 text-[9px]'
                        : 'bg-emerald-100 text-emerald-800 text-[9px]'
                    }
                  >
                    {simProjectedBalance < 0 ? 'Risco Remanescente' : 'Cobertura Garantida'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Rendimento Simulado:</span>
                  <span className="font-mono font-bold text-[#004C97]">
                    {(params.metallicYield * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">MP Requerida Simulada:</span>
                  <span className="font-mono font-bold">{simRequiredMp.toFixed(1)} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Saldo Projetado Simulado:</span>
                  <span
                    className={`font-mono font-black ${
                      simProjectedBalance < 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {simProjectedBalance.toFixed(1)} t (
                    {deltaBalance >= 0 ? `+${deltaBalance.toFixed(1)}` : deltaBalance.toFixed(1)} t)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Impacto na Ruptura:</span>
                  <span className="font-bold text-slate-900">
                    {simRuptureResolved
                      ? '✅ Ruptura totalmente eliminada'
                      : simProjectedBalance < 0
                        ? '⚠️ Ruptura ainda presente'
                        : 'Estável'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controles de Parâmetros da Simulação */}
          <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
              Ajuste de Variáveis de Simulação
            </span>

            {/* 1. Rendimento Metálico */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-slate-700">Rendimento Metálico Contratual (%)</Label>
                <span className="font-mono font-bold text-[#004C97]">
                  {(params.metallicYield * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[params.metallicYield * 100]}
                min={85}
                max={98}
                step={0.5}
                onValueChange={([val]) => setParams((p) => ({ ...p, metallicYield: val / 100 }))}
              />
            </div>

            {/* 2. Antecipação / Inclusão de Trânsito 130 e 150 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Adicionar MP 130x130 (t)</Label>
                <Input
                  type="number"
                  step="10"
                  value={params.additionalTransit130}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      additionalTransit130: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Adicionar MP 150x150 (t)</Label>
                <Input
                  type="number"
                  step="10"
                  value={params.additionalTransit150}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      additionalTransit150: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* 3. Atraso ou Antecipação de Trânsito */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Deslocamento Trânsito (dias)</Label>
                <Select
                  value={String(params.delayDaysTransit)}
                  onValueChange={(v) =>
                    setParams((p) => ({ ...p, delayDaysTransit: parseInt(v) || 0 }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-3">Antecipar 3 dias (-3d)</SelectItem>
                    <SelectItem value="-1">Antecipar 1 dia (-1d)</SelectItem>
                    <SelectItem value="0">Data Prevista Atual (0d)</SelectItem>
                    <SelectItem value="2">Atrasar 2 dias (+2d)</SelectItem>
                    <SelectItem value="5">Atrasar 5 dias (+5d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-700">Preparação KS / Corte</Label>
                <Select
                  value={String(params.ksPreparationSpeedMultiplier)}
                  onValueChange={(v) =>
                    setParams((p) => ({
                      ...p,
                      ksPreparationSpeedMultiplier: parseFloat(v) || 1.0,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.0">Velocidade Padrão KS (1.0x)</SelectItem>
                    <SelectItem value="1.2">Turno Extra KS (+20% velocidade)</SelectItem>
                    <SelectItem value="1.4">Prioridade Máxima KS (+40%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs text-slate-600 gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApplyScenario?.('Cenário Simulado IA', params)
                onOpenChange(false)
              }}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aplicar à Visão Temporária
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default IndustrializerSimulationModal
