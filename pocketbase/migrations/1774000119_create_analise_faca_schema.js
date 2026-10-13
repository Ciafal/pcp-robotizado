migrate(
  (app) => {
    // 1. Permissões RBAC para o submódulo Análise de FACA
    const permCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolePermCol = app.findCollectionByNameOrId('pcp_role_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')

    const facaPerms = [
      {
        key: 'pcp.faca.view',
        name: 'Visualizar Análise de FACA',
        category: 'Análise de Carteira',
        description: 'Permite visualizar o subtópico Análise de FACA, carteira, estoques e MP.',
        is_critical: false,
      },
      {
        key: 'pcp.faca.generate',
        name: 'Gerar Análise de FACA (IA)',
        category: 'Análise de Carteira',
        description: 'Permite acionar a geração de relatórios e diagnósticos de IA para FACA.',
        is_critical: false,
      },
      {
        key: 'pcp.faca.edit',
        name: 'Editar Relatório de FACA',
        category: 'Análise de Carteira',
        description:
          'Permite editar o texto e seções do relatório executivo de FACA antes do envio.',
        is_critical: false,
      },
      {
        key: 'pcp.faca.approve',
        name: 'Aprovar Relatório de FACA',
        category: 'Análise de Carteira',
        description: 'Permite aprovar formalmente o relatório de FACA para arquivamento ou envio.',
        is_critical: true,
      },
      {
        key: 'pcp.faca.send',
        name: 'Enviar Relatório de FACA por E-mail',
        category: 'Análise de Carteira',
        description: 'Permite disparar comunicados por e-mail com anexo PDF da Análise de FACA.',
        is_critical: true,
      },
      {
        key: 'pcp.faca.manage_params',
        name: 'Parametrizar Regras e Materiais FACA',
        category: 'Análise de Carteira',
        description: 'Permite cadastrar códigos FACA, vínculos com MP e lotes mínimos por centro.',
        is_critical: true,
      },
    ]

    const permRecords = {}
    facaPerms.forEach((p) => {
      try {
        const existing = app.findFirstRecordByFilter('pcp_permissions', `key = '${p.key}'`)
        if (existing) {
          permRecords[p.key] = existing
        }
      } catch (_) {
        const rec = new Record(permCol, {
          key: p.key,
          name: p.name,
          category: p.category,
          description: p.description,
          is_critical: p.is_critical,
        })
        app.save(rec)
        permRecords[p.key] = rec
      }
    })

    // Vincular permissões aos papéis do PCP (PCP_ADMIN, PCP_PROGRAMMER)
    try {
      const pcpAdminRole = app.findFirstRecordByFilter('pcp_roles', "code = 'PCP_ADMIN'")
      const pcpProgRole = app.findFirstRecordByFilter('pcp_roles', "code = 'PCP_PROGRAMMER'")

      Object.keys(permRecords).forEach((k) => {
        const pRec = permRecords[k]
        if (!pRec) return

        ;[pcpAdminRole, pcpProgRole].forEach((r) => {
          if (!r) return
          try {
            app.findFirstRecordByFilter(
              'pcp_role_permissions',
              `role_id = '${r.id}' && permission_id = '${pRec.id}'`,
            )
          } catch (_) {
            const rp = new Record(rolePermCol, {
              role_id: r.id,
              permission_id: pRec.id,
            })
            app.save(rp)
          }
        })
      })
    } catch (err) {
      console.log('[faca_migration] Aviso ao vincular role_permissions:', err)
    }

    // 2. Collection: faca_parametrizacao_materiais
    if (!app.hasTable('faca_parametrizacao_materiais')) {
      const col = new Collection({
        name: 'faca_parametrizacao_materiais',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo_material', type: 'text', required: true },
          { name: 'descricao_material', type: 'text' },
          { name: 'grupo_faca', type: 'text' },
          { name: 'familia', type: 'text' },
          { name: 'bitola', type: 'text' },
          { name: 'tipo_aco', type: 'text' },
          { name: 'dimensoes', type: 'text' },
          { name: 'comprimento_mm', type: 'number' },
          { name: 'centro', type: 'text' },
          { name: 'empresa', type: 'text' },
          { name: 'linha_preferencial', type: 'text' },
          { name: 'carteira_minima_lam_t', type: 'number' },
          { name: 'is_mto', type: 'bool' },
          { name: 'classificacao_sap_origem', type: 'text' },
          { name: 'homologado_por', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'observacoes_tecnicas', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_faca_mat_cod ON faca_parametrizacao_materiais (codigo_material)',
          'CREATE INDEX idx_faca_mat_centro ON faca_parametrizacao_materiais (centro)',
          'CREATE INDEX idx_faca_mat_ativo ON faca_parametrizacao_materiais (ativo)',
        ],
      })
      app.save(col)
    }

    // 3. Collection: faca_vinculo_pa_mp
    if (!app.hasTable('faca_vinculo_pa_mp')) {
      const col = new Collection({
        name: 'faca_vinculo_pa_mp',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo_pa', type: 'text', required: true },
          { name: 'descricao_pa', type: 'text' },
          { name: 'codigo_mp', type: 'text', required: true },
          { name: 'descricao_mp', type: 'text' },
          { name: 'tipo_aco_mp', type: 'text' },
          { name: 'bitola_mp', type: 'text' },
          { name: 'dimensoes_mp', type: 'text' },
          { name: 'rendimento_transformacao', type: 'number' }, // Ex: 0.92 para 92%
          { name: 'perdas_previstas_pct', type: 'number' }, // Ex: 8.0 para 8%
          { name: 'origem_cadastro', type: 'text' }, // "Ficha Mestra", "Planos de Corte", "Homologação Técnica"
          { name: 'prioridade_consumo', type: 'number' }, // 1 = primária, 2 = alternativa
          { name: 'centro', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'notas_tecnicas', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_faca_vinc_pa ON faca_vinculo_pa_mp (codigo_pa)',
          'CREATE INDEX idx_faca_vinc_mp ON faca_vinculo_pa_mp (codigo_mp)',
        ],
      })
      app.save(col)
    }

    // 4. Collection: faca_analises_historico
    if (!app.hasTable('faca_analises_historico')) {
      const col = new Collection({
        name: 'faca_analises_historico',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo_analise', type: 'text', required: true },
          { name: 'titulo', type: 'text' },
          { name: 'data_referencia', type: 'text' },
          { name: 'empresa', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'versao', type: 'number' },
          {
            name: 'status',
            type: 'select',
            values: ['RASCUNHO', 'REVISADO', 'APROVADO', 'ENVIADO', 'FALHA_ENVIO'],
            maxSelect: 1,
          },
          { name: 'responsavel_nome', type: 'text' },
          { name: 'responsavel_email', type: 'text' },
          { name: 'resumo_executivo', type: 'text' },
          { name: 'relatorio_estruturado', type: 'json' },
          { name: 'snapshot_dados', type: 'json' },
          { name: 'recomendacoes_ia', type: 'json' },
          { name: 'acoes_responsaveis', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_faca_hist_cod ON faca_analises_historico (codigo_analise)',
          'CREATE INDEX idx_faca_hist_data ON faca_analises_historico (data_referencia)',
        ],
      })
      app.save(col)
    }

    // 5. Collection: faca_envios_email
    if (!app.hasTable('faca_envios_email')) {
      const col = new Collection({
        name: 'faca_envios_email',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo_envio', type: 'text', required: true },
          { name: 'analise_id', type: 'text' },
          { name: 'codigo_analise', type: 'text' },
          { name: 'remetente_nome', type: 'text' },
          { name: 'remetente_email', type: 'text' },
          { name: 'destinatarios_para', type: 'json' }, // array de strings/emails
          { name: 'destinatarios_cc', type: 'json' },
          { name: 'areas_envolvidas', type: 'json' }, // ["PCP", "Comercial", ...]
          { name: 'assunto', type: 'text' },
          { name: 'corpo_html', type: 'text' },
          { name: 'anexo_pdf_gerado', type: 'bool' },
          { name: 'data_hora_envio', type: 'text' },
          { name: 'status_envio', type: 'text' }, // "SUCESSO" ou "FALHA - SMTP NÃO CONFIGURADO"
          { name: 'mensagem_retorno', type: 'text' },
          { name: 'detalhes_tecnicos', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_faca_envio_cod ON faca_envios_email (codigo_envio)',
          'CREATE INDEX idx_faca_envio_an ON faca_envios_email (codigo_analise)',
        ],
      })
      app.save(col)
    }

    // 6. Semente inicial homologada de parâmetros de materiais FACA e vínculos PA x MP
    try {
      const facaMatCol = app.findCollectionByNameOrId('faca_parametrizacao_materiais')
      const facaVincCol = app.findCollectionByNameOrId('faca_vinculo_pa_mp')

      const seedMateriais = [
        {
          codigo_material: 'FACA-450-1045',
          descricao_material: 'BARRA CHATA FACA 450x12 MM SAE 1045',
          grupo_faca: 'FACAS AGRÍCOLAS',
          familia: 'BARRAS CHATAS',
          bitola: '450x12 mm',
          tipo_aco: 'SAE 1045',
          dimensoes: '450 mm x 12 mm x 6000 mm',
          comprimento_mm: 6000,
          centro: '1100',
          empresa: 'CIAFAL',
          linha_preferencial: 'L1',
          carteira_minima_lam_t: 30.0,
          is_mto: false,
          classificacao_sap_origem: 'MATKL_FACA_01',
          homologado_por: 'Engenharia de Processos / PCP',
          ativo: true,
          observacoes_tecnicas:
            'Material padrão para corte e colheita canavieira; lote mínimo padrão 30 t.',
        },
        {
          codigo_material: 'FACA-380-5160',
          descricao_material: 'FACA INDUSTRIAL CORTE 380x16 MM SAE 5160',
          grupo_faca: 'FACAS INDUSTRIAIS',
          familia: 'BARRAS CHATAS',
          bitola: '380x16 mm',
          tipo_aco: 'SAE 5160',
          dimensoes: '380 mm x 16 mm x 5800 mm',
          comprimento_mm: 5800,
          centro: '1100',
          empresa: 'CIAFAL',
          linha_preferencial: 'L1',
          carteira_minima_lam_t: 25.0,
          is_mto: true,
          classificacao_sap_origem: 'MATKL_FACA_02',
          homologado_por: 'Engenharia de Processos / PCP',
          ativo: true,
          observacoes_tecnicas: 'Aço mola alto cromo; campanha técnica mínima 25 t no Centro 1100.',
        },
        {
          codigo_material: 'FACA-500-1070',
          descricao_material: 'BARRA PERFIL FACA 500x14 MM SAE 1070',
          grupo_faca: 'FACAS FLORESTAIS',
          familia: 'PERFIS ESPECIAIS',
          bitola: '500x14 mm',
          tipo_aco: 'SAE 1070',
          dimensoes: '500 mm x 14 mm x 6200 mm',
          comprimento_mm: 6200,
          centro: '1100',
          empresa: 'CIAFAL',
          linha_preferencial: 'L2',
          carteira_minima_lam_t: 30.0,
          is_mto: false,
          classificacao_sap_origem: 'MATKL_FACA_01',
          homologado_por: 'Engenharia de Processos / PCP',
          ativo: true,
          observacoes_tecnicas: 'Alta dureza superficial e tenacidade de núcleo; lote de 30 t.',
        },
        {
          codigo_material: 'FACA-600-1045-ESP',
          descricao_material: 'LAMINA FACA PICADOR 600x20 MM SAE 1045',
          grupo_faca: 'FACAS PICADOR',
          familia: 'BARRAS CHATAS',
          bitola: '600x20 mm',
          tipo_aco: 'SAE 1045',
          dimensoes: '600 mm x 20 mm x 5000 mm',
          comprimento_mm: 5000,
          centro: '1000',
          empresa: 'CIAFAL',
          linha_preferencial: 'L1',
          carteira_minima_lam_t: 35.0,
          is_mto: true,
          classificacao_sap_origem: 'MATKL_FACA_03',
          homologado_por: 'Engenharia de Processos / PCP',
          ativo: true,
          observacoes_tecnicas: 'Perfil robusto; laminação sob encomenda (MTO) com mínimo de 35 t.',
        },
      ]

      seedMateriais.forEach((m) => {
        try {
          app.findFirstRecordByFilter(
            'faca_parametrizacao_materiais',
            `codigo_material = '${m.codigo_material}'`,
          )
        } catch (_) {
          const rec = new Record(facaMatCol, m)
          app.save(rec)
        }
      })

      const seedVinculos = [
        {
          codigo_pa: 'FACA-450-1045',
          descricao_pa: 'BARRA CHATA FACA 450x12 MM SAE 1045',
          codigo_mp: 'MP-PAL-150-1045',
          descricao_mp: 'PALANQUILHA 150x150 MM SAE 1045',
          tipo_aco_mp: 'SAE 1045',
          bitola_mp: '150x150 mm',
          dimensoes_mp: '150 mm x 150 mm x 12000 mm',
          rendimento_transformacao: 0.92, // 92%
          perdas_previstas_pct: 8.0,
          origem_cadastro: 'Ficha Mestra do PCP',
          prioridade_consumo: 1,
          centro: '1100',
          ativo: true,
          notas_tecnicas: 'Rendimento nominal Ficha Mestra 92%. Perda metálica padrão 8%.',
        },
        {
          codigo_pa: 'FACA-380-5160',
          descricao_pa: 'FACA INDUSTRIAL CORTE 380x16 MM SAE 5160',
          codigo_mp: 'MP-BLO-160-5160',
          descricao_mp: 'BLOCO LAMINADO 160x160 MM SAE 5160',
          tipo_aco_mp: 'SAE 5160',
          bitola_mp: '160x160 mm',
          dimensoes_mp: '160 mm x 160 mm x 8000 mm',
          rendimento_transformacao: 0.9, // 90%
          perdas_previstas_pct: 10.0,
          origem_cadastro: 'Ficha Mestra do PCP',
          prioridade_consumo: 1,
          centro: '1100',
          ativo: true,
          notas_tecnicas: 'Aço alto cromo: perda de ponta e aquecimento calculada em 10%.',
        },
        {
          codigo_pa: 'FACA-500-1070',
          descricao_pa: 'BARRA PERFIL FACA 500x14 MM SAE 1070',
          codigo_mp: 'MP-PAL-150-1070',
          descricao_mp: 'PALANQUILHA 150x150 MM SAE 1070',
          tipo_aco_mp: 'SAE 1070',
          bitola_mp: '150x150 mm',
          dimensoes_mp: '150 mm x 150 mm x 12000 mm',
          rendimento_transformacao: 0.91, // 91%
          perdas_previstas_pct: 9.0,
          origem_cadastro: 'Ficha Mestra do PCP',
          prioridade_consumo: 1,
          centro: '1100',
          ativo: true,
          notas_tecnicas: 'Compatibilidade homologada com palanquilha 150x150 SAE 1070.',
        },
        {
          codigo_pa: 'FACA-600-1045-ESP',
          descricao_pa: 'LAMINA FACA PICADOR 600x20 MM SAE 1045',
          codigo_mp: 'MP-PAL-180-1045',
          descricao_mp: 'PALANQUILHA 180x180 MM SAE 1045',
          tipo_aco_mp: 'SAE 1045',
          bitola_mp: '180x180 mm',
          dimensoes_mp: '180 mm x 180 mm x 12000 mm',
          rendimento_transformacao: 0.89, // 89%
          perdas_previstas_pct: 11.0,
          origem_cadastro: 'Ficha Mestra do PCP',
          prioridade_consumo: 1,
          centro: '1000',
          ativo: true,
          notas_tecnicas:
            'Bitola mais pesada; rendimento de 89% com 11% de perdas de tesoura e desbaste.',
        },
      ]

      seedVinculos.forEach((v) => {
        try {
          app.findFirstRecordByFilter(
            'faca_vinculo_pa_mp',
            `codigo_pa = '${v.codigo_pa}' && codigo_mp = '${v.codigo_mp}'`,
          )
        } catch (_) {
          const rec = new Record(facaVincCol, v)
          app.save(rec)
        }
      })
    } catch (seedErr) {
      console.log('[faca_migration] Aviso no seed:', seedErr)
    }
  },
  (app) => {
    // Rollback não destrutivo
  },
)
