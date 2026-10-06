import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  Info,
} from 'lucide-react'

// Subcomponentes da tela
import { ParadaHeader } from '@/components/programacao-parada/ParadaHeader'
import { ParadaForm } from '@/components/programacao-parada/ParadaForm'
import { CentrosTable } from '@/components/programacao-parada/CentrosTable'
import { CentrosComParadaProgramadaSection } from '@/components/programacao-parada/CentrosComParadaProgramadaSection'
import { AIValidationModal } from '@/components/programacao-parada/AIValidationModal'
import { SendCommunicationModal } from '@/components/programacao-parada/SendCommunicationModal'
import { VersionHistoryModal } from '@/components/programacao-parada/VersionHistoryModal'
import { ConsultaProgramacoesView } from '@/components/programacao-parada/ConsultaProgramacoesView'

// Serviços e Tipos
import {
  programacaoParadaService,
  ProgramacaoParadaRegistro,
  CentroParadaInput,
  ParadaStatus,
  MotivoParadaTipo,
  ValidacaoIAResultado,
} from '@/services/programacao-parada-service'
import { pb } from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'

export const ProgramacaoParadaPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const auth = useAuth()

  // Permissões via roles/contexto
  const userRole = String(auth?.user?.role || 'PCP_PROGRAMMER')
  const isConsultaOnly =
    userRole === 'PRODUCTION_VIEWER' ||
    userRole === 'EXECUTIVE_VIEWER' ||
    userRole === 'AUDITOR' ||
    userRole === 'PCP_VIEWER' ||
    userRole === 'CONSULTA'
  const canEdit = !isConsultaOnly
  const canApprove =
    userRole === 'PCP_PROGRAMMER' ||
    userRole === 'LINE_MANAGER' ||
    userRole === 'PCP_ADMIN' ||
    userRole === 'PCP_SUPERVISOR' ||
    userRole === 'SUPERVISOR_PCP' ||
    userRole === 'GERENTE' ||
    userRole === 'ADMIN'

  // Alternância de Visão: 'EDICAO' ou 'CONSULTA'
  const [activeView, setActiveView] = useState<'EDICAO' | 'CONSULTA'>('EDICAO')

  // Estado Principal da Parada em Edição
  const [paradaAtual, setParadaAtual] = useState<ProgramacaoParadaRegistro>({
    id: '',
    codigo: '',
    versao: 1,
    status: 'RASCUNHO',
    motivo_geral: 'Manutenção preventiva',
    data_hora_inicio: '',
    data_hora_fim: '',
    duracao_total_horas: 0,
    criado_por_id: auth?.user?.id || '',
    criado_por_nome: auth?.user?.name || 'Lucas Ferreira (PCP)',
    comunicado_disparado: false,
    houve_alteracao_pos_comunicado: false,
  })

  // Lista de Centros vinculados à parada
  const [centros, setCentros] = useState<CentroParadaInput[]>([])
  const [editingCentroIndex, setEditingCentroIndex] = useState<number | null>(null)

  // Estados de Interface
  const [loading, setLoading] = useState<boolean>(false)
  const [savingStatus, setSavingStatus] = useState<
    'IDLE' | 'SALVANDO' | 'SALVO' | 'VALIDANDO_IA' | 'ERRO'
  >('IDLE')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Modais
  const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false)
  const [aiResultado, setAiResultado] = useState<ValidacaoIAResultado | null>(null)
  const [isAIValidating, setIsAIValidating] = useState<boolean>(false)

  const [isSendCommModalOpen, setIsSendCommModalOpen] = useState<boolean>(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false)

  // Inicialização: se vier id na URL, carrega a parada
  const paradaIdFromUrl = searchParams.get('id')

  const carregarParadaPorId = useCallback(async (id: string) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const paradaRec = await programacaoParadaService.obterProgramacaoPorId(id)
      if (paradaRec) {
        setParadaAtual(paradaRec)
        const centrosRec = await programacaoParadaService.listarCentrosPorParada(id)
        setCentros(
          centrosRec.map((c) => ({
            id: c.id,
            empresa_code: c.empresa_code,
            linha_code: c.linha_code,
            linha_nome: c.linha_nome,
            centro_code: c.centro_code,
            centro_nome: c.centro_nome,
            data_hora_inicio: c.data_hora_inicio,
            data_hora_fim: c.data_hora_fim,
            duracao_horas: c.duracao_horas,
            motivo: c.motivo,
            motivo_outro: c.motivo_outro,
            descricao: c.descricao,
            status: c.status,
          })),
        )
        setActiveView('EDICAO')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao carregar a programação de parada.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (paradaIdFromUrl) {
      carregarParadaPorId(paradaIdFromUrl)
    }
  }, [paradaIdFromUrl, carregarParadaPorId])

  // ==========================================
  // MANIPULAÇÃO DE CENTROS (Formulário)
  // ==========================================
  const handleAddCentro = (novoCentro: CentroParadaInput) => {
    // 1. Validação local de sobreposição no mesmo centro dentro da mesma tela
    const conflitoMesmoCentro = centros.find(
      (c) =>
        c.centro_code === novoCentro.centro_code &&
        c.linha_code === novoCentro.linha_code &&
        programacaoParadaService.verificarSobreposicao(
          c.data_hora_inicio,
          c.data_hora_fim,
          novoCentro.data_hora_inicio,
          novoCentro.data_hora_fim,
        ),
    )

    if (conflitoMesmoCentro) {
      toast({
        variant: 'destructive',
        title: 'Conflito de Período no Mesmo Centro',
        description: `O Centro ${novoCentro.centro_code} (${novoCentro.linha_code}) já possui parada adicionada entre ${conflitoMesmoCentro.data_hora_inicio} e ${conflitoMesmoCentro.data_hora_fim}.`,
      })
      return
    }

    const updatedCentros = [...centros, novoCentro]
    setCentros(updatedCentros)
    recalcularLimitesParada(updatedCentros)

    toast({
      title: 'Centro Adicionado',
      description: `Centro ${novoCentro.centro_code} incluído com sucesso na parada.`,
    })
  }

  const handleUpdateCentro = (centroAtualizado: CentroParadaInput) => {
    if (editingCentroIndex === null) return
    const updated = [...centros]
    updated[editingCentroIndex] = centroAtualizado
    setCentros(updated)
    setEditingCentroIndex(null)
    recalcularLimitesParada(updated)

    toast({
      title: 'Centro Atualizado',
      description: `Alterações do Centro ${centroAtualizado.centro_code} salvas.`,
    })
  }

  const handleDuplicateCentro = (index: number) => {
    const item = centros[index]
    if (!item) return
    const duplicated: CentroParadaInput = {
      ...item,
      id: undefined,
      descricao: item.descricao ? `${item.descricao} (Cópia)` : 'Cópia da parada',
    }
    const updated = [...centros, duplicated]
    setCentros(updated)
    recalcularLimitesParada(updated)

    toast({
      title: 'Centro Duplicado',
      description: `Cópia do Centro ${item.centro_code} adicionada com sucesso.`,
    })
  }

  const handleDeleteCentro = (index: number) => {
    const item = centros[index]
    const updated = centros.filter((_, i) => i !== index)
    setCentros(updated)
    if (editingCentroIndex === index) {
      setEditingCentroIndex(null)
    }
    recalcularLimitesParada(updated)

    toast({
      title: 'Centro Removido',
      description: `Centro ${item?.centro_code || ''} removido da programação.`,
    })
  }

  // Recalcular início mínimo e fim máximo da parada com base nos centros
  const recalcularLimitesParada = (listaCentros: CentroParadaInput[]) => {
    if (listaCentros.length === 0) return

    let minInicio = listaCentros[0].data_hora_inicio
    let maxFim = listaCentros[0].data_hora_fim
    let somaHoras = 0

    listaCentros.forEach((c) => {
      somaHoras += c.duracao_horas || 0
      if (c.data_hora_inicio < minInicio) minInicio = c.data_hora_inicio
      if (c.data_hora_fim > maxFim) maxFim = c.data_hora_fim
    })

    setParadaAtual((prev) => ({
      ...prev,
      data_hora_inicio: minInicio,
      data_hora_fim: maxFim,
      duracao_total_horas: somaHoras,
      motivo_geral: listaCentros[0]?.motivo || prev.motivo_geral,
      // Se a parada já foi comunicada e estamos alterando centros, sinaliza alteração pós-comunicado
      houve_alteracao_pos_comunicado: prev.comunicado_disparado ? true : false,
    }))
  }

  // ==========================================
  // SALVAR RASCUNHO / ATUALIZAR PROGRAMAÇÃO
  // ==========================================
  const handleSaveDraft = async () => {
    if (centros.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Centros Obrigatórios',
        description: 'Adicione pelo menos um Centro de Trabalho antes de salvar a programação.',
      })
      return
    }

    setSavingStatus('SALVANDO')
    setErrorMessage(null)

    try {
      // Se a parada ainda não tem ID gerado, cria novo registro com código sequencial atômico
      if (!paradaAtual.id) {
        const codigoSeq =
          paradaAtual.codigo || (await programacaoParadaService.gerarProximoCodigo())

        const created = await programacaoParadaService.criarProgramacao(
          {
            ...paradaAtual,
            codigo: codigoSeq,
            status: 'RASCUNHO',
            versao: 1,
            criado_por_id: auth?.user?.id || 'sys-pcp',
            criado_por_nome: auth?.user?.name || 'Lucas Ferreira (PCP)',
          },
          centros,
        )

        setParadaAtual(created)
        setSearchParams({ id: created.id })

        toast({
          title: 'Programação de Parada Criada',
          description: `Parada ${created.codigo} salva como Rascunho com sucesso.`,
        })
      } else {
        // Se já existe, atualiza e gera nova versão no histórico
        const updated = await programacaoParadaService.atualizarProgramacao(
          paradaAtual.id,
          {
            ...paradaAtual,
            status: paradaAtual.status === 'VALIDADA' ? 'VALIDADA' : 'RASCUNHO',
          },
          centros,
          'Edição e atualização de centros da parada',
        )

        setParadaAtual(updated)

        toast({
          title: `Programação Atualizada (V${String(updated.versao).padStart(2, '0')})`,
          description: `Alterações salvas com versionamento preservado.`,
        })
      }

      setSavingStatus('SALVO')
      setTimeout(() => setSavingStatus('IDLE'), 3000)
    } catch (err: any) {
      console.error('Erro ao salvar parada:', err)
      setSavingStatus('ERRO')
      setErrorMessage(
        err?.message ||
          'Ocorreu um erro ao persistir a programação de parada. Os dados digitados foram preservados.',
      )
      toast({
        variant: 'destructive',
        title: 'Falha ao Salvar',
        description: err?.message || 'Verifique sua conexão e tente novamente.',
      })
    }
  }

  // ==========================================
  // VALIDAÇÃO COM IA (Chama Endpoint Real)
  // ==========================================
  const handleValidateAI = async () => {
    if (centros.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum Centro Adicionado',
        description: 'Adicione pelo menos um Centro para que a IA possa analisar os conflitos.',
      })
      return
    }

    setIsAIModalOpen(true)
    setIsAIValidating(true)
    setAiResultado(null)

    try {
      const resultado = await programacaoParadaService.validarComIA({
        parada_id: paradaAtual.id || undefined,
        codigo: paradaAtual.codigo || 'PP-NOVA',
        centros,
        motivo_geral: paradaAtual.motivo_geral,
      })

      setAiResultado(resultado)

      // Se a validação não identificou conflitos críticos, marca a parada como VALIDADA
      if (resultado.classificacao === 'SEM_CONFLITO' || resultado.classificacao === 'ATENCAO') {
        if (paradaAtual.id) {
          await programacaoParadaService.atualizarStatus(paradaAtual.id, 'VALIDADA')
          setParadaAtual((prev) => ({ ...prev, status: 'VALIDADA' }))
        } else {
          setParadaAtual((prev) => ({ ...prev, status: 'VALIDADA' }))
        }
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na Validação IA',
        description: err?.message || 'Não foi possível completar a validação assistida por IA.',
      })
    } finally {
      setIsAIValidating(false)
    }
  }

  // ==========================================
  // CANCELAMENTO DA PROGRAMAÇÃO
  // ==========================================
  const handleConfirmCancelParada = async () => {
    if (!paradaAtual.id) {
      setIsCancelConfirmOpen(false)
      handleNovaProgramacao()
      return
    }

    setLoading(true)
    try {
      await programacaoParadaService.atualizarStatus(
        paradaAtual.id,
        'CANCELADA',
        'Cancelamento solicitado pelo usuário PCP',
      )

      setParadaAtual((prev) => ({ ...prev, status: 'CANCELADA' }))
      setIsCancelConfirmOpen(false)

      toast({
        title: 'Programação Cancelada',
        description: `A programação ${paradaAtual.codigo} foi cancelada com sucesso.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Cancelar',
        description: err?.message || 'Não foi possível cancelar a programação.',
      })
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // REINICIAR FORMULÁRIO / NOVA PROGRAMAÇÃO
  // ==========================================
  const handleNovaProgramacao = () => {
    setParadaAtual({
      id: '',
      codigo: '',
      versao: 1,
      status: 'RASCUNHO',
      motivo_geral: 'Manutenção preventiva',
      data_hora_inicio: '',
      data_hora_fim: '',
      duracao_total_horas: 0,
      criado_por_id: auth?.user?.id || '',
      criado_por_nome: auth?.user?.name || 'Lucas Ferreira (PCP)',
      comunicado_disparado: false,
      houve_alteracao_pos_comunicado: false,
    })
    setCentros([])
    setEditingCentroIndex(null)
    setSearchParams({})
    setActiveView('EDICAO')
  }

  // ==========================================
  // CALLBACKS DA LISTAGEM DE CONSULTA
  // ==========================================
  const handleVisualizarDaListagem = (id: string) => {
    carregarParadaPorId(id)
  }

  const handleEditarDaListagem = (id: string) => {
    carregarParadaPorId(id)
  }

  const handleDuplicarDaListagem = async (id: string) => {
    setLoading(true)
    try {
      const duplicada = await programacaoParadaService.duplicarProgramacao(id)
      await carregarParadaPorId(duplicada.id)
      toast({
        title: 'Programação Duplicada',
        description: `Nova parada ${duplicada.codigo} criada a partir da original.`,
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Falha ao duplicar',
        description: e?.message || 'Erro ao duplicar programação.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleHistoricoDaListagem = (id: string, codigo: string) => {
    setParadaAtual((prev) => ({ ...prev, id, codigo }))
    setIsHistoryModalOpen(true)
  }

  const handleComunicadoDaListagem = async (paradaRec: ProgramacaoParadaRegistro) => {
    await carregarParadaPorId(paradaRec.id)
    setIsSendCommModalOpen(true)
  }

  const handleCancelarDaListagem = async (id: string, codigo: string) => {
    setParadaAtual((prev) => ({ ...prev, id, codigo }))
    setIsCancelConfirmOpen(true)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Alerta de Feedback de Operação (Salvando, Salvo, Erro) */}
      {savingStatus === 'SALVANDO' && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-[#004C97] flex items-center gap-2 shadow-xs animate-pulse">
          <Clock className="w-4 h-4 animate-spin text-[#004C97]" />
          <span>Salvando alterações e gerando versionamento no banco...</span>
        </div>
      )}

      {savingStatus === 'SALVO' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Programação salva com sucesso! Todos os dados foram persistidos.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 space-y-1 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Erro na Operação</span>
          </div>
          <p>{errorMessage}</p>
          <p className="text-[11px] text-rose-600 italic">
            Os dados digitados continuam intactos no formulário.
          </p>
        </div>
      )}

      {/* Visão de Edição vs Visão de Consulta */}
      {activeView === 'EDICAO' ? (
        <div className="space-y-6">
          {/* 1. Cabeçalho Oficial */}
          <ParadaHeader
            codigo={paradaAtual.codigo}
            status={paradaAtual.status}
            versao={paradaAtual.versao}
            criadoEm={paradaAtual.created}
            criadoPor={paradaAtual.criado_por_nome}
            atualizadoEm={paradaAtual.updated}
            atualizadoPor={paradaAtual.atualizado_por_nome}
            houveAlteracaoPosComunicado={paradaAtual.houve_alteracao_pos_comunicado}
            loading={loading || savingStatus === 'SALVANDO'}
            canEdit={canEdit}
            canValidateAI={canEdit}
            canSendComm={Boolean(paradaAtual.id)}
            canCancel={canEdit}
            isSaved={Boolean(paradaAtual.id)}
            onValidateAI={handleValidateAI}
            onSaveDraft={handleSaveDraft}
            onConsultar={() => setActiveView('CONSULTA')}
            onOpenSendComm={() => setIsSendCommModalOpen(true)}
            onCancelParada={() => setIsCancelConfirmOpen(true)}
            onOpenHistorico={() => setIsHistoryModalOpen(true)}
          />

          {/* 2. Formulário de Dados com Cascata Empresa -> Linha -> Centro */}
          <ParadaForm
            onAddCentro={handleAddCentro}
            editingCentro={editingCentroIndex !== null ? centros[editingCentroIndex] : null}
            onUpdateCentro={handleUpdateCentro}
            onCancelEditCentro={() => setEditingCentroIndex(null)}
            disabled={!canEdit || paradaAtual.status === 'CANCELADA'}
          />

          {/* 3. Tabela de Múltiplos Centros da Programação Atual */}
          <CentrosTable
            centros={centros}
            onEdit={(idx) => setEditingCentroIndex(idx)}
            onDuplicate={handleDuplicateCentro}
            onDelete={handleDeleteCentro}
            disabled={!canEdit || paradaAtual.status === 'CANCELADA'}
          />

          {/* 4. Seção "Centros com Parada Programada" + Comunicado por Seleção */}
          <CentrosComParadaProgramadaSection
            refreshTrigger={centros.length}
            onRefreshNeeded={() => {}}
          />
        </div>
      ) : (
        /* Visão de Listagem / Consulta de Programações */
        <ConsultaProgramacoesView
          onNovaProgramacao={handleNovaProgramacao}
          onVisualizar={handleVisualizarDaListagem}
          onEditar={handleEditarDaListagem}
          onDuplicar={handleDuplicarDaListagem}
          onHistorico={handleHistoricoDaListagem}
          onComunicado={handleComunicadoDaListagem}
          onCancelar={handleCancelarDaListagem}
          canEdit={canEdit}
        />
      )}

      {/* Modal de Validação com IA */}
      <AIValidationModal
        open={isAIModalOpen}
        onOpenChange={setIsAIModalOpen}
        resultado={aiResultado}
        loading={isAIValidating}
      />

      {/* Modal de Envio de Comunicado */}
      {isSendCommModalOpen && (
        <SendCommunicationModal
          open={isSendCommModalOpen}
          onOpenChange={setIsSendCommModalOpen}
          parada={paradaAtual}
          centros={centros}
          onSuccessSend={() => {
            setParadaAtual((prev) => ({
              ...prev,
              comunicado_disparado: true,
              houve_alteracao_pos_comunicado: false,
              status: prev.status === 'RASCUNHO' ? 'COMUNICADA' : prev.status,
            }))
          }}
        />
      )}

      {/* Modal de Histórico de Versões */}
      <VersionHistoryModal
        open={isHistoryModalOpen}
        onOpenChange={setIsHistoryModalOpen}
        paradaId={paradaAtual.id}
        codigo={paradaAtual.codigo || 'Novo Registro'}
      />

      {/* Modal de Confirmação de Cancelamento de Parada */}
      <Dialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-xl shadow-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Cancelar Programação de Parada
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 font-medium">
              Tem certeza que deseja cancelar a programação{' '}
              <strong className="text-slate-900">{paradaAtual.codigo || 'atual'}</strong>? Esta ação
              desativará a redução de capacidade nas linhas afetadas e registrará log formal de
              auditoria.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={loading}
              className="text-xs"
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancelParada}
              disabled={loading}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
            >
              {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default ProgramacaoParadaPage
