migrate(
  (app) => {
    const plantsCol = app.findCollectionByNameOrId('plants')

    const plantsToSeed = [
      {
        code: 'PL-KSF',
        name: 'Planta KS - Ferradura',
        company_code: 'KS-FERRADURA',
        city: 'Nova Serrana',
        state: 'MG',
        sap_plant_code: '2001',
      },
      {
        code: 'PL-KSC',
        name: 'Planta KS - Ciafal',
        company_code: 'KS-CIAFAL',
        city: 'Itaúna',
        state: 'MG',
        sap_plant_code: '2101',
      },
      {
        code: 'PL-SDC',
        name: 'Planta Sidercentro',
        company_code: 'SIDERCENTRO',
        city: 'Sete Lagoas',
        state: 'MG',
        sap_plant_code: '3001',
      },
      {
        code: 'PL-CSM',
        name: 'Planta Cisam',
        company_code: 'CISAM',
        city: 'Contagem',
        state: 'MG',
        sap_plant_code: '4001',
      },
    ]

    for (let i = 0; i < plantsToSeed.length; i++) {
      const item = plantsToSeed[i]
      try {
        app.findFirstRecordByData('plants', 'code', item.code)
      } catch (_) {
        try {
          const comp = app.findFirstRecordByData('companies', 'code', item.company_code)
          const record = new Record(plantsCol)
          record.set('code', item.code)
          record.set('name', item.name)
          record.set('company_id', comp.id)
          record.set('city', item.city)
          record.set('state', item.state)
          record.set('country', 'Brasil')
          record.set('sap_plant_code', item.sap_plant_code)
          record.set('status', 'ACTIVE')
          record.set('timezone', 'America/Sao_Paulo')
          app.save(record)
        } catch (err) {
          console.warn('Erro ao criar planta para empresa:', item.company_code, err)
        }
      }
    }
  },
  (app) => {
    const codes = ['PL-KSF', 'PL-KSC', 'PL-SDC', 'PL-CSM']
    for (let i = 0; i < codes.length; i++) {
      try {
        const record = app.findFirstRecordByData('plants', 'code', codes[i])
        app.delete(record)
      } catch (_) {}
    }
  },
)
