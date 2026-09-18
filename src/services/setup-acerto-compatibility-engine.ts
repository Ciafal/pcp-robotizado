import {
  LineAdjustmentTimeRule,
  LineSetupMatrix,
  SetupAcertoCompatibilityStatus,
  SetupAcertoComparisonItem,
  SetupAcertoCompatibilitySummary,
} from '@/types/line-master'

export class SetupAcertoCompatibilityEngine {
  /**
   * Avalia a compatibilidade estruturada entre Matriz de Setup DE→PARA e Matriz de Acertos.
   *
   * Regras centrais:
   * 1. TODO SETUP ATIVO CADASTRADO DEVE POSSUIR PELO MENOS UM TEMPO DE ACERTO ATIVO COMPATÍVEL.
   * 2. Relação estruturada (campos/vínculos): mesmo contexto de Linha, Empresa/Centro quando aplicável,
   *    material de destino (to_product_code) ou família de destino (to_family_id/family_code),
   *    vigência válida e status ativo.
   * 3. NUNCA SOMAR Setup e Acerto: tempos independentes.
   * 4. Identificar pendências e calcular taxa de compatibilidade (% = setups ativos com acerto ÷ total de setups ativos × 100).
   */
  public static evaluateCompatibility(params: {
    lineId: string
    setupList: LineSetupMatrix[]
    acertoList: LineAdjustmentTimeRule[]
    referenceDate?: string | Date
  }): SetupAcertoCompatibilitySummary {
    const { lineId, setupList, acertoList, referenceDate = new Date() } = params
    const refDateStr =
      typeof referenceDate === 'string'
        ? referenceDate.slice(0, 10)
        : referenceDate.toISOString().slice(0, 10)

    const lineSetups = setupList.filter((s) => !lineId || s.line_id === lineId)
    const lineAcertos = acertoList.filter((a) => !lineId || a.line_id === lineId)

    const activeSetups = lineSetups.filter((s) => s.active !== false)
    const activeAcertos = lineAcertos.filter((a) => a.active !== false)

    // Conjunto de IDs de acertos que foram associados a pelo menos um setup ativo
    const linkedAcertoIds = new Set<string>()

    // Função auxiliar para calcular vigência com base na data de referência
    const getVigencyStatus = (
      validFrom?: string,
      validUntil?: string,
    ): 'Vigente' | 'Futuro' | 'Vencido' | 'Vigência incompleta' => {
      if (
        !validUntil ||
        String(validUntil).trim() === '' ||
        !validFrom ||
        String(validFrom).trim() === ''
      ) {
        return 'Vigência incompleta'
      }
      const fromStr = String(validFrom).slice(0, 10)
      const untilStr = String(validUntil).slice(0, 10)
      if (refDateStr < fromStr) return 'Futuro'
      if (refDateStr > untilStr) return 'Vencido'
      return 'Vigente'
    }

    const items: SetupAcertoComparisonItem[] = lineSetups.map((setup) => {
      const isSetupActive = setup.active !== false
      const toProduct = (setup.to_product_code || '').trim().toUpperCase()
      const toFamilyCode = (setup.expand?.to_family_id?.code || (setup as any).to_family_code || '')
        .trim()
        .toUpperCase()
      const targetLabel = toProduct || toFamilyCode || 'Qualquer / Geral'
      const setupVigencyStatus = getVigencyStatus(setup.valid_from, setup.valid_until)

      // Setup inativo -> SETUP_INATIVO (não participa de novas programações nem pendência obrigatória)
      if (!isSetupActive) {
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'INACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          matchingAcertos: [],
          compatibility: 'SETUP_INACTIVE',
          compatibilityLabel: 'SETUP INATIVO',
          isPending: false,
          setupVigencyStatus,
        }
      }

      // Se o próprio Setup ativo está com vigência incompleta (sem Data Fim)
      const isSetupVigencyIncomplete = !setup.valid_until || String(setup.valid_until).trim() === ''
      const isSetupExpired = setupVigencyStatus === 'Vencido'

      // Procurar acertos correspondentes pelo vínculo estruturado:
      // 1. Vínculo direto de ID (setup.default_adjustment_id ou acerto.setup_id)
      // 2. Correspondência exata do material destino (to_product_code === material_code)
      // 3. Correspondência de família de destino (to_family_id === family_id ou toFamilyCode === family_code/material_code)
      const matchingAcertos = lineAcertos.filter((acerto) => {
        // Vínculo explícito de ID
        if (
          (setup as any).default_adjustment_id &&
          (setup as any).default_adjustment_id === acerto.id
        ) {
          return true
        }
        if (acerto.setup_id && acerto.setup_id === setup.id) {
          return true
        }

        const aMat = (acerto.material_code || '').trim().toUpperCase()
        const aFamCode = (acerto.family_code || '').trim().toUpperCase()
        const aFamId = acerto.family_id || (acerto as any).product_family_id

        // Match por material exato
        if (
          toProduct &&
          aMat &&
          (toProduct === aMat || aMat.includes(toProduct) || toProduct.includes(aMat))
        ) {
          return true
        }

        // Match por família
        if (toFamilyCode && (aFamCode === toFamilyCode || aMat === toFamilyCode)) {
          return true
        }
        if (setup.to_family_id && aFamId && setup.to_family_id === aFamId) {
          return true
        }

        return false
      })

      // 1. Se o próprio Setup ativo está vencido
      if (isSetupExpired) {
        const primeAcerto = matchingAcertos[0]
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          associatedAcertoId: primeAcerto?.id,
          associatedAcerto: primeAcerto,
          matchingAcertos,
          sampleType: primeAcerto?.sample_type,
          acertoDurationMinutes: primeAcerto?.duration_minutes,
          acertoValidFrom: primeAcerto?.valid_from,
          acertoValidUntil: primeAcerto?.valid_until,
          acertoStatus: primeAcerto
            ? primeAcerto.active !== false
              ? 'ACTIVE'
              : 'INACTIVE'
            : undefined,
          compatibility: 'SETUP_EXPIRED',
          compatibilityLabel: 'SETUP VENCIDO',
          isPending: true,
          inconsistencyReason: `Vigência do Setup expirada em ${setup.valid_until ? setup.valid_until.slice(0, 10) : 'N/A'}.`,
          setupVigencyStatus,
          acertoVigencyStatus: primeAcerto
            ? getVigencyStatus(primeAcerto.valid_from, primeAcerto.valid_until)
            : undefined,
        }
      }

      // 2. Se o próprio Setup está com Vigência Incompleta (legado sem Data Fim)
      if (isSetupVigencyIncomplete) {
        const primeAcerto = matchingAcertos[0]
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          associatedAcertoId: primeAcerto?.id,
          associatedAcerto: primeAcerto,
          matchingAcertos,
          sampleType: primeAcerto?.sample_type,
          acertoDurationMinutes: primeAcerto?.duration_minutes,
          acertoValidFrom: primeAcerto?.valid_from,
          acertoValidUntil: primeAcerto?.valid_until,
          acertoStatus: primeAcerto
            ? primeAcerto.active !== false
              ? 'ACTIVE'
              : 'INACTIVE'
            : undefined,
          compatibility: 'INCOMPLETE_VIGENCY',
          compatibilityLabel: 'VIGÊNCIA INCOMPLETA',
          isPending: true,
          inconsistencyReason: 'Setup sem Data Fim preenchida (pendência de parametrização).',
          setupVigencyStatus,
          acertoVigencyStatus: primeAcerto
            ? getVigencyStatus(primeAcerto.valid_from, primeAcerto.valid_until)
            : undefined,
        }
      }

