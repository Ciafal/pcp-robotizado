import React from 'react'
import {
  History,
  GitCommit,
  ArrowRight,
  User,
  Clock,
  Layers,
  HelpCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'

interface Props {
  open: boolean
  onClose: () => void
  item: ChecklistFechamentoItem | null
}

export const RastrearDivergenciaModal: React.FC<Props> = ({ open, onClose, item }) => {
  if (!item) return null

  // Linha do tempo dos movimentos simulada/rastreada para demonstração e conciliação detalhada (MB51/SAP)
  const movimentos = [
    {
      tipo: '311 - Transferência de Depósito',
      data: '2026-09-28 08:30:15',
      origem: 'DP02',
      destino: item.deposito_sap || 'DP03',
      quantidade: '24,50 t',
      material: 'ST930125 - TARUGO 130X130',
      lote: 'CORR-2026-9812',
      usuario: 'OPERADOR_L2_PCP',
      status: 'Confirmado',
    },
    {
      tipo: '261 - Saída p/ Ordem de Produção',
      data: '2026-09-29 14:10:00',
      origem: item.deposito_sap || 'DP03',
      destino: 'OP 4500098421',
      quantidade: '18,20 t',
      material: 'ST930125 - TARUGO 130X130',
      lote: 'CORR-2026-9812',
      usuario: 'OPERADOR_L2_PCP',
      status: 'Confirmado',
    },
    {
      tipo: 'Devolução / Quarentena',
      data: '2026-09-30 17:45:22',
      origem: 'OP 4500098421',
      destino: 'DP06 (Quarentena)',
      quantidade: '6,30 t',
      material: 'ST930125 - TARUGO 130X130',
      lote: 'CORR-2026-9812',
      usuario: 'QUALIDADE_L2',
      status: 'Pendente de validação de processo',
    },
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Rastrear Divergência — Linha do Tempo de Movimentações
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Atividade {item.codigo} — {item.titulo} (Transação {item.transacao_sap})
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {item.codigo === '1.11' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
              <span className="font-semibold block flex items-center gap-1.5 text-amber-950">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                Nota do Manual Interno CIAFAL (Item 1.11):
              </span>
              <p className="text-[11px] leading-relaxed">
                O manual registra dúvida sobre a sequência exata da movimentação de devolvido entre
                os depósitos DP03, DP06, DP02 e DP12. Esta etapa é mantida sob{' '}
                <strong>&quot;Pendente de validação de processo&quot;</strong> e exige conferência
                detalhada de cada movimento 311/261 via MB51.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <span className="font-semibold text-slate-800 block text-xs">
              Histórico Sequencial de Movimentos SAP (MB51 / MES):
            </span>

            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {movimentos.map((m, idx) => (
                <div key={idx} className="relative space-y-1">
                  <div className="absolute -left-6 top-0.5 w-3 h-3 rounded-full bg-[#004C97] border-2 border-white ring-2 ring-blue-100" />
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{m.tipo}</span>
                      <span className="text-[11px] font-mono text-slate-400">{m.data}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div>
                        Origem: <strong className="text-slate-800">{m.origem}</strong> → Destino:{' '}
                        <strong className="text-slate-800">{m.destino}</strong>
                      </div>
                      <div className="text-right">
                        Quantidade: <strong className="text-[#004C97]">{m.quantidade}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>
                        Material: {m.material} | {m.lote}
                      </span>
                      <span className="font-mono">Usuário: {m.usuario}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-[#004C97] text-white"
          >
            Fechar Rastreamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
