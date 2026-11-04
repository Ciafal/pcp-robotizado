import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo OBRIGATÓRIO (pb nomeado + default) — protegido por
// src/__tests__/pocketbase-client-export.test.ts. NÃO remover (regressão crônica).
export { pb }
export default pb
