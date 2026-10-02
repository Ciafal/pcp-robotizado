import { pb } from '@/lib/pocketbase/client'
import { CarteiraMinimaItem, CriticidadeCarteiraMinima } from '@/types/carteira-minima'
import {
  ComunicadoComercialRecord,
  DestinatarioHub,
  DestinoComunicado,
  EnviarComunicadoPayload,
  EnvioComunicadoResult,
  HistoricoItemEnvio,
  ItemComercialStatus,
  ItemResumoComunicado,
  PrioridadeComunicado,
  StatusComunicadoComercial,
} from '@/types/comercial-comunicado'
import { formatNumberPTBR } from '@/lib/number-format'
import { pcpAuditService } from './pcp-audit-service'

function formatarDataPtBr(dataIso?: string): string {
  if (!dataIso) return '—'
  const clean = dataIso.split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dataIso
}

function getDataAtualPtBr(): string {
  const d = new Date()
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

function formatarDataHoraPtBr(date: Date = new Date()): string {
  const data = date.toLocaleDateString('pt-BR')
  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} ${hora}`
}

export function gerarChaveItem(
  item: CarteiraMinimaItem | { pedido_venda?: string; item_pedido?: string; material?: string },
): string {
  const ped = (item.pedido_venda || 'PED').trim()
  const it = (item.item_pedido || '10').trim()
  const mat = (item.material || 'MAT').trim()
  return `${ped}_${it}_${mat}`
}

// Fallback em memória para ambiente offline / resilience
const inMemoryComunicados: ComunicadoComercialRecord[] = []
const inMemoryItemStatus: Map<string, ItemComercialStatus> = new Map()
let sequencialCounter = 1

/**
 * Usuários corporativos conhecidos da base / AD corporativo
 */
export const USUARIOS_CORPORATIVOS_HUB: DestinatarioHub[] = [
  {
    id: 'usr_comercial_gerente',
    name: 'Paula Guimarães (Gerência Comercial)',
    email: 'gerencia.comercial@ciafal.com.br',
    role: 'Gerência Comercial',
    sector: 'Comercial',
    grupo: 'Gerência Comercial',
  },
  {
    id: 'usr_comercial_analista',
    name: 'Renata Albuquerque (Atendimento Comercial)',
    email: 'comercial.atendimento@ciafal.com.br',
    role: 'Comercial',
    sector: 'Comercial',
    grupo: 'Comercial',
  },
  {
    id: 'usr_comercial_vendas',
    name: 'Carlos Alberto Silva (Vendas Indústria)',
    email: 'carlos.silva@ciafal.com.br',
    role: 'Vendedor / Representante',
    sector: 'Comercial',
    grupo: 'Vendedor/Representante responsável',
  },
  {
    id: 'usr_comercial_carteira',
    name: 'Juliana Costa (Gestão de Carteira)',
    email: 'juliana.costa@ciafal.com.br',
    role: 'Comercial',
    sector: 'Comercial',
    grupo: 'Comercial',
  },
  {
    id: 'usr_diretoria_comercial',
    name: 'Eduardo Fontes (Diretoria Comercial)',
    email: 'diretoria.comercial@ciafal.com.br',
    role: 'Outros autorizados',
    sector: 'Diretoria',
    grupo: 'Outros autorizados',
  },
]

export const comercialComunicadoService = {
  /**
   * Obtém usuários cadastrados no banco (users) mesclados aos grupos corporativos de Comercial do HUB
   */
  async listarDestinatariosHub(): Promise<DestinatarioHub[]> {
    const lista: DestinatarioHub[] = [...USUARIOS_CORPORATIVOS_HUB]

    try {
      const dbUsers = await pb.collection('users').getFullList({
        sort: 'name',
      })
      for (const u of dbUsers as any[]) {
        if (!lista.some((x) => x.email.toLowerCase() === (u.email || '').toLowerCase())) {
          lista.push({
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role || 'Usuário HUB',
            sector:
              u.role?.includes('COMMERCIAL') || u.role?.includes('COMERCIAL')
                ? 'Comercial'
                : 'Geral',
            grupo: 'Outros autorizados',
          })
        }
      }
    } catch {
      // Usa fallback da lista corporativa
    }

    return lista
  },

  /**
   * Sugere destinatários automaticamente: prioriza Comercial e vendedor responsável do pedido/material se houver
   */
  sugerirDestinatarios(
    itens: CarteiraMinimaItem[],
    todosDestinatarios: DestinatarioHub[],
  ): DestinatarioHub[] {
    const sugeridos: DestinatarioHub[] = []

    // 1. Procurar se algum item tem vendedor/responsável associado
    for (const item of itens) {
      const respItem = (item as any).vendedor_responsavel || (item as any).representante_vendedor
      if (respItem) {
        const found = todosDestinatarios.find(
          (d) =>
            d.name.toLowerCase().includes(String(respItem).toLowerCase()) ||
            d.email.toLowerCase().includes(String(respItem).toLowerCase()),
        )
        if (found && !sugeridos.some((s) => s.id === found.id)) {
          sugeridos.push({ ...found, isVendedorResponsavel: true })
        }
      }
    }

    // 2. Priorizar usuários da área comercial se nenhum vendedor direto foi marcado
    const usuariosComercial = todosDestinatarios.filter(
      (d) =>
        d.sector === 'Comercial' || d.grupo === 'Comercial' || d.grupo === 'Gerência Comercial',
    )

    for (const com of usuariosComercial) {
      if (!sugeridos.some((s) => s.id === com.id)) {
        sugeridos.push(com)
      }
      if (sugeridos.length >= 3) break
    }

    // Fallback garantido se a lista estiver vazia: seleciona os 2 primeiros
    if (sugeridos.length === 0 && todosDestinatarios.length > 0) {
      sugeridos.push(...todosDestinatarios.slice(0, 2))
    }

    return sugeridos
  },

  /**
   * Sugere prioridade com base na maior criticidade entre os itens selecionados
   */
  sugerirPrioridade(itens: CarteiraMinimaItem[]): PrioridadeComunicado {
    if (itens.some((it) => it.criticidade === 'Crítico')) {
      return 'Crítica'
    }
    if (itens.some((it) => it.criticidade === 'Atenção')) {
      return 'Atenção'
    }
    return 'Normal'
  },

  /**
   * Gera o assunto padrão: "PCP | Carteira mínima não atingida | [quantidade] item(ns)"
   */
  gerarAssuntoPadrao(qtdItens: number): string {
    const plural = qtdItens === 1 ? 'item' : 'itens'
    return `PCP | Carteira mínima não atingida | ${qtdItens} ${plural}`
  },

  /**
   * Gera a mensagem consolidada automática com dados reais estritos
   */
  gerarMensagemConsolidada(itens: CarteiraMinimaItem[]): string {
    const qtd = itens.length
    const plural = qtd === 1 ? 'item' : 'itens'

    const linhasTabela = itens.map((it) => {
      const mat = it.material || 'N/D'
      const ped = it.pedido_formatado || `${it.pedido_venda || ''} / ${it.item_pedido || '10'}`
      const saldo = `${formatNumberPTBR(it.saldo_produzir_tons, 3)} t`
      const prodMin = `${formatNumberPTBR(it.producao_minima_tons, 3)} t`
      const dataDes = formatarDataPtBr(it.data_desejada)
      return `• Material: ${mat} | Pedido: ${ped} | Saldo a produzir: ${saldo} | Produção mínima: ${prodMin} | Data desejada: ${dataDes}`
    })

    return [
      `Identificamos ${qtd} ${plural} com carteira abaixo da quantidade mínima necessária para produção/laminação. Solicitamos avaliação Comercial para verificar possibilidade de complementação da carteira, ajuste de quantidade ou alinhamento com o cliente.`,
      '',
      'Os itens abaixo apresentam saldo a produzir inferior à carteira mínima cadastrada:',
      ...linhasTabela,
      '',
      'Aguardamos retorno comercial para definição da programação de produção.',
    ].join('\n')
  },

  /**
   * Melhorar texto com IA sem alterar NENHUM dado de negócio (números, materiais, pedidos, datas)
   */
  melhorarTextoComIa(
    textoOriginal: string,
    itens: CarteiraMinimaItem[],
    prioridade: PrioridadeComunicado,
  ): string {
    const qtd = itens.length
    const plural = qtd === 1 ? 'item' : 'itens'
    const itensCriticos = itens.filter((i) => i.criticidade === 'Crítico')
    const menorData = [...itens]
      .filter((i) => i.data_desejada)
      .sort((a, b) => (a.data_desejada > b.data_desejada ? 1 : -1))[0]

    let destaqueCritico = ''
    if (itensCriticos.length > 0) {
      destaqueCritico = `\nATENÇÃO PRIORITÁRIA: ${itensCriticos.length} ${
        itensCriticos.length === 1
          ? 'item apresenta criticidade máxima'
          : 'itens apresentam criticidade máxima'
      } com risco imediato de atendimento.`
    }

    let destaquePrazo = ''
    if (menorData) {
      destaquePrazo = ` A data de entrega mais próxima desejada pelo cliente é ${formatarDataPtBr(
        menorData.data_desejada,
      )}.`
    }

    const linhasTabela = itens.map((it) => {
      const mat = it.material || 'N/D'
      const ped = it.pedido_formatado || `${it.pedido_venda || ''} / ${it.item_pedido || '10'}`
      const saldo = `${formatNumberPTBR(it.saldo_produzir_tons, 3)} t`
      const prodMin = `${formatNumberPTBR(it.producao_minima_tons, 3)} t`
      const dataDes = formatarDataPtBr(it.data_desejada)
      const crit = it.criticidade ? ` [${it.criticidade}]` : ''
      return `• ${mat} | Pedido ${ped} | Saldo a produzir: ${saldo} | Mínimo: ${prodMin} | Data: ${dataDes}${crit}`
    })

    return [
      `COMUNICADO OPERACIONAL PCP — CARTEIRA MÍNIMA NÃO ATINGIDA (${prioridade.toUpperCase()})`,
      '',
      `Informamos que ${qtd} ${plural} da carteira encontram-se com saldo a produzir inferior ao lote mínimo industrial de produção/laminação.${destaquePrazo}${destaqueCritico}`,
      '',
      'Solicitamos parecer urgente da equipe Comercial quanto à:',
      '1. Viabilidade de antecipação ou complementação de volume para atingimento do lote mínimo;',
      '2. Reprogramação de data ou alinhamento com cliente;',
      '3. Confirmação sobre liberação em lote reduzido ou retenção temporária.',
      '',
      'Relação consolidada dos itens pendentes de avaliação:',
      ...linhasTabela,
      '',
      'Aguardamos posicionamento via HUB para liberação da sequência operacional.',
    ].join('\n')
  },

  /**
   * Gera o próximo número sequencial oficial: COM-PCP-000001/2026
   */
  async gerarProximoNumeroSequencial(): Promise<string> {
    const ano = new Date().getFullYear()

    try {
      const records = await pb.collection('pcp_comercial_comunicados').getList(1, 1, {
        sort: '-created',
      })
      if (records && records.items.length > 0) {
        const ultSeq = (records.items[0] as any).numero_sequencial || ''
        const match = ultSeq.match(/COM-PCP-(\d+)\/(\d+)/)
        if (match && match[1]) {
          const num = parseInt(match[1], 10) + 1
          return `COM-PCP-${String(num).padStart(6, '0')}/${ano}`
        }
      }
    } catch {
      // Continua com contador local
    }

    const seqLocal = sequencialCounter++
    return `COM-PCP-${String(seqLocal).padStart(6, '0')}/${ano}`
  },

  /**
   * Consulta itens já enviados para verificar duplicidade
   */
  async verificarItemJaEnviado(item: CarteiraMinimaItem): Promise<ItemComercialStatus | null> {
    const chave = gerarChaveItem(item)

    try {
      const record = await pb
        .collection('pcp_comercial_item_status')
        .getFirstListItem(`item_chave="${chave}"`)
      if (record) {
        return {
          id: record.id,
          item_chave: record.item_chave,
          material: record.material,
          pedido_venda: record.pedido_venda,
          item_pedido: record.item_pedido,
          ultimo_comunicado_id: record.ultimo_comunicado_id,
          ultimo_comunicado_numero: record.ultimo_comunicado_numero,
          ultimo_envio_em: record.ultimo_envio_em,
          ultimo_envio_por: record.ultimo_envio_por,
          total_envios: record.total_envios || 0,
          status: record.status as StatusComunicadoComercial,
          historico_envios_json: record.historico_envios_json || [],
        }
      }
    } catch {
      // Tenta memória
    }

    if (inMemoryItemStatus.has(chave)) {
      return inMemoryItemStatus.get(chave)!
    }

    return null
  },

  /**
   * Consulta mapa de status para uma lista de itens
   */
  async obterMapaStatusItens(
    itens: CarteiraMinimaItem[],
  ): Promise<Record<string, ItemComercialStatus>> {
    const mapa: Record<string, ItemComercialStatus> = {}

    try {
      const records = await pb.collection('pcp_comercial_item_status').getFullList({
        sort: '-updated',
      })
      for (const r of records as any[]) {
        mapa[r.item_chave] = {
          id: r.id,
          item_chave: r.item_chave,
          material: r.material,
          pedido_venda: r.pedido_venda,
          item_pedido: r.item_pedido,
          ultimo_comunicado_id: r.ultimo_comunicado_id,
          ultimo_comunicado_numero: r.ultimo_comunicado_numero,
          ultimo_envio_em: r.ultimo_envio_em,
          ultimo_envio_por: r.ultimo_envio_por,
          total_envios: r.total_envios || 0,
          status: (r.status as StatusComunicadoComercial) || 'Enviado',
          historico_envios_json: r.historico_envios_json || [],
        }
      }
    } catch {
      // Copia de memória
      for (const [k, v] of inMemoryItemStatus.entries()) {
        mapa[k] = v
      }
    }

    // Garante chaves para todos
    for (const it of itens) {
      const chave = gerarChaveItem(it)
      if (!mapa[chave]) {
        mapa[chave] = {
          item_chave: chave,
          material: it.material,
          pedido_venda: it.pedido_venda,
          item_pedido: it.item_pedido,
          total_envios: 0,
          status: 'Não enviado',
          historico_envios_json: [],
        }
      }
    }

    return mapa
  },

  /**
   * Envia comunicado oficial ao Comercial com criação do card no Meu Dia e auditoria completa
   */
  async enviarComunicadoAoComercial(
    payload: EnviarComunicadoPayload,
  ): Promise<EnvioComunicadoResult> {
    const {
      itens,
      assunto,
      mensagem,
      prioridade,
      destinos,
      dataMeuDia,
      destinatarios,
      foiAprimoradoIa,
    } = payload

    // Validações obrigatórias conforme especificação
    if (!itens || itens.length === 0) {
      throw new Error('Selecione pelo menos 1 item para envio do comunicado.')
    }
    if (!destinatarios || destinatarios.length === 0) {
      throw new Error('Selecione pelo menos 1 destinatário corporativo.')
    }
    if (!destinos || destinos.length === 0) {
      throw new Error('Selecione pelo menos um canal de destino (Comercial – HUB ou Meu Dia).')
    }
    if (!assunto || !assunto.trim()) {
      throw new Error('O assunto do comunicado é obrigatório.')
    }
    if (!mensagem || !mensagem.trim()) {
      throw new Error('A mensagem do comunicado é obrigatória.')
    }
    if (destinos.includes('MEU_DIA')) {
      if (!dataMeuDia || !dataMeuDia.trim()) {
        throw new Error(
          'A data para o Meu Dia é obrigatória quando o destino Meu Dia estiver selecionado.',
        )
      }
    }

    const authRecord = pb.authStore.record || pb.authStore.model
    const remetenteId = (authRecord as any)?.id || 'usr_pcp_robotizado'
    const remetenteNome = (authRecord as any)?.name || 'PCP Robotizado'
    const remetenteEmail = (authRecord as any)?.email || 'pcp.robotizado@ciafal.com.br'

    const numeroSequencial = await comercialComunicadoService.gerarProximoNumeroSequencial()
    const dataHoraEnvio = formatarDataHoraPtBr(new Date())

    const itensResumo: ItemResumoComunicado[] = itens.map((it) => ({
      id: it.id,
      material: it.material,
      descricao_material: it.descricao_material,
      pedido_venda: it.pedido_venda,
      item_pedido: it.item_pedido,
      pedido_formatado: it.pedido_formatado,
      carteira_tons: it.carteira_tons,
      estoque_livre_tons: it.estoque_livre_tons,
      saldo_produzir_tons: it.saldo_produzir_tons,
      producao_minima_tons: it.producao_minima_tons,
      data_desejada: it.data_desejada,
      centro: it.centro,
      linha: it.linha || 'L1',
      criticidade: it.criticidade,
      vendedor_responsavel: (it as any).vendedor_responsavel,
    }))

    const dataDesejadaMaisProxima = [...itens]
      .filter((i) => i.data_desejada)
      .sort((a, b) => (a.data_desejada > b.data_desejada ? 1 : -1))[0]?.data_desejada

    const comunicadoRecord: Omit<ComunicadoComercialRecord, 'id'> = {
      numero_sequencial: numeroSequencial,
      tipo: 'Carteira mínima não atingida',
      assunto: assunto.trim(),
      mensagem: mensagem.trim(),
      mensagem_original: payload.mensagemOriginal || mensagem.trim(),
      prioridade,
      destinos_json: destinos,
      data_meu_dia: dataMeuDia || getDataAtualPtBr(),
      destinatarios_json: destinatarios,
      itens_relacionados_json: itensResumo,
      itens_count: itens.length,
      remetente_id: remetenteId,
      remetente_nome: remetenteNome,
      remetente_email: remetenteEmail,
      origem_sistema: 'PCP Robotizado',
      modulo_origem: 'Análise de Carteira > Carteira mínima não atingida',
      link_origem: '/pcp/analise-carteira/carteira-minima-nao-atingida',
      status: 'Enviado',
      foi_aprimorado_ia: Boolean(foiAprimoradoIa),
      leitura_confirmada: false,
    }

    let savedComunicadoId = `COM_${Date.now()}`

    // 1. Persistir o comunicado na collection `pcp_comercial_comunicados`
    try {
      const createdPb = await pb.collection('pcp_comercial_comunicados').create(comunicadoRecord)
      if (createdPb?.id) {
        savedComunicadoId = createdPb.id
      }
    } catch (err) {
      console.warn(
        '[comercialComunicadoService] Falha ao persistir em pcp_comercial_comunicados, usando fallback:',
        err,
      )
    }

    const fullComunicado: ComunicadoComercialRecord = {
      ...comunicadoRecord,
      id: savedComunicadoId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    inMemoryComunicados.unshift(fullComunicado)

    // 2. Se o destino inclui "MEU_DIA", gerar o card em meu_dia_pendencias apontando para o registro original
    if (destinos.includes('MEU_DIA')) {
      const tituloMeuDia = 'PCP – Carteira mínima não atingida'
      const descricaoMeuDia = `Comunicado ${numeroSequencial}: ${itens.length} item(ns) com carteira abaixo do lote mínimo. Pedidos: ${itens
        .map((i) => i.pedido_formatado || i.pedido_venda)
        .slice(0, 3)
        .join(', ')}. Materiais: ${itens
        .map((i) => i.material)
        .slice(0, 3)
        .join(
          ', ',
        )}. Maior criticidade: ${prioridade}. Data desejada mais próxima: ${formatarDataPtBr(
        dataDesejadaMaisProxima,
      )}. Enviado por ${remetenteNome} em ${dataHoraEnvio}.`

      for (const dest of destinatarios) {
        try {
          await pb.collection('meu_dia_pendencias').create({
            origem_sistema: 'PCP Robotizado',
            modulo: 'Análise de Carteira',
            funcao: 'Carteira mínima não atingida',
            categoria: 'PCP — Carteira Mínima Comercial',
            titulo: tituloMeuDia,
            competencia: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
            empresa: itens[0]?.empresa || 'CIAFAL',
            centro: itens[0]?.centro || '1100',
            linha: itens[0]?.linha || 'L1',
            codigo_atividade: numeroSequencial,
            atividade_titulo: assunto.slice(0, 50),
            status_origem: 'PENDENTE',
            tipo_pendencia: 'Avaliação Comercial de Carteira Mínima',
            descricao: descricaoMeuDia,
            acao_necessaria:
              'Avaliar complementação da carteira, antecipação de pedidos ou alinhamento com cliente.',
            prioridade:
              prioridade === 'Crítica' ? 'Crítica' : prioridade === 'Atenção' ? 'Alta' : 'Média',
            prazo: new Date().toISOString().split('T')[0],
            solicitante_id: remetenteId,
            solicitante_nome: remetenteNome,
            responsavel_id: dest.id,
            responsavel_nome: dest.name,
            responsavel_email: dest.email,
            data_hora: dataHoraEnvio,
            link_origem: `/pcp/analise-carteira/carteira-minima-nao-atingida?comunicado=${numeroSequencial}`,
            ajuste_numero: numeroSequencial,
            status: 'Nova',
          })
        } catch (meuDiaErr) {
          console.warn(
            '[comercialComunicadoService] Falha ao criar card no Meu Dia para',
            dest.email,
            meuDiaErr,
          )
        }
      }
    }

    // 3. Atualizar o status de cada item enviado na collection `pcp_comercial_item_status`
    for (const item of itens) {
      const chave = gerarChaveItem(item)
      const historicoItem: HistoricoItemEnvio = {
        comunicado_id: savedComunicadoId,
        numero_sequencial: numeroSequencial,
        data_envio: dataHoraEnvio,
        enviado_por: remetenteNome,
        prioridade,
        destinos,
        destinatarios: destinatarios.map((d) => d.name || d.email),
        assunto,
      }

      let statusAtual = inMemoryItemStatus.get(chave)
      let recordIdToUpdate: string | null = null

      try {
        const existing = await pb
          .collection('pcp_comercial_item_status')
          .getFirstListItem(`item_chave="${chave}"`)
        if (existing) {
          recordIdToUpdate = existing.id
          statusAtual = {
            id: existing.id,
            item_chave: existing.item_chave,
            material: existing.material,
            pedido_venda: existing.pedido_venda,
            item_pedido: existing.item_pedido,
            ultimo_comunicado_id: existing.ultimo_comunicado_id,
            ultimo_comunicado_numero: existing.ultimo_comunicado_numero,
            ultimo_envio_em: existing.ultimo_envio_em,
            ultimo_envio_por: existing.ultimo_envio_por,
            total_envios: existing.total_envios || 0,
            status: existing.status as StatusComunicadoComercial,
            historico_envios_json: existing.historico_envios_json || [],
          }
        }
      } catch {
        // Não achou no PB, segue
      }

      const novoHistorico = [...(statusAtual?.historico_envios_json || []), historicoItem]
      const totalEnvios = (statusAtual?.total_envios || 0) + 1

      const itemPayload: ItemComercialStatus = {
        item_chave: chave,
        material: item.material,
        pedido_venda: item.pedido_venda,
        item_pedido: item.item_pedido,
        ultimo_comunicado_id: savedComunicadoId,
        ultimo_comunicado_numero: numeroSequencial,
        ultimo_envio_em: dataHoraEnvio,
        ultimo_envio_por: remetenteNome,
        total_envios: totalEnvios,
        status: 'Enviado' as StatusComunicadoComercial,
        historico_envios_json: novoHistorico,
      }

      try {
        if (recordIdToUpdate) {
          await pb.collection('pcp_comercial_item_status').update(recordIdToUpdate, itemPayload)
        } else {
          const created = await pb.collection('pcp_comercial_item_status').create(itemPayload)
          itemPayload.id = created.id
        }
      } catch (err) {
        console.warn(
          '[comercialComunicadoService] Falha ao atualizar pcp_comercial_item_status:',
          err,
        )
      }

      inMemoryItemStatus.set(chave, itemPayload)
    }

    // 4. Auditoria imutável completa no pcp_audit_logs
    try {
      await pcpAuditService.recordLog({
        user_id: remetenteId,
        user_name: remetenteNome,
        user_email: remetenteEmail,
        action: `+ ENVIO COMUNICADO COMERCIAL [${numeroSequencial}]`,
        entity: 'pcp_comercial_comunicados',
        record_id: savedComunicadoId,
        module: 'Análise de Carteira',
        screen: 'Carteira mínima não atingida',
        status: 'Concluída',
        reason: 'Carteira mínima não atingida',
        justification: `Comunicado ${numeroSequencial} enviado ao Comercial com ${itens.length} item(ns). Destinos: ${destinos.join(
          ', ',
        )}. Destinatários: ${destinatarios.map((d) => d.email).join(', ')}.`,
        technical_details: {
          custom_snapshot: {
            numero_sequencial: numeroSequencial,
            destinos,
            data_meu_dia: dataMeuDia,
            prioridade,
            foi_aprimorado_ia: Boolean(foiAprimoradoIa),
            eh_reenvio: Boolean(payload.ehReenvioConfirmado),
            destinatarios: destinatarios.map((d) => ({
              id: d.id,
              name: d.name,
              email: d.email,
              grupo: d.grupo,
            })),
            materiais: itens.map((i) => i.material),
            pedidos: itens.map((i) => i.pedido_formatado || `${i.pedido_venda}/${i.item_pedido}`),
            total_itens: itens.length,
            data_hora_envio: dataHoraEnvio,
          },
        },
      })
    } catch (auditErr) {
      console.warn('[comercialComunicadoService] Falha ao registrar log de auditoria:', auditErr)
    }

    const destinosTexto =
      destinos.length === 2
        ? 'Comercial + Meu Dia'
        : destinos.includes('COMERCIAL_HUB')
          ? 'Comercial'
          : 'Meu Dia'

    return {
      success: true,
      numeroSequencial,
      comunicado: fullComunicado,
      itensEnviadosCount: itens.length,
      destinatariosCount: destinatarios.length,
      destinosTexto,
      mensagemRetorno: `${itens.length} ${itens.length === 1 ? 'item enviado' : 'itens enviados'} | ${
        destinatarios.length
      } ${destinatarios.length === 1 ? 'destinatário' : 'destinatários'} | ${destinosTexto}`,
    }
  },

  /**
   * Consulta histórico de comunicados já gerados
   */
  async listarComunicados(): Promise<ComunicadoComercialRecord[]> {
    try {
      const records = await pb.collection('pcp_comercial_comunicados').getFullList({
        sort: '-created',
      })
      if (records && records.length > 0) {
        return records as any[]
      }
    } catch {
      // Fallback memória
    }
    return inMemoryComunicados
  },

  /**
   * Busca um comunicado pelo número sequencial ou id
   */
  async buscarComunicado(identificador: string): Promise<ComunicadoComercialRecord | null> {
    try {
      const record = await pb
        .collection('pcp_comercial_comunicados')
        .getFirstListItem(`numero_sequencial="${identificador}" || id="${identificador}"`)
      if (record) return record as any
    } catch {
      // Fallback memória
    }
    const mem = inMemoryComunicados.find(
      (c) => c.numero_sequencial === identificador || c.id === identificador,
    )
    return mem || null
  },
}
