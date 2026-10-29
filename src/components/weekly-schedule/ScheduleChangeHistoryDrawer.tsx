import React, { useState, useEffect, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  History,
  Search,
  RefreshCw,
  PlusCircle,
  Trash2,
  Copy,
  GitFork,
  Move,
  Edit,
  User,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { pb } from '@/lib/pocketbase/client'

export type ScheduleActionType =
  | 'ALL'
  | 'ADD_PRODUCT'
  | 'REMOVE_PRODUCT'
  | 'DUPLICATE_ITEM'
  | 'DERIVED_SCHEDULE'
  | 'DRAG_AND_DROP'
  | 'EDIT_ITEM'

export interface ScheduleHistoryRecord {
  id: string
  action: string
  actionType: ScheduleActionType
  actionLabel: string
  userName: string
  userEmail: string
  createdAt: string
  createdFormatted: string
  productCode?: string
  productDescription?: string
  changeSummary: string
  details?: Record<string, any>
  changes?: Array<{
    field: string
    fieldNamePt?: string
    before: any
    after: any
  }>
}

interface ScheduleChangeHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  scheduleCode: string
  lineCode: string
  year: number
  weekNumber: number
}

// Formatador brasileiro de data e hora: dd/mm/aaaa hh:mm
export function formatPtBrDateTime(isoString?: string): string {
  if (!isoString) return '--/--/---- --:--'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = pad(d.getDate())
    const month = pad(d.getMonth() + 1)
    const year = d.getFullYear()
    const hours = pad(d.getHours())
    const minutes = pad(d.getMinutes())
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return isoString
  }
}

// Categoriza o tipo de ação para badge e ícone
export function categorizeAction(
  actionStr: string,
  details?: any,
): {
  type: ScheduleActionType
  label: string
} {
  const norm = (actionStr || '').toUpperCase()
  const detailAction = (details?.action || details?.action_type || '').toUpperCase()

  if (
    norm.includes('ADICIONAR PRODUTO') ||
    norm.includes('INCLUSAO') ||
    norm.includes('NOVO PRODUTO')
  ) {
    return { type: 'ADD_PRODUCT', label: 'Adição de Produto' }
  }
  if (
    norm.includes('SCHEDULE_ITEM_DELETE') ||
    norm.includes('REMOVER') ||
    norm.includes('EXCLUS') ||
    norm.includes('ELIMINAR') ||
    norm.includes('CANCEL')
  ) {
    return { type: 'REMOVE_PRODUCT', label: 'Remoção de Item' }
  }
  if (norm.includes('DUPLICAR') || norm.includes('DUPLICADO')) {
    return { type: 'DUPLICATE_ITEM', label: 'Duplicação de Item' }
  }
  if (
    norm.includes('PROGRAMAÇÃO DERIVADA') ||
    norm.includes('DERIVAÇÃO') ||
    norm.includes('DERIVAR') ||
    detailAction.includes('DERIVED')
  ) {
    return { type: 'DERIVED_SCHEDULE', label: 'Programação Derivada' }
  }
  if (
    norm.includes('DRAG') ||
    norm.includes('TRANSFER') ||
    norm.includes('REORDEN') ||
    norm.includes('REPROGRAM') ||
    norm.includes('SEQUENCIA')
  ) {
    return { type: 'DRAG_AND_DROP', label: 'Movimentação / Drag & Drop' }
  }
  if (
    norm.includes('ALTERAÇÃO NA PROGRAMAÇÃO') ||
    norm.includes('EDIÇÃO') ||
    norm.includes('AJUSTE')
  ) {
    return { type: 'EDIT_ITEM', label: 'Edição de Parâmetros' }
  }

  return { type: 'EDIT_ITEM', label: 'Alteração na Grade' }
}

