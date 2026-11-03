import PocketBase from 'pocketbase'

const pbClient = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pbClient.autoCancellation(false)

// Export duplo obrigatório (regra permanente do projeto — regressão nº 17):
// `export const pb` (importações nomeadas) + `export default` (imports legados).
// Blindado por src/__tests__/pocketbase-client-export.test.ts
export const pb = pbClient
export default pb
