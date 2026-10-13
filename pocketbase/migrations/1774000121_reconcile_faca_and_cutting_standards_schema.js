/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // -------------------------------------------------------------
    // 1. mp_cutting_weight_standards (se ainda não existir no live)
    // -------------------------------------------------------------
    if (!app.hasTable('mp_cutting_weight_standards')) {
      const standardsCol = new Collection({
        name: 'mp_cutting_weight_standards',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'code', type: 'text', required: true },
          { name: 'description', type: 'text', required: true },
          {
            name: 'cutting_type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['BLOCOS', 'MULTIPLOS'],
          },
          { name: 'company_code', type: 'text', required: true },
          { name: 'center_codes', type: 'json', required: true },
          { name: 'material_codes', type: 'json', required: true },
          { name: 'steel_family', type: 'text', required: false },
          { name: 'target_weight_kg', type: 'number', required: true, min: 0.001 },
          { name: 'min_weight_kg', type: 'number', required: true, min: 0.001 },
          { name: 'max_weight_kg', type: 'number', required: true, min: 0.001 },
          { name: 'tolerance_lower_val', type: 'number', required: true, min: 0 },
          {
            name: 'tolerance_lower_type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['KG', 'PERCENT'],
          },
          { name: 'tolerance_upper_val', type: 'number', required: true, min: 0 },
          {
            name: 'tolerance_upper_type',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['KG', 'PERCENT'],
          },
          {
            name: 'priority',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['ALTA', 'MEDIA', 'BAIXA'],
          },
          { name: 'start_date', type: 'date', required: true },
          { name: 'end_date', type: 'date', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['ATIVO', 'INATIVO', 'PENDENTE_CORRECAO'],
          },
          { name: 'technical_notes', type: 'text', required: false },
          { name: 'created_by_user_name', type: 'text', required: false },
          { name: 'updated_by_user_name', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_cws_code ON mp_cutting_weight_standards (code)',
          'CREATE INDEX idx_mp_cws_status ON mp_cutting_weight_standards (status)',
          'CREATE INDEX idx_mp_cws_company ON mp_cutting_weight_standards (company_code)',
          'CREATE INDEX idx_mp_cws_type ON mp_cutting_weight_standards (cutting_type)',
        ],
      })
      app.save(standardsCol)
    }

    // -------------------------------------------------------------
    // 2. mp_cutting_simulations (se ainda não existir no live)
    // -------------------------------------------------------------
    if (!app.hasTable('mp_cutting_simulations')) {
      const simCol = new Collection({
        name: 'mp_cutting_simulations',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'simulation_code', type: 'text', required: true },
          { name: 'company_code', type: 'text', required: true },
          { name: 'center_code', type: 'text', required: true },
          { name: 'material_code', type: 'text', required: true },
          { name: 'cutting_type', type: 'text', required: true },
          { name: 'optimization_criterion', type: 'text', required: true },
          { name: 'required_quantity', type: 'number', required: false },
          { name: 'required_weight_tons', type: 'number', required: false },
          { name: 'selected_standard_codes', type: 'json', required: false },
          { name: 'filter_parameters_snapshot', type: 'json', required: false },
          { name: 'scenarios_json', type: 'json', required: true },
          { name: 'best_scenario_id', type: 'text', required: false },
          { name: 'selected_scenario_id', type: 'text', required: false },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['SIMULADO', 'SELECIONADO', 'APROVADO_PCP', 'CANCELADO'],
          },
          { name: 'approved_plan_code', type: 'text', required: false },
          { name: 'created_by_user_name', type: 'text', required: false },
          { name: 'technical_justification', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_mp_cst_sim_code ON mp_cutting_simulations (simulation_code)',
          'CREATE INDEX idx_mp_cst_center_mat ON mp_cutting_simulations (center_code, material_code)',
          'CREATE INDEX idx_mp_cst_status ON mp_cutting_simulations (status)',
        ],
      })
      app.save(simCol)
    }

    // -------------------------------------------------------------
    // 3. faca_parametrizacao_materiais (Classificação homologada SAP)
    // -------------------------------------------------------------
    if (!app.hasTable('faca_parametrizacao_materiais')) {
      const colFacaParam = new Collection({
        name: 'faca_parametrizacao_materiais',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'codigo_material', type: 'text', required: true },
          { name: 'codigo_material_sap', type: 'text', required: false },
          { name: 'descricao_material', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'grupo_faca', type: 'text', required: true },
          { name: 'familia', type: 'text', required: false },
          { name: 'bitola', type: 'text', required: false },
          { name: 'bitola_mm', type: 'number', required: false, min: 0 },
          { name: 'tipo_aco', type: 'text', required: false },
          { name: 'dimensoes', type: 'text', required: false },
          { name: 'dimensoes_comprimento', type: 'text', required: false },
          { name: 'comprimento_mm', type: 'number', required: false, min: 0 },
          { name: 'centro', type: 'text', required: true },
          { name: 'empresa', type: 'text', required: true },
          { name: 'linha_preferencial', type: 'text', required: false },
          { name: 'carteira_minima_lam_t', type: 'number', required: false, min: 0 },
          { name: 'carteira_minima_t', type: 'number', required: false, min: 0 },
          { name: 'is_mto', type: 'bool', required: false },
          { name: 'flag_mto', type: 'bool', required: false },
          { name: 'classificacao_sap_origem', type: 'text', required: false },
          { name: 'origem_classificacao', type: 'text', required: false },
          { name: 'homologado_por', type: 'text', required: false },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'observacoes_tecnicas', type: 'text', required: false },
          { name: 'observacoes', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_faca_param_cod ON faca_parametrizacao_materiais (codigo_material)',
          'CREATE INDEX idx_faca_param_centro ON faca_parametrizacao_materiais (centro)',
          'CREATE INDEX idx_faca_param_grupo ON faca_parametrizacao_materiais (grupo_faca)',
        ],
      })
      app.save(colFacaParam)
    }

    // -------------------------------------------------------------
    // 4. faca_vinculo_pa_mp (Vínculo N:N PA × MP, rendimento e perdas)
    // -------------------------------------------------------------
    if (!app.hasTable('faca_vinculo_pa_mp')) {
      const colFacaVinculo = new Collection({
        name: 'faca_vinculo_pa_mp',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'codigo_pa', type: 'text', required: true },
          { name: 'codigo_pa_sap', type: 'text', required: false },
          { name: 'descricao_pa', type: 'text', required: false },
          { name: 'codigo_mp', type: 'text', required: true },
          { name: 'codigo_mp_sap', type: 'text', required: false },
          { name: 'descricao_mp', type: 'text', required: false },
          { name: 'tipo_aco_mp', type: 'text', required: false },
          { name: 'bitola_mp', type: 'text', required: false },
          { name: 'dimensoes_mp', type: 'text', required: false },
          { name: 'rendimento_transformacao', type: 'number', required: true, min: 0.01, max: 1.0 },
          { name: 'perdas_previstas_pct', type: 'number', required: false, min: 0, max: 100 },
          { name: 'prioridade_consumo', type: 'number', required: false, min: 1 },
          { name: 'origem_cadastro', type: 'text', required: false },
          { name: 'origem_vinculo', type: 'text', required: false },
          { name: 'centro', type: 'text', required: true },
          { name: 'deposito_mp_padrao', type: 'text', required: false },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'notas_tecnicas', type: 'text', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_faca_vinc_pa ON faca_vinculo_pa_mp (codigo_pa)',
          'CREATE INDEX idx_faca_vinc_mp ON faca_vinculo_pa_mp (codigo_mp)',
          'CREATE INDEX idx_faca_vinc_centro ON faca_vinculo_pa_mp (centro)',
        ],
      })
      app.save(colFacaVinculo)
    }

    // -------------------------------------------------------------
    // 5. faca_analises_historico (Histórico imutável de relatórios gerados)
    // -------------------------------------------------------------
    if (!app.hasTable('faca_analises_historico')) {
      const colFacaHist = new Collection({
        name: 'faca_analises_historico',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'codigo_analise', type: 'text', required: true },
          { name: 'titulo', type: 'text', required: true },
          { name: 'data_referencia', type: 'text', required: true },
          { name: 'empresa', type: 'text', required: true },
          { name: 'centro', type: 'text', required: true },
          { name: 'versao', type: 'number', required: true, min: 1 },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['RASCUNHO', 'REVISADO', 'APROVADO', 'ENVIADO', 'FALHA_ENVIO'],
          },
          { name: 'responsavel_nome', type: 'text', required: true },
          { name: 'responsavel_email', type: 'email', required: false },
          { name: 'resumo_executivo', type: 'text', required: false },
          { name: 'relatorio_estruturado', type: 'json', required: false },
          { name: 'snapshot_dados', type: 'json', required: false },
          { name: 'recomendacoes_ia', type: 'json', required: false },
          { name: 'acoes_responsaveis', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_faca_ah_cod ON faca_analises_historico (codigo_analise)',
          'CREATE INDEX idx_faca_ah_status ON faca_analises_historico (status)',
          'CREATE INDEX idx_faca_ah_data ON faca_analises_historico (data_referencia)',
        ],
      })
      app.save(colFacaHist)
    }

    // -------------------------------------------------------------
    // 6. faca_envios_email (Histórico auditável de disparos de e-mail)
    // -------------------------------------------------------------
    if (!app.hasTable('faca_envios_email')) {
      const colFacaEnvios = new Collection({
        name: 'faca_envios_email',
        type: 'base',
        system: false,
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.role = "PCP_ADMIN"',
        fields: [
          { name: 'codigo_envio', type: 'text', required: true },
          { name: 'analise_id', type: 'text', required: false },
          { name: 'codigo_analise', type: 'text', required: true },
          { name: 'remetente_nome', type: 'text', required: true },
          { name: 'remetente_email', type: 'email', required: true },
          { name: 'destinatarios_para', type: 'json', required: true },
          { name: 'destinatarios_cc', type: 'json', required: false },
          { name: 'areas_envolvidas', type: 'json', required: false },
          { name: 'assunto', type: 'text', required: true },
          { name: 'corpo_html', type: 'text', required: true },
          { name: 'anexo_pdf_gerado', type: 'bool', required: false },
          { name: 'data_hora_envio', type: 'text', required: true },
          { name: 'status_envio', type: 'text', required: true },
          { name: 'mensagem_retorno', type: 'text', required: false },
          { name: 'detalhes_tecnicos', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_faca_ee_cod ON faca_envios_email (codigo_envio)',
          'CREATE INDEX idx_faca_ee_analise ON faca_envios_email (codigo_analise)',
        ],
      })
      app.save(colFacaEnvios)
    }

    // -------------------------------------------------------------
    // 7. Seed inicial idempotente de materiais e vínculos FACA
    //    Garante que a tela já abra com dados homologados SAP
    // -------------------------------------------------------------
    try {
      const paramCol = app.findCollectionByNameOrId('faca_parametrizacao_materiais')
      const countParam = app.countRecords('faca_parametrizacao_materiais')
      if (countParam === 0) {
        const seedMateriais = [
          {
            codigo_material: 'FACA-450-1045',
            codigo_material_sap: 'FACA-450-1045',
            descricao_material: 'BARRA CHATA FACA 450x12 MM SAE 1045',
            descricao: 'BARRA CHATA FACA 450x12 MM SAE 1045',
            grupo_faca: 'FACAS AGRÍCOLAS',
            familia: 'BARRAS CHATAS',
            bitola: '450x12 mm',
            bitola_mm: 12,
            tipo_aco: 'SAE 1045',
            dimensoes: '450x12x6000 mm',
            dimensoes_comprimento: '450x12x6000 mm',
            comprimento_mm: 6000,
            centro: '1100',
            empresa: 'CIAFAL',
            linha_preferencial: 'L1',
            carteira_minima_lam_t: 30.0,
            carteira_minima_t: 30.0,
            is_mto: false,
            flag_mto: false,
            classificacao_sap_origem: 'SAP_ECC_MARA',
            origem_classificacao: 'SAP_ECC_MARA',
            homologado_por: 'Engenharia de Processos CIAFAL',
            ativo: true,
            observacoes_tecnicas:
              'Material padrão para corte sucroalcooleiro. Laminação contínua L1.',
          },
          {
            codigo_material: 'FACA-380-5160',
            codigo_material_sap: 'FACA-380-5160',
            descricao_material: 'FACA INDUSTRIAL CORTE 380x16 MM SAE 5160',
            descricao: 'FACA INDUSTRIAL CORTE 380x16 MM SAE 5160',
            grupo_faca: 'FACAS INDUSTRIAIS',
            familia: 'BARRAS CHATAS ESPECIAIS',
            bitola: '380x16 mm',
            bitola_mm: 16,
            tipo_aco: 'SAE 5160',
            dimensoes: '380x16x5800 mm',
            dimensoes_comprimento: '380x16x5800 mm',
            comprimento_mm: 5800,
            centro: '1100',
            empresa: 'CIAFAL',
            linha_preferencial: 'L1',
            carteira_minima_lam_t: 25.0,
            carteira_minima_t: 25.0,
            is_mto: true,
            flag_mto: true,
            classificacao_sap_origem: 'SAP_ECC_MARA',
            origem_classificacao: 'SAP_ECC_MARA',
            homologado_por: 'PCP / Qualidade CIAFAL',
            ativo: true,
            observacoes_tecnicas:
              'Aço mola de alta tenacidade. Resfriamento controlado e lote mínimo 25t.',
          },
          {
            codigo_material: 'FACA-500-1070',
            codigo_material_sap: 'FACA-500-1070',
            descricao_material: 'BARRA PERFIL FACA 500x14 MM SAE 1070',
            descricao: 'BARRA PERFIL FACA 500x14 MM SAE 1070',
            grupo_faca: 'FACAS AGRÍCOLAS',
            familia: 'BARRAS CHATAS',
            bitola: '500x14 mm',
            bitola_mm: 14,
            tipo_aco: 'SAE 1070',
            dimensoes: '500x14x6200 mm',
            dimensoes_comprimento: '500x14x6200 mm',
            comprimento_mm: 6200,
            centro: '1100',
            empresa: 'CIAFAL',
            linha_preferencial: 'L2',
            carteira_minima_lam_t: 30.0,
            carteira_minima_t: 30.0,
            is_mto: false,
            flag_mto: false,
            classificacao_sap_origem: 'SAP_ECC_MARA',
            origem_classificacao: 'SAP_ECC_MARA',
            homologado_por: 'Engenharia de Produto',
            ativo: true,
            observacoes_tecnicas: 'Perfil para picadores de alta resistência mecânica.',
          },
          {
            codigo_material: 'FACA-600-1045-ESP',
            codigo_material_sap: 'FACA-600-1045-ESP',
            descricao_material: 'LAMINA FACA PICADOR 600x20 MM SAE 1045',
            descricao: 'LAMINA FACA PICADOR 600x20 MM SAE 1045',
            grupo_faca: 'FACAS ESPECIAIS',
            familia: 'BARRAS LARGAS',
            bitola: '600x20 mm',
            bitola_mm: 20,
            tipo_aco: 'SAE 1045',
            dimensoes: '600x20x6500 mm',
            dimensoes_comprimento: '600x20x6500 mm',
            comprimento_mm: 6500,
            centro: '1100',
            empresa: 'CIAFAL',
            linha_preferencial: 'L1',
            carteira_minima_lam_t: 35.0,
            carteira_minima_t: 35.0,
            is_mto: true,
            flag_mto: true,
            classificacao_sap_origem: 'SAP_ECC_MARA',
            origem_classificacao: 'SAP_ECC_MARA',
            homologado_por: 'PCP / Diretoria Industrial',
            ativo: true,
            observacoes_tecnicas:
              'Requer palanquilha 180x180 SAE 1045. Monitorar estoque de MP antes de programar.',
          },
        ]

        for (const m of seedMateriais) {
          const rec = new Record(paramCol, m)
          app.save(rec)
        }
      }
    } catch (e) {
      console.warn('Aviso ao semear materiais FACA:', e)
    }

    try {
      const vincCol = app.findCollectionByNameOrId('faca_vinculo_pa_mp')
      const countVinc = app.countRecords('faca_vinculo_pa_mp')
      if (countVinc === 0) {
        const seedVinculos = [
          {
            codigo_pa: 'FACA-450-1045',
            codigo_pa_sap: 'FACA-450-1045',
            descricao_pa: 'BARRA CHATA FACA 450x12 MM SAE 1045',
            codigo_mp: 'MP-PAL-150-1045',
            codigo_mp_sap: 'MP-PAL-150-1045',
            descricao_mp: 'PALANQUILHA 150x150 MM SAE 1045',
            tipo_aco_mp: 'SAE 1045',
            bitola_mp: '150x150 mm',
            dimensoes_mp: '150x150x12000 mm',
            rendimento_transformacao: 0.92,
            perdas_previstas_pct: 8.0,
            prioridade_consumo: 1,
            origem_cadastro: 'Ficha Mestra PCP',
            origem_vinculo: 'Ficha Mestra PCP',
            centro: '1100',
            deposito_mp_padrao: 'D03-MP',
            ativo: true,
            notas_tecnicas:
              'Rendimento nominal padrão homologado de 92% (8% queima forno + pontas).',
          },
          {
            codigo_pa: 'FACA-380-5160',
            codigo_pa_sap: 'FACA-380-5160',
            descricao_pa: 'FACA INDUSTRIAL CORTE 380x16 MM SAE 5160',
            codigo_mp: 'MP-BLO-160-5160',
            codigo_mp_sap: 'MP-BLO-160-5160',
            descricao_mp: 'BLOCO LAMINADO 160x160 MM SAE 5160',
            tipo_aco_mp: 'SAE 5160',
            bitola_mp: '160x160 mm',
            dimensoes_mp: '160x160x6000 mm',
            rendimento_transformacao: 0.9,
            perdas_previstas_pct: 10.0,
            prioridade_consumo: 1,
            origem_cadastro: 'Engenharia Metalúrgica',
            origem_vinculo: 'Engenharia Metalúrgica',
            centro: '1100',
            deposito_mp_padrao: 'D03-MP',
            ativo: true,
            notas_tecnicas: 'Aço liga especial; perdas previstas de 10% pelo desbaste controlado.',
          },
          {
            codigo_pa: 'FACA-500-1070',
            codigo_pa_sap: 'FACA-500-1070',
            descricao_pa: 'BARRA PERFIL FACA 500x14 MM SAE 1070',
            codigo_mp: 'MP-PAL-160-1070',
            codigo_mp_sap: 'MP-PAL-160-1070',
            descricao_mp: 'PALANQUILHA 160x160 MM SAE 1070',
            tipo_aco_mp: 'SAE 1070',
            bitola_mp: '160x160 mm',
            dimensoes_mp: '160x160x12000 mm',
            rendimento_transformacao: 0.91,
            perdas_previstas_pct: 9.0,
            prioridade_consumo: 1,
            origem_cadastro: 'Ficha Mestra PCP',
            origem_vinculo: 'Ficha Mestra PCP',
            centro: '1100',
            deposito_mp_padrao: 'D03-MP',
            ativo: true,
            notas_tecnicas: 'Rendimento 91% homologado na linha L2.',
          },
          {
            codigo_pa: 'FACA-600-1045-ESP',
            codigo_pa_sap: 'FACA-600-1045-ESP',
            descricao_pa: 'LAMINA FACA PICADOR 600x20 MM SAE 1045',
            codigo_mp: 'MP-PAL-180-1045',
            codigo_mp_sap: 'MP-PAL-180-1045',
            descricao_mp: 'PALANQUILHA 180x180 MM SAE 1045',
            tipo_aco_mp: 'SAE 1045',
            bitola_mp: '180x180 mm',
            dimensoes_mp: '180x180x12000 mm',
            rendimento_transformacao: 0.89,
            perdas_previstas_pct: 11.0,
            prioridade_consumo: 1,
            origem_cadastro: 'Engenharia de Processos',
            origem_vinculo: 'Engenharia de Processos',
            centro: '1100',
            deposito_mp_padrao: 'D03-MP',
            ativo: true,
            notas_tecnicas: 'Dimensão 600x20 mm requer palanquilha grossa 180x180; perdas 11%.',
          },
        ]

        for (const v of seedVinculos) {
          const rec = new Record(vincCol, v)
          app.save(rec)
        }
      }
    } catch (e) {
      console.warn('Aviso ao semear vínculos PA x MP:', e)
    }
  },
  (app) => {
    // Revert idempotente
    try {
      if (app.hasTable('faca_envios_email')) {
        app.delete(app.findCollectionByNameOrId('faca_envios_email'))
      }
      if (app.hasTable('faca_analises_historico')) {
        app.delete(app.findCollectionByNameOrId('faca_analises_historico'))
      }
      if (app.hasTable('faca_vinculo_pa_mp')) {
        app.delete(app.findCollectionByNameOrId('faca_vinculo_pa_mp'))
      }
      if (app.hasTable('faca_parametrizacao_materiais')) {
        app.delete(app.findCollectionByNameOrId('faca_parametrizacao_materiais'))
      }
    } catch (_) {}
  },
)
