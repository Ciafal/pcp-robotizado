import pb from '@/lib/pocketbase/client'

export interface ProductionLineRelationshipRecord {
  id: string
  origin_line_code: string
  target_line_code: string
  relation_type: string
  product_code?: string
  family_code?: string
  routing_condition?: string
  priority_order: number
  allocation_pct?: number
  capacity_limit_rate?: number
  standard_lead_time_minutes?: number
  buffer_min_tons?: number
  buffer_max_tons?: number
  valid_from?: string
  valid_until?: string
  status: string
  created?: string
  updated?: string
}

export interface ProductionLineEntity {
  id: string
  code: string
  name: string
  line_type?: string
  status: 'running' | 'idle' | 'stopped' | 'maintenance' | 'ACTIVE' | 'DRAFT' | 'INACTIVE'
  target_rate?: number
  current_rate?: number
  efficiency?: number
  nominal_capacity?: number
  capacity_unit?: string
  sap_work_center?: string
  plant_id?: string
  shifts_count?: number
  created?: string
  updated?: string
}

export interface ProductionValidationResult {
  isValid: boolean
  errors: {
    id: string
    severity: 'CRITICAL' | 'WARNING' | 'INFO'
    type: string
    message: string
    suggestedAction: string
    involvedNodes?: string[]
  }[]
}

