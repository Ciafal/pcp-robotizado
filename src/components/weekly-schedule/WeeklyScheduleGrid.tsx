import React, { useState, useMemo } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  GripVertical,
  Layers,
  MoreVertical,
  Plus,
  Trash2,
  Wrench,
  AlertCircle,
  HelpCircle,
  AlertTriangle,
  FileText,
  Filter,
  CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import { LineOverviewData } from '@/types/line-master'
import { WeeklyScheduleEngine } from '@/services/weekly-schedule-engine'

export type ScheduleGridFilter =
  | 'ALL'
  | 'AGUARDANDO_OBSERVACOES'
  | 'ALERTAS'
  | 'BLOQUEADOS'
  | 'MTO'
  | 'MTS'

interface WeeklyScheduleGridProps {
  items: WeeklyScheduleItem[]
  lineOverview: LineOverviewData | null
  selectedItemId?: string | null
  onSelectItem?: (item: WeeklyScheduleItem) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
  onOpenAddModal: (
    day: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    shiftCode: string,
  ) => void
  onTransferDayShift: (
    index: number,
    newDay: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM',
    newShiftCode: string,
  ) => void
  onAddStop: (day: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM', shiftCode: string) => void
  onOpenAwaitingObservationsModal?: (item: WeeklyScheduleItem) => void
  filterOption?: ScheduleGridFilter
  onFilterChange?: (filter: ScheduleGridFilter) => void
}

export const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({
  items,
  lineOverview,
  selectedItemId,
  onSelectItem,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onOpenAddModal,
  onTransferDayShift,
  onAddStop,
  onOpenAwaitingObservationsModal,
  filterOption = 'ALL',
  onFilterChange,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  const [internalFilter, setInternalFilter] = useState<ScheduleGridFilter>(filterOption)

  const activeFilter = onFilterChange ? filterOption : internalFilter
  const handleFilterSelect = (f: ScheduleGridFilter) => {
    if (onFilterChange) {
      onFilterChange(f)
    } else {
      setInternalFilter(f)
    }
  }

  const currentSelectedId = selectedItemId !== undefined ? selectedItemId : internalSelectedId

  const handleRowClick = (item: WeeklyScheduleItem) => {
    setInternalSelectedId(item.id)
    if (onSelectItem) {
      onSelectItem(item)
    }
  }

  // Manipuladores de Drag and Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) return

    // Move o item de draggedIndex para targetIndex
    const currentDay = items[targetIndex].day_of_week
    const currentShift = items[targetIndex].shift_code
    onTransferDayShift(draggedIndex, currentDay, currentShift)
    setDraggedIndex(null)
  }

  // Filtro de Itens
  const filteredItemsWithIndex = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const isAwaiting =
          item.status === 'AGUARDANDO_OBSERVACOES' || item.awaiting_observations?.is_awaiting
        const isBlocked =
          item.is_blocked_attempt ||
          (lineOverview?.blockedProducts &&
            lineOverview.blockedProducts.some(
              (b) =>
                b.active &&
                b.product_code.trim().toUpperCase() === item.material_code.trim().toUpperCase(),
            ))
        const hasAlerts =
          item.raw_material_calc?.status === 'RED' ||
          item.raw_material_calc?.status === 'YELLOW' ||
          item.cooling_validation?.hasViolation ||
          isAwaiting ||
          isBlocked

        if (activeFilter === 'AGUARDANDO_OBSERVACOES') return isAwaiting
        if (activeFilter === 'ALERTAS') return hasAlerts
        if (activeFilter === 'BLOQUEADOS') return isBlocked
        if (activeFilter === 'MTO') return item.order_type === 'MTO'
        if (activeFilter === 'MTS') return item.order_type === 'MTS'
        return true
      })
  }, [items, activeFilter, lineOverview])

  /**
   * Helper para determinar estilo de fundo/linha conforme as Cores Oficiais da Programação:
   * - Verde claro: MTS
   * - Amarelo claro: MTO
   * - Amarelo destacado: Aguardando observações
   * - Cinza: Setup / Troca
   * - Laranja: Parada Programada
   * - Azul claro: Manutenção
   * - Vermelho: Bloqueio / condição crítica
   * - Contorno azul: item atualmente selecionado
   */
  const getItemRowClasses = (item: WeeklyScheduleItem, isSelected: boolean) => {
    const isAwaiting =
      item.status === 'AGUARDANDO_OBSERVACOES' || item.awaiting_observations?.is_awaiting
    const isStop = item.item_type === 'SCHEDULED_STOP'
    const isSetup = item.item_type === 'SETUP'
    const isBlocked =
      item.is_blocked_attempt ||
      (lineOverview?.blockedProducts &&
        lineOverview.blockedProducts.some(
          (b) =>
            b.active &&
            b.product_code.trim().toUpperCase() === item.material_code.trim().toUpperCase(),
        ))
    const isCriticalCondition = item.raw_material_calc?.status === 'RED' || isBlocked

    let bgClass = 'bg-white'

    if (isCriticalCondition) {
      // Vermelho: Bloqueio / condição crítica
      bgClass = 'bg-rose-50/80 hover:bg-rose-100/80 text-rose-950'
    } else if (isAwaiting) {
      // Amarelo destacado: Aguardando observações
      bgClass = 'bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 font-medium'
    } else if (isStop) {
      if (
        item.stop_description?.toLowerCase().includes('manuten') ||
        item.stop_code?.toLowerCase().includes('manut')
      ) {
        // Azul claro: Manutenção
        bgClass = 'bg-sky-50 hover:bg-sky-100 text-sky-950'
      } else {
        // Laranja: Parada Programada
        bgClass = 'bg-orange-50 hover:bg-orange-100 text-orange-950 font-medium'
      }
    } else if (isSetup) {
      // Cinza: Setup / Troca
      bgClass = 'bg-slate-100 hover:bg-slate-200 text-slate-800'
    } else if (item.order_type === 'MTO') {
      // Amarelo claro: MTO
      bgClass = 'bg-amber-50/60 hover:bg-amber-100/60 text-slate-900'
    } else {
      // Verde claro: MTS
      bgClass = 'bg-emerald-50/40 hover:bg-emerald-100/50 text-slate-900'
    }

    const selectedClass = isSelected
      ? 'ring-2 ring-blue-600 ring-inset shadow-md z-10 relative !bg-blue-50/90'
      : ''

    return `${bgClass} ${selectedClass} transition-colors cursor-pointer group`
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Barra superior de instrução + Filtros */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <span>
              Grade Operacional de Montagem Semanal (Dia &rarr; Turno &rarr; Turma &rarr; Sequência)
            </span>
          </div>

          {/* Filtro de Visualização de Itens */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#004C97]" />
              Filtro:
            </span>
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-xs">
              {[
                { key: 'ALL', label: 'Todos' },
                { key: 'AGUARDANDO_OBSERVACOES', label: 'Aguardando Observações' },
                { key: 'ALERTAS', label: 'Alertas' },
                { key: 'BLOQUEADOS', label: 'Bloqueados' },
                { key: 'MTO', label: 'MTO' },
                { key: 'MTS', label: 'MTS' },
              ].map((f) => {
                const isActive = activeFilter === f.key
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleFilterSelect(f.key as ScheduleGridFilter)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                      isActive
                        ? f.key === 'AGUARDANDO_OBSERVACOES'
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : 'bg-[#004C97] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
            <span className="text-[11px] text-slate-500 font-mono ml-2">
              {filteredItemsWithIndex.length} de {items.length} atividade(s)
            </span>
          </div>
        </div>

        {/* Grade Principal com Cabeçalho Fixo e Primeira Coluna Fixa */}
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            {/* CABEÇALHO FIXO DA GRADE */}
            <thead className="bg-[#004C97] text-white text-[11px] uppercase tracking-wider sticky top-0 z-20 shadow-sm font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center sticky left-0 z-30 bg-[#004C97] border-r border-blue-600/40">
                  SEQ.
                </th>
                <th className="py-2.5 px-3 w-24 text-center">DIA</th>
                <th className="py-2.5 px-3 w-32 text-center">TURNO</th>
                <th className="py-2.5 px-3 w-36">Horário Previsto</th>
                <th className="py-2.5 px-3 w-28">Tipo</th>
                <th className="py-2.5 px-3 min-w-[180px]">Material / Produto SAP</th>
                <th className="py-2.5 px-3 w-24">Aço / Bitola</th>
                <th className="py-2.5 px-3 w-24 text-right">Qtd (t)</th>
                <th className="py-2.5 px-3 w-24 text-right">Cadência</th>
                <th className="py-2.5 px-3 w-24 text-right">Duração</th>
                <th className="py-2.5 px-3 min-w-[140px]">Setup / Troca</th>
                <th className="py-2.5 px-3 w-28 text-center">Ordem / MTO</th>
                <th className="py-2.5 px-3 w-28 text-right">Necessidade MP</th>
                <th className="py-2.5 px-3 w-32 text-center">Status MP</th>
                <th className="py-2.5 px-3 w-28 text-center">Status</th>
                <th className="py-2.5 px-3 w-24 text-center">Ações</th>
              </tr>
            </thead>

            {/* CORPO DA GRADE */}
            <tbody className="divide-y divide-slate-200">
              {filteredItemsWithIndex.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700">
                        Nenhuma atividade encontrada com o filtro atual.
                      </p>
                      {activeFilter !== 'ALL' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFilterSelect('ALL')}
                          className="text-xs"
                        >
                          Limpar Filtro e Exibir Todas
                        </Button>
                      ) : (
                        <>
                          <p className="text-xs text-slate-400">
                            Clique em <strong>"+ Adicionar Produto"</strong> para iniciar a montagem
                            operacional.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => onOpenAddModal('SEG', 'T1_L1')}
                            className="bg-[#004C97] text-white hover:bg-[#003d7a] text-xs font-semibold mt-2"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Adicionar Primeiro Produto
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItemsWithIndex.map(({ item, originalIndex }) => {
                  const isStop = item.item_type === 'SCHEDULED_STOP'
                  const isMto = item.order_type === 'MTO'
                  const isAwaiting =
                    item.status === 'AGUARDANDO_OBSERVACOES' ||
                    item.awaiting_observations?.is_awaiting
                  const isSelected = currentSelectedId === item.id
                  const startHour = item.start_datetime
                    ? item.start_datetime.split(' ')[1] || item.start_datetime
                    : '--:--'
                  const endHour = item.end_datetime
                    ? item.end_datetime.split(' ')[1] || item.end_datetime
                    : '--:--'

                  return (
                    <tr
                      key={item.id || originalIndex}
                      draggable
                      onClick={() => handleRowClick(item)}
                      onDragStart={(e) => handleDragStart(e, originalIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, originalIndex)}
                      className={getItemRowClasses(item, isSelected)}
                    >
                      {/* Coluna 1 Fixa: Sequência */}
                      <td className="py-2 px-2 text-center sticky left-0 z-10 bg-inherit border-r border-slate-200 font-mono font-bold text-slate-800">
                        <div className="flex items-center justify-center gap-0.5">
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 cursor-grab" />
                          <span>{item.sequence_order || originalIndex + 1}</span>
                        </div>
                      </td>

                      {/* Dia */}
                      <td className="py-2 px-2 font-semibold text-slate-900 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold">{item.day_of_week}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.date_str || '24/08'}
                          </span>
                        </div>
                      </td>

                      {/* Turno sem duplicidade: T1 · Turma C (Requisito 2) */}
                      <td className="py-2 px-2 whitespace-nowrap text-center">
                        <span className="font-bold text-slate-800 text-xs">
                          {WeeklyScheduleEngine.formatShiftDisplay(
                            item.shift_name,
                            item.shift_code,
                            item.crew_name,
                          )}
                        </span>
                      </td>

                      {/* Linha do Tempo: Início -> Fim */}
                      <td className="py-2 px-3 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-800">
                          <span className="font-bold text-[#004C97]">{startHour}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="font-bold text-slate-700">{endHour}</span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {isStop ? (
                          <Badge className="bg-orange-100 text-orange-950 border-orange-300 text-[10px] font-bold">
                            <Wrench className="w-2.5 h-2.5 mr-1" />
                            Parada
                          </Badge>
                        ) : isMto ? (
                          <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px] font-bold">
                            MTO
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-950 border-emerald-300 text-[10px] font-bold">
                            MTS
                          </Badge>
                        )}
                      </td>

                      {/* Material / Produto SAP */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {item.material_code}
                            </span>
                            {item.deviation_analysis?.hasDeviation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[9px] font-bold px-1 py-0 cursor-help flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                                    DESVIO REGRA
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-slate-900 text-white text-xs max-w-sm p-2.5"
                                >
                                  <p className="font-bold text-rose-300">Desvio Detectado:</p>
                                  <p className="text-[11px] text-slate-200 mt-0.5">
                                    {item.deviation_analysis.deviationDetails}
                                  </p>
                                  <p className="text-[10px] text-amber-300 mt-1 font-mono">
                                    Status:{' '}
                                    {item.exception_approval_status === 'APPROVED'
                                      ? 'Aprovado pelo Supervisor'
                                      : 'Pendente de Aprovação PCP'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isAwaiting && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="bg-amber-400 text-slate-950 border-amber-500 text-[9px] font-black uppercase px-1.5 py-0 shadow-xs flex items-center gap-1 cursor-help">
                                    <AlertTriangle className="w-2.5 h-2.5 text-slate-950 font-black" />
                                    Aguardando Observações
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="top"
                                  className="bg-slate-900 text-white text-xs max-w-xs p-2.5"
                                >
                                  <p className="font-bold text-amber-300">
                                    {item.awaiting_observations?.reason || 'Aguardando Observações'}
                                  </p>
                                  <p className="text-[11px] text-slate-200 mt-1">
                                    {item.awaiting_observations?.observation ||
                                      'Item retido na programação aguardando validação.'}
                                  </p>
                                  <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-[10px] text-slate-400 font-mono">
                                    Resp: {item.awaiting_observations?.responsible || 'PCP'}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 line-clamp-1">
                            {item.material_description ||
                              (isStop ? item.stop_description : 'Produto Cadastrado')}
                          </span>
                        </div>
                      </td>

                      {/* Aço / Bitola */}
                      <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-700">
                        {item.dimensions || item.steel_grade || '--'}
                      </td>

                      {/* Quantidade em Toneladas (t) */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        {!isStop ? (
                          <span className="font-bold text-slate-900 text-xs">
                            {item.planned_quantity_tons.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                            })}{' '}
                            <span className="text-[10px] text-slate-500 font-sans font-bold">
                              t
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Cadência da Ficha Mestre */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-slate-700">
                        {!isStop ? (
                          <span>{item.productivity_rate_th} t/h</span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Horas Produtivas */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                        {!isStop ? (
                          <span className="font-bold text-emerald-800">
                            {item.production_hours.toFixed(2)} h
                          </span>
                        ) : (
                          <span className="font-bold text-amber-800">
                            {((item.stop_duration_minutes || 60) / 60).toFixed(2)} h
                          </span>
                        )}
                      </td>

                      {/* Setup / Troca com Tooltip Explicativo da Ficha Mestre */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        {!isStop && item.setup_duration_minutes > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded cursor-help transition-colors">
                                <Clock className="w-2.5 h-2.5 text-amber-600" />
                                <span className="font-mono font-bold text-[11px]">
                                  {item.setup_duration_minutes} min
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-slate-900 text-white text-xs max-w-xs p-2"
                            >
                              <p className="font-bold text-amber-300">
                                Tempo de Setup Conforme Ficha Mestre:
                              </p>
                              <p className="text-[11px] text-slate-200 mt-0.5">
                                {item.setup_reason ||
                                  'Troca de ferramentas e regulagem de trem de laminação.'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : !isStop ? (
                          <span className="text-[11px] text-slate-400 font-mono">
                            0 min (Mesmo lote)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">--</span>
                        )}
                      </td>

                      {/* Ordem / Pedido MTO */}
                      <td className="py-2 px-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-600">
                        {item.production_order ||
                          item.sales_order_mto ||
                          (item.customer_name ? item.customer_name.substring(0, 12) : '--')}
                      </td>

                      {/* Necessidade de Matéria-Prima (com Tooltip Explicativo da Regra) */}
                      <td className="py-2 px-3 text-right font-mono whitespace-nowrap text-indigo-950 font-bold">
                        {!isStop && item.raw_material_calc ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex items-center gap-1 cursor-help justify-end">
                                <span>
                                  {item.raw_material_req_tons.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 1,
                                  })}
                                </span>
                                <span className="text-[10px] text-slate-500 font-sans font-bold">
                                  t
                                </span>
                                <HelpCircle className="w-3 h-3 text-slate-400" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-slate-900 text-white text-xs max-w-sm p-3 shadow-xl"
                            >
                              <p className="font-bold text-blue-300">
                                Regra de Cálculo de Matéria-Prima:
                              </p>
                              <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                                {item.raw_material_calc.calculationRuleExplanation}
                              </p>
                              <div className="mt-2 pt-2 border-t border-slate-700 flex justify-between text-[10px] text-slate-300 font-mono">
                                <span>Rendimento: {item.raw_material_calc.yieldPct}%</span>
                                <span>Perda: {item.raw_material_calc.lossPct}%</span>
                                <span>
                                  Tarugos: ~{item.raw_material_calc.estimatedBilletsCount} un
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : !isStop ? (
                          <span>
                            {item.raw_material_req_tons.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                            })}{' '}
                            <span className="text-[10px] text-slate-500 font-sans font-bold">
                              t
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Semáforo de MP (Verde / Amarelo / Vermelho com Déficit e Ruptura) */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {!isStop && item.raw_material_calc ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-center">
                                {item.raw_material_calc.status === 'GREEN' && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-help mx-auto w-fit shadow-xs">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                    🟢 GARANTIDA
                                  </Badge>
                                )}
                                {item.raw_material_calc.status === 'YELLOW' && (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-help mx-auto w-fit shadow-xs">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />🟡 COM
                                    RISCO
                                  </Badge>
                                )}
                                {item.raw_material_calc.status === 'RED' && (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-help mx-auto w-fit animate-pulse shadow-xs">
                                      <AlertCircle className="w-3 h-3 text-rose-600" />🔴
                                      INSUFICIENTE
                                    </Badge>
                                    <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1 rounded border border-rose-200">
                                      -{item.raw_material_calc.deficitTons.toLocaleString('pt-BR')}{' '}
                                      t
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-slate-900 text-white text-xs max-w-sm p-3 shadow-xl"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`font-bold ${
                                      item.raw_material_calc.status === 'GREEN'
                                        ? 'text-emerald-400'
                                        : item.raw_material_calc.status === 'YELLOW'
                                          ? 'text-amber-400'
                                          : 'text-rose-400'
                                    }`}
                                  >
                                    {item.raw_material_calc.statusLabel}
                                  </p>
                                  {item.raw_material_calc.probableRuptureDate && (
                                    <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800">
                                      Ruptura: {item.raw_material_calc.probableRuptureDate}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-200 leading-relaxed">
                                  {item.raw_material_calc.statusReason}
                                </p>
                                <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-300 font-mono space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>Estoque Físico SAP/WMS:</span>
                                    <span className="text-white font-bold">
                                      {item.raw_material_calc.currentSapStockTons} t
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Entrada Pedidos Compra (PO):</span>
                                    <span className="text-white font-bold">
                                      {item.raw_material_calc.confirmedPoTons} t
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Produção Upstream Linhas:</span>
                                    <span className="text-white font-bold">
                                      {item.raw_material_calc.upstreamProductionTons} t
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Consumo Próprio Anterior:</span>
                                    <span className="text-amber-300 font-bold">
                                      {item.raw_material_calc.priorOwnLineConsumptionTons} t
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t border-slate-800">
                                    <span>Saldo Projetado na Data:</span>
                                    <span
                                      className={`font-bold ${
                                        item.raw_material_calc.projectedBalanceTons >= 0
                                          ? 'text-emerald-400'
                                          : 'text-rose-400'
                                      }`}
                                    >
                                      {item.raw_material_calc.projectedBalanceTons} t
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-slate-400 text-[11px]">--</span>
                        )}
                      </td>

                      {/* Status da Atividade */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {isAwaiting ? (
                          <Badge className="bg-amber-400 text-slate-950 border-amber-500 text-[9px] font-black">
                            Aguard. Obs.
                          </Badge>
                        ) : item.exception_approval_status === 'PENDING_SUPERVISOR' ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-400 text-[9px] font-bold">
                            Pend. PCP
                          </Badge>
                        ) : item.exception_approval_status === 'APPROVED' ? (
                          <Badge className="bg-emerald-100 text-emerald-900 border-emerald-400 text-[9px] font-bold">
                            Aprovado PCP
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[9px] font-bold">
                            {item.status || 'Rascunho'}
                          </Badge>
                        )}
                      </td>

                      {/* Ações (Mover, Duplicar, Aguardando Observações, Remover) */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={originalIndex === 0}
                            onClick={() => onMoveUp(originalIndex)}
                            title="Mover para Cima (Recalcular)"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={originalIndex === items.length - 1}
                            onClick={() => onMoveDown(originalIndex)}
                            title="Mover para Baixo (Recalcular)"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="text-xs bg-white border-slate-200 text-slate-800 shadow-xl"
                            >
                              {onOpenAwaitingObservationsModal && (
                                <DropdownMenuItem
                                  onClick={() => onOpenAwaitingObservationsModal(item)}
                                  className="text-amber-800 focus:text-amber-900 focus:bg-amber-50 font-semibold"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 mr-2 text-amber-600" />
                                  {isAwaiting
                                    ? 'Editar Aguardando Observações'
                                    : 'Aguardando Observações...'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => onDuplicate(originalIndex)}>
                                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Duplicar Atividade
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onRemove(originalIndex)}
                                className="text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Remover da Programação
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 3. LEGENDA OFICIAL DA PROGRAMAÇÃO (SEMPRE VISÍVEL ABAIXO DA GRADE) */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
              Legenda Oficial da Programação CIAFAL:
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-emerald-300 bg-emerald-100/90 shrink-0" />
                <span>Verde claro: MTS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-amber-300 bg-amber-50 shrink-0" />
                <span>Amarelo claro: MTO</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-amber-400 bg-amber-200 shrink-0 font-bold text-slate-950" />
                <span className="font-semibold text-amber-950">
                  Amarelo destacado: Aguardando observações
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-slate-200 shrink-0" />
                <span>Cinza: Setup / Troca</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-orange-300 bg-orange-100 shrink-0" />
                <span>Laranja: Parada Programada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-sky-300 bg-sky-100 shrink-0" />
                <span>Azul claro: Manutenção</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border border-rose-300 bg-rose-100 shrink-0" />
                <span>Vermelho: Bloqueio / Condição crítica</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded border-2 border-blue-600 bg-blue-50 shrink-0" />
                <span>Contorno azul: Item selecionado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
