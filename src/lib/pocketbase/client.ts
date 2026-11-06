import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo OBRIGATÓRIO (named + default) — regressão recorrente do projeto (~30×).
export { pb }
export default pb
