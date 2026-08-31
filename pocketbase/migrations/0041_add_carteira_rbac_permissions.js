migrate(
  (app) => {
    const permCol = app.findCollectionByNameOrId('pcp_permissions')
    const rolePermCol = app.findCollectionByNameOrId('pcp_role_permissions')
    const rolesCol = app.findCollectionByNameOrId('pcp_roles')

    const carteiraPermissions = [
      {
        key: 'pcp.carteira.view',
        name: 'Visualizar Análise de Carteira',
        category: 'Análise de Carteira',
        description:
          'Permite consulta à Análise de Carteira ZSD28C, Ciclos L1/L2, MTO, Revenda e Importado.',
        is_critical: false,
      },
      {
        key: 'pcp.carteira.import',
        name: 'Importar Carteira QAS / Excel',
        category: 'Análise de Carteira',
        description:
          'Permite upload de arquivos Excel ZSD28C, validação e aplicação de novas versões de carteira.',
        is_critical: true,
      },
      {
        key: 'pcp.carteira.manage_rules',
        name: 'Parametrizar Regras de Carteira',
        category: 'Análise de Carteira',
        description: 'Permite configurar parâmetros, tolerâncias e regras de paridade ZSD28C.',
        is_critical: true,
      },
      {
        key: 'pcp.carteira.reconcile',
        name: 'Reconciliação SAP ZSD28C',
        category: 'Análise de Carteira',
        description:
          'Permite conciliação de saldos, ordens de venda e estoques em relação ao SAP ECC.',
        is_critical: false,
      },
    ]

    const savedPermRecords = []
    for (const p of carteiraPermissions) {
      let existing = null
      try {
        existing = app.findFirstRecordByData('pcp_permissions', 'key', p.key)
      } catch (_) {}

      if (!existing) {
        const rec = new Record(permCol)
        rec.set('key', p.key)
        rec.set('name', p.name)
        rec.set('category', p.category)
        rec.set('description', p.description)
        rec.set('is_critical', p.is_critical)
        app.save(rec)
        savedPermRecords.push(rec)
      } else {
        savedPermRecords.push(existing)
      }
    }

    // Associar permissões aos perfis
    try {
      const roles = app.findRecordsByFilter('pcp_roles', 'id != ""', '', 50, 0)
      for (const r of roles) {
        const rCode = r.getString('code')
        for (const pRec of savedPermRecords) {
          let shouldAssign = false
          if (rCode === 'PCP_ADMIN') {
            shouldAssign = true
          } else if (rCode === 'PCP_PROGRAMMER' || rCode === 'PCP_PLANNER') {
            shouldAssign =
              pRec.getString('key') === 'pcp.carteira.view' ||
              pRec.getString('key') === 'pcp.carteira.import' ||
              pRec.getString('key') === 'pcp.carteira.reconcile'
          } else if (
            rCode === 'LINE_MANAGER' ||
            rCode === 'EXECUTIVE_VIEWER' ||
            rCode === 'AUDITOR' ||
            rCode === 'PRODUCTION_VIEWER'
          ) {
            shouldAssign = pRec.getString('key') === 'pcp.carteira.view'
          }

          if (shouldAssign) {
            try {
              const filter = `role_id = '${r.id}' && permission_id = '${pRec.id}'`
              const existingRP = app.findRecordsByFilter('pcp_role_permissions', filter, '', 1, 0)
              if (!existingRP || existingRP.length === 0) {
                const rp = new Record(rolePermCol)
                rp.set('role_id', r.id)
                rp.set('permission_id', pRec.id)
                app.save(rp)
              }
            } catch (_) {}
          }
        }
      }
    } catch (err) {
      console.log('Erro ao associar permissões de carteira aos perfis:', err)
    }
  },
  (app) => {
    const keys = [
      'pcp.carteira.view',
      'pcp.carteira.import',
      'pcp.carteira.manage_rules',
      'pcp.carteira.reconcile',
    ]
    for (const k of keys) {
      try {
        const rec = app.findFirstRecordByData('pcp_permissions', 'key', k)
        if (rec) {
          app.delete(rec)
        }
      } catch (_) {}
    }
  },
)
