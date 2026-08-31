import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useControlTower, ControlTowerProvider } from '@/contexts/ControlTowerContext'
import React from 'react'

import { MemoryRouter } from 'react-router-dom'

describe('ControlTowerProvider & useControlTower Regression Test', () => {
  it('should return valid context when used inside ControlTowerProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter>
        <ControlTowerProvider>{children}</ControlTowerProvider>
      </MemoryRouter>
    )

    const { result } = renderHook(() => useControlTower(), { wrapper })

    expect(result.current).toBeDefined()
    expect(result.current.filters).toBeDefined()
    expect(typeof result.current.setPlantScope).toBe('function')
    expect(typeof result.current.setLineScope).toBe('function')
    expect(typeof result.current.setCompanyScope).toBe('function')
    expect(Array.isArray(result.current.orders)).toBe(true)
  })

  it('should throw error when used outside ControlTowerProvider', () => {
    expect(() => renderHook(() => useControlTower())).toThrow(
      'useControlTower must be used within a ControlTowerProvider',
    )
  })
})
