import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

export type ProgrammingParameterType =
  | 'NUMERICO'
  | 'TEXTO'
  | 'BOOLEANO'
  | 'PERCENTUAL'
  | 'TEMPO'
  | 'RESTRICAO'
  | 'Restrição'
  | 'Regra'
  | 'Alerta'
  | 'Condição'
  | 'Limite'
  | 'Prioridade'
  | 'Numérico'
  | 'Texto'
  | 'Booleano'
  | 'Percentual'
  | 'Tempo'

export type ProgrammingParameterStatus = 'Ativo' | 'Inativo'

export interface ProgrammingParameter {
  id: string
  center_id?: string
  center_code: string
  name: string
  description?: string
  parameter_type: ProgrammingParameterType
  value?: string
  unit_of_measure?: string
  valid_from: string
  valid_until?: string
  status: ProgrammingParameterStatus
  textoParametro: string
  impactoConsequencia: string
  notes?: string
  created?: string
  updated?: string
}

export interface CreateOrUpdateParameterInput {
  id?: string
  center_id?: string
  center_code: string
  name: string
  description?: string
  parameter_type: ProgrammingParameterType
  value?: string
  unit_of_measure?: string
  valid_from: string
  valid_until?: string
  status: ProgrammingParameterStatus
  textoParametro: string
  impactoConsequencia: string
  notes?: string
}

class PCPProgrammingParametersService {
  /**
   * Lista parâmetros filtrados estritamente por Centro (center_code).
   * Suporta filtro opcional por status ('Ativo' | 'Inativo' | 'Todos').
   */
  async listByCenter(
    centerCode: string,
    options?: {
      status?: 'Ativo' | 'Inativo' | 'Todos'
      activeAndValidOnly?: boolean
      referenceDate?: string
    },
  ): Promise<ProgrammingParameter[]> {
    if (!centerCode) return []

    try {
      const filters: string[] = [`center_code = "${centerCode.trim()}"`]

      if (options?.status && options.status !== 'Todos') {
        filters.push(`status = "${options.status}"`)
      }

      if (options?.activeAndValidOnly) {
        filters.push(`status = "Ativo"`)
        const refDate = (options.referenceDate || new Date().toISOString()).slice(0, 10)
        filters.push(`valid_from <= "${refDate}"`)
        filters.push(`(valid_until = "" || valid_until = null || valid_until >= "${refDate}")`)
      }

      const records = await pb.collection('pcp_programming_parameters').getFullList({
        filter: filters.join(' && '),
        sort: '-created',
      })

      return records.map((r: any) => this.mapRecord(r))
    } catch (err) {
      console.warn(`Erro ao listar parâmetros do centro ${centerCode}:`, err)
      return []
    }
  }

  /**
   * Obtém parâmetros ativos e vigentes para consumo pelo motor ou pela Montagem Semanal.
   */
  async getActiveAndValidForCenter(
    centerCode: string,
    targetDate?: string,
  ): Promise<ProgrammingParameter[]> {
    return this.listByCenter(centerCode, {
      status: 'Ativo',
      activeAndValidOnly: true,
      referenceDate: targetDate,
    })
  }

