import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Eye,
  Factory,
  SlidersHorizontal,
  ClipboardCheck,
  BarChart3,
  Sparkles,
  FileText,
  CheckCircle2,
} from 'lucide-react'
import { CarteiraItem } from '@/types/carteira-analise'
import { CoberturaTemporalEngine } from '@/services/cobertura-temporal-engine'
import { ConsultarRequisitosMTOModal } from './ConsultarRequisitosMTOModal'
import {
  getRequirementsGridInfoMap,
  buildMtoOrderKey,
  type MtoGridCellRequirementInfo,
} from '@/services/mto-requirements-service'
import { formatNumberPTBR, formatDatePTBR } from '@/lib/formatters-ptbr'
import { CarteiraAnaliseEngine } from '@/services/carteira-analise-engine-unified'
import { CurvaAbcFaturamentoEngine } from '@/services/curva-abc-faturamento-engine'
import { AlertasIACarteiraCard } from './AlertasIACarteiraCard'
import { PortfolioCharts } from './PortfolioCharts'
import { PortfolioABC } from './PortfolioABC'
import { MinimoNaoAtingidoCard } from './MinimoNaoAtingidoCard'
import { MinimoNaoAtingidoModal } from './MinimoNaoAtingidoModal'
import { useSapMaterialLoteMinimo } from '@/hooks/use-sap-material-lote-minimo'
import {
  calcularMinimoNaoAtingido,
  MinimoNaoAtingidoSummary,
} from '@/services/carteira-minimo-nao-atingido-engine'

interface CarteiraMTOViewProps {
  itens: CarteiraItem[]
  entradasFuturas?: any[]
  onOpenMemoria: (item: CarteiraItem) => void
  onOpenDetalheMaterial?: (item: CarteiraItem) => void
}

