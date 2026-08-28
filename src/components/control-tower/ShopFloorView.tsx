import React from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { HardHat, AlertTriangle, CheckCircle2, Clock, Play, ArrowRight, Gauge } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const ShopFloorView: React.FC = () => {
  const { filters, filteredOrders, processNodes, setSelectedOrder } = useControlTower()

  // Selecionar linha ativa para exibição (padrão L1)
  const activeLineCode = filters.lineCode !== 'ALL' ? filters.lineCode : 'L1'
  const activeNode = processNodes.find((n) => n.code === activeLineCode) || processNodes[2] // L1
  const lineOrders = filteredOrders.filter((o) => o.lineCode === activeLineCode)

  const currentOrder = lineOrders[0] // Ordem AGORA
  const nextOrder = lineOrders[1] // Ordem PRÓXIMA
  const laterOrder = lineOrders[2] // Ordem DEPOIS

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      {/* Header do Chão de Fábrica */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#004C97] flex items-center justify-center text-white">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              LINHA {activeNode.code} — {activeNode.name}
              <Badge
                className={`text-[10px] uppercase font-bold ${
                  activeNode.currentStatus === 'running'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                    : 'bg-amber-950 text-amber-400 border-amber-700'
                }`}
              >
                {activeNode.currentStatus}
              </Badge>
            </h2>
            <p className="text-xs text-slate-400">
              Operador Responsável: <strong className="text-white">{activeNode.operator}</strong>{' '}
              &bull; Setor: <strong className="text-slate-300">{activeNode.sector}</strong>
            </p>
          </div>
        </div>

        {/* Alerta Chão de Fábrica */}
        {currentOrder && currentOrder.delayMinutes > 0 && (
          <div className="bg-amber-950/60 border border-amber-600/80 px-3 py-1.5 rounded-lg text-xs text-amber-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Atenção: <strong>Atraso previsto de {currentOrder.delayMinutes} min</strong> no lote
              atual.
            </span>
          </div>
        )}
      </div>

      {/* Bloco Central 1: O QUE PRODUZIR AGORA (DESTAQUE MÁXIMO) */}
      {currentOrder ? (
        <Card className="bg-slate-950 border-[#004C97] shadow-xl text-slate-100 overflow-hidden">
          <div className="bg-[#004C97] px-4 py-2 flex items-center justify-between text-white font-black text-sm uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 fill-white" />
              <span>1. PRODUÇÃO EM ANDAMENTO (AGORA)</span>
            </div>
            <span className="font-mono text-xs bg-slate-950/40 px-2 py-0.5 rounded">
              OP: {currentOrder.orderNumber}
            </span>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold block mb-1">
                  Produto / Material:
                </span>
                <h3 className="text-lg font-black text-white">{currentOrder.materialName}</h3>
                <p className="text-xs text-cyan-300 mt-1">
                  Campanha: {currentOrder.campaignName} &bull; Cliente: {currentOrder.customerName}
                </p>
              </div>

              {/* Cadência Real x Esperada */}
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-around text-center">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Ritmo Esperado
                  </span>
                  <span className="text-xl font-mono font-bold text-slate-300">
                    {currentOrder.targetRatePerHour} t/h
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800"></div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Ritmo Real</span>
                  <span className="text-2xl font-mono font-black text-emerald-400">
                    {currentOrder.currentRatePerHour} t/h
                  </span>
                </div>
              </div>
            </div>

            {/* Tonelagens: Programado / Produzido / Falta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Programado Total</span>
                <span className="text-xl font-mono font-bold text-white">
                  {currentOrder.plannedTons} t
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Produzido Até Agora</span>
                <span className="text-xl font-mono font-bold text-emerald-400">
                  {currentOrder.producedTons} t
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block">Falta Produzir</span>
                <span className="text-xl font-mono font-bold text-amber-400">
                  {currentOrder.remainingTons} t
                </span>
              </div>
            </div>

            {/* Barra de Progresso e Conclusão */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>Progresso do Lote</span>
                <span className="font-mono font-bold text-cyan-300">
                  Conclusão Prevista: {currentOrder.projectedEnd}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{
                    width: `${Math.round((currentOrder.producedTons / currentOrder.plannedTons) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
          Nenhuma ordem em execução no momento nesta linha.
        </div>
      )}

      {/* Bloco 2: Quadro AGORA / PRÓXIMO / DEPOIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Próxima Ordem */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                2. PRÓXIMA PRODUÇÃO
              </span>
              {nextOrder && (
                <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400">
                  Setup: {nextOrder.setupMinutes} min
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {nextOrder ? (
              <>
                <div className="font-bold text-white text-sm">{nextOrder.materialName}</div>
                <div className="text-slate-400">
                  OP: <strong className="text-cyan-300 font-mono">{nextOrder.orderNumber}</strong>{' '}
                  &bull; Volume: <strong className="text-white">{nextOrder.plannedTons} t</strong>
                </div>
                <div className="text-slate-400">
                  Início Previsto:{' '}
                  <strong className="text-slate-200">{nextOrder.plannedStart}</strong>
                </div>
              </>
            ) : (
              <span className="text-slate-500">Aguardando liberação do PCP</span>
            )}
          </CardContent>
        </Card>

        {/* Ordem Depois */}
        <Card className="bg-slate-950 border-slate-800 text-slate-100 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-slate-900">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              3. NA SEQUÊNCIA (DEPOIS)
            </span>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {laterOrder ? (
              <>
                <div className="font-bold text-white text-sm">{laterOrder.materialName}</div>
                <div className="text-slate-400">
                  OP: <strong className="text-cyan-300 font-mono">{laterOrder.orderNumber}</strong>{' '}
                  &bull; Volume: <strong className="text-white">{laterOrder.plannedTons} t</strong>
                </div>
                <div className="text-slate-400">
                  Início Previsto:{' '}
                  <strong className="text-slate-200">{laterOrder.plannedStart}</strong>
                </div>
              </>
            ) : (
              <span className="text-slate-500">Sem ordens sequenciadas posteriores</span>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
