import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mpMultipleCuttingPlansService,
  MPMultipleCuttingPlanRecord,
} from '@/services/mp-dimensional-notes-service'
import { pb } from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

describe('Suíte de Testes A–G: Planos de Corte Múltiplo e Blocos', () => {
  const samplePlanData: MPMultipleCuttingPlanRecord = {
    plan_code: '',
    material_code: '10000452',
    material_description: 'BARRA CHATA LAMINADA SAE 1020',
    steel_grade: 'SAE 1020',
    batch_number: 'LOTE-7890',
    heat_number: 'CORR-5432',
    supplier_code: 'FORN-01',
    supplier_name: 'AÇOS BRASIL S.A.',
    center_code: '1020',
    line_code: 'L1',
    block_weight_tons: 5.268,
    thickness_mm: 130,
    width_mm: 130,
    length_mm: 6000,
    linear_mass_kg_m: 132.5,
    projected_rolled_length_m: 39.75,
    cutting_yield_pct: 96.85,
    total_used_length_m: 38.5,
    leftover_length_m: 1.25,
    leftover_weight_tons: 0.165,
    scrap_length_m: 0.0,
    scrap_weight_tons: 0.0,
    pieces_count: 8,
    ai_score: 97,
    ai_technical_justification: 'Otimização com 96.85% de rendimento metálico',
    allocated_applications_json: [
      {
        id: 'app-1',
        application_code: 'APL-01',
        application_name: 'Longarina Dianteira',
        length_mm: 4800,
        quantity: 8,
        used_length_mm: 38400,
        estimated_weight_kg: 5088,
        priority: 1,
      },
    ],
    status: 'RASCUNHO',
    responsible_user_name: 'Engenheiro PCP Teste',
    created_by_user_name: 'Engenheiro PCP Teste',
    plan_type: 'MULTIPLO',
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // Teste A: Novo plano (gravação real, código exclusivo, confirmação, registro no histórico)
  it('A. Novo Plano: grava no banco, gera código exclusivo PCM-AAAA-XXXXX, confirmação e versionamento inicial', async () => {
    const mockSend = vi.spyOn(pb, 'send').mockResolvedValue({
      success: true,
      plan_code: 'PCM-2026-00001',
    })

    const mockCreate = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'create')
      .mockImplementation(async (payload: any) => {
        return {
          id: 'rec_plan_001',
          ...payload,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        } as any
      })

    const result = await mpMultipleCuttingPlansService.savePlan(samplePlanData, {
      actionUser: 'Carlos Engenheiro',
    })

    expect(result.isUpdate).toBe(false)
    expect(result.version).toBe(1)
    expect(result.plan_code).toBe('PCM-2026-00001')
    expect(result.record.id).toBe('rec_plan_001')
    expect(result.record.plan_code).toBe('PCM-2026-00001')
    expect(result.record.is_latest).toBe(true)
    expect(result.record.allocated_applications_json).toHaveLength(1)
    expect(result.record.cutting_yield_pct).toBe(96.85)

    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  // Teste B: Atualização (mesmo código mantido, nova versão V02, histórico preservado)
  it('B. Atualização: mantém o mesmo código original, gera V02, preserva histórico da versão anterior', async () => {
    const existingV1: MPMultipleCuttingPlanRecord = {
      ...samplePlanData,
      id: 'rec_plan_001',
      plan_code: 'PCM-2026-00001',
      version: 1,
      is_latest: true,
      created_by_user_name: 'Carlos Engenheiro',
      audit_history_json: [
        {
          event: 'CREATION',
          version: 1,
          action: 'Criação inicial do Plano de Corte',
          timestamp: '2026-03-20T10:00:00Z',
          user: 'Carlos Engenheiro',
        },
      ],
    }

    vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'getOne').mockResolvedValue(
      existingV1 as any,
    )
    const mockUpdate = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'update')
      .mockResolvedValue({} as any)
    const mockCreate = vi
      .spyOn(pb.collection('mp_multiple_cutting_plans'), 'create')
      .mockImplementation(async (payload: any) => {
        return {
          id: 'rec_plan_002',
          ...payload,
        } as any
      })

    const updatedData: MPMultipleCuttingPlanRecord = {
      ...samplePlanData,
      id: 'rec_plan_001',
      plan_code: 'PCM-2026-00001',
      cutting_yield_pct: 98.2,
      pieces_count: 9,
    }

    const result = await mpMultipleCuttingPlansService.savePlan(updatedData, {
      targetPlanId: 'rec_plan_001',
      clientExpectedVersion: 1,
      justification: 'Ajuste de aplicação para aumentar rendimento',
      actionUser: 'Mariana PCP',
    })

    expect(result.isUpdate).toBe(true)
    expect(result.version).toBe(2)
    expect(result.previousVersion).toBe(1)
    expect(result.plan_code).toBe('PCM-2026-00001') // Código idêntico!
    expect(result.record.id).toBe('rec_plan_002') // Novo ID imutável
    expect(result.record.parent_plan_id).toBe('rec_plan_001')
    expect(result.record.is_latest).toBe(true)
    expect(result.record.version_notes).toBe('Ajuste de aplicação para aumentar rendimento')

    // Registro anterior teve is_latest marcado como false
    expect(mockUpdate).toHaveBeenCalledWith('rec_plan_001', { is_latest: false })
    // Nova versão foi criada
    expect(mockCreate).toHaveBeenCalledTimes(1)
    // Histórico de auditoria tem 2 entradas
    expect(result.record.audit_history_json).toHaveLength(2)
    expect((result.record.audit_history_json as any[])[0].event).toBe('VERSION_UPDATE')
  })

  // Teste C: Persistência e recarregamento (dados completos no Histórico)
  it('C. Persistência: listagem e busca por ID preservam campos técnicos, aplicações e resultados', async () => {
    const persistedRecord: MPMultipleCuttingPlanRecord = {
      ...samplePlanData,
      id: 'rec_plan_001',
      plan_code: 'PCM-2026-00001',
      version: 1,
      is_latest: true,
      created: '2026-03-20T10:00:00Z',
    }

    vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'getFullList').mockResolvedValue([
      persistedRecord,
    ] as any)
    vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'getOne').mockResolvedValue(
      persistedRecord as any,
    )

    const list = await mpMultipleCuttingPlansService.listPlans()
    expect(list).toHaveLength(1)
    expect(list[0].plan_code).toBe('PCM-2026-00001')
    expect(list[0].block_weight_tons).toBe(5.268)

    const fetched = await mpMultipleCuttingPlansService.getPlanById('rec_plan_001')
    expect(fetched).not.toBeNull()
    expect(fetched?.allocated_applications_json).toHaveLength(1)
    expect(fetched?.cutting_yield_pct).toBe(96.85)
  })

  // Teste D: Concorrência e numeração (códigos sequenciais exclusivos, sem duplicidade)
  it('D. Concorrência: endpoint de numeração atômica gera códigos incrementais sem repetição', async () => {
    let callCounter = 0
    vi.spyOn(pb, 'send').mockImplementation(async (path: string, options: any) => {
      if (path.includes('next-code')) {
        callCounter++
        const numFormatted = String(callCounter).padStart(5, '0')
        return {
          success: true,
          plan_code: `PCM-2026-${numFormatted}`,
        } as any
      }
      return {} as any
    })

    const code1 = await mpMultipleCuttingPlansService.generateSequentialCode('PCM')
    const code2 = await mpMultipleCuttingPlansService.generateSequentialCode('PCM')
    const code3 = await mpMultipleCuttingPlansService.generateSequentialCode('PCM')

    expect(code1).toBe('PCM-2026-00001')
    expect(code2).toBe('PCM-2026-00002')
    expect(code3).toBe('PCM-2026-00003')
    expect(new Set([code1, code2, code3]).size).toBe(3)
  })

  // Teste E: Erro de gravação (rejeição com motivo compreensível, sem falso sucesso, dados preservados)
  it('E. Erro de Gravação: conflito de optimistic locking rejeita salvamento e lança erro informativo', async () => {
    const existingDbRecord: MPMultipleCuttingPlanRecord = {
      ...samplePlanData,
      id: 'rec_plan_001',
      plan_code: 'PCM-2026-00001',
      version: 3, // Banco já está na v3
      is_latest: true,
    }

    vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'getOne').mockResolvedValue(
      existingDbRecord as any,
    )

    // O cliente tentou salvar com base na v1 (desatualizada)
    await expect(
      mpMultipleCuttingPlansService.savePlan(samplePlanData, {
        targetPlanId: 'rec_plan_001',
        clientExpectedVersion: 1, // Esperava v1, mas banco tem v3
        actionUser: 'Carlos',
      }),
    ).rejects.toThrow(/Conflito de versão detectado! A versão atual no servidor é v3/)
  })

  // Teste F: Auditoria (eventos com código, versão e usuário integrados ao PCP)
  it('F. Auditoria: criação e atualização invocam pcpAuditService.recordLog com código, versão e usuário', async () => {
    const auditSpy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

    vi.spyOn(pb, 'send').mockResolvedValue({
      success: true,
      plan_code: 'PCM-2026-00005',
    })

    vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'create').mockResolvedValue({
      id: 'rec_plan_005',
      plan_code: 'PCM-2026-00005',
      version: 1,
    } as any)

    await mpMultipleCuttingPlansService.savePlan(samplePlanData, {
      actionUser: 'Auditor PCP',
    })

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'Gestão de MP',
        screen: 'Planos de Corte',
        entity: 'mp_multiple_cutting_plans',
        action: 'CRIAR_PLANO_CORTE',
        user_name: 'Auditor PCP',
        details: expect.objectContaining({
          plan_code: 'PCM-2026-00005',
          version: 1,
        }),
      }),
    )
  })

  // Teste G: Histórico e consulta de versões (recuperação da versão selecionada)
  it('G. Histórico e Versões: getVersionsByPlanCode retorna todas as versões do plano ordenadas', async () => {
    const v1: MPMultipleCuttingPlanRecord = {
      ...samplePlanData,
      id: 'rec_plan_001',
      plan_code: 'PCM-2026-00001',
      version: 1,
      is_latest: false,
    }
    const v2: MPMultipleCuttingPlanRecord = {
      ...samplePlanData,
      id: 'rec_plan_002',
      plan_code: 'PCM-2026-00001',
      version: 2,
      is_latest: true,
    }

    vi.spyOn(pb.collection('mp_multiple_cutting_plans'), 'getFullList').mockResolvedValue([
      v2,
      v1,
    ] as any)

    const versions = await mpMultipleCuttingPlansService.getVersionsByPlanCode('PCM-2026-00001')
    expect(versions).toHaveLength(2)
    expect(versions[0].version).toBe(2)
    expect(versions[1].version).toBe(1)
    expect(versions[0].plan_code).toBe(versions[1].plan_code)
  })
})
