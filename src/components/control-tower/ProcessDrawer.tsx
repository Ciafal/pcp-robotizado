import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  X,
  Layers,
  Activity,
  Zap,
  Sparkles,
  CalendarDays,
  Network,
  TrendingUp,
  AlertTriangle,
  HardHat,
  Clock,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const ProcessDrawer: React.FC = () => {
  const {
    selectedProcess,
    setSelectedProcess,
    setActiveTab,
    setIsAIPanelOpen,
    setIsSimulatorModalOpen,
  } = useControlTower()
  const [activeTabSub, setActiveTabSub] = useState<string>('RESUMO')

  if (!selectedProcess) return null

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-950 border-l border-slate-800 text-slate-100 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-3 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-cyan-400 text-base">
              {selectedProcess.code}
            </span>
            <Badge
              className={`text-[10px] uppercase ${
                selectedProcess.currentStatus === 'running'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : 'bg-rose-950 text-rose-400 border-rose-700'
              }`}
            >
              {selectedProcess.currentStatus}
            </Badge>
          </div>
          <h2 className="text-sm font-black text-white mt-1">{selectedProcess.name}</h2>
          <p className="text-xs text-slate-400">{selectedProcess.sector}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedProcess(null)}
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Action Bar */}
      <div className="p-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveTab('GANTT')
            setSelectedProcess(null)
          }}
          className="border-slate-800 bg-slate-950 text-slate-200 hover:text-white text-[11px] h-7 gap-1"
        >
          <CalendarDays className="w-3 h-3 text-cyan-400" /> Ver no Gantt
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setActiveTab('MAP')
            setSelectedProcess(null)
          }}
          className="border-slate-800 bg-slate-950 text-slate-200 hover:text-white text-[11px] h-7 gap-1"
        >
          <Network className="w-3 h-3 text-[#004C97]" /> Ver Dependências
        </Button>

        <Button
          size="sm"
          onClick={() => {
            setIsAIPanelOpen(true)
            setSelectedProcess(null)
          }}
          className="bg-[#004C97] hover:bg-[#003B75] text-white text-[11px] h-7 gap-1 font-bold ml-auto"
        >
          <Sparkles className="w-3 h-3 text-cyan-300" /> Analisar com IA
        </Button>
      </div>

      {/* Tabs Internas do Drawer */}
      <Tabs
        value={activeTabSub}
        onValueChange={setActiveTabSub}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-4 pt-2 border-b border-slate-800 bg-slate-950">
          <TabsList className="bg-slate-900 border border-slate-800 h-8 p-0.5 overflow-x-auto justify-start max-w-full">
            <TabsTrigger value="RESUMO" className="text-[11px] px-2.5 py-1">
              Resumo
            </TabsTrigger>
            <TabsTrigger value="PROGRAMACAO" className="text-[11px] px-2.5 py-1">
              Programação
            </TabsTrigger>
            <TabsTrigger value="CAPACIDADE" className="text-[11px] px-2.5 py-1">
              Capacidade
            </TabsTrigger>
            <TabsTrigger value="BUFFERS" className="text-[11px] px-2.5 py-1">
              Buffers
            </TabsTrigger>
            <TabsTrigger value="DEPENDENCIAS" className="text-[11px] px-2.5 py-1">
              Dependências
            </TabsTrigger>
            <TabsTrigger value="ALERTAS" className="text-[11px] px-2.5 py-1">
              Alertas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Resumo */}
        <TabsContent value="RESUMO" className="p-4 space-y-4 flex-1 overflow-y-auto text-xs m-0">
          {/* Exemplo solicitado no prompt (L1): */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Balanço do Processo Operacional
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Produção Prevista:</span>
                <strong className="text-white text-sm">
                  {selectedProcess.plannedTonsToday.toLocaleString('pt-BR')} t
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Realizado Hoje:</span>
                <strong className="text-emerald-400 text-sm">
                  {selectedProcess.producedTonsToday.toLocaleString('pt-BR')} t
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ritmo Previsto (Meta):</span>
                <strong className="text-slate-200">
                  {selectedProcess.nominalCapacityTonsPerHour} t/h
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ritmo Real Atual:</span>
                <strong className="text-cyan-300">
                  {selectedProcess.currentRateTonsPerHour} t/h
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Aderência do Plano:</span>
                <strong className="text-emerald-400">{selectedProcess.adherencePct}%</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Ocupação Fabril:</span>
                <strong className="text-white">{selectedProcess.occupancyPct}%</strong>
              </div>
            </div>
          </div>

          {/* Buffer Downstream */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Buffer Downstream Conectado:</span>
              <span className="font-mono font-bold text-cyan-300">
                {selectedProcess.downstreamBufferTons} t
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Cobertura de Estoque:</span>
              <strong className="text-white">{selectedProcess.downstreamBufferHours} horas</strong>
            </div>
          </div>

          {/* Informações da Campanha e Qualidade Integrada */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Campanha Ativa:
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] bg-blue-950 text-cyan-300 border border-blue-800 px-1.5 py-0.5 rounded font-bold">
                  US Monitorado
                </span>
                <span className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.5 rounded font-bold">
                  EM Habilitado
                </span>
              </div>
            </div>
            <div className="font-bold text-white text-xs">{selectedProcess.activeCampaign}</div>
            <div className="text-cyan-300 text-[11px]">
              Material: {selectedProcess.activeMaterial}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Programação */}
        <TabsContent
          value="PROGRAMACAO"
          className="p-4 space-y-3 flex-1 overflow-y-auto text-xs m-0"
        >
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Ordem em Execução:</span>
            <strong className="text-white font-mono text-sm">
              {selectedProcess.activeOrderNumber || 'Nenhuma ordem ativa'}
            </strong>
          </div>
        </TabsContent>

        {/* Tab 3: Capacidade */}
        <TabsContent
          value="CAPACIDADE"
          className="p-4 space-y-3 flex-1 overflow-y-auto text-xs m-0"
        >
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Capacidade Disponível:</span>
              <strong className="text-white">
                {selectedProcess.availableCapacityTonsPerHour} t/h
              </strong>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Capacidade Nominal:</span>
              <strong className="text-slate-300">
                {selectedProcess.nominalCapacityTonsPerHour} t/h
              </strong>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Buffers */}
        <TabsContent value="BUFFERS" className="p-4 space-y-3 flex-1 overflow-y-auto text-xs m-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Buffer Mínimo de Segurança:</span>
              <strong className="text-slate-200">{selectedProcess.bufferMinSafeTons} t</strong>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Capacidade Máxima do Buffer:</span>
              <strong className="text-slate-200">{selectedProcess.bufferMaxCapacityTons} t</strong>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Dependências */}
        <TabsContent
          value="DEPENDENCIAS"
          className="p-4 space-y-3 flex-1 overflow-y-auto text-xs m-0"
        >
          <div className="space-y-2">
            <span className="text-slate-400 block font-bold">Processos Upstream (Montante):</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedProcess.upstreamProcessCodes.map((c) => (
                <Badge key={c} variant="secondary" className="bg-slate-900 text-cyan-300 font-mono">
                  {c}
                </Badge>
              ))}
            </div>

            <span className="text-slate-400 block font-bold pt-3">
              Processos Downstream (Jusante):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedProcess.downstreamProcessCodes.map((c) => (
                <Badge
                  key={c}
                  variant="secondary"
                  className="bg-slate-900 text-emerald-300 font-mono"
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 6: Alertas */}
        <TabsContent value="ALERTAS" className="p-4 space-y-3 flex-1 overflow-y-auto text-xs m-0">
          {selectedProcess.isBottleneck ? (
            <div className="bg-rose-950/40 border border-rose-700 p-3 rounded-lg text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-rose-300">
                <AlertTriangle className="w-4 h-4" /> Alerta de Gargalo Ativo
              </div>
              <p>{selectedProcess.bottleneckReason}</p>
            </div>
          ) : (
            <div className="text-slate-500 text-center py-6">Nenhum alerta crítico pendente.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
