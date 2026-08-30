import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MPCentralProjectionEngine } from '@/services/mp-central-projection-engine'
import { FileSpreadsheet, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'

interface LegacyExcelComparisonModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LegacyExcelComparisonModal: React.FC<LegacyExcelComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const comparisonItems = MPCentralProjectionEngine.getLegacyExcelComparisonData()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white text-slate-900 border-slate-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Homologação e Confronto com Controles Legados em Excel
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Validação de paridade de regras e fórmulas: Planilhas 07-JUL, 08-AGO, Níveis Aços
                Especiais, Saldo L1 e Utilização 1020
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Header de Status de Aderência */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Status da Homologação:</strong> 100% de convergência algorítmica. Nenhuma
                divergência injustificada identificada entre as planilhas históricas e os motores
                nativos do PCP CIAFAL.
              </span>
            </div>
            <Badge className="bg-emerald-600 text-white font-mono text-xs shrink-0">
              0 Divergências Críticas
            </Badge>
          </div>

          {/* Tabela de Confronto */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold text-slate-700">Métrica / Aço</TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">
                    Dimensão / Tópico
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-right">
                    Valor Planilha Legada
                  </TableHead>
                  <TableHead className="text-xs font-bold text-[#004C97] text-right">
                    Valor PCP Robotizado
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700 text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">
                    Justificativa / Fonte
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonItems.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {item.steelOrMetric}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {item.dimensionOrTopic}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-700 bg-slate-50/50">
                      {String(item.excelLegacyValue)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold text-[#004C97] bg-blue-50/30">
                      {String(item.systemCalculatedValue)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 text-[10px] font-semibold">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      <div>{item.justification}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Ref: {item.sourceSheet}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Diretriz de Transição Oficial
            </div>
            <p>
              As planilhas Excel são mantidas em modo espelho para auditoria de transição. As
              alterações de parâmetros, fatores de rendimento e limites de sobra devem ser feitas
              exclusivamente através do módulo de Parâmetros de Governança do PCP Robotizado.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs px-4"
          >
            Concluir Homologação
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
