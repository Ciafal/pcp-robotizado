import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CarteiraMinimaItem, CriticidadeCarteiraMinima } from '@/types/carteira-minima'
import { ItemComercialStatus, StatusComunicadoComercial } from '@/types/comercial-comunicado'
import { formatNumberPTBR } from '@/lib/number-format'
import { Eye, History, Send } from 'lucide-react'
import { gerarChaveItem } from '@/services/comercial-comunicado-service'

interface CarteiraMinimaTableProps {
  itens: CarteiraMinimaItem[]
  itensFiltrados: CarteiraMinimaItem[]
  itensSelecionadosIds: string[]
  onToggleSelecionarItem: (id: string) => void
  onToggleSelecionarTodos: (selecionarTodos: boolean) => void
  onVisualizarItem: (item: CarteiraMinimaItem) => void
  onVerHistoricoComercial?: (item: CarteiraMinimaItem) => void
  mapaStatusComercial?: Record<string, ItemComercialStatus>
}

function getCriticidadeBadge(criticidade: CriticidadeCarteiraMinima) {
  switch (criticidade) {
    case 'Crítico':
      return (
        <Badge
          variant="outline"
          className="bg-rose-100 text-rose-800 border-rose-300 font-bold hover:bg-rose-100"
        >
          Crítico
        </Badge>
      )
    case 'Atenção':
      return (
        <Badge
          variant="outline"
          className="bg-amber-100 text-amber-800 border-amber-300 font-bold hover:bg-amber-100"
        >
          Atenção
        </Badge>
      )
    case 'Normal':
      return (
        <Badge
          variant="outline"
          className="bg-blue-100 text-blue-800 border-blue-300 font-bold hover:bg-blue-100"
        >
          Normal
        </Badge>
      )
    default:
      return <Badge variant="outline">{criticidade}</Badge>
  }
}

function getStatusComercialBadge(status?: StatusComunicadoComercial) {
  switch (status) {
    case 'Enviado':
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-300 font-bold cursor-pointer hover:bg-blue-100 transition-colors"
        >
          Enviado
        </Badge>
      )
    case 'Em análise':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-300 font-bold cursor-pointer hover:bg-amber-100 transition-colors"
        >
          Em análise
        </Badge>
      )
    case 'Respondido':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-300 font-bold cursor-pointer hover:bg-emerald-100 transition-colors"
        >
          Respondido
        </Badge>
      )
    case 'Encerrado':
      return (
        <Badge
          variant="outline"
          className="bg-slate-100 text-slate-700 border-slate-300 font-bold cursor-pointer hover:bg-slate-200 transition-colors"
        >
          Encerrado
        </Badge>
      )
    case 'Não enviado':
    default:
      return (
        <Badge
          variant="outline"
          className="bg-slate-50 text-slate-500 border-slate-200 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
        >
          Não enviado
        </Badge>
      )
  }
}

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const clean = dataIso.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

