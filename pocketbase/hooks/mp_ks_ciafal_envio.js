// pocketbase/hooks/mp_ks_ciafal_envio.js
// Endpoints server-side do tópico "Envio de MP KS → Ciafal" (ZPPT047 / ZPPT045 / ZPP82 / ZPPT003)
// - Login expedidor ZPP_USUARIO (LIN_PROD = EXP / inativo) com mensagens exatas e auditoria
// - Salvar Envio (nº seleção SXXXXX/AA + versionamento VXX) atômico e idempotente
// - Transferência 311 → DP28 idempotente
// - Formação de carga / Romaneio + 313 (trânsito) + 315 (recebimento DP02) + DP07
// Regras de consistência no BACKEND (botão oculto no frontend não basta).
// IMPORTANTE (JSVM): callbacks do PocketBase rodam em um pool de VM separado —
// NENHUMA declaração top-level pode ser referenciada dentro dos callbacks.
// Todos os helpers/constantes são duplicados inline dentro de cada callback.
// Nunca loga nem expõe senha.

// ---------------------------------------------------------------------------
// 1) LOGIN OPERACIONAL EXPEDIDOR (estilo ZPP85/ZPP46A — ZPP_USUARIO)
// POST /backend/v1/pcp/mp-ks-ciafal/login  { centro, matricula, senha }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/login', (e) => {
  const MSG_LIN_PROD = 'Matrícula não corresponde ao tipo Expedidor.'
  const MSG_INATIVO = 'Esta matrícula está INATIVA.'
  const MSG_CRED = 'Matrícula ou senha inválida.'

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const data = (e.requestInfo() || {}).body || {}
  const centro = String(data.centro || '').trim()
  const matricula = String(data.matricula || '').trim()
  const senha = String(data.senha || '')

  if (!centro || !matricula || !senha) {
    console.warn('[ks-ciafal] login: campos ausentes')
    return e.json(400, { success: false, error: 'Informe centro, matrícula e senha.' })
  }

  let user = null
  try {
    user = $app.findFirstRecordByFilter('mp_ks_ciafal_usuarios', 'matricula = {:m}', {
      m: matricula,
    })
  } catch (_) {
    user = null
  }

  if (!user) {
    audit($app, {
      acao: 'login_invalido',
      entidade: 'mp_ks_ciafal_usuarios',
      matricula: matricula,
      detalhe: 'Matrícula inexistente. Centro: ' + centro,
    })
    console.warn('[ks-ciafal] login: matrícula inexistente')
    return e.json(401, { success: false, error: MSG_CRED })
  }

  const senhaSalva = String(user.getString('senha') || '')
  if (senha !== senhaSalva) {
    audit($app, {
      acao: 'login_invalido',
      entidade: 'mp_ks_ciafal_usuarios',
      entidade_id: user.id,
      matricula: matricula,
      detalhe: 'Senha incorreta. Centro: ' + centro,
    })
    console.warn('[ks-ciafal] login: senha incorreta')
    return e.json(401, { success: false, error: MSG_CRED })
  }

  const linProd = String(user.getString('lin_prod') || '')
    .trim()
    .toUpperCase()
  if (linProd !== 'EXP') {
    audit($app, {
      acao: 'login_invalido',
      entidade: 'mp_ks_ciafal_usuarios',
      entidade_id: user.id,
      matricula: matricula,
      detalhe: 'LIN_PROD=' + linProd + ' (esperado EXP). Centro: ' + centro,
    })
    return e.json(403, { success: false, error: MSG_LIN_PROD })
  }

  if (!user.getBool('ativo')) {
    audit($app, {
      acao: 'login_inativo',
      entidade: 'mp_ks_ciafal_usuarios',
      entidade_id: user.id,
      matricula: matricula,
      detalhe: 'Tentativa de login com matrícula inativa. Centro: ' + centro,
    })
    return e.json(403, { success: false, error: MSG_INATIVO })
  }

  audit($app, {
    acao: 'login_ok',
    entidade: 'mp_ks_ciafal_usuarios',
    entidade_id: user.id,
    matricula: matricula,
    detalhe: 'Login expedidor OK. Centro: ' + centro,
  })

  return e.json(200, {
    success: true,
    usuario: {
      id: user.id,
      matricula: user.getString('matricula'),
      nome: user.getString('nome'),
      centro: centro,
      lin_prod: linProd,
    },
  })
})

