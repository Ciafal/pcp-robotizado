/**
 * MOTOR DE COMPLETUDE DA FICHA MESTRE
 * PCP Robotizado - Ciafal HUB
 *
 * Fórmula: (itens obrigatórios preenchidos / itens obrigatórios aplicáveis) × 100
 * Não pontua nem penaliza campos N/A (não aplicáveis ao tipo de linha).
 *
 * Blocos:
 * 1. Identificação & Governança (empresa/planta, gestores, aprovadores, status cadastral)
 * 2. Capacidade & Calendário (capacidade nominal/unidade, turnos, turmas, paradas programadas)
 * 3. Processo (produtividade, setup matriz, acerto, sequência, gargalos térmicos/matriz)
 * 4. Materiais (prioridades MP, bloqueios, rendimento/famílias qualificadas)
 * 5. Integrações (SAP centro/depósito, MES, identificadores)
 *
 * Importante: Completude ≠ Homologação.
 */

import pb from '@/lib/pocketbase/client'
import {
  LineOverviewData,
  MasterSheetCompletenessResult,
  MasterSheetBlockCompleteness,
  MasterSheetStatus,
  CompletenessItem,
} from '@/types/line-master'

// Cache em memória leve com TTL de 30 segundos por linha para evitar chamadas redundantes
const completenessCache = new Map<
  string,
  { timestamp: number; result: MasterSheetCompletenessResult }
>()
const CACHE_TTL_MS = 30_000

export function invalidateCompletenessCache(lineId?: string) {
  if (lineId) {
    completenessCache.delete(lineId)
  } else {
    completenessCache.clear()
  }
}

