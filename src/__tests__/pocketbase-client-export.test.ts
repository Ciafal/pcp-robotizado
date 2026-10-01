import { describe, it, expect } from 'vitest'
import pbDefault, { pb } from '@/lib/pocketbase/client'
import pbHub, { pb as hubPb } from '@/lib/pocketbase/index'
import * as clientModule from '@/lib/pocketbase/client'
import * as hubModule from '@/lib/pocketbase/index'

describe('PocketBase Client Export Regression Test & Guard', () => {
  it('should export pb as named export and as default export from client.ts', async () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
    expect(clientModule).toHaveProperty('pb')
    expect(clientModule).toHaveProperty('default')
  })

  it('valida estaticamente que client.ts contém expressamente "export const pb" ou "export { pb }"', async () => {
    const clientRaw = await import('../lib/pocketbase/client.ts?raw')
    const content = clientRaw.default || ''
    const hasNamedExport =
      content.includes('export const pb') ||
      content.includes('export { pb }') ||
      content.includes('export { pb as default, pb }')
    expect(hasNamedExport).toBe(true)
    expect(content.includes('export default pb')).toBe(true)
  })

  it('should export pb as named export and as default export from index.ts hub', () => {
    expect(hubPb).toBeDefined()
    expect(pbHub).toBeDefined()
    expect(hubPb).toBe(pbHub)
    expect(hubModule).toHaveProperty('pb')
    expect(hubModule).toHaveProperty('default')
  })

  it('should expose PocketBase client instance methods', () => {
    expect(typeof pb.collection).toBe('function')
    expect(typeof pb.send).toBe('function')
    expect(typeof pb.authStore).toBe('object')
  })

  it('should ensure all services importing from pocketbase client or index find named pb export', async () => {
    // Verificação dinâmica de serviços críticos que consomem named export
    const sapValidation = await import('@/services/sap-validation-service')
    expect(sapValidation.sapValidationService).toBeDefined()

    const sgqDoc = await import('@/services/sgq-document-provider')
    expect(sgqDoc.sgqDocumentProvider).toBeDefined()

    const sapMat = await import('@/services/sap-material-service')
    expect(sapMat.sapMaterialService).toBeDefined()

    const carteiraKpis = await import('@/services/carteira-kpis-engine')
    expect(carteiraKpis).toBeDefined()

    const dailyDev = await import('@/services/daily-deviation-service')
    expect(dailyDev.dailyDeviationService).toBeDefined()

    const effCenter = await import('@/services/efficiency-center-service')
    expect(effCenter.efficiencyCenterService).toBeDefined()

    const inventoryDemands = await import('@/services/pcp-inventory-demands-service')
    expect(inventoryDemands.pcpInventoryDemandsService).toBeDefined()
  })
})
