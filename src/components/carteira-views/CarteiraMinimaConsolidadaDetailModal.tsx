import React, { useState } from 'react'
import {
  X,
  Package,
  Layers,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CarteiraConsolidadaRow,
  MaterialConsolidadoItem,
} from '@/types/carteira-minima-consolidada'
import { formatNumberPTBR } from '@/lib/number-format'

interface CarteiraMinimaConsolidadaDetailModalProps {
  isOpen: boolean
  onClose: () => void
  row: CarteiraConsolidadaRow | null
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const parts = dataIso.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

export const CarteiraMinimaConsolidadaDetailModal: React.FC<
  CarteiraMinimaConsolidadaDetailModalProps
> = ({ isOpen, onClose, row }) => {
  const [busca, setBusca] = useState('')

  if (!isOpen || !row) return null

  const rotuloChave = row.tipo === 'BITOLA' ? 'Bitola' : 'Família'

  const materiaisFiltrados = row.materiais.filter((m) => {
    if (!busca.trim()) return true
    const q = busca.toLowerCase()
    return (
      m.material.toLowerCase().includes(q) ||
      m.descricao_material.toLowerCase().includes(q) ||
      m.pedido_venda.toLowerCase().includes(q) ||
      (m.cliente && m.cliente.toLowerCase().includes(q)) ||
      m.tipo_aco.toLowerCase().includes(q)
    )
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* CABEÇALHO PADRÃO CIAFAL */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold tracking-wider text-[#004C97] uppercase">
                Detalhamento Consolidado &bull; {rotuloChave}
              </span>
              <Badge
                variant="outline"
                className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-xs font-bold"
              >
                {row.chave}
              </Badge>
              <Badge variant="outline" className="text-slate-600 bg-white border-slate-300 text-xs">
                Linha/Centro: {row.linha_centro}
              </Badge>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Itens da {rotuloChave}: {row.chave}
            </h2>
            <p className="text-xs text-slate-500">
              {row.materiais_count} material(is) e {row.pedidos_count} pedido(s) agrupados &bull;
              Centro {row.centro} (Empresa: {row.empresa})
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CARDS RESUMO DO GRUPO */}
        <div className="p-4 bg-slate-100/60 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Carteira Total do Grupo
            </span>
            <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
              {formatNumberPTBR(row.carteira_total_tons, 3)} t
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Estoque Livre Disponível
            </span>
            <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">
              {formatNumberPTBR(row.estoque_livre_total_tons, 3)} t
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Saldo a Produzir
            </span>
            <span className="text-base font-bold font-mono text-amber-700 mt-0.5 block">
              {formatNumberPTBR(row.saldo_total_produzir_tons, 3)} t
            </span>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
              Produção Mínima Exigida
            </span>
            <span className="text-base font-bold font-mono text-slate-800 mt-0.5 block">
              {row.producao_minima_tons !== null
                ? `${formatNumberPTBR(row.producao_minima_tons, 3)} t`
                : row.situacao}
            </span>
          </div>
        </div>

        {/* BARRA DE BUSCA INTERNA */}
        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Filtrar por material, pedido, aço ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="text-xs h-8 pl-8"
            />
          </div>
          <span className="text-xs text-slate-500">
            Exibindo <strong>{materiaisFiltrados.length}</strong> de {row.materiais.length} item(ns)
          </span>
        </div>

        {/* TABELA DE MATERIAIS DO GRUPO */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-3 whitespace-nowrap">Código Material</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Descrição Técnica</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Família / Aço</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Pedido / Cliente</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Carteira (t)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Estoque livre (t)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Saldo (t)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Mínimo (t)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Diferença (t)</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Data Desejada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {materiaisFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      Nenhum material encontrado para o filtro digitado.
                    </td>
                  </tr>
                ) : (
                  materiaisFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      {/* Material */}
                      <td className="py-2 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.material}
                      </td>

                      {/* Descrição */}
                      <td className="py-2 px-3 font-medium text-slate-700">
                        {item.descricao_material}
                      </td>

                      {/* Família e Tipo de Aço */}
                      <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                        <span className="font-semibold text-slate-800 block text-[11px]">
                          {item.familia}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.tipo_aco} &bull; {item.bitola}
                        </span>
                      </td>

                      {/* Pedido e Cliente */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#004C97] block text-[11px]">
                          {item.pedido_formatado}
                        </span>
                        <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                          {item.cliente || 'Comercial'}
                        </span>
                      </td>

                      {/* Carteira */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        {formatNumberPTBR(item.carteira_tons, 3)} t
                      </td>

                      {/* Estoque */}
                      <td className="py-2 px-3 text-right font-mono text-emerald-700 whitespace-nowrap font-medium">
                        {formatNumberPTBR(item.estoque_livre_tons, 3)} t
                      </td>

                      {/* Saldo a produzir */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                        {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
                      </td>

                      {/* Mínimo */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        {item.producao_minima_tons !== null
                          ? `${formatNumberPTBR(item.producao_minima_tons, 3)} t`
                          : 'Não recebido'}
                      </td>

                      {/* Diferença */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        {item.diferenca_minimo_tons !== null ? (
                          <span
                            className={`font-semibold ${
                              item.diferenca_minimo_tons > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {item.diferenca_minimo_tons > 0 ? '-' : '+'}
                            {formatNumberPTBR(Math.abs(item.diferenca_minimo_tons), 3)} t
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Data desejada */}
                      <td className="py-2 px-3 text-center font-mono whitespace-nowrap text-slate-600">
                        {formatarDataPtBr(item.data_desejada)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Origem: <strong>SAP ECC via RFC Z_RFC_CARTEIRA_MINIMA_PROD</strong> &bull; Lote mínimo
            oficial por código
          </span>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onClose}
            className="text-xs bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            Fechar detalhamento
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CarteiraMinimaConsolidadaDetailModal
