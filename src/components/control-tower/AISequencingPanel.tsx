import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  Sparkles,
  Zap,
  Cpu,
  ShieldCheck,
  Microscope,
  Award,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
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

export const AISequencingPanel: React.FC = () => {
  const { isAIPanelOpen, setIsAIPanelOpen, simulateOrderMove } = useControlTower()

  const handleSimulateAlternative = () => {
    simulateOrderMove('ord-104', 'L2', '18:00')
    setIsAIPanelOpen(false)
  }

  return (
    <Dialog open={isAIPanelOpen} onOpenChange={setIsAIPanelOpen}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" /> Motor de Inteligência Artificial do
            Sequenciamento
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Análise preditiva e prescritiva considerando restrições de setup, buffers, materiais e
            carteira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Exemplo Solicitado no Prompt */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#004C97]" /> Diagnóstico IA & Riscos Identificados:
            </h4>

            <div className="space-y-2 text-slate-300 text-[11px] leading-relaxed">
              <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded border border-slate-850">
                <span className="w-5 h-5 rounded-full bg-rose-950 border border-rose-700 text-rose-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Família B (OP-1014)</strong> programada 6h antes da disponibilidade de
                  matéria-prima (MPL2).
                </span>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded border border-slate-850">
                <span className="w-5 h-5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  Sequência atual <strong>A ➔ C ➔ B</strong> gera{' '}
                  <strong>2 setups adicionais</strong> de troca de matriz (+45 min ociosos).
                </span>
              </div>

              <div className="flex items-start gap-2 bg-slate-950/60 p-2 rounded border border-slate-850">
                <span className="w-5 h-5 rounded-full bg-orange-950 border border-orange-700 text-orange-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>
                  <strong>Acabamento L1</strong> operará acima de 100% de ocupação entre as 18:00 e
                  02:00, saturando buffer térmico.
                </span>
              </div>

              {/* Novo Ponto Crítico de Qualidade / Ultrassom */}
              <div className="flex items-start gap-2 bg-blue-950/40 p-2 rounded border border-blue-900">
                <span className="w-5 h-5 rounded-full bg-blue-900 border border-cyan-500 text-cyan-200 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <span>
                  <strong>Capacidade de Ultrassom (US)</strong>: Terça-feira acumula 12 ensaios de
                  Ultrassom para tubos e perfis MTO, acima da capacidade nominal diária do
                  laboratório (10 ensaios/dia). Risco de atraso de liberação da OP-2026-1015.
                </span>
              </div>
            </div>
          </div>

          {/* Alternativa Recomendada */}
          <div className="bg-[#004C97]/20 border border-blue-800/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-300" /> Prescrição Otimizada: Sequência A ➔ B
                ➔ C
              </span>
              <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px]">
                Confiança: 91%
              </Badge>
            </div>

            <p className="text-[11px] text-blue-100">
              Impacto projetado:{' '}
              <strong className="text-emerald-400">
                -2 trocas de setup &bull; +3,2% aderência &bull; -4h atraso &bull; -120 t no buffer
              </strong>
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleSimulateAlternative}
                className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" /> Simular Alternativa Recomendada
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAIPanelOpen(false)}
            className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
          >
            Fechar Diagnóstico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
