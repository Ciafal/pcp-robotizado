import React from 'react'
import { formatCellValuePtBr, calculateColumnTotal } from './SummaryTableRenderer'

const ND = 'Dado não disponível'

const NUMERIC_TYPES = [
  'QUANTIDADE',
  'NUMERO_DECIMAL',
  'NUMERO_INTEIRO',
  'PERCENTUAL',
  'MOEDA',
  'CAMPO_CALCULADO',
]

interface SummaryPdfTableProps {
  /** Configuração da tabela parametrizada (CustomTableConfig ou pseudo-tabela derivada) */
  table: any
  /** Linhas deste fragmento (a paginação por linhas é feita fora, por bloco) */
  rows: any[]
  /** Índice global da primeira linha deste fragmento (numeração contínua entre páginas) */
  startIndex?: number
  /** Exibir a linha de totalização (apenas no último fragmento) */
  showTotalizer?: boolean
  /** TODAS as linhas da tabela — o totalizador calcula sobre a tabela inteira,
   *  nunca só sobre o fragmento da página. */
  totalSourceRows?: any[]
}

/**
 * Tabela com grid PRÓPRIO para o PDF: 100% da largura imprimível (184 mm),
 * células com quebra de palavra, linhas indivisíveis e formatação pt-BR
 * idêntica à da tela (mesmos formatCellValuePtBr / calculateColumnTotal).
 */
export const SummaryPdfTable: React.FC<SummaryPdfTableProps> = ({
  table,
  rows,
  startIndex = 0,
  showTotalizer = false,
  totalSourceRows,
}) => {
  const rowsParaTotal = totalSourceRows && totalSourceRows.length > 0 ? totalSourceRows : rows
  const columns = [...(table?.columns || [])].sort(
    (a: any, b: any) => (a.order || 0) - (b.order || 0),
  )
  if (columns.length === 0) return null

  const totalizer = table?.totalizer

  return (
    <table className="w-full border-collapse text-[9.5pt] leading-snug">
      <thead>
        <tr className="bg-slate-100 text-slate-700">
          <th className="ciafal-avoid-break w-[6%] border border-slate-300 px-1 py-1 text-center align-middle text-[8.5pt] font-bold uppercase">
            #
          </th>
          {columns.map((col: any) => (
            <th
              key={col.id}
              className="ciafal-avoid-break border border-slate-300 px-1.5 py-1 text-left align-middle text-[8.5pt] font-bold uppercase leading-tight break-words"
            >
              {col.name}
              {col.unit_of_measure ? ` (${col.unit_of_measure})` : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length + 1}
              className="border border-slate-300 px-2 py-3 text-center text-[9.5pt] italic text-slate-500"
            >
              Nenhum registro configurado nesta tabela.
            </td>
          </tr>
        ) : (
          rows.map((row: any, rIdx: number) => (
            <tr key={row?.id || `pdfrow_${startIndex + rIdx}`} className="ciafal-avoid-break">
              <td className="border border-slate-300 px-1 py-1 text-center align-top text-[8.5pt] text-slate-400">
                {startIndex + rIdx + 1}
              </td>
              {columns.map((col: any) => {
                const formatted = formatCellValuePtBr(row?.cells?.[col.id], col)
                const isMissing = formatted === ND
                const isNumeric = NUMERIC_TYPES.includes(col.field_type)
                return (
                  <td
                    key={col.id}
                    className={`border border-slate-300 px-1.5 py-1 align-top break-words ${
                      isNumeric ? 'text-right font-mono' : 'text-left'
                    } ${isMissing ? 'italic text-amber-800' : 'text-slate-800'}`}
                  >
                    {formatted}
                  </td>
                )
              })}
            </tr>
          ))
        )}
      </tbody>
      {showTotalizer && totalizer?.enabled && rows.length > 0 && (
        <tfoot>
          <tr className="ciafal-avoid-break bg-slate-100 font-bold text-slate-900">
            <td colSpan={2} className="border border-slate-300 px-1.5 py-1 text-left">
              {totalizer.label || 'Total'}
            </td>
            {columns.slice(1).map((col: any) => {
              const shouldTotalize = totalizer.columns_to_totalize?.includes(col.id)
              const isNumeric = NUMERIC_TYPES.includes(col.field_type)
              if (!shouldTotalize || !isNumeric) {
                return (
                  <td
                    key={col.id}
                    className="border border-slate-300 px-1.5 py-1 text-center text-slate-400"
                  >
                    —
                  </td>
                )
              }
              return (
                <td
                  key={col.id}
                  className="border border-slate-300 px-1.5 py-1 text-right font-mono"
                >
                  {calculateColumnTotal(
                    col.id,
                    rowsParaTotal,
                    col,
                    totalizer.total_function || 'SUM',
                  )}
                </td>
              )
            })}
          </tr>
        </tfoot>
      )}
    </table>
  )
}

export default SummaryPdfTable
