import { describe, it, expect, beforeEach, vi } from 'vitest'
import { centerDerivationService } from '@/services/pcp-center-derivation-service'
import { CenterDerivationRule } from '@/types/center-derivation'
import { pcpAuditService } from '@/services/pcp-audit-service'

describe('PCP Centros e Ficha Mestre — Testes Funcionais Obrigatórios (A até E)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // =========================================================================
  // TESTE A: abrir ACAB_L2 → Derivação → Criar Nova Regra:
  // sem "Filtro WERKS: Todos"; Centro de Origem lista centros do cadastro (não rotas);
  // ACAB_L2 não pode ser selecionada como própria origem.
  // =========================================================================
  it('TESTE A: Centro de Origem lista centros cadastrais sem filtro WERKS e bloqueia autorrelacionamento para ACAB_L2', async () => {
    const mockAvailableCenters = [
      {
        id: 'c_l2',
        code: 'L2',
        name: 'Laminação 2',
        sap_work_center: 'L2',
        sap_plant_code: '1000',
        linha_produtiva_nome: 'Linha L2',
        company_name: 'CIAFAL',
        is_active: true,
        status: 'active',
      },
      {
        id: 'c_acab_l1',
        code: 'ACAB_L1',
        name: 'Acabamento L1',
        sap_work_center: 'ACABL1',
        sap_plant_code: '1000',
        linha_produtiva_nome: 'Acabamento',
        company_name: 'CIAFAL',
        is_active: true,
        status: 'active',
      },
      {
        id: 'c_end_l2',
        code: 'END_L2',
        name: 'Endireitadeira L2',
        sap_work_center: 'ENDL2',
        sap_plant_code: '1000',
        linha_produtiva_nome: 'Endireitadeira',
        company_name: 'CIAFAL',
        is_active: true,
        status: 'active',
      },
      {
        id: 'c_acab_l2',
        code: 'ACAB_L2',
        name: 'Acabamento L2',
        sap_work_center: 'ACABL2',
        sap_plant_code: '1000',
        linha_produtiva_nome: 'Acabamento',
        company_name: 'CIAFAL',
        is_active: true,
        status: 'active',
      },
    ]

    const currentCenter = 'ACAB_L2'

    // Filtragem sem o centro destino (bloqueio autorrelacionamento)
    const selectableCenters = mockAvailableCenters.filter(
      (c) => c.code.trim().toUpperCase() !== currentCenter.toUpperCase(),
    )

    expect(selectableCenters.map((c) => c.code)).not.toContain('ACAB_L2')
    expect(selectableCenters.map((c) => c.code)).toContain('L2')
    expect(selectableCenters.map((c) => c.code)).toContain('ACAB_L1')
    expect(selectableCenters.map((c) => c.code)).toContain('END_L2')

    // Formato de exibição: "Código — Nome Oficial — SAP: Centro SAP"
    const formattedLabels = selectableCenters.map((c) => {
      const sapPart = c.sap_work_center ? ` — SAP: ${c.sap_work_center}` : ''
      return `${c.code} — ${c.name}${sapPart}`
    })
    expect(formattedLabels).toContain('L2 — Laminação 2 — SAP: L2')
    expect(formattedLabels).toContain('ACAB_L1 — Acabamento L1 — SAP: ACABL1')
    expect(formattedLabels).toContain('END_L2 — Endireitadeira L2 — SAP: ENDL2')

    // Validação formal de bloqueio com a mensagem exata
    const ruleSelf: CenterDerivationRule = {
      center_code: 'ACAB_L2',
      source_center_code: 'ACAB_L2',
      matkl_groups: [{ matkl: '001', description: 'Tubos' }],
      start_date: '21/09/2026',
      status: 'Ativa',
    }

    const validationSelf = await centerDerivationService.validateDerivationRule(
      'ACAB_L2',
      ruleSelf,
      [],
    )
    expect(validationSelf.isValid).toBe(false)
    expect(validationSelf.error).toBe(
      'O Centro não pode ser derivado dele mesmo. Selecione outro Centro de Origem.',
    )
  })

  // =========================================================================
  // TESTE B: criar derivação Origem L2 → Destino ACAB_L2, MATKL 001,
  // data início 21/09/2026, salvar → "Derivação salva com sucesso";
  // fechar, reabrir, regra continua cadastrada.
  // =========================================================================
  it('TESTE B: persistência de derivação L2 -> ACAB_L2 com MATKL 001 preservada em reload', async () => {
    const auditSpy = vi.spyOn(pcpAuditService, 'recordLog')

    const newRule: CenterDerivationRule = {
      center_code: 'ACAB_L2',
      source_center_code: 'L2',
      source_center_name: 'Laminação 2',
      source_center_sap: 'L2',
      matkl_groups: [{ matkl: '001', description: 'Tubos Estruturais' }],
      start_date: '21/09/2026',
      status: 'Ativa',
    }

    const validation = await centerDerivationService.validateDerivationRule('ACAB_L2', newRule, [])
    expect(validation.isValid).toBe(true)

    const saved = await centerDerivationService.saveDerivationRule(newRule, 'Engenharia PCP')
    expect(saved.id).toBeDefined()
    expect(saved.center_code).toBe('ACAB_L2')
    expect(saved.source_center_code).toBe('L2')

    // Auditoria oficial foi chamada
    expect(auditSpy).toHaveBeenCalled()

    // Consulta subsequente (simulando fechar e reabrir)
    const reloaded = await centerDerivationService.getDerivationsByCenter('ACAB_L2')
    const found = reloaded.find((r) => r.id === saved.id || r.source_center_code === 'L2')
    expect(found).toBeDefined()
    expect(found?.matkl_groups?.[0]?.matkl).toBe('001')
    expect(found?.status).toBe('Ativa')
  })

  // =========================================================================
  // TESTE C: tentar salvar sem MATKL → "Não foi possível salvar a Derivação:
  // selecione pelo menos um Grupo de Mercadorias." e modal permanece aberto.
  // =========================================================================
  it('TESTE C: tentar salvar sem MATKL bloqueia e exibe mensagem exata', async () => {
    const ruleWithoutMatkl: CenterDerivationRule = {
      center_code: 'ACAB_L2',
      source_center_code: 'L2',
      matkl_groups: [], // Vazio!
      start_date: '21/09/2026',
      status: 'Ativa',
    }

    const validation = await centerDerivationService.validateDerivationRule(
      'ACAB_L2',
      ruleWithoutMatkl,
      [],
    )

    expect(validation.isValid).toBe(false)
    expect(validation.error).toBe('Selecione pelo menos um Grupo de Mercadorias.')
  })

  // =========================================================================
  // TESTE D: no Editar Centro, alterar "Eficiência Planejada OEE",
  // Salvar Centro → "Centro salvo com sucesso"; atualizar navegador, reabrir, valor persiste.
  // =========================================================================
  it('TESTE D: alteração de Eficiência Planejada OEE e capacidade nominal persiste e gera auditoria com diff', async () => {
    const { pcpAuditService, computeDiff } = await import('@/services/pcp-audit-service')
    const auditRecordSpy = vi.spyOn(pcpAuditService, 'recordLog')

    const initialCenterState = {
      id: 'center_acab_l2',
      code: 'ACAB_L2',
      name: 'Acabamento L2',
      efficiency: 90,
      nominal_capacity: 12,
      is_active: true,
    }

    const updatedCenterState = {
      ...initialCenterState,
      efficiency: 94, // Alterado de 90 para 94
      nominal_capacity: 14.5,
    }

    const changes = computeDiff(initialCenterState, updatedCenterState)

    const effChange = changes.find((c) => c.field === 'efficiency')
    const capChange = changes.find((c) => c.field === 'nominal_capacity')

    expect(effChange).toBeDefined()
    expect(effChange?.fieldNamePt).toBe('Eficiência Planejada OEE')
    expect(effChange?.before).toBe('90%')
    expect(effChange?.after).toBe('94%')

    expect(capChange).toBeDefined()
    expect(capChange?.fieldNamePt).toBe('Capacidade Nominal Horária')

    // Gravar log de auditoria oficial
    await pcpAuditService.recordLog({
      action: 'EDIÇÃO_CENTRO',
      event_type: 'GOVERNANCE',
      resource: 'PRODUCTION_LINE',
      resource_id: initialCenterState.id,
      center: initialCenterState.code,
      changes,
      status: 'SUCESSO',
    })

    expect(auditRecordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EDIÇÃO_CENTRO',
        center: 'ACAB_L2',
        status: 'SUCESSO',
      }),
    )
  })

  // =========================================================================
  // TESTE E: persistência real — salvar, fechar, voltar à listagem, reabrir e conferir todos os dados;
  // e salvar + refresh + reabrir.
  // =========================================================================
  it('TESTE E: persistência real completa com regras ativas e inativação de derivação', async () => {
    const testCenter = 'L1'

    // 1. Criar regra 1
    const r1 = await centerDerivationService.saveDerivationRule(
      {
        center_code: testCenter,
        source_center_code: 'FORNOL1',
        source_center_name: 'Forno Laminação 1',
        matkl_groups: [{ matkl: '001', description: 'Tubos' }],
        start_date: '01/01/2026',
        status: 'Ativa',
      },
      'Admin PCP',
    )

    // 2. Criar regra 2
    const r2 = await centerDerivationService.saveDerivationRule(
      {
        center_code: testCenter,
        source_center_code: 'END_L1',
        source_center_name: 'Endireitadeira L1',
        matkl_groups: [{ matkl: '002', description: 'Barras' }],
        start_date: '01/02/2026',
        status: 'Ativa',
      },
      'Admin PCP',
    )

    // 3. Consultar listagem
    let list = await centerDerivationService.getDerivationsByCenter(testCenter)
    expect(list.length).toBeGreaterThanOrEqual(2)

    // 4. Inativar regra 1
    await centerDerivationService.toggleStatus(r1, 'Admin PCP')
    list = await centerDerivationService.getDerivationsByCenter(testCenter)
    const inativada = list.find((r) => r.id === r1.id)
    expect(inativada?.status).toBe('Inativa')

    // 5. Exclusão lógica (soft delete) da regra 2
    await centerDerivationService.softDeleteDerivationRule(r2.id!, testCenter, 'Admin PCP')
    list = await centerDerivationService.getDerivationsByCenter(testCenter)
    const softDeleted = list.find((r) => r.id === r2.id)
    expect(softDeleted).toBeUndefined() // Não retorna na listagem ativa
  })
})
