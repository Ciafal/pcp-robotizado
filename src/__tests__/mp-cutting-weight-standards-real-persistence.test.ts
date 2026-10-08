import { test, expect } from 'vitest'
import { mpCuttingWeightStandardsService } from '@/services/mp-cutting-weight-standards-service'
import { pb } from '@/lib/pocketbase/client'
import type { MPCuttingWeightStandard } from '@/types/mp-cutting-weight-standards'

test('Persistência Real no PocketBase: Salvar Padrão Simplificado (3 Parâmetros) e Verificar Leitura/F5', async () => {
  // Dados de teste real com valores solicitados pelo usuário:
  // Peso Ideal = 2,100 t (2100 kg), Mínimo = 2,000 t (2000 kg), Máximo = 2,300 t (2300 kg)
  // Sem preenchimento de campos de tolerância no payload de entrada
  const testPayload: Partial<MPCuttingWeightStandard> = {
    description: '[TESTE PERSISTÊNCIA REAL v0.0.476] Padrão Tarugo 130 Simplificado 2.100 t',
    cutting_type: 'BLOCOS',
    company_code: 'CIAFAL',
    center_codes: ['SEML1'],
    material_codes: ['TARUGO-130-1020'],
    steel_family: 'SAE 1020',
    target_weight_kg: 2100, // 2,100 t
    min_weight_kg: 2000, // 2,000 t
    max_weight_kg: 2300, // 2,300 t
    priority: 'ALTA',
    start_date: '2026-03-31',
    status: 'ATIVO',
    technical_notes: 'Padrão criado para validação de persistência real de 3 parâmetros',
  }

  // 1. Salva via serviço (fluxo oficial da aplicação)
  const saveResult = await mpCuttingWeightStandardsService.saveStandard(
    testPayload,
    'QA Engenheiro Teste Automatizado',
  )

  expect(saveResult.success).toBe(true)
  expect(saveResult.standard).toBeDefined()
  const createdRecord = saveResult.standard!
  expect(createdRecord.id).toBeTruthy()
  expect(createdRecord.code).toMatch(/^PAD-/)
  expect(createdRecord.target_weight_kg).toBe(2100)
  expect(createdRecord.min_weight_kg).toBe(2000)
  expect(createdRecord.max_weight_kg).toBe(2300)

  console.log('PADRAO_PERSISTIDO_REAL_ID:', createdRecord.id)
  console.log('PADRAO_PERSISTIDO_REAL_CODE:', createdRecord.code)

  // 2. Persistência real / F5: buscar diretamente no banco PocketBase pelo ID gerado
  const fetched = await pb.collection('mp_cutting_weight_standards').getOne(createdRecord.id!)

  expect(fetched.id).toBe(createdRecord.id)
  expect(fetched.code).toBe(createdRecord.code)
  expect(fetched.target_weight_kg).toBe(2100)
  expect(fetched.min_weight_kg).toBe(2000)
  expect(fetched.max_weight_kg).toBe(2300)
  // As tolerâncias foram auto-calculadas internamente para conformidade com colunas legadas do banco
  expect(fetched.tolerance_lower_val).toBe(100) // 2100 - 2000 = 100 kg
  expect(fetched.tolerance_upper_val).toBe(200) // 2300 - 2100 = 200 kg

  // 3. Edição do registro persistido (mantendo o mesmo ID, alterando descrição e notas)
  const updateResult = await mpCuttingWeightStandardsService.saveStandard(
    {
      ...createdRecord,
      technical_notes: 'Atualização confirmada no banco real',
    },
    'QA Engenheiro Teste Automatizado',
  )
  expect(updateResult.success).toBe(true)
  expect(updateResult.standard?.id).toBe(createdRecord.id)

  const fetchedAfterUpdate = await pb
    .collection('mp_cutting_weight_standards')
    .getOne(createdRecord.id!)
  expect(fetchedAfterUpdate.technical_notes).toBe('Atualização confirmada no banco real')

  // 4. Inativação do registro (regra: nunca destruir histórico, apenas inativar)
  const inactivateResult = await mpCuttingWeightStandardsService.toggleStatus(
    updateResult.standard!,
    'QA Engenheiro Teste Automatizado',
  )
  expect(inactivateResult.success).toBe(true)
  expect(inactivateResult.standard?.status).toBe('INATIVO')

  const fetchedAfterInactivation = await pb
    .collection('mp_cutting_weight_standards')
    .getOne(createdRecord.id!)
  expect(fetchedAfterInactivation.status).toBe('INATIVO')
})
