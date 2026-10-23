/**
 * Serviço de Gestão de Tipos de Código Modelo SAP
 * Identificados pela combinação: Centro (WERKS) + Centro de Trabalho (ARBPL) + Tipo de Material (MARA-MTART).
 * Permite cadastrar tipos e vincular múltiplos códigos SAP como referências.
 */

import { pb } from '@/lib/pocketbase/client'
import { sapValidationService } from '@/services/sap-validation-service'

export interface SapModelTypeItem {
  id: string
  tipo_codigo_modelo_id: string
  codigo_material: string
  descricao?: string
  centro?: string
  centro_trabalho?: string
  tipo_material?: string
  status: 'Ativo' | 'Inativo' | 'ATIVO' | 'INATIVO'
  data_inclusao?: string
  usuario_responsavel?: string
  created?: string
  updated?: string
}

export interface SapModelType {
  id: string
  tipo_codigo_modelo: string
  descricao?: string
  centro: string
  centro_trabalho: string
  tipo_material: string
  status: 'Ativo' | 'Inativo' | 'ATIVO' | 'INATIVO'
  criado_por?: string
  atualizado_por?: string
  created?: string
  updated?: string
  modelos_vinculados?: SapModelTypeItem[]
  modelos_count?: number
}

export interface CreateSapModelTypeDTO {
  tipo_codigo_modelo: string
  descricao?: string
  centro: string
  centro_trabalho: string
  tipo_material: string
  status?: 'Ativo' | 'Inativo'
  usuario?: string
  codigos_vinculados?: Array<{
    codigo_material: string
    descricao?: string
    centro?: string
    centro_trabalho?: string
    tipo_material?: string
    status?: 'Ativo' | 'Inativo'
  }>
}

export interface UpdateSapModelTypeDTO {
  tipo_codigo_modelo?: string
  descricao?: string
  centro?: string
  centro_trabalho?: string
  tipo_material?: string
  status?: 'Ativo' | 'Inativo'
  usuario?: string
  justificativa?: string
  codigos_vinculados?: Array<{
    id?: string
    codigo_material: string
    descricao?: string
    centro?: string
    centro_trabalho?: string
    tipo_material?: string
    status?: 'Ativo' | 'Inativo'
  }>
}

export interface SapCenterOption {
  code: string
  name: string
  werks: string
  source: 'plants' | 'line_masters' | 'homologacao'
}

export interface SapWorkCenterOption {
  code: string
  name: string
  arbpl: string
  plant_code?: string
  line_code?: string
  source: 'production_lines' | 'line_masters' | 'homologacao'
}

export interface SapMaterialTypeOption {
  code: string
  description: string
  mtart: string
}

// Catálogo técnico oficial MARA-MTART da Engenharia CIAFAL
export const SAP_MATERIAL_TYPES_CATALOG: SapMaterialTypeOption[] = [
  { code: 'FERT', description: 'Produto Acabado (Finished Product)', mtart: 'FERT' },
  { code: 'HALB', description: 'Semiacabado (Semi-Finished)', mtart: 'HALB' },
  { code: 'ROH', description: 'Matéria-Prima (Raw Material)', mtart: 'ROH' },
  { code: 'ZFER', description: 'Produto Acabado Ciafal (Perfis/Tubos)', mtart: 'ZFER' },
  { code: 'ZHAL', description: 'Semiacabado Ciafal (Tarugos/Blocos)', mtart: 'ZHAL' },
  { code: 'ZROH', description: 'Matéria-Prima Ciafal (Sucata/Lingote)', mtart: 'ZROH' },
  { code: 'HIBE', description: 'Materiais Operacionais / Insumos', mtart: 'HIBE' },
  { code: 'VERP', description: 'Material de Embalagem', mtart: 'VERP' },
  { code: 'DIEN', description: 'Serviço / Mão de Obra Externa', mtart: 'DIEN' },
]