  /**
   * Salva (cria ou atualiza) um parâmetro e registra auditoria completa.
   */
  async saveParameter(
    input: CreateOrUpdateParameterInput,
    currentUserInfo?: { id?: string; name?: string; email?: string },
  ): Promise<ProgrammingParameter> {
    const isEditing = Boolean(input.id)
    let previousRecord: ProgrammingParameter | null = null

    if (isEditing && input.id) {
      try {
        const existing = await pb.collection('pcp_programming_parameters').getOne(input.id)
        previousRecord = this.mapRecord(existing)
      } catch (e) {
        console.warn('Registro anterior não encontrado para diff de auditoria:', e)
      }
    }

    const payload: any = {
      center_id: input.center_id || null,
      center_code: input.center_code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      parameter_type: input.parameter_type,
      value: input.value != null ? String(input.value).trim() : '',
      unit_of_measure: input.unit_of_measure?.trim() || '',
      valid_from: input.valid_from ? input.valid_from.slice(0, 10) : '',
      valid_until: input.valid_until ? input.valid_until.slice(0, 10) : null,
      status: input.status,
      texto_parametro: input.textoParametro.trim(),
      impacto_consequencia: input.impactoConsequencia.trim(),
      notes: input.impactoConsequencia.trim() || input.notes?.trim() || '',
    }

    let savedRec: any
    if (isEditing && input.id) {
      savedRec = await pb.collection('pcp_programming_parameters').update(input.id, payload)
    } else {
      savedRec = await pb.collection('pcp_programming_parameters').create(payload)
    }

    const result = this.mapRecord(savedRec)

    // Trilha auditável via pcpAuditService
    try {
      const actionType = isEditing ? 'ALTERACAO' : 'CRIACAO'
      const changes: Array<{ field: string; fieldNamePt: string; before: any; after: any }> = []

      if (isEditing && previousRecord) {
        if (previousRecord.name !== result.name) {
          changes.push({
            field: 'name',
            fieldNamePt: 'Nome do Parâmetro',
            before: previousRecord.name,
            after: result.name,
          })
        }
        if (previousRecord.parameter_type !== result.parameter_type) {
          changes.push({
            field: 'parameter_type',
            fieldNamePt: 'Tipo de Parâmetro',
            before: previousRecord.parameter_type,
            after: result.parameter_type,
          })
        }
        if (previousRecord.value !== result.value) {
          changes.push({
            field: 'value',
            fieldNamePt: 'Valor do Parâmetro',
            before: previousRecord.value || '—',
            after: result.value || '—',
          })
        }
        if (previousRecord.unit_of_measure !== result.unit_of_measure) {
          changes.push({
            field: 'unit_of_measure',
            fieldNamePt: 'Unidade de Medida',
            before: previousRecord.unit_of_measure || '—',
            after: result.unit_of_measure || '—',
          })
        }
        if (previousRecord.valid_from !== result.valid_from) {
          changes.push({
            field: 'valid_from',
            fieldNamePt: 'Vigência Inicial',
            before: previousRecord.valid_from || '—',
            after: result.valid_from || '—',
          })
        }
        if (previousRecord.valid_until !== result.valid_until) {
          changes.push({
            field: 'valid_until',
            fieldNamePt: 'Vigência Final',
            before: previousRecord.valid_until || '—',
            after: result.valid_until || '—',
          })
        }
        if (previousRecord.status !== result.status) {
          changes.push({
            field: 'status',
            fieldNamePt: 'Status',
            before: previousRecord.status,
            after: result.status,
          })
        }
        if (previousRecord.textoParametro !== result.textoParametro) {
          changes.push({
            field: 'texto_parametro',
            fieldNamePt: 'Texto do Parâmetro',
            before: previousRecord.textoParametro || '—',
            after: result.textoParametro || '—',
          })
        }
        if (previousRecord.impactoConsequencia !== result.impactoConsequencia) {
          changes.push({
            field: 'impacto_consequencia',
            fieldNamePt: 'Impacto / Consequência',
            before: previousRecord.impactoConsequencia || '—',
            after: result.impactoConsequencia || '—',
          })
        }
      } else {
        changes.push({
          field: 'name',
          fieldNamePt: 'Nome do Parâmetro',
          before: null,
          after: result.name,
        })
        changes.push({
          field: 'value',
          fieldNamePt: 'Valor do Parâmetro',
          before: null,
          after: result.value || '—',
        })
        changes.push({
          field: 'status',
          fieldNamePt: 'Status',
          before: null,
          after: result.status,
        })
        changes.push({
          field: 'texto_parametro',
          fieldNamePt: 'Texto do Parâmetro',
          before: null,
          after: result.textoParametro,
        })
        changes.push({
          field: 'impacto_consequencia',
          fieldNamePt: 'Impacto / Consequência',
          before: null,
          after: result.impactoConsequencia,
        })
      }

      await pcpAuditService.recordLog({
        action: actionType,
        event_type: isEditing ? 'Alteração' : 'Criação',
        center: result.center_code,
        line: result.center_code,
        module: 'Cadastros',
        screen: 'Parâmetros de Programação',
        entity: 'pcp_programming_parameters',
        record_id: result.id,
        user_id: currentUserInfo?.id,
        user_name: currentUserInfo?.name,
        user_email: currentUserInfo?.email,
        details: {
          parameter_id: result.id,
          parameter_name: result.name,
          parameter_type: result.parameter_type,
          center_code: result.center_code,
          action: actionType,
          previous_value: previousRecord?.value ?? null,
          new_value: result.value ?? null,
          texto_parametro: result.textoParametro,
          impacto_consequencia: result.impactoConsequencia,
          previous_texto_parametro: previousRecord?.textoParametro ?? null,
          previous_impacto_consequencia: previousRecord?.impactoConsequencia ?? null,
        },
        changes,
        status: 'Concluída',
        source: 'Usuário',
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria de parâmetro:', auditErr)
    }

    return result
  }

  /**
   * Altera status (Ativar / Inativar) de um parâmetro sem exclusão definitiva,
   * gerando log de auditoria ATIVACAO / INATIVACAO.
   */
  async toggleStatus(
    id: string,
    newStatus: ProgrammingParameterStatus,
    currentUserInfo?: { id?: string; name?: string; email?: string },
  ): Promise<ProgrammingParameter> {
    const existing = await pb.collection('pcp_programming_parameters').getOne(id)
    const previous = this.mapRecord(existing)

    const updated = await pb.collection('pcp_programming_parameters').update(id, {
      status: newStatus,
    })

    const result = this.mapRecord(updated)
    const actionType = newStatus === 'Ativo' ? 'ATIVACAO' : 'INATIVACAO'

    try {
      await pcpAuditService.recordLog({
        action: actionType,
        event_type: newStatus === 'Ativo' ? 'Ativação' : 'Inativação',
        center: result.center_code,
        line: result.center_code,
        module: 'Cadastros',
        screen: 'Parâmetros de Programação',
        entity: 'pcp_programming_parameters',
        record_id: result.id,
        user_id: currentUserInfo?.id,
        user_name: currentUserInfo?.name,
        user_email: currentUserInfo?.email,
        details: {
          parameter_id: result.id,
          parameter_name: result.name,
          center_code: result.center_code,
          action: actionType,
          previous_status: previous.status,
          new_status: newStatus,
        },
        changes: [
          {
            field: 'status',
            fieldNamePt: 'Status',
            before: previous.status,
            after: newStatus,
          },
        ],
        status: 'Concluída',
        source: 'Usuário',
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria de alteração de status:', auditErr)
    }

    return result
  }

  private mapRecord(rec: any): ProgrammingParameter {
    return {
      id: rec.id,
      center_id: rec.center_id || undefined,
      center_code: rec.center_code || '',
      name: rec.name || '',
      description: rec.description || '',
      parameter_type: rec.parameter_type || 'TEXTO',
      value: rec.value || '',
      unit_of_measure: rec.unit_of_measure || '',
      valid_from: rec.valid_from ? rec.valid_from.slice(0, 10) : '',
      valid_until: rec.valid_until ? rec.valid_until.slice(0, 10) : undefined,
      status: rec.status === 'Inativo' || rec.status === 'INATIVO' ? 'Inativo' : 'Ativo',
      textoParametro: rec.texto_parametro || '',
      impactoConsequencia: rec.impacto_consequencia || rec.notes || '',
      notes: rec.notes || rec.impacto_consequencia || '',
      created: rec.created,
      updated: rec.updated,
    }
  }
}

export const pcpProgrammingParametersService = new PCPProgrammingParametersService()
