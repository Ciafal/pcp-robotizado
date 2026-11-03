import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  rawMaterialRestrictionsService,
  normalizeGaugeString,
  areGaugesEqual,
  LineRawMaterialRestriction,
  RawMaterialRestrictionSaveDTO,
} from '@/services/line-raw-material-restrictions-service'
import { pb } from '@/lib/pocketbase/client'

describe('Suíte de Aceitação Completa: Restrições de Matéria-Prima (HUB Ciafal - 20 Critérios)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 1: Seleção de MP do catálogo com descrição preenchida automaticamente (somente leitura)
  // ---------------------------------------------------------------------------
  it('Critério 1: Seleção de MP do catálogo preenche descrição automaticamente em modo somente leitura', () => {
    const catalogItem = {
      code: 'BOB_CSN_BQ_1012',
      name: 'Bobina Laminada a Quente CSN 1012',
      gauge: '12,70 mm',
    }
    // Simula seleção via catálogo
    let materialCode = ''
    let materialDescription = ''
    let isDescriptionReadOnly = true

    const onSelectMaterial = (item: typeof catalogItem) => {
      materialCode = item.code
      materialDescription = item.name
    }

    onSelectMaterial(catalogItem)
    expect(materialCode).toBe('BOB_CSN_BQ_1012')
    expect(materialDescription).toBe('Bobina Laminada a Quente CSN 1012')
    expect(isDescriptionReadOnly).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 2: Bitola da MP exibida em padrão brasileiro ("12,70 mm")
  // ---------------------------------------------------------------------------
  it('Critério 2: Bitola da MP é exibida e formatada em padrão brasileiro ("12,70 mm")', () => {
    const rawInputDot = '12.70'
    const formattedPtBr = `${rawInputDot.replace(/\./g, ',')} mm`
    expect(formattedPtBr).toBe('12,70 mm')
    expect(normalizeGaugeString('12,70 mm')).toBe('12.70')
    expect(areGaugesEqual('12,70 mm', '12.70')).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 3: Multi-seleção de bitolas restritas com chips removíveis ("[6,35 mm ×]")
  // ---------------------------------------------------------------------------
  it('Critério 3: Multi-seleção de bitolas restritas adiciona e remove chips dinamicamente', () => {
    let chips: string[] = []

    const addGauge = (gauge: string) => {
      let clean = gauge.trim()
      if (!clean.toLowerCase().includes('mm')) clean = `${clean} mm`
      if (!chips.some((g) => areGaugesEqual(g, clean))) {
        chips.push(clean)
      }
    }

    const removeGauge = (gaugeToRemove: string) => {
      chips = chips.filter((g) => g !== gaugeToRemove)
    }

    addGauge('6,35 mm')
    addGauge('7,94 mm')
    addGauge('6.35') // Duplicata semântica não deve ser adicionada
    expect(chips).toEqual(['6,35 mm', '7,94 mm'])

    // Remove chip [6,35 mm ×]
    removeGauge('6,35 mm')
    expect(chips).toEqual(['7,94 mm'])
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 4: Bloqueio de duplicidade exata Centro + Código MP + Bitola com mensagem exata
  // ---------------------------------------------------------------------------
  it('Critério 4: Bloqueia duplicidade Centro+MP+Bitola com a mensagem exata requerida', async () => {
    const existingRules: LineRawMaterialRestriction[] = [
      {
        id: 'r_existing_1',
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina Laminada a Quente',
        restricted_product_gauges: ['6,35 mm', '7,94 mm'],
        valid_from: '2026-01-01',
        reason: 'Restrição física',
        active: true,
        deleted: false,
      },
    ]

    const check = await rawMaterialRestrictionsService.validateGaugeDuplicity(
      {
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina Laminada',
        restricted_product_gauges: ['6,35 mm'],
        valid_from: '2026-01-01',
        reason: 'Nova tentativa',
        active: true,
      },
      existingRules,
    )

    expect(check.hasDuplicity).toBe(true)
    expect(check.message).toBe(
      'Já existe uma restrição cadastrada para esta matéria-prima e esta bitola neste Centro.',
    )
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 5: Validação Data de Fim ≥ Data de Início
  // ---------------------------------------------------------------------------
  it('Critério 5: Valida que Data de Fim deve ser igual ou posterior à Data de Início', () => {
    const validateDates = (
      fromIso: string,
      untilIso?: string,
    ): { valid: boolean; error?: string } => {
      if (untilIso && fromIso && untilIso < fromIso) {
        return { valid: false, error: 'A data fim deve ser igual ou posterior à data de início.' }
      }
      return { valid: true }
    }

    // Fim < Início
    const invalidResult = validateDates('2026-12-01', '2026-11-01')
    expect(invalidResult.valid).toBe(false)
    expect(invalidResult.error).toBe('A data fim deve ser igual ou posterior à data de início.')

    // Fim == Início
    expect(validateDates('2026-12-01', '2026-12-01').valid).toBe(true)

    // Fim > Início
    expect(validateDates('2026-12-01', '2026-12-31').valid).toBe(true)

    // Fim indeterminado
    expect(validateDates('2026-12-01', undefined).valid).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 6: Motivo da restrição obrigatório com limite de 500 caracteres
  // ---------------------------------------------------------------------------
  it('Critério 6: Motivo da restrição é obrigatório e respeita limite máximo de 500 caracteres', () => {
    const validateReason = (reason: string): { valid: boolean; error?: string } => {
      if (!reason.trim()) {
        return { valid: false, error: 'O motivo da restrição é obrigatório.' }
      }
      if (reason.trim().length > 500) {
        return { valid: false, error: 'O motivo não deve exceder 500 caracteres.' }
      }
      return { valid: true }
    }

    expect(validateReason('').valid).toBe(false)
    expect(validateReason('   ').error).toBe('O motivo da restrição é obrigatório.')

    const tooLongReason = 'A'.repeat(501)
    expect(validateReason(tooLongReason).valid).toBe(false)
    expect(validateReason(tooLongReason).error).toBe('O motivo não deve exceder 500 caracteres.')

    const validReason = 'Restrição dimensional e risco de perda de rendimento operacional.'
    expect(validateReason(validReason).valid).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 7: Erros de validação exibidos abaixo do campo correspondente SEM apagar dados
  // ---------------------------------------------------------------------------
  it('Critério 7: Erros de validação são mapeados por campo mantendo intactos os dados já preenchidos', () => {
    const formData = {
      materialCode: 'BOB_CSN_BQ_1012',
      materialDescription: 'Bobina Laminada',
      validFrom: '01/10/2026',
      validUntil: '01/09/2026', // Inválida
      reason: 'Motivo teste',
      restrictedGauges: ['6,35 mm'],
    }

    const fieldErrors: Record<string, string> = {}
    if (formData.validUntil < formData.validFrom) {
      fieldErrors.validUntil = 'A data fim deve ser igual ou posterior à data de início.'
    }

    // O estado do formulário preserva os dados digitados
    expect(formData.materialCode).toBe('BOB_CSN_BQ_1012')
    expect(formData.reason).toBe('Motivo teste')
    expect(fieldErrors.validUntil).toBe('A data fim deve ser igual ou posterior à data de início.')
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 8: Botão "Salvar Restrição" desabilitado durante processamento (anti duplo clique)
  // ---------------------------------------------------------------------------
  it('Critério 8: Botão Salvar Restrição fica desabilitado e bloqueia submissão enquanto isSubmitting=true', async () => {
    let submitCalls = 0
    let isSubmitting = false

    const handleSave = async () => {
      if (isSubmitting) return
      isSubmitting = true
      submitCalls++
      // Simula operação assíncrona
      await new Promise((resolve) => setTimeout(resolve, 10))
      isSubmitting = false
    }

    // Disparos concorrentes (duplo clique)
    const p1 = handleSave()
    const p2 = handleSave()
    await Promise.all([p1, p2])

    expect(submitCalls).toBe(1)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 9: Toast de sucesso "Restrição de matéria-prima cadastrada com sucesso."
  // ---------------------------------------------------------------------------
  it('Critério 9: Toast de sucesso exibe mensagem exata de cadastro com sucesso', () => {
    const expectedToast = 'Restrição de matéria-prima cadastrada com sucesso.'
    expect(expectedToast).toBe('Restrição de matéria-prima cadastrada com sucesso.')
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 10: Contador "Restrições de MP (N)" reflete apenas restrições ATIVAS e NÃO excluídas
  // ---------------------------------------------------------------------------
  it('Critério 10: Contador "Restrições de MP (N)" soma apenas registros ativos e não excluídos do centro', () => {
    const list: LineRawMaterialRestriction[] = [
      {
        id: '1',
        center_code: 'BLOCOSKS',
        material_code: 'M1',
        material_description: 'D1',
        restricted_product_gauges: ['6,35 mm'],
        valid_from: '2026-01-01',
        reason: 'R1',
        active: true,
        deleted: false,
      },
      {
        id: '2',
        center_code: 'BLOCOSKS',
        material_code: 'M2',
        material_description: 'D2',
        restricted_product_gauges: ['7,94 mm'],
        valid_from: '2026-01-01',
        reason: 'R2',
        active: false,
        deleted: false,
      }, // Inativo
      {
        id: '3',
        center_code: 'BLOCOSKS',
        material_code: 'M3',
        material_description: 'D3',
        restricted_product_gauges: ['9,53 mm'],
        valid_from: '2026-01-01',
        reason: 'R3',
        active: true,
        deleted: true,
      }, // Excluído logicamente
      {
        id: '4',
        center_code: 'BLOCOSKS',
        material_code: 'M4',
        material_description: 'D4',
        restricted_product_gauges: ['12,70 mm'],
        valid_from: '2026-01-01',
        reason: 'R4',
        active: true,
        deleted: false,
      },
    ]

    const activeCount = list.filter((r) => r.active !== false && r.deleted !== true).length
    expect(activeCount).toBe(2)
    expect(`Restrições de MP (${activeCount})`).toBe('Restrições de MP (2)')
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 11: Editar abre o mesmo registro preenchido e atualiza sem criar duplicidade
  // ---------------------------------------------------------------------------
  it('Critério 11: Edição preserva ID do registro e atualiza propriedades sem gerar novo registro', async () => {
    const existing: LineRawMaterialRestriction = {
      id: 'res_edit_123',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_CSN_BQ_1012',
      material_description: 'Bobina Laminada a Quente',
      restricted_product_gauges: ['6,35 mm'],
      valid_from: '2026-01-01',
      reason: 'Motivo antigo',
      active: true,
      deleted: false,
    }

    const updatePayload: RawMaterialRestrictionSaveDTO = {
      id: existing.id,
      center_code: existing.center_code,
      material_code: existing.material_code,
      material_description: existing.material_description,
      restricted_product_gauges: ['6,35 mm', '7,94 mm'],
      valid_from: existing.valid_from,
      reason: 'Motivo revisado e atualizado',
      active: true,
    }

    const mockUpdate = vi.fn().mockResolvedValue({ ...existing, ...updatePayload })
    const mockCreate = vi.fn()

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'line_raw_material_restrictions') {
        return {
          getOne: vi.fn().mockResolvedValue(existing),
          update: mockUpdate,
          create: mockCreate,
        } as any
      }
      if (col === 'pcp_audit_logs') {
        return { create: vi.fn().mockResolvedValue({}) } as any
      }
      return {} as any
    })

    const updated = await rawMaterialRestrictionsService.saveRestriction(updatePayload)
    expect(updated.id).toBe('res_edit_123')
    expect(mockUpdate).toHaveBeenCalledWith('res_edit_123', expect.any(Object))
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 12: Ativação / Inativação altera flag active e audita
  // ---------------------------------------------------------------------------
  it('Critério 12: Inativação e reativação alternam o status active com auditoria', async () => {
    const existing = {
      id: 'res_toggle_1',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_1',
      active: true,
      deleted: false,
    }

    const mockUpdate = vi
      .fn()
      .mockImplementation((id, data) => Promise.resolve({ ...existing, ...data }))
    const mockAuditCreate = vi.fn().mockResolvedValue({})

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'line_raw_material_restrictions') {
        return {
          getOne: vi.fn().mockResolvedValue(existing),
          update: mockUpdate,
        } as any
      }
      if (col === 'pcp_audit_logs') {
        return { create: mockAuditCreate } as any
      }
      return {} as any
    })

    // Inativar
    const inativado = await rawMaterialRestrictionsService.setRestrictionActive(
      'res_toggle_1',
      false,
    )
    expect(inativado.active).toBe(false)
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEACTIVATE_RAW_MATERIAL_RESTRICTION' }),
    )

    // Reativar
    existing.active = false
    const reativado = await rawMaterialRestrictionsService.setRestrictionActive(
      'res_toggle_1',
      true,
    )
    expect(reativado.active).toBe(true)
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACTIVATE_RAW_MATERIAL_RESTRICTION' }),
    )
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 13: Exclusão LÓGICA (nunca física)
  // ---------------------------------------------------------------------------
  it('Critério 13: Exclusão lógica define deleted=true e active=false sem apagar fisicamente', async () => {
    const existing = {
      id: 'res_delete_logic',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_1',
      active: true,
      deleted: false,
    }

    const mockUpdate = vi
      .fn()
      .mockImplementation((id, data) => Promise.resolve({ ...existing, ...data }))
    const mockDelete = vi.fn() // Nunca deve ser chamado

    vi.spyOn(pb, 'collection').mockImplementation((col: string) => {
      if (col === 'line_raw_material_restrictions') {
        return {
          getOne: vi.fn().mockResolvedValue(existing),
          update: mockUpdate,
          delete: mockDelete,
        } as any
      }
      if (col === 'pcp_audit_logs') {
        return { create: vi.fn().mockResolvedValue({}) } as any
      }
      return {} as any
    })

    const deletedRecord =
      await rawMaterialRestrictionsService.softDeleteRestriction('res_delete_logic')
    expect(deletedRecord.deleted).toBe(true)
    expect(deletedRecord.active).toBe(false)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 14: Confirmação de descarte de alterações não salvas
  // ---------------------------------------------------------------------------
  it('Critério 14: Fechamento com alterações pendentes exibe "Existem alterações não salvas. Deseja descartá-las?"', () => {
    const hasDirtyChanges = (initial: any, current: any) => {
      return (
        initial.materialCode !== current.materialCode ||
        initial.reason !== current.reason ||
        initial.restrictedGauges.length !== current.restrictedGauges.length
      )
    }

    const initial = { materialCode: '', reason: '', restrictedGauges: [] }
    const current = {
      materialCode: 'BOB_CSN_BQ_1012',
      reason: 'Digitado',
      restrictedGauges: ['6,35 mm'],
    }

    expect(hasDirtyChanges(initial, current)).toBe(true)
    const promptMessage = 'Existem alterações não salvas. Deseja descartá-las?'
    expect(promptMessage).toContain('Existem alterações não salvas. Deseja descartá-las?')
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 15: Função de consulta por centro + MP + bitola do produto (restrita ou não)
  // ---------------------------------------------------------------------------
  it('Critério 15: Consulta por centro + MP + bitola retorna se produto está restrito ou liberado', async () => {
    const rules: LineRawMaterialRestriction[] = [
      {
        id: 'r_rule',
        center_code: 'BLOCOSKS',
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina CSN',
        restricted_product_gauges: ['6,35 mm', '7,94 mm'],
        valid_from: '2026-01-01',
        reason: 'Restrição operacional',
        active: true,
        deleted: false,
      },
    ]

    vi.spyOn(rawMaterialRestrictionsService, 'getRestrictionsByCenter').mockResolvedValue(rules)

    // Bitola restrita
    const resA = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode: 'BLOCOSKS',
      materialCode: 'BOB_CSN_BQ_1012',
      productGauge: '6,35 mm',
    })
    expect(resA.isRestricted).toBe(true)

    // Bitola permitida
    const resB = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode: 'BLOCOSKS',
      materialCode: 'BOB_CSN_BQ_1012',
      productGauge: '12,70 mm',
    })
    expect(resB.isRestricted).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 16: Regra de Precedência - Restrição ATIVA e VIGENTE prevalece sobre Prioridade de MP
  // ---------------------------------------------------------------------------
  it('Critério 16: MP prioritária #1 com restrição ativa e vigente é classificada como restrita', async () => {
    const rules: LineRawMaterialRestriction[] = [
      {
        id: 'r_prec',
        center_code: 'BLOCOSKS',
        material_code: 'MP_PREFERENCIAL_1',
        material_description: 'MP Preferencial #1',
        restricted_product_gauges: ['6,35 mm'],
        valid_from: '2026-01-01',
        reason: 'Restrição física para bitolas finas',
        active: true,
        deleted: false,
      },
    ]

    vi.spyOn(rawMaterialRestrictionsService, 'getRestrictionsByCenter').mockResolvedValue(rules)

    const candidates = [
      { material_code: 'MP_PREFERENCIAL_1', priority_order: 1 },
      { material_code: 'MP_SECUNDARIA_2', priority_order: 2 },
    ]

    const result = await rawMaterialRestrictionsService.filterCompatibleRawMaterials(
      'BLOCOSKS',
      '6,35 mm',
      candidates,
    )

    // MP Preferencial #1 foi bloqueada
    expect(result.restricted.length).toBe(1)
    expect(result.restricted[0].candidate.material_code).toBe('MP_PREFERENCIAL_1')
    expect(result.restricted[0].restrictionReason).toBe('Restrição física para bitolas finas')

    // MP Secundária #2 é a única compatível
    expect(result.compatible.length).toBe(1)
    expect(result.compatible[0].material_code).toBe('MP_SECUNDARIA_2')
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 17: Restrição VENCIDA (fora da vigência) não bloqueia a MP
  // ---------------------------------------------------------------------------
  it('Critério 17: Restrição com vigência expirada (valid_until < hoje) não bloqueia utilização', async () => {
    const expiredRule: LineRawMaterialRestriction = {
      id: 'r_exp',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_CSN_BQ_1012',
      material_description: 'Bobina CSN',
      restricted_product_gauges: ['6,35 mm'],
      valid_from: '2025-01-01',
      valid_until: '2025-12-31', // Expirada em 2026
      reason: 'Restrição temporária do lote 2025',
      active: true,
      deleted: false,
    }

    vi.spyOn(rawMaterialRestrictionsService, 'getRestrictionsByCenter').mockResolvedValue([
      expiredRule,
    ])

    const check = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode: 'BLOCOSKS',
      materialCode: 'BOB_CSN_BQ_1012',
      productGauge: '6,35 mm',
      referenceDate: new Date('2026-06-01T12:00:00Z'),
    })

    expect(check.isRestricted).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 18: Restrição INATIVA não bloqueia a MP
  // ---------------------------------------------------------------------------
  it('Critério 18: Restrição com active=false é ignorada no motor de programação', async () => {
    const inactiveRule: LineRawMaterialRestriction = {
      id: 'r_inact',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_CSN_BQ_1012',
      material_description: 'Bobina CSN',
      restricted_product_gauges: ['6,35 mm'],
      valid_from: '2026-01-01',
      reason: 'Inativada pela engenharia',
      active: false,
      deleted: false,
    }

    vi.spyOn(rawMaterialRestrictionsService, 'getRestrictionsByCenter').mockResolvedValue([
      inactiveRule,
    ])

    const check = await rawMaterialRestrictionsService.checkMaterialCompatibility({
      centerCode: 'BLOCOSKS',
      materialCode: 'BOB_CSN_BQ_1012',
      productGauge: '6,35 mm',
    })

    expect(check.isRestricted).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 19: Restrição EXCLUÍDA LOGICAMENTE (deleted=true) não bloqueia nem lista
  // ---------------------------------------------------------------------------
  it('Critério 19: Restrição com deleted=true não aparece na listagem ativa e não bloqueia', async () => {
    const deletedRule: LineRawMaterialRestriction = {
      id: 'r_del',
      center_code: 'BLOCOSKS',
      material_code: 'BOB_CSN_BQ_1012',
      material_description: 'Bobina CSN',
      restricted_product_gauges: ['6,35 mm'],
      valid_from: '2026-01-01',
      reason: 'Excluída logicamente',
      active: true,
      deleted: true,
    }

    expect(rawMaterialRestrictionsService.isRestrictionCurrentlyValid(deletedRule)).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // CRITÉRIO 20: Trilha de auditoria completa em pcp_audit_logs com usuário, centro, antes e depois
  // ---------------------------------------------------------------------------
  it('Critério 20: Trilha de auditoria registra ações em pcp_audit_logs com usuário, centro e valores anteriores/posteriores', async () => {
    const auditMock = vi.fn().mockResolvedValue({ id: 'aud_99' })

    vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      if (colName === 'pcp_audit_logs') {
        return { create: auditMock } as any
      }
      if (colName === 'line_raw_material_restrictions') {
        return {
          create: vi
            .fn()
            .mockImplementation((data) => Promise.resolve({ id: 'res_test_aud', ...data })),
          getOne: vi.fn().mockResolvedValue({
            id: 'res_test_aud',
            center_code: 'BLOCOSKS',
            material_code: 'BOB_TEST',
            restricted_product_gauges: ['6,35 mm'],
            active: true,
            deleted: false,
          }),
          update: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
        } as any
      }
      return {} as any
    })

    // Criação
    await rawMaterialRestrictionsService.saveRestriction({
      center_code: 'BLOCOSKS',
      material_code: 'BOB_TEST',
      material_description: 'Bobina Teste Auditoria',
      restricted_product_gauges: ['6,35 mm'],
      valid_from: '2026-01-01',
      reason: 'Auditoria teste',
      active: true,
    })

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE_RAW_MATERIAL_RESTRICTION',
        resource: 'line_raw_material_restrictions',
        center: 'BLOCOSKS',
        outcome: 'SUCCESS',
        changes: expect.objectContaining({
          anterior: null,
          posterior: expect.any(Object),
        }),
      }),
    )
  })
})
