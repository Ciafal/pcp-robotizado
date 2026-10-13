import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Briefcase,
  Boxes,
  Factory,
  Layers,
  FileCheck2,
  DollarSign,
  AlertTriangle,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { FacaCardKpis, FacaItemAnalitico, FacaAlertaIA } from '@/types/faca-analise'
import { formatNumberPtBr } from '@/lib/number-format'

interface FacaCardDrilldownModalProps {
  cardKey: string | null
  isOpen: boolean
  onClose: () => void
  kpis: FacaCardKpis
  itens: FacaItemAnalitico[]
  alertas: FacaAlertaIA[]
}

export const FacaCardDrilldownModal: React.FC<FacaCardDrilldownModalProps> = ({
  cardKey,
  isOpen,
  onClose,
  kpis,
  itens,
  alertas,
}) => {
  if (!cardKey) return null

  const getDetalhes = () => {
    switch (cardKey) {
      case 'carteira_total':
        return {
          titulo: 'Carteira Total FACA — Detalhamento Analítico',
          icone: Briefcase,
          corIcone: 'text-[#004C97]',
          kpiValor: `${formatNumberPtBr(kpis.carteira_total_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.carteira_aberta_t > 0),
          diagnosticoIA:
            'A carteira aberta concentra-se principalmente em perfis para colhedoras de cana e lâminas picadoras industriais. 53% do volume total já possui ordens de produção ou estoque livre para faturamento imediato.',
        }
      case 'estoque_disponivel':
        return {
          titulo: 'Estoque Disponível de PA — Detalhamento de Cobertura',
          icone: Boxes,
          corIcone: 'text-emerald-700',
          kpiValor: `${formatNumberPtBr(kpis.estoque_disponivel_pa_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.estoque_livre_pa_t > 0),
          diagnosticoIA:
            'O estoque livre de produto acabado permite faturamento à pronta entrega no Centro 1100. Há 18,2 t sem pedido vinculado aguardando alocação comercial rápida.',
        }
      case 'necessidade_producao':
        return {
          titulo: 'Necessidade Líquida de Produção FACA',
          icone: Factory,
          corIcone: 'text-amber-700',
          kpiValor: `${formatNumberPtBr(kpis.necessidade_producao_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.saldo_a_produzir_t > 0),
          diagnosticoIA:
            'Necessidade líquida calculada após deduções de estoque livre de PA. Requer priorização de laminação nas linhas L1 e L2 na próxima campanha.',
        }
      case 'mp_disponivel':
        return {
          titulo: 'Matéria-Prima Específica Disponível',
          icone: Layers,
          corIcone: 'text-indigo-700',
          kpiValor: `${formatNumberPtBr(kpis.mp_especifica_disponivel_t, 1)} t`,
          itensFiltrados: itens,
          diagnosticoIA:
            'Estoque de palanquilhas e blocos em depósitos centrais. Cobertura suficiente para SAE 1045 e SAE 1070; atenção necessária para palanquilha 180x180.',
        }
      case 'mp_necessaria':
        return {
          titulo: 'Necessidade Líquida de Matéria-Prima (com Rendimento)',
          icone: FileCheck2,
          corIcone: 'text-purple-700',
          kpiValor: `${formatNumberPtBr(kpis.mp_necessaria_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.mp_necessaria_t > 0),
          diagnosticoIA:
            'Cálculo estrito: MP Necessária = Saldo a Produzir / Rendimento de Transformação da Ficha Mestra. O rendimento varia de 89% a 92% conforme a bitola.',
        }
      case 'faturamento_potencial':
        return {
          titulo: 'Previsão de Faturamento FACA (Potencial vs Confirmado)',
          icone: DollarSign,
          corIcone: 'text-emerald-700',
          kpiValor: `R$ ${kpis.faturamento_potencial_brl.toLocaleString('pt-BR')}`,
          itensFiltrados: itens.filter((i) => i.valor_faturamento_previsto_brl > 0),
          diagnosticoIA:
            'Diferenciação mandatória: R$ ' +
            kpis.faturamento_confirmado_brl.toLocaleString('pt-BR') +
            ' é Faturamento Confirmado (coberto 100% por estoque livre), enquanto o restante é Potencial dependente de laminação.',
        }
      case 'estoque_sem_pedido':
        return {
          titulo: 'Estoque FACA Sem Pedido Ativo (Oportunidade Comercial)',
          icone: AlertTriangle,
          corIcone: 'text-orange-700',
          kpiValor: `${formatNumberPtBr(kpis.estoque_sem_pedido_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.status_atendimento === 'SEM_PEDIDO_ESTOQUE_LIVRE'),
          diagnosticoIA:
            'Materiais produzidos ou devolvidos que encontram-se liberados em estoque sem pedido comercial ativo. Recomenda-se oferta comercial proativa para evitar custo de estocagem.',
        }
      case 'carteira_minima':
        return {
          titulo: 'Materiais Abaixo da Carteira Mínima de Laminação',
          icone: Scale,
          corIcone: 'text-amber-700',
          kpiValor: `${formatNumberPtBr(kpis.carteira_minima_abaixo_t, 1)} t`,
          itensFiltrados: itens.filter((i) => i.status_atendimento === 'LOTE_MINIMO_PENDENTE'),
          diagnosticoIA:
            'Itens cujos pedidos isolados não atingem a campanha técnica mínima do centro (ex: 25 t a 35 t). A laminação isolada geraria perda excessiva de rendimento e custos de setup.',
        }
      case 'pedidos_criticos':
        return {
          titulo: 'Pedidos Críticos com Risco de Atendimento',
          icone: ShieldAlert,
          corIcone: 'text-rose-700',
          kpiValor: `${kpis.pedidos_criticos_count} pedidos`,
          itensFiltrados: itens.filter(
            (i) =>
              i.status_atendimento === 'MP_INSUFICIENTE' ||
              i.status_atendimento === 'LOTE_MINIMO_PENDENTE',
          ),
          diagnosticoIA:
            'Pedidos sob risco iminente de atraso decorrente de falta de MP técnica específica ou inviabilidade de laminação por volume insuficiente.',
        }
      default:
        return {
          titulo: 'Detalhamento do Indicador',
          icone: Briefcase,
          corIcone: 'text-slate-700',
          kpiValor: '',
          itensFiltrados: itens,
          diagnosticoIA: 'Visualização analítica detalhada dos materiais vinculados.',
        }
    }
  }

  const info = getDetalhes()
  const IconC = info.icone

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center ${info.corIcone}`}
            >
              <IconC className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {info.titulo}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Consolidação analítica &bull; Valor Total:{' '}
                <strong className="text-slate-800">{info.kpiValor}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Diagnóstico da IA */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-[#004C97] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Diagnóstico do Motor IA:</span> {info.diagnosticoIA}
          </div>
        </div>

        {/* Tabela dos materiais que compõem o KPI */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex justify-between items-center">
            <span>Materiais Responsáveis pelo Indicador ({info.itensFiltrados.length})</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Valores em toneladas e R$
            </span>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            <Table className="text-xs">
              <TableHeader className="bg-slate-100/70 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Código</TableHead>
                  <TableHead className="font-bold text-slate-700">Descrição</TableHead>
                  <TableHead className="font-bold text-slate-700">Cliente</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Carteira (t)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    Estoque PA (t)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">
                    A Produzir (t)
                  </TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">MP Nec. (t)</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {info.itensFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-xs text-slate-500">
                      Nenhum material associado a este filtro no momento.
                    </TableCell>
                  </TableRow>
                ) : (
                  info.itensFiltrados.map((it) => (
                    <TableRow key={it.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-mono font-bold text-[#004C97]">
                        {it.codigo_material}
                      </TableCell>
                      <TableCell
                        className="text-slate-700 truncate max-w-[200px]"
                        title={it.descricao}
                      >
                        {it.descricao}
                      </TableCell>
                      <TableCell
                        className="text-slate-800 font-medium truncate max-w-[160px]"
                        title={it.cliente}
                      >
                        {it.cliente}
                      </TableCell>
                      <TableCell className="text-right font-bold text-slate-900">
                        {formatNumberPtBr(it.carteira_aberta_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {formatNumberPtBr(it.estoque_livre_pa_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-amber-700">
                        {formatNumberPtBr(it.saldo_a_produzir_t, 1)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-purple-700">
                        {formatNumberPtBr(it.mp_necessaria_t, 1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {it.status_atendimento}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
