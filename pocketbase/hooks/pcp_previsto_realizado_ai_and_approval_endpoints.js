/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoints e Hooks de Suporte para a tela Previsto x Realizado:
 * - POST /backend/v1/pcp/previsto-realizado/ai-analyze:
 *   Invoca o agente nativo ciafal-pxr-agent com os dados da hierarquia/filtros
 *   e gera análise factual.
 * - POST /backend/v1/pcp/previsto-realizado/save-analysis:
 *   Salva ou atualiza a análise em pcp_previsto_realizado_analyses e audita.
 * - POST /backend/v1/pcp/previsto-realizado/approve-analysis:
 *   Aprova formalmente a análise tornando-a relatório oficial auditado.
 */

routerAdd('POST', '/backend/v1/pcp/previsto-realizado/ai-analyze', (e) => {
  try {
    const authRecord = e.auth
    const body = e.requestInfo().body || {}
    const filters = body.filters || {}
    const hierarchy = body.hierarchy || []
    const summary = body.summary || {}

    // Monta contexto operacional determinístico para o agente
    const promptContext = {
      empresa: filters.empresa || 'CIAFAL',
      planta: filters.planta || 'TODAS',
      linha: filters.linha || 'TODAS',
      centro: filters.centro || 'TODOS',
      periodo: filters.periodo || 'PERÍODO SELECIONADO',
      dataInicial: filters.dataInicial || '-',
      dataFinal: filters.dataFinal || '-',
      totalProgramadoT: summary.totalProgramadoT || 0,
      totalRealizadoT: summary.totalRealizadoT || 0,
      percentualRealizadoGeral: summary.percentualRealizadoGeral || 0,
      totalPerdaT: summary.totalPerdaT || 0,
      totalOps: summary.totalOps || 0,
      opsNaoRealizadas: summary.opsNaoRealizadas || 0,
      opsParciais: summary.opsParciais || 0,
      opsComAtraso: summary.opsComAtraso || 0,
      carteiraTotalT: summary.carteiraTotalT || null,
      linhas: (hierarchy || []).map((l) => ({
        linha: l.lineCode + ' - ' + l.lineName,
        programadoT: l.programadoT,
        realizadoT: l.realizadoT,
        pctRealizado: l.percentualRealizado,
        perdaT: l.perdaT,
        carteiraT: l.carteiraT,
        sequenciaPct: l.sequencePct,
        centros: (l.centers || []).map((cnt) => ({
          centro: cnt.centerCode + ' - ' + cnt.centerName,
          programadoT: cnt.programadoT,
          realizadoT: cnt.realizadoT,
          pctRealizado: cnt.percentualRealizado,
          carteiraT: cnt.carteiraT,
          opsCount: (cnt.ops || []).length,
          opsAmostra: (cnt.ops || []).slice(0, 5).map((op) => ({
            opNumber: op.opNumber,
            material: op.materialCode + ' - ' + op.materialDescription,
            carteiraT: op.carteiraT,
            programadoT: op.plannedQuantityTons,
            realizadoT: op.realizedQuantityTons,
            pctRealizado: op.percentualRealizado,
            status: op.statusOp,
          })),
        })),
      })),
    }

    let aiResultText = ''
    try {
      const agent = $ai.agent('ciafal-pxr-agent')
      const agentResponse = agent.prompt(
        'Analise os seguintes dados operacionais da tela Previsto x Realizado respeitando estritamente ' +
          'o contrato de factualidade (nunca apresentar hipótese como fato comprovado; se sem vínculo comprovado, ' +
          'declarar "Causa não identificada nos registros disponíveis"):\n\n' +
          JSON.stringify(promptContext),
      )
      aiResultText = agentResponse && agentResponse.text ? agentResponse.text : ''
    } catch (agentErr) {
      console.warn(
        '[PxR AI] Falha ao chamar agente nativo via $ai.agent, fallback analítico:',
        agentErr,
      )
    }

    // Se o agente retornou texto ou fallback estruturado
    let structured = null
    if (aiResultText) {
      try {
        const jsonMatch = aiResultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          structured = JSON.parse(jsonMatch[0])
        }
      } catch (_) {}
    }

    if (!structured) {
      // Síntese analítica determinística com total respeito à regra factual
      const prog = Number(summary.totalProgramadoT || 0)
      const real = Number(summary.totalRealizadoT || 0)
      const pct = prog > 0 ? Number(((real / prog) * 100).toFixed(1)) : 0
      const perda = Number(summary.totalPerdaT || 0)

      structured = {
        executive_summary:
          `No período de ${filters.dataInicial || '-'} a ${filters.dataFinal || '-'}, o volume programado total foi de ` +
          `${prog.toFixed(2).replace('.', ',')} t e o realizado de ${real.toFixed(2).replace('.', ',')} t, atingindo ` +
          `${pct.toFixed(1).replace('.', ',')}% da meta física global. A perda acumulada registrada soma ` +
          `${perda.toFixed(2).replace('.', ',')} t. O impacto direto na carteira de pedidos em aberto demanda priorização das OPs pendentes.`,
        identified_causes: [
          {
            evidencia: `Volume programado de ${prog.toFixed(2).replace('.', ',')} t x realizado de ${real.toFixed(2).replace('.', ',')} t`,
            descricao:
              pct < 100
                ? 'Déficit de realização física constatado no período consolidado.'
                : 'Meta física consolidada atingida no período.',
            impactoTons: Math.max(0, prog - real),
          },
        ],
        investigation_hypotheses: [
          {
            hipotese:
              'Causa não identificada nos registros disponíveis para desvios em ordens pontuais sem apontamento MES.',
            acoesInvestigacao: [
              'Verificar se houve paradas de manutenção ou setup não vinculadas diretamente ao código da OP.',
              'Consultar apontamentos de matéria-prima e eventuais restrições de enfornamento.',
              'Conferir se ordens foram reprogramadas para a semana subsequente.',
            ],
          },
        ],
        recommendations: [
          'Garantir registro tempestivo dos motivos de parada operacional com vínculo explícito à OP.',
          'Reprogramar ordens não iniciadas com atendimento prioritário para itens com saldo em carteira comercial aberto.',
          'Revisar parâmetros de cadência e tempos de setup na Ficha Mestre para bitolas com maior índice de perda.',
        ],
      }
    }

    return e.json(200, {
      success: true,
      analysis: structured,
      rawText: aiResultText,
      generatedAt: new Date().toISOString(),
      generatedBy: authRecord
        ? authRecord.get('name') || authRecord.get('email')
        : 'Programador PCP',
    })
  } catch (err) {
    console.error('[PxR AI] Erro geral:', err)
    return e.json(500, { success: false, error: String(err && err.message ? err.message : err) })
  }
})

