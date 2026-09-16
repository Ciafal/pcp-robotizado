// @ts-check
/**
 * Hook de validação no backend do fluxo de Reunião PCP (QAS / HUB CIAFAL)
 * Regra 9: Bloqueio do agendamento sem envio prévio da prévia da ATA.
 * Mensagem exata exigida:
 * "É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento."
 */

onRecordUpdateRequest(
  (e) => {
    const collectionName = e.record.collection().name
    if (collectionName !== 'pcp_meeting' && collectionName !== 'pcp_meetings') {
      e.next()
      return
    }

    const orig = e.record.original()
    const oldStatus = orig ? orig.getString('status') : e.record.getString('status')
    const data = e.httpContext ? $apis.requestInfo(e.httpContext).data : null
    const newStatus = data && data.status !== undefined ? data.status : e.record.getString('status')

    if (newStatus === 'AGENDADA' && oldStatus !== 'AGENDADA') {
      const previaEnviada =
        e.record.getBool('previa_enviada') || (orig ? orig.getBool('previa_enviada') : false)
      const statusPrevia =
        e.record.getString('status_previa') || (orig ? orig.getString('status_previa') : '')

      if (!previaEnviada && statusPrevia !== 'ENVIADA' && oldStatus !== 'PREVIA_ENVIADA') {
        return e.json(400, {
          code: 'PREVIA_REQUIRED',
          message:
            'É obrigatório gerar, validar e enviar a prévia da ATA ao Grupo PCP antes de confirmar o agendamento.',
        })
      }
    }

    return e.next()
  },
  'pcp_meeting',
  'pcp_meetings',
)
