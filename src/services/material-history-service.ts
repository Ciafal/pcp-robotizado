/**
 * SERVIÇO DE HISTÓRICO DE ALTERAÇÕES DO MATERIAL
 * CIAFAL PCP ROBOTIZADO
 *
 * Consulta fontes reais do sistema para o código de material especificado:
 * 1. pcp_audit_logs (auditorias diretas do PCP: cadastro, produtividade, paradas, sequenciamento, alterações operacionais)
 * 2. weekly_schedules (programações semanais PCP criadas/atualizadas para o material)
 * 3. pcp_production_orders (ordens de produção / apontamentos / revisões do material)
 *
 * Regras estritas:
 * - Filtro isolado por código do material (nunca vaza dados entre materiais)
 * - Ordenação cronológica decrescente (mais recente primeiro)
 * - Datas formatadas em dd/mm/aaaa hh:mm (pt-BR)
 * - Textos legíveis em pt-BR (sem tokens, segredos ou payload técnico cru)
 * - Retorna lista vazia se nada for encontrado (sem dados mockados)
 */

import { pb } from '@/lib/pocketbase/client'
import { formatDateTimePTBR, formatTonsPtBr } from '@/lib/formatters-ptbr'

export type TipoAlteracaoMaterial =
  | 'AUDITORIA_PCP'
  | 'PROGRAMACAO_SEMANAL'
  | 'ORDEM_PRODUCAO'
  | 'PARAMETRO_PRODUTIVIDADE'
  | 'CARTEIRA_REVISAO'
  | 'CLASSIFICACAO_CADASTRO'

export interface ItemHistoricoMaterial {
  id: string
  timestamp: string // ISO string para ordenação
  dataHoraFormatada: string // dd/mm/aaaa hh:mm
  tipo: TipoAlteracaoMaterial
  tipoLabel: string // Label legível pt-BR
  resumo: string // Resumo amigável
  detalhe?: string // Texto complementar
  usuario?: string // Nome do responsável se disponível
  origem: 'pcp_audit_logs' | 'weekly_schedules' | 'pcp_production_orders'
  dePara?: {
    campo: string
    de: string
    para: string
  }[]
  badgeVariant?: 'default' | 'outline' | 'secondary' | 'warning' | 'info' | 'success'
}

/**
 * Normaliza e sanitiza código de material para consultas PocketBase
 */
