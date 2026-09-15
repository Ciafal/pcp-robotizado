import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Index from '@/pages/Index'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'
import pb from '@/lib/pocketbase/client'
import { authService } from '@/services/pcp-auth'

// Mock de chamadas do authService e pb
vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      authStore: {
        isValid: false,
        record: null,
        onChange: vi.fn(() => () => {}),
        clear: vi.fn(),
      },
      collection: vi.fn(() => ({
        authWithPassword: vi.fn().mockRejectedValue(new Error('Network offline')),
        getFullList: vi.fn().mockResolvedValue([]),
        getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        subscribe: vi.fn().mockResolvedValue(() => {}),
      })),
      send: vi.fn().mockRejectedValue(new Error('Network offline')),
    },
  }
})

describe('Aceite de Cold Start na Raiz (/) — Renderização imediata sem skeleton eterno', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('carregar "/" em cold start sem sessão renderiza Index no primeiro frame, sem skeleton eterno', async () => {
    // Garante que pb.authStore.isValid é falso (cold start sem sessão prévia)
    ;(pb.authStore as any).isValid = false
    ;(pb.authStore as any).record = null

    // Mock das linhas e alertas com resposta imediata
    vi.spyOn(authService, 'listProductionLines').mockResolvedValue([
      {
        id: 'line-l1',
        name: 'Laminação L1',
        code: 'L1',
        status: 'running',
        target_rate: 70,
        current_rate: 68,
        active_order: 'OP-2026-001',
        operator: 'José Carlos',
        efficiency: 95,
      },
    ])
    vi.spyOn(authService, 'listAlerts').mockResolvedValue([])

    render(
      <MemoryRouter initialEntries={['/?v=919b1f1']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Casca do Layout e Cockpit devem estar presentes no primeiro frame / tick
    expect(screen.getByText(/Cockpit Operacional PCP/i)).toBeDefined()
    expect(screen.getByText(/CIAFAL • Homologado/i)).toBeDefined()

    // O skeleton estático com w-72 h-10 NÃO deve existir bloqueando a tela
    await waitFor(() => {
      expect(screen.getByText('Laminação L1')).toBeDefined()
    })
  })

  it('carregar "/" com sessão válida também renderiza Index imediatamente com o perfil autenticado', async () => {
    ;(pb.authStore as any).isValid = true
    ;(pb.authStore as any).record = {
      id: 'user-lucas',
      email: 'lucas@ciafal.com.br',
      name: 'Lucas Ferreira',
      role: 'PCP_PROGRAMMER',
    }

    vi.spyOn(authService, 'listProductionLines').mockResolvedValue([])
    vi.spyOn(authService, 'listAlerts').mockResolvedValue([])

    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText(/Cockpit Operacional PCP/i)).toBeDefined()
  })

  it('não trava caso authService.listProductionLines demore mais que o timeout defensivo', async () => {
    ;(pb.authStore as any).isValid = false
    ;(pb.authStore as any).record = null

    // Simula promise que nunca resolve imediatamente
    vi.spyOn(authService, 'listProductionLines').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 5000)),
    )
    vi.spyOn(authService, 'listAlerts').mockResolvedValue([])

    render(
      <MemoryRouter initialEntries={['/?v=test-timeout']}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Cockpit é renderizado sem travar
    expect(screen.getByText(/Cockpit Operacional PCP/i)).toBeDefined()
  })
})