export function calculateCompletenessFromOverview(
  overview: LineOverviewData,
  bottleneckMatrixCount: number = 0,
): MasterSheetCompletenessResult {
  const {
    line,
    master,
    managers = [],
    approvers = [],
    sequencing = [],
    shifts = [],
    crews = [],
    shiftCrews = [],
    capabilities = [],
    productivity = [],
    rawMaterials = [],
    blockedProducts = [],
    setupMatrix = [],
    adjustmentRules = [],
    scheduledStops = [],
  } = overview

  const lineTypeRaw = (line.programming_type || master?.programming_type || line.process || '')
    .toString()
    .toUpperCase()

  const lineCode = (line.code || '').toUpperCase()
  const isLaminacao =
    lineTypeRaw.includes('LAMIN') ||
    lineTypeRaw.includes('LAMINAÇÃO') ||
    lineCode.startsWith('L1') ||
    lineCode.startsWith('L2') ||
    lineCode.includes('LAM')

  // Helper para construir itens
  const identificationItems: CompletenessItem[] = [
    {
      id: 'ident_plant',
      blockKey: 'IDENTIFICATION_GOVERNANCE',
      label: 'Planta e Centro Industrial (SAP)',
      fulfilled: Boolean(line.sap_plant_code || master?.sap_plant_code || line.plant),
      applicable: true,
      valueDescription: line.sap_plant_code || master?.sap_plant_code || line.plant,
      missingMessage: 'Centro SAP / Planta fabril não informada',
      navigationTarget: { mainGroup: 'OVERVIEW' },
    },
    {
      id: 'ident_status',
      blockKey: 'IDENTIFICATION_GOVERNANCE',
      label: 'Status Operacional e Ativação Cadastral',
      fulfilled: Boolean(line.status && line.is_active !== false),
      applicable: true,
      valueDescription: `${line.status} (${line.is_active !== false ? 'Ativa' : 'Inativa'})`,
      missingMessage: 'Linha com cadastro inativo ou status indefinido',
      navigationTarget: { mainGroup: 'OVERVIEW' },
    },
    {
      id: 'ident_manager',
      blockKey: 'IDENTIFICATION_GOVERNANCE',
      label: 'Gestor Operacional Titular',
      fulfilled: managers.length > 0 || Boolean(line.manager_user_id),
      applicable: true,
      valueDescription:
        managers[0]?.expand?.user_id?.name || managers[0]?.role_title || 'Vinculado',
      missingMessage: 'Gestor titular não definido na Governança',
      navigationTarget: { mainGroup: 'ORGANIZATION' },
    },
    {
      id: 'ident_approvers',
      blockKey: 'IDENTIFICATION_GOVERNANCE',
      label: 'Matriz de Aprovadores Homologadores',
      fulfilled: approvers.length > 0,
      applicable: true,
      valueDescription: `${approvers.length} aprovador(es) cadastrado(s)`,
      missingMessage: 'Matriz de aprovadores vazia (mínimo 1 aprovador requerido)',
      navigationTarget: { mainGroup: 'ORGANIZATION' },
    },
  ]

  const capacityItems: CompletenessItem[] = [
    {
      id: 'cap_nominal',
      blockKey: 'CAPACITY_CALENDAR',
      label: 'Capacidade Nominal e Unidade',
      fulfilled: Boolean(
        (master && master.nominal_hourly_capacity > 0 && master.capacity_unit) ||
        ((line.current_rate ?? 0) > 0 && (line.capacity_unit || line.nominal_speed_unit)),
      ),
      applicable: true,
      valueDescription: `${master?.nominal_hourly_capacity || line.current_rate || 0} ${master?.capacity_unit || line.capacity_unit || 't/h'}`,
      missingMessage: 'Capacidade nominal horária não informada na Ficha Mestre',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'CAPACITY' },
    },
    {
      id: 'cap_shifts',
      blockKey: 'CAPACITY_CALENDAR',
      label: 'Turnos Operacionais Cadastrados',
      fulfilled: shifts.length > 0,
      applicable: true,
      valueDescription: `${shifts.length} turno(s) configurado(s)`,
      missingMessage: 'Nenhum turno cadastrado para a linha',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'SHIFTS_CREWS' },
    },
    {
      id: 'cap_crews',
      blockKey: 'CAPACITY_CALENDAR',
      label: 'Turmas Operacionais Associadas',
      fulfilled: crews.length > 0 || shiftCrews.length > 0,
      applicable: true,
      valueDescription: `${crews.length} turma(s) vinculada(s)`,
      missingMessage: 'Turmas operacionais não vinculadas aos turnos',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'SHIFTS_CREWS' },
    },
    {
      id: 'cap_stops',
      blockKey: 'CAPACITY_CALENDAR',
      label: 'Paradas Programadas Padrão',
      fulfilled: scheduledStops.length > 0,
      applicable: true,
      valueDescription: `${scheduledStops.length} parada(s) preventiva(s)/manutenção`,
      missingMessage: 'Nenhuma parada programada ou janela de manutenção cadastrada',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'CAPACITY' },
    },
  ]

  // Processo — requisitos condicionais por tipo de linha
  const processItems: CompletenessItem[] = [
    {
      id: 'proc_rates',
      blockKey: 'PROCESS',
      label: 'Produtividade por Material / Bitola',
      fulfilled: productivity.length > 0,
      applicable: true,
      valueDescription: `${productivity.length} taxa(s) de cadência cadastrada(s)`,
      missingMessage: 'Taxas de cadência de produtividade não cadastradas',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'PRODUCTIVITY' },
    },
    {
      id: 'proc_setup_matrix',
      blockKey: 'PROCESS',
      label: 'Matriz De -> Para de Setup',
      fulfilled: setupMatrix.length > 0,
      applicable: true,
      valueDescription: `${setupMatrix.length} regra(s) de transição de ferramentas`,
      missingMessage: 'Matriz de setup De -> Para não configurada',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'SETUP_MATRIX' },
    },
    {
      id: 'proc_adjustment',
      blockKey: 'PROCESS',
      label: 'Matriz de Tempo de Acerto (Amostras)',
      fulfilled: adjustmentRules.length > 0,
      applicable: true,
      valueDescription: `${adjustmentRules.length} regra(s) de tempo de acerto`,
      missingMessage: 'Tempos de acerto por tipo de amostra não configurados',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'SETUP_MATRIX' },
    },
    {
      id: 'proc_sequencing',
      blockKey: 'PROCESS',
      label: 'Sequenciamento Produtivo (Fluxo/Dependências)',
      fulfilled: sequencing.length > 0,
      applicable: true,
      valueDescription: `${sequencing.length} dependência(s) de processo`,
      missingMessage: 'Sequenciamento produtivo (predecessor/sucessor) não declarado',
      navigationTarget: { mainGroup: 'PROCESS' },
    },
    // Itens específicos de Laminação (NÃO penalizam outros tipos)
    {
      id: 'proc_lamin_enfornamento_type',
      blockKey: 'PROCESS',
      label: 'Tipo de Enfornamento & Curva Térmica (Exclusivo Laminação)',
      fulfilled: Boolean(line.programming_type || master?.programming_type),
      applicable: isLaminacao,
      valueDescription: (line.programming_type ||
        master?.programming_type ||
        'Laminação') as string,
      missingMessage: 'Tipo de enfornamento não definido na Ficha Mestre da Laminação',
      navigationTarget: { mainGroup: 'OVERVIEW' },
    },
    {
      id: 'proc_lamin_bottleneck_matrix',
      blockKey: 'PROCESS',
      label: 'Matriz de Gargalos & Forno Térmico (Exclusivo Laminação)',
      fulfilled: bottleneckMatrixCount > 0,
      applicable: isLaminacao,
      valueDescription: `${bottleneckMatrixCount} registro(s) de capacidade forno/gargalo`,
      missingMessage: 'Matriz de gargalos/capacidade de forno vazia para linha de laminação',
      navigationTarget: { mainGroup: 'BOTTLENECK_MATRIX' },
    },
  ]

  // Materiais
  const materialsItems: CompletenessItem[] = [
    {
      id: 'mat_priorities',
      blockKey: 'MATERIALS',
      label: 'Prioridades de Matéria-Prima (MP)',
      fulfilled: rawMaterials.length > 0,
      applicable: true,
      valueDescription: `${rawMaterials.length} prioridade(s) de MP cadastrada(s)`,
      missingMessage: 'Prioridade de matéria-prima ausente ou não homologada',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'RAW_MATERIALS' },
    },
    {
      id: 'mat_capabilities',
      blockKey: 'MATERIALS',
      label: 'Capacidades e Famílias Homologadas (Rendimento)',
      fulfilled: capabilities.length > 0,
      applicable: true,
      valueDescription: `${capabilities.length} família(s) qualificada(s)`,
      missingMessage: 'Nenhuma família de produtos qualificada na linha',
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'IDEAL_GAUGE_SEQUENCE' },
    },
    {
      id: 'mat_blocks',
      blockKey: 'MATERIALS',
      label: 'Governança de Itens Bloqueados (Políticas de Bloqueio)',
      fulfilled: true, // Sempre aplicável; ter 0 produtos bloqueados é válido
      applicable: true,
      valueDescription: `${blockedProducts.length} restrição(ões) cadastrada(s)`,
      navigationTarget: { mainGroup: 'MASTERDATA', masterSubTab: 'BLOCKED' },
    },
  ]

  // Integrações
  const integrationsItems: CompletenessItem[] = [
    {
      id: 'int_sap_workcenter',
      blockKey: 'INTEGRATIONS',
      label: 'Centro de Trabalho SAP (Arbeitsplatz)',
      fulfilled: Boolean(line.sap_work_center || line.code),
      applicable: true,
      valueDescription: line.sap_work_center || line.code,
      missingMessage: 'Centro de Trabalho SAP não preenchido',
      navigationTarget: { mainGroup: 'GOVERNANCE' },
    },
    {
      id: 'int_sap_plant',
      blockKey: 'INTEGRATIONS',
      label: 'Vínculo com Centro SAP Oficial',
      fulfilled: Boolean(line.sap_plant_code || master?.sap_plant_code),
      applicable: true,
      valueDescription: line.sap_plant_code || master?.sap_plant_code,
      missingMessage: 'Vínculo do centro produtivo SAP não definido',
      navigationTarget: { mainGroup: 'GOVERNANCE' },
    },
    {
      id: 'int_mes',
      blockKey: 'INTEGRATIONS',
      label: 'Identificador MES / Telemetria',
      fulfilled: Boolean(line.mes_identifier || line.code),
      applicable: true,
      valueDescription: line.mes_identifier || `${line.code}_MES`,
      missingMessage: 'Identificador MES de chão de fábrica ausente',
      navigationTarget: { mainGroup: 'GOVERNANCE' },
    },
  ]

  // Função auxiliar para calcular bloco
  const buildBlock = (
    key: MasterSheetCompletenessResult['blocks'][keyof MasterSheetCompletenessResult['blocks']]['key'],
    title: string,
    description: string,
    items: CompletenessItem[],
  ): MasterSheetBlockCompleteness => {
    const applicableItems = items.filter((i) => i.applicable)
    const fulfilledItems = applicableItems.filter((i) => i.fulfilled)
    const totalApplicable = applicableItems.length
    const totalFulfilled = fulfilledItems.length
    const percentage =
      totalApplicable > 0 ? Math.round((totalFulfilled / totalApplicable) * 100) : 100

    return {
      key,
      title,
      description,
      percentage,
      totalApplicable,
      totalFulfilled,
      items: applicableItems,
    }
  }

  const blocks: Record<string, MasterSheetBlockCompleteness> = {
    IDENTIFICATION_GOVERNANCE: buildBlock(
      'IDENTIFICATION_GOVERNANCE',
      'Identificação & Governança',
      'Empresa, planta fabril, gestores operacionais e matriz de aprovação.',
      identificationItems,
    ),
    CAPACITY_CALENDAR: buildBlock(
      'CAPACITY_CALENDAR',
      'Capacidade & Calendário',
      'Taxas nominais, jornadas, turnos, turmas e paradas preventivas.',
      capacityItems,
    ),
    PROCESS: buildBlock(
      'PROCESS',
      'Processo & Parâmetros',
      'Cadências, matriz de setup, tempos de acerto, sequenciamento e gargalos.',
      processItems,
    ),
    MATERIALS: buildBlock(
      'MATERIALS',
      'Materiais & Rendimento',
      'Prioridades de matéria-prima, famílias homologadas e bloqueios.',
      materialsItems,
    ),
    INTEGRATIONS: buildBlock(
      'INTEGRATIONS',
      'Integrações (SAP / MES)',
      'Centros de trabalho, roteiros SAP e identificadores de chão de fábrica.',
      integrationsItems,
    ),
  }

  // Cálculo geral agregado
  const allApplicableItems: CompletenessItem[] = [
    ...blocks.IDENTIFICATION_GOVERNANCE.items,
    ...blocks.CAPACITY_CALENDAR.items,
    ...blocks.PROCESS.items,
    ...blocks.MATERIALS.items,
    ...blocks.INTEGRATIONS.items,
  ]

  const totalApplicable = allApplicableItems.length
  const totalFulfilled = allApplicableItems.filter((i) => i.fulfilled).length
  const percentage =
    totalApplicable > 0 ? Math.round((totalFulfilled / totalApplicable) * 100) : 100

  // Status por faixa (conforme especificação exata):
  // 0–49% "Incompleta" · 50–79% "Em preenchimento" · 80–99% "Quase completa" · 100% "Completa"
  let status: MasterSheetStatus = 'Incompleta'
  if (percentage >= 100) {
    status = 'Completa'
  } else if (percentage >= 80) {
    status = 'Quase completa'
  } else if (percentage >= 50) {
    status = 'Em preenchimento'
  } else {
    status = 'Incompleta'
  }

  // Lista de pendências em texto claro
  const pendencies = allApplicableItems.filter((i) => !i.fulfilled)

  return {
    lineId: line.id,
    lineCode: line.code,
    lineName: line.name,
    lineType: isLaminacao ? 'Laminação' : line.programming_type || 'Padrão',
    percentage,
    status,
    totalApplicable,
    totalFulfilled,
    blocks: blocks as any,
    pendencies,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Consulta backend e calcula completude para a linha informada.
 * Utiliza dados reais das coleções existentes (Ficha Mestre, Matriz de Setup,
 * line_productivity_rates, line_raw_material_priorities, line_bottleneck_matrix, etc.).
 */
export async function getMasterSheetCompleteness(
  lineId: string,
  options?: { forceRefresh?: boolean },
): Promise<MasterSheetCompletenessResult> {
  if (!options?.forceRefresh) {
    const cached = completenessCache.get(lineId)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.result
    }
  }

  // Carrega visão da linha com todas as coleções vinculadas
  // Importação tardia do lineMasterService para evitar dependência circular
  const { lineMasterService } = await import('@/services/line-master')
  const overview = await lineMasterService.getLineOverview(lineId)

  // Consulta contagem de registros na matriz de gargalos (line_bottleneck_matrix)
  let bottleneckCount = 0
  try {
    const cleanLineCode = (overview.line.code || '').trim().toUpperCase()
    const records = await pb.collection('line_bottleneck_matrix').getList(1, 10, {
      filter: `line_code = '${cleanLineCode}' && status = 'VIGENTE'`,
    })
    bottleneckCount = records.totalItems || records.items.length
  } catch {
    bottleneckCount = 0
  }

  const result = calculateCompletenessFromOverview(overview, bottleneckCount)

  completenessCache.set(lineId, {
    timestamp: Date.now(),
    result,
  })

  return result
}
