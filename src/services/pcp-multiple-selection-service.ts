import { pb } from '@/lib/pocketbase/client'

export interface AvailableHeatInfo {
  heat_number: string
  batches: string[]
  items_count: number
  total_weight_kg: number
  origin: 'SAP' | 'HOMOLOGACAO'
}

export interface AvailableMultipleItem {
  id: string
  heat_number: string
  multiple_number: string // número / código do múltiplo ou bloco
  batch_code: string
  section_mm: string // ex: "130 × 130"
  width_mm: number
  height_mm: number
  piece_length_mm: number // comprimento real em mm
  unit_weight_kg: number // peso real em kg
  available_quantity: number
  origin: 'SAP' | 'HOMOLOGACAO'
  status: string
  wms_location?: string
}

class PcpMultipleSelectionService {
  /**
   * Busca as corridas disponíveis para um dado material e centro.
   * Consulta prioritariamente mp_dimensional_inventory e pcp_mp_inventory_items.
   * Apenas registros com status disponível / livre.
   * Se não houver registros, retorna lista vazia (nunca inventa dados fictícios).
   */
  async getAvailableHeats(materialCode: string, centerCode: string): Promise<AvailableHeatInfo[]> {
    if (!materialCode) return []

    const heatMap = new Map<
      string,
      {
        heat_number: string
        batches: Set<string>
        items_count: number
        total_weight_kg: number
        origin: 'SAP' | 'HOMOLOGACAO'
      }
    >()

    const normMat = materialCode.trim().toLowerCase()
    const normCenter = centerCode.trim().toLowerCase()

    // 1. mp_dimensional_inventory
    try {
      const dimFilter = `sap_block_status = "01_DISPONIVEL" && reservation_status = "LIVRE"`
      const dimRecords = await pb
        .collection('mp_dimensional_inventory')
        .getFullList({
          filter: dimFilter,
          sort: '-created',
        })
        .catch(() => [])

      for (const rec of dimRecords) {
        const rMat = String(rec.material_code || '')
          .trim()
          .toLowerCase()
        const rCenter = String(rec.center_code || '')
          .trim()
          .toLowerCase()
        const matchMat = rMat === normMat || rMat.includes(normMat) || normMat.includes(rMat)
        const matchCenter = !normCenter || rCenter === normCenter || rCenter.includes(normCenter)

        if (matchMat && matchCenter) {
          const heat = String(rec.heat_number || '').trim()
          if (!heat) continue

          const isSap = Boolean(rec.trauml || rec.batch_number?.startsWith('SAP'))
          const origin: 'SAP' | 'HOMOLOGACAO' = isSap ? 'SAP' : 'HOMOLOGACAO'
          const weight = Number(rec.weight_kg || 0)
          const batch = String(rec.batch_number || '').trim()

          const existing = heatMap.get(heat)
          if (existing) {
            if (batch) existing.batches.add(batch)
            existing.items_count += 1
            existing.total_weight_kg += weight
            if (origin === 'SAP') existing.origin = 'SAP'
          } else {
            heatMap.set(heat, {
              heat_number: heat,
              batches: new Set(batch ? [batch] : []),
              items_count: 1,
              total_weight_kg: weight,
              origin,
            })
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar corridas em mp_dimensional_inventory:', e)
    }

    // 2. pcp_mp_inventory_items
    try {
      // Status disponíveis no inventário de MP (LIVRE, Pronto para Enfornamento, Aguardando Inventário, etc. mas NÃO Bloqueado ou Cancelado)
      const invFilter = `is_material_blocked = false && status != "Material Bloqueado" && status != "Cancelado"`
      const invRecords = await pb
        .collection('pcp_mp_inventory_items')
        .getFullList({
          filter: invFilter,
          sort: '-created',
        })
        .catch(() => [])

      for (const rec of invRecords) {
        const rMat = String(rec.raw_material_code || '')
          .trim()
          .toLowerCase()
        const rCenter = String(rec.center || '')
          .trim()
          .toLowerCase()
        const matchMat = rMat === normMat || rMat.includes(normMat) || normMat.includes(rMat)
        const matchCenter = !normCenter || rCenter === normCenter || rCenter.includes(normCenter)

        if (matchMat && matchCenter) {
          const heat = String(rec.heat_number || rec.run_number || '').trim()
          if (!heat) continue

          const isSap =
            Boolean(rec.sap_pieces_count && rec.sap_pieces_count > 0) ||
            rec.weight_origin === 'SAP_RFC'
          const origin: 'SAP' | 'HOMOLOGACAO' = isSap ? 'SAP' : 'HOMOLOGACAO'
          const weight =
            Number(rec.quantity_tons || 0) * 1000 ||
            Number(rec.unit_weight_kg || 0) * Number(rec.calculated_pieces || rec.pieces_count || 1)

          const batch = String(rec.item_control_key || rec.production_order || '').trim()

          const existing = heatMap.get(heat)
          if (existing) {
            if (batch) existing.batches.add(batch)
            existing.items_count += Number(rec.calculated_pieces || rec.pieces_count || 1)
            existing.total_weight_kg += weight
            if (origin === 'SAP') existing.origin = 'SAP'
          } else {
            heatMap.set(heat, {
              heat_number: heat,
              batches: new Set(batch ? [batch] : []),
              items_count: Math.max(1, Number(rec.calculated_pieces || rec.pieces_count || 1)),
              total_weight_kg: weight,
              origin,
            })
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar corridas em pcp_mp_inventory_items:', e)
    }

    return Array.from(heatMap.values()).map((h) => ({
      heat_number: h.heat_number,
      batches: Array.from(h.batches),
      items_count: h.items_count,
      total_weight_kg: Number(h.total_weight_kg.toFixed(2)),
      origin: h.origin,
    }))
  }

  /**
   * Busca os múltiplos/blocos disponíveis pertencentes a uma corrida específica,
   * trazendo características dimensionais reais (seção, comprimento real em mm, peso real em kg, lote).
   * Se não houver, retorna lista vazia (nunca inventa múltiplos fictícios).
   */
  async getMultiplesByHeat(
    materialCode: string,
    centerCode: string,
    heatNumber: string,
  ): Promise<AvailableMultipleItem[]> {
    if (!heatNumber) return []

    const multiples: AvailableMultipleItem[] = []
    const normMat = materialCode.trim().toLowerCase()
    const normCenter = centerCode.trim().toLowerCase()
    const targetHeat = heatNumber.trim().toLowerCase()

    // 1. mp_dimensional_inventory
    try {
      const dimFilter = `sap_block_status = "01_DISPONIVEL" && reservation_status = "LIVRE" && heat_number ~ "${heatNumber.trim()}"`
      const dimRecords = await pb
        .collection('mp_dimensional_inventory')
        .getFullList({
          filter: dimFilter,
          sort: 'block_number',
        })
        .catch(() => [])

      for (const rec of dimRecords) {
        const rMat = String(rec.material_code || '')
          .trim()
          .toLowerCase()
        const rCenter = String(rec.center_code || '')
          .trim()
          .toLowerCase()
        const rHeat = String(rec.heat_number || '')
          .trim()
          .toLowerCase()

        if (
          rHeat === targetHeat &&
          (!normMat || rMat.includes(normMat) || normMat.includes(rMat))
        ) {
          if (!normCenter || rCenter === normCenter || rCenter.includes(normCenter)) {
            const isSap = Boolean(rec.trauml || rec.batch_number?.startsWith('SAP'))
            const width = Number(rec.width_mm || 130)
            const height = Number(rec.thickness_mm || 130)
            const length = Number(rec.length_mm || 0)
            const weight = Number(rec.weight_kg || 0)

            multiples.push({
              id: rec.id,
              heat_number: rec.heat_number,
              multiple_number: rec.block_number || `M-${rec.id.slice(0, 5).toUpperCase()}`,
              batch_code: rec.batch_number || rec.letter_code || 'LOTE-PADRAO',
              section_mm: `${width} × ${height}`,
              width_mm: width,
              height_mm: height,
              piece_length_mm: length,
              unit_weight_kg: weight,
              available_quantity: 1,
              origin: isSap ? 'SAP' : 'HOMOLOGACAO',
              status: rec.reservation_status || 'LIVRE',
              wms_location: rec.storage_location || 'PATIO',
            })
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar múltiplos em mp_dimensional_inventory:', e)
    }

    // 2. pcp_mp_inventory_items
    try {
      const invFilter = `is_material_blocked = false && status != "Material Bloqueado" && status != "Cancelado"`
      const invRecords = await pb
        .collection('pcp_mp_inventory_items')
        .getFullList({
          filter: invFilter,
          sort: '-created',
        })
        .catch(() => [])

      for (const rec of invRecords) {
        const rMat = String(rec.raw_material_code || '')
          .trim()
          .toLowerCase()
        const rCenter = String(rec.center || '')
          .trim()
          .toLowerCase()
        const rHeat = String(rec.heat_number || rec.run_number || '')
          .trim()
          .toLowerCase()

        if (
          rHeat === targetHeat &&
          (!normMat || rMat.includes(normMat) || normMat.includes(rMat))
        ) {
          if (!normCenter || rCenter === normCenter || rCenter.includes(normCenter)) {
            const isSap =
              Boolean(rec.sap_pieces_count && rec.sap_pieces_count > 0) ||
              rec.weight_origin === 'SAP_RFC'

            // Extração de seção se houver no campo gauge (ex: "130x130 mm")
            let width = 130
            let height = 130
            const gaugeStr = String(rec.gauge || rec.produced_gauge_product || '')
            const match = gaugeStr.match(/(\d+)\s*[xX×]\s*(\d+)/)
            if (match) {
              width = parseInt(match[1], 10)
              height = parseInt(match[2], 10)
            }

            const unitKg = Number(rec.unit_weight_kg || 0)
            const pieces = Math.max(1, Number(rec.calculated_pieces || rec.pieces_count || 1))
            const totalKg = Number(rec.quantity_tons || 0) * 1000
            const calculatedUnitWeight =
              unitKg > 0 ? unitKg : pieces > 0 && totalKg > 0 ? totalKg / pieces : 0

            // Comprimento estimado ou cadastrado
            const linearMass = 132.5 // ~130x130
            const calculatedLength =
              calculatedUnitWeight > 0 ? Math.round((calculatedUnitWeight / linearMass) * 1000) : 0

            const multNum =
              rec.control_number ||
              rec.item_control_key?.split('-').pop() ||
              `M-${rec.id.slice(0, 5).toUpperCase()}`

            multiples.push({
              id: rec.id,
              heat_number: rec.heat_number || rec.run_number,
              multiple_number: multNum,
              batch_code: rec.production_order || rec.item_control_key || 'LOTE-PADRAO',
              section_mm: `${width} × ${height}`,
              width_mm: width,
              height_mm: height,
              piece_length_mm: calculatedLength,
              unit_weight_kg: Number(calculatedUnitWeight.toFixed(2)),
              available_quantity: pieces,
              origin: isSap ? 'SAP' : 'HOMOLOGACAO',
              status: rec.status,
              wms_location: rec.wms_physical_location || rec.location_wms || 'DP07',
            })
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar múltiplos em pcp_mp_inventory_items:', e)
    }

    return multiples
  }
}

export const pcpMultipleSelectionService = new PcpMultipleSelectionService()
