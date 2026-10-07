import { pb } from '@/lib/pocketbase/client'
import type {
  MtoRequirementRecord,
  MtoRequirementAuditLog,
  TipoRequisitoMTO,
  MtoRequirementClassification,
} from '@/types/mto-requirements'

/**
 * Informações resumidas para enriquecer a célula da Grid MTO
 */
export interface MtoGridCellRequirementInfo {
  count: number
  tipos: TipoRequisitoMTO[]
  tiposResumoTexto: string // Ex: "Tipos: Comprimento" ou "Tipos: Composição Química, Temperabilidade +1"
}

/**
 * Cache em memória para contagens rápidas de requisitos por pedido+item na grid
 */
const countCache = new Map<string, number>()
const cellInfoCache = new Map<string, MtoGridCellRequirementInfo>()

/**
 * Normaliza número e item para chave padronizada
 */
export function buildMtoOrderKey(pedidoNumero: string, itemPedido: string): string {
  const p = String(pedidoNumero || '').trim()
  const i = String(itemPedido || '').trim()
  return `${p}__${i}`
}

/**
 * Motor de classificação de tipo de requisito MTO conforme SEÇÃO 5 e 6:
 *
 * Valores permitidos:
 * - Composição Química
 * - Comprimento
 * - Dimensões e Tolerâncias
 * - Garantias Específicas
 * - Temperabilidade
 *
 * Regra de classificação pelo grupo principal preenchido:
 * 1) Se houver dados específicos de composição fora da norma -> Composição Química
 * 2) Se o destaque principal do requisito for comprimento -> Comprimento
 * 3) Se houver valores específicos de altura, largura, raio, romboidade ou tolerâncias dimensionais -> Dimensões e Tolerâncias
 * 4) Se houver ensaios mecânicos, dureza, charpy, grão, descarbonetação, microinclusões -> Garantias Específicas
 * 5) Se houver tabela de temperabilidade preenchida -> Temperabilidade
 *
 * Suporta 1 tipo principal + N tags secundárias.
 */
