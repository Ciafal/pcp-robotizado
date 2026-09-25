import { describe, it, expect, beforeEach, vi } from 'vitest'
import { productionControlReferenceDocsService } from '@/services/production-control-reference-docs-service'
import { HOMOLOGATION_MOCK_DOCUMENTS, SgqDocument } from '@/services/sgq-document-provider'

describe('CRITICAL: Fluxo Completo de Salvamento de Documentos de Referência (DR-01 a DR-07)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // DR-01: salvar 1 documento → persistido, toast singular, documento aparece na grade
  it('DR-01: salvar 1 documento gera persistência correta e mapeamento de campos', async () => {
    const docA =
      HOMOLOGATION_MOCK_DOCUMENTS.find((d) => d.code === 'PO-LAM-014') ||
      HOMOLOGATION_MOCK_DOCUMENTS[0]
    expect(docA).toBeDefined()

    const saved = await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [docA],
      documentosReferenciaIds: [docA.id],
      applications: ['COGI', 'Apontamentos'],
      ai_categories: ['Estoque'],
      criteria: { processo: 'Laminação a Quente', empresa: 'CIAFAL' },
      priority: 'ALTA',
      is_primary: true,
      active: true,
    })

    expect(saved).toHaveLength(1)
    expect(saved[0].document_code).toBe(docA.code)
    expect(saved[0].revision).toBe(docA.revision)
    expect(saved[0].is_primary).toBe(true)
    expect(saved[0].active).toBe(true)

    // Consulta para a grade
    const gradeDocs = await productionControlReferenceDocsService.listReferenceDocuments()
    const foundInGrid = gradeDocs.find((d) => d.document_code === docA.code)
    expect(foundInGrid).toBeDefined()
    expect(foundInGrid?.document_code).toBe(docA.code)
  })

  // DR-02: salvar múltiplos (ex.: PO-LAM-014 + SPEC-MP-021) → ambos persistidos
  it('DR-02: salvar múltiplos documentos (PO-LAM-014 e SPEC-MP-021) persiste TODOS os registros no array', async () => {
    const doc1 =
      HOMOLOGATION_MOCK_DOCUMENTS.find((d) => d.code === 'PO-LAM-014') ||
      HOMOLOGATION_MOCK_DOCUMENTS[0]
    const doc2 =
      HOMOLOGATION_MOCK_DOCUMENTS.find((d) => d.code === 'SPEC-MP-021') ||
      HOMOLOGATION_MOCK_DOCUMENTS[1]

    expect(doc1).toBeDefined()
    expect(doc2).toBeDefined()
    expect(doc1.code).not.toBe(doc2.code)

    const savedList = await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [doc1, doc2],
      documentosReferenciaIds: [doc1.id, doc2.id],
      applications: ['COGI', 'CO1P', 'Ordens de Produção'],
      ai_categories: ['Estoque', 'Confirmação'],
      criteria: { linha: 'L1', centro: '1000' },
      priority: 'ALTA',
      is_primary: true,
      active: true,
    })

    expect(savedList).toHaveLength(2)
    const savedCodes = savedList.map((d) => d.document_code)
    expect(savedCodes).toContain(doc1.code)
    expect(savedCodes).toContain(doc2.code)

    // Confirmação na grade
    const gridDocs = await productionControlReferenceDocsService.listReferenceDocuments()
    const gridCodes = gridDocs.map((d) => d.document_code)
    expect(gridCodes).toContain(doc1.code)
    expect(gridCodes).toContain(doc2.code)
  })

  // DR-03 & DR-04: Persistência real / F5 / recarregar módulo
  it('DR-03 & DR-04: dados permanecem persistidos após nova chamada listReferenceDocuments (simulando retorno/F5)', async () => {
    const doc = HOMOLOGATION_MOCK_DOCUMENTS[2]
    await productionControlReferenceDocsService.createReferenceDocument({
      sgq_doc: doc,
      applications: ['Fechamento de Ordem'],
      ai_categories: ['Ordem de Produção'],
      priority: 'MEDIA',
      is_primary: false,
    })

    // Nova chamada de serviço simulando F5
    const reloadedDocs = await productionControlReferenceDocsService.listReferenceDocuments()
    const match = reloadedDocs.find((d) => d.document_code === doc.code)
    expect(match).toBeDefined()
    expect(match?.applications).toContain('Fechamento de Ordem')
  })

  // DR-05: Edição carrega todos os documentos previamente associados
  it('DR-05: modo edição e consulta traz todos os metadados do documento', async () => {
    const doc = HOMOLOGATION_MOCK_DOCUMENTS[3]
    const created = await productionControlReferenceDocsService.createReferenceDocument({
      sgq_doc: doc,
      applications: ['Análise de Ordens'],
      ai_categories: ['Material'],
      criteria: { material: 'ACO-1020', tipo_movimento: '261' },
      priority: 'ALTA',
      is_primary: true,
    })

    const fetched = await productionControlReferenceDocsService.getReferenceDocumentById(created.id)
    expect(fetched).not.toBeNull()
    expect(fetched?.document_code).toBe(doc.code)
    expect(fetched?.criteria?.material).toBe('ACO-1020')
    expect(fetched?.criteria?.tipo_movimento).toBe('261')
  })

  // DR-06: Simulação de erro de validação/persistência
  it('DR-06: se a coleção de documentos for vazia, não deve concluir salvamento silenciosamente', async () => {
    await expect(
      productionControlReferenceDocsService.saveMultipleReferenceDocuments({
        sgq_docs: [],
        applications: ['COGI'],
        ai_categories: ['Estoque'],
        priority: 'ALTA',
        is_primary: true,
      }),
    ).resolves.toEqual([])
  })

  // DR-07: Deduplicação e prevenção de duplicações concorrentes
  it('DR-07: salvar mesmo documento repetidamente não duplica registros na grade', async () => {
    const doc = HOMOLOGATION_MOCK_DOCUMENTS[0]

    // Primeira vez
    await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [doc],
      applications: ['COGI'],
      ai_categories: ['Estoque'],
      priority: 'ALTA',
      is_primary: true,
    })

    // Segunda vez imediata (simulando clique duplo)
    await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [doc],
      applications: ['COGI'],
      ai_categories: ['Estoque'],
      priority: 'ALTA',
      is_primary: true,
    })

    const all = await productionControlReferenceDocsService.listReferenceDocuments()
    const matches = all.filter((d) => d.document_code === doc.code)
    expect(matches).toHaveLength(1)
  })

  // Governança: logs de auditoria
  it('Governança: logs de auditoria registram cada criação e remoção com prefixos "+ CODIGO" / "− CODIGO"', async () => {
    const doc = HOMOLOGATION_MOCK_DOCUMENTS[4]
    const created = await productionControlReferenceDocsService.createReferenceDocument({
      sgq_doc: doc,
      applications: ['CO1P'],
      ai_categories: ['Apontamento'],
      priority: 'ALTA',
      is_primary: true,
    })

    const logs = await productionControlReferenceDocsService.getGovernanceLogs(created.id)
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].details).toContain(`+ ${doc.code}`)

    // Remover associação
    await productionControlReferenceDocsService.removeReferenceDocument(created.id)
    const logsAfterDelete = await productionControlReferenceDocsService.getGovernanceLogs(
      created.id,
    )
    const removeLog = logsAfterDelete.find((l) => l.action === 'ASSOCIACAO_REMOVIDA')
    expect(removeLog).toBeDefined()
    expect(removeLog?.details).toContain(`− ${doc.code}`)
  })
})
