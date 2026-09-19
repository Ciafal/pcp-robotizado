migrate(
  (app) => {
    const regrasCol = app.findCollectionByNameOrId('carteira_regras_config')

    // Verificar se o registro CURVA_ABC_PARAMETROS já existe
    try {
      app.findFirstRecordByData('carteira_regras_config', 'chave_regra', 'CURVA_ABC_PARAMETROS')
    } catch (_) {
      const record = new Record(regrasCol)
      record.set('chave_regra', 'CURVA_ABC_PARAMETROS')
      record.set('nome_regra', 'Parâmetros de Corte da Curva ABC por Faturamento')
      record.set('categoria', 'CURVA_ABC')
      record.set('versao', 1)
      record.set(
        'descricao',
        'Limites parametrizáveis de faturamento acumulado para classificação ABC: Curva A (0-85%), Curva B (85-95%) e Curva C (95-100%).',
      )
      record.set('payload', {
        corteA_pct: 85.0,
        corteB_pct: 95.0,
        fonte_faturamento: 'SAP',
        preco_medio_tonelada_padrao_brl: 4850.0,
        considerar_apenas_faturamento: true,
        atualizado_em: new Date().toISOString(),
      })
      record.set('responsavel_nome', 'Sistema PCP Robotizado')
      record.set('responsavel_email', 'pcp.admin@ciafal.com.br')
      record.set(
        'justificativa_alteracao',
        'Criação inicial dos parâmetros oficiais de corte da Curva ABC por Faturamento (Prioridade 4).',
      )
      record.set('ativo', true)
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData(
        'carteira_regras_config',
        'chave_regra',
        'CURVA_ABC_PARAMETROS',
      )
      app.delete(record)
    } catch (_) {}
  },
)
