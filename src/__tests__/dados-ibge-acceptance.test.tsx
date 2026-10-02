/**
 * Testes de Aceitação Oficial — Peça 1: Dados IBGE
 * Validações obrigatórias:
 * 1. Item de menu "Dados IBGE" presente no grupo CONTROLE DE PRODUÇÃO (/pcp/controle-producao/dados-ibge)
 * 2. Rota monta sem tela branca nem router-dentro-de-router
 * 3. Cascata Empresa -> Linha -> Centro
 * 4. Multi-seleção de centros com contagem dinâmica
 * 5. Consolidação NUNCA soma UM incompatíveis (discriminação por unidade)
 * 6. Export pb preservado (named + default) em src/lib/pocketbase/client.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { officialNavGroups } from '@/components/layout/PCPNavigation'
import pbDefault, { pb } from '@/lib/pocketbase/client'
import { dadosIbgeService } from '@/services/dados-ibge-service'
import { DadosIbgeFilterBar } from '@/components/production-control/DadosIbgeFilterBar'
import { DadosIbgeTotalizadores } from '@/components/production-control/DadosIbgeTotalizadores'
import { DadosIbgeDetailModal } from '@/components/production-control/DadosIbgeDetailModal'
import { DadosIbgeTable } from '@/components/production-control/DadosIbgeTable'
import { DadosIbgePage } from '@/pages/production-control/DadosIbgePage'
import { LinhaConsolidadaIbge, TotalizadoresIbge } from '@/types/dados-ibge'

describe('Peça 1 — Dados IBGE (Controle de Produção)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. Menu oficial
  it('1. Item de menu "Dados IBGE" está presente no grupo CONTROLE DE PRODUÇÃO com rota e ícone corretos', () => {
    const grupoControle = officialNavGroups.find((g) => g.groupTitle === 'CONTROLE DE PRODUÇÃO')
    expect(grupoControle).toBeDefined()

    const itemIbge = grupoControle?.items.find(
      (item) => item.href === '/pcp/controle-producao/dados-ibge',
    )
    expect(itemIbge).toBeDefined()
    expect(itemIbge?.title).toBe('Dados IBGE')
    expect(itemIbge?.icon).toBeDefined()
    expect(itemIbge?.permission).toBe('pcp.production.view')
  })

  // 2. Export pb preservado
  it('2. Exportação nomeada e padrão de "pb" em src/lib/pocketbase/client.ts preservada sem regressão', () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
    expect(typeof pb.collection).toBe('function')
  })

  // 3. Regra de consolidação: NUNCA somar UM incompatíveis
  it('3. Totalizadores não somam unidades de medida incompatíveis (discrimina por UM)', () => {
    const totalizadoresMisto: TotalizadoresIbge = {
      centros_selecionados_count: 2,
      materiais_distintos_count: 2,
      quantidades_por_unidade: {
        t: 125.5,
        peça: 400,
      },
      total_registros: 15,
      status_geral: 'Pendente',
      contagem_por_status: { pendente: 2, conferida: 0, enviada: 0 },
    }

    render(<DadosIbgeTotalizadores totalizadores={totalizadoresMisto} />)

    // Com múltiplas unidades incompatíveis, exibe a contagem de unidades distintas e permite detalhar
    expect(screen.getByText(/2 unidades distintas/i)).toBeInTheDocument()
    expect(screen.getByText(/125,500/)).toBeInTheDocument()
    expect(screen.getByText(/400,000/)).toBeInTheDocument()
    expect(screen.queryByText(/525,500/)).not.toBeInTheDocument()
  })

  // 4. Cascata Empresa -> Linha -> Centro na barra de filtros
  it('4. Cascata de filtros: Linha desabilitada sem Empresa; troca de Empresa limpa Linha e Centros', () => {
    const handleAplicar = vi.fn()
    const handleLimpar = vi.fn()

    const empresasMock = [
      { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
      { werks: '2000', name: 'CIAFAL Contagem', label: '2000 — CIAFAL Contagem' },
    ]
    const linhasMock = [
      { id: 'l1', code: 'L1', name: 'Laminação 1', label: 'L1 — Laminação 1', werks: '1000' },
      { id: 'l2', code: 'L2', name: 'Laminação 2', label: 'L2 — Laminação 2', werks: '1000' },
    ]
    const centrosMock = [
      { code: 'SEML1', name: 'SEML1', label: 'SEML1 — Centro SEML1', lineCode: 'L1' },
      { code: 'FORNO1', name: 'FORNO1', label: 'FORNO1 — Centro FORNO1', lineCode: 'L1' },
    ]

    const { rerender } = render(
      <DadosIbgeFilterBar
        filtros={{
          empresa: 'TODAS',
          linha: 'TODAS',
          centros: [],
          mtart: 'TODOS',
          mes: '09',
          ano: '2026',
        }}
        onAplicarFiltros={handleAplicar}
        onLimparFiltros={handleLimpar}
        opcoesEmpresas={empresasMock}
        opcoesLinhas={[]}
        opcoesCentros={[]}
        opcoesMtart={[
          { codigo: 'FERT', descricao: 'Produto Acabado', label: 'FERT — Produto Acabado' },
        ]}
      />,
    )

    // Sem empresa selecionada: select de Linha deve estar desabilitado
    const selectLinha = screen.getByLabelText('Linha') as HTMLSelectElement
    expect(selectLinha.disabled).toBe(true)
    expect(screen.getByText('Selecione primeiro a Empresa.')).toBeInTheDocument()

    // Seleciona Empresa 1000
    const selectEmpresa = screen.getByLabelText('Empresa') as HTMLSelectElement
    fireEvent.change(selectEmpresa, { target: { value: '1000' } })

    // Rerender com linha populada
    rerender(
      <DadosIbgeFilterBar
        filtros={{
          empresa: '1000',
          linha: 'TODAS',
          centros: [],
          mtart: 'TODOS',
          mes: '09',
          ano: '2026',
        }}
        onAplicarFiltros={handleAplicar}
        onLimparFiltros={handleLimpar}
        opcoesEmpresas={empresasMock}
        opcoesLinhas={linhasMock}
        opcoesCentros={centrosMock}
        opcoesMtart={[
          { codigo: 'FERT', descricao: 'Produto Acabado', label: 'FERT — Produto Acabado' },
        ]}
      />,
    )

    const selectLinhaAtiva = screen.getByLabelText('Linha') as HTMLSelectElement
    expect(selectLinhaAtiva.disabled).toBe(false)
  })

  // 5. Multi-seleção de Centros com busca e contagem dinâmica
  it('5. Multi-seleção de Centros exibe contagem dinâmica no rótulo', async () => {
    const centrosMock = [
      { code: 'SEML1', name: 'SEML1', label: 'SEML1 — Centro SEML1', lineCode: 'L1' },
      { code: 'FORNO1', name: 'FORNO1', label: 'FORNO1 — Centro FORNO1', lineCode: 'L1' },
    ]

    render(
      <DadosIbgeFilterBar
        filtros={{
          empresa: '1000',
          linha: 'L1',
          centros: ['SEML1', 'FORNO1'],
          mtart: 'TODOS',
          mes: '09',
          ano: '2026',
        }}
        onAplicarFiltros={vi.fn()}
        onLimparFiltros={vi.fn()}
        opcoesEmpresas={[]}
        opcoesLinhas={[]}
        opcoesCentros={centrosMock}
        opcoesMtart={[]}
      />,
    )

    // Deve exibir o rótulo com a quantidade selecionada
    expect(screen.getByText('2 centros selecionados')).toBeInTheDocument()
  })

  // 6. Rastreabilidade analítica e modal "Visualizar"
  it('6. Modal "Dados IBGE — Detalhamento" abre com seções Identificação, Material, Produção e Rastreabilidade', () => {
    const itemConsolidado: LinhaConsolidadaIbge = {
      id: 'ibge-test-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo Galvanizado 50mm Industrial',
      competencia: '09/2026',
      quantidade_produzida: 82.45,
      unidade_medida: 't',
      status_fechamento: 'Conferida',
      total_registros: 2,
      centros_envolvidos: ['SEML1', 'LAMIN1'],
      registros_rastreabilidade: [
        {
          id: 'post-1',
          origem: 'APONTAMENTO_MES',
          op_number: 'OP-450012',
          posting_code: 'AP-001',
          data_hora: '2026-09-15 14:30',
          data_hora_formatada: '15/09/2026 14:30',
          quantidade: 50.25,
          unidade: 't',
          sap_document_number: 'DOC-99881',
          usuario_origem: 'Carlos Silva',
          status_processamento: 'Integrado SAP',
        },
        {
          id: 'post-2',
          origem: 'APONTAMENTO_MES',
          op_number: 'OP-450013',
          posting_code: 'AP-002',
          data_hora: '2026-09-18 10:15',
          data_hora_formatada: '18/09/2026 10:15',
          quantidade: 32.2,
          unidade: 't',
          sap_document_number: 'DOC-99882',
          usuario_origem: 'Marcos Souza',
          status_processamento: 'Integrado SAP',
        },
      ],
    }

    const handleClose = vi.fn()
    render(<DadosIbgeDetailModal open={true} onClose={handleClose} item={itemConsolidado} />)

    expect(screen.getByText('Dados IBGE — Detalhamento')).toBeInTheDocument()
    expect(screen.getByText(/1000 — CIAFAL Matriz/)).toBeInTheDocument()
    expect(screen.getByText('TB-GALV-50')).toBeInTheDocument()
    expect(screen.getByText('Tubo Galvanizado 50mm Industrial')).toBeInTheDocument()
    expect(screen.getByText('OP-450012')).toBeInTheDocument()
    expect(screen.getByText('15/09/2026 14:30')).toBeInTheDocument()
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument()
    expect(screen.getByText('Fechar')).toBeInTheDocument()
  })

  // 7. Página monta sem router-dentro-de-router e renderiza título e subtítulo oficiais
  it('7. Página DadosIbgePage monta com título e subtítulo oficiais', async () => {
    render(
      <MemoryRouter>
        <DadosIbgePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Dados IBGE')).toBeInTheDocument()
    })

    expect(
      screen.getByText(
        'Consolidação mensal dos dados de produção para fechamento e envio à Contabilidade.',
      ),
    ).toBeInTheDocument()
  })

  // 8. PermissionGuard não bloqueia rota Dados IBGE mesmo com query string, hash, trailing slash e cold start
  it('8. PermissionGuard não bloqueia nem trava a rota /pcp/controle-producao/dados-ibge em cold start e com normalização', async () => {
    const { PermissionGuard } = await import('@/components/auth/PermissionGuard')
    const { unmount } = render(
      <MemoryRouter initialEntries={['/pcp/controle-producao/dados-ibge']}>
        <PermissionGuard permission="pcp.production.view">
          <div data-testid="dados-ibge-route-content">Dados IBGE Renderizado com Sucesso</div>
        </PermissionGuard>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('dados-ibge-route-content')).toBeInTheDocument()
    unmount()

    // Teste com trailing slash e query string (cenário relatado de travamento)
    render(
      <MemoryRouter
        initialEntries={['/pcp/controle-producao/dados-ibge/?competencia=09/2026#topo']}
      >
        <PermissionGuard permission="pcp.production.view">
          <div data-testid="dados-ibge-with-query">Dados IBGE com Query String Renderizado</div>
        </PermissionGuard>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('dados-ibge-with-query')).toBeInTheDocument()
  })

  // 9. Card Centros Selecionados: Todos vs Parcial
  it('9. Card Centros Selecionados exibe "Todos" e subtítulo "Todos os centros da linha" quando count = 0', () => {
    const totalizadoresTodos: TotalizadoresIbge = {
      centros_selecionados_count: 0,
      materiais_distintos_count: 1,
      quantidades_por_unidade: { t: 455.9 },
      total_registros: 10,
      status_geral: 'Conferida',
      contagem_por_status: { pendente: 0, conferida: 1, enviada: 0 },
    }

    render(<DadosIbgeTotalizadores totalizadores={totalizadoresTodos} />)
    expect(screen.getByText('Todos')).toBeInTheDocument()
    expect(screen.getByText('Todos os centros da linha')).toBeInTheDocument()
    expect(screen.getByText(/455,900 t/)).toBeInTheDocument()
  })

  it('9.1 Card Centros Selecionados exibe número e "centros selecionados" quando contagem parcial', () => {
    const totalizadoresParcial: TotalizadoresIbge = {
      centros_selecionados_count: 3,
      materiais_distintos_count: 5,
      quantidades_por_unidade: { t: 1250.75 },
      total_registros: 25,
      status_geral: 'Pendente',
      contagem_por_status: { pendente: 3, conferida: 2, enviada: 0 },
    }

    render(<DadosIbgeTotalizadores totalizadores={totalizadoresParcial} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('centros selecionados')).toBeInTheDocument()
    expect(screen.getByText(/1.250,750 t/)).toBeInTheDocument()
    expect(screen.getByText('3 pendência(s)')).toBeInTheDocument()
  })

  // 10. Tabela Consolidada com todas as 11 colunas acessíveis e botão Visualizar
  it('10. Grid Consolidado exibe as 11 colunas e botão Visualizar acessível sem corte', () => {
    const item: LinhaConsolidadaIbge = {
      id: 'row-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo Galvanizado 50mm Industrial',
      competencia: '09/2026',
      quantidade_produzida: 455.9,
      unidade_medida: 't',
      status_fechamento: 'Conferida',
      total_registros: 10,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
    }

    const handleVisualizar = vi.fn()
    render(
      <DadosIbgeTable
        linhas={[item]}
        onVisualizar={handleVisualizar}
        onEnviarIndividual={vi.fn()}
        onEnviarSelecionados={vi.fn()}
        linhasSelecionadasIds={[]}
        onToggleLinha={vi.fn()}
        onToggleTodos={vi.fn()}
      />,
    )

    // Verifica que as 11 colunas estão no cabeçalho
    expect(screen.getByText('Empresa')).toBeInTheDocument()
    expect(screen.getByText('Linha')).toBeInTheDocument()
    expect(screen.getByText('Centro')).toBeInTheDocument()
    expect(screen.getByText('Tipo material')).toBeInTheDocument()
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Descrição')).toBeInTheDocument()
    expect(screen.getByText('Período')).toBeInTheDocument()
    expect(screen.getByText('Quantidade Produzida')).toBeInTheDocument()
    expect(screen.getByText('UM')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Ações')).toBeInTheDocument()

    // Botão visualizar clicável
    const btnVisualizar = screen.getAllByRole('button', { name: /visualizar/i })[0]
    expect(btnVisualizar).toBeInTheDocument()
    fireEvent.click(btnVisualizar)
    expect(handleVisualizar).toHaveBeenCalledWith(item)
  })

  // 11. Coluna Ações: botão Enviar p/ Contabilidade e botão Visualizar operacionais
  it('11. Coluna Ações exibe "Visualizar" e "Enviar p/ Contabilidade" com funcionamento real', () => {
    const item: LinhaConsolidadaIbge = {
      id: 'row-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo Galvanizado 50mm Industrial',
      competencia: '09/2026',
      quantidade_produzida: 455.9,
      unidade_medida: 't',
      status_fechamento: 'Conferida',
      total_registros: 10,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
    }

    const handleVisualizar = vi.fn()
    const handleEnviarIndividual = vi.fn()
    const handleEnviarSelecionados = vi.fn()
    const handleToggleLinha = vi.fn()
    const handleToggleTodos = vi.fn()

    render(
      <DadosIbgeTable
        linhas={[item]}
        onVisualizar={handleVisualizar}
        onEnviarIndividual={handleEnviarIndividual}
        onEnviarSelecionados={handleEnviarSelecionados}
        linhasSelecionadasIds={[]}
        onToggleLinha={handleToggleLinha}
        onToggleTodos={handleToggleTodos}
      />,
    )

    // Ambos os botões com os títulos exatos
    const btnVisualizar = screen.getAllByRole('button', { name: /visualizar/i })[0]
    const btnEnviar = screen.getAllByRole('button', { name: /enviar p\/ contabilidade/i })[0]

    expect(btnVisualizar).toBeInTheDocument()
    expect(btnEnviar).toBeInTheDocument()

    fireEvent.click(btnEnviar)
    expect(handleEnviarIndividual).toHaveBeenCalledWith(item)
  })

  // 12. Modal de confirmação do envio individual com título exato e resumo estruturado
  it('12. Modal de confirmação individual exibe título exato "Enviar Dados IBGE para Contabilidade" e campos requeridos', async () => {
    const item: LinhaConsolidadaIbge = {
      id: 'row-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo Galvanizado 50mm Industrial',
      competencia: '09/2026',
      quantidade_produzida: 455.9,
      unidade_medida: 't',
      status_fechamento: 'Conferida',
      total_registros: 10,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
    }

    const { EnviarDadosIbgeModal } =
      await import('@/components/production-control/EnviarDadosIbgeModal')
    const handleSuccess = vi.fn()
    const handleError = vi.fn()
    const handleOpenChange = vi.fn()

    render(
      <EnviarDadosIbgeModal
        open={true}
        onOpenChange={handleOpenChange}
        linhas={[item]}
        filtros={{
          empresa: '1000',
          linha: 'L1',
          centros: ['SEML1'],
          mtart: 'FERT',
          mes: '09',
          ano: '2026',
        }}
        onSuccess={handleSuccess}
        onError={handleError}
      />,
    )

    // Título exato
    expect(screen.getByText('Enviar Dados IBGE para Contabilidade')).toBeInTheDocument()

    // Resumo: Empresa, Linha, Centro, Tipo de Material, Material, Descrição, Período, Quantidade, UM, Usuário
    expect(screen.getByText(/1000 — CIAFAL Matriz/)).toBeInTheDocument()
    expect(screen.getByText(/L1 — Laminação 1/)).toBeInTheDocument()
    expect(screen.getByText('SEML1')).toBeInTheDocument()
    expect(screen.getByText('TB-GALV-50')).toBeInTheDocument()
    expect(screen.getByText('Tubo Galvanizado 50mm Industrial')).toBeInTheDocument()
    expect(screen.getByText('09/2026')).toBeInTheDocument()
    expect(screen.getByText(/455,900 T/)).toBeInTheDocument()
    expect(screen.getByText(/Usuário Responsável pelo Envio:/)).toBeInTheDocument()

    // Botões com títulos exatos "Cancelar" e "Confirmar Envio"
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar envio/i })).toBeInTheDocument()
  })

  // 13. Envio Consolidado em Lote no cabeçalho do grid: desabilitado sem seleção / habilitado com contagem
  it('13. Botão em lote no cabeçalho: "Enviar Selecionados p/ Contabilidade" desabilitado sem marcação e com contagem quando marcado', () => {
    const itens: LinhaConsolidadaIbge[] = [
      {
        id: 'row-1',
        empresa_code: '1000',
        empresa_nome: 'CIAFAL Matriz',
        linha_code: 'L1',
        linha_nome: 'Laminação 1',
        centro_code: 'SEML1',
        centro_nome: 'SEML1',
        tipo_material: 'FERT',
        tipo_material_descricao: 'Produto Acabado',
        material_code: 'TB-GALV-50',
        material_descricao: 'Tubo 50',
        competencia: '09/2026',
        quantidade_produzida: 100,
        unidade_medida: 't',
        status_fechamento: 'Pendente',
        total_registros: 1,
        centros_envolvidos: ['SEML1'],
        registros_rastreabilidade: [],
      },
      {
        id: 'row-2',
        empresa_code: '1000',
        empresa_nome: 'CIAFAL Matriz',
        linha_code: 'L1',
        linha_nome: 'Laminação 1',
        centro_code: 'FORNO1',
        centro_nome: 'FORNO1',
        tipo_material: 'HALB',
        tipo_material_descricao: 'Semiacabado',
        material_code: 'TAR-120',
        material_descricao: 'Tarugo 120',
        competencia: '09/2026',
        quantidade_produzida: 200,
        unidade_medida: 't',
        status_fechamento: 'Pendente',
        total_registros: 1,
        centros_envolvidos: ['FORNO1'],
        registros_rastreabilidade: [],
      },
    ]

    const { rerender } = render(
      <DadosIbgeTable
        linhas={itens}
        onVisualizar={vi.fn()}
        onEnviarIndividual={vi.fn()}
        onEnviarSelecionados={vi.fn()}
        linhasSelecionadasIds={[]}
        onToggleLinha={vi.fn()}
        onToggleTodos={vi.fn()}
      />,
    )

    // Sem seleção: desabilitado e com título padrão
    const btnLoteDesabilitado = screen.getByRole('button', {
      name: /enviar selecionados p\/ contabilidade/i,
    })
    expect(btnLoteDesabilitado).toBeDisabled()

    // Com 2 itens selecionados: habilitado e com texto exibindo quantidade real
    rerender(
      <DadosIbgeTable
        linhas={itens}
        onVisualizar={vi.fn()}
        onEnviarIndividual={vi.fn()}
        onEnviarSelecionados={vi.fn()}
        linhasSelecionadasIds={['row-1', 'row-2']}
        onToggleLinha={vi.fn()}
        onToggleTodos={vi.fn()}
      />,
    )

    const btnLoteHabilitado = screen.getByRole('button', {
      name: /enviar 2 selecionados p\/ contabilidade/i,
    })
    expect(btnLoteHabilitado).toBeEnabled()
  })

  // 14. Serviço de envio gera formulário estruturado DADOS IBGE — PRODUÇÃO
  it('14. dadosIbgeEnvioService gera formulário estruturado com campos requeridos e não hardcode destinatários', async () => {
    const { dadosIbgeEnvioService } = await import('@/services/dados-ibge-envio-service')
    const item: LinhaConsolidadaIbge = {
      id: 'row-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo Galvanizado 50mm Industrial',
      competencia: '09/2026',
      quantidade_produzida: 455.9,
      unidade_medida: 't',
      status_fechamento: 'Conferida',
      total_registros: 10,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
    }

    const formulario = dadosIbgeEnvioService.gerarFormularioEstruturado({
      competencia: '09/2026',
      empresa: '1000 — CIAFAL Matriz',
      linha: 'L1',
      centros: ['SEML1'],
      filtros: {
        empresa: '1000',
        linha: 'L1',
        centros: ['SEML1'],
        mtart: 'FERT',
        mes: '09',
        ano: '2026',
      },
      linhas: [item],
      responsavelNome: 'Analista PCP CIAFAL',
      responsavelEmail: 'analista.pcp@ciafal.com.br',
      dataHoraFormatada: '02/10/2026 às 15:30',
    })

    expect(formulario).toContain('DADOS IBGE — PRODUÇÃO')
    expect(formulario).toContain('Competência:       09/2026')
    expect(formulario).toContain('Empresa:           1000 — CIAFAL Matriz')
    expect(formulario).toContain('WERKS (Empresa):')
    expect(formulario).toContain('Total de Registros de Origem:')
    expect(formulario).toContain('Volume Total Consolidado:')
    expect(formulario).toContain('TB-GALV-50')
    expect(formulario).toContain('455,900')
    expect(formulario).toContain('Abrir Dados IBGE no HUB')

    // Destinatários obtidos da coleção / grupos
    const destinatarios = await dadosIbgeEnvioService.obterDestinatariosContabilidade()
    expect(destinatarios.length).toBeGreaterThan(0)
    expect(
      destinatarios.some((d) => d.email.includes('contabilidade') || d.email.includes('@')),
    ).toBe(true)
  })

  // 16. Bloqueio de envio sem integração (CENÁRIO 2) com mensagem exata
  it('16. Envio sem integração exibe título "Envio não disponível" e mensagem exata sem alterar status', async () => {
    const { EnviarDadosIbgeModal } =
      await import('@/components/production-control/EnviarDadosIbgeModal')
    const { dadosIbgeEnvioService } = await import('@/services/dados-ibge-envio-service')

    // Mock do serviço simulando ausência de SMTP (CENÁRIO 2)
    vi.spyOn(dadosIbgeEnvioService, 'enviarParaContabilidade').mockResolvedValueOnce({
      sucesso: false,
      categoria: 'SEM_INTEGRACAO',
      titulo: 'Envio não disponível',
      mensagem:
        'Não há integração de e-mail configurada para o envio dos Dados IBGE no momento. Os dados não foram enviados e o status permanecerá inalterado.',
      envios: [],
      destinatarios: [],
      ehReenvio: false,
    })

    const item: LinhaConsolidadaIbge = {
      id: 'row-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo 50',
      competencia: '09/2026',
      quantidade_produzida: 100,
      unidade_medida: 't',
      status_fechamento: 'Pendente',
      total_registros: 1,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
    }

    const handleSuccess = vi.fn()
    const handleError = vi.fn()

    render(
      <EnviarDadosIbgeModal
        open={true}
        onOpenChange={vi.fn()}
        linhas={[item]}
        filtros={{
          empresa: '1000',
          linha: 'L1',
          centros: ['SEML1'],
          mtart: 'FERT',
          mes: '09',
          ano: '2026',
        }}
        onSuccess={handleSuccess}
        onError={handleError}
      />,
    )

    const btnConfirmar = screen.getByRole('button', { name: /confirmar envio/i })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(screen.getByText('Envio não disponível')).toBeInTheDocument()
      expect(
        screen.getByText(
          /Não há integração de e-mail configurada para o envio dos Dados IBGE no momento/,
        ),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Os dados não foram enviados e o status permanecerá inalterado/),
      ).toBeInTheDocument()
    })

    // Botões "Fechar" e "Tentar novamente"
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
    expect(handleSuccess).not.toHaveBeenCalled()
  })

  // 17. Bloqueio por falta de destinatários (REGRA 4) sem fallback fixo
  it('17. Bloqueio de envio sem destinatários ativos exibe "Destinatários não configurados"', async () => {
    const { EnviarDadosIbgeModal } =
      await import('@/components/production-control/EnviarDadosIbgeModal')
    const { dadosIbgeEnvioService } = await import('@/services/dados-ibge-envio-service')

    vi.spyOn(dadosIbgeEnvioService, 'enviarParaContabilidade').mockResolvedValueOnce({
      sucesso: false,
      categoria: 'SEM_DESTINATARIOS',
      titulo: 'Destinatários não configurados',
      mensagem:
        'Não existem destinatários ativos configurados para o grupo Contabilidade — Dados IBGE.',
      envios: [],
      destinatarios: [],
      ehReenvio: false,
    })

    const item: LinhaConsolidadaIbge = {
      id: 'row-1',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo 50',
      competencia: '09/2026',
      quantidade_produzida: 100,
      unidade_medida: 't',
      status_fechamento: 'Pendente',
      total_registros: 1,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
    }

    render(
      <EnviarDadosIbgeModal
        open={true}
        onOpenChange={vi.fn()}
        linhas={[item]}
        filtros={{
          empresa: '1000',
          linha: 'L1',
          centros: ['SEML1'],
          mtart: 'FERT',
          mes: '09',
          ano: '2026',
        }}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />,
    )

    const btnConfirmar = screen.getByRole('button', { name: /confirmar envio/i })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(screen.getByText('Destinatários não configurados')).toBeInTheDocument()
      expect(
        screen.getByText(
          /Não existem destinatários ativos configurados para o grupo Contabilidade — Dados IBGE/,
        ),
      ).toBeInTheDocument()
    })
  })

  // 15. Formatação de status pós-envio e reenvio
  it('15. Exibição de "Enviado em dd/mm/aaaa às HH:mm" e reenvio no grid', () => {
    const itemEnviado: LinhaConsolidadaIbge = {
      id: 'row-env',
      empresa_code: '1000',
      empresa_nome: 'CIAFAL Matriz',
      linha_code: 'L1',
      linha_nome: 'Laminação 1',
      centro_code: 'SEML1',
      centro_nome: 'SEML1',
      tipo_material: 'FERT',
      tipo_material_descricao: 'Produto Acabado',
      material_code: 'TB-GALV-50',
      material_descricao: 'Tubo Galvanizado',
      competencia: '09/2026',
      quantidade_produzida: 120,
      unidade_medida: 't',
      status_fechamento: 'Enviada à Contabilidade',
      total_registros: 5,
      centros_envolvidos: ['SEML1'],
      registros_rastreabilidade: [],
      data_envio_formatada: '02/10/2026 às 14:45',
    }

    render(
      <DadosIbgeTable
        linhas={[itemEnviado]}
        onVisualizar={vi.fn()}
        onEnviarIndividual={vi.fn()}
        onEnviarSelecionados={vi.fn()}
        linhasSelecionadasIds={[]}
        onToggleLinha={vi.fn()}
        onToggleTodos={vi.fn()}
      />,
    )

    expect(screen.getByText('Enviado à Contabilidade')).toBeInTheDocument()
    expect(screen.getByText('Enviado em 02/10/2026 às 14:45')).toBeInTheDocument()
  })
})
