import { pb } from '@/lib/pocketbase/client'
import {
  SapBatchMovement,
  RfidMovement,
  IntegratedTraceabilityEvent,
  BatchSummary,
  BatchFilterParams,
  LabelReprintRequest,
  LabelReprintResult,
} from '@/types/batch-movements'

// Catálogo padrão de impressoras SAP cadastradas na CIAFAL
export const SAP_PRINTERS = [
  { id: 'LP_PCP_L1', name: 'LP_PCP_L1 — Zebra ZT411 Linha 1 (Laminador)' },
  { id: 'LP_PCP_L2', name: 'LP_PCP_L2 — Zebra ZT411 Linha 2 (Trefila)' },
  { id: 'LP_EXP_DP10', name: 'LP_EXP_DP10 — Zebra ZT610 Expedição DP10' },
  { id: 'LP_REC_DP01', name: 'LP_REC_DP01 — Zebra ZT411 Recebimento MP' },
  { id: 'LP_QUALIDADE', name: 'LP_QUALIDADE — Zebra ZD421 Laboratório SGQ' },
]

export const REPRINT_REASONS = [
  'Etiqueta danificada',
  'Etiqueta perdida',
  'Etiqueta ilegível',
  'Divergência de impressão',
  'Troca de embalagem',
  'Solicitação da operação',
  'Outro',
] as const

/**
 * Consulta de movimentações SAP equivalentes à MB51 via backend RFC / réplica
 */
export async function fetchSapBatchMovements(params: BatchFilterParams): Promise<{
  success: boolean
  data: SapBatchMovement[]
  error?: string
  origem?: string
}> {
  if (!params.lote || !params.lote.trim()) {
    return {
      success: false,
      data: [],
      error: 'Informe o número do lote para realizar a consulta.',
    }
  }

  try {
    // 1. Tentar chamada via endpoint do backend PocketBase (hook)
    const resp = await pb.send('/backend/v1/pcp/sap/batch-movements', {
      method: 'POST',
      body: {
        lote: params.lote.trim(),
        data_inicial: params.data_inicial,
        data_final: params.data_final,
        material_code: params.material_code,
      },
    })

    if (resp && resp.data) {
      return {
        success: true,
        data: resp.data as SapBatchMovement[],
        origem: resp.origem || 'SAP',
      }
    }
  } catch (err: any) {
    console.warn('[BatchMovementsService] Chamada ao hook falhou, consultando réplica local:', err)
  }

  // 2. Fallback resiliente: consultar diretamente a collection sap_batch_movements_cache
  try {
    let filter = `lote = '${params.lote.trim()}'`
    if (params.material_code && params.material_code.trim()) {
      filter += ` && material_code = '${params.material_code.trim()}'`
    }

    const records = await pb.collection('sap_batch_movements_cache').getList(1, 200, {
      filter,
      sort: '-data_lancamento,-hora',
      requestKey: null,
    })

    const items: SapBatchMovement[] = records.items.map((r: any) => ({
      id: r.id,
      lote: r.lote,
      material_code: r.material_code,
      material_desc: r.material_desc,
      data_lancamento: r.data_lancamento,
      hora: r.hora,
      mblnr: r.mblnr,
      mjahr: r.mjahr,
      zeile: r.zeile,
      bwart: r.bwart,
      bwart_desc: r.bwart_desc,
      quantidade: r.quantidade,
      unidade_medida: r.unidade_medida,
      shkzg: r.shkzg,
      werks: r.werks,
      lgort: r.lgort,
      aufnr: r.aufnr,
      kdauf: r.kdauf,
      kdpos: r.kdpos,
      xblnr: r.xblnr,
      vbeln_vf: r.vbeln_vf,
      usnam: r.usnam,
      bktxt: r.bktxt,
      origem_movimento: r.origem_movimento,
      destino_movimento: r.destino_movimento,
      is_estorno: r.is_estorno,
      doc_estorno_original: r.doc_estorno_original,
    }))

    return {
      success: true,
      data: items,
      origem: 'SAP_CACHE_REPLICA',
    }
  } catch (err: any) {
    console.error('[BatchMovementsService] Falha na réplica SAP:', err)
    return {
      success: false,
      data: [],
      error: 'Não foi possível consultar as movimentações SAP neste momento.',
    }
  }
}

