import { describe, it, expect, beforeEach } from 'vitest'
import {
  lineProductFamiliesService,
  LineFamilyFormData,
  formatMm,
  formatMeters,
  parseDimension,
} from '@/services/line-product-families-service'
import { pb } from '@/lib/pocketbase/client'

describe('Módulo Famílias de Produtos - Ficha Mestra Expandida (Acceptance Suite Reestruturada)', () => {
  const testLineId = 'op0mf1gz9aluu4x' // Linha L1 existente no banco
  const testCenterCode = 'L1'

  beforeEach(() => {
    pb.authStore.save('test-token', {
      id: 'test-user-id',
      email: 'programador.pcp@ciafal.com.br',
      name: 'Programador PCP Teste',
      role: 'PCP_PROGRAMMER',
      collectionId: 'users',
      collectionName: 'users',
    } as any)
  })

  describe('1. Formatação pt-BR e Parsers de Dimensões (SI / pt-BR)', () => {
    it('deve converter corretamente valores em pt-BR (vírgula decimal) e números', () => {
      expect(parseDimension('130,00')).toBe(130)
      expect(parseDimension('130.50')).toBe(130.5)
      expect(parseDimension('6,00')).toBe(6)
      expect(parseDimension('12,00')).toBe(12)
      expect(parseDimension(140)).toBe(140)
      expect(parseDimension('')).toBeNull()
      expect(parseDimension(null)).toBeNull()
      expect(parseDimension('abc')).toBeNull()
    })

    it('deve formatar milímetros com padrão pt-BR vírgula decimal e espaço', () => {
      expect(formatMm(130)).toBe('130,00 mm')
      expect(formatMm(130.5)).toBe('130,50 mm')
      expect(formatMm(0)).toBe('0,00 mm')
      expect(formatMm(null)).toBe('0,00 mm')
    })

    it('deve formatar comprimentos em metros (m) com padrão brasileiro 6,00 m', () => {
      expect(formatMeters(6)).toBe('6,00 m')
      expect(formatMeters(12)).toBe('12,00 m')
      expect(formatMeters(6.5)).toBe('6,50 m')
      expect(formatMeters(null)).toBe('0,00 m')
    })
  })

  describe('2. Validações de Negócio: Comprimentos MP (m) e Bitolas', () => {
    it('deve validar obrigatoriedade de família e faixas de MP', () => {
      const invalidData: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: '',
        pm_equipment_code: '',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        comprimento_min_mp: '6,00',
        comprimento_max_mp: '12,00',
        gauges: [{ bitola: '8,00 mm' }],
      }

      const errors = lineProductFamiliesService.validateFormData(invalidData)
      expect(errors.family_name).toBeDefined()
      // Cilindro NÃO deve ser mais exigido
      expect((errors as any).cylinder_code).toBeUndefined()
    })

    it('deve bloquear salvamento se comprimento mín > máx com mensagem exata do requisito', () => {
      const invalidLengthData: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: 'TESTE COMPRIMENTO',
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        comprimento_min_mp: '12,00', // Mínimo 12 m
        comprimento_max_mp: '6,00', // Máximo 6 m
        gauges: [{ bitola: '8,00 mm' }],
      }

      const errors = lineProductFamiliesService.validateFormData(invalidLengthData)
      expect(errors.comprimento_min_mp).toBe(
        'O comprimento mínimo da matéria-prima não pode ser maior que o comprimento máximo.',
      )
      expect(errors.comprimento_max_mp).toBe(
        'O comprimento mínimo da matéria-prima não pode ser maior que o comprimento máximo.',
      )
    })

    it('deve bloquear bitola duplicada com mensagem "Esta bitola já pertence a esta família."', () => {
      const duplicateBitolaData: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: 'TESTE BITOLAS DUPLICADAS',
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        comprimento_min_mp: '6,00',
        comprimento_max_mp: '12,00',
        gauges: [
          { bitola: '8,00 mm', description: 'Bitola fina', active: true },
          { bitola: '8,00 mm', description: 'Repetida', active: true }, // Duplicada
        ],
      }
      const errDup = lineProductFamiliesService.validateFormData(duplicateBitolaData)
      expect(errDup.gauge_errors?.[1]?.bitola).toBe('Esta bitola já pertence a esta família.')
    })
  })

  describe('3. CRUD Completo no PocketBase com novos campos de Comprimento e Bitolas', () => {
    it('deve criar, ler, atualizar, inativar e excluir logicamente com persistência real', async () => {
      const uniqueFamilyName = `TUBOS ESPECIAIS REESTRUTURADOS ${Date.now().toString().slice(-5)}`

      // 1. Criação com novos campos
      const created = await lineProductFamiliesService.save({
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: uniqueFamilyName,
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        comprimento_min_mp: '6,00',
        comprimento_max_mp: '12,00',
        gauges: [
          { bitola: '8,00 mm', description: 'Perfil padrão', active: true },
          { bitola: '10,00 mm', description: 'Perfil médio', active: true },
          { bitola: '12,50 mm', description: 'Perfil pesado', active: false },
        ],
        notes: 'Registro criado para validação da Ficha Mestra Reestruturada',
      })

      expect(created.id).toBeDefined()
      expect(created.family_name).toBe(uniqueFamilyName)
      expect(created.comprimento_min_mp).toBe(6)
      expect(created.comprimento_max_mp).toBe(12)
      expect(created.min_mp_diameter_mm).toBe(130)
      expect(created.max_mp_diameter_mm).toBe(140)
      expect(created.gauges_count).toBe(3) // 3 bitolas cadastradas
      expect(created.active).toBe(true)
      expect(created.deleted).toBe(false)

      // 2. Bloqueio de duplicidade para o mesmo centro
      const isDup = await lineProductFamiliesService.checkDuplicate({
        lineId: testLineId,
        centerCode: testCenterCode,
        familyName: uniqueFamilyName,
      })
      expect(isDup).toBe(true)

      // 3. Atualização alterando limites e lista de bitolas
      const updated = await lineProductFamiliesService.save({
        id: created.id,
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: uniqueFamilyName,
        pm_equipment_code: 'PM-EQ-100292',
        min_mp_diameter_mm: '132,00',
        max_mp_diameter_mm: '142,00',
        comprimento_min_mp: '6,50',
        comprimento_max_mp: '14,00',
        gauges: [
          { bitola: '8,00 mm', description: 'Perfil padrão atualizado', active: true },
          { bitola: '10,00 mm', description: 'Perfil médio', active: true },
          // Remoção lógica da bitola 12,50
          { bitola: '12,50 mm', description: 'Perfil pesado', active: false, deleted: true },
          // Nova bitola adicionada
          { bitola: '16,00 mm', description: 'Nova bitola grossa', active: true },
        ],
      })
      expect(updated.comprimento_min_mp).toBe(6.5)
      expect(updated.comprimento_max_mp).toBe(14)
      expect(updated.gauges_count).toBe(3) // 3 ativas (1 deletada)

      // 4. Inativação (toggleActive)
      const deactivated = await lineProductFamiliesService.toggleActive(created.id, false)
      expect(deactivated.active).toBe(false)

      // Reativação
      const reactivated = await lineProductFamiliesService.toggleActive(created.id, true)
      expect(reactivated.active).toBe(true)

      // 5. Exclusão lógica (softDelete - sem exclusão física)
      const softDeleted = await lineProductFamiliesService.softDelete(
        created.id,
        'Teste automatizado de exclusão lógica',
      )
      expect(softDeleted.deleted).toBe(true)
      expect(softDeleted.deleted_at).toBeDefined()
      expect(softDeleted.active).toBe(false)

      // 6. Confirmação que não aparece na listagem ativa
      const activeList = await lineProductFamiliesService.listByLine(testLineId)
      expect(activeList.some((f) => f.id === created.id)).toBe(false)

      // 7. Confirmação que o registro FÍSICO permanece no banco
      const recordInDb = await pb.collection('line_product_families').getOne(created.id)
      expect(recordInDb).toBeDefined()
      expect(recordInDb.id).toBe(created.id)
      expect(recordInDb.deleted).toBe(true)
    })
  })
})
