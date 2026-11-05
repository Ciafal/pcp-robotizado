/**
 * Plano Tarugos — serviço de dados (PocketBase / Skip Cloud)
 *
 * Regras do módulo:
 * - Cadastro controlado no HUB com rastreabilidade de origem (campo `origin`).
 * - Nenhum endpoint SAP inventado: a sincronização SAP não existe nesta etapa.
 * - Sem dados fictícios: indisponibilidade vira "Dados não disponíveis".
 * - Exclusão é lógica (is_active=false); histórico é imutável.
 */

import pb from '@/lib/pocketbase/client'
import { formatNumberPtBr } from '@/lib/number-format'

export interface TarugoAlternative {
  order: number
  material_code: string
  description: string
  supplier_code?: string
  supplier_name?: string
  steel_family?: string
  weight_kg: number
  quantity: number
  length_m: number
  priority: string // '1ª opção' | '2ª opção' | ...
  status: 'Ativo' | 'Inativo'
}

export interface TarugoPlanRecord {
  id: string
  company: string
  center: string
  line: string
  cutting_plan: string
  plan_description?: string
  status: 'Ativo' | 'Inativo'
  main_material_code: string
  main_description?: string
  main_steel_family?: string
  main_supplier_code?: string
  main_supplier_name?: string
  main_dimension_section?: string
  main_length_m: number
  main_length_min_m?: number
  main_length_max_m?: number
  main_weight_kg: number
  alternatives: TarugoAlternative[]
  origin: 'HUB' | 'SAP' | 'Sincronizado SAP/HUB'
  sap_synced_at?: string
  created_by_user_name?: string
  updated_by_user_name?: string
  last_change_summary?: string
  derived_from_plan?: string
  updated: string
  created: string
}

export type TarugoPlan = TarugoPlanRecord
export type TarugoPlanInput = {
  company: string
  center: string
  line: string
  cutting_plan: string
  plan_description?: string
  status: 'Ativo' | 'Inativo'
  main_material_code: string
  main_description?: string
  main_steel_family?: string
  main_supplier_code?: string
  main_supplier_name?: string
  main_dimension_section?: string
  main_length_m: number
  main_length_min_m?: number
  main_length_max_m?: number
  main_weight_kg: number
  alternatives: TarugoAlternative[]
}
export type CreateTarugoPlanInput = TarugoPlanInput
export type TarugoPlanAuditLog = {
  id: string
  acao: string
  detalhes: string
  data_hora: string
  usuario_nome?: string
  usuario_email?: string
  plano_corte: string
  empresa: string
  centro: string
  valores_anteriores?: any
  valores_novos?: any
}

export interface TarugoPlanFilters {
  search?: string
  company?: string
  center?: string
  line?: string
  cuttingPlan?: string
  material?: string
  steelFamily?: string
  supplier?: string
  status?: 'Ativo' | 'Inativo' | 'Todos'
}

export interface TarugoPlanHistoryEntry {
  id: string
  cutting_plan: string
  company: string
  center: string
  line: string
  event_type: string
  event_label: string
  user_name: string
  user_email: string
  previous_state?: Record<string, unknown>
  new_state?: Record<string, unknown>
  details: string
  event_timestamp: string
}

export const TARUGO_EVENT_LABELS: Record<string, string> = {
  PLANO_CRIADO: 'Plano criado',
  PLANO_EDITADO: 'Plano editado',
  PLANO_DUPLICADO: 'Plano duplicado',
  PLANO_ATIVADO: 'Plano ativado',
  PLANO_INATIVADO: 'Plano inativado',
  ALTERNATIVA_INCLUIDA: 'Alternativa incluída',
  ALTERNATIVA_ALTERADA: 'Alternativa alterada',
  ALTERNATIVA_REMOVIDA: 'Alternativa removida',
  SINCRONIZACAO_SAP: 'Sincronização SAP',
}

export interface ValidationError {
  field: string
  message: string
}

const COLLECTION = 'pcp_tarugo_cut_plans'
const HISTORY_COLLECTION = 'pcp_tarugo_plan_history'

