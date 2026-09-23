import pb from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'

// AS 15 OPÇÕES OFICIAIS NA ORDEM EXATA DO PEDIDO
export const OFFICIAL_PROGRAMMING_PARAMETER_TYPES = [
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
] as const

export type OfficialProgrammingParameterType = (typeof OFFICIAL_PROGRAMMING_PARAMETER_TYPES)[number]

// Tipos permitidos incluem os 15 oficiais + legados para retrocompatibilidade
export type ProgrammingParameterType =
  | OfficialProgrammingParameterType
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

export interface ParameterAiAnalysisResult {
  tipo_atual: string
  classificacao: 'compatible' | 'partially_compatible' | 'incompatible'
  analise: string
  tipo_sugerido: OfficialProgrammingParameterType | null
  justificativa: string
  coerencia_regra_impacto: 'compatible' | 'incompatible' | 'parcial'
  timestamp?: string
}

export interface ProgrammingParameter {
  id: string
  center_id?: string
  center_code: string
  name: string
  description?: string
  parameter_type: OfficialProgrammingParameterType
  raw_parameter_type?: string
  value?: string
  unit_of_measure?: string
  valid_from: string
  valid_until?: string
  status: ProgrammingParameterStatus
  textoParametro: string
  impactoConsequencia: string
  notes?: string
  ai_analysis_metadata?: ParameterAiAnalysisResult | null
  user_decision?: string
  created?: string
  updated?: string
}

export interface CreateOrUpdateParameterInput {
  id?: string
  center_id?: string
  center_code: string
  name: string
  description?: string
  parameter_type: string
  value?: string
  unit_of_measure?: string
  valid_from: string
  valid_until?: string
  status: ProgrammingParameterStatus
  textoParametro: string
  impactoConsequencia: string
  notes?: string
  ai_analysis_metadata?: ParameterAiAnalysisResult | null
  user_decision?: string
  initial_type_analyzed?: string
}

/**
 * Normaliza qualquer valor antigo/legado para uma das 15 opções oficiais
 */
export function normalizeParameterTypeToOfficial(raw: string): OfficialProgrammingParameterType {
  if (!raw) return 'Restrição técnica'

  const trimmed = raw.trim()

  // Match direto exato (case-insensitive) com as 15 opções
  const exactMatch = OFFICIAL_PROGRAMMING_PARAMETER_TYPES.find(
    (t) => t.toLowerCase() === trimmed.toLowerCase(),
  )
  if (exactMatch) return exactMatch

  const upper = trimmed.toUpperCase()

  // Mapeamento de legados
  if (upper === 'RESTRICAO' || upper === 'RESTRIÇÃO') return 'Restrição técnica'
  if (upper === 'REGRA') return 'Restrição técnica'
  if (upper === 'ALERTA') return 'PCP'
  if (upper === 'CONDICAO' || upper === 'CONDIÇÃO') return 'Restrição técnica'
  if (upper === 'LIMITE') return 'Restrição equipamento'
  if (upper === 'PRIORIDADE') return 'PCP'
  if (upper === 'NUMERICO' || upper === 'NUMÉRICO') return 'Produtividade'
  if (upper === 'TEMPO') return 'Produtividade'
  if (upper === 'PERCENTUAL') return 'Produtividade'
  if (upper === 'TEXTO' || upper === 'BOOLEANO') return 'Restrição técnica'

  // Verificações semânticas em termos parciais legados
  if (upper.includes('DIMENS')) return 'Matéria-prima dimensional'
  if (upper.includes('AÇO') || upper.includes('ACO')) return 'Matéria-prima aço'
  if (upper.includes('FORNECEDOR')) return 'Matéria-prima fornecedor'
  if (upper.includes('REDUÇÃO') || upper.includes('REDUCAO')) return 'Redução'
  if (upper.includes('PRODUTIV')) return 'Produtividade'
  if (upper.includes('EQUIPAMENTO') || upper.includes('MAQUINA')) return 'Restrição equipamento'
  if (upper.includes('QUALIDADE')) return 'Qualidade'
  if (upper.includes('OPERADOR')) return 'Operador'
  if (upper.includes('MECÂNICA') || upper.includes('MECANICA')) return 'Mecânica'
  if (upper.includes('ELÉTRICA') || upper.includes('ELETRICA')) return 'Elétrica'
  if (upper.includes('AUTOMAÇÃO') || upper.includes('AUTOMACAO')) return 'Automação'
  if (upper.includes('PCP')) return 'PCP'
  if (upper.includes('COMPRIMENTO')) return 'Comprimento'

  return 'Outros'
}

class PCPProgrammingParametersService {
  /**
   * Executa a análise de IA server-side real via endpoint dedicado.
   * Não bloqueia se falhar; retorna erro estruturado em caso de indisponibilidade.
   */
  async analyzeWithAI(input: {
    centro: string
    linha?: string
    nome_parametro: string
    descricao?: string
    tipo_parametro: string
    valor_configurado?: string
    unidade_medida?: string
    texto_parametro: string
    impacto_consequencia: string
  }): Promise<ParameterAiAnalysisResult> {
    const res = await pb.send<ParameterAiAnalysisResult>(
      '/backend/v1/pcp/programming-parameters/ai-analyze',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    )
    return res
  }

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

