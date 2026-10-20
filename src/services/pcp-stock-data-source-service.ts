/**
 * Camada de Dados de Estoque (Integrador SAP / Fonte de Saldos)
 *
 * Separa a obtenção dos dados físicos de estoque da regra de negócio de saldos residuais.
 *
 * Fontes de dados suportadas com precedência arquitetural:
 * 1. SAP RFC Live (quando Gateway RFC/BAPI SAP estiver parametrizado no ambiente: BAPI_MATERIAL_STOCK_REQ_LIST / MARD)
 * 2. Itens persistidos de estoque e inventário do HUB (pcp_residual_balances / inventory_items)
 * 3. Semente canônica alinhada aos Depósitos Oficiais de MP cadastrados em pcp-storage-deposits-service.ts
 *
 * Essa arquitetura permite substituir a fonte por integração SAP RFC/API no futuro
 * sem alterar ou reconstruir nenhuma tela ou componente.
 */

import { RawStockItem } from '../types/pcp-residual-balances'
import { getStorageDeposits } from './pcp-storage-deposits-service'
import { pb } from '../lib/pocketbase/client'

export interface StockDataSourceStatus {
  sourceType: 'SAP_RFC_LIVE' | 'DATABASE_SNAPSHOT' | 'PROVISIONAL_CADASTRO'
  description: string
  sapConnected: boolean
  totalItems: number
}

