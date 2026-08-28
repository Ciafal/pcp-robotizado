import React, { useState } from 'react'
import {
  RotateCcw,
  Sparkles,
  Layers,
  Bell,
  MoreVertical,
  Calendar,
  Building2,
  Factory,
  Cpu,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Flame,
  Clock,
  Eye,
  BarChart3,
  GitBranch,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useControlTower } from '@/contexts/ControlTowerContext'
import { useAuth } from '@/contexts/AuthContext'
import { HomologationControlModal } from '@/components/control-tower/HomologationControlModal'

interface ControlTowerHeaderProps {
  title?: string
  subtitle?: string
  breadcrumbSubmodule?: string
}

export const ControlTowerHeader: React.FC<ControlTowerHeaderProps> = ({
  title = 'Torre de Controle Produtivo',
  subtitle = 'Visão integrada da programação, capacidade, gargalos, riscos e impactos produtivos.',
  breadcrumbSubmodule = 'Torre de Controle',
}) => {
  const {
    filters,
    setCompanyScope,
    setPlantScope,
    setLineScope,
    companies,
    availablePlants,
    availableLines,
    kpis,
    refreshData,
    lastSyncTime,
    isSyncing,
    setIsSimulatorModalOpen,
    setIsAIPanelOpen,
    setIsAlertCenterOpen,
    setIsVersionModalOpen,
    filteredAlerts,
    effectiveRules,
  } = useControlTower()

  const { currentSimulatedUser } = useAuth()
  const [isHomologationOpen, setIsHomologationOpen] = useState(false)
  const [isRuleInspectorOpen, setIsRuleInspectorOpen] = useState(false)

  const unreadAlertsCount = filteredAlerts.filter((a) => !a.acknowledged).length

  // Montagem do label de escopo corporativo
  const currentCompany = companies.find((c) => c.code === filters.companyCode)?.name || 'CIAFAL'
  const currentPlant =
    filters.plantCode === 'ALL'
      ? 'Todas as Plantas'
      : availablePlants.find((p) => p.code === filters.plantCode)?.name || filters.plantCode
  const currentLine =
    filters.lineCode === 'ALL'
      ? 'Todas as Linhas'
      : availableLines.find((l) => l.code === filters.lineCode)?.name || filters.lineCode

  const scopeBreadcrumb = `${currentCompany} > ${currentPlant} > ${currentLine}`

  return (
    <div className="flex flex-col gap-3 pb-3 border-b border-border/40">
      {/* 1. Banner Compacto de Homologação (Clean, sem poluição visual) */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold tracking-wide">⚠ AMBIENTE DE HOMOLOGAÇÃO</span>
          <span className="text-amber-400/60 hidden sm:inline">•</span>
          <span className="text-amber-200/80 hidden sm:inline">
            8 cenários ativos • ZPP003 mock • Sem impacto produtivo
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHomologationOpen(true)}
            className="h-6 px-2 text-xs text-amber-200 hover:text-white hover:bg-amber-800/40 font-medium"
          >
            [Executar Cenários]
          </Button>
        </div>
      </div>

      {/* 2. Cabeçalho Principal Clean */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          {/* Breadcrumb funcional */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span>PCP Robotizado</span>
            <span>&gt;</span>
            <span>Central de Sequenciamento</span>
            <span>&gt;</span>
            <span className="text-foreground font-medium">{breadcrumbSubmodule}</span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {title}
            </h1>
            <Badge
              variant="outline"
              className="bg-pantone-2945/10 text-pantone-2945 border-pantone-2945/40 text-xs font-mono font-normal hidden sm:inline-flex"
            >
              SAP ECC ZPP003 Ativo
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">{subtitle}</p>

          {/* Linha de Contexto Hierárquico e Sincronização */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-300 mt-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700/60 font-mono text-cyan-300">
              <Building2 className="w-3.5 h-3.5 text-pantone-2945" />
              <span>{scopeBreadcrumb}</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Última sincronização SAP: {lastSyncTime}</span>
            </div>

            {/* Indicador de Herança de Regras */}
            <button
              onClick={() => setIsRuleInspectorOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors"
              title="Clique para ver a resolução de herança de regras"
            >
              <GitBranch className="w-3 h-3 text-emerald-400" />
              <span>Setup Máx: {effectiveRules.maxSetupDurationMinutes} min</span>
              <span className="text-emerald-400 text-[10px] ml-0.5">(Herança)</span>
            </button>
          </div>
        </div>

        {/* 3. Ações Globais Principais */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor Rápido de Empresa/Planta/Linha */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700 rounded-md p-0.5 text-xs">
            {/* Empresa */}
            <select
              value={filters.companyCode}
              onChange={(e) => setCompanyScope(e.target.value)}
              className="bg-transparent text-slate-200 text-xs px-2 py-1 outline-none cursor-pointer border-r border-slate-700"
            >
              {companies.map((c) => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                  {c.code} ({c.name})
                </option>
              ))}
            </select>

            {/* Planta */}
            <select
              value={filters.plantCode}
              onChange={(e) => setPlantScope(e.target.value)}
              className="bg-transparent text-slate-200 text-xs px-2 py-1 outline-none cursor-pointer border-r border-slate-700"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                Todas as Plantas
              </option>
              {availablePlants.map((p) => (
                <option key={p.code} value={p.code} className="bg-slate-900 text-white">
                  {p.name}
                </option>
              ))}
            </select>

            {/* Linha */}
            <select
              value={filters.lineCode}
              onChange={(e) => setLineScope(e.target.value)}
              className="bg-transparent text-slate-200 text-xs px-2 py-1 outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                Todas as Linhas
              </option>
              {availableLines.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.code} - {l.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isSyncing}
            className="h-8 gap-1.5 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSimulatorModalOpen(true)}
            className="h-8 gap-1.5 border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Simular</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsAIPanelOpen(true)}
            className="h-8 gap-1.5 bg-pantone-2945 hover:bg-pantone-2945/90 text-white shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analisar com IA</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAlertCenterOpen(true)}
            className="h-8 relative border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 px-2.5"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </Button>

          {/* Menu ⋮ com Ações Secundárias */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 border-slate-700 bg-slate-900 text-slate-200"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-slate-900 border-slate-800 text-slate-200"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground font-mono">
                Ações Avançadas
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setIsVersionModalOpen(true)}
                className="text-xs cursor-pointer focus:bg-slate-800"
              >
                <Clock className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                Histórico de Versões
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsHomologationOpen(true)}
                className="text-xs cursor-pointer focus:bg-slate-800"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-amber-400" />
                Painel de Homologação
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsRuleInspectorOpen(true)}
                className="text-xs cursor-pointer focus:bg-slate-800"
              >
                <GitBranch className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                Herança de Regras Ativa
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <div className="px-2 py-1.5 text-[11px] text-muted-foreground font-mono">
                Perfil:{' '}
                <span className="text-slate-300 font-semibold">{currentSimulatedUser.name}</span>
                <br />
                Escopo: {currentSimulatedUser.plantAccess?.[0] || 'Global'}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Modal de Homologação */}
      <HomologationControlModal
        isOpen={isHomologationOpen}
        onClose={() => setIsHomologationOpen(false)}
      />

      {/* Modal de Inspeção de Herança de Regras (Global -> Empresa -> Planta -> Linha) */}
      <Dialog open={isRuleInspectorOpen} onOpenChange={setIsRuleInspectorOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <GitBranch className="w-4 h-4 text-emerald-400" />
              Herança de Regras (Rule Packs)
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Precedência: Global ➔ Empresa ➔ Planta ➔ Linha ➔ Processo/Recurso. A regra mais
              específica prevalece.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs font-mono">
            <div className="rounded border border-slate-800 bg-slate-950 p-3 space-y-2">
              <div className="text-slate-400 font-sans text-xs font-semibold">
                Cadeia de Precedência Resolvida:
              </div>
              {effectiveRules.resolutionChain.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-800/60 last:border-0"
                >
                  <span className="text-slate-300">{step.level}</span>
                  <span className="text-emerald-400 font-bold">
                    Setup Máx: {step.setupMinutes} min
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded border border-emerald-900/40 bg-emerald-950/20 p-3 text-emerald-300 space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Parâmetro Aplicado Efetivo:</span>
                <span className="text-emerald-400 text-sm font-black">
                  {effectiveRules.maxSetupDurationMinutes} min
                </span>
              </div>
              <p className="text-[11px] text-emerald-400/80 font-sans">
                Lote mínimo: {effectiveRules.minBatchSizeTons} t • Buffer segurança:{' '}
                {effectiveRules.bufferSafetyHours}h
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
