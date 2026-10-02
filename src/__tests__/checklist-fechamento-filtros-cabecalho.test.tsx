import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import {
  ChecklistFechamentoHeader,
  ChecklistFiltrosAvancados,
  MESES_FECHAMENTO,
} from '@/components/production-control/ChecklistFechamentoHeader'
import { ChecklistFechamentoPage } from '@/pages/production-control/ChecklistFechamentoPage'
import { checklistFechamentoService } from '@/services/checklist-fechamento-service'
import { sapParametersMasterDataService } from '@/services/sap-parameters-master-data-service'
import { lineMasterService } from '@/services/line-master'
import { MemoryRouter } from 'react-router-dom'

// Mock dos serviços necessários
vi.mock('@/services/sap-parameters-master-data-service', () => ({
  sapParametersMasterDataService: {
    fetchCompanies: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
        { werks: '2000', name: 'Filial Contagem', label: '2000 — Filial Contagem' },
      ],
    }),
  },
}))

vi.mock('@/services/line-master', () => ({
  lineMasterService: {
    listLines: vi.fn().mockResolvedValue([
      {
        id: 'line-l1-id',
        code: 'L1',
        name: 'Laminação 1',
        sap_plant_code: '1000',
        sap_work_center: 'WC-L1',
      },
      {
        id: 'line-l2-id',
        code: 'L2',
        name: 'Laminação 2',
        sap_plant_code: '1000',
        sap_work_center: 'WC-L2',
      },
      {
        id: 'line-t1-id',
        code: 'T1',
        name: 'Trefilação 1',
        sap_plant_code: '2000',
        sap_work_center: 'WC-T1',
      },
    ]),
  },
}))

