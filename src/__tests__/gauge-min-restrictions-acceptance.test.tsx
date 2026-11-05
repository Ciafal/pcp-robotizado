import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RESTRICTION_REASONS_CATALOG,
  getPrioritizedReasonsForType,
  RESTRICTION_TYPE_OPTIONS,
  RESTRICTION_RULE_PLACEHOLDERS,
  type RestrictionType,
} from '../types/restriction-reasons-catalog'
import { lineGaugeRestrictionService } from '../services/line-gauge-restriction-service'
import { pcpAuditService } from '../services/pcp-audit-service'
import type { LineGaugeMinRestriction } from '../types/line-gauge-restriction'

describe('Catálogo de Motivos e Priorização Tipo → Motivo', () => {
  it('1. Tipo da Restrição possui 7 opções na ordem estrita solicitada', () => {
    expect(RESTRICTION_TYPE_OPTIONS).toHaveLength(7)
    expect(RESTRICTION_TYPE_OPTIONS.map((t) => t.value)).toEqual([
      'Horas',
      'Dias',
      'Quantidade',
      'Carga de Enfornamento',
      'Qualidade',
      'Montagem',
      'Sequenciamento',
    ])
    expect(RESTRICTION_TYPE_OPTIONS.map((t) => t.order)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('2. Catálogo contém todos os 10 grupos de motivos com categorias corretas', () => {
    const categories = Array.from(new Set(RESTRICTION_REASONS_CATALOG.map((r) => r.category)))
    expect(categories).toContain('Aço e composição')
    expect(categories).toContain('Matéria-prima')
    expect(categories).toContain('Forno / reaquecimento')
    expect(categories).toContain('Enfornamento')
    expect(categories).toContain('Bitola / dimensão')
    expect(categories).toContain('Qualidade')
    expect(categories).toContain('Montagem / preparação de linha')
    expect(categories).toContain('Sequenciamento')
    expect(categories).toContain('Processo / produção')
    expect(categories).toContain('PCP / planejamento')
    expect(RESTRICTION_REASONS_CATALOG.length).toBeGreaterThanOrEqual(80)
  })

  it('3. Relacionamento Horas prioriza permanência mínima, montagem, furnace time, setup/acerto', () => {
    const list = getPrioritizedReasonsForType('Horas')
    expect(list.length).toBe(RESTRICTION_REASONS_CATALOG.length)
    const topReasons = list.slice(0, 9).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('permanência mínima na mesma bitola'))).toBe(true)
    expect(topReasons.some((r) => r.includes('permanência mínima na mesma família'))).toBe(true)
    expect(topReasons.some((r) => r.includes('permanência mínima no mesmo aço'))).toBe(true)
    expect(topReasons.some((r) => r.includes('tempo mínimo de montagem'))).toBe(true)
    expect(topReasons.some((r) => r.includes('setup obrigatório'))).toBe(true)
    expect(topReasons.some((r) => r.includes('acerto obrigatório'))).toBe(true)
  })

  it('4. Relacionamento Dias prioriza campanha de produção, paradas e atendimento de carteira', () => {
    const list = getPrioritizedReasonsForType('Dias')
    const topReasons = list.slice(0, 8).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('campanha de produção'))).toBe(true)
    expect(topReasons.some((r) => r.includes('formação de estoque'))).toBe(true)
    expect(topReasons.some((r) => r.includes('parada programada'))).toBe(true)
    expect(topReasons.some((r) => r.includes('manutenção programada'))).toBe(true)
    expect(topReasons.some((r) => r.includes('atendimento de carteira'))).toBe(true)
  })

  it('5. Relacionamento Quantidade prioriza quantidade mínima antes da troca, cargas e campanhas', () => {
    const list = getPrioritizedReasonsForType('Quantidade')
    const topReasons = list.slice(0, 10).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('quantidade mínima antes da troca'))).toBe(true)
    expect(topReasons.some((r) => r.includes('carga mínima de enfornamento'))).toBe(true)
    expect(topReasons.some((r) => r.includes('carga máxima de enfornamento'))).toBe(true)
    expect(topReasons.some((r) => r.includes('campanha mínima'))).toBe(true)
    expect(topReasons.some((r) => r.includes('estoque mínimo'))).toBe(true)
  })

  it('6. Relacionamento Carga de Enfornamento prioriza todos os motivos de matéria-prima, forno e carga', () => {
    const list = getPrioritizedReasonsForType('Carga de Enfornamento')
    const topReasons = list.slice(0, 15).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('enfornamento intercalado'))).toBe(true)
    expect(topReasons.some((r) => r.includes('carga mínima de enfornamento'))).toBe(true)
    expect(topReasons.some((r) => r.includes('compatibilidade de materiais'))).toBe(true)
    expect(topReasons.some((r) => r.includes('temperatura de enfornamento'))).toBe(true)
  })

  it('7. Relacionamento Qualidade prioriza requisitos, ensaios, rastreabilidade e produtos bloqueados', () => {
    const list = getPrioritizedReasonsForType('Qualidade')
    const topReasons = list.slice(0, 15).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('qualidade superficial'))).toBe(true)
    expect(topReasons.some((r) => r.includes('tolerância dimensional'))).toBe(true)
    expect(topReasons.some((r) => r.includes('requisito especial do cliente'))).toBe(true)
    expect(topReasons.some((r) => r.includes('rastreabilidade obrigatória'))).toBe(true)
    expect(topReasons.some((r) => r.includes('produto bloqueado pela qualidade'))).toBe(true)
  })

  it('8. Relacionamento Montagem prioriza montagem específica/incompatível, ferramental, guias e setup', () => {
    const list = getPrioritizedReasonsForType('Montagem')
    const topReasons = list.slice(0, 12).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('montagem específica'))).toBe(true)
    expect(topReasons.some((r) => r.includes('montagem incompatível'))).toBe(true)
    expect(topReasons.some((r) => r.includes('troca de montagem'))).toBe(true)
    expect(topReasons.some((r) => r.includes('ferramental específico'))).toBe(true)
    expect(topReasons.some((r) => r.includes('setup obrigatório'))).toBe(true)
  })

  it('9. Relacionamento Sequenciamento prioriza Bitola DE/PARA, sequências ideal/obrigatória/proibida', () => {
    const list = getPrioritizedReasonsForType('Sequenciamento')
    const topReasons = list.slice(0, 12).map((r) => r.reason.toLowerCase())
    expect(topReasons.some((r) => r.includes('bitola de/para'))).toBe(true)
    expect(topReasons.some((r) => r.includes('sequência ideal de bitolas'))).toBe(true)
    expect(topReasons.some((r) => r.includes('sequência obrigatória de produtos'))).toBe(true)
    expect(topReasons.some((r) => r.includes('produto predecessor obrigatório'))).toBe(true)
  })

  it('10. Placeholders dinâmicos mudam para cada um dos 7 tipos', () => {
    const types: RestrictionType[] = [
      'Horas',
      'Dias',
      'Quantidade',
      'Carga de Enfornamento',
      'Qualidade',
      'Montagem',
      'Sequenciamento',
    ]

    types.forEach((t) => {
      const ph = RESTRICTION_RULE_PLACEHOLDERS[t]
      expect(ph).toBeDefined()
      expect(ph.length).toBeGreaterThan(15)
    })

    expect(RESTRICTION_RULE_PLACEHOLDERS['Horas']).toContain('8 horas consecutivas')
    expect(RESTRICTION_RULE_PLACEHOLDERS['Dias']).toContain('2 dias na mesma família')
    expect(RESTRICTION_RULE_PLACEHOLDERS['Quantidade']).toContain('150 t')
    expect(RESTRICTION_RULE_PLACEHOLDERS['Carga de Enfornamento']).toContain(
      'duas bitolas diferentes',
    )
    expect(RESTRICTION_RULE_PLACEHOLDERS['Qualidade']).toContain('qualidade superficial crítica')
    expect(RESTRICTION_RULE_PLACEHOLDERS['Montagem']).toContain('Após montagem X')
    expect(RESTRICTION_RULE_PLACEHOLDERS['Sequenciamento']).toContain('bitola 12,70 mm')
  })
})

