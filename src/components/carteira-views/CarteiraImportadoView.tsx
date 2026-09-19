import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, SlidersHorizontal, BarChart3, Sparkles } from 'lucide-react'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { formatNumberPTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { CarteiraAnaliseEngine } from '@/services/carteira-analise-engine-unified'
import { CurvaAbcFaturamentoEngine } from '@/services/curva-abc-faturamento-engine'
import { AlertasIACarteiraCard } from './AlertasIACarteiraCard'
import { PortfolioCharts } from './PortfolioCharts'
import { PortfolioABC } from './PortfolioABC'

interface CarteiraImportadoViewProps {
  itens: CarteiraItem[]
  entradasFuturas: CarteiraEntradaFutura[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
}

export const CarteiraImportadoView: React.FC<CarteiraImportadoViewProps> = ({
  itens,
  entradasFuturas,
  onOpenMemoria,
  onOpenDetalheMaterial,
}) => {
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)

  const itensImportados = useMemo(
    () => itens.filter((i) => i.origem_produto === 'IMPORTADO'),
    [itens],
  )
  const entradasImportadas = useMemo(
    () => entradasFuturas.filter((e) => e.origem === 'IMPORTADO'),
    [entradasFuturas],
  )

  const resultadoABCImportado = useMemo(() => {
    return CurvaAbcFaturamentoEngine.calcularCurvaAbc(itensImportados)
  }, [itensImportados])

  const mapaAbcImportado = useMemo(() => {
    const m = new Map<string, string>()
    resultadoABCImportado.itens.forEach((i) => m.set(i.codigo_material, i.curva_abc))
    return m
  }, [resultadoABCImportado])

  const itensFiltradosImportados = useMemo(() => {
    if (filtroCurva === 'TODAS') return itensImportados
    return itensImportados.filter((i) => {
      const c = mapaAbcImportado.get(i.codigo_material) || 'C'
      return c === filtroCurva
    })
  }, [itensImportados, filtroCurva, mapaAbcImportado])

  const totalCarteiraImportados = itensImportados.reduce(
    (s, i) => s + (i.carteira_aberta_tons || 0),
    0,
  )
  const totalEstoqueImportado = itensImportados.reduce((s, i) => s + (i.estoque_livre_tons || 0), 0)
  const totalTransitoPendente = entradasImportadas.reduce(
    (s, i) => s + (i.quantidade_pendente_tons || 0),
    0,
  )
  const saldoFuturoImportado =
    totalEstoqueImportado + totalTransitoPendente - totalCarteiraImportados

  // Análise automática Alertas & IA da Carteira Importado
  const analiseImportado = React.useMemo(() => {
    return CarteiraAnaliseEngine.analisarCarteiraGenerica('IMPORTADO', itens, entradasFuturas)
  }, [itens, entradasFuturas])

  return (
    <div className="space-y-4">
      {/* Alertas & IA • Análise Automática da Carteira Importado */}
      <AlertasIACarteiraCard
        nomeCarteira="Carteira Importado"
        subtitulo="Diagnóstico preditivo em tempo real • Comércio Exterior & Trânsito Marítimo • Produtos Importados"
        indicadores={analiseImportado.indicadores}
        alertas={analiseImportado.alertas}
        analisesIA={analiseImportado.analisesIA}
        onFiltrarMaterial={(mat) => {
          const item = itensImportados.find((i) => i.codigo_material === mat)
          if (item && onOpenDetalheMaterial) onOpenDetalheMaterial(item)
        }}
      />

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Carteira de Produtos Importados &bull; Comércio Exterior & Trânsito
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">
              Origem: Importado
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de lotes em trânsito internacional, desembaraço aduaneiro e cobertura de
            pedidos.
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
            className="h-7 text-xs font-bold bg-[#004C97] hover:bg-[#003870] text-white gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Curva ABC
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
            <span>Colunas: Temporal</span>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Carteira Total Importados
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {formatNumberPTBR(totalCarteiraImportados, 2)} t
          </strong>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Estoque Disponível
          </span>
          <strong className="text-base font-mono font-bold text-slate-800 block mt-0.5">
            {formatNumberPTBR(totalEstoqueImportado, 2)} t
          </strong>
        </div>
        <div className="p-3 bg-white rounded-xl border border-sky-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
            Importado em Trânsito
          </span>
          <strong className="text-base font-sans font-bold text-[#003870] block mt-0.5">
            {formatNumberPTBR(totalImportadoTransito, 2)} t
          </strong>
        </div>{' '}
        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
            Saldo Futuro Projetado
          </span>
          <strong className="text-base font-mono font-bold text-[#004C97] block mt-0.5">
            {saldoFuturoImportado > 0
              ? `+${formatNumberPTBR(saldoFuturoImportado, 2)}`
              : formatNumberPTBR(saldoFuturoImportado, 2)}{' '}
            t
          </strong>
        </div>{' '}
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
          Ordens de Venda de Produtos Importados ({itensImportados.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Material</th>
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5 text-center">ABC</th>
                <th className="p-2.5">Pedido / Item</th>
                <th className="p-2.5 text-right">Carteira (t)</th>
                <th className="p-2.5 text-right">Estoque (t)</th>
                <th className="p-2.5 text-right">Em Trânsito (t)</th>
                <th className="p-2.5 text-center">Data Desejada</th>
                <th className="p-2.5 text-center">Status Chegada</th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Próx. Disponibilidade ETA</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltradosImportados.map((it, idx) => {
                const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
                  it,
                  'IMPORTADO',
                  entradasImportadas,
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
                    <td className="p-2.5 text-slate-700 max-w-[150px] truncate">
                      {it.nome_cliente}
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          mapaAbcImportado.get(it.codigo_material) === 'A'
                            ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                            : mapaAbcImportado.get(it.codigo_material) === 'B'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {mapaAbcImportado.get(it.codigo_material) || 'C'}
                      </span>{' '}
                    </td>
                    <td className="p-2.5 font-mono text-slate-700">
                      {it.ordem_venda}/{it.item_ordem}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                      {formatNumberPTBR(it.carteira_aberta_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700">
                      {formatNumberPTBR(it.estoque_livre_tons, 2)}
                    </td>
                    <td className="p-2.5 text-right font-mono text-purple-800">
                      {formatNumberPTBR(
                        entradasImportadas.find((e) => e.codigo_material === it.codigo_material)
                          ?.quantidade_pendente_tons || 0,
                        2,
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">
                      {formatDatePTBR(it.data_desejada)}
                    </td>
                    <td className="p-2.5 text-center">
                      <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[9px] font-bold">
                        Em Trânsito
                      </Badge>
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
        tituloCarteira="Carteira Importado"
        itens={resultadoABCImportado.itens}
        onSelectMaterial={(itemCalc) => {
          const ci = itensImportados.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />

      <PortfolioABC
        isOpen={isAbcOpen}
        onClose={() => setIsAbcOpen(false)}
        resultadoABC={resultadoABCImportado}
        onSelectMaterial={(itemCalc) => {
          const ci = itensImportados.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />
    </div>
  )
}
export default CarteiraImportadoView
