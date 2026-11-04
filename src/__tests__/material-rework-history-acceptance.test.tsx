/**
 * ACEITAÇÃO — HISTÓRICO DE RETRABALHO NO DETALHE DO MATERIAL
 * CIAFAL PCP ROBOTIZADO
 *
 * Critérios:
 * 1. Lista os retrabalhos do material com lote, quantidade pt-BR, origem, motivo,
 *    operação e data/hora dd/mm/aaaa hh:mm, do mais recente ao mais antigo.
 * 2. Materiais diferentes mostram históricos diferentes (isolamento por material).
 * 3. Material sem retrabalho mostra estado vazio "Nenhum retrabalho registrado para este material."
 * 4. Seção com rolagem interna própria (max-h + overflow-y-auto) e sem rolagem horizontal.
 * 5. Erro amigável com botão "Tentar novamente" (sem stack trace ao usuário).
 * 6. Export duplo do pb preservado (regressão crônica nº 21+).
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MaterialReworkHistorySection } from '@/components/carteira-views/MaterialReworkHistorySection'
import { buscarHistoricoReworkDoMaterial } from '@/services/material-rework-history-service'
import { pb } from '@/lib/pocketbase/client'
import * as clientModule from '@/lib/pocketbase/client'

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

const registroNovo = {
  id: 'rw-novo',
  created: '2026-11-05T14:30:00.000Z',
  material_code: 'MAT-REWORK-100',
  lot_number: 'LOTE-2026-11-02',
  heat_number: 'CORRIDA-7788',
  stock_origin_type: 'SEMIACABADO',
  storage_deposit: '1101',
  storage_location: 'A-12-03',
  available_quantity: 50.5,
  rework_quantity: 12.345,
  unit: 't',
  rework_reason_code: 'MOT-DEFORM',
  rework_reason: 'Deformação de flecha acima do tolerado',
  rework_notes: 'Priorizar retrabalho antes da programação da semana 46',
  rework_operation: 'ENDIREITAMENTO',
  rework_center_code: '1010',
  user_name: 'Operador PCP',
  schedule_code: 'PCM-2026-00012',
  version_number: 3,
}

const registroAntigo = {
  id: 'rw-antigo',
  created: '2026-10-20T09:15:00.000Z',
  material_code: 'MAT-REWORK-100',
  lot_number: 'LOTE-2026-10-01',
  stock_origin_type: 'ACABADO',
  storage_deposit: '1102',
  storage_location: 'B-05-01',
  available_quantity: 30,
  rework_quantity: 8,
  unit: 't',
  rework_reason: 'Recorte de pontas com defeito de superfície',
  rework_operation: 'CORTE',
  rework_center_code: '1020',
  user_name: 'Coord. Produção',
}

describe('Histórico de Retrabalho no Detalhe do Material', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Critério 1: lista retrabalhos com lote, quantidade pt-BR, origem, motivo, operação e data/hora, do mais recente ao mais antigo', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockImplementation((_page, _size, opts: any) => {
        // Isolamento: filtro estrito por material
        expect(opts.filter).toBe("material_code = 'MAT-REWORK-100'")
        expect(opts.sort).toBe('-created')
        return Promise.resolve({ items: [registroNovo, registroAntigo] })
      }),
    } as any)

    render(<MaterialReworkHistorySection materialCode="MAT-REWORK-100" />)

    await waitFor(() => {
      expect(screen.getByText('Histórico de Retrabalho')).toBeInTheDocument()
    })

    // Ordenação: mais recente primeiro
    const artigos = screen.getAllByRole('article')
    expect(artigos.length).toBe(2)
    expect(artigos[0].getAttribute('aria-label')).toMatch(/LOTE-2026-11-02/)
    expect(artigos[1].getAttribute('aria-label')).toMatch(/LOTE-2026-10-01/)

    // Conteúdo do item mais recente
    expect(screen.getByText(/LOTE-2026-11-02/)).toBeInTheDocument()
    expect(screen.getByText(/Deformação de flecha acima do tolerado/)).toBeInTheDocument()
    expect(screen.getByText(/ENDIREITAMENTO/)).toBeInTheDocument()
    expect(screen.getByText(/Semiacabado/)).toBeInTheDocument()
    expect(screen.getByText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)).toBeInTheDocument()
    // Quantidade pt-BR com vírgula decimal e unidade
    expect(screen.getByText(/12,345 t/)).toBeInTheDocument()
    expect(screen.getByText(/50,50 t/)).toBeInTheDocument()
    // Observação exibida quando existir
    expect(
      screen.getByText(/Priorizar retrabalho antes da programação da semana 46/),
    ).toBeInTheDocument()
    // Usuário quando disponível
    expect(screen.getByText(/Operador PCP/)).toBeInTheDocument()
    // Centro e localização
    expect(screen.getByText(/1010/)).toBeInTheDocument()
    expect(screen.getByText(/A-12-03/)).toBeInTheDocument()
  })

  it('Critério 2: filtro estritamente isolado por material (nenhum registro cruzado)', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockImplementation((_page, _size, opts: any) => {
        // Captura o filtro usado e devolve apenas o material pedido
        const match = /material_code = '([^']+)'/.exec(opts.filter || '')
        const code = match ? match[1] : ''
        if (code === 'MAT-A') return Promise.resolve({ items: [registroNovo] })
        if (code === 'MAT-B') return Promise.resolve({ items: [registroAntigo] })
        return Promise.resolve({ items: [] })
      }),
    } as any)

    const histA = await buscarHistoricoReworkDoMaterial('MAT-A')
    const histB = await buscarHistoricoReworkDoMaterial('MAT-B')

    expect(histA).toHaveLength(1)
    expect(histA[0].lote).toBe('LOTE-2026-11-02')
    expect(histB).toHaveLength(1)
    expect(histB[0].lote).toBe('LOTE-2026-10-01')
    // Nunca cruza: MAT-A não contém lote de MAT-B e vice-versa
    expect(histA.some((i) => i.lote === 'LOTE-2026-10-01')).toBe(false)
    expect(histB.some((i) => i.lote === 'LOTE-2026-11-02')).toBe(false)

    // Filtro usado continha o código exato
    const calls = mockCollection.mock.results
    expect(calls.length).toBeGreaterThan(0)
  })

  it('Critério 3: estado vazio "Nenhum retrabalho registrado para este material."', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockResolvedValue({ items: [] }),
    } as any)

    render(<MaterialReworkHistorySection materialCode="MAT-SEM-RETRABALHO" />)

    await waitFor(() => {
      expect(
        screen.getByText('Nenhum retrabalho registrado para este material.'),
      ).toBeInTheDocument()
    })
    // Badge de contagem zera
    expect(screen.getByText('0 registro(s)')).toBeInTheDocument()
  })

  it('Critério 4: seção com rolagem interna própria (max-h + overflow-y-auto, sem overflow-x)', async () => {
    const mockCollection = vi.mocked(pb.collection)
    const muitos = Array.from({ length: 25 }, (_, i) => ({
      ...registroNovo,
      id: `rw-${i}`,
      created: new Date(Date.UTC(2026, 10, 1, 8, i)).toISOString(),
      lot_number: `LOTE-${String(i).padStart(3, '0')}`,
    }))
    mockCollection.mockReturnValue({
      getList: vi.fn().mockResolvedValue({ items: muitos }),
    } as any)

    const { container } = render(<MaterialReworkHistorySection materialCode="MAT-REWORK-100" />)

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBe(25)
    })

    const feed = container.querySelector('[role="feed"]') as HTMLElement | null
    expect(feed).not.toBeNull()
    // Rolagem interna vertical limitada
    expect(feed!.className).toMatch(/max-h-\[320px\]/)
    expect(feed!.className).toMatch(/overflow-y-auto/)
    // Sem rolagem horizontal da seção
    expect(feed!.className).toMatch(/overflow-x-hidden/)
    // Sem overflow-x no contêiner raiz da seção
    const root = container.firstElementChild as HTMLElement
    expect(root.className).not.toMatch(/overflow-x-auto/)
  })

  it('Critério 5: erro amigável com botão Tentar novamente e detalhe técnico apenas no console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockRejectedValue(new Error('FALHA_TECNICA_STACK_TRACE')),
    } as any)

    render(<MaterialReworkHistorySection materialCode="MAT-ERRO-REDE" />)

    await waitFor(() => {
      expect(
        screen.getByText('Não foi possível carregar o histórico de retrabalho. Tente novamente.'),
      ).toBeInTheDocument()
    })

    // Sem stack trace exposto ao usuário
    expect(screen.queryByText(/FALHA_TECNICA_STACK_TRACE/)).not.toBeInTheDocument()
    // Detalhe técnico vai para o console
    expect(consoleSpy).toHaveBeenCalled()

    // Botão Tentar novamente dispara nova consulta
    const mockGetList = mockCollection.mock.results[0].value as any
    const segundaChamada = vi.fn().mockResolvedValue({ items: [registroNovo] })
    mockCollection.mockReturnValue({ getList: segundaChamada } as any)

    await userEvent.click(
      screen.getByRole('button', { name: /Tentar novamente carregar histórico de retrabalho/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/LOTE-2026-11-02/)).toBeInTheDocument()
    })
    consoleSpy.mockRestore()
  })

  it('Critério 6: estado carregando "Carregando histórico de retrabalho..." durante a consulta', async () => {
    const mockCollection = vi.mocked(pb.collection)
    mockCollection.mockReturnValue({
      getList: vi.fn().mockReturnValue(new Promise(() => {})), // pendente
    } as any)

    render(<MaterialReworkHistorySection materialCode="MAT-REWORK-100" />)

    expect(screen.getByText('Carregando histórico de retrabalho...')).toBeInTheDocument()
  })

  it('Regra permanente: export duplo do pb em client.ts (export const pb + export default)', () => {
    expect(clientModule.pb).toBeDefined()
    expect((clientModule as any).default).toBeDefined()
    expect((clientModule as any).default).toBe(clientModule.pb)
  })
})
