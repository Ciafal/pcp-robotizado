import { useEffect, useState, useCallback } from 'react'
import {
  SapMaterialLoteMinimoRecord,
  sapMaterialLoteMinimoService,
} from '@/services/sap-material-lote-minimo-service'

/**
 * Hook para carregar e manter reativo o cache/réplica de Lote Mínimo SAP do HUB.
 * Permite que todas as carteiras (Geral, L1, L2, MTO, SDC) leiam a mesma fonte oficial.
 */
export function useSapMaterialLoteMinimo() {
  const [replicaMap, setReplicaMap] = useState<Map<string, SapMaterialLoteMinimoRecord>>(new Map())
  const [carregando, setCarregando] = useState<boolean>(true)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>('')

  const recarregar = useCallback(async () => {
    try {
      setCarregando(true)
      const mapa = await sapMaterialLoteMinimoService.carregarReplicaHub()
      setReplicaMap(new Map(mapa))
      setUltimaAtualizacao(new Date().toISOString())
    } catch (err) {
      console.warn('Erro ao carregar réplica de lote mínimo SAP:', err)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return {
    replicaMap,
    carregando,
    ultimaAtualizacao,
    recarregar,
  }
}
