// Hook: Envio do Relatório Previsto x Realizado (Fase 2)
// Endpoint: POST /backend/v1/pcp/previsto-realizado/send-report
// - E-mail real via conta Resend conectada do builder em modo owner
//   ($connectors.executeAsOwner) — MESMA integração corporativa já estabelecida
//   no HUB (padrão mp_sidercentro_comms). Nenhum serviço paralelo de envio.
// - Alerta interno HUB via pcp_internal_notifications (mesmo padrão das
//   notificações de Retrabalho), com link, período, emissão e responsável.
// - Histórico por destinatário em pcp_report_sendings com status Enviado /
//   Entregue / Visualizado / Leitura confirmada / Falha de entrega.
// - Auditoria append-only em pcp_audit_logs SEM credenciais.

routerAdd('POST', '/backend/v1/pcp/previsto-realizado/send-report', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação requerida.' })
  }

  const body = e.requestInfo().body || {}

  const channel = ['email', 'hub', 'ambos'].includes(body.channel) ? body.channel : 'ambos'
  const recipients = Array.isArray(body.recipients) ? body.recipients : []
  const externalEmails = Array.isArray(body.externalEmails) ? body.externalEmails : []
  const subject = body.subject || 'PCP Robotizado | Relatório Previsto x Realizado'
  const message = body.message || ''
  const reportType = ['sintetico', 'analitico', 'completo'].includes(body.reportType)
    ? body.reportType
    : 'completo'
  const periodLabel = body.periodLabel || 'Período completo'
  const attachPdf = !!body.attachPdf
  const requestReadReceipt = !!body.requestReadReceipt
  const reportBodyHtml = typeof body.reportBodyHtml === 'string' ? body.reportBodyHtml : ''
  const filters = body.filters || {}
  const pageUrl = (body.pageUrl || '').toString()

  const totalRecipients = recipients.length + externalEmails.length
  if (totalRecipients === 0) {
    return e.json(400, { error: 'Nenhum destinatário informado para o envio do relatório.' })
  }

  let senderEmail = 'sistema@ciafal.com.br'
  let senderName = 'PCP Robotizado'
  let senderId = ''
  let senderRole = 'PCP_PROGRAMMER'
  if (authRecord) {
    senderId = authRecord.id
    senderEmail = authRecord.getString('email') || senderEmail
    senderName = authRecord.getString('name') || senderEmail
    senderRole = authRecord.getString('role') || senderRole
  }

  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const ymd = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const rnd = () => Math.random().toString(36).substring(2, 8).toUpperCase()
  const sendingCode = `PXR-REL-${ymd}-${rnd()}`

  const lineCode = (filters.lineCode || 'ALL').toString()
  const companyCode = (filters.companyCode || 'ALL').toString()

  // Montagem do corpo do e-mail (layout Ciafal)
  const reportBlock =
    attachPdf && reportBodyHtml
      ? `<div style="margin-top:16px; padding:14px; border:1px solid #e2e8f0; border-radius:6px; background:#ffffff;">${reportBodyHtml}</div>`
      : ''
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 860px; margin: 0 auto; color:#334155; line-height:1.5;">
      <div style="background-color:#004C97; padding:20px; border-radius:8px 8px 0 0; color:#ffffff;">
        <h2 style="margin:0; font-size:20px;">CIAFAL &bull; HUB Industrial &bull; PCP Robotizado</h2>
        <p style="margin:4px 0 0 0; font-size:13px; color:#cbd5e1;">Relatório Previsto x Realizado (${reportType}) &bull; Período: ${periodLabel}</p>
      </div>
      <div style="padding:24px; border:1px solid #e2e8f0; border-top:none; background:#ffffff;">
        <div style="margin-bottom:16px; padding:14px; background-color:#f8fafc; border-left:4px solid #004C97; border-radius:4px;">
          <p style="margin:0; font-size:14px; white-space:pre-wrap;">${message}</p>
        </div>
        ${reportBlock}
        <div style="font-size:11px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:16px; margin-top:24px;">
          <p style="margin:2px 0;"><strong>Responsável pela emissão:</strong> ${senderName} (${senderEmail})</p>
          <p style="margin:2px 0;"><strong>Data/hora da emissão:</strong> ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
          <p style="margin:2px 0;"><strong>Link do relatório no HUB:</strong> ${pageUrl || '(sessão ativa no HUB CIAFAL)'}</p>
          ${requestReadReceipt ? '<p style="margin:2px 0;">Este envio solicita confirmação de leitura pelo destinatário.</p>' : ''}
        </div>
      </div>
    </div>
  `

  const statuses = []

  const recordSending = (
    recipientName,
    recipientEmail,
    recipientUserId,
    isExternal,
    status,
    errorMessage,
  ) => {
    let saved = false
    try {
      if ($app.hasTable('pcp_report_sendings')) {
        const col = $app.findCollectionByNameOrId('pcp_report_sendings')
        const rec = new Record(col)
        rec.set('sending_code', sendingCode)
        rec.set('channel', channel === 'email' ? 'EMAIL' : channel === 'hub' ? 'HUB' : 'AMBOS')
        rec.set('report_type', reportType)
        rec.set('period_label', periodLabel)
        rec.set('subject', subject)
        rec.set('message', message)
        rec.set('attach_pdf', attachPdf)
        rec.set('include_ai', false)
        rec.set('request_read_receipt', requestReadReceipt)
        rec.set('recipient_name', recipientName || '')
        rec.set('recipient_email', recipientEmail)
        rec.set('recipient_user_id', recipientUserId || '')
        rec.set('is_external', isExternal)
        rec.set('status', status)
        rec.set('error_message', errorMessage || '')
        rec.set('sent_by_user_id', senderId || '')
        rec.set('sent_by_name', senderName)
        rec.set('sent_by_email', senderEmail)
        rec.set('line_code', lineCode)
        rec.set('filters', filters)
        $app.save(rec)
        saved = true
      }
    } catch (err) {
      console.warn('[PXR-REPORT] Erro ao gravar pcp_report_sendings:', err)
    }
    statuses.push({
      name: recipientName || recipientEmail,
      email: recipientEmail,
      status,
      detail: errorMessage || (saved ? null : 'Histórico indisponível'),
    })
  }

  // ----------------------------- E-mail (Resend) -----------------------------
  let emailOk = false
  let emailErrorMsg = ''
  if (channel === 'email' || channel === 'ambos') {
    const allEmails = []
      .concat(recipients.map((r) => (r && r.email ? String(r.email).trim() : '')))
      .concat(externalEmails.map((x) => String(x).trim()))
      .filter(Boolean)
    if (allEmails.length === 0) {
      emailErrorMsg = 'Nenhum endereço de e-mail válido informado.'
    } else {
      try {
        const emailsPayload = allEmails.map((to) => ({
          from: 'PCP Robotizado <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: emailHtml,
        }))
        const res = $connectors.executeAsOwner('resend', 'RESEND_SEND_BATCH_EMAILS', {
          emails: emailsPayload,
        })
        if (res && (res.successful || res.data)) {
          emailOk = true
        } else {
          emailErrorMsg = String((res && res.error) || 'Falha no conector Resend')
        }
      } catch (err) {
        emailErrorMsg = String(err)
      }
    }
  }

  // Status inicial por destinatário (e-mail lido NÃO é presumido pelo envio)
  const emailStatus = emailOk
    ? 'ENVIADO'
    : channel === 'email' || channel === 'ambos'
      ? 'FALHA_ENTREGA'
      : null
  if (emailStatus) {
    for (const r of recipients) {
      if (!r || !r.email) continue
      recordSending(
        r.name || '',
        String(r.email).trim(),
        r.userId || '',
        false,
        emailStatus,
        emailOk ? null : emailErrorMsg,
      )
    }
    for (const ext of externalEmails) {
      const email = String(ext).trim()
      if (!email) continue
      recordSending(email, email, '', true, emailStatus, emailOk ? null : emailErrorMsg)
    }
  }

  // ------------------------ Alerta interno do HUB ----------------------------
  let notificationsCreated = 0
  if (channel === 'hub' || channel === 'ambos') {
    try {
      const notifCol = $app.findCollectionByNameOrId('pcp_internal_notifications')
      const resumoExecutivo =
        recipients.length + externalEmails.length > 0
          ? `Relatório ${reportType} do Previsto x Realizado — período ${periodLabel}.`
          : ''
      const hubRecipients = recipients.map((r) => ({
        userId: (r && r.userId) || '',
        name: (r && r.name) || '',
        email: (r && r.email) || '',
      }))
      const hubTargets = hubRecipients
        .filter((r) => r.userId || r.email)
        .concat(externalEmails.map((x) => ({ userId: '', name: String(x), email: String(x) })))
      for (const target of hubTargets) {
        const notif = new Record(notifCol)
        notif.set('notification_code', `NOTIF-PXR-${ymd}-${rnd()}`)
        notif.set('target_audience', 'PCP')
        notif.set('type', 'REPORT')
        notif.set('title', subject)
        notif.set(
          'message',
          `${resumoExecutivo} ${message}\n\nLinha: ${lineCode}\nPeríodo analisado: ${periodLabel}\nEmitido em: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\nResponsável: ${senderName} (${senderEmail})${requestReadReceipt ? '\nLeitura requer confirmação.' : ''}`.trim(),
        )
        notif.set('line', lineCode)
        notif.set('action_url', pageUrl || '')
        notif.set('severity', 'INFO')
        notif.set('is_read', false)
        notif.set('timestamp', now.toISOString())
        notif.set('external_dispatch_channels', {
          report_sending_code: sendingCode,
          recipient_user_id: target.userId,
          recipient_email: target.email,
          request_read_receipt: requestReadReceipt,
          sender_email: senderEmail,
        })
        $app.save(notif)
        notificationsCreated++
      }
    } catch (err) {
      console.warn('[PXR-REPORT] Erro ao gravar pcp_internal_notifications:', err)
    }
  }

  // ----------------------------- Auditoria -----------------------------------
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const auditRecord = new Record(auditCol)
    auditRecord.set('event_id', `LOG-PCP-PXR-${ymd}-${rnd()}`)
    auditRecord.set('user_id', senderId || null)
    auditRecord.set('user_email', senderEmail)
    auditRecord.set('user_name', senderName)
    auditRecord.set('user_role', senderRole)
    auditRecord.set('login', senderEmail.split('@')[0])
    auditRecord.set('profile', senderRole)
    auditRecord.set('event_type', 'SCHEDULE_ACTION')
    auditRecord.set('action', 'PCP_PXR_SEND_REPORT')
    auditRecord.set('resource', 'PREVISTO_X_REALIZADO')
    auditRecord.set('resource_id', sendingCode)
    auditRecord.set('scope', lineCode)
    auditRecord.set('outcome', emailOk || channel === 'hub' ? 'SUCCESS' : 'FAILED')
    auditRecord.set('status', emailOk || channel === 'hub' ? 'Concluída' : 'Erro')
    auditRecord.set('source', 'PCP Robotizado')
    auditRecord.set('company', companyCode)
    auditRecord.set('line', lineCode)
    auditRecord.set('module', 'Execução')
    auditRecord.set('screen', 'EfficiencyAssertivenessSubpage')
    auditRecord.set('entity', 'PXR_REPORT_SENDING')
    auditRecord.set('reason', 'Envio do relatório Previsto x Realizado (e-mail/Alerta HUB)')
    auditRecord.set('details', {
      channel: channel,
      report_type: reportType,
      period_label: periodLabel,
      recipients_count: totalRecipients,
      external_count: externalEmails.length,
      attach_pdf: attachPdf,
      request_read_receipt: requestReadReceipt,
      email_success: emailOk,
      notifications_created: notificationsCreated,
      error_summary: emailErrorMsg || null,
      timestamp: now.toISOString(),
    })
    $app.save(auditRecord)
  } catch (auditErr) {
    console.warn('[PXR-REPORT] Erro ao gravar pcp_audit_logs:', auditErr)
  }

  const success = emailOk || (channel === 'hub' && notificationsCreated > 0)
  let userMessage
  if (success) {
    const partes = []
    if (emailOk)
      partes.push(
        `e-mail enviado para ${recipients.length + externalEmails.length} destinatário(s)`,
      )
    if (notificationsCreated > 0)
      partes.push(`${notificationsCreated} alerta(s) interno(s) criado(s)`)
    userMessage = `Relatório enviado: ${partes.join(' e ')}.`
  } else {
    userMessage =
      'Não foi possível concluir o envio. ' +
      (emailErrorMsg
        ? 'Falha no serviço de e-mail (detalhe técnico registrado no log do servidor, sem expor credenciais).'
        : 'Verifique os destinatários e o canal selecionado.')
  }

  return e.json(200, {
    success: success,
    message: userMessage,
    sending_code: sendingCode,
    email_sent: emailOk,
    notifications_created: notificationsCreated,
    statuses: statuses,
  })
})
