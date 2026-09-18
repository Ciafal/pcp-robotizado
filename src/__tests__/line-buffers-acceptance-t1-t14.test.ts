import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LineBuffersService, SaveBufferInput } from '@/services/line-buffers-service'
import { LineBufferRecord } from '@/types/line-buffers'
import pb from '@/lib/pocketbase/client'

describe('Suíte de Aceite T1–T14: Buffers & Pulmões Operacionais', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // T1: Cadastro Empresa -> Linha -> Rota com filtragem correta dos centros
  it('T1: deve validar a hierarquia Empresa -> Linha -> Rota e centros obrigatórios', () => {
    const invalidInput: any = {
      company_code: '',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow(
      'A Empresa é obrigatória.',
    )

    invalidInput.company_code = 'CIAFAL'
    invalidInput.line_code = ''
    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow('A Linha é obrigatória.')

    invalidInput.line_code = 'L2'
    invalidInput.route_code = ''
    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow(
      'A Rota Produtiva é obrigatória.',
    )

    invalidInput.route_code = 'ROUT_PERF_U_V2'
    invalidInput.center_code = ''
    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow('O Centro é obrigatório.')

    invalidInput.center_code = 'L2'
    invalidInput.related_center_code = ''
    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow(
      'O Centro Relacionado é obrigatório.',
    )
  })

  // T2: Centro mostra apenas relacionados válidos da rota (grafo da rota N:N)
  it('T2: centro mostra apenas centros imediatamente relacionados (grafo da rota)', () => {
    // Rota: L2 -> ENDIR -> RETRAB
    const nodes = [
      { line_code: 'L2', logical_order: 10 },
      { line_code: 'ENDIR', logical_order: 20 },
      { line_code: 'RETRAB', logical_order: 30 },
    ]
    const edges = [
      { origin_line_code: 'L2', target_line_code: 'ENDIR' },
      { origin_line_code: 'ENDIR', target_line_code: 'RETRAB' },
    ]

    // Centro ENDIR deve oferecer exatamente L2 e RETRAB
    const relatedToENDIR = LineBuffersService.getImmediatelyRelatedCenters('ENDIR', nodes, edges)
    expect(relatedToENDIR).toContain('L2')
    expect(relatedToENDIR).toContain('RETRAB')
    expect(relatedToENDIR.length).toBe(2)

    // Centro L2 deve oferecer apenas ENDIR
    const relatedToL2 = LineBuffersService.getImmediatelyRelatedCenters('L2', nodes, edges)
    expect(relatedToL2).toEqual(['ENDIR'])

    // Centro RETRAB deve oferecer apenas ENDIR
    const relatedToRETRAB = LineBuffersService.getImmediatelyRelatedCenters('RETRAB', nodes, edges)
    expect(relatedToRETRAB).toEqual(['ENDIR'])
  })

  // T3: Mín=20 / Ideal=30 / Máx=150 salva com sucesso
  it('T3: Mín=20, Ideal=30, Máx=150 é válido e cumpre Mín <= Ideal <= Máx', () => {
    const validInput: SaveBufferInput = {
      company_code: 'CIAFAL',
      line_code: 'L1',
      route_code: 'ROUT_TUB_STD_V1',
      center_code: 'L1',
      related_center_code: 'ENF_L1',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 20,
      ideal_capacity: 30,
      max_capacity: 150,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'SAP',
    }

    expect(() => LineBuffersService.validateBuffer(validInput)).not.toThrow()
  })

  // T4: Mín=50 / Ideal=30 impedido com a mensagem exata
  it('T4: Mín=50 / Ideal=30 deve ser impedido com a mensagem exata', () => {
    const invalidInput: SaveBufferInput = {
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 50,
      ideal_capacity: 30, // Menor que o mínimo!
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow(
      'A capacidade operacional deve ser maior ou igual à capacidade mínima.',
    )

    // Também testar ideal > máximo
    invalidInput.min_capacity = 20
    invalidInput.ideal_capacity = 120
    invalidInput.max_capacity = 100
    expect(() => LineBuffersService.validateBuffer(invalidInput)).toThrow(
      'A capacidade operacional não pode ser superior à capacidade máxima.',
    )
  })

  // T5: Editar atualiza o MESMO ID sem duplicar registro
  it('T5: editar buffer atualiza o mesmo ID sem duplicar', async () => {
    const mockExistingId = 'rec_buffer_123'
    const updateSpy = vi.spyOn(pb.collection('line_buffers'), 'update').mockResolvedValue({
      id: mockExistingId,
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      min_capacity: 18,
      ideal_capacity: 35,
      max_capacity: 120,
      status: 'Ativo',
    } as any)

    vi.spyOn(pb.collection('line_buffers'), 'getOne').mockResolvedValue({
      id: mockExistingId,
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
    } as any)

    vi.spyOn(pb.collection('production_routes'), 'getFullList').mockResolvedValue([
      { id: 'route_1', code: 'ROUT_PERF_U_V2' } as any,
    ])
    vi.spyOn(pb.collection('production_route_nodes'), 'getFullList').mockResolvedValue([
      { line_code: 'L2' } as any,
      { line_code: 'ENDIR' } as any,
    ])

    const result = await LineBuffersService.saveBuffer({
      id: mockExistingId,
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 18,
      ideal_capacity: 35,
      max_capacity: 120,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    })

    expect(updateSpy).toHaveBeenCalledWith(mockExistingId, expect.any(Object))
    expect(result.id).toBe(mockExistingId)
  })

  // T6: Inativar mantém no histórico e para de gerar alertas operacionais
  it('T6: inativar mantém no histórico e para de gerar alertas operacionais', async () => {
    const mockId = 'rec_buf_456'
    vi.spyOn(pb.collection('line_buffers'), 'getOne').mockResolvedValue({
      id: mockId,
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      status: 'Ativo',
    } as any)

    const updateSpy = vi.spyOn(pb.collection('line_buffers'), 'update').mockResolvedValue({
      id: mockId,
      status: 'Inativo',
    } as any)

    const res = await LineBuffersService.toggleStatus(mockId, 'Inativo')
    expect(updateSpy).toHaveBeenCalledWith(mockId, { status: 'Inativo' })
    expect(res.status).toBe('Inativo')

    // Rota com buffer inativo não deve ser considerada no coverage ativo
    const coverage = LineBuffersService.analyzeRouteCoverage(
      'ROUT_PERF_U_V2',
      [{ line_code: 'L2' }, { line_code: 'ENDIR' }],
      [
        {
          id: mockId,
          company_code: 'CIAFAL',
          line_code: 'L2',
          route_code: 'ROUT_PERF_U_V2',
          center_code: 'L2',
          related_center_code: 'ENDIR',
          status: 'Inativo', // INATIVO!
        } as any,
      ],
    )
    expect(coverage.is_complete).toBe(false)
    expect(coverage.pending_text).toBe('Pendência: 1 Buffer/Pulmão sem parametrização.')
  })

  // T7: Alterar rota identifica e alerta registros afetados com a mensagem exata
  it('T7: alterar rota alerta com a mensagem exata "A alteração desta rota afeta Buffers/Pulmões cadastrados."', () => {
    const existingBuffers: LineBufferRecord[] = [
      {
        id: 'buf_1',
        company_code: 'CIAFAL',
        line_code: 'ENDIR',
        route_code: 'ROUT_PERF_U_V2',
        center_code: 'ENDIR',
        related_center_code: 'RETRAB',
        position: 'Saída do Centro',
        buffer_type: 'Buffer de Segurança',
        unit_of_measure: 't',
        min_capacity: 5,
        ideal_capacity: 15,
        max_capacity: 60,
        status: 'Ativo',
        valid_from: '2025-01-01',
        valid_until: '2026-12-31',
        stock_source: 'WMS',
      },
    ]

    // Nova rota insere INSPEÇÃO entre ENDIR e RETRAB: L2 -> ENDIR -> INSPECAO -> RETRAB
    // Logo, a ligação direta ENDIR -> RETRAB deixa de existir
    const newEdges = [
      { origin_line_code: 'L2', target_line_code: 'ENDIR' },
      { origin_line_code: 'ENDIR', target_line_code: 'INSPECAO' },
      { origin_line_code: 'INSPECAO', target_line_code: 'RETRAB' },
    ]

    const impact = LineBuffersService.checkRouteEditImpact(
      'ROUT_PERF_U_V2',
      newEdges,
      existingBuffers,
    )
    expect(impact.hasImpact).toBe(true)
    expect(impact.alertMessage).toBe('A alteração desta rota afeta Buffers/Pulmões cadastrados.')
    expect(impact.impactedBuffers.length).toBe(1)
    expect(impact.impactedBuffers[0].center_code).toBe('ENDIR')
    expect(impact.impactedBuffers[0].related_center_code).toBe('RETRAB')
  })

  // T8: Atual vem da fonte operacional, não é digitado manualmente
  it('T8: o valor Atual vem da fonte configurada (MES, Sensor, WMS, SAP)', async () => {
    const bufferMes: LineBufferRecord = {
      id: 'b1',
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    const stockMes = await LineBuffersService.getStockForBuffer(bufferMes)
    expect(typeof stockMes).toBe('number')
    expect(stockMes).toBe(25) // MES 4.0 deterministic L2->ENDIR = 25 t

    const bufferWms: LineBufferRecord = {
      ...bufferMes,
      center_code: 'ENDIR',
      related_center_code: 'RETRAB',
      min_capacity: 5,
      ideal_capacity: 15,
      max_capacity: 60,
      stock_source: 'WMS',
    }
    const stockWms = await LineBuffersService.getStockForBuffer(bufferWms)
    expect(stockWms).toBe(4) // WMS deterministic ENDIR->RETRAB = 4 t
  })

  // T9: Atual < Mínimo muda status para alerta (BELOW_MIN)
  it('T9: Atual < Mínimo muda operacional para ABAIXO DO MÍNIMO com risco de esvaziamento', () => {
    const buffer: LineBufferRecord = {
      id: 'b_below',
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    const currentStock = 10 // < 15
    const op = LineBuffersService.evaluateOperationalStatus(buffer, currentStock)
    expect(op.health).toBe('BELOW_MIN')
    expect(op.healthLabel).toBe('ABAIXO DO MÍNIMO')
    expect(op.depletionRisk).toBe(true)
    expect(op.alertMessage).toContain('ALERTA: Buffer L2 ➔ ENDIR abaixo do mínimo')
  })

  // T10: Atual > Máximo indica saturação e bloqueio upstream (ABOVE_MAX)
  it('T10: Atual > Máximo indica saturação e risco de bloqueio a montante', () => {
    const buffer: LineBufferRecord = {
      id: 'b_above',
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    const currentStock = 105 // > 100
    const op = LineBuffersService.evaluateOperationalStatus(buffer, currentStock)
    expect(op.health).toBe('ABOVE_MAX')
    expect(op.healthLabel).toBe('ACIMA DO MÁXIMO')
    expect(op.saturationRisk).toBe(true)
    expect(op.upstreamBlockRisk).toBe(true)
    expect(op.suggestedImpact).toContain(
      'Risco iminente de bloqueio/parada na linha alimentadora (L2)',
    )
  })

  // T11: Filtros por rota e centro corretos
  it('T11: filtros por rota e centro retornam correspondência exata', async () => {
    const getListSpy = vi.spyOn(pb.collection('line_buffers'), 'getFullList').mockResolvedValue([
      {
        id: 'b1',
        company_code: 'CIAFAL',
        line_code: 'L2',
        route_code: 'ROUT_PERF_U_V2',
        center_code: 'L2',
        related_center_code: 'ENDIR',
      } as any,
    ])

    const res = await LineBuffersService.listBuffers({
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
    })

    expect(getListSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filter:
          "route_code = 'ROUT_PERF_U_V2' && (center_code = 'L2' || related_center_code = 'L2')",
      }),
    )
    expect(res.length).toBe(1)
  })

  // T12: Logs & Auditoria com antes/depois registrado em pcp_audit_logs
  it('T12: auditoria antes/depois é registrada em pcp_audit_logs na edição', async () => {
    const prevBuffer = {
      id: 'buf_audit_test',
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    vi.spyOn(pb.collection('line_buffers'), 'getOne').mockResolvedValue(prevBuffer as any)
    vi.spyOn(pb.collection('line_buffers'), 'update').mockResolvedValue({
      ...prevBuffer,
      min_capacity: 20, // alterado
    } as any)

    const auditSpy = vi
      .spyOn(pb.collection('pcp_audit_logs'), 'create')
      .mockResolvedValue({ id: 'aud_1' } as any)

    await LineBuffersService.saveBuffer({
      id: 'buf_audit_test',
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'ENDIR',
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 20, // mudou de 15 para 20
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    })

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'Sequenciamento',
        screen: 'Buffers & Pulmões',
        entity: 'line_buffers',
        changes: expect.arrayContaining([
          expect.objectContaining({
            field: 'min_capacity',
            before: 15,
            after: 20,
          }),
        ]),
      }),
    )
  })

  // T13: Recarregar mantém dados persistidos
  it('T13: listBuffers consulta coleção line_buffers persistida no PocketBase', async () => {
    const listSpy = vi
      .spyOn(pb.collection('line_buffers'), 'getFullList')
      .mockResolvedValue([
        { id: 'b1', company_code: 'CIAFAL' } as any,
        { id: 'b2', company_code: 'CIAFAL' } as any,
      ])

    const data = await LineBuffersService.listBuffers()
    expect(listSpy).toHaveBeenCalled()
    expect(data.length).toBe(2)
  })

  // T14: Zero erros JS e integridade estrutural
  it('T14: integridade referencial impede buffer com centros idênticos ou sem vigência', () => {
    const identicalCentersInput: SaveBufferInput = {
      company_code: 'CIAFAL',
      line_code: 'L2',
      route_code: 'ROUT_PERF_U_V2',
      center_code: 'L2',
      related_center_code: 'L2', // Idêntico!
      position: 'Saída do Centro',
      buffer_type: 'Buffer Operacional',
      unit_of_measure: 't',
      min_capacity: 15,
      ideal_capacity: 30,
      max_capacity: 100,
      status: 'Ativo',
      valid_from: '2025-01-01',
      valid_until: '2026-12-31',
      stock_source: 'MES 4.0',
    }

    expect(() => LineBuffersService.validateBuffer(identicalCentersInput)).toThrow(
      'O Centro e o Centro Relacionado não podem ser idênticos.',
    )

    const invalidDateInput = {
      ...identicalCentersInput,
      related_center_code: 'ENDIR',
      valid_from: '2026-01-01',
      valid_until: '2025-01-01', // Vigência Final < Inicial
    }

    expect(() => LineBuffersService.validateBuffer(invalidDateInput)).toThrow(
      'A Vigência Final deve ser maior ou igual à Vigência Inicial.',
    )
  })
})
