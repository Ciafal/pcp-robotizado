// Definições dos 8 Cenários Oficiais e Perfis de Teste do Modo de Homologação (Item 21)

import {
  ProductOrder,
  ProductionProcessNode,
  BottleneckItem,
  BufferStatus,
  OperationalAlert,
  OperationalEvent,
} from '@/types/control-tower'
import {
  mockCentralOrders,
  mockProcessNodes,
  mockBottlenecks,
  mockBuffers,
  mockOperationalAlerts,
  mockOperationalEvents,
} from '@/data/control-tower-mock'

export interface HomologationScenario {
  id: string
  code: string
  title: string
  shortDesc: string
  fullDesc: string
  expectedOutcome: string
  targetLine: string
  kpis: {
    adherencePct: number
    delaysCount: number
    activeBottlenecks: number
    tonnageDelta: number
  }
  ordersOverride?: ProductOrder[]
  nodesOverride?: ProductionProcessNode[]
  bottlenecksOverride?: BottleneckItem[]
  buffersOverride?: BufferStatus[]
  alertsOverride?: OperationalAlert[]
}

export interface HomologationUserProfile {
  id: string
  name: string
  roleName: string
  email: string
  roleKey:
    | 'PCP_ADMIN'
    | 'PCP_PROGRAMMER'
    | 'LINE_MANAGER'
    | 'PRODUCTION_VIEWER'
    | 'AUDITOR'
    | 'DIRECTOR'
  description: string
  accessibleLines: string[]
  canSimulate: boolean
  canApprovePCP: boolean
  canApproveManager: boolean
  canEditMaster: boolean
  canAdminAccess: boolean
}

export const HOMOLOGATION_USER_PROFILES: HomologationUserProfile[] = [
  {
    id: 'usr-prog-l1',
    name: 'Carlos Silva',
    roleName: 'Programador PCP Linha 1',
    email: 'programador.pcp@ciafal.com.br',
    roleKey: 'PCP_PROGRAMMER',
    description: 'Responsável pelo sequenciamento fino e simulações na Laminação L1.',
    accessibleLines: ['L1', 'ENF_L1', 'ACAB_L1'],
    canSimulate: true,
    canApprovePCP: true,
    canApproveManager: false,
    canEditMaster: false,
    canAdminAccess: false,
  },
  {
    id: 'usr-prog-l2',
    name: 'Juliana Lima',
    roleName: 'Programador PCP Linha 2',
    email: 'programador.l2@ciafal.com.br',
    roleKey: 'PCP_PROGRAMMER',
    description: 'Sequenciamento de perfis, tubos retangulares e conformação contínua L2.',
    accessibleLines: ['L2', 'ACAB_L2', 'ENDIR'],
    canSimulate: true,
    canApprovePCP: true,
    canApproveManager: false,
    canEditMaster: false,
    canAdminAccess: false,
  },
  {
    id: 'usr-sup-prod',
    name: 'Marcos Santos',
    roleName: 'Supervisor de Produção',
    email: 'gestor.l1@ciafal.com.br',
    roleKey: 'LINE_MANAGER',
    description: 'Gestor Titular da Linha 1. Aprova sequenciamento oficial na esteira fase 2.',
    accessibleLines: ['L1', 'ENF_L1', 'ACAB_L1'],
    canSimulate: false,
    canApprovePCP: false,
    canApproveManager: true,
    canEditMaster: true,
    canAdminAccess: false,
  },
  {
    id: 'usr-ger-prod',
    name: 'Roberto Alves',
    roleName: 'Gerente de Produção',
    email: 'gerente.fabrica@ciafal.com.br',
    roleKey: 'LINE_MANAGER',
    description: 'Gestão macro industrial, coordenação de linhas e mediação de conflitos.',
    accessibleLines: ['L1', 'L2', 'ENDIR', 'RETRAB'],
    canSimulate: true,
    canApprovePCP: true,
    canApproveManager: true,
    canEditMaster: true,
    canAdminAccess: false,
  },
  {
    id: 'usr-direcao',
    name: 'Diretoria Industrial CIAFAL',
    roleName: 'Direção Executiva',
    email: 'diretoria@ciafal.com.br',
    roleKey: 'DIRECTOR',
    description: 'Acompanhamento executivo consolidado, KPIs agregados e visões estratégicas.',
    accessibleLines: ['ALL'],
    canSimulate: false,
    canApprovePCP: false,
    canApproveManager: false,
    canEditMaster: false,
    canAdminAccess: false,
  },
  {
    id: 'usr-operador',
    name: 'Operador de Linha (Chão de Fábrica)',
    roleName: 'Operador Industrial',
    email: 'operador.fabrica@ciafal.com.br',
    roleKey: 'PRODUCTION_VIEWER',
    description: 'Consulta da ordem Agora/Próximo/Depois no posto de trabalho. Sem edição.',
    accessibleLines: ['L1'],
    canSimulate: false,
    canApprovePCP: false,
    canApproveManager: false,
    canEditMaster: false,
    canAdminAccess: false,
  },
  {
    id: 'usr-admin',
    name: 'Administrador Master PCP',
    roleName: 'Administrador do Sistema',
    email: 'ciafal@ciafal.com.br',
    roleKey: 'PCP_ADMIN',
    description: 'Acesso irrestrito a configurações, parametrização de Ficha Mestre e RBAC.',
    accessibleLines: ['ALL'],
    canSimulate: true,
    canApprovePCP: true,
    canApproveManager: true,
    canEditMaster: true,
    canAdminAccess: true,
  },
]

