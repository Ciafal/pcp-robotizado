export interface CityCoord {
  city: string
  uf: string
  lat: number
  lng: number
  x: number // SVG coordinates 0..1000
  y: number // SVG coordinates 0..1000
}

// Centroides e posições aproximadas para projeção SVG no Brasil
// O viewBox do mapa é 0 0 1000 1000 cobrindo aprox:
// Lng: -74 (Oeste) a -34 (Leste)  -> delta 40
// Lat: +5 (Norte) a -34 (Sul)     -> delta 39

export function geoToSvgCoords(lat: number, lng: number): { x: number; y: number } {
  const minLng = -73.5
  const maxLng = -34.5
  const minLat = -33.8
  const maxLat = 5.3

  const x = ((lng - minLng) / (maxLng - minLng)) * 900 + 50
  const y = ((maxLat - lat) / (maxLat - minLat)) * 900 + 40

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  }
}

// Base de coordenadas reais de cidades da malha CIAFAL / Sidercentro / Brasil
export const KNOWN_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // MG
  'DIVINOPOLIS-MG': { lat: -20.1438, lng: -44.8917 },
  'BELO HORIZONTE-MG': { lat: -19.9167, lng: -43.9345 },
  'CONTAGEM-MG': { lat: -19.9328, lng: -44.0539 },
  'BETIM-MG': { lat: -19.9678, lng: -44.1983 },
  'SETE LAGOAS-MG': { lat: -19.4589, lng: -44.2472 },
  'UBERLANDIA-MG': { lat: -18.9186, lng: -48.2772 },
  'UBERABA-MG': { lat: -19.7472, lng: -47.9392 },
  'ARAXA-MG': { lat: -19.5933, lng: -46.9406 },
  'ARAGUARI-MG': { lat: -18.6481, lng: -48.1872 },
  'IPATINGA-MG': { lat: -19.4688, lng: -42.5367 },
  'CORONEL FABRICIANO-MG': { lat: -19.5197, lng: -42.6289 },
  'GOVERNADOR VALADARES-MG': { lat: -18.8511, lng: -41.9494 },
  'JOAO MONLEVADE-MG': { lat: -19.8103, lng: -43.1742 },
  'POUSO ALEGRE-MG': { lat: -22.2303, lng: -45.9366 },
  'VARGINHA-MG': { lat: -21.5519, lng: -45.4308 },
  'LAVRAS-MG': { lat: -21.2461, lng: -44.9997 },
  'TRES CORACOES-MG': { lat: -21.6961, lng: -45.2575 },
  'POCOS DE CALDAS-MG': { lat: -21.7853, lng: -46.5647 },
  'JUIZ DE FORA-MG': { lat: -21.7642, lng: -43.3497 },
  'ALFENAS-MG': { lat: -21.4286, lng: -45.9469 },
  'PATOS DE MINAS-MG': { lat: -18.5789, lng: -46.5181 },
  'MONTES CLAROS-MG': { lat: -16.735, lng: -43.8617 },

  // SP
  'SAO PAULO-SP': { lat: -23.5505, lng: -46.6333 },
  'CAMPINAS-SP': { lat: -22.9056, lng: -47.0608 },
  'GUARULHOS-SP': { lat: -23.4628, lng: -46.5333 },
  'SAO JOSE DOS CAMPOS-SP': { lat: -23.1896, lng: -45.8841 },
  'TAUBATE-SP': { lat: -23.0264, lng: -45.5558 },
  'SOROCABA-SP': { lat: -23.5015, lng: -47.4526 },
  'RIBEIRAO PRETO-SP': { lat: -21.1775, lng: -47.8103 },
  'SANTOS-SP': { lat: -23.9608, lng: -46.3336 },

  // RJ
  'RIO DE JANEIRO-RJ': { lat: -22.9068, lng: -43.1729 },
  'VOLTA REDONDA-RJ': { lat: -22.5232, lng: -44.1042 },
  'RESENDE-RJ': { lat: -22.4689, lng: -44.4464 },
  'DUQUE DE CAXIAS-RJ': { lat: -22.7856, lng: -43.3117 },

  // GO & DF
  'GOIANIA-GO': { lat: -16.6869, lng: -49.2648 },
  'ANAPOLIS-GO': { lat: -16.3267, lng: -48.9534 },
  'CATALAO-GO': { lat: -18.1658, lng: -47.9461 },
  'ITUMBIARA-GO': { lat: -18.4194, lng: -49.2153 },
  'RIO VERDE-GO': { lat: -17.7928, lng: -50.9192 },
  'BRASILIA-DF': { lat: -15.7975, lng: -47.8919 },

  // PR
  'CURITIBA-PR': { lat: -25.4284, lng: -49.2733 },
  'SAO JOSE DOS PINHAIS-PR': { lat: -25.5347, lng: -49.2064 },
  'PONTA GROSSA-PR': { lat: -25.0994, lng: -50.1583 },
  'ARAUCARIA-PR': { lat: -25.5928, lng: -49.4103 },

  // ES
  'VITORIA-ES': { lat: -20.3155, lng: -40.3128 },
  'SERRA-ES': { lat: -20.1286, lng: -40.3078 },
  'CARIACICA-ES': { lat: -20.2639, lng: -40.42 },

  // BA
  'SALVADOR-BA': { lat: -12.9777, lng: -38.5016 },
  'FEIRA DE SANTANA-BA': { lat: -12.2664, lng: -38.9663 },
}

