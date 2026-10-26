import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodigosModelosPadraoTab } from '@/components/sap-validation/CodigosModelosPadraoTab'
import {
  sapModelTypesService,
  DUPLICATE_COMBINATION_ERROR_MSG,
} from '@/services/sap-model-types-service'
import * as authContextModule from '@/contexts/AuthContext'

describe('Editar Tipo de Código Modelo Padrão — UI & Acceptance Requirements', () => {
  const mockTypes = [
    {
      id: 'type-finish-l1',
      tipo_codigo_modelo: 'Produto acabado L1',
      descricao: 'Tubos e perfis acabados L1',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo' as const,
      modelos_vinculados: [
        {
          id: 'v1',
          tipo_codigo_modelo_id: 'type-finish-l1',
          codigo_material: '10004521',
          descricao: 'TUBO RETANGULAR 50X30X2,00MM SAE 1020',
          status: 'Ativo' as const,
        },
        {
          id: 'v2',
          tipo_codigo_modelo_id: 'type-finish-l1',
          codigo_material: '10004522',
          descricao: 'TUBO QUADRADO 40X40X2,65MM SAE 1020',
          status: 'Ativo' as const,
        },
      ],
      modelos_count: 2,
      created: '2026-10-22T10:00:00Z',
      updated: '2026-10-22T10:00:00Z',
    },
    {
      id: 'type-semi-l2',
      tipo_codigo_modelo: 'Semiacabado L2',
      descricao: 'Tarugos para laminação L2',
      centro: '1002',
      centro_trabalho: 'LAML2',
      tipo_material: 'HALB',
      status: 'Ativo' as const,
      modelos_vinculados: [],
      modelos_count: 0,
      created: '2026-10-22T11:00:00Z',
      updated: '2026-10-22T11:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(sapModelTypesService, 'listModelTypes').mockResolvedValue(mockTypes as any)
    vi.spyOn(sapModelTypesService, 'getCentros').mockResolvedValue([
      { code: '1001', name: '1001 — Divinópolis', werks: '1001', source: 'plants' },
      { code: '1002', name: '1002 — Contagem', werks: '1002', source: 'plants' },
    ])
    vi.spyOn(sapModelTypesService, 'getCentrosTrabalho').mockResolvedValue([
      {
        code: 'WC-DIV-L1',
        name: 'WC-DIV-L1 — L1',
        arbpl: 'WC-DIV-L1',
        source: 'production_lines',
      },
      { code: 'LAML2', name: 'LAML2 — L2', arbpl: 'LAML2', source: 'production_lines' },
    ])

    vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Engenheiro PCP', email: 'engenharia@ciafal.com.br' },
      can: (perm: string) =>
        perm === 'pcp.sap_validation.models.manage' || perm === 'pcp.sap_validation.models.view',
      canAny: () => true,
      canAll: () => true,
      hasLineScope: () => true,
      isLoading: false,
      isGlobal: true,
      scopes: [],
      delegations: [],
      permissions: [],
    } as any)
  })

  it('1. Exibe botão Editar com ícone na linha da tabela quando o usuário possui canManage', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    const btnEditar = screen.getByLabelText('Editar Produto acabado L1')
    expect(btnEditar).toBeInTheDocument()
    expect(btnEditar.getAttribute('title')).toBe('Editar Tipo de Código Modelo')
  })

  it('2. Oculta botão Editar quando usuário NÃO possui permissão pcp.sap_validation.models.manage', async () => {
    vi.spyOn(authContextModule, 'useAuth').mockReturnValue({
      user: { name: 'Visualizador Operacional', email: 'viewer@ciafal.com.br' },
      can: (perm: string) => perm === 'pcp.sap_validation.models.view', // sem canManage
      canAny: () => false,
      canAll: () => false,
      hasLineScope: () => true,
      isLoading: false,
      isGlobal: false,
      scopes: [],
      delegations: [],
      permissions: [],
    } as any)

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    // Botão Criar Modelo não deve aparecer
    expect(screen.queryByText('Criar Modelo')).not.toBeInTheDocument()
    // Botão Editar não deve aparecer
    expect(screen.queryByLabelText('Editar Produto acabado L1')).not.toBeInTheDocument()
  })

  it('3. Abre o modal retitulado "Editar Tipo de Código Modelo Padrão" preenchido com dados do registro e itens', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar Produto acabado L1'))

    await waitFor(() => {
      expect(screen.getByText('Editar Tipo de Código Modelo Padrão')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Produto acabado L1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Tubos e perfis acabados L1')).toBeInTheDocument()
      expect(screen.getByText('10004521')).toBeInTheDocument()
      expect(screen.getByText('10004522')).toBeInTheDocument()
      expect(screen.getByText('TUBO RETANGULAR 50X30X2,00MM SAE 1020')).toBeInTheDocument()
      expect(screen.getByText('TUBO QUADRADO 40X40X2,65MM SAE 1020')).toBeInTheDocument()
    })
  })

  it('4. Tabela de códigos vinculados no modo de edição permanece em somente leitura e preserva vínculos existentes ao salvar', async () => {
    const updateSpy = vi.spyOn(sapModelTypesService, 'updateModelType').mockResolvedValue({
      id: 'type-finish-l1',
      tipo_codigo_modelo: 'Produto acabado L1 Atualizado',
      descricao: 'Tubos e perfis acabados L1',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo',
      modelos_vinculados: mockTypes[0].modelos_vinculados,
    } as any)

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar Produto acabado L1'))

    await waitFor(() => {
      expect(screen.getByText('10004521')).toBeInTheDocument()
      expect(screen.getByText('10004522')).toBeInTheDocument()
    })

    // Garante que NÃO há botões de remoção, adição ou edição manual de códigos
    expect(screen.queryByTitle('Remover Código')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Alternar Status')).not.toBeInTheDocument()
    expect(screen.queryByText('+ Adicionar Código SAP')).not.toBeInTheDocument()

    // Altera nome do tipo de modelo
    const nameInput = screen.getByDisplayValue('Produto acabado L1')
    fireEvent.change(nameInput, { target: { value: 'Produto acabado L1 Atualizado' } })

    // Salva o modelo mantendo os vínculos pré-carregados intactos
    fireEvent.click(screen.getByText('Salvar Modelo'))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'type-finish-l1',
        expect.objectContaining({
          tipo_codigo_modelo: 'Produto acabado L1 Atualizado',
          codigos_vinculados: expect.arrayContaining([
            expect.objectContaining({ codigo_material: '10004521' }),
            expect.objectContaining({ codigo_material: '10004522' }),
          ]),
        }),
      )
    })
  })

  it('5. Exibe mensagem de duplicidade oficial quando o backend rejeita com colisão de chave', async () => {
    vi.spyOn(sapModelTypesService, 'updateModelType').mockRejectedValue({
      message: DUPLICATE_COMBINATION_ERROR_MSG,
      existingId: 'type-semi-l2',
    })

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar Produto acabado L1'))

    await waitFor(() => {
      expect(screen.getByText('Editar Tipo de Código Modelo Padrão')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Salvar Modelo'))

    await waitFor(() => {
      expect(screen.getByText(DUPLICATE_COMBINATION_ERROR_MSG)).toBeInTheDocument()
      expect(screen.getByText('Ver cadastro existente')).toBeInTheDocument()
    })
  })

  it('6. Cancela e pede confirmação quando há alterações no modo de edição', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar Produto acabado L1'))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Produto acabado L1')).toBeInTheDocument()
    })

    const descInput = screen.getByDisplayValue('Tubos e perfis acabados L1')
    fireEvent.change(descInput, { target: { value: 'Descrição alterada sem salvar' } })

    fireEvent.click(screen.getByText('Cancelar'))

    await waitFor(() => {
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()
    })

    // Se clicar em Continuar editando, mantém modal aberto
    fireEvent.click(screen.getByText('Continuar editando'))
    await waitFor(() => {
      expect(screen.getByText('Editar Tipo de Código Modelo Padrão')).toBeInTheDocument()
    })
  })
})
