import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  AlertCircle,
  RefreshCw,
  Plus,
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Boxes,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { pb } from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  ChecklistAtividadeModelo,
  ChecklistFechamentoExecucao,
  ChecklistFechamentoItem,
  ChecklistItemStatus,
  PrazoFechamentoInfo,
} from '@/types/checklist-fechamento'
import {
  checklistFechamentoService,
  avaliarStatusPrazo,
} from '@/services/checklist-fechamento-service'
import { useSearchParams } from 'react-router-dom'
import {
  ChecklistFechamentoHeader,
  ChecklistFiltrosAvancados,
  EmpresaOpcaoItem,
  LinhaOpcaoItem,
  CentroOpcaoItem,
} from '@/components/production-control/ChecklistFechamentoHeader'
import {
  sapParametersMasterDataService,
  SapCompanyOption,
} from '@/services/sap-parameters-master-data-service'
import { sapWerksService } from '@/services/sap-werks-service'
import { lineMasterService } from '@/services/line-master'
import { ProductionLine } from '@/types/line-master'
import { datePtBrToIso } from '@/lib/formatters-ptbr'
import { ChecklistFechamentoLista } from '@/components/production-control/ChecklistFechamentoLista'
import { ChecklistItemDetailModal } from '@/components/production-control/ChecklistItemDetailModal'
import { AjusteOperacionalModal } from '@/components/production-control/AjusteOperacionalModal'
import { AjusteOperacional } from '@/types/ajuste-operacional'
import { ajusteOperacionalService } from '@/services/ajuste-operacional-service'
import { SolicitarInventarioModal } from '@/components/production-control/SolicitarInventarioModal'
import { RastrearDivergenciaModal } from '@/components/production-control/RastrearDivergenciaModal'
import { AtividadeMestreModal } from '@/components/production-control/AtividadeMestreModal'
import { RelatorioPendenciasModal } from '@/components/production-control/RelatorioPendenciasModal'
import { FormularioFinalFechamentoModal } from '@/components/production-control/FormularioFinalFechamentoModal'
import { EnviarFechamentoModal } from '@/components/production-control/EnviarFechamentoModal'
import { AnaliseFechamentoIaModal } from '@/components/production-control/AnaliseFechamentoIaModal'
import { GestaoDestinatariosModal } from '@/components/production-control/GestaoDestinatariosModal'
import { fechamentoAiService } from '@/services/fechamento-ai-service'
import { fechamentoEnvioService } from '@/services/fechamento-envio-service'
import {
  FechamentoAnaliseIaResultado,
  FechamentoComunicacao,
  DestinatarioGrupo,
} from '@/types/checklist-fechamento'
import { authService } from '@/services/pcp-auth'

