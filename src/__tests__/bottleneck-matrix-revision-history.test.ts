import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  bottleneckMatrixRevisionService,
  formatDateTimePtBr,
} from '@/services/bottleneck-matrix-revision-service'
import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    collection: vi.fn(),
  },
  pb: {
    collection: vi.fn(),
  },
}))

vi.mock('@/services/pcp-audit-service', () => ({
  pcpAuditService: {
    recordLog: vi.fn(),
    recordFailureAttempt: vi.fn(),
  },
  computeDiff: vi.fn((before, after) => {
    const diff = []
    for (const k of Object.keys(after)) {
      if (before[k] !== after[k]) {
        diff.push({ field: k, before: before[k], after: after[k] })
      }
    }
    return diff
  }),
}))

describe('bottleneckMatrixRevisionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('formata data e hora no padrão brasileiro dd/mm/aaaa hh:mm', () => {
    const formatted = formatDateTimePtBr('2026-03-22T14:30:00.000Z')
    // Deve conter dd/mm/aaaa e hora:minuto
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)
    expect(formatDateTimePtBr(null)).toBe('—')
  })

  it('lista as revisões filtrando por record_id ou resource_id no pcp_audit_logs', async () => {
    const mockAuditLogs = [
      {
        id: 'log-1',
        action: 'Cadastro de Nova Matriz de Referência',
        created: '2026-03-20T10:00:00.000Z',
        user_name: 'Fabrício Menezes',
        user_role: 'Eng. de Processos',
        details: { version: 1, matrix_name: 'Matriz 1' },
        changes: [{ field: 'status', before: null, after: 'VIGENTE' }],
      },
      {
        id: 'log-2',
        action: 'Homologação da Matriz de Gargalos',
        created: '2026-03-21T11:15:00.000Z',
        user_name: 'Carlos PCP',
        user_role: 'Gerente PCP',
        details: { version: 1, is_homologated: true },
        changes: [{ field: 'is_homologated', before: false, after: true }],
      },
      {
        id: 'log-3',
        action: 'Abertura de Nova Revisão: Rev.2',
        created: '2026-03-22T08:30:00.000Z',
        user_name: 'Mariana PCP',
        details: { version: 2 },
        changes: [{ field: 'version', before: 1, after: 2 }],
      },
    ]

    const getFullListMock = vi.fn().mockResolvedValue(mockAuditLogs)
    vi.mocked(pb.collection).mockReturnValue({
      getFullList: getFullListMock,
    } as any)

    const list = await bottleneckMatrixRevisionService.listRevisionsForMatrix('matrix-123')

    expect(pb.collection).toHaveBeenCalledWith('pcp_audit_logs')
    expect(getFullListMock).toHaveBeenCalledWith({
      filter:
        "(resource = 'line_bottleneck_matrix' || entity = 'line_bottleneck_matrix') && (record_id = 'matrix-123' || resource_id = 'matrix-123')",
      sort: '-created',
    })
    expect(list).toHaveLength(3)
    expect(list[0].action_type).toBe('CRIACAO')
    expect(list[0].revision).toBe(1)
    expect(list[1].action_type).toBe('HOMOLOGACAO')
    expect(list[2].action_type).toBe('EDICAO')
    expect(list[2].revision).toBe(2)
  })

  it('grava log de homologação corretamente', async () => {
    const mockMatrix = {
      id: 'matrix-123',
      matrix_name: 'Matriz Ref Teste',
      version: 1,
      is_homologated: false,
      status: 'VIGENTE',
    } as any

    await bottleneckMatrixRevisionService.recordHomologationLog({
      matrix: mockMatrix,
      isHomologated: true,
      approverName: 'Eng. Teste',
      companyCode: 'CIAFAL',
      lineCode: 'L1',
      centerName: 'Linha 1 — Laminação',
    })

    expect(pcpAuditService.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('Homologação da Matriz de Gargalos'),
        resource: 'line_bottleneck_matrix',
        record_id: 'matrix-123',
        module: 'Matriz de Gargalos Dinâmica',
      }),
    )
  })

  it('grava log de alteração de status/vigência corretamente', async () => {
    const mockMatrix = {
      id: 'matrix-123',
      matrix_name: 'Matriz Ref Teste',
      version: 1,
      status: 'RASCUNHO',
    } as any

    await bottleneckMatrixRevisionService.recordStatusChangeLog({
      matrix: mockMatrix,
      newStatus: 'VIGENTE',
      companyCode: 'CIAFAL',
      lineCode: 'L1',
    })

    expect(pcpAuditService.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('Alteração de Status para VIGENTE'),
        resource: 'line_bottleneck_matrix',
        record_id: 'matrix-123',
      }),
    )
  })

  it('grava log de nova revisão corretamente com justificativa', async () => {
    const mockMatrix = {
      id: 'matrix-123',
      matrix_name: 'Matriz Ref Teste',
      version: 1,
      status: 'VIGENTE',
    } as any

    await bottleneckMatrixRevisionService.recordNewRevisionLog({
      matrix: mockMatrix,
      newVersion: 2,
      companyCode: 'CIAFAL',
      lineCode: 'L1',
      notes: 'Calibração da capacidade da tesoura TR2',
    })

    expect(pcpAuditService.recordLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('Abertura de Nova Revisão: Rev.2'),
        resource: 'line_bottleneck_matrix',
        record_id: 'matrix-123',
        justification: 'Calibração da capacidade da tesoura TR2',
      }),
    )
  })
})
