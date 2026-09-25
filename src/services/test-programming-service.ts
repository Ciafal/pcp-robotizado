import pb from '@/lib/pocketbase/client'
import {
  TestProgrammingRecord,
  TestProgrammingLogRecord,
  TestProgrammingStatus,
  IndustrialApprovalDecision,
  PcpApprovalDecision,
  TestProgrammingSummaryCardMetrics,
  PlannedVsRealizedCardMetrics,
  AuditLogOrigin,
} from '@/types/test-programming'
import { calculateTestDeviations, formatDurationPCP } from '@/lib/test-programming-calculations'
import { formatTonsPtBr } from '@/lib/formatters-ptbr'

export const VALID_WORKFLOW_TRANSITIONS: Record<TestProgrammingStatus, TestProgrammingStatus[]> = {
  Rascunho: ['Enviado para Aprovação Industrial', 'Cancelado'],
  'Enviado para Aprovação Industrial': [
    'Em Aprovação Industrial',
    'Aprovado pela Indústria',
    'Reprovado pela Indústria',
    'Solicitação de Ajustes',
    'Cancelado',
  ],
  'Em Aprovação Industrial': [
    'Aprovado pela Indústria',
    'Reprovado pela Indústria',
    'Solicitação de Ajustes',
    'Cancelado',
  ],
  'Solicitação de Ajustes': ['Enviado para Aprovação Industrial', 'Cancelado'],
  'Aprovado pela Indústria': ['Aguardando Aprovação PCP', 'Em Análise PCP', 'Cancelado'],
  'Reprovado pela Indústria': ['Rascunho', 'Cancelado'],
  'Aguardando Aprovação PCP': [
    'Em Análise PCP',
    'Aprovado PCP',
    'Reprovado PCP',
    'Solicitação de Reprogramação',
    'Programado',
    'Cancelado',
  ],
  'Em Análise PCP': [
    'Aprovado PCP',
    'Reprovado PCP',
    'Solicitação de Reprogramação',
    'Programado',
    'Cancelado',
  ],
  'Aprovado PCP': ['Programado', 'Solicitação de Reprogramação', 'Cancelado'],
  'Reprovado PCP': ['Rascunho', 'Cancelado'],
  'Solicitação de Reprogramação': ['Aguardando Aprovação PCP', 'Programado', 'Cancelado'],
  Programado: ['Próximo da Execução', 'Em Execução', 'Solicitação de Reprogramação', 'Cancelado'],
  'Próximo da Execução': ['Em Execução', 'Solicitação de Reprogramação', 'Cancelado'],
  'Em Execução': ['Executado', 'Cancelado'],
  Executado: ['Aguardando Resultado', 'Resultado Registrado'],
  'Aguardando Resultado': ['Resultado Registrado', 'Cancelado'],
  'Resultado Registrado': ['Aguardando Avaliação de Eficácia', 'Em Avaliação de Eficácia'],
  'Aguardando Avaliação de Eficácia': [
    'Em Avaliação de Eficácia',
    'Ação Necessária',
    'Concluído',
    'Cancelado',
  ],
  'Em Avaliação de Eficácia': ['Ação Necessária', 'Concluído', 'Cancelado'],
  'Ação Necessária': ['Em Tratamento', 'Concluído', 'Cancelado'],
  'Em Tratamento': ['Concluído', 'Cancelado'],
  Concluído: [],
  Cancelado: [],
}

export function isValidTransition(
  currentStatus: TestProgrammingStatus,
  targetStatus: TestProgrammingStatus,
): boolean {
  if (currentStatus === targetStatus) return true
  const allowed = VALID_WORKFLOW_TRANSITIONS[currentStatus] || []
  return allowed.includes(targetStatus)
}

/**
 * Calcula a hora final de uma parada somando os minutos de duração.
 * Exemplo: 22:00 + 25 min = 22:25; 23:45 + 30 min = 00:15
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return ''
  const parts = startTime.split(':')
  if (parts.length < 2) return startTime
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  if (isNaN(hours) || isNaN(minutes) || isNaN(durationMinutes)) return startTime

  const totalMinutes = hours * 60 + minutes + Math.round(durationMinutes)
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  const finalH = Math.floor(normalizedMinutes / 60)
  const finalM = normalizedMinutes % 60
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`
}

/**
 * Calcula o percentual de redução de ritmo produtivo
 */
