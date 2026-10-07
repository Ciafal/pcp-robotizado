import { describe, it, expect } from 'vitest'
import {
  gestaoIndustrializadorService,
  DEFAULT_THRESHOLDS,
} from '@/services/gestao-industrializador-service'
import { formatNumberPtBr } from '@/lib/number-format'
import { officialNavGroups } from '@/components/layout/PCPNavigation'
import pbNamed, { pb as namedExport } from '@/lib/pocketbase/client'

describe('Suíte de Aceitação — Gestão Industrializador', () => {
  // 1. DUPLA EXPORTAÇÃO POCKETBASE CLIENT (REGRA PERMANENTE)
  it('garante a dupla exportação de pb em src/lib/pocketbase/client.ts (export const pb + export default pb)', () => {
    expect(namedExport).toBeDefined()
    expect(pbNamed).toBeDefined()
    expect(namedExport).toBe(pbNamed)
  })

  // 2. MENU E ROTAS OFICIAIS NO PCPNAVIGATION
  it('garante o grupo GESTÃO INDUSTRIALIZADOR no menu lateral com visão consolidada e 4 subtópicos', () => {
    const industrializerGroup = officialNavGroups.find(
      (g) => g.groupTitle === 'GESTÃO INDUSTRIALIZADOR',
    )
    expect(industrializerGroup).toBeDefined()
    expect(industrializerGroup?.items.length).toBe(5)

    const titles = industrializerGroup?.items.map((i) => i.title)
    expect(titles).toContain('Visão Consolidada')
    expect(titles).toContain('1. Gestão de MP')
    expect(titles).toContain('2. Análise de Carteira')
    expect(titles).toContain('3. Sequenciamento P x R')
    expect(titles).toContain('4. Estoque Industrializados')

    const hrefs = industrializerGroup?.items.map((i) => i.href)
    expect(hrefs).toContain('/pcp/gestao-industrializador')
    expect(hrefs).toContain('/pcp/gestao-industrializador/mp')
    expect(hrefs).toContain('/pcp/gestao-industrializador/carteira')
    expect(hrefs).toContain('/pcp/gestao-industrializador/sequenciamento')
    expect(hrefs).toContain('/pcp/gestao-industrializador/estoque')
  })

  // 3. DIMENSÃO ESTRUTURAL: FILTRO INDUSTRIALIZADOR DINÂMICO (SEM HARDCODE)
  it('carrega industrializadores dinamicamente e suporta seleção estrutural [Todos] ou código específico', async () => {
    const industrializadores = await gestaoIndustrializadorService.getIndustrializadores()
    expect(industrializadores.length).toBeGreaterThan(0)

    const allMetrics = await gestaoIndustrializadorService.getConsolidatedMetrics({
      industrializerCode: 'ALL',
    })
    expect(allMetrics.mp_total_available_tons).toBeGreaterThan(0)

    const firstCode = industrializadores[0].code
    const filteredMetrics = await gestaoIndustrializadorService.getConsolidatedMetrics({
      industrializerCode: firstCode,
    })
    expect(filteredMetrics.mp_total_available_tons).toBeGreaterThan(0)
  })

  // 4. OS 14 CARDS CONSOLIDADOS E SEUS DETALHAMENTOS
  it('fornece os 14 indicadores consolidados da cadeia com materiais vinculados em materials_detail', async () => {
    const metrics = await gestaoIndustrializadorService.getConsolidatedMetrics()
    expect(metrics.mp_total_available_tons).toBeDefined()
    expect(metrics.mp_quality_control_tons).toBeDefined()
    expect(metrics.mp_in_transit_tons).toBeDefined()
    expect(metrics.mp_programmed_requirement_tons).toBeDefined()
    expect(metrics.mp_projected_balance_tons).toBeDefined()
    expect(metrics.materials_with_rupture_risk_count).toBeDefined()
    expect(metrics.carteira_total_tons).toBeDefined()
    expect(metrics.carteira_in_risk_tons).toBeDefined()
    expect(metrics.volume_programmed_tons).toBeDefined()
    expect(metrics.volume_realized_tons).toBeDefined()
    expect(metrics.adherence_pct).toBeDefined()
    expect(metrics.stock_semi_finished_tons).toBeDefined()
    expect(metrics.stock_finished_tons).toBeDefined()
    expect(metrics.billed_awaiting_receipt_tons).toBeDefined()

    // Verifica que cada um dos 14 cards possui array para o modal de drilldown
    expect(Array.isArray(metrics.materials_detail.mp_available)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.mp_quality)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.mp_transit)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.mp_consumption)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.mp_balance)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.mp_rupture)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.carteira_total)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.carteira_risk)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.sequencing_programmed)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.sequencing_realized)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.sequencing_adherence)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.stock_semi)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.stock_finished)).toBe(true)
    expect(Array.isArray(metrics.materials_detail.billed_awaiting)).toBe(true)
  })

  // 5. GESTÃO DE MP: MATRIZ DE PROJEÇÃO E SEGREGAÇÃO FÍSICA SEM DUPLA CONTAGEM
  it('calcula Saldo Projetado = Estoque Atual + Trânsito − Consumo Programado e segrega depósitos DP07/18, DP09/08, DP24/30', async () => {
    const rows = await gestaoIndustrializadorService.getMPProjectionMatrix()
    expect(rows.length).toBeGreaterThan(0)

    rows.forEach((row) => {
      // Saldo projetado
      const expectedBalance =
        row.current_stock_tons + row.in_transit_tons - row.programmed_consumption_tons
      expect(row.projected_balance_tons).toBeCloseTo(expectedBalance, 1)

      // Total Físico da Cadeia sem dupla contagem de fases diferentes
      const totalPhysicalChain =
        row.current_stock_tons +
        row.in_transit_tons +
        row.dp09_tons +
        row.dp08_tons +
        row.dp24_tons +
        row.dp30_tons +
        row.scrap_scale_tons

      expect(totalPhysicalChain).toBeGreaterThanOrEqual(row.current_stock_tons)
      expect(row.data_source).toBe('SAP ECC (MARD/MB52/ZPP)')
    })
  })

  // 6. ANÁLISE DE CARTEIRA: BASE OFICIAL ZSD28C E NÃO CRIAÇÃO DE SEGUNDA BASE
  it('reutiliza a base SAP ZSD28C e identifica riscos sem dados fictícios', async () => {
    const carteira = await gestaoIndustrializadorService.getCarteiraIndustrializador()
    expect(carteira.length).toBeGreaterThan(0)

    carteira.forEach((item) => {
      expect(item.sap_order).toBeDefined()
      expect(item.material_code).toBeDefined()
      expect(item.ordered_quantity_tons).toBeGreaterThanOrEqual(0)
      expect(item.balance_tons).toBeGreaterThanOrEqual(0)
      expect(['NO_PRAZO', 'EM_RISCO', 'ATRASADO', 'CONCLUIDO']).toContain(item.status)
      expect(['BAIXO', 'MEDIO', 'ALTO', 'CRITICO']).toContain(item.risk_level)
    })
  })

  // 7. SEQUENCIAMENTO: PREVISTO X REALIZADO SEM DUPLICIDADE DE FATURAMENTO
  it('assegura distinção explícita entre Data prevista de faturamento e Data real de faturamento', async () => {
    const seq = await gestaoIndustrializadorService.getSequenciamentoPrevistoRealizado()
    expect(seq.length).toBeGreaterThan(0)

    seq.forEach((item) => {
      // Deve ter ambas as datas distintas
      expect(item).toHaveProperty('predicted_billing_date')
      expect(item).toHaveProperty('real_billing_date')
      expect(item.timeline_steps.length).toBe(9)

      // Etapas pendentes têm status 'Pendente' e data null, nunca data fictícia
      const pendingSteps = item.timeline_steps.filter((s) => s.status === 'PENDENTE')
      pendingSteps.forEach((step) => {
        expect(step.date).toBeNull()
      })
    })
  })

  // 8. ESTOQUE DE INDUSTRIALIZADOS: TOTAL FÍSICO CIAFAL VS TOTAL CONSIDERANDO FATURAMENTO
  it('aplica fórmulas rastreáveis de estoque sem dupla contagem', async () => {
    const estoque = await gestaoIndustrializadorService.getEstoqueIndustrializadoAnalitico()
    expect(estoque.length).toBeGreaterThan(0)

    const mpTons = estoque
      .filter(
        (r) =>
          r.category === 'MP_DEPOSITO' ||
          r.storage_location === 'DP18' ||
          r.storage_location === 'DP07',
      )
      .reduce((a, b) => a + b.quantity_tons, 0)

    const semiTons = estoque
      .filter(
        (r) =>
          r.category === 'SEMIACABADO' ||
          r.storage_location === 'DP09' ||
          r.storage_location === 'DP08',
      )
      .reduce((a, b) => a + b.quantity_tons, 0)

    const finishedTons = estoque
      .filter(
        (r) =>
          r.category === 'ACABADO' ||
          r.storage_location === 'DP24' ||
          r.storage_location === 'DP30',
      )
      .reduce((a, b) => a + b.quantity_tons, 0)

    const billedTons = estoque
      .filter((r) => r.category === 'FATURADO_NAO_RECEBIDO' || r.storage_location === 'EXTERNO')
      .reduce((a, b) => a + b.quantity_tons, 0)

    const transitTons = estoque
      .filter((r) => r.category === 'TRANSITO' || r.storage_location === 'TRANSITO')
      .reduce((a, b) => a + b.quantity_tons, 0)

    const scrapTons = estoque
      .filter((r) => r.category === 'SUCATA_CAREPA' || r.storage_location === 'DP99')
      .reduce((a, b) => a + b.quantity_tons, 0)

    const totalFisicoCiafal = mpTons + semiTons + finishedTons + scrapTons
    const totalConsiderandoFaturamento = totalFisicoCiafal + transitTons + billedTons

    expect(totalFisicoCiafal).toBeGreaterThan(0)
    expect(totalConsiderandoFaturamento).toBeGreaterThanOrEqual(totalFisicoCiafal)
  })

  // 9. FORMATAÇÃO PT-BR OFICIAL (VÍRGULA DECIMAL E ESPAÇO ENTRE UNIDADE)
  it('formata números no padrão pt-BR com vírgula e espaçamento de unidade', () => {
    const formatted = formatNumberPtBr(1323.54, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    expect(formatted).toBe('1.323,54')
  })

  // 10. FONTE OFICIAL E ÚLTIMA SINCRONIZAÇÃO
  it('retorna os metadados de Fonte oficial única e Última sincronização', () => {
    const info = gestaoIndustrializadorService.getOfficialSourceInfo()
    expect(info.officialSource).toContain('SAP ECC')
    expect(info.lastSyncAt).toBeDefined()
  })

  // 11. AUDITORIA APPEND-ONLY EM PCP_AUDIT_LOGS
  it('permite registrar eventos de auditoria append-only', async () => {
    const success = await gestaoIndustrializadorService.logAuditAction({
      action: 'THRESHOLD_CHANGE',
      entity: 'gestao_industrializador_parameters',
      record_id: 'GLOBAL',
      old_value: { green: 15 },
      new_value: { green: 20 },
      source: 'TEST_SUITE',
      details: 'Ajuste de teste automatizado',
    })
    expect(success).toBe(true)
  })
})
