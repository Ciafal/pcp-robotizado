import pb from '@/lib/pocketbase/client'
import {
  ProductionReferenceDocument,
  ProductionReferenceGovernanceLog,
  ProductionProposedAiAction,
  ProductionAiActionContext,
  ProductionTreatmentRecordInput,
  ProductionTreatmentHistoryItem,
} from '@/types/production-reference-documents'
import { SgqDocument, HOMOLOGATION_MOCK_DOCUMENTS } from './sgq-document-provider'

// Coleção canônica inicial de documentos de referência do Controle de Produção CIAFAL
const INITIAL_PRODUCTION_REFERENCE_DOCS: ProductionReferenceDocument[] = [
  {
    id: 'prd-ref-001',
    document_ref: 'SGQ-DOC-005',
    document_code: 'PO-EST-005',
    title: 'Procedimento Operacional de Regularização e Ajuste de Divergência de Estoque',
    revision: 'Rev.03',
    revision_date: '2024-03-10',
    status: 'VIGENTE',
    document_type: 'Procedimento Operacional (PO)',
    process: 'Controle de Estoque & Expedição',
    responsible_area: 'Estoque Central',
    validity_date_start: '2024-03-10',
    validity_date_end: '2026-12-31',
    document_author: 'Coordenação de Almoxarifado',
    source: 'SGQ > Informação Documentada (Oficial)',
    original_url: 'https://sgq.ciafal.internal/docs/PO-EST-005-rev03.pdf',
    last_sync_at: '2025-01-10T08:00:00.000Z',
    applications: ['COGI', 'Estoque', 'Reserva', 'Material', 'Divergência de quantidade'],
    ai_categories: ['Estoque', 'Saldo/Reserva', 'Material'],
    criteria: {
      processo: 'Movimentação de Mercadorias',
      codigo_mensagem_sap: 'M7021',
      tipo_movimento: '261',
    },
    priority: 'ALTA',
    is_primary: true,
    active: true,
    has_new_revision_available: false,
    extractable_content: `
[PO-EST-005 Rev.03 - PROCEDIMENTO OPERACIONAL DE REGULARIZAÇÃO DE ESTOQUE]
Item 4.2 - Tratamento de Divergência de Saldo para Movimento 261:
1. Validar saldo físico no depósito de consumo antes de qualquer movimentação sistêmica.
2. Se o material estiver fisicamente presente em depósito intermediário ou pulmão, efetuar transferência sistêmica 311 para o depósito da OP.
3. Se constatada divergência real de inventário, abrir chamado de conferência ao Almoxarifado Central.
4. É proibida a realização de apontamento fictício ou alteração de lote sem validação física.
5. Após regularização do saldo, solicitar reprocessamento da pendência COGI.
    `.trim(),
    created_by_user_name: 'Administrador SGQ',
    created: '2024-03-10T08:00:00.000Z',
    updated: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'prd-ref-002',
    document_ref: 'SGQ-DOC-018',
    document_code: 'IT-GQ-018',
    title: 'Instrução de Trabalho — Gestão e Desbloqueio de Lotes Retidos pela Qualidade',
    revision: 'Rev.02',
    revision_date: '2024-02-15',
    status: 'VIGENTE',
    document_type: 'Instrução de Trabalho (IT)',
    process: 'Garantia da Qualidade Industrial',
    responsible_area: 'Qualidade Assegurada',
    validity_date_start: '2024-02-15',
    validity_date_end: '2026-06-30',
    document_author: 'Engenharia de Qualidade',
    source: 'SGQ > Informação Documentada (Oficial)',
    original_url: 'https://sgq.ciafal.internal/docs/IT-GQ-018-rev02.pdf',
    last_sync_at: '2025-01-10T08:00:00.000Z',
    applications: ['COGI', 'Lote', 'Material', 'Análise de Ordens'],
    ai_categories: ['Lote', 'Material'],
    criteria: {
      processo: 'Inspeção Metalúrgica',
      codigo_mensagem_sap: 'M7043',
      tipo_movimento: '261',
    },
    priority: 'ALTA',
    is_primary: true,
    active: true,
    has_new_revision_available: false,
    extractable_content: `
[IT-GQ-018 Rev.02 - GESTÃO E DESBLOQUEIO DE LOTES RETIDOS]
Item 5 - Análise do Motivo de Retenção de Lotes:
1. Consultar status de inspeção do lote na transação SAP QA33 ou MSC3N.
2. Identificar se a retenção decorre de ensaios mecânicos pendentes (tração/escoamento) ou de não conformidade dimensional.
3. Notificar o inspetor de qualidade responsável da área metalúrgica.
4. Desbloqueios no SAP (movimento 321) só podem ser efetuados pelo setor de Qualidade Assegurada credenciado.
5. Em caso de liberação condicional, registrar número do parecer técnico no PCP.
    `.trim(),
    created_by_user_name: 'Administrador SGQ',
    created: '2024-02-15T08:00:00.000Z',
    updated: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'prd-ref-003',
    document_ref: 'SGQ-DOC-012',
    document_code: 'PO-PCP-012',
    title: 'Procedimento Operacional de Processamento Posterior de Confirmações (CO1P/CO14)',
    revision: 'Rev.01',
    revision_date: '2024-01-20',
    status: 'VIGENTE',
    document_type: 'Procedimento Operacional (PO)',
    process: 'Controle e Apontamento de Produção',
    responsible_area: 'PCP Central',
    validity_date_start: '2024-01-20',
    validity_date_end: '2026-01-20',
    document_author: 'Coordenação de PCP',
    source: 'SGQ > Informação Documentada (Oficial)',
    original_url: 'https://sgq.ciafal.internal/docs/PO-PCP-012-rev01.pdf',
    last_sync_at: '2025-01-10T08:00:00.000Z',
    applications: [
      'CO1P',
      'Confirmação de Produção',
      'Apontamentos',
      'Erro de Apontamento',
      'Reprocessamento',
    ],
    ai_categories: ['Confirmação', 'Apontamento'],
    criteria: {
      processo: 'Processamento Posterior de Confirmação',
      codigo_mensagem_sap: 'RU010',
      transacao_origem: 'CO1P',
    },
    priority: 'ALTA',
    is_primary: true,
    active: true,
    has_new_revision_available: false,
    extractable_content: `
[PO-PCP-012 Rev.01 - PROCESSAMENTO POSTERIOR DE CONFIRMAÇÕES CO1P]
Item 6 - Desacoplamento e Baixa Retroativa por Explosão:
1. Identificar a cadeia de rastreabilidade: Ordem -> Confirmação -> Contador -> Reserva.
2. Verificar se a falha decorreu de bloqueio de encadeamento na operação anterior ou falta de saldo nos componentes da lista técnica.
3. Sanar preliminarmente as pendências de estoque de componentes (COGI).
4. O reprocessamento no SAP deve ser realizado na transação CO1P selecionando a confirmação individual e acionando 'Processar'.
5. Não forçar encerramento técnico de ordem com pendências CO1P ativas.
    `.trim(),
    created_by_user_name: 'Administrador SGQ',
    created: '2024-01-20T08:00:00.000Z',
    updated: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'prd-ref-004',
    document_ref: 'SGQ-DOC-001',
    document_code: 'PO-CAD-001',
    title: 'Diretriz de Dados Mestres de Materiais e Visões de Produção SAP',
    revision: 'Rev.05',
    revision_date: '2024-04-01',
    status: 'VIGENTE',
    document_type: 'Procedimento Operacional (PO)',
    process: 'Administração de Dados Mestres',
    responsible_area: 'Cadastro',
    validity_date_start: '2024-04-01',
    validity_date_end: '2026-12-31',
    document_author: 'Gerência de TI e Processos',
    source: 'SGQ > Informação Documentada (Oficial)',
    original_url: 'https://sgq.ciafal.internal/docs/PO-CAD-001-rev05.pdf',
    last_sync_at: '2025-01-10T08:00:00.000Z',
    applications: ['Cadastro', 'Material', 'Centro', 'Integração SAP', 'Análise de Ordens'],
    ai_categories: ['Cadastro', 'Material', 'Integração'],
    criteria: {
      processo: 'Validação de Dados Mestres',
      codigo_mensagem_sap: 'M3018',
    },
    priority: 'MEDIA',
    is_primary: true,
    active: true,
    has_new_revision_available: false,
    extractable_content: `
[PO-CAD-001 Rev.05 - DIRETRIZ DE DADOS MESTRES SAP]
Seção 2.1 - Ampliação e Visões de Produção:
1. Todo material produzido deve possuir visões ativas de Dados Básicos, MRP 1 a 4, Preparação do Trabalho e Contabilidade/Custos.
2. O erro M3018 indica ausência de dados do material para o centro correspondente da ordem de produção.
3. Encaminhar solicitação de ampliação via formulário ZCAD para a equipe de Cadastro Central.
4. Após confirmação de ampliação pelo cadastro, validar status na MM03 antes de reprocessar apontamento ou ordem.
    `.trim(),
    created_by_user_name: 'Administrador SGQ',
    created: '2024-04-01T08:00:00.000Z',
    updated: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'prd-ref-005',
    document_ref: 'SGQ-DOC-007',
    document_code: 'PO-PRD-007',
    title: 'Gestão do Ciclo de Vida de Ordens de Produção (Liberação, Apontamento e TECO)',
    revision: 'Rev.03',
    revision_date: '2023-11-20',
    status: 'VIGENTE',
    document_type: 'Procedimento Operacional (PO)',
    process: 'Controle de Chão de Fábrica',
    responsible_area: 'Produção',
    validity_date_start: '2023-11-20',
    validity_date_end: '2025-12-31',
    document_author: 'Engenharia de Fabricação',
    source: 'SGQ > Informação Documentada (Oficial)',
    original_url: 'https://sgq.ciafal.internal/docs/PO-PRD-007-rev03.pdf',
    last_sync_at: '2025-01-10T08:00:00.000Z',
    applications: [
      'Ordens de Produção',
      'Fechamento de Ordem',
      'Análise de Ordens',
      'Apontamentos',
    ],
    ai_categories: ['Ordem de Produção', 'Apontamento'],
    criteria: {
      processo: 'Ciclo de Ordem',
      codigo_mensagem_sap: 'CO101',
    },
    priority: 'ALTA',
    is_primary: true,
    active: true,
    has_new_revision_available: false,
    extractable_content: `
[PO-PRD-007 Rev.03 - CICLO DE VIDA DE ORDENS DE PRODUÇÃO]
Seção 4 - Status de Sistema e Encerramento Técnico:
1. Uma ordem em status TECO (Encerrada Tecnicamente) não aceita apontamentos nem movimentações posteriores.
2. Em caso de divergência de status na CO02, verificar se o lote de produção foi finalizado ou se há necessidade de revogar TECO.
3. Revogação de TECO exige autorização do Coordenador de PCP.
4. Validar saldo residual de componentes e fechar pendências COGI antes do encerramento contábil final.
    `.trim(),
    created_by_user_name: 'Administrador SGQ',
    created: '2023-11-20T08:00:00.000Z',
    updated: '2025-01-10T08:00:00.000Z',
  },
  {
    id: 'prd-ref-006',
    document_ref: 'SGQ-DOC-002',
    document_code: 'PO-CTB-002',
    title: 'Norma de Encerramento Contábil e Abertura de Períodos de Lançamento',
    revision: 'Rev.04',
    revision_date: '2024-01-05',
    status: 'VIGENTE',
    document_type: 'Norma Operacional (NO)',
    process: 'Controladoria & Contabilidade de Custos',
    responsible_area: 'Contabilidade',
    validity_date_start: '2024-01-05',
    validity_date_end: '2026-12-31',
    document_author: 'Controladoria Geral',
    source: 'SGQ > Informação Documentada (Oficial)',
    original_url: 'https://sgq.ciafal.internal/docs/PO-CTB-002-rev04.pdf',
    last_sync_at: '2025-01-10T08:00:00.000Z',
    applications: ['Contábil', 'COGI', 'Fechamento de Ordem'],
    ai_categories: ['Contábil'],
    criteria: {
      processo: 'Validação Contábil de Fechamento',
      codigo_mensagem_sap: 'M7053',
      tipo_movimento: '101',
    },
    priority: 'ALTA',
    is_primary: true,
    active: true,
    has_new_revision_available: false,
    extractable_content: `
[PO-CTB-002 Rev.04 - ENCERRAMENTO CONTÁBIL]
Seção 3.4 - Tratamento de Lançamentos em Período Bloqueado:
1. Validar a data de competência contábil do apontamento físico.
2. Contatar a Controladoria e Contabilidade para liberação transitória das transações MMRV ou OB52.
3. Não forçar lançamento contábil em conta divergente sem aprovação expressa.
    `.trim(),
    created_by_user_name: 'Administrador SGQ',
    created: '2024-01-05T08:00:00.000Z',
    updated: '2025-01-10T08:00:00.000Z',
  },
]

