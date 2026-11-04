import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'

export interface TarugoHierarchyData {
  companies: { name: string; code: string }[]
  centers: { company_id: string; sap_plant_code: string; name: string; code: string }[]
  lines: { plant_id: string; code: string; name: string }[]
  loading: boolean
}

/**
 * Hierarquia real do HUB para o Plano Tarugos:
 * - Empresas: collection `companies` (Ciafal, Cisam, Sidercentro, KS...).
 * - Centros: collection `plants` (centros SAP — sap_plant_code = WERKS).
 * - Linhas: collection `production_lines` (código da linha por centro via plant_id).
 * Nenhuma lista manual é criada; o que não existir no banco não aparece.
 */
export function useHierarchyOptions(): TarugoHierarchyData {
  const [data, setData] = useState<TarugoHierarchyData>({
    companies: [],
    centers: [],
    lines: [],
    loading: true,
  })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [companies, plants, lines] = await Promise.all([
          pb.collection('companies').getFullList({ sort: 'name' }),
          pb.collection('plants').getFullList({ sort: 'code' }),
          pb.collection('production_lines').getFullList({ sort: 'code' }),
        ])
        if (!isMounted) return
        setData({
          companies: (companies as any[])
            .filter((c) => c.status === 'ACTIVE' || !c.status)
            .map((c) => ({ name: c.name || c.code, code: c.code || '' })),
          centers: (plants as any[])
            .filter((p) => p.status === 'ACTIVE' || !p.status)
            .map((p) => ({
              company_id: p.company_id || '',
              sap_plant_code: p.sap_plant_code || '',
              name: p.name || '',
              code: p.code || '',
            })),
          lines: (lines as any[])
            .filter((l) => l.is_active !== false)
            .map((l) => ({ plant_id: l.plant_id || '', code: l.code || '', name: l.name || '' })),
          loading: false,
        })
      } catch (err) {
        console.warn('[TarugoHierarchy] Falha ao carregar hierarquia:', err)
        if (isMounted) setData((d) => ({ ...d, companies: [], centers: [], lines: [], loading: false }))
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [])

  return data
}
