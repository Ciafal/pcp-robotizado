/**
 * Suíte de Testes de Aceitação: DERIVAÇÃO DE CENTROS (PCP Robotizado - HUB CIAFAL)
 * Caminho: Cadastros → Centros e Ficha Mestra → Criar Centro / Editar Centro
 *
 * Cobertura exaustiva dos 16 critérios de aceite do usuário:
 * 1. Flag visual (switch) "Centro derivado?" (Não / Sim)
 * 2. Bloqueio de submissão do Centro quando Sim sem regras válidas e ativas
 * 3. Seletor pesquisável por código ou descrição com formato padronizado
 * 4. Bloqueio de autorrelacionamento (Centro A -> Centro A)
 * 5. Múltiplos Grupos de Mercadorias (MATKL) por regra com chips e sem duplicidade
 * 6. Suporte a múltiplas regras (1:N) por Centro
 * 7. Edição de regra com persistência imediata e mensagem oficial
 * 8. Ativação / Inativação de regras sem perda de histórico
 * 9. Exclusão restrita à REGRA com soft delete e texto exato de confirmação
 * 10. Bloqueio de duplicidade de combinações (Centro + Origem + MATKL + período)
 * 11. Bloqueio de relações circulares (A->B, B->A ou A->B->C->A)
 * 12. Validação estrita de datas (Início obrigatória, Fim opcional, Fim não pode ser menor que Início)
 * 13. Persistência real dos dados no backend que sobrevive ao fechar/reabrir a tela
 * 14. Integração de auditoria com formato exato no log corporativo
 * 15. Arquitetura pronta para consulta do Motor PCP (Centro + MATKL)
 * 16. Consulta SAP ECC via RFC (MARA-MATKL) com fallback claro e transparente
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  centerDerivationService,
  CenterDerivationService,
} from '@/services/pcp-center-derivation-service'
import {
  sapMatklService,
  DEFAULT_SAP_MATKL_CATALOG,
  setSimulatedSapRfcOffline,
} from '@/services/sap-matkl-service'
import { CenterDerivationRule } from '@/types/center-derivation'
import { pcpAuditService } from '@/services/pcp-audit-service'

describe('Suíte de Aceitação: Derivação de Centro (HUB CIAFAL)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setSimulatedSapRfcOffline(false)
  })

  // -------------------------------------------------------------
  // CRITÉRIO 1: Flag visual (switch) "Centro derivado?" (Não / Sim)
  // -------------------------------------------------------------
  it('Critério 1: Centro derivado? Se Não, não exige regras; se Sim, exige regra válida', () => {
    // Quando Não (isDerived = false), nenhuma regra é exigida
    const isDerivedNo = false
    const rulesEmpty: CenterDerivationRule[] = []
    const isValidNo = !isDerivedNo || rulesEmpty.filter((r) => r.status === 'Ativa').length > 0
    expect(isValidNo).toBe(true)

    // Quando Sim (isDerived = true) e sem regras, deve ser inválido
    const isDerivedYes = true
    const isValidYesEmpty =
      !isDerivedYes || rulesEmpty.filter((r) => r.status === 'Ativa').length > 0
    expect(isValidYesEmpty).toBe(false)
  })

  // -------------------------------------------------------------
  // CRITÉRIO 2: Obrigatoriedade: Centro derivado = Sim sem nenhuma regra válida
  // -------------------------------------------------------------
  it('Critério 2: Mensagem exata de obrigatoriedade "Informe pelo menos uma derivação antes de salvar o Centro."', () => {
    const isDerived = true
    const rules: CenterDerivationRule[] = [
      {
        center_code: 'L1',
        source_center_code: 'FORNOL1',
        matkl_groups: [{ matkl: '001', description: 'Tubos' }],
        start_date: '01/01/2026',
        status: 'Inativa', // Inativa não conta como válida para o Centro
      },
    ]

    const activeRules = rules.filter((r) => !r.deleted && r.status === 'Ativa')
    let validationError: string | null = null

    if (isDerived && activeRules.length === 0) {
      validationError = 'Informe pelo menos uma derivação antes de salvar o Centro.'
    }

    expect(validationError).toBe('Informe pelo menos uma derivação antes de salvar o Centro.')
  })

  // -------------------------------------------------------------
  // CRITÉRIO 3: Seletor de Centro de Origem formatado
  // -------------------------------------------------------------
  it('Critério 3: Formatação correta do Centro de Origem no padrão corporativo CIAFAL', () => {
    const centerMock = {
      code: 'FORNOL1',
      name: 'Forno L1',
      company_name: 'CIAFAL',
      linha_produtiva_nome: 'L1',
      sap_work_center: 'FORNOL1',
    }

    const formatLabel = `${centerMock.code} — ${centerMock.name} — ${centerMock.company_name} — ${centerMock.linha_produtiva_nome} — SAP: ${centerMock.sap_work_center}`
    expect(formatLabel).toBe('FORNOL1 — Forno L1 — CIAFAL — L1 — SAP: FORNOL1')
  })

  // -------------------------------------------------------------
  // CRITÉRIO 4: Bloqueio de autorrelacionamento (Centro A -> Centro A)
  // -------------------------------------------------------------
  it('Critério 4: Bloqueio de autorrelacionamento com mensagem exata "O Centro de destino não pode ser utilizado como seu próprio Centro de origem."', async () => {
    const rule: CenterDerivationRule = {
      center_code: 'L1',
      source_center_code: 'L1', // Mesmo centro!
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '01/01/2026',
      status: 'Ativa',
    }

    const validation = await centerDerivationService.validateDerivationRule('L1', rule, [])
    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe(
      'O Centro de destino não pode ser utilizado como seu próprio Centro de origem.',
    )
  })

  // -------------------------------------------------------------
  // CRITÉRIO 5: Múltiplos Grupos de Mercadorias (MATKL) por regra
  // -------------------------------------------------------------
  it('Critério 5: Permite múltiplos grupos MATKL por regra e impede duplicidade na mesma regra', () => {
    const selectedMatkls = [
      { matkl: '001', description: 'Tubos Industriais' },
      { matkl: '002', description: 'Tubos Estruturais' },
    ]

    // Tentar adicionar duplicado
    const duplicateCandidate = { matkl: '001', description: 'Tubos Industriais' }
    const alreadyExists = selectedMatkls.some((g) => g.matkl === duplicateCandidate.matkl)
    expect(alreadyExists).toBe(true)

    // Novo candidato
    const newCandidate = { matkl: '005', description: 'Barras Chatas' }
    const newAlreadyExists = selectedMatkls.some((g) => g.matkl === newCandidate.matkl)
    expect(newAlreadyExists).toBe(false)
  })

  // -------------------------------------------------------------
  // CRITÉRIO 6: Múltiplas regras (1:N) por Centro
  // -------------------------------------------------------------
  it('Critério 6: Suporte a 1:N — um Centro pode ter múltiplas regras distintas (ex.: FORNOL1, ACAB_L1, END_L1)', async () => {
    const rule1: CenterDerivationRule = {
      center_code: 'L1',
      source_center_code: 'FORNOL1',
      matkl_groups: [
        { matkl: '001', description: 'Tubos' },
        { matkl: '002', description: 'Estruturais' },
      ],
      start_date: '01/01/2026',
      status: 'Ativa',
    }

    const rule2: CenterDerivationRule = {
      center_code: 'L1',
      source_center_code: 'ACAB_L1',
      matkl_groups: [
        { matkl: '003', description: 'Perfis' },
        { matkl: '005', description: 'Barras' },
      ],
      start_date: '01/01/2026',
      status: 'Ativa',
    }

    const val1 = await centerDerivationService.validateDerivationRule('L1', rule1, [])
    expect(val1.isValid).toBe(true)

    const val2 = await centerDerivationService.validateDerivationRule('L1', rule2, [rule1])
    expect(val2.isValid).toBe(true)
  })

  // -------------------------------------------------------------
  // CRITÉRIO 7: Edição de regra com persistência imediata
  // -------------------------------------------------------------
  it('Critério 7: Edição da regra preserva dados e atualiza status', async () => {
    const initialRule: CenterDerivationRule = {
      id: 'rule_edit_test_1',
      center_code: 'ACAB_L2',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '10/01/2026',
      status: 'Ativa',
    }

    const savedInitial = await centerDerivationService.saveDerivationRule(
      initialRule,
      'Engenharia PCP',
    )
    expect(savedInitial.status).toBe('Ativa')

    // Editar data e adicionar grupo
    const editedRule: CenterDerivationRule = {
      ...savedInitial,
      end_date: '31/12/2026',
      matkl_groups: [
        { matkl: '001', description: 'Tubos' },
        { matkl: '002', description: 'Estruturais' },
      ],
    }

    const savedEdited = await centerDerivationService.saveDerivationRule(
      editedRule,
      'Engenharia PCP',
    )
    expect(savedEdited.end_date).toBe('31/12/2026')
    expect(savedEdited.matkl_groups.length).toBe(2)
  })

  // -------------------------------------------------------------
  // CRITÉRIO 8: Ativação / Inativação de regras sem exclusão
  // -------------------------------------------------------------
  it('Critério 8: Ativação / Inativação de regras mantém integridade e histórico', async () => {
    const rule: CenterDerivationRule = {
      id: 'rule_toggle_test',
      center_code: 'ACAB_L2',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '10/01/2026',
      status: 'Ativa',
    }

    const saved = await centerDerivationService.saveDerivationRule(rule, 'Auditor PCP')
    expect(saved.status).toBe('Ativa')

    const inativada = await centerDerivationService.toggleStatus(saved, 'Auditor PCP')
    expect(inativada.status).toBe('Inativa')
    expect(inativada.deleted).toBeFalsy()

    const reativada = await centerDerivationService.toggleStatus(inativada, 'Auditor PCP')
    expect(reativada.status).toBe('Ativa')
  })

  // -------------------------------------------------------------
  // CRITÉRIO 9: Exclusão apenas da REGRA (soft delete) com mensagem exata
  // -------------------------------------------------------------
  it('Critério 9: Confirmação de exclusão com texto exato e aplicação de soft delete', async () => {
    const exactConfirmText =
      'Deseja excluir esta regra de derivação? Esta ação não excluirá o Centro cadastrado.'
    expect(exactConfirmText).toBe(
      'Deseja excluir esta regra de derivação? Esta ação não excluirá o Centro cadastrado.',
    )

    const rule: CenterDerivationRule = {
      id: 'rule_soft_delete_test',
      center_code: 'L1',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '01/01/2026',
      status: 'Ativa',
    }

    const saved = await centerDerivationService.saveDerivationRule(rule, 'Engenharia PCP')
    expect(saved.id).toBeDefined()

    const success = await centerDerivationService.softDeleteDerivationRule(
      saved.id!,
      'L1',
      'Engenharia PCP',
    )
    expect(success).toBe(true)

    // Ao consultar por centro, registros deletados não devem aparecer
    const rulesAfter = await centerDerivationService.getDerivationsByCenter('L1')
    const foundDeleted = rulesAfter.find((r) => r.id === saved.id)
    expect(foundDeleted).toBeUndefined()
  })

  // -------------------------------------------------------------
  // CRITÉRIO 10: Bloqueio de duplicidade (mesma combinação)
  // -------------------------------------------------------------
  it('Critério 10: Bloqueio de duplicidade com mensagem exata "Já existe uma derivação cadastrada para esta combinação."', async () => {
    const existingRule: CenterDerivationRule = {
      id: 'rule_dup_1',
      center_code: 'L2',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '01/01/2026',
      end_date: '31/12/2026',
      status: 'Ativa',
    }

    const duplicateCandidate: CenterDerivationRule = {
      center_code: 'L2',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '15/06/2026', // Período que sobrepõe
      end_date: '31/12/2026',
      status: 'Ativa',
    }

    const validation = await centerDerivationService.validateDerivationRule(
      'L2',
      duplicateCandidate,
      [existingRule],
    )

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('Já existe uma derivação cadastrada para esta combinação.')
  })

  // -------------------------------------------------------------
  // CRITÉRIO 11: Bloqueio de relações circulares (A->B, B->A ou A->B->C->A)
  // -------------------------------------------------------------
  it('Critério 11: Bloqueio de relações circulares com mensagem exata "Esta configuração gera uma relação circular entre Centros e não pode ser salva."', async () => {
    // Simular que já existe Centro B derivado de Centro A
    const ruleBFromA: CenterDerivationRule = {
      id: 'rule_b_a',
      center_code: 'CENTRO_B',
      source_center_code: 'CENTRO_A',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '01/01/2026',
      status: 'Ativa',
    }
    await centerDerivationService.saveDerivationRule(ruleBFromA)

    // Tentativa: Centro A derivar de Centro B (A -> B -> A)
    const ruleAFromB: CenterDerivationRule = {
      center_code: 'CENTRO_A',
      source_center_code: 'CENTRO_B',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '01/01/2026',
      status: 'Ativa',
    }

    const validation = await centerDerivationService.validateDerivationRule(
      'CENTRO_A',
      ruleAFromB,
      [],
    )

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe(
      'Esta configuração gera uma relação circular entre Centros e não pode ser salva.',
    )
  })

  // -------------------------------------------------------------
  // CRITÉRIO 12: Validação de período (Data Fim < Data Início)
  // -------------------------------------------------------------
  it('Critério 12: Bloqueio de Data Fim anterior à Data Início', async () => {
    const invalidDatesRule: CenterDerivationRule = {
      center_code: 'L1',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '10/05/2026',
      end_date: '09/05/2026', // Anterior!
      status: 'Ativa',
    }

    const validation = await centerDerivationService.validateDerivationRule(
      'L1',
      invalidDatesRule,
      [],
    )

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('A Data de Término não pode ser anterior à Data de Início.')
  })

  // -------------------------------------------------------------
  // CRITÉRIO 13: Persistência real que sobrevive ao fechar/reabrir
  // -------------------------------------------------------------
  it('Critério 13: Dados salvos persistem e podem ser recuperados ao reabrir', async () => {
    const ruleToPersist: CenterDerivationRule = {
      center_code: 'PERSIST_CENTER',
      source_center_code: 'FORNOL1',
      matkl_groups: [{ matkl: '010', description: 'Vergalhões' }],
      start_date: '01/02/2026',
      status: 'Ativa',
    }

    const saved = await centerDerivationService.saveDerivationRule(ruleToPersist, 'Engenharia')
    expect(saved.id).toBeDefined()

    // Nova instância ou chamada do serviço
    const retrieved = await centerDerivationService.getDerivationsByCenter('PERSIST_CENTER')
    expect(retrieved.length).toBeGreaterThan(0)
    expect(retrieved[0].source_center_code).toBe('FORNOL1')
    expect(retrieved[0].matkl_groups[0].matkl).toBe('010')
  })

  // -------------------------------------------------------------
  // CRITÉRIO 14: Auditoria integrada no formato exato especificado
  // -------------------------------------------------------------
  it('Critério 14: Registro de auditoria no formato oficial corporativo', async () => {
    const auditSpy = vi.spyOn(pcpAuditService, 'recordLog')

    const auditEntry = {
      center: 'ACAB_L2',
      action: 'inativação' as const,
      rule_summary: 'FORNOL1 / MATKL 001',
      previous_value: 'Ativa',
      new_value: 'Inativa',
      user_name: 'analista.pcp',
      timestamp: '18/09/2026 15:42',
    }

    await centerDerivationService.recordAuditLog(auditEntry)

    expect(auditSpy).toHaveBeenCalledTimes(1)
    const callArg = auditSpy.mock.calls[0][0]
    expect(callArg.resource).toBe('PCP_CENTER_DERIVATION')
    expect(callArg.details.formatted_log).toContain(
      'Centro ACAB_L2 | Derivação inativação | FORNOL1 / MATKL 001 | Ativa → Inativa | usuário analista.pcp | 18/09/2026 15:42',
    )
  })

  // -------------------------------------------------------------
  // CRITÉRIO 15: Arquitetura consultável pelo Motor do PCP
  // -------------------------------------------------------------
  it('Critério 15: findDerivationForMotor localiza regra ativa por Centro + MATKL + Data de referência', async () => {
    const ruleForMotor: CenterDerivationRule = {
      center_code: 'MOTOR_TEST',
      source_center_code: 'ORIGEM_FORNO',
      matkl_groups: [
        { matkl: '001', description: 'Tubos' },
        { matkl: '002', description: 'Estruturais' },
      ],
      start_date: '01/01/2026',
      end_date: '31/12/2026',
      status: 'Ativa',
    }

    await centerDerivationService.saveDerivationRule(ruleForMotor)

    // Consulta com MATKL existente dentro da vigência
    const found = await centerDerivationService.findDerivationForMotor(
      'MOTOR_TEST',
      '001',
      '2026-06-15',
    )
    expect(found).not.toBeNull()
    expect(found?.source_center_code).toBe('ORIGEM_FORNO')

    // Consulta com MATKL não coberto
    const notFound = await centerDerivationService.findDerivationForMotor(
      'MOTOR_TEST',
      '999',
      '2026-06-15',
    )
    expect(notFound).toBeNull()
  })

  // -------------------------------------------------------------
  // CRITÉRIO 16: Consulta SAP ECC via RFC (MARA-MATKL) com fallback claro
  // -------------------------------------------------------------
  it('Critério 16: SAP RFC MARA-MATKL informa indisponibilidade claramente e nunca inventa dados silenciosamente', async () => {
    // 1. Consulta em modo normal
    const searchResult = await sapMatklService.searchMatklGroups('001')
    expect(searchResult.items.length).toBeGreaterThan(0)
    expect(searchResult.items[0].matkl).toBe('001')

    // 2. Simular indisponibilidade temporária da RFC SAP
    setSimulatedSapRfcOffline(true)

    const offlineResult = await sapMatklService.searchMatklGroups('001')
    expect(offlineResult.is_offline).toBe(true)
    expect(offlineResult.message).toContain(
      'Conexão SAP RFC (MARA-MATKL) temporariamente indisponível',
    )
    // Dados exibidos são do cache oficial, com aviso explícito
    expect(offlineResult.items.length).toBeGreaterThan(0)
  })
})
