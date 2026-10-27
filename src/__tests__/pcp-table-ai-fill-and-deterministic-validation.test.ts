import { describe, it, expect, vi } from 'vitest'
import {
  pcpMonthlySummaryService,
  CustomTableConfig,
  TableRowConfig,
  TableColumnConfig,
} from '../services/pcp-monthly-summaries'
import { formatTableCellValue } from '../components/pcp/entregas/TableBuilderModal'

describe('Preenchimento por IA e Validação Determinística de Tabelas PCP (CIAFAL)', () => {
  const mockTable: CustomTableConfig = {
    id: 'tbl_test_ai',
    name: 'Atendimento de Produção L1',
    display_title: 'Atendimento Operacional L1',
    data_source: 'Montagem da Programação',
    ai_fill_instructions: 'Preencher a partir dos apontamentos oficiais. Não inventar valores.',
    show_title: true,
    allow_ai_completion: true,
    allow_manual_edit: true,
    is_dynamic: false,
    columns: [
      {
        id: 'col_mat',
        name: 'Material',
        order: 1,
        field_type: 'TEXTO',
        is_required: true,
        data_source: 'Montagem da Programação',
      },
      {
        id: 'col_prog',
        name: 'Quantidade Programada',
        order: 2,
        field_type: 'QUANTIDADE',
        unit_of_measure: 't',
        is_required: true,
        data_source: 'Montagem da Programação',
      },
      {
        id: 'col_real',
        name: 'Quantidade Realizada',
        order: 3,
        field_type: 'QUANTIDADE',
        unit_of_measure: 't',
        is_required: true,
        data_source: 'Controle de Produção / MES 4.0',
      },
      {
        id: 'col_atend',
        name: 'Taxa de Atendimento',
        order: 4,
        field_type: 'CAMPO_CALCULADO',
        unit_of_measure: '%',
        calculation_rule: '[Quantidade Realizada] / [Quantidade Programada] * 100',
        is_required: false,
      },
      {
        id: 'col_ia_just',
        name: 'Análise de Justificativa',
        order: 5,
        field_type: 'INFORMACAO_IA',
        is_required: false,
      },
    ],
    rows: [
      {
        id: 'row_1',
        order: 1,
        label: 'Vergalhão CA-50 10.0mm',
        cells: {
          col_mat: 'CA50-100',
          col_prog: 50,
          col_real: 45,
          col_atend: null,
          col_ia_just: 'Produção executada dentro da janela com desvio tolerável.',
        },
      },
      {
        id: 'row_2',
        order: 2,
        label: 'Barra Redonda 12.7mm',
        cells: {
          col_mat: 'BR-127',
          col_prog: 30,
          col_real: null, // sem dado na fonte
          col_atend: null,
          col_ia_just: '',
        },
      },
    ],
  }

  it('1. Computa deterministicamente campos calculados com fórmula de colunas', () => {
    const { validatedRows } = pcpMonthlySummaryService.validateAndComputeDeterministicTable(
      mockTable,
      mockTable.rows,
    )

    // Linha 1: 45 / 50 * 100 = 90
    expect(validatedRows[0].cells['col_atend']).toBe(90)
  })

  it('2. NUNCA inventa valores nem usa zero quando a fonte não tem dado: atribui "Dado não disponível"', () => {
    const { validatedRows, missingDataAlerts, unfilledCount } =
      pcpMonthlySummaryService.validateAndComputeDeterministicTable(mockTable, mockTable.rows)

    // Linha 2 tem col_real = null -> deve virar "Dado não disponível"
    expect(validatedRows[1].cells['col_real']).toBe('Dado não disponível')

    // Como col_real é "Dado não disponível", o campo calculado dependente também vira "Dado não disponível"
    expect(validatedRows[1].cells['col_atend']).toBe('Dado não disponível')

    // Gera alerta explicativo em português
    expect(
      missingDataAlerts.some((a) => a.includes('não possui registro na fonte oficial autorizada')),
    ).toBe(true)
    expect(unfilledCount).toBeGreaterThan(0)
  })

  it('3. Sinaliza dados divergentes ou formatos numéricos corrompidos', () => {
    const corruptedRows: TableRowConfig[] = [
      {
        id: 'row_corrupt',
        order: 1,
        label: 'Material com Valor Inválido',
        cells: {
          col_mat: 'CA50-100',
          col_prog: 'texto_invalido',
          col_real: 20,
        },
      },
    ]

    const { validatedRows, divergenceAlerts } =
      pcpMonthlySummaryService.validateAndComputeDeterministicTable(mockTable, corruptedRows)

    expect(validatedRows[0].cells['col_prog']).toBe('Dado não disponível')
    expect(divergenceAlerts.length).toBeGreaterThan(0)
    expect(divergenceAlerts[0]).toContain('inválido para o tipo numérico')
  })

  it('4. Respeita formatação padrão brasileiro (dd/mm/aaaa, 1.234,56, 91,0%, R$ 1.234,56, t)', () => {
    // Formatação de quantidade com unidade t
    expect(formatTableCellValue(1234.56, 'QUANTIDADE', 't')).toBe('1.234,56 t')

    // Formatação de percentual com 1 casa decimal
    expect(formatTableCellValue(91.0, 'PERCENTUAL')).toBe('91,0%')

    // Formatação de moeda BRL
    const moedaFormatted = formatTableCellValue(1234.56, 'MOEDA')
    expect(moedaFormatted).toContain('1.234,56')
    expect(moedaFormatted).toContain('R$')

    // Formatação de data brasileira
    expect(formatTableCellValue('2025-05-18', 'DATA')).toBe('18/05/2025')

    // Dado não disponível ou vazio
    expect(formatTableCellValue('', 'TEXTO')).toBe('—')
    expect(formatTableCellValue(null, 'TEXTO')).toBe('—')
    expect(formatTableCellValue('Dado não disponível', 'TEXTO')).toBe('Dado não disponível')
  })

  it('5. Avaliação segura e determinística de fórmulas sem execução de código malicioso', () => {
    const rowCells = { col_a: 100, col_b: 25 }
    const columns: TableColumnConfig[] = [
      { id: 'col_a', name: 'A', order: 1, field_type: 'NUMERO_DECIMAL', is_required: false },
      { id: 'col_b', name: 'B', order: 2, field_type: 'NUMERO_DECIMAL', is_required: false },
    ]

    const res = pcpMonthlySummaryService.evaluateDeterministicFormula(
      '([A] + [B]) * 2',
      rowCells,
      columns,
    )
    expect(res).toBe(250)

    // Rejeição de injeção ou caracteres inválidos
    const malicious = pcpMonthlySummaryService.evaluateDeterministicFormula(
      'window.location = "http://bad.com"',
      rowCells,
      columns,
    )
    expect(malicious).toBeNull()
  })
})
