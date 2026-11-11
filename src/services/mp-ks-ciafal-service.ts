// Serviço de domínio do tópico "Envio de MP KS → Ciafal".
// Frontend fala com os hooks pb (backend valida tudo); leituras vão direto no PocketBase.
import { pb } from '@/lib/pocketbase/client'
import { DEPOSITO_POR_ORIGEM } from './sap-integration-service'

export const ORIGENS_ENVIO = [
  { value: 'KSC', label: 'KSC' },
  { value: 'KSF', label: 'KSF' },
  { value: 'CISAM', label: 'Cisam' },
] as const

export const STATUS_SITUACAO = ['Não iniciado', 'Parcial', 'Atendido', 'Excedente'] as const
export type SituacaoBloco = (typeof STATUS_SITUACAO)[number]

export interface PecaKs {
  id: string
  centro: string
  origem: string
  matnr: string
  maktx: string
  aplicacao: string
  peso_kg: number
  corrida: string
  letra: string
  numero_bloco: string
  data_envio: string
  certificado_ok: boolean
  status_bloco: string
  deposito: string
  deposito_atual: string
  status: string // Liberado | Selecionado | Em transito | Recebido
  selecao_id: string
  romaneio_id: string
}

export interface SelecaoKs {
  id: string
  centro: string
  origem: string
  numero_selecao: string
  versao: string
  vigente: boolean
  semana_spwoc: string
  programacao_versao: string
  elaborado_por_nome: string
  criado_por: string
  criado_em: string
  modificado_por: string
  modificado_em: string
  motivo_codigo: string
  justificativa: string
  status: string
  qtd_pecas: number
  peso_total_kg: number
  documento_311: string
}

export interface RomaneioKs {
  id: string
  numero_romaneio: string
  selecao_id: string
  numero_selecao: string
  centro: string
  origem: string
  deposito_destino: string
  destino_tipo: string
  status: string
  qtd_pecas: number
  peso_total_kg: number
  criado_por: string
  criado_em: string
  documento_313: string
  documento_315: string
  recebido_por: string
  recebido_em: string
  divergencias: string
}

export interface MotivoZpp82 {
  id: string
  codigo: string
  descricao: string
  ativo: boolean
}

export interface UsuarioExpedidor {
  id: string
  matricula: string
  nome: string
  centro: string
  lin_prod: string
}

const BASE = 'backend/v1/pcp/mp-ks-ciafal'

async function post<T>(path: string, body: unknown): Promise<T> {
  return pb.send(`${BASE}/${path}`, { method: 'POST', body: body as Record<string, unknown> })
}

// ------------------------------------------------------------------ login
export async function loginExpedidor(
  centro: string,
  matricula: string,
  senha: string,
): Promise<UsuarioExpedidor> {
  const res = await post<{ success: boolean; usuario?: UsuarioExpedidor; error?: string }>(
    'login',
    {
      centro,
      matricula,
      senha,
    },
  )
  if (!res.success || !res.usuario) throw new Error(res.error || 'Falha no login.')
  return res.usuario
}

// ------------------------------------------------------------------ leituras
export async function listarPecas(centro: string, origem: string): Promise<PecaKs[]> {
  const recs = await pb.collection('mp_ks_ciafal_pecas').getFullList({
    filter: `centro = "${centro}" && origem = "${origem}"`,
    sort: 'aplicacao,matnr,numero_bloco',
  })
  return recs as unknown as PecaKs[]
}

export async function listarSelecoes(centro: string): Promise<SelecaoKs[]> {
  const recs = await pb.collection('mp_ks_ciafal_selecoes').getFullList({
    filter: `centro = "${centro}"`,
    sort: '-created',
  })
  return recs as unknown as SelecaoKs[]
}

export async function listarMotivos(): Promise<MotivoZpp82[]> {
  const recs = await pb
    .collection('mp_ks_ciafal_motivos')
    .getFullList({ filter: 'ativo = true', sort: 'codigo' })
  return recs as unknown as MotivoZpp82[]
}

export async function listarRomaneios(centro: string): Promise<RomaneioKs[]> {
  const recs = await pb.collection('mp_ks_ciafal_romaneios').getFullList({
    filter: `centro = "${centro}"`,
    sort: '-created',
  })
  return recs as unknown as RomaneioKs[]
}

export interface PecaRomaneio {
  id: string
  romaneio_id: string
  peca_id: string
  matnr: string
  maktx: string
  peso_kg: number
  corrida: string
  numero_bloco: string
  situacao: string
}

export async function listarPecasRomaneio(romaneioId: string): Promise<PecaRomaneio[]> {
  const recs = await pb.collection('mp_ks_ciafal_romaneio_pecas').getFullList({
    filter: `romaneio_id = "${romaneioId}"`,
    sort: 'matnr,numero_bloco',
  })
  return recs as unknown as PecaRomaneio[]
}

