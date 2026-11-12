/**
 * Serviço da seção "2 — Dados do Retrabalho" do popup Adicionar Item
 * para Retrabalho (Programação → Tipo RETRABALHO).
 *
 * Uma única chamada ao hook /api/pcp/rework/helpers devolve:
 *  - usuários ativos do HUB Ciafal (coleção users do PocketBase), para o
 *    autocomplete de "Solicitado por" — sem cadastro manual de pessoas;
 *  - materiais do cadastro já usado pelo sistema (ordens de produção do
 *    centro + programação semanal), com código SAP, descrição, bitola,
 *    família e aço — sem cadastro paralelo de materiais.
 */

export interface ReworkUserOption {
  id: string
  name: string
  username: string
  email: string
  role: string
}

export interface ReworkMaterialOption {
  code: string
  description: string
  gauge: string
  family: string
  steel: string
}

export interface ReworkHelpersPayload {
  users: ReworkUserOption[]
  materials: ReworkMaterialOption[]
}

let cache: ReworkHelpersPayload | null = null
let cachePromise: Promise<ReworkHelpersPayload> | null = null

async function fetchHelpers(): Promise<ReworkHelpersPayload> {
  const pb = (await import('pocketbase')).default
  const { pb: client } = await import('@/lib/pocketbase/client')
  void pb
  const token = client.authStore.token
  const baseUrl = client.baseUrl.replace(/\/$/, '')

  const res = await fetch(`${baseUrl}/api/pcp/rework/helpers`, {
    method: 'GET',
    headers: token ? { Authorization: token } : undefined,
  })

  if (!res.ok) {
    let message = 'Não foi possível carregar os dados de apoio do retrabalho.'
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* mantém mensagem padrão */
    }
    throw new Error(message)
  }

  const data = (await res.json()) as ReworkHelpersPayload
  return {
    users: Array.isArray(data?.users) ? data.users : [],
    materials: Array.isArray(data?.materials) ? data.materials : [],
  }
}

/** Busca (com cache em memória) usuários + materiais para o popup. */
export async function fetchReworkHelpers(force = false): Promise<ReworkHelpersPayload> {
  if (force || !cachePromise) {
    cachePromise = fetchHelpers()
      .then((payload) => {
        cache = payload
        return payload
      })
      .catch((err) => {
        cachePromise = null
        throw err
      })
  }
  return cachePromise
}

export function getCachedReworkHelpers(): ReworkHelpersPayload | null {
  return cache
}

/** Rótulo exibido do material: "Código SAP — Descrição". */
export function formatMaterialLabel(m: {
  code: string
  description: string
  gauge?: string
  steel?: string
}): string {
  const bits = [m.code, m.description].filter(Boolean)
  const extras = [m.gauge, m.steel].filter(Boolean).join(' · ')
  return extras ? `${bits.join(' — ')} (${extras})` : bits.join(' — ')
}

/** Texto exibido do usuário: "Nome (usuário)" ou fallback pelo e-mail. */
export function formatUserLabel(u: ReworkUserOption): string {
  const name = u.name || u.username || u.email
  const handle = u.username || u.email
  return handle && handle !== name ? `${name} (${handle})` : name
}

export const REWORK_DEFAULTS = {
  origem: 'LD enviado da SDC para retrabalho na Ciafal',
  localizacao: 'Acabamento L1',
  localRetrabalho: 'Acabamento L1',
  responsavel: 'Geovane Reis',
} as const
