// Hook: Interceptor de segurança e governança para rotas de produção (ProductionRoute & Edges)
// PocketBase JSVM: todas as verificações devem ser inline no corpo de cada callback

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  // Apenas PCP_ADMIN ou PCP_PROGRAMMER podem criar rotas
  if (userRole !== 'PCP_ADMIN' && userRole !== 'PCP_PROGRAMMER') {
    return e.json(403, {
      code: 'FORBIDDEN_ROUTE_CREATE',
      message:
        'Apenas Administradores ou Programadores PCP possuem autorização para criar rotas produtivas.',
    })
  }

  // Preencher author_id se ausente
  if (!e.record.getString('author_id')) {
    e.record.set('author_id', userId)
    e.record.set('author_name', authRecord.getString('name') || authRecord.getString('email'))
  }

  return e.next()
}, 'production_routes')

onRecordUpdateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id

  // Apenas PCP_ADMIN ou PCP_PROGRAMMER podem editar parâmetros técnicos de rotas
  if (userRole !== 'PCP_ADMIN' && userRole !== 'PCP_PROGRAMMER' && userRole !== 'LINE_MANAGER') {
    return e.json(403, {
      code: 'FORBIDDEN_ROUTE_EDIT',
      message: 'Acesso negado: Perfil sem permissão para modificar rotas de sequenciamento.',
    })
  }

  return e.next()
}, 'production_routes')

onRecordCreateRequest((e) => {
  const authRecord = e.auth
  if (!authRecord) return e.json(401, { error: 'Autenticação corporativa requerida' })

  const userRole = authRecord.getString('role') || ''
  const userId = authRecord.id
  const originLine = e.record.getString('origin_line_code')

  // Object-level authorization por escopo se for Gestor de Linha
  if (userRole === 'LINE_MANAGER' && originLine) {
    let hasScope = false
    try {
      const scopes = $app.findRecordsByFilter(
        'pcp_access_scopes',
        `user_id = '${userId}' && active = true`,
        '',
        20,
        0,
      )
      for (const s of scopes) {
        const sType = s.getString('scope_type')
        const sTarget = s.getString('target_code')
        if (sType === 'GLOBAL' || sTarget === originLine || sTarget === 'ALL') {
          hasScope = true
          break
        }
      }
    } catch (_) {}

    if (!hasScope) {
      return e.json(403, {
        code: 'FORBIDDEN_SCOPE',
        message: `Acesso negado (403): O gestor não possui escopo de autorização para gerenciar a linha ${originLine}.`,
      })
    }
  }

  return e.next()
}, 'production_route_edges')
