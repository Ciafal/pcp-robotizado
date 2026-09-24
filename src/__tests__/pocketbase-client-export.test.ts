import { describe, it, expect } from 'vitest'
import pbDefault, { pb } from '@/lib/pocketbase/client'

describe('PocketBase Client export contract', () => {
  it('exports pb as named export and default export pointing to the same instance', () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
    expect(typeof pb.collection).toBe('function')
  })
})