export function classifyMtoRequirement(
  req: Partial<MtoRequirementRecord>,
): MtoRequirementClassification {
  // Se já tiver persistido explicitamente no registro
  const tipoPersistido = req.tipo_requisito
  const tagsPersistidas = Array.isArray(req.tags_secundarias)
    ? (req.tags_secundarias as TipoRequisitoMTO[])
    : []

  const detectados: TipoRequisitoMTO[] = []

  // 1) Composição Química: elementos com min != null ou max != null
  if (req.composicao_quimica?.elementos && Array.isArray(req.composicao_quimica.elementos)) {
    const temComp = req.composicao_quimica.elementos.some(
      (el) =>
        (el.min !== null && el.min !== undefined && el.min !== ('' as any)) ||
        (el.max !== null && el.max !== undefined && el.max !== ('' as any)),
    )
    if (temComp) detectados.push('Composição Química')
  }

  // 2) Temperabilidade: pontos mm ou escala polegada 16 preenchidos
  const temp = req.garantias_especificas?.temperabilidade
  if (temp) {
    const temMm =
      Array.isArray(temp.pontos_mm) &&
      temp.pontos_mm.some((p) => p.valor !== null && p.valor !== undefined && p.valor !== '')
    const temPol =
      Array.isArray(temp.escala_polegada_16) &&
      temp.escala_polegada_16.some(
        (p) => p.valor !== null && p.valor !== undefined && p.valor !== '',
      )
    if (temMm || temPol) {
      detectados.push('Temperabilidade')
    }
  }

  // 3) Garantias Específicas: tração, dureza, charpy, caracterização metalúrgica
  const garEsp = req.garantias_especificas
  if (garEsp) {
    let temGarantias = false
    const tr = garEsp.ensaio_tracao
    if (
      tr &&
      ((tr.lr_mpa !== null && tr.lr_mpa !== undefined && tr.lr_mpa !== ('' as any)) ||
        (tr.le_mpa !== null && tr.le_mpa !== undefined && tr.le_mpa !== ('' as any)) ||
        (tr.alongamento_pct !== null &&
          tr.alongamento_pct !== undefined &&
          tr.alongamento_pct !== ('' as any)))
    ) {
      temGarantias = true
    }

    const d = garEsp.dureza
    if (
      !temGarantias &&
      d &&
      ((d.tipo_dureza && String(d.tipo_dureza).trim() !== '' && d.tipo_dureza !== '—') ||
        (d.maximo !== null && d.maximo !== undefined && d.maximo !== ('' as any)) ||
        (d.minimo !== null && d.minimo !== undefined && d.minimo !== ('' as any)))
    ) {
      temGarantias = true
    }

    const ch = garEsp.ensaio_charpy
    if (
      !temGarantias &&
      ch &&
      ((ch.valor_minimo_j !== null &&
        ch.valor_minimo_j !== undefined &&
        ch.valor_minimo_j !== ('' as any)) ||
        (ch.orientacao && String(ch.orientacao).trim() !== '' && ch.orientacao !== '—'))
    ) {
      temGarantias = true
    }

    const cm = garEsp.caracterizacao_metalurgica
    if (!temGarantias && cm) {
      if (
        (cm.tamanho_grao_austenitico &&
          String(cm.tamanho_grao_austenitico).trim() !== '' &&
          cm.tamanho_grao_austenitico !== '—') ||
        (cm.descarbonetacao &&
          String(cm.descarbonetacao).trim() !== '' &&
          cm.descarbonetacao !== '—')
      ) {
        temGarantias = true
      }
      if (!temGarantias && cm.microinclusoes_astm_e45_a) {
        const mi = cm.microinclusoes_astm_e45_a as Record<string, any>
        temGarantias = Object.keys(mi).some(
          (k) => mi[k] !== null && mi[k] !== undefined && mi[k] !== '',
        )
      }
    }

    if (temGarantias) {
      detectados.push('Garantias Específicas')
    }
  }

  // 4) Comprimento: comprimento_principal preenchido
  const comp = req.comprimento
  if (
    comp &&
    comp.comprimento_principal !== null &&
    comp.comprimento_principal !== undefined &&
    comp.comprimento_principal !== ('' as any) &&
    Number(comp.comprimento_principal) > 0
  ) {
    detectados.push('Comprimento')
  }

  // 5) Dimensões e Tolerâncias: raio_canto, romboidade, altura, largura preenchidos
  const dim = req.dimensoes_tolerancias
  if (dim) {
    const campos: Array<keyof typeof dim> = ['raio_canto', 'romboidade', 'altura', 'largura']
    const temDim = campos.some((c) => {
      const v = dim[c]
      return v !== null && v !== undefined && v !== '' && v !== '—'
    })
    if (temDim) {
      detectados.push('Dimensões e Tolerâncias')
    }
  }

  // Se tiver persistido no banco e for válido, respeitar tipoPersistido
  if (tipoPersistido) {
    const principal = tipoPersistido
    const secundarias = Array.from(
      new Set([...tagsPersistidas, ...detectados.filter((t) => t !== principal)].filter(Boolean)),
    )
    return {
      tipo_principal: principal,
      tags_secundarias: secundarias,
      todos_tipos: [principal, ...secundarias],
    }
  }

  // Caso contrário, derivar com a hierarquia da Seção 6:
  // Se o destaque for comprimento (comum em perfis/cantoneiras MTO como o Pedido 50000499)
  let tipoPrincipal: TipoRequisitoMTO = 'Comprimento'
  if (detectados.includes('Comprimento')) {
    tipoPrincipal = 'Comprimento'
  } else if (detectados.includes('Composição Química')) {
    tipoPrincipal = 'Composição Química'
  } else if (detectados.includes('Dimensões e Tolerâncias')) {
    tipoPrincipal = 'Dimensões e Tolerâncias'
  } else if (detectados.includes('Garantias Específicas')) {
    tipoPrincipal = 'Garantias Específicas'
  } else if (detectados.includes('Temperabilidade')) {
    tipoPrincipal = 'Temperabilidade'
  } else if (detectados.length > 0) {
    tipoPrincipal = detectados[0]
  }

  const tagsSecundarias = detectados.filter((t) => t !== tipoPrincipal)

  return {
    tipo_principal: tipoPrincipal,
    tags_secundarias: tagsSecundarias,
    todos_tipos: [tipoPrincipal, ...tagsSecundarias],
  }
}

/**
 * Formata lista de tipos para a Seção 7 (célula da grid):
 * Exemplos:
 * - "Tipos: Comprimento"
 * - "Tipos: Comprimento, Garantias Específicas"
 * - Se houver mais de 2: "Tipos: Composição Química, Temperabilidade +1"
 */
