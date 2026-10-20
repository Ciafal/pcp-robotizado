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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, ArrowRight, CheckCircle2, Layers, Loader2 } from 'lucide-react'
import type { ProductionOrder } from '@/types/pcp-production'
import { pcpProductionService } from '@/services/pcp-production-service'

interface MassStatusChangeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedOrders: ProductionOrder[]
  onSuccess: (result: {
    batch_id: string
    summary: { total: number; success: number; failed: number }
    results: any[]
  }) => void
}

// Status válidos no ciclo de vida SAP ECC (COHV)
const SAP_ECC_STATUS_OPTIONS = [
  { value: 'LIBERADA', label: 'LIBERADA (REL)', sapDesc: 'Liberada para chão de fábrica' },
  { value: 'EM_PRODUCAO', label: 'EM PRODUÇÃO', sapDesc: 'Execução e apontamento ativo no MES' },
  {
    value: 'CONCLUIDA_FISICAMENTE',
    label: 'CONCLUÍDA FISICAMENTE',
    sapDesc: 'Produção física concluída no posto',
  },
  {
    value: 'AGUARDANDO_FECHAMENTO',
    label: 'AGUARDANDO FECHAMENTO',
    sapDesc: 'Aguardando encerramento técnico (TECO)',
  },
  {
    value: 'BLOQUEADA',
    label: 'BLOQUEADA',
    sapDesc: 'Bloqueio administrativo/qualidade',
  },
]

export const MassStatusChangeModal: React.FC<MassStatusChangeModalProps> = ({
  isOpen,
  onClose,
  selectedOrders,
  onSuccess,
}) => {
  const [targetStatus, setTargetStatus] = useState<string>('EM_PRODUCAO')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  // Análise prévia por OP de aplicabilidade do status
  const previews = selectedOrders.map((order) => {
    let situacao: { aplicavel: boolean; motivo: string } = {
      aplicavel: true,
      motivo: 'Apto para transição de status no SAP ECC',
    }

    if (order.status_op === 'ENCERRADA') {
      situacao = {
        aplicavel: false,
        motivo: 'Não aplicável: OP já se encontra encerrada tecnicamente (TECO).',
      }
    } else if (order.status_op === targetStatus) {
      situacao = {
        aplicavel: false,
        motivo: `Não aplicável: OP já está no status ${targetStatus}.`,
      }
    }

    return {
      order,
      situacao,
    }
  })

  const aptasCount = previews.filter((p) => p.situacao.aplicavel).length

  const handleExecute = async () => {
    if (submitting) return
    setErrorMsg(null)
    setSubmitting(true)

    try {
      const ordersPayload = selectedOrders.map((o) => ({
        op_number: o.op_number,
        current_status: o.status_op,
      }))

      const response = await pcpProductionService.executeMassStatusChange({
        target_status: targetStatus,
        orders: ordersPayload,
      })

      onSuccess(response)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha na alteração de status em massa no SAP.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-[#004C97]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Alteração de Status em Massa (COHV — SAP ECC)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Você selecionou <strong>{selectedOrders.length}</strong> Ordens de Produção.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Seletor de Novo Status Oficial SAP ECC */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-800 block">
                Novo Status de Destino (SAP ECC):
              </label>
              <span className="text-[11px] text-slate-500">
                Apenas status válidos reais do ciclo produtivo no SAP ECC (transação COHV).
              </span>
            </div>
            <div className="w-full sm:w-72">
              <Select
                value={targetStatus}
                onValueChange={(val) => setTargetStatus(val)}
                disabled={submitting}
              >
                <SelectTrigger className="h-9 text-xs bg-white">
                  <SelectValue placeholder="Selecione o novo status" />
                </SelectTrigger>
                <SelectContent>
                  {SAP_ECC_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className="font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 block">{opt.sapDesc}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Pré-validação */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="p-2.5 bg-slate-100 text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Pré-validação das Ordens Selecionadas</span>
              <span className="text-[11px] font-normal text-slate-600">
                <strong>{aptasCount}</strong> de {selectedOrders.length} ordens aptas para este
                status
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 border-b sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2 px-3 font-semibold">OP</th>
                    <th className="py-2 px-3 font-semibold">Material</th>
                    <th className="py-2 px-3 font-semibold">Centro</th>
                    <th className="py-2 px-3 font-semibold">Status Atual</th>
                    <th className="py-2 px-3 font-semibold">Novo Status</th>
                    <th className="py-2 px-3 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previews.map(({ order, situacao }) => (
                    <tr key={order.op_number} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-bold text-[#004C97]">
                        {order.op_number}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono text-[11px] text-slate-800">
                          {order.material_code}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {order.material_description}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        {order.centro_code}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px]">
                        <Badge variant="outline" className="text-[10px]">
                          {order.status_op}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-blue-700 font-semibold">
                        <div className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{targetStatus}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {situacao.aplicavel ? (
                          <div className="flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium">Apto</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-700">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-[11px]">{situacao.motivo}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExecute}
            disabled={submitting || aptasCount === 0}
            className="text-xs bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Processando no SAP ECC...
              </>
            ) : (
              `Confirmar Alteração (${aptasCount} OPs)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MassStatusChangeModal
