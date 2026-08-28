// Contratos e Camada de Serviço de Integração SAP para a Central PCP Robotizado CIAFAL

import {
  ProductOrder,
  ProductionProcessNode,
  BottleneckItem,
  BufferStatus,
  FlowSankeyStep,
  OperationalEvent,
  OperationalAlert,
  ScenarioDefinition,
  ImpactAnalysis,
  VersionHistoryItem,
} from '@/types/control-tower'
import {
  mockCentralOrders,
  mockProcessNodes,
  mockBottlenecks,
  mockBuffers,
  mockFlowSteps,
  mockOperationalEvents,
  mockOperationalAlerts,
  mockScenarios,
  mockImpactAnalysis,
  mockVersionHistory,
} from '@/data/control-tower-mock'

/**
 * CONTRATOS OFICIAIS DE INTEGRAÇÃO SAP (Doc Técnico item 19 e 20)
 */

export interface SapContractField {
  campo: string
  tipo: string
  origem: string
  frequencia: string
  descricao: string
  usoNaCentral: string
}

export interface SapIntegrationContract {
  id: string
  nome: string
  tabelaSapOuRFC: string
  frequenciaPadrao: string
  direcao: 'INBOUND' | 'OUTBOUND' | 'BIDIRECIONAL'
  campos: SapContractField[]
}

