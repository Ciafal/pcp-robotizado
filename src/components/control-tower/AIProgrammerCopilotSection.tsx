import React, { useState } from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Filter,
  ShieldCheck,
  Scale,
  RefreshCw,
  Clock,
  PackageCheck,
  Zap,
  HelpCircle,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  aiProgrammerEngine,
  ProgrammingCandidateItem,
  AISuggestedSequenceItem,
  AISchedulerResult,
} from '@/services/ai-programmer-engine'

// Candidatos reais da carteira CIAFAL para simulação e sequenciamento da IA
const SAMPLE_CANDIDATES: ProgrammingCandidateItem[] = [
  {
    id: 'CAND_01',
    orderNumber: 'OP-450010982',
    clientName: 'Marcopolo Ônibus S.A.',
    materialCode: 'RED-50.8-SAE1045',
    materialDescription: 'Barra Redonda Laminada 50,80mm (2") SAE 1045',
    family: 'REDONDOS',
    line: 'L1',
    gaugeMm: 50.8,
    steelGrade: 'SAE 1045',
    productType: 'MTS',
    requestedDate: '2025-08-18',
    backlogTons: 112.5,
    currentStockTons: 15.0,
    scheduledProductionTons: 0,
    availableMpTons: 150.0,
    rawMaterialCode: 'TAR-150-1045-ARCE',
    revenueHistoricalBrl: 890000,
    dailyConsumptionTons: 12.0,
  },
  {
    id: 'CAND_02',
    orderNumber: 'OP-450010983',
    clientName: 'Randon Implementos',
    materialCode: 'RED-63.5-SAE5160',
    materialDescription: 'Barra Redonda Especial Mola 63,50mm SAE 5160',
    family: 'REDONDOS',
    line: 'L1',
    gaugeMm: 63.5,
    steelGrade: 'SAE 5160',
    productType: 'MTO',
    requestedDate: '2025-08-19',
    backlogTons: 85.0,
    currentStockTons: 0.0,
    scheduledProductionTons: 0,
    availableMpTons: 120.0,
    rawMaterialCode: 'TAR-150-5160-VALL',
    revenueHistoricalBrl: 1120000,
    dailyConsumptionTons: 8.5,
  },
  {
    id: 'CAND_03',
    orderNumber: 'OP-450010984',
    clientName: 'Distribuidora Aço Sul',
    materialCode: 'RED-38.1-SAE1020',
    materialDescription: 'Barra Redonda Comercial 38,10mm SAE 1020',
    family: 'REDONDOS',
    line: 'L1',
    gaugeMm: 38.1,
    steelGrade: 'SAE 1020',
    productType: 'MTS',
    requestedDate: '2025-08-20',
    backlogTons: 15.0, // LOTE INFERIOR (Faltando lote mínimo de 3h = ~67.5t)
    currentStockTons: 40.0,
    scheduledProductionTons: 0,
    availableMpTons: 90.0,
    rawMaterialCode: 'TAR-130-1020-CSN',
    revenueHistoricalBrl: 95000,
    dailyConsumptionTons: 4.0,
  },
  {
    id: 'CAND_04',
    orderNumber: 'OP-450010985',
    clientName: 'Metalsider Estruturas',
    materialCode: 'RED-76.2-SAE1045',
    materialDescription: 'Barra Redonda 76,20mm SAE 1045 Forjada/Laminada',
    family: 'REDONDOS',
    line: 'L1',
    gaugeMm: 76.2,
    steelGrade: 'SAE 1045',
    productType: 'MTS',
    requestedDate: '2025-08-21',
    backlogTons: 95.0,
    currentStockTons: 5.0,
    scheduledProductionTons: 0,
    availableMpTons: 10.0, // MP INSUFICIENTE (Exige 95t, possui 10t)
    rawMaterialCode: 'TAR-150-1045-ARCE',
    revenueHistoricalBrl: 670000,
    dailyConsumptionTons: 7.0,
  },
  {
    id: 'CAND_05',
    orderNumber: 'OP-450010986',
    clientName: 'Siderúrgica Gerdau Revenda',
    materialCode: 'RED-45.0-SAE1045',
    materialDescription: 'Barra Redonda 45,00mm SAE 1045 (Item com Revenda)',
    family: 'REDONDOS',
    line: 'L1',
    gaugeMm: 45.0,
    steelGrade: 'SAE 1045',
    productType: 'REVENDA',
    requestedDate: '2025-08-22',
    backlogTons: 60.0,
    currentStockTons: 10.0,
    scheduledProductionTons: 60.0,
    availableMpTons: 80.0,
    rawMaterialCode: 'TAR-130-1045-GERD',
    revenueHistoricalBrl: 350000,
    dailyConsumptionTons: 5.0,
    hasDuplicateResaleOrImport: true, // Duplicidade detectada
  },
]

