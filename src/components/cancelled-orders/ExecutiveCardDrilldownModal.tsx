/**
 * Modal Analítico Executivo para Cards Clicáveis do Topo (Requisito 3)
 * Abre popup grande e responsivo ocupando boa parte da área útil
 */

import React from 'react'
import { X, Sparkles, AlertCircle, FileSpreadsheet, Scale, DollarSign } from 'lucide-react'
import { CancelledOrderRecord, CancellationExecutiveKPIs } from '@/types/cancelled-orders'
import { formatTons } from '@/lib/formatters-ptbr'
import { Button } from '@/components/ui/button'

interface ExecutiveDrilldownModalProps {
  cardKey: string | null
  cardTitle: string | null
  isOpen: boolean
  onClose: () => void
  orders: CancelledOrderRecord[]
  kpis: CancellationExecutiveKPIs
  onSelectOrder: (order: CancelledOrderRecord) => void
}

export const ExecutiveCardDrilldownModal: React.FC<ExecutiveDrilldownModalProps> = ({
  cardKey,
  cardTitle,
  isOpen,
  onClose,
  orders,
  kpis,
  onSelectOrder,
}) => {
  if (!isOpen || !cardKey) return null

  // Filtra ordens de acordo com o card clicado
  let filtered = [...orders]
  let description = ''

  if (cardKey === 'pedidos_cancelados') {
    description = 'Listagem completa de todos os pedidos e itens cancelados no período.'
  } else if (cardKey === 'volume_cancelado') {
    description = 'Pedidos com maior tonelagem física cancelada, ordenados pelo saldo.'
    filtered.sort((a, b) => b.saldo_cancelado_t - a.saldo_cancelado_t)
  } else if (cardKey === 'valor_cancelado') {
    description = 'Pedidos de maior impacto financeiro em reais (R$), ordenados pelo valor total.'
    filtered.sort((a, b) => b.valor_cancelado_brl - a.valor_cancelado_brl)
  } else if (cardKey === 'percentual_carteira') {
    description = `Cancelamentos representam ${kpis.percentualCarteiraCancelada.toFixed(
      1,
    )}% da carteira total prevista para o período.`
  } else if (cardKey === 'cancelamentos_pcp') {
    description =
      'Pedidos cancelados com motivo associado a estoque, data de laminação, programação ou falta de MP.'
    filtered = filtered.filter((o) => o.categoria_motivo === 'PCP/Planejamento')
  } else if (cardKey === 'cancelamentos_comerciais') {
    description =
      'Pedidos cancelados por motivo comercial (preço, condição de pagamento, prazo ou concorrência).'
    filtered = filtered.filter((o) => o.categoria_motivo === 'Comercial')
  } else if (cardKey === 'principal_motivo') {
    description = `Detalhamento das ordens associadas ao principal motivo do período: "${kpis.principalMotivoNome}".`
    filtered = filtered.filter((o) => o.motivo_original_sap === kpis.principalMotivoNome)
  } else if (cardKey === 'cancelamentos_reincidentes') {
    description = 'Casos com recorrência identificada (repetição de cliente, material e motivo).'
    filtered = filtered.filter((o) => o.ai_analysis_payload?.recurringPatternDetected)
  } else if (cardKey === 'inconsistencia_ia') {
    description =
      'Cancelamentos onde os dados históricos (estoque, produção, reservas) contradizem o motivo informado no SAP.'
    filtered = filtered.filter((o) => o.has_ai_inconsistency)
  } else if (cardKey === 'potencialmente_evitaveis') {
    description =
      'Casos classificados pela IA como potencialmente evitáveis através de melhor gestão de estoque ou programação.'
    filtered = filtered.filter((o) => o.ai_avoidable_status === 'Potencialmente evitável')
  }

  const subtotalTons = filtered.reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-indigo-400" />
              Detalhamento Executivo: {cardTitle}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo da Seleção */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
          <div className="text-slate-600">
            Total selecionado:{' '}
            <span className="font-bold text-slate-900">{filtered.length} ordens</span>
          </div>
          <div className="flex items-center space-x-4 font-mono">
            <span className="text-rose-700 font-bold">Volume: {formatTons(subtotalTons)}</span>
          </div>
        </div>

        {/* Tabela Interna */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Ordem / Item</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Centro</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3">Material</th>
                <th className="py-2 px-3 text-right">Saldo (t)</th>
                <th className="py-2 px-3">Motivo SAP</th>
                <th className="py-2 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-indigo-50/40">
                  <td className="py-2 px-3 font-mono font-medium text-slate-900">
                    {o.ordem_venda} / {o.item_ordem}
                  </td>
                  <td className="py-2 px-3 text-slate-600">{o.data_ordem}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{o.centro}</td>
                  <td className="py-2 px-3 max-w-[180px] truncate" title={o.cliente_nome}>
                    {o.cliente_nome}
                  </td>
                  <td
                    className="py-2 px-3 font-mono text-indigo-900 truncate max-w-[160px]"
                    title={o.material_codigo}
                  >
                    {o.material_codigo}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                    {formatTons(o.saldo_cancelado_t)}
                  </td>
                  <td
                    className="py-2 px-3 text-slate-700 truncate max-w-[180px]"
                    title={o.motivo_original_sap}
                  >
                    {o.motivo_original_sap}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onClose()
                        onSelectOrder(o)
                      }}
                      className="h-6 px-2 text-indigo-700 hover:text-indigo-900 text-xs"
                    >
                      Ver Detalhes
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}
