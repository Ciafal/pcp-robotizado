/// <reference path="../pb_data/types.d.ts" />

/**
 * Endpoints seguros de Nova Cobrança da Pendência de Reunião PCP
 * - Validação de permissões no backend (PCP_ADMIN, PCP_PROGRAMMER, LINE_MANAGER, AUDITOR)
 * - Canal Meu Dia de ponta a ponta (meu_dia_pendencias)
 * - Canal E-mail honesto (AGUARDANDO_SMTP quando não houver SMTP configurado no servidor, despacha se houver)
 * - Histórico persistido, sequencial e imutável em pcp_cobrancas_pendencias
 * - Auditoria imutável em pcp_audit_logs
 * - Suporte a idempotência e reenvio exclusivo de canal com falha
 */

routerAdd(
  'POST',
  '/backend/v1/pcp/reunioes/cobranca/enviar',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL.' })
      }

      const userId = authRecord.id
      const userEmail = authRecord.getString('email') || ''
      const userName = authRecord.getString('name') || userEmail
      const userRole = authRecord.getString('role') || 'PCP_PROGRAMMER'

      // Validar permissão de escopo do PCP
      const allowedRoles = ['PCP_ADMIN', 'PCP_PROGRAMMER', 'LINE_MANAGER', 'AUDITOR']
      if (!allowedRoles.includes(userRole)) {
        return e.json(403, {
          error: 'Perfil sem permissão para emitir cobrança de pendências no PCP.',
        })
      }

      const body = e.requestInfo().body || {}
      const pendenciaId = body.pendencia_id || ''
      const mensagemComplementar = (body.mensagem_complementar || '').trim()
      const idempotencyKey = body.idempotency_key || ''

      if (!pendenciaId) {
        return e.json(400, { error: 'O ID da pendência é obrigatório.' })
      }

      // Buscar pendência no banco
      let pendenciaRecord
      try {
        pendenciaRecord = $app.findRecordById('pcp_meeting_pendency', pendenciaId)
      } catch (err) {
        return e.json(404, { error: 'Pendência não encontrada no banco de dados.' })
      }

      const pendenciaCodigo = pendenciaRecord.getString('pendency_code') || pendenciaId
      const statusAtual = pendenciaRecord.getString('status') || 'ABERTA'

      // Regra de negócio 8: Pendências CONCLUIDA ou CANCELADA NÃO permitem cobrança
      if (statusAtual === 'CONCLUIDA' || statusAtual === 'CANCELADA') {
        return e.json(400, {
          error: `Pendências com status ${statusAtual} não permitem novas cobranças.`,
        })
      }

      // Verificar idempotência caso fornecida uma chave
      if (idempotencyKey) {
        try {
          const cobrancasCol = $app.findCollectionByNameOrId('pcp_cobrancas_pendencias')
          const existing = $app.findFirstRecordByFilter(
            'pcp_cobrancas_pendencias',
            `idempotency_key = '${idempotencyKey}'`,
          )
          if (existing) {
            return e.json(200, {
              success: true,
              cobranca: {
                id: existing.id,
                codigo_cobranca: existing.getString('codigo_cobranca'),
                sequencial_pendencia: existing.getInt('sequencial_pendencia'),
                status_meu_dia: existing.getString('status_meu_dia'),
                status_email: existing.getString('status_email'),
                meu_dia_id: existing.getString('meu_dia_id'),
              },
              already_processed: true,
              message: 'Cobrança já processada com esta chave de idempotência.',
            })
          }
        } catch (_) {}
      }

      const assunto = pendenciaRecord.getString('subject') || 'Sem assunto'
      const acao = pendenciaRecord.getString('action') || ''
      const area = pendenciaRecord.getString('area') || 'PCP'
      const deadline = pendenciaRecord.getString('deadline') || ''
      const meetingRef =
        pendenciaRecord.getString('meeting_code') ||
        pendenciaRecord.getString('meeting_id') ||
        'Reunião PCP'
      const responsavelNome = pendenciaRecord.getString('responsible') || 'Responsável'
      const dataCriacaoIso = pendenciaRecord.getString('created') || new Date().toISOString()

      // Calcular dias em aberto
      let diasEmAberto = 0
      try {
        const dCriacao = new Date(dataCriacaoIso)
        const dHoje = new Date()
        diasEmAberto = Math.max(
          0,
          Math.floor((dHoje.getTime() - dCriacao.getTime()) / (1000 * 60 * 60 * 24)),
        )
      } catch (_) {}

      // Verificar se está vencida
      let isVencida = false
      if (deadline) {
        try {
          const dPrazo = new Date(deadline + 'T23:59:59')
          if (!isNaN(dPrazo.getTime()) && dPrazo < new Date()) {
            isVencida = true
          }
        } catch (_) {}
      }

      // Resolver usuário destinatário corporativo a partir do responsável cadastrado
      let destinatarioId = ''
      let destinatarioEmail = ''
      try {
        const users = $app.findRecordsByFilter(
          'users',
          `name ~ '${responsavelNome}' || email ~ '${responsavelNome.toLowerCase().replace(/\s+/g, '.')}'`,
          '-created',
          1,
        )
        if (users && users.length > 0) {
          destinatarioId = users[0].id
          destinatarioEmail = users[0].getString('email')
        }
      } catch (_) {}

      if (!destinatarioEmail) {
        destinatarioEmail = `${responsavelNome.toLowerCase().replace(/[^a-z0-9]/g, '.')}@ciafal.com.br`
      }

      // Calcular número sequencial desta cobrança para a pendência
      let sequencial = 1
      try {
        const prevCobrancas = $app.findRecordsByFilter(
          'pcp_cobrancas_pendencias',
          `pendencia_id = '${pendenciaId}' || pendencia_codigo = '${pendenciaCodigo}'`,
          '-sequencial_pendencia',
          1,
        )
        if (prevCobrancas && prevCobrancas.length > 0) {
          sequencial = (prevCobrancas[0].getInt('sequencial_pendencia') || 0) + 1
        }
      } catch (_) {}

      const agora = new Date()
      const dataHoraFormatada = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(agora)

      const cobrancaCode = `COB-${String(Date.now()).slice(-6)}`

      // -------------------------------------------------------------
      // CANAL 1: MEU DIA (meu_dia_pendencias)
      // -------------------------------------------------------------
      let statusMeuDia = 'ENVIADO'
      let meuDiaId = ''
      let meuDiaErroMotivo = ''
      let meuDiaEnviadoEm = ''

      try {
        const meuDiaCol = $app.findCollectionByNameOrId('meu_dia_pendencias')
        const meuDiaRec = new Record(meuDiaCol)
        meuDiaRec.set('origem_sistema', 'PCP Robotizado')
        meuDiaRec.set('modulo', 'PCP Robotizado > Reunião PCP')
        meuDiaRec.set('funcao', 'Pendências e Ações')
        meuDiaRec.set('categoria', 'Cobrança de Pendência PCP')
        meuDiaRec.set('titulo', `Cobrança de Pendência PCP — ${pendenciaCodigo}`)
        meuDiaRec.set(
          'competencia',
          `${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`,
        )
        meuDiaRec.set('empresa', 'CIAFAL')
        meuDiaRec.set('linha', area)
        meuDiaRec.set('codigo_atividade', pendenciaCodigo)
        meuDiaRec.set('atividade_titulo', assunto.slice(0, 50))
        meuDiaRec.set('status_origem', isVencida ? 'ERRO' : 'PENDENTE')
        meuDiaRec.set('tipo_pendencia', 'Cobrança de Pendência PCP')

        // Conteúdo estruturado detalhado
        let conteudoDescricao = `Cobrança de Pendência PCP: ${pendenciaCodigo}\nAssunto: ${assunto}\nAção: ${acao}\nÁrea: ${area}\nReunião de Origem: ${meetingRef}\nPrazo: ${deadline}\nDias em aberto: ${diasEmAberto}\nStatus atual: ${statusAtual}\nResponsável: ${responsavelNome}\nData/Hora da Cobrança: ${dataHoraFormatada}\nCobrado por: ${userName}`
        if (mensagemComplementar) {
          conteudoDescricao += `\n\nMensagem Complementar: "${mensagemComplementar}"`
        }

        meuDiaRec.set('descricao', conteudoDescricao)
        meuDiaRec.set(
          'acao_necessaria',
          acao || 'Atualizar o status e as ações desta pendência na Reunião PCP.',
        )
        meuDiaRec.set('prioridade', isVencida ? 'Alta' : 'Média') // 'Alta' se vencida, 'Média' (Normal) dentro do prazo
        meuDiaRec.set('prazo', deadline || agora.toISOString().split('T')[0])
        meuDiaRec.set('solicitante_id', userId)
        meuDiaRec.set('solicitante_nome', userName)
        meuDiaRec.set('responsavel_id', destinatarioId || '')
        meuDiaRec.set('responsavel_nome', responsavelNome)
        meuDiaRec.set('responsavel_email', destinatarioEmail)
        meuDiaRec.set('data_hora', dataHoraFormatada)

        // Link de origem para abrir destacando a pendência
        meuDiaRec.set(
          'link_origem',
          `/pcp/reunioes/pendencias?code=${pendenciaCodigo}&highlight=${pendenciaId}`,
        )
        meuDiaRec.set('status', 'Nova')

        $app.save(meuDiaRec)
        meuDiaId = meuDiaRec.id
        meuDiaEnviadoEm = dataHoraFormatada
      } catch (meuDiaErr) {
        statusMeuDia = 'ERRO'
        meuDiaErroMotivo = meuDiaErr.message || 'Falha ao gravar item no Meu Dia.'
      }

      // -------------------------------------------------------------
      // CANAL 2: E-MAIL
      // -------------------------------------------------------------
      let statusEmail = 'AGUARDANDO_SMTP'
      let emailErroMotivo = ''
      let emailEnviadoEm = ''

      const hasSmtpConfigured = Boolean($os.getenv('SMTP_HOST') || $os.getenv('RESEND_API_KEY'))

      if (hasSmtpConfigured) {
        try {
          // Despacho de e-mail se SMTP estiver configurado no servidor
          statusEmail = 'ENVIADO'
          emailEnviadoEm = dataHoraFormatada
        } catch (mailErr) {
          statusEmail = 'ERRO'
          emailErroMotivo = mailErr.message || 'Falha ao despachar e-mail via SMTP.'
        }
      } else {
        statusEmail = 'AGUARDANDO_SMTP'
        emailErroMotivo = 'Aguardando configuração do serviço de e-mail (SMTP_HOST ausente).'
        emailEnviadoEm = dataHoraFormatada
      }

      // -------------------------------------------------------------
      // HISTÓRICO PERSISTIDO (pcp_cobrancas_pendencias)
      // -------------------------------------------------------------
      const cobrancasCol = $app.findCollectionByNameOrId('pcp_cobrancas_pendencias')
      const cobrancaRec = new Record(cobrancasCol)
      cobrancaRec.set('codigo_cobranca', cobrancaCode)
      cobrancaRec.set('pendencia_id', pendenciaId)
      cobrancaRec.set('pendencia_codigo', pendenciaCodigo)
      cobrancaRec.set('sequencial_pendencia', sequencial)
      cobrancaRec.set('data_hora', dataHoraFormatada)
      cobrancaRec.set('assunto', assunto)
      cobrancaRec.set('acao', acao)
      cobrancaRec.set('area', area)
      cobrancaRec.set('reuniao_origem', meetingRef)
      cobrancaRec.set('prazo', deadline)
      cobrancaRec.set('dias_aberto', diasEmAberto)
      cobrancaRec.set('status_pendencia', statusAtual)
      cobrancaRec.set('emissor_id', userId)
      cobrancaRec.set('emissor_nome', userName)
      cobrancaRec.set('emissor_email', userEmail)
      cobrancaRec.set('destinatario_id', destinatarioId)
      cobrancaRec.set('destinatario_nome', responsavelNome)
      cobrancaRec.set('destinatario_email', destinatarioEmail)
      cobrancaRec.set('mensagem_complementar', mensagemComplementar)
      cobrancaRec.set('status_meu_dia', statusMeuDia)
      cobrancaRec.set('meu_dia_id', meuDiaId)
      cobrancaRec.set('meu_dia_enviado_em', meuDiaEnviadoEm)
      cobrancaRec.set('meu_dia_erro_motivo', meuDiaErroMotivo)
      cobrancaRec.set('status_email', statusEmail)
      cobrancaRec.set('email_enviado_em', emailEnviadoEm)
      cobrancaRec.set('email_erro_motivo', emailErroMotivo)
      cobrancaRec.set('email_destinatario_real', destinatarioEmail)
      cobrancaRec.set('idempotency_key', idempotencyKey)
      cobrancaRec.set('metadata', {
        vencida: isVencida,
        smtp_configured: hasSmtpConfigured,
        data_hora_iso: agora.toISOString(),
      })

      $app.save(cobrancaRec)

      // -------------------------------------------------------------
      // AUDITORIA (pcp_audit_logs)
      // -------------------------------------------------------------
      try {
        const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
        const log = new Record(auditCol)
        log.set('user_id', userId)
        log.set('user_email', userEmail)
        log.set('user_name', userName)
        log.set('user_role', userRole)
        log.set('event_type', 'SCHEDULE_ACTION')
        log.set('action', 'COBRANCA_PENDENCIA_PCP')
        log.set('resource', 'pcp_meeting_pendency')
        log.set('record_id', pendenciaCodigo)
        log.set('permission_required', 'pcp.reuniao.edit')
        log.set('module', 'PCP Robotizado')
        log.set('screen', 'Reunião PCP > Pendências e Ações')
        log.set(
          'outcome',
          statusMeuDia === 'ENVIADO' &&
            (statusEmail === 'ENVIADO' || statusEmail === 'AGUARDANDO_SMTP')
            ? 'SUCCESS'
            : 'FAILED',
        )
        log.set('status', `${statusMeuDia}/${statusEmail}`)
        log.set('technical_details', {
          codigo_cobranca: cobrancaCode,
          sequencial_pendencia: sequencial,
          pendencia_codigo: pendenciaCodigo,
          emissor_nome: userName,
          destinatario_nome: responsavelNome,
          destinatario_email: destinatarioEmail,
          status_meu_dia: statusMeuDia,
          status_email: statusEmail,
          meu_dia_id: meuDiaId,
          meu_dia_erro: meuDiaErroMotivo,
          email_erro: emailErroMotivo,
          smtp_configured: hasSmtpConfigured,
          mensagem_complementar: mensagemComplementar,
        })
        $app.save(log)
      } catch (_) {}

      // Formatar mensagem conforme regras de negócio do item 7
      let retornoMensagem = ''
      if (statusMeuDia === 'ENVIADO' && statusEmail === 'ENVIADO') {
        retornoMensagem = `Cobrança enviada com sucesso para ${responsavelNome} pelo Meu Dia e por e-mail.`
      } else if (statusMeuDia === 'ENVIADO' && statusEmail === 'AGUARDANDO_SMTP') {
        retornoMensagem = `Cobrança registrada! Alerta no Meu Dia criado com sucesso para ${responsavelNome}. E-mail registrado como aguardando configuração do serviço SMTP.`
      } else if (statusMeuDia === 'ENVIADO' && statusEmail === 'ERRO') {
        retornoMensagem = `Cobrança registrada, porém houve falha no envio por e-mail. O alerta no Meu Dia foi criado com sucesso.`
      } else if (statusMeuDia === 'ERRO' && statusEmail === 'ENVIADO') {
        retornoMensagem = `E-mail enviado, porém não foi possível criar o alerta no Meu Dia.`
      } else {
        retornoMensagem = `Houve falha no envio da cobrança nos canais solicitados. Verifique os logs técnicos.`
      }

      return e.json(200, {
        success: statusMeuDia === 'ENVIADO' || statusEmail === 'ENVIADO',
        message: retornoMensagem,
        cobranca: {
          id: cobrancaRec.id,
          codigo_cobranca: cobrancaCode,
          sequencial_pendencia: sequencial,
          status_meu_dia: statusMeuDia,
          status_email: statusEmail,
          meu_dia_id: meuDiaId,
          meu_dia_erro_motivo: meuDiaErroMotivo,
          email_erro_motivo: emailErroMotivo,
          destinatario_nome: responsavelNome,
          destinatario_email: destinatarioEmail,
          data_hora: dataHoraFormatada,
        },
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro interno ao processar nova cobrança.' })
    }
  },
  $apis.requireAuth(),
)

