import React, { useState, useEffect } from 'react'
import {
  X,
  History,
  FileText,
  Calendar,
  Send,
  User,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CarteiraMinimaItem } from '@/types/carteira-minima'
import { ComunicadoComercialRecord, ItemComercialStatus } from '@/types/comercial-comunicado'
import { comercialComunicadoService, gerarChaveItem } from '@/services/comercial-comunicado-service'
import { formatNumberPTBR } from '@/lib/number-format'

interface HistoricoComunicadoItemModalProps {
  isOpen: boolean
  onClose: () => void
  item: CarteiraMinimaItem | null
  onVerComunicadoCompleto?: (comunicadoIdOuNumero: string) => void
}

export const HistoricoComunicadoItemModal: React.FC<HistoricoComunicadoItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onVerComunicadoCompleto,
}) => {
  const [statusItem, setStatusItem] = useState<ItemComercialStatus | null>(null)
  const [carregando, setCarregando] = useState<boolean>(true)

  useEffect(() => {
    if (!isOpen || !item) return

    let isMounted = true
    setCarregando(true)

    comercialComunicadoService
      .verificarItemJaEnviado(item)
      .then((res) => {
        if (!isMounted) return
        setStatusItem(res)
      })
      .finally(() => {
        if (isMounted) setCarregando(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, item])

  if (!isOpen || !item) return null

  const historico = statusItem?.historico_envios_json || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-2xl bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-widest text-[#004C97] uppercase">
                PCP Robotizado • Rastreabilidade Comercial
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  statusItem?.status === 'Enviado'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : statusItem?.status === 'Respondido'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : statusItem?.status === 'Em análise'
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
              >
                Status: {statusItem?.status || 'Não enviado'}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-[#004C97]" />
              Histórico Comercial do Item
            </DialogTitle>
            <p className="text-xs text-slate-600 font-mono">
              Material: {item.material} | Pedido:{' '}
              {item.pedido_formatado || `${item.pedido_venda} / ${item.item_pedido}`}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Card Resumo do Item */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Saldo a Produzir
              </span>
              <span className="font-mono font-bold text-amber-800 text-xs">
                {formatNumberPTBR(item.saldo_produzir_tons, 3)} t
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Carteira Mínima
              </span>
              <span className="font-mono font-semibold text-xs">
                {formatNumberPTBR(item.producao_minima_tons, 3)} t
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Total de Envios
              </span>
              <span className="font-mono font-bold text-[#004C97] text-xs">
                {statusItem?.total_envios || 0} comunicado(s)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-bold">
                Último Envio
              </span>
              <span className="font-mono text-xs text-slate-800">
                {statusItem?.ultimo_envio_em || 'Nenhum'}
              </span>
            </div>
          </div>

          {/* Lista de Envios */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#004C97]" />
              Comunicados Emitidos ({historico.length})
            </h4>

            {carregando ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Carregando histórico de envios...
              </div>
            ) : historico.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                Nenhum comunicado emitido até o momento para este item.
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((h, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#004C97]/40 transition-colors shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#004C97] text-xs">
                          {h.numero_sequencial}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            h.prioridade === 'Crítica'
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : h.prioridade === 'Atenção'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-blue-50 text-blue-700 border-blue-300'
                          }`}
                        >
                          {h.prioridade}
                        </Badge>
                      </div>

                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {h.data_envio}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800">{h.assunto}</p>

                    <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        Enviado por: <strong>{h.enviado_por}</strong>
                      </span>
                      <span>
                        Destinos:{' '}
                        <strong>
                          {h.destinos.includes('COMERCIAL_HUB') && h.destinos.includes('MEU_DIA')
                            ? 'Comercial + Meu Dia'
                            : h.destinos.includes('COMERCIAL_HUB')
                              ? 'Comercial – HUB'
                              : 'Meu Dia'}
                        </strong>
                      </span>
                    </div>

                    {h.destinatarios && h.destinatarios.length > 0 && (
                      <div className="text-[10px] text-slate-500">
                        Destinatários: {h.destinatarios.join(', ')}
                      </div>
                    )}

                    {onVerComunicadoCompleto && (
                      <div className="pt-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onVerComunicadoCompleto(h.numero_sequencial)}
                          className="text-[11px] h-6 text-[#004C97] hover:bg-blue-50 p-1 gap-1"
                        >
                          Ver comunicado na íntegra
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default HistoricoComunicadoItemModal
