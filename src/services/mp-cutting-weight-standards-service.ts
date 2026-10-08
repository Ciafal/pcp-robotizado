import { pb } from '@/lib/pocketbase/client'
import { pcpAuditService } from '@/services/pcp-audit-service'
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
   * Converte tolerância em kg se estiver em percentual
   */
  calculateToleranceInKg(baseWeight: number, val: number, type: 'KG' | 'PERCENT'): number {
    if (type === 'KG') {
      return val
    }
    return (baseWeight * val) / 100
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

    const target = Number(standard.target_weight_kg)
    const min = Number(standard.min_weight_kg)
    const max = Number(standard.max_weight_kg)

    if (isNaN(target) || target <= 0) {
      errors.target_weight_kg = 'O peso ideal deve ser maior que zero.'
    }
    if (isNaN(min) || min <= 0) {
      errors.min_weight_kg = 'O peso mínimo deve ser maior que zero.'
    }
    if (isNaN(max) || max <= 0) {
      errors.max_weight_kg = 'O peso máximo deve ser maior que zero.'
    }

    if (min > target) {
      errors.min_weight_kg = 'O peso mínimo não pode ser maior que o peso ideal.'
    }
    if (target > max) {
      errors.max_weight_kg = 'O peso máximo não pode ser menor que o peso ideal.'
    }

    const tolLowVal = Number(standard.tolerance_lower_val ?? 0)
    const tolUpVal = Number(standard.tolerance_upper_val ?? 0)

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
        standard.tolerance_lower_type || 'KG',
      )
      const tolUpKg = this.calculateToleranceInKg(
        target,
        tolUpVal,
        standard.tolerance_upper_type || 'KG',
      )

      const implicitMin = target - tolLowKg
      const implicitMax = target + tolUpKg

      if (implicitMin < 0) {
        errors.tolerance_lower_val =
          'A tolerância inferior ultrapassa o peso ideal gerando valor negativo.'
      }

      // Se ambos foram informados com precisão, verificar se não há discrepância grave (> 0.05 kg)
      if (Math.abs(implicitMin - min) > 0.05 && tolLowVal > 0) {
        errors.tolerance_lower_val = `Tolerância inferior (${tolLowKg.toFixed(2)} kg) diverge do limite mínimo (${min.toFixed(2)} kg vs esperado ${(target - tolLowKg).toFixed(2)} kg).`
      }
      if (Math.abs(implicitMax - max) > 0.05 && tolUpVal > 0) {
        errors.tolerance_upper_val = `Tolerância superior (${tolUpKg.toFixed(2)} kg) diverge do limite máximo (${max.toFixed(2)} kg vs esperado ${(target + tolUpKg).toFixed(2)} kg).`
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

    // Impedir duplicidade de mesmo escopo / vigência / parâmetros conflitantes
    const currentId = standard.id
    const startDate = standard.start_date || ''
    const endDate = standard.end_date || '9999-12-31'
    const cuttingType = standard.cutting_type || 'BLOCOS'
    const compCode = standard.company_code || ''

    for (const existing of allExisting) {
      if (existing.id && existing.id === currentId) continue
      if (existing.status !== 'ATIVO') continue
      if (existing.company_code !== compCode) continue
      if (existing.cutting_type !== cuttingType) continue

      // Interseção de centros
      const sharedCenters = (existing.center_codes || []).filter((c) =>
        (standard.center_codes || []).includes(c),
      )
      // Interseção de materiais
      const sharedMaterials = (existing.material_codes || []).filter((m) =>
        (standard.material_codes || []).includes(m),
      )

      if (sharedCenters.length > 0 && sharedMaterials.length > 0) {
        // Checar sobreposição de vigência
        const exStart = existing.start_date || ''
        const exEnd = existing.end_date || '9999-12-31'

        const hasOverlap = startDate <= exEnd && endDate >= exStart
        if (hasOverlap) {
          // Checar se o peso ideal é o mesmo ou conflitante
          if (Math.abs(existing.target_weight_kg - target) < 0.001) {
            errors.description = `Conflito de escopo/vigência com o padrão existente ${existing.code} (${existing.description}) para o mesmo centro e material.`
            break
          }
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
    try {
      const all = await this.listStandards(true)
      const validation = this.validateStandard(data, all)
      if (!validation.isValid) {
        const firstErr = Object.values(validation.errors)[0]
        return { success: false, error: firstErr }
      }

      const isEdit = Boolean(data.id)
      let savedRecord: any
      let previousRecord: MPCuttingWeightStandard | null = null

      if (isEdit && data.id) {
        const existing = all.find((s) => s.id === data.id)
        if (existing) previousRecord = existing

        const payload: any = {
          description: data.description?.trim(),
          cutting_type: data.cutting_type,
          company_code: data.company_code,
          center_codes: data.center_codes,
          material_codes: data.material_codes,
          steel_family: data.steel_family || '',
          target_weight_kg: data.target_weight_kg,
          min_weight_kg: data.min_weight_kg,
          max_weight_kg: data.max_weight_kg,
          tolerance_lower_val: data.tolerance_lower_val,
          tolerance_lower_type: data.tolerance_lower_type,
          tolerance_upper_val: data.tolerance_upper_val,
          tolerance_upper_type: data.tolerance_upper_type,
          priority: data.priority,
          start_date: data.start_date,
          end_date: data.end_date || null,
          status: data.status,
          technical_notes: data.technical_notes || '',
          updated_by_user_name: currentUser,
        }

        savedRecord = await pb.collection(this.COLLECTION_STANDARDS).update(data.id, payload)

        // Registrar auditoria de alteração
        await pcpAuditService.recordLog({
          user_name: currentUser,
          action: 'PADRAO_PESO_EDICAO',
          event_type: 'Alteração',
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
      } else {
        const nextCode = await this.generateNextCode()
        const payload: any = {
          code: nextCode,
          description: data.description?.trim(),
          cutting_type: data.cutting_type || 'BLOCOS',
          company_code: data.company_code || 'CIAFAL',
          center_codes: data.center_codes || [],
          material_codes: data.material_codes || [],
          steel_family: data.steel_family || '',
          target_weight_kg: data.target_weight_kg,
          min_weight_kg: data.min_weight_kg,
          max_weight_kg: data.max_weight_kg,
          tolerance_lower_val: data.tolerance_lower_val ?? 0,
          tolerance_lower_type: data.tolerance_lower_type || 'KG',
          tolerance_upper_val: data.tolerance_upper_val ?? 0,
          tolerance_upper_type: data.tolerance_upper_type || 'KG',
          priority: data.priority || 'MEDIA',
          start_date: data.start_date,
          end_date: data.end_date || null,
          status: data.status || 'ATIVO',
          technical_notes: data.technical_notes || '',
          created_by_user_name: currentUser,
          updated_by_user_name: currentUser,
        }

        savedRecord = await pb.collection(this.COLLECTION_STANDARDS).create(payload)

        // Registrar auditoria de criação
        await pcpAuditService.recordLog({
          user_name: currentUser,
          action: 'PADRAO_PESO_CRIACAO',
          event_type: 'Criação',
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

      await pcpAuditService.recordLog({
        user_name: currentUser,
        action: newStatus === 'ATIVO' ? 'PADRAO_PESO_ATIVACAO' : 'PADRAO_PESO_INATIVACAO',
        event_type: newStatus === 'ATIVO' ? 'Ativação' : 'Inativação',
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

      // Registrar auditoria
      await pcpAuditService.recordLog({
        user_name: currentUser,
        action: 'SIMULACAO_CENARIOS_CORTE_GERADA',
        event_type: 'Criação',
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
