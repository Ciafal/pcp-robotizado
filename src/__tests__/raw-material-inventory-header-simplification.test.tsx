import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PCPSidebar } from '@/components/layout/PCPNavigation'
import RawMaterialInventoryPage from '@/pages/pcp/RawMaterialInventoryPage'

describe('Inventário de matéria-prima — Nomenclatura e Cabeçalho Simplificado', () => {
  it('exibe exatamente "Inventário de matéria-prima" no menu lateral sem caixa alta e sem sufixo', () => {
    render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento/inventario-mp']}>
        <PCPSidebar />
      </MemoryRouter>,
    )

    // O item do menu deve conter a grafia exata
    const menuItem = screen.getByRole('link', { name: /inventário de matéria-prima/i })
    expect(menuItem).toBeDefined()
    expect(menuItem.textContent).toContain('Inventário de matéria-prima')

    // Garantir que NÃO existe versão em caixa alta
    expect(screen.queryByText('INVENTÁRIO DE MATÉRIA-PRIMA')).toBeNull()
  })

  it('renderiza o cabeçalho simplificado da página com título exato e setor responsável, sem elementos removidos', () => {
    render(
      <MemoryRouter initialEntries={['/pcp/sequenciamento/inventario-mp']}>
        <RawMaterialInventoryPage />
      </MemoryRouter>,
    )

    // 1. Título exato da tela sem caixa alta e sem "— L1"
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent?.trim()).toBe('Inventário de matéria-prima')
    expect(screen.queryByText('INVENTÁRIO DE MATÉRIA-PRIMA — L1')).toBeNull()
    expect(screen.queryByText('Inventário de Matéria-Prima — L1')).toBeNull()

    // 2. Setor Responsável permanece visível
    expect(screen.getByText('Setor Responsável:')).toBeDefined()
    expect(screen.getByText('DP07 — Preparação de Tarugos')).toBeDefined()

    // 3. Remoção de Tipo / Enfornamento FRIO
    expect(screen.queryByText('Tipo:')).toBeNull()
    expect(screen.queryByText('Enfornamento FRIO')).toBeNull()

    // 4. Faixa de metadados superiores completamente removida
    expect(screen.queryByText('Data do Enfornamento')).toBeNull()
    expect(screen.queryByText('Versão PCP')).toBeNull()
    expect(screen.queryByText('Data/Hora de Geração')).toBeNull()
    expect(screen.queryByText('Última Atualização')).toBeNull()

    // 5. Botões de ação do cabeçalho presentes
    expect(screen.getByRole('button', { name: /Notificações Internas/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Integrações & Governança/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Histórico & Auditoria/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Atualizar/i })).toBeDefined()

    // 6. Seções operacionais preservadas
    expect(screen.getByText('Gestão de Inventário')).toBeDefined()
    expect(screen.getByRole('button', { name: /\+ Gerar Demanda de Inventário/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Demandas de Inventário/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Lançar Inventário/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Histórico e Rastreabilidade/i })).toBeDefined()
  })
})
