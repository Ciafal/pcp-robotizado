import {
  OptimizationDemandInput,
  OptimizationStockItem,
  OptimizationLineCapacityInput,
} from '@/types/optimization-engine'

/**
 * Interface de Provedor de Demandas (SAP ECC / CRM / Carteira)
 * Preparado para receber SapDemandProvider futuro.
 */
export interface IDemandProvider {
  providerName: string
  isMock: boolean
  getDemands(horizon: string, periodRef?: string): Promise<OptimizationDemandInput[]>
}

/**
 * Interface de Provedor de Estoques e Matérias-Primas (WMS / SAP)
 * Preparado para receber SapStockProvider futuro.
 */
export interface IStockProvider {
  providerName: string
  isMock: boolean
  getStocks(): Promise<OptimizationStockItem[]>
}

/**
 * Interface de Provedor de Capacidade e Dados Realizados (MES 4.0 / SAP)
 * Preparado para receber MesActualCapacityProvider futuro.
 */
export interface IActualCapacityProvider {
  providerName: string
  isMock: boolean
  getLineCapacities(periodRef?: string): Promise<OptimizationLineCapacityInput[]>
}

/**
 * Implementação Mock Controlada: MockDemandProvider
 */
export class MockDemandProvider implements IDemandProvider {
  public providerName = 'MockDemandProvider (Simulação Industrial CIAFAL)'
  public isMock = true

  public async getDemands(
    horizon?: string,
    periodRef?: string,
  ): Promise<OptimizationDemandInput[]> {
    return [
      {
        id: 'DEM-001',
        orderNumber: 'OP-2025-8812',
        productCode: 'TUBO_5580',
        productName: 'Tubo Industrial NBR 5580 Classe Leve Ø 2"',
        familyCode: 'TUBOS_INDUSTRIAIS',
        demandedQuantityTons: 850,
        dueDate: '2025-03-28',
        priorityRank: 1,
        clientName: 'Estruturas Metálicas Brasil S.A.',
        dimensions: { diameterMm: 60.3, thicknessMm: 3.25, lengthMm: 6000, weightKg: 28 },
      },
      {
        id: 'DEM-002',
        orderNumber: 'OP-2025-8813',
        productCode: 'PERFIL_U',
        productName: 'Perfil U Estrutural Dobrado 100x50x3.00mm',
        familyCode: 'PERFIS_ESTRUTURAIS',
        demandedQuantityTons: 720,
        dueDate: '2025-03-29',
        priorityRank: 2,
        clientName: 'Engenharia & Soluções Modulares',
        dimensions: { thicknessMm: 3.0, lengthMm: 12000, weightKg: 42 },
      },
      {
        id: 'DEM-003',
        orderNumber: 'OP-2025-8814',
        productCode: 'CANTONEIRA_STD',
        productName: 'Cantoneira de Abas Iguais 2" x 1/4"',
        familyCode: 'CANTONEIRA',
        demandedQuantityTons: 640,
        dueDate: '2025-03-30',
        priorityRank: 3,
        clientName: 'Torres Eólicas Minas Ltda.',
        dimensions: { thicknessMm: 6.35, lengthMm: 6000, weightKg: 35 },
      },
      {
        id: 'DEM-004',
        orderNumber: 'OP-2025-8815',
        productCode: 'BARRA_CHATA',
        productName: 'Barra Chata Laminada 1" x 1/8"',
        familyCode: 'BARRAS_LAMINADAS',
        demandedQuantityTons: 910,
        dueDate: '2025-03-31',
        priorityRank: 4,
        clientName: 'Implementos Agrícolas Centro-Oeste',
        dimensions: { thicknessMm: 3.18, lengthMm: 6000, weightKg: 18 },
      },
      {
        id: 'DEM-005',
        orderNumber: 'OP-2025-8816',
        productCode: 'TUBO_QUAD',
        productName: 'Tubo Quadrado Estrutural 80x80x3.75mm',
        familyCode: 'TUBOS_INDUSTRIAIS',
        demandedQuantityTons: 580,
        dueDate: '2025-04-02',
        priorityRank: 5,
        clientName: 'Carrocerias Rodoviárias S.A.',
        dimensions: { thicknessMm: 3.75, lengthMm: 6000, weightKg: 52 },
      },
      {
        id: 'DEM-006',
        orderNumber: 'OP-2025-8817',
        productCode: 'PERFIL_ENRIJECIDO',
        productName: 'Perfil U Enrijecido 150x60x20x2.65mm',
        familyCode: 'PERFIS_ESTRUTURAIS',
        demandedQuantityTons: 490,
        dueDate: '2025-04-03',
        priorityRank: 6,
        clientName: 'Galpões Pré-Moldados Brasil',
        dimensions: { thicknessMm: 2.65, lengthMm: 12000, weightKg: 65 },
      },
      {
        id: 'DEM-007',
        orderNumber: 'OP-2025-8818',
        productCode: 'PROD_BLOQUEADO_TEST',
        productName: 'Produto em Bloqueio Técnico Temporário',
        familyCode: 'BLOQUEADOS',
        demandedQuantityTons: 120,
        dueDate: '2025-04-04',
        priorityRank: 7,
        clientName: 'Teste Hard Constraint Block',
        dimensions: { thicknessMm: 4.0, lengthMm: 6000, weightKg: 20 },
      },
      {
        id: 'DEM-008',
        orderNumber: 'OP-2025-8819',
        productCode: 'PROD_DIM_EXCEDE',
        productName: 'Chapa Grossa Ultra-Laminada 150mm',
        familyCode: 'ESPECIAIS',
        demandedQuantityTons: 200,
        dueDate: '2025-04-05',
        priorityRank: 8,
        clientName: 'Teste Hard Constraint Capability',
        dimensions: { thicknessMm: 150.0, lengthMm: 12000, weightKg: 180 },
      },
    ]
  }
}

