import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  AlertTriangle,
  Building,
  User,
  Calendar,
  FileText,
  Boxes,
  ShieldCheck,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  Paperclip,
  Upload,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Wrench,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { pb } from '@/lib/pocketbase/client'
import {
  AjusteOperacional,
  AjusteOperacionalPrioridade,
  AjusteOperacionalStatusOrigem,
  AjusteOperacionalTipo,
  CriarAjusteInput,
  AnaliseIaAjusteResultado,
} from '@/types/ajuste-operacional'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'
import {
  ajusteOperacionalService,
  AntiDuplicidadeCheckResult,
} from '@/services/ajuste-operacional-service'
import { gestorLinhaService, MENSAGEM_ERRO_SEM_GESTOR } from '@/services/gestor-linha-service'
import { ajusteOperacionalIaService } from '@/services/ajuste-operacional-ia-service'

interface Props {
  open: boolean
  onClose: () => void
  item: ChecklistFechamentoItem | null
  competencia: string
  onAjusteCriado?: (ajuste: AjusteOperacional) => void
  onAbrirAjusteExistente?: (ajuste: AjusteOperacional) => void
}

const TIPOS_AJUSTE: AjusteOperacionalTipo[] = [
  'Apontamento',
  'Estoque',
  'Movimento SAP',
  'Ordem de produção',
  'Divergência de quantidade',
  'Fechamento',
  'Cadastro',
  'Processo',
  'Outro',
]

const PRIORIDADES: AjusteOperacionalPrioridade[] = ['Baixa', 'Média', 'Alta', 'Crítica']

interface EvidenciaUpload {
  id: string
  nome_arquivo: string
  tamanho_bytes: number
  tipo_mime: string
  url_ou_caminho?: string
}

