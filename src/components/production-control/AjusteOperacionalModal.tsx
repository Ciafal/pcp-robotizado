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
} from '@/types/ajuste-operacional'
import { ChecklistFechamentoItem } from '@/types/checklist-fechamento'
import {
  ajusteOperacionalService,
  AntiDuplicidadeCheckResult,
} from '@/services/ajuste-operacional-service'
import { gestorLinhaService } from '@/services/gestor-linha-service'

interface Props {
  open: boolean
  onClose: () => void
  item: ChecklistFechamentoItem | null
  competencia: string
  onAjusteCriado?: (ajuste: AjusteOperacional) => void
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

export const AjusteOperacionalModal: React.FC<Props> = ({
  open,
  onClose,
  item,
  competencia,
  onAjusteCriado,
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

  // Gestor da linha e solicitante
  const [gestorNome, setGestorNome] = useState<string>('')
  const [gestorEmail, setGestorEmail] = useState<string>('')
  const [gestorId, setGestorId] = useState<string>('')
  const [carregandoGestor, setCarregandoGestor] = useState<boolean>(false)

  // Duplicidade
  const [verificandoDuplicidade, setVerificandoDuplicidade] = useState<boolean>(false)
  const [duplicidadeAviso, setDuplicidadeAviso] = useState<AntiDuplicidadeCheckResult | null>(null)
  const [forcarDuplicada, setForcarDuplicada] = useState<boolean>(false)
  const [justificativaDuplicidade, setJustificativaDuplicidade] = useState<string>('')

  // Submissão
  const [salvando, setSalvando] = useState<boolean>(false)
  const [proximoNumero, setProximoNumero] = useState<string>('')

  // Preencher formulário ao abrir
  useEffect(() => {
    if (open && item) {
      // Definir prazo padrão: 2 dias úteis à frente
      const dataHoje = new Date()
      dataHoje.setDate(dataHoje.getDate() + 2)
      const dataPrazoIso = dataHoje.toISOString().split('T')[0]

      setTipo(derivarTipoInicial(item))
      setPrioridade(item.obrigatoria ? 'Alta' : 'Média')
      setPrazo(dataPrazoIso)
      setDescricao(
        `Divergência identificada no fechamento da competência ${competencia} na atividade [${item.codigo}] ${item.titulo}.\n${item.observacao ? `Observação registrada: ${item.observacao}\n` : ''}${item.quantidade_divergencias ? `Quantidade de divergências: ${item.quantidade_divergencias}` : ''}`.trim(),
      )
      setAcaoNecessaria(
        item.acao_corretiva ||
          `Verificar e regularizar pendência referente à atividade [${item.codigo}] ${item.titulo} no SAP (${item.transacao_sap || 'geral'}) antes do encerramento oficial.`,
      )
      setOrdemSap(item.ordem_material_lote || '')
      setMaterial('')
      setLote('')
      setQuantidade(item.quantidade_divergencias || 0)
      setTransacaoSap(item.transacao_sap && item.transacao_sap !== 'N/A' ? item.transacao_sap : '')
      setObservacaoAdicional('')
      setForcarDuplicada(false)
      setJustificativaDuplicidade('')

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
    if (t.includes('divergência') || it.quantidade_divergencias! > 0)
      return 'Divergência de quantidade'
    if (t.includes('movimento') || t.includes('mb51') || t.includes('migo')) return 'Movimento SAP'
    return 'Fechamento'
  }

  const carregarNumeroPrevisto = async () => {
    try {
      const res = await ajusteOperacionalService.gerarProximoNumero()
      setProximoNumero(res.numero)
    } catch {
      setProximoNumero('AOP-NOVO/' + new Date().getFullYear())
    }
  }

  const carregarGestorELocalizacao = async (it: ChecklistFechamentoItem) => {
    setCarregandoGestor(true)
    try {
      const gestor = await gestorLinhaService.localizarGestor({
        linha_id: it.line_id,
        linha_code: it.line_code || it.linha_centro_relacionado,
        centro_id: it.center_id,
        centro_code: it.center_code,
        werks: it.werks,
      })

      if (gestor) {
        setGestorNome(gestor.usuario_nome)
        setGestorEmail(gestor.usuario_email)
        setGestorId(gestor.usuario_id)
      } else {
        // Fallback para o usuário logado ou supervisor padrão
        const user = pb.authStore.record
        setGestorNome(user?.name || user?.username || 'Gestor da Linha')
        setGestorEmail(user?.email || 'gestor.pcp@ciafal.com.br')
        setGestorId(user?.id || '')
      }
    } catch {
      const user = pb.authStore.record
      setGestorNome(user?.name || user?.username || 'Gestor da Linha')
      setGestorEmail(user?.email || 'gestor.pcp@ciafal.com.br')
      setGestorId(user?.id || '')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return

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
        description: 'Informe o prazo para resolução do ajuste operacional.',
        variant: 'destructive',
      })
      return
    }

    if (duplicidadeAviso?.temAjusteAberto && !forcarDuplicada) {
      toast({
        title: 'Ajuste em Aberto Existente',
        description:
          'Já existe um ajuste em andamento para esta atividade. Confirme a criação de duplicidade se necessário.',
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
      const solicitanteNome = user?.name || user?.username || 'PCP Analista'
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
        responsavel_nome: gestorNome,
        responsavel_email: gestorEmail,

        forcar_criacao_duplicada: forcarDuplicada,
        justificativa_duplicidade: justificativaDuplicidade.trim(),
      }

      const res = await ajusteOperacionalService.criarAjuste(input)

      toast({
        title: `Ajuste Criado: ${res.ajuste.numero}`,
        description: `Pendência sincronizada no Meu Dia do gestor ${gestorNome} e formulário estruturado registrado.`,
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
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho do Formulário Oficial */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-linear-to-r from-blue-900 via-[#004C97] to-blue-800 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs bg-white text-[#004C97] px-2 py-0.5 rounded shadow-2xs">
                  {proximoNumero || 'AOP-NOVO'}
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold text-white tracking-tight">
                  AJUSTE OPERACIONAL — PCP ROBOTIZADO
                </DialogTitle>
                <Badge className="bg-amber-400 text-amber-950 font-semibold text-[10px]">
                  Competência {competencia}
                </Badge>
              </div>
              <p className="text-xs text-blue-100/90 leading-snug">
                Atividade de Origem:{' '}
                <strong>
                  [{item.codigo}] {item.titulo}
                </strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com Scroll */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs"
        >
          {/* Banner de Duplicidade (se houver ajuste em aberto) */}
          {duplicidadeAviso?.temAjusteAberto && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-amber-950">
                    Ajuste já existente em andamento: {duplicidadeAviso.ajusteAberto?.numero}
                  </span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Esta atividade já possui o ajuste{' '}
                    <strong>{duplicidadeAviso.ajusteAberto?.numero}</strong> (Status:{' '}
                    <strong>{duplicidadeAviso.ajusteAberto?.status}</strong>) atribuído a{' '}
                    <strong>{duplicidadeAviso.ajusteAberto?.responsavel_nome}</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 flex flex-col gap-2">
                <label className="flex items-center gap-2 font-semibold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forcarDuplicada}
                    onChange={(e) => setForcarDuplicada(e.target.checked)}
                    className="rounded border-amber-400 text-[#004C97] focus:ring-[#004C97]"
                  />
                  <span>Desejo abrir um NOVO ajuste adicional em paralelo para esta atividade</span>
                </label>

                {forcarDuplicada && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-semibold text-amber-950">
                      Justificativa para abertura duplicada <span className="text-rose-500">*</span>
                      :
                    </label>
                    <Input
                      type="text"
                      placeholder="Ex: Novo lote divergente surgido após primeira análise..."
                      value={justificativaDuplicidade}
                      onChange={(e) => setJustificativaDuplicidade(e.target.value)}
                      className="h-7 text-xs bg-white border-amber-300"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bloco 1: Metadados da Linha e Gestor Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Empresa / Centro</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {item.empresa || 'CIAFAL'} {item.center_code ? `(${item.center_code})` : ''}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block text-[11px]">
                Linha de Produção
              </span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                <Boxes className="w-3.5 h-3.5 text-slate-400" />
                {item.line_name || item.line_code || item.linha_centro_relacionado || 'Geral'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 font-medium block text-[11px]">
                Gestor Responsável (HUB)
              </span>
              <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5 truncate">
                <User className="w-3.5 h-3.5 text-blue-600" />
                {carregandoGestor ? 'Identificando...' : gestorNome || 'Não localizado'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">{gestorEmail}</span>
            </div>
          </div>

          {/* Bloco 2: Tipo, Prioridade e Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-800">
                Tipo do Ajuste <span className="text-rose-500">*</span>
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
                Prazo de Regularização <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className="h-8 text-xs bg-white"
              />
            </div>
          </div>

          {/* Bloco 3: Campos SAP e Detalhes Operacionais */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50/60 border border-slate-200 rounded-lg">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">
                Ordem de Produção (SAP)
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
              <label className="text-[11px] font-semibold text-slate-700">Material / Código</label>
              <Input
                type="text"
                placeholder="Ex: ST930001"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Lote</label>
              <Input
                type="text"
                placeholder="Ex: 2026A"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                className="h-7 text-xs bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-700">Quantidade</label>
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

          {/* Bloco 4: Descrição e Ação Necessária */}
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800">
              Descrição Detalhada da Ocorrência <span className="text-rose-500">*</span>
            </label>
            <Textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva minuciosamente o desvio ou divergência encontrada..."
              className="text-xs bg-white leading-relaxed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800">
              Ação Necessária para Regularização <span className="text-rose-500">*</span>
            </label>
            <Textarea
              rows={2}
              value={acaoNecessaria}
              onChange={(e) => setAcaoNecessaria(e.target.value)}
              placeholder="O que o gestor ou operador da linha deve realizar no SAP ou fisicamente..."
              className="text-xs bg-white leading-relaxed"
            />
          </div>

          {/* Bloco 5: Observações adicionais */}
          <div className="space-y-1">
            <label className="font-medium text-slate-700">Observações Complementares</label>
            <Input
              type="text"
              placeholder="Notas adicionais, instruções de retorno ou histórico relevante..."
              value={observacaoAdicional}
              onChange={(e) => setObservacaoAdicional(e.target.value)}
              className="h-8 text-xs bg-white"
            />
          </div>

          {/* Aviso de Regras e Integração Automática */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-1 text-slate-700 text-[11px]">
            <div className="flex items-center gap-1.5 font-semibold text-[#004C97]">
              <ShieldCheck className="w-4 h-4 text-[#004C97]" />
              Garantias e Integrações Automáticas da Etapa:
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
              <li>
                Criação de pendência vinculada no <strong>Meu Dia</strong> do gestor com link de
                retorno direto para esta atividade.
              </li>
              <li>
                Envio de e-mail corporativo estruturado registrado em{' '}
                <code>fechamento_comunicacoes</code>.
              </li>
              <li>
                Trilha imutável em <code>pcp_audit_logs</code> e histórico append-only.
              </li>
              <li>
                A conclusão pelo Meu Dia <strong>NÃO</strong> altera automaticamente a atividade
                para OK; exige validação humana no Check-list.
              </li>
            </ul>
          </div>
        </form>

        {/* Rodapé */}
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
            disabled={salvando || (duplicidadeAviso?.temAjusteAberto && !forcarDuplicada)}
            className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 font-semibold shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
            {salvando ? 'Criando Ajuste...' : 'Criar Ajuste Operacional'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AjusteOperacionalModal
