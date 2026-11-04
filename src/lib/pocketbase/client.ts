import PocketBase from 'pocketbase'

const pbInstance = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pbInstance.autoCancellation(false)

// Export duplo permanente: regressão crônica nº 21+ do projeto — NÃO remover.
export const pb = pbInstance
export default pbInstance
