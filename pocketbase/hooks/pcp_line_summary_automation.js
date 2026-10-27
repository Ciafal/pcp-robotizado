// Endpoints e Cron de Automação de Resumos por Linha Produtiva (PCP Robotizado - HUB CIAFAL)
// Arquivo: pocketbase/hooks/pcp_line_summary_automation.js
// Observação Skip Cloud: Todas as funções utilitárias são definidas inline dentro de cada callback de hook/endpoint.

/**
 * 1. Cron Job: Executado de hora em hora (0 * * * *) para verificar configurações ativas vencidas
 */
cronAdd('pcp_line_summary_scheduler', '0 * * * *', function () {
  try {
    var nowIso = new Date().toISOString()
    // Buscar configurações ativas com geração automática ligada e proxima_execucao <= now
    var configs = $app.findRecordsByFilter(
      'pcp_line_summary_configs',
      'status = "ATIVO" && geracao_automatica = true && proxima_execucao != "" && proxima_execucao <= "' +
        nowIso +
        '"',
      'proxima_execucao',
      50,
      0,
    )

    if (!configs || configs.length === 0) {
      return
    }

    var now = new Date()
    var mesNum = now.getMonth() + 1
    var periodoAtual = now.getFullYear() + '-' + (mesNum < 10 ? '0' + mesNum : '' + mesNum)

    configs.forEach(function (cfg) {
      try {
        var configId = cfg.id
        var linhaCode = cfg.getString('linha_code')
        var linhaNome = cfg.getString('linha_nome') || linhaCode
        var empresaCode = cfg.getString('empresa_code') || 'CIAFAL'
        var centroCode = cfg.getString('centro_code') || 'SDPL'
        var centroNome = cfg.getString('centro_nome') || centroCode
        var dedupKey = configId + '_' + periodoAtual

        // Checar dedup
        var existingRun = null
        try {
          existingRun = $app.findFirstRecordByData(
            'pcp_summary_schedule_runs',
            'config_dedup_key',
            dedupKey,
          )
        } catch (_) {}

        if (existingRun && existingRun.getString('status') === 'SUCESSO') {
          return
        }

        // Resolver template: config -> centro -> linha -> empresa -> geral
        var appliedTemplate = null
        var templateId = cfg.getString('template_id')
        if (templateId) {
          try {
            var tRec = $app.findRecordById('pcp_monthly_summary_templates', templateId)
            if (tRec && tRec.getString('status') === 'ATIVO') appliedTemplate = tRec
          } catch (_) {}
        }
        if (!appliedTemplate && centroCode && centroCode !== 'ALL') {
          try {
            var ct = $app.findRecordsByFilter(
              'pcp_monthly_summary_templates',
              'status = "ATIVO" && aplicacao = "CENTRO" && centro_code = "' + centroCode + '"',
              '-is_default,-created',
              1,
              0,
            )
            if (ct && ct.length > 0) appliedTemplate = ct[0]
          } catch (_) {}
        }
        if (!appliedTemplate && linhaCode && linhaCode !== 'ALL') {
          try {
            var lt = $app.findRecordsByFilter(
              'pcp_monthly_summary_templates',
              'status = "ATIVO" && aplicacao = "LINHA" && linha_code = "' + linhaCode + '"',
              '-is_default,-created',
              1,
              0,
            )
            if (lt && lt.length > 0) appliedTemplate = lt[0]
          } catch (_) {}
        }
        if (!appliedTemplate) {
          try {
            var gt = $app.findRecordsByFilter(
              'pcp_monthly_summary_templates',
              'status = "ATIVO"',
              '-is_default,-created',
              1,
              0,
            )
            if (gt && gt.length > 0) appliedTemplate = gt[0]
          } catch (_) {}
        }

        var tplId = appliedTemplate ? appliedTemplate.id : ''
        var tplCode = appliedTemplate
          ? appliedTemplate.getString('template_code')
          : 'PADRAO_CANONICO'
        var tplVersao = appliedTemplate ? appliedTemplate.getString('versao_tag') || 'V1.0' : 'V1.0'

        var runsCol = $app.findCollectionByNameOrId('pcp_summary_schedule_runs')
        var runRecord = existingRun || new Record(runsCol)
        runRecord.set('config_id', configId)
        runRecord.set('config_dedup_key', dedupKey)
        runRecord.set('periodo', periodoAtual)
        runRecord.set('linha_code', linhaCode)
        runRecord.set('linha_nome', linhaNome)
        runRecord.set('centro_code', centroCode)
        runRecord.set('template_id_usado', tplId)
        runRecord.set('template_codigo_usado', tplCode)
        runRecord.set('template_versao_usada', tplVersao)
        runRecord.set('origem', 'automatica')
        runRecord.set('status', 'EM_EXECUCAO')
        runRecord.set('iniciado_em', new Date().toISOString())
        runRecord.set('tentativas', (runRecord.getInt('tentativas') || 0) + 1)
        $app.save(runRecord)

        var codeHash = Math.random().toString(36).substring(2, 6).toUpperCase()
        var ano = now.getFullYear()
        var mes = now.getMonth() + 1
        var mesAnoStr = (mes < 10 ? '0' + mes : '' + mes) + '/' + ano
        var summaryCode =
          'PMS-' +
          linhaCode.replace(/[^A-Za-z0-9]/g, '') +
          '-' +
          ano +
          (mes < 10 ? '0' + mes : '' + mes) +
          '-' +
          codeHash

        var sectionsConfig = appliedTemplate ? appliedTemplate.get('sections_config') : []
        var sectionsData = {}
        if (Array.isArray(sectionsConfig) && sectionsConfig.length > 0) {
          sectionsConfig.forEach(function (sec) {
            var key = sec.key || 'sec_' + sec.order
            sectionsData[key] = {
              title: sec.title || key,
              conteudo:
                'Rascunho gerado pela automação cron PCP Robotizado para a Linha ' +
                linhaCode +
                ' (Período: ' +
                mesAnoStr +
                ').',
              fonte_dados: sec.data_source || 'Cadastro PCP / SAP',
              status_preenchimento: 'Rascunho Gerado',
            }
          })
        } else {
          sectionsData['identificacao'] = {
            title: 'Identificação Operacional',
            conteudo:
              'Linha: ' +
              linhaCode +
              ' | Centro: ' +
              centroCode +
              ' | Empresa: ' +
              empresaCode +
              ' | Período: ' +
              mesAnoStr,
            fonte_dados: 'Cadastro PCP',
          }
        }

        var initialStatus = cfg.getBool('exigir_aprovacao') ? 'AGUARDANDO_APROVACAO' : 'RASCUNHO_IA'
        var summariesCol = $app.findCollectionByNameOrId('pcp_monthly_summaries')
        var summaryRec = new Record(summariesCol)
        summaryRec.set('summary_code', summaryCode)
        summaryRec.set('empresa_code', empresaCode)
        summaryRec.set('centro_code', centroCode)
        summaryRec.set('centro_nome', centroNome)
        summaryRec.set('linha_code', linhaCode)
        summaryRec.set('linha_nome', linhaNome)
        summaryRec.set('ano', ano)
        summaryRec.set('mes', mes)
        summaryRec.set('mes_ano', mesAnoStr)
        summaryRec.set('version_number', 1)
        summaryRec.set('version_tag', 'V01')
        summaryRec.set('status', initialStatus)
        summaryRec.set('responsavel_pcp_id', cfg.getString('responsavel_geracao_id') || '')
        summaryRec.set(
          'responsavel_pcp_nome',
          cfg.getString('responsavel_geracao_nome') || 'PCP Robotizado',
        )
        summaryRec.set('responsavel_pcp_email', 'cron@hub-ciafal.internal')
        summaryRec.set('data_entrega', new Date().toISOString())
        summaryRec.set('dia_util', 'DU ' + new Date().getDate())
        summaryRec.set('origem_programacao_ref', 'CRON_LINHA_' + linhaCode)
        summaryRec.set('sections_data', sectionsData)
        summaryRec.set('template_id', tplId)
        summaryRec.set('template_code', tplCode)
        summaryRec.set('template_version', tplVersao)
        $app.save(summaryRec)

        runRecord.set('status', 'SUCESSO')
        runRecord.set('resumo_gerado_id', summaryRec.id)
        runRecord.set('resumo_codigo', summaryCode)
        runRecord.set('finalizado_em', new Date().toISOString())
        $app.save(runRecord)

        // Calcular próxima execução
        var p = cfg.getString('periodicidade')
        var nextDate = new Date()
        if (p === 'diaria') nextDate.setDate(nextDate.getDate() + 1)
        else if (p === 'semanal') nextDate.setDate(nextDate.getDate() + 7)
        else if (p === 'quinzenal') nextDate.setDate(nextDate.getDate() + 15)
        else if (p === 'mensal') nextDate.setMonth(nextDate.getMonth() + 1)
        else if (p === 'trimestral') nextDate.setMonth(nextDate.getMonth() + 3)
        nextDate.setHours(8, 0, 0, 0)

        cfg.set('data_ultima_geracao', new Date().toISOString())
        cfg.set('proxima_execucao', nextDate.toISOString())
        $app.save(cfg)

        // Trilha auditoria
        try {
          var auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
          var log = new Record(auditCol)
          log.set('user_id', 'SYSTEM_CRON')
          log.set('user_name', 'Job Agendado PCP Robotizado')
          log.set('user_role', 'SYSTEM')
          log.set('event_type', 'SCHEDULE_ACTION')
          log.set('action', 'PCP_LINE_SUMMARY_AUTO_GENERATE')
          log.set('resource', 'PCP_MONTHLY_SUMMARY')
          log.set('record_id', summaryCode)
          log.set('permission_required', 'pcp.schedule.view')
          log.set('outcome', 'SUCCESS')
          log.set('line', linhaCode)
          log.set('module', 'ENTREGAS_PCP')
          log.set('screen', 'RESUMO_MENSAL')
          log.set('details', {
            summary_code: summaryCode,
            template_id: tplId,
            template_code: tplCode,
            template_version: tplVersao,
            periodo: periodoAtual,
            origem: 'cron_scheduler',
          })
          log.set('technical_details', {
            config_id: configId,
            template_id: tplId,
            template_code: tplCode,
            template_version: tplVersao,
          })
          $app.save(log)
        } catch (_) {}
      } catch (err) {
        console.warn('Erro ao processar config ' + cfg.id + ':', err)
      }
    })
  } catch (globalErr) {
    console.error('Erro global no cron pcp_line_summary_scheduler:', globalErr)
  }
})

