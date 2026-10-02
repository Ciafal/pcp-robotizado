/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Collection pcp_comercial_comunicados — Comunicados emitidos do PCP ao Comercial e Meu Dia
    if (!app.hasTable('pcp_comercial_comunicados')) {
      const col = new Collection({
        name: 'pcp_comercial_comunicados',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Auditável, nunca deletar
        fields: [
          { name: 'numero_sequencial', type: 'text', required: true }, // ex: COM-PCP-000001/2026
          { name: 'tipo', type: 'text', required: true }, // "Carteira mínima não atingida"
          { name: 'assunto', type: 'text', required: true },
          { name: 'mensagem', type: 'text', required: true },
          { name: 'mensagem_original', type: 'text' },
          {
            name: 'prioridade',
            type: 'select',
            values: ['Normal', 'Atenção', 'Crítica'],
            maxSelect: 1,
            required: true,
          },
          { name: 'destinos_json', type: 'json' }, // ["COMERCIAL_HUB", "MEU_DIA"]
          { name: 'data_meu_dia', type: 'text' }, // dd/mm/aaaa ou ISO
          { name: 'destinatarios_json', type: 'json' }, // lista de usuários/emails selecionados
          { name: 'itens_relacionados_json', type: 'json' }, // array resumido dos itens
          { name: 'itens_count', type: 'number' },
          { name: 'remetente_id', type: 'text' },
          { name: 'remetente_nome', type: 'text' },
          { name: 'remetente_email', type: 'text' },
          { name: 'origem_sistema', type: 'text' }, // "PCP Robotizado"
          { name: 'modulo_origem', type: 'text' }, // "Análise de Carteira > Carteira mínima não atingida"
          { name: 'link_origem', type: 'text' },
          {
            name: 'status',
            type: 'select',
            values: ['Enviado', 'Em análise', 'Respondido', 'Encerrado'],
            maxSelect: 1,
            required: true,
          },
          { name: 'foi_aprimorado_ia', type: 'bool' },
          { name: 'leitura_confirmada', type: 'bool' },
          { name: 'leitura_confirmada_em', type: 'text' },
          { name: 'leitura_confirmada_por', type: 'text' },
          { name: 'resposta_comercial', type: 'text' },
          { name: 'respondido_em', type: 'text' },
          { name: 'respondido_por', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcc_seq ON pcp_comercial_comunicados (numero_sequencial)',
          'CREATE INDEX idx_pcc_status ON pcp_comercial_comunicados (status)',
          'CREATE INDEX idx_pcc_created ON pcp_comercial_comunicados (created DESC)',
        ],
      })
      app.save(col)
    }

    // 2. Collection pcp_comercial_item_status — Rastreabilidade por item/pedido
    if (!app.hasTable('pcp_comercial_item_status')) {
      const itemCol = new Collection({
        name: 'pcp_comercial_item_status',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null,
        fields: [
          { name: 'item_chave', type: 'text', required: true }, // ex: "PED-251967_10_C352DIN30470C"
          { name: 'material', type: 'text', required: true },
          { name: 'pedido_venda', type: 'text' },
          { name: 'item_pedido', type: 'text' },
          { name: 'ultimo_comunicado_id', type: 'text' },
          { name: 'ultimo_comunicado_numero', type: 'text' },
          { name: 'ultimo_envio_em', type: 'text' },
          { name: 'ultimo_envio_por', type: 'text' },
          { name: 'total_envios', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['Não enviado', 'Enviado', 'Em análise', 'Respondido', 'Encerrado'],
            maxSelect: 1,
            required: true,
          },
          { name: 'historico_envios_json', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pcis_chave ON pcp_comercial_item_status (item_chave)',
          'CREATE INDEX idx_pcis_mat ON pcp_comercial_item_status (material)',
          'CREATE INDEX idx_pcis_status ON pcp_comercial_item_status (status)',
        ],
      })
      app.save(itemCol)
    }
  },
  (app) => {
    try {
      if (app.hasTable('pcp_comercial_item_status')) {
        app.delete(app.findCollectionByNameOrId('pcp_comercial_item_status'))
      }
    } catch (_) {}
    try {
      if (app.hasTable('pcp_comercial_comunicados')) {
        app.delete(app.findCollectionByNameOrId('pcp_comercial_comunicados'))
      }
    } catch (_) {}
  },
)