// ---------------------------------------------------------------------------
// 2) SALVAR ENVIO (ZPPT047 + itens) — nº SXXXXX/AA + versão VXX atômicos
// POST /backend/v1/pcp/mp-ks-ciafal/selecoes
// body: { selecao_id?, centro, origem, numero_selecao?, semana_spwoc, programacao_versao,
//         usuario: {matricula, nome}, motivo_id?, motivo_codigo?, justificativa?, pecas: [peca_id] }
// Nova seleção → V00; existente vigente → nova versão (revisão) e exige motivo+justificativa.
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/selecoes', (e) => {
  const DEPOSITO_ORIGEM = { KSC: 'DP20', KSF: 'DP25', CISAM: 'DC09' }

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const reqInfo = e.requestInfo() || {}
  const data = reqInfo.body || {}
  const auth = e.auth
  const centro = String(data.centro || '').trim()
  const origem = String(data.origem || '').trim()
  const pecaIds = Array.isArray(data.pecas) ? data.pecas.map(String) : []
  const usuario = data.usuario || {}
  const usuarioNome = String(usuario.nome || (auth && auth.getString('name')) || '—')
  const usuarioMat = String(usuario.matricula || (auth && auth.getString('id')) || '—')

  if (!centro || !origem || !DEPOSITO_ORIGEM[origem]) {
    console.warn('[ks-ciafal] save: centro/origem')
    return e.json(400, {
      success: false,
      error: 'Centro e origem de envio (KSC/KSF/Cisam) são obrigatórios.',
    })
  }
  if (pecaIds.length === 0) {
    console.warn('[ks-ciafal] save: sem peças')
    return e.json(400, {
      success: false,
      error: 'Selecione ao menos uma peça para salvar o envio.',
    })
  }

  const justificativa = String(data.justificativa || '').trim()
  const motivoId = String(data.motivo_id || '').trim()
  const selecaoIdEdicao = String(data.selecao_id || '').trim()
  const isEdicao = !!selecaoIdEdicao

  if (isEdicao && (!motivoId || !justificativa)) {
    console.warn('[ks-ciafal] save: motivo ausente na revisão')
    return e.json(400, {
      success: false,
      error:
        'Revisão de seleção exige código de motivo (ZPP82) e justificativa (máx. 60 caracteres).',
    })
  }
  if (justificativa.length > 60) {
    console.warn('[ks-ciafal] save: justificativa > 60')
    return e.json(400, {
      success: false,
      error: 'Justificativa deve ter no máximo 60 caracteres.',
    })
  }
  if (isEdicao && motivoId) {
    try {
      const motivo = $app.findRecordById('mp_ks_ciafal_motivos', motivoId)
      if (!motivo.getBool('ativo')) {
        console.warn('[ks-ciafal] save: motivo inativo')
        return e.json(400, {
          success: false,
          error: 'Motivo informado está inativo no cadastro ZPP82.',
        })
      }
    } catch (_) {
      console.warn('[ks-ciafal] save: motivo inexistente')
      return e.json(400, {
        success: false,
        error: 'Motivo não encontrado no cadastro ZPP82.',
      })
    }
  }

  let result = null
  let userError = null

  $app.runInTransaction(function (tx) {
    try {
      const colSelecoes = tx.findCollectionByNameOrId('mp_ks_ciafal_selecoes')
      const colItens = tx.findCollectionByNameOrId('mp_ks_ciafal_selecao_pecas')
      const now = nowBR()

      let numeroSelecao = ''
      let baseSelecaoId = ''
      let novaVersao = 0
      let createdNewBase = false

      if (isEdicao) {
        let base = null
        try {
          base = tx.findRecordById('mp_ks_ciafal_selecoes', selecaoIdEdicao)
        } catch (_) {
          throw { _user: 'Seleção original não encontrada para revisão.' }
        }
        if (base.getString('centro') !== centro) {
          throw { _user: 'Seleção pertence a outro centro.' }
        }
        numeroSelecao = base.getString('numero_selecao')
        baseSelecaoId = base.id
        // última versão existente desta seleção
        let versoes = []
        try {
          versoes = tx.findRecordsByFilter(
            'mp_ks_ciafal_selecoes',
            'centro = {:c} && numero_selecao = {:n}',
            '-created',
            500,
            0,
            { c: centro, n: numeroSelecao },
          )
        } catch (_) {
          versoes = []
        }
        novaVersao = versoes.length
        for (let i = 0; i < versoes.length; i++) {
          if (versoes[i].getBool('vigente')) {
            tx.delete(versoes[i])
          }
        }
      } else {
        // Geração atômica do nº SXXXXX/AA — sequencial por Centro + Ano (AA), sem duplicidade
        const ano2 = String(new Date().getFullYear()).slice(-2)
        const chave = 'SEL-' + centro + '-' + ano2
        let seqRec = null
        try {
          seqRec = tx.findFirstRecordByData('mp_ks_ciafal_sequencias', 'chave', chave)
        } catch (_) {
          seqRec = null
        }
        let prox = 1
        if (seqRec) {
          prox = (seqRec.getInt('current_number') || 0) + 1
          seqRec.set('current_number', prox)
          tx.save(seqRec)
        } else {
          const colSeq = tx.findCollectionByNameOrId('mp_ks_ciafal_sequencias')
          seqRec = new Record(colSeq)
          seqRec.set('chave', chave)
          seqRec.set('current_number', 1)
          tx.save(seqRec)
          prox = 1
        }
        numeroSelecao = 'S' + ('00000' + prox).slice(-5) + '/' + ano2
        novaVersao = 0
        createdNewBase = true
      }

      const versao = 'V' + ('00' + novaVersao).slice(-2)
      const vigente = novaVersao === 0 // apenas V00 é vigente (espelha ZPPPMP *00)

      // Consistência: peça não pode estar em outra seleção VIGENTE
      for (const pid of pecaIds) {
        let peca = null
        try {
          peca = tx.findRecordById('mp_ks_ciafal_pecas', pid)
        } catch (_) {
          throw { _user: 'Peça ' + pid + ' não encontrada.' }
        }
        if (peca.getString('centro') !== centro) {
          throw { _user: 'Peça pertence a outro centro.' }
        }
        const statusPeca = peca.getString('status')
        if (statusPeca !== 'Liberado' && statusPeca !== 'Selecionado') {
          throw {
            _user:
              'Peça ' +
              peca.getString('numero_bloco') +
              ' não está disponível (status ' +
              statusPeca +
              ').',
          }
        }
        const selAtual = String(peca.getString('selecao_id') || '')
        if (selAtual && selAtual !== baseSelecaoId) {
          // já vinculada a outra seleção → bloqueia (não pode estar em 2 seleções vigentes)
          throw {
            _user:
              'Peça ' +
              peca.getString('numero_bloco') +
              ' já pertence à seleção ' +
              peca.getString('selecao_id') +
              '.',
          }
        }
      }

      // Cria o registro da seleção (versão)
      const recSelecao = new Record(colSelecoes)
      recSelecao.set('centro', centro)
      recSelecao.set('origem', origem)
      recSelecao.set('numero_selecao', numeroSelecao)
      recSelecao.set('versao', versao)
      recSelecao.set('vigente', vigente)
      recSelecao.set('semana_spwoc', String(data.semana_spwoc || ''))
      recSelecao.set('programacao_versao', String(data.programacao_versao || ''))
      recSelecao.set('elaborado_por_nome', usuarioNome)
      recSelecao.set(
        'criado_matricula',
        isEdicao ? String(data.criado_matricula || usuarioMat) : usuarioMat,
      )
      recSelecao.set('criado_por', isEdicao ? String(data.criado_por || usuarioNome) : usuarioNome)
      recSelecao.set('criado_em', isEdicao ? String(data.criado_em || now) : now)
      recSelecao.set('modificado_matricula', usuarioMat)
      recSelecao.set('modificado_por', usuarioNome)
      recSelecao.set('modificado_em', now)
      recSelecao.set('motivo_id', isEdicao ? motivoId : '')
      recSelecao.set('motivo_codigo', isEdicao ? String(data.motivo_codigo || '') : '')
      recSelecao.set('justificativa', isEdicao ? justificativa : '')
      recSelecao.set('status', 'Aberta')
      recSelecao.set('qtd_pecas', pecaIds.length)
      recSelecao.set('documento_311', '')
      recSelecao.set('peso_total_kg', 0)
      tx.save(recSelecao)

      // Itens + atualização das peças
      let pesoTotal = 0
      for (const pid of pecaIds) {
        const peca = tx.findRecordById('mp_ks_ciafal_pecas', pid)
        pesoTotal += peca.getFloat('peso_kg') || 0

        const item = new Record(colItens)
        item.set('selecao_id', recSelecao.id)
        item.set('peca_id', pid)
        item.set('numero_selecao', numeroSelecao)
        item.set('versao', versao)
        item.set('matnr', peca.getString('matnr'))
        item.set('maktx', peca.getString('maktx'))
        item.set('aplicacao', peca.getString('aplicacao'))
        item.set('peso_kg', peca.getFloat('peso_kg') || 0)
        item.set('corrida', peca.getString('corrida'))
        item.set('letra', peca.getString('letra'))
        item.set('numero_bloco', peca.getString('numero_bloco'))
        item.set('data_envio', peca.getString('data_envio'))
        item.set('deposito', peca.getString('deposito'))
        item.set('situacao', 'Atendido')
        tx.save(item)

        peca.set('status', 'Selecionado')
        peca.set('selecao_id', recSelecao.id)
        if (!peca.getString('deposito_atual')) {
          peca.set('deposito_atual', peca.getString('deposito'))
        }
        tx.save(peca)
      }

      recSelecao.set('peso_total_kg', pesoTotal)
      tx.save(recSelecao)

      audit(tx, {
        acao: isEdicao ? 'selecao_revisao' : 'selecao_criada',
        entidade: 'mp_ks_ciafal_selecoes',
        entidade_id: recSelecao.id,
        matricula: usuarioMat,
        nome: usuarioNome,
        antes: isEdicao ? { versao_anterior: data.versao_anterior || 'V00' } : null,
        depois: {
          numero_selecao: numeroSelecao,
          versao: versao,
          pecas: pecaIds.length,
          peso_kg: pesoTotal,
        },
        detalhe:
          (motivoId ? 'Motivo: ' + String(data.motivo_codigo || motivoId) + '. ' : '') +
          (justificativa || ''),
      })

      result = {
        selecao_id: recSelecao.id,
        numero_selecao: numeroSelecao,
        versao: versao,
        vigente: vigente,
        qtd_pecas: pecaIds.length,
        peso_total_kg: pesoTotal,
        mensagem: 'Seleção de envio ' + numeroSelecao + ' – ' + versao + ' salva com sucesso.',
      }
    } catch (err) {
      if (err && err._user) {
        userError = err._user
      } else {
        console.error('[ks-ciafal] salvar seleção:', err && err.message)
        userError = 'Não foi possível salvar a seleção de envio. Os dados permanecem como estavam.'
      }
    }
  })

  if (userError) {
    console.warn('[ks-ciafal] save: transação revertida')
    return e.json(400, { success: false, error: userError })
  }
  return e.json(200, { success: true, selecao: result })
})

