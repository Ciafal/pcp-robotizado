import pb from '@/lib/pocketbase/client'
import { SgqInterferenceCategory, SgqDocumentStatus } from './sgq-document-provider'
import { pcpAuditService, computeDiff } from './pcp-audit-service'

export interface LineReferenceDocument {
  id: string
  line_id: string
  company_id?: string
  document_ref: string
  document_code: string
  title: string
  revision: string
  document_type?: string
  responsible_area?: string
  validity_date?: string
  status: SgqDocumentStatus
  source: string
  original_url?: string
  interference_categories: SgqInterferenceCategory[]
  active_revision_ref?: string
  interpreted_rules?: any
  created_by_user_id?: string
  updated_by_user_id?: string
  created?: string
  updated?: string
}

export interface CreateLineReferenceDocumentInput {
  line_id: string
  company_id?: string
  line_code?: string
  document_ref: string
  document_code: string
  title: string
  revision: string
  document_type?: string
  responsible_area?: string
  validity_date?: string
  status: SgqDocumentStatus
  source?: string
  original_url?: string
  interference_categories: SgqInterferenceCategory[]
  active_revision_ref?: string
}

export interface UpdateLineReferenceDocumentInput {
  id: string
  line_id: string
  line_code?: string
  company_id?: string
  interference_categories: SgqInterferenceCategory[]
}

class LineReferenceDocumentsService {
  async getByLineId(lineId: string): Promise<LineReferenceDocument[]> {
    if (!lineId) return []
    try {
      const records = await pb.collection('line_reference_documents').getFullList({
        filter: `line_id = "${lineId}"`,
        sort: 'document_code',
      })
      return records.map(this.mapRecord)
    } catch (err: any) {
      console.error(`Erro ao carregar documentos de referência da linha ${lineId}:`, err)
      return []
    }
  }

  async countByLineId(lineId: string): Promise<number> {
    if (!lineId) return 0
    try {
      const result = await pb.collection('line_reference_documents').getList(1, 1, {
        filter: `line_id = "${lineId}"`,
      })
      return result.totalItems
    } catch {
      return 0
    }
  }

  async create(input: CreateLineReferenceDocumentInput): Promise<LineReferenceDocument> {
    const user = pb.authStore.record
    const payload = {
      line_id: input.line_id,
      company_id: input.company_id || 'CIAFAL',
      document_ref: input.document_ref,
      document_code: input.document_code,
      title: input.title,
      revision: input.revision,
      document_type: input.document_type || '',
      responsible_area: input.responsible_area || '',
      validity_date: input.validity_date || '',
      status: input.status,
      source: input.source || 'SGQ',
      original_url: input.original_url || '',
      interference_categories: input.interference_categories,
      active_revision_ref: input.active_revision_ref || '',
      interpreted_rules: {},
      created_by_user_id: user?.id || '',
      updated_by_user_id: user?.id || '',
    }

    try {
      const record = await pb.collection('line_reference_documents').create(payload)
      const mapped = this.mapRecord(record)

      // Registrar auditoria
      const diff = computeDiff(null, {
        document_code: mapped.document_code,
        title: mapped.title,
        revision: mapped.revision,
        status: mapped.status,
        interference_categories: mapped.interference_categories.join(', '),
      })

      await pcpAuditService.recordLog({
        action: `Vínculo de Documento de Referência: ${mapped.document_code} (${mapped.title})`,
        event_type: 'REFERENCE_DOCUMENT_LINK',
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        company: input.company_id || 'CIAFAL',
        line: input.line_code || input.line_id,
        record_id: mapped.id,
        entity: 'line_reference_documents',
        status: 'Concluída',
        outcome: 'SUCCESS',
        changes: diff,
        details: {
          document_code: mapped.document_code,
          revision: mapped.revision,
          interference_categories: mapped.interference_categories,
        },
      })

      return mapped
    } catch (err: any) {
      await pcpAuditService.recordFailureAttempt({
        operation: `Criar vínculo de documento SGQ ${input.document_code}`,
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        line: input.line_code || input.line_id,
        company: input.company_id || 'CIAFAL',
        errorMessage: err?.message || 'Falha ao persistir documento de referência',
      })
      throw err
    }
  }

