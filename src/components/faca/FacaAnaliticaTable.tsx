import React, { useState } from 'react'
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
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react'
import { FacaItemAnalitico } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaAnaliticaTableProps {
  itens: FacaItemAnalitico[]
  onOpenDetalheMaterial: (item: FacaItemAnalitico) => void
}

type SortField =
  | 'codigo_material'
  | 'cliente'
  | 'carteira_aberta_t'
  | 'estoque_livre_pa_t'
  | 'saldo_a_produzir_t'
  | 'mp_necessaria_t'
  | 'valor_faturamento_previsto_brl'

export const FacaAnaliticaTable: React.FC<FacaAnaliticaTableProps> = ({
  itens,
  onOpenDetalheMaterial,
}) => {
  const [sortField, setSortField] = useState<SortField>('carteira_aberta_t')
  const [sortAsc, setSortAsc] = useState<boolean>(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const itensOrdenados = [...itens].sort((a, b) => {
    const factor = sortAsc ? 1 : -1
    if (sortField === 'codigo_material') {
      return a.codigo_material.localeCompare(b.codigo_material) * factor
    }
    if (sortField === 'cliente') {
      return a.cliente.localeCompare(b.cliente) * factor
    }
    return ((a[sortField] || 0) - (b[sortField] || 0)) * factor
  })

  const getStatusBadge = (status: FacaItemAnalitico['status_atendimento']) => {
    switch (status) {
      case 'ATENDIDO_ESTOQUE':
        return (
          <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3" /> Atendido de Estoque
          </Badge>
        )
      case 'PARCIALMENTE_COBERTO':
        return (
          <Badge className="bg-blue-600 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <AlertCircle className="w-3 h-3" /> Parcialmente Coberto
          </Badge>
        )
      case 'NECESSITA_PRODUCAO':
        return (
          <Badge className="bg-amber-600 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <Layers className="w-3 h-3" /> Necessita Produção
          </Badge>
        )
      case 'MP_INSUFICIENTE':
        return (
          <Badge className="bg-rose-600 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" /> MP Insuficiente
          </Badge>
        )
      case 'LOTE_MINIMO_PENDENTE':
        return (
          <Badge className="bg-purple-600 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" /> Lote Mínimo Pendente
          </Badge>
        )
      case 'SEM_PEDIDO_ESTOQUE_LIVRE':
        return (
          <Badge className="bg-slate-700 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <AlertCircle className="w-3 h-3" /> Estoque Sem Pedido
          </Badge>
        )
      case 'PEDIDO_CANCELADO':
        return (
          <Badge className="bg-rose-800 text-white text-[10px] gap-1 font-semibold whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" /> Pedido Cancelado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPrevisaoBadge = (prev: FacaItemAnalitico['previsao_faturamento']) => {
    switch (prev) {
      case 'FATURAMENTO_CONFIRMADO':
        return (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            Confirmado
          </span>
        )
      case 'POTENCIAL_FATURAMENTO':
        return (
          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
            Potencial
          </span>
        )
      case 'AGUARDANDO_PRODUCAO':
        return (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            Aguardando Prod.
          </span>
        )
      case 'FATURAMENTO_IMPEDIDO':
        return (
          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
            Impedido
          </span>
        )
      default:
        return <span className="text-[10px] text-slate-400">N/A</span>
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            Tabela Analítica Oficial de Materiais FACA
          </span>
          <Badge
            variant="outline"
            className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-bold"
          >
            {itens.length} itens listados
          </Badge>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Clique na linha ou no ícone para abrir detalhamento 360° do material
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <Table className="text-xs">
          <TableHeader className="bg-slate-100/80 sticky top-0 z-10 shadow-xs">
            <TableRow className="border-b border-slate-200">
              <TableHead className="font-bold text-slate-700 w-10 text-center">Ações</TableHead>
              <TableHead
                className="font-bold text-slate-700 cursor-pointer whitespace-nowrap"
                onClick={() => handleSort('codigo_material')}
              >
                1. Material {sortField === 'codigo_material' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead className="font-bold text-slate-700 min-w-[180px]">2. Descrição</TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                3. Grupo FACA
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                4. Bitola
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap">
                5. Tipo Aço
              </TableHead>
              <TableHead
                className="font-bold text-slate-700 cursor-pointer min-w-[160px]"
                onClick={() => handleSort('cliente')}
              >
                6. Cliente {sortField === 'cliente' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap text-center">
                7. Pedido SAP
              </TableHead>
              <TableHead className="font-bold text-slate-700 whitespace-nowrap text-center">
                8. Dt Entrega
              </TableHead>
              <TableHead
                className="font-bold text-slate-700 text-right cursor-pointer whitespace-nowrap"
                onClick={() => handleSort('carteira_aberta_t')}
              >
                9. Carteira (t) {sortField === 'carteira_aberta_t' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead
                className="font-bold text-slate-700 text-right cursor-pointer whitespace-nowrap text-emerald-800"
                onClick={() => handleSort('estoque_livre_pa_t')}
              >
                10. Estoque PA (t) {sortField === 'estoque_livre_pa_t' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                11. Semi (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                12. CQ (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                13. Bloq (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                14. Comp (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap text-blue-800">
                15. Saldo Disp (t)
              </TableHead>
              <TableHead
                className="font-bold text-slate-700 text-right cursor-pointer whitespace-nowrap text-amber-800"
                onClick={() => handleSort('saldo_a_produzir_t')}
              >
                16. A Produzir (t) {sortField === 'saldo_a_produzir_t' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                17. Prog (t)
              </TableHead>
              <TableHead className="font-bold text-slate-700 min-w-[180px]">
                18. MP Vinculada
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap text-indigo-800">
                19. MP Disp (t)
              </TableHead>
              <TableHead
                className="font-bold text-slate-700 text-right cursor-pointer whitespace-nowrap text-purple-800"
                onClick={() => handleSort('mp_necessaria_t')}
              >
                20. MP Nec (t) {sortField === 'mp_necessaria_t' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-right whitespace-nowrap">
                21. Lote Mín (t)
              </TableHead>
              <TableHead
                className="font-bold text-slate-700 text-right cursor-pointer whitespace-nowrap"
                onClick={() => handleSort('valor_faturamento_previsto_brl')}
              >
                22. Faturamento R${' '}
                {sortField === 'valor_faturamento_previsto_brl' && (sortAsc ? '↑' : '↓')}
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-center whitespace-nowrap">
                23. Previsão
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-center whitespace-nowrap">
                24. Status
              </TableHead>
              <TableHead className="font-bold text-slate-700 min-w-[240px]">
                25. Diagnóstico IA
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensOrdenados.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => onOpenDetalheMaterial(item)}
                className="hover:bg-blue-50/40 cursor-pointer transition-colors border-b border-slate-100"
              >
                <TableCell
                  className="text-center p-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenDetalheMaterial(item)
                  }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-500 hover:text-[#004C97] hover:bg-blue-100"
                    title="Ver detalhamento completo"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
                <TableCell className="font-mono font-bold text-[#004C97] whitespace-nowrap">
                  {item.codigo_material}
                </TableCell>
                <TableCell className="text-slate-700 truncate max-w-[220px]" title={item.descricao}>
                  {item.descricao}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600 font-medium">
                  {item.grupo_faca}
                </TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">{item.bitola}</TableCell>
                <TableCell className="whitespace-nowrap text-slate-700 font-semibold">
                  {item.tipo_aco}
                </TableCell>
                <TableCell
                  className="text-slate-800 font-medium truncate max-w-[180px]"
                  title={item.cliente}
                >
                  {item.cliente}
                </TableCell>
                <TableCell className="text-center font-mono text-slate-700">
                  {item.pedido_sap}
                </TableCell>
                <TableCell className="text-center text-slate-600 whitespace-nowrap">
                  {item.data_prevista_entrega}
                </TableCell>
                <TableCell className="text-right font-extrabold text-slate-900 whitespace-nowrap">
                  {formatNumberPtBr(item.carteira_aberta_t, 1)}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-700 whitespace-nowrap">
                  {formatNumberPtBr(item.estoque_livre_pa_t, 1)}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {formatNumberPtBr(item.estoque_semiacabado_t, 1)}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {formatNumberPtBr(item.estoque_qualidade_t, 1)}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {formatNumberPtBr(item.estoque_bloqueado_t, 1)}
                </TableCell>
                <TableCell className="text-right text-slate-500">
                  {formatNumberPtBr(item.estoque_comprometido_t, 1)}
                </TableCell>
                <TableCell className="text-right font-semibold text-blue-700 whitespace-nowrap">
                  {formatNumberPtBr(item.saldo_disponivel_atendimento_t, 1)}
                </TableCell>
                <TableCell className="text-right font-extrabold text-amber-700 whitespace-nowrap">
                  {formatNumberPtBr(item.saldo_a_produzir_t, 1)}
                </TableCell>
                <TableCell className="text-right text-slate-600 font-medium whitespace-nowrap">
                  {formatNumberPtBr(item.quantidade_programada_t, 1)}
                </TableCell>
                <TableCell
                  className="text-slate-600 truncate max-w-[200px]"
                  title={item.materia_prima_vinculada}
                >
                  {item.materia_prima_vinculada}
                </TableCell>
                <TableCell className="text-right font-bold text-indigo-700 whitespace-nowrap">
                  {formatNumberPtBr(item.mp_disponivel_t, 1)}
                </TableCell>
                <TableCell className="text-right font-extrabold text-purple-700 whitespace-nowrap">
                  {formatNumberPtBr(item.mp_necessaria_t, 1)}
                </TableCell>
                <TableCell className="text-right text-slate-600 whitespace-nowrap font-medium">
                  {formatNumberPtBr(item.carteira_minima_lam_t, 1)}
                </TableCell>
                <TableCell className="text-right font-bold text-slate-800 whitespace-nowrap">
                  R${' '}
                  {item.valor_faturamento_previsto_brl.toLocaleString('pt-BR', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </TableCell>
                <TableCell className="text-center whitespace-nowrap">
                  {getPrevisaoBadge(item.previsao_faturamento)}
                </TableCell>
                <TableCell className="text-center whitespace-nowrap">
                  {getStatusBadge(item.status_atendimento)}
                </TableCell>
                <TableCell className="text-slate-600 text-[11px] leading-snug">
                  <div className="flex items-start gap-1">
                    <Sparkles className="w-3 h-3 text-[#004C97] shrink-0 mt-0.5" />
                    <span>{item.observacoes_ia}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