export function calculateReductionPercent(
  nominalProductivity: number,
  expectedProductivity: number,
): number {
  if (!nominalProductivity || nominalProductivity <= 0) return 0
  if (expectedProductivity >= nominalProductivity) return 0
  const reduction = ((nominalProductivity - expectedProductivity) / nominalProductivity) * 100
  return Math.round(reduction * 100) / 100
}

/**
 * Gera o identificador único e imutável no formato "TESTE-000123" (Requisito 3)
 * Aceita legado TEST-000123 e normaliza para TESTE-000123
 */
export function formatTestId(sequenceNumber: number): string {
  return `TESTE-${String(sequenceNumber).padStart(6, '0')}`
}

export function parseTestIdSequence(testId: string): number {
  if (!testId) return 0
  const match = testId.match(/^TESTE-(\d+)$/i) || testId.match(/^TEST-(\d+)$/i)
  if (!match) return 0
  return parseInt(match[1], 10)
}

/**
 * Função requerida pelo design técnico: getNextSequentialTestCode
 * Busca o maior código casando /^TESTE-(\d+)$/ e gera max+1 com padStart(6, '0')
 * Ex: vazio -> TESTE-000001; TESTE-000123 -> TESTE-000124.
 * Imutável na edição (gerado somente na 1ª gravação válida).
 */
export async function getNextSequentialTestCode(): Promise<string> {
  try {
    const records = await pb.collection('test_programming').getFullList<{ test_id: string }>({
      fields: 'test_id',
    })
    if (!records || records.length === 0) {
      return 'TESTE-000001'
    }
    let maxSeq = 0
    for (const item of records) {
      if (!item.test_id) continue
      const match = item.test_id.match(/^TESTE-(\d+)$/) || item.test_id.match(/^TEST-(\d+)$/)
      if (match) {
        const val = parseInt(match[1], 10)
        if (val > maxSeq) maxSeq = val
      }
    }
    const nextSeq = maxSeq + 1
    return `TESTE-${String(nextSeq).padStart(6, '0')}`
  } catch (err) {
    console.warn('Erro ao obter próximo código sequencial, fallback:', err)
    return 'TESTE-000001'
  }
}

export interface ConflictCheckItem {
  id?: string
  title: string
  item_type: string
  start: string
  end: string
  details?: string
}

export interface ConflictCheckResult {
  hasConflict: boolean
  message?: string
  conflicts: ConflictCheckItem[]
}

export class TestProgrammingService {
  /**
   * Obtém o próximo código sequencial pesquisando os registros existentes no PocketBase
   */
  async getNextTestId(): Promise<string> {
    return getNextSequentialTestCode()
  }

  /**
   * Busca os objetivos industriais padronizados ativos da coleção
   */
  async listActiveIndustrialObjectives(): Promise<IndustrialTestObjective[]> {
    try {
      return await pb
        .collection('industrial_test_objectives')
        .getFullList<IndustrialTestObjective>({
          filter: 'active = true',
          sort: '+code',
        })
    } catch (err) {
      console.warn('Erro ao carregar industrial_test_objectives:', err)
      return []
    }
  }