      // Se nenhum acerto encontrado
      if (matchingAcertos.length === 0) {
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          matchingAcertos: [],
          compatibility: 'MISSING_ACERTO',
          compatibilityLabel: 'SEM ACERTO',
          isPending: true,
          inconsistencyReason: `Nenhum tempo de acerto correspondente ao material/família de destino (${targetLabel}).`,
          setupVigencyStatus,
        }
      }

      // Filtrar acertos ativos
      const activeMatching = matchingAcertos.filter((a) => a.active !== false)

      if (activeMatching.length === 0) {
        // Existem acertos mas todos inativos
        const primeAcerto = matchingAcertos[0]
        const acertoVigency = getVigencyStatus(primeAcerto.valid_from, primeAcerto.valid_until)
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          associatedAcertoId: primeAcerto.id,
          associatedAcerto: primeAcerto,
          matchingAcertos,
          sampleType: primeAcerto.sample_type,
          acertoDurationMinutes: primeAcerto.duration_minutes,
          acertoValidFrom: primeAcerto.valid_from,
          acertoValidUntil: primeAcerto.valid_until,
          acertoStatus: 'INACTIVE',
          compatibility: 'INACTIVE_ACERTO',
          compatibilityLabel: 'ACERTO INATIVO',
          isPending: true,
          inconsistencyReason: 'Existe tempo de acerto vinculado, porém ele está inativo.',
          setupVigencyStatus,
          acertoVigencyStatus: acertoVigency,
        }
      }

      // Verificar se algum acerto ativo tem vigência incompleta
      const incompleteAcerto = activeMatching.find(
        (a) => !a.valid_until || String(a.valid_until).trim() === '',
      )
      if (incompleteAcerto) {
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          associatedAcertoId: incompleteAcerto.id,
          associatedAcerto: incompleteAcerto,
          matchingAcertos,
          sampleType: incompleteAcerto.sample_type,
          acertoDurationMinutes: incompleteAcerto.duration_minutes,
          acertoValidFrom: incompleteAcerto.valid_from,
          acertoValidUntil: incompleteAcerto.valid_until,
          acertoStatus: 'ACTIVE',
          compatibility: 'INCOMPLETE_VIGENCY',
          compatibilityLabel: 'VIGÊNCIA INCOMPLETA',
          isPending: true,
          inconsistencyReason:
            'Tempo de Acerto sem Data Fim preenchida (pendência de parametrização).',
          setupVigencyStatus,
          acertoVigencyStatus: 'Vigência incompleta',
        }
      }

      // Verificar vigência dos ativos (data atual dentro da vigência)
      const validActiveMatching = activeMatching.filter((a) => {
        const fromOk = !a.valid_from || a.valid_from.slice(0, 10) <= refDateStr
        const untilOk = !a.valid_until || a.valid_until.slice(0, 10) >= refDateStr
        return fromOk && untilOk
      })

      if (validActiveMatching.length === 0) {
        // Todos estão vencidos para a data de referência
        const primeAcerto = activeMatching[0]
        const acertoVigency = getVigencyStatus(primeAcerto.valid_from, primeAcerto.valid_until)
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          associatedAcertoId: primeAcerto.id,
          associatedAcerto: primeAcerto,
          matchingAcertos,
          sampleType: primeAcerto.sample_type,
          acertoDurationMinutes: primeAcerto.duration_minutes,
          acertoValidFrom: primeAcerto.valid_from,
          acertoValidUntil: primeAcerto.valid_until,
          acertoStatus: 'ACTIVE',
          compatibility: 'EXPIRED_ACERTO',
          compatibilityLabel: 'ACERTO VENCIDO',
          isPending: true,
          inconsistencyReason: `Vigência do acerto expirada (válido até ${primeAcerto.valid_until ? primeAcerto.valid_until.slice(0, 10) : 'N/A'}).`,
          setupVigencyStatus,
          acertoVigencyStatus: acertoVigency,
        }
      }

      // Verificação de inconsistência (ex.: duração zero ou parâmetros inválidos)
      const selectedAcerto = validActiveMatching[0]
      const selectedAcertoVigency = getVigencyStatus(
        selectedAcerto.valid_from,
        selectedAcerto.valid_until,
      )

      if (selectedAcerto.duration_minutes <= 0) {
        return {
          setupId: setup.id,
          setupCode: setup.setup_code || `STP-${setup.id}`,
          setupDescription: setup.setup_description || 'Transição de Setup',
          fromCode: setup.from_product_code || 'Qualquer',
          toCode: setup.to_product_code || 'Qualquer',
          fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
          toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
          targetMaterialOrFamily: targetLabel,
          setupDurationMinutes: setup.setup_duration_minutes || 0,
          setupStatus: 'ACTIVE',
          setupValidFrom: setup.valid_from,
          setupValidUntil: setup.valid_until,
          associatedAcertoId: selectedAcerto.id,
          associatedAcerto: selectedAcerto,
          matchingAcertos,
          sampleType: selectedAcerto.sample_type,
          acertoDurationMinutes: selectedAcerto.duration_minutes,
          acertoValidFrom: selectedAcerto.valid_from,
          acertoValidUntil: selectedAcerto.valid_until,
          acertoStatus: 'ACTIVE',
          compatibility: 'INCONSISTENT',
          compatibilityLabel: 'INCONSISTENTE',
          isPending: true,
          inconsistencyReason: 'Tempo de acerto com duração igual a zero ou parâmetros inválidos.',
          setupVigencyStatus,
          acertoVigencyStatus: selectedAcertoVigency,
        }
      }

      // Tudo OK: COMPATÍVEL
      // Setup ativo, dentro da vigência, com acerto ativo correspondente e dentro da vigência
      validActiveMatching.forEach((a) => linkedAcertoIds.add(a.id))

      return {
        setupId: setup.id,
        setupCode: setup.setup_code || `STP-${setup.id}`,
        setupDescription: setup.setup_description || 'Transição de Setup',
        fromCode: setup.from_product_code || 'Qualquer',
        toCode: setup.to_product_code || 'Qualquer',
        fromFamily: setup.expand?.from_family_id?.name || setup.expand?.from_family_id?.code,
        toFamily: setup.expand?.to_family_id?.name || setup.expand?.to_family_id?.code,
        targetMaterialOrFamily: targetLabel,
        setupDurationMinutes: setup.setup_duration_minutes || 0,
        setupStatus: 'ACTIVE',
        setupValidFrom: setup.valid_from,
        setupValidUntil: setup.valid_until,
        associatedAcertoId: selectedAcerto.id,
        associatedAcerto: selectedAcerto,
        matchingAcertos: validActiveMatching,
        sampleType: selectedAcerto.sample_type,
        acertoDurationMinutes: selectedAcerto.duration_minutes,
        acertoValidFrom: selectedAcerto.valid_from,
        acertoValidUntil: selectedAcerto.valid_until,
        acertoStatus: 'ACTIVE',
        compatibility: 'COMPATIBLE',
        compatibilityLabel: 'COMPATÍVEL',
        isPending: false,
        setupVigencyStatus,
        acertoVigencyStatus: selectedAcertoVigency,
      }
    })

    const totalActiveSetups = activeSetups.length
    const compatibleItems = items.filter(
      (it) => it.setupStatus === 'ACTIVE' && it.compatibility === 'COMPATIBLE',
    )
    const compatibleSetupsCount = compatibleItems.length
    const setupsWithoutAcertoCount = items.filter(
      (it) => it.setupStatus === 'ACTIVE' && it.compatibility === 'MISSING_ACERTO',
    ).length

    const incompleteVigencyCount = items.filter(
      (it) => it.setupStatus === 'ACTIVE' && it.compatibility === 'INCOMPLETE_VIGENCY',
    ).length

    // Acertos órfãos (ativos que não vinculam a nenhum setup cadastrado)
    const orphanAcertosCount = activeAcertos.filter((a) => !linkedAcertoIds.has(a.id)).length

    const compatibilityRatePct =
      totalActiveSetups > 0 ? Math.round((compatibleSetupsCount / totalActiveSetups) * 100) : 100

    // Determinação do indicador geral (três situações: VERDE, AMARELO, VERMELHO)
    let overallStatus: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN'
    let overallStatusLabel = '100% Compatível'
    let overallStatusDesc =
      'Todos os setups ativos possuem pelo menos um tempo de acerto ativo correspondente.'

    if (totalActiveSetups === 0) {
      overallStatus = 'GREEN'
      overallStatusLabel = '100% Compatível'
      overallStatusDesc = 'Nenhum setup ativo cadastrado na linha.'
    } else if (compatibilityRatePct === 100) {
      overallStatus = 'GREEN'
      overallStatusLabel = '100% Compatível'
      overallStatusDesc = `${compatibleSetupsCount} de ${totalActiveSetups} setups ativos com tempo de acerto válido.`
    } else if (compatibilityRatePct >= 60) {
      overallStatus = 'YELLOW'
      overallStatusLabel = 'Compatibilidade Parcial'
      overallStatusDesc = `Existem ${totalActiveSetups - compatibleSetupsCount} setup(s) ativos sem acerto compatível (${compatibilityRatePct}% de cobertura).`
    } else {
      overallStatus = 'RED'
      overallStatusLabel = 'Incompatibilidade Crítica'
      overallStatusDesc = `Incompatibilidade crítica: apenas ${compatibilityRatePct}% dos setups possuem acerto cadastrado.`
    }

    return {
      totalActiveSetups,
      totalActiveAcertos: activeAcertos.length,
      compatibleSetupsCount,
      setupsWithoutAcertoCount,
      orphanAcertosCount,
      incompleteVigencyCount,
      compatibilityRatePct,
      overallStatus,
      overallStatusLabel,
      overallStatusDesc,
      items,
    }
  }

  /**
   * Avalia quais Setups ativos serão prejudicados (ficarão sem nenhum Acerto ativo)
   * caso o acerto com id `acertoIdToDeactivate` seja inativado.
   */
  public static getImpactedSetupsOnAcertoDeactivation(params: {
    lineId: string
    acertoIdToDeactivate: string
    setupList: LineSetupMatrix[]
    acertoList: LineAdjustmentTimeRule[]
  }): LineSetupMatrix[] {
    const { lineId, acertoIdToDeactivate, setupList, acertoList } = params
    const simulatedAcertos = acertoList.map((a) =>
      a.id === acertoIdToDeactivate ? { ...a, active: false } : a,
    )

    const before = this.evaluateCompatibility({
      lineId,
      setupList,
      acertoList,
    })

    const after = this.evaluateCompatibility({
      lineId,
      setupList,
      acertoList: simulatedAcertos,
    })

    const beforeCompatibleIds = new Set(
      before.items
        .filter((it) => it.setupStatus === 'ACTIVE' && it.compatibility === 'COMPATIBLE')
        .map((it) => it.setupId),
    )

    const nowBrokenIds = after.items
      .filter(
        (it) =>
          it.setupStatus === 'ACTIVE' &&
          it.compatibility !== 'COMPATIBLE' &&
          beforeCompatibleIds.has(it.setupId),
      )
      .map((it) => it.setupId)

    return setupList.filter((s) => nowBrokenIds.includes(s.id))
  }
}
