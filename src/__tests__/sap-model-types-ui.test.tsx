import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodigosModelosPadraoTab } from '@/components/sap-validation/CodigosModelosPadraoTab'
import { sapModelTypesService } from '@/services/sap-model-types-service'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Engenheiro PCP', email: 'engenharia@ciafal.com.br' },
    can: () => true,
    canAny: () => true,
    canAll: () => true,
    hasLineScope: () => true,
    isLoading: false,
    isGlobal: true,
    scopes: [],
    delegations: [],
    permissions: [],
  }),
}))

describe('CodigosModelosPadraoTab — Interface, Regras Visuais e Interação', () => {
  const mockTypes = [
    {
      id: 'type-1',
      tipo_codigo_modelo: 'Produto acabado L1',
      descricao: 'Tubos e perfis acabados',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo' as const,
      modelos_vinculados: [
        {
          id: 'v1',
          tipo_codigo_modelo_id: 'type-1',
          codigo_material: '10004521',
          descricao: 'TUBO RETANGULAR 50X30',
          status: 'Ativo' as const,
        },
      ],
      modelos_count: 1,
      created: '2026-10-22T10:00:00Z',
      updated: '2026-10-22T10:00:00Z',
    },
    {
      id: 'type-2',
      tipo_codigo_modelo: 'Matéria-prima Sucata',
      descricao: 'Sucatas ferrosas',
      centro: '1002',
      centro_trabalho: 'LAML2',
      tipo_material: 'ROH',
      status: 'Inativo' as const,
      modelos_vinculados: [],
      modelos_count: 0,
      created: '2026-10-22T11:00:00Z',
      updated: '2026-10-22T11:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.spyOn(sapModelTypesService, 'listModelTypes').mockResolvedValue(mockTypes as any)
    vi.spyOn(sapModelTypesService, 'getCentros').mockResolvedValue([
      { code: '1001', name: '1001 — Divinópolis', werks: '1001', source: 'plants' },
      { code: '1002', name: '1002 — Contagem', werks: '1002', source: 'plants' },
    ])
    vi.spyOn(sapModelTypesService, 'getCentrosTrabalho').mockResolvedValue([
      { code: 'WC-DIV-L1', name: 'WC-DIV-L1 — L1', arbpl: 'WC-DIV-L1', source: 'production_lines' },
      { code: 'LAML2', name: 'LAML2 — L2', arbpl: 'LAML2', source: 'production_lines' },
    ])
  })

  it('1. Renderiza os cards de resumo no topo e a listagem com colunas obrigatórias', async () => {
    render(<CodigosModelosPadraoTab />)

    // Aguarda carregar dados
    await waitFor(() => {
      expect(screen.getByText('Total de Tipos de Código Modelo')).toBeInTheDocument()
    })

    expect(screen.getByText('Tipos Ativos')).toBeInTheDocument()
    expect(screen.getByText('Tipos Inativos')).toBeInTheDocument()
    expect(screen.getByText('Códigos Modelo Cadastrados')).toBeInTheDocument()

    // Botão de novo tipo: "Criar Modelo"
    expect(screen.getByText('Criar Modelo')).toBeInTheDocument()

    // Itens na tabela
    expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    expect(screen.getByText('Matéria-prima Sucata')).toBeInTheDocument()

    // Colunas-chave
    expect(screen.getByText('WC-DIV-L1')).toBeInTheDocument()
    expect(screen.getByText('ZFER')).toBeInTheDocument()
  })

  it('2. Abre o modal "Cadastrar Tipo de Código Modelo Padrão" com campos obrigatórios e seções', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Criar Modelo')).toBeInTheDocument()
    })

    const btnNovo = screen.getByText('Criar Modelo')
    fireEvent.click(btnNovo)

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Tipo de Código Modelo Padrão')).toBeInTheDocument()
      expect(screen.getByText('Campos-chave para identificação do modelo')).toBeInTheDocument()
      expect(screen.getByText(/Códigos Modelo Vinculados/i)).toBeInTheDocument()
    })
  })

  it('3. Mostra mensagem de descarte quando há alterações e o usuário clica em Cancelar', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Criar Modelo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Criar Modelo'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ex.: Produto acabado L1/i)).toBeInTheDocument()
    })

    const inputNome = screen.getByPlaceholderText(/Ex.: Produto acabado L1/i)
    fireEvent.change(inputNome, { target: { value: 'Alteração em andamento' } })

    const btnCancelar = screen.getByText('Cancelar')
    fireEvent.click(btnCancelar)

    await waitFor(() => {
      expect(screen.getByText('Descartar alterações?')).toBeInTheDocument()
    })
  })

  it('4. Abre o modal em modo de edição "Editar Tipo de Código Modelo Padrão" preenchido com dados existentes', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    const btnEditar = screen.getByLabelText('Editar Produto acabado L1')
    expect(btnEditar).toBeInTheDocument()
    fireEvent.click(btnEditar)

    await waitFor(() => {
      expect(screen.getByText('Editar Tipo de Código Modelo Padrão')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Produto acabado L1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Tubos e perfis acabados')).toBeInTheDocument()
      expect(screen.getByText('10004521')).toBeInTheDocument()
      expect(screen.getByText('TUBO RETANGULAR 50X30')).toBeInTheDocument()
    })
  })

  it('5. Permite adicionar novo código vinculado no modo de edição e salvar chamando updateModelType', async () => {
    const updateSpy = vi.spyOn(sapModelTypesService, 'updateModelType').mockResolvedValue({
      id: 'type-1',
      tipo_codigo_modelo: 'Produto acabado L1 - Atualizado',
      descricao: 'Tubos e perfis acabados',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'ZFER',
      status: 'Ativo',
      modelos_vinculados: [],
    } as any)

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar Produto acabado L1'))

    await waitFor(() => {
      expect(screen.getByText('Editar Tipo de Código Modelo Padrão')).toBeInTheDocument()
    })

    // Adiciona novo código vinculado
    const codeInput = screen.getByPlaceholderText('Ex.: 10004521')
    const descInput = screen.getByPlaceholderText('Ex.: TUBO RETANGULAR 50X30X2,00MM SAE 1020')
    fireEvent.change(codeInput, { target: { value: '10009999' } })
    fireEvent.change(descInput, { target: { value: 'NOVO TUBO TESTE' } })

    const addBtn = screen.getByText('+ Adicionar Código SAP')
    fireEvent.click(addBtn)

    await waitFor(() => {
      expect(screen.getByText('10009999')).toBeInTheDocument()
    })

    // Clica em Salvar Modelo
    const saveBtn = screen.getByText('Salvar Modelo')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'type-1',
        expect.objectContaining({
          tipo_codigo_modelo: 'Produto acabado L1',
          codigos_vinculados: expect.arrayContaining([
            expect.objectContaining({ codigo_material: '10004521' }),
            expect.objectContaining({ codigo_material: '10009999' }),
          ]),
        }),
      )
    })
  })
})
