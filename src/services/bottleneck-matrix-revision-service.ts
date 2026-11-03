import pb from '@/lib/pocketbase/client'
import { pcpAuditService, FieldChange, PCPAuditLogRecord, computeDiff } from './pcp-audit-service'
import { LineBottleneckMatrixRecord } from '@/types/bottleneck-matrix'

export interface BottleneckMatrixRevisionEntry {
  id: string
  matrix_id: string
  revision: number | string
  action: string
  action_type: 'CRIACAO' | 'EDICAO' | 'HOMOLOGACAO' | 'VIGENCIA' | 'STATUS' | 'PLANEJADOR' | 'OUTRO'
  user_name: string
  user_email?: string
  user_role?: string
  created: string // ISO date
  formatted_datetime: string // dd/mm/aaaa hh:mm
  status?: string
  is_homologated?: boolean
  changes: FieldChange[]
  details?: Record<string, any>
  notes?: string
}

export function formatDateTimePtBr(isoString?: string | null): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return String(isoString)
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    const hora = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${ano} ${hora}:${min}`
  } catch {
    return String(isoString)
  }
}

function mapActionType(
  action: string,
  changes: FieldChange[],
): BottleneckMatrixRevisionEntry['action_type'] {
  const norm = (action || '').toUpperCase()
  if (norm.includes('CRIAÇÃO') || norm.includes('CADASTRO') || norm.includes('GERAÇÃO')) {
    return 'CRIACAO'
  }
  if (norm.includes('HOMOLOGA')) {
    return 'HOMOLOGACAO'
  }
  if (norm.includes('VIGÊNCIA') || norm.includes('ATIVAÇÃO') || norm.includes('VIGENTE')) {
    return 'VIGENCIA'
  }
  if (norm.includes('PLANEJADOR') || norm.includes('MARC-DISPO')) {
    return 'PLANEJADOR'
  }
  if (norm.includes('STATUS')) {
    return 'STATUS'
  }
  const hasStatusChange = changes.some((c) => c.field === 'status')
  if (hasStatusChange) return 'STATUS'
  const hasHomologChange = changes.some(
    (c) => c.field === 'is_homologated' || c.field === 'homologation_status',
  )
  if (hasHomologChange) return 'HOMOLOGACAO'
  return 'EDICAO'
}

function extractRevisionNumber(
  log: PCPAuditLogRecord,
  matrix?: LineBottleneckMatrixRecord | null,
): number | string {
  // 1. Tenta achar em details
  const d = log.details || {}
  if (d.version !== undefined && d.version !== null) return d.version
  if (d.revision !== undefined && d.revision !== null) return d.revision
  if (d.matrix_version !== undefined) return d.matrix_version

  // 2. Tenta achar em changes
  const ch = log.changes || []
  const verChange = ch.find(
    (c) => c.field === 'version' || c.field === 'revisao' || c.field === 'revision',
  )
  if (verChange && verChange.after !== null && verChange.after !== undefined) {
    return verChange.after
  }

  // 3. Fallback: versão atual da matriz ou 1
  return matrix?.version || 1
}

export const bottleneckMatrixRevisionService = {
  /**
   * Lista os logs de auditoria de uma matriz específica
   */
  async listRevisionsForMatrix(
    matrixId: string,
    currentMatrix?: LineBottleneckMatrixRecord | null,
  ): Promise<BottleneckMatrixRevisionEntry[]> {
    if (!matrixId) return []

    try {
      const filter = `(resource = 'line_bottleneck_matrix' || entity = 'line_bottleneck_matrix') && (record_id = '${matrixId}' || resource_id = '${matrixId}')`
      const records = await pb.collection('pcp_audit_logs').getFullList<any>({
        filter,
        sort: '-created',
      })

      return records.map((r) => {
        const changes: FieldChange[] = Array.isArray(r.changes)
          ? r.changes
          : r.details?.changes || []

        const actionText = r.action || 'Atualização da Matriz'
        const rev = extractRevisionNumber(r, currentMatrix)
        const actionType = mapActionType(actionText, changes)

        return {
          id: r.id,
          matrix_id: matrixId,
          revision: rev,
          action: actionText,
          action_type: actionType,
          user_name: r.user_name || r.user_email || 'PCP Robotizado',
          user_email: r.user_email,
          user_role: r.user_role || r.profile || 'Programador PCP',
          created: r.created,
          formatted_datetime: formatDateTimePtBr(r.created),
          status:
            r.details?.status ||
            (r.changes?.find((c: FieldChange) => c.field === 'status')?.after as string),
          is_homologated: r.details?.is_homologated,
          changes,
          details: r.details || {},
          notes: r.justification || r.reason,
        }
      })
    } catch (err) {
      console.warn('[bottleneckMatrixRevisionService] Erro ao carregar histórico de revisões:', err)
      return []
    }
  },

  /**
   * Registra log de homologação ou desomologação da matriz
   */
  async recordHomologationLog(params: {
    matrix: LineBottleneckMatrixRecord
    isHomologated: boolean
    approverName: string
    companyCode: string
    lineCode: string
    centerName?: string
  }): Promise<void> {
    const { matrix, isHomologated, approverName, companyCode, lineCode, centerName } = params
    const beforeState = {
      is_homologated: matrix.is_homologated !== false,
      approver_name: matrix.approver_name || '—',
      status: matrix.status || 'VIGENTE',
      version: matrix.version || 1,
    }
    const afterState = {
      is_homologated: isHomologated,
      approver_name: approverName,
      status: matrix.status || 'VIGENTE',
      version: matrix.version || 1,
    }
    const changes = computeDiff(beforeState, afterState)

    const actionText = isHomologated
      ? `Homologação da Matriz de Gargalos (${matrix.matrix_name || matrix.gauge_dimension || 'Ref.'})`
      : `Revogação da Homologação da Matriz (${matrix.matrix_name || matrix.gauge_dimension || 'Ref.'})`

    await pcpAuditService.recordLog({
      action: actionText,
      event_type: 'ALTERAÇÃO',
      status: 'Concluída',
      outcome: 'SUCCESS',
      module: 'Matriz de Gargalos Dinâmica',
      screen: 'Centros & Ficha Mestra',
      company: companyCode,
      line: lineCode,
      center: centerName || lineCode,
      resource: 'line_bottleneck_matrix',
      resource_id: matrix.id,
      record_id: matrix.id,
      entity: 'line_bottleneck_matrix',
      source: 'Usuário',
      changes,
      details: {
        matrix_id: matrix.id,
        matrix_name: matrix.matrix_name,
        version: matrix.version || 1,
        is_homologated: isHomologated,
        approver_name: approverName,
      },
    })
  },

  /**
   * Registra log de alteração de vigência / status
   */
  async recordStatusChangeLog(params: {
    matrix: LineBottleneckMatrixRecord
    newStatus: 'VIGENTE' | 'RASCUNHO' | 'EM_REVISAO' | 'SUPERSEDED'
    companyCode: string
    lineCode: string
    centerName?: string
  }): Promise<void> {
    const { matrix, newStatus, companyCode, lineCode, centerName } = params
    const beforeState = {
      status: matrix.status || 'VIGENTE',
      version: matrix.version || 1,
    }
    const afterState = {
      status: newStatus,
      version: matrix.version || 1,
    }
    const changes = computeDiff(beforeState, afterState)

    const actionText = `Alteração de Status para ${newStatus} (${matrix.matrix_name || matrix.gauge_dimension || 'Ref.'})`

    await pcpAuditService.recordLog({
      action: actionText,
      event_type: 'ALTERAÇÃO',
      status: 'Concluída',
      outcome: 'SUCCESS',
      module: 'Matriz de Gargalos Dinâmica',
      screen: 'Centros & Ficha Mestra',
      company: companyCode,
      line: lineCode,
      center: centerName || lineCode,
      resource: 'line_bottleneck_matrix',
      resource_id: matrix.id,
      record_id: matrix.id,
      entity: 'line_bottleneck_matrix',
      source: 'Usuário',
      changes,
      details: {
        matrix_id: matrix.id,
        matrix_name: matrix.matrix_name,
        version: matrix.version || 1,
        status_before: matrix.status,
        status_after: newStatus,
      },
    })
  },

  /**
   * Registra incremento de versão / nova revisão
   */
  async recordNewRevisionLog(params: {
    matrix: LineBottleneckMatrixRecord
    newVersion: number
    companyCode: string
    lineCode: string
    centerName?: string
    notes?: string
  }): Promise<void> {
    const { matrix, newVersion, companyCode, lineCode, centerName, notes } = params
    const beforeState = {
      version: matrix.version || 1,
      status: matrix.status || 'VIGENTE',
    }
    const afterState = {
      version: newVersion,
      status: 'EM_REVISAO',
    }
    const changes = computeDiff(beforeState, afterState)

    const actionText = `Abertura de Nova Revisão: Rev.${newVersion} (${matrix.matrix_name || matrix.gauge_dimension || 'Ref.'})`

    await pcpAuditService.recordLog({
      action: actionText,
      event_type: 'ALTERAÇÃO',
      status: 'Concluída',
      outcome: 'SUCCESS',
      module: 'Matriz de Gargalos Dinâmica',
      screen: 'Centros & Ficha Mestra',
      company: companyCode,
      line: lineCode,
      center: centerName || lineCode,
      resource: 'line_bottleneck_matrix',
      resource_id: matrix.id,
      record_id: matrix.id,
      entity: 'line_bottleneck_matrix',
      source: 'Usuário',
      justification: notes || 'Abertura de nova revisão para atualização técnica dos parâmetros',
      changes,
      details: {
        matrix_id: matrix.id,
        matrix_name: matrix.matrix_name,
        version_before: matrix.version || 1,
        version_after: newVersion,
        status: 'EM_REVISAO',
      },
    })
  },

  /**
   * Registra edição de parâmetros técnicos (capacidades, limites)
   */
  async recordTechnicalParametersEditLog(params: {
    matrix: LineBottleneckMatrixRecord
    before: Record<string, any>
    after: Record<string, any>
    companyCode: string
    lineCode: string
    centerName?: string
  }): Promise<void> {
    const { matrix, before, after, companyCode, lineCode, centerName } = params
    const changes = computeDiff(before, after)
    if (changes.length === 0) return

    await pcpAuditService.recordLog({
      action: `Edição de Parâmetros da Matriz (Rev.${matrix.version || 1})`,
      event_type: 'ALTERAÇÃO',
      status: 'Concluída',
      outcome: 'SUCCESS',
      module: 'Matriz de Gargalos Dinâmica',
      screen: 'Centros & Ficha Mestra',
      company: companyCode,
      line: lineCode,
      center: centerName || lineCode,
      resource: 'line_bottleneck_matrix',
      resource_id: matrix.id,
      record_id: matrix.id,
      entity: 'line_bottleneck_matrix',
      source: 'Usuário',
      changes,
      details: {
        matrix_id: matrix.id,
        matrix_name: matrix.matrix_name,
        version: matrix.version || 1,
      },
    })
  },
}
