/**
 * Hook para extração e análise estruturada de regras por IA
 * Rota: POST /backend/v1/sgq/analyze-document
 * Utiliza $ai.chat com modelo fast para categorizar regras do SGQ
 */

routerAdd('POST', '/backend/v1/sgq/analyze-document', (e) => {
  const body = e.requestInfo().body || {}
  const docCode = body.document_code || 'DOC-SGQ'
  const revision = body.revision || 'Rev.01'
  const docId = body.document_id || ''
  const content = body.content || ''
  const interferenceCategories = body.interference_categories || []

  if (!content || typeof content !== 'string') {
    return e.badRequestError('Conteúdo do documento não fornecido para análise.')
  }

  try {
    const promptSystem = `Você é o Agente Especialista em Qualidade e Engenharia de Processos do PCP Robotizado CIAFAL.
Sua função é analisar documentos técnicos oficiais do SGQ (Procedimentos Operacionais, Instruções de Trabalho, Especificações Técnicas) e extrair REGRAS ESTRUTURADAS industriais.

Para cada regra identificada no texto, retorne um objeto JSON com:
- rule_id: string única no formato "RULE-${docCode}-${revision}-00X"
- category: exatamente uma das 5 categorias: "SEQUENCING", "SETUP", "PRODUCTIVITY", "BOTTLENECK_MATRIX", "MP_UTILIZATION"
- rule_type: exatamente um dos tipos: "OBRIGATORIA", "PROIBICAO", "LIMITE", "PARAMETRO_TECNICO", "RECOMENDACAO", "INFORMATIVA"
- condition: condição de disparo/aplicação da regra
- action_or_restriction: o que deve ser feito, evitado ou respeitado
- value: número extraído (ex: 40 para 40 min, 22 para 22 t/h) ou nulo
- unit: unidade da grandeza ("min", "t/h", "°C", "%", "mm") ou nulo
- priority: número de 1 (crítico) a 5 (informativo)
- source_excerpt: o trecho EXATO original do texto que fundamenta a regra (obrigatório)
- page_or_section: seção ou página de onde foi extraída
- confidence_level: confiança da extração entre 0.0 e 1.0
- requires_human_review: booleano (true se houver ambiguidade)
- ai_interpretation: explicação concisa da lógica para o programador PCP
- product_from: código do produto de origem (se houver transição de sequência)
- product_to: código do produto de destino (se houver transição de sequência)
- setup_minutes: tempo de setup em minutos (se aplicável)
- cadence_th: cadência produtiva em t/h (se aplicável)

GUARDRAIL: Recomendações NUNCA são classificadas como OBRIGATORIA. Evidência sem trecho claro deve ter requires_human_review = true.
Responda APENAS com um objeto JSON válido contendo o array "rules".`

    const promptUser = `Documento: ${docCode} (${revision})
Categorias de interferência selecionadas: ${JSON.stringify(interferenceCategories)}
Conteúdo textual:
${content}`

    const chatRes = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: promptSystem },
        { role: 'user', content: promptUser },
      ],
    })

    const rawReply = chatRes.choices[0].message.content || ''
    let parsed
    try {
      // Remover delimitadores markdown caso presentes
      const cleaned = rawReply
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.log('Falha ao parsear JSON da IA:', rawReply)
      return e.json(500, { error: 'Resposta da IA não estava em JSON válido', raw: rawReply })
    }

    return e.json(200, {
      document_id: docId,
      document_code: docCode,
      revision: revision,
      mode: 'AI_AGENT',
      rules: parsed.rules || [],
    })
  } catch (err) {
    console.log('Erro ao invocar $ai.chat no hook SGQ:', err.message)
    return e.json(500, { error: err.message })
  }
})
