// Migration 1774000192 — MP KS → Ciafal: cria collections com os construtores
// de campo tipados (TextField/NumberField/BoolField/JSONField), o padrão comprovado
// das migrations 1774000049/0062 deste projeto. Idempotente, seeds inclusos.
migrate(
  (app) => {
    const has = (name) => {
      try {
        app.findCollectionByNameOrId(name)
        return true
      } catch (_) {
        return false
      }
    }

    const txt = (name, opts) =>
      new TextField(Object.assign({ name: name, required: false }, opts || {}))
    const num = (name) => new NumberField({ name: name, required: false })
    const bl = (name) => new BoolField({ name: name, required: false })
    const js = (name) => new JSONField({ name: name, required: false })

    // ------------------------------------------------------------------
    // 1) mp_ks_ciafal_pecas — peças físicas individuais (espelho ZPPT045)
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_pecas')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_pecas',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('centro'),
          txt('origem'), // KSC | KSF | CISAM
          txt('matnr'),
          txt('maktx'),
          txt('aplicacao'),
          num('peso_kg'),
          txt('corrida'),
          txt('letra'),
          txt('numero_bloco'),
          txt('data_envio'), // dd/mm/aaaa
          bl('certificado_ok'),
          txt('status_bloco'),
          txt('deposito'),
          txt('deposito_atual'),
          txt('status'), // Liberado | Selecionado | Em transito | Recebido
          txt('selecao_id'),
          txt('romaneio_id'),
          txt('origem_registro'), // ZPPT045 | seed | manual
        ],
      })
      c.addIndex('idx_ks_pecas_centro', false, 'centro', 'status', '')
      c.addIndex('idx_ks_pecas_selecao', false, 'selecao_id', '')
      c.addIndex('idx_ks_pecas_bloco', false, 'numero_bloco', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 2) mp_ks_ciafal_selecoes — ZPPT047, versionamento VXX (V00 vigente)
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_selecoes')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_selecoes',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('centro'),
          txt('origem'),
          txt('numero_selecao'), // SXXXXX/AA
          txt('versao'), // VXX
          bl('vigente'),
          txt('semana_spwoc'),
          txt('programacao_versao'),
          txt('elaborado_por_nome'),
          txt('criado_matricula'),
          txt('criado_por'),
          txt('criado_em'),
          txt('modificado_matricula'),
          txt('modificado_por'),
          txt('modificado_em'),
          txt('motivo_id'), // ZPP82
          txt('motivo_codigo'),
          txt('justificativa'),
          txt('status'), // Aberta | Transferida 311 | Cancelada
          num('qtd_pecas'),
          num('peso_total_kg'),
          txt('documento_311'),
        ],
      })
      c.addIndex('idx_ks_sel_num', false, 'centro', 'numero_selecao', '')
      c.addIndex('idx_ks_sel_vigente', false, 'vigente', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 3) mp_ks_ciafal_selecao_pecas — itens 1:N (snapshot por versão)
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_selecao_pecas')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_selecao_pecas',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('selecao_id'),
          txt('peca_id'),
          txt('numero_selecao'),
          txt('versao'),
          txt('matnr'),
          txt('maktx'),
          txt('aplicacao'),
          num('peso_kg'),
          txt('corrida'),
          txt('letra'),
          txt('numero_bloco'),
          txt('data_envio'),
          txt('deposito'),
          txt('situacao'),
        ],
      })
      c.addIndex('idx_ks_selpecas_sel', false, 'selecao_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 4) mp_ks_ciafal_motivos — cadastro ZPP82
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_motivos')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_motivos',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [txt('codigo'), txt('descricao'), bl('ativo')],
      })
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 5) mp_ks_ciafal_usuarios — ZPP_USUARIO (login expedidor)
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_usuarios')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_usuarios',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('matricula'),
          txt('nome'),
          txt('senha'), // nunca logada nem exposta
          txt('lin_prod'), // EXP | PROD
          txt('centro'),
          bl('ativo'),
        ],
      })
      c.addIndex('idx_ks_user_matricula', true, 'matricula', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 6) mp_ks_ciafal_romaneios — Formação de carga / Romaneio
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_romaneios')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_romaneios',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('numero_romaneio'), // RXXXXX/AA
          txt('selecao_id'),
          txt('numero_selecao'),
          txt('centro'),
          txt('origem'),
          txt('deposito_destino'), // DP02 (L2) | DP07 (L1)
          txt('destino_tipo'), // L2 | L1
          txt('status'), // Em formacao | Pronto para expedicao | Em transito | Aguardando recebimento | Aguardando confirmacao DP07 | Recebido | Cancelado | Com divergencia
          num('qtd_pecas'),
          num('peso_total_kg'),
          txt('criado_por'),
          txt('criado_em'),
          txt('documento_313'),
          txt('documento_315'),
          txt('recebido_por'),
          txt('recebido_em'),
          txt('divergencias'),
        ],
      })
      c.addIndex('idx_ks_rom_num', true, 'numero_romaneio', '')
      c.addIndex('idx_ks_rom_sel', false, 'selecao_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 7) mp_ks_ciafal_romaneio_pecas — peças do romaneio (snapshot)
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_romaneio_pecas')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_romaneio_pecas',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('romaneio_id'),
          txt('peca_id'),
          txt('matnr'),
          txt('maktx'),
          num('peso_kg'),
          txt('corrida'),
          txt('numero_bloco'),
          txt('situacao'),
        ],
      })
      c.addIndex('idx_ks_rompecas_rom', false, 'romaneio_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 8) mp_ks_ciafal_movimentos — 311/313/315 (+ estorno 316), idempotentes
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_movimentos')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_movimentos',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('tipo_movimento'), // 311 | 313 | 315 | 316
          txt('documento_sap'), // documento local "311-LOC-..."
          txt('idempotency_key'), // UNIQUE
          txt('peca_id'),
          txt('selecao_id'),
          txt('romaneio_id'),
          txt('centro'),
          txt('deposito_origem'),
          txt('deposito_destino'),
          txt('status'), // OK | DIVERGENCIA | ESTORNADO
          txt('criado_por'),
          txt('criado_em'),
          js('payload_json'),
        ],
      })
      c.addIndex('idx_ks_mov_idem', true, 'idempotency_key', '')
      c.addIndex('idx_ks_mov_peca', false, 'peca_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 9) mp_ks_ciafal_auditoria — auditoria imutável
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_auditoria')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_auditoria',
        listRule: 'id != ""',
        viewRule: 'id != ""',
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('usuario_matricula'),
          txt('usuario_nome'),
          txt('acao'),
          txt('entidade'),
          txt('entidade_id'),
          txt('antes'),
          txt('depois'),
          txt('detalhe'),
          txt('criado_em'),
        ],
      })
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 10) mp_ks_ciafal_sequencias — seq. atômica SXXXXX/AA e RXXXXX/AA
    // ------------------------------------------------------------------
    if (!has('mp_ks_ciafal_sequencias')) {
      const c = new Collection({
        type: 'base',
        name: 'mp_ks_ciafal_sequencias',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          txt('chave'), // SEL-<centro>-<AA> | ROM-<centro>-<AA>
          num('current_number'),
        ],
      })
      c.addIndex('idx_ks_seq_chave', true, 'chave', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 11) Seeds idempotentes: motivos ZPP82 e usuários de teste
    // ------------------------------------------------------------------
    try {
      if (!has('mp_ks_ciafal_motivos')) return
      if (app.findFirstRecordByData('mp_ks_ciafal_motivos', 'codigo', 'R01') == null) {
        const col = app.findCollectionByNameOrId('mp_ks_ciafal_motivos')
        const motivos = [
          ['R01', 'Correção de quantidade selecionada'],
          ['R02', 'Peça com divergência de peso'],
          ['R03', 'Bloqueio de bloco pelo laboratório'],
          ['R04', 'Reprogramação de envio'],
          ['R05', 'Outros (especificar na justificativa)'],
        ]
        for (const [codigo, descricao] of motivos) {
          if (app.findFirstRecordByData('mp_ks_ciafal_motivos', 'codigo', codigo) != null) continue
          const r = new Record(col)
          r.set('codigo', codigo)
          r.set('descricao', descricao)
          r.set('ativo', true)
          app.save(r)
        }
      }
    } catch (err) {
      console.warn('[1774000192] seed motivos:', err && err.message)
    }

    try {
      if (app.findFirstRecordByData('mp_ks_ciafal_usuarios', 'matricula', '999001') == null) {
        const col = app.findCollectionByNameOrId('mp_ks_ciafal_usuarios')
        const usuarios = [
          // matricula, nome, senha, lin_prod, centro, ativo
          ['999001', 'Operador Expedidor KS', 'exp123', 'EXP', 'P3000', true],
          ['999002', 'Usuário Produção (não EXP)', 'prod123', 'PROD', 'P3000', true],
          ['999003', 'Expedidor Inativo', 'inat123', 'EXP', 'P3000', false],
        ]
        for (const [matricula, nome, senha, linProd, centro, ativo] of usuarios) {
          if (app.findFirstRecordByData('mp_ks_ciafal_usuarios', 'matricula', matricula) != null)
            continue
          const r = new Record(col)
          r.set('matricula', matricula)
          r.set('nome', nome)
          r.set('senha', senha)
          r.set('lin_prod', linProd)
          r.set('centro', centro)
          r.set('ativo', ativo)
          app.save(r)
        }
      }
    } catch (err) {
      console.warn('[1774000192] seed usuarios:', err && err.message)
    }
  },
  (app) => {
    const names = [
      'mp_ks_ciafal_pecas',
      'mp_ks_ciafal_selecoes',
      'mp_ks_ciafal_selecao_pecas',
      'mp_ks_ciafal_motivos',
      'mp_ks_ciafal_usuarios',
      'mp_ks_ciafal_romaneios',
      'mp_ks_ciafal_romaneio_pecas',
      'mp_ks_ciafal_movimentos',
      'mp_ks_ciafal_auditoria',
      'mp_ks_ciafal_sequencias',
    ]
    for (const n of names) {
      try {
        app.delete(app.findCollectionByNameOrId(n))
      } catch (_) {}
    }
  },
)
