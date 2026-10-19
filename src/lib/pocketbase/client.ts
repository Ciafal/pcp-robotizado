import PocketBase from 'pocketbase'

// Instância singleton do PocketBase para o HUB CIAFAL / PCP Robotizado
export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

export default pb
