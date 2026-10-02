import PocketBase from 'pocketbase'

const url = import.meta.env.VITE_POCKETBASE_URL || '/'
export const pb = new PocketBase(url)

// Regra permanente do projeto: SEMPRE export nomeado { pb } + export default pb
export default pb
