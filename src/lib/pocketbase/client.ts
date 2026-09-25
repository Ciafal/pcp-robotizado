// PocketBase client instance for Skip Cloud
import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || '')
export default pb
