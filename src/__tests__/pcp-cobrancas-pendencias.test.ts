import { describe, it, expect, vi, beforeEach } from 'vitest'
import { pcpCobrancasService } from '@/services/pcp-cobrancas-service'
import pb from '@/lib/pocketbase/client'

describe('PCPCobrancasService - Regras de Negócio e Canais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve chamar o endpoint /backend/v1/pcp/reunioes/cobranca/enviar com os parâmetros corretos', async () => {
    const mockResponse = {
      success: true,
      message: 'Cobrança enviada com sucesso para Thiago pelo Meu Dia e por e-mail.',
      cobranca: {
        id: 'cob_rec_123',
        codigo_cobranca: 'COB-000001',
        sequencial_pendencia: 1,
        status_meu_dia: 'ENVIADO' as const,
        status_email: 'AGUARDANDO_SMTP' as const,
        destinatario_nome: 'Thiago',
        destinatario_email: 'thiago@ciafal.com.br',
        data_hora: '19/10/2026 15:40',
      },
    }

    const sendSpy = vi.spyOn(pb, 'send').mockResolvedValueOnce(mockResponse)

    const result = await pcpCobrancasService.enviarCobranca({
      pendencia_id: 'pend_123',
      mensagem_complementar: 'Favor atualizar antes da reunião semanal.',
      idempotency_key: 'idemp_key_abc',
    })

    expect(sendSpy).toHaveBeenCalledWith(
      '/backend/v1/pcp/reunioes/cobranca/enviar',
      expect.objectContaining({
        method: 'POST',
        body: {
          pendencia_id: 'pend_123',
          mensagem_complementar: 'Favor atualizar antes da reunião semanal.',
          idempotency_key: 'idemp_key_abc',
        },
      }),
    )

    expect(result.success).toBe(true)
    expect(result.cobranca.sequencial_pendencia).toBe(1)
    expect(result.cobranca.status_meu_dia).toBe('ENVIADO')
    expect(result.cobranca.status_email).toBe('AGUARDANDO_SMTP')
  })

  it('deve chamar o endpoint de reenvio exclusivo por canal sem duplicar outros', async () => {
    const mockRetryResponse = {
      success: true,
      message: 'Alerta no Meu Dia recriado com sucesso para Thiago.',
    }

    const sendSpy = vi.spyOn(pb, 'send').mockResolvedValueOnce(mockRetryResponse)

    const result = await pcpCobrancasService.reenviarCanal({
      cobranca_id: 'cob_rec_123',
      canal: 'meu_dia',
    })

    expect(sendSpy).toHaveBeenCalledWith(
      '/backend/v1/pcp/reunioes/cobranca/reenviar-canal',
      expect.objectContaining({
        method: 'POST',
        body: {
          cobranca_id: 'cob_rec_123',
          canal: 'meu_dia',
        },
      }),
    )

    expect(result.success).toBe(true)
  })

  it('deve listar cobranças ordenadas cronologicamente por pendência', async () => {
    const mockList = [
      {
        id: 'cob_2',
        codigo_cobranca: 'COB-000002',
        pendencia_id: 'pend_1',
        pendencia_codigo: 'PEND-000001',
        sequencial_pendencia: 2,
        data_hora: '20/10/2026 10:00',
        emissor_id: 'usr_1',
        emissor_nome: 'Leticia',
        destinatario_nome: 'Thiago',
        destinatario_email: 'thiago@ciafal.com.br',
        status_meu_dia: 'ENVIADO',
        status_email: 'AGUARDANDO_SMTP',
      },
      {
        id: 'cob_1',
        codigo_cobranca: 'COB-000001',
        pendencia_id: 'pend_1',
        pendencia_codigo: 'PEND-000001',
        sequencial_pendencia: 1,
        data_hora: '19/10/2026 15:40',
        emissor_id: 'usr_1',
        emissor_nome: 'Leticia',
        destinatario_nome: 'Thiago',
        destinatario_email: 'thiago@ciafal.com.br',
        status_meu_dia: 'ENVIADO',
        status_email: 'AGUARDANDO_SMTP',
      },
    ]

    const getFullListSpy = vi.fn().mockResolvedValueOnce(mockList)
    vi.spyOn(pb, 'collection').mockReturnValueOnce({
      getFullList: getFullListSpy,
    } as any)

    const cobrancas = await pcpCobrancasService.listarCobrancasPendencia('pend_1', 'PEND-000001')

    expect(getFullListSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: "pendencia_id = 'pend_1' || pendencia_codigo = 'PEND-000001'",
        sort: '-created,-sequencial_pendencia',
      }),
    )
    expect(cobrancas.length).toBe(2)
    expect(cobrancas[0].sequencial_pendencia).toBe(2)
  })

  it('deve contar cobranças por pendência para badge na listagem', async () => {
    const mockRecords = [
      { pendencia_id: 'pend_1', pendencia_codigo: 'PEND-000001' },
      { pendencia_id: 'pend_1', pendencia_codigo: 'PEND-000001' },
      { pendencia_id: 'pend_2', pendencia_codigo: 'PEND-000002' },
    ]

    const getFullListSpy = vi.fn().mockResolvedValueOnce(mockRecords)
    vi.spyOn(pb, 'collection').mockReturnValueOnce({
      getFullList: getFullListSpy,
    } as any)

    const map = await pcpCobrancasService.contarCobrancasPorPendencias()

    expect(map['pend_1']).toBe(2)
    expect(map['PEND-000001']).toBe(2)
    expect(map['pend_2']).toBe(1)
    expect(map['PEND-000002']).toBe(1)
  })
})
