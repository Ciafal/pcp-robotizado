import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sgqDocumentProvider,
  SgqDocumentAdapter,
  SGQ_INTERFERENCE_CATEGORY_LABELS,
  SgqInterferenceCategory,
  HOMOLOGATION_MOCK_DOCUMENTS,
} from '@/services/sgq-document-provider'
import { lineReferenceDocumentsService } from '@/services/line-reference-documents-service'
import { sgqAiExtractionEngine } from '@/services/sgq-ai-extraction-engine'
import { documentRulesEngine } from '@/services/document-rules-engine'
import { computeDiff, FIELD_LABELS_PT_BR, pcpAuditService } from '@/services/pcp-audit-service'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'
import pb from '@/lib/pocketbase/client'

describe('ETAPAS 1 & 2: PCP + SGQ Integração Real + IA + Motor Montagem Semanal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Camada de Integração SGQ Desacoplada e Mock Isolado (Requisitos 1, 2, 3, 5)', () => {
    it('(9) sem configuração do endpoint não quebra: exibe exatamente "Integração com SGQ aguardando configuração"', async () => {
      const adapter = new SgqDocumentAdapter({
        endpointUrl: '',
        enableHomologationMock: false,
      })
      const status = await adapter.getIntegrationStatus()

      expect(status.connected).toBe(false)
      expect(status.state).toBe('NAO_CONFIGURADO')
      expect(status.title).toBe('Integração com SGQ aguardando configuração')
      expect(status.description).toBe(
        'A estrutura de Documentos de Referência está preparada. Configure a fonte do módulo Informação Documentada para sincronizar os documentos oficiais.',
      )

      const docs = await adapter.searchDocuments({})
      expect(docs).toEqual([])
    })

    it('(2) mock somente em homologação exibe explicitamente "Fonte de homologação / dados simulados"', async () => {
      const adapter = new SgqDocumentAdapter({
        endpointUrl: '',
        enableHomologationMock: true,
      })
      const status = await adapter.getIntegrationStatus()

      expect(status.connected).toBe(true)
      expect(status.isSimulatedHomologation).toBe(true)
      expect(status.title).toBe('Fonte de homologação / dados simulados')
      expect(status.sourceLabel).toBe('Fonte de homologação / dados simulados')

      const docs = await adapter.searchDocuments({ code: 'PO-LAM-014' })
      expect(docs.length).toBeGreaterThan(0)
      expect(docs[0].code).toBe('PO-LAM-014')
      expect(docs[0].isSimulatedHomologation).toBe(true)
    })

    it('(3) contrato mínimo do documento completo e campos preservados', () => {
      const doc = HOMOLOGATION_MOCK_DOCUMENTS[0]
      expect(doc.id).toBeDefined()
      expect(doc.code).toBe('PO-LAM-014')
      expect(doc.title).toBeDefined()
      expect(doc.documentType).toBeDefined()
      expect(doc.revision).toBe('Rev.04')
      expect(doc.status).toBe('VIGENTE')
      expect(doc.responsibleArea).toBe('Engenharia de Processos')
      expect(doc.process).toBe('Laminação a Quente')
      expect(doc.validityDateStart).toBeDefined()
      expect(doc.validityDateEnd).toBeDefined()
      expect(doc.originalUrl).toBeDefined()
      expect(doc.extractableContent).toBeDefined()
      expect(doc.isCurrentValid).toBe(true)
      expect(doc.isApproved).toBe(true)
    })
  })

  describe('2. Extração e Análise Estruturada por IA (Requisito 6)', () => {
    it('(2) IA: documento de homologação com regra conhecida → regra estruturada → categoria correta → evidência de origem', async () => {
      const doc = HOMOLOGATION_MOCK_DOCUMENTS[0]
      const result = await sgqAiExtractionEngine.analyzeDocument(doc, undefined, {
        forceDeterministic: true,
      })

      expect(result.rules.length).toBeGreaterThanOrEqual(4)
      expect(result.document_code).toBe('PO-LAM-014')

      // Verificar regra de setup (40 minutos)
      const setupRule = result.rules.find((r) => r.category === 'SETUP' && r.setup_minutes === 40)
      expect(setupRule).toBeDefined()
      expect(setupRule?.rule_type).toBe('OBRIGATORIA')
      expect(setupRule?.source_excerpt).toContain('40 minutos')
      expect(setupRule?.status).toBe('ATIVA')

      // Verificar proibição de sequência
      const prohibitionRule = result.rules.find((r) => r.rule_type === 'PROIBICAO')
      expect(prohibitionRule).toBeDefined()
      expect(prohibitionRule?.source_excerpt).toContain('não pode ser produzido imediatamente após')
      expect(prohibitionRule?.product_from).toBeDefined()

      // Verificar guardrail de recomendação nunca virar obrigação
      const recRule = result.rules.find((r) => r.rule_type === 'RECOMENDACAO')
      expect(recRule).toBeDefined()
      expect(recRule?.priority).toBeGreaterThanOrEqual(4)
      expect(recRule?.rule_type).not.toBe('OBRIGATORIA')
    })

    it('guardrail absoluto: evidência insuficiente resulta em status REVISAO_NECESSARIA e requires_human_review=true', () => {
      const result = sgqAiExtractionEngine.extractDeterministicRules(
        'DOC-TEST',
        'Rev.01',
        'ID-1',
        'Texto genérico sem regras numéricas claras ou detalhamento.',
      )

      expect(result.rules.length).toBeGreaterThan(0)
      const rule = result.rules[0]
      expect(rule.requires_human_review).toBe(true)
      expect(rule.status).toBe('REVISAO_NECESSARIA')
    })
  })

  describe('3. Motor de Validação Documental na Montagem Semanal (Requisitos 8, 9, 10)', () => {
    const mockLineDocs = [
      {
        id: 'DOC-1',
        line_id: 'L1',
        document_code: 'PO-LAM-014',
        revision: 'Rev.04',
        title: 'Procedimento de Laminação',
        status: 'VIGENTE' as const,
        interference_categories: ['SETUP' as const, 'SEQUENCING' as const, 'PRODUCTIVITY' as const],
        interpreted_rules: {
          rules: [
            {
              rule_id: 'RULE-SETUP-40',
              document_id: 'DOC-1',
              document_code: 'PO-LAM-014',
              revision: 'Rev.04',
              category: 'SETUP' as const,
              rule_type: 'OBRIGATORIA' as const,
              condition: 'Transição FP-BARRA-RED para FP-CANTONEIRA',
              action_or_restriction: 'Tempo de setup mínimo de 40 minutos',
              product_from: 'FP-BARRA-RED',
              product_to: 'FP-CANTONEIRA',
              setup_minutes: 40,
              source_excerpt: 'O tempo mínimo de setup e acerto da tesoura TR2 é de 40 minutos.',
              page_or_section: 'Seção 3.1',
              confidence_level: 0.95,
              processed_at: '2025-01-01',
              status: 'ATIVA' as const,
              requires_human_review: false,
              priority: 1,
            },
            {
              rule_id: 'RULE-PROIB-SEQ',
              document_id: 'DOC-1',
              document_code: 'PO-LAM-014',
              revision: 'Rev.04',
              category: 'SEQUENCING' as const,
              rule_type: 'PROIBICAO' as const,
              condition: 'MAT-CA50-100 após MAT-CA50-080',
              action_or_restriction: 'Sequenciamento proibido sem troca de cilindros',
              product_from: 'MAT-CA50-080',
              product_to: 'MAT-CA50-100',
              source_excerpt:
                'O produto MAT-CA50-100 não pode ser produzido imediatamente após o produto MAT-CA50-080',
              page_or_section: 'Seção 3.1',
              confidence_level: 0.95,
              processed_at: '2025-01-01',
              status: 'ATIVA' as const,
              requires_human_review: false,
              priority: 1,
            },
            {
              rule_id: 'RULE-PROD-22',
              document_id: 'DOC-1',
              document_code: 'PO-LAM-014',
              revision: 'Rev.04',
              category: 'PRODUCTIVITY' as const,
              rule_type: 'LIMITE' as const,
              condition: 'Bitolas acima de 1 polegada',
              action_or_restriction: 'Velocidade máxima da mesa de resfriamento é de 22 t/h',
              product_to: 'MAT-BARRA-POLEGADA',
              cadence_th: 22,
              source_excerpt:
                'A velocidade máxima da mesa de resfriamento TCC para bitolas acima de 1 polegada é de 22 t/h.',
              page_or_section: 'Seção 3.1',
              confidence_level: 0.95,
              processed_at: '2025-01-01',
              status: 'ATIVA' as const,
              requires_human_review: false,
              priority: 2,
            },
          ],
        },
      },
    ]

    it('(3) "Troca A -> B exige 40 minutos": com setup insuficiente detecta violação obrigatória', () => {
      const schedule: Partial<WeeklyScheduleItem>[] = [
        {
          id: 'item-1',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 1,
          item_type: 'PRODUCTION',
          material_code: 'MAT-BARRA-01',
          family_code: 'FP-BARRA-RED',
          planned_quantity_tons: 100,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
        {
          id: 'item-setup',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 2,
          item_type: 'SETUP',
          material_code: 'SETUP',
          setup_duration_minutes: 20, // Insuficiente (exige 40)
          planned_quantity_tons: 0,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
        {
          id: 'item-2',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 3,
          item_type: 'PRODUCTION',
          material_code: 'MAT-CANTONEIRA-01',
          family_code: 'FP-CANTONEIRA',
          planned_quantity_tons: 80,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
      ]

      const validation = documentRulesEngine.validateDocumentRules(schedule, {
        lineCode: 'L1',
        lineDocs: mockLineDocs as any,
      })

      expect(validation.passed).toBe(false)
      expect(validation.blocking_violations_count).toBe(1)
      expect(validation.mandatory_violations[0].rule_id).toBe('RULE-SETUP-40')
      expect(validation.mandatory_violations[0].source_excerpt).toContain('40 minutos')
    })

    it('(3b) quando setup fornecido é >= 40 minutos, regra é considerada satisfeita', () => {
      const schedule: Partial<WeeklyScheduleItem>[] = [
        {
          id: 'item-1',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 1,
          item_type: 'PRODUCTION',
          material_code: 'MAT-BARRA-01',
          family_code: 'FP-BARRA-RED',
          planned_quantity_tons: 100,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
        {
          id: 'item-setup',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 2,
          item_type: 'SETUP',
          material_code: 'SETUP',
          setup_duration_minutes: 40, // Suficiente!
          planned_quantity_tons: 0,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
        {
          id: 'item-2',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 3,
          item_type: 'PRODUCTION',
          material_code: 'MAT-CANTONEIRA-01',
          family_code: 'FP-CANTONEIRA',
          planned_quantity_tons: 80,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
      ]

      const validation = documentRulesEngine.validateDocumentRules(schedule, {
        lineCode: 'L1',
        lineDocs: mockLineDocs as any,
      })

      const satisfied = validation.rules_satisfied.find((r) => r.rule_id === 'RULE-SETUP-40')
      expect(satisfied).toBeDefined()
    })

    it('(4) "B não pode ser produzido após A": detecta violação de proibição de sequência', () => {
      const schedule: Partial<WeeklyScheduleItem>[] = [
        {
          id: 'item-1',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 1,
          item_type: 'PRODUCTION',
          material_code: 'MAT-CA50-080',
          planned_quantity_tons: 50,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
        {
          id: 'item-2',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 2,
          item_type: 'PRODUCTION',
          material_code: 'MAT-CA50-100', // Proibido após 080
          planned_quantity_tons: 50,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
      ]

      const validation = documentRulesEngine.validateDocumentRules(schedule, {
        lineCode: 'L1',
        lineDocs: mockLineDocs as any,
      })

      expect(validation.passed).toBe(false)
      const violation = validation.mandatory_violations.find((v) => v.rule_id === 'RULE-PROIB-SEQ')
      expect(violation).toBeDefined()
      expect(violation?.rule_type).toBe('PROIBICAO')
      expect(violation?.recommended_action).toContain('Intercalar outro lote compatível')
    })

    it('(5) produtividade específica e detecção de conflito com a Ficha Mestra', () => {
      const schedule: Partial<WeeklyScheduleItem>[] = [
        {
          id: 'item-1',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 1,
          item_type: 'PRODUCTION',
          material_code: 'MAT-BARRA-POLEGADA',
          productivity_rate_th: 25, // Ficha Mestra 25 t/h > Limite SGQ 22 t/h
          planned_quantity_tons: 100,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
      ]

      const validation = documentRulesEngine.validateDocumentRules(schedule, {
        lineCode: 'L1',
        lineDocs: mockLineDocs as any,
      })

      expect(validation.conflicts.length).toBeGreaterThan(0)
      expect(validation.conflicts[0].parameter).toContain('Cadência Operacional')
      expect(validation.conflicts[0].source_b.value).toBe('22 t/h')

      // Como é LIMITE e 25 > 22, gera também violação obrigatória
      const limViolation = validation.mandatory_violations.find((v) => v.rule_id === 'RULE-PROD-22')
      expect(limViolation).toBeDefined()
    })

    it('(6) indicador "📄 Regra SGQ aplicada" mapeia documento + revisão + trecho + ação realizada', () => {
      const schedule: Partial<WeeklyScheduleItem>[] = [
        {
          id: 'item-1',
          schedule_code: 'WS-L1',
          company_code: 'CIAFAL',
          plant_code: 'PLANT1',
          line_code: 'L1',
          year: 2026,
          week_number: 20,
          day_of_week: 'SEG',
          date_str: '10/05',
          shift_code: 'T1',
          sequence_order: 1,
          item_type: 'SETUP',
          material_code: 'SETUP',
          setup_duration_minutes: 40,
          planned_quantity_tons: 0,
          status: 'DRAFT',
          version: 1,
          created: '2026-05-10',
          updated: '2026-05-10',
        },
      ]

      const validation = documentRulesEngine.validateDocumentRules(schedule, {
        lineCode: 'L1',
        lineDocs: mockLineDocs as any,
      })

      const impacts = documentRulesEngine.getItemImpacts(
        schedule[0],
        validation,
        mockLineDocs as any,
      )

      expect(impacts.length).toBeGreaterThan(0)
      expect(impacts[0].document_code).toBe('PO-LAM-014')
      expect(impacts[0].revision).toBe('Rev.04')
      expect(impacts[0].impact_realized).toContain('Adicionado setup de 40 minutos')
    })

    it('(7) snapshot imutável para aprovação congela regras e desfecho', () => {
      const validation = {
        passed: true,
        blocking_violations_count: 0,
        warnings_count: 0,
        recommendations_count: 1,
        rules_considered_count: 2,
        considered_documents: [
          { document_code: 'PO-LAM-014', revision: 'Rev.04', title: 'Laminação', rules_count: 2 },
        ],
        rules_satisfied: [],
        mandatory_violations: [],
        recommendations: [],
        parameters_used: [],
        conflicts: [],
      }

      const snap = documentRulesEngine.createRulesSnapshot(validation as any, {
        lineCode: 'L1',
        scheduleCode: 'WS-L1-2026-W20',
        versionNumber: 2,
        userEmail: 'planejador@ciafal.com.br',
      })

      expect(snap.snapshot_id).toContain('SNAP-DOC-')
      expect(snap.validation_outcome).toBe('APROVADO')
      expect(snap.version_number).toBe(2)
      expect(snap.documents_considered).toHaveLength(1)
    })
  })

  describe('4. Logs e Auditoria Completa (Requisito 12)', () => {
    it('(8) evento de processamento de IA e validação registrado em Logs & Auditoria com Antes x Depois', async () => {
      const auditSpy = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)
      vi.spyOn(pb, 'collection').mockReturnValue({
        getOne: vi.fn().mockResolvedValue({
          id: 'doc-123',
          interpreted_rules: { rules: [] },
        }),
        update: vi.fn().mockResolvedValue({
          id: 'doc-123',
          document_code: 'PO-LAM-014',
          revision: 'Rev.04',
          interference_categories: ['SEQUENCING'],
        }),
      } as any)

      await lineReferenceDocumentsService.saveInterpretedRules(
        'doc-123',
        { rules: [{ rule_id: 'R1' }] },
        { line_code: 'L1' },
      )

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'AI_OPTIMIZATION_RUN',
          action: expect.stringContaining('Processamento IA e Extração de Regras'),
          line: 'L1',
          screen: 'Documentos de Referência',
        }),
      )
    })
  })
})
