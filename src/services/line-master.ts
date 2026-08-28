import pb from '@/lib/pocketbase/client'
import {
  FullLineMasterBundle,
  LineCapability,
  LineMaster,
  LineRulePackRef,
  LineSetup,
  LineStructuralConstraint,
  ProductFamily,
  ProductionCalendar,
  ProductionShift,
  StandardScheduledStop,
} from '@/types/line-master'

export const lineMasterService = {
  /**
   * Carrega todas as Fichas Mestres ativas das linhas acessíveis
   */
  async listAllActiveMasters(): Promise<LineMaster[]> {
    const records = await pb.collection('line_masters').getFullList({
      filter: "status = 'ACTIVE'",
      sort: 'code',
      expand: 'line_id,primary_responsible_id,substitute_responsible_id',
    })
    return records as any
  },

  /**
   * Carrega todas as versões de uma linha específica
   */
  async listVersionsByLine(lineId: string): Promise<LineMaster[]> {
    const records = await pb.collection('line_masters').getFullList({
      filter: `line_id = '${lineId}'`,
      sort: '-version',
      expand: 'primary_responsible_id,substitute_responsible_id,author_id',
    })
    return records as any
  },

  /**
   * Carrega o pacote completo de dados da Ficha Mestre para a tela de detalhes
   */
  async getFullBundle(lineId: string): Promise<FullLineMasterBundle> {
    const [
      line,
      versions,
      shifts,
      calendars,
      stops,
      setups,
      capabilities,
      constraints,
      rulePacks,
      families,
    ] = await Promise.all([
      pb.collection('production_lines').getOne(lineId),
      pb.collection('line_masters').getFullList({
        filter: `line_id = '${lineId}'`,
        sort: '-version',
        expand:
          'primary_responsible_id,substitute_responsible_id,author_id,upstream_line_id,downstream_line_id',
      }),
      pb.collection('production_shifts').getFullList({
        filter: `line_id = '${lineId}' && active = true`,
        sort: 'start_time',
      }),
      pb.collection('production_calendars').getFullList({
        filter: `line_id = '${lineId}' && active = true`,
        sort: '-year',
      }),
      pb.collection('standard_scheduled_stops').getFullList({
        filter: `line_id = '${lineId}' && active = true`,
        sort: 'scheduled_time',
      }),
      pb.collection('line_setups').getFullList({
        filter: `line_id = '${lineId}' && active = true`,
        sort: 'code',
        expand: 'from_family_id,to_family_id',
      }),
      pb.collection('line_capabilities').getFullList({
        filter: `line_id = '${lineId}' && active = true`,
        sort: 'created',
        expand: 'product_family_id',
      }),
      pb.collection('line_structural_constraints').getFullList({
        filter: `line_id = '${lineId}' && active = true`,
        sort: 'code',
      }),
      pb.collection('line_rule_pack_refs').getFullList({
        filter: `line_id = '${lineId}'`,
        sort: 'rule_pack_code',
      }),
      pb.collection('product_families').getFullList({
        sort: 'name',
      }),
    ])

    const activeMaster =
      (versions.find((v: any) => v.status === 'ACTIVE') as any) || (versions[0] as any) || null

    return {
      line,
      activeMaster,
      versions: versions as any,
      shifts: shifts as any,
      calendar: (calendars[0] as any) || null,
      stops: stops as any,
      setups: setups as any,
      capabilities: capabilities as any,
      constraints: constraints as any,
      rulePacks: rulePacks as any,
      families: families as any,
    }
  },

  /**
   * Cria uma nova versão da Ficha Mestre (Versionamento rigoroso)
   */
  async createNewVersion(
    data: Partial<LineMaster> & { change_reason: string },
  ): Promise<LineMaster> {
    if (!data.change_reason || !data.change_reason.trim()) {
      throw new Error('A justificativa técnica de modificação é obrigatória.')
    }
    if ((data.nominal_hourly_capacity ?? 0) <= 0) {
      throw new Error('A capacidade nominal por hora deve ser maior que zero (> 0).')
    }
    if (
      data.min_batch_size &&
      data.max_batch_size &&
      Number(data.min_batch_size) > Number(data.max_batch_size)
    ) {
      throw new Error('O lote mínimo não pode exceder o lote máximo.')
    }

    // Se estiver ativando esta versão, arquivar/superseder as versões anteriores
    if (data.status === 'ACTIVE' && data.line_id) {
      const existing = await pb.collection('line_masters').getFullList({
        filter: `line_id = '${data.line_id}' && status = 'ACTIVE'`,
      })
      for (const rec of existing) {
        await pb.collection('line_masters').update(rec.id, {
          status: 'SUPERSEDED',
          change_reason: `Versão substituída pela nova Versão ${data.version || 2}.`,
        })
      }
    }

    return (await pb.collection('line_masters').create(data)) as any
  },

  /**
   * Salva alterações em itens associados (Turnos, Setups, etc.) com justificativa
   */
  async saveShift(data: Partial<ProductionShift>): Promise<ProductionShift> {
    if (data.id) {
      return (await pb.collection('production_shifts').update(data.id, data)) as any
    }
    return (await pb.collection('production_shifts').create(data)) as any
  },

  async deleteShift(id: string): Promise<boolean> {
    return await pb.collection('production_shifts').delete(id)
  },

  async saveScheduledStop(data: Partial<StandardScheduledStop>): Promise<StandardScheduledStop> {
    if (data.id) {
      return (await pb.collection('standard_scheduled_stops').update(data.id, data)) as any
    }
    return (await pb.collection('standard_scheduled_stops').create(data)) as any
  },

  async deleteScheduledStop(id: string): Promise<boolean> {
    return await pb.collection('standard_scheduled_stops').delete(id)
  },

  async saveSetup(data: Partial<LineSetup>): Promise<LineSetup> {
    if (data.id) {
      return (await pb.collection('line_setups').update(data.id, data)) as any
    }
    return (await pb.collection('line_setups').create(data)) as any
  },

  async deleteSetup(id: string): Promise<boolean> {
    return await pb.collection('line_setups').delete(id)
  },

  async saveCapability(data: Partial<LineCapability>): Promise<LineCapability> {
    if (data.id) {
      return (await pb.collection('line_capabilities').update(data.id, data)) as any
    }
    return (await pb.collection('line_capabilities').create(data)) as any
  },

  async deleteCapability(id: string): Promise<boolean> {
    return await pb.collection('line_capabilities').delete(id)
  },

  async saveConstraint(data: Partial<LineStructuralConstraint>): Promise<LineStructuralConstraint> {
    if (data.id) {
      return (await pb.collection('line_structural_constraints').update(data.id, data)) as any
    }
    return (await pb.collection('line_structural_constraints').create(data)) as any
  },

  async deleteConstraint(id: string): Promise<boolean> {
    return await pb.collection('line_structural_constraints').delete(id)
  },

  async saveCalendar(data: Partial<ProductionCalendar>): Promise<ProductionCalendar> {
    if (data.id) {
      return (await pb.collection('production_calendars').update(data.id, data)) as any
    }
    return (await pb.collection('production_calendars').create(data)) as any
  },

  /**
   * Exporta o DTO de contexto para a IA / Motor
   */
  async fetchLineMasterContext(lineId: string): Promise<any> {
    return await pb.send(`/backend/v1/pcp/line-master-context/${lineId}`, {
      method: 'GET',
    })
  },
}
