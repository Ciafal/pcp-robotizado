import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import LineCapacitiesSubpage from '@/pages/LineCapacitiesSubpage'
import { lineMasterService } from '@/services/line-master'
import { pb } from '@/lib/pocketbase/client'

// Mock toast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

describe('LineCapacitiesSubpage - Fluxo de exclusão, desativação e reativação de centros', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToast.mockClear()

    // Mock das chamadas do PocketBase para carregar a página
    vi.spyOn(pb, 'collection').mockImplementation((collName: string) => {
      if (collName === 'production_lines') {
        return {
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'line_l1',
              code: 'L1',
              name: 'Linha de Laminação 1',
              line_type: 'LINE',
              is_active: true,
              company_id: 'cia_1',
            },
            {
              id: 'center_c1',
              code: 'CT01',
              name: 'Centro de Corte 1',
              line_type: 'WORK_CENTER',
              is_active: true,
              company_id: 'cia_1',
              process: 'CORTE',
            },
            {
              id: 'center_c2',
              code: 'CT02',
              name: 'Centro de Solda 2',
              line_type: 'WORK_CENTER',
              is_active: false,
              company_id: 'cia_1',
              process: 'SOLDA',
            },
          ]),
        } as any
      }

      if (collName === 'line_sequencing_dependencies') {
        return {
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'dep_1',
              line_id: 'line_l1',
              next_line_id: 'center_c1',
              sequence_order: 10,
              active: true,
              status: 'ATIVO',
            },
            {
              id: 'dep_2',
              line_id: 'line_l1',
              next_line_id: 'center_c2',
              sequence_order: 20,
              active: false,
              status: 'INATIVO',
            },
          ]),
        } as any
      }

      if (collName === 'companies') {
        return {
          getFullList: vi
            .fn()
            .mockResolvedValue([{ id: 'cia_1', name: 'CIAFAL Matriz', code: 'CIAFAL' }]),
        } as any
      }

      return {
        getFullList: vi.fn().mockResolvedValue([]),
      } as any
    })
  })

  it('Cenário A: centro SEM histórico exibe diálogo de remoção destrutivo e remove com sucesso', async () => {
    vi.spyOn(lineMasterService, 'checkCenterUsageOnServer').mockResolvedValue({
      hasHistory: false,
      historyCount: 0,
      centerId: 'center_c1',
      centerCode: 'CT01',
      details: [],
      canRemove: true,
      message: 'Nenhum histórico encontrado',
    })

    const removeSpy = vi.spyOn(lineMasterService, 'removeCenterViaHook').mockResolvedValue({
      success: true,
      message: 'Vínculo removido com sucesso',
      operation: 'REMOCAO_CENTRO_HIERARQUIA',
    })

    render(<LineCapacitiesSubpage />)

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText('CT01')).toBeDefined()
    })

    // Localizar botão da lixeira (title="Remover ou Desativar Centro da Hierarquia")
    const trashButtons = screen.getAllByTitle('Remover ou Desativar Centro da Hierarquia')
    expect(trashButtons.length).toBeGreaterThan(0)
    fireEvent.click(trashButtons[0])

    // Verifica que checou o uso no servidor
    await waitFor(() => {
      expect(lineMasterService.checkCenterUsageOnServer).toHaveBeenCalledWith(
        expect.objectContaining({
          centerCode: 'CT01',
          centerId: 'center_c1',
        }),
      )
    })

    // Deve exibir o Dialog de remoção destrutivo
    await waitFor(() => {
      expect(screen.getByText('Remover centro da hierarquia?')).toBeDefined()
      expect(screen.getByText('Remover da Hierarquia')).toBeDefined()
    })

    // Confirma remoção
    fireEvent.click(screen.getByText('Remover da Hierarquia'))

    await waitFor(() => {
      expect(removeSpy).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('removido da hierarquia com sucesso'),
        }),
      )
    })
  })

  it('Cenário B: centro COM histórico exibe diálogo informativo e botão Desativar (âmbar)', async () => {
    vi.spyOn(lineMasterService, 'checkCenterUsageOnServer').mockResolvedValue({
      hasHistory: true,
      historyCount: 15,
      centerId: 'center_c1',
      centerCode: 'CT01',
      details: [{ entity: 'weekly_schedules', label: 'Programação Semanal', count: 15 }],
      canRemove: false,
      message: 'Centro possui 15 programações',
    })

    const deactivateSpy = vi
      .spyOn(lineMasterService, 'deactivateCenterInHierarchy')
      .mockResolvedValue({
        success: true,
        message: 'Centro desativado com sucesso',
        operation: 'DESATIVACAO_CENTRO_HIERARQUIA',
        historyCount: 15,
      })

    render(<LineCapacitiesSubpage />)

    await waitFor(() => {
      expect(screen.getByText('CT01')).toBeDefined()
    })

    const trashButtons = screen.getAllByTitle('Remover ou Desativar Centro da Hierarquia')
    fireEvent.click(trashButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Este Centro possui histórico de programação')).toBeDefined()
      expect(screen.getByText('Desativar')).toBeDefined()
      // Não deve ter botão Remover da Hierarquia
      expect(screen.queryByText('Remover da Hierarquia')).toBeNull()
    })

    // Confirma desativação
    fireEvent.click(screen.getByText('Desativar'))

    await waitFor(() => {
      expect(deactivateSpy).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining(
            'desativado com sucesso. O histórico de programações foi preservado',
          ),
        }),
      )
    })
  })

  it('Cenário Concorrência: erro 400 CENTER_HAS_HISTORY na remoção transiciona para o diálogo de desativação', async () => {
    vi.spyOn(lineMasterService, 'checkCenterUsageOnServer').mockResolvedValue({
      hasHistory: false,
      historyCount: 0,
      centerId: 'center_c1',
      centerCode: 'CT01',
      details: [],
      canRemove: true,
      message: 'Nenhum histórico encontrado',
    })

    vi.spyOn(lineMasterService, 'removeCenterViaHook').mockRejectedValue({
      status: 400,
      response: { code: 'CENTER_HAS_HISTORY', message: 'Centro possui histórico no servidor' },
    })

    render(<LineCapacitiesSubpage />)

    await waitFor(() => {
      expect(screen.getByText('CT01')).toBeDefined()
    })

    const trashButtons = screen.getAllByTitle('Remover ou Desativar Centro da Hierarquia')
    fireEvent.click(trashButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Remover da Hierarquia')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Remover da Hierarquia'))

    // Deve transicionar para Desativar e exibir mensagem explicativa sem fechar o diálogo
    await waitFor(() => {
      expect(
        screen.getByText(
          'Não foi possível remover este Centro porque ele já possui utilização no PCP. Atualize a tela e utilize a opção Desativar.',
        ),
      ).toBeDefined()
      expect(screen.getByText('Desativar')).toBeDefined()
    })
  })

  it('Cenário Reativação: centro inativo possui botão Reativar e badge Inativo', async () => {
    const reactivateSpy = vi
      .spyOn(lineMasterService, 'reactivateCenterInHierarchy')
      .mockResolvedValue({
        success: true,
        message: 'Centro reativado com sucesso',
        operation: 'REATIVACAO_CENTRO_HIERARQUIA',
      })

    render(<LineCapacitiesSubpage />)

    await waitFor(() => {
      expect(screen.getByText('CT02')).toBeDefined()
      expect(screen.getByText('Inativo')).toBeDefined()
    })

    const reactivateBtn = screen.getByTitle('Reativar Centro na Hierarquia')
    expect(reactivateBtn).toBeDefined()

    fireEvent.click(reactivateBtn)

    await waitFor(() => {
      expect(reactivateSpy).toHaveBeenCalled()
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('reativado com sucesso'),
        }),
      )
    })
  })
})
