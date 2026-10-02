/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. ajustes_operacionais — Ajustes Operacionais do PCP Robotizado
    if (!app.hasTable('ajustes_operacionais')) {
      const ajustesCol = new Collection({
        name: 'ajustes_operacionais',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Exclusão lógica: nunca apagar
        fields: [
          // Identificação e Rastreabilidade
          { name: 'numero', type: 'text', required: true }, // AOP-000001/AAAA
          { name: 'ano', type: 'number', required: true },
          { name: 'sequencial_ano', type: 'number', required: true },
          { name: 'checklist_item_id', type: 'text', required: true },
          { name: 'checklist_modelo_id', type: 'text' },
          { name: 'competencia', type: 'text', required: true }, // MM/AAAA

          // Estrutura Organizacional / Localização
          { name: 'werks', type: 'text' },
          { name: 'empresa_nome', type: 'text' },
          { name: 'linha_id', type: 'text' },
          { name: 'linha_code', type: 'text' },
          { name: 'linha_name', type: 'text' },
          { name: 'centro_id', type: 'text' },
          { name: 'centro_code', type: 'text' },
          { name: 'centro_name', type: 'text' },

          // Atividade de Origem e Pendência
          {
            name: 'status_origem',
            type: 'select',
            values: ['ERRO', 'PENDENTE'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'tipo',
            type: 'select',
            values: [
              'Apontamento',
              'Estoque',
              'Movimento SAP',
              'Ordem de produção',
              'Divergência de quantidade',
              'Fechamento',
              'Cadastro',
              'Processo',
              'Outro',
            ],
            maxSelect: 1,
            required: true,
          },
          { name: 'descricao', type: 'text', required: true },
          { name: 'acao_necessaria', type: 'text', required: true },
          {
            name: 'prioridade',
            type: 'select',
            values: ['Baixa', 'Média', 'Alta', 'Crítica'],
            maxSelect: 1,
            required: true,
          },
          { name: 'prazo', type: 'date', required: true },

          // Dados Industriais e SAP
          { name: 'ordem_sap', type: 'text' },
          { name: 'material', type: 'text' },
          { name: 'lote', type: 'text' },
          { name: 'quantidade', type: 'number' },
          { name: 'transacao_sap', type: 'text' },
          { name: 'observacao_adicional', type: 'text' },

          // Solicitante e Responsável
          { name: 'solicitante_id', type: 'text' },
          { name: 'solicitante_nome', type: 'text', required: true },
          { name: 'responsavel_id', type: 'text' },
          { name: 'responsavel_nome', type: 'text', required: true },

          // Ciclo de Vida e Validação
          {
            name: 'status',
            type: 'select',
            values: ['Nova', 'Em andamento', 'Aguardando informação', 'Concluída', 'Cancelada'],
            maxSelect: 1,
            required: true,
          },
          { name: 'concluida_em', type: 'date' },
          { name: 'validada_pcp', type: 'bool' },
          { name: 'validada_por_nome', type: 'text' },
          { name: 'validada_em', type: 'date' },
          { name: 'justificativa_cancelamento', type: 'text' },
          { name: 'justificativa_reabertura', type: 'text' },

          // Rastreabilidade com Meu Dia
          { name: 'meu_dia_id', type: 'text' },

          // Exclusão Lógica
          { name: 'excluido', type: 'bool' },
          { name: 'excluido_em', type: 'date' },
          { name: 'excluido_por', type: 'text' },

          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_aop_numero ON ajustes_operacionais (numero)',
          'CREATE INDEX idx_aop_item ON ajustes_operacionais (checklist_item_id)',
          'CREATE INDEX idx_aop_comp ON ajustes_operacionais (competencia)',
          'CREATE INDEX idx_aop_status ON ajustes_operacionais (status)',
          'CREATE INDEX idx_aop_centro ON ajustes_operacionais (centro_code)',
          'CREATE INDEX idx_aop_linha ON ajustes_operacionais (linha_code)',
          'CREATE INDEX idx_aop_resp ON ajustes_operacionais (responsavel_id)',
        ],
      })
      app.save(ajustesCol)
    }

    // 2. ajustes_operacionais_evidencias — Evidências e comprovantes anexados
    if (!app.hasTable('ajustes_operacionais_evidencias')) {
      const evidenciasCol = new Collection({
        name: 'ajustes_operacionais_evidencias',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Exclusão lógica
        fields: [
          { name: 'ajuste_id', type: 'text', required: true },
          { name: 'arquivo', type: 'file', maxSize: 20971520 }, // 20MB
          { name: 'nome_arquivo', type: 'text', required: true },
          { name: 'tipo_mime', type: 'text' },
          { name: 'tamanho_bytes', type: 'number' },
          { name: 'url_ou_caminho', type: 'text' },
          { name: 'registrado_por', type: 'text', required: true },
          { name: 'registrado_por_id', type: 'text' },
          { name: 'registrado_em', type: 'date', required: true },
          { name: 'observacao', type: 'text' },
          { name: 'excluido', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_aoe_ajuste ON ajustes_operacionais_evidencias (ajuste_id)',
          'CREATE INDEX idx_aoe_reg ON ajustes_operacionais_evidencias (registrado_em)',
        ],
      })
      app.save(evidenciasCol)
    }

    // 3. ajustes_operacionais_historico — Append-only audit trail do Ajuste
    if (!app.hasTable('ajustes_operacionais_historico')) {
      const historicoCol = new Collection({
        name: 'ajustes_operacionais_historico',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: null, // Imutável
        deleteRule: null, // Imutável
        fields: [
          { name: 'ajuste_id', type: 'text', required: true },
          { name: 'usuario', type: 'text', required: true },
          { name: 'usuario_id', type: 'text' },
          { name: 'acao', type: 'text', required: true },
          { name: 'valor_anterior', type: 'text' },
          { name: 'valor_novo', type: 'text' },
          { name: 'data_hora', type: 'text', required: true },
          { name: 'detalhes_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_aoh_ajuste ON ajustes_operacionais_historico (ajuste_id)',
          'CREATE INDEX idx_aoh_dh ON ajustes_operacionais_historico (data_hora)',
        ],
      })
      app.save(historicoCol)
    }

    // 4. meu_dia_pendencias — Hub corporativo de pendências e tarefas do Meu Dia
    if (!app.hasTable('meu_dia_pendencias')) {
      const meuDiaCol = new Collection({
        name: 'meu_dia_pendencias',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Auditável
        fields: [
          { name: 'origem_sistema', type: 'text', required: true }, // PCP Robotizado
          { name: 'modulo', type: 'text', required: true }, // Controle de Produção
          { name: 'funcao', type: 'text', required: true }, // Check-list Fechamento
          { name: 'categoria', type: 'text', required: true }, // PCP — Ajuste Operacional
          { name: 'titulo', type: 'text', required: true }, // "PCP | Ajuste Operacional | [código+descrição curta] | [linha]"
          { name: 'competencia', type: 'text', required: true }, // MM/AAAA
          { name: 'empresa', type: 'text' },
          { name: 'linha', type: 'text' },
          { name: 'linha_id', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'centro_id', type: 'text' },
          { name: 'codigo_atividade', type: 'text' },
          { name: 'atividade_titulo', type: 'text' },
          { name: 'status_origem', type: 'text' }, // ERRO ou PENDENTE
          { name: 'tipo_pendencia', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: true },
          { name: 'acao_necessaria', type: 'text', required: true },
          {
            name: 'prioridade',
            type: 'select',
            values: ['Baixa', 'Média', 'Alta', 'Crítica'],
            maxSelect: 1,
            required: true,
          },
          { name: 'prazo', type: 'date', required: true },
          { name: 'solicitante_id', type: 'text' },
          { name: 'solicitante_nome', type: 'text', required: true },
          { name: 'responsavel_id', type: 'text' },
          { name: 'responsavel_nome', type: 'text', required: true },
          { name: 'responsavel_email', type: 'text' },
          { name: 'data_hora', type: 'text', required: true },
          { name: 'link_origem', type: 'text', required: true }, // Link para abrir no Check-list
          { name: 'ajuste_id', type: 'text' },
          { name: 'ajuste_numero', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Nova', 'Em andamento', 'Aguardando informação', 'Concluída', 'Cancelada'],
            maxSelect: 1,
            required: true,
          },
          { name: 'concluida_em', type: 'date' },
          { name: 'concluida_por', type: 'text' },
          { name: 'observacao_conclusao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_mdp_resp ON meu_dia_pendencias (responsavel_id)',
          'CREATE INDEX idx_mdp_status ON meu_dia_pendencias (status)',
          'CREATE INDEX idx_mdp_ajuste ON meu_dia_pendencias (ajuste_id)',
          'CREATE INDEX idx_mdp_comp ON meu_dia_pendencias (competencia)',
        ],
      })
      app.save(meuDiaCol)
    }
  },
  (app) => {
    if (app.hasTable('meu_dia_pendencias')) {
      app.delete(app.findCollectionByNameOrId('meu_dia_pendencias'))
    }
    if (app.hasTable('ajustes_operacionais_historico')) {
      app.delete(app.findCollectionByNameOrId('ajustes_operacionais_historico'))
    }
    if (app.hasTable('ajustes_operacionais_evidencias')) {
      app.delete(app.findCollectionByNameOrId('ajustes_operacionais_evidencias'))
    }
    if (app.hasTable('ajustes_operacionais')) {
      app.delete(app.findCollectionByNameOrId('ajustes_operacionais'))
    }
  },
)
