migrate(
  (app) => {
    // 1. Coleção: pcp_crm_revision_pendencies (Integração PCP Robotizado ↔ CRM 360º)
    if (!app.hasTable('pcp_crm_revision_pendencies')) {
      const col = new Collection({
        name: 'pcp_crm_revision_pendencies',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'protocolo', type: 'text', required: true },
          { name: 'order_id', type: 'text', required: true },
          { name: 'origem', type: 'text', required: true },
          { name: 'tipo_pendencia', type: 'text', required: true },
          { name: 'empresa', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'linha', type: 'text' },
          { name: 'ordem_venda', type: 'text', required: true },
          { name: 'item_ordem', type: 'text', required: true },
          { name: 'cliente_codigo', type: 'text' },
          { name: 'cliente_nome', type: 'text', required: true },
          { name: 'representante_vendedor', type: 'text' },
          { name: 'material_codigo', type: 'text', required: true },
          { name: 'material_descricao', type: 'text' },
          { name: 'quantidade_t', type: 'number' },
          { name: 'valor_brl', type: 'number' },
          { name: 'data_ordem', type: 'text' },
          { name: 'data_desejada', type: 'text' },
          { name: 'motivo_sap_original', type: 'text', required: true },
          { name: 'categoria_motivo', type: 'text' },
          { name: 'analise_ia', type: 'text' },
          { name: 'evidencias_ia', type: 'text' },
          { name: 'responsabilidade_provavel', type: 'text' },
          { name: 'motivo_solicitacao', type: 'text', required: true },
          { name: 'justificativa', type: 'text', required: true },
          { name: 'prioridade', type: 'text', required: true },
          { name: 'responsavel_destino', type: 'text', required: true },
          { name: 'prazo_retorno', type: 'text' },
          { name: 'solicitante_nome', type: 'text' },
          { name: 'data_solicitacao', type: 'text' },
          { name: 'status_crm', type: 'text', required: true }, // 'Em análise' | 'Motivo confirmado' | 'Motivo corrigido' | 'Improcedente' | 'Concluído'
          { name: 'motivo_validado_apos_revisao', type: 'text' },
          { name: 'observacao_crm', type: 'text' },
          { name: 'responsavel_validacao_crm', type: 'text' },
          { name: 'data_conclusao_crm', type: 'text' },
          { name: 'payload_completo', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_crm_rev_protocolo ON pcp_crm_revision_pendencies (protocolo)',
          'CREATE INDEX idx_crm_rev_order_item ON pcp_crm_revision_pendencies (ordem_venda, item_ordem)',
          'CREATE INDEX idx_crm_rev_order_id ON pcp_crm_revision_pendencies (order_id)',
          'CREATE INDEX idx_crm_rev_cliente ON pcp_crm_revision_pendencies (cliente_codigo)',
          'CREATE INDEX idx_crm_rev_status ON pcp_crm_revision_pendencies (status_crm)',
        ],
      })
      app.save(col)
    }
  },
  (app) => {
    if (app.hasTable('pcp_crm_revision_pendencies')) {
      const col = app.findCollectionByNameOrId('pcp_crm_revision_pendencies')
      app.delete(col)
    }
  },
)