routerAdd('POST', '/backend/v1/pcp/previsto-realizado/save-analysis', (e) => {
  try {
    const authRecord = e.auth
    const body = e.requestInfo().body || {}
    const analysisCol = $app.findCollectionByNameOrId('pcp_previsto_realizado_analyses')

    const analysisCode = body.analysis_code || 'PXR-ANL-' + Date.now()
    const versionNumber = Number(body.version_number || 1)

    const record = new Record(analysisCol)
    record.set('analysis_code', analysisCode)
    record.set('version_number', versionNumber)
    record.set('status', body.status || 'RASCUNHO_IA')
    record.set('empresa_code', body.empresa_code || '')
    record.set('planta_code', body.planta_code || '')
    record.set('linha_code', body.linha_code || '')
    record.set('centro_code', body.centro_code || '')
    record.set('period_initial', body.period_initial || '')
    record.set('period_final', body.period_final || '')
    record.set('period_label', body.period_label || '')
    record.set('filters_snapshot', body.filters_snapshot || {})
    record.set('data_version_hash', body.data_version_hash || '')
    record.set('data_snapshot', body.data_snapshot || {})
    record.set('executive_summary', body.executive_summary || '')
    record.set('line_analyses', body.line_analyses || [])
    record.set('center_and_op_details', body.center_and_op_details || [])
    record.set('planner_notes', body.planner_notes || '')
    record.set('ai_findings', body.ai_findings || [])
    record.set('investigation_hypotheses', body.investigation_hypotheses || [])
    record.set('recommendations', body.recommendations || [])
    record.set('created_by_user_id', authRecord ? authRecord.id : '')
    record.set(
      'created_by_user_name',
      authRecord ? authRecord.get('name') || authRecord.get('email') : 'Programador PCP',
    )
    record.set('created_by_user_email', authRecord ? authRecord.get('email') : '')
    record.set('is_official', false)

    $app.save(record)

    // Auditoria
    try {
      if ($app.hasTable('pcp_audit_logs')) {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const audit = new Record(auditCol)
        audit.set('action', 'SAVE_PXR_AI_ANALYSIS')
        audit.set('module', 'PCP_EXECUCAO')
        audit.set('screen', 'PREVISTO_X_REALIZADO')
        audit.set('resource', 'pcp_previsto_realizado_analyses')
        audit.set('resource_id', record.id)
        audit.set('user_email', authRecord ? authRecord.get('email') : 'sistema')
        audit.set(
          'user_name',
          authRecord ? authRecord.get('name') || authRecord.get('email') : 'Sistema',
        )
        audit.set('details', { analysisCode, versionNumber })
        $app.save(audit)
      }
    } catch (aErr) {
      console.warn('[PxR Save] Falha ao registrar log de auditoria:', aErr)
    }

    return e.json(200, { success: true, id: record.id, analysis_code: analysisCode })
  } catch (err) {
    console.error('[PxR Save] Erro:', err)
    return e.json(500, { success: false, error: String(err && err.message ? err.message : err) })
  }
})

