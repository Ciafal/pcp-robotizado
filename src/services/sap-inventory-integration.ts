import { SAPMaterialQueryResult } from '@/types/mp-inventory-demand'

// Mock controlado e claramente rotulado conforme regra L do PCP ("mock exclusivamente de teste claramente rotulado 'Dados de homologação', sem misturar com dados reais")
export const PCP_CENTERS = [
  { id: '1001', name: 'Centro 1001 - Laminação Geral' },
  { id: '1002', name: 'Centro 1002 - Aciaria & Fornos' },
  { id: '1003', name: 'Centro 1003 - Trefilação e Acabamento' },
  { id: '2001', name: 'Centro 2001 - Centro de Distribuição / Hub' },
]

export const PCP_CENTER_DEPOSITS: Record<string, { code: string; name: string }[]> = {
  '1001': [
    { code: 'DEP-MP01', name: 'DEP-MP01 - Pátio de Matéria-Prima 1' },
    { code: 'DEP-MP02', name: 'DEP-MP02 - Galpão Laminação L1' },
    { code: 'DEP-INT1', name: 'DEP-INT1 - Pulmão Intermediário' },
  ],
  '1002': [
    { code: 'DEP-ACI1', name: 'DEP-ACI1 - Pátio Sucata / Tarugos' },
    { code: 'DEP-FOR1', name: 'DEP-FOR1 - Pátio de Forno e Enfornamento' },
  ],
  '1003': [
    { code: 'DEP-TRF1', name: 'DEP-TRF1 - Matéria-Prima Trefilação' },
    { code: 'DEP-ACAB', name: 'DEP-ACAB - Armazém de Fios e Barras' },
  ],
  '2001': [
    { code: 'DEP-HUB1', name: 'DEP-HUB1 - Armazém Central HUB Ciafal' },
    { code: 'DEP-CD02', name: 'DEP-CD02 - Pátio Expedição Matéria-Prima' },
  ],
}

// Localizações conhecidas WMS para autocomplete
export const WMS_KNOWN_LOCATIONS = [
  'PAT-A-01-N1',
  'PAT-A-01-N2',
  'PAT-A-02-N1',
  'PAT-B-03-N1',
  'PAT-B-04-N2',
  'BOX-LAM-01',
  'BOX-LAM-02',
  'PUL-MP-NORTE',
  'PUL-MP-SUL',
  'GAL-01-RACK-A',
  'GAL-01-RACK-B',
  'PAT-FORNO-ENTRADA',
]

export const KNOWN_MATERIALS_CATALOG: Record<string, {
  description: string
  unit: string
  gauges: string[]
  sampleRuns: { runNumber: string; batch: string; gauge: string; stockPieces: number; storageLocation: string; receiptDate: string }[]
}> = {
  'MP-TAR-1045': {
    description: 'Tarugo SAE 1045 130mm x 6000mm',
    unit: 'PC',
    gauges: ['130mm', '120mm'],
    sampleRuns: [
      { runNumber: '458921', batch: 'L-2026-081', gauge: '130mm', stockPieces: 30, storageLocation: 'PAT-A-01-N1', receiptDate: '10/01/2026' },
      { runNumber: '458974', batch: 'L-2026-092', gauge: '130mm', stockPieces: 18, storageLocation: 'PAT-A-02-N1', receiptDate: '15/01/2026' },
      { runNumber: '459102', batch: 'L-2026-104', gauge: '120mm', stockPieces: 25, storageLocation: 'PAT-B-03-N1', receiptDate: '02/02/2026' },
    ],
  },
  'MP-TAR-1020': {
    description: 'Tarugo SAE 1020 120mm x 6000mm',
    unit: 'PC',
    gauges: ['120mm', '115mm'],
    sampleRuns: [
      { runNumber: '457810', batch: 'L-2026-033', gauge: '120mm', stockPieces: 45, storageLocation: 'PAT-B-04-N2', receiptDate: '05/01/2026' },
      { runNumber: '457990', batch: 'L-2026-055', gauge: '120mm', stockPieces: 20, storageLocation: 'PUL-MP-NORTE', receiptDate: '12/01/2026' },
    ],
  },
  'MP-FIO-1008': {
    description: 'Fio Máquina SAE 1008 5.5mm em Rolos',
    unit: 'ROLO',
    gauges: ['5.5mm', '6.5mm'],
    sampleRuns: [
      { runNumber: '456100', batch: 'FM-992', gauge: '5.5mm', stockPieces: 60, storageLocation: 'GAL-01-RACK-A', receiptDate: '20/12/2025' },
      { runNumber: '456250', batch: 'FM-998', gauge: '5.5mm', stockPieces: 35, storageLocation: 'GAL-01-RACK-B', receiptDate: '03/01/2026' },
    ],
  },
}

export function formatPtBrDateTime(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function formatDecimalPtBr(val: number, decimals: number = 2): string {
  if (isNaN(val) || !isFinite(val)) return '0,00'
  return val.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export async function querySapMaterialStock(params: {
  center: string
  deposit: string
  materialCode: string
}): Promise<SAPMaterialQueryResult> {
  // Simula consulta de latência de rede/RFC
  await new Promise((res) => setTimeout(res, 280))

  const cleanCode = (params.materialCode || '').trim().toUpperCase()
  const nowFormatted = formatPtBrDateTime()

  const match = KNOWN_MATERIALS_CATALOG[cleanCode]
  if (match) {
    const totalStock = match.sampleRuns.reduce((acc, r) => acc + r.stockPieces, 0)
    return {
      materialCode: cleanCode,
      description: match.description,
      unit: match.unit,
      center: params.center,
      deposit: params.deposit,
      stockAvailable: totalStock,
      lastSyncFormatted: nowFormatted,
      sourceType: 'HOMOLOGACAO_MOCK', // Rótulo obrigatório de homologação
      runs: match.sampleRuns.map((r) => ({
        runNumber: r.runNumber,
        batch: r.batch,
        gauge: r.gauge,
        stockPieces: r.stockPieces,
        storageLocation: r.storageLocation,
        receiptDate: r.receiptDate,
        wmsZone: r.storageLocation.split('-')[0] || 'PAT',
        isReserved: false,
      })),
    }
  }

  // Fallback estruturado para materiais digitados livremente
  const generatedRuns = [
    {
      runNumber: `45${Math.floor(1000 + Math.random() * 9000)}`,
      batch: `L-${new Date().getFullYear()}-01`,
      gauge: 'Padrão',
      stockPieces: 32,
      storageLocation: params.deposit.includes('01') ? 'PAT-A-01-N1' : 'BOX-LAM-01',
      receiptDate: '10/01/2026',
      wmsZone: 'PAT-A',
      isReserved: false,
    },
    {
      runNumber: `45${Math.floor(1000 + Math.random() * 9000)}`,
      batch: `L-${new Date().getFullYear()}-02`,
      gauge: 'Padrão',
      stockPieces: 28,
      storageLocation: params.deposit.includes('01') ? 'PAT-A-02-N1' : 'BOX-LAM-02',
      receiptDate: '22/01/2026',
      wmsZone: 'PAT-A',
      isReserved: false,
    },
  ]

  return {
    materialCode: cleanCode,
    description: `Material Cadastrado SAP: ${cleanCode}`,
    unit: 'PC',
    center: params.center,
    deposit: params.deposit,
    stockAvailable: 60,
    lastSyncFormatted: nowFormatted,
    sourceType: 'HOMOLOGACAO_MOCK',
    runs: generatedRuns,
  }
}
