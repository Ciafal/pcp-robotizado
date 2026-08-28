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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  Cpu,
  Sliders,
  Sparkles,
  ShieldAlert,
  Layers,
  Timer,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { OptimizationProfileType, SoftConstraintCategory } from '@/types/optimization-engine'
import {
  optimizationService,
  OPTIMIZATION_PROFILE_PRESETS,
  DEFAULT_OPTIMIZATION_OBJECTIVES,
  HARD_CONSTRAINTS_DEFINITIONS,
} from '@/services/optimization-service'

interface CreateScenarioModalProps {
  isOpen: boolean
  onClose: () => void
  onScenarioCreated: (scenarioId?: string) => void
}

export const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({
  isOpen,
  onClose,
  onScenarioCreated,
}) => {
  const { toast } = useToast()
  const { user, hasLineScope } = useAuth()

  const [activeTab, setActiveTab] = useState<'BASIC' | 'OBJECTIVES' | 'CONSTRAINTS' | 'LINES'>(
    'BASIC',
  )
  const [name, setName] = useState(
    'Simulação Otimizada CP-SAT ' + new Date().toLocaleDateString('pt-BR'),
  )
  const [horizon, setHorizon] = useState<'SEMANAL' | 'MENSAL' | 'DIARIO'>('SEMANAL')
  const [profile, setProfile] = useState<OptimizationProfileType>('BALANCEADO')
  const [assumptions, setAssumptions] = useState(
    'Otimização considerando mitigação de setup e priorização da carteira industrial.',
  )
  const [timeoutSeconds, setTimeoutSeconds] = useState(30)
  const [selectedLines, setSelectedLines] = useState<string[]>([
    'L1',
    'L2',
    'ENF_L1',
    'ACAB_L1',
    'ACAB_L2',
    'ENDIR',
  ])
  const [weights, setWeights] = useState<Record<string, number>>(
    OPTIMIZATION_PROFILE_PRESETS.BALANCEADO.weights,
  )
  const [loading, setLoading] = useState(false)

  const handleProfileChange = (newProfile: OptimizationProfileType) => {
    setProfile(newProfile)
    if (newProfile !== 'CUSTOM') {
      setWeights(OPTIMIZATION_PROFILE_PRESETS[newProfile].weights)
    }
  }

  const handleWeightChange = (category: SoftConstraintCategory, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [category]: val,
    }))
    setProfile('CUSTOM')
  }

  const toggleLine = (lineCode: string) => {
    setSelectedLines((prev) =>
      prev.includes(lineCode) ? prev.filter((l) => l !== lineCode) : [...prev, lineCode],
    )
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe uma identificação para o cenário de otimização.',
      })
      return
    }

    // Validação de Escopo (Object-Level Authorization)
    const unauthorizedLines = selectedLines.filter((l) => !hasLineScope(l, l))
    if (unauthorizedLines.length > 0 && user?.role !== 'PCP_ADMIN') {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado (403)',
        description: `Seu usuário não possui escopo para simular as linhas: ${unauthorizedLines.join(', ')}.`,
      })
      return
    }

    setLoading(true)
    try {
      const created = await optimizationService.createScenario({
        name,
        profile,
        horizon,
        assumptions,
        target_lines: selectedLines,
        objectives_weights: weights,
        solver_timeout_seconds: timeoutSeconds,
      })

      toast({
        title: 'Cenário Criado',
        description: `Cenário [${created.code || created.name}] cadastrado com sucesso. Pronto para execução no Solver.`,
      })

      onScenarioCreated(created.id)
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar cenário',
        description: err.message || 'Falha na comunicação com o backend de otimização.',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2 text-base font-bold">
              <Cpu className="w-5 h-5 text-cyan-400" /> Criar Cenário de Otimização (CP-SAT Solver)
            </DialogTitle>
            <Badge className="bg-blue-950 text-cyan-300 border-blue-700 text-xs font-mono">
              Google OR-Tools CP-SAT
            </Badge>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Ambiente de simulação sandbox. A criação do cenário não altera Ficha Mestre, capacidades
            ou programação oficial.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="bg-slate-900 border border-slate-800 w-full grid grid-cols-4 text-xs">
            <TabsTrigger value="BASIC">1. Premissas & Perfil</TabsTrigger>
            <TabsTrigger value="OBJECTIVES">2. Pesos dos Objetivos</TabsTrigger>
            <TabsTrigger value="CONSTRAINTS">3. Hard Constraints</TabsTrigger>
            <TabsTrigger value="LINES">4. Malha & Linhas</TabsTrigger>
          </TabsList>

          {/* TAB 1: BASIC */}
          <TabsContent value="BASIC" className="space-y-4 pt-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Nome do Cenário</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white text-xs"
                placeholder="Ex: Simulação de Atendimento Urgente - Março"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Horizonte Temporal</Label>
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-white"
                >
                  <option value="DIARIO">Diário (24h - 3 Turnos)</option>
                  <option value="SEMANAL">Semanal (Grade Tática 7 Dias)</option>
                  <option value="MENSAL">Mensal (S&OP 30 Dias)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Perfil de Otimização Predefinido</Label>
                <select
                  value={profile}
                  onChange={(e) => handleProfileChange(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-white font-semibold"
                >
                  <option value="ATENDIMENTO">CENÁRIO A — Atendimento da Carteira</option>
                  <option value="PRODUTIVIDADE">CENÁRIO B — Produtividade & Setup</option>
                  <option value="ESTOQUE">CENÁRIO C — Estoque Mínimo / Buffer</option>
                  <option value="BALANCEADO">CENÁRIO D — Balanceado Multi-Objetivo</option>
                  <option value="CUSTOM">CUSTOMIZADO — Pesos Livres</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Premissa / Hipótese em Análise</Label>
              <textarea
                value={assumptions}
                onChange={(e) => setAssumptions(e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-white"
                placeholder="Descreva as hipóteses, turnos extras ou trocas de campanha testadas..."
              />
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="font-bold text-slate-200 block text-xs">
                    Timeout do Solver CP-SAT
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Tempo limite para cálculo. Ao atingir o teto, a melhor solução viável é salva.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <Input
                  type="number"
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                  className="w-16 bg-slate-950 border-slate-700 text-center text-xs h-7"
                />
                <span className="text-xs text-slate-400">seg</span>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: OBJECTIVES */}
          <TabsContent value="OBJECTIVES" className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="text-slate-300 font-semibold text-xs">
                Ponderação Multicritério das Soft Constraints
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-[10px] ${
                  totalWeight === 100
                    ? 'border-emerald-600 text-emerald-300'
                    : 'border-amber-600 text-amber-300'
                }`}
              >
                Soma dos Pesos: {totalWeight} pts
              </Badge>
            </div>

            <div className="space-y-3">
              {DEFAULT_OPTIMIZATION_OBJECTIVES.map((obj) => {
                const currentVal = weights[obj.category] ?? obj.weight
                return (
                  <div
                    key={obj.category}
                    className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 text-xs">{obj.name}</span>
                      <span className="font-mono text-cyan-300 font-bold text-xs">
                        {currentVal} pts
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">{obj.description}</p>
                    <Slider
                      value={[currentVal]}
                      max={60}
                      step={5}
                      onValueChange={(val) => handleWeightChange(obj.category, val[0])}
                      className="py-1"
                    />
                  </div>
                )
              })}
            </div>
          </TabsContent>

          {/* TAB 3: CONSTRAINTS */}
          <TabsContent value="CONSTRAINTS" className="space-y-2.5 pt-2 text-xs">
            <div className="bg-rose-950/20 border border-rose-800/60 p-3 rounded-lg text-rose-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold text-xs block text-rose-300">
                  Princípio de Hard Constraints (Invioláveis)
                </span>
                <span className="text-[11px] text-slate-300 leading-snug">
                  Nenhum cenário válido pode violar Hard Constraints. Casos de incompatibilidade
                  geram demandas UNALLOCATED com explicação estruturada.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {HARD_CONSTRAINTS_DEFINITIONS.map((hc) => (
                <div
                  key={hc.id}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-slate-800 text-slate-300 text-[9px] font-mono">
                      {hc.category}
                    </Badge>
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Mandatória
                    </span>
                  </div>
                  <span className="font-bold text-white text-xs block">{hc.name}</span>
                  <p className="text-[10px] text-slate-400 leading-tight">{hc.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 4: LINES */}
          <TabsContent value="LINES" className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">
                Linhas e Recursos Produtivos Selecionados
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedLines.length} linhas na simulação
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { code: 'L1', name: 'Laminação L1' },
                { code: 'L2', name: 'Conformação L2' },
                { code: 'ENF_L1', name: 'Forno Enfornamento' },
                { code: 'ACAB_L1', name: 'Acabamento L1' },
                { code: 'ACAB_L2', name: 'Acabamento L2' },
                { code: 'ENDIR', name: 'Endireitadeira' },
              ].map((line) => {
                const isSelected = selectedLines.includes(line.code)
                const hasScope = hasLineScope(line.code, line.code)

                return (
                  <button
                    key={line.code}
                    type="button"
                    onClick={() => toggleLine(line.code)}
                    disabled={!hasScope && user?.role !== 'PCP_ADMIN'}
                    className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#004C97]/30 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    } ${!hasScope && user?.role !== 'PCP_ADMIN' ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">{line.code}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] truncate mt-1 text-slate-300">{line.name}</span>
                    {!hasScope && user?.role !== 'PCP_ADMIN' && (
                      <span className="text-[9px] text-rose-400 mt-1">Fora do escopo</span>
                    )}
                  </button>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:justify-between pt-3 border-t border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Perfil: <strong className="text-white">{profile}</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={loading}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold text-xs shadow-sm"
            >
              {loading ? 'Criando Cenário...' : 'Criar Cenário no Hub'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default CreateScenarioModal
