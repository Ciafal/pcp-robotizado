import PocketBase from 'pocketbase'

const backendUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) ||
  (typeof window !== 'undefined' && (window as any)?.__ENV__?.VITE_BACKEND_URL) ||
  ''

const pbInstance = new PocketBase(backendUrl)

export const pb = pbInstance
export default pbInstance
