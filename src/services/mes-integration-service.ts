/**
 * Serviço de Integração com o Chão de Fábrica MES 4.0
 * CIAFAL PCP Robotizado
 *
 * Requisitos:
 * 4) Camada de serviço mesIntegrationService com endpoint configurável.
 *    Como ainda NÃO existe endpoint real do MES 4.0, a sincronização retorna o estado:
 *    "Aguardando dados MES" e exibe:
 *    "Dados realizados ainda não disponíveis no MES 4.0." com botão "Sincronizar MES" para nova tentativa.
 *    NUNCA preencher realizado com zero como se fosse dado real; não criar mocks de dados MES rotulados como reais.
 * 14) Status da integração MES por teste:
 *     Aguardando execução | Aguardando dados MES | Sincronizado | Sincronização parcial | Erro de integração.
 */

import {
  TestProgrammingRecord,
  MesIntegrationStatus,
  MesExecutionData,
} from '@/types/test-programming'
import { calculateTestDeviations, CalculatedDeviations } from '@/lib/test-programming-calculations'

export interface MesSyncResponse {
  success: boolean
  status: MesIntegrationStatus
  message: string
  executionData?: MesExecutionData | null
  deviations?: CalculatedDeviations | null
  syncedAt: string
}

export class MesIntegrationService {
  private endpointUrl: string

  constructor(endpointUrl?: string) {
    this.endpointUrl =
      endpointUrl ||
      (typeof window !== 'undefined' && (window as any).__MES_40_ENDPOINT__) ||
      '/backend/v1/mes40'
  }

  /**
   * Permite configurar dinamicamente o endpoint do MES 4.0 em tempo de execução
   */
  setEndpoint(url: string) {
    this.endpointUrl = url
  }

  getEndpoint(): string {
    return this.endpointUrl
  }

  /**
   * Sincroniza dados com o MES 4.0 para um teste industrial específico.
   * Se o teste ainda não estiver pronto para receber dados (ex: Rascunho / Em Aprovação),
   * retorna "Aguardando execução".
   * Se não houver dados reais disponíveis no chão de fábrica MES, retorna
   * "Aguardando dados MES" com mensagem explícita e NUNCA dados zerados mascarados.
   */
  async syncTestExecution(
    testItem: TestProgrammingRecord,
    options?: { forcedData?: MesExecutionData },
  ): Promise<MesSyncResponse> {
    const syncedAt = new Date().toISOString()

    // Se houver dados injetados via barramento real (ou para teste de integração explícito)
    if (options?.forcedData) {
      const exec = options.forcedData
      const deviations = calculateTestDeviations(
        {
          startDate: testItem.expected_start_date || testItem.expected_date,
          startTime: testItem.expected_start_time || '08:00',
          endDate: testItem.expected_end_date || testItem.expected_date,
          endTime: testItem.expected_end_time || '10:30',
        },
        {
          startDate: exec.actual_start_date,
          startTime: exec.actual_start_time,
          endDate: exec.actual_end_date,
          endTime: exec.actual_end_time,
        },
      )

      return {
        success: true,
        status: 'Sincronizado',
        message: 'Dados realizados do MES 4.0 recebidos com sucesso.',
        executionData: exec,
        deviations,
        syncedAt,
      }
    }

    // Se o teste ainda não foi aprovado / programado
    const status = testItem.status
    if (
      status === 'Rascunho' ||
      status === 'Enviado para Aprovação Industrial' ||
      status === 'Em Aprovação Industrial' ||
      status === 'Solicitação de Ajustes' ||
      status === 'Reprovado pela Indústria' ||
      status === 'Aguardando Aprovação PCP' ||
      status === 'Em Análise PCP' ||
      status === 'Reprovado PCP'
    ) {
      return {
        success: false,
        status: 'Aguardando execução',
        message: 'O teste ainda não foi liberado e programado para o chão de fábrica.',
        executionData: null,
        deviations: null,
        syncedAt,
      }
    }

    // Se o registro já possui dados reais persistidos anteriormente do MES
    if (
      testItem.mes_execution_data?.actual_start_date &&
      testItem.mes_execution_data?.actual_start_time
    ) {
      const deviations = calculateTestDeviations(
        {
          startDate: testItem.expected_start_date || testItem.expected_date,
          startTime: testItem.expected_start_time || '08:00',
          endDate: testItem.expected_end_date || testItem.expected_date,
          endTime: testItem.expected_end_time || '10:30',
        },
        {
          startDate: testItem.mes_execution_data.actual_start_date,
          startTime: testItem.mes_execution_data.actual_start_time,
          endDate: testItem.mes_execution_data.actual_end_date,
          endTime: testItem.mes_execution_data.actual_end_time,
        },
      )

      return {
        success: true,
        status: testItem.mes_integration_status || 'Sincronizado',
        message: 'Dados realizados sincronizados com o MES 4.0.',
        executionData: testItem.mes_execution_data,
        deviations: deviations || testItem.deviation_metrics || null,
        syncedAt,
      }
    }

    // Caso Geral: Como ainda NÃO existe endpoint real do MES 4.0 implantado na planta:
    // Retorna estritamente o estado "Aguardando dados MES" e a mensagem exata:
    // "Dados realizados ainda não disponíveis no MES 4.0."
    // NUNCA preenche com zero.
    return {
      success: false,
      status: 'Aguardando dados MES',
      message: 'Dados realizados ainda não disponíveis no MES 4.0.',
      executionData: null,
      deviations: null,
      syncedAt,
    }
  }
}

export const mesIntegrationService = new MesIntegrationService()
