/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration idempotente 1774000122 — MP Derivada no vínculo PA × MP da Análise de FACA
 *
 * Adiciona em faca_vinculo_pa_mp os campos técnicos que qualificam a MP:
 * flag_mp_derivada, tipo_disponibilidade_mp, origem_mp_derivada, exige_corte,
 * disponivel_sem_corte, fator_conversao, forma_consolidacao e regra_exibicao.
 *
 * Padrão 1774000095: fields.getByName antes de cada add (idempotente);
 * if !app.hasTable onde cria coleção (aqui a coleção já deve existir — 1774000121).
 *
 * NOTA: Nenhum arquivo *_test*.js é criado em pocketbase/migrations (regra do projeto).
 */
migrate(
  (app) => {
    if (!app.hasTable('faca_vinculo_pa_mp')) {
      console.log('faca_vinculo_pa_mp ausente — migration 1774000122 sem efeito')
      return
    }

    const col = app.findCollectionByNameOrId('faca_vinculo_pa_mp')
    let changed = false

    const addTextField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new TextField({ name, required: false }))
        changed = true
      }
    }

    const addNumberField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new NumberField({ name, required: false }))
        changed = true
      }
    }

    const addBoolField = (name) => {
      if (!col.fields.getByName(name)) {
        col.fields.add(new BoolField({ name, required: false }))
        changed = true
      }
    }

    // ---- MP Derivada (5ª dimensão de agregação de disponibilidade) ----
    addBoolField('flag_mp_derivada') // Derivada = não é a MP bruta do vínculo
    addTextField('tipo_disponibilidade_mp') // tarugo_disponivel | saldo_cortar_ks | mp_sem_cortar | mp_derivada | mp_produzir_l2 | semiacabado_transformavel | outro
    addTextField('origem_mp_derivada') // tarugo | palanquilha | material_bruto | saldo_ks | producao_l2 | outra_estoque_intermediario
    addBoolField('exige_corte') // exige corte KS antes do consumo
    addBoolField('disponivel_sem_corte') // disponível tecnicamente sem passar por corte
    addNumberField('fator_conversao') // t de PA liberada por t de MP derivada
    addTextField('forma_consolidacao') // toneladas | peca | lote | saldo_equivalente_tonelada
    addTextField('regra_exibicao') // somar_estoque_imediato | somar_apenas_potencial | exibir_separado | nao_consolidar

    if (changed) {
      app.save(col)
      console.log('faca_vinculo_pa_mp atualizada com campos de MP derivada')
    }

    // Backfill idempotente: vínculos legados não são MP derivada por padrão
    try {
      records = app.findRecordsByFilter('faca_vinculo_pa_mp', 'id != ""', '-created', 500, 0)
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        let recChanged = false
        if (rec.get('flag_mp_derivada') === null || rec.get('flag_mp_derivada') === undefined) {
          rec.set('flag_mp_derivada', false)
          recChanged = true
        }
        if (!rec.get('tipo_disponibilidade_mp')) {
          rec.set('tipo_disponibilidade_mp', 'mp_sem_cortar')
          recChanged = true
        }
        if (!rec.get('origem_mp_derivada')) {
          rec.set('origem_mp_derivada', 'palanquilha')
          recChanged = true
        }
        if (rec.get('exige_corte') === null || rec.get('exige_corte') === undefined) {
          rec.set('exige_corte', false)
          recChanged = true
        }
        if (
          rec.get('disponivel_sem_corte') === null ||
          rec.get('disponivel_sem_corte') === undefined
        ) {
          rec.set('disponivel_sem_corte', true)
          recChanged = true
        }
        if (
          rec.get('fator_conversao') === null ||
          rec.get('fator_conversao') === undefined ||
          Number(rec.get('fator_conversao')) <= 0
        ) {
          rec.set('fator_conversao', 1)
          recChanged = true
        }
        if (!rec.get('forma_consolidacao')) {
          rec.set('forma_consolidacao', 'toneladas')
          recChanged = true
        }
        if (!rec.get('regra_exibicao')) {
          rec.set('regra_exibicao', 'somar_estoque_imediato')
          recChanged = true
        }
        if (recChanged) {
          app.save(rec)
        }
      }
    } catch (err) {
      console.log('Aviso ao retroalimentar vínculos legados de faca_vinculo_pa_mp:', err)
    }
  },
  (app) => {
    // Reversão: remove apenas os campos adicionados (seguro se ausentes)
    try {
      if (!app.hasTable('faca_vinculo_pa_mp')) return
      const col = app.findCollectionByNameOrId('faca_vinculo_pa_mp')
      const campos = [
        'flag_mp_derivada',
        'tipo_disponibilidade_mp',
        'origem_mp_derivada',
        'exige_corte',
        'disponivel_sem_corte',
        'fator_conversao',
        'forma_consolidacao',
        'regra_exibicao',
      ]
      let removed = false
      campos.forEach((n) => {
        if (col.fields.getByName(n)) {
          col.fields.removeByName(n)
          removed = true
        }
      })
      if (removed) app.save(col)
    } catch (_) {}
  },
)
