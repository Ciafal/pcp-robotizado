import pb from '@/lib/pocketbase/client'
import {
  PCPCobrancaRecord,
  EnviarCobrancaParams,
  EnviarCobrancaResponse,
  ReenviarCanalParams,
  ReenviarCanalResponse,
} from '@/types/pcp-cobranca'

export class PcpCobrancasService {
  /**
   * Envia uma nova cobrança da pendência via backend seguro:
   * 1. Canal Meu Dia (cria atividade vinculada no meu_dia_pendencias com prioridade e link direto)
   * 2. Canal E-mail (com status honesto de AGUARDANDO_SMTP se SMTP_HOST não estiver provisionado)
   * 3. Grava histórico sequencial imutável na collection pcp_cobrancas_pendencias
   * 4. Registra auditoria em pcp_audit_logs
   */
  async enviarCobranca(params: EnviarCobrancaParams): Promise<EnviarCobrancaResponse> {
    try {
      const response = await pb.send<EnviarCobrancaResponse>(
        '/backend/v1/pcp/reunioes/cobranca/enviar',
        {
          method: 'POST',
          body: params,
        },
      )
      return response
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message ||
        'Erro ao processar nova cobrança da pendência.'
      throw new Error(errorMsg)
    }
  }

  /**
   * Reenvia exclusivamente o canal que falhou (meu_dia ou email)
   * Sem duplicar o canal que já obteve sucesso
   */
  async reenviarCanal(params: ReenviarCanalParams): Promise<ReenviarCanalResponse> {
    try {
      const response = await pb.send<ReenviarCanalResponse>(
        '/backend/v1/pcp/reunioes/cobranca/reenviar-canal',
        {
          method: 'POST',
          body: params,
        },
      )
      return response
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.data?.error ||
        err?.message ||
        'Erro ao reenviar canal de cobrança.'
      throw new Error(errorMsg)
    }
  }

  /**
   * Lista o histórico completo de cobranças de uma pendência em ordem cronológica decrescente
   */
  async listarCobrancasPendencia(
    pendenciaId: string,
    pendenciaCodigo?: string,
  ): Promise<PCPCobrancaRecord[]> {
    try {
      let filter = `pendencia_id = '${pendenciaId}'`
      if (pendenciaCodigo) {
        filter = `pendencia_id = '${pendenciaId}' || pendencia_codigo = '${pendenciaCodigo}'`
      }

      const records = await pb
        .collection('pcp_cobrancas_pendencias')
        .getFullList<PCPCobrancaRecord>({
          filter,
          sort: '-created,-sequencial_pendencia',
        })
      return records
    } catch (err) {
      console.warn('[pcpCobrancasService] Erro ao listar cobranças da pendência:', err)
      return []
    }
  }

  /**
   * Obtém a contagem de cobranças para múltiplas pendências para exibição em badges (ex: 🔔 3 cobranças)
   */
  async contarCobrancasPorPendencias(): Promise<Record<string, number>> {
    try {
      const records = await pb
        .collection('pcp_cobrancas_pendencias')
        .getFullList<{ pendencia_id: string; pendencia_codigo: string }>({
          fields: 'pendencia_id,pendencia_codigo',
        })

      const map: Record<string, number> = {}
      for (const r of records) {
        if (r.pendencia_id) {
          map[r.pendencia_id] = (map[r.pendencia_id] || 0) + 1
        }
        if (r.pendencia_codigo) {
          map[r.pendencia_codigo] = (map[r.pendencia_codigo] || 0) + 1
        }
      }
      return map
    } catch {
      return {}
    }
  }
}

export const pcpCobrancasService = new PcpCobrancasService()
export default pcpCobrancasService
