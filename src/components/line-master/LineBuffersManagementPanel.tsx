import React, { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Plus,
  Edit2,
  Power,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Layers,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LineBufferModal } from '@/components/line-master/LineBufferModal'
import {
  LineBufferRecord,
  BufferOperationalStatus,
  BufferRouteCoverageAnalysis,
} from '@/types/line-buffers'
import { LineBuffersService } from '@/services/line-buffers-service'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export const LineBuffersManagementPanel: React.FC = () => {
  const { toast } = useToast()

  // Estados principais
  const [buffers, setBuffers] = useState<LineBufferRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [bufferToEdit, setBufferToEdit] = useState<LineBufferRecord | null>(null)

  // Dados auxiliares de rotas para cobertura e fluxo
  const [routes, setRoutes] = useState<
    Array<{ id: string; code: string; description: string; nodes: any[]; edges: any[] }>
  >([])
  const [operationalStatuses, setOperationalStatuses] = useState<
    Record<string, BufferOperationalStatus>
  >({})

  // Filtros da tela
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL')
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('ALL')
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL')
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('ALL')
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL')
  const [selectedHealthFilter, setSelectedHealthFilter] = useState<string>('ALL')

  // Carregar dados de rotas e nós
  const loadRoutesAndEdges = async () => {
    try {
      const routeList = await pb
        .collection('production_routes')
        .getFullList({ sort: 'code' })
        .catch(() => [])
      const detailed = await Promise.all(
        routeList.map(async (r: any) => {
          const [nodes, edges] = await Promise.all([
            pb
              .collection('production_route_nodes')
              .getFullList({ filter: `route_id = '${r.id}'`, sort: 'logical_order' })
              .catch(() => []),
            pb
              .collection('production_route_edges')
              .getFullList({ filter: `route_id = '${r.id}'` })
              .catch(() => []),
          ])
          return {
            id: r.id,
            code: r.code,
            description: r.description || r.code,
            nodes,
            edges,
          }
        }),
      )
      setRoutes(detailed)
    } catch (e) {
      console.warn('Erro ao carregar rotas no painel de buffers:', e)
    }
  }

  // Carregar buffers do banco
  const loadBuffers = async () => {
    setLoading(true)
    try {
      const records = await LineBuffersService.listBuffers()
      setBuffers(records)

      // Calcular o status operacional determinístico de cada buffer
      const statusMap: Record<string, BufferOperationalStatus> = {}
      for (const b of records) {
        const routeObj = routes.find((r) => r.code === b.route_code)
        const currentStock = await LineBuffersService.getStockForBuffer(b, routeObj?.edges || [])
        const opStatus = LineBuffersService.evaluateOperationalStatus(b, currentStock)
        statusMap[b.id] = opStatus
      }
      setOperationalStatuses(statusMap)
    } catch (err) {
      console.error('Erro ao carregar buffers:', err)
      toast({
        title: 'Erro ao carregar buffers',
        description: 'Não foi possível buscar a lista de buffers parametrizados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoutesAndEdges()
  }, [])

  useEffect(() => {
    loadBuffers()
  }, [routes])

  // Alternar status Ativo / Inativo
  const handleToggleStatus = async (buffer: LineBufferRecord) => {
    const nextStatus = buffer.status === 'Ativo' ? 'Inativo' : 'Ativo'
    try {
      await LineBuffersService.toggleStatus(buffer.id, nextStatus)
      toast({
        title: 'Status Atualizado',
        description: `Buffer ${buffer.center_code} ➔ ${buffer.related_center_code} agora está ${nextStatus}.`,
      })
      await loadBuffers()
    } catch (err: any) {
      console.error('Erro ao alternar status do buffer:', err)
      toast({
        title: 'Erro ao alterar status',
        description: err.message || 'Falha ao comunicar com o banco de dados.',
        variant: 'destructive',
      })
    }
  }

  // Abertura do modal de criação
  const handleOpenCreate = () => {
    setBufferToEdit(null)
    setIsModalOpen(true)
  }

  // Abertura do modal de edição
  const handleOpenEdit = (buffer: LineBufferRecord) => {
    setBufferToEdit(buffer)
    setIsModalOpen(true)
  }

  // Filtros aplicados
  const filteredBuffers = useMemo(() => {
    return buffers.filter((b) => {
      if (selectedCompanyFilter !== 'ALL' && b.company_code !== selectedCompanyFilter) return false
      if (selectedLineFilter !== 'ALL' && b.line_code !== selectedLineFilter) return false
      if (selectedRouteFilter !== 'ALL' && b.route_code !== selectedRouteFilter) return false
      if (
        selectedCenterFilter !== 'ALL' &&
        b.center_code !== selectedCenterFilter &&
        b.related_center_code !== selectedCenterFilter
      ) {
        return false
      }
      if (selectedTypeFilter !== 'ALL' && b.buffer_type !== selectedTypeFilter) return false
      if (selectedStatusFilter !== 'ALL' && b.status !== selectedStatusFilter) return false

      const op = operationalStatuses[b.id]
      if (selectedHealthFilter !== 'ALL' && op?.health !== selectedHealthFilter) return false

      return true
    })
  }, [
    buffers,
    operationalStatuses,
    selectedCompanyFilter,
    selectedLineFilter,
    selectedRouteFilter,
    selectedCenterFilter,
    selectedTypeFilter,
    selectedStatusFilter,
    selectedHealthFilter,
  ])

  // Indicadores Numéricos Consolidados (Item 7)
  const indicators = useMemo(() => {
    const activeList = buffers.filter((b) => b.status === 'Ativo')
    let belowMin = 0
    let aboveMax = 0
    let attention = 0
    let balanced = 0

    activeList.forEach((b) => {
      const op = operationalStatuses[b.id]
      if (!op) return
      if (op.health === 'BELOW_MIN') belowMin++
      else if (op.health === 'ABOVE_MAX') aboveMax++
      else if (op.health === 'NEAR_MIN' || op.health === 'NEAR_MAX') attention++
      else if (op.health === 'BALANCED') balanced++
    })

    // Análise de rotas e centros sem parametrização
    const coverageMap: Record<string, BufferRouteCoverageAnalysis> = {}
    let totalPendingCoverage = 0

    routes.forEach((r) => {
      const analysis = LineBuffersService.analyzeRouteCoverage(
        r.code,
        r.nodes || [],
        buffers,
        r.edges || [],
      )
      coverageMap[r.code] = analysis
      if (!analysis.is_complete) {
        totalPendingCoverage += analysis.missing_relations.length
      }
    })

    return {
      totalActive: activeList.length,
      belowMin,
      aboveMax,
      attention,
      balanced,
      totalPendingCoverage,
      coverageMap,
    }
  }, [buffers, operationalStatuses, routes])

  // Lista única de opções para os filtros
  const uniqueCompanies = Array.from(new Set(buffers.map((b) => b.company_code))).filter(Boolean)
  const uniqueLines = Array.from(new Set(buffers.map((b) => b.line_code))).filter(Boolean)
  const uniqueRoutes = Array.from(new Set(buffers.map((b) => b.route_code))).filter(Boolean)
  const uniqueCenters = Array.from(
    new Set([...buffers.map((b) => b.center_code), ...buffers.map((b) => b.related_center_code)]),
  ).filter(Boolean)

  // Rota ativa para visualização do fluxo gráfico
  const activeFlowRouteCode =
    selectedRouteFilter !== 'ALL' ? selectedRouteFilter : uniqueRoutes[0] || 'ROUT_PERF_U_V2'
  const activeFlowRoute = routes.find((r) => r.code === activeFlowRouteCode)

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 border border-slate-200 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg shadow-sm">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Buffers & Pulmões Operacionais
                <Badge className="bg-blue-100 text-[#004C97] border-blue-200 text-[11px] font-mono">
                  Sequenciamento N:N
                </Badge>
              </h2>
              <p className="text-xs text-slate-500">
                Parametrização determinística de capacidades, alertas operacionais e cálculo de
                fluxo por Rota + Centro + Centro Relacionado.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadBuffers}
            disabled={loading}
            className="text-xs h-9 text-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="bg-[#004C97] hover:bg-[#003d7a] text-white text-xs font-semibold h-9 shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />+ Cadastrar Buffer / Pulmão
          </Button>
        </div>
      </div>

      {/* CARDS DE INDICADORES (Item 7) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Buffers Ativos */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase font-mono">Buffers Ativos</span>
            <Box className="w-4 h-4 text-[#004C97]" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{indicators.totalActive}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">Cadastrados no banco</p>
        </div>

        {/* Abaixo do Mínimo */}
        <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-medium uppercase font-mono">Abaixo do Mínimo</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600">{indicators.belowMin}</div>
          <p className="text-[10px] text-rose-700 mt-0.5">Risco de esvaziamento</p>
        </div>

        {/* Em Atenção */}
        <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-800 mb-1">
            <span className="text-[11px] font-medium uppercase font-mono">Em Atenção</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-700">{indicators.attention}</div>
          <p className="text-[10px] text-amber-800 mt-0.5">Próximo do mín ou máx</p>
        </div>

        {/* Balanceados */}
        <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-800 mb-1">
            <span className="text-[11px] font-medium uppercase font-mono">Balanceados</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">{indicators.balanced}</div>
          <p className="text-[10px] text-emerald-700 mt-0.5">Operação nominal</p>
        </div>

        {/* Acima do Máximo */}
        <div className="bg-white p-3 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-medium uppercase font-mono">Acima do Máximo</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600">{indicators.aboveMax}</div>
          <p className="text-[10px] text-rose-700 mt-0.5">Risco de saturação</p>
        </div>

        {/* Sem Parametrização */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium uppercase font-mono">Sem Buffer</span>
            <Info className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {indicators.totalPendingCoverage}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Pares em aberto</p>
        </div>
      </div>

      {/* MONITORAMENTO FINO DINÂMICO (Item 7 - Fim do Hardcoded) */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#004C97]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">
              Monitoramento Fino de Buffers Físicos, Operacionais e de Segurança (Dinâmico)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {buffers.filter((b) => b.status === 'Ativo').length} Buffers Ativos Monitorados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {buffers
            .filter((b) => b.status === 'Ativo')
            .map((b) => {
              const op = operationalStatuses[b.id]
              const current = op ? op.current_stock : b.ideal_capacity
              const unit = b.unit_of_measure
              const health = op?.health || 'BALANCED'

              // Percentual de preenchimento
              const pct = Math.min(
                100,
                Math.max(0, Math.round((current / (b.max_capacity || 1)) * 100)),
              )

              let statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-300'
              let barColor = 'bg-emerald-500'
              if (health === 'BELOW_MIN' || health === 'ABOVE_MAX') {
                statusBg = 'bg-rose-100 text-rose-800 border-rose-300'
                barColor = 'bg-rose-500'
              } else if (health === 'NEAR_MIN' || health === 'NEAR_MAX') {
                statusBg = 'bg-amber-100 text-amber-800 border-amber-300'
                barColor = 'bg-amber-500'
              }

              return (
                <div
                  key={b.id}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/40 hover:bg-white transition-all space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {b.center_code} ➔ {b.related_center_code}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">({b.route_code})</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono px-2 py-0.5 ${statusBg}`}
                    >
                      {op?.healthLabel || 'BALANCEADO'}
                    </Badge>
                  </div>

                  {/* Barra de Progresso do Buffer */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-600">
                        Atual:{' '}
                        <strong className="text-slate-900">
                          {current} {unit}
                        </strong>
                      </span>
                      <span className="text-slate-500">{pct}% ocupado</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Faixas e Limites */}
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono text-slate-600 border-t border-slate-200">
                    <div>
                      Mín:{' '}
                      <strong className="text-slate-900">
                        {b.min_capacity} {unit}
                      </strong>
                    </div>
                    <div className="text-center">
                      Ideal:{' '}
                      <strong className="text-slate-900">
                        {b.ideal_capacity} {unit}
                      </strong>
                    </div>
                    <div className="text-right">
                      Máx:{' '}
                      <strong className="text-slate-900">
                        {b.max_capacity} {unit}
                      </strong>
                    </div>
                  </div>

                  {/* Fonte do estoque e alerta operacional */}
                  <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500">
                    <span>
                      Fonte: <strong className="text-slate-700">{b.stock_source}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      className="text-[#004C97] hover:underline flex items-center gap-0.5 font-medium"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                  </div>
                </div>
              )
            })}

          {buffers.filter((b) => b.status === 'Ativo').length === 0 && (
            <div className="col-span-full p-6 text-center text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs">
              Nenhum buffer ativo cadastrado no momento. Utilize o botão "+ Cadastrar Buffer /
              Pulmão" acima.
            </div>
          )}
        </div>
      </div>

      {/* VISÃO GRÁFICA DO FLUXO (Item 7: L2 ↓ [Buffer] ↓ ENDIR ↓ [Buffer] ↓ RETRAB) */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase font-mono">
              Visão Gráfica do Fluxo de Produção & Absorção de Pulmão
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-mono">Rota em Visualização:</span>
            <select
              value={activeFlowRouteCode}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono text-slate-900 outline-none"
            >
              {uniqueRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Análise de cobertura da rota ativa */}
        {indicators.coverageMap[activeFlowRouteCode] && (
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
              indicators.coverageMap[activeFlowRouteCode].is_complete
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-1.5 font-medium">
              {indicators.coverageMap[activeFlowRouteCode].is_complete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{indicators.coverageMap[activeFlowRouteCode].pending_text}</span>
            </div>
            <span className="text-[11px] font-mono">
              {indicators.coverageMap[activeFlowRouteCode].configured_buffers} de{' '}
              {indicators.coverageMap[activeFlowRouteCode].total_relations} relações parametrizadas
            </span>
          </div>
        )}

        {/* Cadeia gráfica horizontal/vertical */}
        <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {activeFlowRoute?.nodes && activeFlowRoute.nodes.length > 0 ? (
              activeFlowRoute.nodes.map((node: any, idx: number) => {
                const nextNode = activeFlowRoute.nodes[idx + 1]
                const bufferRel = nextNode
                  ? buffers.find(
                      (b) =>
                        b.route_code === activeFlowRouteCode &&
                        b.status === 'Ativo' &&
                        ((b.center_code === node.line_code &&
                          b.related_center_code === nextNode.line_code) ||
                          (b.center_code === nextNode.line_code &&
                            b.related_center_code === node.line_code)),
                    )
                  : null

                const op = bufferRel ? operationalStatuses[bufferRel.id] : null

                return (
                  <React.Fragment key={node.id || node.line_code || idx}>
                    {/* Bloco do Centro / Linha */}
                    <div className="p-3 bg-white border border-slate-300 rounded-lg shadow-2xs min-w-[130px] text-center space-y-1">
                      <div className="text-[10px] font-mono text-slate-500 uppercase">
                        Centro Produtivo
                      </div>
                      <div className="text-sm font-bold font-mono text-[#004C97]">
                        {node.line_code}
                      </div>
                      <div className="text-[10px] text-slate-600 truncate max-w-[120px]">
                        {node.process_name || 'Operação'}
                      </div>
                    </div>

                    {/* Bloco do Buffer Intermediário (se houver próximo centro) */}
                    {nextNode && (
                      <div className="flex items-center gap-1.5 px-1">
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                        {bufferRel ? (
                          <div
                            className={`p-2.5 rounded-lg border text-xs space-y-1 shadow-2xs min-w-[150px] ${
                              op?.health === 'BELOW_MIN' || op?.health === 'ABOVE_MAX'
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : op?.health === 'NEAR_MIN' || op?.health === 'NEAR_MAX'
                                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            }`}
                          >
                            <div className="flex items-center justify-between font-mono text-[10px]">
                              <span className="font-bold">Buffer {bufferRel.unit_of_measure}</span>
                              <span>
                                {op?.health === 'BELOW_MIN'
                                  ? '⚠ Abaixo'
                                  : op?.health === 'ABOVE_MAX'
                                    ? '⚠ Saturado'
                                    : 'OK'}
                              </span>
                            </div>
                            <div className="font-mono text-xs font-bold text-center">
                              {op?.current_stock ?? bufferRel.ideal_capacity}{' '}
                              {bufferRel.unit_of_measure}
                            </div>
                            <div className="text-[9px] font-mono text-slate-500 flex justify-between">
                              <span>Mín: {bufferRel.min_capacity}</span>
                              <span>Máx: {bufferRel.max_capacity}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2 border border-dashed border-amber-300 bg-amber-50 rounded-lg text-center min-w-[130px]">
                            <span className="text-[10px] text-amber-800 font-medium block">
                              Sem parametrização
                            </span>
                            <button
                              type="button"
                              onClick={handleOpenCreate}
                              className="text-[10px] text-[#004C97] underline font-semibold mt-0.5"
                            >
                              + Parametrizar
                            </button>
                          </div>
                        )}
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <div className="text-xs text-slate-500 p-2">Nenhum nó mapeado para esta rota.</div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS (Item 7) */}
      <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs space-y-2">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Filter className="w-3.5 h-3.5 text-[#004C97]" />
          <span className="text-xs font-bold font-mono text-slate-800 uppercase">
            Filtros de Gestão dos Buffers
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {/* Empresa */}
          <div>
            <label className="block text-[10px] font-mono text-slate-600 mb-0.5">Empresa</label>
            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
            >
              <option value="ALL">Todas</option>
              {uniqueCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Linha */}
          <div>
            <label className="block text-[10px] font-mono text-slate-600 mb-0.5">Linha</label>
            <select
              value={selectedLineFilter}
              onChange={(e) => setSelectedLineFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
            >
              <option value="ALL">Todas</option>
              {uniqueLines.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Rota */}
          <div>
            <label className="block text-[10px] font-mono text-slate-600 mb-0.5">
              Rota Produtiva
            </label>
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
            >
              <option value="ALL">Todas as Rotas</option>
              {uniqueRoutes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Centro */}
          <div>
            <label className="block text-[10px] font-mono text-slate-600 mb-0.5">Centro</label>
            <select
              value={selectedCenterFilter}
              onChange={(e) => setSelectedCenterFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 font-mono text-xs outline-none"
            >
              <option value="ALL">Todos os Centros</option>
              {uniqueCenters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-mono text-slate-600 mb-0.5">Status</label>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs outline-none"
            >
              <option value="ALL">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          {/* Situação Operacional */}
          <div>
            <label className="block text-[10px] font-mono text-slate-600 mb-0.5">
              Situação Operacional
            </label>
            <select
              value={selectedHealthFilter}
              onChange={(e) => setSelectedHealthFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs outline-none"
            >
              <option value="ALL">Todas</option>
              <option value="BELOW_MIN">Abaixo do Mínimo</option>
              <option value="NEAR_MIN">Atenção (Próx Mínimo)</option>
              <option value="BALANCED">Balanceado</option>
              <option value="NEAR_MAX">Atenção (Próx Máximo)</option>
              <option value="ABOVE_MAX">Acima do Máximo</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABELA DE GESTÃO (Item 7) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold font-mono text-slate-800 uppercase">
            Cadastros de Buffers & Pulmões ({filteredBuffers.length} Registros)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Dados persistidos na coleção <strong className="text-slate-700">line_buffers</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Empresa</th>
                <th className="py-2.5 px-3">Linha</th>
                <th className="py-2.5 px-3">Rota</th>
                <th className="py-2.5 px-3">Centro</th>
                <th className="py-2.5 px-3">Centro Rel.</th>
                <th className="py-2.5 px-3">Relação</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Unid</th>
                <th className="py-2.5 px-3 text-right">Mín</th>
                <th className="py-2.5 px-3 text-right">Ideal</th>
                <th className="py-2.5 px-3 text-right">Máx</th>
                <th className="py-2.5 px-3 text-right">Atual</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Operacional</th>
                <th className="py-2.5 px-3">Vigência</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredBuffers.map((b) => {
                const op = operationalStatuses[b.id]
                const current = op ? op.current_stock : '-'

                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{b.company_code}</td>
                    <td className="py-2.5 px-3 text-slate-700">{b.line_code}</td>
                    <td className="py-2.5 px-3 text-[#004C97] font-bold">{b.route_code}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-bold">{b.center_code}</td>
                    <td className="py-2.5 px-3 text-slate-800">{b.related_center_code}</td>
                    <td className="py-2.5 px-3 text-slate-900 font-bold">
                      {b.center_code} ➔ {b.related_center_code}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-sans">{b.buffer_type}</td>
                    <td className="py-2.5 px-3 text-slate-600">{b.unit_of_measure}</td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                      {b.min_capacity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                      {b.ideal_capacity}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-900 font-bold">
                      {b.max_capacity}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#004C97]">{current}</td>
                    <td className="py-2.5 px-3 text-center">
                      {b.status === 'Ativo' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-mono ${
                          op?.health === 'BELOW_MIN' || op?.health === 'ABOVE_MAX'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : op?.health === 'NEAR_MIN' || op?.health === 'NEAR_MAX'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {op?.healthLabel || 'BALANCEADO'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                      {b.valid_from ? b.valid_from.split('T')[0] : ''} até{' '}
                      {b.valid_until ? b.valid_until.split('T')[0] : ''}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(b)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-[#004C97]"
                          title="Editar Buffer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(b)}
                          className={`h-7 w-7 p-0 ${
                            b.status === 'Ativo'
                              ? 'text-rose-600 hover:text-rose-800 hover:bg-rose-50'
                              : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                          }`}
                          title={b.status === 'Ativo' ? 'Inativar Buffer' : 'Ativar Buffer'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredBuffers.length === 0 && (
                <tr>
                  <td colSpan={16} className="py-6 text-center text-slate-500 font-sans text-xs">
                    Nenhum buffer encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CADASTRO E EDIÇÃO COM OS 17 CAMPOS */}
      <LineBufferModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        bufferToEdit={bufferToEdit}
        initialRouteCode={selectedRouteFilter !== 'ALL' ? selectedRouteFilter : undefined}
        initialLineCode={selectedLineFilter !== 'ALL' ? selectedLineFilter : undefined}
        onSuccess={() => {
          loadBuffers()
        }}
      />
    </div>
  )
}
