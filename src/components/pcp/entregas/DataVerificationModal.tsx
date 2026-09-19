import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react'
import { VerificationIssue } from '@/services/pcp-monthly-summaries'

interface DataVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  issues: VerificationIssue[]
  onProceedPublish?: () => void
  summaryCode: string
}

export const DataVerificationModal: React.FC<DataVerificationModalProps> = ({
  isOpen,
  onClose,
  issues,
  onProceedPublish,
  summaryCode,
}) => {
  const criticalCount = issues.filter((i) => i.severity === 'CRITICO').length
  const alertCount = issues.filter((i) => i.severity === 'ALERTA').length
  const infoCount = issues.filter((i) => i.severity === 'INFO').length

  const hasCritical = criticalCount > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-md text-white ${
                hasCritical ? 'bg-rose-600' : issues.length > 0 ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              <Database className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Verificação de Integridade Transacional dos Dados
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Auditoria cruzada com SAP ECC / MES 4.0 / Projeções MP ({summaryCode})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Status Geral */}
          <div
            className={`p-3 rounded-lg border flex items-start gap-3 ${
              hasCritical
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : issues.length > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            {hasCritical ? (
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : issues.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-xs uppercase tracking-wide">
                {hasCritical
                  ? 'Inconsistências Críticas Detectadas'
                  : issues.length > 0
                    ? 'Avisos de Alinhamento Identificados'
                    : 'Todos os Dados Auditados com Sucesso'}
              </div>
              <p className="text-xs leading-relaxed">
                {hasCritical
                  ? 'Foram identificadas divergências quantitativas entre o texto do relatório e os registros oficiais nos sistemas de origem. Recomenda-se ajustar antes da publicação.'
                  : issues.length > 0
                    ? 'Não há bloqueios impeditivos, porém alguns campos podem se beneficiar de atualização recente.'
                    : 'Os números de carteira, saldo de matéria-prima, produção prevista e histórico de assertividade coincidem perfeitamente com os módulos integrados.'}
              </p>
            </div>
          </div>

          {/* Tabela de Inconsistências */}
          {issues.length > 0 ? (
            <div className="space-y-2">
              <div className="font-bold text-slate-700 flex items-center justify-between">
                <span>Divergências Identificadas ({issues.length}):</span>
                <div className="flex gap-1.5">
                  {criticalCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]"
                    >
                      {criticalCount} Crítico(s)
                    </Badge>
                  )}
                  {alertCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]"
                    >
                      {alertCount} Alerta(s)
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                {issues.map((iss) => (
                  <div key={iss.id} className="p-3 space-y-1 hover:bg-slate-50/60">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {iss.section} &bull; {iss.field}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          iss.severity === 'CRITICO'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        {iss.severity}
                      </Badge>
                    </div>
                    <div className="text-slate-600">{iss.message}</div>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-mono">
                      <div className="text-slate-500">
                        No Resumo: <strong className="text-slate-900">{iss.declaredValue}</strong>
                      </div>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <div className="text-sky-700">
                        Fonte Oficial ({iss.sourceSystem}): <strong>{iss.sourceValue}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 border border-dashed rounded-lg bg-slate-50">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="font-bold text-slate-800">100% de Conformidade Validada</div>
              <div className="text-xs text-slate-500 mt-1">
                Nenhuma divergência apurada contra os registros do SAP e do PCP Robotizado.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-slate-300 text-slate-700"
          >
            Fechar Auditoria
          </Button>

          {onProceedPublish && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                onProceedPublish()
                onClose()
              }}
              className="text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-bold shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Prosseguir para Publicação</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default DataVerificationModal
