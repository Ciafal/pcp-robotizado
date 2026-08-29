import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Sparkles, Layers, Check } from 'lucide-react'
import {
  WeeklyScheduleScenario,
  WeeklyScheduleItem,
  WeeklyIndicators,
} from '@/types/weekly-schedule'

interface CreateScenarioModalProps {
  isOpen: boolean
  onClose: () => void
  currentItems: WeeklyScheduleItem[]
  currentIndicators: WeeklyIndicators
  existingScenarioCodes: string[]
  onCreateScenario: (newScenario: WeeklyScheduleScenario) => void
}

export const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({
  isOpen,
  onClose,
  currentItems,
  currentIndicators,
  existingScenarioCodes,
  onCreateScenario,
}) => {
  // Próximo código disponível: A, B, C...
  const nextCode = ['A', 'B', 'C', 'D'].find((c) => !existingScenarioCodes.includes(c)) || 'B'

  const [scenarioCode, setScenarioCode] = useState<string>(nextCode)
  const [scenarioName, setScenarioName] = useState<string>(
    nextCode === 'B'
      ? 'Cenário Otimizado por Família'
      : nextCode === 'C'
        ? 'Cenário Prioridade MTO'
        : `Cenário Alternativo ${nextCode}`,
  )
  const [description, setDescription] = useState<string>(
    nextCode === 'B'
      ? 'Agrupa bitolas afins para minimizar setups e transferir volume excedente.'
      : 'Priorização de pedidos de clientes sob encomenda e atendimento a prazos críticos.',
  )

  const handleCreate = () => {
    const prodItems = currentItems.filter((i) => i.item_type === 'PRODUCTION')
    const totalTons = prodItems.reduce((s, it) => s + (it.planned_quantity_tons || 0), 0)

    const newScenario: WeeklyScheduleScenario = {
      id: `scen-${Date.now()}`,
      scenario_code: scenarioCode,
      scenario_name: scenarioName,
      description,
      schedule_code: currentItems[0]?.schedule_code || `WS-L1-2026-W35`,
      line_code: currentItems[0]?.line_code || 'L1',
      year: currentItems[0]?.year || 2026,
      week_number: currentItems[0]?.week_number || 35,
      is_active: false,
      items_snapshot: currentItems.map((item) => ({ ...item, scenario_id: scenarioCode })),
      metrics_snapshot: {
        productionTons: totalTons,
        utilizationPct: currentIndicators.utilizationPct,
        setupHours: currentIndicators.setupHours,
        switchesCount: Math.max(1, prodItems.length - 1),
        rawMaterialRiskCount: currentIndicators.rawMaterialRedCount || 0,
        ordersMetCount: prodItems.length,
        ordersTotalCount: prodItems.length,
        sequenceEfficiencyPct: currentIndicators.sequenceScore,
      },
      ai_recommendation: {
        isRecommended: scenarioCode === 'B',
        score: scenarioCode === 'B' ? 95 : 88,
        rationale:
          scenarioCode === 'B'
            ? 'Otimização com redução de 45 minutos de setup por agrupamento de famílias de tubos quadrados e retangulares.'
            : 'Atendimento estrito da carteira comercial com prioridade para entregas com prazos contratuais.',
      },
    }

    onCreateScenario(newScenario)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border-slate-200 text-slate-800 p-6">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-slate-900">
                Criar Novo Cenário Alternativo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gere um snapshot (Cenário A, B ou C) para testar sequências alternativas sem perder
                a programação original.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Identificador do Cenário</label>
            <div className="flex items-center gap-2">
              {['A', 'B', 'C'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setScenarioCode(code)}
                  className={`flex-1 py-1.5 px-3 rounded-md font-bold text-xs border text-center transition-all ${
                    scenarioCode === code
                      ? 'bg-[#004C97] text-white border-[#004C97]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Cenário {code}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Nome do Cenário</label>
            <Input
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="text-xs h-9 bg-slate-50 border-slate-300"
              placeholder="Ex: Cenário Otimizado por Família"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Descrição / Hipótese</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs bg-slate-50 border-slate-300"
              placeholder="Descreva as premissas deste cenário..."
            />
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-900">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-[11px] leading-tight">
              O novo cenário herdará os {currentItems.length} itens atuais para que você possa
              reordenar e simular.
            </span>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onClose} className="text-xs h-9">
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold h-9"
          >
            Salvar e Ativar Cenário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default CreateScenarioModal
