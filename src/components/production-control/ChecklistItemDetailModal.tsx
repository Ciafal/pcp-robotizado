import React, { useState, useEffect } from 'react'
import {
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  History,
  FileText,
  Boxes,
  Plus,
  Paperclip,
  Calendar,
  Sparkles,
  ShieldAlert,
  Wrench,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ChecklistEvidencia,
  ChecklistFechamentoItem,
  ChecklistItemStatus,
  ChecklistOcorrencia,
} from '@/types/checklist-fechamento'
import { checklistFechamentoService } from '@/services/checklist-fechamento-service'
import { useToast } from '@/hooks/use-toast'
import { AjusteOperacional, AjusteOperacionalHistorico } from '@/types/ajuste-operacional'
import { ajusteOperacionalService } from '@/services/ajuste-operacional-service'

interface Props {
  open: boolean
  onClose: () => void
  item: ChecklistFechamentoItem | null
  onSave: (
    item: ChecklistFechamentoItem,
    status: ChecklistItemStatus,
    dados: {
      observacao?: string
      quantidade_divergencias?: number
      ordem_material_lote?: string
      acao_corretiva?: string
      necessita_inventario?: boolean
    },
  ) => Promise<void>
  onSolicitarInventario: (item: ChecklistFechamentoItem) => void
  onRastrearDivergencia: (item: ChecklistFechamentoItem) => void
  canEdit: boolean

  // Ajustes Operacionais vinculados (Etapa 2)
  onAbrirAjusteOperacional?: (item: ChecklistFechamentoItem) => void
  onValidarPcp?: (ajusteId: string, mudarAtividadeParaOk: boolean) => Promise<void>
}