/**
 * Consulta de movimentações RFID do WMS / Coletas
 */
export async function fetchRfidMovements(params: BatchFilterParams): Promise<{
  success: boolean
  data: RfidMovement[]
  error?: string
}> {
  if (!params.lote || !params.lote.trim()) {
    return {
      success: false,
      data: [],
      error: 'Informe o número do lote para realizar a consulta.',
    }
  }

  try {
    let filter = `lote = '${params.lote.trim()}'`
    if (params.material_code && params.material_code.trim()) {
      filter += ` && material_code = '${params.material_code.trim()}'`
    }

    const records = await pb.collection('rfid_movements').getList(1, 200, {
      filter,
      sort: '-data_leitura,-hora_leitura',
      requestKey: null,
    })

    const items: RfidMovement[] = records.items.map((r: any) => ({
      id: r.id,
      data_leitura: r.data_leitura,
      hora_leitura: r.hora_leitura,
      tag_rfid: r.tag_rfid,
      epc: r.epc,
      lote: r.lote,
      material_code: r.material_code,
      material_desc: r.material_desc,
      quantidade: r.quantidade,
      unidade_medida: r.unidade_medida,
      localizacao_anterior: r.localizacao_anterior,
      localizacao_atual: r.localizacao_atual,
      deposito: r.deposito,
      centro: r.centro,
      equipamento_coletor: r.equipamento_coletor,
      usuario: r.usuario,
      tipo_coleta: r.tipo_coleta,
      numero_coleta_inventario: r.numero_coleta_inventario,
      origem: r.origem,
      destino: r.destino,
      status: r.status,
      observacao: r.observacao,
    }))

    return {
      success: true,
      data: items,
    }
  } catch (err: any) {
    console.error('[BatchMovementsService] Falha ao consultar RFID:', err)
    return {
      success: false,
      data: [],
      error: 'Não foi possível consultar as movimentações RFID neste momento.',
    }
  }
}

/**
 * Gravação de log de auditoria no HUB
 */
