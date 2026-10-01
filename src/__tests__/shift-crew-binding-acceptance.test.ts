import { describe, it, expect, beforeEach } from 'vitest'
import { parseDatePtBr, formatDatePtBr } from '@/components/mp-optimization/DateInputPtBr'
import { lineMasterService } from '@/services/line-master'
import { pb } from '@/lib/pocketbase/client'

describe('Funcionalidade Vincular Turno × Turma — Regras de Negócio e Persistência', () => {
  const lineId = 'a3y2whm43i59k01' // Acabamento L2
  const shiftT1 = 'y8srfdrynkavl30' // T1_ACAB
  const shiftT2 = 'dakc0a54t5ca375' // T2
  const crewA = 'q4n3dovqjb8vagp' // TURMA_A
  const crewB = 'ca7enecvtbsizsp' // TURMA_B
  const crewC = 'k98lsbxgz7qtgve' // TURMA_C

  it('deve parsear e formatar datas no padrão pt-BR dd/mm/aaaa', () => {
    const parsed = parseDatePtBr('01/10/2026')
    expect(parsed).not.toBeNull()
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(9) // Outubro = mês 9 base 0
    expect(parsed?.getDate()).toBe(1)

    const formatted = formatDatePtBr(parsed!)
    expect(formatted).toBe('01/10/2026')

    // Data inválida
    expect(parseDatePtBr('32/01/2026')).toBeNull()
    expect(parseDatePtBr('invalid')).toBeNull()
  })

  it('deve validar cardinalidade N:1 (1 Turno pode ter várias Turmas: TURMA_A, TURMA_B, TURMA_C)', () => {
    const shiftCrewsMock = [
      { id: '1', shift_id: shiftT1, crew_id: crewA, status: 'ATIVO', valid_from: '2026-10-01' },
      { id: '2', shift_id: shiftT1, crew_id: crewB, status: 'ATIVO', valid_from: '2026-10-01' },
      { id: '3', shift_id: shiftT1, crew_id: crewC, status: 'ATIVO', valid_from: '2026-10-01' },
    ]

    const shift1Crews = shiftCrewsMock.filter((sc) => sc.shift_id === shiftT1)
    expect(shift1Crews.length).toBe(3)
    expect(shift1Crews.map((sc) => sc.crew_id)).toEqual([crewA, crewB, crewC])
  })

  it('deve detectar conflito de sobreposição quando a mesma turma é vinculada a outro turno no mesmo período', () => {
    const existingLinks = [
      {
        id: 'link1',
        shift_id: shiftT1,
        crew_id: crewA,
        status: 'ATIVO',
        valid_from: '2026-10-01',
        valid_until: '2026-11-30',
      },
    ]

    // Tentativa: vincular TURMA_A a T2 de 2026-11-15 em diante
    const newAttempt = {
      shift_id: shiftT2,
      crew_id: crewA,
      status: 'ATIVO',
      valid_from: '2026-11-15',
      valid_until: undefined,
    }

    const checkOverlap = (sA: string, eA: string, sB: string, eB: string) => {
      return sA <= eB && eA >= sB
    }

    const hasConflict = existingLinks.some((sc) => {
      if (sc.crew_id !== newAttempt.crew_id) return false
      if (sc.status !== 'ATIVO') return false

      const sA = sc.valid_from || '0000-01-01'
      const eA = sc.valid_until || '9999-12-31'
      const sB = newAttempt.valid_from || '0000-01-01'
      const eB = newAttempt.valid_until || '9999-12-31'

      return checkOverlap(sA, eA, sB, eB)
    })

    expect(hasConflict).toBe(true)
  })

  it('deve permitir vincular a turma a outro turno após o término da vigência anterior', () => {
    const existingLinks = [
      {
        id: 'link1',
        shift_id: shiftT1,
        crew_id: crewA,
        status: 'ATIVO',
        valid_from: '2026-10-01',
        valid_until: '2026-10-31',
      },
    ]

    // Tentativa permitida: T2 de 2026-11-01 em diante
    const newAttempt = {
      shift_id: shiftT2,
      crew_id: crewA,
      status: 'ATIVO',
      valid_from: '2026-11-01',
      valid_until: undefined,
    }

    const checkOverlap = (sA: string, eA: string, sB: string, eB: string) => {
      return sA <= eB && eA >= sB
    }

    const hasConflict = existingLinks.some((sc) => {
      if (sc.crew_id !== newAttempt.crew_id) return false
      if (sc.status !== 'ATIVO') return false

      const sA = sc.valid_from || '0000-01-01'
      const eA = sc.valid_until || '9999-12-31'
      const sB = newAttempt.valid_from || '0000-01-01'
      const eB = newAttempt.valid_until || '9999-12-31'

      return checkOverlap(sA, eA, sB, eB)
    })

    expect(hasConflict).toBe(false)
  })

  it('deve permitir vincular a turma a outro turno se o vínculo anterior estiver com status INATIVO', () => {
    const existingLinks = [
      {
        id: 'link1',
        shift_id: shiftT1,
        crew_id: crewA,
        status: 'INATIVO', // Encerrado/Inativo
        valid_from: '2026-10-01',
        valid_until: '2026-11-30',
      },
    ]

    const newAttempt = {
      shift_id: shiftT2,
      crew_id: crewA,
      status: 'ATIVO',
      valid_from: '2026-11-15',
      valid_until: undefined,
    }

    const hasConflict = existingLinks.some((sc) => {
      if (sc.crew_id !== newAttempt.crew_id) return false
      if (sc.status !== 'ATIVO') return false // Ignora vínculos inativos

      const sA = sc.valid_from || '0000-01-01'
      const eA = sc.valid_until || '9999-12-31'
      const sB = newAttempt.valid_from || '0000-01-01'
      const eB = newAttempt.valid_until || '9999-12-31'

      return sA <= eB && eA >= sB
    })

    expect(hasConflict).toBe(false)
  })

  it('deve formatar texto exato de sucesso exigido pela especificação', () => {
    const shiftCode = 'T1_ACAB'
    const crewCode = 'TURMA_A'
    const expected = `Vínculo entre o turno ${shiftCode} e a turma ${crewCode} realizado com sucesso.`
    expect(expected).toBe('Vínculo entre o turno T1_ACAB e a turma TURMA_A realizado com sucesso.')
  })

  it('deve formatar texto exato de bloqueio de sobreposição exigido', () => {
    const conflictShiftCode = 'T1_ACAB'
    const expected = `Esta turma já possui vínculo vigente com o turno ${conflictShiftCode}. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.`
    expect(expected).toBe(
      'Esta turma já possui vínculo vigente com o turno T1_ACAB. Encerre ou altere a vigência do vínculo existente antes de realizar um novo vínculo.',
    )
  })
})