  async updateCategories(input: UpdateLineReferenceDocumentInput): Promise<LineReferenceDocument> {
    const user = pb.authStore.record
    const existing = await pb.collection('line_reference_documents').getOne(input.id)
    const oldCategories: SgqInterferenceCategory[] = existing.interference_categories || []

    try {
      const record = await pb.collection('line_reference_documents').update(input.id, {
        interference_categories: input.interference_categories,
        updated_by_user_id: user?.id || '',
      })
      const mapped = this.mapRecord(record)

      // Auditoria Antes x Depois
      const diff = computeDiff(
        { interference_categories: oldCategories.sort().join(', ') },
        { interference_categories: input.interference_categories.sort().join(', ') },
      )

      await pcpAuditService.recordLog({
        action: `Atualização de Interferência do Documento: ${mapped.document_code}`,
        event_type: 'REFERENCE_DOCUMENT_UPDATE',
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        company: input.company_id || 'CIAFAL',
        line: input.line_code || input.line_id,
        record_id: mapped.id,
        entity: 'line_reference_documents',
        status: 'Concluída',
        outcome: 'SUCCESS',
        changes: diff,
        details: {
          old_categories: oldCategories,
          new_categories: input.interference_categories,
        },
      })

      return mapped
    } catch (err: any) {
      await pcpAuditService.recordFailureAttempt({
        operation: `Atualizar categorias do documento ${input.id}`,
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        line: input.line_code || input.line_id,
        company: input.company_id || 'CIAFAL',
        errorMessage: err?.message || 'Falha ao atualizar categorias do documento',
      })
      throw err
    }
  }

  async remove(
    id: string,
    context?: { line_code?: string; line_id?: string; company_id?: string },
  ): Promise<void> {
    try {
      const existing = await pb.collection('line_reference_documents').getOne(id)
      const mapped = this.mapRecord(existing)

      await pb.collection('line_reference_documents').delete(id)

      const diff = computeDiff(
        {
          document_code: mapped.document_code,
          title: mapped.title,
          revision: mapped.revision,
          interference_categories: mapped.interference_categories.join(', '),
        },
        null,
      )

      await pcpAuditService.recordLog({
        action: `Remoção de Vínculo do Documento: ${mapped.document_code} (${mapped.title})`,
        event_type: 'REFERENCE_DOCUMENT_UNLINK',
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        company: context?.company_id || 'CIAFAL',
        line: context?.line_code || context?.line_id || mapped.line_id,
        record_id: id,
        entity: 'line_reference_documents',
        status: 'Concluída',
        outcome: 'SUCCESS',
        changes: diff,
        details: {
          document_code: mapped.document_code,
          title: mapped.title,
        },
      })
    } catch (err: any) {
      await pcpAuditService.recordFailureAttempt({
        operation: `Remover vínculo do documento ${id}`,
        module: 'Hierarquia das Linhas',
        screen: 'Documentos de Referência',
        line: context?.line_code || context?.line_id,
        company: context?.company_id || 'CIAFAL',
        errorMessage: err?.message || 'Falha ao remover documento',
      })
      throw err
    }
  }

  private mapRecord(rec: any): LineReferenceDocument {
    return {
      id: rec.id,
      line_id: rec.line_id,
      company_id: rec.company_id,
      document_ref: rec.document_ref,
      document_code: rec.document_code,
      title: rec.title,
      revision: rec.revision,
      document_type: rec.document_type,
      responsible_area: rec.responsible_area,
      validity_date: rec.validity_date,
      status: rec.status,
      source: rec.source || 'SGQ',
      original_url: rec.original_url,
      interference_categories: Array.isArray(rec.interference_categories)
        ? rec.interference_categories
        : [],
      active_revision_ref: rec.active_revision_ref,
      interpreted_rules: rec.interpreted_rules,
      created_by_user_id: rec.created_by_user_id,
      updated_by_user_id: rec.updated_by_user_id,
      created: rec.created,
      updated: rec.updated,
    }
  }
}

export const lineReferenceDocumentsService = new LineReferenceDocumentsService()
