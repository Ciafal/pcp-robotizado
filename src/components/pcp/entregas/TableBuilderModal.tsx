import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Eye,
  CheckCircle2,
  HelpCircle,
  Calculator,
  SlidersHorizontal,
  Bot,
  Database,
  Layers,
  Info,
  Calendar,
  DollarSign,
  Percent,
  Hash,
  Type,
  Clock,
  Package,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import {
  CustomTableConfig,
  TableColumnConfig,
  TableRowConfig,
  TableColumnFieldType,
  pcpMonthlySummaryService,
} from '@/services/pcp-monthly-summaries'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

interface TableBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  sectionTitle: string
  sectionNumber?: string
  initialTable?: CustomTableConfig | null
  onSaveTable: (table: CustomTableConfig) => void
}

const FIELD_TYPES: {
  value: TableColumnFieldType
  label: string
  icon: React.ComponentType<{ className?: string }>
  desc: string
}[] = [
  { value: 'TEXTO', label: 'Texto', icon: Type, desc: 'Alfanumérico livre' },
  { value: 'NUMERO_INTEIRO', label: 'Número inteiro', icon: Hash, desc: '1.234' },
  { value: 'NUMERO_DECIMAL', label: 'Número decimal', icon: Hash, desc: '1.234,56' },
  { value: 'PERCENTUAL', label: 'Percentual', icon: Percent, desc: '91,0%' },
  { value: 'MOEDA', label: 'Moeda', icon: DollarSign, desc: 'R$ 1.234,56' },
  { value: 'DATA', label: 'Data', icon: Calendar, desc: 'dd/mm/aaaa' },
  { value: 'HORA', label: 'Hora', icon: Clock, desc: 'hh:mm' },
  { value: 'QUANTIDADE', label: 'Quantidade', icon: Package, desc: '1.234,50 t' },
  {
    value: 'CAMPO_CALCULADO',
    label: 'Campo calculado',
    icon: Calculator,
    desc: 'Fórmula por colunas',
  },
  {
    value: 'INFORMACAO_IA',
    label: 'Informação gerada por IA',
    icon: Bot,
    desc: 'Preenchimento por IA',
  },
]

const DATA_SOURCES_AVAILABLE = [
  'Ficha Mestra / Cadastros Homologados',
  'Montagem da Programação',
  'SAP ECC via RFC (ZSD28C / T001W / T001L)',
  'SAP MM MRP / Pátio de MP',
  'SAP PP / Ordens de Produção',
  'WMS / SAP MM Expedição',
  'Análise de Carteira',
  'Gestão de MP',
  'Programação de Parada',
  'Programação de Testes',
  'Controle de Produção / MES 4.0',
  'Histórico de Programações',
  'Entregas PCP',
  'Revisões / Auditoria PCP',
  'Indicadores / Governança',
  'Documentos de referência (SGQ)',
  'Informações editadas pelo Programador PCP',
  'Agente Nativo CIAFAL / Skip Cloud IA',
]

/**
 * Utilitários de formatação pt-BR padrão CIAFAL
 */
