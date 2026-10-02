/**
 * Gestor da Linha Service - PCP Robotizado
 * Localiza o gestor responsável pela Linha/Centro a partir das informações já cadastradas no HUB:
 * 1) line_managers_assignment (PRIMARY_MANAGER ativo associado à linha)
 * 2) production_lines (manager_user_id da linha correspondente)
 * 3) Mapeamento por centro_code / sap_work_center
 *
 * REGRA CRÍTICA DE NEGÓCIO: Caso não exista gestor configurado:
 * NÃO permitir criar a pendência silenciosamente;
 * retornar erro de negócio com a mensagem exata:
 * "Não foi encontrado Gestor da Linha configurado para este Centro. Configure o responsável antes de gerar o Ajuste Operacional."
 */

import { pb } from '@/lib/pocketbase/client'
import { GestorLinhaInfo } from '@/types/ajuste-operacional'

export const MENSAGEM_ERRO_SEM_GESTOR =
  'Não foi encontrado Gestor da Linha configurado para este Centro. Configure o responsável antes de gerar o Ajuste Operacional.'

export interface LocalizarGestorParams {
  linha_id?: string
  linha_code?: string
  centro_id?: string
  centro_code?: string
  werks?: string
}

export class GestorLinhaService {
  /**
   * Localiza o gestor da linha ou lança erro com a mensagem exata se não configurado
   */
  async obterGestorObrigatorio(params: LocalizarGestorParams): Promise<GestorLinhaInfo> {
    const gestor = await this.localizarGestor(params)
    if (!gestor) {
      throw new Error(MENSAGEM_ERRO_SEM_GESTOR)
    }
    return gestor
  }

  /**
   * Tenta localizar o gestor da linha com fallback sequencial nas estruturas existentes
   */
  async localizarGestor(params: LocalizarGestorParams): Promise<GestorLinhaInfo | null> {
    try {
      let resolvedLineId = params.linha_id?.trim() || ''
      let resolvedLineCode = params.linha_code?.trim() || ''
      let resolvedCentroCode = params.centro_code?.trim() || ''

      // 1. Se não tiver linha_id mas tiver linha_code ou centro_code, busca a linha em production_lines
      if (!resolvedLineId && (resolvedLineCode || resolvedCentroCode)) {
        const filters: string[] = []
        if (resolvedLineCode) {
          filters.push(`code = '${resolvedLineCode}' || name ~ '${resolvedLineCode}'`)
        }
        if (resolvedCentroCode) {
          filters.push(
            `sap_work_center = '${resolvedCentroCode}' || code = '${resolvedCentroCode}'`,
          )
        }

        const lines = await pb
          .collection('production_lines')
          .getFullList<any>({
            filter: filters.join(' || '),
          })
          .catch(() => [])

        if (lines.length > 0) {
          const matched = lines[0]
          resolvedLineId = matched.id
          resolvedLineCode = resolvedLineCode || matched.code
          resolvedCentroCode = resolvedCentroCode || matched.sap_work_center || matched.code
        }
      }

      // 2. Se temos line_id, buscar gestor titular em line_managers_assignment
      if (resolvedLineId) {
        const assignments = await pb
          .collection('line_managers_assignment')
          .getFullList<any>({
            filter: `line_id = '${resolvedLineId}' && active = true`,
            sort: 'responsibility_type',
            expand: 'user_id',
          })
          .catch(() => [])

        // Preferência para PRIMARY_MANAGER
        const primary = assignments.find(
          (a) => a.responsibility_type === 'PRIMARY_MANAGER' && a.user_id,
        )
        const chosen = primary || assignments.find((a) => a.user_id)

        if (chosen && chosen.expand?.user_id) {
          const u = chosen.expand.user_id
          return {
            usuario_id: u.id,
            usuario_nome: u.name || u.email || 'Gestor Titular',
            usuario_email: u.email || '',
            tipo_responsabilidade: chosen.responsibility_type || 'PRIMARY_MANAGER',
            cargo: chosen.role_title || 'Gestor Titular da Linha',
            linha_id: resolvedLineId,
            linha_code: resolvedLineCode,
            centro_code: resolvedCentroCode,
            fonte_localizacao: 'line_managers_assignment',
          }
        }
      }

      // 3. Fallback: verificar se a linha tem manager_user_id preenchido diretamente
      if (resolvedLineId) {
        const lineRecord = await pb
          .collection('production_lines')
          .getOne<any>(resolvedLineId)
          .catch(() => null)
        if (lineRecord?.manager_user_id) {
          const user = await pb
            .collection('users')
            .getOne<any>(lineRecord.manager_user_id)
            .catch(() => null)
          if (user) {
            return {
              usuario_id: user.id,
              usuario_nome: user.name || user.email || 'Gestor da Linha',
              usuario_email: user.email || '',
              tipo_responsabilidade: 'PRIMARY_MANAGER',
              cargo: 'Gestor da Linha',
              linha_id: lineRecord.id,
              linha_code: lineRecord.code,
              linha_name: lineRecord.name,
              centro_code: lineRecord.sap_work_center || lineRecord.code,
              fonte_localizacao: 'production_lines',
            }
          }
        }
      }

      // 4. Fallback por centro_code se nenhum linha foi informada mas centro_code bate com sap_work_center de alguma linha
      if (resolvedCentroCode) {
        const matchedLines = await pb
          .collection('production_lines')
          .getFullList<any>({
            filter: `sap_work_center = '${resolvedCentroCode}' || code = '${resolvedCentroCode}'`,
          })
          .catch(() => [])

        for (const line of matchedLines) {
          if (line.manager_user_id) {
            const user = await pb
              .collection('users')
              .getOne<any>(line.manager_user_id)
              .catch(() => null)
            if (user) {
              return {
                usuario_id: user.id,
                usuario_nome: user.name || user.email || 'Gestor da Linha',
                usuario_email: user.email || '',
                tipo_responsabilidade: 'PRIMARY_MANAGER',
                cargo: 'Gestor da Linha',
                linha_id: line.id,
                linha_code: line.code,
                linha_name: line.name,
                centro_code: line.sap_work_center || line.code,
                fonte_localizacao: 'sap_work_center',
              }
            }
          }

          // Ou tentar line_managers_assignment daquela linha
          const asg = await pb
            .collection('line_managers_assignment')
            .getFullList<any>({
              filter: `line_id = '${line.id}' && active = true`,
              expand: 'user_id',
            })
            .catch(() => [])

          const valid = asg.find((a) => a.user_id && a.expand?.user_id)
          if (valid) {
            const u = valid.expand.user_id
            return {
              usuario_id: u.id,
              usuario_nome: u.name || u.email || 'Gestor Titular',
              usuario_email: u.email || '',
              tipo_responsabilidade: valid.responsibility_type || 'PRIMARY_MANAGER',
              cargo: valid.role_title || 'Gestor Titular da Linha',
              linha_id: line.id,
              linha_code: line.code,
              linha_name: line.name,
              centro_code: line.sap_work_center || line.code,
              fonte_localizacao: 'line_managers_assignment',
            }
          }
        }
      }

      return null
    } catch {
      return null
    }
  }
}

export const gestorLinhaService = new GestorLinhaService()
export default gestorLinhaService
