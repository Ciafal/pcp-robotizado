import React, { useState } from 'react'
import { useControlTower } from '@/contexts/ControlTowerContext'
import {
  RefreshCw,
  Zap,
  Columns3,
  Bell,
  BookmarkPlus,
  Layers,
  Sparkles,
  Cpu,
  Database,
  History,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const ControlTowerHeader: React.FC<{
  isFullscreen: boolean
  toggleFullscreen: () => void
}> = ({ isFullscreen, toggleFullscreen }) => {
  const {
    lastSyncTime,
    isSyncing,
    refreshData,
    setIsSimulatorModalOpen,
    setIsComparisonModalOpen,
    setIsAlertCenterOpen,
    setIsAIPanelOpen,
    setIsVersionModalOpen,
    alerts,
    savedViews,
    saveCurrentView,
    applySavedView,
  } = useControlTower()

  const [isSaveViewOpen, setIsSaveViewOpen] = useState(false)
  const [viewNameInput, setViewNameInput] = useState('')

  const activeAlertsCount = alerts.filter((a) => !a.acknowledged).length

  const handleSaveViewSubmit = () => {
    if (viewNameInput.trim()) {
      saveCurrentView(viewNameInput.trim())
      setViewNameInput('')
      setIsSaveViewOpen(false)
    }
  }

  return (
    <div className="bg-slate-950 border-b border-slate-800 p-4 space-y-3">
      {/* Breadcrumb & SAP Status Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="hover:text-slate-300 cursor-pointer">PCP Robotizado</span>
          <span className="text-slate-600">&gt;</span>
          <span className="hover:text-slate-300 cursor-pointer">Sequenciamento</span>
          <span className="text-slate-600">&gt;</span>
          <span className="text-white font-semibold flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#004C97]" /> Central Produtiva
          </span>
        </div>

        {/* Sync & SAP Connection Indicators */}
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="text-slate-400">
            Última sincronização SAP: <strong className="text-slate-200">{lastSyncTime}</strong>
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SAP conectado
            </span>
            <span className="flex items-center gap-1 text-cyan-300 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              <Database className="w-3 h-3 text-cyan-400" />
              Dados sincronizados
            </span>
            <span className="flex items-center gap-1 text-blue-300 bg-blue-950/60 border border-blue-800/80 px-2 py-0.5 rounded-full font-mono text-[10px]">
              <Cpu className="w-3 h-3 text-blue-400" />
              Motor de IA disponível
            </span>
          </div>
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Central de Sequenciamento Produtivo
            <Badge className="bg-[#004C97] text-white border-blue-400/30 text-[10px] font-bold uppercase tracking-wider">
              Torre de Controle Operacional
            </Badge>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Sincronização de linhas, recursos, materiais e processos produtivos CIAFAL
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Atualizar */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isSyncing}
            className="border-slate-800 bg-slate-900 text-slate-200 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
            title="Sincronizar dados em tempo real com o SAP ECC"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          {/* Simular Cenário */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSimulatorModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-amber-400 hover:text-amber-300 hover:bg-slate-800 text-xs h-8 gap-1.5 font-semibold"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simular Cenário</span>
          </Button>

          {/* Comparar Cenários */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsComparisonModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
          >
            <Columns3 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Comparar Cenários</span>
          </Button>

          {/* Análise IA */}
          <Button
            size="sm"
            onClick={() => setIsAIPanelOpen(true)}
            className="bg-[#004C97] hover:bg-[#003B75] text-white text-xs h-8 gap-1.5 font-bold shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Analisar com IA</span>
          </Button>

          {/* Alertas */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAlertCenterOpen(true)}
            className="relative border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-8 gap-1.5"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Alertas</span>
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </Button>

          {/* Salvar Visão */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Salvar Visão</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-950 border-slate-800 text-slate-200 text-xs w-56">
              <DropdownMenuLabel className="text-white text-xs">Visões Favoritas</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              {savedViews.map((sv) => (
                <DropdownMenuItem
                  key={sv.id}
                  onClick={() => applySavedView(sv.id)}
                  className="cursor-pointer hover:bg-slate-900 focus:bg-slate-900 text-slate-300 flex items-center justify-between"
                >
                  <span className="truncate">{sv.name}</span>
                  <Badge variant="outline" className="text-[9px] border-slate-700">
                    {sv.tab}
                  </Badge>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => setIsSaveViewOpen(true)}
                className="cursor-pointer text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 focus:bg-slate-900 font-semibold"
              >
                + Salvar visão atual como favorita...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Histórico & Versionamento */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsVersionModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
            title="Histórico de Versões e Trilha de Homologação"
          >
            <History className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xl:inline">Versões</span>
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-slate-400 hover:text-white hover:bg-slate-900 h-8 w-8 p-0"
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Modal para Salvar Visão */}
      <Dialog open={isSaveViewOpen} onOpenChange={setIsSaveViewOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-emerald-400" /> Salvar Visão Personalizada
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Grave a combinação atual de filtros, linha e lente ativa para acesso rápido no futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs text-slate-300">Nome da Visão</Label>
            <Input
              value={viewNameInput}
              onChange={(e) => setViewNameInput(e.target.value)}
              placeholder="ex.: Programador L1 - 48h com Gargalos"
              className="bg-slate-900 border-slate-700 text-white text-xs"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSaveViewOpen(false)}
              className="border-slate-800 bg-slate-900 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveViewSubmit}
              className="bg-[#004C97] hover:bg-[#003B75] text-white font-bold"
            >
              Gravar Visão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
