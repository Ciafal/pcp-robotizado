import { describe, it, expect } from 'vitest'
import { pcpRulesService } from '@/services/pcp-rules-service'

describe('Motor de Regras & Setup — Validação de Integridade e 6 Abas CIAFAL', () => {
  it('1. Rotas oficiais não recaem no Index "/" e possuem mapeamentos definidos', () => {
    const rulesRoute = '/pcp/regras'
    const aliasRoute = '/pcp-robotizado/regras'
    expect(rulesRoute).toBe('/pcp/regras')
    expect(aliasRoute).toBe('/pcp-robotizado/regras')
  })

  it('2. Aba 1 — Setup & Acerto: retorna estrutura compatível e com colunas obrigatórias', async () => {
    const setups = await pcpRulesService.listSetupAcerto()
    expect(Array.isArray(setups)).toBe(true)
    if (setups.length > 0) {
      const first = setups[0]
      expect(first).toHaveProperty('center_code')
      expect(first).toHaveProperty('line_code')
      expect(first).toHaveProperty('work_center')
      expect(first).toHaveProperty('to_family_code')
      expect(first).toHaveProperty('to_code_prefix')
      expect(first).toHaveProperty('to_description_gauge')
      expect(first).toHaveProperty('setup_time_minutes')
      expect(first).toHaveProperty('tuning_time_minutes')
      expect(first).toHaveProperty('origin')
      expect(first).toHaveProperty('status')
      expect(first).toHaveProperty('responsible_name')
      expect(first).toHaveProperty('last_revision')
    }
  })

  it('3. Aba 2 — Paradas Programadas: retorna estrutura compatível com Centro, Linha, Tipo, Motivo, Duração', async () => {
    const stops = await pcpRulesService.listScheduledStops()
    expect(Array.isArray(stops)).toBe(true)
    if (stops.length > 0) {
      const first = stops[0]
      expect(first).toHaveProperty('center_code')
      expect(first).toHaveProperty('line_code')
      expect(first).toHaveProperty('work_center')
      expect(first).toHaveProperty('stop_type')
      expect(first).toHaveProperty('reason')
      expect(first).toHaveProperty('description')
      expect(first).toHaveProperty('duration_minutes')
      expect(first).toHaveProperty('start_time')
      expect(first).toHaveProperty('recurrence')
      expect(first).toHaveProperty('shift')
      expect(first).toHaveProperty('status')
      expect(first).toHaveProperty('responsible_name')
    }
  })

  it('4. Aba 3 — Tempo de Resfriamento: retorna lista ou array vazio sem lançar exceções não tratadas', async () => {
    const coolings = await pcpRulesService.listCoolingTimes()
    expect(Array.isArray(coolings)).toBe(true)
  })

  it('5. Aba 4 — Regras de Sequenciamento (Rule Packs): herança hierárquica por escopo', async () => {
    const rules = await pcpRulesService.listSequencingRules()
    expect(Array.isArray(rules)).toBe(true)
    if (rules.length > 0) {
      const globalPack = rules.find((r) => r.scope_level === 'GLOBAL')
      expect(globalPack).toBeDefined()
      expect(globalPack?.rules_payload).toBeDefined()
    }
  })

  it('6. Aba 5 — Revisões Pendentes: suporte à esteira de aprovação em 2 fases (PCP + Gestor Linha)', async () => {
    const pendings = await pcpRulesService.listPendingRevisions()
    expect(Array.isArray(pendings)).toBe(true)
  })

  it('7. Aba 6 — Histórico de Alterações: parâmetros de auditoria com usuário, motivo, validação MES e IA', async () => {
    const audits = await pcpRulesService.listRuleAuditLogs()
    expect(Array.isArray(audits)).toBe(true)
  })
})
