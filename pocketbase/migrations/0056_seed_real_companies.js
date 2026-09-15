migrate(
  (app) => {
    const companiesCol = app.findCollectionByNameOrId('companies')

    const companiesToSeed = [
      {
        code: 'KS-FERRADURA',
        name: 'KS - Ferradura',
        corporate_name: 'KS Ferradura Indústria Metalúrgica Ltda.',
        cnpj: '18.442.110/0001-44',
        status: 'ACTIVE',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        sap_company_code: '2000',
        description: 'Unidade Industrial KS Ferradura',
      },
      {
        code: 'KS-CIAFAL',
        name: 'KS - Ciafal',
        corporate_name: 'KS Ciafal Participações e Aço S.A.',
        cnpj: '19.551.220/0001-55',
        status: 'ACTIVE',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        sap_company_code: '2100',
        description: 'Joint Venture Operacional KS Ciafal',
      },
      {
        code: 'SIDERCENTRO',
        name: 'Sidercentro',
        corporate_name: 'Sidercentro Indústria e Comércio de Ferro e Aço Ltda.',
        cnpj: '20.663.330/0001-66',
        status: 'ACTIVE',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        sap_company_code: '3000',
        description: 'Usina Sidercentro',
      },
      {
        code: 'CISAM',
        name: 'Cisam',
        corporate_name: 'Cisam Companhia Siderúrgica de Aços Moldados',
        cnpj: '21.774.440/0001-77',
        status: 'ACTIVE',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        sap_company_code: '4000',
        description: 'Planta Industrial Cisam',
      },
    ]

    for (let i = 0; i < companiesToSeed.length; i++) {
      const item = companiesToSeed[i]
      try {
        app.findFirstRecordByData('companies', 'code', item.code)
        // Já existe, pula
      } catch (_) {
        const record = new Record(companiesCol)
        record.set('code', item.code)
        record.set('name', item.name)
        record.set('corporate_name', item.corporate_name)
        record.set('cnpj', item.cnpj)
        record.set('status', item.status)
        record.set('timezone', item.timezone)
        record.set('currency', item.currency)
        record.set('sap_company_code', item.sap_company_code)
        record.set('description', item.description)
        app.save(record)
      }
    }
  },
  (app) => {
    const codes = ['KS-FERRADURA', 'KS-CIAFAL', 'SIDERCENTRO', 'CISAM']
    for (let i = 0; i < codes.length; i++) {
      try {
        const record = app.findFirstRecordByData('companies', 'code', codes[i])
        app.delete(record)
      } catch (_) {}
    }
  },
)
