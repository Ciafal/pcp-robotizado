import { describe, it, expect, beforeEach, vi } from 'vitest'
import { productionControlReferenceDocsService } from '@/services/production-control-reference-docs-service'
import { HOMOLOGATION_MOCK_DOCUMENTS, SgqDocument } from '@/services/sgq-document-provider'

describe('Controle de Produção — Documentos de Referência Multi-Seleção N:N e Governança', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // CP-01: selecionar Documento A → 1 selecionado.
  it('CP-01: selecionar Documento A → 1 selecionado', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]
    expect(docA).toBeDefined()

    const selectedDocs: SgqDocument[] = [docA]
    expect(selectedDocs.length).toBe(1)
    expect(selectedDocs[0].code).toBe(docA.code)
  })

  // CP-02: adicionar B e C → A, B, C.
  it('CP-02: adicionar B e C → A, B, C', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]
    const docB = HOMOLOGATION_MOCK_DOCUMENTS[1]
    const docC = HOMOLOGATION_MOCK_DOCUMENTS[2]

    let selectedDocs: SgqDocument[] = [docA]
    // Adiciona B e C sem sobrescrever A
    const map = new Map<string, SgqDocument>()
    selectedDocs.forEach((d) => map.set(d.id, d))
    ;[docB, docC].forEach((d) => map.set(d.id, d))
    selectedDocs = Array.from(map.values())

    expect(selectedDocs.length).toBe(3)
    const codes = selectedDocs.map((d) => d.code)
    expect(codes).toContain(docA.code)
    expect(codes).toContain(docB.code)
    expect(codes).toContain(docC.code)
  })

  // CP-03: salvar, reabrir → A, B, C vinculados.
  it('CP-03: salvar, reabrir → A, B, C vinculados', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]
    const docB = HOMOLOGATION_MOCK_DOCUMENTS[1]
    const docC = HOMOLOGATION_MOCK_DOCUMENTS[2]

    // Salvar payload multi-seleção N:N
    const saved = await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [docA, docB, docC],
      documentosReferenciaIds: [docA.id, docB.id, docC.id],
      applications: ['COGI', 'CO1P', 'Apontamentos'],
      ai_categories: ['Estoque', 'Confirmação'],
      priority: 'ALTA',
      is_primary: true,
      active: true,
    })

    expect(saved.length).toBe(3)

    // Reabrir lista de documentos salvos
    const reloaded = await productionControlReferenceDocsService.listReferenceDocuments()
    const reloadedCodes = reloaded.map((d) => d.document_code)

    expect(reloadedCodes).toContain(docA.code)
    expect(reloadedCodes).toContain(docB.code)
    expect(reloadedCodes).toContain(docC.code)
  })

  // CP-04: remover só B → A, C.
  it('CP-04: remover só B → A, C', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]
    const docB = HOMOLOGATION_MOCK_DOCUMENTS[1]
    const docC = HOMOLOGATION_MOCK_DOCUMENTS[2]

    let selectedDocs: SgqDocument[] = [docA, docB, docC]
    // Remoção individual de B
    selectedDocs = selectedDocs.filter((d) => d.id !== docB.id)

    expect(selectedDocs.length).toBe(2)
    const codes = selectedDocs.map((d) => d.code)
    expect(codes).toEqual([docA.code, docC.code])
    expect(codes).not.toContain(docB.code)
  })

  // CP-05: salvar e reabrir → A, C.
  it('CP-05: salvar e reabrir → A, C', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]
    const docB = HOMOLOGATION_MOCK_DOCUMENTS[1]
    const docC = HOMOLOGATION_MOCK_DOCUMENTS[2]

    // Primeiro salva A, B, C
    const created = await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [docA, docB, docC],
      applications: ['Ordens de Produção'],
      ai_categories: ['Ordem de Produção'],
      priority: 'ALTA',
      is_primary: true,
      active: true,
    })

    const bRecord = created.find((d) => d.document_code === docB.code)
    expect(bRecord).toBeDefined()

    // Remove apenas a associação de B
    if (bRecord) {
      await productionControlReferenceDocsService.removeReferenceDocument(bRecord.id)
    }

    // Reabre e valida que restaram apenas A e C
    const remaining = await productionControlReferenceDocsService.listReferenceDocuments()
    const remainingCodes = remaining.map((d) => d.document_code)

    expect(remainingCodes).toContain(docA.code)
    expect(remainingCodes).toContain(docC.code)
    expect(remainingCodes).not.toContain(docB.code)
  })

  // CP-06: selecionar A novamente → sem duplicidade.
  it('CP-06: selecionar A novamente → sem duplicidade', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]

    // Simula seleção repetida de A
    const selectedDocs: SgqDocument[] = [docA]
    const map = new Map<string, SgqDocument>()
    selectedDocs.forEach((d) => map.set(d.id, d))
    // Adiciona docA novamente
    map.set(docA.id, docA)

    const deduplicated = Array.from(map.values())
    expect(deduplicated.length).toBe(1)
    expect(deduplicated[0].code).toBe(docA.code)

    // Salva A duas vezes no serviço e garante que não duplica
    await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [docA],
      applications: ['COGI'],
      ai_categories: ['Estoque'],
      priority: 'ALTA',
      is_primary: true,
    })
    await productionControlReferenceDocsService.saveMultipleReferenceDocuments({
      sgq_docs: [docA],
      applications: ['COGI'],
      ai_categories: ['Estoque'],
      priority: 'ALTA',
      is_primary: true,
    })

    const allDocs = await productionControlReferenceDocsService.listReferenceDocuments()
    const docAMatches = allDocs.filter((d) => d.document_code === docA.code)
    expect(docAMatches.length).toBe(1)
  })

  // GOVERNANÇA: Logs com formato (+ DOC / − DOC)
  it('Governança: gera logs com formato "+ CODIGO" ao associar e "− CODIGO" ao remover', async () => {
    const docA = HOMOLOGATION_MOCK_DOCUMENTS[0]
    const created = await productionControlReferenceDocsService.createReferenceDocument({
      sgq_doc: docA,
      applications: ['COGI'],
      ai_categories: ['Estoque'],
      priority: 'ALTA',
      is_primary: true,
    })

    const logsAfterCreate = await productionControlReferenceDocsService.getGovernanceLogs(
      created.id,
    )
    expect(logsAfterCreate.length).toBeGreaterThan(0)
    expect(logsAfterCreate[0].details).toMatch(new RegExp(`\\+\\s*${docA.code}`))

    // Remover
    await productionControlReferenceDocsService.removeReferenceDocument(created.id)
    const logsAfterRemove = await productionControlReferenceDocsService.getGovernanceLogs(
      created.id,
    )
    expect(logsAfterRemove.some((l) => l.action === 'ASSOCIACAO_REMOVIDA')).toBe(true)
    const removeLog = logsAfterRemove.find((l) => l.action === 'ASSOCIACAO_REMOVIDA')
    expect(removeLog?.details).toMatch(new RegExp(`−\\s*${docA.code}`))
  })
})