export const ChecklistItemDetailModal: React.FC<Props> = ({
  open,
  onClose,
  item,
  onSave,
  onSolicitarInventario,
  onRastrearDivergencia,
  canEdit,
  onAbrirAjusteOperacional,
  onValidarPcp,
}) => {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<
    'execucao' | 'ajustes' | 'ocorrencias' | 'evidencias' | 'historico'
  >('execucao')
  const [status, setStatus] = useState<ChecklistItemStatus>('PENDENTE')
  const [observacao, setObservacao] = useState('')
  const [qtdDivergencias, setQtdDivergencias] = useState<number>(0)
  const [ordemMaterialLote, setOrdemMaterialLote] = useState('')
  const [acaoCorretiva, setAcaoCorretiva] = useState('')
  const [necessitaInventario, setNecessitaInventario] = useState(false)
  const [saving, setSaving] = useState(false)

  // Ocorrências e Evidências
  const [ocorrencias, setOcorrencias] = useState<ChecklistOcorrencia[]>([])
  const [evidencias, setEvidencias] = useState<ChecklistEvidencia[]>([])
  const [novaEvidenciaTitulo, setNovaEvidenciaTitulo] = useState('')
  const [novaEvidenciaDesc, setNovaEvidenciaDesc] = useState('')
  const [adicionandoEvidencia, setAdicionandoEvidencia] = useState(false)

  // Ajustes Operacionais Vinculados
  const [ajustesVinculados, setAjustesVinculados] = useState<AjusteOperacional[]>([])
  const [carregandoAjustes, setCarregandoAjustes] = useState(false)
  const [validandoAjusteId, setValidandoAjusteId] = useState<string | null>(null)
  const [ajusteExpandidoId, setAjusteExpandidoId] = useState<string | null>(null)
  const [historicoPorAjusteMap, setHistoricoPorAjusteMap] = useState<
    Record<string, AjusteOperacionalHistorico[]>
  >({})
  const [carregandoHistoricoId, setCarregandoHistoricoId] = useState<string | null>(null)

  const handleToggleHistoricoAjuste = async (ajusteId: string) => {
    if (ajusteExpandidoId === ajusteId) {
      setAjusteExpandidoId(null)
      return
    }

    setAjusteExpandidoId(ajusteId)
    if (!historicoPorAjusteMap[ajusteId]) {
      setCarregandoHistoricoId(ajusteId)
      try {
        const hist = await ajusteOperacionalService.listarHistorico(ajusteId)
        setHistoricoPorAjusteMap((prev) => ({ ...prev, [ajusteId]: hist }))
      } catch {
        setHistoricoPorAjusteMap((prev) => ({ ...prev, [ajusteId]: [] }))
      } finally {
        setCarregandoHistoricoId(null)
      }
    }
  }

  useEffect(() => {
    if (item && open) {
      setStatus(item.status)
      setObservacao(item.observacao || '')
      setQtdDivergencias(item.quantidade_divergencias || 0)
      setOrdemMaterialLote(item.ordem_material_lote || '')
      setAcaoCorretiva(item.acao_corretiva || '')
      setNecessitaInventario(Boolean(item.necessita_inventario))
      setActiveTab('execucao')

      carregarOcorrenciasEEvidencias(item)
      carregarAjustesVinculados(item.id)
    }
  }, [item, open])

  const carregarOcorrenciasEEvidencias = async (i: ChecklistFechamentoItem) => {
    const ocs = await checklistFechamentoService.listarOcorrencias(i.execucao_id, i.id)
    setOcorrencias(ocs)
    const evs = await checklistFechamentoService.listarEvidencias(i.id)
    setEvidencias(evs)
  }

  const carregarAjustesVinculados = async (itemId: string) => {
    setCarregandoAjustes(true)
    try {
      const lista = await ajusteOperacionalService.listarPorItem(itemId)
      setAjustesVinculados(lista)
    } catch {
      setAjustesVinculados([])
    } finally {
      setCarregandoAjustes(false)
    }
  }

  const handleValidarAjuste = async (ajuste: AjusteOperacional, mudarParaOk: boolean) => {
    setValidandoAjusteId(ajuste.id)
    try {
      if (onValidarPcp) {
        await onValidarPcp(ajuste.id, mudarParaOk)
      } else {
        const user = checklistFechamentoService
        await ajusteOperacionalService.validarPeloPcp({
          ajusteId: ajuste.id,
          usuarioNome: 'PCP Analista',
          mudarAtividadeParaOk: mudarParaOk,
        })
      }
      if (item) {
        await carregarAjustesVinculados(item.id)
      }
      if (mudarParaOk) {
        setStatus('OK')
      }
      toast({
        title: 'Validação PCP Concluída',
        description: `Ajuste ${ajuste.numero} validado. ${mudarParaOk ? 'Atividade marcada como OK.' : ''}`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro na validação',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setValidandoAjusteId(null)
    }
  }

  const handleSalvar = async () => {
    if (!item) return
    setSaving(true)
    try {
      await onSave(item, status, {
        observacao,
        quantidade_divergencias: qtdDivergencias,
        ordem_material_lote: ordemMaterialLote,
        acao_corretiva: acaoCorretiva,
        necessita_inventario: necessitaInventario,
      })
      toast({
        title: 'Atividade atualizada',
        description: `Status da atividade ${item.codigo} registrado com sucesso.`,
      })
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Falha ao persistir atividade.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAdicionarEvidencia = async () => {
    if (!item || !novaEvidenciaTitulo.trim()) return
    setAdicionandoEvidencia(true)
    try {
      await checklistFechamentoService.adicionarEvidencia({
        execucao_id: item.execucao_id,
        item_id: item.id,
        codigo_atividade: item.codigo,
        titulo: novaEvidenciaTitulo.trim(),
        descricao: novaEvidenciaDesc.trim(),
      })
      setNovaEvidenciaTitulo('')
      setNovaEvidenciaDesc('')
      await carregarOcorrenciasEEvidencias(item)
      toast({
        title: 'Evidência anexada',
        description: 'Registro de evidência cadastrado com sucesso.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao anexar',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setAdicionandoEvidencia(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header do Modal */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-[#004C97] text-white px-2 py-0.5 rounded">
                  {item.codigo}
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">
                  {item.titulo}
                </DialogTitle>
                {item.obrigatoria ? (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                    Obrigatória
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-slate-500">
                    Informativa
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">{item.descricao_detalhada}</p>
            </div>
          </div>

          {/* Abas internas */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-200/80 mt-3">
            <button
              type="button"
              onClick={() => setActiveTab('execucao')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'execucao'
                  ? 'bg-white text-[#004C97] shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Execução & Status
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ajustes')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'ajustes'
                  ? 'bg-white text-[#004C97] shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Ajustes Operacionais ({ajustesVinculados.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocorrencias')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'ocorrencias'
                  ? 'bg-white text-[#004C97] shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ocorrências ({ocorrencias.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('evidencias')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'evidencias'
                  ? 'bg-white text-[#004C97] shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Evidências ({evidencias.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historico')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'historico'
                  ? 'bg-white text-[#004C97] shadow-2xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Histórico ({item.historico_alteracoes?.length || 0})
            </button>
          </div>
        </DialogHeader>

        {/* Corpo do Modal com Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'execucao' && (
            <div className="space-y-4 text-xs">
              {/* Card de Regra e Orientações Oficiais */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1.5">
                <span className="font-semibold text-[#004C97] flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  Regra de Validação & Procedimento Oficial:
                </span>
                <p className="text-slate-700 leading-relaxed font-medium">{item.regra_validacao}</p>
                {item.status_regra && item.status_regra !== 'Oficial' && (
                  <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Aviso: {item.status_regra} — Exige conferência humana criteriosa.</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-500">
                  <span>
                    SAP: <strong>{item.transacao_sap}</strong>
                  </span>
                  <span>
                    Depósito: <strong>{item.deposito_sap}</strong>
                  </span>
                  <span>
                    Área: <strong>{item.area_responsavel}</strong>
                  </span>
                  <span>
                    Fonte: <strong>{item.fonte_dados}</strong>
                  </span>
                </div>
              </div>

              {/* Seletor de Status (OK / ERRO / PENDENTE) */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-800 block">
                  Status da Atividade <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setStatus('OK')}
                    className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all ${
                      status === 'OK'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    OK
                  </button>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setStatus('ERRO')}
                    className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all ${
                      status === 'ERRO'
                        ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    ERRO
                  </button>

                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setStatus('PENDENTE')}
                    className={`p-2.5 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all ${
                      status === 'PENDENTE'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    PENDENTE
                  </button>
                </div>
              </div>

              {/* Divergências e Identificação de Ordem/Material/Lote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Qtd de Divergências Encontradas
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={qtdDivergencias}
                    disabled={!canEdit}
                    onChange={(e) => setQtdDivergencias(parseInt(e.target.value, 10) || 0)}
                    className="h-8 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Identificação Ordem / Material / Lote
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: OP 4500012345 / ST930001 / LOTE 2026A"
                    value={ordemMaterialLote}
                    disabled={!canEdit}
                    onChange={(e) => setOrdemMaterialLote(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Ação Corretiva Adotada */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Ação Corretiva Adotada / Tratamento
                </label>
                <Textarea
                  rows={2}
                  placeholder="Descreva a ação adotada para regularizar a ocorrência ou pendência..."
                  value={acaoCorretiva}
                  disabled={!canEdit}
                  onChange={(e) => setAcaoCorretiva(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>

              {/* Observações Gerais */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Observações Operacionais</label>
                <Textarea
                  rows={2}
                  placeholder="Anotações internas do Controle de Produção..."
                  value={observacao}
                  disabled={!canEdit}
                  onChange={(e) => setObservacao(e.target.value)}
                  className="text-xs bg-white"
                />
              </div>

              {/* Solicitar Inventário Checkbox / Botão */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    Necessidade de Inventário Físico
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Caso haja saldo divergente em DP06, DP11, DP09 ou DP04 sem justificativa
                    imediata.
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSolicitarInventario(item)}
                  className="h-7 text-xs border-blue-200 text-[#004C97] hover:bg-blue-50 font-medium gap-1"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Solicitar Inventário
                </Button>
              </div>
            </div>
          )}

          {/* Aba de Ajustes Operacionais Vinculados (Etapa 2) */}
          {activeTab === 'ajustes' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 text-sm">
                    Ajustes Operacionais Vinculados
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Histórico completo e tabela estruturada: Ajuste | Data | Status origem |
                    Pendência | Responsável | Prioridade | Prazo | Status ajuste.
                  </p>
                </div>

                {onAbrirAjusteOperacional && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={status === 'OK' || !canEdit}
                    onClick={() => onAbrirAjusteOperacional(item)}
                    className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    Novo Ajuste
                  </Button>
                )}
              </div>

              {carregandoAjustes ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  Carregando ajustes vinculados...
                </div>
              ) : ajustesVinculados.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg space-y-2">
                  <p className="font-medium text-slate-700">
                    Nenhum ajuste operacional vinculado a esta atividade.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Quando a atividade estiver com erro ou pendência, utilize o botão "Ajuste
                    Operacional" para acionar o gestor da linha.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tabela Estruturada de Ajustes (Desktop / Tablet) */}
                  <div className="border border-slate-200 rounded-lg overflow-x-auto shadow-2xs bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Ajuste</th>
                          <th className="p-2.5">Data</th>
                          <th className="p-2.5">Status origem</th>
                          <th className="p-2.5">Pendência</th>
                          <th className="p-2.5">Responsável</th>
                          <th className="p-2.5">Prioridade</th>
                          <th className="p-2.5">Prazo</th>
                          <th className="p-2.5">Status ajuste</th>
                          <th className="p-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ajustesVinculados.map((ajuste) => {
                          const statusColor =
                            ajuste.status === 'Concluída'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : ajuste.status === 'Cancelada'
                                ? 'bg-slate-100 text-slate-600 border-slate-300'
                                : 'bg-blue-100 text-[#004C97] border-blue-300'

                          const prioridadeColor =
                            ajuste.prioridade === 'Crítica' || ajuste.prioridade === 'Alta'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'

                          const statusOrigemColor =
                            ajuste.status_origem === 'ERRO'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'

                          const dataCriacaoFormatada = ajuste.created
                            ? new Date(ajuste.created).toLocaleDateString('pt-BR')
                            : '-'

                          const prazoFormatado = ajuste.prazo
                            ? new Date(ajuste.prazo).toLocaleDateString('pt-BR')
                            : '-'

                          const isExpanded = ajusteExpandidoId === ajuste.id

                          return (
                            <React.Fragment key={ajuste.id}>
                              <tr
                                onClick={() => handleToggleHistoricoAjuste(ajuste.id)}
                                className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                                  isExpanded ? 'bg-blue-50/30' : ''
                                }`}
                              >
                                <td className="p-2.5 font-mono font-bold text-[#004C97] whitespace-nowrap">
                                  {ajuste.numero}
                                </td>
                                <td className="p-2.5 text-slate-600 whitespace-nowrap">
                                  {dataCriacaoFormatada}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <Badge
                                    className={`text-[10px] font-semibold ${statusOrigemColor}`}
                                  >
                                    {ajuste.status_origem}
                                  </Badge>
                                </td>
                                <td
                                  className="p-2.5 text-slate-800 max-w-[200px] truncate"
                                  title={ajuste.descricao}
                                >
                                  <span className="font-semibold block text-[11px] text-slate-700">
                                    {ajuste.tipo}
                                  </span>
                                  <span className="text-slate-500 text-[10px] truncate block">
                                    {ajuste.descricao}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-700 whitespace-nowrap font-medium">
                                  {ajuste.responsavel_nome}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <Badge className={`text-[10px] font-semibold ${prioridadeColor}`}>
                                    {ajuste.prioridade}
                                  </Badge>
                                </td>
                                <td className="p-2.5 text-slate-600 whitespace-nowrap">
                                  {prazoFormatado}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  <Badge className={`text-[10px] font-semibold ${statusColor}`}>
                                    {ajuste.status}
                                  </Badge>
                                  {ajuste.validada_pcp && (
                                    <span className="block text-[9px] text-emerald-700 font-semibold mt-0.5">
                                      ✓ Validado PCP
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right whitespace-nowrap">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleHistoricoAjuste(ajuste.id)
                                    }}
                                    className="h-6 px-2 text-[11px] text-[#004C97] hover:bg-blue-100/60"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                    {isExpanded ? 'Ocultar' : 'Histórico'}
                                  </Button>
                                </td>
                              </tr>

                              {/* Linha de Detalhe e Histórico Expandido */}
                              {isExpanded && (
                                <tr>
                                  <td
                                    colSpan={9}
                                    className="p-4 bg-slate-50/80 border-t border-b border-slate-200"
                                  >
                                    <div className="space-y-3">
                                      {/* Card de Detalhes da Ocorrência */}
                                      <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] border-b border-slate-100 pb-2">
                                          <div>
                                            <span className="text-slate-400 block text-[10px]">
                                              Ordem / Material / Lote
                                            </span>
                                            <span className="font-semibold text-slate-800">
                                              {ajuste.ordem_sap ||
                                                ajuste.material ||
                                                ajuste.lote ||
                                                'N/A'}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 block text-[10px]">
                                              Transação SAP
                                            </span>
                                            <span className="font-semibold text-slate-800">
                                              {ajuste.transacao_sap || 'N/A'}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-slate-400 block text-[10px]">
                                              Validação Humana PCP
                                            </span>
                                            <span
                                              className={`font-semibold ${ajuste.validada_pcp ? 'text-emerald-700' : 'text-amber-700'}`}
                                            >
                                              {ajuste.validada_pcp
                                                ? `Validado por ${ajuste.validada_por_nome || 'PCP'}`
                                                : 'Aguardando validação do PCP'}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <span className="font-semibold text-slate-700 text-[11px]">
                                            Descrição Completa da Pendência:
                                          </span>
                                          <p className="text-slate-700 text-xs whitespace-pre-line leading-relaxed bg-slate-50/60 p-2 rounded border border-slate-100">
                                            {ajuste.descricao}
                                          </p>
                                        </div>

                                        <div className="space-y-1">
                                          <span className="font-semibold text-slate-700 text-[11px]">
                                            Ação Necessária para Regularização:
                                          </span>
                                          <p className="text-slate-700 text-xs whitespace-pre-line leading-relaxed bg-slate-50/60 p-2 rounded border border-slate-100">
                                            {ajuste.acao_necessaria}
                                          </p>
                                        </div>

                                        {ajuste.observacao_adicional && (
                                          <div className="space-y-0.5">
                                            <span className="font-semibold text-slate-600 text-[10px]">
                                              Observação Adicional:
                                            </span>
                                            <p className="text-slate-500 text-[11px] italic">
                                              {ajuste.observacao_adicional}
                                            </p>
                                          </div>
                                        )}

                                        {/* Ações de validação humana pelo PCP */}
                                        {canEdit &&
                                          !ajuste.validada_pcp &&
                                          ajuste.status === 'Concluída' && (
                                            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-emerald-50/80 p-2.5 rounded-md mt-2">
                                              <span className="text-[11px] text-emerald-950 font-medium">
                                                Gestor concluiu no Meu Dia:{' '}
                                                <em>
                                                  "Ajuste operacional concluído — aguardando
                                                  validação do PCP."
                                                </em>
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  disabled={validandoAjusteId === ajuste.id}
                                                  onClick={() => handleValidarAjuste(ajuste, false)}
                                                  className="h-7 text-xs bg-slate-200 text-slate-800 hover:bg-slate-300"
                                                >
                                                  Validar (Manter status da atividade)
                                                </Button>
                                                <Button
                                                  type="button"
                                                  size="sm"
                                                  disabled={validandoAjusteId === ajuste.id}
                                                  onClick={() => handleValidarAjuste(ajuste, true)}
                                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                                                >
                                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                  Validar e Mudar Atividade para OK
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                      </div>

                                      {/* Trilha de Histórico Completo do Ajuste */}
                                      <div className="space-y-1.5">
                                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5 text-[#004C97]">
                                          <History className="w-3.5 h-3.5" />
                                          Histórico Completo do Ajuste {ajuste.numero}
                                        </span>

                                        {carregandoHistoricoId === ajuste.id ? (
                                          <p className="text-slate-400 text-xs italic">
                                            Carregando trilha histórica...
                                          </p>
                                        ) : !historicoPorAjusteMap[ajuste.id] ||
                                          historicoPorAjusteMap[ajuste.id].length === 0 ? (
                                          <p className="text-slate-400 text-xs italic">
                                            Nenhum evento histórico adicional registrado para este
                                            ajuste.
                                          </p>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {historicoPorAjusteMap[ajuste.id].map((h, hIdx) => (
                                              <div
                                                key={h.id || hIdx}
                                                className="p-2 bg-white border border-slate-200 rounded text-[11px] space-y-0.5"
                                              >
                                                <div className="flex items-center justify-between text-slate-500">
                                                  <span className="font-semibold text-slate-700">
                                                    {h.acao}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400">
                                                    {h.data_hora}
                                                  </span>
                                                </div>
                                                <p className="text-slate-800 leading-snug">
                                                  {h.valor_novo}
                                                </p>
                                                <span className="text-[10px] text-slate-400 block">
                                                  Registrado por: <strong>{h.usuario}</strong>
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ocorrencias' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Ocorrências Registradas ({ocorrencias.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRastrearDivergencia(item)}
                  className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                  <History className="w-3.5 h-3.5 mr-1" />
                  Rastrear Linha do Tempo
                </Button>
              </div>

              {ocorrencias.length === 0 ? (
                <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  Nenhuma ocorrência registrada para este item.
                </div>
              ) : (
                <div className="space-y-2">
                  {ocorrencias.map((oc) => (
                    <div
                      key={oc.id}
                      className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px]">
                          {oc.tipo}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {oc.created ? new Date(oc.created).toLocaleString('pt-BR') : '-'}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">{oc.descricao}</p>
                      {oc.ordem && (
                        <p className="text-slate-500 text-[11px]">
                          Ordem/Material: <strong>{oc.ordem}</strong>
                        </p>
                      )}
                      {oc.responsavel && (
                        <p className="text-slate-400 text-[10px]">
                          Registrado por: {oc.responsavel}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'evidencias' && (
            <div className="space-y-4 text-xs">
              {/* Formulário para adicionar nova evidência */}
              {canEdit && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <span className="font-semibold text-slate-800 block">Adicionar Evidência</span>
                  <div className="space-y-1.5">
                    <Input
                      type="text"
                      placeholder="Título da evidência (ex: Print ZPP_04 tela 1, Foto lote ST930)"
                      value={novaEvidenciaTitulo}
                      onChange={(e) => setNovaEvidenciaTitulo(e.target.value)}
                      className="h-8 text-xs bg-white"
                    />
                    <Textarea
                      rows={2}
                      placeholder="Descrição detalhada ou justificativa..."
                      value={novaEvidenciaDesc}
                      onChange={(e) => setNovaEvidenciaDesc(e.target.value)}
                      className="text-xs bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdicionarEvidencia}
                      disabled={adicionandoEvidencia || !novaEvidenciaTitulo.trim()}
                      className="h-7 text-xs bg-[#004C97] hover:bg-[#003870] text-white"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Anexar Evidência
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de Evidências */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-800 block">
                  Evidências Vinculadas ({evidencias.length})
                </span>
                {evidencias.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                    Nenhuma evidência anexada a este item.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evidencias.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                            {ev.titulo}
                          </span>
                          {ev.descricao && (
                            <p className="text-slate-500 text-[11px]">{ev.descricao}</p>
                          )}
                          <span className="text-[10px] text-slate-400 block">
                            Enviado por: {ev.usuario_nome || 'Controle de Produção'} em{' '}
                            {ev.created ? new Date(ev.created).toLocaleString('pt-BR') : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-800 block">
                Trilha de Auditoria do Item (Imutável)
              </span>
              {!item.historico_alteracoes || item.historico_alteracoes.length === 0 ? (
                <div className="p-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  Nenhum registro histórico anterior.
                </div>
              ) : (
                <div className="space-y-2">
                  {item.historico_alteracoes.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-0.5 font-mono"
                    >
                      <div className="flex justify-between text-slate-400">
                        <span>{new Date(h.timestamp).toLocaleString('pt-BR')}</span>
                        <span className="font-bold text-slate-600">{h.usuario}</span>
                      </div>
                      <p className="text-slate-800">
                        Alteração em <strong>{h.campo}</strong>: {String(h.de)} →{' '}
                        <strong>{String(h.para)}</strong>
                      </p>
                      {h.motivo && <p className="text-slate-500 italic">Motivo: {h.motivo}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs text-slate-600 hover:bg-slate-200"
          >
            Cancelar
          </Button>

          {canEdit && (
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={handleSalvar}
              className="h-8 text-xs bg-[#004C97] hover:bg-[#003870] text-white gap-1.5 shadow-2xs font-medium"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Alterações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