function mapRecord(rec: any): TarugoPlanRecord {
  return {
    id: rec.id,
    company: rec.company || '',
    center: rec.center || '',
    line: rec.line || '',
    cutting_plan: rec.cutting_plan || '',
    plan_description: rec.plan_description || '',
    status: rec.status || 'Ativo',
    main_material_code: rec.main_material_code || '',
    main_description: rec.main_description || '',
    main_steel_family: rec.main_steel_family || '',
    main_supplier_code: rec.main_supplier_code || '',
    main_supplier_name: rec.main_supplier_name || '',
    main_dimension_section: rec.main_dimension_section || '',
    main_length_m: Number(rec.main_length_m) || 0,
    main_length_min_m: rec.main_length_min_m != null ? Number(rec.main_length_min_m) : undefined,
    main_length_max_m: rec.main_length_max_m != null ? Number(rec.main_length_max_m) : undefined,
    main_weight_kg: Number(rec.main_weight_kg) || 0,
    alternatives: Array.isArray(rec.alternatives) ? rec.alternatives : [],
    origin: rec.origin || 'HUB',
    sap_synced_at: rec.sap_synced_at || undefined,
    created_by_user_name: rec.created_by_user_name || '',
    updated_by_user_name: rec.updated_by_user_name || '',
    last_change_summary: rec.last_change_summary || '',
    derived_from_plan: rec.derived_from_plan || '',
    updated: rec.updated,
    created: rec.created,
  }
}

/** Formatações pt-BR/ABNT usadas na listagem e detalhe */
export const tarugoFormatters = {
  kg: (v: number | null | undefined) =>
    v == null || isNaN(v) ? 'Dados não disponíveis' : `${formatNumberPtBr(v, 0)} kg`,
  meters: (v: number | null | undefined) =>
    v == null || isNaN(v) ? 'Dados não disponíveis' : `${formatNumberPtBr(v, 2)} m`,
  section: (v: string | null | undefined) => (v && v.trim() ? v : 'Dados não disponíveis'),
  dateTime: (iso: string | null | undefined) => {
    if (!iso) return 'Dados não disponíveis'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'Dados não disponíveis'
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
  },
}

class TarugoPlansService {
  /**
   * Lista planos com filtros combinados.
   */
  async listPlans(filters?: TarugoPlanFilters): Promise<TarugoPlanRecord[]> {
    const clauses: string[] = []
    if (filters?.company) clauses.push(`company="${filters.company.replace(/"/g, '')}"`)
    if (filters?.center) clauses.push(`center="${filters.center.replace(/"/g, '')}"`)
    if (filters?.line) clauses.push(`line="${filters.line.replace(/"/g, '')}"`)
    if (filters?.cuttingPlan)
      clauses.push(`cutting_plan="${filters.cuttingPlan.replace(/"/g, '')}"`)
    if (filters?.material)
      clauses.push(`main_material_code="${filters.material.replace(/"/g, '')}"`)
    if (filters?.steelFamily)
      clauses.push(`main_steel_family="${filters.steelFamily.replace(/"/g, '')}"`)
    if (filters?.supplier)
      clauses.push(`main_supplier_name="${filters.supplier.replace(/"/g, '')}"`)
    if (filters?.status && filters.status !== 'Todos') {
      clauses.push(`status="${filters.status}"`)
    }

    let records: any[] = []
    try {
      if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim().replace(/"/g, '')
        const searchClause = `(cutting_plan~"${q}" || main_material_code~"${q}" || main_description~"${q}" || main_supplier_name~"${q}" || main_steel_family~"${q}")`
        const baseFilter = clauses.length ? clauses.join(' && ') : ''
        const finalFilter = baseFilter ? `${searchClause} && (${baseFilter})` : searchClause
        records = await pb.collection(COLLECTION).getFullList({
          filter: finalFilter,
          sort: '-created',
        })
      } else {
        const finalFilter = clauses.length ? clauses.join(' && ') : undefined
        records = await pb.collection(COLLECTION).getFullList({
          filter: finalFilter,
          sort: '-created',
        })
      }
    } catch (err) {
      console.warn(`[tarugoPlansService] Falha ao consultar ${COLLECTION}:`, err)
      return []
    }

    return records.map(mapRecord)
  }

