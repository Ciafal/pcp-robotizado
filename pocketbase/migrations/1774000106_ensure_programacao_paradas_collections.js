/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Tabela Principal de Programação de Parada
    if (!app.hasTable('programacao_paradas')) {
      const paradas = new Collection({
        name: 'programacao_paradas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo', type: 'text', required: true }, // ex.: PP-00001/2026
          { name: 'versao', type: 'number', required: true }, // 1, 2, 3...
          { name: 'versao_rotulo', type: 'text' }, // V01, V02...
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['RASCUNHO', 'VALIDADA', 'COMUNICADA', 'CANCELADA', 'CONCLUIDA'],
            maxSelect: 1,
          },
          { name: 'observacao_geral', type: 'text' },
          {
            name: 'criado_por_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'criado_por_nome', type: 'text' },
          {
            name: 'atualizado_por_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'atualizado_por_nome', type: 'text' },
          { name: 'ultima_alteracao', type: 'text' },
          { name: 'analise_ia', type: 'json' },
          { name: 'ultimo_comunicado_em', type: 'text' },
          { name: 'ultimo_comunicado_versao', type: 'number' },
          { name: 'programacao_alterada_pos_comunicado', type: 'bool' },
          { name: 'historico_versoes', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_prog_paradas_codigo ON programacao_paradas (codigo)',
          'CREATE INDEX idx_prog_paradas_status ON programacao_paradas (status)',
        ],
      })
      app.save(paradas)
    }

    // 2. Centros / Linhas associados à parada (Múltiplos centros por programação)
    if (!app.hasTable('programacao_parada_centros')) {
      const paradasCollection = app.findCollectionByNameOrId('programacao_paradas')
      const paradaCentros = new Collection({
        name: 'programacao_parada_centros',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'parada_id',
            type: 'relation',
            collectionId: paradasCollection.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'codigo_parada', type: 'text', required: true },
          { name: 'empresa_id', type: 'text', required: true },
          { name: 'empresa_nome', type: 'text', required: true },
          { name: 'linha_id', type: 'text', required: true },
          { name: 'linha_nome', type: 'text', required: true },
          { name: 'centro_id', type: 'text', required: true },
          { name: 'centro_nome', type: 'text', required: true },
          { name: 'data_inicio', type: 'text', required: true }, // dd/mm/aaaa
          { name: 'hora_inicio', type: 'text', required: true }, // HH:mm
          { name: 'data_fim', type: 'text', required: true }, // dd/mm/aaaa
          { name: 'hora_fim', type: 'text', required: true }, // HH:mm
          { name: 'inicio_iso', type: 'text', required: true }, // YYYY-MM-DD HH:mm
          { name: 'fim_iso', type: 'text', required: true }, // YYYY-MM-DD HH:mm
          { name: 'duracao_horas', type: 'number' },
          { name: 'duracao_formatada', type: 'text' },
          {
            name: 'motivo',
            type: 'select',
            required: true,
            values: [
              'Manutenção preventiva',
              'Manutenção geral',
              'Reforma de equipamento',
              'Intervenção elétrica',
              'Intervenção mecânica',
              'Troca de equipamento',
              'Obra civil',
              'Indisponibilidade operacional',
              'Outro',
            ],
            maxSelect: 1,
          },
          { name: 'motivo_outro_detalhe', type: 'text' },
          { name: 'descricao', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ATIVO', 'CANCELADO', 'CONCLUIDO'],
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pp_centros_parada ON programacao_parada_centros (parada_id)',
          'CREATE INDEX idx_pp_centros_centro ON programacao_parada_centros (centro_id)',
          'CREATE INDEX idx_pp_centros_periodo ON programacao_parada_centros (inicio_iso, fim_iso)',
        ],
      })
      app.save(paradaCentros)
    }

    // 3. Histórico de Comunicados Enviados / Rascunhos
    if (!app.hasTable('programacao_parada_comunicados')) {
      const paradasCollection = app.findCollectionByNameOrId('programacao_paradas')
      const comunicados = new Collection({
        name: 'programacao_parada_comunicados',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'parada_id',
            type: 'relation',
            collectionId: paradasCollection.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'codigo_parada', type: 'text', required: true },
          { name: 'versao_programacao', type: 'number', required: true },
          { name: 'assunto', type: 'text', required: true },
          { name: 'conteudo', type: 'text', required: true },
          { name: 'destinatarios_para', type: 'json' }, // array de emails
          { name: 'destinatarios_cc', type: 'json' }, // array de emails
          { name: 'grupos_destinatarios', type: 'json' }, // array de grupos selecionados
          {
            name: 'usuario_envio_id',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'usuario_envio_nome', type: 'text' },
          { name: 'data_hora_envio', type: 'text', required: true },
          {
            name: 'resultado_envio',
            type: 'select',
            required: true,
            values: ['SUCESSO', 'FALHA', 'RASCUNHO'],
            maxSelect: 1,
          },
          { name: 'mensagem_erro', type: 'text' },
          { name: 'tipo_comunicado', type: 'text' }, // INICIAL ou ATUALIZACAO
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pp_comms_parada ON programacao_parada_comunicados (parada_id)',
          'CREATE INDEX idx_pp_comms_dt ON programacao_parada_comunicados (data_hora_envio)',
        ],
      })
      app.save(comunicados)
    }

    // 4. Coleção de Histórico de Parada (para registrar versões V01, V02, diffs e logs)
    if (!app.hasTable('programacao_parada_historico')) {
      const paradasCollection = app.findCollectionByNameOrId('programacao_paradas')
      const historico = new Collection({
        name: 'programacao_parada_historico',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'parada_id',
            type: 'relation',
            collectionId: paradasCollection.id,
            required: true,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'codigo_parada', type: 'text', required: true },
          { name: 'versao', type: 'number', required: true },
          { name: 'versao_rotulo', type: 'text' },
          { name: 'tipo_evento', type: 'text', required: true }, // CRIACAO, EDICAO, VALIDACAO, COMUNICADO, CANCELAMENTO
          { name: 'descricao_alteracao', type: 'text' },
          { name: 'dados_anteriores', type: 'json' },
          { name: 'dados_novos', type: 'json' },
          { name: 'usuario_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'usuario_nome', type: 'text' },
          { name: 'data_hora', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_pp_hist_parada ON programacao_parada_historico (parada_id)',
          'CREATE INDEX idx_pp_hist_codigo ON programacao_parada_historico (codigo_parada)',
        ],
      })
      app.save(historico)
    }

    // 5. Cadastrar permissões RBAC específicas caso não existam
    try {
      const permissionsCol = app.findCollectionByNameOrId('pcp_permissions')
      const rolesCol = app.findCollectionByNameOrId('pcp_roles')
      const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')

      const requiredPermissions = [
        {
          key: 'pcp.parada.view',
          name: 'Visualizar Programação de Parada',
          category: 'Programação',
          description: 'Permite visualizar as paradas programadas e consultas',
          is_critical: false,
        },
        {
          key: 'pcp.parada.create',
          name: 'Criar Programação de Parada',
          category: 'Programação',
          description: 'Permite criar rascunhos de parada programada',
          is_critical: false,
        },
        {
          key: 'pcp.parada.edit',
          name: 'Editar Programação de Parada',
          category: 'Programação',
          description: 'Permite alterar dados e períodos da parada',
          is_critical: false,
        },
        {
          key: 'pcp.parada.validate',
          name: 'Validar e Aprovar Parada Programada',
          category: 'Programação',
          description: 'Permite validar a parada e oficializar bloqueio de capacidade',
          is_critical: true,
        },
        {
          key: 'pcp.parada.comunicar',
          name: 'Enviar Comunicado de Parada Programada',
          category: 'Programação',
          description: 'Permite disparar comunicados corporativos de parada',
          is_critical: false,
        },
        {
          key: 'pcp.parada.cancel',
          name: 'Cancelar Programação de Parada',
          category: 'Programação',
          description: 'Permite cancelar formalmente uma programação de parada',
          is_critical: true,
        },
      ]

      for (let i = 0; i < requiredPermissions.length; i++) {
        const p = requiredPermissions[i]
        let existingPerm = null
        try {
          existingPerm = app.findFirstRecordByFilter('pcp_permissions', `key = '${p.key}'`)
        } catch (e) {
          existingPerm = null
        }

        if (!existingPerm) {
          const permRec = new Record(permissionsCol, {
            key: p.key,
            name: p.name,
            category: p.category,
            description: p.description,
            is_critical: p.is_critical,
          })
          app.save(permRec)
          existingPerm = permRec
        }

        const allowedRoles = p.is_critical
          ? ['PCP_ADMIN', 'PCP_PROGRAMMER', 'LINE_MANAGER']
          : ['PCP_ADMIN', 'PCP_PROGRAMMER', 'LINE_MANAGER', 'PRODUCTION_VIEWER', 'EXECUTIVE_VIEWER']

        for (let r = 0; r < allowedRoles.length; r++) {
          const roleCode = allowedRoles[r]
          try {
            const roleRecord = app.findFirstRecordByFilter('pcp_roles', `code = '${roleCode}'`)
            if (roleRecord && existingPerm) {
              let existingLink = null
              try {
                existingLink = app.findFirstRecordByFilter(
                  'pcp_role_permissions',
                  `role_id = '${roleRecord.id}' && permission_id = '${existingPerm.id}'`,
                )
              } catch (err) {
                existingLink = null
              }
              if (!existingLink) {
                const linkRec = new Record(rolePermsCol, {
                  role_id: roleRecord.id,
                  permission_id: existingPerm.id,
                })
                app.save(linkRec)
              }
            }
          } catch (errRole) {
            // segue
          }
        }
      }
    } catch (errPerm) {
      console.log('Aviso ao vincular permissões de parada: ' + errPerm.message)
    }
  },
  (app) => {
    // Idempotente / reversão segura — nunca derrubar coleções em ambiente produtivo se houver dados
  },
)