describe('ChecklistFechamentoHeader — Etapa 2a: 7 Filtros Avançados no Cabeçalho', () => {
  const defaultFiltros: ChecklistFiltrosAvancados = {
    empresa: 'TODAS',
    linha: 'TODAS',
    centro: 'TODOS',
    ano: 'TODOS',
    mes: 'TODOS',
    dataInicio: '',
    dataFim: '',
  }

  const mockEmpresas = [
    { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
    { werks: '2000', name: 'Filial Contagem', label: '2000 — Filial Contagem' },
  ]

  const mockLinhas = [
    { id: 'l1', code: 'L1', name: 'Laminação 1', label: 'L1 — Laminação 1' },
    { id: 'l2', code: 'L2', name: 'Laminação 2', label: 'L2 — Laminação 2' },
  ]

  const mockCentros = [
    { code: 'WC-L1', name: 'Centro L1', label: 'WC-L1 — Centro L1' },
    { code: 'FM-01', name: 'Ficha Mestra 01', label: 'FM-01 — Ficha Mestra 01' },
  ]

  it('1. Renderiza os 7 filtros estruturados no cabeçalho (Empresa, Linha, Centro, Ano, Mês, Data Início, Data Fim)', () => {
    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={defaultFiltros}
        onChangeFiltros={vi.fn()}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={mockEmpresas}
        opcoesLinhas={mockLinhas}
        opcoesCentros={mockCentros}
        opcoesAnos={['2025', '2026', '2027']}
      />,
    )

    // Filtros por label ou aria-label
    expect(screen.getByRole('combobox', { name: /Empresa/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Linha/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Centro/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Ano/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Mês/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Data Início')).toBeInTheDocument()
    expect(screen.getByLabelText('Data Fim')).toBeInTheDocument()
  })

  it('2. EMPRESA exibe formato "WERKS — Nome da Empresa"', () => {
    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={defaultFiltros}
        onChangeFiltros={vi.fn()}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={mockEmpresas}
      />,
    )

    const empresaSelect = screen.getByRole('combobox', { name: /Empresa/i })
    expect(empresaSelect).toBeInTheDocument()
    expect(screen.getByText('1000 — CIAFAL Matriz')).toBeInTheDocument()
    expect(screen.getByText('2000 — Filial Contagem')).toBeInTheDocument()
  })

  it('3. Sem Empresa selecionada: Linha fica desabilitada e exibe "Selecione primeiro a Empresa."', () => {
    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={{ ...defaultFiltros, empresa: 'TODAS' }}
        onChangeFiltros={vi.fn()}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={mockEmpresas}
        opcoesLinhas={mockLinhas}
      />,
    )

    const linhaSelect = screen.getByRole('combobox', { name: /Linha/i })
    expect(linhaSelect).toBeDisabled()
    expect(screen.getByText('Selecione primeiro a Empresa.')).toBeInTheDocument()
  })

  it('4. Com Empresa selecionada e sem Linha selecionada: Centro fica desabilitado e exibe "Selecione primeiro a Linha."', () => {
    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={{ ...defaultFiltros, empresa: '1000', linha: 'TODAS' }}
        onChangeFiltros={vi.fn()}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={mockEmpresas}
        opcoesLinhas={mockLinhas}
        opcoesCentros={mockCentros}
      />,
    )

    const linhaSelect = screen.getByRole('combobox', { name: /Linha/i })
    expect(linhaSelect).not.toBeDisabled()

    const centroSelect = screen.getByRole('combobox', { name: /Centro/i })
    expect(centroSelect).toBeDisabled()
    expect(screen.getByText('Selecione primeiro a Linha.')).toBeInTheDocument()
  })

  it('5. Cascata limpa Linha e Centro ao alterar Empresa', () => {
    const onChangeMock = vi.fn()

    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={{
          ...defaultFiltros,
          empresa: '1000',
          linha: 'L1',
          centro: 'WC-L1',
        }}
        onChangeFiltros={onChangeMock}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={mockEmpresas}
        opcoesLinhas={mockLinhas}
        opcoesCentros={mockCentros}
      />,
    )

    const empresaSelect = screen.getByRole('combobox', { name: /Empresa/i })
    fireEvent.change(empresaSelect, { target: { value: '2000' } })

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        empresa: '2000',
        linha: 'TODAS',
        centro: 'TODOS',
      }),
    )
  })

  it('6. Cascata limpa Centro ao alterar Linha', () => {
    const onChangeMock = vi.fn()

    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={{
          ...defaultFiltros,
          empresa: '1000',
          linha: 'L1',
          centro: 'WC-L1',
        }}
        onChangeFiltros={onChangeMock}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={mockEmpresas}
        opcoesLinhas={mockLinhas}
        opcoesCentros={mockCentros}
      />,
    )

    const linhaSelect = screen.getByRole('combobox', { name: /Linha/i })
    fireEvent.change(linhaSelect, { target: { value: 'L2' } })

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        empresa: '1000',
        linha: 'L2',
        centro: 'TODOS',
      }),
    )
  })

  it('7. Mês possui opções em português de Janeiro a Dezembro, armazenando 01-12', () => {
    expect(MESES_FECHAMENTO).toHaveLength(12)
    expect(MESES_FECHAMENTO[0]).toEqual({ value: '01', label: 'Janeiro' })
    expect(MESES_FECHAMENTO[11]).toEqual({ value: '12', label: 'Dezembro' })

    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={defaultFiltros}
        onChangeFiltros={vi.fn()}
        onLimparFiltros={vi.fn()}
      />,
    )

    const mesSelect = screen.getByRole('combobox', { name: /Mês/i })
    expect(screen.getByText('01 — Janeiro')).toBeInTheDocument()
    expect(screen.getByText('09 — Setembro')).toBeInTheDocument()
    expect(screen.getByText('12 — Dezembro')).toBeInTheDocument()
  })

  it('8. Botão "Limpar filtros" zera todos os filtros e aciona o callback correspondente', () => {
    const onLimparMock = vi.fn()

    render(
      <ChecklistFechamentoHeader
        execucao={null}
        competencias={['09/2026']}
        competenciaSelecionada="09/2026"
        onSelectCompetencia={vi.fn()}
        onGerarCompetencia={vi.fn()}
        prazoInfo={null}
        filtros={{
          empresa: '1000',
          linha: 'L1',
          centro: 'WC-L1',
          ano: '2026',
          mes: '09',
          dataInicio: '01/09/2026',
          dataFim: '30/09/2026',
        }}
        onChangeFiltros={vi.fn()}
        onLimparFiltros={onLimparMock}
      />,
    )

    const limparBtn = screen.getByRole('button', { name: /Limpar filtros/i })
    fireEvent.click(limparBtn)

    expect(onLimparMock).toHaveBeenCalledTimes(1)
  })
})
