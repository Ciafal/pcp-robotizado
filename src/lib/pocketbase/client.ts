import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo OBRIGATÓRIO (named + default) — não remover.
// Regressão histórica ~27x no projeto: o export nomeado `pb` é consumido
// por dezenas de serviços, páginas e testes (import { pb } from ...).
export { pb }
export default pb