  /**
   * Verifica conflito de horário no mesmo centro com outros eventos da Montagem Semanal
   * (produtos, outros testes, setup, acerto e paradas).
   */
  async checkScheduleConflicts(params: {
    center: string
    startDate: string
    startTime: string
    endDate: string
    endTime: string
    ignoreTestProgrammingId?: string
  }): Promise<ConflictCheckResult> {
    const { center, startDate, startTime, endDate, endTime, ignoreTestProgrammingId } = params
    const startIso = `${startDate} ${startTime}:00`
    const endIso = `${endDate} ${endTime}:00`
    const startMs = new Date(startIso.replace(' ', 'T')).getTime()
    const endMs = new Date(endIso.replace(' ', 'T')).getTime()

    if (isNaN(startMs) || isNaN(endMs) || startMs >= endMs) {
      return { hasConflict: false, conflicts: [] }
    }

    try {
      // Busca itens da weekly_schedules com status diferente de CANCELLED no mesmo centro/linha
      const allSchedules = await pb.collection('weekly_schedules').getFullList<{
        id: string
        production_line_id: string
        status: string
        schedule_data?: {
          items?: Array<{
            id?: string
            test_programming_id?: string
            test_code?: string
            item_type?: string
            material_code?: string
            material_description?: string
            start_datetime?: string
            end_datetime?: string
            status?: string
          }>
        }
      }>()

      const conflicts: ConflictCheckItem[] = []

      for (const sched of allSchedules) {
        if (sched.status === 'CANCELLED') continue
        const items = sched.schedule_data?.items || []
        for (const it of items) {
          if (it.status === 'CANCELLED') continue
          if (ignoreTestProgrammingId && it.test_programming_id === ignoreTestProgrammingId) {
            continue
          }
          if (!it.start_datetime || !it.end_datetime) continue

          const itStartMs = new Date(it.start_datetime.replace(' ', 'T')).getTime()
          const itEndMs = new Date(it.end_datetime.replace(' ', 'T')).getTime()
          if (isNaN(itStartMs) || isNaN(itEndMs)) continue

          // Verifica sobreposição no tempo
          const overlaps = Math.max(startMs, itStartMs) < Math.min(endMs, itEndMs)
          if (overlaps) {
            const label =
              it.item_type === 'TEST_INDUSTRIAL'
                ? `Teste Industrial ${it.test_code || ''}`
                : it.item_type === 'SCHEDULED_STOP'
                  ? `Parada Programada: ${it.material_description || it.material_code}`
                  : it.item_type === 'SETUP'
                    ? `Setup / Acerto: ${it.material_code}`
                    : `Produção: ${it.material_code} (${it.material_description || ''})`

            conflicts.push({
              id: it.id,
              title: label,
              item_type: it.item_type || 'PRODUCTION',
              start: it.start_datetime,
              end: it.end_datetime,
              details: it.material_description || '',
            })
          }
        }
      }

      if (conflicts.length > 0) {
        return {
          hasConflict: true,
          message: `Conflito de programação identificado no centro ${center} entre ${startTime} e ${endTime}.`,
          conflicts,
        }
      }

      return { hasConflict: false, conflicts: [] }
    } catch (err) {
      console.warn('Erro ao verificar conflitos de programação:', err)
      return { hasConflict: false, conflicts: [] }
    }
  }

