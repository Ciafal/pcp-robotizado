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
      <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-900 text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#004C97]" /> Motor de Inteligência Artificial do
            Sequenciamento
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600">
            Análise preditiva e prescritiva considerando restrições de setup, buffers, materiais e
            carteira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Diagnóstico Estruturado */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-[#004C97]" /> Diagnóstico da IA & Riscos Identificados:
            </h4>

            <div className="space-y-2 text-slate-700 text-[11px] leading-relaxed">
              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Família B (OP-1014)</strong> programada 6 h antes da disponibilidade de
                  matéria-prima (MPL2).
                </span>
              </div>

              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  Sequência atual <strong>A ➔ C ➔ B</strong> gera{' '}
                  <strong>2 setups adicionais</strong> de troca de matriz (+45 min ociosos).
                </span>
              </div>

              <div className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  3
                </span>
                <span>
                  <strong>Acabamento L1</strong> operará acima de 100 % de ocupação entre as 18:00 e
                  02:00, saturando buffer térmico.
                </span>
              </div>

              {/* Qualidade / Ultrassom */}
              <div className="flex items-start gap-2 bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
                <span className="w-5 h-5 rounded-full bg-[#004C97] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                  4
                </span>
                <div className="space-y-1 flex-1">
                  <div>
                    <strong>Capacidade de Ultrassom (US) & Ensaios Mecânicos (EM)</strong>:
                    Terça-feira acumula 12 ensaios de Ultrassom para tubos e perfis MTO, acima da
                    capacidade nominal diária do laboratório (10 ensaios/dia). Risco de bloqueio de
                    liberação da OP-2026-1015.
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.5 rounded font-bold">
                      Classificação: MTO Crítico
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                      Hierarquia de Requisitos: Validada
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternativa Recomendada */}
          <div className="bg-blue-50/50 border border-blue-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#004C97] text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#004C97]" /> Prescrição Otimizada: Sequência A ➔
                B ➔ C
              </span>
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                Confiança: 91 %
              </Badge>
            </div>

            <p className="text-[11px] text-slate-700">
              Impacto projetado:{' '}
              <strong className="text-emerald-800">
                -2 trocas de setup &bull; +3,2 % aderência &bull; -4 h atraso &bull; -120 t no
                buffer
              </strong>
            </p>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleSimulateAlternative}
                className="bg-[#004C97] hover:bg-[#003870] text-white font-bold text-xs gap-1.5 shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 fill-white" /> Simular Alternativa Recomendada
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAIPanelOpen(false)}
            className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs"
          >
            Fechar Diagnóstico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
