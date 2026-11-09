/**
 * Motor do Relatório Corporativo da CIAFAL: Previsto x Realizado
 * Conforme especificações das Melhorias 4, 5 e 6:
 * - Cabeçalho: "CIAFAL — PCP ROBOTIZADO / PREVISTO X REALIZADO" com filtros aplicados.
 * - Tabela: | Produto | Código | Ordem | Carteira (t) | Programado (t) | Realizado (t) | Atend. (%) | Observação |
 * - Destaques percentuais: verde >=100%, amarelo 90–<100%, vermelho <90%
 * - Seção "ANÁLISE DE DESVIOS — INTELIGÊNCIA ARTIFICIAL" por linha com causas factuais, evidências e recomendações.
 * - Formatação: dd/mm/aaaa, decimais com vírgula, pesos em t.
 * - HTML inline responsivo e compatível com clientes corporativos (Outlook/webmail).
 */

import { formatNumberPtBr } from '@/lib/number-format'
import type { UnifiedEfficiencyFilters } from '@/components/control-tower/efficiency/EfficiencyUnifiedFilterBar'
import type {
  HierarchyLineItem,
  HierarchyOpItem,
} from '@/services/efficiency-assertiveness-hierarchy-service'
import type { PxrAiStructuredAnalysis } from '@/services/assertiveness-pxr-ai-service'

export interface PxrReportGeneratorConfig {
  filters: UnifiedEfficiencyFilters
  hierarchy: HierarchyLineItem[]
  aiAnalysis?: PxrAiStructuredAnalysis | null
  responsavel: string
  geradoEm?: Date
  isApprovedOfficial?: boolean
  approvalInfo?: {
    approvedAt?: string
    approvedByName?: string
    versionNumber?: number
  } | null
}

