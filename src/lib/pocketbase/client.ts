import PocketBase from 'pocketbase'

// PocketBase client instance for Skip Cloud backend
const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || '/'
export const pb = new PocketBase(pocketbaseUrl)
export default pb
