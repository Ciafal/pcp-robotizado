import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Export duplo OBRIGATÓRIO (regressão crônica ~24x): named + default, mantido
// incondicionalmente e blindado por src/__tests__/pocketbase-client-export.test.ts.
export { pb }

export default pb
