/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Collection mp_out_of_standard_evaluations — Avaliações de Aproveitamento de MP Fora do Padrão (ZPP88 / ZPP86)
    if (!app.hasTable('mp_out_of_standard_evaluations')) {
      const col = new Collection({
        name: 'mp_out_of_standard_evaluations',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: null, // Auditável: exclusão lógica / cancelamento apenas
        fields: [
          // Identificação sequencial única AMP-000001/2026
          { name: 'numero_sequencial', type: 'text', required: true },
          {
            name: 'situacao',
            type: 'select',
            values: ['Em análise', 'Aprovada', 'Reprovada', 'Cancelada'],
            maxSelect: 1,
            required: true,
          },
          {
            name: 'status_compatibilidade',
            type: 'select',
            values: [
              'Compatível',
              'Compatível com ressalva',
              'Incompatível',
              'Aguardando avaliação',
            ],
            maxSelect: 1,
            required: true,
          },

          // BLOCO A: Dados da Peça / MP Atual (ZPP86 / ZPP88)
          { name: 'centro', type: 'text', required: true },
          { name: 'material', type: 'text', required: true },
          { name: 'material_descricao', type: 'text' },
          { name: 'item_identificacao', type: 'text' }, // ex: BLOCO-4410-01
          { name: 'lote', type: 'text' },
          { name: 'peso_kg', type: 'number', required: true },
          { name: 'aplicacao_atual', type: 'text', required: true },
          { name: 'fornecedor', type: 'text' },
          { name: 'fornecedor_codigo', type: 'text' },
          { name: 'deposito', type: 'text' },
          { name: 'tipo_aco', type: 'text' },
          { name: 'bitola', type: 'text' },
          { name: 'corrida', type: 'text' },

          // Card Dimensões da Peça Atual (valores numéricos e exibição brasileira)
          { name: 'espessura_mm', type: 'number', required: true },
          { name: 'largura_mm', type: 'number', required: true },
          { name: 'comprimento_mm', type: 'number', required: true },

          // BLOCO B: Nova Aplicação Avaliada
          { name: 'motivo', type: 'text', required: true },
          { name: 'nova_aplicacao', type: 'text', required: true },
          { name: 'nova_aplicacao_nome', type: 'text' },
          { name: 'permite_fora_do_padrao', type: 'bool', required: true },

          // Parâmetros nominais / limites da Nova Aplicação
          { name: 'nova_peso_min_kg', type: 'number' },
          { name: 'nova_peso_max_kg', type: 'number' },
          { name: 'nova_espessura_min_mm', type: 'number' },
          { name: 'nova_espessura_max_mm', type: 'number' },
          { name: 'nova_largura_min_mm', type: 'number' },
          { name: 'nova_largura_max_mm', type: 'number' },
          { name: 'nova_comprimento_min_mm', type: 'number' },
          { name: 'nova_comprimento_max_mm', type: 'number' },

          // Comparativo técnico estruturado (tabela Parâmetro | Peça atual | Nova aplicação | Resultado)
          { name: 'comparativo_json', type: 'json' },

          // Origem e Regra de Cálculo
          // Prioridades: 1-SAP/ZPP86/ZPP88, 2-Parâmetros PCP, 3-Ficha Mestra, 4-Regras Formais CIAFAL
          { name: 'origem_regra', type: 'text', required: true },
          { name: 'regra_tecnica_detalhe', type: 'text' },
          { name: 'regra_parametrizada', type: 'bool' },

          // Integração SAP e Estoque (camadas Entrada / Processamento / Saída)
          { name: 'origem_dados', type: 'text' }, // "SAP_RFC_PENDENTE" | "CADASTRO_PCP_OFICIAL"
          { name: 'pendencia_rfc_sap', type: 'bool' },
          { name: 'aplicacao_alternativa_aprovada', type: 'bool' },
          { name: 'estoque_movimentado', type: 'bool' }, // Sempre false nesta etapa — NÃO altera estoque automaticamente
          { name: 'sap_sync_status', type: 'text' }, // "PREPARADO_PARA_USO_FUTURO"

          // Responsabilidade e Auditoria
          { name: 'avaliador_id', type: 'text' },
          { name: 'avaliador_nome', type: 'text', required: true },
          { name: 'avaliador_email', type: 'text' },
          { name: 'avaliador_cargo', type: 'text' },
          { name: 'data_avaliacao', type: 'text', required: true }, // dd/mm/aaaa
          { name: 'hora_avaliacao', type: 'text', required: true }, // HH:mm:ss

          { name: 'responsavel_decisao_id', type: 'text' },
          { name: 'responsavel_decisao_nome', type: 'text' },
          { name: 'responsavel_decisao_cargo', type: 'text' },
          { name: 'data_decisao', type: 'text' },
          { name: 'decisao_justificativa', type: 'text' },

          // Ponto de extensão IA
          { name: 'ia_analise_json', type: 'json' },
          { name: 'ia_recomendacao', type: 'text' },
          { name: 'ia_score', type: 'number' },

          // Cancelamento lógico
          { name: 'cancelado_em', type: 'text' },
          { name: 'cancelado_por', type: 'text' },
          { name: 'motivo_cancelamento', type: 'text' },

          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_eval_seq ON mp_out_of_standard_evaluations (numero_sequencial)',
          'CREATE INDEX idx_mp_eval_mat ON mp_out_of_standard_evaluations (material)',
          'CREATE INDEX idx_mp_eval_lote ON mp_out_of_standard_evaluations (lote)',
          'CREATE INDEX idx_mp_eval_sit ON mp_out_of_standard_evaluations (situacao)',
          'CREATE INDEX idx_mp_eval_status ON mp_out_of_standard_evaluations (status_compatibilidade)',
          'CREATE INDEX idx_mp_eval_created ON mp_out_of_standard_evaluations (created DESC)',
        ],
      })
      app.save(col)
    }

    // 2. Registrar permissões do módulo em pcp_permissions e vincular aos roles
    const perms = [
      {
        key: 'pcp.mp_out_of_standard.view',
        name: 'Visualizar Avaliações de MP Fora do Padrão',
        category: 'Gestão de MP',
        description:
          'Permite consultar as avaliações de aproveitamento de matéria-prima fora do padrão (ZPP88/ZPP86).',
        is_critical: false,
      },
      {
        key: 'pcp.mp_out_of_standard.create',
        name: 'Criar Avaliação de MP Fora do Padrão',
        category: 'Gestão de MP',
        description: 'Permite submeter nova avaliação de aproveitamento de MP/peça fora do padrão.',
        is_critical: false,
      },
      {
        key: 'pcp.mp_out_of_standard.edit',
        name: 'Editar Avaliação de MP Fora do Padrão',
        category: 'Gestão de MP',
        description: 'Permite alterar parâmetros técnicos e dados de uma avaliação em análise.',
        is_critical: false,
      },
      {
        key: 'pcp.mp_out_of_standard.decide',
        name: 'Aprovar / Reprovar Avaliação de MP Fora do Padrão',
        category: 'Gestão de MP',
        description:
          'Permite tomar a decisão formal de aprovação ou reprovação da peça para nova aplicação.',
        is_critical: true,
      },
      {
        key: 'pcp.mp_out_of_standard.cancel',
        name: 'Cancelar Avaliação de MP Fora do Padrão',
        category: 'Gestão de MP',
        description: 'Permite cancelamento lógico de uma avaliação preservando a rastreabilidade.',
        is_critical: true,
      },
    ]

    const permIds = {}
    for (const p of perms) {
      let rec = null
      try {
        rec = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {}
      if (!rec) {
        const pCol = app.findCollectionByNameOrId('pcp_permissions')
        rec = new Record(pCol, p)
        app.save(rec)
      }
      permIds[p.key] = rec.id
    }

    // Vincular permissões a PCP_ADMIN (todas) e PCP_PROGRAMMER (view, create, edit, decide)
    const roleAdmin = (() => {
      try {
        return app.findFirstRecordByData('pcp_roles', 'code', 'PCP_ADMIN')
      } catch (_) {
        return null
      }
    })()

    const roleProg = (() => {
      try {
        return app.findFirstRecordByData('pcp_roles', 'code', 'PCP_PROGRAMMER')
      } catch (_) {
        return null
      }
    })()

    const roleRpCol = (() => {
      try {
        return app.findCollectionByNameOrId('pcp_role_permissions')
      } catch (_) {
        return null
      }
    })()

    if (roleRpCol) {
      const grant = (roleId, permKey) => {
        if (!roleId || !permIds[permKey]) return
        try {
          const existing = app.findRecordsByFilter(
            'pcp_role_permissions',
            `role_id = '${roleId}' && permission_id = '${permIds[permKey]}'`,
            '',
            1,
            0,
          )
          if (existing.length === 0) {
            const r = new Record(roleRpCol, {
              role_id: roleId,
              permission_id: permIds[permKey],
            })
            app.save(r)
          }
        } catch (_) {}
      }

      if (roleAdmin) {
        grant(roleAdmin.id, 'pcp.mp_out_of_standard.view')
        grant(roleAdmin.id, 'pcp.mp_out_of_standard.create')
        grant(roleAdmin.id, 'pcp.mp_out_of_standard.edit')
        grant(roleAdmin.id, 'pcp.mp_out_of_standard.decide')
        grant(roleAdmin.id, 'pcp.mp_out_of_standard.cancel')
      }

      if (roleProg) {
        grant(roleProg.id, 'pcp.mp_out_of_standard.view')
        grant(roleProg.id, 'pcp.mp_out_of_standard.create')
        grant(roleProg.id, 'pcp.mp_out_of_standard.edit')
        grant(roleProg.id, 'pcp.mp_out_of_standard.decide')
      }
    }
  },
  (app) => {
    try {
      if (app.hasTable('mp_out_of_standard_evaluations')) {
        app.delete(app.findCollectionByNameOrId('mp_out_of_standard_evaluations'))
      }
    } catch (_) {}
  },
)
