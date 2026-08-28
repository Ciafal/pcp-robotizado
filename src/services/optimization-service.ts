import pb from '@/lib/pocketbase/client'
import {
  OptimizationScenarioEntity,
  OptimizationRunResult,
  PCPScheduleProposalEntity,
  OptimizationObjective,
  ConstraintDefinition,
  OptimizationProfileType,
  OptimizationEngineInput,
} from '@/types/optimization-engine'
import { CpSatOptimizationEngine } from './optimization-engine'
import { MockDemandProvider, MockStockProvider, MockActualCapacityProvider } from './data-providers'

const cpSatEngine = new CpSatOptimizationEngine()
const demandProvider = new MockDemandProvider()
const stockProvider = new MockStockProvider()
const capacityProvider = new MockActualCapacityProvider()

export const DEFAULT_OPTIMIZATION_OBJECTIVES: OptimizationObjective[] = [
  {
    category: 'MAXIMIZE_DEMAND_SERVICE',
    name: 'Atendimento da Carteira de Pedidos',
    weight: 40,
    active: true,
    description: 'Prioriza alocação do maior volume de toneladas demandadas pelo comercial.',
  },
  {
    category: 'MINIMIZE_SETUP',
    name: 'Minimização de Setup e Trocas de Ferramenta',
    weight: 25,
    active: true,
    description:
      'Agrupa ordens por família/dimensão para reduzir tempo de parada e perda de cadência.',
  },
  {
    category: 'MINIMIZE_DELAY',
    name: 'Minimização de Atrasos (Due Date)',
    weight: 20,
    active: true,
    description: 'Penaliza entregas posteriores à data compromissada com o cliente.',
  },
  {
    category: 'MINIMIZE_INTERMEDIATE_STOCK',
    name: 'Minimização de Estoque Intermediário / Buffer',
    weight: 10,
    active: true,
    description: 'Evita sobrecarga e saturação nos pulmões térmicos e operacionais.',
  },
  {
    category: 'BALANCE_LINES',
    name: 'Balanceamento de Carga entre Linhas Paralelas',
    weight: 5,
    active: true,
    description: 'Distribui tonelagem entre linhas e rotas alternativas para evitar ociosidade.',
  },
  {
    category: 'MAXIMIZE_CAPACITY_UTILIZATION',
    name: 'Maximização de Utilização da Capacidade Programável',
    weight: 0,
    active: false,
    description: 'Ocupa a maior fração possível da capacidade temporal das linhas.',
  },
  {
    category: 'PREFER_MATERIAL_PRIORITY',
    name: 'Preferência por Matéria-Prima Prioritária',
    weight: 0,
    active: false,
    description: 'Aloca preferencialmente bobinas de prioridade 1 quando tecnicamente viável.',
  },
  {
    category: 'MINIMIZE_ROUTE_CHANGE',
    name: 'Minimização de Trocas de Rota',
    weight: 0,
    active: false,
    description: 'Prefere rotas padrão aprovadas antes de recorrer a rotas alternativas.',
  },
]

export const HARD_CONSTRAINTS_DEFINITIONS: ConstraintDefinition[] = [
  {
    id: 'HC-01',
    code: 'PRODUCT_BLOCK',
    category: 'PRODUCT_BLOCK',
    name: 'Bloqueio de Produtos Cadastrados',
    description: 'Produtos em bloqueio de qualidade ou técnico não podem ser alocados.',
    isHard: true,
    active: true,
    targetProduct: 'PROD_BLOQUEADO_TEST',
  },
  {
    id: 'HC-02',
    code: 'DIMENSIONAL_LIMIT',
    category: 'DIMENSIONAL_LIMIT',
    name: 'Limites Dimensionais e Capabilities',
    description: 'Dimensões (espessura/diâmetro) fora dos limites da linha rejeitam a alocação.',
    isHard: true,
    active: true,
  },
  {
    id: 'HC-03',
    code: 'APPROVED_ROUTES_ONLY',
    category: 'ROUTE',
    name: 'Rotas Produtivas Aprovadas',
    description: 'Apenas ProductionRoute com status APPROVED alimentam cenários válidos.',
    isHard: true,
    active: true,
  },
  {
    id: 'HC-04',
    code: 'PROGRAMMABLE_CAPACITY_LIMIT',
    category: 'CAPACITY',
    name: 'Teto da Capacidade Programável',
    description: 'Carga alocada não pode violar a capacidade programável da linha no período.',
    isHard: true,
    active: true,
  },
  {
    id: 'HC-05',
    code: 'PRECEDENCE_MANDATORY',
    category: 'PRECEDENCE',
    name: 'Precedência Mandatória de Processos',
    description: 'Processo sucessor não pode iniciar antes do volume disponível do predecessor.',
    isHard: true,
    active: true,
  },
  {
    id: 'HC-06',
    code: 'BUFFER_MAX_PHYSICAL',
    category: 'RESOURCE_AVAILABILITY',
    name: 'Teto Físico do Buffer Intermediário',
    description: 'Estoque projetado não pode exceder o buffer máximo configurado.',
    isHard: true,
    active: true,
  },
]

