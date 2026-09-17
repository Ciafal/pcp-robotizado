/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Migração idempotente para preencher códigos/identificadores vazios de production_lines
    // Formato: LIN-{planta}-{slug}-{sufixo}
    try {
      const lines = app.findRecordsByFilter(
        'production_lines',
        "code = '' || code = null",
        '-created',
        500,
        0,
      )

      for (let i = 0; i < lines.length; i++) {
        const rec = lines[i]
        const name = (rec.getString('name') || 'LINHA').trim()
        const slug =
          name
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase()
            .slice(0, 8) || 'LIN'

        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let suffix = ''
        for (let j = 0; j < 4; j++) {
          suffix += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        const generatedCode = 'LIN-1000-' + slug + '-' + suffix
        rec.set('code', generatedCode)
        app.save(rec)
      }
    } catch (e) {
      // Se a tabela ou campos já estiverem todos preenchidos, ignore silenciosamente
      console.log('Migração 1774000000_fill_empty_line_codes verificada: ' + e)
    }
  },
  (app) => {
    // Reversão no-op para manter integridade dos dados históricos
  },
)
