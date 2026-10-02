import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AtividadeMestreModal } from '@/components/production-control/AtividadeMestreModal'
import { checklistFechamentoService } from '@/services/checklist-fechamento-service'
import { pb } from '@/lib/pocketbase/client'

// Mocks dos serviços de parâmetros SAP e linhas
vi.mock('@/services/sap-parameters-master-data-service', () => ({
  sapParametersMasterDataService: {
    fetchCompanies: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
        { werks: '2000', name: 'Filial Contagem', label: '2000 — Filial Contagem' },
      ],
    }),
  },
}))

vi.mock('@/services/line-master', () => ({
  lineMasterService: {
    listLines: vi.fn().mockResolvedValue([
      {
        id: 'line-l1-id',
        code: 'L1',
        name: 'Laminação 1',
        sap_plant_code: '1000',
        sap_work_center: 'WC-L1',
      },
      {
        id: 'line-l2-id',
        code: 'L2',
        name: 'Laminação 2',
        sap_plant_code: '1000',
        sap_work_center: 'WC-L2',
      },
    ]),
  },
}))

describe('AtividadeMestreModal — Popup + Nova Atividade', () => {
  const onSaveMock = vi.fn().mockResolvedValue({})
  const onCloseMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Renderiza o título "Cadastrar Nova Atividade" (sem a palavra "Mestre")', async () => {
    render(
      <AtividadeMestreModal open={true} onClose={onCloseMock} modelo={null} onSave={onSaveMock} />,
    )

    expect(screen.getByText('Cadastrar Nova Atividade')).toBeInTheDocument()
    expect(screen.queryByText(/Cadastrar Nova Atividade Mestre/i)).not.toBeInTheDocument()
    expect(screen.getByText('Salvar Atividade')).toBeInTheDocument()
    expect(screen.getByText('Local de Aplicação')).toBeInTheDocument()
  })

  it('2. Modo Edição exibe "Editar Atividade" (sem "Mestre")', async () => {
    render(
      <AtividadeMestreModal
        open={true}
        onClose={onCloseMock}
        modelo={{
          id: 'mod-1',
          codigo: '1.26',
          sequencia: 26,
          titulo: 'Atividade de Teste',
          descricao_detalhada: 'Descrição teste',
          categoria: 'Processamento SAP',
          linha_centro_relacionado: 'L1 / WC-L1',
          empresa: '1000',
          werks: '1000',
          line_id: 'line-l1-id',
          line_code: 'L1',
          line_name: 'Laminação 1',
          center_id: 'c1',
          center_code: 'WC-L1',
          center_name: 'Centro L1',
          transacao_sap: 'MB52',
          deposito_sap: 'DP06',
          frequencia: 'somente_fechamento',
          obrigatoria: true,
          responsavel_padrao: 'PCP',
          area_responsavel: 'PCP',
          prazo_relativo_fechamento: '2º dia útil',
          manual_documento_referencia: 'IT-01',
          regra_validacao: 'Regra OK',
          campo_observacao: '',
          permite_evidencia: true,
          ativa: true,
          data_inicio_vigencia: '2026-09-01',
          fonte_dados: 'Manual',
          status_regra: 'Oficial',
        }}
        onSave={onSaveMock}
      />,
    )

    expect(screen.getByText('Editar Atividade')).toBeInTheDocument()
    expect(screen.queryByText(/Editar Atividade Mestre/i)).not.toBeInTheDocument()
  })

  it('3. Linha fica desabilitada e exibe "Selecione primeiro a Empresa." quando nenhuma empresa está selecionada', async () => {
    render(
      <AtividadeMestreModal open={true} onClose={onCloseMock} modelo={null} onSave={onSaveMock} />,
    )

    await waitFor(() => {
      expect(screen.getByText('1000 — CIAFAL Matriz')).toBeInTheDocument()
    })

    const lineSelect = screen.getByDisplayValue(
      'Selecione primeiro a Empresa.',
    ) as HTMLSelectElement
    expect(lineSelect).toBeDisabled()
  })

  it('4. Validação obrigatória destaca Empresa, Linha, Centro, Código e Título quando vazios', async () => {
    render(
      <AtividadeMestreModal open={true} onClose={onCloseMock} modelo={null} onSave={onSaveMock} />,
    )

    const salvarBtn = screen.getByText('Salvar Atividade')
    fireEvent.click(salvarBtn)

    await waitFor(() => {
      expect(
        screen.getByText('Selecione a Empresa (WERKS) onde esta atividade será aplicada.'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Selecione a Linha onde esta atividade será aplicada.'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Selecione o Centro onde esta atividade será aplicada.'),
      ).toBeInTheDocument()
      expect(
        screen.getByText('Informe o código identificador da atividade (ex: 1.27).'),
      ).toBeInTheDocument()
      expect(screen.getByText('Informe o título oficial da atividade.')).toBeInTheDocument()
    })

    expect(onSaveMock).not.toHaveBeenCalled()
  })

  it('5. Salvar modelo persiste campos estruturados werks, line_id, line_code, center_id, center_code e auditoria', async () => {
    const createSpy = vi
      .spyOn(pb.collection('checklist_fechamento_modelos'), 'create')
      .mockResolvedValue({
        id: 'novo-modelo-1',
        codigo: '1.27',
        titulo: 'Atividade Estruturada',
        werks: '1000',
        line_code: 'L1',
        center_code: 'WC-L1',
      } as any)

    const auditSpy = vi.spyOn(pb.collection('pcp_audit_logs'), 'create').mockResolvedValue({
      id: 'aud-1',
    } as any)

    const resultado = await checklistFechamentoService.salvarModelo({
      codigo: '1.27',
      titulo: 'Atividade Estruturada',
      werks: '1000',
      line_id: 'line-l1-id',
      line_code: 'L1',
      line_name: 'Laminação 1',
      center_id: 'c1',
      center_code: 'WC-L1',
      center_name: 'Centro L1',
      obrigatoria: true,
      ativa: true,
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: '1.27',
        titulo: 'Atividade Estruturada',
        werks: '1000',
        line_id: 'line-l1-id',
        line_code: 'L1',
        center_code: 'WC-L1',
        linha_centro_relacionado: 'Laminação 1 / Centro L1',
      }),
    )

    expect(auditSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CRIAR_ATIVIDADE',
        resource: 'CHECKLIST_FECHAMENTO',
      }),
    )

    expect(resultado.id).toBe('novo-modelo-1')
  })
})