// ---------------------------------------------------------------------------
// 3) TRANSFERÊNCIA 311 → DP28 (idempotente por seleção)
// POST /backend/v1/pcp/mp-ks-ciafal/transferencia-311  { selecao_id, usuario:{matricula,nome} }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/transferencia-311', (e) => {
  const DEPOSITO_ORIGEM = { KSC: 'DP20', KSF: 'DP25', CISAM: 'DC09' }
  const DP28 = 'DP28'

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const data = (e.requestInfo() || {}).body || {}
  const auth = e.auth
  const selecaoId = String(data.selecao_id || '').trim()
  const usuarioNome = String((data.usuario || {}).nome || (auth && auth.getString('name')) || '—')
  const usuarioMat = String((data.usuario || {}).matricula || (auth && auth.getString('id')) || '—')
  if (!selecaoId) {
    console.warn('[ks-ciafal] 311: sem selecao_id')
    return e.json(400, {
      success: false,
      error: 'Informe a seleção para executar a transferência 311.',
    })
  }

  let userError = null
  let resultado = null

  $app.runInTransaction(function (tx) {
    try {
      let selecao = null
      try {
        selecao = tx.findRecordById('mp_ks_ciafal_selecoes', selecaoId)
      } catch (_) {
        throw { _user: 'Seleção não encontrada.' }
      }
      if (selecao.getString('status') === 'Transferida 311') {
        // idempotente: novo clique NÃO gera 2º documento
        resultado = {
          ja_transferida: true,
          documento_311: selecao.getString('documento_311'),
          mensagem:
            'Transferência 311 já executada para esta seleção (documento ' +
            selecao.getString('documento_311') +
            ').',
        }
        return
      }
      if (selecao.getString('status') === 'Cancelada') {
        throw { _user: 'Seleção cancelada — não é possível transferir.' }
      }
      if (!selecao.getBool('vigente')) {
        throw { _user: 'Somente a versão vigente (V00) pode ser transferida.' }
      }

      const centro = selecao.getString('centro')
      const origem = selecao.getString('origem')
      const depOrigem = DEPOSITO_ORIGEM[origem] || 'DP20'

      let itens = []
      try {
        itens = tx.findRecordsByFilter(
          'mp_ks_ciafal_selecao_pecas',
          'selecao_id = {:s}',
          'created',
          5000,
          0,
          { s: selecaoId },
        )
      } catch (_) {
        itens = []
      }
      if (!itens.length) {
        throw { _user: 'Seleção sem peças para transferir.' }
      }

      const doc311 =
        '311-LOC-' +
        selecao.getString('numero_selecao').replace(/[^A-Z0-9]/gi, '') +
        '-' +
        Date.now()
      const colMov = tx.findCollectionByNameOrId('mp_ks_ciafal_movimentos')
      const colPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_pecas')

      for (const item of itens) {
        const pecaId = item.getString('peca_id')
        let peca = null
        try {
          peca = tx.findRecordById('mp_ks_ciafal_pecas', pecaId)
        } catch (_) {
          continue
        }
        // já em DP28 não sofre novo 311
        if (peca.getString('deposito_atual') === DP28) {
          continue
        }
        const idem = '311:' + selecaoId + ':' + pecaId
        let existente = null
        try {
          existente = tx.findFirstRecordByData('mp_ks_ciafal_movimentos', 'idempotency_key', idem)
        } catch (_) {
          existente = null
        }
        if (existente) continue

        const mov = new Record(colMov)
        mov.set('tipo_movimento', '311')
        mov.set('documento_sap', doc311)
        mov.set('idempotency_key', idem)
        mov.set('peca_id', pecaId)
        mov.set('selecao_id', selecaoId)
        mov.set('centro', centro)
        mov.set('deposito_origem', depOrigem)
        mov.set('deposito_destino', DP28)
        mov.set('status', 'OK')
        mov.set('criado_por', usuarioNome)
        mov.set('criado_em', nowBR())
        mov.set('payload_json', JSON.stringify({ simulado: true, origem: origem }))
        tx.save(mov)

        peca.set('deposito_atual', DP28)
        tx.save(peca)
      }

      selecao.set('status', 'Transferida 311')
      selecao.set('documento_311', doc311)
      tx.save(selecao)

      audit(tx, {
        acao: 'transferencia_311',
        entidade: 'mp_ks_ciafal_selecoes',
        entidade_id: selecaoId,
        matricula: usuarioMat,
        nome: usuarioNome,
        depois: { documento_311: doc311, pecas: itens.length },
        detalhe:
          'Transferência 311 ' + depOrigem + ' → ' + DP28 + ' (documento simulado/exercício local)',
      })

      resultado = {
        ja_transferida: false,
        documento_311: doc311,
        mensagem:
          'Transferência 311 (' +
          depOrigem +
          ' → ' +
          DP28 +
          ') executada. Documento ' +
          doc311 +
          '.',
      }
    } catch (err) {
      if (err && err._user) userError = err._user
      else {
        console.error('[ks-ciafal] 311:', err && err.message)
        userError = 'Falha ao executar a transferência 311.'
      }
    }
  })

  if (userError) {
    console.warn('[ks-ciafal] 311: transação revertida')
    return e.json(400, { success: false, error: userError })
  }
  return e.json(200, { success: true, resultado: resultado })
})

