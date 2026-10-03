/**
 * Serviço de Gerenciamento de Códigos Modelos Padrão (Validação SAP)
 * Padrão Corporativo CIAFAL - PCP Robotizado
 * Suporta: CRUD, Auditoria Append-Only em pcp_audit_logs, Verificação de Duplicidade,
 * Sugestão Automática baseada em Tipo de Material, Empresa, Centro e Linha,
 * e Consulta Integrada de Materiais SAP/FCA.
 */

import { pb } from '@/lib/pocketbase/client'
import { SapStandardModelRecord, SapStandardModelInput } from '@/types/sap-validation'

export interface MaterialSuggestionItem {
  code: string
  description: string
  material_type?: string
}

class SapStandardModelsService {
  /**
   * Registra log de auditoria append-only em pcp_audit_logs
   */
  private async logAudit(params: {
    action: 'CRIAR_MODELO_PADRAO' | 'EDITAR_MODELO_PADRAO' | 'ALTERAR_STATUS_MODELO_PADRAO'
    recordId: string
    modelCode: string
    previousData?: Record<string, unknown> | null
    newData?: Record<string, unknown> | null
    reason: string
  }): Promise<void> {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'admin-user',
        user_name: user?.name || user?.email || 'Controle de Produção',
        user_email: user?.email || 'pcp@ciafal.com.br',
        user_role: (user?.role as string) || 'PCP_ADMIN',
        event_type: 'RULE_ACTION',
        action: params.action,
        resource: 'SAP_STANDARD_MODELS',
        record_id: params.recordId || params.modelCode,
        status: 'Concluído',
        outcome: 'SUCCESS',
        module: 'CADASTROS',
        screen: 'Validação de Cadastro SAP',
        company: 'CIAFAL',
        reason: params.reason,
        justification: params.reason,
        details: {
          timestamp: new Date().toISOString(),
          model_code: params.modelCode,
          previous_data: params.previousData || null,
          new_data: params.newData || null,
        },
      })
    } catch (err) {
      console.warn('[sapStandardModelsService] Falha ao registrar em pcp_audit_logs:', err)
    }
  }

  /**
   * Lista todos os modelos cadastrados com ordenação por criação decrescente
   */
  async listModels(): Promise<SapStandardModelRecord[]> {
    try {
      const records = await pb
        .collection('sap_standard_models')
        .getFullList<SapStandardModelRecord>({
          sort: '-created',
          requestKey: null,
        })
      return records
    } catch (err) {
      console.warn('[sapStandardModelsService] Erro ao listar modelos:', err)
      return []
    }
  }

  /**
   * Verifica se já existe um modelo cadastrado com a exata combinação:
   * Código + Tipo de Material + Linha + Empresa + Centro
   */
  async checkDuplicate(params: {
    material_code: string
    material_type: string
    line_id: string
    company_id: string
    center: string
    excludeId?: string
  }): Promise<SapStandardModelRecord | null> {
    try {
      const codeClean = params.material_code.trim().toUpperCase()
      const typeClean = params.material_type.trim().toUpperCase()
      const lineClean = params.line_id.trim()
      const compClean = params.company_id.trim()
      const centerClean = params.center.trim().toUpperCase()

      const filter = `material_code = "${codeClean}" && material_type = "${typeClean}" && line_id = "${lineClean}" && company_id = "${compClean}" && center = "${centerClean}"`
      const records = await pb
        .collection('sap_standard_models')
        .getFullList<SapStandardModelRecord>({
          filter,
          requestKey: null,
        })

      const match = records.find((r) => !params.excludeId || r.id !== params.excludeId)
      return match || null
    } catch {
      return null
    }
  }

  /**
   * Cadastra novo código modelo padrão
   */
  async createModel(data: SapStandardModelInput): Promise<{
    success: boolean
    record?: SapStandardModelRecord
    error?: string
  }> {
    try {
      const codeClean = data.material_code.trim().toUpperCase()
      const typeClean = data.material_type.trim().toUpperCase()
      const lineClean = data.line_id.trim()
      const compClean = data.company_id.trim()
      const centerClean = data.center.trim().toUpperCase()

      // Validação de duplicidade exata
      const existing = await this.checkDuplicate({
        material_code: codeClean,
        material_type: typeClean,
        line_id: lineClean,
        company_id: compClean,
        center: centerClean,
      })

      if (existing) {
        return {
          success: false,
          error:
            'Este Código Modelo já está cadastrado para esta combinação de Tipo de Material, Linha, Empresa e Centro.',
        }
      }

      const user = pb.authStore.record
      const payload = {
        material_code: codeClean,
        description: data.description?.trim() || '',
        material_type: typeClean,
        line_id: lineClean,
        line_code: data.line_code || '',
        company_id: compClean,
        company_code: data.company_code || '',
        company_name: data.company_name || '',
        center: centerClean,
        status: data.status || 'ATIVO',
        created_by_user_id: user?.id || 'admin-user',
        created_by_user_name: user?.name || user?.email || 'Controle de Produção',
        notes: data.notes?.trim() || '',
      }

      const created = await pb
        .collection('sap_standard_models')
        .create<SapStandardModelRecord>(payload)

      await this.logAudit({
        action: 'CRIAR_MODELO_PADRAO',
        recordId: created.id,
        modelCode: created.material_code,
        previousData: null,
        newData: payload,
        reason: `Código Modelo ${created.material_code} cadastrado no PCP`,
      })

      return { success: true, record: created }
    } catch (err: any) {
      console.error('[sapStandardModelsService] Erro ao cadastrar modelo:', err)
      return {
        success: false,
        error: err?.message || 'Falha ao salvar código modelo.',
      }
    }
  }

  /**
   * Atualiza código modelo padrão existente
   */
  async updateModel(
    id: string,
    data: Partial<SapStandardModelInput>,
  ): Promise<{
    success: boolean
    record?: SapStandardModelRecord
    error?: string
  }> {
    try {
      const existing = await pb.collection('sap_standard_models').getOne<SapStandardModelRecord>(id)
      if (!existing) {
        return { success: false, error: 'Código modelo não encontrado.' }
      }

      const codeClean = (data.material_code || existing.material_code).trim().toUpperCase()
      const typeClean = (data.material_type || existing.material_type).trim().toUpperCase()
      const lineClean = (data.line_id || existing.line_id).trim()
      const compClean = (data.company_id || existing.company_id).trim()
      const centerClean = (data.center || existing.center).trim().toUpperCase()

      // Verificar duplicidade com outro registro existente
      const duplicate = await this.checkDuplicate({
        material_code: codeClean,
        material_type: typeClean,
        line_id: lineClean,
        company_id: compClean,
        center: centerClean,
        excludeId: id,
      })

      if (duplicate) {
        return {
          success: false,
          error:
            'Este Código Modelo já está cadastrado para esta combinação de Tipo de Material, Linha, Empresa e Centro.',
        }
      }

      const user = pb.authStore.record
      const payload: Record<string, unknown> = {
        material_code: codeClean,
        description:
          data.description !== undefined ? data.description.trim() : existing.description,
        material_type: typeClean,
        line_id: lineClean,
        line_code: data.line_code !== undefined ? data.line_code : existing.line_code,
        company_id: compClean,
        company_code: data.company_code !== undefined ? data.company_code : existing.company_code,
        company_name: data.company_name !== undefined ? data.company_name : existing.company_name,
        center: centerClean,
        updated_by_user_id: user?.id || 'admin-user',
        updated_by_user_name: user?.name || user?.email || 'Controle de Produção',
      }
      if (data.status) payload.status = data.status
      if (data.notes !== undefined) payload.notes = data.notes.trim()

      const updated = await pb
        .collection('sap_standard_models')
        .update<SapStandardModelRecord>(id, payload)

      await this.logAudit({
        action: 'EDITAR_MODELO_PADRAO',
        recordId: id,
        modelCode: updated.material_code,
        previousData: existing as unknown as Record<string, unknown>,
        newData: payload,
        reason: `Código Modelo ${updated.material_code} atualizado no PCP`,
      })

      return { success: true, record: updated }
    } catch (err: any) {
      console.error('[sapStandardModelsService] Erro ao atualizar modelo:', err)
      return {
        success: false,
        error: err?.message || 'Falha ao atualizar código modelo.',
      }
    }
  }

  /**
   * Altera status (Ativar/Inativar)
   */
  async toggleStatus(
    id: string,
    newStatus: 'ATIVO' | 'INATIVO',
  ): Promise<{
    success: boolean
    record?: SapStandardModelRecord
    error?: string
  }> {
    try {
      const existing = await pb.collection('sap_standard_models').getOne<SapStandardModelRecord>(id)
      if (!existing) {
        return { success: false, error: 'Código modelo não encontrado.' }
      }

      const user = pb.authStore.record
      const updated = await pb
        .collection('sap_standard_models')
        .update<SapStandardModelRecord>(id, {
          status: newStatus,
          updated_by_user_id: user?.id || 'admin-user',
          updated_by_user_name: user?.name || user?.email || 'Controle de Produção',
        })

      await this.logAudit({
        action: 'ALTERAR_STATUS_MODELO_PADRAO',
        recordId: id,
        modelCode: updated.material_code,
        previousData: { status: existing.status },
        newData: { status: newStatus },
        reason: `Código Modelo ${updated.material_code} ${newStatus === 'ATIVO' ? 'ativado' : 'inativado'} com sucesso`,
      })

      return { success: true, record: updated }
    } catch (err: any) {
      console.error('[sapStandardModelsService] Erro ao alterar status:', err)
      return {
        success: false,
        error: err?.message || 'Falha ao alterar status.',
      }
    }
  }

  /**
   * Sugestão Automática de Código Modelo:
   * Prioriza coincidência de: 1) Tipo de Material, 2) Empresa, 3) Centro, 4) Linha
   * Retorna apenas modelos com status ATIVO.
   */
  async findSuggestedModels(params: {
    material_type?: string
    company_id?: string
    company_code?: string
    center?: string
    line_id?: string
    line_code?: string
  }): Promise<SapStandardModelRecord[]> {
    try {
      const activeModels = await pb
        .collection('sap_standard_models')
        .getFullList<SapStandardModelRecord>({
          filter: 'status = "ATIVO"',
          requestKey: null,
        })

      if (!activeModels.length) return []

      const matType = (params.material_type || '').trim().toUpperCase()
      const compId = (params.company_id || '').trim()
      const compCode = (params.company_code || '').trim().toUpperCase()
      const center = (params.center || '').trim().toUpperCase()
      const lineId = (params.line_id || '').trim()
      const lineCode = (params.line_code || '').trim().toUpperCase()

      // Calcular pontuação de correspondência:
      // Tipo Material: 8 pontos
      // Empresa: 4 pontos
      // Centro: 2 pontos
      // Linha: 1 ponto
      const scored = activeModels
        .map((model) => {
          let score = 0
          if (matType && model.material_type.toUpperCase() === matType) score += 8
          if (
            (compId && model.company_id === compId) ||
            (compCode && (model.company_code || '').toUpperCase() === compCode)
          ) {
            score += 4
          }
          if (center && model.center.toUpperCase() === center) score += 2
          if (
            (lineId && model.line_id === lineId) ||
            (lineCode && (model.line_code || '').toUpperCase() === lineCode)
          ) {
            score += 1
          }
          return { model, score }
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)

      return scored.map((s) => s.model)
    } catch {
      return []
    }
  }

  /**
   * Busca sugestões de materiais na base cadastrada e no catálogo de linhas
   * Não inventa materiais fictícios.
   */
  async searchMaterialsCatalog(query: string): Promise<MaterialSuggestionItem[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const results: MaterialSuggestionItem[] = []
    const seenCodes = new Set<string>()

    // 1. Modelos padrão cadastrados
    try {
      const models = await pb
        .collection('sap_standard_models')
        .getFullList<SapStandardModelRecord>({
          filter: `material_code ~ "${q}" || description ~ "${q}"`,
          requestKey: null,
        })

      for (const m of models) {
        const c = m.material_code.toUpperCase()
        if (!seenCodes.has(c)) {
          seenCodes.add(c)
          results.push({
            code: c,
            description: m.description || c,
            material_type: m.material_type,
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // 2. Materiais homologados em line_reference_documents / production_lines / etc
    try {
      const rawRecords = await pb.collection('line_reference_documents').getList(1, 20, {
        filter: `material_code ~ "${q}" || material_description ~ "${q}"`,
        requestKey: null,
      })
      for (const r of rawRecords.items as any[]) {
        const c = (r.material_code || '').trim().toUpperCase()
        if (c && !seenCodes.has(c)) {
          seenCodes.add(c)
          results.push({
            code: c,
            description: r.material_description || c,
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    return results
  }
}

export const sapStandardModelsService = new SapStandardModelsService()
export default sapStandardModelsService
