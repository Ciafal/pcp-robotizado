import React, { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Clock,
  Copy,
  GripVertical,
  Layers,
  MoreVertical,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
  AlertOctagon,
  FileText,
  Boxes,
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
import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react'

interface WeeklyScheduleGridProps {
  items: WeeklyScheduleItem[]
  lineOverview: LineOverviewData | null
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
}

export const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({
  items,
  lineOverview,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
  onOpenAddModal,
  onTransferDayShift,
  onAddStop,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

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

  // Agrupa os itens por Dia da Semana e Turno para renderização em planilha operacional CIAFAL
  const daysList: Array<{
    code: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM'
    label: string
  }> = [
    { code: 'SEG', label: 'Segunda-feira' },
    { code: 'TER', label: 'Terça-feira' },
    { code: 'QUA', label: 'Quarta-feira' },
    { code: 'QUI', label: 'Quinta-feira' },
    { code: 'SEX', label: 'Sexta-feira' },
    { code: 'SAB', label: 'Sábado' },
    { code: 'DOM', label: 'Domingo' },
  ]

  const shiftsList =
    lineOverview?.shifts && lineOverview.shifts.length > 0
      ? lineOverview.shifts
      : [
          { code: 'T1_L1', name: '1º Turno Matutino', start_time: '06:00', end_time: '14:20' },
          { code: 'T2_L1', name: '2º Turno Vespertino', start_time: '14:20', end_time: '22:40' },
          { code: 'T3_L1', name: '3º Turno Noturno', start_time: '22:40', end_time: '06:00' },
        ]

  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Barra superior de instrução */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-semibold">
            <Layers className="w-4 h-4 text-[#004C97]" />
            <span>
              Grade Operacional de Montagem Semanal (Dia &rarr; Turno &rarr; Turma &rarr; Sequência)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {items.length} atividade(s) programada(s) &bull; Arraste ou mova para recalcular
            automaticamente
          </span>
        </div>

        {/* Grade Principal com Cabeçalho Fixo e Primeira Coluna Fixa */}
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            {/* CABEÇALHO FIXO DA GRADE */}
            <thead className="bg-[#004C97] text-white text-[11px] uppercase tracking-wider sticky top-0 z-20 shadow-sm font-bold">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center sticky left-0 z-30 bg-[#004C97] border-r border-blue-600/40">
                  Seq
                </th>
                <th className="py-2.5 px-3 w-28">Dia / Data</th>
                <th className="py-2.5 px-3 w-36">Turno / Turma</th>
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Layers className="w-8 h-8 text-slate-300" />
                      <p className="font-bold text-slate-700">
                        Nenhum produto programado para esta semana.
                      </p>
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
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const isStop = item.item_type === 'SCHEDULED_STOP'
                  const isMto = item.order_type === 'MTO'
                  const startHour = item.start_datetime
                    ? item.start_datetime.split(' ')[1] || item.start_datetime
                    : '--:--'
                  const endHour = item.end_datetime
                    ? item.end_datetime.split(' ')[1] || item.end_datetime
                    : '--:--'

                  return (
                    <tr
                      key={item.id || index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`hover:bg-blue-50/60 transition-colors group ${
                        isStop
                          ? 'bg-amber-50/40 text-amber-950 font-medium'
                          : index % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/40'
                      }`}
                    >
                      {/* Coluna 1 Fixa: Sequência */}
                      <td className="py-2 px-2.5 text-center sticky left-0 z-10 bg-inherit border-r border-slate-200 font-mono font-bold text-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 cursor-grab" />
                          <span>{index + 1}</span>
                        </div>
                      </td>

                      {/* Dia */}
                      <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold">{item.day_of_week}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.date_str || '24/08'}
                          </span>
                        </div>
                      </td>

                      {/* Turno / Turma */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800 truncate max-w-[130px]">
                            {item.shift_name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {item.crew_name || 'Turma A'}
                          </span>
                        </div>
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
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold">
                            <Wrench className="w-2.5 h-2.5 mr-1" />
                            Parada
                          </Badge>
                        ) : isMto ? (
                          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-[10px] font-bold">
                            MTO
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-50 text-[#004C97] border-blue-200 text-[10px] font-bold">
                            MTS
                          </Badge>
                        )}
                      </td>

                      {/* Material / Produto SAP */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {item.material_code}
                          </span>
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

                      {/* Semáforo de MP (Verde / Amarelo / Vermelho) */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {!isStop && item.raw_material_calc ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                {item.raw_material_calc.status === 'GREEN' && (
                                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-help mx-auto w-fit">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                    MP GARANTIDA
                                  </Badge>
                                )}
                                {item.raw_material_calc.status === 'YELLOW' && (
                                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-help mx-auto w-fit">
                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                    MP COM RISCO
                                  </Badge>
                                )}
                                {item.raw_material_calc.status === 'RED' && (
                                  <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-help mx-auto w-fit animate-pulse">
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    MP INSUFICIENTE
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-slate-900 text-white text-xs max-w-sm p-3 shadow-xl"
                            >
                              <div className="space-y-1">
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
                                <p className="text-[11px] text-slate-200">
                                  {item.raw_material_calc.statusReason}
                                </p>
                                <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-300 font-mono space-y-0.5">
                                  <div>
                                    Estoque SAP: {item.raw_material_calc.currentSapStockTons} t
                                  </div>
                                  <div>
                                    Entrada Pedidos Compra: {item.raw_material_calc.confirmedPoTons}{' '}
                                    t
                                  </div>
                                  <div>
                                    Produção Upstream:{' '}
                                    {item.raw_material_calc.upstreamProductionTons} t
                                  </div>
                                  <div>
                                    Saldo Projetado Final:{' '}
                                    {item.raw_material_calc.projectedBalanceTons} t
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
                        <Badge className="bg-slate-100 text-slate-800 border-slate-300 text-[9px] font-bold">
                          Rascunho
                        </Badge>
                      </td>

                      {/* Ações (Mover, Duplicar, Remover) */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => onMoveUp(index)}
                            title="Mover para Cima (Recalcular)"
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === items.length - 1}
                            onClick={() => onMoveDown(index)}
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
                              className="text-xs bg-white border-slate-200 text-slate-800"
                            >
                              <DropdownMenuItem onClick={() => onDuplicate(index)}>
                                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Duplicar Atividade
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onRemove(index)}
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
      </div>
    </TooltipProvider>
  )
}
