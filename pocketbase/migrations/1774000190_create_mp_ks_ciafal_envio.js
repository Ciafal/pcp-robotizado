// Migration 1774000190 — Tópico "Envio de MP KS → Ciafal" (ZPPT047/ZPPT045/ZPP82/ZPPT003 espelhados)
// Idempotente (if !app.hasTable). NÃO altera coleções existentes de Gestão de MP.
// Índices: addIndex(nome, unique, col1, col2, ...) — criação condicional (só na criação da collection).
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

    // ------------------------------------------------------------------
    // 1) mp_ks_ciafal_pecas — peças físicas individuais (espelho ZPPT045, 1:N para ZPPT047)
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
          { name: 'centro', type: 'text' }, // WERKS
          { name: 'origem', type: 'text' }, // KSC | KSF | CISAM (P3000-VERAN)
          { name: 'matnr', type: 'text' }, // código MP
          { name: 'maktx', type: 'text' }, // descrição
          { name: 'aplicacao', type: 'text' }, // ZBITOLAS-APLICACAO
          { name: 'peso_kg', type: 'number' },
          { name: 'corrida', type: 'text' },
          { name: 'letra', type: 'text' },
          { name: 'numero_bloco', type: 'text' },
          { name: 'data_envio', type: 'text' }, // dd/mm/aaaa editável
          { name: 'certificado_ok', type: 'bool' }, // true = OK (composição química ZPPT003)
          { name: 'status_bloco', type: 'text' }, // status do bloco
          { name: 'deposito', type: 'text' }, // DP20/DP25/DC09 conforme origem
          { name: 'deposito_atual', type: 'text' },
          { name: 'status', type: 'text' }, // Liberado | Selecionado | Em transito | Recebido
          { name: 'selecao_id', type: 'text' },
          { name: 'romaneio_id', type: 'text' },
          { name: 'origem_registro', type: 'text' }, // ZPPT045 | seed | manual
        ],
      })
      c.addIndex('idx_ks_pecas_centro', false, 'centro', 'status', '')
      c.addIndex('idx_ks_pecas_selecao', false, 'selecao_id', '')
      c.addIndex('idx_ks_pecas_bloco', false, 'numero_bloco', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 2) mp_ks_ciafal_selecoes — ZPPT047 (Lista envio MP para Ciafal), com versionamento VXX
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
          { name: 'centro', type: 'text' }, // WERKS
          { name: 'origem', type: 'text' }, // KSC | KSF | CISAM
          { name: 'numero_selecao', type: 'text' }, // SXXXXX/AA
          { name: 'versao', type: 'text' }, // VXX (V00 vigente)
          { name: 'vigente', type: 'bool' },
          { name: 'semana_spwoc', type: 'text' },
          { name: 'programacao_versao', type: 'text' }, // ZPPPMP versão *00
          { name: 'elaborado_por_nome', type: 'text' },
          { name: 'criado_matricula', type: 'text' },
          { name: 'criado_por', type: 'text' },
          { name: 'criado_em', type: 'text' },
          { name: 'modificado_matricula', type: 'text' },
          { name: 'modificado_por', type: 'text' },
          { name: 'modificado_em', type: 'text' },
          { name: 'motivo_id', type: 'text' }, // ZPP82
          { name: 'motivo_codigo', type: 'text' },
          { name: 'justificativa', type: 'text' }, // máx 60
          { name: 'status', type: 'text' }, // Aberta | Transferida 311 | Cancelada
          { name: 'qtd_pecas', type: 'number' },
          { name: 'peso_total_kg', type: 'number' },
          { name: 'documento_311', type: 'text' },
        ],
      })
      c.addIndex('idx_ks_sel_num', false, 'centro', 'numero_selecao', '')
      c.addIndex('idx_ks_sel_vigente', false, 'vigente', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 3) mp_ks_ciafal_selecao_pecas — itens 1:N ZPPT047 → peças (snapshot por versão)
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
          { name: 'selecao_id', type: 'text' },
          { name: 'peca_id', type: 'text' },
          { name: 'numero_selecao', type: 'text' },
          { name: 'versao', type: 'text' },
          { name: 'matnr', type: 'text' },
          { name: 'maktx', type: 'text' },
          { name: 'aplicacao', type: 'text' },
          { name: 'peso_kg', type: 'number' },
          { name: 'corrida', type: 'text' },
          { name: 'letra', type: 'text' },
          { name: 'numero_bloco', type: 'text' },
          { name: 'data_envio', type: 'text' },
          { name: 'deposito', type: 'text' },
          { name: 'situacao', type: 'text' },
        ],
      })
      c.addIndex('idx_ks_selpecas_sel', false, 'selecao_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 4) mp_ks_ciafal_motivos — cadastro ZPP82 (nunca lista fixa no frontend)
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
        fields: [
          { name: 'codigo', type: 'text' },
          { name: 'descricao', type: 'text' },
          { name: 'ativo', type: 'bool' },
        ],
      })
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 5) mp_ks_ciafal_usuarios — ZPP_USUARIO (login expedidor, LIN_PROD/EXP)
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
          { name: 'matricula', type: 'text' },
          { name: 'nome', type: 'text' },
          { name: 'senha', type: 'text' }, // nunca logada nem exposta
          { name: 'lin_prod', type: 'text' }, // EXP = Expedidor
          { name: 'centro', type: 'text' },
          { name: 'ativo', type: 'bool' },
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
          { name: 'numero_romaneio', type: 'text' }, // RXXXXX/AA único
          { name: 'selecao_id', type: 'text' },
          { name: 'numero_selecao', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'origem', type: 'text' },
          { name: 'deposito_destino', type: 'text' }, // DP02 (L2) | DP07 (L1)
          { name: 'destino_tipo', type: 'text' }, // L2 | L1
          { name: 'status', type: 'text' }, // Em formacao | Pronto para expedicao | Em transito |
          // Aguardando recebimento | Aguardando confirmacao DP07 | Recebido | Cancelado | Com divergencia
          { name: 'qtd_pecas', type: 'number' },
          { name: 'peso_total_kg', type: 'number' },
          { name: 'criado_por', type: 'text' },
          { name: 'criado_em', type: 'text' },
          { name: 'documento_313', type: 'text' },
          { name: 'documento_315', type: 'text' },
          { name: 'recebido_por', type: 'text' },
          { name: 'recebido_em', type: 'text' },
          { name: 'divergencias', type: 'text' },
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
          { name: 'romaneio_id', type: 'text' },
          { name: 'peca_id', type: 'text' },
          { name: 'matnr', type: 'text' },
          { name: 'maktx', type: 'text' },
          { name: 'peso_kg', type: 'number' },
          { name: 'corrida', type: 'text' },
          { name: 'numero_bloco', type: 'text' },
          { name: 'situacao', type: 'text' },
        ],
      })
      c.addIndex('idx_ks_rompecas_rom', false, 'romaneio_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 8) mp_ks_ciafal_movimentos — 311/313/315 (+ estorno 316 futuro), idempotentes
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
          { name: 'tipo_movimento', type: 'text' }, // 311 | 313 | 315 | 316
          { name: 'documento_sap', type: 'text' }, // documento simulado/exercício local
          { name: 'idempotency_key', type: 'text' }, // tipo:selecao/romaneio:peca — UNIQUE
          { name: 'peca_id', type: 'text' },
          { name: 'selecao_id', type: 'text' },
          { name: 'romaneio_id', type: 'text' },
          { name: 'centro', type: 'text' },
          { name: 'deposito_origem', type: 'text' },
          { name: 'deposito_destino', type: 'text' },
          { name: 'status', type: 'text' }, // OK | DIVERGENCIA | ESTORNADO
          { name: 'criado_por', type: 'text' },
          { name: 'criado_em', type: 'text' },
          { name: 'payload_json', type: 'text' },
        ],
      })
      c.addIndex('idx_ks_mov_idem', true, 'idempotency_key', '')
      c.addIndex('idx_ks_mov_peca', false, 'peca_id', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 9) mp_ks_ciafal_auditoria — auditoria imutável (padrão pcp_audit_logs)
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
          { name: 'usuario_matricula', type: 'text' },
          { name: 'usuario_nome', type: 'text' },
          { name: 'acao', type: 'text' },
          { name: 'entidade', type: 'text' },
          { name: 'entidade_id', type: 'text' },
          { name: 'antes', type: 'text' },
          { name: 'depois', type: 'text' },
          { name: 'detalhe', type: 'text' },
          { name: 'criado_em', type: 'text' },
        ],
      })
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 10) mp_ks_ciafal_sequencias — seq. atômica: nº seleção SXXXXX/AA e romaneio RXXXXX/AA
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
          { name: 'chave', type: 'text' }, // SEL-<centro>-<AA> | ROM-<centro>-<AA>
          { name: 'current_number', type: 'number' },
        ],
      })
      c.addIndex('idx_ks_seq_chave', true, 'chave', '')
      app.save(c)
    }

    // ------------------------------------------------------------------
    // 11) Seed idempotente de motivos ZPP82 e usuários EXP de exemplo
    // ------------------------------------------------------------------
    try {
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
      console.warn('[1774000190] seed motivos:', err && err.message)
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
      console.warn('[1774000190] seed usuarios:', err && err.message)
    }
  },
  (app) => {
    // rollback simples: remove apenas o que esta migração criou
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
