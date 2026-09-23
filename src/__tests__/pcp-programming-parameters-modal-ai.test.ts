import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  OFFICIAL_PROGRAMMING_PARAMETER_TYPES,
  normalizeParameterTypeToOfficial,
  pcpProgrammingParametersService,
} from '@/services/pcp-programming-parameters-service'
import { pcpAuditService } from '@/services/pcp-audit-service'
import {
  sapParametersMasterDataService,
  OPCAO_FIXA_NAO_HA,
} from '@/services/sap-parameters-master-data-service'
import pb from '@/lib/pocketbase/client'

describe('Parâmetros de Programação - 15 Tipos Oficiais e IA', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve conter EXATAMENTE as 15 opções oficiais na ordem exata e com acentuação correta', () => {
    const expectedList = [
      'Matéria-prima dimensional',
      'Matéria-prima aço',
      'Matéria-prima fornecedor',
      'Redução',
      'Produtividade',
      'Restrição técnica',
      'Restrição equipamento',
      'Qualidade',
      'Operador',
      'Mecânica',
      'Elétrica',
      'Automação',
      'PCP',
      'Comprimento',
      'Outros',
    ]

    expect(OFFICIAL_PROGRAMMING_PARAMETER_TYPES).toHaveLength(15)
    expect([...OFFICIAL_PROGRAMMING_PARAMETER_TYPES]).toEqual(expectedList)
  })

  it('normalizeParameterTypeToOfficial mapeia tipos legados e preserva tipos oficiais', () => {
    // 15 Tipos Oficiais preservados exatamente
    for (const official of OFFICIAL_PROGRAMMING_PARAMETER_TYPES) {
      expect(normalizeParameterTypeToOfficial(official)).toBe(official)
    }

    // Legados mapeados coerentemente
    expect(normalizeParameterTypeToOfficial('RESTRICAO')).toBe('Restrição técnica')
    expect(normalizeParameterTypeToOfficial('Restrição')).toBe('Restrição técnica')
    expect(normalizeParameterTypeToOfficial('Regra')).toBe('Restrição técnica')
    expect(normalizeParameterTypeToOfficial('Alerta')).toBe('PCP')
    expect(normalizeParameterTypeToOfficial('Condição')).toBe('Restrição técnica')
    expect(normalizeParameterTypeToOfficial('Limite')).toBe('Restrição equipamento')
    expect(normalizeParameterTypeToOfficial('NUMERICO')).toBe('Produtividade')
    expect(normalizeParameterTypeToOfficial('TEMPO')).toBe('Produtividade')
    expect(normalizeParameterTypeToOfficial('DESCONHECIDO')).toBe('Outros')
  })

  it('chama pb.send para o endpoint server-side de análise com IA com os dados mínimos obrigatórios', async () => {
    const mockResponse = {
      tipo_atual: 'Restrição técnica',
      classificacao: 'partially_compatible',
      analise: 'A regra se refere especificamente à procedência da matéria-prima.',
      tipo_sugerido: 'Matéria-prima fornecedor',
      justificativa:
        'Como o foco é o fornecedor homologado, a categoria específica deve ser utilizada.',
      coerencia_regra_impacto: 'compatible',
    }

    const sendSpy = vi.spyOn(pb, 'send').mockResolvedValueOnce(mockResponse as any)

    const payload = {
      centro: 'LAM-01',
      linha: 'LAM-01',
      nome_parametro: 'Fornecedor homologado',
      tipo_parametro: 'Restrição técnica',
      texto_parametro: 'Somente utilizar matéria-prima fornecida pelo fornecedor X',
      impacto_consequencia: 'Bloquear matéria-prima de fornecedor não homologado',
    }

    const result = await pcpProgrammingParametersService.analyzeWithAI(payload)

    expect(sendSpy).toHaveBeenCalledWith(
      '/backend/v1/pcp/programming-parameters/ai-analyze',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    )

    expect(result.classificacao).toBe('partially_compatible')
    expect(result.tipo_sugerido).toBe('Matéria-prima fornecedor')
    expect(result.coerencia_regra_impacto).toBe('compatible')
  })

  it('salva o parâmetro com tipo oficial e registra metadados de análise e decisão do usuário', async () => {
    const fakeCreated = {
      id: 'param-123',
      center_code: 'LAM-01',
      name: 'Palanquilha Seção Mínima',
      parameter_type: 'Matéria-prima dimensional',
      texto_parametro: 'Não programar palanquilha com seção inferior a 130 mm',
      impacto_consequencia: 'Bloquear a programação e informar o Programador PCP',
      valid_from: '2025-01-01',
      status: 'Ativo',
      ai_analysis_metadata: {
        tipo_atual: 'Matéria-prima dimensional',
        classificacao: 'compatible',
        analise: 'Classificação coerente com a dimensão física da matéria-prima.',
        tipo_sugerido: null,
        justificativa: 'Regra estritamente dimensional.',
        coerencia_regra_impacto: 'compatible',
      },
      user_decision: 'MANTEVE',
      created: '2025-01-01T00:00:00Z',
    }

    const colSpy = vi.spyOn(pb, 'collection').mockReturnValue({
      create: vi.fn().mockResolvedValue(fakeCreated),
      getOne: vi.fn(),
      update: vi.fn(),
      getFullList: vi.fn(),
    } as any)

    const res = await pcpProgrammingParametersService.saveParameter({
      center_code: 'LAM-01',
      name: 'Palanquilha Seção Mínima',
      parameter_type: 'Matéria-prima dimensional',
      bitola: '130 mm',
      tipo_aco: 'SAE 1020',
      codigo_sap: 'SAE 1020',
      textoParametro: 'Não programar palanquilha com seção inferior a 130 mm',
      impactoConsequencia: 'Bloquear a programação e informar o Programador PCP',
      valid_from: '2025-01-01',
      status: 'Ativo',
      ai_analysis_metadata: fakeCreated.ai_analysis_metadata as any,
      user_decision: 'MANTEVE',
    })

    expect(colSpy).toHaveBeenCalledWith('pcp_programming_parameters')
    expect(res.parameter_type).toBe('Matéria-prima dimensional')
    expect(res.textoParametro).toBe('Não programar palanquilha com seção inferior a 130 mm')
    expect(res.impactoConsequencia).toBe('Bloquear a programação e informar o Programador PCP')
  })

  it('valida obrigatoriedade da Bitola com a mensagem exata requerida e registra erro de auditoria', async () => {
    const auditSpy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

    await expect(
      pcpProgrammingParametersService.saveParameter({
        center_code: 'LAM-01',
        name: 'Regra de Teste',
        parameter_type: 'Produtividade',
        bitola: '', // vazia propositalmente
        tipo_aco: 'SAE 1020',
        textoParametro: 'Texto explicativo do parâmetro',
        impactoConsequencia: 'Impacto operacional',
        valid_from: '2025-01-01',
        status: 'Ativo',
      }),
    ).rejects.toThrow("Selecione uma Bitola ou informe 'Não há'.")

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRIACAO',
        event_type: 'Criação',
        center: 'LAM-01',
        status: 'Erro',
        outcome: 'FAILED',
        details: expect.objectContaining({
          validation_error: "Selecione uma Bitola ou informe 'Não há'.",
          bitola: '',
          sucesso: false,
        }),
      }),
    )
  })

  it('permite valor especial "Não há" como bitola válida e persiste corretamente', async () => {
    const fakeRecord = {
      id: 'param-nao-ha',
      center_code: 'LAM-01',
      name: 'Sem restrição de bitola',
      parameter_type: 'Operador',
      bitola: OPCAO_FIXA_NAO_HA,
      tipo_aco: 'SAE 1045',
      texto_parametro: 'Operador qualificado nível 2',
      impacto_consequencia: 'Restrição de operação',
      valid_from: '2025-01-01',
      status: 'Ativo',
      created: '2025-01-01T00:00:00Z',
    }

    vi.spyOn(pb, 'collection').mockReturnValue({
      create: vi.fn().mockResolvedValue(fakeRecord),
      getOne: vi.fn(),
      update: vi.fn(),
      getFullList: vi.fn(),
    } as any)

    const res = await pcpProgrammingParametersService.saveParameter({
      center_code: 'LAM-01',
      name: 'Sem restrição de bitola',
      parameter_type: 'Operador',
      bitola: OPCAO_FIXA_NAO_HA,
      tipo_aco: 'SAE 1045',
      textoParametro: 'Operador qualificado nível 2',
      impactoConsequencia: 'Restrição de operação',
      valid_from: '2025-01-01',
      status: 'Ativo',
    })

    expect(res.bitola).toBe('Não há')
  })

  it('audita antes e depois de Bitola e Tipo de Aço em caso de alteração', async () => {
    const existingRecord = {
      id: 'param-existente',
      center_code: 'LAM-01',
      name: 'Regra com alteração',
      parameter_type: 'Qualidade',
      bitola: '130 mm',
      tipo_aco: 'SAE 1020',
      texto_parametro: 'Regra inicial',
      impacto_consequencia: 'Impacto inicial',
      valid_from: '2025-01-01',
      status: 'Ativo',
      created: '2025-01-01T00:00:00Z',
    }

    const updatedRecord = {
      ...existingRecord,
      bitola: '160 mm',
      tipo_aco: 'SAE 1045',
    }

    vi.spyOn(pb, 'collection').mockReturnValue({
      getOne: vi.fn().mockResolvedValue(existingRecord),
      update: vi.fn().mockResolvedValue(updatedRecord),
      create: vi.fn(),
      getFullList: vi.fn(),
    } as any)

    const auditSpy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

    const res = await pcpProgrammingParametersService.saveParameter(
      {
        id: 'param-existente',
        center_code: 'LAM-01',
        name: 'Regra com alteração',
        parameter_type: 'Qualidade',
        bitola: '160 mm',
        tipo_aco: 'SAE 1045',
        textoParametro: 'Regra inicial',
        impactoConsequencia: 'Impacto inicial',
        valid_from: '2025-01-01',
        status: 'Ativo',
      },
      { id: 'usr-1', name: 'Analista PCP', email: 'analista@ciafal.com.br' },
    )

    expect(res.bitola).toBe('160 mm')
    expect(res.tipo_aco).toBe('SAE 1045')

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ALTERACAO',
        event_type: 'Alteração',
        center: 'LAM-01',
        status: 'Concluída',
        user_email: 'analista@ciafal.com.br',
        details: expect.objectContaining({
          previous_bitola: '130 mm',
          new_bitola: '160 mm',
          previous_tipo_aco: 'SAE 1020',
          new_tipo_aco: 'SAE 1045',
          operacao: 'ALTERACAO',
          sucesso: true,
        }),
        changes: expect.arrayContaining([
          expect.objectContaining({
            field: 'bitola',
            fieldNamePt: 'Bitola',
            before: '130 mm',
            after: '160 mm',
          }),
          expect.objectContaining({
            field: 'tipo_aco',
            fieldNamePt: 'Tipo de Aço',
            before: 'SAE 1020',
            after: 'SAE 1045',
          }),
        ]),
      }),
    )
  })

  it('resiliência SAP: retorna erro amigável sem lançar exceção nem derrubar a aplicação quando RFC falha', async () => {
    vi.spyOn(pb, 'send').mockRejectedValueOnce(new Error('Connection timeout to RFC'))

    const result = await sapParametersMasterDataService.fetchBitolas({
      center: 'LAM-01',
      forceRefresh: true,
    })

    expect(result.success).toBe(false)
    expect(result.isUnavailable).toBe(true)
    expect(result.data).toEqual([])
    expect(result.error).toBe(
      'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
    )
  })

  it('resiliência SAP para Tipos de Aço (ZPPT002): retorna status amigável em caso de erro', async () => {
    vi.spyOn(pb, 'send').mockRejectedValueOnce(new Error('Gateway 503 RFC not configured'))

    const result = await sapParametersMasterDataService.fetchTiposAco({
      center: 'LAM-01',
      forceRefresh: true,
    })

    expect(result.success).toBe(false)
    expect(result.isUnavailable).toBe(true)
    expect(result.data).toEqual([])
    expect(result.error).toBe(
      'Não foi possível consultar os dados do SAP. Tente novamente ou contate o suporte.',
    )
  })
})
