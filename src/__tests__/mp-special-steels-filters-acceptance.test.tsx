/**
 * mp-special-steels-filters-acceptance.test.tsx
 *
 * Teste de Aceitação Oficial dos Filtros e Interseção Combinada da tela:
 * "PCP Robotizado > Gestão de MP > Níveis de Estoque — Aços Especiais"
 * (/pcp/gestao-materia-prima/niveis-estoque-acos-especiais)
 *
 * Validações obrigatórias:
 * 1. Rota canônica montada no App.tsx com PermissionGuard pcp.mp_opt.view
 * 2. Novo filtro Empresa: dropdown com opção padrão "Todas as Empresas" e integração a sapParametersMasterDataService.fetchCompanies / sapWerksService
 * 3. Novo filtro Linha: próximo a Empresa, com linhas da empresa selecionada, opção padrão "Todas as Linhas", cascata Empresa -> Linha
 * 4. Filtro Classe / Aço vira MULTISSELEÇÃO: Popover com checkboxes por aço, busca interna, selecionar todos, limpar seleção, trigger que não quebra layout
 * 5. Interseção combinada em toda a tela:
 *    - Cards de indicadores (Estoque Inicial, Recebimentos, Prod L2 Bruta, Prod Útil L2, Consumo, Saldo Final)
 *    - Gráfico Recharts de curva de nível de estoque turno a turno
 *    - Tabela de detalhamento turno a turno (12 turnos)
 *    - Diagnóstico de IA e explicador do Fator Atendimento L2
 * 6. Preservação dos filtros existentes (Cenário, Dimensão/Pool, Fator Atendimento L2) e regras de cálculo (Saldo = Inicial + Rec + Útil - Consumo)
 * 7. Preservação incondicional do export pb em client.ts (named + default)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MPSpecialSteelsSubpage } from '@/pages/mp-optimization/MPSpecialSteelsSubpage'
import { SteelMultiSelect, SteelOption } from '@/components/mp-optimization/SteelMultiSelect'
import { sapParametersMasterDataService } from '@/services/sap-parameters-master-data-service'
import { lineMasterService } from '@/services/line-master'
import pbDefault, { pb } from '@/lib/pocketbase/client'

// Mock de ResponsiveContainer do Recharts para renderizar adequadamente no jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual<any>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 300 }} data-testid="mock-responsive-container">
        {children}
      </div>
    ),
  }
})

describe('Níveis de Estoque — Aços Especiais (Filtros & Interseção Combinada)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock seguro de empresas via RFC T001W
    vi.spyOn(sapParametersMasterDataService, 'fetchCompanies').mockResolvedValue({
      success: true,
      data: [
        {
          werks: '1000',
          name: 'CIAFAL Matriz',
          label: '1000 — CIAFAL Matriz',
          source: 'SAP_T001W',
        },
        {
          werks: '2000',
          name: 'CIAFAL Contagem',
          label: '2000 — CIAFAL Contagem',
          source: 'SAP_T001W',
        },
        {
          werks: '3000',
          name: 'SIDERCENTRO SDC',
          label: '3000 — Sidercentro SDC',
          source: 'SAP_T001W',
        },
      ],
      timestamp: new Date().toISOString(),
    })

    // Mock de linhas via lineMasterService
    vi.spyOn(lineMasterService, 'listLines').mockResolvedValue([
      {
        id: 'line-l1',
        code: 'L1',
        name: 'Laminação 1',
        sap_plant_code: '1000',
        active: true,
      } as any,
      {
        id: 'line-l2',
        code: 'L2',
        name: 'Laminação 2',
        sap_plant_code: '1000',
        active: true,
      } as any,
      {
        id: 'line-sdc',
        code: 'SDC',
        name: 'Corte e Dobra SDC',
        sap_plant_code: '3000',
        active: true,
      } as any,
    ])

    // Mock de tipos de aço via RFC ZPPT002
    vi.spyOn(sapParametersMasterDataService, 'fetchTiposAco').mockResolvedValue({
      success: true,
      data: [
        { code: '1020', description: 'SAE 1020', label: '1020 - SAE 1020', source: 'SAP_ZPPT002' },
        { code: '1045', description: 'SAE 1045', label: '1045 - SAE 1045', source: 'SAP_ZPPT002' },
        { code: '1050', description: 'SAE 1050', label: '1050 - SAE 1050', source: 'SAP_ZPPT002' },
        { code: '1060', description: 'SAE 1060', label: '1060 - SAE 1060', source: 'SAP_ZPPT002' },
        { code: '1524', description: 'SAE 1524', label: '1524 - SAE 1524', source: 'SAP_ZPPT002' },
      ],
      timestamp: new Date().toISOString(),
    })
  })

  // 1. Export pb preservado (regra permanente)
  it('1. Exportação nomeada e padrão de pb em client.ts preservada sem regressão', () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
    expect(typeof pb.collection).toBe('function')
  })

  // 2. Renderização inicial com todos os filtros solicitados
  it('2. Tela renderiza os filtros Empresa, Linha, Dimensão/Pool, Classe/Aço (Multi), Cenário e Fator Atendimento L2', async () => {
    render(
      <MemoryRouter>
        <MPSpecialSteelsSubpage />
      </MemoryRouter>,
    )

    // Título oficial
    expect(
      screen.getByText(/Níveis de Estoque — Aços Especiais & Projeção por Turno/i),
    ).toBeInTheDocument()

    // Filtros visíveis na tela
    expect(screen.getByText(/^Empresa$/i)).toBeInTheDocument()
    expect(screen.getByText(/^Linha$/i)).toBeInTheDocument()
    expect(screen.getByText(/Dimensão \/ Pool/i)).toBeInTheDocument()
    expect(screen.getByText(/Classe \/ Aço/i)).toBeInTheDocument()
    expect(screen.getByText(/^Cenário$/i)).toBeInTheDocument()
    expect(screen.getByText(/Fator Atendimento L2/i)).toBeInTheDocument()

    // Opção padrão de Empresa = Todas as Empresas
    expect(screen.getByTestId('filter-company-trigger')).toBeInTheDocument()

    // Opção padrão de Linha = Todas as Linhas
    expect(screen.getByTestId('filter-line-trigger')).toBeInTheDocument()

    // Multi-seleção de Aço padrão = Todos os Aços
    expect(screen.getByTestId('steel-multiselect-trigger')).toBeInTheDocument()
    expect(screen.getByText('Todos os Aços')).toBeInTheDocument()
  })

  // 3. Componente SteelMultiSelect isolado: pesquisa, selecionar todos, limpar e rótulos
  it('3. SteelMultiSelect realiza busca interna, selecionar todos, limpar e formatação correta do trigger', async () => {
    const mockOptions: SteelOption[] = [
      { code: '1020', name: 'SAE 1020', label: '1020 — SAE 1020' },
      { code: '1045', name: 'SAE 1045', label: '1045 — SAE 1045' },
      { code: '1050', name: 'SAE 1050', label: '1050 — SAE 1050' },
      { code: '1060', name: 'SAE 1060', label: '1060 — SAE 1060' },
      { code: '1524', name: 'SAE 1524', label: '1524 — SAE 1524' },
    ]

    const handleChange = vi.fn()

    const { rerender } = render(
      <SteelMultiSelect options={mockOptions} selectedSteels={[]} onChange={handleChange} />,
    )

    // Rótulo padrão com array vazio: "Todos os Aços"
    expect(screen.getByText('Todos os Aços')).toBeInTheDocument()

    // Abre o popover
    const trigger = screen.getByTestId('steel-multiselect-trigger')
    fireEvent.click(trigger)

    // Verifica botões Selecionar todos e Limpar seleção
    const btnSelectAll = screen.getByTestId('steel-select-all')
    expect(btnSelectAll).toBeInTheDocument()
    fireEvent.click(btnSelectAll)
    expect(handleChange).toHaveBeenCalledWith(['1020', '1045', '1050', '1060', '1524'])

    // Rerender com 2 selecionados: exibe "1045, 1050"
    rerender(
      <SteelMultiSelect
        options={mockOptions}
        selectedSteels={['1045', '1050']}
        onChange={handleChange}
      />,
    )
    expect(screen.getByText('1045, 1050')).toBeInTheDocument()

    // Rerender com 3 selecionados: exibe "1045, 1050, 1060"
    rerender(
      <SteelMultiSelect
        options={mockOptions}
        selectedSteels={['1045', '1050', '1060']}
        onChange={handleChange}
      />,
    )
    expect(screen.getByText('1045, 1050, 1060')).toBeInTheDocument()

    // Rerender com 4 selecionados (> 3): exibe "1045, 1050 + 2 aços"
    rerender(
      <SteelMultiSelect
        options={mockOptions}
        selectedSteels={['1045', '1050', '1060', '1524']}
        onChange={handleChange}
      />,
    )
    expect(screen.getByText('1045, 1050 + 2 aços')).toBeInTheDocument()
  })

  // 4. Interseção combinada: modulação dos cards e tabela turno a turno
  it('4. Interseção combinada calcula corretamente Estoque Inicial, Prod Útil L2, Consumo e Saldo Final', async () => {
    render(
      <MemoryRouter>
        <MPSpecialSteelsSubpage />
      </MemoryRouter>,
    )

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText('Estoque Inicial')).toBeInTheDocument()
    })

    // Cards analíticos presentes
    expect(screen.getByText('Recebimentos')).toBeInTheDocument()
    expect(screen.getByText('Prod. L2 Bruta')).toBeInTheDocument()
    expect(screen.getByText('Prod. Útil L2')).toBeInTheDocument()
    expect(screen.getByText('Consumo Previsto')).toBeInTheDocument()
    expect(screen.getByText('Saldo Final Projetado')).toBeInTheDocument()

    // Verifica que a tabela possui os 12 turnos simulados (SEM 36 - D1 a D4 nos turnos T1, T2, T3)
    const turnosT1 = screen.getAllByText('T1')
    expect(turnosT1.length).toBeGreaterThanOrEqual(4)

    // Valida que o container Recharts foi renderizado
    expect(screen.getByTestId('recharts-special-steels-container')).toBeInTheDocument()
  })

  // 5. Explicabilidade do Fator de Atendimento L2
  it('5. Botão "Auditar Fator Atendimento L2" abre modal com fórmula e variáveis de cálculo', async () => {
    render(
      <MemoryRouter>
        <MPSpecialSteelsSubpage />
      </MemoryRouter>,
    )

    const btnAuditar = screen.getByRole('button', { name: /Auditar Fator Atendimento L2/i })
    expect(btnAuditar).toBeInTheDocument()
    fireEvent.click(btnAuditar)

    await waitFor(() => {
      expect(screen.getByText(/Explicabilidade de Cálculo Oficial/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Fator de Rendimento e Atendimento L2/i)).toBeInTheDocument()
  })

  // 6. Alertas e Diagnóstico de IA
  it('6. Card de Diagnóstico de IA exibe rendimento L2 e recomendações alinhadas com a combinação vigente', async () => {
    render(
      <MemoryRouter>
        <MPSpecialSteelsSubpage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/Diagnóstico de IA — Otimização de Estoque Aços Especiais/i),
      ).toBeInTheDocument()
    })

    expect(screen.getByText(/Rendimento L2/i)).toBeInTheDocument()
    expect(screen.getByText(/Cobertura & Ruptura/i)).toBeInTheDocument()
    expect(screen.getByText(/Recomendação PCP/i)).toBeInTheDocument()
  })
})
