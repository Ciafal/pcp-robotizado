import { describe, it, expect } from 'vitest'
import { MpProgrammingEngine } from '@/services/mp-programming-engine'

describe('Suíte de Testes Canônicos de Matéria-Prima Programada (T01–T12)', () => {
  // T01: fórmula canônica MP Necessária = Produção Programada / (Rendimento % / 100)
  // 100 t / 90% = 111,11 t (PROIBIDO 100 + 10% = 110 t)
  it('T01: deve calcular 111,11 t para 100 t a 90% de rendimento (PROIBIDO 100 + 10%)', () => {
    const required = MpProgrammingEngine.calculateCanonicalMpRequired(100, 90)
    expect(required).toBe(111.11)
    expect(required).not.toBe(110)
  })

  // T02: Necessidade total é ÚNICA e comparada à SOMA das linhas de MP (60 + 51,11 = 111,11 -> ATENDIDO)
  it('T02: deve retornar status ATENDIDO quando a soma das MPs iguala a necessidade total única (60 + 51,11 = 111,11)', () => {
    const res = MpProgrammingEngine.evaluateScheduleMpControl({
      plannedProductionTons: 100,
      yieldPct: 90,
      rawMaterialRows: [
        {
          id: 'row-1',
          materialCode: 'TAR-130',
          mpType: 'TARUGO 130x130',
          yieldPct: 90,
          quantityTons: 60,
        },
        {
          id: 'row-2',
          materialCode: 'TAR-130-B',
          mpType: 'TARUGO 130x130',
          yieldPct: 90,
          quantityTons: 51.11,
        },
      ],
    })

    expect(res.totalRequiredTons).toBe(111.11)
    expect(res.totalProgrammedMpTons).toBe(111.11)
    expect(res.differenceTons).toBe(0)
    expect(res.status).toBe('ATENDIDO')
    expect(res.color).toBe('GREEN')
    expect(res.isExcessBlocked).toBe(false)
    expect(res.canSave).toBe(true)
  })

  // T03: Excesso (Σ MP > necessidade) bloqueia o salvamento (120 t > 111,11 t -> excesso 8,89 t bloqueia)
  it('T03: excesso de MP (120 t vs 111,11 t) deve gerar erro e BLOQUEAR salvamento (isExcessBlocked = true, canSave = false)', () => {
    const res = MpProgrammingEngine.evaluateScheduleMpControl({
      plannedProductionTons: 100,
      yieldPct: 90,
      rawMaterialRows: [
        {
          id: 'row-1',
          materialCode: 'TAR-130',
          mpType: 'TARUGO 130x130',
          yieldPct: 90,
          quantityTons: 120,
        },
      ],
    })

    expect(res.totalRequiredTons).toBe(111.11)
    expect(res.totalProgrammedMpTons).toBe(120)
    expect(res.differenceTons).toBe(8.89)
    expect(res.status).toBe('EXCESSO')
    expect(res.color).toBe('RED')
    expect(res.isExcessBlocked).toBe(true)
    expect(res.canSave).toBe(false)
    expect(res.alertMessage).toContain(
      'Quantidade de matéria-prima programada acima da necessidade calculada',
    )
  })

  // T04: Falta parcial (Σ < necessidade e Σ > 0): alerta e SALVA com déficit (90 t vs 111,11 t -> déficit 21,11 t)
  it('T04: falta parcial de MP (90 t vs 111,11 t) deve gerar status MP_PARCIALMENTE_ATENDIDA e PERMITIR salvar com déficit 21,11 t', () => {
    const res = MpProgrammingEngine.evaluateScheduleMpControl({
      plannedProductionTons: 100,
      yieldPct: 90,
      rawMaterialRows: [
        {
          id: 'row-1',
          materialCode: 'TAR-130',
          mpType: 'TARUGO 130x130',
          yieldPct: 90,
          quantityTons: 90,
        },
      ],
    })

    expect(res.totalRequiredTons).toBe(111.11)
    expect(res.totalProgrammedMpTons).toBe(90)
    expect(res.differenceTons).toBe(-21.11)
    expect(res.status).toBe('MP_PARCIALMENTE_ATENDIDA')
    expect(res.color).toBe('YELLOW')
    expect(res.isExcessBlocked).toBe(false)
    expect(res.canSave).toBe(true)
    expect(res.alertMessage).toContain('Necessidade de matéria-prima não totalmente atendida')
  })

  // T05: MP zerada: alerta crítico MP NÃO PROGRAMADA e SALVA
  it('T05: MP zerada (0 t) deve classificar como MP_NAO_PROGRAMADA e PERMITIR salvar com alerta crítico', () => {
    const res = MpProgrammingEngine.evaluateScheduleMpControl({
      plannedProductionTons: 100,
      yieldPct: 90,
      rawMaterialRows: [
        {
          id: 'row-1',
          materialCode: 'TAR-130',
          mpType: 'TARUGO 130x130',
          yieldPct: 90,
          quantityTons: 0,
        },
      ],
    })

    expect(res.status).toBe('MP_NAO_PROGRAMADA')
    expect(res.color).toBe('RED')
    expect(res.isExcessBlocked).toBe(false)
    expect(res.canSave).toBe(true)
    expect(res.alertMessage).toContain('Produto programado sem matéria-prima suficiente programada')
  })

  // T06: Saldo negativo por linha individual (estoque 100 t sem entradas vs 111,11 t programados) -> RISCO DE RUPTURA
  it('T06: estoque de 100 t sem entradas frente a 111,11 t programados resulta em saldo negativo (-11,11 t) e RISCO DE RUPTURA', () => {
    const rowAvailability = MpProgrammingEngine.calculateIndividualMpAvailability({
      row: {
        id: 'r1',
        materialCode: 'TAR-130',
        mpType: 'TARUGO 130x130',
        yieldPct: 90,
        quantityTons: 111.11,
      },
      productionDate: new Date('2026-08-25T10:00:00'),
      realTotalStockTons: 100,
      supplierReceipts: [],
      upstreamProductions: [],
      pcpCommittedInOtherSchedulesTons: 0,
    })

    expect(rowAvailability.finalBalanceTons).toBe(-11.11)
    expect(rowAvailability.status).toBe('SALDO_NEGATIVO_RISCO_RUPTURA')
    expect(rowAvailability.statusTrafficLight).toBe('RED')
    expect(rowAvailability.deficitTons).toBe(11.11)
  })

  // T07: Saldo positivo com recebimento antes da produção (estoque 100 t + recebimento 50 t antes vs 111,11 t programados = 38,89 t) -> OK
  it('T07: estoque 100 t + recebimento 50 t antes da produção cobre 111,11 t (saldo 38,89 t)', () => {
    const rowAvailability = MpProgrammingEngine.calculateIndividualMpAvailability({
      row: {
        id: 'r1',
        materialCode: 'TAR-130',
        mpType: 'TARUGO 130x130',
        yieldPct: 90,
        quantityTons: 111.11,
      },
      productionDate: new Date('2026-08-25T10:00:00'),
      realTotalStockTons: 100,
      supplierReceipts: [
        {
          quantityTons: 50,
          deliveryDate: new Date('2026-08-24T18:00:00'), // Anterior à produção
        },
      ],
      upstreamProductions: [],
      pcpCommittedInOtherSchedulesTons: 0,
    })

    expect(rowAvailability.finalBalanceTons).toBe(38.89)
    expect(rowAvailability.supplierReceiptsTons).toBe(50)
    expect(rowAvailability.status).toBe('AGUARDANDO_ENTRADA')
    expect(rowAvailability.statusTrafficLight).toBe('YELLOW')
  })

  // T08: REGRA CRÍTICA DE DATAS: Entrada com data POSTERIOR à produção NÃO conta
  it('T08: recebimento de fornecedor com data posterior à produção NÃO DEVE contar no saldo', () => {
    const rowAvailability = MpProgrammingEngine.calculateIndividualMpAvailability({
      row: {
        id: 'r1',
        materialCode: 'TAR-130',
        mpType: 'TARUGO 130x130',
        yieldPct: 90,
        quantityTons: 111.11,
      },
      productionDate: new Date('2026-08-25T10:00:00'),
      realTotalStockTons: 100,
      supplierReceipts: [
        {
          quantityTons: 50,
          deliveryDate: new Date('2026-08-26T08:00:00'), // Posterior à produção! NÃO conta!
        },
      ],
      upstreamProductions: [],
      pcpCommittedInOtherSchedulesTons: 0,
    })

    // 100 + 0 - 0 - 111.11 = -11.11 (os 50 t do dia 26 foram ignorados)
    expect(rowAvailability.supplierReceiptsTons).toBe(0)
    expect(rowAvailability.finalBalanceTons).toBe(-11.11)
    expect(rowAvailability.status).toBe('SALDO_NEGATIVO_RISCO_RUPTURA')
  })

  // T09: Produção interna prevista PCP antes da data conta no saldo
  it('T09: produção interna prevista PCP antes da data CONTA no saldo disponível', () => {
    const rowAvailability = MpProgrammingEngine.calculateIndividualMpAvailability({
      row: {
        id: 'r1',
        materialCode: 'TAR-130',
        mpType: 'TARUGO 130x130',
        yieldPct: 90,
        quantityTons: 111.11,
      },
      productionDate: new Date('2026-08-25T10:00:00'),
      realTotalStockTons: 50,
      supplierReceipts: [],
      upstreamProductions: [
        {
          quantityTons: 70,
          plannedEndDate: new Date('2026-08-25T06:00:00'), // Antes da produção
        },
      ],
      pcpCommittedInOtherSchedulesTons: 0,
    })

    // 50 + 70 - 111.11 = 8.89 t
    expect(rowAvailability.pcpUpstreamPlannedTons).toBe(70)
    expect(rowAvailability.finalBalanceTons).toBe(8.89)
    expect(rowAvailability.status).toBe('AGUARDANDO_ENTRADA')
  })

  // T10: Alterar produção (100 -> 120 t) recalcula necessidade imediatamente (100/90% = 111,11 -> 120/90% = 133,33 t)
  it('T10: alteração na produção programada de 100 t para 120 t recalcula necessidade de 111,11 t para 133,33 t', () => {
    const initial = MpProgrammingEngine.calculateCanonicalMpRequired(100, 90)
    const updated = MpProgrammingEngine.calculateCanonicalMpRequired(120, 90)

    expect(initial).toBe(111.11)
    expect(updated).toBe(133.33)
  })

  // T11: Alterar rendimento (90 -> 95%) recalcula necessidade imediatamente (100/90% = 111,11 -> 100/95% = 105,26 t)
  it('T11: alteração no rendimento de 90% para 95% recalcula necessidade de 111,11 t para 105,26 t', () => {
    const initial = MpProgrammingEngine.calculateCanonicalMpRequired(100, 90)
    const updated = MpProgrammingEngine.calculateCanonicalMpRequired(100, 95)

    expect(initial).toBe(111.11)
    expect(updated).toBe(105.26)
  })

  // T12: Ausência de integração SAP/WMS exibe mensagem mandatória "N/D — aguardando integração SAP/WMS" sem inventar valores
  it('T12: sem estoque SAP/WMS integrado, exibe mensagem mandatória "N/D — aguardando integração SAP/WMS" (PROIBIDO inventar valores)', () => {
    const rowAvailability = MpProgrammingEngine.calculateIndividualMpAvailability({
      row: {
        id: 'r1',
        materialCode: 'TAR-130',
        mpType: 'TARUGO 130x130',
        yieldPct: 90,
        quantityTons: 111.11,
      },
      productionDate: new Date('2026-08-25T10:00:00'),
      realTotalStockTons: null, // Sem integração SAP
      supplierReceipts: [],
      upstreamProductions: [],
      pcpCommittedInOtherSchedulesTons: 0,
    })

    expect(rowAvailability.totalStockTons).toBeNull()
    expect(rowAvailability.totalStockDisplay).toBe(MpProgrammingEngine.WAITING_SAP_WMS_MSG)
    expect(rowAvailability.totalStockDisplay).toBe('N/D — aguardando integração SAP/WMS')
  })
})
