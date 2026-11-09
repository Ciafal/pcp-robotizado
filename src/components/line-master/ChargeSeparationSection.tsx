import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  AlertCircle,
  ArrowRight,
  Edit,
  Filter,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { LineChargeSeparation } from '@/types/furnace-charging'
import { furnaceChargingService } from '@/services/furnace-charging-service'
import { ChargeSeparationModal } from './ChargeSeparationModal'
import { useToast } from '@/hooks/use-toast'
import { formatNumberPtBr } from '@/lib/number-format'

interface ChargeSeparationSectionProps {
  centerCode: string
  lineId?: string
  lineMasterId?: string
}

export const ChargeSeparationSection: React.FC<ChargeSeparationSectionProps> = ({
  centerCode,
  lineId,
  lineMasterId,
}) => {
  const { toast } = useToast()
  const [items, setItems] = useState<LineChargeSeparation[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros lineares (por Carga que irá enfornar e Carga enfornada)
  const [filterCharging, setFilterCharging] = useState<string>('ALL')
  const [filterCharged, setFilterCharged] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modal de inclusão / edição
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<LineChargeSeparation | null>(null)

  // Exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<LineChargeSeparation | null>(null)
  const [deleting, setDeleting] = useState<boolean>(false)

  const loadData = useCallback(async () => {
    if (!centerCode) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await furnaceChargingService.listChargeSeparations(centerCode)
      setItems(data)
    } catch (err: any) {
      console.error('Erro ao carregar separação de carga:', err)
      setError('Não foi possível carregar as regras de separação de carga para este centro.')
    } finally {
      setLoading(false)
    }
  }, [centerCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Opções para os filtros a partir dos dados existentes
  const chargingOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.charging_load_type) set.add(i.charging_load_type)
    })
    return Array.from(set).sort()
  }, [items])

  const chargedOptions = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => {
      if (i.charged_load_type) set.add(i.charged_load_type)
    })
    return Array.from(set).sort()
  }, [items])

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterCharging !== 'ALL' && item.charging_load_type !== filterCharging) {
        return false
      }
      if (filterCharged !== 'ALL' && item.charged_load_type !== filterCharged) {
        return false
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const text =
          `${item.charging_load_type} ${item.charged_load_type} ${item.blocks_arrangement || ''} ${item.notes || ''}`.toLowerCase()
        if (!text.includes(term)) return false
      }
      return true
    })
  }, [items, filterCharging, filterCharged, searchTerm])

  const handleOpenAdd = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: LineChargeSeparation) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleOpenDelete = (item: LineChargeSeparation) => {
    setItemToDelete(item)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      const ok = await furnaceChargingService.deleteChargeSeparation(itemToDelete.id, centerCode)
      if (ok) {
        toast({
          title: 'Regra excluída com sucesso',
          description: `A regra de separação "${itemToDelete.charging_load_type} → ${itemToDelete.charged_load_type}" foi removida.`,
        })
        await loadData()
      } else {
        toast({
          title: 'Erro ao excluir',
          description: 'Não foi possível excluir a regra de separação.',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Falha durante o processo de exclusão.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
      setItemToDelete(null)
    }
  }

  const handleModalSuccess = () => {
    toast({
      title: editingItem ? 'Regra atualizada com sucesso' : 'Regra cadastrada com sucesso',
      description: `A regra de separação de carga foi salva para o centro ${centerCode}.`,
    })
    loadData()
  }

  const handleResetFilters = () => {
    setFilterCharging('ALL')
    setFilterCharged('ALL')
    setSearchTerm('')
  }

  // Helper para renderizar a faixa mín – máx de medidas formatadas
  const renderRange = (min?: number | null, max?: number | null, decimals = 2) => {
    const hasMin = min != null && !isNaN(min)
    const hasMax = max != null && !isNaN(max)
    if (!hasMin && !hasMax) return <span className="text-slate-400">—</span>

    const fmtMin = hasMin
      ? formatNumberPtBr(min!, {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        })
      : null
    const fmtMax = hasMax
      ? formatNumberPtBr(max!, {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals,
        })
      : null

    if (hasMin && hasMax) {
      if (min === max) {
        return <span className="font-mono text-slate-800">{fmtMin}</span>
      }
      return (
        <span className="font-mono text-slate-800 whitespace-nowrap">
          {fmtMin} – {fmtMax}
        </span>
      )
    }

    if (hasMin) {
      return <span className="font-mono text-slate-800 whitespace-nowrap">≥ {fmtMin}</span>
    }

    return <span className="font-mono text-slate-800 whitespace-nowrap">≤ {fmtMax}</span>
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#002F6C] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5 text-[#002F6C]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Separação de Carga</h3>
              <Badge
                variant="outline"
                className="text-xs bg-blue-50/50 text-[#002F6C] border-blue-200"
              >
                Centro: {centerCode || 'Não selecionado'}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {items.length} {items.length === 1 ? 'regra linear' : 'regras lineares'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabela linear independente: cada combinação entre nova carga e carga enfornada define
              blocos e disposição
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenAdd}
          disabled={!centerCode}
          className="bg-[#002F6C] hover:bg-[#002555] text-white gap-2 font-medium shrink-0"
        >
          <Plus className="w-4 h-4" />+ Adicionar regra de separação
        </Button>
      </div>

      {/* Barra de Filtros Lineares */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
          <Filter className="w-4 h-4 text-[#002F6C]" />
          <span>Filtros:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
          {/* Filtro por Carga que irá enfornar */}
          <Select value={filterCharging} onValueChange={setFilterCharging}>
            <SelectTrigger className="h-9 text-xs border-slate-300">
              <SelectValue placeholder="Carga que irá enfornar: Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Todas as cargas que irão enfornar
              </SelectItem>
              {chargingOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Carga enfornada */}
          <Select value={filterCharged} onValueChange={setFilterCharged}>
            <SelectTrigger className="h-9 text-xs border-slate-300">
              <SelectValue placeholder="Carga enfornada: Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Todas as cargas enfornadas
              </SelectItem>
              {chargedOptions.map((opt) => (
                <SelectItem key={opt} value={opt} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Busca textual */}
          <Input
            placeholder="Buscar por disposição ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 text-xs border-slate-300"
          />
        </div>

        {(filterCharging !== 'ALL' || filterCharged !== 'ALL' || searchTerm.trim()) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs text-slate-600 hover:text-slate-900 gap-1.5 h-9"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="ml-auto text-xs border-red-300 text-red-700 hover:bg-red-100"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Conteúdo / Tabela Linear */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#002F6C]" />
            <p className="text-sm">
              Carregando regras de separação de carga do centro {centerCode}...
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
            <Layers className="w-10 h-10 text-slate-300 stroke-[1.5]" />
            <div className="max-w-md">
              <p className="text-sm font-semibold text-slate-700">
                Nenhuma regra de separação de carga cadastrada para este centro.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Clique no botão "+ Adicionar regra de separação" acima para registrar cada
                combinação linear de transição de carga e quantidade de blocos.
              </p>
            </div>
            <Button
              onClick={handleOpenAdd}
              disabled={!centerCode}
              variant="outline"
              size="sm"
              className="mt-2 text-xs border-[#002F6C] text-[#002F6C] hover:bg-blue-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Adicionar primeira regra
            </Button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhuma regra corresponde aos filtros selecionados.{' '}
            <button
              onClick={handleResetFilters}
              className="text-[#002F6C] underline font-medium ml-1"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-200">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 min-w-[200px]">
                    Carga que irá enfornar
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 min-w-[200px]">
                    Carga enfornada
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 w-[140px]">
                    Nº blocos
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 min-w-[150px]">
                    Disposição
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 min-w-[110px]">
                    Peso (t)
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 min-w-[120px]">
                    Espessura (mm)
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 min-w-[130px]">
                    Comprimento (mm)
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 min-w-[120px]">
                    Largura (mm)
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-700 min-w-[180px]">
                    Observação
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center text-slate-700 w-[110px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((row) => (
                  <TableRow key={row.id} className="hover:bg-slate-50/70 text-xs">
                    <TableCell className="font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        <span>{row.charging_load_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-800 font-medium">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{row.charged_load_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      <span
                        className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          row.separator_blocks_qty > 0
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {row.separator_blocks_qty}{' '}
                        {row.separator_blocks_qty === 1 ? 'bloco' : 'blocos'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {row.blocks_arrangement ? (
                        <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {row.blocks_arrangement}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderRange(row.min_weight_t, row.max_weight_t, 3)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderRange(row.min_thickness_mm, row.max_thickness_mm, 2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderRange(row.min_length_mm, row.max_length_mm, 2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {renderRange(row.min_width_mm, row.max_width_mm, 2)}
                    </TableCell>
                    <TableCell className="text-slate-600 max-w-[220px] truncate" title={row.notes}>
                      {row.notes || <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(row)}
                          title="Editar regra"
                          className="h-7 w-7 text-slate-600 hover:text-[#002F6C] hover:bg-blue-50"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(row)}
                          title="Excluir regra"
                          className="h-7 w-7 text-slate-600 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal de inclusão / edição */}
      <ChargeSeparationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        centerCode={centerCode}
        lineId={lineId}
        lineMasterId={lineMasterId}
        initialData={editingItem}
        onSuccess={handleModalSuccess}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Confirmar exclusão?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Tem certeza de que deseja excluir a regra de separação{' '}
              <strong className="text-slate-900">
                "{itemToDelete?.charging_load_type} → {itemToDelete?.charged_load_type}"
              </strong>{' '}
              do Centro <strong className="text-slate-900">{centerCode}</strong>? Esta ação
              realizará a exclusão lógica com registro de auditoria no HUB.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Confirmar exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
export default ChargeSeparationSection
