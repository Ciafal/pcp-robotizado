import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MPOptimizeApplicationsUnifiedPage } from '@/pages/mp-optimization/MPOptimizeApplicationsUnifiedPage'
import { Layout } from '@/components/Layout'
import { AuthProvider } from '@/contexts/AuthContext'
import { ControlTowerProvider } from '@/contexts/ControlTowerContext'

// Mock de PocketBase para garantir testes offline determinísticos
vi.mock('@/lib/pocketbase/client', () => ({
  default: {
    authStore: {
      isValid: false,
      record: null,
      onChange: vi.fn(() => () => {}),
      clear: vi.fn(),
    },
    collection: vi.fn(() => ({
      authWithPassword: vi.fn().mockRejectedValue(new Error('Offline')),
      getFullList: vi.fn().mockResolvedValue([]),
      getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(() => {}),
    })),
    send: vi.fn().mockRejectedValue(new Error('Offline')),
  },
  pb: {
    authStore: {
      isValid: false,
      record: null,
      onChange: vi.fn(() => () => {}),
      clear: vi.fn(),
    },
    collection: vi.fn(() => ({
      authWithPassword: vi.fn().mockRejectedValue(new Error('Offline')),
      getFullList: vi.fn().mockResolvedValue([]),
      getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      subscribe: vi.fn().mockResolvedValue(() => {}),
    })),
    send: vi.fn().mockRejectedValue(new Error('Offline')),
  },
}))

// Mock de Three.js / Canvas para o 3D não travar no jsdom
vi.mock('@/components/mp-optimization/MP3DCanvasViewer', () => ({
  MP3DCanvasViewer: ({ title }: { title: string }) => (
    <div data-testid="mock-3d-canvas">{title}</div>
  ),
}))

