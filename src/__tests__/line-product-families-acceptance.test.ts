import { describe, it, expect, beforeEach } from 'vitest'
import {
  lineProductFamiliesService,
  LineFamilyFormData,
  OFFICIAL_LINE_CYLINDERS,
  formatMm,
  formatLengthMm,
  parseDimension,
} from '@/services/line-product-families-service'
import { pb } from '@/lib/pocketbase/client'

describe('Módulo Famílias de Produtos - Ficha Mestra Expandida (Acceptance Suite)', () => {
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

  describe('1. Formatação pt-BR e Parsers de Dimensões', () => {
    it('deve converter corretamente valores em pt-BR (vírgula decimal) e números', () => {
      expect(parseDimension('130,00')).toBe(130)
      expect(parseDimension('130.50')).toBe(130.5)
      expect(parseDimension('1.250,50')).toBe(1250.5)
      expect(parseDimension(140)).toBe(140)
      expect(parseDimension('')).toBeNull()
      expect(parseDimension(null)).toBeNull()
      expect(parseDimension('abc')).toBeNull()
    })

    it('deve formatar milímetros com padrão pt-BR vírgula decimal', () => {
      expect(formatMm(130)).toBe('130,00 mm')
      expect(formatMm(130.5)).toBe('130,50 mm')
      expect(formatMm(0)).toBe('0,00 mm')
      expect(formatMm(null)).toBe('0,00 mm')
    })

    it('deve formatar comprimentos inteiros com separador de milhar pt-BR', () => {
      expect(formatLengthMm(6000)).toBe('6.000 mm')
      expect(formatLengthMm(12000)).toBe('12.000 mm')
      expect(formatLengthMm(null)).toBe('0 mm')
    })
  })

  describe('2. Validações de Negócio do Formulário de Família', () => {
    it('deve validar obrigatoriedade de família, cilindro e código PM', () => {
      const invalidData: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: '',
        cylinder_code: '',
        pm_equipment_code: '',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        gauges: [{ bitola: '8,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' }],
      }

      const errors = lineProductFamiliesService.validateFormData(invalidData)
      expect(errors.family_name).toBeDefined()
      expect(errors.cylinder_code).toBeDefined()
      expect(errors.pm_equipment_code).toBeDefined()
    })

    it('deve validar faixas de MP: mín <= máx e ambos > 0', () => {
      // mín > máx
      const invalidRange: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: 'TESTE FAIXA',
        cylinder_code: 'CJ-L1-TQ-50',
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '150,00',
        max_mp_diameter_mm: '130,00',
        gauges: [{ bitola: '8,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' }],
      }
      const errRange = lineProductFamiliesService.validateFormData(invalidRange)
      expect(errRange.min_mp_diameter_mm).toBeDefined()
      expect(errRange.max_mp_diameter_mm).toBeDefined()

      // valores negativos ou zero
      const invalidZero: LineFamilyFormData = {
        ...invalidRange,
        min_mp_diameter_mm: '0',
        max_mp_diameter_mm: '-10',
      }
      const errZero = lineProductFamiliesService.validateFormData(invalidZero)
      expect(errZero.min_mp_diameter_mm).toContain('maior que zero')
      expect(errZero.max_mp_diameter_mm).toContain('maior que zero')
    })

    it('deve validar bitolas da família: sem duplicidade e comprimentos mín <= máx', () => {
      const duplicateBitolaData: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: 'TESTE BITOLAS',
        cylinder_code: 'CJ-L1-TQ-50',
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        gauges: [
          { bitola: '8,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' },
          { bitola: '8,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' }, // Duplicada
        ],
      }
      const errDup = lineProductFamiliesService.validateFormData(duplicateBitolaData)
      expect(errDup.gauge_errors?.[1]?.bitola).toContain('duplicada')

      const invalidGaugeLength: LineFamilyFormData = {
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: 'TESTE BITOLAS',
        cylinder_code: 'CJ-L1-TQ-50',
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        gauges: [
          { bitola: '10,00 mm', min_length_mm: '15.000', max_length_mm: '12.000' }, // Mín > Máx
        ],
      }
      const errLength = lineProductFamiliesService.validateFormData(invalidGaugeLength)
      expect(errLength.gauge_errors?.[0]?.min_length_mm).toBeDefined()
    })

    it('deve associar equipamento SAP PM correspondente ao selecionar o cilindro', () => {
      const cylinder = OFFICIAL_LINE_CYLINDERS[0]
      expect(cylinder).toBeDefined()
      const found = lineProductFamiliesService.findEquipmentByCylinder(cylinder.code)
      expect(found).toBeDefined()
      expect(found?.pmEquipmentCode).toBe(cylinder.pmEquipmentCode)
    })
  })

  describe('3. CRUD Completo no PocketBase, Exclusão Lógica e Auditoria', () => {
    it('deve criar, ler, atualizar, inativar e excluir logicamente no banco real', async () => {
      const uniqueFamilyName = `TUBOS ESPECIAIS QA ${Date.now().toString().slice(-5)}`

      // 1. Criação
      const created = await lineProductFamiliesService.save({
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: uniqueFamilyName,
        cylinder_code: 'CJ-L1-TQ-50',
        pm_equipment_code: 'PM-EQ-100291',
        min_mp_diameter_mm: '130,00',
        max_mp_diameter_mm: '140,00',
        gauges: [
          { bitola: '8,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' },
          { bitola: '10,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' },
        ],
        notes: 'Registro criado para validação da Ficha Mestra',
      })

      expect(created.id).toBeDefined()
      expect(created.family_name).toBe(uniqueFamilyName)
      expect(created.cylinder_code).toBe('CJ-L1-TQ-50')
      expect(created.pm_equipment_code).toBe('PM-EQ-100291')
      expect(created.min_mp_diameter_mm).toBe(130)
      expect(created.max_mp_diameter_mm).toBe(140)
      expect(created.gauges_count).toBe(2)
      expect(created.active).toBe(true)
      expect(created.deleted).toBe(false)

      // 2. Bloqueio de duplicidade para o mesmo centro
      const isDup = await lineProductFamiliesService.checkDuplicate({
        lineId: testLineId,
        centerCode: testCenterCode,
        familyName: uniqueFamilyName,
      })
      expect(isDup).toBe(true)

      // 3. Atualização
      const updated = await lineProductFamiliesService.save({
        id: created.id,
        line_id: testLineId,
        center_code: testCenterCode,
        family_name: uniqueFamilyName,
        cylinder_code: 'CJ-L1-TR-6030',
        pm_equipment_code: 'PM-EQ-100292',
        min_mp_diameter_mm: '132,00',
        max_mp_diameter_mm: '142,00',
        gauges: [
          { bitola: '8,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' },
          { bitola: '10,00 mm', min_length_mm: '6.000', max_length_mm: '12.000' },
          { bitola: '12,50 mm', min_length_mm: '6.000', max_length_mm: '14.000' },
        ],
      })
      expect(updated.cylinder_code).toBe('CJ-L1-TR-6030')
      expect(updated.gauges_count).toBe(3)
      expect(updated.min_mp_diameter_mm).toBe(132)

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
