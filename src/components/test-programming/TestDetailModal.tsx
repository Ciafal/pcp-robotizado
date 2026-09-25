import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Calendar,
  Clock,
  RefreshCw,
  Sparkles,
  Building2,
  Layers,
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  User,
} from 'lucide-react'
import { TestProgrammingRecord } from '@/types/test-programming'
import { mesIntegrationService } from '@/services/mes-integration-service'
import { testProgrammingService } from '@/services/test-programming-service'
import { generateTestAiAnalysis } from '@/services/test-ai-service'
import { TestComparisonTimeline } from './TestComparisonTimeline'
import { TestAiAnalysisSection } from './TestAiAnalysisSection'
import { formatDatePTBR, formatTonsPtBr } from '@/lib/formatters-ptbr'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'

interface TestDetailModalProps {
  isOpen: boolean
  onClose: () => void
  testItem: TestProgrammingRecord | null
  allTests?: TestProgrammingRecord[]
  onUpdated?: () => void
}

export const TestDetailModal: React.FC<TestDetailModalProps> = ({
  isOpen,
  onClose,
  testItem,
  allTests = [],
  onUpdated,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<
    'planejamento' | 'mes' | 'comparativo' | 'ocorrencias' | 'impacto' | 'eficacia' | 'ia'
  >('comparativo')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [currentTest, setCurrentTest] = useState<TestProgrammingRecord | null>(testItem)

  React.useEffect(() => {
    setCurrentTest(testItem)
  }, [testItem])

  if (!currentTest) return null

  const dev = currentTest.deviation_metrics
  const mes = currentTest.mes_execution_data
  const hasMes = Boolean(mes?.actual_start_date && mes?.actual_start_time)

  // Disparo manual de sincronização do MES (Requisito 4 e 14)
  const handleSyncMes = async () => {
    if (!currentTest) return
    setIsSyncing(true)
    try {
      const res = await mesIntegrationService.syncTestExecution(currentTest)
      if (res.success && res.executionData) {
        const updated = await testProgrammingService.update(
          currentTest.id,
          {
            mes_integration_status: res.status,
            mes_execution_data: res.executionData,
            deviation_metrics: res.deviations || undefined,
            mes_last_sync: res.syncedAt,
            mes_sync_message: res.message,
          },
          { id: user?.id, name: user?.name || 'Programador PCP', role: user?.role },
          'Sincronização MES 4.0 realizada',
          'MES 4.0',
        )
        setCurrentTest(updated)
        toast({
          title: 'Sincronização com MES 4.0 concluída',
          description: res.message,
        })
        onUpdated?.()
      } else {
        // Atualiza status e mensagem informativa (sem zeros falsos)
        const updated = await testProgrammingService.update(
          currentTest.id,
          {
            mes_integration_status: res.status,
            mes_sync_message: res.message,
            mes_last_sync: res.syncedAt,
          },
          { id: user?.id, name: user?.name || 'Programador PCP', role: user?.role },
          'Tentativa de sincronização MES 4.0',
          'PCP Robotizado',
        )
        setCurrentTest(updated)
        toast({
          title: 'Aguardando dados MES 4.0',
          description: res.message,
          variant: 'default',
        })
        onUpdated?.()
      }
    } catch (err: any) {
      toast({
        title: 'Falha na comunicação MES 4.0',
        description: err?.message || 'Erro ao sincronizar com chão de fábrica.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Gera ou recarrega análise IA sob demanda
  const aiAnalysis = currentTest.ai_analysis_data || generateTestAiAnalysis(currentTest, allTests)

  const handleRefreshAi = () => {
    setIsAiLoading(true)
    setTimeout(() => {
      const refreshed = generateTestAiAnalysis(currentTest, allTests)
      setCurrentTest((prev) => (prev ? { ...prev, ai_analysis_data: refreshed } : null))
      setIsAiLoading(false)
      toast({
        title: 'Análise IA Recalculada',
        description: 'Parâmetros atualizados com as 7 seções recomendadas.',
      })
    }, 400)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="test-detail-modal"
        className="max-w-4xl max-h-[92vh] overflow-y-auto"
      >
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#004C97] text-white font-mono text-xs font-bold px-2 py-0.5">
                {currentTest.test_id}
              </Badge>
              <DialogTitle className="text-base font-bold text-slate-900">
                {currentTest.title}
              </DialogTitle>
            </div>

            <div className="flex items-center gap-2">
              {/* Badge do MES */}
              <Badge
                variant="outline"
                className={`text-[11px] font-semibold flex items-center gap-1 ${
                  currentTest.mes_integration_status === 'Sincronizado'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : currentTest.mes_integration_status === 'Aguardando dados MES'
                      ? 'border-amber-300 bg-amber-50 text-amber-800'
                      : 'border-slate-300 bg-slate-50 text-slate-600'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>MES 4.0: {currentTest.mes_integration_status || 'Aguardando execução'}</span>
              </Badge>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncMes}
                disabled={isSyncing}
                className="text-xs h-7 gap-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar MES</span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-1">
            {currentTest.company} • Linha {currentTest.production_line}{' '}
            {currentTest.work_center ? `• Centro ${currentTest.work_center}` : ''} • Solicitante:{' '}
            {currentTest.requester_name}
          </p>
        </DialogHeader>

        {/* Abas com as 6 seções obrigatórias + IA */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid grid-cols-4 md:grid-cols-7 h-9 bg-slate-100 p-1">
            <TabsTrigger value="comparativo" className="text-xs font-semibold">
              Previsto x Realizado
            </TabsTrigger>
            <TabsTrigger value="planejamento" className="text-xs font-semibold">
              Planejamento PCP
            </TabsTrigger>
            <TabsTrigger value="mes" className="text-xs font-semibold">
              Execução MES
            </TabsTrigger>
            <TabsTrigger value="ocorrencias" className="text-xs font-semibold">
              Ocorrências
            </TabsTrigger>
            <TabsTrigger value="impacto" className="text-xs font-semibold">
              Impacto Produtivo
            </TabsTrigger>
            <TabsTrigger value="eficacia" className="text-xs font-semibold">
              Eficácia
            </TabsTrigger>
            <TabsTrigger value="ia" className="text-xs font-semibold text-blue-700">
              Análise IA
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: PREVISTO X REALIZADO (LADO A LADO + TIMELINE) */}
          <TabsContent value="comparativo" className="space-y-4 pt-2">
            {/* Timeline Horizontal Gráfica (Requisito 11) */}
            <TestComparisonTimeline
              planned={{
                startDate: currentTest.expected_start_date || currentTest.expected_date,
                startTime: currentTest.expected_start_time || '08:00',
                endDate: currentTest.expected_end_date || currentTest.expected_date,
                endTime: currentTest.expected_end_time || '10:30',
                durationFormatted: currentTest.expected_duration_formatted || '2 h 30 min',
              }}
              actual={
                hasMes
                  ? {
                      startDate: mes!.actual_start_date,
                      startTime: mes!.actual_start_time,
                      endDate: mes!.actual_end_date,
                      endTime: mes!.actual_end_time,
                      durationFormatted: mes!.actual_duration_formatted,
                    }
                  : null
              }
              startDeviationFormatted={dev?.start_deviation_formatted}
              durationDeviationFormatted={dev?.duration_deviation_formatted}
            />

            {/* Comparação Lado a Lado (Requisito 5: blocos distintos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Bloco PLANEJADO - PCP */}
              <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <span className="text-xs font-bold text-[#004C97] uppercase tracking-wide">
                    PLANEJADO — PCP
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-blue-900">
                    Origem: Programação PCP
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Início Previsto</span>
                    <strong className="text-slate-800 font-mono">
                      {formatDatePTBR(currentTest.expected_start_date || currentTest.expected_date)}{' '}
                      {currentTest.expected_start_time || '08:00'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Término Previsto</span>
                    <strong className="text-slate-800 font-mono">
                      {formatDatePTBR(currentTest.expected_end_date || currentTest.expected_date)}{' '}
                      {currentTest.expected_end_time || '10:30'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Duração Prevista</span>
                    <strong className="text-[#004C97] font-mono">
                      {currentTest.expected_duration_formatted || '2 h 30 min'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Linha / Centro</span>
                    <strong className="text-slate-800">
                      {currentTest.production_line} • {currentTest.work_center || '-'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bloco REALIZADO - MES 4.0 */}
              <div className="p-3.5 bg-teal-50/40 border border-teal-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                  <span className="text-xs font-bold text-teal-900 uppercase tracking-wide">
                    REALIZADO — MES 4.0
                  </span>
                  <Badge className="text-[10px] bg-teal-600 text-white font-medium">
                    Origem: MES 4.0
                  </Badge>
                </div>

                {hasMes ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Início Realizado</span>
                      <strong className="text-slate-800 font-mono">
                        {formatDatePTBR(mes!.actual_start_date)} {mes!.actual_start_time}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Término Realizado</span>
                      <strong className="text-slate-800 font-mono">
                        {formatDatePTBR(mes!.actual_end_date)} {mes!.actual_end_time}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Duração Real</span>
                      <strong className="text-teal-800 font-mono">
                        {mes!.actual_duration_formatted}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Volume Apontado</span>
                      <strong className="text-slate-800">
                        {formatTonsPtBr(mes!.quantity_produced)}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                      Dados realizados ainda não disponíveis no MES 4.0.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      O teste ainda não teve telemetria recebida do chão de fábrica.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSyncMes}
                      disabled={isSyncing}
                      className="text-xs h-7 gap-1 mt-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>Sincronizar MES</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Painel de Desvios Automáticos (Requisito 6) */}
            {dev && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                  Desvios Calculados Automaticamente
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block">Δ Início</span>
                    <strong className="text-sm font-mono text-slate-800">
                      {dev.start_deviation_formatted}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block">Δ Término</span>
                    <strong className="text-sm font-mono text-slate-800">
                      {dev.end_deviation_formatted}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block">Δ Duração</span>
                    <strong className="text-sm font-mono text-slate-800">
                      {dev.duration_deviation_formatted}
                    </strong>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 uppercase block">
                      Δ Percentual (%)
                    </span>
                    <strong className="text-sm font-mono text-[#004C97]">
                      {dev.percentage_deviation_formatted}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ABA 2: PLANEJAMENTO (DADOS COMPLETOS PCP) */}
          <TabsContent value="planejamento" className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Empresa</span>
                <strong className="text-slate-800">{currentTest.company}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Linha de Produção
                </span>
                <strong className="text-slate-800">{currentTest.production_line}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Centro SAP</span>
                <strong className="text-slate-800">
                  {currentTest.work_center || 'Não informado'}
                </strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Solicitante</span>
                <strong className="text-slate-800">{currentTest.requester_name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Responsável Técnico
                </span>
                <strong className="text-slate-800">{currentTest.technical_lead}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Setor</span>
                <strong className="text-slate-800">{currentTest.requesting_sector}</strong>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Objetivo & Justificativa
              </span>
              <p className="text-slate-800">
                <strong>Objetivo:</strong> {currentTest.objective}
              </p>
              <p className="text-slate-800">
                <strong>Justificativa:</strong> {currentTest.justification}
              </p>
              {currentTest.description && (
                <p className="text-slate-600">
                  <strong>Procedimento:</strong> {currentTest.description}
                </p>
              )}
            </div>
          </TabsContent>

          {/* ABA 3: EXECUÇÃO MES (TELEMETRIA REAL) */}
          <TabsContent value="mes" className="space-y-3 pt-2 text-xs">
            <div className="flex items-center justify-between p-3 bg-teal-50/60 border border-teal-200 rounded-lg">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Badge className="bg-teal-700 text-white text-[10px]">Origem: MES 4.0</Badge>
                  Chão de Fábrica Conectado
                </span>
                <p className="text-[11px] text-teal-800">
                  Campos alimentados automaticamente pela telemetria industrial sem redigitação.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncMes}
                disabled={isSyncing}
                className="text-xs h-7 gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar MES</span>
              </Button>
            </div>

            {hasMes ? (
              <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">OP Relacionada</span>
                  <strong className="font-mono text-blue-900">{mes!.production_order}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Material</span>
                  <strong className="text-slate-800">
                    {mes!.material_code} - {mes!.material_description}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Qtd Produzida</span>
                  <strong className="text-slate-800">
                    {formatTonsPtBr(mes!.quantity_produced)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Operador / Chão
                  </span>
                  <strong className="text-slate-800">
                    {mes!.operator_name || 'Operador Linha'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Duração Real</span>
                  <strong className="font-mono text-teal-800">
                    {mes!.actual_duration_formatted}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">
                    Velocidade Média
                  </span>
                  <strong className="text-slate-800">
                    {mes!.production_speed ? `${mes!.production_speed} t/h` : '18,5 t/h'}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 bg-white border border-slate-200 rounded-lg space-y-1">
                <p className="text-sm font-semibold text-slate-700">
                  Dados realizados ainda não disponíveis no MES 4.0.
                </p>
                <p className="text-xs text-slate-400">
                  O registro não possui telemetria real vinculada no chão de fábrica.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ABA 4: OCORRÊNCIAS DURANTE O TESTE (PARADAS MES) */}
          <TabsContent value="ocorrencias" className="space-y-3 pt-2 text-xs">
            {hasMes && mes!.stops && mes!.stops.length > 0 ? (
              <div className="space-y-2">
                <span className="font-bold text-slate-800 block">
                  Paradas Registradas no Período do Teste:
                </span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2">Início</th>
                        <th className="p-2">Fim</th>
                        <th className="p-2">Duração</th>
                        <th className="p-2">Código Motivo</th>
                        <th className="p-2">Descrição da Parada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mes!.stops.map((stop, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-mono">{stop.start_time}</td>
                          <td className="p-2 font-mono">{stop.end_time}</td>
                          <td className="p-2 font-mono font-bold text-rose-700">
                            {stop.duration_minutes} min
                          </td>
                          <td className="p-2 font-mono">{stop.reason_code}</td>
                          <td className="p-2 text-slate-800">{stop.reason_description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 bg-white border border-slate-200 rounded-lg">
                Nenhuma parada registrada pelo MES 4.0 durante o intervalo do teste.
              </div>
            )}
          </TabsContent>

          {/* ABA 5: IMPACTO PRODUTIVO */}
          <TabsContent value="impacto" className="space-y-3 pt-2 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <span className="font-bold text-slate-800 block">Tipo de Impacto Programado:</span>
              <Badge variant="outline" className="text-xs font-semibold">
                {currentTest.schedule_impact_type}
              </Badge>
              {currentTest.schedule_impact_type === 'PARADA_TOTAL' && (
                <p className="text-slate-600">
                  Parada total autorizada na linha {currentTest.production_line} com duração
                  estimada de {currentTest.expected_duration_formatted || '2 h 30 min'}.
                </p>
              )}
              {currentTest.schedule_impact_type === 'REDUCAO_RITMO' && (
                <p className="text-slate-600">
                  Redução de ritmo concedida na programação fabril para validação segura.
                </p>
              )}
            </div>
          </TabsContent>

          {/* ABA 6: EFICÁCIA */}
          <TabsContent value="eficacia" className="space-y-3 pt-2 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Resultado da Avaliação de Eficácia:
                </span>
                {currentTest.efficacy_evaluation?.outcome ? (
                  <Badge
                    className={`${
                      currentTest.efficacy_evaluation.outcome === 'EFICAZ'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {currentTest.efficacy_evaluation.outcome}
                  </Badge>
                ) : (
                  <Badge variant="outline">Aguardando Avaliação</Badge>
                )}
              </div>

              {currentTest.efficacy_criteria && (
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Indicador Alvo</span>
                    <strong>{currentTest.efficacy_criteria.indicator}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Meta Esperada</span>
                    <strong>
                      {currentTest.efficacy_criteria.expectedTarget}{' '}
                      {currentTest.efficacy_criteria.unit}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ABA 7: ANÁLISE IA (REQUISITO 13 COM AS 7 SEÇÕES EXATAS) */}
          <TabsContent value="ia" className="space-y-3 pt-2">
            <TestAiAnalysisSection
              analysis={aiAnalysis}
              onRefresh={handleRefreshAi}
              isRefreshing={isAiLoading}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
