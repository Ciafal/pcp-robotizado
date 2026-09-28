import { describe, it, expect } from 'vitest'
import {
  evaluateCenterOperationalStatus,
  getStatusVisual,
  DEFAULT_STATUS_THRESHOLDS,
  CenterStatusThresholds,
} from '@/lib/pcp/efficiency-status-rules'
import { formatTonsPtBr, formatPercentPtBr } from '@/lib/formatters-ptbr'

describe('Regras Centralizadas de Status Operacional por Centro', () => {
  it('classifica como SEM_APONTAMENTO quando não há apontamento ou volume realizado é 0 com previsto > 0', () => {
    // Caso 1: hasPostings = false
    const statusExplicit = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 0,
      hasPostings: false,
    })
    expect(statusExplicit).toBe('SEM_APONTAMENTO')

    // Caso 2: volume zero sem apontamento
    const statusImplicit = evaluateCenterOperationalStatus({
      plannedQty: 150,
      realizedQty: 0,
    })
    expect(statusImplicit).toBe('SEM_APONTAMENTO')

    const visual = getStatusVisual('SEM_APONTAMENTO')
    expect(visual.label).toBe('Sem apontamento')
    expect(visual.badgeBg).toContain('bg-slate-100')
  })

  it('classifica como DENTRO_PLANEJADO quando aderência >= 95% e atraso <= 15 min', () => {
    const status = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 96,
      adherencePct: 96.0,
      delayMinutes: 10,
      hasPostings: true,
    })
    expect(status).toBe('DENTRO_PLANEJADO')

    const visual = getStatusVisual('DENTRO_PLANEJADO')
    expect(visual.label).toBe('Dentro do planejado')
    expect(visual.badgeText).toContain('emerald')
  })

  it('classifica como ATENCAO quando aderência está entre 85% e 94.9% ou atraso entre 16 e 45 min', () => {
    // Por aderência (90%)
    const statusByAdherence = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 90,
      adherencePct: 90.0,
      delayMinutes: 5,
      hasPostings: true,
    })
    expect(statusByAdherence).toBe('ATENCAO')

    // Por atraso (30 min) mesmo com 100% de volume
    const statusByDelay = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 100,
      adherencePct: 100.0,
      delayMinutes: 30,
      hasPostings: true,
    })
    expect(statusByDelay).toBe('ATENCAO')

    const visual = getStatusVisual('ATENCAO')
    expect(visual.label).toBe('Atenção')
    expect(visual.badgeText).toContain('amber')
  })

  it('classifica como ATRASADO quando aderência está entre 70% e 84.9% ou atraso entre 46 e 120 min', () => {
    // Por aderência (75%)
    const statusByAdherence = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 75,
      adherencePct: 75.0,
      delayMinutes: 0,
      hasPostings: true,
    })
    expect(statusByAdherence).toBe('ATRASADO')

    // Por atraso temporal (60 min)
    const statusByDelay = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 98,
      adherencePct: 98.0,
      delayMinutes: 60,
      hasPostings: true,
    })
    expect(statusByDelay).toBe('ATRASADO')

    const visual = getStatusVisual('ATRASADO')
    expect(visual.label).toBe('Atrasado')
    expect(visual.badgeText).toContain('orange')
  })

  it('classifica como CRITICO quando aderência < 70%, atraso > 120 min ou parada crítica não tratada', () => {
    // Por aderência severa (50%)
    const statusByAdherence = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 50,
      adherencePct: 50.0,
      delayMinutes: 0,
      hasPostings: true,
    })
    expect(statusByAdherence).toBe('CRITICO')

    // Por atraso severo (180 min)
    const statusByDelay = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 100,
      adherencePct: 100.0,
      delayMinutes: 180,
      hasPostings: true,
    })
    expect(statusByDelay).toBe('CRITICO')

    // Por parada crítica
    const statusByStop = evaluateCenterOperationalStatus({
      plannedQty: 100,
      realizedQty: 95,
      isCriticalStop: true,
      hasPostings: true,
    })
    expect(statusByStop).toBe('CRITICO')

    const visual = getStatusVisual('CRITICO')
    expect(visual.label).toBe('Crítico')
    expect(visual.badgeText).toContain('rose')
  })

  it('permite customização flexível de limiares para futuras configurações administrativas', () => {
    const customThresholds: CenterStatusThresholds = {
      ...DEFAULT_STATUS_THRESHOLDS,
      withinPlannedMinAdherencePct: 99.0, // Regra mais rigorosa
    }

    const statusStrict = evaluateCenterOperationalStatus(
      {
        plannedQty: 100,
        realizedQty: 97,
        adherencePct: 97.0,
        delayMinutes: 0,
        hasPostings: true,
      },
      customThresholds,
    )
    // 97% com limiar de 99% vira Atenção
    expect(statusStrict).toBe('ATENCAO')
  })
})

describe('Formatação Padrão ABNT / pt-BR da CIAFAL', () => {
  it('formata percentual com vírgula e sufixo % (ex: 91,0%)', () => {
    expect(formatPercentPtBr(91.0, 1)).toBe('91,0%')
    expect(formatPercentPtBr(97.45, 1)).toBe('97,5%')
    expect(formatPercentPtBr(100, 1)).toBe('100,0%')
  })

  it('formata toneladas com espaço e unidade t (ex: 125,40 t)', () => {
    expect(formatTonsPtBr(125.4, 2)).toBe('125,40 t')
    expect(formatTonsPtBr(1000, 2)).toBe('1.000,00 t')
    expect(formatTonsPtBr(0, 2)).toBe('0,00 t')
  })
})
