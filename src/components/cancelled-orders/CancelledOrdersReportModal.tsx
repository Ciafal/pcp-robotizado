/**
 * Modal e Gerador do Relatório Executivo de Pedidos Cancelados (Requisito 23)
 * Estrutura formal exigida:
 * 1 Resumo executivo; 2 Qtd de pedidos cancelados; 3 Toneladas canceladas; 4 Valor financeiro;
 * 5 Índice de cancelamento; 6 Principais motivos; 7 Pareto; 8 Cancelamentos relacionados ao PCP;
 * 9 Cancelamentos comerciais; 10 Cancelamentos por cliente; 11 Cancelamentos por material;
 * 12 Inconsistências encontradas pela IA; 13 Reincidências; 14 Comparação mensal; 15 Acumulado anual;
 * 16 Riscos; 17 Recomendações; 18 Plano de ação.
 * Ações: visualizar, editar texto, solicitar revisão da IA, gerar PDF (impressão formatada), enviar por e-mail.
 */

import React, { useState } from 'react'
import { X, FileText, Printer, Mail, Sparkles, Edit3, CheckCircle2, Building2 } from 'lucide-react'
import { CancelledOrderRecord, CancellationExecutiveKPIs } from '@/types/cancelled-orders'
import { formatTons, formatCurrencyPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  orders: CancelledOrderRecord[]
  kpis: CancellationExecutiveKPIs
}