export const formatTableCellValue = (
  value: any,
  fieldType: TableColumnFieldType,
  unit?: string,
): string => {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  const isNum = !isNaN(numVal)

  switch (fieldType) {
    case 'TEXTO':
      return String(value)
    case 'NUMERO_INTEIRO':
      return isNum ? Math.round(numVal).toLocaleString('pt-BR') : String(value)
    case 'NUMERO_DECIMAL':
      return isNum
        ? numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(value)
    case 'PERCENTUAL':
      return isNum
        ? `${numVal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
        : `${value}%`
    case 'MOEDA':
      return isNum
        ? numVal.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })
        : `R$ ${value}`
    case 'QUANTIDADE':
      return isNum
        ? `${numVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ' t'}`
        : `${value}${unit ? ` ${unit}` : ''}`
    case 'DATA':
      if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [yyyy, mm, dd] = value.split('-')
        return `${dd}/${mm}/${yyyy}`
      }
      return String(value)
    case 'HORA':
      return String(value)
    case 'CAMPO_CALCULADO':
      return isNum
        ? `${numVal.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`
        : String(value)
    case 'INFORMACAO_IA':
      return String(value)
    default:
      return String(value)
  }
}

export const TableBuilderModal: React.FC<TableBuilderModalProps> = ({
  isOpen,
  onClose,
  sectionTitle,
  sectionNumber,
  initialTable,
  onSaveTable,
}) => {
  // Aba ativa: 'editor' | 'preview' | 'columns' | 'settings'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'columns' | 'settings'>(
    'editor',
  )

  // Identificação e Metadados da Tabela
  const [tableId, setTableId] = useState<string>('')
  const [tableName, setTableName] = useState<string>('')
  const [displayTitle, setDisplayTitle] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [dataSource, setDataSource] = useState<string>('Montagem da Programação')
  const [showTitle, setShowTitle] = useState<boolean>(true)
  const [allowAiCompletion, setAllowAiCompletion] = useState<boolean>(true)
  const [allowManualEdit, setAllowManualEdit] = useState<boolean>(true)
  const [aiFillInstructions, setAiFillInstructions] = useState<string>('')
  const [isDynamic, setIsDynamic] = useState<boolean>(false)

  // Colunas e Linhas
  const [columns, setColumns] = useState<TableColumnConfig[]>([])
  const [rows, setRows] = useState<TableRowConfig[]>([])

  // Totalizador
  const [totalizerEnabled, setTotalizerEnabled] = useState<boolean>(true)
  const [totalizerLabel, setTotalizerLabel] = useState<string>('Total Geral')
  const [totalizerCols, setTotalizerCols] = useState<string[]>([])

  // Coluna em foco para edição detalhada
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Estado do Preenchimento Inteligente por IA
  const [isAiFilling, setIsAiFilling] = useState<boolean>(false)
  const [isAiReviewModalOpen, setIsAiReviewModalOpen] = useState<boolean>(false)
  const [aiFillResult, setAiFillResult] = useState<{
    proposedTable: CustomTableConfig
    missingDataAlerts: string[]
    divergenceAlerts: string[]
    filledCount: number
    unfilledCount: number
  } | null>(null)
  const [aiCustomInstructions, setAiCustomInstructions] = useState<string>('')

  // Inicialização quando o modal abre ou initialTable muda
  useEffect(() => {
    if (isOpen) {
      if (initialTable) {
        setTableId(initialTable.id)
        setTableName(initialTable.name)
        setDisplayTitle(initialTable.display_title || initialTable.name)
        setDescription(initialTable.description || '')
        setDataSource(initialTable.data_source || 'Montagem da Programação')
        setShowTitle(initialTable.show_title ?? true)
        setAllowAiCompletion(initialTable.allow_ai_completion ?? true)
        setAllowManualEdit(initialTable.allow_manual_edit ?? true)
        setAiFillInstructions(
          initialTable.ai_fill_instructions ||
            'Preencher os registros da tabela com base na fonte indicada. Não inventar valores numéricos. Quando não houver dado, preencher com "Dado não disponível".',
        )
        setIsDynamic(Boolean(initialTable.is_dynamic))
        setColumns(JSON.parse(JSON.stringify(initialTable.columns || [])))
        setRows(JSON.parse(JSON.stringify(initialTable.rows || [])))
        setTotalizerEnabled(Boolean(initialTable.totalizer?.enabled))
        setTotalizerLabel(initialTable.totalizer?.label || 'Total Geral')
        setTotalizerCols(initialTable.totalizer?.columns_to_totalize || [])
        if (initialTable.columns && initialTable.columns.length > 0) {
          setSelectedColumnId(initialTable.columns[0].id)
        }
      } else {
        // Modelo novo baseado no exemplo homologado: Produto / Qtd Prog / Qtd Real / Atendimento % / Justificativa
        const defaultTbl = pcpMonthlySummaryService.createDefaultCustomTable({
          name: `Tabela Analítica - Seção ${sectionNumber || ''}`.trim(),
          display_title: `Análise Operacional de Entregas - ${sectionTitle}`,
        })
        setTableId(defaultTbl.id)
        setTableName(defaultTbl.name)
        setDisplayTitle(defaultTbl.display_title)
        setDescription(defaultTbl.description || '')
        setDataSource(defaultTbl.data_source)
        setShowTitle(defaultTbl.show_title)
        setAllowAiCompletion(defaultTbl.allow_ai_completion)
        setAllowManualEdit(defaultTbl.allow_manual_edit)
        setAiFillInstructions(
          defaultTbl.ai_fill_instructions ||
            'Preencher com rigor os dados da tabela confrontando ordens de produção e apontamentos de expedição. Não inventar números.',
        )
        setIsDynamic(false)
        setColumns(defaultTbl.columns)
        setRows(defaultTbl.rows)
        setTotalizerEnabled(Boolean(defaultTbl.totalizer?.enabled))
        setTotalizerLabel(defaultTbl.totalizer?.label || 'Total Consolidado')
        setTotalizerCols(defaultTbl.totalizer?.columns_to_totalize || [])
        setSelectedColumnId(defaultTbl.columns[0]?.id || null)
      }
      setValidationError(null)
      setActiveTab('editor')
    }
  }, [isOpen, initialTable, sectionTitle, sectionNumber])

  // ==========================================
  // OPERAÇÕES DE COLUNAS
  // ==========================================
  const handleAddColumn = () => {
    const newIdx = columns.length + 1
    const newColId = `col_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    const newCol: TableColumnConfig = {
      id: newColId,
      name: `Nova Coluna ${newIdx}`,
      order: newIdx,
      field_type: 'TEXTO',
      data_source: dataSource,
      is_required: false,
      width_px: 150,
    }
    const updated = [...columns, newCol]
    setColumns(updated)
    setSelectedColumnId(newColId)

    // Inicializa células correspondentes nas linhas
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        cells: {
          ...r.cells,
          [newColId]: '',
        },
      })),
    )
  }

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      alert('A tabela deve conter ao menos uma coluna.')
      return
    }
    const filtered = columns
      .filter((c) => c.id !== colId)
      .map((c, idx) => ({ ...c, order: idx + 1 }))
    setColumns(filtered)
    setTotalizerCols((prev) => prev.filter((id) => id !== colId))
    if (selectedColumnId === colId) {
      setSelectedColumnId(filtered[0]?.id || null)
    }
  }

  const handleDuplicateColumn = (colId: string) => {
    const sourceCol = columns.find((c) => c.id === colId)
    if (!sourceCol) return
    const newColId = `col_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    const dupCol: TableColumnConfig = {
      ...sourceCol,
      id: newColId,
      name: `${sourceCol.name} (Cópia)`,
      order: columns.length + 1,
    }
    setColumns([...columns, dupCol])
    setSelectedColumnId(newColId)

    // Copiar células nas linhas
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        cells: {
          ...r.cells,
          [newColId]: r.cells[colId] ?? '',
        },
      })),
    )
  }

  const handleMoveColumn = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= columns.length) return
    const updated = [...columns]
    const item = updated.splice(index, 1)[0]
    updated.splice(targetIndex, 0, item)
    setColumns(updated.map((c, idx) => ({ ...c, order: idx + 1 })))
  }

  const handleUpdateColumn = (colId: string, patch: Partial<TableColumnConfig>) => {
    setColumns((prev) =>
      prev.map((c) => {
        if (c.id === colId) {
          return { ...c, ...patch }
        }
        return c
      }),
    )
  }

  // ==========================================
  // OPERAÇÕES DE LINHAS
  // ==========================================
  const handleAddRow = () => {
    const newIdx = rows.length + 1
    const newRowId = `row_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    const emptyCells: Record<string, any> = {}
    columns.forEach((c) => {
      emptyCells[c.id] = c.default_value ?? ''
    })
    const newRow: TableRowConfig = {
      id: newRowId,
      order: newIdx,
      label: `Item ${newIdx}`,
      cells: emptyCells,
    }
    setRows([...rows, newRow])
  }

  const handleDeleteRow = (rowId: string) => {
    if (rows.length <= 1) {
      alert('A tabela deve conter ao menos uma linha.')
      return
    }
    const filtered = rows
      .filter((r) => r.id !== rowId)
      .map((r, idx) => ({ ...r, order: idx + 1, label: r.label || `Item ${idx + 1}` }))
    setRows(filtered)
  }

  const handleDuplicateRow = (rowId: string) => {
    const sourceRow = rows.find((r) => r.id === rowId)
    if (!sourceRow) return
    const newRowId = `row_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`
    const dupRow: TableRowConfig = {
      id: newRowId,
      order: rows.length + 1,
      label: `${sourceRow.label || 'Item'} (Cópia)`,
      cells: { ...sourceRow.cells },
    }
    setRows([...rows, dupRow])
  }

  const handleMoveRow = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= rows.length) return
    const updated = [...rows]
    const item = updated.splice(index, 1)[0]
    updated.splice(targetIndex, 0, item)
    setRows(updated.map((r, idx) => ({ ...r, order: idx + 1 })))
  }

  const handleUpdateCell = (rowId: string, colId: string, val: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            cells: {
              ...r.cells,
              [colId]: val,
            },
          }
        }
        return r
      }),
    )
  }

  // ==========================================
  // CÁLCULOS AUTOMÁTICOS & TOTALIZADORES
  // ==========================================
  // Avaliação dinâmica de fórmulas simples (ex: [col_a] / [col_b] * 100)
  const evaluatedRows = useMemo(() => {
    return rows.map((r) => {
      const computedCells = { ...r.cells }
      columns.forEach((col) => {
        if (col.field_type === 'CAMPO_CALCULADO' && col.calculation_rule) {
          try {
            let formula = col.calculation_rule
            // Substitui nomes das colunas e IDs pelos valores numéricos
            columns.forEach((otherCol) => {
              const rawVal = r.cells[otherCol.id]
              const numVal =
                typeof rawVal === 'number'
                  ? rawVal
                  : parseFloat(String(rawVal || '0').replace(',', '.')) || 0
              // Regex para substituir [Nome da Coluna] ou [col_id]
              const escapedName = otherCol.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              formula = formula.replace(new RegExp(`\\[${escapedName}\\]`, 'gi'), String(numVal))
              formula = formula.replace(new RegExp(`\\[${otherCol.id}\\]`, 'gi'), String(numVal))
            })
            // Avaliação segura da expressão matemática (apenas números, operadores +, -, *, /, (, ), ., espaços)
            if (/^[0-9+\-*/().\s]+$/.test(formula)) {
              // eslint-disable-next-line no-new-func
              const result = Function(`"use strict"; return (${formula})`)()
              if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
                computedCells[col.id] = Math.round(result * 100) / 100
              }
            }
          } catch {
            /* fórmula inválida, mantém original */
          }
        }
      })
      return {
        ...r,
        cells: computedCells,
      }
    })
  }, [rows, columns])

  // Totalizadores calculados
  const calculatedTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    if (!totalizerEnabled) return totals

    columns.forEach((col) => {
      if (
        totalizerCols.includes(col.id) ||
        col.field_type === 'QUANTIDADE' ||
        col.field_type === 'NUMERO_DECIMAL' ||
        col.field_type === 'NUMERO_INTEIRO' ||
        col.field_type === 'MOEDA'
      ) {
        let sum = 0
        let count = 0
        evaluatedRows.forEach((r) => {
          const val = r.cells[col.id]
          const num =
            typeof val === 'number' ? val : parseFloat(String(val || '0').replace(',', '.')) || 0
          if (!isNaN(num)) {
            sum += num
            count++
          }
        })

        if (col.field_type === 'PERCENTUAL') {
          totals[col.id] = count > 0 ? sum / count : 0
        } else {
          totals[col.id] = sum
        }
      }
    })
    return totals
  }, [evaluatedRows, columns, totalizerEnabled, totalizerCols])

  // ==========================================
  // PREENCHIMENTO POR IA COM AGENTE NATIVO
  // ==========================================
  const handleTriggerAiFill = async () => {
    if (columns.length === 0) {
      setValidationError('Adicione ao menos uma coluna antes de solicitar preenchimento por IA.')
      return
    }

    // Montar objeto de tabela atual
    const currentTableObj: CustomTableConfig = {
      id: tableId || `tbl_${Date.now().toString(36)}`,
      name: tableName.trim() || 'Tabela Customizada',
      display_title: displayTitle.trim() || tableName.trim() || 'Tabela Customizada',
      description: description.trim(),
      data_source: dataSource,
      show_title: showTitle,
      allow_ai_completion: allowAiCompletion,
      allow_manual_edit: allowManualEdit,
      ai_fill_instructions:
        aiFillInstructions.trim() ||
        'Preencher os registros da tabela com base na fonte indicada. Não inventar valores numéricos. Sem dado na fonte, preencher com "Dado não disponível".',
      is_dynamic: isDynamic,
      columns,
      rows,
      initial_rows_count: rows.length,
      initial_cols_count: columns.length,
      totalizer: {
        enabled: totalizerEnabled,
        label: totalizerLabel.trim() || 'Total Geral',
        columns_to_totalize: totalizerCols,
        total_function: 'SUM',
      },
      updated_at: new Date().toISOString(),
    }

    setIsAiFilling(true)
    setValidationError(null)

    try {
      const res = await pcpMonthlySummaryService.fillTableWithAi({
        table: currentTableObj,
        lineCode: 'L1',
        period: '',
        userInstructions: aiCustomInstructions,
      })

      // Regra de Integridade CIAFAL: verificar se a IA tentou alterar estrutura de colunas
      const originalColIds = new Set(columns.map((c) => c.id))
      const resColIds = new Set(res.table.columns.map((c) => c.id))
      const hasStructureTampered =
        originalColIds.size !== resColIds.size ||
        [...originalColIds].some((id) => !resColIds.has(id))

      if (hasStructureTampered) {
        setValidationError(
          'A resposta da IA tentou alterar a estrutura de colunas do template sem autorização. Operação rejeitada para preservar o schema homologado.',
        )
        setIsAiFilling(false)
        return
      }

      setAiFillResult({
        proposedTable: res.table,
        missingDataAlerts: res.missingDataAlerts,
        divergenceAlerts: res.divergenceAlerts,
        filledCount: res.filledCount,
        unfilledCount: res.unfilledCount,
      })
      setIsAiReviewModalOpen(true)
    } catch (err: any) {
      setValidationError(
        `Erro ao executar preenchimento por IA: ${err.message || 'Falha de comunicação com o backend.'}`,
      )
    } finally {
      setIsAiFilling(false)
    }
  }

  const handleApplyAiReview = () => {
    if (!aiFillResult) return
    setRows(aiFillResult.proposedTable.rows)
    setIsAiReviewModalOpen(false)
    setAiFillResult(null)
  }

  // ==========================================
  // SALVAR TABELA
  // ==========================================
  const handleSave = () => {
    if (!tableName.trim()) {
      setValidationError('O Nome da Tabela é obrigatório.')
      setActiveTab('settings')
      return
    }

    if (!aiFillInstructions.trim()) {
      setValidationError('O campo "Instruções para Preenchimento por IA" é obrigatório.')
      setActiveTab('settings')
      return
    }

    if (columns.length === 0) {
      setValidationError('A tabela deve conter ao menos uma coluna.')
      setActiveTab('columns')
      return
    }

    const payload: CustomTableConfig = {
      id: tableId || `tbl_${Date.now().toString(36)}`,
      name: tableName.trim(),
      display_title: displayTitle.trim() || tableName.trim(),
      description: description.trim(),
      data_source: dataSource,
      show_title: showTitle,
      allow_ai_completion: allowAiCompletion,
      allow_manual_edit: allowManualEdit,
      ai_fill_instructions: aiFillInstructions.trim(),
      is_dynamic: isDynamic,
      columns,
      rows: evaluatedRows,
      initial_rows_count: evaluatedRows.length,
      initial_cols_count: columns.length,
      totalizer: {
        enabled: totalizerEnabled,
        label: totalizerLabel.trim() || 'Total Geral',
        columns_to_totalize: totalizerCols,
        total_function: 'SUM',
      },
      updated_at: new Date().toISOString(),
    }

    onSaveTable(payload)
    onClose()
  }

  const selectedCol = columns.find((c) => c.id === selectedColumnId) || columns[0]

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 bg-slate-50 overflow-hidden shadow-2xl border-slate-300">
        <ErrorBoundary>
          {/* Header Institucional CIAFAL */}
          <DialogHeader className="p-4 bg-linear-to-r from-[#004C97] to-[#003366] text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-lg">
                  <TableIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    <span>Construtor de Tabelas Analíticas</span>
                    <Badge className="bg-emerald-500 text-white font-mono text-[10px]">
                      PCP Robotizado
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-blue-100 flex items-center gap-1.5 mt-0.5">
                    <span>Seção Vinculada:</span>
                    <strong className="text-white">
                      #{sectionNumber || '1'} - {sectionTitle}
                    </strong>
                    <span className="text-blue-200 font-mono text-[10px]">({tableId})</span>
                  </DialogDescription>
                </div>
              </div>

              {/* Botões rápidos do header */}
              <div className="flex items-center gap-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="bg-white/15 text-white border border-white/20 h-8">
                    <TabsTrigger
                      value="editor"
                      className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
                    >
                      Grade Visual
                    </TabsTrigger>
                    <TabsTrigger
                      value="columns"
                      className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
                    >
                      Colunas ({columns.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="settings"
                      className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
                    >
                      Identificação & IA
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#004C97]"
                    >
                      Prévia do Relatório
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </DialogHeader>

          {/* Alerta de validação */}
          {validationError && (
            <Alert className="mx-4 mt-3 bg-rose-50 border-rose-300 text-rose-900 text-xs py-2">
              <AlertDescription className="font-medium flex items-center justify-between">
                <span>{validationError}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setValidationError(null)}
                  className="h-5 px-1.5 text-xs text-rose-700"
                >
                  Fechar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Corpo do Modal com Scroll Interno Apropriado */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* ============================================================== */}
            {/* ABA 1: GRADE VISUAL (EDITOR INTERATIVO LINHAS X COLUNAS) */}
            {/* ============================================================== */}
            {activeTab === 'editor' && (
              <div className="space-y-3">
                {/* Barra de Ações Rápidas da Grade */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddColumn}
                      className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-1.5 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Coluna</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddRow}
                      className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-100 font-bold gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-500" />
                      <span>Adicionar Linha</span>
                    </Button>

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    {/* BOTÃO PREENCHER COM IA */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleTriggerAiFill}
                      disabled={isAiFilling}
                      className="h-8 text-xs bg-linear-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold gap-1.5 shadow-xs"
                    >
                      {isAiFilling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Preenchendo...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Preencher com IA</span>
                        </>
                      )}
                    </Button>

                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                      {columns.length} Colunas &bull; {rows.length} Linhas
                    </Badge>

                    {isDynamic && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                        Linhas Dinâmicas por Registros da Fonte
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Switch
                        checked={totalizerEnabled}
                        onCheckedChange={setTotalizerEnabled}
                        className="scale-75"
                      />
                      <span className="font-semibold">Linha de Totalização</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <Switch
                        checked={showTitle}
                        onCheckedChange={setShowTitle}
                        className="scale-75"
                      />
                      <span className="font-semibold">Exibir Título</span>
                    </label>
                  </div>
                </div>

                {/* Grade Interativa com ROLAGEM HORIZONTAL INTERNA */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
                  {/* Cabeçalho do Título se Habilitado */}
                  {showTitle && (
                    <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-800 tracking-wide">
                        {displayTitle || tableName || 'Tabela Sem Título'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Fonte: <strong className="text-slate-700">{dataSource}</strong>
                      </div>
                    </div>
                  )}

                  {/* Wrapper com Rolagem Horizontal ESTREITA e Segura (não estoura página) */}
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-xs text-left border-collapse min-w-[750px]">
                      {/* Cabeçalho das Colunas */}
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                          <th className="w-12 py-2 px-2 text-center text-[10px] font-mono text-slate-400">
                            #
                          </th>
                          <th className="w-28 py-2 px-2 text-[10px] font-bold uppercase text-slate-600">
                            Rótulo da Linha
                          </th>
                          {columns.map((col, cIdx) => (
                            <th
                              key={col.id}
                              style={{ minWidth: col.width_px ? `${col.width_px}px` : '150px' }}
                              className="py-2 px-2 font-bold text-slate-800 border-l border-slate-200/60 group relative"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="truncate">
                                  <div className="truncate font-semibold text-slate-900">
                                    {col.name}
                                  </div>
                                  <div className="text-[10px] font-mono font-normal text-slate-500 flex items-center gap-1">
                                    <span>{col.field_type}</span>
                                    {col.unit_of_measure && (
                                      <span className="text-indigo-600">
                                        ({col.unit_of_measure})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Ações rápidas de coluna no header */}
                                <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={cIdx === 0}
                                    onClick={() => handleMoveColumn(cIdx, 'left')}
                                    className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700"
                                    title="Mover para a esquerda"
                                  >
                                    <ArrowUp className="w-3 h-3 -rotate-90" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={cIdx === columns.length - 1}
                                    onClick={() => handleMoveColumn(cIdx, 'right')}
                                    className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700"
                                    title="Mover para a direita"
                                  >
                                    <ArrowDown className="w-3 h-3 -rotate-90" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDuplicateColumn(col.id)}
                                    className="h-5 w-5 p-0 text-slate-400 hover:text-indigo-600"
                                    title="Duplicar coluna"
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteColumn(col.id)}
                                    className="h-5 w-5 p-0 text-slate-400 hover:text-rose-600"
                                    title="Excluir coluna"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </th>
                          ))}
                          <th className="w-20 py-2 px-2 text-center text-[10px] font-bold text-slate-500 border-l border-slate-200">
                            Ações
                          </th>
                        </tr>
                      </thead>

                      {/* Corpo com Linhas Editáveis */}
                      <tbody className="divide-y divide-slate-100">
                        {evaluatedRows.map((row, rIdx) => (
                          <tr key={row.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-400">
                              {rIdx + 1}
                            </td>

                            {/* Rótulo da Linha */}
                            <td className="py-1 px-2">
                              <Input
                                type="text"
                                value={row.label || ''}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setRows((prev) =>
                                    prev.map((r) => (r.id === row.id ? { ...r, label: val } : r)),
                                  )
                                }}
                                placeholder={`Item ${rIdx + 1}`}
                                className="h-7 text-xs font-semibold bg-white border-slate-200"
                              />
                            </td>

                            {/* Células por Coluna */}
                            {columns.map((col) => {
                              const cellVal = row.cells[col.id] ?? ''
                              const isCalculated = col.field_type === 'CAMPO_CALCULADO'
                              const isAiField = col.field_type === 'INFORMACAO_IA'

                              return (
                                <td key={col.id} className="py-1 px-2 border-l border-slate-100">
                                  {isCalculated ? (
                                    <div className="h-7 px-2 bg-indigo-50/50 rounded border border-indigo-100 text-xs font-bold text-indigo-900 flex items-center justify-between">
                                      <span>
                                        {formatTableCellValue(
                                          cellVal,
                                          col.field_type,
                                          col.unit_of_measure,
                                        )}
                                      </span>
                                      <span
                                        title={`Calculado: ${col.calculation_rule || 'Fórmula padrão'}`}
                                        className="inline-flex items-center"
                                      >
                                        <Calculator className="w-3 h-3 text-indigo-400" />
                                      </span>
                                    </div>
                                  ) : isAiField ? (
                                    <div className="relative">
                                      <Input
                                        type="text"
                                        value={cellVal}
                                        onChange={(e) =>
                                          handleUpdateCell(row.id, col.id, e.target.value)
                                        }
                                        placeholder="Preenchido por IA..."
                                        className="h-7 text-xs bg-purple-50/30 border-purple-200 text-purple-950 pr-6"
                                      />
                                      <Sparkles className="w-3 h-3 text-purple-500 absolute right-2 top-2 pointer-events-none" />
                                    </div>
                                  ) : (
                                    <Input
                                      type={
                                        col.field_type === 'NUMERO_INTEIRO' ||
                                        col.field_type === 'NUMERO_DECIMAL' ||
                                        col.field_type === 'QUANTIDADE' ||
                                        col.field_type === 'PERCENTUAL' ||
                                        col.field_type === 'MOEDA'
                                          ? 'text'
                                          : col.field_type === 'DATA'
                                            ? 'date'
                                            : col.field_type === 'HORA'
                                              ? 'time'
                                              : 'text'
                                      }
                                      value={cellVal}
                                      onChange={(e) =>
                                        handleUpdateCell(row.id, col.id, e.target.value)
                                      }
                                      placeholder={
                                        col.field_type === 'DATA'
                                          ? 'dd/mm/aaaa'
                                          : col.field_type === 'PERCENTUAL'
                                            ? '0,0'
                                            : 'Valor...'
                                      }
                                      className="h-7 text-xs bg-white border-slate-200"
                                    />
                                  )}
                                </td>
                              )
                            })}

                            {/* Ações da Linha */}
                            <td className="py-1 px-2 border-l border-slate-100 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={rIdx === 0}
                                  onClick={() => handleMoveRow(rIdx, 'up')}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                                  title="Subir linha"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={rIdx === rows.length - 1}
                                  onClick={() => handleMoveRow(rIdx, 'down')}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                                  title="Descer linha"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDuplicateRow(row.id)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600"
                                  title="Duplicar linha"
                                >
                                  <Copy className="w-3 h-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                                  title="Excluir linha"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      {/* Rodapé com Linha de Totalização se habilitada */}
                      {totalizerEnabled && (
                        <tfoot>
                          <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-900">
                            <td className="py-2.5 px-2 text-center text-xs">Σ</td>
                            <td className="py-2.5 px-2 text-xs uppercase tracking-wider text-[#004C97]">
                              {totalizerLabel || 'Total Consolidado'}
                            </td>
                            {columns.map((col) => {
                              const totalVal = calculatedTotals[col.id]
                              return (
                                <td
                                  key={col.id}
                                  className="py-2.5 px-2 border-l border-slate-200 text-xs text-slate-900"
                                >
                                  {totalVal !== undefined ? (
                                    <span className="font-mono font-bold text-[#004C97]">
                                      {formatTableCellValue(
                                        totalVal,
                                        col.field_type,
                                        col.unit_of_measure,
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="py-2.5 px-2 border-l border-slate-200 text-center text-[10px] text-slate-400">
                              Total
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 2: CONFIGURAÇÃO DETALHADA DAS COLUNAS */}
            {/* ============================================================== */}
            {activeTab === 'columns' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lista lateral de colunas */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                      Colunas ({columns.length})
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddColumn}
                      className="h-6 text-[11px] bg-[#004C97] text-white font-bold gap-1 px-2"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nova</span>
                    </Button>
                  </div>

                  <div className="space-y-1.5 max-h-[450px] overflow-y-auto">
                    {columns.map((c, idx) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedColumnId(c.id)}
                        className={`p-2 rounded-md border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          selectedCol?.id === c.id
                            ? 'bg-blue-50/80 border-[#004C97] text-[#004C97] font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge className="bg-slate-200 text-slate-800 font-mono text-[10px] px-1 py-0">
                            #{idx + 1}
                          </Badge>
                          <span className="truncate">{c.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[9px] font-mono shrink-0 uppercase border-slate-300"
                        >
                          {c.field_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Editor da coluna selecionada */}
                <div className="md:col-span-2 p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-4">
                  {selectedCol ? (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{selectedCol.name}</h4>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ID: {selectedCol.id} &bull; Ordem #{selectedCol.order}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateColumn(selectedCol.id)}
                            className="h-7 text-xs text-indigo-700 hover:bg-indigo-50 gap-1"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicar</span>
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteColumn(selectedCol.id)}
                            className="h-7 text-xs text-rose-700 hover:bg-rose-50 gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Nome da Coluna *
                          </Label>
                          <Input
                            type="text"
                            value={selectedCol.name}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, { name: e.target.value })
                            }
                            className="h-8 text-xs bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Tipo de Campo *
                          </Label>
                          <select
                            value={selectedCol.field_type}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, {
                                field_type: e.target.value as TableColumnFieldType,
                              })
                            }
                            className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800 font-bold"
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label} ({ft.desc})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Fonte de Dados da Coluna
                          </Label>
                          <select
                            value={selectedCol.data_source || dataSource}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, { data_source: e.target.value })
                            }
                            className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
                          >
                            {DATA_SOURCES_AVAILABLE.map((ds) => (
                              <option key={ds} value={ds}>
                                {ds}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Campo de Origem no Sistema
                          </Label>
                          <Input
                            type="text"
                            value={selectedCol.source_field || ''}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, { source_field: e.target.value })
                            }
                            placeholder="Ex: quantidade_programada_t / material_codigo"
                            className="h-8 text-xs bg-white font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Unidade de Medida
                          </Label>
                          <Input
                            type="text"
                            value={selectedCol.unit_of_measure || ''}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, {
                                unit_of_measure: e.target.value,
                              })
                            }
                            placeholder="Ex: t, kg, %, mm, h, R$"
                            className="h-8 text-xs bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700">
                            Largura em Pixels (px)
                          </Label>
                          <Input
                            type="number"
                            value={selectedCol.width_px || 150}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, {
                                width_px: parseInt(e.target.value) || 150,
                              })
                            }
                            className="h-8 text-xs bg-white"
                          />
                        </div>
                      </div>

                      {/* Regra de Cálculo se for Campo Calculado */}
                      {selectedCol.field_type === 'CAMPO_CALCULADO' && (
                        <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Fórmula de Cálculo por Linha</span>
                            </Label>
                            <span className="text-[10px] text-indigo-700">
                              Use colchetes: [Nome da Coluna]
                            </span>
                          </div>
                          <Input
                            type="text"
                            value={selectedCol.calculation_rule || ''}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, {
                                calculation_rule: e.target.value,
                              })
                            }
                            placeholder="Ex: [Quantidade Realizada] / [Quantidade Programada] * 100"
                            className="h-8 text-xs bg-white font-mono border-indigo-300"
                          />
                          <p className="text-[11px] text-indigo-900">
                            Exemplo canônico homologado: calcular atendimento percentual através de{' '}
                            <code>[Quantidade Realizada] / [Quantidade Programada] * 100</code>.
                          </p>
                        </div>
                      )}

                      {/* Instruções para Campo Gerado por IA */}
                      {selectedCol.field_type === 'INFORMACAO_IA' && (
                        <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>Diretriz da IA para esta Coluna</span>
                            </Label>
                          </div>
                          <Textarea
                            value={selectedCol.ai_field_instruction || ''}
                            onChange={(e) =>
                              handleUpdateColumn(selectedCol.id, {
                                ai_field_instruction: e.target.value,
                              })
                            }
                            placeholder="Ex: Justificar eventuais desvios com base nas ocorrências de paradas industriais registradas no período..."
                            rows={2}
                            className="text-xs bg-white border-purple-300"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <Switch
                            checked={selectedCol.is_required}
                            onCheckedChange={(v) =>
                              handleUpdateColumn(selectedCol.id, { is_required: v })
                            }
                          />
                          <span>Coluna de Preenchimento Obrigatório</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={totalizerCols.includes(selectedCol.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTotalizerCols([...totalizerCols, selectedCol.id])
                              } else {
                                setTotalizerCols(
                                  totalizerCols.filter((id) => id !== selectedCol.id),
                                )
                              }
                            }}
                            className="rounded text-[#004C97]"
                          />
                          <span>Incluir na Linha de Totalização</span>
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Selecione uma coluna para editar.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 3: IDENTIFICAÇÃO & DIRETRIZES DE IA */}
            {/* ============================================================== */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-3">
                  <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                    Identificação & Parâmetros da Tabela
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Nome da Tabela *
                      </Label>
                      <Input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value)}
                        placeholder="Ex: Análise de Atendimento da Programação"
                        className="h-8 text-xs bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Título Exibido no Relatório
                      </Label>
                      <Input
                        type="text"
                        value={displayTitle}
                        onChange={(e) => setDisplayTitle(e.target.value)}
                        placeholder="Ex: Análise de Atendimento da Programação (Previsto x Realizado)"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">Fonte de Dados</Label>
                      <select
                        value={dataSource}
                        onChange={(e) => setDataSource(e.target.value)}
                        className="w-full h-8 border border-slate-300 rounded text-xs px-2 bg-white text-slate-800"
                      >
                        {DATA_SOURCES_AVAILABLE.map((ds) => (
                          <option key={ds} value={ds}>
                            {ds}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">
                        Descrição da Tabela
                      </Label>
                      <Input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Finalidade e escopo das métricas..."
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer">
                      <Switch checked={showTitle} onCheckedChange={setShowTitle} />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Exibir Título</div>
                        <div className="text-[10px] text-slate-500">No cabeçalho da tabela</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer">
                      <Switch checked={allowAiCompletion} onCheckedChange={setAllowAiCompletion} />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Preenchimento por IA</div>
                        <div className="text-[10px] text-slate-500">Permitir geração nativa</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded border border-slate-200 bg-slate-50 cursor-pointer">
                      <Switch checked={allowManualEdit} onCheckedChange={setAllowManualEdit} />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Edição Manual</div>
                        <div className="text-[10px] text-slate-500">Permitir ajuste no resumo</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Bloco Obrigatório: Instruções para Preenchimento por IA */}
                <div className="p-4 bg-linear-to-r from-indigo-50/90 to-purple-50/90 rounded-lg border border-indigo-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-indigo-950 uppercase flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span>Instruções para Preenchimento por IA (Obrigatório) *</span>
                    </Label>
                    <Badge className="bg-indigo-600 text-white text-[10px]">
                      Diretriz de Execução
                    </Badge>
                  </div>

                  <Textarea
                    value={aiFillInstructions}
                    onChange={(e) => setAiFillInstructions(e.target.value)}
                    placeholder="Instruções para o agente preencher as células da tabela a partir dos dados consolidados..."
                    rows={3}
                    className="text-xs bg-white border-indigo-200 focus:border-indigo-500"
                    required
                  />

                  <p className="text-[11px] text-indigo-900 leading-relaxed">
                    Diretriz padrão: quando não houver registros suficientes no ERP, o agente deve
                    preencher explicitamente com <code>"Dado não disponível"</code> ou{' '}
                    <code>"Sem ocorrências"</code>, sem inventar valores numéricos.
                  </p>
                </div>

                {/* Comportamento de Linhas (Fixas vs Dinâmicas) */}
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="font-bold text-xs uppercase text-[#004C97] tracking-wider">
                    Geração das Linhas da Tabela
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setIsDynamic(false)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        !isDynamic
                          ? 'border-[#004C97] bg-blue-50/60 font-medium'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">
                        Linhas Fixas Parametrizadas
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        A tabela exibirá exatamente as {rows.length} linhas cadastradas no editor
                        com seus rótulos e células padrão.
                      </div>
                    </div>

                    <div
                      onClick={() => setIsDynamic(true)}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        isDynamic
                          ? 'border-[#004C97] bg-blue-50/60 font-medium'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">
                        Linhas Dinâmicas Geradas pela Fonte
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        As linhas serão geradas dinamicamente a partir dos registros reais da fonte{' '}
                        <strong>({dataSource})</strong> no momento da consolidação.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* ABA 4: PRÉVIA DO RELATÓRIO FORMATADO NO PADRÃO BRASILEIRO */}
            {/* ============================================================== */}
            {activeTab === 'preview' && (
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {displayTitle || tableName || 'Tabela Sem Título'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {description ||
                          'Prévia oficial do componente como aparecerá no Resumo Mensal'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-[#004C97] text-xs">
                      Formatação pt-BR Oficial
                    </Badge>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-2xs">
                  <table className="w-full text-xs text-left min-w-[700px]">
                    <thead className="bg-[#004C97] text-white font-semibold text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 uppercase text-[10px]">Item</th>
                        {columns.map((c) => (
                          <th key={c.id} className="py-2.5 px-3">
                            <div>{c.name}</div>
                            {c.unit_of_measure && (
                              <div className="text-[9px] font-normal text-blue-200">
                                ({c.unit_of_measure})
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {evaluatedRows.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {r.label || `Item ${idx + 1}`}
                          </td>
                          {columns.map((c) => (
                            <td key={c.id} className="py-2.5 px-3 text-slate-800 font-medium">
                              {formatTableCellValue(r.cells[c.id], c.field_type, c.unit_of_measure)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {totalizerEnabled && (
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                          <td className="py-2.5 px-3 uppercase text-[#004C97]">
                            {totalizerLabel || 'Total Consolidado'}
                          </td>
                          {columns.map((c) => {
                            const tot = calculatedTotals[c.id]
                            return (
                              <td key={c.id} className="py-2.5 px-3 font-bold text-[#004C97]">
                                {tot !== undefined
                                  ? formatTableCellValue(tot, c.field_type, c.unit_of_measure)
                                  : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Modal / Diálogo de Revisão do Preenchimento Inteligente */}
          {isAiReviewModalOpen && aiFillResult && (
            <Dialog open={isAiReviewModalOpen} onOpenChange={setIsAiReviewModalOpen}>
              <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 bg-white shadow-2xl border-indigo-200">
                <DialogHeader className="p-4 bg-linear-to-r from-indigo-900 via-purple-900 to-[#004C97] text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                      <div>
                        <DialogTitle className="text-base font-bold text-white">
                          Revisão do Preenchimento Inteligente (Agente Nativo CIAFAL)
                        </DialogTitle>
                        <DialogDescription className="text-xs text-indigo-200">
                          Revise os dados preenchidos a partir das fontes autorizadas antes de
                          aplicar à tabela
                        </DialogDescription>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white text-xs">
                      Validação Determinística Aplicada
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                  {/* Resumo de Indicadores */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                      <div className="text-xs font-semibold text-emerald-800">
                        Células Preenchidas
                      </div>
                      <div className="text-2xl font-black text-emerald-700 mt-0.5">
                        {aiFillResult.filledCount}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                      <div className="text-xs font-semibold text-amber-800">
                        Dados Ausentes na Fonte
                      </div>
                      <div className="text-2xl font-black text-amber-700 mt-0.5">
                        {aiFillResult.unfilledCount}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <div className="text-xs font-semibold text-blue-800">Linhas Processadas</div>
                      <div className="text-2xl font-black text-blue-700 mt-0.5">
                        {aiFillResult.proposedTable.rows.length}
                      </div>
                    </div>
                  </div>

                  {/* Alertas de Dados Ausentes */}
                  {aiFillResult.missingDataAlerts.length > 0 && (
                    <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-lg space-y-1.5">
                      <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Sinalização de Dados Ausentes nas Fontes Autorizadas:</span>
                      </div>
                      <ul className="text-[11px] text-amber-800 space-y-1 list-disc pl-5">
                        {aiFillResult.missingDataAlerts.map((alert, idx) => (
                          <li key={idx}>{alert}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-amber-700 font-medium pt-1">
                        * Conforme as diretrizes CIAFAL, células sem registro oficial foram mantidas
                        como &quot;Dado não disponível&quot; (nunca zero).
                      </p>
                    </div>
                  )}

                  {/* Alertas de Divergência */}
                  {aiFillResult.divergenceAlerts.length > 0 && (
                    <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-lg space-y-1.5">
                      <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Divergências Identificadas & Reconciliadas:</span>
                      </div>
                      <ul className="text-[11px] text-rose-800 space-y-1 list-disc pl-5">
                        {aiFillResult.divergenceAlerts.map((divAlert, idx) => (
                          <li key={idx}>{divAlert}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Prévia da Tabela Preenchida */}
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[650px]">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          {columns.map((c) => (
                            <th key={c.id} className="py-2 px-3">
                              {c.name} {c.unit_of_measure ? `(${c.unit_of_measure})` : ''}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiFillResult.proposedTable.rows.map((row, rIdx) => (
                          <tr key={row.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {row.label || `Item ${rIdx + 1}`}
                            </td>
                            {columns.map((c) => {
                              const val = row.cells[c.id]
                              const isMissing = val === 'Dado não disponível'
                              return (
                                <td key={c.id} className="py-2 px-3">
                                  {isMissing ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800">
                                      Dado não disponível
                                    </span>
                                  ) : (
                                    <span className="font-medium text-slate-800">
                                      {formatTableCellValue(val, c.field_type, c.unit_of_measure)}
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAiReviewModalOpen(false)
                      setAiFillResult(null)
                    }}
                    className="text-xs"
                  >
                    Descartar Preenchimento
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyAiReview}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 px-4 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirmar e Aplicar à Grade</span>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Rodapé Acessível com Botões Claros */}
          <DialogFooter className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveTab(activeTab === 'preview' ? 'editor' : 'preview')}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100 gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>{activeTab === 'preview' ? 'Voltar para Grade' : 'Visualizar Prévia'}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="text-xs bg-[#004C97] hover:bg-[#003870] text-white font-bold gap-2 px-5 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvar Tabela</span>
              </Button>
            </div>
          </DialogFooter>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}

export default TableBuilderModal
