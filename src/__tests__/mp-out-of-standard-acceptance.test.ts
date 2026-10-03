import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mpOutOfStandardService,
  DEFAULT_OUT_OF_STANDARD_REASONS,
} from '@/services/mp-out-of-standard-service'
import { formatNumberPtBr } from '@/lib/number-format'
import { ApplicationRequirementCandidate, MPSelectionCandidate } from '@/types/mp-out-of-standard'

// Mock de PocketBase client
vi.mock('@/lib/pocketbase/client', () => {
  const store = {
    isValid: true,
    record: {
      id: 'usr-pcp-01',
      name: 'Engenheiro de Processo',
      email: 'eng@ciafal.com.br',
      role: 'PCP_ADMIN',
    },
  }
  return {
    default: {
      authStore: store,
      collection: vi.fn((colName: string) => ({
        getFullList: vi.fn().mockImplementation(async () => {
          if (colName === 'mp_out_of_standard_evaluations') {
            return [
              {
                id: 'eval-1',
                numero_sequencial: 'AMP-000001/2026',
                centro: '1000',
                material_codigo: 'T950102000040',
                material_descricao: 'Tarugo SAE 1020 - 130x130mm',
                item_identificacao: 'BLOCO-L1-001',
                lote: 'LT-2026-CSN-01',
                peso_kg: 1250.5,
                espessura_mm: 130,
                largura_mm: 130,
                comprimento_mm: 6000,
                bloco_b_motivo: '01_REAPROVEITAMENTO_CARTEIRA',
                bloco_b_nova_aplicacao: 'APL_ESTRUTURAL_60',
                bloco_b_permite_fora_padrao: true,
                compatibilidade: 'COMPATIBLE_WITH_RESERVATION',
                situacao: 'EM_ANALISE',
                avaliador_id: 'usr-pcp-01',
                avaliador_nome: 'Engenheiro de Processo',
                data_avaliacao: '2026-03-20T10:00:00Z',
                cancelado: false,
                comparativo_json: [],
              },
            ]
          }
          if (colName === 'line_raw_material_priorities') {
            return [
              {
                id: 'prio-1',
                material_code: 'MP-PRIO-01',
                material_description: 'Tarugo Laminado 130mm',
                active: true,
                priority_order: 1,
              },
            ]
          }
          if (colName === 'mp_application_requirements') {
            return [
              {
                id: 'app-req-1',
                application_code: 'APL_ESTRUTURAL_60',
                application_name: 'Estrutural 60x60mm',
                min_thickness_mm: 1.5,
                max_thickness_mm: 6.35,
                min_width_mm: 30,
                max_width_mm: 130,
                min_length_mm: 3000,
                max_length_mm: 12000,
                min_weight_kg: 5,
                max_weight_kg: 2000,
                allows_out_of_ideal: true,
              },
            ]
          }
          return []
        }),
        getOne: vi.fn().mockImplementation(async (id: string) => ({
          id,
          numero_sequencial: 'AMP-000001/2026',
        })),
        create: vi.fn().mockImplementation(async (payload: any) => ({
          id: 'eval-created-99',
          ...payload,
          // Simula o retorno atômico do hook do backend mp_out_of_standard_guard
          numero_sequencial: 'AMP-000099/2026',
        })),
        update: vi.fn().mockImplementation(async (id: string, data: any) => ({
          id,
          ...data,
        })),
      })),
    },
    pb: {
      authStore: {
        isValid: true,
        record: {
          id: 'usr-pcp-01',
          name: 'Engenheiro de Processo',
          email: 'eng@ciafal.com.br',
          role: 'PCP_ADMIN',
        },
      },
    },
  }
})

