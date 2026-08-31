import { useState, useEffect, useCallback } from 'react'
import { pcpDataLayer, PCPDataSnapshot, PCPEventType } from '@/services/pcp-data-layer'

export function usePCPData(
  subscribedEvents: PCPEventType[] = ['CARTEIRA_UPDATED', 'SCHEDULE_PUBLISHED'],
) {
  const [data, setData] = useState<PCPDataSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString())

  const refreshData = useCallback(async (force = true) => {
    setLoading(true)
    try {
      const snap = await pcpDataLayer.getCanonicalSnapshot(force)
      setData(snap)
      setLastUpdate(new Date().toISOString())
    } catch (err) {
      console.error('Erro ao recarregar PCPDataLayer:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshData(false)

    const unsubscribers = subscribedEvents.map((evt) =>
      pcpDataLayer.subscribe(evt, () => {
        refreshData(true)
      }),
    )

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [refreshData, JSON.stringify(subscribedEvents)])

  return {
    data,
    loading,
    lastUpdate,
    refreshData,
    orders: data?.orders || [],
    stocks: data?.stocks || new Map(),
    totalCarteiraTons: data?.totalCarteiraTons || 0,
    totalMtsTons: data?.totalMtsTons || 0,
    totalMtoTons: data?.totalMtoTons || 0,
    totalOpenOrders: data?.totalOpenOrders || 0,
    currentUpload: data?.currentCarteiraUpload || null,
  }
}
