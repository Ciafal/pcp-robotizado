import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { MasterIndustrialRulesTab } from '@/components/rules-engine/MasterIndustrialRulesTab'

export const RulesEnginePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

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

  const [activeTab, setActiveTab] = useState<string>('setup-acerto')

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

  // Filtros aplicados na lista de Setup
  const filteredSetups = useMemo(() => {
    return setupList.filter((item) => {
      if (selectedPlant !== 'ALL' && item.center_code && item.center_code !== selectedPlant)
        return false
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (!matchesValidity(`${item.validity_start} ${item.validity_end}`)) return false

      if (selectedGaugeMaterial) {
        const gm = selectedGaugeMaterial.toLowerCase()
        const matchGauge =
          item.from_family_code.toLowerCase().includes(gm) ||
          item.from_code_prefix.toLowerCase().includes(gm) ||
          item.from_description_gauge.toLowerCase().includes(gm) ||
          item.to_family_code.toLowerCase().includes(gm) ||
          item.to_code_prefix.toLowerCase().includes(gm) ||
          item.to_description_gauge.toLowerCase().includes(gm)
        if (!matchGauge) return false
      }

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchSearch =
          item.line_code.toLowerCase().includes(q) ||
          item.from_family_code.toLowerCase().includes(q) ||
          item.to_family_code.toLowerCase().includes(q) ||
          item.to_description_gauge.toLowerCase().includes(q) ||
          item.work_center.toLowerCase().includes(q) ||
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

  // Filtros aplicados nas Paradas Programadas
  const filteredStops = useMemo(() => {
    return stopsList.filter((item) => {
      if (selectedPlant !== 'ALL' && item.center_code && item.center_code !== selectedPlant)
        return false
      if (selectedLine !== 'ALL' && item.line_code !== selectedLine) return false
      if (selectedRuleType !== 'ALL' && item.stop_type !== selectedRuleType) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (!matchesValidity(item.validity)) return false

      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchSearch =
          item.line_code.toLowerCase().includes(q) ||
          item.stop_type.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
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

  // Filtros aplicados em Histórico de Alterações
  const filteredAudits = useMemo(() => {
    return auditList.filter((item) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        return (
          item.parameter_name.toLowerCase().includes(q) ||
          item.user_name.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [auditList, searchTerm])

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#004C97] text-white rounded-lg shadow-xs shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Motor de Regras & Setup
              </h1>
              {/* Badge Obrigatória 1 */}
              <Badge className="bg-blue-50 text-[#004C97] border border-blue-200 text-[10px] font-semibold gap-1">
                <Database className="w-3 h-3 text-[#004C97]" />
                Consulta Operacional &bull; Fonte: Centros e Ficha Mestra
              </Badge>
              {/* Badge Obrigatória 2 */}
              <Badge className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-semibold gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                Modo Somente Leitura
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Painel analítico e consultivo das regras mestras industriais (tempos DE&rarr;PARA,
              acertos, paradas de capacidade, resfriamento metalúrgico e penalidades CP-SAT). Para
              ajustes, utilize a Ficha Mestra oficial.
            </p>
          </div>
        </div>

        {/* AÇÕES NO TOPO: APENAS CONSULTAS / NAVEGAÇÃO / ATUALIZAÇÃO */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenMasterSheet(selectedLine !== 'ALL' ? selectedLine : undefined)}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs gap-1.5 h-8 font-bold shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir na Ficha Mestra</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            disabled={isLoading}
            className="text-xs border-slate-300 gap-1.5 h-8 bg-white hover:bg-slate-50 px-3 text-slate-700"
            title="Recarregar parâmetros da Ficha Mestra"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

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
      <Card className="border-slate-200 shadow-xs bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-slate-200 px-4 pt-3 bg-slate-50/70 rounded-t-xl overflow-x-auto">
            <TabsList className="h-9 bg-slate-200/60 p-0.5 gap-1">
              <TabsTrigger
                value="setup-acerto"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>1. Setup & Acerto</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {filteredSetups.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="paradas-programadas"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>2. Paradas Programadas</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {filteredStops.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="resfriamento"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <ThermometerSnowflake className="w-3.5 h-3.5" />
                <span>3. Tempo de Resfriamento</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {filteredCoolings.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="sequenciamento"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>4. Regras de Sequenciamento</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {filteredSequencings.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="regras-industriais-master"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>5. Parâmetros Mestres CP-SAT</span>
              </TabsTrigger>

              <TabsTrigger
                value="revisoes-pendentes"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>6. Histórico de Revisões</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
                  {filteredPendings.length}
                </Badge>
              </TabsTrigger>

              <TabsTrigger
                value="historico-alteracoes"
                className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#004C97] data-[state=active]:shadow-xs font-semibold gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                <span>7. Trilha de Auditoria</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-slate-300">
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
                  {filteredSetups.map((row) => (
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

                      {/* Única Ação Permitida */}
                      <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenMasterSheet(row.line_code, 'setup')}
                          className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-100 gap-1 font-semibold"
                          title="Abrir este parâmetro diretamente na Ficha Mestra"
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
                  {filteredStops.map((row) => (
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
                <h3 className="text-sm font-bold text-slate-900">
                  Tabela Oficial de Resfriamento & Cura Metalúrgica (Fonte: Ficha Mestra)
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
                className="h-7 text-xs border-cyan-200 text-cyan-800 hover:bg-cyan-50 gap-1 font-semibold"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir na Ficha Mestra (Resfriamento)</span>
              </Button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Origem do Dado</th>
                    <th className="p-2.5">Centro</th>
                    <th className="p-2.5">Origem &rarr; Destino</th>
                    <th className="p-2.5">Família / Material</th>
                    <th className="p-2.5">Bitola / Seção</th>
                    <th className="p-2.5 text-right text-cyan-900 bg-cyan-50/50">Tempo Mínimo</th>
                    <th className="p-2.5">Unidade</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Período de Vigência</th>
                    <th className="p-2.5">Responsável</th>
                    <th className="p-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredCoolings.map((row) => (
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
                      <td className="p-2.5 text-right font-mono font-bold text-cyan-800 bg-cyan-50/30">
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
                          onClick={() => handleOpenMasterSheet(row.dest_line_code, 'resfriamento')}
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
          {/* ABA 7 — HISTÓRICO & AUDITORIA (TRILHA READ ONLY PRESERVADA)               */}
          {/* ========================================================================= */}
          <TabsContent value="historico-alteracoes" className="m-0 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Trilha de Auditoria & Preservação Histórica (100% dos Registros Preservados)
                </h3>
                <p className="text-xs text-slate-500">
                  Todas as versões anteriores guardam solicitante, data/hora, parecer IA, evidência
                  MES e aprovador.
                </p>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {filteredAudits.length} log(s) registrado(s)
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold text-[11px] whitespace-nowrap">
                    <th className="p-2.5">Origem do Dado</th>
                    <th className="p-2.5">Parâmetro / Regra</th>
                    <th className="p-2.5 font-mono">Valor Anterior</th>
                    <th className="p-2.5 font-mono">Novo Valor Publicado</th>
                    <th className="p-2.5">Usuário Solicitante</th>
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
                          className="bg-slate-50 text-slate-700 border-slate-300 text-[10px] font-mono"
                        >
                          Centros e Ficha Mestra
                        </Badge>
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">{row.parameter_name}</td>
                      <td className="p-2.5 font-mono text-slate-500 line-through">
                        {row.previous_value || '-'}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#004C97]">
                        {row.new_value || '-'}
                      </td>
                      <td className="p-2.5 text-slate-700">{row.user_name}</td>
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
          </TabsContent>
        </Tabs>
      </Card>

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
