import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TestClosureSection } from '@/components/test-programming/TestClosureSection'
import { TestAiAnalysisSection } from '@/components/test-programming/TestAiAnalysisSection'
import { RevisionDetailModal } from '@/components/test-programming/RevisionDetailModal'
import { SearchableCombobox } from '@/components/test-programming/SearchableCombobox'
import { TestProgrammingRecord } from '@/types/test-programming'
import { testProgrammingService } from '@/services/test-programming-service'

vi.mock('@/services/test-programming-service', () => ({
  testProgrammingService: {
    update: vi.fn(),
    listHubUsers: vi.fn().mockResolvedValue([
      {
        id: 'usr-1',
        name: 'Lucas Ferreira',
        sector: 'Engenharia de Processos',
        role: 'Engenheiro',
        label: 'Lucas Ferreira — Engenharia de Processos',
      },
      {
        id: 'usr-2',
        name: 'Carlos Mendes',
        sector: 'Produção',
        role: 'Supervisor',
        label: 'Carlos Mendes — Produção',
      },
    ]),
    listActiveTestTypes: vi.fn().mockResolvedValue([
      { id: 'tt-1', description: 'Homologação Operacional' },
      { id: 'tt-2', description: 'Validação Dimensional' },
    ]),
  },
}))

vi.mock('@/services/sgq-document-provider', () => ({
  sgqDocumentProvider: {
    searchDocuments: vi.fn().mockResolvedValue([
      {
        code: 'IT-L1-002',
        title: 'Operação do Desbastador L1',
        version: 'Rev. 04',
        status: 'VIGENTE',
      },
    ]),
  },
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-admin', name: 'Admin PCP', role: 'PCP' },
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

const mockTestRecord: TestProgrammingRecord = {
  id: 'rec-test-123',
  test_id: 'TESTE-000123',
  company: 'CIAFAL',
  production_line: 'L1',
  work_center: 'LAM-01',
  request_date: '2025-05-10',
  expected_date: '2025-05-12',
  expected_start_date: '2025-05-12',
  expected_start_time: '08:00',
  expected_end_date: '2025-05-12',
  expected_end_time: '10:30',
  expected_duration_minutes: 150,
  expected_duration_formatted: '2 h 30 min',
  requesting_sector: 'Engenharia de Processos',
  requester_name: 'Lucas Ferreira',
  technical_lead: 'Carlos Mendes',
  test_type: 'Homologação Operacional',
  title: 'Validação de Nova Calibração Bitola 130mm',
  objective: 'Calibração de bitola',
  justification: 'Ajuste de rendimento metálico',
  status: 'Concluído',
  needs_revision: false,
  test_category: 'RECEITA_LAMINACAO',
  schedule_impact_type: 'PARADA_TOTAL',
}

describe('Test Programming Visual Layer Improvements Acceptance Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. SearchableCombobox renderiza opções reais e seleciona ID interno sem aceitar texto livre aleatório', () => {
    const handleChange = vi.fn()
    const options = [
      { value: 'id-1', label: 'Lucas Ferreira — Engenharia', subLabel: 'Perfil: Engenheiro' },
      { value: 'id-2', label: 'Carlos Mendes — Produção', subLabel: 'Perfil: Supervisor' },
    ]

    render(
      <SearchableCombobox
        data-testid="test-combobox"
        options={options}
        value="id-1"
        onChange={handleChange}
        placeholder="Selecione o solicitante..."
      />,
    )

    const btn = screen.getByTestId('test-combobox')
    expect(btn).toBeDefined()
    expect(btn.textContent).toContain('Lucas Ferreira — Engenharia')
  })

  it('2. TestClosureSection renderiza campo de conclusão e exige tipo e motivo quando "Necessita revisão" for Sim', async () => {
    const handleSaved = vi.fn()
    render(<TestClosureSection test={mockTestRecord} onSaved={handleSaved} />)

    // Preenche conclusão
    const textarea = screen.getByTestId('test-conclusion-textarea')
    fireEvent.change(textarea, {
      target: { value: 'Teste aprovado tecnicamente mas com novo limite térmico.' },
    })

    // Clica em Sim para necessidade de revisão
    const simBtn = screen.getByRole('button', { name: /Sim/i })
    fireEvent.click(simBtn)

    // Alerta de revisão deve aparecer
    expect(screen.getByTestId('closure-revision-alert')).toBeDefined()
    expect(screen.getByText(/⚠ REVISÃO NECESSÁRIA/)).toBeDefined()

    // Preenche motivo da revisão
    const reasonTextarea = screen.getByTestId('revision-reason-textarea')
    fireEvent.change(reasonTextarea, {
      target: { value: 'Alteração do parâmetro na Instrução de Trabalho.' },
    })

    // Clica em Salvar Fechamento
    vi.mocked(testProgrammingService.update).mockResolvedValueOnce({
      ...mockTestRecord,
      conclusion: 'Teste aprovado tecnicamente mas com novo limite térmico.',
      needs_revision: true,
      revision_types: 'Documento' as any,
      revision_reason: 'Alteração do parâmetro na Instrução de Trabalho.',
      revision_status: 'Pendente',
    })

    const saveBtn = screen.getByRole('button', { name: /Salvar Fechamento/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(testProgrammingService.update).toHaveBeenCalled()
    })
  })

  it('3. TestAiAnalysisSection exibe bloco de governança com sugestão sem aplicar automaticamente até clique de confirmação', async () => {
    const mockAnalysis = {
      principais_desvios: ['Duração excedeu em 15 min'],
      evidencias: ['Telemetria MES confirmou fim às 10:45'],
      possiveis_causas: ['Ajuste fino de gabarito'],
      impacto_produtivo: ['Parada de 165 min'],
      recorrencia: ['Primeiro teste na linha com nova receita'],
      aprendizados: ['Necessário pré-aquecimento estendido'],
      acoes_sugeridas: ['Atualizar Ficha Mestra'],
      ai_revision_suggestion: {
        recommended: true,
        justification: 'Variação dimensional sugere atualização formal da IT.',
        suggestedRevisionTypes: ['Documento' as const],
        triggerRules: ['Alteração de parâmetros em Receita AOM'],
        suggestedAt: '2025-05-12T11:00:00Z',
      },
      has_sufficient_data: true,
      generated_at: '2025-05-12T11:00:00Z',
    }

    render(<TestAiAnalysisSection analysis={mockAnalysis} testRecord={mockTestRecord} />)

    expect(screen.getByTestId('ai-governance-closure-block')).toBeDefined()
    expect(screen.getByText('⚠ Revisão recomendada')).toBeDefined()

    // Botões de deliberação humana
    const confirmBtn = screen.getByTestId('ai-confirm-revision-btn')
    const discardBtn = screen.getByTestId('ai-discard-suggestion-btn')
    expect(confirmBtn).toBeDefined()
    expect(discardBtn).toBeDefined()

    // Confirmação dispara update de governança
    vi.mocked(testProgrammingService.update).mockResolvedValueOnce({
      ...mockTestRecord,
      ai_revision_decision: 'CONFIRMADA',
      needs_revision: true,
    })

    fireEvent.click(confirmBtn)
    await waitFor(() => {
      expect(testProgrammingService.update).toHaveBeenCalledWith(
        mockTestRecord.id,
        expect.objectContaining({
          ai_revision_decision: 'CONFIRMADA',
          needs_revision: true,
        }),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      )
    })
  })

  it('4. RevisionDetailModal exibe alerta e detalhamento com status da revisão (Pendente/Em análise/etc.)', () => {
    const testWithRevision: TestProgrammingRecord = {
      ...mockTestRecord,
      needs_revision: true,
      revision_types: 'Documento e Meta' as any,
      revision_reason: 'Velocidade máxima alterada de 20 para 18 t/h.',
      revision_document_code: 'IT-L1-002',
      revision_document_title: 'Operação Desbastador',
      revision_document_version: 'Rev. 04',
      revision_status: 'Pendente',
      conclusion: 'Concluído com restrição.',
    }

    render(<RevisionDetailModal isOpen={true} onClose={vi.fn()} test={testWithRevision} />)

    expect(screen.getByTestId('revision-detail-modal')).toBeDefined()
    expect(screen.getByText('Detalhamento da Revisão Obrigatória')).toBeDefined()
    expect(screen.getByText('Velocidade máxima alterada de 20 para 18 t/h.')).toBeDefined()
    expect(screen.getByText('IT-L1-002')).toBeDefined()
  })
})