  /**
   * Sincroniza o Teste Industrial na Montagem Semanal (weekly_schedules).
   * Localiza o item pelo test_programming_id (imutável) e atualiza o mesmo registro.
   * Não duplica em múltiplos cliques ou alterações de centro/horário.
   */
  async syncWeeklyScheduleItem(
    testRecord: TestProgrammingRecord,
    options?: { isCancellation?: boolean },
  ): Promise<{ success: boolean; weeklyScheduleItemId?: string; message: string }> {
    const center = testRecord.center_name || 'L1'
    const durationHours = testRecord.duration_hours || 2.5
    const startDate = testRecord.expected_start_date || testRecord.expected_date
    const startTime = testRecord.expected_start_time || '08:00'
    const endDate = testRecord.expected_end_date || testRecord.expected_date
    const endTime = testRecord.expected_end_time || '10:30'
    const startDatetime = `${startDate} ${startTime}`
    const endDatetime = `${endDate} ${endTime}`

    try {
      // 1. Localizar se já existe registro em qualquer weekly_schedules com esse test_programming_id
      const allSchedules = await pb.collection('weekly_schedules').getFullList<{
        id: string
        production_line_id: string
        year: number
        week_number: number
        status: string
        schedule_data?: {
          items?: any[]
        }
      }>()

      let foundSchedId: string | null = null
      let foundItemIndex = -1
      let existingItem: any = null

      for (const s of allSchedules) {
        const items = s.schedule_data?.items || []
        const idx = items.findIndex(
          (it: any) =>
            it.test_programming_id === testRecord.id ||
            (it.test_code && it.test_code === testRecord.test_id),
        )
        if (idx !== -1) {
          foundSchedId = s.id
          foundItemIndex = idx
          existingItem = items[idx]
          break
        }
      }

      const isCancelled = options?.isCancellation || testRecord.status === 'Cancelado'
      const itemStatus = isCancelled ? 'CANCELLED' : 'SCHEDULED'

      const testItemPayload = {
        id: existingItem?.id || `test-item-${testRecord.id}`,
        item_type: 'TEST_INDUSTRIAL',
        test_programming_id: testRecord.id,
        test_code: testRecord.test_id,
        is_origin_test_programming: true,
        is_locked_externally: true,
        test_technical_lead: testRecord.technical_lead || testRecord.requester_name || '',
        test_objectives: testRecord.objectives_list || [testRecord.objective],
        material_code: testRecord.test_id,
        material_description: `${testRecord.title} (${testRecord.objective})`,
        steel_grade: 'TESTE',
        dimensions: testRecord.steel_type || 'TESTE',
        target_date: startDate,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
        duration_hours: durationHours,
        production_hours: durationHours,
        setup_duration_minutes: 0,
        tuning_duration_minutes: 0,
        scheduled_tons: testRecord.sample_quantity_tons || 0,
        planned_quantity_tons: testRecord.sample_quantity_tons || 0,
        status: itemStatus,
        sequence_order: existingItem?.sequence_order || 1,
      }

      // Se já existia em alguma programação:
      if (foundSchedId && foundItemIndex !== -1) {
        const currentSched = allSchedules.find((s) => s.id === foundSchedId)!
        // Se mudou de centro, remove da anterior e insere na nova
        if (currentSched.production_line_id !== center) {
          const oldItems = [...(currentSched.schedule_data?.items || [])]
          oldItems.splice(foundItemIndex, 1)
          await pb.collection('weekly_schedules').update(currentSched.id, {
            schedule_data: {
              ...(currentSched.schedule_data || {}),
              items: oldItems,
            },
          })

          // Inserir na nova grade do centro novo
          let targetSched = allSchedules.find((s) => s.production_line_id === center)
          if (!targetSched) {
            // Cria container para o centro
            targetSched = await pb.collection('weekly_schedules').create({
              production_line_id: center,
              year: new Date().getFullYear(),
              week_number: 39,
              status: 'DRAFT',
              schedule_data: { items: [testItemPayload] },
            })
          } else {
            const newItems = [...(targetSched.schedule_data?.items || []), testItemPayload]
            await pb.collection('weekly_schedules').update(targetSched.id, {
              schedule_data: {
                ...(targetSched.schedule_data || {}),
                items: newItems,
              },
            })
          }
        } else {
          // Mesmo centro: atualiza O MESMO registro
          const updatedItems = [...(currentSched.schedule_data?.items || [])]
          updatedItems[foundItemIndex] = {
            ...updatedItems[foundItemIndex],
            ...testItemPayload,
          }
          await pb.collection('weekly_schedules').update(currentSched.id, {
            schedule_data: {
              ...(currentSched.schedule_data || {}),
              items: updatedItems,
            },
          })
        }
      } else {
        // Novo item na Montagem Semanal
        let targetSched = allSchedules.find((s) => s.production_line_id === center)
        if (!targetSched) {
          targetSched = await pb.collection('weekly_schedules').create({
            production_line_id: center,
            year: new Date().getFullYear(),
            week_number: 39,
            status: 'DRAFT',
            schedule_data: { items: [testItemPayload] },
          })
        } else {
          const newItems = [...(targetSched.schedule_data?.items || []), testItemPayload]
          await pb.collection('weekly_schedules').update(targetSched.id, {
            schedule_data: {
              ...(targetSched.schedule_data || {}),
              items: newItems,
            },
          })
        }
      }

      return {
        success: true,
        weeklyScheduleItemId: testItemPayload.id,
        message: `Programação integrada à Montagem Semanal do centro [${center}].`,
      }
    } catch (err: any) {
      console.warn('Erro ao sincronizar Montagem Semanal:', err)
      return {
        success: false,
        message: `Aviso: Falha ao integrar com a Montagem Semanal: ${err.message || 'Erro desconhecido'}`,
      }
    }
  }

  /**
   * Lista todas as programações de teste com opções de ordenação e filtro
   */
  async list(filter?: string, sort = '-created'): Promise<TestProgrammingRecord[]> {
    const records = await pb.collection('test_programming').getFullList<TestProgrammingRecord>({
      filter: filter || '',
      sort,
    })

    // Garante que todo item possua deviation_metrics calculado caso tenha dados de MES
    return records.map((rec) => {
      if (rec.mes_execution_data?.actual_start_date && !rec.deviation_metrics) {
        const dev = calculateTestDeviations(
          {
            startDate: rec.expected_start_date || rec.expected_date,
            startTime: rec.expected_start_time || '08:00',
            endDate: rec.expected_end_date || rec.expected_date,
            endTime: rec.expected_end_time || '10:30',
          },
          {
            startDate: rec.mes_execution_data.actual_start_date,
            startTime: rec.mes_execution_data.actual_start_time,
            endDate: rec.mes_execution_data.actual_end_date,
            endTime: rec.mes_execution_data.actual_end_time,
          },
        )
        if (dev) {
          rec.deviation_metrics = dev
        }
      }
      return rec
    })
  }

