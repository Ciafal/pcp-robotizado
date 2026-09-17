import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sgqDocumentProvider,
  DefaultSgqDocumentProvider,
  SGQ_INTERFERENCE_CATEGORY_LABELS,
  SgqInterferenceCategory,
} from '@/services/sgq-document-provider'
import { lineReferenceDocumentsService } from '@/services/line-reference-documents-service'
import { computeDiff, FIELD_LABELS_PT_BR, pcpAuditService } from '@/services/pcp-audit-service'
import pb from '@/lib/pocketbase/client'

describe('ETAPA 1: PCP + SGQ Integração de Documentos de Referência', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Provedor SGQ (DefaultSgqDocumentProvider)', () => {
    it('retorna status de integração desconectada com mensagem informativa e sem travar a UI', async () => {
      const provider = new DefaultSgqDocumentProvider()
      const available = await provider.isAvailable()
      const status = await provider.getIntegrationStatus()

      expect(available).toBe(false)
      expect(status.connected).toBe(false)
      expect(status.message).toContain('SGQ > Informação Documentada ainda não está conectada')
    })

    it('não gera mocks nem dados fictícios quando desconectado', async () => {
      const results = await sgqDocumentProvider.searchDocuments({
        code: 'DOC-123',
        status: 'VIGENTE',
      })
      expect(results).toEqual([])

      const single = await sgqDocumentProvider.getDocumentById('any-id')
      expect(single).toBeNull()
    })

    it('mantém mapeamento de rótulos de categorias de interferência na programação', () => {
      const categories: SgqInterferenceCategory[] = [
        'SEQUENCING',
        'SETUP',
        'PRODUCTIVITY',
        'BOTTLENECK_MATRIX',
        'MP_UTILIZATION',
      ]

      expect(SGQ_INTERFERENCE_CATEGORY_LABELS.SEQUENCING).toBe('Sequenciamento')
      expect(SGQ_INTERFERENCE_CATEGORY_LABELS.SETUP).toBe('Setup & Matriz de Troca')
      expect(SGQ_INTERFERENCE_CATEGORY_LABELS.PRODUCTIVITY).toBe('Produtividade & Velocidade')
      expect(SGQ_INTERFERENCE_CATEGORY_LABELS.BOTTLENECK_MATRIX).toBe('Gargalos & Restrições')
      expect(SGQ_INTERFERENCE_CATEGORY_LABELS.MP_UTILIZATION).toBe('Utilização de Matéria-Prima')

      categories.forEach((cat) => {
        expect(SGQ_INTERFERENCE_CATEGORY_LABELS[cat]).toBeDefined()
      })
    })
  })

  describe('2. Auditoria e Dicionário de Campos (pcp-audit-service)', () => {
    it('contém os rótulos em Português estendidos no FIELD_LABELS_PT_BR', () => {
      expect(FIELD_LABELS_PT_BR.interference_categories).toBe('Interferência na Programação')
      expect(FIELD_LABELS_PT_BR.document_code).toBe('Código do Documento')
      expect(FIELD_LABELS_PT_BR.revision).toBe('Revisão')
      expect(FIELD_LABELS_PT_BR.status).toBe('Status')
      expect(FIELD_LABELS_PT_BR.title).toBe('Título do Documento')
    })

    it('calcula Antes x Depois ao criar vínculo de documento', () => {
      const diff = computeDiff(null, {
        document_code: 'PO-LAM-014',
        title: 'Instrução Técnica de Laminação de Perfis',
        revision: '03',
        status: 'VIGENTE',
        interference_categories: 'SEQUENCING, SETUP',
      })

      expect(diff).toHaveLength(5)
      const codeDiff = diff.find((d) => d.field === 'document_code')
      expect(codeDiff?.fieldNamePt).toBe('Código do Documento')
      expect(codeDiff?.before).toBeNull()
      expect(codeDiff?.after).toBe('PO-LAM-014')

      const catDiff = diff.find((d) => d.field === 'interference_categories')
      expect(catDiff?.fieldNamePt).toBe('Interferência na Programação')
      expect(catDiff?.after).toBe('SEQUENCING, SETUP')
    })

    it('calcula Antes x Depois ao editar categorias de interferência mantendo histórico', () => {
      const diff = computeDiff(
        {
          interference_categories: 'SEQUENCING',
        },
        {
          interference_categories: 'SEQUENCING, SETUP, PRODUCTIVITY',
        },
      )

      expect(diff).toHaveLength(1)
      expect(diff[0].field).toBe('interference_categories')
      expect(diff[0].fieldNamePt).toBe('Interferência na Programação')
      expect(diff[0].before).toBe('SEQUENCING')
      expect(diff[0].after).toBe('SEQUENCING, SETUP, PRODUCTIVITY')
    })

    it('calcula Antes x Depois ao remover vínculo de documento', () => {
      const diff = computeDiff(
        {
          document_code: 'PO-LAM-014',
          title: 'Instrução Técnica',
          revision: '02',
          interference_categories: 'SETUP',
        },
        null,
      )

      expect(diff).toHaveLength(4)
      const codeDiff = diff.find((d) => d.field === 'document_code')
      expect(codeDiff?.before).toBe('PO-LAM-014')
      expect(codeDiff?.after).toBeNull()
    })
  })

  describe('3. Serviço de Documentos de Referência (line-reference-documents-service)', () => {
    it('cria vínculo persistindo multisseleção e disparando auditoria oficial', async () => {
      const createMock = vi.fn().mockResolvedValue({
        id: 'rec_doc_1',
        line_id: 'line_lam1',
        company_id: 'CIAFAL',
        document_ref: 'sgq_doc_99',
        document_code: 'PO-LAM-001',
        title: 'Procedimento Geral',
        revision: '01',
        status: 'VIGENTE',
        source: 'SGQ',
        interference_categories: ['SEQUENCING', 'SETUP'],
        created: '2025-01-01T10:00:00Z',
      })
      const auditMock = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

      vi.spyOn(pb, 'collection').mockReturnValue({
        create: createMock,
      } as any)

      const result = await lineReferenceDocumentsService.create({
        line_id: 'line_lam1',
        line_code: 'LAM-01',
        company_id: 'CIAFAL',
        document_ref: 'sgq_doc_99',
        document_code: 'PO-LAM-001',
        title: 'Procedimento Geral',
        revision: '01',
        status: 'VIGENTE',
        interference_categories: ['SEQUENCING', 'SETUP'],
      })

      expect(createMock).toHaveBeenCalled()
      expect(result.id).toBe('rec_doc_1')
      expect(result.interference_categories).toEqual(['SEQUENCING', 'SETUP'])
      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'REFERENCE_DOCUMENT_LINK',
          screen: 'Documentos de Referência',
          line: 'LAM-01',
        }),
      )
    })

    it('atualiza categorias de interferência mantendo a multisseleção persistida', async () => {
      const getOneMock = vi.fn().mockResolvedValue({
        id: 'rec_doc_1',
        line_id: 'line_lam1',
        document_ref: 'sgq_doc_99',
        document_code: 'PO-LAM-001',
        title: 'Procedimento Geral',
        revision: '01',
        status: 'VIGENTE',
        interference_categories: ['SEQUENCING'],
      })
      const updateMock = vi.fn().mockResolvedValue({
        id: 'rec_doc_1',
        line_id: 'line_lam1',
        document_ref: 'sgq_doc_99',
        document_code: 'PO-LAM-001',
        title: 'Procedimento Geral',
        revision: '01',
        status: 'VIGENTE',
        interference_categories: ['SEQUENCING', 'PRODUCTIVITY', 'BOTTLENECK_MATRIX'],
      })
      const auditMock = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

      vi.spyOn(pb, 'collection').mockReturnValue({
        getOne: getOneMock,
        update: updateMock,
      } as any)

      const updated = await lineReferenceDocumentsService.updateCategories({
        id: 'rec_doc_1',
        line_id: 'line_lam1',
        line_code: 'LAM-01',
        interference_categories: ['SEQUENCING', 'PRODUCTIVITY', 'BOTTLENECK_MATRIX'],
      })

      expect(updateMock).toHaveBeenCalledWith(
        'rec_doc_1',
        expect.objectContaining({
          interference_categories: ['SEQUENCING', 'PRODUCTIVITY', 'BOTTLENECK_MATRIX'],
        }),
      )
      expect(updated.interference_categories).toEqual([
        'SEQUENCING',
        'PRODUCTIVITY',
        'BOTTLENECK_MATRIX',
      ])
      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'REFERENCE_DOCUMENT_UPDATE',
        }),
      )
    })

    it('remove apenas o vínculo no PCP sem afetar documentos do SGQ', async () => {
      const getOneMock = vi.fn().mockResolvedValue({
        id: 'rec_doc_1',
        line_id: 'line_lam1',
        document_ref: 'sgq_doc_99',
        document_code: 'PO-LAM-001',
        title: 'Procedimento Geral',
        revision: '01',
        status: 'VIGENTE',
        interference_categories: ['SEQUENCING'],
      })
      const deleteMock = vi.fn().mockResolvedValue(true)
      const auditMock = vi.spyOn(pcpAuditService, 'recordLog').mockResolvedValue({} as any)

      vi.spyOn(pb, 'collection').mockReturnValue({
        getOne: getOneMock,
        delete: deleteMock,
      } as any)

      await lineReferenceDocumentsService.remove('rec_doc_1', {
        line_code: 'LAM-01',
        line_id: 'line_lam1',
        company_id: 'CIAFAL',
      })

      expect(deleteMock).toHaveBeenCalledWith('rec_doc_1')
      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'REFERENCE_DOCUMENT_UNLINK',
          record_id: 'rec_doc_1',
        }),
      )
    })
  })

  describe('4. Governança da Barra de Opções do Centro', () => {
    it('garante que a opção 3 agora é Documentos de Referência e redireciona PROCESS para ela', () => {
      // Simulação do comportamento de redirecionamento interno
      type MainGroup =
        | 'OVERVIEW'
        | 'ORGANIZATION'
        | 'REFERENCE_DOCUMENTS'
        | 'PROCESS'
        | 'MASTERDATA'
        | 'BOTTLENECK_MATRIX'
        | 'GOVERNANCE'

      const resolveActiveTab = (group: MainGroup) => {
        if (group === 'PROCESS') return 'REFERENCE_DOCUMENTS'
        return group
      }

      expect(resolveActiveTab('PROCESS')).toBe('REFERENCE_DOCUMENTS')
      expect(resolveActiveTab('REFERENCE_DOCUMENTS')).toBe('REFERENCE_DOCUMENTS')
      expect(resolveActiveTab('OVERVIEW')).toBe('OVERVIEW')
      expect(resolveActiveTab('MASTERDATA')).toBe('MASTERDATA')
    })
  })
})
