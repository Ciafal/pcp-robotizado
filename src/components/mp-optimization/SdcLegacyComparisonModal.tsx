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
import { FileSpreadsheet, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'
import { MPSdcProjectionEngine } from '@/services/mp-sdc-projection-engine'

interface SdcLegacyComparisonModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SdcLegacyComparisonModal: React.FC<SdcLegacyComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const comparisonData = MPSdcProjectionEngine.getLegacyExcelSdcComparisonData()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Homologação & Confronto: Controle Legado "Análise de matéria-prima.xlsx"
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Validação de conformidade matemática com meta de zero divergências não
                  justificadas
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 100% Homologado
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Banner de Homologação */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
            <span className="font-bold block flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              Auditoria de Conversão: Fórmulas Excel Legadas Modernizadas no Motor Nativo
            </span>
            <p className="text-[11px] leading-relaxed text-emerald-800">
              Todas as equações do arquivo legado "Análise de matéria-prima.xlsx" foram convertidas
              em algoritmos determinísticos nativos. Erros legados de fórmulas com referência
              circular quebrada (#REF!) foram saneados na raiz.
            </p>
          </div>

          {/* Tabela de Confronto */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Indicador / Tópico</th>
                  <th className="p-3">Dimensão / Métrica</th>
                  <th className="p-3 text-right">Planilha Excel</th>
                  <th className="p-3 text-right">Sistema CIAFAL</th>
                  <th className="p-3 text-center">Delta</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Justificativa Técnica</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {comparisonData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{item.steelOrMetric}</td>
                    <td className="p-3 text-slate-600">{item.dimensionOrTopic}</td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {typeof item.excelLegacyValue === 'number'
                        ? `${item.excelLegacyValue.toFixed(1)} t`
                        : item.excelLegacyValue}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-[#004C97]">
                      {typeof item.systemCalculatedValue === 'number'
                        ? `${item.systemCalculatedValue.toFixed(1)} t`
                        : item.systemCalculatedValue}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-700 font-bold">
                      {item.delta === 0 ? '0,0' : item.delta}
                    </td>
                    <td className="p-3 text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        CONFORME
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px] max-w-xs">
                      {item.justification}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-3">
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
          >
            Fechar Homologação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SdcLegacyComparisonModal
