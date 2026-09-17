/**
 * Motor de Validação Documental do PCP Robotizado (Requisitos 8, 9, 10, 11)
 *
 * Função principal: validateDocumentRules(programacao, context)
 * Retorna:
 * - Regras atendidas
 * - Restrições obrigatórias violadas (obrigação / proibição / limite crítico)
 * - Recomendações
 * - Parâmetros industriais utilizados
 * - Conflitos de origem (ex: Ficha Mestra 25 t/h x Documento SGQ 22 t/h)
 * - Documentos considerados
 *
 * Performance:
 * - Consulta as regras estruturadas já persistidas em `interpreted_rules` dos vínculos da linha.
 * - NUNCA relê ou reprocessa documentos SGQ por IA a cada movimento ou drag & drop.
 * - Soma-se a todas as fontes existentes sem substituir nada do motor da Montagem Semanal.
 */

import {
  StructuredDocumentRule,
  DocumentValidationResult,
  ScheduleItemDocumentImpact,
  DocumentRulesSnapshot,
} from '@/types/sgq-rules'
import { LineReferenceDocument } from './line-reference-documents-service'
import { WeeklyScheduleItem } from '@/types/weekly-schedule'

export interface ValidationContext {
  lineCode: string
  lineOverview?: any
  lineDocs?: LineReferenceDocument[]
  scheduleCode?: string
  versionNumber?: number
  userEmail?: string
  userName?: string
}

