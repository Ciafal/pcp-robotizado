import React, { useState, useEffect } from 'react'
import {
  X,
  History,
  Mail,
  ClipboardList,
  Loader2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  BadgeAlert,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  carteiraMinimaAcoesService,
  HistoricoEnvioItem,
} from '@/services/carteira-minima-acoes-service'

interface HistoricoEnviosCarteiraMinimaModalProps {
  isOpen: boolean
  onClose: () => void
}

function formatarDataHora(isoString?: string): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    return isoString
  }
}

export const HistoricoEnviosCarteiraMinimaModal: React.FC<
  HistoricoEnviosCarteiraMinimaModalProps
> = ({ isOpen, onClose }) => {
  const [historico, setHistorico] = useState<HistoricoEnvioItem[]>([])
  const [carregando, setCarregando] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'EMAIL' | 'PENDENCIA'>('TODOS')

  useEffect(() => {
    if (!isOpen) return
    setCarregando(true)
    carteiraMinimaAcoesService
      .listarHistoricoEnvios()
      .then((records) => {
        setHistorico(records)
      })
      .catch((err) => {
        console.warn('Erro ao carregar histórico:', err)
      })
      .finally(() => {
        setCarregando(false)
      })
  }, [isOpen])

  const registrosFiltrados = historico.filter((item) => {
    if (filtroTipo === 'TODOS') return true
    return item.tipo === filtroTipo
  })

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[85vh] bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#004C97] text-white flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                Histórico de Envios &bull; Carteira Mínima
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Registros de e-mails despachados/agendados e pendências criadas no Meu Dia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Filtro de Tipo */}
        <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant={filtroTipo === 'TODOS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('TODOS')}
              className={`text-xs h-7 px-3 ${filtroTipo === 'TODOS' ? 'bg-[#004C97] text-white' : 'text-slate-700'}`}
            >
              Todos ({historico.length})
            </Button>
            <Button
              type="button"
              variant={filtroTipo === 'EMAIL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('EMAIL')}
              className={`text-xs h-7 px-3 gap-1 ${filtroTipo === 'EMAIL' ? 'bg-[#004C97] text-white' : 'text-slate-700'}`}
            >
              <Mail className="w-3 h-3" /> E-mails (
              {historico.filter((h) => h.tipo === 'EMAIL').length})
            </Button>
            <Button
              type="button"
              variant={filtroTipo === 'PENDENCIA' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroTipo('PENDENCIA')}
              className={`text-xs h-7 px-3 gap-1 ${filtroTipo === 'PENDENCIA' ? 'bg-[#004C97] text-white' : 'text-slate-700'}`}
            >
              <ClipboardList className="w-3 h-3" /> Pendências (
              {historico.filter((h) => h.tipo === 'PENDENCIA').length})
            </Button>
          </div>
          <span className="text-[11px] text-slate-500">Auditoria imutável</span>
        </div>

        {/* Lista com rolagem */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-slate-700">
          {carregando ? (
            <div className="py-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#004C97]" />
              <span>Carregando histórico...</span>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="font-semibold text-slate-700">Nenhum envio registrado até o momento.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Os envios por e-mail e pendências do Meu Dia aparecerão aqui.
              </p>
            </div>
          ) : (
            registrosFiltrados.map((item) => {
              const isEmail = item.tipo === 'EMAIL'
              const destinatarios = item.destinatarios_json || []
              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isEmail ? 'bg-blue-50 text-[#004C97]' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {isEmail ? (
                          <Mail className="w-4 h-4" />
                        ) : (
                          <ClipboardList className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block text-xs">
                          {item.assunto_ou_titulo}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {isEmail ? 'Disparo de Relatório PDF' : 'Pendência Criada no Meu Dia'}{' '}
                          &bull; {formatarDataHora(item.created)}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 font-medium ${
                        item.status?.includes('DESPACHADO') || item.status === 'Concluída'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status?.includes('AGENDADO')
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.status === 'AGENDADO_DESPACHO_PENDENTE_SMTP'
                        ? 'Agendado (Sem SMTP)'
                        : item.status || 'Registrado'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Por: </span>
                      <span>{item.remetente_nome || 'PCP'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Destinatários: </span>
                      <span>{item.destinatarios_count || destinatarios.length} usuário(s)</span>
                    </div>
                    {item.prioridade && (
                      <div>
                        <span className="font-semibold text-slate-700">Prioridade: </span>
                        <span>{item.prioridade}</span>
                      </div>
                    )}
                  </div>

                  {destinatarios.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {destinatarios.slice(0, 4).map((d: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700 font-mono"
                        >
                          {d.name || d.email}
                        </span>
                      ))}
                      {destinatarios.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-500">
                          +{destinatarios.length - 4} outros
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 px-4"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
