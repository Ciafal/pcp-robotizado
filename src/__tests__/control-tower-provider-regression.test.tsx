import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useControlTower, ControlTowerProvider } from '@/contexts/ControlTowerContext'
import React from 'react'

describe('ControlTowerProvider & useControlTower Regression Test', () => {
  it('should return valid context when used inside ControlTowerProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ControlTowerProvider>{children}</ControlTowerProvider>
    )

    const { result } = renderHook(() => useControlTower(), { wrapper })

    expect(result.current).toBeDefined()
    expect(result.current.selectedPlant).toBeDefined()
    expect(result.current.selectedLine).toBeDefined()
    expect(typeof result.current.setSelectedPlant).toBe('function')
    expect(typeof result.current.setSelectedLine).toBe('function')
    expect(typeof result.current.setSelectedShift).toBe('function')
    expect(typeof result.current.setSelectedProduct).toBe('function')
    expect(typeof result.current.setSelectedCustomer).toBe('function')
  })

  it('should not throw runtime exception if rendered outside provider (graceful fallback)', () => {
    const { result } = renderHook(() => useControlTower())

    expect(result.current).toBeDefined()
    expect(result.current.selectedPlant).toBeDefined()
    expect(result.current.selectedLine).toBeDefined()
    expect(typeof result.current.setSelectedPlant).toBe('function')
  })
})
