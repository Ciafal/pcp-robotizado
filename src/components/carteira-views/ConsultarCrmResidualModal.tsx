/**
 * Modal de Consulta e Acompanhamento de Pendência no CRM 360°
 * Exibe o histórico de status, justificativas, solicitante e ações tomadas.
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
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  User,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react'
import { CrmRevisionPendency, StatusAnaliseCrm } from '@/types/pcp-pedidos-carteira'
import { PcpPedidosCarteiraService } from '@/services/pcp-pedidos-carteira-service'
import { toast } from '@/hooks/use-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  pendencia: CrmRevisionPendency | null
  onAtualizado?: () => void
}

const statusBadgeConfig: Record<
  StatusAnaliseCrm,
  { label: string; color: string; border: string; bg: string }
> = {
  PENDENTE: {
    label: 'Pendente de análise',
    color: 'text-amber-800',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
  },
  EM_ANALISE: {
    label: 'Em análise comercial',
    color: 'text-blue-800',
    border: 'border-blue-300',
    bg: 'bg-blue-50',
  },
  MANTER_PEDIDO: {
    label: 'Manter pedido',
    color: 'text-purple-800',
    border: 'border-purple-300',
    bg: 'bg-purple-50',
  },
  SOLICITAR_AJUSTE: {
    label: 'Solicitar ajuste',
    color: 'text-orange-800',
    border: 'border-orange-300',
    bg: 'bg-orange-50',
  },
  SOLICITAR_CANCELAMENTO: {
    label: 'Solicitar cancelamento',
    color: 'text-rose-800',
    border: 'border-rose-300',
    bg: 'bg-rose-50',
  },
  CONCLUIDO: {
    label: 'Concluído',
    color: 'text-emerald-800',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
  },
}

export const ConsultarCrmResidualModal: React.FC<Props> = ({
  isOpen,
  onClose,
  pendencia,
  onAtualizado,
}) => {
  const [salvando, setSalvando] = useState(false)
  const [novoStatus, setNovoStatus] = useState<StatusAnaliseCrm>('PENDENTE')
  const [justificativa, setJustificativa] = useState('')

  if (!pendencia) return null

  const cfg = statusBadgeConfig[pendencia.status] || statusBadgeConfig.PENDENTE

  const handleAtualizarStatus = async () => {
    if (!justificativa.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa obrigatória',
        description: 'Informe o motivo ou parecer comercial para atualizar o status.',
      })
      return
    }

    setSalvando(true)
    try {
      await PcpPedidosCarteiraService.atualizarStatusCrm(pendencia.id, novoStatus, justificativa)
      toast({
        title: 'Status CRM Atualizado',
        description: `O acompanhamento da pendência ${pendencia.protocol} foi atualizado.`,
      })
      if (onAtualizado) onAtualizado()
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar CRM',
        description: err?.message || 'Falha ao persistir status.',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border-slate-200">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-slate-900 via-[#004C97] to-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                <FileText className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  Acompanhamento CRM 360°
                </DialogTitle>
                <DialogDescription className="text-slate-200 text-xs mt-1">
                  Protocolo Oficial:{' '}
                  <span className="font-mono font-bold">{pendencia.protocol}</span>
                </DialogDescription>
              </div>
            </div>
            <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} border text-xs`}>
              {cfg.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)] text-sm">
          {/* Card de Identificação */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
            <div>
              <span className="text-[11px] text-slate-500 block">Pedido / Item SAP</span>
              <span className="font-mono font-bold text-slate-800 text-base">
                {pendencia.sales_order_number} / {pendencia.sales_order_item}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Cliente</span>
              <span className="font-semibold text-slate-800 text-sm truncate block">
                {pendencia.client_name}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Material</span>
              <span className="font-mono text-xs text-slate-700 block">
                {pendencia.material_code}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">Volume / Saldo Residual</span>
              <span className="font-mono font-bold text-[#004C97] text-sm">
                {pendencia.tonnage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} t
              </span>
            </div>
          </div>

          {/* Observações da Solicitação */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-[#004C97] uppercase">
              <ShieldCheck className="w-4 h-4" />
              Solicitação Emitida pelo PCP
            </div>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {pendencia.observation || 'Sem observações adicionais.'}
            </p>
            <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between border-t border-blue-100">
              <span>
                Solicitante: <strong>{pendencia.requested_by_name}</strong>
              </span>
              <span>
                Criado em:{' '}
                {new Date(pendencia.created).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Histórico / Justificativa atual */}
          {pendencia.resolution_notes && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <span className="font-semibold text-xs text-slate-700 uppercase block">
                Último Parecer Comercial / Histórico
              </span>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {pendencia.resolution_notes}
              </p>
              {pendencia.resolved_by && (
                <span className="text-[11px] text-slate-500 block pt-1 border-t border-slate-200">
                  Responsável: <strong>{pendencia.resolved_by}</strong>
                </span>
              )}
            </div>
          )}

          {/* Atualização de Status (Ações de Feedback) */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
            <span className="font-semibold text-xs text-indigo-950 uppercase block">
              Registrar Evolução do Acompanhamento
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-600 block mb-1">Novo Status</span>
                <Select
                  value={novoStatus}
                  onValueChange={(v: StatusAnaliseCrm) => setNovoStatus(v)}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDENTE">Pendente de análise</SelectItem>
                    <SelectItem value="EM_ANALISE">Em análise comercial</SelectItem>
                    <SelectItem value="MANTER_PEDIDO">Manter pedido</SelectItem>
                    <SelectItem value="SOLICITAR_AJUSTE">Solicitar ajuste</SelectItem>
                    <SelectItem value="SOLICITAR_CANCELAMENTO">Solicitar cancelamento</SelectItem>
                    <SelectItem value="CONCLUIDO">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-600 block mb-1">
                Parecer / Justificativa da Evolução
              </span>
              <Textarea
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o alinhamento com o vendedor ou retorno do cliente..."
                className="text-xs bg-white resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={handleAtualizarStatus}
                disabled={salvando}
                className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs"
              >
                {salvando ? 'Atualizando...' : 'Gravar Evolução'}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs bg-white border-slate-300"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