/**
 * Implementação Mock Controlada: MockStockProvider
 */
export class MockStockProvider implements IStockProvider {
  public providerName = 'MockStockProvider (Simulação WMS / Almoxarifado)'
  public isMock = true

  public async getStocks(): Promise<OptimizationStockItem[]> {
    return [
      {
        materialCode: 'MP-BOBINA-SAE1008',
        materialName: 'Bobina Laminada a Quente SAE 1008 BQ',
        group: 'MATERIA_PRIMA_BOBINA',
        currentStockTons: 3200,
        reservedStockTons: 1400,
        availableStockTons: 1800,
        unitCost: 4200,
        priorityOrder: 1,
      },
      {
        materialCode: 'MP-BOBINA-SAE1020',
        materialName: 'Bobina Laminada a Quente SAE 1020 BQ',
        group: 'MATERIA_PRIMA_BOBINA',
        currentStockTons: 2100,
        reservedStockTons: 950,
        availableStockTons: 1150,
        unitCost: 4450,
        priorityOrder: 2,
      },
      {
        materialCode: 'MP-BILHA-1020',
        materialName: 'Tarugo / Bilha Aço Carbono 130x130mm',
        group: 'SEMIACABADOS',
        currentStockTons: 1850,
        reservedStockTons: 800,
        availableStockTons: 1050,
        unitCost: 3900,
        priorityOrder: 1,
      },
    ]
  }
}

/**
 * Implementação Mock Controlada: MockActualCapacityProvider
 */
export class MockActualCapacityProvider implements IActualCapacityProvider {
  public providerName = 'MockActualCapacityProvider (Simulação MES 4.0)'
  public isMock = true

  public async getLineCapacities(periodRef?: string): Promise<OptimizationLineCapacityInput[]> {
    return [
      {
        lineId: 'line-l1',
        lineCode: 'L1',
        lineName: 'Laminação L1 (Tubo & Perfis)',
        nominalCapacityPerHour: 18,
        plannedStopsLossHours: 8,
        plannedSetupLossHours: 6,
        plannedCalendarLossHours: 0,
        programmableCapacityHours: 154,
        programmableCapacityTons: 2450,
        isMock: true,
        sourceNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
      {
        lineId: 'line-l2',
        lineCode: 'L2',
        lineName: 'Conformação L2 (Perfis & Cantoneiras)',
        nominalCapacityPerHour: 14,
        plannedStopsLossHours: 6,
        plannedSetupLossHours: 8,
        plannedCalendarLossHours: 0,
        programmableCapacityHours: 154,
        programmableCapacityTons: 2050,
        isMock: true,
        sourceNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
      {
        lineId: 'line-enf-l1',
        lineCode: 'ENF_L1',
        lineName: 'Forno de Reaquecimento L1',
        nominalCapacityPerHour: 22,
        plannedStopsLossHours: 4,
        plannedSetupLossHours: 2,
        plannedCalendarLossHours: 0,
        programmableCapacityHours: 162,
        programmableCapacityTons: 3200,
        isMock: true,
        sourceNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
      {
        lineId: 'line-acab-l1',
        lineCode: 'ACAB_L1',
        lineName: 'Acabamento & Embalagem L1',
        nominalCapacityPerHour: 15,
        plannedStopsLossHours: 12,
        plannedSetupLossHours: 8,
        plannedCalendarLossHours: 0,
        programmableCapacityHours: 148,
        programmableCapacityTons: 1850,
        isMock: true,
        sourceNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
      {
        lineId: 'line-acab-l2',
        lineCode: 'ACAB_L2',
        lineName: 'Acabamento & Embalagem L2',
        nominalCapacityPerHour: 12,
        plannedStopsLossHours: 8,
        plannedSetupLossHours: 4,
        plannedCalendarLossHours: 0,
        programmableCapacityHours: 156,
        programmableCapacityTons: 1720,
        isMock: true,
        sourceNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
      {
        lineId: 'line-endir',
        lineCode: 'ENDIR',
        lineName: 'Endireitadeira Pesada',
        nominalCapacityPerHour: 10,
        plannedStopsLossHours: 10,
        plannedSetupLossHours: 6,
        plannedCalendarLossHours: 0,
        programmableCapacityHours: 152,
        programmableCapacityTons: 1400,
        isMock: true,
        sourceNote: 'Dado de capacidade realizada em modo de simulação — aguardando MES/SAP.',
      },
    ]
  }
}
