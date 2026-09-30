import { describe, it, expect, beforeEach } from 'vitest'
import {
  theoreticalLossesService,
  TheoreticalLossFormData,
} from '@/services/theoretical-losses-service'
import { pb } from '@/lib/pocketbase/client'

describe('Módulo Perdas Teóricas - Ficha Mestra (Acceptance Suite)', () => {
  const testLineId = 'op0mf1gz9aluu4x' // Linha L1 existente no banco

  beforeEach(() => {
    // Configura authStore para testes
    pb.authStore.save('test-token', {
      id: 'test-user-id',
      email: 'programador.pcp@ciafal.com.br',
      name: 'Programador PCP Teste',
      role: 'PCP_PROGRAMMER',
      collectionId: 'users',
      collectionName: 'users',
    } as any)
  })

  describe('1. Parser e Formatação pt-BR de Percentuais', () => {
    it('deve aceitar números com vírgula decimal pt-BR', () => {
      expect(theoreticalLossesService.parsePercentage('1,50')).toBe(1.5)
      expect(theoreticalLossesService.parsePercentage('0,75')).toBe(0.75)
      expect(theoreticalLossesService.parsePercentage('12,34')).toBe(12.34)
      expect(theoreticalLossesService.parsePercentage('100')).toBe(100)
      expect(theoreticalLossesService.parsePercentage('0')).toBe(0)
    })

    it('deve aceitar números com ponto padrão', () => {
      expect(theoreticalLossesService.parsePercentage('1.50')).toBe(1.5)
      expect(theoreticalLossesService.parsePercentage(2.25)).toBe(2.25)
    })

    it('deve retornar null para strings vazias ou inválidas', () => {
      expect(theoreticalLossesService.parsePercentage('')).toBeNull()
      expect(theoreticalLossesService.parsePercentage('   ')).toBeNull()
      expect(theoreticalLossesService.parsePercentage('abc')).toBeNull()
      expect(theoreticalLossesService.parsePercentage(null)).toBeNull()
    })

    it('deve formatar no padrão pt-BR com 2 casas decimais e vírgula', () => {
      expect(theoreticalLossesService.formatPercentage(1.5)).toBe('1,50')
      expect(theoreticalLossesService.formatPercentage(0.75)).toBe('0,75')
      expect(theoreticalLossesService.formatPercentage(0)).toBe('0,00')
      expect(theoreticalLossesService.formatPercentage(null)).toBe('0,00')
    })
  })

  describe('2. Validação de Regras de Negócio e Limites (0 a 100%)', () => {
    it('deve rejeitar percentuais negativos ou maiores que 100%', () => {
      const data: TheoreticalLossFormData = {
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: 'MP-TEST-001',
        raw_material_description: 'Tarugo Teste 130x130',
        bitola: 'Não há',
        application: 'Geral',
        rm_pct: '-1,5',
        carepa_pct: '105',
        apara_pct: '0,5',
      }

      const errors = theoreticalLossesService.validateFormData(data)
      expect(errors.rm_pct).toBeDefined()
      expect(errors.carepa_pct).toBeDefined()
    })

    it('deve rejeitar quando a soma das perdas ultrapassa 100%', () => {
      const data: TheoreticalLossFormData = {
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: 'MP-TEST-001',
        raw_material_description: 'Tarugo Teste 130x130',
        bitola: 'Não há',
        application: 'Geral',
        rm_pct: '50',
        carepa_pct: '40',
        apara_pct: '20', // Soma = 110%
      }

      const errors = theoreticalLossesService.validateFormData(data)
      expect(errors.general).toContain('não pode ultrapassar 100,00%')
    })

    it('deve aprovar dados válidos dentro do range', () => {
      const data: TheoreticalLossFormData = {
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: 'MP-TEST-001',
        raw_material_description: 'Tarugo Teste 130x130',
        bitola: 'Não há',
        application: 'Geral',
        rm_pct: '1,50',
        carepa_pct: '0,80',
        apara_pct: '0,50',
      }

      const errors = theoreticalLossesService.validateFormData(data)
      expect(Object.keys(errors).length).toBe(0)
    })

    it('deve validar limites exatos de 0% e 100% como válidos isoladamente quando a soma não ultrapassa 100%', () => {
      const dataMin: TheoreticalLossFormData = {
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: 'MP-TEST-000',
        raw_material_description: 'Tarugo Teste Limite 0',
        bitola: 'Não há',
        application: 'Geral',
        rm_pct: '0,00',
        carepa_pct: '0',
        apara_pct: '0,0',
      }
      expect(Object.keys(theoreticalLossesService.validateFormData(dataMin)).length).toBe(0)

      const dataMax: TheoreticalLossFormData = {
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: 'MP-TEST-100',
        raw_material_description: 'Tarugo Teste Limite 100',
        bitola: 'Não há',
        application: 'Geral',
        rm_pct: '100,00',
        carepa_pct: '0,00',
        apara_pct: '0,00',
      }
      expect(Object.keys(theoreticalLossesService.validateFormData(dataMax)).length).toBe(0)
    })
  })

  describe('3. Persistência Real no Banco PocketBase (CRUD + Exclusão Lógica + Auditoria)', () => {
    it('deve criar, ler, atualizar e excluir logicamente no PocketBase real', async () => {
      const uniqueCode = `MP-QA-${Date.now().toString().slice(-6)}`
      const uniqueApp = `App-QA-${Date.now().toString().slice(-4)}`

      // 1. Criação
      const created = await theoreticalLossesService.save({
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: uniqueCode,
        raw_material_description: 'Tarugo 130x130 Teste QA',
        bitola: 'Não há',
        application: uniqueApp,
        rm_pct: '1,75',
        carepa_pct: '0,85',
        apara_pct: '0,40',
        notes: 'Registro criado via suíte de testes de perdas teóricas',
      })

      expect(created.id).toBeDefined()
      expect(created.rm_pct).toBe(1.75)
      expect(created.carepa_pct).toBe(0.85)
      expect(created.apara_pct).toBe(0.4)
      expect(created.total_loss_pct).toBe(3.0) // 1.75 + 0.85 + 0.40 = 3.00%
      expect(created.deleted).toBeFalsy()

      // 2. Leitura
      const fetched = await theoreticalLossesService.getById(created.id)
      expect(fetched).not.toBeNull()
      expect(fetched?.raw_material_code).toBe(uniqueCode)
      expect(fetched?.total_loss_pct).toBe(3.0)

      // 3. Edição
      const updated = await theoreticalLossesService.save({
        id: created.id,
        line_id: testLineId,
        center_code: 'L1',
        raw_material_type: 'TARUGO_130X130',
        raw_material_code: uniqueCode,
        raw_material_description: 'Tarugo 130x130 Teste QA Atualizado',
        bitola: 'Não há',
        application: uniqueApp,
        rm_pct: '2,00',
        carepa_pct: '1,00',
        apara_pct: '0,50',
      })

      expect(updated.rm_pct).toBe(2.0)
      expect(updated.carepa_pct).toBe(1.0)
      expect(updated.total_loss_pct).toBe(3.5) // 2.00 + 1.00 + 0.50

      // 4. Verificação de Duplicidade
      const isDup = await theoreticalLossesService.checkDuplicate({
        lineId: testLineId,
        rawMaterialCode: uniqueCode,
        bitola: 'Não há',
        application: uniqueApp,
      })
      expect(isDup).toBe(true)

      // 5. Exclusão Lógica (Soft Delete)
      const deletedRecord = await theoreticalLossesService.softDelete(
        created.id,
        'Exclusão lógica de teste QA',
      )
      expect(deletedRecord.deleted).toBe(true)
      expect(deletedRecord.deleted_at).toBeDefined()

      // 6. Lista padrão não traz o registro excluído
      const listAfterDelete = await theoreticalLossesService.listByLine(testLineId)
      const foundInActiveList = listAfterDelete.some((r) => r.id === created.id)
      expect(foundInActiveList).toBe(false)

      // 7. Lista com includeDeleted=true traz o registro
      const listWithDeleted = await theoreticalLossesService.listByLine(testLineId, {
        includeDeleted: true,
      })
      const foundInAllList = listWithDeleted.some((r) => r.id === created.id)
      expect(foundInAllList).toBe(true)

      // 8. Restauração
      const restored = await theoreticalLossesService.restore(created.id)
      expect(restored.deleted).toBe(false)
      expect(restored.deleted_at).toBeNull()

      // Limpeza final para não deixar sujeira
      await theoreticalLossesService.softDelete(created.id, 'Limpeza de teste')
    })
  })
})
