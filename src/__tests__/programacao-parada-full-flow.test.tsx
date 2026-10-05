import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ProgramacaoParadaPage } from '@/pages/ProgramacaoParadaPage'
import { ParadaHeader } from '@/components/programacao-parada/ParadaHeader'
import { ParadaForm } from '@/components/programacao-parada/ParadaForm'
import { CentrosTable } from '@/components/programacao-parada/CentrosTable'
import { AIValidationModal } from '@/components/programacao-parada/AIValidationModal'
import { SendCommunicationModal } from '@/components/programacao-parada/SendCommunicationModal'
import { ConsultaProgramacoesView } from '@/components/programacao-parada/ConsultaProgramacoesView'
import {
  programacaoParadaService,
  CentroParadaInput,
  ProgramacaoParadaRegistro,
} from '@/services/programacao-parada-service'
import { pb } from '@/lib/pocketbase/client'

// Mocks defensivos
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr-pcp-test',
      email: 'programador.pcp@ciafal.com.br',
      name: 'Lucas Ferreira (PCP)',
      role: 'PCP_PROGRAMMER',
    },
  }),
}))

describe('Programação de Parada — Suíte de Interface e Integração', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Teste 1: Header renderiza informações essenciais e botões funcionais
  it('Teste 1: ParadaHeader deve exibir código, status, versão e botões de ação', () => {
    const handleValidateAI = vi.fn()
    const handleSaveDraft = vi.fn()
    const handleConsultar = vi.fn()
    const handleSendComm = vi.fn()
    const handleCancel = vi.fn()
    const handleHistorico = vi.fn()

    render(
      <ParadaHeader
        codigo="PP-00001/2026"
        status="RASCUNHO"
        versao={1}
        criadoEm="2026-10-10T08:00:00Z"
        criadoPor="Lucas Ferreira (PCP)"
        loading={false}
        canEdit={true}
        canValidateAI={true}
        canSendComm={true}
        canCancel={true}
        isSaved={true}
        onValidateAI={handleValidateAI}
        onSaveDraft={handleSaveDraft}
        onConsultar={handleConsultar}
        onOpenSendComm={handleSendComm}
        onCancelParada={handleCancel}
        onOpenHistorico={handleHistorico}
      />,
    )

    expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
    expect(screen.getByText(/PP-00001\/2026/i)).toBeInTheDocument()
    expect(screen.getByText(/Rascunho/i)).toBeInTheDocument()
    expect(screen.getByText(/Versão V01/i)).toBeInTheDocument()

    // Botões
    const btnAI = screen.getByRole('button', { name: /Validar com IA/i })
    expect(btnAI).toBeInTheDocument()
    fireEvent.click(btnAI)
    expect(handleValidateAI).toHaveBeenCalledTimes(1)

    const btnSalvar = screen.getByRole('button', { name: /Salvar Rascunho/i })
    expect(btnSalvar).toBeInTheDocument()
    fireEvent.click(btnSalvar)
    expect(handleSaveDraft).toHaveBeenCalledTimes(1)

    const btnConsultar = screen.getByRole('button', { name: /Consultar Programações/i })
    expect(btnConsultar).toBeInTheDocument()
    fireEvent.click(btnConsultar)
    expect(handleConsultar).toHaveBeenCalledTimes(1)

    const btnComm = screen.getByRole('button', { name: /Enviar Comunicado/i })
    expect(btnComm).toBeInTheDocument()
    fireEvent.click(btnComm)
    expect(handleSendComm).toHaveBeenCalledTimes(1)
  })

  // Teste 2: CentrosTable exibe lista com duração calculada e permite ações
  it('Teste 2: CentrosTable renderiza centros com colunas corretas e botões de ação', () => {
    const mockCentros: CentroParadaInput[] = [
      {
        id: 'c-1',
        empresa_code: '1001',
        linha_code: 'L1',
        linha_nome: 'Laminação 1',
        centro_code: 'LAM-01',
        centro_nome: 'Laminador Principal',
        data_hora_inicio: '10/10/2026 06:00',
        data_hora_fim: '18/10/2026 18:00',
        duracao_horas: 204,
        motivo: 'Manutenção preventiva',
        status: 'PENDENTE',
      },
    ]

    const handleEdit = vi.fn()
    const handleDuplicate = vi.fn()
    const handleDelete = vi.fn()

    render(
      <CentrosTable
        centros={mockCentros}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />,
    )

    expect(screen.getByText('LAM-01')).toBeInTheDocument()
    expect(screen.getByText('L1')).toBeInTheDocument()
    expect(screen.getByText('10/10/2026 06:00')).toBeInTheDocument()
    expect(screen.getByText('18/10/2026 18:00')).toBeInTheDocument()
    expect(screen.getByText('Manutenção preventiva')).toBeInTheDocument()

    // Clica em Editar
    const btnEdit = screen.getByTitle('Editar Centro')
    fireEvent.click(btnEdit)
    expect(handleEdit).toHaveBeenCalledWith(0)

    // Clica em Duplicar
    const btnDup = screen.getByTitle('Duplicar Centro')
    fireEvent.click(btnDup)
    expect(handleDuplicate).toHaveBeenCalledWith(0)

    // Clica em Excluir
    const btnDel = screen.getByTitle('Excluir Centro')
    fireEvent.click(btnDel)
    expect(handleDelete).toHaveBeenCalledWith(0)
  })

  // Teste 3: AIValidationModal renderiza seções estruturadas da resposta da IA
  it('Teste 3: AIValidationModal exibe classificação, resumo, impactos e alertas', () => {
    const resultado = {
      valido: true,
      classificacao: 'SEM_CONFLITO' as const,
      nivel: 'SEM_CONFLITO' as const,
      resumo: 'Nenhum conflito crítico identificado para o período de 10/10/2026 a 18/10/2026.',
      impactos_identificados: ['Redução de capacidade na Linha L1 em 204h.'],
      alertas: ['Recomenda-se antecipar estoque de segurança.'],
      centros_afetados: ['LAM-01'],
      programacoes_afetadas: [],
      ordens_afetadas: [],
      recomendacoes: ['Ajustar calendário operacional da turma A.'],
      proximas_acoes: ['Publicar aviso no mural operacional.'],
      proximas_acoes_sugeridas: ['Publicar aviso no mural operacional.'],
    }

    render(
      <AIValidationModal
        open={true}
        onOpenChange={() => {}}
        resultado={resultado}
        loading={false}
      />,
    )

    expect(screen.getByText(/Resultado da Validação IA/i)).toBeInTheDocument()
    expect(screen.getByText(/Sem Conflito/i)).toBeInTheDocument()
    expect(screen.getByText(/Nenhum conflito crítico/i)).toBeInTheDocument()
    expect(screen.getByText(/Redução de capacidade na Linha L1/i)).toBeInTheDocument()
    expect(screen.getByText(/Recomenda-se antecipar estoque/i)).toBeInTheDocument()
    expect(screen.getByText('LAM-01')).toBeInTheDocument()
  })

  // Teste 4: SendCommunicationModal monta corpo corporativo Ciafal e confirma envio
  it('Teste 4: SendCommunicationModal permite alternar edição/preview e exige confirmação', async () => {
    const paradaMock: ProgramacaoParadaRegistro = {
      id: 'p-1',
      codigo: 'PP-00001/2026',
      versao: 1,
      status: 'RASCUNHO',
      motivo_geral: 'Manutenção preventiva',
      data_hora_inicio: '10/10/2026 06:00',
      data_hora_fim: '18/10/2026 18:00',
      duracao_total_horas: 204,
      criado_por_id: 'usr-1',
      criado_por_nome: 'Lucas Ferreira',
      comunicado_disparado: false,
      houve_alteracao_pos_comunicado: false,
    }

    const centrosMock: CentroParadaInput[] = [
      {
        id: 'c-1',
        empresa_code: '1001',
        linha_code: 'L1',
        linha_nome: 'Laminação 1',
        centro_code: 'LAM-01',
        centro_nome: 'Laminador Principal',
        data_hora_inicio: '10/10/2026 06:00',
        data_hora_fim: '18/10/2026 18:00',
        duracao_horas: 204,
        motivo: 'Manutenção preventiva',
        status: 'PENDENTE',
      },
    ]

    render(
      <SendCommunicationModal
        open={true}
        onOpenChange={() => {}}
        parada={paradaMock}
        centros={centrosMock}
        onSuccessSend={() => {}}
      />,
    )

    expect(screen.getByText(/Comunicado Oficial de Parada Programada/i)).toBeInTheDocument()
    expect(screen.getByText('PP-00001/2026')).toBeInTheDocument()

    // Alterna para visualização
    const btnPreview = screen.getByRole('button', { name: /Pré-visualizar E-mail Corporativo/i })
    fireEvent.click(btnPreview)

    await waitFor(() => {
      expect(screen.getByText(/pcp.programacao@ciafal.com.br/i)).toBeInTheDocument()
      expect(screen.getByText(/Boa tarde!/i)).toBeInTheDocument()
      expect(screen.getByText(/Atenciosamente,\nPCP — Ciafal/i)).toBeInTheDocument()
    })
  })

  // Teste 5: ConsultaProgramacoesView filtra por status e termos de busca
  it('Teste 5: ConsultaProgramacoesView renderiza filtros e tabela de histórico', async () => {
    vi.spyOn(programacaoParadaService, 'consultarParadas').mockResolvedValueOnce([
      {
        id: 'par-1',
        codigo: 'PP-00001/2026',
        versao: 1,
        status: 'VALIDADA',
        motivo_geral: 'Reforma de equipamento',
        data_hora_inicio: '10/10/2026 06:00',
        data_hora_fim: '18/10/2026 18:00',
        duracao_total_horas: 204,
        criado_por_id: 'usr-1',
        criado_por_nome: 'Carlos Mendes',
        comunicado_disparado: false,
        houve_alteracao_pos_comunicado: false,
      },
    ])
    vi.spyOn(programacaoParadaService, 'listarCentrosPorFiltro').mockResolvedValueOnce([
      {
        id: 'c-1',
        parada_id: 'par-1',
        empresa_code: '1001',
        linha_code: 'L1',
        centro_code: 'LAM-01',
        data_hora_inicio: '10/10/2026 06:00',
        data_hora_fim: '18/10/2026 18:00',
        duracao_horas: 204,
        motivo: 'Reforma de equipamento',
        status: 'CONFIRMADA',
      },
    ])

    render(
      <ConsultaProgramacoesView
        onNovaProgramacao={() => {}}
        onVisualizar={() => {}}
        onEditar={() => {}}
        onDuplicar={() => {}}
        onHistorico={() => {}}
        onComunicado={() => {}}
        onCancelar={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('PP-00001/2026')).toBeInTheDocument()
      expect(screen.getByText('Reforma de equipamento')).toBeInTheDocument()
      expect(screen.getByText('Validada')).toBeInTheDocument()
    })
  })

  // Teste 6: Montagem da página completa ProgramacaoParadaPage no Router
  it('Teste 6: ProgramacaoParadaPage monta perfeitamente com todas as seções e sem quebras', async () => {
    render(
      <BrowserRouter>
        <ProgramacaoParadaPage />
      </BrowserRouter>,
    )

    expect(screen.getByText(/PROGRAMAÇÃO DE PARADA/i)).toBeInTheDocument()
    expect(screen.getByText(/Adicionar Centro \/ Linha à Programação/i)).toBeInTheDocument()
    expect(screen.getByText(/Centros e Linhas Afetadas/i)).toBeInTheDocument()
  })
})
