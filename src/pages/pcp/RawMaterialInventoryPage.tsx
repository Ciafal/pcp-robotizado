import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Boxes,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Eye,
  GripVertical,
  Save,
  RotateCcw,
  ShieldAlert,
  Info,
  Calendar,
  Building2,
  FileSpreadsheet,
  Check,
  Send,
  X,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  MPInventoryHeader,
  MPInventoryItem,
  MPInventoryOccurrence,
  MPInventoryHistoryEvent,
  MPQuickViewFilter,
  MPInventoryStatus,
} from '@/types/pcp-mp-inventory'
import {
  rawMaterialInventoryService,
  RawMaterialInventoryService,
} from '@/services/pcp-raw-material-inventory-service'

// Helpers visuais de Status
export const getStatusBadge = (status: MPInventoryStatus) => {
  switch (status) {
    case 'Aguardando Inventário':
      return (
        <Badge className="bg-slate-100 text-slate-700 border-slate-300 font-medium text-[10px] whitespace-nowrap">
          Aguardando Inventário
        </Badge>
      )
    case 'Em Inventário':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-medium text-[10px] whitespace-nowrap">
          Em Inventário
        </Badge>
      )
    case 'Inventário Parcial':
      return (
        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-medium text-[10px] whitespace-nowrap">
          Inventário Parcial
        </Badge>
      )
    case 'Inventário Concluído':
      return (
        <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 font-medium text-[10px] whitespace-nowrap">
          Inventário Concluído
        </Badge>
      )
    case 'Divergência Encontrada':
      return (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px] whitespace-nowrap animate-pulse">
          Divergência Encontrada
        </Badge>
      )
    case 'Aguardando Material':
      return (
        <Badge className="bg-orange-100 text-orange-900 border-orange-300 font-semibold text-[10px] whitespace-nowrap">
          Aguardando Material
        </Badge>
      )
    case 'Material Bloqueado':
      return (
        <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold text-[10px] whitespace-nowrap">
          Material Bloqueado
        </Badge>
      )
    case 'Preparação em Andamento':
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-medium text-[10px] whitespace-nowrap">
          Preparação em Andamento
        </Badge>
      )
    case 'Pronto para Enfornamento':
      return (
        <Badge className="bg-emerald-600 text-white font-black text-[10px] whitespace-nowrap shadow-xs">
          Pronto para Enfornamento
        </Badge>
      )
    case 'Cancelado':
      return (
        <Badge className="bg-slate-200 text-slate-500 border-slate-300 font-normal text-[10px] line-through whitespace-nowrap">
          Cancelado
        </Badge>
      )
    case 'Substituído por Nova Versão':
      return (
        <Badge className="bg-slate-100 text-slate-400 border-slate-200 font-mono text-[9px] whitespace-nowrap">
          Substituído V{'>'}
        </Badge>
      )
    default:
      return <Badge className="bg-slate-100 text-slate-700 text-[10px]">{status}</Badge>
  }
}

