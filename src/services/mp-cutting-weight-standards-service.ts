import { pb } from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'
import { parsePtBrNumber } from '@/lib/number-format'
import type {
  MPCuttingWeightStandard,
  MPCuttingSimulationResult,
} from '@/types/mp-cutting-weight-standards'

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

class MPCuttingWeightStandardsService {
  private COLLECTION_STANDARDS = 'mp_cutting_weight_standards'
  private COLLECTION_SIMULATIONS = 'mp_cutting_simulations'

  /**
   * Converte tolerância em % ou valor direto para kg correspondente
   */
  calculateToleranceInKg(baseWeight: number, val: number, type: 'KG' | 'PERCENT' | 'TON'): number {
    if (type === 'PERCENT') {
      return (baseWeight * val) / 100
    }
    if (type === 'TON') {
      // Se informada em toneladas, converte para kg canônico
      return val * 1000
    }
    return val
  }
  /**
   * Validações industriais rigorosas para padrão de peso:
   * - peso mínimo <= ideal <= máximo
   * - todos os pesos > 0
   * - tolerâncias não negativas
   * - tolerância em % convertida para kg
   * - consistência entre limites diretos e tolerâncias
   */
  validateStandard(
    standard: Partial<MPCuttingWeightStandard>,
    allExisting: MPCuttingWeightStandard[] = [],
  ): ValidationResult {
    const errors: Record<string, string> = {}

    if (!standard.description?.trim()) {
      errors.description = 'A descrição do padrão é obrigatória.'
    }

    if (!standard.company_code?.trim()) {
      errors.company_code = 'A empresa é obrigatória.'
    }

    if (!standard.center_codes || standard.center_codes.length === 0) {
      errors.center_codes = 'Selecione ao menos um centro de aplicação.'
    }

    if (!standard.material_codes || standard.material_codes.length === 0) {
      errors.material_codes = 'Selecione ao menos um material/MP.'
    }

    const target =
      typeof standard.target_weight_kg === 'string'
        ? parsePtBrNumber(standard.target_weight_kg)
        : Number(standard.target_weight_kg)
    const min =
      typeof standard.min_weight_kg === 'string'
        ? parsePtBrNumber(standard.min_weight_kg)
        : Number(standard.min_weight_kg)
    const max =
      typeof standard.max_weight_kg === 'string'
        ? parsePtBrNumber(standard.max_weight_kg)
        : Number(standard.max_weight_kg)

    if (isNaN(target) || target <= 0) {
      errors.target_weight_kg = 'O peso ideal deve ser informado e maior que zero.'
    }
    if (isNaN(min) || min <= 0) {
      errors.min_weight_kg = 'O peso mínimo deve ser informado e maior que zero.'
    }
    if (isNaN(max) || max <= 0) {
      errors.max_weight_kg = 'O peso máximo deve ser informado e maior que zero.'
    }

    if (!isNaN(min) && !isNaN(target) && min > target) {
      errors.min_weight_kg = `O peso mínimo (${(min / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t) não pode ser maior que o peso ideal (${(target / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t).`
    }
    if (!isNaN(max) && !isNaN(target) && target > max) {
      errors.max_weight_kg = `O peso máximo (${(max / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t) não pode ser menor que o peso ideal (${(target / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} t).`
    }

    const tolLowVal =
      typeof standard.tolerance_lower_val === 'string'
        ? parsePtBrNumber(standard.tolerance_lower_val)
        : Number(standard.tolerance_lower_val ?? 0)
    const tolUpVal =
      typeof standard.tolerance_upper_val === 'string'
        ? parsePtBrNumber(standard.tolerance_upper_val)
        : Number(standard.tolerance_upper_val ?? 0)

    if (isNaN(tolLowVal) || tolLowVal < 0) {
      errors.tolerance_lower_val = 'A tolerância inferior não pode ser negativa.'
    }
    if (isNaN(tolUpVal) || tolUpVal < 0) {
      errors.tolerance_upper_val = 'A tolerância superior não pode ser negativa.'
    }

    // Consistência entre limites diretos e tolerâncias
    if (target > 0) {
      const tolLowKg = this.calculateToleranceInKg(
        target,
        tolLowVal,
        standard.tolerance_lower_type || 'TON',
      )
      const tolUpKg = this.calculateToleranceInKg(
        target,
        tolUpVal,
        standard.tolerance_upper_type || 'TON',
      )

      const implicitMin = target - tolLowKg
      const implicitMax = target + tolUpKg

      if (implicitMin < 0) {
        errors.tolerance_lower_val =
          'A tolerância inferior ultrapassa o peso ideal gerando valor negativo.'
      }

      // Se ambos foram informados com precisão, verificar se não há discrepância grave (> 0.5 kg para evitar falso-positivo em arredondamentos)
      if (Math.abs(implicitMin - min) > 0.5 && tolLowVal > 0) {
        errors.tolerance_lower_val = `Tolerância inferior (${(tolLowKg / 1000).toFixed(3)} t) diverge do limite mínimo (${(min / 1000).toFixed(3)} t vs esperado ${((target - tolLowKg) / 1000).toFixed(3)} t).`
      }
      if (Math.abs(implicitMax - max) > 0.5 && tolUpVal > 0) {
        errors.tolerance_upper_val = `Tolerância superior (${(tolUpKg / 1000).toFixed(3)} t) diverge do limite máximo (${(max / 1000).toFixed(3)} t vs esperado ${((target + tolUpKg) / 1000).toFixed(3)} t).`
      }
    }

    if (!standard.start_date?.trim()) {
      errors.start_date = 'A data de início de vigência é obrigatória.'
    }

    if (standard.start_date && standard.end_date) {
      if (standard.end_date < standard.start_date) {
        errors.end_date = 'A data de fim não pode ser anterior à data de início.'
      }
    }

    // Impedir duplicações exatas indesejadas, permitindo múltiplos padrões com descrições, tolerâncias ou vigências distintas
    const currentId = standard.id
    const startDate = standard.start_date || ''
    const endDate = standard.end_date || '9999-12-31'
    const cuttingType = standard.cutting_type || 'BLOCOS'
    const compCode = standard.company_code || ''
    const currentDesc = standard.description?.trim().toLowerCase() || ''

    for (const existing of allExisting) {
      if (existing.id && existing.id === currentId) continue
      if (existing.status !== 'ATIVO') continue
      if (existing.company_code !== compCode) continue
      if (existing.cutting_type !== cuttingType) continue

      // Se a descrição for idêntica e houver sobreposição total, alertar duplicata
      const existDesc = (existing.description || '').trim().toLowerCase()
      const isSameDesc = existDesc === currentDesc && currentDesc.length > 0

      // Interseção exata de centros e materiais
      const sharedCenters = (existing.center_codes || []).filter((c) =>
        (standard.center_codes || []).includes(c),
      )
      const sharedMaterials = (existing.material_codes || []).filter((m) =>
        (standard.material_codes || []).includes(m),
      )

      if (sharedCenters.length > 0 && sharedMaterials.length > 0) {
        const exStart = existing.start_date || ''
        const exEnd = existing.end_date || '9999-12-31'
        const hasOverlap = startDate <= exEnd && endDate >= exStart

        // Apenas conflita se for o mesmo peso ideal E mesma descrição (duplicação pura)
        if (hasOverlap && isSameDesc && Math.abs(existing.target_weight_kg - target) < 0.001) {
          errors.description = `Já existe o padrão ativo ${existing.code} com a mesma descrição e faixa nominal (${existing.description}). Ajuste a descrição ou vigência.`
          break
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }

  /**
   * Gera próximo código sequencial: "PAD-001", "PAD-002", etc.
   */
  async generateNextCode(): Promise<string> {
    try {
      const records = await pb
        .collection(this.COLLECTION_STANDARDS)
        .getList(1, 1, { sort: '-created' })
      if (records.items.length > 0) {
        const lastCode = records.items[0].code || 'PAD-000'
        const match = lastCode.match(/\d+/)
        if (match) {
          const nextNum = parseInt(match[0], 10) + 1
          return `PAD-${String(nextNum).padStart(3, '0')}`
        }
      }
    } catch (e) {
      console.warn('Fallback gerador de código padrão:', e)
    }
    const rand = Math.floor(Math.random() * 900) + 100
    return `PAD-${rand}`
  }

  /**
   * Lista todos os padrões cadastrados
   */
  async listStandards(includeInactive = true): Promise<MPCuttingWeightStandard[]> {
    try {
      const filter = includeInactive ? '' : 'status = "ATIVO"'
      const records = await pb
        .collection(this.COLLECTION_STANDARDS)
        .getFullList({ filter, sort: '-created' })
      return records.map((r: any) => ({
        id: r.id,
        code: r.code,
        description: r.description,
        cutting_type: r.cutting_type,
        company_code: r.company_code,
        center_codes: Array.isArray(r.center_codes) ? r.center_codes : [],
        material_codes: Array.isArray(r.material_codes) ? r.material_codes : [],
        steel_family: r.steel_family || '',
        target_weight_kg: Number(r.target_weight_kg),
        min_weight_kg: Number(r.min_weight_kg),
        max_weight_kg: Number(r.max_weight_kg),
        tolerance_lower_val: Number(r.tolerance_lower_val),
        tolerance_lower_type: r.tolerance_lower_type,
        tolerance_upper_val: Number(r.tolerance_upper_val),
        tolerance_upper_type: r.tolerance_upper_type,
        priority: r.priority,
        start_date: (r.start_date || '').split('T')[0],
        end_date: r.end_date ? r.end_date.split('T')[0] : null,
        status: r.status,
        technical_notes: r.technical_notes || '',
        created: r.created,
        updated: r.updated,
        created_by_user_name: r.created_by_user_name,
        updated_by_user_name: r.updated_by_user_name,
      }))
    } catch (e) {
      console.warn('Erro ao consultar mp_cutting_weight_standards:', e)
      return []
    }
  }

  /**
   * Salva (cria ou atualiza) um padrão de peso, gravando auditoria completa
   */
  async saveStandard(
    data: Partial<MPCuttingWeightStandard>,
    currentUser = 'PCP Engenharia',
  ): Promise<{ success: boolean; standard?: MPCuttingWeightStandard; error?: string }> {
    // Normalizar números via parsePtBrNumber antes da validação e envio
    const normalizedData: Partial<MPCuttingWeightStandard> = {
      ...data,
      target_weight_kg:
        typeof data.target_weight_kg === 'string'
          ? parsePtBrNumber(data.target_weight_kg)
          : data.target_weight_kg,
      min_weight_kg:
        typeof data.min_weight_kg === 'string'
          ? parsePtBrNumber(data.min_weight_kg)
          : data.min_weight_kg,
      max_weight_kg:
        typeof data.max_weight_kg === 'string'
          ? parsePtBrNumber(data.max_weight_kg)
          : data.max_weight_kg,
      tolerance_lower_val:
        typeof data.tolerance_lower_val === 'string'
          ? parsePtBrNumber(data.tolerance_lower_val)
          : data.tolerance_lower_val,
      tolerance_upper_val:
        typeof data.tolerance_upper_val === 'string'
          ? parsePtBrNumber(data.tolerance_upper_val)
          : data.tolerance_upper_val,
    }

    // Auto-sincronização matemática caso min ou max não tenham sido preenchidos diretamente
    const target = Number(normalizedData.target_weight_kg || 0)
    const tolLow = Number(normalizedData.tolerance_lower_val || 0)
    const tolUp = Number(normalizedData.tolerance_upper_val || 0)
    if (target > 0) {
      if (
        (normalizedData.min_weight_kg === undefined ||
          isNaN(Number(normalizedData.min_weight_kg))) &&
        tolLow >= 0
      ) {
        const tolLowKg = this.calculateToleranceInKg(
          target,
          tolLow,
          normalizedData.tolerance_lower_type || 'TON',
        )
        normalizedData.min_weight_kg = Math.max(0, target - tolLowKg)
      }
      if (
        (normalizedData.max_weight_kg === undefined ||
          isNaN(Number(normalizedData.max_weight_kg))) &&
        tolUp >= 0
      ) {
        const tolUpKg = this.calculateToleranceInKg(
          target,
          tolUp,
          normalizedData.tolerance_upper_type || 'TON',
        )
        normalizedData.max_weight_kg = target + tolUpKg
      }
    }

    try {
      const all = await this.listStandards(true)
      const validation = this.validateStandard(normalizedData, all)
      if (!validation.isValid) {
        const firstErr = Object.values(validation.errors)[0]
        return { success: false, error: firstErr }
      }

      const isEdit = Boolean(normalizedData.id)
      let savedRecord: any
      let previousRecord: MPCuttingWeightStandard | null = null

      if (isEdit && normalizedData.id) {
        const existing = all.find((s) => s.id === normalizedData.id)
        if (existing) previousRecord = existing

        const payload: any = {
          description: normalizedData.description?.trim(),
          cutting_type: normalizedData.cutting_type,
          company_code: normalizedData.company_code,
          center_codes: normalizedData.center_codes,
          material_codes: normalizedData.material_codes,
          steel_family: normalizedData.steel_family || '',
          target_weight_kg: Number(normalizedData.target_weight_kg),
          min_weight_kg: Number(normalizedData.min_weight_kg),
          max_weight_kg: Number(normalizedData.max_weight_kg),
          tolerance_lower_val: Number(
            normalizedData.tolerance_lower_type === 'TON'
              ? normalizedData.tolerance_lower_val! * 1000
              : (normalizedData.tolerance_lower_val ?? 0),
          ),
          tolerance_lower_type:
            normalizedData.tolerance_lower_type === 'TON'
              ? 'KG'
              : normalizedData.tolerance_lower_type,
          tolerance_upper_val: Number(
            normalizedData.tolerance_upper_type === 'TON'
              ? normalizedData.tolerance_upper_val! * 1000
              : (normalizedData.tolerance_upper_val ?? 0),
          ),
          tolerance_upper_type:
            normalizedData.tolerance_upper_type === 'TON'
              ? 'KG'
              : normalizedData.tolerance_upper_type,
          priority: normalizedData.priority,
          start_date: normalizedData.start_date,
          end_date: normalizedData.end_date || null,
          status: normalizedData.status,
          technical_notes: normalizedData.technical_notes || '',
          updated_by_user_name: currentUser,
        }

        savedRecord = await pb
          .collection(this.COLLECTION_STANDARDS)
          .update(normalizedData.id, payload)

        // Auditoria NÃO-BLOQUEANTE com SCHEDULE_ACTION
        try {
          await pcpAuditService.recordLog({
            user_name: currentUser,
            action: 'PADRAO_PESO_EDICAO',
            event_type: 'SCHEDULE_ACTION',
            outcome: 'SUCCESS',
            resource: 'MP_CUTTING_WEIGHT_STANDARD',
            resource_id: savedRecord.id,
            record_id: savedRecord.code,
            company: savedRecord.company_code,
            module: 'Gestão de MP',
            screen: 'Padrões de Peso para Corte',
            justification: `Edição do padrão ${savedRecord.code}: ${savedRecord.description}`,
            details: {
              code: savedRecord.code,
              previous: previousRecord,
              new: payload,
            },
          })
        } catch (auditErr: any) {
          console.warn(
            '[pcpAuditService] Aviso: auditoria não-bloqueante falhou na edição do padrão:',
            auditErr,
          )
        }
      } else {
        const nextCode = await this.generateNextCode()
        const payload: any = {
          code: nextCode,
          description: normalizedData.description?.trim(),
          cutting_type: normalizedData.cutting_type || 'BLOCOS',
          company_code: normalizedData.company_code || 'CIAFAL',
          center_codes: normalizedData.center_codes || [],
          material_codes: normalizedData.material_codes || [],
          steel_family: normalizedData.steel_family || '',
          target_weight_kg: Number(normalizedData.target_weight_kg),
          min_weight_kg: Number(normalizedData.min_weight_kg),
          max_weight_kg: Number(normalizedData.max_weight_kg),
          tolerance_lower_val: Number(
            normalizedData.tolerance_lower_type === 'TON'
              ? (normalizedData.tolerance_lower_val ?? 0) * 1000
              : (normalizedData.tolerance_lower_val ?? 0),
          ),
          tolerance_lower_type:
            normalizedData.tolerance_lower_type === 'TON'
              ? 'KG'
              : normalizedData.tolerance_lower_type || 'KG',
          tolerance_upper_val: Number(
            normalizedData.tolerance_upper_type === 'TON'
              ? (normalizedData.tolerance_upper_val ?? 0) * 1000
              : (normalizedData.tolerance_upper_val ?? 0),
          ),
          tolerance_upper_type:
            normalizedData.tolerance_upper_type === 'TON'
              ? 'KG'
              : normalizedData.tolerance_upper_type || 'KG',
          priority: normalizedData.priority || 'MEDIA',
          start_date: normalizedData.start_date,
          end_date: normalizedData.end_date || null,
          status: normalizedData.status || 'ATIVO',
          technical_notes: normalizedData.technical_notes || '',
          created_by_user_name: currentUser,
          updated_by_user_name: currentUser,
        }

        savedRecord = await pb.collection(this.COLLECTION_STANDARDS).create(payload)

        // Auditoria NÃO-BLOQUEANTE com SCHEDULE_ACTION
        try {
          await pcpAuditService.recordLog({
            user_name: currentUser,
            action: 'PADRAO_PESO_CRIACAO',
            event_type: 'SCHEDULE_ACTION',
            outcome: 'SUCCESS',
            resource: 'MP_CUTTING_WEIGHT_STANDARD',
            resource_id: savedRecord.id,
            record_id: savedRecord.code,
            company: savedRecord.company_code,
            module: 'Gestão de MP',
            screen: 'Padrões de Peso para Corte',
            justification: `Criação do padrão ${savedRecord.code}: ${savedRecord.description}`,
            details: {
              code: savedRecord.code,
              payload,
            },
          })
        } catch (auditErr: any) {
          console.warn(
            '[pcpAuditService] Aviso: auditoria não-bloqueante falhou na criação do padrão:',
            auditErr,
          )
        }
      }

      return {
        success: true,
        standard: {
          id: savedRecord.id,
          code: savedRecord.code,
          description: savedRecord.description,
          cutting_type: savedRecord.cutting_type,
          company_code: savedRecord.company_code,
          center_codes: savedRecord.center_codes,
          material_codes: savedRecord.material_codes,
          steel_family: savedRecord.steel_family,
          target_weight_kg: Number(savedRecord.target_weight_kg),
          min_weight_kg: Number(savedRecord.min_weight_kg),
          max_weight_kg: Number(savedRecord.max_weight_kg),
          tolerance_lower_val: Number(savedRecord.tolerance_lower_val),
          tolerance_lower_type: savedRecord.tolerance_lower_type,
          tolerance_upper_val: Number(savedRecord.tolerance_upper_val),
          tolerance_upper_type: savedRecord.tolerance_upper_type,
          priority: savedRecord.priority,
          start_date: savedRecord.start_date,
          end_date: savedRecord.end_date,
          status: savedRecord.status,
          technical_notes: savedRecord.technical_notes,
          created: savedRecord.created,
          updated: savedRecord.updated,
          created_by_user_name: savedRecord.created_by_user_name,
        },
      }
    } catch (e: any) {
      console.error('Erro ao salvar padrão de peso:', e)
      // Tentar registrar falha de forma não-bloqueante
      try {
        await pcpAuditService.recordFailureAttempt({
          operation: 'SALVAR_PADRAO_PESO',
          module: 'Gestão de MP',
          screen: 'Padrões de Peso para Corte',
          company: data.company_code || 'CIAFAL',
          recordId: data.code || data.id,
          errorMessage: e?.message || 'Falha ao gravar no PocketBase',
          justification: `Falha ao persistir padrão: ${e?.message || 'Erro interno'}`,
        })
      } catch {
        /* intentionally ignored */
      }

      return { success: false, error: e?.message || 'Erro ao persistir no PocketBase' }
    }
  }

  /**
   * Alterna status Ativo / Inativo
   * Regra rígida: padrões usados em simulações históricas NUNCA podem ser destruídos, apenas inativados.
   */
  async toggleStatus(
    standard: MPCuttingWeightStandard,
    currentUser = 'PCP Engenharia',
  ): Promise<{ success: boolean; standard?: MPCuttingWeightStandard; error?: string }> {
    const newStatus = standard.status === 'ATIVO' ? 'INATIVO' : 'ATIVO'
    try {
      const updated = await pb.collection(this.COLLECTION_STANDARDS).update(standard.id!, {
        status: newStatus,
        updated_by_user_name: currentUser,
      })

      try {
        await pcpAuditService.recordLog({
          user_name: currentUser,
          action: newStatus === 'ATIVO' ? 'PADRAO_PESO_ATIVACAO' : 'PADRAO_PESO_INATIVACAO',
          event_type: 'SCHEDULE_ACTION',
          outcome: 'SUCCESS',
          resource: 'MP_CUTTING_WEIGHT_STANDARD',
          resource_id: standard.id,
          record_id: standard.code,
          company: standard.company_code,
          module: 'Gestão de MP',
          screen: 'Padrões de Peso para Corte',
          justification: `Alteração de status do padrão ${standard.code} de ${standard.status} para ${newStatus}`,
          details: {
            code: standard.code,
            previous_status: standard.status,
            new_status: newStatus,
          },
        })
      } catch (auditErr: any) {
        console.warn(
          '[pcpAuditService] Aviso: auditoria não-bloqueante falhou na alteração de status:',
          auditErr,
        )
      }

      return {
        success: true,
        standard: { ...standard, status: newStatus },
      }
    } catch (e: any) {
      return { success: false, error: e?.message || 'Erro ao atualizar status' }
    }
  }

  /**
   * Salva uma simulação de cenários gerada pelo motor com rastreabilidade
   */
  async saveSimulation(
    simulation: MPCuttingSimulationResult,
    currentUser = 'PCP Engenharia',
  ): Promise<{ success: boolean; simulation?: MPCuttingSimulationResult; error?: string }> {
    try {
      const payload: any = {
        simulation_code: simulation.simulation_code,
        company_code: simulation.company_code,
        center_code: simulation.center_code,
        material_code: simulation.material_code,
        cutting_type: simulation.cutting_type,
        optimization_criterion: simulation.optimization_criterion,
        required_quantity: simulation.required_quantity || null,
        required_weight_tons: simulation.required_weight_tons || null,
        selected_standard_codes: simulation.selected_standard_codes || [],
        filter_parameters_snapshot: simulation.filter_parameters_snapshot,
        scenarios_json: simulation.scenarios,
        best_scenario_id: simulation.best_scenario_id,
        selected_scenario_id: simulation.selected_scenario_id || simulation.best_scenario_id,
        status: simulation.status || 'SIMULADO',
        approved_plan_code: simulation.approved_plan_code || '',
        created_by_user_name: currentUser,
        technical_justification: simulation.technical_justification || '',
      }

      const created = await pb.collection(this.COLLECTION_SIMULATIONS).create(payload)

      // Registrar auditoria não-bloqueante
      try {
        await pcpAuditService.recordLog({
          user_name: currentUser,
          action: 'SIMULACAO_CENARIOS_CORTE_GERADA',
          event_type: 'SCHEDULE_ACTION',
          outcome: 'SUCCESS',
          resource: 'MP_CUTTING_SIMULATION',
          resource_id: created.id,
          record_id: created.simulation_code,
          company: simulation.company_code,
          center: simulation.center_code,
          module: 'Gestão de MP',
          screen: 'Cenários Comparativos',
          justification: `Geração de 6 cenários comparativos para material ${simulation.material_code} no centro ${simulation.center_code}`,
          details: {
            simulation_code: created.simulation_code,
            best_scenario_id: created.best_scenario_id,
            selected_standard_codes: created.selected_standard_codes,
            criterion: created.optimization_criterion,
          },
        })
      } catch (auditErr: any) {
        console.warn(
          '[pcpAuditService] Aviso: auditoria não-bloqueante falhou na gravação de simulação:',
          auditErr,
        )
      }

      return {
        success: true,
        simulation: {
          ...simulation,
          id: created.id,
          created: created.created,
        },
      }
    } catch (e: any) {
      console.error('Erro ao salvar simulação:', e)
      return { success: false, error: e?.message || 'Falha ao gravar simulação' }
    }
  }

  /**
   * Consulta histórico de simulações
   */
  async listSimulations(): Promise<MPCuttingSimulationResult[]> {
    try {
      const records = await pb
        .collection(this.COLLECTION_SIMULATIONS)
        .getFullList({ sort: '-created' })
      return records.map((r: any) => ({
        id: r.id,
        simulation_code: r.simulation_code,
        company_code: r.company_code,
        center_code: r.center_code,
        material_code: r.material_code,
        cutting_type: r.cutting_type,
        optimization_criterion: r.optimization_criterion,
        required_quantity: r.required_quantity,
        required_weight_tons: r.required_weight_tons,
        selected_standard_codes: r.selected_standard_codes || [],
        filter_parameters_snapshot: r.filter_parameters_snapshot || {},
        scenarios: r.scenarios_json || [],
        best_scenario_id: r.best_scenario_id,
        selected_scenario_id: r.selected_scenario_id,
        status: r.status,
        approved_plan_code: r.approved_plan_code,
        created_by_user_name: r.created_by_user_name,
        created: r.created,
        technical_justification: r.technical_justification,
      }))
    } catch (e) {
      console.warn('Erro ao consultar histórico de simulações:', e)
      return []
    }
  }
}

export const mpCuttingWeightStandardsService = new MPCuttingWeightStandardsService()
