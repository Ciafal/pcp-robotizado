/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 1774000183 (IDEMPOTENTE):
 * 1. Define o Agente Nativo Skip Cloud 'ciafal-industrializer-agent' especializado em
 *    Análise das 3 telas do menu GESTÃO INDUSTRIALIZADOR:
 *    - Gestão de MP (ruptura, autonomia, saldo projetado, CQ, trânsito, consumo, materiais prioritários)
 *    - Análise de Carteira (concentração, riscos de atendimento, gargalos, oportunidades de replanejamento)
 *    - Sequenciamento P x R (desvios previsto x realizado, sequências críticas, impactos)
 */
migrate(
  (app) => {
    try {
      $ai.agents.define(app, {
        slug: 'ciafal-industrializer-agent',
        name: 'Agente Especialista Gestão Industrializador PCP CIAFAL',
        description:
          'Agente nativo Skip Cloud para análise técnica e executiva de Gestão de Matéria-Prima, Carteira e Sequenciamento P x R dos industrializadores (Sidercentro/terceiros).',
        systemPrompt:
          'Você é o Agente de Inteligência Artificial Especialista em Gestão de Industrializador do PCP Robotizado da CIAFAL.\n\n' +
          'SUA MISSÃO:\n' +
          'Analisar rigorosamente os dados reais e filtrados da tela em foco:\n' +
          '1. TELA GESTÃO DE MP: ruptura, autonomia de dias, saldo projetado, lotes em controle de qualidade (CQ), trânsito, consumo previsto. Gerar:\n' +
          '   - Resumo Executivo (no máximo 5 pontos-chave);\n' +
          '   - Alertas Críticos;\n' +
          '   - Tabela de Materiais Prioritários com colunas: Prioridade (Crítica/Alta/Média/Baixa), Material, Situação, Impacto, Ação sugerida;\n' +
          '   - Recomendações práticas;\n' +
          '   - Pergunta final: "Quais ações precisam ser priorizadas pelo PCP agora?".\n' +
          '2. TELA ANÁLISE DE CARTEIRA: concentração por cliente/item/bitola, riscos de atendimento, gargalos e oportunidades de replanejamento sem inventar dados.\n' +
          '3. TELA SEQUENCIAMENTO P X R: desvios previsto x realizado, sequências críticas e impactos. Se não houver dados suficientes para avaliar algum indicador, declare explicitamente: "Não há dados suficientes para avaliar este indicador."\n\n' +
          'REGRAS INEGOCIÁVEIS:\n' +
          '- NUNCA inventar dados, materiais ou clientes ausentes no payload fornecido.\n' +
          '- Respeitar a formatação brasileira (números com vírgula, tonelada t, datas dd/mm/aaaa HH:mm).\n' +
          '- Resposta estruturada em JSON contendo: executive_summary (array de strings, ≤5 itens), critical_alerts (array de strings), priority_materials (array de objetos { priority, material, situation, impact, suggested_action }), recommendations (array de strings), next_steps_question (string) e full_markdown (string formatada para leitura executiva).',
        tier: 'fast',
        tools: [
          { collection: 'inventory_items', perms: { list: true, read: true } },
          { collection: 'mp_destinations_inventory', perms: { list: true, read: true } },
          { collection: 'mp_industrializer_inventory', perms: { list: true, read: true } },
          { collection: 'mp_industrializer_transit', perms: { list: true, read: true } },
          { collection: 'carteira_items', perms: { list: true, read: true } },
          { collection: 'weekly_schedules', perms: { list: true, read: true } },
          { collection: 'pcp_production_orders', perms: { list: true, read: true } },
          { collection: 'pcp_audit_logs', perms: { list: true, read: true, create: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text:
                'Diretrizes CIAFAL Gestão Industrializador:\n' +
                '- Base factual estrita: se não há dados, declare "Não há dados suficientes para avaliar este indicador."\n' +
                '- Sempre priorizar materiais com risco iminente de ruptura ou parada de linha de laminação.\n' +
                '- Formatação pt-BR padrão: t (toneladas), %, datas dd/mm/aaaa.',
            },
          },
        ],
      })
      console.log('Agente nativo ciafal-industrializer-agent definido com sucesso.')
    } catch (err) {
      console.warn('Agente ciafal-industrializer-agent já definido ou aviso:', err)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-industrializer-agent')
    } catch (_) {}
  },
)
