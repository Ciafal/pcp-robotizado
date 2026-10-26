import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CodigosModelosPadraoTab } from '@/components/sap-validation/CodigosModelosPadraoTab'
import { sapModelTypesService } from '@/services/sap-model-types-service'
import { authService } from '@/services/pcp-auth'

// Mock de useAuth dinâmico por teste
let currentRole = 'PCP_PROGRAMMER'
let userPermissions = authService.getPermissionsForRole('PCP_PROGRAMMER')

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Programador PCP Teste', email: 'programador@ciafal.com.br', role: currentRole },
    can: (permissionKey: string) => userPermissions.includes(permissionKey),
    hasPermission: (permissionKey: string) => userPermissions.includes(permissionKey),
    canAny: (keys: string[]) => keys.some((k) => userPermissions.includes(k)),
    canAll: (keys: string[]) => keys.every((k) => userPermissions.includes(k)),
    hasLineScope: () => true,
    isLoading: false,
    isGlobal: currentRole === 'PCP_ADMIN',
    scopes: [],
    delegations: [],
    permissions: userPermissions.map((k) => ({
      key: k,
      name: k,
      category: 'Cadastros',
      is_critical: false,
      source: 'ROLE',
    })),
  }),
}))

describe('CodigosModelosPadraoTab — Visibilidade e Permissões com Perfis Reais', () => {
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
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(sapModelTypesService, 'listModelTypes').mockResolvedValue(mockTypes as any)
    vi.spyOn(sapModelTypesService, 'getCentros').mockResolvedValue([
      { code: '1001', name: '1001 — Divinópolis', werks: '1001', source: 'plants' },
    ])
    vi.spyOn(sapModelTypesService, 'getCentrosTrabalho').mockResolvedValue([
      { code: 'WC-DIV-L1', name: 'WC-DIV-L1 — L1', arbpl: 'WC-DIV-L1', source: 'production_lines' },
    ])
  })

  it('1. O perfil PCP_PROGRAMMER tem a permissão pcp.sap_validation.models.manage e VÊ o botão "+ Criar Modelo" posicionado ao lado de Atualizar', async () => {
    currentRole = 'PCP_PROGRAMMER'
    userPermissions = authService.getPermissionsForRole('PCP_PROGRAMMER')

    // Certifica que a permissão esperada está presente na role resolvida
    expect(userPermissions).toContain('pcp.sap_validation.models.manage')

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Tipos de Código Modelo Padrão')).toBeInTheDocument()
    })

    // Botão Criar Modelo DEVE estar visível
    const btnCriarModelo = screen.getByTestId('btn-criar-modelo')
    expect(btnCriarModelo).toBeInTheDocument()
    expect(btnCriarModelo).toBeVisible()
    expect(btnCriarModelo).toHaveTextContent('Criar Modelo')

    // Botão Atualizar também deve estar presente
    const btnAtualizar = screen.getByTestId('btn-atualizar-modelos')
    expect(btnAtualizar).toBeInTheDocument()
    expect(btnAtualizar).toBeVisible()
  })

  it('2. O clique no botão "+ Criar Modelo" abre o modal "Cadastrar Tipo de Código Modelo Padrão"', async () => {
    currentRole = 'PCP_PROGRAMMER'
    userPermissions = authService.getPermissionsForRole('PCP_PROGRAMMER')

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByTestId('btn-criar-modelo')).toBeInTheDocument()
    })

    const btnCriarModelo = screen.getByTestId('btn-criar-modelo')
    fireEvent.click(btnCriarModelo)

    await waitFor(() => {
      expect(screen.getByText('Cadastrar Tipo de Código Modelo Padrão')).toBeInTheDocument()
      expect(screen.getByText('Campos-chave para identificação do modelo')).toBeInTheDocument()
      expect(screen.getByText('Códigos Modelo Vinculados')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Ex.: Produto acabado L1/i)).toBeInTheDocument()
    })
  })

  it('3. Um perfil apenas leitor (ex.: PRODUCTION_VIEWER) NÃO tem pcp.sap_validation.models.manage e NÃO vê o botão "+ Criar Modelo"', async () => {
    currentRole = 'PRODUCTION_VIEWER'
    userPermissions = authService.getPermissionsForRole('PRODUCTION_VIEWER')

    expect(userPermissions).not.toContain('pcp.sap_validation.models.manage')

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByText('Tipos de Código Modelo Padrão')).toBeInTheDocument()
    })

    // Botão Criar Modelo NÃO deve estar no documento
    expect(screen.queryByTestId('btn-criar-modelo')).not.toBeInTheDocument()
    expect(screen.queryByText('Criar Modelo')).not.toBeInTheDocument()

    // Mas o botão Atualizar continua visível
    expect(screen.getByTestId('btn-atualizar-modelos')).toBeInTheDocument()
  })

  it('4. O perfil PCP_ADMIN possui a permissão e VÊ o botão "+ Criar Modelo"', async () => {
    currentRole = 'PCP_ADMIN'
    userPermissions = authService.getPermissionsForRole('PCP_ADMIN')

    expect(userPermissions).toContain('pcp.sap_validation.models.manage')

    render(<CodigosModelosPadraoTab />)

    await waitFor(() => {
      expect(screen.getByTestId('btn-criar-modelo')).toBeInTheDocument()
    })

    expect(screen.getByTestId('btn-criar-modelo')).toBeVisible()
  })
})
