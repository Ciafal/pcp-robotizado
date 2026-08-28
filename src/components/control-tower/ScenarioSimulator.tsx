import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Zap, Play, CheckCircle2, Sliders, Sparkles, X, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ScenarioSimulator: React.FC = () => {
  const {
    isSimulatorModalOpen,
    setIsSimulatorModalOpen,
    simulateOrderMove,
    sendScenarioForApproval,
    setIsComparisonModalOpen,
    orders,
  } = useControlTower()

  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '')
  const [targetLine, setTargetLine] = useState<string>('L1')
  const [adjustedRate, setAdjustedRate] = useState<number>(75)
  const [simulationNote, setSimulationNote] = useState<string>(
    'Equalização de fluxo para mitigar fila no Acabamento L1',
  )

  const handleRunSimulation = () => {
    simulateOrderMove(selectedOrderId, targetLine, '14:00')
    setIsSimulatorModalOpen(false)
  }

  const handleSendApprovalDirect = () => {
    sendScenarioForApproval(simulationNote)
    setIsSimulatorModalOpen(false)
  }

  return (
    <Dialog open={isSimulatorModalOpen} onOpenChange={setIsSimulatorModalOpen}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Simulador de Cenários & Sequenciamento
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Crie cenários hipotéticos (What-If) alterando cadência, linha, paradas ou sequência sem
            modificar a programação oficial do SAP.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Selecionar Ordem */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Ordem / Campanha para Simulação</Label>
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-white"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber} — {o.lineCode} — {o.materialName} ({o.plannedTons} t)
                </option>
              ))}
            </select>
          </div>

          {/* Selecionar Linha Destino */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Linha / Recurso Destino</Label>
              <select
                value={targetLine}
                onChange={(e) => setTargetLine(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-white"
              >
                <option value="L1">L1 - Laminação</option>
                <option value="L2">L2 - Conformação</option>
                <option value="ACAB_L1">ACAB_L1 - Acabamento L1</option>
                <option value="ACAB_L2">ACAB_L2 - Acabamento L2</option>
                <option value="RETRAB">RETRAB - Célula de Retrabalho</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Cadência Ajustada (t/h)</Label>
              <Input
                type="number"
                value={adjustedRate}
                onChange={(e) => setAdjustedRate(Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white text-xs h-9"
              />
            </div>
          </div>

          {/* Justificativa Técnica */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Premissa / Justificativa do Cenário</Label>
            <Input
              value={simulationNote}
              onChange={(e) => setSimulationNote(e.target.value)}
              placeholder="Descreva a hipótese testada..."
              className="bg-slate-900 border-slate-700 text-white text-xs h-9"
            />
          </div>

          {/* Prévia dos Impactos Estimados */}
          <div className="bg-[#004C97]/20 border border-blue-800/80 p-3 rounded-lg text-[11px] text-blue-200 space-y-1">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Prévia do Motor de IA:
            </span>
            <p>
              A transferência da OP selecionada para a linha <strong>{targetLine}</strong> resultará
              em redução estimada de <strong>-4h no tempo de fila</strong> e evitará saturação do
              buffer a montante.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSimulatorModalOpen(false)
              setIsComparisonModalOpen(true)
            }}
            className="border-slate-800 bg-slate-900 text-blue-400 text-xs"
          >
            Abrir Comparador de Cenários
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSimulatorModalOpen(false)}
              className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleRunSimulation}
              className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
            >
              Executar Simulação
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