export const HOMOLOGATION_SCENARIOS: HomologationScenario[] = [
  {
    id: 'scen-1-normal',
    code: 'CEN-01',
    title: '1. Operação Normal Estabilizada',
    shortDesc: 'Cadência nominal atingida em todas as linhas sem paradas críticas.',
    fullDesc:
      'Cenário de linha de base com operação balanceada em todas as unidades: L1 em 118 t/h, L2 operando conforme planejado, buffers térmicos controlados entre 40% e 70%.',
    expectedOutcome: 'Aderência > 92%, zero alertas críticos, zero ordens bloqueadas.',
    targetLine: 'ALL',
    kpis: {
      adherencePct: 94.5,
      delaysCount: 0,
      activeBottlenecks: 0,
      tonnageDelta: +150,
    },
    ordersOverride: mockCentralOrders.map((o) => ({
      ...o,
      delayMinutes: 0,
      alertsCount: 0,
      status: o.status === 'BLOCKED' ? 'IN_PRODUCTION' : o.status,
    })),
  },
  {
    id: 'scen-2-parada-l1',
    code: 'CEN-02',
    title: '2. Parada Extraordinária Linha L1 (4 horas)',
    shortDesc: 'Interrupção mecânica imprevista de 4h na Linha 1 de Laminação.',
    fullDesc:
      'Simulação de quebra mecânica nos rolamentos da gaiola F4. Propagação a jusante no buffer L1->Acabamento (esgotamento após 3h) e atraso acumulado em 3 OPs de tubos.',
    expectedOutcome:
      'Gera alerta crítico ALT-L1-STOP, atraso projetado +4h, recomendação de re-sequenciamento.',
    targetLine: 'L1',
    kpis: {
      adherencePct: 76.0,
      delaysCount: 3,
      activeBottlenecks: 2,
      tonnageDelta: -470,
    },
    ordersOverride: mockCentralOrders.map((o) =>
      o.lineCode === 'L1'
        ? { ...o, delayMinutes: o.delayMinutes + 240, status: 'BLOCKED' as const }
        : o,
    ),
  },
  {
    id: 'scen-3-gargalo-acab-l1',
    code: 'CEN-03',
    title: '3. Gargalo Acabamento L1 (Sobrecarga de Buffer)',
    shortDesc:
      'Setor de corte e bisotamento operando em capacidade reduzida gerando fila de 320 t.',
    fullDesc:
      'L1 laminando a 118 t/h enquanto o Acabamento L1 processa a 75 t/h. O buffer intermediário atinge 280 t (limite máx 300 t) com iminência de parada por falta de espaço.',
    expectedOutcome:
      'Alerta de saturação de buffer, sugestão IA para desacelerar L1 ou desviar para célula auxiliar.',
    targetLine: 'ACAB_L1',
    kpis: {
      adherencePct: 83.2,
      delaysCount: 2,
      activeBottlenecks: 1,
      tonnageDelta: -180,
    },
  },
  {
    id: 'scen-4-mpl-insuficiente',
    code: 'CEN-04',
    title: '4. Matéria-Prima Insuficiente (MPL2 Bobinas)',
    shortDesc: 'Déficit de 182 t na bobina BQ 3.00mm necessária para OP-2026-1014.',
    fullDesc:
      'Atraso na liberação fiscal de lote pelo fornecedor externo. A Linha 2 fica impedida de iniciar a ordem programada para 14:30 sem que haja matéria-prima no pátio.',
    expectedOutcome:
      'Alerta de falta de insumo, sugestão IA para inversão imediata de famílias (A ➔ B ➔ C).',
    targetLine: 'L2',
    kpis: {
      adherencePct: 81.0,
      delaysCount: 2,
      activeBottlenecks: 1,
      tonnageDelta: -125,
    },
  },
  {
    id: 'scen-5-pedido-urgente',
    code: 'CEN-05',
    title: '5. Inserção de Pedido Urgente (Prioridade 1)',
    shortDesc: 'Ordem emergencial OV-990001 (500 t) de Tubos Petrobrás inserida no turno atual.',
    fullDesc:
      'Necessidade de encaixe prioritário de 500 t com entrega em 12 horas. O motor de sequenciamento deve recalcular trocas de ferramentas (setups) e adiar ordens de menor criticidade.',
    expectedOutcome:
      'Simulação D&D em memória, cálculo do aumento de setup (+35 min) e impacto em 2 clientes.',
    targetLine: 'L1',
    kpis: {
      adherencePct: 89.0,
      delaysCount: 1,
      activeBottlenecks: 1,
      tonnageDelta: +500,
    },
  },
  {
    id: 'scen-6-sobrecarga-capacidade',
    code: 'CEN-06',
    title: '6. Sobrecarga de Capacidade Geral (>100%)',
    shortDesc: 'Carteira diária de 6.200 t contra capacidade instalada nominal de 4.820 t.',
    fullDesc:
      'Pico de demanda contratual com saturação simultânea em L1, L2 e Endireitadeira. O mapa de integração e o heatmap exibem células em vermelho crítico (>115% de ocupação).',
    expectedOutcome:
      'Heatmap alerta sobrecarga, balanceador recomenda alocação de terceiro turno extraordinário.',
    targetLine: 'ALL',
    kpis: {
      adherencePct: 71.5,
      delaysCount: 6,
      activeBottlenecks: 4,
      tonnageDelta: +1380,
    },
  },
  {
    id: 'scen-7-alteracao-manual',
    code: 'CEN-07',
    title: '7. Alteração Manual de Sequência pelo Programador',
    shortDesc: 'Programador PCP move Família B antes da Família A no Gantt.',
    fullDesc:
      'Simulação de reordenação direta de blocos com cálculo imediato do impacto em setups (+2 trocas), estoques intermediários e liberação técnica na esteira fase 1.',
    expectedOutcome:
      'Simulação temporária mantida isolada sem alterar programação oficial até aprovação.',
    targetLine: 'L2',
    kpis: {
      adherencePct: 88.5,
      delaysCount: 1,
      activeBottlenecks: 1,
      tonnageDelta: +80,
    },
  },
  {
    id: 'scen-8-reprogramacao-dia',
    code: 'CEN-08',
    title: '8. Reprogramação Completa do Dia (Turnos 1, 2 e 3)',
    shortDesc: 'Regeneração total do sequenciamento de 24h via motor de otimização IA.',
    fullDesc:
      'Reprogramação integrada de 14 ordens, recalibrando cadências térmicas do forno, agrupando famílias por bitola para minimizar tempos mortos de matriz e nivelando buffers.',
    expectedOutcome:
      'Gera nova versão v2.5 pendente de aprovação de dois gestores e auditoria completa.',
    targetLine: 'ALL',
    kpis: {
      adherencePct: 96.0,
      delaysCount: 0,
      activeBottlenecks: 1,
      tonnageDelta: +290,
    },
  },
]
