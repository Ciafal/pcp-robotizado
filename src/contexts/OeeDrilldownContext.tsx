import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { OeeContext, OeeCalculatedData } from '@/types/oee-drilldown'
import { OeeDrilldownEngine } from '@/services/oee-drilldown-engine'

interface OeeDrilldownContextType {
  isOpen: boolean
  context: OeeContext | null
  oeeData: OeeCalculatedData | null
  openDrilldown: (context?: Partial<OeeContext>, overrides?: Partial<OeeCalculatedData>) => void
  closeDrilldown: () => void
  updateContext: (contextUpdates: Partial<OeeContext>) => void
}

const OeeDrilldownContext = createContext<OeeDrilldownContextType | undefined>(undefined)

export const OeeDrilldownProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [context, setContext] = useState<OeeContext>({
    companyCode: 'CIAFAL',
    companyName: 'CIAFAL Siderurgia e Laminação',
    lineCode: 'L1',
    lineName: 'Linha L1 - Laminação Principal',
    equipmentCode: 'L1_LAM',
    equipmentName: 'Laminador Desbastador / Acabador L1',
    date: '2026-08-24',
    shiftCode: 'T1',
    shiftName: 'Turno 1 (06:00 - 14:00)',
    crewCode: 'Turma C',
    productionOrder: 'OP-2026-8801',
    productCode: 'PERFIL-50X50',
    productName: 'Cantoneira 50x50 mm ASTM A36',
    period: 'SHIFT',
    periodLabel: 'Turno 1 • 24/08/2026',
  })
  const [oeeData, setOeeData] = useState<OeeCalculatedData | null>(null)

  const openDrilldown = useCallback(
    (newContext?: Partial<OeeContext>, overrides?: Partial<OeeCalculatedData>) => {
      setContext((prev) => {
        const merged: OeeContext = {
          ...prev,
          ...(newContext || {}),
        }
        const calculated = OeeDrilldownEngine.calculateOee(merged, overrides)
        setOeeData(calculated)
        return merged
      })
      setIsOpen(true)
    },
    [],
  )

  const closeDrilldown = useCallback(() => {
    setIsOpen(false)
  }, [])

  const updateContext = useCallback((contextUpdates: Partial<OeeContext>) => {
    setContext((prev) => {
      const merged: OeeContext = {
        ...prev,
        ...contextUpdates,
      }
      const calculated = OeeDrilldownEngine.calculateOee(merged)
      setOeeData(calculated)
      return merged
    })
  }, [])

  return (
    <OeeDrilldownContext.Provider
      value={{
        isOpen,
        context,
        oeeData,
        openDrilldown,
        closeDrilldown,
        updateContext,
      }}
    >
      {children}
    </OeeDrilldownContext.Provider>
  )
}

export function useOeeDrilldown(): OeeDrilldownContextType {
  const ctx = useContext(OeeDrilldownContext)
  if (!ctx) {
    throw new Error('useOeeDrilldown must be used within an OeeDrilldownProvider')
  }
  return ctx
}
