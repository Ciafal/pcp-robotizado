import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MPSpecialSteelRow, CalculationExplainPayload } from '@/types/mp-optimization'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import {
  Activity,
  Sliders,
  Calendar,
  Clock,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'

export const MPSpecialSteelsSubpage: React.FC = () => {
  // Filtros e Cenários
  const [selectedScenario, setSelectedScenario] = useState<string>('BASE')
  const [selectedDimensionPool, setSelectedDimensionPool] = useState<string>('525_KG')
  const [selectedClass, setSelectedClass] = useState<string>('TODOS')
  const [l2YieldFactor, setL2YieldFactor] = useState<number>(0.95) // Parâmetro versionado (ex: 0.95 = 95%)

  // Modal de Explicabilidade
  const [explainerPayload, setExplainerPayload] = useState<CalculationExplainPayload | null>(null)
  const [isExplainerOpen, setIsExplainerOpen] = useState(false)

  // Dados Simulados de Projeção por Semana, Dia e Turno (Base da planilha "Niveis de estoque Aços Especiais.xlsx")
  const periods = [
    {
      period_ref: 'SEM 36 - D1',
      date_str: '2026-07-06',
      shift_code: 'T1',
      init: 420.0,
      rec: 0,
      l2Prod: 80.0,
      cons: 45.0,
    },
    {
      period_ref: 'SEM 36 - D1',
      date_str: '2026-07-06',
      shift_code: 'T2',
      init: 451.0,
      rec: 0,
      l2Prod: 75.0,
      cons: 50.0,
    },
    {
      period_ref: 'SEM 36 - D1',
      date_str: '2026-07-06',
      shift_code: 'T3',
      init: 472.25,
      rec: 0,
      l2Prod: 60.0,
      cons: 40.0,
    },
    {
      period_ref: 'SEM 36 - D2',
      date_str: '2026-07-07',
      shift_code: 'T1',
      init: 489.25,
      rec: 60.0,
      l2Prod: 85.0,
      cons: 55.0,
    },
    {
      period_ref: 'SEM 36 - D2',
      date_str: '2026-07-07',
      shift_code: 'T2',
      init: 575.0,
      rec: 0,
      l2Prod: 80.0,
      cons: 50.0,
    },
    {
      period_ref: 'SEM 36 - D2',
      date_str: '2026-07-07',
      shift_code: 'T3',
      init: 601.0,
      rec: 0,
      l2Prod: 65.0,
      cons: 45.0,
    },
    {
      period_ref: 'SEM 36 - D3',
      date_str: '2026-07-08',
      shift_code: 'T1',
      init: 617.75,
      rec: 0,
      l2Prod: 40.0,
      cons: 60.0,
    },
    {
      period_ref: 'SEM 36 - D3',
      date_str: '2026-07-08',
      shift_code: 'T2',
      init: 595.75,
      rec: 0,
      l2Prod: 50.0,
      cons: 55.0,
    },
    {
      period_ref: 'SEM 36 - D3',
      date_str: '2026-07-08',
      shift_code: 'T3',
      init: 588.25,
      rec: 0,
      l2Prod: 40.0,
      cons: 50.0,
    },
    {
      period_ref: 'SEM 36 - D4',
      date_str: '2026-07-09',
      shift_code: 'T1',
      init: 576.25,
      rec: 0,
      l2Prod: 30.0,
      cons: 65.0,
    },
    {
      period_ref: 'SEM 36 - D4',
      date_str: '2026-07-09',
      shift_code: 'T2',
      init: 539.75,
      rec: 0,
      l2Prod: 20.0,
      cons: 60.0,
    },
    {
      period_ref: 'SEM 36 - D4',
      date_str: '2026-07-09',
      shift_code: 'T3',
      init: 498.75,
      rec: 0,
      l2Prod: 10.0,
      cons: 55.0,
    },
  ]

  // Projeção dinâmica calculando Produção Útil L2 = Prod L2 * Fator Atendimento
  let currentRunningStock = 420.0
  const specialSteelRows: MPSpecialSteelRow[] = periods.map((p, idx) => {
    const l2Useful = p.l2Prod * l2YieldFactor
    const receptions = p.rec
    const cons = p.cons
    const initStock = idx === 0 ? currentRunningStock : currentRunningStock
    const finalStock = initStock + receptions + l2Useful - cons
    currentRunningStock = finalStock

    return {
      id: `spec-${idx}`,
      scenario_name: selectedScenario,
      dimension_pool: selectedDimensionPool,
      steel_class: 'POOL A / SAE 1020',
      steel_grade: 'SAE 1020 (Q130)',
      period_ref: p.period_ref,
      date_str: p.date_str,
      shift_code: p.shift_code,
      initial_stock_tons: Number(initStock.toFixed(2)),
      receptions_tons: receptions,
      l2_production_tons: p.l2Prod,
      l2_useful_production_tons: Number(l2Useful.toFixed(2)),
      l2_factor_applied: l2YieldFactor,
      scheduled_consumption_tons: cons,
      final_stock_tons: Number(finalStock.toFixed(2)),
      min_stock_limit_tons: 150.0,
      is_rupture: finalStock <= 150.0,
    }
  })

  // Dados do Gráfico
  const chartData = specialSteelRows.map((r) => ({
    label: `${r.period_ref} ${r.shift_code}`,
    'Estoque Projetado (t)': r.final_stock_tons,
    'Estoque Mínimo (t)': 150,
    'Produção Útil L2 (t)': r.l2_useful_production_tons,
    'Consumo Turno (t)': r.scheduled_consumption_tons,
  }))

  const openYieldExplainer = () => {
    const payload = MPCentralProjectionEngine.explainCalculation('ATENDIMENTO_L2', {
      l2Production: 80.0,
      factor: l2YieldFactor,
    })
    setExplainerPayload(payload)
    setIsExplainerOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Topo Oficial */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Níveis de Estoque — Aços Especiais & Projeção por Turno
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 6
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Projeção contínua semana → dia → turno com fator de atendimento e rendimento térmico L2
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openYieldExplainer}
            className="text-xs text-[#004C97] border-[#004C97]/30 bg-blue-50/50 hover:bg-blue-100 gap-1.5 h-8 font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Auditar Fator Atendimento L2
          </Button>
        </div>
      </div>

      {/* Barra de Parâmetros e Cenários */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Cenário:</span>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="h-8 w-36 text-xs bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BASE">Cenário Base (Oficial)</SelectItem>
                <SelectItem value="CENARIO_1">Cenário 1: +20% Prod L2</SelectItem>
                <SelectItem value="CENARIO_2">Cenário 2: Atraso Fornecedor</SelectItem>
                <SelectItem value="CENARIO_3">Cenário 3: Sequência Alternativa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Dimensão / Pool:</span>
            <Select value={selectedDimensionPool} onValueChange={setSelectedDimensionPool}>
              <SelectTrigger className="h-8 w-44 text-xs bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="525_KG">Pool Tarugo 525 kg (130x130)</SelectItem>
                <SelectItem value="510_KG">Pool Tarugo 510 kg (120x120)</SelectItem>
                <SelectItem value="533_KG">Pool Tarugo 533 kg</SelectItem>
                <SelectItem value="472_KG">Pool Tarugo 472 kg</SelectItem>
                <SelectItem value="480_KG">Pool Tarugo 480 kg</SelectItem>
                <SelectItem value="540_KG">Pool Tarugo 540 kg</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold">Classe / Aço:</span>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="h-8 w-36 text-xs bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Pools</SelectItem>
                <SelectItem value="POOL_A">Pool A (1020 / AC)</SelectItem>
                <SelectItem value="POOL_B">Pool B (1045)</SelectItem>
                <SelectItem value="POOL_C">Pool C (Aços Liga 4140/8620)</SelectItem>
                <SelectItem value="POOL_D">Pool D (Especiais 1522/20MnCr5)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Fator Atendimento L2:</span>
          <Input
            type="number"
            step="0.01"
            min="0.70"
            max="1.00"
            value={l2YieldFactor}
            onChange={(e) => setL2YieldFactor(parseFloat(e.target.value) || 0.95)}
            className="h-8 w-20 text-xs text-right font-mono bg-slate-50 font-bold text-[#004C97]"
          />
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700">
            {(l2YieldFactor * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} %
            rendimento
          </Badge>
        </div>
      </div>

      {/* Gráfico de Projeção Turno a Turno */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Curva de Nível de Estoque por Turno (T1, T2, T3) — {selectedDimensionPool}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Interação dinâmica: Saldo Novo = Saldo Anterior + Produção Útil L2 + Recebimentos −
              Consumo
            </CardDescription>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 text-xs">Sem Ruptura no Período</Badge>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit=" t" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <ReferenceLine
                  y={150}
                  label={{
                    value: 'Estoque Mínimo (150 t)',
                    fill: '#dc2626',
                    fontSize: 10,
                    position: 'insideBottomRight',
                  }}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="Estoque Projetado (t)"
                  stroke="#004C97"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#004C97' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Produção Útil L2 (t)"
                  stroke="#16a34a"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="Consumo Turno (t)"
                  stroke="#ea580c"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Turno a Turno */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200">
          <CardTitle className="text-sm font-bold text-slate-900">
            Detalhamento Turno a Turno — Pool 525 kg / SAE 1020
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-800">Período / Data</TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Turno
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Estoque Inicial (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Recebimentos (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Produção L2 Bruta (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-emerald-800 text-right bg-emerald-50/60">
                    Produção Útil L2 (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Consumo Previsto (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-[#004C97] text-right bg-blue-50/70">
                    Estoque Final (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialSteelRows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-xs text-slate-900">
                      <div>{r.period_ref}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(r.date_str).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-mono text-xs font-bold text-slate-700">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {r.shift_code}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-slate-700">
                      {r.initial_stock_tons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-blue-700">
                      {(r.receptions_tons || 0) > 0
                        ? `+${r.receptions_tons?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-slate-500">
                      {r.l2_production_tons?.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-emerald-700 bg-emerald-50/40">
                      +
                      {r.l2_useful_production_tons?.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs text-amber-700">
                      -
                      {r.scheduled_consumption_tons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-black text-[#004C97] bg-blue-50/50">
                      {r.final_stock_tons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                        OK
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Explicador */}
      <CalculationExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
        payload={explainerPayload}
      />
    </div>
  )
}

export default MPSpecialSteelsSubpage