export const ChecklistFechamentoPage: React.FC = () => {
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [competencias, setCompetencias] = useState<string[]>([])
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>('09/2026')
  const [execucao, setExecucao] = useState<ChecklistFechamentoExecucao | null>(null)
  const [itens, setItens] = useState<ChecklistFechamentoItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [filtroStatusRapido, setFiltroStatusRapido] = useState<string>('TODOS')

  // Filtros Avançados em Cascata (Etapa 2: Empresa -> Linha -> Centro, Ano, Mês, Datas)
  const [filtros, setFiltros] = useState<ChecklistFiltrosAvancados>({
    empresa: 'TODAS',
    linha: 'TODAS',
    centro: 'TODOS',
    ano: 'TODOS',
    mes: 'TODOS',
    dataInicio: '',
    dataFim: '',
  })

  // Mapa de Ajustes Operacionais por item do check-list
  const [ajustesPorItem, setAjustesPorItem] = useState<Record<string, AjusteOperacional[]>>({})

  // Modais
  const [selectedItem, setSelectedItem] = useState<ChecklistFechamentoItem | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false)
  const [inventarioModalOpen, setInventarioModalOpen] = useState(false)
  const [divergenciaModalOpen, setDivergenciaModalOpen] = useState(false)
  const [mestreModalOpen, setMestreModalOpen] = useState(false)
  const [selectedModelo, setSelectedModelo] = useState<ChecklistAtividadeModelo | null>(null)
  const [relatorioModalOpen, setRelatorioModalOpen] = useState(false)

  // Modais da Etapa 2
  const [formularioModalOpen, setFormularioModalOpen] = useState(false)
  const [enviarModalOpen, setEnviarModalOpen] = useState(false)
  const [grupoEnvioModal, setGrupoEnvioModal] = useState<DestinatarioGrupo>('Contabilidade')
  const [analiseIaModalOpen, setAnaliseIaModalOpen] = useState(false)
  const [destinatariosModalOpen, setDestinatariosModalOpen] = useState(false)

  // Estados de IA e Comunicação
  const [analiseIa, setAnaliseIa] = useState<FechamentoAnaliseIaResultado | null>(null)
  const [carregandoIa, setCarregandoIa] = useState(false)
  const [comunicacoes, setComunicacoes] = useState<FechamentoComunicacao[]>([])
  const [podeAdministrar, setPodeAdministrar] = useState(true)

  // Catálogos Mestres para os Filtros Estruturados (Empresa WERKS, Linhas de production_lines, Centros)
  const [companiesCatalog, setCompaniesCatalog] = useState<EmpresaOpcaoItem[]>([])
  const [allProductionLines, setAllProductionLines] = useState<ProductionLine[]>([])
  const [centersForSelectedLine, setCentersForSelectedLine] = useState<CentroOpcaoItem[]>([])
  const [loadingCenters, setLoadingCenters] = useState(false)

  // Permissões
  const [canEdit, setCanEdit] = useState(true)

  useEffect(() => {
    verificarPermissoes()
    carregarCatalogosFiltros()
    carregarInicial()
  }, [])

  // Carrega catálogo oficial de Empresas (WERKS) e Linhas de produção
  const carregarCatalogosFiltros = async () => {
    try {
      const resCompanies = await sapParametersMasterDataService.fetchCompanies().catch(() => null)
      let companyList: EmpresaOpcaoItem[] = []

      if (resCompanies && resCompanies.success && resCompanies.data.length > 0) {
        companyList = resCompanies.data.map((c: SapCompanyOption) => ({
          werks: c.werks,
          name: c.name,
          label: `${c.werks} — ${c.name || 'Empresa'}`,
        }))
      } else {
        const fallbackWerks = await sapWerksService.getWerksList().catch(() => ({ items: [] }))
        companyList = fallbackWerks.items.map((w) => ({
          werks: w.werks,
          name: w.description,
          label: `${w.werks} — ${w.description || 'Empresa'}`,
        }))
      }

      if (companyList.length > 0) {
        setCompaniesCatalog(companyList)
      } else {
        setCompaniesCatalog([
          { werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' },
        ])
      }
    } catch (err) {
      console.warn('[ChecklistFechamentoPage] Falha ao carregar catálogo de empresas:', err)
      setCompaniesCatalog([{ werks: '1000', name: 'CIAFAL Matriz', label: '1000 — CIAFAL Matriz' }])
    }

    try {
      const linesData = await lineMasterService.listLines({ activeOnly: true })
      setAllProductionLines(linesData || [])
    } catch (err) {
      console.warn('[ChecklistFechamentoPage] Falha ao carregar linhas de produção:', err)
      setAllProductionLines([])
    }
  }

  // Carrega centros vinculados quando a linha selecionada mudar
  useEffect(() => {
    let isMounted = true

    const carregarCentrosDaLinha = async () => {
      if (!filtros.linha || filtros.linha === 'TODAS') {
        setCentersForSelectedLine([])
        return
      }

      setLoadingCenters(true)
      try {
        const foundLine = allProductionLines.find(
          (l) => l.id === filtros.linha || l.code === filtros.linha,
        )
        const lineRealId = foundLine?.id || filtros.linha
        const lineRealCode = foundLine?.code || filtros.linha

        const derivedOptions: CentroOpcaoItem[] = []
        const seenCodes = new Set<string>()

        // 1. Centro cadastrado na linha (sap_work_center)
        if (foundLine && foundLine.sap_work_center && foundLine.sap_work_center.trim()) {
          const swc = foundLine.sap_work_center.trim()
          seenCodes.add(swc)
          derivedOptions.push({
            code: swc,
            name: foundLine.name || swc,
            label: `${swc} — ${foundLine.name || 'Centro da Linha'}`,
            lineCode: lineRealCode,
          })
        }

        // 2. Centros em line_masters
        try {
          const lineMasters = await pb.collection('line_masters').getFullList({
            filter: `line_id = '${lineRealId}' || code = '${lineRealCode}'`,
            sort: '-version',
          })
          for (const lm of lineMasters) {
            const sapCode = ((lm as any).sap_plant_code || lm.code || '').trim()
            if (sapCode && !seenCodes.has(sapCode)) {
              seenCodes.add(sapCode)
              derivedOptions.push({
                id: lm.id,
                code: sapCode,
                name: lm.name || sapCode,
                label: `${sapCode} — ${lm.name || 'Ficha Mestra'}`,
                lineCode: lineRealCode,
              })
            }
          }
        } catch {
          /* intentionally ignored */
        }

        // 3. Centros em work_centers
        try {
          const workCenters = await pb.collection('work_centers').getFullList({
            filter: `line_id = '${lineRealId}'`,
            sort: 'code',
          })
          for (const wc of workCenters) {
            const wcCode = (wc.code || (wc as any).sap_work_center_code || '').trim()
            if (wcCode && !seenCodes.has(wcCode)) {
              seenCodes.add(wcCode)
              derivedOptions.push({
                id: wc.id,
                code: wcCode,
                name: wc.name || wcCode,
                label: `${wcCode} — ${wc.name || 'Centro de Trabalho'}`,
                lineCode: lineRealCode,
              })
            }
          }
        } catch {
          /* intentionally ignored */
        }

        // 4. Centros existentes nos itens do check-list daquela linha
        itens.forEach((it) => {
          const matchLinha =
            it.line_id === lineRealId ||
            it.line_code === lineRealCode ||
            it.linha_centro_relacionado?.includes(lineRealCode)
          const cCode = it.center_code || ''
          if (matchLinha && cCode && !seenCodes.has(cCode)) {
            seenCodes.add(cCode)
            derivedOptions.push({
              id: it.center_id,
              code: cCode,
              name: it.center_name || cCode,
              label: `${cCode} — ${it.center_name || 'Centro Operacional'}`,
              lineCode: lineRealCode,
            })
          }
        })

        if (isMounted) {
          setCentersForSelectedLine(derivedOptions)
        }
      } catch (err) {
        console.warn('[ChecklistFechamentoPage] Erro ao carregar centros:', err)
        if (isMounted) setCentersForSelectedLine([])
      } finally {
        if (isMounted) setLoadingCenters(false)
      }
    }

    carregarCentrosDaLinha()

    return () => {
      isMounted = false
    }
  }, [filtros.linha, allProductionLines, itens])

  const verificarPermissoes = async () => {
    try {
      const perms = await authService.resolvePermissions()
      const role = perms.user.role?.toUpperCase() || ''
      const isViewer = role === 'EXECUTIVE_VIEWER' || role === 'OPERATOR'
      setCanEdit(!isViewer)
      setPodeAdministrar(
        role.includes('ADMIN') || role.includes('GERENTE') || role.includes('MANAGER'),
      )
    } catch (_) {
      setCanEdit(true)
      setPodeAdministrar(true)
    }
  }

  const carregarInicial = async () => {
    setLoading(true)
    try {
      // Ler parâmetros da URL (Link vindo do Meu Dia ou notificação)
      const paramComp = searchParams.get('competencia')
      const paramItemId = searchParams.get('item_id')
      const paramAjusteId = searchParams.get('ajuste_id')

      const comps = await checklistFechamentoService.listarCompetencias()
      let compAtiva = paramComp || competenciaSelecionada
      if (comps.length > 0) {
        setCompetencias(comps)
        if (!comps.includes(compAtiva) && !paramComp) {
          compAtiva = comps[0]
        }
      } else {
        const padrão = ['09/2026', '08/2026', '10/2026']
        setCompetencias(padrão)
      }
      setCompetenciaSelecionada(compAtiva)

      const itensCarregados = await carregarCompetencia(compAtiva)

      // Se houver item_id na query param (ex: link do Meu Dia), abrir o detalhe automaticamente
      if (paramItemId && itensCarregados && itensCarregados.length > 0) {
        const itemAlvo = itensCarregados.find(
          (it) => it.id === paramItemId || it.codigo === paramItemId,
        )
        if (itemAlvo) {
          setSelectedItem(itemAlvo)
          setDetailModalOpen(true)
          toast({
            title: 'Navegação direta do Meu Dia',
            description: `Atividade [${itemAlvo.codigo}] ${itemAlvo.titulo} aberta com sucesso.`,
          })
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const carregarCompetencia = async (comp: string) => {
    try {
      const res = await checklistFechamentoService.obterOuGerarExecucao(comp)
      setExecucao(res.execucao)
      setItens(res.itens)

      // Carregar comunicações da competência
      if (res.execucao?.id) {
        const comms = await fechamentoEnvioService.listarComunicacoes(res.execucao.id)
        setComunicacoes(comms)
      }

      // Carregar ajustes operacionais da competência e indexar por item
      await carregarAjustesOperacionais(comp)

      return res.itens
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar competência',
        description: err.message || 'Falha ao recuperar dados do check-list.',
        variant: 'destructive',
      })
      return []
    }
  }

  const carregarAjustesOperacionais = async (comp: string) => {
    try {
      const ajustes = await pb.collection('ajustes_operacionais').getFullList<AjusteOperacional>({
        filter: `competencia = '${comp}' && excluido != true`,
      })

      const map: Record<string, AjusteOperacional[]> = {}
      ajustes.forEach((a) => {
        if (!map[a.checklist_item_id]) {
          map[a.checklist_item_id] = []
        }
        map[a.checklist_item_id].push(a)
      })
      setAjustesPorItem(map)
    } catch {
      setAjustesPorItem({})
    }
  }

  const handleSelectCompetencia = async (comp: string) => {
    setCompetenciaSelecionada(comp)
    setLoading(true)
    try {
      await carregarCompetencia(comp)
    } finally {
      setLoading(false)
    }
  }

  const handleGerarCompetencia = async () => {
    setIsGenerating(true)
    try {
      await carregarCompetencia(competenciaSelecionada)
      toast({
        title: 'Competência atualizada',
        description: `Dados da competência ${competenciaSelecionada} sincronizados.`,
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Prazo
  const prazoInfo: PrazoFechamentoInfo | null = useMemo(() => {
    if (!execucao) return null
    return avaliarStatusPrazo(execucao.data_limite, execucao.status_geral)
  }, [execucao])

  // Ações de Itens
  const handleOpenDetalhe = (item: ChecklistFechamentoItem) => {
    setSelectedItem(item)
    setDetailModalOpen(true)
  }

  // Ação de Ajuste Operacional (Etapa 2)
  const handleOpenAjusteOperacional = (item: ChecklistFechamentoItem) => {
    setSelectedItem(item)
    setAjusteModalOpen(true)
  }

  const handleAjusteCriado = async (ajuste: AjusteOperacional) => {
    // Recarregar os ajustes da competência
    await carregarAjustesOperacionais(competenciaSelecionada)
    // Se o modal de detalhes estiver aberto, ele atualizará
    if (selectedItem) {
      setDetailModalOpen(true)
    }
  }

  const handleValidarPcpAjuste = async (ajusteId: string, mudarAtividadeParaOk: boolean) => {
    const user = pb.authStore.record
    const usuarioNome = user?.name || user?.username || 'PCP Analista'
    await ajusteOperacionalService.validarPeloPcp({
      ajusteId,
      usuarioNome,
      mudarAtividadeParaOk,
    })
    await carregarCompetencia(competenciaSelecionada)
  }

  const handleAtualizarStatusRapido = async (
    item: ChecklistFechamentoItem,
    novoStatus: ChecklistItemStatus,
  ) => {
    try {
      const atualizado = await checklistFechamentoService.atualizarStatusItem(item.id, novoStatus)
      // Atualizar lista em memória
      setItens((prev) => prev.map((i) => (i.id === item.id ? atualizado : i)))
      if (execucao) {
        const execAtualizada = await checklistFechamentoService.recalcularTotaisExecucao(
          execucao.id,
        )
        setExecucao(execAtualizada)
      }
      toast({
        title: 'Status atualizado',
        description: `Item ${item.codigo} marcado como ${novoStatus}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleSaveItemDetalhado = async (
    item: ChecklistFechamentoItem,
    novoStatus: ChecklistItemStatus,
    dados: {
      observacao?: string
      quantidade_divergencias?: number
      ordem_material_lote?: string
      acao_corretiva?: string
      necessita_inventario?: boolean
    },
  ) => {
    const atualizado = await checklistFechamentoService.atualizarStatusItem(
      item.id,
      novoStatus,
      dados,
    )
    setItens((prev) => prev.map((i) => (i.id === item.id ? atualizado : i)))
    if (execucao) {
      const execAtualizada = await checklistFechamentoService.recalcularTotaisExecucao(execucao.id)
      setExecucao(execAtualizada)
    }
  }

  // Ação Solicitar Inventário
  const handleOpenSolicitarInventario = (item: ChecklistFechamentoItem) => {
    setSelectedItem(item)
    setInventarioModalOpen(true)
  }

  const handleConfirmSolicitarInventario = async (dados: {
    motivo: string
    deposito: string
    material: string
    lote: string
    quantidade: number
  }) => {
    if (!selectedItem || !execucao) return
    try {
      await checklistFechamentoService.criarOcorrencia({
        execucao_id: execucao.id,
        item_id: selectedItem.id,
        codigo_atividade: selectedItem.codigo,
        competencia: selectedItem.competencia,
        tipo: 'SOLICITACAO_INVENTARIO',
        descricao: `[INVENTÁRIO] ${dados.motivo}`,
        deposito: dados.deposito,
        material: dados.material,
        lote: dados.lote,
        quantidade_divergente: dados.quantidade,
        status: 'Aberta',
      })

      // Marca o item como necessita_inventario
      await handleAtualizarStatusRapido(selectedItem, 'ERRO')

      toast({
        title: 'Solicitação de inventário registrada',
        description: `Ocorrência vinculada à atividade ${selectedItem.codigo} no depósito ${dados.deposito}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Falha na solicitação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Ação Rastrear Divergência
  const handleOpenRastrearDivergencia = (item: ChecklistFechamentoItem) => {
    setSelectedItem(item)
    setDivergenciaModalOpen(true)
  }

  // Ação Nova / Editar Atividade Mestre
  const handleOpenNovaAtividade = () => {
    setSelectedModelo(null)
    setMestreModalOpen(true)
  }

  const handleOpenEditarAtividade = async (item: ChecklistFechamentoItem) => {
    try {
      if (item.modelo_id) {
        const modelo = await pb.collection('checklist_fechamento_modelos').getOne(item.modelo_id)
        setSelectedModelo(modelo as any)
      } else {
        // Fallback: busca pelo código
        const modelo = await pb
          .collection('checklist_fechamento_modelos')
          .getFirstListItem(`codigo="${item.codigo}"`)
        setSelectedModelo(modelo as any)
      }
    } catch {
      // Se não encontrar o modelo mestre correspondente, constrói objeto a partir do item atual
      setSelectedModelo({
        id: item.modelo_id || '',
        codigo: item.codigo,
        sequencia: item.sequencia,
        titulo: item.titulo,
        descricao_detalhada: item.descricao_detalhada,
        categoria: item.categoria,
        linha_centro_relacionado: item.linha_centro_relacionado,
        empresa: item.empresa || 'CIAFAL',
        werks: item.werks,
        line_id: item.line_id,
        line_code: item.line_code,
        line_name: item.line_name,
        center_id: item.center_id,
        center_code: item.center_code,
        center_name: item.center_name,
        transacao_sap: item.transacao_sap,
        deposito_sap: item.deposito_sap,
        frequencia: 'somente_fechamento',
        obrigatoria: item.obrigatoria,
        responsavel_padrao: item.responsavel_padrao,
        area_responsavel: item.area_responsavel,
        prazo_relativo_fechamento: '2º dia útil',
        manual_documento_referencia: item.manual_documento_referencia,
        regra_validacao: item.regra_validacao,
        campo_observacao: '',
        permite_evidencia: true,
        ativa: true,
        data_inicio_vigencia: new Date().toISOString().split('T')[0],
        fonte_dados: (item.fonte_dados as any) || 'Manual',
        status_regra: item.status_regra || 'Oficial',
      })
    }
    setMestreModalOpen(true)
  }

  const handleSaveModelo = async (dados: Partial<ChecklistAtividadeModelo>) => {
    const salvo = await checklistFechamentoService.salvarModelo(dados)
    // Se a competência atual estiver em andamento, sincroniza os itens sem recarregar a página
    await carregarCompetencia(competenciaSelecionada)
    return salvo
  }

  const handleToggleAtivoModelo = async (id: string, ativo: boolean) => {
    try {
      await checklistFechamentoService.alternarStatusModelo(id, ativo)
      toast({
        title: ativo ? 'Atividade reativada' : 'Atividade desativada',
        description: 'Status atualizado com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao alternar status',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Análise com IA
  const handleExecutarAnaliseIa = async () => {
    if (!execucao) return
    setCarregandoIa(true)
    setAnaliseIaModalOpen(true)
    try {
      const ocorrencias = await checklistFechamentoService.listarOcorrencias(execucao.id)
      const resIa = await fechamentoAiService.gerarAnaliseFechamento(execucao, itens, ocorrencias)
      setAnaliseIa(resIa)
      // Se não havia resumo salvo, salvar o inicial gerado
      if (!execucao.analise_ia_resumo) {
        await checklistFechamentoService.salvarResumoIaExecucao(
          execucao.id,
          resIa.texto_resumo_editavel,
        )
        setExecucao((prev) =>
          prev ? { ...prev, analise_ia_resumo: resIa.texto_resumo_editavel } : prev,
        )
      }
    } catch (err: any) {
      toast({
        title: 'Erro na Análise de IA',
        description: err.message || 'Falha ao processar análise do fechamento.',
        variant: 'destructive',
      })
    } finally {
      setCarregandoIa(false)
    }
  }

  // Abrir Formulário de Fechamento (Gera análise IA prévia se ainda não existir)
  const handleAbrirFormulario = async () => {
    if (!analiseIa && execucao) {
      handleExecutarAnaliseIa()
    }
    setFormularioModalOpen(true)
  }

  // Confirmar Fechamento (Bloqueia se houver obrigatória pendente ou com erro)
  const handleConfirmarFechamento = async () => {
    if (!execucao) return
    try {
      const atualizada = await checklistFechamentoService.confirmarFechamento(execucao.id)
      setExecucao(atualizada)
      toast({
        title: 'Fechamento Confirmado com Sucesso',
        description: `Competência ${atualizada.competencia} formalmente fechada e auditada em pcp_audit_logs.`,
      })
    } catch (err: any) {
      toast({
        title: 'Bloqueio de Fechamento',
        description: err.message,
        variant: 'destructive',
      })
      throw err
    }
  }

  // Salvar Resumo Executivo editado
  const handleSalvarResumoIa = async (texto: string) => {
    if (!execucao) return
    try {
      await checklistFechamentoService.salvarResumoIaExecucao(execucao.id, texto)
      setExecucao((prev) => (prev ? { ...prev, analise_ia_resumo: texto } : prev))
      toast({
        title: 'Resumo executivo salvo',
        description: 'Texto atualizado com sucesso para os comunicados.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar resumo',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Abrir Envio de E-mail para Grupo
  const handleAbrirEnvioEmail = (grupo: DestinatarioGrupo) => {
    setGrupoEnvioModal(grupo)
    setEnviarModalOpen(true)
  }

  // Recarregar comunicações após envio
  const handleEnvioSucesso = async () => {
    if (execucao?.id) {
      const comms = await fechamentoEnvioService.listarComunicacoes(execucao.id)
      setComunicacoes(comms)
    }
  }

  // Opções em cascata para filtros
  // 1. EMPRESAS (WERKS)
  const opcoesEmpresas: EmpresaOpcaoItem[] = useMemo(() => {
    if (companiesCatalog.length > 0) {
      return companiesCatalog
    }
    const map = new Map<string, EmpresaOpcaoItem>()
    itens.forEach((it) => {
      const w = it.werks || it.empresa
      if (w && !map.has(w)) {
        map.set(w, {
          werks: w,
          name: w === '1000' ? 'CIAFAL Matriz' : `Empresa ${w}`,
          label: `${w} — ${w === '1000' ? 'CIAFAL Matriz' : `Empresa ${w}`}`,
        })
      }
    })
    if (map.size === 0) {
      map.set('1000', {
        werks: '1000',
        name: 'CIAFAL Matriz',
        label: '1000 — CIAFAL Matriz',
      })
    }
    return Array.from(map.values())
  }, [companiesCatalog, itens])

  // 2. LINHAS (Filtradas apenas para a Empresa selecionada)
  const opcoesLinhas: LinhaOpcaoItem[] = useMemo(() => {
    if (!filtros.empresa || filtros.empresa === 'TODAS') {
      return []
    }

    const map = new Map<string, LinhaOpcaoItem>()

    // Linhas do cadastro oficial production_lines
    allProductionLines.forEach((l) => {
      const lineWerks = (l.sap_plant_code || '').trim()
      const matchWerks =
        !lineWerks || lineWerks === filtros.empresa.trim() || filtros.empresa === '1000'
      if (matchWerks && !map.has(l.code)) {
        map.set(l.code, {
          id: l.id,
          code: l.code,
          name: l.name || l.code,
          werks: lineWerks || filtros.empresa,
          label: `${l.code} — ${l.name || 'Linha Produtiva'}`,
        })
      }
    })

    // Linhas presentes nos itens do check-list daquela empresa
    itens.forEach((it) => {
      const itemWerks = it.werks || it.empresa
      if (itemWerks === filtros.empresa) {
        const code = it.line_code || it.line_name || it.linha_centro_relacionado
        if (code && !map.has(code)) {
          map.set(code, {
            id: it.line_id || code,
            code: it.line_code || code,
            name: it.line_name || code,
            werks: itemWerks,
            label: `${it.line_code || code} — ${it.line_name || code}`,
          })
        }
      }
    })

    return Array.from(map.values())
  }, [allProductionLines, filtros.empresa, itens])

  // 3. CENTROS (Filtrados por Empresa + Linha selecionada)
  const opcoesCentros: CentroOpcaoItem[] = useMemo(() => {
    if (!filtros.linha || filtros.linha === 'TODAS') {
      return []
    }
    if (centersForSelectedLine.length > 0) {
      return centersForSelectedLine
    }

    const map = new Map<string, CentroOpcaoItem>()
    itens.forEach((it) => {
      const linha = it.line_code || it.line_id || it.line_name || it.linha_centro_relacionado
      const centro = it.center_code || it.center_name
      if (centro && (linha === filtros.linha || it.line_id === filtros.linha)) {
        if (!map.has(centro)) {
          map.set(centro, {
            id: it.center_id,
            code: it.center_code || centro,
            name: it.center_name || centro,
            label: `${it.center_code || centro} — ${it.center_name || 'Centro Operacional'}`,
            lineCode: filtros.linha,
          })
        }
      }
    })
    return Array.from(map.values())
  }, [centersForSelectedLine, filtros.linha, itens])

  // 4. ANOS (Populados inicialmente a partir dos registros com evolução automática)
  const opcoesAnos: string[] = useMemo(() => {
    const anosSet = new Set<string>()
    const anoAtual = new Date().getFullYear().toString()
    anosSet.add('2025')
    anosSet.add('2026')
    anosSet.add('2027')
    anosSet.add(anoAtual)

    competencias.forEach((comp) => {
      const [, ano] = comp.split('/')
      if (ano && /^\d{4}$/.test(ano)) {
        anosSet.add(ano)
      }
    })

    itens.forEach((it) => {
      if (it.competencia) {
        const [, ano] = it.competencia.split('/')
        if (ano && /^\d{4}$/.test(ano)) {
          anosSet.add(ano)
        }
      }
    })

    return Array.from(anosSet).sort((a, b) => a.localeCompare(b))
  }, [competencias, itens])

  // Filtragem dos itens exibidos considerando os novos filtros do cabeçalho
  const itensExibidos = useMemo(() => {
    // Parser das datas informadas em dd/mm/aaaa para ISO YYYY-MM-DD
    const isoInicio = filtros.dataInicio
      ? datePtBrToIso(filtros.dataInicio) || filtros.dataInicio
      : ''
    const isoFim = filtros.dataFim ? datePtBrToIso(filtros.dataFim) || filtros.dataFim : ''

    return itens.filter((it) => {
      // 1. Empresa (WERKS)
      if (filtros.empresa !== 'TODAS') {
        const itWerks = (it.werks || it.empresa || '').trim()
        if (itWerks && itWerks !== filtros.empresa.trim()) {
          return false
        }
      }

      // 2. Linha
      if (filtros.linha !== 'TODAS') {
        const matchLinha =
          it.line_id === filtros.linha ||
          it.line_code === filtros.linha ||
          it.line_name === filtros.linha ||
          it.linha_centro_relacionado?.includes(filtros.linha)
        if (!matchLinha) return false
      }

      // 3. Centro
      if (filtros.centro !== 'TODOS') {
        const matchCentro =
          it.center_id === filtros.centro ||
          it.center_code === filtros.centro ||
          it.center_name === filtros.centro ||
          it.linha_centro_relacionado?.includes(filtros.centro)
        if (!matchCentro) return false
      }

      // 4. Ano
      if (filtros.ano !== 'TODOS') {
        const anoCompetencia = it.competencia?.split('/')[1] || ''
        if (anoCompetencia && anoCompetencia !== filtros.ano) return false
      }

      // 5. Mês
      if (filtros.mes !== 'TODOS') {
        const mesCompetencia = it.competencia?.split('/')[0] || ''
        if (mesCompetencia && mesCompetencia !== filtros.mes) return false
      }

      // 6. Data Início (dd/mm/aaaa ou YYYY-MM-DD)
      if (isoInicio) {
        const dataItem =
          it.data_hora_execucao ||
          it.created ||
          (execucao?.data_inicio ? `${execucao.data_inicio}T00:00:00` : '')
        if (dataItem) {
          const dataYmd = dataItem.split('T')[0]
          if (dataYmd < isoInicio) return false
        }
      }

      // 7. Data Fim (dd/mm/aaaa ou YYYY-MM-DD)
      if (isoFim) {
        const dataItem =
          it.data_hora_execucao ||
          it.created ||
          (execucao?.data_inicio ? `${execucao.data_inicio}T00:00:00` : '')
        if (dataItem) {
          const dataYmd = dataItem.split('T')[0]
          if (dataYmd > isoFim) return false
        }
      }

      return true
    })
  }, [itens, filtros, execucao])

  // Tratar alteração dos filtros, incluindo localização automática de competência ao selecionar Ano + Mês
  const handleFiltrosChange = (novosFiltros: ChecklistFiltrosAvancados) => {
    setFiltros(novosFiltros)

    // Se Ano e Mês estiverem ambos definidos e não forem 'TODOS', tentar localizar diretamente a competência
    if (
      novosFiltros.ano &&
      novosFiltros.ano !== 'TODOS' &&
      novosFiltros.mes &&
      novosFiltros.mes !== 'TODOS'
    ) {
      const compAlvo = `${novosFiltros.mes}/${novosFiltros.ano}`
      if (competencias.includes(compAlvo) && compAlvo !== competenciaSelecionada) {
        handleSelectCompetencia(compAlvo)
      }
    }
  }

  const handleLimparFiltros = () => {
    setFiltros({
      empresa: 'TODAS',
      linha: 'TODAS',
      centro: 'TODOS',
      ano: 'TODOS',
      mes: 'TODOS',
      dataInicio: '',
      dataFim: '',
    })
    setFiltroStatusRapido('TODOS')
  }

  return (
    <div className="space-y-4 p-1 sm:p-2">
      {/* 1. Header Oficial do Check-list */}
      <ErrorBoundary moduleName="Header Check-list Fechamento">
        {loading ? (
          <Skeleton className="h-44 w-full rounded-xl" />
        ) : (
          <ChecklistFechamentoHeader
            execucao={execucao}
            competencias={competencias}
            competenciaSelecionada={competenciaSelecionada}
            onSelectCompetencia={handleSelectCompetencia}
            onGerarCompetencia={handleGerarCompetencia}
            prazoInfo={prazoInfo}
            filtroAtivo={filtroStatusRapido}
            onFilterStatus={(st) => setFiltroStatusRapido(st)}
            isGenerating={isGenerating}
            onAbrirFormulario={handleAbrirFormulario}
            onAbrirAnaliseIa={handleExecutarAnaliseIa}
            onAbrirDestinatarios={() => setDestinatariosModalOpen(true)}
            filtros={filtros}
            onChangeFiltros={handleFiltrosChange}
            onLimparFiltros={handleLimparFiltros}
            opcoesEmpresas={opcoesEmpresas}
            opcoesLinhas={opcoesLinhas}
            opcoesCentros={opcoesCentros}
            opcoesAnos={opcoesAnos}
          />
        )}
      </ErrorBoundary>

      {/* 2. Listagem de Atividades e Ações */}
      <ErrorBoundary moduleName="Listagem Check-list Fechamento">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <ChecklistFechamentoLista
            itens={itensExibidos}
            onOpenDetalhe={handleOpenDetalhe}
            onAtualizarStatusRapido={handleAtualizarStatusRapido}
            onSolicitarInventario={handleOpenSolicitarInventario}
            onRastrearDivergencia={handleOpenRastrearDivergencia}
            onAdicionarEvidencia={handleOpenDetalhe}
            onNovaAtividade={handleOpenNovaAtividade}
            onEditarAtividade={handleOpenEditarAtividade}
            onGerarRelatorioPendencias={() => setRelatorioModalOpen(true)}
            canEdit={canEdit}
            filtroStatusRapido={filtroStatusRapido}
            onAbrirAjusteOperacional={handleOpenAjusteOperacional}
            ajustesPorItemMap={ajustesPorItem}
          />
        )}
      </ErrorBoundary>

      {/* 3. Modais Operacionais */}
      <ChecklistItemDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        item={selectedItem}
        onSave={handleSaveItemDetalhado}
        onSolicitarInventario={handleOpenSolicitarInventario}
        onRastrearDivergencia={handleOpenRastrearDivergencia}
        canEdit={canEdit}
        onAbrirAjusteOperacional={handleOpenAjusteOperacional}
        onValidarPcp={handleValidarPcpAjuste}
      />

      <AjusteOperacionalModal
        open={ajusteModalOpen}
        onClose={() => setAjusteModalOpen(false)}
        item={selectedItem}
        competencia={competenciaSelecionada}
        onAjusteCriado={handleAjusteCriado}
      />

      <SolicitarInventarioModal
        open={inventarioModalOpen}
        onClose={() => setInventarioModalOpen(false)}
        item={selectedItem}
        onConfirm={handleConfirmSolicitarInventario}
      />

      <RastrearDivergenciaModal
        open={divergenciaModalOpen}
        onClose={() => setDivergenciaModalOpen(false)}
        item={selectedItem}
      />

      <AtividadeMestreModal
        open={mestreModalOpen}
        onClose={() => setMestreModalOpen(false)}
        modelo={selectedModelo}
        onSave={handleSaveModelo}
        onToggleAtivo={handleToggleAtivoModelo}
      />

      <RelatorioPendenciasModal
        open={relatorioModalOpen}
        onClose={() => setRelatorioModalOpen(false)}
        execucao={execucao}
        itens={itens}
      />

      {/* 4. Modais da Etapa 2: Formulário Final, Envio, IA e Destinatários */}
      <FormularioFinalFechamentoModal
        open={formularioModalOpen}
        onClose={() => setFormularioModalOpen(false)}
        execucao={execucao}
        itens={itens}
        analiseIa={analiseIa}
        onConfirmarFechamento={handleConfirmarFechamento}
        onAbrirEnvioEmail={handleAbrirEnvioEmail}
        onSalvarResumoIa={handleSalvarResumoIa}
        comunicacoes={comunicacoes}
        podeConfirmar={canEdit}
      />

      <EnviarFechamentoModal
        open={enviarModalOpen}
        onClose={() => setEnviarModalOpen(false)}
        execucao={execucao}
        grupoInicial={grupoEnvioModal}
        resumoIaTexto={execucao?.analise_ia_resumo || analiseIa?.texto_resumo_editavel || ''}
        onEnvioSucesso={handleEnvioSucesso}
      />

      <AnaliseFechamentoIaModal
        open={analiseIaModalOpen}
        onClose={() => setAnaliseIaModalOpen(false)}
        execucao={execucao}
        analiseIa={analiseIa}
        carregando={carregandoIa}
        onAbrirFormulario={() => setFormularioModalOpen(true)}
      />

      <GestaoDestinatariosModal
        open={destinatariosModalOpen}
        onClose={() => setDestinatariosModalOpen(false)}
        podeAdministrar={podeAdministrar}
      />
    </div>
  )
}

export default ChecklistFechamentoPage
