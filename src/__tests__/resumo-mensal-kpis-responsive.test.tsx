import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CiafalKPICard } from '@/components/common/CiafalDesignSystem'

describe('CiafalKPICard & Resumo Mensal - Responsividade e Legibilidade de Indicadores', () => {
  it('renderiza o nome completo do indicador sem truncamento', () => {
    const titles = [
      'Resumos',
      'Rascunhos',
      'Em Edição',
      'Em Aprovação',
      'Publicados',
      'Leituras Pendentes',
      'Leituras Confirmadas',
      'Versão Atual',
    ]

    const { container } = render(
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {titles.map((title) => (
          <CiafalKPICard key={title} title={title} value="24,0" status="NORMAL" />
        ))}
      </div>,
    )

    // Todos os títulos completos devem estar no DOM e visíveis
    titles.forEach((title) => {
      const el = screen.getByText(title)
      expect(el).toBeInTheDocument()
      // Garante que não possui truncate / overflow-hidden que force corte por reticências
      expect(el.className).not.toContain('truncate')
      expect(el.className).toContain('whitespace-normal')
      expect(el.className).toContain('break-words')
      expect(el.className).toContain('overflow-visible')
    })

    // Garante que nenhum badge ou container sobrepõe o título
    expect(container.querySelectorAll('.truncate').length).toBe(0)
  })

  it('exibe badges de status Normal e Atenção sem afetar os valores ou comprimir os títulos', () => {
    render(
      <div>
        <CiafalKPICard title="Em Aprovação" value="2,0" status="ATENCAO" />
        <CiafalKPICard title="Leituras Pendentes" value="0,0" status="NORMAL" />
        <CiafalKPICard title="Versão Atual" value="V03" status="NORMAL" />
      </div>,
    )

    expect(screen.getByText('Em Aprovação')).toBeInTheDocument()
    expect(screen.getByText('2,0')).toBeInTheDocument()
    expect(screen.getByText('Atenção')).toBeInTheDocument()

    expect(screen.getByText('Leituras Pendentes')).toBeInTheDocument()
    expect(screen.getByText('0,0')).toBeInTheDocument()

    expect(screen.getByText('Versão Atual')).toBeInTheDocument()
    expect(screen.getByText('V03')).toBeInTheDocument()
  })
})
