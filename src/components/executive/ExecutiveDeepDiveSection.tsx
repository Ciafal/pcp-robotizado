import React, { useState } from 'react'
import {
  InvestigationFinding,
  ParetoItem,
  HistoricalComparisonItem,
  PastCommitmentItem,
  ExecutiveAlertItem,
  PrioritizationItem,
  AIRecommendationItem,
  ExecutiveActionRecord,
} from '@/types/executive-cockpit'
import { formatCiafalNumber, formatWithUnit } from '@/services/deterministic-executive-engine'
import {
  Search,
  BarChart2,
  History,
  CheckSquare,
  Bell,
  ListOrdered,
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  Lock,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Can } from '@/components/auth/Can'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ExecutiveDeepDiveSectionProps {
  investigation: InvestigationFinding
  pareto: ParetoItem[]
  historicalComparisons: HistoricalComparisonItem[]
  pastCommitments: PastCommitmentItem[]
  alerts: ExecutiveAlertItem[]
  prioritization: PrioritizationItem[]
  recommendations: AIRecommendationItem[]
  onCreateAction: (actionData: any) => Promise<void>
}

export const ExecutiveDeepDiveSection: React.FC<ExecutiveDeepDiveSectionProps> = ({
  investigation,
  pareto,
  historicalComparisons,
  pastCommitments,
  alerts,
  prioritization,
  recommendations,
  onCreateAction,
}) => {
  // Modal de Criação de Ação a partir de Recomendação ou Investigação
  const [selectedRecForAction, setSelectedRecForAction] = useState<AIRecommendationItem | null>(
    null,
  )
  const [actionTitle, setActionTitle] = useState<string>('')
  const [actionResponsible, setActionResponsible] = useState<string>('')
  const [actionDeadline, setActionDeadline] = useState<string>('')
  const [actionType, setActionType] = useState<string>('PLANO_ACAO')
  const [actionPriority, setActionPriority] = useState<string>('ALTA')
  const [savingAction, setSavingAction] = useState<boolean>(false)

  const handleOpenActionModal = (rec: AIRecommendationItem) => {
    setSelectedRecForAction(rec)
    setActionTitle(rec.title)
    setActionResponsible(rec.suggestedResponsible)
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    setActionDeadline(nextWeek.toISOString().split('T')[0])
    setActionType('PLANO_ACAO')
    setActionPriority('ALTA')
  }

  const handleSaveAction = async () => {
    if (!actionTitle || !actionResponsible || !actionDeadline) return
    setSavingAction(true)
    try {
      await onCreateAction({
        title: actionTitle,
        description: selectedRecForAction?.recommendation || '',
        action_type: actionType,
        priority: actionPriority,
        responsible_name: actionResponsible,
        deadline: actionDeadline,
        analysis_code: 'ANL-2025-EXEC-01',
        decision_rationale: selectedRecForAction?.justification || '',
        expected_result: selectedRecForAction?.expectedResult || '',
      })
      setSelectedRecForAction(null)
    } finally {
      setSavingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Bloco 7: Investigar com IA (Fato / Hipótese / Evidência / Causa Provável / Comprovada) */}
      <Card className="bg-white border-blue-200 shadow-sm">
        <CardHeader className="p-4 pb-2 bg-gradient-to-r from-blue-50/50 to-white border-b border-blue-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Search className="w-4 h-4 text-[#004C97]" />
              Investigar com IA — Diagnóstico Causal Estruturado
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Separação estrita: Fato &bull; Hipótese &bull; Evidência &bull; Causa Provável &bull;
              Causa Comprovada
            </p>
          </div>
          <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
            Metodologia DMAIC / 8D
          </Badge>
        </CardHeader>

        <CardContent className="p-4 space-y-3.5 text-xs">
          <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              Anomalia em Foco:
            </span>
            <span className="text-xs font-bold text-slate-900">{investigation.anomalyTitle}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Fatos Reais */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Fatos (Comprovados)
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700">
                {investigation.facts.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#004C97] font-bold">&bull;</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Hipóteses Levantadas */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Hipóteses em Teste
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700">
                {investigation.hypotheses.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">&bull;</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Evidências dos Dados */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-slate-700 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-emerald-600" /> Evidências Técnicas
              </span>
              <ul className="space-y-1 text-[11px] text-slate-700">
                {investigation.evidences.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">&bull;</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Causa Provável vs Causa Comprovada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-[11px] space-y-1">
              <span className="font-bold text-amber-900 block text-[10px] uppercase">
                Causa Provável (Sob Análise)
              </span>
              <p className="text-slate-800">{investigation.probableCauses[0]}</p>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3 text-[11px] space-y-1">
              <span className="font-bold text-emerald-900 block text-[10px] uppercase">
                Causa Comprovada (Validada por Telemetria)
              </span>
              <p className="text-slate-800 font-semibold">{investigation.provenCauses[0]}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Bloco 8 (Pareto Automático) + Bloco 9 (Comparação Histórica) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 8 — Pareto Automático de Perdas */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#004C97]" />
              Pareto Automático de Perdas (Regra 80/20)
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Identificação dos poucos fatores vitais que concentram mais de 80% do impacto em
              tonelagem (t).
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-1">
            <div className="space-y-2">
              {pareto.map((p, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    p.isTopVital
                      ? 'bg-blue-50/60 border-blue-200'
                      : 'bg-slate-50 border-slate-200 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate max-w-[280px]">
                      {p.category}
                    </span>
                    <Badge
                      className={`text-[9px] ${
                        p.isTopVital
                          ? 'bg-[#004C97] text-white font-bold'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p.isTopVital ? 'Fator Vital (80%)' : 'Fator Secundário'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>
                      Impacto:{' '}
                      <strong className="text-slate-900">
                        {formatWithUnit(p.impactValue, 't')}
                      </strong>{' '}
                      ({p.count} ocorrências)
                    </span>
                    <span>
                      Parcela: <strong>{p.pct}%</strong> &bull; Acumulado:{' '}
                      <strong className="text-[#004C97]">{p.cumulativePct}%</strong>
                    </span>
                  </div>

                  {/* Barra de Progresso Visual */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${p.isTopVital ? 'bg-[#004C97]' : 'bg-slate-400'}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bloco 9 — Comparação Histórica & Sazonalidade */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-4 h-4 text-[#004C97]" />
              Comparação Histórica & Sazonalidade
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Atual x Período Anterior x Mesmo Período Ano Anterior x Melhores/Piores Médias.
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2">Indicador</th>
                    <th className="py-2">Atual</th>
                    <th className="py-2">Período Ant.</th>
                    <th className="py-2">Ano Ant.</th>
                    <th className="py-2">Var. Sazonal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historicalComparisons.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 font-semibold text-slate-900">{item.metric}</td>
                      <td className="py-2 font-bold text-[#004C97]">
                        {formatWithUnit(item.currentValue, item.unit, item.unit === '%' ? 0 : 1)}
                      </td>
                      <td className="py-2 text-slate-600">
                        {formatWithUnit(item.previousPeriod, item.unit, item.unit === '%' ? 0 : 1)}
                      </td>
                      <td className="py-2 text-slate-600">
                        {formatWithUnit(
                          item.samePeriodLastYear,
                          item.unit,
                          item.unit === '%' ? 0 : 1,
                        )}
                      </td>
                      <td className="py-2">
                        <Badge
                          className={`text-[9px] font-bold ${
                            item.seasonalVariationPct >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {item.seasonalVariationPct > 0 ? '+' : ''}
                          {item.seasonalVariationPct}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Bloco 10 (Compromissos Anteriores) + Bloco 11 (Matriz de Alertas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 10 — Compromissos Anteriores (Prometido vs Entregue) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              Compromissos Anteriores (Prometido vs. Entregue)
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Registros históricos imutáveis protegidos contra edição retroativa.
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-2.5">
            {pastCommitments.map((c) => (
              <div
                key={c.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-slate-900">{c.commitmentTitle}</span>
                  <Badge
                    className={`text-[9px] font-bold ${
                      c.status === 'DELIVERED_ON_TIME'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {c.status === 'DELIVERED_ON_TIME' ? 'Entregue no Prazo' : 'Desvio Registrado'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] bg-white p-2 rounded border border-slate-200">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">
                      Meta Prometida
                    </span>
                    <span className="font-semibold text-slate-700">{c.promisedTarget}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">Real Entregue</span>
                    <span className="font-bold text-slate-900">{c.deliveredResult}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold">Aderência</span>
                    <span className="font-bold text-[#004C97]">{c.adherencePct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Lock className="w-2.5 h-2.5 text-slate-400" /> {c.immutableRecordId}
                  </span>
                  <span>Data: {c.deliveryDate}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bloco 11 — Matriz de Alertas Executivos (4 Níveis) */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600" />
              Matriz de Alertas Executivos (4 Níveis)
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Classificação: Estratégico &bull; Crítico &bull; Atenção &bull; Informativo
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-2">
            {alerts.map((al) => {
              const isStrat = al.level === 'ESTRATEGICO'
              const isCrit = al.level === 'CRITICO'
              const isAtt = al.level === 'ATENCAO'

              return (
                <div
                  key={al.id}
                  className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                    isStrat
                      ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                      : isCrit
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : isAtt
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{al.title}</span>
                    <Badge
                      className={`text-[9px] font-bold ${
                        isStrat
                          ? 'bg-purple-700 text-white'
                          : isCrit
                            ? 'bg-rose-700 text-white'
                            : isAtt
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-500 text-white'
                      }`}
                    >
                      {al.level}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-snug">{al.message}</p>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5 font-mono">
                    <span>Gatilho: {al.triggerMetric}</span>
                    <span>{al.thresholdRule}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Grid: Bloco 12 (Priorização) + Bloco 13 (Recomendações da IA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 12 — Priorização Impacto x Urgência x Probabilidade x Alcance */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-[#004C97]" />
              Matriz de Priorização (I x U x P x A)
            </CardTitle>
            <p className="text-[11px] text-slate-500">
              Cálculo: Impacto (1-5) &times; Urgência (1-5) &times; Probabilidade (1-5) &times;
              Alcance (1-5).
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-1 space-y-2">
            {prioritization.map((prio) => (
              <div
                key={prio.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-900">{prio.title}</span>
                  <Badge
                    className={`text-[9px] font-bold shrink-0 ${
                      prio.priorityCategory === 'CRITICA'
                        ? 'bg-rose-600 text-white'
                        : prio.priorityCategory === 'ALTA'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-500 text-white'
                    }`}
                  >
                    Score: {prio.totalPriorityScore} &bull; {prio.priorityCategory}
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-600">{prio.rationale}</p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  <span>
                    Linha: <strong>{prio.lineCode}</strong>
                  </span>
                  <span className="text-[#004C97] font-semibold">
                    Prazo sugerido: {prio.suggestedDeadlineDays} dia(s)
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bloco 13 — Recomendações da IA & Ação Vinculada (Bloco 14) */}
        <Card className="bg-white border-blue-200 shadow-sm">
          <CardHeader className="p-4 pb-2 bg-blue-50/40 border-b border-blue-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#004C97]" />
                Recomendações Estruturadas da IA
              </CardTitle>
              <p className="text-[11px] text-slate-500">
                A IA sugere com justificativa, evidência e responsável. Aprovação humana
                obrigatória.
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] border-blue-300 text-[#004C97] bg-blue-50"
            >
              Decisão Assistida
            </Badge>
          </CardHeader>

          <CardContent className="p-4 pt-3 space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-extrabold text-slate-900">{rec.title}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                    Confiança: {rec.confidenceLevel} ({rec.confidencePct}%)
                  </Badge>
                </div>

                <p className="text-[11px] text-slate-800 font-medium bg-slate-50 p-2 rounded border border-slate-200">
                  {rec.recommendation}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                  <div>
                    <span className="font-bold text-slate-700 block">Justificativa:</span>
                    <span>{rec.justification}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">Resultado Esperado:</span>
                    <span className="text-emerald-700 font-semibold">{rec.expectedResult}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500">
                    Responsável:{' '}
                    <strong className="text-slate-800">{rec.suggestedResponsible}</strong>
                  </span>

                  <Can permission="pcp.executive.actions.manage">
                    <Button
                      size="sm"
                      onClick={() => handleOpenActionModal(rec)}
                      className="bg-[#004C97] hover:bg-[#003870] text-white text-[11px] h-7 gap-1"
                    >
                      <Plus className="w-3 h-3" /> Transformar em Ação
                    </Button>
                  </Can>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Modal para Transformar em Plano de Ação Vinculado (Bloco 14) */}
      <Dialog
        open={!!selectedRecForAction}
        onOpenChange={(open) => !open && setSelectedRecForAction(null)}
      >
        <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2 text-base font-bold">
              <Plus className="w-4 h-4 text-[#004C97]" />
              Criar Ação Executiva Vinculada
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mantém o vínculo permanente: Análise &rarr; Decisão &rarr; Ação &rarr; Responsável
              &rarr; Prazo &rarr; Resultado &rarr; Eficácia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-slate-700 text-xs font-semibold">Título da Ação</Label>
              <Input
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                className="bg-white border-slate-300 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 text-xs font-semibold">Tipo de Ação</Label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800"
                >
                  <option value="PLANO_ACAO">Plano de Ação</option>
                  <option value="DEMANDA">Demanda</option>
                  <option value="PROJETO">Projeto</option>
                  <option value="INVESTIGACAO">Investigação</option>
                  <option value="ALERTA">Alerta Operacional</option>
                  <option value="TAREFA">Tarefa Rápida</option>
                  <option value="REUNIAO">Reunião Executiva</option>
                  <option value="ACOMPANHAMENTO">Acompanhamento</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 text-xs font-semibold">Prioridade</Label>
                <select
                  value={actionPriority}
                  onChange={(e) => setActionPriority(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-800"
                >
                  <option value="CRITICA">Crítica</option>
                  <option value="ALTA">Alta</option>
                  <option value="MEDIA">Média</option>
                  <option value="MONITORAR">Monitorar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-700 text-xs font-semibold">
                  Responsável Designado
                </Label>
                <Input
                  value={actionResponsible}
                  onChange={(e) => setActionResponsible(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-700 text-xs font-semibold">Prazo Limite</Label>
                <Input
                  type="date"
                  value={actionDeadline}
                  onChange={(e) => setActionDeadline(e.target.value)}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px] text-slate-600">
              <span className="font-bold text-slate-700 block">
                Decisão / Justificativa Vinculada:
              </span>
              <span>{selectedRecForAction?.justification}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRecForAction(null)}
              className="border-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAction}
              disabled={savingAction}
              className="bg-[#004C97] hover:bg-[#003870] text-white font-semibold"
            >
              {savingAction ? 'Registrando no Backend...' : 'Salvar e Vincular Ação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ExecutiveDeepDiveSection
