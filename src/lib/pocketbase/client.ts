import PocketBase from 'pocketbase'

const backendUrl = import.meta.env.VITE_POCKETBASE_URL || window.location.origin
export const pb = new PocketBase(backendUrl)
export default pb
