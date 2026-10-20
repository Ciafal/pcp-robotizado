import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Garantia do export duplo (nomeado + default) - Regra permanente do HUB CIAFAL
export default pb
