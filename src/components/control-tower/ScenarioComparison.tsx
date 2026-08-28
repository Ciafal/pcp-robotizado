import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { Columns3, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export const ScenarioComparison: React.FC = () => {
  const {
    isComparisonModalOpen,
    setIsComparisonModalOpen,
    scenarios,
    setActiveScenarioId,
    sendScenarioForApproval,
  } = useControlTower()

  const baseScen = scenarios[0] // BASE
  const scenA = scenarios[1] // CENARIO A
  const scenB = scenarios[2] // CENARIO B

  return (
    <Dialog open={isComparisonModalOpen} onOpenChange={setIsComparisonModalOpen}>
      <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-base flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-blue-400" /> Comparador Multicritério de Cenários
            Produtivos
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Compare trade-offs, riscos e indicadores industriais entre o cenário oficial do SAP e as
            simulações do PCP. A IA apresenta vantagens e desvantagens; o programador decide e
            homologa.
          </DialogDescription>
        </DialogHeader>

        {/* Matriz Comparativa */}
        <div className="space-y-4 py-2 text-xs">
          <div className="border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left text-slate-200">
              <thead className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3 w-1/4">Indicador / Premissa</th>
                  <th className="px-4 py-3 w-1/4 bg-slate-950/60 border-x border-slate-800">
                    <div className="font-bold text-slate-300">Cenário Base (SAP ECC)</div>
                    <span className="text-[10px] text-slate-500 font-normal">Oficial</span>
                  </th>
                  <th className="px-4 py-3 w-1/4 bg-blue-950/20 border-r border-slate-800">
                    <div className="font-bold text-cyan-300">Cenário A (Otimização Setup)</div>
                    <span className="text-[10px] text-slate-400 font-normal">PCP Carlos Silva</span>
                  </th>
                  <th className="px-4 py-3 w-1/4 bg-purple-950/20">
                    <div className="font-bold text-purple-300">Cenário B (Cadência Máxima)</div>
                    <span className="text-[10px] text-slate-400 font-normal">Motor IA</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {/* Produção Total */}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-slate-300">Produção Prevista</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300 bg-slate-950/40 border-x border-slate-800">
                    {baseScen.kpis.totalPlannedTons} t
                  </td>
                  <td className="px-4 py-2.5 font-mono text-cyan-300 font-bold bg-blue-950/10 border-r border-slate-800">
                    {scenA.kpis.totalPlannedTons} t
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold bg-purple-950/10">
                    {scenB.kpis.totalPlannedTons} t ⭐
                  </td>
                </tr>

                {/* Aderência */}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-slate-300">Aderência Esperada</td>
                  <td className="px-4 py-2.5 font-mono text-amber-400 bg-slate-950/40 border-x border-slate-800">
                    {baseScen.kpis.adherencePct}%
                  </td>
                  <td className="px-4 py-2.5 font-mono text-cyan-300 bg-blue-950/10 border-r border-slate-800">
                    {scenA.kpis.adherencePct}%
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold bg-purple-950/10">
                    {scenB.kpis.adherencePct}% ⭐
                  </td>
                </tr>

                {/* Pedidos em Risco */}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-slate-300">Pedidos em Risco</td>
                  <td className="px-4 py-2.5 font-mono text-rose-400 font-bold bg-slate-950/40 border-x border-slate-800">
                    {baseScen.kpis.ordersAtRiskCount} pedidos
                  </td>
                  <td className="px-4 py-2.5 font-mono text-amber-400 bg-blue-950/10 border-r border-slate-800">
                    {scenA.kpis.ordersAtRiskCount} pedidos
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold bg-purple-950/10">
                    {scenB.kpis.ordersAtRiskCount} pedidos ⭐
                  </td>
                </tr>

                {/* Setups */}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-slate-300">Trocas de Ferramenta</td>
                  <td className="px-4 py-2.5 font-mono text-slate-300 bg-slate-950/40 border-x border-slate-800">
                    {baseScen.kpis.totalSetupChanges} trocas
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold bg-blue-950/10 border-r border-slate-800">
                    {scenA.kpis.totalSetupChanges} trocas ⭐
                  </td>
                  <td className="px-4 py-2.5 font-mono text-rose-300 bg-purple-950/10">
                    {scenB.kpis.totalSetupChanges} trocas
                  </td>
                </tr>

                {/* Gargalos Ativos */}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-slate-300">Gargalos Ativos</td>
                  <td className="px-4 py-2.5 font-mono text-rose-400 bg-slate-950/40 border-x border-slate-800">
                    {baseScen.kpis.activeBottlenecksCount} gargalos
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold bg-blue-950/10 border-r border-slate-800">
                    {scenA.kpis.activeBottlenecksCount} gargalos ⭐
                  </td>
                  <td className="px-4 py-2.5 font-mono text-amber-400 bg-purple-950/10">
                    {scenB.kpis.activeBottlenecksCount} gargalos
                  </td>
                </tr>

                {/* Estoque Intermediário */}
                <tr>
                  <td className="px-4 py-2.5 font-semibold text-slate-300">
                    Estoque Intermediário
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-300 bg-slate-950/40 border-x border-slate-800">
                    {baseScen.kpis.intermediateStockTons} t
                  </td>
                  <td className="px-4 py-2.5 font-mono text-emerald-400 font-bold bg-blue-950/10 border-r border-slate-800">
                    {scenA.kpis.intermediateStockTons} t ⭐
                  </td>
                  <td className="px-4 py-2.5 font-mono text-rose-300 bg-purple-950/10">
                    {scenB.kpis.intermediateStockTons} t
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Análise de Trade-offs e Vantagens pela IA */}
          <div className="bg-[#004C97]/15 border border-blue-800/80 p-3.5 rounded-xl text-blue-200 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <Sparkles className="w-4 h-4" /> Síntese Comparativa da Inteligência Artificial:
            </div>
            <p className="leading-relaxed">
              <strong>Cenário A</strong> minimiza paradas de setup (-2 trocas) e reduz estoque
              intermediário, sendo a opção ideal para estabilidade operacional. Já o{' '}
              <strong>Cenário B</strong> atinge a maior tonelagem diária (4.910 t), porém demanda
              custo extra de manutenção no turno 3.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(false)}
            className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setActiveScenarioId(scenA.id)
                sendScenarioForApproval('Cenário A selecionado com base na matriz multicritério')
                setIsComparisonModalOpen(false)
              }}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold text-xs"
            >
              Adotar Cenário A & Enviar Homologação
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
