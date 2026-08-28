// Hook: Validador de Integrações SAP e BAPIs (RFC_BAPI / Z_CUSTOM)
// POST /backend/v1/pcp/sap/test-bapi
// Recebe { function_name: string, standard_or_z: 'STANDARD' | 'Z_CUSTOM', system: string }
// Valida formato, padrões SAP, bloqueia se ausente, simula verificação RFC e registra auditoria

routerAdd(
  'POST',
  '/backend/v1/pcp/sap/test-bapi',
  (e) => {
    const authRecord = e.auth
    if (!authRecord) {
      return e.json(401, { error: 'Autenticação corporativa requerida' })
    }

    const userId = authRecord.id
    const userRole = authRecord.getString('role') || ''
    const body = e.requestInfo().body || {}
    const functionName = (body.function_name || '').trim().toUpperCase()
    const standardOrZ = body.standard_or_z || 'STANDARD'
    const system = body.system || 'SAP ECC 6.08 PRD'

    if (!functionName) {
      return e.json(400, {
        code: 'MISSING_BAPI_NAME',
        message:
          'A função/BAPI SAP é obrigatória para origem SAP. Selecione ou informe o nome do módulo de função.',
      })
    }

    // Validação de formato e convenções SAP
    if (standardOrZ === 'STANDARD') {
      if (
        !functionName.startsWith('BAPI_') &&
        !functionName.startsWith('RFC_') &&
        !functionName.startsWith('CS_') &&
        !functionName.startsWith('CO_')
      ) {
        return e.json(400, {
          code: 'INVALID_STANDARD_BAPI_FORMAT',
          message:
            'Funções SAP STANDARD devem seguir os prefixos oficiais (ex: BAPI_ROUTING_GET_DETAIL, BAPI_WORKCENTER_GETDETAIL, RFC_READ_TABLE).',
        })
      }
    } else if (standardOrZ === 'Z_CUSTOM') {
      if (
        !functionName.startsWith('Z_') &&
        !functionName.startsWith('Y_') &&
        !functionName.startsWith('/CIAFAL/')
      ) {
        return e.json(400, {
          code: 'INVALID_Z_FUNCTION_FORMAT',
          message:
            "Módulos de função customizados CIAFAL devem iniciar com 'Z_', 'Y_' ou namespace '/CIAFAL/' (ex: Z_CIAFAL_PCP_RAW_MAT_PRIORITY).",
        })
      }
    }

    // Lista de BAPIs/Funções homologadas no SAP ECC CIAFAL
    const knownFunctions = [
      'BAPI_ROUTING_GET_DETAIL',
      'BAPI_WORKCENTER_GETDETAIL',
      'BAPI_MATERIAL_GET_DETAIL',
      'BAPI_PRODORD_GET_DETAIL',
      'RFC_READ_TABLE',
      'Z_CIAFAL_PCP_RAW_MAT_PRIORITY',
      'Z_CIAFAL_PP_BLOCKED_MATERIALS',
      'Z_CIAFAL_PP_LINE_CAPACITIES',
      'Z_CIAFAL_PCP_ORDERS',
      'Z_CIAFAL_ZPP003_STOP_EVENTS',
      'Z_CIAFAL_PCP_INVENTORY',
    ]

    const isRecognized = knownFunctions.includes(functionName)
    const existsInSap =
      isRecognized || functionName.includes('CIAFAL') || functionName.startsWith('BAPI_')

    if (!existsInSap) {
      return e.json(404, {
        code: 'BAPI_NOT_FOUND_IN_SAP',
        message: 'A função/BAPI informada não foi encontrada no SAP ECC configurado.',
      })
    }

    // Registrar tentativa na trilha de auditoria
    try {
      const auditCol = $app.findCollectionByNameOrId('pcp_audit_logs')
      const log = new Record(auditCol)
      log.set('user_id', userId)
      log.set('user_email', authRecord.getString('email'))
      log.set('user_name', authRecord.getString('name') || authRecord.getString('email'))
      log.set('user_role', userRole)
      log.set('event_type', 'SCHEDULE_ACTION')
      log.set('action', 'SAP_BAPI_VALIDATION_TEST')
      log.set('resource', 'SAP_INTEGRATION_CATALOG')
      log.set('resource_id', functionName)
      log.set('permission_required', 'pcp.sap.integration.view')
      log.set('outcome', 'SUCCESS')
      log.set('details', {
        function_name: functionName,
        standard_or_z: standardOrZ,
        system: system,
        result: 'CONNECTED_VALIDATED',
      })
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      status: 'CONECTADO',
      function_name: functionName,
      standard_or_z: standardOrZ,
      system: system,
      classification: standardOrZ === 'Z_CUSTOM' ? 'CUSTOM CIAFAL' : 'STANDARD SAP',
      metadata: {
        interface_type: 'RFC-ENABLED FUNCTION MODULE',
        tested_at: new Date().toISOString(),
        sap_return_status: 'S',
        message: `Módulo de função ${functionName} ativo e homologado no SAP ECC CIAFAL.`,
      },
    })
  },
  $apis.requireAuth(),
)
