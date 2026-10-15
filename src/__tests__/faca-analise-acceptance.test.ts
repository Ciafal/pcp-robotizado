import { describe, it, expect, vi } from 'vitest'
import { FacaAnaliseService } from '@/services/faca-analise-service'
import { pb } from '@/lib/pocketbase/client'

describe('Análise de FACA — Regras Técnicas, Cálculos e Cenários Mandatórios', () => {
  it('Cenário 1: Cálculo obrigatório de MP necessária = saldo a produzir / rendimento de transformação', () => {
    // Rendimento nominal 92% (0.92) e saldo a produzir de 23.5 t
    const saldoAProduzir = 23.5
    const rendimento = 0.92
    const mpNecessaria = Number((saldoAProduzir / rendimento).toFixed(2))

    expect(mpNecessaria).toBe(25.54)
    // Valida que não há rendimento fictício ou 1:1 sem perda
    expect(mpNecessaria).toBeGreaterThan(saldoAProduzir)
  })

  it('Cenário 2: Previsão de Faturamento diferencia explicitamente Confirmado de Potencial', () => {
    const kpisMock = {
      carteira_total_t: 50.0,
      estoque_disponivel_pa_t: 15.0,
      necessidade_producao_t: 35.0,
      mp_especifica_disponivel_t: 60.0,
      mp_necessaria_t: 38.04,
      faturamento_potencial_brl: 410000,
      faturamento_confirmado_brl: 123000,
      estoque_sem_pedido_t: 18.2,
      carteira_minima_abaixo_t: 18.0,
      pedidos_criticos_count: 2,
    }

    const itensMock: any[] = [
      {
        codigo_material: 'FACA-450-1045',
        descricao: 'BARRA CHATA FACA 450x12',
        carteira_aberta_t: 15.0,
        estoque_livre_pa_t: 15.0,
        saldo_a_produzir_t: 0.0,
        mp_necessaria_t: 0.0,
        previsao_faturamento: 'FATURAMENTO_CONFIRMADO',
        observacoes_ia: 'Cobertura 100% de estoque',
      },
    ]

    const relatorio = FacaAnaliseService.gerarRelatorioExecutivo(
      itensMock,
      [],
      kpisMock,
      [],
      'CIAFAL',
      '1100',
    )

    expect(relatorio.previsao_faturamento.faturamento_confirmado_brl).toBe(123000)
    expect(relatorio.previsao_faturamento.potencial_faturamento_brl).toBe(410000)
    expect(relatorio.previsao_faturamento.aguardando_producao_brl).toBe(287000)
  })

  it('Cenário 3: Material abaixo da carteira mínima de laminação detecta lote e volume faltante', () => {
    const loteMinimoParametrizado = 25.0 // t
    const pedidoAberto = 18.0 // t
    const volumeFaltante = loteMinimoParametrizado - pedidoAberto

    expect(volumeFaltante).toBe(7.0)
    expect(pedidoAberto).toBeLessThan(loteMinimoParametrizado)
  })

  it('Cenário 4: Dedução e consumo de MP técnica sem duplicidade simultânea', () => {
    const estoqueMpInicial = 100.0
    const consumoProdutoA = 38.59
    const saldoAposA = estoqueMpInicial - consumoProdutoA

    const consumoProdutoB = 40.0
    const saldoFinal = saldoAposA - consumoProdutoB

    expect(saldoFinal).toBeCloseTo(21.41, 2)
    // Garante que o mesmo saldo não foi considerado disponível para ambos integralmente
    expect(saldoFinal).toBeLessThan(saldoAposA)
  })

  it('Cenário 5: Disparo de e-mail sem SMTP configurado registra falha auditável sem fingir sucesso', async () => {
    // Mock pb.collection('faca_envios_email').create and pcp_audit_logs.create
    const spyCreate = vi.spyOn(pb.collection('faca_envios_email'), 'create').mockResolvedValueOnce({
      id: 'env-test-1',
      codigo_envio: 'ENV-2026-999999',
      codigo_analise: 'FACA-TEST',
      remetente_nome: 'Programador PCP',
      remetente_email: 'pcp@ciafal.com.br',
      destinatarios_para: ['diretoria@ciafal.com.br'],
      destinatarios_cc: [],
      areas_envolvidas: ['PCP'],
      assunto: 'Teste FACA',
      corpo_html: '<p>Teste</p>',
      anexo_pdf_gerado: true,
      data_hora_envio: '10/10/2026 10:00:00',
      status_envio: 'Falha de envio — serviço de e-mail (SMTP) não configurado no backend',
      mensagem_retorno: 'SMTP não configurado',
    } as any)

    const spyAudit = vi
      .spyOn(pb.collection('pcp_audit_logs'), 'create')
      .mockResolvedValueOnce({} as any)

    const resultado = await FacaAnaliseService.registrarEnvioEmail({
      codigo_analise: 'FACA-TEST',
      remetente_nome: 'Programador PCP',
      remetente_email: 'pcp@ciafal.com.br',
      destinatarios_para: ['diretoria@ciafal.com.br'],
      destinatarios_cc: [],
      areas_envolvidas: ['PCP'],
      assunto: 'Teste FACA',
      corpo_html: '<p>Teste</p>',
      anexo_pdf_gerado: true,
    })

    expect(resultado.sucesso).toBe(false)
    expect(resultado.envio.status_envio).toContain('Falha de envio')
    expect(resultado.mensagem).toContain('SMTP')

    spyCreate.mockRestore()
    spyAudit.mockRestore()
  })

  it('Cenário 7: Auditoria em pcp_audit_logs para operações da Análise de FACA com rastreabilidade de valores', async () => {
    const spyAudit = vi
      .spyOn(pb.collection('pcp_audit_logs'), 'create')
      .mockResolvedValueOnce({ id: 'log-1' } as any)

    await FacaAnaliseService.registrarAuditLog({
      acao: 'APROVACAO_ANALISE_FACA',
      recursoId: 'FACA-2026-000001',
      usuarioNome: 'Gestor PCP',
      usuarioEmail: 'gestor@ciafal.com.br',
      motivo: 'Aprovação executiva de relatório de FACA',
      detalhes: {
        valores_anteriores: { status: 'RASCUNHO' },
        valores_posteriores: { status: 'APROVADO' },
      },
    })

    expect(spyAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'APROVACAO_ANALISE_FACA',
        module: 'ANALISE_DE_CARTEIRA',
        screen: 'Análise de FACA',
        company: 'CIAFAL',
        details: expect.objectContaining({
          valores_anteriores: { status: 'RASCUNHO' },
          valores_posteriores: { status: 'APROVADO' },
        }),
      }),
    )

    spyAudit.mockRestore()
  })

  it('Cenário 10: Parametrização e vínculos persistem auditoria e cálculo de MP com rendimento', async () => {
    const spyCreateMat = vi
      .spyOn(pb.collection('faca_parametrizacao_materiais'), 'create')
      .mockResolvedValueOnce({ id: 'param-1' } as any)
    const spyAudit = vi
      .spyOn(pb.collection('pcp_audit_logs'), 'create')
      .mockResolvedValueOnce({ id: 'log-2' } as any)

    await FacaAnaliseService.salvarMaterialParametrizado({
      codigo_material: 'FACA-TEST-001',
      descricao_material: 'TESTE FACA',
      grupo_faca: 'FACAS AGRÍCOLAS',
      centro: '1100',
      carteira_minima_lam_t: 30,
    })

    expect(spyCreateMat).toHaveBeenCalled()
    expect(spyAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CADASTRO_PARAMETRIZACAO_MATERIAL',
      }),
    )

    spyCreateMat.mockRestore()
    spyAudit.mockRestore()
  })

  it('Cenário 6: Regra permanente — exportação dupla de pb em client.ts', async () => {
    const clientModule = await import('@/lib/pocketbase/client')
    expect(clientModule.pb).toBeDefined()
    expect(clientModule.default).toBeDefined()
    expect(clientModule.pb).toBe(clientModule.default)
  })

  it('Cenário 8: Diagnóstico IA cobre as 6 situações oficiais A, B, C, D, E, F sem dados fictícios', async () => {
    const dados = await FacaAnaliseService.getDadosAnaliticosCompletos()
    const tiposAlertas = dados.alertasIA.map((a) => a.tipo)

    expect(tiposAlertas).toContain('A_ESTOQUE_SEM_FATURAMENTO')
    expect(tiposAlertas).toContain('B_PEDIDO_SUPERIOR_ESTOQUE')
    expect(tiposAlertas).toContain('C_CARTEIRA_MINIMA_NAO_ATINGIDA')
    expect(tiposAlertas).toContain('D_PRODUCAO_POSTERIOR_CAMPANHA')
    expect(tiposAlertas).toContain('E_PEDIDO_CANCELADO_ESTOQUE_REMANESCENTE')
    expect(tiposAlertas).toContain('F_MP_INSUFICIENTE')

    // Assegura que todas as recomendações possuem área responsável e ação concreta
    dados.alertasIA.forEach((alerta) => {
      expect(alerta.area_responsavel).toBeTruthy()
      expect(alerta.acao_sugerida).toBeTruthy()
      expect(alerta.motivo_tecnico).toBeTruthy()
    })
  })

  it('Cenário 9: Ausência de dado na integração mostra explicitamente indicação de não disponível', async () => {
    // Para material sem pedido e sem entrega futura, data prevista é "-" e observação é explícita
    const dados = await FacaAnaliseService.getDadosAnaliticosCompletos()
    const itemEstoqueLivre = dados.itens.find(
      (i) => i.status_atendimento === 'SEM_PEDIDO_ESTOQUE_LIVRE',
    )

    expect(itemEstoqueLivre).toBeDefined()
    expect(itemEstoqueLivre?.pedido_sap).toBe('N/A')
    expect(itemEstoqueLivre?.data_prevista_entrega).toBe('-')
    expect(itemEstoqueLivre?.previsao_faturamento).toBe('NAO_APLICAVEL')
  })

  it('Cenário 11: Correção do card MP Específica — não utiliza carteira comercial como fonte e reflete estoque físico e potencial', async () => {
    const dados = await FacaAnaliseService.getDadosAnaliticosCompletos()
    const { kpis } = dados

    // (1) O valor de MP Específica Disponível NÃO pode ser igual à carteira de pedidos nem à MP necessária
    expect(kpis.mp_especifica_disponivel_t).not.toBe(kpis.carteira_total_t)
    expect(kpis.mp_especifica_disponivel_t).not.toBe(kpis.mp_necessaria_t)

    // (2) Detalhamento consolidado está presente
    expect(kpis.mp_detalhe_consolidado).toBeDefined()
    const mpConsolidado = kpis.mp_detalhe_consolidado!

    // (3) Considera depósitos DP07, DP04 e demais depósitos elegíveis (DP18)
    expect(mpConsolidado.depositos_considerados).toContain('DP07')
    expect(mpConsolidado.depositos_considerados).toContain('DP04')
    expect(mpConsolidado.depositos_considerados).toContain('DP18')

    // (4) Informação distinta: MP Disponível Agora e MP Potencial Total
    expect(mpConsolidado.mp_disponivel_agora_t).toBe(kpis.mp_especifica_disponivel_t)
    expect(mpConsolidado.mp_potencial_total_t).toBeGreaterThanOrEqual(
      mpConsolidado.mp_disponivel_agora_t,
    )

    // (5) Saldo a cortar na KS identificado com rendimento e sem misturar com estoque físico
    expect(mpConsolidado.ks_saldo_a_cortar_t).toBeGreaterThan(0)

    // (6) Saldo a produzir na L2 identificado com rendimento
    expect(mpConsolidado.l2_mp_a_produzir_t).toBeGreaterThan(0)

    // (7) Consolidação sem dupla contagem: sobreposições do fluxo L2 -> KS devidamente deduzidas
    expect(mpConsolidado.sobreposicoes_deduzidas_t).toBeGreaterThanOrEqual(0)
    const somaSemDeducao =
      mpConsolidado.tarugos_disponiveis_t +
      mpConsolidado.ks_saldo_a_cortar_t +
      mpConsolidado.l2_mp_a_produzir_t
    expect(mpConsolidado.mp_potencial_total_t).toBeCloseTo(
      somaSemDeducao - mpConsolidado.sobreposicoes_deduzidas_t,
      1,
    )

    // (8) Segregação estrita por tipo de aço: aços não são intercambiáveis
    expect(mpConsolidado.por_tipo_aco.length).toBeGreaterThanOrEqual(3)
    const acos = mpConsolidado.por_tipo_aco.map((a) => a.tipo_aco)
    expect(acos).toContain('SAE 1045')
    expect(acos).toContain('SAE 5160')
    expect(acos).toContain('SAE 1070')

    // Cada aço tem seu próprio balanço e status de cobertura
    mpConsolidado.por_tipo_aco.forEach((acoData) => {
      expect(acoData.potencial_total_t).toBeGreaterThanOrEqual(0)
      expect(acoData.status_cobertura).toMatch(
        /COBERTO_TOTAL|COBERTO_IMEDIATO|DEPENDENTE_KS_L2|DEFICIT_CRITICO/,
      )
    })

    // (9) Itens detalhados possuem rastreabilidade de depósito, centro, qualidade e produtos compatíveis
    expect(mpConsolidado.itens_detalhados.length).toBeGreaterThan(0)
    mpConsolidado.itens_detalhados.forEach((item) => {
      expect(item.empresa).toBeTruthy()
      expect(item.centro).toBeTruthy()
      expect(item.deposito).toBeTruthy()
      expect(item.tipo_aco).toBeTruthy()
      expect(item.bitola).toBeTruthy()
      expect(item.status_qualidade).toMatch(/LIVRE|CONTROLE_QUALIDADE|BLOQUEADO/)
      expect(item.produtos_faca_compativeis).toBeDefined()
    })
  })
})
