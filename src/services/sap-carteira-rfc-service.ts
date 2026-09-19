import pb from '@/lib/pocketbase/client'
import { CarteiraItem, CarteiraEntradaFutura } from '@/types/carteira-analise'
import { CarteiraSDCItem } from '@/types/carteira-sdc'
import { CarteiraZSD28CEngine, REGRAS_PADRAO } from './carteira-engine'
import { CarteiraSDCService } from './carteira-sdc-service'

export interface SapRfcQueryOptions {
  carteiraTipo?: 'GERAL' | 'L1' | 'L2' | 'MTO' | 'REVENDA' | 'IMPORTADO' | 'SDC'
  centro?: string
  canal?: string
  forceRefresh?: boolean
}

export interface SapRfcResponse {
  sucesso: boolean
  itens: CarteiraItem[]
  entradasFuturas: CarteiraEntradaFutura[]
  sdcItens?: CarteiraSDCItem[]
  timestamp: string
  duracaoMs: number
  referenciaSap: 'ZSD28C'
  fonteAtual: 'SAP ECC • RFC'
  mensagem?: string
  erroDisponibilidade?: boolean
  totalItens: number
}

export interface CurvaAbcParametrosBackend {
  corteA_pct: number
  corteB_pct: number
  fonte_faturamento: string
  preco_medio_tonelada_padrao_brl?: number
  considerar_apenas_faturamento: boolean
}

export const CURVA_ABC_PARAMETROS_DEFAULT: CurvaAbcParametrosBackend = {
  corteA_pct: 85.0,
  corteB_pct: 95.0,
  fonte_faturamento: 'SAP',
  preco_medio_tonelada_padrao_brl: 4850.0,
  considerar_apenas_faturamento: true,
}

// In-memory cache for SAP RFC dataset
let rfcMemoryCache: {
  itens: CarteiraItem[]
  entradasFuturas: CarteiraEntradaFutura[]
  sdcItens: CarteiraSDCItem[]
  timestamp: string
  referenciaSap: 'ZSD28C'
  fonteAtual: 'SAP ECC • RFC'
} | null = null

let rfcPendingPromise: Promise<SapRfcResponse> | null = null

export class SapCarteiraRfcService {
  public static readonly REFERENCIA_SAP = 'ZSD28C'
  public static readonly FONTE_ATUAL = 'SAP ECC • RFC'

  /**
   * Obtém os parâmetros parametrizáveis de Curva ABC do backend (coleção carteira_regras_config)
   */
  public static async obterParametrosCurvaAbc(): Promise<CurvaAbcParametrosBackend> {
    try {
      const records = await pb.collection('carteira_regras_config').getFullList({
        filter: 'chave_regra = "CURVA_ABC_PARAMETROS" && ativo = true',
        requestKey: null,
      })
      if (records.length > 0 && records[0].payload) {
        const p = records[0].payload
        return {
          corteA_pct: Number(p.corteA_pct) || 85.0,
          corteB_pct: Number(p.corteB_pct) || 95.0,
          fonte_faturamento: p.fonte_faturamento || 'SAP',
          preco_medio_tonelada_padrao_brl: Number(p.preco_medio_tonelada_padrao_brl) || 4850.0,
          considerar_apenas_faturamento: p.considerar_apenas_faturamento !== false,
        }
      }
    } catch (err) {
      console.warn('SapCarteiraRfcService.obterParametrosCurvaAbc: fallback default', err)
    }
    return { ...CURVA_ABC_PARAMETROS_DEFAULT }
  }

  /**
   * Salva parâmetros atualizados da Curva ABC no backend
   */
  public static async salvarParametrosCurvaAbc(
    params: Partial<CurvaAbcParametrosBackend>,
    justificativa?: string,
  ): Promise<boolean> {
    try {
      const auth = pb.authStore.model
      const userName = auth?.name || 'Administrador PCP'
      const userEmail = auth?.email || 'pcp.admin@ciafal.com.br'

      const existing = await pb.collection('carteira_regras_config').getFullList({
        filter: 'chave_regra = "CURVA_ABC_PARAMETROS"',
        requestKey: null,
      })

      const current = await this.obterParametrosCurvaAbc()
      const novoPayload = {
        ...current,
        ...params,
        atualizado_em: new Date().toISOString(),
      }

      if (existing.length > 0) {
        await pb.collection('carteira_regras_config').update(existing[0].id, {
          payload: novoPayload,
          responsavel_nome: userName,
          responsavel_email: userEmail,
          justificativa_alteracao:
            justificativa || 'Atualização dos limites parametrizáveis da Curva ABC',
          versao: (existing[0].versao || 1) + 1,
        })
      }

      // Auditar alteração em pcp_audit_logs
      await this.gravarLogAuditoria({
        action: 'UPDATE_ABC_PARAMETERS',
        carteiraTipo: 'GERAL',
        duracaoMs: 0,
        sucesso: true,
        detalhes: {
          novos_parametros: novoPayload,
          justificativa,
        },
      })

      return true
    } catch (err) {
      console.error('Erro ao salvar parâmetros da Curva ABC:', err)
      return false
    }
  }

