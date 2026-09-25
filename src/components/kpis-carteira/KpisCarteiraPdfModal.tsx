import React, { useState } from 'react'
import {
  FileText,
  X,
  Download,
  Printer,
  Sparkles,
  Layers,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { KpisCarteiraResult, KpiFilterParams } from '@/services/kpis-carteira-service'

interface KpisCarteiraPdfModalProps {
  isOpen: boolean
  onClose: () => void
  kpis: KpisCarteiraResult
  filters: KpiFilterParams
}

export const KpisCarteiraPdfModal: React.FC<KpisCarteiraPdfModalProps> = ({
  isOpen,
  onClose,
  kpis,
  filters,
}) => {
  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Barra superior de ações */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Relatório Executivo Oficial • KPIs de Carteira
              </h3>
              <p className="text-xs text-slate-500">
                Competência: {kpis.competenciaFormatada} • Posição em: {kpis.posicaoFechamentoEm}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 text-slate-700"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Imprimir / Salvar PDF
            </Button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo do Documento Impresso / Visualizado */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-white text-slate-900">
          {/* Cabeçalho Corporativo CIAFAL */}
          <div className="border-b-2 border-[#004C97] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#004C97] uppercase">
                HUB CIAFAL • PCP ROBOTIZADO
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-0.5">
                Relatório Mensal de Indicadores de Carteira
              </h1>
              <p className="text-xs text-slate-600 mt-1">
                Competência de Referência: <strong>{kpis.competenciaFormatada}</strong> | Fechamento
                em: <strong>{kpis.posicaoFechamentoEm}</strong>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div className="font-semibold text-slate-800">Emissão Oficial</div>
              <div>
                {new Date().toLocaleDateString('pt-BR')} às{' '}
                {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-[#004C97] rounded font-mono font-bold mt-1 inline-block border border-blue-200">
                VERSÃO OFICIAL AUDITADA
              </span>
            </div>
          </div>

          {/* Filtros Aplicados */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="text-slate-500 block">Exercício</span>
              <span className="font-bold text-slate-800">{kpis.exercicio}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Centro Produtivo</span>
              <span className="font-bold text-slate-800">{filters.centro || 'Todos'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Linha de Laminação</span>
              <span className="font-bold text-slate-800">{filters.linha || 'Todas'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Curva ABC</span>
              <span className="font-bold text-slate-800">{filters.curvaAbc || 'Todas'}</span>
            </div>
          </div>

          {/* Resumo dos 4 KPIs Oficiais */}
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Quadro de Indicadores Principais
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <span className="text-[11px] text-slate-500 block">
                  KPI 1 - Itens Negativos Fechamento
                </span>
                <span className="text-lg font-bold font-mono text-slate-900 block mt-1">
                  {kpis.kpi1_totalItensNegativos} materiais
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  A: {kpis.kpi1_itensNegativosA} | B: {kpis.kpi1_itensNegativosB} | C:{' '}
                  {kpis.kpi1_itensNegativosC}
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <span className="text-[11px] text-slate-500 block">
                  KPI 2 - Saldo Carteira Negativa
                </span>
                <span className="text-lg font-bold font-mono text-rose-700 block mt-1">
                  {kpis.kpi2_saldoNegativoFechamento.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  t
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Pico:{' '}
                  {kpis.kpi2_maiorSaldoNegativoMes.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  t
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <span className="text-[11px] text-slate-500 block">
                  KPI 3 - Item-Dias Negativos
                </span>
                <span className="text-lg font-bold font-mono text-slate-900 block mt-1">
                  {kpis.kpi3_itemDiasAcumulados} item-dias
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Média: {kpis.kpi3_mediaDiasPorMaterial.toFixed(1)} dias/item
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <span className="text-[11px] text-slate-500 block">KPI 4 - Cancelamentos PCP</span>
                <span className="text-lg font-bold font-mono text-slate-900 block mt-1">
                  {kpis.kpi4_pedidosCanceladosPcp} pedidos |{' '}
                  {kpis.kpi4_pctPedidosCanceladosPcp.toFixed(1)}%
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {kpis.kpi4_toneladasCanceladasPcp.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  t canceladas
                </span>
              </div>
            </div>
          </div>

          {/* Tabela de Distribuição da Curva ABC */}
          <div>
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Distribuição por Curva ABC (Itens Negativos na Virada)
            </h2>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Classificação</th>
                  <th className="py-2 px-3 text-center">Itens Negativos</th>
                  <th className="py-2 px-3 text-right">Percentual (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kpis.kpi1_curvaTabela.map((row) => (
                  <tr
                    key={row.curva}
                    className={row.curva === 'Total' ? 'font-bold bg-slate-50' : ''}
                  >
                    <td className="py-2 px-3">
                      {row.curva === 'Total' ? 'Total Geral' : `Curva ${row.curva}`}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">{row.itens}</td>
                    <td className="py-2 px-3 text-right font-mono">
                      {row.percentual.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Análise de Inteligência Artificial Oficial */}
          {kpis.analiseIA && (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/40 text-xs space-y-3">
              <div className="flex items-center gap-2 text-[#004C97] font-bold uppercase tracking-wider text-[11px]">
                <Sparkles className="w-4 h-4" />
                Diagnóstico Analítico de IA (Fato / Correlação / Hipótese)
              </div>

              <p className="text-slate-800 leading-relaxed font-medium">
                {kpis.analiseIA.situacaoPeriodo}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Principais Desvios</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {kpis.analiseIA.principaisDesvios.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Pontos de Atuação PCP</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                    {kpis.analiseIA.pontosParaAtuacaoPcp.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {kpis.analiseIA.relacoesEncontradas && (
                <div className="pt-2 border-t border-blue-100 space-y-1.5">
                  <span className="font-bold text-slate-700 block">Relações Identificadas</span>
                  {kpis.analiseIA.relacoesEncontradas.map((r, i) => (
                    <div
                      key={i}
                      className="p-2 bg-white rounded border border-blue-100 text-[11px]"
                    >
                      <span className="font-bold text-[#004C97]">[{r.tipo}]</span>{' '}
                      <strong>{r.titulo}:</strong> {r.descricao}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rodapé da Página com Nota de Governança */}
          <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Fonte: Snapshots diários da carteira (tabela <code>pcp_carteira_daily_snapshots</code>
              ). Sem valores financeiros de pedidos cancelados.
            </span>
            <span>HUB CIAFAL • Padrão ABNT / SAP ECC</span>
          </div>
        </div>
      </div>
    </div>
  )
}
