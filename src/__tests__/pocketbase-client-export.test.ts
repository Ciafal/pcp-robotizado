import { describe, it, expect } from 'vitest'
import pbDefault, { pb } from '@/lib/pocketbase/client'
import pbHub, { pb as hubPb } from '@/lib/pocketbase/index'

describe('PocketBase Client Export Regression Test', () => {
  it('should export pb as named export and as default export from client.ts', () => {
    expect(pb).toBeDefined()
    expect(pbDefault).toBeDefined()
    expect(pb).toBe(pbDefault)
  })

  it('should export pb as named export and as default export from index.ts hub', () => {
    expect(hubPb).toBeDefined()
    expect(pbHub).toBeDefined()
    expect(hubPb).toBe(pbHub)
  })

  it('should expose PocketBase client instance methods', () => {
    expect(typeof pb.collection).toBe('function')
    expect(typeof pb.send).toBe('function')
    expect(typeof pb.authStore).toBe('object')
  })
})
