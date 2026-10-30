import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Ruler,
  Scissors,
  Eye,
  Check,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'
import { formatNumberPtBr } from '@/lib/number-format'
import type {
  UnifiedScenarioResult,
  BlockDimensionalEntity,
} from '@/services/mp-cutting-unified-engine'
import type { IndustrialApplicationCandidate } from '@/types/mp-piece-application-optimization'

export interface MPMultipleCuttingMatrixRow {
  material_code: string
  heat_number: string
  batch_number: string
  block_label: string
  gross_length_mm: number
  useful_length_mm: number
  application_code: string
  application_name: string
  product_code: string
  cut_length_mm: number
  quantity: number
  total_kerf_mm: number
  additional_losses_mm: number
  used_length_mm: number
  leftover_mm: number
  used_weight_kg: number
  yield_pct: number
  situation: 'VIÁVEL' | 'INVIÁVEL'
}

export interface MPMultipleCuttingMatrixTableProps {
  scenario: UnifiedScenarioResult
  block: BlockDimensionalEntity
  materialCode: string
  heatNumber?: string
  batchNumber?: string
  supplierName?: string
  steelGrade?: string
  candidates: IndustrialApplicationCandidate[]
  sawKerfMm: number
  squaringLossMm: number
  endCropLossMm: number
  marginMm?: number
  linearMassKgM: number
  onProgramDirect?: () => void
}

