/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Reconciliação idempotente da collection carteira_minima_consultas
    if (!app.hasTable('carteira_minima_consultas')) {
      const col = new Collection({
        name: 'carteira_minima_consultas',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'tipo_consulta', type: 'text' },
          { name: 'total_itens', type: 'number' },
          { name: 'carteira_total_tons', type: 'number' },
          { name: 'saldo_total_tons', type: 'number' },
          { name: 'filtros_aplicados', type: 'json' },
          { name: 'solicitante', type: 'text' },
          { name: 'origem_dados', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(col)
    }

    // 2. Histórico de envios de e-mail e pendências do Carteira Mínima
    if (!app.hasTable('carteira_minima_envios')) {
      const colEnvios = new Collection({
        name: 'carteira_minima_envios',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'tipo', type: 'text', required: true }, // 'EMAIL' | 'PENDENCIA'
          { name: 'assunto_ou_titulo', type: 'text', required: true },
          { name: 'destinatarios_json', type: 'json', required: true },
          { name: 'destinatarios_count', type: 'number' },
          { name: 'remetente_nome', type: 'text' },
          { name: 'remetente_email', type: 'text' },
          { name: 'remetente_id', type: 'text' },
          { name: 'prioridade', type: 'text' },
          { name: 'prazo', type: 'text' },
          { name: 'status', type: 'text' },
          { name: 'corpo_ou_descricao', type: 'text' },
          { name: 'imagem_resumo', type: 'text' },
          { name: 'nome_arquivo_pdf', type: 'text' },
          { name: 'filtros_snapshot', type: 'json' },
          { name: 'itens_count', type: 'number' },
          { name: 'totalizadores_snapshot', type: 'json' },
          { name: 'meu_dia_ids', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      })
      app.save(colEnvios)
    }
  },
  (app) => {
    try {
      if (app.hasTable('carteira_minima_envios')) {
        app.delete(app.findCollectionByNameOrId('carteira_minima_envios'))
      }
    } catch (_) {}
    try {
      if (app.hasTable('carteira_minima_consultas')) {
        app.delete(app.findCollectionByNameOrId('carteira_minima_consultas'))
      }
    } catch (_) {}
  },
)
