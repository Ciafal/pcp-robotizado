/*
 * Migration idempotente 1774000123 — campo família/grupo no vínculo PA × MP da Análise de FACA
 *
 * A migration 1774000122 já aplicou ao banco: mp_derivada, mp_tipo_disponibilidade,
 * mp_origem_derivada, mp_exige_corte, mp_visivel_sem_corte, mp_fator_conversao,
 * mp_unidade_consolidacao, mp_regra_exibicao e mp_tipo_disponibilidade_outro.
 *
 * Complementa apenas com:
 * - familia_grupo_pa: família/grupo do produto acabado (Bloco 1 da parametrização)
 *
 * Padrão 1774000122: fields.getByName antes de cada add (idempotente).
 * NOTA: Nenhum arquivo *_test*.js é criado em pocketbase/migrations (regra do projeto).
 */
migrate(
  (app) => {
    if (!app.hasTable('faca_vinculo_pa_mp')) {
      console.log('faca_vinculo_pa_mp ausente — migration 1774000123 sem efeito')
      return
    }

    const col = app.findCollectionByNameOrId('faca_vinculo_pa_mp')

    if (!col.fields.getByName('familia_grupo_pa')) {
      col.fields.add(new TextField({ name: 'familia_grupo_pa', required: false }))
      app.save(col)
      console.log('faca_vinculo_pa_mp atualizada com familia_grupo_pa (1774000123)')
    }
  },
  (app) => {
    try {
      if (!app.hasTable('faca_vinculo_pa_mp')) return
      const col = app.findCollectionByNameOrId('faca_vinculo_pa_mp')
      if (col.fields.getByName('familia_grupo_pa')) {
        col.fields.removeByName('familia_grupo_pa')
        app.save(col)
      }
    } catch (_) {}
  },
)