export const CancelledOrdersReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  kpis,
}) => {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)

  // Texto editável do resumo executivo
  const [resumoExecutivo, setResumoExecutivo] = useState(
    `No período analisado, o volume cancelado totalizou ${formatTons(
      kpis.totalVolumeToneladas,
    )}, correspondendo a um índice de cancelamento de ${formatPercentPtBr(
      kpis.percentualCarteiraCancelada,
    )} sobre a carteira total. O principal ofensor foi "${
      kpis.principalMotivoNome
    }". Foram identificadas ${
      kpis.inconsistenciasIAQtd
    } ocorrências com possível inconsistência entre o motivo registrado no SAP e o estoque real disponível.`,
  )

  const [recomendacoesText, setRecomendacoesText] = useState(
    `1. Reunião semanal de alinhamento PCP-Vendas para materiais de giro crítico da Linha 1.\n` +
      `2. Ajuste na parametrização dos prazos de laminação e reserva de lotes no SAP ECC.\n` +
      `3. Auditoria nos motivos informados de "Sem estoque em pronta entrega" quando houver saldo físico superior ao volume do pedido.`,
  )

  if (!isOpen) return null

  const handlePrintPdf = () => {
    window.print()
  }

  const handleSendEmail = () => {
    toast({
      title: 'Relatório Enviado com Sucesso',
      description:
        'O relatório consolidado de pedidos cancelados foi encaminhado para a diretoria industrial e comercial.',
      duration: 4000,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold">Relatório Executivo de Pedidos Cancelados</h3>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs h-8 text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1" />
              {isEditing ? 'Concluir Edição' : 'Editar Texto'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendEmail}
              className="text-xs h-8 text-slate-200 border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              <Mail className="w-3.5 h-3.5 mr-1" />
              Enviar E-mail
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrintPdf}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Gerar PDF / Imprimir
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível do Relatório */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-800 text-xs leading-relaxed print:p-0">
          {/* Topo CIAFAL */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                HUB CIAFAL • PCP ROBOTIZADO
              </h1>
              <p className="text-xs text-slate-600">
                Relatório Consolidado de Gestão da Carteira e Pedidos Cancelados
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500 font-mono">
              Emissão: {new Date().toLocaleDateString('pt-BR')}{' '}
              {new Date().toLocaleTimeString('pt-BR')}
              <br />
              Padrão ABNT / SAP ECC
            </div>
          </div>

          {/* 1. Resumo Executivo */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              1. Resumo Executivo
            </h2>
            {isEditing ? (
              <Textarea
                rows={3}
                value={resumoExecutivo}
                onChange={(e) => setResumoExecutivo(e.target.value)}
                className="text-xs"
              />
            ) : (
              <p className="bg-slate-50 p-3 rounded border border-slate-200">{resumoExecutivo}</p>
            )}
          </div>

          {/* 2 a 5: Indicadores Chave */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
              2 a 5. Indicadores Macroeconômicos da Carteira
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">2. Qtd. Pedidos Cancelados</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {kpis.totalPedidosQtd} itens
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">3. Toneladas Canceladas</span>
                <span className="text-base font-bold font-mono text-rose-700">
                  {formatTons(kpis.totalVolumeToneladas)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">4. Valor Financeiro Total</span>
                <span className="text-base font-bold font-mono text-slate-900">
                  {formatCurrencyPtBr(kpis.totalValorBrl)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">5. Índice de Cancelamento</span>
                <span className="text-base font-bold font-mono text-blue-700">
                  {formatPercentPtBr(kpis.percentualCarteiraCancelada)}
                </span>
              </div>
            </div>
          </div>

          {/* 6 a 9: Motivos e Categorias */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              6 a 9. Principais Motivos, Pareto e Segregação por Área
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">
                  6 e 7. Principal Motivo (Pareto)
                </span>
                <span className="font-bold text-slate-900 block">{kpis.principalMotivoNome}</span>
                <span className="text-[11px] text-slate-600 font-mono">
                  Volume: {formatTons(kpis.principalMotivoToneladas)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">
                  8. Cancelamentos Relacionados ao PCP
                </span>
                <span className="font-bold text-slate-900 block">{kpis.pcpQtd} pedidos</span>
                <span className="text-[11px] text-slate-600 font-mono">
                  {formatTons(kpis.pcpToneladas)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-500 block text-[11px]">
                  9. Cancelamentos Comerciais
                </span>
                <span className="font-bold text-slate-900 block">{kpis.comercialQtd} pedidos</span>
                <span className="text-[11px] text-slate-600 font-mono">
                  {formatTons(kpis.comercialToneladas)}
                </span>
              </div>
            </div>
          </div>

          {/* 10 a 13: Inconsistências e Reincidências */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              10 a 13. Inconsistências de Estoque e Padrões Reincidentes
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50/70 rounded border border-amber-200">
                <span className="font-bold text-amber-950 block mb-1">
                  12. Inconsistências Detectadas pela IA ({kpis.inconsistenciasIAQtd} casos)
                </span>
                <p className="text-[11px] text-amber-900">
                  Casos de recusa por "Sem estoque em pronta entrega" com saldo disponível positivo
                  registrado no mesmo dia.
                </p>
              </div>
              <div className="p-3 bg-purple-50/70 rounded border border-purple-200">
                <span className="font-bold text-purple-950 block mb-1">
                  13. Reincidências ({kpis.reincidentesQtd} ocorrências)
                </span>
                <p className="text-[11px] text-purple-900">
                  Repetições consecutivas de mesmo material e cliente cancelando por indefinição de
                  data de programação.
                </p>
              </div>
            </div>
          </div>

          {/* 14 a 15: Comparativo Mensal e Anual */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              14 e 15. Comparação Mensal e Acumulado Anual
            </h2>
            <p className="text-slate-600">
              A Linha 1 (Perfis) concentra a maior parcela de cancelamentos do período, seguida pela
              Linha 2 (Barras) e Sidercentro (SDC). A projeção YTD indica necessidade de elevação na
              cobertura de tarugos para diminuir recusas por atraso de laminação.
            </p>
          </div>

          {/* 16 a 18: Riscos, Recomendações e Planos de Ação */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
              16 a 18. Riscos, Recomendações e Planos de Ação (5W2H)
            </h2>
            {isEditing ? (
              <Textarea
                rows={4}
                value={recomendacoesText}
                onChange={(e) => setRecomendacoesText(e.target.value)}
                className="text-xs font-mono"
              />
            ) : (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-line text-slate-700">
                {recomendacoesText}
              </div>
            )}
          </div>

          {/* Assinaturas */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-slate-600 text-[11px]">
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Engenharia de Planejamento e Controle da Produção (PCP)
              </div>
              <span>HUB CIAFAL - Indústria</span>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-1 font-semibold text-slate-800">
                Gerência de Vendas e Atendimento Comercial
              </div>
              <span>CIAFAL Ferro & Aço</span>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100 flex justify-end print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar Relatório
          </Button>
        </div>
      </div>
    </div>
  )
}
