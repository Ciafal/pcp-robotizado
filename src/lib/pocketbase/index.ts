/**
 * Central PocketBase Instance & Re-export Hub
 *
 * GARANTIA ARQUITETURAL DE ESTABILIDADE:
 * Este módulo centraliza e blinda o singleton do cliente PocketBase.
 * Ele provê exports imutáveis `pb` e `default`, protegendo contra reescritas acidentais
 * ou geradores de código de scaffolding que possam tentar reescrever apenas o `client.ts`.
 */
import PocketBase from 'pocketbase'
import clientPb, { pb as namedClientPb } from './client'
export * from './errors'

const resolvedPb: PocketBase =
  namedClientPb ||
  (clientPb as any)?.pb ||
  clientPb ||
  new PocketBase(import.meta.env.VITE_POCKETBASE_URL)

export const pb: PocketBase = resolvedPb
export default resolvedPb