export const MPMultipleCuttingMatrixTable: React.FC<MPMultipleCuttingMatrixTableProps> = ({
  scenario,
  block,
  materialCode,
  heatNumber = 'CR-9041',
  batchNumber = 'LT-2026-SAP',
  supplierName,
  steelGrade = 'SAE 1020',
  candidates,
  sawKerfMm,
  squaringLossMm,
  endCropLossMm,
  marginMm = 0,
  linearMassKgM,
  onProgramDirect,
}) => {
  // Constrói linhas da matriz de composição do cenário
  const fixedLossMm = squaringLossMm + endCropLossMm + marginMm
  const effectiveLengthMm = Math.max(0, block.lengthMm - fixedLossMm)

  // Mapeia aplicações pelas demandas alocadas
  const matrixRows: MPMultipleCuttingMatrixRow[] = scenario.allocatedDemands.map((dem, idx) => {
    const candidate = candidates.find(
      (c) => c.id === dem.demandId || c.application_code === dem.demandId,
    )
    const appCode = candidate?.application_code || dem.demandId
    const appName = candidate?.application_name || `Aplicação ${dem.demandId}`
    const productCode = candidate?.product_code || `SAP-${dem.lengthMm}MM`
    const kerfTotalMm = dem.quantity * sawKerfMm
    const usedLengthMm = dem.quantity * dem.lengthMm
    const usedWeightKg = (usedLengthMm / 1000) * linearMassKgM

    // Verificação de balanço dimensional
    const isDimensionallyViable = usedLengthMm + kerfTotalMm <= block.lengthMm

    return {
      material_code: materialCode,
      heat_number: heatNumber,
      batch_number: batchNumber,
      block_label: block.blockNumber || `Bloco ${idx + 1}`,
      gross_length_mm: block.lengthMm,
      useful_length_mm: effectiveLengthMm,
      application_code: appCode,
      application_name: appName,
      product_code: productCode,
      cut_length_mm: dem.lengthMm,
      quantity: dem.quantity,
      total_kerf_mm: kerfTotalMm,
      additional_losses_mm: fixedLossMm,
      used_length_mm: usedLengthMm,
      leftover_mm: Math.max(0, scenario.leftoverDetails.reusableLengthMm),
      used_weight_kg: usedWeightKg,
      yield_pct: scenario.yieldPct,
      situation: isDimensionallyViable ? 'VIÁVEL' : 'INVIÁVEL',
    }
  })

  // Totais da Matriz
  const totalCutsLengthMm = matrixRows.reduce((acc, r) => acc + r.used_length_mm, 0)
  const totalKerfMm = matrixRows.reduce((acc, r) => acc + r.total_kerf_mm, 0)
  const totalPieces = matrixRows.reduce((acc, r) => acc + r.quantity, 0)
  const totalUsedWeightKg = matrixRows.reduce((acc, r) => acc + r.used_weight_kg, 0)
  const leftoverMm = scenario.leftoverDetails.reusableLengthMm
  const scrapLossesMm = scenario.leftoverDetails.scrapLengthMm + fixedLossMm + totalKerfMm

  // Validação obrigatória da soma: comprimentos cortados + perdas + sobras <= comprimento disponível
  const totalAccountedLengthMm =
    totalCutsLengthMm +
    totalKerfMm +
    fixedLossMm +
    leftoverMm +
    scenario.leftoverDetails.scrapLengthMm
  const isDimensionalBalanceOk = totalAccountedLengthMm <= block.lengthMm + 5 // tolerância de 5mm

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-[#004C97] rounded-lg">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Matriz de Múltiplos — Composição do Plano de Corte
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-mono">
                  {scenario.name}
                </Badge>
              </h3>
              <p className="text-xs text-slate-500">
                Detalhamento dos múltiplos por bloco, comprimento de corte, kerf de serra e
                rendimento metálico individualizado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDimensionalBalanceOk ? (
              <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-xs font-mono gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Balanço Dimensional & Massa Conforme
              </Badge>
            ) : (
              <Badge className="bg-red-50 text-red-800 border-red-300 text-xs font-mono gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                Desvio no Balanço Dimensional
              </Badge>
            )}

            {onProgramDirect && (
              <Button
                type="button"
                size="sm"
                onClick={onProgramDirect}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5" />
                Programar no Múltiplo KS
              </Button>
            )}
          </div>
        </div>

        {/* Resumo do Balanço de Massa do Bloco */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Bloco / Material
            </span>
            <span className="font-mono font-bold text-slate-900 block mt-0.5">
              {block.blockNumber}
            </span>
            <span className="text-[10px] text-slate-500 truncate block">
              {materialCode} &bull; {steelGrade}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Comprimento Bruto
            </span>
            <span className="font-mono font-bold text-slate-900 block mt-0.5">
              {formatNumberPtBr(block.lengthMm, 0)} mm
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Útil: {formatNumberPtBr(effectiveLengthMm, 0)} mm
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Comp. Cortado Útil
            </span>
            <span className="font-mono font-bold text-emerald-700 block mt-0.5">
              {formatNumberPtBr(totalCutsLengthMm, 0)} mm
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatNumberPtBr(totalCutsLengthMm / 1000, 2)} m ({totalPieces} peças)
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Kerf Total Serra
            </span>
            <span className="font-mono font-bold text-amber-700 block mt-0.5">
              {formatNumberPtBr(totalKerfMm, 0)} mm
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Serra: {sawKerfMm} mm / corte
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Sobra Reaproveitável
            </span>
            <span className="font-mono font-bold text-blue-900 block mt-0.5">
              {formatNumberPtBr(leftoverMm, 0)} mm
            </span>
            <span className="text-[10px] text-emerald-700 font-mono">
              {formatNumberPtBr(scenario.leftoverWeightTons, 3)} t
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              Rendimento Metálico
            </span>
            <span className="font-mono font-black text-emerald-700 text-sm block mt-0.5">
              {formatNumberPtBr(scenario.yieldPct, 2)}%
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {formatNumberPtBr(scenario.usedWeightTons, 3)} t
            </span>
          </div>
        </div>

        {/* TABELA DETALHADA COM TODAS AS COLUNAS OBRIGATÓRIAS */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200 select-none">
              <tr>
                <th className="p-2.5 whitespace-nowrap">Material SAP</th>
                <th className="p-2.5 whitespace-nowrap">Corrida</th>
                <th className="p-2.5 whitespace-nowrap">Lote</th>
                <th className="p-2.5 whitespace-nowrap">Bloco/Múltiplo</th>
                <th className="p-2.5 text-right whitespace-nowrap">Comp. Bruto (mm)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Comp. Útil (mm)</th>
                <th className="p-2.5 whitespace-nowrap">Aplicação</th>
                <th className="p-2.5 whitespace-nowrap">Produto (SAP)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Corte (mm)</th>
                <th className="p-2.5 text-center whitespace-nowrap">Qtd (un)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Kerf (mm)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Perdas Adic. (mm)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Comp. Usado (mm)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Sobra (mm)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Peso Aprov. (t)</th>
                <th className="p-2.5 text-right whitespace-nowrap">Rend. (%)</th>
                <th className="p-2.5 text-center whitespace-nowrap">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {matrixRows.length === 0 ? (
                <tr>
                  <td colSpan={17} className="p-6 text-center text-slate-500 font-mono text-xs">
                    Nenhuma composição gerada para este cenário.
                  </td>
                </tr>
              ) : (
                matrixRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-[#004C97] whitespace-nowrap">
                      {row.material_code}
                    </td>
                    <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                      {row.heat_number}
                    </td>
                    <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                      {row.batch_number}
                    </td>
                    <td className="p-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {row.block_label} #{idx + 1}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatNumberPtBr(row.gross_length_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatNumberPtBr(row.useful_length_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-slate-800 font-medium whitespace-nowrap">
                      {row.application_code} &bull; {row.application_name}
                    </td>
                    <td className="p-2.5 font-mono text-slate-700 whitespace-nowrap">
                      {row.product_code}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatNumberPtBr(row.cut_length_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {row.quantity} un
                    </td>
                    <td className="p-2.5 text-right font-mono text-amber-800 whitespace-nowrap">
                      {formatNumberPtBr(row.total_kerf_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatNumberPtBr(row.additional_losses_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatNumberPtBr(row.used_length_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-right font-mono text-blue-900 whitespace-nowrap">
                      {formatNumberPtBr(row.leftover_mm, 0)} mm
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {formatNumberPtBr(row.used_weight_kg / 1000, 3)} t
                    </td>
                    <td className="p-2.5 text-right font-mono font-black text-emerald-700 whitespace-nowrap">
                      {formatNumberPtBr(row.yield_pct, 2)}%
                    </td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          row.situation === 'VIÁVEL'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}
                      >
                        {row.situation === 'VIÁVEL' ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Viável
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            Inviável
                          </span>
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
