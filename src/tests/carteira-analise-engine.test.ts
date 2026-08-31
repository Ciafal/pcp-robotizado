import { describe, it, expect } from 'vitest'
import { CarteiraZSD28CEngine, REGRAS_PADRAO } from '@/services/carteira-engine'
import { CarteiraService } from '@/services/carteira-service'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'

describe('Motor de Cálculos da Análise de Carteira & Paridade ZSD28C CIAFAL', () => {
  // =========================================================================
  // 1. Ciclo L1
  // Regras:
  // Disponibilidade = Estoque Livre + Estoque MTO + Estoque Semiacabado
  // Demanda = Carteira de Vendas + Carteira MTO
  // Carteira Negativa = MIN(0; Disponibilidade - Demanda)
  // Saldo Positivo = MAX(0; Disponibilidade - Demanda)
  // Testar também saldo negativo em valor absoluto
  // =========================================================================
  describe('1. Ciclo L1 - Fórmulas Oficiais e Saldos', () => {
    it('1.1. Deve apurar Disponibilidade, Demanda, Saldo Negativo e Saldo Positivo quando Demanda > Disponibilidade (déficit)', () => {
      const itemL1Deficit: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: '4500100300',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-02',
        nome_cliente: 'Estruturas Metálicas',
        codigo_material: 'C1020',
        descricao_material: 'Barra Chata 1020',
        familia: 'BARRA_CHATA',
        curva_abc: 'A',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 100,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 100,
        carteira_vendas_tons: 100,
        carteira_mto_tons: 20,
        estoque_livre_tons: 30,
        estoque_mto_tons: 10,
        estoque_semiacabado_tons: 40,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 2,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemL1Deficit, [])

      // Disponibilidade = 30 (Livre) + 10 (MTO) + 40 (Semi) = 80 t
      // Demanda = 100 (Vendas) + 20 (MTO) = 120 t
      // Balanço = 80 - 120 = -40 t
      // Carteira Negativa = MIN(0; -40) = -40 t
      // Saldo Positivo = MAX(0; -40) = 0 t
      expect(res.saldo_negativo_tons).toBe(-40)
      expect(res.saldo_positivo_tons).toBe(0)
      // Validação do saldo negativo em valor absoluto
      expect(Math.abs(res.saldo_negativo_tons)).toBe(40)
      expect(res.necessidade_liquida_tons).toBe(40)
      expect(res.linha).toBe('L1')
    })

    it('1.2. Deve apurar Saldo Positivo e Carteira Negativa nula quando Disponibilidade > Demanda (superávit)', () => {
      const itemL1Superavit: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: '4500100301',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-02',
        nome_cliente: 'Estruturas Metálicas',
        codigo_material: 'C1020',
        descricao_material: 'Barra Chata 1020',
        familia: 'BARRA_CHATA',
        curva_abc: 'A',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 50,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 50,
        carteira_vendas_tons: 50,
        carteira_mto_tons: 10, // Demanda total = 60 t
        estoque_livre_tons: 40,
        estoque_mto_tons: 20,
        estoque_semiacabado_tons: 30, // Disponibilidade total = 90 t
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 1,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemL1Superavit, [])

      // Balanço = 90 - 60 = +30 t
      // Carteira Negativa = MIN(0; 30) = 0 t
      // Saldo Positivo = MAX(0; 30) = 30 t
      expect(res.saldo_negativo_tons).toBe(0)
      expect(res.saldo_positivo_tons).toBe(30)
      expect(Math.abs(res.saldo_negativo_tons)).toBe(0)
      expect(res.necessidade_liquida_tons).toBe(0)
    })
  })

  // =========================================================================
  // 2. Ciclo L2 (Regra Legada Preservada)
  // Regras:
  // Carteira Negativa L2 = MIN(0; (Livre + MTO + Semiacabado CIAFAL + Semiacabado Vallourec) - (ZSD24 + Carteira MTO))
  // Saldo Estoque L2 = MAX(0; (Livre + MTO + Semiacabado CIAFAL) - (Carteira de Vendas + Carteira MTO))
  // Testar explicitamente que a diferença de componentes (Vallourec e ZSD24 vs Vendas) é PRESERVADA.
  // =========================================================================
  describe('2. Ciclo L2 - Preservação Estrita da Regra Legada', () => {
    it('2.1. Deve calcular Carteira Negativa e Saldo Estoque preservando a assimetria das fórmulas legadas', () => {
      // Exemplo em que Semiacabado Vallourec cobre a Carteira Negativa no balanço ZSD24,
      // mas o Saldo de Estoque fica 0 porque Vallourec não entra no saldo e Carteira Vendas é maior.
      const itemL2: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L2',
        ordem_venda: '4500100400',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-03',
        nome_cliente: 'Indústria Pesada',
        codigo_material: 'R0500',
        descricao_material: 'Redondo Pesado',
        familia: 'REDONDO',
        curva_abc: 'A',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 50,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 50,
        carteira_vendas_tons: 50,
        carteira_mto_tons: 10,
        zsd24_tons: 40, // Diferente de carteira_vendas (40 vs 50)
        estoque_livre_tons: 20,
        estoque_mto_tons: 5,
        estoque_semiacabado_tons: 15,
        estoque_semiacabado_ciafal_tons: 15,
        estoque_semiacabado_vallourec_tons: 30, // Presente APENAS na Carteira Negativa L2
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 0,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemL2, [])

      // Negativa L2: (20 + 5 + 15 + 30) - (40 + 10) = 70 - 50 = +20 => MIN(0; 20) = 0
      expect(res.saldo_negativo_tons).toBe(0)

      // Saldo Estoque L2: (20 + 5 + 15) - (50 + 10) = 40 - 60 = -20 => MAX(0; -20) = 0
      expect(res.saldo_positivo_tons).toBe(0)
    })

    it('2.2. Deve validar déficit na Carteira Negativa L2 quando a demanda ZSD24 supera o estoque total (incluindo Vallourec)', () => {
      const itemL2Deficit: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L2',
        ordem_venda: '4500100401',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-03',
        nome_cliente: 'Indústria Pesada',
        codigo_material: 'R0500',
        descricao_material: 'Redondo Pesado',
        familia: 'REDONDO',
        curva_abc: 'A',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 80,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 80,
        carteira_vendas_tons: 80,
        carteira_mto_tons: 20,
        zsd24_tons: 100, // Demanda ZSD24 elevada
        estoque_livre_tons: 10,
        estoque_mto_tons: 5,
        estoque_semiacabado_tons: 15,
        estoque_semiacabado_ciafal_tons: 15,
        estoque_semiacabado_vallourec_tons: 20, // Total disp negativa = 10 + 5 + 15 + 20 = 50
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 0,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemL2Deficit, [])

      // Negativa L2: 50 - (100 + 20) = 50 - 120 = -70 => MIN(0; -70) = -70
      expect(res.saldo_negativo_tons).toBe(-70)
      expect(Math.abs(res.saldo_negativo_tons)).toBe(70)

      // Saldo Estoque L2: (10 + 5 + 15) - (80 + 20) = 30 - 100 = -70 => MAX(0; -70) = 0
      expect(res.saldo_positivo_tons).toBe(0)
    })
  })

  // =========================================================================
  // 3. MTO L1
  // Regras:
  // Saldo do Pedido = Quantidade Ordem - Quantidade Faturada
  // Falta Produzir = Saldo do Pedido - Estoque disponível elegível (estoque MTO)
  // Classificação: "A FATURAR" quando Falta Produzir <= 0 e "A PRODUZIR" quando > 0
  // =========================================================================
  describe('3. MTO L1 - Saldo do Pedido, Falta Produzir e Classificações', () => {
    it('3.1. Deve classificar como A FATURAR quando Estoque MTO >= Saldo do Pedido (Falta Produzir <= 0)', () => {
      const itemMtoL1Coberto: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: '4500100500',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-05',
        nome_cliente: 'Cliente Especial L1',
        codigo_material: 'C1020',
        descricao_material: 'Barra Chata 1020',
        familia: 'BARRA_CHATA',
        curva_abc: 'A',
        tipo_ordem: 'MTO',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 60,
        qtd_faturada_tons: 20, // Saldo do pedido = 60 - 20 = 40 t
        carteira_aberta_tons: 40,
        carteira_vendas_tons: 0,
        carteira_mto_tons: 40,
        estoque_livre_tons: 0,
        estoque_mto_tons: 40, // 40 t disponíveis
        estoque_semiacabado_tons: 0,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 1,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemMtoL1Coberto, [])
      expect(res.carteira_aberta_tons).toBe(40) // Saldo do Pedido
      expect(res.falta_produzir_tons).toBe(0) // Falta Produzir = 40 - 40 = 0
      expect(res.status_atendimento).toBe('A_FATURAR')
    })

    it('3.2. Deve classificar como A PRODUZIR quando Falta Produzir > 0 e sem programação', () => {
      const itemMtoL1Pendente: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: '4500100501',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-05',
        nome_cliente: 'Cliente Especial L1',
        codigo_material: 'C1020',
        descricao_material: 'Barra Chata 1020',
        familia: 'BARRA_CHATA',
        curva_abc: 'A',
        tipo_ordem: 'MTO',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 50,
        qtd_faturada_tons: 10, // Saldo = 40 t
        carteira_aberta_tons: 40,
        carteira_vendas_tons: 0,
        carteira_mto_tons: 40,
        estoque_livre_tons: 0,
        estoque_mto_tons: 15, // Estoque disponível = 15 t
        estoque_semiacabado_tons: 0,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 1,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemMtoL1Pendente, [])
      expect(res.carteira_aberta_tons).toBe(40)
      expect(res.falta_produzir_tons).toBe(25) // 40 - 15 = 25 t
      expect(res.status_atendimento).toBe('A_PRODUZIR')
    })
  })

  // =========================================================================
  // 4. MTO L2
  // Regra:
  // Saldo = -Quantidade Ordem + Quantidade Faturada + Estoque Semiacabado + Estoque Acabado
  // =========================================================================
  describe('4. MTO L2 - Balanço de Saldo com Semiacabado e Acabado', () => {
    it('4.1. Deve aplicar rigorosamente a fórmula: Saldo = -QtdOrdem + QtdFaturada + EstoqueSemi + EstoqueAcabado', () => {
      // Caso 1: Saldo negativo (déficit de 40t)
      const saldo1 = CarteiraZSD28CEngine.calcularSaldoMTOL2(100, 30, 20, 10)
      // -100 + 30 + 20 + 10 = -40
      expect(saldo1).toBe(-40)

      // Caso 2: Saldo positivo (superávit de 15t)
      const saldo2 = CarteiraZSD28CEngine.calcularSaldoMTOL2(50, 10, 30, 25)
      // -50 + 10 + 30 + 25 = +15
      expect(saldo2).toBe(15)

      // Caso 3: Saldo equilibrado (zero)
      const saldo3 = CarteiraZSD28CEngine.calcularSaldoMTOL2(80, 20, 40, 20)
      // -80 + 20 + 40 + 20 = 0
      expect(saldo3).toBe(0)
    })
  })

  // =========================================================================
  // 5. Data Fim de Estoque / Cobertura em Dias
  // Regras:
  // Média de faturamento diário configurável
  // Quando média for zero, NÃO gerar divisão inválida (NaN / Infinity) e classificar como "Sem consumo histórico"
  // =========================================================================
  describe('5. Data Fim de Estoque e Cobertura em Dias', () => {
    it('5.1. Deve calcular cobertura em dias e data fim de estoque quando média diária for positiva', () => {
      const dataRef = new Date('2025-06-01T00:00:00.000Z')
      const itemComConsumo: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: '4500100600',
        item_ordem: '10',
        data_ordem: '2025-05-01',
        data_desejada: '2025-06-15',
        codigo_cliente: 'CLI-10',
        nome_cliente: 'Cliente Regular',
        codigo_material: 'C1020',
        descricao_material: 'Barra Chata',
        familia: 'BARRA_CHATA',
        curva_abc: 'B',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 20,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 20,
        carteira_vendas_tons: 20,
        carteira_mto_tons: 0,
        estoque_livre_tons: 50,
        estoque_mto_tons: 0,
        estoque_semiacabado_tons: 0,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_FATURAR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 5, // 50t / 5t/dia = 10 dias
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(
        itemComConsumo,
        [],
        REGRAS_PADRAO,
        dataRef,
      )

      expect(res.dias_cobertura).toBe(10)
      expect(res.data_fim_estoque).toBeDefined()
      // 2025-06-01 + 10 dias = 2025-06-11
      expect(res.data_fim_estoque).toBe('2025-06-11')
    })

    it('5.2. NÃO deve gerar divisão inválida (NaN / Infinity) quando média for zero e deve marcar como sem consumo histórico', () => {
      const itemSemMedia: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'L1',
        ordem_venda: '4500100601',
        item_ordem: '10',
        data_ordem: '2025-05-01',
        data_desejada: '2025-06-15',
        codigo_cliente: 'CLI-11',
        nome_cliente: 'Cliente Novo',
        codigo_material: 'V0200',
        descricao_material: 'Cantoneira',
        familia: 'CANTONEIRA',
        curva_abc: 'C',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 30,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 30,
        carteira_vendas_tons: 30,
        carteira_mto_tons: 0,
        estoque_livre_tons: 15,
        estoque_mto_tons: 0,
        estoque_semiacabado_tons: 0,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 0, // Média zero!
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemSemMedia, [])

      expect(res.dias_cobertura).toBeUndefined()
      expect(res.data_fim_estoque).toBeUndefined()
      expect(isFinite(res.saldo_negativo_tons)).toBe(true)
      expect(res.memoria_calculo?.campos_utilizados.dias_cobertura).toBe('Sem consumo histórico')
    })
  })

  // =========================================================================
  // 6. Cálculo Central (ZSD28C Geral)
  // Regras:
  // Carteira aberta = Quantidade da ordem - Quantidade faturada
  // Necessidade líquida = Carteira aberta - estoques elegíveis - entradas futuras elegíveis
  // Separação entre saldo positivo e negativo
  // =========================================================================
  describe('6. Cálculo Central ZSD28C - Carteira Aberta, Entradas e Necessidade Líquida', () => {
    it('6.1. Deve calcular Carteira Aberta, abater Entradas Futuras e apurar Necessidade Líquida', () => {
      const itemGeral: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'GERAL',
        ordem_venda: '4500200100',
        item_ordem: '10',
        data_ordem: '2025-01-15',
        data_desejada: '2025-02-28',
        codigo_cliente: 'CLI-20',
        nome_cliente: 'Distribuidora Central',
        codigo_material: 'X1020',
        descricao_material: 'Aço Laminado Geral',
        familia: 'Geral',
        curva_abc: 'A',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 100,
        qtd_faturada_tons: 40, // Carteira aberta = 60 t
        carteira_aberta_tons: 0,
        carteira_vendas_tons: 0,
        carteira_mto_tons: 0,
        estoque_livre_tons: 20, // Estoque = 20 t
        estoque_mto_tons: 0,
        estoque_semiacabado_tons: 0,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'A_PRODUZIR',
        qtd_programada_tons: 0,
        media_faturamento_diario_t_dia: 2,
        status_ruptura: 'CINZA',
        bloqueio: false,
      }

      const entradaRevenda: CarteiraEntradaFutura = {
        empresa: 'CIAFAL',
        centro: '1000',
        codigo_material: 'X1020',
        descricao_material: 'Aço Laminado Geral',
        origem: 'REVENDA',
        documento_ref: 'PO-REV-200',
        fornecedor_origem: 'Gerdau',
        quantidade_prevista_tons: 15,
        quantidade_recebida_tons: 0,
        quantidade_pendente_tons: 15,
        data_prevista_entrada: '2025-02-10',
        status_entrada: 'CONFIRMADO',
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemGeral, [entradaRevenda])

      // Carteira Aberta = 100 - 40 = 60 t
      expect(res.carteira_aberta_tons).toBe(60)
      // Saldo Disponibilidade (20) - Carteira (60) = -40 t
      expect(res.saldo_negativo_tons).toBe(-40)
      expect(res.saldo_positivo_tons).toBe(0)
      // Necessidade Líquida = 60 - 20 (estoque) - 15 (entrada) = 25 t
      expect(res.necessidade_liquida_tons).toBe(25)
    })
  })

  // =========================================================================
  // 7. Detecção de Duplicidades / Sobrecobertura
  // Cenário: 20 t carteira aberta, 5 t em estoque, 15 t de revenda confirmada
  // e mais 20 t de produção própria programada -> alerta de duplicidade/sobrecobertura
  // sem cancelar nada automaticamente.
  // =========================================================================
  describe('7. Detecção de Duplicidades e Sobrecobertura', () => {
    it('7.1. Deve gerar alerta de sobrecobertura no cenário canônico (20t carteira, 5t estoque, 15t revenda, 20t prog)', () => {
      const itemSobrecobertura: CarteiraItem = {
        empresa: 'CIAFAL',
        centro: '1000',
        linha: 'GERAL',
        ordem_venda: '4500999999',
        item_ordem: '10',
        data_ordem: '2025-01-10',
        data_desejada: '2025-02-15',
        codigo_cliente: 'CLI-04',
        nome_cliente: 'Distribuidor Regional',
        codigo_material: 'C1045',
        descricao_material: 'Barra Chata 1045',
        familia: 'BARRA_CHATA',
        curva_abc: 'A',
        tipo_ordem: 'MTS',
        origem_produto: 'PRODUCAO_PROPRIA',
        qtd_ordem_tons: 20,
        qtd_faturada_tons: 0,
        carteira_aberta_tons: 20,
        carteira_vendas_tons: 20,
        carteira_mto_tons: 0,
        estoque_livre_tons: 5,
        estoque_mto_tons: 0,
        estoque_semiacabado_tons: 0,
        estoque_acabado_tons: 0,
        saldo_disponivel_tons: 0,
        saldo_positivo_tons: 0,
        saldo_negativo_tons: 0,
        necessidade_liquida_tons: 0,
        falta_produzir_tons: 0,
        status_atendimento: 'PROGRAMADO',
        qtd_programada_tons: 20,
        media_faturamento_diario_t_dia: 1,
        status_ruptura: 'VERDE',
        bloqueio: false,
      }

      const entradaRevenda: CarteiraEntradaFutura = {
        empresa: 'CIAFAL',
        centro: '1000',
        codigo_material: 'C1045',
        descricao_material: 'Barra Chata 1045',
        origem: 'REVENDA',
        documento_ref: 'PO-REV-99',
        fornecedor_origem: 'Gerdau',
        quantidade_prevista_tons: 15,
        quantidade_recebida_tons: 0,
        quantidade_pendente_tons: 15,
        data_prevista_entrada: '2025-02-01',
        status_entrada: 'CONFIRMADO',
      }

      const res = CarteiraZSD28CEngine.calcularItem(itemSobrecobertura, [entradaRevenda])

      expect(res.possivel_duplicidade).toBe(true)
      expect(res.duplicidade_detalhes?.tipo_duplicidade).toBe(
        'SOBRECOBERTURA_PRODUCAO_REVENDA',
      )
      // Cobertura total = 5 + 15 + 20 = 40 t vs Carteira 20 t => Excesso = 20 t
      expect(res.duplicidade_detalhes?.quantidade_sobrecoberta_tons).toBe(20)
      // Alerta gerado sem cancelar a ordem
      expect(res.qtd_ordem_tons).toBe(20)
      expect(res.qtd_programada_tons).toBe(20)
    })
  })

  // =========================================================================
  // 8. Sanitização e Validação da Importação QAS
  // Regras:
  // Rejeitar Excel Formula Injection (iniciando com =, +, -, @, \t ou \r)
  // Validar obrigatoriedade de código do material
  // Detectar duplicidade de chave (ordem + item + material)
  // =========================================================================
  describe('8. Sanitização e Validação de Importação QAS', () => {
    it('8.1. Deve neutralizar caracteres perigosos de Excel Formula Injection', () => {
      const formulasInjetadas = [
        '=1+1',
        '+cmd|"/c calc"!A0',
        '-2+3',
        '@SUM(1,2)',
        '\tValorComTab',
        '\rValorComCR',
      ]

      formulasInjetadas.forEach((formula) => {
        const sanitizado = CarteiraService.sanitizarCampoTexto(formula)
        expect(sanitizado.startsWith("'")).toBe(true)
      })

      const textoSeguro = 'Material C1020'
      expect(CarteiraService.sanitizarCampoTexto(textoSeguro)).toBe('Material C1020')
    })

    it('8.2. Deve identificar campos obrigatórios ausentes (ex.: código do material)', () => {
      const linhasInvalidas = [
        {
          'Código do material': '',
          'Ordem de venda': '4500111',
          'Item': '10',
          'Quantidade da ordem (t)': '10',
        },
      ]

      const resultado = CarteiraService.validarLinhasCarteira(linhasInvalidas)
      expect(resultado.valido).toBe(false)
      expect(resultado.erros.length).toBeGreaterThan(0)
      expect(resultado.erros[0].campo).toBe('Código do material')
    })

    it('8.3. Deve detectar e sinalizar duplicidades de Pedido + Item + Material no arquivo', () => {
      const linhasDuplicadas = [
        {
          'Código do material': 'C1020',
          'Ordem de venda': '4500900',
          'Item': '10',
          'Quantidade da ordem (t)': '20',
        },
        {
          'Código do material': 'C1020',
          'Ordem de venda': '4500900',
          'Item': '10',
          'Quantidade da ordem (t)': '20',
        },
      ]

      const resultado = CarteiraService.validarLinhasCarteira(linhasDuplicadas)
      expect(resultado.duplicados.length).toBe(1)
      expect(resultado.duplicados[0].pedido).toBe('4500900')
      expect(resultado.duplicados[0].material).toBe('C1020')
      expect(resultado.alertas.length).toBe(1)
    })
  })
})
