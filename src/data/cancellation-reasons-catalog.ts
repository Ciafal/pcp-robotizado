/**
 * Catálogo Oficial de Categorias e Motivos Gerenciais Parametrizáveis de Cancelamento
 * Requisito 10: Estrutura estrita exigida pelo usuário do HUB CIAFAL
 */

import { CancellationReasonCatalogItem } from '@/types/cancelled-orders'

export const OFFICIAL_CANCELLATION_CATALOG: CancellationReasonCatalogItem[] = [
  // 1. PCP/Planejamento
  {
    category: 'PCP/Planejamento',
    reason: 'Sem estoque em pronta entrega',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 1,
  },
  {
    category: 'PCP/Planejamento',
    reason: 'Falta de data de programação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 2,
  },
  {
    category: 'PCP/Planejamento',
    reason: 'Sem data de laminação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 3,
  },
  {
    category: 'PCP/Planejamento',
    reason: 'Carteira mínima não atingida',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 4,
  },
  {
    category: 'PCP/Planejamento',
    reason: 'Data de laminação não atende',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 5,
  },
  {
    category: 'PCP/Planejamento',
    reason: 'Atraso na data de laminação',
    default_probable_responsibility: 'PCP',
    active: true,
    sort_order: 6,
  },
  {
    category: 'PCP/Planejamento',
    reason: 'Falta de MP',
    default_probable_responsibility: 'Suprimentos',
    active: true,
    sort_order: 7,
  },

  // 2. Comercial
  {
    category: 'Comercial',
    reason: 'Alteração do produto',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 8,
  },
  {
    category: 'Comercial',
    reason: 'Alteração da condição de pagamento',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 9,
  },
  {
    category: 'Comercial',
    reason: 'Preço acima do concorrente',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 10,
  },
  {
    category: 'Comercial',
    reason: 'Melhores condições comerciais',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 11,
  },
  {
    category: 'Comercial',
    reason: 'Prazo de pagamento',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 12,
  },
  {
    category: 'Comercial',
    reason: 'Alteração no local de entrega',
    default_probable_responsibility: 'Comercial',
    active: true,
    sort_order: 13,
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

  // 5. Logística
  {
    category: 'Logística',
    reason: 'Sem carga para região',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 24,
  },
  {
    category: 'Logística',
    reason: 'Material não retirado',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 25,
  },
  {
    category: 'Logística',
    reason: 'Alteração do local de entrega',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 26,
  },
  {
    category: 'Logística',
    reason: 'Política de frete',
    default_probable_responsibility: 'Logística',
    active: true,
    sort_order: 27,
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
