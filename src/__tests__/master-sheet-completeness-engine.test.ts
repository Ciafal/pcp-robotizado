import { describe, it, expect } from 'vitest'
import { calculateCompletenessFromOverview } from '@/services/master-sheet-completeness'
import { LineOverviewData } from '@/types/line-master'

describe('Motor de Cálculo de Completude da Ficha Mestre (getMasterSheetCompleteness)', () => {
  const baseOverview: LineOverviewData = {
    line: {
      id: 'line_l1',
      code: 'L1',
      name: 'Linha de Laminação 1',
      plant: 'Matriz - Contagem',
      sap_plant_code: '1000',
      sap_work_center: 'LAM-01',
      mes_identifier: 'MES_LAM_01',
      process: 'Laminação',
      programming_type: 'Laminação',
      status: 'ACTIVE',
      is_active: true,
      current_rate: 15,
      capacity_unit: 't/h',
    } as any,
    master: {
      id: 'master_l1',
      line_id: 'line_l1',
      version: 1,
      nominal_hourly_capacity: 15,
      capacity_unit: 't/h',
      sap_plant_code: '1000',
      programming_type: 'Laminação',
    } as any,
    hierarchy: [],
    managers: [
      {
        id: 'mgr_1',
        line_id: 'line_l1',
        role_title: 'Gestor Operacional Laminação',
        expand: { user_id: { name: 'Carlos Gestor' } },
      } as any,
    ],
    approvers: [
      {
        id: 'app_1',
        line_id: 'line_l1',
        role_title: 'Aprovador PCP Laminação',
        requirement_type: 'MANDATORY',
      } as any,
    ],
    sequencing: [
      {
        id: 'seq_1',
        line_id: 'line_l1',
        process_flow_order: 1,
      } as any,
    ],
    shifts: [{ id: 'sh_1', line_id: 'line_l1', shift_code: 'T1' } as any],
    crews: [{ id: 'cr_1', name: 'Turma A' } as any],
    shiftCrews: [{ id: 'sc_1' } as any],
    capabilities: [{ id: 'cap_1', family_id: 'fam_1' } as any],
    productivity: [
      {
        id: 'prod_1',
        line_id: 'line_l1',
        material_product_code: 'BARRA-1/2',
        nominal_productivity: 15,
      } as any,
    ],
    rawMaterials: [
      {
        id: 'rm_1',
        line_id: 'line_l1',
        material_code: 'TAR_130',
        priority_order: 1,
      } as any,
    ],
    blockedProducts: [],
    setups: [],
    setupMatrix: [
      {
        id: 'stp_1',
        line_id: 'line_l1',
        setup_code: 'SETUP_1',
      } as any,
    ],
    adjustmentRules: [
      {
        id: 'adj_1',
        line_id: 'line_l1',
        sample_type: 'PRIMEIRA_PECA',
        adjustment_minutes: 15,
      } as any,
    ],
    scheduledStops: [
      {
        id: 'stp_std_1',
        line_id: 'line_l1',
        reason: 'Manutenção Preventiva',
      } as any,
    ],
    constraints: [],
    rulePacks: [],
    history: [],
    alerts: [],
    completeness: 0,
    readyForScheduling: true,
  }

  it('calcula 100% Completa para linha de Laminação quando todos os parâmetros obrigatórios e específicos estão preenchidos', () => {
    // bottleneckMatrixCount = 2 (específico para Laminação)
    const result = calculateCompletenessFromOverview(baseOverview, 2)

    expect(result.percentage).toBe(100)
    expect(result.status).toBe('Completa')
    expect(result.pendencies.length).toBe(0)
    expect(result.blocks.IDENTIFICATION_GOVERNANCE.percentage).toBe(100)
    expect(result.blocks.CAPACITY_CALENDAR.percentage).toBe(100)
    expect(result.blocks.PROCESS.percentage).toBe(100)
    expect(result.blocks.MATERIALS.percentage).toBe(100)
    expect(result.blocks.INTEGRATIONS.percentage).toBe(100)
  })

  it('não penaliza linhas de outro processo (ex: Tubo / Perfil) por campos exclusivos de Laminação', () => {
    const tubosOverview: LineOverviewData = {
      ...baseOverview,
      line: {
        ...baseOverview.line,
        id: 'line_tubos',
        code: 'TUBO-01',
        name: 'Linha de Tubos',
        process: 'Solda e Conformação',
        programming_type: 'Padrão',
      } as any,
      master: {
        ...baseOverview.master,
        programming_type: 'Padrão',
      } as any,
      adjustmentRules: [], // Não usa Acertos
    }

    // Mesmo com bottleneckMatrixCount = 0 e sem regras de acerto, para Tubos esses campos são N/A
    const result = calculateCompletenessFromOverview(tubosOverview, 0)

    expect(result.percentage).toBe(100)
    expect(result.status).toBe('Completa')
    expect(result.pendencies.length).toBe(0)

    // O item de matriz de gargalo e acertos devem estar com applicable = false
    const processItems = result.blocks.PROCESS.items
    const bottleneckItem = processItems.find((i) => i.id === 'proc_lamin_bottleneck_matrix')
    expect(bottleneckItem).toBeUndefined() // filtrado dos items aplicáveis
    const adjustmentItem = processItems.find((i) => i.id === 'proc_adjustment')
    expect(adjustmentItem).toBeUndefined() // filtrado dos items aplicáveis fora do denominador
  })

  it('valida requisito proc_adjustment para linhas de laminação com link para sub-aba ACERTOS', () => {
    const laminacaoSemAcerto: LineOverviewData = {
      ...baseOverview,
      adjustmentRules: [], // Sem regras de acerto ativas
    }

    const result = calculateCompletenessFromOverview(laminacaoSemAcerto, 1)
    const pendency = result.pendencies.find((p) => p.id === 'proc_adjustment')
    expect(pendency).toBeDefined()
    expect(pendency?.navigationTarget?.masterSubTab).toBe('ACERTOS')
    expect(pendency?.navigationTarget?.mainGroup).toBe('MASTERDATA')
    expect(pendency?.missingMessage).toBe('Acertos não parametrizados.')
  })

  it('classifica status por faixa corretamente: Incompleta (0-49%), Em preenchimento (50-79%), Quase completa (80-99%)', () => {
    // Linha vazia
    const emptyOverview: LineOverviewData = {
      line: {
        id: 'line_vazia',
        code: 'TESTE-EMPTY',
        name: 'Linha Teste Vazia',
        status: 'CONFIGURING',
        is_active: false,
      } as any,
      master: null,
      hierarchy: [],
      managers: [],
      approvers: [],
      sequencing: [],
      shifts: [],
      crews: [],
      shiftCrews: [],
      capabilities: [],
      productivity: [],
      rawMaterials: [],
      blockedProducts: [],
      setups: [],
      setupMatrix: [],
      adjustmentRules: [],
      scheduledStops: [],
      constraints: [],
      rulePacks: [],
      history: [],
      alerts: [],
      completeness: 0,
      readyForScheduling: false,
    }

    const emptyResult = calculateCompletenessFromOverview(emptyOverview, 0)
    expect(emptyResult.percentage).toBeLessThan(50)
    expect(emptyResult.status).toBe('Incompleta')
    expect(emptyResult.pendencies.length).toBeGreaterThan(5)

    // Verifica que pendências contêm mensagens claras e targets de navegação
    const managerPendency = emptyResult.pendencies.find((p) => p.id === 'ident_manager')
    expect(managerPendency).toBeDefined()
    expect(managerPendency?.missingMessage).toContain('Gestor titular não definido')
    expect(managerPendency?.navigationTarget?.mainGroup).toBe('ORGANIZATION')
  })

  it('mantém completude e homologação estritamente separadas (completude 100% não altera status de homologação)', () => {
    const unhomologatedOverview: LineOverviewData = {
      ...baseOverview,
      line: {
        ...baseOverview.line,
        status: 'ACTIVE', // status operacional não é homologação técnica de PCP
      } as any,
    }

    const result = calculateCompletenessFromOverview(unhomologatedOverview, 1)
    expect(result.percentage).toBe(100)
    // O status do cálculo é puramente cadastral
    expect(result.status).toBe('Completa')
  })
})
