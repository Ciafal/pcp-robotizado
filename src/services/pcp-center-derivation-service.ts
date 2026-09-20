/**
 * Serviço de Derivação de Centros de Produção (HUB CIAFAL)
 * Gerencia persistência em `pcp_center_derivations`, validações de negócio e auditoria
 */

import pb from '@/lib/pocketbase/client'
import {
  CenterDerivationRule,
  CenterDerivationAuditEntry,
  DerivationStatus,
} from '@/types/center-derivation'
import { pcpAuditService } from '@/services/pcp-audit-service'

// Armazenamento em memória caso o backend ou mock precise de fallback temporário
let inMemoryDerivations: CenterDerivationRule[] = []

export class CenterDerivationService {
  /**
   * Formata data para DD/MM/AAAA
   */
  formatDatePtBr(dateStr?: string): string {
    if (!dateStr) return '-'
    // Se já estiver em DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr
    try {
      const parts = dateStr.split('T')[0].split('-')
      if (parts.length === 3) {
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`
      }
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    } catch {
      return dateStr
    }
  }

  /**
   * Converte data DD/MM/AAAA para formato ISO/Date YYYY-MM-DD
   */
  parsePtBrToIsoDate(dateStr?: string): string | undefined {
    if (!dateStr) return undefined
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0]
    const parts = dateStr.trim().split('/')
    if (parts.length === 3) {
      const [day, month, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return dateStr
  }

  /**
   * Compara duas datas em DD/MM/AAAA ou YYYY-MM-DD.
   * Retorna true se dataFim for menor que dataInicio.
   */
  isEndDateBeforeStartDate(startDateStr: string, endDateStr?: string): boolean {
    if (!endDateStr) return false
    const startIso = this.parsePtBrToIsoDate(startDateStr)
    const endIso = this.parsePtBrToIsoDate(endDateStr)
    if (!startIso || !endIso) return false
    return endIso < startIso
  }

  /**
   * Valida regras de negócio estritas:
   * 1. Autorrelacionamento: Centro A -> Centro A
   * 2. Relações circulares: A -> B -> A ou A -> B -> C -> A
   * 3. Duplicidade: mesma combinação (Centro atual + Centro origem + Grupo de Mercadorias + período)
   */
  async validateDerivationRule(
    currentCenterCode: string,
    rule: CenterDerivationRule,
    existingRulesForCenter: CenterDerivationRule[] = [],
  ): Promise<{ isValid: boolean; error?: string }> {
    const curCode = currentCenterCode.trim().toUpperCase()
    const srcCode = rule.source_center_code.trim().toUpperCase()

    // 1. Autorrelacionamento (Centro A -> Centro A)
    if (curCode === srcCode) {
      return {
        isValid: false,
        error: 'O Centro de destino não pode ser utilizado como seu próprio Centro de origem.',
      }
    }

    // 2. Data fim anterior à data início
    if (this.isEndDateBeforeStartDate(rule.start_date, rule.end_date)) {
      return {
        isValid: false,
        error: 'A Data de Término não pode ser anterior à Data de Início.',
      }
    }

    // 3. Relações circulares (A->B, B->A ou A->B->C->A)
    const circular = await this.detectCircularDependency(curCode, srcCode, rule.id)
    if (circular) {
      return {
        isValid: false,
        error: 'Esta configuração gera uma relação circular entre Centros e não pode ser salva.',
      }
    }

    // 4. Duplicidade (mesma combinação Centro atual + Centro origem + Grupo de Mercadorias + período)
    const ruleStart = this.parsePtBrToIsoDate(rule.start_date)
    const ruleEnd = this.parsePtBrToIsoDate(rule.end_date) || '9999-12-31'
    const ruleMatkls = (rule.matkl_groups || []).map((m) => m.matkl.trim().toUpperCase())

    // Obter todas as regras existentes para este centro
    const activeExisting = existingRulesForCenter.filter((r) => !r.deleted && r.id !== rule.id)

    for (const ex of activeExisting) {
      if (ex.source_center_code.trim().toUpperCase() === srcCode) {
        const exStart = this.parsePtBrToIsoDate(ex.start_date)
        const exEnd = this.parsePtBrToIsoDate(ex.end_date) || '9999-12-31'

        // Checar sobreposição de período
        const periodsOverlap = ruleStart && exStart && !(ruleEnd < exStart || ruleStart > exEnd)

        if (periodsOverlap) {
          // Checar se compartilha algum MATKL
          const exMatkls = (ex.matkl_groups || []).map((m) => m.matkl.trim().toUpperCase())
          const sharedMatkl = ruleMatkls.some((m) => exMatkls.includes(m))
          if (sharedMatkl) {
            return {
              isValid: false,
              error: 'Já existe uma derivação cadastrada para esta combinação.',
            }
          }
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Detecta se criar uma aresta `centerCode` -> `sourceCenterCode` cria ciclo na rede de derivações
   * Ciclo ocorre se `sourceCenterCode` já deriva (direta ou indiretamente) de `centerCode`.
   */
  async detectCircularDependency(
    centerCode: string,
    sourceCenterCode: string,
    currentRuleId?: string,
  ): Promise<boolean> {
    const cur = centerCode.trim().toUpperCase()
    const src = sourceCenterCode.trim().toUpperCase()

    if (cur === src) return true

    // Carregar todas as regras ativas de derivação para montar o grafo
    let allRules: CenterDerivationRule[] = []
    try {
      const records = await pb.collection('pcp_center_derivations').getFullList({
        filter: 'deleted = false',
      })
      allRules = records.map((r: any) => ({
        id: r.id,
        center_code: (r.center_code || '').trim().toUpperCase(),
        source_center_code: (r.source_center_code || '').trim().toUpperCase(),
        start_date: r.start_date,
        end_date: r.end_date,
        status: r.status,
        matkl_groups: r.matkl_groups || [],
      }))
    } catch (_) {
      allRules = inMemoryDerivations.filter((r) => !r.deleted)
    }

    // Filtrar a regra atual sendo editada para evitar falso positivo nela mesma
    if (currentRuleId) {
      allRules = allRules.filter((r) => r.id !== currentRuleId)
    }

    // Grafo direcionado: X -> Y significa "X deriva de Y"
    const adjacency: Record<string, string[]> = {}
    for (const r of allRules) {
      const c = r.center_code
      const s = r.source_center_code
      if (!adjacency[c]) adjacency[c] = []
      if (!adjacency[c].includes(s)) {
        adjacency[c].push(s)
      }
    }

    // Se src já alcança cur, adicionar cur -> src criará um ciclo (cur -> src ... -> cur)
    // Busca em largura/profundidade a partir de `src` para ver se alcança `cur`
    const visited = new Set<string>()
    const queue = [src]

    while (queue.length > 0) {
      const node = queue.shift()!
      if (node === cur) {
        return true
      }
      if (!visited.has(node)) {
        visited.add(node)
        const neighbors = adjacency[node] || []
        for (const next of neighbors) {
          if (!visited.has(next)) {
            queue.push(next)
          }
        }
      }
    }

    return false
  }

  getInMemoryDerivations(): CenterDerivationRule[] {
    return [...inMemoryDerivations]
  }

  /**
   * Lista derivações de um centro
   */
  async getDerivationsByCenter(centerCode: string): Promise<CenterDerivationRule[]> {
    const code = centerCode.trim()
    try {
      const records = await pb.collection('pcp_center_derivations').getFullList<any>({
        filter: `center_code = '${code}' && deleted = false`,
        sort: '-created',
      })

      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          center_id: r.center_id,
          center_code: r.center_code,
          source_center_id: r.source_center_id,
          source_center_code: r.source_center_code,
          source_center_name: r.source_center_name,
          source_center_sap: r.source_center_sap,
          source_center_company: r.source_center_company,
          source_center_line: r.source_center_line,
          matkl_groups: r.matkl_groups || [],
          start_date: this.formatDatePtBr(r.start_date),
          end_date: r.end_date ? this.formatDatePtBr(r.end_date) : undefined,
          status: r.status as DerivationStatus,
          deleted: r.deleted,
          created_by: r.created_by,
          updated_by: r.updated_by,
          created: r.created,
          updated: r.updated,
        }))
      }
    } catch (err) {
      console.warn('Erro ao consultar pcp_center_derivations no PocketBase:', err)
    }

    // Fallback de memória
    return inMemoryDerivations.filter(
      (r) => r.center_code.trim().toUpperCase() === code.toUpperCase() && !r.deleted,
    )
  }

  /**
   * Lista regras de derivação onde o centro informado é o CENTRO DE ORIGEM
   * (ex: L2 -> ACAB_L2: L2 é a origem)
   */
  async getRulesBySourceCenter(sourceCenterCode: string): Promise<CenterDerivationRule[]> {
    const srcUpper = sourceCenterCode.trim().toUpperCase()
    try {
      const records = await pb.collection('pcp_center_derivations').getFullList<any>({
        filter: `source_center_code = '${srcUpper}' && deleted = false`,
        sort: '-created',
      })
      if (records && records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          center_id: r.center_id,
          center_code: r.center_code,
          source_center_id: r.source_center_id,
          source_center_code: r.source_center_code,
          source_center_name: r.source_center_name,
          source_center_sap: r.source_center_sap,
          source_center_company: r.source_center_company,
          source_center_line: r.source_center_line,
          matkl_groups: r.matkl_groups || [],
          start_date: this.formatDatePtBr(r.start_date),
          end_date: r.end_date ? this.formatDatePtBr(r.end_date) : undefined,
          status: r.status as DerivationStatus,
          deleted: r.deleted,
          created_by: r.created_by,
          updated_by: r.updated_by,
          created: r.created,
          updated: r.updated,
        }))
      }
    } catch (err) {
      console.warn('Erro ao consultar regras por origem no PocketBase:', err)
    }

    return inMemoryDerivations.filter(
      (r) => r.source_center_code?.trim().toUpperCase() === srcUpper && !r.deleted,
    )
  }

  /**
   * Salva (cria ou atualiza) uma regra de derivação
   */
  async saveDerivationRule(
    rule: CenterDerivationRule,
    currentUser: string = 'Engenharia PCP',
  ): Promise<CenterDerivationRule> {
    const isEdit = Boolean(rule.id)
    const nowIso = new Date().toISOString()
    const nowFormatted = this.formatDateTimePtBr(new Date())

    const payload: any = {
      center_code: rule.center_code,
      center_id: rule.center_id || null,
      source_center_code: rule.source_center_code,
      source_center_id: rule.source_center_id || null,
      source_center_name: rule.source_center_name || '',
      source_center_sap: rule.source_center_sap || '',
      source_center_company: rule.source_center_company || '',
      source_center_werks: rule.source_center_werks || '',
      source_center_line: rule.source_center_line || '',
      matkl_groups: rule.matkl_groups,
      start_date: this.parsePtBrToIsoDate(rule.start_date),
      end_date: rule.end_date ? this.parsePtBrToIsoDate(rule.end_date) : null,
      status: rule.status,
      deleted: false,
      updated_by: currentUser,
    }

    if (!isEdit) {
      payload.created_by = currentUser
    }

    let savedId = rule.id
    let previousRule: CenterDerivationRule | null = null

    try {
      if (isEdit && rule.id) {
        try {
          const prev = await pb.collection('pcp_center_derivations').getOne(rule.id)
          previousRule = prev as any
        } catch {
          /* intentionally ignored */
        }
        const updated = await pb.collection('pcp_center_derivations').update(rule.id, payload)
        savedId = updated.id
      } else {
        const created = await pb.collection('pcp_center_derivations').create(payload)
        savedId = created.id
      }
    } catch (err) {
      console.warn('Persistindo derivação em memória (fallback backend):', err)
      if (isEdit && rule.id) {
        const idx = inMemoryDerivations.findIndex((r) => r.id === rule.id)
        if (idx >= 0) {
          previousRule = inMemoryDerivations[idx]
          inMemoryDerivations[idx] = { ...rule, updated: nowIso, updated_by: currentUser }
        }
      } else {
        savedId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        inMemoryDerivations.push({
          ...rule,
          id: savedId,
          created: nowIso,
          updated: nowIso,
          created_by: currentUser,
          updated_by: currentUser,
        })
      }
    }

    const savedRule: CenterDerivationRule = {
      ...rule,
      id: savedId,
      updated: nowIso,
      updated_by: currentUser,
    }

    // Atualizar / sincronizar memória
    const existingIdx = inMemoryDerivations.findIndex((r) => r.id === savedId)
    if (existingIdx >= 0) {
      inMemoryDerivations[existingIdx] = savedRule
    } else {
      inMemoryDerivations.push(savedRule)
    }

    // REGISTRAR AUDITORIA OFICIAL
    // Exemplo de formato: "Centro ACAB_L2 | Derivação alterada | FORNOL1 / MATKL 001 | Ativo → Inativo | usuário X | 18/09/2026 15:42"
    const matklSummary = (rule.matkl_groups || []).map((m) => `MATKL ${m.matkl}`).join(', ')
    const ruleDesc = `${rule.source_center_code} / ${matklSummary || 'Sem grupos'}`

    if (isEdit) {
      const prevStatus = previousRule?.status || 'Ativa'
      const statusChanged = prevStatus !== rule.status
      const auditAction = statusChanged
        ? rule.status === 'Ativa'
          ? 'ativação'
          : 'inativação'
        : 'edição'

      const prevSummary = statusChanged
        ? `${prevStatus} → ${rule.status}`
        : `De: ${previousRule?.source_center_code || '-'} Para: ${rule.source_center_code}`

      await this.recordAuditLog({
        center: rule.center_code,
        action: auditAction,
        rule_summary: ruleDesc,
        previous_value: prevStatus,
        new_value: rule.status,
        user_name: currentUser,
        timestamp: nowFormatted,
      })
    } else {
      await this.recordAuditLog({
        center: rule.center_code,
        action: 'criação',
        rule_summary: ruleDesc,
        previous_value: '-',
        new_value: rule.status,
        user_name: currentUser,
        timestamp: nowFormatted,
      })
    }

    return savedRule
  }

  /**
   * Alterna status Ativa/Inativa sem excluir
   */
  async toggleStatus(
    rule: CenterDerivationRule,
    currentUser: string = 'Engenharia PCP',
  ): Promise<CenterDerivationRule> {
    const newStatus: DerivationStatus = rule.status === 'Ativa' ? 'Inativa' : 'Ativa'
    const updated = await this.saveDerivationRule(
      {
        ...rule,
        status: newStatus,
      },
      currentUser,
    )
    return updated
  }

  /**
   * Exclusão LÓGICA (soft delete) da REGRA (nunca do Centro)
   */
  async softDeleteDerivationRule(
    ruleId: string,
    centerCode: string,
    currentUser: string = 'Engenharia PCP',
  ): Promise<boolean> {
    const nowFormatted = this.formatDateTimePtBr(new Date())
    let ruleSummary = `Regra #${ruleId}`

    try {
      const rule = await pb.collection('pcp_center_derivations').getOne(ruleId)
      const matklList = (rule.matkl_groups || []).map((m: any) => `MATKL ${m.matkl}`).join(', ')
      ruleSummary = `${rule.source_center_code} / ${matklList}`

      await pb.collection('pcp_center_derivations').update(ruleId, {
        deleted: true,
        updated_by: currentUser,
      })
    } catch (err) {
      console.warn('Erro ao marcar soft delete no PocketBase, aplicando em memória:', err)
    }

    // Em memória
    const idx = inMemoryDerivations.findIndex((r) => r.id === ruleId)
    if (idx >= 0) {
      inMemoryDerivations[idx].deleted = true
      inMemoryDerivations[idx].updated_by = currentUser
    }

    // Auditoria de exclusão lógica
    await this.recordAuditLog({
      center: centerCode,
      action: 'exclusão',
      rule_summary: ruleSummary,
      previous_value: 'Cadastrada',
      new_value: 'Excluída (soft delete)',
      user_name: currentUser,
      timestamp: nowFormatted,
    })

    return true
  }

  /**
   * Registra log de auditoria no serviço oficial de governança pcpAuditService
   */
  async recordAuditLog(entry: CenterDerivationAuditEntry): Promise<void> {
    const logTitle = `Centro ${entry.center} | Derivação ${entry.action} | ${entry.rule_summary} | ${entry.previous_value} → ${entry.new_value} | usuário ${entry.user_name} | ${entry.timestamp}`
    try {
      await pcpAuditService.recordLog({
        user_id: 'usr_pcp_admin',
        user_name: entry.user_name,
        action: `DERIVACAO_CENTRO_${entry.action.toUpperCase()}`,
        event_type: 'GOVERNANCE',
        resource: 'PCP_CENTER_DERIVATION',
        resource_id: entry.center,
        center: entry.center,
        details: {
          center_code: entry.center,
          action: entry.action,
          rule_summary: entry.rule_summary,
          previous_value: entry.previous_value,
          new_value: entry.new_value,
          formatted_log: logTitle,
        },
      })
    } catch (e) {
      console.warn('Aviso: falha ao registrar auditoria centralizada:', e)
    }
  }

  /**
   * Formata Data/Hora DD/MM/AAAA HH:mm
   */
  formatDateTimePtBr(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const y = date.getFullYear()
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${d}/${m}/${y} ${hh}:${mm}`
  }

  /**
   * Consulta derivação para o Motor do PCP (por Centro + MATKL)
   * Uso futuro pelo motor do PCP: programação, análise de carteira, sequenciamento, capacidade
   */
  async findDerivationForMotor(
    centerCode: string,
    matkl: string,
    referenceDate: string = new Date().toISOString().split('T')[0],
  ): Promise<CenterDerivationRule | null> {
    const rules = await this.getDerivationsByCenter(centerCode)
    const cleanMatkl = matkl.trim().toUpperCase()
    const targetDate = this.parsePtBrToIsoDate(referenceDate) || referenceDate

    for (const rule of rules) {
      if (rule.status !== 'Ativa' || rule.deleted) continue

      const start = this.parsePtBrToIsoDate(rule.start_date) || '1970-01-01'
      const end = rule.end_date ? this.parsePtBrToIsoDate(rule.end_date) : '9999-12-31'

      if (targetDate >= start && targetDate <= (end || '9999-12-31')) {
        const hasMatkl = (rule.matkl_groups || []).some(
          (m) => m.matkl.trim().toUpperCase() === cleanMatkl,
        )
        if (hasMatkl) {
          return rule
        }
      }
    }
    return null
  }
}

export const centerDerivationService = new CenterDerivationService()
