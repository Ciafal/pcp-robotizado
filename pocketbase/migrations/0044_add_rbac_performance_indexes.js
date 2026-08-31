migrate(
  (app) => {
    // Adicionar índices otimizados para busca de permissões, escopos, exceções e roles
    try {
      const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')
      rolePermsCol.addIndex('idx_pcp_role_perm_role_id', false, 'role_id', '')
      rolePermsCol.addIndex('idx_pcp_role_perm_perm_id', false, 'permission_id', '')
      app.save(rolePermsCol)
    } catch (_) {}

    try {
      const permExcCol = app.findCollectionByNameOrId('pcp_permission_exceptions')
      permExcCol.addIndex('idx_pcp_perm_exc_user_id', false, 'user_id', '')
      app.save(permExcCol)
    } catch (_) {}

    try {
      const permsCol = app.findCollectionByNameOrId('pcp_permissions')
      permsCol.addIndex('idx_pcp_permissions_key_fast', false, 'key', '')
      app.save(permsCol)
    } catch (_) {}

    try {
      const rolesCol = app.findCollectionByNameOrId('pcp_roles')
      rolesCol.addIndex('idx_pcp_roles_code_fast', false, 'code', '')
      app.save(rolesCol)
    } catch (_) {}
  },
  (app) => {
    try {
      const rolePermsCol = app.findCollectionByNameOrId('pcp_role_permissions')
      rolePermsCol.removeIndex('idx_pcp_role_perm_role_id')
      rolePermsCol.removeIndex('idx_pcp_role_perm_perm_id')
      app.save(rolePermsCol)
    } catch (_) {}

    try {
      const permExcCol = app.findCollectionByNameOrId('pcp_permission_exceptions')
      permExcCol.removeIndex('idx_pcp_perm_exc_user_id')
      app.save(permExcCol)
    } catch (_) {}
  },
)