  /**
   * Obtém uma programação pelo ID
   */
  async getById(id: string): Promise<TestProgrammingRecord> {
    const record = await pb.collection('test_programming').getOne<TestProgrammingRecord>(id)
    if (record.mes_execution_data?.actual_start_date && !record.deviation_metrics) {
      const dev = calculateTestDeviations(
        {
          startDate: record.expected_start_date || record.expected_date,
          startTime: record.expected_start_time || '08:00',
          endDate: record.expected_end_date || record.expected_date,
          endTime: record.expected_end_time || '10:30',
        },
        {
          startDate: record.mes_execution_data.actual_start_date,
          startTime: record.mes_execution_data.actual_start_time,
          endDate: record.mes_execution_data.actual_end_date,
          endTime: record.mes_execution_data.actual_end_time,
        },
      )
      if (dev) {
        record.deviation_metrics = dev
      }
    }
    return record
  }

  /**
   * Cria uma nova programação de teste registrando o ID sequencial imutável TESTE-000123
   * e o log de auditoria append-only completo (Requisitos 3, 15)
   */
  async create(
    data: Omit<TestProgrammingRecord, 'id' | 'test_id' | 'created' | 'updated'> & {
      test_id?: string
    },
    userContext: { id?: string; name: string; role?: string },
    origin: AuditLogOrigin = 'usuário',
  ): Promise<TestProgrammingRecord> {
    const testId = data.test_id || (await this.getNextTestId())

    const payload = {
      ...data,
      test_id: testId,
      status: data.status || 'Rascunho',
      mes_integration_status: data.mes_integration_status || 'Aguardando execução',
      mes_sync_message: data.mes_sync_message || 'Aguardando liberação para execução fabril.',
    }

    const createdRecord = await pb
      .collection('test_programming')
      .create<TestProgrammingRecord>(payload)

    // Etapa 3 & 4: Sincronização obrigatória com a Montagem Semanal
    let syncResult = await this.syncWeeklyScheduleItem(createdRecord)
    if (syncResult.success && syncResult.weeklyScheduleItemId) {
      await pb.collection('test_programming').update(createdRecord.id, {
        weekly_schedule_item_id: syncResult.weeklyScheduleItemId,
        weekly_schedule_status: 'INTEGRADO',
      })
      createdRecord.weekly_schedule_item_id = syncResult.weeklyScheduleItemId
      createdRecord.weekly_schedule_status = 'INTEGRADO'
    }

    // Log de auditoria de criação append-only com centro, datas e resultado da sincronização
    await this.logAction({
      test_programming_id: createdRecord.id,
      test_id: createdRecord.test_id,
      action: 'CRIAÇÃO',
      field_changed: 'registro_completo',
      previous_value: '',
      new_value: `Status: ${createdRecord.status}; Período: ${createdRecord.expected_start_date} ${createdRecord.expected_start_time} - ${createdRecord.expected_end_date} ${createdRecord.expected_end_time}`,
      center_previous: '',
      center_new: createdRecord.center_name || '',
      schedule_previous: '',
      schedule_new: `${createdRecord.expected_start_date} ${createdRecord.expected_start_time} -> ${createdRecord.expected_end_date} ${createdRecord.expected_end_time}`,
      sync_result: syncResult.message,
      origin,
      integration_name: 'PCP Robotizado',
      operation_result: syncResult.success ? 'Sucesso' : 'Falha na Sincronização Semanal',
      reason: 'Solicitação inicial da Programação de Teste criada e integrada',
      user_id: userContext.id,
      user_name: userContext.name,
      user_role: userContext.role,
    })

    return createdRecord
  }

