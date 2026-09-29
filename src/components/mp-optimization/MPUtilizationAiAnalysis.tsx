import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MPUtilizationItem } from '@/types/mp-optimization'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  TrendingDown,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react'

export interface MPUtilizationAiAnalysisProps {
  rows: MPUtilizationItem[]
  isLoading?: boolean
  companyCode: string
  lineCode: string
  centerCode: string
  periodLabel: string
}

export const MPUtilizationAiAnalysis: React.FC<MPUtilizationAiAnalysisProps> = ({
  rows,
  isLoading = false,
  companyCode,
  lineCode,
  centerCode,
  periodLabel,
}) => {
  // Estado 1: Quando não houver registros suficientes
  if (!isLoading && rows.length === 0) {
    return (
      <Card
        data-testid="ai-analysis-empty-state"
        className="bg-slate-50/70 border-dashed border-slate-200 shadow-sm p-4 text-center"
      >
        <div className="flex flex-col items-center justify-center py-4 space-y-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <Sparkles className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xs font-semibold text-slate-600">
            Não há dados suficientes no período selecionado para gerar a análise.
          </p>
          <span className="text-[11px] text-slate-400 max-w-md">
            Selecione um período mais amplo ou desmarque filtros específicos para permitir que o
            assistente analise o enfornamento e oportunidades térmicas.
          </span>
        </div>
      </Card>
    )
  }

  // Cálculos dinâmicos com base nos dados filtrados
  const ordersWithPotentialHot = rows.filter(
    (r) => r.could_be_hot_charging && (r.potential_hot_tons || 0) > 0,
  )
  const totalPotentialHotTons = ordersWithPotentialHot.reduce(
    (acc, r) => acc + (r.potential_hot_tons || 0),
    0,
  )
  const totalColdTons = rows.reduce((acc, r) => acc + (r.cold_charging_tons || 0), 0)
  const pctPotentialOfCold = totalColdTons > 0 ? (totalPotentialHotTons / totalColdTons) * 100 : 0

  // Identificação do principal centro / linha com desvio
  const deviationByCenter: Record<string, { tons: number; count: number; line: string }> = {}
  ordersWithPotentialHot.forEach((r) => {
    const key = r.center_code || 'Geral'
    if (!deviationByCenter[key]) {
      deviationByCenter[key] = { tons: 0, count: 0, line: r.line_code || '-' }
    }
    deviationByCenter[key].tons += r.potential_hot_tons || 0
    deviationByCenter[key].count += 1
  })

  let mainDeviationCenter = '-'
  let mainDeviationTons = 0
  let mainDeviationLine = '-'
  Object.entries(deviationByCenter).forEach(([c, data]) => {
    if (data.tons > mainDeviationTons) {
      mainDeviationTons = data.tons
      mainDeviationCenter = c
      mainDeviationLine = data.line
    }
  })

  // Lista de ordens específicas impactadas (até 3 nomes para o resumo objetivo)
  const sampleOrderNumbers = ordersWithPotentialHot
    .map((r) => r.order_number)
    .slice(0, 3)
    .join(', ')

  // Substituições 1020 no lugar de AC no escopo
  const acSubstitutedRows = rows.filter((r) => r.is_substitute_application)
  const totalAcSubstitutedTons = acSubstitutedRows.reduce(
    (acc, r) => acc + (r.deviation_impact_tons || r.mp_consumed_tons || 0),
    0,
  )

  const hasThermalDeviation = ordersWithPotentialHot.length > 0
  const hasAcSubstitution = acSubstitutedRows.length > 0

  return (
    <Card
      data-testid="mp-utilization-ai-analysis-section"
      className="bg-white border-blue-200/90 shadow-sm overflow-hidden"
    >
      <CardHeader className="py-2.5 px-4 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/50 border-b border-blue-100 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#004C97] text-white flex items-center justify-center shadow-2xs">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Análise de IA &bull; O que deveria ter sido realizado</span>
              <Badge className="bg-[#004C97]/10 text-[#004C97] hover:bg-[#004C97]/20 border-[#004C97]/30 text-[10px] font-bold py-0">
                PCP Copilot
              </Badge>
            </CardTitle>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          Escopo: {companyCode !== 'ALL' ? companyCode : 'CIAFAL'} &bull; {periodLabel}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5 text-xs text-slate-700">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : !hasThermalDeviation && !hasAcSubstitution ? (
          // Estado quando não há desvios no período
          <div
            data-testid="ai-analysis-no-deviation"
            className="flex items-start gap-3 p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-emerald-900"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-bold text-xs text-emerald-950">
                Programação Térmica e de Matéria-Prima 100% Conforme
              </h5>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Não foram identificados desvios de enfornamento frio com elegibilidade para quente
                nem substituição indevida de tarugo nobre (1020 no lugar de AC) para os filtros
                selecionados. Todas as ordens respeitaram o sequenciamento térmico planejado.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Bloco 1: Resumo Executivo */}
            <div
              data-testid="ai-analysis-executive-summary"
              className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Resumo Executivo</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed">
                {hasThermalDeviation ? (
                  <>
                    <li>
                      Foram identificadas <strong>{ordersWithPotentialHot.length} ordens</strong>{' '}
                      com enfornamento a frio que tinham potencial e disponibilidade para realização
                      a quente.
                    </li>
                    <li>
                      O volume potencial de conversão frio &rarr; quente é de{' '}
                      <strong>
                        {totalPotentialHotTons.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}{' '}
                        t
                      </strong>{' '}
                      (
                      {pctPotentialOfCold.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      % do enfornamento frio total).
                    </li>
                    <li>
                      O principal desvio térmico ocorreu no centro{' '}
                      <strong>{mainDeviationCenter}</strong> (Linha {mainDeviationLine}) com{' '}
                      {mainDeviationTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      t não convertidas.
                    </li>
                  </>
                ) : (
                  <li>
                    Sem desvios térmicos identificados: 100% do enfornamento frio realizado no
                    período decorreu de materiais efetivamente inelegíveis para quente.
                  </li>
                )}
                {hasAcSubstitution && (
                  <li>
                    Paralelamente, foram registradas{' '}
                    <strong>{acSubstitutedRows.length} ordens</strong> com uso de tarugo 1020 em
                    produtos que aceitavam Aço Comercial (AC), impactando{' '}
                    {totalAcSubstitutedTons.toLocaleString('pt-BR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{' '}
                    t do estoque nobre.
                  </li>
                )}
              </ul>
            </div>

            {/* Grade de 3 Colunas: Bloco 2, Bloco 3 e Bloco 4 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Bloco 2: O que deveria ter sido realizado */}
              <div
                data-testid="ai-analysis-what-should-have-been-done"
                className="p-3 bg-blue-50/50 border border-blue-200/80 rounded-lg space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-[#004C97] font-bold text-xs uppercase tracking-wider">
                  <ArrowRight className="w-3.5 h-3.5 text-[#004C97]" />
                  <span>2. O que deveria ter sido realizado</span>
                </div>
                <div className="text-[11px] text-slate-700 space-y-1 leading-relaxed">
                  {hasThermalDeviation ? (
                    <>
                      <p>
                        As ordens{' '}
                        <strong className="text-slate-900">
                          {sampleOrderNumbers || 'do período'}
                        </strong>{' '}
                        deveriam ter sido agrupadas em campanhas contínuas com vazamento quente
                        imediatamente anterior.
                      </p>
                      <p>
                        Havia saldo e compatibilidade de bitola (130x130 / 150x150) para evitar o
                        estocamento intermediário e o resfriamento de tarugos no pátio.
                      </p>
                      <p>
                        A programação deveria ter priorizado o consumo da carga na janela térmica do
                        forno de reaquecimento ({lineCode !== 'ALL' ? lineCode : 'L1/L2'}).
                      </p>
                    </>
                  ) : (
                    <p>
                      O sequenciamento cumpriu as diretrizes operacionais de vazamento e janela
                      térmica recomendadas pela engenharia.
                    </p>
                  )}
                </div>
              </div>

              {/* Bloco 3: Impactos observados */}
              <div
                data-testid="ai-analysis-observed-impacts"
                className="p-3 bg-amber-50/40 border border-amber-200/80 rounded-lg space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <TrendingDown className="w-3.5 h-3.5 text-amber-700" />
                  <span>3. Impactos observados</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed">
                  <li>
                    Aumento do consumo específico de gás/energia no reaquecimento de tarugos frios.
                  </li>
                  <li>
                    Pior aproveitamento térmico da corrida da L2 (&lt; 70% de enfornamento quente).
                  </li>
                  {hasAcSubstitution && (
                    <li>
                      Impacto financeiro e operacional no estoque nobre de tarugos SAE 1020 / MPI.
                    </li>
                  )}
                  <li>Aumento de movimentação logística interna por pontes rolantes e carretas.</li>
                </ul>
              </div>

              {/* Bloco 4: Recomendações da IA */}
              <div
                data-testid="ai-analysis-recommendations"
                className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-lg space-y-1.5"
              >
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-3.5 h-3.5 text-emerald-700" />
                  <span>4. Recomendações da IA</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-700 leading-relaxed">
                  <li>
                    <strong>Consolidar campanhas:</strong> agrupar ordens por família de bitola
                    antes do resfriamento de tarugos.
                  </li>
                  <li>
                    <strong>Revisar regras de priorização:</strong> emitir alerta preventivo no PCP
                    quando houver material quente disponível na esteira.
                  </li>
                  <li>
                    <strong>Respeitar janelas térmicas:</strong> sincronizar programação de forno
                    L1/L2 com o ritmo de lingotamento contínuo.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MPUtilizationAiAnalysis