// ------------------------------------------------------------------ comandos
export interface SalvarSelecaoPayload {
  selecao_id?: string
  centro: string
  origem: string
  semana_spwoc?: string
  programacao_versao?: string
  criado_por?: string
  criado_em?: string
  criado_matricula?: string
  versao_anterior?: string
  motivo_id?: string
  motivo_codigo?: string
  justificativa?: string
  usuario: { matricula: string; nome: string }
  pecas: string[]
}

export interface SalvarSelecaoResultado {
  selecao_id: string
  numero_selecao: string
  versao: string
  vigente: boolean
  qtd_pecas: number
  peso_total_kg: number
  mensagem: string
}

export async function salvarSelecao(
  payload: SalvarSelecaoPayload,
): Promise<SalvarSelecaoResultado> {
  const res = await post<{ success: boolean; selecao?: SalvarSelecaoResultado; error?: string }>(
    'selecoes',
    payload,
  )
  if (!res.success || !res.selecao) throw new Error(res.error || 'Falha ao salvar a seleção.')
  return res.selecao
}

export async function executarTransferencia311(
  selecaoId: string,
  usuario: { matricula: string; nome: string },
) {
  const res = await post<{
    success: boolean
    resultado?: { mensagem: string; ja_transferida: boolean; documento_311: string }
    error?: string
  }>('transferencia-311', { selecao_id: selecaoId, usuario })
  if (!res.success || !res.resultado) throw new Error(res.error || 'Falha na transferência 311.')
  return res.resultado
}

export async function criarRomaneio(payload: {
  selecao_id: string
  peca_ids: string[]
  destino_tipo: 'L1' | 'L2'
  usuario: { matricula: string; nome: string }
}) {
  const res = await post<{
    success: boolean
    romaneio?: {
      numero_romaneio: string
      romaneio_id: string
      qtd_pecas: number
      peso_total_kg: number
    }
    error?: string
  }>('romaneios', payload)
  if (!res.success || !res.romaneio) throw new Error(res.error || 'Falha ao gerar o romaneio.')
  return res.romaneio
}

export async function expedirRomaneio(
  romaneioId: string,
  usuario: { matricula: string; nome: string },
) {
  const res = await post<{
    success: boolean
    resultado?: { mensagem: string; status: string }
    error?: string
  }>('romaneios/expedir', {
    romaneio_id: romaneioId,
    usuario,
  })
  if (!res.success || !res.resultado) throw new Error(res.error || 'Falha na expedição 313.')
  return res.resultado
}

export async function receberRomaneio(
  romaneioId: string,
  divergencias: string,
  usuario: { matricula: string; nome: string },
) {
  const res = await post<{
    success: boolean
    resultado?: { mensagem: string; status: string }
    error?: string
  }>('romaneios/receber', {
    romaneio_id: romaneioId,
    divergencias,
    usuario,
  })
  if (!res.success || !res.resultado) throw new Error(res.error || 'Falha no recebimento 315.')
  return res.resultado
}

export async function confirmarDp07(
  romaneioId: string,
  usuario: { matricula: string; nome: string },
) {
  const res = await post<{
    success: boolean
    resultado?: { mensagem: string; status: string }
    error?: string
  }>('romaneios/confirmar-dp07', {
    romaneio_id: romaneioId,
    usuario,
  })
  if (!res.success || !res.resultado) throw new Error(res.error || 'Falha na confirmação DP07.')
  return res.resultado
}

// ------------------------------------------------------------------ helpers
export function situacaoBloco(
  previsto: number,
  atendido: number,
  selecionado: number,
): SituacaoBloco {
  if (previsto <= 0 && selecionado <= 0) return 'Não iniciado'
  if (selecionado > previsto + 1e-9) return 'Excedente'
  if (selecionado + 1e-9 >= previsto && previsto > 0) return 'Atendido'
  if (selecionado > 0) return 'Parcial'
  return 'Não iniciado'
}

export function formatterPeso(kg: number): string {
  return (
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
      kg / 1000,
    ) + ' t'
  )
}

export function formatterKg(kg: number): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(kg) + ' kg'
}

export function depositoOrigem(origem: string): string {
  return DEPOSITO_POR_ORIGEM[origem] || 'DP20'
}

export const STATUS_ROMANEIO_LABEL: Record<string, string> = {
  Em_formacao: 'Em formação',
  'Em formacao': 'Em formação',
  'Pronto para expedicao': 'Pronto para expedição',
  'Em transito': 'Em trânsito',
  'Aguardando recebimento': 'Aguardando recebimento',
  'Aguardando confirmacao DP07': 'Aguardando confirmação DP07',
  Recebido: 'Recebido',
  Cancelado: 'Cancelado',
  'Com divergencia': 'Com divergência',
}

export function statusRomaneioLabel(status: string): string {
  return STATUS_ROMANEIO_LABEL[status] || status
}
