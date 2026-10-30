// Hook: Envio real de e-mail (Resend - owner mode) e Notificações HUB para MP Sidercentro
// com auditoria estrita em pcp_audit_logs e persistência em pcp_internal_notifications.

routerAdd('POST', '/backend/v1/mp-sidercentro/send-email', (e) => {
  const authRecord = e.auth
  const body = e.requestInfo().body || {}

  const recipients = Array.isArray(body.recipients)
    ? body.recipients
    : body.recipients
      ? [body.recipients]
      : []
  const subject = body.subject || 'PCP | Matéria-prima Sidercentro | Análise de disponibilidade'
  const message = body.message || ''
  const selectedRecords = Array.isArray(body.selectedRecords) ? body.selectedRecords : []
  const filters = body.filters || {}

  if (recipients.length === 0) {
    return e.json(400, { error: 'Nenhum destinatário selecionado para o envio de e-mail.' })
  }

  // Identificação do remetente autenticado
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

  // Construção do HTML do e-mail com layout Ciafal
  const emailRowsHtml = selectedRecords
    .map((r) => {
      return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px 12px; font-weight: bold; color: #1e293b;">${r.steel_grade || r.code || '-'}${r.steel_class ? ' (' + r.steel_class + ')' : ''}</td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${r.total_stock_tons_fmt || r.total_stock_tons || '-'}</td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace; color: #004c97;">${r.projected_l2_useful_tons_fmt || r.projected_l2_useful_tons || '-'}</td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace; color: #be123c;">${r.projected_consumption_sdc_tons_fmt || r.projected_consumption_sdc_tons || '-'}</td>
        <td style="padding: 8px 12px; text-align: right; font-family: monospace; font-weight: bold;">${r.projected_balance_tons_fmt || r.projected_balance_tons || '-'}</td>
        <td style="padding: 8px 12px; text-align: center;">${r.statistical_coverage_days !== undefined ? r.statistical_coverage_days + 'd' : '-'}</td>
        <td style="padding: 8px 12px; text-align: center;">${r.auto_conclusion || r.rupture_risk_level || 'ADEQUADO'}</td>
      </tr>
    `
    })
    .join('')

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #334155; line-height: 1.5;">
      <div style="background-color: #004C97; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff;">
        <h2 style="margin: 0; font-size: 20px;">PCP Robotizado CIAFAL — Matéria-prima Sidercentro</h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #cbd5e1;">Análise de disponibilidade, projeções de estoque e impacto na produção L2</p>
      </div>

      <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
        <div style="margin-bottom: 20px; padding: 14px; background-color: #f8fafc; border-left: 4px solid #004C97; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; white-space: pre-wrap;">${message}</p>
        </div>

        <h3 style="font-size: 15px; color: #0f172a; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #004C97; padding-bottom: 6px;">
          Registros Selecionados para Comunicação (${selectedRecords.length} item(ns))
        </h3>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px;">
          <thead>
            <tr style="background-color: #f1f5f9; color: #475569; text-align: left;">
              <th style="padding: 8px 12px;">Aço / Grupo</th>
              <th style="padding: 8px 12px; text-align: right;">Estoque Total</th>
              <th style="padding: 8px 12px; text-align: right;">Prod. L2</th>
              <th style="padding: 8px 12px; text-align: right;">Consumo SDC</th>
              <th style="padding: 8px 12px; text-align: right;">Saldo Projetado</th>
              <th style="padding: 8px 12px; text-align: center;">Cobertura</th>
              <th style="padding: 8px 12px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${emailRowsHtml}
          </tbody>
        </table>

        <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
          <p style="margin: 2px 0;"><strong>Remetente:</strong> ${senderName} (${senderEmail})</p>
          <p style="margin: 2px 0;"><strong>Origem:</strong> HUB CIAFAL &bull; Módulo de Gestão de MP &bull; Tela Sidercentro</p>
          <p style="margin: 2px 0;"><strong>Data/Hora de Geração:</strong> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
        </div>
      </div>
    </div>
  `

  let sendResult = { successful: false, error: null }
  let sendErrorMsg = ''

  try {
    // Montagem da chamada batch Resend via executeAsOwner
    const emailsPayload = recipients.map((toEmail) => ({
      from: 'PCP Robotizado <onboarding@resend.dev>',
      to: [toEmail],
      subject: subject,
      html: htmlContent,
    }))

    const res = $connectors.executeAsOwner('resend', 'RESEND_SEND_BATCH_EMAILS', {
      emails: emailsPayload,
    })

    if (res && (res.successful || res.data)) {
      sendResult = { successful: true, error: null }
    } else {
      sendResult = {
        successful: false,
        error: res ? res.error : 'Resposta vazia do conector Resend',
      }
      sendErrorMsg = String(res ? res.error || 'Falha no conector' : 'Sem resposta')
    }
  } catch (err) {
    sendResult = { successful: false, error: err.toString() }
    sendErrorMsg = err.toString()
  }

  // Registro de Auditoria Append-Only em pcp_audit_logs
  // NUNCA registrar senhas/tokens/credentials nos logs
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const auditRecord = new Record(auditCol)

    const now = new Date()
    const yyyy = String(now.getFullYear())
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
    const autoEventId = `LOG-PCP-${yyyy}${mm}${dd}-${randomHex}`

    auditRecord.set('event_id', autoEventId)
    auditRecord.set('user_id', senderId || null)
    auditRecord.set('user_email', senderEmail)
    auditRecord.set('user_name', senderName)
    auditRecord.set('user_role', senderRole)
    auditRecord.set('login', senderEmail.split('@')[0])
    auditRecord.set('profile', senderRole)
    auditRecord.set('event_type', 'SCHEDULE_ACTION')
    auditRecord.set('action', 'MP_SDC_SEND_EMAIL')
    auditRecord.set('resource', 'MP_SIDERCENTRO')
    auditRecord.set('resource_id', 'SDC_COMMUNICATION')
    auditRecord.set('scope', 'SDC1')
    auditRecord.set('outcome', sendResult.successful ? 'SUCCESS' : 'FAILED')
    auditRecord.set('status', sendResult.successful ? 'Concluída' : 'Erro')
    auditRecord.set('source', 'PCP Robotizado')
    auditRecord.set('company', 'SIDERCENTRO_SDC')
    auditRecord.set('line', 'L2')
    auditRecord.set('center', 'SDC1')
    auditRecord.set('module', 'Gestão de MP')
    auditRecord.set('screen', 'MPSidercentroSubpage')
    auditRecord.set('entity', 'MP_SDC_EMAIL')
    auditRecord.set('reason', 'Comunicação oficial de disponibilidade de matéria-prima Sidercentro')

    // IDs dos registros selecionados
    const recordIds = selectedRecords
      .map((r) => r.steel_grade || r.id || r.material_code)
      .filter(Boolean)

    auditRecord.set('details', {
      channel: 'email',
      recipients: recipients,
      subject: subject,
      selected_record_ids: recordIds,
      filters_applied: filters,
      records_count: selectedRecords.length,
      send_success: sendResult.successful,
      error_summary: sendErrorMsg || null,
      timestamp: now.toISOString(),
    })

    $app.save(auditRecord)
  } catch (auditErr) {
    console.warn('Erro ao gravar pcp_audit_logs para envio de e-mail MP SDC:', auditErr)
  }

  if (!sendResult.successful) {
    return e.json(500, {
      error:
        'Não foi possível enviar o e-mail via Resend: ' +
        (sendErrorMsg || 'Verifique a configuração do serviço.'),
    })
  }

  return e.json(200, {
    success: true,
    message: `E-mail enviado com sucesso para ${recipients.length} destinatário(s).`,
    recipients_count: recipients.length,
  })
})

routerAdd('POST', '/backend/v1/mp-sidercentro/send-hub-notification', (e) => {
  const authRecord = e.auth
  const body = e.requestInfo().body || {}

  const recipients = Array.isArray(body.recipients)
    ? body.recipients
    : body.recipients
      ? [body.recipients]
      : []
  const title = body.title || 'PCP — Matéria-prima Sidercentro'
  const message = body.message || ''
  const selectedRecords = Array.isArray(body.selectedRecords) ? body.selectedRecords : []
  const filters = body.filters || {}

  if (recipients.length === 0) {
    return e.json(400, { error: 'Nenhum destinatário informado para a notificação HUB.' })
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
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
  const autoEventId = `LOG-PCP-${yyyy}${mm}${dd}-${randomHex}`

  const recordIds = selectedRecords
    .map((r) => r.steel_grade || r.id || r.material_code)
    .filter(Boolean)

  let createdCount = 0
  try {
    const notifCol = $app.findCollectionByNameOrId('pcp_internal_notifications')
    for (let i = 0; i < recipients.length; i++) {
      const rec = recipients[i]
      const notif = new Record(notifCol)
      const notifCode = `NOTIF-SDC-${yyyy}${mm}${dd}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

      notif.set('notification_code', notifCode)
      notif.set('target_audience', 'PCP')
      notif.set('type', 'RISCO_ATRASO')
      notif.set('title', title)
      notif.set('message', message)
      notif.set('line', 'L2')
      notif.set('action_url', '/pcp/gestao-materia-prima/sidercentro')
      notif.set('severity', 'WARNING')
      notif.set('is_read', false)
      notif.set('timestamp', now.toISOString())
      notif.set('external_dispatch_channels', {
        recipient_user: rec,
        sender_email: senderEmail,
        selected_record_ids: recordIds,
      })

      $app.save(notif)
      createdCount++
    }
  } catch (err) {
    console.warn('Erro ao salvar em pcp_internal_notifications:', err)
  }

  // Grava auditoria em pcp_audit_logs
  try {
    const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
    const auditRecord = new Record(auditCol)

    auditRecord.set('event_id', autoEventId)
    auditRecord.set('user_id', senderId || null)
    auditRecord.set('user_email', senderEmail)
    auditRecord.set('user_name', senderName)
    auditRecord.set('user_role', senderRole)
    auditRecord.set('login', senderEmail.split('@')[0])
    auditRecord.set('profile', senderRole)
    auditRecord.set('event_type', 'SCHEDULE_ACTION')
    auditRecord.set('action', 'MP_SDC_SEND_HUB_NOTIFICATION')
    auditRecord.set('resource', 'MP_SIDERCENTRO')
    auditRecord.set('resource_id', 'SDC_HUB_NOTIFICATION')
    auditRecord.set('scope', 'SDC1')
    auditRecord.set('outcome', 'SUCCESS')
    auditRecord.set('status', 'Concluída')
    auditRecord.set('source', 'PCP Robotizado')
    auditRecord.set('company', 'SIDERCENTRO_SDC')
    auditRecord.set('line', 'L2')
    auditRecord.set('center', 'SDC1')
    auditRecord.set('module', 'Gestão de MP')
    auditRecord.set('screen', 'MPSidercentroSubpage')
    auditRecord.set('entity', 'MP_SDC_NOTIF')
    auditRecord.set('reason', 'Disparo de notificação interna HUB para MP Sidercentro')

    auditRecord.set('details', {
      channel: 'hub',
      recipients: recipients,
      title: title,
      selected_record_ids: recordIds,
      filters_applied: filters,
      records_count: selectedRecords.length,
      created_notifications: createdCount,
      timestamp: now.toISOString(),
    })

    $app.save(auditRecord)
  } catch (auditErr) {
    console.warn('Erro ao gravar pcp_audit_logs para notificação HUB MP SDC:', auditErr)
  }

  return e.json(200, {
    success: true,
    message: `Notificação HUB enviada com sucesso para ${recipients.length} usuário(s).`,
    recipients_count: recipients.length,
  })
})
