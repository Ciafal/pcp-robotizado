import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, SlidersHorizontal, BarChart3, Sparkles } from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { formatNumberPTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { CarteiraAnaliseEngine } from '@/services/carteira-analise-engine-unified'
import { CurvaAbcFaturamentoEngine } from '@/services/curva-abc-faturamento-engine'
import { AlertasIACarteiraCard } from './AlertasIACarteiraCard'
import { PortfolioCharts } from './PortfolioCharts'
import { PortfolioABC } from './PortfolioABC'

interface CarteiraL2ViewProps {
  itens: CarteiraItem[]
  entradasFuturas?: any[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
}

export const CarteiraL2View: React.FC<CarteiraL2ViewProps> = ({
  itens,
  entradasFuturas = [],
  onOpenMemoria,
  onOpenDetalheMaterial,
}) => {
  const [filtroFamilia, setFiltroFamilia] = useState<string>('TODAS')
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)

  const itensL2 = useMemo(() => {
    return itens.filter(
      (i) =>
        i.linha === 'L2' ||
        ['R', 'Q', 'B', 'S'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
    )
  }, [itens])

  const resultadoABCL2 = useMemo(() => {
    return CurvaAbcFaturamentoEngine.calcularCurvaAbc(itensL2)
  }, [itensL2])

  const mapaAbcL2 = useMemo(() => {
    const m = new Map<string, string>()
    resultadoABCL2.itens.forEach((i) => m.set(i.codigo_material, i.curva_abc))
    return m
  }, [resultadoABCL2])

  const itensFiltrados = itensL2.filter((i) => {
    if (filtroFamilia !== 'TODAS' && i.familia !== filtroFamilia) return false
    if (filtroCurva !== 'TODAS') {
      const c = mapaAbcL2.get(i.codigo_material) || 'C'
      if (c !== filtroCurva) return false
    }
    return true
  })

  // Análise automática Alertas & IA da Carteira L2
  const analiseL2 = React.useMemo(() => {
    return CarteiraAnaliseEngine.analisarCarteiraGenerica('L2', itens, entradasFuturas)
  }, [itens, entradasFuturas])

  return (
    <div className="space-y-4">
      {/* Alertas & IA • Análise Automática da Carteira L2 */}
      <AlertasIACarteiraCard
        nomeCarteira="Carteira L2"
        subtitulo="Diagnóstico preditivo em tempo real • Laminação de Perfis Pesados e Blocos • Linha L2"
        indicadores={analiseL2.indicadores}
        alertas={analiseL2.alertas}
        analisesIA={analiseL2.analisesIA}
        onFiltrarMaterial={(mat) => {
          const item = itensL2.find((i) => i.codigo_material === mat)
          if (item && onOpenDetalheMaterial) onOpenDetalheMaterial(item)
        }}
      />

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Painel Ciclo L2 &bull; Laminação de Perfis Pesados e Blocos
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
              Substitui Planilha Ciclo L2
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Particularidade L2: Separação estrita de Semiacabado CIAFAL, Semiacabado Vallourec e
            ZSD24.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Curva ABC */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            {(['TODAS', 'A', 'B', 'C'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFiltroCurva(c)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                  filtroCurva === c
                    ? 'bg-[#004C97] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c === 'TODAS' ? 'ABC: Todos' : `Curva ${c}`}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsChartsOpen(true)}
            className="h-7 text-xs font-bold border-blue-300 text-[#004C97] hover:bg-blue-50 gap-1"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#004C97]" /> Análise Gráfica
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAbcOpen(true)}
            className="h-7 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200" /> Curva ABC
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setMostrarColunasTemporais(!mostrarColunasTemporais)}
            className={`h-7 text-xs gap-1 border-slate-300 ${
              mostrarColunasTemporais
                ? 'bg-blue-50 text-[#004C97] font-bold border-blue-300'
                : 'text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Colunas: Cobertura Temporal</span>
          </Button>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Material</th>
                <th className="p-2.5">Descrição</th>
                <th className="p-2.5 text-center">ABC</th>
                <th className="p-2.5 text-center">Família</th>
                <th className="p-2.5 text-right">ZSD24 (t)</th>{' '}
                <th className="p-2.5 text-right">Carteira Vendas</th>
                <th className="p-2.5 text-right">Estoque Livre</th>
                <th className="p-2.5 text-right">Semi CIAFAL</th>
                <th className="p-2.5 text-right">Semi Vallourec</th>
                <th className="p-2.5 text-right">Carteira Negativa</th>
                <th className="p-2.5 text-right">Saldo Estoque</th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Próx. Reposição</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltrados.map((it, idx) => {
                const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
                  it,
                  'L2',
                  entradasFuturas,
                )
                const resTemp = CoberturaTemporalEngine.calcular(inputTemp)

                return (
                  <tr
                    key={idx}
                    onClick={() =>
                      onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                    }
                    className="hover:bg-blue-50/40 text-[11px] cursor-pointer"
                  >
                    <td className="p-2.5 font-mono font-bold text-slate-900">
                      {it.codigo_material}
                    </td>
                    <td className="p-2.5 text-slate-700 max-w-[200px] truncate">
                      {it.descricao_material}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          mapaAbcL2.get(it.codigo_material) === 'A'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : mapaAbcL2.get(it.codigo_material) === 'B'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {mapaAbcL2.get(it.codigo_material) || 'C'}
                      </span>
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-600">{it.familia}</td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatNumberPTBR(it.zsd24_tons ?? it.carteira_aberta_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-800">
                      {formatNumberPTBR(it.carteira_aberta_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatNumberPTBR(it.estoque_livre_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-[#004C97]">
                      {formatNumberPTBR(
                        it.estoque_semiacabado_ciafal_tons || it.estoque_semiacabado_tons || 0,
                        2,
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800">
                      {formatNumberPTBR(it.estoque_semiacabado_vallourec_tons || 0, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                      {it.saldo_negativo_tons < 0
                        ? formatNumberPTBR(it.saldo_negativo_tons, 2)
                        : '-'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {it.saldo_positivo_tons > 0
                        ? `+${formatNumberPTBR(it.saldo_positivo_tons, 2)}`
                        : '-'}
                    </td>
                    {mostrarColunasTemporais && (
                      <>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          {resTemp.mediaDiariaFaturamentoT
                            ? formatNumberPTBR(resTemp.mediaDiariaFaturamentoT, 2)
                            : 'N/D'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {resTemp.diasCoberturaFormatado}
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-700">
                          {resTemp.dataFimEstoqueFormatada}
                        </td>
                        <td
                          className="p-2.5 text-center font-mono text-[10px] text-blue-900 truncate max-w-[120px]"
                          title={resTemp.proximaDataPrevistaFormatada}
                        >
                          {resTemp.proximaDataPrevistaFormatada}
                        </td>
                        <td
                          className={`p-2.5 text-center font-mono font-bold ${resTemp.temGapRuptura ? 'text-rose-700' : 'text-emerald-700'}`}
                        >
                          {resTemp.diasEstoqueNegativoFormatado}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[9px] font-bold border ${resTemp.badgeCor.bg} ${resTemp.badgeCor.text} ${resTemp.badgeCor.border}`}
                          >
                            {resTemp.status}
                          </Badge>
                        </td>
                      </>
                    )}
                    <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                        }
                        className="h-6 px-1.5 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1"
                        title="Ver detalhe com Cobertura Temporal & Previsão"
                      >
                        <Eye className="w-3 h-3" /> Detalhe
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais Analíticos */}
      <PortfolioCharts
        isOpen={isChartsOpen}
        onClose={() => setIsChartsOpen(false)}
        tituloCarteira="Carteira L2"
        itens={resultadoABCL2.itens}
        onSelectMaterial={(itemCalc) => {
          const ci = itensL2.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />

      <PortfolioABC
        isOpen={isAbcOpen}
        onClose={() => setIsAbcOpen(false)}
        resultadoABC={resultadoABCL2}
        onSelectMaterial={(itemCalc) => {
          const ci = itensL2.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />
    </div>
  )
}
export default CarteiraL2View
