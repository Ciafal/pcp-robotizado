migrate(
  (app) => {
    const delegationsCol = app.findCollectionByNameOrId('pcp_delegations')
    // Alterar createRule para apenas PCP_ADMIN ou o próprio usuário que está delegando
    delegationsCol.createRule =
      "@request.auth.id != '' && (id = @request.auth.id || @request.auth.role = 'PCP_ADMIN' || delegator_id = @request.auth.id || created_by = @request.auth.id)"
    app.save(delegationsCol)

    // Garantir que pcp_audit_logs tem createRule restrito / superuser ou auth segura
    const auditCol = app.findCollectionByNameOrId('pcp_audit_logs')
    auditCol.createRule = "@request.auth.id != '' && user_id = @request.auth.id"
    app.save(auditCol)
  },
  (app) => {
    const delegationsCol = app.findCollectionByNameOrId('pcp_delegations')
    delegationsCol.createRule = "@request.auth.id != ''"
    app.save(delegationsCol)

    const auditCol = app.findCollectionByNameOrId('pcp_audit_logs')
    auditCol.createRule = "@request.auth.id != ''"
    app.save(auditCol)
  },
)