  /**
   * Consulta única para o motor de plano de corte (consumo futuro).
   * Não altera algoritmos existentes.
   */
  async getPlanByKey(params: {
    company: string
    center: string
    line: string
    cutting_plan: string
  }): Promise<TarugoPlanRecord | null> {
    const esc = (v: string) => String(v).replace(/"/g, '')
    try {
      const records = await pb.collection(COLLECTION).getFullList({
        filter: `company="${esc(params.company)}" && center="${esc(params.center)}" && line="${esc(
          params.line,
        )}" && cutting_plan="${esc(params.cutting_plan)}"`,
      })
      return records.length ? mapRecord(records[0]) : null
    } catch (err) {
      console.warn(`[tarugoPlansService] Falha ao consultar ${COLLECTION} getPlanByKey:`, err)
      return null
    }
  }

  /**
   * Interface de consulta para o motor (contrato estável):
   * centro/linha/família/material/peso padrão + alternativas permitidas por prioridade.
   */
  async getCuttingEngineOptions(params: { company: string; center: string; line: string }): Promise<
    Array<{
      cutting_plan: string
      steel_family: string
      material_code: string
      weight_kg: number
      length_m: number
      alternatives: TarugoAlternative[]
    }>
  > {
    const esc = (v: string) => String(v).replace(/"/g, '')
    const records = await pb.collection(COLLECTION).getFullList({
      filter: `company="${esc(params.company)}" && center="${esc(params.center)}" && line="${esc(
        params.line,
      )}" && status="Ativo"`,
    })
    return records.map((r: any) => {
      const m = mapRecord(r)
      return {
        cutting_plan: m.cutting_plan,
        steel_family: m.main_steel_family || '',
        material_code: m.main_material_code,
        weight_kg: m.main_weight_kg,
        length_m: m.main_length_m,
        alternatives: (m.alternatives || []).filter((a) => a.status === 'Ativo'),
      }
    })
  }

  /**
   * Validações que BLOQUEIAM salvar; retornam erros por campo.
   */
  validatePlan(input: {
    company: string
    center: string
    line: string
    cutting_plan: string
    main_material_code: string
    main_length_m: number
    main_weight_kg: number
    alternatives: TarugoAlternative[]
    steelFamily?: string
  }): ValidationError[] {
    const errors: ValidationError[] = []
    if (!input.company || !input.company.trim())
      errors.push({ field: 'company', message: 'Informe a Empresa.' })
    if (!input.center || !input.center.trim())
      errors.push({ field: 'center', message: 'Informe o Centro.' })
    if (!input.line || !input.line.trim())
      errors.push({ field: 'line', message: 'Informe a Linha.' })
    if (!input.cutting_plan || !input.cutting_plan.trim())
      errors.push({ field: 'cutting_plan', message: 'Informe o Plano de Corte.' })
    if (!input.main_material_code || !input.main_material_code.trim())
      errors.push({ field: 'main_material_code', message: 'Informe o Código do Material SAP.' })
    if (input.main_length_m == null || isNaN(input.main_length_m) || input.main_length_m <= 0)
      errors.push({ field: 'main_length_m', message: 'Comprimento deve ser maior que zero.' })
    if (input.main_weight_kg == null || isNaN(input.main_weight_kg) || input.main_weight_kg <= 0)
      errors.push({ field: 'main_weight_kg', message: 'Peso do tarugo deve ser maior que zero.' })

    input.alternatives.forEach((alt, idx) => {
      const n = idx + 1
      if (alt.quantity == null || isNaN(alt.quantity) || alt.quantity < 1)
        errors.push({
          field: `alt_quantity_${idx}`,
          message: `Alternativa ${n}: quantidade de tarugos deve ser no mínimo 1.`,
        })
      if (alt.weight_kg == null || isNaN(alt.weight_kg) || alt.weight_kg <= 0)
        errors.push({
          field: `alt_weight_${idx}`,
          message: `Alternativa ${n}: peso deve ser maior que zero.`,
        })
      if (!alt.material_code || !String(alt.material_code).trim())
        errors.push({
          field: `alt_material_${idx}`,
          message: `Alternativa ${n}: informe o Código Material SAP.`,
        })
    })

    // Mesmo material alternativo duplicado sem justificativa
    const seen = new Map<string, number>()
    input.alternatives.forEach((alt, idx) => {
      const code = String(alt.material_code || '').trim()
      if (!code) return
      if (seen.has(code)) {
        errors.push({
          field: `alt_material_${idx}`,
          message: `Material ${code} duplicado nas alternativas. Justifique ou remova a duplicidade.`,
        })
      } else {
        seen.set(code, idx)
      }
    })

    return errors
  }

  /**
   * Verifica duplicidade real de Empresa+Centro+Linha+Plano de Corte.
   * excludeId permite edição (verifica só contra os outros registros).
   */
  async checkDuplicateKey(
    key: { company: string; center: string; line: string; cutting_plan: string },
    excludeId?: string,
  ): Promise<boolean> {
    const esc = (v: string) => String(v).replace(/"/g, '')
    const filter = `company="${esc(key.company)}" && center="${esc(key.center)}" && line="${esc(
      key.line,
    )}" && cutting_plan="${esc(key.cutting_plan)}"`
    const records = await pb.collection(COLLECTION).getFullList({ filter })
    return records.some((r: any) => r.id !== excludeId)
  }

  private async recordHistory(params: {
    planId: string
    eventType: string
    previousState?: Record<string, unknown> | null
    newState?: Record<string, unknown> | null
    details?: string
    company?: string
    center?: string
    line?: string
    cuttingPlan?: string
  }) {
    const user = pb.authStore.record
    try {
      await pb.collection(HISTORY_COLLECTION).create({
        plan_record_id: params.planId,
        cutting_plan: params.cuttingPlan || '',
        company: params.company || '',
        center: params.center || '',
        line: params.line || '',
        event_type: params.eventType,
        user_id: user?.id || '',
        user_name: user?.name || user?.email || 'PCP Robotizado',
        user_email: user?.email || '',
        previous_state: params.previousState ?? null,
        new_state: params.newState ?? null,
        details: params.details || '',
        event_timestamp: new Date().toISOString(),
      })
    } catch (err) {
      console.warn('[TarugoPlansService] Falha ao registrar histórico:', err)
    }
  }

  /**
   * Cria um plano. Retorna o plano criado.
   */
  async createPlan(
    payload: {
      company: string
      center: string
      line: string
      cutting_plan: string
      plan_description?: string
      status: 'Ativo' | 'Inativo'
      main_material_code: string
      main_description?: string
      main_steel_family?: string
      main_supplier_code?: string
      main_supplier_name?: string
      main_dimension_section?: string
      main_length_m: number
      main_length_min_m?: number
      main_length_max_m?: number
      main_weight_kg: number
      alternatives: TarugoAlternative[]
    },
    origin: 'HUB' | 'SAP' | 'Sincronizado SAP/HUB' = 'HUB',
  ): Promise<TarugoPlanRecord> {
    const user = pb.authStore.record
    const rec = await pb.collection(COLLECTION).create({
      ...payload,
      origin,
      created_by_user_id: user?.id || '',
      created_by_user_name: user?.name || user?.email || '',
      updated_by_user_id: user?.id || '',
      updated_by_user_name: user?.name || user?.email || '',
      last_change_summary: 'Criação do plano',
    })
    await this.recordHistory({
      planId: rec.id,
      eventType: 'PLANO_CRIADO',
      newState: payload as Record<string, unknown>,
      details: 'Plano criado',
      company: payload.company,
      center: payload.center,
      line: payload.line,
      cuttingPlan: payload.cutting_plan,
    })
    return mapRecord(rec)
  }

  /**
   * Atualiza um plano existente. Registra histórico com valores anteriores e novos.
   */
  async updatePlan(
    id: string,
    previous: TarugoPlanRecord,
    payload: {
      company: string
      center: string
      line: string
      cutting_plan: string
      plan_description?: string
      status: 'Ativo' | 'Inativo'
      main_material_code: string
      main_description?: string
      main_steel_family?: string
      main_supplier_code?: string
      main_supplier_name?: string
      main_dimension_section?: string
      main_length_m: number
      main_length_min_m?: number
      main_length_max_m?: number
      main_weight_kg: number
      alternatives: TarugoAlternative[]
    },
  ): Promise<TarugoPlanRecord> {
    const user = pb.authStore.record

    // Alternativas: eventos granulares de inclusão/alteração/remoção
    const prevAlts = previous.alternatives || []
    const newAlts = payload.alternatives || []
    const altKeyOf = (a: TarugoAlternative) => `${a.order}|${a.material_code}`
    const prevMap = new Map(prevAlts.map((a) => [altKeyOf(a), a]))

    const changes: string[] = []
    const fieldDefs: Array<[keyof typeof payload, string]> = [
      ['company', 'Empresa'],
      ['center', 'Centro'],
      ['line', 'Linha'],
      ['cutting_plan', 'Plano de Corte'],
      ['plan_description', 'Descrição'],
      ['status', 'Status'],
      ['main_material_code', 'Código do Material SAP'],
      ['main_description', 'Descrição'],
      ['main_steel_family', 'Família/Aço'],
      ['main_supplier_code', 'Código Fornecedor'],
      ['main_supplier_name', 'Fornecedor'],
      ['main_dimension_section', 'Seção/Dimensão'],
      ['main_length_m', 'Comprimento (m)'],
      ['main_length_min_m', 'Comprimento mín. (m)'],
      ['main_length_max_m', 'Comprimento máx. (m)'],
      ['main_weight_kg', 'Peso padrão (kg)'],
    ]
    for (const [field, label] of fieldDefs) {
      const before = (previous as any)[field]
      const after = (payload as any)[field]
      if (String(before ?? '') !== String(after ?? '')) {
        changes.push(`${label}: ${String(before ?? '—')} → ${String(after ?? '—')}`)
      }
    }

    newAlts.forEach((a) => {
      const prev = prevMap.get(altKeyOf(a))
      if (!prev) {
        changes.push(`Alternativa incluída: ordem ${a.order} (${a.material_code})`)
      } else if (
        prev.weight_kg !== a.weight_kg ||
        prev.quantity !== a.quantity ||
        prev.length_m !== a.length_m ||
        prev.priority !== a.priority ||
        prev.status !== a.status
      ) {
        changes.push(`Alternativa alterada: ordem ${a.order} (${a.material_code})`)
      }
    })
    prevAlts.forEach((a) => {
      if (!newAlts.some((n) => altKeyOf(n) === altKeyOf(a))) {
        changes.push(`Alternativa removida: ordem ${a.order} (${a.material_code})`)
      }
    })

    const rec = await pb.collection(COLLECTION).update(id, {
      ...payload,
      updated_by_user_id: user?.id || '',
      updated_by_user_name: user?.name || user?.email || '',
      last_change_summary: changes.length ? changes.join('; ') : 'Alteração sem diferenças',
    })

    // Histórico
    await this.recordHistory({
      planId: id,
      eventType: 'PLANO_EDITADO',
      previousState: previous as unknown as Record<string, unknown>,
      newState: payload as unknown as Record<string, unknown>,
      details: changes.join('; ') || 'Sem diferenças',
      company: payload.company,
      center: payload.center,
      line: payload.line,
      cuttingPlan: payload.cutting_plan,
    })

    return mapRecord(rec)
  }

  /** Duplica um plano exigindo NOVO código de Plano de Corte; original intacto. */
  async duplicatePlan(source: TarugoPlanRecord, newCuttingPlan: string): Promise<TarugoPlanRecord> {
    const user = pb.authStore.record
    const payload = {
      company: source.company,
      center: source.center,
      line: source.line,
      cutting_plan: newCuttingPlan.trim(),
      plan_description: source.plan_description || '',
      status: source.status,
      main_material_code: source.main_material_code,
      main_description: source.main_description || '',
      main_steel_family: source.main_steel_family || '',
      main_supplier_code: source.main_supplier_code || '',
      main_supplier_name: source.main_supplier_name || '',
      main_dimension_section: source.main_dimension_section || '',
      main_length_m: source.main_length_m,
      main_length_min_m: source.main_length_min_m,
      main_length_max_m: source.main_length_max_m,
      main_weight_kg: source.main_weight_kg,
      alternatives: (source.alternatives || []).map((a) => ({ ...a })),
      origin: source.origin,
    }

    const dup = await this.checkDuplicateKey({
      company: payload.company,
      center: payload.center,
      line: payload.line,
      cutting_plan: payload.cutting_plan,
    })
    if (dup) {
      throw new Error('Já existe um plano com este código para a mesma Empresa/Centro/Linha.')
    }

    const rec = await pb.collection(COLLECTION).create({
      ...payload,
      derived_from_plan: source.cutting_plan,
      created_by_user_id: user?.id || '',
      created_by_user_name: user?.name || user?.email || '',
      updated_by_user_id: user?.id || '',
      updated_by_user_name: user?.name || user?.email || '',
      last_change_summary: `Derivado do plano: ${source.cutting_plan}`,
    })

    await this.recordHistory({
      planId: rec.id,
      eventType: 'PLANO_DUPLICADO',
      newState: payload as Record<string, unknown>,
      details: `Derivado do plano: ${source.cutting_plan}`,
      company: payload.company,
      center: payload.center,
      line: payload.line,
      cuttingPlan: payload.cutting_plan,
    })

    return mapRecord(rec)
  }

  /** Ativa ou inativa um plano (exclusão é lógica). */
  async setPlanStatus(id: string, status: 'Ativo' | 'Inativo'): Promise<TarugoPlanRecord> {
    const user = pb.authStore.record
    const rec = await pb.collection(COLLECTION).update(id, {
      status,
      updated_by_user_id: user?.id || '',
      updated_by_user_name: user?.name || user?.email || '',
      last_change_summary: status === 'Ativo' ? 'Plano ativado' : 'Plano inativado',
    })
    await this.recordHistory({
      planId: id,
      eventType: status === 'Ativo' ? 'PLANO_ATIVADO' : 'PLANO_INATIVADO',
      newState: { status },
      details: status === 'Ativo' ? 'Plano ativado' : 'Plano inativado',
      company: rec.company,
      center: rec.center,
      line: rec.line,
      cuttingPlan: rec.cutting_plan,
    })
    return mapRecord(rec)
  }

  /**
   * Exclusão lógica: mantém o registro, marca como Inativo e registra histórico.
   * DELETE real é bloqueado pela regra da collection.
   */
  async softDeletePlan(plan: TarugoPlanRecord): Promise<void> {
    await this.setPlanStatus(plan.id, 'Inativo')
    await this.recordHistory({
      planId: plan.id,
      eventType: 'PLANO_INATIVADO',
      newState: { status: 'Inativo', deleted: true },
      details: 'Exclusão lógica — plano inativado, histórico preservado',
      company: plan.company,
      center: plan.center,
      line: plan.line,
      cuttingPlan: plan.cutting_plan,
    })
  }

  /** Histórico do plano, mais recente primeiro. */
  async listHistory(planId: string): Promise<TarugoPlanHistoryEntry[]> {
    try {
      const records = await pb
        .collection(HISTORY_COLLECTION)
        .getFullList({ filter: `plan_record_id="${planId.replace(/"/g, '')}"`, sort: '-created' })
      return records.map((r: any) => ({
        id: r.id,
        cutting_plan: r.cutting_plan || '',
        company: r.company || '',
        center: r.center || '',
        line: r.line || '',
        event_type: r.event_type,
        event_label: TARUGO_EVENT_LABELS[r.event_type] || r.event_type,
        user_name: r.user_name || '',
        user_email: r.user_email || '',
        previous_state: r.previous_state || undefined,
        new_state: r.new_state || undefined,
        details: r.details || '',
        event_timestamp: r.event_timestamp || r.created,
      }))
    } catch (err) {
      console.warn(`[tarugoPlansService] Falha ao consultar ${HISTORY_COLLECTION}:`, err)
      return []
    }
  }

  async getPlanAuditLogs(planId: string): Promise<TarugoPlanAuditLog[]> {
    const history = await this.listHistory(planId)
    return history.map((h) => ({
      id: h.id,
      acao: h.event_type,
      detalhes: h.details || h.event_label,
      data_hora: h.event_timestamp,
      usuario_nome: h.user_name,
      usuario_email: h.user_email,
      plano_corte: h.cutting_plan,
      empresa: h.company,
      centro: h.center,
      valores_anteriores: h.previous_state,
      valores_novos: h.new_state,
    }))
  }
}

export const tarugoPlansService = new TarugoPlansService()
