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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MPUtilizationItem, CalculationExplainPayload } from '@/types/mp-optimization'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'
import { CalculationExplainerModal } from '@/components/mp-optimization/CalculationExplainerModal'
import {
  Flame,
  Snowflake,
  AlertOctagon,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  ArrowRightLeft,
  Sparkles,
} from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

export const MPUtilizationAndSubstitutionSubpage: React.FC = () => {
  // Filtros
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026_ANUAL')
  const [selectedOrigin, setSelectedOrigin] = useState<string>('TODOS')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modal Explicador
  const [explainerPayload, setExplainerPayload] = useState<CalculationExplainPayload | null>(null)
  const [isExplainerOpen, setIsExplainerOpen] = useState(false)

  // Dados Oficiais de Histórico por Ordem (Base da planilha "Utilização MP 1020 2026.xlsm")
  const utilizationRows: MPUtilizationItem[] = [
    {
      id: 'ord-101',
      order_number: 'OP-2026-9901',
      period_week: 'Semana 24',
      period_month: 'Junho',
      period_year: 2026,
      product_code: 'BARRA-RED-25',
      product_description: 'Barra Redonda Laminada 25mm Comercial',
      produced_tons: 85.0,
      mp_consumed_code: 'MP-TG-1020-130',
      mp_consumed_tons: 90.5,
      steel_grade: 'SAE 1020',
      origin_group: 'ArcelorMittal',
      supplier_name: 'ArcelorMittal Tubarão',
      hot_charging_tons: 65.0,
      cold_charging_tons: 25.5,
      charging_type: 'MISTO',
      standard_mp_rule: 'Elegível para Aço Comercial (AC)',
      could_be_ac: true,
      is_substitute_application: true,
      substitution_category: '1020 no lugar de AC',
      deviation_detected: true,
      deviation_impact_tons: 90.5,
      deviation_reason:
        'Falta de lote AC no pátio L1 no momento do enfornamento forçou uso de 1020.',
      observation: 'Substituição elevou custo operacional em R$ 42/t.',
    },
    {
      id: 'ord-102',
      order_number: 'OP-2026-9908',
      period_week: 'Semana 24',
      period_month: 'Junho',
      period_year: 2026,
      product_code: 'BARRA-CHAT-50X10',
      product_description: 'Barra Chata 50x10 mm Específica 1020',
      produced_tons: 120.0,
      mp_consumed_code: 'MP-TG-1020-130',
      mp_consumed_tons: 127.2,
      steel_grade: 'SAE 1020',
      origin_group: 'Ciafal L2',
      supplier_name: 'Produção Própria L2',
      hot_charging_tons: 127.2,
      cold_charging_tons: 0,
      charging_type: 'QUENTE',
      standard_mp_rule: 'Obrigatório SAE 1020',
      could_be_ac: false,
      should_be_1020: true,
      is_substitute_application: false,
      deviation_detected: false,
      observation: '100% Enfornamento a quente. Rendimento padrão atingido.',
    },
    {
      id: 'ord-103',
      order_number: 'OP-2026-9915',
      period_week: 'Semana 24',
      period_month: 'Junho',
      period_year: 2026,
      product_code: 'CANTONEIRA-38X3',
      product_description: 'Cantoneira de Abas Iguais 38x3 mm',
      produced_tons: 60.0,
      mp_consumed_code: 'MP-TG-1020-MPI',
      mp_consumed_tons: 63.8,
      steel_grade: 'SAE 1020',
      origin_group: 'Vallourec',
      supplier_name: 'Vallourec Soluções',
      hot_charging_tons: 0,
      cold_charging_tons: 63.8,
      charging_type: 'FRIO',
      standard_mp_rule: 'Elegível para Aço Comercial (AC)',
      could_be_ac: true,
      is_substitute_application: true,
      substitution_category: '1020 MPI no lugar de AC',
      deviation_detected: true,
      deviation_impact_tons: 63.8,
      deviation_reason: 'Utilização de lote MPI disponível para evitar parada de linha.',
      observation: 'Enfornamento frio.',
    },
    {
      id: 'ord-104',
      order_number: 'OP-2026-9922',
      period_week: 'Semana 23',
      period_month: 'Junho',
      period_year: 2026,
      product_code: 'PERFIL-U-75',
      product_description: 'Perfil U Estrutural 75mm',
      produced_tons: 180.0,
      mp_consumed_code: 'MP-TG-1045-130',
      mp_consumed_tons: 191.0,
      steel_grade: 'SAE 1045',
      origin_group: 'Gerdau',
      supplier_name: 'Gerdau Aços Especiais',
      hot_charging_tons: 191.0,
      cold_charging_tons: 0,
      charging_type: 'QUENTE',
      standard_mp_rule: 'Obrigatório SAE 1045',
      could_be_ac: false,
      is_substitute_application: false,
      deviation_detected: false,
      observation: 'Lote 100% conforme.',
    },
    {
      id: 'ord-105',
      order_number: 'OP-2026-9930',
      period_week: 'Semana 23',
      period_month: 'Junho',
      period_year: 2026,
      product_code: 'BARRA-QUAD-30',
      product_description: 'Barra Quadrada 30mm Comercial',
      produced_tons: 95.0,
      mp_consumed_code: 'MP-TG-1020-130',
      mp_consumed_tons: 101.5,
      steel_grade: 'SAE 1020',
      origin_group: '1020 L2',
      supplier_name: 'Produção Própria L2',
      hot_charging_tons: 80.0,
      cold_charging_tons: 21.5,
      charging_type: 'MISTO',
      standard_mp_rule: 'Elegível para Aço Comercial (AC)',
      could_be_ac: true,
      is_substitute_application: true,
      substitution_category: '1020 L2 no lugar de AC',
      deviation_detected: true,
      deviation_impact_tons: 101.5,
      deviation_reason: 'Tarugo 1020 gerado na L2 consumido em perfil comercial.',
      observation: 'Consumo antecipou necessidade de reposição de tarugos nobres.',
    },
  ]

  // Métricas Consolidadas de Substituição e Enfornamento
  const totalProducedTons = utilizationRows.reduce((a, b) => a + b.produced_tons, 0)
  const totalConsumedTons = utilizationRows.reduce((a, b) => a + b.mp_consumed_tons, 0)
  const totalHotChargingTons = utilizationRows.reduce((a, b) => a + (b.hot_charging_tons || 0), 0)
  const totalColdChargingTons = utilizationRows.reduce((a, b) => a + (b.cold_charging_tons || 0), 0)
  const pctHotCharging =
    totalConsumedTons > 0 ? (totalHotChargingTons / totalConsumedTons) * 100 : 0

  // Substituições (1020 no lugar de AC)
  const eligibleAcRows = utilizationRows.filter((r) => r.could_be_ac)
  const totalEligibleAcTons = eligibleAcRows.reduce((a, b) => a + b.mp_consumed_tons, 0)
  const substitutedAcRows = utilizationRows.filter((r) => r.is_substitute_application)
  const totalSubstitutedTons = substitutedAcRows.reduce((a, b) => a + b.mp_consumed_tons, 0)
  const pctSubstitution =
    totalEligibleAcTons > 0 ? (totalSubstitutedTons / totalEligibleAcTons) * 100 : 0

  // Dados do Gráfico de Enfornamento
  const chargingPieData = [
    {
      name: 'Enfornamento a Quente',
      value: Number(totalHotChargingTons.toFixed(1)),
      color: '#ea580c',
    },
    {
      name: 'Enfornamento a Frio',
      value: Number(totalColdChargingTons.toFixed(1)),
      color: '#0284c7',
    },
  ]

  const openSubstitutionExplainer = () => {
    const payload = MPCentralProjectionEngine.explainCalculation('SUBSTITUICAO_AC', {
      substituteVolume: totalSubstitutedTons,
      eligibleVolume: totalEligibleAcTons,
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
              Utilização & Substituição de MP (1020 vs AC)
            </h2>
            <Badge className="bg-[#004C97] hover:bg-[#003870] text-white text-[10px] uppercase font-bold tracking-wider">
              Subtópico 8
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Qual MP deveria ter sido usada vs qual foi realmente utilizada? Desvios por ordem e
            enfornamento quente/frio
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openSubstitutionExplainer}
            className="text-xs text-[#004C97] border-[#004C97]/30 bg-blue-50/50 hover:bg-blue-100 gap-1.5 h-8 font-semibold"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Auditar % Substituição 1020/AC
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              % 1020 no Lugar de AC
            </span>
            <div className="text-xl font-black text-rose-600 font-mono mt-1">
              {pctSubstitution.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              %
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {totalSubstitutedTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t de{' '}
              {totalEligibleAcTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t elegíveis
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              Enfornamento a Quente
            </span>
            <div className="text-xl font-black text-orange-600 font-mono mt-1">
              {pctHotCharging.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              %
            </div>
            <span className="text-[10px] text-orange-600 font-semibold block mt-0.5">
              {totalHotChargingTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t direto da L2
            </span>{' '}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <Snowflake className="w-3.5 h-3.5 text-blue-500" />
              Enfornamento a Frio
            </span>
            <div className="text-xl font-black text-blue-600 font-mono mt-1">
              {(100 - pctHotCharging).toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              %
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {totalColdChargingTons.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}{' '}
              t do pátio
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Desvios Identificados
            </span>
            <div className="text-xl font-black text-amber-700 font-mono mt-1">
              {substitutedAcRows.length}{' '}
              <span className="text-xs font-normal text-slate-500">ordens</span>
            </div>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">
              Impacto no estoque nobre
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico e Análise de Grupos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico Donut de Enfornamento */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase">
              Relação Térmica: Quente vs Frio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chargingPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chargingPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} t`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-500 text-center mt-2">
              Meta energética CIAFAL: &gt; 70% enfornamento a quente
            </div>
          </CardContent>
        </Card>

        {/* Grupos Analíticos de MP */}
        <Card className="bg-white border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-xs font-bold text-slate-900 uppercase">
              Classificação por Grupos Analíticos de MP
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[10px]">ArcelorMittal</span>
                <span className="font-bold text-slate-900 text-sm">90.5 t</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[10px]">Vallourec Soluções</span>
                <span className="font-bold text-slate-900 text-sm">63.8 t</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[10px]">Ciafal L2 (Própria)</span>
                <span className="font-bold text-slate-900 text-sm">228.7 t</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[10px]">Gerdau Especiais</span>
                <span className="font-bold text-slate-900 text-sm">191.0 t</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[10px]">Aço Comercial AC</span>
                <span className="font-bold text-slate-900 text-sm">0.0 t</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 block text-[10px]">Ecosucata / Faca</span>
                <span className="font-bold text-slate-900 text-sm">15.2 t</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Desvios de Aplicação por Ordem */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 bg-slate-50/70 border-b border-slate-200 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Desvios de Aplicação e Rastreabilidade por Ordem de Produção
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confronto regra técnica vs apontamento real SAP MB51/CO03
            </CardDescription>
          </div>
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-xs">
            Motor de Regras ZPPT058
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/70">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-800">Ordem SAP</TableHead>
                  <TableHead className="text-xs font-bold text-slate-800">Produto Final</TableHead>
                  <TableHead className="text-xs font-bold text-slate-800">
                    MP Padrão (Regra)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800">
                    MP Efetiva Consumida
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-right">
                    Peso Consumido (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800 text-center">
                    Enfornamento
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-800">
                    Desvio Identificado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {utilizationRows.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-mono text-xs font-bold text-[#004C97]">
                      <div>{r.order_number}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{r.period_week}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-900">
                      <div className="font-semibold">{r.product_code}</div>
                      <div className="text-[10px] text-slate-400">{r.product_description}</div>
                    </TableCell>

                    <TableCell className="text-xs text-slate-600">
                      <span className="font-medium">{r.standard_mp_rule}</span>
                    </TableCell>

                    <TableCell className="text-xs text-slate-900 font-semibold">
                      <div>{r.steel_grade}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{r.origin_group}</div>
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs font-bold text-slate-800">
                      {r.mp_consumed_tons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}{' '}
                      t
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={`text-[10px] ${
                          r.charging_type === 'QUENTE'
                            ? 'bg-orange-100 text-orange-800 border-orange-200'
                            : r.charging_type === 'FRIO'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                        }`}
                      >
                        {r.charging_type}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs">
                      {r.deviation_detected ? (
                        <div>
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-semibold mb-0.5">
                            {r.substitution_category}
                          </Badge>
                          <div className="text-[10px] text-slate-500">{r.deviation_reason}</div>
                        </div>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Conforme
                        </Badge>
                      )}
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

export default MPUtilizationAndSubstitutionSubpage
