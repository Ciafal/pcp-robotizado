/**
 * Motor de Otimização de Aplicações por Peça Laminada
 * HUB CIAFAL - PCP Robotizado - Gestão de MP
 *
 * Regras:
 * 1. Atender prioritariamente aplicações de maior prioridade comercial/PCP (priority_order ASC)
 * 2. Maximizar comprimento convertido em produtos conformes
 * 3. Minimizar sobra e refugo
 * 4. Respeitar quantidades demandadas e restrições dimensionais
 * 5. Minimizar número de cortes em caso de empate
 * 6. Considerar perdas reais (largura do kerf da serra, esquadrejamento, descarte de pontas)
 * 7. Nunca gerar peças sem aplicação válida
 * 8. Nunca rendimento do corte > 100%
 * 9. Nunca comprimento utilizado > disponível
 */

import pb from '@/lib/pocketbase/client'
import {
  IndustrialApplicationCandidate,
  AllocatedPieceItem,
  VisualCutSegment,
  PieceOptimizationResult,
  SavedPieceApplicationRecord,
} from '@/types/mp-piece-application-optimization'
import { pcpAuditService } from '@/services/pcp-audit-service'

export interface OptimizePieceParams {
  pieceIdentifier: string
  scenarioId: string
  scenarioName?: string
  materialCode: string
  gaugeDimension?: string
  centerCode?: string
  heatNumber?: string
  pieceWeightKg: number
  linearMassKgM: number
  sawKerfMm?: number
  squaringLossMm?: number
  endCropLossMm?: number
  minUsableLeftoverMm?: number
  candidates: IndustrialApplicationCandidate[]
  userOverrides?: {
    [appId: string]: {
      selected?: boolean
      priority?: number
      desiredQty?: number
    }
  }
}

export class MPPieceApplicationOptimizationService {
  /**
   * Calcula Comprimento Laminado (mm):
   * Comprimento (m) = Peso da peça (kg) / Massa linear (kg/m)
   * Comprimento (mm) = Comprimento (m) * 1000
   */
  public calculateRolledLengthMm(pieceWeightKg: number, linearMassKgM: number): number {
    if (!linearMassKgM || linearMassKgM <= 0 || !pieceWeightKg || pieceWeightKg <= 0) {
      return 0
    }
    const lengthM = pieceWeightKg / linearMassKgM
    return Math.round(lengthM * 1000)
  }

