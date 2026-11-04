import { CarteiraItem } from '@/types/carteira-analise'
import { ItemCurvaAbcCalculado } from '@/services/curva-abc-faturamento-engine'

/**
 * Constrói um CarteiraItem mínimo e consistente a partir de ItemCurvaAbcCalculado
 * para garantir que a navegação para o DetalheMaterialUnificadoModal NUNCA seja silenciosa
 * e nunca falhe mesmo se o item for oriundo de SDC, agrupamento ou se não tiver ordem de venda.
 */
export function criarCarteiraItemMinimo(
  itemCalc: Partial<ItemCurvaAbcCalculado> & { codigo_material: string },
): CarteiraItem {
  const carteiraTons = itemCalc.carteira_tons ?? 0
  const estoqueTons = itemCalc.estoque_disponivel_tons ?? 0
  const programadoTons = itemCalc.programado_tons ?? 0
  // Fórmula oficial: Carteira - Estoque Disponível - Programado
  const deficitTons =
    itemCalc.deficit_tons ?? Math.max(0, carteiraTons - estoqueTons - programadoTons)

  return {
    empresa: 'CIAFAL',
    centro: itemCalc.centro || '1100',
    linha: itemCalc.linha || 'Outros',
    ordem_venda: 'OV-SINTETICA',
    item_ordem: '10',
    data_ordem: new Date().toISOString().slice(0, 10),
    data_desejada: new Date().toISOString().slice(0, 10),
    codigo_cliente: 'CLI-GERAL',
    nome_cliente: 'Carteira Consolidada / Mercado',
    codigo_material: itemCalc.codigo_material,
    descricao_material: itemCalc.descricao_material || `Material ${itemCalc.codigo_material}`,
    familia: itemCalc.linha || 'Geral',
    curva_abc: itemCalc.curva_abc || 'A',
    tipo_ordem: 'MTS',
    origem_produto: 'PRODUCAO_PROPRIA',
    qtd_ordem_tons: carteiraTons,
    qtd_faturada_tons: 0,
    carteira_aberta_tons: carteiraTons,
    carteira_vendas_tons: carteiraTons,
    carteira_mto_tons: 0,
    estoque_livre_tons: estoqueTons,
    estoque_mto_tons: 0,
    estoque_semiacabado_tons: 0,
    estoque_acabado_tons: estoqueTons,
    saldo_disponivel_tons: estoqueTons - carteiraTons,
    saldo_positivo_tons: Math.max(0, estoqueTons - carteiraTons),
    saldo_negativo_tons: Math.max(0, carteiraTons - estoqueTons),
    necessidade_liquida_tons: deficitTons,
    falta_produzir_tons: deficitTons,
    status_atendimento: deficitTons > 0 ? 'A_PRODUZIR' : 'A_FATURAR',
    qtd_programada_tons: programadoTons,
    media_faturamento_diario_t_dia:
      itemCalc.faturamento_brl && itemCalc.faturamento_brl > 0
        ? itemCalc.faturamento_brl / 30
        : carteiraTons > 0
          ? carteiraTons / 30
          : 0.1,
    dias_cobertura: carteiraTons > 0 ? estoqueTons / (carteiraTons / 30) : 99,
    status_ruptura: deficitTons > 0 ? 'VERMELHO' : 'VERDE',
    bloqueio: false,
  }
}

/**
 * Resolve o CarteiraItem real a partir de um ItemCurvaAbcCalculado e coleções disponíveis
 */
export function resolverCarteiraItem(
  itemCalc: ItemCurvaAbcCalculado,
  itensBase: CarteiraItem[] = [],
  sdcItens?: any[],
): CarteiraItem {
  // 1. Se tem origemItemOriginal e é CarteiraItem com ordem_venda
  if (itemCalc.origemItemOriginal && typeof itemCalc.origemItemOriginal === 'object') {
    const orig = itemCalc.origemItemOriginal as any
    if (orig.ordem_venda && orig.codigo_material) {
      return orig as CarteiraItem
    }
    if (orig.material && !orig.codigo_material) {
      // É CarteiraSDCItem
      const mat = orig.material
      const ciEncontrado = itensBase.find((i) => i.codigo_material === mat)
      if (ciEncontrado) return ciEncontrado
    }
  }

  // 2. Busca na lista base de CarteiraItem
  const encontrado = itensBase.find((i) => i.codigo_material === itemCalc.codigo_material)
  if (encontrado) {
    return encontrado
  }

  // 3. Busca em SDC se disponível
  if (sdcItens && sdcItens.length > 0) {
    const sdc = sdcItens.find((s) => s.material === itemCalc.codigo_material)
    if (sdc) {
      return criarCarteiraItemMinimo({
        codigo_material: sdc.material,
        descricao_material: sdc.descricao || itemCalc.descricao_material,
        curva_abc: sdc.curva || itemCalc.curva_abc,
        centro: sdc.centro || itemCalc.centro,
        linha: sdc.linha || itemCalc.linha,
        carteira_tons: sdc.carteira_total_t ?? itemCalc.carteira_tons,
        estoque_disponivel_tons: sdc.estoque_disponivel_t ?? itemCalc.estoque_disponivel_tons,
        programado_tons: sdc.programado_t ?? itemCalc.programado_tons,
        deficit_tons: sdc.deficit_atual_t ?? itemCalc.deficit_tons,
      })
    }
  }

  // 4. Fallback resolutivo infalível: cria o CarteiraItem mínimo com dados da própria linha
  return criarCarteiraItemMinimo(itemCalc)
}
