import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo OBRIGATÓRIO (padrão do projeto — named + default no mesmo arquivo).
// Nunca remover um dos dois: telas em ErrorBoundary = verificar este export primeiro.
export { pb }
export default pb
