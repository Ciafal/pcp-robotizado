/**
 * Modal de Análise de Inteligência Artificial para Pedidos em Carteira
 * Módulo: PCP Robotizado > Análise de Carteira (HUB CIAFAL)
 */

import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react'
import { PedidoCarteiraAnalitico, KpisPedidosCarteira } from '@/types/pcp-pedidos-carteira'
import { formatNumberPTBR } from '@/lib/formatters-ptbr'

interface Props {
  isOpen: boolean
  onClose: () => void
  itens: PedidoCarteiraAnalitico[]
  kpis: KpisPedidosCarteira
}

export const AnaliseIaPedidosCarteiraModal: React.FC<Props> = ({
  isOpen,
  onClose,
  itens,
  kpis,
}) => {
  const analise = useMemo(() => {
    const pedidosAtrasados = itens.filter((i) => i.tem_atraso)
    const pedidosDeficit = itens.filter((i) => i.tem_deficit_estoque)
    const pedidosResiduais = itens.filter((i) => i.eh_saldo_residual)

    // Agrupa clientes com maior volume de atraso
    const mapClientesAtraso = new Map<string, { nome: string; tons: number; qtd: number }>()
    pedidosAtrasados.forEach((i) => {
      const prev = mapClientesAtraso.get(i.codigo_cliente) || {
        nome: i.nome_cliente,
        tons: 0,
        qtd: 0,
      }
      prev.tons += i.saldo_aberto_t
      prev.qtd += 1
      mapClientesAtraso.set(i.codigo_cliente, prev)
    })

    const topClientesAtraso = Array.from(mapClientesAtraso.values())
      .sort((a, b) => b.tons - a.tons)
      .slice(0, 3)

    // Agrupa famílias com maior déficit
    const mapFamiliasDeficit = new Map<string, number>()
    pedidosDeficit.forEach((i) => {
      const v = mapFamiliasDeficit.get(i.familia) || 0
      mapFamiliasDeficit.set(i.familia, v + i.saldo_aberto_t)
    })
    const topFamiliasDeficit = Array.from(mapFamiliasDeficit.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return {
      topClientesAtraso,
      topFamiliasDeficit,
      qtdAtrasados: pedidosAtrasados.length,
      qtdDeficit: pedidosDeficit.length,
      qtdResiduais: pedidosResiduais.length,
    }
  }, [itens])

  const fmtT = (v: number) => `${formatNumberPTBR(v, 2)} t`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-[#004C97] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Sparkles className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                Diagnóstico IA — Carteira de Pedidos
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-xs font-semibold">
                  PCP Copilot
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-xs mt-1">
                Análise determinística em tempo real da carteira SAP ECC ZSD28C e priorização de
                atendimento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)] text-sm">
          {/* Card Resumo Executivo */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80">
            <h4 className="font-semibold text-[#004C97] flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              Visão Geral do Planejamento
            </h4>
            <p className="text-slate-700 leading-relaxed text-xs">
              A carteira monitorada possui <strong>{kpis.totalPedidos} ordens de venda</strong> e{' '}
              <strong>{kpis.totalItens} itens</strong>, totalizando{' '}
              <strong>{fmtT(kpis.quantidadeTotalCarteiraTons)}</strong>. Foram detectados{' '}
              <strong className="text-amber-700">{kpis.pedidosComAtraso} pedidos com atraso</strong>{' '}
              cronológico e{' '}
              <strong>{kpis.pedidosComSaldoResidual} pedidos com saldos residuais</strong> que
              exigem validação com a equipe comercial para liberação de capacidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Clientes com pedidos vencidos */}
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/40">
              <h5 className="font-semibold text-red-900 flex items-center gap-2 text-xs mb-3">
                <Clock className="w-4 h-4 text-red-600" />
                Clientes Mais Críticos em Atraso
              </h5>
              {analise.topClientesAtraso.length === 0 ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Nenhum pedido em atraso na seleção atual.
                </div>
              ) : (
                <ul className="space-y-2">
                  {analise.topClientesAtraso.map((cli, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-xs p-2 rounded bg-white border border-red-100 shadow-sm"
                    >
                      <span className="font-medium text-slate-800 truncate max-w-[200px]">
                        {cli.nome}
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-red-700">{fmtT(cli.tons)}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {cli.qtd} {cli.qtd === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Famílias com déficit de estoque */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
              <h5 className="font-semibold text-amber-900 flex items-center gap-2 text-xs mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Concentração de Déficit de Estoque
              </h5>
              {analise.topFamiliasDeficit.length === 0 ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Nenhum déficit de estoque identificado.
                </div>
              ) : (
                <ul className="space-y-2">
                  {analise.topFamiliasDeficit.map(([familia, tons], idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center text-xs p-2 rounded bg-white border border-amber-100 shadow-sm"
                    >
                      <span className="font-medium text-slate-800">{familia}</span>
                      <span className="font-bold text-amber-800">{fmtT(tons)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Recomendações determinísticas do PCP */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
            <h5 className="font-semibold text-slate-900 flex items-center gap-2 text-xs mb-3">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" />
              Diretrizes de Atuação Sugeridas
            </h5>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  <strong>Priorizar enfornamento:</strong> Alocar os lotes em produção nas ordens de
                  clientes com data de entrega vencida há mais de 7 dias para mitigar multas
                  contratuais e paradas de linha do cliente.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  <strong>Saldos Residuais:</strong> Acessar o tópico "Pedidos com Saldos Residuais"
                  para filtrar pedidos com saldo &le; 2,00 t e enviar revisão em lote para o CRM
                  360°, liberando compromisso de programação.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-[#004C97] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  <strong>Disponibilidade Imediata:</strong> Os{' '}
                  <strong>{kpis.pedidosComCoberturaDisponivel} pedidos</strong> com cobertura de
                  estoque podem ter remessa gerada de imediato no SAP (VL01N), agilizando
                  faturamento.
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center sm:justify-between">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            Dados sincronizados com o motor de carteira SAP ECC CIAFAL
          </span>
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs px-5 font-semibold"
          >
            Fechar Diagnóstico
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
