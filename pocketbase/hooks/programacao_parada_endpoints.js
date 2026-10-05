/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoints dedicados para Programação de Parada no HUB CIAFAL:
 * 1. POST /backend/v1/programacao-parada/ia-validar
 * 2. POST /backend/v1/programacao-parada/ia-comunicado
 * 3. POST /backend/v1/programacao-parada/enviar-comunicado
 */

// 1. Rota de Validação com IA
routerAdd(
  'POST',
  '/backend/v1/programacao-parada/ia-validar',
  (e) => {
    const auth = e.requestInfo().auth
    if (!auth) {
      return e.json(401, { error: 'Não autorizado' })
    }

    const body = e.requestInfo().body || {}
    const { codigo, centros, versao, modo } = body

    if (!centros || !Array.isArray(centros) || centros.length === 0) {
      return e.json(400, { error: 'Nenhum centro fornecido para validação' })
    }

    // Buscar dados reais no banco para fundamentar a análise e nunca inventar
    let conflitosIdentificados = []
    let recomendacoes = []
    let centrosAfetados = []
    let programacoesAfetadas = []
    let ordensAfetadas = []
    let statusGeral = 'SEM_CONFLITO'

    for (let i = 0; i < centros.length; i++) {
      const c = centros[i]
      const centroNome = c.centro_nome || c.centro_id || 'Centro'
      const linhaNome = c.linha_nome || c.linha_id || 'Linha'
      const inicioIso = c.inicio_iso || c.data_inicio + ' ' + c.hora_inicio
      const fimIso = c.fim_iso || c.data_fim + ' ' + c.hora_fim

      centrosAfetados.push({
        centro: centroNome,
        linha: linhaNome,
        periodo: `${c.data_inicio} ${c.hora_inicio} até ${c.data_fim} ${c.hora_fim}`,
        motivo: c.motivo,
        duracao: c.duracao_formatada || `${c.duracao_horas || 0}h`,
      })

      // 1.1 Verificar sobreposição com programações semanais ativas
      try {
        const schedules = $app.findRecordsByFilter(
          'weekly_schedules',
          `item_type = 'PRODUCTION' && (line_code = '${c.linha_id}' || line_code = '${c.centro_id}')`,
          '-created',
          50,
        )

        for (let s = 0; s < schedules.length; s++) {
          const sch = schedules[s]
          const schStart = sch.getString('start_datetime')
          const schEnd = sch.getString('end_datetime')
          const opNumber = sch.getString('production_order')
          const matDesc = sch.getString('material_description')

          if (schStart && schEnd) {
            // Checar sobreposição de intervalos
            if (schStart < fimIso && schEnd > inicioIso) {
              statusGeral = 'CONFLITO_CRITICO'
              const conflitoMsg = `Conflito identificado: o Centro ${centroNome} possui produção programada da OP ${opNumber || 'N/A'} (${matDesc || 'Material'}) entre ${schStart} e ${schEnd}.`
              conflitosIdentificados.push(conflitoMsg)
              programacoesAfetadas.push({
                schedule_code: sch.getString('schedule_code'),
                op: opNumber,
                material: matDesc,
                inicio: schStart,
                fim: schEnd,
              })
              if (opNumber) ordensAfetadas.push(opNumber)
            }
          }
        }
      } catch (errSch) {
        // Sem erro fatal caso weekly_schedules esteja vazio
      }

      // 1.2 Verificar Programação de Testes no período
      try {
        const testes = $app.findRecordsByFilter(
          'test_programming',
          `status != 'Cancelado' && status != 'Concluído'`,
          '-created',
          20,
        )

        for (let t = 0; t < testes.length; t++) {
          const teste = testes[t]
          const tStart = (
            teste.getString('expected_start_date') +
            ' ' +
            teste.getString('expected_start_time')
          ).trim()
          const tEnd = (
            teste.getString('expected_end_date') +
            ' ' +
            teste.getString('expected_end_time')
          ).trim()
          const tLinha = teste.getString('production_line')
          const tCentro = teste.getString('work_center')

          if (
            tStart &&
            tEnd &&
            (tLinha === c.linha_id || tCentro === c.centro_id || tLinha === c.linha_nome)
          ) {
            if (tStart < fimIso && tEnd > inicioIso) {
              if (statusGeral !== 'CONFLITO_CRITICO') statusGeral = 'ATENCAO'
              conflitosIdentificados.push(
                `Sobreposição com Teste Industrial: ${teste.getString('test_id')} - "${teste.getString('title')}" agendado no período (${tStart} a ${tEnd}).`,
              )
            }
          }
        }
      } catch (errTest) {
        // Ignorar se não houver registros
      }

      // 1.3 Verificar ordens de produção existentes no período
      try {
        const orders = $app.findRecordsByFilter(
          'pcp_production_orders',
          `status_op = 'PROGRAMADA' || status_op = 'EM_PRODUCAO'`,
          '-created',
          30,
        )
        for (let o = 0; o < orders.length; o++) {
          const ord = orders[o]
          const oLinha = ord.getString('linha_code')
          const oCentro = ord.getString('centro_code')
          const oStart = ord.getString('planned_start_date')
          const oEnd = ord.getString('planned_end_date')

          if ((oLinha === c.linha_id || oCentro === c.centro_id) && oStart && oEnd) {
            if (oStart < fimIso && oEnd > inicioIso) {
              if (statusGeral !== 'CONFLITO_CRITICO') statusGeral = 'ATENCAO'
              ordensAfetadas.push(ord.getString('op_number'))
            }
          }
        }
      } catch (errOrd) {
        // Ignorar
      }
    }

    // Deduplicar listas
    const uniqueOrdens = Array.from(new Set(ordensAfetadas))

    if (conflitosIdentificados.length > 0) {
      recomendacoes.push(
        'Reprogramar as ordens de produção conflitantes para turnos subsequentes ou antecipá-las.',
      )
      recomendacoes.push(
        'Comunicar a equipe de manutenção e logística sobre o bloqueio de capacidade.',
      )
      recomendacoes.push(
        'Alinhar com o Comercial caso haja ordens MTO com prazo de entrega comprometido.',
      )
    } else {
      recomendacoes.push('Período livre de ordens de produção ativas confirmadas.')
      recomendacoes.push(
        'Disponibilidade de equipe técnica e estoque de sobressalentes deve ser conferida com Manutenção.',
      )
      recomendacoes.push('Parada validada apta para publicação na Montagem Programação.')
    }

    // Gerar resumo estruturado
    const analiseResultado = {
      nivel: statusGeral, // SEM_CONFLITO | ATENCAO | CONFLITO_CRITICO
      resumo:
        statusGeral === 'CONFLITO_CRITICO'
          ? `Foram identificados ${conflitosIdentificados.length} conflito(s) crítico(s) de capacidade e ordens programadas nos centros selecionados.`
          : statusGeral === 'ATENCAO'
            ? `Parada viável com pontos de atenção identificados em ordens/testes no horizonte.`
            : `Análise concluída com sucesso: nenhuma incompatibilidade ou conflito identificado no período selecionado.`,
      impactos_identificados:
        conflitosIdentificados.length > 0
          ? conflitosIdentificados
          : [
              'Capacidade do centro será reduzida em 100% no período da parada.',
              'Setup e limpeza deverão ser alocados antes da retomada.',
            ],
      alertas:
        statusGeral === 'CONFLITO_CRITICO'
          ? ['Exige autorização gerencial para sobrepor ordens ativas.']
          : [],
      centros_afetados: centrosAfetados,
      programacoes_afetadas: programacoesAfetadas,
      ordens_afetadas: uniqueOrdens,
      recomendacoes: recomendacoes,
      proximas_acoes: [
        'Confirmar data/hora com manutenção e supervisão de área.',
        'Salvar e validar a programação para aplicar bloqueio de capacidade na Montagem Semanal.',
        'Emitir comunicado oficial aos setores envolvidos.',
      ],
    }

    // Se houver SKIP AI Gateway disponível, aprimorar a redação técnica sem inventar dados
    try {
      const aiPrompt =
        `Você é o Analista Técnico do PCP Robotizado (Ciafal). Analise estritamente os seguintes dados verificados no sistema e resuma os impactos em tom corporativo objetivo, sem inventar fatos ou números:\n` +
        `Código: ${codigo}\nCentros: ${JSON.stringify(centrosAfetados)}\nConflitos reais encontrados: ${JSON.stringify(conflitosIdentificados)}\nOrdens afetadas: ${JSON.stringify(uniqueOrdens)}\nStatus Geral: ${statusGeral}`

      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente sênior de PCP da indústria siderúrgica e conformação mecânica da Ciafal. Responda em português pt-BR com máxima precisão técnica.',
          },
          { role: 'user', content: aiPrompt },
        ],
      })

      if (reply && reply.choices && reply.choices[0] && reply.choices[0].message) {
        analiseResultado.parecer_ia = reply.choices[0].message.content
      }
    } catch (errAi) {
      analiseResultado.parecer_ia = analiseResultado.resumo
    }

    return e.json(200, analiseResultado)
  },
  $apis.requireAuth(),
)

