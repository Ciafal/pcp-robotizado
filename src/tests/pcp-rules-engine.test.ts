import { describe, it, expect } from 'vitest'
import { MesStatisticalEngine } from '../services/rules-ai-engine'
import { pcpRulesService } from '../services/pcp-rules-service'

describe('Motor de Regras & Setup - CIAFAL Industrial Engine', () => {
  it('deve gerar e calcular estatísticas completas de evidências MES', () => {
    const stats = MesStatisticalEngine.getMesEvidence('L1', 180, 'TQ-100x100', 'TQ-100x100', 'STP_L1_OUTDATED_EXAMPLE')
    expect(stats.sampleCount).toBeGreaterThanOrEqual(10)
    expect(stats.median).toBe(118)
    expect(stats.mean).toBe(121)
    expect(stats.p25).toBe(115)
    expect(stats.p75).toBe(127)
    expect(stats.standardDeviation).toBeDefined()
  })

  it('deve bloquear proposta manifestamente incoerente (ex: 180 min -> 20 min) e classificar como INCOERENTE', () => {
    const stats = MesStatisticalEngine.getMesEvidence('L1', 180, 'TQ-100x100', 'TQ-100x100', 'STP_L1_OUTDATED_EXAMPLE')
    const evaluation = MesStatisticalEngine.evaluateProposal(180, 20, stats)

    expect(evaluation.classification).toBe('INCOERENTE')
    expect(evaluation.canPublishDirectly).toBe(false)
    expect(evaluation.requiresTechnicalJustification).toBe(true)
    expect(evaluation.explanation).toContain('divergência significativa')
  })

  it('deve aprovar proposta estatisticamente coerente com a mediana real do processo', () => {
    const stats = MesStatisticalEngine.getMesEvidence('L1', 180, 'TQ-100x100', 'TQ-100x100', 'STP_L1_OUTDATED_EXAMPLE')
    const evaluation = MesStatisticalEngine.evaluateProposal(180, 120, stats)

    expect(evaluation.classification).toBe('COERENTE')
    expect(evaluation.canPublishDirectly).toBe(true)
    expect(evaluation.requiresTechnicalJustification).toBe(false)
  })

  it('deve identificar parâmetro de cadastro desatualizado quando difere sistematicamente do MES', () => {
    const stats = MesStatisticalEngine.getMesEvidence('L1', 180, 'TQ-100x100', 'TQ-100x100', 'STP_L1_OUTDATED_EXAMPLE')
    const outdated = MesStatisticalEngine.identifyOutdatedParameters(180, stats)

    expect(outdated.isOutdated).toBe(true)
    expect(outdated.suggestionMessage).toContain('SUGESTÃO DE REVISÃO')
  })
})
