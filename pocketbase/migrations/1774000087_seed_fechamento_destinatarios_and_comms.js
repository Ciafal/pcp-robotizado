/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir que fechamento_destinatarios possui os registros iniciais padrão (seeding no banco de dados, nunca hard-coded no frontend)
    const destCol = app.findCollectionByNameOrId('fechamento_destinatarios')

    const destinatariosIniciais = [
      {
        grupo: 'Contabilidade',
        nome: 'Equipe de Fechamento Contábil',
        usuario: 'contabilidade.fechamento',
        email: 'contabilidade.fechamento@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'Contabilidade',
        nome: 'Controladoria Industrial',
        usuario: 'controladoria',
        email: 'controladoria@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'Produção',
        nome: 'Gestão de Produção L1 (Laminação 1)',
        usuario: 'gestor.l1',
        email: 'gestor.l1@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'Produção',
        nome: 'Gestão de Produção L2 (Laminação 2)',
        usuario: 'gestor.l2',
        email: 'gestor.l2@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'Produção',
        nome: 'Coordenação de Acabamento e Pátio',
        usuario: 'coordenacao.acabamento',
        email: 'coordenacao.acabamento@ciafal.com.br',
        ativo: true,
      },
      {
        grupo: 'PCP',
        nome: 'Controle de Produção CIAFAL',
        usuario: 'controle.producao',
        email: 'pcp@ciafal.com.br',
        ativo: true,
      },
    ]

    for (const d of destinatariosIniciais) {
      try {
        app.findFirstRecordByData('fechamento_destinatarios', 'email', d.email)
      } catch (_) {
        const rec = new Record(destCol)
        rec.set('grupo', d.grupo)
        rec.set('nome', d.nome)
        rec.set('usuario', d.usuario)
        rec.set('email', d.email)
        rec.set('ativo', d.ativo)
        app.save(rec)
      }
    }

    // 2. Garantir campo analise_ia_resumo na checklist_fechamento_execucoes se ainda não existir
    try {
      const execCol = app.findCollectionByNameOrId('checklist_fechamento_execucoes')
      let hasField = false
      for (const field of execCol.fields) {
        if (field.name === 'analise_ia_resumo') {
          hasField = true
          break
        }
      }
      if (!hasField) {
        execCol.fields.add(
          new Field({
            name: 'analise_ia_resumo',
            type: 'text',
          }),
        )
        app.save(execCol)
      }
    } catch (_) {}

    // 3. Garantir campos adicionais em fechamento_comunicacoes para rastreabilidade completa (grupo, remetente, sucesso/erro, reenvios)
    try {
      const commCol = app.findCollectionByNameOrId('fechamento_comunicacoes')
      const fieldNames = new Set(commCol.fields.map((f) => f.name))

      if (!fieldNames.has('grupo_destinatario')) {
        commCol.fields.add(
          new Field({
            name: 'grupo_destinatario',
            type: 'text',
          }),
        )
      }
      if (!fieldNames.has('remetente_email')) {
        commCol.fields.add(
          new Field({
            name: 'remetente_email',
            type: 'text',
          }),
        )
      }
      if (!fieldNames.has('sucesso')) {
        commCol.fields.add(
          new Field({
            name: 'sucesso',
            type: 'bool',
          }),
        )
      }
      if (!fieldNames.has('erro_detalhe')) {
        commCol.fields.add(
          new Field({
            name: 'erro_detalhe',
            type: 'text',
          }),
        )
      }
      if (!fieldNames.has('eh_reenvio')) {
        commCol.fields.add(
          new Field({
            name: 'eh_reenvio',
            type: 'bool',
          }),
        )
      }
      if (!fieldNames.has('comunicacao_original_id')) {
        commCol.fields.add(
          new Field({
            name: 'comunicacao_original_id',
            type: 'text',
          }),
        )
      }
      app.save(commCol)
    } catch (_) {}
  },
  (app) => {
    // Reversão graciosa
  },
)
