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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { RollShopDemand, RollShopReadinessStatus } from '@/types/roll-shop'
import { rollShopSetupService } from '@/services/roll-shop-service'
import { useToast } from '@/hooks/use-toast'
import {
  Wrench,
  Clock,
  Settings2,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Info,
  ShieldCheck,
  Send,
  Flame,
  Activity,
} from 'lucide-react'

interface SetupDetailModalProps {
  isOpen: boolean
  onClose: () => void
  item: WeeklyScheduleItem | null
  demand?: RollShopDemand | null
  onSaveNotes?: (notes: string) => void
  onDemandUpdated?: () => void
}

export const SetupDetailModal: React.FC<SetupDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  demand: initialDemand,
  onSaveNotes,
  onDemandUpdated,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<
    'IDENTIFICACAO' | 'TEMPOS' | 'RECURSOS' | 'OFICINA_SMED' | 'INTEGRACOES'
  >('IDENTIFICACAO')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!item) return null

  const breakdown = item.setup_breakdown
  const fromMaterial = breakdown?.from_material_code || 'Início da Campanha'
  const toMaterial = item.material_code
  const fromFamily = breakdown?.from_family_code || 'TQ_LEVES'
  const toFamily = item.family_code || 'TR_LEVES'

  const changeMin =
    breakdown?.planned_change_minutes || Math.round((item.setup_duration_minutes || 30) * 0.65)
  const tuningMin =
    breakdown?.planned_tuning_minutes ||
    Math.max(5, (item.setup_duration_minutes || 30) - changeMin)
  const totalMin = changeMin + tuningMin

  const realizedChange = breakdown?.realized_change_minutes ?? changeMin + 2
  const realizedTuning = breakdown?.realized_tuning_minutes ?? tuningMin + 1
  const realizedTotal = realizedChange + realizedTuning
  const devMinutes = realizedTotal - totalMin
  const devPct = Number(((devMinutes / totalMin) * 100).toFixed(1))

  const readiness: RollShopReadinessStatus =
    initialDemand?.readiness_status || breakdown?.readiness_status || 'READY'

  const handleUpdateReadiness = (status: RollShopReadinessStatus) => {
    setIsSubmitting(true)
    if (initialDemand) {
      rollShopSetupService.updateDemandStatus(initialDemand.id, status, feedbackNote || undefined)
    }
    setTimeout(() => {
      setIsSubmitting(false)
      toast({
        title: 'Status da Oficina de Cilindros Atualizado',
        description: `O status do ferramental foi atualizado para ${status}. Feedback enviado ao PCP.`,
      })
      if (onDemandUpdated) onDemandUpdated()
    }, 300)
  }

  const getReadinessBadge = (st: RollShopReadinessStatus) => {
    switch (st) {
      case 'READY':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 PRONTO P/ TROCA
          </Badge>
        )
      case 'IN_PREPARATION':
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> 🟡 EM PREPARAÇÃO
          </Badge>
        )
      case 'DELAY_RISK':
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> 🔴 RISCO DE ATRASO
          </Badge>
        )
      case 'BLOCKED_UNAVAILABLE':
        return (
          <Badge className="bg-slate-900 text-white font-medium flex items-center gap-1">
            ⛔ RISCO / SETUP NÃO VIÁVEL
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-slate-600 border-slate-300">
            ⚫ NÃO INICIADO
          </Badge>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-slate-200 shadow-xl">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-[#004C97]/10 flex items-center justify-center text-[#004C97]">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  Detalhamento de Setup & SMED — Linha {item.line_code}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Gestão integrada de Troca Física, Acerto de Perfil, Oficina de Cilindros e Ciclo
                  Fechado MES
                </DialogDescription>
              </div>
            </div>
            <div>{getReadinessBadge(readiness)}</div>
          </div>
        </DialogHeader>

        {/* Banner do Gargalo se aplicável */}
        {breakdown?.is_bottleneck_resource && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Flame className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">
                Setup no Recurso Gargalo ({breakdown.bottleneck_stage_name || 'Laminação Contínua'}
                ):
              </span>{' '}
              Tempo previsto: <strong className="font-semibold">{totalMin} min</strong> | Capacidade
              nominal:{' '}
              <strong className="font-semibold">
                {breakdown.bottleneck_loss_capacity_th || 24.8} t/h
              </strong>{' '}
              | Throughput potencial indisponível estimado:{' '}
              <span className="font-bold text-rose-700">
                {breakdown.bottleneck_potential_tons || 12.4} t
              </span>
              .
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-5 bg-slate-100 p-1 rounded-lg">
            <TabsTrigger value="IDENTIFICACAO" className="text-xs font-semibold">
              Identificação
            </TabsTrigger>
            <TabsTrigger value="TEMPOS" className="text-xs font-semibold">
              Tempos (Troca × Acerto)
            </TabsTrigger>
            <TabsTrigger value="RECURSOS" className="text-xs font-semibold">
              Cilindros & Recursos
            </TabsTrigger>
            <TabsTrigger value="OFICINA_SMED" className="text-xs font-semibold">
              Oficina & SMED
            </TabsTrigger>
            <TabsTrigger value="INTEGRACOES" className="text-xs font-semibold">
              MES & Ciclo Fechado
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: IDENTIFICAÇÃO */}
          <TabsContent value="IDENTIFICACAO" className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Produto Anterior
                </span>
                <div className="text-base font-bold text-slate-900">{fromMaterial}</div>
                <div className="text-xs text-slate-600">
                  Família: <span className="font-semibold">{fromFamily}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Dimensões: {item.setup_breakdown?.from_material_code ? '50x50x2.0 mm' : 'Início'}
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-lg border border-blue-200 space-y-2">
                <span className="text-xs font-bold text-[#004C97] uppercase tracking-wider flex items-center gap-1">
                  Produto Seguinte <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <div className="text-base font-bold text-slate-900">{toMaterial}</div>
                <div className="text-xs text-slate-700">
                  Família: <span className="font-semibold text-[#004C97]">{toFamily}</span>
                </div>
                <div className="text-xs text-slate-600">Descrição: {item.material_description}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="text-slate-500 block">Data e Horário Previsto:</span>
                <span className="font-bold text-slate-800">
                  {item.start_datetime || '24/08/2026 10:15'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Turno / Turma:</span>
                <span className="font-bold text-slate-800">1º Turno (Turma A)</span>
              </div>
              <div>
                <span className="text-slate-500 block">Área Responsável:</span>
                <span className="font-bold text-[#004C97]">
                  {breakdown?.responsible_area === 'OFICINA_CILINDROS'
                    ? 'Oficina de Cilindros + Produção'
                    : 'Operação de Laminação'}
                </span>
              </div>
            </div>

            {breakdown?.is_missing_standard_param && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Aviso:</strong> Tempo de setup não cadastrado especificamente na Ficha
                  Mestre para esta combinação exata. Foi aplicada heurística padrão CIAFAL (
                  {totalMin} min).
                </span>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: TEMPOS (TROCA X ACERTO) */}
          <TabsContent value="TEMPOS" className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 uppercase font-semibold">
                  1. Troca Prevista (Mecânica)
                </span>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {changeMin} <span className="text-sm font-normal">min</span>
                </div>
                <span className="text-[11px] text-slate-500">
                  Troca de cilindros, guias e rolos
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 uppercase font-semibold">
                  2. Acerto Previsto (Metrologia)
                </span>
                <div className="text-2xl font-black text-[#004C97] mt-1">
                  {tuningMin} <span className="text-sm font-normal">min</span>
                </div>
                <span className="text-[11px] text-slate-500">Regulagem dimensional e teste</span>
              </div>
              <div className="p-4 bg-[#004C97]/10 rounded-lg border border-[#004C97]/30 text-center">
                <span className="text-xs text-[#004C97] uppercase font-bold">
                  Tempo Total de Setup
                </span>
                <div className="text-2xl font-black text-[#004C97] mt-1">
                  {totalMin} <span className="text-sm font-normal">min</span>
                </div>
                <span className="text-[11px] text-[#004C97]/80">
                  Troca ({changeMin} min) + Acerto ({tuningMin} min)
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3 space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Detalhamento Completo das Fases de Setup (Lista Mestra / SMED)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    1. Preparação e separação externa (Oficina de Cilindros):
                  </span>
                  <span className="font-semibold text-emerald-700">25 min (Linha operando)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">2. Troca física de gaiolas e conjuntos:</span>
                  <span className="font-semibold text-slate-800">
                    {changeMin} min (Linha parada)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">3. Posicionamento e regulagem de guias:</span>
                  <span className="font-semibold text-slate-800">5 min (Linha parada)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-600">
                    4. Acerto inicial de perfil e passagem de barra teste:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {tuningMin} min (Linha em acerto)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">
                    5. Inspeção metrológica e liberação pelo CQ:
                  </span>
                  <span className="font-semibold text-slate-800">5 min</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: RECURSOS E CILINDROS */}
          <TabsContent value="RECURSOS" className="space-y-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Conjunto de Cilindros Necessário
                  </span>
                  <h4 className="text-base font-bold text-[#004C97]">
                    {breakdown?.cylinder_set_code || 'CJ-L1-CAN-204'} —{' '}
                    {breakdown?.cylinder_set_name || 'Cilindros Laminação'}
                  </h4>
                </div>
                <Badge variant="outline" className="text-xs bg-white text-slate-700">
                  Posições: Gaiola 1, 2, 3 e Acabador
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-500 block">Guias & Ferramentas:</span>
                  <span className="font-semibold text-slate-800">GD-STD-2026 / FER-ACERTO-01</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Máquina de Preparação / Usinagem:</span>
                  <span className="font-semibold text-slate-800">
                    Torno CNC Roll-02 (Oficina Cilindros)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Equipe Alocada:</span>
                  <span className="font-semibold text-slate-800">
                    Equipe Turno Matutino - Turma A
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Conjunto Alternativo Homologado:</span>
                  <span className="font-semibold text-emerald-700">
                    CJ-L1-CAN-200-ALT (Disponível)
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: OFICINA & SMED */}
          <TabsContent value="OFICINA_SMED" className="space-y-4 pt-2">
            <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#004C97] block">
                  Cronograma SMED Integrado
                </span>
                <span className="text-xs text-slate-600">
                  Prazo limite de preparação externa:{' '}
                  <strong className="font-bold text-slate-900">
                    2 horas antes da parada da linha
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Status de Prontidão</span>
                {getReadinessBadge(readiness)}
              </div>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-lg p-3">
              <span className="text-xs font-bold text-slate-700 block">
                Atualizar Status de Prontidão da Oficina
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={readiness === 'READY' ? 'default' : 'outline'}
                  className={
                    readiness === 'READY'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs'
                      : 'text-xs'
                  }
                  onClick={() => handleUpdateReadiness('READY')}
                  disabled={isSubmitting}
                >
                  🟢 100% Pronto
                </Button>
                <Button
                  size="sm"
                  variant={readiness === 'IN_PREPARATION' ? 'default' : 'outline'}
                  className={
                    readiness === 'IN_PREPARATION'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white text-xs'
                      : 'text-xs'
                  }
                  onClick={() => handleUpdateReadiness('IN_PREPARATION')}
                  disabled={isSubmitting}
                >
                  🟡 Em Preparação
                </Button>
                <Button
                  size="sm"
                  variant={readiness === 'DELAY_RISK' ? 'default' : 'outline'}
                  className={
                    readiness === 'DELAY_RISK'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white text-xs'
                      : 'text-xs'
                  }
                  onClick={() => handleUpdateReadiness('DELAY_RISK')}
                  disabled={isSubmitting}
                >
                  🔴 Risco de Atraso
                </Button>
              </div>

              <div className="pt-2">
                <label className="text-xs text-slate-600 block mb-1">
                  Notas / Feedback da Oficina para o PCP:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Ex: Cilindro em passe final de usinagem, liberação prevista às 10:00..."
                    className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#004C97]"
                  />
                  <Button
                    size="sm"
                    className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs"
                    onClick={() => handleUpdateReadiness(readiness)}
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Enviar
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: MES E CICLO FECHADO */}
          <TabsContent value="INTEGRACOES" className="space-y-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase">
                Aderência Previsto × Realizado (MES)
              </span>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Troca Física</span>
                  <div className="text-sm font-bold text-slate-800">Previsto: {changeMin} min</div>
                  <div className="text-sm font-bold text-[#004C97]">Real: {realizedChange} min</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Acerto Dimensional</span>
                  <div className="text-sm font-bold text-slate-800">Previsto: {tuningMin} min</div>
                  <div className="text-sm font-bold text-[#004C97]">Real: {realizedTuning} min</div>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Desvio Total</span>
                  <div
                    className={`text-base font-black ${devMinutes > 0 ? 'text-rose-600' : 'text-emerald-600'}`}
                  >
                    {devMinutes > 0 ? `+${devMinutes}` : devMinutes} min ({devPct}%)
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-white p-3 rounded border border-slate-200 leading-relaxed">
                <strong className="text-slate-800">Ciclo Fechado:</strong> Os tempos reais coletados
                nos coletores MES da linha alimentam o algoritmo de IA para sugerir revisão
                periódica dos tempos cadastrados na Lista Mestra.
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            PCP Robotizado CIAFAL • SMED & Setup Motor v2.4
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
