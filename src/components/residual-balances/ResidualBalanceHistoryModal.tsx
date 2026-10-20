import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ResidualBalanceItem, ResidualBalanceActionRecord } from '../../types/pcp-residual-balances'
import { ResidualBalancesService } from '../../services/pcp-residual-balances-service'
import { formatNumberPTBR } from '../../lib/number-format'
import { History, User, Calendar, CheckCircle } from 'lucide-react'

interface ResidualBalanceHistoryModalProps {
  open: boolean
  onClose: () => void
  item: ResidualBalanceItem | null
}

export const ResidualBalanceHistoryModal: React.FC<ResidualBalanceHistoryModalProps> = ({
  open,
  onClose,
  item,
}) => {
  const [history, setHistory] = useState<ResidualBalanceActionRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && item) {
      loadHistory()
    }
  }, [open, item])

  const loadHistory = async () => {
    if (!item) return
    setLoading(true)
    try {
      const records = await ResidualBalancesService.getActionHistory(item.deposito, item.lote)
      setHistory(records)
    } finally {
      setLoading(false)
    }
  }

  if (!item) return null

  const formatDateTimeBR = (iso?: string) => {
    if (!iso) return '-'
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (_) {
      return '-'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white p-6 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Histórico Cronológico de Ações
              </DialogTitle>
              <div className="text-xs text-slate-500">
                Lote: <span className="font-mono font-bold text-slate-800">{item.lote}</span> |
                Material:{' '}
                <span className="font-semibold text-slate-800">{item.material_codigo}</span> |
                Depósito: <span className="font-semibold text-slate-800">{item.deposito}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="pt-2">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Carregando histórico de tratamentos...
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-200">
              Nenhuma ação registrada para este lote ainda.
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 my-2">
              {history.map((record, idx) => (
                <div key={idx} className="relative pl-6">
                  {/* Marcador na linha do tempo */}
                  <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-indigo-600" />
                  </div>

                  {/* Conteúdo do Registro */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="font-bold text-[11px] bg-white border-slate-300 text-slate-800 uppercase"
                        >
                          {record.status_novo.replace(/_/g, ' ')}
                        </Badge>
                        <span className="font-semibold text-slate-900">
                          {record.acao_realizada}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTimeBR(record.data_acao)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Responsável Operacional:</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {record.responsavel}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Quantidade no Registro:</span>
                        <span className="font-medium text-slate-800">
                          {formatNumberPTBR(record.quantidade_residual, 0, 3)}{' '}
                          {record.unidade_medida}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Registrado por:</span>
                        <span className="text-slate-700 truncate block">
                          {record.usuario_nome || record.usuario_email || 'Sistema'}
                        </span>
                      </div>
                    </div>

                    {record.observacao && (
                      <div className="bg-white p-2 rounded border border-slate-200 text-slate-700 text-[11px]">
                        <span className="font-semibold block text-slate-600">Observação:</span>
                        {record.observacao}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-9"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
