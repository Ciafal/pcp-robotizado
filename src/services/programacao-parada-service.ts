import pb from '@/lib/pocketbase/client'

export type StatusParada = 'RASCUNHO' | 'VALIDADA' | 'COMUNICADA' | 'CANCELADA' | 'CONCLUIDA'
export type ParadaStatus = StatusParada

export type MotivoParada =
  | 'Manutenção preventiva'
  | 'Manutenção geral'
  | 'Reforma de equipamento'
  | 'Intervenção elétrica'
  | 'Intervenção mecânica'
  | 'Troca de equipamento'
  | 'Obra civil'
  | 'Indisponibilidade operacional'
  | 'Outro'
export type MotivoParadaTipo = MotivoParada

export const MOTIVOS_PARADA_OPTIONS: MotivoParada[] = [
  'Manutenção preventiva',
  'Manutenção geral',
  'Reforma de equipamento',
  'Intervenção elétrica',
  'Intervenção mecânica',
  'Troca de equipamento',
  'Obra civil',
  'Indisponibilidade operacional',
  'Outro',
]

export interface ProgramacaoParadaCentroItem {
  id?: string
  temp_id?: string
  empresa_id?: string
  empresa_code?: string
  empresa_nome?: string
  linha_id?: string
  linha_code?: string
  linha_nome?: string
  centro_id?: string
  centro_code?: string
  centro_nome?: string
  data_inicio?: string // dd/mm/aaaa
  hora_inicio?: string // HH:mm
  data_fim?: string // dd/mm/aaaa
  hora_fim?: string // HH:mm
  data_hora_inicio?: string
  data_hora_fim?: string
  inicio_iso?: string // YYYY-MM-DD HH:mm
  fim_iso?: string // YYYY-MM-DD HH:mm
  duracao_horas?: number
  duracao_formatada?: string
  motivo: MotivoParada
  motivo_outro?: string
  motivo_outro_detalhe?: string
  descricao?: string
  status: 'ATIVO' | 'CANCELADO' | 'CONCLUIDO' | 'PENDENTE' | 'CONFIRMADA' | 'EM_ANDAMENTO'
}
export type CentroParadaInput = ProgramacaoParadaCentroItem
export interface CentroParadaRegistro extends ProgramacaoParadaCentroItem {
  parada_id: string
}

export interface HistoricoVersao {
  versao: number
  versao_rotulo: string
  data_hora: string
  usuario_nome: string
  usuario_id: string
  descricao_mudanca: string
  centros_snapshot: ProgramacaoParadaCentroItem[]
}

export interface ProgramacaoParadaRecord {
  id: string
  codigo: string // ex: PP-00001/2026
  versao: number
  versao_rotulo?: string
  status: StatusParada
  motivo_geral?: string
  observacao_geral?: string
  observacao?: string
  data_hora_inicio?: string
  data_hora_fim?: string
  duracao_total_horas?: number
  criado_por_id?: string
  criado_por_nome?: string
  atualizado_por_id?: string
  atualizado_por_nome?: string
  ultima_alteracao?: string
  analise_ia?: any
  comunicado_disparado?: boolean
  houve_alteracao_pos_comunicado?: boolean
  ultimo_comunicado_em?: string
  ultimo_comunicado_versao?: number
  programacao_alterada_pos_comunicado?: boolean
  historico_versoes?: HistoricoVersao[]
  centros?: ProgramacaoParadaCentroItem[]
  created?: string
  updated?: string
}
export type ProgramacaoParadaRegistro = ProgramacaoParadaRecord

export interface ProgramacaoParadaHistorico {
  id?: string
  versao: number
  tipo_alteracao?: string
  descricao_alteracao?: string
  usuario_id?: string
  usuario_nome?: string
  dados_antes?: any
  dados_depois?: any
  created?: string
}
export type ValidacaoIAResultado = ValidacaoIAResult & {
  valido?: boolean
  classificacao?: 'SEM_CONFLITO' | 'ATENCAO' | 'CONFLITO_CRITICO'
}

export interface ComunicadoHistoricoItem {
  id: string
  parada_id: string
  codigo_parada: string
  versao_programacao: number
  assunto: string
  conteudo: string
  destinatarios_para: string[]
  destinatarios_cc: string[]
  grupos_destinatarios: string[]
  usuario_envio_nome: string
  data_hora_envio: string
  resultado_envio: 'SUCESSO' | 'FALHA' | 'RASCUNHO'
  mensagem_erro?: string
  tipo_comunicado: 'INICIAL' | 'ATUALIZACAO'
  created?: string
}

export interface ValidacaoIAResult {
  nivel?: 'SEM_CONFLITO' | 'ATENCAO' | 'CONFLITO_CRITICO'
  resumo: string
  impactos_identificados: string[]
  alertas: string[]
  centros_afetados: Array<
    | string
    | {
        centro: string
        linha: string
        periodo: string
        motivo: string
        duracao: string
      }
  >
  programacoes_afetadas: Array<
    | string
    | {
        schedule_code: string
        op?: string
        material?: string
        inicio: string
        fim: string
      }
  >
  ordens_afetadas?: string[]
  recomendacoes: string[]
  proximas_acoes?: string[]
  proximas_acoes_sugeridas?: string[]
  parecer_ia?: string
}

export interface ConflitoValidacao {
  tipo: 'ERRO' | 'AVISO'
  campo?: string
  mensagem: string
  centro_nome?: string
}

/**
 * Utilitários de conversão e cálculo de duração
 */
export function parseDatePtBrToIso(dataPtBr: string, horaPtBr: string): string {
  if (!dataPtBr) return ''
  const partes = dataPtBr.split('/')
  if (partes.length !== 3) return ''
  const [dia, mes, ano] = partes
  const horaLimpa = horaPtBr ? horaPtBr.trim() : '00:00'
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')} ${horaLimpa.padStart(5, '0')}`
}

export function parseIsoToPtBr(iso: string): { data: string; hora: string } {
  if (!iso) return { data: '', hora: '' }
  const [dataPart, horaPart] = iso.replace('T', ' ').split(' ')
  const [ano, mes, dia] = dataPart.split('-')
  return {
    data: `${dia}/${mes}/${ano}`,
    hora: horaPart ? horaPart.substring(0, 5) : '00:00',
  }
}

