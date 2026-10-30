import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MPSidercentroSubpage } from '../pages/mp-optimization/MPSidercentroSubpage'
import { mpSdcService } from '../services/mp-sidercentro-service'
import { formatTonsSdc } from '../lib/number-format'
import { formatTons3Decimals } from '../lib/formatters-ptbr'

// Mock de serviços necessários
vi.mock('../services/mp-sidercentro-service', async () => {
  const actual = await vi.importActual<any>('../services/mp-sidercentro-service')
  return {
    ...actual,
    mpSdcService: {
      ...actual.mpSdcService,
      sendSdcEmailAlert: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-mock-1' }),
      sendSdcHubNotification: vi
        .fn()
        .mockResolvedValue({ success: true, notificationId: 'notif-mock-1' }),
    },
  }
})

describe('Previsto x Realizado L2 & Sidercentro Subpage - Suíte de Aceitação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Critério 2: formatadores centralizados geram padrão 3 casas decimais com vírgula e espaço antes de "t"', () => {
    expect(formatTonsSdc(200)).toBe('200,000 t')
    expect(formatTonsSdc(185)).toBe('185,000 t')
    expect(formatTonsSdc(-15)).toBe('-15,000 t')
    expect(formatTonsSdc(1055)).toBe('1.055,000 t')
    expect(formatTonsSdc(32.9)).toBe('32,900 t')

    // formatTons3Decimals também segue a mesma especificação
    expect(formatTons3Decimals(200)).toBe('200,000 t')
    expect(formatTons3Decimals(-15)).toBe('-15,000 t')
    expect(formatTons3Decimals(1055)).toBe('1.055,000 t')
  })

  it('Critério 5: Rota /pcp/gestao-materia-prima/sidercentro renderiza sem travar e exibe o Cockpit', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
        <Routes>
          <Route path="/pcp/gestao-materia-prima/sidercentro" element={<MPSidercentroSubpage />} />
        </Routes>
      </MemoryRouter>,
    )

    // Aguarda carregar dados iniciais e sair do Skeleton
    await waitFor(() => {
      expect(screen.getByText(/Matéria-Prima — Sidercentro/i)).toBeInTheDocument()
    })

    expect(
      screen.getByText(/Visão Integrada de Estoque Físico, Consumo Projetado & Produção Linha 2/i),
    ).toBeInTheDocument()
  })

  it('Critério 1 e 3: Na aba Previsto x Realizado L2, dados são exibidos, filtros funcionam e limpar restaura padrão', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
        <Routes>
          <Route path="/pcp/gestao-materia-prima/sidercentro" element={<MPSidercentroSubpage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Matéria-Prima — Sidercentro/i)).toBeInTheDocument()
    })

    // Clica na aba Previsto x Realizado L2
    const pxrTabTrigger = screen.getByRole('tab', { name: /Previsto.*Realizado L2/i })
    fireEvent.click(pxrTabTrigger)

    // Verifica que a aba renderizou
    await waitFor(() => {
      expect(
        screen.getByText(/Aderência da Produção L2 \(PxR\) & Impacto no Estoque SDC/i),
      ).toBeInTheDocument()
    })

    // Verifica registros iniciais (4 registros nos dados padrão)
    expect(screen.getByText('Bobina de Aço Carbono Comercial AC 1.20mm')).toBeInTheDocument()
    expect(screen.getByText('Barra Forjada SAE 1045 Tratado')).toBeInTheDocument()

    // Verifica formatação obrigatória na tabela L2: 200,000 t / 185,000 t / -15,000 t
    expect(screen.getAllByText('200,000 t').length).toBeGreaterThan(0)
    expect(screen.getAllByText('185,000 t').length).toBeGreaterThan(0)
    expect(screen.getAllByText('-15,000 t').length).toBeGreaterThan(0)

    // Testar filtro por Status/Semáforo: selecionar AMARELO
    const selectStatus = screen.getByDisplayValue(/Todos os Status/i)
    fireEvent.change(selectStatus, { target: { value: 'AMARELO' } })

    const btnAplicar = screen.getByRole('button', { name: /Aplicar filtros/i })
    fireEvent.click(btnAplicar)

    // Agora apenas o registro AMARELO deve aparecer (Bobina Estrutural Classe A)
    await waitFor(() => {
      expect(screen.getByText('Bobina Estrutural Classe A 2.00mm')).toBeInTheDocument()
      expect(
        screen.queryByText('Bobina de Aço Carbono Comercial AC 1.20mm'),
      ).not.toBeInTheDocument()
    })

    // Testar Limpar Filtros
    const btnLimpar = screen.getByRole('button', { name: /Limpar filtros/i })
    fireEvent.click(btnLimpar)

    // Todos os 4 registros devem reaparecer
    await waitFor(() => {
      expect(screen.getByText('Bobina de Aço Carbono Comercial AC 1.20mm')).toBeInTheDocument()
      expect(screen.getByText('Barra Forjada SAE 1045 Tratado')).toBeInTheDocument()
    })
  })

  it('Critério 4: Seleção por checkbox e botões de ação em massa na Matriz de Estoque', async () => {
    render(
      <MemoryRouter initialEntries={['/pcp/gestao-materia-prima/sidercentro']}>
        <Routes>
          <Route path="/pcp/gestao-materia-prima/sidercentro" element={<MPSidercentroSubpage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Matéria-Prima — Sidercentro/i)).toBeInTheDocument()
    })

    // Na aba MATRIZ (padrão), botões de enviar e notificar devem começar desabilitados
    const btnEmail = screen.getByRole('button', { name: /Enviar via e-mail \(0\)/i })
    const btnHub = screen.getByRole('button', { name: /Notificar no HUB \(0\)/i })
    expect(btnEmail).toBeDisabled()
    expect(btnHub).toBeDisabled()

    // Clica no checkbox "Selecionar todos os registros visíveis"
    const selectAllCheckbox = screen.getByLabelText(/Selecionar todos os registros visíveis/i)
    fireEvent.click(selectAllCheckbox)

    // Agora os botões de ação devem ser habilitados com a contagem correspondente
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Enviar via e-mail \([1-9]\d*\)/i }),
      ).not.toBeDisabled()
      expect(
        screen.getByRole('button', { name: /Notificar no HUB \([1-9]\d*\)/i }),
      ).not.toBeDisabled()
    })
  })
})
