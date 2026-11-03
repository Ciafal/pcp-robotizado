import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BottleneckMatrixRevisionHistoryInner } from '@/components/line-master/BottleneckMatrixRevisionHistory'
import { BottleneckMatrixRevisionEntry } from '@/services/bottleneck-matrix-revision-service'

describe('BottleneckMatrixRevisionHistory', () => {
  const mockRevisions: BottleneckMatrixRevisionEntry[] = [
    {
      id: 'rev-1',
      matrix_id: 'm-1',
      revision: 1,
      action: 'Cadastro de Nova Matriz de Referência',
      action_type: 'CRIACAO',
      user_name: 'Fabrício Menezes',
      user_role: 'Eng. de Processos',
      created: '2026-03-20T10:00:00.000Z',
      formatted_datetime: '20/03/2026 10:00',
      changes: [
        { field: 'status', fieldNamePt: 'Status', before: null, after: 'VIGENTE' },
        { field: 'version', fieldNamePt: 'Revisão', before: null, after: 1 },
      ],
      details: {},
    },
    {
      id: 'rev-2',
      matrix_id: 'm-1',
      revision: 2,
      action: 'Abertura de Nova Revisão: Rev.2',
      action_type: 'EDICAO',
      user_name: 'Carlos PCP',
      user_role: 'Programador PCP',
      created: '2026-03-22T14:30:00.000Z',
      formatted_datetime: '22/03/2026 14:30',
      notes: 'Ajuste de velocidade do trem contínuo',
      changes: [
        { field: 'version', fieldNamePt: 'Versão', before: 1, after: 2 },
        { field: 'status', fieldNamePt: 'Status', before: 'VIGENTE', after: 'EM_REVISAO' },
      ],
      details: {},
    },
  ]

  it('exibe título "Histórico de Revisões" e lista as entradas com autor, data/hora e badges', () => {
    render(
      <BottleneckMatrixRevisionHistoryInner
        revisions={mockRevisions}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        matrixName="Matriz Ref L1"
        matrixVersion={2}
      />,
    )

    expect(screen.getByText('Histórico de Revisões')).toBeInTheDocument()
    expect(screen.getByText('Rev.2')).toBeInTheDocument()
    expect(screen.getAllByText('Cadastro de Nova Matriz de Referência').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Abertura de Nova Revisão: Rev.2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Fabrício Menezes').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Carlos PCP').length).toBeGreaterThan(0)
    expect(screen.getAllByText('20/03/2026 10:00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('22/03/2026 14:30').length).toBeGreaterThan(0)
  })

  it('exibe empty state amigável quando não há revisões registradas', () => {
    render(
      <BottleneckMatrixRevisionHistoryInner
        revisions={[]}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        matrixName="Matriz Vazia"
        matrixVersion={1}
      />,
    )

    expect(screen.getByText('Nenhuma revisão registrada ainda')).toBeInTheDocument()
  })

  it('exibe mensagem de erro e botão Tentar novamente quando falha', () => {
    const retryFn = vi.fn()
    render(
      <BottleneckMatrixRevisionHistoryInner
        revisions={[]}
        loading={false}
        error="Falha de conexão com o banco"
        onRetry={retryFn}
      />,
    )

    expect(screen.getByText('Falha ao carregar o histórico')).toBeInTheDocument()
    expect(screen.getByText('Falha de conexão com o banco')).toBeInTheDocument()

    const retryBtn = screen.getByText('Tentar novamente')
    fireEvent.click(retryBtn)
    expect(retryFn).toHaveBeenCalled()
  })

  it('permite expandir e recolher detalhes antes/depois', () => {
    render(
      <BottleneckMatrixRevisionHistoryInner
        revisions={mockRevisions}
        loading={false}
        error={null}
        onRetry={vi.fn()}
      />,
    )

    const viewButtons = screen.getAllByText(/Ver \(2\)/i)
    fireEvent.click(viewButtons[0])

    expect(screen.getByText(/Alterações Registradas/i)).toBeInTheDocument()
  })
})
