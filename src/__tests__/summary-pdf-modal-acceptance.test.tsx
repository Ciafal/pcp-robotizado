import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SummaryPdfModal } from '@/components/pcp/entregas/SummaryPdfModal'
import { PCPMonthlySummaryRecord } from '@/services/pcp-monthly-summaries'

const createMockSummary = (
  overrides: Partial<PCPMonthlySummaryRecord> = {},
): PCPMonthlySummaryRecord => ({
  id: 'mock_sum_1',
  summary_code: 'RES-L1-2025-05-V01',
  empresa_code: 'CIAFAL',
  centro_code: '1010',
  linha_code: 'L1',
  linha_nome: 'Linha L1',
  ano: 2025,
  mes: 5,
  mes_ano: '05/2025',
  version_number: 1,
  version_tag: 'V1',
  status: 'RASCUNHO_IA',
  sections_data: {
    identificacao: {} as any,
    sumarioExecutivo: { bullets: [] },
    analiseCarteira: {} as any,
    estoqueProdutoAcabado: {} as any,
    materiaPrima: {} as any,
    industrializados: {} as any,
    premissasDoMes: { itens: [] },
    restricoesProblemas: {} as any,
    campanhas: {} as any,
    programacaoDoMes: {} as any,
    producaoPrevista: {} as any,
    previstoVsRealizadoHistorico: { meses: [], mediaAssertividadePct: 0 },
    historicoRevisoes: { revisoes: [] },
    riscos: { lista: [] },
    pontosAtencao: { itens: [] },
    pendenciasPorArea: { tabela: [] },
    aprovacoes: { lista: [] },
    conclusaoIA: {} as any,
  },
  ...overrides,
})

