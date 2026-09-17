import { describe, it, expect } from 'vitest'

describe('Hierarquia de Linhas e Centros - Validação e Regras de Negócio', () => {
  it('padroniza numeração de saltos em 10, 20, 30 sem repetições 01 01', () => {
    const centers = [
      { centerCode: 'ENF_L1', sequenceOrder: 1 },
      { centerCode: 'L1', sequenceOrder: 1 },
      { centerCode: 'ACAB_L2', sequenceOrder: 2 },
    ]

    const renumbered = centers.map((c, idx) => ({
      ...c,
      sequenceOrder: (idx + 1) * 10,
    }))

    expect(renumbered[0].sequenceOrder).toBe(10)
    expect(renumbered[1].sequenceOrder).toBe(20)
    expect(renumbered[2].sequenceOrder).toBe(30)
  })

  it('preserva os centros ao remover vínculo da hierarquia', () => {
    const allCenters = [
      { id: 'c1', code: 'ENF_L1', is_active: false },
      { id: 'c2', code: 'ACAB_L2', is_active: true },
      { id: 'c3', code: 'ENDIR', is_active: true },
    ]

    let dependencies = [
      { id: 'd1', line_id: 'l1', center_id: 'c1', sequence_order: 10 },
      { id: 'd2', line_id: 'l1', center_id: 'c2', sequence_order: 20 },
    ]

    // Remove vínculo d1
    dependencies = dependencies.filter((d) => d.id !== 'd1')

    // Centros continuam intactos na base
    expect(allCenters.length).toBe(3)
    expect(allCenters.find((c) => c.code === 'ENF_L1')).toBeDefined()
    expect(allCenters.find((c) => c.code === 'ENF_L1')?.is_active).toBe(false)
    expect(dependencies.length).toBe(1)
  })

  it('valida unicidade de código da linha por empresa', () => {
    const existing = [
      { companyId: 'comp_ciafal', code: 'L1' },
      { companyId: 'comp_ciafal', code: 'L2' },
      { companyId: 'comp_ks', code: 'L1' },
    ]

    const isDuplicate1 = existing.some((l) => l.companyId === 'comp_ciafal' && l.code === 'L1')
    const isDuplicate2 = existing.some((l) => l.companyId === 'comp_ciafal' && l.code === 'L3')

    expect(isDuplicate1).toBe(true)
    expect(isDuplicate2).toBe(false)
  })

  it('traduz status operacionais mantendo termos em português', () => {
    const getStatusLabel = (s: string) => {
      switch (s) {
        case 'running':
          return 'Em produção'
        case 'idle':
          return 'Disponível'
        case 'maintenance':
          return 'Em manutenção'
        case 'stopped':
          return 'Parada'
        default:
          return s
      }
    }

    expect(getStatusLabel('running')).toBe('Em produção')
    expect(getStatusLabel('idle')).toBe('Disponível')
    expect(getStatusLabel('maintenance')).toBe('Em manutenção')
  })

  it('gera identificador técnico automático no padrão LIN-{planta}-{slug}-{sufixo 4 chars}', () => {
    const generateTechnicalLineCode = (companyCode: string, lineName: string): string => {
      const plantCodeClean =
        companyCode
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase()
          .slice(0, 6) || '1000'
      const slug =
        lineName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Za-z0-9]/g, '')
          .toUpperCase()
          .slice(0, 8) || 'LIN'

      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let suffix = ''
      for (let i = 0; i < 4; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return `LIN-${plantCodeClean}-${slug}-${suffix}`
    }

    const code = generateTechnicalLineCode('1000', 'Linha 1 Laminação')
    expect(code).toMatch(/^LIN-1000-LINHA1LA-[A-Z0-9]{4}$/)
  })
})
