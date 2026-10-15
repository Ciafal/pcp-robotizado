/**
 * Catálogo Oficial de Categorias e Motivos Gerenciais Parametrizáveis de Cancelamento
 * Requisito 10: Estrutura estrita exigida pelo usuário do HUB CIAFAL
 */

import { CancellationReasonCatalogItem, CategoriaRecusa } from '@/types/cancelled-orders'

/**
 * Catálogo Oficial de Motivos Estruturados por Categoria da Recusa (Requisitos 1 e 2)
 * Categorias permitidas: COMERCIAL, PCP, TRANSPORTE
 * Permite evolução contínua da lista sem alterar a lógica ou os cards executivos.
 */
export const STRUCTURED_REASONS_BY_CATEGORY: Record<CategoriaRecusa, string[]> = {
  COMERCIAL: [
    'Preço não aceito',
    'Condição comercial',
    'Prazo comercial',
    'Preço acima do concorrente',
    'Melhores condições comerciais',
    'Prazo de pagamento',
    'Alteração do produto',
    'Alteração da condição de pagamento',
    'Alteração no local de entrega',
  ],
  PCP: [
    'Falta de estoque',
    'Falta de matéria-prima',
    'Restrição de laminação',
    'Capacidade produtiva',
    'Sem estoque em pronta entrega',
    'Falta de data de programação',
    'Sem data de laminação',
    'Data de laminação não atende',
    'Atraso na data de laminação',
    'Carteira mínima não atingida',
    'Falta de MP',
  ],
  TRANSPORTE: [
    'Falta de veículo',
    'Frete não aprovado',
    'Transportadora indisponível',
    'Restrição de entrega',
    'Prazo logístico incompatível',
    'Sem carga para região',
    'Material não retirado',
    'Política de frete',
  ],
}

/**
 * Função utilitária para obter os motivos permitidos para uma categoria
 */
export function getMotivosPorCategoria(categoria?: CategoriaRecusa | null): string[] {
  if (!categoria) return []
  return STRUCTURED_REASONS_BY_CATEGORY[categoria] || []
}