export async function logBatchAuditAction(
  action: string,
  lote: string,
  details: Record<string, unknown>,
  outcome: 'SUCCESS' | 'FAILED' = 'SUCCESS',
) {
  try {
    const user = pb.authStore.record
    await pb.collection('pcp_audit_logs').create({
      module: 'Controle de Produção',
      screen: 'Movimentações Lote',
      action,
      event_type: 'SCHEDULE_ACTION',
      user_id: user?.id || 'anonymous',
      user_name: user?.name || user?.email || 'Usuário PCP',
      user_email: user?.email || '',
      outcome,
      details: {
        lote,
        ...details,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.warn('[BatchAudit] Erro ao registrar log de auditoria:', e)
  }
}

/**
 * Emissão de 2ª via de etiqueta oficial SAP
 */
export async function requestLabelReprint(
  request: LabelReprintRequest,
): Promise<LabelReprintResult> {
  const user = pb.authStore.record
  const now = new Date()
  const yyyy = String(now.getFullYear())
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase()
  const localProtocol = `ETIQ-${yyyy}${mm}${dd}-${rand}`

  try {
    // 1. Chamar endpoint oficial no backend
    const resp: any = await pb.send('/backend/v1/pcp/sap/reprint-label', {
      method: 'POST',
      body: {
        lote: request.lote,
        material_code: request.material_code,
        material_desc: request.material_desc,
        peso: request.peso,
        centro: request.centro,
        deposito: request.deposito,
        etiqueta_atual_id: request.etiqueta_atual_id,
        impressora: request.impressora,
        quantidade_copias: request.quantidade_copias,
        motivo_reimpressao: request.motivo_reimpressao,
        justificativa: request.justificativa,
      },
    })

    if (resp && resp.success) {
      return {
        success: true,
        protocolo: resp.protocolo || localProtocol,
        lote: request.lote,
        message: resp.message || `2ª via da etiqueta do lote ${request.lote} emitida com sucesso.`,
        retorno_sap: resp.retorno_sap,
      }
    }

    return {
      success: false,
      protocolo: resp?.protocolo || localProtocol,
      lote: request.lote,
      message: resp?.message || 'Não foi possível emitir a etiqueta.',
      retorno_sap: resp?.retorno_sap,
      code: resp?.code,
    }
  } catch (err: any) {
    console.warn('[LabelReprint] Chamada backend falhou:', err)

    // Se o backend retornou 503 com código SAP_PRINT_NOT_CONFIGURED
    if (err?.data?.code === 'SAP_PRINT_NOT_CONFIGURED' || err?.status === 503) {
      return {
        success: false,
        protocolo: err?.data?.protocolo || localProtocol,
        lote: request.lote,
        message: 'Integração SAP de reimpressão pendente de parametrização.',
        retorno_sap: err?.data?.retorno_sap || 'Gateway RFC FCA indisponível',
        code: 'SAP_PRINT_NOT_CONFIGURED',
      }
    }

    // Gravar no fallback de auditoria
    try {
      await pb.collection('pcp_label_reprint_requests').create({
        protocolo: localProtocol,
        lote: request.lote,
        material_code: request.material_code,
        material_desc: request.material_desc,
        peso: request.peso,
        centro: request.centro,
        deposito: request.deposito,
        etiqueta_atual_id: request.etiqueta_atual_id,
        impressora: request.impressora,
        quantidade_copias: request.quantidade_copias,
        motivo_reimpressao: request.motivo_reimpressao,
        justificativa: request.justificativa,
        status_integracao: 'PENDENTE_PARAMETRIZACAO',
        retorno_sap: 'Integração SAP de reimpressão pendente de parametrização',
        usuario_id: user?.id || '',
        usuario_nome: user?.name || user?.email || '',
        usuario_email: user?.email || '',
        data_hora_solicitacao: new Date().toISOString(),
      })
    } catch {
      /* intentionally ignored */
    }

    return {
      success: false,
      protocolo: localProtocol,
      lote: request.lote,
      message: 'Integração SAP de reimpressão pendente de parametrização.',
      retorno_sap: 'Integração SAP de reimpressão pendente de parametrização',
      code: 'SAP_PRINT_NOT_CONFIGURED',
    }
  }
}

/**
 * Motor de Correlação e Rastreabilidade Integrada SAP × RFID
 * Regra: Junta eventos em ordem cronológica com análise de divergências.
 * Em caso de dúvida, NÃO faz correlação silenciosa -> aponta "CORRELACAO_NAO_CONFIRMADA".
 */
export function buildIntegratedTraceability(
  sapMovements: SapBatchMovement[],
  rfidMovements: RfidMovement[],
  lote: string,
): {
  events: IntegratedTraceabilityEvent[]
  divergencesCount: number
} {
  const events: IntegratedTraceabilityEvent[] = []

  // 1. Converter eventos SAP
  sapMovements.forEach((sap, idx) => {
    let tipoEvento: any = 'SAP_OUTRO'
    const bwart = (sap.bwart || '').trim()

    if (sap.is_estorno || bwart === '102' || bwart === '262' || bwart === '602') {
      tipoEvento = 'SAP_ESTORNO'
    } else if (bwart === '101' || bwart === '561') {
      tipoEvento = 'SAP_ENTRADA_PRODUCAO'
    } else if (bwart === '261' || bwart === '541') {
      tipoEvento = 'SAP_CONSUMO'
    } else if (bwart === '311' || bwart === '315') {
      tipoEvento = 'SAP_TRANSFERENCIA'
    } else if (bwart === '601' || bwart === '631') {
      tipoEvento = 'SAP_EXPEDICAO'
    }

    const dataHoraIso = parseDateToIso(sap.data_lancamento, sap.hora)
    const bwartDesc = sap.bwart_desc ? `${sap.bwart} — ${sap.bwart_desc}` : `Movimento ${sap.bwart}`

    events.push({
      id: `sap-${sap.id || idx}-${sap.mblnr}-${sap.zeile}`,
      data_hora: dataHoraIso,
      data_display: sap.data_lancamento,
      hora_display: sap.hora || '--:--:--',
      origem: 'SAP',
      tipo_evento: tipoEvento,
      titulo: bwartDesc,
      descricao: `Doc: ${sap.mblnr}/${sap.mjahr} (Item ${sap.zeile}) | Qtd: ${sap.quantidade} ${sap.unidade_medida || 'UN'} | Dep: ${sap.lgort || '--'} (${sap.werks || '--'})`,
      lote: sap.lote,
      material_code: sap.material_code,
      material_desc: sap.material_desc,
      quantidade: sap.quantidade,
      unidade_medida: sap.unidade_medida,
      centro: sap.werks,
      deposito: sap.lgort,
      documento_referencia: sap.mblnr,
      usuario: sap.usnam,
      correlacionado: false,
      status_correlacao: 'SEM_CORRESPONDENCIA',
      tem_divergencia: false,
      sap_ref: sap,
    })
  })

  // 2. Converter eventos RFID
  rfidMovements.forEach((rfid, idx) => {
    const dataHoraIso = parseDateToIso(rfid.data_leitura, rfid.hora_leitura)
    const isExpedicao = (rfid.tipo_coleta || '').toLowerCase().includes('expedi')

    events.push({
      id: `rfid-${rfid.id || idx}-${rfid.tag_rfid}`,
      data_hora: dataHoraIso,
      data_display: rfid.data_leitura,
      hora_display: rfid.hora_leitura || '--:--:--',
      origem: 'RFID',
      tipo_evento: isExpedicao ? 'RFID_EXPEDICAO' : 'RFID_LEITURA',
      titulo: `Leitura TAG RFID ${rfid.tag_rfid}`,
      descricao: `Coleta: ${rfid.tipo_coleta || 'Movimentação'} | Local Atual: ${rfid.localizacao_atual} | Dep: ${rfid.deposito || '--'}`,
      lote: rfid.lote,
      material_code: rfid.material_code,
      material_desc: rfid.material_desc,
      quantidade: rfid.quantidade,
      unidade_medida: rfid.unidade_medida,
      centro: rfid.centro,
      deposito: rfid.deposito,
      localizacao_fisica: rfid.localizacao_atual,
      usuario: rfid.usuario,
      correlacionado: false,
      status_correlacao: 'SEM_CORRESPONDENCIA',
      tem_divergencia: false,
      rfid_ref: rfid,
    })
  })

  // 3. Ordenar cronologicamente decrescente (mais recente primeiro)
  events.sort((a, b) => b.data_hora.localeCompare(a.data_hora))

  // 4. Correlação e Análise de Divergências
  let divergencesCount = 0

  // Se houver movimentações SAP e NENHUMA leitura RFID
  if (sapMovements.length > 0 && rfidMovements.length === 0) {
    events.forEach((ev) => {
      if (ev.origem === 'SAP') {
        ev.tem_divergencia = true
        ev.tipo_divergencia = 'SAP_SEM_RFID'
        ev.detalhe_divergencia =
          'Movimento contábil SAP registrado, porém nenhuma confirmação física RFID correspondente.'
        ev.status_correlacao = 'SEM_CORRESPONDENCIA'
        divergencesCount++
      }
    })
  } else if (rfidMovements.length > 0 && sapMovements.length === 0) {
    // Se houver leituras RFID e NENHUM movimento contábil SAP
    events.forEach((ev) => {
      if (ev.origem === 'RFID') {
        ev.tem_divergencia = true
        ev.tipo_divergencia = 'RFID_SEM_SAP'
        ev.detalhe_divergencia =
          'Material movimentado fisicamente pelo coletor RFID sem documento de material SAP correspondente.'
        ev.status_correlacao = 'SEM_CORRESPONDENCIA'
        divergencesCount++
      }
    })
  } else {
    // Comparar pares por depósito e proximidade de data
    events.forEach((ev) => {
      if (ev.origem === 'SAP') {
        // Tentar correlacionar com um RFID
        const matchingRfid = events.find(
          (o) =>
            o.origem === 'RFID' &&
            o.lote === ev.lote &&
            (o.material_code === ev.material_code || !ev.material_code || !o.material_code),
        )

        if (matchingRfid) {
          ev.correlacionado = true
          ev.correlacao_id = matchingRfid.id
          matchingRfid.correlacionado = true
          matchingRfid.correlacao_id = ev.id

          // Verificar divergência de localização entre o depósito SAP e a localização RFID
          const sapDep = (ev.deposito || '').toUpperCase().trim()
          const rfidDep = (matchingRfid.deposito || matchingRfid.localizacao_fisica || '')
            .toUpperCase()
            .trim()

          if (sapDep && rfidDep && !rfidDep.includes(sapDep) && !sapDep.includes(rfidDep)) {
            ev.tem_divergencia = true
            ev.tipo_divergencia = 'LOCALIZACAO_DIVERGENTE'
            ev.detalhe_divergencia = `Divergência de localização: SAP indica ${ev.deposito} e RFID indica ${matchingRfid.localizacao_fisica || matchingRfid.deposito}.`
            matchingRfid.tem_divergencia = true
            matchingRfid.tipo_divergencia = 'LOCALIZACAO_DIVERGENTE'
            matchingRfid.detalhe_divergencia = ev.detalhe_divergencia
            ev.status_correlacao = 'CORRELACIONADO'
            matchingRfid.status_correlacao = 'CORRELACIONADO'
            divergencesCount++
          } else {
            ev.status_correlacao = 'CORRELACIONADO'
            matchingRfid.status_correlacao = 'CORRELACIONADO'
          }
        } else {
          // Não foi possível correlacionar com segurança
          ev.status_correlacao = 'CORRELACAO_NAO_CONFIRMADA'
          ev.tem_divergencia = true
          ev.tipo_divergencia = 'SAP_SEM_RFID'
          ev.detalhe_divergencia = 'SAP movimentou mas RFID não confirmou correlação neste evento.'
          divergencesCount++
        }
      }
    })
  }

  return {
    events,
    divergencesCount,
  }
}

/**
 * Consolidação do resumo do lote
 */
export function buildBatchSummary(
  lote: string,
  sapMovements: SapBatchMovement[],
  rfidMovements: RfidMovement[],
): BatchSummary {
  const materialsMap = new Map<string, { desc: string; count: number }>()

  let principalMatCode = ''
  let principalMatDesc = ''
  let centro = ''
  let depositoAtual = ''
  let unidadeMedida = 'KG'
  let saldo = 0
  let qtdInicial = 0
  let qtdMovimentada = 0
  let ultimaDataHora = ''
  let ultimaOrigem: 'SAP' | 'RFID' | 'NÃO INFORMADO' = 'NÃO INFORMADO'
  let etiquetaAtualId = ''

  // Processar SAP
  sapMovements.forEach((s) => {
    if (s.material_code) {
      const cur = materialsMap.get(s.material_code) || { desc: s.material_desc || '', count: 0 }
      cur.count++
      if (s.material_desc) cur.desc = s.material_desc
      materialsMap.set(s.material_code, cur)
      if (!principalMatCode) {
        principalMatCode = s.material_code
        principalMatDesc = s.material_desc || ''
      }
    }
    if (s.werks && !centro) centro = s.werks
    if (s.lgort) depositoAtual = s.lgort
    if (s.unidade_medida) unidadeMedida = s.unidade_medida

    // Cálculo de saldo e movimentações contábeis
    const bwart = (s.bwart || '').trim()
    const shkzg = (s.shkzg || '').toUpperCase()
    const qtd = Number(s.quantidade) || 0

    if (bwart === '101' || bwart === '561') {
      qtdInicial += qtd
    }

    if (shkzg === 'S' || bwart === '101' || bwart === '561') {
      saldo += qtd
    } else if (shkzg === 'H' || bwart === '261' || bwart === '601') {
      saldo -= qtd
    }

    qtdMovimentada += Math.abs(qtd)

    const dt = `${s.data_lancamento} ${s.hora || ''}`
    if (!ultimaDataHora || dt > ultimaDataHora) {
      ultimaDataHora = dt
      ultimaOrigem = 'SAP'
    }
  })

  // Processar RFID
  rfidMovements.forEach((r) => {
    if (r.material_code) {
      const cur = materialsMap.get(r.material_code) || { desc: r.material_desc || '', count: 0 }
      cur.count++
      if (r.material_desc) cur.desc = r.material_desc
      materialsMap.set(r.material_code, cur)
      if (!principalMatCode) {
        principalMatCode = r.material_code
        principalMatDesc = r.material_desc || ''
      }
    }
    if (r.centro && !centro) centro = r.centro
    if (r.localizacao_atual) depositoAtual = r.localizacao_atual
    if (r.tag_rfid && !etiquetaAtualId) etiquetaAtualId = r.tag_rfid

    const dt = `${r.data_leitura} ${r.hora_leitura || ''}`
    if (!ultimaDataHora || dt > ultimaDataHora) {
      ultimaDataHora = dt
      ultimaOrigem = 'RFID'
    }
  })

  const materiaisRelacionados = Array.from(materialsMap.entries()).map(([code, val]) => ({
    code,
    desc: val.desc,
    count: val.count,
  }))

  let statusLote: 'Ativo' | 'Bloqueado' | 'Esgotado' | 'Em Trânsito' | 'Pendente' = 'Ativo'
  if (saldo <= 0 && qtdMovimentada > 0) {
    statusLote = 'Esgotado'
  } else if (depositoAtual.toLowerCase().includes('trans')) {
    statusLote = 'Em Trânsito'
  }

  return {
    lote,
    material_code: principalMatCode || 'NÃO INFORMADO',
    material_desc: principalMatDesc || 'Material do lote',
    materiais_relacionados: materiaisRelacionados,
    centro: centro || '1000',
    deposito_atual: depositoAtual || 'DP10',
    quantidade_inicial: qtdInicial || (saldo > 0 ? saldo : 0),
    quantidade_movimentada: qtdMovimentada,
    saldo_atual: Math.max(saldo, 0),
    unidade_medida: unidadeMedida,
    ultima_movimentacao_data_hora: ultimaDataHora || '--',
    ultima_movimentacao_origem: ultimaOrigem,
    status_lote: statusLote,
    peso_estimado_kg: saldo,
    etiqueta_atual_id: etiquetaAtualId || `TAG-${lote}`,
  }
}

function parseDateToIso(dateStr: string, timeStr?: string): string {
  if (!dateStr) return new Date().toISOString()

  // Se já for ISO
  if (dateStr.includes('T')) return dateStr

  const time = timeStr && timeStr.length >= 5 ? timeStr : '00:00:00'

  // Se dd/mm/aaaa
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0')
      const m = parts[1].padStart(2, '0')
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
      return `${y}-${m}-${d}T${time}`
    }
  }

  // Se yyyy-mm-dd
  if (dateStr.includes('-')) {
    return `${dateStr}T${time}`
  }

  return new Date().toISOString()
}