// Conjunto canônico alinhado aos depósitos reais cadastrados (DP01 a DP68)
const INITIAL_PROVISIONAL_STOCK: RawStockItem[] = [
  {
    deposito: 'DP07',
    deposito_nome: 'Depósito Matéria-Prima Laminação',
    material_codigo: 'MP-AC-1020-001',
    material_descricao: 'Tarugo Aço Carbono SAE 1020 130mm',
    lote: 'L-2403-010',
    quantidade_atual: 420,
    unidade_medida: 'kg',
    data_movimento: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP07',
    deposito_nome: 'Depósito Matéria-Prima Laminação',
    material_codigo: 'MP-AC-1045-004',
    material_descricao: 'Tarugo Aço Carbono SAE 1045 150mm',
    lote: 'L-2403-012',
    quantidade_atual: 350,
    unidade_medida: 'kg',
    data_movimento: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP07',
    deposito_nome: 'Depósito Matéria-Prima Laminação',
    material_codigo: 'MP-AC-1020-008',
    material_descricao: 'Tarugo Aço Carbono SAE 1020 100mm',
    lote: 'L-2403-018',
    quantidade_atual: 12500,
    unidade_medida: 'kg',
    data_movimento: new Date().toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP03',
    deposito_nome: 'Depósito Trefilação e Acabamento',
    material_codigo: 'MP-TR-5160-002',
    material_descricao: 'Fio Máquina Trefilado SAE 5160',
    lote: 'L-2403-025',
    quantidade_atual: 180,
    unidade_medida: 'kg',
    data_movimento: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP03',
    deposito_nome: 'Depósito Trefilação e Acabamento',
    material_codigo: 'MP-TR-1010-005',
    material_descricao: 'Bobina de Trefila SAE 1010 6.5mm',
    lote: 'L-2403-030',
    quantidade_atual: 8200,
    unidade_medida: 'kg',
    data_movimento: new Date().toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP12',
    deposito_nome: 'Depósito de Sucata e Retalhos',
    material_codigo: 'MP-SC-MIST-001',
    material_descricao: 'Sucata Mista de Laminação',
    lote: 'L-2403-044',
    quantidade_atual: 290,
    unidade_medida: 'kg',
    data_movimento: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP01',
    deposito_nome: 'Almoxarifado Central e Insumos',
    material_codigo: 'MP-IN-FUND-003',
    material_descricao: 'Fundente Granulado para Forno',
    lote: 'L-2403-051',
    quantidade_atual: 95,
    unidade_medida: 'kg',
    data_movimento: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
  {
    deposito: 'DP15',
    deposito_nome: 'Depósito Peças Acabadas e Expedição',
    material_codigo: 'PA-BR-1045-009',
    material_descricao: 'Barra Redonda Descascada 2 pol',
    lote: 'L-2403-066',
    quantidade_atual: 140,
    unidade_medida: 'kg',
    data_movimento: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    origem_dados: 'PROVISIONAL_CADASTRO',
  },
]

export class StockDataSourceService {
  /**
   * Consulta os saldos físicos atuais por depósito
   */
  public static async fetchCurrentStock(
    depositoFilter?: string,
  ): Promise<{ items: RawStockItem[]; status: StockDataSourceStatus }> {
    // 1. Tentar ler do Gateway SAP RFC se houver configuração
    const sapGatewayUrl =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SAP_RFC_GATEWAY_URL) || ''

    if (sapGatewayUrl) {
      try {
        const response = await fetch(`${sapGatewayUrl}/rfc/stock-balances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deposito: depositoFilter }),
        })
        if (response.ok) {
          const resData = await response.json()
          if (Array.isArray(resData.items)) {
            return {
              items: resData.items.map((it: any) => ({
                deposito: String(it.deposito || it.lgort)
                  .trim()
                  .toUpperCase(),
                deposito_nome: it.deposito_nome || it.lgobe,
                material_codigo: String(it.material_codigo || it.matnr).trim(),
                material_descricao: it.material_descricao || it.maktx || '',
                lote: String(it.lote || it.charg).trim(),
                quantidade_atual: Number(it.quantidade_atual || it.clabs) || 0,
                unidade_medida: String(it.unidade_medida || it.meins || 'kg').toLowerCase(),
                origem_dados: 'SAP_RFC',
              })),
              status: {
                sourceType: 'SAP_RFC_LIVE',
                description: 'Integrado diretamente com SAP RFC Live (T001L/MARD)',
                sapConnected: true,
                totalItems: resData.items.length,
              },
            }
          }
        }
      } catch (rfcErr) {
        console.warn('[STOCK-DATA-SOURCE] SAP RFC indisponível, usando fallback banco:', rfcErr)
      }
    }

    // 2. Se houver registros na coleção pcp_residual_balances, ler do banco
    try {
      const records = await pb.collection('pcp_residual_balances').getFullList({
        sort: '-created',
        requestKey: null,
      })

      if (records.length > 0) {
        const items: RawStockItem[] = records.map((r: any) => ({
          deposito: r.deposito,
          deposito_nome: r.deposito_nome,
          material_codigo: r.material_codigo,
          material_descricao: r.material_descricao,
          lote: r.lote,
          quantidade_atual: Number(r.quantidade_atual) || 0,
          unidade_medida: r.unidade_medida || 'kg',
          data_movimento: r.created,
          origem_dados: 'DATABASE_SNAPSHOT',
        }))

        const filtered = depositoFilter
          ? items.filter((i) => i.deposito.toUpperCase() === depositoFilter.toUpperCase())
          : items

        return {
          items: filtered,
          status: {
            sourceType: 'DATABASE_SNAPSHOT',
            description: 'Saldos carregados da base interna do HUB (PocketBase)',
            sapConnected: false,
            totalItems: filtered.length,
          },
        }
      }
    } catch (dbErr) {
      console.warn('[STOCK-DATA-SOURCE] Erro ao carregar saldos da collection:', dbErr)
    }

    // 3. Fallback canônico alinhado aos depósitos reais de pcp-storage-deposits-service.ts
    const registeredDeposits = getStorageDeposits()
    const enrichedStock = INITIAL_PROVISIONAL_STOCK.map((item) => {
      const matched = registeredDeposits.find((d) => d.code === item.deposito)
      return {
        ...item,
        deposito_nome: matched?.name || item.deposito_nome,
      }
    })

    const result = depositoFilter
      ? enrichedStock.filter((i) => i.deposito.toUpperCase() === depositoFilter.toUpperCase())
      : enrichedStock

    return {
      items: result,
      status: {
        sourceType: 'PROVISIONAL_CADASTRO',
        description: 'Dados canônicos alinhados ao cadastro de depósitos (DP01 a DP68)',
        sapConnected: false,
        totalItems: result.length,
      },
    }
  }
}