  /**
   * Atualiza os campos de uma programação de teste com validação de transição se o status mudar,
   * gravando logs individuais de auditoria antes/depois (Requisito 15, C8)
   */
  async update(
    id: string,
    updates: Partial<TestProgrammingRecord>,
    userContext: { id?: string; name: string; role?: string },
    reason?: string,
    origin: AuditLogOrigin = 'usuário',
  ): Promise<TestProgrammingRecord> {
    const current = await this.getById(id)

    if (updates.status && updates.status !== current.status) {
      if (!isValidTransition(current.status, updates.status)) {
        throw new Error(
          `Transição de status inválida: não é permitido alterar de "${current.status}" para "${updates.status}".`,
        )
      }
    }

    // Se estiver atualizando dados do MES, calcula desvios automaticamente
    if (updates.mes_execution_data) {
      const dev = calculateTestDeviations(
        {
          startDate:
            updates.expected_start_date || current.expected_start_date || current.expected_date,
          startTime: updates.expected_start_time || current.expected_start_time || '08:00',
          endDate: updates.expected_end_date || current.expected_end_date || current.expected_date,
          endTime: updates.expected_end_time || current.expected_end_time || '10:30',
        },
        {
          startDate: updates.mes_execution_data.actual_start_date,
          startTime: updates.mes_execution_data.actual_start_time,
          endDate: updates.mes_execution_data.actual_end_date,
          endTime: updates.mes_execution_data.actual_end_time,
        },
      )
      if (dev) {
        updates.deviation_metrics = dev
      }
    }

    const updatedRecord = await pb
      .collection('test_programming')
      .update<TestProgrammingRecord>(id, updates)

    // Sincronização com Montagem Semanal
    let syncResult = await this.syncWeeklyScheduleItem(updatedRecord, {
      isCancellation: updatedRecord.status === 'Cancelado',
    })
    if (syncResult.success) {
      await pb.collection('test_programming').update(updatedRecord.id, {
        weekly_schedule_status: updatedRecord.status === 'Cancelado' ? 'CANCELADO' : 'SINCRONIZADO',
      })
      updatedRecord.weekly_schedule_status =
        updatedRecord.status === 'Cancelado' ? 'CANCELADO' : 'SINCRONIZADO'
    }

    // Identificar campos alterados para auditoria antes/depois
    const changedKeys = Object.keys(updates).filter(
      (k) => (updates as any)[k] !== (current as any)[k],
    )

    const statusChanged = updates.status && updates.status !== current.status
    const action = statusChanged ? 'TRANSIÇÃO_STATUS' : 'EDIÇÃO'

    for (const key of changedKeys) {
      const prevVal = String((current as any)[key] ?? '')
      const nextVal = String((updates as any)[key] ?? '')
      await this.logAction({
        test_programming_id: updatedRecord.id,
        test_id: updatedRecord.test_id,
        action,
        field_changed: key,
        previous_value: prevVal.length > 500 ? prevVal.slice(0, 500) + '...' : prevVal,
        new_value: nextVal.length > 500 ? nextVal.slice(0, 500) + '...' : nextVal,
        center_previous: current.center_name,
        center_new: updatedRecord.center_name,
        schedule_previous: `${current.expected_start_date} ${current.expected_start_time}`,
        schedule_new: `${updatedRecord.expected_start_date} ${updatedRecord.expected_start_time}`,
        sync_result: syncResult.message,
        origin,
        integration_name: origin === 'MES 4.0' ? 'MES 4.0' : 'PCP Robotizado',
        operation_result: syncResult.success ? 'Sucesso' : 'Falha na Sincronização Semanal',
        reason:
          reason || (statusChanged ? 'Alteração de status no fluxo' : 'Atualização de campos'),
        user_id: userContext.id,
        user_name: userContext.name,
        user_role: userContext.role,
        metadata: { changedField: key },
      })
    }

    return updatedRecord
  }

  /**
   * Realiza a decisão de Aprovação Industrial
   */
  async processIndustrialApproval(
    id: string,
    decision: IndustrialApprovalDecision,
  ): Promise<TestProgrammingRecord> {
    const current = await this.getById(id)

    let targetStatus: TestProgrammingStatus
    if (decision.decision === 'APROVADO') {
      targetStatus = 'Aguardando Aprovação PCP'
    } else if (decision.decision === 'REPROVADO') {
      targetStatus = 'Reprovado pela Indústria'
    } else {
      targetStatus = 'Solicitação de Ajustes'
    }

    const updated = await pb.collection('test_programming').update<TestProgrammingRecord>(id, {
      status: targetStatus,
      industrial_approver: decision.userName,
      industrial_approval_decision: decision,
    })

    await this.logAction({
      test_programming_id: updated.id,
      test_id: updated.test_id,
      action: `APROVAÇÃO_INDUSTRIAL_${decision.decision}`,
      field_changed: 'status',
      previous_value: current.status,
      new_value: targetStatus,
      origin: 'usuário',
      integration_name: 'PCP Robotizado',
      operation_result: 'Sucesso',
      reason: decision.observation,
      user_id: decision.userId,
      user_name: decision.userName,
      user_role: decision.userRole,
      metadata: { decision },
    })

    return updated
  }