export class DocumentRulesEngine {
  /**
   * Valida a programação semanal contra as regras documentais persistidas nos documentos da linha.
   */
  validateDocumentRules(
    scheduleItems: Partial<WeeklyScheduleItem>[] | WeeklyScheduleItem[],
    context: ValidationContext,
  ): DocumentValidationResult {
    const { lineDocs = [], lineOverview } = context

    // 1. Filtrar documentos ativos/vigentes (documento obsoleto não participa de novas programações)
    const validDocs = lineDocs.filter(
      (d) => d.status === 'VIGENTE' && d.interpreted_rules?.rules?.length > 0,
    )

    // Agrupar regras ativas de todos os documentos vigentes vinculados à linha
    const activeRules: StructuredDocumentRule[] = []
    const consideredDocs: Array<{
      document_code: string
      revision: string
      title: string
      rules_count: number
    }> = []

    for (const doc of validDocs) {
      const docRules: StructuredDocumentRule[] = (doc.interpreted_rules?.rules || []).filter(
        (r: StructuredDocumentRule) => r.status === 'ATIVA' && !r.requires_human_review, // Guardrail: apenas regras ativas e validadas
      )
      consideredDocs.push({
        document_code: doc.document_code,
        revision: doc.revision,
        title: doc.title,
        rules_count: docRules.length,
      })
      activeRules.push(...docRules)
    }

    const rulesSatisfied: DocumentValidationResult['rules_satisfied'] = []
    const mandatoryViolations: DocumentValidationResult['mandatory_violations'] = []
    const recommendations: DocumentValidationResult['recommendations'] = []
    const parametersUsed: DocumentValidationResult['parameters_used'] = []
    const conflicts: DocumentValidationResult['conflicts'] = []

    // 2. Ordenar itens de produção por data e sequência para validação sequencial e temporal
    const productionItems = scheduleItems
      .filter((it) => it.item_type === 'PRODUCTION')
      .sort((a, b) => {
        const dCompare = (a.date_str || '').localeCompare(b.date_str || '')
        if (dCompare !== 0) return dCompare
        return (a.sequence_order || 0) - (b.sequence_order || 0)
      })

    // 3. Iterar regras ativas e validar
    for (const rule of activeRules) {
      // 3.1 SETUP & TRANSIÇÃO (ex: Troca A -> B exige 40 min de setup)
      if (rule.category === 'SETUP' && rule.setup_minutes) {
        for (let i = 0; i < productionItems.length - 1; i++) {
          const current = productionItems[i]
          const next = productionItems[i + 1]

          // Verifica se a transição bate com os produtos da regra
          const matchesTransition =
            (!rule.product_from ||
              current.material_code === rule.product_from ||
              current.family_code === rule.product_from) &&
            (!rule.product_to ||
              next.material_code === rule.product_to ||
              next.family_code === rule.product_to)

          if (matchesTransition) {
            // Checar se há item de SETUP entre eles com o tempo mínimo
            const intermediateItems = scheduleItems.filter((it) => {
              if (it.item_type !== 'SETUP') return false
              const itDate = it.date_str || ''
              const currDate = current.date_str || ''
              if (itDate !== currDate) return false
              return (
                (it.sequence_order || 0) > (current.sequence_order || 0) &&
                (it.sequence_order || 0) <= (next.sequence_order || 0)
              )
            })

            const totalSetupProvided = intermediateItems.reduce(
              (acc, it) => acc + (it.setup_duration_minutes || 0),
              0,
            )

            if (totalSetupProvided >= rule.setup_minutes) {
              rulesSatisfied.push({
                rule_id: rule.rule_id,
                document_code: rule.document_code,
                revision: rule.revision,
                category: rule.category,
                rule_type: rule.rule_type,
                description: `Setup de ${rule.setup_minutes} min atendido entre ${current.material_code} e ${next.material_code}.`,
                item_id: next.id,
              })
            } else {
              // Violação ou Alerta
              mandatoryViolations.push({
                rule_id: rule.rule_id,
                document_code: rule.document_code,
                revision: rule.revision,
                category: rule.category,
                rule_type: rule.rule_type,
                description: `Troca de ${current.material_code} para ${next.material_code} exige ${rule.setup_minutes} min de setup (disponibilizado: ${totalSetupProvided} min).`,
                source_excerpt: rule.source_excerpt,
                item_id: next.id,
                product_code: next.material_code,
                sequence_order: next.sequence_order,
                date_str: next.date_str,
                impact_description: `Risco de desvio operacional na linha por tempo insuficiente de troca de bitola.`,
                recommended_action: `Aumentar o tempo de setup para no mínimo ${rule.setup_minutes} minutos ou reordenar a sequência.`,
              })
            }

            parametersUsed.push({
              rule_id: rule.rule_id,
              document_code: rule.document_code,
              parameter: 'tempo_setup_min',
              value: rule.setup_minutes,
              unit: 'min',
              item_id: next.id,
            })
          }
        }
      }

      // 3.2 PROIBIÇÃO DE SEQUÊNCIA (ex: B não pode ser produzido após A)
      if (rule.rule_type === 'PROIBICAO' && rule.category === 'SEQUENCING') {
        for (let i = 0; i < productionItems.length - 1; i++) {
          const current = productionItems[i]
          const next = productionItems[i + 1]

          const matchesProhibition =
            Boolean(
              rule.product_from &&
              (current.material_code === rule.product_from ||
                current.family_code === rule.product_from),
            ) &&
            Boolean(
              rule.product_to &&
              (next.material_code === rule.product_to || next.family_code === rule.product_to),
            )

          if (matchesProhibition) {
            mandatoryViolations.push({
              rule_id: rule.rule_id,
              document_code: rule.document_code,
              revision: rule.revision,
              category: rule.category,
              rule_type: 'PROIBICAO',
              description: `Sequenciamento proibido: ${next.material_code} não pode ser produzido imediatamente após ${current.material_code}.`,
              source_excerpt: rule.source_excerpt,
              item_id: next.id,
              product_code: next.material_code,
              sequence_order: next.sequence_order,
              date_str: next.date_str,
              impact_description: `Risco iminente de quebra de ferramental, desgaste prematuro ou não conformidade do lote.`,
              recommended_action: `Intercalar outro lote compatível ou realizar campanha com troca completa de cilindros.`,
            })
          }
        }
      }

      // 3.3 PRODUTIVIDADE & CADÊNCIA (ex: cadência máxima ou nominal específica)
      if (rule.category === 'PRODUCTIVITY' && rule.cadence_th) {
        for (const item of productionItems) {
          const matchesProduct =
            !rule.product_to ||
            item.material_code === rule.product_to ||
            item.family_code === rule.product_to

          if (matchesProduct) {
            parametersUsed.push({
              rule_id: rule.rule_id,
              document_code: rule.document_code,
              parameter: 'cadencia_th',
              value: rule.cadence_th,
              unit: 't/h',
              item_id: item.id,
            })

            // Verificar conflito com Ficha Mestra
            const masterCadence = item.productivity_rate_th || lineOverview?.nominal_hourly_capacity
            if (masterCadence && Math.abs(masterCadence - rule.cadence_th) > 0.5) {
              conflicts.push({
                parameter: 'Cadência Operacional (t/h)',
                source_a: {
                  name: 'Ficha Mestra / Programação',
                  value: `${masterCadence} t/h`,
                },
                source_b: {
                  name: `Documento SGQ (${rule.document_code})`,
                  value: `${rule.cadence_th} t/h`,
                  document_code: rule.document_code,
                  revision: rule.revision,
                },
                item_id: item.id,
                product_code: item.material_code,
                description: `Divergência entre a cadência programada (${masterCadence} t/h) e o limite oficial do documento ${rule.document_code} (${rule.cadence_th} t/h).`,
              })
            }

            // Se for LIMITE e a cadência programada exceder o limite
            if (rule.rule_type === 'LIMITE' && masterCadence && masterCadence > rule.cadence_th) {
              mandatoryViolations.push({
                rule_id: rule.rule_id,
                document_code: rule.document_code,
                revision: rule.revision,
                category: 'PRODUCTIVITY',
                rule_type: 'LIMITE',
                description: `Cadência programada de ${masterCadence} t/h excede o limite técnico de ${rule.cadence_th} t/h fixado no documento ${rule.document_code}.`,
                source_excerpt: rule.source_excerpt,
                item_id: item.id,
                product_code: item.material_code,
                sequence_order: item.sequence_order,
                date_str: item.date_str,
                impact_description: `Risco de superaquecimento ou perda de tolerância mecânica do produto final.`,
                recommended_action: `Ajustar a cadência operacional para no máximo ${rule.cadence_th} t/h.`,
              })
            } else {
              rulesSatisfied.push({
                rule_id: rule.rule_id,
                document_code: rule.document_code,
                revision: rule.revision,
                category: 'PRODUCTIVITY',
                rule_type: rule.rule_type,
                description: `Cadência de ${rule.cadence_th} t/h observada e registrada para ${item.material_code}.`,
                item_id: item.id,
              })
            }
          }
        }
      }

      // 3.4 RECOMENDAÇÕES (não bloqueantes)
      if (rule.rule_type === 'RECOMENDACAO') {
        recommendations.push({
          rule_id: rule.rule_id,
          document_code: rule.document_code,
          revision: rule.revision,
          category: rule.category,
          description: rule.action_or_restriction,
          source_excerpt: rule.source_excerpt,
          action_label: 'Aplicar sugestão do SGQ',
        })
      }
    }

    const blockingCount = mandatoryViolations.length
    const passed = blockingCount === 0

    return {
      passed,
      blocking_violations_count: blockingCount,
      warnings_count: conflicts.length,
      recommendations_count: recommendations.length,
      rules_considered_count: activeRules.length,
      considered_documents: consideredDocs,
      rules_satisfied: rulesSatisfied,
      mandatory_violations: mandatoryViolations,
      recommendations,
      parameters_used: parametersUsed,
      conflicts,
    }
  }