// ---------------------------------------------------------------------------
// 4) FORMAÇÃO DE CARGA / ROMANEIO (só peça em DP28 com 311 concluído)
// POST /backend/v1/pcp/mp-ks-ciafal/romaneios  { selecao_id, peca_ids, destino_tipo: 'L2'|'L1', usuario }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/romaneios', (e) => {
  const DP28 = 'DP28'
  const DP02 = 'DP02'
  const DP07 = 'DP07'

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const data = (e.requestInfo() || {}).body || {}
  const auth = e.auth
  const selecaoId = String(data.selecao_id || '').trim()
  const pecaIds = Array.isArray(data.peca_ids) ? data.peca_ids.map(String) : []
  const destinoTipo = String(data.destino_tipo || 'L2')
    .trim()
    .toUpperCase()
  const usuarioNome = String((data.usuario || {}).nome || (auth && auth.getString('name')) || '—')
  const usuarioMat = String((data.usuario || {}).matricula || (auth && auth.getString('id')) || '—')

  if (!selecaoId || !pecaIds.length) {
    console.warn('[ks-ciafal] romaneio: payload inválido')
    return e.json(400, {
      success: false,
      error: 'Informe a seleção e as peças para formar a carga.',
    })
  }
  if (destinoTipo !== 'L2' && destinoTipo !== 'L1') {
    console.warn('[ks-ciafal] romaneio: destino inválido')
    return e.json(400, {
      success: false,
      error: 'Destino deve ser L2 (DP02) ou L1 (DP07).',
    })
  }

  let userError = null
  let resultado = null

  $app.runInTransaction(function (tx) {
    try {
      let selecao = null
      try {
        selecao = tx.findRecordById('mp_ks_ciafal_selecoes', selecaoId)
      } catch (_) {
        throw { _user: 'Seleção não encontrada.' }
      }
      if (selecao.getString('status') !== 'Transferida 311') {
        throw { _user: 'Executar a transferência 311 para DP28 antes de formar a carga.' }
      }

      const centro = selecao.getString('centro')
      const origem = selecao.getString('origem')
      const depDestino = destinoTipo === 'L2' ? DP02 : DP07
      const colRom = tx.findCollectionByNameOrId('mp_ks_ciafal_romaneios')
      const colRomPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_romaneio_pecas')
      const colPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_pecas')
      const colMov = tx.findCollectionByNameOrId('mp_ks_ciafal_movimentos')

      // nº romaneio único e atômico
      const ano2 = String(new Date().getFullYear()).slice(-2)
      const chave = 'ROM-' + centro + '-' + ano2
      let seqRec = null
      try {
        seqRec = tx.findFirstRecordByData('mp_ks_ciafal_sequencias', 'chave', chave)
      } catch (_) {
        seqRec = null
      }
      let prox = 1
      if (seqRec) {
        prox = (seqRec.getInt('current_number') || 0) + 1
        seqRec.set('current_number', prox)
        tx.save(seqRec)
      } else {
        const colSeq = tx.findCollectionByNameOrId('mp_ks_ciafal_sequencias')
        seqRec = new Record(colSeq)
        seqRec.set('chave', chave)
        seqRec.set('current_number', 1)
        tx.save(seqRec)
      }
      const numeroRomaneio = 'R' + ('00000' + prox).slice(-5) + '/' + ano2

      let pesoTotal = 0
      const rom = new Record(colRom)
      rom.set('numero_romaneio', numeroRomaneio)
      rom.set('selecao_id', selecaoId)
      rom.set('numero_selecao', selecao.getString('numero_selecao'))
      rom.set('centro', centro)
      rom.set('origem', origem)
      rom.set('deposito_destino', depDestino)
      rom.set('destino_tipo', destinoTipo)
      rom.set('status', 'Em formacao')
      rom.set('criado_por', usuarioNome)
      rom.set('criado_em', nowBR())
      rom.set('qtd_pecas', 0)
      rom.set('peso_total_kg', 0)
      rom.set('documento_313', '')
      rom.set('documento_315', '')
      rom.set('divergencias', '')
      tx.save(rom)

      for (const pid of pecaIds) {
        let peca = null
        try {
          peca = tx.findRecordById('mp_ks_ciafal_pecas', pid)
        } catch (_) {
          throw { _user: 'Peça não encontrada na formação de carga.' }
        }
        // Consistência: sem seleção não entra em carga; não selecionada → bloqueia
        const selPeca = String(peca.getString('selecao_id') || '')
        if (!selPeca) {
          throw {
            _user:
              'Peça ' + peca.getString('numero_bloco') + ' não está em nenhuma seleção de envio.',
          }
        }
        if (selPeca !== selecaoId) {
          throw {
            _user: 'Peça ' + peca.getString('numero_bloco') + ' pertence a outra seleção de envio.',
          }
        }
        if (peca.getString('status') !== 'Selecionado') {
          throw {
            _user: 'Peça ' + peca.getString('numero_bloco') + ' não está no status Selecionado.',
          }
        }
        // já em trânsito não sofre novo 313
        if (String(peca.getString('romaneio_id') || '')) {
          throw {
            _user: 'Peça ' + peca.getString('numero_bloco') + ' já está em romaneio em andamento.',
          }
        }
        // só peça movimentada para DP28
        if (peca.getString('deposito_atual') !== DP28) {
          throw {
            _user:
              'Peça ' +
              peca.getString('numero_bloco') +
              ' ainda não foi transferida para DP28 (311).',
          }
        }

        const item = new Record(colRomPecas)
        item.set('romaneio_id', rom.id)
        item.set('peca_id', pid)
        item.set('matnr', peca.getString('matnr'))
        item.set('maktx', peca.getString('maktx'))
        item.set('peso_kg', peca.getFloat('peso_kg') || 0)
        item.set('corrida', peca.getString('corrida'))
        item.set('numero_bloco', peca.getString('numero_bloco'))
        item.set('situacao', 'Em transito')
        tx.save(item)

        pesoTotal += peca.getFloat('peso_kg') || 0
      }

      rom.set('qtd_pecas', pecaIds.length)
      rom.set('peso_total_kg', pesoTotal)
      tx.save(rom)

      audit(tx, {
        acao: 'romaneio_criado',
        entidade: 'mp_ks_ciafal_romaneios',
        entidade_id: rom.id,
        matricula: usuarioMat,
        nome: usuarioNome,
        depois: { numero_romaneio: numeroRomaneio, pecas: pecaIds.length, peso_kg: pesoTotal },
        detalhe: 'Formação de carga iniciada (Em formação).',
      })

      resultado = {
        romaneio_id: rom.id,
        numero_romaneio: numeroRomaneio,
        qtd_pecas: pecaIds.length,
        peso_total_kg: pesoTotal,
      }
    } catch (err) {
      if (err && err._user) userError = err._user
      else {
        console.error('[ks-ciafal] romaneio:', err && err.message)
        userError = 'Falha ao formar a carga / gerar romaneio.'
      }
    }
  })

  if (userError) {
    console.warn('[ks-ciafal] romaneio: transação revertida')
    return e.json(400, { success: false, error: userError })
  }
  return e.json(200, { success: true, romaneio: resultado })
})

