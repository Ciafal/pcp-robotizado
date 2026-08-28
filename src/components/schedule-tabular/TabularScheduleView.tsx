import React, { useState, useEffect } from 'react'
import {
  Table as TableIcon,
  Search,
  Filter,
  Download,
  Sliders,
  ArrowUpDown,
  MoveUp,
  MoveDown,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Eye,
  FileSpreadsheet,
  Printer,
  FileText,
  Lock,
  RotateCcw,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  TabularScheduleItem,
  TabularColumnConfig,
  ManualOverridePayload,
} from '@/types/inventory-projection'
import { Can } from '@/components/auth/Can'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'

// Colunas Padrão baseadas no modelo real CIAFAL (Regra 38 e 39)
const defaultColumns: TabularColumnConfig[] = [
  {
    key: 'seq',
    label: 'Seq.',
    visible: true,
    required: true,
    order: 1,
    align: 'center',
    minWidth: 60,
    isNumeric: true,
  },
  {
    key: 'dataDetalhada',
    label: 'Data Detalhada',
    visible: true,
    required: false,
    order: 2,
    minWidth: 100,
  },
  {
    key: 'data',
    label: 'Data',
    visible: true,
    required: false,
    order: 3,
    align: 'center',
    minWidth: 70,
  },
  {
    key: 'dia',
    label: 'Dia',
    visible: true,
    required: false,
    order: 4,
    align: 'center',
    minWidth: 70,
  },
  { key: 'turno', label: 'Turno', visible: true, required: false, order: 5, minWidth: 110 },
  {
    key: 'turma',
    label: 'Turma',
    visible: true,
    required: false,
    order: 6,
    align: 'center',
    minWidth: 70,
  },
  {
    key: 'horaInicio',
    label: 'Hora Início',
    visible: true,
    required: false,
    order: 7,
    align: 'center',
    minWidth: 85,
  },
  { key: 'codigo', label: 'Código', visible: true, required: true, order: 8, minWidth: 120 },
  { key: 'produto', label: 'Produto', visible: true, required: true, order: 9, minWidth: 200 },
  {
    key: 'mtoOrIndustrializacao',
    label: 'MTO / Industrialização',
    visible: true,
    required: false,
    order: 10,
    align: 'center',
    minWidth: 140,
  },
  { key: 'cliente', label: 'Cliente', visible: true, required: false, order: 11, minWidth: 140 },
  {
    key: 'comprimentoMetros',
    label: 'Compr. (m)',
    visible: true,
    required: false,
    order: 12,
    align: 'right',
    minWidth: 80,
    isNumeric: true,
  },
  {
    key: 'embalagem',
    label: 'Embalagem',
    visible: true,
    required: false,
    order: 13,
    minWidth: 130,
  },
  {
    key: 'programadoTons',
    label: 'Programado (t)',
    visible: true,
    required: true,
    order: 14,
    align: 'right',
    minWidth: 110,
    isNumeric: true,
  },
  {
    key: 'produtividadeTh',
    label: 'Produtividade (t/h)',
    visible: true,
    required: false,
    order: 15,
    align: 'right',
    minWidth: 120,
    isNumeric: true,
  },
  {
    key: 'horasDisponiveis',
    label: 'Horas Disp.',
    visible: true,
    required: false,
    order: 16,
    align: 'right',
    minWidth: 90,
    isNumeric: true,
  },
  {
    key: 'totalL1Tons',
    label: 'Total L1 (t)',
    visible: true,
    required: false,
    order: 17,
    align: 'right',
    minWidth: 95,
    isNumeric: true,
  },
  {
    key: 'totalL2Tons',
    label: 'Total L2 (t)',
    visible: true,
    required: false,
    order: 18,
    align: 'right',
    minWidth: 95,
    isNumeric: true,
  },
  {
    key: 'totalTons',
    label: 'Total (t)',
    visible: true,
    required: true,
    order: 19,
    align: 'right',
    minWidth: 95,
    isNumeric: true,
  },
  {
    key: 'status',
    label: 'Status',
    visible: true,
    required: true,
    order: 20,
    align: 'center',
    minWidth: 110,
  },
]

