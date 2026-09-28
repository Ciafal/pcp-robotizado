import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { RawMaterialPriorityModal } from '@/components/line-master/RawMaterialPriorityModal'
import { RawMaterialPrioritiesPanel } from '@/components/line-master/RawMaterialPrioritiesPanel'
import { RawMaterialPriorityConflictModal } from '@/components/line-master/RawMaterialPriorityConflictModal'
import { RawMaterialExistingPriorityModal } from '@/components/line-master/RawMaterialExistingPriorityModal'
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
        conflictingMaterialCode="BOB_CSN_BQ_1012"
        impactList={impactList}
        onCancel={handleCancel}
        onConfirmReorganize={handleReorganize}
      />,
    )

    // Mensagem de conflito
    expect(
      screen.getByText(
        /A prioridade 1 já está atribuída à matéria-prima BOB_CSN_BQ_1012. Deseja reorganizar as prioridades\?/i,
      ),
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

  // T1: Ícone power/toggle removido da coluna AÇÕES
  it('T1: Ícone power removido da coluna AÇÕES; somente botão Editar visível', () => {
    render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={() => {}}
        onEditClick={() => {}}
        onToggleStatusClick={() => {}}
      />,
    )
    expect(screen.queryByTitle(/ativar|inativar|desativar/i)).toBeNull()
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    expect(editButtons.length).toBe(mockRawMaterials.length)
  })

  // T2: Sem área clicável ou espaço residual na coluna de ações
  it('T2: Sem área clicável ou espaço residual na coluna Ações além do botão Editar', () => {
    const { container } = render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={() => {}}
        onEditClick={() => {}}
        onToggleStatusClick={() => {}}
      />,
    )
    const actionTds = container.querySelectorAll('tbody tr td:last-child')
    actionTds.forEach((td) => {
      const buttons = td.querySelectorAll('button')
      expect(buttons.length).toBe(1)
      expect(buttons[0].textContent).toContain('Editar')
    })
  })

  // T3: Editar abre o modal com o registro correto
  it('T3: Botão Editar abre o modal carregando o registro selecionado', () => {
    const handleEdit = vi.fn()
    render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={() => {}}
        onEditClick={handleEdit}
        onToggleStatusClick={() => {}}
      />,
    )
    const targetItem = mockRawMaterials[1] // BOB_GERDAU_1020
    const editBtn = screen.getByTestId(`btn-edit-raw-material-${targetItem.material_code}`)
    fireEvent.click(editBtn)
    expect(handleEdit).toHaveBeenCalledWith(targetItem)
  })

  // T4: Cancelar com dados alterados pede "Descartar alterações?"
  it('T4: Cancelar com dados alterados exibe confirmação "Descartar alterações?" e botões Continuar editando e Descartar alterções', async () => {
    const handleClose = vi.fn()
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={handleClose}
        onSubmit={vi.fn()}
      />,
    )

    const codeInput = screen.getByTestId('input-raw-material-code')
    fireEvent.change(codeInput, { target: { value: 'BOB_ALTERADA' } })

    const cancelBtn = screen.getByTestId('modal-cancel-btn')
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.getByText('Descartar alterações?')).toBeTruthy()
      expect(
        screen.getByText(
          'Existem informações preenchidas que ainda não foram salvas. Deseja descartar as alterações?',
        ),
      ).toBeTruthy()
      expect(screen.getByText('Continuar editando')).toBeTruthy()
      expect(screen.getByText('Descartar alterções')).toBeTruthy()
    })
    expect(handleClose).not.toHaveBeenCalled()
  })

  // T5: Salvar persiste dados válidos e chama callback onSubmit
  it('T5: Salvar persiste dados válidos e aciona callback onSubmit com payload íntegro', async () => {
    const handleSubmit = vi.fn()
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />,
    )

    fireEvent.change(screen.getByTestId('input-raw-material-code'), {
      target: { value: 'BOB_NOVA_MP' },
    })
    fireEvent.change(screen.getByTestId('input-raw-material-desc'), {
      target: { value: 'Bobina Especial de Teste' },
    })
    fireEvent.change(screen.getByTestId('input-raw-material-priority'), {
      target: { value: '1' },
    })
    fireEvent.change(screen.getByTestId('input-raw-material-valid-from'), {
      target: { value: '01/11/2026' },
    })

    fireEvent.click(screen.getByTestId('modal-save-btn'))

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1)
      const payload = handleSubmit.mock.calls[0][0]
      expect(payload.material_code).toBe('BOB_NOVA_MP')
      expect(payload.material_description).toBe('Bobina Especial de Teste')
      expect(payload.priority_order).toBe(1)
      expect(payload.valid_from).toBe('2026-11-01')
      expect(payload.active).toBe(true)
    })
  })

  // T6: RawMaterialExistingPriorityModal exibe alerta de material já priorizado
  it('T6: MP já priorizada exibe modal de confirmação sem duplicar registro', () => {
    const handleConfirm = vi.fn()
    const handleCancel = vi.fn()
    render(
      <RawMaterialExistingPriorityModal
        open={true}
        materialCode="BOB_CSN_BQ_1012"
        materialDescription="Bobina Laminada a Quente SAE 1012"
        currentPriority={1}
        newPriority={2}
        currentValidFrom="2026-10-01"
        currentValidUntil="2026-10-31"
        newValidFrom="01/11/2026"
        newValidUntil="30/11/2026"
        onCancel={handleCancel}
        onConfirmAlteration={handleConfirm}
      />,
    )

    expect(screen.getAllByText('Prioridade já cadastrada').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/BOB_CSN_BQ_1012/).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText('Tem certeza de que deseja alterar a prioridade desta matéria-prima?'),
    ).toBeTruthy()

    const confirmBtn = screen.getByTestId('btn-confirm-existing-priority')
    fireEvent.click(confirmBtn)
    expect(handleConfirm).toHaveBeenCalledTimes(1)
  })

  // T7: Cancelar no modal de MP já cadastrada preserva o estado
  it('T7: Cancelar no modal de prioridade existente preserva estado sem alteração', () => {
    const handleCancel = vi.fn()
    render(
      <RawMaterialExistingPriorityModal
        open={true}
        materialCode="BOB_CSN_BQ_1012"
        currentPriority={1}
        newPriority={2}
        onCancel={handleCancel}
        onConfirmAlteration={() => {}}
      />,
    )

    const cancelBtn = screen.getByTestId('btn-cancel-existing-priority')
    fireEvent.click(cancelBtn)
    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  // T8: Contador "Prioridades MP (X)" reflete a quantidade correta na lista
  it('T8: Contador reflete a quantidade correta de itens', () => {
    render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={() => {}}
        onEditClick={() => {}}
      />,
    )
    expect(screen.getByText(/Prioridades de Matéria-Prima & Bobinas \(3\)/i)).toBeTruthy()
  })

  // T9: Validação estrita de número inteiro positivo para prioridade
  it('T9: Prioridade inválida (0, negativa ou decimal) é bloqueada', async () => {
    const handleSubmit = vi.fn()
    render(
      <RawMaterialPriorityModal
        open={true}
        lineId="line_l1"
        lineMasterId="master_1"
        onClose={vi.fn()}
        onSubmit={handleSubmit}
      />,
    )

    fireEvent.change(screen.getByTestId('input-raw-material-code'), {
      target: { value: 'BOB_TESTE' },
    })
    fireEvent.change(screen.getByTestId('input-raw-material-desc'), {
      target: { value: 'Descrição' },
    })
    fireEvent.change(screen.getByTestId('input-raw-material-priority'), {
      target: { value: '-2' },
    })

    fireEvent.click(screen.getByTestId('modal-save-btn'))

    await waitFor(() => {
      expect(
        screen.getByText('A prioridade deve ser um número inteiro maior que zero (1, 2, 3...).'),
      ).toBeTruthy()
      expect(handleSubmit).not.toHaveBeenCalled()
    })
  })

  // T10: Regressão de integridade das demais propriedades
  it('T10: Painel de Prioridades exibe cabeçalho oficial e botão Adicionar Prioridade', () => {
    const handleAdd = vi.fn()
    render(
      <RawMaterialPrioritiesPanel
        rawMaterials={mockRawMaterials}
        onAddClick={handleAdd}
        onEditClick={() => {}}
      />,
    )

    expect(screen.getByText(/Prioridades de Matéria-Prima & Bobinas/i)).toBeTruthy()
    const addBtn = screen.getByTestId('btn-add-raw-material-priority')
    fireEvent.click(addBtn)
    expect(handleAdd).toHaveBeenCalledTimes(1)
  })
})
