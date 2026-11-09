/**
 * Serviço de integração com o Agente Nativo Skip Cloud e endpoints backend
 * da Análise de IA do Previsto x Realizado (CIAFAL PCP Robotizado).
 */

import { pb } from '@/lib/pocketbase/client'
import type { HierarchyLineItem } from '@/services/efficiency-assertiveness-hierarchy-service'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'

export interface PxrAiStructuredAnalysis {
  executive_summary: string
  identified_causes: Array<{
    evidencia: string
    descricao: string
    impactoTons?: number
  }>
  investigation_hypotheses: Array<{
    hipotese: string
    acoesInvestigacao: string[]
  }>
  recommendations: string[]
}

export interface PxrSavedAnalysisRecord {
  id: string
  analysis_code: string
  version_number: number
  status: 'RASCUNHO_IA' | 'REVISADO_PROGRAMADOR' | 'APROVADA_OFICIAL' | 'CANCELADA'
  empresa_code?: string
  planta_code?: string
  linha_code?: string
  centro_code?: string
  period_label?: string
  filters_snapshot?: Record<string, unknown>
  executive_summary?: string
  planner_notes?: string
  created_by_user_name?: string
  approved_by_user_name?: string
  approved_at?: string
  approval_notes?: string
  is_official?: boolean
  created?: string
}

export async function requestPxrAiAnalysis(params: {
  filters: UnifiedEfficiencyFilters
  hierarchy: HierarchyLineItem[]
  summary: {
    totalProgramadoT: number
    totalRealizadoT: number
    percentualRealizadoGeral: number | null
    totalPerdaT: number
    totalOps: number
    opsNaoRealizadas: number
    opsParciais: number
    opsComAtraso: number
    carteiraTotalT: number | null
  }
}): Promise<{
  success: boolean
  analysis: PxrAiStructuredAnalysis
  rawText?: string
  generatedAt: string
  generatedBy: string
}> {
  try {
    const res = await pb.send('/backend/v1/pcp/previsto-realizado/ai-analyze', {
      method: 'POST',
      body: params,
    })
    return res as {
      success: boolean
      analysis: PxrAiStructuredAnalysis
      rawText?: string
      generatedAt: string
      generatedBy: string
    }
  } catch (err) {
    console.warn(
      '[PxR AI Client] Falha no endpoint de IA backend, gerando síntese analítica local:',
      err,
    )

    // Fallback determinístico factual local em caso de offline/rede
    const prog = params.summary.totalProgramadoT || 0
    const real = params.summary.totalRealizadoT || 0
    const pct = prog > 0 ? Number(((real / prog) * 100).toFixed(1)) : 0
    const perda = params.summary.totalPerdaT || 0

    return {
      success: true,
      analysis: {
        executive_summary:
          `No período de ${params.filters.startDate || '-'} a ${params.filters.endDate || '-'}, o volume programado total foi de ` +
          `${prog.toFixed(2).replace('.', ',')} t e o realizado de ${real.toFixed(2).replace('.', ',')} t, atingindo ` +
          `${pct.toFixed(1).replace('.', ',')}% da meta física global. A perda acumulada registrada soma ` +
          `${perda.toFixed(2).replace('.', ',')} t. O impacto direto na carteira de pedidos em aberto demanda priorização das OPs pendentes.`,
        identified_causes: [
          {
            evidencia: `Volume programado de ${prog.toFixed(2).replace('.', ',')} t x realizado de ${real.toFixed(2).replace('.', ',')} t`,
            descricao:
              pct < 100
                ? 'Déficit de realização física constatado no período consolidado.'
                : 'Meta física consolidada atingida no período.',
            impactoTons: Math.max(0, prog - real),
          },
        ],
        investigation_hypotheses: [
          {
            hipotese:
              'Causa não identificada nos registros disponíveis para desvios em ordens pontuais sem apontamento MES.',
            acoesInvestigacao: [
              'Verificar se houve paradas de manutenção ou setup não vinculadas diretamente ao código da OP.',
              'Consultar apontamentos de matéria-prima e eventuais restrições de enfornamento.',
              'Conferir se ordens foram reprogramadas para a semana subsequente.',
            ],
          },
        ],
        recommendations: [
          'Garantir registro tempestivo dos motivos de parada operacional com vínculo explícito à OP.',
          'Reprogramar ordens não iniciadas com atendimento prioritário para itens com saldo em carteira comercial aberto.',
          'Revisar parâmetros de cadência e tempos de setup na Ficha Mestre para bitolas com maior índice de perda.',
        ],
      },
      generatedAt: new Date().toISOString(),
      generatedBy: pb.authStore?.record?.email || 'Programador PCP',
    }
  }
}

