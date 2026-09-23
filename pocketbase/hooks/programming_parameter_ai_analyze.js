/**
 * Hook para análise de coerência semântica de Parâmetros de Programação via IA
 * Rota: POST /backend/v1/pcp/programming-parameters/ai-analyze
 *
 * Avalia se o Tipo de Parâmetro selecionado representa corretamente a regra
 * descrita em "Texto do Parâmetro" e sua consequência operacional em "Impacto / Consequência".
 * Também valida a coerência mútua entre Texto e Impacto.
 */

routerAdd('POST', '/backend/v1/pcp/programming-parameters/ai-analyze', (e) => {
  const body = e.requestInfo().body || {}

  const tipo = (body.tipo_parametro || '').trim()
  const texto = (body.texto_parametro || '').trim()
  const impacto = (body.impacto_consequencia || '').trim()

  // Validações obrigatórias no backend
  if (!tipo) {
    return e.badRequestError('Selecione o Tipo de Parâmetro antes de realizar a análise.')
  }
  if (!texto) {
    return e.badRequestError('Informe o Texto do Parâmetro antes de realizar a análise.')
  }
  if (!impacto) {
    return e.badRequestError('Informe o Impacto / Consequência antes de realizar a análise.')
  }

  const centro = (body.centro || '').trim()
  const linha = (body.linha || '').trim()
  const nomeParametro = (body.nome_parametro || '').trim()
  const descricao = (body.descricao || '').trim()
  const valorConfigurado = (body.valor_configurado || '').trim()
  const unidadeMedida = (body.unidade_medida || '').trim()

  const OFFICIAL_TYPES = [
    'Matéria-prima dimensional',
    'Matéria-prima aço',
    'Matéria-prima fornecedor',
    'Redução',
    'Produtividade',
    'Restrição técnica',
    'Restrição equipamento',
    'Qualidade',
    'Operador',
    'Mecânica',
    'Elétrica',
    'Automação',
    'PCP',
    'Comprimento',
    'Outros',
  ]

  try {
    const promptSystem = `Você é o Especialista Sênior em Engenharia de Processos e PCP Robotizado da CIAFAL.
Sua missão é responder à pergunta:
"A classificação escolhida representa corretamente a regra descrita neste parâmetro e sua consequência operacional?"

A lista oficial e EXCLUSIVA de Tipos de Parâmetro possui EXATAMENTE 15 opções:
1. Matéria-prima dimensional
2. Matéria-prima aço
3. Matéria-prima fornecedor
4. Redução
5. Produtividade
6. Restrição técnica
7. Restrição equipamento
8. Qualidade
9. Operador
10. Mecânica
11. Elétrica
12. Automação
13. PCP
14. Comprimento
15. Outros

REGRAS RÍGIDAS DE AVALIAÇÃO:
1. ANÁLISE SEMÂNTICA REAL (NÃO POR PALAVRA-CHAVE): Não classifique apenas porque uma palavra aparece. Compreenda o objeto central da regra, a condição, a causa e a consequência operacional.
2. SUGESTÃO LIMITADA À LISTA OFICIAL: Qualquer tipo sugerido DEVE ser EXATAMENTE um dos 15 nomes oficiais em português listados acima. Nunca invente outro tipo. Se nenhuma das opções específicas couber perfeitamente, sugira "Outros". Se o tipo atual já for o correto, "tipo_sugerido" deve ser null.
3. COERÊNCIA REGRA × IMPACTO: Verifique se o Texto do Parâmetro e o Impacto/Consequência fazem sentido juntos. Exemplo de incoerência: Texto "Não programar aço 1045" + Impacto "Aumentar produtividade em 10%" -> aponte que o impacto não parece corresponder à regra descrita. Coerência pode ser: "compatible", "incompatible" ou "parcial".
4. ADEQUAÇÃO DO TIPO ATUAL:
   - "compatible": O tipo atual representa muito bem o objeto e a consequência da regra. (Badge: "✓ Classificação coerente")
   - "partially_compatible": O tipo atual tem relação geral (ex: "Restrição técnica"), mas existe uma categoria muito mais específica e adequada na lista oficial (ex: "Matéria-prima fornecedor"). (Badge: "⚠ Classificação parcialmente coerente")
   - "incompatible": O tipo atual está conceitualmente errado ou descolado da regra descrita. (Badge: "⚠ O Tipo de Parâmetro selecionado não parece representar esta regra.")
5. ANÁLISE OBJETIVA: O campo "analise" deve ter no MÁXIMO 2 a 3 frases claras e diretas.
6. JUSTIFICATIVA: O campo "justificativa" explica por que a classificação atual é ou não ideal e, se houver tipo sugerido, por que ele é mais indicado.

EXEMPLOS DE CALIBRAÇÃO OFICIAIS:
- Tipo "Matéria-prima dimensional", texto "Não programar palanquilha com seção inferior a 130 mm", impacto "Bloquear a programação e informar o Programador PCP" -> compatível (classificação = "compatible", tipo_sugerido = null).
- Tipo "Matéria-prima aço", texto "Para este produto utilizar somente aço 1045", impacto "Bloquear programação com aço divergente" -> compatível (classificação = "compatible", tipo_sugerido = null).
- Tipo "Restrição técnica", texto "Somente utilizar matéria-prima fornecida pelo fornecedor X", impacto "Bloquear matéria-prima de fornecedor não homologado" -> parcialmente compatível (classificação = "partially_compatible", tipo_sugerido = "Matéria-prima fornecedor").
- Regras que afetam cadência (t/h) -> "Produtividade".
- Regras de comprimento máximo/mínimo da barra no equipamento -> "Restrição equipamento" ou "Comprimento".
- Paradas/regras de manutenção mecânica de laminadores -> "Mecânica".
- Restrições de acionamentos, motores, subestações, painel elétrico -> "Elétrica".
- Falhas de sinal, sensores L2, CLP, automação industrial -> "Automação".
- Alçadas decisórias de programação (ex: autorização do Supervisor PCP para lotes pequenos) -> "PCP".
- Habilidades, certificações, escalas humanas na máquina -> "Operador".

Formato OBRIGATÓRIO de saída (JSON PURO sem markdown):
{
  "classificacao": "compatible" | "partially_compatible" | "incompatible",
  "analise": "Texto objetivo em português (máx. 2 a 3 frases).",
  "tipo_sugerido": "Nome exato de um dos 15 tipos oficiais ou null se já for compatível",
  "justificativa": "Texto explicativo detalhando a razão técnica da avaliação.",
  "coerencia_regra_impacto": "compatible" | "incompatible" | "parcial"
}`

    const promptUser = `DADOS DO PARÂMETRO A SER AVALIADO:
- Centro de Produção: ${centro || 'Não especificado'}
- Linha de Produção: ${linha || 'Não especificado'}
- Nome do Parâmetro: ${nomeParametro || 'Não informado'}
- Descrição / Finalidade: ${descricao || 'Não informado'}
- Tipo de Parâmetro Selecionado Atual: "${tipo}"
- Valor Configurado: ${valorConfigurado || 'Não informado'}
- Unidade de Medida: ${unidadeMedida || 'Não informado'}
- Texto do Parâmetro (Regra Operacional): "${texto}"
- Impacto / Consequência Operacional: "${impacto}"

Retorne o JSON de análise estruturada:`

    const chatRes = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: promptSystem },
        { role: 'user', content: promptUser },
      ],
    })

    const rawReply =
      (chatRes.choices &&
        chatRes.choices[0] &&
        chatRes.choices[0].message &&
        chatRes.choices[0].message.content) ||
      ''

    let parsed
    try {
      const cleaned = rawReply
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.log('Falha ao interpretar JSON da IA:', rawReply)
      return e.json(500, {
        error:
          'Não foi possível concluir a análise com IA neste momento. Você pode tentar novamente ou continuar o cadastro manualmente.',
        raw: rawReply,
      })
    }

    // Normalização estrita da classificação
    let finalClassificacao = 'compatible'
    if (parsed.classificacao === 'incompatible') {
      finalClassificacao = 'incompatible'
    } else if (
      parsed.classificacao === 'partially_compatible' ||
      parsed.classificacao === 'partial'
    ) {
      finalClassificacao = 'partially_compatible'
    } else if (parsed.classificacao === 'compatible') {
      finalClassificacao = 'compatible'
    } else {
      // Fallback tolerante
      finalClassificacao = 'compatible'
    }

    // Validação estrita do tipo sugerido contra a lista oficial de 15 opções
    let finalTipoSugerido = null
    if (parsed.tipo_sugerido && typeof parsed.tipo_sugerido === 'string') {
      const trimmedSuggested = parsed.tipo_sugerido.trim()
      const match = OFFICIAL_TYPES.find((t) => t.toLowerCase() === trimmedSuggested.toLowerCase())
      if (match) {
        // Se o tipo sugerido for igual ao tipo atual, não sugere troca
        if (match.toLowerCase() !== tipo.toLowerCase()) {
          finalTipoSugerido = match
        }
      } else {
        // Regra item 8: Se sugerir algo fora da lista oficial, tratar como "Outros"
        if (tipo.toLowerCase() !== 'outros') {
          finalTipoSugerido = 'Outros'
        }
      }
    }

    // Validação da coerência regra x impacto
    let finalCoerencia = 'compatible'
    if (parsed.coerencia_regra_impacto === 'incompatible') {
      finalCoerencia = 'incompatible'
    } else if (
      parsed.coerencia_regra_impacto === 'parcial' ||
      parsed.coerencia_regra_impacto === 'partial'
    ) {
      finalCoerencia = 'parcial'
    }

    return e.json(200, {
      tipo_atual: tipo,
      classificacao: finalClassificacao,
      analise: parsed.analise || 'Análise de coerência concluída.',
      tipo_sugerido: finalTipoSugerido,
      justificativa: parsed.justificativa || '',
      coerencia_regra_impacto: finalCoerencia,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.log('Erro ao processar $ai.chat para parâmetro de programação:', err.message)
    return e.json(500, {
      error:
        'Não foi possível concluir a análise com IA neste momento. Você pode tentar novamente ou continuar o cadastro manualmente.',
      details: err.message,
    })
  }
})
