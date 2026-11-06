import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo obrigatório: { pb } (named) + default. Regressão crônica do
// projeto (~63 erros de build quando o named export some) — NÃO remover.
export { pb }
export default pb
