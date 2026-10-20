import React from 'react'
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
import { CheckCircle2, XCircle, AlertTriangle, Download, RefreshCw } from 'lucide-react'
import type { ProductionMassOperationResult } from '@/types/pcp-production'

interface MassOperationResultModalProps {
  isOpen: boolean
  onClose: () => void
  operationTitle: string
  batchId: string
  summary: { total: number; success: number; failed: number }
  results: ProductionMassOperationResult[]
  onRefreshData?: () => void
}

export const MassOperationResultModal: React.FC<MassOperationResultModalProps> = ({
  isOpen,
  onClose,
  operationTitle,
  batchId,
  summary,
  results,
  onRefreshData,
}) => {
  if (!isOpen) return null

  const handleExportCSV = () => {
    if (results.length === 0) return
    const headers = [
      'Lote_Batch_ID',
      'OP',
      'Resultado',
      'Status_Anterior',
      'Novo_Status',
      'Mensagem_SAP_ECC',
      'Conflito_Concorrencia',
    ]

    const rows = results.map((r) => [
      batchId,
      r.op_number,
      r.success ? 'SUCESSO' : 'FALHA',
      r.previous_status || '-',
      r.new_status || '-',
      `"${(r.message || '').replace(/"/g, '""')}"`,
      r.concurrency_conflict ? 'SIM' : 'NAO',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `resultado-operacao-massa-${batchId}-${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFinish = () => {
    if (onRefreshData) {
      onRefreshData()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleFinish()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Resultado da Operação: {operationTitle}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-0.5">
                Identificador de Lote:{' '}
                <strong className="font-mono text-[#004C97]">{batchId}</strong>
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 text-xs bg-white text-[#004C97] border-slate-200"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Exportar resultado
            </Button>
          </div>
        </DialogHeader>

        {/* Resumo Processadas / Sucesso / Falha */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="p-3 rounded-lg border bg-slate-50 border-slate-200 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">
              Processadas
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-0.5 block">
              {summary.total}
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-emerald-50 border-emerald-200 text-center">
            <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
              Sucesso
            </span>
            <span className="text-xl font-bold font-mono text-emerald-800 mt-0.5 block">
              {summary.success}
            </span>
          </div>

          <div className="p-3 rounded-lg border bg-rose-50 border-rose-200 text-center">
            <span className="text-[10px] uppercase font-semibold text-rose-700 block">
              Falha / Bloqueadas
            </span>
            <span className="text-xl font-bold font-mono text-rose-800 mt-0.5 block">
              {summary.failed}
            </span>
          </div>
        </div>

        {/* Tabela de Resultados por OP */}
        <div className="border border-slate-200 rounded-lg overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">OP</th>
                <th className="py-2.5 px-3 text-center">Resultado</th>
                <th className="py-2.5 px-3">Status Anterior</th>
                <th className="py-2.5 px-3">Novo Status</th>
                <th className="py-2.5 px-3">Mensagem do SAP ECC / Validador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {results.map((item, idx) => (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50 ${
                    item.success
                      ? ''
                      : item.concurrency_conflict
                        ? 'bg-amber-50/50'
                        : 'bg-rose-50/30'
                  }`}
                >
                  <td className="py-2 px-3 font-mono font-bold text-[#004C97] whitespace-nowrap">
                    {item.op_number}
                  </td>
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    {item.success ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 text-[10px] font-semibold">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Sucesso
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200 text-[10px] font-semibold">
                        <XCircle className="w-3 h-3 mr-1" />
                        Falha
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {item.previous_status || '-'}
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    {item.new_status || '-'}
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    <div className="flex items-start gap-1">
                      {item.concurrency_conflict && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <span
                        className={item.concurrency_conflict ? 'text-amber-900 font-medium' : ''}
                      >
                        {item.message}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-end">
          <Button
            variant="default"
            size="sm"
            onClick={handleFinish}
            className="text-xs bg-[#004C97] hover:bg-[#003d7a] text-white"
          >
            Concluir e Atualizar Visão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MassOperationResultModal
