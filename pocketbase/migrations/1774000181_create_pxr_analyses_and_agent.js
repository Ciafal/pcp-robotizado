/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000181 (IDEMPOTENTE):
 * 1. Cria a collection pcp_previsto_realizado_analyses para armazenar
 *    versões de análise de IA da tela Previsto x Realizado, histórico de
 *    observações do Programador PCP, aprovação formal (auditoria) e status oficial.
 * 2. Define o Agente Nativo Skip Cloud 'ciafal-pxr-agent' especializado em
 *    Análise de Desvios Previsto x Realizado com regras rigorosas de factualidade.
 */
migrate(
  (app) => {
    // 1. Criar collection pcp_previsto_realizado_analyses
    if (!app.hasTable('pcp_previsto_realizado_analyses')) {
      const col = new Collection({
        name: 'pcp_previsto_realizado_analyses',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'analysis_code', type: 'text', required: true },
          { name: 'version_number', type: 'number', required: true },
          {
            name: 'status',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['RASCUNHO_IA', 'REVISAO_PCP', 'APROVADA_OFICIAL', 'SUPERSEDED'],
          },
          { name: 'empresa_code', type: 'text' },
          { name: 'planta_code', type: 'text' },
          { name: 'linha_code', type: 'text' },
          { name: 'centro_code', type: 'text' },
          { name: 'period_initial', type: 'text' },
          { name: 'period_final', type: 'text' },
          { name: 'period_label', type: 'text' },
          { name: 'filters_snapshot', type: 'json' },
          { name: 'data_version_hash', type: 'text' },
          { name: 'data_snapshot', type: 'json' },
          { name: 'executive_summary', type: 'text' },
          { name: 'line_analyses', type: 'json' },
          { name: 'center_and_op_details', type: 'json' },
          { name: 'planner_notes', type: 'text' },
          { name: 'ai_findings', type: 'json' },
          { name: 'investigation_hypotheses', type: 'json' },
          { name: 'recommendations', type: 'json' },
          { name: 'created_by_user_id', type: 'text' },
          { name: 'created_by_user_name', type: 'text' },
          { name: 'created_by_user_email', type: 'text' },
          { name: 'approved_by_user_id', type: 'text' },
          { name: 'approved_by_user_name', type: 'text' },
          { name: 'approved_by_user_email', type: 'text' },
          { name: 'approved_at', type: 'text' },
          { name: 'approval_notes', type: 'text' },
          { name: 'is_official', type: 'bool' },
          { name: 'deleted_at', type: 'text' },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_pxr_analysis_code ON pcp_previsto_realizado_analyses (analysis_code)',
          'CREATE INDEX idx_pxr_analysis_filters ON pcp_previsto_realizado_analyses (linha_code, status)',
        ],
      })
      app.save(col)
      console.log('Collection pcp_previsto_realizado_analyses criada com sucesso.')
    }

    // 2. Definir Agente Nativo Skip Cloud idempotente: ciafal-pxr-agent
    try {
      $ai.agents.define(app, {
        slug: 'ciafal-pxr-agent',
        name: 'Agente Especialista Previsto x Realizado PCP CIAFAL',
        description:
          'Agente nativo Skip Cloud para análise técnica e executiva de desvios de Previsto x Realizado, perdas operacionais, aderência de sequência e carteira de pedidos.',
        systemPrompt:
          'Você é o Agente de Inteligência Artificial Especialista em Execução e Assertividade Operacional do PCP Robotizado da CIAFAL (Previsto x Realizado).\n\n' +
          'SUA MISSÃO:\n' +
          'Analisar a tabela e dados da tela Previsto x Realizado, considerando os filtros aplicados (Empresa, Planta, Linha, Centro, Período, Status), avaliando:\n' +
          '- Diferença Programado x Realizado (t);\n' +
          '- % de Realização (Atendimento) e perdas operacionais (t e %);\n' +
          '- Atrasos, cumprimento de sequência e OPs não executadas ou parcialmente executadas;\n' +
          '- Apontamentos MES, paradas operacionais registradas e gargalos;\n' +
          '- Impacto sobre a Carteira de Pedidos em aberto (ZSD28C).\n\n' +
          'REGRAS INEGOCIÁVEIS DE INTEGRIDADE (CONTRATO FACTUAL CIAFAL):\n' +
          '1. NUNCA apresente hipóteses como fatos confirmados.\n' +
          '2. Quando não houver evidência suficiente nos registros fornecidos, informe explicitamente: "Causa não identificada nos registros disponíveis" e, separadamente, liste "Possíveis causas para investigação".\n' +
          '3. NÃO atribua uma parada, perda ou atraso a determinada Ordem de Produção sem vínculo verificável nos dados.\n' +
          '4. Preserve o sinal da Carteira (t), respeite datas dd/mm/aaaa, números decimais com vírgula e pesos em t.\n' +
          '5. Não altere ordens SAP, programação PCP ou apontamentos MES. Apenas sintetize e recomende.\n' +
          '6. Formato de resposta JSON estruturado contendo: executive_summary, line_analyses, center_and_op_details, identified_causes (com evidência), investigation_hypotheses (sem evidência direta) e recommendations.',
        tier: 'fast',
        tools: [
          { collection: 'weekly_schedules', perms: { list: true, read: true } },
          { collection: 'pcp_production_orders', perms: { list: true, read: true } },
          { collection: 'pcp_production_stops', perms: { list: true, read: true } },
          { collection: 'pcp_production_postings', perms: { list: true, read: true } },
          { collection: 'carteira_items', perms: { list: true, read: true } },
          { collection: 'production_deviations', perms: { list: true, read: true } },
          {
            collection: 'pcp_previsto_realizado_analyses',
            perms: { list: true, read: true, create: true, update: true },
          },
          { collection: 'pcp_audit_logs', perms: { list: true, read: true, create: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text:
                'Diretrizes Factual CIAFAL Previsto x Realizado:\n' +
                '- Sem vínculo comprovado: usar "Causa não identificada nos registros disponíveis".\n' +
                '- Hipóteses devem ficar em seção separada ("Possíveis causas para investigação").\n' +
                '- Carteira (t): preservar o sinal da fonte.\n' +
                '- Unidades de massa sempre em t com vírgula decimal.',
            },
          },
        ],
      })
      console.log('Agente nativo ciafal-pxr-agent definido com sucesso.')
    } catch (err) {
      console.warn('Agente ciafal-pxr-agent já definido ou aviso:', err)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-pxr-agent')
    } catch (_) {}
    try {
      if (app.hasTable('pcp_previsto_realizado_analyses')) {
        app.delete(app.findCollectionByNameOrId('pcp_previsto_realizado_analyses'))
      }
    } catch (_) {}
  },
)