export const AIProgrammerCopilotSection: React.FC<{ defaultLine?: string }> = ({
  defaultLine = 'L1',
}) => {
  const { toast } = useToast()
  const [selectedLine, setSelectedLine] = useState<string>(defaultLine)
  const [targetWeek, setTargetWeek] = useState<string>('Semana 34/2025')
  const [scheduleResult, setScheduleResult] = useState<AISchedulerResult>(() =>
    aiProgrammerEngine.generateOptimizedSequence(
      defaultLine,
      'Semana 34/2025',
      SAMPLE_CANDIDATES,
      8500,
    ),
  )

  const [selectedItemForExplanation, setSelectedItemForExplanation] =
    useState<AISuggestedSequenceItem | null>(null)
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false)

  const handleRunOptimization = () => {
    const result = aiProgrammerEngine.generateOptimizedSequence(
      selectedLine,
      targetWeek,
      SAMPLE_CANDIDATES,
      selectedLine === 'L1' ? 8900 : 4000,
    )
    setScheduleResult(result)
    toast({
      title: 'Sequenciamento IA Atualizado',
      description: `Otimização determinística calculada com sucesso para a linha ${selectedLine}.`,
    })
  }

  const handleOpenExplain = (item: AISuggestedSequenceItem) => {
    setSelectedItemForExplanation(item)
    setIsExplanationModalOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* CABEÇALHO DO COPILOTO IA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-lg shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                IA Programadora & Copiloto Determinístico PCP
              </h2>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono">
                Sem Heurística Genérica &bull; Auditoria 100% Rastreada
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Valida Lote Mínimo, Curva ABC, Matriz de Gargalo, Desbaste L1, MP no WMS, Dependência
              Térmica e Bloqueio de Duplicidades.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedLine} onValueChange={setSelectedLine}>
            <SelectTrigger className="h-8 w-32 text-xs bg-white border-slate-200 font-semibold">
              <SelectValue placeholder="Linha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L1">Linha L1</SelectItem>
              <SelectItem value="L2">Linha L2</SelectItem>
              <SelectItem value="SDC">Linha SDC</SelectItem>
              <SelectItem value="ENDL1">Linha ENDL1</SelectItem>
              <SelectItem value="ACABL2">Linha ACABL2</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            onClick={handleRunOptimization}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs gap-1.5 h-8 font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recalcular Sequência Ótima</span>
          </Button>
        </div>
      </div>

      {/* PAINEL DE ALERTA DE DESBASTE L1 (SE APLICÁVEL) */}
      {scheduleResult.desbasteWarning && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <strong className="text-amber-900">Controle de Vida Útil do Desbaste L1:</strong>{' '}
              <span className="text-amber-800">
                {scheduleResult.desbasteWarning.accumulatedProductionTons.toLocaleString('pt-BR')} t
                produzidas desde a última troca / Limite previsto de{' '}
                {scheduleResult.desbasteWarning.targetLifespanTons.toLocaleString('pt-BR')} t (
                {scheduleResult.desbasteWarning.percentageUsed.toFixed(1)}%).
              </span>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-mono text-[10px]">
            {scheduleResult.desbasteWarning.status}
          </Badge>
        </div>
      )}

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 bg-white border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Candidatos Avaliados</div>
          <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
            {scheduleResult.candidatesEvaluatedCount} itens
          </div>
          <div className="text-[10px] text-slate-400">Total na carteira da linha</div>
        </Card>

        <Card className="p-3 bg-white border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Programados com Sucesso</div>
          <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
            {scheduleResult.scheduledItemsCount} itens ({scheduleResult.totalPlannedTons.toFixed(1)}{' '}
            t)
          </div>
          <div className="text-[10px] text-emerald-600 font-medium">100% regras validadas</div>
        </Card>

        <Card className="p-3 bg-white border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Candidatos Bloqueados</div>
          <div className="text-lg font-bold text-rose-700 font-mono mt-0.5">
            {scheduleResult.blockedItemsCount} itens
          </div>
          <div className="text-[10px] text-rose-600">Falta MP / Lote / Duplicidade</div>
        </Card>

        <Card className="p-3 bg-white border-slate-200 shadow-2xs">
          <div className="text-[11px] font-medium text-slate-500">Tempo de Carga Fabril</div>
          <div className="text-lg font-bold text-[#004C97] font-mono mt-0.5">
            {scheduleResult.totalPlannedHours.toFixed(1)} h úteis
          </div>
          <div className="text-[10px] text-slate-400">
            Setups: {scheduleResult.totalSetupsMinutes} min
          </div>
        </Card>
      </div>

      {/* TABELA DE SEQUENCIAMENTO DETERMINÍSTICO SUGERIDO */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#004C97]" /> Sequência Sugerida pela IA & Validações
              Industriais
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Clique em "Por que a IA sugeriu isso?" para auditar as regras acionadas e os
              parâmetros de decisão.
            </CardDescription>
          </div>
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
            Aprovação Humana Obrigatória
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                  <th className="p-2.5 text-center">Seq</th>
                  <th className="p-2.5">OP / Pedido</th>
                  <th className="p-2.5">Cliente</th>
                  <th className="p-2.5">Material / Bitola</th>
                  <th className="p-2.5 text-center">Curva ABC</th>
                  <th className="p-2.5 text-right">Volume (t)</th>
                  <th className="p-2.5 text-right">Horas</th>
                  <th className="p-2.5 text-center">Lote Mínimo</th>
                  <th className="p-2.5 text-center">Cobertura</th>
                  <th className="p-2.5 text-center">Validação CIAFAL</th>
                  <th className="p-2.5 text-right font-mono">Score</th>
                  <th className="p-2.5 text-center">Explicação IA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {scheduleResult.sequence.map((item) => (
                  <tr
                    key={item.candidate.id}
                    className="hover:bg-blue-50/50 transition-colors whitespace-nowrap"
                  >
                    <td className="p-2.5 text-center font-bold text-[#004C97] font-mono">
                      #{item.sequencePosition}
                    </td>
                    <td className="p-2.5 font-mono font-medium text-slate-800">
                      {item.candidate.orderNumber}
                    </td>
                    <td
                      className="p-2.5 text-slate-700 max-w-[140px] truncate"
                      title={item.candidate.clientName}
                    >
                      {item.candidate.clientName}
                    </td>
                    <td
                      className="p-2.5 font-medium text-slate-900 max-w-[200px] truncate"
                      title={item.candidate.materialDescription}
                    >
                      {item.candidate.materialCode}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {item.candidate.steelGrade} &bull; {item.candidate.gaugeMm}mm
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          item.abcEvaluation.abcClass === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.abcEvaluation.abcClass === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        Classe {item.abcEvaluation.abcClass}
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {item.plannedTons.toFixed(1)} t
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-600">
                      {item.plannedHours.toFixed(1)} h
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                        ✓ Formado ({item.minBatchEvaluation.requiredMinHours}h)
                      </Badge>
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">
                      {item.stockBalanceEvaluation.coverageDays.toFixed(1)} dias
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                        Aprovado PCP
                      </Badge>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                      {item.score} pts
                    </td>
                    <td className="p-2.5 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenExplain(item)}
                        className="h-7 text-xs border-indigo-200 bg-indigo-50/50 text-indigo-800 hover:bg-indigo-100 gap-1"
                      >
                        <HelpCircle className="w-3 h-3 text-indigo-600" />
                        <span>Por que a IA sugeriu?</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CANDIDATOS BLOQUEADOS / MOTIVOS RASTREÁVEIS */}
      {scheduleResult.blockedCandidates.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/30 shadow-2xs">
          <CardHeader className="p-3 pb-2 border-b border-rose-100">
            <CardTitle className="text-xs font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Candidatos Bloqueados pelo Motor
              de Regras ({scheduleResult.blockedCandidates.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 text-xs">
            {scheduleResult.blockedCandidates.map((bc) => (
              <div
                key={bc.candidate.id}
                className="p-2.5 bg-white border border-rose-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900">{bc.candidate.orderNumber}</strong>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {bc.candidate.materialCode}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {bc.candidate.clientName}
                    </Badge>
                  </div>
                  <div className="text-rose-700 text-[11px] font-medium mt-1">
                    Motivos: {bc.blockingReasons.join(' | ')}
                  </div>
                </div>
                <Badge className="bg-rose-100 text-rose-800 text-[10px] shrink-0">
                  Bloqueio Rígido
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* MODAL DE EXPLICAÇÃO COMPLETA DA DECISÃO IA (SEM CAIXA PRETA) */}
      {selectedItemForExplanation && (
        <Dialog open={isExplanationModalOpen} onOpenChange={setIsExplanationModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Auditoria de Decisão IA &bull; {selectedItemForExplanation.candidate.materialCode}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Transparência completa das regras acionadas, dados de entrada e nível de confiança
                do Copiloto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs text-slate-700">
              <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100">
                <div className="text-indigo-900 font-bold text-xs">Resumo da Recomendação:</div>
                <div className="text-indigo-800 mt-1">
                  {selectedItemForExplanation.aiExplanation.decisionSummary}
                </div>
              </div>

              <div>
                <strong className="text-slate-900 block mb-1">
                  Motivos e Fatores de Priorização:
                </strong>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  {selectedItemForExplanation.aiExplanation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div>
                <strong className="text-slate-900 block mb-1">
                  Restrições Industriais Verificadas:
                </strong>
                <div className="grid grid-cols-2 gap-1.5">
                  {selectedItemForExplanation.aiExplanation.constraintsChecked.map((c, i) => (
                    <div
                      key={i}
                      className="bg-slate-50 p-1.5 rounded border border-slate-200 text-[11px] text-slate-700 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                <div className="text-[11px] text-slate-500">
                  Nível de Confiança do Algoritmo Determinístico:
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 font-mono text-xs">
                  {selectedItemForExplanation.aiExplanation.confidenceLevelPercent}% Confiança
                </Badge>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
