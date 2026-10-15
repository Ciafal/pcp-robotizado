/**
 * Modal Analítico Executivo para Cards Clicáveis do Topo (Requisitos 3, 4 e 7)
 * Abre popup responsivo ocupando até 95% da área útil conforme padrão do projeto.
 * Exibe:
 * - Resumo: quantidade de pedidos, volume em t, % do volume total cancelado, valor em R$
 * - Lista detalhada: Pedido, Cliente, Material, Descrição, Quantidade, Unidade, Volume, Data cancelamento, Categoria da recusa, Motivo da recusa, Responsável, Centro/Linha
 * - Análises: Principais motivos (qtd e toneladas), Clientes com maior volume, Materiais mais afetados, Reincidências, Evolução temporal
 */

import React, { useState, useMemo } from 'react'
import {
  X,
  Sparkles,
  Layers,
  BarChart3,
  Users,
  Package,
  Calendar,
  AlertTriangle,
  Repeat,
  Eye,
} from 'lucide-react'
import { CancelledOrderRecord, CancellationExecutiveKPIs } from '@/types/cancelled-orders'
import { formatTonsPtBr, formatCurrencyPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'
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
  const [activeTab, setActiveTab] = useState<
    'lista' | 'motivos' | 'clientes' | 'materiais' | 'reincidencias' | 'evolucao'
  >('lista')

  // Filtra ordens de acordo com o card clicado de forma pura e incondicional
  const { filtered, description } = useMemo(() => {
    if (!cardKey) return { filtered: [], description: '' }
    let list = [...orders]
    let desc = ''

    if (cardKey === 'pedidos_cancelados') {
      desc = 'Listagem completa de todos os pedidos e itens cancelados no período.'
    } else if (cardKey === 'volume_cancelado') {
      desc = 'Pedidos com maior tonelagem física cancelada, ordenados pelo saldo.'
      list.sort((a, b) => b.saldo_cancelado_t - a.saldo_cancelado_t)
    } else if (cardKey === 'percentual_carteira') {
      desc = `Cancelamentos representam ${formatPercentPtBr(kpis.percentualCarteiraCancelada)} da carteira total prevista para o período.`
    } else if (cardKey === 'cancelamentos_pcp') {
      desc =
        'Pedidos cancelados categorizados estritamente como PCP (Falta de estoque, matéria-prima, restrição de laminação, capacidade produtiva).'
      list = list.filter((o) => o.categoria_recusa === 'PCP')
    } else if (cardKey === 'cancelamentos_comerciais') {
      desc =
        'Pedidos cancelados categorizados estritamente como COMERCIAL (Preço não aceito, condição comercial, prazo comercial).'
      list = list.filter((o) => o.categoria_recusa === 'COMERCIAL')
    } else if (cardKey === 'cancelamentos_transporte') {
      desc =
        'Pedidos cancelados categorizados estritamente como TRANSPORTE (Falta de veículo, frete não aprovado, transportadora indisponível, restrição de entrega).'
      list = list.filter((o) => o.categoria_recusa === 'TRANSPORTE')
    } else if (cardKey === 'principal_motivo') {
      desc = `Detalhamento das ordens associadas ao principal motivo estruturado: "${kpis.principalMotivoNome}".`
      list = list.filter(
        (o) =>
          o.motivo_recusa === kpis.principalMotivoNome ||
          o.motivo_original_sap === kpis.principalMotivoNome,
      )
    } else if (cardKey === 'cancelamentos_reincidentes') {
      desc = 'Casos com recorrência identificada (repetição de cliente, material e motivo).'
      list = list.filter((o) => o.ai_analysis_payload?.recurringPatternDetected)
    } else if (cardKey === 'inconsistencia_ia') {
      desc = 'Cancelamentos onde os dados históricos contradizem o motivo informado no SAP.'
      list = list.filter((o) => o.has_ai_inconsistency)
    } else if (cardKey === 'potencialmente_evitaveis') {
      desc =
        'Casos classificados pela IA como potencialmente evitáveis através de melhor gestão de estoque ou programação.'
      list = list.filter((o) => o.ai_avoidable_status === 'Potencialmente evitável')
    }

    return { filtered: list, description: desc }
  }, [cardKey, orders, kpis.percentualCarteiraCancelada, kpis.principalMotivoNome])

  const totalPedidos = filtered.length
  const subtotalTons = filtered.reduce((acc, o) => acc + (o.saldo_cancelado_t || 0), 0)
  const totalVolumeGeral = kpis.totalVolumeToneladas || 1
  const percentualVolume = (subtotalTons / totalVolumeGeral) * 100
  const subtotalValorBrl = filtered.reduce((acc, o) => acc + (o.valor_cancelado_brl || 0), 0)

  // Análise 1: Principais Motivos (quantidade e toneladas)
  const motivosAnalysis = useMemo(() => {
    const map: Record<string, { motivo: string; categoria: string; count: number; tons: number }> =
      {}
    filtered.forEach((o) => {
      const mot = o.motivo_recusa || o.motivo_original_sap || 'Sem motivo'
      const cat = o.categoria_recusa || 'Sem categorização'
      if (!map[mot]) {
        map[mot] = { motivo: mot, categoria: cat, count: 0, tons: 0 }
      }
      map[mot].count += 1
      map[mot].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => b.tons - a.tons)
  }, [filtered])

  // Análise 2: Clientes com maior volume cancelado
  const clientesAnalysis = useMemo(() => {
    const map: Record<string, { cliente: string; codigo: string; count: number; tons: number }> = {}
    filtered.forEach((o) => {
      const cli = o.cliente_nome || 'Cliente não identificado'
      if (!map[cli]) {
        map[cli] = { cliente: cli, codigo: o.cliente_codigo || '', count: 0, tons: 0 }
      }
      map[cli].count += 1
      map[cli].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => b.tons - a.tons)
  }, [filtered])

  // Análise 3: Materiais mais afetados
  const materiaisAnalysis = useMemo(() => {
    const map: Record<
      string,
      { material: string; descricao: string; count: number; tons: number }
    > = {}
    filtered.forEach((o) => {
      const mat = o.material_codigo || 'Sem código'
      if (!map[mat]) {
        map[mat] = { material: mat, descricao: o.material_descricao || '', count: 0, tons: 0 }
      }
      map[mat].count += 1
      map[mat].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => b.tons - a.tons)
  }, [filtered])

  // Análise 4: Reincidências
  const reincidenciasAnalysis = useMemo(() => {
    return filtered.filter((o) => o.ai_analysis_payload?.recurringPatternDetected)
  }, [filtered])

  // Análise 5: Evolução Temporal por data do cancelamento
  const evolucaoTemporal = useMemo(() => {
    const map: Record<string, { data: string; count: number; tons: number }> = {}
    filtered.forEach((o) => {
      const d = o.data_ordem || 'Sem data'
      if (!map[d]) {
        map[d] = { data: d, count: 0, tons: 0 }
      }
      map[d].count += 1
      map[d].tons += o.saldo_cancelado_t || 0
    })
    return Object.values(map).sort((a, b) => a.data.localeCompare(b.data))
  }, [filtered])

  if (!isOpen || !cardKey) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      {/* Modal responsivo usando até 95% da área útil (Requisito 7) */}
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-[95vw] max-w-[1720px] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#004C97] rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center">
                Detalhamento Analítico: {cardTitle}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo Obrigatório (Requisito 7): Quantidade, Volume em t, % do total cancelado, Valor em R$ */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs flex-shrink-0">
          <div className="border-r border-slate-200 pr-3">
            <span className="text-slate-500 block text-[11px]">Quantidade de Pedidos</span>
            <span className="text-base font-bold text-slate-900 font-mono">
              {totalPedidos.toLocaleString('pt-BR')} pedido(s)
            </span>
          </div>
          <div className="border-r border-slate-200 pr-3">
            <span className="text-slate-500 block text-[11px]">Volume Cancelado</span>
            <span className="text-base font-bold text-rose-700 font-mono">
              {formatTonsPtBr(subtotalTons)}
            </span>
          </div>
          <div className="border-r border-slate-200 pr-3">
            <span className="text-slate-500 block text-[11px]">% do Volume Total Cancelado</span>
            <span className="text-base font-bold text-blue-700 font-mono">
              {formatPercentPtBr(percentualVolume)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Valor da Carteira Cancelada</span>
            <span className="text-base font-bold text-emerald-700 font-mono">
              {formatCurrencyPtBr(subtotalValorBrl)}
            </span>
          </div>
        </div>

        {/* Abas Internas de Navegação (Requisito 7) */}
        <div className="flex border-b border-slate-200 bg-white px-6 space-x-1 flex-shrink-0 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('lista')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'lista'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lista Detalhada ({totalPedidos})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('motivos')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'motivos'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Principais Motivos ({motivosAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('clientes')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'clientes'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Maiores Clientes ({clientesAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('materiais')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'materiais'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Materiais Afetados ({materiaisAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reincidencias')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'reincidencias'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Reincidências ({reincidenciasAnalysis.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evolucao')}
            className={`py-2.5 px-3 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
              activeTab === 'evolucao'
                ? 'border-[#004C97] text-[#004C97] bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Evolução Temporal</span>
          </button>
        </div>

        {/* Corpo com Rolagem Interna */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40">
          {/* ABA 1: LISTA DETALHADA COM COLUNAS MÍNIMAS DO REQUISITO 7 */}
          {activeTab === 'lista' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] sticky top-0 z-10 border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Pedido</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Material</th>
                    <th className="py-2.5 px-3">Descrição</th>
                    <th className="py-2.5 px-3 text-right">Quantidade</th>
                    <th className="py-2.5 px-3 text-center">Unidade</th>
                    <th className="py-2.5 px-3 text-right">Volume</th>
                    <th className="py-2.5 px-3">Data Cancelamento</th>
                    <th className="py-2.5 px-3">Categoria da Recusa</th>
                    <th className="py-2.5 px-3">Motivo da Recusa</th>
                    <th className="py-2.5 px-3">Responsável</th>
                    <th className="py-2.5 px-3 text-center">Centro / Linha</th>
                    <th className="py-2.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-10 text-center text-slate-500">
                        Nenhum pedido correspondente ao critério selecionado.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((o) => {
                      const catBadge =
                        o.categoria_recusa === 'COMERCIAL'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : o.categoria_recusa === 'PCP'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : o.categoria_recusa === 'TRANSPORTE'
                              ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'

                      return (
                        <tr key={o.id} className="hover:bg-blue-50/40">
                          {/* 1. Pedido */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {o.ordem_venda} / {o.item_ordem}
                          </td>

                          {/* 2. Cliente */}
                          <td className="py-2 px-3 max-w-[180px] truncate" title={o.cliente_nome}>
                            <div className="font-semibold text-slate-900 truncate">
                              {o.cliente_nome}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {o.cliente_codigo || '-'}
                            </div>
                          </td>

                          {/* 3. Material */}
                          <td className="py-2 px-3 font-mono font-bold text-[#004C97] whitespace-nowrap">
                            {o.material_codigo}
                          </td>

                          {/* 4. Descrição */}
                          <td
                            className="py-2 px-3 max-w-[200px] truncate text-slate-700"
                            title={o.material_descricao}
                          >
                            {o.material_descricao || '-'}
                          </td>

                          {/* 5. Quantidade */}
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                            {formatTonsPtBr(o.quantidade_original_ov_t)}
                          </td>

                          {/* 6. Unidade */}
                          <td className="py-2 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                            {o.unidade_medida || 'TO'}
                          </td>

                          {/* 7. Volume */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            {formatTonsPtBr(o.saldo_cancelado_t)}
                          </td>

                          {/* 8. Data do cancelamento */}
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono">
                            {o.data_ordem || '-'}
                          </td>

                          {/* 9. Categoria da recusa */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${catBadge}`}
                            >
                              {o.categoria_recusa || 'Sem categorização'}
                            </span>
                          </td>

                          {/* 10. Motivo da recusa */}
                          <td
                            className="py-2 px-3 max-w-[200px] truncate text-slate-800 font-medium"
                            title={o.motivo_recusa || o.motivo_original_sap}
                          >
                            {o.motivo_recusa || o.motivo_original_sap || 'Sem motivo'}
                          </td>

                          {/* 11. Responsável */}
                          <td className="py-2 px-3 whitespace-nowrap text-slate-700 text-[11px]">
                            {o.validated_responsibility ||
                              o.ai_suggested_responsibility ||
                              o.representante_vendedor ||
                              'PCP'}
                          </td>

                          {/* 12. Centro / Linha */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {o.centro}
                            </span>
                            {o.linha && (
                              <span className="text-[10px] text-slate-500 block">{o.linha}</span>
                            )}
                          </td>

                          {/* 13. Ação */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onClose()
                                onSelectOrder(o)
                              }}
                              className="h-7 px-2 text-[#004C97] hover:text-[#003d7a] text-xs"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver Detalhes
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 2: PRINCIPAIS MOTIVOS (QUANTIDADE E TONELADAS) */}
          {activeTab === 'motivos' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-[#004C97]" />
                Distribuição dos Principais Motivos da Recusa
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Motivo da Recusa</th>
                    <th className="py-2.5 px-3">Categoria Relacionada</th>
                    <th className="py-2.5 px-3 text-right">Qtd Pedidos</th>
                    <th className="py-2.5 px-3 text-right">Volume Cancelado (t)</th>
                    <th className="py-2.5 px-3 text-right">% do Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {motivosAnalysis.map((m, idx) => {
                    const pct = subtotalTons > 0 ? (m.tons / subtotalTons) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.motivo}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {m.categoria}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {m.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatTonsPtBr(m.tons)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatPercentPtBr(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 3: MAIORES CLIENTES */}
          {activeTab === 'clientes' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2 text-[#004C97]" />
                Clientes com Maior Volume Cancelado
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Código SAP</th>
                    <th className="py-2.5 px-3 text-right">Qtd Pedidos</th>
                    <th className="py-2.5 px-3 text-right">Volume Cancelado (t)</th>
                    <th className="py-2.5 px-3 text-right">% do Volume Selecionado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clientesAnalysis.map((c, idx) => {
                    const pct = subtotalTons > 0 ? (c.tons / subtotalTons) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-900">{c.cliente}</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{c.codigo || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {c.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatTonsPtBr(c.tons)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatPercentPtBr(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 4: MATERIAIS MAIS AFETADOS */}
          {activeTab === 'materiais' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Package className="w-4 h-4 mr-2 text-[#004C97]" />
                Materiais Mais Afetados pelos Cancelamentos
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Código do Material</th>
                    <th className="py-2.5 px-3">Descrição do Produto</th>
                    <th className="py-2.5 px-3 text-right">Ocorrências</th>
                    <th className="py-2.5 px-3 text-right">Volume Total (t)</th>
                    <th className="py-2.5 px-3 text-right">% do Volume Selecionado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materiaisAnalysis.map((mat, idx) => {
                    const pct = subtotalTons > 0 ? (mat.tons / subtotalTons) * 100 : 0
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-[#004C97]">
                          {mat.material}
                        </td>
                        <td className="py-2 px-3 text-slate-800">{mat.descricao || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {mat.count}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatTonsPtBr(mat.tons)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatPercentPtBr(pct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 5: REINCIDÊNCIAS */}
          {activeTab === 'reincidencias' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Repeat className="w-4 h-4 mr-2 text-purple-700" />
                Casos com Padrão Reincidente Identificado
              </h4>
              {reincidenciasAnalysis.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  Nenhuma reincidência identificada na seleção atual.
                </div>
              ) : (
                <div className="space-y-3">
                  {reincidenciasAnalysis.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 rounded-lg border border-purple-200 bg-purple-50/40 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-purple-950 font-mono">
                          OV {o.ordem_venda} / {o.item_ordem} — {o.cliente_nome}
                        </span>
                        <span className="font-mono font-bold text-rose-700">
                          {formatTonsPtBr(o.saldo_cancelado_t)}
                        </span>
                      </div>
                      <p className="text-purple-900">
                        {o.ai_analysis_payload?.recurringReason ||
                          'Padrão recorrente de cancelamento identificado pelo histórico.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA 6: EVOLUÇÃO TEMPORAL */}
          {activeTab === 'evolucao' && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-[#004C97]" />
                Evolução Temporal dos Cancelamentos
              </h4>
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Data da Ordem / Cancelamento</th>
                    <th className="py-2.5 px-3 text-right">Quantidade de Casos</th>
                    <th className="py-2.5 px-3 text-right">Volume (t)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {evolucaoTemporal.map((ev, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        {ev.data}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {ev.count}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {formatTonsPtBr(ev.tons)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100 flex items-center justify-between flex-shrink-0 text-xs">
          <span className="text-slate-500">
            PCP Robotizado CIAFAL • Dados auditáveis reconciliáveis com a carteira oficial
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar Janela
          </Button>
        </div>
      </div>
    </div>
  )
}
