import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Bell,
  RefreshCw,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { PCPMeetingPendencyRecord } from '@/types/pcp-meeting'
import { PCPCobrancaRecord } from '@/types/pcp-cobranca'
import { pcpCobrancasService } from '@/services/pcp-cobrancas-service'
import { useToast } from '@/hooks/use-toast'

interface HistoricoCobrancasModalProps {
  open: boolean
  onClose: () => void
  pendency: PCPMeetingPendencyRecord | null
}

export const HistoricoCobrancasModal: React.FC<HistoricoCobrancasModalProps> = ({
  open,
  onClose,
  pendency,
}) => {
  const { toast } = useToast()
  const [cobrancas, setCobrancas] = useState<PCPCobrancaRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [retryingCanal, setRetryingCanal] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)

  const loadHistorico = async () => {
    if (!pendency?.id) return
    setLoading(true)
    try {
      const records = await pcpCobrancasService.listarCobrancasPendencia(
        pendency.id,
        pendency.pendency_code,
      )
      setCobrancas(records)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: err.message || 'Falha ao buscar cobranças da pendência.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && pendency?.id) {
      loadHistorico()
    } else {
      setCobrancas([])
      setSelectedMessage(null)
    }
  }, [open, pendency?.id])

  if (!pendency) return null

  // Reenviar canal que falhou sem duplicar os demais
  const handleRetryCanal = async (cobrancaId: string, canal: 'meu_dia' | 'email') => {
    const key = `${cobrancaId}_${canal}`
    setRetryingCanal(key)
    try {
      const res = await pcpCobrancasService.reenviarCanal({
        cobranca_id: cobrancaId,
        canal,
      })
      toast({
        title: 'Reenvio de Canal de Cobrança',
        description: res.message,
        variant: res.success ? 'default' : 'destructive',
      })
      await loadHistorico()
    } catch (err: any) {
      toast({
        title: 'Falha no reenvio do canal',
        description: err.message || 'Erro durante reenvio do canal.',
        variant: 'destructive',
      })
    } finally {
      setRetryingCanal(null)
    }
  }

  // Render do status do Meu Dia
  const renderMeuDiaStatus = (c: PCPCobrancaRecord) => {
    if (c.status_meu_dia === 'ENVIADO') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold flex items-center gap-1 w-fit"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Enviado
        </Badge>
      )
    }
    if (c.status_meu_dia === 'ERRO') {
      const isRetrying = retryingCanal === `${c.id}_meu_dia`
      return (
        <div className="flex flex-col gap-1 items-start">
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-semibold flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Erro
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRetryCanal(c.id, 'meu_dia')}
            disabled={isRetrying}
            className="h-6 text-[10px] px-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-100"
          >
            {isRetrying ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Tentar Meu Dia
          </Button>
        </div>
      )
    }
    return (
      <Badge variant="outline" className="text-[10px]">
        {c.status_meu_dia}
      </Badge>
    )
  }

  // Render do status do E-mail
  const renderEmailStatus = (c: PCPCobrancaRecord) => {
    if (c.status_email === 'ENVIADO') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-semibold flex items-center gap-1 w-fit"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Enviado
        </Badge>
      )
    }
    if (c.status_email === 'AGUARDANDO_SMTP') {
      return (
        <Badge
          variant="outline"
          title={c.email_erro_motivo || 'Aguardando configuração de SMTP no servidor'}
          className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-semibold flex items-center gap-1 w-fit cursor-help"
        >
          <Clock className="w-3 h-3 text-amber-600" />
          Aguardando SMTP
        </Badge>
      )
    }
    if (c.status_email === 'ERRO') {
      const isRetrying = retryingCanal === `${c.id}_email`
      return (
        <div className="flex flex-col gap-1 items-start">
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-300 text-[10px] font-semibold flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Erro
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRetryCanal(c.id, 'email')}
            disabled={isRetrying}
            className="h-6 text-[10px] px-1.5 text-rose-700 hover:text-rose-800 hover:bg-rose-100"
          >
            {isRetrying ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Tentar E-mail
          </Button>
        </div>
      )
    }
    return (
      <Badge variant="outline" className="text-[10px]">
        {c.status_email}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#004C97]" />
              Histórico de Cobranças — {pendency.pendency_code}
            </span>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {cobrancas.length} cobrança{cobrancas.length !== 1 ? 's' : ''} registrada
              {cobrancas.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Registro cronológico e imutável de todas as cobranças emitidas para esta pendência,
            incluindo status real por canal (Meu Dia e E-mail).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Header resumo da pendência */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Assunto da Pendência
              </span>
              <strong className="text-slate-900">{pendency.subject}</strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                Responsável Atual
              </span>
              <strong className="text-[#004C97]">{pendency.responsible}</strong>
            </div>
          </div>

          {/* Tabela de histórico */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#004C97]" />
              <span>Carregando histórico de cobranças...</span>
            </div>
          ) : cobrancas.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Nenhuma cobrança registrada</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Utilize o botão "Nova cobrança" para notificar o responsável via Meu Dia e E-mail.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-100">
                  <TableRow>
                    <TableHead className="w-[130px] font-bold text-slate-700">
                      Data / Hora
                    </TableHead>
                    <TableHead className="w-[110px] font-bold text-slate-700">Cobrança</TableHead>
                    <TableHead className="font-bold text-slate-700">Enviado por</TableHead>
                    <TableHead className="font-bold text-slate-700">Responsável</TableHead>
                    <TableHead className="w-[110px] font-bold text-slate-700">Meu Dia</TableHead>
                    <TableHead className="w-[130px] font-bold text-slate-700">E-mail</TableHead>
                    <TableHead className="w-[80px] text-right font-bold text-slate-700">
                      Mensagem
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobrancas.map((cob) => {
                    const cobLabel = `Cobrança ${String(cob.sequencial_pendencia).padStart(2, '0')}`
                    return (
                      <TableRow key={cob.id} className="hover:bg-slate-50/70">
                        <TableCell className="font-mono text-[11px] text-slate-600">
                          {cob.data_hora}
                        </TableCell>
                        <TableCell className="font-bold text-[#004C97]">
                          <span className="block text-[11px]">{cobLabel}</span>
                          <span className="font-mono text-[9px] text-slate-400">
                            {cob.codigo_cobranca}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-800 text-[11px] block">
                            {cob.emissor_nome}
                          </span>
                          {cob.emissor_email && (
                            <span className="text-[10px] text-slate-400 truncate block">
                              {cob.emissor_email}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-slate-800 text-[11px] block">
                            {cob.destinatario_nome}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {cob.destinatario_email}
                          </span>
                        </TableCell>
                        <TableCell>{renderMeuDiaStatus(cob)}</TableCell>
                        <TableCell>{renderEmailStatus(cob)}</TableCell>
                        <TableCell className="text-right">
                          {cob.mensagem_complementar ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-600 hover:text-[#004C97]"
                              title="Visualizar mensagem da cobrança"
                              onClick={() =>
                                setSelectedMessage(
                                  `${cobLabel} (${cob.data_hora}) por ${cob.emissor_nome}:\n\n"${cob.mensagem_complementar}"`,
                                )
                              }
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Modal / visualizador da mensagem complementar selecionada */}
          {selectedMessage && (
            <div className="bg-blue-50/80 p-3 rounded-lg border border-blue-200 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-blue-200/80">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#004C97]" />
                  Mensagem Complementar da Cobrança
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-blue-700 hover:bg-blue-100"
                  onClick={() => setSelectedMessage(null)}
                >
                  Fechar
                </Button>
              </div>
              <p className="mt-2 text-slate-800 whitespace-pre-line leading-relaxed font-mono text-[11px] bg-white p-2.5 rounded border border-blue-100">
                {selectedMessage}
              </p>
            </div>
          )}

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            O histórico de cobranças é imutável e auditado pelo sistema HUB CIAFAL. Não é permitido
            excluir registros.
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default HistoricoCobrancasModal