// Armazenamento em memória com persistência local caso PocketBase esteja indisponível
const LOCAL_STORAGE_KEY_DOCS = 'pcp_production_reference_documents_cache'
const LOCAL_STORAGE_KEY_LOGS = 'pcp_production_reference_governance_logs_cache'
const LOCAL_STORAGE_KEY_TREATMENTS = 'pcp_production_treatment_history_cache'

class ProductionControlReferenceDocsService {
  private inMemoryDocs: ProductionReferenceDocument[] = []
  private inMemoryLogs: ProductionReferenceGovernanceLog[] = []
  private inMemoryTreatments: ProductionTreatmentHistoryItem[] = []

  constructor() {
    this.initStorage()
  }

  private initStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedDocs = localStorage.getItem(LOCAL_STORAGE_KEY_DOCS)
        if (savedDocs) {
          this.inMemoryDocs = JSON.parse(savedDocs)
        } else {
          this.inMemoryDocs = [...INITIAL_PRODUCTION_REFERENCE_DOCS]
          localStorage.setItem(LOCAL_STORAGE_KEY_DOCS, JSON.stringify(this.inMemoryDocs))
        }

        const savedLogs = localStorage.getItem(LOCAL_STORAGE_KEY_LOGS)
        if (savedLogs) {
          this.inMemoryLogs = JSON.parse(savedLogs)
        }

