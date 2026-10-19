/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    if (!app.hasTable('pcp_cobrancas_pendencias')) {
      const cobrancasCol = new Collection({
        name: 'pcp_cobrancas_pendencias',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""', // Permitido para retry do canal com erro
        deleteRule: null, // Histórico imutável — não permitido apagar
        fields: [
          // Identificação da cobrança e pendência vinculada
          { name: 'codigo_cobranca', type: 'text', required: true }, // COB-000001
          { name: 'pendencia_id', type: 'text', required: true },
          { name: 'pendencia_codigo', type: 'text', required: true }, // PEND-000001
          { name: 'sequencial_pendencia', type: 'number', required: true }, // 1, 2, 3...
          { name: 'data_hora', type: 'text', required: true }, // dd/mm/aaaa HH:mm ou ISO formatado

          // Dados da pendência no momento da cobrança
          { name: 'assunto', type: 'text' },
          { name: 'acao', type: 'text' },
          { name: 'area', type: 'text' },
          { name: 'reuniao_origem', type: 'text' },
          { name: 'prazo', type: 'text' },
          { name: 'dias_aberto', type: 'number' },
          { name: 'status_pendencia', type: 'text' },

          // Usuários envolvidos
          { name: 'emissor_id', type: 'text', required: true },
          { name: 'emissor_nome', type: 'text', required: true },
          { name: 'emissor_email', type: 'text' },
          { name: 'destinatario_id', type: 'text' },
          { name: 'destinatario_nome', type: 'text', required: true },
          { name: 'destinatario_email', type: 'text', required: true },

          // Conteúdo complementar
          { name: 'mensagem_complementar', type: 'text' },

          // Canal Meu Dia
          {
            name: 'status_meu_dia',
            type: 'select',
            values: ['ENVIADO', 'ERRO', 'PENDENTE', 'NAO_APLICAVEL'],
            maxSelect: 1,
            required: true,
          },
          { name: 'meu_dia_id', type: 'text' },
          { name: 'meu_dia_enviado_em', type: 'text' },
          { name: 'meu_dia_erro_motivo', type: 'text' },

          // Canal E-mail
          {
            name: 'status_email',
            type: 'select',
            values: ['ENVIADO', 'AGUARDANDO_SMTP', 'ERRO', 'PENDENTE', 'NAO_APLICAVEL'],
            maxSelect: 1,
            required: true,
          },
          { name: 'email_enviado_em', type: 'text' },
          { name: 'email_erro_motivo', type: 'text' },
          { name: 'email_destinatario_real', type: 'text' },

          // Idempotência
          { name: 'idempotency_key', type: 'text' },

          // Metadados técnicos e auditoria
          { name: 'metadata', type: 'json' },

          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pcp_cob_pend ON pcp_cobrancas_pendencias (pendencia_id)',
          'CREATE INDEX idx_pcp_cob_pend_code ON pcp_cobrancas_pendencias (pendencia_codigo)',
          'CREATE INDEX idx_pcp_cob_emissor ON pcp_cobrancas_pendencias (emissor_id)',
          'CREATE INDEX idx_pcp_cob_dest ON pcp_cobrancas_pendencias (destinatario_nome)',
          'CREATE INDEX idx_pcp_cob_idemp ON pcp_cobrancas_pendencias (idempotency_key)',
        ],
      })
      app.save(cobrancasCol)
    }
  },
  (app) => {
    if (app.hasTable('pcp_cobrancas_pendencias')) {
      app.delete(app.findCollectionByNameOrId('pcp_cobrancas_pendencias'))
    }
  },
)
