import pb from '@/lib/pocketbase/client'
import {
  TestProgrammingRecord,
  TestProgrammingLogRecord,
  TestProgrammingStatus,
  IndustrialApprovalDecision,
  PcpApprovalDecision,
  TestProgrammingSummaryCardMetrics,
} from '@/types/test-programming'

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
  // Ajuste para 24h mod
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  const finalH = Math.floor(normalizedMinutes / 60)
  const finalM = normalizedMinutes % 60
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`
}

/**
 * Calcula o percentual de redução de ritmo produtivo
 * Exemplo: nominal 20 t/h, previsto 12 t/h => ((20 - 12) / 20) * 100 = 40%
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
 * Gera o próximo ID sequencial do teste no formato TEST-000001
 */
export function formatTestId(sequenceNumber: number): string {
  return `TEST-${String(sequenceNumber).padStart(6, '0')}`
}

export function parseTestIdSequence(testId: string): number {
  const match = testId.match(/^TEST-(\d+)$/)
  if (!match) return 0
  return parseInt(match[1], 10)
}

export class TestProgrammingService {
  /**
   * Obtém o próximo código sequencial pesquisando os registros existentes no PocketBase
   */
  async getNextTestId(): Promise<string> {
    try {
      const records = await pb.collection('test_programming').getList(1, 1, {
        sort: '-test_id',
        fields: 'test_id',
      })
      if (records.items.length === 0 || !records.items[0].test_id) {
        return formatTestId(1)
      }
      const lastSeq = parseTestIdSequence(records.items[0].test_id)
      return formatTestId(lastSeq + 1)
    } catch (err) {
      console.warn('Erro ao calcular próximo test_id, usando timestamp fallback:', err)
      return `TEST-${String(Date.now()).slice(-6)}`
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
    return records
  }

  /**
   * Obtém uma programação pelo ID
   */
  async getById(id: string): Promise<TestProgrammingRecord> {
    return await pb.collection('test_programming').getOne<TestProgrammingRecord>(id)
  }

  /**
   * Cria uma nova programação de teste registrando o ID sequencial e o log de auditoria
   */
  async create(
    data: Omit<TestProgrammingRecord, 'id' | 'test_id' | 'created' | 'updated'> & {
      test_id?: string
    },
    userContext: { id?: string; name: string; role?: string },
  ): Promise<TestProgrammingRecord> {
    const testId = data.test_id || (await this.getNextTestId())

    const payload = {
      ...data,
      test_id: testId,
      status: data.status || 'Rascunho',
    }

    const createdRecord = await pb
      .collection('test_programming')
      .create<TestProgrammingRecord>(payload)

    // Log de criação
    await this.logAction({
      test_programming_id: createdRecord.id,
      test_id: createdRecord.test_id,
      action: 'CRIAÇÃO',
      previous_value: '',
      new_value: createdRecord.status,
      reason: 'Solicitação inicial da Programação de Teste criada',
      user_id: userContext.id,
      user_name: userContext.name,
      user_role: userContext.role,
    })

    return createdRecord
  }

  /**
   * Atualiza os campos de uma programação de teste com validação de transição se o status mudar
   */
  async update(
    id: string,
    updates: Partial<TestProgrammingRecord>,
    userContext: { id?: string; name: string; role?: string },
    reason?: string,
  ): Promise<TestProgrammingRecord> {
    const current = await this.getById(id)

    if (updates.status && updates.status !== current.status) {
      if (!isValidTransition(current.status, updates.status)) {
        throw new Error(
          `Transição de status inválida: não é permitido alterar de "${current.status}" para "${updates.status}".`,
        )
      }
    }

    const updatedRecord = await pb
      .collection('test_programming')
      .update<TestProgrammingRecord>(id, updates)

    const statusChanged = updates.status && updates.status !== current.status
    const action = statusChanged ? 'TRANSIÇÃO_STATUS' : 'EDIÇÃO'

    await this.logAction({
      test_programming_id: updatedRecord.id,
      test_id: updatedRecord.test_id,
      action,
      previous_value: current.status,
      new_value: updatedRecord.status,
      reason: reason || (statusChanged ? `Alteração de status no fluxo` : 'Atualização de campos'),
      user_id: userContext.id,
      user_name: userContext.name,
      user_role: userContext.role,
      metadata: { changedFields: Object.keys(updates) },
    })

    return updatedRecord
  }

  /**
   * Realiza a decisão de Aprovação Industrial (APROVAR, REPROVAR ou SOLICITAR AJUSTES)
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

    if (!isValidTransition(current.status, targetStatus)) {
      // Se estiver em 'Enviado para Aprovação Industrial' ou 'Em Aprovação Industrial', transição direta para 'Aguardando Aprovação PCP'
      // após aprovação é permitida pela regra corporativa
      const isApprovalShortcut =
        (current.status === 'Enviado para Aprovação Industrial' ||
          current.status === 'Em Aprovação Industrial') &&
        decision.decision === 'APROVADO'
      if (!isApprovalShortcut) {
        throw new Error(
          `Transição de status inválida no fluxo de aprovação industrial: "${current.status}" -> "${targetStatus}"`,
        )
      }
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
      previous_value: current.status,
      new_value: targetStatus,
      reason: decision.observation,
      user_id: decision.userId,
      user_name: decision.userName,
      user_role: decision.userRole,
      metadata: { decision },
    })

    return updated
  }

  /**
   * Processa a decisão PCP (preparação para Fatia 2)
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
    })

    await this.logAction({
      test_programming_id: updated.id,
      test_id: updated.test_id,
      action: `APROVAÇÃO_PCP_${decision.decision}`,
      previous_value: current.status,
      new_value: targetStatus,
      reason: decision.observation,
      user_id: decision.userId,
      user_name: decision.userName,
      user_role: decision.userRole,
      metadata: { decision },
    })

    return updated
  }

  /**
   * Registra log de auditoria na coleção test_programming_log
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
      previous_value: entry.previous_value || '',
      new_value: entry.new_value || '',
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
   * Obtém histórico / logs de um teste
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
   * Calcula métricas agregadas para os cards da barra superior
   */
  calculateMetrics(items: TestProgrammingRecord[]): TestProgrammingSummaryCardMetrics {
    const today = new Date().toISOString().split('T')[0]
    // Início da semana (segunda-feira) e fim da semana (domingo)
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

    for (const item of items) {
      if (item.status === 'Programado' || item.status === 'Próximo da Execução') {
        programados++
      }
      if (item.expected_date >= firstDay && item.expected_date <= lastDay) {
        estaSemana++
      }
      if (
        item.status === 'Enviado para Aprovação Industrial' ||
        item.status === 'Em Aprovação Industrial'
      ) {
        aguardandoIndustria++
      }
      if (item.status === 'Aguardando Aprovação PCP' || item.status === 'Em Análise PCP') {
        aguardandoPcp++
      }
      if (item.status === 'Em Execução') {
        emExecucao++
      }
      if (item.status === 'Aguardando Resultado' || item.status === 'Executado') {
        aguardandoResultado++
      }
      if (
        item.status === 'Aguardando Avaliação de Eficácia' ||
        item.status === 'Em Avaliação de Eficácia'
      ) {
        aguardandoEficacia++
      }
      if (item.efficacy_evaluation?.outcome === 'EFICAZ') {
        eficazes++
      }
      if (item.efficacy_evaluation?.outcome === 'INEFICAZ') {
        ineficazes++
      }
      if (item.efficacy_evaluation?.outcome === 'NOVO_TESTE_NECESSARIO') {
        necessitamNovoTeste++
      }
      if (item.status === 'Ação Necessária' || item.status === 'Em Tratamento') {
        comAcaoAberta++
      }
      if (
        (item.status === 'Ação Necessária' || item.status === 'Em Tratamento') &&
        item.revision_details?.deadline &&
        item.revision_details.deadline < today
      ) {
        acoesVencidas++
      }
    }

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
}

export const testProgrammingService = new TestProgrammingService()