export const CarteiraMTOView: React.FC<CarteiraMTOViewProps> = ({
  itens,
  entradasFuturas = [],
  onOpenMemoria,
  onOpenDetalheMaterial,
}) => {
  const [subAba, setSubAba] = useState<'RESUMO' | 'MTO_L1' | 'MTO_L2'>('RESUMO')
  const [filtroCurva, setFiltroCurva] = useState<'TODAS' | 'A' | 'B' | 'C'>('TODAS')
  const [mostrarColunasTemporais, setMostrarColunasTemporais] = useState(false)
  const [isConsultarRequisitosOpen, setIsConsultarRequisitosOpen] = useState(false)
  const [isChartsOpen, setIsChartsOpen] = useState(false)
  const [isAbcOpen, setIsAbcOpen] = useState(false)
  const [isMinimoModalOpen, setIsMinimoModalOpen] = useState(false)
  const [itemRequisitosSelecionado, setItemRequisitosSelecionado] = useState<CarteiraItem | null>(
    null,
  )
  const [requirementsGridMap, setRequirementsGridMap] = useState<
    Map<string, MtoGridCellRequirementInfo>
  >(new Map())
  const itensMTO = useMemo(() => itens.filter((i) => i.tipo_ordem === 'MTO'), [itens])

  // Carrega contagens e resumo dos tipos reais de requisitos MTO por Pedido + Item (Seção 5, 6 e 7)
  React.useEffect(() => {
    if (!itensMTO.length) return
    let isSubscribed = true
    const orderKeys = itensMTO.map((it) => ({
      pedido: String(it.ordem_venda || ''),
      item: String(it.item_ordem || ''),
    }))

    getRequirementsGridInfoMap(orderKeys).then((map) => {
      if (isSubscribed) setRequirementsGridMap(map)
    })

    return () => {
      isSubscribed = false
    }
  }, [itensMTO])

  // Réplica oficial SAP do lote mínimo sincronizado via RFC
  const { replicaMap: replicaSapLoteMinimo } = useSapMaterialLoteMinimo()

  // Cálculo reativo de Mínimo Não Atingido para Carteira MTO
  const resumoMinimoMTO: MinimoNaoAtingidoSummary = useMemo(() => {
    return calcularMinimoNaoAtingido({
      itens: itensMTO,
      tipoVisao: 'MTO',
      replicaSapPorCodigo: replicaSapLoteMinimo,
    })
  }, [itensMTO, replicaSapLoteMinimo])

  const resultadoABCMTO = useMemo(() => {
    return CurvaAbcFaturamentoEngine.calcularCurvaAbc(itensMTO)
  }, [itensMTO])

  const mapaAbcMTO = useMemo(() => {
    const m = new Map<string, string>()
    resultadoABCMTO.itens.forEach((i) => m.set(i.codigo_material, i.curva_abc))
    return m
  }, [resultadoABCMTO])

  const mtoL1 = useMemo(
    () =>
      itensMTO.filter(
        (i) =>
          i.linha === 'L1' ||
          ['C', 'Q', 'R', 'V'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
      ),
    [itensMTO],
  )
  const mtoL2 = useMemo(
    () =>
      itensMTO.filter(
        (i) =>
          i.linha === 'L2' ||
          ['R', 'Q', 'B', 'S'].includes((i.codigo_material || '').charAt(0).toUpperCase()),
      ),
    [itensMTO],
  )

  const totalMtoTons = itensMTO.reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const aFaturarTons = itensMTO
    .filter((i) => i.status_atendimento === 'A_FATURAR')
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const aProduzirTons = itensMTO
    .filter((i) => i.status_atendimento === 'A_PRODUZIR' || i.status_atendimento === 'PROGRAMADO')
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)
  const bloqueadosTons = itensMTO
    .filter((i) => i.bloqueio)
    .reduce((s, i) => s + (i.carteira_aberta_tons || 0), 0)

  // Análise automática Alertas & IA da Carteira MTO com regras estritas de ordens, requisitos e clientes
  const analiseMTO = React.useMemo(() => {
    return CarteiraAnaliseEngine.analisarCarteiraGenerica('MTO', itens, entradasFuturas)
  }, [itens, entradasFuturas])

  return (
    <div className="space-y-4">
      {/* Alertas & IA • Análise Automática da Carteira MTO */}
      <AlertasIACarteiraCard
        nomeCarteira="Carteira MTO"
        subtitulo="Diagnóstico preditivo em tempo real • Make-to-Order • Ordens, Requisitos e Prazos"
        indicadores={analiseMTO.indicadores}
        alertas={analiseMTO.alertas}
        analisesIA={analiseMTO.analisesIA}
        onFiltrarMaterial={(mat) => {
          const item = itensMTO.find((i) => i.codigo_material === mat)
          if (item && onOpenDetalheMaterial) onOpenDetalheMaterial(item)
        }}
      />

      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubAba('RESUMO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subAba === 'RESUMO'
                ? 'bg-[#004C97] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Resumo Geral MTO
          </button>
          <button
            onClick={() => setSubAba('MTO_L1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subAba === 'MTO_L1'
                ? 'bg-[#004C97] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pedidos MTO L1 ({mtoL1.length})
          </button>
          <button
            onClick={() => setSubAba('MTO_L2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subAba === 'MTO_L2'
                ? 'bg-[#004C97] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Pedidos MTO L2 ({mtoL2.length})
          </button>
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
            Total Carteira MTO
          </span>
          <strong className="text-base font-mono font-bold text-slate-900 block mt-0.5">
            {formatNumberPTBR(totalMtoTons, 2)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">
            MTO A Faturar (Coberto)
          </span>
          <strong className="text-base font-mono font-bold text-emerald-700 block mt-0.5">
            {formatNumberPTBR(aFaturarTons, 2)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-700 block">
            MTO A Produzir (Pendente)
          </span>
          <strong className="text-base font-mono font-bold text-amber-800 block mt-0.5">
            {formatNumberPTBR(aProduzirTons, 2)} t
          </strong>
        </div>

        <div className="p-3 bg-white rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">
            Ordens Bloqueadas
          </span>
          <strong className="text-base font-mono font-bold text-rose-800 block mt-0.5">
            {formatNumberPTBR(bloqueadosTons, 2)} t
          </strong>
        </div>
      </div>

      {/* Card Executivo 'Mínimo não atingido' Carteira MTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
        <MinimoNaoAtingidoCard
          summary={resumoMinimoMTO}
          onClick={() => setIsMinimoModalOpen(true)}
        />
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#004C97] text-white text-[11px]">
              <tr>
                <th className="p-2.5">Pedido / Item</th>
                <th className="p-2.5">Cliente</th>
                <th className="p-2.5">Material & Descrição</th>
                <th className="p-2.5 text-center">ABC</th>
                <th className="p-2.5 text-center">Linha</th>
                <th className="p-2.5 text-right">Qtd Ordem (t)</th>
                <th className="p-2.5 text-right">Faturado (t)</th>
                <th className="p-2.5 text-right">Saldo Pedido (t)</th>
                <th className="p-2.5 text-right">Estoque MTO (t)</th>
                <th className="p-2.5 text-right">Falta Produzir (t)</th>
                <th className="p-2.5 text-center">Requisitos MTO</th>
                <th className="p-2.5 text-center">Status Atendimento</th>
                <th className="p-2.5 text-center">Data Desejada</th>
                {mostrarColunasTemporais && (
                  <>
                    <th className="p-2.5 text-right bg-blue-900/40">Média (t/d)</th>
                    <th className="p-2.5 text-right bg-blue-900/40">Cobertura</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Fim Estoque</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Próx. Reposição OP</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Gap Dias</th>
                    <th className="p-2.5 text-center bg-blue-900/40">Status Temporal</th>
                  </>
                )}
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(subAba === 'MTO_L1' ? mtoL1 : subAba === 'MTO_L2' ? mtoL2 : itensMTO)
                .filter((it) => {
                  if (filtroCurva !== 'TODAS') {
                    const c = mapaAbcMTO.get(it.codigo_material) || 'C'
                    if (c !== filtroCurva) return false
                  }
                  return true
                })
                .map((it, idx) => {
                  const inputTemp = CoberturaTemporalEngine.converterCarteiraItemParaInput(
                    it,
                    'MTO',
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
                        {it.ordem_venda} / {it.item_ordem}
                      </td>
                      <td className="p-2.5 text-slate-800 font-medium max-w-[150px] truncate">
                        {it.nome_cliente}
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-slate-900">
                          {it.codigo_material}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                          {it.descricao_material}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            mapaAbcMTO.get(it.codigo_material) === 'A'
                              ? 'bg-blue-100 text-[#004C97] border border-blue-300'
                              : mapaAbcMTO.get(it.codigo_material) === 'B'
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {mapaAbcMTO.get(it.codigo_material) || 'C'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge className="bg-slate-100 text-[#004C97] text-[10px]">
                          {it.linha || 'GERAL'}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-800">
                        {formatNumberPTBR(it.qtd_ordem_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {formatNumberPTBR(it.qtd_faturada_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                        {formatNumberPTBR(it.carteira_aberta_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-[#003870]">
                        {formatNumberPTBR(it.estoque_mto_tons, 2)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-700">
                        {it.falta_produzir_tons > 0
                          ? formatNumberPTBR(it.falta_produzir_tons, 2)
                          : '0,00'}
                      </td>
                      {/* COLUNA REQUISITOS MTO (PONTO ÚNICO POR LINHA — SEÇÃO 3, 5, 6 e 7) */}
                      <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const specificKey = buildMtoOrderKey(it.ordem_venda, it.item_ordem)
                          const info =
                            requirementsGridMap.get(specificKey) ||
                            requirementsGridMap.get(String(it.ordem_venda))
                          const count = info?.count || 0

                          if (count <= 0) {
                            return (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-200 cursor-not-allowed select-none"
                                title="Sem requisitos MTO cadastrados para este pedido"
                              >
                                Sem requisito
                              </span>
                            )
                          }

                          return (
                            <div className="flex flex-col items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setItemRequisitosSelecionado(it)
                                  setIsConsultarRequisitosOpen(true)
                                }}
                                className="h-6 px-2 text-[10px] bg-blue-50/90 hover:bg-blue-100 text-[#004C97] hover:text-[#003870] border-blue-200 font-bold gap-1 transition-colors shadow-2xs"
                                title={`Consultar ${count} requisito(s) cadastrado(s) deste item`}
                              >
                                <FileText className="w-3 h-3 text-[#004C97]" />
                                <span>Ver requisitos ({count})</span>
                              </Button>
                              {info?.tiposResumoTexto && (
                                <span
                                  className="text-[9.5px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 truncate max-w-[170px]"
                                  title={info.tiposResumoTexto}
                                >
                                  {info.tiposResumoTexto}
                                </span>
                              )}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="p-2.5 text-center">
                        {it.bloqueio ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[9px] font-bold">
                            Bloqueado
                          </Badge>
                        ) : it.status_atendimento === 'A_FATURAR' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                            A Faturar
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[9px] font-bold">
                            A Produzir
                          </Badge>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {formatDatePTBR(it.data_desejada)}
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
                        <div className="flex items-center justify-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              onOpenDetalheMaterial ? onOpenDetalheMaterial(it) : onOpenMemoria(it)
                            }
                            className="h-6 px-2 text-[10px] text-[#004C97] hover:bg-blue-50 font-semibold gap-1 border border-blue-200"
                            title="Ver detalhe com Cobertura Temporal & Previsão"
                          >
                            <Eye className="w-3 h-3" /> Detalhe
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reutilizável de Consulta de Requisitos MTO */}
      <ConsultarRequisitosMTOModal
        open={isConsultarRequisitosOpen}
        onOpenChange={(open) => {
          setIsConsultarRequisitosOpen(open)
          if (!open) {
            setItemRequisitosSelecionado(null)
          }
        }}
        pedidoNumero={itemRequisitosSelecionado?.ordem_venda}
        itemPedido={itemRequisitosSelecionado?.item_ordem}
        clienteNome={itemRequisitosSelecionado?.nome_cliente}
        descricaoMaterial={itemRequisitosSelecionado?.descricao_material}
        quantidadeTons={itemRequisitosSelecionado?.qtd_ordem_tons}
      />

      {/* Modais Analíticos */}
      <PortfolioCharts
        isOpen={isChartsOpen}
        onClose={() => setIsChartsOpen(false)}
        tituloCarteira="Carteira MTO"
        itens={resultadoABCMTO.itens}
        onSelectMaterial={(itemCalc) => {
          const ci = itensMTO.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />

      <PortfolioABC
        isOpen={isAbcOpen}
        onClose={() => setIsAbcOpen(false)}
        resultadoABC={resultadoABCMTO}
        onSelectMaterial={(itemCalc) => {
          const ci = itensMTO.find((i) => i.codigo_material === itemCalc.codigo_material)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />

      {/* Modal Mínimo Não Atingido MTO */}
      <MinimoNaoAtingidoModal
        isOpen={isMinimoModalOpen}
        onClose={() => setIsMinimoModalOpen(false)}
        summary={resumoMinimoMTO}
        tituloVisao="Carteira MTO"
        onSelectMaterial={(mat) => {
          const ci = itensMTO.find((i) => i.codigo_material === mat)
          if (ci && onOpenDetalheMaterial) onOpenDetalheMaterial(ci)
        }}
      />
    </div>
  )
}
export default CarteiraMTOView