export function lookupCityCoordinates(
  city: string,
  uf: string,
): { lat: number; lng: number } | null {
  const normCity = city
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const normUf = uf.trim().toUpperCase()
  const key = `${normCity}-${normUf}`

  if (KNOWN_CITY_COORDINATES[key]) {
    return KNOWN_CITY_COORDINATES[key]
  }

  // Fallbacks por centroide do estado caso cidade não catalogada
  const UF_CENTROIDS: Record<string, { lat: number; lng: number }> = {
    MG: { lat: -18.5122, lng: -44.555 },
    SP: { lat: -22.19, lng: -48.79 },
    RJ: { lat: -22.25, lng: -42.66 },
    ES: { lat: -19.57, lng: -40.66 },
    GO: { lat: -15.98, lng: -49.86 },
    DF: { lat: -15.78, lng: -47.93 },
    PR: { lat: -24.89, lng: -51.55 },
    SC: { lat: -27.24, lng: -50.21 },
    RS: { lat: -30.03, lng: -51.23 },
    BA: { lat: -12.97, lng: -39.54 },
    MT: { lat: -12.64, lng: -55.42 },
    MS: { lat: -20.51, lng: -54.54 },
  }

  if (UF_CENTROIDS[normUf]) {
    return UF_CENTROIDS[normUf]
  }

  return null
}

// Limites SVG aproximados dos Estados Brasileiros em viewBox="0 0 1000 1000"
export interface StateSvgPath {
  uf: string
  name: string
  region: string
  labelX: number
  labelY: number
  path: string
}