// ---------------------------------------------------------------------------
// 5) EXPEDIÇÃO 313 (DP28 → DP02 p/ L2 | DP07 p/ L1) — material em trânsito, idempotente
// POST /backend/v1/pcp/mp-ks-ciafal/romaneios/expedir  { usuario }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/romaneios/expedir', (e) => {
  const DP28 = 'DP28'
  const DP07 = 'DP07'

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const data = (e.requestInfo() || {}).body || {}
  const romaneioId = String(data.romaneio_id || '').trim()
  const auth = e.auth
  const usuarioNome = String((data.usuario || {}).nome || (auth && auth.getString('name')) || '—')
  const usuarioMat = String((data.usuario || {}).matricula || (auth && auth.getString('id')) || '—')
  if (!romaneioId) {
    console.warn('[ks-ciafal] 313: sem id')
    return e.json(400, { success: false, error: 'Romaneio não informado.' })
  }

  let userError = null
  let resultado = null

  $app.runInTransaction(function (tx) {
    try {
      let rom = null
      try {
        rom = tx.findRecordById('mp_ks_ciafal_romaneios', romaneioId)
      } catch (_) {
        throw { _user: 'Romaneio não encontrado.' }
      }
      if (
        rom.getString('status') !== 'Em formacao' &&
        rom.getString('status') !== 'Pronto para expedicao'
      ) {
        throw { _user: 'Romaneio já expedido ou em status que não permite expedição.' }
      }
      if (rom.getString('documento_313')) {
        resultado = {
          ja_expedido: true,
          documento_313: rom.getString('documento_313'),
          mensagem:
            'Expedição 313 já executada (documento ' + rom.getString('documento_313') + ').',
        }
        return
      }

      const depDestino = rom.getString('deposito_destino')
      const doc313 =
        '313-LOC-' + rom.getString('numero_romaneio').replace(/[^A-Z0-9]/gi, '') + '-' + Date.now()
      const colMov = tx.findCollectionByNameOrId('mp_ks_ciafal_movimentos')
      const colPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_pecas')
      const colRomPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_romaneio_pecas')

      let itens = []
      try {
        itens = tx.findRecordsByFilter(
          'mp_ks_ciafal_romaneio_pecas',
          'romaneio_id = {:r}',
          'created',
          5000,
          0,
          { r: romaneioId },
        )
      } catch (_) {
        itens = []
      }

      for (const item of itens) {
        const pid = item.getString('peca_id')
        let peca = null
        try {
          peca = tx.findRecordById('mp_ks_ciafal_pecas', pid)
        } catch (_) {
          continue
        }
        if (peca.getString('status') === 'Em transito') continue // idempotente
        const idem = '313:' + romaneioId + ':' + pid
        let existente = null
        try {
          existente = tx.findFirstRecordByData('mp_ks_ciafal_movimentos', 'idempotency_key', idem)
        } catch (_) {
          existente = null
        }
        if (existente) continue

        const mov = new Record(colMov)
        mov.set('tipo_movimento', '313')
        mov.set('documento_sap', doc313)
        mov.set('idempotency_key', idem)
        mov.set('peca_id', pid)
        mov.set('selecao_id', rom.getString('selecao_id'))
        mov.set('romaneio_id', romaneioId)
        mov.set('centro', rom.getString('centro'))
        mov.set('deposito_origem', DP28)
        mov.set('deposito_destino', depDestino)
        mov.set('status', 'OK')
        mov.set('criado_por', usuarioNome)
        mov.set('criado_em', nowBR())
        mov.set('payload_json', JSON.stringify({ simulado: true }))
        tx.save(mov)

        peca.set('status', 'Em transito')
        peca.set('romaneio_id', romaneioId)
        peca.set('deposito_atual', depDestino)
        tx.save(peca)
        item.set('situacao', 'Em transito')
        tx.save(item)
      }

      rom.set('documento_313', doc313)
      rom.set('status', depDestino === DP07 ? 'Aguardando recebimento' : 'Em transito')
      tx.save(rom)

      audit(tx, {
        acao: 'expedicao_313',
        entidade: 'mp_ks_ciafal_romaneios',
        entidade_id: romaneioId,
        matricula: usuarioMat,
        nome: usuarioNome,
        depois: { documento_313: doc313, status: rom.getString('status') },
        detalhe: 'Saída 313 DP28 → ' + depDestino + ' (material em trânsito)',
      })

      resultado = {
        ja_expedido: false,
        documento_313: doc313,
        status: rom.getString('status'),
        mensagem:
          'Expedição 313 executada (' + DP28 + ' → ' + depDestino + '). Material em trânsito.',
      }
    } catch (err) {
      if (err && err._user) userError = err._user
      else {
        console.error('[ks-ciafal] 313:', err && err.message)
        userError = 'Falha ao expedir o romaneio (313).'
      }
    }
  })

  if (userError) {
    console.warn('[ks-ciafal] 313: transação revertida')
    return e.json(400, { success: false, error: userError })
  }
  return e.json(200, { success: true, resultado: resultado })
})

