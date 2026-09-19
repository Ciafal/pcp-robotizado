/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const zppCol = app.findCollectionByNameOrId('pcp_zpp01_config')

    // Estrutura inicial do ZPP_01:
    // TOTAL, ARCELOR e VALLOUREC com colunas: SEML1, ENDL1, PNCL1, PNCL2
    // KS com colunas: OXIFERKS, PERDAKS, PNCKS, REBARKS
    // SIDERCENTRO com colunas: PNCSDC, Total, Média por centro
    // CISAM com colunas: Total, Média por centro
    const configs = [
      // Bloco TOTAL
      {
        group_code: 'TOTAL',
        group_label: 'TOTAL CONSOLIDADO',
        column_code: 'SEML1',
        column_label: 'SEML1 (Semiacabado L1)',
        center_code: 'SEML1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 1,
      },
      {
        group_code: 'TOTAL',
        group_label: 'TOTAL CONSOLIDADO',
        column_code: 'ENDL1',
        column_label: 'ENDL1 (Endireitadeira L1)',
        center_code: 'ENDL1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 2,
      },
      {
        group_code: 'TOTAL',
        group_label: 'TOTAL CONSOLIDADO',
        column_code: 'PNCL1',
        column_label: 'PNCL1 (PNC Linha 1)',
        center_code: 'PNCL1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 3,
      },
      {
        group_code: 'TOTAL',
        group_label: 'TOTAL CONSOLIDADO',
        column_code: 'PNCL2',
        column_label: 'PNCL2 (PNC Linha 2)',
        center_code: 'PNCL2',
        line_code: 'L2',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 4,
      },

      // Bloco ARCELOR
      {
        group_code: 'ARCELOR',
        group_label: 'ARCELOR',
        column_code: 'SEML1',
        column_label: 'SEML1 (Semiacabado)',
        center_code: 'SEML1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 10,
      },
      {
        group_code: 'ARCELOR',
        group_label: 'ARCELOR',
        column_code: 'ENDL1',
        column_label: 'ENDL1 (Endireitadeira)',
        center_code: 'ENDL1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 11,
      },
      {
        group_code: 'ARCELOR',
        group_label: 'ARCELOR',
        column_code: 'PNCL1',
        column_label: 'PNCL1 (PNC L1)',
        center_code: 'PNCL1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 12,
      },
      {
        group_code: 'ARCELOR',
        group_label: 'ARCELOR',
        column_code: 'PNCL2',
        column_label: 'PNCL2 (PNC L2)',
        center_code: 'PNCL2',
        line_code: 'L2',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 13,
      },

      // Bloco VALLOUREC
      {
        group_code: 'VALLOUREC',
        group_label: 'VALLOUREC',
        column_code: 'SEML1',
        column_label: 'SEML1 (Semiacabado)',
        center_code: 'SEML1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 20,
      },
      {
        group_code: 'VALLOUREC',
        group_label: 'VALLOUREC',
        column_code: 'ENDL1',
        column_label: 'ENDL1 (Endireitadeira)',
        center_code: 'ENDL1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 21,
      },
      {
        group_code: 'VALLOUREC',
        group_label: 'VALLOUREC',
        column_code: 'PNCL1',
        column_label: 'PNCL1 (PNC L1)',
        center_code: 'PNCL1',
        line_code: 'L1',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 22,
      },
      {
        group_code: 'VALLOUREC',
        group_label: 'VALLOUREC',
        column_code: 'PNCL2',
        column_label: 'PNCL2 (PNC L2)',
        center_code: 'PNCL2',
        line_code: 'L2',
        company_code: 'CIAFAL',
        is_active: true,
        order_seq: 23,
      },

      // Bloco KS
      {
        group_code: 'KS',
        group_label: 'KS (FERRADURA / CIAFAL)',
        column_code: 'OXIFERKS',
        column_label: 'OXIFERKS (Oxi-corte)',
        center_code: 'OXIFERKS',
        line_code: 'ENVIO-KSC',
        company_code: 'KS-CIAFAL',
        is_active: true,
        order_seq: 30,
      },
      {
        group_code: 'KS',
        group_label: 'KS (FERRADURA / CIAFAL)',
        column_code: 'PERDAKS',
        column_label: 'PERDAKS (Sucata/Perda)',
        center_code: 'PERDAKS',
        line_code: 'ENVIO-KSF',
        company_code: 'KS-FERRADURA',
        is_active: true,
        order_seq: 31,
      },
      {
        group_code: 'KS',
        group_label: 'KS (FERRADURA / CIAFAL)',
        column_code: 'PNCKS',
        column_label: 'PNCKS (PNC KS)',
        center_code: 'PNCKS',
        line_code: 'INSPKS',
        company_code: 'KS-CIAFAL',
        is_active: true,
        order_seq: 32,
      },
      {
        group_code: 'KS',
        group_label: 'KS (FERRADURA / CIAFAL)',
        column_code: 'REBARKS',
        column_label: 'REBARKS (Rebarbação)',
        center_code: 'REBARKS',
        line_code: 'MULTIPLOKS',
        company_code: 'KS-FERRADURA',
        is_active: true,
        order_seq: 33,
      },

      // Bloco SIDERCENTRO
      {
        group_code: 'SIDERCENTRO',
        group_label: 'SIDERCENTRO',
        column_code: 'PNCSDC',
        column_label: 'PNCSDC (PNC Sidercentro)',
        center_code: 'PNCSDC',
        line_code: 'ARGOLA',
        company_code: 'SIDERCENTRO',
        is_active: true,
        order_seq: 40,
      },
      {
        group_code: 'SIDERCENTRO',
        group_label: 'SIDERCENTRO',
        column_code: 'TOTAL',
        column_label: 'Total SDC',
        center_code: 'SDC_TOT',
        line_code: 'ARGOLA',
        company_code: 'SIDERCENTRO',
        is_active: true,
        order_seq: 41,
      },
      {
        group_code: 'SIDERCENTRO',
        group_label: 'SIDERCENTRO',
        column_code: 'MEDIA',
        column_label: 'Média por centro',
        center_code: 'SDC_MED',
        line_code: 'ARGOLA',
        company_code: 'SIDERCENTRO',
        is_active: true,
        order_seq: 42,
      },

      // Bloco CISAM
      {
        group_code: 'CISAM',
        group_label: 'CISAM',
        column_code: 'TOTAL',
        column_label: 'Total CISAM',
        center_code: 'CISAM_TOT',
        line_code: 'ACIARIA',
        company_code: 'CISAM',
        is_active: true,
        order_seq: 50,
      },
      {
        group_code: 'CISAM',
        group_label: 'CISAM',
        column_code: 'MEDIA',
        column_label: 'Média por centro',
        center_code: 'CISAM_MED',
        line_code: 'ACIARIA',
        company_code: 'CISAM',
        is_active: true,
        order_seq: 51,
      },
    ]

    for (const c of configs) {
      try {
        app
          .db()
          .newQuery(
            'SELECT id FROM pcp_zpp01_config WHERE group_code = {:grp} AND column_code = {:col}',
          )
          .bind({ grp: c.group_code, col: c.column_code })
          .one()
      } catch (_) {
        const rec = new Record(zppCol)
        rec.set('group_code', c.group_code)
        rec.set('group_label', c.group_label)
        rec.set('column_code', c.column_code)
        rec.set('column_label', c.column_label)
        rec.set('center_code', c.center_code)
        rec.set('line_code', c.line_code)
        rec.set('company_code', c.company_code)
        rec.set('is_active', c.is_active)
        rec.set('order_seq', c.order_seq)
        rec.set('notes', 'Configuração parametrizável ZPP_01 inicial homologada.')
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      app.db().newQuery('DELETE FROM pcp_zpp01_config').execute()
    } catch (_) {}
  },
)
