import React from 'react'
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
import {
  RealtimeCenterData,
  RealtimeLineData,
  RealtimeCompanyConsolidated,
} from '@/types/pcp-realtime-analysis'
import { formatNumberPtBr } from '@/lib/number-format'
import { PcpRealtimeAiService } from '@/services/pcp-realtime-ai-service'
import {
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
  Wrench,
  CheckCircle2,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Info,
  X,
} from 'lucide-react'

interface RealtimeDrilldownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'COMPANY' | 'LINE' | 'CENTRO' | 'METRIC' | 'STOP'
  title: string
  center?: RealtimeCenterData | null
  line?: RealtimeLineData | null
  company?: RealtimeCompanyConsolidated | null
  metricKey?: 'oee' | 'utilization' | 'metallicYield' | 'production' | null
}

export const RealtimeDrilldownModal: React.FC<RealtimeDrilldownModalProps> = ({
  open,
  onOpenChange,
  type,
  title,
  center,
  line,
  company,
  metricKey,
}) => {
  const aiSummary = center
    ? PcpRealtimeAiService.generateCenterSummary(center)
    : line
      ? PcpRealtimeAiService.generateLineSummary(line)
      : company
        ? PcpRealtimeAiService.generateCompanySummary(company, [])
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="realtime-drilldown-modal-content"
        className="w-[94vw] max-w-[94vw] sm:max-w-[94vw] md:max-w-[94vw] lg:max-w-[94vw] xl:max-w-[94vw] h-[94vh] max-h-[94vh] p-0 flex flex-col bg-slate-50 border-slate-300 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Cabeçalho Fixo */}
        <DialogHeader className="px-6 py-4 bg-white border-b border-slate-200 shrink-0 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs"
              >
                Drill-down Operacional PCP
              </Badge>
              {center?.status && (
                <Badge
                  className={
                    center.status === 'NORMAL'
                      ? 'bg-emerald-600'
                      : center.status === 'ATENCAO'
                        ? 'bg-amber-500'
                        : center.status === 'CRITICO'
                          ? 'bg-rose-600'
                          : center.status === 'PARADA_PROGRAMADA'
                            ? 'bg-blue-600'
                            : 'bg-slate-500'
                  }
                >
                  {center.status}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#004C97]" />
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Rastreabilidade analítica ponta a ponta com carimbo de tempo, fontes integradas e
              memória técnica.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Corpo com Rolagem Vertical Interna e sem Corte Lateral */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Bloco Resumo Operacional IA */}
          {aiSummary && (
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white border border-blue-200/80 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#004C97] font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Resumo Operacional IA — {aiSummary.entityName}
                </div>
                <Badge variant="outline" className="bg-white text-[11px] text-slate-600">
                  Sem alucinações • IA Orientativa
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* FATOS */}
                <div className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-slate-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Fatos Medidos na Fonte
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                    {aiSummary.factualPoints.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>

                {/* ALERTAS */}
                <div className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Alertas Calculados
                  </div>
                  {aiSummary.calculatedAlerts.length > 0 ? (
                    <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                      {aiSummary.calculatedAlerts.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Nenhum desvio crítico detectado.
                    </p>
                  )}
                </div>

                {/* INTERPRETAÇÃO & PRÓXIMA AÇÃO */}
                <div className="bg-white/90 border border-slate-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                  <div className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Interpretação e Próxima Atenção
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 list-disc pl-4 leading-relaxed">
                    {aiSummary.aiInterpretations.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-indigo-900">
                      Recomendação PCP:{' '}
                    </span>
                    <span className="text-xs text-slate-700">{aiSummary.nextActionAdvice}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Abas de Detalhamento Técnico */}
          <Tabs defaultValue="producao" className="w-full">
            <TabsList className="bg-slate-200/80 p-1 rounded-xl">
              <TabsTrigger value="producao" className="text-xs font-semibold">
                Produção & Volumes
              </TabsTrigger>
              <TabsTrigger value="indicadores" className="text-xs font-semibold">
                Indicadores & OEE
              </TabsTrigger>
              <TabsTrigger value="paradas" className="text-xs font-semibold">
                Paradas & Ocorrências
              </TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs font-semibold">
                Linha do Tempo Operacional
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: Produção */}
            <TabsContent value="producao" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500">Ordem de Produção (SAP)</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {center?.productionOrder || 'Sem Ordem Vinculada'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Campanha: {center?.campaign || 'Padrão'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500">Material / Dimensão</div>
                  <div
                    className="text-sm font-bold text-slate-900 mt-1 truncate"
                    title={center?.materialDescription || ''}
                  >
                    {center?.materialDescription || 'N/D'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Dimensão: {center?.dimension || 'N/D'} | Aço: {center?.steelGrade || 'N/D'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500">Previsto x Realizado</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {center?.realizedTons !== null
                      ? `${formatNumberPtBr(center.realizedTons)} t`
                      : 'N/D'}{' '}
                    /{' '}
                    {center?.programmedTons !== null
                      ? `${formatNumberPtBr(center.programmedTons)} t`
                      : 'N/D'}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 mt-1">
                    {center?.achievementPct !== null
                      ? `Previsto: ${formatNumberPtBr(center.achievementPct)} %`
                      : 'N/D'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs text-slate-500">Cadência (t/h)</div>
                  <div className="text-lg font-bold text-slate-900 mt-1">
                    {center?.currentRatePerHour !== null
                      ? `${formatNumberPtBr(center.currentRatePerHour)} t/h`
                      : 'N/D'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Meta nominal:{' '}
                    {center?.plannedRatePerHour !== null
                      ? `${formatNumberPtBr(center.plannedRatePerHour)} t/h`
                      : 'N/D'}
                  </div>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
                  Transição de Produtos na Linha
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Produto Anterior
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {center?.previousProduct || 'Nenhum'}
                    </p>
                  </div>
                  <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3">
                    <span className="text-[11px] font-semibold text-blue-700">
                      Produto Atual em Processo
                    </span>
                    <p className="text-xs font-bold text-blue-900 mt-1">
                      {center?.currentProduct || center?.materialDescription || 'N/D'}
                    </p>
                  </div>
                  <div className="border border-slate-200 rounded-lg p-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Próximo Produto Programado
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-1">
                      {center?.nextProgrammedProduct || 'N/D'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: Indicadores */}
            <TabsContent value="indicadores" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* OEE */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">OEE do Centro</span>
                    <Badge variant="outline" className="text-xs font-bold text-blue-700">
                      Meta:{' '}
                      {center?.oee.target !== null
                        ? `${formatNumberPtBr(center.oee.target)} %`
                        : 'N/D'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {center?.oee.value !== null ? `${formatNumberPtBr(center.oee.value)} %` : 'N/D'}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    {center?.oee.trend === 'UP' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      Diferença:{' '}
                      {center?.oee.difference !== null
                        ? `${formatNumberPtBr(center.oee.difference)} p.p.`
                        : 'N/D'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 border-t pt-2">
                    Origem: {center?.oee.origin} | Atualizado: {center?.oee.timestamp.slice(11, 19)}
                  </div>
                </div>

                {/* Taxa de Utilização */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Taxa de Utilização</span>
                    <Badge variant="outline" className="text-xs font-bold text-blue-700">
                      Meta:{' '}
                      {center?.utilization.target !== null
                        ? `${formatNumberPtBr(center.utilization.target)} %`
                        : 'N/D'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {center?.utilization.value !== null
                      ? `${formatNumberPtBr(center.utilization.value)} %`
                      : 'N/D'}
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1">
                    {center?.utilization.trend === 'UP' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      Diferença:{' '}
                      {center?.utilization.difference !== null
                        ? `${formatNumberPtBr(center.utilization.difference)} p.p.`
                        : 'N/D'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 border-t pt-2">
                    Origem: {center?.utilization.origin} | Atualizado:{' '}
                    {center?.utilization.timestamp.slice(11, 19)}
                  </div>
                </div>

                {/* Rendimento Metálico */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">Rendimento Metálico</span>
                    <Badge variant="outline" className="text-xs font-bold text-blue-700">
                      Meta:{' '}
                      {center?.metallicYield.targetPct !== null
                        ? `${formatNumberPtBr(center.metallicYield.targetPct)} %`
                        : 'N/D'}
                    </Badge>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {center?.metallicYield.yieldPct !== null
                      ? `${formatNumberPtBr(center.metallicYield.yieldPct)} %`
                      : 'N/D'}
                  </div>
                  <div className="text-xs text-slate-600">
                    Perda estimada:{' '}
                    {center?.metallicYield.estimatedLossTons !== null
                      ? `${formatNumberPtBr(center.metallicYield.estimatedLossTons)} t`
                      : 'N/D'}
                  </div>
                  <div className="text-[11px] text-slate-400 border-t pt-2">
                    Entrada:{' '}
                    {center?.metallicYield.weightInputTons !== null
                      ? `${formatNumberPtBr(center.metallicYield.weightInputTons)} t`
                      : 'N/D'}{' '}
                    | Boa:{' '}
                    {center?.metallicYield.weightGoodProductTons !== null
                      ? `${formatNumberPtBr(center.metallicYield.weightGoodProductTons)} t`
                      : 'N/D'}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: Paradas */}
            <TabsContent value="paradas" className="space-y-4 pt-3">
              {center?.stopsHistory && center.stopsHistory.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Código</th>
                          <th className="p-3">Categoria</th>
                          <th className="p-3">Motivo Informado</th>
                          <th className="p-3">Causa Técnica</th>
                          <th className="p-3">Equipamento</th>
                          <th className="p-3">Início</th>
                          <th className="p-3">Duração</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {center.stopsHistory.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-semibold text-slate-900">{s.stopCode}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[11px] font-medium">
                                {s.categoryLabel}
                              </Badge>
                            </td>
                            <td
                              className="p-3 text-slate-700 max-w-[200px] truncate"
                              title={s.reason}
                            >
                              {s.reason}
                            </td>
                            <td className="p-3 text-slate-600">
                              {s.technicalCauseConfirmed || 'Em análise'}
                            </td>
                            <td className="p-3 text-slate-600">{s.equipment || '-'}</td>
                            <td className="p-3 text-slate-600">{s.startDatetime.slice(11, 16)}</td>
                            <td className="p-3 font-bold text-slate-900">
                              {s.durationMinutes} min
                            </td>
                            <td className="p-3">
                              {s.isOpen ? (
                                <Badge className="bg-rose-600 text-white">Ativa</Badge>
                              ) : (
                                <Badge variant="secondary">Encerrada</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
                  Nenhuma parada registrada para este centro produtivo no período selecionado.
                </div>
              )}
            </TabsContent>

            {/* ABA 4: Timeline */}
            <TabsContent value="timeline" className="space-y-4 pt-3">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#004C97]" />
                  Cronologia de Eventos Reais do Turno
                </div>
                <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                  {center?.timeline.map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-[#004C97] border-2 border-white" />
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700">
                          {ev.timestamp}
                        </span>
                        <Badge variant={ev.badgeVariant || 'secondary'} className="text-[10px]">
                          {ev.type}
                        </Badge>
                        <span className="text-[11px] text-slate-400">Fonte: {ev.source}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 mt-1">{ev.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{ev.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Rodapé Fixo */}
        <DialogFooter className="px-6 py-3 bg-white border-t border-slate-200 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Padrão Industrial ABNT • Ponderação Real por Tempo Produtivo
          </div>
          <Button
            variant="default"
            onClick={() => onOpenChange(false)}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold"
          >
            Fechar Detalhamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
