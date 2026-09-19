import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Bot, AlertTriangle, ArrowRight, TrendingUp, Sliders } from 'lucide-react'
import {
  CurvaAbcResultadoConsolidado,
  ItemCurvaAbcCalculado,
} from '@/services/curva-abc-faturamento-engine'
import { formatNumberPTBR, formatCurrencyPTBR, formatPercentagePTBR } from '@/lib/formatters-ptbr'

export interface PortfolioABCProps {
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
  const [faixaFiltro, setFaixaFiltro] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const {
    resumoA,
    resumoB,
    resumoC,
    faturamentoTotal_brl,
    tonelagemTotal_t,
    itens,
    parametrosAplicados,
  } = resultadoABC

  // Top 30 materiais para exibição legível no gráfico de Pareto
  const dadosPareto = useMemo(() => {
    return itens.slice(0, 30).map((i) => ({
      codigo: i.codigo_material,
      descricao: i.descricao_material,
      faturamento: Number((i.faturamento_brl / 1000).toFixed(1)), // em milhares R$
      faturamentoReal: i.faturamento_brl,
      acumuladoPct: Number(i.participacao_acumulada_pct.toFixed(2)),
      individualPct: Number(i.participacao_individual_pct.toFixed(2)),
      curva: i.curva_abc,
      itemOriginal: i,
    }))
  }, [itens])

  // Itens filtrados para a tabela rápida
  const itensFiltrados = useMemo(() => {
    if (faixaFiltro === 'TODAS') return itens
    return itens.filter((i) => i.curva_abc === faixaFiltro)
  }, [itens, faixaFiltro])

  // Materiais A críticos
  const materiaisACriticos = useMemo(() => {
    return itens.filter((i) => i.curva_abc === 'A' && (i.deficit_tons > 0 || i.risco === 'CRITICO'))
  }, [itens])

  // Materiais C com estoque excessivo
  const materiaisCExcesso = useMemo(() => {
    return itens.filter(
      (i) => i.curva_abc === 'C' && i.saldo_projetado_tons > 20 && i.carteira_tons < 5,
    )
  }, [itens])