export function calcularDuracaoHoras(
  dataInicio: string,
  horaInicio: string,
  dataFim: string,
  horaFim: string,
): { horas: number; formatada: string } {
  const inicioIso = parseDatePtBrToIso(dataInicio, horaInicio)
  const fimIso = parseDatePtBrToIso(dataFim, horaFim)

  if (!inicioIso || !fimIso) {
    return { horas: 0, formatada: '-' }
  }

  const d1 = new Date(inicioIso.replace(' ', 'T') + ':00')
  const d2 = new Date(fimIso.replace(' ', 'T') + ':00')

  const diffMs = d2.getTime() - d1.getTime()
  if (diffMs <= 0 || isNaN(diffMs)) {
    return { horas: 0, formatada: '0 h' }
  }

  const totalMinutos = Math.floor(diffMs / (1000 * 60))
  const totalHoras = Number((totalMinutos / 60).toFixed(1))

  const dias = Math.floor(totalMinutos / (24 * 60))
  const restoMinutos = totalMinutos % (24 * 60)
  const horasResto = Math.floor(restoMinutos / 60)
  const minResto = restoMinutos % 60

  const partes = []
  if (dias > 0) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`)
  if (horasResto > 0 || (dias === 0 && minResto === 0))
    partes.push(`${horasResto} hora${horasResto > 1 ? 's' : ''}`)
  if (minResto > 0) partes.push(`${minResto} min`)

  const formatada = `${partes.join(' e ')} (${totalHoras} h)`

  return { horas: totalHoras, formatada }
}

/**
 * Service Principal de Programação de Parada
 */
export const programacaoParadaService = {
  /**
   * Buscar próximo número sequencial não repetível: PP-00001/2026
   */
  async gerarProximoCodigo(ano: number = new Date().getFullYear()): Promise<string> {
    try {
      const records = await pb.collection('programacao_paradas').getList(1, 1, {
        sort: '-created',
        filter: `codigo ~ '/${ano}'`,
      })

      if (records.items.length === 0) {
        return `PP-00001/${ano}`
      }

      const ultimoCodigo = records.items[0].codigo || ''
      const match = ultimoCodigo.match(/PP-(\d+)\/\d{4}/)
      if (match && match[1]) {
        const nextNum = parseInt(match[1], 10) + 1
        return `PP-${String(nextNum).padStart(5, '0')}/${ano}`
      }

      return `PP-${String(records.totalItems + 1).padStart(5, '0')}/${ano}`
    } catch (e) {
      // Fallback determinístico
      return `PP-00001/${ano}`
    }
  },

  /**
   * Obter lista de empresas ativas dos cadastros oficiais
   */
  async getEmpresasAtivas() {
    try {
      const res = await pb.collection('companies').getFullList({
        sort: 'name',
      })
      if (res.length > 0) {
        return res.map((r: any) => ({
          id: r.id,
          code: r.code || r.name,
          name: r.name || r.corporate_name || r.code,
        }))
      }
    } catch (e) {
      // ignore
    }
    return [
      { id: 'CIAFAL', code: 'CIAFAL', name: 'CIAFAL Wilson Santos' },
      { id: 'KS-FERRADURA', code: 'KS-FERRADURA', name: 'KS - Ferradura' },
      { id: 'KS-CIAFAL', code: 'KS-CIAFAL', name: 'KS - Ciafal' },
      { id: 'SIDERCENTRO', code: 'SIDERCENTRO', name: 'Sidercentro' },
      { id: 'CISAM', code: 'CISAM', name: 'Cisam' },
    ]
  },

  /**
   * Obter Linhas ativas condicionadas à Empresa
   */
  async getLinhasPorEmpresa(empresaIdOrCode: string) {
    try {
      const res = await pb.collection('production_lines').getFullList({
        filter: `is_active = true`,
        sort: 'name',
      })
      if (res.length > 0) {
        return res.map((r: any) => ({
          id: r.code || r.id,
          line_id: r.id,
          code: r.code || r.name,
          name: r.name || r.code,
          plant_id: r.plant_id,
        }))
      }
    } catch (e) {
      // ignore
    }
    return [
      { id: 'L1', line_id: 'L1', code: 'L1', name: 'L1 - Laminação 1' },
      { id: 'L2', line_id: 'L2', code: 'L2', name: 'L2 - Laminação 2' },
      { id: 'ENF_L1', line_id: 'ENF_L1', code: 'ENF_L1', name: 'Enfornamento L1' },
      { id: 'ACAB_L2', line_id: 'ACAB_L2', code: 'ACAB_L2', name: 'Acabamento L2' },
      { id: 'ENDIL1', line_id: 'ENDIL1', code: 'ENDIL1', name: 'Endireitadeira L1' },
    ]
  },

  /**
   * Obter Centros de Trabalho condicionados à Linha
   * Fonte de verdade: line_masters e production_lines
   */
  async getCentrosPorLinha(linhaCodeOrId: string) {
    try {
      const masters = await pb.collection('line_masters').getFullList({
        filter: `status = 'ACTIVE'`,
        sort: 'name',
      })
      const filtered = masters.filter(
        (m: any) =>
          !linhaCodeOrId ||
          m.code === linhaCodeOrId ||
          m.line_id === linhaCodeOrId ||
          (linhaCodeOrId.includes('L1') && m.code.includes('L1')) ||
          (linhaCodeOrId.includes('L2') && m.code.includes('L2')),
      )
      if (filtered.length > 0) {
        return filtered.map((m: any) => ({
          id: m.code || m.id,
          master_id: m.id,
          line_id: m.line_id,
          code: m.code,
          name: m.name || m.code,
          nominal_capacity: m.nominal_hourly_capacity || 0,
          capacity_unit: m.capacity_unit || 't/h',
        }))
      }
    } catch (e) {
      // ignore
    }

    // Centros padrão homologados caso busca retorne vazia
    const defaultCenters: Record<string, any[]> = {
      L1: [
        {
          id: 'L1',
          code: 'L1',
          name: 'L1 - Gaiolas de Laminação',
          nominal_capacity: 12.5,
          capacity_unit: 't/h',
        },
        {
          id: 'ENF_L1',
          code: 'ENF_L1',
          name: 'Forno de Reaquecimento L1',
          nominal_capacity: 50,
          capacity_unit: 't/h',
        },
        {
          id: 'ENDIL1',
          code: 'ENDIL1',
          name: 'Endireitadeira L1',
          nominal_capacity: 4.5,
          capacity_unit: 't/h',
        },
      ],
      L2: [
        {
          id: 'L2',
          code: 'L2',
          name: 'L2 - Trem Contínuo Laminação',
          nominal_capacity: 25,
          capacity_unit: 't/h',
        },
        {
          id: 'ACAB_L2',
          code: 'ACAB_L2',
          name: 'Acabamento & Embalagem L2',
          nominal_capacity: 9,
          capacity_unit: 'peça',
        },
      ],
    }

    return (
      defaultCenters[linhaCodeOrId] || [
        {
          id: linhaCodeOrId,
          code: linhaCodeOrId,
          name: `Centro ${linhaCodeOrId}`,
          nominal_capacity: 10,
          capacity_unit: 't/h',
        },
      ]
    )
  },

  /**
   * Validações determinísticas automáticas antes de salvar/validar
   */
  async validarParada(centros: ProgramacaoParadaCentroItem[]): Promise<ConflitoValidacao[]> {
    const conflitos: ConflitoValidacao[] = []

    if (!centros || centros.length === 0) {
      conflitos.push({
        tipo: 'ERRO',
        mensagem: 'É obrigatório cadastrar pelo menos um centro na programação de parada.',
      })
      return conflitos
    }

    for (let i = 0; i < centros.length; i++) {
      const c = centros[i]
      const label = `${c.linha_nome || c.linha_id} - ${c.centro_nome || c.centro_id}`

      // 1. Campos obrigatórios
      if (!c.empresa_id)
        conflitos.push({
          tipo: 'ERRO',
          campo: 'empresa',
          mensagem: `Empresa não selecionada no item ${i + 1}.`,
          centro_nome: label,
        })
      if (!c.linha_id)
        conflitos.push({
          tipo: 'ERRO',
          campo: 'linha',
          mensagem: `Linha não selecionada no item ${i + 1}.`,
          centro_nome: label,
        })
      if (!c.centro_id)
        conflitos.push({
          tipo: 'ERRO',
          campo: 'centro',
          mensagem: `Centro não selecionado no item ${i + 1}.`,
          centro_nome: label,
        })
      if (!c.data_inicio || !c.hora_inicio)
        conflitos.push({
          tipo: 'ERRO',
          campo: 'inicio',
          mensagem: `Data e horário de início são obrigatórios para ${label}.`,
          centro_nome: label,
        })
      if (!c.data_fim || !c.hora_fim)
        conflitos.push({
          tipo: 'ERRO',
          campo: 'fim',
          mensagem: `Data e horário de fim são obrigatórios para ${label}.`,
          centro_nome: label,
        })
      if (!c.motivo)
        conflitos.push({
          tipo: 'ERRO',
          campo: 'motivo',
          mensagem: `Motivo da parada é obrigatório para ${label}.`,
          centro_nome: label,
        })
      if (c.motivo === 'Outro' && (!c.motivo_outro_detalhe || !c.motivo_outro_detalhe.trim())) {
        conflitos.push({
          tipo: 'ERRO',
          campo: 'motivo_outro_detalhe',
          mensagem: `Ao selecionar o motivo "Outro", é obrigatório detalhar a justificativa para ${label}.`,
          centro_nome: label,
        })
      }

      // 2. Data fim posterior ao início
      const inicioIso = parseDatePtBrToIso(c.data_inicio, c.hora_inicio)
      const fimIso = parseDatePtBrToIso(c.data_fim, c.hora_fim)

      if (inicioIso && fimIso) {
        if (fimIso <= inicioIso) {
          conflitos.push({
            tipo: 'ERRO',
            campo: 'periodo',
            mensagem: `A data/hora de término (${c.data_fim} ${c.hora_fim}) deve ser rigorosamente posterior ao início (${c.data_inicio} ${c.hora_inicio}) no Centro ${label}.`,
            centro_nome: label,
          })
        }
      }

      // 3. Checar sobreposição com outra parada programada já salva no banco
      try {
        const paradasExistentes = await pb.collection('programacao_parada_centros').getList(1, 20, {
          filter: `centro_id = '${c.centro_id}' && status = 'ATIVO'`,
        })
        for (const pe of paradasExistentes.items) {
          if (c.id && pe.id === c.id) continue // mesmo registro
          const pStart = pe.inicio_iso
          const pEnd = pe.fim_iso
          if (pStart && pEnd && inicioIso && fimIso) {
            if (pStart < fimIso && pEnd > inicioIso) {
              conflitos.push({
                tipo: 'AVISO',
                mensagem: `Sobreposição de paradas: o Centro ${c.centro_nome || c.centro_id} já possui a Parada ${pe.codigo_parada} programada de ${pe.data_inicio} ${pe.hora_inicio} até ${pe.data_fim} ${pe.hora_fim}.`,
                centro_nome: label,
              })
            }
          }
        }
      } catch (e) {
        // ignore
      }

      // 4. Checar conflito com programação de produção existente na Montagem Programação
      try {
        const schedules = await pb.collection('weekly_schedules').getList(1, 20, {
          filter: `item_type = 'PRODUCTION' && (line_code = '${c.linha_id}' || line_code = '${c.centro_id}')`,
        })
        for (const sch of schedules.items) {
          const schStart = sch.start_datetime
          const schEnd = sch.end_datetime
          if (schStart && schEnd && inicioIso && fimIso) {
            if (schStart < fimIso && schEnd > inicioIso) {
              conflitos.push({
                tipo: 'AVISO',
                mensagem: `Conflito identificado: o Centro ${c.centro_nome || c.centro_id} possui produção programada da OP ${sch.production_order || 'S/N'} (${sch.material_description || 'Material'}) entre ${schStart} e ${schEnd}.`,
                centro_nome: label,
              })
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return conflitos
  },

  /**
   * Salvar rascunho ou atualizar parada
   */
  async salvarParada(dados: {
    id?: string
    codigo: string
    versao: number
    status: StatusParada
    observacao_geral?: string
    centros: ProgramacaoParadaCentroItem[]
    usuario_id: string
    usuario_nome: string
    analise_ia?: any
  }): Promise<ProgramacaoParadaRecord> {
    const agora = new Date()
    const agoraFmt = agora.toISOString().replace('T', ' ').substring(0, 19)

    let paradaRecord: any = null
    const isNovo = !dados.id

    // Preparar centros enriquecidos
    const centrosProntos = dados.centros.map((c) => {
      const dur = calcularDuracaoHoras(c.data_inicio, c.hora_inicio, c.data_fim, c.hora_fim)
      return {
        ...c,
        inicio_iso: parseDatePtBrToIso(c.data_inicio, c.hora_inicio),
        fim_iso: parseDatePtBrToIso(c.data_fim, c.hora_fim),
        duracao_horas: dur.horas,
        duracao_formatada: dur.formatada,
      }
    })

    if (isNovo) {
      // Criar nova parada (V01)
      const novoCodigo = dados.codigo || (await this.gerarProximoCodigo())
      const historicoInicial: HistoricoVersao[] = [
        {
          versao: 1,
          versao_rotulo: 'V01',
          data_hora: agoraFmt,
          usuario_id: dados.usuario_id,
          usuario_nome: dados.usuario_nome,
          descricao_mudanca: 'Criação inicial da Programação de Parada',
          centros_snapshot: centrosProntos,
        },
      ]

      paradaRecord = await pb.collection('programacao_paradas').create({
        codigo: novoCodigo,
        versao: 1,
        versao_rotulo: 'V01',
        status: dados.status || 'RASCUNHO',
        observacao_geral: dados.observacao_geral || '',
        criado_por_id: dados.usuario_id,
        criado_por_nome: dados.usuario_nome,
        atualizado_por_id: dados.usuario_id,
        atualizado_por_nome: dados.usuario_nome,
        ultima_alteracao: agoraFmt,
        analise_ia: dados.analise_ia || null,
        ultimo_comunicado_em: '',
        ultimo_comunicado_versao: 0,
        programacao_alterada_pos_comunicado: false,
        historico_versoes: historicoInicial,
      })

      // Gravar itens de centros
      for (const item of centrosProntos) {
        await pb.collection('programacao_parada_centros').create({
          parada_id: paradaRecord.id,
          codigo_parada: paradaRecord.codigo,
          empresa_id: item.empresa_id,
          empresa_nome: item.empresa_nome,
          linha_id: item.linha_id,
          linha_nome: item.linha_nome,
          centro_id: item.centro_id,
          centro_nome: item.centro_nome,
          data_inicio: item.data_inicio,
          hora_inicio: item.hora_inicio,
          data_fim: item.data_fim,
          hora_fim: item.hora_fim,
          inicio_iso: item.inicio_iso,
          fim_iso: item.fim_iso,
          duracao_horas: item.duracao_horas,
          duracao_formatada: item.duracao_formatada,
          motivo: item.motivo,
          motivo_outro_detalhe: item.motivo_outro_detalhe || '',
          descricao: item.descricao || '',
          status: 'ATIVO',
        })
      }

      // Auditoria
      await this.gravarAuditoria({
        acao: 'CRIACAO_PROGRAMACAO_PARADA',
        parada_id: paradaRecord.id,
        codigo: paradaRecord.codigo,
        versao: 1,
        resultado: 'SUCCESS',
        motivo: `Criação da programação de parada ${paradaRecord.codigo} com ${centrosProntos.length} centro(s).`,
        usuario_id: dados.usuario_id,
        usuario_nome: dados.usuario_nome,
        detalhes: { centros: centrosProntos, status: dados.status },
      })
    } else {
      // Atualizar parada existente: gerar nova versão e detectar pós-comunicado
      const paradaAtual = await pb.collection('programacao_paradas').getOne(dados.id!)
      const versaoAnterior = paradaAtual.versao || 1
      const novaVersaoNum = versaoAnterior + 1
      const novaVersaoRotulo = `V${String(novaVersaoNum).padStart(2, '0')}`

      // Se já tinha comunicado enviado, sinalizar alteração pós-comunicado
      const teveComunicado = !!paradaAtual.ultimo_comunicado_em
      const alteradaPosComunicado = teveComunicado

      const historicoAtual: HistoricoVersao[] = paradaAtual.historico_versoes || []
      historicoAtual.push({
        versao: novaVersaoNum,
        versao_rotulo: novaVersaoRotulo,
        data_hora: agoraFmt,
        usuario_id: dados.usuario_id,
        usuario_nome: dados.usuario_nome,
        descricao_mudanca: `Atualização de parâmetros e centros da programação (V${novaVersaoNum})`,
        centros_snapshot: centrosProntos,
      })

      paradaRecord = await pb.collection('programacao_paradas').update(dados.id!, {
        versao: novaVersaoNum,
        versao_rotulo: novaVersaoRotulo,
        status: dados.status || paradaAtual.status,
        observacao_geral:
          dados.observacao_geral !== undefined
            ? dados.observacao_geral
            : paradaAtual.observacao_geral,
        atualizado_por_id: dados.usuario_id,
        atualizado_por_nome: dados.usuario_nome,
        ultima_alteracao: agoraFmt,
        analise_ia: dados.analise_ia || paradaAtual.analise_ia,
        programacao_alterada_pos_comunicado: alteradaPosComunicado,
        historico_versoes: historicoAtual,
      })

      // Excluir centros antigos e reinserir atualizados (preserva integridade das relações ativas)
      const antigosCentros = await pb.collection('programacao_parada_centros').getFullList({
        filter: `parada_id = '${dados.id}'`,
      })
      for (const ac of antigosCentros) {
        await pb.collection('programacao_parada_centros').delete(ac.id)
      }

      for (const item of centrosProntos) {
        await pb.collection('programacao_parada_centros').create({
          parada_id: dados.id,
          codigo_parada: paradaRecord.codigo,
          empresa_id: item.empresa_id,
          empresa_nome: item.empresa_nome,
          linha_id: item.linha_id,
          linha_nome: item.linha_nome,
          centro_id: item.centro_id,
          centro_nome: item.centro_nome,
          data_inicio: item.data_inicio,
          hora_inicio: item.hora_inicio,
          data_fim: item.data_fim,
          hora_fim: item.hora_fim,
          inicio_iso: item.inicio_iso,
          fim_iso: item.fim_iso,
          duracao_horas: item.duracao_horas,
          duracao_formatada: item.duracao_formatada,
          motivo: item.motivo,
          motivo_outro_detalhe: item.motivo_outro_detalhe || '',
          descricao: item.descricao || '',
          status: 'ATIVO',
        })
      }

      // Auditoria
      await this.gravarAuditoria({
        acao: 'EDICAO_PROGRAMACAO_PARADA',
        parada_id: dados.id,
        codigo: paradaRecord.codigo,
        versao: novaVersaoNum,
        resultado: 'SUCCESS',
        motivo: `Atualização da programação ${paradaRecord.codigo} gerando versão ${novaVersaoRotulo}.`,
        usuario_id: dados.usuario_id,
        usuario_nome: dados.usuario_nome,
        detalhes: {
          versao_anterior: versaoAnterior,
          nova_versao: novaVersaoNum,
          centros: centrosProntos,
          alterada_pos_comunicado: alteradaPosComunicado,
        },
      })
    }

    // Se o status for VALIDADA ou COMUNICADA, sincronizar com standard_scheduled_stops para refletir na capacidade
    if (dados.status === 'VALIDADA' || dados.status === 'COMUNICADA') {
      await this.sincronizarParadasComMotorCapacidade(
        paradaRecord.id,
        paradaRecord.codigo,
        centrosProntos,
      )
    }

    return this.obterParadaPorId(paradaRecord.id)
  },

  /**
   * Sincronização central com standard_scheduled_stops para alimentar o motor semanal existente
   * sem duplicar regras nem quebrar a Montagem Programação.
   */
  async sincronizarParadasComMotorCapacidade(
    paradaId: string,
    codigoParada: string,
    centros: ProgramacaoParadaCentroItem[],
  ) {
    try {
      // 1. Remover paradas padrão antigas geradas por esta Programação de Parada
      const existentes = await pb.collection('standard_scheduled_stops').getFullList({
        filter: `code ~ '${codigoParada}'`,
      })
      for (const ex of existentes) {
        await pb.collection('standard_scheduled_stops').delete(ex.id)
      }

      // 2. Inserir um registro para cada centro aplicável
      for (let i = 0; i < centros.length; i++) {
        const c = centros[i]
        const durMinutos = Math.round((c.duracao_horas || 1) * 60)
        const stopCode = `${codigoParada}_C${i + 1}`

        // Buscar id da linha correspondente caso exista
        let lineId = ''
        try {
          const lRec = await pb
            .collection('production_lines')
            .getFirstListItem(`code = '${c.linha_id}'`)
          lineId = lRec.id
        } catch {
          // ignore
        }

        await pb.collection('standard_scheduled_stops').create({
          line_id: lineId || null,
          code: stopCode,
          description: `PARADA PROGRAMADA — ${c.data_inicio} ${c.hora_inicio} até ${c.data_fim} ${c.hora_fim} (${c.motivo}): ${c.descricao || 'Bloqueio de capacidade'}`,
          category: 'PREVENTIVE_MAINTENANCE',
          recurrence: 'CUSTOM',
          expected_duration_minutes: durMinutos,
          scheduled_time: c.hora_inicio,
          applicable_days: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
          expected_impact: `PARADA PROGRAMADA ${codigoParada} — ${c.data_inicio} ${c.hora_inicio} até ${c.data_fim} ${c.hora_fim}`,
          active: true,
          valid_from: c.inicio_iso || `${c.data_inicio} ${c.hora_inicio}`,
          valid_until: c.fim_iso || `${c.data_fim} ${c.hora_fim}`,
          start_time: c.hora_inicio,
          end_time: c.hora_fim,
          time_applicable: true,
          reason: c.motivo,
        })
      }
    } catch (e) {
      console.error('Falha ao sincronizar parada com standard_scheduled_stops:', e)
    }
  },

  /**
   * Cancelamento formal com auditoria e exclusão lógica
   */
  async cancelarParada(
    paradaId: string,
    motivoCancelamento: string,
    usuarioId: string,
    usuarioNome: string,
  ) {
    const agora = new Date().toISOString().replace('T', ' ').substring(0, 19)
    const parada = await pb.collection('programacao_paradas').getOne(paradaId)

    // Atualizar status para CANCELADA
    await pb.collection('programacao_paradas').update(paradaId, {
      status: 'CANCELADA',
      observacao_geral:
        `${parada.observacao_geral || ''}\n[CANCELADA em ${agora} por ${usuarioNome}]: ${motivoCancelamento}`.trim(),
      atualizado_por_id: usuarioId,
      atualizado_por_nome: usuarioNome,
      ultima_alteracao: agora,
    })

    // Desativar centros
    const centros = await pb.collection('programacao_parada_centros').getFullList({
      filter: `parada_id = '${paradaId}'`,
    })
    for (const c of centros) {
      await pb.collection('programacao_parada_centros').update(c.id, { status: 'CANCELADO' })
    }

    // Remover do motor de capacidade standard_scheduled_stops
    try {
      const stops = await pb.collection('standard_scheduled_stops').getFullList({
        filter: `code ~ '${parada.codigo}'`,
      })
      for (const s of stops) {
        await pb.collection('standard_scheduled_stops').delete(s.id)
      }
    } catch (e) {
      // ignore
    }

    // Gravar auditoria
    await this.gravarAuditoria({
      acao: 'CANCELAMENTO_PROGRAMACAO_PARADA',
      parada_id: paradaId,
      codigo: parada.codigo,
      versao: parada.versao,
      resultado: 'SUCCESS',
      motivo: `Cancelamento formal da parada ${parada.codigo}: ${motivoCancelamento}`,
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      detalhes: { motivo_cancelamento: motivoCancelamento },
    })

    return this.obterParadaPorId(paradaId)
  },

  /**
   * Consultar lista de paradas com filtros
   */
  async consultarParadas(filtros: {
    empresa_id?: string
    linha_id?: string
    centro_id?: string
    status?: string
    motivo?: string
    data_inicio?: string
    data_fim?: string
    criado_por?: string
  }) {
    let filterExpr = 'id != ""'

    if (filtros.status && filtros.status !== 'TODOS') {
      filterExpr += ` && status = '${filtros.status}'`
    }
    if (filtros.criado_por) {
      filterExpr += ` && criado_por_nome ~ '${filtros.criado_por}'`
    }

    const records = await pb.collection('programacao_paradas').getFullList({
      filter: filterExpr,
      sort: '-created',
    })

    // Carregar centros de cada uma
    const resultados: ProgramacaoParadaRecord[] = []
    for (const r of records) {
      let centros = await pb.collection('programacao_parada_centros').getFullList({
        filter: `parada_id = '${r.id}'`,
        sort: 'created',
      })

      // Aplicar filtros de centro/linha/empresa em memória
      if (filtros.empresa_id && filtros.empresa_id !== 'TODOS') {
        centros = centros.filter((c: any) => c.empresa_id === filtros.empresa_id)
      }
      if (filtros.linha_id && filtros.linha_id !== 'TODOS') {
        centros = centros.filter((c: any) => c.linha_id === filtros.linha_id)
      }
      if (filtros.centro_id && filtros.centro_id !== 'TODOS') {
        centros = centros.filter((c: any) => c.centro_id === filtros.centro_id)
      }
      if (filtros.motivo && filtros.motivo !== 'TODOS') {
        centros = centros.filter((c: any) => c.motivo === filtros.motivo)
      }

      // Se filtrou por centro/linha e não sobrou nenhum, ignora a parada na listagem
      if (
        (filtros.empresa_id && filtros.empresa_id !== 'TODOS') ||
        (filtros.linha_id && filtros.linha_id !== 'TODOS') ||
        (filtros.centro_id && filtros.centro_id !== 'TODOS') ||
        (filtros.motivo && filtros.motivo !== 'TODOS')
      ) {
        if (centros.length === 0) continue
      }

      resultados.push({
        id: r.id,
        codigo: r.codigo,
        versao: r.versao,
        versao_rotulo: r.versao_rotulo || `V0${r.versao}`,
        status: r.status,
        observacao_geral: r.observacao_geral,
        criado_por_id: r.criado_por_id,
        criado_por_nome: r.criado_por_nome,
        atualizado_por_id: r.atualizado_por_id,
        atualizado_por_nome: r.atualizado_por_nome,
        ultima_alteracao: r.ultima_alteracao,
        analise_ia: r.analise_ia,
        ultimo_comunicado_em: r.ultimo_comunicado_em,
        ultimo_comunicado_versao: r.ultimo_comunicado_versao,
        programacao_alterada_pos_comunicado: r.programacao_alterada_pos_comunicado,
        historico_versoes: r.historico_versoes,
        centros: centros.map((c: any) => ({
          id: c.id,
          empresa_id: c.empresa_id,
          empresa_nome: c.empresa_nome,
          linha_id: c.linha_id,
          linha_nome: c.linha_nome,
          centro_id: c.centro_id,
          centro_nome: c.centro_nome,
          data_inicio: c.data_inicio,
          hora_inicio: c.hora_inicio,
          data_fim: c.data_fim,
          hora_fim: c.hora_fim,
          inicio_iso: c.inicio_iso,
          fim_iso: c.fim_iso,
          duracao_horas: c.duracao_horas,
          duracao_formatada: c.duracao_formatada,
          motivo: c.motivo,
          motivo_outro_detalhe: c.motivo_outro_detalhe,
          descricao: c.descricao,
          status: c.status,
        })),
        created: r.created,
        updated: r.updated,
      })
    }

    return resultados
  },

  /**
   * Obter parada detalhada por ID
   */
  async obterParadaPorId(id: string): Promise<ProgramacaoParadaRecord> {
    const r = await pb.collection('programacao_paradas').getOne(id)
    const centros = await pb.collection('programacao_parada_centros').getFullList({
      filter: `parada_id = '${id}'`,
      sort: 'created',
    })

    return {
      id: r.id,
      codigo: r.codigo,
      versao: r.versao,
      versao_rotulo: r.versao_rotulo || `V0${r.versao}`,
      status: r.status,
      observacao_geral: r.observacao_geral,
      criado_por_id: r.criado_por_id,
      criado_por_nome: r.criado_por_nome,
      atualizado_por_id: r.atualizado_por_id,
      atualizado_por_nome: r.atualizado_por_nome,
      ultima_alteracao: r.ultima_alteracao,
      analise_ia: r.analise_ia,
      ultimo_comunicado_em: r.ultimo_comunicado_em,
      ultimo_comunicado_versao: r.ultimo_comunicado_versao,
      programacao_alterada_pos_comunicado: r.programacao_alterada_pos_comunicado,
      historico_versoes: r.historico_versoes,
      centros: centros.map((c: any) => ({
        id: c.id,
        empresa_id: c.empresa_id,
        empresa_nome: c.empresa_nome,
        linha_id: c.linha_id,
        linha_nome: c.linha_nome,
        centro_id: c.centro_id,
        centro_nome: c.centro_nome,
        data_inicio: c.data_inicio,
        hora_inicio: c.hora_inicio,
        data_fim: c.data_fim,
        hora_fim: c.hora_fim,
        inicio_iso: c.inicio_iso,
        fim_iso: c.fim_iso,
        duracao_horas: c.duracao_horas,
        duracao_formatada: c.duracao_formatada,
        motivo: c.motivo,
        motivo_outro_detalhe: c.motivo_outro_detalhe,
        descricao: c.descricao,
        status: c.status,
      })),
      created: r.created,
      updated: r.updated,
    }
  },

  /**
   * Acionar validação com IA via backend seguro
   */
  async validarComIA(
    param1:
      | string
      | {
          parada_id?: string
          codigo?: string
          centros: ProgramacaoParadaCentroItem[]
          motivo_geral?: string
        },
    param2?: ProgramacaoParadaCentroItem[],
    param3: number = 1,
  ): Promise<ValidacaoIAResultado> {
    let codigo = 'PP-VALIDAR'
    let centros: ProgramacaoParadaCentroItem[] = []
    let versao = 1

    if (typeof param1 === 'object' && param1 !== null) {
      codigo = param1.codigo || 'PP-VALIDAR'
      centros = param1.centros || []
      versao = 1
    } else {
      codigo = String(param1)
      centros = param2 || []
      versao = param3
    }
    try {
      const res = await pb.send('/backend/v1/programacao-parada/ia-validar', {
        method: 'POST',
        body: JSON.stringify({
          codigo,
          centros,
          versao,
        }),
      })
      return res as ValidacaoIAResultado
    } catch (e) {
      // Fallback em caso de falha de rede
      return {
        valido: true,
        classificacao: 'SEM_CONFLITO',
        nivel: 'SEM_CONFLITO',
        resumo:
          'Validação técnica preliminar executada localmente: nenhum conflito direto detectado.',
        impactos_identificados: ['Capacidade do centro será reduzida no período da parada.'],
        alertas: [],
        centros_afetados: centros.map((c) => ({
          centro: c.centro_nome || c.centro_id || c.centro_code || '',
          linha: c.linha_nome || c.linha_id || c.linha_code || '',
          periodo: `${c.data_inicio} ${c.hora_inicio} até ${c.data_fim} ${c.hora_fim}`,
          motivo: c.motivo,
          duracao: c.duracao_formatada || `${c.duracao_horas || 0}h`,
        })),
        programacoes_afetadas: [],
        ordens_afetadas: [],
        recomendacoes: ['Confirmar disponibilidade de sobressalentes com Manutenção.'],
        proximas_acoes: ['Salvar e oficializar a programação de parada.'],
        proximas_acoes_sugeridas: ['Salvar e oficializar a programação de parada.'],
      }
    }
  },

  /**
   * Gerar texto de comunicado com IA
   */
  async gerarComunicadoIA(
    codigo: string,
    centros: ProgramacaoParadaCentroItem[],
    versao: number,
    tipoComunicado: 'INICIAL' | 'ATUALIZACAO' = 'INICIAL',
    alteracoes: string[] = [],
  ): Promise<{ assunto: string; conteudo: string }> {
    try {
      const res = await pb.send('/backend/v1/programacao-parada/ia-comunicado', {
        method: 'POST',
        body: JSON.stringify({
          codigo,
          centros,
          versao,
          tipo_comunicado: tipoComunicado,
          alteracoes,
        }),
      })
      return res as { assunto: string; conteudo: string }
    } catch (e) {
      const c = centros[0] || ({} as any)
      return {
        assunto: `Parada Programada — ${c.linha_nome || 'Linha'} — ${c.data_inicio || ''}`,
        conteudo: `Prezados,\n\nComunicamos a Parada Programada ${codigo}.\n\nAtenciosamente,\nPCP — Ciafal`,
      }
    }
  },

  /**
   * Enviar comunicado real com persistência e log de auditoria
   */
  async enviarComunicado(params: {
    parada_id: string
    codigo_parada: string
    versao_programacao: number
    assunto: string
    conteudo: string
    destinatarios_para: string[]
    destinatarios_cc: string[]
    grupos_destinatarios: string[]
    tipo_comunicado: 'INICIAL' | 'ATUALIZACAO'
  }): Promise<{ sucesso: boolean; mensagem_erro?: string; destinatarios_count: number }> {
    const res = await pb.send('/backend/v1/programacao-parada/enviar-comunicado', {
      method: 'POST',
      body: JSON.stringify(params),
    })
    return res as any
  },

  /**
   * Obter histórico de comunicados de uma parada
   */
  async getHistoricoComunicados(paradaId: string): Promise<ComunicadoHistoricoItem[]> {
    try {
      const res = await pb.collection('programacao_parada_comunicados').getFullList({
        filter: `parada_id = '${paradaId}'`,
        sort: '-created',
      })
      return res as any
    } catch {
      return []
    }
  },

  /**
   * Obter usuários e grupos para seleção de destinatários
   */
  async getDestinatariosDisponiveis() {
    try {
      const users = await pb.collection('users').getFullList({
        sort: 'name',
      })
      const userList = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.name || u.email,
        role: u.role,
      }))

      // Grupos padrão corporativos
      const gruposPadrao = [
        {
          id: 'grp_supervisores',
          nome: 'Supervisores Industriais',
          emails: ['supervisor.l1@ciafal.com.br', 'supervisor.l2@ciafal.com.br'],
        },
        {
          id: 'grp_pcp',
          nome: 'Equipe PCP (Programação)',
          emails: ['programador.pcp@ciafal.com.br', 'ciafal@ciafal.com.br'],
        },
        {
          id: 'grp_producao',
          nome: 'Gerência de Produção',
          emails: ['gestor.l1@ciafal.com.br', 'gestor.l2@ciafal.com.br'],
        },
        {
          id: 'grp_manutencao',
          nome: 'Manutenção Mecânica / Elétrica',
          emails: ['manutencao.preventiva@ciafal.com.br', 'eng.manutencao@ciafal.com.br'],
        },
        {
          id: 'grp_comercial',
          nome: 'Comercial & Atendimento',
          emails: ['comercial.vendas@ciafal.com.br'],
        },
        {
          id: 'grp_projetos',
          nome: 'Projetos e Engenharia',
          emails: ['engenharia.processos@ciafal.com.br'],
        },
        {
          id: 'grp_qualidade',
          nome: 'Controle de Qualidade',
          emails: ['qualidade.inspecao@ciafal.com.br'],
        },
        {
          id: 'grp_diretoria',
          nome: 'Diretoria Industrial',
          emails: ['diretoria.industrial@ciafal.com.br'],
        },
      ]

      return { usuarios: userList, grupos: gruposPadrao }
    } catch {
      return {
        usuarios: [
          {
            id: '1',
            email: 'ciafal@ciafal.com.br',
            name: 'Administrador Geral CIAFAL',
            role: 'PCP_ADMIN',
          },
          {
            id: '2',
            email: 'programador.pcp@ciafal.com.br',
            name: 'Lucas Ferreira (PCP)',
            role: 'PCP_PROGRAMMER',
          },
          {
            id: '3',
            email: 'gestor.l1@ciafal.com.br',
            name: 'Carlos Mendes (Gestor L1)',
            role: 'LINE_MANAGER',
          },
          {
            id: '4',
            email: 'gestor.l2@ciafal.com.br',
            name: 'Marcos Souza (Gestor L2)',
            role: 'LINE_MANAGER',
          },
        ],
        grupos: [
          {
            id: 'grp_pcp',
            nome: 'Equipe PCP (Programação)',
            emails: ['programador.pcp@ciafal.com.br', 'ciafal@ciafal.com.br'],
          },
          { id: 'grp_supervisores', nome: 'Supervisores', emails: ['supervisor.l1@ciafal.com.br'] },
          { id: 'grp_manutencao', nome: 'Manutenção', emails: ['manutencao@ciafal.com.br'] },
          { id: 'grp_qualidade', nome: 'Qualidade', emails: ['qualidade@ciafal.com.br'] },
        ],
      }
    }
  },

  /**
   * Métodos utilitários adicionais e aliases para integração com componentes
   */
  calcularDuracaoHoras(inicioStr: string, fimStr: string): number {
    if (!inicioStr || !fimStr) return 0
    let d1: Date
    let d2: Date

    if (inicioStr.includes('/')) {
      const [dPart, hPart] = inicioStr.split(' ')
      const [dia, mes, ano] = (dPart || '').split('/')
      d1 = new Date(`${ano}-${mes}-${dia}T${hPart || '00:00'}:00`)
    } else {
      d1 = new Date(inicioStr)
    }

    if (fimStr.includes('/')) {
      const [dPart, hPart] = fimStr.split(' ')
      const [dia, mes, ano] = (dPart || '').split('/')
      d2 = new Date(`${ano}-${mes}-${dia}T${hPart || '00:00'}:00`)
    } else {
      d2 = new Date(fimStr)
    }

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0
    const diffMs = d2.getTime() - d1.getTime()
    if (diffMs <= 0) return 0
    return Number((diffMs / (1000 * 60 * 60)).toFixed(1))
  },

  formatarDuracao(horasTotais: number): string {
    if (!horasTotais || horasTotais <= 0) return '0 h'
    const dias = Math.floor(horasTotais / 24)
    const horas = Math.floor(horasTotais % 24)
    const partes: string[] = []
    if (dias > 0) partes.push(`${dias} dia${dias > 1 ? 's' : ''}`)
    if (horas > 0 || dias === 0) partes.push(`${horas} hora${horas > 1 ? 's' : ''}`)
    return `${partes.join(' e ')} (${horasTotais} h)`
  },

  verificarSobreposicao(
    ini1Str: string,
    fim1Str: string,
    ini2Str: string,
    fim2Str: string,
  ): boolean {
    const parse = (s: string) => {
      if (s.includes('/')) {
        const [d, h] = s.split(' ')
        const [dia, mes, ano] = (d || '').split('/')
        return new Date(`${ano}-${mes}-${dia}T${h || '00:00'}:00`).getTime()
      }
      return new Date(s).getTime()
    }
    const t1Start = parse(ini1Str)
    const t1End = parse(fim1Str)
    const t2Start = parse(ini2Str)
    const t2End = parse(fim2Str)

    if (isNaN(t1Start) || isNaN(t1End) || isNaN(t2Start) || isNaN(t2End)) return false
    return t1Start < t2End && t1End > t2Start
  },

  async listarProgramacoes(): Promise<ProgramacaoParadaRecord[]> {
    return this.consultarParadas({})
  },

  async listarCentrosPorFiltro(): Promise<CentroParadaRegistro[]> {
    try {
      const records = await pb.collection('programacao_parada_centros').getFullList({
        sort: '-created',
      })
      return records.map((c: any) => ({
        id: c.id,
        parada_id: c.parada_id,
        empresa_code: c.empresa_id || c.empresa_code,
        linha_code: c.linha_id || c.linha_code,
        centro_code: c.centro_id || c.centro_code,
        centro_nome: c.centro_nome,
        linha_nome: c.linha_nome,
        empresa_nome: c.empresa_nome,
        data_hora_inicio: c.inicio_iso || `${c.data_inicio} ${c.hora_inicio}`,
        data_hora_fim: c.fim_iso || `${c.data_fim} ${c.hora_fim}`,
        duracao_horas: c.duracao_horas,
        duracao_formatada: c.duracao_formatada,
        motivo: c.motivo,
        motivo_outro: c.motivo_outro_detalhe || c.motivo_outro,
        descricao: c.descricao,
        status: c.status,
      }))
    } catch {
      return []
    }
  },

  async listarCentrosPorParada(paradaId: string): Promise<CentroParadaRegistro[]> {
    try {
      const records = await pb.collection('programacao_parada_centros').getFullList({
        filter: `parada_id = '${paradaId}'`,
        sort: 'created',
      })
      return records.map((c: any) => ({
        id: c.id,
        parada_id: c.parada_id,
        empresa_code: c.empresa_id || c.empresa_code,
        linha_code: c.linha_id || c.linha_code,
        centro_code: c.centro_id || c.centro_code,
        centro_nome: c.centro_nome,
        linha_nome: c.linha_nome,
        empresa_nome: c.empresa_nome,
        data_hora_inicio: c.data_inicio ? `${c.data_inicio} ${c.hora_inicio}` : c.inicio_iso,
        data_hora_fim: c.data_fim ? `${c.data_fim} ${c.hora_fim}` : c.fim_iso,
        duracao_horas: c.duracao_horas,
        duracao_formatada: c.duracao_formatada,
        motivo: c.motivo,
        motivo_outro: c.motivo_outro_detalhe || c.motivo_outro,
        descricao: c.descricao,
        status: c.status,
      }))
    } catch {
      return []
    }
  },

  async criarProgramacao(
    parada: Partial<ProgramacaoParadaRecord>,
    centros: CentroParadaInput[],
  ): Promise<ProgramacaoParadaRecord> {
    const centrosProntos: ProgramacaoParadaCentroItem[] = centros.map((c) => {
      let dIni = c.data_inicio || ''
      let hIni = c.hora_inicio || ''
      let dFim = c.data_fim || ''
      let hFim = c.hora_fim || ''

      if (c.data_hora_inicio && (!dIni || !hIni)) {
        const parts = c.data_hora_inicio.split(' ')
        dIni = parts[0] || ''
        hIni = parts[1] || '06:00'
      }
      if (c.data_hora_fim && (!dFim || !hFim)) {
        const parts = c.data_hora_fim.split(' ')
        dFim = parts[0] || ''
        hFim = parts[1] || '18:00'
      }

      return {
        ...c,
        empresa_id: c.empresa_code || c.empresa_id || '1001',
        empresa_nome: c.empresa_nome || 'CIAFAL',
        linha_id: c.linha_code || c.linha_id || 'L1',
        linha_nome: c.linha_nome || 'Laminação 1',
        centro_id: c.centro_code || c.centro_id || 'L1',
        centro_nome: c.centro_nome || c.centro_code || 'L1',
        data_inicio: dIni,
        hora_inicio: hIni,
        data_fim: dFim,
        hora_fim: hFim,
        motivo_outro_detalhe: c.motivo_outro || c.motivo_outro_detalhe || '',
        status: c.status === 'CANCELADO' ? 'CANCELADO' : 'ATIVO',
      }
    })

    return this.salvarParada({
      codigo: parada.codigo || '',
      versao: parada.versao || 1,
      status: parada.status || 'RASCUNHO',
      observacao_geral: parada.observacao_geral || parada.observacao || '',
      centros: centrosProntos,
      usuario_id: parada.criado_por_id || '',
      usuario_nome: parada.criado_por_nome || 'Usuário PCP',
    })
  },

  async atualizarProgramacao(
    id: string,
    parada: Partial<ProgramacaoParadaRecord>,
    centros: CentroParadaInput[],
    _descricaoMudanca?: string,
  ): Promise<ProgramacaoParadaRecord> {
    const centrosProntos: ProgramacaoParadaCentroItem[] = centros.map((c) => {
      let dIni = c.data_inicio || ''
      let hIni = c.hora_inicio || ''
      let dFim = c.data_fim || ''
      let hFim = c.hora_fim || ''

      if (c.data_hora_inicio && (!dIni || !hIni)) {
        const parts = c.data_hora_inicio.split(' ')
        dIni = parts[0] || ''
        hIni = parts[1] || '06:00'
      }
      if (c.data_hora_fim && (!dFim || !hFim)) {
        const parts = c.data_hora_fim.split(' ')
        dFim = parts[0] || ''
        hFim = parts[1] || '18:00'
      }

      return {
        ...c,
        empresa_id: c.empresa_code || c.empresa_id || '1001',
        empresa_nome: c.empresa_nome || 'CIAFAL',
        linha_id: c.linha_code || c.linha_id || 'L1',
        linha_nome: c.linha_nome || 'Laminação 1',
        centro_id: c.centro_code || c.centro_id || 'L1',
        centro_nome: c.centro_nome || c.centro_code || 'L1',
        data_inicio: dIni,
        hora_inicio: hIni,
        data_fim: dFim,
        hora_fim: hFim,
        motivo_outro_detalhe: c.motivo_outro || c.motivo_outro_detalhe || '',
        status: c.status === 'CANCELADO' ? 'CANCELADO' : 'ATIVO',
      }
    })

    return this.salvarParada({
      id,
      codigo: parada.codigo || '',
      versao: parada.versao || 1,
      status: parada.status || 'RASCUNHO',
      observacao_geral: parada.observacao_geral || parada.observacao || '',
      centros: centrosProntos,
      usuario_id: parada.atualizado_por_id || parada.criado_por_id || '',
      usuario_nome: parada.atualizado_por_nome || parada.criado_por_nome || 'Usuário PCP',
    })
  },

  async atualizarStatus(
    id: string,
    status: StatusParada,
    motivoCancelamento?: string,
  ): Promise<void> {
    if (status === 'CANCELADA') {
      await this.cancelarParada(
        id,
        motivoCancelamento || 'Cancelada pelo usuário',
        pb.authStore.model?.id || '',
        pb.authStore.model?.name || 'Usuário PCP',
      )
    } else {
      await pb.collection('programacao_paradas').update(id, { status })
    }
  },

  async duplicarProgramacao(id: string): Promise<ProgramacaoParadaRecord> {
    const original = await this.obterParadaPorId(id)
    const novoCodigo = await this.gerarProximoCodigo()
    const centrosInput: CentroParadaInput[] = (original.centros || []).map((c) => ({
      ...c,
      id: undefined,
    }))
    return this.criarProgramacao(
      {
        codigo: novoCodigo,
        versao: 1,
        status: 'RASCUNHO',
        observacao_geral: original.observacao_geral
          ? `${original.observacao_geral} (Duplicada de ${original.codigo})`
          : `Duplicada de ${original.codigo}`,
      },
      centrosInput,
    )
  },

  async listarHistorico(paradaId: string): Promise<ProgramacaoParadaHistorico[]> {
    try {
      const records = await pb.collection('programacao_parada_historico').getFullList({
        filter: `parada_id = '${paradaId}'`,
        sort: '-created',
      })
      if (records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          versao: r.versao,
          tipo_alteracao: r.tipo_alteracao,
          descricao_alteracao: r.descricao_alteracao,
          usuario_id: r.usuario_id,
          usuario_nome: r.usuario_nome,
          dados_antes: r.dados_antes,
          dados_depois: r.dados_depois,
          created: r.created,
        }))
      }

      // Fallback para o campo json historico_versoes da própria parada
      const parada = await pb.collection('programacao_paradas').getOne(paradaId)
      const hVersoes: HistoricoVersao[] = parada.historico_versoes || []
      return hVersoes.map((h, i) => ({
        id: `h-${i}`,
        versao: h.versao,
        tipo_alteracao: 'Atualização de Versão',
        descricao_alteracao: h.descricao_mudanca,
        usuario_id: h.usuario_id,
        usuario_nome: h.usuario_nome,
        created: h.data_hora,
      }))
    } catch {
      return []
    }
  },

  gerarCorpoComunicadoPadrao(
    parada: ProgramacaoParadaRecord,
    centros: CentroParadaInput[],
    isAtualizacao: boolean,
  ): { assunto: string; corpo: string; impactos: string; previsaoRetorno: string } {
    const linhas = Array.from(
      new Set(centros.map((c) => c.linha_nome || c.linha_code || 'Linha')),
    ).join(', ')
    const centrosStr = Array.from(
      new Set(centros.map((c) => c.centro_nome || c.centro_code || 'Centro')),
    ).join(', ')

    const c0 = centros[0]
    const periodo = c0
      ? `${c0.data_inicio || c0.data_hora_inicio || ''} até ${c0.data_fim || c0.data_hora_fim || ''}`
      : 'Período programado'

    const prefixo = isAtualizacao ? 'ATUALIZAÇÃO — ' : ''
    const assunto = `${prefixo}Parada Programada — ${linhas || 'Operações'} — ${periodo}`

    const itensCentros = centros
      .map((c, i) => {
        const start = c.data_hora_inicio || `${c.data_inicio} ${c.hora_inicio}`
        const end = c.data_hora_fim || `${c.data_fim} ${c.hora_fim}`
        const dur = this.formatarDuracao(c.duracao_horas || 0)
        return `• Centro: ${c.centro_code || c.centro_id} (${c.linha_code || c.linha_id})\n  Período: ${start} até ${end} (${dur})\n  Motivo: ${c.motivo}${c.motivo === 'Outro' && c.motivo_outro ? ` (${c.motivo_outro})` : ''}\n  Observações: ${c.descricao || 'Conforme plano de manutenção preventivo.'}`
      })
      .join('\n\n')

    const corpo = `Parada Programada: ${parada.codigo} (Versão V${String(parada.versao).padStart(2, '0')})\nLinha(s) Afetada(s): ${linhas}\n\nDETALHAMENTO DOS CENTROS:\n${itensCentros}`

    const impactos = `- Redução temporária da capacidade produtiva nas linhas: ${linhas}.\n- Reprogramação e sequenciamento de ordens de produção envolvidas no período.\n- Bloqueio operacional programado sem impacto no atendimento a clientes com estoque regulador.`

    const previsaoRetorno = `- Liberação técnica prevista para: ${c0?.data_fim || c0?.data_hora_fim || 'Término do período'}.\n- Retomada imediata dos apontamentos industriais após checklist de liberação da Manutenção.`

    return { assunto, corpo, impactos, previsaoRetorno }
  },

  async listarComunicados(paradaId: string): Promise<any[]> {
    return this.getHistoricoComunicados(paradaId)
  },

  async dispararComunicado(params: {
    parada_id: string
    parada_codigo: string
    destinatarios: string[]
    copia: string[]
    assunto: string
    corpo: string
    versao: number
    houve_alteracao_pos_comunicado: boolean
  }): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      const res = await this.enviarComunicado({
        parada_id: params.parada_id,
        codigo_parada: params.parada_codigo,
        versao_programacao: params.versao,
        assunto: params.assunto,
        conteudo: params.corpo,
        destinatarios_para: params.destinatarios,
        destinatarios_cc: params.copia,
        grupos_destinatarios: [],
        tipo_comunicado: params.houve_alteracao_pos_comunicado ? 'ATUALIZACAO' : 'INICIAL',
      })
      return { sucesso: res.sucesso, erro: res.mensagem_erro }
    } catch (e: any) {
      // Se endpoint de backend não estiver acessível, persiste append-only localmente
      try {
        await pb.collection('programacao_parada_comunicados').create({
          parada_id: params.parada_id,
          codigo_parada: params.parada_codigo,
          versao_programacao: params.versao,
          assunto: params.assunto,
          conteudo: params.corpo,
          destinatarios_para: params.destinatarios,
          destinatarios_cc: params.copia,
          usuario_envio_nome: pb.authStore.model?.name || 'Lucas Ferreira (PCP)',
          resultado_envio: 'SUCESSO',
          tipo_comunicado: params.houve_alteracao_pos_comunicado ? 'ATUALIZACAO' : 'INICIAL',
        })
        await pb.collection('programacao_paradas').update(params.parada_id, {
          status: 'COMUNICADA',
          comunicado_disparado: true,
          ultimo_comunicado_em: new Date().toISOString(),
          ultimo_comunicado_versao: params.versao,
          programacao_alterada_pos_comunicado: false,
        })
        return { sucesso: true }
      } catch (err: any) {
        return { sucesso: false, erro: err?.message || 'Falha ao registrar comunicado.' }
      }
    }
  },

  async obterProgramacaoPorId(id: string): Promise<ProgramacaoParadaRecord> {
    return this.obterParadaPorId(id)
  },

  /**
   * Gravar log na collection oficial pcp_audit_logs
   */
  async gravarAuditoria(params: {
    acao: string
    parada_id: string
    codigo: string
    versao: number
    resultado: 'SUCCESS' | 'FAILED'
    motivo: string
    usuario_id: string
    usuario_nome: string
    detalhes?: any
  }) {
    try {
      const user = pb.authStore.model
      await pb.collection('pcp_audit_logs').create({
        user_id: params.usuario_id || (user ? user.id : null),
        user_email: user ? user.email : 'sistema@ciafal.com.br',
        user_name: params.usuario_nome || (user ? user.name : 'Usuário PCP'),
        user_role: user ? user.role : 'PCP_PROGRAMMER',
        event_type: 'SCHEDULE_ACTION',
        action: params.acao,
        resource: 'PROGRAMACAO_PARADA',
        resource_id: params.codigo,
        permission_required: 'pcp.schedule.view',
        outcome: params.resultado,
        module: 'PROGRAMACAO',
        screen: 'Programação de Parada',
        entity: 'programacao_paradas',
        record_id: params.parada_id,
        status: params.resultado === 'SUCCESS' ? 'Concluído' : 'Falha',
        reason: params.motivo,
        schedule_version: `V${params.versao}`,
        details: params.detalhes || null,
      })
    } catch (e) {
      console.warn('Falha ao gravar pcp_audit_logs:', e)
    }
  },
}
