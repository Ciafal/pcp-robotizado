import { pb } from '@/lib/pocketbase/client'
import type { MtoRequirementRecord, MtoRequirementAuditLog } from '@/types/mto-requirements'

/**
 * Cache em memória para contagens rápidas de requisitos por pedido+item na grid
 */
const countCache = new Map<string, number>()

/**
 * Normaliza número e item para chave padronizada
 */
export function buildMtoOrderKey(pedidoNumero: string, itemPedido: string): string {
  const p = String(pedidoNumero || '').trim()
  const i = String(itemPedido || '').trim()
  return `${p}__${i}`
}

/**
 * Busca todos os requisitos cadastrados para um Pedido + Item (relacionamento 1:N)
 * Ordenados por requisito_numero crescente.
 */
export async function getRequirementsByOrderAndItem(
  pedidoNumero: string,
  itemPedido?: string,
): Promise<MtoRequirementRecord[]> {
  const cleanPedido = String(pedidoNumero || '').trim()
  if (!cleanPedido) return []

  try {
    const cleanItem = itemPedido ? String(itemPedido).trim() : ''
    let filter = `pedido_numero = '${cleanPedido}'`
    if (cleanItem) {
      filter += ` && item_pedido = '${cleanItem}'`
    }

    const records = await pb.collection('mto_requirements').getFullList<MtoRequirementRecord>({
      filter,
      sort: 'requisito_numero',
      requestKey: null,
    })

    if (records.length > 0) {
      countCache.set(buildMtoOrderKey(cleanPedido, cleanItem), records.length)
      countCache.set(cleanPedido, records.length)
    }

    return records
  } catch (error) {
    console.error(
      `[MtoRequirementsService] Erro ao buscar requisitos para pedido ${cleanPedido}:`,
      error,
    )
    return []
  }
}

/**
 * Obtém contagem de requisitos para uma lista de pedidos/itens para enriquecer a grid da Carteira MTO
 */
export async function getRequirementsCountsMap(
  orderKeys: Array<{ pedido: string; item: string }>,
): Promise<Map<string, number>> {
  const resultMap = new Map<string, number>()
  if (!orderKeys || orderKeys.length === 0) return resultMap

  try {
    // Buscar todos os requisitos associados
    const distinctPedidos = Array.from(
      new Set(orderKeys.map((k) => String(k.pedido).trim())),
    ).filter(Boolean)
    if (distinctPedidos.length === 0) return resultMap

    // Buscar em lotes de pedidos para eficiência
    const filterClauses = distinctPedidos.map((p) => `pedido_numero = '${p}'`).join(' || ')
    const records = await pb.collection('mto_requirements').getFullList<MtoRequirementRecord>({
      filter: filterClauses,
      fields: 'id,pedido_numero,item_pedido,requisito_numero',
      requestKey: null,
    })

    for (const rec of records) {
      const specificKey = buildMtoOrderKey(rec.pedido_numero, rec.item_pedido)
      const countSpecific = (resultMap.get(specificKey) || 0) + 1
      resultMap.set(specificKey, countSpecific)
      countCache.set(specificKey, countSpecific)

      // Fallback por pedido puro
      const countPure = (resultMap.get(rec.pedido_numero) || 0) + 1
      resultMap.set(rec.pedido_numero, countPure)
      countCache.set(rec.pedido_numero, countPure)
    }
  } catch (error) {
    console.warn('[MtoRequirementsService] Falha ao carregar mapa de contagens:', error)
  }

  return resultMap
}

/**
 * Registra um log de auditoria estruturado
 */
export async function logMtoRequirementAudit(log: MtoRequirementAuditLog): Promise<void> {
  try {
    await pb.collection('mto_requirements_logs').create({
      ...log,
      data_hora: log.data_hora || new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[MtoRequirementsService] Não foi possível persistir log de auditoria:', err)
  }
}