function sanitizeMaterialFilter(code: string): string {
  return code.trim().replace(/['"\\]/g, '')
}

/**
 * Traduz ações de auditoria para labels e resumos amigáveis em pt-BR
 */
function traduzirAcaoAudit(
  action: string,
  details: Record<string, any> = {},
): {
  tipo: TipoAlteracaoMaterial
  label: string
  resumo: string
} {
  const upper = (action || '').toUpperCase()

  if (upper.includes('PRODUCTIVITY') || upper.includes('PRODUTIVIDADE')) {
    const rate =
      details?.after_values?.value || details?.after_values?.current_rate || details?.value
    return {
      tipo: 'PARAMETRO_PRODUTIVIDADE',
      label: 'Parâmetro de Produtividade',
      resumo: rate
        ? `Atualização da taxa de produtividade da linha para ${rate} t/h.`
        : 'Atualização de taxa de produtividade ou cadastro técnico.',
    }
  }

  if (upper.includes('SCHEDULE_ITEM_DELETE') || upper.includes('EXCLUSAO_PROGRAMACAO')) {
    return {
      tipo: 'PROGRAMACAO_SEMANAL',
      label: 'Exclusão de Programação',
      resumo: 'Item de programação semanal removido da grade de sequenciamento.',
    }
  }

  if (upper.includes('SCHEDULE') || upper.includes('PROGRAMACAO') || upper.includes('SEQUENC')) {
    return {
      tipo: 'PROGRAMACAO_SEMANAL',
      label: 'Programação Semanal PCP',
      resumo: 'Inclusão ou resequenciamento do material na grade semanal.',
    }
  }

  if (upper.includes('LINE_UPDATE') || upper.includes('CADASTRO') || upper.includes('FICHA')) {
    return {
      tipo: 'CLASSIFICACAO_CADASTRO',
      label: 'Alteração Cadastral',
      resumo:
        details?.change_reason ||
        'Alteração de parâmetros da linha/ficha técnica associada ao material.',
    }
  }

  if (upper.includes('CARTEIRA') || upper.includes('PORTFOLIO') || upper.includes('MINIMO')) {
    return {
      tipo: 'CARTEIRA_REVISAO',
      label: 'Revisão de Carteira',
      resumo: 'Atualização de status, saldo ou alinhamento comercial do item de carteira.',
    }
  }

  if (upper.includes('ORDER') || upper.includes('ORDEM') || upper.includes('APONTAMENTO')) {
    return {
      tipo: 'ORDEM_PRODUCAO',
      label: 'Ordem de Produção',
      resumo: 'Movimentação ou atualização de apontamento na ordem de produção.',
    }
  }

  return {
    tipo: 'AUDITORIA_PCP',
    label: 'Registro PCP',
    resumo: action || 'Registro de alteração operacional registrado no sistema.',
  }
}

/**
 * Busca o histórico real do material no PocketBase
 */
export async function buscarHistoricoDoMaterial(
  materialCode: string,
  options?: {
    maxItems?: number
  },
): Promise<ItemHistoricoMaterial[]> {
  if (!materialCode || !materialCode.trim()) {
    return []
  }

  const cleanCode = sanitizeMaterialFilter(materialCode)
  const maxItems = options?.maxItems || 50
  const resultado: ItemHistoricoMaterial[] = []

  // 1. Consulta em pcp_audit_logs
  try {
    // Filtro estrito contendo o código exato do material em campos de auditoria
    const filterAudit = `action ~ '${cleanCode}' || reason ~ '${cleanCode}' || justification ~ '${cleanCode}' || details ~ '${cleanCode}' || resource_id = '${cleanCode}' || record_id = '${cleanCode}'`

    const auditRecords = await pb.collection('pcp_audit_logs').getList(1, maxItems, {
      filter: filterAudit,
      sort: '-created',
      requestKey: null,
    })

    for (const record of auditRecords.items) {
      let detailsObj: Record<string, any> = {}
      if (record.details) {
        if (typeof record.details === 'string') {
          try {
            detailsObj = JSON.parse(record.details)
          } catch {
            detailsObj = {}
          }
        } else if (typeof record.details === 'object') {
          detailsObj = record.details
        }
      }

      // Verificação defensiva: confirmar se a ocorrência realmente referencia o material pesquisado
      const matchesDetails =
        String(
          detailsObj?.material_code ||
            detailsObj?.materialCode ||
            detailsObj?.after_values?.material_code ||
            '',
        )
          .toLowerCase()
          .includes(cleanCode.toLowerCase()) ||
        String(record.action || '')
          .toLowerCase()
          .includes(cleanCode.toLowerCase()) ||
        String(record.reason || '')
          .toLowerCase()
          .includes(cleanCode.toLowerCase()) ||
        String(record.resource_id || '').toLowerCase() === cleanCode.toLowerCase()

      if (!matchesDetails && record.action && !record.action.includes(cleanCode)) {
        // Se a string bateu só em pedaço não correlacionado, ignora
        continue
      }

      const traducao = traduzirAcaoAudit(record.action || '', detailsObj)

      // Extrai de/para estruturado se existir no changes
      const deParaList: { campo: string; de: string; para: string }[] = []
      if (Array.isArray(record.changes)) {
        for (const ch of record.changes) {
          if (ch && ch.field) {
            deParaList.push({
              campo: ch.fieldNamePt || ch.field,
              de: ch.before !== undefined && ch.before !== null ? String(ch.before) : '—',
              para: ch.after !== undefined && ch.after !== null ? String(ch.after) : '—',
            })
          }
        }
      }

      const ts = record.created || record.updated || new Date().toISOString()

      resultado.push({
        id: `audit-${record.id}`,
        timestamp: ts,
        dataHoraFormatada: formatDateTimePTBR(ts),
        tipo: traducao.tipo,
        tipoLabel: traducao.label,
        resumo: record.reason || traducao.resumo,
        detalhe: record.screen
          ? `Módulo: ${record.module || 'PCP'} • Tela: ${record.screen}`
          : undefined,
        usuario: record.user_name || record.user_email || undefined,
        origem: 'pcp_audit_logs',
        dePara: deParaList.length > 0 ? deParaList : undefined,
        badgeVariant:
          traducao.tipo === 'PARAMETRO_PRODUTIVIDADE'
            ? 'info'
            : traducao.tipo === 'PROGRAMACAO_SEMANAL'
              ? 'warning'
              : 'secondary',
      })
    }
  } catch (err: any) {
    console.warn(
      `[material-history-service] Erro ao consultar pcp_audit_logs para ${cleanCode}:`,
      err?.message || err,
    )
  }

  // 2. Consulta em weekly_schedules (programações reais do material)
  try {
    const filterWeekly = `material_code = '${cleanCode}'`
    const weeklyRecords = await pb.collection('weekly_schedules').getList(1, maxItems, {
      filter: filterWeekly,
      sort: '-created',
      requestKey: null,
    })

    for (const ws of weeklyRecords.items) {
      const ts = ws.created || ws.updated || new Date().toISOString()
      const qtdTons =
        ws.planned_quantity_tons !== undefined ? formatTonsPtBr(ws.planned_quantity_tons) : ''
      const linha = ws.line_code || 'Linha PCP'
      const semana = ws.week_number ? `Semana ${ws.week_number}/${ws.year || ''}` : ''
      const statusLabel =
        ws.status === 'PUBLISHED'
          ? 'Publicado'
          : ws.status === 'APPROVED'
            ? 'Aprovado'
            : ws.status === 'DRAFT'
              ? 'Rascunho'
              : ws.status || 'Programado'

      let metaUser: string | undefined = undefined
      if (ws.metadata && typeof ws.metadata === 'object' && ws.metadata.saved_by) {
        metaUser = String(ws.metadata.saved_by)
      }

      resultado.push({
        id: `ws-${ws.id}`,
        timestamp: ts,
        dataHoraFormatada: formatDateTimePTBR(ts),
        tipo: 'PROGRAMACAO_SEMANAL',
        tipoLabel: 'Programação Semanal PCP',
        resumo: `Programado na ${linha} (${semana})${qtdTons ? ` para ${qtdTons}` : ''} • Status: ${statusLabel}.`,
        detalhe: ws.setup_reason ? `Troca/Setup: ${ws.setup_reason}` : undefined,
        usuario: metaUser || undefined,
        origem: 'weekly_schedules',
        badgeVariant: 'warning',
      })
    }
  } catch (err: any) {
    console.warn(
      `[material-history-service] Erro ao consultar weekly_schedules para ${cleanCode}:`,
      err?.message || err,
    )
  }

  // 3. Consulta em pcp_production_orders (ordens de produção reais do material)
  try {
    const filterOrders = `material_code = '${cleanCode}'`
    const orderRecords = await pb.collection('pcp_production_orders').getList(1, maxItems, {
      filter: filterOrders,
      sort: '-created',
      requestKey: null,
    })

    for (const ord of orderRecords.items) {
      const ts = ord.updated || ord.created || new Date().toISOString()
      const opNum = ord.op_number ? `OP ${ord.op_number}` : 'Ordem de Produção'
      const planTons = ord.quantity_planned_tons ? formatTonsPtBr(ord.quantity_planned_tons) : ''
      const prodTons = ord.quantity_produced_tons ? formatTonsPtBr(ord.quantity_produced_tons) : ''
      const statusOp =
        ord.status_op === 'EM_PRODUCAO'
          ? 'Em Produção'
          : ord.status_op === 'CONCLUIDA_FISICAMENTE'
            ? 'Concluída Fisicamente'
            : ord.status_op || 'Planejada'

      const deParaList: { campo: string; de: string; para: string }[] = []
      if (planTons && prodTons) {
        deParaList.push({
          campo: 'Volume Produzido vs Planejado',
          de: planTons,
          para: prodTons,
        })
      }

      resultado.push({
        id: `ord-${ord.id}`,
        timestamp: ts,
        dataHoraFormatada: formatDateTimePTBR(ts),
        tipo: 'ORDEM_PRODUCAO',
        tipoLabel: 'Ordem de Produção PCP',
        resumo: `${opNum} • Linha: ${ord.linha_code || 'PCP'} • Status: ${statusOp}.`,
        detalhe: ord.deviation_reason
          ? `Desvio registrado: ${ord.deviation_reason}`
          : ord.mrp_planner
            ? `Planejador: ${ord.mrp_planner}`
            : undefined,
        usuario: ord.operator_leader || undefined,
        origem: 'pcp_production_orders',
        dePara: deParaList.length > 0 ? deParaList : undefined,
        badgeVariant: 'info',
      })
    }
  } catch (err: any) {
    console.warn(
      `[material-history-service] Erro ao consultar pcp_production_orders para ${cleanCode}:`,
      err?.message || err,
    )
  }

  // Ordenação final: mais recente primeiro (timestamp decrescente)
  resultado.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return timeB - timeA
  })

  // Deduplicação defensiva por ID
  const mapIds = new Set<string>()
  const finalLista: ItemHistoricoMaterial[] = []
  for (const item of resultado) {
    if (!mapIds.has(item.id)) {
      mapIds.add(item.id)
      finalLista.push(item)
    }
  }

  return finalLista.slice(0, maxItems)
}
