/*
 * Cliente PocketBase central (fonte única — não recriar instância em outro módulo).
 *
 * REGRA PERMANENTE DO PROJETO (regressões 4 e 5): a exportação dupla `pb` — nomeada
 * (`export const pb`) e default (`export default pb`) — deve existir SEMPRE, pois
 * serviços e testes importam por `import pb, { pb }`. A asserção estática de
 * regressão valida a string literal "export const pb" neste arquivo.
 */
import PocketBase from 'pocketbase'

const instance = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
instance.autoCancellation(false)

export const pb = instance
export default pb
