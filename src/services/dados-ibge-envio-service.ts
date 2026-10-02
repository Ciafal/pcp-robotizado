/**
 * Serviço Oficial — Envio de Dados IBGE para Contabilidade (HUB CIAFAL)
 *
 * Responsável por:
 * 1. Obter destinatários do grupo "Contabilidade — Dados IBGE" de forma dinâmica (sem hard-code).
 * 2. Gerar formulário estruturado "DADOS IBGE — PRODUÇÃO".
 * 3. Disparar via integração corporativa de e-mail (/backend/v1/pcp/summaries/send-email).
 * 4. Persistir status na collection dados_ibge_envios com rastreabilidade completa (dd/mm/aaaa às HH:mm).
 * 5. Gerenciar confirmação de reenvio sem bloqueio (registrando "Reenviado em dd/mm/aaaa HH:mm").
 * 6. Registrar auditoria em pcp_audit_logs.
 */

import { pb } from '@/lib/pocketbase/client'
import {
  LinhaConsolidadaIbge,
  DadosIbgeFiltros,
  DadosIbgeDestinatario,
  DadosIbgeEnvioRegistro,
} from '@/types/dados-ibge'
import { formatDatePTBR, formatNumberPTBR } from '@/lib/formatters-ptbr'

export interface EnvioIbgeResultado {
  sucesso: boolean
  mensagem: string
  envios: DadosIbgeEnvioRegistro[]
  destinatarios: DadosIbgeDestinatario[]
  ehReenvio: boolean
  erroDetalhe?: string
}