export const OFFICIAL_CANCELLATION_CATALOG: CancellationReasonCatalogItem[] = [
  // 1. PCP/Planejamento (categoria_recusa: PCP)
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Falta de estoque',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 1,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Falta de matéria-prima',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 2,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Restrição de laminação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 3,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Capacidade produtiva',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 4,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Sem estoque em pronta entrega',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 5,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Falta de data de programação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 6,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Sem data de laminação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 7,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Carteira mínima não atingida',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 8,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Data de laminação não atende',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 9,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Atraso na data de laminação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 10,
  },
  {
    category: 'PCP/Planejamento',
    categoria_recusa: 'PCP',
    reason: 'Falta de MP',
    default_probable_responsibility: 'Suprimentos',
    active: true,
    sort_order: 11,
  },

  // 2. Comercial (categoria_recusa: COMERCIAL)
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Preço não aceito',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 12,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Condição comercial',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 13,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Prazo comercial',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 14,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Alteração do produto',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 15,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Alteração da condição de pagamento',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 16,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Preço acima do concorrente',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 17,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Melhores condições comerciais',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 18,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Prazo de pagamento',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 19,
  },
  {
    category: 'Comercial',
    categoria_recusa: 'COMERCIAL',
    reason: 'Alteração no local de entrega',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 20,
  },

  // 3. Cliente
  {
    category: 'Cliente',
    reason: 'Solicitação do cliente não justificada',
    default_probable_responsibility: 'Cliente',
    active: true,
    sort_order: 14,
  },
  {
    category: 'Cliente',
    reason: 'Sem retorno do cliente',
    default_probable_responsibility: 'Cliente',
    active: true,
    sort_order: 15,
  },
  {
    category: 'Cliente',
    reason: 'Quantidade maior',
    default_probable_responsibility: 'Cliente',
    active: true,
    sort_order: 16,
  },
  {
    category: 'Cliente',
    reason: 'Quantidade menor',
    default_probable_responsibility: 'Cliente',
    active: true,
    sort_order: 17,
  },
  {
    category: 'Cliente',
    reason: 'Data de remessa adiada',
    default_probable_responsibility: 'Cliente',
    active: true,
    sort_order: 18,
  },
  {
    category: 'Cliente',
    reason: 'Data de remessa adiantada',
    default_probable_responsibility: 'Cliente',
    active: true,
    sort_order: 19,
  },

  // 4. Crédito/Financeiro
  {
    category: 'Crédito/Financeiro',
    reason: 'Crédito não aprovado',
    default_probable_responsibility: 'Crédito/Financeiro',
    active: true,
    sort_order: 20,
  },
  {
    category: 'Crédito/Financeiro',
    reason: 'Cliente sem crédito',
    default_probable_responsibility: 'Crédito/Financeiro',
    active: true,
    sort_order: 21,
  },
  {
    category: 'Crédito/Financeiro',
    reason: 'Limite de crédito excedido',
    default_probable_responsibility: 'Crédito/Financeiro',
    active: true,
    sort_order: 22,
  },
  {
    category: 'Crédito/Financeiro',
    reason: 'Pagamento à vista não realizado',
    default_probable_responsibility: 'Crédito/Financeiro',
    active: true,
    sort_order: 23,
  },

  // 5. Logística / Transporte (categoria_recusa: TRANSPORTE)
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Falta de veículo',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 24,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Frete não aprovado',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 25,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Transportadora indisponível',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 26,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Restrição de entrega',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 27,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Prazo logístico incompatível',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 28,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Sem carga para região',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 29,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Material não retirado',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 30,
  },
  {
    category: 'Logística',
    categoria_recusa: 'TRANSPORTE',
    reason: 'Política de frete',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 31,
  },

  // 6. Qualidade/Indústria
  {
    category: 'Qualidade/Indústria',
    reason: 'Não atendimento composição química',
    default_probable_responsibility: 'Qualidade',
    active: true,
    sort_order: 28,
  },
  {
    category: 'Qualidade/Indústria',
    reason: 'Não atendimento comprimento',
    default_probable_responsibility: 'Qualidade',
    active: true,
    sort_order: 29,
  },
  {
    category: 'Qualidade/Indústria',
    reason: 'Não atendimento dimensões/tolerâncias',
    default_probable_responsibility: 'Qualidade',
    active: true,
    sort_order: 30,
  },
  {
    category: 'Qualidade/Indústria',
    reason: 'Não atendimento ensaios mecânicos',
    default_probable_responsibility: 'Qualidade',
    active: true,
    sort_order: 31,
  },
  {
    category: 'Qualidade/Indústria',
    reason: 'Não atendimento garantias superficiais',
    default_probable_responsibility: 'Qualidade',
    active: true,
    sort_order: 32,
  },
  {
    category: 'Qualidade/Indústria',
    reason: 'Não atendimento produto pela Indústria',
    default_probable_responsibility: 'Indústria',
    active: true,
    sort_order: 33,
  },
  {
    category: 'Qualidade/Indústria',
    reason: 'Problemas de certificado',
    default_probable_responsibility: 'Qualidade',
    active: true,
    sort_order: 34,
  },

  // 7. Cadastro/Processo
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de cadastro de cliente',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 35,
  },
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de representante',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 36,
  },
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de preço',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 37,
  },
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de produto',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 38,
  },
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de quantidade',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 39,
  },
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de remessa',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 40,
  },
  {
    category: 'Cadastro/Processo',
    reason: 'Erro de condição de pagamento',
    default_probable_responsibility: 'Cadastro',
    active: true,
    sort_order: 41,
  },

  // 8. Externo
  {
    category: 'Externo',
    reason: 'Greve',
    default_probable_responsibility: 'Externo',
    active: true,
    sort_order: 42,
  },
  {
    category: 'Externo',
    reason: 'eventos externos',
    default_probable_responsibility: 'Externo',
    active: true,
    sort_order: 43,
  },
  {
    category: 'Externo',
    reason: 'demais situações não controláveis',
    default_probable_responsibility: 'Externo',
    active: true,
    sort_order: 44,
  },
]
