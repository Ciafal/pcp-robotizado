import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { PCPContextFilters } from '@/components/pcp/PCPContextFilters'

interface ControlTowerHeaderProps {
  title?: string
  subtitle?: string
  breadcrumbSubmodule?: string
  isFullscreen?: boolean
  toggleFullscreen?: () => void
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
    setCenterScope,
    companies,
    availablePlants,
    availableLines,
    availableCenters,
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

  const navigate = useNavigate()
  const { user, isGlobal, scopes } = useAuth()

  const handleOpenSimulations = () => {
    const params = new URLSearchParams()
    if (filters.plantCode && filters.plantCode !== 'ALL') {
      params.set('planta', filters.plantCode)
    }
    if (filters.lineCode && filters.lineCode !== 'ALL') {
      params.set('linha', filters.lineCode)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    navigate(`/pcp/relatorios/simulacoes${query}`)
  }
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
  const currentCenter =
    !filters.centerCode || filters.centerCode === 'ALL'
      ? 'Todos os Centros'
      : availableCenters.find((c) => c.code === filters.centerCode)?.name || filters.centerCode

  const scopeBreadcrumb = `${currentCompany} > ${currentPlant} > ${currentLine} > ${currentCenter}`

  return (
    <div className="flex flex-col gap-3 pb-3 border-b border-slate-200 bg-white p-4 rounded-xl shadow-2xs">
      {/* 1. Cabeçalho Principal Clean */}
      <div className="flex flex-col gap-2 min-w-0 max-w-full">
        {/* Breadcrumb funcional */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span>PCP Robotizado</span>
          <span>&gt;</span>
          <span>Central de Sequenciamento</span>
          <span>&gt;</span>
          <span className="text-slate-900 font-bold">{breadcrumbSubmodule}</span>
        </div>

        <div className="flex items-center gap-3 mt-0.5">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            {title}
          </h1>
          <Badge
            variant="outline"
            className="bg-[#004C97]/10 text-[#004C97] border-[#004C97]/30 text-xs font-mono font-bold hidden sm:inline-flex"
          >
            SAP ECC ZPP003 Ativo
          </Badge>
        </div>

        <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">{subtitle}</p>

        {/* Linha de Contexto Hierárquico, Conectores e Sincronização */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 mt-1.5 min-w-0 max-w-full">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 border border-slate-200 font-mono text-[#004C97] font-semibold min-w-0 max-w-full">
            <Building2 className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
            <span className="truncate">{scopeBreadcrumb}</span>
          </div>

          {/* Painel de Saúde das Integrações */}
          <Link
            to="/pcp/integracoes/monitor"
            className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-700 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
            title="Clique para abrir o Monitor de Integrações Ponta a Ponta"
          >
            <span className="font-bold text-slate-500 shrink-0 whitespace-nowrap">
              Integrações:
            </span>
            <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              SAP <span className="text-emerald-600 font-black">🟢</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              MES <span className="text-emerald-600 font-black">🟢</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              CRM <span className="text-emerald-600 font-black">🟢</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              TMS <span className="text-amber-600 font-black">🟡</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
              WMS <span className="text-emerald-600 font-black">🟢</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono shrink-0 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Última sinc. SAP: {lastSyncTime}</span>
          </div>

          {/* Indicador de Herança de Regras */}
          <button
            onClick={() => setIsRuleInspectorOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors shrink-0 whitespace-nowrap"
            title="Clique para ver a resolução de herança de regras"
          >
            <GitBranch className="w-3 h-3 text-[#004C97] shrink-0" />
            <span>Setup Máx: {effectiveRules.maxSetupDurationMinutes} min</span>
            <span className="text-[#004C97] text-[10px] ml-0.5 font-bold">(Herança)</span>
          </button>
        </div>
      </div>

      {/* 2. Filtros de Contexto PCP Unificados (Linha 1: Grade de 4 Selects | Linha 2: Ações Globais) */}
      <PCPContextFilters
        companyCode={filters.companyCode}
        plantCode={filters.plantCode}
        lineCode={filters.lineCode}
        centerCode={filters.centerCode || 'ALL'}
        companies={companies.map((c) => ({ code: c.code, name: c.name }))}
        plants={availablePlants.map((p) => ({
          code: p.code,
          name: p.name,
          companyCode: p.companyCode,
        }))}
        lines={availableLines.map((l) => ({
          code: l.code,
          name: l.name,
          plantCode: l.plantCode,
          companyCode: l.companyCode,
        }))}
        centers={availableCenters.map((wc) => ({
          code: wc.code,
          name: wc.name,
          lineCode: wc.lineCode,
        }))}
        onCompanyChange={setCompanyScope}
        onPlantChange={setPlantScope}
        onLineChange={setLineScope}
        onCenterChange={setCenterScope}
        allowConsolidatedPlant={true}
        allowConsolidatedLine={true}
        allowConsolidatedCenter={true}
        isLoading={isSyncing}
        idPrefix="tower-hdr"
        actions={
          <>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <span className="font-semibold text-slate-700">Ações Rápidas:</span>
              <span className="hidden sm:inline">
                Sincronização em tempo real &bull; Simulações &bull; Copiloto IA
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isSyncing}
                title="Atualizar dados"
                className="h-8 px-2.5 sm:px-3 gap-1.5 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0"
              >
                <RotateCcw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenSimulations}
                title="Abrir Simulações"
                className="h-8 px-2.5 sm:px-3 gap-1.5 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                <span>Simular</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsAIPanelOpen(true)}
                title="Analisar com IA"
                className="h-8 px-2.5 sm:px-3 gap-1.5 bg-[#004C97] hover:bg-[#003870] text-white shadow-2xs font-semibold shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Analisar com IA</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAlertCenterOpen(true)}
                title="Central de Alertas"
                className="h-8 relative border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-2.5 shrink-0"
              >
                <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center animate-pulse">
                    {unreadAlertsCount}
                  </span>
                )}
                <span className="hidden sm:inline text-xs ml-1 font-medium">Alertas</span>
              </Button>

              {/* Menu ⋮ com Ações Secundárias */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Mais opções"
                    className="h-8 w-8 p-0 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shrink-0"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border-slate-200 text-slate-800"
                >
                  <DropdownMenuLabel className="text-xs text-slate-400 font-mono">
                    Ações Avançadas
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={handleOpenSimulations}
                    className="text-xs cursor-pointer focus:bg-slate-100"
                  >
                    <Layers className="w-3.5 h-3.5 mr-2 text-[#004C97]" />
                    Abrir Simulações
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsVersionModalOpen(true)}
                    className="text-xs cursor-pointer focus:bg-slate-100"
                  >
                    <Clock className="w-3.5 h-3.5 mr-2 text-[#004C97]" />
                    Histórico de Versões
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsHomologationOpen(true)}
                    className="text-xs cursor-pointer focus:bg-slate-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-amber-600" />
                    Painel de Homologação
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsRuleInspectorOpen(true)}
                    className="text-xs cursor-pointer focus:bg-slate-100"
                  >
                    <GitBranch className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                    Herança de Regras Ativa
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <div className="px-2 py-1.5 text-[11px] text-slate-500 font-mono">
                    Perfil:{' '}
                    <span className="text-slate-800 font-semibold">
                      {user?.name || user?.email || 'Lucas Ferreira (PCP)'}
                    </span>
                    <br />
                    Escopo: {isGlobal ? 'Global' : scopes?.[0]?.target_code || 'Restrito'}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        }
      />

      {/* Modal de Homologação */}
      <HomologationControlModal
        isOpen={isHomologationOpen}
        onClose={() => setIsHomologationOpen(false)}
      />

      {/* Modal de Inspeção de Herança de Regras (Global -> Empresa -> Planta -> Linha) */}
      <Dialog open={isRuleInspectorOpen} onOpenChange={setIsRuleInspectorOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <GitBranch className="w-4 h-4 text-[#004C97]" />
              Herança de Regras (Rule Packs)
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Precedência: Global ➔ Empresa ➔ Planta ➔ Linha ➔ Processo/Recurso. A regra mais
              específica prevalece.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs font-mono">
            <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
              <div className="text-slate-700 font-sans text-xs font-bold">
                Cadeia de Precedência Resolvida:
              </div>
              {effectiveRules.resolutionChain.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 border-b border-slate-200 last:border-0"
                >
                  <span className="text-slate-700">{step.level}</span>
                  <span className="text-emerald-700 font-bold">
                    Setup Máx: {step.setupMinutes} min
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-900 space-y-1">
              <div className="font-bold flex items-center justify-between">
                <span>Parâmetro Aplicado Efetivo:</span>
                <span className="text-emerald-800 text-sm font-black">
                  {effectiveRules.maxSetupDurationMinutes} min
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 font-sans">
                Lote mínimo: {effectiveRules.minBatchSizeTons} t • Buffer segurança:{' '}
                {effectiveRules.bufferSafetyHours} h
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