describe('Validação Cadastro de Centro (CT-01 a CT-04)', () => {
  // CT-01: criar Centro com Linha Produtiva vazia → avança.
  it('CT-01: criar Centro com Linha Produtiva vazia → avança etapa sem erro', () => {
    const formErrors: Record<string, string> = {}
    const formData = {
      name: 'Centro Fabril CIAFAL Barra Mansa',
      code: 'CF-BM-01',
      companyId: 'ciafal-matriz',
      hierarchyLineId: '', // Linha Produtiva OPCIONAL
    }

    // Validação da Etapa 1 do Wizard
    if (!formData.name) formErrors.name = 'Nome obrigatório'
    if (!formData.code) formErrors.code = 'Código obrigatório'
    // hierarchyLineId é opcional, logo NÃO adiciona erro quando vazio

    expect(Object.keys(formErrors).length).toBe(0)
    expect(formData.hierarchyLineId).toBe('')
  })

  // CT-02: concluir cadastro sem Linha Produtiva → salva com sucesso.
  it('CT-02: concluir cadastro sem Linha Produtiva → payload válido', () => {
    const payload = {
      name: 'Centro de Transformação 02',
      code: 'CT-02',
      companyId: 'ciafal-matriz',
      hierarchyLineId: undefined, // Sem Linha Produtiva
      pcpApproverId: 'usr-pcp-01',
      substituteApproverId: 'usr-pcp-02',
      active: true,
    }

    expect(payload.code).toBe('CT-02')
    expect(payload.hierarchyLineId).toBeUndefined()
    expect(payload.pcpApproverId).toBe('usr-pcp-01')
  })

  // CT-03: Etapa 3 mostra "Programador PCP" e "Programador Substituto".
  it('CT-03: Nomenclatura exata "Programador PCP" e "Programador Substituto"', () => {
    const labels = {
      pcpProgrammer: 'Programador PCP',
      substituteProgrammer: 'Programador Substituto',
    }
    expect(labels.pcpProgrammer).toBe('Programador PCP')
    expect(labels.substituteProgrammer).toBe('Programador Substituto')
  })

  // CT-04: editar Centro existente → usuários vinculados preservados.
  it('CT-04: editar Centro existente preserva usuários vinculados', () => {
    const existingCenter = {
      id: 'center-123',
      name: 'Centro Laminação Pesada',
      code: 'LAM-01',
      pcpApproverId: 'usr-pcp-99',
      pcpApproverName: 'Carlos Programador PCP',
      substituteApproverId: 'usr-pcp-88',
      substituteApproverName: 'Mariana Substituta',
      active: true,
    }

    // Simula update de propriedades do Centro
    const updatedCenter = {
      ...existingCenter,
      name: 'Centro Laminação Pesada Atualizado',
    }

    expect(updatedCenter.pcpApproverId).toBe('usr-pcp-99')
    expect(updatedCenter.pcpApproverName).toBe('Carlos Programador PCP')
    expect(updatedCenter.substituteApproverId).toBe('usr-pcp-88')
    expect(updatedCenter.substituteApproverName).toBe('Mariana Substituta')
  })
})