// 2. Rota de Geração de Texto de Comunicado com IA
routerAdd(
  'POST',
  '/backend/v1/programacao-parada/ia-comunicado',
  (e) => {
    const auth = e.requestInfo().auth
    if (!auth) {
      return e.json(401, { error: 'Não autorizado' })
    }

    const body = e.requestInfo().body || {}
    const { codigo, centros, versao, tipo_comunicado, alteracoes } = body

    if (!centros || !Array.isArray(centros) || centros.length === 0) {
      return e.json(400, { error: 'Centros não informados' })
    }

    const isAtualizacao = tipo_comunicado === 'ATUALIZACAO'

    // Montar assunto padrão
    let assunto = ''
    if (centros.length === 1) {
      const c = centros[0]
      assunto = `${isAtualizacao ? 'ATUALIZAÇÃO — ' : ''}Parada Programada — ${c.linha_nome || c.linha_id} / ${c.centro_nome || c.centro_id} — ${c.data_inicio} a ${c.data_fim}`
    } else {
      assunto = `${isAtualizacao ? 'ATUALIZAÇÃO — ' : ''}Parada Programada — Atualização das operações (${codigo})`
    }

    // Agrupar centros por linha
    let linhasMap = {}
    for (let i = 0; i < centros.length; i++) {
      const c = centros[i]
      const lNome = c.linha_nome || c.linha_id || 'Linha Operacional'
      if (!linhasMap[lNome]) linhasMap[lNome] = []
      linhasMap[lNome].push(c)
    }

    let corpoPadrao = ''
    if (isAtualizacao) {
      corpoPadrao += `Prezados,\n\nInformamos que houve **ATUALIZAÇÃO** nos parâmetros da **${codigo}** (Versão V0${versao || 2}).\n\n`
      if (alteracoes && alteracoes.length > 0) {
        corpoPadrao += `**Principais alterações identificadas:**\n`
        for (let a = 0; a < alteracoes.length; a++) {
          corpoPadrao += `• ${alteracoes[a]}\n`
        }
        corpoPadrao += `\n`
      }
    } else {
      corpoPadrao += `Prezados,\n\nComunicamos a realização de **PARADA PROGRAMADA** conforme detalhamento operacional abaixo:\n\n`
    }

    corpoPadrao += `**Programação:** ${codigo} (Versão V0${versao || 1})\n\n`

    const linhaKeys = Object.keys(linhasMap)
    for (let l = 0; l < linhaKeys.length; l++) {
      const linhaNome = linhaKeys[l]
      corpoPadrao += `**${linhaNome}:**\n`
      const cList = linhasMap[linhaNome]
      for (let j = 0; j < cList.length; j++) {
        const it = cList[j]
        corpoPadrao += `• **Centro:** ${it.centro_nome || it.centro_id}\n`
        corpoPadrao += `  - **Período:** **${it.data_inicio} ${it.hora_inicio}** até **${it.data_fim} ${it.hora_fim}** (Duração: ${it.duracao_formatada || `${it.duracao_horas}h`})\n`
        corpoPadrao += `  - **Motivo:** ${it.motivo}${it.motivo === 'Outro' && it.motivo_outro_detalhe ? ' - ' + it.motivo_outro_detalhe : ''}\n`
        if (it.descricao) {
          corpoPadrao += `  - **Observação:** ${it.descricao}\n`
        }
        corpoPadrao += `  - **Previsão de Retorno Operacional:** **${it.data_fim} ${it.hora_fim}**\n\n`
      }
    }

    corpoPadrao += `Os centros e linhas não listados permanecem operando regularmente conforme a programação semanal vigente.\n\n`
    corpoPadrao += `Solicitamos a todas as áreas envolvidas que alinhem seus preparativos e fluxos logísticos.\n\n`
    corpoPadrao += `Atenciosamente,\nPCP — Ciafal`

    // Tentar enriquecer via AI Gateway respeitando os dados estritos
    let corpoFinal = corpoPadrao
    try {
      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              "Você é o redator técnico do PCP da Ciafal. Redija comunicados industriais concisos, com datas em negrito, agrupados por linha, tom formal e objetivo. NUNCA invente datas ou informações que não foram passadas. Finalize sempre com 'Atenciosamente,\nPCP — Ciafal'.",
          },
          {
            role: 'user',
            content: `Reescreva o seguinte comunicado corporativo de Parada Programada tornando-o polido, direto e com boa formatação Markdown:\n\n${corpoPadrao}`,
          },
        ],
      })
      if (aiRes && aiRes.choices && aiRes.choices[0] && aiRes.choices[0].message) {
        corpoFinal = aiRes.choices[0].message.content
      }
    } catch (errAi) {
      corpoFinal = corpoPadrao
    }

    return e.json(200, {
      assunto: assunto,
      conteudo: corpoFinal,
    })
  },
  $apis.requireAuth(),
)