describe('SummaryPdfModal Acceptance Tests', () => {
  it('(a) com dados ausentes, nenhum dos fallbacks fake aparece na saída', () => {
    const summaryWithoutData = createMockSummary({
      data_entrega: undefined,
      responsavel_pcp_nome: undefined,
      template_code: undefined,
      template_version: undefined,
      template_snapshot: null,
      sections_data: {
        identificacao: {} as any,
        sumarioExecutivo: { bullets: [] },
        analiseCarteira: {
          totalTons: undefined as any,
          carteiraMTOTons: undefined as any,
          coberturaDias: undefined as any,
          rupturasIdentificadas: undefined as any,
        } as any,
        estoqueProdutoAcabado: {} as any,
        materiaPrima: {
          estoqueAtualTons: undefined as any,
          necessidadeTotalTons: undefined as any,
          riscoRupturaNivel: undefined as any,
        } as any,
        industrializados: {} as any,
        premissasDoMes: { itens: [] },
        restricoesProblemas: {
          produtividadeRealizadaTph: undefined as any,
          tempoSetupMedioMin: undefined as any,
          paradasProgramadasHoras: undefined as any,
        } as any,
        campanhas: {} as any,
        programacaoDoMes: {} as any,
        producaoPrevista: {} as any,
        previstoVsRealizadoHistorico: { meses: [], mediaAssertividadePct: 0 },
        historicoRevisoes: { revisoes: [] },
        riscos: { lista: [] },
        pontosAtencao: { itens: [] },
        pendenciasPorArea: { tabela: [] },
        aprovacoes: { lista: [] },
        conclusaoIA: { parecerGeral: '' } as any,
      },
    })

    const { container } = render(
      <SummaryPdfModal isOpen={true} onClose={() => {}} summary={summaryWithoutData} />,
    )

    const textContent = container.textContent || ''

    // Assegura que nenhum número ou dado fake aparece
    expect(textContent).not.toContain('3.420,50')
    expect(textContent).not.toContain('840,20')
    expect(textContent).not.toContain('5.840,00')
    expect(textContent).not.toContain('3.820,00')
    expect(textContent).not.toContain('Carlos Mendes')
    expect(textContent).not.toContain('04/05/2025')
    expect(textContent).not.toContain('14,8 t/h')
    expect(textContent).not.toContain('42 min')
    expect(textContent).not.toContain('16 h')
    expect(textContent).not.toContain('22 dias')
    expect(textContent).not.toContain('Relatório mensal com consistência técnica plena')

    // Deve conter múltiplas ocorrências de "Dado não disponível"
    const unavailableElements = screen.getAllByText('Dado não disponível')
    expect(unavailableElements.length).toBeGreaterThanOrEqual(5)
  })

  it('(b) com template_snapshot vazio, não aparece "V1.0" nem "Padrão", e aparece a nota de resumo anterior ao versionamento', () => {
    const historicalSummary = createMockSummary({
      template_code: '',
      template_version: '',
      template_snapshot: null,
    })

    const { container } = render(
      <SummaryPdfModal isOpen={true} onClose={() => {}} summary={historicalSummary} />,
    )

    const textContent = container.textContent || ''

    // Não deve conter versões ou nomes inventados de template
    expect(textContent).not.toContain('Padrão')
    expect(textContent).not.toContain('V1.0')

    // Deve exibir identificação honesta de ausência de template
    expect(
      screen.getByText(/Sem vínculo de template \(anterior ao versionamento\)/i),
    ).toBeInTheDocument()

    // Deve exibir nota discreta sobre tabelas parametrizadas
    expect(
      screen.getByText(
        /Este resumo foi gerado antes do versionamento de templates — não possui tabelas parametrizadas vinculadas/i,
      ),
    ).toBeInTheDocument()
  })

  it('(c) com snapshot preenchido, as tabelas renderizam normalmente (regressão)', () => {
    const summaryWithSnapshot = createMockSummary({
      template_code: 'TMP-L1-PADRAO',
      template_version: 'V2.1',
      template_snapshot: {
        code: 'TMP-L1-PADRAO',
        version: 'V2.1',
        sections_config: [
          {
            order: 1,
            title: 'Tabela de Campanhas Fabris',
            custom_tables: [
              {
                id: 'tbl_campanhas_1',
                name: 'Campanhas Homologadas',
                display_title: 'Campanhas Homologadas L1',
                data_source: 'MES',
                show_title: true,
                allow_ai_completion: false,
                allow_manual_edit: true,
                is_dynamic: false,
                columns: [
                  {
                    id: 'col_campanha',
                    name: 'Nome da Campanha',
                    order: 1,
                    field_type: 'TEXTO',
                    is_required: true,
                  },
                  {
                    id: 'col_ton',
                    name: 'Volume',
                    order: 2,
                    field_type: 'QUANTIDADE',
                    unit_of_measure: 't',
                    is_required: true,
                  },
                ],
                rows: [
                  {
                    id: 'row_1',
                    order: 1,
                    cells: {
                      col_campanha: 'Campanha Aço Carbono Especial',
                      col_ton: 1520.4,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    })

    const { container } = render(
      <SummaryPdfModal isOpen={true} onClose={() => {}} summary={summaryWithSnapshot} />,
    )

    // Template code e version devem ser exibidos
    expect(screen.getByText('TMP-L1-PADRAO')).toBeInTheDocument()
    expect(screen.getByText('(V2.1)')).toBeInTheDocument()

    // A nota de histórico anterior ao versionamento NÃO deve aparecer
    expect(
      screen.queryByText(/Este resumo foi gerado antes do versionamento de templates/i),
    ).not.toBeInTheDocument()

    // A tabela parametrizada deve ser renderizada
    expect(screen.getByText('Campanhas Homologadas L1')).toBeInTheDocument()
    expect(screen.getByText('Campanha Aço Carbono Especial')).toBeInTheDocument()
    expect(screen.getByText('1.520,40 t')).toBeInTheDocument()
  })

  it('renderiza dados reais quando presentes sem substituição indevida', () => {
    const summaryWithRealData = createMockSummary({
      data_entrega: '28/10/2026',
      responsavel_pcp_nome: 'Marcos Vinicius Santos',
      sections_data: {
        identificacao: {} as any,
        sumarioExecutivo: {
          bullets: ['Produção atingiu 98% da meta.', 'Sem incidentes de suprimentos.'],
        },
        analiseCarteira: {
          totalTons: {
            formattedText: '4.150,00 t',
            value: 4150,
            sourceSystem: 'SAP',
            lastUpdatedAt: '',
          },
          carteiraMTOTons: {
            formattedText: '920,00 t',
            value: 920,
            sourceSystem: 'SAP',
            lastUpdatedAt: '',
          },
          coberturaDias: 30,
          rupturasIdentificadas: 2,
        } as any,
        estoqueProdutoAcabado: {} as any,
        materiaPrima: {
          estoqueAtualTons: {
            formattedText: '6.200,50 t',
            value: 6200.5,
            sourceSystem: 'WMS',
            lastUpdatedAt: '',
          },
          necessidadeTotalTons: {
            formattedText: '4.000,00 t',
            value: 4000,
            sourceSystem: 'SAP',
            lastUpdatedAt: '',
          },
          riscoRupturaNivel: 'MEDIO',
        } as any,
        industrializados: {} as any,
        premissasDoMes: { itens: [] },
        restricoesProblemas: {
          produtividadeRealizadaTph: {
            formattedText: '18,5 t/h',
            value: 18.5,
            sourceSystem: 'MES',
            lastUpdatedAt: '',
          },
          tempoSetupMedioMin: 35,
          paradasProgramadasHoras: 8,
        } as any,
        campanhas: {} as any,
        programacaoDoMes: {} as any,
        producaoPrevista: {} as any,
        previstoVsRealizadoHistorico: { meses: [], mediaAssertividadePct: 0 },
        historicoRevisoes: { revisoes: [] },
        riscos: { lista: [] },
        pontosAtencao: { itens: [] },
        pendenciasPorArea: {
          tabela: [
            {
              id: 'pend_1',
              area: 'Manutenção',
              acao: 'Troca de mancais',
              responsavel: 'Lucas Silva',
              prazo: '30/10/2026',
              status: 'Em Andamento',
            },
          ],
        },
        aprovacoes: { lista: [] },
        conclusaoIA: {
          parecerGeral: 'Mês operou com alta estabilidade dimensional e cumprimento do plano.',
        } as any,
      },
    })

    render(<SummaryPdfModal isOpen={true} onClose={() => {}} summary={summaryWithRealData} />)

    // Valores reais devem ser renderizados
    expect(screen.getByText('Entrega: 28/10/2026')).toBeInTheDocument()
    expect(screen.getAllByText('Marcos Vinicius Santos').length).toBe(2)
    expect(screen.getByText('Produção atingiu 98% da meta.')).toBeInTheDocument()
    expect(screen.getByText('4.150,00 t')).toBeInTheDocument()
    expect(screen.getByText('920,00 t')).toBeInTheDocument()
    expect(screen.getByText('30 dias')).toBeInTheDocument()
    expect(screen.getByText('2 itens')).toBeInTheDocument()
    expect(screen.getByText('6.200,50 t')).toBeInTheDocument()
    expect(screen.getByText('4.000,00 t')).toBeInTheDocument()
    expect(screen.getByText('MEDIO')).toBeInTheDocument()
    expect(screen.getByText('18,5 t/h')).toBeInTheDocument()
    expect(screen.getByText('35 min')).toBeInTheDocument()
    expect(screen.getByText('8 h')).toBeInTheDocument()
    expect(screen.getByText('Troca de mancais')).toBeInTheDocument()
    expect(
      screen.getByText(/"Mês operou com alta estabilidade dimensional e cumprimento do plano."/),
    ).toBeInTheDocument()
  })
})