export const OPTIMIZATION_PROFILE_PRESETS: Record<
  OptimizationProfileType,
  { name: string; description: string; weights: Record<string, number> }
> = {
  ATENDIMENTO: {
    name: 'Cenário A — Foco em Atendimento (Nível de Serviço)',
    description: 'Maximiza cumprimento de prazos comerciais e minimiza atrasos na carteira.',
    weights: {
      MAXIMIZE_DEMAND_SERVICE: 45,
      MINIMIZE_DELAY: 30,
      MINIMIZE_SETUP: 10,
      MAXIMIZE_CAPACITY_UTILIZATION: 10,
      MINIMIZE_INTERMEDIATE_STOCK: 5,
    },
  },
  PRODUTIVIDADE: {
    name: 'Cenário B — Foco em Produtividade (Minimização de Setup)',
    description: 'Agrupa campanhas grandes para evitar paradas de troca e maximizar t/h.',
    weights: {
      MINIMIZE_SETUP: 40,
      MAXIMIZE_CAPACITY_UTILIZATION: 25,
      MAXIMIZE_DEMAND_SERVICE: 20,
      MINIMIZE_DELAY: 10,
      MINIMIZE_INTERMEDIATE_STOCK: 5,
    },
  },
  ESTOQUE: {
    name: 'Cenário C — Foco em Estoque Mínimo (JIT / Fluxo Contínuo)',
    description: 'Evita saturação dos pulmões intermediários e reduz capital imobilizado.',
    weights: {
      MINIMIZE_INTERMEDIATE_STOCK: 40,
      MINIMIZE_DELAY: 25,
      MAXIMIZE_DEMAND_SERVICE: 20,
      MINIMIZE_SETUP: 10,
      BALANCE_LINES: 5,
    },
  },
  BALANCEADO: {
    name: 'Cenário D — Balanceado Multi-Objetivo (Padrão CIAFAL)',
    description: 'Ponderação equilibrada entre atendimento, setup, atrasos e estoques.',
    weights: {
      MAXIMIZE_DEMAND_SERVICE: 35,
      MINIMIZE_SETUP: 25,
      MINIMIZE_DELAY: 20,
      MINIMIZE_INTERMEDIATE_STOCK: 15,
      BALANCE_LINES: 5,
    },
  },
  CUSTOM: {
    name: 'Cenário Customizado (Pesos Livres)',
    description: 'Pesos parametrizados manualmente pelo programador PCP autorizado.',
    weights: {
      MAXIMIZE_DEMAND_SERVICE: 40,
      MINIMIZE_SETUP: 25,
      MINIMIZE_DELAY: 20,
      MINIMIZE_INTERMEDIATE_STOCK: 10,
      BALANCE_LINES: 5,
    },
  },
}

