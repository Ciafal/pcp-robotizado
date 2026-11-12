// Hook: /api/pcp/rework/helpers
// Retorna, em uma chamada, usuários ativos do HUB Ciafal (coleção users) e
// materiais do cadastro usado pelo sistema (centro de programação:
// pcp_production_orders, com fallback weekly_schedules) para a seção
// "2 — Dados do Retrabalho" do popup Adicionar Item para Retrabalho.
// Permissão: exige sessão válida (auth) — sem bypass anônimo.

routerAdd(
  'GET',
  '/api/pcp/rework/helpers',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.id) {
      return e.json(401, { error: 'Sessão expirada. Faça login novamente.' })
    }

    const q = (e.request.url().query().get('q') || '').trim()

    // --- Usuários ativos (coleção users) -------------------------------
    let users = []
    try {
      const userRecords = $app.findRecordsByFilter('users', '', '-created', 200, 0)
      users = userRecords
        .map((u) => ({
          id: u.id,
          name: u.get('name') || '',
          username: u.get('username') || '',
          email: u.get('email') || '',
          role: u.get('role') || '',
        }))
        .filter((u) => u.name || u.username || u.email)
    } catch (err) {
      console.warn('[rework/helpers] falha ao listar usuários:', err)
    }

    // --- Materiais do cadastro usado pelo sistema ----------------------
    // Fonte: pcp_production_orders (ordens de produção do centro) com
    // fallback para weekly_schedules. Dedupe por código de material.
    const byCode = {}
    const collect = (code, description, gauge, family, steel) => {
      if (!code) return
      const key = String(code).trim()
      if (!key || byCode[key]) return
      if (
        q &&
        !key.toLowerCase().includes(q.toLowerCase()) &&
        !String(description || '')
          .toLowerCase()
          .includes(q.toLowerCase())
      ) {
        return
      }
      byCode[key] = {
        code: key,
        description: description || '',
        gauge: gauge || '',
        family: family || '',
        steel: steel || '',
      }
    }

    try {
      const ops = $app.findRecordsByFilter('pcp_production_orders', '', '-created', 500, 0)
      ops.forEach((o) =>
        collect(
          o.get('material_code'),
          o.get('material_description') || o.get('product_name'),
          o.get('gauge_dimension'),
          o.get('family_code'),
          o.get('steel_grade'),
        ),
      )
    } catch (err) {
      console.warn('[rework/helpers] falha ao listar ordens de produção:', err)
    }

    if (Object.keys(byCode).length < 30) {
      try {
        const ws = $app.findRecordsByFilter('weekly_schedules', '', '-created', 500, 0)
        ws.forEach((w) =>
          collect(
            w.get('material_code'),
            w.get('material_description'),
            w.get('dimensions'),
            w.get('family_code'),
            w.get('steel_grade'),
          ),
        )
      } catch (err) {
        console.warn('[rework/helpers] falha ao listar materiais da programação:', err)
      }
    }

    let materials = Object.values(byCode).slice(0, 100)

    return e.json(200, { users, materials })
  },
  $apis.requireAuth(),
)
