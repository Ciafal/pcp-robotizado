migrate(
  (app) => {
    // Garantir que a tabela oficial sgq_documented_information existe para SGQ > Informação Documentada
    if (!app.hasTable('sgq_documented_information')) {
      const col = new Collection({
        name: 'sgq_documented_information',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'title', type: 'text', required: true },
          { name: 'revision', type: 'text', required: true },
          { name: 'revision_date', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['VIGENTE', 'EM_REVISAO', 'OBSOLETO', 'CANCELADO', 'SUBSTITUIDO'],
            maxSelect: 1,
          },
          { name: 'document_type', type: 'text' },
          { name: 'process', type: 'text' },
          { name: 'responsible_area', type: 'text' },
          { name: 'validity_date_start', type: 'text' },
          { name: 'validity_date_end', type: 'text' },
          { name: 'original_url', type: 'text' },
          { name: 'extractable_content', type: 'text' },
          { name: 'active_revision_ref', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_sgq_doc_code ON sgq_documented_information (code)',
          'CREATE INDEX idx_sgq_status ON sgq_documented_information (status)',
        ],
      })
      app.save(col)
    }

    // Popular documentos oficiais do SGQ se vazia
    const count = app.countRecords('sgq_documented_information')
    if (count === 0) {
      const col = app.findCollectionByNameOrId('sgq_documented_information')
      const officialDocs = [
        {
          code: 'PO-EST-005',
          title: 'Procedimento Operacional de Regularização e Ajuste de Divergência de Estoque',
          revision: 'Rev.03',
          revision_date: '2024-03-10',
          status: 'VIGENTE',
          document_type: 'Procedimento Operacional (PO)',
          process: 'Controle de Estoque & Expedição',
          responsible_area: 'Estoque Central',
          validity_date_start: '2024-03-10',
          validity_date_end: '2026-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/PO-EST-005-rev03.pdf',
          extractable_content:
            '[PO-EST-005 Rev.03 - PROCEDIMENTO OPERACIONAL DE REGULARIZAÇÃO DE ESTOQUE] Item 4.2 - Tratamento de Divergência de Saldo para Movimento 261: 1. Validar saldo físico no depósito de consumo antes de qualquer movimentação sistêmica. 2. Se o material estiver fisicamente presente em depósito intermediário ou pulmão, efetuar transferência sistêmica 311 para o depósito da OP. 3. Se constatada divergência real de inventário, abrir chamado de conferência ao Almoxarifado Central. 4. É proibida a realização de apontamento fictício ou alteração de lote sem validação física. 5. Após regularização do saldo, solicitar reprocessamento da pendência COGI.',
        },
        {
          code: 'IT-GQ-018',
          title: 'Instrução de Trabalho — Gestão e Desbloqueio de Lotes Retidos pela Qualidade',
          revision: 'Rev.02',
          revision_date: '2024-02-15',
          status: 'VIGENTE',
          document_type: 'Instrução de Trabalho (IT)',
          process: 'Garantia da Qualidade Industrial',
          responsible_area: 'Qualidade Assegurada',
          validity_date_start: '2024-02-15',
          validity_date_end: '2026-06-30',
          original_url: 'https://sgq.ciafal.internal/docs/IT-GQ-018-rev02.pdf',
          extractable_content:
            '[IT-GQ-018 Rev.02 - GESTÃO E DESBLOQUEIO DE LOTES RETIDOS] Item 5 - Análise do Motivo de Retenção de Lotes: 1. Consultar status de inspeção do lote na transação SAP QA33 ou MSC3N. 2. Identificar se a retenção decorre de ensaios mecânicos pendentes (tração/escoamento) ou de não conformidade dimensional. 3. Notificar o inspetor de qualidade responsável da área metalúrgica. 4. Desbloqueios no SAP (movimento 321) só podem ser efetuados pelo setor de Qualidade Assegurada credenciado. 5. Em caso de liberação condicional, registrar número do parecer técnico no PCP.',
        },
        {
          code: 'PO-PCP-012',
          title: 'Procedimento Operacional de Processamento Posterior de Confirmações (CO1P/CO14)',
          revision: 'Rev.01',
          revision_date: '2024-01-20',
          status: 'VIGENTE',
          document_type: 'Procedimento Operacional (PO)',
          process: 'Controle e Apontamento de Produção',
          responsible_area: 'PCP Central',
          validity_date_start: '2024-01-20',
          validity_date_end: '2026-01-20',
          original_url: 'https://sgq.ciafal.internal/docs/PO-PCP-012-rev01.pdf',
          extractable_content:
            '[PO-PCP-012 Rev.01 - PROCESSAMENTO POSTERIOR DE CONFIRMAÇÕES CO1P] Item 6 - Desacoplamento e Baixa Retroativa por Explosão: 1. Identificar a cadeia de rastreabilidade: Ordem -> Confirmação -> Contador -> Reserva. 2. Verificar se a falha decorreu de bloqueio de encadeamento na operação anterior ou falta de saldo nos componentes da lista técnica. 3. Sanar preliminarmente as pendências de estoque de componentes (COGI). 4. O reprocessamento no SAP deve ser realizado na transação CO1P selecionando a confirmação individual e acionando Processar. 5. Não forçar encerramento técnico de ordem com pendências CO1P ativas.',
        },
        {
          code: 'PO-CAD-001',
          title: 'Diretriz de Dados Mestres de Materiais e Visões de Produção SAP',
          revision: 'Rev.05',
          revision_date: '2024-04-01',
          status: 'VIGENTE',
          document_type: 'Procedimento Operacional (PO)',
          process: 'Administração de Dados Mestres',
          responsible_area: 'Cadastro',
          validity_date_start: '2024-04-01',
          validity_date_end: '2026-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/PO-CAD-001-rev05.pdf',
          extractable_content:
            '[PO-CAD-001 Rev.05 - DIRETRIZ DE DADOS MESTRES SAP] Seção 2.1 - Ampliação e Visões de Produção: 1. Todo material produzido deve possuir visões ativas de Dados Básicos, MRP 1 a 4, Preparação do Trabalho e Contabilidade/Custos. 2. O erro M3018 indica ausência de dados do material para o centro correspondente da ordem de produção. 3. Encaminhar solicitação de ampliação via formulário ZCAD para a equipe de Cadastro Central. 4. Após confirmação de ampliação pelo cadastro, validar status na MM03 antes de reprocessar apontamento ou ordem.',
        },
        {
          code: 'PO-PRD-007',
          title: 'Gestão do Ciclo de Vida de Ordens de Produção (Liberação, Apontamento e TECO)',
          revision: 'Rev.03',
          revision_date: '2023-11-20',
          status: 'VIGENTE',
          document_type: 'Procedimento Operacional (PO)',
          process: 'Controle de Chão de Fábrica',
          responsible_area: 'Produção',
          validity_date_start: '2023-11-20',
          validity_date_end: '2025-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/PO-PRD-007-rev03.pdf',
          extractable_content:
            '[PO-PRD-007 Rev.03 - CICLO DE VIDA DE ORDENS DE PRODUÇÃO] Seção 4 - Status de Sistema e Encerramento Técnico: 1. Uma ordem em status TECO (Encerrada Tecnicamente) não aceita apontamentos nem movimentações posteriores. 2. Em caso de divergência de status na CO02, verificar se o lote de produção foi finalizado ou se há necessidade de revogar TECO. 3. Revogação de TECO exige autorização do Coordenador de PCP. 4. Validar saldo residual de componentes e fechar pendências COGI antes do encerramento contábil final.',
        },
        {
          code: 'PO-CTB-002',
          title: 'Norma de Encerramento Contábil e Abertura de Períodos de Lançamento',
          revision: 'Rev.04',
          revision_date: '2024-01-05',
          status: 'VIGENTE',
          document_type: 'Norma Operacional (NO)',
          process: 'Controladoria & Contabilidade de Custos',
          responsible_area: 'Contabilidade',
          validity_date_start: '2024-01-05',
          validity_date_end: '2026-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/PO-CTB-002-rev04.pdf',
          extractable_content:
            '[PO-CTB-002 Rev.04 - ENCERRAMENTO CONTÁBIL] Seção 3.4 - Tratamento de Lançamentos em Período Bloqueado: 1. Validar a data de competência contábil do apontamento físico. 2. Contatar a Controladoria e Contabilidade para liberação transitória das transações MMRV ou OB52. 3. Não forçar lançamento contábil em conta divergente sem aprovação expressa.',
        },
        {
          code: 'IT-EXP-009',
          title: 'Instrução de Trabalho — Embarque e Conferência de Rastreabilidade de Carga',
          revision: 'Rev.02',
          revision_date: '2024-03-01',
          status: 'VIGENTE',
          document_type: 'Instrução de Trabalho (IT)',
          process: 'Expedição e Logística',
          responsible_area: 'Expedição',
          validity_date_start: '2024-03-01',
          validity_date_end: '2026-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/IT-EXP-009-rev02.pdf',
          extractable_content:
            '[IT-EXP-009 Rev.02 - EMBARQUE E EXPEDIÇÃO] Seção 2 - Liberação de Veículos e Cargas: 1. Conferir peso bruto e peso líquido balança vs romaneio. 2. Validar amarração e lacre da carga. 3. Apenas liberar veículos com status LIBERADO pela portaria e pelo PCP.',
        },
        {
          code: 'PO-LAM-014',
          title: 'Procedimento Operacional de Sequenciamento e Troca de Bitolas da Laminação',
          revision: 'Rev.04',
          revision_date: '2024-01-01',
          status: 'VIGENTE',
          document_type: 'Procedimento Operacional (PO)',
          process: 'Laminação a Quente',
          responsible_area: 'Engenharia de Processos',
          validity_date_start: '2024-01-01',
          validity_date_end: '2026-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/PO-LAM-014-rev04.pdf',
          extractable_content:
            '[PO-LAM-014 Rev.04 - PROCEDIMENTO OPERACIONAL DE SEQUENCIAMENTO] Seção 3.1 - Restrições Críticas de Sequenciamento: OBRIGAÇÃO: Na transição entre perfis Pesados e Perfis Leves, o tempo mínimo de setup e acerto da tesoura TR2 é de 40 minutos. PROIBIÇÃO: O produto MAT-CA50-100 não pode ser produzido imediatamente após o produto MAT-CA50-080 sem troca de cilindros intermediária. LIMITE: A velocidade máxima da mesa de resfriamento TCC para bitolas acima de 1 polegada é de 22 t/h.',
        },
        {
          code: 'IT-TREF-008',
          title: 'Instrução de Trabalho — Produtividade e Cadência Mínima na Trefilação L1',
          revision: 'Rev.02',
          revision_date: '2024-02-10',
          status: 'VIGENTE',
          document_type: 'Instrução de Trabalho (IT)',
          process: 'Trefilação',
          responsible_area: 'Qualidade Assegurada',
          validity_date_start: '2024-02-10',
          validity_date_end: '2026-06-30',
          original_url: 'https://sgq.ciafal.internal/docs/IT-TREF-008-rev02.pdf',
          extractable_content:
            '[IT-TREF-008 Rev.02 - INSTRUÇÃO TÉCNICA DE PRODUTIVIDADE TREFILAÇÃO] Seção 2 - Limites de Cadência Operacional: LIMITE: A cadência nominal do produto MAT-ARAME-001 na Linha L1 deve operar estritamente em 28.5 t/h para garantir conformidade de tração mecânica. OBRIGAÇÃO: Troca entre acabamento fosfatizado e trefilado polido exige limpeza do tambor de tração com tempo mínimo de 25 minutos.',
        },
        {
          code: 'SPEC-MP-021',
          title:
            'Especificação Técnica de Utilização e Aproveitamento de Tarugos e Sucata Controlada',
          revision: 'Rev.05',
          revision_date: '2023-11-01',
          status: 'VIGENTE',
          document_type: 'Especificação Técnica (ET)',
          process: 'Pátio de Matéria-Prima & Forno',
          responsible_area: 'Metalurgia e Materiais',
          validity_date_start: '2023-11-01',
          validity_date_end: '2025-12-31',
          original_url: 'https://sgq.ciafal.internal/docs/SPEC-MP-021-rev05.pdf',
          extractable_content:
            '[SPEC-MP-021 Rev.05 - ESPECIFICAÇÃO DE MATÉRIA-PRIMA] Seção 4 - Restrições de Carga e Rendimento Metálico: PROIBIÇÃO: Proibida a utilização de tarugos com comprimento inferior a 5.8 metros no trem contínuo sem aprovação da metalurgia. OBRIGAÇÃO: Carga direta a quente exige tarugos com temperatura superficial mínima de 500 °C.',
        },
      ]

      for (const d of officialDocs) {
        const rec = new Record(col)
        rec.set('code', d.code)
        rec.set('title', d.title)
        rec.set('revision', d.revision)
        rec.set('revision_date', d.revision_date)
        rec.set('status', d.status)
        rec.set('document_type', d.document_type)
        rec.set('process', d.process)
        rec.set('responsible_area', d.responsible_area)
        rec.set('validity_date_start', d.validity_date_start)
        rec.set('validity_date_end', d.validity_date_end)
        rec.set('original_url', d.original_url)
        rec.set('extractable_content', d.extractable_content)
        rec.set('active_revision_ref', d.code + '-' + d.revision)
        app.save(rec)
      }
    }
  },
  (app) => {
    if (app.hasTable('sgq_documented_information')) {
      try {
        const col = app.findCollectionByNameOrId('sgq_documented_information')
        app.delete(col)
      } catch (_) {}
    }
  },
)
