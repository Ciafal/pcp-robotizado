/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Tabela para persistir o histórico e status dos envios de Dados IBGE para a Contabilidade
    if (!app.hasTable('dados_ibge_envios')) {
      const ibgeEnviosCol = new Collection({
        name: 'dados_ibge_envios',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // NUNCA deletar envios — histórico contábil
        fields: [
          { name: 'chave_consolidada', type: 'text', required: true },
          { name: 'competencia', type: 'text', required: true }, // MM/AAAA
          { name: 'empresa_code', type: 'text' },
          { name: 'empresa_nome', type: 'text' },
          { name: 'linha_code', type: 'text' },
          { name: 'centro_code', type: 'text' },
          { name: 'tipo_material', type: 'text' }, // MTART
          { name: 'material_code', type: 'text' },
          { name: 'material_descricao', type: 'text' },
          { name: 'quantidade_produzida', type: 'number' },
          { name: 'unidade_medida', type: 'text' },
          { name: 'total_registros', type: 'number' },
          { name: 'centros_envolvidos_json', type: 'json' },
          { name: 'filtros_utilizados_json', type: 'json' },
          { name: 'registros_resumo_json', type: 'json' },
          {
            name: 'status',
            type: 'select',
            values: ['Em processamento', 'Pendente', 'Conferido', 'Enviado à Contabilidade'],
            maxSelect: 1,
          },
          { name: 'data_envio', type: 'text' }, // ISO
          { name: 'data_envio_formatada', type: 'text' }, // dd/mm/aaaa às HH:mm
          { name: 'enviado_por_nome', type: 'text' },
          { name: 'enviado_por_email', type: 'text' },
          { name: 'enviado_por_id', type: 'text' },
          { name: 'eh_reenvio', type: 'bool' },
          { name: 'data_reenvio_formatada', type: 'text' }, // dd/mm/aaaa HH:mm
          { name: 'envio_original_id', type: 'text' },
          { name: 'grupo_destinatarios', type: 'text' },
          { name: 'destinatarios_json', type: 'json' },
          { name: 'assunto', type: 'text' },
          { name: 'corpo_formulario', type: 'text' },
          { name: 'sucesso_envio_email', type: 'bool' },
          { name: 'erro_detalhe', type: 'text' },
          { name: 'anexo_pdf_status', type: 'text' }, // ex: "Pendente de geração PDF"
          { name: 'tipo_lote', type: 'bool' }, // true se enviado em lote
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_die_chave ON dados_ibge_envios (chave_consolidada)',
          'CREATE INDEX idx_die_comp ON dados_ibge_envios (competencia)',
          'CREATE INDEX idx_die_status ON dados_ibge_envios (status)',
          'CREATE INDEX idx_die_created ON dados_ibge_envios (created DESC)',
        ],
      })
      app.save(ibgeEnviosCol)
    }

    // 2. Destinatários específicos do grupo "Contabilidade — Dados IBGE" em coleção própria
    if (!app.hasTable('dados_ibge_destinatarios')) {
      const ibgeDestCol = new Collection({
        name: 'dados_ibge_destinatarios',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'grupo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'cargo', type: 'text' },
          { name: 'email', type: 'email', required: true },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_did_email ON dados_ibge_destinatarios (email)',
          'CREATE INDEX idx_did_grupo ON dados_ibge_destinatarios (grupo)',
        ],
      })
      app.save(ibgeDestCol)
    }

    // 3. Semear destinatários padrão do grupo "Contabilidade — Dados IBGE" de forma idempotente
    const destCol = app.findCollectionByNameOrId('dados_ibge_destinatarios')
    const destinatariosPadrao = [
      {
        grupo: 'Contabilidade — Dados IBGE',
        nome: 'Equipe de Fechamento Contábil e IBGE',
        cargo: 'Contabilidade / Controladoria',
        email: 'contabilidade.ibge@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'Contabilidade — Dados IBGE',
        nome: 'Controladoria Industrial CIAFAL',
        cargo: 'Controladoria Industrial',
        email: 'controladoria.ibge@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'Contabilidade — Dados IBGE',
        nome: 'Gerência de Custos e Fechamento',
        cargo: 'Gestão de Custos',
        email: 'custos.fechamento@ciafal.com.br',
        ativo: true,
      },
    ]

    for (const d of destinatariosPadrao) {
      try {
        app.findFirstRecordByData('dados_ibge_destinatarios', 'email', d.email)
      } catch (_) {
        const rec = new Record(destCol)
        rec.set('grupo', d.grupo)
        rec.set('nome', d.nome)
        rec.set('cargo', d.cargo)
        rec.set('email', d.email)
        rec.set('ativo', d.ativo)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('dados_ibge_destinatarios'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('dados_ibge_envios'))
    } catch (_) {}
  },
)
