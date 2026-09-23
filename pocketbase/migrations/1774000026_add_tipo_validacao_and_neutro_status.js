migrate(
  (app) => {
    // 1. Atualizar a coleção sap_validation_rules_matrix para incluir tipo_validacao e observacao se não existirem
    try {
      const matrixCol = app.findCollectionByNameOrId('sap_validation_rules_matrix')

      if (!matrixCol.fields.getByName('tipo_validacao')) {
        matrixCol.fields.add(
          new SelectField({
            name: 'tipo_validacao',
            required: false,
            values: [
              'COMPARAR_MODELO',
              'COMPARAR_PARAMETRO',
              'COMPARAR_MODELO_PARAMETRO',
              'NEUTRO',
            ],
            maxSelect: 1,
          }),
        )
      }

      if (!matrixCol.fields.getByName('observacao')) {
        matrixCol.fields.add(
          new TextField({
            name: 'observacao',
            required: false,
          }),
        )
      }

      if (!matrixCol.fields.getByName('somente_leitura')) {
        matrixCol.fields.add(
          new BoolField({
            name: 'somente_leitura',
            required: false,
          }),
        )
      }

      if (!matrixCol.fields.getByName('parametro')) {
        matrixCol.fields.add(
          new TextField({
            name: 'parametro',
            required: false,
          }),
        )
      }

      if (!matrixCol.fields.getByName('regra_aplicabilidade')) {
        matrixCol.fields.add(
          new TextField({
            name: 'regra_aplicabilidade',
            required: false,
          }),
        )
      }

      if (!matrixCol.fields.getByName('contexto_ocorrencia')) {
        matrixCol.fields.add(
          new TextField({
            name: 'contexto_ocorrencia',
            required: false,
          }),
        )
      }

      app.save(matrixCol)
    } catch (err) {
      console.log('Erro ao atualizar campos de sap_validation_rules_matrix:', err)
    }

    // 2. Atualizar sap_validation_field_results para suportar o status 'NEUTRO'
    try {
      const fieldResCol = app.findCollectionByNameOrId('sap_validation_field_results')
      const valResField = fieldResCol.fields.getByName('validation_result')
      if (valResField) {
        valResField.values = ['APROVADO', 'DIVERGENTE', 'NAO_SE_APLICA', 'NEUTRO']
        valResField.maxSelect = 1
      }
      if (!fieldResCol.fields.getByName('tipo_validacao')) {
        fieldResCol.fields.add(
          new SelectField({
            name: 'tipo_validacao',
            required: false,
            values: [
              'COMPARAR_MODELO',
              'COMPARAR_PARAMETRO',
              'COMPARAR_MODELO_PARAMETRO',
              'NEUTRO',
            ],
            maxSelect: 1,
          }),
        )
      }
      app.save(fieldResCol)
    } catch (err) {
      console.log('Erro ao atualizar sap_validation_field_results:', err)
    }

    // 3. Atualizar sap_material_validations para incluir neutral_fields_count se não existir
    try {
      const matValCol = app.findCollectionByNameOrId('sap_material_validations')
      if (!matValCol.fields.getByName('neutral_fields_count')) {
        matValCol.fields.add(
          new NumberField({
            name: 'neutral_fields_count',
            required: false,
          }),
        )
        app.save(matValCol)
      }
    } catch (err) {
      console.log('Erro ao atualizar neutral_fields_count em sap_material_validations:', err)
    }

    // 4. Varredura completa na matriz existente e atualização de registros com observações de chegagem
    try {
      // Atualizar registros existentes onde observacao ou metadata contenha variantes da frase "Não aplica chegagem para este campo"
      app
        .db()
        .newQuery(`
        UPDATE sap_validation_rules_matrix
        SET tipo_validacao = 'NEUTRO', somente_leitura = 1
        WHERE (
          LOWER(observacao) LIKE '%não aplica chegagem para este campo%' OR
          LOWER(observacao) LIKE '%nao aplica chegagem para este campo%' OR
          LOWER(observacao) LIKE '%não aplica chamagem para este campo%' OR
          LOWER(observacao) LIKE '%nao aplica chamagem para este campo%' OR
          LOWER(observacao) LIKE '%não aplica chamada para este campo%' OR
          LOWER(observacao) LIKE '%nao aplica chamada para este campo%' OR
          LOWER(metadata) LIKE '%não aplica chegagem para este campo%' OR
          LOWER(metadata) LIKE '%nao aplica chegagem para este campo%' OR
          LOWER(metadata) LIKE '%não aplica chamagem para este campo%' OR
          LOWER(metadata) LIKE '%nao aplica chamagem para este campo%'
        )
      `)
        .execute()
    } catch (err) {
      console.log('Erro ao executar query de varredura na matriz:', err)
    }

    // 5. Garantir que as ocorrências especificadas na matriz funcional existam e estejam devidamente cadastradas e neutralizadas
    // Se a matriz estiver vazia (ou não tiver essas linhas), fazemos o seed dessas regras oficiais completas
    try {
      const matrixCol = app.findCollectionByNameOrId('sap_validation_rules_matrix')

      const seedRules = [
        // Versão de Produção 1 (Versões 2, 3, 4 NÃO herdam)
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'Versões de produção',
          field_name: 'Válido desde',
          sap_table_field: 'MKAL-ADATU',
          context_ocorrencia: 'Versão de Produção 1',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 101,
          active: true,
        },
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'Versões de produção',
          field_name: 'Data última verificação',
          sap_table_field: 'MKAL-PRDAT',
          context_ocorrencia: 'Versão de Produção 1',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 102,
          active: true,
        },
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'Versões de produção',
          field_name: 'Status verificação F',
          sap_table_field: 'MKAL_AMPEL_F',
          context_ocorrencia: 'Versão de Produção 1',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 103,
          active: true,
        },
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'Versões de produção',
          field_name: 'Status verificação S',
          sap_table_field: 'MKAL_AMPEL_S',
          context_ocorrencia: 'Versão de Produção 1',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 104,
          active: true,
        },

        // Lista Técnica (CS01)
        {
          group_name: 'LISTA TÉCNICA (CS01)',
          subgroup_name: 'Componentes aplicáveis',
          field_name: 'Item da lista técnica (Exibir todos os itens)',
          sap_table_field: 'RC29P-POSNR',
          context_ocorrencia: 'Exibir todos os itens que tiver na lista técnica do modelo',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 201,
          active: true,
        },
        {
          group_name: 'LISTA TÉCNICA (CS01)',
          subgroup_name: 'Componentes aplicáveis',
          field_name: 'Válido desde (Itens)',
          sap_table_field: 'RC29P-DATUV',
          context_ocorrencia: 'Ocorrências 010-100',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 202,
          active: true,
        },
        {
          group_name: 'LISTA TÉCNICA (CS01)',
          subgroup_name: 'Componentes aplicáveis',
          field_name: 'Válido até (Itens)',
          sap_table_field: 'RC29P-DATUB',
          context_ocorrencia: 'Ocorrências 010-100',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 203,
          active: true,
        },

        // Roteiro (CA01) - Detalhes do cabeçalho
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Numerador de grupos',
          sap_table_field: 'PLKOD-PLNAL',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 301,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Descrição do roteiro',
          sap_table_field: 'PLKOD-KTEXT',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 302,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Tamanho lote desde',
          sap_table_field: 'PLKOD-LOSVN',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 303,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Tamanho lote até',
          sap_table_field: 'PLKOD-LOSBS',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 304,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Válido desde',
          sap_table_field: 'PLKOD-DATUV',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 305,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Válido até',
          sap_table_field: 'PLKOD-DATUB',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 306,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Data de criação',
          sap_table_field: 'PLKOD-ANDAT',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 307,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Criado por',
          sap_table_field: 'PLKOD-ANNAM',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 308,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Modificado em',
          sap_table_field: 'PLKOD-AEDAT',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 309,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Modificado por',
          sap_table_field: 'PLKOD-AENAM',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 310,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Data de reorganização',
          sap_table_field: 'PLKOD-REODAT',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 311,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Última solicitação roteiro',
          sap_table_field: 'PLKOD-ABDAT',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 312,
          active: true,
        },
        {
          group_name: 'ROTEIRO (CA01)',
          subgroup_name: 'Detalhes do cabeçalho',
          field_name: 'Número solicitação plano',
          sap_table_field: 'PLKOD-ABANZ',
          context_ocorrencia: 'Detalhes do cabeçalho do Roteiro',
          comparison_source: 'MODELO',
          tipo_validacao: 'NEUTRO',
          observacao: 'Não aplica chegagem para este campo',
          somente_leitura: true,
          order_index: 313,
          active: true,
        },

        // Exemplos de campos normais para que a matriz funcione integralmente mesmo antes de upload do Excel
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'Dados básicos 1',
          field_name: 'Setor de atividade',
          sap_table_field: 'MARA-SPART',
          context_ocorrencia: 'Dados básicos',
          comparison_source: 'MODELO',
          tipo_validacao: 'COMPARAR_MODELO',
          observacao: 'Comparação direta com o código modelo',
          somente_leitura: false,
          order_index: 1,
          active: true,
        },
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'MRP 1',
          field_name: 'Grupo de planejamento MRP',
          sap_table_field: 'MARC-DISGR',
          context_ocorrencia: 'MRP Geral',
          comparison_source: 'MODELO',
          tipo_validacao: 'COMPARAR_MODELO',
          observacao: 'Comparação direta com o código modelo',
          somente_leitura: false,
          order_index: 2,
          active: true,
        },
        {
          group_name: 'DADOS MESTRES – MM03',
          subgroup_name: 'Contabilidade 1',
          field_name: 'Classe de avaliação',
          sap_table_field: 'MBEW-BKLAS',
          context_ocorrencia: 'Contabilidade Geral',
          comparison_source: 'MODELO',
          tipo_validacao: 'COMPARAR_MODELO',
          observacao: 'Comparação direta com o código modelo',
          somente_leitura: false,
          order_index: 3,
          active: true,
        },
      ]

      for (let i = 0; i < seedRules.length; i++) {
        const sr = seedRules[i]
        try {
          const existing = app.findRecordsByFilter(
            'sap_validation_rules_matrix',
            `group_name = '${sr.group_name}' && sap_table_field = '${sr.sap_table_field}' && (subgroup_name = '${sr.subgroup_name}' || subgroup_name = '')`,
            '',
            1,
            0,
          )

          if (existing && existing.length > 0) {
            const rec = existing[0]
            if (sr.tipo_validacao === 'NEUTRO') {
              rec.set('tipo_validacao', 'NEUTRO')
              rec.set('somente_leitura', true)
              rec.set('observacao', sr.observacao)
              rec.set('contexto_ocorrencia', sr.context_ocorrencia)
              app.save(rec)
            }
          } else {
            const rec = new Record(matrixCol)
            rec.set('group_name', sr.group_name)
            rec.set('subgroup_name', sr.subgroup_name)
            rec.set('field_name', sr.field_name)
            rec.set('sap_table_field', sr.sap_table_field)
            rec.set('comparison_source', sr.comparison_source)
            rec.set('tipo_validacao', sr.tipo_validacao)
            rec.set('observacao', sr.observacao)
            rec.set('somente_leitura', sr.somente_leitura)
            rec.set('contexto_ocorrencia', sr.context_ocorrencia)
            rec.set('order_index', sr.order_index)
            rec.set('active', sr.active)
            app.save(rec)
          }
        } catch (e) {
          console.log('Erro ao processar regra:', sr.field_name, e)
        }
      }
    } catch (err) {
      console.log('Erro ao semear regras da matriz:', err)
    }
  },
  (app) => {
    // Reverter campos adicionados
    try {
      const matrixCol = app.findCollectionByNameOrId('sap_validation_rules_matrix')
      if (matrixCol.fields.getByName('tipo_validacao')) {
        matrixCol.fields.removeByName('tipo_validacao')
      }
      if (matrixCol.fields.getByName('observacao')) {
        matrixCol.fields.removeByName('observacao')
      }
      if (matrixCol.fields.getByName('somente_leitura')) {
        matrixCol.fields.removeByName('somente_leitura')
      }
      if (matrixCol.fields.getByName('parametro')) {
        matrixCol.fields.removeByName('parametro')
      }
      if (matrixCol.fields.getByName('regra_aplicabilidade')) {
        matrixCol.fields.removeByName('regra_aplicabilidade')
      }
      if (matrixCol.fields.getByName('contexto_ocorrencia')) {
        matrixCol.fields.removeByName('contexto_ocorrencia')
      }
      app.save(matrixCol)
    } catch (_) {}
  },
)
