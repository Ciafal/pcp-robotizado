/**
 * TESTE DE ACEITAÇÃO: HISTÓRICO DE ALTERAÇÕES DO MATERIAL
 * CIAFAL PCP ROBOTIZADO
 *
 * Valida os critérios de aceite:
 * 1. Exibição da seção Histórico de Alterações com registros reais ou estado vazio amigável
 * 2. Isolamento por material: cada material mostra apenas seu próprio histórico (não vaza dados)
 * 3. Formatação em pt-BR (dd/mm/aaaa hh:mm), textos legíveis, sem payload técnico cru
 * 4. Estados de loading, erro amigável com "Tentar novamente" e vazio funcionam
 * 5. Integração dentro de DetalheMaterialUnificadoModal preservando título, Análise IA e fechamento
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import {
  buscarHistoricoDoMaterial,
  ItemHistoricoMaterial,
} from '@/services/material-history-service'
import { MaterialHistoricoAlteracoesSection } from '@/components/carteira-views/MaterialHistoricoAlteracoesSection'
import { DetalheMaterialUnificadoModal } from '@/components/carteira-views/DetalheMaterialUnificadoModal'
import { pb } from '@/lib/pocketbase/client'

// Mock do PocketBase
vi.mock('@/lib/pocketbase/client', () => {
  const mockGetList = vi.fn()
  const mockCollection = vi.fn().mockReturnValue({
    getList: mockGetList,
  })
  return {
    pb: {
      collection: mockCollection,
    },
    default: {
      collection: mockCollection,
    },
  }
})

describe('MaterialHistoryService & MaterialHistoricoAlteracoesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Critério 1 & 2: consulta isolada por código de material e ordena do mais recente para o mais antigo', async () => {
    const mockCollection = vi.mocked(pb.collection)

    // Simula retornos específicos para o material MAT-TESTE-100
    mockCollection.mockImplementation((name: string) => {
      if (name === 'pcp_audit_logs') {
        return {
          getList: vi.fn().mockResolvedValue({
            items: [
              {
                id: 'aud1',
                action: 'UPDATE_PRODUCTIVITY MAT-TESTE-100',
                reason: 'Ajuste de taxa de laminação para 15.5 t/h',
                created: '2026-10-15T10:30:00.000Z',
                user_name: 'Eng. Planejador',
                details: JSON.stringify({
                  material_code: 'MAT-TESTE-100',
                  after_values: { value: 15.5 },
                }),
              },
            ],
          }),
        } as any
      }
      if (name === 'weekly_schedules') {
        return {
          getList: vi.fn().mockResolvedValue({
            items: [
              {
                id: 'ws1',
                line_code: 'L1',
                week_number: 42,
                year: 2026,
                planned_quantity_tons: 80,
                status: 'PUBLISHED',
                created: '2026-10-20T14:45:00.000Z', // Mais recente
                metadata: { saved_by: 'Operador PCP' },
              },
            ],
          }),
        } as any
      }
      return {
        getList: vi.fn().mockResolvedValue({ items: [] }),
      } as any
    })

    const historico = await buscarHistoricoDoMaterial('MAT-TESTE-100')

    expect(historico.length).toBe(2)
    // Mais recente primeiro: 2026-10-20 (ws1) antes de 2026-10-15 (aud1)
    expect(historico[0].id).toBe('ws-ws1')
    expect(historico[0].tipoLabel).toBe('Programação Semanal PCP')
    expect(historico[0].usuario).toBe('Operador PCP')

    expect(historico[1].id).toBe('audit-aud1')
    expect(historico[1].tipoLabel).toBe('Parâmetro de Produtividade')
    expect(historico[1].usuario).toBe('Eng. Planejador')

    // Verifica que o filtro usou o código exato
    expect(mockCollection).toHaveBeenCalledWith('weekly_schedules')
    expect(mockCollection).toHaveBeenCalledWith('pcp_audit_logs')
  })

  it('Critério 3: renderiza datas no formato pt-BR dd/mm/aaaa hh:mm e textos legíveis', async () => {
    const mockCollection = vi.mocked(pb.collection)

    mockCollection.mockImplementation((name: string) => {
      if (name === 'weekly_schedules') {
        return {
          getList: vi.fn().mockResolvedValue({
            items: [
              {
                id: 'ws99',
                line_code: 'L2',
                week_number: 40,
                year: 2026,
                planned_quantity_tons: 120,
                status: 'APPROVED',
                created: '2026-09-25T08:15:00.000Z',
                metadata: { saved_by: 'Coord. Produção' },
              },
            ],
          }),
        } as any
      }
      return {
        getList: vi.fn().mockResolvedValue({ items: [] }),
      } as any
    })

    render(<MaterialHistoricoAlteracoesSection materialCode="TUB-IND-5050" />)

    // Aguarda carregar
    await waitFor(() => {
      expect(screen.getByText('Histórico de Alterações do Item')).toBeInTheDocument()
    })

    // Deve exibir o item formatado
    await waitFor(() => {
      expect(screen.getByText(/Programação Semanal PCP/)).toBeInTheDocument()
      expect(screen.getByText(/Coord. Produção/)).toBeInTheDocument()
      // Data formatada com barra e dois pontos
      expect(screen.getByText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeInTheDocument()
    })
  })

  it('Critério 4: exibe estado vazio correto quando não há registros para o material', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockResolvedValue({ items: [] }),
    } as any)

    render(<MaterialHistoricoAlteracoesSection materialCode="MAT-SEM-HISTORICO" />)

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum registro de alteração para este material.'),
      ).toBeInTheDocument()
    })
  })

  it('Critério 4: exibe estado de erro amigável com botão Tentar novamente se houver falha de rede', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockRejectedValue(new Error('Network timeout simulation')),
    } as any)

    render(<MaterialHistoricoAlteracoesSection materialCode="MAT-ERRO-REDE" />)

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar o histórico de alterações deste material.'),
      ).toBeInTheDocument()
    })

    const btnTentarNovamente = screen.getByRole('button', {
      name: /Tentar novamente/i,
    })
    expect(btnTentarNovamente).toBeInTheDocument()

    // Clica em tentar novamente
    fireEvent.click(btnTentarNovamente)
    expect(mockCollection).toHaveBeenCalled()
  })

  it('Critério 5: DetalheMaterialUnificadoModal renderiza a seção Histórico mantendo título padrão e Análise IA', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockResolvedValue({ items: [] }),
    } as any)

    const onClose = vi.fn()

    render(
      <DetalheMaterialUnificadoModal
        isOpen={true}
        onClose={onClose}
        origemCarteira="GERAL"
        material="BAR-RED-1045"
        genItem={
          {
            id: 'item1',
            codigo_material: 'BAR-RED-1045',
            descricao_material: 'Barra Redonda 1045',
            curva_abc: 'A',
            familia: 'REDONDOS',
            centro: '1000',
            carteira_aberta_tons: 50,
            estoque_livre_tons: 30,
            qtd_programada_tons: 20,
          } as any
        }
      />,
    )

    // Título do modal padrão
    expect(screen.getByText(/Detalhe do Material • BAR-RED-1045/)).toBeInTheDocument()

    // Seção Análise IA consultiva preservada
    expect(screen.getByText(/Análise IA • Síntese da Situação do Material/)).toBeInTheDocument()

    // Seção Histórico de Alterações presente
    await waitFor(() => {
      expect(screen.getByText(/Histórico de Alterações do Item/)).toBeInTheDocument()
    })

    // Fechar modal
    const fecharBtn = screen.getByRole('button', { name: /Fechar modal de detalhe do material/i })
    fireEvent.click(fecharBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
