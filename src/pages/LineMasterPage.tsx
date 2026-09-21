import React, { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Edit3,
  Filter,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { lineMasterService } from '@/services/line-master'
import { OeeInteractiveValue } from '@/components/common/OeeInteractiveValue'
import { sapIntegrationService } from '@/services/sap-integration'
import { authService } from '@/services/pcp-auth'
import { CiafalPageHeader } from '@/components/common/CiafalDesignSystem'
import { MasterSheetCompletenessModal } from '@/components/line-master/MasterSheetCompletenessModal'
import {
  LineOverviewData,
  ProductFamily,
  ProductionLine,
  SapIntegrationDefinition,
  MasterSheetCompletenessResult,
} from '@/types/line-master'
import { UserProfile } from '@/types/pcp-auth'
import { Can } from '@/components/auth/Can'
import { AddLineWizardModal } from '@/components/line-master/AddLineWizardModal'
import { EditLineModal } from '@/components/line-master/EditLineModal'
import { SapIntegrationCatalogModal } from '@/components/line-master/SapIntegrationCatalogModal'
// Centros e Ficha Mestra
import { LineMasterDetailView } from '@/components/line-master/LineMasterDetailView'
import { MasterSheetNavigationTarget } from '@/types/line-master'

export default function LineMasterPage() {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState<boolean>(true)
  const [lines, setLines] = useState<ProductionLine[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [productFamilies, setProductFamilies] = useState<ProductFamily[]>([])
  const [sapCatalog, setSapCatalog] = useState<SapIntegrationDefinition[]>([])

  // Linha Selecionada para Visão 360 Detalhada
  const urlLineId = searchParams.get('lineId') || searchParams.get('id')
  const [selectedLineId, setSelectedLineId] = useState<string | null>(urlLineId)
  const [selectedLineOverview, setSelectedLineOverview] = useState<LineOverviewData | null>(null)
  const [loadingOverview, setLoadingOverview] = useState<boolean>(false)
  const lastLoadedLineIdRef = React.useRef<string | null>(null)
  const isLoadingOverviewRef = React.useRef<boolean>(false)

  // Filtros de Linhas/Centros (Ativos / Inativos / Todos)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [activeCadastralFilter, setActiveCadastralFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>(
    'ACTIVE',
  )
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [plantFilter, setPlantFilter] = useState<string>('ALL')
  const [companyFilter, setCompanyFilter] = useState<string>('ALL')
  const [lineFilter, setLineFilter] = useState<string>('ALL')
  const [processFilter, setProcessFilter] = useState<string>('ALL')
  const [programmingTypeFilter, setProgrammingTypeFilter] = useState<string>('ALL')

  // Modais
  const [isAddLineModalOpen, setIsAddLineModalOpen] = useState<boolean>(false)
  const [isEditLineModalOpen, setIsEditLineModalOpen] = useState<boolean>(false)
  const [lineEditTarget, setLineEditTarget] = useState<ProductionLine | null>(null)
  const [isSapCatalogModalOpen, setIsSapCatalogModalOpen] = useState<boolean>(false)

  // Mapas e modal de completude da Ficha Mestre
  const [completenessByLine, setCompletenessByLine] = useState<
    Record<string, MasterSheetCompletenessResult>
  >({})
  const [activeCompletenessResult, setActiveCompletenessResult] =
    useState<MasterSheetCompletenessResult | null>(null)
  const [pendingNavigationTarget, setPendingNavigationTarget] =
    useState<MasterSheetNavigationTarget | null>(null)
  const [isCompletenessModalOpen, setIsCompletenessModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [linesData, usersData, famsData, sapData] = await Promise.all([
        lineMasterService.listLines(),
        authService.listUsers(),
        lineMasterService.listProductFamilies(),
        sapIntegrationService.listCatalog(),
      ])

      setLines(linesData)
      setUsers(usersData)
      setProductFamilies(famsData)
      setSapCatalog(sapData)

      // FIX 2: Limitar paralelismo das completudes para evitar rajada de 200+ queries filhas.
      // Prioriza a linha selecionada na URL / estado inicial e calcula as demais em lotes controlados
      const initialTargetId = selectedLineId || (linesData.length > 0 ? linesData[0].id : null)
      const map: Record<string, MasterSheetCompletenessResult> = {}

      if (initialTargetId) {
        try {
          const initialComp = await lineMasterService.getMasterSheetCompleteness(initialTargetId, {
            forceRefresh: false,
          })
          map[initialTargetId] = initialComp
          setCompletenessByLine({ ...map })
        } catch {
          // segue em frente
        }
      }

      // Executa as demais completudes em background em pequenos lotes (concorrência = 2)
      const remainingLines = linesData.filter((l) => l.id !== initialTargetId)
      const batchSize = 2
      ;(async () => {
        for (let i = 0; i < remainingLines.length; i += batchSize) {
          const slice = remainingLines.slice(i, i + batchSize)
          const results = await Promise.all(
            slice.map(async (l) => {
              try {
                const comp = await lineMasterService.getMasterSheetCompleteness(l.id, {
                  forceRefresh: false,
                })
                return [l.id, comp] as const
              } catch {
                return null
              }
            }),
          )
          results.forEach((entry) => {
            if (entry) map[entry[0]] = entry[1]
          })
          setCompletenessByLine({ ...map })
        }
      })()

      // Se houver uma linha já selecionada, recarrega o overview dela aproveitando a linha em memória
      if (selectedLineId) {
        const found = linesData.find((l) => l.id === selectedLineId)
        await loadLineOverview(selectedLineId, found)
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar Centros e Ficha Mestra',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLineOverview = useCallback(
    async (lineId: string, lineOverride?: ProductionLine) => {
      if (!lineId || isLoadingOverviewRef.current) {
        return
      }
      isLoadingOverviewRef.current = true
      lastLoadedLineIdRef.current = lineId
      setLoadingOverview(true)
      try {
        const data = await lineMasterService.getLineOverview(lineId, lineOverride)
        setSelectedLineOverview(data)
        setSelectedLineId(lineId)

        // Atualiza completude detalhada da linha selecionada
        const comp = await lineMasterService.getMasterSheetCompleteness(lineId, {
          forceRefresh: true,
        })
        setCompletenessByLine((prev) => ({ ...prev, [lineId]: comp }))

        // Só atualiza searchParams se a URL ainda não contém este lineId, evitando re-renders em loop
        setSearchParams(
          (prev) => {
            const currentLineId = prev.get('lineId') || prev.get('id')
            if (currentLineId === lineId) {
              return prev
            }
            const next = new URLSearchParams(prev)
            next.set('lineId', lineId)
            return next
          },
          { replace: true },
        )
      } catch (err: any) {
        const status = err?.status || err?.response?.status
        const msg = err?.data?.message || err?.message || ''
        let userFriendlyMsg = 'Não foi possível carregar os dados neste momento.'
        if (
          status === 404 ||
          msg.toLowerCase().includes('not found') ||
          msg.toLowerCase().includes('não encontrad')
        ) {
          userFriendlyMsg = 'Linha não encontrada.'
        } else if (
          status === 403 ||
          msg.toLowerCase().includes('forbidden') ||
          msg.toLowerCase().includes('permissão')
        ) {
          userFriendlyMsg = 'Você não possui permissão para editar esta Ficha Mestre.'
        }

        toast({
          variant: 'destructive',
          title: 'Ficha Mestra',
          description: userFriendlyMsg,
        })
      } finally {
        isLoadingOverviewRef.current = false
        setLoadingOverview(false)
      }
    },
    [setSearchParams, toast],
  )

  useEffect(() => {
    loadData()
  }, [])

  // Se houver lineId na URL ao montar ou alterar, carregar o overview correspondente
  // FIX 1: lastLoadedLineIdRef previne loop com setSearchParams e remove selectedLineOverview das dependências
  useEffect(() => {
    const qLineId = searchParams.get('lineId') || searchParams.get('id')
    if (qLineId && qLineId !== lastLoadedLineIdRef.current && !isLoadingOverviewRef.current) {
      loadLineOverview(qLineId)
    }
  }, [searchParams, loadLineOverview])

  const filteredLines = lines.filter((line) => {
    const matchesSearch =
      line.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      line.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (line.process && line.process.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'ALL' || line.status === statusFilter
    const matchesPlant = plantFilter === 'ALL' || line.plant === plantFilter
    const isLineActive = line.is_active === true // estrito booleano
    const matchesCadastral =
      activeCadastralFilter === 'ALL' ||
      (activeCadastralFilter === 'ACTIVE' && isLineActive) ||
      (activeCadastralFilter === 'INACTIVE' && !isLineActive)

    // Filtros granulares adicionais solicitados: Empresa, Linha, Processo, Tipo de Programação
    const matchesCompany =
      companyFilter === 'ALL' ||
      (companyFilter === 'CIAFAL' &&
        (!line.plant ||
          line.plant.includes('CIAFAL') ||
          line.code.includes('L1') ||
          line.code.includes('L2'))) ||
      (companyFilter === 'KS' && (line.code.includes('KS') || line.name.includes('KS')))

    const matchesLine =
      lineFilter === 'ALL' ||
      (lineFilter === 'L1' &&
        (line.code === 'L1' || line.code.startsWith('ENF_L1') || line.name.includes('L1'))) ||
      (lineFilter === 'L2' &&
        (line.code === 'L2' ||
          line.code === 'ACAB_L2' ||
          line.code === 'ENDIR' ||
          line.name.includes('L2'))) ||
      (lineFilter === 'KS' && (line.code.includes('KS') || line.name.includes('KS')))

    const matchesProcess =
      processFilter === 'ALL' ||
      (line.process && line.process.toLowerCase().includes(processFilter.toLowerCase())) ||
      (line.programming_type &&
        line.programming_type.toLowerCase().includes(processFilter.toLowerCase()))

    const matchesProgType =
      programmingTypeFilter === 'ALL' || line.programming_type === programmingTypeFilter

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPlant &&
      matchesCadastral &&
      matchesCompany &&
      matchesLine &&
      matchesProcess &&
      matchesProgType
    )
  })

  // Tratamento de rolagem suave e destaque visual quando navegar para seção
  const scrollToAndHighlight = useCallback((target: MasterSheetNavigationTarget) => {
    // Aguarda montagem da visualização de detalhe para rolar e destacar
    setTimeout(() => {
      const mainGrp = typeof target === 'string' ? undefined : target.mainGroup
      const subTab = typeof target === 'string' ? undefined : target.masterSubTab
      const anchor = typeof target === 'string' ? target : target.anchorId

      let element: HTMLElement | null = null

      if (anchor) {
        element = document.getElementById(anchor)
      }

      if (!element) {
        // Mapeamento semântico por sub-aba ou grupo principal
        if (subTab === 'SETUP_MATRIX') {
          element =
            document.getElementById('section-setup-matrix') ||
            document.getElementById('target-add-setup-transition-btn')
        } else if (subTab === 'RAW_MATERIALS') {
          element =
            document.getElementById('section-raw-materials') ||
            document.getElementById('target-add-raw-material-btn')
        } else if (
          subTab === 'IDEAL_GAUGE_SEQUENCE' ||
          anchor === 'sequencing-process' ||
          mainGrp === 'PROCESS'
        ) {
          element =
            document.getElementById('section-ideal-gauge-sequence') ||
            document.getElementById('section-sequencing-process') ||
            document.getElementById('target-sequencing-btn') ||
            document.getElementById('target-sequencing-empty-card')
        } else if (mainGrp === 'OVERVIEW' || anchor === 'sap-center') {
          element =
            document.getElementById('section-sap-mapping') ||
            document.getElementById('target-sap-plant') ||
            document.getElementById('target-sap-work-center')
        }
      }

      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.classList.remove(
          'ring-4',
          'ring-[#004C97]',
          'ring-offset-2',
          'ring-offset-white',
          'transition-all',
          'duration-1000',
        )
        void element.offsetWidth // trigger reflow
        element.classList.add(
          'ring-4',
          'ring-[#004C97]',
          'ring-offset-2',
          'ring-offset-white',
          'transition-all',
          'duration-1000',
        )
        setTimeout(() => {
          element?.classList.remove(
            'ring-4',
            'ring-[#004C97]',
            'ring-offset-2',
            'ring-offset-white',
          )
        }, 3000)
      }
    }, 250)
  }, [])

  return (
    <div className="space-y-6">
      {/* 1. Header da Página em Fundo Claro Corporativo CIAFAL */}
      <CiafalPageHeader
        moduleName="PCP Robotizado"
        screenTitle="Centros e Ficha Mestra"
        subtitle="Centros de produção, parâmetros operacionais, turnos, responsáveis e Ficha Mestra industrial."
        compactInfo={`${lines.length} centros | Homologado CIAFAL`}
        infoTooltip="Centros de produção, parâmetros operacionais, capacidade, turnos, responsáveis e Ficha Mestra industrial."
        breadcrumbs={[{ label: 'Cadastros' }, { label: 'Ficha Mestra' }]}
        badge="CIAFAL • Homologado"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSapCatalogModalOpen(true)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold h-8 gap-1.5 shrink-0"
            >
              <Database className="w-3.5 h-3.5 text-[#004C97]" />
              <span>Catálogo SAP ({sapCatalog.length})</span>
            </Button>

            <Can permission="pcp.masterdata.edit">
              <Button
                size="sm"
                onClick={() => setIsAddLineModalOpen(true)}
                className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-bold gap-1.5 h-8 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Adicionar Centro</span>
              </Button>
            </Can>
          </>
        }
      />

      {/* 2. Se houver linha selecionada: Modo Detalhe 360 / Senão: Grid Principal de Linhas */}
      {selectedLineOverview && selectedLineId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedLineId(null)
                setSelectedLineOverview(null)
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev)
                    next.delete('lineId')
                    next.delete('id')
                    return next
                  },
                  { replace: true },
                )
              }}
              className="text-[#004C97] hover:bg-blue-50 text-xs font-semibold h-7"
            >
              &larr; Voltar para Todas as Linhas Cadastradas
            </Button>
            <span className="text-xs text-slate-600 font-mono">
              Visualizando Linha:{' '}
              <strong className="text-slate-900 font-bold">{selectedLineOverview.line.code}</strong>
            </span>
          </div>

          <LineMasterDetailView
            overview={selectedLineOverview}
            users={users}
            productFamilies={productFamilies}
            allLines={lines}
            sapCatalog={sapCatalog}
            initialNavigationTarget={pendingNavigationTarget}
            onClearNavigationTarget={() => setPendingNavigationTarget(null)}
            onOpenEditLine={(targetLine) => {
              setLineEditTarget(targetLine)
              setIsEditLineModalOpen(true)
            }}
            onRefresh={() => loadLineOverview(selectedLineId)}
            onOpenSapCatalog={() => setIsSapCatalogModalOpen(true)}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Barra de Filtros & Métricas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm items-center">
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Filtrar por código, nome do centro ou processo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-300 text-xs text-slate-900 h-8 placeholder:text-slate-400"
              />
            </div>

            {/* Filtro Cadastral: Ativos / Inativos / Todos (Padrão: Ativos) */}
            <div className="flex rounded-md border border-slate-300 p-0.5 bg-slate-50 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveCadastralFilter('ACTIVE')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  activeCadastralFilter === 'ACTIVE'
                    ? 'bg-[#004C97] text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ● Ativos
              </button>
              <button
                type="button"
                onClick={() => setActiveCadastralFilter('INACTIVE')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  activeCadastralFilter === 'INACTIVE'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ○ Inativos
              </button>
              <button
                type="button"
                onClick={() => setActiveCadastralFilter('ALL')}
                className={`flex-1 py-1 px-2 rounded text-center transition-all ${
                  activeCadastralFilter === 'ALL'
                    ? 'bg-slate-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2 h-8 font-medium focus:outline-none focus:ring-1 focus:ring-[#004C97]"
            >
              <option value="ALL">Status Operacional: Todos</option>
              <option value="running">running (Em Produção)</option>
              <option value="idle">idle (Disponível)</option>
              <option value="stopped">stopped (Parada)</option>
              <option value="maintenance">maintenance (Manutenção)</option>
              <option value="ACTIVE">ACTIVE (Ativa)</option>
            </select>

            <div className="flex items-center justify-end text-xs text-slate-500 font-mono">
              <strong className="text-[#004C97]">Exibindo: {filteredLines.length} Centros</strong>
            </div>
          </div>

          {/* Segunda linha de filtros: Empresa, Linha, Processo, Tipo de Programação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Empresa</label>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 h-7 text-xs font-medium text-slate-800"
              >
                <option value="ALL">Todas as Empresas</option>
                <option value="CIAFAL">CIAFAL Wilson Santos</option>
                <option value="KS">KS - Ferradura / Ciafal</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Linha</label>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 h-7 text-xs font-medium text-slate-800"
              >
                <option value="ALL">Todas as Linhas</option>
                <option value="L1">Linha L1</option>
                <option value="L2">Linha L2</option>
                <option value="KS">Linhas KS</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">Processo</label>
              <select
                value={processFilter}
                onChange={(e) => setProcessFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 h-7 text-xs font-medium text-slate-800"
              >
                <option value="ALL">Todos os Processos</option>
                <option value="Laminação">Laminação</option>
                <option value="Enfornamento">Enfornamento</option>
                <option value="Conformação">Conformação</option>
                <option value="Acabamento">Acabamento</option>
                <option value="Endireitadeira">Endireitadeira</option>
                <option value="Preparação">Preparação</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase">
                Tipo de Programação
              </label>
              <select
                value={programmingTypeFilter}
                onChange={(e) => setProgrammingTypeFilter(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2 h-7 text-xs font-medium text-slate-800"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="Laminação">Laminação</option>
                <option value="Enfornamento">Enfornamento</option>
                <option value="Acabamento">Acabamento</option>
                <option value="Preparação">Preparação</option>
                <option value="Múltiplo">Múltiplo</option>
                <option value="Endireitadeira">Endireitadeira</option>
                <option value="Envio">Envio</option>
                <option value="Inspeção">Inspeção</option>
              </select>
            </div>
          </div>

          {/* Cards das Linhas Cadastradas (Regra 3 & Exibição Compacta de Status, Tipo de Programação, Turnos e Turmas) */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-[#004C97]" />
              <span>Carregando centros de produção...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                Nenhum centro de produção cadastrado.
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Clique no botão "+ Adicionar Centro" para iniciar o cadastro do primeiro centro
                industrial.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsAddLineModalOpen(true)}
                  className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
                >
                  + Adicionar Centro
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredLines.map((l) => {
                const isSelected = selectedLineId === l.id

                return (
                  <Card
                    key={l.id}
                    onClick={() => loadLineOverview(l.id, l)}
                    className="min-w-0 bg-white border border-slate-200 hover:border-[#004C97] text-slate-900 transition-all cursor-pointer shadow-xs hover:shadow-md group relative rounded-lg flex flex-col justify-between overflow-hidden"
                  >
                    {/* Barra superior institucional CIAFAL */}
                    <div className="h-1 bg-[#004C97] w-full shrink-0" />

                    <div className="p-4 pb-2 shrink-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-extrabold text-lg text-slate-900 group-hover:text-[#004C97] transition-colors truncate">
                              {l.code}
                            </span>
                            {l.is_derived && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-blue-50 text-[#004C97] border-blue-300 font-semibold px-1.5 py-0 shrink-0"
                                title="Centro com derivação de programação ativa"
                              >
                                Derivado
                              </Badge>
                            )}
                            {l.is_active === false ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-slate-100 text-slate-600 border-slate-300 font-semibold px-1.5 py-0 shrink-0"
                              >
                                Inativo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold px-1.5 py-0 shrink-0"
                              >
                                Ativo
                              </Badge>
                            )}
                          </div>
                          <span
                            className="text-xs text-slate-500 block truncate mt-0.5"
                            title={l.name}
                          >
                            {l.name}
                          </span>
                        </div>
                        <Badge
                          className={`text-[10px] font-semibold px-2 py-0.5 shrink-0 ${
                            (l.status as string) === 'running' || l.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : (l.status as string) === 'maintenance' || l.status === 'MAINTENANCE'
                                ? 'bg-rose-50 text-rose-800 border border-rose-300'
                                : (l.status as string) === 'idle' || l.status === 'CONFIGURING'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {(l.status as string) === 'running' || l.status === 'ACTIVE'
                            ? 'Em produção'
                            : (l.status as string) === 'maintenance' || l.status === 'MAINTENANCE'
                              ? 'Manutenção'
                              : (l.status as string) === 'idle' || l.status === 'CONFIGURING'
                                ? 'Disponível'
                                : (l.status as string) === 'stopped' || l.status === 'INACTIVE'
                                  ? 'Parada'
                                  : l.status || 'Disponível'}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4 pt-0 space-y-2.5 text-xs flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        {/* Resumo Operacional: Tipo, Turnos & Turmas */}
                        <div className="bg-[#F8FAFC] border border-slate-200 rounded-md p-2 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between min-w-0 gap-2">
                            <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
                              <Sliders className="w-3 h-3 text-[#004C97]" /> Tipo:
                            </span>
                            <span className="font-semibold text-[#004C97] bg-white px-1.5 py-0.5 rounded border border-slate-200 truncate">
                              {l.programming_type || 'Laminação'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between min-w-0 gap-2 pt-0.5 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
                              <Clock className="w-3 h-3 text-slate-500" /> Turnos:
                            </span>
                            <span className="font-mono font-medium text-slate-800 truncate">
                              {l.shifts_summary && l.shifts_summary.length > 0
                                ? l.shifts_summary.join(' • ')
                                : 'T1 • T2 • T3'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between min-w-0 gap-2 pt-0.5 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium flex items-center gap-1 shrink-0">
                              <Users className="w-3 h-3 text-slate-500" /> Turmas:
                            </span>
                            <span className="font-mono font-medium text-slate-800 truncate">
                              {l.crews_summary && l.crews_summary.length > 0
                                ? l.crews_summary.join(' • ')
                                : 'A • B • C'}
                            </span>
                          </div>
                        </div>

                        {/* Dados SAP & Produtividade */}
                        <div className="grid grid-cols-2 gap-2 p-2 bg-[#F8FAFC] rounded-md border border-slate-200 text-[11px]">
                          <div className="min-w-0">
                            <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                              Processo
                            </span>
                            <span
                              className="text-slate-800 font-medium truncate block"
                              title={l.process || 'Conformação'}
                            >
                              {l.process || 'Conformação'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                              Centro SAP
                            </span>
                            <span className="text-[#004C97] font-mono font-bold truncate block">
                              {l.sap_plant_code || '1000'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                              Capacidade Nominal
                            </span>
                            <span className="text-slate-800 font-mono font-semibold">
                              {l.current_rate || 12} t/h
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-500 block text-[10px] font-semibold uppercase">
                              Eficiência OEE
                            </span>
                            <span className="text-emerald-700 font-mono font-bold">
                              <OeeInteractiveValue
                                value={l.efficiency || 90}
                                target={85}
                                unit="%"
                                drilldownContext={{
                                  lineCode: l.code || `L${l.id}`,
                                  equipmentCode: `${l.code || `L${l.id}`}_LAM`,
                                }}
                              />
                            </span>
                          </div>
                        </div>

                        {/* Indicador de Preenchimento da Ficha Mestre */}
                        {(() => {
                          const comp = completenessByLine[l.id]
                          const pct = comp ? comp.percentage : 0
                          const statusLabel = comp ? comp.status : 'Calculando...'
                          const badgeColor =
                            pct >= 100
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : pct >= 80
                                ? 'bg-blue-50 text-[#004C97] border-blue-300'
                                : pct >= 50
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border-rose-300'

                          return (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                if (comp) {
                                  setActiveCompletenessResult(comp)
                                  setIsCompletenessModalOpen(true)
                                } else {
                                  loadLineOverview(l.id, l)
                                }
                              }}
                              className="p-2 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-[#004C97] rounded-md transition-all flex items-center justify-between gap-2 min-w-0"
                              title="Clique para abrir a Ficha Mestre"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide block truncate">
                                  Ficha Mestre
                                </span>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-xs text-slate-800">
                                    {pct}%
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] font-medium px-1 py-0 ${badgeColor} truncate`}
                                  >
                                    {statusLabel}
                                  </Badge>
                                </div>
                              </div>
                              <span className="text-[11px] text-[#004C97] font-semibold flex items-center gap-0.5 shrink-0 hover:underline">
                                Detalhes &rarr;
                              </span>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Footer do Card */}
                      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[11px] shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setLineEditTarget(l)
                            setIsEditLineModalOpen(true)
                          }}
                          className="h-7 px-2 text-[11px] text-slate-700 hover:text-[#004C97] hover:bg-blue-50 font-medium"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1 text-[#004C97]" /> Editar Centro
                        </Button>
                        <span className="text-[#004C97] font-medium group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                          Abrir Gestão <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL WIZARD: Adicionar Nova Linha (7 Etapas Estruturadas - Regra 4) */}
      <AddLineWizardModal
        open={isAddLineModalOpen}
        onClose={() => setIsAddLineModalOpen(false)}
        onSuccess={(newLine) => {
          loadData()
          loadLineOverview(newLine.id)
        }}
        users={users}
        existingLines={lines}
        productFamilies={productFamilies}
      />

      {/* MODAL CATÁLOGO SAP: Governança Centralizada de BAPIs/Funções Z (Regras 27, 28, 31, 32) */}
      <SapIntegrationCatalogModal
        open={isSapCatalogModalOpen}
        onClose={() => setIsSapCatalogModalOpen(false)}
        catalog={sapCatalog}
        onRefresh={loadData}
      />

      {/* MODAL EDITAR LINHA */}
      <EditLineModal
        open={isEditLineModalOpen}
        onClose={() => {
          setIsEditLineModalOpen(false)
          setLineEditTarget(null)
        }}
        line={lineEditTarget}
        existingLines={lines}
        users={users}
        onSuccess={async (updatedLine) => {
          // Refetch duplo: recarrega a listagem geral e a linha no detalhe se estiver aberta
          await loadData()
          if (
            selectedLineId &&
            (selectedLineId === updatedLine.id || selectedLineOverview?.line?.id === updatedLine.id)
          ) {
            await loadLineOverview(updatedLine.id)
          }
          if (updatedLine) {
            setLineEditTarget(updatedLine)
          }
        }}
      />

      {/* MODAL DE COMPLETUDE DA FICHA MESTRE */}
      <MasterSheetCompletenessModal
        open={isCompletenessModalOpen}
        onClose={() => setIsCompletenessModalOpen(false)}
        completeness={activeCompletenessResult}
        onNavigateToBlock={(target) => {
          setIsCompletenessModalOpen(false)
          setPendingNavigationTarget(target)
          if (activeCompletenessResult?.lineId) {
            loadLineOverview(activeCompletenessResult.lineId).then(() => {
              scrollToAndHighlight(target)
            })
          } else {
            scrollToAndHighlight(target)
          }
        }}
      />
    </div>
  )
}