export const BRAZIL_STATES_SVG: StateSvgPath[] = [
  // Minas Gerais (Coração da operação CIAFAL)
  {
    uf: 'MG',
    name: 'Minas Gerais',
    region: 'Sudeste',
    labelX: 720,
    labelY: 620,
    path: 'M660,540 L730,520 L780,560 L800,610 L780,660 L730,700 L680,690 L650,650 L640,600 Z',
  },
  // São Paulo
  {
    uf: 'SP',
    name: 'São Paulo',
    region: 'Sudeste',
    labelX: 660,
    labelY: 720,
    path: 'M640,680 L720,690 L740,730 L700,750 L630,730 L620,700 Z',
  },
  // Rio de Janeiro
  {
    uf: 'RJ',
    name: 'Rio de Janeiro',
    region: 'Sudeste',
    labelX: 780,
    labelY: 710,
    path: 'M750,700 L790,690 L810,720 L770,730 Z',
  },
  // Espírito Santo
  {
    uf: 'ES',
    name: 'Espírito Santo',
    region: 'Sudeste',
    labelX: 820,
    labelY: 630,
    path: 'M800,600 L825,605 L830,660 L805,655 Z',
  },
  // Goiás & DF
  {
    uf: 'GO',
    name: 'Goiás',
    region: 'Centro-Oeste',
    labelX: 600,
    labelY: 540,
    path: 'M570,480 L640,490 L650,580 L610,610 L560,570 Z',
  },
  {
    uf: 'DF',
    name: 'Distrito Federal',
    region: 'Centro-Oeste',
    labelX: 630,
    labelY: 520,
    path: 'M625,515 L638,515 L638,525 L625,525 Z',
  },
  // Bahia
  {
    uf: 'BA',
    name: 'Bahia',
    region: 'Nordeste',
    labelX: 780,
    labelY: 460,
    path: 'M680,410 L780,390 L840,440 L810,540 L730,520 L680,470 Z',
  },
  // Paraná
  {
    uf: 'PR',
    name: 'Paraná',
    region: 'Sul',
    labelX: 590,
    labelY: 770,
    path: 'M570,740 L640,740 L650,780 L580,800 Z',
  },
  // Santa Catarina
  {
    uf: 'SC',
    name: 'Santa Catarina',
    region: 'Sul',
    labelX: 610,
    labelY: 820,
    path: 'M590,800 L650,795 L640,840 L580,830 Z',
  },
  // Rio Grande do Sul
  {
    uf: 'RS',
    name: 'Rio Grande do Sul',
    region: 'Sul',
    labelX: 560,
    labelY: 880,
    path: 'M560,840 L630,840 L610,930 L530,900 Z',
  },
  // Mato Grosso do Sul
  {
    uf: 'MS',
    name: 'Mato Grosso do Sul',
    region: 'Centro-Oeste',
    labelX: 510,
    labelY: 650,
    path: 'M480,590 L560,600 L570,710 L490,700 Z',
  },
  // Mato Grosso
  {
    uf: 'MT',
    name: 'Mato Grosso',
    region: 'Centro-Oeste',
    labelX: 470,
    labelY: 480,
    path: 'M420,400 L540,410 L560,550 L460,570 Z',
  },
  // Tocantins
  {
    uf: 'TO',
    name: 'Tocantins',
    region: 'Norte',
    labelX: 640,
    labelY: 380,
    path: 'M610,310 L660,320 L660,460 L610,450 Z',
  },
  // Maranhão
  {
    uf: 'MA',
    name: 'Maranhão',
    region: 'Nordeste',
    labelX: 690,
    labelY: 260,
    path: 'M650,200 L730,220 L720,330 L650,310 Z',
  },
  // Piauí
  {
    uf: 'PI',
    name: 'Piauí',
    region: 'Nordeste',
    labelX: 750,
    labelY: 310,
    path: 'M720,240 L770,250 L760,370 L710,350 Z',
  },
  // Ceará, RN, PB, PE, AL, SE
  {
    uf: 'CE',
    name: 'Ceará',
    region: 'Nordeste',
    labelX: 820,
    labelY: 240,
    path: 'M780,210 L840,210 L830,280 L780,270 Z',
  },
  {
    uf: 'PE',
    name: 'Pernambuco',
    region: 'Nordeste',
    labelX: 850,
    labelY: 320,
    path: 'M780,300 L880,310 L880,340 L780,335 Z',
  },
  // Norte (PA, AM, RO, AC, RR, AP)
  {
    uf: 'PA',
    name: 'Pará',
    region: 'Norte',
    labelX: 540,
    labelY: 260,
    path: 'M460,180 L620,170 L640,310 L520,330 Z',
  },
  {
    uf: 'AM',
    name: 'Amazonas',
    region: 'Norte',
    labelX: 280,
    labelY: 270,
    path: 'M160,200 L420,200 L430,370 L210,360 Z',
  },
  {
    uf: 'RO',
    name: 'Rondônia',
    region: 'Norte',
    labelX: 320,
    labelY: 480,
    path: 'M290,440 L370,430 L360,520 L280,500 Z',
  },
]