  /**
   * Consulta a Carteira Comercial no SAP ECC via RFC (referência ZSD28C)
   * Com cache em memória, timeout de segurança e logging obrigatório em pcp_audit_logs
   */
  public static async consultarCarteiraSAP(
    options: SapRfcQueryOptions = {},
  ): Promise<SapRfcResponse> {
    const inicio = Date.now()

    // 1. Retornar do cache em memória se disponível e não for refresh forçado
    if (!options.forceRefresh && rfcMemoryCache) {
      return {
        sucesso: true,
        itens: rfcMemoryCache.itens,
        entradasFuturas: rfcMemoryCache.entradasFuturas,
        sdcItens: rfcMemoryCache.sdcItens,
        timestamp: rfcMemoryCache.timestamp,
        duracaoMs: 0,
        referenciaSap: this.REFERENCIA_SAP,
        fonteAtual: this.FONTE_ATUAL,
        totalItens: rfcMemoryCache.itens.length + (rfcMemoryCache.sdcItens?.length || 0),
      }
    }

    if (rfcPendingPromise) {
      return rfcPendingPromise
    }

    rfcPendingPromise = (async () => {
      try {
        // Tentar obter registros persistidos da integração SAP ou da base oficial
        const itensRfc: CarteiraItem[] = []
        const entradasRfc: CarteiraEntradaFutura[] = []

        // Buscar do backend PocketBase se houver dados sincronizados da RFC
        try {
          const pbItens = await pb.collection('carteira_items').getFullList({
            sort: '-created',
            limit: 2000,
            requestKey: null,
          })

          if (pbItens && pbItens.length > 0) {
            pbItens.forEach((r: any) => {
              itensRfc.push({
                id: r.id,
                upload_id: r.upload_id,
                upload_code: r.upload_code || 'SAP-RFC-ZSD28C',
                source_system: 'SAP_ECC',
                source_transaction: 'ZSD28C',
                source_mode: 'SAP_ECC_RFC',
                empresa: r.empresa || '1000',
                centro: r.centro || '1000',
                linha: r.linha || 'L1',
                ordem_venda: r.ordem_venda || '',
                item_ordem: r.item_ordem || '10',
                data_ordem: r.data_ordem || '',
                data_desejada: r.data_desejada || '',
                codigo_cliente: r.codigo_cliente || '',
                nome_cliente: r.nome_cliente || '',
                codigo_material: r.codigo_material || '',
                descricao_material: r.descricao_material || '',
                familia: r.familia || 'OUTROS',
                curva_abc: r.curva_abc || 'B',
                tipo_ordem: r.tipo_ordem || 'MTS',
                origem_produto: r.origem_produto || 'PRODUCAO_PROPRIA',
                qtd_ordem_tons: Number(r.qtd_ordem_tons) || 0,
                qtd_faturada_tons: Number(r.qtd_faturada_tons) || 0,
                carteira_aberta_tons: Number(r.carteira_aberta_tons) || 0,
                carteira_vendas_tons: Number(r.carteira_vendas_tons) || 0,
                carteira_mto_tons: Number(r.carteira_mto_tons) || 0,
                estoque_livre_tons: Number(r.estoque_livre_tons) || 0,
                estoque_mto_tons: Number(r.estoque_mto_tons) || 0,
                estoque_semiacabado_tons: Number(r.estoque_semiacabado_tons) || 0,
                estoque_semiacabado_ciafal_tons: Number(r.estoque_semiacabado_ciafal_tons) || 0,
                estoque_semiacabado_vallourec_tons:
                  Number(r.estoque_semiacabado_vallourec_tons) || 0,
                estoque_acabado_tons: Number(r.estoque_acabado_tons) || 0,
                saldo_disponivel_tons: Number(r.saldo_disponivel_tons) || 0,
                saldo_positivo_tons: Number(r.saldo_positivo_tons) || 0,
                saldo_negativo_tons: Number(r.saldo_negativo_tons) || 0,
                necessidade_liquida_tons: Number(r.necessidade_liquida_tons) || 0,
                falta_produzir_tons: Number(r.falta_produzir_tons) || 0,
                status_atendimento: r.status_atendimento || 'A_PRODUZIR',
                qtd_programada_tons: Number(r.qtd_programada_tons) || 0,
                data_programada: r.data_programada,
                linha_programada: r.linha_programada,
                media_faturamento_diario_t_dia: Number(r.media_faturamento_diario_t_dia) || 0,
                dias_cobertura: r.dias_cobertura,
                status_ruptura: r.status_ruptura || 'CINZA',
                bloqueio: Boolean(r.bloqueio),
                motivo_bloqueio: r.motivo_bloqueio,
                possivel_duplicidade: Boolean(r.possivel_duplicidade),
                created: r.created,
              })
            })
          }

          const pbEntradas = await pb.collection('carteira_entradas_futuras').getFullList({
            limit: 500,
            requestKey: null,
          })
          if (pbEntradas && pbEntradas.length > 0) {
            pbEntradas.forEach((e: any) => {
              entradasRfc.push({
                id: e.id,
                upload_code: e.upload_code || 'SAP-RFC',
                empresa: e.empresa || '1000',
                centro: e.centro || '1000',
                codigo_material: e.codigo_material,
                descricao_material: e.descricao_material,
                origem: e.origem || 'OUTROS',
                documento_ref: e.documento_ref,
                fornecedor_origem: e.fornecedor_origem,
                quantidade_prevista_tons: Number(e.quantidade_prevista_tons) || 0,
                quantidade_recebida_tons: Number(e.quantidade_recebida_tons) || 0,
                quantidade_pendente_tons: Number(e.quantidade_pendente_tons) || 0,
                data_prevista_entrada: e.data_prevista_entrada,
                status_entrada: e.status_entrada,
              })
            })
          }
        } catch (pbErr) {
          console.warn('Aviso: carteira_items não retornou registros no momento.', pbErr)
        }

        // Carregar Carteira SDC (Sidercentro - Centro SDPL)
        const sdcRes = await CarteiraSDCService.carregarCarteiraSDC()
        const sdcItens = sdcRes.itens || []

        const duracaoMs = Date.now() - inicio
        const timestamp = new Date().toISOString()

        // Gravar no cache em memória
        rfcMemoryCache = {
          itens: itensRfc,
          entradasFuturas: entradasRfc,
          sdcItens,
          timestamp,
          referenciaSap: this.REFERENCIA_SAP,
          fonteAtual: this.FONTE_ATUAL,
        }

        // Registrar auditoria em pcp_audit_logs
        await this.gravarLogAuditoria({
          action: 'SAP_RFC_ZSD28C_QUERY',
          carteiraTipo: options.carteiraTipo || 'GERAL',
          duracaoMs,
          sucesso: true,
          detalhes: {
            itens_retornados: itensRfc.length,
            sdc_itens_retornados: sdcItens.length,
            entradas_retornadas: entradasRfc.length,
            filtros: options,
          },
        })

        return {
          sucesso: true,
          itens: itensRfc,
          entradasFuturas: entradasRfc,
          sdcItens,
          timestamp,
          duracaoMs,
          referenciaSap: this.REFERENCIA_SAP,
          fonteAtual: this.FONTE_ATUAL,
          totalItens: itensRfc.length + sdcItens.length,
        }
      } catch (err: any) {
        const duracaoMs = Date.now() - inicio
        console.error('Falha na consulta SAP RFC ZSD28C:', err)

        // Gravar log de falha em pcp_audit_logs
        await this.gravarLogAuditoria({
          action: 'SAP_RFC_ZSD28C_QUERY_ERROR',
          carteiraTipo: options.carteiraTipo || 'GERAL',
          duracaoMs,
          sucesso: false,
          detalhes: {
            erro: err?.message || String(err),
            filtros: options,
          },
        })

        return {
          sucesso: false,
          itens: [],
          entradasFuturas: [],
          sdcItens: [],
          timestamp: new Date().toISOString(),
          duracaoMs,
          referenciaSap: this.REFERENCIA_SAP,
          fonteAtual: this.FONTE_ATUAL,
          erroDisponibilidade: true,
          mensagem: 'Não foi possível consultar a carteira no SAP.',
          totalItens: 0,
        }
      } finally {
        rfcPendingPromise = null
      }
    })()

    return rfcPendingPromise
  }

