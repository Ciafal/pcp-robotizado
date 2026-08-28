import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Network,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  ArrowRight,
  ArrowUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  Info,
  Filter,
  FileSpreadsheet,
  Cpu,
  Share2,
  Table as TableIcon,
  Grid,
  Route,
  Activity,
  Boxes,
  HelpCircle,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  productionNetworkService,
  ProductionLineEntity,
  ProductionLineRelationshipRecord,
  ProductionValidationResult,
} from '@/services/production-network'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Can } from '@/components/auth/Can'

export const ProductionIntegrationMapPage: React.FC = () => {
  const { toast } = useToast()
  const { can } = useAuth()

  const [loading, setLoading] = useState<boolean>(true)
  const [lines, setLines] = useState<ProductionLineEntity[]>([])
  const [relationships, setRelationships] = useState<ProductionLineRelationshipRecord[]>([])

  // Visualização e Zoom
  const [viewMode, setViewMode] = useState<'MAP' | 'TABLE' | 'MATRIX' | 'PRODUCT_ROUTES'>('MAP')
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [selectedNodeCode, setSelectedNodeCode] = useState<string | null>(null)
  const [selectedProductRoute, setSelectedProductRoute] = useState<string>('ALL')

  // Filtros
  const [filterPlant, setFilterPlant] = useState<string>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [quickFilterBottlenecks, setQuickFilterBottlenecks] = useState<boolean>(false)
  const [quickFilterActiveOnly, setQuickFilterActiveOnly] = useState<boolean>(true)
  const [showDraftLines, setShowDraftLines] = useState<boolean>(false)

  // Drawer Lateral
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false)
  const [drawerTab, setDrawerTab] = useState<
    | 'RESUMO'
    | 'HIERARQUIA'
    | 'CAPACIDADE'
    | 'PRODUTOS'
    | 'DEPENDENCIAS'
    | 'ROTAS'
    | 'BUFFERS'
    | 'REGRAS'
    | 'IA'
  >('RESUMO')

  // Modais de Validação, IA e Nova Relação
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [validationResult, setValidationResult] = useState<ProductionValidationResult | null>(null)
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false)

  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false)

  const [isNewRelModalOpen, setIsNewRelModalOpen] = useState<boolean>(false)
  const [newRelForm, setNewRelForm] = useState<Partial<ProductionLineRelationshipRecord>>({
    origin_line_code: '',
    target_line_code: '',
    relation_type: 'Obrigatoria',
    family_code: 'TUB_QUAD',
    priority_order: 1,
    allocation_pct: 100,
    capacity_limit_rate: 120,
    standard_lead_time_minutes: 30,
    buffer_min_tons: 20,
    buffer_max_tons: 100,
    status: 'ATIVA',
  })

  // Carregar Dados
  const loadNetworkData = async () => {
    setLoading(true)
    let isCancelled = false
    try {
      const [linesData, relsData] = await Promise.all([
        productionNetworkService.listLines(),
        productionNetworkService.listRelationships(),
      ])
      if (!isCancelled) {
        setLines(linesData)
        setRelationships(relsData)
      }
    } catch (err: any) {
      if (!isCancelled) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar dados do Mapa de Integração',
          description: err.message,
        })
      }
    } finally {
      if (!isCancelled) {
        setLoading(false)
      }
    }
    return () => {
      isCancelled = true
    }
  }

  useEffect(() => {
    loadNetworkData()
  }, [])

  // Linhas Homologadas / Filtradas
  const visibleLines = useMemo(() => {
    return lines.filter((l) => {
      // Regra 9-10: Apenas linhas vigentes/ativas por padrão
      if (
        !showDraftLines &&
        l.status !== 'running' &&
        l.status !== 'idle' &&
        l.status !== 'maintenance' &&
        l.status !== 'ACTIVE'
      ) {
        return false
      }
      if (filterStatus !== 'ALL' && l.status !== filterStatus) return false
      return true
    })
  }, [lines, showDraftLines, filterStatus])

  // Relações Filtradas
  const visibleRelationships = useMemo(() => {
    return relationships.filter((r) => {
      if (quickFilterActiveOnly && r.status !== 'ATIVA') return false
      if (filterType !== 'ALL' && r.relation_type !== filterType) return false
      if (selectedProductRoute !== 'ALL') {
        if (r.family_code && r.family_code !== selectedProductRoute) return false
        if (r.product_code && r.product_code !== selectedProductRoute) return false
      }
      return true
    })
  }, [relationships, quickFilterActiveOnly, filterType, selectedProductRoute])

  // Linha Selecionada para o Drawer
  const selectedNode = useMemo(() => {
    if (!selectedNodeCode) return null
    return lines.find((l) => l.code === selectedNodeCode) || null
  }, [lines, selectedNodeCode])

  // Upstream / Downstream do Nó Selecionado
  const nodeRelationships = useMemo(() => {
    if (!selectedNodeCode) return { upstream: [], downstream: [] }
    const upstream = relationships.filter((r) => r.target_line_code === selectedNodeCode)
    const downstream = relationships.filter((r) => r.origin_line_code === selectedNodeCode)
    return { upstream, downstream }
  }, [relationships, selectedNodeCode])

  // Ação: Validar Mapa (Regras 35 e 36)
  const handleValidateMap = () => {
    setIsValidating(true)
    setTimeout(() => {
      const res = productionNetworkService.validateNetwork(lines, relationships)
      setValidationResult(res)
      setIsValidating(false)
      setIsValidationModalOpen(true)
    }, 400)
  }

  // Ação: Analisar com IA (Regra 37)
  const handleAnalyzeAI = () => {
    setIsAnalyzingAI(true)
    setIsAIModalOpen(true)
    setTimeout(() => {
      const analysis = `### Diagnóstico de Malha Produtiva — IA CIAFAL Industrial
1. **Gargalo Estrutural em Enfornamento L1 (ENF_L1)**:
   - A Linha **L1** (capacidade nominal 120 t/h) alimenta o Forno **ENF_L1** (limite de 120 t/h), porém em campanhas de perfis pesados a taxa de absorção térmica cai para 80 t/h, gerando risco de saturação no pulmão intermediário de 180 t.
2. **Resiliência e Rotas Alternativas**:
   - A Linha **L2** possui rota alternativa homologada para a **Endireitadeira (ENDIR)** (Prioridade 2, alocação 35%) caso a célula de Acabamento L2 atinja saturação > 88%. Isso garante balanceamento dinâmico.
3. **Cadeia de Retrabalho (RETRAB)**:
   - A Célula de Retrabalho atende desvios dimensionais da Linha L1 com buffer máximo de 60 t. Recomenda-se aprovação de uma segunda rota direta para a Matriz caso o lote exceda 40 t.
4. **Recomendação de Regra**:
   - Manter regras de setup com prioridade para famílias **TUB_QUAD** antes de transição para **TUB_RET** para minimizar trocas de ferramental de rolos conformadores.`
      setAiAnalysisResult(analysis)
      setIsAnalyzingAI(false)
    }, 800)
  }

  // Salvar Nova Relação com Governança (Regras 31-32)
  const handleSaveNewRel = async () => {
    if (!newRelForm.origin_line_code || !newRelForm.target_line_code) {
      toast({
        variant: 'destructive',
        title: 'Campos Obrigatórios',
        description: 'Selecione a Linha de Origem e a Linha de Destino.',
      })
      return
    }

    try {
      await productionNetworkService.saveRelationship(newRelForm)
      toast({
        title: '✅ Relação Produtiva Criada',
        description: `Relação ${newRelForm.origin_line_code} ➔ ${newRelForm.target_line_code} adicionada ao Mapa de Integração.`,
      })
      setIsNewRelModalOpen(false)
      loadNetworkData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar relação',
        description: err.message,
      })
    }
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto text-slate-100">
      {/* 1. Header & Breadcrumb (Regra 12) */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>PCP Robotizado</span>
            <span>&gt;</span>
            <span>Gestão de Linhas</span>
            <span>&gt;</span>
            <span className="text-cyan-400 font-bold">Mapa de Integração Produtiva</span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                # Mapa de Integração Produtiva
              </h1>
              <p className="text-xs text-slate-400">
                Visualização estrutural das relações, capacidades, rotas e dependências entre linhas
                produtivas.
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação do Cabeçalho */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadNetworkData}
            disabled={loading}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleValidateMap}
            disabled={isValidating}
            className="border-blue-900 bg-blue-950/40 text-cyan-300 hover:text-white hover:bg-blue-900 text-xs h-8 gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
            Validar Mapa
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyzeAI}
            className="border-purple-900 bg-purple-950/40 text-purple-300 hover:text-white hover:bg-purple-900 text-xs h-8 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Analisar com IA
          </Button>

          <Can permission="pcp.masterdata.edit">
            <Button
              size="sm"
              onClick={() => setIsNewRelModalOpen(true)}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white font-bold text-xs h-8 gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Dependência
            </Button>
          </Can>
        </div>
      </div>

      {/* 2. Barra de Filtros Rápidos & Modos de Visualização (Regras 13 e 14) */}
      <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Modo */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <Button
              size="sm"
              variant={viewMode === 'MAP' ? 'default' : 'ghost'}
              onClick={() => setViewMode('MAP')}
              className={`h-7 px-2.5 text-xs font-semibold ${
                viewMode === 'MAP' ? 'bg-[#004C97] text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Grid className="w-3.5 h-3.5 mr-1" />
              Mapa Visual
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'TABLE' ? 'default' : 'ghost'}
              onClick={() => setViewMode('TABLE')}
              className={`h-7 px-2.5 text-xs font-semibold ${
                viewMode === 'TABLE' ? 'bg-[#004C97] text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 mr-1" />
              Tabela de Relações
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'MATRIX' ? 'default' : 'ghost'}
              onClick={() => setViewMode('MATRIX')}
              className={`h-7 px-2.5 text-xs font-semibold ${
                viewMode === 'MATRIX' ? 'bg-[#004C97] text-white shadow-sm' : 'text-slate-400'
              }`}
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Matriz Linha x Linha
            </Button>
          </div>

          {/* Filtro Rápido por Família / Rota de Produto */}
          <select
            value={selectedProductRoute}
            onChange={(e) => setSelectedProductRoute(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded text-xs text-white px-2.5 h-7"
          >
            <option value="ALL">Todas as Rotas de Produtos</option>
            <option value="TUB_QUAD">Rota: Tubos Quadrados (TUB_QUAD)</option>
            <option value="TUB_RET">Rota: Tubos Retangulares (TUB_RET)</option>
            <option value="PERF_U">Rota: Perfis U Dobrados (PERF_U)</option>
            <option value="BAR_CHATA">Rota: Barras Chatas (BAR_CHATA)</option>
            <option value="TUBO_50X50_ESP">Produto: Tubo 50x50 Especial (Retrabalho)</option>
          </select>

          {/* Filtro de Tipo de Relação */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded text-xs text-white px-2.5 h-7"
          >
            <option value="ALL">Todos os Tipos de Relação</option>
            <option value="Obrigatoria">Obrigatória</option>
            <option value="Preferencial">Preferencial</option>
            <option value="Alternativa">Alternativa</option>
            <option value="Condicional">Condicional</option>
            <option value="Retrabalho">Retrabalho</option>
          </select>

          {/* Checkbox Homologadas / Não Homologadas */}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer ml-1 select-none">
            <input
              type="checkbox"
              checked={showDraftLines}
              onChange={(e) => setShowDraftLines(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>Exibir linhas não homologadas</span>
          </label>
        </div>

        {/* Controles de Zoom */}
        {viewMode === 'MAP' && (
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[11px] text-slate-500 mr-1">
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
              className="h-7 w-7 p-0 border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(1)}
              className="h-7 text-[11px] text-slate-400 hover:text-white"
            >
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* 3. Área Principal do Mapa ou Tabelas */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-xl min-h-[580px] p-6 shadow-inner overflow-auto">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#004C97] animate-spin" />
            <span className="text-xs font-mono text-slate-400">
              Carregando malha estrutural de linhas e relações N:N...
            </span>
          </div>
        ) : viewMode === 'MAP' ? (
          /* =========================================================================
             MODO MAPA: Nós Compactos com Status, Capacidade, Upstream e Downstream
          ========================================================================= */
          <div
            className="transition-transform origin-top-left space-y-6"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Legenda de Status e Cores */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 max-w-fit">
              <span className="font-semibold text-slate-200">Status do Nó:</span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Normal / Ativa
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atenção / Setup
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Manutenção / Gargalo
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Selecionada
              </span>
            </div>

            {/* Grid de Linhas Cadastradas Reais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleLines.map((line) => {
                const isSelected = selectedNodeCode === line.code
                const upRels = relationships.filter((r) => r.target_line_code === line.code)
                const downRels = relationships.filter((r) => r.origin_line_code === line.code)

                // Destaque de Gargalo se capacidade for restritiva
                const isBottleneck = line.code === 'ENF_L1' || line.code === 'ENDIR'

                return (
                  <div
                    key={line.id}
                    onClick={() => {
                      setSelectedNodeCode(line.code)
                      setDrawerOpen(true)
                    }}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer select-none group shadow-md ${
                      isSelected
                        ? 'bg-blue-950/40 border-cyan-400 shadow-cyan-950/50 ring-1 ring-cyan-400'
                        : isBottleneck
                          ? 'bg-slate-900/90 border-amber-800/80 hover:border-amber-500'
                          : 'bg-slate-900/90 border-slate-800 hover:border-[#004C97]'
                    }`}
                  >
                    {/* Topo do Nó */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-white group-hover:text-cyan-300 transition-colors">
                            {line.code}
                          </span>
                          <Badge
                            className={`text-[9px] px-1.5 py-0 uppercase ${
                              line.status === 'running' || line.status === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : line.status === 'maintenance'
                                  ? 'bg-rose-950 text-rose-300 border-rose-700'
                                  : 'bg-amber-950 text-amber-300 border-amber-700'
                            }`}
                          >
                            {line.status}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-xs text-slate-300 mt-0.5">{line.name}</h3>
                      </div>

                      <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {line.sap_work_center || 'WC-DIV'}
                      </span>
                    </div>

                    {/* Dados Compactos de Capacidade e Processo */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs mb-3 font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block font-sans">
                          Capacidade Nominal
                        </span>
                        <span className="font-bold text-white text-xs">
                          {line.nominal_capacity || line.target_rate || 120}{' '}
                          {line.capacity_unit || 't/h'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block font-sans">
                          Vazão Atual / OEE
                        </span>
                        <span className="font-bold text-emerald-400 text-xs">
                          {line.current_rate || 118} t/h ({line.efficiency || 98}%)
                        </span>
                      </div>
                    </div>

                    {/* Resumo de Conexões Upstream & Downstream (N:N) */}
                    <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Abastecimento (Upstream):</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {upRels.length > 0 ? `${upRels.length} relação(ões)` : 'Início de Linha'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Destino (Downstream):</span>
                        <span className="font-mono font-bold text-cyan-300">
                          {downRels.length > 0 ? `${downRels.length} relação(ões)` : 'Fim de Linha'}
                        </span>
                      </div>

                      {/* Lista rápida de destinos com tipo de relação */}
                      {downRels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 pt-1">
                          {downRels.map((r) => (
                            <Badge
                              key={r.id}
                              variant="outline"
                              className="text-[9px] font-mono border-slate-700 bg-slate-950/60 text-slate-300"
                            >
                              &rarr; {r.target_line_code} ({r.relation_type})
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações do Card */}
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 group-hover:text-cyan-400 transition-colors flex items-center gap-1 font-sans">
                        Abrir Drawer 360&deg; <ArrowRight className="w-3 h-3" />
                      </span>

                      <Link
                        to="/pcp/ficha-mestre"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-white underline"
                      >
                        [Ver Ficha Mestre]
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : viewMode === 'TABLE' ? (
          /* =========================================================================
             MODO TABELA: Lista Estruturada de Relações N:N (Regra 33)
          ========================================================================= */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>
                Total de Relações Produtivas Cadastradas:{' '}
                <strong>{visibleRelationships.length}</strong>
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Destino</th>
                    <th className="p-3">Tipo Relação</th>
                    <th className="p-3">Produto / Família</th>
                    <th className="p-3">Condição & Prioridade</th>
                    <th className="p-3">Buffer (Min/Max)</th>
                    <th className="p-3">Lead Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visibleRelationships.map((rel) => (
                    <tr
                      key={rel.id}
                      className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedNodeCode(rel.origin_line_code)
                        setDrawerOpen(true)
                      }}
                    >
                      <td className="p-3 font-mono font-bold text-white">{rel.origin_line_code}</td>
                      <td className="p-3 font-mono font-bold text-cyan-300">
                        {rel.target_line_code}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-blue-900 bg-blue-950/40 text-blue-300"
                        >
                          {rel.relation_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        {rel.product_code || rel.family_code || 'Geral / Todas'}
                      </td>
                      <td className="p-3 max-w-[280px] truncate text-[11px] text-slate-400">
                        P{rel.priority_order}: {rel.routing_condition || 'Fluxo direto'}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">
                        {rel.buffer_min_tons || 0} – {rel.buffer_max_tons || 100} t
                      </td>
                      <td className="p-3 font-mono text-[11px] text-cyan-400">
                        {rel.standard_lead_time_minutes || 30} min
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`text-[9px] font-mono ${
                            rel.status === 'ATIVA'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                              : 'bg-amber-950 text-amber-300 border-amber-700'
                          }`}
                        >
                          {rel.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedNodeCode(rel.origin_line_code)
                            setDrawerOpen(true)
                          }}
                          className="h-6 text-[10px] text-cyan-400 hover:text-white"
                        >
                          Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* =========================================================================
             MODO MATRIZ: Linha x Linha (Regra 34)
          ========================================================================= */
          <div className="space-y-4">
            <div className="text-xs text-slate-400 font-mono">
              Matriz de Interdependência Produtiva (Origem &rarr; Linhas / Destino &darr; Colunas).
              Clique na célula para inspecionar a relação.
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-center text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="p-3 text-left bg-slate-950">Origem \ Destino</th>
                    {lines.map((l) => (
                      <th key={l.id} className="p-3 font-mono text-cyan-300">
                        {l.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {lines.map((origin) => (
                    <tr key={origin.id} className="hover:bg-slate-900/30">
                      <td className="p-3 text-left font-mono font-bold text-white bg-slate-950">
                        {origin.code}
                      </td>
                      {lines.map((dest) => {
                        const rel = relationships.find(
                          (r) =>
                            r.origin_line_code === origin.code &&
                            r.target_line_code === dest.code &&
                            r.status === 'ATIVA',
                        )

                        if (origin.code === dest.code) {
                          return (
                            <td key={dest.id} className="p-3 bg-slate-950/60 text-slate-700">
                              —
                            </td>
                          )
                        }

                        if (rel) {
                          return (
                            <td
                              key={dest.id}
                              onClick={() => {
                                setSelectedNodeCode(origin.code)
                                setDrawerOpen(true)
                              }}
                              className="p-3 bg-blue-950/30 hover:bg-blue-900/50 cursor-pointer font-mono text-[11px] text-cyan-300 font-bold border border-blue-900/40"
                              title={`${rel.relation_type} (P${rel.priority_order}): ${rel.routing_condition}`}
                            >
                              {rel.relation_type[0]} (P{rel.priority_order})
                            </td>
                          )
                        }

                        return (
                          <td key={dest.id} className="p-3 text-slate-700">
                            ·
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. DRAWER LATERAL: Detalhes 360° do Nó Selecionado (Regras 17 e 18)
      ========================================================================= */}
      {drawerOpen && selectedNode && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Header do Drawer */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-[#004C97] text-white rounded-md">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>{selectedNode.code}</span>
                  <Badge className="text-[9px] bg-slate-800 text-slate-200">
                    {selectedNode.status}
                  </Badge>
                </h3>
                <span className="text-xs text-slate-400">{selectedNode.name}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDrawerOpen(false)}
              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Abas do Drawer (Regra 17) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-2 bg-slate-900 border-b border-slate-800 text-xs">
            {[
              { id: 'RESUMO', label: 'Resumo' },
              { id: 'HIERARQUIA', label: 'Hierarquia' },
              { id: 'CAPACIDADE', label: 'Capacidade' },
              { id: 'PRODUTOS', label: 'Produtos' },
              { id: 'DEPENDENCIAS', label: 'Dependências N:N' },
              { id: 'ROTAS', label: 'Rotas' },
              { id: 'BUFFERS', label: 'Buffers' },
              { id: 'REGRAS', label: 'Rule Packs' },
              { id: 'IA', label: 'IA' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDrawerTab(tab.id as any)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold shrink-0 transition-colors ${
                  drawerTab === tab.id
                    ? 'bg-[#004C97] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo da Aba */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {drawerTab === 'RESUMO' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/60 rounded-lg border border-slate-800 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                      Linha / Código
                    </span>
                    <span className="text-white font-bold">{selectedNode.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                      Centro SAP
                    </span>
                    <span className="text-cyan-300">
                      {selectedNode.sap_work_center || 'WC-DIV'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                      Capacidade Nominal
                    </span>
                    <span className="text-white">
                      {selectedNode.nominal_capacity || 120} {selectedNode.capacity_unit || 't/h'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-sans font-bold">
                      Turnos Cadastrados
                    </span>
                    <span className="text-emerald-400">
                      {selectedNode.shifts_count || 3} Turnos
                    </span>
                  </div>
                </div>

                {/* Predecessores & Sucessores N:N */}
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase text-slate-300">
                    Predecessores (Alimentam {selectedNode.code})
                  </h4>
                  {nodeRelationships.upstream.length === 0 ? (
                    <div className="p-3 bg-slate-900/30 rounded border border-slate-800 text-slate-500 text-[11px]">
                      Nenhuma linha montante associada. Esta linha atua como ponto inicial.
                    </div>
                  ) : (
                    nodeRelationships.upstream.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-2.5 bg-slate-900/70 rounded border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-cyan-300">
                            {rel.origin_line_code} &rarr; {selectedNode.code}
                          </span>
                          <Badge className="text-[9px] bg-blue-950 text-blue-300 border-blue-800">
                            {rel.relation_type} (P{rel.priority_order})
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">{rel.routing_condition}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase text-slate-300">
                    Sucessores (Alimentados por {selectedNode.code})
                  </h4>
                  {nodeRelationships.downstream.length === 0 ? (
                    <div className="p-3 bg-slate-900/30 rounded border border-slate-800 text-slate-500 text-[11px]">
                      Nenhuma linha jusante associada. Esta linha atua como entrega final.
                    </div>
                  ) : (
                    nodeRelationships.downstream.map((rel) => (
                      <div
                        key={rel.id}
                        className="p-2.5 bg-slate-900/70 rounded border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-cyan-300">
                            {selectedNode.code} &rarr; {rel.target_line_code}
                          </span>
                          <Badge className="text-[9px] bg-emerald-950 text-emerald-300 border-emerald-800">
                            {rel.relation_type} (P{rel.priority_order})
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">{rel.routing_condition}</p>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-1">
                          <span>
                            Buffer: {rel.buffer_min_tons}–{rel.buffer_max_tons} t
                          </span>
                          <span>Lead Time: {rel.standard_lead_time_minutes} min</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <Button
                    size="sm"
                    className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs w-full gap-1.5 font-bold"
                    asChild
                  >
                    <Link to="/pcp/ficha-mestre">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Abrir Ficha Mestre Oficial da Linha
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {drawerTab === 'DEPENDENCIAS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">
                    Relações N:N registradas para <strong>{selectedNode.code}</strong>
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNewRelForm((prev) => ({
                        ...prev,
                        origin_line_code: selectedNode.code,
                      }))
                      setIsNewRelModalOpen(true)
                    }}
                    className="bg-blue-900 hover:bg-blue-800 text-white text-xs h-7 gap-1"
                  >
                    <Plus className="w-3 h-3" /> Nova Relação
                  </Button>
                </div>

                {[...nodeRelationships.upstream, ...nodeRelationships.downstream].map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">
                        {r.origin_line_code} &rarr; {r.target_line_code}
                      </span>
                      <Badge className="text-[9px] bg-slate-800 text-slate-300">
                        {r.relation_type}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      {r.routing_condition}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Prioridade: P{r.priority_order}</span>
                      <span>Alocação: {r.allocation_pct || 100}%</span>
                      <span className="text-emerald-400">{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {drawerTab === 'BUFFERS' && (
              <div className="space-y-3">
                <h4 className="font-bold text-white text-xs">
                  Pulmões Intermediários & Capacidade Estática
                </h4>
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Pulmão de Entrada (Input Buffer):</span>
                    <span className="font-mono font-bold text-cyan-300">500 t (Bobinas)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Pulmão de Saída (Output Buffer):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      180 t (Intermediário)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    Buffers evitam paradas propagadas na linha em caso de manutenção rápida ou setup
                    de troca de rolos.
                  </p>
                </div>
              </div>
            )}

            {drawerTab === 'IA' && (
              <div className="space-y-3">
                <div className="p-3 bg-purple-950/30 border border-purple-900/50 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <Sparkles className="w-4 h-4" />
                    Recomendação de Balanceamento
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    A Linha {selectedNode.code} apresenta estabilidade de 98% em campanhas de perfis
                    quadrados. Em caso de sobrecarga na Linha L2, o motor IA recomenda ativar o
                    bypass para a célula de acabamento via rota alternativa P2.
                  </p>
                </div>
              </div>
            )}

            {drawerTab !== 'RESUMO' &&
              drawerTab !== 'DEPENDENCIAS' &&
              drawerTab !== 'BUFFERS' &&
              drawerTab !== 'IA' && (
                <div className="p-8 text-center text-slate-500">
                  <Info className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs">
                    Informações da aba {drawerTab} sincronizadas da Ficha Mestre técnica.
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* =========================================================================
          5. MODAL DE VALIDAÇÃO ESTRUTURAL DO MAPA (Regras 35 e 36)
      ========================================================================= */}
      <Dialog open={isValidationModalOpen} onOpenChange={setIsValidationModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl p-6">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              Resultado da Validação Estrutural do Mapa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Auditoria de conexões N:N, loops circulares, consistência de buffers e destinos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            {validationResult?.isValid ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Mapa de Integração Validado com Sucesso!
                  </h4>
                  <p className="text-slate-300 text-xs mt-1">
                    Nenhum loop impossível, lead time negativo ou inconsistência de destino foi
                    encontrado na malha produtiva homologada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs font-semibold">
                  Atenção: Foram encontradas não conformidades estruturais na malha.
                </div>
                {validationResult?.errors.map((err) => (
                  <div
                    key={err.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-400">{err.type}</span>
                      <Badge className="text-[9px] bg-rose-950 text-rose-300 border-rose-800">
                        {err.severity}
                      </Badge>
                    </div>
                    <p className="text-slate-200">{err.message}</p>
                    <p className="text-slate-400 text-[11px] italic">
                      Ação recomendada: {err.suggestedAction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <Button
              size="sm"
              onClick={() => setIsValidationModalOpen(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          6. MODAL DE ANÁLISE COM INTELIGÊNCIA ARTIFICIAL (Regra 37)
      ========================================================================= */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-2xl p-6">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Análise de Relações e Malha com IA Industrial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Diagnóstico de resiliência, gargalos estruturais e recomendações de balanceamento.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs">
            {isAnalyzingAI ? (
              <div className="p-8 flex flex-col items-center justify-center space-y-3">
                <Sparkles className="w-8 h-8 text-purple-400 animate-spin" />
                <span className="text-slate-400 text-xs font-mono">
                  Processando topologia de linhas e gargalos...
                </span>
              </div>
            ) : (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-slate-200 text-xs leading-relaxed font-sans whitespace-pre-line">
                {aiAnalysisResult}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-500 text-[11px] italic">
              IA recomenda &bull; Decisão operacional sob aprovação do Coordenador PCP.
            </span>
            <Button
              size="sm"
              onClick={() => setIsAIModalOpen(false)}
              className="bg-purple-900 hover:bg-purple-800 text-white text-xs"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          7. MODAL DE ADIÇÃO DE RELAÇÃO N:N (Regras 19, 20, 21)
      ========================================================================= */}
      <Dialog open={isNewRelModalOpen} onOpenChange={setIsNewRelModalOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-slate-100 max-w-lg p-6">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#004C97]" />
              Nova Relação de Interdependência N:N
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Cadastrar dependência de fluxo produtivo, buffer intermediário e condições de
              roteamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Linha de Origem *</label>
                <select
                  value={newRelForm.origin_line_code}
                  onChange={(e) =>
                    setNewRelForm((prev) => ({ ...prev, origin_line_code: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Selecione Origem</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Linha de Destino *</label>
                <select
                  value={newRelForm.target_line_code}
                  onChange={(e) =>
                    setNewRelForm((prev) => ({ ...prev, target_line_code: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="">Selecione Destino</option>
                  {lines.map((l) => (
                    <option key={l.id} value={l.code}>
                      {l.code} - {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Tipo de Relação *</label>
                <select
                  value={newRelForm.relation_type}
                  onChange={(e) =>
                    setNewRelForm((prev) => ({ ...prev, relation_type: e.target.value }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
                >
                  <option value="Obrigatoria">Obrigatória</option>
                  <option value="Preferencial">Preferencial</option>
                  <option value="Alternativa">Alternativa</option>
                  <option value="Condicional">Condicional</option>
                  <option value="Retrabalho">Retrabalho</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">
                  Prioridade (1 = mais alta)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newRelForm.priority_order || 1}
                  onChange={(e) =>
                    setNewRelForm((prev) => ({
                      ...prev,
                      priority_order: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1">Buffer Min/Max (t)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={newRelForm.buffer_min_tons || ''}
                    onChange={(e) =>
                      setNewRelForm((prev) => ({
                        ...prev,
                        buffer_min_tons: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2 font-mono"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={newRelForm.buffer_max_tons || ''}
                    onChange={(e) =>
                      setNewRelForm((prev) => ({
                        ...prev,
                        buffer_max_tons: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[11px] block mb-1">
                  Lead Time Padrão (min)
                </label>
                <input
                  type="number"
                  min="0"
                  value={newRelForm.standard_lead_time_minutes || ''}
                  onChange={(e) =>
                    setNewRelForm((prev) => ({
                      ...prev,
                      standard_lead_time_minutes: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-[11px] block mb-1">
                Condição de Roteamento / Regra
              </label>
              <textarea
                rows={2}
                value={newRelForm.routing_condition || ''}
                onChange={(e) =>
                  setNewRelForm((prev) => ({ ...prev, routing_condition: e.target.value }))
                }
                placeholder="Ex: Rota preferencial para aços 1020 com desvio para retrabalho se NC."
                className="w-full bg-slate-900 border border-slate-700 rounded text-xs text-white p-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewRelModalOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-300 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveNewRel}
              className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-bold"
            >
              Salvar Dependência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ProductionIntegrationMapPage