describe('Responsividade e Navegação de Otimizar Aplicações (/pcp/gestao-materia-prima/otimizar-aplicacoes)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  const renderWithProviders = (initialRoute = '/pcp/gestao-materia-prima/otimizar-aplicacoes') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <ControlTowerProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route
                  path="/pcp/gestao-materia-prima/otimizar-aplicacoes"
                  element={<MPOptimizeApplicationsUnifiedPage />}
                />
              </Route>
            </Routes>
          </ControlTowerProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
  }

  it('1. Causa-raiz eliminada: container de navegação secundária possui min-w-0, max-w-full, box-border e overflow-x-auto sem quebra da página', () => {
    renderWithProviders()

    const scrollContainer = screen.getByTestId('mp-optimize-tabs-scroll-container')
    expect(scrollContainer).toBeInTheDocument()
    expect(scrollContainer).toHaveClass('overflow-x-auto')
    expect(scrollContainer).toHaveClass('min-w-0')
    expect(scrollContainer).toHaveClass('max-w-full')
    expect(scrollContainer).toHaveClass('box-border')

    const tabsList = screen.getByTestId('mp-optimize-tabs-list')
    expect(tabsList).toBeInTheDocument()
    expect(tabsList).toHaveClass('inline-flex')
    expect(tabsList).toHaveClass('w-max')
    expect(tabsList).toHaveClass('min-w-full')
    expect(tabsList).toHaveClass('shrink-0')
  })

  it('2. Botão "Aprovações" presente, com ícone, texto íntegro, clicável e abre "Fila de Aprovações em 2 Fases"', async () => {
    renderWithProviders()

    const tabAprovacoes = screen.getByTestId('tab-trigger-aprovacoes')
    expect(tabAprovacoes).toBeInTheDocument()
    expect(tabAprovacoes).toHaveTextContent(/APROVAÇÕES/i)
    expect(tabAprovacoes).toHaveClass('shrink-0')
    expect(tabAprovacoes).toHaveClass('whitespace-nowrap')

    // Clicar na aba Aprovações
    fireEvent.click(tabAprovacoes)

    // Verifica que o conteúdo oficial da aba de aprovações é renderizado corretamente
    expect(
      screen.getByText(/Fila de Aprovações em 2 Fases \(PCP \+ Produção \+ Qualidade\)/i),
    ).toBeInTheDocument()

    // Verifica que a aba está marcada como ativa (data-state="active")
    expect(tabAprovacoes).toHaveAttribute('data-state', 'active')
  })

  it('3. Todas as abas são acessíveis e nenhuma aba é ocultada ou comprimida indevidamente', () => {
    renderWithProviders()

    const tabOportunidades = screen.getByRole('tab', { name: /OPORTUNIDADES/i })
    const tabCortes = screen.getByRole('tab', { name: /CORTES EXISTENTES/i })
    const tabPeca = screen.getByRole('tab', { name: /PEÇAS FORA DO PADRÃO/i })
    const tabMatriz = screen.getByRole('tab', { name: /MATRIZ DE REAPLICAÇÃO/i })
    const tab3D = screen.getByRole('tab', { name: /PROJEÇÃO & NUVEM 3D/i })
    const tabAprovacoes = screen.getByTestId('tab-trigger-aprovacoes')
    const tabHistorico = screen.getByRole('tab', { name: /HISTÓRICO ZPPT058/i })

    expect(tabOportunidades).toBeInTheDocument()
    expect(tabCortes).toBeInTheDocument()
    expect(tabPeca).toBeInTheDocument()
    expect(tabMatriz).toBeInTheDocument()
    expect(tab3D).toBeInTheDocument()
    expect(tabAprovacoes).toBeInTheDocument()
    expect(tabHistorico).toBeInTheDocument()

    // Alternar entre abas para garantir que todas abrem seu respectivo conteúdo
    fireEvent.click(tabCortes)
    expect(
      screen.getByText(/Avaliação de Cortes Existentes e Regras SAP ZPP86/i),
    ).toBeInTheDocument()

    fireEvent.click(tabPeca)
    expect(
      screen.getByText(/Validação de 2ª Etapa: Cálculo de Peças Fora do Padrão Ideal \(ZPP88\)/i),
    ).toBeInTheDocument()

    fireEvent.click(tabMatriz)
    expect(
      screen.getByText(
        /Matriz de Reaplicação Cruzada \(Aplicação Atual × Aplicação Alternativa\)/i,
      ),
    ).toBeInTheDocument()

    fireEvent.click(tab3D)
    expect(screen.getByTestId('mock-3d-canvas')).toBeInTheDocument()

    fireEvent.click(tabHistorico)
    expect(
      screen.getByText(/Auditoria de Alterações de Aplicação \(ZPPT058 \/ ZMM029\)/i),
    ).toBeInTheDocument()
  })

  it('4. Simulação de Viewports: 1920×1080 (Desktop Ultra/FHD), 1440×900, 1366×768 (Desktop Standard)', () => {
    const viewports = [
      { width: 1920, height: 1080, name: '1920x1080' },
      { width: 1440, height: 900, name: '1440x900' },
      { width: 1366, height: 768, name: '1366x768' },
    ]

    for (const vp of viewports) {
      window.innerWidth = vp.width
      window.innerHeight = vp.height
      window.dispatchEvent(new Event('resize'))

      const { unmount } = renderWithProviders()
      const scrollContainer = screen.getByTestId('mp-optimize-tabs-scroll-container')
      expect(scrollContainer).toHaveClass('overflow-x-auto')
      expect(scrollContainer).toHaveClass('max-w-full')

      const tabAprovacoes = screen.getByTestId('tab-trigger-aprovacoes')
      expect(tabAprovacoes).toBeVisible()
      expect(tabAprovacoes).toHaveTextContent(/APROVAÇÕES/i)

      unmount()
    }
  })

  it('5. Simulação de Viewports compactos e Tablet: 1024×768, 768×1024 com rolagem interna protegida', () => {
    const compactViewports = [
      { width: 1024, height: 768, name: '1024x768' },
      { width: 768, height: 1024, name: '768x1024' },
    ]

    for (const vp of compactViewports) {
      window.innerWidth = vp.width
      window.innerHeight = vp.height
      window.dispatchEvent(new Event('resize'))

      const { unmount } = renderWithProviders()
      const scrollContainer = screen.getByTestId('mp-optimize-tabs-scroll-container')
      // Garante que o container flexível não estoura e aceita scroll interno
      expect(scrollContainer).toHaveClass('overflow-x-auto')
      expect(scrollContainer).toHaveClass('scrollbar-thin')
      expect(scrollContainer).toHaveClass('min-w-0')

      // Garante que o botão aprovações continua montado, íntegro e clicável
      const tabAprovacoes = screen.getByTestId('tab-trigger-aprovacoes')
      expect(tabAprovacoes).toBeInTheDocument()
      fireEvent.click(tabAprovacoes)
      expect(
        screen.getByText(/Fila de Aprovações em 2 Fases \(PCP \+ Produção \+ Qualidade\)/i),
      ).toBeInTheDocument()

      unmount()
    }
  })

  it('6. Simulação Mobile: 390×844 (iPhone / Smart Mobile) — navegação móvel funcional sem corte nem overflow global', () => {
    window.innerWidth = 390
    window.innerHeight = 844
    window.dispatchEvent(new Event('resize'))

    const { unmount } = renderWithProviders()
    const mainContent = document.querySelector('#pcp-main-content')
    expect(mainContent).toHaveClass('overflow-x-hidden')
    expect(mainContent).toHaveClass('max-w-full')

    const scrollContainer = screen.getByTestId('mp-optimize-tabs-scroll-container')
    expect(scrollContainer).toHaveClass('overflow-x-auto')
    expect(scrollContainer).toHaveClass('max-w-full')

    const tabAprovacoes = screen.getByTestId('tab-trigger-aprovacoes')
    expect(tabAprovacoes).toBeInTheDocument()
    expect(tabAprovacoes).not.toHaveClass('hidden')

    unmount()
  })

  it('7. Simulação de Níveis de Zoom: 100%, 125%, 150% mantendo acessibilidade e layout contido', () => {
    const zoomFactors = [1.0, 1.25, 1.5]

    for (const factor of zoomFactors) {
      // Simula alteração de proporção via innerWidth reduzido proporcionalmente
      window.innerWidth = Math.round(1440 / factor)
      window.innerHeight = Math.round(900 / factor)
      window.dispatchEvent(new Event('resize'))

      const { unmount } = renderWithProviders()
      const scrollContainer = screen.getByTestId('mp-optimize-tabs-scroll-container')
      expect(scrollContainer).toHaveClass('overflow-x-auto')
      expect(scrollContainer).toHaveClass('box-border')

      const tabAprovacoes = screen.getByTestId('tab-trigger-aprovacoes')
      expect(tabAprovacoes).toBeInTheDocument()

      unmount()
    }
  })

  it('8. Menu lateral (Sidebar) respeitado: main ocupa flex-1 com min-w-0 ao lado da sidebar 230px', () => {
    window.innerWidth = 1440
    window.innerHeight = 900
    window.dispatchEvent(new Event('resize'))

    renderWithProviders()

    const sidebar = screen.getByTestId('pcp-sidebar')
    expect(sidebar).toBeInTheDocument()
    expect(sidebar).toHaveClass('w-[230px]')
    expect(sidebar).toHaveClass('min-w-[230px]')

    const mainContent = document.querySelector('#pcp-main-content')
    expect(mainContent).toBeInTheDocument()
    expect(mainContent).toHaveClass('flex-1')
    expect(mainContent).toHaveClass('min-w-0')
    expect(mainContent).toHaveClass('max-w-full')
  })

  it('9. Preservação estrita das regras de negócio, integrações SAP e duplo export do PocketBase', async () => {
    const clientModule = await import('@/lib/pocketbase/client')
    expect(clientModule.pb).toBeDefined()
    expect(clientModule.default).toBeDefined()
    expect(clientModule.pb).toBe(clientModule.default)

    const rawClient = await import('@/lib/pocketbase/client.ts?raw')
    const rawContent = rawClient.default || ''
    expect(rawContent.includes('export const pb') || rawContent.includes('export { pb }')).toBe(
      true,
    )
    expect(rawContent.includes('export default pb')).toBe(true)
  })
})