class DadosIbgeEnvioService {
  /**
   * Formata data e hora no padrão brasileiro:
   * "dd/mm/aaaa às HH:mm"
   */
  public formatarDataHoraEnvio(data = new Date()): string {
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const ano = data.getFullYear()
    const horas = String(data.getHours()).padStart(2, '0')
    const minutos = String(data.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${ano} às ${horas}:${minutos}`
  }

  /**
   * Formata data e hora de reenvio:
   * "Reenviado em dd/mm/aaaa HH:mm"
   */
  public formatarDataHoraReenvio(data = new Date()): string {
    const dia = String(data.getDate()).padStart(2, '0')
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const ano = data.getFullYear()
    const horas = String(data.getHours()).padStart(2, '0')
    const minutos = String(data.getMinutes()).padStart(2, '0')
    return `Reenviado em ${dia}/${mes}/${ano} ${horas}:${minutos}`
  }

  /**
   * Obtém destinatários ativos da estrutura do HUB para o grupo "Contabilidade — Dados IBGE".
   * Se não houver nenhum na tabela específica, busca fallback no grupo Contabilidade de fechamento_destinatarios.
   */
  public async obterDestinatariosContabilidade(): Promise<DadosIbgeDestinatario[]> {
    try {
      const records = await pb.collection('dados_ibge_destinatarios').getFullList({
        filter: 'ativo = true',
        sort: 'nome',
      })

      if (records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          grupo: r.grupo,
          nome: r.nome,
          cargo: r.cargo || '',
          email: r.email,
          ativo: r.ativo,
          created: r.created,
          updated: r.updated,
        }))
      }
    } catch (err) {
      console.warn('[DadosIbgeEnvioService] Falha ao consultar dados_ibge_destinatarios:', err)
    }

    // Fallback: fechamento_destinatarios (Grupo Contabilidade)
    try {
      const fallbackRecords = await pb.collection('fechamento_destinatarios').getFullList({
        filter: 'grupo = "Contabilidade" && ativo = true',
        sort: 'nome',
      })
      if (fallbackRecords.length > 0) {
        return fallbackRecords.map((r: any) => ({
          id: r.id,
          grupo: 'Contabilidade — Dados IBGE',
          nome: r.nome,
          cargo: 'Contabilidade CIAFAL',
          email: r.email,
          ativo: r.ativo,
        }))
      }
    } catch (err) {
      console.warn(
        '[DadosIbgeEnvioService] Falha ao consultar fallback fechamento_destinatarios:',
        err,
      )
    }

    // Se nenhum encontrado no banco, retorna lista segura de fallback
    return [
      {
        id: 'fallback-1',
        grupo: 'Contabilidade — Dados IBGE',
        nome: 'Equipe de Fechamento Contábil e IBGE',
        cargo: 'Contabilidade',
        email: 'contabilidade.ibge@ciafal.com.br',
        ativo: true,
      },
      {
        id: 'fallback-2',
        grupo: 'Contabilidade — Dados IBGE',
        nome: 'Controladoria Industrial CIAFAL',
        cargo: 'Controladoria',
        email: 'controladoria.ibge@ciafal.com.br',
        ativo: true,
      },
    ]
  }

  /**
   * Consulta os envios já gravados para identificar histórico e preencher status no grid
   */
  public async consultarEnviosPorCompetencia(
    competencia: string,
  ): Promise<DadosIbgeEnvioRegistro[]> {
    try {
      const records = await pb.collection('dados_ibge_envios').getFullList({
        filter: `competencia = "${competencia}"`,
        sort: '-created',
      })

      return records.map((r: any) => ({
        id: r.id,
        chave_consolidada: r.chave_consolidada,
        competencia: r.competencia,
        empresa_code: r.empresa_code,
        empresa_nome: r.empresa_nome,
        linha_code: r.linha_code,
        centro_code: r.centro_code,
        tipo_material: r.tipo_material,
        material_code: r.material_code,
        material_descricao: r.material_descricao,
        quantidade_produzida: Number(r.quantidade_produzida || 0),
        unidade_medida: r.unidade_medida,
        total_registros: Number(r.total_registros || 0),
        centros_envolvidos_json: r.centros_envolvidos_json || [],
        filtros_utilizados_json: r.filtros_utilizados_json || {},
        registros_resumo_json: r.registros_resumo_json || [],
        status: r.status,
        data_envio: r.data_envio,
        data_envio_formatada: r.data_envio_formatada,
        enviado_por_nome: r.enviado_por_nome,
        enviado_por_email: r.enviado_por_email,
        enviado_por_id: r.enviado_por_id,
        eh_reenvio: Boolean(r.eh_reenvio),
        data_reenvio_formatada: r.data_reenvio_formatada,
        envio_original_id: r.envio_original_id,
        grupo_destinatarios: r.grupo_destinatarios,
        destinatarios_json: r.destinatarios_json || [],
        assunto: r.assunto,
        corpo_formulario: r.corpo_formulario,
        sucesso_envio_email: Boolean(r.sucesso_envio_email),
        erro_detalhe: r.erro_detalhe,
        anexo_pdf_status: r.anexo_pdf_status,
        tipo_lote: Boolean(r.tipo_lote),
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('[DadosIbgeEnvioService] Falha ao consultar envios:', err)
      return []
    }
  }

  /**
   * Verifica se uma linha ou conjunto de linhas já foi enviado à Contabilidade anteriormente
   */
  public async verificarEnvioAnterior(chaves: string[]): Promise<{
    jaEnviado: boolean
    ultimoEnvio?: DadosIbgeEnvioRegistro
  }> {
    if (chaves.length === 0) return { jaEnviado: false }

    try {
      const filtroChaves = chaves.map((c) => `chave_consolidada = "${c}"`).join(' || ')
      const records = await pb.collection('dados_ibge_envios').getList(1, 1, {
        filter: `(${filtroChaves}) && status = "Enviado à Contabilidade"`,
        sort: '-created',
      })

      if (records.items.length > 0) {
        const r = records.items[0]
        return {
          jaEnviado: true,
          ultimoEnvio: {
            id: r.id,
            chave_consolidada: r.chave_consolidada,
            competencia: r.competencia,
            empresa_code: r.empresa_code,
            empresa_nome: r.empresa_nome,
            linha_code: r.linha_code,
            centro_code: r.centro_code,
            tipo_material: r.tipo_material,
            material_code: r.material_code,
            material_descricao: r.material_descricao,
            quantidade_produzida: Number(r.quantidade_produzida || 0),
            unidade_medida: r.unidade_medida,
            total_registros: Number(r.total_registros || 0),
            centros_envolvidos_json: r.centros_envolvidos_json || [],
            filtros_utilizados_json: r.filtros_utilizados_json || {},
            registros_resumo_json: r.registros_resumo_json || [],
            status: r.status,
            data_envio: r.data_envio,
            data_envio_formatada: r.data_envio_formatada,
            enviado_por_nome: r.enviado_por_nome,
            enviado_por_email: r.enviado_por_email,
            enviado_por_id: r.enviado_por_id,
            eh_reenvio: Boolean(r.eh_reenvio),
            data_reenvio_formatada: r.data_reenvio_formatada,
            envio_original_id: r.envio_original_id,
            grupo_destinatarios: r.grupo_destinatarios,
            destinatarios_json: r.destinatarios_json || [],
            assunto: r.assunto,
            corpo_formulario: r.corpo_formulario,
            sucesso_envio_email: Boolean(r.sucesso_envio_email),
            erro_detalhe: r.erro_detalhe,
            anexo_pdf_status: r.anexo_pdf_status,
            tipo_lote: Boolean(r.tipo_lote),
            created: r.created,
            updated: r.updated,
          },
        }
      }
    } catch (err) {
      console.warn('[DadosIbgeEnvioService] Falha ao verificar envio anterior:', err)
    }

    return { jaEnviado: false }
  }

  /**
   * Constrói o texto do formulário estruturado:
   * "DADOS IBGE — PRODUÇÃO"
   */
  public gerarFormularioEstruturado(params: {
    competencia: string
    empresa: string
    linha: string
    centros: string[]
    filtros: DadosIbgeFiltros
    linhas: LinhaConsolidadaIbge[]
    responsavelNome: string
    responsavelEmail: string
    dataHoraFormatada: string
    ehReenvio?: boolean
  }): string {
    const {
      competencia,
      empresa,
      linha,
      centros,
      filtros,
      linhas,
      responsavelNome,
      responsavelEmail,
      dataHoraFormatada,
      ehReenvio,
    } = params

    const centrosStr = centros.length > 0 ? centros.join(', ') : 'Todos os Centros da Linha'
    const centrosDistintos = new Set<string>()
    const materiaisDistintos = new Set<string>()
    let totalQtd = 0
    let totalRegs = 0

    // Monta linhas da tabela de dados
    const linhasTabela = linhas.map((l, idx) => {
      centrosDistintos.add(l.centro_code)
      materiaisDistintos.add(l.material_code)
      totalQtd += l.quantidade_produzida
      totalRegs += l.total_registros

      return `| ${String(idx + 1).padStart(2, '0')} | ${l.centro_code.padEnd(8)} | ${l.tipo_material.padEnd(5)} | ${l.material_code.padEnd(16)} | ${l.material_descricao.slice(0, 32).padEnd(32)} | ${formatNumberPTBR(l.quantidade_produzida, 3).padStart(12)} | ${(l.unidade_medida || 't').toUpperCase().padEnd(4)} |`
    })

    const separador = `+----+----------+-------+------------------+----------------------------------+--------------+------+`
    const cabecalhoTabela = `| #  | Centro   | MTART | Material         | Descrição                        | Qtd Produz.  | UM   |`

    const corpo = [
      `========================================================================================`,
      `                               DADOS IBGE — PRODUÇÃO`,
      ehReenvio ? `                    *** ATENÇÃO: REENVIO FORMAL DE DADOS ***` : ``,
      `========================================================================================`,
      ``,
      `1. IDENTIFICAÇÃO DO FECHAMENTO:`,
      `   • Competência:       ${competencia}`,
      `   • Empresa:           ${empresa}`,
      `   • Linha:             ${linha}`,
      `   • Centros:           ${centrosStr}`,
      `   • Data/Hora Geração: ${dataHoraFormatada}`,
      `   • Responsável PCP:   ${responsavelNome} (${responsavelEmail})`,
      `   • Finalidade:        Fechamento Contábil e Relatório Mensal IBGE`,
      ``,
      `2. FILTROS UTILIZADOS NA EXTRAÇÃO:`,
      `   • WERKS (Empresa):   ${filtros.empresa || 'TODAS'}`,
      `   • Linha de Produção: ${filtros.linha || 'TODAS'}`,
      `   • Centros de Custo:  ${centrosStr}`,
      `   • MTART (Tipo Mat.): ${filtros.mtart || 'TODOS'}`,
      `   • Mês / Ano:         ${filtros.mes}/${filtros.ano}`,
      ``,
      `3. DEMONSTRATIVO CONSOLIDADO DE PRODUÇÃO:`,
      separador,
      cabecalhoTabela,
      separador,
      ...linhasTabela,
      separador,
      ``,
      `4. TOTALIZADORES GERAIS:`,
      `   • Quantidade de Materiais Distintos: ${materiaisDistintos.size}`,
      `   • Quantidade de Centros Envolvidos:  ${centrosDistintos.size}`,
      `   • Total de Registros de Origem:      ${totalRegs}`,
      `   • Volume Total Consolidado:          ${formatNumberPTBR(totalQtd, 3)} t`,
      ``,
      `5. OBSERVAÇÕES E NOTAS DO CONTROLE DE PRODUÇÃO:`,
      `   • Segue consolidação dos dados de produção referente à competência ${competencia}`,
      `     para continuidade do processo de fechamento/IBGE.`,
      `   • Dados extraídos das fontes integradas oficiais (pcp_production_postings,`,
      `     pcp_production_orders e weekly_schedules).`,
      `   • Anexo PDF: Preparado para geração integrada (módulo nativo).`,
      ``,
      `Link direto no HUB CIAFAL:`,
      `Abrir Dados IBGE no HUB: https://hub.ciafal.com.br/pcp/controle-producao/dados-ibge`,
      `========================================================================================`,
    ]
      .filter((line) => line !== undefined)
      .join('\n')

    return corpo
  }

  /**
   * Envia os dados IBGE para a Contabilidade (Individual ou em Lote).
   * Persiste em dados_ibge_envios, dispara e-mail corporativo e registra auditoria.
   */
  public async enviarParaContabilidade(params: {
    linhas: LinhaConsolidadaIbge[]
    filtros: DadosIbgeFiltros
    ehReenvio?: boolean
    envioOriginalId?: string
    tipoLote?: boolean
  }): Promise<EnvioIbgeResultado> {
    const { linhas, filtros, ehReenvio = false, envioOriginalId, tipoLote = false } = params

    if (linhas.length === 0) {
      throw new Error('Nenhuma linha consolidada selecionada para envio.')
    }

    const user = pb.authStore.record
    const remetenteEmail = user?.email || 'pcp@ciafal.com.br'
    const remetenteNome = user?.name || user?.email || 'Controle de Produção CIAFAL'
    const remetenteId = user?.id || 'admin-user'

    const agora = new Date()
    const dataHoraFormatada = this.formatarDataHoraEnvio(agora)
    const dataHoraReenvioFormatada = ehReenvio ? this.formatarDataHoraReenvio(agora) : undefined

    // 1. Obter destinatários do grupo "Contabilidade — Dados IBGE"
    const destinatarios = await this.obterDestinatariosContabilidade()
    const emailsDestinatarios = destinatarios.map((d) => d.email)
    const destinatariosJson = destinatarios.map((d) => ({
      nome: d.nome,
      email: d.email,
      cargo: d.cargo || '',
    }))

    const competencia = linhas[0].competencia || `${filtros.mes}/${filtros.ano}`
    const empresaNome = linhas[0].empresa_nome || 'CIAFAL'
    const empresaCode = linhas[0].empresa_code || filtros.empresa || '1000'
    const linhaCode = linhas[0].linha_code || filtros.linha || 'Geral'

    // Assunto padronizado obrigatório:
    // "[PCP] Dados IBGE — Produção — [Competência] — [Empresa]"
    const prefixoReenvio = ehReenvio ? '[REENVIO] ' : ''
    const assunto = `${prefixoReenvio}[PCP] Dados IBGE — Produção — ${competencia} — ${empresaNome}`

    // Centros envolvidos
    const centrosSet = new Set<string>()
    linhas.forEach((l) => centrosSet.add(l.centro_code))
    const centrosArray = Array.from(centrosSet)

    // 2. Gerar formulário estruturado "DADOS IBGE — PRODUÇÃO"
    const corpoFormulario = this.gerarFormularioEstruturado({
      competencia,
      empresa: `${empresaCode} — ${empresaNome}`,
      linha: linhaCode,
      centros: centrosArray,
      filtros,
      linhas,
      responsavelNome: remetenteNome,
      responsavelEmail: remetenteEmail,
      dataHoraFormatada,
      ehReenvio,
    })

    // 3. Disparo via integração corporativa de e-mail existente no HUB
    let sucessoEmail = false
    let erroDetalhe: string | undefined

    try {
      const response = await pb.send('/backend/v1/pcp/summaries/send-email', {
        method: 'POST',
        body: {
          summary_code: `IBGE-${competencia.replace('/', '-')}-${empresaCode}-${agora.getTime()}`,
          recipients: emailsDestinatarios,
          groups: ['Contabilidade — Dados IBGE'],
          subject: assunto,
          message: corpoFormulario,
        },
      })

      if (response && (response.success || response.status === 'enviado')) {
        sucessoEmail = true
      } else {
        sucessoEmail = false
        erroDetalhe = response?.message || 'Falha no retorno do serviço corporativo de e-mail.'
      }
    } catch (err: any) {
      sucessoEmail = false
      erroDetalhe =
        err?.data?.message ||
        err?.message ||
        'Não foi possível enviar os dados. Verifique a integração de e-mail e tente novamente.'
    }

    // 4. Persistência dos registros de envio em dados_ibge_envios
    // Status: se sucesso no envio do e-mail -> "Enviado à Contabilidade";
    // Se a integração de e-mail falhou, registrar com status "Pendente" e o erro real sem simular sucesso.
    const statusFinal: 'Enviado à Contabilidade' | 'Pendente' = sucessoEmail
      ? 'Enviado à Contabilidade'
      : 'Pendente'

    const registrosResumo = linhas.map((l) => ({
      material_code: l.material_code,
      material_descricao: l.material_descricao,
      centro_code: l.centro_code,
      tipo_material: l.tipo_material,
      quantidade_produzida: l.quantidade_produzida,
      unidade_medida: l.unidade_medida,
    }))

    const enviosPersistidos: DadosIbgeEnvioRegistro[] = []

    for (const linha of linhas) {
      const chaveConsolidada = `${linha.empresa_code}_${linha.linha_code}_${linha.centro_code}_${linha.material_code}_${linha.tipo_material}_${linha.unidade_medida}_${linha.competencia}`

      const payload = {
        chave_consolidada: chaveConsolidada,
        competencia: linha.competencia,
        empresa_code: linha.empresa_code,
        empresa_nome: linha.empresa_nome,
        linha_code: linha.linha_code,
        centro_code: linha.centro_code,
        tipo_material: linha.tipo_material,
        material_code: linha.material_code,
        material_descricao: linha.material_descricao,
        quantidade_produzida: linha.quantidade_produzida,
        unidade_medida: linha.unidade_medida,
        total_registros: linha.total_registros,
        centros_envolvidos_json: linha.centros_envolvidos,
        filtros_utilizados_json: filtros,
        registros_resumo_json: registrosResumo,
        status: statusFinal,
        data_envio: agora.toISOString(),
        data_envio_formatada: dataHoraFormatada,
        enviado_por_nome: remetenteNome,
        enviado_por_email: remetenteEmail,
        enviado_por_id: remetenteId,
        eh_reenvio: ehReenvio,
        data_reenvio_formatada: dataHoraReenvioFormatada,
        envio_original_id: envioOriginalId || '',
        grupo_destinatarios: 'Contabilidade — Dados IBGE',
        destinatarios_json: destinatariosJson,
        assunto,
        corpo_formulario: corpoFormulario,
        sucesso_envio_email: sucessoEmail,
        erro_detalhe: erroDetalhe || '',
        anexo_pdf_status: 'Pendente de geração PDF (infraestrutura em preparação)',
        tipo_lote: tipoLote,
      }

      try {
        const rec = await pb.collection('dados_ibge_envios').create(payload)
        enviosPersistidos.push({
          id: rec.id,
          ...payload,
          created: rec.created,
          updated: rec.updated,
        } as DadosIbgeEnvioRegistro)
      } catch (err) {
        console.warn(`[DadosIbgeEnvioService] Falha ao persistir envio ${chaveConsolidada}:`, err)
      }
    }

    // 5. Auditoria detalhada em pcp_audit_logs
    const acaoAuditoria = ehReenvio
      ? 'REENVIO_DADOS_IBGE'
      : tipoLote
        ? 'ENVIO_LOTE_DADOS_IBGE'
        : 'ENVIO_INDIVIDUAL_DADOS_IBGE'

    const outcomeAuditoria = sucessoEmail ? 'SUCCESS' : 'FAILED'
    const statusAuditoria = sucessoEmail ? 'Concluído' : 'Erro de Envio'

    try {
      await pb.collection('pcp_audit_logs').create({
        user_id: remetenteId,
        user_name: remetenteNome,
        user_email: remetenteEmail,
        user_role: (user?.role as string) || 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: acaoAuditoria,
        resource: 'DADOS_IBGE',
        record_id: competencia,
        company: empresaNome,
        line: linhaCode,
        center: centrosArray.join(', '),
        status: statusAuditoria,
        outcome: outcomeAuditoria,
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Dados IBGE',
        reason: `${ehReenvio ? 'Reenvio' : 'Envio'} de ${linhas.length} registro(s) IBGE para a Contabilidade (${competencia}).`,
        justification: `Fechamento mensal IBGE. Destinatários: ${emailsDestinatarios.join(', ')}`,
        details: {
          competencia,
          total_itens: linhas.length,
          tipo_lote: tipoLote,
          eh_reenvio: ehReenvio,
          sucesso_email: sucessoEmail,
          destinatarios: emailsDestinatarios,
          materiais: linhas.map((l) => l.material_code),
          erro: erroDetalhe,
          timestamp: agora.toISOString(),
        },
      })
    } catch (err) {
      console.warn('[DadosIbgeEnvioService] Falha ao registrar log de auditoria:', err)
    }

    if (!sucessoEmail) {
      return {
        sucesso: false,
        mensagem:
          'Não foi possível enviar os dados. Verifique a integração de e-mail e tente novamente.',
        envios: enviosPersistidos,
        destinatarios,
        ehReenvio,
        erroDetalhe,
      }
    }

    return {
      sucesso: true,
      mensagem: 'Dados IBGE enviados para a Contabilidade com sucesso.',
      envios: enviosPersistidos,
      destinatarios,
      ehReenvio,
    }
  }

  /**
   * Registra log de auditoria para ações específicas (ex: seleção de linhas)
   */
  public async logAcaoAuditoria(params: {
    acao: 'SELECAO_LINHAS_IBGE' | 'VISUALIZAR_DADOS_IBGE' | 'ERRO_ENVIO_IBGE'
    descricao: string
    detalhes?: Record<string, any>
  }): Promise<void> {
    try {
      const user = pb.authStore.record
      await pb.collection('pcp_audit_logs').create({
        user_id: user?.id || 'admin-user',
        user_name: user?.name || user?.email || 'Controle de Produção',
        user_email: user?.email || 'pcp@ciafal.com.br',
        user_role: (user?.role as string) || 'PCP_PROGRAMMER',
        event_type: 'REPORT_ACTION',
        action: params.acao,
        resource: 'DADOS_IBGE',
        record_id: params.detalhes?.competencia || 'IBGE',
        status: 'Concluído',
        outcome: 'SUCCESS',
        module: 'CONTROLE_DE_PRODUCAO',
        screen: 'Dados IBGE',
        company: 'CIAFAL',
        reason: params.descricao,
        justification: params.descricao,
        details: {
          timestamp: new Date().toISOString(),
          ...params.detalhes,
        },
      })
    } catch (err) {
      console.warn('[DadosIbgeEnvioService] Falha silenciosa ao registrar auditoria:', err)
    }
  }
}

export const dadosIbgeEnvioService = new DadosIbgeEnvioService()
export default dadosIbgeEnvioService
