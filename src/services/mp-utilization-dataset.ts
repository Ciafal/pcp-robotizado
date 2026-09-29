import { MPUtilizationItem } from '@/types/mp-optimization'
import {
  MPUtilizationFiltersState,
  MPUtilizationHierarchyOptions,
  MPFilterItemOption,
  getIsoWeekDateRangePtBr,
} from '@/components/mp-optimization/MPUtilizationFilterHeader'

// Mapeamento canônico das empresas, linhas e centros da Ficha Mestra
export const CANONICAL_MP_HIERARCHY_OPTIONS: MPUtilizationHierarchyOptions = {
  companies: [
    { code: 'CIAFAL', name: 'CIAFAL Indústria de Aço' },
    { code: 'SIDERCENTRO', name: 'Sidercentro Tubos e Conexões' },
    { code: 'FORGEL', name: 'Forgel Metalurgia' },
  ],
  lines: [
    { code: 'L1', name: 'Laminação L1 (Perfis Médios e Pesados)', companyCode: 'CIAFAL' },
    { code: 'L2', name: 'Laminação L2 (Perfis Leves e Barras)', companyCode: 'CIAFAL' },
    { code: 'LPP', name: 'Linha de Perfis e Placas (LPP)', companyCode: 'CIAFAL' },
    { code: 'SDC', name: 'Sidercentro Corte & Dobra', companyCode: 'SIDERCENTRO' },
    { code: 'TR1', name: 'Trefilação TR1', companyCode: 'FORGEL' },
  ],
  centers: [
    {
      code: 'CFPL',
      name: 'Centro de Forno e Laminação L1 (CFPL)',
      lineCode: 'L1',
      companyCode: 'CIAFAL',
    },
    { code: 'LAM1', name: 'Laminação Principal L1 (LAM1)', lineCode: 'L1', companyCode: 'CIAFAL' },
    {
      code: 'ACAB_L1',
      name: 'Acabamento e Expedição L1 (ACAB_L1)',
      lineCode: 'L1',
      companyCode: 'CIAFAL',
    },
    {
      code: 'FORN_L2',
      name: 'Forno de Reaquecimento L2 (FORN_L2)',
      lineCode: 'L2',
      companyCode: 'CIAFAL',
    },
    { code: 'LAM2', name: 'Trem de Laminação L2 (LAM2)', lineCode: 'L2', companyCode: 'CIAFAL' },
    {
      code: 'ACAB_L2',
      name: 'Acabamento e Desempeno L2 (ACAB_L2)',
      lineCode: 'L2',
      companyCode: 'CIAFAL',
    },
    {
      code: 'CORT_LPP',
      name: 'Centro de Corte e Conformação LPP',
      lineCode: 'LPP',
      companyCode: 'CIAFAL',
    },
    {
      code: 'SDC_CORTE',
      name: 'Centro SDC Corte & Dobra',
      lineCode: 'SDC',
      companyCode: 'SIDERCENTRO',
    },
    {
      code: 'TR_IND',
      name: 'Centro Industrial Trefila TR1',
      lineCode: 'TR1',
      companyCode: 'FORGEL',
    },
  ],
  rawMaterials: [
    {
      code: 'MP-TG-1020-130',
      description: 'Tarugo 130x130 SAE 1020 Padrão Tubarão / Próprio',
      group: 'Tarugos Nobres 1020',
    },
    {
      code: 'MP-TG-1020-MPI',
      description: 'Tarugo 130x130 SAE 1020 Vallourec MPI',
      group: 'Tarugos Nobres 1020',
    },
    {
      code: 'MP-TG-1045-130',
      description: 'Tarugo 130x130 SAE 1045 Gerdau Aços Especiais',
      group: 'Tarugos Nobres 1045',
    },
    {
      code: 'MP-TG-AC-130',
      description: 'Tarugo 130x130 Aço Comercial (AC) Padrão',
      group: 'Tarugos Comerciais AC',
    },
    {
      code: 'MP-TG-1020-150',
      description: 'Tarugo 150x150 SAE 1020 Forno L1',
      group: 'Tarugos Nobres 1020',
    },
    {
      code: 'MP-SUC-FACA',
      description: 'Ecosucata e Pontas de Faca Reutilizáveis',
      group: 'Ecosucata / Faca',
    },
  ],
}

