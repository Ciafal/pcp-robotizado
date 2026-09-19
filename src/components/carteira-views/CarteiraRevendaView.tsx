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

interface CarteiraRevendaViewProps {
  itens: CarteiraItem[]
  entradasFuturas: CarteiraEntradaFutura[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
}

export const CarteiraRevendaView: React.FC<CarteiraRevendaViewProps> = ({
  itens,
  entradasFuturas,
  onOpenMemoria,
  onOpenDetalheMaterial,
}) => {
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)

  const itensRevenda = useMemo(() => itens.filter((i) => i.origem_produto === 'REVENDA'), [itens])
  const entradasRevenda = useMemo(
    () => entradasFuturas.filter((e) => e.origem === 'REVENDA'),
    [entradasFuturas],
  )

  const resultadoABCRevenda = useMemo(() => {
    return CurvaAbcFaturamentoEngine.calcularCurvaAbc(itensRevenda)
  }, [itensRevenda])

  const mapaAbcRevenda = useMemo(() => {
    const m = new Map<string, string>()
    resultadoABCRevenda.itens.forEach((i) => m.set(i.codigo_material, i.curva_abc))
    return m
  }, [resultadoABCRevenda])

  const itensFiltradosRevenda = useMemo(() => {
    if (filtroCurva === 'TODAS') return itensRevenda
    return itensRevenda.filter((i) => {
      const c = mapaAbcRevenda.get(i.codigo_material) || 'C'
      return c === filtroCurva
    })
  }, [itensRevenda, filtroCurva, mapaAbcRevenda])

  const totalCarteiraRevenda = itensRevenda.reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const totalEstoqueFisico = itensRevenda.reduce((s, i) => s + (i.estoque_livre_tons || 0), 0)
  const totalCompradoPendente = entradasRevenda.reduce(
    (s, i) => s + (i.quantidade_pendente_tons || 0),
    0,
  )
  const saldoFuturoProjetado = totalEstoqueFisico + totalCompradoPendente - totalCarteiraRevenda

  // Análise automática Alertas & IA da Carteira Revenda
  const analiseRevenda = React.useMemo(() => {
    return CarteiraAnaliseEngine.analisarCarteiraGenerica('REVENDA', itens, entradasFuturas)
  }, [itens, entradasFuturas])

  return (
    <div className="space-y-4">
      {/* Alertas & IA • Análise Automática da Carteira Revenda */}
      <AlertasIACarteiraCard
        nomeCarteira="Carteira Revenda"
        subtitulo="Diagnóstico preditivo em tempo real • Suprimentos & Compras Externas • Revenda Comercial"
        indicadores={analiseRevenda.indicadores}
        alertas={analiseRevenda.alertas}
        analisesIA={analiseRevenda.analisesIA}
        onFiltrarMaterial={(mat) => {
          const item = itensRevenda.find((i) => i.codigo_material === mat)
          if (item && onOpenDetalheMaterial) onOpenDetalheMaterial(item)
        }}
      />

      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Carteira de Revenda &bull; Suprimentos & Disponibilidade Comercial
            </h3>
            <Badge className="bg-[#004C97] text-white text-[10px] font-bold">Origem: Revenda</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cruzamento temporal de compras externas, datas previstas de recebimento e demanda
            comprometida.
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
            Carteira Total Revenda
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {formatNumberPTBR(totalCarteiraRevenda, 2)} t
          </strong>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Estoque Físico Livre
          </span>
          <strong className="text-base font-mono font-bold text-slate-800 block mt-0.5">
            {formatNumberPTBR(totalEstoqueFisico, 2)} t
          </strong>
        </div>
        <div className="p-3 bg-white rounded-xl border border-sky-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
            Carteira Revenda
          </span>
          <strong className="text-base font-sans font-bold text-[#003870] block mt-0.5">
            {formatNumberPTBR(totalCompradoPendente, 2)} t
          </strong>
        </div>
        <div className="p-3 bg-white rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-[#004C97] block">
            Saldo Futuro Projetado
          </span>
          <strong className="text-base font-mono font-bold text-[#004C97] block mt-0.5">
            {saldoFuturoProjetado > 0
              ? `+${formatNumberPTBR(saldoFuturoProjetado, 2)}`
              : formatNumberPTBR(saldoFuturoProjetado, 2)}{' '}
            t
          </strong>
        </div>{' '}
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
          Ordens de Venda Atendidas por Revenda ({itensRevenda.length})
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
                <th className="p-2.5 text-right">Estoque Físico (t)</th>
                <th className="p-2.5 text-right">Entrada Prevista (t)</th>
                <th className="p-2.5 text-center">Data Desejada</th>
                <th className="p-2.5 text-center">Risco de Atraso</th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Próx. Recebimento</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itensFiltradosRevenda.map((it, idx) => {
                const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
                  it,
                  'REVENDA',
                  entradasRevenda,
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
                          mapaAbcRevenda.get(it.codigo_material) === 'A'
                            ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                            : mapaAbcRevenda.get(it.codigo_material) === 'B'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {mapaAbcRevenda.get(it.codigo_material) || 'C'}
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
                    <td className="p-2.5 text-right font-mono text-[#004C97]">
                      {formatNumberPTBR(
                        entradasRevenda.find((e) => e.codigo_material === it.codigo_material)
                          ?.quantidade_pendente_tons || 0,
                        2,
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-700">
                      {formatDatePTBR(it.data_desejada)}
                    </td>
                    <td className="p-2.5 text-center">
                      {it.status_ruptura === 'VERMELHO' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                          Risco Alto
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px]">
                          Normal
                        </Badge>
                      )}
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
        tituloCarteira="Carteira Revenda"
        itens={resultadoABCRevenda.itens}
        onSelectMaterial={(itemCalc) => {
          const ci = itensRevenda.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />

      <PortfolioABC
        isOpen={isAbcOpen}
        onClose={() => setIsAbcOpen(false)}
        resultadoABC={resultadoABCRevenda}
        onSelectMaterial={(itemCalc) => {
          const ci = itensRevenda.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />
    </div>
  )
}
export default CarteiraRevendaView
