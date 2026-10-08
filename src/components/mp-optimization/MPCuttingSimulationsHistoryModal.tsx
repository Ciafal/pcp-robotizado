import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { History, Play, CheckCircle, Clock, Eye, Layers } from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { MPCuttingSimulationResult } from '@/types/mp-cutting-weight-standards'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'

interface MPCuttingSimulationsHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onLoadSimulation: (simulation: MPCuttingSimulationResult) => void
}

export const MPCuttingSimulationsHistoryModal: React.FC<MPCuttingSimulationsHistoryModalProps> = ({
  isOpen,
  onClose,
  onLoadSimulation,
}) => {
  const [history, setHistory] = useState<MPCuttingSimulationResult[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const data = await mpCuttingWeightStandardsService.listSimulations()
      setHistory(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-slate-50 border-blue-900/20 p-6">
        <ErrorBoundary
          fallback={<div className="p-4 text-red-600">Erro ao carregar histórico.</div>}
        >
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-900 text-white shadow-sm">
                <History className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-blue-950 flex items-center gap-2">
                  Histórico de Simulações de Corte
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rastreabilidade completa de simulações, padrões utilizados e cenários calculados
                  pelo PCP
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-200">
                  <TableRow>
                    <TableHead className="w-32 text-xs font-bold text-slate-700">
                      Simulação
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Data / Hora</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">
                      Centro / Material
                    </TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Critério</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Padrões</TableHead>
                    <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                    <TableHead className="w-24 text-right text-xs font-bold text-slate-700">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Carregando histórico de simulações...
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        Nenhuma simulação registrada no banco de dados ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((sim) => (
                      <TableRow
                        key={sim.id || sim.simulation_code}
                        className="hover:bg-slate-50/80"
                      >
                        <TableCell className="font-mono text-xs font-bold text-blue-900">
                          {sim.simulation_code}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {sim.created ? new Date(sim.created).toLocaleString('pt-BR') : 'Recent'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="font-semibold text-slate-900">{sim.center_code}</span>
                          <span className="text-slate-400 block text-[11px]">
                            {sim.material_code}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {sim.optimization_criterion}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">
                          {(sim.selected_standard_codes || []).join(', ') || 'Padrão Nominal'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              sim.status === 'APROVADO_PCP'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }
                          >
                            {sim.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onLoadSimulation(sim)
                              onClose()
                            }}
                            className="h-7 text-xs gap-1 border-blue-900 text-blue-900 hover:bg-blue-50"
                          >
                            <Eye className="w-3 h-3" /> Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