export const SAP_INTEGRATION_CONTRACTS: SapIntegrationContract[] = [
  {
    id: 'sap-masterplan',
    nome: 'Planejamento Mestre de Produção',
    tabelaSapOuRFC: 'RFC /CIAFAL/PCP_MASTER_PLAN (PLAF / MD04)',
    frequenciaPadrao: 'A cada 6 horas / Diário 06:00',
    direcao: 'INBOUND',
    campos: [
      {
        campo: 'PLNUM',
        tipo: 'CHAR(10)',
        origem: 'PLAF',
        frequencia: '6h',
        descricao: 'Número da ordem planejada',
        usoNaCentral: 'Id base no horizonte mestre',
      },
      {
        campo: 'MATNR',
        tipo: 'CHAR(18)',
        origem: 'MARA/PLAF',
        frequencia: '6h',
        descricao: 'Código do material/produto',
        usoNaCentral: 'Agrupamento por família e restrição',
      },
      {
        campo: 'WERKS',
        tipo: 'CHAR(4)',
        origem: 'T001W',
        frequencia: '6h',
        descricao: 'Centro produtivo (ex.: 1000)',
        usoNaCentral: 'Isolamento por planta',
      },
      {
        campo: 'GSMNG',
        tipo: 'DEC(13,3)',
        origem: 'PLAF',
        frequencia: '6h',
        descricao: 'Quantidade total planejada (t)',
        usoNaCentral: 'Cálculo de carga x capacidade',
      },
      {
        campo: 'PSTTR',
        tipo: 'DATS',
        origem: 'PLAF',
        frequencia: '6h',
        descricao: 'Data início planejada',
        usoNaCentral: 'Horizonte de sequenciamento',
      },
      {
        campo: 'PEDTR',
        tipo: 'DATS',
        origem: 'PLAF',
        frequencia: '6h',
        descricao: 'Data término planejada',
        usoNaCentral: 'SLA de entrega e atrasos',
      },
    ],
  },
  {
    id: 'sap-prod-orders',
    nome: 'Ordens de Produção Liberadas',
    tabelaSapOuRFC: 'RFC /CIAFAL/PCP_ORDERS (AFKO / AFPO / AUFK)',
    frequenciaPadrao: 'Em tempo real / A cada 5 min',
    direcao: 'INBOUND',
    campos: [
      {
        campo: 'AUFNR',
        tipo: 'CHAR(12)',
        origem: 'AFKO',
        frequencia: '5m',
        descricao: 'Número da Ordem de Produção (OP)',
        usoNaCentral: 'Chave primária da Ordem no Gantt/Kanban',
      },
      {
        campo: 'GAMNG',
        tipo: 'DEC(13,3)',
        origem: 'AFKO',
        frequencia: '5m',
        descricao: 'Quantidade total da ordem (t)',
        usoNaCentral: 'plannedTons',
      },
      {
        campo: 'IGMNG',
        tipo: 'DEC(13,3)',
        origem: 'AFPO',
        frequencia: '5m',
        descricao: 'Quantidade já apontada/produzida (t)',
        usoNaCentral: 'producedTons',
      },
      {
        campo: 'ARBPL',
        tipo: 'CHAR(8)',
        origem: 'CRHD/AFVC',
        frequencia: '5m',
        descricao: 'Centro de Trabalho (Linha/Recurso)',
        usoNaCentral: 'lineCode / processCode',
      },
      {
        campo: 'GSTRP',
        tipo: 'DATS/TIMS',
        origem: 'AFKO',
        frequencia: '5m',
        descricao: 'Início programado oficial',
        usoNaCentral: 'plannedStart',
      },
      {
        campo: 'GLTRP',
        tipo: 'DATS/TIMS',
        origem: 'AFKO',
        frequencia: '5m',
        descricao: 'Término programado oficial',
        usoNaCentral: 'plannedEnd',
      },
      {
        campo: 'STAT',
        tipo: 'CHAR(4)',
        origem: 'JEST',
        frequencia: '5m',
        descricao: 'Status da ordem (LIB, TECO, IMPR)',
        usoNaCentral: 'status',
      },
      {
        campo: 'KUNNR',
        tipo: 'CHAR(10)',
        origem: 'VBAK',
        frequencia: '5m',
        descricao: 'Cliente da Ordem de Venda',
        usoNaCentral: 'customerName',
      },
      {
        campo: 'VBELN',
        tipo: 'CHAR(10)',
        origem: 'AFPO',
        frequencia: '5m',
        descricao: 'Ordem de Venda vinculada',
        usoNaCentral: 'salesOrderId',
      },
      {
        campo: 'POSNR',
        tipo: 'NUMC(6)',
        origem: 'AFPO',
        frequencia: '5m',
        descricao: 'Item da Ordem de Venda',
        usoNaCentral: 'salesOrderItem',
      },
    ],
  },
  {
    id: 'sap-zpp003-stops',
    nome: 'Apontamento de Paradas Industriais ZPP003',
    tabelaSapOuRFC: 'RFC /CIAFAL/ZPP003_STOP_EVENTS (ZPP003 / IFLOT)',
    frequenciaPadrao: 'Em tempo real / Ao registrar parada no SAP',
    direcao: 'INBOUND',
    campos: [
      {
        campo: 'ZID_PARADA',
        tipo: 'CHAR(20)',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Identificador único do evento de parada',
        usoNaCentral: 'id do evento de parada',
      },
      {
        campo: 'ARBPL',
        tipo: 'CHAR(8)',
        origem: 'CRHD',
        frequencia: 'Realtime',
        descricao: 'Centro de trabalho / Linha parada',
        usoNaCentral: 'lineCode',
      },
      {
        campo: 'EQUNR',
        tipo: 'CHAR(18)',
        origem: 'EQUI',
        frequencia: 'Realtime',
        descricao: 'Equipamento específico parado',
        usoNaCentral: 'Sub-recurso / Gargalo',
      },
      {
        campo: 'MOTIVO_COD',
        tipo: 'CHAR(4)',
        origem: 'ZTP_MOTIVOS',
        frequencia: 'Realtime',
        descricao: 'Código de motivo da parada',
        usoNaCentral: 'rootCause / category',
      },
      {
        campo: 'CATEGORIA',
        tipo: 'CHAR(15)',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'MECANICA, ELETRICA, OPERACIONAL, FALTA_MP',
        usoNaCentral: 'classification',
      },
      {
        campo: 'DT_INICIO',
        tipo: 'DATS',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Data de início da parada',
        usoNaCentral: 'timestamp de início',
      },
      {
        campo: 'HR_INICIO',
        tipo: 'TIMS',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Hora de início da parada',
        usoNaCentral: 'Hora de início',
      },
      {
        campo: 'DT_FIM',
        tipo: 'DATS',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Data de término (se concluída)',
        usoNaCentral: 'Término real',
      },
      {
        campo: 'HR_FIM',
        tipo: 'TIMS',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Hora de término (se concluída)',
        usoNaCentral: 'Hora de término',
      },
      {
        campo: 'DURACAO_MIN',
        tipo: 'INT4',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Duração em minutos',
        usoNaCentral: 'deltaHours de atraso',
      },
      {
        campo: 'TURNO',
        tipo: 'CHAR(2)',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'Turno operacional (T1, T2, T3)',
        usoNaCentral: 'shift',
      },
      {
        campo: 'STATUS_PARADA',
        tipo: 'CHAR(10)',
        origem: 'ZPP003',
        frequencia: 'Realtime',
        descricao: 'ABERTA, EM_ANDAMENTO, ENCERRADA',
        usoNaCentral: 'LineStatus',
      },
    ],
  },
  {
    id: 'sap-inventory',
    nome: 'Posição de Estoques e Buffers Intermediários',
    tabelaSapOuRFC: 'RFC /CIAFAL/PCP_INVENTORY (MARD / MCHB)',
    frequenciaPadrao: 'A cada 15 min',
    direcao: 'INBOUND',
    campos: [
      {
        campo: 'LGORT',
        tipo: 'CHAR(4)',
        origem: 'MARD',
        frequencia: '15m',
        descricao: 'Depósito / Pátio / Buffer físico',
        usoNaCentral: 'Buffer ID',
      },
      {
        campo: 'MATNR',
        tipo: 'CHAR(18)',
        origem: 'MARD',
        frequencia: '15m',
        descricao: 'Código do material armazenado',
        usoNaCentral: 'Matéria-prima ou intermediário',
      },
      {
        campo: 'LABST',
        tipo: 'DEC(13,3)',
        origem: 'MARD',
        frequencia: '15m',
        descricao: 'Estoque de utilização livre (t)',
        usoNaCentral: 'currentStockTons',
      },
      {
        campo: 'INSME',
        tipo: 'DEC(13,3)',
        origem: 'MARD',
        frequencia: '15m',
        descricao: 'Estoque em controle de qualidade (t)',
        usoNaCentral: 'reworkTons',
      },
    ],
  },
]