    const officialType = normalizeParameterTypeToOfficial(input.parameter_type)

    const payload: any = {
      center_id: input.center_id || null,
      center_code: input.center_code.trim(),
      name: input.name.trim(),
      description: input.description?.trim() || '',
      parameter_type: officialType,
      value: input.value != null ? String(input.value).trim() : '',
      unit_of_measure: input.unit_of_measure?.trim() || '',
      valid_from: input.valid_from ? input.valid_from.slice(0, 10) : '',
      valid_until: input.valid_until ? input.valid_until.slice(0, 10) : null,
      status: input.status,
      texto_parametro: input.textoParametro.trim(),
      impacto_consequencia: input.impactoConsequencia.trim(),
      notes: input.impactoConsequencia.trim() || input.notes?.trim() || '',
      ai_analysis_metadata: input.ai_analysis_metadata || null,
      user_decision: input.user_decision || '',
    }

    let savedRec: any
    if (isEditing && input.id) {
      savedRec = await pb.collection('pcp_programming_parameters').update(input.id, payload)
    } else {
      savedRec = await pb.collection('pcp_programming_parameters').create(payload)
    }

    const result = this.mapRecord(savedRec)

    // Trilha auditável via pcpAuditService (com rastreabilidade especial para IA)
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
          field: 'parameter_type',
          fieldNamePt: 'Tipo de Parâmetro',
          before: null,
          after: result.parameter_type,
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

      // Preparação dos dados de auditoria de IA se houver análise realizada
      const aiMeta = input.ai_analysis_metadata
      const auditDetails: Record<string, any> = {
        parameter_id: result.id,
        parameter_name: result.name,
        parameter_type: result.parameter_type,
        center_code: result.center_code,
        action: actionType,
        previous_value: previousRecord?.value ?? null,
        new_value: result.value ?? null,
        texto_parametro: result.textoParametro,
        impacto_consequencia: result.impactoConsequencia,
      }

      let auditJustification = ''
      if (aiMeta) {
        auditDetails.ai_analysis = {
          initial_type: input.initial_type_analyzed || aiMeta.tipo_atual,
          ai_result: aiMeta.classificacao,
          ai_suggested_type: aiMeta.tipo_sugerido,
          user_decision: input.user_decision || 'Não aplicou sugestão',
          final_type: result.parameter_type,
          coerencia_regra_impacto: aiMeta.coerencia_regra_impacto,
          analise: aiMeta.analise,
        }

        if (
          aiMeta.tipo_sugerido &&
          aiMeta.tipo_sugerido !== (input.initial_type_analyzed || aiMeta.tipo_atual)
        ) {
          if (result.parameter_type === aiMeta.tipo_sugerido) {
            auditJustification = `Tipo original: ${input.initial_type_analyzed || aiMeta.tipo_atual} / IA sugeriu: ${aiMeta.tipo_sugerido} / Usuário: Aplicou sugestão / Tipo final: ${result.parameter_type}`
          } else {
            auditJustification = `Tipo original: ${input.initial_type_analyzed || aiMeta.tipo_atual} / IA sugeriu: ${aiMeta.tipo_sugerido} / Usuário: Manteve classificação original / Tipo final: ${result.parameter_type}. A classificação foi mantida pelo usuário após recomendação diferente da IA.`
          }
        } else {
          auditJustification = `Classificação analisada por IA: ${aiMeta.classificacao} / Tipo final: ${result.parameter_type}`
        }
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
        justification: auditJustification || undefined,
        details: auditDetails,
        changes,
        status: 'Concluída',
        source: aiMeta ? 'IA' : 'Usuário',
      })
    } catch (auditErr) {
      console.warn('Falha ao registrar auditoria de parâmetro:', auditErr)
    }

    return result
  }

  /**
   * Altera status (Ativar / Inativar) de um parâmetro sem exclusão definitiva.
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
    const rawType = rec.parameter_type || 'Restrição técnica'
    const officialType = normalizeParameterTypeToOfficial(rawType)

    return {
      id: rec.id,
      center_id: rec.center_id || undefined,
      center_code: rec.center_code || '',
      name: rec.name || '',
      description: rec.description || '',
      parameter_type: officialType,
      raw_parameter_type: rawType,
      value: rec.value || '',
      unit_of_measure: rec.unit_of_measure || '',
      valid_from: rec.valid_from ? rec.valid_from.slice(0, 10) : '',
      valid_until: rec.valid_until ? rec.valid_until.slice(0, 10) : undefined,
      status: rec.status === 'Inativo' || rec.status === 'INATIVO' ? 'Inativo' : 'Ativo',
      textoParametro: rec.texto_parametro || '',
      impactoConsequencia: rec.impacto_consequencia || rec.notes || '',
      notes: rec.notes || rec.impacto_consequencia || '',
      ai_analysis_metadata: rec.ai_analysis_metadata || null,
      user_decision: rec.user_decision || '',
      created: rec.created,
      updated: rec.updated,
    }
  }
}

export const pcpProgrammingParametersService = new PCPProgrammingParametersService()
