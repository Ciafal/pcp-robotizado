import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  mpMultipleCuttingPlansService,
  MP_CUTTING_PLAN_OFFICIAL_STATUSES,
  MPCuttingPlanStatus,
} from '@/services/mp-dimensional-notes-service'
import {
  normalizeCuttingPlanStatus,
  getStatusConfig,
} from '@/components/mp-optimization/MPCuttingPlanStatusBadge'
import pb from '@/lib/pocketbase/client'

describe('Controle de Status de Planos de Corte - Regras Oficiais e Transições', () => {
  it('contém exatamente os 6 status oficiais definidos pelo usuário', () => {
    expect(MP_CUTTING_PLAN_OFFICIAL_STATUSES).toEqual([
      'Rascunho',
      'Em Revisão',
      'Aprovado',
      'Liberado',
      'Executado',
      'Cancelado',
    ])
  })

  it('normaliza status legados e variantes para os status oficiais corretos', () => {
    expect(normalizeCuttingPlanStatus('RASCUNHO')).toBe('Rascunho')
    expect(normalizeCuttingPlanStatus('rascunho')).toBe('Rascunho')
    expect(normalizeCuttingPlanStatus('EM_REVISAO')).toBe('Em Revisão')
    expect(normalizeCuttingPlanStatus('Em Revisao')).toBe('Em Revisão')
    expect(normalizeCuttingPlanStatus('APROVADO')).toBe('Aprovado')
    expect(normalizeCuttingPlanStatus('LIBERADO')).toBe('Liberado')
    expect(normalizeCuttingPlanStatus('EXECUTADO')).toBe('Executado')
    expect(normalizeCuttingPlanStatus('CANCELADO')).toBe('Cancelado')
    expect(normalizeCuttingPlanStatus('CONFIRMADO_PCP')).toBe('Rascunho')
    expect(normalizeCuttingPlanStatus('')).toBe('Rascunho')
  })

  it('retorna configuração visual completa com cores e descrições para cada status', () => {
    MP_CUTTING_PLAN_OFFICIAL_STATUSES.forEach((st) => {
      const cfg = getStatusConfig(st)
      expect(cfg.label).toBe(st)
      expect(cfg.description).toBeTruthy()
      expect(cfg.badgeClass).toBeTruthy()
      expect(cfg.icon).toBeDefined()
    })
  })

  it('valida no cliente que Cancelado exige justificativa mínima de 5 caracteres', async () => {
    await expect(
      mpMultipleCuttingPlansService.transitionStatus({
        planId: 'plan_123',
        targetStatus: 'Cancelado',
        justification: 'abc', // < 5 chars
      }),
    ).rejects.toThrow(/Justificativa obrigatória não informada/i)
  })

  it('valida no cliente que Executado exige confirmação operacional', async () => {
    await expect(
      mpMultipleCuttingPlansService.transitionStatus({
        planId: 'plan_123',
        targetStatus: 'Executado',
        operationalConfirmation: false,
      }),
    ).rejects.toThrow(/Confirmação operacional obrigatória/i)
  })

  it('chama o endpoint seguro do backend para transição quando parâmetros são válidos', async () => {
    const sendSpy = vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      message: 'Status atualizado',
      plan: {
        id: 'plan_123',
        plan_code: 'PCM-2025-00001',
        status: 'Aprovado',
        version: 1,
      },
    })

    const res = await mpMultipleCuttingPlansService.transitionStatus({
      planId: 'plan_123',
      targetStatus: 'Aprovado',
    })

    expect(sendSpy).toHaveBeenCalledWith(
      '/backend/v1/pcp/cutting-plans/transition-status',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          plan_id: 'plan_123',
          target_status: 'Aprovado',
        }),
      }),
    )
    expect(res.success).toBe(true)
    expect(res.plan?.status).toBe('Aprovado')

    sendSpy.mockRestore()
  })

  it('salvar um plano novo inicia sempre com status Rascunho', async () => {
    const createSpy = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'create')
      .mockResolvedValueOnce({
        id: 'plan_new',
        plan_code: 'PCM-2025-00002',
        status: 'Rascunho',
        version: 1,
      } as any)

    const codeSpy = vi
      .spyOn(mpMultipleCuttingPlansService, 'generateSequentialCode')
      .mockResolvedValueOnce('PCM-2025-00002')

    const result = await mpMultipleCuttingPlansService.savePlan({
      plan_code: '',
      material_code: '10000452',
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Rascunho',
      }),
    )
    expect(result.record.status).toBe('Rascunho')

    createSpy.mockRestore()
    codeSpy.mockRestore()
  })

  it('atualizar um plano existente NUNCA altera o status automaticamente para Executado nem outro status', async () => {
    const getOneSpy = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'getOne')
      .mockResolvedValueOnce({
        id: 'plan_existente',
        plan_code: 'PCM-2025-00001',
        status: 'Aprovado',
        version: 1,
      } as any)

    const updateSpy = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'update')
      .mockResolvedValueOnce({} as any)

    const createSpy = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'create')
      .mockResolvedValueOnce({
        id: 'plan_v2',
        plan_code: 'PCM-2025-00001',
        status: 'Aprovado', // Status mantido imutável
        version: 2,
      } as any)

    const result = await mpMultipleCuttingPlansService.atualizarPlano('plan_existente', {
      material_code: '10000452',
      cutting_yield_pct: 95.5,
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Aprovado', // Persiste status original, sem auto-transição
        version: 2,
      }),
    )
    expect(result.record.status).toBe('Aprovado')

    getOneSpy.mockRestore()
    updateSpy.mockRestore()
    createSpy.mockRestore()
  })
})