// Histórico detalhado canônico com metadados para auditoria completa e múltiplos cenários
export const CANONICAL_MP_UTILIZATION_DATASET: MPUtilizationItem[] = [
  {
    id: 'ord-101',
    order_number: 'OP-2026-9901',
    period_date: '2026-06-15',
    period_week: 'Semana 24',
    period_week_number: 24,
    period_month: 'Junho',
    period_month_number: 6,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L1',
    center_code: 'CFPL',
    product_code: 'BARRA-RED-25',
    product_description: 'Barra Redonda Laminada 25mm Comercial',
    produced_tons: 85.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 90.5,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'ArcelorMittal',
    supplier_name: 'ArcelorMittal Tubarão',
    hot_charging_tons: 65.0,
    cold_charging_tons: 25.5,
    charging_type: 'MISTO',
    could_be_hot_charging: true,
    could_be_hot_reason:
      'Disponibilidade de lote quente na L2 não sincronizada com a janela térmica do forno CFPL.',
    potential_hot_tons: 25.5,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: true,
    substitution_category: '1020 no lugar de AC',
    deviation_detected: true,
    deviation_impact_tons: 90.5,
    deviation_reason: 'Falta de lote AC no pátio L1 no momento do enfornamento forçou uso de 1020.',
    observation: 'Substituição elevou custo operacional em R$ 42/t.',
  },
  {
    id: 'ord-102',
    order_number: 'OP-2026-9908',
    period_date: '2026-06-16',
    period_week: 'Semana 24',
    period_week_number: 24,
    period_month: 'Junho',
    period_month_number: 6,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L2',
    center_code: 'LAM2',
    product_code: 'BARRA-CHAT-50X10',
    product_description: 'Barra Chata 50x10 mm Específica 1020',
    produced_tons: 120.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 127.2,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'Ciafal L2',
    supplier_name: 'Produção Própria L2',
    hot_charging_tons: 127.2,
    cold_charging_tons: 0,
    charging_type: 'QUENTE',
    could_be_hot_charging: false,
    potential_hot_tons: 0,
    standard_mp_rule: 'Obrigatório SAE 1020',
    could_be_ac: false,
    should_be_1020: true,
    is_substitute_application: false,
    deviation_detected: false,
    observation: '100% Enfornamento a quente. Rendimento padrão atingido.',
  },
  {
    id: 'ord-103',
    order_number: 'OP-2026-9915',
    period_date: '2026-06-17',
    period_week: 'Semana 24',
    period_week_number: 24,
    period_month: 'Junho',
    period_month_number: 6,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L1',
    center_code: 'LAM1',
    product_code: 'CANTONEIRA-38X3',
    product_description: 'Cantoneira de Abas Iguais 38x3 mm',
    produced_tons: 60.0,
    mp_consumed_code: 'MP-TG-1020-MPI',
    mp_consumed_tons: 63.8,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'Vallourec',
    supplier_name: 'Vallourec Soluções',
    hot_charging_tons: 0,
    cold_charging_tons: 63.8,
    charging_type: 'FRIO',
    could_be_hot_charging: false,
    could_be_hot_reason:
      'Tarugo Vallourec descarregado a frio no pátio externo sem ligação direta de transferência quente.',
    potential_hot_tons: 0,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: true,
    substitution_category: '1020 MPI no lugar de AC',
    deviation_detected: true,
    deviation_impact_tons: 63.8,
    deviation_reason: 'Utilização de lote MPI disponível para evitar parada de linha.',
    observation: 'Enfornamento frio.',
  },
  {
    id: 'ord-104',
    order_number: 'OP-2026-9922',
    period_date: '2026-06-08',
    period_week: 'Semana 23',
    period_week_number: 23,
    period_month: 'Junho',
    period_month_number: 6,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L1',
    center_code: 'CFPL',
    product_code: 'PERFIL-U-75',
    product_description: 'Perfil U Estrutural 75mm',
    produced_tons: 180.0,
    mp_consumed_code: 'MP-TG-1045-130',
    mp_consumed_tons: 191.0,
    steel_grade: 'SAE 1045',
    mp_group: 'Tarugos Nobres 1045',
    origin_group: 'Gerdau',
    supplier_name: 'Gerdau Aços Especiais',
    hot_charging_tons: 191.0,
    cold_charging_tons: 0,
    charging_type: 'QUENTE',
    could_be_hot_charging: false,
    potential_hot_tons: 0,
    standard_mp_rule: 'Obrigatório SAE 1045',
    could_be_ac: false,
    is_substitute_application: false,
    deviation_detected: false,
    observation: 'Lote 100% conforme.',
  },
  {
    id: 'ord-105',
    order_number: 'OP-2026-9930',
    period_date: '2026-06-09',
    period_week: 'Semana 23',
    period_week_number: 23,
    period_month: 'Junho',
    period_month_number: 6,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L2',
    center_code: 'FORN_L2',
    product_code: 'BARRA-QUAD-30',
    product_description: 'Barra Quadrada 30mm Comercial',
    produced_tons: 95.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 101.5,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: '1020 L2',
    supplier_name: 'Produção Própria L2',
    hot_charging_tons: 80.0,
    cold_charging_tons: 21.5,
    charging_type: 'MISTO',
    could_be_hot_charging: true,
    could_be_hot_reason:
      'Ordem programada fora da janela de vazamento contínuo; lote permaneceu no pátio intermediário.',
    potential_hot_tons: 21.5,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: true,
    substitution_category: '1020 L2 no lugar de AC',
    deviation_detected: true,
    deviation_impact_tons: 101.5,
    deviation_reason: 'Tarugo 1020 gerado na L2 consumido em perfil comercial.',
    observation: 'Consumo antecipou necessidade de reposição de tarugos nobres.',
  },
  {
    id: 'ord-106',
    order_number: 'OP-2026-0711',
    period_date: '2026-07-15',
    period_week: 'Semana 29',
    period_week_number: 29,
    period_month: 'Julho',
    period_month_number: 7,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L2',
    center_code: 'FORN_L2',
    product_code: 'BARRA-RED-22',
    product_description: 'Barra Redonda 22mm',
    produced_tons: 80.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 85.0,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'Ciafal L2',
    supplier_name: 'Produção Própria L2',
    hot_charging_tons: 50.0,
    cold_charging_tons: 35.0,
    charging_type: 'MISTO',
    could_be_hot_charging: true,
    could_be_hot_reason:
      'Troca de bitola atrasou o sequenciamento, forçando estocagem intermediária no pátio e resfriamento.',
    potential_hot_tons: 35.0,
    standard_mp_rule: 'Obrigatório SAE 1020',
    could_be_ac: false,
    should_be_1020: true,
    is_substitute_application: false,
    deviation_detected: false,
    observation: 'Perda de ganho térmico por descontinuidade de campanha.',
  },
  {
    id: 'ord-107',
    order_number: 'OP-2026-0820',
    period_date: '2026-08-18',
    period_week: 'Semana 34',
    period_week_number: 34,
    period_month: 'Agosto',
    period_month_number: 8,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L2',
    center_code: 'LAM2',
    product_code: 'BARRA-CHAT-32X8',
    product_description: 'Barra Chata 32x8 mm',
    produced_tons: 90.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 95.0,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'Ciafal L2',
    supplier_name: 'Produção Própria L2',
    hot_charging_tons: 60.0,
    cold_charging_tons: 35.0,
    charging_type: 'MISTO',
    could_be_hot_charging: true,
    could_be_hot_reason:
      'Saldo de tarugos quentes disponível na esteira mas não consumido por inversão na fila de programação.',
    potential_hot_tons: 35.0,
    standard_mp_rule: 'Obrigatório SAE 1020',
    could_be_ac: false,
    should_be_1020: true,
    is_substitute_application: false,
    deviation_detected: false,
    observation: 'Potencial de agrupamento para ganho térmico não aproveitado.',
  },
  {
    id: 'ord-108',
    order_number: 'OP-2026-9941',
    period_date: '2026-09-29',
    period_week: 'Semana 40',
    period_week_number: 40,
    period_month: 'Setembro',
    period_month_number: 9,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L1',
    center_code: 'LAM1',
    product_code: 'BARRA-RED-32',
    product_description: 'Barra Redonda 32mm Industrial',
    produced_tons: 110.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 116.5,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'ArcelorMittal',
    supplier_name: 'ArcelorMittal Tubarão',
    hot_charging_tons: 100.0,
    cold_charging_tons: 16.5,
    charging_type: 'MISTO',
    could_be_hot_charging: true,
    could_be_hot_reason:
      'Tarugo complementar retirado do pátio frio por subdimensionamento da corrida quente.',
    potential_hot_tons: 16.5,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: true,
    substitution_category: '1020 no lugar de AC',
    deviation_detected: true,
    deviation_impact_tons: 116.5,
    deviation_reason: 'Planejamento antecipado de ordem comercial com MP nobre.',
    observation: 'Enfornamento misto com alta proporção quente.',
  },
  {
    id: 'ord-109',
    order_number: 'OP-2026-9955',
    period_date: '2026-09-29',
    period_week: 'Semana 40',
    period_week_number: 40,
    period_month: 'Setembro',
    period_month_number: 9,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L1',
    center_code: 'CFPL',
    product_code: 'CANTONEIRA-50X5',
    product_description: 'Cantoneira 50x5 mm Laminada',
    produced_tons: 72.0,
    mp_consumed_code: 'MP-TG-AC-130',
    mp_consumed_tons: 76.8,
    steel_grade: 'Aço Comercial AC',
    mp_group: 'Tarugos Comerciais AC',
    origin_group: 'Aço Comercial AC',
    supplier_name: 'Fornecedor AC Padrão',
    hot_charging_tons: 50.0,
    cold_charging_tons: 26.8,
    charging_type: 'MISTO',
    could_be_hot_charging: false,
    could_be_hot_reason: 'Material AC comercial de terceiros descarregado frio no pátio.',
    potential_hot_tons: 0,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: false,
    deviation_detected: false,
    observation: 'Utilização 100% conforme da MP AC prevista.',
  },
  {
    id: 'ord-110',
    order_number: 'OP-2026-9960',
    period_date: '2026-10-02',
    period_week: 'Semana 40',
    period_week_number: 40,
    period_month: 'Outubro',
    period_month_number: 10,
    period_year: 2026,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L2',
    center_code: 'LAM2',
    product_code: 'BARRA-CHAT-38X6',
    product_description: 'Barra Chata 38x6 mm',
    produced_tons: 45.0,
    mp_consumed_code: 'MP-SUC-FACA',
    mp_consumed_tons: 48.0,
    steel_grade: 'Ecosucata',
    mp_group: 'Ecosucata / Faca',
    origin_group: 'Ecosucata / Faca',
    supplier_name: 'Sucata Interna CIAFAL',
    hot_charging_tons: 0,
    cold_charging_tons: 48.0,
    charging_type: 'FRIO',
    could_be_hot_charging: false,
    could_be_hot_reason: 'Ecosucata e pontas de faca exigem triagem física a frio no pátio.',
    potential_hot_tons: 0,
    standard_mp_rule: 'Elegível para Sucata e Faca',
    could_be_ac: false,
    is_substitute_application: false,
    deviation_detected: false,
    observation: 'Aproveitamento de sobras de laminação sem desvios.',
  },
  {
    id: 'ord-111',
    order_number: 'OP-2026-9972',
    period_date: '2026-04-12',
    period_week: 'Semana 15',
    period_week_number: 15,
    period_month: 'Abril',
    period_month_number: 4,
    period_year: 2026,
    company_code: 'SIDERCENTRO',
    company_name: 'Sidercentro Tubos e Conexões',
    line_code: 'SDC',
    center_code: 'SDC_CORTE',
    product_code: 'TUBO-IND-40',
    product_description: 'Tubo Industrial Conformado 40x40',
    produced_tons: 55.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 58.2,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'ArcelorMittal',
    supplier_name: 'ArcelorMittal Tubarão',
    hot_charging_tons: 0,
    cold_charging_tons: 58.2,
    charging_type: 'FRIO',
    could_be_hot_charging: false,
    could_be_hot_reason:
      'Processo SDC Corte & Dobra opera exclusivamente a frio em perfiladeira mecânica.',
    potential_hot_tons: 0,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: true,
    substitution_category: '1020 no lugar de AC',
    deviation_detected: true,
    deviation_impact_tons: 58.2,
    deviation_reason: 'Tarugo nobre alocado na SDC para cumprimento de prazo de entrega.',
    observation: 'Substituição pontual na Sidercentro.',
  },
  {
    id: 'ord-112',
    order_number: 'OP-2025-8810',
    period_date: '2025-11-20',
    period_week: 'Semana 47',
    period_week_number: 47,
    period_month: 'Novembro',
    period_month_number: 11,
    period_year: 2025,
    company_code: 'CIAFAL',
    company_name: 'CIAFAL Indústria de Aço',
    line_code: 'L1',
    center_code: 'CFPL',
    product_code: 'BARRA-RED-25',
    product_description: 'Barra Redonda 25mm 2025',
    produced_tons: 90.0,
    mp_consumed_code: 'MP-TG-1020-130',
    mp_consumed_tons: 96.0,
    steel_grade: 'SAE 1020',
    mp_group: 'Tarugos Nobres 1020',
    origin_group: 'ArcelorMittal',
    supplier_name: 'ArcelorMittal Tubarão',
    hot_charging_tons: 50.0,
    cold_charging_tons: 46.0,
    charging_type: 'MISTO',
    could_be_hot_charging: true,
    could_be_hot_reason:
      'Gargalo de movimentação logística na ponte rolante forçou enfornamento a frio.',
    potential_hot_tons: 46.0,
    standard_mp_rule: 'Elegível para Aço Comercial (AC)',
    could_be_ac: true,
    is_substitute_application: true,
    substitution_category: '1020 no lugar de AC',
    deviation_detected: true,
    deviation_impact_tons: 96.0,
    deviation_reason: 'Desvio de programação em 2025.',
    observation: 'Histórico anual 2025.',
  },
]