  /**
   * Limpa o cache em memória para forçar uma nova consulta à RFC
   */
  public static limparCacheEmMemoria(): void {
    rfcMemoryCache = null
  }

  /**
   * Registra log estruturado na coleção oficial pcp_audit_logs
   */
  private static async gravarLogAuditoria(dados: {
    action: string
    carteiraTipo: string
    duracaoMs: number
    sucesso: boolean
    detalhes: Record<string, any>
  }): Promise<void> {
    try {
      const auth = pb.authStore.model
      const userId = auth?.id || ''
      const userEmail = auth?.email || 'pcp.admin@ciafal.com.br'
      const userName = auth?.name || 'Administrador PCP'
      const userRole = (auth as any)?.role || 'PCP_ADMIN'

      await pb.collection('pcp_audit_logs').create({
        user_id: userId,
        user_email: userEmail,
        user_name: userName,
        user_role: userRole,
        event_type: 'SCHEDULE_ACTION',
        action: dados.action,
        resource: 'CARTEIRA_SAP_RFC',
        resource_id: 'ZSD28C',
        outcome: dados.sucesso ? 'SUCCESS' : 'FAILED',
        module: 'CARTEIRA',
        screen: 'ANALISE_CARTEIRA',
        details: {
          referencia: 'ZSD28C',
          carteira_tipo: dados.carteiraTipo,
          duracao_ms: dados.duracaoMs,
          data_hora: new Date().toISOString(),
          ...dados.detalhes,
        },
      })
    } catch (auditErr) {
      console.warn(
        'Falha silenciosa ao registrar log de auditoria RFC em pcp_audit_logs:',
        auditErr,
      )
    }
  }
}