  /**
   * Processa a decisão PCP
   */
  async processPcpApproval(
    id: string,
    decision: PcpApprovalDecision,
  ): Promise<TestProgrammingRecord> {
    const current = await this.getById(id)

    let targetStatus: TestProgrammingStatus
    if (decision.decision === 'APROVADO') {
      targetStatus = 'Programado'
    } else if (decision.decision === 'REPROVADO') {
      targetStatus = 'Reprovado PCP'
    } else {
      targetStatus = 'Solicitação de Reprogramação'
    }

    const updated = await pb.collection('test_programming').update<TestProgrammingRecord>(id, {
      status: targetStatus,
      pcp_approver: decision.userName,
      pcp_approval_decision: decision,
      mes_integration_status:
        targetStatus === 'Programado' ? 'Aguardando execução' : current.mes_integration_status,
    })

    await this.logAction({
      test_programming_id: updated.id,
      test_id: updated.test_id,
      action: `APROVAÇÃO_PCP_${decision.decision}`,
      field_changed: 'status',
      previous_value: current.status,
      new_value: targetStatus,
      origin: 'usuário',
      integration_name: 'PCP Robotizado',
      operation_result: 'Sucesso',
      reason: decision.observation,
      user_id: decision.userId,
      user_name: decision.userName,
      user_role: decision.userRole,
      metadata: { decision },
    })

    return updated
  }

  /**
   * Registra log de auditoria append-only imutável na coleção test_programming_log
   */
  async logAction(
    entry: Omit<TestProgrammingLogRecord, 'id' | 'date' | 'time' | 'created' | 'updated'>,
  ): Promise<TestProgrammingLogRecord> {
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0]

    const payload = {
      ...entry,
      date: dateStr,
      time: timeStr,
      user_name: entry.user_name || 'Usuário Sistema',
      action: entry.action,
      field_changed: entry.field_changed || 'geral',
      previous_value: entry.previous_value || '',
      new_value: entry.new_value || '',
      origin: entry.origin || 'usuário',
      integration_name: entry.integration_name || 'PCP Robotizado',
      operation_result: entry.operation_result || 'Sucesso',
      reason: entry.reason || '',
    }