export const AjusteOperacionalModal: React.FC<Props> = ({
  open,
  onClose,
  item,
  competencia,
  onAjusteCriado,
  onAbrirAjusteExistente,
}) => {
  const { toast } = useToast()

  // Form states
  const [tipo, setTipo] = useState<AjusteOperacionalTipo>('Apontamento')
  const [prioridade, setPrioridade] = useState<AjusteOperacionalPrioridade>('Alta')
  const [prazo, setPrazo] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')
  const [acaoNecessaria, setAcaoNecessaria] = useState<string>('')
  const [ordemSap, setOrdemSap] = useState<string>('')
  const [material, setMaterial] = useState<string>('')
  const [lote, setLote] = useState<string>('')
  const [quantidade, setQuantidade] = useState<number>(0)
  const [transacaoSap, setTransacaoSap] = useState<string>('')
  const [observacaoAdicional, setObservacaoAdicional] = useState<string>('')

  // Gestor da linha e permissões
  const [gestorNome, setGestorNome] = useState<string>('')
  const [gestorEmail, setGestorEmail] = useState<string>('')
  const [gestorId, setGestorId] = useState<string>('')
  const [gestorCargo, setGestorCargo] = useState<string>('')
  const [semGestorConfigurado, setSemGestorConfigurado] = useState<boolean>(false)
  const [carregandoGestor, setCarregandoGestor] = useState<boolean>(false)
  const [usuarioPodeEditarResponsavel, setUsuarioPodeEditarResponsavel] = useState<boolean>(false)

  // Duplicidade
  const [verificandoDuplicidade, setVerificandoDuplicidade] = useState<boolean>(false)
  const [duplicidadeAviso, setDuplicidadeAviso] = useState<AntiDuplicidadeCheckResult | null>(null)
  const [forcarDuplicada, setForcarDuplicada] = useState<boolean>(false)
  const [justificativaDuplicidade, setJustificativaDuplicidade] = useState<string>('')

  // Evidências
  const [evidencias, setEvidencias] = useState<EvidenciaUpload[]>([])
  const [uploadingEvidencia, setUploadingEvidencia] = useState<boolean>(false)

  // IA
  const [analisandoComIa, setAnalisandoComIa] = useState<boolean>(false)
  const [analiseIa, setAnaliseIa] = useState<AnaliseIaAjusteResultado | null>(null)
  const [mostrarPainelIa, setMostrarPainelIa] = useState<boolean>(false)

  // Submissão
  const [salvando, setSalvando] = useState<boolean>(false)
  const [proximoNumero, setProximoNumero] = useState<string>('')
  const [dataHoraAbertura, setDataHoraAbertura] = useState<string>('')
  const [solicitanteNome, setSolicitanteNome] = useState<string>('')

  // Preencher formulário ao abrir
  useEffect(() => {
    if (open && item) {
      // Data/hora e usuário atual
      const agora = new Date()
      const dataHoraFormatada = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(agora)
      setDataHoraAbertura(dataHoraFormatada)

      const user = pb.authStore.record
      const nomeUser = user?.name || user?.username || 'PCP Analista'
      setSolicitanteNome(nomeUser)

      // Permissão para alterar responsável: ADMIN, GERENTE, MANAGER, COORDENADOR
      const role = (user?.role || '').toUpperCase()
      const podeAlterar =
        role.includes('ADMIN') ||
        role.includes('GERENTE') ||
        role.includes('MANAGER') ||
        role.includes('COORDENADOR')
      setUsuarioPodeEditarResponsavel(podeAlterar)

      // Prazo padrão: 2 dias corridos à frente às 17:00
      agora.setDate(agora.getDate() + 2)
      const prazoFormatado = `${agora.toISOString().split('T')[0]}T17:00`
      setPrazo(prazoFormatado)

      setTipo(derivarTipoInicial(item))
      setPrioridade(item.obrigatoria ? 'Alta' : 'Média')
      setDescricao(
        `Divergência identificada no fechamento da competência ${competencia} na atividade [${item.codigo}] ${item.titulo}.\n${item.observacao ? `Observação registrada: ${item.observacao}\n` : ''}${item.quantidade_divergencias ? `Quantidade de divergências: ${item.quantidade_divergencias}` : ''}`.trim(),
      )
      setAcaoNecessaria(
        item.acao_corretiva ||
          `Verificar e regularizar pendência referente à atividade [${item.codigo}] ${item.titulo} no SAP (${item.transacao_sap && item.transacao_sap !== 'N/A' ? item.transacao_sap : 'geral'}) antes do encerramento oficial.`,
      )
      setOrdemSap(item.ordem_material_lote || '')
      setMaterial('')
      setLote('')
      setQuantidade(item.quantidade_divergencias || 0)
      setTransacaoSap(item.transacao_sap && item.transacao_sap !== 'N/A' ? item.transacao_sap : '')
      setObservacaoAdicional('')
      setForcarDuplicada(false)
      setJustificativaDuplicidade('')
      setEvidencias([])
      setAnaliseIa(null)
      setMostrarPainelIa(false)
      setSemGestorConfigurado(false)

      // Carregar gestor da linha e próximo número
      carregarGestorELocalizacao(item)
      verificarExistenciaAjuste(item.id)
      carregarNumeroPrevisto()
    }
  }, [open, item, competencia])

  const derivarTipoInicial = (it: ChecklistFechamentoItem): AjusteOperacionalTipo => {
    const c = it.codigo.toLowerCase()
    const t = (it.titulo + ' ' + (it.transacao_sap || '')).toLowerCase()
    if (t.includes('cogi') || t.includes('co1p') || t.includes('apontamento')) return 'Apontamento'
    if (
      t.includes('estoque') ||
      t.includes('saldo') ||
      t.includes('depósito') ||
      c.includes('1.3') ||
      c.includes('1.4')
    )
      return 'Estoque'
    if (t.includes('ordem') || t.includes('co02') || t.includes('co03') || t.includes('teco'))
      return 'Ordem de produção'
    if (t.includes('divergência') || (it.quantidade_divergencias && it.quantidade_divergencias > 0))
      return 'Divergência de quantidade'
    if (t.includes('movimento') || t.includes('mb51') || t.includes('migo')) return 'Movimento SAP'
    if (t.includes('cadastro')) return 'Cadastro'
    if (t.includes('processo')) return 'Processo'
    return 'Fechamento'
  }

  const carregarNumeroPrevisto = async () => {
    try {
      const res = await ajusteOperacionalService.gerarProximoNumero()
      setProximoNumero(res.numero)
    } catch {
      setProximoNumero('AOP-000001/' + new Date().getFullYear())
    }
  }

  const carregarGestorELocalizacao = async (it: ChecklistFechamentoItem) => {
    setCarregandoGestor(true)
    setSemGestorConfigurado(false)
    try {
      const gestor = await gestorLinhaService.localizarGestor({
        linha_id: it.line_id,
        linha_code: it.line_code || it.linha_centro_relacionado,
        centro_id: it.center_id,
        centro_code: it.center_code,
        werks: it.werks,
      })

      if (gestor && gestor.usuario_nome) {
        setGestorNome(gestor.usuario_nome)
        setGestorEmail(gestor.usuario_email || '')
        setGestorId(gestor.usuario_id)
        setGestorCargo(gestor.cargo || 'Gestor da Linha')
        setSemGestorConfigurado(false)
      } else {
        // Bloquear: gestor não configurado para este centro/linha
        setGestorNome('')
        setGestorEmail('')
        setGestorId('')
        setGestorCargo('')
        setSemGestorConfigurado(true)
      }
    } catch {
      setGestorNome('')
      setGestorEmail('')
      setGestorId('')
      setGestorCargo('')
      setSemGestorConfigurado(true)
    } finally {
      setCarregandoGestor(false)
    }
  }

  const verificarExistenciaAjuste = async (itemId: string) => {
    setVerificandoDuplicidade(true)
    try {
      const res = await ajusteOperacionalService.verificarAjusteAberto(itemId)
      setDuplicidadeAviso(res)
    } finally {
      setVerificandoDuplicidade(false)
    }
  }

  // Upload/Anexo de Evidências múltiplas
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingEvidencia(true)
    try {
      const novasEvidencias: EvidenciaUpload[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        novasEvidencias.push({
          id: `ev_${Date.now()}_${i}`,
          nome_arquivo: file.name,
          tamanho_bytes: file.size,
          tipo_mime: file.type || 'application/octet-stream',
          url_ou_caminho: '',
        })
      }
      setEvidencias((prev) => [...prev, ...novasEvidencias])
      toast({
        title: 'Evidências anexadas',
        description: `${files.length} arquivo(s) adicionado(s) à lista de evidências.`,
      })
    } finally {
      setUploadingEvidencia(false)
      e.target.value = ''
    }
  }

  const handleRemoverEvidencia = (id: string) => {
    setEvidencias((prev) => prev.filter((ev) => ev.id !== id))
  }

  // Botão Analisar Pendência com IA (Usa o service da Etapa 1)
  const handleAnalisarComIa = async () => {
    if (!item) return
    setAnalisandoComIa(true)
    try {
      const resultado = await ajusteOperacionalIaService.analisarPendencia({
        codigo_atividade: item.codigo,
        atividade_titulo: item.titulo,
        status_origem: item.status === 'ERRO' ? 'ERRO' : 'PENDENTE',
        tipo,
        descricao: descricao.trim() || item.descricao_detalhada,
        acao_necessaria: acaoNecessaria.trim(),
        competencia,
        linha: item.line_name || item.line_code || item.linha_centro_relacionado,
        centro: item.center_code || item.center_name,
        ordem_sap: ordemSap.trim(),
        material: material.trim(),
        lote: lote.trim(),
        quantidade: Number(quantidade) || 0,
        transacao_sap: transacaoSap.trim(),
      })

      setAnaliseIa(resultado)
      setMostrarPainelIa(true)

      toast({
        title: 'Análise de IA concluída',
        description:
          'Diagnóstico gerado com causa provável, ocorrências semelhantes e passos recomendados.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro na Análise de IA',
        description: err.message || 'Falha ao consultar IA do Ajuste Operacional.',
        variant: 'destructive',
      })
    } finally {
      setAnalisandoComIa(false)
    }
  }

  const handleAplicarSugestaoIa = () => {
    if (!analiseIa) return
    if (analiseIa.descricao_revisada) {
      setDescricao(analiseIa.descricao_revisada)
    }
    if (analiseIa.proximos_passos && analiseIa.proximos_passos.length > 0) {
      const passosFormatados = analiseIa.proximos_passos
        .map((p, idx) => `${idx + 1}. ${p}`)
        .join('\n')
      setAcaoNecessaria(
        (acaoNecessaria ? `${acaoNecessaria}\n\n` : '') +
          `[Próximos passos recomendados pela IA]:\n${passosFormatados}`,
      )
    }
    toast({
      title: 'Sugestões aplicadas',
      description: 'Descrição e ação necessária enriquecidas com o diagnóstico da IA.',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

    // 1. Bloqueio se não houver gestor configurado com a mensagem exata
    if (semGestorConfigurado || !gestorNome.trim()) {
      toast({
        title: 'Gestor não configurado',
        description: MENSAGEM_ERRO_SEM_GESTOR,
        variant: 'destructive',
      })
      return
    }

    if (!descricao.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe a descrição detalhada da pendência.',
        variant: 'destructive',
      })
      return
    }

    if (!acaoNecessaria.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe a ação necessária para regularização.',
        variant: 'destructive',
      })
      return
    }

    if (!prazo) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o prazo (data/hora) para resolução do ajuste operacional.',
        variant: 'destructive',
      })
      return
    }

    // 2. Anti-duplicidade
    if (duplicidadeAviso?.temAjusteAberto && !forcarDuplicada) {
      toast({
        title: 'Ajuste em Aberto Existente',
        description:
          duplicidadeAviso.mensagemAviso ||
          'Já existe um Ajuste Operacional em aberto para esta atividade.',
        variant: 'destructive',
      })
      return
    }

    if (
      forcarDuplicada &&
      (!justificativaDuplicidade || justificativaDuplicidade.trim().length < 5)
    ) {
      toast({
        title: 'Justificativa obrigatória',
        description:
          'Informe ao menos 5 caracteres na justificativa para criar um novo ajuste em paralelo.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const user = pb.authStore.record
      const solicitanteId = user?.id || ''

      const statusOrigem: AjusteOperacionalStatusOrigem =
        item.status === 'ERRO' ? 'ERRO' : 'PENDENTE'

      const input: CriarAjusteInput = {
        checklist_item_id: item.id,
        checklist_modelo_id: item.modelo_id || '',
        competencia,
        codigo_atividade: item.codigo,
        atividade_titulo: item.titulo,
        status_origem: statusOrigem,
        tipo,
        descricao: descricao.trim(),
        acao_necessaria: acaoNecessaria.trim(),
        prioridade,
        prazo,

        werks: item.werks || '1000',
        empresa_nome: item.empresa || 'CIAFAL',
        linha_id: item.line_id || '',
        linha_code: item.line_code || item.linha_centro_relacionado || '',
        linha_name: item.line_name || item.linha_centro_relacionado || '',
        centro_id: item.center_id || '',
        centro_code: item.center_code || '',
        centro_name: item.center_name || '',

        ordem_sap: ordemSap.trim(),
        material: material.trim(),
        lote: lote.trim(),
        quantidade: Number(quantidade) || 0,
        transacao_sap: transacaoSap.trim(),
        observacao_adicional: observacaoAdicional.trim(),

        solicitante_id: solicitanteId,
        solicitante_nome: solicitanteNome,
        responsavel_id: gestorId,
        responsavel_nome: gestorNome.trim(),
        responsavel_email: gestorEmail.trim(),

        forcar_criacao_duplicada: forcarDuplicada,
        justificativa_duplicidade: justificativaDuplicidade.trim(),

        evidencias_iniciais: evidencias.map((ev) => ({
          nome_arquivo: ev.nome_arquivo,
          tipo_mime: ev.tipo_mime,
          tamanho_bytes: ev.tamanho_bytes,
          url_ou_caminho: ev.url_ou_caminho,
        })),
      }

      const res = await ajusteOperacionalService.criarAjuste(input)

      toast({
        title: `Ajuste Criado: ${res.ajuste.numero}`,
        description: `Pendência criada no Meu Dia de ${gestorNome} e formulário estruturado registrado.`,
      })

      if (onAjusteCriado) {
        onAjusteCriado(res.ajuste)
      }
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar Ajuste Operacional',
        description: err.message || 'Falha ao gravar ajuste no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-0 overflow-hidden rounded-xl border border-slate-200 shadow-xl bg-white">
        {/* Cabeçalho do Formulário Oficial — Azul Institucional CIAFAL */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-blue-900 via-[#004C97] to-blue-800 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs bg-white text-[#004C97] px-2.5 py-0.5 rounded shadow-2xs">
                  {proximoNumero || 'AOP-NOVO'}
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-300" />
                  Ajuste Operacional
                </DialogTitle>
                <Badge className="bg-amber-400 text-amber-950 font-semibold text-[10px]">
                  Competência {competencia}
                </Badge>
              </div>
              <p className="text-xs text-blue-100/90 leading-snug">
                Formulário estruturado de ocorrência vinculado ao Check-list de Fechamento.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com Scroll Responsivo */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs"
        >
          {/* Alerta de Responsável Indisponível (Bloqueio estrito) */}
          {semGestorConfigurado && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-lg flex items-start gap-2.5 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-950">Atenção: Responsável Não Localizado</span>
                <p className="text-xs leading-relaxed text-rose-800">{MENSAGEM_ERRO_SEM_GESTOR}</p>
              </div>
            </div>
          )}

          {/* Banner de Duplicidade (Anti-duplicidade com opção de abrir ou justificar) */}
          {duplicidadeAviso?.temAjusteAberto && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2.5 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-amber-950">
                    Já existe um Ajuste Operacional em aberto para esta atividade.
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Ajuste existente: <strong>{duplicidadeAviso.ajusteAberto?.numero}</strong> |
                    Status: <strong>{duplicidadeAviso.ajusteAberto?.status}</strong> | Responsável:{' '}
                    <strong>{duplicidadeAviso.ajusteAberto?.responsavel_nome}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-between gap-2">
                {onAbrirAjusteExistente && duplicidadeAviso.ajusteAberto && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose()
                      onAbrirAjusteExistente(duplicidadeAviso.ajusteAberto!)
                    }}
                    className="h-7 text-xs border-amber-400 bg-white hover:bg-amber-100 text-amber-950 font-medium"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Abrir ajuste existente ({duplicidadeAviso.ajusteAberto.numero})
                  </Button>
                )}

                <label className="flex items-center gap-2 font-semibold text-amber-950 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={forcarDuplicada}
                    onChange={(e) => setForcarDuplicada(e.target.checked)}
                    className="rounded border-amber-400 text-[#004C97] focus:ring-[#004C97]"
                  />
                  <span>Criar novo mesmo assim (mediante confirmação e justificativa)</span>
                </label>
              </div>

              {forcarDuplicada && (
                <div className="space-y-1 pt-1 border-t border-amber-200">
                  <label className="text-[11px] font-semibold text-amber-950">
                    Justificativa para abertura de novo ajuste duplicado{' '}
                    <span className="text-rose-500">*</span>:
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: Novo lote divergente de sucata surgido após primeira análise..."
                    value={justificativaDuplicidade}
                    onChange={(e) => setJustificativaDuplicidade(e.target.value)}
                    className="h-7 text-xs bg-white border-amber-300"
                  />
                </div>
              )}
            </div>
          )}

          {/* Seção 1: Identificação (Automática) */}
          <div className="space-y-1.5">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-[#004C97]">
              <Info className="w-3.5 h-3.5" />
              1. Identificação da Atividade
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <span className="text-slate-400 block text-[10px]">Competência</span>
                <span className="font-bold text-slate-800">{competencia}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Empresa / WERKS</span>
                <span className="font-bold text-slate-800">
                  {item.empresa || 'CIAFAL'} {item.werks ? `(${item.werks})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Linha de Produção</span>
                <span className="font-bold text-slate-800 truncate block">
                  {item.line_name || item.line_code || item.linha_centro_relacionado || 'Geral'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Centro</span>
                <span className="font-bold text-slate-800 truncate block">
                  {item.center_code || item.center_name || 'C100'}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-slate-400 block text-[10px]">Código e Atividade</span>
                <span className="font-bold text-slate-900 block truncate">
                  [{item.codigo}] {item.titulo}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Status Atual</span>
                <Badge
                  className={
                    item.status === 'ERRO'
                      ? 'bg-rose-100 text-rose-800 border-rose-300 text-[10px]'
                      : 'bg-amber-100 text-amber-800 border-amber-300 text-[10px]'
                  }
                >
                  {item.status}
                </Badge>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Data/Hora & Usuário</span>
                <span className="text-slate-700 block text-[10px] truncate" title={solicitanteNome}>
                  {dataHoraAbertura} • {solicitanteNome}
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Ocorrência */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-[#004C97]">
                <FileText className="w-3.5 h-3.5" />
                2. Ocorrência & Tratativa Operacional
              </span>

              {/* Botão Analisar Pendência com IA */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnalisarComIa}
                disabled={analisandoComIa}
                className="h-7 text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold gap-1.5 shadow-2xs"
              >
                {analisandoComIa ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                )}
                Analisar Pendência com IA
              </Button>
            </div>

            {/* Painel de Resultados da Análise de IA */}
            {mostrarPainelIa && analiseIa && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2.5 text-indigo-950">
                <div className="flex items-center justify-between border-b border-indigo-200/60 pb-1.5">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-indigo-900">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Diagnóstico IA do PCP Robotizado
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAplicarSugestaoIa}
                      className="h-6 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                    >
                      Aplicar Sugestões ao Formulário
                    </Button>
                    <button
                      type="button"
                      onClick={() => setMostrarPainelIa(false)}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <p className="font-medium text-indigo-900">
                    <strong>Causa Provável:</strong> {analiseIa.causa_provavel}
                  </p>
                  <p className="text-indigo-800">
                    <strong>Resumo:</strong> {analiseIa.resumo_ocorrencia}
                  </p>
                </div>

                {/* Próximos Passos */}
                {analiseIa.proximos_passos && analiseIa.proximos_passos.length > 0 && (
                  <div className="space-y-1 text-[11px]">
                    <span className="font-semibold text-indigo-900">
                      Próximos Passos Recomendados:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-indigo-800">
                      {analiseIa.proximos_passos.map((passo, idx) => (
                        <li key={idx}>{passo}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dados a Conferir */}
                {analiseIa.dados_para_conferir && analiseIa.dados_para_conferir.length > 0 && (
                  <div className="space-y-1 text-[11px]">
                    <span className="font-semibold text-indigo-900">Dados a Conferir:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-indigo-800">
                      {analiseIa.dados_para_conferir.map((dado, idx) => (
                        <li key={idx}>{dado}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ocorrências Semelhantes */}
                {analiseIa.ocorrencias_semelhantes &&
                  analiseIa.ocorrencias_semelhantes.length > 0 && (
                    <div className="space-y-1 text-[11px] pt-1 border-t border-indigo-200/60">
                      <span className="font-semibold text-indigo-900">
                        Ocorrências Semelhantes em Competências Anteriores:
                      </span>
                      <div className="space-y-1">
                        {analiseIa.ocorrencias_semelhantes.map((sem, idx) => (
                          <div
                            key={idx}
                            className="bg-white/70 p-1.5 rounded border border-indigo-100"
                          >
                            <span className="font-bold text-indigo-900">
                              Comp. {sem.competencia}:
                            </span>{' '}
                            <span className="text-indigo-800">{sem.descricao}</span>{' '}
                            <span className="text-emerald-700 font-medium">
                              — Solução: {sem.solucao_adotada}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="text-[10px] text-indigo-600/80 italic pt-1">
                  Nota: A IA atua somente como suporte analítico e não altera status nem envia
                  comunicações sem sua confirmação.
                </div>
              </div>
            )}

            {/* Grid: Tipo, Prioridade, Prazo e Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Tipo da Pendência <span className="text-rose-500">*</span>
                </label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as AjusteOperacionalTipo)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_AJUSTE.map((tp) => (
                      <SelectItem key={tp} value={tp} className="text-xs">
                        {tp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Prioridade <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={prioridade}
                  onValueChange={(v) => setPrioridade(v as AjusteOperacionalPrioridade)}
                >
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((pr) => (
                      <SelectItem key={pr} value={pr} className="text-xs">
                        {pr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-800">
                  Prazo de Resolução <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-800">
                    Responsável (Gestor) <span className="text-rose-500">*</span>
                  </label>
                  {!usuarioPodeEditarResponsavel && (
                    <span
                      className="text-[10px] text-slate-400"
                      title="Apenas gestores/administradores autorizados podem alterar o responsável"
                    >
                      (Automático)
                    </span>
                  )}
                </div>
                <Input
                  type="text"
                  value={gestorNome}
                  disabled={!usuarioPodeEditarResponsavel || carregandoGestor}
                  onChange={(e) => setGestorNome(e.target.value)}
                  placeholder={carregandoGestor ? 'Identificando gestor...' : 'Nome do Gestor'}
                  className={`h-8 text-xs ${
                    semGestorConfigurado ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white'
                  }`}
                />
                {gestorEmail && (
                  <span className="text-[10px] text-slate-400 truncate block">{gestorEmail}</span>
                )}
              </div>
            </div>

            {/* Campos SAP Complementares */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Ordem SAP (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 45000123"
                  value={ordemSap}
                  onChange={(e) => setOrdemSap(e.target.value)}
                  className="h-7 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Material (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Ex: ST930001"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="h-7 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">Lote (opcional)</label>
                <Input
                  type="text"
                  placeholder="Ex: 2026A"
                  value={lote}
                  onChange={(e) => setLote(e.target.value)}
                  className="h-7 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700">
                  Quantidade (opcional)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value) || 0)}
                  className="h-7 text-xs bg-white"
                />
              </div>

              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-[11px] font-semibold text-slate-700">Transação SAP</label>
                <Input
                  type="text"
                  placeholder="Ex: COGI, CO1P"
                  value={transacaoSap}
                  onChange={(e) => setTransacaoSap(e.target.value)}
                  className="h-7 text-xs bg-white"
                />
              </div>
            </div>

            {/* Textarea: Descrição da Pendência (Obrigatória) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800">
                Descrição da Pendência <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva minuciosamente a divergência ou desvio identificado no fechamento..."
                className="text-xs bg-white leading-relaxed"
              />
            </div>

            {/* Textarea: Ação Necessária (Obrigatória) */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-800">
                Ação Necessária <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={2}
                value={acaoNecessaria}
                onChange={(e) => setAcaoNecessaria(e.target.value)}
                placeholder="Ação corretiva requerida pelo gestor/operador no SAP ou no posto de trabalho..."
                className="text-xs bg-white leading-relaxed"
              />
            </div>

            {/* Observação Adicional */}
            <div className="space-y-1">
              <label className="font-medium text-slate-700">
                Observação Adicional (texto livre)
              </label>
              <Input
                type="text"
                placeholder="Instruções de retorno, notas adicionais ou contexto de turno..."
                value={observacaoAdicional}
                onChange={(e) => setObservacaoAdicional(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>

            {/* Seção Evidências (Upload Múltiplo) */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  Evidências (anexo múltiplo de documentos/imagens)
                </span>
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded cursor-pointer hover:bg-slate-100 font-medium text-slate-700">
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  Anexar Arquivos
                  <input type="file" multiple onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {evidencias.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  Nenhum arquivo anexado até o momento. É possível anexar relatórios, prints SAP ou
                  fotos.
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {evidencias.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded text-[11px]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#004C97] shrink-0" />
                        <span className="font-medium text-slate-800 truncate">
                          {ev.nome_arquivo}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          ({Math.round(ev.tamanho_bytes / 1024)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoverEvidencia(ev.id)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Garantias do Fluxo */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1 text-slate-700 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-[#004C97]">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" />
              Garantias e Integrações da Etapa 2:
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
              <li>
                Número sequencial atômico gerado no padrão{' '}
                <strong>{proximoNumero || 'AOP-XXXXXX/AAAA'}</strong>.
              </li>
              <li>
                Criação automática de pendência no <strong>Meu Dia</strong> do Gestor com link
                direto de retorno.
              </li>
              <li>Disparo de e-mail ao Gestor da Linha + cópias oficiais configuradas no HUB.</li>
              <li>
                A conclusão no Meu Dia <strong>NÃO</strong> altera automaticamente o Check-list para
                OK (aguarda validação humana do PCP).
              </li>
            </ul>
          </div>
        </form>

        {/* Rodapé com prevenção de duplo clique e estado de carregamento */}
        <DialogFooter className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={salvando}
            className="h-8 text-xs text-slate-600 hover:bg-slate-200"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={
              salvando ||
              semGestorConfigurado ||
              (duplicidadeAviso?.temAjusteAberto && !forcarDuplicada)
            }
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-semibold shadow-2xs transition-all disabled:opacity-50"
          >
            {salvando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Gravando Ajuste...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Criar Ajuste Operacional
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AjusteOperacionalModal
