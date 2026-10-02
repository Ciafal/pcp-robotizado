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
} from '@/components/production-control/ChecklistFechamentoHeader'
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

  // Permissões
  const [canEdit, setCanEdit] = useState(true)

  useEffect(() => {
    verificarPermissoes()
    carregarInicial()
  }, [])

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
  const opcoesEmpresas = useMemo(() => {
    const s = new Set<string>()
    itens.forEach((it) => {
      if (it.empresa) s.add(it.empresa)
    })
    if (s.size === 0) s.add('CIAFAL')
    return Array.from(s)
  }, [itens])

  const opcoesLinhas = useMemo(() => {
    const s = new Set<string>()
    itens.forEach((it) => {
      const linha = it.line_name || it.line_code || it.linha_centro_relacionado
      if (linha) {
        if (filtros.empresa === 'TODAS' || it.empresa === filtros.empresa) {
          s.add(linha)
        }
      }
    })
    return Array.from(s)
  }, [itens, filtros.empresa])

  const opcoesCentros = useMemo(() => {
    const s = new Set<string>()
    itens.forEach((it) => {
      const linha = it.line_name || it.line_code || it.linha_centro_relacionado
      const centro = it.center_code || it.center_name
      if (centro) {
        const matchEmpresa = filtros.empresa === 'TODAS' || it.empresa === filtros.empresa
        const matchLinha = filtros.linha === 'TODAS' || linha === filtros.linha
        if (matchEmpresa && matchLinha) {
          s.add(centro)
        }
      }
    })
    return Array.from(s)
  }, [itens, filtros.empresa, filtros.linha])

  // Filtragem dos itens exibidos considerando os novos filtros do cabeçalho
  const itensExibidos = useMemo(() => {
    return itens.filter((it) => {
      // 1. Empresa
      if (filtros.empresa !== 'TODAS' && it.empresa && it.empresa !== filtros.empresa) {
        return false
      }

      // 2. Linha
      const linhaItem = it.line_name || it.line_code || it.linha_centro_relacionado || ''
      if (filtros.linha !== 'TODAS' && linhaItem !== filtros.linha) {
        return false
      }

      // 3. Centro
      const centroItem = it.center_code || it.center_name || ''
      if (filtros.centro !== 'TODOS' && centroItem !== filtros.centro) {
        return false
      }

      // 4. Ano
      if (filtros.ano !== 'TODOS') {
        const anoCompetencia = it.competencia?.split('/')[1] || ''
        if (anoCompetencia !== filtros.ano) return false
      }

      // 5. Mês
      if (filtros.mes !== 'TODOS') {
        const mesCompetencia = it.competencia?.split('/')[0] || ''
        if (mesCompetencia !== filtros.mes) return false
      }

      // 6. Data Início
      if (filtros.dataInicio && it.data_hora_execucao) {
        const dataExec = it.data_hora_execucao.split('T')[0]
        if (dataExec < filtros.dataInicio) return false
      }

      // 7. Data Fim
      if (filtros.dataFim && it.data_hora_execucao) {
        const dataExec = it.data_hora_execucao.split('T')[0]
        if (dataExec > filtros.dataFim) return false
      }

      return true
    })
  }, [itens, filtros])

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
            onChangeFiltros={setFiltros}
            onLimparFiltros={handleLimparFiltros}
            opcoesEmpresas={opcoesEmpresas}
            opcoesLinhas={opcoesLinhas}
            opcoesCentros={opcoesCentros}
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