// 3. Rota de Envio Real de Comunicado e Registro de Auditoria
routerAdd(
  'POST',
  '/backend/v1/programacao-parada/enviar-comunicado',
  (e) => {
    const auth = e.requestInfo().auth
    if (!auth) {
      return e.json(401, { error: 'Não autorizado' })
    }

    const body = e.requestInfo().body || {}
    const {
      parada_id,
      codigo_parada,
      versao_programacao,
      assunto,
      conteudo,
      destinatarios_para,
      destinatarios_cc,
      grupos_destinatarios,
      tipo_comunicado,
    } = body

    if (!parada_id || !assunto || !conteudo) {
      return e.json(400, { error: 'Campos obrigatórios ausentes para envio de comunicado' })
    }

    const userEmail = auth.email || 'sistema@ciafal.com.br'
    const userName = auth.getString('name') || 'Usuário PCP'
    const agora = new Date().toISOString()
    const agoraFmt = agora.replace('T', ' ').substring(0, 19)

    // Tentativa de envio real pela infraestrutura de e-mail do Skip Cloud / PocketBase
    let resultadoEnvio = 'SUCESSO'
    let mensagemErro = ''
    let enviadosCount = (destinatarios_para || []).length + (destinatarios_cc || []).length

    if (enviadosCount === 0) {
      resultadoEnvio = 'FALHA'
      mensagemErro = "Nenhum destinatário informado na lista 'Para' ou 'Cc'."
    } else {
      try {
        // Disparo real via Skip Cloud transactional email
        for (let i = 0; i < (destinatarios_para || []).length; i++) {
          const dest = destinatarios_para[i]
          if (dest && dest.includes('@')) {
            try {
              const emailObj = new MailerMessage({
                from: {
                  address: $app.settings().meta.senderAddress || 'pcp@ciafal.com.br',
                  name: $app.settings().meta.senderName || 'PCP Robotizado CIAFAL',
                },
                to: [{ address: dest }],
                subject: assunto,
                text: conteudo,
              })
              $app.newMailClient().send(emailObj)
            } catch (mErr) {
              resultadoEnvio = 'FALHA'
              mensagemErro =
                'Infraestrutura SMTP corporativo (FCA) não provisionada ou indisponível: ' +
                mErr.message
              break
            }
          }
        }
      } catch (eSend) {
        resultadoEnvio = 'FALHA'
        mensagemErro = 'Falha no envio de e-mail: ' + eSend.message
      }
    }

    // Registrar histórico na collection programacao_parada_comunicados
    let comunicadoRecord = null
    try {
      const comCol = $app.findCollectionByNameOrId('programacao_parada_comunicados')
      comunicadoRecord = new Record(comCol, {
        parada_id: parada_id,
        codigo_parada: codigo_parada || 'PP-00000/2026',
        versao_programacao: versao_programacao || 1,
        assunto: assunto,
        conteudo: conteudo,
        destinatarios_para: destinatarios_para || [],
        destinatarios_cc: destinatarios_cc || [],
        grupos_destinatarios: grupos_destinatarios || [],
        usuario_envio_id: auth.id,
        usuario_envio_nome: userName,
        data_hora_envio: agoraFmt,
        resultado_envio: resultadoEnvio,
        mensagem_erro: mensagemErro,
        tipo_comunicado: tipo_comunicado || 'INICIAL',
      })
      $app.save(comunicadoRecord)
    } catch (errSave) {
      console.log('Erro ao gravar histórico de comunicado: ' + errSave.message)
    }

    // Atualizar a programação de parada
    try {
      const paradaRec = $app.findRecordById('programacao_paradas', parada_id)
      if (paradaRec) {
        if (resultadoEnvio === 'SUCESSO') {
          paradaRec.set('status', 'COMUNICADA')
          paradaRec.set('ultimo_comunicado_em', agoraFmt)
          paradaRec.set('ultimo_comunicado_versao', versao_programacao || 1)
          paradaRec.set('programacao_alterada_pos_comunicado', false)
        }
        paradaRec.set('atualizado_por_id', auth.id)
        paradaRec.set('atualizado_por_nome', userName)
        paradaRec.set('ultima_alteracao', agoraFmt)
        $app.save(paradaRec)
      }
    } catch (errParada) {
      console.log('Erro ao atualizar status da parada: ' + errParada.message)
    }

    // Gravar registro na auditoria central (pcp_audit_logs)
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const auditRec = new Record(auditCol, {
        user_id: auth.id,
        user_email: userEmail,
        user_name: userName,
        user_role: auth.getString('role') || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: 'ENVIO_COMUNICADO_PARADA',
        resource: 'PROGRAMACAO_PARADA',
        resource_id: codigo_parada || parada_id,
        permission_required: 'pcp.parada.comunicar',
        outcome: resultadoEnvio === 'SUCESSO' ? 'SUCCESS' : 'FAILED',
        module: 'PROGRAMACAO',
        screen: 'Programação de Parada',
        entity: 'programacao_paradas',
        record_id: parada_id,
        status: resultadoEnvio === 'SUCESSO' ? 'Comunicado Enviado' : 'Falha no Envio',
        reason: `Envio de comunicado da parada ${codigo_parada} (V0${versao_programacao || 1}) para ${enviadosCount} destinatários.`,
        justification: assunto,
        details: {
          codigo: codigo_parada,
          versao: versao_programacao,
          destinatarios_para: destinatarios_para,
          destinatarios_cc: destinatarios_cc,
          grupos: grupos_destinatarios,
          resultado: resultadoEnvio,
          erro: mensagemErro,
        },
      })
      $app.save(auditRec)
    } catch (errAudit) {
      console.log('Erro ao gravar auditoria do comunicado: ' + errAudit.message)
    }

    return e.json(200, {
      sucesso: resultadoEnvio === 'SUCESSO',
      resultado_envio: resultadoEnvio,
      mensagem_erro: mensagemErro,
      destinatarios_count: enviadosCount,
      comunicado_id: comunicadoRecord ? comunicadoRecord.id : null,
      codigo_parada: codigo_parada,
    })
  },
  $apis.requireAuth(),
)
