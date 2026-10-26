import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodigosModelosPadraoTab } from '@/components/sap-validation/CodigosModelosPadraoTab'
import { sapModelTypesService } from '@/services/sap-model-types-service'

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Engenheiro PCP', email: 'engenharia@ciafal.com.br' },
    can: () => true,
    hasPermission: () => true,
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

describe('CodigosModelosPadraoTab — Remoção da Inclusão Manual de Códigos SAP', () => {
  const mockExistingModel = {
    id: 'f3oib4ajj3wxwug',
    tipo_codigo_modelo: 'Produto acabado L1',
    descricao: 'Modelo de referência para perfis e tubos acabados na Linha 1',
    centro: '1001',
    centro_trabalho: 'WC-DIV-L1',
    tipo_material: 'ZFER',
    status: 'Ativo' as const,
    modelos_vinculados: [
      {
        id: '648zsmqg44a15h0',
        tipo_codigo_modelo_id: 'f3oib4ajj3wxwug',
        codigo_material: '10004521',
        descricao: 'TUBO RETANGULAR 50X30X2,00MM SAE 1020',
        centro: '1001',
        centro_trabalho: 'WC-DIV-L1',
        tipo_material: 'ZFER',
        status: 'Ativo' as const,
      },
      {
        id: 'yjfe6tnfqi6wwn9',
        tipo_codigo_modelo_id: 'f3oib4ajj3wxwug',
        codigo_material: '10004522',
        descricao: 'TUBO QUADRADO 40X40X2,65MM SAE 1020',
        centro: '1001',
        centro_trabalho: 'WC-DIV-L1',
        tipo_material: 'ZFER',
        status: 'Ativo' as const,
      },
    ],
    modelos_count: 2,
    created: '2026-10-22T19:06:35.310Z',
    updated: '2026-10-22T19:06:35.310Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(sapModelTypesService, 'listModelTypes').mockResolvedValue([mockExistingModel as any])
    vi.spyOn(sapModelTypesService, 'getCentros').mockResolvedValue([
      { code: '1001', name: '1001 — Divinópolis', werks: '1001', source: 'plants' },
    ])
    vi.spyOn(sapModelTypesService, 'getCentrosTrabalho').mockResolvedValue([
      { code: 'WC-DIV-L1', name: 'WC-DIV-L1 — L1', arbpl: 'WC-DIV-L1', source: 'production_lines' },
    ])
  })

  it('1. Botão "+ Adicionar Código SAP" e campos manuais MATNR/Descrição não existem no modal de cadastro', async () => {
    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Criar Modelo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Criar Modelo'))

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Tipo de Código Modelo Padrão')).toBeInTheDocument()
    })

    // Não deve haver botão de adicionar
    expect(screen.queryByText('+ Adicionar Código SAP')).not.toBeInTheDocument()
    expect(screen.queryByText('Adicionar Código SAP')).not.toBeInTheDocument()

    // Não deve haver campos de entrada manual para códigos SAP
    expect(screen.queryByText(/Código do Material SAP/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/MATNR/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/10004521/i)).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/TUBO RETANGULAR 50X30/i)).not.toBeInTheDocument()

    // Não deve haver linha vazia de inclusão
    expect(screen.getByText('Nenhum código SAP vinculado a este modelo.')).toBeInTheDocument()
  })

  it('2. Permite salvar novo modelo SEM nenhum código SAP vinculado', async () => {
    const createSpy = vi.spyOn(sapModelTypesService, 'createModelType').mockResolvedValue({
      id: 'new_model_id',
      tipo_codigo_modelo: 'Semi-acabado Fornos L1',
      descricao: 'Tarugos reaquecidos',
      centro: '1001',
      centro_trabalho: 'WC-DIV-L1',
      tipo_material: 'FERT',
      status: 'Ativo',
      modelos_vinculados: [],
      modelos_count: 0,
    } as any)

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Criar Modelo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Criar Modelo'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ex.: Produto acabado L1/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/Ex.: Produto acabado L1/i), {
      target: { value: 'Semi-acabado Fornos L1' },
    })

    // Salvar sem códigos vinculados deve funcionar sem disparar erros de obrigatoriedade de códigos
    const saveBtn = screen.getByText('Salvar Modelo')
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        tipo_codigo_modelo: 'Semi-acabado Fornos L1',
        descricao: '',
        centro: '1001',
        centro_trabalho: 'WC-DIV-L1',
        tipo_material: 'FERT',
        status: 'Ativo',
        usuario: 'Engenheiro PCP',
        codigos_vinculados: [],
      })
    })

    // Sem mensagem de erro na tela
    expect(screen.queryByText(/O campo "Código SAP" é obrigatório/i)).not.toBeInTheDocument()
  })

  it('3. Na edição, códigos existentes (ex: Produto acabado L1) são exibidos como somente leitura sem botões de exclusão/edição de linha', async () => {
    const updateSpy = vi.spyOn(sapModelTypesService, 'updateModelType').mockResolvedValue({
      ...mockExistingModel,
      descricao: 'Descrição atualizada',
    } as any)

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Produto acabado L1')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Editar Produto acabado L1'))

    await waitFor(() => {
      expect(screen.getByText('Editar Tipo de Código Modelo Padrão')).toBeInTheDocument()
    })

    // Os códigos vinculados históricos aparecem na tabela
    expect(screen.getByText('10004521')).toBeInTheDocument()
    expect(screen.getByText('10004522')).toBeInTheDocument()
    expect(screen.getByText('TUBO RETANGULAR 50X30X2,00MM SAE 1020')).toBeInTheDocument()
    expect(screen.getByText('TUBO QUADRADO 40X40X2,65MM SAE 1020')).toBeInTheDocument()

    // Não há botões de remoção (lixeira) nem de alternar status na tabela
    expect(screen.queryByTitle('Remover Código')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Alternar Status')).not.toBeInTheDocument()
    expect(screen.queryByText('+ Adicionar Código SAP')).not.toBeInTheDocument()

    // Salva a edição
    fireEvent.click(screen.getByText('Salvar Modelo'))

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        'f3oib4ajj3wxwug',
        expect.objectContaining({
          tipo_codigo_modelo: 'Produto acabado L1',
          // Os vínculos existentes são preservados
          codigos_vinculados: expect.arrayContaining([
            expect.objectContaining({ codigo_material: '10004521' }),
            expect.objectContaining({ codigo_material: '10004522' }),
          ]),
        }),
      )
    })
  })

  it('4. Validação de duplicidade Centro + Centro de Trabalho + Tipo de Material permanece ativa', async () => {
    vi.spyOn(sapModelTypesService, 'createModelType').mockRejectedValue({
      message: 'Já existe um Tipo de Código Modelo Padrão cadastrado para esta combinação.',
      existingId: 'f3oib4ajj3wxwug',
    })

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Criar Modelo')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Criar Modelo'))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ex.: Produto acabado L1/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/Ex.: Produto acabado L1/i), {
      target: { value: 'Produto duplicado' },
    })

    fireEvent.click(screen.getByText('Salvar Modelo'))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Já existe um Tipo de Código Modelo Padrão cadastrado para esta combinação.',
        ),
      ).toBeInTheDocument()
      expect(screen.getByText('Ver cadastro existente')).toBeInTheDocument()
    })
  })
})
