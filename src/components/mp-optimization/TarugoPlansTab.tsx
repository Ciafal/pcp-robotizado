/**
 * Componente principal "Plano Tarugos" (aba dentro de Planos de Corte / Gestão de MP).
 *
 * Listagem, filtros combinados, cadastro grande (3 blocos), detalhamento,
 * duplicação, ativar/inativar, exclusão lógica e histórico — operações reais
 * contra a collection pcp_tarugo_cut_plans via tarugoPlansService.
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Activity, Copy, Eye, History, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Can } from '@/components/auth/Can'
import {
  tarugoPlansService,
  tarugoFormatters,
  type TarugoPlanRecord,
  type TarugoPlanFilters,
} from '@/services/tarugo-plans-service'
import { useHierarchyOptions } from '@/components/mp-optimization/tarugo-plan-hierarchy-options'
import { TarugoPlanFormModal } from '@/components/mp-optimization/TarugoPlanFormModal'
import { TarugoPlanDetailModal } from '@/components/mp-optimization/TarugoPlanDetailModal'
import { TarugoPlanHistoryModal } from '@/components/mp-optimization/TarugoPlanHistoryModal'
import { TarugoPlanDuplicateModal } from '@/components/mp-optimization/TarugoPlanDuplicateModal'
import { TarugoPlanConfirmModal } from '@/components/mp-optimization/TarugoPlanConfirmModal'

const COMPANY_OPTIONS = ['Ciafal', 'Cisam', 'Sidercentro']

function emptyFilters(): TarugoPlanFilters {
  return {
    search: '',
    company: '',
    center: '',
    line: '',
    cuttingPlan: '',
    material: '',
    steelFamily: '',
    supplier: '',
    status: 'Todos',
  }
}

type ConfirmAction =
  | { kind: 'delete'; plan: TarugoPlanRecord }
  | { kind: 'toggle'; plan: TarugoPlanRecord }
  | null

export function TarugoPlansTab() {
  const [plans, setPlans] = useState<TarugoPlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [formOpen, setFormOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TarugoPlanRecord | null>(null)
  const [detailPlan, setDetailPlan] = useState<TarugoPlanRecord | null>(null)
  const [historyPlan, setHistoryPlan] = useState<TarugoPlanRecord | null>(null)
  const [duplicateSource, setDuplicateSource] = useState<TarugoPlanRecord | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [busy, setBusy] = useState(false)
  const hierarchy = useHierarchyOptions()
  const [filters, setFilters] = useState<TarugoPlanFilters>(emptyFilters())

  const loadPlans = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await tarugoPlansService.listPlans(filters)
      setPlans(data)
      setPage(1)
    } catch (err) {
      console.error('[TarugoPlansTab] Erro ao carregar planos:', err)
      setError('Não foi possível carregar os planos de tarugos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlans()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  // Filtro textual combinado no cliente (busca geral)
  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    if (!q) return plans
    return plans.filter((p) =>
      [
        p.cutting_plan,
        p.main_material_code,
        p.main_description,
        p.main_supplier_name,
        p.company,
        p.center,
        p.line,
        p.main_steel_family,
      ].some((v) =>
        String(v ?? '')
          .toLowerCase()
          .includes(q),
      ),
    )
  }, [plans, filters.search])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageRecords = filtered.slice((page - 1) * pageSize, page * pageSize)

  const setFilter = (patch: Partial<TarugoPlanFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
  }

  const handleToggleStatus = async () => {
    if (!confirmAction || confirmAction.kind !== 'toggle') return
    setBusy(true)
    try {
      const plan = confirmAction.plan
      const target: 'Ativo' | 'Inativo' = plan.status === 'Ativo' ? 'Inativo' : 'Ativo'
      await tarugoPlansService.setPlanStatus(plan.id, target)
      toast.success(
        `Plano de Tarugos ${plan.cutting_plan} ${target === 'Ativo' ? 'ativado' : 'inativado'} com sucesso.`,
      )
      setConfirmAction(null)
      await loadPlans()
    } catch (err) {
      console.error('[TarugoPlansTab] Erro ao alterar status:', err)
      toast.error('Não foi possível alterar o status do plano.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmAction || confirmAction.kind !== 'delete') return
    setBusy(true)
    try {
      const plan = confirmAction.plan
      await tarugoPlansService.softDeletePlan(plan)
      toast.success(`Plano de Tarugos ${plan.cutting_plan} inativado com sucesso.`)
      setConfirmAction(null)
      await loadPlans()
    } catch (err) {
      console.error('[TarugoPlansTab] Erro ao excluir:', err)
      toast.error('Não foi possível excluir o plano.')
    } finally {
      setBusy(false)
    }
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingPlan(null)
  }

  const statusBadgeVariant = (s: string) => (s === 'Ativo' ? 'default' : 'secondary')

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Plano Tarugos</h2>
          <p className="text-sm text-slate-500">
            Cadastro e gestão dos planos padrão de corte e combinações de matéria-prima.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Can permission="PCP_PROGRAMMER">
            <Button onClick={() => setFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Plano de Tarugos
            </Button>
          </Can>
        </div>
      </div>

      {/* Filtros combinados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tarugo-search">Pesquisa geral</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="tarugo-search"
                placeholder="Pesquisar por plano, código SAP, descrição, fornecedor ou material..."
                value={filters.search}
                onChange={(e) => setFilter({ search: e.target.value })}
                className="pl-9"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={filters.company}
                onChange={(e) => setFilter({ company: e.target.value })}
              >
                <option value="">Todas</option>
                {COMPANY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Centro</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={filters.center}
                onChange={(e) => setFilter({ center: e.target.value })}
              >
                <option value="">Todos</option>
                {hierarchy.centers.map((c) => (
                  <option key={c.code} value={c.sap_plant_code}>
                    {c.sap_plant_code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Linha</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={filters.line}
                onChange={(e) => setFilter({ line: e.target.value })}
              >
                <option value="">Todas</option>
                {hierarchy.lines
                  .filter((l) => !filters.center || l.plant_id === '')
                  .map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.code} — {l.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Plano de Corte</Label>
              <Input
                placeholder="P1, P2, P10..."
                value={filters.cuttingPlan}
                onChange={(e) => setFilter({ cuttingPlan: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Material/Tarugo</Label>
              <Input
                placeholder="Código SAP"
                value={filters.material}
                onChange={(e) => setFilter({ material: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Família/Aço</Label>
              <Input
                placeholder="SAE 1020, 20MnCr5..."
                value={filters.steelFamily}
                onChange={(e) => setFilter({ steelFamily: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor</Label>
              <Input
                placeholder="GERDAU, ArcelorMittal..."
                value={filters.supplier}
                onChange={(e) => setFilter({ supplier: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                value={filters.status}
                onChange={(e) =>
                  setFilter({ status: e.target.value as TarugoPlanFilters['status'] })
                }
              >
                <option value="Todos">Todos</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela responsiva */}
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Planos de Tarugos cadastrados ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={loadPlans}>
                Tentar novamente
              </Button>
            </div>
          ) : total === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600">
                Nenhum Plano de Tarugos encontrado para os filtros selecionados.
              </p>
              <Can permission="PCP_PROGRAMMER">
                <Button className="mt-3" onClick={() => setFormOpen(true)}>
                  Cadastrar primeiro plano
                </Button>
              </Can>
            </div>
          ) : (
            <>
              <div className="max-h-[60vh] overflow-auto">
                <Table className="min-w-[1280px]">
                  <TableHeader className="sticky top-0 z-10 bg-white">
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Linha</TableHead>
                      <TableHead>Plano de Corte</TableHead>
                      <TableHead>Código do Componente</TableHead>
                      <TableHead>Descrição do Componente</TableHead>
                      <TableHead>Código Forn.</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Comprimento</TableHead>
                      <TableHead className="text-right">Peso Tarugo</TableHead>
                      <TableHead>Aço/Família</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Última alteração</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRecords.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>{plan.company || 'Dados não disponíveis'}</TableCell>
                        <TableCell>{plan.center || 'Dados não disponíveis'}</TableCell>
                        <TableCell>{plan.line || 'Dados não disponíveis'}</TableCell>
                        <TableCell className="font-medium">{plan.cutting_plan}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {plan.main_material_code}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate" title={plan.main_description}>
                          {plan.main_description || 'Dados não disponíveis'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {plan.main_supplier_code || '—'}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {plan.main_supplier_name || 'Dados não disponíveis'}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tarugoFormatters.meters(plan.main_length_m)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {tarugoFormatters.kg(plan.main_weight_kg)}
                        </TableCell>
                        <TableCell>{plan.main_steel_family || 'Dados não disponíveis'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant={statusBadgeVariant(plan.status)}>{plan.status}</Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {plan.origin}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-600">
                          {tarugoFormatters.dateTime(plan.updated || plan.created)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setDetailPlan(plan)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Can permission="PCP_PROGRAMMER">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setEditingPlan(plan)
                                  setFormOpen(true)
                                }}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setDuplicateSource(plan)}
                                title="Duplicar plano"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setConfirmAction({ kind: 'toggle', plan })}
                                title={plan.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                              >
                                <Activity className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setConfirmAction({ kind: 'delete', plan })}
                                title="Excluir (exclusão lógica)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Can>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setHistoryPlan(plan)}
                              title="Histórico"
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Paginação */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Linhas por página</span>
                  <select
                    className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setPage(1)
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>
                    Página {page} de {totalPages}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <TarugoPlanFormModal
        open={formOpen}
        onClose={closeForm}
        editing={editingPlan}
        onSaved={() => {
          closeForm()
          loadPlans()
        }}
      />
      <TarugoPlanDetailModal
        plan={detailPlan}
        onClose={() => setDetailPlan(null)}
        onEdit={(p) => {
          setDetailPlan(null)
          setEditingPlan(p)
          setFormOpen(true)
        }}
        onDuplicate={(p) => {
          setDetailPlan(null)
          setDuplicateSource(p)
        }}
        onHistory={(p) => {
          setDetailPlan(null)
          setHistoryPlan(p)
        }}
      />
      <TarugoPlanHistoryModal plan={historyPlan} onClose={() => setHistoryPlan(null)} />
      <TarugoPlanDuplicateModal
        source={duplicateSource}
        onClose={() => setDuplicateSource(null)}
        onDuplicated={() => {
          setDuplicateSource(null)
          loadPlans()
        }}
      />
      <TarugoPlanConfirmModal
        action={confirmAction}
        busy={busy}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.kind === 'delete') handleDelete()
          else if (confirmAction?.kind === 'toggle') handleToggleStatus()
        }}
      />
    </div>
  )
}

export default TarugoPlansTab