  /**
   * Avalia os impactos de regras SGQ específicas para um determinado item da programação,
   * permitindo exibir o indicador discreto "📄 Regra SGQ aplicada" com popover explicativo.
   */
  getItemImpacts(
    item: Partial<WeeklyScheduleItem> | WeeklyScheduleItem,
    validationResult: DocumentValidationResult,
    lineDocs: LineReferenceDocument[],
  ): ScheduleItemDocumentImpact[] {
    const impacts: ScheduleItemDocumentImpact[] = []

    // Impacto de violações
    const itemViolations = validationResult.mandatory_violations.filter(
      (v) => v.item_id === item.id,
    )
    for (const v of itemViolations) {
      const doc = lineDocs.find((d) => d.document_code === v.document_code)
      impacts.push({
        document_code: v.document_code,
        revision: v.revision,
        rule_id: v.rule_id,
        category: v.category,
        rule_type: v.rule_type,
        interference_title: `Restrição Documental: ${v.rule_type}`,
        source_excerpt: v.source_excerpt,
        impact_realized: v.description,
        original_url: doc?.original_url,
      })
    }

    // Impacto de regras satisfeitas / parâmetros aplicados
    const itemParams = validationResult.parameters_used.filter((p) => p.item_id === item.id)
    for (const p of itemParams) {
      const doc = lineDocs.find((d) => d.document_code === p.document_code)
      impacts.push({
        document_code: p.document_code,
        revision: doc?.revision || 'Rev.01',
        rule_id: p.rule_id,
        category: 'PRODUCTIVITY',
        rule_type: 'PARAMETRO_TECNICO',
        interference_title: `Parâmetro Oficial: ${p.parameter}`,
        source_excerpt: `Valor fixado em ${p.value} ${p.unit || ''}`,
        impact_realized: `Parâmetro ${p.parameter} aplicado ao cálculo operacional do lote.`,
        original_url: doc?.original_url,
      })
    }

    // Se o item for de SETUP gerado ou influenciado por regra
    if (item.item_type === 'SETUP' && item.setup_duration_minutes) {
      const relatedDoc = lineDocs.find((d) => d.interference_categories.includes('SETUP'))
      if (relatedDoc) {
        impacts.push({
          document_code: relatedDoc.document_code,
          revision: relatedDoc.revision,
          rule_id: `SETUP-${item.id}`,
          category: 'SETUP',
          rule_type: 'OBRIGATORIA',
          interference_title: 'Setup Padronizado por Procedimento SGQ',
          source_excerpt: `Tempo de preparação mínimo estabelecido para a linha.`,
          impact_realized: `Adicionado setup de ${item.setup_duration_minutes} minutos entre lotes consecutivos.`,
          original_url: relatedDoc.original_url,
        })
      }
    }

    return impacts
  }