export const CarteiraMinimaTable: React.FC<CarteiraMinimaTableProps> = ({
  itensFiltrados,
  itensSelecionadosIds,
  onToggleSelecionarItem,
  onToggleSelecionarTodos,
  onVisualizarItem,
  onVerHistoricoComercial,
  mapaStatusComercial = {},
}) => {
  const todosSelecionados =
    itensFiltrados.length > 0 &&
    itensFiltrados.every((item) => itensSelecionadosIds.includes(item.id))

  const algumSelecionado =
    itensFiltrados.some((item) => itensSelecionadosIds.includes(item.id)) && !todosSelecionados

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-slate-50 border-b border-slate-200">
              {/* 1. Coluna de Seleção na PRIMEIRA POSIÇÃO */}
              <TableHead className="w-12 text-center px-3 py-3">
                <Checkbox
                  checked={todosSelecionados ? true : algumSelecionado ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onToggleSelecionarTodos(checked === true)}
                  aria-label="Selecionar todos os itens visíveis"
                  className="data-[state=checked]:bg-[#004C97] data-[state=checked]:border-[#004C97]"
                />
              </TableHead>

              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">
                Material
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs min-w-[180px]">
                Texto breve
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs whitespace-nowrap">
                Pedido / Item
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap">
                Carteira (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap">
                Estoque livre (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap bg-amber-50/70">
                Saldo a produzir (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap">
                Carteira mínima (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-center whitespace-nowrap">
                Data desejada
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-center whitespace-nowrap">
                Centro / Linha
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-center whitespace-nowrap">
                Criticidade
              </TableHead>

              {/* Coluna Comercial com Status */}
              <TableHead className="font-bold text-slate-700 text-xs text-center whitespace-nowrap">
                Comercial
              </TableHead>

              <TableHead className="font-bold text-slate-700 text-xs text-right whitespace-nowrap pr-4">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-slate-100">
            {itensFiltrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={13}
                  className="text-center py-10 text-slate-500 text-sm font-medium"
                >
                  Nenhum item encontrado com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              itensFiltrados.map((item) => {
                const isSelected = itensSelecionadosIds.includes(item.id)
                const chave = gerarChaveItem(item)
                const statusComercial = mapaStatusComercial[chave]?.status || 'Não enviado'

                return (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Checkbox na PRIMEIRA coluna */}
                    <TableCell className="text-center px-3 py-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelecionarItem(item.id)}
                        aria-label={`Selecionar item ${item.material}`}
                        className="data-[state=checked]:bg-[#004C97] data-[state=checked]:border-[#004C97]"
                      />
                    </TableCell>

                    <TableCell className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                      {item.material}
                    </TableCell>

                    <TableCell
                      className="text-slate-700 text-xs truncate max-w-[220px]"
                      title={item.descricao_material}
                    >
                      {item.descricao_material}
                    </TableCell>

                    <TableCell className="font-mono text-xs font-semibold text-[#004C97] whitespace-nowrap">
                      {item.pedido_formatado || `${item.pedido_venda} / ${item.item_pedido}`}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-right text-slate-700 whitespace-nowrap">
                      {formatNumberPTBR(item.carteira_tons, 3)} t
                    </TableCell>

                    <TableCell className="font-mono text-xs text-right text-emerald-700 whitespace-nowrap font-medium">
                      {formatNumberPTBR(item.estoque_livre_tons, 3)} t
                    </TableCell>

                    <TableCell className="font-mono text-xs text-right font-bold text-amber-800 bg-amber-50/40 whitespace-nowrap">
                      {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
                    </TableCell>

                    <TableCell className="font-mono text-xs text-right text-slate-700 whitespace-nowrap">
                      {formatNumberPTBR(item.producao_minima_tons, 3)} t
                    </TableCell>

                    <TableCell className="text-xs text-center text-slate-600 whitespace-nowrap">
                      {formatarDataPtBr(item.data_desejada)}
                    </TableCell>

                    <TableCell className="text-xs text-center text-slate-600 whitespace-nowrap">
                      {item.centro} / {item.linha || 'L1'}
                    </TableCell>

                    <TableCell className="text-center whitespace-nowrap">
                      {getCriticidadeBadge(item.criticidade)}
                    </TableCell>

                    {/* Coluna Comercial com Status e clique para abrir histórico */}
                    <TableCell className="text-center whitespace-nowrap">
                      <div
                        onClick={() => onVerHistoricoComercial && onVerHistoricoComercial(item)}
                        className="inline-block"
                        title="Clique para ver o histórico de comunicados ao Comercial"
                      >
                        {getStatusComercialBadge(statusComercial)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {onVerHistoricoComercial && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-[#004C97] hover:bg-blue-50"
                            onClick={() => onVerHistoricoComercial(item)}
                            title="Histórico Comercial"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-[#004C97] hover:bg-blue-50"
                          onClick={() => onVisualizarItem(item)}
                          title="Detalhes do item"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          Mostrando {itensFiltrados.length} de {itensFiltrados.length} registros filtrados
          {itensSelecionadosIds.length > 0 && ` (${itensSelecionadosIds.length} selecionado(s))`}
        </span>
        <span className="text-[11px] text-slate-400">
          Clique no status Comercial para auditar o histórico de envios e respostas
        </span>
      </div>
    </div>
  )
}

export default CarteiraMinimaTable