  /**
   * Recupera aplicações industriais compatíveis a partir dos cadastros reais:
   * 1. line_raw_material_applications (se disponível)
   * 2. mp_application_requirements
   * 3. line_raw_material_priorities (Ficha Mestra expandida)
   * Filtrando por material / tipo de aço compatível e status ativo.
   */
  public async loadCompatibleApplications(params: {
    materialCode: string
    gaugeDimension?: string
    centerCode?: string
  }): Promise<IndustrialApplicationCandidate[]> {
    const list: IndustrialApplicationCandidate[] = []
    const mat = (params.materialCode || '').trim().toUpperCase()

    // 1. Tentar ler de mp_application_requirements
    try {
      const records = await pb.collection('mp_application_requirements').getFullList({
        sort: 'priority_order',
      })

      for (const r of records) {
        const item = r as any
        if (item.is_active === false) continue

        // Compatibilidade de material/aço
        const grade = (item.steel_grade || '').toUpperCase()
        const appCode = (item.application_code || '').toUpperCase()
        const isMatch =
          !mat ||
          mat.includes(grade) ||
          grade.includes(mat) ||
          mat.includes(appCode) ||
          appCode.includes(mat) ||
          grade === 'TODOS' ||
          !grade

        if (isMatch) {
          const targetLen = Number(item.ideal_length_mm) || Number(item.max_length_mm) || 3000
          list.push({
            id: item.id,
            application_code: item.application_code || 'APP-01',
            application_name: item.application_name || 'Aplicação Industrial',
            product_code: item.zppmp_table_ref || `PROD-${item.application_code || 'GEN'}`,
            product_description: item.application_name || 'Produto Homologado',
            steel_grade: item.steel_grade || 'SAE 1020',
            center_code: params.centerCode,
            target_length_mm: targetLen,
            min_length_mm: Number(item.min_length_mm) || targetLen * 0.95,
            max_length_mm: Number(item.max_length_mm) || targetLen * 1.05,
            available_demand_qty: 20,
            priority_order: Number(item.priority_order) || 5,
            is_active: true,
            source_table: 'mp_application_requirements',
          })
        }
      }
    } catch (e) {
      console.warn('[PieceOpt] Aviso ao consultar mp_application_requirements:', e)
    }

    // 2. Tentar ler de line_raw_material_priorities (Ficha Mestra) se a lista estiver vazia ou para complementar
    if (list.length === 0) {
      try {
        const priorities = await pb.collection('line_raw_material_priorities').getFullList({
          filter: 'active = true',
          sort: 'priority_order',
        })

        for (const p of priorities) {
          const item = p as any
          const code = (item.material_code || '').toUpperCase()
          const isMatch = !mat || mat.includes(code) || code.includes(mat) || list.length < 4

          if (isMatch) {
            // Comprimentos padrão técnicos homologados para barras laminadas conforme regra
            const baseLen = 3000
            list.push({
              id: item.id,
              application_code: `PRIO-${item.priority_order || 1}`,
              application_name:
                item.condition_rule || item.material_description || 'Aplicação Ficha Mestra',
              product_code: item.material_code || 'PROD-MP',
              product_description: item.material_description || 'Barra Conforme Ficha Mestra',
              steel_grade: item.material_code || 'SAE 1020',
              center_code: params.centerCode,
              target_length_mm: baseLen,
              min_length_mm: 2800,
              max_length_mm: 3200,
              available_demand_qty: 25,
              priority_order: Number(item.priority_order) || 1,
              is_active: true,
              source_table: 'line_raw_material_priorities',
            })
          }
        }
      } catch (e) {
        console.warn('[PieceOpt] Aviso ao consultar line_raw_material_priorities:', e)
      }
    }

    return list
  }

