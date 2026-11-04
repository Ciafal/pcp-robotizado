/**
 * SERVIÇO DE HISTÓRICO DE RETRABALHO DO MATERIAL
 * CIAFAL PCP ROBOTIZADO
 *
 * Consulta a coleção real pcp_rework_items (rastreabilidade do fluxo exclusivo
 * de Retrabalho, migration 1774000142) para o código de material especificado.
 *
 * Regras estritas:
 * - Filtro isolado por código do material (nunca vaza dados entre materiais)
 * - Ordenação cronológica decrescente (mais recente primeiro)
 * - Datas formatadas em dd/mm/aaaa hh:mm (pt-BR)
 * - Quantidades no padrão brasileiro (vírgula decimal) com a unidade correta
 * - Origem traduzida: SEMIACABADO -> "Semiacabado", ACABADO -> "Acabado"
 * - Textos legíveis em pt-BR (sem payload técnico cru)
 * - Retorna lista vazia se nada for encontrado (sem dados mockados)
 */

import { pb } from '@/lib/pocketbase/client'
import { formatDateTimePTBR, formatQuantity } from '@/lib/formatters-ptbr'

export interface ItemHistoricoRetrabalho {
  id: string
  timestamp: string // ISO string para ordenação
  dataHoraFormatada: string // dd/mm/aaaa hh:mm
  lote: string
  corrida?: string
  quantidadeRetrabalho: number
  quantidadeFormatada: string // pt-BR com unidade correta
  quantidadeDisponivel?: number
  quantidadeDisponivelFormatada?: string
  origemTipo: string // valor cru (SEMIACABADO / ACABADO)
  origemLabel: string // "Semiacabado" / "Acabado"
  motivo: string
  motivoCodigo?: string
  observacao?: string
  operacao: string
  centro: string
  deposito?: string
  localizacao?: string
  usuario?: string
  programacao?: string
  versao?: number
}

/**
 * Normaliza e sanitiza código de material para consultas PocketBase
 */
function sanitizeMaterialFilter(code: string): string {
  return String(code || '')
    .trim()
    .replace(/['"\\]/g, '')
}

/**
 * Traduz o tipo de estoque de origem para label amigável em pt-BR
 */
export function traduzirOrigemRework(tipo: string | null | undefined): string {
  const upper = String(tipo || '').toUpperCase()
  if (upper === 'SEMIACABADO' || upper === 'SEMI') return 'Semiacabado'
  if (upper === 'ACABADO') return 'Acabado'
  return 'Dado não disponível'
}

/**
 * Busca todos os registros de retrabalho do material informado em pcp_rework_items.
 * Lança erro em falha de rede/backend para que a seção exiba o estado de erro amigável.
 */
export async function buscarHistoricoReworkDoMaterial(
  materialCode: string,
): Promise<ItemHistoricoRetrabalho[]> {
  const cleanCode = sanitizeMaterialFilter(materialCode)
  if (!cleanCode) return []

  const resultado: ItemHistoricoRetrabalho[] = []

  const records = await pb.collection('pcp_rework_items').getList(1, 200, {
    filter: `material_code = '${cleanCode}'`,
    sort: '-created',
    requestKey: null,
  })

  for (const rec of records.items) {
    const ts = rec.created || rec.updated || new Date().toISOString()
    const unit = (rec.unit || 't').trim() || 't'
    const qtd =
      typeof rec.rework_quantity === 'number' ? rec.rework_quantity : Number(rec.rework_quantity)
    const qtdDisp =
      rec.available_quantity !== undefined && rec.available_quantity !== null
        ? Number(rec.available_quantity)
        : undefined

    resultado.push({
      id: rec.id,
      timestamp: ts,
      dataHoraFormatada: formatDateTimePTBR(ts),
      lote: rec.lot_number || '—',
      corrida: rec.heat_number || undefined,
      quantidadeRetrabalho: isNaN(qtd) ? 0 : qtd,
      quantidadeFormatada: formatQuantity(isNaN(qtd) ? 0 : qtd, unit),
      quantidadeDisponivel: qtdDisp,
      quantidadeDisponivelFormatada:
        qtdDisp !== undefined && !isNaN(qtdDisp) ? formatQuantity(qtdDisp, unit) : undefined,
      origemTipo: rec.stock_origin_type || '',
      origemLabel: traduzirOrigemRework(rec.stock_origin_type),
      motivo: rec.rework_reason || '—',
      motivoCodigo: rec.rework_reason_code || undefined,
      observacao: rec.rework_notes || undefined,
      operacao: rec.rework_operation || '—',
      centro: rec.rework_center_code || rec.plant_code || '—',
      deposito: rec.storage_deposit || undefined,
      localizacao: rec.storage_location || undefined,
      usuario: rec.user_name || rec.user_email || undefined,
      programacao: rec.schedule_code || undefined,
      versao: typeof rec.version_number === 'number' ? rec.version_number : undefined,
    })
  }

  // Ordenação defensiva: mais recente primeiro (independente da ordenação do backend)
  resultado.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return resultado
}
