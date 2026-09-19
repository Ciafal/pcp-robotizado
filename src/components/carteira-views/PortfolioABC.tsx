import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  AlertTriangle,
  Bot,
  ChevronRight,
  ShieldAlert,
  Download,
  Filter,
  DollarSign,
  PackageCheck,
  Percent,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import {
  ItemCurvaAbcCalculado,
  CurvaAbcResultadoConsolidado,
} from '@/services/curva-abc-faturamento-engine'
import {
  formatNumberPTBR,
  formatCurrencyPTBR,
  formatPercentagePTBR,
  formatDatePTBR,
} from '@/lib/formatters-ptbr'
import { PortfolioDrilldown } from './PortfolioDrilldown'
import { AnalyticalModal } from '@/components/common/AnalyticalModal'

interface PortfolioABCProps {
  isOpen: boolean
  onClose: () => void
  resultadoABC: CurvaAbcResultadoConsolidado
  onSelectMaterial?: (item: ItemCurvaAbcCalculado) => void
  onDrilldownFaixa?: (faixa: 'A' | 'B' | 'C', itens: ItemCurvaAbcCalculado[]) => void
}

export const PortfolioABC: React.FC<PortfolioABCProps> = ({
  isOpen,
  onClose,
  resultadoABC,
  onSelectMaterial,
  onDrilldownFaixa,
}) => {
  const [curvaFiltroDrilldown, setCurvaFiltroDrilldown] = useState<'A' | 'B' | 'C' | null>(null)
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)

  const {
    itens,
    resumoA,
    resumoB,
    resumoC,
    faturamentoTotal_brl,
    tonelagemTotal_t,
    alertasPrioritariosCurvaA,
    parametrosAplicados,
    fonteFaturamentoParametrizada,
  } = resultadoABC

  const limiteA = parametrosAplicados.corteA_pct ?? 85
  const limiteB = parametrosAplicados.corteB_pct ?? 95

  // Prepara dados do Pareto (Top 25 materiais por faturamento para visualização nítida)
  const dadosPareto = useMemo(() => {
    return itens.slice(0, 25).map((it) => ({
      material: it.codigo_material,
      descricao: it.descricao_material,
      faturamento: it.faturamento_brl,
      percentualAcumulado: it.participacao_acumulada_pct,
      toneladas: it.carteira_tons,
      curva: it.curva_abc,
      deficit: it.deficit_tons,
      cobertura: it.dias_cobertura,
      // Curva A = Azul Institucional Forte, Curva B = Azul Médio, Curva C = Cinza-Azulado
      fillColor: it.curva_abc === 'A' ? '#004C97' : it.curva_abc === 'B' ? '#3380CC' : '#94A3B8',
    }))
  }, [itens])

  const abrirDrilldownCurva = (curva: 'A' | 'B' | 'C') => {
    if (onDrilldownFaixa) {
      const itensFaixa = itens.filter((i) => i.curva_abc === curva)
      onDrilldownFaixa(curva, itensFaixa)
      return
    }
    setCurvaFiltroDrilldown(curva)
    setIsDrilldownOpen(true)
  }

  // Exportar dados em CSV formatado
  const exportarCSV = () => {
    const cabecalho =
      'Material;Descrição;Curva ABC;Carteira (t);Faturamento Estimado (R$);% do Total;% Acumulado;Estoque (t);Programado (t);Déficit (t);Risco\n'
    const linhas = itens
      .map(
        (i) =>
          `"${i.codigo_material}";"${i.descricao_material}";"${i.curva_abc}";${i.carteira_tons.toFixed(2)};${i.faturamento_brl.toFixed(2)};${i.participacao_individual_pct.toFixed(2)};${i.participacao_acumulada_pct.toFixed(2)};${i.estoque_disponivel_tons.toFixed(2)};${i.programado_tons.toFixed(2)};${i.deficit_tons.toFixed(2)};"${i.risco}"`,
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `curva_abc_faturamento_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const kpisTopo = [
    {
      label: 'Base Analisada',
      value: `${itens.length} materiais`,
    },
    {
      label: 'Faturamento Total',
      value: formatCurrencyPTBR(faturamentoTotal_brl),
    },
    {
      label: 'Volume Físico',
      value: `${formatNumberPTBR(tonelagemTotal_t, 2)} t`,
    },
  ]

  return (
    <>
      <AnalyticalModal
        isOpen={isOpen}
        onClose={onClose}
        size="analytical"
        badge="Curva ABC • Faturamento"
        title="Curva ABC & Diagrama de Pareto Comercial"
        subtitle="Classificação estratégica por faturamento em R$ (não tonelagem) com identificação de riscos de ruptura e impactos na receita"
        headerKpis={kpisTopo}
        scrollMode="auto"
        footer={
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800">Fonte: SAP RFC ZSD28C</span>
              <span className="text-slate-300">•</span>
              <span>
                {fonteFaturamentoParametrizada
                  ? 'Faturamento real SAP RFC ZSD28C'
                  : 'Preços médios por família (ZSD28C)'}
              </span>
              <span className="text-slate-300">•</span>
              <span>Última sincronização: {formatDatePTBR(new Date().toISOString())}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={exportarCSV}
                className="h-8 text-xs font-semibold border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5 px-3"
              >
                <Download className="w-3.5 h-3.5 text-[#004C97]" /> Exportar CSV
              </Button>
              <Button
                size="sm"
                onClick={onClose}
                className="h-8 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white px-5 shadow-xs"
              >
                Fechar
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* ALERTA CRÍTICO LIMPO (Fundo vermelho claro, sem blocos vinho escuros) */}
          {alertasPrioritariosCurvaA.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl shadow-xs">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-rose-100 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-rose-900 tracking-wide uppercase">
                      Alerta Prioritário • Ruptura Comercial na Curva A
                    </span>
                    <Badge className="bg-rose-200 text-rose-900 border-rose-300 text-[10px] font-bold">
                      {alertasPrioritariosCurvaA.length} itens em atenção
                    </Badge>
                  </div>
                  <div className="space-y-1 mt-1 text-xs text-rose-950 font-medium">
                    {alertasPrioritariosCurvaA.map((alerta, idx) => (
                      <p key={idx} className="leading-relaxed">
                        • {alerta}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3 CARDS CURVA A / B / C EM GRID RESPONSIVO (Hierarquia vertical, sem linha estreita, valores integrais) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0 w-full">
            {/* Card Curva A (Azul Institucional Forte) */}
            <div
              onClick={() => abrirDrilldownCurva('A')}
              className="p-4 sm:p-5 bg-white rounded-xl border-2 border-blue-200 hover:border-[#004C97] cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between group min-w-0"
            >
              <div className="space-y-3">
                {/* Linha 1: Badge + Limite */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#004C97] text-white text-xs font-bold px-2.5 py-0.5 tracking-wide">
                      Curva A
                    </Badge>
                    <span className="text-xs font-semibold text-slate-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      Até {formatPercentagePTBR(limiteA, 0)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {resumoA.quantidade_itens} materiais
                  </span>
                </div>

                {/* Linha 2 e 3: Percentual e Faturamento integral */}
                <div className="pt-1">
                  <div className="text-xs text-slate-500 font-medium">Concentração de Receita</div>
                  <div className="text-base sm:text-lg font-bold font-sans text-[#004C97] mt-0.5">
                    {formatPercentagePTBR(resumoA.percentual_faturamento, 2)} do faturamento
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-[26px] font-bold font-sans text-slate-950 mt-1 whitespace-nowrap tracking-tight">
                    {formatCurrencyPTBR(resumoA.faturamento_brl)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
                    <span>
                      Volume físico:{' '}
                      <strong className="text-slate-800">
                        {formatNumberPTBR(resumoA.toneladas, 2)} t
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#004C97] group-hover:text-[#003870]">
                <span>Ver materiais Curva A &rarr;</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Card Curva B (Azul Médio) */}
            <div
              onClick={() => abrirDrilldownCurva('B')}
              className="p-4 sm:p-5 bg-white rounded-xl border-2 border-sky-200 hover:border-[#3380CC] cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between group min-w-0"
            >
              <div className="space-y-3">
                {/* Linha 1: Badge + Limite */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#3380CC] text-white text-xs font-bold px-2.5 py-0.5 tracking-wide">
                      Curva B
                    </Badge>
                    <span className="text-xs font-semibold text-slate-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                      {formatPercentagePTBR(limiteA, 0)} a {formatPercentagePTBR(limiteB, 0)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {resumoB.quantidade_itens} materiais
                  </span>
                </div>

                {/* Linha 2 e 3: Percentual e Faturamento integral */}
                <div className="pt-1">
                  <div className="text-xs text-slate-500 font-medium">Concentração de Receita</div>
                  <div className="text-base sm:text-lg font-bold font-sans text-[#3380CC] mt-0.5">
                    {formatPercentagePTBR(resumoB.percentual_faturamento, 2)} do faturamento
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-[26px] font-bold font-sans text-slate-950 mt-1 whitespace-nowrap tracking-tight">
                    {formatCurrencyPTBR(resumoB.faturamento_brl)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3380CC]" />
                    <span>
                      Volume físico:{' '}
                      <strong className="text-slate-800">
                        {formatNumberPTBR(resumoB.toneladas, 2)} t
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#3380CC] group-hover:text-[#004C97]">
                <span>Ver materiais Curva B &rarr;</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Card Curva C (Cinza-Azulado) */}
            <div
              onClick={() => abrirDrilldownCurva('C')}
              className="p-4 sm:p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-slate-400 cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between group min-w-0"
            >
              <div className="space-y-3">
                {/* Linha 1: Badge + Limite */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-600 text-white text-xs font-bold px-2.5 py-0.5 tracking-wide">
                      Curva C
                    </Badge>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      Acima de {formatPercentagePTBR(limiteB, 0)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    {resumoC.quantidade_itens} materiais
                  </span>
                </div>

                {/* Linha 2 e 3: Percentual e Faturamento integral */}
                <div className="pt-1">
                  <div className="text-xs text-slate-500 font-medium">Concentração de Receita</div>
                  <div className="text-base sm:text-lg font-bold font-sans text-slate-700 mt-0.5">
                    {formatPercentagePTBR(resumoC.percentual_faturamento, 2)} do faturamento
                  </div>
                  <div className="text-xl sm:text-2xl lg:text-[26px] font-bold font-sans text-slate-950 mt-1 whitespace-nowrap tracking-tight">
                    {formatCurrencyPTBR(resumoC.faturamento_brl)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>
                      Volume físico:{' '}
                      <strong className="text-slate-800">
                        {formatNumberPTBR(resumoC.toneladas, 2)} t
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900">
                <span>Ver materiais Curva C &rarr;</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>

          {/* DIAGRAMA DE PARETO: BARRAS EM AZUL INSTITUCIONAL, LINHA ACUMULADA, REF 85%/95% */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#004C97]" />
                  Diagrama de Pareto &bull; Top 25 Materiais por Faturamento
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Barras representam o Faturamento individual (R$ - Eixo Esquerdo) e a linha
                  representa o Percentual Acumulado (% - Eixo Direito)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-[#004C97] inline-block" /> Curva A (até
                  85%)
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-[#3380CC] inline-block" /> Curva B (85-95%)
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-slate-400 inline-block" /> Curva C
                  (&gt;95%)
                </span>
              </div>
            </div>

            {dadosPareto.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-slate-400 text-sm">
                Nenhum material encontrado para gerar o diagrama de Pareto.
              </div>
            ) : (
              <div className="w-full min-h-[440px] h-[480px] lg:h-[520px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dadosPareto}
                    margin={{ top: 20, right: 30, left: 20, bottom: 65 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="material"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fontSize: 11, fill: '#334155', fontFamily: 'monospace' }}
                      interval={0}
                    />
                    {/* Eixo Esquerdo: Faturamento R$ */}
                    <YAxis
                      yAxisId="left"
                      orientation="left"
                      stroke="#004C97"
                      tick={{ fontSize: 11, fill: '#004C97' }}
                      tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                    />
                    {/* Eixo Direito: Percentual Acumulado % */}
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 100]}
                      stroke="#475569"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload
                          return (
                            <div className="p-3 bg-white border border-slate-200 shadow-xl rounded-xl text-xs space-y-1.5 max-w-xs z-50">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                                <span className="font-mono font-bold text-slate-900">
                                  {d.material}
                                </span>
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    d.curva === 'A'
                                      ? 'bg-[#004C97] text-white'
                                      : d.curva === 'B'
                                        ? 'bg-[#3380CC] text-white'
                                        : 'bg-slate-500 text-white'
                                  }`}
                                >
                                  Curva {d.curva}
                                </Badge>
                              </div>
                              <p className="text-slate-600 font-medium text-[11px] truncate">
                                {d.descricao}
                              </p>
                              <div className="space-y-0.5 pt-1 text-slate-700">
                                <div className="flex justify-between">
                                  <span>Faturamento:</span>
                                  <strong className="font-sans text-[#004C97]">
                                    {formatCurrencyPTBR(d.faturamento)}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Acumulado:</span>
                                  <strong className="font-sans text-slate-900">
                                    {formatPercentagePTBR(d.percentualAcumulado, 2)}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span>Carteira:</span>
                                  <span className="font-sans">
                                    {formatNumberPTBR(d.toneladas, 2)} t
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Déficit:</span>
                                  <span
                                    className={
                                      d.deficit > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700'
                                    }
                                  >
                                    {formatNumberPTBR(d.deficit, 2)} t
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                    <ReferenceLine
                      yAxisId="right"
                      y={limiteA}
                      stroke="#004C97"
                      strokeDasharray="4 4"
                      label={{
                        value: `Limite A (${limiteA}%)`,
                        position: 'insideTopLeft',
                        fill: '#004C97',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />
                    <ReferenceLine
                      yAxisId="right"
                      y={limiteB}
                      stroke="#3380CC"
                      strokeDasharray="4 4"
                      label={{
                        value: `Limite B (${limiteB}%)`,
                        position: 'insideTopLeft',
                        fill: '#3380CC',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="faturamento"
                      name="Faturamento (R$)"
                      fill="#004C97"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="percentualAcumulado"
                      name="% Acumulado"
                      stroke="#EA580C"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#EA580C' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ANÁLISE IA DA CURVA ABC: CONCENTRAÇÃO & RISCOS COMERCIAIS (LARGURA TOTAL, LEITURA EXECUTIVA) */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#004C97] text-white rounded-lg">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Análise IA da Curva ABC &bull; Concentração & Riscos Comerciais
                  </h4>
                  <p className="text-xs text-slate-500">
                    Interpretação consultiva determinística para apoio à tomada de decisão do
                    programador PCP
                  </p>
                </div>
              </div>
              <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
                Motor Consultivo IA
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* 1. Diagnóstico */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  1. Diagnóstico
                </span>
                <p className="text-xs text-slate-800 leading-relaxed mt-1 font-medium">
                  {resumoA.quantidade_itens} materiais concentram{' '}
                  <strong className="text-[#004C97]">
                    {formatPercentagePTBR(resumoA.percentual_faturamento, 1)}
                  </strong>{' '}
                  da receita total da carteira ({formatCurrencyPTBR(resumoA.faturamento_brl)}).
                </p>
              </div>

              {/* 2. Riscos */}
              <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">
                  2. Riscos
                </span>
                <p className="text-xs text-rose-950 leading-relaxed mt-1 font-medium">
                  {alertasPrioritariosCurvaA.length > 0
                    ? `${alertasPrioritariosCurvaA.length} itens de alta relevância comercial possuem déficit físico sem cobertura imediata.`
                    : 'Carteira Curva A com cobertura física estável para o ciclo corrente.'}
                </p>
              </div>

              {/* 3. Materiais Críticos */}
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  3. Materiais Críticos
                </span>
                <p className="text-xs text-amber-950 leading-relaxed mt-1 font-medium">
                  Prioridade 1 em sequenciamento nas linhas de laminação L1/L2 para blindar
                  contratos comerciais.
                </p>
              </div>

              {/* 4. Ação Sugerida */}
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200">
                <span className="text-[10px] uppercase font-bold text-[#004C97] block">
                  4. Ação Sugerida
                </span>
                <p className="text-xs text-blue-950 leading-relaxed mt-1 font-medium">
                  Conferir no Drill-Down os materiais com déficit e alinhar antecipação com o
                  sequenciamento PCP.
                </p>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>
                * A IA permanece consultiva — nunca altera programação nem dados SAP
                automaticamente.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirDrilldownCurva('A')}
                className="h-6 text-[11px] font-bold text-[#004C97] border-blue-200 hover:bg-blue-50"
              >
                Abrir Drill-Down Completo &rarr;
              </Button>
            </div>
          </div>
        </div>
      </AnalyticalModal>

      {/* MODAL SECUNDÁRIO DE DRILL-DOWN EXECUTIVO */}
      {curvaFiltroDrilldown && (
        <PortfolioDrilldown
          isOpen={isDrilldownOpen}
          onClose={() => {
            setIsDrilldownOpen(false)
            setCurvaFiltroDrilldown(null)
          }}
          curvaInicial={curvaFiltroDrilldown}
          itens={itens}
          onSelectMaterial={onSelectMaterial}
        />
      )}
    </>
  )
}

export default PortfolioABC