/**
 * Filtra as linhas de utilização de acordo com o estado unificado de filtros
 */
export function filterMPUtilizationRows(
  rows: MPUtilizationItem[],
  filters: MPUtilizationFiltersState,
): MPUtilizationItem[] {
  return rows.filter((row) => {
    // 1. Empresa
    if (filters.companyCode && filters.companyCode !== 'ALL') {
      if (row.company_code && row.company_code !== filters.companyCode) {
        return false
      }
    }

    // 2. Linha
    if (filters.lineCode && filters.lineCode !== 'ALL') {
      if (row.line_code && row.line_code !== filters.lineCode) {
        return false
      }
    }

    // 3. Centro
    if (filters.centerCode && filters.centerCode !== 'ALL') {
      if (row.center_code && row.center_code !== filters.centerCode) {
        return false
      }
    }

    // 4. Matéria-prima (múltipla ou única)
    if (filters.selectedRawMaterials && filters.selectedRawMaterials.length > 0) {
      if (!filters.selectedRawMaterials.includes(row.mp_consumed_code)) {
        return false
      }
    }

    // 5. Período: Se periodMode DE / ATÉ estiver ativo, prioriza o intervalo explícito DE / ATÉ
    if (filters.periodMode) {
      if (filters.periodMode === 'DATA') {
        const rowDate =
          row.period_date ||
          (row.period_year && row.period_month_number
            ? `${row.period_year}-${String(row.period_month_number).padStart(2, '0')}-01`
            : '')
        if (filters.dateFrom && rowDate && rowDate < filters.dateFrom) {
          return false
        }
        if (filters.dateTo && rowDate && rowDate > filters.dateTo) {
          return false
        }
        return true
      }

      if (filters.periodMode === 'MES') {
        const rowYear = row.period_year || 2026
        const rowMonth = row.period_month_number || 1
        const rowTotalMonths = rowYear * 12 + rowMonth

        const fromYear = filters.yearMonthFrom ?? 2026
        const fromMonth = filters.monthFrom ?? 1
        const fromTotalMonths = fromYear * 12 + fromMonth

        const toYear = filters.yearMonthTo ?? 2026
        const toMonth = filters.monthTo ?? 12
        const toTotalMonths = toYear * 12 + toMonth

        if (rowTotalMonths < fromTotalMonths || rowTotalMonths > toTotalMonths) {
          return false
        }
        return true
      }

      if (filters.periodMode === 'ANO') {
        const rowYear = row.period_year || 2026
        const fromYear = filters.yearFrom ?? 2025
        const toYear = filters.yearTo ?? 2026

        if (rowYear < fromYear || rowYear > toYear) {
          return false
        }
        return true
      }
    }

    // 6. Fallback para Visão Temporal legada (DIARIA / SEMANAL / MENSAL / ANUAL)
    switch (filters.temporalVision) {
      case 'DIARIA': {
        if (filters.dailyDate) {
          if (row.period_date && row.period_date !== filters.dailyDate) {
            return false
          }
        }
        break
      }

      case 'SEMANAL': {
        if (filters.weeklyYear && row.period_year !== filters.weeklyYear) {
          return false
        }
        if (filters.weeklyWeek && row.period_week_number !== undefined) {
          if (row.period_week_number !== filters.weeklyWeek) {
            return false
          }
        }
        break
      }

      case 'MENSAL': {
        if (filters.monthlyYear && row.period_year !== filters.monthlyYear) {
          return false
        }
        if (filters.monthlyMonth && row.period_month_number !== undefined) {
          if (row.period_month_number !== filters.monthlyMonth) {
            return false
          }
        }
        break
      }

      case 'ANUAL': {
        if (filters.annualYear && row.period_year !== filters.annualYear) {
          return false
        }
        break
      }
    }

    return true
  })
}