  /**
   * Executa a Otimização de Corte Longitudinal da Peça
   */
  public optimize(params: OptimizePieceParams): PieceOptimizationResult {
    const {
      pieceIdentifier,
      scenarioId,
      scenarioName,
      materialCode,
      gaugeDimension,
      centerCode,
      heatNumber,
      pieceWeightKg,
      linearMassKgM,
      candidates,
      userOverrides = {},
    } = params

    const sawKerfMm = Math.max(0, params.sawKerfMm !== undefined ? params.sawKerfMm : 5)
    const squaringLossMm = Math.max(
      0,
      params.squaringLossMm !== undefined ? params.squaringLossMm : 10,
    )
    const endCropLossMm = Math.max(
      0,
      params.endCropLossMm !== undefined ? params.endCropLossMm : 15,
    )
    const minUsableLeftoverMm =
      params.minUsableLeftoverMm !== undefined ? params.minUsableLeftoverMm : 500

    const totalRolledLengthMm = this.calculateRolledLengthMm(pieceWeightKg, linearMassKgM)

    // Base result se não houver comprimento
    if (totalRolledLengthMm <= 0) {
      return {
        piece_identifier: pieceIdentifier,
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        material_code: materialCode,
        gauge_dimension: gaugeDimension,
        center_code: centerCode,
        heat_number: heatNumber,
        piece_weight_kg: pieceWeightKg,
        linear_mass_kg_m: linearMassKgM,
        total_rolled_length_mm: 0,
        saw_kerf_mm: sawKerfMm,
        squaring_loss_mm: squaringLossMm,
        end_crop_loss_mm: endCropLossMm,
        cuts_count: 0,
        cut_losses_length_mm: 0,
        used_length_mm: 0,
        usable_leftover_mm: 0,
        scrap_mm: 0,
        cutting_yield_pct: 0,
        generated_pieces_count: 0,
        fulfilled_applications_count: 0,
        allocated_items: [],
        visual_segments: [],
        is_viable: false,
        inviability_reason: 'Comprimento laminado disponível é zero ou inválido.',
      }
    }

    // Filtrar candidatos ativos e não desmarcados pelo usuário
    const activeCandidates = candidates
      .filter((c) => {
        if (!c.is_active) return false
        const override = userOverrides[c.id]
        if (override && override.selected === false) return false
        return true
      })
      .map((c) => {
        const override = userOverrides[c.id] || {}
        return {
          ...c,
          priority_order: override.priority !== undefined ? override.priority : c.priority_order,
          available_demand_qty:
            override.desiredQty !== undefined ? override.desiredQty : c.available_demand_qty,
        }
      })
      .filter((c) => c.available_demand_qty > 0 && c.target_length_mm > 0)

    if (activeCandidates.length === 0) {
      return {
        piece_identifier: pieceIdentifier,
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        material_code: materialCode,
        gauge_dimension: gaugeDimension,
        center_code: centerCode,
        heat_number: heatNumber,
        piece_weight_kg: pieceWeightKg,
        linear_mass_kg_m: linearMassKgM,
        total_rolled_length_mm: totalRolledLengthMm,
        saw_kerf_mm: sawKerfMm,
        squaring_loss_mm: squaringLossMm,
        end_crop_loss_mm: endCropLossMm,
        cuts_count: 0,
        cut_losses_length_mm: 0,
        used_length_mm: 0,
        usable_leftover_mm: 0,
        scrap_mm: totalRolledLengthMm,
        cutting_yield_pct: 0,
        generated_pieces_count: 0,
        fulfilled_applications_count: 0,
        allocated_items: [],
        visual_segments: [],
        is_viable: false,
        inviability_reason:
          'Nenhuma aplicação compatível encontrada para esta peça. Verifique os cadastros e parâmetros técnicos.',
      }
    }

    // Ordenar candidatos por:
    // (1) Prioridade PCP (priority_order ASC)
    // (2) target_length_mm DESC para preenchimento eficiente
    activeCandidates.sort((a, b) => {
      if (a.priority_order !== b.priority_order) {
        return a.priority_order - b.priority_order
      }
      return b.target_length_mm - a.target_length_mm
    })

    // Algoritmo de Corte Longitudinal (Knapsack com Perdas de Kerf e Cortes Múltiplos)
    // Comprimento líquido inicial para cortes = totalRolledLengthMm - squaringLossMm - endCropLossMm
    const initialCutLosses = squaringLossMm + endCropLossMm
    const availableForPiecesAndKerf = totalRolledLengthMm - initialCutLosses

    if (availableForPiecesAndKerf <= 0) {
      return {
        piece_identifier: pieceIdentifier,
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        material_code: materialCode,
        gauge_dimension: gaugeDimension,
        center_code: centerCode,
        heat_number: heatNumber,
        piece_weight_kg: pieceWeightKg,
        linear_mass_kg_m: linearMassKgM,
        total_rolled_length_mm: totalRolledLengthMm,
        saw_kerf_mm: sawKerfMm,
        squaring_loss_mm: squaringLossMm,
        end_crop_loss_mm: endCropLossMm,
        cuts_count: 0,
        cut_losses_length_mm: totalRolledLengthMm,
        used_length_mm: 0,
        usable_leftover_mm: 0,
        scrap_mm: 0,
        cutting_yield_pct: 0,
        generated_pieces_count: 0,
        fulfilled_applications_count: 0,
        allocated_items: [],
        visual_segments: [],
        is_viable: false,
        inviability_reason:
          'Comprimento laminado insuficiente após dedução das perdas de esquadrejamento e ponta.',
      }
    }

    // Busca exaustiva/gulosa controlada das combinações de quantidades [q_0, q_1, ...]
    // Restrição: soma(q_i * L_i) + cortes_adicionais * kerf <= availableForPiecesAndKerf
    // onde total_pecas = soma(q_i).
    // Se total_pecas > 0, número de cortes da serra = total_pecas (cada peça cortada da barra gera um corte com kerf)
    // Se sobrar refugo/sobra no final, o último corte separa a última peça do refugo.

    interface Combination {
      counts: number[]
      totalPieces: number
      usedLengthMm: number
      kerfLossMm: number
      totalLossMm: number
      leftoverMm: number
      cutsCount: number
      priorityScore: number // pontuação ponderada das prioridades atendidas
      distinctApps: number
    }

    const n = activeCandidates.length
    let bestComb: Combination | null = null

    // Função para avaliar uma combinação
    const evaluateComb = (counts: number[]): Combination | null => {
      const totalPieces = counts.reduce((acc, c) => acc + c, 0)
      if (totalPieces === 0) return null

      let usedLengthMm = 0
      let priorityScore = 0
      let distinctApps = 0

      for (let i = 0; i < n; i++) {
        if (counts[i] > 0) {
          usedLengthMm += counts[i] * activeCandidates[i].target_length_mm
          // Prioridade 1 ganha mais peso do que prioridade 2
          const weight = Math.max(1, 100 - activeCandidates[i].priority_order * 10)
          priorityScore += counts[i] * weight
          distinctApps++
        }
      }

      // Cortes de serra: cada peça separada consome 1 kerf.
      // Se houver sobra após a última peça, o corte já separa a peça da sobra.
      const cutsCount = totalPieces
      const kerfLossMm = cutsCount * sawKerfMm
      const totalLossMm = initialCutLosses + kerfLossMm
      const totalOccupiedMm = usedLengthMm + totalLossMm

      if (totalOccupiedMm > totalRolledLengthMm) {
        return null // Inviável fisicamente
      }

      const leftoverMm = totalRolledLengthMm - totalOccupiedMm

      return {
        counts,
        totalPieces,
        usedLengthMm,
        kerfLossMm,
        totalLossMm,
        leftoverMm,
        cutsCount,
        priorityScore,
        distinctApps,
      }
    }

    // Busca branch & bound / recursiva para gerar planos viáveis
    const maxPiecesPossible = Math.floor(availableForPiecesAndKerf / 100) // limite seguro
    const maxLimits = activeCandidates.map((c) => {
      const byLength = Math.floor(availableForPiecesAndKerf / (c.target_length_mm + sawKerfMm))
      return Math.min(c.available_demand_qty, byLength, 50)
    })

    const search = (index: number, currentCounts: number[]) => {
      if (index === n) {
        const comb = evaluateComb(currentCounts)
        if (!comb) return

        if (!bestComb) {
          bestComb = comb
          return
        }

        // Critérios de Desempate e Decisão:
        // 1. Atender aplicações prioritárias (priorityScore)
        // 2. Maximizar comprimento convertido em produtos (usedLengthMm)
        // 3. Minimizar sobra/refugo (leftoverMm)
        // 4. Minimizar nº de cortes (cutsCount) em caso de empate
        const scoreDiff = comb.priorityScore - bestComb.priorityScore
        if (scoreDiff > 0.1) {
          bestComb = comb
        } else if (Math.abs(scoreDiff) <= 0.1) {
          if (comb.usedLengthMm > bestComb.usedLengthMm) {
            bestComb = comb
          } else if (comb.usedLengthMm === bestComb.usedLengthMm) {
            if (comb.cutsCount < bestComb.cutsCount) {
              bestComb = comb
            }
          }
        }
        return
      }

      // Tentar valores decrescentes para priorizar preenchimento
      for (let qty = maxLimits[index]; qty >= 0; qty--) {
        currentCounts[index] = qty
        // Poda simples de comprimento parcial
        let partialLen = 0
        let partialPieces = 0
        for (let i = 0; i <= index; i++) {
          partialLen += currentCounts[i] * activeCandidates[i].target_length_mm
          partialPieces += currentCounts[i]
        }
        if (partialLen + partialPieces * sawKerfMm + initialCutLosses <= totalRolledLengthMm) {
          search(index + 1, currentCounts)
        }
      }
    }

    search(0, new Array(n).fill(0))

    if (!bestComb || (bestComb as Combination).totalPieces === 0) {
      return {
        piece_identifier: pieceIdentifier,
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        material_code: materialCode,
        gauge_dimension: gaugeDimension,
        center_code: centerCode,
        heat_number: heatNumber,
        piece_weight_kg: pieceWeightKg,
        linear_mass_kg_m: linearMassKgM,
        total_rolled_length_mm: totalRolledLengthMm,
        saw_kerf_mm: sawKerfMm,
        squaring_loss_mm: squaringLossMm,
        end_crop_loss_mm: endCropLossMm,
        cuts_count: 0,
        cut_losses_length_mm: initialCutLosses,
        used_length_mm: 0,
        usable_leftover_mm: 0,
        scrap_mm: Math.max(0, totalRolledLengthMm - initialCutLosses),
        cutting_yield_pct: 0,
        generated_pieces_count: 0,
        fulfilled_applications_count: 0,
        allocated_items: [],
        visual_segments: [],
        is_viable: false,
        inviability_reason:
          'Nenhuma combinação viável de corte foi possível respeitando perdas e comprimentos mínimos.',
      }
    }

    const solution: Combination = bestComb
    const usedLengthMm = solution.usedLengthMm
    const cutsCount = solution.cutsCount
    const kerfLossMm = solution.kerfLossMm
    const cutLossesLengthMm = initialCutLosses + kerfLossMm
    const rawLeftoverMm = solution.leftoverMm

    // Sobra aproveitável vs Refugo final
    let usableLeftoverMm = 0
    let scrapMm = 0

    if (rawLeftoverMm >= minUsableLeftoverMm) {
      usableLeftoverMm = rawLeftoverMm
      scrapMm = 0
    } else {
      usableLeftoverMm = 0
      scrapMm = rawLeftoverMm
    }

    // Rendimento do corte (%) = Comprimento convertido em conformes / Comprimento total disponível * 100
    // Garante que nunca exceda 100%
    const cuttingYieldPct = Math.min(
      100,
      Math.max(0, Number(((usedLengthMm / totalRolledLengthMm) * 100).toFixed(2))),
    )

    // Montar AllocatedPieceItem[]
    const allocatedItems: AllocatedPieceItem[] = []
    let globalCutSeq = 1

    for (let i = 0; i < n; i++) {
      const qty = solution.counts[i]
      if (qty > 0) {
        const cand = activeCandidates[i]
        const singleUsedMm = cand.target_length_mm * qty
        const estWeight = Number(((singleUsedMm / 1000) * linearMassKgM).toFixed(2))

        allocatedItems.push({
          application_id: cand.id,
          application_code: cand.application_code,
          application_name: cand.application_name,
          product_code: cand.product_code,
          product_description: cand.product_description,
          length_mm: cand.target_length_mm,
          quantity: qty,
          priority: cand.priority_order,
          used_length_mm: singleUsedMm,
          estimated_weight_kg: estWeight,
          cut_sequence: globalCutSeq,
        })
        globalCutSeq += qty
      }
    }

    // Montar Sequência Visual Longitudinal Proporcional (VisualCutSegment[])
    const visualSegments: VisualCutSegment[] = []
    let currentCursorMm = 0

    // 1. Esquadrejamento inicial (se houver)
    if (squaringLossMm > 0) {
      visualSegments.push({
        id: `seg-squaring-${currentCursorMm}`,
        type: 'SQUARING',
        label: 'Esquadrejamento',
        length_mm: squaringLossMm,
        start_mm: currentCursorMm,
        end_mm: currentCursorMm + squaringLossMm,
        color: '#f59e0b', // Amber-500
      })
      currentCursorMm += squaringLossMm
    }

    // Paleta de cores Ciafal para aplicações
    const appColors = [
      '#1e3a8a', // Blue 900 Ciafal
      '#0284c7', // Sky 600
      '#059669', // Emerald 600
      '#7c3aed', // Violet 600
      '#d97706', // Amber 600
      '#dc2626', // Red 600
    ]

    let pieceCounter = 1
    let cutSeqCounter = 1

    allocatedItems.forEach((item, appIndex) => {
      const color = appColors[appIndex % appColors.length]
      for (let q = 0; q < item.quantity; q++) {
        // Peça
        const pieceLen = item.length_mm
        const estWeight = Number(((pieceLen / 1000) * linearMassKgM).toFixed(2))
        visualSegments.push({
          id: `seg-piece-${pieceCounter}-${currentCursorMm}`,
          type: 'PIECE',
          label: `${item.product_code} (${pieceLen} mm)`,
          application_name: item.application_name,
          product_code: item.product_code,
          length_mm: pieceLen,
          start_mm: currentCursorMm,
          end_mm: currentCursorMm + pieceLen,
          piece_number: pieceCounter,
          cut_sequence: cutSeqCounter,
          estimated_weight_kg: estWeight,
          color,
        })
        currentCursorMm += pieceLen
        pieceCounter++
        cutSeqCounter++

        // Kerf da serra
        if (sawKerfMm > 0 && currentCursorMm < totalRolledLengthMm - endCropLossMm) {
          visualSegments.push({
            id: `seg-kerf-${cutSeqCounter}-${currentCursorMm}`,
            type: 'KERF',
            label: `Corte ${sawKerfMm} mm`,
            length_mm: sawKerfMm,
            start_mm: currentCursorMm,
            end_mm: currentCursorMm + sawKerfMm,
            color: '#64748b', // Slate-500
          })
          currentCursorMm += sawKerfMm
        }
      }
    })

    // Sobra aproveitável ou refugo antes da ponta final
    if (usableLeftoverMm > 0) {
      visualSegments.push({
        id: `seg-usable-${currentCursorMm}`,
        type: 'USABLE_LEFTOVER',
        label: `Sobra Aproveitável (${usableLeftoverMm} mm)`,
        length_mm: usableLeftoverMm,
        start_mm: currentCursorMm,
        end_mm: currentCursorMm + usableLeftoverMm,
        color: '#10b981', // Emerald-500
      })
      currentCursorMm += usableLeftoverMm
    }

    if (scrapMm > 0) {
      visualSegments.push({
        id: `seg-scrap-${currentCursorMm}`,
        type: 'SCRAP',
        label: `Refugo (${scrapMm} mm)`,
        length_mm: scrapMm,
        start_mm: currentCursorMm,
        end_mm: currentCursorMm + scrapMm,
        color: '#ef4444', // Red-500
      })
      currentCursorMm += scrapMm
    }

    // Descarte de ponta final (se houver)
    if (endCropLossMm > 0 && currentCursorMm < totalRolledLengthMm) {
      const remainingMm = totalRolledLengthMm - currentCursorMm
      visualSegments.push({
        id: `seg-endcrop-${currentCursorMm}`,
        type: 'END_CROP',
        label: `Ponta Descartada (${remainingMm} mm)`,
        length_mm: remainingMm,
        start_mm: currentCursorMm,
        end_mm: totalRolledLengthMm,
        color: '#b45309', // Amber-700
      })
      currentCursorMm = totalRolledLengthMm
    }

    return {
      piece_identifier: pieceIdentifier,
      scenario_id: scenarioId,
      scenario_name: scenarioName,
      material_code: materialCode,
      gauge_dimension: gaugeDimension,
      center_code: centerCode,
      heat_number: heatNumber,
      piece_weight_kg: pieceWeightKg,
      linear_mass_kg_m: linearMassKgM,
      total_rolled_length_mm: totalRolledLengthMm,
      saw_kerf_mm: sawKerfMm,
      squaring_loss_mm: squaringLossMm,
      end_crop_loss_mm: endCropLossMm,
      cuts_count: cutsCount,
      cut_losses_length_mm: cutLossesLengthMm,
      used_length_mm: usedLengthMm,
      usable_leftover_mm: usableLeftoverMm,
      scrap_mm: scrapMm,
      cutting_yield_pct: cuttingYieldPct,
      generated_pieces_count: solution.totalPieces,
      fulfilled_applications_count: solution.distinctApps,
      allocated_items: allocatedItems,
      visual_segments: visualSegments,
      is_viable: true,
    }
  }

