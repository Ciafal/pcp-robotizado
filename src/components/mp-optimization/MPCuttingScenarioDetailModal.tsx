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
  Info,
  Boxes,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  const isMultiples = scenario.cutting_type === 'MULTIPLOS'
  const plateInfo = comp.plate_info

  // Dados calculados para Múltiplos
  const grossPlateTons =
    plateInfo?.gross_weight_tons ?? (scenario.input_weight_kg ? scenario.input_weight_kg / 1000 : 0)
  const technicalLossTons =
    plateInfo?.technical_loss_tons ??
    (scenario.cutting_loss_kg ? scenario.cutting_loss_kg / 1000 : 0)
  const netAvailableTons =
    plateInfo?.net_available_weight_tons ?? Math.max(0, grossPlateTons - technicalLossTons)
  const usedWeightTons =
    plateInfo?.used_weight_tons ?? (scenario.used_weight_kg ? scenario.used_weight_kg / 1000 : 0)
  const leftoverWeightTons =
    plateInfo?.leftover_weight_tons ??
    (scenario.estimated_leftover_kg ? scenario.estimated_leftover_kg / 1000 : 0)
  const producedPiecesCount = scenario.produced_quantity

  // Linhas aplicáveis do sumário de múltiplos
  const multiplesSummary = comp.multiples_summary || []
  const hasSummary = multiplesSummary.length > 0
  const totalSummaryQty = multiplesSummary.reduce((acc, it) => acc + it.quantity, 0)
  const totalSummaryWeight = multiplesSummary.reduce((acc, it) => acc + it.total_weight_tons, 0)

  // Segmentos de massa para o visual proporcional da placa
  const massSegments = comp.mass_fractions?.segments || [
    {
      type: 'BLOCO' as const,
      label: `Blocos (${usedWeightTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t)`,
      weight_tons: usedWeightTons,
      percentage:
        grossPlateTons > 0 ? Number(((usedWeightTons / grossPlateTons) * 100).toFixed(2)) : 0,
      color: '#1e3a8a',
    },
    ...(technicalLossTons > 0
      ? [
          {
            type: 'PERDA' as const,
            label: `Perdas (${technicalLossTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t)`,
            weight_tons: technicalLossTons,
            percentage:
              grossPlateTons > 0
                ? Number(((technicalLossTons / grossPlateTons) * 100).toFixed(2))
                : 0,
            color: '#d97706',
          },
        ]
      : []),
    ...(leftoverWeightTons > 0
      ? [
          {
            type: 'SOBRA' as const,
            label: `Sobra (${leftoverWeightTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t)`,
            weight_tons: leftoverWeightTons,
            percentage:
              grossPlateTons > 0
                ? Number(((leftoverWeightTons / grossPlateTons) * 100).toFixed(2))
                : 0,
            color: '#64748b',
          },
        ]
      : []),
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-50 border-blue-900/20 p-6">
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
                    {isMultiples
                      ? 'Cenário de Corte para Múltiplos — Máximo Aproveitamento da Placa'
                      : scenario.name}
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
                    {isMultiples
                      ? `${scenario.name} &bull; Otimização física por massa, aproveitamento da placa e balanço estrito de matéria-prima`
                      : 'Composição completa do plano de corte, distribuição de pesos e parâmetros técnicos da Ficha Mestra'}
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

            {/* Bloco Obrigatório: Matéria-Prima Utilizada (se Múltiplos ou rastreado) */}
            {(scenario.batch_number || scenario.raw_material_code) && (
              <div className="bg-slate-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-blue-900" /> Matéria-Prima Utilizada
                  </h4>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono bg-white text-blue-900 border-blue-300"
                  >
                    Lote Vinculado
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Código
                    </span>
                    <span className="font-mono font-bold text-blue-950 block mt-0.5">
                      {scenario.raw_material_code || '-'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200 sm:col-span-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Descrição do Material
                    </span>
                    <span
                      className="font-medium text-slate-800 block mt-0.5 truncate"
                      title={scenario.raw_material_description}
                    >
                      {scenario.raw_material_description || '-'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Lote
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono bg-blue-50 text-blue-900 border-blue-300 text-xs font-bold mt-0.5"
                    >
                      {scenario.batch_number || '-'}
                    </Badge>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Estoque Inicial Disp.
                    </span>
                    <span className="font-mono font-bold text-slate-900 block mt-0.5">
                      {scenario.batch_initial_stock != null
                        ? `${scenario.batch_initial_stock.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} ${scenario.batch_unit || 't'}`
                        : '-'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Qtd. Utilizada
                    </span>
                    <span className="font-mono font-bold text-blue-900 block mt-0.5">
                      {scenario.batch_used_quantity != null
                        ? `${scenario.batch_used_quantity.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} ${scenario.batch_unit || 't'}`
                        : `${(scenario.used_weight_kg / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t`}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                      Saldo Projetado
                    </span>
                    <span className="font-mono font-bold text-emerald-800 block mt-0.5">
                      {scenario.batch_projected_balance != null
                        ? `${scenario.batch_projected_balance.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} ${scenario.batch_unit || 't'}`
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                  <span>
                    Aproveitamento da MP:{' '}
                    <strong className="text-blue-950 font-bold">
                      {scenario.yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                    </strong>
                  </span>
                  {scenario.storage_location && (
                    <span>
                      Depósito:{' '}
                      <strong className="font-mono text-slate-800">
                        {scenario.storage_location}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* APRESENTAÇÃO ESPECÍFICA PARA CORTE DE MÚLTIPLOS */}
            {isMultiples ? (
              <>
                {/* 5 CARDS OBRIGATÓRIOS PARA MÚLTIPLOS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Rendimento da Placa %
                    </span>
                    <span className="text-lg font-bold text-blue-950 mt-1 block">
                      {scenario.yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                    </span>
                    <span className="text-[10px] text-slate-400">Aproveitamento total</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Peso Total Aproveitado t
                    </span>
                    <span className="text-lg font-bold text-slate-900 mt-1 block">
                      {usedWeightTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      t
                    </span>
                    <span className="text-[10px] text-slate-400">Soma dos blocos produzidos</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Quantidade de Blocos
                    </span>
                    <span className="text-lg font-bold text-blue-900 mt-1 block">
                      {producedPiecesCount}{' '}
                      <span className="text-xs font-normal text-slate-500">un inteira(s)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Sem fracionamento</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Peso Total de Perdas t
                    </span>
                    <span className="text-lg font-bold text-amber-700 mt-1 block">
                      {technicalLossTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      t
                    </span>
                    <span className="text-[10px] text-slate-400">Perdas técnicas cadastradas</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                      Sobra Final da Placa t
                    </span>
                    <span className="text-lg font-bold text-slate-700 mt-1 block">
                      {leftoverWeightTons.toLocaleString('pt-BR', {
                        minimumFractionDigits: 3,
                        maximumFractionDigits: 3,
                      })}{' '}
                      t
                    </span>
                    <span className="text-[10px] text-slate-400">Não é bloco válido</span>
                  </div>
                </div>

                {/* QUADRO DE IDENTIFICAÇÃO DA PLACA E DO CORTE */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-900" /> Identificação da Placa e Parâmetros
                    de Entrada
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-slate-50 p-3 rounded border">
                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Material
                      </span>
                      <span
                        className="font-mono font-bold text-blue-950 block mt-0.5 truncate"
                        title={scenario.raw_material_code || scenario.used_standard_code}
                      >
                        {scenario.raw_material_code ||
                          scenario.used_standard_code ||
                          'Dado não disponível'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Lote
                      </span>
                      <span className="font-mono font-bold text-slate-900 block mt-0.5">
                        {scenario.batch_number || 'Dado não disponível'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Placa
                      </span>
                      <span className="font-mono font-bold text-blue-900 block mt-0.5">
                        {plateInfo?.plate_code ||
                          (scenario.batch_number
                            ? `PLACA-${scenario.batch_number}`
                            : 'Dado não disponível')}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Peso Bruto
                      </span>
                      <span className="font-mono font-bold text-slate-900 block mt-0.5">
                        {grossPlateTons > 0
                          ? `${grossPlateTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t`
                          : 'Dado não disponível'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Peso Útil Disponível
                      </span>
                      <span className="font-mono font-bold text-emerald-800 block mt-0.5">
                        {netAvailableTons > 0
                          ? `${netAvailableTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t`
                          : 'Dado não disponível'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                        Bloco de Referência
                      </span>
                      <span
                        className="font-mono font-medium text-slate-800 block mt-0.5 truncate"
                        title={plateInfo?.reference_block || scenario.used_standard_description}
                      >
                        {plateInfo?.reference_block ||
                          scenario.used_standard_description ||
                          'Dado não disponível'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* NOVO QUADRO: DISTRIBUIÇÃO DE CORTE DA PLACA (BARRA HORIZONTAL PROPORCIONAL À MASSA) */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-900" /> Distribuição de Corte da Placa
                      (Divisão Proporcional em Massa)
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      Aproveitamento:{' '}
                      <strong className="text-blue-950 font-bold">
                        {scenario.yield_pct.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%
                      </strong>{' '}
                      | Peso Bruto:{' '}
                      <strong className="text-slate-900">
                        {grossPlateTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                      </strong>
                    </span>
                  </div>

                  {/* Barra horizontal representando 100% da placa */}
                  <div className="space-y-2">
                    <div className="w-full h-10 bg-slate-100 rounded-lg overflow-hidden flex border border-slate-300 shadow-inner">
                      {massSegments.map((seg, idx) => {
                        const widthPct = Math.max(0.5, seg.percentage)
                        const bgStyle =
                          seg.type === 'BLOCO'
                            ? idx % 2 === 0
                              ? 'bg-blue-900 hover:bg-blue-800'
                              : 'bg-indigo-800 hover:bg-indigo-700'
                            : seg.type === 'PERDA'
                              ? 'bg-amber-600 hover:bg-amber-500'
                              : 'bg-slate-400 hover:bg-slate-500'

                        return (
                          <div
                            key={idx}
                            style={{ width: `${widthPct}%` }}
                            className={`${bgStyle} h-full transition-all duration-200 flex items-center justify-center relative group border-r border-white/20 last:border-r-0`}
                            title={`${seg.label}: ${seg.weight_tons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t (${seg.percentage.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%)`}
                          >
                            {seg.percentage >= 6 && (
                              <span className="text-[10px] font-mono font-bold text-white px-1 truncate select-none drop-shadow-xs">
                                {seg.label}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Legenda explicativa com pesos individuais e percentuais */}
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded bg-blue-900 inline-block" />
                        <span className="text-slate-700">
                          Blocos Produzidos:{' '}
                          <strong className="font-mono text-blue-950">
                            {usedWeightTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                          </strong>{' '}
                          (
                          {grossPlateTons > 0
                            ? ((usedWeightTons / grossPlateTons) * 100).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                            : '0,00'}
                          %)
                        </span>
                      </div>

                      {technicalLossTons > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-amber-600 inline-block" />
                          <span className="text-slate-700">
                            Perdas Técnicas:{' '}
                            <strong className="font-mono text-amber-900">
                              {technicalLossTons.toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                              })}{' '}
                              t
                            </strong>{' '}
                            (
                            {grossPlateTons > 0
                              ? ((technicalLossTons / grossPlateTons) * 100).toLocaleString(
                                  'pt-BR',
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )
                              : '0,00'}
                            %)
                          </span>
                        </div>
                      )}

                      {leftoverWeightTons > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded bg-slate-400 inline-block" />
                          <span className="text-slate-700">
                            Sobra Final da Placa:{' '}
                            <strong className="font-mono text-slate-800">
                              {leftoverWeightTons.toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                              })}{' '}
                              t
                            </strong>{' '}
                            (
                            {grossPlateTons > 0
                              ? ((leftoverWeightTons / grossPlateTons) * 100).toLocaleString(
                                  'pt-BR',
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )
                              : '0,00'}
                            %)
                          </span>
                        </div>
                      )}

                      <span className="text-[11px] text-slate-400 ml-auto italic">
                        Balanço fechado:{' '}
                        {grossPlateTons.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t
                      </span>
                    </div>
                  </div>
                </div>

                {/* QUADRO: DISTRIBUIÇÃO DE CORTE (TABELA SIMPLIFICADA POR PADRÃO DE BLOCO) */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Scissors className="w-4 h-4 text-blue-900" /> Distribuição de Corte
                  </h4>

                  <div className="overflow-x-auto rounded border border-slate-200">
                    <Table className="min-w-[500px]">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="text-xs font-bold">Bloco</TableHead>
                          <TableHead className="text-xs font-bold text-center w-[120px]">
                            Quantidade
                          </TableHead>
                          <TableHead className="text-xs font-bold text-right w-[140px]">
                            Peso Unitário
                          </TableHead>
                          <TableHead className="text-xs font-bold text-right w-[140px]">
                            Peso Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hasSummary ? (
                          multiplesSummary.map((row, idx) => (
                            <TableRow key={idx} className="text-xs hover:bg-slate-50/80">
                              <TableCell className="font-semibold text-slate-900">
                                {row.block_standard}
                              </TableCell>
                              <TableCell className="font-mono font-bold text-center text-blue-900">
                                {row.quantity} un
                              </TableCell>
                              <TableCell className="font-mono text-right text-slate-700">
                                {row.unit_weight_tons.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })}{' '}
                                t
                              </TableCell>
                              <TableCell className="font-mono font-bold text-right text-blue-950">
                                {row.total_weight_tons.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 3,
                                  maximumFractionDigits: 3,
                                })}{' '}
                                t
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow className="text-xs hover:bg-slate-50/80">
                            <TableCell className="font-semibold text-slate-900">
                              {scenario.used_standard_description || 'Bloco Padrão'}
                            </TableCell>
                            <TableCell className="font-mono font-bold text-center text-blue-900">
                              {scenario.produced_quantity} un
                            </TableCell>
                            <TableCell className="font-mono text-right text-slate-700">
                              {(scenario.target_weight_kg / 1000).toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}{' '}
                              t
                            </TableCell>
                            <TableCell className="font-mono font-bold text-right text-blue-950">
                              {(scenario.used_weight_kg / 1000).toLocaleString('pt-BR', {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}{' '}
                              t
                            </TableCell>
                          </TableRow>
                        )}
                        {/* Linha Totalizadora Obrigatória */}
                        <TableRow className="text-xs bg-slate-100/80 font-bold border-t-2 border-slate-300">
                          <TableCell className="text-blue-950 font-bold uppercase tracking-wider">
                            Total Produzido
                          </TableCell>
                          <TableCell className="font-mono font-bold text-center text-blue-950">
                            {hasSummary ? totalSummaryQty : scenario.produced_quantity} un
                          </TableCell>
                          <TableCell className="font-mono text-right text-slate-400 font-normal">
                            —
                          </TableCell>
                          <TableCell className="font-mono font-bold text-right text-blue-950">
                            {(hasSummary
                              ? totalSummaryWeight
                              : scenario.used_weight_kg / 1000
                            ).toLocaleString('pt-BR', {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}{' '}
                            t
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : (
              /* APRESENTAÇÃO LEGADA PARA CORTE DE BLOCOS — TOTALMENTE PRESERVADA */
              <>
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
                          Math.abs(scenario.deviation_pct) > 2
                            ? 'text-amber-700'
                            : 'text-emerald-700'
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
                    <FileText className="w-4 h-4 text-blue-900" /> Parâmetros Técnicos Reais da
                    Ficha Mestra
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded border">
                      <span className="text-slate-500 block text-[11px]">Bitola / Dimensão:</span>
                      <span className="font-semibold text-slate-900">
                        {comp.gauge_dimension || 'N/D'}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border">
                      <span className="text-slate-500 block text-[11px]">
                        Massa Linear Teórica:
                      </span>
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

                  <div className="overflow-x-auto rounded border border-slate-100 max-w-full">
                    <TooltipProvider delayDuration={150}>
                      <Table className="min-w-[700px]">
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-xs font-bold w-[60px]">Item #</TableHead>
                            <TableHead className="text-xs font-bold w-[75px]">Tipo</TableHead>
                            <TableHead className="text-xs font-bold min-w-[90px]">
                              Corrida
                            </TableHead>
                            <TableHead className="text-xs font-bold min-w-[100px]">
                              Múltiplo
                            </TableHead>
                            <TableHead className="text-xs font-bold min-w-[180px]">
                              Dimensões do Bloco
                            </TableHead>
                            <TableHead className="text-xs font-bold whitespace-nowrap">
                              Peso Ideal (t)
                            </TableHead>
                            <TableHead className="text-xs font-bold whitespace-nowrap">
                              Peso Calculado (t)
                            </TableHead>
                            <TableHead className="text-xs font-bold whitespace-nowrap">
                              Faixa Tolerância (t)
                            </TableHead>
                            <TableHead className="text-xs font-bold w-[80px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {comp.distribution.map((d) => {
                            // Derivação segura e consistente da dimensão caso o objeto ainda não venha com dimension_display
                            const linearMass = d.linear_mass_kg_m || comp.linear_mass_kg_m || 132.5
                            let widthMm = d.width_mm || 130
                            let heightMm = d.height_mm || 130
                            const rawGauge = d.gauge_dimension || comp.gauge_dimension || ''
                            if (rawGauge && (!d.width_mm || !d.height_mm)) {
                              const match = rawGauge.match(/(\d+)\s*[xX×]\s*(\d+)/)
                              if (match) {
                                widthMm = parseInt(match[1], 10)
                                heightMm = parseInt(match[2], 10)
                              }
                            }
                            const calculatedLengthMm =
                              d.calculated_length_mm ||
                              Math.round((d.calculated_kg / linearMass) * 1000)
                            const formattedLength = calculatedLengthMm.toLocaleString('pt-BR')
                            const dimensionText =
                              d.dimension_display ||
                              `${widthMm} × ${heightMm} × ${formattedLength} mm`
                            const sectionText = `${widthMm} × ${heightMm} mm`

                            return (
                              <TableRow key={d.item_index} className="text-xs hover:bg-slate-50/80">
                                <TableCell className="font-mono font-medium">
                                  #{d.item_index}
                                </TableCell>
                                <TableCell>{d.item_type}</TableCell>
                                <TableCell className="font-mono text-slate-800">
                                  {d.heat_number ? (
                                    <span className="font-bold text-blue-950 font-mono">
                                      {d.heat_number}
                                    </span>
                                  ) : (
                                    <span
                                      className="text-slate-400 font-sans"
                                      title="Cálculo agregado não individualizado por corrida"
                                    >
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-mono text-slate-800">
                                  {d.multiple_number ? (
                                    <div className="flex items-center gap-1 font-mono">
                                      <span className="font-bold text-slate-900">
                                        {d.multiple_number}
                                      </span>
                                      {d.origin_type &&
                                        d.origin_type !== 'SAP' &&
                                        d.origin_type !== 'AGREGADO' && (
                                          <Badge
                                            variant="outline"
                                            className="text-[9px] px-1 py-0 bg-amber-50 text-amber-900 border-amber-200"
                                          >
                                            Homol.
                                          </Badge>
                                        )}
                                    </div>
                                  ) : (
                                    <span
                                      className="text-slate-400 font-sans"
                                      title="Cálculo agregado não individualizado por múltiplo"
                                    >
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium text-slate-900 whitespace-nowrap">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1.5 cursor-help py-0.5 px-1.5 rounded hover:bg-blue-50/80 transition-colors font-mono text-[11px] text-blue-950 font-semibold border border-transparent hover:border-blue-200">
                                        <span>{dimensionText}</span>
                                        <Info className="w-3.5 h-3.5 text-blue-800 shrink-0 opacity-70 hover:opacity-100" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-slate-950 text-slate-100 border-slate-800 text-xs p-3 space-y-1.5 max-w-sm shadow-xl z-50"
                                    >
                                      <p className="font-semibold text-amber-300 text-[11px] leading-tight">
                                        Dimensões calculadas para este bloco conforme o Plano de
                                        Corte selecionado.
                                      </p>
                                      <div className="border-t border-slate-800 pt-1.5 space-y-0.5 text-[11px] text-slate-300 font-sans">
                                        <div>
                                          <span className="text-slate-400">Seção do material:</span>{' '}
                                          <strong className="text-white font-mono">
                                            {sectionText}
                                          </strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">
                                            Comprimento calculado:
                                          </span>{' '}
                                          <strong className="text-white font-mono">
                                            {formattedLength} mm
                                          </strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">
                                            Massa linear da Ficha Mestra:
                                          </span>{' '}
                                          <strong className="text-white font-mono">
                                            {linearMass.toLocaleString('pt-BR')} kg/m
                                          </strong>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Peso calculado:</span>{' '}
                                          <strong className="text-blue-300 font-mono">
                                            {d.calculated_kg.toLocaleString('pt-BR', {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}{' '}
                                            kg (
                                            {(d.calculated_kg / 1000).toLocaleString('pt-BR', {
                                              minimumFractionDigits: 3,
                                              maximumFractionDigits: 3,
                                            })}{' '}
                                            t)
                                          </strong>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
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
                                  {d.tolerance_range_kg
                                    ? (() => {
                                        // Se a string for algo como "1200.00 a 1300.00 kg", formata em toneladas com 3 casas
                                        const match = d.tolerance_range_kg.match(
                                          /([0-9.,]+)\s*a\s*([0-9.,]+)/,
                                        )
                                        if (match) {
                                          const v1 = parseFloat(match[1].replace(',', '.'))
                                          const v2 = parseFloat(match[2].replace(',', '.'))
                                          if (!isNaN(v1) && !isNaN(v2)) {
                                            const t1 = (v1 / 1000).toLocaleString('pt-BR', {
                                              minimumFractionDigits: 3,
                                              maximumFractionDigits: 3,
                                            })
                                            const t2 = (v2 / 1000).toLocaleString('pt-BR', {
                                              minimumFractionDigits: 3,
                                              maximumFractionDigits: 3,
                                            })
                                            return `${t1} a ${t2} t`
                                          }
                                        }
                                        return d.tolerance_range_kg.replace(/kg/g, 't')
                                      })()
                                    : ''}
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
                            )
                          })}
                        </TableBody>
                      </Table>
                    </TooltipProvider>
                  </div>
                </div>
              </>
            )}

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
