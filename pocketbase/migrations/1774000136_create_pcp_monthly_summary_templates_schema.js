migrate(
  (app) => {
    // 1. Criar collection pcp_monthly_summary_templates
    let templateCol = null
    try {
      templateCol = app.findCollectionByNameOrId('pcp_monthly_summary_templates')
    } catch (_) {}

    if (!templateCol) {
      templateCol = new Collection({
        name: 'pcp_monthly_summary_templates',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        fields: [
          { name: 'template_code', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text', required: false },
          { name: 'tipo', type: 'text', required: false }, // Fixo "Resumo Mensal PCP"
          { name: 'empresa_code', type: 'text', required: false },
          { name: 'linha_code', type: 'text', required: false },
          { name: 'centro_code', type: 'text', required: false },
          {
            name: 'aplicacao',
            type: 'select',
            required: true,
            values: ['GERAL', 'EMPRESA', 'LINHA', 'CENTRO'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['ATIVO', 'INATIVO', 'Ativo', 'Inativo'],
            maxSelect: 1,
          },
          { name: 'is_default', type: 'bool', required: false },
          { name: 'vigencia_inicio', type: 'text', required: false },
          { name: 'vigencia_fim', type: 'text', required: false },
          { name: 'versao', type: 'number', required: false },
          { name: 'versao_tag', type: 'text', required: false },
          { name: 'responsavel_criacao', type: 'text', required: false },
          { name: 'ultima_atualizacao_por', type: 'text', required: false },
          { name: 'sections_config', type: 'json', required: false },
          { name: 'revisions_history', type: 'json', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pmst_code ON pcp_monthly_summary_templates (template_code)',
          'CREATE INDEX idx_pmst_lookup ON pcp_monthly_summary_templates (status, is_default, aplicacao)',
          'CREATE INDEX idx_pmst_context ON pcp_monthly_summary_templates (empresa_code, linha_code, centro_code)',
        ],
      })
      app.save(templateCol)
    }

    // 2. Adicionar campos de template na pcp_monthly_summaries se não existirem
    try {
      const summaryCol = app.findCollectionByNameOrId('pcp_monthly_summaries')
      let changed = false
      if (!summaryCol.fields.getByName('template_id')) {
        summaryCol.fields.add(new TextField({ name: 'template_id' }))
        changed = true
      }
      if (!summaryCol.fields.getByName('template_code')) {
        summaryCol.fields.add(new TextField({ name: 'template_code' }))
        changed = true
      }
      if (!summaryCol.fields.getByName('template_version')) {
        summaryCol.fields.add(new TextField({ name: 'template_version' }))
        changed = true
      }
      if (!summaryCol.fields.getByName('template_snapshot')) {
        summaryCol.fields.add(new JSONField({ name: 'template_snapshot' }))
        changed = true
      }
      if (changed) {
        app.save(summaryCol)
      }
    } catch (e) {
      console.warn('Erro ao atualizar campos de template em pcp_monthly_summaries:', e)
    }

    // 3. Cadastrar permissões no pcp_permissions
    try {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      const permsToSeed = [
        {
          key: 'pcp.templates.view',
          name: 'Visualizar Templates de Resumo Mensal',
          category: 'Entregas PCP',
          description: 'Consultar templates e parametrizações do Resumo Mensal de Entregas',
          is_critical: false,
        },
        {
          key: 'pcp.templates.manage',
          name: 'Gerenciar Templates de Resumo Mensal',
          category: 'Entregas PCP',
          description: 'Criar, editar, versionar e definir templates padrão para o Resumo Mensal',
          is_critical: false,
        },
      ]

      for (const p of permsToSeed) {
        let exists = false
        try {
          const found = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
          if (found) exists = true
        } catch (_) {}

        if (!exists) {
          const rec = new Record(permsCol)
          rec.set('key', p.key)
          rec.set('name', p.name)
          rec.set('category', p.category)
          rec.set('description', p.description)
          rec.set('is_critical', p.is_critical)
          app.save(rec)
        }
      }

      // 4. Conceder permissões para roles (PCP_PROGRAMMER, PCP_PLANNER, LINE_MANAGER)
      const rolePermissionsCol = app.findCollectionByNameOrId('pcp_role_permissions')
      const roleGrants = [
        {
          roleCode: 'PCP_PROGRAMMER',
          keys: ['pcp.templates.view', 'pcp.templates.manage'],
        },
        {
          roleCode: 'PCP_PLANNER',
          keys: ['pcp.templates.view'],
        },
        {
          roleCode: 'LINE_MANAGER',
          keys: ['pcp.templates.view'],
        },
        {
          roleCode: 'AUDITOR',
          keys: ['pcp.templates.view'],
        },
      ]

      for (const g of roleGrants) {
        let roleRec = null
        try {
          roleRec = app.findFirstRecordByData('pcp_roles', 'code', g.roleCode)
        } catch (_) {}
        if (!roleRec) continue

        for (const k of g.keys) {
          let permRec = null
          try {
            permRec = app.findFirstRecordByData('pcp_permissions', 'key', k)
          } catch (_) {}
          if (!permRec) continue

          const filter = `role_id = '${roleRec.id}' && permission_id = '${permRec.id}'`
          const existing = app.findRecordsByFilter('pcp_role_permissions', filter, '', 1, 0)
          if (!existing || existing.length === 0) {
            const rRec = new Record(rolePermissionsCol)
            rRec.set('role_id', roleRec.id)
            rRec.set('permission_id', permRec.id)
            app.save(rRec)
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao vincular permissões de templates:', e)
    }

    // 5. Seed do Template Padrão Inicial (as 18 seções atuais homologadas)
    try {
      const templatesCol = app.findCollectionByNameOrId('pcp_monthly_summary_templates')
      const existingTpl = app.findRecordsByFilter(
        'pcp_monthly_summary_templates',
        'template_code != ""',
        '-created',
        1,
        0,
      )

      if (!existingTpl || existingTpl.length === 0) {
        const defaultSections = [
          {
            order: 1,
            number: '1',
            key: 'identificacao',
            title: 'Identificação Operacional',
            description: 'Dados cadastrais da linha, centro, empresa, período e responsável PCP.',
            ai_instruction:
              'Preencha com os dados cadastrais operacionais validados no cadastro do PCP e SAP.',
            data_source: 'Informações editadas pelo Programador PCP',
            required_info: 'Linha, Centro, Empresa, Mês/Ano e Responsável',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: false,
            is_mandatory: true,
          },
          {
            order: 2,
            number: '2',
            key: 'sumarioExecutivo',
            title: 'Resumo Executivo',
            description: 'Destaques executivos consolidados do mês (5 a 10 bullets objetivos).',
            ai_instruction:
              'Sintetize as entregas principais em 5 a 10 bullets executivos objetivos com base nos dados reais do período. Não invente números.',
            data_source: 'Histórico de Programações',
            required_info: 'Volume expedido, assertividade e principais entregas',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 3,
            number: '3',
            key: 'analiseCarteira',
            title: 'Análise da Carteira',
            description: 'Volume total em toneladas, distribuição por subcarteiras e curva ABC.',
            ai_instruction:
              'Analise a carteira compromissada no SAP SD por linha e centro. Quando não houver dados, informe explicitamente que não existem dados suficientes.',
            data_source: 'Análise de Carteira',
            required_info: 'Total de toneladas e curva ABC',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 4,
            number: '4',
            key: 'estoqueProdutoAcabado',
            title: 'Atendimento da Carteira & Estoque PA',
            description: 'Estoque físico, carteira comprometida, saldo livre e cobertura em dias.',
            ai_instruction:
              'Cruze o estoque de produto acabado no WMS com a carteira de pedidos. Não invente dados de expedição.',
            data_source: 'WMS',
            required_info: 'Estoque físico e saldo livre',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 5,
            number: '5',
            key: 'materiaPrima',
            title: 'Estoque de Matéria-Prima',
            description: 'Estoque atual, saldo projetado e necessidade calculada pelo MRP.',
            ai_instruction:
              'Avalie os níveis de estoque de MP e o risco de ruptura. Quando faltar insumo, sinalize explicitamente o item e a corrida.',
            data_source: 'Gestão de MP',
            required_info: 'Estoque atual e risco de ruptura',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 6,
            number: '6',
            key: 'entradasMP',
            title: 'Entradas previstas de MP',
            description: 'Recebimento de bobinas e tarugos previstos no SAP MM para o período.',
            ai_instruction: 'Verifique pedidos de compras e entregas programadas de fornecedores.',
            data_source: 'SAP ECC via RFC',
            required_info: 'Data de recebimento e tonelagem prevista',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: false,
          },
          {
            order: 7,
            number: '7',
            key: 'restricoesProducao',
            title: 'Restrições de produção',
            description: 'Gargalos industriais, limites de capacidade de enfornamento e laminação.',
            ai_instruction: 'Identifique gargalos de máquina e limitações dimensionais ou de peso.',
            data_source: 'Ficha Mestra',
            required_info: 'Gargalos e restrições ativas',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 8,
            number: '8',
            key: 'paradasProgramadas',
            title: 'Paradas programadas',
            description:
              'Paradas planejadas para manutenção mecânica, elétrica e trocas de cilindros.',
            ai_instruction:
              'Liste as paradas cadastradas no módulo de Programação de Paradas. Não invente manutenções não registradas.',
            data_source: 'Programação de Parada',
            required_info: 'Horas de parada programada',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 9,
            number: '9',
            key: 'problemasIndustriais',
            title: 'Problemas industriais',
            description: 'Quebras não programadas, horas paradas e desvios de setup ocorridos.',
            ai_instruction:
              'Consolide apontamentos de quebras e manutenções corretivas apontadas no MES.',
            data_source: 'Controle de Produção',
            required_info: 'Horas de quebra e tempo de setup médio',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: false,
          },
          {
            order: 10,
            number: '10',
            key: 'produtividade',
            title: 'Produtividade',
            description:
              'Produtividade nominal vs realizada (t/h) e aderência ao padrão da Ficha Mestra.',
            ai_instruction: 'Compare o t/h realizado com o nominal homologado na Ficha Mestra.',
            data_source: 'Ficha Mestra',
            required_info: 'Produtividade realizada (t/h)',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 11,
            number: '11',
            key: 'historicoCampanhas',
            title: 'Histórico das campanhas',
            description: 'Sequenciamento de famílias e bitolas rodadas no período fabril.',
            ai_instruction: 'Resuma o histórico de campanhas e sequência ótima praticada.',
            data_source: 'Montagem da Programação',
            required_info: 'Famílias produzidas e bitolas foco',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: false,
          },
          {
            order: 12,
            number: '12',
            key: 'revisoesProgramacao',
            title: 'Revisões da programação',
            description: 'Quantidade de revisões e histórico de versões da grade semanal/mensal.',
            ai_instruction:
              'Liste a quantidade de revisões de versão ocorridas no período e seus motivos.',
            data_source: 'Revisões',
            required_info: 'Versões e motivos de revisão',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: false,
          },
          {
            order: 13,
            number: '13',
            key: 'alteracoesRealizadas',
            title: 'Alterações realizadas',
            description: 'Modificações de sequenciamento ou remanejamento de pedidos pelo PCP.',
            ai_instruction:
              'Relate as alterações de grade executadas justificadas por ordem comercial ou manutenção.',
            data_source: 'Informações editadas pelo Programador PCP',
            required_info: 'Resumo das alterações manuais',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: false,
          },
          {
            order: 14,
            number: '14',
            key: 'produtosNaoAtendidos',
            title: 'Produtos não atendidos',
            description: 'Pedidos com ruptura de prazo ou quantidade não entregue no mês.',
            ai_instruction:
              'Identifique materiais não atendidos, principais restrições e impacto esperado. Não invente informações.',
            data_source: 'Análise de Carteira',
            required_info: 'Itens em atraso e tonelagem impactada',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 15,
            number: '15',
            key: 'riscosProximoPeriodo',
            title: 'Riscos do próximo período',
            description:
              'Matriz de riscos com evidência, severidade e impacto para o ciclo seguinte.',
            ai_instruction:
              'Sintetize os riscos identificados em termos de suprimentos, capacidade e demanda.',
            data_source: 'Indicadores',
            required_info: 'Lista de riscos com impacto e severidade',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 16,
            number: '16',
            key: 'acoesRecomendadas',
            title: 'Ações recomendadas',
            description:
              'Diretrizes propostas pelo PCP para mitigação de desvios e cumprimento das entregas.',
            ai_instruction:
              'Sugira ações práticas direcionadas às áreas comercial, compras e produção.',
            data_source: 'Informações editadas pelo Programador PCP',
            required_info: 'Ações recomendadas e áreas envolvidas',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
          {
            order: 17,
            number: '17',
            key: 'pendencias',
            title: 'Pendências',
            description:
              'Tabela de pendências operacionais por área com responsável e prazo pactuado.',
            ai_instruction:
              'Mantenha a tabela de pendências com área, responsável e prazo estritamente conforme apurado.',
            data_source: 'Entregas PCP',
            required_info: 'Tabela de pendências por área',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: false,
            is_mandatory: true,
          },
          {
            order: 18,
            number: '18',
            key: 'conclusaoExecutiva',
            title: 'Conclusão Executiva',
            description:
              'Parecer final consolidado sobre assertividade, aderência de entrega e governança.',
            ai_instruction:
              'Elabore parecer final sobre assertividade geral e coerência do planejamento. Se não houver dados, informe explicitamente que não existem dados suficientes para esta análise.',
            data_source: 'Documentos de referência',
            required_info: 'Parecer geral e índice de assertividade',
            is_visible: true,
            allow_manual_edit: true,
            allow_ai_completion: true,
            is_mandatory: true,
          },
        ]

        const tpl = new Record(templatesCol)
        tpl.set('template_code', 'TPL-RES-001')
        tpl.set('nome', 'Template Padrão Homologado PCP CIAFAL')
        tpl.set(
          'descricao',
          'Template oficial com 18 seções mínimas para o Resumo Mensal de Entregas PCP',
        )
        tpl.set('tipo', 'Resumo Mensal PCP')
        tpl.set('empresa_code', 'CIAFAL')
        tpl.set('linha_code', 'ALL')
        tpl.set('centro_code', 'ALL')
        tpl.set('aplicacao', 'GERAL')
        tpl.set('status', 'ATIVO')
        tpl.set('is_default', true)
        tpl.set('vigencia_inicio', '2025-01-01')
        tpl.set('vigencia_fim', '')
        tpl.set('versao', 1)
        tpl.set('versao_tag', 'V1')
        tpl.set('responsavel_criacao', 'Engenharia PCP CIAFAL')
        tpl.set('ultima_atualizacao_por', 'Engenharia PCP CIAFAL')
        tpl.set('sections_config', defaultSections)
        tpl.set('revisions_history', [
          {
            version: 'V1',
            user: 'Engenharia PCP CIAFAL',
            timestamp: new Date().toISOString(),
            reason: 'Criação do template padrão homologado com 18 seções mínimas',
          },
        ])
        app.save(tpl)
      }
    } catch (e) {
      console.warn('Erro ao criar template padrão inicial:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('pcp_monthly_summary_templates')
      app.delete(col)
    } catch (_) {}
  },
)