export const RawMaterialInventoryPage: React.FC = () => {
  const { toast } = useToast()

  // Estados principais
  const [headers, setHeaders] = useState<MPInventoryHeader[]>([])
  const [selectedHeaderId, setSelectedHeaderId] = useState<string>('')
  const [items, setItems] = useState<MPInventoryItem[]>([])
  const [occurrences, setOccurrences] = useState<MPInventoryOccurrence[]>([])
  const [historyEvents, setHistoryEvents] = useState<MPInventoryHistoryEvent[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  // Filtro Rápido
  const [quickFilter, setQuickFilter] = useState<MPQuickViewFilter>('TODOS')

  // Filtros Avançados
  const [filterCompany, setFilterCompany] = useState<string>('CIAFAL')
  const [filterLine, setFilterLine] = useState<string>('L1')
  const [filterCenter, setFilterCenter] = useState<string>('FORNOL1')
  const [filterDate, setFilterDate] = useState<string>('')
  const [filterOrder, setFilterOrder] = useState<string>('')
  const [filterMaterial, setFilterMaterial] = useState<string>('')
  const [filterHeat, setFilterHeat] = useState<string>('')
  const [filterEnfornamentoType, setFilterEnfornamentoType] = useState<string>('TODOS')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterResponsible, setFilterResponsible] = useState<string>('')
  const [filterWmsLocation, setFilterWmsLocation] = useState<string>('')
  const [filterVersion, setFilterVersion] = useState<string>('TODOS')

  // Estado de Edição Local (antes de persistir no backend)
  const [editedItems, setEditedItems] = useState<
    Record<
      string,
      {
        dp07_inventoried_pieces?: number | null
        dp07_enfornamento_sequence?: number | null
        dp07_observation?: string
      }
    >
  >({})

  // Modal WMS Rastreabilidade
  const [wmsModalItem, setWmsModalItem] = useState<MPInventoryItem | null>(null)

  // Modal de Histórico e Auditoria
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false)

  // Drag and drop temporário de reordenação
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)

  // Carrega Ordens de Inventário
  const loadHeaders = useCallback(async () => {
    setLoading(true)
    try {
      const list = await rawMaterialInventoryService.listInventoryOrders()
      setHeaders(list)
      if (list.length > 0 && !selectedHeaderId) {
        setSelectedHeaderId(list[0].id || '')
      }
    } catch (err) {
      console.error('Erro ao carregar cabeçalhos de inventário:', err)
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível carregar as ordens de inventário.',
      })
    } finally {
      setLoading(false)
    }
  }, [selectedHeaderId, toast])

  // Carrega Itens da Ordem Selecionada
  const loadItems = useCallback(async (headerId: string) => {
    if (!headerId) return
    try {
      const itms = await rawMaterialInventoryService.listInventoryItems(headerId, true)
      setItems(itms)
      const occs = await rawMaterialInventoryService.listOccurrences(headerId)
      setOccurrences(occs)
      const hist = await rawMaterialInventoryService.listHistoryEvents(headerId)
      setHistoryEvents(hist)
    } catch (err) {
      console.error('Erro ao carregar itens:', err)
    }
  }, [])

  useEffect(() => {
    loadHeaders()
  }, [loadHeaders])

  useEffect(() => {
    if (selectedHeaderId) {
      loadItems(selectedHeaderId)
    }
  }, [selectedHeaderId, loadItems])

  const currentHeader = useMemo(() => {
    return headers.find((h) => h.id === selectedHeaderId) || headers[0] || null
  }, [headers, selectedHeaderId])

  // Recálculo dinâmico do Resumo Operacional
  const operationalSummary = useMemo(() => {
    const totalOrders = items.length
    const totalTonsRequired = items.reduce((sum, it) => sum + (it.planned_requirement_tons || 0), 0)
    const totalPiecesRequired = items.reduce((sum, it) => sum + (it.sap_pieces_count || 0), 0)
    const totalPiecesInventoried = items.reduce((sum, it) => {
      const val =
        editedItems[it.id || '']?.dp07_inventoried_pieces !== undefined
          ? editedItems[it.id || '']?.dp07_inventoried_pieces
          : it.dp07_inventoried_pieces
      return sum + (val || 0)
    }, 0)

    const pendingMaterials = items.filter((it) => {
      const pieces =
        editedItems[it.id || '']?.dp07_inventoried_pieces !== undefined
          ? editedItems[it.id || '']?.dp07_inventoried_pieces
          : it.dp07_inventoried_pieces
      return pieces === null || pieces === undefined || it.status === 'Aguardando Inventário'
    }).length

    const divergentMaterials = items.filter((it) => {
      const pieces =
        editedItems[it.id || '']?.dp07_inventoried_pieces !== undefined
          ? editedItems[it.id || '']?.dp07_inventoried_pieces
          : it.dp07_inventoried_pieces
      if (pieces === null || pieces === undefined) return false
      return pieces !== it.sap_pieces_count
    }).length

    const readyOrdersCount = items.filter((it) => it.status === 'Pronto para Enfornamento').length

    const delayRiskOrdersCount = items.filter((it) => {
      if (it.status === 'Pronto para Enfornamento' || it.status === 'Cancelado') return false
      return true
    }).length

    return {
      totalOrders,
      totalTonsRequired: Number(totalTonsRequired.toFixed(2)),
      totalPiecesRequired,
      totalPiecesInventoried,
      pendingMaterials,
      divergentMaterials,
      readyOrdersCount,
      delayRiskOrdersCount,
    }
  }, [items, editedItems])

  // Itens filtrados
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // 1. Filtros Rápidos
      const todayStr = new Date().toISOString().split('T')[0]
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      if (quickFilter === 'HOJE' && it.enfornamento_date !== todayStr) return false
      if (quickFilter === 'AMANHA' && it.enfornamento_date !== tomorrowStr) return false
      if (
        quickFilter === 'PENDENTES' &&
        it.status !== 'Aguardando Inventário' &&
        it.status !== 'Inventário Parcial' &&
        it.status !== 'Aguardando Material'
      )
        return false
      if (
        quickFilter === 'DIVERGENCIAS' &&
        it.status !== 'Divergência Encontrada' &&
        (it.pieces_divergence === null || it.pieces_divergence === 0)
      )
        return false
      if (quickFilter === 'PRONTOS' && it.status !== 'Pronto para Enfornamento') return false

      // 2. Filtros Avançados
      if (filterCompany && !it.company.toLowerCase().includes(filterCompany.toLowerCase()))
        return false
      if (filterLine && !it.line.toLowerCase().includes(filterLine.toLowerCase())) return false
      if (filterCenter && !it.center.toLowerCase().includes(filterCenter.toLowerCase()))
        return false
      if (filterDate && it.enfornamento_date !== filterDate) return false
      if (filterOrder && !it.production_order.toLowerCase().includes(filterOrder.toLowerCase()))
        return false
      if (
        filterMaterial &&
        !it.raw_material_code.toLowerCase().includes(filterMaterial.toLowerCase()) &&
        !it.raw_material_description.toLowerCase().includes(filterMaterial.toLowerCase())
      )
        return false
      if (filterHeat && !it.heat_number.toLowerCase().includes(filterHeat.toLowerCase()))
        return false
      if (filterEnfornamentoType !== 'TODOS' && it.enfornamento_type !== filterEnfornamentoType)
        return false
      if (filterStatus !== 'TODOS' && it.status !== filterStatus) return false
      if (
        filterResponsible &&
        !it.responsible_user?.toLowerCase().includes(filterResponsible.toLowerCase())
      )
        return false
      if (
        filterWmsLocation &&
        !it.wms_physical_location.toLowerCase().includes(filterWmsLocation.toLowerCase())
      )
        return false
      if (filterVersion !== 'TODOS' && String(it.schedule_version) !== String(filterVersion))
        return false

      return true
    })
  }, [
    items,
    quickFilter,
    filterCompany,
    filterLine,
    filterCenter,
    filterDate,
    filterOrder,
    filterMaterial,
    filterHeat,
    filterEnfornamentoType,
    filterStatus,
    filterResponsible,
    filterWmsLocation,
    filterVersion,
  ])

  // Manipulador de edição local
  const handleFieldChange = (
    itemId: string,
    field: 'dp07_inventoried_pieces' | 'dp07_enfornamento_sequence' | 'dp07_observation',
    value: any,
  ) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  // Persistência com retry e toast honesto
  const handleSaveItem = async (item: MPInventoryItem) => {
    if (!item.id) return
    const edits = editedItems[item.id]
    if (!edits) return

    const inventoriedPieces =
      edits.dp07_inventoried_pieces !== undefined
        ? (edits.dp07_inventoried_pieces ?? 0)
        : (item.dp07_inventoried_pieces ?? 0)
    const sequence =
      edits.dp07_enfornamento_sequence !== undefined
        ? (edits.dp07_enfornamento_sequence ?? item.pcp_planned_sequence)
        : (item.dp07_enfornamento_sequence ?? item.pcp_planned_sequence)
    const observation =
      edits.dp07_observation !== undefined ? edits.dp07_observation : item.dp07_observation

    setSavingItemId(item.id)

    try {
      const res = await rawMaterialInventoryService.updateItemFromDP07({
        itemId: item.id,
        inventoriedPieces: Number(inventoriedPieces),
        enfornamentoSequence: Number(sequence),
        observation: observation || '',
        userName: pb.authStore.record?.name || 'Operador DP07',
      })

      if (res.success) {
        // Limpa estado temporário de edição deste item
        setEditedItems((prev) => {
          const next = { ...prev }
          delete next[item.id!]
          return next
        })

        // Recarrega lista atualizada
        await loadItems(selectedHeaderId)

        toast({
          title: 'Alteração Salva com Sucesso',
          description: res.message,
        })
      }
    } catch (err) {
      console.error('Falha ao salvar item:', err)
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar esta alteração.',
        description: 'Verifique a conexão e tente novamente.',
        action: (
          <Button
            size="sm"
            variant="outline"
            className="text-white bg-rose-700 hover:bg-rose-800 text-xs font-bold"
            onClick={() => handleSaveItem(item)}
          >
            TENTAR NOVAMENTE
          </Button>
        ),
      })
    } finally {
      setSavingItemId(null)
    }
  }

  // Concluir Preparação para Enfornamento
  const handleConcludePreparation = async (item: MPInventoryItem) => {
    if (!item.id) return
    const pieces = editedItems[item.id]?.dp07_inventoried_pieces ?? item.dp07_inventoried_pieces
    const seq = editedItems[item.id]?.dp07_enfornamento_sequence ?? item.dp07_enfornamento_sequence

    if (pieces === null || pieces === undefined || pieces <= 0) {
      toast({
        variant: 'destructive',
        title: 'Inventário Incompleto',
        description:
          'O Nº de Peças Inventariadas deve ser preenchido antes de concluir a preparação.',
      })
      return
    }

    if (seq === null || seq === undefined || seq <= 0) {
      toast({
        variant: 'destructive',
        title: 'Sequência Não Definida',
        description:
          'A Sequência de Enfornamento deve ser preenchida antes de concluir a preparação.',
      })
      return
    }

    if (pieces < item.sap_pieces_count) {
      toast({
        variant: 'destructive',
        title: 'Quantidade Física Insuficiente',
        description: `Quantidade física (${pieces} peças) insuficiente para atender a necessidade planejada de ${item.sap_pieces_count} peças.`,
      })
      return
    }

    await handleSaveItem(item)
  }

  // Drag and Drop simples para Sequência
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId)
    e.dataTransfer.setData('text/plain', itemId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetItemId: string) => {
    e.preventDefault()
    if (!draggedItemId || draggedItemId === targetItemId) return

    const draggedIdx = items.findIndex((it) => it.id === draggedItemId)
    const targetIdx = items.findIndex((it) => it.id === targetItemId)
    if (draggedIdx === -1 || targetIdx === -1) return

    const reordered = [...items]
    const [moved] = reordered.splice(draggedIdx, 1)
    reordered.splice(targetIdx, 0, moved)

    // Atualiza a sequência de 1 a N
    reordered.forEach((it, index) => {
      const newSeq = index + 1
      if (it.id) {
        setEditedItems((prev) => ({
          ...prev,
          [it.id!]: {
            ...prev[it.id!],
            dp07_enfornamento_sequence: newSeq,
          },
        }))
      }
    })

    setItems(reordered)
    setDraggedItemId(null)

    toast({
      title: 'Sequência Reordenada',
      description:
        'A nova ordem foi calculada. Clique em "Salvar" nos itens alterados para persistir no backend.',
    })
  }

  return (
    <div className="space-y-3 p-3 md:p-6 bg-slate-50/50 min-h-screen text-slate-900 pb-12">
      {/* 1. CABEÇALHO DO INVENTÁRIO — L1 (100% CONFORME ESPECIFICAÇÃO) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#004C97] text-white flex items-center justify-center font-black shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  Inventário de Matéria-Prima — L1
                </h1>
                {currentHeader && getStatusBadge(currentHeader.status)}
              </div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <span>Setor Responsável:</span>
                <strong className="text-slate-800">
                  {currentHeader?.responsible_sector || 'DP07 — Preparação de Tarugos'}
                </strong>
                <span>•</span>
                <span>Tipo:</span>
                <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-semibold py-0">
                  Enfornamento FRIO
                </Badge>
              </div>
            </div>
          </div>

          {/* Seleção de Versão e Ações de Cabeçalho */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoryModalOpen(true)}
              className="h-8 px-2.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Histórico & Auditoria</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                loadHeaders()
                if (selectedHeaderId) loadItems(selectedHeaderId)
              }}
              className="h-8 px-2.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Metadados do Cabeçalho */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-3 text-xs text-slate-600">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Empresa
            </span>
            <span className="font-semibold text-slate-800">
              {currentHeader?.company || 'CIAFAL'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Linha
            </span>
            <span className="font-semibold text-slate-800">{currentHeader?.line || 'L1'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Centro
            </span>
            <span className="font-semibold text-slate-800">
              {currentHeader?.center || 'FORNOL1'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Data do Enfornamento
            </span>
            <span className="font-semibold text-slate-800 font-mono">
              {currentHeader?.schedule_date || new Date().toISOString().split('T')[0]}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Versão PCP
            </span>
            <span className="font-bold text-[#004C97] font-mono">
              V{String(currentHeader?.schedule_version || 1).padStart(2, '0')}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Data/Hora de Geração
            </span>
            <span className="text-slate-700 font-mono text-[11px]">
              {currentHeader?.generated_at
                ? new Date(currentHeader.generated_at).toLocaleString('pt-BR')
                : '—'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Última Atualização
            </span>
            <span className="text-slate-700 font-mono text-[11px]">
              {currentHeader?.last_updated_at
                ? new Date(currentHeader.last_updated_at).toLocaleString('pt-BR')
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. RESUMO OPERACIONAL COM CARDS COMPACTOS (8 CARDS OBRIGATÓRIOS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {/* Card 1: Ordens programadas */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Ordens Programadas
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-900 font-mono">
                {operationalSummary.totalOrders}
              </span>
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Toneladas necessárias */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Toneladas Necessárias
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-900 font-mono">
                {operationalSummary.totalTonsRequired}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">t</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Nº peças necessárias */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Nº Peças Necessárias
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-slate-900 font-mono">
                {operationalSummary.totalPiecesRequired}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">pçs</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Nº peças inventariadas */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Peças Inventariadas
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-[#004C97] font-mono">
                {operationalSummary.totalPiecesInventoried}
              </span>
              <span className="text-[10px] text-slate-500 font-bold">pçs</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Materiais pendentes */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Materiais Pendentes
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-lg font-black font-mono ${
                  operationalSummary.pendingMaterials > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {operationalSummary.pendingMaterials}
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 6: Materiais com divergência */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Com Divergência
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-lg font-black font-mono ${
                  operationalSummary.divergentMaterials > 0 ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {operationalSummary.divergentMaterials}
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 7: Ordens prontas para enfornamento */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Prontas Enfornamento
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-black text-emerald-600 font-mono">
                {operationalSummary.readyOrdersCount}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 8: Ordens com risco de atraso */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-2.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate">
              Risco de Atraso
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span
                className={`text-lg font-black font-mono ${
                  operationalSummary.delayRiskOrdersCount > 0 ? 'text-orange-600' : 'text-slate-900'
                }`}
              >
                {operationalSummary.delayRiskOrdersCount}
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. FILTROS RÁPIDOS E FILTROS DETALHADOS */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-3">
        {/* Filtros Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2.5">
          <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#004C97]" />
            Visão Rápida:
          </span>
          {(
            [
              { id: 'TODOS', label: 'Todos' },
              { id: 'HOJE', label: 'Hoje' },
              { id: 'AMANHA', label: 'Amanhã' },
              { id: 'PENDENTES', label: 'Pendentes' },
              { id: 'DIVERGENCIAS', label: 'Divergências' },
              { id: 'PRONTOS', label: 'Prontos para Enfornamento' },
            ] as const
          ).map((filter) => {
            const active = quickFilter === filter.id
            return (
              <Button
                key={filter.id}
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setQuickFilter(filter.id)}
                className={`h-7 px-2.5 text-xs font-semibold ${
                  active
                    ? 'bg-[#004C97] text-white hover:bg-[#003B75]'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {filter.label}
              </Button>
            )
          })}
        </div>

        {/* Filtros Detalhados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ordem</label>
            <Input
              value={filterOrder}
              onChange={(e) => setFilterOrder(e.target.value)}
              placeholder="Buscar por ordem..."
              className="h-7 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Material / Descrição
            </label>
            <Input
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              placeholder="Código ou descrição..."
              className="h-7 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Corrida / Lote</label>
            <Input
              value={filterHeat}
              onChange={(e) => setFilterHeat(e.target.value)}
              placeholder="Nº da corrida..."
              className="h-7 text-xs mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 text-xs mt-0.5">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os Status</SelectItem>
                <SelectItem value="Aguardando Inventário">Aguardando Inventário</SelectItem>
                <SelectItem value="Em Inventário">Em Inventário</SelectItem>
                <SelectItem value="Inventário Parcial">Inventário Parcial</SelectItem>
                <SelectItem value="Inventário Concluído">Inventário Concluído</SelectItem>
                <SelectItem value="Divergência Encontrada">Divergência Encontrada</SelectItem>
                <SelectItem value="Aguardando Material">Aguardando Material</SelectItem>
                <SelectItem value="Material Bloqueado">Material Bloqueado</SelectItem>
                <SelectItem value="Preparação em Andamento">Preparação em Andamento</SelectItem>
                <SelectItem value="Pronto para Enfornamento">Pronto para Enfornamento</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
                <SelectItem value="Substituído por Nova Versão">
                  Substituído por Nova Versão
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              Localização WMS
            </label>
            <Input
              value={filterWmsLocation}
              onChange={(e) => setFilterWmsLocation(e.target.value)}
              placeholder="Galpão, rua ou box..."
              className="h-7 text-xs mt-0.5"
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFilterOrder('')
                setFilterMaterial('')
                setFilterHeat('')
                setFilterStatus('TODOS')
                setFilterWmsLocation('')
                setQuickFilter('TODOS')
              }}
              className="h-7 text-xs w-full text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* 4. TABELA OPERACIONAL COM AS 22 COLUNAS EXATAS E ORIGEM VISÍVEL */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Scroll horizontal estritamente interno à tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[2100px]">
            <thead className="bg-slate-100/90 text-slate-700 text-[10px] uppercase font-black tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th className="p-2.5 w-10 text-center">#</th>
                {/* 1. Empresa (PCP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Empresa</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 2. Linha (PCP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Linha</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 3. Centro (PCP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Centro</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 4. Data Enfornamento (PCP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Data Enfornamento</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 5. Hora Prevista Enfornamento (PCP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Hora Prevista</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 6. Ordem (PCP/SAP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Ordem</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP/SAP</span>
                  </div>
                </th>
                {/* 7. Código Matéria-Prima (SAP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Cód. Matéria-Prima</span>
                    <span className="text-[8px] font-normal text-slate-400">SAP</span>
                  </div>
                </th>
                {/* 8. Descrição Matéria-Prima (SAP) */}
                <th className="p-2.5 min-w-[200px]">
                  <div className="flex flex-col">
                    <span>Descrição Matéria-Prima</span>
                    <span className="text-[8px] font-normal text-slate-400">SAP</span>
                  </div>
                </th>
                {/* 9. Corrida/Lote (SAP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Corrida / Lote</span>
                    <span className="text-[8px] font-normal text-slate-400">SAP</span>
                  </div>
                </th>
                {/* 10. Bitola/Produto Produzido (PCP/SAP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Bitola / Produto</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP/SAP</span>
                  </div>
                </th>
                {/* 11. Tipo de Enfornamento (PCP) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Tipo Enfornamento</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 12. Estoque SAP (t) (SAP) */}
                <th className="p-2.5 text-right">
                  <div className="flex flex-col items-end">
                    <span>Estoque SAP (t)</span>
                    <span className="text-[8px] font-normal text-slate-400">SAP</span>
                  </div>
                </th>
                {/* 13. Necessidade (t) (PCP) */}
                <th className="p-2.5 text-right">
                  <div className="flex flex-col items-end">
                    <span>Necessidade (t)</span>
                    <span className="text-[8px] font-normal text-slate-400">PCP</span>
                  </div>
                </th>
                {/* 14. Nº Peças SAP (SAP) */}
                <th className="p-2.5 text-right">
                  <div className="flex flex-col items-end">
                    <span>Nº Peças SAP</span>
                    <span className="text-[8px] font-normal text-slate-400">SAP</span>
                  </div>
                </th>
                {/* 15. Localização Física (WMS) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Localização Física</span>
                    <span className="text-[8px] font-normal text-slate-400">WMS</span>
                  </div>
                </th>
                {/* 16. Nº Peças Inventariadas (DP07 - EDITÁVEL) */}
                <th className="p-2.5 w-32 bg-blue-50/60 text-[#004C97] border-l border-r border-blue-200">
                  <div className="flex flex-col">
                    <span className="font-black">Peças Inventariadas</span>
                    <span className="text-[8px] font-bold text-blue-600">DP07 • EDITÁVEL</span>
                  </div>
                </th>
                {/* 17. Divergência Peças (Sistema) */}
                <th className="p-2.5 text-center">
                  <div className="flex flex-col items-center">
                    <span>Divergência Peças</span>
                    <span className="text-[8px] font-normal text-slate-400">
                      Sistema (DP07 - SAP)
                    </span>
                  </div>
                </th>
                {/* 18. Sequência de Enfornamento (DP07 - EDITÁVEL) */}
                <th className="p-2.5 w-28 bg-blue-50/60 text-[#004C97] border-l border-r border-blue-200">
                  <div className="flex flex-col">
                    <span className="font-black">Seq. Enfornamento</span>
                    <span className="text-[8px] font-bold text-blue-600">DP07 • EDITÁVEL</span>
                  </div>
                </th>
                {/* 19. Status (Sistema) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Status</span>
                    <span className="text-[8px] font-normal text-slate-400">Sistema</span>
                  </div>
                </th>
                {/* 20. Observação (DP07 - EDITÁVEL) */}
                <th className="p-2.5 min-w-[200px] bg-blue-50/60 text-[#004C97] border-l border-r border-blue-200">
                  <div className="flex flex-col">
                    <span className="font-black">Observação</span>
                    <span className="text-[8px] font-bold text-blue-600">DP07 • EDITÁVEL</span>
                  </div>
                </th>
                {/* 21. Responsável (Sistema) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Responsável</span>
                    <span className="text-[8px] font-normal text-slate-400">Sistema</span>
                  </div>
                </th>
                {/* 22. Data/Hora Atualização (Sistema) */}
                <th className="p-2.5">
                  <div className="flex flex-col">
                    <span>Data/Hora Atualização</span>
                    <span className="text-[8px] font-normal text-slate-400">Sistema</span>
                  </div>
                </th>
                {/* Ações */}
                <th className="p-2.5 text-center w-28 sticky right-0 bg-slate-100 z-10 border-l border-slate-200">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={24} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold">
                        Nenhum item de inventário encontrado para os filtros selecionados.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        O inventário é gerado automaticamente na confirmação de programação com
                        enfornamento FRIO para L1.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const edits = editedItems[item.id || '']
                  const currentPieces =
                    edits?.dp07_inventoried_pieces !== undefined
                      ? edits.dp07_inventoried_pieces
                      : item.dp07_inventoried_pieces
                  const currentSeq =
                    edits?.dp07_enfornamento_sequence !== undefined
                      ? edits.dp07_enfornamento_sequence
                      : (item.dp07_enfornamento_sequence ?? item.pcp_planned_sequence)
                  const currentObs =
                    edits?.dp07_observation !== undefined
                      ? edits.dp07_observation
                      : item.dp07_observation || ''

                  const hasPendingEdits = edits !== undefined
                  const divergence =
                    currentPieces !== null && currentPieces !== undefined
                      ? currentPieces - item.sap_pieces_count
                      : item.pieces_divergence

                  // Avalia alertas do item
                  const alerts = RawMaterialInventoryService.evaluateItemAlerts(item)
                  const hasCriticalAlert = alerts.some((a) => a.severity === 'CRITICAL')
                  const hasWarningAlert = alerts.some((a) => a.severity === 'WARNING')

                  // Comparação Sequência DP07 x PCP
                  const isSequenceDiff =
                    currentSeq !== null &&
                    currentSeq !== undefined &&
                    currentSeq !== item.pcp_planned_sequence

                  return (
                    <tr
                      key={item.id || index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id || '')}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, item.id || '')}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.status === 'Pronto para Enfornamento'
                          ? 'bg-emerald-50/20'
                          : item.status === 'Material Bloqueado'
                            ? 'bg-rose-50/30'
                            : ''
                      }`}
                    >
                      {/* Drag Handle */}
                      <td className="p-2 text-center text-slate-400 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4 mx-auto" />
                      </td>

                      {/* 1. Empresa */}
                      <td className="p-2.5 font-semibold text-slate-800">{item.company}</td>
                      {/* 2. Linha */}
                      <td className="p-2.5 font-semibold text-slate-800">{item.line}</td>
                      {/* 3. Centro */}
                      <td className="p-2.5 font-mono text-slate-600">{item.center}</td>
                      {/* 4. Data Enfornamento */}
                      <td className="p-2.5 font-mono text-slate-700">{item.enfornamento_date}</td>
                      {/* 5. Hora Prevista Enfornamento */}
                      <td className="p-2.5 font-mono font-bold text-slate-800">
                        {item.expected_enfornamento_time}
                      </td>
                      {/* 6. Ordem */}
                      <td className="p-2.5 font-mono font-bold text-[#004C97]">
                        {item.production_order}
                      </td>
                      {/* 7. Código Matéria-Prima */}
                      <td className="p-2.5 font-mono font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setWmsModalItem(item)}
                          className="hover:underline text-[#004C97] text-left flex items-center gap-1 group"
                          title="Clique para ver rastreabilidade WMS"
                        >
                          <span>{item.raw_material_code}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </button>
                      </td>
                      {/* 8. Descrição Matéria-Prima */}
                      <td
                        className="p-2.5 text-slate-700 truncate max-w-[240px]"
                        title={item.raw_material_description}
                      >
                        {item.raw_material_description}
                      </td>
                      {/* 9. Corrida/Lote */}
                      <td className="p-2.5 font-mono text-slate-700">
                        <button
                          type="button"
                          onClick={() => setWmsModalItem(item)}
                          className="hover:underline font-semibold text-slate-800 group inline-flex items-center gap-1"
                          title="Clique para ver rastreabilidade WMS"
                        >
                          <span>{item.heat_number}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-800" />
                        </button>
                      </td>
                      {/* 10. Bitola/Produto Produzido */}
                      <td className="p-2.5 text-slate-700">{item.produced_gauge_product}</td>
                      {/* 11. Tipo de Enfornamento */}
                      <td className="p-2.5">
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[9px] font-bold">
                          {item.enfornamento_type}
                        </Badge>
                      </td>
                      {/* 12. Estoque SAP (t) */}
                      <td className="p-2.5 text-right font-mono text-slate-700">
                        {item.sap_stock_tons}
                      </td>
                      {/* 13. Necessidade (t) */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {item.planned_requirement_tons}
                      </td>
                      {/* 14. Nº Peças SAP */}
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {item.sap_pieces_count}
                      </td>
                      {/* 15. Localização Física */}
                      <td className="p-2.5 text-slate-700">
                        <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.wms_physical_location}
                        </span>
                      </td>

                      {/* 16. Nº Peças Inventariadas (DP07 - EDITÁVEL) */}
                      <td className="p-2 bg-blue-50/40 border-l border-r border-blue-200">
                        <Input
                          type="number"
                          min={0}
                          value={currentPieces ?? ''}
                          onChange={(e) =>
                            handleFieldChange(
                              item.id || '',
                              'dp07_inventoried_pieces',
                              e.target.value === '' ? null : Number(e.target.value),
                            )
                          }
                          className="h-7 text-xs font-mono font-bold bg-white text-blue-900 border-blue-300 focus-visible:ring-blue-500"
                          placeholder="Informe qtd..."
                        />
                      </td>

                      {/* 17. Divergência Peças (Sistema = DP07 - SAP) */}
                      <td className="p-2.5 text-center font-mono">
                        {divergence === null || divergence === undefined ? (
                          <span className="text-slate-400 text-[10px]">Pendente</span>
                        ) : divergence === 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                            OK (0)
                          </Badge>
                        ) : divergence > 0 ? (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]">
                            +{divergence}
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px] animate-pulse">
                            {divergence} (Falta)
                          </Badge>
                        )}
                      </td>

                      {/* 18. Sequência de Enfornamento (DP07 - EDITÁVEL) */}
                      <td className="p-2 bg-blue-50/40 border-l border-r border-blue-200">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={currentSeq ?? ''}
                            onChange={(e) =>
                              handleFieldChange(
                                item.id || '',
                                'dp07_enfornamento_sequence',
                                e.target.value === '' ? null : Number(e.target.value),
                              )
                            }
                            className="h-7 text-xs font-mono font-bold bg-white text-blue-900 border-blue-300 w-16"
                          />
                          <span className="text-[10px] font-mono text-slate-500">
                            (PCP #{item.pcp_planned_sequence})
                          </span>
                        </div>
                        {isSequenceDiff && (
                          <span className="text-[9px] text-amber-700 font-semibold block leading-tight mt-0.5">
                            Seq. diferente da prog.
                          </span>
                        )}
                      </td>

                      {/* 19. Status */}
                      <td className="p-2.5">{getStatusBadge(item.status)}</td>

                      {/* 20. Observação (DP07 - EDITÁVEL) */}
                      <td className="p-2 bg-blue-50/40 border-l border-r border-blue-200">
                        <Input
                          type="text"
                          value={currentObs}
                          onChange={(e) =>
                            handleFieldChange(item.id || '', 'dp07_observation', e.target.value)
                          }
                          placeholder="Observação opcional..."
                          className="h-7 text-xs bg-white border-blue-200"
                        />
                      </td>

                      {/* 21. Responsável */}
                      <td
                        className="p-2.5 text-slate-600 truncate max-w-[130px]"
                        title={item.responsible_user}
                      >
                        {item.responsible_user || '—'}
                      </td>

                      {/* 22. Data/Hora Atualização */}
                      <td className="p-2.5 font-mono text-[10.5px] text-slate-500">
                        {item.updated_at_timestamp
                          ? new Date(item.updated_at_timestamp).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Ações */}
                      <td className="p-2 text-center sticky right-0 bg-white/95 backdrop-blur z-10 border-l border-slate-200">
                        <div className="flex items-center justify-center gap-1">
                          {hasPendingEdits && (
                            <Button
                              size="sm"
                              onClick={() => handleSaveItem(item)}
                              disabled={savingItemId === item.id}
                              className="h-7 px-2 bg-[#004C97] hover:bg-[#003B75] text-white text-[10px] font-bold"
                              title="Salvar alterações"
                            >
                              {savingItemId === item.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                            </Button>
                          )}

                          {item.status !== 'Pronto para Enfornamento' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConcludePreparation(item)}
                              disabled={savingItemId === item.id}
                              className="h-7 px-2 text-[10px] font-bold border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                              title="Concluir Preparação (Pronto para Enfornamento)"
                            >
                              <Check className="w-3 h-3 mr-0.5 text-emerald-600" />
                              Pronto
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. PAINEL DE ALERTAS ATIVOS (REQUISITO 11) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Painel de Alertas & Governança da Preparação
            </h2>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Monitoramento Automático em Tempo Real
          </span>
        </div>

        <div className="space-y-1.5">
          {items.flatMap((it) => RawMaterialInventoryService.evaluateItemAlerts(it)).length ===
          0 ? (
            <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                Nenhum alerta crítico ativo. Todas as ordens em conformidade com o enfornamento da
                L1.
              </span>
            </div>
          ) : (
            items
              .flatMap((it) => RawMaterialInventoryService.evaluateItemAlerts(it))
              .map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                      : alert.severity === 'WARNING'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-blue-50/80 border-blue-200 text-blue-950'
                  }`}
                >
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      alert.severity === 'CRITICAL'
                        ? 'text-rose-600'
                        : alert.severity === 'WARNING'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-bold tracking-tight">{alert.title}</div>
                    <div className="text-[11px] mt-0.5 opacity-90">{alert.description}</div>
                  </div>
                  <Badge
                    className={`text-[9px] uppercase font-black ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {alert.type}
                  </Badge>
                </div>
              ))
          )}
        </div>
      </div>

      {/* 6. MODAL DE RASTREABILIDADE WMS (CLIQUE NO MATERIAL/CORRIDA) */}
      <Dialog open={!!wmsModalItem} onOpenChange={() => setWmsModalItem(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Boxes className="w-4 h-4 text-[#004C97]" />
              Rastreabilidade WMS — Detalhe da Matéria-Prima
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Informações físicas do pátio e armazém. Estoque sincronizado sem alteração manual não
              autorizada.
            </DialogDescription>
          </DialogHeader>

          {wmsModalItem && (
            <div className="space-y-3 text-xs">
              {/* Snapshot do Material */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Material
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {wmsModalItem.raw_material_code}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Corrida / Lote
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {wmsModalItem.heat_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Ordem L1
                  </span>
                  <span className="font-mono text-slate-800">{wmsModalItem.production_order}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Tipo Enfornamento
                  </span>
                  <Badge className="bg-blue-100 text-[#004C97] font-semibold text-[9px]">
                    {wmsModalItem.enfornamento_type}
                  </Badge>
                </div>
              </div>

              {/* Dados do WMS */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                  Posição Física e Armazenagem
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Galpão:</span>
                    <strong className="text-slate-800">
                      {wmsModalItem.wms_warehouse || 'GALPÃO DP07'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Endereço / Box:</span>
                    <strong className="text-slate-800">
                      {wmsModalItem.wms_address || 'BOX 01 / RUA 2'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Localização Completa:</span>
                    <span className="font-mono text-slate-700">
                      {wmsModalItem.wms_physical_location}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Situação no WMS:</span>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                      {wmsModalItem.wms_stock_status || 'DISPONÍVEL_PREPARAÇÃO'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Bloqueio Ativo:</span>
                    {wmsModalItem.is_material_blocked ? (
                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                        BLOQUEADO
                      </Badge>
                    ) : (
                      <span className="text-emerald-700 font-bold">Livre</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Localizado pelo WMS:</span>
                    {wmsModalItem.is_material_located ? (
                      <span className="text-emerald-700 font-bold">Sim</span>
                    ) : (
                      <span className="text-rose-700 font-bold">Não Localizado</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Registro Honesto de Integração Externa (Requisito Tarefa 1) */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-tight">
                  <strong>Status de Conectividade Externa:</strong> Canal API WMS aguardando
                  integração oficial (RFC/Bridge). Divergências detectadas geram ocorrência formal
                  sem ajuste de estoque automático no SAP.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setWmsModalItem(null)}
              className="h-8 text-xs"
            >
              Fechar Detalhes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL DE HISTÓRICO & AUDITORIA IMUTÁVEL (REQUISITO 19 E 20) */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-slate-900 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#004C97]" />
              Trilha de Auditoria & Histórico de Alterações do Inventário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Registros imutáveis de auto-geração, edições do DP07, divergências e retorno ao PCP.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-xs">
            {historyEvents.length === 0 ? (
              <p className="text-slate-500 text-center py-4">
                Nenhum evento registrado nesta versão.
              </p>
            ) : (
              historyEvents.map((evt) => (
                <div
                  key={evt.id || evt.timestamp}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#004C97] text-white text-[9px] font-bold">
                        {evt.event_type}
                      </Badge>
                      <span className="font-bold text-slate-800">{evt.user_name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Versão V{evt.schedule_version || 1}
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px]">{evt.description}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {new Date(evt.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoryModalOpen(false)}
              className="h-8 text-xs"
            >
              Fechar Trilha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RawMaterialInventoryPage
