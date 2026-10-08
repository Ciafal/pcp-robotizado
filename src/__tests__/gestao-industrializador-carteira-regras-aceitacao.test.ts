import { describe, it, expect } from 'vitest'
import {
  gestaoIndustrializadorService,
  CarteiraIndustrializadorItem,
} from '@/services/gestao-industrializador-service'
import { calcularDiaUtil } from '@/services/checklist-fechamento-service'
import pbDefault, { pb } from '@/lib/pocketbase/client'

describe('Suíte de Aceitação — Regras Operacionais Esteira de Datas e Resumo do Mês (v0.0.460)', () => {
  it('garante a presença de ambos os exports pb (named e default) em client.ts', () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
  })

  // 1. Rota de Produção: L1 termina em ENDL1 e L2 termina em ACABL2
  it('Regra 1: produtos da rota L1 terminam em ENDL1 e da rota L2 terminam em ACABL2', () => {
    // Produto L1
    const resL1 = gestaoIndustrializadorService.resolveRouteForMaterial(
      'BAR-RED-3/8-ARC',
      [],
      [],
      [{ id: 'l1', code: 'L1', sap_work_center: 'ENDL1' }],
    )
    expect(resL1.finalCenterCode).toBe('ENDL1')

    // Produto L2 (barra chata / perfil L2)
    const resL2 = gestaoIndustrializadorService.resolveRouteForMaterial(
      'BAR-CHATA-1X1/4',
      [],
      [],
      [{ id: 'l2', code: 'L2', sap_work_center: 'ACABL2' }],
    )
    expect(resL2.finalCenterCode).toBe('ACABL2')

    // Fallback defensivo por convenção de código de material
    const fallbackL1 = gestaoIndustrializadorService.resolveRouteForMaterial(
      'CANTONEIRA-2X1/8',
      [],
      [],
      [],
    )
    expect(fallbackL1.finalCenterCode).toBe('ENDL1')

    const fallbackL2 = gestaoIndustrializadorService.resolveRouteForMaterial(
      'BAR-CHATA-2X1/4-L2',
      [],
      [],
      [],
    )
    expect(fallbackL2.finalCenterCode).toBe('ACABL2')
  })

  // 2. Prevalência de WMS Real sobre Previsão Teórica (Fim de Produção + 1)
  it('Regra 2: WMS real prevalece sobre o previsto (Fim Produção + 1 dia corrido)', async () => {
    const carteira = await gestaoIndustrializadorService.getCarteiraIndustrializador()
    expect(carteira.length).toBeGreaterThan(0)

    // Item 1 possui WMS real registrado
    const item1 = carteira.find((c) => c.id === 'cart-1')
    expect(item1).toBeDefined()
    expect(item1?.wms_inventory_is_real).toBe(true)
    expect(item1?.wms_inventory_date_status).toBe('REALIZADA')
    expect(item1?.wms_inventory_date).toBe('2026-03-04')

    // Item 2 possui WMS previsto: Fim Produção (13/03/2026) + 1 dia corrido = sábado 14/03/2026
    const item2 = carteira.find((c) => c.id === 'cart-2')
    expect(item2).toBeDefined()
    expect(item2?.wms_inventory_is_real).toBe(false)
    expect(item2?.wms_inventory_date_status).toBe('PREVISTA')
    expect(item2?.production_end_date).toBe('2026-03-13')
    expect(item2?.wms_inventory_date).toBe('2026-03-14') // 13 + 1 dia corrido
  })

  // 3. WMS na Sexta-feira: Faturamento pula sábado e domingo
  it('Regra 3: WMS em uma sexta-feira faz o Faturamento pular o fim de semana para segunda-feira', () => {
    // Sexta-feira 10/04/2026
    const wmsSexta = '2026-04-10'
    const fat = calcularDiaUtil(wmsSexta, 1, [])
    // 1 dia útil após sexta 10/04 é segunda 13/04
    expect(fat.dataIso).toBe('2026-04-13')
    expect(fat.dataFormatada).toBe('13/04/2026')
  })

  // 4. Feriado Cadastrado: Pula feriado no cálculo de dias úteis
  it('Regra 4: Feriado cadastrado no meio da semana é devidamente pulado', () => {
    // 21 de abril de 2026 = Tiradentes (terça-feira)
    const feriados = ['2026-04-21']
    const wmsSegunda = '2026-04-20'
    const fat = calcularDiaUtil(wmsSegunda, 1, feriados)
    // 20/04 (seg) + 1 dia útil -> terça 21 é feriado -> quarta 22/04
    expect(fat.dataIso).toBe('2026-04-22')
    expect(fat.dataFormatada).toBe('22/04/2026')
  })

  // 5. Faturamento e Industrializador Final (+2 dias úteis)
  it('Regra 5: Industrializador Final é exatamente Faturamento + 2 dias úteis (pulando fins de semana)', () => {
    // Faturamento na quinta-feira 05/03/2026
    const faturamentoQuinta = '2026-03-05'
    // +2 dias úteis: dia 1 = sexta 06/03; sábado e domingo pulados; dia 2 = segunda 09/03
    const indFinal = calcularDiaUtil(faturamentoQuinta, 2, [])
    expect(indFinal.dataIso).toBe('2026-03-09')
    expect(indFinal.dataFormatada).toBe('09/03/2026')

    // Faturamento na sexta-feira 17/04/2026
    const faturamentoSexta = '2026-04-17'
    // +2 dias úteis: dia 1 = seg 20/04, dia 2 = ter 21/04 (sem feriado) ou qua 22/04 (com Tiradentes)
    const indComFeriado = calcularDiaUtil(faturamentoSexta, 2, ['2026-04-21'])
    expect(indComFeriado.dataIso).toBe('2026-04-22')
  })

  // 6. Ausência de Programação: datas não são inventadas (retornam null / —)
  it('Regra 6: Pedido sem programação não tem datas inventadas (exibe null / —)', async () => {
    const carteira = await gestaoIndustrializadorService.getCarteiraIndustrializador()
    const itemNaoProg = carteira.find((c) => c.id === 'cart-4' || !c.is_programmed)

    expect(itemNaoProg).toBeDefined()
    expect(itemNaoProg?.lamination_date).toBeNull()
    expect(itemNaoProg?.production_end_date).toBeNull()
    expect(itemNaoProg?.wms_inventory_date).toBeNull()
    expect(itemNaoProg?.billing_date).toBeNull()
    expect(itemNaoProg?.final_industrializer_date).toBeNull()
  })

  // 7. Resumo do Mês: recálculo dos 4 indicadores por competência
  it('Regra 7: Mudança de mês recalcula os 4 indicadores do Resumo do Mês e totais da carteira', async () => {
    // Março/2026
    const summaryMarco = await gestaoIndustrializadorService.getCarteiraMonthlySummary('2026-03')
    expect(summaryMarco.monthKey).toBe('2026-03')
    expect(summaryMarco.programmedVolumeTons).toBeGreaterThan(0)
    expect(summaryMarco.realizedVolumeTons).toBeGreaterThanOrEqual(0)
    expect(summaryMarco.remainingVolumeTons).toBe(
      Math.max(0, summaryMarco.programmedVolumeTons - summaryMarco.realizedVolumeTons),
    )
    if (summaryMarco.programmedVolumeTons > 0) {
      expect(summaryMarco.achievementPct).toBeCloseTo(
        (summaryMarco.realizedVolumeTons / summaryMarco.programmedVolumeTons) * 100,
        1,
      )
    }

    // Abril/2026
    const summaryAbril = await gestaoIndustrializadorService.getCarteiraMonthlySummary('2026-04')
    expect(summaryAbril.monthKey).toBe('2026-04')
    expect(summaryAbril.programmedVolumeTons).toBeDefined()
    expect(summaryAbril.realizedVolumeTons).toBe(0)
    expect(summaryAbril.remainingVolumeTons).toBe(summaryAbril.programmedVolumeTons)
    expect(summaryAbril.achievementPct).toBe(0)

    // Mês sem ordens: valores zerados
    const summaryVazio = await gestaoIndustrializadorService.getCarteiraMonthlySummary('2026-11')
    expect(summaryVazio.programmedVolumeTons).toBe(0)
    expect(summaryVazio.realizedVolumeTons).toBe(0)
    expect(summaryVazio.remainingVolumeTons).toBe(0)
    expect(summaryVazio.achievementPct).toBeNull()
  })

  // 8. Timeline completa do material com 7 passos estruturados
  it('Regra 8: timeline_steps possui os 7 passos operacionais encadeados', () => {
    const timeline = gestaoIndustrializadorService.buildFullOperatonalTimeline({
      sapOrder: '45009999',
      materialCode: 'BAR-RED-3/8-ARC',
      quantityTons: 100,
      laminationDate: '2026-03-02',
      productionEndDate: '2026-03-03',
      productionEndCenter: 'ENDL1',
      wmsDate: '2026-03-04',
      wmsIsReal: true,
      billingDate: '2026-03-05',
      finalIndDate: '2026-03-09',
      industrializerName: 'ArcelorMittal Tubarão',
    })

    expect(timeline.length).toBe(7)
    expect(timeline[0].step_id).toBe('1-PEDIDO_SAP')
    expect(timeline[1].step_id).toBe('2-PROGRAMACAO_PCP')
    expect(timeline[2].step_id).toBe('3-DATA_LAMINACAO')
    expect(timeline[3].step_id).toBe('4-FIM_PRODUCAO')
    expect(timeline[3].label).toContain('ENDL1')
    expect(timeline[4].step_id).toBe('5-INVENTARIO_WMS')
    expect(timeline[5].step_id).toBe('6-FATURAMENTO')
    expect(timeline[6].step_id).toBe('7-INDUSTRIALIZADOR_FINAL')
  })
})