routerAdd('POST', '/backend/v1/pcp/previsto-realizado/approve-analysis', (e) => {
  try {
    const authRecord = e.auth
    const body = e.requestInfo().body || {}
    const analysisId = body.analysis_id
    const approvalNotes = body.approval_notes || ''

    if (!analysisId) {
      return e.json(400, { success: false, error: 'analysis_id é obrigatório para aprovação.' })
    }

    const record = $app.findRecordById('pcp_previsto_realizado_analyses', analysisId)
    record.set('status', 'APROVADA_OFICIAL')
    record.set('is_official', true)
    record.set('approved_by_user_id', authRecord ? authRecord.id : '')
    record.set(
      'approved_by_user_name',
      authRecord ? authRecord.get('name') || authRecord.get('email') : 'Aprovador PCP',
    )
    record.set('approved_by_user_email', authRecord ? authRecord.get('email') : '')
    record.set('approved_at', new Date().toISOString())
    record.set('approval_notes', approvalNotes)
    if (body.planner_notes !== undefined) {
      record.set('planner_notes', body.planner_notes)
    }

    $app.save(record)

    // Auditoria
    try {
      if ($app.hasTable('pcp_audit_logs')) {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const audit = new Record(auditCol)
        audit.set('action', 'APPROVE_PXR_AI_ANALYSIS')
        audit.set('module', 'PCP_EXECUCAO')
        audit.set('screen', 'PREVISTO_X_REALIZADO')
        audit.set('resource', 'pcp_previsto_realizado_analyses')
        audit.set('resource_id', record.id)
        audit.set('user_email', authRecord ? authRecord.get('email') : 'sistema')
        audit.set(
          'user_name',
          authRecord ? authRecord.get('name') || authRecord.get('email') : 'Aprovador',
        )
        audit.set('details', {
          analysisCode: record.get('analysis_code'),
          approvedAt: record.get('approved_at'),
          approvalNotes,
        })
        $app.save(audit)
      }
    } catch (aErr) {
      console.warn('[PxR Approve] Falha ao registrar log de auditoria:', aErr)
    }

    return e.json(200, {
      success: true,
      id: record.id,
      analysis_code: record.get('analysis_code'),
      approved_at: record.get('approved_at'),
      approved_by_name: record.get('approved_by_user_name'),
      status: 'APROVADA_OFICIAL',
    })
  } catch (err) {
    console.error('[PxR Approve] Erro:', err)
    return e.json(500, { success: false, error: String(err && err.message ? err.message : err) })
  }
})
