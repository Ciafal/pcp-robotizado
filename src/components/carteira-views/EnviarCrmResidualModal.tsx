/**
 * Modal de Envio para Análise no CRM 360°
 * Reutiliza o padrão de pendências do CRM (pcp_crm_revision_pendencies)
 * Permite selecionar responsáveis, justificar observações do PCP e encaminhar
 * solicitações oficiais de Análise Comercial.
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Send, Users, AlertCircle, FileCheck2, Scale, DollarSign, Package } from 'lucide-react'
import { PedidoCarteiraItem } from '@/types/pcp-pedidos-carteira'
import { PcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'
import { toast } from '@/hooks/use-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  itensSelecionados: PedidoCarteiraItem[]
  onSucesso: () => void
}

const formatarMoeda = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(val || 0)
}

const formatarTons = (val: number) => {
  return (
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0) + ' t'
  )
}

export const EnviarCrmResidualModal: React.FC<Props> = ({
  isOpen,
  onClose,
  itensSelecionados,
  onSucesso,
}) => {
  const [enviando, setEnviando] = useState(false)
  const [equipeDestino, setEquipeDestino] = useState('Equipe Comercial Geral')
  const [responsavelDestino, setResponsavelDestino] = useState('Gerência de Vendas')
  const [observacoes, setObservacoes] = useState(
    'Solicitamos avaliação comercial junto ao cliente para verificar a possibilidade de cancelamento do saldo residual remanescente ou faturamento complementar, evitando travamento de lote mínimo nas linhas.',
  )

  const totalPedidos = new Set(itensSelecionados.map((i) => i.pedido_sap)).size
  const totalItens = itensSelecionados.length
  const saldoTotalTons = itensSelecionados.reduce((acc, i) => acc + i.saldo_aberto_t, 0)
  const valorTotalRs = itensSelecionados.reduce((acc, i) => acc + i.valor_saldo_rs, 0)

  const handleConfirmarEnvio = async () => {
    if (itensSelecionados.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum item selecionado',
        description: 'Selecione ao menos um item de saldo residual para enviar ao CRM.',
      })
      return
    }

    setEnviando(true)
    try {
      const observacaoComEquipe = equipeDestino
        ? `${observacoes} — Equipe destino: ${equipeDestino}`
        : observacoes

      const resultado = await PcpPedidosCarteiraService.enviarLoteParaCrm360(
        itensSelecionados,
        observacaoComEquipe,
        responsavelDestino,
      )

      toast({
        title: 'Enviado com Sucesso ao CRM 360°',
        description: `${resultado.enviados} pendências criadas sob o protocolo ${resultado.protocoloLote}. Alerta "PCP — Análise de Pedidos com Saldos Residuais" emitido.`,
      })

      onSucesso()
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no envio ao CRM 360°',
        description: err?.message || 'Erro de comunicação com o servidor de pendências.',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-[#004C97] to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <Users className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                Enviar para Análise no CRM 360°
              </DialogTitle>
              <DialogDescription className="text-slate-200 text-xs mt-1">
                Geração de alertas comerciais oficiais para alinhamento de pedidos com saldos
                residuais.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] text-sm">
          {/* Resumo do lote selecionado */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 block">Qtd. Pedidos</span>
              <span className="text-lg font-black text-slate-900 font-mono">{totalPedidos}</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 block">Qtd. Itens</span>
              <span className="text-lg font-black text-slate-900 font-mono">{totalItens}</span>
            </div>
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60">
              <span className="text-[11px] text-blue-700 block">Saldo Total</span>
              <span className="text-lg font-black text-[#004C97] font-mono">
                {formatarTons(saldoTotalTons)}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="text-[11px] text-emerald-700 block">Valor Residual</span>
              <span className="text-lg font-black text-emerald-900 font-mono">
                {formatarMoeda(valorTotalRs)}
              </span>
            </div>
          </div>

          {/* Aviso sobre a diretriz comercial */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Alerta de Governança Comercial:</span>
              <span>
                O alerta no CRM 360° solicita <strong>ANÁLISE COMERCIAL</strong> com o cliente e
                equipe de vendas. <strong>Nenhum cancelamento automático é realizado no SAP</strong>{' '}
                sem aprovação formal das partes.
              </span>
            </div>
          </div>

          {/* Destinatário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">
                Equipe Destinatária no CRM
              </Label>
              <Select value={equipeDestino} onValueChange={setEquipeDestino}>
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equipe Comercial Geral">Equipe Comercial Geral</SelectItem>
                  <SelectItem value="Vendas Internas - SP">Vendas Internas - SP</SelectItem>
                  <SelectItem value="Vendas Filiais / Representantes">
                    Vendas Filiais / Representantes
                  </SelectItem>
                  <SelectItem value="Gerência Comercial Automotiva">
                    Gerência Comercial Automotiva
                  </SelectItem>
                  <SelectItem value="Diretoria Comercial">Diretoria Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">
                Responsável / Contato Preferencial
              </Label>
              <Input
                value={responsavelDestino}
                onChange={(e) => setResponsavelDestino(e.target.value)}
                placeholder="Ex: Gestor da Carteira ou Vendedor"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Observações do PCP */}
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">
              Observações e Diretrizes do PCP para a Negociação
            </Label>
            <Textarea
              rows={4}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva o motivo da solicitação, gargalos de produção, data limite para alinhamento..."
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={enviando}
            className="text-xs border-slate-300"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirmarEnvio}
            disabled={enviando || itensSelecionados.length === 0}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs font-semibold"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            {enviando
              ? 'Enviando ao CRM...'
              : `Confirmar Envio (${itensSelecionados.length} itens)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
