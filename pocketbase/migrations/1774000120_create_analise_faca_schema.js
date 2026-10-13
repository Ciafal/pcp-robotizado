/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Tabela faca_parametrizacao_materiais
    if (!app.hasTable('faca_parametrizacao_materiais')) {
      const collection = new Collection({
        name: 'faca_parametrizacao_materiais',
        type: 'base',
        system: false,
        schema: [
          {
            name: 'codigo_material_sap',
            type: 'text',
            required: true,
            unique: false,
            options: { min: 1, max: 50 },
          },
          {
            name: 'descricao',
            type: 'text',
            required: true,
            options: { min: 1, max: 255 },
          },
          {
            name: 'grupo_faca',
            type: 'text',
            required: true,
            options: { min: 1, max: 100 },
          },
          {
            name: 'bitola_mm',
            type: 'number',
            required: false,
            options: { min: 0 },
          },
          {
            name: 'tipo_aco',
            type: 'text',
            required: false,
            options: { min: 1, max: 50 },
          },
          {
            name: 'dimensoes_comprimento',
            type: 'text',
            required: false,
            options: { min: 1, max: 100 },
          },
          {
            name: 'centro',
            type: 'text',
            required: true,
            options: { min: 1, max: 20 },
          },
          {
            name: 'empresa',
            type: 'text',
            required: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'linha_preferencial',
            type: 'text',
            required: false,
            options: { min: 1, max: 50 },
          },
          {
            name: 'carteira_minima_t',
            type: 'number',
            required: false,
            options: { min: 0 },
          },
          {
            name: 'flag_mto',
            type: 'bool',
            required: false,
          },
          {
            name: 'origem_classificacao',
            type: 'text',
            required: false,
            options: { min: 1, max: 100 },
          },
          {
            name: 'ativo',
            type: 'bool',
            required: false,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
          },
        ],
        indexes: [
          'CREATE INDEX idx_faca_param_material ON faca_parametrizacao_materiais (codigo_material_sap)',
          'CREATE INDEX idx_faca_param_centro ON faca_parametrizacao_materiais (centro)',
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
      })
      app.save(collection)
    }

    // 2. Tabela faca_vinculo_pa_mp
    if (!app.hasTable('faca_vinculo_pa_mp')) {
      const collection = new Collection({
        name: 'faca_vinculo_pa_mp',
        type: 'base',
        system: false,
        schema: [
          {
            name: 'codigo_pa_sap',
            type: 'text',
            required: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'codigo_mp_sap',
            type: 'text',
            required: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'descricao_mp',
            type: 'text',
            required: false,
            options: { min: 1, max: 255 },
          },
          {
            name: 'rendimento_transformacao',
            type: 'number',
            required: true,
            options: { min: 0.01, max: 1.0 },
          },
          {
            name: 'perdas_previstas_pct',
            type: 'number',
            required: false,
            options: { min: 0, max: 100 },
          },
          {
            name: 'prioridade_consumo',
            type: 'number',
            required: false,
            options: { min: 1 },
          },
          {
            name: 'origem_vinculo',
            type: 'text',
            required: false,
            options: { min: 1, max: 50 },
          },
          {
            name: 'centro',
            type: 'text',
            required: true,
            options: { min: 1, max: 20 },
          },
          {
            name: 'deposito_mp_padrao',
            type: 'text',
            required: false,
            options: { min: 1, max: 20 },
          },
          {
            name: 'ativo',
            type: 'bool',
            required: false,
          },
        ],
        indexes: [
          'CREATE INDEX idx_faca_vinculo_pa ON faca_vinculo_pa_mp (codigo_pa_sap)',
          'CREATE INDEX idx_faca_vinculo_mp ON faca_vinculo_pa_mp (codigo_mp_sap)',
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
      })
      app.save(collection)
    }

    // 3. Tabela faca_analises_historico
    if (!app.hasTable('faca_analises_historico')) {
      const collection = new Collection({
        name: 'faca_analises_historico',
        type: 'base',
        system: false,
        schema: [
          {
            name: 'codigo_analise',
            type: 'text',
            required: true,
            unique: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'titulo',
            type: 'text',
            required: true,
            options: { min: 1, max: 255 },
          },
          {
            name: 'data_referencia',
            type: 'text',
            required: true,
            options: { min: 1, max: 20 },
          },
          {
            name: 'empresa',
            type: 'text',
            required: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'centro',
            type: 'text',
            required: true,
            options: { min: 1, max: 20 },
          },
          {
            name: 'versao',
            type: 'number',
            required: true,
            options: { min: 1 },
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            options: {
              maxSelect: 1,
              values: ['RASCUNHO', 'REVISADO', 'APROVADO', 'ENVIADO', 'FALHA_ENVIO'],
            },
          },
          {
            name: 'responsavel_nome',
            type: 'text',
            required: true,
            options: { min: 1, max: 100 },
          },
          {
            name: 'responsavel_email',
            type: 'email',
            required: false,
          },
          {
            name: 'resumo_executivo',
            type: 'text',
            required: false,
          },
          {
            name: 'relatorio_estruturado',
            type: 'json',
            required: false,
          },
          {
            name: 'snapshot_dados',
            type: 'json',
            required: false,
          },
          {
            name: 'recomendacoes_ia',
            type: 'json',
            required: false,
          },
          {
            name: 'acoes_responsaveis',
            type: 'json',
            required: false,
          },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_faca_hist_cod ON faca_analises_historico (codigo_analise)',
          'CREATE INDEX idx_faca_hist_status ON faca_analises_historico (status)',
          'CREATE INDEX idx_faca_hist_data ON faca_analises_historico (data_referencia)',
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
      })
      app.save(collection)
    }

    // 4. Tabela faca_envios_email
    if (!app.hasTable('faca_envios_email')) {
      const collection = new Collection({
        name: 'faca_envios_email',
        type: 'base',
        system: false,
        schema: [
          {
            name: 'codigo_envio',
            type: 'text',
            required: true,
            unique: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'analise_id',
            type: 'text',
            required: false,
            options: { min: 1, max: 50 },
          },
          {
            name: 'codigo_analise',
            type: 'text',
            required: true,
            options: { min: 1, max: 50 },
          },
          {
            name: 'remetente_nome',
            type: 'text',
            required: true,
            options: { min: 1, max: 100 },
          },
          {
            name: 'remetente_email',
            type: 'email',
            required: true,
          },
          {
            name: 'destinatarios_para',
            type: 'json',
            required: true,
          },
          {
            name: 'destinatarios_cc',
            type: 'json',
            required: false,
          },
          {
            name: 'areas_envolvidas',
            type: 'json',
            required: false,
          },
          {
            name: 'assunto',
            type: 'text',
            required: true,
            options: { min: 1, max: 255 },
          },
          {
            name: 'corpo_html',
            type: 'text',
            required: true,
          },
          {
            name: 'anexo_pdf_gerado',
            type: 'bool',
            required: false,
          },
          {
            name: 'data_hora_envio',
            type: 'text',
            required: true,
            options: { min: 1, max: 30 },
          },
          {
            name: 'status_envio',
            type: 'text',
            required: true,
            options: { min: 1, max: 100 },
          },
          {
            name: 'mensagem_retorno',
            type: 'text',
            required: false,
          },
          {
            name: 'detalhes_tecnicos',
            type: 'json',
            required: false,
          },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_faca_envio_cod ON faca_envios_email (codigo_envio)',
          'CREATE INDEX idx_faca_envio_analise ON faca_envios_email (codigo_analise)',
        ],
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: null,
      })
      app.save(collection)
    }
  },
  (app) => {
    // Revert
    if (app.hasTable('faca_envios_email')) {
      const collection = app.findCollectionByNameOrId('faca_envios_email')
      app.delete(collection)
    }
    if (app.hasTable('faca_analises_historico')) {
      const collection = app.findCollectionByNameOrId('faca_analises_historico')
      app.delete(collection)
    }
    if (app.hasTable('faca_vinculo_pa_mp')) {
      const collection = app.findCollectionByNameOrId('faca_vinculo_pa_mp')
      app.delete(collection)
    }
    if (app.hasTable('faca_parametrizacao_materiais')) {
      const collection = app.findCollectionByNameOrId('faca_parametrizacao_materiais')
      app.delete(collection)
    }
  },
)
