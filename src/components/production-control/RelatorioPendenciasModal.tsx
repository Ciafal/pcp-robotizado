import React, { useState } from 'react'
import {
  FileText,
  Printer,
  AlertTriangle,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
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
import { ChecklistFechamentoExecucao, ChecklistFechamentoItem } from '@/types/checklist-fechamento'

interface Props {
  open: boolean
  onClose: () => void
  execucao: ChecklistFechamentoExecucao | null
  itens: ChecklistFechamentoItem[]
}

export const RelatorioPendenciasModal: React.FC<Props> = ({ open, onClose, execucao, itens }) => {
  const itensPendentesOuErro = itens.filter((i) => i.status === 'ERRO' || i.status === 'PENDENTE')

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Relatório de Pendências do Fechamento
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Competência {execucao?.competencia || '-'} — CIAFAL Controle de Produção
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Salvar
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* Resumo da Competência */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-slate-400 block text-[10px]">Total de Itens</span>
              <span className="font-bold text-slate-800 text-sm">{itens.length}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Pendências Totais</span>
              <span className="font-bold text-amber-700 text-sm">
                {itensPendentesOuErro.length}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Itens com ERRO</span>
              <span className="font-bold text-rose-700 text-sm">
                {itens.filter((i) => i.status === 'ERRO').length}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Obrigatórias em Aberto</span>
              <span className="font-bold text-rose-800 text-sm">
                {itensPendentesOuErro.filter((i) => i.obrigatoria).length}
              </span>
            </div>
          </div>

          {/* Listagem de Pendências */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-800 block text-xs">
              Atividades Pendentes de Regularização:
            </span>

            {itensPendentesOuErro.length === 0 ? (
              <div className="p-8 text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg font-medium">
                Parabéns! Nenhuma pendência ou erro em aberto para a competência selecionada.
              </div>
            ) : (
              itensPendentesOuErro.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-200 rounded-lg bg-white space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{item.codigo}</span>
                      <span className="font-semibold text-slate-900">{item.titulo}</span>
                      {item.obrigatoria && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                          Obrigatória
                        </Badge>
                      )}
                    </div>
                    <Badge
                      className={
                        item.status === 'ERRO'
                          ? 'bg-rose-100 text-rose-800 border-rose-300 text-[10px]'
                          : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    {item.descricao_detalhada}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>
                      Área: <strong>{item.area_responsavel}</strong>
                    </span>
                    <span>
                      SAP: <strong>{item.transacao_sap}</strong>
                    </span>
                    {item.deposito_sap && (
                      <span>
                        Depósito: <strong>{item.deposito_sap}</strong>
                      </span>
                    )}
                    {item.ordem_material_lote && (
                      <span className="text-rose-700 font-semibold">
                        Ref: {item.ordem_material_lote}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-[#004C97] text-white"
          >
            Fechar Relatório
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
