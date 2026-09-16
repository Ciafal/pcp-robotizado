import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateEndTime,
  calculateReductionPercent,
  formatTestId,
  parseTestIdSequence,
  isValidTransition,
  TestProgrammingService,
} from '@/services/test-programming-service'

// Mock do PocketBase
vi.mock('@/lib/pocketbase/client', () => {
  const store: Record<string, any[]> = {
    test_programming: [],
    test_programming_log: [],
  }

  return {
    default: {
      collection: (name: string) => ({
        getList: vi.fn(async () => {
          const list = store[name] || []
          return { items: list }
        }),
        getFullList: vi.fn(async ({ filter }: { filter?: string } = {}) => {
          let list = store[name] || []
          if (filter && filter.includes('test_programming_id')) {
            const idMatch = filter.match(/test_programming_id = '([^']+)'/)
            if (idMatch) {
              list = list.filter((r) => r.test_programming_id === idMatch[1])
            }
          }
          return list
        }),
        getOne: vi.fn(async (id: string) => {
          const item = (store[name] || []).find((r) => r.id === id)
          if (!item) throw new Error(`Not found: ${id}`)
          return item
        }),
        create: vi.fn(async (data: any) => {
          const item = { ...data, id: `rec_${Math.random().toString(36).slice(2, 8)}` }
          store[name] = store[name] || []
          store[name].push(item)
          return item
        }),
        update: vi.fn(async (id: string, updates: any) => {
          const list = store[name] || []
          const idx = list.findIndex((r) => r.id === id)
          if (idx === -1) throw new Error(`Not found: ${id}`)
          list[idx] = { ...list[idx], ...updates }
          return list[idx]
        }),
      }),
      __store: store,
    },
  }
})