// ---------------------------------------------------------------------------
// 6) RECEBIMENTO 315 (trânsito → livre) — DP02: Recebido / divergências; DP07: aguardando confirmação
// POST /backend/v1/pcp/mp-ks-ciafal/romaneios/receber  { romaneio_id, divergencias?, usuario }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/romaneios/receber', (e) => {
  const DP28 = 'DP28'
  const DP02 = 'DP02'
  const DP07 = 'DP07'

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const data = (e.requestInfo() || {}).body || {}
  const romaneioId = String(data.romaneio_id || '').trim()
  const divergencias = String(data.divergencias || '').trim()
  const auth = e.auth
  const usuarioNome = String((data.usuario || {}).nome || (auth && auth.getString('name')) || '—')
  const usuarioMat = String((data.usuario || {}).matricula || (auth && auth.getString('id')) || '—')
  if (!romaneioId) {
    console.warn('[ks-ciafal] 315: sem id')
    return e.json(400, { success: false, error: 'Romaneio não informado.' })
  }

  let userError = null
  let resultado = null

  $app.runInTransaction(function (tx) {
    try {
      let rom = null
      try {
        rom = tx.findRecordById('mp_ks_ciafal_romaneios', romaneioId)
      } catch (_) {
        throw { _user: 'Romaneio não encontrado.' }
      }
      const depDestino = rom.getString('deposito_destino')
      const st = rom.getString('status')
      // já recebida não sofre novo 315
      if (st === 'Recebido' || st === 'Aguardando confirmacao DP07') {
        resultado = {
          ja_recebido: true,
          status: st,
          mensagem: 'Recebimento 315 já registrado para este romaneio.',
        }
        return
      }
      if (st !== 'Em transito' && st !== 'Aguardando recebimento') {
        throw { _user: 'Romaneio não está em trânsito — recebimento 315 bloqueado.' }
      }

      const doc315 =
        '315-LOC-' + rom.getString('numero_romaneio').replace(/[^A-Z0-9]/gi, '') + '-' + Date.now()
      const colMov = tx.findCollectionByNameOrId('mp_ks_ciafal_movimentos')
      const colPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_pecas')
      const colRomPecas = tx.findCollectionByNameOrId('mp_ks_ciafal_romaneio_pecas')

      let itens = []
      try {
        itens = tx.findRecordsByFilter(
          'mp_ks_ciafal_romaneio_pecas',
          'romaneio_id = {:r}',
          'created',
          5000,
          0,
          { r: romaneioId },
        )
      } catch (_) {
        itens = []
      }

      for (const item of itens) {
        const pid = item.getString('peca_id')
        let peca = null
        try {
          peca = tx.findRecordById('mp_ks_ciafal_pecas', pid)
        } catch (_) {
          continue
        }
        if (peca.getString('status') === 'Recebido') continue
        const idem = '315:' + romaneioId + ':' + pid
        let existente = null
        try {
          existente = tx.findFirstRecordByData('mp_ks_ciafal_movimentos', 'idempotency_key', idem)
        } catch (_) {
          existente = null
        }
        if (existente) continue

        const mov = new Record(colMov)
        mov.set('tipo_movimento', '315')
        mov.set('documento_sap', doc315)
        mov.set('idempotency_key', idem)
        mov.set('peca_id', pid)
        mov.set('selecao_id', rom.getString('selecao_id'))
        mov.set('romaneio_id', romaneioId)
        mov.set('centro', rom.getString('centro'))
        mov.set('deposito_origem', DP28)
        mov.set('deposito_destino', depDestino)
        mov.set('status', divergencias ? 'DIVERGENCIA' : 'OK')
        mov.set('criado_por', usuarioNome)
        mov.set('criado_em', nowBR())
        mov.set('payload_json', JSON.stringify({ simulado: true, divergencias: divergencias }))
        tx.save(mov)

        peca.set('status', 'Recebido')
        peca.set('deposito_atual', depDestino)
        tx.save(peca)
        item.set('situacao', divergencias ? 'Divergencia' : 'Recebido')
        tx.save(item)
      }

      rom.set('documento_315', doc315)
      rom.set('recebido_por', usuarioNome)
      rom.set('recebido_em', nowBR())
      if (divergencias) {
        rom.set('divergencias', divergencias)
        rom.set('status', 'Com divergencia')
      } else if (depDestino === DP07) {
        rom.set('status', 'Aguardando confirmacao DP07')
      } else {
        rom.set('status', 'Recebido')
      }
      tx.save(rom)

      audit(tx, {
        acao: 'recebimento_315',
        entidade: 'mp_ks_ciafal_romaneios',
        entidade_id: romaneioId,
        matricula: usuarioMat,
        nome: usuarioNome,
        depois: {
          documento_315: doc315,
          status: rom.getString('status'),
          divergencias: divergencias,
        },
        detalhe:
          depDestino === DP07
            ? 'Recebimento DP07 realizado pelo processo de transferência da equipe de Estoque/Preparação de Tarugos.'
            : 'Recebimento 315 ' + DP28 + ' → ' + depDestino + ' concluído.',
      })

      resultado = {
        ja_recebido: false,
        documento_315: doc315,
        status: rom.getString('status'),
        mensagem:
          depDestino === DP07
            ? 'Recebimento DP07 realizado pelo processo de transferência da equipe de Estoque/Preparação de Tarugos.'
            : 'Recebimento 315 concluído. Material disponível em ' + depDestino + '.',
      }
    } catch (err) {
      if (err && err._user) userError = err._user
      else {
        console.error('[ks-ciafal] 315:', err && err.message)
        userError = 'Falha ao registrar o recebimento 315.'
      }
    }
  })

  if (userError) {
    console.warn('[ks-ciafal] 315: transação revertida')
    return e.json(400, { success: false, error: userError })
  }
  return e.json(200, { success: true, resultado: resultado })
})

