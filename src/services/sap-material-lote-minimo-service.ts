/**
 * Serviço de Integração, Cache e Consulta do Lote Mínimo SAP por Código de Material
 *
 * REGRA DEFINITIVA:
 * "O LOTE MÍNIMO NÃO SERÁ CADASTRADO MANUALMENTE NO HUB.
 * O valor do lote mínimo será recebido diretamente do SAP via RFC,
 * associado individualmente a cada Código de material SAP.
 * Código do material → RFC SAP → Lote mínimo.
 * O PCP Robotizado apenas deverá CONSULTAR e UTILIZAR essa informação."
 *
 * PROIBIDO:
 * - Cadastro manual no HUB
 * - Fallbacks por bitola, linha, centro, família, produtividade ou parâmetro genérico
 * - Atribuição de valor padrão ou 0 quando o código não foi retornado pela RFC
 */

import { pb } from '@/lib/pocketbase/client'

export interface SapMaterialLoteMinimoRecord {
  id: string
  codigo_material: string
  descricao_material?: string
  lote_minimo: number
  unidade_medida?: string
  last_sync?: string
  rfc_execucao?: string
  origem?: string
  valor_anterior?: number | null
  created?: string
  updated?: string
}

export interface SapMaterialLoteMinimoLogRecord {
  id: string
  codigo_material: string
  valor_anterior?: number | null
  novo_valor: number
  data_hora: string
  rfc_execucao?: string
  resultado?: string
  origem: string // "Integração SAP RFC"
  payload_snapshot?: any
  created?: string
}

/** Configuração parametrizável de mapeamento SAP RFC */
export interface SapRfcMappingConfig {
  rfc_name: string
  material_code_field: string
  min_lot_field: string
  uom_field?: string
  description_field?: string
}

export const DEFAULT_SAP_RFC_MAPPING_CONFIG: SapRfcMappingConfig = {
  rfc_name: 'Z_RFC_MATERIAL_LOTE_MINIMO',
  material_code_field: 'MATNR',
  min_lot_field: 'BSTMI',
  uom_field: 'MEINS',
  description_field: 'MAKTX',
}

class SapMaterialLoteMinimoService {
  private cacheMemoria: Map<string, SapMaterialLoteMinimoRecord> = new Map()
  private cacheTimestamp: number = 0
  private readonly CACHE_TTL_MS = 60 * 1000 // 1 minuto TTL na memória do front

  /**
   * Limpa cache em memória (usado após sincronização ou em testes)
   */
  public clearMemoryCache(): void {
    this.cacheMemoria.clear()
    this.cacheTimestamp = 0
  }

  /**
   * Carrega a réplica inteira do HUB para a memória local.
   * Se vazia, a réplica reflete que o SAP RFC ainda não enviou dados.
   */
  public async carregarReplicaHub(): Promise<Map<string, SapMaterialLoteMinimoRecord>> {
    const agora = Date.now()
    if (this.cacheMemoria.size > 0 && agora - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cacheMemoria
    }

    try {
      const records = await pb
        .collection('sap_material_lote_minimo')
        .getFullList<SapMaterialLoteMinimoRecord>({
          sort: 'codigo_material',
        })

      this.cacheMemoria.clear()
      for (const r of records) {
        if (r.codigo_material) {
          const codNorm = r.codigo_material.trim().toUpperCase()
          this.cacheMemoria.set(codNorm, r)
        }
      }
      this.cacheTimestamp = agora
      return this.cacheMemoria
    } catch (err) {
      console.warn('sap_material_lote_minimo indisponível ou vazio no HUB:', err)
      return this.cacheMemoria
    }
  }

  /**
   * Consulta lote mínimo diretamente da réplica/cache pelo código do material SAP.
   * Retorna null se não houver lote mínimo recebido para este código específico.
   * JAMAIS retorna valor default ou busca por família/linha/bitola.
   */
  public getLoteMinimoByCodigo(
    codigoMaterial: string,
    replicaMap?:
      | Map<string, SapMaterialLoteMinimoRecord>
      | Record<string, SapMaterialLoteMinimoRecord>,
  ): SapMaterialLoteMinimoRecord | null {
    if (!codigoMaterial) return null
    const codNorm = codigoMaterial.trim().toUpperCase()

    if (replicaMap) {
      if (replicaMap instanceof Map) {
        return replicaMap.get(codNorm) || null
      }
      return (replicaMap as Record<string, SapMaterialLoteMinimoRecord>)[codNorm] || null
    }

    return this.cacheMemoria.get(codNorm) || null
  }