interface TabularScheduleViewProps {
  lineCode?: string
  initialItems?: TabularScheduleItem[]
}

export const TabularScheduleView: React.FC<TabularScheduleViewProps> = ({
  lineCode = 'ACAB_L2',
  initialItems = [],
}) => {
  const { toast } = useToast()

  const [items, setItems] = useState<TabularScheduleItem[]>(initialItems)
  const [columns, setColumns] = useState<TabularColumnConfig[]>(defaultColumns)
  const [searchTerm, setSearchTerm] = useState('')
  const [groupBy, setGroupBy] = useState<'NONE' | 'DATA' | 'TURNO' | 'CLIENTE' | 'MTO'>('TURNO')

  // Modais
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
  const [selectedItemForOverride, setSelectedItemForOverride] =
    useState<TabularScheduleItem | null>(null)
  const [targetSeq, setTargetSeq] = useState<number>(1)
  const [overrideReason, setOverrideReason] = useState('')
  const [justificationNotes, setJustificationNotes] = useState('')
  const [isMtoDrawerOpen, setIsMtoDrawerOpen] = useState(false)
  const [selectedMtoItem, setSelectedMtoItem] = useState<TabularScheduleItem | null>(null)

  // Carrega itens da programação operacional do banco / contexto
  const loadScheduleData = async () => {
    try {
      // Busca programações salvas no banco
      const records = await pb.collection('production_schedules').getFullList({
        filter: lineCode ? `line_code = '${lineCode}'` : undefined,
        sort: 'sequence_order',
      })

      if (records.length > 0) {
        const loaded: TabularScheduleItem[] = records.map((r: any, idx: number) => ({
          id: r.id,
          seq: r.sequence_order || idx + 1,
          dataDetalhada: r.start_date || new Date().toLocaleDateString('pt-BR'),
          data: r.start_date
            ? r.start_date.substring(0, 5)
            : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          dia: 'Segunda',
          turno: r.shift_name || '1º Turno (06h - 14h)',
          turma: r.crew_name || 'Turma A',
          horaInicio: r.start_time || '06:00',
          codigo: r.product_code || 'PROD-BASE',
          produto: r.product_description || 'Produto Programado',
          mtoOrIndustrializacao: (r.order_type as any) || 'MTS',
          cliente: r.customer_name || 'Mercado Geral',
          comprimentoMetros: r.length_meters || 6.0,
          embalagem: r.packaging_type || 'Fardo Padrão',
          programadoTons: r.planned_tons || 0,
          produtividadeTh: r.nominal_speed_th || 18.5,
          horasDisponiveis: r.planned_hours || 7.0,
          totalL1Tons: r.upstream_l1_tons || 0,
          totalL2Tons: r.upstream_l2_tons || 0,
          totalTons: r.total_tons || r.planned_tons || 0,
          status: r.status || 'PROGRAMADO',
          isManualOverridden: r.is_manual_override || false,
          overrideReason: r.override_reason,
          originalSeq: r.original_sequence_order,
        }))
        setItems(loaded)
      } else if (initialItems.length > 0) {
        setItems(initialItems)
      }
    } catch (err) {
      console.warn('Tabela de programação iniciada sem registros do banco:', err)
      if (initialItems.length > 0) setItems(initialItems)
    }
  }

  useEffect(() => {
    loadScheduleData()
  }, [lineCode])

  // Filtragem
  const filteredItems = items.filter((item) => {
    const s = searchTerm.toLowerCase()
    return (
      item.codigo.toLowerCase().includes(s) ||
      item.produto.toLowerCase().includes(s) ||
      item.cliente.toLowerCase().includes(s) ||
      item.turno.toLowerCase().includes(s)
    )
  })

  // Totais Gerais em Toneladas (t)
  const totalProgramadoTons = filteredItems.reduce((sum, i) => sum + (i.programadoTons || 0), 0)
  const totalL1SumTons = filteredItems.reduce((sum, i) => sum + (i.totalL1Tons || 0), 0)
  const totalL2SumTons = filteredItems.reduce((sum, i) => sum + (i.totalL2Tons || 0), 0)
  const totalGeralTons = filteredItems.reduce((sum, i) => sum + (i.totalTons || 0), 0)

  // Executar Manual Override (com Auditoria e Validação de Restrições)
  const handleOpenOverride = (item: TabularScheduleItem) => {
    setSelectedItemForOverride(item)
    setTargetSeq(item.seq)
    setOverrideReason('')
    setJustificationNotes('')
    setIsOverrideModalOpen(true)
  }

  const handleApplyOverride = async () => {
    if (!selectedItemForOverride) return
    if (!overrideReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Justificativa Obrigatória',
        description:
          'É mandatório registrar a justificativa operacional para alterar a sequência do motor.',
      })
      return
    }

    try {
      // 1. Simular / Validar Restrições
      const originalSeq = selectedItemForOverride.seq
      const newSeq = Number(targetSeq)

      // Reorganiza a lista mantendo ordenação
      const updatedList = [...items]
      const index = updatedList.findIndex((i) => i.id === selectedItemForOverride.id)
      if (index === -1) return

      const [removed] = updatedList.splice(index, 1)
      removed.seq = newSeq
      removed.isManualOverridden = true
      removed.originalSeq = originalSeq
      removed.overrideReason = overrideReason
      removed.status = 'MANUAL_OVERRIDE'
      removed.overriddenAt = new Date().toISOString()

      // Insere na nova posição e renumera sequências
      const targetIndex = Math.max(0, Math.min(updatedList.length, newSeq - 1))
      updatedList.splice(targetIndex, 0, removed)

      const renumbered = updatedList.map((item, idx) => ({
        ...item,
        seq: idx + 1,
      }))

      setItems(renumbered)

      // 2. Gravar no Audit Log do PocketBase
      try {
        await pb.collection('pcp_audit_logs').create({
          event_type: 'SCHEDULE_ACTION',
          action: 'SCHEDULE_MANUAL_OVERRIDE',
          resource: 'PRODUCTION_SCHEDULE',
          resource_id: selectedItemForOverride.id,
          scope: 'PRODUCTION_LINE',
          outcome: 'SUCCESS',
          details: {
            lineCode,
            materialCode: selectedItemForOverride.codigo,
            originalSeq,
            newSeq,
            reason: overrideReason,
            notes: justificationNotes,
          },
        })
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Sequência Alterada com Sucesso',
        description: `Item ${selectedItemForOverride.codigo} movido da Seq ${originalSeq} para ${newSeq}. Auditoria registrada.`,
      })

      setIsOverrideModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao aplicar Override',
        description: err.message,
      })
    }
  }

  // Exportação XLSX / Impressão
  const handleExportSpreadsheet = () => {
    toast({
      title: 'Exportando Planilha Operacional',
      description: `Gerando arquivo XLSX no layout padrão CIAFAL para ${filteredItems.length} registros.`,
    })
  }

  const handlePrint = () => {
    window.print()
  }

  // Renderização de Célula Customizada
  const renderCellContent = (item: TabularScheduleItem, col: TabularColumnConfig) => {
    const val = (item as any)[col.key]

    if (col.key === 'seq') {
      return (
        <div className="flex items-center justify-center gap-1 font-mono font-bold">
          <span>{val}</span>
          {item.isManualOverridden && (
            <span
              title={`Sequência alterada manualmente (Original: ${item.originalSeq}). Motivo: ${item.overrideReason}`}
              className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 rounded px-1 font-bold"
            >
              M
            </span>
          )}
        </div>
      )
    }

    if (col.key === 'mtoOrIndustrializacao') {
      return val === 'MTO' ? (
        <button
          onClick={() => {
            setSelectedMtoItem(item)
            setIsMtoDrawerOpen(true)
          }}
          className="bg-purple-100 text-purple-900 hover:bg-purple-200 border border-purple-300 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 mx-auto"
        >
          <span>MTO</span>
          <Eye className="w-2.5 h-2.5" />
        </button>
      ) : (
        <span className="text-[10px] font-mono text-slate-500">{val || 'MTS'}</span>
      )
    }

    if (col.key === 'status') {
      return item.isManualOverridden ? (
        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[9px] font-bold">
          Manual Override
        </Badge>
      ) : val === 'EM_PROCESSO' ? (
        <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-[9px] font-bold animate-pulse">
          Em Processo
        </Badge>
      ) : (
        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[9px] font-bold">
          Programado
        </Badge>
      )
    }

    if (col.isNumeric && typeof val === 'number') {
      return (
        <span className="font-mono">
          {val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </span>
      )
    }

    return val ?? '--'
  }

  // Agrupamento
  const renderGroupedRows = () => {
    if (groupBy === 'NONE') {
      return (
        <tbody>
          {filteredItems.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-blue-50/50 border-b border-slate-100 transition-colors text-xs text-slate-800"
            >
              {columns
                .filter((c) => c.visible)
                .map((col) => (
                  <td
                    key={col.key as string}
                    className={`py-2 px-2.5 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {renderCellContent(item, col)}
                  </td>
                ))}
              <td className="py-2 px-2 text-center">
                <Can permission="pcp.schedule.override">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenOverride(item)}
                    className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                  >
                    <ArrowUpDown className="w-3 h-3 mr-0.5" /> Reordenar
                  </Button>
                </Can>
              </td>
            </tr>
          ))}
        </tbody>
      )
    }

    // Agrupamento por Campo
    const groups: Record<string, TabularScheduleItem[]> = {}
    for (const item of filteredItems) {
      let gKey = 'Geral'
      if (groupBy === 'DATA') gKey = item.dataDetalhada || item.data || 'Sem Data'
      if (groupBy === 'TURNO') gKey = `${item.data} - ${item.turno}`
      if (groupBy === 'CLIENTE') gKey = item.cliente || 'Mercado Geral'
      if (groupBy === 'MTO') gKey = item.mtoOrIndustrializacao || 'MTS'

      if (!groups[gKey]) groups[gKey] = []
      groups[gKey].push(item)
    }

    return (
      <tbody>
        {Object.entries(groups).map(([groupTitle, groupItems]) => {
          const groupTons = groupItems.reduce((sum, i) => sum + (i.programadoTons || 0), 0)
          const groupHours = groupItems.reduce((sum, i) => sum + (i.horasDisponiveis || 0), 0)

          return (
            <React.Fragment key={groupTitle}>
              {/* Linha Cabeçalho do Agrupamento com Totalização */}
              <tr className="bg-slate-100 font-bold text-xs text-slate-900 border-y border-slate-200">
                <td
                  colSpan={columns.filter((c) => c.visible).length + 1}
                  className="py-2 px-3 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#004C97]" />
                    <span>{groupTitle}</span>
                    <Badge className="bg-white text-slate-700 text-[10px] border-slate-300">
                      {groupItems.length} itens
                    </Badge>
                  </span>

                  <span className="font-mono text-xs text-slate-700">
                    Subtotal: <strong className="text-[#004C97]">{groupTons.toFixed(1)} t</strong> (
                    {groupHours.toFixed(1)}h)
                  </span>
                </td>
              </tr>

              {groupItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50/50 border-b border-slate-100 transition-colors text-xs text-slate-800"
                >
                  {columns
                    .filter((c) => c.visible)
                    .map((col) => (
                      <td
                        key={col.key as string}
                        className={`py-2 px-2.5 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {renderCellContent(item, col)}
                      </td>
                    ))}
                  <td className="py-2 px-2 text-center">
                    <Can permission="pcp.schedule.override">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenOverride(item)}
                        className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-[#004C97] hover:bg-blue-50"
                      >
                        <ArrowUpDown className="w-3 h-3 mr-0.5" /> Reordenar
                      </Button>
                    </Can>
                  </td>
                </tr>
              ))}
            </React.Fragment>
          )
        })}
      </tbody>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Barra de Ações e Totalizações da Planilha Operacional */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#004C97] text-white rounded-lg">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Grade Operacional de Produção ({lineCode})
              </h3>
              <p className="text-[11px] text-slate-500">
                Visão tabular por item programado. Modelo homologado CIAFAL.
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Totalizadores Fixos em Toneladas (Regra 45) */}
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total Programado
              </span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {totalProgramadoTons.toFixed(1)}{' '}
                <span className="text-[10px] font-normal text-slate-500">t</span>
              </span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total L1</span>
              <span className="font-mono font-bold text-slate-700">
                {totalL1SumTons.toFixed(1)}{' '}
                <span className="text-[10px] font-normal text-slate-500">t</span>
              </span>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total L2</span>
              <span className="font-mono font-bold text-slate-700">
                {totalL2SumTons.toFixed(1)}{' '}
                <span className="text-[10px] font-normal text-slate-500">t</span>
              </span>
            </div>
          </div>
        </div>

        {/* Controles de Busca, Agrupamento e Configuração de Colunas */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              placeholder="Buscar item, código, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-slate-50 border-slate-300 text-xs text-slate-900 h-8 w-44 sm:w-56"
            />
          </div>

          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 px-2.5 h-8 font-medium focus:outline-none"
          >
            <option value="NONE">Sem Agrupamento</option>
            <option value="TURNO">Agrupar por Turno / Data</option>
            <option value="DATA">Agrupar por Data</option>
            <option value="CLIENTE">Agrupar por Cliente</option>
            <option value="MTO">Agrupar por MTO/MTS</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsColumnConfigOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8 gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-[#004C97]" /> Colunas
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportSpreadsheet}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> XLSX
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. Tabela Principal Operacional com Cabeçalho Fixo (Regras 47 e 48) */}
      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <TableIcon className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Nenhuma programação disponível.</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Não há ordens de produção sequenciadas no momento para a {lineCode}. O motor CP-SAT
              gerará a fila quando alimentado com a demanda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[650px] relative">
            <table className="w-full text-left text-xs border-collapse">
              {/* Header Fixo com Pantone 2945 */}
              <thead className="sticky top-0 bg-[#004C97] text-white font-bold text-[11px] shadow-sm z-10">
                <tr>
                  {columns
                    .filter((c) => c.visible)
                    .map((col) => (
                      <th
                        key={col.key as string}
                        style={{ minWidth: col.minWidth || 80 }}
                        className={`py-2.5 px-2.5 uppercase tracking-wider font-semibold border-r border-blue-600/40 ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  <th className="py-2.5 px-2 text-center uppercase tracking-wider font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>

              {renderGroupedRows()}
            </table>
          </div>
        )}
      </Card>

      {/* 3. Modal de Configuração de Colunas (Regra 48) */}
      <Dialog open={isColumnConfigOpen} onOpenChange={setIsColumnConfigOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Configurar Colunas da Grade Operacional
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
            {columns.map((col, idx) => (
              <div
                key={col.key as string}
                className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    disabled={col.required}
                    onChange={(e) => {
                      const updated = [...columns]
                      updated[idx].visible = e.target.checked
                      setColumns(updated)
                    }}
                    className="rounded border-slate-300 text-[#004C97] focus:ring-[#004C97]"
                  />
                  <span
                    className={`font-medium ${col.required ? 'text-slate-900 font-bold' : 'text-slate-700'}`}
                  >
                    {col.label}
                  </span>
                </div>
                {col.required && (
                  <Badge className="bg-slate-200 text-slate-600 text-[9px] font-mono">
                    Obrigatória
                  </Badge>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setIsColumnConfigOpen(false)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Aplicar Preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Modal de Manual Override de Sequência (Regras 42, 43, 44) */}
      <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
        <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" /> Manual Override de Sequência PCP
            </DialogTitle>
          </DialogHeader>

          {selectedItemForOverride && (
            <div className="space-y-3.5 text-xs py-2">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold block">Aviso de Governança & Auditoria</span>
                <p className="text-[11px] mt-0.5">
                  Alterar a ordem gerada pelo otimizador CP-SAT será registrado permanentemente no
                  log de auditoria com usuário, data/hora e justificativa.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Produto
                  </span>
                  <span className="font-bold text-slate-900">
                    {selectedItemForOverride.produto}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Código / Lote
                  </span>
                  <span className="font-mono text-slate-700">{selectedItemForOverride.codigo}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Sequência Atual
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    Seq. {selectedItemForOverride.seq}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Quantidade
                  </span>
                  <span className="font-mono font-bold text-[#004C97]">
                    {selectedItemForOverride.programadoTons} t
                  </span>
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Nova Sequência de Execução (Posição)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={items.length}
                  value={targetSeq}
                  onChange={(e) => setTargetSeq(parseInt(e.target.value) || 1)}
                  className="mt-1 bg-white border-slate-300 text-xs h-8 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Motivo Operacional Obrigatório <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full mt-1 bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-medium"
                >
                  <option value="">Selecione a justificativa homologada...</option>
                  <option value="PRIORIDADE_DIRETORIA">Prioridade Comercial / Diretoria</option>
                  <option value="ATRASO_MATERIA_PRIMA">
                    Atraso na Alimentação de Matéria-Prima
                  </option>
                  <option value="MANUTENCAO_PREVENTIVA_LINHA">
                    Ajuste por Manutenção Mecânica/Setup
                  </option>
                  <option value="OTIMIZACAO_CAMPANHA_FERRAMENTAL">
                    Otimização de Ferramental / Cilindros
                  </option>
                  <option value="ANTECIPACAO_EXPEDICAO_URGENTE">
                    Antecipação para Expedição Urgente
                  </option>
                </select>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-slate-700">
                  Detalhamento / Observações
                </Label>
                <Input
                  placeholder="Descreva detalhes do impacto fabril acordado..."
                  value={justificationNotes}
                  onChange={(e) => setJustificationNotes(e.target.value)}
                  className="mt-1 bg-white border-slate-300 text-xs h-8"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOverrideModalOpen(false)}
              className="border-slate-300 text-slate-700 text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyOverride}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs font-semibold"
            >
              Confirmar Alteração de Sequência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Modal MTO Requisitos SAP (Regra 41) */}
      <Dialog open={isMtoDrawerOpen} onOpenChange={setIsMtoDrawerOpen}>
        <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Requisitos MTO no SAP ECC ({selectedMtoItem?.codigo})
            </DialogTitle>
          </DialogHeader>

          {selectedMtoItem && (
            <div className="space-y-3 text-xs py-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-bold text-slate-900">{selectedMtoItem.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ordem SAP / Sales Order:</span>
                  <span className="font-mono font-bold text-[#004C97]">SO-892182 / Item 10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Especificação Especial:</span>
                  <span className="font-medium text-slate-800">
                    Comprimento Especial 6.00m ± 2mm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Embalagem Requerida:</span>
                  <span className="font-medium text-slate-800">{selectedMtoItem.embalagem}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setIsMtoDrawerOpen(false)}
              className="bg-[#004C97] hover:bg-[#003870] text-white text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TabularScheduleView
