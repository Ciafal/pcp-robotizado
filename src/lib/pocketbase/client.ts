import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo obrigatório (named + default): padrão inviolável do projeto.
// Regressão crônica documentada — nunca remover um dos dois exports.
export { pb }
export default pb