  /**
   * Ingestão / Sincronização da RFC SAP (parametrizável).
   * Registra no HUB com origem "Integração SAP RFC", gravando valor_anterior e log de auditoria.
   */
  public async sincronizarLoteMinimoSap(
    itensSap: Array<{
      codigo_material: string
      lote_minimo: number
      unidade_medida?: string
      descricao_material?: string
    }>,
    mappingConfig: SapRfcMappingConfig = DEFAULT_SAP_RFC_MAPPING_CONFIG,
    rfcExecutionId?: string,
  ): Promise<{
    sucesso: boolean
    processados: number
    origem: string
    execucao: string
  }> {
    const rfcId = rfcExecutionId || mappingConfig.rfc_name
    const nowIso = new Date().toISOString()

    for (const item of itensSap) {
      const codNorm = (item.codigo_material || '').trim().toUpperCase()
      if (!codNorm) continue
      const novoValor = Number(item.lote_minimo)
      if (isNaN(novoValor) || novoValor <= 0) continue

      // Buscar se já existe no banco
      let existingRecord: SapMaterialLoteMinimoRecord | null = null
      try {
        existingRecord = await pb
          .collection('sap_material_lote_minimo')
          .getFirstListItem<SapMaterialLoteMinimoRecord>(`codigo_material = "${codNorm}"`)
      } catch (_) {
        existingRecord = null
      }

      const valorAnterior = existingRecord ? Number(existingRecord.lote_minimo) : null

      if (existingRecord) {
        await pb.collection('sap_material_lote_minimo').update(existingRecord.id, {
          valor_anterior: valorAnterior,
          lote_minimo: novoValor,
          descricao_material: item.descricao_material || existingRecord.descricao_material || '',
          unidade_medida: item.unidade_medida || existingRecord.unidade_medida || 't',
          last_sync: nowIso,
          rfc_execucao: rfcId,
          origem: 'SAP / RFC',
        })
      } else {
        await pb.collection('sap_material_lote_minimo').create({
          codigo_material: codNorm,
          descricao_material: item.descricao_material || '',
          lote_minimo: novoValor,
          unidade_medida: item.unidade_medida || 't',
          valor_anterior: null,
          last_sync: nowIso,
          rfc_execucao: rfcId,
          origem: 'SAP / RFC',
        })
      }

      // Log imutável de auditoria
      try {
        await pb.collection('sap_material_lote_minimo_logs').create({
          codigo_material: codNorm,
          valor_anterior: valorAnterior,
          novo_valor: novoValor,
          data_hora: nowIso,
          rfc_execucao: rfcId,
          resultado: 'SUCESSO',
          origem: 'Integração SAP RFC',
          payload_snapshot: {
            mapping: mappingConfig,
            raw_item: item,
          },
        })
      } catch (logErr) {
        console.warn('Erro ao gravar log de lote mínimo:', logErr)
      }
    }

    // Invalida cache de memória local
    this.clearMemoryCache()
    await this.carregarReplicaHub()

    return {
      sucesso: true,
      processados: itensSap.length,
      origem: 'Integração SAP RFC',
      execucao: rfcId,
    }
  }

  /**
   * Consulta histórico de logs de um material
   */
  public async getHistoricoAtualizacoesMaterial(
    codigoMaterial: string,
  ): Promise<SapMaterialLoteMinimoLogRecord[]> {
    if (!codigoMaterial) return []
    const codNorm = codigoMaterial.trim().toUpperCase()
    try {
      const records = await pb
        .collection('sap_material_lote_minimo_logs')
        .getFullList<SapMaterialLoteMinimoLogRecord>({
          filter: `codigo_material = "${codNorm}"`,
          sort: '-data_hora,-created',
        })
      return records
    } catch (_) {
      return []
    }
  }
}

export const sapMaterialLoteMinimoService = new SapMaterialLoteMinimoService()
