import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sliders,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  RotateCcw,
} from 'lucide-react'
import { MPSdcSteelMatrixRow } from '@/types/mp-optimization'

interface SdcSimulationModalProps {
  isOpen: boolean
  onClose: () => void
  steelRows: MPSdcSteelMatrixRow[]
  selectedSteel: string
}

export const SdcSimulationModal: React.FC<SdcSimulationModalProps> = ({
  isOpen,
  onClose,
  steelRows,
  selectedSteel: initialSteel,
}) => {
  const [steel, setSteel] = useState(initialSteel || 'Classe A')
  const [l2ProductionDelta, setL2ProductionDelta] = useState<number>(0) // +/- t
  const [sdcConsumptionDelta, setSdcConsumptionDelta] = useState<number>(0) // +/- t
  const [postponeL2Days, setPostponeL2Days] = useState<number>(0)
  const [extraReceiptTons, setExtraReceiptTons] = useState<number>(0)
  const [minStockTons, setMinStockTons] = useState<number>(140)
  const [useAlternativeSteel, setUseAlternativeSteel] = useState<boolean>(false)

  const currentRow = steelRows.find((r) => r.steel_grade === steel) || steelRows[0]

  if (!currentRow) return null

  // Cenário Atual
  const baseStock = currentRow.total_stock_tons
  const baseL2 = currentRow.projected_l2_useful_tons
  const baseCons = currentRow.projected_consumption_sdc_tons
  const baseReceipt = currentRow.expected_receipts_tons
  const baseBalance = currentRow.projected_balance_tons
  const baseCoverage = currentRow.statistical_coverage_days

  // Cenário Simulado
  const simL2 = Math.max(0, baseL2 + l2ProductionDelta)
  const simCons = Math.max(0, baseCons + sdcConsumptionDelta)
  const simReceipt = Math.max(0, baseReceipt + extraReceiptTons)
  const altSteelRelief = useAlternativeSteel ? 25 : 0 // 25t transferidas de pool alternativo

  const simBalance = Number(
    (baseStock + simL2 + simReceipt - (simCons - altSteelRelief)).toFixed(2),
  )
  const dailyRate = simCons > 0 ? simCons / 30 : 1
  const simCoverage = Math.max(
    0,
    Math.round((baseStock + simL2 + simReceipt) / dailyRate) - postponeL2Days,
  )

  const simNeed = Math.max(0, minStockTons - simBalance)

  const handleReset = () => {
    setL2ProductionDelta(0)
    setSdcConsumptionDelta(0)
    setPostponeL2Days(0)
    setExtraReceiptTons(0)
    setUseAlternativeSteel(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-200 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#004C97] text-white flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Simulador de Cenários What-If — MP Sidercentro (SDC)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Simule alterações na produção L2, postergações, consumo SDC, recebimentos e pools
                  alternativos
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-blue-50 text-[#004C97] border-blue-200 text-xs font-bold"
            >
              Motor Central Determinístico
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor do Aço em Simulação */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Aço em Análise:</span>
              <select
                value={steel}
                onChange={(e) => {
                  setSteel(e.target.value)
                  const row = steelRows.find((r) => r.steel_grade === e.target.value)
                  if (row) setMinStockTons(row.min_stock_tons)
                }}
                className="h-8 text-xs font-bold border border-slate-300 rounded px-2.5 bg-white text-slate-800"
              >
                {steelRows
                  .filter((r) => r.steel_grade !== 'Total')
                  .map((r) => (
                    <option key={r.steel_grade} value={r.steel_grade}>
                      {r.steel_grade} ({r.steel_class})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-7 text-[11px] text-slate-600 border-slate-300"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Resetar Variáveis
              </Button>
            </div>
          </div>

          {/* Variáveis de Simulação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Produção L2 */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" /> Produção L2 (&plusmn; t)
                </span>
                <span className="text-[11px] font-mono font-bold text-[#004C97]">
                  {l2ProductionDelta >= 0 ? `+${l2ProductionDelta}` : l2ProductionDelta} t
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="100"
                step="5"
                value={l2ProductionDelta}
                onChange={(e) => setL2ProductionDelta(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#004C97]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-50 t</span>
                <span>Base ({baseL2} t)</span>
                <span>+100 t</span>
              </div>
            </div>

            {/* Postergação L2 */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" /> Postergação L2
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-700">
                  +{postponeL2Days} dias
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={postponeL2Days}
                onChange={(e) => setPostponeL2Days(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 dias</span>
                <span>7 dias</span>
                <span>15 dias</span>
              </div>
            </div>

            {/* Consumo SDC */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> Consumo SDC (&plusmn; t)
                </span>
                <span className="text-[11px] font-mono font-bold text-rose-700">
                  {sdcConsumptionDelta >= 0 ? `+${sdcConsumptionDelta}` : sdcConsumptionDelta} t
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="60"
                step="5"
                value={sdcConsumptionDelta}
                onChange={(e) => setSdcConsumptionDelta(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>-30 t</span>
                <span>Base ({baseCons} t)</span>
                <span>+60 t</span>
              </div>
            </div>

            {/* Recebimento Extra */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Recebimento /
                  Transferência
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-700">
                  +{extraReceiptTons} t
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={extraReceiptTons}
                onChange={(e) => setExtraReceiptTons(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 t</span>
                <span>40 t</span>
                <span>+80 t</span>
              </div>
            </div>

            {/* Estoque Mínimo */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Estoque Mínimo Desejado</span>
                <span className="text-[11px] font-mono font-bold text-slate-700">
                  {minStockTons} t
                </span>
              </div>
              <Input
                type="number"
                value={minStockTons}
                onChange={(e) => setMinStockTons(Number(e.target.value))}
                className="h-8 text-xs font-mono"
              />
            </div>

            {/* Pool Alternativo */}
            <div className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-800">Utilizar Pool Alternativo</span>
              <p className="text-[10px] text-slate-500 leading-tight">
                Permite alívio de 25t com substituição técnica de MP autorizada.
              </p>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={useAlternativeSteel}
                  onChange={(e) => setUseAlternativeSteel(e.target.checked)}
                  className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                />
                <span className="text-xs font-semibold text-slate-800">Ativar Aço Substituto</span>
              </label>
            </div>
          </div>

          {/* Comparativo Cenário Atual vs Simulado */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Comparativo de Impacto Operacional
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Delta:{' '}
                {simBalance >= baseBalance
                  ? `+${(simBalance - baseBalance).toFixed(1)} t`
                  : `${(simBalance - baseBalance).toFixed(1)} t`}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white">
              {/* Cenário Atual */}
              <div className="p-4 space-y-3 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase">
                    Cenário Atual (Oficial)
                  </span>
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 text-[10px]">
                    Oficial SAP/PCP
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Estoque Inicial Total:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {baseStock.toFixed(1)} t
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Produção L2 Útil:</span>
                    <span className="font-mono text-blue-700 font-bold">
                      +{baseL2.toFixed(1)} t
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Consumo Programado SDC:</span>
                    <span className="font-mono text-rose-700 font-bold">
                      -{baseCons.toFixed(1)} t
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-300 bg-slate-100/70 px-2 rounded">
                    <span className="font-bold text-slate-800">Saldo Projetado:</span>
                    <span className="font-mono font-extrabold text-slate-900">
                      {baseBalance.toFixed(1)} t
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-600">Dias de Cobertura:</span>
                    <span className="font-mono font-bold text-slate-900">{baseCoverage} dias</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Data Prevista Ruptura:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currentRow.chronological_coverage_date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cenário Simulado */}
              <div className="p-4 space-y-3 bg-blue-50/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#004C97] uppercase">
                    Cenário Simulado (What-If)
                  </span>
                  <Badge className="bg-[#004C97] text-white text-[10px]">
                    <Sparkles className="w-3 h-3 mr-1" /> Simulação Ativa
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span className="text-slate-600">Estoque Inicial + Entradas:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {(baseStock + simL2 + simReceipt).toFixed(1)} t
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span className="text-slate-600">Produção L2 Ajustada:</span>
                    <span className="font-mono text-blue-700 font-bold">+{simL2.toFixed(1)} t</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span className="text-slate-600">Consumo Efetivo (c/ Pool):</span>
                    <span className="font-mono text-rose-700 font-bold">
                      -{(simCons - altSteelRelief).toFixed(1)} t
                    </span>
                  </div>
                  <div
                    className={`flex justify-between py-1.5 border-b border-blue-200 px-2 rounded ${
                      simBalance < minStockTons
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    <span className="font-bold">Saldo Projetado Simulado:</span>
                    <span className="font-mono font-extrabold">{simBalance.toFixed(1)} t</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100">
                    <span className="text-slate-600">Cobertura Ajustada:</span>
                    <span className="font-mono font-bold text-[#004C97]">{simCoverage} dias</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Necessidade Residual:</span>
                    <span
                      className={`font-mono font-bold ${
                        simNeed > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {simNeed > 0 ? `${simNeed.toFixed(1)} t adicionais` : 'Sem necessidade'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-3 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Ações aprovadas no simulador geram versão na Fila de Programação L2 do PCP Robotizado.
          </div>
          <Button
            onClick={onClose}
            className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
          >
            Fechar Simulação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SdcSimulationModal
