// Endpoint: POST /backend/v1/communications/generate-with-ai
// Transforma decisão técnica da reunião em comunicado objetivo
routerAdd(
  'POST',
  '/backend/v1/communications/generate-with-ai',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Não autenticado no HUB CIAFAL' })
      }

      const body = e.requestInfo().body || {}
      const itemTitle = body.title || 'Decisão Técnica de Reunião'
      const itemDescription = body.description || ''
      const lineCodes = body.line_codes || []
      const productCode = body.product_code || ''
      const materialCode = body.material_code || ''

      // Gerar comunicação corporativa estruturada
      const commTitle = 'COMUNICADO PCP: ' + itemTitle.toUpperCase()
      const summary =
        'Orientação operacional emitida pelo PCP referente a ' +
        (lineCodes.length > 0 ? 'linhas ' + lineCodes.join(', ') : 'malha fabril') +
        (productCode ? ' e item ' + productCode : '') +
        '.'

      const content =
        '## OBJETIVO E IMPACTO OPERACIONAL\n\n' +
        (itemDescription || 'Cumprimento de diretriz estabelecida em alinhamento técnico do PCP.') +
        '\n\n' +
        '### QUEM PRECISA SABER\n' +
        '- Operadores e Supervisores das Linhas: ' +
        (lineCodes.length > 0 ? lineCodes.join(', ') : 'Geral') +
        '\n' +
        '- Inspetores de Qualidade e Programação PCP\n\n' +
        '### AÇÃO ESPERADA\n' +
        '1. Conferir especificações técnicas antes do início do lote.\n' +
        '2. Registrar ciência formal caso exigido neste comunicado.\n' +
        '3. Reportar imediatamente qualquer anomalia de processo ao PCP.\n\n' +
        (productCode
          ? '### REFERÊNCIA DE PRODUTO / MATERIAL\n- Código SAP: ' +
            (productCode || materialCode) +
            '\n\n'
          : '') +
        '**Emitido pelo PCP Robotizado CIAFAL.**'

      return e.json(200, {
        suggested_title: commTitle,
        suggested_summary: summary,
        suggested_content: content,
        suggested_comm_type: 'OPERACIONAL',
        suggested_criticality: 'ATENCAO',
        target_lines: lineCodes,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao gerar comunicado com IA' })
    }
  },
  $apis.requireAuth(),
)
