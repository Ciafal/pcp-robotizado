import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import {
  Layers,
  Scale,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Scissors,
  BarChart3,
  Flame,
  FileText,
} from 'lucide-react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import type { MPCuttingScenarioItem } from '@/types/mp-cutting-weight-standards'

interface MPCuttingScenarioDetailModalProps {
  isOpen: boolean
  onClose: () => void
  scenario: MPCuttingScenarioItem | null
  criterionName?: string
}

export const MPCuttingScenarioDetailModal: React.FC<MPCuttingScenarioDetailModalProps> = ({
  isOpen,
  onClose,
  scenario,
  criterionName = 'Melhor Rendimento e Equilíbrio',
}) => {
  if (!scenario) return null

  const comp = scenario.composition

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 border-blue-900/20 p-6">
        <ErrorBoundary
          fallback={
            <div className="p-4 text-red-600">Erro ao renderizar popup de detalhamento.</div>
          }
        >
          <DialogHeader className="border-b border-slate-200 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-900 text-white shadow-sm">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-blue-950 flex items-center gap-2">
                    {scenario.name}
                    <Badge
                      variant="outline"
                      className={
                        scenario.status === 'VIÁVEL'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }
                    >
                      {scenario.status}
                    </Badge>
                  </DialogTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Composição completa do plano de corte, distribuição de pesos e parâmetros
                    técnicos da Ficha Mestra
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Justificativa Técnica da IA CIAFAL Orientativa */}
            <div className="bg-gradient-to-r from-blue-900/10 via-blue-50 to-indigo-50/50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-blue-900 text-white mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                    Justificativa Técnica da IA (Critério: {criterionName})
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {comp.technical_justification}
                  </p>
                </div>
              </div>
            </div>

            {/* Inviabilidade / Alertas */}
            {scenario.status === 'INVIÁVEL' && (
              <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-xs font-medium">
                  <strong>Restrição Violada:</strong>{' '}
                  {scenario.inviability_reason ||
                    'Disponibilidade de matéria-prima ou limites operacionais excedidos.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Resumo Executivo: Balanço de Massa e Rendimento */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Rendimento Metálico
                </span>
                <span className="text-lg font-bold text-blue-950 mt-1 block">
                  {scenario.yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                </span>
                <span className="text-[10px] text-slate-400">Aproveitamento total</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Peso Aproveitado
                </span>
                <span className="text-lg font-bold text-slate-900 mt-1 block">
                  {(scenario.used_weight_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-slate-400">
                  {scenario.produced_quantity} peças produzidas
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Perda de Corte (Apara/Carepa)
                </span>
                <span className="text-lg font-bold text-amber-700 mt-1 block">
                  {(scenario.cutting_loss_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-slate-400">
                  {comp.theoretical_loss_pct || 1.3}% Ficha Mestra
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Sobra Estimada de MP
                </span>
                <span className="text-lg font-bold text-slate-700 mt-1 block">
                  {(scenario.estimated_leftover_kg / 1000).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3,
                  })}{' '}
                  t
                </span>
                <span className="text-[10px] text-slate-400">Retorno para estoque</span>
              </div>
            </div>

            {/* Comparação Ideal x Calculado x Padrão */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-blue-900" /> Comparação com o Padrão de Peso
                Utilizado
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded border">
                <div>
                  <span className="text-slate-500 block">Padrão Utilizado:</span>
                  <span className="font-bold text-blue-950 font-mono">
                    {scenario.used_standard_code}
                  </span>{' '}
                  — {scenario.used_standard_description}
                </div>
                <div>
                  <span className="text-slate-500 block">Peso Ideal vs Calculado:</span>
                  <span className="font-semibold text-slate-900">
                    Ideal:{' '}
                    {(scenario.target_weight_kg / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}{' '}
                    t
                  </span>
                  <br />
                  <span className="font-bold text-blue-900">
                    Calculado:{' '}
                    {(scenario.calculated_weight_kg / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}{' '}
                    t
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Desvio / Faixa Permitida:</span>
                  <span
                    className={`font-bold ${
                      Math.abs(scenario.deviation_pct) > 2 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {scenario.deviation_kg > 0 ? '+' : ''}
                    {(scenario.deviation_kg / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}{' '}
                    t ({scenario.deviation_pct}%)
                  </span>
                  <br />
                  <span className="text-slate-600">
                    Faixa:{' '}
                    {(scenario.min_allowed_weight_kg / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}{' '}
                    a{' '}
                    {(scenario.max_allowed_weight_kg / 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    })}{' '}
                    t
                  </span>
                </div>
              </div>
            </div>

            {/* Parâmetros Técnicos da Ficha Mestra Integrada */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-900" /> Parâmetros Técnicos Reais da Ficha
                Mestra
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-slate-50 rounded border">
                  <span className="text-slate-500 block text-[11px]">Bitola / Dimensão:</span>
                  <span className="font-semibold text-slate-900">
                    {comp.gauge_dimension || 'N/D'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border">
                  <span className="text-slate-500 block text-[11px]">Massa Linear Teórica:</span>
                  <span className="font-semibold text-slate-900">
                    {comp.linear_mass_kg_m ? `${comp.linear_mass_kg_m} kg/m` : 'N/D'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border">
                  <span className="text-slate-500 block text-[11px]">
                    Largura de Corte (Serra):
                  </span>
                  <span className="font-semibold text-slate-900">
                    {comp.cutting_width_mm ? `${comp.cutting_width_mm} mm` : 'N/D'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded border">
                  <span className="text-slate-500 block text-[11px]">
                    Total de Golpes de Corte:
                  </span>
                  <span className="font-semibold text-slate-900">
                    {comp.total_cuts_count} cortes
                  </span>
                </div>
              </div>
            </div>

            {/* Distribuição de Pesos por Peça / Amostral */}
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-blue-900" /> Distribuição de Pesos por Peça
              </h4>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Item #</TableHead>
                      <TableHead className="text-xs font-bold">Tipo</TableHead>
                      <TableHead className="text-xs font-bold">Peso Ideal (t)</TableHead>
                      <TableHead className="text-xs font-bold">Peso Calculado (t)</TableHead>
                      <TableHead className="text-xs font-bold">Faixa Tolerância (t)</TableHead>
                      <TableHead className="text-xs font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comp.distribution.map((d) => (
                      <TableRow key={d.item_index} className="text-xs">
                        <TableCell className="font-mono font-medium">#{d.item_index}</TableCell>
                        <TableCell>{d.item_type}</TableCell>
                        <TableCell>
                          {(d.target_kg / 1000).toLocaleString('pt-BR', {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })}{' '}
                          t
                        </TableCell>
                        <TableCell className="font-bold text-blue-950">
                          {(d.calculated_kg / 1000).toLocaleString('pt-BR', {
                            minimumFractionDigits: 3,
                            maximumFractionDigits: 3,
                          })}{' '}
                          t
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {d.tolerance_range_kg ? d.tolerance_range_kg.replace(/kg/g, 't') : ''}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              d.status === 'CONFORME'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                : 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                            }
                          >
                            {d.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Restrições Atendidas e Alertas Industriais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3">
                <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-700" /> Restrições Industriais
                  Atendidas
                </h5>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                  {comp.satisfied_restrictions.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3">
                <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-700" /> Alertas Operacionais PCP
                </h5>
                <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                  {comp.industrial_alerts.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between w-full text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-900" /> Arquitetura preparada para
                RFC/BAPI SAP futura (sem gravação SAP nesta etapa).
              </span>
              <Button variant="outline" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
