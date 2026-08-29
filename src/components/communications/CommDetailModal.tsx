import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Megaphone,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Users,
  Building,
  Unlock,
  AlertTriangle,
} from 'lucide-react'
import { PCPCommunication, PCPCommunicationRead } from '@/types/pcp-meetings-comms'
import { pcpCommunicationService } from '@/services/pcp-communication-service'
import { useToast } from '@/hooks/use-toast'

interface CommDetailModalProps {
  communication: PCPCommunication | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAcknowledgeSuccess?: () => void
  onUnblockSuccess?: () => void
}

export const CommDetailModal: React.FC<CommDetailModalProps> = ({
  communication,
  open,
  onOpenChange,
  onAcknowledgeSuccess,
  onUnblockSuccess,
}) => {
  const { toast } = useToast()
  const [reads, setReads] = useState<PCPCommunicationRead[]>([])
  const [loadingReads, setLoadingReads] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)
  const [unblocking, setUnblocking] = useState(false)
  const [unblockReason, setUnblockReason] = useState('')

  useEffect(() => {
    if (communication && open) {
      pcpCommunicationService.markAsRead(communication.id)
      loadReads(communication.id)
    }
  }, [communication, open])

  const loadReads = async (commId: string) => {
    setLoadingReads(true)
    try {
      const list = await pcpCommunicationService.listCommunicationReads(commId)
      setReads(list)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingReads(false)
    }
  }

  if (!communication) return null

  const handleAcknowledge = async () => {
    setAcknowledging(true)
    try {
      await pcpCommunicationService.acknowledgeCommunication(communication.id)
      toast({
        title: 'Ciência Formal Registrada',
        description:
          'Sua confirmação de leitura [LI E ESTOU CIENTE] foi gravada com assinatura eletrônica e data/hora.',
      })
      await loadReads(communication.id)
      if (onAcknowledgeSuccess) onAcknowledgeSuccess()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar ciência',
        description: e.message,
      })
    } finally {
      setAcknowledging(false)
    }
  }

  const handleUnblock = async () => {
    if (!unblockReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa obrigatória',
        description: 'Informe a condição técnica cumprida para o desbloqueio.',
      })
      return
    }

    setUnblocking(true)
    try {
      await pcpCommunicationService.unblockCommunication(communication.id, unblockReason.trim())
      toast({
        title: 'Comunicado Desbloqueado com Sucesso',
        description: 'A restrição da linha de produção foi encerrada.',
      })
      if (onUnblockSuccess) onUnblockSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao desbloquear',
        description: e.message,
      })
    } finally {
      setUnblocking(false)
    }
  }

  const isAcked = communication.user_read_state?.is_acknowledged

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#004C97] text-white text-[10px] font-mono">
                {communication.code}
              </Badge>
              <Badge
                className={
                  communication.criticality === 'BLOQUEANTE'
                    ? 'bg-purple-900 text-white'
                    : communication.criticality === 'CRITICA'
                      ? 'bg-rose-600 text-white'
                      : communication.criticality === 'ATENCAO'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-white'
                }
              >
                {communication.criticality}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-slate-300 font-semibold">
                {communication.comm_type}
              </Badge>
              {communication.status === 'VIGENTE' && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                  ● VIGENTE
                </Badge>
              )}
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 pt-1">
              {communication.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-xs pt-1">
          {/* Metadados e Linhas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-400 text-[10px] block font-mono">Início Vigência</span>
              <strong className="text-slate-900 text-xs font-mono">
                {communication.valid_from}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-mono">Validade</span>
              <strong className="text-slate-900 text-xs font-mono">
                {communication.valid_until || 'Indeterminada'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-mono">Linhas</span>
              <strong className="text-[#004C97] text-xs font-mono">
                {communication.target_line_codes?.join(', ') || 'Geral'}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-mono">Emitido por</span>
              <strong className="text-slate-900 text-xs truncate block">
                {communication.author_name || 'PCP CIAFAL'}
              </strong>
            </div>
          </div>

          {/* Banner de Bloqueio se aplicável */}
          {communication.is_blocking && communication.status === 'VIGENTE' && (
            <div className="bg-rose-50 border border-rose-300 p-3.5 rounded-lg space-y-2 text-rose-950">
              <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" /> COMUNICADO BLOQUEANTE ATIVO NA
                LINHA
              </div>
              <p className="text-[11px]">
                <strong>Motivo:</strong> {communication.block_reason}
              </p>
              <p className="text-[11px]">
                <strong>Condição para Desbloqueio:</strong> {communication.unblock_condition}
              </p>

              <div className="pt-2 border-t border-rose-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Justificativa técnica para desbloquear..."
                  value={unblockReason}
                  onChange={(e) => setUnblockReason(e.target.value)}
                  className="h-7 text-xs flex-1 bg-white border border-rose-300 rounded px-2 text-slate-800"
                />
                <Button
                  size="sm"
                  onClick={handleUnblock}
                  disabled={unblocking}
                  className="h-7 text-xs bg-rose-700 hover:bg-rose-800 text-white font-bold gap-1"
                >
                  <Unlock className="w-3.5 h-3.5" /> Desbloquear
                </Button>
              </div>
            </div>
          )}

          {/* Resumo */}
          {communication.summary && (
            <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-slate-800 space-y-0.5">
              <span className="text-[10px] font-bold text-[#004C97] uppercase">
                Resumo da Diretriz
              </span>
              <p className="text-xs font-medium">{communication.summary}</p>
            </div>
          )}

          {/* Conteúdo Completo */}
          <div className="space-y-1">
            <span className="text-slate-700 font-bold block text-xs">Orientações Oficiais:</span>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
              {communication.content}
            </div>
          </div>

          {/* Painel de Controle de Leitura & Ciência Formal */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#004C97]" /> Controle de Leitura & Confirmação
                de Ciência ({reads.length})
              </span>
              {communication.requires_acknowledgement && (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                  Ciência Obrigatória
                </Badge>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 rounded-md p-2 bg-slate-50">
              {reads.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-2">
                  Nenhum registro de leitura gravado ainda.
                </p>
              ) : (
                reads.map((rd) => (
                  <div
                    key={rd.id}
                    className="flex items-center justify-between p-1.5 bg-white border border-slate-100 rounded text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{rd.user_name}</span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        ({rd.user_email})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {rd.acknowledged_at ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[9px] font-bold">
                          ✓ Ciente em {new Date(rd.acknowledged_at).toLocaleTimeString('pt-BR')}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-300 text-[9px]"
                        >
                          Visualizado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] text-slate-400 font-mono">
              Origem:{' '}
              <strong>
                {communication.origin_type}{' '}
                {communication.origin_ref_code && `(${communication.origin_ref_code})`}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-8 border-slate-300"
              >
                Fechar
              </Button>

              {communication.requires_acknowledgement && !isAcked && (
                <Button
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4 font-bold shadow-xs gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {acknowledging ? 'Gravando...' : 'LI E ESTOU CIENTE'}
                </Button>
              )}

              {isAcked && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-3 py-1 font-bold">
                  ✓ Ciência Registrada
                </Badge>
              )}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default CommDetailModal