export const productionNetworkService = {
  // Listar todas as linhas cadastradas
  async listLines(): Promise<ProductionLineEntity[]> {
    try {
      const records = await pb.collection('production_lines').getFullList<ProductionLineEntity>({
        sort: 'code',
      })
      return records
    } catch (err) {
      console.error('Erro ao buscar production_lines:', err)
      return []
    }
  },

  // Listar relações N:N cadastradas
  async listRelationships(): Promise<ProductionLineRelationshipRecord[]> {
    try {
      const records = await pb
        .collection('production_line_relationships')
        .getFullList<ProductionLineRelationshipRecord>({
          sort: 'priority_order,origin_line_code',
        })
      return records
    } catch (err) {
      console.error('Erro ao buscar production_line_relationships:', err)
      return []
    }
  },

  // Criar ou atualizar relação N:N
  async saveRelationship(
    data: Partial<ProductionLineRelationshipRecord>,
  ): Promise<ProductionLineRelationshipRecord> {
    if (data.id) {
      return await pb
        .collection('production_line_relationships')
        .update<ProductionLineRelationshipRecord>(data.id, data)
    }
    return await pb
      .collection('production_line_relationships')
      .create<ProductionLineRelationshipRecord>(data)
  },

  // Excluir relação
  async deleteRelationship(id: string): Promise<boolean> {
    try {
      return await pb.collection('production_line_relationships').delete(id)
    } catch (err) {
      console.error('Erro ao deletar relationship:', err)
      return false
    }
  },

  // Validador Estrutural do Mapa (Regras 35 e 36)
  validateNetwork(
    lines: ProductionLineEntity[],
    relationships: ProductionLineRelationshipRecord[],
  ): ProductionValidationResult {
    const errors: ProductionValidationResult['errors'] = []

    const lineCodes = new Set(lines.map((l) => l.code))

    // 1. Detectar nós inexistentes referenciados
    for (const rel of relationships) {
      if (!lineCodes.has(rel.origin_line_code)) {
        errors.push({
          id: `err_orig_${rel.id}`,
          severity: 'CRITICAL',
          type: 'ORIGEM_INEXISTENTE',
          message: `Relação (${rel.id}) aponta origem [${rel.origin_line_code}] que não existe no cadastro de linhas.`,
          suggestedAction: 'Cadastrar a linha de origem ou remover a relação.',
          involvedNodes: [rel.origin_line_code],
        })
      }
      if (!lineCodes.has(rel.target_line_code)) {
        errors.push({
          id: `err_dest_${rel.id}`,
          severity: 'CRITICAL',
          type: 'DESTINO_INEXISTENTE',
          message: `Relação (${rel.id}) aponta destino [${rel.target_line_code}] que não existe no cadastro de linhas.`,
          suggestedAction: 'Cadastrar a linha de destino ou atualizar o alvo.',
          involvedNodes: [rel.target_line_code],
        })
      }

      // Buffer inválido ou lead time negativo
      if (rel.buffer_min_tons && rel.buffer_max_tons && rel.buffer_min_tons > rel.buffer_max_tons) {
        errors.push({
          id: `err_buf_${rel.id}`,
          severity: 'CRITICAL',
          type: 'BUFFER_INVALIDO',
          message: `Buffer mínimo (${rel.buffer_min_tons} t) maior que máximo (${rel.buffer_max_tons} t) na relação ${rel.origin_line_code} ➔ ${rel.target_line_code}.`,
          suggestedAction: 'Ajustar faixas de capacidade do pulmão intermediário.',
          involvedNodes: [rel.origin_line_code, rel.target_line_code],
        })
      }

      if (rel.standard_lead_time_minutes !== undefined && rel.standard_lead_time_minutes < 0) {
        errors.push({
          id: `err_lt_${rel.id}`,
          severity: 'CRITICAL',
          type: 'LEAD_TIME_NEGATIVO',
          message: `Lead time negativo (${rel.standard_lead_time_minutes} min) na relação ${rel.origin_line_code} ➔ ${rel.target_line_code}.`,
          suggestedAction: 'Definir lead time >= 0 min.',
          involvedNodes: [rel.origin_line_code, rel.target_line_code],
        })
      }
    }

    // 2. Detecção de Loop Estrutural Não Autorizado (ex: L1 -> L2 -> L1 sem Retrabalho)
    const adj = new Map<string, string[]>()
    lines.forEach((l) => adj.set(l.code, []))
    relationships
      .filter((r) => r.status === 'ATIVA' && r.relation_type !== 'Retrabalho')
      .forEach((r) => {
        const list = adj.get(r.origin_line_code) || []
        list.push(r.target_line_code)
        adj.set(r.origin_line_code, list)
      })

    const visited = new Set<string>()
    const recStack = new Set<string>()

    const detectCycle = (node: string, path: string[]): boolean => {
      visited.add(node)
      recStack.add(node)

      const neighbors = adj.get(node) || []
      for (const n of neighbors) {
        if (!visited.has(n)) {
          if (detectCycle(n, [...path, n])) return true
        } else if (recStack.has(n)) {
          errors.push({
            id: `err_cycle_${node}_${n}`,
            severity: 'CRITICAL',
            type: 'DEPENDENCIA_CIRCULAR',
            message: `Dependência circular não permitida detectada: ${[...path, n].join(' ➔ ')}.`,
            suggestedAction: 'Remover dependência cíclica ou classificar como tipo "Retrabalho".',
            involvedNodes: [...path, n],
          })
          return true
        }
      }

      recStack.delete(node)
      return false
    }

    lines.forEach((l) => {
      if (!visited.has(l.code)) {
        detectCycle(l.code, [l.code])
      }
    })

    // 3. Linha isolada sem nenhuma relação
    lines.forEach((l) => {
      const hasOrigin = relationships.some(
        (r) => r.origin_line_code === l.code && r.status === 'ATIVA',
      )
      const hasTarget = relationships.some(
        (r) => r.target_line_code === l.code && r.status === 'ATIVA',
      )
      if (!hasOrigin && !hasTarget) {
        errors.push({
          id: `warn_isolated_${l.code}`,
          severity: 'WARNING',
          type: 'LINHA_ISOLADA',
          message: `A Linha [${l.code}] não possui relacionamentos de abastecimento ou vazão ativos.`,
          suggestedAction: 'Cadastrar relações de entrada/saída no Mapa de Integração.',
          involvedNodes: [l.code],
        })
      }
    })

    return {
      isValid: errors.filter((e) => e.severity === 'CRITICAL').length === 0,
      errors,
    }
  },
}