export const ScheduleChangeHistoryDrawer: React.FC<ScheduleChangeHistoryDrawerProps> = ({
  isOpen,
  onClose,
  scheduleCode,
  lineCode,
  year,
  weekNumber,
}) => {
  const [logs, setLogs] = useState<ScheduleHistoryRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filtros
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<ScheduleActionType>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Paginação
  const [page, setPage] = useState<number>(1)
  const pageSize = 12

  const fetchHistory = useCallback(async () => {
    if (!isOpen) return
    setIsLoading(true)
    setLoadError(null)

    try {
      // Monta filtros PocketBase: buscar logs pertinentes a esta linha / semana / programação
      const filterConditions: string[] = []

      // Escopo de linha ou código da programação
      if (lineCode) {
        filterConditions.push(
          `(line = '${lineCode}' || details ~ '"lineCode":"${lineCode}"' || details ~ '"line_code":"${lineCode}"' || action ~ '${lineCode}')`,
        )
      }

      // Restringir a módulos de programação
      filterConditions.push(
        `(module = 'Programação' || module = 'Montagem Programação' || module = 'Programação Semanal' || event_type = 'SCHEDULE_ACTION' || action ~ 'Programação' || action ~ 'Grade' || action ~ 'Item' || action ~ 'Drag')`,
      )

      const filterString = filterConditions.join(' && ')

      // Buscar até 150 registros mais recentes do servidor
      const result = await pb.collection('pcp_audit_logs').getList(1, 150, {
        filter: filterString,
        sort: '-created',
      })

      const mapped: ScheduleHistoryRecord[] = result.items.map((r: any) => {
        const rawDetails = r.details || {}
        const actionStr = r.action || 'Alteração na Grade'
        const cat = categorizeAction(actionStr, rawDetails)

        // Resolução do código do produto
        const productCode =
          rawDetails.materialCode ||
          rawDetails.material_code ||
          rawDetails.productCode ||
          rawDetails.product_code ||
          (r.resource_id && r.resource_id.length < 30 ? r.resource_id : '')

        // Resolução da descrição do material
        const productDescription =
          rawDetails.materialDescription ||
          rawDetails.material_description ||
          rawDetails.product_name ||
          ''

        // Resumo da mudança
        let changeSummary = r.justification || r.reason || actionStr
        if (rawDetails.changeSummary) {
          changeSummary = rawDetails.changeSummary
        } else if (rawDetails.movementDetail) {
          changeSummary = rawDetails.movementDetail
        } else if (r.changes && Array.isArray(r.changes) && r.changes.length > 0) {
          const diffTexts = r.changes
            .slice(0, 3)
            .map((c: any) => `${c.fieldNamePt || c.field}: ${c.before ?? '-'} → ${c.after ?? '-'}`)
          changeSummary = diffTexts.join(' | ')
        }

        const rawChanges = Array.isArray(r.changes) ? r.changes : rawDetails.changes || []

        return {
          id: r.id,
          action: actionStr,
          actionType: cat.type,
          actionLabel: cat.label,
          userName: r.user_name || r.user_email || 'Programador PCP',
          userEmail: r.user_email || '',
          createdAt: r.created,
          createdFormatted: formatPtBrDateTime(r.created),
          productCode: productCode || undefined,
          productDescription: productDescription || undefined,
          changeSummary,
          details: rawDetails,
          changes: rawChanges,
        }
      })

      setLogs(mapped)
    } catch (err: any) {
      console.warn('Falha ao carregar histórico de alterações da grade:', err)
      setLoadError(
        err?.message || 'Não foi possível carregar os registros de auditoria no servidor.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [isOpen, lineCode, scheduleCode, year, weekNumber])

  useEffect(() => {
    if (isOpen) {
      setPage(1)
      fetchHistory()
    }
  }, [isOpen, fetchHistory])

  // Filtragem local
  const filteredLogs = logs.filter((log) => {
    if (selectedTypeFilter !== 'ALL' && log.actionType !== selectedTypeFilter) {
      return false
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      const matchAction = log.action.toLowerCase().includes(q)
      const matchLabel = log.actionLabel.toLowerCase().includes(q)
      const matchUser =
        log.userName.toLowerCase().includes(q) || log.userEmail.toLowerCase().includes(q)
      const matchProd = (log.productCode || '').toLowerCase().includes(q)
      const matchDesc = (log.productDescription || '').toLowerCase().includes(q)
      const matchSummary = log.changeSummary.toLowerCase().includes(q)
      if (!matchAction && !matchLabel && !matchUser && !matchProd && !matchDesc && !matchSummary) {
        return false
      }
    }
    return true
  })

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize)

  // Renderiza ícone por tipo de ação
  const renderActionIcon = (type: ScheduleActionType) => {
    switch (type) {
      case 'ADD_PRODUCT':
        return <PlusCircle className="w-4 h-4 text-emerald-600" />
      case 'REMOVE_PRODUCT':
        return <Trash2 className="w-4 h-4 text-rose-600" />
      case 'DUPLICATE_ITEM':
        return <Copy className="w-4 h-4 text-amber-600" />
      case 'DERIVED_SCHEDULE':
        return <GitFork className="w-4 h-4 text-purple-600" />
      case 'DRAG_AND_DROP':
        return <Move className="w-4 h-4 text-[#004C97]" />
      case 'EDIT_ITEM':
      default:
        return <Edit className="w-4 h-4 text-slate-600" />
    }
  }

  // Renderiza badge por tipo de ação
  const renderActionBadge = (type: ScheduleActionType, label: string) => {
    switch (type) {
      case 'ADD_PRODUCT':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
            {label}
          </Badge>
        )
      case 'REMOVE_PRODUCT':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-300 text-[10px] font-bold">
            {label}
          </Badge>
        )
      case 'DUPLICATE_ITEM':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300 text-[10px] font-bold">
            {label}
          </Badge>
        )
      case 'DERIVED_SCHEDULE':
        return (
          <Badge className="bg-purple-50 text-purple-800 border-purple-300 text-[10px] font-bold">
            {label}
          </Badge>
        )
      case 'DRAG_AND_DROP':
        return (
          <Badge className="bg-blue-50 text-[#004C97] border-blue-300 text-[10px] font-bold">
            {label}
          </Badge>
        )
      case 'EDIT_ITEM':
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[10px] font-bold">
            {label}
          </Badge>
        )
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl bg-white text-slate-900 border-l border-slate-300 p-0 flex flex-col shadow-2xl z-50 overflow-hidden"
      >
        {/* Cabeçalho CIAFAL Pantone 2945 */}
        <SheetHeader className="bg-[#004C97] text-white px-5 py-4 border-b border-blue-800 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-lg text-white shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-white flex items-center gap-2">
                  Histórico de Alterações na Grade
                </SheetTitle>
                <SheetDescription className="text-xs text-blue-100">
                  Rastreabilidade auditável &bull; Linha {lineCode || 'CIAFAL'} &bull; Semana{' '}
                  {weekNumber}/{year}
                </SheetDescription>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-mono shrink-0">
              AUDIT TRAIL
            </Badge>
          </div>
        </SheetHeader>

        {/* Barra de Filtros e Busca Responsiva */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                placeholder="Buscar por produto, usuário ou detalhe..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setPage(1)
                }}
                className="pl-8 text-xs bg-white border-slate-300 h-8"
              />
            </div>

            <div className="w-full sm:w-48 shrink-0">
              <Select
                value={selectedTypeFilter}
                onValueChange={(val) => {
                  setSelectedTypeFilter(val as ScheduleActionType)
                  setPage(1)
                }}
              >
                <SelectTrigger className="text-xs bg-white border-slate-300 h-8 font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    <Filter className="w-3 h-3 text-slate-500 shrink-0" />
                    <SelectValue placeholder="Tipo de Ação" />
                  </div>
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="ALL">Todas as Ações</SelectItem>
                  <SelectItem value="ADD_PRODUCT">Adição de Produto</SelectItem>
                  <SelectItem value="REMOVE_PRODUCT">Remoção de Item</SelectItem>
                  <SelectItem value="DUPLICATE_ITEM">Duplicação</SelectItem>
                  <SelectItem value="DERIVED_SCHEDULE">Programação Derivada</SelectItem>
                  <SelectItem value="DRAG_AND_DROP">Movimentação / Drag & Drop</SelectItem>
                  <SelectItem value="EDIT_ITEM">Edição de Parâmetros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchHistory}
              disabled={isLoading}
              title="Recarregar registros"
              className="h-8 px-2.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              Total exibido: <strong>{filteredLogs.length}</strong> registro(s)
            </span>
            <span>Ordem cronológica decrescente (mais recentes primeiro)</span>
          </div>
        </div>

        {/* Lista de Registros ou Estados de Loading / Vazio / Erro */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
              <div>
                <p className="font-bold text-rose-900 text-xs">Erro ao carregar histórico</p>
                <p className="text-rose-700 text-[11px] mt-1 max-w-sm mx-auto">{loadError}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchHistory}
                className="h-7 text-xs border-rose-300 text-rose-800 bg-white hover:bg-rose-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" /> Tentar novamente
              </Button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-800 text-xs">
                Nenhuma alteração registrada para esta programação
              </p>
              <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                As operações realizadas na grade (inclusão, remoção, duplicação, derivação ou
                movimentação por arrasto) são gravadas com usuário e data/hora.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-3 shadow-2xs transition-all space-y-2 text-xs"
                >
                  {/* Linha superior: Ação + Badge + Data/Hora */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-100 rounded-md shrink-0">
                        {renderActionIcon(log.actionType)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{log.action}</span>
                        {log.productCode && (
                          <span className="text-[11px] text-slate-600 font-mono">
                            Material: <strong>{log.productCode}</strong>
                            {log.productDescription ? ` — ${log.productDescription}` : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {renderActionBadge(log.actionType, log.actionLabel)}
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{log.createdFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo Semântico da Mudança */}
                  <div className="p-2 bg-slate-50/80 rounded border border-slate-100 text-[11px] text-slate-800 font-medium">
                    {log.changeSummary}
                  </div>

                  {/* Detalhes de Diferença / Before & After se existirem */}
                  {log.changes && log.changes.length > 0 && (
                    <div className="p-2 bg-blue-50/40 border border-blue-100 rounded text-[11px] space-y-1">
                      <span className="text-[10px] font-bold text-blue-900 block uppercase tracking-wider">
                        Campos Alterados:
                      </span>
                      <div className="grid grid-cols-1 gap-1">
                        {log.changes.map((ch, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-700 bg-white/70 px-2 py-0.5 rounded border border-blue-200/50"
                          >
                            <span className="font-semibold text-slate-900">
                              {ch.fieldNamePt || ch.field}:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-500 bg-slate-100 px-1 rounded">
                                {String(ch.before ?? '—')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-[#004C97]" />
                              <span className="font-bold text-[#004C97] bg-blue-50 px-1 rounded">
                                {String(ch.after ?? '—')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rodapé do Item: Usuário e Identificador */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>
                        Usuário: <strong className="text-slate-700">{log.userName}</strong>
                        {log.userEmail ? ` (${log.userEmail})` : ''}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-400">ID: {log.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé com Paginação */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0 text-xs">
          <div className="text-[11px] text-slate-600 font-medium">
            Página <strong>{page}</strong> de <strong>{totalPages}</strong>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 px-2 text-xs border-slate-300 text-slate-700"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 px-2 text-xs border-slate-300 text-slate-700"
            >
              Próxima <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onClose}
              className="h-7 px-3 text-xs bg-[#004C97] hover:bg-[#003d7a] text-white ml-2"
            >
              Fechar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ScheduleChangeHistoryDrawer