  // Texto da Seção "Análise IA da Curva ABC"
  const textoAnaliseIA = useMemo(() => {
    const totalItensA = resumoA.quantidade_itens
    const pctFatA = formatPercentagePTBR(resumoA.percentual_faturamento, 2)
    const fatTotalFmt = formatCurrencyPTBR(faturamentoTotal_brl)
    const critA = materiaisACriticos.length

    let alertaCurvaA = ''
    if (critA > 0) {
      alertaCurvaA = ` Existem ${critA} materiais na Curva A apresentando déficit físico ou risco crítico de ruptura comercial — prioridade máxima para validação no sequenciamento semanal.`
    } else {
      alertaCurvaA =
        ' Todos os materiais da Curva A encontram-se cobertos pelo estoque ou pela programação vigente.'
    }

    let excessoC = ''
    if (materiaisCExcesso.length > 0) {
      excessoC = ` Foram identificados ${materiaisCExcesso.length} materiais da Curva C com estoque residual elevado e baixa demanda comercial associada.`
    }

    return `A Curva ABC calculada por FATURAMENTO (R$) consolida ${itens.length} materiais com faturamento total de ${fatTotalFmt}. A faixa A concentra ${pctFatA} do faturamento em apenas ${totalItensA} itens, com limite dinâmico de corte em ${parametrosAplicados.corteA_pct}%.${alertaCurvaA}${excessoC} (Diagnóstico consultivo — IA não altera programação nem modifica SAP).`
  }, [
    resumoA,
    faturamentoTotal_brl,
    itens.length,
    parametrosAplicados,
    materiaisACriticos,
    materiaisCExcesso,
  ])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                  Curva ABC Oficial
                </Badge>
                <DialogTitle className="text-base sm:text-lg font-bold text-white">
                  Curva ABC por Faturamento (R$) &bull; Diagrama de Pareto
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-300">
                Ordenação decrescente por Faturamento Comercial (nunca por tonelagem), com limites
                parametrizáveis ({parametrosAplicados.corteA_pct}% A /{' '}
                {parametrosAplicados.corteB_pct}% B).
              </DialogDescription>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-400">Faturamento Analisado</span>
              <div className="text-base font-bold text-cyan-300 font-mono">
                {formatCurrencyPTBR(faturamentoTotal_brl)}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 3 Cards Executivos de Resumo A / B / C */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 border-b border-slate-200 text-xs">
          {/* Curva A */}
          <div
            onClick={() => {
              setFaixaFiltro('A')
              if (onDrilldownFaixa)
                onDrilldownFaixa(
                  'A',
                  itens.filter((i) => i.curva_abc === 'A'),
                )
            }}
            className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 cursor-pointer hover:border-purple-500 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <Badge className="bg-purple-600 text-white text-[10px] font-bold">Curva A</Badge>
              <span className="text-[11px] font-mono font-bold text-purple-900">
                Até {parametrosAplicados.corteA_pct}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-purple-950 mt-1">
              {resumoA.quantidade_itens}{' '}
              <span className="text-xs font-normal text-slate-600">materiais</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600 font-mono">
              <span>{formatPercentagePTBR(resumoA.percentual_faturamento, 2)} do faturamento</span>
              <span className="font-bold text-purple-900">
                {formatCurrencyPTBR(resumoA.faturamento_brl)}
              </span>
            </div>
            <span className="text-[10px] text-purple-700 font-semibold mt-1.5 inline-flex items-center gap-1">
              Filtrar materiais A <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          {/* Curva B */}
          <div
            onClick={() => {
              setFaixaFiltro('B')
              if (onDrilldownFaixa)
                onDrilldownFaixa(
                  'B',
                  itens.filter((i) => i.curva_abc === 'B'),
                )
            }}
            className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 cursor-pointer hover:border-blue-500 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <Badge className="bg-blue-600 text-white text-[10px] font-bold">Curva B</Badge>
              <span className="text-[11px] font-mono font-bold text-blue-900">
                {parametrosAplicados.corteA_pct}% a {parametrosAplicados.corteB_pct}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-blue-950 mt-1">
              {resumoB.quantidade_itens}{' '}
              <span className="text-xs font-normal text-slate-600">materiais</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600 font-mono">
              <span>{formatPercentagePTBR(resumoB.percentual_faturamento, 2)} do faturamento</span>
              <span className="font-bold text-blue-900">
                {formatCurrencyPTBR(resumoB.faturamento_brl)}
              </span>
            </div>
            <span className="text-[10px] text-blue-700 font-semibold mt-1.5 inline-flex items-center gap-1">
              Filtrar materiais B <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          {/* Curva C */}
          <div
            onClick={() => {
              setFaixaFiltro('C')
              if (onDrilldownFaixa)
                onDrilldownFaixa(
                  'C',
                  itens.filter((i) => i.curva_abc === 'C'),
                )
            }}
            className="p-3 bg-slate-100 rounded-xl border border-slate-300 cursor-pointer hover:border-slate-500 transition-colors shadow-2xs"
          >
            <div className="flex items-center justify-between mb-1">
              <Badge className="bg-slate-700 text-white text-[10px] font-bold">Curva C</Badge>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                Acima de {parametrosAplicados.corteB_pct}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 mt-1">
              {resumoC.quantidade_itens}{' '}
              <span className="text-xs font-normal text-slate-600">materiais</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600 font-mono">
              <span>{formatPercentagePTBR(resumoC.percentual_faturamento, 2)} do faturamento</span>
              <span className="font-bold text-slate-900">
                {formatCurrencyPTBR(resumoC.faturamento_brl)}
              </span>
            </div>
            <span className="text-[10px] text-slate-700 font-semibold mt-1.5 inline-flex items-center gap-1">
              Filtrar materiais C <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Análise IA da Curva ABC */}
        <div className="p-3 bg-gradient-to-r from-purple-50/80 via-blue-50/50 to-white border-b border-slate-200 text-xs">
          <div className="flex items-start gap-2">
            <div className="p-1.5 bg-purple-700 text-white rounded-md mt-0.5 shrink-0 shadow-2xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-slate-900 text-xs block mb-0.5">
                Análise IA da Curva ABC &bull; Concentração & Riscos Comerciais
              </span>
              <p className="text-[11px] text-slate-700 leading-relaxed font-sans">
                {textoAnaliseIA}
              </p>
            </div>
          </div>
        </div>

        {/* Gráfico de Pareto */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-800">
              Diagrama de Pareto &bull; Barras: Faturamento (milhares R$) &bull; Linha: % Acumulado
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-purple-700">
                <span className="w-2.5 h-2.5 bg-purple-600 rounded-xs" /> Curva A (&le;
                {parametrosAplicados.corteA_pct}%)
              </span>
              <span className="flex items-center gap-1 text-blue-700">
                <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs" /> Curva B (&le;
                {parametrosAplicados.corteB_pct}%)
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2.5 h-2.5 bg-slate-500 rounded-xs" /> Curva C
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dadosPareto}
                margin={{ top: 10, right: 30, left: 10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="codigo"
                  angle={-35}
                  textAnchor="end"
                  height={50}
                  tick={{ fontSize: 9, fill: '#475569' }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${v}k`}
                  tick={{ fontSize: 10, fill: '#475569' }}
                  label={{
                    value: 'Faturamento (milhares R$)',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 10,
                    fill: '#64748B',
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: '#DC2626' }}
                  label={{
                    value: '% Acumulado',
                    angle: 90,
                    position: 'insideRight',
                    fontSize: 10,
                    fill: '#DC2626',
                  }}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    name === 'faturamento'
                      ? formatCurrencyPTBR(Number(val) * 1000)
                      : `${formatNumberPTBR(val, 2)} %`,
                    name === 'faturamento' ? 'Faturamento' : '% Acumulado',
                  ]}
                  labelFormatter={(l) => `Material: ${l}`}
                />
                {/* Linhas de corte 85% e 95% */}
                <ReferenceLine
                  yAxisId="right"
                  y={parametrosAplicados.corteA_pct}
                  stroke="#9333EA"
                  strokeDasharray="4 4"
                  label={{
                    value: `Corte A (${parametrosAplicados.corteA_pct}%)`,
                    position: 'right',
                    fill: '#9333EA',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  yAxisId="right"
                  y={parametrosAplicados.corteB_pct}
                  stroke="#2563EB"
                  strokeDasharray="4 4"
                  label={{
                    value: `Corte B (${parametrosAplicados.corteB_pct}%)`,
                    position: 'right',
                    fill: '#2563EB',
                    fontSize: 10,
                  }}
                />

                <Bar
                  yAxisId="left"
                  dataKey="faturamento"
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: any) =>
                    entry.itemOriginal && onSelectMaterial && onSelectMaterial(entry.itemOriginal)
                  }
                >
                  {dadosPareto.map((entry, index) => (
                    <Cell
                      key={`cell-abc-${index}`}
                      fill={
                        entry.curva === 'A'
                          ? '#9333EA'
                          : entry.curva === 'B'
                            ? '#2563EB'
                            : '#94A3B8'
                      }
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="acumuladoPct"
                  stroke="#DC2626"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#DC2626' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabela dos Materiais Filtrados */}
        <div className="flex-1 overflow-auto p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800">Materiais da Faixa Selecionada</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                {(['TODAS', 'A', 'B', 'C'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFaixaFiltro(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      faixaFiltro === f
                        ? 'bg-[#004C97] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f === 'TODAS' ? 'Todos' : `Curva ${f}`}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {itensFiltrados.length} materiais exibidos
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px] sticky top-0">
              <tr>
                <th className="p-2">Material</th>
                <th className="p-2">Descrição</th>
                <th className="p-2 text-center">Linha</th>
                <th className="p-2 text-center">ABC</th>
                <th className="p-2 text-right">Carteira (t)</th>
                <th className="p-2 text-right">Déficit (t)</th>
                <th className="p-2 text-right">Faturamento (R$)</th>
                <th className="p-2 text-right">% Indiv.</th>
                <th className="p-2 text-right">% Acum.</th>
                <th className="p-2 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltrados.slice(0, 50).map((it, idx) => (
                <tr
                  key={it.codigo_material + idx}
                  onClick={() => onSelectMaterial && onSelectMaterial(it)}
                  className="hover:bg-blue-50/60 cursor-pointer text-[11px]"
                >
                  <td className="p-2 font-mono font-bold text-slate-900">{it.codigo_material}</td>
                  <td
                    className="p-2 text-slate-700 truncate max-w-[200px]"
                    title={it.descricao_material}
                  >
                    {it.descricao_material}
                  </td>
                  <td className="p-2 text-center">{it.linha}</td>
                  <td className="p-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        it.curva_abc === 'A'
                          ? 'bg-purple-100 text-purple-900'
                          : it.curva_abc === 'B'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {it.curva_abc}
                    </span>
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-blue-950">
                    {formatNumberPTBR(it.carteira_tons, 2)}
                  </td>
                  <td className="p-2 text-right font-mono font-bold text-rose-700">
                    {it.deficit_tons > 0 ? formatNumberPTBR(it.deficit_tons, 2) : '-'}
                  </td>
                  <td className="p-2 text-right font-mono text-slate-900">
                    {formatCurrencyPTBR(it.faturamento_brl)}
                  </td>
                  <td className="p-2 text-right font-mono text-slate-700">
                    {formatPercentagePTBR(it.participacao_individual_pct, 2)}
                  </td>
                  <td className="p-2 text-right font-mono text-slate-500">
                    {formatPercentagePTBR(it.participacao_acumulada_pct, 2)}
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onSelectMaterial) onSelectMaterial(it)
                      }}
                      className="h-6 px-1 text-[10px] text-[#004C97] hover:bg-blue-100"
                    >
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="text-[11px]">
            Cálculo baseado em preço médio por família SAP ECC. Parâmetros aplicados: A=
            {parametrosAplicados.corteA_pct}% / B={parametrosAplicados.corteB_pct}%.
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="h-7 text-xs border-slate-300"
          >
            Fechar Curva ABC
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default PortfolioABC
