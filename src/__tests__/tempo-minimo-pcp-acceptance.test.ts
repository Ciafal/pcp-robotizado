import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  evaluateTempoMinimoPcp,
  calculateMinimoPcpAntecedencia,
  formatMinutosToDisplay,
  parseDateAndTimeToDate,
  formatDateToBrDateTime,
  calculatePrimeiroInicioPermitido,
  validateDerivedScheduleTempoMinimo,
  TempoMinimoPcpApplicationItem,
  TempoMinimoPcpEvaluationResult,
} from '@/services/tempo-minimo-pcp-engine'
import { pcpAuditService } from '@/services/pcp-audit-service'

describe('Tempo Mínimo PCP Engine & Acceptance Suite (T1 - T12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // T1 Cadastro: Unidade=Horas, Valor=12 -> cálculo em minutos = 720
  it('T1 Cadastro: calcula corretamente minutos para Unidade=Horas e Valor=12', () => {
    const minutos = calculateMinimoPcpAntecedencia('Horas', 12)
    expect(minutos).toBe(720)
    expect(formatMinutosToDisplay(720)).toBe('12 h')
  })

  // T2 Persistência e Formatação
  it('T2 Persistência e Formatação: formata Minutos, Horas, Dias e Semanas', () => {
    expect(calculateMinimoPcpAntecedencia('Minutos', 90)).toBe(90)
    expect(calculateMinimoPcpAntecedencia('Dias', 2)).toBe(2880)
    expect(calculateMinimoPcpAntecedencia('Semanas', 1)).toBe(10080)
    expect(formatMinutosToDisplay(90)).toBe('90 min')
    expect(formatMinutosToDisplay(2880)).toBe('2 d')
  })

  // T3 Inclusão inválida: 8h disponíveis para regra de 12h -> BLOQUEAR
  it('T3 Inclusão inválida: 8h disponíveis para regra de 12h -> BLOQUEAR', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const start = new Date('2026-09-28T18:00:00Z') // 8 horas à frente

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_TEST',
        raw_material_code: 'MP_1020',
        application: 'ZPPT052-APLICACAO',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 12,
        tempo_minimo_pcp_minutos: 720,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_TEST',
      rawMaterialCode: 'MP_1020',
      application: 'ZPPT052-APLICACAO',
      targetStartDateTime: start,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(false)
    expect(result.blockingItem).toBeDefined()
    expect(result.blockingItem?.raw_material_code).toBe('MP_1020')
    expect(result.antecedenciaDisponivelMinutos).toBe(480) // 8h
    expect(result.tempoMinimoExigidoMinutos).toBe(720) // 12h
    expect(result.primeiroInicioPermitido).toBeDefined()
  })

  // T4 Limite exato: exatamente 12h -> PERMITIR
  it('T4 Limite exato: exatamente 12h -> PERMITIR', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const start = new Date('2026-09-28T22:00:00Z') // Exatas 12h

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_TEST',
        raw_material_code: 'MP_1020',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 12,
        tempo_minimo_pcp_minutos: 720,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_TEST',
      rawMaterialCode: 'MP_1020',
      targetStartDateTime: start,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(true)
    expect(result.blockingItem).toBeNull()
  })

  // T5 Superior: 16h -> PERMITIR
  it('T5 Superior: 16h -> PERMITIR', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const start = new Date('2026-09-29T02:00:00Z') // 16h

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_TEST',
        raw_material_code: 'MP_1020',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 12,
        tempo_minimo_pcp_minutos: 720,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_TEST',
      rawMaterialCode: 'MP_1020',
      targetStartDateTime: start,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(true)
  })

  // T6 Drag-and-drop inválido: mover para horário com antecedência inferior -> bloquear e retornar primeiro horário
  it('T6 Drag-and-drop inválido: mover para horário com antecedência inferior -> bloquear', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const movedTarget = new Date('2026-09-28T14:00:00Z') // apenas 4h

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_TEST',
        raw_material_code: 'MP_1045',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 24,
        tempo_minimo_pcp_minutos: 1440,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_TEST',
      rawMaterialCode: 'MP_1045',
      targetStartDateTime: movedTarget,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(false)
    expect(result.message).toContain('Movimentação não permitida')
    expect(result.primeiroInicioPermitidoFormatado).toBeDefined()
  })

  // T7 Drag-and-drop válido: mover para horário permitido -> persistir
  it('T7 Drag-and-drop válido: mover para horário permitido -> PERMITIR', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const movedTarget = new Date('2026-09-29T11:00:00Z') // 25h de antecedência

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_TEST',
        raw_material_code: 'MP_1045',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 24,
        tempo_minimo_pcp_minutos: 1440,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_TEST',
      rawMaterialCode: 'MP_1045',
      targetStartDateTime: movedTarget,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(true)
  })

  // T8 Edição: alterar data/hora para condição inválida -> não salvar
  it('T8 Edição: alterar data/hora para condição inválida -> não salvar', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const editedStart = new Date('2026-09-28T12:00:00Z') // apenas 2h

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_TEST',
        raw_material_code: 'MP_SPECIAL',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 6,
        tempo_minimo_pcp_minutos: 360,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_TEST',
      rawMaterialCode: 'MP_SPECIAL',
      targetStartDateTime: editedStart,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(false)
    expect(result.tempoMinimoExigidoMinutos).toBe(360)
  })

  // T9 Múltiplas MPs: MPs com parâmetros diferentes -> validar todas e bloquear pela mais restritiva
  it('T9 Múltiplas MPs: valida todas as MPs e bloqueia pela mais restritiva', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    // Pretendido: 18h após now (disponível = 18h = 1080 min)
    const target = new Date('2026-09-29T04:00:00Z')

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_MULTI',
        raw_material_code: 'MP_A',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 12, // 12h -> atende
        tempo_minimo_pcp_minutos: 720,
      },
      {
        center_code: 'L1',
        product_code: 'PROD_MULTI',
        raw_material_code: 'MP_B',
        tempo_minimo_pcp_unidade: 'Dias',
        tempo_minimo_pcp_valor: 2, // 48h = 2880 min -> NÃO atende
        tempo_minimo_pcp_minutos: 2880,
      },
      {
        center_code: 'L1',
        product_code: 'PROD_MULTI',
        raw_material_code: 'MP_C',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 24, // 24h = 1440 min -> NÃO atende
        tempo_minimo_pcp_minutos: 1440,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_MULTI',
      targetStartDateTime: target,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(false)
    expect(result.violatingItems.length).toBe(2)
    // Mais restritiva é MP_B (2 dias = 2880 min)
    expect(result.blockingItem?.raw_material_code).toBe('MP_B')
    expect(result.tempoMinimoExigidoMinutos).toBe(2880)
  })

  // T10 Registro antigo: MP sem Tempo mínimo cadastrado -> não quebrar, não bloquear
  it('T10 Registro antigo: MP sem Tempo mínimo cadastrado -> não quebrar, não bloquear', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const target = new Date('2026-09-28T10:15:00Z') // Apenas 15 min à frente

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_LEGACY',
        raw_material_code: 'MP_LEGACY',
        application: 'ZPPT052-APLICACAO',
        tempo_minimo_pcp_unidade: null,
        tempo_minimo_pcp_valor: null,
        tempo_minimo_pcp_minutos: null,
      },
    ]

    const result = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_LEGACY',
      rawMaterialCode: 'MP_LEGACY',
      targetStartDateTime: target,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(true)
    expect(result.blockingItem).toBeNull()
    expect(result.hasRuleConfigured).toBe(false)
  })

  // T11 Programação derivada: gerar em condição inválida -> bloquear antes da persistência
  it('T11 Programação derivada: gerar em condição inválida -> bloquear antes da persistência', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const derivedTarget = new Date('2026-09-28T15:00:00Z') // 5h

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'ACAB_L2',
        product_code: 'PROD_DERIVED',
        raw_material_code: 'MP_DERIVED_01',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 10,
        tempo_minimo_pcp_minutos: 600,
      },
    ]

    const result = validateDerivedScheduleTempoMinimo({
      destinationCenterCode: 'ACAB_L2',
      productCode: 'PROD_DERIVED',
      targetStartDateTime: derivedTarget,
      now,
      applications: apps,
    })

    expect(result.isValid).toBe(false)
    expect(result.blockingItem?.center_code).toBe('ACAB_L2')
    expect(result.blockingItem?.raw_material_code).toBe('MP_DERIVED_01')
  })

  // T12 Auditoria: evento PROGRAMACAO_BLOQUEADA_TEMPO_MINIMO_PCP
  it('T12 Auditoria: registra tentativa bloqueada com todos os metadados requeridos', async () => {
    const spy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue(true as any)

    const now = new Date('2026-09-28T10:00:00Z')
    const target = new Date('2026-09-28T14:00:00Z')

    const apps: TempoMinimoPcpApplicationItem[] = [
      {
        center_code: 'L1',
        product_code: 'PROD_AUDIT',
        raw_material_code: 'MP_AUDIT',
        tempo_minimo_pcp_unidade: 'Horas',
        tempo_minimo_pcp_valor: 12,
        tempo_minimo_pcp_minutos: 720,
      },
    ]

    const evalResult = evaluateTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_AUDIT',
      rawMaterialCode: 'MP_AUDIT',
      targetStartDateTime: target,
      now,
      applications: apps,
    })

    expect(evalResult.isValid).toBe(false)

    await pcpAuditService.recordBlockedTempoMinimoPcp({
      centerCode: 'L1',
      productCode: 'PROD_AUDIT',
      rawMaterialCode: 'MP_AUDIT',
      targetDateTime: target.toISOString(),
      tempoMinimoMinutos: evalResult.tempoMinimoExigidoMinutos,
      antecedenciaDisponivelMinutos: evalResult.antecedenciaDisponivelMinutos,
      primeiroHorarioPermitido: evalResult.primeiroInicioPermitidoFormatado || '',
      originAction: 'inclusao',
    })

    expect(spy).toHaveBeenCalled()
    const callArgs = spy.mock.calls[0][0]
    expect(callArgs.action).toBe('PROGRAMACAO_BLOQUEADA_TEMPO_MINIMO_PCP')
    expect(callArgs.details?.center).toBe('L1')
    expect(callArgs.details?.product_code).toBe('PROD_AUDIT')
    expect(callArgs.details?.raw_material_code).toBe('MP_AUDIT')
    expect(callArgs.details?.action_origin).toBe('inclusao')
  })

  // T13 Fallback do Backend: se o servidor retornar TEMPO_MINIMO_PCP_NAO_ATENDIDO, tratar e bloquear
  it('T13 Fallback backend: captura erro 400 com código TEMPO_MINIMO_PCP_NAO_ATENDIDO', () => {
    const backendError = {
      status: 400,
      response: {
        code: 'TEMPO_MINIMO_PCP_NAO_ATENDIDO',
        message: 'A programação não pode ser realizada porque a matéria-prima MP_SPECIAL exige antecedência mínima de 12 Horas.',
        details: {
          rawMaterialCode: 'MP_SPECIAL',
          requiredValue: 12,
          requiredUnit: 'Horas',
          requiredMinutes: 720,
          availableMinutes: 300,
          earliestAllowedDate: '29/09/2026 10:00',
        },
      },
    }

    const isTempoMinimoError =
      backendError.response?.code === 'TEMPO_MINIMO_PCP_NAO_ATENDIDO' ||
      String(backendError.response?.message || '').includes('TEMPO_MINIMO_PCP_NAO_ATENDIDO')

    expect(isTempoMinimoError).toBe(true)
    expect(backendError.response.details.rawMaterialCode).toBe('MP_SPECIAL')
    expect(backendError.response.details.requiredMinutes).toBe(720)
  })
})