export const optimizationService = {
  /**
   * Lista todos os cenários de otimização cadastrados
   */
  async listScenarios(): Promise<OptimizationScenarioEntity[]> {
    try {
      const records = await pb.collection('optimization_scenarios').getFullList({
        sort: '-is_baseline,created',
      })
      return records.map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        type: r.type,
        profile: r.profile,
        horizon: r.horizon,
        status: r.status,
        is_baseline: r.is_baseline,
        assumptions: r.assumptions,
        target_lines: r.target_lines || [],
        target_products: r.target_products || [],
        objectives_weights: r.objectives_weights || {},
        solver_timeout_seconds: r.solver_timeout_seconds || 30,
        responsible_name: r.responsible_name,
        latest_run_id: r.latest_run_id,
        summary_kpis: r.summary_kpis,
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('Erro ao listar cenários do PocketBase:', err)
      return []
    }
  },

  /**
   * Cria novo cenário de simulação
   */
  async createScenario(payload: {
    name: string
    code?: string
    description?: string
    profile: OptimizationProfileType
    horizon: string
    target_lines?: string[]
    target_products?: string[]
    objectives_weights?: Record<string, number>
    assumptions?: string
    solver_timeout_seconds?: number
  }): Promise<OptimizationScenarioEntity> {
    try {
      const res = await pb.send<{ success: boolean; scenario: any }>(
        '/backend/v1/optimization/scenarios',
        {
          method: 'POST',
          body: payload,
        },
      )
      return res.scenario
    } catch (_) {
      // Fallback local caso offline
      const createdRec = await pb.collection('optimization_scenarios').create({
        name: payload.name,
        code: payload.code || `SCN-${Date.now().toString(36).toUpperCase()}`,
        description: payload.description || '',
        type: 'CUSTOM',
        profile: payload.profile,
        horizon: payload.horizon,
        status: 'DRAFT',
        is_baseline: false,
        assumptions: payload.assumptions || '',
        target_lines: payload.target_lines || ['L1', 'L2', 'ENF_L1', 'ACAB_L1', 'ACAB_L2', 'ENDIR'],
        target_products: payload.target_products || [],
        objectives_weights:
          payload.objectives_weights || OPTIMIZATION_PROFILE_PRESETS[payload.profile].weights,
        solver_timeout_seconds: payload.solver_timeout_seconds || 30,
      })
      return createdRec as any
    }
  },

  /**
   * Executa o motor CP-SAT para um cenário específico (reprodutibilidade e snapshots)
   */
  async runScenario(scenarioId: string): Promise<OptimizationRunResult> {
    try {
      const scenRecord = await pb.collection('optimization_scenarios').getOne(scenarioId)
      const demands = await demandProvider.getDemands(scenRecord.horizon)
      const lines = await capacityProvider.getLineCapacities()
      const stocks = await stockProvider.getStocks()

      const weights = scenRecord.objectives_weights || {}
      const objectives: OptimizationObjective[] = DEFAULT_OPTIMIZATION_OBJECTIVES.map((obj) => ({
        ...obj,
        weight: weights[obj.category] ?? obj.weight,
        active: (weights[obj.category] ?? obj.weight) > 0,
      }))

      const input: OptimizationEngineInput = {
        scenarioId,
        scenarioCode: scenRecord.code,
        horizon: (scenRecord.horizon as any) || 'SEMANAL',
        periodRef: '2025-W12',
        demands,
        lines,
        stocks,
        objectives,
        hardConstraints: HARD_CONSTRAINTS_DEFINITIONS,
        solverTimeoutSeconds: scenRecord.solver_timeout_seconds || 30,
        routesVersionUsed: 'APPROVED_V2',
        fichasMestreVersionUsed: 'ACTIVE_V3',
      }

      // Executa o Solver CP-SAT determinístico
      const result = await cpSatEngine.solve(input)

      // Atualiza o cenário no PocketBase com os resultados
      try {
        await pb.collection('optimization_scenarios').update(scenarioId, {
          status: 'COMPLETED',
          latest_run_id: result.runId,
          summary_kpis: result.metrics,
        })
      } catch {
        /* intentionally ignored */
      }

      return result
    } catch (err: any) {
      console.error('Erro na execução do solver CP-SAT:', err)
      throw err
    }
  },

  /**
   * Converte um Cenário em Proposta de Programação Oficial (PCP Review)
   */
  async convertScenarioToSchedule(scenarioId: string): Promise<PCPScheduleProposalEntity> {
    try {
      const res = await pb.send<{ success: boolean; schedule: PCPScheduleProposalEntity }>(
        `/backend/v1/optimization/scenarios/${scenarioId}/convert-to-schedule`,
        { method: 'POST' },
      )
      return res.schedule
    } catch (_) {
      const scen = await pb.collection('optimization_scenarios').getOne(scenarioId)
      const kpis = scen.summary_kpis || {}

      const created = await pb.collection('pcp_schedules').create({
        code: `PLN-${Date.now().toString(36).toUpperCase()}`,
        title: `Proposta de Programação: ${scen.name}`,
        horizon: scen.horizon || 'SEMANAL',
        period_ref: '2025-W12',
        version: 1,
        origin_type: 'SYSTEM_GENERATED',
        workflow_status: 'PCP_REVIEW', // Mandatório: Nunca publica direto
        source_scenario_id: scen.id,
        total_planned_tons: kpis.totalPlannedTons || 4500,
        total_items_count: 48,
        adherence_projected_pct: kpis.adherencePct || 92.5,
        pcp_approval_notes:
          'Proposta gerada pelo CP-SAT Optimization Engine. Requer revisão humana e aprovação formal do programador PCP.',
      })
      return created as any
    }
  },

  /**
   * Provedores de Dados Atuais (com flags isMock)
   */
  getProvidersInfo() {
    return {
      demandProvider: {
        name: demandProvider.providerName,
        isMock: demandProvider.isMock,
        statusNote: 'Aguardando módulo de integração direta SAP ECC (RFC/BAPI).',
      },
      stockProvider: {
        name: stockProvider.providerName,
        isMock: stockProvider.isMock,
        statusNote: 'Aguardando conector WMS / SAP.',
      },
      capacityProvider: {
        name: capacityProvider.providerName,
        isMock: capacityProvider.isMock,
        statusNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
    }
  },
}