describe('TestProgramming Engine & Service Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Geração de ID Sequencial', () => {
    it('deve formatar ID corretamente para número 1 como TEST-000001', () => {
      expect(formatTestId(1)).toBe('TEST-000001')
      expect(formatTestId(42)).toBe('TEST-000042')
      expect(formatTestId(999999)).toBe('TEST-999999')
    })

    it('deve fazer parse correto do número de sequência', () => {
      expect(parseTestIdSequence('TEST-000001')).toBe(1)
      expect(parseTestIdSequence('TEST-000123')).toBe(123)
      expect(parseTestIdSequence('INVALID-ID')).toBe(0)
    })
  })

  describe('2. Cálculo de Hora Fim (22:00 + 25min = 22:25)', () => {
    it('deve calcular corretamente 22:00 + 25min = 22:25', () => {
      const end = calculateEndTime('22:00', 25)
      expect(end).toBe('22:25')
    })

    it('deve tratar virada de dia/meia-noite (23:45 + 30min = 00:15)', () => {
      const end = calculateEndTime('23:45', 30)
      expect(end).toBe('00:15')
    })

    it('deve tratar durações longas de parada (08:00 + 120min = 10:00)', () => {
      const end = calculateEndTime('08:00', 120)
      expect(end).toBe('10:00')
    })
  })

  describe('3. Percentual de Redução de Ritmo (20 t/h -> 12 t/h = 40%)', () => {
    it('deve calcular redução de 20 t/h para 12 t/h = 40%', () => {
      const percent = calculateReductionPercent(20, 12)
      expect(percent).toBe(40)
    })

    it('deve retornar 0 se produtividade prevista for igual ou superior à nominal', () => {
      expect(calculateReductionPercent(20, 20)).toBe(0)
      expect(calculateReductionPercent(20, 25)).toBe(0)
    })

    it('deve tratar decimais com precisão de 2 casas (15 t/h -> 10 t/h = 33.33%)', () => {
      const percent = calculateReductionPercent(15, 10)
      expect(percent).toBe(33.33)
    })
  })

  describe('4. Guarda de Workflow de Transições de Status', () => {
    it('deve aceitar transições válidas no fluxo', () => {
      expect(isValidTransition('Rascunho', 'Enviado para Aprovação Industrial')).toBe(true)
      expect(
        isValidTransition('Enviado para Aprovação Industrial', 'Em Aprovação Industrial'),
      ).toBe(true)
      expect(
        isValidTransition('Enviado para Aprovação Industrial', 'Aprovado pela Indústria'),
      ).toBe(true)
      expect(isValidTransition('Aprovado pela Indústria', 'Aguardando Aprovação PCP')).toBe(true)
      expect(isValidTransition('Aguardando Aprovação PCP', 'Programado')).toBe(true)
      expect(isValidTransition('Programado', 'Em Execução')).toBe(true)
      expect(isValidTransition('Em Execução', 'Executado')).toBe(true)
    })

    it('deve rejeitar transições inválidas/ilógicas', () => {
      expect(isValidTransition('Rascunho', 'Executado')).toBe(false)
      expect(isValidTransition('Rascunho', 'Aprovado PCP')).toBe(false)
      expect(isValidTransition('Concluído', 'Em Execução')).toBe(false)
      expect(isValidTransition('Cancelado', 'Rascunho')).toBe(false)
    })
  })

  describe('5. Criação, Transições e Log Automático', () => {
    it('deve registrar log de auditoria na criação e em cada transição', async () => {
      const service = new TestProgrammingService()

      const created = await service.create(
        {
          request_date: '2026-09-16',
          expected_date: '2026-09-20',
          company: 'CIAFAL',
          production_line: 'L1',
          requesting_sector: 'Engenharia de Processos',
          requester_name: 'Lucas Ferreira',
          technical_lead: 'Carlos Mendes',
          test_type: 'Validação de Cilindro',
          title: 'Teste de Desgaste Cilindro L1',
          objective: 'Verificar tolerância superficial',
          justification: 'Troca de fornecedor',
          test_category: 'EQUIPAMENTO',
          schedule_impact_type: 'PARADA_TOTAL',
          status: 'Rascunho',
        },
        { id: 'usr_1', name: 'Lucas Ferreira', role: 'PCP_PROGRAMMER' },
      )

      expect(created.test_id).toMatch(/^TEST-/)
      expect(created.status).toBe('Rascunho')

      // Atualiza para 'Enviado para Aprovação Industrial'
      const updated = await service.update(
        created.id,
        { status: 'Enviado para Aprovação Industrial' },
        { id: 'usr_1', name: 'Lucas Ferreira', role: 'PCP_PROGRAMMER' },
        'Envio oficial para avaliação industrial',
      )

      expect(updated.status).toBe('Enviado para Aprovação Industrial')

      // Rejeita transição ilegal: de 'Enviado para Aprovação Industrial' direto para 'Executado'
      await expect(
        service.update(
          created.id,
          { status: 'Executado' },
          { id: 'usr_1', name: 'Lucas Ferreira' },
        ),
      ).rejects.toThrow(/Transição de status inválida/)

      // Aprovação Industrial
      const industrialApproval = await service.processIndustrialApproval(created.id, {
        decision: 'APROVADO',
        userId: 'usr_industrial',
        userName: 'Carlos Mendes',
        userRole: 'LINE_MANAGER',
        decisionDate: '2026-09-17',
        decisionTime: '10:30',
        observation: 'Aprovado tecnicamente sem riscos operacionais',
      })

      expect(industrialApproval.status).toBe('Aguardando Aprovação PCP')
      expect(industrialApproval.industrial_approver).toBe('Carlos Mendes')

      // Consulta logs
      const logs = await service.getLogs(created.id)
      expect(logs.length).toBeGreaterThanOrEqual(3) // Criação, Envio e Aprovação Industrial
      expect(logs.some((l) => l.action === 'CRIAÇÃO')).toBe(true)
      expect(logs.some((l) => l.action === 'APROVAÇÃO_INDUSTRIAL_APROVADO')).toBe(true)
    })
  })
})