    try {
      return await pb.collection('test_programming_log').create<TestProgrammingLogRecord>(payload)
    } catch (err) {
      console.warn('Erro ao salvar log de auditoria do teste:', err)
      return payload as unknown as TestProgrammingLogRecord
    }
  }

  /**
   * Obtém histórico / logs imutáveis de um teste
   */
  async getLogs(testProgrammingId: string): Promise<TestProgrammingLogRecord[]> {
    try {
      return await pb.collection('test_programming_log').getFullList<TestProgrammingLogRecord>({
        filter: `test_programming_id = '${testProgrammingId}'`,
        sort: '-created',
      })
    } catch (err) {
      console.warn('Erro ao carregar logs:', err)
      return []
    }
  }

  /**
   * Calcula métricas agregadas para os cards da barra superior do ciclo geral
   */
  calculateMetrics(items: TestProgrammingRecord[]): TestProgrammingSummaryCardMetrics {
    const today = new Date().toISOString().split('T')[0]
    const curr = new Date()
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1))
      .toISOString()
      .split('T')[0]
    const lastDay = new Date(curr.setDate(curr.getDate() - curr.getDay() + 7))
      .toISOString()
      .split('T')[0]

    let programados = 0
    let estaSemana = 0
    let aguardandoIndustria = 0
    let aguardandoPcp = 0
    let emExecucao = 0
    let aguardandoResultado = 0
    let aguardandoEficacia = 0
    let eficazes = 0
    let ineficazes = 0
    let necessitamNovoTeste = 0
    let comAcaoAberta = 0
    let acoesVencidas = 0

    items.forEach((item) => {
      const expDate = item.expected_start_date || item.expected_date
      if (item.status === 'Programado' || item.status === 'Próximo da Execução') programados++
      if (expDate >= firstDay && expDate <= lastDay) estaSemana++
      if (
        item.status === 'Enviado para Aprovação Industrial' ||
        item.status === 'Em Aprovação Industrial'
      )
        aguardandoIndustria++
      if (item.status === 'Aguardando Aprovação PCP' || item.status === 'Em Análise PCP')
        aguardandoPcp++
      if (item.status === 'Em Execução') emExecucao++
      if (item.status === 'Aguardando Resultado' || item.status === 'Executado')
        aguardandoResultado++
      if (
        item.status === 'Aguardando Avaliação de Eficácia' ||
        item.status === 'Em Avaliação de Eficácia'
      )
        aguardandoEficacia++

      if (item.efficacy_evaluation?.outcome === 'EFICAZ') eficazes++
      if (item.efficacy_evaluation?.outcome === 'INEFICAZ') ineficazes++
      if (item.efficacy_evaluation?.outcome === 'NOVO_TESTE_NECESSARIO') necessitamNovoTeste++

      if (item.status === 'Ação Necessária' || item.status === 'Em Tratamento') comAcaoAberta++
      if (
        (item.status === 'Ação Necessária' || item.status === 'Em Tratamento') &&
        item.revision_details?.deadline &&
        item.revision_details.deadline < today
      ) {
        acoesVencidas++
      }
    })

    return {
      programados,
      estaSemana,
      aguardandoIndustria,
      aguardandoPcp,
      emExecucao,
      aguardandoResultado,
      aguardandoEficacia,
      eficazes,
      ineficazes,
      necessitamNovoTeste,
      comAcaoAberta,
      acoesVencidas,
    }
  }

  /**
   * Calcula as 7 métricas obrigatórias da Área "Previsto x Realizado" (Requisito 8)
   */
  calculatePlannedVsRealizedMetrics(items: TestProgrammingRecord[]): PlannedVsRealizedCardMetrics {
    const executedItems = items.filter(
      (item) =>
        item.mes_execution_data?.actual_start_date ||
        item.status === 'Executado' ||
        item.status === 'Resultado Registrado' ||
        item.status === 'Concluído' ||
        item.deviation_metrics !== undefined,
    )

    const totalConcluidos = executedItems.length
    let dentroPrevistoCount = 0
    let comDesvioCount = 0
    let totalAtrasoInicioMin = 0
    let countComAtraso = 0
    let totalDesvioDuracaoMin = 0
    let tempoExcedenteAcumuladoMin = 0
    let totalProduzidoTons = 0

    executedItems.forEach((item) => {
      const dev = item.deviation_metrics
      if (dev) {
        if (dev.classification === 'DENTRO_PREVISTO') {
          dentroPrevistoCount++
        } else {
          comDesvioCount++
        }

        if (dev.start_deviation_minutes > 0) {
          totalAtrasoInicioMin += dev.start_deviation_minutes
          countComAtraso++
        }

        totalDesvioDuracaoMin += Math.abs(dev.duration_deviation_minutes)

        if (dev.duration_deviation_minutes > 0) {
          tempoExcedenteAcumuladoMin += dev.duration_deviation_minutes
        }
      }

      if (
        item.mes_execution_data &&
        typeof item.mes_execution_data.quantity_produced === 'number'
      ) {
        totalProduzidoTons += item.mes_execution_data.quantity_produced
      }
    })

    const dentroPrevistoPct =
      totalConcluidos > 0 ? Math.round((dentroPrevistoCount / totalConcluidos) * 1000) / 10 : 0
    const comDesvioPct =
      totalConcluidos > 0 ? Math.round((comDesvioCount / totalConcluidos) * 1000) / 10 : 0

    const atrasoMedioInicioMin =
      countComAtraso > 0 ? Math.round(totalAtrasoInicioMin / countComAtraso) : 0
    const desvioMedioDuracaoMin =
      totalConcluidos > 0 ? Math.round(totalDesvioDuracaoMin / totalConcluidos) : 0

    return {
      testesConcluidos: totalConcluidos,
      dentroDoPrevistoCount: dentroPrevistoCount,
      dentroDoPrevistoPct: dentroPrevistoPct,
      comDesvioCount: comDesvioCount,
      comDesvioPct: comDesvioPct,
      atrasoMedioInicioMinutes: atrasoMedioInicioMin,
      atrasoMedioInicioFormatted: formatDurationPCP(atrasoMedioInicioMin),
      desvioMedioDuracaoMinutes: desvioMedioDuracaoMin,
      desvioMedioDuracaoFormatted: formatDurationPCP(desvioMedioDuracaoMin),
      tempoExcedenteAcumuladoMinutes: tempoExcedenteAcumuladoMin,
      tempoExcedenteAcumuladoFormatted: formatDurationPCP(tempoExcedenteAcumuladoMin),
      totalProduzidoPeriodoTons: totalProduzidoTons,
      totalProduzidoPeriodoFormatted: formatTonsPtBr(totalProduzidoTons),
    }
  }
}

export const testProgrammingService = new TestProgrammingService()