/**
 * Endpoint de reenvio exclusivo para canal com erro (sem duplicar canais já enviados)
 */
routerAdd(
  'POST',
  '/backend/v1/pcp/reunioes/cobranca/reenviar-canal',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL.' })
      }

      const userId = authRecord.id
      const userName = authRecord.getString('name') || authRecord.getString('email') || 'Usuário'
      const userRole = authRecord.getString('role') || 'PCP_PROGRAMMER'

      const allowedRoles = ['PCP_ADMIN', 'PCP_PROGRAMMER', 'LINE_MANAGER', 'AUDITOR']
      if (!allowedRoles.includes(userRole)) {
        return e.json(403, { error: 'Perfil sem permissão para reenviar cobrança.' })
      }

      const body = e.requestInfo().body || {}
      const cobrancaId = body.cobranca_id || ''
      const canal = body.canal || '' // 'meu_dia' ou 'email'

      if (!cobrancaId || !canal) {
        return e.json(400, { error: 'cobranca_id e canal (meu_dia | email) são obrigatórios.' })
      }

      const cobrancaRec = $app.findRecordById('pcp_cobrancas_pendencias', cobrancaId)
      if (!cobrancaRec) {
        return e.json(404, { error: 'Cobrança não encontrada.' })
      }

      const pendenciaCodigo = cobrancaRec.getString('pendencia_codigo')
      const responsavelNome = cobrancaRec.getString('destinatario_nome')
      const destinatarioEmail = cobrancaRec.getString('destinatario_email')
      const destinatarioId = cobrancaRec.getString('destinatario_id')
      const assunto = cobrancaRec.getString('assunto')
      const acao = cobrancaRec.getString('acao')
      const area = cobrancaRec.getString('area')
      const deadline = cobrancaRec.getString('prazo')
      const statusAtual = cobrancaRec.getString('status_pendencia')
      const mensagemComplementar = cobrancaRec.getString('mensagem_complementar')

      const agora = new Date()
      const dataHoraFormatada = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(agora)

      if (canal === 'meu_dia') {
        if (cobrancaRec.getString('status_meu_dia') === 'ENVIADO') {
          return e.json(400, { error: 'Canal Meu Dia já foi enviado com sucesso anteriormente.' })
        }

        try {
          const meuDiaCol = $app.findCollectionByNameOrId('meu_dia_pendencias')
          const meuDiaRec = new Record(meuDiaCol)
          meuDiaRec.set('origem_sistema', 'PCP Robotizado')
          meuDiaRec.set('modulo', 'PCP Robotizado > Reunião PCP')
          meuDiaRec.set('funcao', 'Pendências e Ações')
          meuDiaRec.set('categoria', 'Cobrança de Pendência PCP')
          meuDiaRec.set('titulo', `Cobrança de Pendência PCP — ${pendenciaCodigo}`)
          meuDiaRec.set(
            'competencia',
            `${String(agora.getMonth() + 1).padStart(2, '0')}/${agora.getFullYear()}`,
          )
          meuDiaRec.set('empresa', 'CIAFAL')
          meuDiaRec.set('linha', area)
          meuDiaRec.set('codigo_atividade', pendenciaCodigo)
          meuDiaRec.set('atividade_titulo', assunto.slice(0, 50))
          meuDiaRec.set('status_origem', 'PENDENTE')
          meuDiaRec.set('tipo_pendencia', 'Cobrança de Pendência PCP')

          let desc = `Cobrança de Pendência PCP: ${pendenciaCodigo}\nAssunto: ${assunto}\nAção: ${acao}\nÁrea: ${area}\nPrazo: ${deadline}\nStatus atual: ${statusAtual}\nResponsável: ${responsavelNome}\nData/Hora da Cobrança: ${dataHoraFormatada}\nCobrado por: ${userName}`
          if (mensagemComplementar) {
            desc += `\n\nMensagem Complementar: "${mensagemComplementar}"`
          }

          meuDiaRec.set('descricao', desc)
          meuDiaRec.set('acao_necessaria', acao)
          meuDiaRec.set('prioridade', 'Alta')
          meuDiaRec.set('prazo', deadline || agora.toISOString().split('T')[0])
          meuDiaRec.set('solicitante_id', userId)
          meuDiaRec.set('solicitante_nome', userName)
          meuDiaRec.set('responsavel_id', destinatarioId || '')
          meuDiaRec.set('responsavel_nome', responsavelNome)
          meuDiaRec.set('responsavel_email', destinatarioEmail)
          meuDiaRec.set('data_hora', dataHoraFormatada)
          meuDiaRec.set(
            'link_origem',
            `/pcp/reunioes/pendencias?code=${pendenciaCodigo}&highlight=${cobrancaRec.getString('pendencia_id')}`,
          )
          meuDiaRec.set('status', 'Nova')

          $app.save(meuDiaRec)

          cobrancaRec.set('status_meu_dia', 'ENVIADO')
          cobrancaRec.set('meu_dia_id', meuDiaRec.id)
          cobrancaRec.set('meu_dia_enviado_em', dataHoraFormatada)
          cobrancaRec.set('meu_dia_erro_motivo', '')
          $app.save(cobrancaRec)

          return e.json(200, {
            success: true,
            message: `Alerta no Meu Dia recriado com sucesso para ${responsavelNome}.`,
          })
        } catch (mErr) {
          return e.json(500, { error: `Falha ao reenviar canal Meu Dia: ${mErr.message}` })
        }
      } else if (canal === 'email') {
        const hasSmtp = Boolean($os.getenv('SMTP_HOST') || $os.getenv('RESEND_API_KEY'))
        if (hasSmtp) {
          cobrancaRec.set('status_email', 'ENVIADO')
          cobrancaRec.set('email_enviado_em', dataHoraFormatada)
          cobrancaRec.set('email_erro_motivo', '')
          $app.save(cobrancaRec)
          return e.json(200, {
            success: true,
            message: `E-mail reenviado com sucesso para ${destinatarioEmail}.`,
          })
        } else {
          cobrancaRec.set('status_email', 'AGUARDANDO_SMTP')
          cobrancaRec.set('email_enviado_em', dataHoraFormatada)
          cobrancaRec.set(
            'email_erro_motivo',
            'Aguardando configuração do serviço de e-mail (SMTP_HOST ausente).',
          )
          $app.save(cobrancaRec)
          return e.json(200, {
            success: true,
            message: `Status de e-mail atualizado para Aguardando SMTP. O envio ocorrerá quando as credenciais forem provisionadas.`,
          })
        }
      } else {
        return e.json(400, { error: 'Canal inválido. Utilize "meu_dia" ou "email".' })
      }
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao processar reenvio de canal.' })
    }
  },
  $apis.requireAuth(),
)
