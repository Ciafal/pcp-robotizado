import React from 'react'
import {
  CustomTableConfig,
  TableColumnConfig,
  TableRowConfig,
} from '@/services/pcp-monthly-summaries'
import { Badge } from '@/components/ui/badge'
import { Table, Sparkles, Database, Calculator } from 'lucide-react'

interface SummaryTableRendererProps {
  table: CustomTableConfig
  sectionKey?: string
  sectionTitle?: string
  readOnly?: boolean
  className?: string
}

/**
 * Formata valores de células segundo padrão brasileiro (pt-BR)
 * 1.234,56 / 91,0% / R$ 1.234,56 / dd/mm/aaaa
 * NUNCA inventa zero quando o dado não estiver disponível -> "Dado não disponível"
 */
export function formatCellValuePtBr(value: any, column: TableColumnConfig): string {
  if (
    value === undefined ||
    value === null ||
    value === '' ||
    value === 'Dado não disponível' ||
    value === '—' ||
    value === 'N/A'
  ) {
    return 'Dado não disponível'
  }

  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  const isNumeric = !isNaN(num)

  switch (column.field_type) {
    case 'QUANTIDADE':
    case 'NUMERO_DECIMAL': {
      if (!isNumeric) return String(value)
      const formatted = num.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })
      return column.unit_of_measure ? `${formatted} ${column.unit_of_measure}` : formatted
    }

    case 'NUMERO_INTEIRO': {
      if (!isNumeric) return String(value)
      const formatted = Math.round(num).toLocaleString('pt-BR')
      return column.unit_of_measure ? `${formatted} ${column.unit_of_measure}` : formatted
    }

    case 'PERCENTUAL': {
      if (!isNumeric) return String(value)
      const pctFormatted = num.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })
      return `${pctFormatted}%`
    }

    case 'MOEDA': {
      if (!isNumeric) return String(value)
      return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    }

    case 'CAMPO_CALCULADO': {
      if (!isNumeric) return String(value)
      const formatted = num.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })
      return column.unit_of_measure ? `${formatted} ${column.unit_of_measure}` : formatted
    }

    case 'DATA': {
      if (typeof value === 'string' && value.includes('-')) {
        const parts = value.split('T')[0].split('-')
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`
        }
      }
      return String(value)
    }

    case 'INFORMACAO_IA':
    case 'STATUS':
    case 'TEXTO':
    default:
      return String(value)
  }
}

/**
 * Calcula o totalizador da coluna se habilitado
 */
export function calculateColumnTotal(
  colId: string,
  rows: TableRowConfig[],
  column: TableColumnConfig,
  totalFunction: 'SUM' | 'AVERAGE' | 'COUNT' = 'SUM',
): string {
  const values: number[] = []
  rows.forEach((r) => {
    const raw = r.cells?.[colId]
    if (raw !== undefined && raw !== null && raw !== '' && raw !== 'Dado não disponível') {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'))
      if (!isNaN(n)) values.push(n)
    }
  })

  if (values.length === 0) return '—'

  let res = 0
  if (totalFunction === 'SUM') {
    res = values.reduce((a, b) => a + b, 0)
  } else if (totalFunction === 'AVERAGE') {
    res = values.reduce((a, b) => a + b, 0) / values.length
  } else if (totalFunction === 'COUNT') {
    return `${values.length}`
  }

  return formatCellValuePtBr(res, column)
}

export const SummaryTableRenderer: React.FC<SummaryTableRendererProps> = ({
  table,
  sectionTitle,
  className = '',
}) => {
  if (!table || !Array.isArray(table.columns) || table.columns.length === 0) {
    return null
  }

  const columns = [...table.columns].sort((a, b) => a.order - b.order)
  const rows = [...(table.rows || [])].sort((a, b) => a.order - b.order)
  const totalizer = table.totalizer

  return (
    <div
      className={`border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs my-3 ${className}`}
      data-testid={`summary-table-${table.id}`}
    >
      {/* Cabeçalho da Tabela */}
      {table.show_title !== false && (
        <div className="bg-slate-50/80 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[#004C97]" />
            <span className="font-bold text-xs text-slate-800 tracking-tight">
              {table.display_title || table.name}
            </span>
            {table.is_dynamic ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-sky-50 text-sky-800 border-sky-200"
              >
                Linhas Dinâmicas
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700">
                Estrutura Fixa
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            {table.data_source && (
              <span className="inline-flex items-center gap-1">
                <Database className="w-3 h-3 text-slate-400" />
                <span>{table.data_source}</span>
              </span>
            )}
            {table.allow_ai_completion && (
              <span className="inline-flex items-center gap-1 text-sky-700 font-medium">
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span>IA Autorizada</span>
              </span>
            )}
          </div>
        </div>
      )}

      {table.description && (
        <div className="px-3 py-1.5 bg-slate-50/40 text-[11px] text-slate-500 border-b border-slate-100 italic">
          {table.description}
        </div>
      )}

      {/* Grid da Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-[11px] uppercase font-bold">
              <th className="py-2 px-3 w-10 text-center text-slate-400">#</th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width_px ? `${col.width_px}px` : undefined }}
                  className="py-2 px-3 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>{col.name}</span>
                    {col.unit_of_measure && (
                      <span className="text-[10px] font-normal text-slate-400 lowercase">
                        ({col.unit_of_measure})
                      </span>
                    )}
                    {col.field_type === 'CAMPO_CALCULADO' && (
                      <Calculator className="w-3 h-3 text-emerald-600 shrink-0" />
                    )}
                    {col.field_type === 'INFORMACAO_IA' && (
                      <Sparkles className="w-3 h-3 text-sky-600 shrink-0" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-center py-4 text-xs text-slate-400 italic"
                >
                  Nenhum registro configurado nesta tabela.
                </td>
              </tr>
            ) : (
              rows.map((row, rIdx) => (
                <tr
                  key={row.id || `row_${rIdx}`}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <td className="py-2 px-3 text-center text-[10px] text-slate-400 font-mono">
                    {rIdx + 1}
                  </td>
                  {columns.map((col) => {
                    const rawVal = row.cells?.[col.id]
                    const formatted = formatCellValuePtBr(rawVal, col)
                    const isMissing = formatted === 'Dado não disponível'
                    const isNumeric =
                      col.field_type === 'QUANTIDADE' ||
                      col.field_type === 'NUMERO_DECIMAL' ||
                      col.field_type === 'NUMERO_INTEIRO' ||
                      col.field_type === 'PERCENTUAL' ||
                      col.field_type === 'MOEDA' ||
                      col.field_type === 'CAMPO_CALCULADO'

                    return (
                      <td
                        key={col.id}
                        className={`py-2 px-3 ${
                          isNumeric ? 'text-right font-mono' : 'text-left'
                        } ${isMissing ? 'text-amber-700 italic bg-amber-50/30' : 'text-slate-800'}`}
                      >
                        {isMissing ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-50 border border-amber-200 text-amber-800">
                            Dado não disponível
                          </span>
                        ) : col.field_type === 'PERCENTUAL' ? (
                          <span className="font-bold text-[#004C97]">{formatted}</span>
                        ) : (
                          formatted
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>

          {/* Linha de Totalização se configurada */}
          {totalizer?.enabled && rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={2} className="py-2 px-3">
                  {totalizer.label || 'Total'}
                </td>
                {columns.slice(1).map((col) => {
                  const shouldTotalize = totalizer.columns_to_totalize?.includes(col.id)
                  const isNumeric =
                    col.field_type === 'QUANTIDADE' ||
                    col.field_type === 'NUMERO_DECIMAL' ||
                    col.field_type === 'NUMERO_INTEIRO' ||
                    col.field_type === 'PERCENTUAL' ||
                    col.field_type === 'MOEDA' ||
                    col.field_type === 'CAMPO_CALCULADO'

                  if (!shouldTotalize || !isNumeric) {
                    return (
                      <td key={col.id} className="py-2 px-3 text-center text-slate-400">
                        —
                      </td>
                    )
                  }

                  const totalFormatted = calculateColumnTotal(
                    col.id,
                    rows,
                    col,
                    totalizer.total_function || 'SUM',
                  )
                  return (
                    <td key={col.id} className="py-2 px-3 text-right font-mono text-slate-900">
                      {totalFormatted}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

export default SummaryTableRenderer
