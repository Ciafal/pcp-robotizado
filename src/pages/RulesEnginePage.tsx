import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Cpu,
  Layers,
  Clock,
  ThermometerSnowflake,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  Sparkles,
  Info,
  Check,
  X,
  ChevronRight,
  Database,
  Lock,
  ExternalLink,
  Calendar,
  Layers2,
  SlidersHorizontal,
  FileText,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  pcpRulesService,
  SetupAcertoRecord,
  ScheduledStopRecord,
  CoolingTimeRecord,
  SequencingRuleRecord,
  PendingRevisionRecord,
  RuleAuditLogRecord,
} from '@/services/pcp-rules-service'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'
import { SetupDetailDrawer } from '@/components/rules-engine/SetupDetailDrawer'
import { CoolingCalculatorWidget } from '@/components/rules-engine/CoolingCalculatorWidget'
import { CiafalPageHeader } from '@/components/common/CiafalDesignSystem'
import { MasterIndustrialRulesTab } from '@/components/rules-engine/MasterIndustrialRulesTab'
import { RuleEditModal, RuleEditTarget } from '@/components/rules-engine/RuleEditModal'
import { Edit3, PlusCircle, Search, Clock, History as HistoryIcon, AlertCircle } from 'lucide-react'

export const RulesEnginePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  // Determinação da aba ativa inicial baseada na rota e parâmetros
  const initialActiveTab = useMemo(() => {
    const path = location.pathname.toLowerCase()
    if (path.includes('paradas-programadas')) {
      return 'paradas-programadas'
    }
    if (path.includes('matriz-setup')) {
      return 'setup-acerto'
    }
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      return tabParam
    }
    return 'setup-acerto'
  }, [location.pathname, searchParams])

  // Painel de Filtros Operacionais no Topo
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL') // Empresa
  const [selectedPlant, setSelectedPlant] = useState<string>('ALL') // Centro/Planta
  const [selectedLine, setSelectedLine] = useState<string>('ALL') // Linha Produtiva
  const [selectedRuleType, setSelectedRuleType] = useState<string>('ALL') // Tipo de Regra
  const [selectedScheduleType, setSelectedScheduleType] = useState<string>('ALL') // Tipo de Programação
  const [selectedGaugeMaterial, setSelectedGaugeMaterial] = useState<string>('') // Material/Bitola
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL') // Status
  const [validityFilter, setValidityFilter] = useState<string>('ALL') // Período de Validade/Vigência
  const [searchTerm, setSearchTerm] = useState<string>('') // Busca textual geral
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('') // Busca específica do Histórico
  const [historyPeriodFilter, setHistoryPeriodFilter] = useState<string>('ALL') // Período do Histórico (ALL, TODAY, 7D, 30D, 90D)
  const [historyRuleTypeFilter, setHistoryRuleTypeFilter] = useState<string>('ALL') // Tipo de Regra no Histórico

  // Modal de edição / criação de regras com auditoria
  const [isRuleEditModalOpen, setIsRuleEditModalOpen] = useState<boolean>(false)
  const [ruleEditTarget, setRuleEditTarget] = useState<RuleEditTarget | null>(null)

  const [activeTab, setActiveTab] = useState<string>(initialActiveTab)

  // Sincroniza a aba quando a rota mudar (ex: navegação via menu)
  useEffect(() => {
    setActiveTab(initialActiveTab)
  }, [initialActiveTab])

  // Estados de Dados do Backend (Fontes Oficiais da Ficha Mestra / Centro)
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [setupList, setSetupList] = useState<SetupAcertoRecord[]>([])
  const [stopsList, setStopsList] = useState<ScheduledStopRecord[]>([])
  const [coolingList, setCoolingList] = useState<CoolingTimeRecord[]>([])
  const [sequencingList, setSequencingList] = useState<SequencingRuleRecord[]>([])
  const [pendingList, setPendingList] = useState<PendingRevisionRecord[]>([])
  const [auditList, setAuditList] = useState<RuleAuditLogRecord[]>([])

  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Drawer de Detalhes Estatísticos (Read-Only)
  const [selectedSetupForDrawer, setSelectedSetupForDrawer] = useState<SetupAcertoRecord | null>(
    null,
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)

  // Carrega dados oficiais do Backend PocketBase (Mesmas tabelas oficiais da Ficha Mestra)
  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [lineData, setups, stops, coolings, sequencings, pendings, audits] = await Promise.all([
        lineMasterService.listLines(),
        pcpRulesService.listSetupAcerto(),
        pcpRulesService.listScheduledStops(),
        pcpRulesService.listCoolingTimes(),
        pcpRulesService.listSequencingRules(),
        pcpRulesService.listPendingRevisions(),
        pcpRulesService.listRuleAuditLogs(),
      ])

      setLines(lineData)
      setSetupList(setups)
      setStopsList(stops)
      setCoolingList(coolings)
      setSequencingList(sequencings)
      setPendingList(pendings)
      setAuditList(audits)
    } catch (err) {
      console.error('Erro ao carregar dados do motor de regras:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar Ficha Mestra',
        description: 'Não foi possível buscar as parametrizações oficiais do PocketBase.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Abertura do drawer puramente consultivo
  const handleSelectSetupRow = (row: SetupAcertoRecord) => {
    setSelectedSetupForDrawer(row)
    setIsDrawerOpen(true)
  }

  // Navegação direta para a Ficha Mestra oficial com ancoragem de seção
  const handleOpenMasterSheet = (
    lineCodeOrId?: string,
    sectionAnchor: 'setup' | 'paradas' | 'resfriamento' | 'sequenciamento' | 'geral' = 'geral',
  ) => {
    // Localiza id da linha correspondente caso venha apenas código (ex: 'L1', 'L2')
    const matchedLine = lines.find((l) => l.code === lineCodeOrId || l.id === lineCodeOrId)
    const lineParam = matchedLine ? matchedLine.id : lineCodeOrId || ''

    let hashAnchor = ''
    if (sectionAnchor === 'setup') hashAnchor = '#section-setup-matrix'
    else if (sectionAnchor === 'sequenciamento') hashAnchor = '#section-sequencing-process'
    else if (sectionAnchor === 'paradas') hashAnchor = '#section-raw-materials'
    else if (sectionAnchor === 'resfriamento') hashAnchor = '#section-setup-matrix'

    const targetUrl = lineParam
      ? `/pcp/ficha-mestre?lineId=${encodeURIComponent(lineParam)}${hashAnchor}`
      : `/pcp/ficha-mestre${hashAnchor}`

    navigate(targetUrl)
  }

  // Helper de filtro de vigência
  const matchesValidity = (validityStr?: string, validFrom?: string, validUntil?: string) => {
    if (validityFilter === 'ALL') return true
    const currentYear = new Date().getFullYear().toString()
    const str = `${validityStr || ''} ${validFrom || ''} ${validUntil || ''}`
    if (validityFilter === 'CURRENT') {
      return (
        str.includes(currentYear) || str.includes('2025') || str.includes('2026') || !str.trim()
      )
    }
    if (validityFilter === 'HISTORIC') {
      return str.includes('2023') || str.includes('2024')
    }
    return true
  }

  // Lista de Centros distintos
  const availableCenters = useMemo(() => {
    const set = new Set<string>()
    lines.forEach((l) => {
      if (l.plant) set.add(l.plant)
    })
    setupList.forEach((s) => {
      if (s.center_code) set.add(s.center_code)
    })
    return Array.from(set)
  }, [lines, setupList])

  // Filtros aplicados na lista de Setup (blindado contra undefined/null)
  const filteredSetups = useMemo(() => {
    return (setupList ?? []).filter((item) => {
      if (!item) return false
      if (selectedPlant !== 'ALL' && item.center_code && item.center_code !== selectedPlant)
        return false
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (!matchesValidity(`${item.validity_start ?? ''} ${item.validity_end ?? ''}`)) return false

      if (selectedGaugeMaterial) {
        const gm = selectedGaugeMaterial.toLowerCase()
        const matchGauge =
          (item.from_family_code ?? '').toLowerCase().includes(gm) ||
          (item.from_code_prefix ?? '').toLowerCase().includes(gm) ||
          (item.from_description_gauge ?? '').toLowerCase().includes(gm) ||
          (item.to_family_code ?? '').toLowerCase().includes(gm) ||
          (item.to_code_prefix ?? '').toLowerCase().includes(gm) ||
          (item.to_description_gauge ?? '').toLowerCase().includes(gm)
        if (!matchGauge) return false
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchSearch =
          (item.line_code ?? '').toLowerCase().includes(q) ||
          (item.from_family_code ?? '').toLowerCase().includes(q) ||
          (item.to_family_code ?? '').toLowerCase().includes(q) ||
          (item.to_description_gauge ?? '').toLowerCase().includes(q) ||
          (item.work_center ?? '').toLowerCase().includes(q) ||
          (item.responsible_name && item.responsible_name.toLowerCase().includes(q))
        if (!matchSearch) return false
      }
      return true
    })
  }, [
    setupList,
    selectedPlant,
    selectedLine,
    selectedStatus,
    validityFilter,
    selectedGaugeMaterial,
    searchTerm,
  ])

  // Filtros aplicados nas Paradas Programadas (blindado contra undefined/null)
  const filteredStops = useMemo(() => {
    return (stopsList ?? []).filter((item) => {
      if (!item) return false
      if (selectedPlant !== 'ALL' && item.center_code && item.center_code !== selectedPlant)
        return false
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (selectedRuleType !== 'ALL' && item.stop_type !== selectedRuleType) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (!matchesValidity(item.validity)) return false

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchSearch =
          (item.line_code ?? '').toLowerCase().includes(q) ||
          (item.stop_type ?? '').toLowerCase().includes(q) ||
          (item.description ?? '').toLowerCase().includes(q) ||
          (item.reason ?? '').toLowerCase().includes(q) ||
          (item.responsible_name && item.responsible_name.toLowerCase().includes(q))
        if (!matchSearch) return false
      }
      return true
    })
  }, [
    stopsList,
    selectedPlant,
    selectedLine,
    selectedRuleType,
    selectedStatus,
    validityFilter,
    searchTerm,
  ])

  // Filtros aplicados em Tempos de Resfriamento
  const filteredCoolings = useMemo(() => {
    return coolingList.filter((item) => {
      if (selectedPlant !== 'ALL' && item.center_code && item.center_code !== selectedPlant)
        return false
      if (
        selectedLine !== 'ALL' &&
        item.origin_line_code !== selectedLine &&
        item.dest_line_code !== selectedLine
      )
        return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (!matchesValidity('', item.valid_from, item.valid_until)) return false

      if (selectedGaugeMaterial) {
        const gm = selectedGaugeMaterial.toLowerCase()
        const matchGauge =
          (item.material_code && item.material_code.toLowerCase().includes(gm)) ||
          (item.family_code && item.family_code.toLowerCase().includes(gm)) ||
          item.gauge_dimension.toLowerCase().includes(gm)
        if (!matchGauge) return false
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchSearch =
          item.origin_line_code.toLowerCase().includes(q) ||
          item.dest_line_code.toLowerCase().includes(q) ||
          (item.material_code && item.material_code.toLowerCase().includes(q)) ||
          (item.family_code && item.family_code.toLowerCase().includes(q)) ||
          item.gauge_dimension.toLowerCase().includes(q) ||
          (item.responsible_name && item.responsible_name.toLowerCase().includes(q))
        if (!matchSearch) return false
      }
      return true
    })
  }, [
    coolingList,
    selectedPlant,
    selectedLine,
    selectedStatus,
    validityFilter,
    selectedGaugeMaterial,
    searchTerm,
  ])

  // Filtros aplicados em Regras de Sequenciamento
  const filteredSequencings = useMemo(() => {
    return sequencingList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code && item.line_code !== selectedLine) return false
      if (selectedRuleType !== 'ALL' && item.rule_type !== selectedRuleType) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false

      if (selectedGaugeMaterial) {
        const gm = selectedGaugeMaterial.toLowerCase()
        const matchGauge =
          (item.from_family_code && item.from_family_code.toLowerCase().includes(gm)) ||
          (item.from_material_code && item.from_material_code.toLowerCase().includes(gm)) ||
          (item.to_family_code && item.to_family_code.toLowerCase().includes(gm)) ||
          (item.to_material_code && item.to_material_code.toLowerCase().includes(gm))
        if (!matchGauge) return false
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchSearch =
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          (item.from_family_code && item.from_family_code.toLowerCase().includes(q)) ||
          (item.to_family_code && item.to_family_code.toLowerCase().includes(q)) ||
          item.scope_level.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        if (!matchSearch) return false
      }
      return true
    })
  }, [
    sequencingList,
    selectedLine,
    selectedRuleType,
    selectedStatus,
    selectedGaugeMaterial,
    searchTerm,
  ])

  // Filtros aplicados em Revisões Registradas
  const filteredPendings = useMemo(() => {
    return pendingList.filter((item) => {
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.entity_type.toLowerCase().includes(q) ||
          item.line_code.toLowerCase().includes(q) ||
          item.change_reason.toLowerCase().includes(q) ||
          item.parameter_name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [pendingList, selectedLine, selectedStatus, searchTerm])

  // Filtros aplicados em Histórico de Alterações (com busca específica, período e tipo de regra)
  const filteredAudits = useMemo(() => {
    // 1. Garante ordenação decrescente (mais recente primeiro)
    const sorted = [...auditList].sort((a, b) => {
      const timeA = a.created ? new Date(a.created).getTime() : 0
      const timeB = b.created ? new Date(b.created).getTime() : 0
      if (timeA && timeB) return timeB - timeA
      return (b.id || '').localeCompare(a.id || '')
    })

    const now = new Date().getTime()
    const oneDay = 24 * 60 * 60 * 1000

    return sorted.filter((item) => {
      // Filtro de período
      if (historyPeriodFilter !== 'ALL' && item.created) {
        const itemTime = new Date(item.created).getTime()
        const diffDays = (now - itemTime) / oneDay
        if (historyPeriodFilter === 'TODAY' && diffDays > 1) return false
        if (historyPeriodFilter === '7D' && diffDays > 7) return false
        if (historyPeriodFilter === '30D' && diffDays > 30) return false
        if (historyPeriodFilter === '90D' && diffDays > 90) return false
      }

      // Filtro de tipo de regra
      if (historyRuleTypeFilter !== 'ALL') {
        if (item.entity_type !== historyRuleTypeFilter) return false
      }

      // Filtro de busca textual (global ou do histórico)
      const q = (historySearchTerm || searchTerm).trim().toLowerCase()
      if (q) {
        const paramMatch = (item.parameter_name || '').toLowerCase().includes(q)
        const userMatch = (item.user_name || '').toLowerCase().includes(q)
        const reasonMatch = (item.reason || '').toLowerCase().includes(q)
        const prevMatch = (item.previous_value || '').toLowerCase().includes(q)
        const newMatch = (item.new_value || '').toLowerCase().includes(q)
        const entityMatch = (item.entity_type || '').toLowerCase().includes(q)
        return paramMatch || userMatch || reasonMatch || prevMatch || newMatch || entityMatch
      }
      return true
    })
  }, [auditList, searchTerm, historySearchTerm, historyPeriodFilter, historyRuleTypeFilter])

  // Abertura do modal de edição/criação de regra
  const handleOpenRuleEditor = (target: RuleEditTarget) => {
    setRuleEditTarget(target)
    setIsRuleEditModalOpen(true)
  }

  // Sucesso na gravação de auditoria
  const handleRuleAuditSuccess = (newLog: RuleAuditLogRecord) => {
    setAuditList((prev) => [newLog, ...prev])
  }

  const clearAllFilters = () => {
    setSelectedCompany('ALL')
    setSelectedPlant('ALL')
    setSelectedLine('ALL')
    setSelectedRuleType('ALL')
    setSelectedScheduleType('ALL')
    setSelectedGaugeMaterial('')
    setSelectedStatus('ALL')
    setValidityFilter('ALL')
    setSearchTerm('')
  }

  return (
    <div className="space-y-4 p-4 md:p-6 bg-slate-50 min-h-screen text-slate-900 relative">
      {/* 1. CABEÇALHO READ ONLY PADRÃO CIAFAL COM BADGES OBRIGATÓRIAS */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Motor de Regras & Setup"
        subtitle="Painel analítico e consultivo das regras mestras industriais (tempos DE→PARA, paradas e penalidades CP-SAT)."
        compactInfo={`${filteredSetups.length} setups | Modo Somente Leitura`}
        infoTooltip="Painel analítico e consultivo das regras mestras industriais (tempos DE→PARA, acertos, paradas de capacidade, resfriamento metalúrgico e penalidades CP-SAT). Para ajustes, utilize a Ficha Mestra oficial."
        breadcrumbs={[{ label: 'Cadastros' }, { label: 'Motor de Regras & Setup' }]}
        badge={
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-blue-50 text-[#004C97] border border-blue-200 text-xs font-semibold gap-1">
              <Database className="w-3 h-3 text-[#004C97]" />
              Consulta Operacional • Fonte: Ficha Mestra
            </Badge>
            <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold gap-1">
              <Lock className="w-3 h-3 text-slate-500" />
              Somente Leitura
            </Badge>
          </div>
        }
        actions={
          <>
            <Button
              size="sm"
              onClick={() =>
                handleOpenMasterSheet(selectedLine !== 'ALL' ? selectedLine : undefined)
              }
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs gap-1.5 h-8 font-bold shadow-xs shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir na Ficha Mestra</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={loadAllData}
              disabled={isLoading}
              className="text-xs border-slate-300 gap-1.5 h-8 bg-white hover:bg-slate-50 px-3 text-slate-700 shrink-0"
              title="Recarregar parâmetros da Ficha Mestra"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </>
        }
      />

      {/* 2. PAINEL DE FILTROS AVANÇADOS NO TOPO (8 DIMENSÕES ESPECIFICADAS) */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Painel de Filtros Operacionais</span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                (consulta consolidada)
              </span>
            </div>
            {(selectedCompany !== 'ALL' ||
              selectedPlant !== 'ALL' ||
              selectedLine !== 'ALL' ||
              selectedRuleType !== 'ALL' ||
              selectedScheduleType !== 'ALL' ||
              selectedGaugeMaterial ||
              selectedStatus !== 'ALL' ||
              validityFilter !== 'ALL' ||
              searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
            {/* 1. Empresa */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Empresa
              </label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas (CIAFAL)</SelectItem>
                  <SelectItem value="CIAFAL_MATRIZ">CIAFAL Matriz</SelectItem>
                  <SelectItem value="CIAFAL_FILIAL">CIAFAL Contagem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Linha Produtiva */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Linha Produtiva
              </label>
              <Select value={selectedLine} onValueChange={setSelectedLine}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Linha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Linhas</SelectItem>
                  {lines.map((l) => (
                    <SelectItem key={l.id} value={l.code}>
                      {l.code} - {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Centro/Planta */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Centro / Planta
              </label>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Centro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Centros</SelectItem>
                  {availableCenters.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Tipo de Regra */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Tipo de Regra
              </label>
              <Select value={selectedRuleType} onValueChange={setSelectedRuleType}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os Tipos</SelectItem>
                  <SelectItem value="SETUP">Setup DE&rarr;PARA</SelectItem>
                  <SelectItem value="MANUTENCAO">Parada Manutenção</SelectItem>
                  <SelectItem value="LIMPEZA">Parada Limpeza</SelectItem>
                  <SelectItem value="PROIBITIVA">Proibitiva (CP-SAT)</SelectItem>
                  <SelectItem value="NAO_RECOMENDADA">Não Recomendada</SelectItem>
                  <SelectItem value="PREFERENCIAL">Preferencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Tipo de Programação */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Programação
              </label>
              <Select value={selectedScheduleType} onValueChange={setSelectedScheduleType}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Prog." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semanal / Mensal</SelectItem>
                  <SelectItem value="SEMANAL">Apenas Semanal</SelectItem>
                  <SelectItem value="MENSAL">Apenas Mensal (PMP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 6. Material / Bitola */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Material / Bitola
              </label>
              <Input
                placeholder="Ex: TQ-100, 1020..."
                value={selectedGaugeMaterial}
                onChange={(e) => setSelectedGaugeMaterial(e.target.value)}
                className="h-8 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            {/* 7. Status */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="ATIVO">ATIVO</SelectItem>
                  <SelectItem value="INATIVO">INATIVO</SelectItem>
                  <SelectItem value="APPROVED">APPROVED</SelectItem>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 8. Período de Validade / Vigência */}
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                Vigência
              </label>
              <Select value={validityFilter} onValueChange={setValidityFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Vigência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as Vigências</SelectItem>
                  <SelectItem value="CURRENT">Vigente (Atual)</SelectItem>
                  <SelectItem value="HISTORIC">Histórico / Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Busca textual livre */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <Input
              placeholder="Busca textual por código, família, bitola, responsável, descrição ou motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 text-xs bg-slate-50 border-slate-200 flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* 3. RESUMO ANALÍTICO DE REGRAS VINCULADAS À FICHA MESTRA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card
          onClick={() => setActiveTab('setup-acerto')}
          className={`p-3 shadow-xs cursor-pointer transition-all ${
            activeTab === 'setup-acerto'
              ? 'border-[#004C97] bg-blue-50/40 ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Setups Cadastrados</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {filteredSetups.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Matriz De/Para Ficha Mestra</div>
        </Card>

        <Card
          onClick={() => setActiveTab('paradas-programadas')}
          className={`p-3 shadow-xs cursor-pointer transition-all ${
            activeTab === 'paradas-programadas'
              ? 'border-[#004C97] bg-blue-50/40 ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Paradas Programadas</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {filteredStops.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Capacidade e Manutenção</div>
        </Card>

        <Card
          onClick={() => setActiveTab('resfriamento')}
          className={`p-3 shadow-xs cursor-pointer transition-all ${
            activeTab === 'resfriamento'
              ? 'border-[#004C97] bg-blue-50/40 ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <ThermometerSnowflake className="w-3.5 h-3.5 text-cyan-600" />
            <span>Resfriamentos</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {filteredCoolings.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cura Metalúrgica (h)</div>
        </Card>

        <Card
          onClick={() => setActiveTab('sequenciamento')}
          className={`p-3 shadow-xs cursor-pointer transition-all ${
            activeTab === 'sequenciamento'
              ? 'border-[#004C97] bg-blue-50/40 ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sequenciamento</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {filteredSequencings.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Penalidades CP-SAT</div>
        </Card>

        <Card
          onClick={() => setActiveTab('revisoes-pendentes')}
          className={`p-3 shadow-xs cursor-pointer transition-all ${
            activeTab === 'revisoes-pendentes'
              ? 'border-[#004C97] bg-blue-50/40 ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Revisões Registradas</span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {filteredPendings.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Histórico de Esteira</div>
        </Card>

        <Card
          onClick={() => setActiveTab('historico-alteracoes')}
          className={`p-3 shadow-xs cursor-pointer transition-all ${
            activeTab === 'historico-alteracoes'
              ? 'border-[#004C97] bg-blue-50/40 ring-1 ring-[#004C97]'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>Auditoria & Logs</span>
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {filteredAudits.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Rastreabilidade Completa</div>
        </Card>
      </div>

      {/* 4. ÁREA CENTRAL: ABAS DE CONSULTA READ-ONLY */}
      <Card className="border-slate-200 shadow-xs bg-white w-full max-w-full min-w-0 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-full min-w-0">
          <div className="border-b border-slate-200 bg-slate-50/70 rounded-t-xl w-full max-w-full min-w-0 overflow-x-auto scrollbar-thin pb-2 pt-3 px-3 sm:px-4 [scrollbar-gutter:stable]">
            <TabsList className="inline-flex h-11 w-max min-w-full items-center justify-start bg-slate-200/70 p-1 gap-1 rounded-lg border border-slate-300/60 shadow-xs">
              <TabsTrigger
                value="setup-acerto"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>1. Setup & Acerto</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-slate-300 bg-slate-50/80 font-mono"
                >
                  {filteredSetups.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="paradas-programadas"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>2. Paradas Programadas</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-slate-300 bg-slate-50/80 font-mono"
                >
                  {filteredStops.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="resfriamento"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <ThermometerSnowflake className="w-3.5 h-3.5 shrink-0" />
                <span>3. Tempo de Resfriamento</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-slate-300 bg-slate-50/80 font-mono"
                >
                  {filteredCoolings.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="sequenciamento"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>4. Regras de Sequenciamento</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-slate-300 bg-slate-50/80 font-mono"
                >
                  {filteredSequencings.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="regras-industriais-master"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>5. Parâmetros Mestres CP-SAT</span>
              </TabsTrigger>

              <TabsTrigger
                value="revisoes-pendentes"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>6. Histórico de Revisões</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-slate-300 bg-slate-50/80 font-mono"
                >
                  {filteredPendings.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="historico-alteracoes"
                className="h-9 shrink-0 text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5 rounded-md transition-colors"
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>7. Trilha de Auditoria</span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-slate-300 bg-slate-50/80 font-mono"
                >
                  {filteredAudits.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1 — SETUP & ACERTO (CONSULTA READ ONLY DA TABELA OFICIAL)             */}
          {/* ========================================================================= */}
          <TabsContent value="setup-acerto" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Matriz de Setup & Acerto DE &rarr; PARA (Fonte: Ficha Mestra / SAP)
                  <Badge className="bg-slate-100 text-slate-700 font-mono text-[10px]">
                    Modo Consulta &bull; Clique na linha para evidência estatística MES
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Origem: <strong>Centros e Ficha Mestra (Tabelas Oficiais)</strong>. Para
                  alterações, clique no botão &ldquo;Abrir na Ficha Mestra&rdquo;.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleOpenMasterSheet(selectedLine !== 'ALL' ? selectedLine : undefined, 'setup')
                }
                className="h-7 text-xs border-blue-200 text-[#004C97] hover:bg-blue-50 gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir na Ficha Mestra (Setup)</span>
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Origem do Dado</th>
                    <th className="p-2.5">Centro / Linha</th>
                    <th className="p-2.5">Centro Trabalho</th>
                    <th className="p-2.5 bg-blue-50/50 text-blue-900">Família / Bitola DE</th>
                    <th className="p-2.5 bg-indigo-50/50 text-indigo-900">Família / Bitola PARA</th>
                    <th className="p-2.5 text-right font-mono font-bold">Tempo Setup (min)</th>
                    <th className="p-2.5 text-right font-mono">Tempo Acerto (min)</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Período de Vigência</th>
                    <th className="p-2.5">Última Atualização</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(filteredSetups ?? []).map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => handleSelectSetupRow(row)}
                      className="hover:bg-blue-50/60 cursor-pointer transition-colors whitespace-nowrap group"
                    >
                      {/* Origem do Dado */}
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-300 text-[10px] font-mono"
                          title="Centros e Ficha Mestra (Tabelas Oficiais)"
                        >
                          Centros e Ficha Mestra
                        </Badge>
                      </td>

                      <td className="p-2.5">
                        <span className="font-mono text-slate-600">{row.center_code}</span> /{' '}
                        <strong className="text-[#004C97]">{row.line_code}</strong>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>

                      {/* Transição DE */}
                      <td className="p-2.5 bg-blue-50/20">
                        <div className="font-bold text-slate-800">
                          {row.is_generic ? '* (QUALQUER)' : row.from_family_code}
                        </div>
                        <div
                          className="text-[10px] text-slate-500 truncate max-w-xs"
                          title={row.from_description_gauge}
                        >
                          {row.from_code_prefix} &bull; {row.from_description_gauge}
                        </div>
                      </td>

                      {/* Transição PARA */}
                      <td className="p-2.5 bg-indigo-50/20">
                        <div className="font-bold text-indigo-950">{row.to_family_code}</div>
                        <div
                          className="text-[10px] text-slate-600 truncate max-w-xs"
                          title={row.to_description_gauge}
                        >
                          {row.to_code_prefix} &bull; {row.to_description_gauge}
                        </div>
                      </td>

                      {/* Parâmetros e Unidade */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900 group-hover:text-[#004C97]">
                        {row.setup_time_minutes} min
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-600">
                        {row.tuning_time_minutes} min
                      </td>

                      {/* Status */}
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>

                      {/* Vigência */}
                      <td className="p-2.5 text-slate-600 text-[11px] font-mono">
                        {row.validity_start || '01/01/2025'} &rarr;{' '}
                        {row.validity_end || '31/12/2026'}
                      </td>

                      {/* Última atualização */}
                      <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                        {row.last_revision || '2025-01-15'}
                      </td>

                      {/* Responsável */}
                      <td className="p-2.5 text-slate-700">
                        {row.responsible_name || 'Engenharia de Processos'}
                      </td>

                      {/* Ações: Editar com Auditoria + Abrir na Ficha Mestra */}
                      <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleOpenRuleEditor({
                                entityType: 'SETUP',
                                ruleId: row.id,
                                lineCode: row.line_code,
                                workCenter: row.work_center,
                                parameterName: `Setup ${row.from_family_code || '*'} \u2192 ${row.to_family_code || '*'} (${row.line_code})`,
                                currentValue: `${row.setup_time_minutes} min`,
                                unit: 'min',
                                reasonDefault: 'Calibração de tempo de setup na matriz',
                              })
                            }
                            className="h-6 px-2 text-[11px] text-[#004C97] border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
                            title="Editar tempo de setup com registro na trilha de auditoria"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Editar</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenMasterSheet(row.line_code, 'setup')}
                            className="h-6 px-2 text-[11px] text-slate-600 hover:bg-slate-100 gap-1 font-semibold"
                            title="Abrir este parâmetro diretamente na Ficha Mestra"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ficha Mestra</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 2 — PARADAS PROGRAMADAS (CONSULTA READ ONLY)                           */}
          {/* ========================================================================= */}
          <TabsContent value="paradas-programadas" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Paradas Programadas de Linha & Impacto de Capacidade (Fonte Oficial)
                </h3>
                <p className="text-xs text-slate-500">
                  Origem: <strong>Centros e Ficha Mestra (Tabelas Oficiais)</strong> &bull; Valores
                  calculados a partir do calendário industrial.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleOpenMasterSheet(
                    selectedLine !== 'ALL' ? selectedLine : undefined,
                    'paradas',
                  )
                }
                className="h-7 text-xs border-amber-200 text-amber-800 hover:bg-amber-50 gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir na Ficha Mestra (Paradas)</span>
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Origem do Dado</th>
                    <th className="p-2.5">Centro / Linha</th>
                    <th className="p-2.5">Centro Trabalho</th>
                    <th className="p-2.5">Tipo / Motivo</th>
                    <th className="p-2.5">Descrição Operacional</th>
                    <th className="p-2.5 text-right">Duração (min)</th>
                    <th className="p-2.5 text-center">Início / Turno</th>
                    <th className="p-2.5 text-right text-amber-800 bg-amber-50/50">
                      Horas Perdidas / Mês
                    </th>
                    <th className="p-2.5 text-right text-amber-800 bg-amber-50/50">
                      Capacidade Perdida (t)
                    </th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Vigência</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(filteredStops ?? []).map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-300 text-[10px] font-mono"
                        >
                          Centros e Ficha Mestra
                        </Badge>
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono text-slate-600">{row.center_code}</span> /{' '}
                        <strong className="text-[#004C97]">{row.line_code}</strong>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">{row.work_center}</td>
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-800 border-amber-200 text-[10px]"
                        >
                          {row.stop_type}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          {row.reason}
                        </span>
                      </td>
                      <td
                        className="p-2.5 text-slate-800 font-medium max-w-xs truncate"
                        title={row.description}
                      >
                        {row.description}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-900">
                        {row.duration_minutes} min
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-700">
                        {row.start_time || '06:00'} ({row.shift || '1T'})
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-800 bg-amber-50/20">
                        {row.lost_hours_month || 0} h/mês
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-700 bg-amber-50/20">
                        {row.lost_capacity_tons || 0} t
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-600 text-[11px] font-mono">{row.validity}</td>
                      <td className="p-2.5 text-slate-700">{row.responsible_name}</td>
                      <td className="p-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenMasterSheet(row.line_code, 'paradas')}
                          className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-100 gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir na Ficha Mestra</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 3 — TEMPO DE RESFRIAMENTO (CONSULTA READ ONLY)                         */}
          {/* ========================================================================= */}
          <TabsContent value="resfriamento" className="m-0 p-4 space-y-4">
            <CoolingCalculatorWidget />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Tabela Oficial de Resfriamento & Cura Metalúrgica</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold text-[#004C97] bg-blue-50 border-blue-200"
                  >
                    Fonte: Ficha Mestra
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Origem: <strong>Centros e Ficha Mestra (Tabelas Oficiais)</strong> &bull;
                  Parâmetros de espera obrigatória de resfriamento entre processos.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleOpenMasterSheet(
                    selectedLine !== 'ALL' ? selectedLine : undefined,
                    'resfriamento',
                  )
                }
                className="h-7 text-xs border-blue-200 text-[#004C97] hover:bg-blue-50 gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir na Ficha Mestra (Resfriamento)</span>
              </Button>
            </div>

            <div className="w-full max-w-full min-w-0 overflow-x-auto border border-slate-200 rounded-lg scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Origem do Dado</th>
                    <th className="p-2.5">Centro</th>
                    <th className="p-2.5">Origem &rarr; Destino</th>
                    <th className="p-2.5">Família / Material</th>
                    <th className="p-2.5">Bitola / Seção</th>
                    <th className="p-2.5 text-right text-[#004C97] bg-blue-50/40">Tempo Mínimo</th>
                    <th className="p-2.5">Unidade</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Período de Vigência</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredCoolings.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-6 text-center text-slate-500 text-xs">
                        Nenhum registro de tempo de resfriamento encontrado para os filtros
                        selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredCoolings.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                      >
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className="bg-slate-50 text-slate-700 border-slate-300 text-[10px] font-mono"
                          >
                            Centros e Ficha Mestra
                          </Badge>
                        </td>
                        <td className="p-2.5 font-mono text-slate-600">{row.center_code}</td>
                        <td className="p-2.5">
                          <strong className="text-slate-800">{row.origin_line_code}</strong> &rarr;{' '}
                          <strong className="text-[#004C97]">{row.dest_line_code}</strong>
                        </td>
                        <td className="p-2.5">
                          <span className="font-semibold text-slate-800">{row.family_code}</span>
                          {row.material_code && (
                            <span className="text-slate-400 font-mono text-[10px] ml-1">
                              ({row.material_code})
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700">{row.gauge_dimension}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#004C97] bg-blue-50/30">
                          {row.cooling_time_hours}
                        </td>
                        <td className="p-2.5 text-slate-500 font-mono">{row.unit || 'h'}</td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.status === 'ATIVO'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px] font-mono">
                          {row.valid_from} &rarr; {row.valid_until}
                        </td>
                        <td className="p-2.5 text-slate-700">{row.responsible_name}</td>
                        <td className="p-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleOpenMasterSheet(row.dest_line_code, 'resfriamento')
                            }
                            className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-100 gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Abrir na Ficha Mestra</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 4 — REGRAS DE SEQUENCIAMENTO (CONSULTA READ ONLY)                     */}
          {/* ========================================================================= */}
          <TabsContent value="sequenciamento" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Regras de Sequenciamento & Penalidades no Motor CP-SAT (Fonte Oficial)
                </h3>
                <p className="text-xs text-slate-500">
                  Origem: <strong>Centros e Ficha Mestra (Tabelas Oficiais)</strong> &bull;
                  Consumidas em tempo real pelo sequenciamento automático.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleOpenMasterSheet(
                    selectedLine !== 'ALL' ? selectedLine : undefined,
                    'sequenciamento',
                  )
                }
                className="h-7 text-xs border-indigo-200 text-indigo-800 hover:bg-indigo-50 gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir na Ficha Mestra (Sequenciamento)</span>
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Origem do Dado</th>
                    <th className="p-2.5">Linha</th>
                    <th className="p-2.5">Família / Material DE</th>
                    <th className="p-2.5">Família / Material PARA</th>
                    <th className="p-2.5 text-center">Tipo da Regra</th>
                    <th className="p-2.5 text-right font-mono">Penalidade Score</th>
                    <th className="p-2.5">Justificativa Técnica</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-center">Versão</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredSequencings.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-slate-50 text-slate-700 border-slate-300 text-[10px] font-mono"
                        >
                          Centros e Ficha Mestra
                        </Badge>
                      </td>
                      <td className="p-2.5 font-bold text-[#004C97]">
                        {row.line_code || 'GLOBAL'}
                      </td>
                      <td className="p-2.5 font-mono text-slate-700">
                        {row.from_family_code || '*'}{' '}
                        {row.from_material_code ? `(${row.from_material_code})` : ''}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-indigo-900">
                        {row.to_family_code || '*'}{' '}
                        {row.to_material_code ? `(${row.to_material_code})` : ''}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.rule_type === 'PROIBITIVA'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : row.rule_type === 'NAO_RECOMENDADA'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : row.rule_type === 'PREFERENCIAL'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.rule_type}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {row.penalty_score > 0 ? (
                          <span className="text-rose-700">-{row.penalty_score} pts</span>
                        ) : row.penalty_score < 0 ? (
                          <span className="text-emerald-700">
                            +{Math.abs(row.penalty_score)} pts
                          </span>
                        ) : (
                          <span className="text-slate-500">0 pts</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-800 max-w-sm truncate" title={row.reason}>
                        {row.reason}
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge variant="outline" className="text-[10px]">
                          {row.status}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-500">{row.version}</td>
                      <td className="p-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenMasterSheet(row.line_code, 'sequenciamento')}
                          className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-100 gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir na Ficha Mestra</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 5 — BIBLIOTECA MESTRE DE REGRAS INDUSTRIAIS (CONSOLIDADA READ ONLY)     */}
          {/* ========================================================================= */}
          <TabsContent value="regras-industriais-master" className="m-0 p-4 space-y-3">
            <MasterIndustrialRulesTab />
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 6 — HISTÓRICO DE REVISÕES (CONSULTA READ ONLY)                        */}
          {/* ========================================================================= */}
          <TabsContent value="revisoes-pendentes" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Histórico de Revisões e Pareceres Técnicos (Modo Consulta)
                </h3>
                <p className="text-xs text-slate-500">
                  Registro de propostas, pareceres de IA e histórico de dupla homologação.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredPendings.length} registro(s) arquivados
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Linha / Entidade</th>
                    <th className="p-2.5">Parâmetro / Código</th>
                    <th className="p-2.5 font-mono">Atual &rarr; Proposto</th>
                    <th className="p-2.5">Motivo & Parecer Técnico</th>
                    <th className="p-2.5 text-center">Fase 1: PCP</th>
                    <th className="p-2.5 text-center">Fase 2: Gestor Linha</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredPendings.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                    >
                      <td className="p-2.5">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-[#004C97] border-blue-200 font-mono text-[10px]"
                        >
                          {row.entity_type}
                        </Badge>
                      </td>
                      <td className="p-2.5 font-bold text-slate-800">{row.line_code}</td>
                      <td className="p-2.5 font-mono text-slate-700">{row.parameter_name}</td>
                      <td className="p-2.5 font-mono">
                        <span className="line-through text-slate-400">{row.current_value}</span>{' '}
                        &rarr; <strong className="text-[#004C97]">{row.proposed_value}</strong>
                      </td>
                      <td
                        className="p-2.5 text-slate-700 max-w-xs truncate"
                        title={row.change_reason}
                      >
                        {row.change_reason}
                      </td>

                      {/* FASE 1: PCP */}
                      <td className="p-2.5 text-center">
                        {row.pcp_approved_at ? (
                          <div className="text-[10px]">
                            <span className="font-bold text-emerald-700 block">
                              ✓ {row.pcp_approver_name || 'Aprovado'}
                            </span>
                            <span className="text-slate-400 font-mono">{row.pcp_approved_at}</span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-amber-50 text-amber-800 border-amber-200"
                          >
                            Aguardando PCP
                          </Badge>
                        )}
                      </td>

                      {/* FASE 2: GESTOR LINHA */}
                      <td className="p-2.5 text-center">
                        {row.line_manager_approved_at ? (
                          <div className="text-[10px]">
                            <span className="font-bold text-emerald-700 block">
                              ✓ {row.line_manager_name || 'Homologado'}
                            </span>
                            <span className="text-slate-400 font-mono">
                              {row.line_manager_approved_at}
                            </span>
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-slate-50 text-slate-500 border-slate-200"
                          >
                            Pendente
                          </Badge>
                        )}
                      </td>

                      <td className="p-2.5 text-center">
                        <Badge
                          className={`text-[10px] ${
                            row.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {row.status}
                        </Badge>
                      </td>

                      <td className="p-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenMasterSheet(row.line_code, 'setup')}
                          className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-100 gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir na Ficha Mestra</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* ABA 7 — HISTÓRICO & AUDITORIA (COM FILTROS, ORDENAÇÃO E ESTADO VAZIO)     */}
          {/* ========================================================================= */}
          <TabsContent value="historico-alteracoes" className="m-0 p-4 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Trilha de Auditoria & Histórico de Alterações de Regras</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border-emerald-200"
                  >
                    Backend Ativo
                  </Badge>
                </h3>
                <p className="text-xs text-slate-500">
                  Todas as criações e edições de regras registram automaticamente autor, data/hora,
                  tipo de regra e diff anterior &rarr; novo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleOpenRuleEditor({
                      entityType: 'SETUP',
                      parameterName: 'Nova Regra Industrial',
                      currentValue: '',
                      isNew: true,
                      reasonDefault: 'Criação de nova regra industrial pelo painel de auditoria',
                    })
                  }
                  className="h-7 text-xs border-blue-200 text-[#004C97] hover:bg-blue-50 font-semibold gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Registrar Alteração Manual</span>
                </Button>
                <div className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                  {filteredAudits.length} log(s)
                </div>
              </div>
            </div>

            {/* Sub-painel de busca e filtros do histórico */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar por regra, autor, motivo ou valores..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white border-slate-300 w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Filtro de Período */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-medium shrink-0">Período:</span>
                  <Select value={historyPeriodFilter} onValueChange={setHistoryPeriodFilter}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-300 w-32">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todo Histórico</SelectItem>
                      <SelectItem value="TODAY">Últimas 24h</SelectItem>
                      <SelectItem value="7D">Últimos 7 dias</SelectItem>
                      <SelectItem value="30D">Últimos 30 dias</SelectItem>
                      <SelectItem value="90D">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filtro de Tipo de Regra */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-medium shrink-0">Tipo:</span>
                  <Select value={historyRuleTypeFilter} onValueChange={setHistoryRuleTypeFilter}>
                    <SelectTrigger className="h-8 text-xs bg-white border-slate-300 w-36">
                      <SelectValue placeholder="Todas as Regras" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as Regras</SelectItem>
                      <SelectItem value="SETUP">Setup & Acerto</SelectItem>
                      <SelectItem value="STOP">Paradas Programadas</SelectItem>
                      <SelectItem value="COOLING">Resfriamento</SelectItem>
                      <SelectItem value="SEQUENCING">Sequenciamento</SelectItem>
                      <SelectItem value="CP_SAT">Mestres CP-SAT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(historySearchTerm ||
                  historyPeriodFilter !== 'ALL' ||
                  historyRuleTypeFilter !== 'ALL') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setHistorySearchTerm('')
                      setHistoryPeriodFilter('ALL')
                      setHistoryRuleTypeFilter('ALL')
                    }}
                    className="h-8 text-xs text-slate-500 hover:text-slate-900"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {filteredAudits.length === 0 ? (
              /* ESTADO VAZIO AMIGÁVEL */
              <div className="p-8 text-center bg-white border border-slate-200 rounded-lg space-y-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#004C97] flex items-center justify-center mx-auto">
                  <HistoryIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800">
                    Nenhuma alteração de regra encontrada
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {historySearchTerm ||
                    historyPeriodFilter !== 'ALL' ||
                    historyRuleTypeFilter !== 'ALL'
                      ? 'Não há registros de auditoria correspondentes aos filtros aplicados. Tente alterar os termos da busca ou limpar o filtro de período.'
                      : 'Ainda não foram registradas alterações nas regras industriais. Ao criar ou editar qualquer regra nas abas anteriores, a trilha de auditoria será exibida aqui automaticamente.'}
                  </p>
                </div>
                {historySearchTerm ||
                historyPeriodFilter !== 'ALL' ||
                historyRuleTypeFilter !== 'ALL' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setHistorySearchTerm('')
                      setHistoryPeriodFilter('ALL')
                      setHistoryRuleTypeFilter('ALL')
                    }}
                    className="text-xs h-7 border-slate-300"
                  >
                    Limpar Filtros
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() =>
                      handleOpenRuleEditor({
                        entityType: 'SETUP',
                        parameterName: 'Setup Inicial Padrão',
                        currentValue: '45 min',
                        isNew: false,
                        reasonDefault: 'Ajuste inicial de calibração de parâmetros',
                      })
                    }
                    className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs h-7 font-bold gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Registrar Primeiro Evento</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                      <th className="p-2.5">Tipo de Regra</th>
                      <th className="p-2.5">Parâmetro / Regra Afetada</th>
                      <th className="p-2.5 font-mono">Valor Anterior</th>
                      <th className="p-2.5 font-mono">Novo Valor (Diff)</th>
                      <th className="p-2.5">Usuário (Autor)</th>
                      <th className="p-2.5">Data / Hora</th>
                      <th className="p-2.5">Motivo / Justificativa</th>
                      <th className="p-2.5 text-center">Origem</th>
                      <th className="p-2.5 text-center">Validação MES</th>
                      <th className="p-2.5">Recomendação IA</th>
                      <th className="p-2.5">Aprovador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredAudits.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-blue-50/40 transition-colors whitespace-nowrap"
                      >
                        <td className="p-2.5">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-mono font-bold"
                          >
                            {row.entity_type || 'REGRA'}
                          </Badge>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">{row.parameter_name}</td>
                        <td className="p-2.5 font-mono text-slate-500 line-through">
                          {row.previous_value || '-'}
                        </td>
                        <td className="p-2.5 font-mono font-bold text-[#004C97] bg-blue-50/20">
                          {row.new_value || '-'}
                        </td>
                        <td className="p-2.5 text-slate-800 font-medium">{row.user_name}</td>
                        <td className="p-2.5 font-mono text-slate-500 text-[11px]">
                          {row.change_date}
                        </td>
                        <td className="p-2.5 text-slate-800 max-w-xs truncate" title={row.reason}>
                          {row.reason}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                            {row.origin}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge
                            className={`text-[10px] ${
                              row.mes_validation_status === 'VALIDADO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.mes_validation_status}
                          </Badge>
                        </td>
                        <td
                          className="p-2.5 text-slate-700 italic max-w-xs truncate"
                          title={row.ai_recommendation}
                        >
                          {row.ai_recommendation || '-'}
                        </td>
                        <td className="p-2.5 text-slate-600">{row.approver_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* MODAL DE EDIÇÃO/CRIAÇÃO DE REGRA COM TRILHA DE AUDITORIA */}
      <RuleEditModal
        isOpen={isRuleEditModalOpen}
        onClose={() => setIsRuleEditModalOpen(false)}
        target={ruleEditTarget}
        onSuccess={handleRuleAuditSuccess}
      />

      {/* DRAWER LATERAL DE DETALHE DE SETUP & EVIDÊNCIA MES/IA (PURAMENTE CONSULTIVO) */}
      <SetupDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        record={selectedSetupForDrawer}
      />
    </div>
  )
}

export default RulesEnginePage
