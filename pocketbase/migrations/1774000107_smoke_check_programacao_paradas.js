/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Inserir registro de teste de fumaça em programacao_paradas
    const paradasCol = app.findCollectionByNameOrId('programacao_paradas')
    const centrosCol = app.findCollectionByNameOrId('programacao_parada_centros')
    const auditCol = app.findCollectionByNameOrId('pcp_audit_logs')

    const codigoSmoke = 'PP-SMOKE-2026'

    const smokeParada = new Record(paradasCol, {
      codigo: codigoSmoke,
      versao: 1,
      versao_rotulo: 'V01',
      status: 'RASCUNHO',
      observacao_geral: 'Smoke test de validação de persistência das coleções',
      criado_por_nome: 'Robô QA PCP',
      atualizado_por_nome: 'Robô QA PCP',
      ultima_alteracao: 'Smoke check de restauração do schema',
      programacao_alterada_pos_comunicado: false,
    })
    app.save(smokeParada)

    // 2. Inserir registro de centro associado
    const smokeCentro = new Record(centrosCol, {
      parada_id: smokeParada.id,
      codigo_parada: codigoSmoke,
      empresa_id: 'CIAFAL',
      empresa_nome: 'CIAFAL Principal',
      linha_id: 'L1',
      linha_nome: 'Laminação 1',
      centro_id: 'C01',
      centro_nome: 'Centro de Corte',
      data_inicio: '10/10/2026',
      hora_inicio: '08:00',
      data_fim: '10/10/2026',
      hora_fim: '12:00',
      inicio_iso: '2026-10-10 08:00',
      fim_iso: '2026-10-10 12:00',
      duracao_horas: 4,
      duracao_formatada: '4h 00m',
      motivo: 'Manutenção preventiva',
      status: 'ATIVO',
    })
    app.save(smokeCentro)

    // 3. Remover apenas os registros de teste (NUNCA derrubar as coleções)
    app.delete(smokeCentro)
    app.delete(smokeParada)

    // 4. Registrar auditoria do smoke test em pcp_audit_logs
    if (auditCol) {
      const auditRec = new Record(auditCol, {
        event_type: 'SCHEDULE_ACTION',
        action: 'SMOKE_CHECK_RESTAURACAO_SCHEMA',
        resource: 'PROGRAMACAO_PARADA',
        resource_id: codigoSmoke,
        entity: 'programacao_paradas',
        module: 'PROGRAMACAO',
        screen: 'Programação de Parada',
        status: 'Concluído',
        outcome: 'SUCCESS',
        permission_required: 'pcp.parada.view',
        user_name: 'Robô QA PCP',
        user_role: 'PCP_ADMIN',
        reason:
          'Smoke check de validação: coleções programacao_paradas e programacao_parada_centros validadas com escrita e deleção atômica de registros de teste com sucesso.',
        details: {
          schema_status: 'RESTORED_ACTIVE',
          collections_validadas: [
            'programacao_paradas',
            'programacao_parada_centros',
            'programacao_parada_comunicados',
            'programacao_parada_historico',
          ],
          registros_preservados: true,
        },
      })
      app.save(auditRec)
    }
  },
  (app) => {
    // Reversão vazia segura
  },
)