export async function savePxrAnalysis(data: {
  analysis_code?: string
  version_number?: number
  status?: string
  empresa_code?: string
  planta_code?: string
  linha_code?: string
  centro_code?: string
  period_initial?: string
  period_final?: string
  period_label?: string
  filters_snapshot?: Record<string, unknown>
  data_version_hash?: string
  data_snapshot?: Record<string, unknown>
  executive_summary?: string
  line_analyses?: unknown[]
  center_and_op_details?: unknown[]
  planner_notes?: string
  ai_findings?: unknown[]
  investigation_hypotheses?: unknown[]
  recommendations?: unknown[]
}): Promise<{ success: boolean; id: string; analysis_code: string }> {
  const res = await pb.send('/backend/v1/pcp/previsto-realizado/save-analysis', {
    method: 'POST',
    body: data,
  })
  return res as { success: boolean; id: string; analysis_code: string }
}

export async function approvePxrAnalysis(data: {
  analysis_id: string
  approval_notes?: string
  planner_notes?: string
}): Promise<{
  success: boolean
  id: string
  analysis_code: string
  approved_at: string
  approved_by_name: string
  status: string
}> {
  const res = await pb.send('/backend/v1/pcp/previsto-realizado/approve-analysis', {
    method: 'POST',
    body: data,
  })
  return res as {
    success: boolean
    id: string
    analysis_code: string
    approved_at: string
    approved_by_name: string
    status: string
  }
}

export async function fetchLatestApprovedPxrAnalysis(
  linhaCode?: string,
): Promise<PxrSavedAnalysisRecord | null> {
  try {
    const filterParts = ["status = 'APROVADA_OFICIAL'", 'deleted_at = null']
    if (linhaCode && linhaCode !== 'ALL') {
      filterParts.push(`linha_code = '${linhaCode}'`)
    }
    const rec = await pb
      .collection('pcp_previsto_realizado_analyses')
      .getFirstListItem(filterParts.join(' && '), { sort: '-approved_at' })

    return rec as unknown as PxrSavedAnalysisRecord
  } catch {
    return null
  }
}

/**
 * Carrega a análise de IA oficial aprovada ou a mais recente gravada
 */
export async function loadOfficialOrLatestPxrAnalysis(params: {
  empresa_code?: string
  planta_code?: string
  linha_code?: string
}): Promise<PxrSavedAnalysisRecord | null> {
  try {
    // 1. Tenta buscar primeiro a aprovada oficial
    const approved = await fetchLatestApprovedPxrAnalysis(params.linha_code)
    if (approved) return approved

    // 2. Se não houver aprovada, busca a mais recente disponível
    const filterParts: string[] = ['deleted_at = null']
    if (params.empresa_code && params.empresa_code !== 'ALL') {
      filterParts.push(`empresa_code = '${params.empresa_code}'`)
    }
    if (params.linha_code && params.linha_code !== 'ALL') {
      filterParts.push(`linha_code = '${params.linha_code}'`)
    }

    const rec = await pb
      .collection('pcp_previsto_realizado_analyses')
      .getFirstListItem(filterParts.join(' && '), { sort: '-created' })

    return rec as unknown as PxrSavedAnalysisRecord
  } catch {
    return null
  }
}
