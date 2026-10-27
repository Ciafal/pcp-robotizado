import { describe, it, expect } from 'vitest'
import { formatTableCellValue } from '@/components/pcp/entregas/TableBuilderModal'

describe('TableBuilderModal - Formatação pt-BR e Validações', () => {
  it('deve formatar valores numéricos inteiros no padrão pt-BR', () => {
    expect(formatTableCellValue(1234, 'NUMERO_INTEIRO')).toBe('1.234')
    expect(formatTableCellValue(5000000, 'NUMERO_INTEIRO')).toBe('5.000.000')
  })

  it('deve formatar números decimais com vírgula e 2 casas decimais', () => {
    expect(formatTableCellValue(1234.56, 'NUMERO_DECIMAL')).toBe('1.234,56')
    expect(formatTableCellValue('1234.56', 'NUMERO_DECIMAL')).toBe('1.234,56')
  })

  it('deve formatar percentuais com 1 casa decimal e símbolo %', () => {
    expect(formatTableCellValue(91, 'PERCENTUAL')).toBe('91,0%')
    expect(formatTableCellValue(91.75, 'PERCENTUAL')).toBe('91,8%')
  })

  it('deve formatar moeda brasileira em R$ e separador de milhar', () => {
    const formatted = formatTableCellValue(1234.56, 'MOEDA')
    // Normalizar espaços não separáveis que o toLocaleString('pt-BR') costuma usar
    const clean = formatted.replace(/\u00a0/g, ' ')
    expect(clean).toContain('R$')
    expect(clean).toContain('1.234,56')
  })

  it('deve formatar quantidades com unidade especificada ou padrão em toneladas', () => {
    expect(formatTableCellValue(350, 'QUANTIDADE', 't')).toBe('350,00 t')
    expect(formatTableCellValue(12.5, 'QUANTIDADE', 'kg')).toBe('12,50 kg')
  })

  it('deve formatar datas ISO (aaaa-mm-dd) para o padrão brasileiro (dd/mm/aaaa)', () => {
    expect(formatTableCellValue('2025-05-01', 'DATA')).toBe('01/05/2025')
  })

  it('deve retornar traço para valores nulos ou vazios', () => {
    expect(formatTableCellValue(null, 'TEXTO')).toBe('—')
    expect(formatTableCellValue('', 'QUANTIDADE')).toBe('—')
    expect(formatTableCellValue(undefined, 'NUMERO_DECIMAL')).toBe('—')
  })
})