// ---------------------------------------------------------------------------
// 7) CONFIRMAÇÃO DP07 (status próprio, sem novo movimento SAP)
// POST /backend/v1/pcp/mp-ks-ciafal/romaneios/confirmar-dp07  { romaneio_id, usuario }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/pcp/mp-ks-ciafal/romaneios/confirmar-dp07', (e) => {
  const DP07 = 'DP07'

  function nowBR() {
    return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
  }

  function audit(app, entry) {
    try {
      const col = app.findCollectionByNameOrId('mp_ks_ciafal_auditoria')
      const rec = new Record(col)
      rec.set('usuario_matricula', entry.matricula || '')
      rec.set('usuario_nome', entry.nome || '')
      rec.set('acao', entry.acao || '')
      rec.set('entidade', entry.entidade || '')
      rec.set('entidade_id', entry.entidade_id || '')
      rec.set('antes', entry.antes ? JSON.stringify(entry.antes).slice(0, 4000) : '')
      rec.set('depois', entry.depois ? JSON.stringify(entry.depois).slice(0, 4000) : '')
      rec.set('detalhe', entry.detalhe || '')
      rec.set('criado_em', nowBR())
      app.save(rec)
    } catch (err) {
      console.warn('[ks-ciafal] falha ao registrar auditoria:', err && err.message)
    }
  }

  const data = (e.requestInfo() || {}).body || {}
  const romaneioId = String(data.romaneio_id || '').trim()
  const auth = e.auth
  const usuarioNome = String((data.usuario || {}).nome || (auth && auth.getString('name')) || '—')
  const usuarioMat = String((data.usuario || {}).matricula || (auth && auth.getString('id')) || '—')
  if (!romaneioId) {
    console.warn('[ks-ciafal] dp07: sem id')
    return e.json(400, { success: false, error: 'Romaneio não informado.' })
  }

  let userError = null
  let resultado = null

  $app.runInTransaction(function (tx) {
    try {
      let rom = null
      try {
        rom = tx.findRecordById('mp_ks_ciafal_romaneios', romaneioId)
      } catch (_) {
        throw { _user: 'Romaneio não encontrado.' }
      }
      if (rom.getString('deposito_destino') !== DP07) {
        throw { _user: 'Confirmação DP07 se aplica apenas a romaneios com destino DP07.' }
      }
      if (rom.getString('status') !== 'Aguardando confirmacao DP07') {
        throw { _user: 'Romaneio não está aguardando confirmação DP07.' }
      }
      rom.set('status', 'Recebido')
      tx.save(rom)
      audit(tx, {
        acao: 'confirmacao_dp07',
        entidade: 'mp_ks_ciafal_romaneios',
        entidade_id: romaneioId,
        matricula: usuarioMat,
        nome: usuarioNome,
        depois: { status: 'Recebido' },
        detalhe: 'Confirmação DP07 registrada pela equipe de Estoque/Preparação de Tarugos.',
      })
      resultado = {
        status: 'Recebido',
        mensagem: 'Confirmação DP07 registrada. Romaneio Recebido.',
      }
    } catch (err) {
      if (err && err._user) userError = err._user
      else {
        console.error('[ks-ciafal] dp07:', err && err.message)
        userError = 'Falha ao confirmar DP07.'
      }
    }
  })

  if (userError) {
    console.warn('[ks-ciafal] dp07: transação revertida')
    return e.json(400, { success: false, error: userError })
  }
  return e.json(200, { success: true, resultado: resultado })
})

console.log('[ks-ciafal] hooks de Envio de MP KS → Ciafal carregados')
