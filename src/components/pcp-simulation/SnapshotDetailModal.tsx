import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CommercialSimulationRecord } from '@/types/pcp-commercial-simulation'
import { formatNumberPtBr } from '@/lib/number-format'
import { History, ShieldCheck, Calendar, CheckCircle2, Clock } from 'lucide-react'

interface SnapshotDetailModalProps {
  isOpen: boolean
  onClose: () => void
  simulation: CommercialSimulationRecord | null
  snapshot: any | null
}

export const SnapshotDetailModal: React.FC<SnapshotDetailModalProps> = ({
  isOpen,
  onClose,
  simulation,
  snapshot,
}) => {
  if (!simulation) return null

  const kpis = snapshot?.kpis_snapshot || {}
  const rawMat = snapshot?.raw_material_snapshot || []
  const centers = snapshot?.production_centers_snapshot || []
  const delayed = snapshot?.delayed_orders_snapshot || []

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Simulação {simulation.simulation_code}</span>
                  <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-xs">
                    SNAPSHOT IMUTÁVEL
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Registro histórico congelado no momento da análise comercial.
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-xs px-2.5 py-1 flex items-center gap-1.5 border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Integridade Auditada
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-5 py-4">
          {/* Cabeçalho do Snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Cliente:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {simulation.customer_name}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Produto / Código:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {simulation.product_code}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Quantidade Solicitada:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatNumberPtBr(simulation.requested_quantity_tons, 1)} t
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Prazo Solicitado:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {simulation.requested_deadline}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Melhor Data Calculada:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {simulation.best_date_possible}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Viabilidade Técnica:</span>
              <span className="font-semibold">{simulation.viability}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Status da Decisão PCP:</span>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {simulation.approval_status}
              </Badge>
            </div>
            <div>
              <span className="text-slate-500 block">Criado por:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {simulation.created_by_name || simulation.created_by_email || 'Comercial'}
              </span>
            </div>
          </div>

          {/* Cards Sintetizados do Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
              <span className="text-slate-500 block font-medium">Atendimento no Prazo</span>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatNumberPtBr(
                  kpis.quantity_possible_requested_date ||
                    simulation.quantity_possible_requested_date,
                  1,
                )}{' '}
                t
                <span className="text-xs font-normal text-slate-500 ml-1">
                  ({kpis.quantity_possible_requested_pct || 100}%)
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
              <span className="text-slate-500 block font-medium">Situação da Matéria-Prima</span>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {kpis.raw_material_label || simulation.raw_material_status}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
              <span className="text-slate-500 block font-medium">Impacto na Capacidade</span>
              <div className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                {simulation.capacity_impact_text || 'Análise de capacidade registrada no snapshot'}
              </div>
            </div>
          </div>

          {/* Centros de Produção no Snapshot */}
          {centers.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                Centros Produtivos Avaliados
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Centro</TableHead>
                    <TableHead className="text-xs">Linha</TableHead>
                    <TableHead className="text-xs">Produtividade</TableHead>
                    <TableHead className="text-xs">Tempo Necessário</TableHead>
                    <TableHead className="text-xs">Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.map((c: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs font-bold">{c.center_code}</TableCell>
                      <TableCell className="text-xs">{c.line_name}</TableCell>
                      <TableCell className="text-xs">
                        {formatNumberPtBr(c.productivity_rate_th, 1)} t/h
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatNumberPtBr(c.required_hours, 1)} h
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                        {c.situation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resposta Executiva do Snapshot */}
          {snapshot?.commercial_response_snapshot?.executive_recommendation && (
            <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs leading-relaxed">
              <span className="font-bold text-blue-900 dark:text-blue-300 block mb-1">
                Recomendação Executiva Registrada no Snapshot:
              </span>
              <p className="text-slate-800 dark:text-slate-200">
                {snapshot.commercial_response_snapshot.executive_recommendation}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium text-xs transition"
          >
            Fechar Snapshot
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