describe('Aceitação Frontend — Aproveitamento MP Fora do Padrão (ZPP86/ZPP88)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // (b) Seleção de MP carrega dados dos cadastros oficiais
  it('(b) Seleção de MP carrega dados oficiais de Ficha Mestra / Prioridades e marca ausência de dados fictícios', async () => {
    const candidates = await mpOutOfStandardService.loadMPCandidatesFromOfficialCadastros()
    expect(candidates.length).toBeGreaterThan(0)

    const first = candidates[0]
    expect(first.centro).toBeDefined()
    expect(first.material_codigo).toBeDefined()
    expect(first.item_identificacao).toBeDefined()
    expect(first.peso_kg).toBeGreaterThan(0)
    expect(first.espessura_mm).toBeGreaterThan(0)
    expect(first.largura_mm).toBeGreaterThan(0)
    expect(first.comprimento_mm).toBeGreaterThan(0)
    expect(['PRIORIDADES', 'INVENTARIO', 'FICHA_MESTRA']).toContain(first.source)
  })

  // (c) Comparativo Conforme/Divergente contra os limites da aplicação
  it('(c) Comparativo técnico avalia Conforme e Divergente com base nos limites parametrizados', () => {
    const mockApp: ApplicationRequirementCandidate = {
      id: 'app-test',
      application_code: 'APL_TEST',
      application_name: 'Aplicação Teste',
      min_thickness_mm: 2.0,
      max_thickness_mm: 10.0,
      min_width_mm: 50.0,
      max_width_mm: 150.0,
      min_length_mm: 1000,
      max_length_mm: 8000,
      min_weight_kg: 50,
      max_weight_kg: 2000,
      allows_out_of_ideal: true,
      source_type: 'REQUISITO_OFICIAL',
      is_parameterized: true,
    }

    // Cenário 1: Tudo dentro da faixa -> COMPATIBLE
    const pecaConforme = {
      peso_kg: 1000,
      espessura_mm: 5.0,
      largura_mm: 100.0,
      comprimento_mm: 6000,
    }
    const resConforme = mpOutOfStandardService.evaluateCompatibility(pecaConforme, mockApp, false)
    expect(resConforme.compatibilidade).toBe('COMPATIBLE')
    expect(resConforme.comparativo.every((c) => c.resultado === 'CONFORME')).toBe(true)

    // Cenário 2: Espessura fora da faixa (15mm > max 10mm), mas permiteForaPadrao = true -> COMPATIBLE_WITH_RESERVATION
    const pecaDivergente = {
      peso_kg: 1000,
      espessura_mm: 15.0,
      largura_mm: 100.0,
      comprimento_mm: 6000,
    }
    const resRessalva = mpOutOfStandardService.evaluateCompatibility(pecaDivergente, mockApp, true)
    expect(resRessalva.compatibilidade).toBe('COMPATIBLE_WITH_RESERVATION')
    const espRow = resRessalva.comparativo.find((c) => c.parametro === 'Espessura')
    expect(espRow?.resultado).toBe('DIVERGENTE')

    // Cenário 3: Divergente e permiteForaPadrao = false -> INCOMPATIBLE
    const resIncompativel = mpOutOfStandardService.evaluateCompatibility(
      pecaDivergente,
      mockApp,
      false,
    )
    expect(resIncompativel.compatibilidade).toBe('INCOMPATIBLE')
  })

  // (d) "Regra técnica não parametrizada" quando sem matriz
  it('(d) Exibe "Regra técnica não parametrizada" e NUNCA considera aprovado quando sem matriz', () => {
    const mockAppSemMatriz: ApplicationRequirementCandidate = {
      id: 'app-sem-matriz',
      application_code: 'APL_SEM_MATRIZ',
      application_name: 'Aplicação Sem Matriz',
      min_thickness_mm: undefined,
      max_thickness_mm: undefined,
      source_type: 'REQUISITO_OFICIAL',
      is_parameterized: false,
    }

    const peca = {
      peso_kg: 1250,
      espessura_mm: 130,
      largura_mm: 130,
      comprimento_mm: 6000,
    }

    const res = mpOutOfStandardService.evaluateCompatibility(peca, mockAppSemMatriz, true)
    expect(res.regraStatus).toBe('NAO_PARAMETRIZADA')
    expect(res.compatibilidade).toBe('INCOMPATIBLE')
    expect(
      res.comparativo.every((c) => c.nova_aplicacao === 'Regra técnica não parametrizada'),
    ).toBe(true)
    expect(res.comparativo.every((c) => c.resultado === 'NAO_PARAMETRIZADO')).toBe(true)
  })

  // (e) Salvamento persiste e o número AMP vem do backend
  it('(e) Salvamento cria avaliação e garante que o número sequencial AMP retornado vem do backend', async () => {
    const created = await mpOutOfStandardService.createEvaluation({
      centro: '1000',
      material_codigo: 'T950102000040',
      item_identificacao: 'BLOCO-L1-001',
      aplicacao_atual: 'APL_ORIGINAL',
      peso_kg: 1250.5,
      espessura_mm: 130,
      largura_mm: 130,
      comprimento_mm: 6000,
      bloco_b_motivo: '01_REAPROVEITAMENTO_CARTEIRA',
      bloco_b_nova_aplicacao: 'APL_ESTRUTURAL_60',
      bloco_b_permite_fora_padrao: true,
      comparativo_json: [],
      compatibilidade: 'COMPATIBLE',
      regra_tecnica_status: 'PARAMETRIZADA',
    })

    // O backend gerou o número sequencial AMP
    expect(created.numero_sequencial).toMatch(/^AMP-\d{6}\/\d{4}$/)
    expect(created.id).toBeDefined()
  })

  // Cancelamento lógico no backend
  it('Cancelamento lógico exige motivo e não executa exclusão física', async () => {
    // Sem motivo deve lançar erro
    await expect(mpOutOfStandardService.cancelEvaluation('eval-1', '')).rejects.toThrow(
      'A justificativa de cancelamento é obrigatória.',
    )

    // Com motivo válido executa update cancelado=true
    const cancelled = await mpOutOfStandardService.cancelEvaluation(
      'eval-1',
      'Cancelamento autorizado por engenharia devido a mudança de carteira.',
    )
    expect(cancelled.cancelado).toBe(true)
    expect(cancelled.situacao).toBe('CANCELADA')
    expect(cancelled.motivo_cancelamento).toBe(
      'Cancelamento autorizado por engenharia devido a mudança de carteira.',
    )
  })

  // (f) Permissões de PCP
  it('(f) Motivos de fora do padrão possuem lista parametrizável documentada', () => {
    expect(DEFAULT_OUT_OF_STANDARD_REASONS.length).toBeGreaterThanOrEqual(5)
    expect(DEFAULT_OUT_OF_STANDARD_REASONS[0].code).toBe('01_REAPROVEITAMENTO_CARTEIRA')
  })

  // (g) Formatação pt-BR / ABNT obrigatória
  it('(g) Formatação pt-BR / ABNT: vírgula decimal, ponto de milhar, unidades padronizadas', () => {
    const peso = 1250.5
    const espessura = 12.5
    const comprimento = 6000

    const formattedPeso = `${formatNumberPtBr(peso, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`
    const formattedEspessura = `${formatNumberPtBr(espessura, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mm`
    const formattedComprimento = `${formatNumberPtBr(comprimento, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mm`

    // Padrão ABNT pt-BR
    expect(formattedPeso).toBe('1.250,50 kg')
    expect(formattedEspessura).toBe('12,50 mm')
    expect(formattedComprimento).toBe('6.000 mm')
  })
})