/**
 * ESTRUTURA DO ADAPTADOR ZPP003 (Item 20)
 */
export interface SapZpp003Record {
  zid_parada: string
  arbpl: string
  equnr?: string
  motivo_cod: string
  motivo_desc: string
  categoria: 'MECANICA' | 'ELETRICA' | 'OPERACIONAL' | 'FALTA_MP' | 'QUALIDADE' | 'SETUP_EXCESSIVO'
  dt_inicio: string // YYYY-MM-DD
  hr_inicio: string // HH:mm:ss
  dt_fim?: string
  hr_fim?: string
  duracao_min?: number
  turno: 'T1' | 'T2' | 'T3'
  status_parada: 'ABERTA' | 'EM_ANDAMENTO' | 'ENCERRADA'
  observacao?: string
}

export interface IntegrationLogEntry {
  id: string
  origem: 'SAP_RFC_ZPP003' | 'SAP_RFC_ORDERS' | 'SAP_RFC_INVENTORY' | 'SAP_RFC_MASTERPLAN'
  dataHora: string
  tipo: 'INBOUND' | 'OUTBOUND' | 'VALIDACAO' | 'ERRO_TECNICO'
  quantidadeRegistros: number
  sucesso: boolean
  erroDetalhe?: string
  tempoProcessamentoMs: number
}

/**
 * INTERFACES DOS PROVIDERS COM FALLBACK (Item 18)
 */
export interface ProductionDataProvider {
  getOrders(): Promise<ProductOrder[]>
  getProcessNodes(): Promise<ProductionProcessNode[]>
  getBottlenecks(): Promise<BottleneckItem[]>
  getBuffers(): Promise<BufferStatus[]>
  getFlowSteps(): Promise<FlowSankeyStep[]>
  getEvents(): Promise<OperationalEvent[]>
  getAlerts(): Promise<OperationalAlert[]>
  getScenarios(): Promise<ScenarioDefinition[]>
  getImpactAnalysis(): Promise<ImpactAnalysis>
  getVersionHistory(): Promise<VersionHistoryItem[]>
}

export interface SapStopEventsProvider {
  listStopEvents(): Promise<SapZpp003Record[]>
  ingestStopEvent(
    event: SapZpp003Record,
  ): Promise<{ success: boolean; alertGenerated?: OperationalAlert }>
  validateStopEvent(event: Partial<SapZpp003Record>): { isValid: boolean; errors: string[] }
}

/**
 * IMPLEMENTAÇÃO DO ADAPTADOR E VALIDADOR SAP ZPP003 (Item 20)
 */