function fmtT(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${formatNumberPtBr(v, 2)} t`
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—'
  return `${formatNumberPtBr(v, 1)}%`
}

export function getAtendimentoColorClass(pct: number | null | undefined): {
  bg: string
  color: string
  label: string
} {
  if (pct === null || pct === undefined) {
    return { bg: '#f1f5f9', color: '#475569', label: '—' }
  }
  if (pct >= 100) {
    return { bg: '#dcfce7', color: '#166534', label: 'Meta Atingida' }
  }
  if (pct >= 90) {
    return { bg: '#fef9c3', color: '#854d0e', label: 'Atenção' }
  }
  return { bg: '#fee2e2', color: '#991b1b', label: 'Crítico' }
}

export function buildDynamicPxrSubject(
  filters: UnifiedEfficiencyFilters,
  geradoEm: Date = new Date(),
): string {
  const linha =
    filters.lineCode && filters.lineCode !== 'ALL' ? filters.lineCode : 'Todas as Linhas'
  let periodo = ''
  if (filters.startDate && filters.endDate) {
    const d1 = filters.startDate.split('-').reverse().join('/')
    const d2 = filters.endDate.split('-').reverse().join('/')
    periodo = `${d1} a ${d2}`
  } else {
    const ano = geradoEm.getFullYear()
    periodo = `${ano}`
  }
  return `CIAFAL | PCP — Previsto x Realizado | Linha ${linha} | ${periodo}`
}

/**
 * Coleta todas as OPs da hierarquia carregada sem repetição.
 */
export function extractFlatOpsFromHierarchy(hierarchy: HierarchyLineItem[]): HierarchyOpItem[] {
  const opsMap = new Map<string, HierarchyOpItem>()
  for (const line of hierarchy) {
    for (const center of line.centers || []) {
      for (const op of center.ops || []) {
        if (!opsMap.has(op.opNumber)) {
          opsMap.set(op.opNumber, op)
        }
      }
    }
  }
  return Array.from(opsMap.values())
}

/**
 * Constrói o documento HTML completo corporativo (compatível com Outlook, Resend e PDF).
 */
export function generatePxrCorporateReportHtml(config: PxrReportGeneratorConfig): string {
  const gerado = config.geradoEm || new Date()
  const dataHora =
    gerado.toLocaleDateString('pt-BR') +
    ' às ' +
    gerado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const empresa =
    config.filters.companyCode && config.filters.companyCode !== 'ALL'
      ? config.filters.companyCode
      : 'CIAFAL'
  const planta =
    config.filters.plantCode && config.filters.plantCode !== 'ALL'
      ? config.filters.plantCode
      : 'Todas as Plantas'
  const linha =
    config.filters.lineCode && config.filters.lineCode !== 'ALL'
      ? config.filters.lineCode
      : 'Todas as Linhas'
  const centro =
    config.filters.workCenterCode && config.filters.workCenterCode !== 'ALL'
      ? config.filters.workCenterCode
      : 'Todos os Centros'
  const statusOp =
    config.filters.status && config.filters.status !== 'ALL'
      ? config.filters.status
      : 'Todos os Status'
  const periodo =
    config.filters.startDate && config.filters.endDate
      ? `${config.filters.startDate.split('-').reverse().join('/')} a ${config.filters.endDate.split('-').reverse().join('/')}`
      : 'Período Selecionado'

  const flatOps = extractFlatOpsFromHierarchy(config.hierarchy)

  // Totais consolidados
  let totalProg = 0
  let totalReal = 0
  let hasReal = false
  let totalCarteira = 0
  let hasCarteira = false
  const seenDemandKeys = new Set<string>()

  for (const l of config.hierarchy) {
    totalProg += l.programadoT || 0
    if (l.realizadoT !== null && l.realizadoT !== undefined) {
      hasReal = true
      totalReal += l.realizadoT
    }
    if (l.carteiraT !== null && l.carteiraT !== undefined) {
      hasCarteira = true
      totalCarteira += l.carteiraT
    }
  }

  const pctGeral =
    totalProg > 0 && hasReal ? Number(((totalReal / totalProg) * 100).toFixed(1)) : null

  // Tabela de OPs
  let opsTableRows = ''
  if (flatOps.length === 0) {
    opsTableRows = `<tr><td colspan="8" style="padding: 12px; text-align: center; color: #64748b; font-style: italic;">Nenhuma Ordem de Produção encontrada para os filtros selecionados ou níveis não expandidos.</td></tr>`
  } else {
    opsTableRows = flatOps
      .map((op) => {
        const atend = getAtendimentoColorClass(op.percentualRealizado)
        const obs = op.observacao || '—'
        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; font-weight: 600; color: #0f172a;">${op.materialDescription || op.productName || '—'}</td>
            <td style="padding: 8px; color: #334155; font-family: monospace;">${op.materialCode || '—'}</td>
            <td style="padding: 8px; font-weight: 600; color: #004C97; font-family: monospace;">${op.opNumber}</td>
            <td style="padding: 8px; text-align: right; color: #0f172a;">${fmtT(op.carteiraT)}</td>
            <td style="padding: 8px; text-align: right; color: #0f172a;">${fmtT(op.plannedQuantityTons)}</td>
            <td style="padding: 8px; text-align: right; color: #0f172a;">${fmtT(op.realizedQuantityTons)}</td>
            <td style="padding: 8px; text-align: center;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: ${atend.bg}; color: ${atend.color};">
                ${fmtPct(op.percentualRealizado)}
              </span>
            </td>
            <td style="padding: 8px; color: #475569; font-size: 11px; word-break: break-word;">${obs}</td>
          </tr>
        `
      })
      .join('')
  }

  // Tabela Consolidada por Linha
  const linhasTableRows = config.hierarchy
    .map((l) => {
      const atend = getAtendimentoColorClass(l.percentualRealizado)
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px; font-weight: bold; color: #004C97;">${l.lineCode} - ${l.lineName}</td>
          <td style="padding: 8px; text-align: right;">${fmtT(l.carteiraT)}</td>
          <td style="padding: 8px; text-align: right;">${fmtT(l.programadoT)}</td>
          <td style="padding: 8px; text-align: right;">${fmtT(l.realizadoT)}</td>
          <td style="padding: 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: ${atend.bg}; color: ${atend.color};">
              ${fmtPct(l.percentualRealizado)}
            </span>
          </td>
          <td style="padding: 8px; text-align: right; color: #dc2626;">${fmtT(l.perdaT)}</td>
          <td style="padding: 8px; text-align: right;">${fmtPct(l.percentualPerda)}</td>
          <td style="padding: 8px; text-align: right;">${fmtPct(l.sequencePct)}</td>
        </tr>
      `
    })
    .join('')

  // Seção de IA
  let aiSectionHtml = ''
  if (config.aiAnalysis) {
    const ai = config.aiAnalysis
    const causes = (ai.identified_causes || [])
      .map(
        (c) =>
          `<li style="margin-bottom: 4px;"><strong>Evidência:</strong> ${c.evidencia} — <em>${c.descricao}</em> ${c.impactoTons ? `(Impacto: ${formatNumberPtBr(c.impactoTons, 2)} t)` : ''}</li>`,
      )
      .join('')

    const hypotheses = (ai.investigation_hypotheses || [])
      .map(
        (h) =>
          `<li style="margin-bottom: 4px;"><strong>Hipótese para investigação:</strong> ${h.hipotese}<ul style="margin: 4px 0 6px 16px;">${(h.acoesInvestigacao || []).map((a) => `<li>${a}</li>`).join('')}</ul></li>`,
      )
      .join('')

    const recs = (ai.recommendations || [])
      .map((r) => `<li style="margin-bottom: 4px;">${r}</li>`)
      .join('')

    aiSectionHtml = `
      <div style="margin-top: 24px; padding: 16px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #f8fafc;">
        <h3 style="margin: 0 0 8px 0; color: #004C97; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
          Análise de Desvios — Inteligência Artificial (Agente Nativo CIAFAL)
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #1e293b;">
          ${ai.executive_summary || 'Resumo analítico factual do período operacional.'}
        </p>
        ${causes ? `<h4 style="margin: 10px 0 4px 0; font-size: 12px; color: #0f172a;">Causas Identificadas nos Registros com Vínculo Verificável:</h4><ul style="margin: 0 0 8px 18px; font-size: 11px; color: #334155;">${causes}</ul>` : ''}
        ${hypotheses ? `<h4 style="margin: 10px 0 4px 0; font-size: 12px; color: #b45309;">Hipóteses para Investigação (Sem evidência vinculada conclusiva):</h4><ul style="margin: 0 0 8px 18px; font-size: 11px; color: #78350f;">${hypotheses}</ul>` : ''}
        ${recs ? `<h4 style="margin: 10px 0 4px 0; font-size: 12px; color: #0f172a;">Recomendações Operacionais:</h4><ul style="margin: 0 0 4px 18px; font-size: 11px; color: #334155;">${recs}</ul>` : ''}
      </div>
    `
  }

  const approvalBadge = config.isApprovedOfficial
    ? `<span style="background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid #bbf7d0;">RELATÓRIO OFICIAL HOMOLOGADO</span>`
    : `<span style="background-color: #fef9c3; color: #854d0e; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px; border: 1px solid #fef08a;">PRÉVIA OPERACIONAL / PENDENTE APROVAÇÃO</span>`

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>CIAFAL — PCP ROBOTIZADO / PREVISTO X REALIZADO</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 16px; background-color: #ffffff; }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        th { background-color: #004C97; color: #ffffff; padding: 8px; text-align: left; font-size: 11px; font-weight: 600; }
        th.num, td.num { text-align: right; }
        th.center, td.center { text-align: center; }
      </style>
    </head>
    <body>
      <div style="max-width: 1000px; margin: 0 auto;">
        <!-- Cabeçalho Institucional -->
        <div style="border-bottom: 3px solid #004C97; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-size: 18px; font-weight: bold; color: #004C97; letter-spacing: 0.5px;">CIAFAL — PCP ROBOTIZADO / PREVISTO X REALIZADO</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Módulo Execução &bull; Assertividade da Programação Industrial</div>
            </div>
            <div>${approvalBadge}</div>
          </div>
          <!-- Metadados / Filtros -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; font-size: 11px; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">
            <div><strong>Empresa:</strong> ${empresa}</div>
            <div><strong>Planta:</strong> ${planta}</div>
            <div><strong>Linha:</strong> ${linha}</div>
            <div><strong>Centro:</strong> ${centro}</div>
            <div><strong>Período:</strong> ${periodo}</div>
            <div><strong>Status OP:</strong> ${statusOp}</div>
            <div><strong>Gerado em:</strong> ${dataHora}</div>
            <div><strong>Responsável:</strong> ${config.responsavel}</div>
          </div>
        </div>

        <!-- Síntese Consolidada por Linha -->
        <h3 style="margin: 16px 0 8px 0; color: #004C97; font-size: 13px; text-transform: uppercase;">
          Assertividade Operacional por Linha de Produção
        </h3>
        <table>
          <thead>
            <tr>
              <th>Estrutura / Linha</th>
              <th class="num">Carteira (t)</th>
              <th class="num">Programado (t)</th>
              <th class="num">Realizado (t)</th>
              <th class="center">% Realizado</th>
              <th class="num">Perda (t)</th>
              <th class="num">% Perda</th>
              <th class="num">Sequência</th>
            </tr>
          </thead>
          <tbody>
            ${linhasTableRows}
            <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #004C97;">
              <td style="padding: 8px; color: #004C97;">Total Consolidado</td>
              <td style="padding: 8px; text-align: right;">${hasCarteira ? fmtT(totalCarteira) : '—'}</td>
              <td style="padding: 8px; text-align: right;">${fmtT(totalProg)}</td>
              <td style="padding: 8px; text-align: right;">${hasReal ? fmtT(totalReal) : '—'}</td>
              <td style="padding: 8px; text-align: center;">${fmtPct(pctGeral)}</td>
              <td style="padding: 8px; text-align: right;" colspan="3"></td>
            </tr>
          </tbody>
        </table>

        <!-- Detalhamento por Ordem de Produção -->
        <h3 style="margin: 24px 0 8px 0; color: #004C97; font-size: 13px; text-transform: uppercase;">
          Detalhamento por Ordem de Produção (Modelo Oficial)
        </h3>
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Código</th>
              <th>Ordem</th>
              <th class="num">Carteira (t)</th>
              <th class="num">Programado (t)</th>
              <th class="num">Realizado (t)</th>
              <th class="center">Atend. (%)</th>
              <th>Observação</th>
            </tr>
          </thead>
          <tbody>
            ${opsTableRows}
          </tbody>
        </table>

        <!-- Seção de IA -->
        ${aiSectionHtml}

        <!-- Rodapé -->
        <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; display: flex; justify-content: space-between;">
          <span>HUB Industrial CIAFAL &bull; PCP Robotizado &bull; Documento rastreado e auditado</span>
          <span>Versão dos dados sincronizada com a tela Previsto x Realizado</span>
        </div>
      </div>
    </body>
    </html>
  `
}
