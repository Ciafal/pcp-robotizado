import { describe, it, expect, beforeAll } from 'vitest'
import { pb } from '@/lib/pocketbase/client'

describe('Check Direct Delete Rule on line_raw_material_restrictions', () => {
  beforeAll(async () => {
    try {
      await pb.collection('users').authWithPassword('programador.pcp@ciafal.com.br', 'Skip@Pass')
    } catch (_) {
      try {
        await pb.collection('users').authWithPassword('admin@pcp.ciafal.com.br', 'Skip@Pass')
      } catch (err) {
        console.warn('Auth failed:', err)
      }
    }
  })

  it('checks if authenticated user can delete directly or receives 403/400', async () => {
    console.log('Auth valid:', pb.authStore.isValid, 'user:', pb.authStore.record?.id)
    try {
      await pb.collection('line_raw_material_restrictions').delete('d14fvsduj5n8n14')
      console.log('Direct delete SUCCESS!')
    } catch (err: any) {
      console.log('Direct delete result:', {
        status: err?.status,
        message: err?.message,
        data: err?.data,
      })
    }
  })
})
