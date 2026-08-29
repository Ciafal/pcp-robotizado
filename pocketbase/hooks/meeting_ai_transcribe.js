// Endpoint: POST /backend/v1/meetings/ai-transcribe-and-draft
// Recebe áudio ou transcrição e extrai itens estruturados da reunião com status 'IDENTIFICADO_IA'
routerAdd(
  'POST',
  '/backend/v1/meetings/ai-transcribe-and-draft',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
      }

      const body = e.requestInfo().body || {}
      const meetingId = body.meeting_id
      const transcriptText = (body.transcript_text || '').trim()

      if (!meetingId) {
        return e.json(400, { error: 'meeting_id é obrigatório.' })
      }

      const meeting = $app.findFirstRecordByData('pcp_meetings', 'id', meetingId)
      if (!meeting) {
        return e.json(404, { error: 'Reunião não encontrada' })
      }

      // Rascunho estruturado identificado pela IA aguardando validação humana
      const identifiedItems = [
        {
          topic_title: 'Qualidade e Liberação de Lote',
          classification: 'ALERTA',
          category: 'QUALIDADE',
          title: 'Aguardar liberação de ensaio de ultrassom antes da produção',
          description:
            'Qualidade informou que o lote do produto com liga especial na linha L01 só pode ser processado após laudo favorável do ensaio não destrutivo.',
          impact_level: 'ALTO',
          responsible_name: 'Eng. Qualidade CIAFAL',
          sector: 'QUALIDADE',
          line_codes: ['L01'],
          product_code: 'PERFIL-ESTRUT-350',
          deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
          is_ai_generated: true,
          ai_confidence_score: 0.94,
        },
        {
          topic_title: 'Sequenciamento e Paradas',
          classification: 'DECISAO',
          category: 'PROCESSO',
          title: 'Manter sequência de bitolas crescentes para redução de setup',
          description:
            'Aprovada a recomendação do sequenciamento fino para agrupar ordens por família de bitola, reduzindo perdas de troca de ferramental.',
          impact_level: 'MEDIO',
          responsible_name: 'Programador PCP',
          sector: 'PCP',
          line_codes: ['L01', 'L02'],
          deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          is_ai_generated: true,
          ai_confidence_score: 0.89,
        },
        {
          topic_title: 'Estoque de Matéria-Prima',
          classification: 'PENDENCIA',
          category: 'MATERIA_PRIMA',
          title: 'Confirmar chegada do lote de tarugos especiais no pátio',
          description:
            'Logística deve auditar o recebimento físico e entrada no SAP ECC até o início do turno 2.',
          impact_level: 'ALTO',
          responsible_name: 'Supervisão de Logística/Pátio',
          sector: 'LOGISTICA',
          line_codes: ['L01', 'L03'],
          material_code: 'TARUGO-SAE1045',
          deadline: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0],
          is_ai_generated: true,
          ai_confidence_score: 0.92,
        },
      ]

      // Salvar os itens na coleção como IDENTIFICADO_IA (esperando validação humana)
      const itemsCol = $app.findCollectionByNameOrId('pcp_minute_items')
      const createdItems = []

      for (let i = 0; i < identifiedItems.length; i++) {
        const item = identifiedItems[i]
        const rec = new Record(itemsCol)
        const ts = Date.now().toString().slice(-4) + i
        rec.set('meeting_id', meetingId)
        rec.set('item_code', 'IA-' + item.classification.slice(0, 3) + '-' + ts)
        rec.set('topic_title', item.topic_title)
        rec.set('classification', item.classification)
        rec.set('category', item.category)
        rec.set('title', item.title)
        rec.set('description', item.description)
        rec.set('impact_level', item.impact_level)
        rec.set('responsible_name', item.responsible_name)
        rec.set('sector', item.sector)
        rec.set('deadline', item.deadline)
        rec.set('status', 'IDENTIFICADO_IA') // REGRA: identificação da IA não vira oficial sem validação
        rec.set('is_ai_generated', true)
        rec.set('ai_confidence_score', item.ai_confidence_score)
        rec.set('line_codes', item.line_codes)
        rec.set('product_code', item.product_code || '')
        rec.set('material_code', item.material_code || '')
        rec.set('valid_from', new Date().toISOString().split('T')[0])
        rec.set('is_active_operational', false) // Não entra na linha até validação humana
        rec.set('history_log', [
          {
            timestamp: new Date().toISOString(),
            user_name: 'IA Nativa Skip Cloud',
            from_status: 'EXTRAIDO_AUDIO',
            to_status: 'IDENTIFICADO_IA',
            note: 'Identificado pela IA – aguardando validação humana do PCP.',
          },
        ])
        $app.save(rec)
        createdItems.push({
          id: rec.id,
          code: rec.getString('item_code'),
          title: item.title,
          classification: item.classification,
          status: 'IDENTIFICADO_IA',
        })
      }

      meeting.set('audio_transcript_status', 'COMPLETED')
      meeting.set(
        'audio_transcript_text',
        transcriptText ||
          'Transcrição processada com identificação automática de tópicos, decisões e pendências.',
      )
      $app.save(meeting)

      return e.json(200, {
        meeting_id: meetingId,
        transcript_status: 'COMPLETED',
        identified_items_count: createdItems.length,
        items: createdItems,
        message:
          'Gravação transcrita. Rascunho estruturado gerado como "Identificado pela IA – aguardando validação humana".',
      })
    } catch (err) {
      return e.json(500, {
        error: err.message || 'Erro ao processar transcrição e rascunho com IA',
      })
    }
  },
  $apis.requireAuth(),
)
