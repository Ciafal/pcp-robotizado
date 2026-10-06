import React, { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
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
import { IndicadorMatrizLinha, formatarValorPtBr } from '@/services/pcp-indicadores-service'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'

interface GraficoIndividualModalProps {
  isOpen: boolean
  onClose: () => void
  linha: IndicadorMatrizLinha
  anoExercicio: number
}

export const GraficoIndividualModal: React.FC<GraficoIndividualModalProps> = ({
  isOpen,
  onClose,
  linha,
  anoExercicio,
}) => {
  const ind = linha.indicador
  const anoM1 = anoExercicio - 1
  const anoM2 = anoExercicio - 2

  // Montar dataset combinado com histórico de 2 anos + 12 meses do ano vigente
  const chartData = useMemo(() => {
    const data: Array<{
      periodo: string
      tipo: 'HISTORICO' | 'MENSAL'
      realizado: number | null
      projecao: number | null
      meta: number
      isFuturo: boolean
      status: string
      mesNomeLongo: string
      desvioAbs: number | null
      desvioPct: number | null
    }> = []

    // 1. Médias dos anos anteriores
    data.push({
      periodo: `Média ${anoM2}`,
      tipo: 'HISTORICO',
      realizado: linha.mediaHistoricaAnoMenos2,
      projecao: null,
      meta: ind.meta,
      isFuturo: false,
      status: linha.mediaHistoricaAnoMenos2 !== null ? 'Histórico Anual' : 'Sem dados',
      mesNomeLongo: `Exercício ${anoM2}`,
      desvioAbs:
        linha.mediaHistoricaAnoMenos2 !== null
          ? Number((linha.mediaHistoricaAnoMenos2 - ind.meta).toFixed(1))
          : null,
      desvioPct: null,
    })

    data.push({
      periodo: `Média ${anoM1}`,
      tipo: 'HISTORICO',
      realizado: linha.mediaHistoricaAnoMenos1,
      projecao: null,
      meta: ind.meta,
      isFuturo: false,
      status: linha.mediaHistoricaAnoMenos1 !== null ? 'Histórico Anual' : 'Sem dados',
      mesNomeLongo: `Exercício ${anoM1}`,
      desvioAbs:
        linha.mediaHistoricaAnoMenos1 !== null
          ? Number((linha.mediaHistoricaAnoMenos1 - ind.meta).toFixed(1))
          : null,
      desvioPct: null,
    })

    // 2. Todos os 12 meses do ano vigente
    // Meses futuros NUNCA aparecem como zero ou realizados
    let ultimoMesComDadosIndex = -1
    linha.meses.forEach((m, idx) => {
      if (m.temDados && m.realizado !== null) {
        ultimoMesComDadosIndex = idx
      }
    })

    linha.meses.forEach((m, idx) => {
      const isFuturo = !m.temDados || m.realizado === null
      let projValor: number | null = null

      // Projeção se estende a partir do último mês realizado até dezembro
      if (
        linha.projecaoDezembro !== null &&
        ultimoMesComDadosIndex >= 0 &&
        idx >= ultimoMesComDadosIndex
      ) {
        if (idx === ultimoMesComDadosIndex && m.realizado !== null) {
          projValor = m.realizado // Ponto de partida contínuo
        } else {
          // Interpolação linear do último realizado até o valor projetado em Dezembro
          const passosRestantes = 11 - ultimoMesComDadosIndex
          const passoAtual = idx - ultimoMesComDadosIndex
          const valInicial = linha.meses[ultimoMesComDadosIndex].realizado || 0
          if (passosRestantes > 0) {
            projValor = Number(
              (
                valInicial +
                ((linha.projecaoDezembro - valInicial) / passosRestantes) * passoAtual
              ).toFixed(1),
            )
          } else {
            projValor = linha.projecaoDezembro
          }
        }
      }

      data.push({
        periodo: m.mesNomeCurto,
        tipo: 'MENSAL',
        realizado: m.temDados ? m.realizado : null,
        projecao: projValor,
        meta: ind.meta,
        isFuturo,
        status:
          m.status === 'ATINGIDA'
            ? 'Meta atingida'
            : m.status === 'FORA_DA_META'
              ? 'Fora da meta'
              : 'Sem dados / Futuro',
        mesNomeLongo: `${m.mesNomeLongo}/${anoExercicio}`,
        desvioAbs: m.desvioAbsoluto,
        desvioPct: m.desvioPercentual,
      })
    })

    return data
  }, [linha, ind, anoExercicio, anoM1, anoM2])

  // Cálculo dos limites do gráfico
  const { minDomain, maxDomain } = useMemo(() => {
    let min = ind.meta
    let max = ind.meta
    chartData.forEach((d) => {
      if (d.realizado !== null) {
        min = Math.min(min, d.realizado)
        max = Math.max(max, d.realizado)
      }
      if (d.projecao !== null) {
        min = Math.min(min, d.projecao)
        max = Math.max(max, d.projecao)
      }
    })
    const padding = (max - min) * 0.2 || 10
    return {
      minDomain: Math.max(0, Math.floor(min - padding)),
      maxDomain: Math.ceil(max + padding),
    }
  }, [chartData, ind.meta])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload
      const isProj = dataItem.isFuturo && dataItem.projecao !== null
      const valorExibido = isProj ? dataItem.projecao : dataItem.realizado

      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-lg shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[240px]">
          <div className="font-semibold text-sm border-b border-slate-700 pb-1 text-slate-200">
            {dataItem.mesNomeLongo}
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">{isProj ? 'Projetado:' : 'Realizado:'}</span>
            <span className="font-bold text-blue-300">
              {formatarValorPtBr(valorExibido, ind.unidade)}
              {isProj && ' (Projeção)'}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">Meta Vigente:</span>
            <span className="font-medium text-emerald-400">
              {formatarValorPtBr(ind.meta, ind.unidade)}
            </span>
          </div>
          {dataItem.desvioAbs !== null && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Desvio Absoluto:</span>
              <span
                className={`font-semibold ${
                  (dataItem.desvioAbs >= 0 && ind.sentido_indicador !== 'MENOR_MELHOR') ||
                  (dataItem.desvioAbs <= 0 && ind.sentido_indicador === 'MENOR_MELHOR')
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {dataItem.desvioAbs > 0 ? '+' : ''}
                {formatarValorPtBr(dataItem.desvioAbs, ind.unidade)}
              </span>
            </div>
          )}
          {dataItem.desvioPct !== null && (
            <div className="flex justify-between items-center py-0.5">
              <span className="text-slate-400">Desvio Percentual:</span>
              <span className="font-medium text-slate-300">
                {dataItem.desvioPct > 0 ? '+' : ''}
                {dataItem.desvioPct} %
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-slate-700">
            <span className="text-slate-400">Status:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                dataItem.status === 'Meta atingida'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : dataItem.status === 'Fora da meta'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {dataItem.status}
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] max-h-[92vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
                >
                  {ind.codigo}
                </Badge>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  Análise Gráfica — {ind.nome}
                </DialogTitle>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Exercício {anoExercicio} • Comparativo Histórico Anual ({anoM2} e {anoM1}) + 12
                Meses com Projeção até Dezembro
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-xs font-semibold">
                Sentido:{' '}
                {ind.sentido_indicador === 'MENOR_MELHOR'
                  ? 'Menor é melhor'
                  : ind.sentido_indicador === 'FAIXA_ACEITAVEL'
                    ? 'Faixa aceitável'
                    : 'Maior é melhor'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Regra: {ind.regra_comparacao} {formatarValorPtBr(ind.meta, ind.unidade)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Cards Compactos Executivos Superiores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 my-3 shrink-0">
          {/* 1. Meta Vigente */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Meta Vigente
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatarValorPtBr(ind.meta, ind.unidade)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Regra: {ind.regra_comparacao}</div>
          </div>

          {/* 2. Média Últimos 2 Anos */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Média 2 Anos
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatarValorPtBr(linha.mediaUltimos2Anos, ind.unidade)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {anoM2} e {anoM1}
            </div>
          </div>

          {/* 3. Média Ano Atual */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Média Ano Atual
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatarValorPtBr(linha.mediaOuAcumuladoAno, ind.unidade)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Apenas meses apurados</div>
          </div>

          {/* 4. Último Resultado */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              Último Resultado
            </div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatarValorPtBr(linha.ultimoResultado, ind.unidade)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Mês recente com dado</div>
          </div>

          {/* 5. Desvio Atual */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              Desvio Atual
            </div>
            <div
              className={`text-base font-bold mt-1 ${
                linha.desvioAtual === null
                  ? 'text-slate-400'
                  : (linha.desvioAtual >= 0 && ind.sentido_indicador !== 'MENOR_MELHOR') ||
                      (linha.desvioAtual <= 0 && ind.sentido_indicador === 'MENOR_MELHOR')
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {linha.desvioAtual !== null && linha.desvioAtual > 0 ? '+' : ''}
              {formatarValorPtBr(linha.desvioAtual, ind.unidade)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Frente à meta</div>
          </div>

          {/* 6. Projeção Dezembro */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              Projeção Dezembro
            </div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">
              {linha.projecaoFechamentoFormatada}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Fechamento projetado</div>
          </div>

          {/* 7. Tendência */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              Tendência
            </div>
            <div className="flex items-center gap-1 text-xs font-bold mt-1.5">
              {linha.tendencia === 'MELHORANDO' ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" /> ↑ Melhorando
                </span>
              ) : linha.tendencia === 'PIORANDO' ? (
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <TrendingDown className="w-4 h-4" /> ↓ Piorando
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Minus className="w-4 h-4" /> → Estável
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Sentido operacional</div>
          </div>

          {/* 8. Status Consolidado */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">
              Status Consolidado
            </div>
            <div className="mt-1">
              {linha.statusConsolidadoAno === 'ATINGIDA' ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Na Meta
                </Badge>
              ) : linha.statusConsolidadoAno === 'FORA_DA_META' ? (
                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[11px] gap-1 font-semibold">
                  <XCircle className="w-3 h-3" /> Fora Meta
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] gap-1">
                  <HelpCircle className="w-3 h-3" /> Sem Dados
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {linha.totalMesesAtingidos} na meta / {linha.totalMesesFora} fora
            </div>
          </div>
        </div>

        {/* Alerta de projeção preliminar se poucos dados históricos */}
        {linha.isProjecaoPreliminar && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/60 text-xs shrink-0 mb-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Atenção:</strong> Projeção preliminar — baixa quantidade de dados históricos
              apurados no exercício vigente. A projeção não altera dados reais e será refinada a
              cada novo fechamento mensal.
            </span>
          </div>
        )}

        {/* Gráfico Combinado Responsivo */}
        <div className="flex-1 min-h-[300px] w-full bg-slate-50/50 dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.25} />
              <XAxis dataKey="periodo" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis
                domain={[minDomain, maxDomain]}
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mr-3">
                    {value}
                  </span>
                )}
              />

              {/* Linha horizontal de Meta cadastrada */}
              <ReferenceLine
                y={ind.meta}
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `Meta: ${formatarValorPtBr(ind.meta, ind.unidade)}`,
                  fill: '#10b981',
                  fontSize: 12,
                  position: 'top',
                }}
              />

              {/* Barra de Realizado dos meses com dados e históricos */}
              <Bar
                dataKey="realizado"
                name="Realizado"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={45}
              />

              {/* Linha Tracejada de Projeção até Dezembro */}
              <Line
                type="monotone"
                dataKey="projecao"
                name="Tendência / Projeção"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="6 6"
                dot={{ r: 4, fill: '#f59e0b' }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default GraficoIndividualModal