export const DUPLICATE_COMBINATION_ERROR_MSG =
  'Já existe um Tipo de Código Modelo Padrão cadastrado para esta combinação.'

class SapModelTypesService {
  /**
   * Lista todos os centros disponíveis no HUB/PCP (plants + line_masters)
   */
  async getCentros(): Promise<SapCenterOption[]> {
    const list: SapCenterOption[] = []
    const seen = new Set<string>()

    try {
      const plants = await pb.collection('plants').getFullList({
        filter: "status = 'ACTIVE' || status = ''",
        sort: 'sap_plant_code,name',
      })
      for (const p of plants) {
        const code = (p.sap_plant_code || p.code || '').trim()
        if (code && !seen.has(code)) {
          seen.add(code)
          list.push({
            code,
            name: `${code} — ${p.name || 'Planta'}`,
            werks: code,
            source: 'plants',
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    try {
      const lines = await pb.collection('line_masters').getFullList({
        sort: 'sap_plant_code',
      })
      for (const l of lines) {
        const code = (l.sap_plant_code || '').trim()
        if (code && !seen.has(code)) {
          seen.add(code)
          list.push({
            code,
            name: `${code} — Centro Operacional (${l.name || l.code})`,
            werks: code,
            source: 'line_masters',
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // Fallback homologado se o banco ainda não possuir plantas populadas
    if (list.length === 0) {
      list.push(
        {
          code: '1001',
          name: '1001 — Planta Divinópolis (Matriz)',
          werks: '1001',
          source: 'homologacao',
        },
        {
          code: '1002',
          name: '1002 — Planta Contagem (Perfis)',
          werks: '1002',
          source: 'homologacao',
        },
        {
          code: '2001',
          name: '2001 — Planta KS - Ferradura',
          werks: '2001',
          source: 'homologacao',
        },
        { code: '3001', name: '3001 — Planta Sidercentro', werks: '3001', source: 'homologacao' },
      )
    }

    return list
  }

  /**
   * Lista centros de trabalho (ARBPL) existentes no HUB/PCP (production_lines e line_masters)
   * Filtrando opcionalmente pelo Centro (WERKS) selecionado quando tecnicamente possível
   */
  async getCentrosTrabalho(selectedCentroWerks?: string): Promise<SapWorkCenterOption[]> {
    const list: SapWorkCenterOption[] = []
    const seen = new Set<string>()

    try {
      const prodLines = await pb.collection('production_lines').getFullList({
        sort: 'sap_work_center,name',
      })

      for (const line of prodLines) {
        const arbpl = (line.sap_work_center || line.code || '').trim()
        if (!arbpl) continue

        // Se houver filtro de centro e a linha tiver plant_id / vínculo
        let plantCode: string | undefined = undefined
        if (line.plant_id) {
          // pode ser ID ou já código
          plantCode = line.plant_id
        }

        if (!seen.has(arbpl)) {
          seen.add(arbpl)
          list.push({
            code: arbpl,
            name: `${arbpl} — ${line.name || 'Linha de Produção'}`,
            arbpl,
            plant_code: plantCode,
            line_code: line.code,
            source: 'production_lines',
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    try {
      const masters = await pb.collection('line_masters').getFullList({
        sort: 'code',
      })

      for (const lm of masters) {
        const arbpl = (lm.sap_plant_code || lm.code || '').trim()
        if (arbpl && !seen.has(arbpl)) {
          seen.add(arbpl)
          list.push({
            code: arbpl,
            name: `${arbpl} — Posto ${lm.name || lm.code}`,
            arbpl,
            plant_code: lm.sap_plant_code,
            line_code: lm.code,
            source: 'line_masters',
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // Fallback de homologação caso vazio
    if (list.length === 0) {
      list.push(
        {
          code: 'WC-DIV-L1',
          name: 'WC-DIV-L1 — Laminação Tubos 1 (Divinópolis)',
          arbpl: 'WC-DIV-L1',
          source: 'homologacao',
        },
        {
          code: 'LAML2',
          name: 'LAML2 — Laminação Perfis Pesados 2 (Contagem)',
          arbpl: 'LAML2',
          source: 'homologacao',
        },
        {
          code: 'ACABL2',
          name: 'ACABL2 — Acabamento & Embalagem L2',
          arbpl: 'ACABL2',
          source: 'homologacao',
        },
        {
          code: 'ENDL1',
          name: 'ENDL1 — Endireitadeira de Precisão L1',
          arbpl: 'ENDL1',
          source: 'homologacao',
        },
        {
          code: 'FORNO1',
          name: 'FORNO1 — Forno de Reaquecimento L1',
          arbpl: 'FORNO1',
          source: 'homologacao',
        },
        {
          code: 'SEML1',
          name: 'SEML1 — Setor de Semiacabados L1',
          arbpl: 'SEML1',
          source: 'homologacao',
        },
      )
    }

    // Se o usuário selecionou um centro WERKS específico, tentamos filtrar de forma inteligente
    if (selectedCentroWerks) {
      const wClean = selectedCentroWerks.trim().toUpperCase()
      const filtered = list.filter((wc) => {
        if (!wc.plant_code) return true
        return (
          wc.plant_code.toUpperCase().includes(wClean) ||
          wClean.includes(wc.plant_code.toUpperCase()) ||
          wc.code.toUpperCase().includes(wClean)
        )
      })
      if (filtered.length > 0) return filtered
    }

    return list
  }

  /**
   * Catálogo de Tipos de Material (MARA-MTART)
   */
  getTiposMaterial(): SapMaterialTypeOption[] {
    return SAP_MATERIAL_TYPES_CATALOG
  }

  /**
   * Lista todos os tipos de código modelo cadastrados, com seus respectivos códigos vinculados
   */
  async listModelTypes(): Promise<SapModelType[]> {
    try {
      const records = await pb.collection('sap_model_types').getFullList({
        sort: '-created',
      })

      // Busca todos os itens vinculados em paralelo
      let items: SapModelTypeItem[] = []
      try {
        items = (await pb.collection('sap_model_type_items').getFullList({
          sort: 'codigo_material',
        })) as unknown as SapModelTypeItem[]
      } catch {
        /* intentionally ignored */
      }

      const itemsByParent = new Map<string, SapModelTypeItem[]>()
      for (const it of items) {
        const parentId = it.tipo_codigo_modelo_id
        if (!itemsByParent.has(parentId)) {
          itemsByParent.set(parentId, [])
        }
        itemsByParent.get(parentId)!.push(it)
      }

      return records.map((r: any) => {
        const vinculados = itemsByParent.get(r.id) || []
        return {
          id: r.id,
          tipo_codigo_modelo: r.tipo_codigo_modelo,
          descricao: r.descricao || '',
          centro: r.centro,
          centro_trabalho: r.centro_trabalho,
          tipo_material: r.tipo_material,
          status: (r.status as 'Ativo' | 'Inativo') || 'Ativo',
          criado_por: r.criado_por || '',
          atualizado_por: r.atualizado_por || '',
          created: r.created,
          updated: r.updated,
          modelos_vinculados: vinculados,
          modelos_count: vinculados.length,
        }
      })
    } catch (err) {
      console.warn('[sapModelTypesService.listModelTypes] Erro ao listar do PocketBase:', err)
      return []
    }
  }

  /**
   * Busca um tipo de código modelo por ID
   */
  async getModelTypeById(id: string): Promise<SapModelType | null> {
    try {
      const r = await pb.collection('sap_model_types').getOne(id)
      const items = (await pb.collection('sap_model_type_items').getFullList({
        filter: `tipo_codigo_modelo_id = '${id}'`,
        sort: 'codigo_material',
      })) as unknown as SapModelTypeItem[]

      return {
        id: r.id,
        tipo_codigo_modelo: r.tipo_codigo_modelo,
        descricao: r.descricao || '',
        centro: r.centro,
        centro_trabalho: r.centro_trabalho,
        tipo_material: r.tipo_material,
        status: (r.status as 'Ativo' | 'Inativo') || 'Ativo',
        criado_por: r.criado_por || '',
        atualizado_por: r.atualizado_por || '',
        created: r.created,
        updated: r.updated,
        modelos_vinculados: items,
        modelos_count: items.length,
      }
    } catch (_) {
      return null
    }
  }

  /**
   * Verifica se já existe um Tipo de Código Modelo ATIVO com a mesma combinação:
   * Centro (WERKS) + Centro de Trabalho (ARBPL) + Tipo de Material (MARA-MTART).
   * Retorna o registro existente caso haja duplicidade.
   */
  async checkDuplicateActive(
    centro: string,
    centroTrabalho: string,
    tipoMaterial: string,
    excludeId?: string,
  ): Promise<SapModelType | null> {
    try {
      const c = centro.trim()
      const ct = centroTrabalho.trim()
      const tm = tipoMaterial.trim()

      let filter = `centro = '${c}' && centro_trabalho = '${ct}' && tipo_material = '${tm}' && (status = 'Ativo' || status = 'ATIVO')`
      if (excludeId) {
        filter = `id != '${excludeId}' && ${filter}`
      }

      const found = await pb.collection('sap_model_types').getFullList({
        filter,
        limit: 1,
      })

      if (found && found.length > 0) {
        const r = found[0]
        return {
          id: r.id,
          tipo_codigo_modelo: r.tipo_codigo_modelo,
          descricao: r.descricao || '',
          centro: r.centro,
          centro_trabalho: r.centro_trabalho,
          tipo_material: r.tipo_material,
          status: r.status,
          created: r.created,
          updated: r.updated,
        }
      }
      return null
    } catch (_) {
      return null
    }
  }

  /**
   * Cria um novo Tipo de Código Modelo com seus códigos vinculados e registra auditoria imutável
   */
  async createModelType(dto: CreateSapModelTypeDTO): Promise<SapModelType> {
    const centro = dto.centro.trim()
    const centroTrabalho = dto.centro_trabalho.trim()
    const tipoMaterial = dto.tipo_material.trim()
    const status = dto.status || 'Ativo'
    const usuario =
      dto.usuario || pb.authStore.model?.name || pb.authStore.model?.email || 'PCP Engenharia'

    // 1. Validação de Duplicidade ATIVA antes de persistir
    if (status.toLowerCase() === 'ativo') {
      const existing = await this.checkDuplicateActive(centro, centroTrabalho, tipoMaterial)
      if (existing) {
        const err = new Error(DUPLICATE_COMBINATION_ERROR_MSG) as any
        err.existingId = existing.id
        err.existingRecord = existing
        throw err
      }
    }

    // 2. Persistir no PocketBase
    const createdRecord = await pb.collection('sap_model_types').create({
      tipo_codigo_modelo: dto.tipo_codigo_modelo.trim(),
      descricao: dto.descricao?.trim() || '',
      centro,
      centro_trabalho: centroTrabalho,
      tipo_material: tipoMaterial,
      status,
      criado_por: usuario,
      atualizado_por: usuario,
    })

    // 3. Persistir Códigos Vinculados
    const createdItems: SapModelTypeItem[] = []
    if (dto.codigos_vinculados && dto.codigos_vinculados.length > 0) {
      for (const item of dto.codigos_vinculados) {
        const matnr = item.codigo_material.trim()
        if (!matnr) continue

        const itemRec = await pb.collection('sap_model_type_items').create({
          tipo_codigo_modelo_id: createdRecord.id,
          codigo_material: matnr,
          descricao: item.descricao?.trim() || '',
          centro: item.centro || centro,
          centro_trabalho: item.centro_trabalho || centroTrabalho,
          tipo_material: item.tipo_material || tipoMaterial,
          status: item.status || 'Ativo',
          data_inclusao: new Date().toISOString(),
          usuario_responsavel: usuario,
        })
        createdItems.push(itemRec as unknown as SapModelTypeItem)
      }
    }

    // 4. Registrar na Trilha de Auditoria e Governança Imutável existente
    await this.registrarAuditoria({
      acao: 'CRIACAO_TIPO_CODIGO_MODELO',
      tipo_codigo_modelo_id: createdRecord.id,
      tipo_codigo_modelo: dto.tipo_codigo_modelo,
      centro,
      centro_trabalho: centroTrabalho,
      tipo_material: tipoMaterial,
      usuario,
      codigos: createdItems.map((c) => c.codigo_material),
      valores_novos: {
        tipo_codigo_modelo: dto.tipo_codigo_modelo,
        descricao: dto.descricao,
        centro,
        centro_trabalho: centroTrabalho,
        tipo_material: tipoMaterial,
        status,
        codigos: createdItems.map((c) => c.codigo_material),
        codigos_vinculados: createdItems.map((c) => ({
          codigo_material: c.codigo_material,
          descricao: c.descricao,
          status: c.status,
        })),
        resultado: 'SUCESSO',
      },
    })

    return {
      id: createdRecord.id,
      tipo_codigo_modelo: createdRecord.tipo_codigo_modelo,
      descricao: createdRecord.descricao,
      centro: createdRecord.centro,
      centro_trabalho: createdRecord.centro_trabalho,
      tipo_material: createdRecord.tipo_material,
      status: createdRecord.status,
      criado_por: createdRecord.criado_por,
      atualizado_por: createdRecord.atualizado_por,
      created: createdRecord.created,
      updated: createdRecord.updated,
      modelos_vinculados: createdItems,
      modelos_count: createdItems.length,
    }
  }

  /**
   * Atualiza um Tipo de Código Modelo existente, gerenciando códigos vinculados e gerando auditoria
   */
  async updateModelType(id: string, dto: UpdateSapModelTypeDTO): Promise<SapModelType> {
    const current = await this.getModelTypeById(id)
    if (!current) throw new Error('Tipo de Código Modelo não encontrado.')

    const centro = (dto.centro || current.centro).trim()
    const centroTrabalho = (dto.centro_trabalho || current.centro_trabalho).trim()
    const tipoMaterial = (dto.tipo_material || current.tipo_material).trim()
    const status = dto.status || current.status
    const usuario =
      dto.usuario || pb.authStore.model?.name || pb.authStore.model?.email || 'PCP Engenharia'

    // Validação de Duplicidade ATIVA se status for Ativo
    if (status.toLowerCase() === 'ativo') {
      const existing = await this.checkDuplicateActive(centro, centroTrabalho, tipoMaterial, id)
      if (existing) {
        const err = new Error(DUPLICATE_COMBINATION_ERROR_MSG) as any
        err.existingId = existing.id
        err.existingRecord = existing
        throw err
      }
    }

    const payload: any = {
      atualizado_por: usuario,
    }
    if (dto.tipo_codigo_modelo !== undefined)
      payload.tipo_codigo_modelo = dto.tipo_codigo_modelo.trim()
    if (dto.descricao !== undefined) payload.descricao = dto.descricao.trim()
    if (dto.centro !== undefined) payload.centro = centro
    if (dto.centro_trabalho !== undefined) payload.centro_trabalho = centroTrabalho
    if (dto.tipo_material !== undefined) payload.tipo_material = tipoMaterial
    if (dto.status !== undefined) payload.status = status

    const updatedRec = await pb.collection('sap_model_types').update(id, payload)

    // Atualização de códigos vinculados se fornecidos
    let updatedItems: SapModelTypeItem[] = current.modelos_vinculados || []
    if (dto.codigos_vinculados) {
      // Deleta itens antigos do parent
      try {
        const oldItems = await pb.collection('sap_model_type_items').getFullList({
          filter: `tipo_codigo_modelo_id = '${id}'`,
        })
        for (const oldIt of oldItems) {
          await pb.collection('sap_model_type_items').delete(oldIt.id)
        }
      } catch {
        /* intentionally ignored */
      }

      // Insere novos
      updatedItems = []
      for (const item of dto.codigos_vinculados) {
        const matnr = item.codigo_material.trim()
        if (!matnr) continue

        const itemRec = await pb.collection('sap_model_type_items').create({
          tipo_codigo_modelo_id: id,
          codigo_material: matnr,
          descricao: item.descricao?.trim() || '',
          centro: item.centro || centro,
          centro_trabalho: item.centro_trabalho || centroTrabalho,
          tipo_material: item.tipo_material || tipoMaterial,
          status: item.status || 'Ativo',
          data_inclusao: new Date().toISOString(),
          usuario_responsavel: usuario,
        })
        updatedItems.push(itemRec as unknown as SapModelTypeItem)
      }
    }

    // Registrar auditoria
    await this.registrarAuditoria({
      acao: 'EDICAO_TIPO_CODIGO_MODELO',
      tipo_codigo_modelo_id: id,
      tipo_codigo_modelo: updatedRec.tipo_codigo_modelo,
      centro,
      centro_trabalho: centroTrabalho,
      tipo_material: tipoMaterial,
      usuario,
      justificativa: dto.justificativa,
      valores_anteriores: {
        tipo_codigo_modelo: current.tipo_codigo_modelo,
        descricao: current.descricao,
        centro: current.centro,
        centro_trabalho: current.centro_trabalho,
        tipo_material: current.tipo_material,
        status: current.status,
        codigos_vinculados: (current.modelos_vinculados || []).map((c) => ({
          codigo_material: c.codigo_material,
          descricao: c.descricao,
        })),
      },
      valores_novos: {
        tipo_codigo_modelo: updatedRec.tipo_codigo_modelo,
        descricao: updatedRec.descricao,
        centro,
        centro_trabalho: centroTrabalho,
        tipo_material: tipoMaterial,
        status,
        codigos_vinculados: updatedItems.map((c) => ({
          codigo_material: c.codigo_material,
          descricao: c.descricao,
        })),
      },
    })

    return {
      id: updatedRec.id,
      tipo_codigo_modelo: updatedRec.tipo_codigo_modelo,
      descricao: updatedRec.descricao,
      centro: updatedRec.centro,
      centro_trabalho: updatedRec.centro_trabalho,
      tipo_material: updatedRec.tipo_material,
      status: updatedRec.status,
      criado_por: updatedRec.criado_por,
      atualizado_por: updatedRec.atualizado_por,
      created: updatedRec.created,
      updated: updatedRec.updated,
      modelos_vinculados: updatedItems,
      modelos_count: updatedItems.length,
    }
  }

  /**
   * Alterna status Ativo/Inativo (preserva o registro sem exclusão física)
   */
  async toggleStatus(
    id: string,
    justificativa?: string,
    usuarioNome?: string,
  ): Promise<SapModelType> {
    const current = await this.getModelTypeById(id)
    if (!current) throw new Error('Tipo de Código Modelo não encontrado.')

    const novoStatus = current.status === 'Ativo' ? 'Inativo' : 'Ativo'
    const usuario =
      usuarioNome || pb.authStore.model?.name || pb.authStore.model?.email || 'PCP Engenharia'

    // Se estiver reativando, verificar duplicidade ativa com outro registro
    if (novoStatus === 'Ativo') {
      const existing = await this.checkDuplicateActive(
        current.centro,
        current.centro_trabalho,
        current.tipo_material,
        id,
      )
      if (existing) {
        const err = new Error(DUPLICATE_COMBINATION_ERROR_MSG) as any
        err.existingId = existing.id
        err.existingRecord = existing
        throw err
      }
    }

    const updatedRec = await pb.collection('sap_model_types').update(id, {
      status: novoStatus,
      atualizado_por: usuario,
    })

    // Registrar auditoria
    await this.registrarAuditoria({
      acao:
        novoStatus === 'Ativo' ? 'ATIVACAO_TIPO_CODIGO_MODELO' : 'INATIVACAO_TIPO_CODIGO_MODELO',
      tipo_codigo_modelo_id: id,
      tipo_codigo_modelo: current.tipo_codigo_modelo,
      centro: current.centro,
      centro_trabalho: current.centro_trabalho,
      tipo_material: current.tipo_material,
      usuario,
      justificativa: justificativa || `Alteração lógica de status para ${novoStatus}`,
      valores_anteriores: { status: current.status },
      valores_novos: { status: novoStatus },
    })

    return {
      ...current,
      status: novoStatus,
      updated: updatedRec.updated,
      atualizado_por: usuario,
    }
  }

  /**
   * REGRA DE PREPARAÇÃO FUTURA PARA A ABA NOVA VALIDAÇÃO:
   * Localiza o Tipo de Código Modelo de referência compatível com a chave:
   * Centro (WERKS) + Centro de Trabalho (ARBPL) + Tipo de Material (MARA-MTART).
   * Apenas registros com status "Ativo" são utilizados como referência.
   * Quando não houver modelo configurado, retorna matched: false com mensagem oficial.
   */
  async findReferenceModelByCombination(
    centro: string,
    centroTrabalho: string,
    tipoMaterial: string,
  ): Promise<{
    matched: boolean
    tipo_codigo_modelo?: SapModelType
    codigos_referencia?: string[]
    message?: string
    chave_consultada: {
      centro: string
      centro_trabalho: string
      tipo_material: string
    }
  }> {
    const c = (centro || '').trim()
    const ct = (centroTrabalho || '').trim()
    const tm = (tipoMaterial || '').trim()

    const chave = { centro: c, centro_trabalho: ct, tipo_material: tm }

    if (!c || !ct || !tm) {
      return {
        matched: false,
        message: 'Campos-chave incompletos para localização de modelo de referência.',
        chave_consultada: chave,
      }
    }

    try {
      const records = await pb.collection('sap_model_types').getFullList({
        filter: `centro = '${c}' && centro_trabalho = '${ct}' && tipo_material = '${tm}' && (status = 'Ativo' || status = 'ATIVO')`,
        sort: '-created',
        limit: 1,
      })

      if (!records || records.length === 0) {
        return {
          matched: false,
          message: 'Nenhum Código Modelo Padrão foi configurado para esta combinação.',
          chave_consultada: chave,
        }
      }

      const found = records[0]
      const items = (await pb.collection('sap_model_type_items').getFullList({
        filter: `tipo_codigo_modelo_id = '${found.id}' && (status = 'Ativo' || status = 'ATIVO')`,
        sort: 'codigo_material',
      })) as unknown as SapModelTypeItem[]

      const modelType: SapModelType = {
        id: found.id,
        tipo_codigo_modelo: found.tipo_codigo_modelo,
        descricao: found.descricao || '',
        centro: found.centro,
        centro_trabalho: found.centro_trabalho,
        tipo_material: found.tipo_material,
        status: 'Ativo',
        created: found.created,
        updated: found.updated,
        modelos_vinculados: items,
        modelos_count: items.length,
      }

      return {
        matched: true,
        tipo_codigo_modelo: modelType,
        codigos_referencia: items.map((i) => i.codigo_material),
        chave_consultada: chave,
      }
    } catch (err) {
      return {
        matched: false,
        message: 'Nenhum Código Modelo Padrão foi configurado para esta combinação.',
        chave_consultada: chave,
      }
    }
  }

  /**
   * Grava na Trilha de Auditoria e Governança Imutável existente (sap_validation_audit_logs e pcp_audit_logs)
   */
  private async registrarAuditoria(params: {
    acao: string
    tipo_codigo_modelo_id: string
    tipo_codigo_modelo: string
    centro: string
    centro_trabalho: string
    tipo_material: string
    codigo_afetado?: string
    codigos?: string[]
    usuario: string
    justificativa?: string
    valores_anteriores?: any
    valores_novos?: any
  }): Promise<void> {
    const timestamp = new Date().toISOString()

    // 1. Gravar em sap_validation_audit_logs (coleção do módulo de Validação SAP)
    try {
      await sapValidationService.createAuditLog({
        material_code: params.codigo_afetado || `TIPO-${params.tipo_codigo_modelo}`,
        validation_id: params.tipo_codigo_modelo_id,
        validation_code: `VAL-MOD-${params.tipo_codigo_modelo}`,
        user_name: params.usuario,
        user_email: `${params.usuario.toLowerCase().replace(/\s+/g, '.')}@ciafal.com.br`,
        action: 'APROVACAO',
        sap_source: 'SISTEMA_VALIDACAO_SAP',
        justification:
          params.justificativa ||
          `Governança de Tipos de Modelo SAP (${params.acao}): ${params.tipo_codigo_modelo}`,
        rule_result: JSON.stringify({
          acao: params.acao,
          tipo_codigo_modelo_id: params.tipo_codigo_modelo_id,
          tipo_codigo_modelo: params.tipo_codigo_modelo,
          centro_werks: params.centro,
          centro_trabalho_arbpl: params.centro_trabalho,
          tipo_material_mtart: params.tipo_material,
          valores_anteriores: params.valores_anteriores,
          valores_novos: params.valores_novos,
          timestamp,
        }),
      })
    } catch (err) {
      console.warn('[sapModelTypesService] Log sap_validation_audit_logs falhou:', err)
    }

    // 2. Gravar em pcp_audit_logs (auditoria corporativa CIAFAL)
    try {
      const now = new Date()
      const yyyy = String(now.getFullYear())
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase()
      const autoEventId = `AUD-SAP-MODEL-${yyyy}${mm}${dd}-${randomHex}`

      await pb.collection('pcp_audit_logs').create({
        event_id: autoEventId,
        user_name: params.usuario,
        user_email: `${params.usuario.toLowerCase().replace(/\s+/g, '.')}@ciafal.com.br`,
        user_role: 'PCP_PROGRAMMER',
        event_type: 'SAP_VALIDATION_MODEL_TYPE',
        action: params.acao,
        resource: 'sap_model_types',
        resource_id: params.tipo_codigo_modelo_id,
        scope: params.centro,
        outcome: 'SUCCESS',
        status: 'Concluída',
        module: 'Cadastros',
        screen: 'Códigos Modelos Padrão',
        entity: 'sap_model_types',
        record_id: params.tipo_codigo_modelo_id,
        reason:
          params.justificativa ||
          `Governança de Tipos de Modelo SAP - ${params.tipo_codigo_modelo}`,
        company: 'CIAFAL',
        center: params.centro,
        source: 'SISTEMA_VALIDACAO_SAP',
        details: {
          tipo_codigo_modelo: params.tipo_codigo_modelo,
          centro: params.centro,
          centro_trabalho: params.centro_trabalho,
          tipo_material: params.tipo_material,
          codigo_afetado: params.codigo_afetado,
          codigos: params.codigos || [],
          resultado: 'SUCESSO',
          valores_anteriores: params.valores_anteriores,
          valores_novos: params.valores_novos,
          timestamp,
        },
      })
    } catch (err) {
      console.warn('[sapModelTypesService] Log pcp_audit_logs falhou:', err)
    }
  }

  /**
   * Consulta o histórico de auditoria específico de um tipo de modelo
   */
  async getAuditHistory(tipoCodigoModeloId: string): Promise<any[]> {
    try {
      const logs = await pb.collection('pcp_audit_logs').getFullList({
        filter: `resource = 'sap_model_types' && resource_id = '${tipoCodigoModeloId}'`,
        sort: '-created',
      })
      return logs
    } catch (_) {
      return []
    }
  }
}

export const sapModelTypesService = new SapModelTypesService()
