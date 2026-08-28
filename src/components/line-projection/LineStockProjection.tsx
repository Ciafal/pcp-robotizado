import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Settings,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Calendar,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Sliders,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { lineProjectionEngine } from '@/services/line-projection-engine'
import {
  LineProjectionConfig,
  ProjectionEngineResult,
  DailyProjectionRow,
  ProjectionFlowDefinition,
} from '@/types/inventory-projection'
import { Can } from '@/components/auth/Can'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface LineStockProjectionProps {
  lineCode: string
  lineName?: string
}

export const LineStockProjection: React.FC<LineStockProjectionProps> = ({
  lineCode,
  lineName = `Linha ${lineCode}`,
}) => {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<LineProjectionConfig | null>(null)
  const [projectionResult, setProjectionResult] = useState<ProjectionEngineResult | null>(null)

  // Modos de Visualização & Simulação
  const [activeHorizon, setActiveHorizon] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY')
  const [calculationMode, setCalculationMode] = useState<'PROJECTED' | 'SIMULATED'>('PROJECTED')
  const [selectedDrilldownDay, setSelectedDrilldownDay] = useState<DailyProjectionRow | null>(null)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)

  // Estado editável no modal de configuração
  const [editingConfig, setEditingConfig] = useState<LineProjectionConfig | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const cfg = await lineProjectionEngine.getOrCreateConfig(lineCode)
      setConfig(cfg)
      setEditingConfig(JSON.parse(JSON.stringify(cfg)))

      const result = lineProjectionEngine.calculateProjection(cfg, {
        calculationType: calculationMode,
        horizon: activeHorizon,
      })
      setProjectionResult(result)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao calcular projeção de estoque',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [lineCode, calculationMode, activeHorizon])

  const handleSaveConfig = async () => {
    if (!editingConfig) return
    setSaving(true)
    try {
      const saved = await lineProjectionEngine.saveConfig(editingConfig)
      setConfig(saved)
      setIsConfigModalOpen(false)

      const result = lineProjectionEngine.calculateProjection(saved, {
        calculationType: calculationMode,
        horizon: activeHorizon,
      })
      setProjectionResult(result)

      toast({
        title: 'Configuração de Projeção Salva',
        description: `Parâmetros da ${lineCode} atualizados com sucesso (v${saved.version}).`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar configuração',
        description: err.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAddInputFlow = () => {
    if (!editingConfig) return
    const newFlow: ProjectionFlowDefinition = {
      id: `in-${Date.now()}`,
      name: 'Nova Fonte de Entrada',
      direction: 'INPUT',
      flowType: 'UPSTREAM_PRODUCTION',
      coolingTimeHours: 0,
      isScheduleDependent: true,
      active: true,
    }
    setEditingConfig({
      ...editingConfig,
      input_flow_definitions: [...editingConfig.input_flow_definitions, newFlow],
    })
  }

  const handleRemoveInputFlow = (id: string) => {
    if (!editingConfig) return
    setEditingConfig({
      ...editingConfig,
      input_flow_definitions: editingConfig.input_flow_definitions.filter((f) => f.id !== id),
    })
  }

  return (
    <div className="space-y-5 bg-slate-50/50 p-4 rounded-xl border border-slate-200">
      {/* 1. Header do Módulo de Projeção */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#004C97] text-white rounded-md">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              Projeção de Estoque & Pulmão de Linha: {lineName} ({lineCode})
            </h2>
            <Badge
              className={`text-[10px] font-bold ${
                calculationMode === 'SIMULATED'
                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                  : 'bg-blue-50 text-[#004C97] border-blue-200'
              }`}
            >
              {calculationMode === 'SIMULATED' ? '🧪 SIMULAÇÃO (WHAT-IF)' : '📊 PROJEÇÃO OFICIAL'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fórmula Dinâmica:{' '}
            <strong className="text-slate-700">
              Saldo Final = Saldo Inicial + Entradas Previstas − Consumo/Saídas
            </strong>
            . Considera tempos de resfriamento e metas horárias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternância de Modo Oficial vs Simulação */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setCalculationMode('PROJECTED')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                calculationMode === 'PROJECTED'
                  ? 'bg-[#004C97] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Oficial
            </button>
            <button
              onClick={() => setCalculationMode('SIMULATED')}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                calculationMode === 'SIMULATED'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simulador
            </button>
          </div>

          <Can permission="pcp.projection.configure">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (config) setEditingConfig(JSON.parse(JSON.stringify(config)))
                setIsConfigModalOpen(true)
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8 gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-[#004C97]" /> Parametrizar Fluxos
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. KPIs de Resumo da Projeção */}
      {projectionResult && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Estoque Inicial
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-slate-900 font-mono">
                  {config?.initial_stock_tons.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-400">t</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Total Entradas ({config?.horizon_days}d)
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-emerald-700 font-mono">
                  {projectionResult.summary.totalInputTons.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-400">t</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Consumo Previsto
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-[#004C97] font-mono">
                  {projectionResult.summary.totalOutputTons.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-slate-400">t</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Faixa de Operação
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs font-black text-slate-700 font-mono">
                  {config?.min_stock_limit}t &bull; {config?.target_stock_limit}t &bull;{' '}
                  {config?.max_stock_limit}t
                </span>
              </div>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                Mín &bull; Ideal &bull; Máx
              </span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Dias em Ruptura
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-lg font-black font-mono ${projectionResult.summary.stockoutRiskDays > 0 ? 'text-rose-600' : 'text-slate-800'}`}
                >
                  {projectionResult.summary.stockoutRiskDays}
                </span>
                <span className="text-xs font-bold text-slate-400">dias</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-3">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Tempo Resfriamento
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-black text-amber-700 font-mono">
                  {config?.cooling_time_hours || 0}
                </span>
                <span className="text-xs font-bold text-slate-400">horas</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3. Gráfico Visual de Linhas de Referência: Estoque Projetado x Tempo */}
      {projectionResult && projectionResult.dailyRows.length > 0 && (
        <Card className="bg-white border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Curva de Evolução do Estoque Projetado (t)
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#004C97]" /> Saldo Projetado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-rose-500" /> Mínimo ({config?.min_stock_limit}t)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-500" /> Ideal ({config?.target_stock_limit}
                t)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-amber-500" /> Máximo ({config?.max_stock_limit}t)
              </span>
            </div>
          </div>

          {/* Gráfico de Barras / Linha Simplificado em SVG para Performance */}
          <div className="h-44 w-full flex items-end gap-1.5 pt-6 pb-2 px-2 border-b border-slate-200">
            {projectionResult.dailyRows.map((row) => {
              const maxScale =
                Math.max(
                  config?.max_stock_limit || 500,
                  ...projectionResult.dailyRows.map((r) => r.finalStockTons),
                ) * 1.15
              const heightPct = Math.max(
                4,
                Math.min(100, (Math.max(0, row.finalStockTons) / (maxScale || 1)) * 100),
              )
              const isBelow = row.finalStockTons < row.minLimitTons
              const isAbove = row.finalStockTons > row.maxLimitTons

              return (
                <div
                  key={row.date}
                  onClick={() => setSelectedDrilldownDay(row)}
                  className="flex-1 flex flex-col items-center justify-end h-full group cursor-pointer relative"
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-slate-900 text-white text-[10px] p-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none whitespace-nowrap">
                    <strong>
                      {row.date} ({row.dayOfWeekName})
                    </strong>
                    : {row.finalStockTons} t
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t transition-all ${
                      isBelow
                        ? 'bg-rose-500 hover:bg-rose-600'
                        : isAbove
                          ? 'bg-amber-500 hover:bg-amber-600'
                          : 'bg-[#004C97] hover:bg-blue-700'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-500 mt-1">{row.date}</span>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 4. Tabela de Projeção Operacional com Drill-Down de Entradas (Regras 30 e 31) */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">
            Grade Diária de Balanço de Massa & Entradas/Saídas
          </span>
          <span className="text-[11px] text-slate-500">
            Clique na linha para visualizar o drill-down detalhado de cada entrada
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Dia</th>
                <th className="py-2.5 px-3 text-right">Estoque Inicial (t)</th>
                <th className="py-2.5 px-3 text-right">Entradas Previstas (t)</th>
                <th className="py-2.5 px-3 text-right">Disponível Utilizável (t)</th>
                <th className="py-2.5 px-3 text-right">Em Resfriamento (t)</th>
                <th className="py-2.5 px-3 text-right">Consumo/Saída (t)</th>
                <th className="py-2.5 px-3 text-right">Estoque Final (t)</th>
                <th className="py-2.5 px-3 text-center">Faixa (Mín/Ideal/Máx)</th>
                <th className="py-2.5 px-3 text-center">Status & Alertas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectionResult?.dailyRows.map((row) => {
                const isSelected = selectedDrilldownDay?.date === row.date

                return (
                  <tr
                    key={row.date}
                    onClick={() => setSelectedDrilldownDay(row)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-100/70 font-semibold' : 'hover:bg-blue-50/40'
                    }`}
                  >
                    <td className="py-2 px-3 font-mono font-bold text-slate-900">{row.date}</td>
                    <td className="py-2 px-3 text-slate-600">{row.dayOfWeekName}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {row.initialStockTons.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      +{row.inputTonsTotal.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#004C97]">
                      {row.availableInputTons.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-amber-600">
                      {row.coolingWaitingTons > 0 ? `${row.coolingWaitingTons.toFixed(1)} t` : '--'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                      -{row.outputConsumptionTons.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-black text-slate-900 text-sm">
                      {row.finalStockTons.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-500">
                      {row.minLimitTons} / {row.targetLimitTons} / {row.maxLimitTons}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {row.status === 'BELOW_MINIMUM' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                          Abaixo Mínimo
                        </Badge>
                      ) : row.status === 'ABOVE_MAXIMUM' ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                          Acima Máximo
                        </Badge>
                      ) : row.status === 'RISK_OF_STOCKOUT' ? (
                        <Badge className="bg-rose-600 text-white border-rose-700 text-[9px] font-bold">
                          Ruptura Iminente
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                          Dentro da Meta
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Painel Drill-Down de Entradas Selecionadas */}
      {selectedDrilldownDay && (
        <Card className="bg-white border-blue-200 shadow-md p-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <div>
              <span className="text-xs font-bold text-slate-900">
                Drill-down das Entradas em {selectedDrilldownDay.date} (
                {selectedDrilldownDay.dayOfWeekName})
              </span>
              <p className="text-[11px] text-slate-500">
                Origens de produção upstream, lotes SAP e transferências com cálculo de
                resfriamento.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDrilldownDay(null)}
              className="text-xs h-7 text-slate-500 hover:text-slate-800"
            >
              Fechar Drill-down &times;
            </Button>
          </div>

          <div className="space-y-2">
            {selectedDrilldownDay.inputDetails.map((detail) => (
              <div
                key={detail.id}
                className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{detail.materialDescription}</span>
                    <Badge className="text-[9px] bg-slate-200 text-slate-800 font-mono">
                      Origem: {detail.originLine}
                    </Badge>
                    <Badge className="text-[9px] bg-blue-100 text-blue-900 font-mono">
                      {detail.sourceSystem}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Horário previsto: {detail.scheduledTime} &bull;{' '}
                    {detail.coolingUntil
                      ? `Disponível pós-resfriamento às ${detail.coolingUntil}`
                      : 'Sem restrição térmica'}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-sm font-black text-emerald-700">
                    +{detail.quantityTons} t
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {detail.isProcessReady ? 'Liberado para consumo' : 'Em quarentena/resfriamento'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 6. Modal de Configuração Genérica / Específica de Linha */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#004C97]" /> Parametrizar Projeção de Estoque:{' '}
              {lineCode}
            </DialogTitle>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4 text-xs py-2">
              {/* Parâmetros Gerais */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Estoque Inicial (t)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.initial_stock_tons}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        initial_stock_tons: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Produtividade Meta (t/h)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.hourly_productivity_rate}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        hourly_productivity_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Tempo de Resfriamento (h)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.cooling_time_hours}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        cooling_time_hours: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>
              </div>

              {/* Limites de Estoque */}
              <div className="grid grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Estoque Mínimo (t)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.min_stock_limit}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        min_stock_limit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Estoque Ideal / Target (t)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.target_stock_limit}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        target_stock_limit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Estoque Máximo (t)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.max_stock_limit}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        max_stock_limit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Meta Específica Sexta (t)
                  </Label>
                  <Input
                    type="number"
                    value={editingConfig.friday_target_stock_limit || ''}
                    placeholder="Opcional"
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        friday_target_stock_limit: parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="mt-1 bg-white border-slate-300 text-xs h-8"
                  />
                </div>
              </div>

              {/* Definições de Fluxos de Entrada */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Fontes de Entrada Cadastradas</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddInputFlow}
                    className="h-7 text-[11px] text-[#004C97] border-blue-300"
                  >
                    <Plus className="w-3 h-3 mr-1" /> + Adicionar Entrada
                  </Button>
                </div>

                <div className="space-y-2">
                  {editingConfig.input_flow_definitions.map((flow, idx) => (
                    <div
                      key={flow.id}
                      className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center gap-2"
                    >
                      <Input
                        value={flow.name}
                        onChange={(e) => {
                          const updated = [...editingConfig.input_flow_definitions]
                          updated[idx].name = e.target.value
                          setEditingConfig({ ...editingConfig, input_flow_definitions: updated })
                        }}
                        placeholder="Nome da Fonte"
                        className="bg-white border-slate-300 text-xs h-8 flex-1"
                      />
                      <Input
                        value={flow.sourceOrTargetLineCode || ''}
                        onChange={(e) => {
                          const updated = [...editingConfig.input_flow_definitions]
                          updated[idx].sourceOrTargetLineCode = e.target.value
                          setEditingConfig({ ...editingConfig, input_flow_definitions: updated })
                        }}
                        placeholder="Linha Origem"
                        className="bg-white border-slate-300 text-xs h-8 w-28 font-mono"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveInputFlow(flow.id)}
                        className="text-rose-600 hover:bg-rose-50 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfigModalOpen(false)}
              className="border-slate-300 text-slate-700 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1" /> Salvar Parâmetros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LineStockProjection