export class SapZpp003Adapter {
  private static integrationLogs: IntegrationLogEntry[] = [
    {
      id: 'log-001',
      origem: 'SAP_RFC_ZPP003',
      dataHora: '28/08/2026 07:42:12',
      tipo: 'INBOUND',
      quantidadeRegistros: 1,
      sucesso: true,
      tempoProcessamentoMs: 42,
    },
    {
      id: 'log-002',
      origem: 'SAP_RFC_ORDERS',
      dataHora: '28/08/2026 09:28:10',
      tipo: 'INBOUND',
      quantidadeRegistros: 14,
      sucesso: true,
      tempoProcessamentoMs: 118,
    },
  ]

  /**
   * Valida regras de negócio do payload ZPP003 contra incoerências conhecidas:
   * (linha desconhecida, capacidade zero, fim antes do início, duração negativa, status inválido)
   */
  public static validate(record: Partial<SapZpp003Record>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const validLines = [
      'L1',
      'ENF_L1',
      'ACAB_L1',
      'L2',
      'ACAB_L2',
      'ENDIR',
      'RETRAB',
      'MPL1',
      'MPL2',
      'EXPEDICAO',
    ]

    if (!record.zid_parada || record.zid_parada.trim() === '') {
      errors.push('Identificador ZID_PARADA obrigatório.')
    }
    if (!record.arbpl || !validLines.includes(record.arbpl.toUpperCase())) {
      errors.push(
        `Centro de trabalho/Linha '${record.arbpl}' não reconhecida na Ficha Mestre CIAFAL.`,
      )
    }
    if (!record.motivo_cod || record.motivo_cod.trim() === '') {
      errors.push('Código do motivo SAP não informado.')
    }
    if (!record.dt_inicio || !/^\d{4}-\d{2}-\d{2}$/.test(record.dt_inicio)) {
      errors.push('Data de início em formato inválido (esperado YYYY-MM-DD).')
    }
    if (!record.hr_inicio || !/^\d{2}:\d{2}(:\d{2})?$/.test(record.hr_inicio)) {
      errors.push('Hora de início em formato inválido (esperado HH:mm ou HH:mm:ss).')
    }
    if (record.dt_fim && record.dt_inicio && record.dt_fim < record.dt_inicio) {
      errors.push('Data final não pode ser anterior à data de início.')
    }
    if (record.duracao_min !== undefined && record.duracao_min < 0) {
      errors.push('Duração da parada não pode ser negativa.')
    }
    if (record.status_parada === 'ENCERRADA' && (!record.dt_fim || !record.hr_fim)) {
      errors.push('Parada marcada como ENCERRADA exige data e hora de término.')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  public static addLog(log: Omit<IntegrationLogEntry, 'id'>) {
    const newEntry: IntegrationLogEntry = {
      ...log,
      id: `log-${Date.now()}`,
    }
    this.integrationLogs.unshift(newEntry)
    if (this.integrationLogs.length > 50) this.integrationLogs.pop()
  }

  public static getLogs(): IntegrationLogEntry[] {
    return [...this.integrationLogs]
  }
}

/**
 * FALLBACK SERVICE PROVIDER PADRÃO (Item 18)
 * Isola a camada de mock para substituição imediata quando SAP RFC for conectado
 */
export class MockProductionDataProvider implements ProductionDataProvider {
  async getOrders(): Promise<ProductOrder[]> {
    return mockCentralOrders
  }

  async getProcessNodes(): Promise<ProductionProcessNode[]> {
    return mockProcessNodes
  }

  async getBottlenecks(): Promise<BottleneckItem[]> {
    return mockBottlenecks
  }

  async getBuffers(): Promise<BufferStatus[]> {
    return mockBuffers
  }

  async getFlowSteps(): Promise<FlowSankeyStep[]> {
    return mockFlowSteps
  }

  async getEvents(): Promise<OperationalEvent[]> {
    return mockOperationalEvents
  }

  async getAlerts(): Promise<OperationalAlert[]> {
    return mockOperationalAlerts
  }

  async getScenarios(): Promise<ScenarioDefinition[]> {
    return mockScenarios
  }

  async getImpactAnalysis(): Promise<ImpactAnalysis> {
    return mockImpactAnalysis
  }

  async getVersionHistory(): Promise<VersionHistoryItem[]> {
    return mockVersionHistory
  }
}

export const defaultProductionDataProvider = new MockProductionDataProvider()
