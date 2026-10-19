import React from 'react'
import {
  Sparkles,
  X,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CarteiraConsolidadaAiReport } from '@/types/carteira-minima-consolidada'

interface CarteiraMinimaConsolidadaAiModalProps {
  isOpen: boolean
  onClose: () => void
  report: CarteiraConsolidadaAiReport | null
}

export const CarteiraMinimaConsolidadaAiModal: React.FC<CarteiraMinimaConsolidadaAiModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!isOpen || !report) return null

  const rotuloVisao = report.visao === 'BITOLA' ? 'Bitola' : 'Família'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* CABEÇALHO CIAFAL COM IA */}
        <div className="p-5 border-b border-slate-200 bg-linear-to-r from-blue-900 via-[#004C97] to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-xs">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-[11px] font-bold tracking-wider text-blue-200 uppercase">
                Copiloto de PCP &bull; Análise IA Consolidada
              </span>
              <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
                Visão {rotuloVisao}
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-white">
              Diagnóstico Inteligente de Carteira Mínima por {rotuloVisao}
            </h2>
            <p className="text-xs text-blue-100/80">
              Análise baseada estritamente em dados auditados da integração SAP ECC via RFC e
              restrições do HUB. Apoio à decisão sem alteração automática da programação.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO DA ANÁLISE IA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* CARDS INDICADORES IA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-center justify-between text-rose-800 text-xs font-semibold">
                <span>Abaixo do Mínimo</span>
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-rose-950 mt-1">
                {report.totalAgrupamentosAbaixoMinimo}
              </div>
              <p className="text-[11px] text-rose-700 mt-0.5">agrupamentos com déficit produtivo</p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between text-blue-800 text-xs font-semibold">
                <span>Oportunidades de Lote</span>
                <Layers className="w-4 h-4 text-[#004C97]" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-950 mt-1">
                {report.totalOportunidadesConsolidacao}
              </div>
              <p className="text-[11px] text-blue-700 mt-0.5">grupos com múltiplos pedidos aptos</p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold">
                <span>Estoque Livre Parcial</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-950 mt-1">
                {report.totalMateriaisComEstoque}
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                grupos com saldo em estoque livre
              </p>
            </div>
          </div>

          {/* RESUMO EXECUTIVO */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#004C97]" />
              Resumo Executivo do Diagnóstico
            </h3>
            <p className="text-xs leading-relaxed text-slate-700">{report.resumoExecutivo}</p>
          </div>

          {/* SEÇÕES OBJETIVAS PRESCRITAS: 4 RESTRIÇÕES + 5 RISCOS + 6 RECOMENDAÇÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 4. Restrições que impedem agrupamentos */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Restrições Identificadas para Agrupamento
              </h4>
              {report.restricoesIdentificadas.length === 0 ? (
                <p className="text-xs text-amber-800">
                  Nenhuma restrição impeditiva identificada nos dados atuais.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-amber-900">
                  {report.restricoesIdentificadas.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 5. Riscos de não atendimento */}
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Riscos de Não Atendimento &amp; Ociosidade
              </h4>
              {report.riscosNaoAtendimento.length === 0 ? (
                <p className="text-xs text-rose-800">
                  Nenhum risco crítico de parada identificado.
                </p>
              ) : (
                <ul className="space-y-1.5 text-xs text-rose-900">
                  {report.riscosNaoAtendimento.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 6. Recomendações para o Programador de PCP */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#004C97] flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Recomendações Práticas para o Programador de PCP
            </h4>
            <ul className="space-y-2 text-xs text-slate-800">
              {report.recomendacoesPcp.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#004C97] shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* TABELA DE RECOMENDAÇÕES POR AGRUPAMENTO */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Detalhamento de Ação Sugerida por {rotuloVisao}
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2 px-3">{rotuloVisao}</th>
                    <th className="py-2 px-3">Linha/Centro</th>
                    <th className="py-2 px-3 text-right">Saldo (t)</th>
                    <th className="py-2 px-3 text-right">Mínimo</th>
                    <th className="py-2 px-3 text-center">Situação</th>
                    <th className="py-2 px-3">Recomendação do Modelo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.detalhesAgrupamentos.map((d, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{d.chave}</td>
                      <td className="py-2 px-3 font-mono text-slate-600">{d.linhaCentro}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {d.saldoProduzir.toFixed(2)} t
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {d.producaoMinima}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            d.situacao === 'Atendida'
                              ? 'bg-emerald-100 text-emerald-800'
                              : d.situacao === 'Não atingida'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.situacao}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">{d.recomendacaoEspecifica}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL IA */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Governança CIAFAL &bull; Recomendações analíticas estritas &bull; Nunca inventa dados
          </span>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            Fechar Análise IA
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CarteiraMinimaConsolidadaAiModal
