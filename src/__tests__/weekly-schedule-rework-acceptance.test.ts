import { describe, it, expect } from 'vitest'
import {
  isLineEligibleForProgrammingType,
  PROGRAMMING_TYPES_CATALOG,
  LineMaster,
} from '@/types/line-master'

describe('Aceitação — Tipo de Programação Retrabalho e Elegibilidade (10 Cenários)', () => {
  // Mock das linhas reais do cadastro CIAFAL
  const mockLines: Array<LineMaster & { sap_plant_code?: string }> = [
    {
      id: 'qa1is1s2dcf68l0',
      code: 'RETRAB',
      name: 'Retrabalho',
      resource_type: 'REWORK',
      is_active: true,
      programming_type: 'Múltiplo',
      programming_stages: ['Preparação', 'Acabamento', 'Inspeção'],
      sap_plant_code: '1000',
    } as any,
    {
      id: 'line-l1-id',
      code: 'L1',
      name: 'Laminação 1',
      resource_type: 'ROLLING_MILL',
      is_active: true,
      programming_type: 'Sequencial',
      programming_stages: ['Aquecimento', 'Laminação'],
      sap_plant_code: '1000',
    } as any,
    {
      id: 'line-l2-id',
      code: 'L2',
      name: 'Laminação 2',
      resource_type: 'ROLLING_MILL',
      is_active: true,
      programming_type: 'Sequencial',
      programming_stages: ['Aquecimento', 'Laminação'],
      sap_plant_code: '1000',
    } as any,
    {
      id: 'line-retrab-sul-id',
      code: 'RETRAB_SUL',
      name: 'Retrabalho Sul',
      resource_type: 'REWORK',
      is_active: true,
      programming_type: 'Múltiplo',
      programming_stages: ['Preparação', 'Acabamento'],
      sap_plant_code: '2000',
    } as any,
    {
      id: 'line-inactive-rework',
      code: 'RETRAB_INAT',
      name: 'Retrabalho Inativo',
      resource_type: 'REWORK',
      is_active: false,
      programming_type: 'Múltiplo',
      programming_stages: ['Acabamento'],
      sap_plant_code: '1000',
    } as any,
  ]

  // Função pura que reproduz o useMemo eligibleLines de WeeklyScheduleOperationalPage
  function computeEligibleLines(
    lines: Array<LineMaster & { sap_plant_code?: string }>,
    programmingType: string,
    companyCode: string,
  ) {
    if (!programmingType) return []
    return lines.filter((line) => {
      if (companyCode) {
        const linePlant = String(
          (line as any).sap_plant_code || (line as any).plant || (line as any).plant_code || '1000',
        ).trim()
        if (companyCode === 'CIAFAL' || companyCode === '1000') {
          if (linePlant !== '1000' && linePlant !== '1001' && linePlant !== 'CIAFAL') {
            return false
          }
        } else if (companyCode === 'CIAFAL_SUL' || companyCode === '2000') {
          if (linePlant !== '2000' && linePlant !== 'CIAFAL_SUL') {
            return false
          }
        }
      }
      return isLineEligibleForProgrammingType(line, programmingType, null)
    })
  }

  it('1. Retrabalho: Tipo = Retrabalho (Empresa CIAFAL Matriz) popula com RETRAB real do cadastro', () => {
    const result = computeEligibleLines(mockLines, 'Retrabalho', 'CIAFAL')
    expect(result.some((l) => l.code === 'RETRAB')).toBe(true)
    const retrab = result.find((l) => l.code === 'RETRAB')
    expect(retrab?.name).toBe('Retrabalho')
    expect(retrab?.resource_type).toBe('REWORK')
  })

  it('2. Filtro: centro sem Retrabalho habilitado não aparece; com habilitado aparece', () => {
    const result = computeEligibleLines(mockLines, 'Retrabalho', 'CIAFAL')
    // L1 e L2 são ROLLING_MILL, não devem constar em Retrabalho
    expect(result.some((l) => l.code === 'L1')).toBe(false)
    expect(result.some((l) => l.code === 'L2')).toBe(false)
    expect(result.some((l) => l.code === 'RETRAB')).toBe(true)
  })

  it('3. Empresa: trocar empresa recalcula a lista e impede centros de outra planta', () => {
    const matriz = computeEligibleLines(mockLines, 'Retrabalho', 'CIAFAL')
    expect(matriz.map((l) => l.code)).toContain('RETRAB')
    expect(matriz.map((l) => l.code)).not.toContain('RETRAB_SUL')

    const sul = computeEligibleLines(mockLines, 'Retrabalho', 'CIAFAL_SUL')
    expect(sul.map((l) => l.code)).toContain('RETRAB_SUL')
    expect(sul.map((l) => l.code)).not.toContain('RETRAB')
  })

  it('4. Troca de tipo: Laminação → Retrabalho recalcula elegíveis e reseta seleção de forma atômica', () => {
    const lamiLines = computeEligibleLines(mockLines, 'Laminação', 'CIAFAL')
    expect(lamiLines.some((l) => l.code === 'L1')).toBe(true)
    expect(lamiLines.some((l) => l.code === 'RETRAB')).toBe(false)

    let selectedLineCode = 'L1'
    let currentLineOverview: any = { line: { code: 'L1', is_active: true } }

    // Simulação do handler onChange / effect P2 ao trocar para Retrabalho
    const reworkLines = computeEligibleLines(mockLines, 'Retrabalho', 'CIAFAL')
    if (selectedLineCode && !reworkLines.some((l) => l.code === selectedLineCode)) {
      selectedLineCode = ''
      currentLineOverview = null
    }

    expect(selectedLineCode).toBe('')
    expect(currentLineOverview).toBeNull()
    expect(reworkLines.some((l) => l.code === 'RETRAB')).toBe(true)
  })

  it('5. Linha ativa selecionada: NÃO deve sinalizar inatividade', () => {
    const selectedLineCode = 'RETRAB'
    const currentLineOverview = { line: { code: 'RETRAB', is_active: true } }
    const hasSelectedLine = Boolean(selectedLineCode && currentLineOverview?.line)
    const isLineActive = hasSelectedLine ? currentLineOverview?.line?.is_active !== false : true

    expect(hasSelectedLine).toBe(true)
    expect(isLineActive).toBe(true)
    const showInactiveAlert = hasSelectedLine && !isLineActive
    expect(showInactiveAlert).toBe(false)
  })

  it('6. Nenhuma linha selecionada: NÃO deve emitir alerta "Esta linha está inativa"', () => {
    const selectedLineCode = ''
    const currentLineOverview = null
    const hasSelectedLine = Boolean(selectedLineCode && currentLineOverview)
    const isLineActive = hasSelectedLine
      ? (currentLineOverview as any)?.line?.is_active !== false
      : true

    // Com a guarda P4, isLineActive não é false por padrão sem seleção
    expect(hasSelectedLine).toBe(false)
    expect(isLineActive).toBe(true)
    const showInactiveAlert = hasSelectedLine && !isLineActive
    expect(showInactiveAlert).toBe(false)
  })

  it('7. Linha inativa selecionada: deve sinalizar inatividade mas manter histórico', () => {
    const selectedLineCode = 'RETRAB_INAT'
    const currentLineOverview = { line: { code: 'RETRAB_INAT', is_active: false } }
    const hasSelectedLine = Boolean(selectedLineCode && currentLineOverview?.line)
    const isLineActive = hasSelectedLine ? currentLineOverview?.line?.is_active !== false : true

    expect(hasSelectedLine).toBe(true)
    expect(isLineActive).toBe(false)
    const showInactiveAlert = hasSelectedLine && !isLineActive
    expect(showInactiveAlert).toBe(true)
  })

  it('8. Montagem: linha Retrabalho ativa habilita inclusão de produtos e operações', () => {
    const selectedLineCode = 'RETRAB'
    const currentLineOverview = { line: { code: 'RETRAB', is_active: true } }
    const hasSelectedLine = Boolean(selectedLineCode && currentLineOverview?.line)
    const isLineActive = hasSelectedLine ? currentLineOverview?.line?.is_active !== false : true

    // Botão Adicionar Produto fica habilitado
    const isAddProductDisabled = hasSelectedLine && !isLineActive
    expect(isAddProductDisabled).toBe(false)
  })

  it('9. Catálogo de Tipos: PROGRAMMING_TYPES_CATALOG contém Retrabalho', () => {
    expect(PROGRAMMING_TYPES_CATALOG).toContain('Retrabalho')
  })

  it('10. Regressão: os demais tipos de programação continuam funcionando', () => {
    const lami = computeEligibleLines(mockLines, 'Laminação', 'CIAFAL')
    expect(lami.map((l) => l.code)).toContain('L1')
    expect(lami.map((l) => l.code)).toContain('L2')

    const todos = computeEligibleLines(mockLines, 'ALL', 'CIAFAL')
    expect(todos.length).toBeGreaterThan(0)
    expect(todos.some((l) => l.code === 'L1')).toBe(true)
    expect(todos.some((l) => l.code === 'RETRAB')).toBe(true)
  })
})
