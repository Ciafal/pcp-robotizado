import { describe, it, expect } from 'vitest'
import {
  formatCellValuePtBr,
  calculateColumnTotal,
} from '@/components/pcp/entregas/SummaryTableRenderer'
import { TableColumnConfig, TableRowConfig } from '@/services/pcp-monthly-summaries'

describe('SummaryTableRenderer & formatCellValuePtBr', () => {
  it('formata números decimais e quantidades com padrão pt-BR (1.234,56)', () => {
    const col: TableColumnConfig = {
      id: 'c_qtd',
      name: 'Produção',
      field_type: 'QUANTIDADE',
      unit_of_measure: 't',
      order: 1,
    }

    expect(formatCellValuePtBr(1234.56, col)).toBe('1.234,56 t')
    expect(formatCellValuePtBr('1234.56', col)).toBe('1.234,56 t')
    expect(formatCellValuePtBr(0, col)).toBe('0,0 t')
  })

  it('retorna "Dado não disponível" para valores ausentes ou nulos (NUNCA zero inventado)', () => {
    const col: TableColumnConfig = {
      id: 'c_valor',
      name: 'Receita',
      field_type: 'MOEDA',
      order: 2,
    }

    expect(formatCellValuePtBr(null, col)).toBe('Dado não disponível')
    expect(formatCellValuePtBr(undefined, col)).toBe('Dado não disponível')
    expect(formatCellValuePtBr('', col)).toBe('Dado não disponível')
    expect(formatCellValuePtBr('Dado não disponível', col)).toBe('Dado não disponível')
    expect(formatCellValuePtBr('—', col)).toBe('Dado não disponível')
  })

  it('formata percentuais com sufixo % e uma casa decimal', () => {
    const col: TableColumnConfig = {
      id: 'c_pct',
      name: 'Aderência',
      field_type: 'PERCENTUAL',
      order: 3,
    }

    expect(formatCellValuePtBr(91.0, col)).toBe('91,0%')
    expect(formatCellValuePtBr(88.45, col)).toBe('88,5%')
  })

  it('formata moeda no padrão BRL', () => {
    const col: TableColumnConfig = {
      id: 'c_moeda',
      name: 'Custo',
      field_type: 'MOEDA',
      order: 4,
    }

    const res = formatCellValuePtBr(1234.56, col)
    expect(res).toContain('R$')
    expect(res).toContain('1.234,56')
  })

  it('formata datas ISO para dd/mm/aaaa', () => {
    const col: TableColumnConfig = {
      id: 'c_data',
      name: 'Data Planejada',
      field_type: 'DATA',
      order: 5,
    }

    expect(formatCellValuePtBr('2025-05-18', col)).toBe('18/05/2025')
    expect(formatCellValuePtBr('2025-12-31T00:00:00.000Z', col)).toBe('31/12/2025')
  })

  it('calcula totalizadores de soma respeitando a formatação pt-BR', () => {
    const col: TableColumnConfig = {
      id: 'col_tons',
      name: 'Volume Total',
      field_type: 'QUANTIDADE',
      unit_of_measure: 't',
      order: 1,
    }

    const rows: TableRowConfig[] = [
      { id: 'r1', order: 1, cells: { col_tons: 150.25 } },
      { id: 'r2', order: 2, cells: { col_tons: '100,50' } },
      { id: 'r3', order: 3, cells: { col_tons: 'Dado não disponível' } },
      { id: 'r4', order: 4, cells: { col_tons: 200 } },
    ]

    const total = calculateColumnTotal('col_tons', rows, col, 'SUM')
    expect(total).toBe('450,75 t')
  })
})