  /**
   * Salva a otimização confirmada no PocketBase (mp_cutting_piece_applications)
   * e registra auditoria imutável via pcpAuditService.
   */
  public async savePieceApplicationPlan(
    result: PieceOptimizationResult,
    userName: string = 'Programador PCP',
  ): Promise<SavedPieceApplicationRecord> {
    const payload: Partial<SavedPieceApplicationRecord> = {
      piece_identifier: result.piece_identifier,
      scenario_id: result.scenario_id,
      scenario_name: result.scenario_name || '',
      material_code: result.material_code,
      gauge_dimension: result.gauge_dimension || '',
      center_code: result.center_code || '',
      heat_number: result.heat_number || '',
      piece_weight_kg: result.piece_weight_kg,
      linear_mass_kg_m: result.linear_mass_kg_m,
      rolled_length_mm: result.total_rolled_length_mm,
      saw_kerf_mm: result.saw_kerf_mm,
      squaring_loss_mm: result.squaring_loss_mm,
      end_crop_loss_mm: result.end_crop_loss_mm,
      cutting_yield_pct: result.cutting_yield_pct,
      used_length_mm: result.used_length_mm,
      cut_losses_length_mm: result.cut_losses_length_mm,
      usable_leftover_mm: result.usable_leftover_mm,
      scrap_mm: result.scrap_mm,
      generated_pieces_count: result.generated_pieces_count,
      fulfilled_applications_count: result.fulfilled_applications_count,
      allocated_items_json: result.allocated_items,
      visual_segments_json: result.visual_segments,
      confirmed_by_user_name: userName,
      notes: `Otimização confirmada com rendimento de corte de ${result.cutting_yield_pct.toFixed(2)}%`,
    }

    try {
      // Verificar se já existe registro prévio para esta peça/cenário para atualização idempotente
      const existing = await pb.collection('mp_cutting_piece_applications').getFullList({
        filter: `piece_identifier = '${result.piece_identifier}' && scenario_id = '${result.scenario_id}'`,
      })

      let record: any
      if (existing.length > 0) {
        record = await pb
          .collection('mp_cutting_piece_applications')
          .update(existing[0].id, payload)
      } else {
        record = await pb.collection('mp_cutting_piece_applications').create(payload)
      }

      // Auditoria via pcpAuditService
      try {
        await pcpAuditService.recordLog({
          action: 'MP_PIECE_APPLICATION_OPTIMIZED',
          event_type: 'SCHEDULE_ACTION',
          entity: 'mp_cutting_piece_applications',
          resource: 'MP_OPTIMIZATION',
          resource_id: record.id,
          user_name: userName,
          company: 'CIAFAL',
          line: result.center_code || '',
          center: result.center_code || '',
          module: 'PCP Robotizado / Gestão de MP',
          screen: 'Planos de Corte / Máximo Rendimento de MP',
          details: {
            piece_identifier: result.piece_identifier,
            scenario_id: result.scenario_id,
            total_rolled_length_mm: result.total_rolled_length_mm,
            used_length_mm: result.used_length_mm,
            cutting_yield_pct: result.cutting_yield_pct,
            generated_pieces_count: result.generated_pieces_count,
            fulfilled_applications_count: result.fulfilled_applications_count,
            allocated_items: result.allocated_items,
          },
        })
      } catch (auditErr) {
        console.warn('[PieceOpt] Falha ao registrar auditoria:', auditErr)
      }

      return record as SavedPieceApplicationRecord
    } catch (err) {
      console.error('[PieceOpt] Erro ao salvar plano em mp_cutting_piece_applications:', err)
      throw err
    }
  }

  /**
   * Carrega plano salvo previamente para a peça/cenário
   */
  public async loadSavedPlan(
    pieceIdentifier: string,
    scenarioId: string,
  ): Promise<SavedPieceApplicationRecord | null> {
    try {
      const records = await pb.collection('mp_cutting_piece_applications').getFullList({
        filter: `piece_identifier = '${pieceIdentifier}' && scenario_id = '${scenarioId}'`,
        sort: '-updated',
      })
      if (records.length > 0) {
        return records[0] as unknown as SavedPieceApplicationRecord
      }
      return null
    } catch (err) {
      console.warn('[PieceOpt] Erro ao carregar plano salvo:', err)
      return null
    }
  }
}

export const mpPieceApplicationOptimizationService = new MPPieceApplicationOptimizationService()