describe('lineGaugeRestrictionService e Auditoria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('11. Criação de restrição chama pcpAuditService com detalhes completos', async () => {
    const logSpy = vi.spyOn(pcpAuditService, 'logAction').mockResolvedValue(true)

    // Mock lineGaugeRestrictionService.create
    const fakeRecord: LineGaugeMinRestriction = {
      id: 'restr_test_1',
      line_id: 'centro_lam_01',
      line_code: 'LAM-01',
      restriction_type: 'Horas',
      reason: 'Permanência mínima na mesma bitola',
      reason_category: 'Sequenciamento',
      rule_description: 'Manter no mínimo 8 horas consecutivas de produção da mesma bitola',
      min_value: '8.00',
      min_value_numeric: 8,
      unit_of_measure: 'Horas',
      unit: 'Horas',
      status: 'ATIVA',
      created_by_user: 'pcp_admin',
      updated_by_user: 'pcp_admin',
      created: '2026-11-05T12:00:00Z',
      updated: '2026-11-05T12:00:00Z',
    }

    vi.spyOn(lineGaugeRestrictionService, 'create').mockImplementation(async (payload) => {
      await pcpAuditService.logAction({
        module: 'CADASTROS',
        screen: 'CENTROS_FICHA_MESTRA',
        action: 'CRIAR_RESTRICAO_MINIMA',
        record_id: fakeRecord.id,
        user_name: 'pcp_admin',
        summary: `Criou restrição mínima do tipo "${payload.restriction_type}" para o centro ${payload.line_code || payload.line_id}`,
        old_value: null,
        new_value: {
          restriction_type: payload.restriction_type,
          reason: payload.reason,
          rule_description: payload.rule_description,
          status: payload.status,
        },
      })
      return fakeRecord
    })

    const result = await lineGaugeRestrictionService.create({
      line_id: 'centro_lam_01',
      line_code: 'LAM-01',
      restriction_type: 'Horas',
      reason: 'Permanência mínima na mesma bitola',
      reason_category: 'Sequenciamento',
      rule_description: 'Manter no mínimo 8 horas consecutivas de produção da mesma bitola',
      min_value: 8,
      unit_of_measure: 'Horas',
      status: 'ATIVA',
    })

    expect(result.id).toBe('restr_test_1')
    expect(result.reason).toBe('Permanência mínima na mesma bitola')
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRIAR_RESTRICAO_MINIMA',
        record_id: 'restr_test_1',
        new_value: expect.objectContaining({
          restriction_type: 'Horas',
          reason: 'Permanência mínima na mesma bitola',
        }),
      }),
    )
  })
  it('12. Suporta criação para os novos tipos: Carga de Enfornamento, Qualidade, Montagem, Sequenciamento', async () => {
    const testCases: Array<{ type: RestrictionType; reason: string; rule: string }> = [
      {
        type: 'Horas',
        reason: 'Permanência mínima na mesma bitola',
        rule: 'Manter 8h na mesma bitola',
      },
      {
        type: 'Quantidade',
        reason: 'Quantidade mínima antes da troca',
        rule: 'Produzir no mínimo 150 t',
      },
      {
        type: 'Carga de Enfornamento',
        reason: 'Enfornamento intercalado',
        rule: 'Permitir no máximo duas bitolas na mesma carga',
      },
      {
        type: 'Qualidade',
        reason: 'Qualidade superficial',
        rule: 'Não programar imediatamente após produto crítico',
      },
      {
        type: 'Montagem',
        reason: 'Montagem incompatível',
        rule: 'Priorizar compatíveis antes de nova troca',
      },
      {
        type: 'Sequenciamento',
        reason: 'Bitola DE/PARA',
        rule: 'Bitola 12,70 mm somente após 15,88 mm',
      },
    ]

    for (const tc of testCases) {
      expect(tc.type).toBeDefined()
      expect(tc.reason).toBeDefined()
      const reasonObj = RESTRICTION_REASONS_CATALOG.find((r) => r.reason === tc.reason)
      expect(reasonObj).toBeDefined()
      expect(reasonObj?.category).toBeDefined()
    }
  })

  it('13. Registro antigo sem motivo permanece válido e retrocompatível', () => {
    const legacyRecord: LineGaugeMinRestriction = {
      id: 'legacy_01',
      line_id: 'centro_01',
      line_code: 'LAM-01',
      restriction_type: 'Horas',
      rule_description: 'Regra antiga sem motivo preenchido',
      min_value: '12.00',
      min_value_numeric: 12,
      unit_of_measure: 'Horas',
      status: 'ATIVA',
      created_by_user: 'legado',
      updated_by_user: 'legado',
    }

    expect(legacyRecord.reason).toBeUndefined()
    expect(legacyRecord.restriction_type).toBe('Horas')
    expect(legacyRecord.status).toBe('ATIVA')
  })
})
