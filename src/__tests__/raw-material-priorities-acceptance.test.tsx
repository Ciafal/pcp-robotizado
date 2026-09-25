import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { RawMaterialPriorityModal } from '@/components/line-master/RawMaterialPriorityModal'
import { RawMaterialPrioritiesPanel } from '@/components/line-master/RawMaterialPrioritiesPanel'
import { RawMaterialPriorityConflictModal } from '@/components/line-master/RawMaterialPriorityConflictModal'
import { LineRawMaterialPriority } from '@/types/line-master'

// Mock de serviços dependentes
vi.mock('@/services/sap-matkl-service', () => ({
  sapMatklService: {
    searchMatklGroups: vi.fn().mockResolvedValue({
      items: [
        { matkl: '030', description: 'Bobinas e Tiras BQ' },
        { matkl: '012', description: 'Tarugos e Palanquilhas' },
      ],
      total: 2,
    }),
  },
}))

describe('Prioridades de Matéria-Prima — 13 Critérios de Aceite', () => {
  const mockRawMaterials: LineRawMaterialPriority[] = [
    {
      id: 'rmp_1',
      line_id: 'line_l1',
      line_master_id: 'master_1',
      material_code: 'BOB_CSN_BQ_1012',
      material_description: 'Bobina Laminada a Quente SAE 1012',
      bitola: '12,70 mm',
      material_group: 'Bobinas BQ',
      priority_order: 1,
      valid_from: '2026-10-01',
      valid_until: '2026-10-31',
      criterio_prioridade: 'Rotativa',
      active: true,
      source_mode: 'MANUAL',
    },
    {
      id: 'rmp_2',
      line_id: 'line_l1',
      line_master_id: 'master_1',
      material_code: 'BOB_GERDAU_1020',
      material_description: 'Bobina Gerdau SAE 1020',
      bitola: '9,50 mm',
      material_group: 'Bobinas BQ',
      priority_order: 2,
      valid_from: '2026-10-01',
      valid_until: null,
      criterio_prioridade: 'Cíclica',
      active: true,
      source_mode: 'MANUAL',
    },
    {
      id: 'rmp_3',
      line_id: 'line_l1',
      line_master_id: 'master_1',
      material_code: 'BOB_USIMINAS_1045',
      material_description: 'Bobina Usiminas SAE 1045',
      bitola: '6,35 mm',
      material_group: 'Bobinas BQ',
      priority_order: 3,
      valid_from: '2026-10-01',
      valid_until: null,
      criterio_prioridade: 'Fixa',
      active: false,
      source_mode: 'MANUAL',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // CRITÉRIO 1: Campo "Origem do Cadastro" NÃO existe nem no popup nem na tabela
  it('Critério 1: Campo "Origem do Cadastro" não existe no modal nem coluna na tabela principal', () => {
    const { queryByText: queryByTextModal } = render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={() => {}}
        onSubmit={async () => {}}
      />,
    )
    expect(queryByTextModal('Origem do Cadastro')).toBeNull()
    expect(queryByTextModal('Fonte')).toBeNull()

    const { queryByText: queryByTextTable } = render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={() => {}}
        onEditClick={() => {}}
      />,
    )
    expect(queryByTextTable('Origem do Cadastro')).toBeNull()
    expect(queryByTextTable('Origem / Fornecedor')).toBeNull()
    expect(queryByTextTable('Fonte')).toBeNull()
    // A coluna Bitola e Grupo Mercadorias estão presentes
    expect(screen.getByText('Bitola')).toBeTruthy()
    expect(screen.getByText('Grupo Mercadorias')).toBeTruthy()
  })

  // CRITÉRIO 2: Cadastro normal cria formulário com campos obrigatórios e formato de data dd/mm/aaaa
  it('Critério 2: Validação de cadastro e envio com dados preenchidos', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={() => {}}
        onSubmit={handleSubmit}
      />,
    )

    // Título correto
    expect(screen.getByText('Cadastrar Prioridade de Matéria-Prima')).toBeTruthy()

    const codeInput = screen.getByTestId('input-raw-material-code')
    const descInput = screen.getByTestId('input-raw-material-desc')
    const bitolaInput = screen.getByTestId('input-raw-material-bitola')
    const prioInput = screen.getByTestId('input-raw-material-priority')
    const validFromInput = screen.getByTestId('input-raw-material-valid-from')
    const validUntilInput = screen.getByTestId('input-raw-material-valid-until')
    const saveBtn = screen.getByTestId('modal-save-btn')

    fireEvent.change(codeInput, { target: { value: 'BOB_NOVA_01' } })
    fireEvent.change(descInput, { target: { value: 'Nova Bobina Teste' } })
    fireEvent.change(bitolaInput, { target: { value: '12,70 mm' } })
    fireEvent.change(prioInput, { target: { value: '1' } })
    fireEvent.change(validFromInput, { target: { value: '01/10/2026' } })
    fireEvent.change(validUntilInput, { target: { value: '31/10/2026' } })

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
      const payload = handleSubmit.mock.calls[0][0]
      expect(payload.material_code).toBe('BOB_NOVA_01')
      expect(payload.priority_order).toBe(1)
      expect(payload.bitola).toBe('12,70 mm')
      expect(payload.valid_from).toBe('2026-10-01')
      expect(payload.valid_until).toBe('2026-10-31')
      expect(payload.idempotency_key).toBeDefined()
    })
  })

  // CRITÉRIO 3: Front-end de proteção contra duplo salvamento (botão desabilitado com "Salvando...")
  it('Critério 3: Proteção contra duplo clique e múltiplos submits durante salvamento', () => {
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        isSubmitting={true}
        onClose={() => {}}
        onSubmit={async () => {}}
      />,
    )

    const saveBtn = screen.getByTestId('modal-save-btn')
    expect(saveBtn).toBeDisabled()
    expect(screen.getByText('Salvando...')).toBeTruthy()
  })

  // CRITÉRIO 4 e 6: Modal de Conflito de Prioridade com mensagem e tabela de impacto
  it('Critério 4 e 6: Conflito de prioridade exibe mensagem clara e tabela de impacto da reorganização', () => {
    const handleReorganize = vi.fn()
    const handleCancel = vi.fn()
    const impactList = [
      {
        material_code: 'BOB_NOVA_01',
        material_description: 'Nova Bobina',
        current_priority: null,
        new_priority: 1,
        is_target: true,
      },
      {
        material_code: 'BOB_CSN_BQ_1012',
        material_description: 'Bobina CSN',
        current_priority: 1,
        new_priority: 2,
        is_target: false,
      },
      {
        material_code: 'BOB_GERDAU_1020',
        material_description: 'Bobina Gerdau',
        current_priority: 2,
        new_priority: 3,
        is_target: false,
      },
    ]

    render(
      <RawMaterialPriorityConflictModal
        open={true}
        isEditing={false}
        targetPriority={1}
        targetMaterialCode="BOB_NOVA_01"
        impactList={impactList}
        onCancel={handleCancel}
        onConfirmReorganize={handleReorganize}
      />,
    )

    // Mensagem de conflito
    expect(
      screen.getByText(/Já existe uma matéria-prima cadastrada como prioridade #1/i),
    ).toBeTruthy()
    // Itens na tabela de impacto
    expect(screen.getByText('BOB_NOVA_01')).toBeTruthy()
    expect(screen.getByText('BOB_CSN_BQ_1012')).toBeTruthy()
    expect(screen.getByText('BOB_GERDAU_1020')).toBeTruthy()

    // Botões
    const cancelBtn = screen.getByTestId('conflict-cancel-btn')
    const confirmBtn = screen.getByTestId('conflict-confirm-reorganize-btn')

    fireEvent.click(confirmBtn)
    expect(handleReorganize).toHaveBeenCalledTimes(1)

    fireEvent.click(cancelBtn)
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  // CRITÉRIO 7: Popup de edição com título "Editar Prioridade de Matéria-Prima" e botão "Salvar Alterações"
  it('Critério 7: Popup de edição abre com campos preenchidos, título e botão Salvar Alterações', () => {
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        initialData={mockRawMaterials[0]}
        onClose={() => {}}
        onSubmit={async () => {}}
      />,
    )

    expect(screen.getByText('Editar Prioridade de Matéria-Prima')).toBeTruthy()
    expect(screen.getByText('Salvar Alterações')).toBeTruthy()

    const codeInput = screen.getByTestId('input-raw-material-code') as HTMLInputElement
    expect(codeInput.value).toBe('BOB_CSN_BQ_1012')
    const bitolaInput = screen.getByTestId('input-raw-material-bitola') as HTMLInputElement
    expect(bitolaInput.value).toBe('12,70 mm')
  })

  // CRITÉRIO 8: Edição de prioridade com reorganização (mensagem específica de edição)
  it('Critério 8: Conflito na edição exibe mensagem de reorganização específica', () => {
    render(
      <RawMaterialPriorityConflictModal
        open={true}
        isEditing={true}
        targetPriority={2}
        targetMaterialCode="BOB_USIMINAS_1045"
        impactList={[]}
        onCancel={() => {}}
        onConfirmReorganize={() => {}}
      />,
    )

    expect(
      screen.getByText(
        'Alterar esta matéria-prima para prioridade #2 exige reorganizar a hierarquia atual. Deseja continuar?',
      ),
    ).toBeTruthy()
  })

  // CRITÉRIO 9 e 8 (tabela): Exibição de colunas corretas, formato vigência e status Ativo/Inativo
  it('Critério 8 e 9: Tabela com ordenação por prioridade, vigência dd/mm/aaaa → dd/mm/aaaa e badges de status', () => {
    const handleEdit = vi.fn()
    const handleToggle = vi.fn()

    render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={() => {}}
        onEditClick={handleEdit}
        onToggleStatusClick={handleToggle}
      />,
    )

    // Vigência no padrão 01/10/2026 → 31/10/2026
    expect(screen.getByText('01/10/2026 → 31/10/2026')).toBeTruthy()
    // Vigência com término aberto
    expect(screen.getByText('01/10/2026 → Indeterminado')).toBeTruthy()

    // Badges Ativo / Inativo
    expect(screen.getByTestId('badge-status-active-rmp_1')).toBeTruthy()
    expect(screen.getByTestId('badge-status-inactive-rmp_3')).toBeTruthy()

    // Botão de editar
    const editBtn = screen.getByTestId('btn-edit-raw-material-BOB_CSN_BQ_1012')
    fireEvent.click(editBtn)
    expect(handleEdit).toHaveBeenCalledWith(mockRawMaterials[0])
  })

  // CRITÉRIO 11: Validação de data fim < data início bloqueia com mensagem exata
  it('Critério 11: Data fim < Data início exibe erro "A data fim deve ser igual ou posterior à data de início."', async () => {
    const handleSubmit = vi.fn()
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={() => {}}
        onSubmit={handleSubmit}
      />,
    )

    const codeInput = screen.getByTestId('input-raw-material-code')
    const descInput = screen.getByTestId('input-raw-material-desc')
    const validFromInput = screen.getByTestId('input-raw-material-valid-from')
    const validUntilInput = screen.getByTestId('input-raw-material-valid-until')
    const saveBtn = screen.getByTestId('modal-save-btn')

    fireEvent.change(codeInput, { target: { value: 'BOB_TESTE' } })
    fireEvent.change(descInput, { target: { value: 'Teste Desc' } })
    fireEvent.change(validFromInput, { target: { value: '15/10/2026' } })
    fireEvent.change(validUntilInput, { target: { value: '10/10/2026' } })

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(
        screen.getByText('A data fim deve ser igual ou posterior à data de início.'),
      ).toBeTruthy()
      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })

  // CRITÉRIO: Ordem de prioridade mínima 1 (não aceita 0 nem negativo)
  it('Validação: Ordem de prioridade menor que 1 exibe mensagem objetiva', async () => {
    const handleSubmit = vi.fn()
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={() => {}}
        onSubmit={handleSubmit}
      />,
    )

    const codeInput = screen.getByTestId('input-raw-material-code')
    const descInput = screen.getByTestId('input-raw-material-desc')
    const prioInput = screen.getByTestId('input-raw-material-priority')
    const saveBtn = screen.getByTestId('modal-save-btn')

    fireEvent.change(codeInput, { target: { value: 'BOB_TESTE' } })
    fireEvent.change(descInput, { target: { value: 'Teste Desc' } })
    fireEvent.change(prioInput, { target: { value: '0' } })

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Informe uma ordem de prioridade maior ou igual a 1.')).toBeTruthy()
      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })

  // CRITÉRIO: Critério "Outro" exige campo "Descrição do Critério"
  it('Critério da prioridade "Outro" exige descrição customizada', async () => {
    const handleSubmit = vi.fn()
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={() => {}}
        onSubmit={handleSubmit}
      />,
    )

    const selectCrit = screen.getByTestId('select-raw-material-criterion')
    fireEvent.change(selectCrit, { target: { value: 'Outro' } })

    expect(screen.getByTestId('input-raw-material-custom-criterion')).toBeTruthy()

    const codeInput = screen.getByTestId('input-raw-material-code')
    const descInput = screen.getByTestId('input-raw-material-desc')
    const saveBtn = screen.getByTestId('modal-save-btn')

    fireEvent.change(codeInput, { target: { value: 'BOB_TESTE' } })
    fireEvent.change(descInput, { target: { value: 'Teste Desc' } })

    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText('Informe a descrição do critério.')).toBeTruthy()
      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })
})
