import { describe, it, expect } from 'vitest'
import { formatPercentStandard, formatTonsSdc, parsePtBrNumber } from '@/lib/number-format'
import { formatPercentStandard as formatPercentPtBr } from '@/lib/formatters-ptbr'

describe('Validação de Formatação PT-BR de Percentuais e Unidades (XX,XX % e t)', () => {
  it('formata números padrão em XX,XX % com vírgula e espaço antes do %', () => {
    expect(formatPercentStandard(45)).toBe('45,00 %')
    expect(formatPercentStandard(57.3)).toBe('57,30 %')
    expect(formatPercentStandard(89.2)).toBe('89,20 %')
    expect(formatPercentStandard(95)).toBe('95,00 %')
    expect(formatPercentStandard(103.3)).toBe('103,30 %')
    expect(formatPercentStandard(0)).toBe('0,00 %')
  })

  it('formata valores decimais fracionários (0 < x < 1) multiplicando por 100', () => {
    expect(formatPercentStandard(0.45)).toBe('45,00 %')
    expect(formatPercentStandard(0.573)).toBe('57,30 %')
    expect(formatPercentStandard(0.892)).toBe('89,20 %')
  })

  it('trata valores string pt-br e valores nulos/indefinidos com fallback', () => {
    expect(formatPercentStandard('45,0')).toBe('45,00 %')
    expect(formatPercentStandard(null)).toBe('0,00 %')
    expect(formatPercentStandard(undefined)).toBe('0,00 %')
    expect(formatPercentStandard('', '-')).toBe('-')
  })

  it('valida formatador centralizado de formatters-ptbr compatível', () => {
    expect(formatPercentPtBr(45)).toBe('45,00 %')
    expect(formatPercentPtBr(57.3)).toBe('57,30 %')
    expect(formatPercentPtBr(103.3)).toBe('103,30 %')
  })

  it('formata toneladas com 3 casas decimais, ponto de milhar e sufixo " t"', () => {
    expect(formatTonsSdc(32)).toBe('32,000 t')
    expect(formatTonsSdc(5)).toBe('5,000 t')
    expect(formatTonsSdc(1)).toBe('1,000 t')
    expect(formatTonsSdc(1234.56)).toBe('1.234,560 t')
    expect(formatTonsSdc(0)).toBe('0,000 t')
  })
})
