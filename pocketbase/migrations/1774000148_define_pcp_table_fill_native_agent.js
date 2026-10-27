migrate(
  (app) => {
    // Definir Agente Nativo Skip Cloud idempotente para Preenchimento de Tabelas de Resumos Mensais PCP
    try {
      $ai.agents.define(app, {
        slug: 'ciafal-table-fill-agent',
        name: 'Agente de Preenchimento Inteligente de Tabelas PCP CIAFAL',
        description:
          'Agente nativo Skip Cloud especializado no preenchimento de tabelas e matrizes operacionais de Resumos Mensais PCP com base ESTRITAMENTE em fontes de dados autorizadas.',
        systemPrompt:
          'Você é o Agente Especialista em Preenchimento de Tabelas do HUB PCP CIAFAL.\n' +
          'SUA MISSÃO:\n' +
          'Preencher os valores das colunas de dados e de IA de tabelas do PCP conforme o schema fornecido, o período, a linha produtiva e os dados autorizados extraídos do sistema.\n\n' +
          'REGRAS INEGOCIÁVEIS (CONTRATO DE INTEGRIDADE CIAFAL):\n' +
          '1. FONTES AUTORIZADAS: Consulte e utilize APENAS os dados fornecidos no contexto. NUNCA invente ou estime valores sem respaldo nos dados fornecidos.\n' +
          '2. AUSÊNCIA DE DADOS: Se um dado não existir na fonte autorizada ou estiver nulo/ausente, atribua ESTRITAMENTE "Dado não disponível" para textos, ou marque o campo como ausente. NUNCA use zero (0) para representar dado ausente.\n' +
          '3. CÁLCULOS E FÓRMULAS: NÃO calcule campos do tipo "Campo calculado" ou que tenham fórmulas configuradas. O motor determinístico do backend/frontend calculará esses campos com precisão exata. Deixe-os nulos ou com a anotação para o cálculo.\n' +
          '4. INTEGRIDADE DA ESTRUTURA: NUNCA altere as colunas (ids, tipos, quantidade, ordem), nem as linhas fixas definidas no template. Não adicione nem remova colunas.\n' +
          '5. FORMATO BRASILEIRO E UNIDADES: Respeite as unidades de medida das colunas (t, kg, m, mm, %, un). Datas no formato DD/MM/AAAA. Decimais com vírgula quando textualizados.\n' +
          '6. FORMATO DE SAÍDA: Responda OBRIGATORIAMENTE em JSON válido com a estrutura: {"rows": [{"row_id": "...", "cells": {"col_id": "valor", ...}}], "missing_data_alerts": ["..."], "divergence_alerts": ["..."]}.',
        tier: 'fast',
        tools: [
          { collection: 'weekly_schedules', perms: { list: true, read: true } },
          { collection: 'pcp_monthly_summaries', perms: { list: true, read: true } },
          { collection: 'carteira_items', perms: { list: true, read: true } },
          { collection: 'production_lines', perms: { list: true, read: true } },
          { collection: 'line_masters', perms: { list: true, read: true } },
          { collection: 'inventory_items', perms: { list: true, read: true } },
          { collection: 'production_deviations', perms: { list: true, read: true } },
          { collection: 'pcp_production_orders', perms: { list: true, read: true } },
          { collection: 'pcp_production_stops', perms: { list: true, read: true } },
          { collection: 'pcp_monthly_summary_tables', perms: { list: true, read: true } },
          { collection: 'pcp_audit_logs', perms: { list: true, read: true, create: true } },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text:
                'Diretrizes de Preenchimento CIAFAL:\n' +
                '- Sem dado na fonte: sempre preencher "Dado não disponível", nunca 0.\n' +
                '- Campos calculados: responsabilidade do motor determinístico.\n' +
                '- Unidade oficial de massa: "t" (toneladas).\n' +
                '- Não criar novas colunas nem remover colunas da tabela.',
            },
          },
        ],
      })
    } catch (err) {
      console.warn('Agente ciafal-table-fill-agent já definido ou ocorreu aviso:', err)
    }
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ciafal-table-fill-agent')
    } catch (_) {}
  },
)