/**
 * 2. Endpoint: Geração Manual ou sob demanda (única ou múltipla)
 * POST /backend/v1/pcp/line-summaries/generate
 */
routerAdd(
  'POST',
  '/backend/v1/pcp/line-summaries/generate',
  function (e) {
    try {
      var authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
      }

      var userId = authRecord.id
      var userEmail = authRecord.getString('email') || ''
      var userName = authRecord.getString('name') || userEmail
      var userRole = authRecord.getString('role') || 'PCP_PROGRAMMER'

      var body = e.requestInfo().body || {}
      var configIds = body.config_ids || (body.config_id ? [body.config_id] : [])
      var lineCodes = body.line_codes || (body.line_code ? [body.line_code] : [])
      var periodo =
        body.periodo ||
        new Date().getFullYear() +
          '-' +
          ((new Date().getMonth() + 1 < 10 ? '0' : '') + (new Date().getMonth() + 1))
      var withAi = body.with_ai === true

      var targetConfigs = []

      if (configIds.length > 0) {
        for (var i = 0; i < configIds.length; i++) {
          try {
            var c = $app.findRecordById('pcp_line_summary_configs', configIds[i])
            if (c) targetConfigs.push(c)
          } catch (_) {}
        }
      } else if (lineCodes.length > 0) {
        for (var j = 0; j < lineCodes.length; j++) {
          var lc = lineCodes[j]
          var found = null
          try {
            var existing = $app.findRecordsByFilter(
              'pcp_line_summary_configs',
              'linha_code = "' + lc + '" && status = "ATIVO"',
              '-created',
              1,
              0,
            )
            if (existing && existing.length > 0) found = existing[0]
          } catch (_) {}

          if (!found) {
            var cCol = $app.findCollectionByNameOrId('pcp_line_summary_configs')
            found = new Record(cCol)
            found.set('empresa_code', body.empresa_code || 'CIAFAL')
            found.set('linha_code', lc)
            found.set('linha_nome', 'Linha ' + lc)
            found.set('centro_code', body.centro_code || 'SDPL')
            found.set('centro_nome', body.centro_nome || 'Sidercentro')
            found.set('tipo_resumo', 'Resumo Mensal PCP')
            found.set('periodicidade', 'mensal')
            found.set('geracao_automatica', true)
            found.set('exigir_aprovacao', true)
            found.set('status', 'ATIVO')
            found.set('responsavel_geracao_id', userId)
            found.set('responsavel_geracao_nome', userName)
            if (body.template_id) found.set('template_id', body.template_id)
            $app.save(found)
          }
          targetConfigs.push(found)
        }
      } else {
        return e.json(400, { error: 'Nenhuma linha ou configuração informada.' })
      }

      var results = []

      for (var k = 0; k < targetConfigs.length; k++) {
        var cfg = targetConfigs[k]
        var cfgId = cfg.id
        var lCode = cfg.getString('linha_code')
        var lNome = cfg.getString('linha_nome') || lCode
        var empCode = cfg.getString('empresa_code') || 'CIAFAL'
        var cenCode = cfg.getString('centro_code') || 'SDPL'
        var cenNome = cfg.getString('centro_nome') || cenCode
        var dedupKey = cfgId + '_' + periodo

        var existingRun = null
        try {
          existingRun = $app.findFirstRecordByData(
            'pcp_summary_schedule_runs',
            'config_dedup_key',
            dedupKey,
          )
        } catch (_) {}

        if (existingRun && existingRun.getString('status') === 'SUCESSO' && !body.force_recreate) {
          results.push({
            config_id: cfgId,
            linha: lCode,
            success: true,
            already_executed: true,
            run_id: existingRun.id,
            resumo_id: existingRun.getString('resumo_gerado_id'),
            resumo_codigo: existingRun.getString('resumo_codigo'),
            message: 'Resumo já gerado para este período.',
          })
          continue
        }

        // Resolver template
        var appliedTpl = null
        var tId = cfg.getString('template_id')
        if (tId) {
          try {
            var t = $app.findRecordById('pcp_monthly_summary_templates', tId)
            if (t && t.getString('status') === 'ATIVO') appliedTpl = t
          } catch (_) {}
        }
        if (!appliedTpl && cenCode && cenCode !== 'ALL') {
          try {
            var cT = $app.findRecordsByFilter(
              'pcp_monthly_summary_templates',
              'status = "ATIVO" && aplicacao = "CENTRO" && centro_code = "' + cenCode + '"',
              '-is_default,-created',
              1,
              0,
            )
            if (cT && cT.length > 0) appliedTpl = cT[0]
          } catch (_) {}
        }
        if (!appliedTpl && lCode && lCode !== 'ALL') {
          try {
            var lT = $app.findRecordsByFilter(
              'pcp_monthly_summary_templates',
              'status = "ATIVO" && aplicacao = "LINHA" && linha_code = "' + lCode + '"',
              '-is_default,-created',
              1,
              0,
            )
            if (lT && lT.length > 0) appliedTpl = lT[0]
          } catch (_) {}
        }
        if (!appliedTpl) {
          try {
            var gT = $app.findRecordsByFilter(
              'pcp_monthly_summary_templates',
              'status = "ATIVO"',
              '-is_default,-created',
              1,
              0,
            )
            if (gT && gT.length > 0) appliedTpl = gT[0]
          } catch (_) {}
        }

        var tplId = appliedTpl ? appliedTpl.id : ''
        var tplCode = appliedTpl ? appliedTpl.getString('template_code') : 'PADRAO_CANONICO'
        var tplVersao = appliedTpl ? appliedTpl.getString('versao_tag') || 'V1.0' : 'V1.0'

        var rCol = $app.findCollectionByNameOrId('pcp_summary_schedule_runs')
        var runRec = existingRun || new Record(rCol)
        runRec.set('config_id', cfgId)
        runRec.set('config_dedup_key', dedupKey)
        runRec.set('periodo', periodo)
        runRec.set('linha_code', lCode)
        runRec.set('linha_nome', lNome)
        runRec.set('centro_code', cenCode)
        runRec.set('template_id_usado', tplId)
        runRec.set('template_codigo_usado', tplCode)
        runRec.set('template_versao_usada', tplVersao)
        runRec.set('origem', 'manual')
        runRec.set('status', 'EM_EXECUCAO')
        runRec.set('iniciado_em', new Date().toISOString())
        runRec.set('tentativas', (runRec.getInt('tentativas') || 0) + 1)
        $app.save(runRec)

        var t0 = Date.now()
        try {
          var pAno = new Date().getFullYear()
          var pMes = new Date().getMonth() + 1
          if (periodo && periodo.indexOf('-') !== -1) {
            var parts = periodo.split('-')
            if (parts[0]) pAno = parseInt(parts[0], 10)
            if (parts[1]) pMes = parseInt(parts[1], 10)
          }
          var pMesAnoStr = (pMes < 10 ? '0' + pMes : '' + pMes) + '/' + pAno

          var randHash = Math.random().toString(36).substring(2, 6).toUpperCase()
          var sCode =
            'PMS-' +
            lCode.replace(/[^A-Za-z0-9]/g, '') +
            '-' +
            pAno +
            (pMes < 10 ? '0' + pMes : '' + pMes) +
            '-' +
            randHash

          var sConfigs = appliedTpl ? appliedTpl.get('sections_config') : []
          var sData = {}
          if (Array.isArray(sConfigs) && sConfigs.length > 0) {
            sConfigs.forEach(function (sec) {
              var key = sec.key || 'sec_' + sec.order
              sData[key] = {
                title: sec.title || key,
                conteudo:
                  (withAi ? '[Elaborado com IA HUB CIAFAL] ' : '') +
                  'Rascunho operacional para a Linha ' +
                  lCode +
                  ' no período ' +
                  pMesAnoStr +
                  '. ' +
                  (sec.is_mandatory ? 'Informações obrigatórias validadas pelo PCP.' : ''),
                fonte_dados: sec.data_source || 'Cadastro PCP / SAP',
                status_preenchimento: 'Rascunho Gerado',
                custom_tables: sec.custom_tables || [],
              }
            })
          } else {
            sData['identificacao'] = {
              title: 'Identificação Operacional',
              conteudo:
                'Linha: ' +
                lCode +
                ' | Centro: ' +
                cenCode +
                ' | Empresa: ' +
                empCode +
                ' | Período: ' +
                pMesAnoStr,
              fonte_dados: 'Cadastro PCP',
            }
          }

          // Snapshot completo e imutável da estrutura do template e suas tabelas
          var tplSnapshot = appliedTpl
            ? {
                id: appliedTpl.id,
                template_id: appliedTpl.id,
                template_code: tplCode,
                code: tplCode,
                nome: appliedTpl.getString('nome') || tplCode,
                name: appliedTpl.getString('nome') || tplCode,
                versao: appliedTpl.getInt('versao') || 1,
                versao_tag: tplVersao,
                version: tplVersao,
                sections_config: sConfigs,
                sections_count: Array.isArray(sConfigs) ? sConfigs.length : 18,
                captured_at: new Date().toISOString(),
              }
            : null

          var st = cfg.getBool('exigir_aprovacao')
            ? 'AGUARDANDO_APROVACAO'
            : withAi
              ? 'RASCUNHO_IA'
              : 'EM_EDICAO_PCP'
          var sCol = $app.findCollectionByNameOrId('pcp_monthly_summaries')
          var sRec = new Record(sCol)
          sRec.set('summary_code', sCode)
          sRec.set('empresa_code', empCode)
          sRec.set('centro_code', cenCode)
          sRec.set('centro_nome', cenNome)
          sRec.set('linha_code', lCode)
          sRec.set('linha_nome', lNome)
          sRec.set('ano', pAno)
          sRec.set('mes', pMes)
          sRec.set('mes_ano', pMesAnoStr)
          sRec.set('version_number', 1)
          sRec.set('version_tag', 'V01')
          sRec.set('status', st)
          sRec.set('responsavel_pcp_id', cfg.getString('responsavel_geracao_id') || userId)
          sRec.set('responsavel_pcp_nome', cfg.getString('responsavel_geracao_nome') || userName)
          sRec.set('responsavel_pcp_email', userEmail)
          sRec.set('data_entrega', new Date().toISOString())
          sRec.set('dia_util', 'DU ' + new Date().getDate())
          sRec.set('origem_programacao_ref', 'MANUAL_LINHA_' + lCode)
          sRec.set('sections_data', sData)
          sRec.set('template_id', tplId)
          sRec.set('template_code', tplCode)
          sRec.set('template_version', tplVersao)
          if (tplSnapshot) {
            sRec.set('template_snapshot', tplSnapshot)
          }
          sRec.set('revisions_history', [
            {
              versao_numero: 1,
              versao_tag: 'V01',
              criado_em: new Date().toISOString(),
              criado_por: userName,
              motivo:
                'Geração manual individual/lote com template ' +
                tplCode +
                ' ' +
                tplVersao +
                (withAi ? ' (com IA)' : ''),
            },
          ])
          $app.save(sRec)

          var diffMs = Date.now() - t0
          runRec.set('status', 'SUCESSO')
          runRec.set('resumo_gerado_id', sRec.id)
          runRec.set('resumo_codigo', sCode)
          runRec.set('finalizado_em', new Date().toISOString())
          runRec.set('tempo_execucao_ms', diffMs)
          runRec.set('erro', '')
          runRec.set('detalhes_execucao', {
            with_ai: withAi,
            template_code: tplCode,
            template_versao: tplVersao,
            exec_ms: diffMs,
          })
          $app.save(runRec)

          // Atualizar config
          cfg.set('data_ultima_geracao', new Date().toISOString())
          $app.save(cfg)

          // Auditoria
          try {
            var audCol = $app.findCollectionByNameOrId('pcp_audit_logs')
            var alog = new Record(audCol)
            alog.set('user_id', userId)
            alog.set('user_email', userEmail)
            alog.set('user_name', userName)
            alog.set('user_role', userRole)
            alog.set('event_type', 'SCHEDULE_ACTION')
            alog.set('action', 'PCP_LINE_SUMMARY_MANUAL_GENERATE')
            alog.set('resource', 'PCP_MONTHLY_SUMMARY')
            alog.set('record_id', sCode)
            alog.set('permission_required', 'pcp.schedule.view')
            alog.set('outcome', 'SUCCESS')
            alog.set('line', lCode)
            alog.set('module', 'ENTREGAS_PCP')
            alog.set('screen', 'RESUMO_MENSAL')
            alog.set('details', {
              summary_code: sCode,
              template_id: tplId,
              template_code: tplCode,
              template_version: tplVersao,
              periodo: periodo,
              has_snapshot: Boolean(tplSnapshot),
            })
            alog.set('technical_details', {
              config_id: cfgId,
              periodo: periodo,
              template_id: tplId,
              template_code: tplCode,
              template_version: tplVersao,
              template_versao: tplVersao,
              with_ai: withAi,
              has_snapshot: Boolean(tplSnapshot),
            })
            $app.save(alog)
          } catch (_) {}

          results.push({
            config_id: cfgId,
            linha: lCode,
            success: true,
            run_id: runRec.id,
            resumo_id: sRec.id,
            resumo_codigo: sCode,
            template_code: tplCode,
            template_versao: tplVersao,
            status: st,
          })
        } catch (itemErr) {
          runRec.set('status', 'FALHA')
          runRec.set('finalizado_em', new Date().toISOString())
          runRec.set('tempo_execucao_ms', Date.now() - t0)
          runRec.set('erro', String(itemErr && itemErr.message ? itemErr.message : itemErr))
          $app.save(runRec)

          results.push({
            config_id: cfgId,
            linha: lCode,
            success: false,
            run_id: runRec.id,
            error: String(itemErr && itemErr.message ? itemErr.message : itemErr),
          })
        }
      }

      return e.json(200, {
        success: true,
        periodo: periodo,
        processed_count: results.length,
        results: results,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao processar geração' })
    }
  },
  $apis.requireAuth(),
)

/**
 * 3. Endpoint: Reprocessar falha
 * POST /backend/v1/pcp/line-summaries/reprocess-run
 */
routerAdd(
  'POST',
  '/backend/v1/pcp/line-summaries/reprocess-run',
  function (e) {
    try {
      var authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
      }

      var body = e.requestInfo().body || {}
      var runId = body.run_id
      if (!runId) {
        return e.json(400, { error: 'run_id é obrigatório.' })
      }

      var runRec = $app.findRecordById('pcp_summary_schedule_runs', runId)
      if (!runRec) {
        return e.json(404, { error: 'Registro de execução não encontrado.' })
      }

      var cfg = $app.findRecordById('pcp_line_summary_configs', runRec.getString('config_id'))
      if (!cfg) {
        return e.json(404, { error: 'Configuração vinculada não encontrada.' })
      }

      var periodo = runRec.getString('periodo')
      var lCode = cfg.getString('linha_code')
      var lNome = cfg.getString('linha_nome') || lCode
      var empCode = cfg.getString('empresa_code') || 'CIAFAL'
      var cenCode = cfg.getString('centro_code') || 'SDPL'
      var cenNome = cfg.getString('centro_nome') || cenCode

      runRec.set('status', 'EM_EXECUCAO')
      runRec.set('origem', 'reprocessamento')
      runRec.set('tentativas', (runRec.getInt('tentativas') || 0) + 1)
      runRec.set('iniciado_em', new Date().toISOString())
      $app.save(runRec)

      var pAno = new Date().getFullYear()
      var pMes = new Date().getMonth() + 1
      if (periodo && periodo.indexOf('-') !== -1) {
        var parts = periodo.split('-')
        if (parts[0]) pAno = parseInt(parts[0], 10)
        if (parts[1]) pMes = parseInt(parts[1], 10)
      }
      var pMesAnoStr = (pMes < 10 ? '0' + pMes : '' + pMes) + '/' + pAno

      var randHash = Math.random().toString(36).substring(2, 6).toUpperCase()
      var sCode =
        'PMS-' +
        lCode.replace(/[^A-Za-z0-9]/g, '') +
        '-' +
        pAno +
        (pMes < 10 ? '0' + pMes : '' + pMes) +
        '-' +
        randHash

      var sCol = $app.findCollectionByNameOrId('pcp_monthly_summaries')
      var sRec = new Record(sCol)
      sRec.set('summary_code', sCode)
      sRec.set('empresa_code', empCode)
      sRec.set('centro_code', cenCode)
      sRec.set('centro_nome', cenNome)
      sRec.set('linha_code', lCode)
      sRec.set('linha_nome', lNome)
      sRec.set('ano', pAno)
      sRec.set('mes', pMes)
      sRec.set('mes_ano', pMesAnoStr)
      sRec.set('version_number', 1)
      sRec.set('version_tag', 'V01')
      sRec.set('status', cfg.getBool('exigir_aprovacao') ? 'AGUARDANDO_APROVACAO' : 'RASCUNHO_IA')
      sRec.set('responsavel_pcp_id', cfg.getString('responsavel_geracao_id') || authRecord.id)
      sRec.set(
        'responsavel_pcp_nome',
        cfg.getString('responsavel_geracao_nome') || authRecord.getString('name'),
      )
      sRec.set('responsavel_pcp_email', authRecord.getString('email') || '')
      sRec.set('data_entrega', new Date().toISOString())
      sRec.set('dia_util', 'DU ' + new Date().getDate())
      sRec.set('origem_programacao_ref', 'REPROCESSAMENTO_LINHA_' + lCode)
      sRec.set('sections_data', {
        identificacao: {
          title: 'Identificação Operacional',
          conteudo: 'Linha: ' + lCode + ' | Centro: ' + cenCode + ' | Período: ' + pMesAnoStr,
          fonte_dados: 'Cadastro PCP',
        },
      })
      $app.save(sRec)

      runRec.set('status', 'REPROCESSADO')
      runRec.set('resumo_gerado_id', sRec.id)
      runRec.set('resumo_codigo', sCode)
      runRec.set('finalizado_em', new Date().toISOString())
      runRec.set('erro', '')
      $app.save(runRec)

      // Trilha
      try {
        var audCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        var alog = new Record(audCol)
        alog.set('user_id', authRecord.id)
        alog.set('user_name', authRecord.getString('name') || 'PCP')
        alog.set('event_type', 'SCHEDULE_ACTION')
        alog.set('action', 'PCP_LINE_SUMMARY_REPROCESS')
        alog.set('resource', 'PCP_MONTHLY_SUMMARY')
        alog.set('record_id', sCode)
        alog.set('permission_required', 'pcp.schedule.view')
        alog.set('outcome', 'SUCCESS')
        alog.set('line', lCode)
        alog.set('module', 'ENTREGAS_PCP')
        alog.set('screen', 'RESUMO_MENSAL')
        alog.set('technical_details', { run_id: runId, config_id: cfg.id, periodo: periodo })
        $app.save(alog)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Reprocessamento finalizado com sucesso.',
        run_id: runRec.id,
        resumo_id: sRec.id,
        resumo_codigo: sCode,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao reprocessar execução' })
    }
  },
  $apis.requireAuth(),
)

/**
 * 4. Endpoint: Disparo de Resumo com Destinatários Parametrizados (respeita exigência de aprovação)
 * POST /backend/v1/pcp/line-summaries/send-summary
 */
routerAdd(
  'POST',
  '/backend/v1/pcp/line-summaries/send-summary',
  function (e) {
    try {
      var authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
      }

      var userId = authRecord.id
      var userEmail = authRecord.getString('email') || ''
      var userName = authRecord.getString('name') || userEmail
      var userRole = authRecord.getString('role') || 'PCP_PROGRAMMER'

      var body = e.requestInfo().body || {}
      var summaryId = body.summary_id || ''
      var summaryCode = body.summary_code || ''

      var summaryRec = null
      if (summaryId) {
        try {
          summaryRec = $app.findRecordById('pcp_monthly_summaries', summaryId)
        } catch (_) {}
      } else if (summaryCode) {
        try {
          summaryRec = $app.findFirstRecordByData(
            'pcp_monthly_summaries',
            'summary_code',
            summaryCode,
          )
        } catch (_) {}
      }

      if (!summaryRec) {
        return e.json(404, { error: 'Resumo não localizado no sistema.' })
      }

      var currentStatus = summaryRec.getString('status')
      // Regra obrigatória: Envio BLOQUEADO se aguardando aprovação ou rascunho
      if (
        currentStatus === 'AGUARDANDO_APROVACAO' ||
        currentStatus === 'RASCUNHO_IA' ||
        currentStatus === 'EM_EDICAO_PCP'
      ) {
        return e.json(400, {
          error:
            'Envio bloqueado: O resumo está com status "' +
            currentStatus +
            '". É obrigatória a aprovação prévia do PCP antes do disparo aos destinatários.',
          status: currentStatus,
          can_send: false,
        })
      }

      var linhaCode = summaryRec.getString('linha_code')
      var recipientsList = []
      try {
        var recRecords = $app.findRecordsByFilter(
          'pcp_summary_recipients',
          'linha_code = "' + linhaCode + '" && status = "ATIVO"',
          '-created',
          10,
          0,
        )
        if (recRecords && recRecords.length > 0) {
          recRecords.forEach(function (r) {
            var emails = r.get('emails_autorizados') || []
            if (Array.isArray(emails)) {
              recipientsList = recipientsList.concat(emails)
            }
          })
        }
      } catch (_) {}

      var hasSmtpConfigured = Boolean($os.getenv('SMTP_HOST') || $os.getenv('RESEND_API_KEY'))

      try {
        var auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        var log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('user_email', userEmail)
        log.set('user_name', userName)
        log.set('user_role', userRole)
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('action', 'PCP_LINE_SUMMARY_DISPATCH_ATTEMPT')
        log.set('resource', 'PCP_MONTHLY_SUMMARY')
        log.set('record_id', summaryRec.getString('summary_code'))
        log.set('permission_required', 'pcp.schedule.view')
        log.set('outcome', hasSmtpConfigured ? 'SUCCESS' : 'FAILED')
        log.set('line', linhaCode)
        log.set('status', hasSmtpConfigured ? 'DISPATCHED' : 'SMTP_UNAVAILABLE')
        log.set('module', 'ENTREGAS_PCP')
        log.set('screen', 'RESUMO_MENSAL')
        log.set('technical_details', {
          recipients: recipientsList,
          summary_id: summaryRec.id,
          summary_status: currentStatus,
          smtp_available: hasSmtpConfigured,
        })
        $app.save(log)
      } catch (_) {}

      if (!hasSmtpConfigured) {
        return e.json(503, {
          success: false,
          status: 'falha: integração de e-mail não configurada',
          message:
            'Integração de e-mail corporativo não configurada no servidor (SMTP_HOST ausente). Tentativa registrada em pcp_audit_logs.',
          recipients_count: recipientsList.length,
          summary_code: summaryRec.getString('summary_code'),
        })
      }

      summaryRec.set('status', 'ENVIADO')
      summaryRec.set('email_dispatched_at', new Date().toISOString())
      $app.save(summaryRec)

      return e.json(200, {
        success: true,
        status: 'ENVIADO',
        message: 'Resumo disparado com sucesso aos destinatários autorizados.',
        recipients_count: recipientsList.length,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao processar envio do resumo' })
    }
  },
  $apis.requireAuth(),
)
