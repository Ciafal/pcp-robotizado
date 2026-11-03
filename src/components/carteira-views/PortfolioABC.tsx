import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, AlertTriangle, Bot, ChevronRight, Download } from 'lucide-react'
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
import { formatTons3Decimals, formatPercentagePTBR } from '@/lib/formatters-ptbr'
import { PortfolioDrilldown } from './PortfolioDrilldown'
import { AnalyticalModal } from '@/components/common/AnalyticalModal'

interface PortfolioABCProps {
  isOpen: boolean
  onClose: () => void
  resultadoABC: CurvaAbcResultadoConsolidado
  onSelectMaterial?: (item: ItemCurvaAbcCalculado) => void
  onDrilldownFaixa?: (faixa: 'A' | 'B' | 'C', itens: ItemCurvaAbcCalculado[]) => void
}

/**
 * CustomTick para o eixo X do Pareto:
 * - Quebra controlada em até 2 linhas caso o código do material tenha hífens e seja longo.
 * - Centralizado e totalmente separado da área superior da legenda.
 * - Margem inferior generosa (90px) para acomodar até 2 linhas sem cortes.
 */
const CustomParetoTick = (props: any) => {
  const { x, y, payload } = props
  const rawText: string = payload?.value || ''

  // Quebra por hífen se for longo (> 12 chars), mantendo no máximo 2 linhas legíveis
  let line1 = rawText
  let line2 = ''

  if (rawText.length > 12 && rawText.includes('-')) {
    const parts = rawText.split('-')
    const mid = Math.ceil(parts.length / 2)
    line1 = parts.slice(0, mid).join('-') + '-'
    line2 = parts.slice(mid).join('-')
  }

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={14}
        textAnchor="middle"
        fill="#334155"
        fontSize={10}
        fontFamily="ui-monospace, monospace"
      >
        <tspan x={0} dy="10">
          {line1}
        </tspan>
        {line2 && (
          <tspan x={0} dy="12">
            {line2}
          </tspan>
        )}
      </text>
    </g>
  )
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
    tonelagemTotal_t,
    alertasPrioritariosCurvaA,
    parametrosAplicados,
  } = resultadoABC

  const limiteA = parametrosAplicados.corteA_pct ?? 85
  const limiteB = parametrosAplicados.corteB_pct ?? 95

  // Cálculo do Déficit Total analisado
  const deficitTotal_t = useMemo(() => {
    return itens.reduce((acc, it) => acc + (it.deficit_tons || 0), 0)
  }, [itens])

  // Prepara dados do Pareto (Top 25 materiais por volume para visualização nítida)
  const dadosPareto = useMemo(() => {
    return itens.slice(0, 25).map((it) => ({
      material: it.codigo_material,
      descricao: it.descricao_material,
      volume: it.carteira_tons,
      percentualAcumulado: it.participacao_acumulada_pct,
      carteira: it.carteira_tons,
      estoqueDisponivel: it.estoque_disponivel_tons,
      programado: it.programado_tons,
      deficit: it.deficit_tons,
      curva: it.curva_abc,
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

  // Exportar dados em CSV formatado (sem valores financeiros, com padrão de 3 decimais em toneladas)
  const exportarCSV = () => {
    const cabecalho =
      'Material;Descrição;Curva ABC;Volume Carteira (t);% do Total;% Acumulado;Estoque Disponível (t);Programado (t);Déficit (t);Risco\n'
    const linhas = itens
      .map(
        (i) =>
          `"${i.codigo_material}";"${i.descricao_material}";"${i.curva_abc}";${formatTons3Decimals(i.carteira_tons)};${formatPercentagePTBR(i.participacao_individual_pct, 2)};${formatPercentagePTBR(i.participacao_acumulada_pct, 2)};${formatTons3Decimals(i.estoque_disponivel_tons)};${formatTons3Decimals(i.programado_tons)};${formatTons3Decimals(i.deficit_tons)};"${i.risco}"`,
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + cabecalho + linhas], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `curva_abc_volume_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Cabeçalho do modal: Base Analisada, Volume Total Analisado, Déficit Total
  const kpisTopo = [
    {
      label: 'BASE ANALISADA',
      value: `${itens.length} materiais`,
    },
    {
      label: 'VOLUME TOTAL ANALISADO',
      value: formatTons3Decimals(tonelagemTotal_t),
    },
    {
      label: 'DÉFICIT TOTAL',
      value: formatTons3Decimals(deficitTotal_t),
    },
  ]

  // Percentuais de volume de cada curva
  const pctVolumeA = tonelagemTotal_t > 0 ? (resumoA.toneladas / tonelagemTotal_t) * 100 : 0
  const pctVolumeB = tonelagemTotal_t > 0 ? (resumoB.toneladas / tonelagemTotal_t) * 100 : 0
  const pctVolumeC = tonelagemTotal_t > 0 ? (resumoC.toneladas / tonelagemTotal_t) * 100 : 0

  return (
    <>
      <AnalyticalModal
        isOpen={isOpen}
        onClose={onClose}
        size="analytical"
        badge="CURVA ABC • VOLUME (t)"
        title="Curva ABC & Diagrama de Pareto — Volume"
        subtitle="Classificação dos materiais pela participação acumulada no volume da carteira, em toneladas, com identificação de déficits, estoque disponível e cobertura da programação PCP."
        headerKpis={kpisTopo}
        scrollMode="auto"
        footer={
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800">Fonte: SAP RFC ZSD28C</span>
              <span className="text-slate-300">•</span>
              <span>Última sincronização: 19/09/2026 12:40</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={exportarCSV}
                className="h-8 text-xs font-semibold border-blue-200 text-[#004C97] hover:bg-blue-50 gap-1.5 px-3 shadow-xs"
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
          {/* ALERTA CRÍTICO OPERACIONAL (Fundo vermelho claro, sem blocos escuros) */}
          {alertasPrioritariosCurvaA.length > 0 && (
            <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl shadow-xs">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-rose-100 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 text-rose-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-rose-900 tracking-wide">
                      ⚠ ALERTA CRÍTICO • Ruptura Operacional na Curva A
                    </span>
                    <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-bold">
                      {alertasPrioritariosCurvaA.length} itens em atenção
                    </Badge>
                  </div>
                  <div className="space-y-1 mt-1.5 text-xs text-slate-800 font-medium">
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

          {/* 3 CARDS CURVA A / B / C EM GRID RESPONSIVO (Baseados em Volume Físico) */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0 w-full"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}
          >
            {/* Card Curva A (Azul Institucional Forte) */}
            <div
              onClick={() => abrirDrilldownCurva('A')}
              className="p-5 bg-white rounded-xl border-2 border-blue-200 hover:border-[#004C97] cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between group min-w-0 w-full"
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

                {/* Linha 2 e 3: Participação no Volume e Tonelagem Total */}
                <div className="pt-1">
                  <div className="text-xs text-slate-500 font-medium">Participação no Volume</div>
                  <div className="text-base sm:text-lg font-bold font-sans text-[#004C97] mt-0.5">
                    {formatPercentagePTBR(pctVolumeA, 2)} do volume total
                  </div>
                  <div
                    className="font-bold font-sans text-slate-950 mt-1 whitespace-nowrap tracking-tight"
                    style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}
                  >
                    {formatTons3Decimals(resumoA.toneladas)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#004C97]" />
                    <span>Volume concentrado na faixa de maior impacto</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#004C97] group-hover:text-[#003870]">
                <span>Ver materiais &rarr;</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Card Curva B (Azul Médio) */}
            <div
              onClick={() => abrirDrilldownCurva('B')}
              className="p-5 bg-white rounded-xl border-2 border-sky-200 hover:border-[#3380CC] cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between group min-w-0 w-full"
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

                {/* Linha 2 e 3: Participação no Volume e Tonelagem Total */}
                <div className="pt-1">
                  <div className="text-xs text-slate-500 font-medium">Participação no Volume</div>
                  <div className="text-base sm:text-lg font-bold font-sans text-[#3380CC] mt-0.5">
                    {formatPercentagePTBR(pctVolumeB, 2)} do volume total
                  </div>
                  <div
                    className="font-bold font-sans text-slate-950 mt-1 whitespace-nowrap tracking-tight"
                    style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}
                  >
                    {formatTons3Decimals(resumoB.toneladas)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3380CC]" />
                    <span>Volume intermediário da carteira</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#3380CC] group-hover:text-[#004C97]">
                <span>Ver materiais &rarr;</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Card Curva C (Cinza-Azulado) */}
            <div
              onClick={() => abrirDrilldownCurva('C')}
              className="p-5 bg-white rounded-xl border-2 border-slate-200 hover:border-slate-400 cursor-pointer transition-all shadow-xs hover:shadow-md flex flex-col justify-between group min-w-0 w-full"
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

                {/* Linha 2 e 3: Participação no Volume e Tonelagem Total */}
                <div className="pt-1">
                  <div className="text-xs text-slate-500 font-medium">Participação no Volume</div>
                  <div className="text-base sm:text-lg font-bold font-sans text-slate-700 mt-0.5">
                    {formatPercentagePTBR(pctVolumeC, 2)} do volume total
                  </div>
                  <div
                    className="font-bold font-sans text-slate-950 mt-1 whitespace-nowrap tracking-tight"
                    style={{ fontSize: 'clamp(20px, 2vw, 28px)' }}
                  >
                    {formatTons3Decimals(resumoC.toneladas)}
                  </div>
                  <div className="text-xs font-medium text-slate-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>Materiais de menor volume individual</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-slate-900">
                <span>Ver materiais &rarr;</span>
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>

          {/* DIAGRAMA DE PARETO: BARRAS = VOLUME (t), LINHA = % ACUMULADO, LEGENDA SUPERIOR, SEM SOBREPOSIÇÃO */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#004C97]" />
                  Diagrama de Pareto &bull; Top 25 Materiais por Volume
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Barras representam o Volume do material (t - Eixo Esquerdo) e a linha representa o
                  Percentual Acumulado (% - Eixo Direito)
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-[#004C97] inline-block" /> Curva A (até
                  85%)
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-xs bg-[#3380CC] inline-block" /> Curva B (85–95%)
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
              /* Container responsivo com rolagem horizontal interna se a tela for muito estreita */
              <div className="w-full overflow-x-auto overflow-y-hidden">
                <div className="min-w-[620px] w-full min-h-[460px] h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={dadosPareto}
                      margin={{ top: 15, right: 30, left: 10, bottom: 90 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      {/* LEGENDA NO TOPO DO GRÁFICO, TOTALMENTE SEPARADA DO EIXO X */}
                      <Legend
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ paddingBottom: 16, fontSize: 12, fontWeight: 600 }}
                      />
                      {/* Eixo X com tick customizado com quebra e margem generosa */}
                      <XAxis
                        dataKey="material"
                        interval={0}
                        tick={<CustomParetoTick />}
                        stroke="#94A3B8"
                      />
                      {/* Eixo Esquerdo: Volume (t) */}
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#004C97"
                        tick={{ fontSize: 11, fill: '#004C97' }}
                        tickFormatter={(val) => `${val.toLocaleString('pt-BR')} t`}
                        label={{
                          value: 'Volume (t)',
                          angle: -90,
                          position: 'insideLeft',
                          fill: '#004C97',
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}
                      />
                      {/* Eixo Direito: Percentual Acumulado % de 0 a 100 */}
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        stroke="#0284c7"
                        tick={{ fontSize: 11, fill: '#0284c7' }}
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
                                    <span>Volume:</span>
                                    <strong className="font-sans text-[#004C97]">
                                      {formatTons3Decimals(d.volume)}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>% Acumulado:</span>
                                    <strong className="font-sans text-slate-900">
                                      {formatPercentagePTBR(d.percentualAcumulado, 2)}
                                    </strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Carteira:</span>
                                    <span className="font-sans">
                                      {formatTons3Decimals(d.carteira)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Estoque disponível:</span>
                                    <span className="font-sans text-emerald-700 font-semibold">
                                      {formatTons3Decimals(d.estoqueDisponivel)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Programado:</span>
                                    <span className="font-sans text-indigo-700 font-semibold">
                                      {formatTons3Decimals(d.programado)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Déficit:</span>
                                    <span
                                      className={
                                        d.deficit > 0
                                          ? 'text-rose-600 font-bold'
                                          : 'text-emerald-700'
                                      }
                                    >
                                      {formatTons3Decimals(d.deficit)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
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
                        dataKey="volume"
                        name="Volume (t)"
                        fill="#004C97"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="percentualAcumulado"
                        name="% Acumulado"
                        stroke="#0284c7"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#0284c7', stroke: '#fff', strokeWidth: 1.5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* ANÁLISE IA DA CURVA ABC: CONCENTRAÇÃO & RISCOS OPERACIONAIS */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#004C97] text-white rounded-lg">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Análise IA da Curva ABC &bull; Concentração de Volume &amp; Riscos Operacionais
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
                  <strong className="text-[#004C97]">{formatPercentagePTBR(pctVolumeA, 1)}</strong>{' '}
                  do volume físico total da carteira ({formatTons3Decimals(resumoA.toneladas)}).
                </p>
              </div>

              {/* 2. Riscos */}
              <div className="p-3 bg-rose-50/70 rounded-lg border border-rose-200">
                <span className="text-[10px] uppercase font-bold text-rose-700 block">
                  2. Riscos
                </span>
                <p className="text-xs text-rose-950 leading-relaxed mt-1 font-medium">
                  {alertasPrioritariosCurvaA.length > 0
                    ? `${alertasPrioritariosCurvaA.length} itens de alta relevância volumétrica possuem déficit físico sem cobertura imediata.`
                    : 'Carteira Curva A com cobertura física estável para o ciclo corrente.'}
                </p>
              </div>

              {/* 3. Materiais Críticos */}
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  3. Materiais Críticos
                </span>
                <p className="text-xs text-amber-950 leading-relaxed mt-1 font-medium">
                  Prioridade 1 em sequenciamento nas linhas de produção para garantir atendimento
                  dos maiores volumes da carteira.
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
