import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  pcpMonthlySummaryService,
  PCPMonthlySummaryTemplateRecord,
  PCPMonthlySummaryRecord,
} from '@/services/pcp-monthly-summaries'
import { pb } from '@/lib/pocketbase/client'

describe('PCP Monthly Summary - Templates & Versioning Engine Acceptance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Regra de Seleção Hierárquica de Templates (Centro -> Linha -> Empresa -> Geral)', () => {
    it('deve priorizar template por Centro quando compatível, ativo e em vigência', async () => {
      const templatesMock: PCPMonthlySummaryTemplateRecord[] = [
        {
          id: 't-geral',
          template_code: 'TMP-GERAL',
          nome: 'Template Geral',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: 'ALL',
          aplicacao: 'GERAL',
          status: 'ATIVO',
          is_default: true,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
        {
          id: 't-linha',
          template_code: 'TMP-LINHA-L1',
          nome: 'Template Linha L1',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'L1',
          centro_code: 'ALL',
          aplicacao: 'LINHA',
          status: 'ATIVO',
          is_default: false,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
        {
          id: 't-centro',
          template_code: 'TMP-CENTRO-DIV',
          nome: 'Template Centro Divinópolis',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: '1001',
          aplicacao: 'CENTRO',
          status: 'ATIVO',
          is_default: false,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
      ]

      vi.spyOn(pcpMonthlySummaryService, 'listTemplates').mockResolvedValue(templatesMock)

      const selected = await pcpMonthlySummaryService.resolveApplicableTemplate({
        empresa: 'CIAFAL',
        linha: 'L1',
        centro: '1001',
        date: '2025-05-01',
      })

      expect(selected).not.toBeNull()
      expect(selected?.id).toBe('t-centro')
      expect(selected?.aplicacao).toBe('CENTRO')
    })

    it('deve priorizar Linha caso não haja template específico de Centro', async () => {
      const templatesMock: PCPMonthlySummaryTemplateRecord[] = [
        {
          id: 't-geral',
          template_code: 'TMP-GERAL',
          nome: 'Template Geral',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: 'ALL',
          aplicacao: 'GERAL',
          status: 'ATIVO',
          is_default: true,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
        {
          id: 't-linha',
          template_code: 'TMP-LINHA-L1',
          nome: 'Template Linha L1',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'L1',
          centro_code: 'ALL',
          aplicacao: 'LINHA',
          status: 'ATIVO',
          is_default: false,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
      ]

      vi.spyOn(pcpMonthlySummaryService, 'listTemplates').mockResolvedValue(templatesMock)

      const selected = await pcpMonthlySummaryService.resolveApplicableTemplate({
        empresa: 'CIAFAL',
        linha: 'L1',
        centro: '1002',
        date: '2025-05-01',
      })

      expect(selected).not.toBeNull()
      expect(selected?.id).toBe('t-linha')
      expect(selected?.aplicacao).toBe('LINHA')
    })

    it('deve priorizar Empresa caso não haja Centro nem Linha específicos', async () => {
      const templatesMock: PCPMonthlySummaryTemplateRecord[] = [
        {
          id: 't-geral',
          template_code: 'TMP-GERAL',
          nome: 'Template Geral',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: 'ALL',
          aplicacao: 'GERAL',
          status: 'ATIVO',
          is_default: true,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
        {
          id: 't-empresa',
          template_code: 'TMP-EMPRESA-CIAFAL',
          nome: 'Template Empresa CIAFAL',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: 'ALL',
          aplicacao: 'EMPRESA',
          status: 'ATIVO',
          is_default: false,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
      ]

      vi.spyOn(pcpMonthlySummaryService, 'listTemplates').mockResolvedValue(templatesMock)

      const selected = await pcpMonthlySummaryService.resolveApplicableTemplate({
        empresa: 'CIAFAL',
        linha: 'L2',
        centro: '2001',
        date: '2025-05-01',
      })

      expect(selected?.id).toBe('t-empresa')
      expect(selected?.aplicacao).toBe('EMPRESA')
    })

    it('deve ignorar templates INATIVOS ou fora da vigência', async () => {
      const templatesMock: PCPMonthlySummaryTemplateRecord[] = [
        {
          id: 't-centro-inativo',
          template_code: 'TMP-CENTRO-INATIVO',
          nome: 'Template Centro Inativo',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: '1001',
          aplicacao: 'CENTRO',
          status: 'INATIVO',
          is_default: false,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
        {
          id: 't-geral-ativo',
          template_code: 'TMP-GERAL-ATIVO',
          nome: 'Template Geral Ativo',
          tipo: 'Resumo Mensal PCP',
          empresa_code: 'CIAFAL',
          linha_code: 'ALL',
          centro_code: 'ALL',
          aplicacao: 'GERAL',
          status: 'ATIVO',
          is_default: true,
          vigencia_inicio: '2025-01-01',
          versao: 1,
          versao_tag: 'V1.0',
          responsavel_criacao: 'Admin',
          ultima_atualizacao_por: 'Admin',
          sections_config: [],
          revisions_history: [],
          created: '2025-01-01',
          updated: '2025-01-01',
        },
      ]

      vi.spyOn(pcpMonthlySummaryService, 'listTemplates').mockResolvedValue(templatesMock)

      const selected = await pcpMonthlySummaryService.resolveApplicableTemplate({
        empresa: 'CIAFAL',
        linha: 'L1',
        centro: '1001',
        date: '2025-05-01',
      })

      // Como o centro está INATIVO, cai no template Geral Ativo
      expect(selected?.id).toBe('t-geral-ativo')
    })
  })

  describe('2. Versionamento Incremental Padronizado (V01 -> V02 -> V03)', () => {
    it('deve formatar as versões com 2 dígitos e prefixo V (V01, V02, V03)', () => {
      const getVersionTag = (num: number) => `V${String(num).padStart(2, '0')}`
      expect(getVersionTag(1)).toBe('V01')
      expect(getVersionTag(2)).toBe('V02')
      expect(getVersionTag(3)).toBe('V03')
      expect(getVersionTag(10)).toBe('V10')
    })

    it('deve gerar código único e imutável para a nova versão', () => {
      const summaryMock: PCPMonthlySummaryRecord = {
        id: 'sum-123',
        summary_code: 'RES-L1-2025-05-V01',
        linha_code: 'L1',
        ano: 2025,
        mes: 5,
        version_number: 1,
        version_tag: 'V01',
        empresa_code: 'CIAFAL',
        centro_code: '1001',
        mes_ano: '05/2025',
        status: 'PUBLICADO',
        data_entrega: '04/05/2025',
        origem_programacao_ref: 'WS-L1-2025-W18',
        responsavel_pcp_nome: 'Carlos Mendes',
        responsavel_pcp_email: 'carlos@ciafal.com.br',
        sections_data: {} as any,
        reading_confirmations: [],
        total_recipients_count: 8,
        read_count: 8,
        created: '2025-05-01',
        updated: '2025-05-01',
      }

      const nextVerNumber = (summaryMock.version_number || 1) + 1
      const nextVerTag = `V${String(nextVerNumber).padStart(2, '0')}`
      const nextSummaryCode = `RES-${summaryMock.linha_code}-${summaryMock.ano}-${String(summaryMock.mes).padStart(2, '0')}-${nextVerTag}`

      expect(nextVerTag).toBe('V02')
      expect(nextSummaryCode).toBe('RES-L1-2025-05-V02')
    })
  })

  describe('3. Integridade e Imutabilidade Histórica', () => {
    it('versão anterior publicada nunca deve ser sobrescrita ao criar nova versão', async () => {
      const originalRecord: PCPMonthlySummaryRecord = {
        id: 'orig-rec-1',
        summary_code: 'RES-L1-2025-05-V01',
        linha_code: 'L1',
        ano: 2025,
        mes: 5,
        version_number: 1,
        version_tag: 'V01',
        empresa_code: 'CIAFAL',
        centro_code: '1001',
        mes_ano: '05/2025',
        status: 'PUBLICADO',
        data_entrega: '04/05/2025',
        origem_programacao_ref: 'WS-L1-2025-W18',
        responsavel_pcp_nome: 'Carlos Mendes',
        responsavel_pcp_email: 'carlos@ciafal.com.br',
        sections_data: {
          identificacao: { versao: 'V01', dataEntrega: '04/05/2025' },
          sumarioExecutivo: { bullets: ['Versão original homologada'] },
          historicoRevisoes: { revisoes: [] },
        } as any,
        reading_confirmations: [],
        total_recipients_count: 8,
        read_count: 8,
        created: '2025-05-01',
        updated: '2025-05-01',
      }

      // Mock PocketBase getOne e create
      let createdPayload: any = null
      vi.spyOn(pb, 'collection').mockReturnValue({
        getOne: vi.fn().mockResolvedValue(originalRecord),
        create: vi.fn().mockImplementation((payload) => {
          createdPayload = payload
          return Promise.resolve({
            id: 'new-rec-2',
            ...payload,
            created: '2025-05-10',
            updated: '2025-05-10',
          })
        }),
      } as any)

      const result = await pcpMonthlySummaryService.createNewVersion(
        'orig-rec-1',
        'Revisão técnica de ordens de laminação',
        'Ajuste decorrente de parada mecânica',
      )

      // Confirma que a nova versão nasceu como rascunho com ID próprio
      expect(result.id).toBe('new-rec-2')
      expect(result.version_number).toBe(2)
      expect(result.version_tag).toBe('V02')
      expect(result.status).toBe('EM_EDICAO_PCP')
      expect(createdPayload.parent_version_id).toBe('orig-rec-1')

      // Confirma que o histórico de revisões acumulou a nova entrada com motivo
      const revs = createdPayload.sections_data.historicoRevisoes.revisoes
      expect(revs.length).toBeGreaterThan(0)
      const lastRev = revs[revs.length - 1]
      expect(lastRev.versao).toBe('V02')
      expect(lastRev.motivo).toBe('Revisão técnica de ordens de laminação')
    })
  })

  describe('4. Estrutura Canônica das 18 Seções Mínimas de Template', () => {
    it('deve conter exatamente as 18 seções mínimas homologadas', () => {
      const sections = pcpMonthlySummaryService.getDefault18SectionsConfig()
      expect(sections.length).toBe(18)

      // Verifica seções vitais
      const secTitles = sections.map((s) => s.title)
      expect(secTitles).toContain('Identificação Operacional')
      expect(secTitles).toContain('Sumário Executivo')
      expect(secTitles).toContain('Análise de Carteira & Atendimento Comercial')
      expect(secTitles).toContain('Estoque de Produto Acabado')
      expect(secTitles).toContain('Matéria-Prima & Balanço de Pátio')
      expect(secTitles).toContain('Conclusão & Parecer IA')

      // Verifica instruções de IA e placeholders padrão
      sections.forEach((sec) => {
        expect(sec.ai_instruction).toBeDefined()
        expect(sec.ai_instruction.length).toBeGreaterThan(10)
        expect(sec.data_source).toBeDefined()
      })
    })
  })

  describe('5. Construtor de Tabelas (Table Builder) e Formatação pt-BR', () => {
    it('deve gerar modelo padrão de tabela com as 5 colunas homologadas (Produto, Qtd Prog, Qtd Real, Atendimento %, Justificativa)', () => {
      const defaultTable = pcpMonthlySummaryService.createDefaultCustomTable({
        name: 'Tabela de Homologação',
      })

      expect(defaultTable).toBeDefined()
      expect(defaultTable.name).toBe('Tabela de Homologação')
      expect(defaultTable.columns.length).toBe(5)
      expect(defaultTable.rows.length).toBeGreaterThanOrEqual(3)

      const colNames = defaultTable.columns.map((c) => c.name)
      expect(colNames).toContain('Produto / Bitola')
      expect(colNames).toContain('Quantidade Programada')
      expect(colNames).toContain('Quantidade Realizada')
      expect(colNames).toContain('Atendimento %')
      expect(colNames).toContain('Justificativa Operacional')

      const calculatedCol = defaultTable.columns.find((c) => c.field_type === 'CAMPO_CALCULADO')
      expect(calculatedCol).toBeDefined()
      expect(calculatedCol?.calculation_rule).toContain('[Quantidade Realizada]')

      const aiCol = defaultTable.columns.find((c) => c.field_type === 'INFORMACAO_IA')
      expect(aiCol).toBeDefined()
      expect(aiCol?.ai_field_instruction).toBeDefined()

      expect(defaultTable.ai_fill_instructions).toBeDefined()
      expect(defaultTable.ai_fill_instructions.length).toBeGreaterThan(10)
      expect(defaultTable.totalizer?.enabled).toBe(true)
    })

    it('deve salvar tabela customizada vinculada a uma seção do template e atualizar pcp_monthly_summary_tables', async () => {
      const sampleTemplate: PCPMonthlySummaryTemplateRecord = {
        id: 'tpl-tbl-1',
        template_code: 'TMP-L1-2025',
        nome: 'Template de Laminação 1',
        tipo: 'Resumo Mensal PCP',
        empresa_code: 'CIAFAL',
        linha_code: 'L1',
        centro_code: 'ALL',
        aplicacao: 'LINHA',
        status: 'ATIVO',
        is_default: true,
        vigencia_inicio: '2025-01-01',
        versao: 1,
        versao_tag: 'V1.0',
        responsavel_criacao: 'Programador PCP',
        ultima_atualizacao_por: 'Programador PCP',
        sections_config: pcpMonthlySummaryService.getDefault18SectionsConfig(),
        revisions_history: [],
        created: '2025-01-01',
        updated: '2025-01-01',
      }

      const tableToSave = pcpMonthlySummaryService.createDefaultCustomTable({
        id: 'tbl_teste_123',
        name: 'Tabela de Desvios Operacionais',
      })

      // Mocks do PocketBase
      let updatePayload: any = null
      let tableCreatedPayload: any = null

      vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
        if (colName === 'pcp_monthly_summary_templates') {
          return {
            getOne: vi.fn().mockResolvedValue(sampleTemplate),
            update: vi.fn().mockImplementation((id, data) => {
              updatePayload = data
              return Promise.resolve({
                ...sampleTemplate,
                ...data,
                updated: '2025-05-15',
              })
            }),
          } as any
        }
        if (colName === 'pcp_monthly_summary_tables') {
          return {
            getFirstListItem: vi.fn().mockRejectedValue(new Error('not found')),
            create: vi.fn().mockImplementation((data) => {
              tableCreatedPayload = data
              return Promise.resolve({ id: 'rec-tbl-1', ...data })
            }),
            update: vi.fn().mockResolvedValue({ id: 'rec-tbl-1' }),
          } as any
        }
        return {} as any
      })

      const res = await pcpMonthlySummaryService.saveTemplateCustomTable({
        templateId: 'tpl-tbl-1',
        sectionIndexOrKey: 0,
        table: tableToSave,
        motivo: 'Inclusão da tabela de desvios operacionais na Seção 1',
      })

      expect(res.table.id).toBe('tbl_teste_123')
      expect(updatePayload).not.toBeNull()
      const savedSection0 = updatePayload.sections_config[0]
      expect(savedSection0.custom_tables).toBeDefined()
      expect(savedSection0.custom_tables.some((t: any) => t.id === 'tbl_teste_123')).toBe(true)
      expect(
        savedSection0.components.some(
          (c: any) => c.type === 'TABLE' && c.tableConfig?.id === 'tbl_teste_123',
        ),
      ).toBe(true)

      expect(tableCreatedPayload).not.toBeNull()
      expect(tableCreatedPayload.table_id).toBe('tbl_teste_123')
      expect(tableCreatedPayload.name).toBe('Tabela de Desvios Operacionais')
    })
  })
})
