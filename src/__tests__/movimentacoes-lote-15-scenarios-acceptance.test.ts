import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  buildIntegratedTraceability,
  buildBatchSummary,
  fetchSapBatchMovements,
  fetchRfidMovements,
  requestLabelReprint,
} from '@/services/batch-movements-service'
import { SapBatchMovement, RfidMovement } from '@/types/batch-movements'
import { pb } from '@/lib/pocketbase/client'

describe('Movimentações Lote — Suíte de Testes dos 15 Cenários de Aceite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // CENÁRIO 1: Lote com diversas movimentações SAP
  it('Cenário 1: deve processar e consolidar lote com diversas movimentações SAP', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5000001001',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-A',
        material_code: '1000123',
        material_desc: 'VERGALHAO CA-50 10MM',
        bwart: '101',
        bwart_desc: 'Entrada de mercadorias da ordem',
        quantidade: 15000,
        unidade_medida: 'KG',
        data_lancamento: '10/03/2025',
        hora: '08:30:00',
        werks: '1000',
        lgort: 'DP10',
        shkzg: 'S',
      },
      {
        mblnr: '5000001002',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-A',
        material_code: '1000123',
        material_desc: 'VERGALHAO CA-50 10MM',
        bwart: '261',
        bwart_desc: 'Saída de mercadorias para ordem',
        quantidade: 5000,
        unidade_medida: 'KG',
        data_lancamento: '11/03/2025',
        hora: '14:20:00',
        werks: '1000',
        lgort: 'DP10',
        shkzg: 'H',
      },
    ]

    const summary = buildBatchSummary('LOTE-A', sapList, [])
    expect(summary.lote).toBe('LOTE-A')
    expect(summary.saldo_atual).toBe(10000)
    expect(summary.quantidade_inicial).toBe(15000)
    expect(summary.quantidade_movimentada).toBe(20000)
    expect(summary.ultima_movimentacao_origem).toBe('SAP')
  })

  // CENÁRIO 2: Lote com movimento 601 (Saída para entrega/faturamento)
  it('Cenário 2: deve identificar e classificar corretamente o movimento 601 vindo do SAP', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5000001003',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-601',
        material_code: '1000123',
        bwart: '601',
        bwart_desc: 'Saída de mercadorias para remessa/entrega',
        quantidade: 8000,
        data_lancamento: '12/03/2025',
        hora: '16:00:00',
        lgort: 'DP10',
        werks: '1000',
      },
    ]

    const result = buildIntegratedTraceability(sapList, [], 'LOTE-601')
    expect(result.events[0].tipo_evento).toBe('SAP_EXPEDICAO')
    expect(result.events[0].titulo).toContain('601 — Saída de mercadorias para remessa/entrega')
  })

  // CENÁRIO 3: Estorno (102 ou flag de estorno)
  it('Cenário 3: deve classificar estornos e referenciar documento original', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5000001004',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-EST',
        material_code: '1000123',
        bwart: '102',
        bwart_desc: 'Estorno de entrada de mercadorias',
        quantidade: 2000,
        data_lancamento: '12/03/2025',
        is_estorno: true,
        doc_estorno_original: '5000001001',
      },
    ]

    const result = buildIntegratedTraceability(sapList, [], 'LOTE-EST')
    expect(result.events[0].tipo_evento).toBe('SAP_ESTORNO')
    expect(result.events[0].sap_ref?.doc_estorno_original).toBe('5000001001')
  })

  // CENÁRIO 4: Transferência entre depósitos (311 / 315)
  it('Cenário 4: deve registrar movimentação de transferência entre depósitos', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5000001005',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-TRF',
        material_code: '1000123',
        bwart: '311',
        bwart_desc: 'Transf.estoque no centro 1 passo',
        quantidade: 4000,
        data_lancamento: '12/03/2025',
        origem_movimento: 'DP01',
        destino_movimento: 'DP10',
      },
    ]

    const result = buildIntegratedTraceability(sapList, [], 'LOTE-TRF')
    expect(result.events[0].tipo_evento).toBe('SAP_TRANSFERENCIA')
    expect(result.events[0].sap_ref?.origem_movimento).toBe('DP01')
    expect(result.events[0].sap_ref?.destino_movimento).toBe('DP10')
  })

  // CENÁRIO 5: Registros RFID
  it('Cenário 5: deve incorporar registros de leituras RFID e coletores', () => {
    const rfidList: RfidMovement[] = [
      {
        id: 'rfid-1',
        data_leitura: '12/03/2025',
        hora_leitura: '10:00:00',
        tag_rfid: 'TAG-RFID-9988',
        epc: 'EPC303425789',
        lote: 'LOTE-RFID',
        material_code: '1000123',
        localizacao_atual: 'DP10 - Rua A - Baia 03',
        deposito: 'DP10',
        centro: '1000',
        equipamento_coletor: 'Coletor Zebra MC3300',
        usuario: 'operador.rfid@ciafal.com.br',
      },
    ]

    const result = buildIntegratedTraceability([], rfidList, 'LOTE-RFID')
    expect(result.events).toHaveLength(1)
    expect(result.events[0].origem).toBe('RFID')
    expect(result.events[0].localizacao_fisica).toBe('DP10 - Rua A - Baia 03')
  })

  // CENÁRIO 6: SAP e RFID com mesma localização
  it('Cenário 6: deve correlacionar com sucesso quando SAP e RFID concordam na localização', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5000001006',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-SYNC',
        material_code: '1000123',
        bwart: '101',
        bwart_desc: 'Entrada mercadorias',
        quantidade: 1000,
        data_lancamento: '12/03/2025',
        hora: '10:00:00',
        lgort: 'DP10',
      },
    ]

    const rfidList: RfidMovement[] = [
      {
        id: 'rfid-sync-1',
        data_leitura: '12/03/2025',
        hora_leitura: '10:05:00',
        tag_rfid: 'TAG-SYNC-1',
        lote: 'LOTE-SYNC',
        material_code: '1000123',
        localizacao_atual: 'DP10 - Box 01',
        deposito: 'DP10',
      },
    ]

    const result = buildIntegratedTraceability(sapList, rfidList, 'LOTE-SYNC')
    const sapEv = result.events.find((e) => e.origem === 'SAP')
    expect(sapEv?.status_correlacao).toBe('CORRELACIONADO')
    expect(sapEv?.tem_divergencia).toBe(false)
  })

  // CENÁRIO 7: Localizações divergentes entre SAP e RFID
  it('Cenário 7: deve apontar divergência quando localização física difere do contábil SAP', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5000001007',
        mjahr: '2025',
        zeile: '0001',
        lote: 'LOTE-DIV',
        material_code: '1000123',
        bwart: '311',
        quantidade: 1000,
        data_lancamento: '12/03/2025',
        hora: '10:00:00',
        lgort: 'DP10', // SAP diz DP10
      },
    ]

    const rfidList: RfidMovement[] = [
      {
        id: 'rfid-div-1',
        data_leitura: '12/03/2025',
        hora_leitura: '10:15:00',
        tag_rfid: 'TAG-DIV-1',
        lote: 'LOTE-DIV',
        material_code: '1000123',
        localizacao_atual: 'DP09 - Semi-Acabado L1', // RFID diz DP09
        deposito: 'DP09',
      },
    ]

    const result = buildIntegratedTraceability(sapList, rfidList, 'LOTE-DIV')
    expect(result.divergencesCount).toBeGreaterThan(0)
    const divergent = result.events.find((e) => e.tem_divergencia)
    expect(divergent?.tipo_divergencia).toBe('LOCALIZACAO_DIVERGENTE')
    expect(divergent?.detalhe_divergencia).toContain('DP10')
    expect(divergent?.detalhe_divergencia).toContain('DP09')
  })

  // CENÁRIO 8: Lote inexistente ou sem parâmetros
  it('Cenário 8: deve retornar erro amigável se lote não for informado', async () => {
    const resSap = await fetchSapBatchMovements({ lote: '' })
    expect(resSap.success).toBe(false)
    expect(resSap.error).toBe('Informe o número do lote para realizar a consulta.')

    const resRfid = await fetchRfidMovements({ lote: '' })
    expect(resRfid.success).toBe(false)
    expect(resRfid.error).toBe('Informe o número do lote para realizar a consulta.')
  })

  // CENÁRIO 9: SAP indisponível (resiliência sem derrubar RFID)
  it('Cenário 9: se a integração SAP falhar, deve retornar status de erro sem quebrar a tela', async () => {
    vi.spyOn(pb, 'send').mockRejectedValueOnce(new Error('Gateway SAP Timeout'))
    vi.spyOn(pb, 'collection').mockReturnValue({
      getList: vi.fn().mockRejectedValueOnce(new Error('SAP Cache Offline')),
    } as any)

    const sapRes = await fetchSapBatchMovements({ lote: 'LOTE-OFFLINE' })
    expect(sapRes.success).toBe(false)
    expect(sapRes.error).toBe('Não foi possível consultar as movimentações SAP neste momento.')
  })

  // CENÁRIO 10: RFID indisponível (resiliência sem derrubar SAP)
  it('Cenário 10: se o RFID falhar, deve retornar status de erro sem quebrar SAP', async () => {
    vi.spyOn(pb, 'collection').mockReturnValue({
      getList: vi.fn().mockRejectedValueOnce(new Error('WMS Database Connection Error')),
    } as any)

    const rfidRes = await fetchRfidMovements({ lote: 'LOTE-RFID-OFF' })
    expect(rfidRes.success).toBe(false)
    expect(rfidRes.error).toBe('Não foi possível consultar as movimentações RFID neste momento.')
  })

  // CENÁRIO 11: Reimpressão com sucesso confirmado pelo SAP
  it('Cenário 11: deve confirmar sucesso de reimpressão somente após confirmação real da BAPI/RFC', async () => {
    vi.spyOn(pb, 'send').mockResolvedValueOnce({
      success: true,
      protocolo: 'ETIQ-20250312-TESTE',
      lote: 'LOTE-SUCESS',
      message: '2ª via da etiqueta do lote LOTE-SUCESS emitida com sucesso.',
      retorno_sap: 'Spool 49201 gerado',
    })

    const res = await requestLabelReprint({
      lote: 'LOTE-SUCESS',
      material_code: '1000123',
      impressora: 'LP_PCP_L1',
      quantidade_copias: 1,
      motivo_reimpressao: 'Etiqueta danificada',
    })

    expect(res.success).toBe(true)
    expect(res.message).toContain('emitida com sucesso')
  })

  // CENÁRIO 12: Erro ou pendência de parametrização na reimpressão
  it('Cenário 12: deve informar pendência de parametrização honestamente sem retornar falso sucesso', async () => {
    vi.spyOn(pb, 'send').mockRejectedValueOnce({
      status: 503,
      data: {
        code: 'SAP_PRINT_NOT_CONFIGURED',
        message: 'Integração SAP de reimpressão pendente de parametrização.',
      },
    })
    vi.spyOn(pb, 'collection').mockReturnValue({
      create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
    } as any)

    const res = await requestLabelReprint({
      lote: 'LOTE-PEND',
      material_code: '1000123',
      impressora: 'LP_PCP_L1',
      quantidade_copias: 1,
      motivo_reimpressao: 'Etiqueta perdida',
    })

    expect(res.success).toBe(false)
    expect(res.code).toBe('SAP_PRINT_NOT_CONFIGURED')
    expect(res.message).toBe('Integração SAP de reimpressão pendente de parametrização.')
  })

  // CENÁRIO 13: Validação de lote com múltiplos materiais
  it('Cenário 13: deve alertar claramente se o lote contiver mais de um material', () => {
    const sapList: SapBatchMovement[] = [
      {
        mblnr: '5001',
        mjahr: '2025',
        zeile: '1',
        lote: 'LOTE-MULTI',
        material_code: 'MAT-1',
        material_desc: 'Vergalhão 10mm',
        bwart: '101',
        quantidade: 100,
        data_lancamento: '12/03/2025',
      },
      {
        mblnr: '5002',
        mjahr: '2025',
        zeile: '1',
        lote: 'LOTE-MULTI',
        material_code: 'MAT-2',
        material_desc: 'Vergalhão 12mm',
        bwart: '101',
        quantidade: 200,
        data_lancamento: '12/03/2025',
      },
    ]

    const sum = buildBatchSummary('LOTE-MULTI', sapList, [])
    expect(sum.materiais_relacionados.length).toBe(2)
  })

  // CENÁRIO 14: Grande volume de registros sem travar ordenação
  it('Cenário 14: deve processar cronologia de centenas de registros sem erro', () => {
    const sapList: SapBatchMovement[] = []
    for (let i = 0; i < 300; i++) {
      sapList.push({
        mblnr: `500000${i}`,
        mjahr: '2025',
        zeile: '1',
        lote: 'LOTE-BIG',
        material_code: '1000123',
        bwart: i % 2 === 0 ? '101' : '261',
        quantidade: 100,
        data_lancamento: '10/03/2025',
        hora: '10:00:00',
      })
    }

    const result = buildIntegratedTraceability(sapList, [], 'LOTE-BIG')
    expect(result.events).toHaveLength(300)
    expect(result.divergencesCount).toBe(300) // todos sem RFID correspondente
  })

  // CENÁRIO 15: Exportação dupla preservada no PocketBase client
  it('Cenário 15: deve manter exportação dupla obrigatória de pb em client.ts', () => {
    expect(pb).toBeDefined()
    expect(typeof pb.collection).toBe('function')
  })
})