        const savedTreat = localStorage.getItem(LOCAL_STORAGE_KEY_TREATMENTS)
        if (savedTreat) {
          this.inMemoryTreatments = JSON.parse(savedTreat)
        }
      } catch {
        this.inMemoryDocs = [...INITIAL_PRODUCTION_REFERENCE_DOCS]
      }
    } else {
      this.inMemoryDocs = [...INITIAL_PRODUCTION_REFERENCE_DOCS]
    }
  }

  private persistLocal() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_DOCS, JSON.stringify(this.inMemoryDocs))
        localStorage.setItem(LOCAL_STORAGE_KEY_LOGS, JSON.stringify(this.inMemoryLogs))
        localStorage.setItem(LOCAL_STORAGE_KEY_TREATMENTS, JSON.stringify(this.inMemoryTreatments))
      } catch {
        // ignore storage errors
      }
    }
  }

  /**
   * Lista todos os Documentos de Referência associados ao Controle de Produção
   */
  async listReferenceDocuments(): Promise<ProductionReferenceDocument[]> {
    try {
      const records = await pb.collection('pcp_production_reference_documents').getFullList({
        sort: '-is_primary,-priority,document_code',
      })
      if (records && records.length > 0) {
        return records.map(this.mapRecordToDoc)
      }
    } catch {
      // Backend offline / coleção ainda não provisionada: fallback para memória local resiliente
    }
    return [...this.inMemoryDocs]
  }

  /**
   * Adiciona uma nova associação oficial do SGQ para o Controle de Produção
   */
  async createReferenceDocument(input: {
    sgq_doc: SgqDocument
    applications: ProductionReferenceDocument['applications']
    ai_categories: ProductionReferenceDocument['ai_categories']
    criteria?: ProductionReferenceDocument['criteria']
    priority: ProductionReferenceDocument['priority']
    is_primary: boolean
    active?: boolean
  }): Promise<ProductionReferenceDocument> {
    const user = pb.authStore.record
    const userName = user?.name || (user?.email ? user.email.split('@')[0] : 'Usuário PCP')
    const userId = user?.id || ''

    const newDoc: ProductionReferenceDocument = {
      id: `prd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      document_ref: input.sgq_doc.id,
      document_code: input.sgq_doc.code,
      title: input.sgq_doc.title,
      revision: input.sgq_doc.revision,
      revision_date: input.sgq_doc.validityDateStart || input.sgq_doc.lastUpdatedAt || '2024-01-01',
      status: input.sgq_doc.status,
      document_type: input.sgq_doc.documentType || 'Procedimento',
      process: input.sgq_doc.process || 'Controle de Produção',
      responsible_area: input.sgq_doc.responsibleArea || 'PCP',
      validity_date_start: input.sgq_doc.validityDateStart,
      validity_date_end: input.sgq_doc.validityDateEnd,
      document_author: input.sgq_doc.responsibleArea || 'Gestão da Qualidade',
      source: 'SGQ > Informação Documentada (Oficial)',
      original_url: input.sgq_doc.originalUrl || '',
      last_sync_at: new Date().toISOString(),
      applications: input.applications,
      ai_categories: input.ai_categories,
      criteria: input.criteria,
      priority: input.priority,
      is_primary: input.is_primary,
      active: input.active !== undefined ? input.active : true,
      has_new_revision_available: false,
      extractable_content: input.sgq_doc.extractableContent || '',
      created_by_user_id: userId,
      created_by_user_name: userName,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }

    try {
      const record = await pb.collection('pcp_production_reference_documents').create(newDoc)
      const mapped = this.mapRecordToDoc(record)
      await this.recordGovernanceLog({
        reference_document_id: mapped.id,
        document_code: mapped.document_code,
        revision: mapped.revision,
        action: 'ASSOCIACAO_CRIADA',
        applications: mapped.applications,
        categories: mapped.ai_categories,
        criteria: mapped.criteria,
        priority: mapped.priority,
        is_primary: mapped.is_primary,
        new_value: mapped,
        details: `Associação oficial criada por ${userName}.`,
      })
      return mapped
    } catch {
      // Fallback local
      this.inMemoryDocs.unshift(newDoc)
      await this.recordGovernanceLog({
        reference_document_id: newDoc.id,
        document_code: newDoc.document_code,
        revision: newDoc.revision,
        action: 'ASSOCIACAO_CRIADA',
        applications: newDoc.applications,
        categories: newDoc.ai_categories,
        criteria: newDoc.criteria,
        priority: newDoc.priority,
        is_primary: newDoc.is_primary,
        new_value: newDoc,
        details: `Associação oficial criada por ${userName} (armazenamento resiliente).`,
      })
      this.persistLocal()
      return newDoc
    }
  }

  /**
   * Atualiza uma associação existente
   */
  async updateReferenceDocument(
    id: string,
    updates: Partial<ProductionReferenceDocument>,
  ): Promise<ProductionReferenceDocument> {
    const existing = await this.getReferenceDocumentById(id)
    if (!existing) {
      throw new Error(`Documento de referência ${id} não encontrado.`)
    }

    const user = pb.authStore.record
    const userName = user?.name || 'Usuário PCP'

    const updated = {
      ...existing,
      ...updates,
      updated: new Date().toISOString(),
    }

    try {
      const record = await pb.collection('pcp_production_reference_documents').update(id, updates)
      const mapped = this.mapRecordToDoc(record)
      await this.recordGovernanceLog({
        reference_document_id: id,
        document_code: mapped.document_code,
        revision: mapped.revision,
        action: 'ASSOCIACAO_ATUALIZADA',
        applications: mapped.applications,
        categories: mapped.ai_categories,
        criteria: mapped.criteria,
        priority: mapped.priority,
        is_primary: mapped.is_primary,
        previous_value: existing,
        new_value: mapped,
        details: `Associação atualizada por ${userName}.`,
      })
      return mapped
    } catch {
      const idx = this.inMemoryDocs.findIndex((d) => d.id === id)
      if (idx !== -1) {
        this.inMemoryDocs[idx] = updated
        this.persistLocal()
      }
      await this.recordGovernanceLog({
        reference_document_id: id,
        document_code: updated.document_code,
        revision: updated.revision,
        action: 'ASSOCIACAO_ATUALIZADA',
        applications: updated.applications,
        categories: updated.ai_categories,
        criteria: updated.criteria,
        priority: updated.priority,
        is_primary: updated.is_primary,
        previous_value: existing,
        new_value: updated,
        details: `Associação atualizada por ${userName} (armazenamento resiliente).`,
      })
      return updated
    }
  }

  /**
   * Alterna status Ativo/Inativo da associação
   */
  async toggleActive(id: string): Promise<ProductionReferenceDocument> {
    const doc = await this.getReferenceDocumentById(id)
    if (!doc) throw new Error('Documento não encontrado')
    const newActive = !doc.active
    const action = newActive ? 'ASSOCIACAO_REATIVADA' : 'ASSOCIACAO_INATIVADA'

    return this.updateReferenceDocument(id, { active: newActive })
  }

  /**
   * Remove a associação do Controle de Produção
   * REGRA OBRIGATÓRIA: NUNCA exclui o documento original do SGQ
   */
  async removeReferenceDocument(id: string): Promise<void> {
    const existing = await this.getReferenceDocumentById(id)
    if (!existing) return

    const user = pb.authStore.record
    const userName = user?.name || 'Usuário PCP'

    try {
      await pb.collection('pcp_production_reference_documents').delete(id)
    } catch {
      this.inMemoryDocs = this.inMemoryDocs.filter((d) => d.id !== id)
      this.persistLocal()
    }

    await this.recordGovernanceLog({
      reference_document_id: id,
      document_code: existing.document_code,
      revision: existing.revision,
      action: 'ASSOCIACAO_REMOVIDA',
      previous_value: existing,
      new_value: null,
      details: `Vínculo removido do Controle de Produção por ${userName}. O documento oficial do SGQ permanece intacto.`,
    })
  }

  async getReferenceDocumentById(id: string): Promise<ProductionReferenceDocument | null> {
    try {
      const rec = await pb.collection('pcp_production_reference_documents').getOne(id)
      return this.mapRecordToDoc(rec)
    } catch {
      return this.inMemoryDocs.find((d) => d.id === id) || null
    }
  }

  /**
   * Sincroniza com o SGQ e verifica se há nova revisão disponível para algum documento associado
   */
  async syncSgqAndCheckRevisions(): Promise<{
    checkedCount: number
    newRevisionsFound: number
    updatedDocs: ProductionReferenceDocument[]
  }> {
    const currentDocs = await this.listReferenceDocuments()
    let newRevisionsFound = 0
    const updatedDocs: ProductionReferenceDocument[] = []

    for (const doc of currentDocs) {
      // Simulação / consulta ao catálogo SGQ
      const matchingSgq = HOMOLOGATION_MOCK_DOCUMENTS.find(
        (s) => s.code === doc.document_code || s.id === doc.document_ref,
      )

      if (matchingSgq && matchingSgq.revision !== doc.revision) {
        // Encontrou revisão diferente no SGQ
        newRevisionsFound++
        const updated = await this.updateReferenceDocument(doc.id, {
          has_new_revision_available: true,
          new_revision_details: {
            previous_revision: doc.revision,
            new_revision: matchingSgq.revision,
            release_date: matchingSgq.lastUpdatedAt || new Date().toISOString(),
            impact_summary: `Nova revisão ${matchingSgq.revision} emitida no SGQ. O documento atual (${doc.revision}) segue mantido até validação da governança.`,
          },
          last_sync_at: new Date().toISOString(),
        })
        updatedDocs.push(updated)

        await this.recordGovernanceLog({
          reference_document_id: doc.id,
          document_code: doc.document_code,
          revision: doc.revision,
          action: 'NOVA_REVISAO_DETECTADA',
          details: `⚠ Nova revisão disponível no SGQ: ${matchingSgq.revision} (revisão em uso: ${doc.revision}).`,
        })
      } else {
        // Apenas atualiza timestamp de sincronização
        await this.updateReferenceDocument(doc.id, {
          last_sync_at: new Date().toISOString(),
        })
      }
    }

    return {
      checkedCount: currentDocs.length,
      newRevisionsFound,
      updatedDocs,
    }
  }

  /**
   * Aplica a nova revisão detectada do SGQ substituindo formalmente e registrando governança
   */
  async applyNewRevision(id: string): Promise<ProductionReferenceDocument> {
    const doc = await this.getReferenceDocumentById(id)
    if (!doc || !doc.has_new_revision_available || !doc.new_revision_details) {
      throw new Error('Nenhuma nova revisão pendente de aplicação para este documento.')
    }

    const prevRev = doc.revision
    const newRev = doc.new_revision_details.new_revision

    const updated = await this.updateReferenceDocument(id, {
      revision: newRev,
      has_new_revision_available: false,
      new_revision_details: undefined,
      last_sync_at: new Date().toISOString(),
    })

    await this.recordGovernanceLog({
      reference_document_id: id,
      document_code: doc.document_code,
      revision: newRev,
      action: 'NOVA_REVISAO_APLICADA',
      details: `Revisão do documento atualizada com sucesso de ${prevRev} para ${newRev}.`,
    })

    return updated
  }

  /**
   * Registra log de governança das associações
   */
  private async recordGovernanceLog(
    log: Omit<ProductionReferenceGovernanceLog, 'id' | 'created'>,
  ): Promise<void> {
    const user = pb.authStore.record
    const fullLog: ProductionReferenceGovernanceLog = {
      ...log,
      id: `gov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: log.user_id || user?.id || '',
      user_name: log.user_name || user?.name || 'Usuário PCP',
      user_email: log.user_email || user?.email || '',
      created: new Date().toISOString(),
    }

    try {
      await pb.collection('pcp_production_reference_governance_logs').create(fullLog)
    } catch {
      this.inMemoryLogs.unshift(fullLog)
      this.persistLocal()
    }
  }

  /**
   * Lista logs de governança por documento
   */
  async getGovernanceLogs(
    referenceDocumentId?: string,
  ): Promise<ProductionReferenceGovernanceLog[]> {
    try {
      const filter = referenceDocumentId ? `reference_document_id = "${referenceDocumentId}"` : ''
      const records = await pb.collection('pcp_production_reference_governance_logs').getFullList({
        filter,
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        reference_document_id: r.reference_document_id,
        document_code: r.document_code,
        revision: r.revision,
        action: r.action,
        applications: r.applications,
        categories: r.categories,
        criteria: r.criteria,
        priority: r.priority,
        is_primary: r.is_primary,
        previous_value: r.previous_value,
        new_value: r.new_value,
        user_id: r.user_id,
        user_name: r.user_name,
        user_email: r.user_email,
        details: r.details,
        created: r.created,
      }))
    } catch {
      if (referenceDocumentId) {
        return this.inMemoryLogs.filter((l) => l.reference_document_id === referenceDocumentId)
      }
      return [...this.inMemoryLogs]
    }
  }

  /**
   * MOTOR PRINCIPAL DE "AÇÃO PROPOSTA POR IA"
   * Hierarquia estrita: Documento SGQ vigente > regra configurada no HUB > histórico de ocorrências > inferência IA
   * NUNCA inventa procedimentos. Se não houver documento, exibe aviso oficial explícito.
   */
  async generateProposedAction(
    context: ProductionAiActionContext,
  ): Promise<ProductionProposedAiAction> {
    const allDocs = await this.listReferenceDocuments()

    // 1. Filtrar apenas documentos ATIVOS e VIGENTES
    // Documentos obsoletos, cancelados, substituídos ou inativos NUNCA são usados pela IA
    const validDocs = allDocs.filter((d) => d.active && d.status === 'VIGENTE')

    // 2. Pontuar aderência dos documentos à ocorrência
    const scoredDocs = validDocs
      .map((doc) => {
        let score = 0

        // Correspondência por aplicação
        if (context.occurrence_type === 'COGI' && doc.applications.includes('COGI')) score += 50
        if (context.occurrence_type === 'CO1P' && doc.applications.includes('CO1P')) score += 50
        if (
          context.occurrence_type === 'APONTAMENTO' &&
          (doc.applications.includes('Apontamentos') ||
            doc.applications.includes('Erro de Apontamento'))
        )
          score += 50
        if (
          context.occurrence_type === 'ORDEM' &&
          (doc.applications.includes('Ordens de Produção') ||
            doc.applications.includes('Análise de Ordens'))
        )
          score += 50

        // Correspondência por Categoria IA
        if (context.categoria_ia && doc.ai_categories.some((c) => c === context.categoria_ia)) {
          score += 40
        }

        // Correspondência por critérios específicos
        if (doc.criteria) {
          if (
            doc.criteria.codigo_mensagem_sap &&
            context.sap_msg_code &&
            doc.criteria.codigo_mensagem_sap.toUpperCase() === context.sap_msg_code.toUpperCase()
          ) {
            score += 60 // Critério específico de alta relevância
          }
          if (
            doc.criteria.tipo_movimento &&
            context.tipo_movimento &&
            doc.criteria.tipo_movimento === context.tipo_movimento
          ) {
            score += 30
          }
          if (
            doc.criteria.centro &&
            context.centro_code &&
            doc.criteria.centro === context.centro_code
          ) {
            score += 20
          }
        }

        // Bonificação por documento principal e prioridade
        if (doc.is_primary) score += 25
        if (doc.priority === 'ALTA') score += 15
        if (doc.priority === 'MEDIA') score += 5

        return { doc, score }
      })
      .sort((a, b) => b.score - a.score)

    const bestMatch = scoredDocs.length > 0 && scoredDocs[0].score > 30 ? scoredDocs[0].doc : null

    // 3. Consultar histórico de tratamentos prévios para detectar recorrência e divergências
    const historyTreatments = await this.getTreatmentHistoryByOccurrence(context.occurrence_id)
    let divergence: ProductionProposedAiAction['divergenciacao_historico'] = undefined

    if (historyTreatments.length > 0 && bestMatch) {
      const lastTreatment = historyTreatments[0]
      // Se a ação passada divergiu do procedimento oficial vigente
      if (
        lastTreatment.document_code &&
        lastTreatment.document_code === bestMatch.document_code &&
        lastTreatment.document_revision !== bestMatch.revision
      ) {
        divergence = {
          identificada: true,
          mensagem: `O tratamento realizado anteriormente (${lastTreatment.document_revision}) não corresponde ao procedimento definido na revisão vigente (${bestMatch.revision}) do documento ${bestMatch.document_code}.`,
          tratamento_anterior: lastTreatment.actual_action_taken,
          procedimento_vigente: bestMatch.extractable_content || 'Procedimento revisado no SGQ.',
        }
      }
    }

    // 4. Montar a resposta com Fatos, Hipóteses e Orientações Documentadas
    const timestamp = new Date().toISOString()
    const analiseId = `ia-ana-${Date.now()}`

    // Fatos identificados
    const fatos: string[] = []
    if (context.op_number) fatos.push(`Ordem de Produção: ${context.op_number}`)
    if (context.material_code)
      fatos.push(
        `Material: ${context.material_code} - ${context.material_description || 'Aço Laminado'}`,
      )
    if (context.centro_code) fatos.push(`Centro: ${context.centro_code}`)
    if (context.deposito) fatos.push(`Depósito: ${context.deposito}`)
    if (context.lote) fatos.push(`Lote informado: ${context.lote}`)
    if (context.tipo_movimento) fatos.push(`Tipo de Movimento SAP: ${context.tipo_movimento}`)
    if (context.quantidade)
      fatos.push(`Quantidade afetada: ${context.quantidade} ${context.unidade_medida || 'TO'}`)
    if (context.confirmation_number)
      fatos.push(
        `Confirmação SAP: ${context.confirmation_number} (Reserva: ${context.reservation_number || 'S/N'})`,
      )
    if (context.sap_message)
      fatos.push(`Mensagem técnica SAP: [${context.sap_msg_code || 'MSG'}] ${context.sap_message}`)

    // Hipóteses IA
    const hipoteses: string[] = []
    if (context.categoria_ia === 'Estoque') {
      hipoteses.push(
        'Provável divergência entre saldo físico no depósito fabril e o registro contábil no SAP ECC.',
      )
      hipoteses.push(
        'Possível consumo físico executado sem lançamento prévio de transferência 311.',
      )
    } else if (context.categoria_ia === 'Lote') {
      hipoteses.push(
        'Lote bloqueado temporariamente pelo SGQ aguardando encerramento de ensaios metalúrgicos.',
      )
    } else if (context.categoria_ia === 'Confirmação') {
      hipoteses.push(
        'Desacoplamento de confirmação gerado por concorrência ou falta de saldo em componentes no momento da baixa.',
      )
    } else if (context.categoria_ia === 'Cadastro') {
      hipoteses.push(
        'Material não cadastrado ou não ampliado para as visões produtivas do centro correspondente.',
      )
    } else {
      hipoteses.push(
        'Inconsistência operacional nos parâmetros da ordem perante as diretrizes padrão da fábrica.',
      )
    }

    // Caso 1: Referência oficial NÃO localizada
    if (!bestMatch) {
      const preliminarySteps = [
        `1. Registrar a ocorrência técnica ${context.sap_msg_code || ''} para avaliação da Engenharia de Processos.`,
        '2. Solicitar ao gestor do SGQ o cadastramento do procedimento operacional padrão para esta categoria.',
        '3. Não efetuar movimentações no SAP sem parecer técnico por escrito.',
      ]

      const proposedAction: ProductionProposedAiAction = {
        occurrence_id: context.occurrence_id,
        analysis_timestamp: timestamp,
        problema_identificado:
          context.sap_message || 'Pendência operacional identificada no Controle de Produção.',
        classificacao: {
          categoria: context.categoria_ia || 'Outros',
          subcategoria: context.occurrence_type,
          criticidade: (context.criticality as any) || 'ATENCAO',
        },
        evidencias: {
          tipo_fato: 'Registro de Log SAP',
          mensagem_sap: context.sap_message || '',
          codigo_mensagem: context.sap_msg_code || 'N/A',
          ordem: context.op_number,
          material: context.material_code,
          centro: context.centro_code,
          deposito: context.deposito,
          movimento: context.tipo_movimento,
          confirmacao: context.confirmation_number,
          reserva: context.reservation_number,
          lote: context.lote,
        },
        fatos_identificados: fatos,
        hipoteses_ia: hipoteses,
        orientacao_documentada: [
          'Nenhum Documento de Referência vigente foi localizado para esta ocorrência.',
          'Esta análise preliminar não substitui procedimento oficial da CIAFAL.',
        ],
        passos_acao_proposta: preliminarySteps,
        area_sugerida: this.determineResponsibleArea(context.categoria_ia),
        referencia_nao_localizada: true,
        documento_insuficiente: false,
        divergencia_historico: divergence,
        rastreabilidade: {
          id_analise: analiseId,
          timestamp,
          documentos_consultados: validDocs.map((d) => d.document_code),
          revisoes_consultadas: validDocs.map((d) => `${d.document_code}:${d.revision}`),
          trechos_regras_utilizados: [],
          categoria_identificada: context.categoria_ia || 'Não categorizado',
          dados_utilizados: context,
          resultado: 'REFERENCIA_NAO_LOCALIZADA',
        },
      }

      await this.recordAiTraceability(proposedAction)
      return proposedAction
    }

    // Caso 2: Documento localizado — extrair orientações oficiais
    const rawContent = bestMatch.extractable_content || ''
    const contentLines = rawContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('['))

    // Passos objetivos vindos do documento oficial
    const officialSteps = contentLines.length > 0 ? contentLines : [bestMatch.title]

    // Avaliar se o documento contém instrução suficiente para o tratamento completo
    const isInsufficient =
      context.categoria_ia === 'Outros' ||
      (!context.sap_msg_code && context.occurrence_type === 'ORDEM' && officialSteps.length < 2)

    const proposedAction: ProductionProposedAiAction = {
      occurrence_id: context.occurrence_id,
      analysis_timestamp: timestamp,
      problema_identificado:
        context.sap_message ||
        `Ocorrência de ${context.categoria_ia || 'Controle de Produção'} na ordem ${context.op_number || 'S/N'}.`,
      classificacao: {
        categoria: context.categoria_ia || bestMatch.ai_categories[0] || 'Outros',
        subcategoria: context.occurrence_type,
        criticidade: (context.criticality as any) || 'ATENCAO',
      },
      evidencias: {
        tipo_fato: 'Registro de Log SAP',
        mensagem_sap: context.sap_message || '',
        codigo_mensagem: context.sap_msg_code || 'N/A',
        ordem: context.op_number,
        material: context.material_code,
        centro: context.centro_code,
        deposito: context.deposito,
        movimento: context.tipo_movimento,
        confirmacao: context.confirmation_number,
        reserva: context.reservation_number,
        lote: context.lote,
      },
      fatos_identificados: fatos,
      hipoteses_ia: hipoteses,
      orientacao_documentada: officialSteps,
      passos_acao_proposta: officialSteps,
      area_sugerida: this.determineResponsibleArea(
        bestMatch.responsible_area || context.categoria_ia,
      ),
      documento_utilizado: {
        id: bestMatch.id,
        codigo: bestMatch.document_code,
        titulo: bestMatch.title,
        revisao: bestMatch.revision,
        status: bestMatch.status,
        is_primary: bestMatch.is_primary,
        prioridade: bestMatch.priority,
        trecho_aplicavel: bestMatch.extractable_content,
        original_url: bestMatch.original_url,
      },
      referencia_nao_localizada: false,
      documento_insuficiente: isInsufficient,
      detalhes_insuficiencia: isInsufficient
        ? {
            o_que_determina: `O procedimento ${bestMatch.document_code} define critérios gerais de tratamento para a área de ${bestMatch.process || bestMatch.responsible_area}.`,
            o_que_precisa_validacao_humana:
              'Validação técnica específica da coordenação de PCP quanto à liberação manual ou encerramento.',
          }
        : undefined,
      divergencia_historico: divergence,
      rastreabilidade: {
        id_analise: analiseId,
        timestamp,
        documentos_consultados: [bestMatch.document_code],
        revisoes_consultadas: [`${bestMatch.document_code}:${bestMatch.revision}`],
        trechos_regras_utilizados: officialSteps,
        categoria_identificada: context.categoria_ia || bestMatch.ai_categories[0] || 'Geral',
        dados_utilizados: context,
        resultado: 'ORIENTACAO_GERADA_COM_SUCESSO',
      },
    }

    await this.recordAiTraceability(proposedAction)
    return proposedAction
  }

  /**
   * Salva rastreabilidade imutável de cada resposta IA
   */
  private async recordAiTraceability(action: ProductionProposedAiAction): Promise<void> {
    const user = pb.authStore.record
    const tracePayload = {
      occurrence_id: action.occurrence_id,
      occurrence_type: action.classificacao.subcategoria,
      analysis_timestamp: action.analysis_timestamp,
      documents_consulted: action.rastreabilidade.documentos_consultados,
      revisions_consulted: action.rastreabilidade.revisoes_consultadas,
      rules_and_excerpts_used: action.rastreabilidade.trechos_regras_utilizados,
      identified_category: action.rastreabilidade.categoria_identificada,
      source_sap_data: action.evidencias,
      result_facts: action.fatos_identificados,
      result_hypotheses: action.hipoteses_ia,
      result_proposed_action: action.passos_acao_proposta,
      has_divergence_with_history: Boolean(action.divergencia_historico?.identificada),
      divergence_message: action.divergencia_historico?.mensagem || '',
      user_id: user?.id || '',
      user_name: user?.name || 'Operador PCP',
    }

    try {
      await pb.collection('pcp_production_ai_traceability').create(tracePayload)
    } catch {
      // Ignora erro se coleção não estiver provisionada
    }
  }

  /**
   * Salva registro no Histórico de Tratamento quando uma orientação IA é executada pelo usuário
   */
  async recordTreatmentHistory(
    input: ProductionTreatmentRecordInput,
  ): Promise<ProductionTreatmentHistoryItem> {
    const user = pb.authStore.record
    const userName = user?.name || input.responsible_name || 'Operador PCP'
    const userId = user?.id || ''

    const item: ProductionTreatmentHistoryItem = {
      ...input,
      id: `treat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_name: userName,
      created: new Date().toISOString(),
    }

    try {
      const rec = await pb.collection('pcp_production_treatment_history').create({
        ...item,
        user_id: userId,
      })
      return {
        ...item,
        id: rec.id,
        created: rec.created || item.created,
      }
    } catch {
      this.inMemoryTreatments.unshift(item)
      this.persistLocal()
      return item
    }
  }

  /**
   * Consulta histórico de tratamentos de uma ocorrência
   */
  async getTreatmentHistoryByOccurrence(
    occurrenceId: string,
  ): Promise<ProductionTreatmentHistoryItem[]> {
    try {
      const records = await pb.collection('pcp_production_treatment_history').getFullList({
        filter: `occurrence_id = "${occurrenceId}"`,
        sort: '-created',
      })
      return records.map((r: any) => ({
        id: r.id,
        occurrence_id: r.occurrence_id,
        occurrence_type: r.occurrence_type,
        op_number: r.op_number,
        material_code: r.material_code,
        document_code: r.document_code,
        document_title: r.document_title,
        document_revision: r.document_revision,
        proposed_action: r.proposed_action,
        actual_action_taken: r.actual_action_taken,
        responsible_name: r.responsible_name,
        responsible_area: r.responsible_area,
        outcome: r.outcome,
        reprocessing_done: Boolean(r.reprocessing_done),
        resolved: Boolean(r.resolved),
        divergence_identified: Boolean(r.divergence_identified),
        divergence_notes: r.divergence_notes,
        observation: r.observation,
        ai_traceability_data: r.ai_traceability_data,
        user_name: r.user_name,
        created: r.created,
      }))
    } catch {
      return this.inMemoryTreatments.filter((t) => t.occurrence_id === occurrenceId)
    }
  }

  /**
   * Consulta todo o histórico de tratamento da produção (para análise de recorrência)
   */
  async getAllTreatmentHistory(): Promise<ProductionTreatmentHistoryItem[]> {
    try {
      const records = await pb.collection('pcp_production_treatment_history').getFullList({
        sort: '-created',
        limit: 100,
      })
      return records.map((r: any) => ({
        id: r.id,
        occurrence_id: r.occurrence_id,
        occurrence_type: r.occurrence_type,
        op_number: r.op_number,
        material_code: r.material_code,
        document_code: r.document_code,
        document_title: r.document_title,
        document_revision: r.document_revision,
        proposed_action: r.proposed_action,
        actual_action_taken: r.actual_action_taken,
        responsible_name: r.responsible_name,
        responsible_area: r.responsible_area,
        outcome: r.outcome,
        reprocessing_done: Boolean(r.reprocessing_done),
        resolved: Boolean(r.resolved),
        divergence_identified: Boolean(r.divergence_identified),
        divergence_notes: r.divergence_notes,
        observation: r.observation,
        ai_traceability_data: r.ai_traceability_data,
        user_name: r.user_name,
        created: r.created,
      }))
    } catch {
      return [...this.inMemoryTreatments]
    }
  }

  private determineResponsibleArea(
    catOrArea?: string,
  ): ProductionProposedAiAction['area_sugerida'] {
    const val = (catOrArea || '').toUpperCase()
    if (val.includes('ESTOQUE') || val.includes('SALDO') || val.includes('RESERVA'))
      return 'Estoque'
    if (val.includes('LOTE') || val.includes('QUALIDADE')) return 'Qualidade'
    if (val.includes('CONFIRMA') || val.includes('ORDEM') || val.includes('APONTA'))
      return 'Produção'
    if (val.includes('CONTABIL') || val.includes('CUSTOS')) return 'Contabilidade'
    if (val.includes('FISCAL')) return 'Fiscal'
    if (val.includes('CADASTRO')) return 'Cadastro'
    if (val.includes('TI') || val.includes('INTEGRA')) return 'TI'
    if (val.includes('MANUTEN')) return 'Manutenção'
    return 'PCP'
  }

  private mapRecordToDoc(rec: any): ProductionReferenceDocument {
    return {
      id: rec.id,
      document_ref: rec.document_ref,
      document_code: rec.document_code,
      title: rec.title,
      revision: rec.revision,
      revision_date: rec.revision_date,
      status: rec.status,
      document_type: rec.document_type,
      process: rec.process,
      responsible_area: rec.responsible_area,
      validity_date_start: rec.validity_date_start,
      validity_date_end: rec.validity_date_end,
      document_author: rec.document_author,
      source: rec.source || 'SGQ > Informação Documentada (Oficial)',
      original_url: rec.original_url,
      last_sync_at: rec.last_sync_at,
      applications: Array.isArray(rec.applications) ? rec.applications : [],
      ai_categories: Array.isArray(rec.ai_categories) ? rec.ai_categories : [],
      criteria: rec.criteria || {},
      priority: rec.priority || 'ALTA',
      is_primary: Boolean(rec.is_primary),
      active: rec.active !== undefined ? Boolean(rec.active) : true,
      has_new_revision_available: Boolean(rec.has_new_revision_available),
      new_revision_details: rec.new_revision_details,
      extractable_content: rec.extractable_content,
      created_by_user_id: rec.created_by_user_id,
      created_by_user_name: rec.created_by_user_name,
      created: rec.created,
      updated: rec.updated,
    }
  }
}

export const productionControlReferenceDocsService = new ProductionControlReferenceDocsService()
