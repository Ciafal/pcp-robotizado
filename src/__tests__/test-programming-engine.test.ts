import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculatePeriodDuration,
  calculateTestDeviations,
  formatDurationPCP,
  formatDeltaMinutes,
  formatDeltaPercent,
  MSG_REGRA_1_DATA_HORA,
} from '@/lib/test-programming-calculations'
import {
  testProgrammingService,
  formatTestId,
  parseTestIdSequence,
} from '@/services/test-programming-service'
import { mesIntegrationService } from '@/services/mes-integration-service'
import { generateTestAiAnalysis, MSG_DADOS_INSUFICIENTES_CAUSA } from '@/services/test-ai-service'
import { TestProgrammingRecord } from '@/types/test-programming'

describe('Suíte de Aceitação — Programação de Testes: Previsto x Realizado & MES 4.0', () => {
  // CRITÉRIO C1: 25/09/2026 08:00 → 25/09/2026 10:30 ⇒ duração prevista "2 h 30 min"
  it('C1: Deve calcular automaticamente a duração prevista de 25/09/2026 08:00 até 10:30 como "2 h 30 min"', () => {
    const res = calculatePeriodDuration('2026-09-25', '08:00', '2026-09-25', '10:30')
    expect(res.isValid).toBe(true)
    expect(res.totalMinutes).toBe(150)
    expect(res.formatted).toBe('2 h 30 min')
  })

  // CRITÉRIO C2: 25/09/2026 22:00 → 26/09/2026 03:00 ⇒ "5 h" (meia-noite OK)
  it('C2: Deve suportar teste atravessando a meia-noite (25/09/2026 22:00 até 26/09/2026 03:00 = "5 h")', () => {
    const res = calculatePeriodDuration('2026-09-25', '22:00', '2026-09-26', '03:00')
    expect(res.isValid).toBe(true)
    expect(res.totalMinutes).toBe(300)
    expect(res.formatted).toBe('5 h')
  })

  // CRITÉRIO C3: início 10:00 / fim 09:00 (mesmo dia) ⇒ bloqueado com a mensagem da Regra 1
  it('C3: Início posterior ao fim no mesmo dia bloqueia com mensagem exata da Regra 1', () => {
    const res = calculatePeriodDuration('2026-09-25', '10:00', '2026-09-25', '09:00')
    expect(res.isValid).toBe(false)
    expect(res.errorMessage).toBe(MSG_REGRA_1_DATA_HORA)
    expect(res.totalMinutes).toBe(0)
  })

  // CRITÉRIO C4: com dados do MES disponíveis, o bloco "Realizado" preenche automaticamente sem redigitação
  it('C4: mesIntegrationService preenche bloco Realizado automaticamente quando há telemetria do MES 4.0', async () => {
    const mockTest: TestProgrammingRecord = {
      id: 'rec_test_123',
      test_id: 'TESTE-000123',
      title: 'Teste de Laminação Perfil W',
      objective: 'Ajuste de passe',
      justification: 'Redução de tolerância',
      company: 'CIAFAL',
      production_line: 'L1',
      work_center: 'LAM_L1',
      requesting_sector: 'Engenharia',
      requester_name: 'Carlos Mendes',
      technical_lead: 'Eng. Roberto',
      test_type: 'Homologação',
      test_category: 'RECEITA_LAMINACAO',
      schedule_impact_type: 'PARADA_TOTAL',
      status: 'Programado',
      request_date: '2026-09-20',
      expected_date: '2026-09-25',
      expected_start_date: '2026-09-25',
      expected_start_time: '08:00',
      expected_end_date: '2026-09-25',
      expected_end_time: '10:00',
      expected_duration_minutes: 120,
      expected_duration_formatted: '2 h',
    }

    const forcedMesData = {
      actual_start_date: '2026-09-25',
      actual_start_time: '08:15',
      actual_end_date: '2026-09-25',
      actual_end_time: '10:45',
      actual_duration_minutes: 150,
      actual_duration_formatted: '2 h 30 min',
      production_line: 'L1',
      work_center: 'LAM_L1',
      production_order: 'OP-4500098',
      material_code: 'MAT-8842',
      material_description: 'Barra Chata Aço 1020',
      quantity_produced: 42.5,
      quantity_unit: 't',
      occurrences: ['Ajuste de guia mecânica'],
      stops: [
        {
          start_time: '09:10',
          end_time: '09:25',
          duration_minutes: 15,
          reason_code: 'PAR-MEC-01',
          reason_description: 'Calibração de mancais',
        },
      ],
      main_stop_reason: 'Calibração de mancais',
    }

    const syncRes = await mesIntegrationService.syncTestExecution(mockTest, {
      forcedData: forcedMesData,
    })

    expect(syncRes.success).toBe(true)
    expect(syncRes.status).toBe('Sincronizado')
    expect(syncRes.executionData).toBeDefined()
    expect(syncRes.executionData?.production_order).toBe('OP-4500098')
    expect(syncRes.deviations).toBeDefined()
    expect(syncRes.deviations?.start_deviation_formatted).toBe('+15 min')
  })

  // CRITÉRIO C5: previsto 08:00–10:00 / realizado 08:15–10:45 ⇒
  // atraso início (+15 min), desvio término (+45 min), duração prevista (2 h),
  // duração realizada (2 h 30 min), desvio absoluto (+30 min), desvio percentual (+25 %)
  it('C5: Cálculos exatos de desvios (início +15m, término +45m, prevista 2h, realizada 2h30m, desvio +30m, % +25%)', () => {
    const planned = {
      startDate: '2026-09-25',
      startTime: '08:00',
      endDate: '2026-09-25',
      endTime: '10:00',
    }
    const actual = {
      startDate: '2026-09-25',
      startTime: '08:15',
      endDate: '2026-09-25',
      endTime: '10:45',
    }

    const dev = calculateTestDeviations(planned, actual)
    expect(dev).not.toBeNull()
    expect(dev!.start_deviation_minutes).toBe(15)
    expect(dev!.start_deviation_formatted).toBe('+15 min')
    expect(dev!.end_deviation_minutes).toBe(45)
    expect(dev!.end_deviation_formatted).toBe('+45 min')
    expect(dev!.planned_duration_minutes).toBe(120)
    expect(dev!.planned_duration_formatted).toBe('2 h')
    expect(dev!.actual_duration_minutes).toBe(150)
    expect(dev!.actual_duration_formatted).toBe('2 h 30 min')
    expect(dev!.duration_deviation_minutes).toBe(30)
    expect(dev!.duration_deviation_formatted).toBe('+30 min')
    expect(dev!.percentage_deviation).toBe(25)
    expect(dev!.percentage_deviation_formatted).toBe('+25 %')
  })

  // CRITÉRIO C6: MES indisponível ⇒ NUNCA zero como dado real; exibir "Dados realizados ainda não disponíveis no MES 4.0."
  it('C6: Quando MES não tem dados disponíveis, retorna mensagem informativa e NUNCA zeros falsos mascarados', async () => {
    const testAguardando: TestProgrammingRecord = {
      id: 'rec_no_mes',
      test_id: 'TESTE-000099',
      title: 'Teste Sem Dados MES',
      objective: 'Verificar indisponibilidade',
      justification: 'Regra de resiliência',
      company: 'CIAFAL',
      production_line: 'L2',
      requesting_sector: 'PCP',
      requester_name: 'Lucas',
      technical_lead: 'Eng. Lucas',
      test_type: 'Operacional',
      test_category: 'EQUIPAMENTO',
      schedule_impact_type: 'SEM_IMPACTO',
      status: 'Executado',
      request_date: '2026-09-25',
      expected_date: '2026-09-25',
      expected_start_date: '2026-09-25',
      expected_start_time: '08:00',
      expected_end_date: '2026-09-25',
      expected_end_time: '10:00',
    }

    const res = await mesIntegrationService.syncTestExecution(testAguardando)
    expect(res.success).toBe(false)
    expect(res.status).toBe('Aguardando dados MES')
    expect(res.message).toBe('Dados realizados ainda não disponíveis no MES 4.0.')
    expect(res.executionData).toBeNull()
    expect(res.deviations).toBeNull()
  })

  // CRITÉRIO C7 & C8: Identificador único imutável TESTE-000123 e Rastreabilidade de Auditoria
  it('C7 & C8: Validação de ID único no formato TESTE-000123 e integridade do formato sequencial', () => {
    expect(formatTestId(1)).toBe('TESTE-000001')
    expect(formatTestId(123)).toBe('TESTE-000123')
    expect(parseTestIdSequence('TESTE-000123')).toBe(123)
    expect(parseTestIdSequence('TEST-000456')).toBe(456)
  })

  // REQUISITO 13: Análise IA com as 7 seções exatas e declaração explícita quando sem causas suficientes
  it('Requisito 13: IA gera as 7 seções exatas e emite "Não existem dados suficientes para determinar a causa do desvio." sem inventar', () => {
    const testSemCausas: TestProgrammingRecord = {
      id: 'rec_ai_1',
      test_id: 'TESTE-000123',
      title: 'Teste de Validação',
      objective: 'Verificar IA',
      justification: 'SGQ',
      company: 'CIAFAL',
      production_line: 'L1',
      requesting_sector: 'Qualidade',
      requester_name: 'Eng. Mariana',
      technical_lead: 'Mariana',
      test_type: 'Validação',
      test_category: 'MATERIA_PRIMA',
      schedule_impact_type: 'SEM_IMPACTO',
      status: 'Executado',
      request_date: '2026-09-25',
      expected_date: '2026-09-25',
      expected_start_date: '2026-09-25',
      expected_start_time: '08:00',
      expected_end_date: '2026-09-25',
      expected_end_time: '10:00',
    }

    const ai = generateTestAiAnalysis(testSemCausas, [testSemCausas])

    // As 7 seções exatas
    expect(ai.principais_desvios).toBeDefined()
    expect(ai.evidencias).toBeDefined()
    expect(ai.possiveis_causas).toBeDefined()
    expect(ai.impacto_produtivo).toBeDefined()
    expect(ai.recorrencia).toBeDefined()
    expect(ai.aprendizados).toBeDefined()
    expect(ai.acoes_sugeridas).toBeDefined()

    // Regra estrita: se não houver causa no MES, declara insuficiência explicitamente
    expect(ai.possiveis_causas).toContain(MSG_DADOS_INSUFICIENTES_CAUSA)
    expect(ai.has_sufficient_data).toBe(false)
  })
})