  /**
   * Gera o Snapshot das Regras Documentais vigentes para associar à versão da programação,
   * garantindo rastreabilidade histórica e imutabilidade de explicações passadas.
   */
  createRulesSnapshot(
    validationResult: DocumentValidationResult,
    context: ValidationContext,
  ): DocumentRulesSnapshot {
    return {
      snapshot_id: `SNAP-DOC-${Date.now()}`,
      created_at: new Date().toISOString(),
      user_email: context.userEmail || 'sistema@ciafal.com.br',
      user_name: context.userName || 'PCP Robotizado',
      schedule_code: context.scheduleCode || `WS-${context.lineCode}`,
      version_number: context.versionNumber || 1,
      documents_considered: validationResult.considered_documents,
      rules_applied: validationResult.rules_satisfied.map((s) => ({
        rule_id: s.rule_id,
        document_id: '',
        document_code: s.document_code,
        revision: s.revision,
        category: s.category,
        rule_type: s.rule_type,
        condition: '',
        action_or_restriction: s.description,
        priority: 1,
        source_excerpt: '',
        page_or_section: '',
        confidence_level: 1,
        processed_at: new Date().toISOString(),
        status: 'ATIVA',
        requires_human_review: false,
      })),
      violations: validationResult.mandatory_violations,
      recommendations: validationResult.recommendations,
      conflicts: validationResult.conflicts,
      validation_outcome:
        validationResult.blocking_violations_count > 0
          ? 'BLOQUEADO'
          : validationResult.warnings_count > 0
            ? 'APROVADO_COM_RESSALVAS'
            : 'APROVADO',
    }
  }
}

export const documentRulesEngine = new DocumentRulesEngine()