export function formatTiposResumo(tipos: TipoRequisitoMTO[]): string {
  if (!tipos || tipos.length === 0) return ''
  const distinct = Array.from(new Set(tipos))
  if (distinct.length <= 2) {
    return `Tipos: ${distinct.join(', ')}`
  }
  const primeiros = distinct.slice(0, 2).join(', ')
  const excedente = distinct.length - 2
  return `Tipos: ${primeiros} +${excedente}`
}

/**
 * Busca todos os requisitos cadastrados para um Pedido + Item (relacionamento 1:N)
 * Ordenados por requisito_numero crescente. Enriquecidos com tipo_requisito e tags_secundarias.
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
      // Enriquecer registros que ainda não tenham tipo persistido
      const enrichedRecords = records.map((rec) => {
        const classif = classifyMtoRequirement(rec)
        return {
          ...rec,
          tipo_requisito: rec.tipo_requisito || classif.tipo_principal,
          tags_secundarias:
            rec.tags_secundarias && rec.tags_secundarias.length > 0
              ? rec.tags_secundarias
              : classif.tags_secundarias,
        }
      })

      const specificKey = buildMtoOrderKey(cleanPedido, cleanItem)
      countCache.set(specificKey, enrichedRecords.length)
      countCache.set(cleanPedido, enrichedRecords.length)

      const tiposNoItem = Array.from(
        new Set(enrichedRecords.map((r) => r.tipo_requisito).filter(Boolean) as TipoRequisitoMTO[]),
      )
      const cellInfo: MtoGridCellRequirementInfo = {
        count: enrichedRecords.length,
        tipos: tiposNoItem,
        tiposResumoTexto: formatTiposResumo(tiposNoItem),
      }
      cellInfoCache.set(specificKey, cellInfo)
      cellInfoCache.set(cleanPedido, cellInfo)

      return enrichedRecords
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
  const fullMap = await getRequirementsGridInfoMap(orderKeys)
  const resultMap = new Map<string, number>()
  fullMap.forEach((info, key) => {
    resultMap.set(key, info.count)
  })
  return resultMap
}

/**
 * Obtém mapa enriquecido com contagem E resumo dos tipos para a Grid da Carteira MTO (Seção 7)
 */
export async function getRequirementsGridInfoMap(
  orderKeys: Array<{ pedido: string; item: string }>,
): Promise<Map<string, MtoGridCellRequirementInfo>> {
  const resultMap = new Map<string, MtoGridCellRequirementInfo>()
  if (!orderKeys || orderKeys.length === 0) return resultMap

  try {
    const distinctPedidos = Array.from(
      new Set(orderKeys.map((k) => String(k.pedido).trim())),
    ).filter(Boolean)
    if (distinctPedidos.length === 0) return resultMap

    const filterClauses = distinctPedidos.map((p) => `pedido_numero = '${p}'`).join(' || ')
    const records = await pb.collection('mto_requirements').getFullList<MtoRequirementRecord>({
      filter: filterClauses,
      fields:
        'id,pedido_numero,item_pedido,requisito_numero,tipo_requisito,tags_secundarias,comprimento,composicao_quimica,dimensoes_tolerancias,garantias_especificas',
      sort: 'requisito_numero',
      requestKey: null,
    })

    // Agrupa por chave específica (pedido__item) e chave simples (pedido)
    const grouped = new Map<string, MtoRequirementRecord[]>()
    for (const rec of records) {
      const specificKey = buildMtoOrderKey(rec.pedido_numero, rec.item_pedido)
      const list = grouped.get(specificKey) || []
      list.push(rec)
      grouped.set(specificKey, list)

      const pureList = grouped.get(rec.pedido_numero) || []
      pureList.push(rec)
      grouped.set(rec.pedido_numero, pureList)
    }

    grouped.forEach((recs, key) => {
      const tiposUnicos = Array.from(
        new Set(
          recs.map((r) => {
            if (r.tipo_requisito) return r.tipo_requisito
            return classifyMtoRequirement(r).tipo_principal
          }),
        ),
      ).filter(Boolean) as TipoRequisitoMTO[]

      const cellInfo: MtoGridCellRequirementInfo = {
        count: recs.length,
        tipos: tiposUnicos,
        tiposResumoTexto: formatTiposResumo(tiposUnicos),
      }

      resultMap.set(key, cellInfo)
      cellInfoCache.set(key, cellInfo)
      countCache.set(key, recs.length)
    })
  } catch (error) {
    console.warn('[MtoRequirementsService] Falha ao carregar mapa enriquecido da grid:', error)
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
